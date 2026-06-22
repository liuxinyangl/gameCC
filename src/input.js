// =============================================================
//  input.js — 键鼠 / 指针锁定 / 锁定切换 / 首次交互启动音频
// =============================================================
import { state, look } from './state.js';
import { clamp } from './util.js';
import { player, tryLightAttack, tryHeavyAttack, tryDodge, tryHeal, tryParry, tryUltimate } from './player.js';
import { enemies } from './enemies.js';
import { M_DETECT } from './config.js';
import { initAudio } from './audio.js';

export const keys = {};
export let locked = false;

const canvas = document.getElementById('game');
const overlay = document.getElementById('center');

addEventListener('keydown', e => {
  keys[e.code] = true;
  if (!state.started) return;
  if (e.code === 'KeyJ') tryLightAttack();
  if (e.code === 'KeyK') tryHeavyAttack();
  if (e.code === 'KeyE') tryUltimate();
  if (e.code === 'Space') { tryDodge(); e.preventDefault(); }
  if (e.code === 'KeyF') tryHeal();
  if (e.code === 'KeyQ') tryParry();
  if (e.code === 'Tab') { toggleLock(); e.preventDefault(); }
  if (e.code === 'KeyR') location.reload();
});
addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('mousedown', e => {
  if (!locked) { canvas.requestPointerLock(); return; }
  if (e.button === 0) tryLightAttack();
  if (e.button === 2) tryParry();        // 右键弹反
});
addEventListener('contextmenu', e => e.preventDefault());
overlay.addEventListener('mousedown', () => { if (!state.ended) canvas.requestPointerLock(); });

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (locked) { state.started = true; initAudio(); overlay.classList.add('hidden'); }
  else if (!state.ended) overlay.classList.remove('hidden');
});
document.addEventListener('mousemove', e => {
  if (!locked || state.lockTarget) return;          // 锁定时镜头由系统接管
  look.yaw -= e.movementX * 0.0025;
  look.pitch = clamp(look.pitch - e.movementY * 0.0025, 0.08, 1.2);
});

export function toggleLock() {
  if (state.lockTarget) { state.lockTarget = null; return; }
  let best = null, bestD = Infinity;
  for (const e of enemies) {
    if (e.state === 'dead' || e.state === 'gone' || e.state === 'intro') continue;
    const d = e.mesh.position.distanceTo(player.mesh.position);
    if (e.isBoss && d < M_DETECT + 12) { best = e; break; }
    if (d < bestD && d < M_DETECT) { best = e; bestD = d; }
  }
  state.lockTarget = best;
}
