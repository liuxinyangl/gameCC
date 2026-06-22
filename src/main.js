// =============================================================
//  main.js — 装配 + 关卡流程 + 主循环（顿帧/子弹时间缩放）
//  模块图：config/util/state/audio → scene → world/models/effects
//          → camera/hud/input → player/enemies → main
// =============================================================
import * as THREE from 'three';
import { render, decayBloom } from './scene.js';
import { updateWorld } from './world.js';
import { updateEffects } from './effects.js';
import { state, timeScale, tickTimers } from './state.js';
import { locked } from './input.js';
import { player, updatePlayer } from './player.js';
import { enemies, spawnMinion, spawnBoss, updateMinion, updateBoss, countAliveMinions } from './enemies.js';
import { updateCamera, updateLockMark } from './camera.js';
import { updateHUD, updateToast, updateBanner, toast } from './hud.js';

// ---- 初始波次：3 杂兵 ----
for (const [x, z] of [[-6, -8], [7, -6], [0, -12]]) spawnMinion(x, z);

// ---- 关卡流程：清杂兵 → Boss ----
let bossPendingTimer = 0;
function updateFlow(dt) {
  if (state.phase === 'minions' && countAliveMinions() === 0) {
    state.phase = 'bossPending'; bossPendingTimer = 2.0;
    toast('强 敌 降 临…', 2.0); state.lockTarget = null;
  } else if (state.phase === 'bossPending') {
    bossPendingTimer -= dt;
    if (bossPendingTimer <= 0) { spawnBoss(); state.phase = 'boss'; }
  }
}

// ---- 主循环 ----
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const realDt = Math.min(clock.getDelta(), 0.05);
  tickTimers(realDt);                 // 顿帧/子弹时间计时器走真实时间
  const dt = realDt * timeScale();    // 战斗逻辑用缩放时间

  if (state.started && locked && !state.ended) {
    updateFlow(realDt);
    updatePlayer(dt, clock.elapsedTime);
    for (const e of enemies) {
      if (e.isBoss) updateBoss(e, dt);
      else updateMinion(e, dt);
    }
  }

  // 表现层用真实时间，保证特效/镜头流畅
  updateWorld(realDt);
  updateEffects(realDt);
  updateCamera(realDt);
  updateLockMark(realDt);
  updateToast(realDt);
  updateBanner(realDt);
  updateHUD();
  decayBloom(realDt);
  render();
}
tick();
