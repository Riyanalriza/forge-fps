// Combat effects: blood, muzzle flash, tracers, shells, impacts, decals,
// blood pools. ONE shared particle pool, updated in the main animate loop —
// never a setInterval per particle (that leaks and stutters).
import * as THREE from 'three';

const _v = new THREE.Vector3();

export function createEffects(scene, S, audio) {
  // ---- Particle pool: blood, sparks, dust, splinters (small reused meshes) ----
  const P_COUNT = 140;
  const pGeo = new THREE.SphereGeometry(0.045, 6, 6);
  const particles = [];
  for (let i = 0; i < P_COUNT; i++) {
    const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 }));
    m.visible = false; scene.add(m);
    particles.push({ mesh: m, life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, grav: 9, stain: false, size: 1 });
  }
  let pIdx = 0;
  function spawn(x, y, z, vx, vy, vz, color, life, grav = 9, size = 1, stain = false) {
    const p = particles[pIdx]; pIdx = (pIdx + 1) % particles.length;
    p.mesh.position.set(x, y, z);
    p.mesh.material.color.setHex(color);
    p.mesh.scale.setScalar(size);
    p.vx = vx; p.vy = vy; p.vz = vz; p.life = life; p.maxLife = life;
    p.grav = grav; p.stain = stain;
    p.mesh.visible = true; p.mesh.material.opacity = 1;
  }
  // ---- Decal pool: bullet holes + blood stains (flat circles on surfaces) ----
  const D_COUNT = 28;
  const dGeo = new THREE.CircleGeometry(0.09, 10);
  const decals = [];
  for (let i = 0; i < D_COUNT; i++) {
    const m = new THREE.Mesh(dGeo, new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.9, depthWrite: false }));
    m.visible = false; m.renderOrder = 2; scene.add(m);
    decals.push({ mesh: m, life: 0 });
  }
  let dIdx = 0;
  function decal(x, y, z, nx, ny, nz, color, size, life) {
    const d = decals[dIdx]; dIdx = (dIdx + 1) % decals.length;
    d.mesh.position.set(x, y, z);
    d.mesh.lookAt(x + nx, y + ny, z + nz);
    d.mesh.material.color.setHex(color);
    d.mesh.scale.setScalar(size);
    d.life = life; d.mesh.visible = true; d.mesh.material.opacity = 0.9;
  }
  // ---- Blood pools: flat dark-red circles on the floor that grow, fade in 10s ----
  const pools = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ color: 0x660000, transparent: true, opacity: 0.85, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.visible = false; m.renderOrder = 1; scene.add(m);
    pools.push({ mesh: m, life: 0, maxR: 0.6, big: false });
  }
  let poolIdx = 0;
  // ---- Tracer pool: glowing lines from the muzzle to the hit ----
  const tracers = [];
  const tubeGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 6); // thinner: 0.035 read as a laser
  for (let i = 0; i < 8; i++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffdd55, transparent: true, opacity: 0 }));
    l.visible = false; l.frustumCulled = false; scene.add(l);
    // Tube: a real 3D tracer the line alone can't give (WebGL ignores line
    // width), so the shot reads as a bright streak from every angle.
    const tube = new THREE.Mesh(tubeGeo,
      new THREE.MeshBasicMaterial({ color: 0xffdd55, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    tube.visible = false; tube.frustumCulled = false; scene.add(tube);
    tracers.push({ line: l, tube, life: 0 });
  }
  let trIdx = 0;
  // ---- Shell pool: brass casings with gravity + spin, ting on first bounce ----
  const shells = [];
  const shellGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.07, 6);
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(shellGeo, new THREE.MeshStandardMaterial({ color: 0xc8a040, roughness: 0.4, metalness: 0.8 }));
    m.visible = false; scene.add(m);
    shells.push({ mesh: m, life: 0, vx: 0, vy: 0, vz: 0, rx: 0, rz: 0, bounced: false });
  }
  let shIdx = 0;
  // ---- Muzzle flash: bright plane + 3D point light + growing smoke puff ----
  // (Gameplay pass 2026-11-15: the flash was a flat solid-yellow square
  // (plain MeshBasicMaterial, no texture). It now uses a procedural
  // starburst texture — white-hot core, orange spikes, transparent
  // edges — so it reads as a flame burst, not a yellow card.)
  function makeFlashTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const cx = 64, cy = 64;
    // Spikes: 6 elongated flame tongues radiating from the centre.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + (i % 2 ? 0.35 : -0.2);
      const len = 58 - (i % 3) * 10;
      const wdt = 0.16 + (i % 2) * 0.06;
      g.save(); g.translate(cx, cy); g.rotate(a);
      const grad = g.createLinearGradient(0, 0, len, 0);
      grad.addColorStop(0, 'rgba(255,240,180,0.95)');
      grad.addColorStop(0.5, 'rgba(255,180,60,0.8)');
      grad.addColorStop(1, 'rgba(255,120,20,0)');
      g.fillStyle = grad;
      g.beginPath(); g.moveTo(0, 0);
      g.lineTo(len, -Math.sin(wdt) * len * 0.5);
      g.lineTo(len, Math.sin(wdt) * len * 0.5);
      g.closePath(); g.fill(); g.restore();
    }
    // Hot core: white centre fading to yellow, then transparent.
    const core = g.createRadialGradient(cx, cy, 0, cx, cy, 42);
    core.addColorStop(0, 'rgba(255,255,240,1)');
    core.addColorStop(0.35, 'rgba(255,220,120,0.9)');
    core.addColorStop(0.7, 'rgba(255,150,40,0.45)');
    core.addColorStop(1, 'rgba(255,120,20,0)');
    g.fillStyle = core; g.beginPath(); g.arc(cx, cy, 42, 0, Math.PI * 2); g.fill();
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4),
    new THREE.MeshBasicMaterial({ map: makeFlashTexture(), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  flash.visible = false; scene.add(flash);
  const flashLight = new THREE.PointLight(0xffaa33, 0, 6);
  scene.add(flashLight);
  let flashT = 0;
  // ---- Soft smoke: radial-gradient sprite (dense core fading to
  // transparent, NO outline) — reads as a real cloud, not hard balls.
  // One shared texture; each sprite gets its own material so opacities
  // fade independently.
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
  const smokes = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0xcfd4d4, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; m.renderOrder = 3; scene.add(m);
    smokes.push({ sprite: m, life: 0, maxLife: 0.9, vx: 0, vy: 0, vz: 0, size: 1, grow: 1, baseOp: 0.35 });
  }
  let smIdx = 0;
  // ---- Blood on clothes: red decals parented to the bot's body mesh ----
  const clothBlood = [];
  let shakeT = 0;

  function bloodSpray(point, dir, head) {
    if (S.settings && S.settings.graphics && S.settings.graphics.blood === false) return;
    const n = head ? 30 : 20;
    for (let i = 0; i < n; i++) {
      const sp = 1.5 + Math.random() * 3.5;
      // Spray mostly along the bullet direction, with spread.
      const vx = dir.x * sp + (Math.random() - 0.5) * 2.2;
      const vy = dir.y * sp + Math.random() * 1.6 + 0.4;
      const vz = dir.z * sp + (Math.random() - 0.5) * 2.2;
      spawn(point.x, point.y, point.z, vx, vy, vz, Math.random() < 0.7 ? 0xaa0000 : 0xcc1111,
        0.5 + Math.random() * 0.4, 12, 0.8 + Math.random() * 0.7, true);
    }
    if (audio.splat) audio.splat(point.x, point.y, point.z);
  }
  function bloodPool(x, z, big) {
    if (S.settings && S.settings.graphics && S.settings.graphics.blood === false) return;
    const p = pools[poolIdx]; poolIdx = (poolIdx + 1) % pools.length;
    p.mesh.position.set(x, 0.02, z);
    p.mesh.scale.setScalar(0.2);
    p.maxR = big ? 1.1 : 0.65;
    p.big = big; p.life = 10;
    p.mesh.visible = true; p.mesh.material.opacity = 0.85;
    // 5 small stains around the pool.
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 0.7;
      decal(x + Math.cos(a) * r, 0.025, z + Math.sin(a) * r, 0, 1, 0, 0x550000, 0.4 + Math.random() * 0.5, 10);
    }
  }
  function bloodOnBody(bot, point) {
    if (S.settings && S.settings.graphics && S.settings.graphics.blood === false) return;
    if (!bot || !bot.mesh || !bot.mesh.body) return;
    const body = bot.mesh.body;
    const m = new THREE.Mesh(dGeo, new THREE.MeshBasicMaterial({ color: 0x880000, transparent: true, opacity: 0.95, depthWrite: false }));
    const local = body.worldToLocal(_v.copy(point).clone());
    m.position.copy(local);
    // Face outward from the body (roughly toward the hit direction).
    m.lookAt(local.x * 2, local.y, local.z * 2);
    m.scale.setScalar(1.6);
    m.renderOrder = 3;
    body.add(m);
    clothBlood.push({ mesh: m, parent: body, life: 5 });
  }
  function screenBlood() {
    if (S.settings && S.settings.graphics && S.settings.graphics.blood === false) return;
    const el = document.getElementById('blood-splatter');
    if (el) {
      el.classList.add('on');
      setTimeout(() => el.classList.remove('on'), 650);
    }
    shakeT = Math.max(shakeT, 0.35);
  }
  function muzzle(tip, dir, camPos, scale = 1) {
    if (S.settings && S.settings.graphics && S.settings.graphics.muzzle === false) return;
    flash.position.copy(tip);
    flash.lookAt(camPos);
    flash.visible = true; flashT = 0.08;
    flash.material.opacity = 1;
    flash.scale.setScalar((0.8 + Math.random() * 0.4) * scale);
    flashLight.position.copy(tip).addScaledVector(dir, 0.4);
    flashLight.intensity = 3 * scale;
    // Muzzle smoke lingers ~2s (v18.2.3): grows and fades slowly.
    const s = smokes[smIdx]; smIdx = (smIdx + 1) % smokes.length;
    s.sprite.position.copy(tip);
    s.vx = dir.x * 0.6; s.vy = 0.4; s.vz = dir.z * 0.6;
    s.life = 2.0; s.maxLife = 2.0; s.size = 0.5; s.grow = 0.6; s.baseOp = 0.3;
    s.sprite.visible = true; s.sprite.material.opacity = 0.3; s.sprite.scale.set(0.5, 0.5, 1);
  }
  function tracer(from, to, sniper) {
    const t = tracers[trIdx]; trIdx = (trIdx + 1) % tracers.length;
    const pos = t.line.geometry.attributes.position.array;
    pos[0] = from.x; pos[1] = from.y; pos[2] = from.z;
    pos[3] = to.x; pos[4] = to.y; pos[5] = to.z;
    t.line.geometry.attributes.position.needsUpdate = true;
    // sniper = cyan, anything else = yellow; a color value/string (e.g. enemy
    // red 0xff2222) is used as-is.
    const col = typeof sniper === 'number' || typeof sniper === 'string' ? sniper : (sniper ? 0x55ddff : 0xffdd55);
    t.line.material.color.set(col);
    t.line.visible = true; t.line.material.opacity = 0.85; t.life = 0.13;
    // Tube: midpoint + length + orientation from the same endpoints.
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const len = Math.hypot(dx, dy, dz) || 0.001;
    t.tube.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    t.tube.scale.set(1, len, 1);
    t.tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
    t.tube.material.color.set(col);
    t.tube.material.opacity = 0.65; t.tube.visible = true;
  }
  function shell(tip, right) {
    const s = shells[shIdx]; shIdx = (shIdx + 1) % shells.length;
    s.mesh.position.copy(tip);
    s.vx = right.x * (1 + Math.random()) + (Math.random() - 0.5) * 0.5;
    s.vy = 1.5 + Math.random();
    s.vz = right.z * (1 + Math.random()) + (Math.random() - 0.5) * 0.5;
    s.rx = (Math.random() - 0.5) * 12; s.rz = (Math.random() - 0.5) * 12;
    s.life = 3; s.bounced = false;
    s.mesh.visible = true;
  }
  function impact(point, dir, mat) {
    if (mat === 'metal') {
      for (let i = 0; i < 12; i++) {
        spawn(point.x, point.y, point.z,
          (Math.random() - 0.5) * 4 + dir.x, Math.random() * 2.5 + 0.5, (Math.random() - 0.5) * 4 + dir.z,
          0xffcc22, 0.25 + Math.random() * 0.3, 10, 0.7);
      }
      if (audio.ting) audio.ting(point.x, point.y, point.z);
    } else if (mat === 'wood') {
      for (let i = 0; i < 10; i++) {
        spawn(point.x, point.y, point.z,
          (Math.random() - 0.5) * 3 + dir.x, Math.random() * 2 + 0.3, (Math.random() - 0.5) * 3 + dir.z,
          0x8a6f4a, 0.4 + Math.random() * 0.3, 11, 1.1);
      }
    } else if (mat === 'ground') {
      for (let i = 0; i < 10; i++) {
        spawn(point.x, point.y + 0.05, point.z,
          (Math.random() - 0.5) * 1.6, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 1.6,
          0xa89060, 0.5 + Math.random() * 0.4, 3, 1.4);
      }
    } else if (mat === 'water') {
      splash(point);
    } else { // wall / concrete: white dust + black bullet hole, 10s
      for (let i = 0; i < 8; i++) {
        spawn(point.x, point.y, point.z,
          (Math.random() - 0.5) * 1.4, 0.5 + Math.random(), (Math.random() - 0.5) * 1.4,
          0xdddddd, 0.5 + Math.random() * 0.3, 2, 1.2);
      }
      decal(point.x + dir.x * 0.02, point.y + dir.y * 0.02, point.z + dir.z * 0.02,
        -dir.x, -dir.y, -dir.z, 0x0a0a0a, 1, 10);
    }
  }
  // ---- Explosion HD: fireball + point light + fire particles (pool) ----
  const fireball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0 }));
  fireball.visible = false; scene.add(fireball);
  const boomLight = new THREE.PointLight(0xff8a2a, 0, 18);
  scene.add(boomLight);
  let fireballT = 0, fireballMax = 1;
  function explosion(point, big) {
    // 20 fire particles (30 when big), reused from the shared pool.
    const n = big ? 30 : 20;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 3;
      spawn(point.x, point.y + 0.2, point.z,
        Math.cos(a) * r, 1.5 + Math.random() * 4, Math.sin(a) * r,
        [0xffcc22, 0xff7a1a, 0xff3300, 0xffdd55][i % 4],
        0.5 + Math.random() * 0.5, 4, 1.2 + Math.random() * 0.9, false);
    }
    // Fireball: grows then fades over ~0.5s.
    fireball.position.set(point.x, point.y + 0.4, point.z);
    fireball.scale.setScalar(big ? 2.4 : 1.5);
    fireball.visible = true; fireball.material.opacity = 0.95;
    fireballT = 0.5; fireballMax = big ? 2.4 : 1.5;
    boomLight.position.set(point.x, point.y + 1, point.z);
    boomLight.intensity = big ? 12 : 8;
    // 3 smoke puffs rising from the blast.
    for (let i = 0; i < 3; i++) {
      const s = smokes[smIdx]; smIdx = (smIdx + 1) % smokes.length;
      s.sprite.position.set(point.x + (Math.random() - 0.5), point.y + 0.5, point.z + (Math.random() - 0.5));
      s.vx = (Math.random() - 0.5) * 0.5; s.vy = 1.2 + Math.random(); s.vz = (Math.random() - 0.5) * 0.5;
      s.life = 1.4; s.maxLife = 1.4; s.size = 1.6; s.grow = 1.4; s.baseOp = 0.45;
      s.sprite.visible = true; s.sprite.material.opacity = 0.45; s.sprite.scale.set(1.6, 1.6, 1);
    }
    shakeT = Math.max(shakeT, big ? 0.6 : 0.4);
    if (audio.explosion) audio.explosion(point.x, point.y, point.z);
  }
  // ---- Water splash: blue-white droplets + an expanding ripple ring ----
  const ripples = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.36, 24),
      new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 2; scene.add(m);
    ripples.push({ mesh: m, life: 0 });
  }
  let ripIdx = 0;
  function splash(point) {
    for (let i = 0; i < 14; i++) {
      spawn(point.x, point.y + 0.1, point.z,
        (Math.random() - 0.5) * 2.4, 2 + Math.random() * 2.5, (Math.random() - 0.5) * 2.4,
        Math.random() < 0.5 ? 0x9fd8ff : 0xffffff, 0.5 + Math.random() * 0.3, 9, 0.9);
    }
    const r = ripples[ripIdx]; ripIdx = (ripIdx + 1) % ripples.length;
    r.mesh.position.set(point.x, 0.32, point.z);
    r.mesh.scale.setScalar(0.5); r.life = 0.8; r.mesh.visible = true; r.mesh.material.opacity = 0.8;
    if (audio.splash) audio.splash(point.x, point.y, point.z);
  }
  // ---- Glass shatter: clear-white shards bursting outward ----
  function glass(point) {
    for (let i = 0; i < 12; i++) {
      spawn(point.x, point.y, point.z,
        (Math.random() - 0.5) * 3, Math.random() * 1.5 + 0.3, (Math.random() - 0.5) * 3,
        0xd8ecff, 0.4 + Math.random() * 0.4, 9, 0.8);
    }
    if (audio.glass) audio.glass(point.x, point.y, point.z);
  }
  // ---- Blood trail drop (low HP while running): small stain, 8s ----
  function trailDrop(x, z) {
    decal(x + (Math.random() - 0.5) * 0.3, 0.025, z + (Math.random() - 0.5) * 0.3, 0, 1, 0, 0x770000, 0.35 + Math.random() * 0.25, 8);
  }
  // ---- Dust at the feet: desert walking (3) / slide (6) ----
  function footDust(x, z) {
    for (let i = 0; i < 3; i++) {
      spawn(x + (Math.random() - 0.5) * 0.4, 0.08, z + (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8,
        0xc8b080, 0.5 + Math.random() * 0.3, 1.5, 1.1);
    }
  }
  function slideDust(x, z) {
    for (let i = 0; i < 6; i++) {
      spawn(x + (Math.random() - 0.5) * 0.6, 0.08, z + (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 1.4, 0.5 + Math.random() * 0.9, (Math.random() - 0.5) * 1.4,
        0xb8a070, 0.5 + Math.random() * 0.4, 2, 1.3);
    }
  }
  // ---- Footprint in the sand (Ember Market): dark print, 10s ----
  function footprint(x, z, yaw) {
    const d = decals[dIdx]; dIdx = (dIdx + 1) % decals.length;
    d.mesh.position.set(x, 0.025, z);
    d.mesh.rotation.set(-Math.PI / 2, 0, yaw || 0);
    d.mesh.material.color.setHex(0x3a2f22);
    d.mesh.scale.set(0.5, 1, 1);
    d.life = 10; d.mesh.visible = true; d.mesh.material.opacity = 0.55;
  }
  // ---- One smoke puff (car smoking, explosions) ----
  function smokePuff(x, y, z) {
    const s = smokes[smIdx]; smIdx = (smIdx + 1) % smokes.length;
    s.sprite.position.set(x, y, z);
    s.vx = (Math.random() - 0.5) * 0.3; s.vy = 0.8 + Math.random() * 0.5; s.vz = (Math.random() - 0.5) * 0.3;
    s.life = 1.4; s.maxLife = 1.4; s.size = 1.2; s.grow = 1.0; s.baseOp = 0.4;
    s.sprite.visible = true; s.sprite.material.opacity = 0.4; s.sprite.scale.set(1.2, 1.2, 1);
  }
  // ---- Tire track (v18.9.11): dark rectangle decal behind a driven
  // vehicle, 10s life, from the decal pool ----
  function tireTrack(x, z, yaw) {
    const d = decals[dIdx]; dIdx = (dIdx + 1) % decals.length;
    d.mesh.position.set(x, 0.022, z);
    d.mesh.rotation.set(-Math.PI / 2, 0, yaw || 0);
    d.mesh.material.color.setHex(0x1a1a1a);
    d.mesh.scale.set(0.35, 1.4, 1);
    d.life = 10; d.mesh.visible = true; d.mesh.material.opacity = 0.5;
  }
  // ---- Water drip (wet player): one blue droplet falling from the gun ----
  function drip(x, y, z) {
    spawn(x, y, z, (Math.random() - 0.5) * 0.2, -0.5, (Math.random() - 0.5) * 0.2, 0x7fb8ff, 0.7, 9, 0.7);
  }
  function step(dt) {
    for (const p of particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy -= p.grav * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
      if (p.mesh.position.y <= 0.03) {
        if (p.stain) decal(p.mesh.position.x, 0.025, p.mesh.position.z, 0, 1, 0, 0x550000, 0.5, 8);
        p.life = 0;
      }
      if (p.life <= 0) p.mesh.visible = false;
    }
    for (const d of decals) {
      if (d.life <= 0) continue;
      d.life -= dt;
      if (d.life <= 0) d.mesh.visible = false;
      else if (d.life < 1) d.mesh.material.opacity = 0.9 * d.life;
    }
    for (const p of pools) {
      if (p.life <= 0) continue;
      p.life -= dt;
      const grow = Math.min(1, (10 - p.life) / 2); // grows over ~2s
      p.mesh.scale.setScalar(0.2 + (p.maxR - 0.2) * grow);
      if (p.life < 2) p.mesh.material.opacity = 0.85 * (p.life / 2);
      if (p.life <= 0) p.mesh.visible = false;
    }
    for (const t of tracers) {
      if (t.life <= 0) continue;
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / 0.09) * 0.8;
      t.tube.material.opacity = Math.max(0, t.life / 0.09) * 0.6;
      if (t.life <= 0) { t.line.visible = false; t.tube.visible = false; }
    }
    for (const s of shells) {
      if (s.life <= 0) continue;
      s.life -= dt;
      s.vy -= 9.8 * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      s.mesh.rotation.x += s.rx * dt; s.mesh.rotation.z += s.rz * dt;
      if (s.mesh.position.y <= 0.04) {
        s.mesh.position.y = 0.04;
        if (!s.bounced) {
          s.bounced = true; s.vy = Math.abs(s.vy) * 0.3; s.vx *= 0.5; s.vz *= 0.5;
          // Shell bounce pitch follows the floor (v18.2.4): wood 800 Hz,
          // metal/concrete 2500 Hz, sand almost silent.
          if (audio.shellTing) {
            const surf = S.surface || 'concrete';
            if (surf !== 'sand') audio.shellTing(surf === 'wood' ? 800 : 2500);
          }
        } else { s.vy = 0; s.vx = 0; s.vz = 0; s.rx = 0; s.rz = 0; }
      }
      if (s.life <= 0) s.mesh.visible = false;
    }
    for (const s of smokes) {
      if (s.life <= 0) continue;
      s.life -= dt;
      s.sprite.position.x += s.vx * dt; s.sprite.position.y += s.vy * dt; s.sprite.position.z += s.vz * dt;
      s.size += s.grow * dt; // grows and fades
      s.sprite.scale.set(s.size, s.size, 1);
      s.sprite.material.opacity = Math.max(0, s.life / (s.maxLife || 0.9)) * s.baseOp;
      if (s.life <= 0) s.sprite.visible = false;
    }
    if (flashT > 0) {
      flashT -= dt;
      flash.material.opacity = Math.max(0, flashT / 0.06);
      flashLight.intensity = Math.max(0, flashT / 0.06) * 4;
      if (flashT <= 0) { flash.visible = false; flashLight.intensity = 0; }
    }
    // Explosion fireball grows then fades; its light decays with it.
    if (fireballT > 0) {
      fireballT -= dt;
      const f = Math.max(0, fireballT / 0.5);
      fireball.material.opacity = f * 0.95;
      fireball.scale.setScalar(fireballMax * (1.6 - f * 0.6));
      boomLight.intensity = f * (fireballMax > 2 ? 12 : 8);
      if (fireballT <= 0) { fireball.visible = false; boomLight.intensity = 0; }
    }
    for (let i = clothBlood.length - 1; i >= 0; i--) {
      const c = clothBlood[i];
      c.life -= dt;
      if (c.life <= 0) { c.parent.remove(c.mesh); clothBlood.splice(i, 1); }
      else if (c.life < 1) c.mesh.material.opacity = 0.95 * c.life;
    }
    // Water ripples grow and fade.
    for (const r of ripples) {
      if (r.life <= 0) continue;
      r.life -= dt;
      r.mesh.scale.addScalar(dt * 2.2);
      r.mesh.material.opacity = Math.max(0, r.life / 0.8) * 0.8;
      if (r.life <= 0) r.mesh.visible = false;
    }
    if (shakeT > 0) shakeT -= dt;
  }
  return {
    bloodSpray, bloodPool, bloodOnBody, screenBlood,
    muzzle, tracer, shell, impact, explosion, step,
    glass, trailDrop, footDust, slideDust, footprint, smokePuff, splash, drip, tireTrack,
    shakeAmp() { return Math.max(0, shakeT) * 0.12; },
    // v27.0: explicit screen shake (quake / nearby blast).
    shake(t) { shakeT = Math.max(shakeT, t || 0.4); },
    // v27.0: haptic helper — navigator.vibrate, guarded (desktop: no-op).
    vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} },
    // v27.0: slow-mo — sets the shared time scale; main.js frame
    // multiplies dt by S.timeScale while S.timeScaleT > 0.
    slowMotion(factor, dur) { S.timeScale = factor; S.timeScaleT = dur || 1; },
    // v27.0.1: ONE effect dispatcher — every named effect routes to the
    // system that already exists; the small new ones are cheap overlays
    // driven by S fields (main.js frame applies the CSS classes).
    playEffect(name, pos) {
      const p = pos || { x: 0, y: 1, z: 0 };
      if (name === 'explosion') explosion(p, true);
      else if (name === 'fire' || name === 'burn') { explosion(p, false); if (audio && audio.explosion) audio.explosion(); }
      else if (name === 'poison') { smokePuff(p.x, p.y, p.z); smokePuff(p.x + 0.3, p.y + 0.2, p.z); }
      else if (name === 'freeze') { S.freezeT = 3; smokePuff(p.x, p.y, p.z); if (audio && audio.freeze) audio.freeze(); }
      else if (name === 'stun') { screenBlood(); shakeT = Math.max(shakeT, 0.5); }
      else if (name === 'buff') { smokePuff(p.x, p.y + 0.5, p.z); if (audio && audio.levelUp) audio.levelUp(); }
      else if (name === 'debuff') { bloodSpray(p, { x: 0, y: 1, z: 0 }, false); }
      else if (name === 'nightvision') { S.nightVision = !S.nightVision; }
      else if (name === 'thermal') { S.thermal = !S.thermal; }
      else if (name === 'smoke') smokePuff(p.x, p.y, p.z);
      else if (name === 'splash') splash(p);
      else if (name === 'glass') glass(p);
      return name;
    },
    // Active counts, for the scripted self-test only.
    debugCounts() {
      return {
        particles: particles.filter(p => p.life > 0).length,
        decals: decals.filter(d => d.life > 0).length,
        pools: pools.filter(p => p.life > 0).length,
        tracers: tracers.filter(t => t.life > 0).length,
      };
    },
  };
}
