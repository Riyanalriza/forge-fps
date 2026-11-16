// Weapons: loadout of 21 (WEAPONS_DB). Fire / reload / spread / recoil.
// First-person hands hold the gun; Gunsmith attachments change the effective stats.
// Raycast vs bot hitboxes; shotguns fire 8 pellets; launchers/crossbow fire
// real projectiles; melee swings in an arc. Mythic skins recolor the viewmodel
// and shed particles; operator skills (Tempest / Annihilator) modify the shots.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { WEAPONS, MYTHIC_DEFS, calcBulletDrop, calcTravelTime } from './state.js';
import { createFirstPersonHands } from './characters.js';
import { calcGunStats, damageAtRange, WEAPON_CAMOS } from './gunsmith.js';
import { fxFor } from './weaponfx.js';

const _dir = new THREE.Vector3();
const _cam = new THREE.Vector3();
const _tip = new THREE.Vector3();
const _baseDir = new THREE.Vector3();
const _tmpV = new THREE.Vector3();
const _tmpV2 = new THREE.Vector3();
const _prev = new THREE.Vector3();
const _colA = new THREE.Color();
const _colB = new THREE.Color();
// Mythic tracer colors (v18.5.12): dragon = orange fire, void = purple.
const MYTHIC_TRACER = { dragon: 0xff7a1a, void: 0xaa44ff };

