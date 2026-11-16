// Rounds, bomb plant/defuse, economy, buy menu, grenades.
// v2: four modes (S&D / TDM / Domination / BR mini), killstreaks (UAV / Hunter
// Killer / Sentry / Airstrike), operator skills, Quick Fix regen, player respawn,
// battle-pass XP, sentry turret.
// v2.1: Zombie mode waves, BR floor loot + medkits + revive, match callbacks
// (coins, quests, ELO, replay) via the cbs object from main.js.
import * as THREE from 'three';
import { STREAK_DEFS, MODE_DEFS, OPERATOR_DEFS, DEFAULT_OWNED } from './state.js';
import { nearestSiteName } from './world.js';
import { addXP } from './battlepass.js';
import { dmgAngle } from './hud.js';

export function createGame(S, world, bots, hud, audio, scene, cbs = {}) {
  let buyOpen = false;
  let beepT = 0;
  // BR floor loot (weapons / armor / medkits), spawned per round.
  const lootGroup = new THREE.Group(); scene.add(lootGroup);
  const lootItems = [];
  const lootMats = {
    weapon: new THREE.MeshStandardMaterial({ color: 0xff8a1a, emissive: 0xff6a00, emissiveIntensity: 0.5, roughness: 0.5 }),
    armor: new THREE.MeshStandardMaterial({ color: 0x2a7aff, emissive: 0x0044cc, emissiveIntensity: 0.5, roughness: 0.5 }),
    medkit: new THREE.MeshStandardMaterial({ color: 0x33cc44, emissive: 0x00aa22, emissiveIntensity: 0.5, roughness: 0.5 }),
  };
  // Bomb mesh (hidden until planted)
  const bombMesh = new THREE.Group();
  const bombBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x1c1e20, roughness: 0.4, metalness: 0.6 }));
  const bombLight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
  bombLight.position.set(0.2, 0.25, 0);
  bombMesh.add(bombBody, bombLight);
  bombMesh.visible = false; scene.add(bombMesh);
  // Smoke meshes pool — soft sprite clouds (radial-gradient texture: dense
  // core fading to transparent, no outline) instead of hard-edged spheres.
  function makeSmokeTexture() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0.85)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.45)');
    gr.addColorStop(0.8, 'rgba(255,255,255,0.12)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex;
  }
  const smokeTex = makeSmokeTexture();
  function smokeSpriteMat() {
    return new THREE.SpriteMaterial({ map: smokeTex, color: 0xdfe4e4, transparent: true, opacity: 0.55, depthWrite: false });
  }
  const smokeMeshes = [];
  // Sentry gun mesh (hidden until deployed)
  const sentryMesh = new THREE.Group();
  const sentryBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.5, metalness: 0.6 }));
  sentryBase.position.y = 0.25;
  const sentryGun = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x8a00ff, roughness: 0.4, metalness: 0.5 }));
  sentryGun.position.y = 0.7;
  sentryMesh.add(sentryBase, sentryGun);
  sentryMesh.visible = false; scene.add(sentryMesh);
  // Airstrike marker (red ring, hidden unless striking)
  const strikeMesh = new THREE.Mesh(new THREE.RingGeometry(11.4, 12, 48),
    new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  strikeMesh.rotation.x = -Math.PI / 2; strikeMesh.visible = false; scene.add(strikeMesh);
  // Attack-heli killstreak model: body + tail + spinning rotor, circles overhead.
  const heliMesh = new THREE.Group();
  {
    const bodyM = new THREE.MeshStandardMaterial({ color: 0x3a4a2e, roughness: 0.6, metalness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 1.6), bodyM);
    heliMesh.add(body);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.3, metalness: 0.5 }));
    nose.position.set(2, -0.1, 0); heliMesh.add(nose);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 0.4), bodyM);
    tail.position.set(-2.8, 0.2, 0); heliMesh.add(tail);
    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.8), bodyM);
    tailFin.position.set(-4, 0.6, 0); heliMesh.add(tailFin);
    const skidM = new THREE.MeshStandardMaterial({ color: 0x1c1e20, roughness: 0.5, metalness: 0.6 });
    for (const s of [-1, 1]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.1), skidM);
      skid.position.set(0, -0.75, s * 0.8); heliMesh.add(skid);
    }
  }
  const heliRotor = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.08, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.4, metalness: 0.7 }));
  heliRotor.position.y = 0.85; heliMesh.add(heliRotor);
  heliMesh.visible = false; scene.add(heliMesh);
  // Airstrike plane: simple jet that flies across the target area.
  const planeMesh = new THREE.Group();
  {
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0x5c6b70, roughness: 0.4, metalness: 0.7 }));
    fus.rotation.z = Math.PI / 2; planeMesh.add(fus);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 7),
      new THREE.MeshStandardMaterial({ color: 0x3d484d, roughness: 0.4, metalness: 0.7 }));
    planeMesh.add(wing);
    const tailW = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 3),
      new THREE.MeshStandardMaterial({ color: 0x3d484d, roughness: 0.4, metalness: 0.7 }));
    tailW.position.x = -2.8; planeMesh.add(tailW);
  }
  planeMesh.visible = false; scene.add(planeMesh);
  // BR drop plane (v20.0.1): flies across at 50m, then you parachute out.
  const brPlaneMesh = new THREE.Group();
  {
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 14, 8),
      new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.5, metalness: 0.4 }));
    fus.rotation.z = Math.PI / 2; brPlaneMesh.add(fus);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x6a5a3a, roughness: 0.5, metalness: 0.4 }));
    brPlaneMesh.add(wing);
  }
  brPlaneMesh.visible = false; scene.add(brPlaneMesh);
  // Molotov fire-zone meshes (orange spheres, 5s burn).
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.5, depthWrite: false });
  const fireMeshes = [];
  // C4 + trip-mine meshes.
  const c4Mat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4, metalness: 0.3 });
  const mineMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.6 });
  // Thrown grenade mesh (one visible grenade in flight at a time).
  const grenadeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x2e4a2e, roughness: 0.5, metalness: 0.4 }));
  grenadeMesh.visible = false; scene.add(grenadeMesh);
  // Grenade aim preview: one dashed arc + landing ring + dot, created once
  // and reused while the player holds Q. Points are rewritten every frame.
  const ARC_PTS = 29;
  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC_PTS * 3), 3));
  const arcLine = new THREE.Line(arcGeo, new THREE.LineDashedMaterial({ color: 0xffd23d, dashSize: 0.35, gapSize: 0.22, transparent: true, opacity: 0.95 }));
  arcLine.visible = false; arcLine.frustumCulled = false; scene.add(arcLine);
  const arcMark = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23d, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  arcMark.rotation.x = -Math.PI / 2; arcMark.visible = false; scene.add(arcMark);
  const arcDot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd23d }));
  arcDot.visible = false; scene.add(arcDot);
  // Dots along the arc: a 1px line seen from behind compresses into a
  // faint vertical streak, so the dots carry the readability.
  const arcDots = [];
  for (let i = 0; i < 12; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd23d, transparent: true, opacity: 0.95 }));
    d.visible = false; scene.add(d); arcDots.push(d);
  }
  let aiming = false, aimLand = null;
  // K9 attack dog (v23.0.3): small dark dog that chases the nearest bot.
  const k9Mesh = new THREE.Group();
  {
    const dogM = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 });
    const kbody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.25), dogM);
    kbody.position.y = 0.45; k9Mesh.add(kbody);
    const khead = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), dogM);
    khead.position.set(0.45, 0.6, 0); k9Mesh.add(khead);
    for (const [lx, lz] of [[-0.25, -0.1], [-0.25, 0.1], [0.25, -0.1], [0.25, 0.1]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), dogM);
      leg.position.set(lx, 0.18, lz); k9Mesh.add(leg);
    }
  }
  k9Mesh.visible = false; scene.add(k9Mesh);
  // Kill Confirmed dog-tag material (v23.0.1): gold tags dropped on kill.
  const tagMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.8, emissive: 0x442200 });
  // Predator missile + VTOL + Restock state (v23.0.4/5) — timers in main loop.
  let predator = null;
  let vtolT = 0;
  let restockT = 30;
  const fx = cbs.effects || null; // combat effects (explosions, tracers)
  // Dropped weapons (v18.5): a killed bot drops its gun for 30s; F picks it up.
  const dropGroup = new THREE.Group(); scene.add(dropGroup);
  const BOT_WEAPON_IDX = { ax117: 2, kb50: 3, vx9: 4, mp5: 0 };
  function dropWeapon(bot) {
    const idx = BOT_WEAPON_IDX[bot.weapon] ?? 0;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.18), lootMats.weapon);
    mesh.position.set(bot.x, 0.3, bot.z); mesh.castShadow = true;
    dropGroup.add(mesh);
    S.droppedWeapons.push({ x: bot.x, z: bot.z, weaponIdx: idx, t: 30, mesh });
  }
  function stepDropped(dt) {
    for (let i = S.droppedWeapons.length - 1; i >= 0; i--) {
      const d = S.droppedWeapons[i];
      d.t -= dt;
      d.mesh.rotation.y += dt * 1.5;
      d.mesh.position.y = 0.3 + Math.sin(S.time * 3 + d.x) * 0.06;
      if (d.t <= 0) { dropGroup.remove(d.mesh); S.droppedWeapons.splice(i, 1); }
    }
  }
  function pickupDropped() {
    const p = S.player;
    let best = null, bestD = 2;
    for (const d of S.droppedWeapons) {
      const dd = Math.hypot(p.x - d.x, p.z - d.z);
      if (dd < bestD) { bestD = dd; best = d; }
    }
    if (!best) return false;
    const w = S.weapons[best.weaponIdx];
    S.loadout.primary = best.weaponIdx; p.weaponIdx = best.weaponIdx;
    w.mag = w.magSize; w.reserve = Math.max(w.reserve, w.magSize * 2);
    dropGroup.remove(best.mesh);
    S.droppedWeapons.splice(S.droppedWeapons.indexOf(best), 1);
    hud.killfeed(`🧰 PICKED UP: ${w.name} (full mag)`);
    if (audio.coin) audio.coin();
    return true;
  }
  // Area damage shared by HE grenades, barrels and exploding cars.
  // cause (v19.1.6): 'grenade' | 'airstrike' | 'explosion' — killing an
  // ally with it is a TEAMKILL (−100 coins, red killfeed).
  function areaDamage(x, z, radius, maxDmg, cause = 'explosion') {
    for (const b of S.bots) {
      if (!b.alive) continue;
      const d = Math.hypot(b.x - x, b.z - z);
      if (d < radius) {
        const killed = bots.damage(b, Math.round(maxDmg * (1 - d / radius)));
        if (killed) {
          if (b.team === 'ally') {
            S.economy.money = Math.max(0, S.economy.money - 100);
            hud.killfeed(`🔴 TEAMKILL! You blew up your ally BOT-${b.id + 1} (−100)`, 'crimson');
            if (audio.streakSound) audio.streakSound(2);
          } else onKill(b, false);
        }
      }
    }
    const p = S.player;
    const pd = Math.hypot(p.x - x, p.z - z);
    if (pd < 5 && p.alive) {
      let dmg = Math.round(60 * (1 - pd / 5));
      if (hasPerk('flak_jacket')) dmg = Math.round(dmg * 0.6);
      hurtPlayer(dmg);
    }
    void cause;
  }
  // Damage a destructible prop (barrel / car / window / table). Returns true
  // when the hit mesh belongs to a destructible.
  function damageProp(mesh, dmg, point) {
    const rec = world.destructibles.find(r => r.meshes && r.meshes.includes(mesh));
    if (!rec) return false;
    rec.hp -= dmg;
    if (rec.hp > 0) {
      // Smoking car warning: already puffing below half HP.
      if (rec.kind === 'car' && rec.hp < 100 && !rec.smoking) rec.smoking = true;
      return true;
    }
    const p = point || { x: rec.x, y: 0.5, z: rec.z };
    if (rec.kind === 'barrel') {
      if (fx) fx.explosion({ x: rec.x, y: 0.5, z: rec.z }, false);
      else if (audio.explosion) audio.explosion();
      areaDamage(rec.x, rec.z, 4, 150);
    } else if (rec.kind === 'car') {
      // Two blasts 0.3s apart, 5m radius (pending booms, stepped in step()).
      S.pendingBooms = S.pendingBooms || [];
      S.pendingBooms.push({ x: rec.x, z: rec.z, t: 0 }, { x: rec.x, z: rec.z, t: 0.3 });
    } else if (rec.kind === 'window') {
      // Glass cracks in 2 stages (v19.2.10): first hit cracks (5 white
      // lines + ting), second hit shatters the pane.
      if (!rec.cracked) {
        rec.cracked = true;
        if (audio.ting) audio.ting();
        if (fx) fx.impact(p, { x: 0, y: 0, z: 1 }, 'wall');
        S.msg = '🪟 Kaca retak!'; S.msgT = 1;
        return true;
      }
      if (fx) fx.glass(p);
      else if (audio.glass) audio.glass();
    } else if (rec.kind === 'oil') {
      // Oil puddle (v18.9.10): shot -> catches fire, small area burn.
      if (fx) fx.explosion(p, false);
      else if (audio.explosion) audio.explosion();
      areaDamage(rec.x, rec.z, 2, 60);
    } else {
      if (fx) fx.impact(p, { x: 0, y: 0, z: 1 }, 'wood');
    }
    world.removeProp(rec);
    return true;
  }
  // Prop-hit routing (v19.2 + v22.3 + v22.4): the raycast in weapon.js
  // sends any mesh with userData.propType here. Returns true when the
  // mesh was a known prop (handled), false otherwise.
  function damagePropHit(mesh, dmg, point) {
    const type = mesh.userData.propType;
    if (!type) return false;
    const rec = mesh.userData.propRef || null;
    const p = point || { x: mesh.position.x, y: 0.5, z: mesh.position.z };
    const dir = { x: 0, y: 0, z: 1 };
    switch (type) {
      case 'lamp': { // v19.2.1: glass + the nearest point light dies
        if (fx) fx.glass(p); else if (audio.glass) audio.glass();
        if (rec) rec.dead = true;
        mesh.material.color && mesh.material.color.setHex(0x222222);
        if (world.setLightsOut) { /* single lamp only — the room dims via decor */ }
        return true;
      }
      case 'tv': { // v19.2.2: small explosion + smoke + screen dies
        if (fx) { fx.explosion(p, false); fx.smokePuff(p.x, p.y + 0.3, p.z); }
        else if (audio.explosion) audio.explosion();
        if (rec) rec.dead = true;
        mesh.material.color && mesh.material.color.setHex(0x111111);
        return true;
      }
      case 'can': { // v19.2.3: tips over + rolls 2m + ting
        if (world.propFall) world.propFall(mesh, 1.5, 0.5);
        if (audio.ting) audio.ting();
        return true;
      }
      case 'bottle': { // v19.2.4: green glass shards
        if (fx) fx.glass(p); else if (audio.glass) audio.glass();
        if (world.removeProp) world.removeProp({ meshes: [mesh] });
        return true;
      }
      case 'tire': { // v19.2.5: flat + pop; 4 flats = the car tilts
        if (rec) {
          rec.flat = (rec.flat || 0) + 1;
          mesh.scale.y = 0.4;
          if (audio.pop) audio.pop();
          if (rec.flat >= 4 && rec.group) rec.group.rotation.z = 0.12;
        }
        return true;
      }
      case 'watertank': { // v19.2.6: water sprays out
        if (fx) fx.splash(p); else if (audio.splash) audio.splash();
        return true;
      }
      case 'gas': { // v19.2.7: 1s smoke warning, then a big blast (5m)
        if (fx) fx.smokePuff(p.x, p.y + 0.5, p.z);
        S.pendingBooms = S.pendingBooms || [];
        S.pendingBooms.push({ x: p.x, z: p.z, t: 1 });
        S.msg = '⚠️ TABUNG GAS — MINGGIR!'; S.msgT = 1.5;
        return true;
      }
      case 'tree': { // v19.2.8: HP 5, leaves fall, then it topples 90°
        if (!rec) return true;
        rec.hp = (rec.hp == null ? 5 : rec.hp) - dmg;
        if (world.dropLeaves) world.dropLeaves(rec.x, rec.z);
        if (rec.hp <= 0 && !rec.fallen) {
          rec.fallen = true;
          rec.group.rotation.z = Math.PI / 2;
          if (rec.collider) rec.collider.active = false;
        }
        return true;
      }
      case 'flag': { // v19.2.9: torn — darkens, stops waving
        mesh.userData.torn = true;
        mesh.material.color && mesh.material.color.multiplyScalar(0.5);
        return true;
      }
      case 'radio': { // v19.2.11: toggle the tune
        S.radioOn = !S.radioOn;
        if (S.radioOn && audio.radioJingle) audio.radioJingle();
        S.msg = S.radioOn ? '📻 Radio ON' : '📻 Radio OFF'; S.msgT = 1.5;
        return true;
      }
      case 'generator': { // v19.2.12: sparks + all map lights off 10s
        if (fx) fx.impact(p, dir, 'metal');
        if (world.setLightsOut) world.setLightsOut(true);
        S.lightsOutT = 10;
        S.msg = '💡 Generator rusak — lampu mati 10 detik'; S.msgT = 2;
        return true;
      }
      case 'dummy': { // v22.0.4: training dummy wobbles + hit marker
        if (fx) fx.impact(p, dir, 'wood');
        S.msg = '🎯 Kena manekin!'; S.msgT = 1;
        return true;
      }
      case 'bush': { // v22.3.1: HP 3, shakes + drops leaves, then breaks
        mesh.userData.hp = (mesh.userData.hp == null ? 3 : mesh.userData.hp) - 1;
        if (world.dropLeaves) world.dropLeaves(p.x, p.z);
        if (mesh.userData.hp <= 0) {
          if (world.removeProp) world.removeProp({ meshes: [mesh] });
          S.msg = '🌿 Semak hancur!'; S.msgT = 1;
        }
        return true;
      }
      case 'building': { // v22.3.2: HP 5, explosions −3 → collapses
        mesh.userData.hp = (mesh.userData.hp == null ? 5 : mesh.userData.hp) - (dmg >= 100 ? 3 : 1);
        if (fx) fx.impact(p, dir, 'wall');
        if (mesh.userData.hp <= 0 && !mesh.userData.collapsed) {
          mesh.userData.collapsed = true;
          mesh.rotation.z = 0.25; mesh.position.y -= 1.5;
          if (fx) fx.explosion(p, true);
          areaDamage(p.x, p.z, 5, 100);
          S.msg = '🏚️ Gedung runtuh!'; S.msgT = 2;
        }
        return true;
      }
      case 'bridge': { // v22.3.3: RPG/C4 breaks it — it falls
        mesh.userData.hp = (mesh.userData.hp == null ? 3 : mesh.userData.hp) - (dmg >= 100 ? 3 : 1);
        if (audio.tuk) audio.tuk();
        if (mesh.userData.hp <= 0 && !mesh.userData.collapsed) {
          mesh.userData.collapsed = true;
          mesh.rotation.x = 0.4; mesh.position.y -= 2;
          if (fx) fx.explosion(p, false);
        }
        return true;
      }
      case 'door': { // v22.3.4: HP 2, then it flies off (BRAK)
        mesh.userData.hp = (mesh.userData.hp == null ? 2 : mesh.userData.hp) - 1;
        if (audio.doorMetal) audio.doorMetal();
        if (mesh.userData.hp <= 0) {
          mesh.rotation.y += 1.2; mesh.position.x += 1.5;
          if (audio.crash) audio.crash();
          if (world.doors) {
            const d = world.doors.find(dd => dd.mesh === mesh || dd.pivot === mesh);
            if (d) d.open = true;
          }
        }
        return true;
      }
      case 'leaves': { // v22.3.5: one leaf at a time; 10 gone = bare tree
        mesh.visible = false;
        if (rec) {
          rec.leavesLeft = (rec.leavesLeft == null ? 10 : rec.leavesLeft) - 1;
          if (rec.leavesLeft <= 0) S.msg = '🌳 Pohon botak!'; S.msgT = 1;
        }
        return true;
      }
      case 'tall-grass': { // v22.3.6: fire turns it black
        mesh.material.color && mesh.material.color.setHex(0x1a1a1a);
        mesh.userData.burnt = true;
        return true;
      }
      case 'roof': { // v22.3.7: 3 tiles fall + Krak
        if (fx) fx.impact(p, dir, 'wood');
        if (audio.tuk) audio.tuk();
        mesh.visible = false;
        return true;
      }
      case 'stairs': { // v22.3.8: HP 5, then it collapses — no climbing
        mesh.userData.hp = (mesh.userData.hp == null ? 5 : mesh.userData.hp) - 1;
        if (mesh.userData.hp <= 0) {
          mesh.visible = false;
          S.msg = '🪜 Tangga hancur!'; S.msgT = 2;
        }
        return true;
      }
      case 'lift': { // v22.3.9: ding — ride it with E
        if (audio.beep) audio.beep();
        S.msg = '🛗 Lift — tekan E untuk naik'; S.msgT = 1.5;
        return true;
      }
      case 'parked-car': { // v22.3.10: glass → alarm → tire → smoke → boom
        const st = (mesh.userData.stage || 0) + 1;
        mesh.userData.stage = st;
        if (st === 1) { if (audio.glass) audio.glass(); }
        else if (st === 2) { if (audio.alarm) audio.alarm(); S.msg = '🚨 Alarm mobil!'; S.msgT = 1.5; }
        else if (st === 3) { if (audio.pop) audio.pop(); }
        else if (st === 4) { if (fx) fx.smokePuff(p.x, p.y + 1, p.z); }
        else { if (fx) fx.explosion(p, true); areaDamage(p.x, p.z, 5, 150); }
        return true;
      }
      case 'motor': { // v22.3.10: tips over, then a small explosion
        mesh.rotation.z = Math.PI / 2;
        if (fx) fx.explosion(p, false);
        areaDamage(p.x, p.z, 3, 80);
        return true;
      }
      case 'power-pole': { // v22.3.11: HP 3 → falls + sparks + lights out
        mesh.userData.hp = (mesh.userData.hp == null ? 3 : mesh.userData.hp) - 1;
        if (fx) fx.impact(p, dir, 'metal');
        if (mesh.userData.hp <= 0) {
          mesh.rotation.z = Math.PI / 2;
          if (world.setLightsOut) world.setLightsOut(true);
          S.lightsOutT = 10;
        }
        return true;
      }
      case 'container': { // v22.3.12: Ting + dent; RPG/C4 blows it up
        if (fx) fx.impact(p, dir, 'metal');
        if (audio.ting) audio.ting();
        if (dmg >= 100) {
          if (fx) fx.explosion(p, true);
          areaDamage(p.x, p.z, 5, 150);
          if (world.removeProp) world.removeProp({ meshes: [mesh] });
        }
        return true;
      }
      case 'plant-pot': { // v22.3.13: falls + breaks + soil spills
        if (world.propFall) world.propFall(mesh, 1, 0.5);
        if (fx) fx.impact(p, dir, 'ground');
        return true;
      }
      case 'trash-can': { // v22.3.13: tips over + trash spills + BRAK
        if (world.propFall) world.propFall(mesh, 1.5, 0.5);
        if (audio.crash) audio.crash();
        return true;
      }
      case 'road-sign': { // v22.3.13: bends, then falls
        if (!mesh.userData.bent) { mesh.userData.bent = true; mesh.rotation.z = 0.3; }
        else mesh.rotation.z = Math.PI / 2;
        if (audio.ting) audio.ting();
        return true;
      }
      case 'statue': { // v22.3.13: cracks, then RPG shatters it
        if (fx) fx.impact(p, dir, 'wall');
        if (dmg >= 100) {
          if (fx) fx.glass(p);
          if (world.removeProp) world.removeProp({ meshes: [mesh] });
        }
        return true;
      }
      case 'billboard': { // v22.3.13: sparks, then it falls
        if (fx) fx.impact(p, dir, 'metal');
        mesh.rotation.x = 0.5;
        return true;
      }
      case 'street-light': { // v22.3.13: glass + dark
        if (fx) fx.glass(p);
        if (rec) rec.dead = true;
        mesh.material.color && mesh.material.color.setHex(0x222222);
        return true;
      }
      case 'tent': { // v22.3.13: tears, then collapses
        if (!mesh.userData.torn) { mesh.userData.torn = true; mesh.material.color && mesh.material.color.multiplyScalar(0.6); }
        else if (world.removeProp) world.removeProp({ meshes: [mesh] });
        return true;
      }
      case 'wood-pile': { // v22.3.13: scatters
        if (fx) fx.impact(p, dir, 'wood');
        if (world.removeProp) world.removeProp({ meshes: [mesh] });
        return true;
      }
      case 'rock': { // v22.3.13: sparks + dust; RPG breaks it apart
        if (fx) fx.impact(p, dir, 'wall');
        if (dmg >= 100 && world.removeProp) world.removeProp({ meshes: [mesh] });
        return true;
      }
      case 'sand': { // v22.3.13: dust + a hole
        if (fx) fx.impact(p, dir, 'ground');
        return true;
      }
      case 'water': { // v22.3.13: splash + growing ripple
        if (fx) fx.splash(p); else if (audio.splash) audio.splash();
        return true;
      }
      case 'power-line': { // v22.3.11: cut → sparks + lights out
        if (fx) fx.impact(p, dir, 'metal');
        mesh.visible = false;
        if (world.setLightsOut) world.setLightsOut(true);
        S.lightsOutT = 10;
        return true;
      }
      case 'fence': { // v22.3.13: wooden fence breaks
        if (fx) fx.impact(p, dir, 'wood');
        if (world.removeProp) world.removeProp({ meshes: [mesh] });
        return true;
      }
      case 'fountain': { // v22.3.13: splash
        if (fx) fx.splash(p); else if (audio.splash) audio.splash();
        return true;
      }
      case 'gas-station': { // v22.4.1: the SPBU blows up
        if (fx) fx.explosion(p, true);
        areaDamage(p.x, p.z, 6, 120);
        return true;
      }
      case 'traffic-light': { // v22.4.7: breaks + goes dark
        if (fx) fx.glass(p);
        if (rec) rec.dead = true;
        mesh.material.color && mesh.material.color.setHex(0x222222);
        return true;
      }
      case 'hydrant': { // v22.4.8: water jets 10s
        if (fx) fx.splash(p); else if (audio.splash) audio.splash();
        S.msg = '💦 Hydrant pecah — air muncrat!'; S.msgT = 2;
        return true;
      }
      case 'vending': { // v22.4.8: a can pops out + sparks
        if (fx) fx.impact(p, dir, 'metal');
        if (audio.coin) audio.coin();
        S.msg = '🥤 Vending — tekan E beli minum (10 Coin, +20 HP)'; S.msgT = 2;
        return true;
      }
      case 'atm': { // v22.4.8: blows up + coins spill out (+50)
        if (fx) fx.explosion(p, false);
        S.economy.money += 50;
        S.msg = '🏧 ATM meledak! +50 Coin'; S.msgT = 2;
        return true;
      }
      case 'phone-booth': { // v22.4.8: sparks
        if (fx) fx.impact(p, dir, 'metal');
        S.msg = '☎️ Telepon umum — tekan E untuk menelepon'; S.msgT = 2;
        return true;
      }
      case 'cart': { // v22.4.8: pushed over
        if (world.propFall) world.propFall(mesh, 1.5, 0.5);
        return true;
      }
      case 'suitcase': { // v22.4.8: opens → pistol + ammo + coins
        if (audio.coin) audio.coin();
        S.economy.money += 25;
        const w = S.weapons[6];
        w.reserve = Math.min(w.reserve + 21, w.magSize * 5);
        if (world.removeProp) world.removeProp({ meshes: [mesh] });
        S.msg = '🧳 Koper: pistol ammo +21, +25 Coin'; S.msgT = 2;
        return true;
      }
      case 'glass': { // v19.2.10: window glass, 2-stage crack (see damageProp)
        const grec = world.destructibles.find(r => r.meshes && r.meshes.includes(mesh));
        if (grec) return damageProp(mesh, dmg, point);
        if (!mesh.userData.cracked) {
          mesh.userData.cracked = true;
          if (audio.ting) audio.ting();
          if (fx) fx.impact(p, dir, 'wall');
        } else {
          if (fx) fx.glass(p);
          if (world.removeProp) world.removeProp({ meshes: [mesh] });
        }
        return true;
      }
      default:
        return false;
    }
  }
  function stepPendingBooms(dt) {
    if (!S.pendingBooms || !S.pendingBooms.length) return;
    for (let i = S.pendingBooms.length - 1; i >= 0; i--) {
      const b = S.pendingBooms[i];
      b.t -= dt;
      if (b.t <= 0) {
        if (fx) fx.explosion({ x: b.x, y: 0.5, z: b.z }, true);
        else if (audio.explosion) audio.explosion();
        areaDamage(b.x, b.z, 5, 150);
        S.pendingBooms.splice(i, 1);
      }
    }
  }
  function stepSmokingCars(dt) {
    for (const rec of world.destructibles) {
      if (rec.kind !== 'car' || !rec.smoking) continue;
      rec.smokeT = (rec.smokeT || 0) - dt;
      if (rec.smokeT <= 0) {
        rec.smokeT = 0.5;
        if (fx) fx.smokePuff(rec.x, 1.2, rec.z);
      }
    }
  }

  // BR loot: 9 pickups (weapons / armor / medkits) on the floor.
  function spawnLoot() {
    for (const it of lootItems) lootGroup.remove(it.mesh);
    lootItems.length = 0;
    S.medkits = 0;
    const kinds = ['weapon', 'armor', 'medkit', 'weapon', 'medkit', 'armor', 'weapon', 'medkit', 'armor'];
    for (let i = 0; i < kinds.length; i++) {
      let x = 0, z = 0;
      for (let t = 0; t < 12; t++) {
        x = (Math.random() * 2 - 1) * 34; z = (Math.random() * 2 - 1) * 22;
        if (!world.isColliding(x, z, 0.4, 0)) break;
      }
      const kind = kinds[i];
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.6), lootMats[kind]);
      mesh.position.set(x, 0.35, z); mesh.castShadow = true;
      lootGroup.add(mesh);
      lootItems.push({ kind, x, z, mesh, weaponIdx: kind === 'weapon' ? (i % 6) : -1, taken: false });
    }
  }
  function stepLoot(dt) {
    const p = S.player;
    for (const it of lootItems) {
      if (it.taken) continue;
      it.mesh.position.y = 0.35 + Math.sin(S.time * 3 + it.x) * 0.08;
      it.mesh.rotation.y += dt;
      if (!p.alive) continue;
      if (Math.hypot(p.x - it.x, p.z - it.z) < 1.2) {
        it.taken = true; it.mesh.visible = false;
        if (it.kind === 'weapon') {
          S.loadout.primary = it.weaponIdx; p.weaponIdx = it.weaponIdx;
          const w = S.weapons[it.weaponIdx];
          w.mag = w.magSize; w.reserve = Math.max(w.reserve, w.magSize * 2);
          hud.killfeed(`🧰 LOOT: ${w.name} picked up`);
        } else if (it.kind === 'armor') {
          p.armor = Math.min(100, p.armor + 50);
          hud.killfeed('🛡️ LOOT: +50 Armor');
        } else {
          S.medkits = Math.min(3, (S.medkits || 0) + 1);
          hud.killfeed(`💊 LOOT: Medkit +1 (${S.medkits}/3) — press H to use`);
        }
        audio.coin && audio.coin();
      }
    }
  }
  // Medkit (v19.0.14): H starts a 3s channel — you cannot shoot while
  // channelling, +33 HP/s to full. Consumed at the start. Damage cancels it.
  function useMedkit() {
    const p = S.player;
    if (!p.alive || (S.medkits || 0) <= 0 || p.hp >= 100 || S.medkitChannel > 0) return false;
    S.medkits -= 1;
    S.medkitChannel = 3;
    if (audio.medkitSnd) audio.medkitSnd();
    hud.killfeed(`💊 Medkit… healing 3s (${S.medkits} left)`);
    return true;
  }
  // Armor (v19.0.14): J adds +50 armor (max 100), consumed on use.
  function useArmor() {
    const p = S.player;
    if (!p.alive || (S.armorKits || 0) <= 0 || p.armor >= 100) return false;
    S.armorKits -= 1;
    p.armor = Math.min(100, p.armor + 50);
    if (audio.armorSnd) audio.armorSnd();
    hud.killfeed(`🛡️ Armor +50 (${p.armor}/100, ${S.armorKits} kits left)`);
    return true;
  }

  function hasPerk(id) { return S.perks.includes(id); }
  function streakNeed(def) { return Math.max(1, def.at - (hasPerk('hardline') ? 1 : 0)); }

  function resetPlayer() {
    const p = S.player, sp = world.spawns.player;
    p.x = sp.x; p.z = sp.z; p.y = 0; p.vx = 0; p.vz = 0; p.vy = 0;
    p.yaw = sp.yaw; p.pitch = 0; p.hp = 100; p.alive = true; p.knocked = false;
    p.armor = S.keepArmor ? p.armor : 0;
    p.respawnT = 0; p.lastHurtT = -99;
    p.weaponIdx = S.loadout.primary;
    S.spawnProtT = 3; // spawn protection (v25.0.8)
  }
  function startRound() {
    const def = MODE_DEFS[S.mode];
    S.phase = 'playing';
    S.round.timer = def.timer;
    S.round.result = '';
    S.bomb = { state: 'none', site: null, x: 0, z: 0, plantT: 0, fuse: 40, defuseT: 0, defuser: -1 };
    S.grenades.smokes = [];
    for (const m of smokeMeshes) m.visible = false;
    bombMesh.visible = false;
    sentryMesh.visible = false;
    strikeMesh.visible = false;
    heliMesh.visible = false;
    planeMesh.visible = false;
    grenadeMesh.visible = false;
    cancelGrenadeAim();
    if (audio.rotor) audio.rotor(false);
    S.sentry = null; S.airstrike = null; S.heli = null;
    S.grenades.flying = [];
    S.streak = 0; S.streaksReady = []; S.uavT = 0;
    for (const def of STREAK_DEFS) S['streakUsed_' + def.id] = false;
    S.opCd = 0; S.opActive = false; S.opShots = 0;
    S.finisher = null; S.pendingEnd = null; S.finisherRequest = null;
    S.kills = 0; S.botKills = 0;
    // Countdown 3-2-1 (v18.13) — skipped in shot/test mode.
    S.countdownT = S.noCountdown ? 0 : 3.2;
    S.firstBloodDone = false;
    S.pendingBooms = [];
    S.knockT = 0; S.knockReviveT = 0; // BR knock state reset
    // Throwables reset each round (v20.0.11): 1 molotov, 1 C4, 1 trip mine.
    S.grenades.molotov = 1; S.grenades.c4 = 1; S.grenades.tripmine = 1;
    // v23.0.5 Tactician: +1 tactical of each kind. v23.0.6 tacticals reset.
    S.grenades.trophy = hasPerk('tactician') ? 2 : 1;
    S.grenades.gas = hasPerk('tactician') ? 2 : 1;
    S.grenades.cryo = hasPerk('tactician') ? 2 : 1;
    S.trophySys = null; S.gasClouds = []; S.k9 = null; k9Mesh.visible = false;
    predator = null; S.vtolPasses = 0; vtolT = 0; restockT = 30;
    S.kcTags = []; S.kcScore = 0; S.ffaKills = 0;
    // Spawn protection (v25.0.8): 3s of no damage after the round starts.
    S.spawnProtT = 3;
    // Sniper Only (v23.0.1): force KB-50 (idx 3); GL-50 (idx 20) via buy.
    if (S.mode === 'sniperonly') {
      S.loadout.primary = 3; S.player.weaponIdx = 3;
      S.msg = '🎯 SNIPER ONLY — KB-50 / GL-50 saja!'; S.msgT = 3;
    }
    if (S.c4 && S.c4.mesh) scene.remove(S.c4.mesh);
    S.c4 = null;
    for (const t of S.tripmines) if (t.mesh) scene.remove(t.mesh);
    S.tripmines = [];
    for (const f of fireMeshes) f.visible = false;
    S.fireZones = [];
    S.ggIdx = 0;
    S.hardpoint = { you: 0, bot: 0 };
    S.wmQueue = null;
    for (const d of S.droppedWeapons) dropGroup.remove(d.mesh);
    S.droppedWeapons = [];
    S.dom = { A: { value: 0, owner: null }, B: { value: 0, owner: null }, C: { value: 0, owner: null }, points: { you: 0, bot: 0 } };
    S.br = { radius: 40, cx: 0, cz: 0, shrinkT: 0 };
    world.brRing.visible = S.mode === 'br';
    S.lastShotPos = null;
    resetPlayer();
    // BR parachute (v20.0.1): the round starts 50m up on the plane.
    if (S.mode === 'br') {
      S.planeT = 2; S.parachuting = false;
      S.player.y = 50;
      brPlaneMesh.visible = true;
      brPlaneMesh.position.set(-45, 50, 0);
      S.msg = '🪂 BR DROP — terjun dari pesawat!'; S.msgT = 3;
    } else {
      S.planeT = 0; S.parachuting = false; brPlaneMesh.visible = false;
    }
    // Prop Hunt disguise (v22.0.5): box or chair, random each round.
    S.propDisguise = S.mode === 'prophunt' ? (Math.random() > 0.5 ? 'box' : 'chair') : null;
    if (S.mode === 'zombie') {
      // Zombies replace the regular bots in this mode.
      S.bots = [];
      if (cbs.zombie) cbs.zombie.start();
    } else {
      bots.spawnAll();
    }
    if (S.mode === 'br') spawnLoot();
    else { for (const it of lootItems) it.mesh.visible = false; lootItems.length = 0; }
    hud.hideMenu(); hud.hideEnd(); hud.showBuy(false); buyOpen = false;
    S.msg = `ROUND ${S.round.num} — ${def.name.toUpperCase()}: ${def.desc}`;
    S.msgT = 4;
    hud.refreshLoadout();
  }
  function endRound(won, reason) {
    if (S.phase !== 'playing') return;
    cancelGrenadeAim();
    S.phase = 'roundEnd';
    S.round.result = won ? 'won' : 'lost';
    if (won) {
      S.round.wins += 1; S.economy.money += 1000; audio.win();
      const r = addXP(S.bp, 200, 'win');
      if (r.tierUp) hud.killfeed(`🏆 BATTLE PASS TIER ${r.tierUp}! Reward: ${r.reward}`);
    } else { S.round.losses += 1; audio.lose(); }
    const matchOver = S.round.wins >= S.round.winAt || S.round.losses >= S.round.winAt || S.round.num >= S.round.maxRounds;
    const title = matchOver
      ? (S.round.wins > S.round.losses ? 'MATCH WON' : 'MATCH LOST')
      : (won ? 'ROUND WON' : 'ROUND LOST');
    const sub = `${reason}  •  Score ${S.round.wins} - ${S.round.losses}` +
      (matchOver ? '  •  Click RESTART for a new match' : '  •  Click CONTINUE for the next round');
    if (won && !S.noFinisher) {
      // Cinematic first: the end screen waits until the finisher is done.
      const c = S.lastKillPos || { x: 0, z: 0 };
      S.pendingEnd = { title, sub, matchOver };
      S.finisherRequest = { kind: S.finisherSel, cx: c.x, cz: c.z, killerName: 'YOU', victimName: S.lastVictim || 'BOT' };
      if (cbs.onRoundEnd) cbs.onRoundEnd(won, matchOver, title);
      return;
    }
    hud.showEnd(title, sub);
    if (document.pointerLockElement) document.exitPointerLock();
    if (matchOver) S.phase = 'matchEnd';
    if (cbs.onRoundEnd) cbs.onRoundEnd(won, matchOver, title);
  }
  function nextRound() {
    if (S.phase === 'matchEnd') {
      S.round = { num: 1, wins: 0, losses: 0, timer: MODE_DEFS[S.mode].timer, maxRounds: 5, winAt: 3, result: '' };
      S.economy.money = 800;
      S.owned = [...DEFAULT_OWNED];
      for (const w of S.weapons) { w.mag = w.magSize; w.reserve = w.magSize * 3; w.reloading = false; }
      S.kills = 0; S.botKills = 0;
    } else {
      S.round.num += 1;
    }
    startRound();
  }
  function nearestSite() {
    const p = S.player;
    for (const key of ['A', 'B']) {
      const s = world.sites[key];
      if (Math.hypot(p.x - s.x, p.z - s.z) < s.r) return key;
    }
    return null;
  }
  function buyHtml() {
    // Money lives in the panel header (reference layout); refresh it here —
    // buyHtml runs on open and after every purchase.
    const bm = document.getElementById('buy-money');
    if (bm) bm.textContent = '$' + S.economy.money;
    const rows = S.weapons.map((w, i) => {
      const owned = S.owned[i];
      const price = owned ? '<span class="buy-owned">OWNED</span>' : `<span class="buy-price">$${w.price}</span>`;
      const cur = S.player.weaponIdx === i ? ' ◄ EQUIPPED' : '';
      return `<button data-buy="w${i}" class="buy-row"><span class="buy-name"><b>${w.name}</b>${cur}</span><span class="buy-sub">${w.cls} · ${w.dmg} dmg · ${w.magSize} mag</span>${price}</button>`;
    }).join('');
    const equip = [
      ['armor', 'Full Armor', 'absorbs 60% of damage', 1000],
      ['smoke', 'Smoke Grenade', '+1 smoke', 300],
      ['flash', 'Flash Grenade', '+1 flash', 300],
      ['he', 'Frag Grenade', '+1 frag', 300],
      ['ammo', 'Ammo Refill', 'full reserve for current weapon', 500],
    ].map(([id, name, sub, price]) =>
      `<button data-buy="${id}" class="buy-row"><span class="buy-name"><b>${name}</b></span><span class="buy-sub">${sub}</span><span class="buy-price">$${price}</span></button>`).join('');
    return `<div class="buy-sec">WEAPONS</div><div class="buy-grid">${rows}</div>`
      + `<div class="buy-sec">EQUIPMENT</div><div class="buy-grid">${equip}</div>`
      + `<div class="buy-note">Press N to close</div>`;
  }
  function toggleBuy() {
    if (S.phase !== 'playing' && S.phase !== 'roundEnd') return;
    buyOpen = !buyOpen;
    if (buyOpen) { hud.setBuyHtml(buyHtml()); hud.showBuy(true); if (document.pointerLockElement) document.exitPointerLock(); }
    else hud.showBuy(false);
  }
  function buy(id) {
    if (id === 'armor') {
      if (S.economy.money >= 1000 && S.player.armor < 100) { S.economy.money -= 1000; S.player.armor = 100; S.keepArmor = true; }
    } else if (id === 'ammo') {
      const w = S.weapons[S.player.weaponIdx];
      if (S.economy.money >= 500) { S.economy.money -= 500; w.reserve = w.magSize * 3; }
    } else if (id === 'smoke' || id === 'flash' || id === 'he') {
      if (S.economy.money >= 300) { S.economy.money -= 300; S.grenades[id] += 1; }
    } else {
      const i = Number(id.slice(1)), w = S.weapons[i];
      if (!S.owned[i] && S.economy.money >= w.price) {
        S.economy.money -= w.price; S.owned[i] = true; S.player.weaponIdx = i;
      } else if (S.owned[i]) S.player.weaponIdx = i;
    }
    hud.setBuyHtml(buyHtml());
  }
  // Grenades: pin sound + a visible grenade that flies ~1s on an arc, then
  // detonates at the landing point. HE: 150 damage at the center, falling to
  // 0 at 4m. Flash: white screen 1.5s if you are close. Smoke: cloud for 4s.
  // Throw origin + velocity, shared by the real throw and the aim preview
  // so the preview line is the flight the grenade will actually take.
  function throwOrigin() {
    const p = S.player;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    return { x: p.x + fx * 0.5, y: p.y + p.eye - 0.2, z: p.z + fz * 0.5, vx: fx * 12, vy: 3, vz: fz * 12 };
  }
  function throwGrenade(kind, camera) {
    const g = S.grenades;
    const p = S.player;
    const count = kind === 'smoke' ? g.smoke : kind === 'flash' ? g.flash : g.he;
    if (count <= 0) { S.msg = 'NO GRENADES LEFT'; S.msgT = 1.5; return; }
    if (kind === 'smoke') g.smoke -= 1;
    else if (kind === 'flash') g.flash -= 1;
    else g.he -= 1;
    if (audio.pin) audio.pin();
    // Throw from the player's chest, forward + up on a ~1s arc.
    const o = throwOrigin();
    g.flying.push({ kind, x: o.x, y: o.y, z: o.z, vx: o.vx, vy: o.vy, vz: o.vz });
    grenadeMesh.visible = true;
    S.msg = kind === 'he' ? 'FRAG OUT' : kind === 'flash' ? 'FLASH OUT' : 'SMOKE OUT';
    S.msgT = 1.5;
  }
  // Simulate the throw at 1/60s with the SAME rules as stepFlyingGrenades
  // (gravity 9.8, wall check, one 40% ground bounce, then detonate) and
  // return the sampled points plus the detonation point.
  function simulateArc() {
    const o = throwOrigin();
    const pts = [[o.x, o.y, o.z]];
    let x = o.x, y = o.y, z = o.z, vx = o.vx, vy = o.vy, vz = o.vz;
    let bounced = false, hitWall = false;
    const DT = 1 / 60;
    for (let i = 0; i < 240; i++) {
      vy -= 9.8 * DT; x += vx * DT; y += vy * DT; z += vz * DT;
      pts.push([x, y, z]);
      if (world.isColliding(x, z, 0.15, y)) { hitWall = true; break; }
      if (y <= 0.05) {
        if (!bounced && vy < -1) { bounced = true; y = 0.06; vy = -vy * 0.4; }
        else break;
      }
    }
    return { pts, land: { x, y: Math.max(y, 0.06), z }, hitWall };
  }
  function updateAim() {
    if (!aiming) return;
    const p = S.player;
    if (!p.alive || S.driving || (S.grenades.he || 0) <= 0) { cancelGrenadeAim(); return; }
    const sim = simulateArc();
    aimLand = sim.land;
    const pos = arcGeo.attributes.position;
    for (let i = 0; i < ARC_PTS; i++) {
      // Spread the 29 line points over the WHOLE simulated flight, not
      // just its first 29 samples (the flight has ~84).
      const pt = sim.pts[Math.floor(i * (sim.pts.length - 1) / (ARC_PTS - 1))];
      pos.setXYZ(i, pt[0], pt[1], pt[2]);
    }
    pos.needsUpdate = true;
    arcLine.computeLineDistances();
    for (let i = 0; i < arcDots.length; i++) {
      // Skip the first 15% of the path (too close to the camera) and grow
      // each dot with its distance, so every dot reads ~the same on screen.
      const k = 0.15 + 0.85 * i / (arcDots.length - 1);
      const pt = sim.pts[Math.floor(k * (sim.pts.length - 1))];
      const d = arcDots[i];
      d.position.set(pt[0], pt[1], pt[2]);
      const camD = Math.hypot(pt[0] - S.player.x, pt[1] - (S.player.y + S.player.eye), pt[2] - S.player.z);
      const r = 0.02 + 0.015 * camD;
      d.scale.setScalar(r / 0.07);
    }
    arcMark.position.set(sim.land.x, sim.land.y + 0.03, sim.land.z);
    arcDot.position.set(sim.land.x, sim.land.y + 0.09, sim.land.z);
  }
  function startGrenadeAim() {
    if (aiming || S.phase !== 'playing' || !S.player.alive || S.driving || (S.grenades.he || 0) <= 0) return false;
    aiming = true;
    arcLine.visible = true; arcMark.visible = true; arcDot.visible = true;
    for (const d of arcDots) d.visible = true;
    updateAim();
    return true;
  }
  function releaseGrenadeAim(camera) {
    if (!aiming) return false;
    aiming = false;
    arcLine.visible = false; arcMark.visible = false; arcDot.visible = false;
    for (const d of arcDots) d.visible = false;
    throwGrenade('he', camera);
    return true;
  }
  function cancelGrenadeAim() {
    aiming = false;
    arcLine.visible = false; arcMark.visible = false; arcDot.visible = false;
    for (const d of arcDots) d.visible = false;
  }
  function detonateGrenade(gr) {
    const g = S.grenades;
    const p = S.player;
    const x = gr.x, z = gr.z;
    if (gr.kind === 'he') {
      if (fx) fx.explosion({ x, y: 0.3, z }, false);
      else if (audio.explosion) audio.explosion();
      // A bot-thrown frag (v27.1) does not credit you — its kills go to
      // the feed instead of onKill (which pays you +300 and a streak).
      const thrower = gr.fromBot !== undefined ? S.bots[gr.fromBot] : null;
      for (const b of S.bots) {
        if (!b.alive) continue;
        const d = Math.hypot(b.x - x, b.z - z);
        if (d < 4) {
          const killed = bots.damage(b, Math.round(150 * (1 - d / 4)));
          if (killed) {
            if (thrower) hud.killfeedHtml(`<span style="color:#ff9a3d">💥 BOT-${thrower.id + 1} frag got BOT-${b.id + 1}</span>`);
            else onKill(b, false);
          }
        }
      }
      // Blast hurts you too if you stand in it — Flak Jacket cuts it by 40%.
      // Close blast (<6m) shakes the screen and rings your ears.
      const pd = Math.hypot(p.x - x, p.z - z);
      if (pd < 5 && p.alive) {
        let dmg = Math.round(60 * (1 - pd / 5));
        if (hasPerk('flak_jacket')) dmg = Math.round(dmg * 0.6);
        hurtPlayer(dmg, thrower || undefined);
      }
      if (pd < 6) { if (audio.ring) audio.ring(); }
    } else if (gr.kind === 'flash') {
      // Blind bots within 30m; blind you for 1.5s if you are close (<15m).
      for (const b of S.bots) if (b.alive && Math.hypot(b.x - p.x, b.z - p.z) < 30) b.blindT = 3;
      const pd = Math.hypot(p.x - x, p.z - z);
      if (pd < 15) { hud.flashWhite(pd < 8 ? 1500 : 800); S.flashT = 1.5; }
      else hud.flashWhite(300);
    } else if (gr.kind === 'smoke') {
      const s = { x, z, r: 5, t: 4 };
      g.smokes.push(s);
      let m = smokeMeshes.find(m => !m.visible);
      if (!m) {
        // Billowing cluster (reference look): one big soft puff + satellites
        // of varying size, layered so the cloud reads as smoke, not balls.
        m = new THREE.Group();
        const mat = smokeSpriteMat();
        for (const [ox, oy, oz, s] of [[0, 0, 0, 8], [-2.6, 0.8, 1.2, 5], [2.6, 0.6, -1.3, 5.5], [-1.2, 1.8, -0.8, 4], [1.4, 1.6, 1.0, 4.2]]) {
          const puff = new THREE.Sprite(mat);
          puff.position.set(ox, oy, oz);
          puff.scale.set(s, s, 1);
          puff.renderOrder = 3;
          m.add(puff);
        }
        scene.add(m); smokeMeshes.push(m);
      }
      m.position.set(x, 1.5, z); m.visible = true;
    } else if (gr.kind === 'molotov') {
      // Molotov (v20.0.11): a fire zone that burns for 5s.
      const fz = { x, z, t: 5, tickT: 0, mesh: null };
      let m = fireMeshes.find(m => !m.visible);
      if (!m) { m = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 10), fireMat); scene.add(m); fireMeshes.push(m); }
      m.position.set(x, 0.8, z); m.visible = true;
      fz.mesh = m;
      S.fireZones.push(fz);
      if (fx) fx.explosion({ x, y: 0.3, z }, false);
      else if (audio.explosion) audio.explosion();
    } else if (gr.kind === 'gas') {
      // Gas grenade (v23.0.6): damaging cloud, 5 dmg/s for 6s, radius 4m.
      S.gasClouds.push({ x, z, r: 4, t: 6 });
      S.msg = '☣️ GAS CLOUD — 5 dmg/s, 6 detik'; S.msgT = 2;
    } else if (gr.kind === 'cryo') {
      // Cryo bomb (v23.0.6): freeze every bot within 5m for 3s.
      let n = 0;
      for (const b of S.bots) {
        if (!b.alive) continue;
        if (Math.hypot(b.x - x, b.z - z) < 5) { b.frozenT = 3; n += 1; }
      }
      if (fx) fx.explosion({ x, y: 0.3, z }, false);
      S.msg = `❄️ CRYO — ${n} bot membeku 3 detik`; S.msgT = 2;
    }
  }
  function stepFlyingGrenades(dt) {
    const g = S.grenades;
    for (let i = g.flying.length - 1; i >= 0; i--) {
      const gr = g.flying[i];
      gr.vy -= 9.8 * dt;
      gr.x += gr.vx * dt; gr.y += gr.vy * dt; gr.z += gr.vz * dt;
      grenadeMesh.position.set(gr.x, gr.y, gr.z);
      if (world.isColliding(gr.x, gr.z, 0.15, gr.y)) {
        g.flying.splice(i, 1);
        detonateGrenade(gr);
      } else if (gr.y <= 0.05) {
        // One bounce off the ground (40% rebound + bounce sound), then blow.
        if (!gr.bounced && gr.vy < -1) {
          gr.bounced = true; gr.y = 0.06; gr.vy = -gr.vy * 0.4;
          if (audio.bounce) audio.bounce();
        } else {
          g.flying.splice(i, 1);
          detonateGrenade(gr);
        }
      }
    }
    if (!g.flying.length) grenadeMesh.visible = false;
    else grenadeMesh.visible = true; // v27.1: a bot-thrown grenade shows too
  }
  // Damage the player (records last-hurt time for Quick Fix regen).
  // killerBot is the bot that dealt the blow (for the killcam).
  function hurtPlayer(dmg, killerBot, from) {
    const p = S.player;
    if (!p.alive) return;
    // Spawn protection (v25.0.8): 3s after (re)spawn, no damage lands.
    if (S.spawnProtT > 0) return;
    // Trophy System (v23.0.6): blocks a bot shot within 10m, 3 blocks max.
    if (S.trophySys && S.trophySys.blocks > 0 && killerBot
      && Math.hypot(killerBot.x - S.trophySys.x, killerBot.z - S.trophySys.z) < 10) {
      S.trophySys.blocks -= 1;
      S.msg = `🛡️ TROPHY blocked a shot (${S.trophySys.blocks} left)`; S.msgT = 1.5;
      if (S.trophySys.blocks <= 0) S.trophySys = null;
      return;
    }
    // Hardcore flag (v26.0.5): one hit kills.
    if (S.hardcore) dmg = 9999;
    if (killerBot) S.lastKiller = killerBot;
    // Damage cancels the medkit channel (v19.0.14) and may cancel reload
    // (50% — handled by main via cbs.onHurt, v19.0.4).
    if (S.medkitChannel > 0) { S.medkitChannel = 0; hud.killfeed('💊 Medkit dibatalkan — kena tembak!'); }
    if (cbs.onHurt) cbs.onHurt(dmg);
    // Armor absorbs damage FIRST, fully (v19.0.15), then HP.
    let rem = dmg;
    if (p.armor > 0) { const absorbed = Math.min(p.armor, rem); p.armor -= absorbed; rem -= absorbed; }
    p.hp -= rem; p.lastHurtT = S.time;
    const src = killerBot || from;
    if (src) hud.dmgDir(dmgAngle(p.yaw, p.x, p.z, src.x, src.z));
    // Knocked (BR, v18.8.7): more damage while down shortens the timer.
    if (p.knocked) { S.knockT = Math.max(0, S.knockT - rem * 0.05); return; }
    if (p.hp <= 0) {
      // BR knock: go down crawling instead of dying outright — an ally
      // bot can revive you; the 10s timer running out kills you.
      if (S.mode === 'br' && S.bots.some(b => b.alive && b.team === 'ally')) {
        p.hp = 0; p.knocked = true; S.knockT = 10; S.knockReviveT = 0;
        hud.killfeed('🤕 KNOCKED! Crawl to your ally — 10s left');
        if (cbs.onPlayerKnock) cbs.onPlayerKnock();
        return;
      }
      playerDies(killerBot);
    }
  }
  function playerDies(killerBot) {
    cancelGrenadeAim();
    const p = S.player;
    // Quick Revive cola (v23.0.9): self-revive once at 50 HP, consumed.
    if (S.perkCola && S.perkCola.includes('quickrevive')) {
      S.perkCola = S.perkCola.filter(c => c !== 'quickrevive');
      p.hp = 50; p.alive = true; p.knocked = false;
      hud.killfeed('🥤 QUICK REVIVE — bangkit lagi!');
      if (audio.revive) audio.revive();
      return;
    }
    p.hp = 0; p.alive = false; p.knocked = false; p.respawnT = 3;
    S.streak = 0; S.streaksReady = [];
    for (const def of STREAK_DEFS) S['streakUsed_' + def.id] = false;
    if (S.mode === 'tdm' || S.mode === 'dom') { S.botKills += 1; hud.killfeed(`BOT ▸ YOU  •  ${S.mode === 'tdm' ? `BOT ${S.botKills} - ${S.kills} YOU` : ''}`); }
    if (cbs.onPlayerDeath) cbs.onPlayerDeath(S.lastKiller);
  }
  function onKill(bot, head) {
    S.kills += 1; S.economy.money += 300;
    S.streak += 1;
    // Scorestreak points (v20.0.6): +100 per kill; Nuke ready at 2000.
    S.score += 100;
    if (S.score >= 2000 && !S.nukeReady && !S.nukeUsed) {
      S.nukeReady = true;
      hud.killfeed('☢️ NUKE READY — 2000 poin! Pakai via tombol streak', 'gold');
    }
    S.lastKillPos = { x: bot.x, z: bot.z };
    S.lastVictim = `BOT-${bot.id + 1}`;
    if (head) S.headshots += 1;
    // Kill title by death cause (v19.0.17) + multi-kill / spree (v19.0.18).
    const cause = S.lastKillCause;
    const dist = Math.round(Math.hypot(bot.x - S.player.x, bot.z - S.player.z));
    let title = head ? 'HEADSHOT' : 'ELIMINATED';
    if (cause === 'wallbang') title = 'WALLBANG';
    else if (cause === 'longshot' || (dist > 50 && head)) title = 'HEADSHOT LONGSHOT';
    else if (cause === 'longshot50') title = 'LONGSHOT 50m+';
    else if (cause === 'grenade') title = 'GRENADE KILL';
    else if (cause === 'knife') title = 'KNIFE KILL';
    else if (cause === 'rpg') title = 'RPG KILL';
    else if (cause === 'fall') title = 'FALL KILL';
    const mk = S.multiKill;
    if (S.time - mk.lastT < 3) mk.count += 1; else mk.count = 1;
    mk.lastT = S.time;
    const spree = ['', 'DOUBLE KILL', 'TRIPLE KILL', 'QUAD KILL', 'RAMPAGE'][Math.min(mk.count, 4)] || (mk.count >= 5 ? 'RAMPAGE' : '');
    let spreeTitle = '';
    if (S.streak === 3) spreeTitle = 'KILLING SPREE';
    else if (S.streak === 5) spreeTitle = 'RAMPAGE';
    else if (S.streak === 10) spreeTitle = 'UNSTOPPABLE';
    const wName = S.weapons[S.player.weaponIdx].name;
    const sub = `${S.lastVictim} • ${dist}m • ${wName} • +100 XP${spree ? ' • ' + spree : ''}`;
    if (hud.showKillMessage) hud.showKillMessage(title, sub);
    if (spreeTitle) hud.killfeed(`🔥 ${spreeTitle}! (${S.streak} kill beruntun)`, 'gold');
    hud.killfeed(`YOU — ${wName} @ BOT-${bot.id + 1}${head ? ' [HEADSHOT]' : ''}  +$300`, S.mythic);
    // Radio callout: the kill is called out by site name.
    if (hud.showRadio) hud.showRadio(`${S.lastVictim} down at ${nearestSiteName(bot.x, bot.z)}`);
    const r = addXP(S.bp, 100, 'kill');
    if (head) addXP(S.bp, 50, 'headshot');
    if (r.tierUp) hud.killfeed(`🏆 BATTLE PASS TIER ${r.tierUp}! Reward: ${r.reward}`);
    for (const m of r.missionsDone) hud.killfeed(`✅ Mission done: ${m.label} +${m.reward} XP`);
    // Killstreaks: earn each threshold once per life.
    for (const def of STREAK_DEFS) {
      if (S.streak >= streakNeed(def) && !S.streaksReady.includes(def.id) && !S['streakUsed_' + def.id]) {
        S.streaksReady.push(def.id);
        S['streakUsed_' + def.id] = true;
        hud.killfeed(`🔥 KILLSTREAK READY: ${def.icon} ${def.name} — click it!`);
        if (audio.streakSound) audio.streakSound(S.streak); else audio.streak();
      }
    }
    // Gun Game ladder (v20.0.13): each kill upgrades the weapon.
    if (S.mode === 'gungame') {
      const ladder = [6, 17, 2, 7, 3, 11, 15]; // p12, mp5, ak117, by15, lr50, rpg, katana
      S.ggIdx += 1;
      if (S.ggIdx >= ladder.length) { endRound(true, 'GUN GAME — LADDER COMPLETE!'); return; }
      const idx = ladder[S.ggIdx];
      S.loadout.primary = idx; S.player.weaponIdx = idx;
      const w = S.weapons[idx];
      w.mag = w.magSize; w.reserve = Math.max(w.reserve, w.magSize * 2);
      hud.killfeed(`⬆️ GUN GAME: ${w.name} (${S.ggIdx + 1}/7)`);
    }
    // Kill Confirmed (v23.0.1): the victim drops a gold dog tag.
    if (S.mode === 'killconfirmed') {
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.45), tagMat);
      tag.position.set(bot.x, 0.15, bot.z); scene.add(tag);
      S.kcTags.push({ x: bot.x, z: bot.z, t: 30, mesh: tag });
    }
    // Free-For-All (v23.0.1): first to 20 kills wins.
    if (S.mode === 'ffa') {
      S.ffaKills += 1;
      if (S.ffaKills >= MODE_DEFS.ffa.target) { endRound(true, 'FREE-FOR-ALL — 20 KILLS!'); return; }
    }
    // Sniper Only (v23.0.1): first to 15 kills wins.
    if (S.mode === 'sniperonly' && S.kills >= MODE_DEFS.sniperonly.target) { endRound(true, 'SNIPER ONLY — 15 KILLS!'); return; }
    // Achievements (v24.0.11): 10-kill streak, headshot master, accuracy.
    checkAchievements();
    if (S.mode === 'tdm' && S.kills >= MODE_DEFS.tdm.target) endRound(true, 'TEAM DEATHMATCH — 15 KILLS');
    if (cbs.onPlayerKill) cbs.onPlayerKill(bot, head);
  }
  // Achievements: local unlocks with coin rewards (v24.0.11).
  function checkAchievements() {
    const unlock = (id, label, reward) => {
      if (S.achievements[id]) return;
      S.achievements[id] = true;
      S.economy.money += reward;
      hud.killfeed(`🏆 ACHIEVEMENT: ${label} +${reward} coin`, 'gold');
      if (cbs.onAchievement) cbs.onAchievement(id, reward);
    };
    if (S.streak >= 10) unlock('streak10', '10 Kill Streak', 200);
    if (S.headshots >= 50) unlock('headshot50', 'Headshot Master (50)', 300);
    if (S.shotsFired >= 50 && (S.shotsHit || 0) / Math.max(1, S.shotsFired) >= 0.8) unlock('accuracy80', 'Akurasi 80%', 500);
    if (S.kills >= 100) unlock('kills100', '100 Kills', 500);
  }
  function useStreak(id) {
    const i = S.streaksReady.indexOf(id);
    if (i < 0) return;
    S.streaksReady.splice(i, 1);
    const p = S.player;
    if (id === 'nuke') { // v20.0.5: 2000 points — every enemy dies
      S.nukeUsed = true; S.nukeReady = false;
      for (const b of [...S.bots]) if (b.alive) { const killed = bots.damage(b, 9999); if (killed) onKill(b, false); }
      hud.flashWhite(800);
      S.msg = '☢️ NUKE! Semua musuh mati'; S.msgT = 3;
      if (audio.explosion) audio.explosion();
      hud.refreshStreaks();
      return;
    }
    if (id === 'uav') {
      S.uavT = 20;
      S.msg = '🛰️ UAV ACTIVE — bots revealed on the minimap'; S.msgT = 3;
    } else if (id === 'hunter') {
      const alive = S.bots.filter(b => b.alive);
      if (alive.length) {
        const t = alive[Math.floor(Math.random() * alive.length)];
        const killed = bots.damage(t, 999);
        if (killed) { S.msg = '🚁 HUNTER KILLER DRONE — target eliminated'; S.msgT = 3; onKill(t, false); }
      }
    } else if (id === 'sentry') {
      S.sentry = { x: p.x - Math.sin(p.yaw) * 2, z: p.z - Math.cos(p.yaw) * 2, t: 15, shootT: 0 };
      sentryMesh.position.set(S.sentry.x, 0, S.sentry.z);
      sentryMesh.visible = true;
      S.msg = '🤖 SENTRY GUN DEPLOYED — 15s'; S.msgT = 3;
    } else if (id === 'heli') {
      S.heli = { t: 30, angle: 0, shootT: 0, leaving: false };
      heliMesh.visible = true;
      if (audio.rotor) audio.rotor(true);
      S.msg = '🚁 ATTACK HELI INBOUND — 30s'; S.msgT = 3;
    } else if (id === 'airstrike') {
      // Strike at the densest bot cluster. The plane flies across first,
      // then 3 blasts land in sequence (see stepAirstrike).
      let tx = 0, tz = 0, best = 0;
      for (const b of S.bots) {
        if (!b.alive) continue;
        let n = 0;
        for (const o of S.bots) if (o.alive && Math.hypot(o.x - b.x, o.z - b.z) < 12) n += 1;
        if (n > best) { best = n; tx = b.x; tz = b.z; }
      }
      S.airstrike = { x: tx, z: tz, t: 2.6, bombs: 3, bombT: 0.9 };
      strikeMesh.position.set(tx, 0.06, tz); strikeMesh.visible = true;
      planeMesh.position.set(-45, 40, tz);
      planeMesh.visible = true;
      S.msg = '💣 AIRSTRIKE INCOMING'; S.msgT = 3;
    } else if (id === 'predator') {
      // Predator Missile (v23.0.4): guided missile at a point 25m ahead.
      const tx = p.x - Math.sin(p.yaw) * 25, tz = p.z - Math.cos(p.yaw) * 25;
      predator = { x: tx, z: tz, t: 0.8 };
      S.msg = '🚀 PREDATOR MISSILE INBOUND'; S.msgT = 3;
    } else if (id === 'stealth') {
      // Stealth Chopper (v23.0.4): 45s, silent — no rotor sound, no warning.
      S.heli = { t: 45, angle: 0, shootT: 0, leaving: false, stealth: true };
      heliMesh.visible = true;
      S.msg = '🥷 STEALTH CHOPPER — 45s, silent'; S.msgT = 3;
    } else if (id === 'vtol') {
      // VTOL (v23.0.4): 3 strafing passes, 100 damage each.
      S.vtolPasses = 3; vtolT = 0.5;
      S.msg = '🛩️ VTOL — 3 strafing passes'; S.msgT = 3;
    } else if (id === 'swarm') {
      // Swarm (v23.0.4): 5 hunter drones kill up to 5 random bots.
      const alive = S.bots.filter(b => b.alive && b.team !== 'ally');
      let n = 0;
      for (const t of alive.slice(0, 5)) { const killed = bots.damage(t, 999); if (killed) { onKill(t, false); n += 1; } }
      S.msg = `🐝 SWARM — ${n} bot${n === 1 ? '' : 's'} eliminated`; S.msgT = 3;
    }
    hud.refreshStreaks();
  }
  // Scorestreak auto-pick (v22.0.2): one button uses the highest streak
  // your score can afford. Costs: Nuke 2000, Sentry 1200, Heli 900,
  // Airstrike 600, UAV 300.
  function useBestStreak() {
    const costs = [['nuke', 2000], ['sentry', 1200], ['heli', 900], ['airstrike', 600], ['uav', 300]];
    for (const [id, cost] of costs) {
      if (id === 'nuke' && !S.nukeReady) continue;
      if (S.score < cost) continue;
      S.score -= cost;
      if (id === 'nuke') { S.streaksReady.push('nuke'); useStreak('nuke'); }
      else { S.streaksReady.push(id); useStreak(id); }
      hud.killfeed(`⚡ AUTO-STREAK: ${id.toUpperCase()} (−${cost} poin)`);
      return true;
    }
    S.msg = 'Skor belum cukup untuk scorestreak'; S.msgT = 2;
    return false;
  }
  // Airstrike sequence: the plane crosses the map, then 3 blasts hit the
  // target area 0.4s apart (120 damage within 6m of each blast).
  function stepAirstrike(dt) {
    const a = S.airstrike;
    if (!a) return;
    a.t -= dt;
    planeMesh.position.x += dt * 35; // -45 -> +45 over ~2.6s
    if (a.bombs > 0) {
      a.bombT -= dt;
      if (a.bombT <= 0) {
        a.bombT = 0.4;
        a.bombs -= 1;
        const bx = a.x + (Math.random() * 2 - 1) * 4, bz = a.z + (Math.random() * 2 - 1) * 4;
        if (fx) fx.explosion({ x: bx, y: 0.3, z: bz }, true);
        else if (audio.explosion) audio.explosion();
        for (const b of S.bots) {
          if (!b.alive || b.team === 'ally') continue;
          const d = Math.hypot(b.x - bx, b.z - bz);
          if (d < 6) { const killed = bots.damage(b, 120); if (killed) onKill(b, false); }
        }
      }
    }
    if (a.t <= 0) { S.airstrike = null; strikeMesh.visible = false; planeMesh.visible = false; }
  }
  // Attack heli: circles at 25m, rotor spinning, shoots the nearest bot
  // every 0.8s (25 dmg + tracer), then flies away after 30s.
  function stepHeli(dt) {
    const h = S.heli;
    if (!h) return;
    h.t -= dt;
    heliRotor.rotation.y += dt * 18;
    if (h.t <= 0 && !h.leaving) { h.leaving = true; if (audio.rotor) audio.rotor(false); }
    if (h.leaving) {
      heliMesh.position.y += dt * 8;
      heliMesh.position.x += dt * 10;
      if (heliMesh.position.y > 60) { S.heli = null; heliMesh.visible = false; }
      return;
    }
    h.angle += dt * 0.35;
    const cx = 0, cz = 0;
    heliMesh.position.set(cx + Math.cos(h.angle) * 18, 25, cz + Math.sin(h.angle) * 18);
    heliMesh.rotation.y = -h.angle;
    h.shootT -= dt;
    if (h.shootT <= 0) {
      h.shootT = 0.8;
      let target = null, best = 45;
      for (const b of S.bots) {
        if (!b.alive || b.team === 'ally') continue;
        const d = Math.hypot(b.x - heliMesh.position.x, b.z - heliMesh.position.z);
        if (d < best) { best = d; target = b; }
      }
      if (target) {
        const from = { x: heliMesh.position.x, y: 24.4, z: heliMesh.position.z };
        if (fx) fx.tracer(from, { x: target.x, y: 1.2, z: target.z }, false);
        if (audio.shot) audio.shot('qq9');
        const killed = bots.damage(target, 25);
        if (killed) onKill(target, false);
      }
    }
  }
  function useOperator() {
    const p = S.player;
    if (S.phase !== 'playing' || !p.alive || S.opCd > 0) return;
    const def = OPERATOR_DEFS[S.operator];
    // Tune Up perk (v23.0.5): operator recharges 25% faster.
    S.opCd = def.cooldown * (hasPerk('tune_up') ? 0.75 : 1);
    if (S.operator === 'tempest') {
      S.opActive = true;
      S.msg = '⚡ TEMPEST READY — your next shot is a one-hit lightning bolt'; S.msgT = 3;
    } else if (S.operator === 'annihilator') {
      S.opActive = true; S.opShots = 6;
      S.msg = '🔫 ANNIHILATOR — next 6 shots deal 200 damage'; S.msgT = 3;
    } else if (S.operator === 'gravity') {
      let hits = 0;
      for (const b of S.bots) {
        if (!b.alive) continue;
        if (Math.hypot(b.x - p.x, b.z - p.z) < 8) { const killed = bots.damage(b, 80); if (killed) onKill(b, false); hits += 1; }
      }
      audio.explosion();
      S.msg = `💥 GRAVITY SPIKES — ${hits} bot${hits === 1 ? '' : 's'} slammed`; S.msgT = 3;
    } else if (S.operator === 'warmachine') {
      // War Machine (v20.0.7): lobs 6 HE grenades at the crosshair, one
      // every 0.15s, stepped in stepWarMachine.
      S.wmQueue = { n: 6, t: 0 };
      S.msg = '💣 WAR MACHINE — 6 granat meluncur!'; S.msgT = 3;
    } else if (S.operator === 'hive') {
      // H.I.V.E (v23.0.3): 3 trap mines around you (trip-mine mechanics).
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const mx = p.x + Math.cos(a) * 2.5, mz = p.z + Math.sin(a) * 2.5;
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), mineMat);
        mesh.position.set(mx, 0.2, mz); scene.add(mesh);
        S.tripmines.push({ x: mx, z: mz, mesh });
      }
      S.msg = '🐝 H.I.V.E — 3 trap mines deployed'; S.msgT = 3;
    } else if (S.operator === 'bull') {
      // Bull Charge (v23.0.3): 100 damage to bots in a 6m cone ahead.
      const fx2 = -Math.sin(p.yaw), fz2 = -Math.cos(p.yaw);
      let hits = 0;
      for (const b of S.bots) {
        if (!b.alive) continue;
        const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz);
        if (d < 6 && (dx * fx2 + dz * fz2) / Math.max(0.1, d) > 0.5) {
          const killed = bots.damage(b, 100); if (killed) onKill(b, false); hits += 1;
        }
      }
      if (audio.explosion) audio.explosion();
      S.msg = `🐂 BULL CHARGE — ${hits} bot${hits === 1 ? '' : 's'} trampled`; S.msgT = 3;
    } else if (S.operator === 'purifier') {
      // Purifier (v23.0.3): flamethrower cone 60 dmg + fire zone ahead.
      const fx2 = -Math.sin(p.yaw), fz2 = -Math.cos(p.yaw);
      let hits = 0;
      for (const b of S.bots) {
        if (!b.alive) continue;
        const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz);
        if (d < 8 && (dx * fx2 + dz * fz2) / Math.max(0.1, d) > 0.4) {
          const killed = bots.damage(b, 60); if (killed) onKill(b, false); hits += 1;
        }
      }
      const fzx = p.x + fx2 * 4, fzz = p.z + fz2 * 4;
      S.fireZones.push({ x: fzx, z: fzz, t: 5, tickT: 0, mesh: null });
      if (fx) fx.explosion({ x: fzx, y: 0.3, z: fzz }, false);
      S.msg = `🔥 PURIFIER — ${hits} bot${hits === 1 ? '' : 's'} burned`; S.msgT = 3;
    } else if (S.operator === 'sparrow') {
      // Sparrow (v23.0.3): explosive arrow — 150 blast 25m ahead.
      const tx = p.x - Math.sin(p.yaw) * 25, tz = p.z - Math.cos(p.yaw) * 25;
      if (fx) fx.explosion({ x: tx, y: 0.5, z: tz }, true);
      else if (audio.explosion) audio.explosion();
      areaDamage(tx, tz, 5, 150, 'sparrow');
      S.msg = '🏹 SPARROW — explosive arrow!'; S.msgT = 3;
    } else if (S.operator === 'tak5') {
      // Tak-5 (v23.0.3): heal to full + revive knocked ally bots.
      p.hp = S.maxHp;
      let n = 0;
      for (const b of S.bots) {
        if (b.team === 'ally' && b.knocked) { b.knocked = false; b.alive = true; b.hp = 50; n += 1; }
      }
      S.msg = `💚 TAK-5 — healed to full${n ? `, revived ${n} ally bot${n === 1 ? '' : 's'}` : ''}`; S.msgT = 3;
    } else if (S.operator === 'k9') {
      // K9 Unit (v23.0.3): attack dog hunts the nearest bot for 30s.
      S.k9 = { t: 30, biteT: 0 };
      k9Mesh.position.set(p.x + 1, 0, p.z + 1);
      k9Mesh.visible = true;
      S.msg = '🐕 K9 UNIT — attack dog deployed!'; S.msgT = 3;
    }
    audio.operator();
    hud.refreshOperator();
  }
  // Throwables (v20.0.11): Molotov (fire zone 5s), C4 (place, press again
  // to detonate), Trip Mine (blows when an enemy walks within 1.5m).
  function throwThrowable(kind, camera) {
    const p = S.player;
    const g = S.grenades;
    if (kind === 'molotov') {
      if ((g.molotov || 0) <= 0) { S.msg = 'NO MOLOTOV LEFT'; S.msgT = 1.5; return; }
      g.molotov -= 1;
      const fx2 = -Math.sin(p.yaw), fz2 = -Math.cos(p.yaw);
      g.flying.push({ kind: 'molotov', x: p.x + fx2 * 0.5, y: p.y + p.eye - 0.2, z: p.z + fz2 * 0.5, vx: fx2 * 12, vy: 3, vz: fz2 * 12 });
      grenadeMesh.visible = true;
      if (audio.pin) audio.pin();
      S.msg = 'MOLOTOV OUT'; S.msgT = 1.5;
    } else if (kind === 'c4') {
      if (S.c4) { // press again: detonate
        const c = S.c4;
        if (fx) fx.explosion({ x: c.x, y: 0.5, z: c.z }, true);
        else if (audio.explosion) audio.explosion();
        areaDamage(c.x, c.z, 5, 150, 'c4');
        scene.remove(c.mesh); S.c4 = null;
        return;
      }
      if ((g.c4 || 0) <= 0) { S.msg = 'NO C4 LEFT'; S.msgT = 1.5; return; }
      g.c4 -= 1;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.25), c4Mat);
      mesh.position.set(p.x, 0.15, p.z); scene.add(mesh);
      S.c4 = { x: p.x, z: p.z, mesh };
      S.msg = '💣 C4 dipasang — tekan 0 lagi untuk meledakkan'; S.msgT = 2;
    } else if (kind === 'tripmine') {
      if ((g.tripmine || 0) <= 0) { S.msg = 'NO TRIP MINE LEFT'; S.msgT = 1.5; return; }
      g.tripmine -= 1;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), mineMat);
      mesh.position.set(p.x, 0.2, p.z); scene.add(mesh);
      S.tripmines.push({ x: p.x, z: p.z, mesh });
      S.msg = '💥 Trip mine dipasang'; S.msgT = 2;
    } else if (kind === 'trophy') {
      // Trophy System (v23.0.6): blocks 3 bot hits within 10m for 20s.
      if ((g.trophy || 0) <= 0) { S.msg = 'NO TROPHY SYSTEM LEFT'; S.msgT = 1.5; return; }
      g.trophy -= 1;
      S.trophySys = { x: p.x, z: p.z, t: 20, blocks: 3 };
      S.msg = '🛡️ TROPHY SYSTEM — blocks 3 bot hits (20s)'; S.msgT = 2;
    } else if (kind === 'gas') {
      // Gas grenade (v23.0.6): thrown, detonates into a damaging cloud.
      if ((g.gas || 0) <= 0) { S.msg = 'NO GAS GRENADE LEFT'; S.msgT = 1.5; return; }
      g.gas -= 1;
      const fx2 = -Math.sin(p.yaw), fz2 = -Math.cos(p.yaw);
      g.flying.push({ kind: 'gas', x: p.x + fx2 * 0.5, y: p.y + p.eye - 0.2, z: p.z + fz2 * 0.5, vx: fx2 * 12, vy: 3, vz: fz2 * 12 });
      grenadeMesh.visible = true;
      if (audio.pin) audio.pin();
      S.msg = '☣️ GAS GRENADE OUT'; S.msgT = 1.5;
    } else if (kind === 'cryo') {
      // Cryo bomb (v23.0.6): thrown, freezes bots within 5m for 3s.
      if ((g.cryo || 0) <= 0) { S.msg = 'NO CRYO BOMB LEFT'; S.msgT = 1.5; return; }
      g.cryo -= 1;
      const fx2 = -Math.sin(p.yaw), fz2 = -Math.cos(p.yaw);
      g.flying.push({ kind: 'cryo', x: p.x + fx2 * 0.5, y: p.y + p.eye - 0.2, z: p.z + fz2 * 0.5, vx: fx2 * 12, vy: 3, vz: fz2 * 12 });
      grenadeMesh.visible = true;
      if (audio.pin) audio.pin();
      S.msg = '❄️ CRYO BOMB OUT'; S.msgT = 1.5;
    }
  }
  function stepThrowables(dt) {
    // Molotov fire zones: 0.5s ticks, 10 dmg/s to bots within 3m.
    for (let i = S.fireZones.length - 1; i >= 0; i--) {
      const f = S.fireZones[i];
      f.t -= dt; f.tickT = (f.tickT || 0) - dt;
      if (f.mesh) { f.mesh.scale.setScalar(1 + Math.sin(S.time * 8 + i) * 0.15); f.mesh.material.opacity = Math.max(0.1, f.t / 5 * 0.5); }
      if (f.tickT <= 0) {
        f.tickT = 0.5;
        for (const b of S.bots) {
          if (!b.alive) continue;
          if (Math.hypot(b.x - f.x, b.z - f.z) < 3) { const killed = bots.damage(b, 5); if (killed) onKill(b, false); }
        }
        // Fire spread (v24.0.8): tall grass near a fire zone catches fire
        // and burns black (v22.3.6) via the prop-damage path.
        for (const s of world.shootables) {
          const ud = s.userData || {};
          if (ud.propType === 'tall-grass' && !ud.burnt && Math.hypot((ud.x ?? s.position.x) - f.x, (ud.z ?? s.position.z) - f.z) < 2) {
            ud.burnt = true;
            if (s.material && s.material.color) s.material.color.set(0x1a1a1a);
            if (fx) fx.smokePuff(s.position.x, 0.8, s.position.z);
          }
        }
        if (fx) fx.smokePuff(f.x, 0.6, f.z);
      }
      if (f.t <= 0) { if (f.mesh) { f.mesh.visible = false; } S.fireZones.splice(i, 1); }
    }
    // Trip mines: an enemy within 1.5m detonates it (4m, 120 dmg).
    for (let i = S.tripmines.length - 1; i >= 0; i--) {
      const t = S.tripmines[i];
      let trip = false;
      for (const b of S.bots) {
        if (!b.alive || b.team === 'ally') continue;
        if (Math.hypot(b.x - t.x, b.z - t.z) < 1.5) { trip = true; break; }
      }
      if (trip) {
        if (fx) fx.explosion({ x: t.x, y: 0.5, z: t.z }, false);
        else if (audio.explosion) audio.explosion();
        areaDamage(t.x, t.z, 4, 120, 'tripmine');
        scene.remove(t.mesh);
        S.tripmines.splice(i, 1);
      }
    }
  }
  // War Machine queue: one HE grenade every 0.15s toward the crosshair.
  function stepWarMachine(dt) {
    const q = S.wmQueue;
    if (!q) return;
    q.t -= dt;
    if (q.t <= 0 && q.n > 0) {
      q.t = 0.15; q.n -= 1;
      const p = S.player;
      const fx2 = -Math.sin(p.yaw) * Math.cos(p.pitch), fz2 = -Math.cos(p.yaw) * Math.cos(p.pitch);
      S.grenades.flying.push({
        kind: 'he', x: p.x + fx2 * 0.5, y: p.y + p.eye - 0.2, z: p.z + fz2 * 0.5,
        vx: fx2 * 14, vy: 2 + Math.sin(p.pitch) * 10, vz: fz2 * 14,
      });
      grenadeMesh.visible = true;
      if (q.n <= 0) S.wmQueue = null;
    }
  }
  // Loot crates (v20.0.2): E opens the nearest unopened yellow crate.
  function openCrate() {
    const c = world.nearestCrate(S.player.x, S.player.z);
    if (!c) return false;
    c.opened = true;
    if (c.mesh) c.mesh.visible = false;
    const roll = Math.random();
    const p = S.player;
    if (roll < 0.4) { // weapon
      const idx = Math.floor(Math.random() * S.weapons.length);
      S.loadout.primary = idx; p.weaponIdx = idx;
      const w = S.weapons[idx];
      w.mag = w.magSize; w.reserve = Math.max(w.reserve, w.magSize * 2);
      hud.killfeed(`📦 CRATE: ${w.name}!`);
    } else if (roll < 0.6) { // armor
      p.armor = Math.min(100, p.armor + 50);
      hud.killfeed('📦 CRATE: +50 Armor');
    } else if (roll < 0.8) { // medkit
      S.medkits = Math.min(3, (S.medkits || 0) + 1);
      hud.killfeed(`📦 CRATE: Medkit +1 (${S.medkits}/3)`);
    } else if (roll < 0.9) { // ammo
      const w = S.weapons[p.weaponIdx];
      w.reserve += 60;
      hud.killfeed('📦 CRATE: +60 Ammo');
    } else { // RPG
      S.loadout.primary = 11; p.weaponIdx = 11;
      const w = S.weapons[11];
      w.mag = w.magSize; w.reserve = Math.max(w.reserve, 2);
      hud.killfeed('📦 CRATE: RPG-7!');
    }
    if (audio.coin) audio.coin();
    return true;
  }
  // Ammo boxes (v19.0.9): green boxes, +60 reserve when approached.
  function stepAmmoBoxes(dt) {
    const p = S.player;
    if (!world.ammoBoxes) return;
    for (const b of world.ammoBoxes) {
      if (b.taken) continue;
      if (p.alive && Math.hypot(p.x - b.x, p.z - b.z) < 1.2) {
        b.taken = true;
        if (b.mesh) b.mesh.visible = false;
        const w = S.weapons[p.weaponIdx];
        w.reserve += 60;
        hud.killfeed('🧰 AMMO BOX: +60 reserve');
        if (audio.coin) audio.coin();
      }
    }
  }
  // Corpse ammo (v19.0.8): walk over a corpse for +50% of its weapon mag.
  function stepCorpseAmmo(dt) {
    const p = S.player;
    if (!p.alive) return;
    for (const b of S.bots) {
      if (b.alive || b.ammoTaken || (b.corpseT || 0) <= 0) continue;
      if (Math.hypot(p.x - b.x, p.z - b.z) < 1.5) {
        b.ammoTaken = true;
        const idx = { ax117: 2, kb50: 3, vx9: 4, mp5: 0 }[b.weapon] ?? 0;
        const w = S.weapons[idx];
        const gain = Math.round(w.magSize * 0.5);
        w.reserve += gain;
        hud.killfeed(`🧰 AMMO: +${gain} from BOT-${b.id + 1}`);
      }
    }
  }
  // Hardpoint (v20.0.12): center point (0,0) r 5, 1 pt/s inside, first to 50.
  function stepHardpoint(dt) {
    const p = S.player;
    const r = 5;
    if (p.alive && Math.hypot(p.x, p.z) < r) S.hardpoint.you += dt;
    for (const b of S.bots) if (b.alive && Math.hypot(b.x, b.z) < r) S.hardpoint.bot += dt;
    if (S.hardpoint.you >= 50) { endRound(true, 'HARDPOINT — 50 POINTS'); return; }
    if (S.hardpoint.bot >= 50) { endRound(false, 'HARDPOINT — BOTS REACHED 50'); }
  }
  // Control (v22.0.6): capture A and B; win when both are yours.
  function stepControl(dt) {
    const p = S.player;
    if (!S.controlPts) S.controlPts = { A: 0, B: 0 };
    for (const key of ['A', 'B']) {
      const s = world.sites[key];
      const pIn = p.alive && Math.hypot(p.x - s.x, p.z - s.z) < s.r;
      let bIn = false;
      for (const b of S.bots) if (b.alive && Math.hypot(b.x - s.x, b.z - s.z) < s.r) { bIn = true; break; }
      if (pIn && !bIn) S.controlPts[key] = Math.min(100, S.controlPts[key] + 20 * dt);
      else if (bIn && !pIn) S.controlPts[key] = Math.max(-100, S.controlPts[key] - 20 * dt);
      const owner = S.controlPts[key] >= 100 ? 'you' : S.controlPts[key] <= -100 ? 'bot' : null;
      if (owner && owner !== S.control[key]) {
        S.control[key] = owner;
        hud.killfeed(owner === 'you' ? `🟢 CONTROL ${key} CAPTURED` : `🔴 CONTROL ${key} LOST`);
      }
    }
    if (S.control.A === 'you' && S.control.B === 'you') { endRound(true, 'CONTROL — BOTH POINTS HELD'); return; }
    if (S.control.A === 'bot' && S.control.B === 'bot') { endRound(false, 'CONTROL — BOTS HOLD BOTH POINTS'); return; }
    if (S.round.timer <= 0) endRound((S.control.A === 'you') + (S.control.B === 'you') > 0, 'TIME UP');
  }
  // Prop Hunt (v22.0.5): hide 20s as a box/chair; caught = death.
  function stepPropHunt(dt) {
    S.round.timer -= 0; // timer already ticks in step()
    if (S.round.timer <= 0) { endRound(true, 'PROP HUNT — NOT FOUND!'); return; }
    if (!S.player.alive) { endRound(false, 'PROP HUNT — CAUGHT!'); }
  }
  // Kill Confirmed (v23.0.1): walk over a dropped tag to collect it.
  function stepKillConfirmed(dt) {
    const p = S.player;
    for (let i = S.kcTags.length - 1; i >= 0; i--) {
      const t = S.kcTags[i]; t.t -= dt;
      if (t.t <= 0) { scene.remove(t.mesh); S.kcTags.splice(i, 1); continue; }
      if (p.alive && Math.hypot(p.x - t.x, p.z - t.z) < 1.2) {
        scene.remove(t.mesh); S.kcTags.splice(i, 1);
        S.kcScore = (S.kcScore || 0) + 1;
        hud.killfeed(`🏷️ TAG COLLECTED — ${S.kcScore}/20`);
        if (S.kcScore >= MODE_DEFS.killconfirmed.target) endRound(true, 'KILL CONFIRMED — 20 TAGS!');
      }
    }
  }
  // Gas clouds (v23.0.6): 5 dmg/s to bots inside.
  function stepGasClouds(dt) {
    for (let i = S.gasClouds.length - 1; i >= 0; i--) {
      const c = S.gasClouds[i]; c.t -= dt;
      if (c.t <= 0) { S.gasClouds.splice(i, 1); continue; }
      for (const b of S.bots) {
        if (!b.alive) continue;
        if (Math.hypot(b.x - c.x, b.z - c.z) < c.r) { const killed = bots.damage(b, 5 * dt); if (killed) onKill(b, false); }
      }
    }
  }
  // K9 attack dog (v23.0.3): chases the nearest bot, bites for 20 dmg/s.
  function stepK9(dt) {
    const k = S.k9;
    if (!k) return;
    k.t -= dt; k.biteT -= dt;
    if (k.t <= 0) { S.k9 = null; k9Mesh.visible = false; return; }
    let target = null, best = 1e9;
    for (const b of S.bots) {
      if (!b.alive || b.team === 'ally') continue;
      const d = Math.hypot(b.x - k9Mesh.position.x, b.z - k9Mesh.position.z);
      if (d < best) { best = d; target = b; }
    }
    if (!target) return;
    const dx = target.x - k9Mesh.position.x, dz = target.z - k9Mesh.position.z;
    const d = Math.hypot(dx, dz) || 1;
    k9Mesh.position.x += (dx / d) * 7 * dt;
    k9Mesh.position.z += (dz / d) * 7 * dt;
    k9Mesh.rotation.y = Math.atan2(dx, dz);
    if (d < 1.2 && k.biteT <= 0) {
      k.biteT = 1;
      const killed = bots.damage(target, 20);
      if (killed) onKill(target, false);
    }
  }
  // Predator missile (v23.0.4) + VTOL passes (v23.0.4) + Restock (v23.0.5).
  function stepPredator(dt) {
    if (!predator) return;
    predator.t -= dt;
    if (predator.t <= 0) {
      if (fx) fx.explosion({ x: predator.x, y: 0.5, z: predator.z }, true);
      else if (audio.explosion) audio.explosion();
      areaDamage(predator.x, predator.z, 8, 150, 'predator');
      predator = null;
    }
  }
  function stepVtol(dt) {
    if (!S.vtolPasses || S.vtolPasses <= 0) return;
    vtolT -= dt;
    if (vtolT > 0) return;
    vtolT = 1.5;
    S.vtolPasses -= 1;
    const alive = S.bots.filter(b => b.alive && b.team !== 'ally');
    if (!alive.length) return;
    const t = alive[Math.floor(Math.random() * alive.length)];
    if (fx) fx.explosion({ x: t.x, y: 0.5, z: t.z }, true);
    const killed = bots.damage(t, 100);
    if (killed) onKill(t, false);
    hud.killfeed(`🛩️ VTOL pass — ${S.vtolPasses} left`);
  }
  function stepRestock(dt) {
    if (!hasPerk('restock')) return;
    restockT -= dt;
    if (restockT <= 0) {
      restockT = 30;
      const g = S.grenades;
      g.he = Math.min(3, (g.he || 0) + 1); g.smoke = Math.min(3, (g.smoke || 0) + 1); g.flash = Math.min(2, (g.flash || 0) + 1);
      hud.killfeed('🔄 RESTOCK — grenades refilled');
    }
  }
  // World events (v27.0.7): one dispatcher — earthquake, fireworks,
  // rainbow, night market. Reuses weather/effects, no second system.
  function triggerEvent(name) {
    if (name === 'quake') {
      if (fx) fx.shake(0.8);
      S.msg = '🌋 GEMPA! Layar berguncang'; S.msgT = 2;
    } else if (name === 'fireworks') {
      for (let i = 0; i < 3; i++) {
        const x = (Math.random() - 0.5) * 40, z = (Math.random() - 0.5) * 30;
        if (fx) fx.explosion({ x, y: 12 + i * 3, z }, false);
      }
      if (audio.explosion) audio.explosion();
      S.msg = '🎆 KEMBANG API!'; S.msgT = 2;
    } else if (name === 'rainbow') {
      if (cbs.onRainbow) cbs.onRainbow();
      S.msg = '🌈 PELANGI muncul!'; S.msgT = 2;
    } else if (name === 'nightmarket') {
      S.economy.money += 50;
      S.msg = '🌙 PASAR MALAM — +50 coin bonus!'; S.msgT = 3;
    }
  }
  // BR plane fly-over + parachute (v20.0.1 / v22.0.1).
  function stepBrPlane(dt) {
    if (S.planeT > 0) {
      S.planeT -= dt;
      brPlaneMesh.position.x += dt * 45;
      const p = S.player;
      p.x = brPlaneMesh.position.x; p.z = brPlaneMesh.position.z; p.y = 50;
      if (S.planeT <= 0) {
        S.parachuting = true;
        brPlaneMesh.visible = false;
        if (audio.parachute) audio.parachute();
        S.msg = '🪂 Terjun! Arahkan ke zona aman'; S.msgT = 2;
      }
    }
  }
  function step(dt, keys) {
    if (S.phase !== 'playing') return;
    // Countdown 3-2-1: nothing moves or ticks until it reaches 0.
    if (S.countdownT > 0) { S.countdownT -= dt; return; }
    S.round.timer -= dt;
    if (S.uavT > 0) S.uavT -= dt;
    if (S.opCd > 0) { S.opCd -= dt; if (S.opCd < 0) S.opCd = 0; }
    stepAirstrike(dt); // plane flyover + 3 sequential blasts
    stepHeli(dt); // circling attack heli
    stepFlyingGrenades(dt); // grenade arcs + detonations
    updateAim(); // grenade aim preview follows the player's aim
    stepDropped(dt); // dropped weapons spin + expire after 30s
    stepPendingBooms(dt); // delayed car explosions
    stepSmokingCars(dt); // smoking cars puff smoke while damaged
    // HP regen (v18.1.14): 5s without damage, then 2 HP per 0.5s
    // (4 HP/s; Quick Fix doubles it to 8 HP/s).
    const p = S.player;
    if (p.alive && p.hp > 0 && p.hp < 100 && S.time - p.lastHurtT > 5) {
      p.hp = Math.min(100, p.hp + (hasPerk('quickfix') ? 8 : 4) * dt);
    }
    // Knock timer (BR, v18.8.7): crawl to an ally — 3s of contact revives
    // you at 50 HP; the timer running out kills you for real.
    if (p.knocked) {
      S.knockT -= dt;
      const allyNear = S.bots.some(b => b.alive && b.team === 'ally' && Math.hypot(b.x - p.x, b.z - p.z) < 3);
      if (allyNear) {
        S.knockReviveT = (S.knockReviveT || 0) + dt;
        if (S.knockReviveT >= 3) {
          p.knocked = false; p.hp = 50; S.knockT = 0; S.knockReviveT = 0;
          hud.killfeed('💚 REVIVED by your ally!');
        }
      } else S.knockReviveT = 0;
      if (S.knockT <= 0) playerDies(S.lastKiller);
    }
    // Sentry auto-fire (allies are never targeted, v19.1.6)
    if (S.sentry) {
      const s = S.sentry;
      s.t -= dt;
      if (s.t <= 0) { S.sentry = null; sentryMesh.visible = false; }
      else {
        s.shootT -= dt;
        let target = null, best = 30;
        for (const b of S.bots) {
          if (!b.alive || b.team === 'ally') continue;
          const d = Math.hypot(b.x - s.x, b.z - s.z);
          if (d < best) { best = d; target = b; }
        }
        if (target) {
          sentryGun.lookAt(target.x, 1.2, target.z);
          if (s.shootT <= 0) {
            s.shootT = 0.5;
            // Muzzle flash: tracer from the gun tip to the target.
            if (fx) fx.tracer({ x: s.x, y: 0.9, z: s.z }, { x: target.x, y: 1.2, z: target.z }, false);
            const killed = bots.damage(target, 25);
            if (killed) onKill(target, false);
          }
        }
      }
    }
    // Smoke decay
    for (let i = 0; i < S.grenades.smokes.length; i++) {
      const s = S.grenades.smokes[i]; s.t -= dt;
      if (s.t <= 0) { smokeMeshes[i] && (smokeMeshes[i].visible = false); }
    }
    stepWarMachine(dt);
    stepThrowables(dt);
    stepAmmoBoxes(dt);
    stepCorpseAmmo(dt);
    stepBrPlane(dt);
    stepGasClouds(dt); // v23.0.6 gas clouds
    stepK9(dt); // v23.0.3 attack dog
    stepPredator(dt); // v23.0.4 predator missile
    stepVtol(dt); // v23.0.4 VTOL passes
    stepRestock(dt); // v23.0.5 restock perk refill
    // Trophy system decay (v23.0.6) + spawn protection decay (v25.0.8).
    if (S.trophySys) { S.trophySys.t -= dt; if (S.trophySys.t <= 0) S.trophySys = null; }
    if (S.spawnProtT > 0) S.spawnProtT -= dt;
    if (S.freezeT > 0) S.freezeT -= dt; // v27.0 freeze slow
    // Medkit channel (v19.0.14): +33 HP/s while channelling.
    if (S.medkitChannel > 0) {
      S.medkitChannel -= dt;
      p.hp = Math.min(100, p.hp + 33 * dt);
      if (S.medkitChannel <= 0) { S.medkitChannel = 0; hud.killfeed('💊 Healed to full'); }
    }
    // Generator lights-out countdown (v19.2.12).
    if (S.lightsOutT > 0) {
      S.lightsOutT -= dt;
      if (S.lightsOutT <= 0 && world.setLightsOut) world.setLightsOut(false);
    }
    if (S.mode === 'snd') stepSnd(dt, keys);
    else if (S.mode === 'tdm') stepTdm(dt);
    else if (S.mode === 'dom') stepDom(dt);
    else if (S.mode === 'br') { stepBr(dt); stepLoot(dt); }
    else if (S.mode === 'zombie') stepZombie(dt);
    else if (S.mode === 'hardpoint') stepHardpoint(dt);
    else if (S.mode === 'control') stepControl(dt);
    else if (S.mode === 'prophunt') stepPropHunt(dt);
    else if (S.mode === 'killconfirmed') stepKillConfirmed(dt);
    else if (S.mode === 'ffa') { if (S.ffaKills >= MODE_DEFS.ffa.target) endRound(true, 'FFA — 20 KILLS!'); }
    else if (S.mode === 'sniperonly') { if (S.round.timer <= 0) endRound(S.ffaKills >= MODE_DEFS.sniperonly.target, 'SNIPER ONLY — TIME UP'); }
    else if (S.mode === 'gungame') { if (S.round.timer <= 0) endRound(S.ggIdx >= 4, 'TIME UP'); }
  }
  function stepZombie(dt) {
    const z = cbs.zombie;
    if (!z) return;
    S.zombieInfo = { wave: z.wave, alive: z.aliveCount(), intermissionT: z.intermissionT, done: z.done };
    if (z.done) { endRound(true, 'ALL 20 WAVES CLEARED — YOU SURVIVED'); return; }
    if (!S.player.alive) { endRound(false, 'OVERRUN BY ZOMBIES'); return; }
  }
  function stepSnd(dt, keys) {
    // Plant: hold E near a site
    const site = nearestSite();
    if (S.bomb.state === 'none' && site && keys.has('KeyE') && S.player.alive) {
      S.bomb.plantT += dt;
      hud.plantBar(true, S.bomb.plantT / 4, 'PLANTING…');
      if (S.bomb.plantT >= 4) {
        S.bomb.state = 'planted'; S.bomb.site = site;
        const s = world.sites[site];
        S.bomb.x = s.x; S.bomb.z = s.z; S.bomb.fuse = 40;
        bombMesh.position.set(s.x, 0.25, s.z); bombMesh.visible = true;
        audio.plant();
        S.msg = `CHARGE PLANTED AT ${s.name.toUpperCase()} — DEFEND IT`; S.msgT = 4;
        hud.killfeed(`CHARGE PLANTED — ${s.name}`);
        hud.plantBar(false, 0, '');
      }
    } else {
      S.bomb.plantT = Math.max(0, S.bomb.plantT - dt * 2);
      if (S.bomb.state === 'none') hud.plantBar(false, 0, '');
    }
    if (S.bomb.state === 'defused') { endRound(false, 'CHARGE DEFUSED'); return; }
    if (S.bomb.state === 'planted') {
      S.bomb.fuse -= dt;
      beepT -= dt;
      if (beepT <= 0) { beepT = S.bomb.fuse < 10 ? 0.4 : 1; if (audio.bombBeep) audio.bombBeep(S.bomb.fuse < 10); else audio.beep(); }
      bombLight.material.color.setHex(Math.floor(S.time * 4) % 2 ? 0xff3b30 : 0xffffff);
      if (S.bomb.defuseT > 0) hud.plantBar(true, S.bomb.defuseT / 7, 'ENEMY DEFUSING…');
      if (S.bomb.fuse <= 0) {
        bombMesh.visible = false; audio.explosion();
        endRound(true, 'CHARGE DETONATED'); return;
      }
    }
    if (S.round.timer <= 0) {
      endRound(false, S.bomb.state === 'planted' ? 'TIME UP' : 'TIME EXPIRED — NO PLANT');
      return;
    }
    if (!S.player.alive) { endRound(false, 'YOU WERE ELIMINATED'); return; }
    const alive = S.bots.filter(b => b.alive).length;
    if (alive === 0) { endRound(true, S.bomb.state === 'planted' ? 'SITE CLEARED — CHARGE STANDS' : 'ALL HOSTILES ELIMINATED'); }
  }
  function stepTdm(dt) {
    const p = S.player;
    if (!p.alive && !S.spectate) {
      p.respawnT -= dt;
      if (p.respawnT <= 0) {
        resetPlayer();
        S.msg = 'YOU ARE BACK IN THE FIGHT'; S.msgT = 2;
      }
    }
    if (S.round.timer <= 0) {
      endRound(S.kills > S.botKills, `TIME UP — ${S.kills} - ${S.botKills}`);
      return;
    }
    if (S.botKills >= MODE_DEFS.tdm.target) { endRound(false, `TEAM DEATHMATCH — BOTS REACHED ${MODE_DEFS.tdm.target}`); }
  }
  function stepDom(dt) {
    const p = S.player;
    if (!p.alive && !S.spectate) {
      p.respawnT -= dt;
      if (p.respawnT <= 0) { resetPlayer(); S.msg = 'YOU ARE BACK IN THE FIGHT'; S.msgT = 2; }
    }
    // Zone capture: player in a zone pushes it toward you, bots toward them.
    for (const key of ['A', 'B', 'C']) {
      const z = S.dom[key], s = world.sites[key];
      const pIn = p.alive && Math.hypot(p.x - s.x, p.z - s.z) < s.r;
      let bIn = false;
      for (const b of S.bots) if (b.alive && Math.hypot(b.x - s.x, b.z - s.z) < s.r) { bIn = true; break; }
      if (pIn && !bIn) z.value = Math.min(100, z.value + 20 * dt);
      else if (bIn && !pIn) z.value = Math.max(-100, z.value - 20 * dt);
      const owner = z.value >= 100 ? 'you' : z.value <= -100 ? 'bot' : null;
      if (owner && owner !== z.owner) {
        z.owner = owner;
        hud.killfeed(owner === 'you' ? `🟢 ZONE ${key} CAPTURED` : `🔴 ZONE ${key} LOST TO BOTS`);
      }
    }
    // Points tick: 1 per second per owned zone.
    for (const key of ['A', 'B', 'C']) {
      const z = S.dom[key];
      if (z.owner === 'you') S.dom.points.you += dt;
      else if (z.owner === 'bot') S.dom.points.bot += dt;
    }
    if (S.dom.points.you >= 100) { endRound(true, 'DOMINATION — 100 POINTS'); return; }
    if (S.dom.points.bot >= 100) { endRound(false, 'DOMINATION — BOTS REACHED 100'); return; }
    if (S.round.timer <= 0) {
      endRound(S.dom.points.you > S.dom.points.bot, `TIME UP — ${Math.floor(S.dom.points.you)} - ${Math.floor(S.dom.points.bot)}`);
    }
  }
  function stepBr(dt) {
    const p = S.player;
    // Zone shrinks from 40 to 10 over 120 seconds.
    S.br.shrinkT += dt;
    const k = Math.min(1, S.br.shrinkT / 120);
    S.br.radius = 40 - 30 * k;
    world.brRing.scale.setScalar(S.br.radius);
    if (p.alive) {
      const d = Math.hypot(p.x - S.br.cx, p.z - S.br.cz);
      if (d > S.br.radius) {
        p.hp -= 5 * dt; p.lastHurtT = S.time;
        if (p.hp <= 0) { p.hp = 0; p.alive = false; }
      }
    }
    if (!p.alive) { endRound(false, 'ELIMINATED OUTSIDE THE ZONE'); return; }
    const alive = S.bots.filter(b => b.alive).length;
    if (alive === 0) { endRound(true, 'LAST MAN STANDING — ALL BOTS ELIMINATED'); return; }
    if (S.round.timer <= 0) { endRound(true, `ZONE CLOSED — YOU SURVIVED (${alive} bots left)`); }
  }
  // Forced respawn (spectator exit, or the self-test).
  function respawnPlayer() {
    if (S.player.alive) return;
    resetPlayer();
    S.msg = 'YOU ARE BACK IN THE FIGHT'; S.msgT = 2;
  }
  return { startRound, endRound, nextRound, toggleBuy, buy, throwGrenade, throwThrowable, startGrenadeAim, releaseGrenadeAim, cancelGrenadeAim, aimState: () => ({ aiming, landing: aimLand, arcVisible: arcLine.visible, dots: arcDots.map(d => [d.position.x, d.position.y, d.position.z, d.scale.x]), lineEnd: [arcGeo.attributes.position.getX(ARC_PTS - 1), arcGeo.attributes.position.getY(ARC_PTS - 1), arcGeo.attributes.position.getZ(ARC_PTS - 1)] }), onKill, useStreak, useBestStreak, useOperator, hurtPlayer, step, buyHtml, useMedkit, useArmor, respawnPlayer, damageProp, damagePropHit, openCrate, dropWeapon, pickupDropped, triggerEvent, areaDamage, droppedCount: () => S.droppedWeapons.length, lootCount: () => lootItems.filter(i => !i.taken).length };
}
