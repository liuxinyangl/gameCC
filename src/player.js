// =============================================================
//  player.js — 玩家：移动/连招/重击/翻滚/弹反/回血/大招 + 打击反馈
//  （与 enemies.js 互相引用，仅在函数内运行时使用，无顶层依赖问题）
// =============================================================
import * as THREE from 'three';
import { scene, pulseBloom } from './scene.js';
import { buildHero, flash, updateFlash, tintArm } from './models.js';
import { resolveCollisions } from './world.js';
import { spawnSlash, spawnAfterimage, spawnBurst, spawnShockwave } from './effects.js';
import { lerpAngle } from './util.js';
import { state, look, addShake, hitStop, slowmo } from './state.js';
import { locked, keys } from './input.js';
import { enemies, damageEnemy, staggerBoss } from './enemies.js';
import { showEnd, flashScreen } from './hud.js';
import { sfx } from './audio.js';
import { addStyle, loseStyle, styleEnergyMult } from './style.js';
import {
  LIGHT_COMBO, LIGHT_RANGE, LIGHT_ARC, LIGHT_KNOCK, HEAVY,
  DODGE_DURATION, DODGE_IFRAME, DODGE_SPEED, DODGE_COST,
  MOVE_SPEED, SPRINT_SPEED, SPRINT_COST, HEAL_DURATION, HEAL_AMOUNT,
  PARRY, ENERGY_MAX, ENERGY_GAIN, ULT, HITSTOP, SLOWMO_PARRY, COLORS,
} from './config.js';

export const player = {
  mesh: buildHero(),
  hp: 100, maxHp: 100,
  sp: 100, maxSp: 100,
  energy: 0,
  flasks: 3,
  heading: 0,
  state: 'idle',                  // idle | attack | heavy | dodge | heal | parry | ult | dead
  vel: new THREE.Vector3(),
  atkStep: 0, atkTime: 0, atkQueued: false, atkHit: new Set(),
  dodgeTime: 0, invuln: 0, ghostT: 0,
  healTime: 0, parryTime: 0,
  ultTime: 0, ultTicks: new Set(),
  _sprinting: false,
  // 肉鸽强化累积（波间 3 选 1）
  lifesteal: 0, critChance: 0, critMult: 1.8, energyMul: 1, rangeMul: 1, dodgeEnergy: 0,
  radius: 0.5,
};
player.mesh.position.set(0, 0, 8);
scene.add(player.mesh);

const tmp = new THREE.Vector3();
const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _moveDir = new THREE.Vector3();
const gainEnergy = v => { player.energy = Math.min(ENERGY_MAX, player.energy + v * player.energyMul * styleEnergyMult()); };

// 由 yaw + WASD 得到世界移动方向（复用 scratch，调用方即用即弃，不跨调用持有）
export function moveDir() {
  _fwd.set(-Math.sin(look.yaw), 0, -Math.cos(look.yaw));
  _right.set(-_fwd.z, 0, _fwd.x);
  _moveDir.set(0, 0, 0);
  if (keys['KeyW']) _moveDir.add(_fwd);
  if (keys['KeyS']) _moveDir.sub(_fwd);
  if (keys['KeyD']) _moveDir.add(_right);
  if (keys['KeyA']) _moveDir.sub(_right);
  return _moveDir;
}
const busy = () => player.state === 'dodge' || player.state === 'heal' || player.state === 'ult';

