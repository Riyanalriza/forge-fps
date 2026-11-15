// Player movement: accel/decel, sprint (9), crouch (0.5x), prone, slide,
// parkour vault, jump, AABB collision. Scratch vectors only.
import * as THREE from 'three';

const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const R = 0.42; // player radius

export function createPlayer(world, S) {
  const p = S.player;
  function look(dx, dy) {
    p.yaw -= dx * 0.0022;
    p.pitch -= dy * 0.0022;
    p.pitch = Math.max(-1.5, Math.min(1.5, p.pitch));
  }
  function step(dt, keys, ads) {
    const wasC = !!p._cPrev, wasSpace = !!p._spacePrev;
    const crouchKey = keys.has('KeyC');
    const proneKey = keys.has('KeyZ');
    // Knock (BR, v18.8.7) and swimming (v18.8.6) change movement wholesale.
    const knocked = !!p.knocked;
    const inPool = world.inPool ? world.inPool(p.x, p.z) : false;
    S.swimming = inPool;
    p.vaultT = Math.max(0, (p.vaultT || 0) - dt);
    S.mudT = Math.max(0, (S.mudT || 0) - dt);
    // Stamina (v22.2.3): sprinting drains 20/s; empty = winded 2s at 70%
    // speed and no sprint. Regenerates 15/s while not sprinting.
    if (S.stamina == null) S.stamina = 100;
    S.windT = Math.max(0, (S.windT || 0) - dt);
    const sprinting = keys.has('ShiftLeft') && !crouchKey && !proneKey && keys.has('KeyW') && !knocked && S.windT <= 0;
    if (sprinting) {
      S.stamina -= 20 * dt;
      if (S.stamina <= 0) { S.stamina = 0; S.windT = 2; }
    } else {
      S.stamina = Math.min(100, S.stamina + 15 * dt);
    }
    // Dolphin Dive (v22.2.5): C in mid-air dives forward and down.
    if (!p.onGround && crouchKey && !wasC && !p.diving && p.vy < 2 && !knocked) {
      p.diving = true;
      p.vy = -8;
      const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
      p.vx += -sin * 8; p.vz += -cos * 8;
      S.diveT = 0.6;
    }
    S.diveT = Math.max(0, (S.diveT || 0) - dt);
    // Slide: sprint (Shift+W) then tap C — 0.6s fast forward slide, eye 0.9.
    // (sprinting excludes crouchKey, so the tap is checked against the raw
    // sprint keys — otherwise the slide could never trigger.)
    const sprintKeys = keys.has('ShiftLeft') && !proneKey && keys.has('KeyW');
    if (sprintKeys && crouchKey && !wasC && p.onGround && !p.sliding && !knocked) {
      p.sliding = true; p.slideT = 0.6;
    }
    if (p.sliding) {
      p.slideT -= dt;
      if (p.slideT <= 0) { p.sliding = false; }
    }
    p.prone = proneKey && !p.sliding;
    p.crouched = (crouchKey || p.sliding) && !p.prone;
    let targetEye = p.prone ? 0.6 : p.sliding ? 0.9 : p.crouched ? 1.1 : 1.62;
    if (knocked) targetEye = 0.5; // crawling on the ground
    if (inPool) targetEye = 0.9; // head just above the water
    if (S.diving) targetEye = 0.4; // head under water while diving (v22.2.6)
    // Climbing stairs (v18.9.25): eye lerps slower while the floor rises.
    const climbing = p.onGround && p.moving && p.y > (p._prevY || p.y) + 0.001;
    p.climbing = climbing;
    p.eye += (targetEye - p.eye) * Math.min(1, dt * (climbing ? 4 : 10));
    p._prevY = p.y;
    const sprint = sprinting && !p.sliding;
    // Tactical Sprint (v23.0.7): 1s of sustained sprint → 10.5 speed,
    // gun lowered (S.tacSprint read by the viewmodel in weapon.js).
    S.sprintT = sprinting ? (S.sprintT || 0) + dt : 0;
    S.tacSprint = sprinting && (S.sprintT || 0) > 1;
    // Speeds: normal 6, sprint 9 (tac sprint 10.5), crouch 0.5x (3.0),
    // prone crawl 2.1, slide keeps momentum. Knocked crawl 1.0, swimming
    // 0.6x. Winded (v22.2.3) = 0.7x. Mud (v19.2.14) = 0.8x.
    // Freeze (v27.0 playEffect) = 0.5x. Horse mount (v27.0.3) = 1.6x.
    const inMud = world.inMud ? world.inMud(p.x, p.z) : false;
    if (inMud) S.mudT = 1;
    // Virtual joystick: magnitude (0-1, scaled by joystick sensitivity) throttles speed.
    const joyMul = (S.joyMag > 0) ? (0.35 + 0.65 * S.joyMag) : 1;
    const windMul = S.windT > 0 ? 0.7 : 1;
    const freezeMul = (S.freezeT || 0) > 0 ? 0.5 : 1;
    const mountMul = S.mounted ? 1.6 : 1;
    const base = (knocked ? 1.0 : p.prone ? 2.1 : p.crouched ? 3.0 : sprint ? (S.tacSprint ? 10.5 : 9) : 6) * (S.perks.includes('lightweight') ? 1.15 : 1) * joyMul * (inPool ? 0.6 : 1) * windMul * (inMud ? 0.8 : 1) * freezeMul * mountMul;
    let ix = 0, iz = 0;
    if (keys.has('KeyW')) iz -= 1;
    if (keys.has('KeyS')) iz += 1;
    if (keys.has('KeyA')) ix -= 1;
    if (keys.has('KeyD')) ix += 1;
    const len = Math.hypot(ix, iz) || 1;
    ix /= len; iz /= len;
    const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
    // forward = (-sin, -cos), right = (cos, -sin). W is iz=-1, so the
    // forward term needs -iz (a plain iz*forward walks backwards).
    _f.set(sin * iz + cos * ix, 0, cos * iz - sin * ix);
    const accel = p.onGround ? 42 : 12;
    p.vx += _f.x * accel * dt * (base / 6);
    p.vz += _f.z * accel * dt * (base / 6);
    // Friction / decel (v25.0.1): per-surface friction — sand slides,
    // metal is slick, concrete/wood grip. Sliding keeps momentum.
    const surf = S.surface || 'concrete';
    const frBase = surf === 'sand' ? 3 : surf === 'metal' ? 5 : 9;
    const fr = p.sliding ? Math.exp(-0.8 * dt) : p.onGround ? Math.exp(-frBase * dt) : Math.exp(-0.4 * dt);
    if (ix === 0 && iz === 0) { p.vx *= fr; p.vz *= fr; }
    const sp = Math.hypot(p.vx, p.vz), max = base * 1.05 * (p.sliding ? 1.2 : 1);
    if (sp > max && !p.sliding) { p.vx *= max / sp; p.vz *= max / sp; }
    // Axis-separated movement: try X, then Z — slides along walls instead of
    // sticking on corners. The y passed is the current floor height (stairs /
    // floor 2), so a closed door blocks only below 3m and railings only at
    // their floor.
    const nx = p.x + p.vx * dt;
    if (!world.isColliding(nx, p.z, R, p.y)) p.x = nx; else p.vx = 0;
    const nz = p.z + p.vz * dt;
    if (!world.isColliding(p.x, nz, R, p.y)) p.z = nz; else p.vz = 0;
    // Parkour: Space (fresh press) near a low wall (<=1.3m) vaults onto it.
    // Gravity variants (v28.0.4): Moon 0.16 / Mars 0.38 — lower gravity
    // means a higher jump (capped at 2.5x) and a slower fall.
    const gMul = S.gravityMul || 1;
    const jumpBoost = Math.min(2.5, 1 / Math.sqrt(gMul));
    const spaceEdge = keys.has('Space') && !wasSpace;
    if (spaceEdge && p.onGround && !knocked) {
      const fx = p.x - Math.sin(p.yaw) * 0.7, fz = p.z - Math.cos(p.yaw) * 0.7;
      const ob = world.obstacleAt ? world.obstacleAt(fx, fz, p.y) : null;
      if (ob && ob.h <= 1.3) { p.vy = 6.5 * jumpBoost; p.onGround = false; p.vaultT = 0.5; p._jumped = true; }
      else { p.vy = 5.2 * jumpBoost; p.onGround = false; p._jumped = true; }
    }
    p.vy -= 14 * gMul * dt;
    // Parachute (v20.0.1): fall capped at −3.5 m/s while parachuting.
    if (S.parachuting) p.vy = Math.max(p.vy, -3.5);
    p.y += p.vy * dt;
    const gy = world.groundY(p.x, p.z, p.y);
    // Fall damage (v22.2.4): track the highest point of the fall; landing
    // from >5m costs 2 HP per metre. Low falls just land with dust.
    if (p.onGround) p._fallTop = p.y;
    else if (p.y > (p._fallTop || p.y)) p._fallTop = p.y;
    const wasAir = !p.onGround;
    if (p.y <= gy) {
      if (wasAir && p._fallTop != null) {
        const drop = p._fallTop - gy;
        if (drop > 5) { S.fallDmg = 2 * (drop - 5); S.fallDrop = drop; }
        else if (drop > 1) S.landedSoft = true;
        if (p.diving) { S.diveLanded = true; p.diving = false; }
        if (S.parachuting) { S.parachuting = false; S.msg = '🪂 Mendarat! Looting!'; S.msgT = 2; }
      }
      p.y = gy; p.vy = 0; p.onGround = true;
    }
    // Flower trampling (v19.2.13): flowers within 0.3m are crushed.
    if (world.flowerSpots) {
      for (const f of world.flowerSpots) {
        if (!f.taken && Math.hypot(f.x - p.x, f.z - p.z) < 0.3) {
          f.taken = true;
          if (f.mesh) f.mesh.visible = false;
        }
      }
    }
    // Swimming / diving breath (v22.2.6): Z in the pool dives under; 10s
    // of air, then 5 HP/s damage while under.
    if (inPool) {
      S.swimT = (S.swimT || 0) + dt;
      if (proneKey) {
        S.diving = true;
        S.diveBreathT = (S.diveBreathT == null ? 10 : S.diveBreathT) - dt;
        if (S.diveBreathT <= 0) { S.diveBreathT = 0; damage(5 * dt); }
      } else {
        S.diving = false;
        S.diveBreathT = Math.min(10, (S.diveBreathT == null ? 10 : S.diveBreathT) + 3 * dt);
      }
    } else {
      S.swimT = 0; S.diving = false;
      S.diveBreathT = Math.min(10, (S.diveBreathT == null ? 10 : S.diveBreathT) + 3 * dt);
    }
    p.speed = Math.hypot(p.vx, p.vz);
    p.moving = p.speed > 0.6;
    // Recoil recovery: the camera kick decays back on its own.
    if (p.recoilPitch > 0) p.recoilPitch = Math.max(0, p.recoilPitch - dt * 0.09);
    // Spread bloom: fast reset after 0.5s without firing.
    const bloomDecay = (S.time - (p.lastShotT || -99) > 0.5) ? 0.3 : 0.05;
    p.spreadBloom = Math.max(0, p.spreadBloom - dt * bloomDecay);
    p._cPrev = crouchKey;
    p._spacePrev = keys.has('Space');
  }
  function damage(amount) {
    if (!p.alive) return;
    let rem = amount;
    if (p.armor > 0) {
      const absorbed = Math.min(p.armor, rem * 0.6);
      p.armor -= absorbed; rem -= absorbed;
    }
    p.hp -= rem;
    if (p.hp <= 0) { p.hp = 0; p.alive = false; }
  }
  return { look, step, damage };
}
