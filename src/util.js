// =============================================================
//  util.js — 纯函数小工具
// =============================================================

// 角度插值（走最短弧）
export function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
export const lerp = (a, b, t) => a + (b - a) * t;

// 帧率无关的指数趋近系数：rate 越大跟得越紧
export const damp = (dt, rate) => 1 - Math.pow(1 - rate, dt * 60);

// [-s, s] 内的伪随机（不依赖 Math.random 也行，但这里浏览器运行时允许用）
export const rand = (s = 1) => (Math.random() * 2 - 1) * s;
export const randRange = (a, b) => a + Math.random() * (b - a);
