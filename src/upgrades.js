// =============================================================
//  upgrades.js — 波间肉鸽强化：3 选 1，累积构筑
// =============================================================
import { player } from './player.js';

export const UPGRADES = [
  { icon: '❤️', name: '强健体魄', desc: '最大生命 +25，立即回复',     apply() { player.maxHp += 25; player.hp = Math.min(player.maxHp, player.hp + 25); } },
  { icon: '🩸', name: '噬血',     desc: '近战命中回复 12% 伤害',      apply() { player.lifesteal += 0.12; } },
  { icon: '💥', name: '致命',     desc: '暴击率 +20%（暴击 1.8 倍）', apply() { player.critChance = Math.min(0.85, player.critChance + 0.2); } },
  { icon: '🌀', name: '影能涌动', desc: '影能获取 +35%',             apply() { player.energyMul += 0.35; } },
  { icon: '💨', name: '疾影',     desc: '每次翻滚回复 15 影能',       apply() { player.dodgeEnergy += 15; } },
  { icon: '⚔️', name: '影刃延伸', desc: '攻击范围 +20%',             apply() { player.rangeMul += 0.2; } },
  { icon: '🧪', name: '备用药剂', desc: '回血药 +1',                 apply() { player.flasks += 1; } },
  { icon: '🛡️', name: '坚韧',     desc: '最大耐力 +20，立即回满',     apply() { player.maxSp += 20; player.sp = player.maxSp; } },
];

let choices = [];

// 从池中随机抽 n 个不重复的强化
export function rollUpgrades(n = 3) {
  const pool = [...UPGRADES];
  choices = [];
  for (let k = 0; k < n && pool.length; k++)
    choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return choices;
}
export function applyUpgrade(i) {
  const u = choices[i];
  if (!u) return null;
  u.apply();
  choices = [];
  return u;
}
