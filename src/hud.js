// =============================================================
//  hud.js — DNF 风 HUD：头像/描金条/技能栏、任务、Boss 条、横幅、屏闪
// =============================================================
import { state } from './state.js';
import { player } from './player.js';
import { countAliveMinions } from './enemies.js';
import { ENERGY_MAX, HEAVY, DODGE_COST, PARRY, WAVES } from './config.js';
import { styleRank, styleProgress, stylePoints, bestRank, bestStyleLevel } from './style.js';
import { acquired } from './upgrades.js';
import { sfx, isMuted } from './audio.js';

const $ = id => document.getElementById(id);
const hpFill = $('hpFill'), spFill = $('spFill'), energyFill = $('energyFill'), energyBar = $('energyBar');
const flaskNum = $('flaskNum');
const lockTipEl = $('lockTip'), questsEl = $('quests');
const bossNameEl = $('bossName'), bossBarEl = $('bossBar'), bossFill = $('bossFill');
const postureBarEl = $('postureBar'), postureFill = $('postureFill');
const toastEl = $('toast'), bannerEl = $('banner'), flashEl = $('flash'), dangerVigEl = $('dangerVig');
const overlay = $('center');
const ultSlot = $('slotUlt'), healSlot = $('slotHeal'), slotHeavy = $('slotHeavy'), slotDodge = $('slotDodge'), slotParry = $('slotParry');
const upgradeEl = $('upgrade'), upCardsEl = $('upCards');
const styleEl = $('style'), styleRankEl = $('styleRank'), styleFill = $('styleFill');
const comboEl = $('combo'), comboNumEl = $('comboNum');
const buildEl = $('build'), buildChipsEl = $('buildChips');
const pauseEl = $('pause'), pauseAudioEl = $('pauseAudio');
const clearedEl = $('cleared');

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
let buildSig = '';
let hurtPulse = 0;
// 受击时触发红色危险暗角脉冲（player.hitPlayer 调用）
export function hurtFlash(amount = 0.72) { hurtPulse = Math.max(hurtPulse, amount); }
export function updateHUD() {
  // 构筑面板：仅在强化集合变化时重建 DOM
  const bsig = acquired.map(a => a.name + a.count).join(',');
  if (bsig !== buildSig) {
    buildSig = bsig;
    buildEl.classList.toggle('on', acquired.length > 0);
    buildChipsEl.innerHTML = acquired.map(a =>
      `<div class="chip" title="${a.name}"><span class="ci">${a.icon}</span>${a.count > 1 ? `<span class="cx">${a.count}</span>` : ''}</div>`
    ).join('');
  }

  hpFill.style.width = (player.hp / player.maxHp * 100) + '%';
  spFill.style.width = (player.sp / player.maxSp * 100) + '%';
  energyFill.style.width = (player.energy / ENERGY_MAX * 100) + '%';
  const ready = player.energy >= player.ultCost;   // 受「影能大师」影响
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
    if (state.combo !== lastCombo) {
      comboEl.classList.remove('pop'); void comboEl.offsetWidth; comboEl.classList.add('pop');   // 每次跳数触发缩放
      if (state.combo >= 10 && state.combo % 10 === 0) { flashScreen('#ffca30', 0.16); sfx.pickup(); }   // 连杀里程碑：每 10 金闪+提示音
    }
  } else comboEl.classList.remove('on');
  lastCombo = state.combo;

  // 危险暗角：受击红闪脉冲衰减 + 残血心跳常驻（取两者较强者）
  hurtPulse = Math.max(0, hurtPulse - 0.05);
  const hpFrac = player.maxHp > 0 ? player.hp / player.maxHp : 0;
  const low = hpFrac < 0.3 && player.hp > 0 ? (0.3 - hpFrac) / 0.3 : 0;
  const lowPulse = low * (0.3 + 0.22 * Math.sin(performance.now() * 0.006));
  dangerVigEl.style.opacity = Math.min(0.92, Math.max(hurtPulse, lowPulse));

  const mAlive = countAliveMinions();
  const sig = state.phase + '|' + state.wave + '|' + state.abyss + '|' + mAlive;
  if (sig !== questSig) {
    questSig = sig;
    const row = (done, active, label) =>
      `<div class="q ${done ? 'done' : ''} ${active ? 'active' : ''}"><span class="mk">${done ? '✓' : '◦'}</span>${label}</div>`;
    if (state.abyss > 0) {                             // 深渊余烬：无尽层
      questsEl.innerHTML =
        `<div class="qtitle">🔥 深渊余烬 · 第 ${state.abyss} 层</div>` +
        row(false, true, `肃清深渊来敌（剩 ${mAlive}）`) +
        row(true, false, `暗影督军已伏诛`);
    } else {
      const inWaves = state.phase === 'wave' || state.phase === 'upgrade';
      const wavesDone = state.phase === 'bossPending' || state.phase === 'boss';
      questsEl.innerHTML =
        `<div class="qtitle">⚔ 试炼 · 第 ${Math.min(state.wave, WAVES.length)}/${WAVES.length} 波</div>` +
        row(wavesDone, inWaves, wavesDone ? '波次已肃清' : `肃清来袭暗影（剩 ${mAlive}）`) +
        row(false, state.phase === 'boss', `击败暗影督军`);
    }
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

// 暂停菜单（指针锁定丢失且已开局时显示；与"点击开始"初始界面区分）
export function showPause() {
  if (pauseAudioEl) pauseAudioEl.textContent = isMuted() ? '🔇 已静音 —— 按 M 开启音效' : '🔊 音效开启 —— 按 M 静音';
  pauseEl.classList.remove('hidden');
}
export function hidePause() { pauseEl.classList.add('hidden'); }

// 通关后去/留选择（[1] 踏入深渊余烬 · [2] 收下胜利结算）
export function showCleared() { clearedEl.classList.remove('hidden'); }
export function hideCleared() { clearedEl.classList.add('hidden'); }

export function showEnd(win) {
  if (state.ended) return; state.ended = true;
  hideCleared();
  document.exitPointerLock();
  const triumph = win || state.bossDown;            // 击败过 Boss 即视作达成（哪怕死在深渊）
  (triumph ? sfx.win : sfx.lose)();
  overlay.classList.remove('hidden');

  const br = bestRank();
  const t = state.runTime, mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  const timeStr = `${mm}:${String(ss).padStart(2, '0')}`;
  // 总分：基础击杀 + 精英 + 弹反 + 连杀 + 评级 + 通关奖励 + 深渊层数
  const score = state.kills * 100 + state.elites * 300 + state.parries * 60 + state.maxCombo * 50
              + bestStyleLevel() * 400 + (state.bossDown ? 2000 : 0) + state.abyss * 500;
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

  const title = win ? '试 炼 通 过' : (state.bossDown ? '深 渊 折 戟' : '你 倒 下 了');
  const sub = win ? '暗影督军已被击溃，试炼达成。'
            : (state.bossDown ? `你已击败督军，于深渊第 ${state.abyss} 层力竭长眠。` : '影中的强敌将你击溃。');
  overlay.innerHTML = `
    <div class="big ${triumph ? 'win' : 'lose'}">${title}</div>
    <p>${sub}</p>
    <div style="display:flex;gap:30px;margin:26px 0 10px;flex-wrap:wrap;justify-content:center">
      ${stat('击杀', state.kills)}
      ${stat('精英', state.elites, '#ffd24a')}
      ${stat('最高连杀', state.maxCombo, '#ff8f5a')}
      ${stat('弹反', state.parries, '#7be8ff')}
      ${stat('最高评级', br.letter, br.color)}
      ${state.abyss > 0 ? stat('深渊层数', state.abyss, '#ff6bd0') : stat('用时', timeStr)}
    </div>
    <div style="font-size:14px;color:#8fa0b8;letter-spacing:4px;margin-top:8px">总 分</div>
    <div style="font-size:48px;font-weight:900;font-style:italic;color:#ffd43b;text-shadow:0 2px 16px rgba(0,0,0,.7)">${score.toLocaleString()}</div>
    ${recordLine}
    <p style="margin-top:22px;font-size:18px;color:#ffd43b;">按 <b style="color:#ffd43b">R</b> 重新开始</p>`;
}
