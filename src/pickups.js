// =============================================================
//  pickups.js — 掉落物：血球 / 影能球，靠近吸附、接触吸收
// =============================================================
import * as THREE from 'three';
import { scene } from './scene.js';
import { spawnBurst } from './effects.js';
import { ENERGY_MAX, PICKUP } from './config.js';
import { player } from './player.js';
import { sfx } from './audio.js';

const orbs = [];

export function spawnPickup(x, z, type) {        // type: 'hp' | 'energy'
  const color = type === 'hp' ? 0x69ff9c : 0x5bd0ff;
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshBasicMaterial({ color }));
  mesh.material.color.multiplyScalar(1.6);       // 推 HDR → Bloom 发光
  mesh.position.set(x, 0.8, z);
  scene.add(mesh);
  orbs.push({ mesh, x, z, y: 0.8, type, color, t: 0, life: 12 });
}

export function updatePickups(dt) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const p = orbs[i];
    p.t += dt; p.life -= dt;
    p.mesh.rotation.y += dt * 2.5;
    p.mesh.position.y = 0.8 + Math.sin(p.t * 3) * 0.15;

    const dx = player.mesh.position.x - p.x, dz = player.mesh.position.z - p.z;
    const d = Math.hypot(dx, dz) || 1e-6;
    if (d < 3.5) {                               // 靠近吸附
      const pull = (1 - d / 3.5) * 14 * dt;
      p.x += dx / d * pull; p.z += dz / d * pull;
      p.mesh.position.x = p.x; p.mesh.position.z = p.z;
    }

    let done = p.life <= 0;
    if (d < 0.9 && player.state !== 'dead') {     // 接触吸收
      if (p.type === 'hp') player.hp = Math.min(player.maxHp, player.hp + PICKUP.hp);
      else player.energy = Math.min(ENERGY_MAX, player.energy + PICKUP.energy);
      spawnBurst(p.x, p.y, p.z, { count: 12, color: p.color, speed: 4, size: 0.4, life: 0.4, gravity: -1, up: 2 });
      sfx.pickup(); done = true;
    }
    if (done) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); orbs.splice(i, 1); }
  }
}
