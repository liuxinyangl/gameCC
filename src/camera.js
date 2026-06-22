// =============================================================
//  camera.js — 第三人称跟随 / 锁定 / 屏震 / FOV 冲击 / 锁定标记
// =============================================================
import * as THREE from 'three';
import { scene, camera } from './scene.js';
import { state, look } from './state.js';
import { player } from './player.js';
import { lerpAngle, lerp, damp, clamp } from './util.js';

const camTarget = new THREE.Vector3();
const tmp = new THREE.Vector3();

export function updateCamera(dt) {
  const lt = state.lockTarget;
  const locked = lt && lt.state !== 'dead' && lt.state !== 'gone';

  // 锁定：yaw 自动指向目标
  if (locked) {
    tmp.copy(lt.mesh.position).sub(player.mesh.position); tmp.y = 0;
    look.yaw = lerpAngle(look.yaw, Math.atan2(-tmp.x, -tmp.z), damp(dt, 0.12));
    look.pitch = lerp(look.pitch, 0.32, damp(dt, 0.08));
  }

  // FOV 平滑（冲刺/大招会临时拉高 fovTarget）
  look.fov = lerp(look.fov, look.fovTarget, damp(dt, 0.12));
  if (Math.abs(camera.fov - look.fov) > 0.01) { camera.fov = look.fov; camera.updateProjectionMatrix(); }

  camTarget.copy(player.mesh.position); camTarget.y += 1.5;
  const dist = locked ? 8 : 7;
  const offset = new THREE.Vector3(
    Math.sin(look.yaw) * Math.cos(look.pitch),
    Math.sin(look.pitch),
    Math.cos(look.yaw) * Math.cos(look.pitch)
  ).multiplyScalar(dist);
  const desired = camTarget.clone().add(offset);
  camera.position.lerp(desired, damp(dt, 0.18));

  if (state.shake > 0) {
    state.shake = Math.max(0, state.shake - dt * 2.2);
    const s = state.shake;
    camera.position.x += Math.sin(performance.now() * 0.05) * s * 0.5;
    camera.position.y += Math.cos(performance.now() * 0.07) * s * 0.5;
  }

  if (locked) {
    const mid = camTarget.clone().lerp(lt.mesh.position.clone().setY(1.2), 0.35);
    camera.lookAt(mid);
  } else camera.lookAt(camTarget);
}

// 锁定标记（billboard 旋转小环）
const lockMark = new THREE.Mesh(
  new THREE.RingGeometry(0.16, 0.26, 3),
  new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false, blending: THREE.AdditiveBlending })
);
lockMark.renderOrder = 1000; lockMark.visible = false;
scene.add(lockMark);
export function updateLockMark(dt) {
  const lt = state.lockTarget;
  if (lt && lt.state !== 'dead' && lt.state !== 'gone') {
    lockMark.visible = true;
    lockMark.position.copy(lt.mesh.position);
    lockMark.position.y = lt.isBoss ? 4.6 : 2.8;
    lockMark.quaternion.copy(camera.quaternion);
    lockMark.rotation.z += dt * 2;
  } else lockMark.visible = false;
}