// ---------- 动作触发 ----------
export function tryLightAttack() {
  if (!locked || player.state === 'dead' || busy()) return;
  if (player.state === 'attack' || player.state === 'heavy') {
    const cur = player.state === 'attack' ? LIGHT_COMBO[player.atkStep] : HEAVY;
    if (player.atkTime > cur.dur * 0.4) player.atkQueued = true;   // 输入缓冲
    return;
  }
  startLight(0);
}
function startLight(step) {
  player.state = 'attack'; player.atkStep = step; player.atkTime = 0;
  player.atkQueued = false; player.atkHit.clear();
  spawnSlash(player.mesh.position.x, 1.3, player.mesh.position.z, player.heading, COLORS.playerGlow, step === 2);
  sfx.swing();
}
export function tryHeavyAttack() {
  if (!locked || player.state === 'dead' || busy()) return;
  if (player.state === 'attack' || player.state === 'heavy' || player.state === 'parry') return;
  if (player.sp < HEAVY.cost) return;
  player.sp -= HEAVY.cost; player.state = 'heavy'; player.atkTime = 0; player.atkHit.clear();
  spawnSlash(player.mesh.position.x, 1.3, player.mesh.position.z, player.heading, 0xffaa33, true);
  sfx.swing();
}
export function tryDodge() {
  if (!locked || player.state === 'dead' || player.state === 'dodge' || player.state === 'ult') return;
  if (player.sp < DODGE_COST) return;
  player.sp -= DODGE_COST; player.state = 'dodge'; player.dodgeTime = 0; player.invuln = DODGE_IFRAME; player.ghostT = 0;
  const dir = moveDir();
  if (dir.lengthSq() < 0.01) dir.set(Math.sin(player.heading), 0, Math.cos(player.heading));
  player.vel.copy(dir.normalize().multiplyScalar(DODGE_SPEED));
  spawnAfterimage(player.mesh, COLORS.playerGlow); sfx.dodge();
  if (player.dodgeEnergy) gainEnergy(player.dodgeEnergy);   // 「疾影」强化：翻滚回能
}
export function tryHeal() {
  if (!locked || player.state === 'dead' || busy() || player.state === 'attack' || player.state === 'heavy' || player.state === 'parry') return;
  if (player.flasks <= 0 || player.hp >= player.maxHp) return;
  player.flasks--; player.state = 'heal'; player.healTime = 0; sfx.heal();
}
export function tryParry() {
  if (!locked || player.state === 'dead' || busy() || player.state === 'parry') return;
  if (player.sp < PARRY.cost) return;
  player.sp -= PARRY.cost; player.state = 'parry'; player.parryTime = 0;
}
export function tryUltimate() {
  if (!locked || player.state === 'dead' || busy() || player.state === 'attack' || player.state === 'heavy' || player.state === 'parry') return;
  if (player.energy < ULT.cost) return;
  player.energy = 0; player.state = 'ult'; player.ultTime = 0; player.ultTicks.clear();
  player.invuln = ULT.dur + 0.15; look.fovTarget = 72;
  sfx.ult(); addShake(0.5); pulseBloom(2.2); flashScreen('#7fe0ff', 0.5);
  spawnBurst(player.mesh.position.x, 1.0, player.mesh.position.z, { count: 50, color: 0x3bd0ff, speed: 6, size: 0.7, life: 0.7, gravity: -1, up: 3 });
}

export function parryActive() { return player.state === 'parry' && player.parryTime <= PARRY.window; }
// 弹反成功的通用反馈（玩家位置特效 + 子弹时间 + 攒耐力/影能）—— 近战与弹幕弹反共用
export function parryReward() {
  const sx = player.mesh.position.x + Math.sin(player.heading) * 1.0, sz = player.mesh.position.z + Math.cos(player.heading) * 1.0;
  spawnBurst(sx, 1.3, sz, { count: 26, color: 0xfff2a8, speed: 10, size: 0.5, life: 0.4, gravity: 2 });
  spawnSlash(player.mesh.position.x, 1.3, player.mesh.position.z, player.heading, 0xffffff, false);
  slowmo(SLOWMO_PARRY); addShake(0.4); sfx.parry(); pulseBloom(1.7); flashScreen('#ffffff', 0.32);
  player.sp = Math.min(player.maxSp, player.sp + 12); gainEnergy(ENERGY_GAIN.parry);
  addStyle(18);   // 弹反给大量风格分
}
// 被近战命中时若处于格挡窗口 → 弹反成功（破势 / 打断）
export function parrySuccess(e) {
  parryReward();
  if (e.isBoss) {
    e.posture = Math.min(e.maxPosture, e.posture + PARRY.posture);
    flash(e.mesh, 0xffffaa);
    if (e.posture >= e.maxPosture) staggerBoss(e);
  } else { e.state = 'recover'; e.timer = 0; tintArm(e.mesh, null); flash(e.mesh, 0xffffaa); }
}

// 玩家被命中
export function hitPlayer(dmg, fromDir) {
  player.hp -= dmg;
  player.vel.copy(fromDir).multiplyScalar(5).negate();
  if (player.state !== 'dodge' && player.state !== 'ult') {   // 打断攻击/重击/回血/格挡
    player.state = 'idle';
    const ud = player.mesh.userData;                          // 复位残留姿势（torso 在 idle 分支不会被归零）
    ud.torso.rotation.x = 0;
    ud.legL.rotation.x = ud.legR.rotation.x = 0;
  }
  flash(player.mesh, 0xff2020); addShake(0.34); hitStop(0.05); sfx.hurt(); loseStyle();
  spawnBurst(player.mesh.position.x, 1.2, player.mesh.position.z, { count: 10, color: 0xff3030, speed: 5, size: 0.4, life: 0.4 });
  gainEnergy(ENERGY_GAIN.hurt);
  if (player.hp <= 0) { player.hp = 0; player.state = 'dead'; showEnd(false); }
}

