// =============================================================
//  production.js — 建造放置、单位排产、建筑生产与防御塔开火
// =============================================================
import { TILE, COLS, ROWS, BUILDINGS, UNITS } from './config.js';
import { dist } from './util.js';
import { buildings, units, effects, player, enemy, game, flashMsg } from './state.js';
import { addBuilding, spawnUnit, bcx, bcy, lowPower, findRefinery } from './entities.js';
import { onKill } from './combat.js';

export function tryBuildStructure(type){     // 进入放置模式
  const def = BUILDINGS[type];
  if (player.credits < def.cost) { flashMsg('资金不足'); return; }
  game.placing = type;
}
export function canPlace(type, tx, ty){
  const def = BUILDINGS[type];
  if (tx < 0 || ty < 0 || tx + def.w > COLS || ty + def.h > ROWS) return false;
  // 不与其它建筑重叠
  for (const b of buildings)
    if (tx < b.tx + b.w && tx + def.w > b.tx && ty < b.ty + b.h && ty + def.h > b.ty) return false;
  // 必须靠近己方已有建筑（6 格内）
  let near = false;
  for (const b of buildings) if (b.owner === 'player') {
    if (tx < b.tx + b.w + 6 && tx + def.w + 6 > b.tx && ty < b.ty + b.h + 6 && ty + def.h + 6 > b.ty) { near = true; break; }
  }
  return near;
}
export function placeStructure(type, tx, ty){
  const def = BUILDINGS[type];
  if (player.credits < def.cost || !canPlace(type, tx, ty)) { flashMsg('无法在此建造'); return; }
  player.credits -= def.cost;
  addBuilding(type, 'player', tx, ty, false);
  game.placing = null;
}
export function queueUnit(type, owner){
  const def = UNITS[type];
  const o = owner === 'player' ? player : enemy;
  // 找对应生产建筑
  let prod;
  if (type === 'harvester') prod = buildings.find(b => b.owner === owner && b.type === 'refinery' && b.buildLeft <= 0);
  else { const need = type === 'infantry' ? 'barracks' : 'warfactory'; prod = buildings.find(b => b.owner === owner && b.type === need && b.buildLeft <= 0); }
  if (!prod) { if (owner === 'player') flashMsg('缺少对应生产建筑'); return false; }
  if (o.credits < def.cost) { if (owner === 'player') flashMsg('资金不足'); return false; }
  o.credits -= def.cost;
  prod.queue.push(type);
  return true;
}
export function updateProduction(b, dt){
  if (b.buildLeft > 0) { b.buildLeft -= dt * (lowPower(b.owner) ? 0.5 : 1); return; }
  if (!b.queue.length) return;
  if (b.qLeft <= 0) b.qLeft = UNITS[b.queue[0]].build;
  b.qLeft -= dt * (lowPower(b.owner) ? 0.5 : 1);
  if (b.qLeft <= 0) {
    const type = b.queue.shift();
    const sx = bcx(b), sy = (b.ty + b.h) * TILE + TILE * 0.8;   // 建筑下方出兵
    const u = spawnUnit(type, b.owner, sx + (Math.random() * 20 - 10), sy);
    if (type === 'harvester') u.homeRef = findRefinery(b.owner, u.x, u.y);
    else if (b.rally) u.move = { x: b.rally.x, y: b.rally.y };
    b.qLeft = 0;
  }
}
export function updateTurret(b, dt){
  b.cooldown -= dt;
  let best = null, bd = b.def.range;
  for (const u of units) { if (u.owner === b.owner || u.hp <= 0) continue; const d = dist(bcx(b), bcy(b), u.x, u.y); if (d < bd) { bd = d; best = u; } }
  if (best && b.cooldown <= 0) {
    b.cooldown = b.def.rate; best.hp -= b.def.dmg;
    effects.push({ kind: 'tracer', x1: bcx(b), y1: bcy(b), x2: best.x, y2: best.y, t: 0.08, col: b.owner === 'player' ? '#bfe' : '#fcb' });
    if (best.hp <= 0) onKill(best);
  }
}
