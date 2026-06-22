// =============================================================
//  world.js — 矿区：矿量网格、矿区生成、最近矿查找
// =============================================================
import { COLS, ROWS, TILE } from './config.js';
import { dist } from './util.js';

export const ore = [];                      // ore[ty][tx] = 矿量
for (let y = 0; y < ROWS; y++) ore.push(new Array(COLS).fill(0));

function seedOre(cx, cy, radius, amount){
  for (let y = cy - radius; y <= cy + radius; y++)
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
      if (Math.hypot(x - cx, y - cy) <= radius) ore[y][x] = amount;
    }
}
seedOre(14, ROWS - 9, 3, 900);
seedOre(10, ROWS - 14, 2, 900);
seedOre(COLS - 14, 8, 3, 900);
seedOre(COLS - 10, 13, 2, 900);
seedOre(Math.floor(COLS / 2), Math.floor(ROWS / 2), 3, 900);

export function findNearestOre(x, y){
  let best = null, bd = 1e9;
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    if (ore[ty][tx] <= 0) continue;
    const d = dist(x, y, (tx + 0.5) * TILE, (ty + 0.5) * TILE);
    if (d < bd) { bd = d; best = { tx, ty }; }
  }
  return best;
}
