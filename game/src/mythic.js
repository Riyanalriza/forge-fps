// Mythic 3D effects — all procedural, all client-side, single-player.
// Reusable factories (createDragon3D / createVoidPortal3D) feed both the
// mythic kill effects and the round-win finishers. No network, no server.
import * as THREE from 'three';
import { FINISHER_DEFS } from './state.js';

// ---- Procedural dragon: 5 body segments, flapping wings, horns, yellow eyes ----
export function createDragon3D(scale = 1) {
  const g = new THREE.Group();
  const bodyM = new THREE.MeshStandardMaterial({ color: 0xff2200, roughness: 0.5, metalness: 0.3, emissive: 0x881100, emissiveIntensity: 0.5 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x881100, roughness: 0.6 });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xffee00 });
  const segments = [];
  for (let i = 0; i < 5; i++) {
    const r = 0.42 - i * 0.06;
    const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), bodyM);
    seg.position.set(0, 0, -i * 0.55);
    seg.castShadow = true;
    g.add(seg); segments.push(seg);
  }
  // Head + horns + eyes
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.9, 8), bodyM);
  head.rotation.x = -Math.PI / 2; head.position.set(0, 0.1, 0.75);
  g.add(head);
  for (const sx of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 6), darkM);
    horn.position.set(sx * 0.18, 0.35, 0.5); horn.rotation.x = -0.5;
    g.add(horn);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), eyeM);
    eye.position.set(sx * 0.18, 0.16, 0.95);
    g.add(eye);
  }
  // Wings (pivot at the body so they can flap)
  const wingGeo = new THREE.BoxGeometry(1.6, 0.06, 0.8);
  const wingL = new THREE.Group(), wingR = new THREE.Group();
  const wl = new THREE.Mesh(wingGeo, darkM); wl.position.x = -0.9;
  const wr = new THREE.Mesh(wingGeo, darkM); wr.position.x = 0.9;
  wingL.add(wl); wingR.add(wr);
  wingL.position.set(-0.2, 0.25, 0.2); wingR.position.set(0.2, 0.25, 0.2);
  g.add(wingL, wingR);
  g.scale.setScalar(scale);
  return {
    group: g,
    flap(t) {
      const a = Math.sin(t * 14) * 0.55;
      wingL.rotation.z = a; wingR.rotation.z = -a;
    },
  };
}

// ---- Procedural void portal: 2 counter-rotating rings + orbiting particles ----
export function createVoidPortal3D(scale = 1) {
  const g = new THREE.Group();
  const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.12, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0x8a00ff }),
  );
  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.09, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0x00ffff }),
  );
  const core = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 24),
    new THREE.MeshBasicMaterial({ color: 0x1a0033, side: THREE.DoubleSide }),
  );
  g.add(ring1, ring2, core);
  const orbiters = [];
  const orbGeo = new THREE.SphereGeometry(0.05, 6, 6);
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(orbGeo, new THREE.MeshBasicMaterial({ color: i % 2 ? 0xaa00ff : 0x00ffff }));
    m.userData = { a: Math.random() * Math.PI * 2, r: 1.3 + Math.random() * 0.6, s: 1 + Math.random() * 2 };
    g.add(m); orbiters.push(m);
  }
  g.scale.setScalar(scale);
  return {
    group: g,
    spin(dt, t) {
      ring1.rotation.z += dt * 2; ring2.rotation.z -= dt * 3;
      for (const o of orbiters) {
        o.userData.a += dt * o.userData.s;
        o.position.set(Math.cos(o.userData.a) * o.userData.r, Math.sin(o.userData.a) * o.userData.r, 0);
      }
      const pulse = 1 + Math.sin(t * 5) * 0.06;
      core.scale.setScalar(pulse);
    },
  };
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

