// =============================================================
//  input.js — 键鼠 / 指针锁定 / 锁定切换 / 首次交互启动音频
// =============================================================
import { state, look } from './state.js';
import { clamp } from './util.js';
import { player, tryLightAttack, tryHeavyAttack, tryDodge, tryHeal, tryParry, tryUltimate } from './player.js';
import { enemies } from './enemies.js';
import { M_DETECT } from './config.js';
import { initAudio } from './audio.js';
import { pickUpgrade } from './waves.js';

export const keys = {};
export let locked = false;

const canvas = document.getElementById('game');
const overlay = document.getElementById('center');

addEventListener('keydown', e => {
  keys[e.code] = true;
  if (!state.started) return;
  if (state.phase === 'upgrade') {            // 波间强化：仅 1/2/3 生效，其余吞掉
    if (e.code === 'Digit1') pickUpgrade(0);
    else if (e.code === 'Digit2') pickUpgrade(1);
    else if (e.code === 'Digit3') pickUpgrade(2);
    return;
  }
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
  if (state.phase === 'upgrade') return;  // 强化选择中：吞掉攻击/弹反点击（与 keydown 守卫一致）
  if (e.button === 0) tryLightAttack();
  if (e.button === 2) tryParry();        // 右键弹反
});
addEventListener('contextmenu', e => e.preventDefault());
overlay.addEventListener('mousedown', () => { if (!state.ended) canvas.requestPointerLock(); });

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (locked) { state.started = true; initAudio(); overlay.classList.add('hidden'); }
  else if (!state.ended && state.phase !== 'upgrade') overlay.classList.remove('hidden');  // 强化中按 ESC：保留强化面板，不叠开始界面
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
