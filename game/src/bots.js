// Bots: 5 opponents. patrol / hold / combat / react / defuse. Seeded RNG. No wall-vision (LOS check).
// v2: Phantom shortens bot vision, Dead Silence shortens bot hearing, TDM respawn,
// Domination zone capture, Battle Royale zone damage.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { losClear } from './world.js';
import { createBotModel, BOT_SKINS, BOT_WEAPONS, CHAR_OPERATOR_IDS, CHAR_SKIN_IDS, COSTUME_DEFS, COSTUME_IDS, camoMatches } from './characters.js';
import { DIFFICULTY_DEFS } from './state.js'; // v25.0.5 difficulty table

const _v = new THREE.Vector3();

export function createBots(scene, world, S, rng, deps = {}) {
  const group = new THREE.Group(); scene.add(group);
  const fx = deps.effects || null; // enemy tracers (red lines when bots fire)
  const sfx = deps.audio || null; // distance gunshots + enemy reload clicks
  const onSpot = deps.onSpot || null; // radio callout when a bot first spots you

  function buildBot(i) {
    // Varied look per bot: weapon skin + weapon + operator + outfit + costume
    // (colors/helmet/effect vary locally) + a second weapon slung on the back.
    const weaponSkin = BOT_SKINS[i % BOT_SKINS.length];
    const weaponId = BOT_WEAPONS[i % BOT_WEAPONS.length];
    const charOp = CHAR_OPERATOR_IDS[i % CHAR_OPERATOR_IDS.length];
    const charSkin = CHAR_SKIN_IDS[i % CHAR_SKIN_IDS.length];
    const costumeId = COSTUME_IDS[i % COSTUME_IDS.length];
    const model = createBotModel(weaponSkin, weaponId, `BOT-${i + 1}`, charOp, charSkin, {
      costumeId, backWeaponId: BOT_WEAPONS[(i + 1) % BOT_WEAPONS.length],
    });
    const g = model.group;
    model.parts.bodyMesh.userData = { botId: i, part: 'body' };
    model.parts.headMesh.userData = { botId: i, part: 'head' };
    group.add(g);
    return { group: g, body: model.parts.bodyMesh, head: model.parts.headMesh, gun: model.parts.gun, model };
  }

  // 5 small flies orbit above a fresh corpse (v18.9.15).
  function spawnFlies(b) {
    if (b.flies) return;
    const mat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const geo = new THREE.SphereGeometry(0.03, 4, 4);
    b.flies = [];
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Mesh(geo, mat);
      f.position.set(b.x, 1.2, b.z);
      group.add(f);
      b.flies.push(f);
    }
  }
  function spawnAll() {
    for (const b of S.bots) { if (b.mesh) group.remove(b.mesh.group); }
    S.bots = [];
    for (let i = 0; i < 5; i++) {
      const sp = world.spawns.bots[i];
      const mesh = buildBot(i);
      const bot = {
        id: i, x: sp.x, z: sp.z, yaw: 0,
        hp: Math.round(100 * ((DIFFICULTY_DEFS[S.difficulty] || DIFFICULTY_DEFS.normal).hp)), alive: true,
        skin: mesh.model.skin, weapon: mesh.model.weaponId,
        charOp: mesh.model.charOp, charSkin: mesh.model.charSkin,
        state: i < 2 ? 'hold' : 'patrol',
        wpIdx: i * 2 % world.waypoints.length, holdT: 0, shootT: 0,
        burst: 0, burstT: 0, strafeDir: rng() > 0.5 ? 1 : -1, strafeT: 0,
        lastSeenX: 0, lastSeenZ: 0, hasSeen: false,
        defuseT: 0, blindT: 0, respawnT: 0, mesh,
        shotsFired: 0, reloadT: 0, backwards: false, crouch: false, hopT: 0,
        corpseT: 0, allyHit: false, allyHitT: 0,
        flinchT: 0, adsT: 0, lean: 0, swimming: false, // v18.8 animation flags
        streak: 0, dripT: 0, ammoTaken: false, // v19.0/v19.1: corpse ammo, bot streak
        fleeT: 0, fleeing: false, // v22.0.8: low HP bot flees to cover
        knocked: false, knockT: 0, reviveT: 0, flies: null, // v22.0.8: BR bot knock/revive
      };
      // Holders guard the sites; patrollers roam mid.
      if (i === 0) { bot.x = world.sites.A.x + 3; bot.z = world.sites.A.z + 3; }
      if (i === 1) { bot.x = world.sites.B.x - 3; bot.z = world.sites.B.z + 3; }
      S.bots.push(bot);
    }
    syncMeshes();
  }
  function respawn(bot) {
    const sp = world.spawns.bots[bot.id];
    bot.x = sp.x; bot.z = sp.z;
    bot.hp = Math.round(100 * ((DIFFICULTY_DEFS[S.difficulty] || DIFFICULTY_DEFS.normal).hp));
    bot.alive = true;
    bot.state = 'patrol'; bot.hasSeen = false; bot.defuseT = 0; bot.blindT = 0;
    bot.corpseT = 0; bot.backwards = false; bot.crouch = false; bot.reloadT = 0;
    bot.shotsFired = 0; bot.allyHit = false; bot.hopT = 0;
    bot.streak = 0; bot.knocked = false; bot.knockT = 0; bot.reviveT = 0;
    bot.fleeing = false; bot.fleeT = 0; bot.ammoTaken = false;
    if (bot.flies) { for (const f of bot.flies) group.remove(f); bot.flies = null; }
    bot.mesh.group.visible = true;
    bot.mesh.group.rotation.z = 0; // stand back up after the death fall
    if (bot.mesh.model) { bot.mesh.model.deathT = 0; bot.mesh.model.lastHp = 100; }
    syncMeshes();
  }
  // BR revive: a dead bot stands up as your ally (follows you, shoots enemies).
  function reviveAsAlly(bot) {
    bot.hp = 100; bot.alive = true; bot.team = 'ally';
    bot.state = 'ally'; bot.hasSeen = false; bot.defuseT = 0; bot.blindT = 0;
    bot.respawnT = 0;
    bot.mesh.group.visible = true;
    bot.mesh.group.rotation.z = 0;
    if (bot.mesh.model) {
      bot.mesh.model.deathT = 0; bot.mesh.model.lastHp = 100;
      if (bot.mesh.model.setAlly) bot.mesh.model.setAlly(true);
    }
    syncMeshes();
  }
  function syncMeshes() {
    for (const b of S.bots) {
      b.mesh.group.position.set(b.x, 0, b.z);
      b.mesh.group.rotation.y = b.yaw;
      // Dead bots stay visible as fallen corpses for 10s (v25.0.3), then vanish;
      // their name sprite + indicator hide in animatePlayers.
      b.mesh.group.visible = b.alive || (b.corpseT || 0) > 0;
    }
  }
  function hitMeshes() {
    const out = [];
    // Knocked bots stay hittable so the player can finish them (v22.0.8).
    for (const b of S.bots) if (b.alive || b.knocked) out.push(b.mesh.body, b.mesh.head);
    return out;
  }
  function hasPerk(id) { return S.perks.includes(id); }
  function canSee(b) {
    const p = S.player;
    if (!p.alive || b.blindT > 0) return false;
    const d = Math.hypot(p.x - b.x, p.z - b.z);
    // Phantom perk: bots spot you at half range. Camo (v18.7.2): a matching
    // camo costume shrinks the spot range by another 20%.
    let range = hasPerk('ghost') ? 23 : 46;
    const cost = COSTUME_DEFS[S.costume];
    if (cost && camoMatches(cost.camo, S.mapId, S.weather)) range *= 0.8;
    // Cold-Blooded (v23.0.5): bots spot you from 20% closer still.
    if (hasPerk('cold_blooded')) range *= 0.8;
    // Wardrobe hide (v27.0.5): hidden in a wardrobe — bots cannot see you.
    if ((S.hideT || 0) > 0) return false;
    // Prop Hunt (v22.0.5): hunters spot a moving prop at 12m, a still one at 6m.
    if (S.mode === 'prophunt') range = S.player.moving ? 12 : 6;
    // Bush hide (v22.3.1): inside a bush the bots cannot see you for 3s.
    if ((S.bushT || 0) > 0) return false;
    if (d > range) return false;
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
    const mx = dx / d * speed * dt, mz = dz / d * speed * dt;
    const R = 0.35;
    // Axis-separated: try X, then Z, so bots slide along walls instead of
    // sticking on corners (and never walk through houses/containers/buses).
    let moved = false;
    if (!world.isColliding(b.x + mx, b.z, R, 0)) { b.x += mx; moved = true; }
    if (!world.isColliding(b.x, b.z + mz, R, 0)) { b.z += mz; moved = true; }
    if (moved) { b.yaw = Math.atan2(-dx, -dz); b.stuckT = 0; }
    else b.stuckT = (b.stuckT || 0) + dt;
    return false;
  }
  function step(dt, onPlayerHit, onAllyKill) {
    const p = S.player;
    // Corpses lie for 10s, then vanish (v18.6). Flies orbit above the corpse
    // (v18.9.15) and blood drips onto the floor (v19.0.12).
    for (const b of S.bots) {
      if (!b.alive && b.corpseT > 0) {
        b.corpseT -= dt;
        if (b.flies) {
          const t = S.time * 3 + b.id;
          b.flies.forEach((f, i) => {
            const a = t + i * 1.26;
            f.position.set(b.x + Math.cos(a) * 0.35, 1.15 + Math.sin(t * 1.7 + i) * 0.12, b.z + Math.sin(a) * 0.35);
          });
        }
        if (fx && fx.trailDrop) {
          b.dripT -= dt;
          if (b.dripT <= 0) {
            fx.trailDrop(b.x + (rng() - 0.5) * 0.5, b.z + (rng() - 0.5) * 0.5);
            b.dripT = 1;
          }
        }
        if (b.corpseT <= 0) {
          b.mesh.group.visible = false;
          if (b.flies) { for (const f of b.flies) group.remove(f); b.flies = null; }
        }
      }
      // BR knock: a knocked bot is revived by a nearby alive teammate
      // after 3s, or dies for real when the timer runs out (v22.0.8).
      if (b.knocked) {
        b.knockT -= dt;
        let reviver = null;
        for (const o of S.bots) {
          if (!o.alive || o === b || o.team === 'ally') continue;
          if (Math.hypot(o.x - b.x, o.z - b.z) < 3) { reviver = o; break; }
        }
        if (reviver) {
          b.reviveT += dt;
          if (b.reviveT >= 3) {
            b.knocked = false; b.alive = true; b.hp = 50; b.knockT = 0; b.reviveT = 0;
            b.mesh.group.visible = true;
            if (b.mesh.model) { b.mesh.model.deathT = 0; }
          }
        } else b.reviveT = 0;
        if (b.knockT <= 0 && b.knocked) {
          b.knocked = false; b.alive = false; b.corpseT = 10;
          spawnFlies(b);
        }
      }
    }
    // TDM respawn queue
    if (S.mode === 'tdm') {
      for (const b of S.bots) {
        if (!b.alive && b.respawnT > 0) {
          b.respawnT -= dt;
          if (b.respawnT <= 0) respawn(b);
        }
      }
    }
    // BR zone damage on bots
    if (S.mode === 'br') {
      for (const b of S.bots) {
        if (!b.alive) continue;
        const d = Math.hypot(b.x - S.br.cx, b.z - S.br.cz);
        if (d > S.br.radius) {
          b.hp -= 5 * dt;
          if (b.hp <= 0) {
            b.hp = 0; b.alive = false; b.corpseT = 10; b.streak = 0;
            spawnFlies(b);
            if (deps.onZoneDeath) deps.onZoneDeath(b); // v19.1.7 suicide feed
          }
        }
      }
    }
    for (const b of S.bots) {
      if (!b.alive) continue;
      // Per-frame animation flags (v18.8): lean resets each tick, ADS pose
      // lasts 0.5s after a shot, swimming follows the pool check.
      b.lean = 0;
      b.adsT = Math.max(0, (b.adsT || 0) - dt);
      b.ads = b.adsT > 0;
      b.swimming = world.inPool(b.x, b.z);
      // Cryo Bomb (v23.0.6): frozen bots stand still, cannot move or shoot.
      if ((b.frozenT || 0) > 0) { b.frozenT -= dt; continue; }
      // Revived ally (BR mode): follows you and shoots enemies. Enemies
      // ignore allies (single-player adaptation — no full team sim).
      if (b.team === 'ally') {
        const dp = Math.hypot(p.x - b.x, p.z - b.z);
        if (dp > 4) moveToward(b, p.x, p.z, dt, 3.5);
        let target = null, best = 30;
        for (const o of S.bots) {
          if (!o.alive || o.team === 'ally') continue;
          const d = Math.hypot(o.x - b.x, o.z - b.z);
          if (d < best && losClear(b.x, b.z, o.x, o.z, world.colliders)) { best = d; target = o; }
        }
        if (target) {
          b.yaw = Math.atan2(-(target.x - b.x), -(target.z - b.z));
          b.shootT -= dt;
          if (b.shootT <= 0) {
            b.shootT = 0.8;
            // Ally tracer (green) so you can see your teammate firing.
            if (fx) fx.tracer({ x: b.x, y: 1.3, z: b.z }, { x: target.x, y: 1.2, z: target.z }, 0x7ddc7d);
            const killed = damage(target, 8);
            // Assist tracking (v18.11): if the target survives and you
            // finish it within 5s, the kill counts as an assist.
            if (!killed) { target.allyHit = true; target.allyHitT = S.time; }
            if (killed && onAllyKill) onAllyKill(target, b);
          }
        }
        continue;
      }
      if (b.blindT > 0) b.blindT -= dt;
      const d = Math.hypot(p.x - b.x, p.z - b.z);
      const seen = canSee(b);
      // Difficulty reaction (v25.0.5): first sighting starts a reaction
      // timer — the bot does not shoot until it expires.
      if (seen) {
        if (!b.hasSeen) b.reactT = (DIFFICULTY_DEFS[S.difficulty] || DIFFICULTY_DEFS.normal).reaction;
        if (b.state !== 'combat' && onSpot) onSpot(b);
        b.hasSeen = true; b.lastSeenX = p.x; b.lastSeenZ = p.z; b.state = 'combat';
      }
      // Bomb planted: nearest alive bots rush to defuse
      if (S.bomb.state === 'planted') {
        const alive = S.bots.filter(o => o.alive);
        const nearest = alive.sort((a, c) => Math.hypot(a.x - S.bomb.x, a.z - S.bomb.z) - Math.hypot(c.x - S.bomb.x, c.z - S.bomb.z))[0];
        if (b === nearest && !seen) { b.state = 'defuse'; }
      }
      // Domination: idle bots drift to the nearest unowned/contested zone
      if (S.mode === 'dom' && b.state !== 'combat' && !seen) {
        let best = null, bestKey = null, bestD = 1e9;
        for (const key of ['A', 'B', 'C']) {
          const z = S.dom[key], s = world.sites[key];
          if (z.owner === 'bot') continue;
          const dd = Math.hypot(s.x - b.x, s.z - b.z);
          if (dd < bestD) { bestD = dd; best = s; bestKey = key; }
        }
        if (best && bestD > 2) { b.state = 'capture'; b.capTarget = best; b.capKey = bestKey; }
      }
      if (b.state === 'combat' && !seen && S.time - (b.lastCombatT || 0) > 2.5) b.state = 'react';
      if (seen) b.lastCombatT = S.time;

      if (b.state === 'patrol') {
        const wp = world.waypoints[b.wpIdx % world.waypoints.length];
        if (moveToward(b, wp.x, wp.z, dt, 2.6)) b.wpIdx = (b.wpIdx + 1) % world.waypoints.length;
        else if ((b.stuckT || 0) > 2) { b.wpIdx = (b.wpIdx + 1) % world.waypoints.length; b.stuckT = 0; }
      } else if (b.state === 'hold') {
        b.holdT += dt;
        b.yaw += Math.sin(S.time * 0.4 + b.id) * dt * 0.4; // slow scan
        // Dead Silence: bots hear shots at half range.
        const hearR = hasPerk('dead_silence') ? 13 : 26;
        if (S.lastShotPos && Math.hypot(S.lastShotPos.x - b.x, S.lastShotPos.z - b.z) < hearR) b.state = 'react';
        // Loud noises (sprint steps, slide, door, shots — v22.2.2): a bot
        // within 15m of a noise louder than 0.12 investigates the spot.
        if (S.noise && S.noise.t > 0 && S.noise.vol > 0.12) {
          if (Math.hypot(S.noise.x - b.x, S.noise.z - b.z) < 15) {
            b.lastSeenX = S.noise.x; b.lastSeenZ = S.noise.z;
            b.hasSeen = false; b.state = 'react';
          }
        }
      } else if (b.state === 'react') {
        const tx = b.hasSeen ? b.lastSeenX : (S.lastShotPos ? S.lastShotPos.x : b.x);
        const tz = b.hasSeen ? b.lastSeenZ : (S.lastShotPos ? S.lastShotPos.z : b.z);
        if (moveToward(b, tx, tz, dt, 3.4)) { b.state = 'hold'; b.hasSeen = false; }
        else if ((b.stuckT || 0) > 2) { b.state = 'patrol'; b.stuckT = 0; }
      } else if (b.state === 'capture') {
        const s = b.capTarget;
        if (!s || S.dom[b.capKey].owner === 'bot') { b.state = 'patrol'; }
        else if (moveToward(b, s.x, s.z, dt, 3.0)) { /* stand in the zone, capturing */ }
        else if ((b.stuckT || 0) > 2) { b.state = 'patrol'; b.stuckT = 0; }
      } else if (b.state === 'defuse') {
        if (moveToward(b, S.bomb.x, S.bomb.z, dt, 3.8)) {
          b.defuseT += dt;
          S.bomb.defuseT = b.defuseT; S.bomb.defuser = b.id;
          if (b.defuseT >= 7) { S.bomb.state = 'defused'; }
        } else if ((b.stuckT || 0) > 2) { b.state = 'patrol'; b.stuckT = 0; }
      }
      if (b.state === 'combat' && seen) {
        // Low HP: flee to the farthest waypoint for 3s, no shooting,
        // regenerating 10 HP/s up to 50 (v22.0.8).
        if (b.hp < 25 && !b.fleeing) { b.fleeing = true; b.fleeT = 3; }
        if (b.fleeing) {
          b.fleeT -= dt;
          b.hp = Math.min(50, b.hp + 10 * dt);
          let far = null, farD = -1;
          for (const wp of world.waypoints) {
            const dd = Math.hypot(wp.x - p.x, wp.z - p.z);
            if (dd > farD) { farD = dd; far = wp; }
          }
          if (far) moveToward(b, far.x, far.z, dt, 3.8);
          if (b.fleeT <= 0) b.fleeing = false;
          return; // fleeing bots do not shoot this tick
        }
        // Face player, strafe, fire in bursts; accuracy falls with distance.
        b.yaw = Math.atan2(-(p.x - b.x), -(p.z - b.z));
        // Low HP: the bot crouches (slower, smaller target, crouch anim).
        b.crouch = b.hp < 25;
        // Too close: backpedal while still facing you (backwards walk anim).
        if (d < 6) {
          const adx = b.x - p.x, adz = b.z - p.z, ad = Math.hypot(adx, adz) || 1;
          const mx = adx / ad * 2.2 * dt, mz = adz / ad * 2.2 * dt;
          if (!world.isColliding(b.x + mx, b.z, 0.35, 0)) b.x += mx;
          if (!world.isColliding(b.x, b.z + mz, 0.35, 0)) b.z += mz;
          b.backwards = true;
        } else {
          b.backwards = false;
          b.strafeT -= dt;
          if (b.strafeT <= 0) { b.strafeDir *= -1; b.strafeT = 0.7 + rng() * 0.9; }
          b.lean = b.strafeDir * 0.12; // body leans into the strafe (v18.8.3)
          const sx = Math.cos(b.yaw) * b.strafeDir, sz = -Math.sin(b.yaw) * b.strafeDir;
          const snx = b.x + sx * 1.6 * dt, snz = b.z + sz * 1.6 * dt;
          if (!world.isColliding(snx, b.z, 0.35, 0)) b.x = snx;
          if (!world.isColliding(b.x, snz, 0.35, 0)) b.z = snz;
        }
        // Stuck against a wall while chasing: hop over it (jump anim).
        if ((b.stuckT || 0) > 1.5) { b.hopT = 0.5; b.stuckT = 0; }
        // Reload cycle: 6 shots, then 1.5s reloading (arm-raise anim + click).
        // Burst fire (v25.0.5): 3-round bursts, 0.12s between shots, with
        // difficulty aim error + damage multiplier from DIFFICULTY_DEFS.
        if (b.reloadT > 0) {
          b.reloadT -= dt;
        } else if ((b.reactT || 0) > 0) {
          b.reactT -= dt; // still reacting — no shooting yet
        } else if ((b.burst || 0) > 0) {
          b.burstT -= dt;
          if (b.burstT <= 0) {
            b.burstT = 0.12; b.burst -= 1;
            b.shotsFired += 1;
            b.adsT = 0.5; // ADS pose: arms up, body tilted (v18.8.4)
            // Enemy tracer (red) + distance gunshot on every bot shot.
            if (fx) fx.tracer({ x: b.x, y: 1.3, z: b.z }, { x: p.x, y: p.y + p.eye, z: p.z }, 0xff2222);
            if (sfx && sfx.enemyShot) sfx.enemyShot(b.weapon, d);
            // Tracker perk (v23.0.5): an enemy shot marks it on the minimap.
            if (hasPerk('tracker') && deps.onBotShot) deps.onBotShot(b);
            const diff = DIFFICULTY_DEFS[S.difficulty] || DIFFICULTY_DEFS.normal;
            // (Gameplay pass 2026-11-15: the old code rolled the reload
            // BEFORE the hit roll, so every 6th shot was a guaranteed
            // non-hit. The hit now rolls first, then the reload triggers.
            // Accuracy/damage also buffed — a single bot's TTK at 10m was
            // 17-30s, below the 4 HP/s regen at range.)
            const acc = Math.max(0.05, 0.55 - d * 0.008 - diff.aimErr);
            if (rng() < acc) {
              const dmg = (11 + rng() * 9) * diff.dmg;
              onPlayerHit && onPlayerHit(dmg, b);
            }
            if (b.shotsFired >= 6) {
              b.shotsFired = 0; b.reloadT = 1.5;
              if (d < 40 && sfx && sfx.enemyReload) sfx.enemyReload();
            }
            if (b.burst <= 0) b.shootT = 0.45 + rng() * 0.4;
          }
        } else {
          b.shootT -= dt;
          if (b.shootT <= 0) { b.burst = 3; b.burstT = 0; }
        }
      }
    }
    syncMeshes();
  }
  function damage(bot, dmg) {
    if (!bot.alive && !bot.knocked) return false;
    bot.hp -= dmg;
    bot.flinchT = 0.15; // hit flinch: body + head snap back (v18.8.1)
    if (bot.hp <= 0) {
      // BR knock (v22.0.8): an enemy with a living teammate goes down
      // instead of dying outright; it can be revived or finished off.
      if (S.mode === 'br' && !bot.knocked) {
        const others = S.bots.filter(o => o.alive && o !== bot && o.team !== 'ally');
        if (others.length > 0) {
          bot.hp = 0; bot.knocked = true; bot.knockT = 10; bot.reviveT = 0;
          bot.alive = false; bot.corpseT = 10;
          return false; // not a kill yet — finish it or let its team revive it
        }
      }
      bot.hp = 0; bot.alive = false; bot.knocked = false; // the model falls sideways in animatePlayers
      bot.corpseT = 10; // corpse lies for 10s (v25.0.3)
      bot.streak = 0;
      spawnFlies(bot);
      if (S.mode === 'tdm') bot.respawnT = 3;
      return true;
    }
    return false;
  }
  // Ragdoll-as-function (v25.0.3): list of corpses still lying on the floor.
  function corpseList() { return S.bots.filter(b => !b.alive && (b.corpseT || 0) > 0); }
  return { spawnAll, step, damage, hitMeshes, syncMeshes, respawn, reviveAsAlly, corpseList };
}
