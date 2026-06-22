// =============================================================
//  main.js — 装配：起始布局 + 主循环（update 编排各系统 + draw）
//  模块图：config/util → state → canvas/world → entities
//          → economy/combat/production/ai/command/camera/input → render → main
// =============================================================
import { TILE, ROWS, COLS, WORLD_W, WORLD_H } from './config.js';
import { clamp } from './util.js';
import { cam, view, VIEW_W, buildings, units, effects, game } from './state.js';
import './canvas.js';                        // 建画布 + 绑定 resize（副作用导入）
import './input.js';                         // 绑定键鼠监听（副作用导入）
import { addBuilding, spawnUnit, bcx, bcy, conyardOf, lowPower } from './entities.js';
import { updateHarvester } from './economy.js';
import { updateUnitCombat, updateMovement, separation, onKill } from './combat.js';
import { updateProduction, updateTurret } from './production.js';
import { updateAI } from './ai.js';
import { updateCamera } from './camera.js';
import { draw } from './render.js';

// ---- 起始布局 ----
function setupBase(owner, baseTx, baseTy, full){
  addBuilding('conyard', owner, baseTx, baseTy, true);
  addBuilding('power', owner, baseTx + 4, baseTy, true);
  const ref = addBuilding('refinery', owner, baseTx, baseTy + 4, true);
  const h = spawnUnit('harvester', owner, bcx(ref), bcy(ref) + TILE * 2);
  h.homeRef = ref;
  if (full) {                                // 敌方多给生产建筑，AI 能直接造兵
    addBuilding('barracks', owner, baseTx + 4, baseTy + 3, true);
    addBuilding('warfactory', owner, baseTx + 4, baseTy + 5, true);
    addBuilding('power', owner, baseTx, baseTy + 7, true);
  }
}
// 注意：owner 用字符串 'player'/'enemy'，与全局其余地方一致
// （原单文件这里误传了 player/enemy 对象，导致 owner 比较永不相等：
//  开局即判胜、选不中初始矿车、矿车把钱算给敌方——此处统一为字符串修正）
setupBase('player', 3, ROWS - 11, false);
setupBase('enemy', COLS - 9, 3, true);
// 镜头初始对准我方基地
cam.x = clamp(3 * TILE - VIEW_W() / 2 + 100, 0, WORLD_W - VIEW_W());
cam.y = clamp((ROWS - 11) * TILE - view.H / 2 + 100, 0, WORLD_H - view.H);

// ---- 每帧更新（编排各子系统）----
function update(dt){
  updateCamera(dt);
  if (game.gameOver) return;
  for (const b of buildings) {
    updateProduction(b, dt);
    if (b.type === 'turret' && b.buildLeft <= 0 && !lowPower(b.owner)) updateTurret(b, dt);
  }
  for (const u of units) {
    if (u.hp <= 0) continue;
    if (u.type === 'harvester') updateHarvester(u, dt);
    updateUnitCombat(u, dt);
    updateMovement(u, dt);
  }
  separation();
  updateAI(dt);
  // 清理死亡
  for (let i = units.length - 1; i >= 0; i--) if (units[i].hp <= 0) { onKill(units[i]); units.splice(i, 1); }
  for (let i = buildings.length - 1; i >= 0; i--) if (buildings[i].hp <= 0) { onKill(buildings[i]); buildings.splice(i, 1); }
  game.selected = game.selected.filter(u => u.hp > 0);
  // 特效计时
  for (let i = effects.length - 1; i >= 0; i--) { effects[i].t -= dt; if (effects[i].t <= 0) effects.splice(i, 1); }
  if (game.msgT > 0) game.msgT -= dt;
  // 胜负
  if (!conyardOf('enemy')) game.gameOver = 'win';
  else if (!conyardOf('player')) game.gameOver = 'lose';
}

// ---- 主循环 ----
let last = performance.now();
function loop(now){
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  if (game.started) update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
