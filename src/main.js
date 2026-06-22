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
import { enemies, updateMinion, updateCaster, updateDasher, updateBrute, updateBoss } from './enemies.js';
import { updateCamera, updateLockMark } from './camera.js';
import { updateHUD, updateToast, updateBanner } from './hud.js';
import { updateProjectiles } from './projectiles.js';
import { startWave, updateFlow } from './waves.js';
import { updateStyle } from './style.js';
import { updatePickups } from './pickups.js';

// ---- 关卡流程在 waves.js；这里点燃第一波 ----
startWave(1);

// ---- 主循环 ----
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const realDt = Math.min(clock.getDelta(), 0.05);
  tickTimers(realDt);                 // 顿帧/子弹时间计时器走真实时间
  const dt = realDt * timeScale();    // 战斗逻辑用缩放时间

  if (state.started && locked && !state.ended && state.phase !== 'upgrade') {
    updateFlow(realDt);
    updatePlayer(dt, clock.elapsedTime);
    for (const e of enemies) {
      if (e.isBoss) updateBoss(e, dt);
      else if (e.isCaster) updateCaster(e, dt);
      else if (e.isDasher) updateDasher(e, dt);
      else if (e.isBrute) updateBrute(e, dt);
      else updateMinion(e, dt);
    }
    updateProjectiles(dt);
    updateStyle(dt);
    updatePickups(dt);
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
