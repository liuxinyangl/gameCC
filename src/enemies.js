// =============================================================
//  enemies.js — 杂兵 + Boss：AI、招式组合、破势、伤害结算与死亡特效
// =============================================================
import * as THREE from 'three';
import { scene, camera, pulseBloom } from './scene.js';
import { buildImp, buildDemon, flash, updateFlash, tintArm, buildHealthBar, setBar } from './models.js';
import { resolveCollisions } from './world.js';
import { spawnShockwave, spawnBurst, spawnDamageNumber } from './effects.js';
import { lerpAngle } from './util.js';
import { state, addShake, hitStop } from './state.js';
import { player, hitPlayer, parryActive, parrySuccess } from './player.js';
import { toast, banner, showBossUI, hideBossUI, updateBossBar, showEnd, flashScreen } from './hud.js';
import { sfx } from './audio.js';
import {
  MINION_HP, M_DETECT, M_ATK_RANGE, M_SPEED, M_WINDUP, M_STRIKE, M_RECOVER, M_DMG,
  BOSS_HP, BOSS_MAX_POSTURE, BOSS_MOVES, BOSS_SPEED, BOSS_ENGAGE, BOSS_STAGGER_DUR,
  POSTURE_REGEN, BOSS_COMBOS, BOSS_COMBOS_P2, COLORS,
} from './config.js';

export const enemies = [];
let boss = null;
const tmp = new THREE.Vector3();
const tmpN = new THREE.Vector3();   // 归一化方向复用（避免热循环每帧 clone）

export function spawnMinion(x, z) {
  const e = {
    mesh: buildImp(),
    bar: buildHealthBar(1.1, 2.7),
    glowColor: COLORS.minionGlow,
    hp: MINION_HP, maxHp: MINION_HP,
    heading: 0, state: 'idle', timer: 0,
    vel: new THREE.Vector3(), radius: 0.5, deadTime: 0, isBoss: false,
  };
  e.mesh.scale.setScalar(0.88);          // 小恶魔体型偏小
  e.mesh.position.set(x, 0, z);
  e.mesh.add(e.bar);
  scene.add(e.mesh);
  enemies.push(e);
}

