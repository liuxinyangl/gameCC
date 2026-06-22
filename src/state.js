// =============================================================
//  state.js — 少量跨模块共享状态（保持精简，不做成大全局）
// =============================================================
export const state = {
  started: false,
  ended: false,
  phase: 'wave',        // wave | upgrade | bossPending | boss
  wave: 0,              // 当前波次（从 1 起）
  lockTarget: null,
  shake: 0,
  hitStop: 0,           // 命中顿帧：>0 时几乎冻结战斗
  slowmo: 0,            // 子弹时间：>0 时减速
};

// 镜头角度：鼠标(input) 与 锁定(camera) 都会写它
export const look = { yaw: Math.PI, pitch: 0.35, fov: 55, fovTarget: 55 };

export function addShake(v) { if (v > state.shake) state.shake = v; }
export function hitStop(d)  { if (d > state.hitStop) state.hitStop = d; }
export function slowmo(d)   { if (d > state.slowmo) state.slowmo = d; }

// 综合时间缩放：顿帧最优先，其次子弹时间
export function timeScale() {
  if (state.hitStop > 0) return 0.03;
  if (state.slowmo > 0)  return 0.35;
  return 1;
}
// 用真实 dt 衰减计时器（不能被自身缩放，否则永远冻结）
export function tickTimers(realDt) {
  state.hitStop = Math.max(0, state.hitStop - realDt);
  state.slowmo  = Math.max(0, state.slowmo  - realDt);
}
