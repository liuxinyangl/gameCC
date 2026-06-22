// =============================================================
//  entities.js — 建筑/单位的创建与空间查询、电力结算
// =============================================================
import { TILE, BUILDINGS, UNITS } from './config.js';
import { dist } from './util.js';
import { buildings, units, game } from './state.js';

// 建筑中心 / 半径
export function bcx(b){ return (b.tx + b.w / 2) * TILE; }
export function bcy(b){ return (b.ty + b.h / 2) * TILE; }
export function brad(b){ return Math.max(b.w, b.h) * TILE * 0.5; }

export function addBuilding(type, owner, tx, ty, instant){
  const def = BUILDINGS[type];
  const b = {
    id: game.nextId++, type, owner, def, tx, ty, w: def.w, h: def.h,
    hp: def.hp, maxHp: def.hp, power: def.power,
    build: instant ? 0 : def.build, buildLeft: instant ? 0 : def.build,
    cooldown: 0, rally: null, queue: [], qLeft: 0,
  };
  buildings.push(b);
  return b;
}
export function spawnUnit(type, owner, x, y){
  const def = UNITS[type];
  const u = {
    id: game.nextId++, type, owner, def, x, y,
    hp: def.hp, maxHp: def.hp, speed: def.speed, r: def.r,
    target: null, move: null, cooldown: 0,
    carry: 0, harvestTile: null, homeRef: null, hstate: 'idle',   // 矿车专用
  };
  units.push(u);
  return u;
}

export function power(owner){
  let p = 0;
  for (const b of buildings) if (b.owner === owner && b.buildLeft <= 0) p += b.power;
  return p;
}
export function lowPower(owner){ return power(owner) < 0; }

export function findRefinery(owner, x, y){
  let best = null, bd = 1e9;
  for (const b of buildings) if (b.owner === owner && b.type === 'refinery' && b.buildLeft <= 0) {
    const d = dist(x, y, bcx(b), bcy(b));
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}
export function buildingAt(wx, wy, owner){
  for (const b of buildings) {
    if (owner && b.owner !== owner) continue;
    if (wx >= b.tx * TILE && wx < (b.tx + b.w) * TILE && wy >= b.ty * TILE && wy < (b.ty + b.h) * TILE) return b;
  }
  return null;
}
export function unitAt(wx, wy, owner){
  for (let i = units.length - 1; i >= 0; i--) {
    const u = units[i];
    if (owner && u.owner !== owner) continue;
    if (dist(wx, wy, u.x, u.y) <= u.r + 4) return u;
  }
  return null;
}
export function conyardOf(owner){ return buildings.find(b => b.owner === owner && b.type === 'conyard'); }
export function enemyOf(owner){ return owner === 'player' ? 'enemy' : 'player'; }
export function targetPos(t){ return t.type && t.def && t.w ? { x: bcx(t), y: bcy(t), r: brad(t) } : { x: t.x, y: t.y, r: t.r }; }
export function isDead(t){ return t.hp <= 0 || t._removed; }
