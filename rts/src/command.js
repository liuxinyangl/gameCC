// =============================================================
//  command.js — 右键指令：采矿 / 移动 / 攻击（含编队散开）
// =============================================================
import { TILE, COLS, ROWS } from './config.js';
import { game } from './state.js';
import { ore } from './world.js';
import { unitAt, buildingAt } from './entities.js';

export function commandTo(wx, wy){
  if (!game.selected.length) return;
  const enemyUnit = unitAt(wx, wy, 'enemy');
  const enemyB = buildingAt(wx, wy, 'enemy');
  const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
  const onOre = tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS && ore[ty][tx] > 0;
  const tgt = enemyUnit || enemyB;
  // 编队偏移：第 0 个落点在原位，其余沿环散开
  game.selected.forEach((u, i) => {
    if (u.type === 'harvester') {
      if (onOre) { u.harvestTile = { tx, ty }; u.hstate = 'toOre'; u.target = null; }
      else { u.move = { x: wx, y: wy }; u.target = null; u.hstate = 'idle'; u.harvestTile = null; }
      return;
    }
    if (tgt) { u.target = tgt; u.move = null; u._forcedMove = false; }
    else {
      const a = i * 0.7, ring = 12 + Math.floor(i / 8) * 18;
      u.move = { x: wx + Math.cos(a) * ring * (i ? 1 : 0), y: wy + Math.sin(a) * ring * (i ? 1 : 0) };
      u.target = null; u._forcedMove = true;
    }
  });
}
