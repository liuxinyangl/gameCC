// =============================================================
//  util.js — 纯数学小工具
// =============================================================
export function clamp(v, lo, hi){ return v < lo ? lo : v > hi ? hi : v; }
export function dist(ax, ay, bx, by){ return Math.hypot(ax - bx, ay - by); }
