// =============================================================
//  input.js — 键鼠 / 指针锁定 / 锁定切换 / 首次交互启动音频
// =============================================================
import { state, look } from './state.js';
import { clamp } from './util.js';
import { player, tryLightAttack, tryHeavyAttack, tryDodge, tryHeal, tryParry, tryUltimate } from './player.js';
import { enemies } from './enemies.js';
import { M_DETECT } from './config.js';
import { initAudio, toggleMute } from './audio.js';
import { toast, showPause, hidePause, showEnd } from './hud.js';
import { pickUpgrade, enterAbyss } from './waves.js';

export const keys = {};
export let locked = false;

const canvas = document.getElementById('game');
const overlay = document.getElementById('center');

addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyM') { toast(toggleMute() ? '🔇 已静音' : '🔊 音效开', 1.0); return; }   // 静音随时可切
  if (!state.started) return;
  if (state.phase === 'upgrade') {            // 波间强化：仅 1/2/3 生效，其余吞掉
    if (e.code === 'Digit1') pickUpgrade(0);
    else if (e.code === 'Digit2') pickUpgrade(1);
    else if (e.code === 'Digit3') pickUpgrade(2);
    return;
  }
  if (state.phase === 'cleared') {            // 通关去/留：1 踏入深渊 · 2 收下胜利结算（R 重开仍可用）
    if (e.code === 'Digit1') enterAbyss();
    else if (e.code === 'Digit2') showEnd(true);
    else if (e.code === 'KeyR') location.reload();
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
  if (e.code === 'KeyP') { if (locked) document.exitPointerLock(); else canvas.requestPointerLock(); }   // P 暂停/继续
});
addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('mousedown', e => {
  if (!locked) { canvas.requestPointerLock(); return; }
  if (state.phase === 'upgrade' || state.phase === 'cleared') return;  // 选择面板中：吞掉攻击/弹反点击
  if (e.button === 0) tryLightAttack();
  if (e.button === 2) tryParry();        // 右键弹反
});
addEventListener('contextmenu', e => e.preventDefault());
overlay.addEventListener('mousedown', () => { if (!state.ended) canvas.requestPointerLock(); });
document.getElementById('pause').addEventListener('mousedown', () => { if (!state.ended) canvas.requestPointerLock(); });  // 点暂停层 → 继续

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (locked) { state.started = true; initAudio(); overlay.classList.add('hidden'); hidePause(); }
  else if (!state.ended && state.phase !== 'upgrade') {
    if (state.started) showPause();                  // 已开局 → 暂停菜单
    else overlay.classList.remove('hidden');          // 还没开局 → 初始“点击开始”界面
  }
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
