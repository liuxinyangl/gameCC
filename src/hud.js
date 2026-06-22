// =============================================================
//  hud.js — DNF 风 HUD：头像/描金条/技能栏、任务、Boss 条、横幅、屏闪
// =============================================================
import { state } from './state.js';
import { player } from './player.js';
import { countAliveMinions } from './enemies.js';
import { ENERGY_MAX, ULT, HEAVY, DODGE_COST, PARRY, WAVES } from './config.js';
import { styleRank, styleProgress, stylePoints } from './style.js';
import { sfx } from './audio.js';

const $ = id => document.getElementById(id);
const hpFill = $('hpFill'), spFill = $('spFill'), energyFill = $('energyFill'), energyBar = $('energyBar');
const flaskNum = $('flaskNum');
const lockTipEl = $('lockTip'), questsEl = $('quests');
const bossNameEl = $('bossName'), bossBarEl = $('bossBar'), bossFill = $('bossFill');
const postureBarEl = $('postureBar'), postureFill = $('postureFill');
const toastEl = $('toast'), bannerEl = $('banner'), flashEl = $('flash');
const overlay = $('center');
const ultSlot = $('slotUlt'), healSlot = $('slotHeal'), slotHeavy = $('slotHeavy'), slotDodge = $('slotDodge'), slotParry = $('slotParry');
const upgradeEl = $('upgrade'), upCardsEl = $('upCards');
const styleEl = $('style'), styleRankEl = $('styleRank'), styleFill = $('styleFill');

let questSig = '';
export function updateHUD() {
  hpFill.style.width = (player.hp / player.maxHp * 100) + '%';
  spFill.style.width = (player.sp / player.maxSp * 100) + '%';
  energyFill.style.width = (player.energy / ENERGY_MAX * 100) + '%';
  const ready = player.energy >= ULT.cost;
  energyBar.classList.toggle('ready', ready);
  if (ultSlot) ultSlot.classList.toggle('ready', ready);
  flaskNum.textContent = player.flasks;
  if (healSlot) healSlot.classList.toggle('empty', player.flasks <= 0);
  if (slotHeavy) slotHeavy.classList.toggle('lowsp', player.sp < HEAVY.cost);
  if (slotDodge) slotDodge.classList.toggle('lowsp', player.sp < DODGE_COST);
  if (slotParry) slotParry.classList.toggle('lowsp', player.sp < PARRY.cost);
  lockTipEl.textContent = state.lockTarget ? '◎ 已锁定' : '';

  const sr = styleRank();                       // 风格评级显示
  if (stylePoints() > 1) {
    styleEl.classList.add('on');
    styleRankEl.textContent = sr.letter; styleRankEl.style.color = sr.color;
    styleFill.style.width = (styleProgress() * 100) + '%'; styleFill.style.background = sr.color;
  } else styleEl.classList.remove('on');

  const mAlive = countAliveMinions();
  const sig = state.phase + '|' + state.wave + '|' + mAlive;
  if (sig !== questSig) {
    questSig = sig;
    const inWaves = state.phase === 'wave' || state.phase === 'upgrade';
    const wavesDone = state.phase === 'bossPending' || state.phase === 'boss';
    const row = (done, active, label) =>
      `<div class="q ${done ? 'done' : ''} ${active ? 'active' : ''}"><span class="mk">${done ? '✓' : '◦'}</span>${label}</div>`;
    questsEl.innerHTML =
      `<div class="qtitle">⚔ 试炼 · 第 ${Math.min(state.wave, WAVES.length)}/${WAVES.length} 波</div>` +
      row(wavesDone, inWaves, wavesDone ? '波次已肃清' : `肃清来袭暗影（剩 ${mAlive}）`) +
      row(false, state.phase === 'boss', `击败暗影督军`);
  }
}

export function showBossUI() { bossNameEl.style.display = 'block'; bossBarEl.style.display = 'block'; postureBarEl.style.display = 'block'; }
export function hideBossUI() { bossNameEl.style.display = 'none'; bossBarEl.style.display = 'none'; postureBarEl.style.display = 'none'; }
export function updateBossBar(hpRatio, postureRatio, broken) {
  bossFill.style.width = Math.max(0, hpRatio * 100) + '%';
  postureFill.style.width = Math.max(0, postureRatio * 100) + '%';
  postureBarEl.classList.toggle('broken', broken);
}

// 屏幕闪光（DNF 式技能命中冲击）
export function flashScreen(color = '#fff', a = 0.4) {
  if (!flashEl) return;
  flashEl.style.transition = 'none'; flashEl.style.background = color; flashEl.style.opacity = a;
  requestAnimationFrame(() => { flashEl.style.transition = 'opacity .4s ease-out'; flashEl.style.opacity = 0; });
}

let toastTimer = 0;
export function toast(text, dur = 1.6) { toastEl.textContent = text; toastEl.style.opacity = 1; toastTimer = dur; }
export function updateToast(dt) { if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toastEl.style.opacity = 0; } }

let bannerTimer = 0;
export function banner(title, sub = '', dur = 2.0) {
  bannerEl.innerHTML = `<div class="bt">${title}</div>` + (sub ? `<div class="bs">${sub}</div>` : '');
  bannerEl.classList.remove('show'); void bannerEl.offsetWidth; bannerEl.classList.add('show');
  bannerTimer = dur;
}
export function updateBanner(dt) { if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) bannerEl.classList.remove('show'); } }

// 波间强化面板（按 1/2/3 选；指针锁定下不用鼠标）
export function showUpgrades(choices) {
  upCardsEl.innerHTML = choices.map((u, i) =>
    `<div class="upcard"><div class="uicon">${u.icon}</div><div class="uk">[${i + 1}]</div><div class="un">${u.name}</div><div class="ud">${u.desc}</div></div>`
  ).join('');
  upgradeEl.classList.add('show');
}
export function hideUpgrades() { upgradeEl.classList.remove('show'); }

export function showEnd(win) {
  if (state.ended) return; state.ended = true;
  document.exitPointerLock();
  (win ? sfx.win : sfx.lose)();
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="big ${win ? 'win' : 'lose'}">${win ? '试 炼 通 过' : '你 倒 下 了'}</div>
    <p>${win ? '暗影督军已被击溃，试炼达成。' : '影中的强敌将你击溃。'}</p>
    <p style="margin-top:24px;font-size:18px;color:#ffd43b;">按 <b style="color:#ffd43b">R</b> 重新开始</p>`;
}
