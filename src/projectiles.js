// =============================================================
//  projectiles.js — 敌方弹幕：直线飞行、可被弹反打回（变己方反伤敌人）
// =============================================================
import * as THREE from 'three';
import { scene } from './scene.js';
import { spawnBurst } from './effects.js';
import { ARENA, PROJ } from './config.js';
import { player, hitPlayer, parryActive, parryReward } from './player.js';
import { enemies, damageEnemy } from './enemies.js';
import { sfx } from './audio.js';

const projectiles = [];
const _hitDir = new THREE.Vector3();

// 供边缘危险指示读取（只读，不持有）
export function activeProjectiles() { return projectiles; }

// 波次结束时清场：避免飞行中的弹幕被强化菜单冻住、下一波又复活伤人
export function clearProjectiles() {
  for (const p of projectiles) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
  projectiles.length = 0;
}

export function spawnProjectile(x, y, z, dx, dz, color = 0x7cff4d) {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(PROJ.radius, 0),
    new THREE.MeshBasicMaterial({ color })
  );
  mesh.material.color.multiplyScalar(1.7);            // 推 HDR，让 Bloom 接住
  mesh.position.set(x, y, z);
  scene.add(mesh);
  projectiles.push({ mesh, x, y, z, dx, dz, color, speed: PROJ.speed, life: PROJ.life, friendly: false, trailT: 0 });
}

// 弹反：调头朝最近敌人、加速、变为己方弹
function reflect(p) {
  let best = null, bd = Infinity;
  for (const e of enemies) {
    if (e.state === 'dead' || e.state === 'gone' || e.state === 'intro') continue;
    const d = (e.mesh.position.x - p.x) ** 2 + (e.mesh.position.z - p.z) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  if (best) {
    const dx = best.mesh.position.x - p.x, dz = best.mesh.position.z - p.z;
    const len = Math.hypot(dx, dz) || 1;
    p.dx = dx / len; p.dz = dz / len;
  } else { p.dx = -p.dx; p.dz = -p.dz; }
  p.friendly = true; p.speed = PROJ.reflectSpeed; p.life = 3.0;
  p.mesh.material.color.set(0x9fd8ff).multiplyScalar(1.9);
}

export function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.dx * p.speed * dt;
    p.z += p.dz * p.speed * dt;
    p.mesh.position.set(p.x, p.y, p.z);
    p.mesh.rotation.x += dt * 8; p.mesh.rotation.y += dt * 6;
    p.life -= dt;

    p.trailT += dt;                                   // 余焰拖尾
    if (p.trailT > 0.04) { p.trailT = 0; spawnBurst(p.x, p.y, p.z, { count: 1, color: p.friendly ? 0x9fd8ff : p.color, speed: 0.4, size: 0.22, life: 0.3, gravity: 0 }); }

    let done = p.life <= 0 || Math.hypot(p.x, p.z) > ARENA;

    if (!done && !p.friendly) {                       // 敌方弹 → 打玩家
      const d = Math.hypot(p.x - player.mesh.position.x, p.z - player.mesh.position.z);
      if (d < PROJ.radius + player.radius) {
        if (parryActive()) {
          reflect(p); parryReward();                  // 弹反成功：打回去 + 弹反奖励反馈
        } else {
          if (player.invuln <= 0 && player.state !== 'dead') { _hitDir.set(p.dx, 0, p.dz); hitPlayer(PROJ.dmg, _hitDir); }
          spawnBurst(p.x, p.y, p.z, { count: 12, color: p.color, speed: 6, size: 0.4, life: 0.4 });
          done = true;
        }
      }
    } else if (!done && p.friendly) {                 // 弹反后的己方弹 → 打敌人
      for (const e of enemies) {
        if (e.state === 'dead' || e.state === 'gone' || e.state === 'intro') continue;
        const tp = e.mesh.position;
        if (Math.hypot(p.x - tp.x, p.z - tp.z) < PROJ.radius + e.radius) {
          damageEnemy(e, PROJ.reflectDmg, p.dx, p.dz, 6, { kind: 'crit', sound: 'hit' });
          spawnBurst(p.x, p.y, p.z, { count: 14, color: 0x9fd8ff, speed: 7, size: 0.45, life: 0.4 });
          done = true; break;
        }
      }
    }

    if (done) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); projectiles.splice(i, 1); }
  }
}
