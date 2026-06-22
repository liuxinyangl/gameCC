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
export const BOSS_HP = 480, BOSS_MAX_POSTURE = 100;   // 6 波 5 次强化后玩家更强，终战相应加血
export const BOSS_MOVES = {
  slam:   { windup: 0.75, active: 0.22, recover: 0.82, range: 4.2, arc: Math.PI,        dmg: 32, knock: 12, lunge: 0 },
  sweep:  { windup: 0.55, active: 0.24, recover: 0.68, range: 3.6, arc: Math.PI * 0.75, dmg: 24, knock: 8,  lunge: 0 },
  charge: { windup: 0.50, active: 0.30, recover: 0.92, range: 3.0, arc: Math.PI * 0.5,  dmg: 28, knock: 13, lunge: 14 },
};
export const BOSS_SPEED = 3.9, BOSS_ENGAGE = 4.8;
export const BOSS_STAGGER_DUR = 2.8, POSTURE_REGEN = 6;
export const BOSS_COMBOS    = [['sweep', 'slam'], ['charge', 'sweep']];
export const BOSS_COMBOS_P2 = [['sweep', 'sweep', 'slam'], ['charge', 'sweep', 'slam'], ['charge', 'slam']];

// ---- 暗影术士（远程，绿色弹幕，可被弹反打回）----
export const CASTER_HP = 44;
export const C_KITE = 8;             // 理想风筝距离（更近就后撤）
export const C_CAST_RANGE = 17;      // 进入此距离开始施法
export const C_WINDUP = 0.85, C_RECOVER = 1.0, C_SPEED = 3.2;

// ---- 弹幕 ----
export const PROJ = { speed: 9, dmg: 16, life: 3.2, radius: 0.45, reflectSpeed: 18, reflectDmg: 30 };

// ---- 影刃刺客（高速突进，突进前有明显后仰预兆）----
export const DASHER_HP = 38;
export const D_RANGE = 7;             // 进入此距离起手突进
export const D_SPEED = 5.6;           // 追击速度（比小鬼快）
export const D_WINDUP = 0.5, D_DASH = 0.26, D_RECOVER = 0.7;
export const D_DASH_SPEED = 22, D_DMG = 18;

// ---- 暗影石卫（重装：缓慢、高血、过顶砸地带冲击波；霸体——普通/重击打不断起手，须翻滚或弹反）----
export const BRUTE_HP = 130;
export const BR_RANGE = 3.0;          // 进入此距离起手砸地
export const BR_SPEED = 2.2;          // 沉重缓慢逼近
export const BR_WINDUP = 1.0, BR_ACTIVE = 0.32, BR_RECOVER = 1.1;   // 长蓄力 → 大破绽
export const BR_DMG = 28;

// ---- 掉落拾取（杂兵死亡概率掉落）----
export const PICKUP = { drop: 0.33, hp: 25, energy: 30 };

// ---- 波次：逐波递增，清空后进入下一波；最后一波后召唤 Boss ----
export const WAVES = [
  { imp: 3 },                          // 1 · 热身：纯小鬼
  { imp: 4, caster: 1 },               // 2 · 引入术士（远程弹幕）
  { imp: 3, caster: 1, dasher: 1 },             // 3 · 引入刺客（突进）
  { imp: 3, caster: 1, brute: 1 },              // 4 · 引入石卫（重装霸体）
  { imp: 3, caster: 1, dasher: 3 },             // 5 · 突进围攻
  { imp: 4, caster: 2, dasher: 2, brute: 1 },   // 6 · 全员压上 → Boss
];

// ---- 阵营配色（自发光，配合 Bloom 发光）----
export const COLORS = {
  player: 0x4dabf7, playerGlow: 0x2b6cff,
  minion: 0xb02a2a, minionGlow: 0xff3b3b,
  boss: 0x7b2fbf,   bossGlow: 0xb13bff, bossRage: 0xff2244,
  caster: 0x2a5a30, casterGlow: 0x7cff4d,
  dasher: 0x0e3a3a, dasherGlow: 0x40f0ff,
  brute:  0x35353f, bruteGlow:  0xff7a2a,
};
