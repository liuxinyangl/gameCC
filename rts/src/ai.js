// =============================================================
//  ai.js — 敌方 AI：保矿车 → 造兵 → 集结进攻
// =============================================================
import { UNITS } from './config.js';
import { units, enemy } from './state.js';
import { conyardOf, bcx, bcy } from './entities.js';
import { queueUnit } from './production.js';

export function updateAI(dt){
  enemy.aiTimer -= dt;
  if (enemy.aiTimer > 0) return;
  enemy.aiTimer = 3.5;
  // 保证有矿车
  const harvesters = units.filter(u => u.owner === 'enemy' && u.type === 'harvester').length;
  if (harvesters < 2 && enemy.credits > UNITS.harvester.cost) { queueUnit('harvester', 'enemy'); return; }
  // 造兵：交替步兵/坦克
  if (enemy.credits > 800) queueUnit('tank', 'enemy');
  else if (enemy.credits > 150) queueUnit('infantry', 'enemy');
  // 集结进攻：攒够 6 个无任务单位就压向玩家基地
  const army = units.filter(u => u.owner === 'enemy' && u.type !== 'harvester' && !u.target && !u.move);
  if (army.length >= 6) {
    const cy = conyardOf('player');
    const tx = cy ? bcx(cy) : 200, ty = cy ? bcy(cy) : 200;
    for (const u of army) u.move = { x: tx + (Math.random() * 120 - 60), y: ty + (Math.random() * 120 - 60) };
  }
}
