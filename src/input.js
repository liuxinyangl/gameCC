// =============================================================
//  input.js — 键鼠 / 指针锁定 / 锁定切换 / 首次交互启动音频
// =============================================================
import { state, look, setShakeScale, getShakeScale } from './state.js';
import { clamp } from './util.js';
import { player, tryLightAttack, tryHeavyAttack, tryDodge, tryHeal, tryParry, tryUltimate } from './player.js';
import { enemies } from './enemies.js';
import { M_DETECT } from './config.js';
import { initAudio, toggleMute } from './audio.js';
import { toast, showPause, hidePause, showEnd } from './hud.js';
import { pickUpgrade, enterAbyss, tryReroll } from './waves.js';

export const keys = {};
export let locked = false;

const canvas = document.getElementById('game');
const overlay = document.getElementById('center');

// 鼠标视角灵敏度（持久化，[ / ] 调）
let sens = 1;
try { sens = Math.min(2.5, Math.max(0.3, +localStorage.getItem('shadowtrial.sens') || 1)); } catch {}
function adjustSens(d) {
  sens = Math.min(2.5, Math.max(0.3, +(sens + d).toFixed(2)));
  try { localStorage.setItem('shadowtrial.sens', sens); } catch {}
  toast(`鼠标灵敏度 ${sens.toFixed(2)}×`, 1.0);
}

// 难度（开始界面 1/2/3 选，记忆上次）
function setDifficulty(i) {
  state.difficulty = i;
  try { localStorage.setItem('shadowtrial.diff', i); } catch {}
  document.querySelectorAll('#diffSel .dopt').forEach((el, k) => el.classList.toggle('active', k === i));
}
try { const d = +localStorage.getItem('shadowtrial.diff'); if (d >= 1 && d <= 2) setDifficulty(d); } catch {}   // 默认 0(试炼)，仅在存过更高难度时还原

// 屏震强度（V 循环：强/弱/关，照顾晕动症）
const SHAKE_STEPS = [1, 0.4, 0], SHAKE_NAMES = ['强', '弱', '关'];
function cycleShake() {
  const i = (SHAKE_STEPS.indexOf(getShakeScale()) + 1 + SHAKE_STEPS.length) % SHAKE_STEPS.length;
  setShakeScale(SHAKE_STEPS[i]);
  try { localStorage.setItem('shadowtrial.shake', SHAKE_STEPS[i]); } catch {}
  toast(`屏震 ${SHAKE_NAMES[i]}`, 1.0);
}
try { const s = localStorage.getItem('shadowtrial.shake'); if (s !== null) setShakeScale(+s); } catch {}

addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyM') { toast(toggleMute() ? '🔇 已静音' : '🔊 音效开', 1.0); return; }   // 静音随时可切
  if (e.code === 'BracketLeft')  { adjustSens(-0.1); return; }   // [ 降低灵敏度
  if (e.code === 'BracketRight') { adjustSens(0.1); return; }    // ] 提高灵敏度
  if (e.code === 'KeyV') { cycleShake(); return; }               // V 屏震强度
  if (!state.started) {                          // 开始界面：1/2/3 选难度，其余吞掉
    if (e.code === 'Digit1') setDifficulty(0);
    else if (e.code === 'Digit2') setDifficulty(1);
    else if (e.code === 'Digit3') setDifficulty(2);
    return;
  }
  if (state.phase === 'upgrade') {            // 波间强化：1/2/3 选择，空格重随，其余吞掉
    if (e.code === 'Digit1') pickUpgrade(0);
    else if (e.code === 'Digit2') pickUpgrade(1);
    else if (e.code === 'Digit3') pickUpgrade(2);
    else if (e.code === 'Space') { tryReroll(); e.preventDefault(); }
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
  look.yaw -= e.movementX * 0.0025 * sens;
  look.pitch = clamp(look.pitch - e.movementY * 0.0025 * sens, 0.08, 1.2);
});

// 已锁定时：滚轮在存活敌人间按距离循环切换锁定目标
addEventListener('wheel', e => {
  if (!locked || !state.lockTarget || state.phase === 'upgrade' || state.phase === 'cleared') return;
  const cand = enemies.filter(x => x.state !== 'dead' && x.state !== 'gone' && x.state !== 'intro');
  if (cand.length < 2) return;
  cand.sort((a, b) => a.mesh.position.distanceToSquared(player.mesh.position) - b.mesh.position.distanceToSquared(player.mesh.position));
  let i = cand.indexOf(state.lockTarget); if (i < 0) i = 0;
  state.lockTarget = cand[(i + (e.deltaY > 0 ? 1 : -1) + cand.length) % cand.length];
  e.preventDefault();
}, { passive: false });

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
