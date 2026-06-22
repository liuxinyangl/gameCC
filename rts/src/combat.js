// =============================================================
//  combat.js — 单位索敌/开火、移动、互推分离、击杀特效
// =============================================================
import { TILE, WORLD_W, WORLD_H } from './config.js';
import { clamp, dist } from './util.js';
import { units, buildings, effects } from './state.js';
import { bcx, bcy, brad, lowPower, targetPos, isDead } from './entities.js';

export function acquireTarget(u){           // 视野内最近敌人
  const sight = u.def.sight || 140;
  let best = null, bd = sight;
  for (const e of units) { if (e.owner === u.owner || e.hp <= 0) continue; const d = dist(u.x, u.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
  for (const b of buildings) { if (b.owner === u.owner || b.hp <= 0) continue; const d = dist(u.x, u.y, bcx(b), bcy(b)) - brad(b); if (d < bd) { bd = d; best = b; } }
  return best;
}
export function updateUnitCombat(u, dt){
  if (u.type === 'harvester') return;
  u.cooldown -= dt;
  if (u.target && isDead(u.target)) u.target = null;
  // 空闲自动索敌（移动指令优先，但移动时也会顺路索敌）
  if (!u.target) { const t = acquireTarget(u); if (t) u.target = t; }
  if (u.target) {
    const tp = targetPos(u.target);
    const d = dist(u.x, u.y, tp.x, tp.y) - (tp.r || 0);
    if (d <= u.def.range) {
      u.move = null;                        // 进入射程，停下开火
      if (u.cooldown <= 0) {
        u.cooldown = u.def.rate;
        u.target.hp -= u.def.dmg;
        effects.push({ kind: 'tracer', x1: u.x, y1: u.y, x2: tp.x, y2: tp.y, t: 0.08, col: u.owner === 'player' ? '#bfe' : '#fcb' });
        if (u.target.hp <= 0) onKill(u.target);
      }
    } else if (!u._forcedMove) {            // 不在射程则追击（玩家强制移动除外）
      u.move = { x: tp.x, y: tp.y };
    }
  }
}
export function onKill(t){
  if (t.w) effects.push({ kind: 'boom', x: bcx(t), y: bcy(t), t: 0.6, r: brad(t) });   // 建筑
  else effects.push({ kind: 'boom', x: t.x, y: t.y, t: 0.4, r: 18 });
}
export function updateMovement(u, dt){
  if (!u.move) return;
  const dx = u.move.x - u.x, dy = u.move.y - u.y;
  const d = Math.hypot(dx, dy);
  const stop = u.type === 'harvester' ? 6 : 8;
  if (d < stop) { u.move = null; u._forcedMove = false; return; }
  const sp = u.speed * (lowPower(u.owner) ? 0.85 : 1);
  let nx = u.x + dx / d * sp * dt;
  let ny = u.y + dy / d * sp * dt;
  // 与建筑碰撞：推出最近的边
  for (const b of buildings) {
    const minx = b.tx * TILE - u.r, maxx = (b.tx + b.w) * TILE + u.r;
    const miny = b.ty * TILE - u.r, maxy = (b.ty + b.h) * TILE + u.r;
    if (nx > minx && nx < maxx && ny > miny && ny < maxy) {
      const left = nx - minx, right = maxx - nx, top = ny - miny, bot = maxy - ny;
      const m = Math.min(left, right, top, bot);
      if (m === left) nx = minx; else if (m === right) nx = maxx; else if (m === top) ny = miny; else ny = maxy;
    }
  }
  u.x = clamp(nx, u.r, WORLD_W - u.r);
  u.y = clamp(ny, u.r, WORLD_H - u.r);
}
export function separation(){               // 单位互相推开，避免堆叠
  for (let i = 0; i < units.length; i++) {
    const a = units[i]; if (a.hp <= 0) continue;
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j]; if (b.hp <= 0) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy), min = a.r + b.r;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        const ux = dx / d, uy = dy / d;
        a.x -= ux * push; a.y -= uy * push;
        b.x += ux * push; b.y += uy * push;
      }
    }
  }
}
