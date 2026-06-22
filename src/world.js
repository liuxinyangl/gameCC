// =============================================================
//  world.js — 场地：发光符文阵、水晶柱、边界、碰撞、空气余烬
// =============================================================
import * as THREE from 'three';
import { ARENA } from './config.js';
import { scene } from './scene.js';
import { spawnBurst } from './effects.js';
import { randRange } from './util.js';

export const obstacles = [];   // { pos: Vector2(x,z), r }

// 地面
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(ARENA, 64),
  new THREE.MeshStandardMaterial({ color: 0x1a1a26, roughness: 0.95, metalness: 0.1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(ARENA * 2, 48, 0x2a2a44, 0x1c1c30);
grid.position.y = 0.01;
scene.add(grid);

// 中央发光符文阵（旋转 + 呼吸）
const runeMat = new THREE.MeshBasicMaterial({ color: 0x3b6bff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
const rune = new THREE.Group();
for (const r of [6, 9.5]) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.12, r, 80), runeMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; rune.add(ring);
}
for (let i = 0; i < 6; i++) {                       // 放射符文段
  const seg = new THREE.Mesh(new THREE.RingGeometry(7, 8.6, 8, 1, 0, 0.18), runeMat);
  seg.rotation.x = -Math.PI / 2; seg.rotation.z = i / 6 * Math.PI * 2; seg.position.y = 0.02; rune.add(seg);
}
scene.add(rune);

// 边界矮墙（发光顶边）
const wallMat = new THREE.MeshStandardMaterial({ color: 0x26263a, roughness: 0.9 });
const wallGlow = new THREE.MeshBasicMaterial({ color: 0x2244aa, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8 });
const N = 40, R = ARENA;
for (let i = 0; i < N; i++) {
  const a = i / N * Math.PI * 2;
  const x = Math.cos(a) * R, z = Math.sin(a) * R;
  const post = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.5), wallMat);
  post.position.set(x, 1.2, z); post.lookAt(0, 1.2, 0);
  post.castShadow = post.receiveShadow = true; scene.add(post);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.5), wallGlow);
  cap.position.set(x, 2.45, z); cap.lookAt(0, 2.45, 0); scene.add(cap);
}

// 水晶柱（顶部发光晶体，带碰撞）
function addPillar(x, z, glow) {
  const h = 3.4 + Math.abs(Math.sin(x * 1.3 + z)) * 2;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, h, 8),
    new THREE.MeshStandardMaterial({ color: 0x33334d, roughness: 0.7, metalness: 0.3 }));
  col.position.set(x, h / 2, z); col.castShadow = col.receiveShadow = true; scene.add(col);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0),
    new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 1.8, roughness: 0.3 }));
  crystal.position.set(x, h + 0.5, z); crystal.castShadow = true; scene.add(crystal);
  obstacles.push({ pos: new THREE.Vector2(x, z), r: 1.1, crystal, baseY: h + 0.5 });
}
const pillarGlows = [0x3b6bff, 0xff3b6b, 0x3bffb0, 0xffaa3b, 0xaa3bff, 0x3bd0ff];
[[-9, -6], [10, 5], [-7, 11], [13, -11], [0, 16], [-15, 1]].forEach(([x, z], i) => addPillar(x, z, pillarGlows[i % pillarGlows.length]));

// 圆形碰撞解算 + 夹在圆形场地内
const _v2 = new THREE.Vector2();
export function resolveCollisions(pos, radius) {
  for (const o of obstacles) {
    _v2.set(pos.x - o.pos.x, pos.z - o.pos.y);
    const minDist = radius + o.r;
    const d = _v2.length();
    if (d < minDist && d > 0.0001) { _v2.multiplyScalar((minDist - d) / d); pos.x += _v2.x; pos.z += _v2.y; }
  }
  const lim = ARENA - 1.2;
  const dc = Math.hypot(pos.x, pos.z);
  if (dc > lim) { pos.x *= lim / dc; pos.z *= lim / dc; }
}

// 每帧：符文旋转呼吸、晶体上下浮动、空气余烬
let emberT = 0, runeT = 0;
export function updateWorld(dt) {
  runeT += dt;
  rune.rotation.y += dt * 0.12;
  runeMat.opacity = 0.45 + Math.sin(runeT * 1.5) * 0.18;
  for (const o of obstacles) if (o.crystal) o.crystal.position.y = o.baseY + Math.sin(runeT * 1.2 + o.pos.x) * 0.18;
  emberT += dt;
  if (emberT > 0.12) {                              // 上升的暖色余烬
    emberT = 0;
    spawnBurst(randRange(-ARENA + 4, ARENA - 4), 0.2, randRange(-ARENA + 4, ARENA - 4),
      { count: 2, color: 0xff8844, speed: 0.5, spread: 1, size: 0.18, life: 3.2, gravity: -0.5, drag: 0.4, up: 0.4 });
  }
}
