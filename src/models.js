// =============================================================
//  models.js — 卡通渲染(Cel-shading)+ 描边 的角色（主角/小恶魔/恶魔督军）
// =============================================================
import * as THREE from 'three';
import { COLORS } from './config.js';

// 4 段卡通渐变（NdotL 采样 .r），制造硬边明暗
const grad = new THREE.DataTexture(new Uint8Array([70, 140, 210, 255]), 4, 1, THREE.RedFormat);
grad.magFilter = grad.minFilter = THREE.NearestFilter;
grad.needsUpdate = true;

const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap: grad });
// 自发光部件（推到 HDR，让 Bloom 接住）
function glowMesh(geo, color) {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
  m.material.color.multiplyScalar(1.7);
  m.userData.outline = false;
  return m;
}

// 反向外扩黑色背面 = 卡通描边
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x0a0a12, side: THREE.BackSide });
function addOutline(group, scale = 1.07) {
  const todo = [];
  group.traverse(o => { if (o.isMesh && o.userData.outline !== false) todo.push(o); });
  for (const o of todo) {
    const ol = new THREE.Mesh(o.geometry, outlineMat);
    ol.scale.multiplyScalar(scale); ol.castShadow = false; ol.userData.outline = false;
    o.add(ol);
  }
}

// 通用角色构建：用配置切换犄角/披风/尖耳/驼背/武器
function buildCharacter(cfg) {
  const { skin = 0xe8c8a0, armor = 0x4dabf7, glow = 0x2b6cff, eyeColor = glow,
          cape = null, horns = false, ears = false, hunch = false, weapon = 'sword', trim = 0x1c1c2a } = cfg;
  const g = new THREE.Group();
  const A = toon(armor), S = toon(skin), D = toon(trim);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.96, 0.46), A);
  torso.position.y = 1.16; g.add(torso);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.16, 0.48), D); belt.position.y = 0.74; g.add(belt);
  const core = glowMesh(new THREE.IcosahedronGeometry(0.12, 0), glow); core.position.set(0, 1.3, 0.25); g.add(core);

  // 头（含发光眼、可选犄角/尖耳）
  const headG = new THREE.Group(); headG.position.y = 1.94; g.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 20, 20), S); headG.add(head);
  for (const dx of [-0.12, 0.12]) { const eye = glowMesh(new THREE.SphereGeometry(0.055, 8, 8), eyeColor); eye.position.set(dx, 0.04, 0.28); headG.add(eye); }
  if (horns) for (const [dx, rz] of [[-0.2, 0.55], [0.2, -0.55]]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.46, 8), D); h.position.set(dx, 0.32, 0); h.rotation.z = rz; headG.add(h); }
  if (ears) for (const [dx, rz] of [[-0.32, 1.1], [0.32, -1.1]]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.34, 7), S); e.position.set(dx, 0.06, 0); e.rotation.z = rz; headG.add(e); }

  const paulGeo = new THREE.BoxGeometry(0.32, 0.24, 0.52);
  const paulL = new THREE.Mesh(paulGeo, A); paulL.position.set(-0.52, 1.54, 0);
  const paulR = new THREE.Mesh(paulGeo, A); paulR.position.set(0.52, 1.54, 0); g.add(paulL, paulR);

  const legGeo = new THREE.BoxGeometry(0.27, 0.86, 0.27);
  const legL = new THREE.Mesh(legGeo, D); legL.position.set(-0.2, 0.43, 0);
  const legR = new THREE.Mesh(legGeo, D); legR.position.set(0.2, 0.43, 0); g.add(legL, legR);

  const armGeo = new THREE.BoxGeometry(0.22, 0.8, 0.22);
  const armL = new THREE.Mesh(armGeo, A); armL.position.set(-0.54, 1.24, 0);
  const armR = new THREE.Group(); armR.position.set(0.54, 1.56, 0);
  const armRmesh = new THREE.Mesh(armGeo, A); armRmesh.position.y = -0.38; armR.add(armRmesh);
  g.add(armL, armR);

  let blade = null;
  if (weapon !== 'none') {
    const [bw, bh, bd] = weapon === 'greatsword' ? [0.18, 2.0, 0.06] : weapon === 'claw' ? [0.1, 0.55, 0.05] : [0.13, 1.5, 0.05];
    blade = glowMesh(new THREE.BoxGeometry(bw, bh, bd), glow);
    blade.position.y = -0.38 - bh / 2; armR.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(bw * 2.8, 0.1, 0.13), toon(0x9aa0b5)); guard.position.y = -0.38; armR.add(guard);
  }

  let capeG = null;
  if (cape) {
    capeG = new THREE.Group(); capeG.position.set(0, 1.6, -0.24); capeG.rotation.x = 0.18;
    const cm = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 1.4, 1, 4), new THREE.MeshToonMaterial({ color: cape, gradientMap: grad, side: THREE.DoubleSide }));
    cm.position.y = -0.62; cm.userData.outline = false; capeG.add(cm); g.add(capeG);
  }

  if (hunch) { torso.rotation.x = 0.34; headG.position.set(0, 1.82, 0.2); armL.rotation.x = 0.25; armR.rotation.x = 0.2; }

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  addOutline(g);
  g.userData = { legL, legR, armR, armL, head: headG, torso, core, blade, cape: capeG, glow };
  return g;
}

