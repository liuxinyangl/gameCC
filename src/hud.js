// =============================================================
//  hud.js — DNF 风 HUD：头像/描金条/技能栏、任务、Boss 条、横幅、屏闪
// =============================================================
import { state } from './state.js';
import { player } from './player.js';
import { countAliveMinions } from './enemies.js';
import { ENERGY_MAX, ULT, HEAVY, DODGE_COST, PARRY, WAVES } from './config.js';
import { styleRank, styleProgress, stylePoints, bestRank, bestStyleLevel } from './style.js';
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
const comboEl = $('combo'), comboNumEl = $('comboNum');

// 历史最高分（跨会话持久化；localStorage 在隐私模式/file:// 下可能抛异常，故包一层）
const BEST_KEY = 'shadowtrial.best';
const getBest = () => { try { return +localStorage.getItem(BEST_KEY) || 0; } catch { return 0; } };
const setBest = v => { try { localStorage.setItem(BEST_KEY, v); } catch {} };

// 开始界面展示历史最高（载入即填）
{
  const best = getBest(), bestLine = $('bestLine');
  if (best > 0 && bestLine) { bestLine.textContent = `历史最高 ${best.toLocaleString()}`; bestLine.style.display = 'block'; }
}

let questSig = '';
let lastCombo = 0;
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

  if (state.combo >= 2) {                        // 连杀计数显示（≥2 才出）
    comboEl.classList.add('on');
    comboNumEl.textContent = state.combo;
    comboNumEl.style.color = state.combo >= 15 ? '#ff6bd0' : state.combo >= 8 ? '#ffd24a' : '#fff';
    if (state.combo !== lastCombo) { comboEl.classList.remove('pop'); void comboEl.offsetWidth; comboEl.classList.add('pop'); }   // 每次跳数触发缩放
  } else comboEl.classList.remove('on');
  lastCombo = state.combo;

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

  const br = bestRank();
  const t = state.runTime, mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  const timeStr = `${mm}:${String(ss).padStart(2, '0')}`;
  // 总分：基础击杀 + 精英 + 弹反 + 评级 + 通关奖励
  const score = state.kills * 100 + state.elites * 300 + state.parries * 60 + state.maxCombo * 50 + bestStyleLevel() * 400 + (win ? 2000 : 0);
  const prevBest = getBest();
  const isRecord = score > prevBest;
  if (isRecord) setBest(score);
  const recordLine = isRecord
    ? `<div style="font-size:18px;font-weight:800;color:#ff6bd0;letter-spacing:3px;margin-top:10px">★ 新 纪 录 ！</div>`
    : `<div style="font-size:13px;color:#8fa0b8;letter-spacing:2px;margin-top:10px">历史最高 ${prevBest.toLocaleString()}</div>`;
  const stat = (label, val, color = '#fff') =>
    `<div style="display:flex;flex-direction:column;gap:5px;min-width:64px">
       <span style="font-size:12px;color:#8fa0b8;letter-spacing:2px">${label}</span>
       <span style="font-size:27px;font-weight:800;color:${color}">${val}</span></div>`;

  overlay.innerHTML = `
    <div class="big ${win ? 'win' : 'lose'}">${win ? '试 炼 通 过' : '你 倒 下 了'}</div>
    <p>${win ? '暗影督军已被击溃，试炼达成。' : '影中的强敌将你击溃。'}</p>
    <div style="display:flex;gap:30px;margin:26px 0 10px;flex-wrap:wrap;justify-content:center">
      ${stat('击杀', state.kills)}
      ${stat('精英', state.elites, '#ffd24a')}
      ${stat('最高连杀', state.maxCombo, '#ff8f5a')}
      ${stat('弹反', state.parries, '#7be8ff')}
      ${stat('最高评级', br.letter, br.color)}
      ${stat('用时', timeStr)}
    </div>
    <div style="font-size:14px;color:#8fa0b8;letter-spacing:4px;margin-top:8px">总 分</div>
    <div style="font-size:48px;font-weight:900;font-style:italic;color:#ffd43b;text-shadow:0 2px 16px rgba(0,0,0,.7)">${score.toLocaleString()}</div>
    ${recordLine}
    <p style="margin-top:22px;font-size:18px;color:#ffd43b;">按 <b style="color:#ffd43b">R</b> 重新开始</p>`;
}