// 前方扇形命中
function meleeHit(range, arc, dmg, knock, stagger, energyType, fx) {
  const fxh = Math.sin(player.heading), fz = Math.cos(player.heading);
  for (const e of enemies) {
    if (e.state === 'dead' || e.state === 'gone' || e.state === 'intro' || player.atkHit.has(e)) continue;
    tmp.copy(e.mesh.position).sub(player.mesh.position); tmp.y = 0;
    const d = tmp.length();
    if (d > range + e.radius) continue;
    tmp.normalize();
    if (tmp.x * fxh + tmp.z * fz < Math.cos(arc)) continue;
    player.atkHit.add(e);
    let dmgOut = dmg; const opts = { stagger, ...fx };
    if (Math.random() < player.critChance) { dmgOut *= player.critMult; opts.kind = 'crit'; }   // 暴击
    if (damageEnemy(e, dmgOut, fxh, fz, knock, opts)) {
      gainEnergy(ENERGY_GAIN[energyType]);
      addStyle(energyType === 'heavy' ? 14 : 7);   // 风格：命中累积
      if (player.lifesteal > 0) player.hp = Math.min(player.maxHp, player.hp + dmgOut * player.lifesteal);   // 吸血
    }
  }
}
// 大招 360° 命中
function radialHit(range, dmg, knock) {
  for (const e of enemies) {
    if (e.state === 'dead' || e.state === 'gone' || e.state === 'intro') continue;
    tmp.copy(e.mesh.position).sub(player.mesh.position); tmp.y = 0;
    const d = tmp.length();
    if (d > range + e.radius) continue;
    const dx = d > 0.001 ? tmp.x / d : 0, dz = d > 0.001 ? tmp.z / d : 1;
    damageEnemy(e, dmg, dx, dz, knock, { hitStop: HITSTOP.ult, kind: 'crit', sound: 'exec' });
    addStyle(9);
  }
}

