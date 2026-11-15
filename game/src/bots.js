// Bots: 5 opponents. patrol / hold / combat / react. Seeded RNG. No wall-vision (LOS check).
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { losClear } from './world.js';

const _v = new THREE.Vector3();

export function createBots(scene, world, S, rng) {
  const group = new THREE.Group(); scene.add(group);
  const bodyMat = new THREE.MeshStandardMaterial({ color: PALETTE.botBody, roughness: 0.8 });
  const headMat = new THREE.MeshStandardMaterial({ color: PALETTE.botHead, roughness: 0.7 });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x1c1e20, roughness: 0.5, metalness: 0.5 });
  const trimMat = new THREE.MeshStandardMaterial({ color: PALETTE.botTrim, roughness: 0.8 });

  function buildBot(i) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.95, 0.34), bodyMat);
    body.position.y = 0.95; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), headMat);
    head.position.y = 1.62; head.castShadow = true;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.05), trimMat);
    visor.position.set(0, 1.64, 0.18);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.3), trimMat);
    legs.position.y = 0.25;
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.7), gunMat);
    gun.position.set(0.2, 1.05, -0.3);
    g.add(body, head, visor, legs, gun);
    body.userData = { botId: i, part: 'body' };
    head.userData = { botId: i, part: 'head' };
    group.add(g);
    return { group: g, body, head };
  }

  function spawnAll() {
    for (const b of S.bots) { if (b.mesh) group.remove(b.mesh.group); }
    S.bots = [];
    for (let i = 0; i < 5; i++) {
      const sp = world.spawns.bots[i];
      const mesh = buildBot(i);
      const bot = {
        id: i, x: sp.x, z: sp.z, yaw: 0, hp: 100, alive: true,
        state: i < 2 ? 'hold' : 'patrol',
        wpIdx: i * 2 % world.waypoints.length, holdT: 0, shootT: 0,
        burst: 0, burstT: 0, strafeDir: rng() > 0.5 ? 1 : -1, strafeT: 0,
        lastSeenX: 0, lastSeenZ: 0, hasSeen: false,
        defuseT: 0, blindT: 0, mesh,
      };
      // Holders guard the sites; patrollers roam mid.
      if (i === 0) { bot.x = world.sites.A.x + 3; bot.z = world.sites.A.z + 3; }
      if (i === 1) { bot.x = world.sites.B.x - 3; bot.z = world.sites.B.z + 3; }
      S.bots.push(bot);
    }
    syncMeshes();
  }
  function syncMeshes() {
    for (const b of S.bots) {
      b.mesh.group.position.set(b.x, 0, b.z);
      b.mesh.group.rotation.y = b.yaw;
      b.mesh.group.visible = b.alive;
    }
  }
  function hitMeshes() {
    const out = [];
    for (const b of S.bots) if (b.alive) out.push(b.mesh.body, b.mesh.head);
    return out;
  }
  function canSee(b) {
    const p = S.player;
    if (!p.alive || b.blindT > 0) return false;
    const d = Math.hypot(p.x - b.x, p.z - b.z);
    if (d > 46) return false;
    // Smoke blocks sight
    for (const s of S.grenades.smokes) {
      if (s.t > 0 && segmentHitsCircle(b.x, b.z, p.x, p.z, s.x, s.z, s.r)) return false;
    }
    return losClear(b.x, b.z, p.x, p.z, world.colliders);
  }
  function segmentHitsCircle(x0, z0, x1, z1, cx, cz, r) {
    const dx = x1 - x0, dz = z1 - z0, len2 = dx * dx + dz * dz || 1;
    let t = ((cx - x0) * dx + (cz - z0) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = x0 + dx * t - cx, pz = z0 + dz * t - cz;
    return px * px + pz * pz < r * r;
  }
  function moveToward(b, tx, tz, dt, speed) {
    const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
    if (d < 0.4) return true;
    b.x += dx / d * speed * dt; b.z += dz / d * speed * dt;
    b.yaw = Math.atan2(-dx, -dz);
    return false;
  }
  function step(dt, onPlayerHit) {
    const p = S.player;
    for (const b of S.bots) {
      if (!b.alive) continue;
      if (b.blindT > 0) b.blindT -= dt;
      const d = Math.hypot(p.x - b.x, p.z - b.z);
      const seen = canSee(b);
      if (seen) { b.hasSeen = true; b.lastSeenX = p.x; b.lastSeenZ = p.z; b.state = 'combat'; }
      // Bomb planted: nearest alive bots rush to defuse
      if (S.bomb.state === 'planted') {
        const alive = S.bots.filter(o => o.alive);
        const nearest = alive.sort((a, c) => Math.hypot(a.x - S.bomb.x, a.z - S.bomb.z) - Math.hypot(c.x - S.bomb.x, c.z - S.bomb.z))[0];
        if (b === nearest && !seen) { b.state = 'defuse'; }
      }
      if (b.state === 'combat' && !seen && S.time - (b.lastCombatT || 0) > 2.5) b.state = 'react';
      if (seen) b.lastCombatT = S.time;

      if (b.state === 'patrol') {
        const wp = world.waypoints[b.wpIdx];
        if (moveToward(b, wp.x, wp.z, dt, 2.6)) b.wpIdx = (b.wpIdx + 1) % world.waypoints.length;
      } else if (b.state === 'hold') {
        b.holdT += dt;
        b.yaw += Math.sin(S.time * 0.4 + b.id) * dt * 0.4; // slow scan
        if (S.lastShotPos && Math.hypot(S.lastShotPos.x - b.x, S.lastShotPos.z - b.z) < 26) b.state = 'react';
      } else if (b.state === 'react') {
        const tx = b.hasSeen ? b.lastSeenX : (S.lastShotPos ? S.lastShotPos.x : b.x);
        const tz = b.hasSeen ? b.lastSeenZ : (S.lastShotPos ? S.lastShotPos.z : b.z);
        if (moveToward(b, tx, tz, dt, 3.4)) { b.state = 'hold'; b.hasSeen = false; }
      } else if (b.state === 'defuse') {
        if (moveToward(b, S.bomb.x, S.bomb.z, dt, 3.8)) {
          b.defuseT += dt;
          S.bomb.defuseT = b.defuseT; S.bomb.defuser = b.id;
          if (b.defuseT >= 7) { S.bomb.state = 'defused'; }
        }
      }
      if (b.state === 'combat' && seen) {
        // Face player, strafe, fire in bursts; accuracy falls with distance.
        b.yaw = Math.atan2(-(p.x - b.x), -(p.z - b.z));
        b.strafeT -= dt;
        if (b.strafeT <= 0) { b.strafeDir *= -1; b.strafeT = 0.7 + rng() * 0.9; }
        const sx = Math.cos(b.yaw) * b.strafeDir, sz = -Math.sin(b.yaw) * b.strafeDir;
        b.x += sx * 1.6 * dt; b.z += sz * 1.6 * dt;
        b.shootT -= dt;
        if (b.shootT <= 0) {
          b.shootT = 0.55 + rng() * 0.5;
          const acc = Math.max(0.08, 0.5 - d * 0.011);
          if (rng() < acc) {
            const dmg = 9 + rng() * 9;
            onPlayerHit && onPlayerHit(dmg, b);
          }
          // Tracer-ish flash: briefly brighten gun
          b.mesh.group.children[4].material = gunMat;
        }
      }
    }
    syncMeshes();
  }
  function damage(bot, dmg) {
    if (!bot.alive) return false;
    bot.hp -= dmg;
    if (bot.hp <= 0) { bot.hp = 0; bot.alive = false; bot.mesh.group.visible = false; return true; }
    return false;
  }
  return { spawnAll, step, damage, hitMeshes, syncMeshes };
}
