// =============================================================
//  upgrades.js — 波间肉鸽强化：3 选 1，累积构筑（可叠加）
//  新增的「钩子型」强化只改 player 上的数值/开关，触发逻辑分散在
//  player.js（弹反/翻滚/重击/回血/狂战）与 enemies.js（击杀回馈）。
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
  { icon: '🏃', name: '疾风步',   desc: '移动速度 +12%',             apply() { player.speedMul += 0.12; } },
  { icon: '🪨', name: '守势',     desc: '受到伤害 -10%',             apply() { player.dmgReduction = Math.min(0.5, player.dmgReduction + 0.1); } },
  // ---- 新增：钩子型强化（深化流派）----
  { icon: '☠️', name: '处决精通', desc: '击杀回复 8 生命 + 6 影能',  apply() { player.killHeal += 8; player.killEnergy += 6; } },
  { icon: '🌊', name: '弹反震爆', desc: '弹反成功时对周围炸 40 伤害', apply() { player.parryNova += 40; } },
  { icon: '🌪️', name: '翻滚震击', desc: '翻滚时脚下爆发冲击波（30 伤+击退）', apply() { player.dodgeNova += 30; } },
  { icon: '💢', name: '狂战之怒', desc: '生命低于 35% 时伤害 +30%',  apply() { player.berserkDmg += 0.3; } },
  { icon: '🩹', name: '强效药剂', desc: '回血量 +25',               apply() { player.healBonus += 25; } },
  { icon: '🔮', name: '影能大师', desc: '大招消耗 -20（下限 40）',   apply() { player.ultCost = Math.max(40, player.ultCost - 20); } },
  { icon: '⚡', name: '不竭',     desc: '耐力回复速度 +40%',         apply() { player.spRegenMul += 0.4; } },
];

// 本局已获得的强化（按获取顺序，可叠加层数）——供 HUD 构筑面板读取
export const acquired = [];

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
  const have = acquired.find(a => a.name === u.name);   // 叠加同名 → 层数 +1
  if (have) have.count++;
  else acquired.push({ icon: u.icon, name: u.name, count: 1 });
  choices = [];
  return u;
}