// =============================================================
//  每帧更新
// =============================================================
export function updatePlayer(dt, t) {
  const ud = player.mesh.userData;

  if (player.state === 'heal') {
    player.healTime += dt;
    ud.torso.rotation.x = 0.4 * Math.sin(player.healTime / HEAL_DURATION * Math.PI);
    if (player.healTime >= HEAL_DURATION) {
      player.hp = Math.min(player.maxHp, player.hp + HEAL_AMOUNT);
      spawnBurst(player.mesh.position.x, 1.2, player.mesh.position.z, { count: 18, color: 0x69ff9c, speed: 3, size: 0.45, life: 0.6, gravity: -2, up: 2 });
      player.state = 'idle'; ud.torso.rotation.x = 0;
    }
  }
  else if (player.state === 'parry') {
    player.parryTime += dt;
    const snap = Math.min(1, player.parryTime / 0.08);
    ud.armR.rotation.x = -1.5; ud.armR.rotation.z = 0.9 * snap;
    ud.legL.rotation.x = ud.legR.rotation.x = 0;
    if (player.parryTime >= PARRY.dur) { player.state = 'idle'; ud.armR.rotation.z = 0; }
  }
  else if (player.state === 'dodge') {
    player.dodgeTime += dt;
    player.mesh.position.addScaledVector(player.vel, dt);
    player.vel.multiplyScalar(0.86);
    ud.torso.rotation.x = Math.sin(player.dodgeTime / DODGE_DURATION * Math.PI) * 1.2;
    player.ghostT += dt;
    if (player.ghostT > 0.06) { player.ghostT = 0; spawnAfterimage(player.mesh, COLORS.playerGlow); }
    if (player.dodgeTime >= DODGE_DURATION) { player.state = 'idle'; ud.torso.rotation.x = 0; }
  }
  else if (player.state === 'ult') {
    player.ultTime += dt;
    player.mesh.rotation.y += dt * 18;             // 旋斩
    ud.armR.rotation.x = -1.4; ud.armR.rotation.z = 1.3;
    ULT.tickTimes.forEach((tt, i) => {
      if (!player.ultTicks.has(i) && player.ultTime >= tt) {
        player.ultTicks.add(i);
        radialHit(ULT.range, ULT.dmg, ULT.knock);
        spawnShockwave(player.mesh.position.x, player.mesh.position.z, ULT.range * 1.3, 0x3bd0ff);
        spawnBurst(player.mesh.position.x, 1.2, player.mesh.position.z, { count: 40, color: 0x3bd0ff, speed: 13, size: 0.6, life: 0.5, gravity: 3 });
        addShake(0.5); hitStop(HITSTOP.ult); pulseBloom(2.0);
      }
    });
    if (player.ultTime >= ULT.dur) { player.state = 'idle'; ud.armR.rotation.z = 0; look.fovTarget = 55; }
  }
  else {
    const dir = moveDir();
    const moving = dir.lengthSq() > 0.01;
    const attacking = player.state === 'attack' || player.state === 'heavy';
    const sprint = keys['ShiftLeft'] && moving && player.sp > 1 && !attacking;
    player._sprinting = sprint;
    let speed = sprint ? SPRINT_SPEED : MOVE_SPEED;
    if (attacking) speed *= 0.4;
    player._moving = moving;
    if (moving) {
      dir.normalize();
      player.mesh.position.addScaledVector(dir, speed * dt);
      if (!state.lockTarget) player.heading = Math.atan2(dir.x, dir.z);
      if (sprint) player.sp -= SPRINT_COST * dt;
      const sw = Math.sin(t * (sprint ? 16 : 11)) * 0.7;
      ud.legL.rotation.x = sw; ud.legR.rotation.x = -sw;
    } else { ud.legL.rotation.x = ud.legR.rotation.x = 0; }
  }

  // 锁定时面向目标（大招旋转时不打断）
  if (player.state !== 'ult') {
    if (state.lockTarget && state.lockTarget.state !== 'dead' && state.lockTarget.state !== 'gone') {
      tmp.copy(state.lockTarget.mesh.position).sub(player.mesh.position);
      player.heading = Math.atan2(tmp.x, tmp.z);
    } else if (state.lockTarget) state.lockTarget = null;
    player.mesh.rotation.y = lerpAngle(player.mesh.rotation.y, player.heading, 0.3);
  }

  // 轻击连段
  if (player.state === 'attack') {
    const c = LIGHT_COMBO[player.atkStep];
    player.atkTime += dt;
    const p = player.atkTime / c.dur;
    const amp = player.atkStep === 2 ? 3.8 : 3.2;
    ud.armR.rotation.x = -2.4 + Math.sin(Math.min(p, 1) * Math.PI) * amp;
    ud.armR.rotation.z = (player.atkStep === 1 ? -1 : 1) * Math.sin(Math.min(p, 1) * Math.PI) * 0.5;
    if (player.atkTime >= c.a0 && player.atkTime <= c.a1)
      meleeHit(LIGHT_RANGE * player.rangeMul, LIGHT_ARC, c.dmg, LIGHT_KNOCK, false, 'light', { hitStop: HITSTOP.light, sound: 'hit' });
    if (player.atkTime >= c.dur) {
      if (player.atkQueued && player.atkStep < LIGHT_COMBO.length - 1) startLight(player.atkStep + 1);
      else { player.state = 'idle'; ud.armR.rotation.x = ud.armR.rotation.z = 0; }
    }
  }
  else if (player.state === 'heavy') {
    player.atkTime += dt;
    const p = player.atkTime / HEAVY.dur;
    ud.armR.rotation.x = -2.8 + Math.pow(Math.min(p, 1), 2) * 5.0;
    if (player.atkTime >= HEAVY.a0 && player.atkTime <= HEAVY.a1)
      meleeHit(HEAVY.range * player.rangeMul, HEAVY.arc, HEAVY.dmg, HEAVY.knock, true, 'heavy', { hitStop: HITSTOP.heavy, kind: 'heavy', sound: 'heavyHit' });
    if (player.atkTime >= HEAVY.dur) { player.state = 'idle'; ud.armR.rotation.x = 0; }
  }
  else if (player.state !== 'dodge' && player.state !== 'parry' && player.state !== 'ult') {
    ud.armR.rotation.x = lerpAngle(ud.armR.rotation.x, 0, 0.2);
    ud.armR.rotation.z = lerpAngle(ud.armR.rotation.z, 0, 0.2);
  }

  resolveCollisions(player.mesh.position, player.radius);

  if (player.state !== 'dodge' && !(keys['ShiftLeft'] && moveDir().lengthSq() > 0.01))
    player.sp = Math.min(player.maxSp, player.sp + 28 * dt);
  player.invuln = Math.max(0, player.invuln - dt);

  look.fovTarget = player.state === 'ult' ? 72 : (player._sprinting ? 62 : 55);
  if (ud.cape) ud.cape.rotation.x = 0.16 + ((player._moving || player.state === 'dodge') ? 0.32 : 0.06) + Math.sin(t * 9) * 0.05;
  updateFlash(player.mesh, dt);
}
