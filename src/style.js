// =============================================================
//  style.js — 风格评级：连续命中不挨打升 D→S，越高影能涨越快
// =============================================================
const RANKS = [
  { min: 0,   letter: 'D', color: '#9aa6b5', mult: 1.0 },
  { min: 20,  letter: 'C', color: '#7bd1ff', mult: 1.12 },
  { min: 45,  letter: 'B', color: '#7be88a', mult: 1.28 },
  { min: 75,  letter: 'A', color: '#ffd24a', mult: 1.5 },
  { min: 110, letter: 'S', color: '#ff6bd0', mult: 1.8 },
];
const CAP = 140;
let points = 0;
let bestIdx = 0;                                                         // 本局达到过的最高评级（用于结算）

export function addStyle(v) { points = Math.min(CAP, points + v); if (curIdx() > bestIdx) bestIdx = curIdx(); }   // 命中累积
export function loseStyle() { points = Math.max(0, points * 0.3 - 8); } // 挨打大跌
export function updateStyle(dt) { points = Math.max(0, points - 12 * dt); }  // 缓慢衰减（逼着持续输出）

function curIdx() { let i = 0; for (let k = 0; k < RANKS.length; k++) if (points >= RANKS[k].min) i = k; return i; }
export function styleRank() { return RANKS[curIdx()]; }
export function bestRank() { return RANKS[bestIdx]; }                    // 本局最高评级（结算用）
export function bestStyleLevel() { return bestIdx; }
export function styleEnergyMult() { return RANKS[curIdx()].mult; }       // 评级→影能倍率
export function stylePoints() { return points; }
export function styleProgress() {                                        // 当前评级内进度（用于条）
  const i = curIdx();
  const cur = RANKS[i].min, next = i < RANKS.length - 1 ? RANKS[i + 1].min : CAP;
  return Math.min(1, (points - cur) / (next - cur));
}