export function spawnBoss() {
  const mesh = buildDemon();
  mesh.scale.setScalar(2.0);
  // 悬浮能量光环
  const aura = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.05, 8, 40),
    new THREE.MeshBasicMaterial({ color: COLORS.bossGlow, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  aura.rotation.x = Math.PI / 2; aura.position.y = 1.1; mesh.add(aura);
  mesh.position.set(0, 0, -16);
  scene.add(mesh);

  boss = {
    mesh, aura, glowColor: COLORS.bossGlow,
    hp: BOSS_HP, maxHp: BOSS_HP, posture: 0, maxPosture: BOSS_MAX_POSTURE,
    heading: 0, state: 'intro', timer: 0, introTime: 0,
    move: null, queue: [], moveDir: new THREE.Vector3(), didHit: false,
    vel: new THREE.Vector3(), radius: 1.1, deadTime: 0, phase2: false, isBoss: true,
  };
  enemies.push(boss);
  showBossUI();
  banner('暗 影 督 军', '试炼最终守关者', 2.2);
  sfx.roar(); addShake(0.5);
}

export const aliveEnemies = () => enemies.filter(e => e.state !== 'dead' && e.state !== 'gone');
// 存活杂兵数（每帧被 main/hud 调用，用计数循环避免 filter 建数组）
export function countAliveMinions() {
  let n = 0;
  for (const e of enemies) if (!e.isBoss && e.state !== 'dead' && e.state !== 'gone') n++;
  return n;
}

// 对敌人造成伤害（含全套打击反馈）。返回是否生效。
export function damageEnemy(e, dmg, dx, dz, knock, opts = {}) {
  if (e.state === 'dead' || e.state === 'gone' || e.state === 'intro') return false;
  let kind = opts.kind || 'normal';
  if (e.isBoss && e.state === 'staggered') { dmg *= 2; kind = 'crit'; }   // 破势处决：双倍
  e.hp -= dmg;
  e.vel.set(dx, 0, dz).multiplyScalar(knock);
  flash(e.mesh);
  addShake(0.18); hitStop(opts.hitStop || 0.04);
  const hy = e.isBoss ? 3.4 : 1.7;
  spawnBurst(e.mesh.position.x, hy * 0.6, e.mesh.position.z, { count: kind === 'crit' ? 22 : 12, color: e.glowColor, speed: 7, size: 0.45, life: 0.4, gravity: 6 });
  spawnDamageNumber(e.mesh.position.x, hy, e.mesh.position.z, dmg, kind);
  (sfx[opts.sound] || sfx.hit)();
  if (e.isBoss) sfx.bossHit();
  if (e.hp <= 0) { killEnemy(e); return true; }
  if (opts.stagger) {
    if (!e.isBoss && (e.state === 'windup' || e.state === 'chase')) { e.state = 'recover'; e.timer = 0; tintArm(e.mesh, null); }
    else if (e.isBoss && e.state === 'windup') { e.state = 'recover'; e.timer = 0; tintArm(e.mesh, null); }
  }
  return true;
}

export function killEnemy(e) {
  if (e.state === 'dead') return;
  e.state = 'dead'; e.deadTime = 0;
  if (e.bar) e.bar.visible = false;
  if (e === state.lockTarget) state.lockTarget = null;
  spawnBurst(e.mesh.position.x, e.isBoss ? 2.4 : 1.4, e.mesh.position.z,
    { count: e.isBoss ? 70 : 26, color: e.glowColor, speed: e.isBoss ? 11 : 7, size: e.isBoss ? 0.8 : 0.5, life: 0.8, gravity: 4 });
  if (e.isBoss) { hideBossUI(); addShake(0.7); pulseBloom(2.2); sfx.exec(); }
}

// ---------- 杂兵 AI ----------
export function updateMinion(e, dt) {
  if (e.state === 'dead') {
    e.deadTime += dt;
    e.mesh.rotation.x = Math.min(e.deadTime * 4, Math.PI / 2);
    e.mesh.position.y = -e.deadTime * 0.6;
    if (e.deadTime > 1.4) { scene.remove(e.mesh); e.state = 'gone'; }
    return;
  }
  if (e.state === 'gone') return;

  e.mesh.position.addScaledVector(e.vel, dt);
  e.vel.multiplyScalar(0.82);

  tmp.copy(player.mesh.position).sub(e.mesh.position); tmp.y = 0;
  const dist = tmp.length();
  const toP = tmpN.copy(tmp).normalize();
  e.heading = Math.atan2(toP.x, toP.z);
  e.mesh.rotation.y = lerpAngle(e.mesh.rotation.y, e.heading, 0.12);

  const ud = e.mesh.userData;
  e.timer += dt;
  switch (e.state) {
    case 'idle':
    case 'chase':
      if (player.state === 'dead') { e.state = 'idle'; ud.legL.rotation.x = ud.legR.rotation.x = 0; break; }
      if (dist < M_ATK_RANGE) { e.state = 'windup'; e.timer = 0; }
      else if (dist < M_DETECT) {
        e.state = 'chase';
        e.mesh.position.addScaledVector(toP, M_SPEED * dt);
        const sw = Math.sin(performance.now() * 0.012 + e.mesh.id) * 0.6;
        ud.legL.rotation.x = sw; ud.legR.rotation.x = -sw;
      } else { e.state = 'idle'; ud.legL.rotation.x = ud.legR.rotation.x = 0; }
      break;
    case 'windup':
      ud.armR.rotation.x = -2.4 * (e.timer / M_WINDUP);
      tintArm(e.mesh, 0xff8800);
      if (e.timer >= M_WINDUP) { e.state = 'strike'; e.timer = 0; }
      break;
    case 'strike':
      ud.armR.rotation.x = -2.4 + (e.timer / M_STRIKE) * 3.6;
      if (e.timer >= M_STRIKE) {
        if (dist < M_ATK_RANGE + 0.5 && player.state !== 'dead') {
          if (parryActive()) parrySuccess(e);
          else if (player.invuln <= 0) hitPlayer(M_DMG, toP);
        }
        if (e.state === 'strike') { e.state = 'recover'; e.timer = 0; tintArm(e.mesh, null); }
      }
      break;
    case 'recover':
      ud.armR.rotation.x = lerpAngle(ud.armR.rotation.x, 0, 0.15);
      if (e.timer >= M_RECOVER) e.state = 'chase';
      break;
  }

  resolveCollisions(e.mesh.position, e.radius);
  setBar(e.bar, e.hp / e.maxHp);
  e.bar.quaternion.copy(camera.quaternion);
  updateFlash(e.mesh, dt);
}

// ---------- Boss AI ----------
function chooseBossMove(b, dist) {
  b.mesh.userData.legL.rotation.x = b.mesh.userData.legR.rotation.x = 0;
  const comboChance = b.phase2 ? 0.6 : 0.32;
  if (Math.random() < comboChance) {
    const pool = b.phase2 ? BOSS_COMBOS_P2 : BOSS_COMBOS;
    b.queue = [...pool[Math.floor(Math.random() * pool.length)]];
  } else {
    const r = Math.random();
    let name;
    if (dist > 3.6) name = r < 0.6 ? 'charge' : 'sweep';
    else name = r < 0.5 ? 'slam' : (r < 0.8 ? 'sweep' : 'charge');
    b.queue = [name];
  }
  startBossMove(b, b.queue.shift());
}
function startBossMove(b, name) { b.move = { ...BOSS_MOVES[name], _name: name }; b.state = 'windup'; b.timer = 0; }

export function staggerBoss(b) {
  b.state = 'staggered'; b.timer = 0; b.posture = 0; b.queue = [];
  tintArm(b.mesh, null);
  banner('破 势！', '趁机重击处决（双倍伤害）', 1.4);
  addShake(0.5); pulseBloom(1.8);
}

function bossTryHit(b, m) {
  // 用命中瞬间的实时位置重算：冲刺在 active 期间会位移，帧首的 dist/toP 已过期
  tmp.copy(player.mesh.position).sub(b.mesh.position); tmp.y = 0;
  const d = tmp.length();
  const toP = tmpN.copy(tmp).normalize();
  const within = d < m.range + player.radius;
  let inArc = true;
  if (m._name !== 'slam') {                       // charge 用提交时的 heading（已锁定方向）
    const fx = Math.sin(b.heading), fz = Math.cos(b.heading);
    inArc = (toP.x * fx + toP.z * fz) >= Math.cos(m.arc);
  }
  if (within && inArc && player.state !== 'dead') {
    if (parryActive()) { parrySuccess(b); return; }
    if (player.invuln <= 0) hitPlayer(b.phase2 ? Math.round(m.dmg * 1.15) : m.dmg, toP);
  }
}

export function updateBoss(b, dt) {
  if (b.aura) { b.aura.rotation.z += dt * 1.5; b.aura.scale.setScalar(1 + Math.sin(performance.now() * 0.004) * 0.12); }
  if (b.mesh.userData.cape) b.mesh.userData.cape.rotation.x = 0.18 + Math.sin(performance.now() * 0.003) * 0.08;

  if (b.state === 'dead') {
    b.deadTime += dt;
    b.mesh.rotation.x = Math.min(b.deadTime * 2, Math.PI / 2);
    b.mesh.position.y = -b.deadTime * 0.5;
    if (b.deadTime > 2.2 && !state.ended) showEnd(true);
    return;
  }
  if (b.state === 'intro') {
    b.introTime += dt;
    if (b.introTime > 1.6) { b.state = 'chase'; b.timer = 0; }
    return;
  }

  b.mesh.position.addScaledVector(b.vel, dt);
  b.vel.multiplyScalar(0.85);

  tmp.copy(player.mesh.position).sub(b.mesh.position); tmp.y = 0;
  const dist = tmp.length();
  const toP = tmpN.copy(tmp).normalize();
  b.heading = Math.atan2(toP.x, toP.z);
  if (b.state !== 'active' && b.state !== 'staggered') b.mesh.rotation.y = lerpAngle(b.mesh.rotation.y, b.heading, 0.07);
  if (b.state !== 'staggered') b.posture = Math.max(0, b.posture - POSTURE_REGEN * dt);

  // 二阶段
  if (!b.phase2 && b.hp <= b.maxHp * 0.5) {
    b.phase2 = true; b.glowColor = COLORS.bossRage;
    b.mesh.userData.torso.material.emissive.setHex(0x550011);
    if (b.aura) b.aura.material.color.setHex(COLORS.bossRage);
    banner('狂 暴 之 影', '督军进入二阶段：连段更猛', 1.8);
    sfx.roar(); addShake(0.6); pulseBloom(2.0); flashScreen('#ff2244', 0.45);
    spawnShockwave(b.mesh.position.x, b.mesh.position.z, 6, COLORS.bossRage);
  }
  const spd = b.phase2 ? 1.35 : 1;

  const ud = b.mesh.userData;
  b.timer += dt;
  switch (b.state) {
    case 'chase':
      if (player.state === 'dead') break;
      if (dist <= BOSS_ENGAGE) chooseBossMove(b, dist);
      else {
        b.mesh.position.addScaledVector(toP, BOSS_SPEED * spd * dt);
        const sw = Math.sin(performance.now() * 0.008) * 0.5;
        ud.legL.rotation.x = sw; ud.legR.rotation.x = -sw;
      }
      break;
    case 'windup': {
      const m = b.move, p = b.timer / (m.windup / spd);
      tintArm(b.mesh, b.phase2 ? 0xff0044 : 0xff8800);
      if (m._name === 'slam') ud.armR.rotation.x = -2.9 * p;
      if (m._name === 'sweep') { ud.armR.rotation.x = -1.4; ud.armR.rotation.z = -1.6 * p; }
      if (m._name === 'charge') { ud.armR.rotation.x = -1.2 * p; b.moveDir.copy(toP); }
      if (b.timer >= m.windup / spd) { b.state = 'active'; b.timer = 0; b.didHit = false; if (m._name === 'slam') ud.armR.rotation.x = -2.9; }
      break;
    }
    case 'active': {
      const m = b.move;
      if (m._name === 'charge') {
        b.mesh.position.addScaledVector(b.moveDir, m.lunge * dt);
        ud.armR.rotation.x = -1.2 + (b.timer / m.active) * 2.2;
        spawnBurst(b.mesh.position.x, 1.0, b.mesh.position.z, { count: 2, color: b.glowColor, speed: 1, size: 0.5, life: 0.3 });
      } else if (m._name === 'slam') {
        ud.armR.rotation.x = -2.9 + (b.timer / m.active) * 4.0;
        if (!b.didHit && b.timer > m.active * 0.5) {
          spawnShockwave(b.mesh.position.x, b.mesh.position.z, m.range * 1.5, b.phase2 ? 0xff0044 : 0xff6622);
          spawnBurst(b.mesh.position.x, 0.4, b.mesh.position.z, { count: 30, color: b.phase2 ? 0xff0044 : 0xff8844, speed: 9, size: 0.6, life: 0.5, up: 2 });
          addShake(0.4);
        }
      } else if (m._name === 'sweep') {
        ud.armR.rotation.z = -1.6 + (b.timer / m.active) * 3.2;
      }
      if (!b.didHit && b.timer > m.active * 0.5) { b.didHit = true; bossTryHit(b, m); }
      if (b.state === 'active' && b.timer >= m.active) { b.state = 'recover'; b.timer = 0; tintArm(b.mesh, null); }
      break;
    }
    case 'recover': {
      ud.armR.rotation.x = lerpAngle(ud.armR.rotation.x, 0, 0.12);
      ud.armR.rotation.z = lerpAngle(ud.armR.rotation.z, 0, 0.12);
      const gap = (b.queue.length ? b.move.recover * 0.35 : b.move.recover) / spd;
      if (b.timer >= gap) { if (b.queue.length) startBossMove(b, b.queue.shift()); else b.state = 'chase'; }
      break;
    }
    case 'staggered':
      ud.armR.rotation.x = lerpAngle(ud.armR.rotation.x, 0.3, 0.1);
      ud.armR.rotation.z = lerpAngle(ud.armR.rotation.z, 0, 0.1);
      ud.torso.rotation.x = 0.5; ud.legL.rotation.x = 0.3; ud.legR.rotation.x = -0.2;
      if (b.timer >= BOSS_STAGGER_DUR) { b.state = 'chase'; b.timer = 0; ud.torso.rotation.x = 0; }
      break;
  }

  resolveCollisions(b.mesh.position, b.radius);
  updateBossBar(b.hp / b.maxHp, b.posture / b.maxPosture, b.state === 'staggered');
  updateFlash(b.mesh, dt);
}
