// =============================================================
//  canvas.js — 画布 / 2D 上下文 / 尺寸同步
// =============================================================
import { view } from './state.js';

export const cv = document.getElementById('c');
export const ctx = cv.getContext('2d');

export function resize(){ view.W = cv.width = innerWidth; view.H = cv.height = innerHeight; }
addEventListener('resize', resize);
resize();
