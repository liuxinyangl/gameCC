// =============================================================
//  config.js — 所有可调数值集中在此（调参只改这里）
// =============================================================
export const ARENA = 26;

// ---- 玩家：轻击三连 [时长, 伤害, 有效窗口起, 有效窗口止] ----
export const LIGHT_COMBO = [
  { dur: 0.38, dmg: 26, a0: 0.10, a1: 0.26 },
  { dur: 0.36, dmg: 26, a0: 0.09, a1: 0.24 },
  { dur: 0.54, dmg: 46, a0: 0.16, a1: 0.34 },   // 终结技
];
export const LIGHT_RANGE = 2.4, LIGHT_ARC = Math.PI * 0.6, LIGHT_KNOCK = 5;
export const HEAVY = { dur: 0.72, dmg: 82, a0: 0.40, a1: 0.58, range: 2.8, arc: Math.PI * 0.5, knock: 12, cost: 30 };

export const DODGE_DURATION = 0.40, DODGE_IFRAME = 0.28, DODGE_SPEED = 13, DODGE_COST = 26;
export const MOVE_SPEED = 6.2, SPRINT_SPEED = 9.8, SPRINT_COST = 22;
export const HEAL_DURATION = 0.85, HEAL_AMOUNT = 45;
export const PARRY = { dur: 0.5, window: 0.22, cost: 14, posture: 55 };

// ---- 能量 / 大招「影斩」 ----
export const ENERGY_MAX = 100;
export const ENERGY_GAIN = { light: 6, heavy: 12, parry: 22, hurt: 8 };
export const ULT = { cost: 100, dur: 1.15, range: 6.0, dmg: 52, knock: 16, tickTimes: [0.18, 0.45, 0.74] };

// ---- 手感：顿帧 / 子弹时间（秒）----
export const HITSTOP = { light: 0.04, heavy: 0.09, exec: 0.13, ult: 0.06 };
export const SLOWMO_PARRY = 0.22;

// ---- 杂兵 ----
export const M_DETECT = 18, M_ATK_RANGE = 2.3, M_SPEED = 3.5;
export const M_WINDUP = 0.55, M_STRIKE = 0.18, M_RECOVER = 0.68, M_DMG = 14, M_KNOCK = 4;
export const MINION_HP = 60;

// ---- Boss ----
export const BOSS_HP = 420, BOSS_MAX_POSTURE = 100;
export const BOSS_MOVES = {
  slam:   { windup: 0.75, active: 0.22, recover: 0.82, range: 4.2, arc: Math.PI,        dmg: 32, knock: 12, lunge: 0 },
  sweep:  { windup: 0.55, active: 0.24, recover: 0.68, range: 3.6, arc: Math.PI * 0.75, dmg: 24, knock: 8,  lunge: 0 },
  charge: { windup: 0.50, active: 0.30, recover: 0.92, range: 3.0, arc: Math.PI * 0.5,  dmg: 28, knock: 13, lunge: 14 },
};
export const BOSS_SPEED = 3.9, BOSS_ENGAGE = 4.8;
export const BOSS_STAGGER_DUR = 2.8, POSTURE_REGEN = 6;
export const BOSS_COMBOS    = [['sweep', 'slam'], ['charge', 'sweep']];
export const BOSS_COMBOS_P2 = [['sweep', 'sweep', 'slam'], ['charge', 'sweep', 'slam'], ['charge', 'slam']];

// ---- 阵营配色（自发光，配合 Bloom 发光）----
export const COLORS = {
  player: 0x4dabf7, playerGlow: 0x2b6cff,
  minion: 0xb02a2a, minionGlow: 0xff3b3b,
  boss: 0x7b2fbf,   bossGlow: 0xb13bff, bossRage: 0xff2244,
};
