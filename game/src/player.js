// Player movement: accel/decel, sprint, crouch, jump, AABB collision. Scratch vectors only.
import * as THREE from 'three';

const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const R = 0.42; // player radius

function collide(p, colliders, bounds) {
  p.x = Math.max(bounds.minX + R, Math.min(bounds.maxX - R, p.x));
  p.z = Math.max(bounds.minZ + R, Math.min(bounds.maxZ - R, p.z));
  for (const c of colliders) {
    if (p.x + R > c.x0 && p.x - R < c.x1 && p.z + R > c.z0 && p.z - R < c.z1) {
      const dxl = p.x + R - c.x0, dxr = c.x1 - (p.x - R);
      const dzl = p.z + R - c.z0, dzr = c.z1 - (p.z - R);
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) p.x = c.x0 - R; else if (m === dxr) p.x = c.x1 + R;
      else if (m === dzl) p.z = c.z0 - R; else p.z = c.z1 + R;
    }
  }
}

export function createPlayer(world, S) {
  const p = S.player;
  const colliders = world.colliders, bounds = world.bounds;
  function look(dx, dy) {
    p.yaw -= dx * 0.0022;
    p.pitch -= dy * 0.0022;
    p.pitch = Math.max(-1.5, Math.min(1.5, p.pitch));
  }
  function recoil(pitchKick, yawKick) {
    p.pitch += pitchKick; p.yaw += yawKick;
    p.pitch = Math.max(-1.5, Math.min(1.5, p.pitch));
  }
  function step(dt, keys, ads) {
    const crouch = keys.has('KeyC');
    p.crouched = crouch;
    const targetEye = crouch ? 1.05 : 1.62;
    p.eye += (targetEye - p.eye) * Math.min(1, dt * 10);
    const sprint = keys.has('ShiftLeft') && !crouch && (keys.has('KeyW'));
    const base = crouch ? 2.4 : sprint ? 7.2 : 4.6;
    let ix = 0, iz = 0;
    if (keys.has('KeyW')) iz -= 1;
    if (keys.has('KeyS')) iz += 1;
    if (keys.has('KeyA')) ix -= 1;
    if (keys.has('KeyD')) ix += 1;
    const len = Math.hypot(ix, iz) || 1;
    ix /= len; iz /= len;
    const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
    // forward = (-sin, -cos), right = (cos, -sin)
    _f.set(-sin * iz + cos * ix, 0, -cos * iz - sin * ix);
    const accel = p.onGround ? 42 : 12;
    p.vx += _f.x * accel * dt * (base / 4.6);
    p.vz += _f.z * accel * dt * (base / 4.6);
    // Friction / decel
    const fr = p.onGround ? Math.exp(-9 * dt) : Math.exp(-0.4 * dt);
    if (ix === 0 && iz === 0) { p.vx *= fr; p.vz *= fr; }
    const sp = Math.hypot(p.vx, p.vz), max = base * 1.05;
    if (sp > max) { p.vx *= max / sp; p.vz *= max / sp; }
    p.x += p.vx * dt; p.z += p.vz * dt;
    collide(p, colliders, bounds);
    // Jump + gravity
    if (keys.has('Space') && p.onGround) { p.vy = 5.2; p.onGround = false; }
    p.vy -= 14 * dt; p.y += p.vy * dt;
    if (p.y <= 0) { p.y = 0; p.vy = 0; p.onGround = true; }
    p.speed = Math.hypot(p.vx, p.vz);
    p.moving = p.speed > 0.6;
    // Bloom decays toward 0
    p.spreadBloom = Math.max(0, p.spreadBloom - dt * 0.05);
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
  return { look, recoil, step, damage };
}
