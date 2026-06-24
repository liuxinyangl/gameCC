// =============================================================
//  indicators.js — 画面外威胁的屏幕边缘箭头
//  把世界坐标投影到屏幕；落在视口外的「正在出招」敌人 / 来袭弹幕，
//  在最靠近的视口边缘画一个指向它的三角箭头（颜色按威胁类型）。
// =============================================================
import * as THREE from 'three';
import { camera } from './scene.js';
import { enemies } from './enemies.js';
import { activeProjectiles } from './projectiles.js';

const layer = document.getElementById('edgeWarn');
const POOL = 16;
const arrows = [];
for (let i = 0; i < POOL; i++) {
  const a = document.createElement('div');
  a.className = 'warn'; a.style.display = 'none';
  layer.appendChild(a); arrows.push(a);
}

const _v = new THREE.Vector3();
const MARGIN = 46;
let used = 0;

// 在边缘放一个指向 (wx,wy,wz) 的箭头；该点在屏幕内则不放
function place(wx, wy, wz, color) {
  if (used >= POOL) return;
  _v.set(wx, wy, wz).project(camera);            // → NDC (-1..1)，z>1 表示在相机后/超远
  let x = _v.x, y = _v.y;
  const behind = _v.z > 1;
  if (behind) { x = -x; y = -y; }                // 背后时方向镜像，箭头才指对侧
  if (!behind && x >= -1 && x <= 1 && y >= -1 && y <= 1) return;   // 已在画面内：无需提示

  const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2;
  let px = (x * 0.5 + 0.5) * W, py = (-y * 0.5 + 0.5) * H;
  px = Math.max(MARGIN, Math.min(W - MARGIN, px));   // 夹到带边距的视口矩形边缘
  py = Math.max(MARGIN, Math.min(H - MARGIN, py));
  const ang = Math.atan2(py - cy, px - cx);          // 从屏幕中心指向威胁的方向

  const el = arrows[used++];
  el.style.display = 'block';
  el.style.left = px + 'px'; el.style.top = py + 'px';
  el.style.transform = `translate(-50%,-50%) rotate(${ang + Math.PI / 2}rad)`;   // 默认朝上的三角转到该方向
  el.style.color = color; el.style.borderBottomColor = color;
}

// 敌人是否处于「危险出招」态——只有这些才值得画面外提示
function threatColor(e) {
  if (e.isCaster) return e.state === 'windup' ? '#7cff4d' : null;                       // 施法
  if (e.isDasher) return (e.state === 'windup' || e.state === 'dash') ? '#40f0ff' : null; // 突进
  if (e.isBrute)  return (e.state === 'windup' || e.state === 'active') ? '#ff7a2a' : null;
  if (e.isBoss)   return (e.state === 'windup' || e.state === 'active') ? '#ff3b6b' : null;
  return (e.state === 'windup' || e.state === 'strike') ? '#ff5a5a' : null;              // 杂兵
}

export function updateIndicators() {
  used = 0;
  for (const e of enemies) {
    if (e.state === 'dead' || e.state === 'gone' || e.state === 'intro') continue;
    const c = threatColor(e);
    if (c) place(e.mesh.position.x, 1.4, e.mesh.position.z, c);
  }
  for (const p of activeProjectiles()) {
    if (p.friendly) continue;                    // 己方反弹弹不是威胁
    place(p.x, p.y, p.z, '#9cff66');             // 来袭弹幕：亮绿
  }
  for (let k = used; k < POOL; k++) if (arrows[k].style.display !== 'none') arrows[k].style.display = 'none';
}
