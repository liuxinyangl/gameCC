// =============================================================
//  effects.js — 粒子(GPU)、冲击波、刀光、残影、漂浮伤害数字
// =============================================================
import * as THREE from 'three';
import { scene, camera } from './scene.js';
import { randRange } from './util.js';

// ---------- GPU 粒子池（单 Points + 自定义着色器，加法混合配合 Bloom）----------
const MAX = 900;
const pos = new Float32Array(MAX * 3);
const vel = new Float32Array(MAX * 3);
const col = new Float32Array(MAX * 3);
const siz = new Float32Array(MAX);
const alp = new Float32Array(MAX);
const life = new Float32Array(MAX);
const maxLife = new Float32Array(MAX);
const grav = new Float32Array(MAX);
const drag = new Float32Array(MAX);
let cursor = 0;

const pgeo = new THREE.BufferGeometry();
pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
pgeo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
pgeo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
pgeo.setAttribute('aAlpha', new THREE.BufferAttribute(alp, 1));
const pmat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `
    attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
    varying vec3 vColor; varying float vAlpha;
    void main(){
      vColor = aColor; vAlpha = aAlpha;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (320.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying vec3 vColor; varying float vAlpha;
    void main(){
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.0, d) * vAlpha;
      gl_FragColor = vec4(vColor, a);
    }`,
});
const points = new THREE.Points(pgeo, pmat);
points.frustumCulled = false;
scene.add(points);

const _c = new THREE.Color();
export function spawnBurst(x, y, z, opts = {}) {
  const { count = 18, color = 0xffffff, speed = 6, spread = 1, size = 0.5,
          life: lf = 0.5, gravity = 8, drag: dr = 2, up = 0 } = opts;
  _c.set(color);
  for (let k = 0; k < count; k++) {
    const i = cursor; cursor = (cursor + 1) % MAX;
    pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = z;
    // 球面随机方向 * 速度
    const th = Math.random() * Math.PI * 2, ph = Math.acos(randRange(-1, 1));
    const sp = speed * randRange(1 - spread * 0.5, 1 + spread * 0.5);
    vel[i*3]   = Math.sin(ph) * Math.cos(th) * sp;
    vel[i*3+1] = Math.cos(ph) * sp + up;
    vel[i*3+2] = Math.sin(ph) * Math.sin(th) * sp;
    col[i*3] = _c.r; col[i*3+1] = _c.g; col[i*3+2] = _c.b;
    siz[i] = size * randRange(0.6, 1.3);
    life[i] = maxLife[i] = lf * randRange(0.7, 1.1);
    alp[i] = 1; grav[i] = gravity; drag[i] = dr;
  }
  pgeo.attributes.aColor.needsUpdate = true;
}

function updateParticles(dt) {
  for (let i = 0; i < MAX; i++) {
    if (life[i] <= 0) continue;
    life[i] -= dt;
    if (life[i] <= 0) { alp[i] = 0; siz[i] = 0; continue; }
    const d = 1 - drag[i] * dt;
    vel[i*3] *= d; vel[i*3+2] *= d;
    vel[i*3+1] = vel[i*3+1] * d - grav[i] * dt;
    pos[i*3]   += vel[i*3]   * dt;
    pos[i*3+1] += vel[i*3+1] * dt;
    pos[i*3+2] += vel[i*3+2] * dt;
    alp[i] = life[i] / maxLife[i];
  }
  pgeo.attributes.position.needsUpdate = true;
  pgeo.attributes.aSize.needsUpdate = true;
  pgeo.attributes.aAlpha.needsUpdate = true;
}

// ---------- 网格特效：冲击波环 / 刀光弧 ----------
const meshFx = [];   // { mesh, t, life, grow, spin, fade }
export function spawnShockwave(x, z, maxR, color = 0xff6622) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.85, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.06, z);
  scene.add(ring);
  meshFx.push({ mesh: ring, t: 0, life: 0.55, grow: maxR, spin: 0 });
}
export function spawnSlash(x, y, z, heading, color, big = false) {
  const arc = new THREE.Mesh(
    new THREE.RingGeometry(big ? 1.3 : 1.0, big ? 2.2 : 1.7, 28, 1, Math.PI * 0.12, Math.PI * 0.76),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  arc.position.set(x + Math.sin(heading) * 1.1, y, z + Math.cos(heading) * 1.1);
  arc.rotation.y = heading;
  arc.rotation.x = Math.PI / 2;
  arc.rotation.z = randRange(-0.5, 0.5);
  scene.add(arc);
  meshFx.push({ mesh: arc, t: 0, life: 0.18, grow: big ? 1.4 : 1.0, spin: randRange(-3, 3) });
}
function updateMeshFx(dt) {
  for (let i = meshFx.length - 1; i >= 0; i--) {
    const e = meshFx[i]; e.t += dt;
    const p = e.t / e.life;
    const s = 1 + p * e.grow;
    e.mesh.scale.set(s, s, s);
    if (e.spin) e.mesh.rotation.z += e.spin * dt;
    e.mesh.material.opacity = (1 - p);
    if (e.t >= e.life) { scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); meshFx.splice(i, 1); }
  }
}

// ---------- 翻滚残影 ----------
const ghosts = [];
export function spawnAfterimage(group, color) {
  const ghost = group.clone(true);
  const gm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  ghost.traverse(o => { if (o.isMesh) { o.material = gm; o.castShadow = false; } });
  scene.add(ghost);
  ghosts.push({ mesh: ghost, mat: gm, t: 0, life: 0.32 });
}
function updateGhosts(dt) {
  for (let i = ghosts.length - 1; i >= 0; i--) {
    const g = ghosts[i]; g.t += dt;
    g.mat.opacity = 0.5 * (1 - g.t / g.life);
    if (g.t >= g.life) { scene.remove(g.mesh); g.mat.dispose(); ghosts.splice(i, 1); }
  }
}

// ---------- 漂浮伤害数字（DOM）----------
const dmgLayer = document.getElementById('dmgLayer');
const dmgs = [];
const _v = new THREE.Vector3();
export function spawnDamageNumber(x, y, z, amount, kind = 'normal') {
  if (!dmgLayer) return;
  const el = document.createElement('div');
  el.className = 'dmg ' + kind;
  el.textContent = Math.round(amount);
  dmgLayer.appendChild(el);
  dmgs.push({ el, pos: new THREE.Vector3(x, y, z), t: 0, life: 0.9, vy: 1.4, vx: randRange(-0.4, 0.4) });
}
function updateDamageNumbers(dt) {
  for (let i = dmgs.length - 1; i >= 0; i--) {
    const d = dmgs[i]; d.t += dt;
    d.pos.y += d.vy * dt; d.pos.x += d.vx * dt; d.vy -= dt * 1.2;
    _v.copy(d.pos).project(camera);
    const x = (_v.x * 0.5 + 0.5) * innerWidth;
    const y = (-_v.y * 0.5 + 0.5) * innerHeight;
    const p = d.t / d.life;
    if (_v.z > 1) { d.el.style.opacity = 0; }
    else {
      d.el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${1 + (1 - p) * 0.4})`;
      d.el.style.opacity = 1 - p * p;
    }
    if (d.t >= d.life) { d.el.remove(); dmgs.splice(i, 1); }
  }
}

export function updateEffects(dt) {
  updateParticles(dt);
  updateMeshFx(dt);
  updateGhosts(dt);
  updateDamageNumbers(dt);   // 伤害数字用真实 dt（不受顿帧影响），由调用方决定
}
