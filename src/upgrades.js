// =============================================================
//  upgrades.js — 波间肉鸽强化：3 选 1，累积构筑（可叠加 + 稀有度分级）
//  钩子型强化只改 player 上的数值/开关，触发逻辑分散在
//  player.js（弹反/翻滚/重击/回血/狂战）与 enemies.js（击杀回馈）。
// =============================================================
import { player } from './player.js';

// 稀有度：影响抽取权重（普通常见、史诗稀有）与卡面/构筑 chip 配色
export const TIERS = {
  common: { name: '普通', color: '#9aa6b5', weight: 3 },
  rare:   { name: '稀有', color: '#5bd0ff', weight: 2 },
  epic:   { name: '史诗', color: '#ffd24a', weight: 1 },
};

export const UPGRADES = [
  // ---- 普通：基础属性 ----
  { tier: 'common', icon: '❤️', name: '强健体魄', desc: '最大生命 +25，立即回复',   apply() { player.maxHp += 25; player.hp = Math.min(player.maxHp, player.hp + 25); } },
  { tier: 'common', icon: '🛡️', name: '坚韧',     desc: '最大耐力 +20，立即回满',   apply() { player.maxSp += 20; player.sp = player.maxSp; } },
  { tier: 'common', icon: '🏃', name: '疾风步',   desc: '移动速度 +12%',           apply() { player.speedMul += 0.12; } },
  { tier: 'common', icon: '⚡', name: '不竭',     desc: '耐力回复速度 +40%',       apply() { player.spRegenMul += 0.4; } },
  { tier: 'common', icon: '🧪', name: '备用药剂', desc: '回血药 +1',               apply() { player.flasks += 1; } },
  { tier: 'common', icon: '🩹', name: '强效药剂', desc: '回血量 +25',             apply() { player.healBonus += 25; } },
  // ---- 稀有：流派强化 ----
  { tier: 'rare',   icon: '🩸', name: '噬血',     desc: '近战命中回复 12% 伤害',    apply() { player.lifesteal += 0.12; } },
  { tier: 'rare',   icon: '🌀', name: '影能涌动', desc: '影能获取 +35%',           apply() { player.energyMul += 0.35; } },
  { tier: 'rare',   icon: '💨', name: '疾影',     desc: '每次翻滚回复 15 影能',     apply() { player.dodgeEnergy += 15; } },
  { tier: 'rare',   icon: '⚔️', name: '影刃延伸', desc: '攻击范围 +20%',           apply() { player.rangeMul += 0.2; } },
  { tier: 'rare',   icon: '🪨', name: '守势',     desc: '受到伤害 -10%',           apply() { player.dmgReduction = Math.min(0.5, player.dmgReduction + 0.1); } },
  { tier: 'rare',   icon: '☠️', name: '处决精通', desc: '击杀回复 8 生命 + 6 影能', apply() { player.killHeal += 8; player.killEnergy += 6; } },
  { tier: 'rare',   icon: '🌪️', name: '翻滚震击', desc: '翻滚时脚下爆发冲击波（30 伤+击退）', apply() { player.dodgeNova += 30; } },
  // ---- 史诗：构筑核心 ----
  { tier: 'epic',   icon: '💥', name: '致命',     desc: '暴击率 +20%（暴击 1.8 倍）', apply() { player.critChance = Math.min(0.85, player.critChance + 0.2); } },
  { tier: 'epic',   icon: '🌊', name: '弹反震爆', desc: '弹反成功时对周围炸 40 伤害', apply() { player.parryNova += 40; } },
  { tier: 'epic',   icon: '💢', name: '狂战之怒', desc: '生命低于 35% 时伤害 +30%',  apply() { player.berserkDmg += 0.3; } },
  { tier: 'epic',   icon: '🔮', name: '影能大师', desc: '大招消耗 -20（下限 40）',   apply() { player.ultCost = Math.max(40, player.ultCost - 20); } },
];

// 本局已获得的强化（按获取顺序，可叠加层数）——供 HUD 构筑面板/结算读取
export const acquired = [];

let choices = [];

// 从池中按稀有度权重无放回抽 n 个
export function rollUpgrades(n = 3) {
  const pool = [...UPGRADES];
  choices = [];
  for (let k = 0; k < n && pool.length; k++) {
    let total = 0;
    for (const u of pool) total += TIERS[u.tier].weight;
    let r = Math.random() * total, idx = 0;
    for (let j = 0; j < pool.length; j++) { r -= TIERS[pool[j].tier].weight; if (r <= 0) { idx = j; break; } }
    choices.push(pool.splice(idx, 1)[0]);
  }
  return choices;
}
export function applyUpgrade(i) {
  const u = choices[i];
  if (!u) return null;
  u.apply();
  const have = acquired.find(a => a.name === u.name);   // 叠加同名 → 层数 +1
  if (have) have.count++;
  else acquired.push({ icon: u.icon, name: u.name, tier: u.tier, count: 1 });
  choices = [];
  return u;
}
