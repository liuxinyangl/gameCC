// =============================================================
//  waves.js — 关卡流程：逐波递增 → 波间肉鸽强化 → 最后一波后召 Boss
//             → 通关后可选「深渊余烬」无尽模式（逐层递增）
// =============================================================
import { state } from './state.js';
import { WAVES } from './config.js';
import { enemies, spawnMinion, spawnCaster, spawnDasher, spawnBrute, spawnBoss, countAliveMinions, countAliveAll, makeElite } from './enemies.js';
import { toast, banner, showUpgrades, hideUpgrades, hideCleared } from './hud.js';
import { rollUpgrades, applyUpgrade } from './upgrades.js';
import { clearProjectiles } from './projectiles.js';
import { randRange } from './util.js';

// 在场地边缘随机散布生成；精英概率随波次与深渊层数上升
function spawnAround(spawnFn, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, r = randRange(9, 13);
    spawnFn(Math.cos(a) * r, Math.sin(a) * r - 4);
    const eliteChance = Math.min(0.55, 0.08 * (state.wave - 2) + 0.07 * state.abyss);
    if ((state.wave >= 3 || state.abyss > 0) && Math.random() < eliteChance)
      makeElite(enemies[enemies.length - 1]);
  }
}

export function startWave(n) {
  state.wave = n;
  const spec = WAVES[n - 1];
  spawnAround(spawnMinion, spec.imp || 0);
  spawnAround(spawnCaster, spec.caster || 0);
  spawnAround(spawnDasher, spec.dasher || 0);
  spawnAround(spawnBrute, spec.brute || 0);
  toast(`第 ${n} 波 / ${WAVES.length}`, 1.8);
}

// 深渊余烬：通关后逐层递增的无尽波次（数量随层上升，血量在 enemies.js 按层 scale）
//   每 5 层是 Boss 轮——降临一只按层缩放的「深渊守望者」
function startAbyssLayer() {
  const L = state.abyss;
  if (L % 5 === 0) {
    spawnBoss(1 + 0.5 * (L / 5), '深 渊 守 望 者', `第 ${L} 层 · 强敌`);
    return;
  }
  spawnAround(spawnMinion, Math.min(9, 3 + Math.floor(L * 0.7)));
  spawnAround(spawnCaster, Math.min(4, Math.floor((L + 1) / 2)));
  spawnAround(spawnDasher, Math.min(5, Math.floor((L + 1) / 2)));
  spawnAround(spawnBrute,  Math.min(3, Math.floor(L / 2)));
  banner('深 渊 余 烬', `第 ${L} 层 · 敌愈强`, 1.8);
}

// 强化界面：每次刷新给 1 次免费重随
let rerollsLeft = 0;
function presentUpgrades() { rerollsLeft = 1; showUpgrades(rollUpgrades()); }
export function tryReroll() {
  if (state.phase !== 'upgrade' || rerollsLeft <= 0) return;
  rerollsLeft--;
  showUpgrades(rollUpgrades());
}
// 通关选择「踏入深渊」→ 进入无尽第 1 层
export function enterAbyss() {
  hideCleared();
  state.abyss = 1;
  state.phase = 'wave';
  startAbyssLayer();
}

let bossTimer = 0;
export function updateFlow(dt) {
  if (state.phase === 'wave') {
    // 深渊含 Boss 轮 → 清场要算上 Boss；主线仍只看杂兵（Boss 走独立 boss 阶段）
    const cleared = state.abyss > 0 ? countAliveAll() === 0 : countAliveMinions() === 0;
    if (cleared) {
      clearProjectiles();                               // 清掉空中残留弹幕，避免穿越菜单/Boss 登场后伤人
      if (state.abyss > 0) {                            // 深渊中：清层 → 强化 → 下一层
        state.phase = 'upgrade'; state.lockTarget = null; presentUpgrades();
      } else if (state.wave >= WAVES.length) {          // 主线波次清空 → 召唤 Boss
        state.phase = 'bossPending'; bossTimer = 2.0; toast('强 敌 降 临…', 2.0); state.lockTarget = null;
      } else {                                          // 进入波间强化选择
        state.phase = 'upgrade'; state.lockTarget = null; presentUpgrades();
      }
    }
  } else if (state.phase === 'bossPending') {
    bossTimer -= dt;
    if (bossTimer <= 0) { spawnBoss(); state.phase = 'boss'; }
  }
}

// 玩家在波间按 1/2/3 选择强化 → 应用 → 进入下一波（深渊中则进入下一层）
export function pickUpgrade(i) {
  if (state.phase !== 'upgrade') return;
  const u = applyUpgrade(i);
  if (!u) return;
  hideUpgrades();
  toast(`强化：${u.name}`, 1.6);
  state.phase = 'wave';
  if (state.abyss > 0) { state.abyss++; startAbyssLayer(); }
  else startWave(state.wave + 1);
}