export function createWeapon(scene, camera, S, audio, effects, cbs = {}) {
  const ray = new THREE.Raycaster();
  ray.far = 120;
  // First-person hands + gun viewmodel attached to the camera.
  const hands = createFirstPersonHands(S);
  // Shot-mode close-up (dossier play shot only): bigger viewmodel so the
  // rounded hands read clearly. Gameplay always uses 0.62.
  const shotPlay = new URLSearchParams(location.search).get('shot') === 'play';
  hands.group.scale.setScalar(shotPlay ? 0.76 : 0.62);
  hands.group.position.set(shotPlay ? 0.17 : 0.2, shotPlay ? -0.13 : -0.16, -0.8);
  camera.add(hands.group);
  const fillLight = new THREE.PointLight(0xdfe8ff, 1.0, 2, 2);
  fillLight.position.set(0.25, -0.05, -0.35);
  camera.add(fillLight);
  scene.add(camera);
  const gun = hands.group; // the whole viewmodel (hands + gun), for positioning

  // Mythic particle pool (glowing motes shed from the barrel tip)
  const moteGeo = new THREE.SphereGeometry(0.02, 6, 6);
  const motes = [];
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(moteGeo, new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0 }));
    m.visible = false; scene.add(m);
    motes.push({ mesh: m, life: 0, vx: 0, vy: 0, vz: 0 });
  }
  let moteIdx = 0, moteT = 0;
  let inspectT = 0; // weapon inspect animation (1s gun tilt + spin)
  let lastEmptyClick = -9; // rate-limit the empty-click sound (v18.1.1)
  // Sniper travel time (v18.9): hits resolve 200ms after the shot.
  const pendingShots = []; // {bot, head, w, point, t, dmgOverride}
  // Flying projectiles (v18.5): rockets / FHJ / thumper grenades / arrows.
  const projectiles = []; // {kind, mesh, vel, life, maxLife, dmg, blastR, target}
  // Laser sight (v18.8): red line + dot from the gun tip.
  const laserMat = new THREE.LineBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.9 });
  const laserGeo = new THREE.BufferGeometry();
  laserGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const laserLine = new THREE.Line(laserGeo, laserMat);
  laserLine.visible = false; laserLine.frustumCulled = false;
  scene.add(laserLine);
  const laserDot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  laserDot.visible = false; scene.add(laserDot);
  let meleeSwingT = 0; // katana swing animation timer

  // Lightning bolt visual for Tempest (line from muzzle to hit point)
  const boltMat = new THREE.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0 });
  const boltGeo = new THREE.BufferGeometry();
  boltGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const bolt = new THREE.Line(boltGeo, boltMat);
  bolt.visible = false; bolt.frustumCulled = false;
  scene.add(bolt);
  let boltT = 0;

  // Gunsmith: write the effective stats (base + attachments) onto each weapon.
  function applyGunsmith() {
    S.weapons.forEach((w, i) => {
      const eff = calcGunStats(WEAPONS[i], S.atts);
      w.dmg = eff.damage; w.spread = eff.spread; w.reload = eff.reload;
      w.magSize = eff.magSize; w.recoil = eff.recoil; w.range = eff.range;
      w.adsSpeed = eff.ads; w.scopeZoom = eff.zoom;
      if (w.mag > w.magSize) w.mag = w.magSize;
    });
    hands.buildGun(cur(), MYTHIC_DEFS[S.mythic] || MYTHIC_DEFS.none);
  }
  function applyMythic() {
    hands.buildGun(cur(), MYTHIC_DEFS[S.mythic] || MYTHIC_DEFS.none);
  }
  function cur() { return S.weapons[S.player.weaponIdx]; }
  function spread() {
    const w = cur(), p = S.player;
    let s = w.spread;
    if (p.moving) s *= 1.9;
    if (p.crouched) s *= 0.65;
    if (p.prone) s *= 0.5; // prone is the steadiest stance (was 0.7 — worse than crouch 0.6, backwards)
    if (S.ads) s *= 0.6; // ADS steadies the aim
    if (!p.onGround) s *= 2.2;
    return s + p.spreadBloom;
  }
  function ready() {
    const w = cur();
    // Overheat (v22.1.3): a hot barrel blocks firing until it cools.
    if ((w.overheatT || 0) > 0) return false;
    // Double Tap cola (v23.0.9): fire rate 20% faster.
    const rate = (S.perkCola && S.perkCola.includes('doubletap')) ? w.rate * 0.8 : w.rate;
    return S.phase === 'playing' && S.player.alive && !w.reloading &&
      S.time - w.lastShot >= rate && (w.mag > 0 || w.melee);
  }
  function reload() {
    const w = cur();
    if (w.melee) return; // blades never reload
    if (w.reloading || w.mag >= w.magSize || w.reserve <= 0) return;
    // Reload modifiers (v19.0.3): sprint +30% time, crouch −20%, 3-kill
    // streak −30% (fast reload, v19.0.2).
    const p = S.player;
    let mult = 1;
    if (p.moving && p.speed > 8) mult *= 1.3;
    if (p.crouched || p.prone) mult *= 0.8;
    if (S.streak >= 3) mult *= 0.7;
    if (S.perkCola && S.perkCola.includes('speed')) mult *= 0.7; // Speed Cola (v23.0.9)
    w.reloading = true;
    w.reloadTotal = w.reload * mult;
    w.reloadT = w.reloadTotal;
    w.reloadStageFired = 0;
    // Shotgun shell reload (v19.0.5): 1 shell per 0.5s, click to stop.
    w.shellMode = w.cls === 'Shotgun';
    w.shellT = 0;
    const fx = fxFor(w.id);
    S.reloadStage = fx.reload.stages[0];
    audio.reload();
  }
  function cancelReload() {
    const w = cur();
    if (!w.reloading) return;
    // (Gameplay pass 2026-11-15: a cancelled reload used to leave the mag
    // exactly as it was — under sustained fire (a zombie swarm landing a
    // hit every ~0.05s) the 50% cancel chained forever and the gun could
    // never reload: measured mag 0 with 9579 reserve for 200s+. A cancel
    // now keeps the rounds loaded so far, proportional to reload progress,
    // so the player always makes ammo progress and can fight back.
    // Shell-fed shotguns already load shell-by-shell, so they skip this.)
    if (!w.shellMode && w.reloadTotal > 0 && w.mag < w.magSize && w.reserve > 0) {
      const progress = Math.max(0, Math.min(1, 1 - w.reloadT / w.reloadTotal));
      const need = w.magSize - w.mag;
      const take = Math.min(need, w.reserve, Math.ceil(progress * need));
      if (take > 0) { w.mag += take; w.reserve -= take; }
    }
    w.reloading = false; w.reloadT = 0; w.shellMode = false;
    S.reloadFrac = 0; S.reloadStage = '';
  }
  function isReloading() { return !!cur().reloading; }
  function outOfAmmo() {
    const w = cur();
    return w.mag <= 0 && w.reserve <= 0 && !w.melee;
  }
  // Weapon camo (v20.0.10): tint the viewmodel gun to the chosen camo.
  let lastCamo = null;
  let lastWeaponColor = null;
  function applyCamo() {
    // v24.1.3: the 16-color weapon picker wins over camo; 'none' falls back
    // to the camo tint (WEAPON_CAMOS), 'none' camo = steel.
    const wc = S.weaponColor && S.weaponColor !== 'none' ? S.weaponColor : null;
    const camo = WEAPON_CAMOS[S.weaponCamo] || WEAPON_CAMOS.none;
    const hex = wc ? parseInt(String(wc).replace('#', ''), 16) : camo.color;
    const em = wc ? 0 : camo.emissive;
    hands.group.traverse(o => {
      if (o.isMesh && !o.userData.noCamo && o.material && o.material.color) {
        o.material.color.setHex(hex);
        if (o.material.emissive) o.material.emissive.setHex(em);
      }
    });
    lastCamo = S.weaponCamo;
    lastWeaponColor = S.weaponColor || 'none';
  }
  function inspect() { if (S.phase === 'playing') inspectT = 1; }
  function step(dt) {
    const w = cur();
    // Rebuild the viewmodel gun when the weapon changed — and cancel the
    // old weapon's reload (v18.1.3: switching weapons cancels reloading).
    if (hands.weaponId !== w.id) {
      const prev = S.weapons.find(x => x.id === hands.weaponId);
      if (prev) { prev.reloading = false; prev.reloadT = 0; }
      // Bloom belongs to the current weapon's sustained fire: switching
      // resets it, so a sniper drawn right after spraying is precise
      // (gameplay pass 2026-11-15 — the old carry-over made the first
      // sniper shot a coin flip at 15m).
      S.player.spreadBloom = 0;
      hands.buildGun(w, MYTHIC_DEFS[S.mythic] || MYTHIC_DEFS.none);
    }
    if (w.reloading) {
      w.reloadT -= dt;
      const fx = fxFor(w.id);
      const done = w.reloadTotal > 0 ? 1 - Math.max(0, w.reloadT) / w.reloadTotal : 1;
      S.reloadFrac = done;
      S.reloadSecs = Math.max(0, w.reloadT);
      // Reload stage sounds + labels (v19.0.7, v22.1.2) at 15/50/85%.
      const stages = fx.reload.stages;
      const idx = done >= 0.85 ? 2 : done >= 0.5 ? 1 : 0;
      if (idx > (w.reloadStageFired || 0)) {
        w.reloadStageFired = idx;
        S.reloadStage = stages[Math.min(idx, stages.length - 1)];
        if (audio.reloadStage) audio.reloadStage(idx, w.id);
      }
      if (w.shellMode) {
        // Shotgun: one shell every 0.5s; firing stops the reload.
        w.shellT += dt;
        if (w.shellT >= 0.5 && w.mag < w.magSize && w.reserve > 0) {
          w.shellT = 0;
          w.mag += 1; w.reserve -= 1;
          if (audio.reloadStage) audio.reloadStage(1, w.id);
        }
        if (w.mag >= w.magSize || w.reserve <= 0) {
          w.reloading = false; w.shellMode = false;
          w.shotsSinceReload = 0;
          S.reloadFrac = 0; S.reloadStage = '';
        }
      } else if (w.reloadT <= 0) {
        const need = w.magSize - w.mag, take = Math.min(need, w.reserve);
        w.mag += take; w.reserve -= take; w.reloading = false;
        w.shotsSinceReload = 0; // dirty-weapon counter resets on reload
        S.reloadFrac = 0; S.reloadStage = '';
      }
    }
    // M4LMG heat (v18.5.8): recoil climbs while holding fire, cools off fast.
    if (w.heat) w.heatV = Math.max(0, (w.heatV || 0) - dt * 2);
    // Hot barrel (v22.1.3): cools for 2s, then the shot counter resets.
    if ((w.overheatT || 0) > 0) {
      w.overheatT -= dt;
      if (w.overheatT <= 0) { w.overheatT = 0; w.shotsSinceReload = 0; S.barrelHot = false; }
    }
    // Camo reapply when the player picks a new camo in the Gunsmith.
    if (S.weaponCamo !== lastCamo) applyCamo();
    if ((S.weaponColor || 'none') !== lastWeaponColor) applyCamo();
    // Blood on the gun (v19.0.13) fades over ~8s.
    if (S.gunBlood > 0) S.gunBlood = Math.max(0, S.gunBlood - dt / 8);
    // Sniper travel time: resolve delayed hits.
    for (let i = pendingShots.length - 1; i >= 0; i--) {
      const ps = pendingShots[i];
      ps.t -= dt;
      if (ps.t <= 0) {
        pendingShots.splice(i, 1);
        if (ps.bot && ps.bot.alive !== false) ps.onHit(ps.bot, ps.head, ps.w, ps.dmgOverride, false, ps.point);
      }
    }
    // Viewmodel bob + ADS position (emote can lift/hide the gun).
    // ADS speed comes from the Gunsmith (stock / scope / barrel).
    const t = S.time;
    const bob = S.player.moving && S.player.onGround ? Math.sin(t * 11) * 0.016 : 0;
    const em = S.emote;
    let gx = S.ads ? 0.0 : 0.22, gy = S.ads ? -0.16 : -0.17 + bob, vis = true;
    if (em) {
      if (em.id === 'wave' || em.id === 'salute') gy += 0.12;
      if (em.id === 'dance') gy += Math.abs(Math.sin(t * 8)) * 0.05;
      if (em.id === 'tpose') vis = false;
      if (em.id === 'dab') { gx += 0.08; gy += Math.sin(t * 6) * 0.04; }
      if (em.id === 'heart') gy += 0.14;
      if (em.id === 'taunt') { gx += Math.sin(t * 9) * 0.05; gy += Math.cos(t * 9) * 0.03; }
      if (em.id === 'clap') gy += Math.abs(Math.sin(t * 10)) * 0.08;
      if (em.id === 'bow') gy -= 0.08;
      if (em.id === 'flex') gy += 0.1;
      if (em.id === 'cry') gy -= 0.1;
    }
    // Tactical sprint (v23.0.7): gun lowered to the hip while tac-sprinting.
    if (S.tacSprint) { gy -= 0.12; gx += 0.1; }
    const lerp = Math.min(1, dt * 12 * (w.adsSpeed || 1));
    // Vault (v18.8.5): the gun lifts while the player climbs a low wall.
    if (S.player.vaultT > 0) gy += 0.15;
    // Body lean (v18.8.3): the gun shifts sideways with the lean.
    if (S.lean) gx += S.lean * 0.05;
    gun.position.x += (gx - gun.position.x) * lerp;
    gun.position.y += (gy - gun.position.y) * lerp;
    gun.visible = vis;
    // Inspect / sway / lean / vault: rotation composed absolutely each frame
    // (v18.8.3 lean, v18.8.5 vault) so nothing accumulates across frames.
    let rz = 0, rx = 0;
    if (inspectT > 0) {
      inspectT -= dt;
      const k = Math.sin((1 - Math.max(0, inspectT)) * Math.PI);
      rz = k * 0.7; rx = k * 0.25;
    } else {
      rz = Math.sin(t * 1.8) * (S.ads ? 0.002 : 0.006); // breathing sway
      rx = Math.cos(t * 1.4) * (S.ads ? 0.0012 : 0.0036);
    }
    if (S.lean) rz += S.lean * 0.25; // body lean tilts the viewmodel
    if (S.player.vaultT > 0) rx -= 0.5; // vault lifts the gun (y via gy)
    gun.rotation.z = rz; gun.rotation.x = rx;
    // Katana swing (v18.5.5): a wide diagonal slash of the viewmodel.
    if (meleeSwingT > 0) {
      meleeSwingT -= dt;
      const k = Math.sin((1 - Math.max(0, meleeSwingT) / 0.4) * Math.PI);
      gun.rotation.x = -k * 0.9; gun.rotation.z = k * 0.5;
    }
    // Laser sight (v18.8): red line + dot from the gun tip while toggled on.
    if (S.laserOn && S.phase === 'playing' && S.player.alive) {
      const tip = hands.gun.userData.tip;
      if (tip) tip.getWorldPosition(_tip); else hands.gun.getWorldPosition(_tip);
      camera.getWorldDirection(_dir);
      const lp = laserGeo.attributes.position.array;
      lp[0] = _tip.x; lp[1] = _tip.y; lp[2] = _tip.z;
      lp[3] = _tip.x + _dir.x * 30; lp[4] = _tip.y + _dir.y * 30; lp[5] = _tip.z + _dir.z * 30;
      laserGeo.attributes.position.needsUpdate = true;
      laserLine.visible = true;
      laserDot.position.set(lp[3], lp[4], lp[5]);
      laserDot.visible = true;
    } else {
      laserLine.visible = false; laserDot.visible = false;
    }
    hands.step(dt, w);
    // Mythic particles + pulsing glow (rainbow cycles hue)
    const def = MYTHIC_DEFS[S.mythic] || MYTHIC_DEFS.none;
    if (def.fx === 'rainbow') {
      _colA.setHSL((t * 0.15) % 1, 0.85, 0.5);
      _colB.setHSL((t * 0.15 + 0.5) % 1, 0.9, 0.4);
      hands.setGlow(_colA.getHex(), _colB.getHex(), 0.6);
    }
    if (def.fx) {
      if (def.fx !== 'rainbow') hands.setGlow(def.body, def.glow, 0.5 + Math.sin(t * 6) * 0.3);
      moteT -= dt;
      if (moteT <= 0) {
        moteT = 0.09;
        const m = motes[moteIdx]; moteIdx = (moteIdx + 1) % motes.length;
        const tip = hands.gun.userData.tip;
        if (tip) tip.getWorldPosition(_tip); else hands.gun.getWorldPosition(_tip);
        m.mesh.position.copy(_tip);
        if (def.fx === 'fire') m.mesh.material.color.setHex(0xff5500);
        else if (def.fx === 'void') m.mesh.material.color.setHex(0xaa00ff);
        else m.mesh.material.color.setHSL((t * 0.2) % 1, 0.9, 0.6);
        m.vx = (Math.random() - 0.5) * 0.4; m.vy = 0.6 + Math.random() * 0.6; m.vz = (Math.random() - 0.5) * 0.4;
        m.life = 0.6; m.mesh.visible = true; m.mesh.material.opacity = 0.95;
      }
    }
    for (const m of motes) {
      if (m.life <= 0) continue;
      m.life -= dt;
      m.mesh.position.x += m.vx * dt; m.mesh.position.y += m.vy * dt; m.mesh.position.z += m.vz * dt;
      m.mesh.material.opacity = Math.max(0, m.life / 0.6);
      if (m.life <= 0) m.mesh.visible = false;
    }
    if (boltT > 0) {
      boltT -= dt;
      boltMat.opacity = Math.max(0, boltT / 0.25);
      if (boltT <= 0) bolt.visible = false;
    }
  }
  function showBolt(from, to) {
    const pos = boltGeo.attributes.position.array;
    pos[0] = from.x; pos[1] = from.y; pos[2] = from.z;
    pos[3] = to.x; pos[4] = to.y; pos[5] = to.z;
    boltGeo.attributes.position.needsUpdate = true;
    bolt.visible = true; boltT = 0.25; boltMat.opacity = 1;
  }
  // Fire one shot. hitMeshes: bot body/head meshes. Returns {hit, head, bot} or null.
  // onHit(bot, head, w, dmgOverride, wallbang, point) — dmgOverride for operator skills.
  // resolve(userData) maps a hit mesh to its target (bots or zombies).
  // Spawn a flying projectile (rocket / FHJ / thumper grenade / arrow).
  function spawnProjectile(w, dir) {
    let mesh, speed, gravity;
    if (w.projectile === 'arrow') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.5, metalness: 0.3 });
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), mat);
      speed = 60; gravity = 2;
    } else if (w.projectile === 'thumper') {
      mesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x2e4a2e, roughness: 0.5, metalness: 0.4 }));
      speed = 18; gravity = 9.8;
    } else {
      const mat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.4, metalness: 0.6, emissive: 0xff4400, emissiveIntensity: 0.6 });
      mesh = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), mat);
      body.rotation.x = Math.PI / 2; mesh.add(body);
      const tipM = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 8),
        new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4, metalness: 0.5 }));
      tipM.rotation.x = Math.PI / 2; tipM.position.z = -0.42; mesh.add(tipM);
      speed = w.projectile === 'fhj' ? 35 : 40; gravity = 0;
    }
    mesh.position.copy(_tip);
    scene.add(mesh);
    const vel = new THREE.Vector3(dir.x * speed, dir.y * speed, dir.z * speed);
    if (w.projectile === 'thumper') vel.y += 4; // arcing lob
    projectiles.push({
      kind: w.projectile, mesh, vel, gravity, life: 0,
      maxLife: w.range / speed, dmg: w.dmg, blastR: w.blastR || 0,
      headMult: w.headMult, w, px: _tip.x, py: _tip.y, pz: _tip.z,
    });
  }
  function detonateProjectile(pr, hit, onHit, resolve) {
    const point = hit.point;
    scene.remove(pr.mesh);
    if (pr.kind === 'arrow') {
      // Silent arrow: a bot hit resolves damage, a wall hit sticks + dust.
      if (hit.object && (hit.object.userData.botId !== undefined || hit.object.userData.zombieId !== undefined)) {
        const bot = resolve ? resolve(hit.object.userData) : S.bots[hit.object.userData.botId];
        if (bot) {
          const head = hit.object.userData.part === 'head';
          if (onHit) onHit(bot, head, pr.w, null, false, point);
        }
      } else if (effects && hit.object) {
        effects.impact(point, _dir, hit.object.userData.mat || 'wall');
      }
      return;
    }
    // Explosive projectile: fireball + area blast (main damages in radius).
    if (effects) effects.explosion({ x: point.x, y: Math.max(0.3, point.y), z: point.z }, pr.blastR >= 5);
    else if (audio.explosion) audio.explosion();
    if (cbs.onBlast) cbs.onBlast(point.x, point.z, pr.blastR, pr.dmg);
  }
  // Step the flying projectiles (called from the main animate loop).
  // hitMeshes/shootables/onHit/resolve are the same args as fire().
  function stepProjectiles(dt, hitMeshes, shootables, rng, onHit, resolve) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const pr = projectiles[i];
      pr.life += dt;
      if (pr.gravity) pr.vel.y -= pr.gravity * dt;
      if (pr.kind === 'fhj' && S.heli) {
        // Lock-on: steer toward the circling attack heli.
        _tmpV.set(Math.cos(S.heli.angle) * 18 - pr.mesh.position.x, 25 - pr.mesh.position.y, Math.sin(S.heli.angle) * 18 - pr.mesh.position.z).normalize();
        pr.vel.lerp(_tmpV2.copy(_tmpV).multiplyScalar(35), Math.min(1, dt * 3));
      }
      _prev.set(pr.px, pr.py, pr.pz);
      pr.mesh.position.addScaledVector(pr.vel, dt);
      pr.px = pr.mesh.position.x; pr.py = pr.mesh.position.y; pr.pz = pr.mesh.position.z;
      // Rocket trail (v22.1.4): white smoke puffs behind rockets/FHJ.
      if ((pr.kind === 'rocket' || pr.kind === 'fhj') && effects && effects.smokePuff) {
        pr.trailT = (pr.trailT || 0) - dt;
        if (pr.trailT <= 0) {
          pr.trailT = 0.05;
          effects.smokePuff(pr.px, pr.py, pr.pz);
        }
      }
      pr.mesh.lookAt(pr.mesh.position.x + pr.vel.x, pr.mesh.position.y + pr.vel.y, pr.mesh.position.z + pr.vel.z);
      const segLen = _prev.distanceTo(pr.mesh.position);
      let done = false;
      if (segLen > 0.001) {
        _dir.copy(pr.mesh.position).sub(_prev).normalize();
        ray.set(_prev, _dir); ray.far = segLen + 0.1;
        const hits = ray.intersectObjects(hitMeshes.concat(shootables), false);
        if (hits[0]) { detonateProjectile(pr, hits[0], onHit, resolve); done = true; }
      }
      if (!done && (pr.mesh.position.y <= 0.05 || pr.life >= pr.maxLife)) {
        if (pr.blastR > 0) detonateProjectile(pr, { point: pr.mesh.position }, onHit, resolve);
        else scene.remove(pr.mesh);
        done = true;
      }
      if (done) projectiles.splice(i, 1);
    }
  }
  // Fire one shot. hitMeshes: bot body/head meshes. Returns a truthy object
  // whenever a shot was actually discharged (hit, miss, projectile, swing),
  // null when not ready (reloading / rate / empty).
  // onHit(bot, head, w, dmgOverride, wallbang, point) — dmgOverride for operator skills.
  // resolve(userData) maps a hit mesh to its target (bots or zombies).
  function fire(hitMeshes, shootables, rng, onHit, resolve) {
    const w = cur();
    if (!ready()) {
      if (w.mag === 0 && !w.reloading && !w.melee) {
        // Empty click (v18.1.1), rate-limited, then auto-reload.
        if (S.time - lastEmptyClick > 0.3) {
          lastEmptyClick = S.time;
          if (audio.emptyClick) audio.emptyClick();
        }
        reload();
      }
      return null;
    }
    w.lastShot = S.time;
    if (!w.melee) { w.mag -= 1; w.shotsSinceReload = (w.shotsSinceReload || 0) + 1; }
    if (w.heat) w.heatV = Math.min(16, (w.heatV || 0) + 1); // M4LMG heat climbs
    // Hot barrel (v22.1.3): N shots without a reload overheat the barrel.
    const fxW = fxFor(w.id);
    if (!w.melee && fxW.hotAt && (w.shotsSinceReload || 0) >= fxW.hotAt && !(w.overheatT > 0)) {
      w.overheatT = 2; S.barrelHot = true;
      S.msg = '⚠️ Barrel panas! Istirahat 2 detik'; S.msgT = 2;
    }
    S.shotsFired += 1;
    S.player.lastShotT = S.time;
    camera.getWorldPosition(_cam);
    camera.getWorldDirection(_dir);
    _baseDir.copy(_dir);
    const tip = hands.gun.userData.tip;
    if (tip) tip.getWorldPosition(_tip); else hands.gun.getWorldPosition(_tip);
    // Operator: Tempest — this shot is a one-hit lightning bolt.
    let dmgOverride = null;
    if (S.opActive && S.operator === 'tempest') {
      dmgOverride = 999; S.opActive = false;
    } else if (S.opActive && S.operator === 'annihilator') {
      dmgOverride = 200;
      S.opShots -= 1;
      if (S.opShots <= 0) S.opActive = false;
    }
    // Melee (v18.5.5): arc check vs bot meshes (2.5m, ~35° cone) + swing.
    if (w.melee) {
      meleeSwingT = 0.4;
      if (audio.swish) audio.swish();
      if (audio.shot) audio.shot(w.id, S.indoors, S.mythic);
      let best = null, bestD = w.range, bestHead = false, bestPoint = null;
      for (const m of hitMeshes) {
        m.getWorldPosition(_tmpV);
        const d = _tmpV.distanceTo(_cam);
        if (d > w.range) continue;
        _tmpV2.copy(_tmpV).sub(_cam).normalize();
        if (Math.acos(Math.min(1, _tmpV2.dot(_baseDir))) > 0.6) continue;
        if (d < bestD) { bestD = d; best = m; bestHead = m.userData.part === 'head'; bestPoint = { x: _tmpV.x, y: _tmpV.y, z: _tmpV.z }; }
      }
      if (best) {
        const bot = resolve ? resolve(best.userData) : S.bots[best.userData.botId];
        if (bot) {
          // Backstab (v22.1.5): katana from behind the bot = 115 damage.
          let backstab = false;
          if (w.id === 'katana' && bot.yaw != null) {
            const bdx = S.player.x - bot.x, bdz = S.player.z - bot.z;
            const bl = Math.hypot(bdx, bdz) || 1;
            const fwd = { x: -Math.sin(bot.yaw), z: -Math.cos(bot.yaw) };
            if ((fwd.x * bdx + fwd.z * bdz) / bl < -0.3) backstab = true;
          }
          if (backstab) { dmgOverride = 115; S.meleeBackstab = true; if (audio.swish) audio.swish(); }
          onHit && onHit(bot, bestHead, w, dmgOverride, false, bestPoint);
          return { hit: true, head: bestHead, bot, point: bestPoint };
        }
      }
      return { hit: false, swung: true };
    }
    // Launchers / crossbow: real flying projectiles, no hitscan.
    if (w.projectile) {
      spawnProjectile(w, _baseDir);
      if (effects) effects.muzzle(_tip, _baseDir, _cam, 0.7);
      if (audio.shot) audio.shot(w.id, S.indoors, S.mythic);
      const p = S.player;
      p.recoilPitch += (0.006 + rng() * 0.004) * (w.recoil || 1) * (S.ads ? 0.6 : 1);
      hands.kick();
      return { hit: false, projectile: true };
    }
    const sp = spread();
    const pellets = w.pellets || 1;
    const isSniper = w.cls === 'Sniper';
    let result = null;
    let groundPoint = null;
    if (_baseDir.y < -0.001) {
      const gt = -_cam.y / _baseDir.y;
      if (gt > 0 && gt < ray.far) groundPoint = { x: _cam.x + _baseDir.x * gt, y: 0, z: _cam.z + _baseDir.z * gt };
    }
    for (let pi = 0; pi < pellets; pi++) {
      _dir.copy(_baseDir);
      _dir.x += (rng() * 2 - 1) * sp; _dir.y += (rng() * 2 - 1) * sp; _dir.z += (rng() * 2 - 1) * sp;
      _dir.normalize();
      ray.set(_cam, _dir); ray.far = 120;
      const targets = ray.intersectObjects(hitMeshes.concat(shootables), false);
      const hit = targets[0] || null;
      // Tempest lightning bolt on the first pellet's hit.
      if (dmgOverride === 999 && hit && pi === 0) showBolt(_cam, hit.point);
      if (hit && (hit.object.userData.botId !== undefined || hit.object.userData.zombieId !== undefined)) {
        const bot = resolve ? resolve(hit.object.userData) : S.bots[hit.object.userData.botId];
        if (!bot) continue;
        const head = hit.object.userData.part === 'head';
        if (!result) result = { hit: true, head, bot, point: hit.point };
        // Sniper bullet drop (v18.9) + travel time (v24.0.2): the drop and
        // delay come from the shared state.js helpers, not hardcoded here.
        if (isSniper && hit.distance > 30) {
          const drop = calcBulletDrop(hit.distance, w);
          _dir.y -= drop / hit.distance; _dir.normalize();
          ray.set(_cam, _dir); ray.far = 120;
          const t2 = ray.intersectObjects(hitMeshes.concat(shootables), false);
          const hit2 = t2[0];
          if (hit2 && (hit2.object.userData.botId !== undefined || hit2.object.userData.zombieId !== undefined)) {
            const bot2 = resolve ? resolve(hit2.object.userData) : S.bots[hit2.object.userData.botId];
            if (bot2) pendingShots.push({ bot: bot2, head: hit2.object.userData.part === 'head', w, point: hit2.point, t: calcTravelTime(hit.distance, w), dmgOverride, onHit });
          }
          continue;
        }
        // Per-pellet damage (shotgun / dual pistol) with range falloff.
        const ov = dmgOverride != null ? dmgOverride
          : pellets > 1 ? Math.round(damageAtRange(w.dmg, hit.distance, w.range)) * (head ? w.headMult : 1) : null;
        onHit && onHit(bot, head, w, ov, false, hit.point);
      } else if (hit && pi === 0) {
        // Wall / prop hit: impact effect by material (+ bullet hole on walls).
        const mat = hit.object.userData.mat || 'wall';
        // Ricochet (v28.0.4): a grazing hit on metal deflects — spark +
        // ting, no prop damage, no wallbang.
        let ricochet = false;
        if (mat === 'metal' && hit.face && hit.face.normal) {
          const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
          if (Math.abs(_dir.dot(n)) < 0.35) ricochet = true;
        }
        if (ricochet) {
          if (effects) effects.impact(hit.point, _dir, 'metal');
          if (audio.ting) audio.ting();
          if (!result) result = { hit: true, head: false, bot: null, point: hit.point, ricochet: true };
        } else {
          if (mat === 'water' && effects) effects.splash(hit.point);
          else if (effects) effects.impact(hit.point, _dir, mat);
          // Props (v19.2/v22.3): ANY propType routes to damagePropHit —
          // not just the old destructible flag.
          if (cbs.onPropHit && (hit.object.userData.destructible || hit.object.userData.propType)) cbs.onPropHit(hit.object, w.dmg, hit.point);
          // Wallbang: a bot right behind a thin wall takes 50% damage.
          const behind = targets[1];
          if (behind && (behind.object.userData.botId !== undefined || behind.object.userData.zombieId !== undefined)
            && behind.distance - hit.distance < 2) {
            const bot = resolve ? resolve(behind.object.userData) : S.bots[behind.object.userData.botId];
            if (bot) {
              const head = behind.object.userData.part === 'head';
              result = { hit: true, head, bot, point: behind.point, wallbang: true };
              onHit && onHit(bot, head, w, dmgOverride, true, behind.point);
            }
          } else if (!result) {
            result = { hit: true, head: false, bot: null, point: hit.point };
          }
        }
      } else if (pi === 0 && groundPoint) {
        if (effects) effects.impact(groundPoint, _dir, 'ground');
        if (!result) result = { hit: true, head: false, bot: null, point: groundPoint };
      }
    }
    // Muzzle flash + shell casing + tracer on every shot. Muzzle dims after
    // 50+ shots without a reload (dirty weapon, v18.1.10); 2x on phones
    // (small screen, v18.4.2). Muzzle scale and tracer color come from the
    // WEAPON_FX table (v22.1); mythic tracer overrides the table color.
    if (effects) {
      const dirty = (w.shotsSinceReload || 0) > 50 ? 0.5 : 1;
      const fxShot = fxFor(w.id);
      effects.muzzle(_tip, _baseDir, _cam, dirty * (S.isMobile ? 2 : 1) * (fxShot.muzzle.scale || 1));
      if (!w.melee) {
        const right = { x: Math.cos(S.player.yaw), y: 0, z: -Math.sin(S.player.yaw) };
        effects.shell(_tip, right);
      }
      const end = result && result.point ? result.point : groundPoint || { x: _cam.x + _baseDir.x * 60, y: _cam.y + _baseDir.y * 60, z: _cam.z + _baseDir.z * 60 };
      effects.tracer(_tip, end, MYTHIC_TRACER[S.mythic] || fxShot.tracer.color || isSniper);
    }
    // Recoil: the camera kicks up (per-weapon stats × WEAPON_FX recoil up,
    // v22.1). ADS and prone steady it; rain makes it 10% worse; M4LMG heat
    // climbs while holding fire. It recovers on its own in player.step.
    // (Gameplay pass 2026-11-15: the old kick was ~0.008 rad/shot vs 0.09/s
    // recovery, so sustained fire never climbed — the gun felt dead. Kick
    // is now ~2x and recovery slower, so a 10-round burst climbs ~3-5°.)
    const p = S.player;
    const rainK = (S.weather === 'rain' || S.weather === 'storm') ? 1.1 : 1;
    const heatK = w.heat ? 1 + Math.min(0.8, (w.heatV || 0) * 0.05) : 1;
    const stanceK = p.prone ? 0.5 : p.crouched ? 0.75 : 1;
    const fxRec = fxFor(w.id);
    p.recoilPitch += (0.012 + rng() * 0.006) * (w.recoil || 1) * (S.ads ? 0.6 : 1) * stanceK * rainK * heatK * (fxRec.recoil.up || 1);
    // Recoil pattern (v24.0.2): per-weapon sideways drift — AK pulls
    // right, M4 stays straight, MP5 barely moves. (Gameplay pass: the old
    // 0.0004 factor made the pattern invisible over a whole magazine.)
    p.yaw += (w.recoilPat ? w.recoilPat.side : 0.2) * 0.004 * (S.ads ? 0.6 : 1);
    hands.kick();
    // Spread bloom (gameplay pass): +0.005/shot, cap 0.03 (was +0.008,
    // cap 0.05 — sustained AR fire at 15m hit only ~30% because the cone
    // grew wider than the target). Snipers bloom more per shot, but their
    // 1.4s rate lets it clear between shots.
    S.player.spreadBloom = Math.min(0.03, S.player.spreadBloom + (isSniper ? 0.02 : 0.005));
    if (audio.shot) audio.shot(w.id, S.indoors, S.mythic);
    if (w.id === 'dual') setTimeout(() => audio.shot && audio.shot('p12', S.indoors, S.mythic), 60); // second pistol
    return result || { hit: false };
  }
  applyGunsmith();
  // TEMP debug accessor for the gameplay probe (remove before commit).
  return { cur, ready, reload, inspect, step, fire, stepProjectiles, spread, gun, hands, applyMythic, applyGunsmith, outOfAmmo, isReloading, cancelReload, applyCamo };
}

export { MYTHIC_DEFS };