export function createMythicFx(scene, S, audio, hud) {
  // ---- Shared particle pool (reused spheres) ----
  const POOL = 220;
  const pGeo = new THREE.SphereGeometry(0.09, 6, 6);
  const parts = [];
  for (let i = 0; i < POOL; i++) {
    const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
    m.visible = false; scene.add(m);
    parts.push({ mesh: m, life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, grav: 0, spin: 0 });
  }
  let pIdx = 0;
  function spawnParticle(x, y, z, opts) {
    const p = parts[pIdx]; pIdx = (pIdx + 1) % POOL;
    p.mesh.position.set(x, y, z);
    p.mesh.material.color.setHex(opts.colors[Math.floor(Math.random() * opts.colors.length)]);
    p.mesh.scale.setScalar(opts.size || 1);
    p.mesh.visible = true; p.mesh.material.opacity = 1;
    const a = Math.random() * Math.PI * 2, sp = (opts.speed || 4) * (0.4 + Math.random() * 0.8);
    p.vx = Math.cos(a) * sp; p.vz = Math.sin(a) * sp;
    p.vy = (opts.up ?? 2) * (0.5 + Math.random());
    p.grav = opts.gravity ?? -9;
    p.maxLife = p.life = (opts.life || 1) * (0.6 + Math.random() * 0.7);
    p.spin = (Math.random() - 0.5) * 6;
  }
  function burst(x, y, z, opts) {
    for (let i = 0; i < (opts.count || 20); i++) spawnParticle(x, y, z, opts);
  }
  // ---- Shared ring pool (expanding rings) ----
  const rings = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m);
    rings.push({ mesh: m, life: 0, maxLife: 1, maxR: 10 });
  }
  let rIdx = 0;
  function spawnRing(x, z, color, maxR, life = 1) {
    const r = rings[rIdx]; rIdx = (rIdx + 1) % rings.length;
    r.mesh.position.set(x, 0.08, z);
    r.mesh.material.color.setHex(color);
    r.mesh.visible = true; r.mesh.material.opacity = 0.85;
    r.maxR = maxR; r.maxLife = r.life = life;
  }
  function stepPool(dt) {
    for (const p of parts) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy += p.grav * dt;
      p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
      if (p.mesh.position.y < 0.05) { p.mesh.position.y = 0.05; p.vy *= -0.3; }
      p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
      p.mesh.rotation.y += p.spin * dt;
      if (p.life <= 0) p.mesh.visible = false;
    }
    for (const r of rings) {
      if (r.life <= 0) continue;
      r.life -= dt;
      const k = 1 - r.life / r.maxLife;
      r.mesh.scale.setScalar(0.5 + k * r.maxR);
      r.mesh.material.opacity = 0.85 * (1 - k);
      if (r.life <= 0) r.mesh.visible = false;
    }
  }

  // ---- Kill effects ----
  const dragons = []; // {dragon, t, dur, from, ctrl, to}
  const portals = []; // {portal, t, dur, bot}
  function dragonKill(from, to) {
    const d = createDragon3D(1);
    scene.add(d.group);
    const mid = _v.set((from.x + to.x) / 2, 6, (from.z + to.z) / 2);
    dragons.push({
      dragon: d, t: 0, dur: 0.9,
      from: { x: from.x, y: from.y + 1.6, z: from.z },
      ctrl: { x: mid.x, y: mid.y, z: mid.z },
      to: { x: to.x, y: 1.4, z: to.z },
    });
    audio.roar();
  }
  function voidKill(bot) {
    const portal = createVoidPortal3D(1);
    portal.group.position.set(bot.x, 1.4, bot.z);
    portal.group.rotation.y = Math.random() * 3;
    scene.add(portal.group);
    bot.mesh.group.visible = true; // re-show so the suck animation reads
    portals.push({ portal, t: 0, dur: 0.9, bot });
    audio.voidSound();
  }
  function stepKills(dt) {
    for (let i = dragons.length - 1; i >= 0; i--) {
      const d = dragons[i];
      d.t += dt;
      const k = Math.min(1, d.t / d.dur);
      // Quadratic bezier
      const u = 1 - k;
      const x = u * u * d.from.x + 2 * u * k * d.ctrl.x + k * k * d.to.x;
      const y = u * u * d.from.y + 2 * u * k * d.ctrl.y + k * k * d.to.y;
      const z = u * u * d.from.z + 2 * u * k * d.ctrl.z + k * k * d.to.z;
      d.dragon.group.position.set(x, y, z);
      _v2.set(d.to.x - x, d.to.y - y, d.to.z - z);
      if (_v2.lengthSq() > 0.01) d.dragon.group.lookAt(d.to.x, d.to.y, d.to.z);
      d.dragon.flap(S.time);
      // Fire trail
      if (Math.random() < 0.7) spawnParticle(x, y, z, { count: 1, colors: [0xff5500, 0xffaa00], speed: 0.5, up: 0.3, gravity: 2, size: 1.4, life: 0.5 });
      if (k >= 1) {
        burst(d.to.x, 1.2, d.to.z, { count: 40, colors: [0xff5500, 0xffaa00, 0xff2200, 0xffee00], speed: 7, up: 4, gravity: -9, size: 1.6, life: 1.2 });
        spawnRing(d.to.x, d.to.z, 0xff5500, 9, 0.9);
        scene.remove(d.dragon.group);
        dragons.splice(i, 1);
      }
    }
    for (let i = portals.length - 1; i >= 0; i--) {
      const p = portals[i];
      p.t += dt;
      const k = Math.min(1, p.t / p.dur);
      p.portal.spin(dt, S.time);
      // Victim is sucked in: shrink + spin.
      const s = Math.max(0.01, 1 - k);
      p.bot.mesh.group.scale.setScalar(s);
      p.bot.mesh.group.rotation.y += dt * 12;
      if (k >= 1) {
        p.bot.mesh.group.visible = false;
        p.bot.mesh.group.scale.setScalar(1);
        scene.remove(p.portal.group);
        portals.splice(i, 1);
      }
    }
  }

  // ---- Finishers (round-win cinematics) ----
  const fin = { active: null }; // {kind, t, dur, cx, cz, objs: [{update}]}
  const finisherObjs = [];
  function clearFinisherObjs() {
    for (const o of finisherObjs) if (o.group) scene.remove(o.group);
    finisherObjs.length = 0;
  }
  function addFinisherObj(group, update) { scene.add(group); finisherObjs.push({ group, update }); }

  function spawnDragonFinisher(cx, cz) {
    for (let i = 0; i < 3; i++) {
      const d = createDragon3D(3);
      addFinisherObj(d.group, (dt, t) => {
        const a = t * 0.5 + i * (Math.PI * 2 / 3);
        d.group.position.set(cx + Math.cos(a) * 10, 5 + Math.sin(t * 0.8 + i) * 1.5, cz + Math.sin(a) * 10);
        d.group.rotation.y = -a;
        d.flap(t);
        if (Math.random() < 0.25) {
          const hx = cx + Math.cos(a) * 10, hz = cz + Math.sin(a) * 10;
          burst(hx, 4.5, hz, { count: 3, colors: [0xff5500, 0xffaa00], speed: 2, up: -1, gravity: -2, size: 1.5, life: 0.8 });
        }
      });
    }
    setTimeout(() => {
      burst(cx, 1.5, cz, { count: 60, colors: [0xff5500, 0xffaa00, 0xff2200, 0xffee00], speed: 9, up: 5, gravity: -9, size: 1.8, life: 1.5 });
      spawnRing(cx, cz, 0xff5500, 14, 1.2);
    }, 1500);
    audio.roar(); audio.cinematic('dragon');
  }
  function spawnVoidFinisher(cx, cz) {
    const p = createVoidPortal3D(4);
    p.group.position.set(cx, 2, cz);
    addFinisherObj(p.group, (dt, t) => p.spin(dt, t));
    // Suck-in particles: spawn around the rim, spiral inward.
    const suck = { t: 0 };
    finisherObjs.push({ group: null, update: (dt, t) => {
      suck.t += dt;
      if (suck.t > 0.08) {
        suck.t = 0;
        const a = Math.random() * Math.PI * 2;
        spawnParticle(cx + Math.cos(a) * 12, 1 + Math.random() * 4, cz + Math.sin(a) * 12,
          { count: 1, colors: [0xaa00ff, 0x00ffff], speed: 0.5, up: 0, gravity: 0, size: 1.2, life: 1.4 });
      }
    } });
    setTimeout(() => hud.flashPurple(), 3000);
    audio.voidSound(); audio.cinematic('void');
  }
  function spawnGoldFinisher(cx, cz) {
    const coinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 12);
    const coinM = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.3, metalness: 0.9, emissive: 0x664400, emissiveIntensity: 0.4 });
    const coins = new THREE.Group();
    for (let i = 0; i < 50; i++) {
      const c = new THREE.Mesh(coinGeo, coinM);
      c.position.set(cx + (Math.random() - 0.5) * 16, 8 + Math.random() * 8, cz + (Math.random() - 0.5) * 16);
      c.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      c.userData = { vy: 0, spin: (Math.random() - 0.5) * 8 };
      coins.add(c);
    }
    addFinisherObj(coins, (dt) => {
      for (const c of coins.children) {
        c.userData.vy -= 9 * dt;
        c.position.y += c.userData.vy * dt;
        c.rotation.x += c.userData.spin * dt;
        if (c.position.y < 0.1) { c.position.y = 0.1; c.userData.vy = 0; }
      }
    });
    burst(cx, 1.5, cz, { count: 30, colors: [0xffcc00, 0xffe680, 0xffaa00], speed: 6, up: 4, gravity: -9, size: 1.4, life: 1.2 });
    spawnRing(cx, cz, 0xffcc00, 10, 1);
    audio.coin(); audio.cinematic('gold');
  }
  function spawnNeonFinisher(cx, cz) {
    const lasers = new THREE.Group();
    const cols = [0x00ff88, 0xff00ff, 0x00ffff, 0xffcc00];
    for (let i = 0; i < 8; i++) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 14, 0.12),
        new THREE.MeshBasicMaterial({ color: cols[i % 4], transparent: true, opacity: 0.9 }),
      );
      const a = i * Math.PI / 4;
      beam.position.set(cx + Math.cos(a) * 5, 7, cz + Math.sin(a) * 5);
      beam.rotation.z = Math.cos(a) * 0.35; beam.rotation.x = -Math.sin(a) * 0.35;
      lasers.add(beam);
    }
    addFinisherObj(lasers, (dt, t) => {
      lasers.children.forEach((b, i) => { b.material.opacity = 0.5 + Math.abs(Math.sin(t * 8 + i)) * 0.5; });
    });
    const cubes = new THREE.Group();
    for (let i = 0; i < 20; i++) {
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshBasicMaterial({ color: cols[i % 4], wireframe: true }),
      );
      c.position.set(cx + (Math.random() - 0.5) * 14, 1 + Math.random() * 6, cz + (Math.random() - 0.5) * 14);
      c.userData = { s: 0.5 + Math.random() * 2 };
      cubes.add(c);
    }
    addFinisherObj(cubes, (dt) => {
      for (const c of cubes.children) { c.rotation.x += c.userData.s * dt; c.rotation.y += c.userData.s * dt; }
    });
    audio.laser(); audio.cinematic('neon');
  }
  function spawnCrimsonFinisher(cx, cz) {
    const fog = new THREE.Mesh(
      new THREE.SphereGeometry(12, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xcc1122, transparent: true, opacity: 0.16, depthWrite: false }),
    );
    fog.position.set(cx, 2, cz);
    addFinisherObj(fog, (dt, t) => { fog.material.opacity = 0.12 + Math.sin(t * 3) * 0.05; });
    const knives = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const k = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.7, 0.18),
        new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.2, metalness: 0.9 }),
      );
      knives.add(k);
    }
    addFinisherObj(knives, (dt, t) => {
      knives.children.forEach((k, i) => {
        const a = t * 2.2 + i * Math.PI / 3;
        k.position.set(cx + Math.cos(a) * 4, 1.6 + Math.sin(t * 2 + i) * 0.4, cz + Math.sin(a) * 4);
        k.rotation.z = t * 6 + i;
      });
    });
    burst(cx, 1.5, cz, { count: 30, colors: [0xcc1122, 0xff2244, 0x880011], speed: 5, up: 3, gravity: -9, size: 1.3, life: 1 });
    audio.cinematic('crimson');
  }
  function spawnFrostFinisher(cx, cz) {
    const crys = new THREE.Group();
    const crysM = new THREE.MeshStandardMaterial({ color: 0xaaeeff, roughness: 0.1, metalness: 0.2, emissive: 0x336688, emissiveIntensity: 0.5 });
    for (let i = 0; i < 40; i++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.3 + Math.random() * 0.35), crysM);
      c.position.set(cx + (Math.random() - 0.5) * 16, 8 + Math.random() * 8, cz + (Math.random() - 0.5) * 16);
      c.userData = { vy: 0, spin: (Math.random() - 0.5) * 6 };
      crys.add(c);
    }
    addFinisherObj(crys, (dt) => {
      for (const c of crys.children) {
        c.userData.vy -= 7 * dt;
        c.position.y += c.userData.vy * dt;
        c.rotation.x += c.userData.spin * dt;
        if (c.position.y < 0.2) { c.position.y = 0.2; c.userData.vy = 0; }
      }
    });
    spawnRing(cx, cz, 0x66ccff, 14, 1.4);
    burst(cx, 1.5, cz, { count: 25, colors: [0xaaeeff, 0xffffff, 0x66ccff], speed: 4, up: 3, gravity: -9, size: 1.2, life: 1 });
    audio.freeze(); audio.cinematic('frost');
  }
  function spawnRainbowFinisher(cx, cz) {
    const conf = new THREE.Group();
    const cols = [0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x4b0082, 0x9400d3];
    for (let i = 0; i < 60; i++) {
      const c = new THREE.Mesh(
        new THREE.PlaneGeometry(0.25, 0.35),
        new THREE.MeshBasicMaterial({ color: cols[i % 7], side: THREE.DoubleSide }),
      );
      c.position.set(cx + (Math.random() - 0.5) * 14, 7 + Math.random() * 7, cz + (Math.random() - 0.5) * 14);
      c.userData = { vy: 0, spin: (Math.random() - 0.5) * 8, flutter: Math.random() * 6 };
      conf.add(c);
    }
    addFinisherObj(conf, (dt, t) => {
      for (const c of conf.children) {
        c.userData.vy -= 3 * dt;
        c.position.y += c.userData.vy * dt;
        c.position.x += Math.sin(t * 3 + c.userData.flutter) * dt * 1.5;
        c.rotation.x += c.userData.spin * dt;
        if (c.position.y < 0.1) { c.position.y = 0.1; c.userData.vy = 0; }
      }
    });
    // Rainbow arc: 7 half-torus, one per color.
    const arc = new THREE.Group();
    cols.forEach((col, i) => {
      const t = new THREE.Mesh(
        new THREE.TorusGeometry(6 - i * 0.5, 0.28, 8, 32, Math.PI),
        new THREE.MeshBasicMaterial({ color: col }),
      );
      arc.add(t);
    });
    arc.position.set(cx, 0.5, cz - 6);
    addFinisherObj(arc, (dt, t) => { arc.rotation.y = Math.sin(t * 0.4) * 0.3; });
    audio.cinematic('rainbow');
  }

  function playFinisher(kind, cx, cz, killerName, victimName) {
    const def = FINISHER_DEFS[kind] || FINISHER_DEFS.execution;
    clearFinisherObjs();
    fin.active = { kind, t: 0, dur: def.dur, cx, cz };
    S.finisher = fin.active; // main.js reads this for the cinematic camera + slow-mo
    if (kind === 'dragon') spawnDragonFinisher(cx, cz);
    else if (kind === 'void') spawnVoidFinisher(cx, cz);
    else if (kind === 'gold') spawnGoldFinisher(cx, cz);
    else if (kind === 'neon') spawnNeonFinisher(cx, cz);
    else if (kind === 'crimson') spawnCrimsonFinisher(cx, cz);
    else if (kind === 'frost') spawnFrostFinisher(cx, cz);
    else if (kind === 'rainbow') spawnRainbowFinisher(cx, cz);
    else audio.cinematic('execution');
    hud.showFinisher(kind, def.name, killerName, victimName, def.desc);
    return fin.active;
  }
  function stepFinisher(dt, onDone) {
    if (!fin.active) return;
    const f = fin.active;
    f.t += dt;
    for (const o of finisherObjs) o.update && o.update(dt, f.t);
    hud.setFinisherProgress(Math.min(1, f.t / f.dur));
    if (f.t >= f.dur) {
      const kind = f.kind;
      fin.active = null;
      S.finisher = null;
      clearFinisherObjs();
      hud.hideFinisher();
      audio.stopCinematic();
      onDone && onDone(kind);
    }
  }
  function step(dt, onFinisherDone) {
    stepPool(dt);
    stepKills(dt);
    stepFinisher(dt, onFinisherDone);
  }
  return {
    dragonKill, voidKill, playFinisher, step,
    get finisher() { return fin.active; },
  };
}
