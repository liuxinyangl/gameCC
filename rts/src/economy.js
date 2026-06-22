// =============================================================
//  economy.js — 矿车采矿状态机：找矿 → 采集 → 回矿场卸货
// =============================================================
import { TILE } from './config.js';
import { dist } from './util.js';
import { player, enemy } from './state.js';
import { ore, findNearestOre } from './world.js';
import { bcx, bcy, brad, findRefinery } from './entities.js';

export function updateHarvester(u, dt){
  const adj = u.r + TILE * 0.7;
  if ((u.hstate === 'idle' && !u.move) || (u.hstate === 'toOre' && !u.harvestTile)) {
    const o = u.harvestTile || findNearestOre(u.x, u.y);
    if (!o) { u.hstate = 'idle'; u.move = null; return; }
    u.harvestTile = o; u.hstate = 'toOre';
  }
  if (u.hstate === 'toOre') {
    const t = u.harvestTile;
    if (!t || ore[t.ty][t.tx] <= 0) { u.harvestTile = findNearestOre(u.x, u.y); if (!u.harvestTile){ u.hstate = 'idle'; u.move = null; } return; }
    const tx = (t.tx + 0.5) * TILE, ty = (t.ty + 0.5) * TILE;
    u.move = { x: tx, y: ty };
    if (dist(u.x, u.y, tx, ty) < adj) { u.move = null; u.hstate = 'harvest'; }
  } else if (u.hstate === 'harvest') {
    const t = u.harvestTile;
    if (!t || ore[t.ty][t.tx] <= 0 || u.carry >= u.def.cap) { u.hstate = 'toRef'; u.homeRef = findRefinery(u.owner, u.x, u.y); return; }
    const amt = Math.min(u.def.harvestRate * dt, ore[t.ty][t.tx], u.def.cap - u.carry);
    ore[t.ty][t.tx] -= amt; u.carry += amt;
    if (u.carry >= u.def.cap) u.hstate = 'toRef';
  } else if (u.hstate === 'toRef') {
    if (!u.homeRef || u.homeRef.hp <= 0) u.homeRef = findRefinery(u.owner, u.x, u.y);
    if (!u.homeRef) { u.hstate = 'idle'; return; }
    const rx = bcx(u.homeRef), ry = bcy(u.homeRef);
    u.move = { x: rx, y: ry };
    if (dist(u.x, u.y, rx, ry) < brad(u.homeRef) + u.r) {
      (u.owner === 'player' ? player : enemy).credits += Math.floor(u.carry);
      u.carry = 0; u.move = null; u.hstate = 'toOre'; u.harvestTile = findNearestOre(u.x, u.y);
    }
  }
}
