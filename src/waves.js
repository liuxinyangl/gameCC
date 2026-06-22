// =============================================================
//  waves.js — 关卡流程：逐波递增 → 波间肉鸽强化 → 最后一波后召 Boss
// =============================================================
import { state } from './state.js';
import { WAVES } from './config.js';
import { spawnMinion, spawnCaster, spawnDasher, spawnBrute, spawnBoss, countAliveMinions } from './enemies.js';
import { toast, showUpgrades, hideUpgrades } from './hud.js';
import { rollUpgrades, applyUpgrade } from './upgrades.js';
import { clearProjectiles } from './projectiles.js';
import { randRange } from './util.js';

// 在场地边缘随机散布生成
function spawnAround(spawnFn, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, r = randRange(9, 13);
    spawnFn(Math.cos(a) * r, Math.sin(a) * r - 4);
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

let bossTimer = 0;
export function updateFlow(dt) {
  if (state.phase === 'wave') {
    if (countAliveMinions() === 0) {
      clearProjectiles();                               // 清掉空中残留弹幕，避免穿越菜单/Boss 登场后伤人
      if (state.wave >= WAVES.length) {                 // 波次清空 → 召唤 Boss
        state.phase = 'bossPending'; bossTimer = 2.0; toast('强 敌 降 临…', 2.0); state.lockTarget = null;
      } else {                                          // 进入波间强化选择
        state.phase = 'upgrade'; state.lockTarget = null; showUpgrades(rollUpgrades());
      }
    }
  } else if (state.phase === 'bossPending') {
    bossTimer -= dt;
    if (bossTimer <= 0) { spawnBoss(); state.phase = 'boss'; }
  }
}

// 玩家在波间按 1/2/3 选择强化 → 应用 → 进入下一波
export function pickUpgrade(i) {
  if (state.phase !== 'upgrade') return;
  const u = applyUpgrade(i);
  if (!u) return;
  hideUpgrades();
  toast(`强化：${u.name}`, 1.6);
  state.phase = 'wave';
  startWave(state.wave + 1);
}