// ---- 三种预设 ----
export const buildHero  = () => buildCharacter({ skin: 0xf0d2a8, armor: COLORS.player, glow: COLORS.playerGlow, cape: 0x2747c8, weapon: 'sword', trim: 0x20283f });
export const buildImp   = () => buildCharacter({ skin: 0xb83a2a, armor: 0x3a1410, glow: COLORS.minionGlow, eyeColor: 0xffd633, horns: true, ears: true, hunch: true, weapon: 'claw', trim: 0x25100c });
export const buildDemon = () => buildCharacter({ skin: 0x5a2a7a, armor: 0x281338, glow: COLORS.bossGlow, eyeColor: 0xff3030, cape: 0x3a1052, horns: true, weapon: 'greatsword', trim: 0x18091f });
export const buildCaster = () => buildCharacter({ skin: 0x3a6a44, armor: 0x16301c, glow: COLORS.casterGlow, eyeColor: 0xd0ff90, ears: true, hunch: true, weapon: 'none', cape: 0x1a3a22, trim: 0x0e2012 });
export const buildDasher = () => buildCharacter({ skin: 0x244a52, armor: 0x0e2228, glow: COLORS.dasherGlow, eyeColor: 0xbafcff, ears: true, weapon: 'claw', trim: 0x081418 });
export const buildBrute  = () => buildCharacter({ skin: 0x6b6b73, armor: COLORS.brute, glow: COLORS.bruteGlow, eyeColor: 0xffb060, horns: true, weapon: 'greatsword', trim: 0x1a1a20 });

// ---- 头顶血条（billboard）----
export function buildHealthBar(width = 1, y = 2.5) {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.13), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthTest: false }));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.13), new THREE.MeshBasicMaterial({ color: 0xff5252, depthTest: false }));
  fill.position.z = 0.001;
  g.add(bg, fill);
  g.position.y = y; g.renderOrder = 999;
  g.userData = { fill, width };
  return g;
}
export function setBar(bar, ratio) {
  ratio = Math.max(0, ratio);
  bar.userData.fill.scale.x = ratio;
  bar.userData.fill.position.x = -(1 - ratio) * bar.userData.width / 2;
}

// ---- 受击闪光 / 出招染色（作用于有 emissive 的卡通材质）----
export function flash(group, color = 0xff3030) {
  const fresh = !(group.userData._flash > 0);   // 仅在“不处于闪光中”时重缓存当前 emissive（含 tintArm 染色），复原才不会串成残留色
  group.traverse(o => {
    if (o.isMesh && o.material.emissive) {
      if (fresh) { o.userData._e = o.material.emissive.getHex(); o.userData._ei = o.material.emissiveIntensity; }
      o.material.emissive.setHex(color); o.material.emissiveIntensity = 1.6;
    }
  });
  group.userData._flash = 0.1;
}
export function updateFlash(group, dt) {
  if (group.userData._flash > 0) {
    group.userData._flash -= dt;
    if (group.userData._flash <= 0)
      group.traverse(o => { if (o.isMesh && o.userData._e != null) { o.material.emissive.setHex(o.userData._e); o.material.emissiveIntensity = o.userData._ei; } });
  }
}
export function tintArm(g, color) {
  g.userData.armR.traverse(o => {
    if (o.isMesh && o.material.emissive) {
      if (color == null) { o.material.emissive.setHex(o.userData._te ?? 0x000000); o.material.emissiveIntensity = o.userData._tei ?? 1; }
      else { o.userData._te ??= o.material.emissive.getHex(); o.userData._tei ??= o.material.emissiveIntensity; o.material.emissive.setHex(color); o.material.emissiveIntensity = 1.7; }
    }
  });
}
