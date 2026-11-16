// Map props system — all procedural, all client-side, single-player.
// Builders for boxes, houses with full interiors (enterable doors, stairs to
// floor 2/3, furniture), containers, vehicles, towers, bridges and more.
// Colliders are AABBs with optional y-ranges {y0, y1} so a closed door blocks
// only below 3m, a railing only at its floor, etc. Clear removes everything
// the props added so a new map can be built in place.
import * as THREE from 'three';
import { SEASONS } from './palette.js';

export const FH = 4.7; // floor height — floor 2 standing Y, 6 stair steps

const _corners = [[0, 0], [1, 0], [0, 1], [1, 1]];

function rotPt(lx, lz, rot) {
  const q = ((rot % 360) + 360) % 360;
  if (q === 0) return [lx, lz];
  if (q === 90) return [lz, -lx];
  if (q === 180) return [-lx, -lz];
  return [-lz, lx]; // 270
}

export function createProps(scene, colliders, shootables, doors, levels, stairs) {
  const group = new THREE.Group();
  scene.add(group);
  const propColliders = [];
  const propShootables = [];
  const propDoors = [];
  const propLevels = [];
  const propStairs = [];
  // Animated decor registry (v17.1): flags wave, TVs change color, fires
  // flicker, street lamps blink, swings sway — all updated in one
  // animateDecor(dt, time, wind) call from the main loop, no setInterval.
  const decorFlags = []; // {mesh, phase}
  const decorTvs = [];   // {mat, nextT}
  const decorFires = []; // {mesh, phase}
  const decorLights = []; // {mat, light, phase}
  const decorHouseLights = []; // one warm PointLight per house interior (v18.6.2)
  const decorSwings = []; // {seat, phase}
  const decorBirds = []; // {group, wingL, wingR, angle, radius, height, speed, phase}
  const decorBrokenLights = []; // {mat, light, phase} — flickering broken lamps
  // v18.9 ambient registries — all driven from animateDecor, no intervals.
  const decorSparks = []; // {mesh, phase} — electric spark flashes every ~2s
  const decorNeon = []; // {mat, phase} — blinking neon shop signs
  const decorFountains = []; // {drops: [mesh], baseY, phase}
  const decorBubbles = []; // {mesh, baseY, phase} — bubbles rising in pools
  const decorButterflies = []; // {group, wingL, wingR, angle, radius, height, phase}
  const decorLeaves = []; // {mesh, fallSpeed, swayPhase, x0, z0}
  const decorPapers = []; // {mesh, phase} — papers fluttering on the ground
  const decorClocks = []; // {hour, minute, phase} — wall clocks, hands move
  // v19.2 prop-hit registries.
  const treeRecs = []; // {group, hp, x, z, collider, meshes} — trees fall at HP 0
  const fallingProps = []; // {mesh, vx, vz, t} — cans rolling after a shot
  const flowerSpots = []; // {x, z, mesh, taken} — flowers trample when stepped on
  const ammoBoxes = []; // {x, z, mesh, taken} — green boxes, +60 reserve
  const lootCrates = []; // {x, z, mesh, opened} — yellow BR crates, E to open
  const lifts = []; // {x, z, mesh} — press E near a lift to change floor
  const mudRects = []; // {x0,z0,x1,z1} — mud slows you 20% for 1s
  let lightsOut = false; // generator shot: every map light off for 10s
  // v22.3 / v22.4 registries.
  const bushes = []; // {x, z, mesh} — hide in a bush, bots lose you 3s
  const containers = []; // {x, z, mesh} — E opens: armor + ammo + medkit
  const decorTraffic = []; // {red, yellow, green, t, dead} — traffic lights cycle
  const decorDummies = []; // {group, phase} — training dummies wobble on hit
  const interactables = []; // {type, x, z, mesh, used} — vending/atm/phone/suitcase/cart
  // v27.0 ambient life: animals wander + NPCs stand at their stalls.
  const decorAnimals = []; // {kind, group, x, z, phase, head, tail, wanderT, tx, tz}
  // v24.1 color system: materials tagged by kind so the whole map can be
  // recolored live (building/roof/door/window/container/fence/tent/statue/
  // rock/road/leaves/flowers/water/grass/billboard). Each box()/mat() call
  // makes a fresh material, so tagging a mesh's material is safe.
  const colorMats = []; // {kind, mat}
  function tagColor(mesh, kind) { if (mesh && mesh.material) colorMats.push({ kind, mat: mesh.material }); return mesh; }
  function recolor(kind, hex) {
    for (const c of colorMats) {
      if (c.kind !== kind) continue;
      c.mat.color.set(hex);
      if (c.mat.emissive && c.mat.emissiveIntensity > 0) c.mat.emissive.set(hex);
    }
  }
  function setSeason(season) {
    const s = SEASONS[season] || SEASONS.summer;
    recolor('leaves', s.leaves); recolor('grass', s.grass);
    recolor('flowers', s.flowers); recolor('tree', s.tree);
  }
  // Recolor every map light (street lamps + house bulbs + PointLights).
  function setLightColor(hex) {
    for (const l of decorLights) { if (l.light) l.light.color.set(hex); if (l.mat) l.mat.color.set(hex); }
    for (const h of decorHouseLights) if (h.light) h.light.color.set(hex);
    for (const b of decorBrokenLights) if (b.light) b.light.color.set(hex);
  }
  // Destructibles (v18): {kind, hp, x, z, meshes, collider, smoking}
  // kind: barrel (HP 50, explodes), car (HP 200, smokes <50%, 2 blasts),
  // window (HP 1, shatters), destruct (HP 30, table/crate breaks).
  const destructibles = [];
  const houseRects = []; // {x0,z0,x1,z1} per house — for isIndoors()
  const pools = []; // {x0,z0,x1,z1} per pool — for water splash + wet player
  function animateDecor(dt, time, wind = 1) {
    for (const f of decorFlags) {
      if (f.mesh.userData.torn) continue; // torn flag (v19.2.9) stops waving
      f.mesh.rotation.y = Math.sin(time * 2.2 + f.phase) * 0.16 * wind;
      f.mesh.rotation.z = Math.sin(time * 3.1 + f.phase) * 0.08 * wind;
    }
    for (const t of decorTvs) {
      if (t.dead) continue; // smashed TV (v19.2.2): screen stays dark
      if (time >= t.nextT) { t.nextT = time + 0.8; t.mat.color.setHSL(Math.random(), 0.7, 0.55); }
    }
    for (const f of decorFires) {
      const s = 1 + Math.sin(time * 9 + f.phase) * 0.12;
      f.mesh.scale.set(s, 1 + Math.sin(time * 11 + f.phase) * 0.2, s);
    }
    for (const l of decorLights) {
      if (lightsOut) { if (l.light) l.light.intensity = 0; continue; } // generator out (v19.2.12)
      if (l.dead) { if (l.light) l.light.intensity = 0; continue; } // shot lamp (v19.2.1)
      const on = Math.sin(time * 1.5 + l.phase) > -0.85;
      l.mat.color.setHex(on ? 0xffe9b0 : 0x8a7a50);
      if (l.mat.emissive) l.mat.emissive.setHex(on ? 0xffe9b0 : 0x2a2410); // emissive bulb dims too
      if (l.light) l.light.intensity = on ? 6 : 1.5;
    }
    for (const s of decorSwings) s.seat.rotation.x = Math.sin(time * 1.2 + s.phase) * 0.25;
    // Birds: circle overhead, wings flap (no setInterval — main loop only).
    for (const b of decorBirds) {
      b.angle += dt * b.speed;
      const x = Math.cos(b.angle) * b.radius, z = Math.sin(b.angle) * b.radius;
      b.group.position.set(x, b.height + Math.sin(time * 0.8 + b.phase) * 1.5, z);
      b.group.rotation.y = -b.angle;
      const flap = Math.sin(time * 10 + b.phase) * 0.6;
      b.wingL.rotation.z = flap; b.wingR.rotation.z = -flap;
    }
    // Broken lamps flicker erratically.
    for (const l of decorBrokenLights) {
      const on = Math.sin(time * 13 + l.phase) * Math.sin(time * 7.7 + l.phase) > -0.2;
      l.mat.color.setHex(on ? 0xffe9b0 : 0x4a4030);
      if (l.light) l.light.intensity = on ? 4 : 0.3;
    }
    // v18.9 ambient: sparks flash ~every 2s, neon signs blink, fountain
    // drops bob, pool bubbles rise, butterflies orbit, leaves fall, papers
    // flutter, clock hands turn — all in this one loop, no intervals.
    for (const s of decorSparks) {
      const cyc = (time + s.phase) % 2;
      const on = cyc < 0.12;
      s.mesh.visible = on;
      if (on) s.mesh.scale.setScalar(0.6 + Math.random() * 0.9);
    }
    for (const n of decorNeon) {
      const on = Math.sin(time * 2.5 + n.phase) > -0.6;
      n.mat.emissiveIntensity = on ? 2.4 : 0.25;
    }
    for (const f of decorFountains) {
      f.drops.forEach((d, i) => {
        const k = ((time * 0.7 + f.phase + i / f.drops.length) % 1);
        d.position.y = f.baseY + Math.sin(k * Math.PI) * 1.1;
        d.visible = k < 0.98;
      });
    }
    for (const b of decorBubbles) {
      const k = ((time * 0.25 + b.phase) % 1);
      b.mesh.position.y = b.baseY + k * 0.25;
      b.mesh.scale.setScalar(0.5 + k * 0.7);
    }
    for (const b of decorButterflies) {
      b.angle += dt * 0.35;
      const x = Math.cos(b.angle) * b.radius, z = Math.sin(b.angle) * b.radius;
      b.group.position.set(x + b.cx, b.height + Math.sin(time * 1.3 + b.phase) * 0.4, z + b.cz);
      b.group.rotation.y = -b.angle;
      const flap = Math.sin(time * 14 + b.phase) * 0.9;
      b.wingL.rotation.y = flap; b.wingR.rotation.y = -flap;
    }
    for (const l of decorLeaves) {
      l.mesh.position.y -= l.fallSpeed * dt;
      l.mesh.position.x += Math.sin(time * 1.5 + l.swayPhase) * dt * 0.5;
      l.mesh.rotation.y += dt * 1.5; l.mesh.rotation.z += dt * 0.8;
      if (l.mesh.position.y < 0.05) { l.mesh.position.y = 6 + Math.random() * 2; l.mesh.position.x = l.x0 + (Math.random() - 0.5) * 8; l.mesh.position.z = l.z0 + (Math.random() - 0.5) * 8; }
    }
    for (const p of decorPapers) {
      p.mesh.position.y = 0.03 + Math.abs(Math.sin(time * 1.8 + p.phase)) * 0.25;
      p.mesh.rotation.y += dt * 0.6;
    }
    for (const c of decorClocks) {
      c.minute.rotation.z = -(time * 0.001 + c.phase) * Math.PI * 2 / 60 * 60; // slow sweep
      c.hour.rotation.z = -(time * 0.0001 + c.phase) * Math.PI * 2 / 12 * 12;
    }
    // Cans rolling after being shot (v19.2.3): tip over + slide 2m, then stop.
    for (let i = fallingProps.length - 1; i >= 0; i--) {
      const f = fallingProps[i];
      f.t -= dt;
      f.mesh.position.x += f.vx * dt;
      f.mesh.position.z += f.vz * dt;
      f.mesh.rotation.z += dt * 6;
      if (f.t <= 0) fallingProps.splice(i, 1);
    }
    // Traffic lights (v22.4.7): red 4s → green 4s → yellow 1s, cycling.
    for (const t of decorTraffic) {
      if (t.dead) { t.red.material.emissiveIntensity = 0.1; t.yellow.material.emissiveIntensity = 0.1; t.green.material.emissiveIntensity = 0.1; continue; }
      t.t += dt;
      const ph = t.t % 9;
      if (ph < 4) { t.red.material.emissiveIntensity = 1.6; t.yellow.material.emissiveIntensity = 0.1; t.green.material.emissiveIntensity = 0.1; }
      else if (ph < 8) { t.red.material.emissiveIntensity = 0.1; t.yellow.material.emissiveIntensity = 0.1; t.green.material.emissiveIntensity = 1.6; }
      else { t.red.material.emissiveIntensity = 0.1; t.yellow.material.emissiveIntensity = 1.6; t.green.material.emissiveIntensity = 0.1; }
    }
    // Training dummies (v22.0.4): gentle idle wobble.
    for (const d of decorDummies) {
      d.group.rotation.z = Math.sin(time * 1.5 + d.phase) * 0.04;
    }
    // Ambient animals (v27.0.3 + micro-AI v28.0.5): wander to a nearby
    // spot, idle there, then wander again. Chicken pecks, dogs wag their
    // tail, horses graze (head down), fireflies blink at night.
    for (const a of decorAnimals) {
      a.wanderT -= dt;
      if (a.wanderT <= 0) {
        a.wanderT = 2 + Math.random() * 4;
        a.tx = a.x + (Math.random() - 0.5) * 6;
        a.tz = a.z + (Math.random() - 0.5) * 6;
      }
      const dx = a.tx - a.group.position.x, dz = a.tz - a.group.position.z;
      const dd = Math.hypot(dx, dz);
      if (dd > 0.3) {
        const sp = a.kind === 'horse' ? 1.2 : a.kind === 'chicken' ? 0.5 : 0.8;
        a.group.position.x += dx / dd * sp * dt;
        a.group.position.z += dz / dd * sp * dt;
        a.group.rotation.y = Math.atan2(dx, dz);
        a.group.position.y = Math.abs(Math.sin(time * 6 + a.phase)) * 0.03;
      }
      // Micro behaviors: chicken pecks, dog/cat tail wag, horse grazes.
      if (a.kind === 'chicken') a.head.position.y = a.headY - Math.abs(Math.sin(time * 8 + a.phase)) * 0.12;
      if (a.tail) a.tail.rotation.y = Math.sin(time * 5 + a.phase) * 0.5;
      if (a.kind === 'firefly') {
        const on = Math.sin(time * 2 + a.phase) > 0;
        a.group.visible = on;
        a.group.position.y = 1 + Math.sin(time * 1.2 + a.phase) * 0.4;
      }
    }
  }
  // Push a shot can into the rolling list (called from game.damagePropHit).
  function propFall(mesh, dirX, dirZ) {
    fallingProps.push({ mesh, vx: dirX * 3.2, vz: dirZ * 3.2, t: 0.65 });
  }
  // Generator shot (v19.2.12): every map light off/on at once.
  function setLightsOut(on) {
    lightsOut = !!on;
    for (const h of decorHouseLights) h.light.visible = !on;
    for (const l of decorBrokenLights) if (l.light) l.light.visible = !on;
  }
  // Leaves burst when a tree is shot (v19.2.8): 5 leaves fall at the spot.
  function dropLeaves(x, z) {
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.18),
        new THREE.MeshBasicMaterial({ color: 0x4a7a3a, side: THREE.DoubleSide }));
      leaf.position.set(x + (Math.random() - 0.5) * 1.5, 3 + Math.random(), z + (Math.random() - 0.5) * 1.5);
      group.add(leaf);
      decorLeaves.push({ mesh: leaf, fallSpeed: 0.7, swayPhase: Math.random() * 6, x0: x, z0: z });
    }
  }
  function decorCounts() {
  return {
      flags: decorFlags.length, tvs: decorTvs.length, fires: decorFires.length,
      lights: decorLights.length, swings: decorSwings.length,
      birds: decorBirds.length, brokenLights: decorBrokenLights.length,
      houseLights: decorHouseLights.length,
      sparks: decorSparks.length, neon: decorNeon.length,
      fountains: decorFountains.length, bubbles: decorBubbles.length,
      butterflies: decorButterflies.length, leaves: decorLeaves.length,
      papers: decorPapers.length, clocks: decorClocks.length,
      total: decorFlags.length + decorTvs.length + decorFires.length + decorLights.length + decorSwings.length + decorBirds.length + decorBrokenLights.length + decorHouseLights.length + decorSparks.length + decorNeon.length + decorFountains.length + decorBubbles.length + decorButterflies.length + decorLeaves.length + decorPapers.length + decorClocks.length,
    };
  }

  function mat(color, rough = 0.9, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.08, ...extra });
  }
  // ---- Shared procedural textures (built once per world, reused by every
  // map — one canvas per texture, never one per prop). All variation comes
  // from an index hash, NEVER from a random call, so the deterministic
  // gameplay sequence is untouched.
  function ptex(size, draw, rx = 1, ry = 1) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const _hash = (i) => (((i * 2654435761) >>> 0) % 1000) / 1000;
  // Red brick wall: running-bond courses, mortar joints, per-brick colour
  // variation + grime. Tile = 2.5m wide x 4m tall at repeat (32,1) on an
  // 80m wall, so one brick reads ~0.6m x 0.25m at play distance.
  let _brickTex = null;
  function brickTexture() {
    if (_brickTex) return _brickTex;
    _brickTex = ptex(256, (g, s) => {
      g.fillStyle = '#b8aa96'; g.fillRect(0, 0, s, s); // mortar
      const shades = ['#9c4a34', '#a8533c', '#8e4230', '#b25a40', '#a0503e', '#86402c', '#713a28'];
      const bw = 64, bh = 16;
      for (let row = 0; row < 16; row++) {
        const off = (row % 2) * (bw / 2);
        for (let cx = -1; cx < 5; cx++) {
          const h = _hash(row * 7 + cx * 13 + 3);
          g.fillStyle = shades[Math.floor(h * shades.length)];
          g.fillRect(cx * bw + off + 1, row * bh + 1, bw - 2, bh - 2);
          // per-brick tone: lighter top edge, darker bottom edge
          g.fillStyle = h < 0.5 ? 'rgba(255,220,190,0.16)' : 'rgba(0,0,0,0.12)';
          g.fillRect(cx * bw + off + 1, row * bh + 1, bw - 2, 5);
          g.fillStyle = 'rgba(0,0,0,0.12)';
          g.fillRect(cx * bw + off + 1, row * bh + bh - 5, bw - 2, 4);
        }
      }
      // grime blotches (index-hash positions only)
      for (let i = 0; i < 7; i++) {
        const x = (i * 97 + 31) % 256, y = (i * 57 + 113) % 256, r = 20 + (i * 37) % 40;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(30,20,12,0.20)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
    }, 32, 1);
    return _brickTex;
  }
  // Corrugated metal (reference site walls): vertical ridges + rust streaks.
  // Used as the backing of the bomb-site signs.
  let _corrTex = null;
  function corrugatedTexture() {
    if (_corrTex) return _corrTex;
    _corrTex = ptex(256, (g, s) => {
      g.fillStyle = '#6e4a3a'; g.fillRect(0, 0, s, s); // rust-brown base
      for (let x = 0; x < s; x += 16) {
        g.fillStyle = 'rgba(255,220,190,0.14)';
        g.fillRect(x, 0, 5, s);
        g.fillStyle = 'rgba(0,0,0,0.28)';
        g.fillRect(x + 9, 0, 6, s);
      }
      // rust streaks running down the ridges (index-hash only)
      for (let i = 0; i < 10; i++) {
        const x = (i * 67 + 13) % 256, w = 3 + (i * 11) % 8, len = 60 + (i * 41) % 140;
        g.fillStyle = 'rgba(40,20,10,0.25)';
        g.fillRect(x, (i * 53) % 100, w, len);
      }
    }, 2, 1);
    return _corrTex;
  }
  // Wooden supply crate: horizontal planks + grain + stencilled code.
  // Two shared variants (FY-4 / FY-7) cover every crate on every map.
  const _crateTex = {};
  function crateTexture(code = 'FY-4') {
    if (_crateTex[code]) return _crateTex[code];
    const tex = ptex(256, (g, s) => {
      g.fillStyle = '#8a6f4a'; g.fillRect(0, 0, s, s);
      for (let p = 0; p < 4; p++) {
        const y = p * 64;
        const h = _hash(p * 11 + 5);
        g.fillStyle = h < 0.5 ? '#93784f' : '#7d6242';
        g.fillRect(0, y + 2, s, 60);
        g.strokeStyle = 'rgba(40,26,12,0.8)'; g.lineWidth = 3;
        g.strokeRect(-2, y + 1, s + 4, 62);
        // grain lines (index-hash only)
        g.strokeStyle = 'rgba(60,40,18,0.45)'; g.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) {
          const gy = y + 12 + ((p * 7 + k * 23) % 44);
          g.beginPath(); g.moveTo(0, gy);
          g.bezierCurveTo(80, gy + 4, 170, gy - 4, s, gy + 2); g.stroke();
        }
        // nail dots
        g.fillStyle = 'rgba(30,20,10,0.7)';
        g.beginPath(); g.arc(12, y + 32, 3, 0, 7); g.arc(s - 12, y + 32, 3, 0, 7); g.fill();
      }
      // frame battens + stencil
      g.strokeStyle = 'rgba(52,36,16,0.9)'; g.lineWidth = 8;
      g.strokeRect(6, 6, s - 12, s - 12);
      g.fillStyle = 'rgba(30,22,10,0.85)'; g.textAlign = 'center';
      g.font = 'bold 64px Arial'; g.fillText(code, s / 2, s / 2 + 8);
      g.font = 'bold 26px Arial'; g.fillText('KEEP DRY', s / 2, s / 2 + 52);
    }, 1, 1);
    _crateTex[code] = tex;
    return tex;
  }
  // Hazard stripes (yellow/black diagonal) for gate barriers.
  let _hazardTex = null;
  function hazardTexture() {
    if (_hazardTex) return _hazardTex;
    _hazardTex = ptex(128, (g, s) => {
      g.fillStyle = '#f0a830'; g.fillRect(0, 0, s, s);
      g.fillStyle = '#14161a';
      for (let x = -s; x < s * 2; x += 32) {
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 16, 0); g.lineTo(x + 16 - s, s); g.lineTo(x - s, s); g.fill();
      }
    }, 4, 1);
    return _hazardTex;
  }
  function box(w, h, d, color, extra = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, 0.9, extra));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function solid(x0, z0, x1, z1, y0 = 0, y1 = 99) {
    const c = { x0, z0, x1, z1, y0, y1, h: Math.max(0.1, y1 - y0), active: true };
    colliders.push(c); propColliders.push(c);
    return c;
  }
  function shootable(m, mat = 'wall') { m.userData.mat = mat; shootables.push(m); propShootables.push(m); return m; }
  function clear() {
    // GRAPHICS FIX (2026-11-15): the group must STAY in the scene — only its
    // children are cleared. scene.remove(group) here deleted every map prop
    // (houses, containers, crates, trees) on every map after the first build,
    // while their colliders stayed active (invisible walls). That is why Twin
    // Court rendered with no houses/containers in the v2 screenshots.
    group.clear();
    for (const c of propColliders) { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }
    for (const m of propShootables) { const i = shootables.indexOf(m); if (i >= 0) shootables.splice(i, 1); }
    for (const d of propDoors) { const i = doors.indexOf(d); if (i >= 0) doors.splice(i, 1); }
    for (const l of propLevels) { const i = levels.indexOf(l); if (i >= 0) levels.splice(i, 1); }
    for (const s of propStairs) { const i = stairs.indexOf(s); if (i >= 0) stairs.splice(i, 1); }
    propColliders.length = 0; propShootables.length = 0; propDoors.length = 0; propLevels.length = 0; propStairs.length = 0;
    decorFlags.length = 0; decorTvs.length = 0; decorFires.length = 0; decorLights.length = 0; decorSwings.length = 0;
    decorBirds.length = 0; decorBrokenLights.length = 0; decorHouseLights.length = 0;
    decorSparks.length = 0; decorNeon.length = 0; decorFountains.length = 0; decorBubbles.length = 0;
    decorButterflies.length = 0; decorLeaves.length = 0; decorPapers.length = 0; decorClocks.length = 0;
    treeRecs.length = 0; fallingProps.length = 0; flowerSpots.length = 0;
    ammoBoxes.length = 0; lifts.length = 0; mudRects.length = 0; lightsOut = false;
    lootCrates.length = 0;
    destructibles.length = 0; houseRects.length = 0; pools.length = 0;
    colorMats.length = 0; bushes.length = 0; containers.length = 0;
    decorTraffic.length = 0; decorDummies.length = 0; interactables.length = 0;
    decorAnimals.length = 0;
  }

  // ---- Simple props ----
  function addBox(x, z, w, h, d, color, o = {}) {
    const m = box(w, h, d, color, o.extra || {});
    m.position.set(x, (o.y ?? 0) + h / 2, z);
    if (o.rot) m.rotation.y = o.rot;
    group.add(m); shootable(m);
    if (o.solid !== false) {
      const hw = o.rot ? d / 2 : w / 2, hd = o.rot ? w / 2 : d / 2;
      solid(x - hw, z - hd, x + hw, z + hd, o.y ?? 0, (o.y ?? 0) + h);
    }
    return m;
  }
  function addCylinder(x, z, r, h, color, o = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, o.r2 ?? r, h, o.seg ?? 12), mat(color, 0.8));
    m.position.set(x, (o.y ?? 0) + h / 2, z);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m); shootable(m);
    if (o.solid !== false) solid(x - r, z - r, x + r, z + r, o.y ?? 0, (o.y ?? 0) + h);
    return m;
  }
  function addContainer(x, z, w, d, color, o = {}) {
    const rot = o.rot || 0;
    const m = box(w, 2.6, d, color);
    m.position.set(x, 1.3, z); m.rotation.y = rot;
    group.add(m); shootable(m, 'metal');
    m.userData.propType = 'container'; // v22.3.12: Ting + dent; RPG/C4 blows it up
    tagColor(m, 'container');
    containers.push({ x, z, mesh: m });
    const hw = rot ? d / 2 : w / 2, hd = rot ? w / 2 : d / 2;
    solid(x - hw, z - hd, x + hw, z + hd, 0, 2.6);
    const lid = box(w * 0.98, 0.15, d * 0.98, 0x2e3236);
    lid.position.set(x, 2.65, z); lid.rotation.y = rot; group.add(lid);
    // door seams on the +x end
    for (const dz of [-d / 4, d / 4]) {
      const seam = box(0.06, 2.2, 0.08, 0x1a1c1e);
      seam.position.set(x + (rot ? 0 : w / 2 + 0.01), 1.3, z + dz);
      if (rot) seam.position.set(x + dz, 1.3, z + d / 2 + 0.01);
      group.add(seam);
    }
    if (o.stack) {
      const top = box(w, 2.6, d, o.stackColor ?? 0x8a6f4a);
      top.position.set(x, 3.9, z); top.rotation.y = rot;
      group.add(top); shootable(top, 'metal'); tagColor(top, 'container');
      solid(x - hw, z - hd, x + hw, z + hd, 2.6, 5.2);
    }
    return m;
  }
  // Wooden crate with plank + stencil texture (shared FY-4 / FY-7
  // variants). code: stencil code; y: base height (1.1 = stacked on a crate).
  function addCrate(x, z, s = 1.6, code = 'FY-4', y = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, 1.1, s),
      mat(0xffffff, 0.9, { map: crateTexture(code) }));
    m.castShadow = true; m.receiveShadow = true;
    m.position.set(x, y + 0.55, z); group.add(m); shootable(m, 'wood');
    solid(x - s / 2, z - s / 2, x + s / 2, z + s / 2, y, y + 1.1);
    // cross planks on top
    for (const a of [0.5, -0.5]) {
      const p = box(s * 1.1, 0.06, 0.18, 0x6b5636);
      p.position.set(x, y + 1.12, z); p.rotation.y = a; group.add(p);
    }
    return m;
  }
  // Brick wall segment (red brick texture, shared with the perimeter
  // walls). rot 0 = spans x; rot 90 = spans z. h defaults to 3.5m.
  function addBrickWall(x, z, w, d, h = 3.5, o = {}) {
    const rot = o.rot || 0;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      mat(0xffffff, 0.9, { map: brickTexture() }));
    m.castShadow = true; m.receiveShadow = true;
    m.position.set(x, h / 2, z); m.rotation.y = rot;
    group.add(m); shootable(m, 'wall');
    const hw = rot ? d / 2 : w / 2, hd = rot ? w / 2 : d / 2;
    solid(x - hw, z - hd, x + hw, z + hd, 0, h);
    return m;
  }
  // Giant painted site letter on a wall face (like the reference's big "B"):
  // transparent canvas, bold letter + site name under it, no collider.
  // rot 0 faces +z (south, toward the player spawn); rot Math.PI faces -z.
  function addWallLetter(x, z, rot = 0, letter = 'A', sub = 'FURNACE', color = '#f0a830') {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, 256, 256);
    g.textAlign = 'center';
    g.font = 'bold 170px Arial';
    g.lineWidth = 10; g.strokeStyle = 'rgba(20,12,6,0.85)';
    g.strokeText(letter, 128, 168);
    g.fillStyle = color; g.fillText(letter, 128, 168);
    g.font = 'bold 30px Arial';
    g.lineWidth = 6; g.strokeText(sub, 128, 222);
    g.fillStyle = '#ffffff'; g.fillText(sub, 128, 222);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    mesh.position.set(x, 2.1, z); mesh.rotation.y = rot; group.add(mesh);
    mesh.userData.propType = 'wall-letter';
    return mesh;
  }
  // Hazard-striped gate barrier: concrete block + yellow/black stripe band.
  // rot 0 = spans x; rot 90 = spans z.
  function addHazardBarrier(x, z, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const base = box(2.4, 0.9, 0.5, 0x6a655c); base.position.y = 0.45; g.add(base); shootable(base, 'wall');
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.34, 0.52),
      mat(0xffffff, 0.7, { map: hazardTexture() }));
    band.position.y = 0.62; band.castShadow = true; g.add(band);
    const cap = box(2.4, 0.08, 0.54, 0x3a3f44); cap.position.y = 0.94; g.add(cap);
    for (const s of [-1, 1]) {
      const foot = box(0.5, 0.14, 0.7, 0x3a3f44);
      foot.position.set(s * 0.9, 0.07, 0); g.add(foot);
    }
    const hw = rot ? 0.35 : 1.2, hd = rot ? 1.2 : 0.35;
    solid(x - hw, z - hd, x + hw, z + hd, 0, 1.0);
    return g;
  }
  function addBarrel(x, z, color = 0x8a4a22) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.15, 12), mat(color, 0.7));
    m.position.set(x, 0.58, z); m.castShadow = true; m.receiveShadow = true;
    group.add(m); shootable(m, 'metal');
    m.userData.collider = solid(x - 0.55, z - 0.55, x + 0.55, z + 0.55, 0, 1.15);
    return m;
  }
  // Red explosive barrel (v18.2): HP 50 — shoot it until it blows (4m blast).
  function addRedBarrel(x, z) {
    const m = addBarrel(x, z, 0xcc2222);
    const rec = { kind: 'barrel', hp: 50, x, z, meshes: [m], collider: m.userData.collider, smoking: false };
    m.userData.destructible = rec;
    destructibles.push(rec);
    return m;
  }
  function addSandbag(x, z, rot = 0) {
    const m = box(1.8, 0.5, 0.6, 0x6b5f4d);
    m.position.set(x, 0.25, z); m.rotation.y = rot;
    group.add(m); shootable(m, 'ground');
    const hw = rot ? 0.3 : 0.9, hd = rot ? 0.9 : 0.3;
    solid(x - hw, z - hd, x + hw, z + hd, 0, 0.5);
    return m;
  }
  function addTree(x, z, h = 4) {
    const tg = new THREE.Group(); tg.position.set(x, 0, z); group.add(tg);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, h * 0.45, 8), mat(0x5a4028, 0.95));
    trunk.position.set(0, h * 0.22, 0); trunk.castShadow = true; tg.add(trunk);
    const leafM = mat(0x3d5a2e, 0.95);
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(h * 0.32, h * 0.55, 8), leafM);
    c1.position.set(0, h * 0.62, 0); c1.castShadow = true; tg.add(c1);
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(h * 0.24, h * 0.4, 8), leafM);
    c2.position.set(0, h * 0.85, 0); c2.castShadow = true; tg.add(c2);
    tagColor(trunk, 'tree'); tagColor(c1, 'leaves'); tagColor(c2, 'leaves');
    const col = solid(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0, 2);
    // Trees are shootable (v19.2.8): HP 5, sway + 5 leaves per hit, fall at 0.
    const rec = { hp: 5, x, z, collider: col, meshes: [trunk, c1, c2], group: tg, fallen: false };
    for (const m of rec.meshes) { m.userData.propType = 'tree'; m.userData.propRef = rec; shootable(m, 'wood'); }
    treeRecs.push(rec);
    return trunk;
  }
  function addCar(x, z, rot = 0, color = 0x7a2a2a) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const body = box(4.2, 0.7, 1.9, color); body.position.y = 0.55; g.add(body); shootable(body, 'metal');
    // GRAPHICS FIX: bumpers, grille, mirrors, hubcaps + brighter glass and a
    // body-coloured roof, so the car reads as a car, not a coloured box.
    const chromeM = mat(0xd8d8d8, 0.3);
    const bumperF = box(0.18, 0.22, 1.9, chromeM); bumperF.position.set(2.14, 0.42, 0); g.add(bumperF);
    const bumperR = box(0.18, 0.22, 1.9, chromeM); bumperR.position.set(-2.14, 0.42, 0); g.add(bumperR);
    const grille = box(0.06, 0.2, 1.1, 0x14161a); grille.position.set(2.12, 0.62, 0); g.add(grille);
    for (const s of [-1, 1]) {
      const mir = box(0.12, 0.1, 0.18, chromeM); mir.position.set(0.7, 1.15, s * 0.95); g.add(mir);
    }
    const cabin = box(2.2, 0.6, 1.7, new THREE.MeshStandardMaterial({ color: 0x3a6a8a, roughness: 0.2, metalness: 0.4 })); cabin.position.set(-0.2, 1.2, 0); g.add(cabin); shootable(cabin, 'metal');
    const carRoof = box(2.0, 0.08, 1.6, color); carRoof.position.set(-0.2, 1.52, 0); g.add(carRoof);
    const hubM = mat(0xc8c8c8, 0.3);
    for (const [wx, wz] of [[-1.4, 0.95], [1.4, 0.95], [-1.4, -0.95], [1.4, -0.95]]) {
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.32, 10), hubM);
      hub.rotation.x = Math.PI / 2; hub.position.set(wx, 0.36, wz); g.add(hub);
    }
    const wheelG = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
    const wheelM = mat(0x14161a, 0.9);
    const wheels = [];
    for (const [wx, wz] of [[-1.4, 0.95], [1.4, 0.95], [-1.4, -0.95], [1.4, -0.95]]) {
      const w = new THREE.Mesh(wheelG, wheelM);
      w.rotation.x = Math.PI / 2; w.position.set(wx, 0.36, wz); g.add(w);
      wheels.push(w);
    }
    const lampM = new THREE.MeshBasicMaterial({ color: 0xffe9b0 });
    for (const s of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.3), lampM);
      l.position.set(2.12, 0.6, s * 0.6); g.add(l);
    }
    const hw = Math.abs(Math.cos(rot)) * 2.1 + Math.abs(Math.sin(rot)) * 0.95;
    const hd = Math.abs(Math.sin(rot)) * 2.1 + Math.abs(Math.cos(rot)) * 0.95;
    const col = solid(x - hw, z - hd, x + hw, z + hd, 0, 1.5);
    // Cars are destructible (v18.3): HP 200, smoke below 50%, 2 blasts + 5m area.
    const rec = { kind: 'car', hp: 200, x, z, meshes: [body, cabin], collider: col, smoking: false };
    body.userData.destructible = rec; cabin.userData.destructible = rec;
    body.userData.collider = col; cabin.userData.collider = col;
    // Tires are shootable (v19.2.5): flat one by one, 4 flat -> the car tilts.
    rec.tires = wheels; rec.flat = 0;
    for (const w of wheels) { w.userData.propType = 'tire'; w.userData.propRef = rec; shootable(w, 'metal'); }
    rec.group = g;
    destructibles.push(rec);
    return g;
  }
  function addBus(x, z, rot = 0, color = 0xe8b800) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const body = box(10, 2.6, 2.6, color); body.position.y = 1.5; g.add(body); shootable(body, 'metal');
    const winM = new THREE.MeshStandardMaterial({ color: 0x2a4a6a, roughness: 0.2, metalness: 0.3, emissive: 0x1a2a4a, emissiveIntensity: 0.4 });
    for (let i = 0; i < 5; i++) {
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.06), winM);
        w.position.set(-3.6 + i * 1.8, 1.9, s * 1.32); g.add(w);
      }
    }
    // GRAPHICS FIX: a white side stripe + destination sign + roof trim so the
    // bus reads as a bus from across the map.
    const stripeM = mat(0xf0ead8, 0.6);
    for (const s of [-1, 1]) {
      const stripe = box(9.6, 0.28, 0.06, stripeM); stripe.position.set(0, 1.05, s * 1.32); g.add(stripe);
    }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 1.2), new THREE.MeshBasicMaterial({ color: 0xffa040 }));
    sign.position.set(5.02, 2.35, 0); g.add(sign);
    const roofTrim = box(10.1, 0.1, 2.7, stripeM); roofTrim.position.set(0, 2.82, 0); g.add(roofTrim);
    const wheelG = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 10);
    const wheelM = mat(0x14161a, 0.9);
    for (const [wx, wz] of [[-3.2, 1.3], [3.2, 1.3], [-3.2, -1.3], [3.2, -1.3]]) {
      const w = new THREE.Mesh(wheelG, wheelM);
      w.rotation.x = Math.PI / 2; w.position.set(wx, 0.45, wz); g.add(w);
    }
    const hw = Math.abs(Math.cos(rot)) * 5 + Math.abs(Math.sin(rot)) * 1.3;
    const hd = Math.abs(Math.sin(rot)) * 5 + Math.abs(Math.cos(rot)) * 1.3;
    solid(x - hw, z - hd, x + hw, z + hd, 0, 2.8);
    return g;
  }
  function addTower(x, z, h = 12) {
    const legM = mat(0x5c6b70, 0.7);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, h, 0.25), legM);
      leg.position.set(x + sx * 0.9, h / 2, z + sz * 0.9);
      leg.rotation.z = -sx * 0.06; leg.rotation.x = sz * 0.06;
      leg.castShadow = true; group.add(leg);
    }
    const plat = box(3, 0.4, 3, 0x3d484d); plat.position.set(x, h + 0.2, z); group.add(plat);
    const cab = box(2, 1.6, 2, 0x6b5f4d); cab.position.set(x, h + 1.2, z); group.add(cab); shootable(cab, 'metal');
    cab.userData.propType = 'watertank'; // v19.2.6: shot -> water sprays out
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), mat(0x8a8d90, 0.5));
    ant.position.set(x, h + 3.4, z); group.add(ant);
    solid(x - 1, z - 1, x + 1, z + 1, 0, h);
    return plat;
  }
  function addBridge(x, z, w, d, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const deck = box(w, 0.5, d, 0x5c6b70); deck.position.y = 2.75; g.add(deck); shootable(deck, 'metal');
    const railM = mat(0xf0a830, 0.6);
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, 0.12), railM);
      rail.position.set(0, 3.4, s * (d / 2 - 0.06)); g.add(rail);
    }
    const hw = rot ? d / 2 : w / 2, hd = rot ? w / 2 : d / 2;
    for (const px of [-w / 4, w / 4]) {
      const pil = box(1, 2.5, d * 0.8, 0x3d484d);
      pil.position.set(px, 1.25, 0); g.add(pil); shootable(pil, 'metal');
      const pxw = rot ? 0 : px, pxd = rot ? px : 0;
      solid(x + pxw - (rot ? d * 0.4 : 0.5), z + pxd - (rot ? 0.5 : d * 0.4),
        x + pxw + (rot ? d * 0.4 : 0.5), z + pxd + (rot ? 0.5 : d * 0.4), 0, 2.5);
    }
    return g;
  }
  function addStreetlight(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 6, 8), mat(0x2e3236, 0.6));
    pole.position.set(x, 3, z); pole.castShadow = true; group.add(pole);
    // Fake bloom (v18.6.8): the lamp is an emissive bulb + a soft halo, not
    // just a yellow box — it reads as glowing even without post-processing.
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x332a10, emissive: 0xffe9b0, emissiveIntensity: 2.2 });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.35), lampMat);
    lamp.position.set(x, 6.1, z); group.add(lamp);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.18, depthWrite: false }));
    halo.position.set(x, 6.1, z); group.add(halo);
    // Real point light so the lamp actually lights the street at night.
    const pl = new THREE.PointLight(0xffe9b0, 6, 12);
    pl.position.set(x, 5.9, z); group.add(pl);
    const rec = { mat: lampMat, light: pl, phase: Math.random() * 6, dead: false };
    decorLights.push(rec);
    // Shootable lamp (v19.2.1): break the bulb and the light dies.
    lamp.userData.propType = 'lamp'; lamp.userData.propRef = rec;
    shootable(lamp, 'glass');
    halo.userData.propType = 'lamp'; halo.userData.propRef = rec;
    solid(x - 0.15, z - 0.15, x + 0.15, z + 0.15, 0, 6);
    return pole;
  }
  function addHelicopter(x, z, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.4, 10), mat(0x4a5a2e, 0.7));
    body.rotation.z = Math.PI / 2; body.position.set(0, 1.1, 0); body.castShadow = true; g.add(body); shootable(body, 'metal');
    const cabin = box(1.6, 1.2, 1.6, 0x2a3a1e); cabin.position.set(1.6, 1.1, 0); g.add(cabin); shootable(cabin, 'metal');
    const boom = box(3.2, 0.5, 0.5, 0x4a5a2e); boom.position.set(-2.8, 1.3, 0); g.add(boom);
    const rotor = box(7, 0.08, 0.5, 0x1c1e20); rotor.position.set(0, 2.3, 0); rotor.rotation.z = 0.2; g.add(rotor);
    const tailR = box(0.08, 1.6, 0.4, 0x1c1e20); tailR.position.set(-4.4, 1.4, 0); tailR.rotation.x = 0.3; g.add(tailR);
    for (const s of [-1, 1]) {
      const skid = box(3.4, 0.1, 0.12, 0x2e3236); skid.position.set(0.4, 0.15, s * 0.9); g.add(skid);
    }
    // fire glow + smoke under the wreck (fire flickers in animateDecor)
    const fire = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.4), new THREE.MeshBasicMaterial({ color: 0xff7a1a }));
    fire.position.set(0.6, 0.4, 0); g.add(fire);
    decorFires.push({ mesh: fire, phase: Math.random() * 6 });
    const smokeM = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.45 });
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.9 + i * 0.3, 8, 8), smokeM);
      s.position.set(-0.4 + i * 0.5, 2.2 + i * 0.8, 0.3 - i * 0.3); g.add(s);
    }
    const hw = Math.abs(Math.cos(rot)) * 3.2 + Math.abs(Math.sin(rot)) * 1.2;
    const hd = Math.abs(Math.sin(rot)) * 3.2 + Math.abs(Math.cos(rot)) * 1.2;
    solid(x - hw, z - hd, x + hw, z + hd, 0, 2.4);
    return g;
  }
  function addRubble(x, z, s = 2) {
    for (let i = 0; i < 3; i++) {
      const m = box(s * (0.7 + Math.random() * 0.5), 0.5 + Math.random() * 0.5, s * (0.6 + Math.random() * 0.4), 0x6b6b66);
      m.position.set(x + (Math.random() - 0.5) * s, 0.3, z + (Math.random() - 0.5) * s);
      m.rotation.y = Math.random() * 1.5;
      group.add(m); shootable(m, 'wall');
    }
    solid(x - s / 2, z - s / 2, x + s / 2, z + s / 2, 0, 1);
    return null;
  }
  function addRiceField(x, z, w, d, color = 0x5a7a3a) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), mat(color, 0.95));
    m.position.set(x, 0.04, z); m.receiveShadow = true; group.add(m);
    tagColor(m, 'grass');
    return m; // walkable, non-solid
  }
  function addFence(x, z, len, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const postM = mat(0x6b4a2a, 0.95);
    colorMats.push({ kind: 'fence', mat: postM });
    for (let i = 0; i <= Math.floor(len / 2); i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), postM);
      p.position.set(-len / 2 + i * 2, 0.55, 0); g.add(p);
    }
    for (const ry of [0.4, 0.85]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.06), postM);
      rail.position.set(0, ry, 0); g.add(rail);
    }
    const hw = rot ? 0.3 : len / 2, hd = rot ? len / 2 : 0.3;
    solid(x - hw, z - hd, x + hw, z + hd, 0, 1.1);
    return g;
  }
  function addHaystack(x, z) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.8, 10), mat(0xc8a84a, 0.95));
    m.position.set(x, 0.9, z); m.castShadow = true; group.add(m);
    solid(x - 0.9, z - 0.9, x + 0.9, z + 0.9, 0, 1.8);
    return m;
  }

  // ---- Small details (v17.1) ----
  function addTV(x, z, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const stand = box(1.6, 0.5, 0.5, 0x4a3421); stand.position.y = 0.25; g.add(stand);
    const frame = box(1.9, 1.1, 0.12, 0x14161a); frame.position.y = 1.05; g.add(frame);
    // The screen is its own material so animateDecor can cycle its color.
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x2a7aff });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.9), screenMat);
    screen.position.set(0, 1.05, 0.07); g.add(screen);
    const tvRec = { mat: screenMat, nextT: 0, dead: false };
    decorTvs.push(tvRec);
    // Shootable TV (v19.2.2): small blast + smoke + dead screen.
    screen.userData.propType = 'tv'; screen.userData.propRef = tvRec;
    shootable(screen, 'glass');
    shootable(frame);
    solid(x - 0.9, z - 0.4, x + 0.9, z + 0.4, 0, 1.6);
    return g;
  }
  function addFlag(x, z, color = 0xcc2222) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8), mat(0x8a8d90, 0.5));
    pole.position.y = 1.7; pole.castShadow = true; g.add(pole);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8, 6, 1),
      new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide }));
    cloth.position.set(0.68, 2.9, 0); cloth.castShadow = true; g.add(cloth);
    cloth.userData.propType = 'flag'; // v19.2.9: shot -> torn (dark, stops waving)
    shootable(cloth, 'wall');
    decorFlags.push({ mesh: cloth, phase: Math.random() * 6 });
    solid(x - 0.1, z - 0.1, x + 0.1, z + 0.1, 0, 3.4);
    return g;
  }
  function addMailbox(x, z, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const post = box(0.12, 1.1, 0.12, 0x4a4a4a); post.position.y = 0.55; g.add(post);
    const mail = box(0.5, 0.35, 0.8, 0x2a5a8a); mail.position.y = 1.25; g.add(mail); shootable(mail, 'metal');
    const flag = box(0.05, 0.4, 0.08, 0xcc2222); flag.position.set(0.28, 1.4, 0); g.add(flag);
    solid(x - 0.3, z - 0.45, x + 0.3, z + 0.45, 0, 1.4);
    return g;
  }
  function addCactus(x, z, h = 1.8) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const cactusM = mat(0x3d7a3a, 0.95);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, h, 8), cactusM);
    trunk.position.y = h / 2; trunk.castShadow = true; g.add(trunk); shootable(trunk);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, h * 0.45, 8), cactusM);
      arm.position.set(s * 0.4, h * 0.55, 0); g.add(arm);
      const joint = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.16), cactusM);
      joint.position.set(s * 0.22, h * 0.38, 0); g.add(joint);
    }
    solid(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0, h);
    return g;
  }
  function addTent(x, z, rot = 0, color = 0x8a6f4a) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const tentM = mat(color, 0.95);
    colorMats.push({ kind: 'tent', mat: tentM });
    for (const s of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 1.9), tentM);
      panel.position.set(0, 1.15, s * 0.75); panel.rotation.x = s * 0.62; panel.castShadow = true; g.add(panel);
    }
    for (const [px, pz] of [[-1.4, -1.2], [1.4, -1.2], [-1.4, 1.2], [1.4, 1.2]]) {
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), mat(0x5a4028, 0.9));
      peg.position.set(px, 0.8, pz); g.add(peg);
    }
    solid(x - 1.5, z - 1.4, x + 1.5, z + 1.4, 0, 2.2);
    return g;
  }
  function addCarpet(x, z, w = 3, d = 2, color = 0x8a2a2a, rot = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), mat(color, 0.95));
    m.position.set(x, 0.02, z); m.rotation.y = rot; m.receiveShadow = true; group.add(m);
    return m; // walkable, non-solid
  }
  function addBed(x, z, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const frame = box(1.4, 0.4, 2.2, 0x4a3421); frame.position.y = 0.2; g.add(frame); shootable(frame, 'wood');
    const mattress = box(1.3, 0.25, 2.1, 0xe9e6df); mattress.position.y = 0.5; g.add(mattress);
    const blanket = box(1.32, 0.1, 1.2, 0x8a2a2a); blanket.position.set(0, 0.62, 0.4); g.add(blanket);
    const pillow = box(1.1, 0.14, 0.5, 0xffffff); pillow.position.set(0, 0.66, -0.75); g.add(pillow);
    solid(x - 0.75, z - 1.15, x + 0.75, z + 1.15, 0, 0.7);
    return g;
  }
  function addSofa(x, z, rot = 0, color = 0x5a3a6a) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const base = box(2.2, 0.5, 0.9, color); base.position.y = 0.35; g.add(base); shootable(base, 'wood');
    const back = box(2.2, 0.8, 0.25, color); back.position.set(0, 0.9, -0.35); g.add(back);
    for (const s of [-1, 1]) {
      const arm = box(0.25, 0.7, 0.9, color); arm.position.set(s * 1, 0.7, 0); g.add(arm);
      const cushion = box(0.95, 0.15, 0.75, 0xffffff); cushion.position.set(s * 0.5, 0.65, 0.05); g.add(cushion);
    }
    solid(x - 1.15, z - 0.5, x + 1.15, z + 0.5, 0, 1.1);
    return g;
  }
  function addTableSet(x, z, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const top = box(1.8, 0.08, 1.1, 0x6b4a2a); top.position.y = 0.78; g.add(top); shootable(top, 'wood');
    for (const [px, pz] of [[-0.8, -0.45], [0.8, -0.45], [-0.8, 0.45], [0.8, 0.45]]) {
      const leg = box(0.08, 0.78, 0.08, 0x4a3421); leg.position.set(px, 0.39, pz); g.add(leg);
    }
    // Glasses, plates, books on the table.
    const glassM = new THREE.MeshStandardMaterial({ color: 0xaad4ff, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.8 });
    for (const [gx, gz] of [[-0.5, 0.2], [0.3, -0.25]]) {
      const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8), glassM);
      gl.position.set(gx, 0.92, gz); g.add(gl);
    }
    const plateM = mat(0xffffff, 0.4);
    for (const [px, pz] of [[-0.2, -0.2], [0.55, 0.25]]) {
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 12), plateM);
      pl.position.set(px, 0.84, pz); g.add(pl);
    }
    for (const [bx, bz, c] of [[0.1, 0.3, 0x8a2a2a], [0.18, 0.32, 0x2a5a8a]]) {
      const bk = box(0.28, 0.04, 0.2, c); bk.position.set(bx, 0.85, bz); bk.rotation.y = 0.4; g.add(bk);
    }
    for (const s of [-1, 1]) {
      const chair = box(0.5, 0.5, 0.5, 0x5a4028); chair.position.set(s * 0.7, 0.25, 0.9); g.add(chair);
    }
    solid(x - 0.95, z - 0.6, x + 0.95, z + 0.6, 0, 0.85);
    return g;
  }
  function addBillboard(x, z, rot = 0, color = 0xf0a830) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    for (const s of [-1, 1]) {
      const post = box(0.3, 5, 0.3, 0x3d484d); post.position.set(s * 2.2, 2.5, 0); g.add(post);
    }
    const frame = box(6, 3, 0.25, 0x1c1e20); frame.position.y = 6.2; g.add(frame);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.6),
      new THREE.MeshBasicMaterial({ color }));
    face.position.set(0, 6.2, 0.14); g.add(face);
    tagColor(face, 'billboard');
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stripe.position.set(0, 5.4, 0.15); g.add(stripe);
    shootable(frame, 'metal');
    // Collider follows the rotation: a 90° billboard spans z, not x.
    const hw = Math.abs(Math.sin(rot)) > 0.5 ? 0.4 : 2.6;
    const hd = Math.abs(Math.sin(rot)) > 0.5 ? 2.6 : 0.4;
    solid(x - hw, z - hd, x + hw, z + hd, 0, 5);
    return g;
  }
  // Bomb-site sign (reference-style "SITE A" board): dark board, gold border,
  // big label + site name. Flush to a wall, so it needs no collider.
  function addSiteSign(x, z, rot = 0, label = 'SITE A', sub = 'FURNACE') {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
    const g = cv.getContext('2d');
    g.fillStyle = '#1a1208'; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#f0a830'; g.lineWidth = 10; g.strokeRect(8, 8, 496, 240);
    g.strokeStyle = 'rgba(240,168,48,0.35)'; g.lineWidth = 3; g.strokeRect(22, 22, 468, 212);
    g.fillStyle = '#ffb020'; g.textAlign = 'center';
    g.font = 'bold 92px Arial'; g.fillText(label, 256, 118);
    g.fillStyle = '#ffffff'; g.font = 'bold 44px Arial'; g.fillText(sub, 256, 190);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.5),
      new THREE.MeshBasicMaterial({ map: tex }));
    board.position.set(x, 2.6, z); board.rotation.y = rot; group.add(board);
    board.userData.propType = 'site-sign';
    const back = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.7, 0.12),
      mat(0xffffff, 0.85, { map: corrugatedTexture() }));
    back.castShadow = true;
    back.position.set(x, 2.6, z - 0.08); back.rotation.y = rot; group.add(back);
    return board;
  }
  function addCrane(x, z, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const mast = box(0.8, 9, 0.8, 0xf0a830); mast.position.y = 4.5; g.add(mast); shootable(mast, 'metal');
    const jib = box(9, 0.6, 0.6, 0xf0a830); jib.position.set(2.5, 8.8, 0); g.add(jib);
    const counter = box(2, 1.2, 1, 0x2e3236); counter.position.set(-3.2, 8.6, 0); g.add(counter);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3, 6), mat(0x1c1e20, 0.6));
    cable.position.set(6, 7, 0); g.add(cable);
    const hook = box(0.6, 0.6, 0.6, 0x2e3236); hook.position.set(6, 5.3, 0); g.add(hook);
    solid(x - 0.5, z - 0.5, x + 0.5, z + 0.5, 0, 9);
    return g;
  }
  function addForklift(x, z, rot = 0, color = 0xe8a800) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const body = box(1.6, 0.9, 1.1, color); body.position.y = 0.6; g.add(body); shootable(body, 'metal');
    const cab = box(0.9, 0.8, 1, 0x22262a); cab.position.set(-0.2, 1.4, 0); g.add(cab);
    const mast = box(0.12, 1.8, 1, 0x3d484d); mast.position.set(0.85, 1, 0); g.add(mast);
    for (const s of [-1, 1]) {
      const fork = box(0.9, 0.06, 0.12, 0x8a8d90); fork.position.set(1.3, 0.15, s * 0.3); g.add(fork);
    }
    const wheelG = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 10);
    const wheelM = mat(0x14161a, 0.9);
    for (const [wx, wz] of [[-0.6, 0.55], [0.6, 0.55], [-0.6, -0.55], [0.6, -0.55]]) {
      const w = new THREE.Mesh(wheelG, wheelM);
      w.rotation.x = Math.PI / 2; w.position.set(wx, 0.3, wz); g.add(w);
    }
    solid(x - 0.9, z - 0.6, x + 0.9, z + 0.6, 0, 1.8);
    return g;
  }
  function addPallet(x, z, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    for (let i = 0; i < 4; i++) {
      const slat = box(1.2, 0.05, 0.18, 0x8a6f4a);
      slat.position.set(0, 0.14, -0.45 + i * 0.3); g.add(slat);
    }
    for (const s of [-1, 1]) {
      const beam = box(1.2, 0.1, 0.1, 0x6b5636);
      beam.position.set(0, 0.06, s * 0.5); g.add(beam);
    }
    solid(x - 0.6, z - 0.6, x + 0.6, z + 0.6, 0, 0.2);
    return g;
  }
  function addSwing(x, z, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const frameM = mat(0x3d484d, 0.6);
    for (const s of [-1, 1]) {
      const legA = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), frameM);
      legA.position.set(s * 1.1, 1.4, -0.7); legA.rotation.x = 0.25; g.add(legA);
      const legB = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), frameM);
      legB.position.set(s * 1.1, 1.4, 0.7); legB.rotation.x = -0.25; g.add(legB);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), frameM);
    bar.rotation.z = Math.PI / 2; bar.position.y = 2.7; g.add(bar);
    // The seat hangs from the bar and sways in animateDecor.
    const seatPivot = new THREE.Group(); seatPivot.position.y = 2.7; g.add(seatPivot);
    for (const s of [-1, 1]) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6), mat(0x8a8d90, 0.5));
      chain.position.set(s * 0.5, -0.8, 0); seatPivot.add(chain);
    }
    const seat = box(1.1, 0.08, 0.5, 0x6b4a2a); seat.position.y = -1.65; seatPivot.add(seat);
    decorSwings.push({ seat: seatPivot, phase: Math.random() * 6 });
    solid(x - 1.2, z - 0.9, x + 1.2, z + 0.9, 0, 2.8);
    return g;
  }
  function addPool(x, z, w = 6, d = 4) {
    const rim = box(w + 0.6, 0.3, d + 0.6, 0xd8d0c0); rim.position.set(x, 0.15, z); group.add(rim);
    const water = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d),
      new THREE.MeshStandardMaterial({ color: 0x2a7acc, roughness: 0.1, metalness: 0.3 }));
    water.position.set(x, 0.28, z); group.add(water);
    tagColor(water, 'water');
    // The water is shootable (splash + ripple, v18.3.9); the rim is solid
    // but the water itself is open so the player can step in and get wet.
    shootable(water, 'water');
    // Bubbles rising in the pool (v18.9.13).
    for (let i = 0; i < 5; i++) {
      const bub = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.7 }));
      bub.position.set(x + (Math.random() - 0.5) * (w - 1), 0.3, z + (Math.random() - 0.5) * (d - 1));
      group.add(bub);
      decorBubbles.push({ mesh: bub, baseY: 0.3, phase: Math.random() });
    }
    solid(x - w / 2 - 0.3, z - d / 2 - 0.3, x + w / 2 + 0.3, z - d / 2, 0, 0.3);
    solid(x - w / 2 - 0.3, z + d / 2, x + w / 2 + 0.3, z + d / 2 + 0.3, 0, 0.3);
    solid(x - w / 2 - 0.3, z - d / 2, x - w / 2, z + d / 2, 0, 0.3);
    solid(x + w / 2, z - d / 2, x + w / 2 + 0.3, z + d / 2, 0, 0.3);
    pools.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 });
    return water;
  }
  // Breakable table / crate (v18.4): HP 30 — shoot it and it falls apart.
  function addDestructible(x, z, kind = 'table') {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    let meshes = [];
    if (kind === 'crate') {
      const m = box(1.4, 1.4, 1.4, 0x8a6f4a); m.position.y = 0.7; g.add(m); shootable(m, 'wood');
      meshes = [m];
    } else {
      const top = box(1.8, 0.12, 1.0, 0x7a5c38); top.position.y = 0.75; g.add(top); shootable(top, 'wood');
      meshes = [top];
      for (const [lx, lz] of [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]]) {
        const leg = box(0.1, 0.75, 0.1, 0x5a4028); leg.position.set(lx, 0.37, lz); g.add(leg); shootable(leg, 'wood');
        meshes.push(leg);
      }
    }
    const col = solid(x - 0.9, z - 0.7, x + 0.9, z + 0.7, 0, kind === 'crate' ? 1.4 : 0.8);
    const rec = { kind: 'destruct', hp: 30, x, z, meshes, collider: col, smoking: false };
    for (const m of meshes) { m.userData.destructible = rec; m.userData.collider = col; }
    destructibles.push(rec);
    return g;
  }
  // 5 birds circling overhead (v18.15) — added once per map by world.buildMap.
  function addBirds() {
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      const bodyM = mat(0x1c1e20, 0.9);
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), bodyM);
      body.rotation.x = Math.PI / 2; g.add(body);
      const wingM = mat(0x2e3236, 0.9);
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.22), wingM);
      wingL.position.x = -0.3; g.add(wingL);
      const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.22), wingM);
      wingR.position.x = 0.3; g.add(wingR);
      group.add(g);
      decorBirds.push({
        group: g, wingL, wingR,
        angle: (i / 5) * Math.PI * 2, radius: 14 + (i % 3) * 6,
        height: 12 + (i % 3) * 3, speed: 0.12 + (i % 3) * 0.04, phase: i * 1.3,
      });
    }
  }
  // A street lamp that flickers and is about to die (v18.15).
  function addBrokenLight(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 6, 8), mat(0x2e3236, 0.6));
    pole.position.set(x, 3, z); pole.castShadow = true; group.add(pole);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0 });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.35), lampMat);
    lamp.position.set(x, 6.1, z); group.add(lamp);
    const pl = new THREE.PointLight(0xffe9b0, 4, 12);
    pl.position.set(x, 5.9, z); group.add(pl);
    decorBrokenLights.push({ mat: lampMat, light: pl, phase: Math.random() * 6 });
    solid(x - 0.15, z - 0.15, x + 0.15, z + 0.15, 0, 6);
    return pole;
  }
  // ---- v18.9 ambient builders ----
  // Campfire: stone ring + logs + flickering flame (registered in decorFires).
  function addCampfire(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    for (let i = 0; i < 7; i++) {
      const st = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(0x777777, 0.95));
      const a = i / 7 * Math.PI * 2;
      st.position.set(Math.cos(a) * 0.9, 0.12, Math.sin(a) * 0.9); g.add(st);
    }
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), mat(0x5a3a22, 0.9));
      log.rotation.z = Math.PI / 2; log.rotation.y = i * 1.05; log.position.y = 0.15; g.add(log);
    }
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7722 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 8), flameMat);
    flame.position.y = 0.7; g.add(flame);
    decorFires.push({ mesh: flame, phase: Math.random() * 6 });
    return g;
  }
  // Broken cable spark: small star that flashes ~every 2s (animateDecor).
  function addSpark(x, z, y = 3) {
    const m = new THREE.MeshBasicMaterial({ color: 0xffee44 });
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), m);
    star.position.set(x, y, z); star.visible = false; group.add(star);
    decorSparks.push({ mesh: star, phase: Math.random() * 2 });
    return star;
  }
  // Oil puddle: black shiny disc; shooting it burns (destructible kind 'oil').
  function addOilPuddle(x, z) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.08, metalness: 0.9 }));
    disc.rotation.x = -Math.PI / 2; disc.position.set(x, 0.03, z); group.add(disc);
    shootable(disc, 'oil');
    destructibles.push({ kind: 'oil', hp: 1, x, z, meshes: [disc], collider: null, smoking: false });
    return disc;
  }
  // Fountain: basin + column + bobbing droplets (animateDecor).
  function addFountain(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.5, 16), mat(0x9a9a9a, 0.8));
    rim.position.y = 0.25; g.add(rim);
    const water = new THREE.Mesh(new THREE.CircleGeometry(2.0, 16),
      new THREE.MeshStandardMaterial({ color: 0x3a7abd, roughness: 0.1, metalness: 0.6 }));
    water.rotation.x = -Math.PI / 2; water.position.y = 0.42; g.add(water);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 1.2, 8), mat(0x8a8a8a, 0.8));
    col.position.y = 0.9; g.add(col);
    const drops = [];
    for (let i = 0; i < 8; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0x9fd4ff }));
      const a = i / 8 * Math.PI * 2;
      d.position.set(Math.cos(a) * 0.9, 1.5, Math.sin(a) * 0.9); g.add(d);
      drops.push(d);
    }
    decorFountains.push({ drops, baseY: 1.5, phase: Math.random() * 2 });
    solid(x - 2.4, z - 2.4, x + 2.4, z + 2.4, 0, 0.5);
    return g;
  }
  // Butterflies: 2 winged insects orbiting the flowers (animateDecor).
  function addButterflies(x, z) {
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group(); group.add(g);
      const wingM = new THREE.MeshBasicMaterial({ color: i ? 0xff88cc : 0xffcc44, side: THREE.DoubleSide });
      const wingL = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.16), wingM);
      wingL.position.x = -0.12; g.add(wingL);
      const wingR = wingL.clone(); wingR.position.x = 0.12; g.add(wingR);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 4), mat(0x222222, 0.9));
      body.rotation.x = Math.PI / 2; g.add(body);
      decorButterflies.push({ group: g, wingL, wingR, angle: i * 2.4, radius: 2.5 + i, height: 1.2 + i * 0.4, phase: i * 3, cx: x, cz: z });
    }
  }
  // Falling leaves: 12 leaves drifting down over a garden (animateDecor).
  function addLeaves(x, z) {
    for (let i = 0; i < 12; i++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.18),
        new THREE.MeshBasicMaterial({ color: [0x6a8a3a, 0x8a7a2a, 0x4a7a3a][i % 3], side: THREE.DoubleSide }));
      leaf.position.set(x + (Math.random() - 0.5) * 10, 2 + Math.random() * 6, z + (Math.random() - 0.5) * 10);
      group.add(leaf);
      decorLeaves.push({ mesh: leaf, fallSpeed: 0.4 + Math.random() * 0.3, swayPhase: Math.random() * 6, x0: x, z0: z });
    }
  }
  // Flowers: stems + bright petals (grass sway already exists).
  function addFlowers(x, z, n = 8) {
    const colors = [0xff5577, 0xffcc44, 0xcc77ff, 0xff8844, 0xffffff];
    for (let i = 0; i < n; i++) {
      const fx = x + (Math.random() - 0.5) * 6, fz = z + (Math.random() - 0.5) * 6;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4), mat(0x3a7a2a, 0.9));
      stem.position.set(fx, 0.2, fz); group.add(stem);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6),
        new THREE.MeshBasicMaterial({ color: colors[i % colors.length] }));
      head.position.set(fx, 0.45, fz); group.add(head);
      tagColor(head, 'flowers');
      flowerSpots.push({ x: fx, z: fz, mesh: head, taken: false });
    }
  }
  // Neon shop sign: glowing board that blinks (animateDecor).
  function addNeonSign(x, z, color = 0x37c8d8) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const frame = box(3, 0.9, 0.15, 0x1a1a1a); frame.position.y = 3.4; g.add(frame);
    const neonMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.4 });
    colorMats.push({ kind: 'billboard', mat: neonMat });
    const face = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.6, 0.06), neonMat);
    face.position.y = 3.4; g.add(face);
    decorNeon.push({ mat: neonMat, phase: Math.random() * 6 });
    const post = box(0.2, 3, 0.2, 0x333333); post.position.y = 1.5; g.add(post);
    solid(x - 0.15, z - 0.15, x + 0.15, z + 0.15, 0, 3.9);
    return g;
  }
  // Torch: pole + flame (flickers via decorFires) for the village map.
  function addTorch(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 6), mat(0x5a3a22, 0.9));
    pole.position.set(x, 1.1, z); pole.castShadow = true; group.add(pole);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 8), new THREE.MeshBasicMaterial({ color: 0xff9922 }));
    flame.position.set(x, 2.5, z); group.add(flame);
    decorFires.push({ mesh: flame, phase: Math.random() * 6 });
    solid(x - 0.12, z - 0.12, x + 0.12, z + 0.12, 0, 2.2);
    return pole;
  }
  // Emergency light: red lamp that blinks (reuses decorLights blink).
  function addEmergencyLight(x, z) {
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2 });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.25), lampMat);
    lamp.position.set(x, 4.5, z); group.add(lamp);
    const pl = new THREE.PointLight(0xff2222, 3, 10);
    pl.position.set(x, 4.3, z); group.add(pl);
    decorLights.push({ mat: lampMat, light: pl, phase: Math.random() * 6 });
    return lamp;
  }
  // ---- Small props (v18.9.26) ----
  function addPoster(x, z, y = 1.8, rot = 0, color = 0xff5577) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    p.position.set(x, y, z); p.rotation.y = rot; group.add(p);
    return p;
  }
  function addGraffiti(x, z, y = 1.5, rot = 0, color = 0x37c8d8) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }));
    g.position.set(x, y, z); g.rotation.y = rot; group.add(g);
    return g;
  }
  function addCans(x, z, n = 5) {
    for (let i = 0; i < n; i++) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8),
        mat([0xcc3333, 0x33aa33, 0xcccccc][i % 3], 0.4, { metalness: 0.7 }));
      can.position.set(x + (Math.random() - 0.5) * 2, 0.08, z + (Math.random() - 0.5) * 2);
      can.rotation.z = Math.PI / 2 * (i % 2); group.add(can);
      can.userData.propType = 'can'; // v19.2.3: shot -> tips over + rolls 2m
      shootable(can, 'metal');
    }
  }
  function addPapers(x, z, n = 6) {
    for (let i = 0; i < n; i++) {
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xf5f2e8, side: THREE.DoubleSide }));
      paper.rotation.x = -Math.PI / 2;
      paper.position.set(x + (Math.random() - 0.5) * 4, 0.03, z + (Math.random() - 0.5) * 4);
      group.add(paper);
      decorPapers.push({ mesh: paper, phase: Math.random() * 6 });
    }
  }
  // Wall clock with moving hands (animateDecor turns them slowly).
  function addClock(x, z, y = 2.4, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; group.add(g);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.35, 20),
      new THREE.MeshStandardMaterial({ color: 0xf5f2e8, roughness: 0.6 }));
    g.add(face);
    const hour = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.01), new THREE.MeshBasicMaterial({ color: 0x222222 }));
    hour.position.z = 0.01; hour.geometry.translate(0, 0.07, 0); g.add(hour);
    const minute = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.26, 0.01), new THREE.MeshBasicMaterial({ color: 0x222222 }));
    minute.position.z = 0.012; minute.geometry.translate(0, 0.11, 0); g.add(minute);
    decorClocks.push({ hour, minute, phase: Math.random() * 6 });
    return g;
  }
  function addRadio(x, z, y = 0.9) {
    const r = box(0.6, 0.35, 0.25, 0x8a2a2a); r.position.set(x, y, z); group.add(r); shootable(r, 'metal');
    r.userData.propType = 'radio'; // v19.2.11: shot -> toggles a short tune
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), new THREE.MeshBasicMaterial({ color: 0xffcc44 }));
    dial.position.set(x - 0.15, y, z + 0.13); group.add(dial);
    return r;
  }
  function addComputer(x, z, y = 0.8, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; group.add(g);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x2277cc, emissiveIntensity: 0.8 }));
    screen.position.y = 0.3; g.add(screen); shootable(screen, 'metal');
    const kb = box(0.8, 0.05, 0.3, 0x222222); kb.position.set(0, -0.05, 0.25); g.add(kb);
    return g;
  }
  function addToilet(x, z, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.45, 10), mat(0xf5f5f5, 0.4));
    base.position.y = 0.22; g.add(base); shootable(base);
    const tank = box(0.5, 0.5, 0.2, 0xf5f5f5); tank.position.set(0, 0.6, -0.25); g.add(tank);
    solid(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0, 0.8);
    return g;
  }
  function addMirror(x, z, y = 1.6, rot = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xbfd4e0, roughness: 0.05, metalness: 1 }));
    m.position.set(x, y, z); m.rotation.y = rot; group.add(m);
    return m;
  }
  // ---- v19.2 interactive props ----
  // Green bottles: shot -> green glass shards (propType 'bottle').
  function addBottles(x, z, n = 4) {
    for (let i = 0; i < n; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a7a3a, roughness: 0.15, metalness: 0.2 }));
      b.position.set(x + (Math.random() - 0.5) * 1.5, 0.15, z + (Math.random() - 0.5) * 1.5);
      group.add(b);
      b.userData.propType = 'bottle';
      shootable(b, 'glass');
    }
  }
  // Gas cylinder: shot -> 1s smoke warning -> big blast, 5m area (v19.2.7).
  function addGasTank(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 12),
      mat(0xcc3322, 0.5, { metalness: 0.5 }));
    tank.position.y = 0.55; g.add(tank); shootable(tank, 'metal');
    tank.userData.propType = 'gas';
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 6), mat(0x8a8d90, 0.4));
    valve.position.y = 1.2; g.add(valve);
    solid(x - 0.4, z - 0.4, x + 0.4, z + 0.4, 0, 1.3);
    return g;
  }
  // Generator: shot -> sparks + every map light off for 10s (v19.2.12).
  function addGenerator(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const bodyM = box(1.4, 0.9, 0.9, 0x3a6a2a); bodyM.position.y = 0.45; g.add(bodyM);
    bodyM.userData.propType = 'generator'; shootable(bodyM, 'metal');
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6), mat(0x2e3236, 0.5));
    pipe.position.set(0.4, 1.1, 0); g.add(pipe);
    solid(x - 0.75, z - 0.5, x + 0.75, z + 0.5, 0, 1.4);
    return g;
  }
  // Lift shaft in a 3-floor building: press E nearby to change floor (v19.2.15).
  function addLift(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const shaft = box(2, 9.6, 2, 0x6a7a8a); shaft.position.y = 4.8; g.add(shaft);
    const doorM = box(1.2, 2.2, 0.1, 0x2a4a6a); doorM.position.set(0, 1.1, 1.02); g.add(doorM);
    const lampM = new THREE.MeshBasicMaterial({ color: 0x44ff88 });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), lampM);
    lamp.position.set(0, 2.6, 1.03); g.add(lamp);
    solid(x - 1, z - 1, x + 1, z + 1, 0, 9.6);
    lifts.push({ x, z, mesh: g });
    return g;
  }
  // Escalator: 3 stepped levels form the slope (groundY handles steps, v19.2.15).
  function addEscalator(x, z, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const stepM = mat(0x8a8d90, 0.5, { metalness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 1.6), stepM);
      s.position.set(0, 0.8 + i * 1.6, -2.4 + i * 1.6); g.add(s);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 5.2), mat(0x2e3236, 0.6));
    rail.position.set(1.05, 2.6, 0); rail.rotation.x = -0.5; g.add(rail);
    // Levels are world-space: escalator runs along local +z after rotation.
    const [dx, dz] = rot === 0 ? [0, 1] : rot === Math.PI / 2 ? [1, 0] : rot === Math.PI ? [0, -1] : [-1, 0];
    for (let i = 0; i < 3; i++) {
      const cx = x + dx * (-2.4 + i * 1.6), cz = z + dz * (-2.4 + i * 1.6);
      const lv = { x0: cx - 1, z0: cz - 0.8, x1: cx + 1, z1: cz + 0.8, y: 1.6 * (i + 1) };
      levels.push(lv); propLevels.push(lv);
    }
    return g;
  }
  // Mud patch: walking through slows you 20% for 1s (v19.2.14).
  function addMud(x, z, w = 6, d = 4) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); group.add(m);
    mudRects.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 });
    return m;
  }
  // Loot crate (BR, v20.0.2): yellow crate, E to open for random loot.
  function addLootCrate(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const b = box(1.1, 0.8, 1.1, 0xe8b800); b.position.y = 0.4; g.add(b);
    const lid = box(1.14, 0.14, 1.14, 0xc89000); lid.position.y = 0.85; g.add(lid);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.06, 1.16),
      new THREE.MeshBasicMaterial({ color: 0xffdd44 }));
    glow.position.y = 0.95; g.add(glow);
    solid(x - 0.6, z - 0.6, x + 0.6, z + 0.6, 0, 0.95);
    lootCrates.push({ x, z, mesh: g, opened: false });
    return g;
  }
  // Ammo box (v19.0.9): green box, +60 reserve when you walk up to it.
  function addAmmoBox(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const b = box(0.9, 0.6, 0.6, 0x2a7a3a); b.position.y = 0.3; g.add(b);
    const lid = box(0.94, 0.1, 0.64, 0x1a5a2a); lid.position.y = 0.62; g.add(lid);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.12, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xffcc44 }));
    stripe.position.set(0, 0.35, 0.31); g.add(stripe);
    solid(x - 0.5, z - 0.35, x + 0.5, z + 0.35, 0, 0.7);
    ammoBoxes.push({ x, z, mesh: g, taken: false });
    return g;
  }
  function addStatue(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const ped = box(1.4, 1, 1.4, 0x8a8d90); ped.position.y = 0.5; g.add(ped); shootable(ped);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.6, 8), mat(0xb8b0a0, 0.8));
    body.position.y = 1.8; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), mat(0xb8b0a0, 0.8));
    head.position.y = 2.85; g.add(head);
    const arm = box(0.2, 1.1, 0.2, 0xb8b0a0); arm.position.set(0.5, 2.2, 0); arm.rotation.z = -0.7; g.add(arm);
    tagColor(ped, 'statue'); tagColor(body, 'statue'); tagColor(head, 'statue'); tagColor(arm, 'statue');
    solid(x - 0.75, z - 0.75, x + 0.75, z + 0.75, 0, 3.1);
    return g;
  }
  function addRoofAC(x, z, y) {
    const g = new THREE.Group(); g.position.set(x, y, z); group.add(g);
    const unit = box(1.4, 0.7, 1, 0x9aa0a0); unit.position.y = 0.35; g.add(unit); shootable(unit, 'metal');
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 12), mat(0x2e3236, 0.6));
    fan.position.y = 0.73; g.add(fan);
    return g;
  }
  function addRoadLines(x, z, len, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const lineM = mat(0xe9e6df, 0.9);
    colorMats.push({ kind: 'road', mat: lineM });
    for (let i = 0; i < Math.floor(len / 4); i++) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 2), lineM);
      dash.position.set(0, 0.02, -len / 2 + 2 + i * 4); g.add(dash);
    }
    return g; // flat, walkable
  }
  // Crashed helicopter: the intact wreck plus flickering fire + smoke.
  function addCrashedHeli(x, z, rot = 0) {
    const g = addHelicopter(x, z, rot);
    g.rotation.z = 0.18; // tilted wreck
    return g;
  }

  // ---- Houses with interiors ----
  // Front = +z in local space. rot is a multiple of 90 (deg). Walls are built
  // from segments so doors and windows are real gaps: you can walk in through
  // the door, climb the stairs, and shoot out of the 2nd-floor windows.
  function addHouse(o) {
    const hx = o.x, hz = o.z, rot = o.rot || 0;
    const w = o.w ?? 8, d = o.d ?? 7, floors = o.floors ?? 2;
    const color = o.color ?? 0x8a7a5a, roofC = o.roof ?? 0x6b4a2a;
    const g = new THREE.Group();
    g.position.set(hx, 0, hz);
    g.rotation.y = (rot * Math.PI) / 180;
    group.add(g);
    const T = 0.3;
    const mapRect = (lx0, lz0, lx1, lz1) => {
      const pts = _corners.map(([a, b]) => rotPt(lx0 + a * (lx1 - lx0), lz0 + b * (lz1 - lz0), rot));
      const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
      return { x0: hx + Math.min(...xs), z0: hz + Math.min(...zs), x1: hx + Math.max(...xs), z1: hz + Math.max(...zs) };
    };
    const mapPt = (lx, lz) => { const [rx, rz] = rotPt(lx, lz, rot); return { x: hx + rx, z: hz + rz }; };
    // House footprint (world-space rect) — for isIndoors() (reverb, wet checks).
    houseRects.push(mapRect(-w / 2, -d / 2, w / 2, d / 2));
    function segX(cx, yBase, z, ww, hh, y0, y1) {
      const m = box(ww, hh, T, color);
      m.position.set(cx, yBase + hh / 2, z); g.add(m); shootable(m); tagColor(m, 'building');
      const r = mapRect(cx - ww / 2, z - T / 2, cx + ww / 2, z + T / 2);
      solid(r.x0, r.z0, r.x1, r.z1, y0, y1);
    }
    function segZ(cz, yBase, x, ww, hh, y0, y1) {
      const m = box(T, hh, ww, color);
      m.position.set(x, yBase + hh / 2, cz); g.add(m); shootable(m); tagColor(m, 'building');
      const r = mapRect(x - T / 2, cz - ww / 2, x + T / 2, cz + ww / 2);
      solid(r.x0, r.z0, r.x1, r.z1, y0, y1);
    }
    // One window opening (sill + header) inside a wall run, with a
    // breakable glass pane (v18.4): shoot it and it shatters.
    function windowGlass(cx, yBase, z, ww, alongX) {
      // GRAPHICS FIX: a bright frame + mullion cross around the pane, and a
      // faintly glowing glass, so windows read as windows from across the map.
      const frameM = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.7 });
      const fb = (fw, fh, fd, fx, fy, fz) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd), frameM);
        b.position.set(fx, fy, fz); b.castShadow = true; g.add(b);
      };
      const T2 = T + 0.06;
      if (alongX) {
        fb(ww + 0.24, 0.12, T2, cx, yBase + 2.86, z);
        fb(ww + 0.24, 0.12, T2, cx, yBase + 1.14, z);
        fb(0.12, 1.84, T2, cx - ww / 2 - 0.06, yBase + 2.0, z);
        fb(0.12, 1.84, T2, cx + ww / 2 + 0.06, yBase + 2.0, z);
        fb(0.06, 1.6, 0.06, cx, yBase + 2.0, z);
        fb(ww, 0.06, 0.06, cx, yBase + 2.0, z);
      } else {
        fb(T2, 0.12, ww + 0.24, cx, yBase + 2.86, z);
        fb(T2, 0.12, ww + 0.24, cx, yBase + 1.14, z);
        fb(T2, 1.84, 0.12, cx, yBase + 2.0, z - ww / 2 - 0.06);
        fb(T2, 1.84, 0.12, cx, yBase + 2.0, z + ww / 2 + 0.06);
        fb(0.06, 1.6, 0.06, cx, yBase + 2.0, z);
        fb(0.06, 0.06, ww, cx, yBase + 2.0, z);
      }
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.35, emissive: 0x2a4a6a, emissiveIntensity: 0.5 });
      const pane = new THREE.Mesh(new THREE.BoxGeometry(alongX ? ww : 0.05, 1.6, alongX ? 0.05 : ww), glassMat);
      pane.position.set(cx, yBase + 2.0, z); g.add(pane);
      tagColor(pane, 'window');
      shootable(pane, 'glass');
      const rec = { kind: 'window', hp: 1, x: cx, z, meshes: [pane], collider: null, smoking: false };
      pane.userData.destructible = rec;
      destructibles.push(rec);
      return pane;
    }
    function windowX(cx, yBase, z, ww) {
      const sill = box(ww, 1.2, T, color); sill.position.set(cx, yBase + 0.6, z); g.add(sill); shootable(sill); tagColor(sill, 'building');
      const r1 = mapRect(cx - ww / 2, z - T / 2, cx + ww / 2, z + T / 2);
      solid(r1.x0, r1.z0, r1.x1, r1.z1, yBase, yBase + 1.2);
      const hd = box(ww, FH - 2.8, T, color); hd.position.set(cx, yBase + 2.8 + (FH - 2.8) / 2, z); g.add(hd); shootable(hd); tagColor(hd, 'building');
      const r2 = mapRect(cx - ww / 2, z - T / 2, cx + ww / 2, z + T / 2);
      solid(r2.x0, r2.z0, r2.x1, r2.z1, yBase + 2.8, yBase + FH);
      windowGlass(cx, yBase, z, ww, true);
    }
    function windowZ(cz, yBase, x, ww) {
      const sill = box(T, 1.2, ww, color); sill.position.set(x, yBase + 0.6, cz); g.add(sill); shootable(sill); tagColor(sill, 'building');
      const r1 = mapRect(x - T / 2, cz - ww / 2, x + T / 2, cz + ww / 2);
      solid(r1.x0, r1.z0, r1.x1, r1.z1, yBase, yBase + 1.2);
      const hd = box(T, FH - 2.8, ww, color); hd.position.set(x, yBase + 2.8 + (FH - 2.8) / 2, cz); g.add(hd); shootable(hd); tagColor(hd, 'building');
      const r2 = mapRect(x - T / 2, cz - ww / 2, x + T / 2, cz + ww / 2);
      solid(r2.x0, r2.z0, r2.x1, r2.z1, yBase + 2.8, yBase + FH);
      windowGlass(x, yBase, cz, ww, false);
    }
    function addDoor(cx, yBase, z, alongX = true) {
      const hinge = new THREE.Group();
      hinge.position.set(alongX ? cx - 0.6 : cx, yBase, alongX ? z : z - 0.6);
      const panel = box(1.2, 2.6, 0.08, 0x7a4a26);
      panel.position.set(alongX ? 0.6 : 0, 1.3, alongX ? 0 : 0.6);
      if (!alongX) panel.rotation.y = Math.PI / 2;
      hinge.add(panel);
      tagColor(panel, 'door');
      const handle = box(0.08, 0.08, 0.2, 0xd8b25a);
      handle.position.set(alongX ? 1.05 : 0.08, 1.1, alongX ? 0.08 : 1.05);
      hinge.add(handle);
      g.add(hinge);
      // Door frame: warm-white posts + lintel so the entrance reads from far.
      const dFrameM = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.7 });
      const dPost = (px, pz) => { const p = box(0.14, 2.7, 0.14, dFrameM); p.position.set(px, yBase + 1.35, pz); g.add(p); };
      if (alongX) {
        dPost(cx - 0.68, z); dPost(cx + 0.68, z);
        const lin = box(1.5, 0.14, 0.14, dFrameM); lin.position.set(cx, yBase + 2.68, z); g.add(lin);
      } else {
        dPost(cx, z - 0.68); dPost(cx, z + 0.68);
        const lin = box(0.14, 0.14, 1.5, dFrameM); lin.position.set(cx, yBase + 2.68, z); g.add(lin);
      }
      shootable(panel);
      const r = mapRect(cx - 0.65, z - 0.12, cx + 0.65, z + 0.12);
      const col = solid(r.x0, r.z0, r.x1, r.z1, yBase, yBase + 2.6);
      const lr = mapRect(cx - 0.65, z - T / 2, cx + 0.65, z + T / 2);
      solid(lr.x0, lr.z0, lr.x1, lr.z1, yBase + 2.6, yBase + FH); // lintel above the door
      const wp = mapPt(cx, z);
      const door = { x: wp.x, z: wp.z, hinge, angle: 0, target: 0, open: false, collider: col, dir: 1 };
      doors.push(door); propDoors.push(door);
      return door;
    }
    // Wall runs per floor.
    for (let f = 0; f < floors; f++) {
      const yB = f * FH;
      const zF = d / 2, zB = -d / 2, xL = -w / 2, xR = w / 2;
      // Front wall: [post][window][door][window][post] (floor 1) or windows + balcony door (floor 2+)
      const doorW = 1.2, winW = 1.6;
      const postW = (w - doorW - 2 * winW) / 2;
      const frontDoor = f === 0 || (f === 1 && o.balcony !== false && floors >= 2);
      const cx1 = -w / 2 + postW / 2;
      const cx2 = -w / 2 + postW + winW / 2;
      const cx3 = -w / 2 + postW + winW + doorW + winW / 2;
      const cx4 = w / 2 - postW / 2;
      segX(cx1, yB, zF, postW, FH, yB, yB + FH);
      windowX(cx2, yB, zF, winW);
      if (frontDoor) addDoor(0, yB, zF, true);
      else windowX(0, yB, zF, doorW);
      windowX(cx3, yB, zF, winW);
      segX(cx4, yB, zF, postW, FH, yB, yB + FH);
      // Back wall: [post][window][window][post]
      const bPostW = (w - 2 * winW) / 2;
      segX(-w / 2 + bPostW / 2, yB, zB, bPostW, FH, yB, yB + FH);
      windowX(-w / 2 + bPostW + winW / 2, yB, zB, winW);
      windowX(w / 2 - bPostW - winW / 2, yB, zB, winW);
      segX(w / 2 - bPostW / 2, yB, zB, bPostW, FH, yB, yB + FH);
      // Side walls: [post][window][post]
      const sPostW = (d - winW) / 2;
      for (const sx of [xL, xR]) {
        segZ(-d / 2 + sPostW / 2, yB, sx, sPostW, FH, yB, yB + FH);
        windowZ(0, yB, sx, winW);
        segZ(d / 2 - sPostW / 2, yB, sx, sPostW, FH, yB, yB + FH);
      }
    }
    // Wooden floor inside (visual, ground level)
    const floorIn = new THREE.Mesh(new THREE.BoxGeometry(w - 0.6, 0.08, d - 0.6), mat(0x7a5c38, 0.95));
    floorIn.position.set(0, 0.04, 0); floorIn.receiveShadow = true; g.add(floorIn);
    // Stairs: 6 steps along the left wall, front (bottom) -> back (top).
    const stairX0 = -w / 2 + 0.3, stairX1 = -w / 2 + 1.5;
    const stairZ0 = -d / 2 + 0.5, stairZ1 = d / 2 - 0.5;
    const stepLen = (stairZ1 - stairZ0) / 6;
    function buildStairs(yBase, yTop) {
      for (let i = 0; i < 6; i++) {
        const h = (i + 1) * (FH / 6);
        const s = box(1.2, h, stepLen, 0x6b4a2a);
        s.position.set((stairX0 + stairX1) / 2, yBase + h / 2, stairZ1 - (i + 0.5) * stepLen);
        g.add(s);
      }
      const lo = mapPt((stairX0 + stairX1) / 2, stairZ1);
      const hi = mapPt((stairX0 + stairX1) / 2, stairZ0);
      const r = mapRect(stairX0, stairZ0, stairX1, stairZ1);
      const st = { ...r, ax: lo.x, az: lo.z, bx: hi.x, bz: hi.z, y0: yBase, y1: yTop };
      stairs.push(st); propStairs.push(st);
    }
    // Floor slabs with a stair hole + railing, and level rects.
    if (floors >= 2) {
      buildStairs(0, FH);
      const slab = box(w - 1.2 - 0.3, 0.2, d - 0.6, 0x7a5c38);
      slab.position.set((stairX1 + w / 2) / 2 - 0.15, FH - 0.1, 0);
      g.add(slab);
      const lr = mapRect(stairX1, -d / 2 + 0.3, w / 2 - 0.15, d / 2 - 0.15);
      const lv = { ...lr, y: FH };
      levels.push(lv); propLevels.push(lv);
      // Railing along the stair hole (gap at the top end so you can step in)
      const railX = stairX1 + 0.05;
      const railZ0 = -d / 2 + 1.7, railZ1 = d / 2 - 0.5;
      for (let rz = railZ0; rz <= railZ1; rz += 0.9) {
        const p = box(0.08, 1.1, 0.08, 0x4a3421);
        p.position.set(railX, FH + 0.55, rz); g.add(p);
      }
      const rail = box(0.08, 0.08, railZ1 - railZ0, 0x4a3421);
      rail.position.set(railX, FH + 1.1, (railZ0 + railZ1) / 2); g.add(rail);
      const rr = mapRect(railX - 0.1, railZ0, railX + 0.1, railZ1);
      solid(rr.x0, rr.z0, rr.x1, rr.z1, FH, FH + 1.1);
    }
    if (floors >= 3) {
      // Second staircase along the right wall, back (bottom) -> front (top).
      const s2x0 = w / 2 - 1.5, s2x1 = w / 2 - 0.3;
      for (let i = 0; i < 6; i++) {
        const h = (i + 1) * (FH / 6);
        const s = box(1.2, h, stepLen, 0x6b4a2a);
        s.position.set((s2x0 + s2x1) / 2, FH + h / 2, stairZ0 + (i + 0.5) * stepLen);
        g.add(s);
      }
      const lo = mapPt((s2x0 + s2x1) / 2, stairZ0);
      const hi = mapPt((s2x0 + s2x1) / 2, stairZ1);
      const r = mapRect(s2x0, stairZ0, s2x1, stairZ1);
      const st = { ...r, ax: lo.x, az: lo.z, bx: hi.x, bz: hi.z, y0: FH, y1: 2 * FH };
      stairs.push(st); propStairs.push(st);
      const slab3 = box(w - 1.2 - 0.3, 0.2, d - 0.6, 0x7a5c38);
      slab3.position.set(((-w / 2) + s2x0) / 2 + 0.15, 2 * FH - 0.1, 0);
      g.add(slab3);
      const lr3 = mapRect(-w / 2 + 0.15, -d / 2 + 0.3, s2x0, d / 2 - 0.15);
      const lv3 = { ...lr3, y: 2 * FH };
      levels.push(lv3); propLevels.push(lv3);
    }
    // Balcony on floor 2 (front), with its own level rect + railing.
    if (floors >= 2 && o.balcony !== false) {
      const bZ0 = d / 2, bZ1 = d / 2 + 1.6;
      const slab = box(w - 0.6, 0.2, 1.6, 0x7a5c38);
      slab.position.set(0, FH - 0.1, (bZ0 + bZ1) / 2); g.add(slab);
      const br = mapRect(-w / 2 + 0.3, bZ0, w / 2 - 0.3, bZ1);
      const lv = { ...br, y: FH };
      levels.push(lv); propLevels.push(lv);
      for (const [rx, rz, rw, rd] of [
        [-w / 2 + 0.35, (bZ0 + bZ1) / 2, 0.08, 1.6],
        [w / 2 - 0.35, (bZ0 + bZ1) / 2, 0.08, 1.6],
        [0, bZ1 - 0.04, w - 0.6, 0.08],
      ]) {
        const rail = box(rw, 1.1, rd, 0x4a3421);
        rail.position.set(rx, FH + 0.55, rz); g.add(rail);
        const rr = mapRect(rx - rw / 2, rz - rd / 2, rx + rw / 2, rz + rd / 2);
        solid(rr.x0, rr.z0, rr.x1, rr.z1, FH, FH + 1.1);
      }
      for (const sx of [-w / 2 + 0.4, w / 2 - 0.4]) {
        const post = box(0.18, FH, 0.18, color);
        post.position.set(sx, FH / 2, bZ1 - 0.1); g.add(post);
        const pr = mapRect(sx - 0.09, bZ1 - 0.19, sx + 0.09, bZ1 - 0.01);
        solid(pr.x0, pr.z0, pr.x1, pr.z1, 0, FH);
      }
    }
    // Roof: slab + two sloped panels meeting at a ridge.
    const roofY = floors * FH;
    const roofSlab = box(w + 0.8, 0.35, d + 0.8, roofC);
    roofSlab.position.set(0, roofY + 0.17, 0); g.add(roofSlab);
    tagColor(roofSlab, 'roof');
    for (const s of [-1, 1]) {
      const panel = box(w + 0.8, 0.12, d / 2 + 0.5, roofC);
      panel.position.set(0, roofY + 0.7, s * d / 4);
      tagColor(panel, 'roof');
      panel.rotation.x = -s * 0.35;
      g.add(panel);
    }
    // GRAPHICS FIX: a light fascia board along the roof edge + a chimney, so
    // the roofline reads as a house silhouette from across the map.
    const fasciaM = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.7 });
    for (const s of [-1, 1]) {
      const fas = box(w + 0.9, 0.16, 0.08, fasciaM);
      fas.position.set(0, roofY + 0.28, s * (d / 2 + 0.42)); g.add(fas);
    }
    const chimney = box(0.6, 1.1, 0.6, 0x8a4a3a);
    chimney.position.set(w / 4, roofY + 0.9, -d / 4); g.add(chimney);
    const chimneyCap = box(0.8, 0.12, 0.8, 0x5a3a2a);
    chimneyCap.position.set(w / 4, roofY + 1.5, -d / 4); g.add(chimneyCap);
    // Interior furniture (floor 1).
    if (o.furniture !== false) {
      const furn = (lx, lz, ww, hh, dd, color, y1) => {
        const m = box(ww, hh, dd, color);
        m.position.set(lx, hh / 2, lz); g.add(m); shootable(m);
        const r = mapRect(lx - ww / 2, lz - dd / 2, lx + ww / 2, lz + dd / 2);
        solid(r.x0, r.z0, r.x1, r.z1, 0, y1 ?? hh);
      };
      // Bed (right wall, front) + blanket + pillow
      furn(w / 2 - 0.75, d / 2 - 1.6, 1.1, 0.5, 1.9, 0x6b4a2a, 0.6);
      const blanket = box(1.0, 0.12, 1.0, 0x8a2a2a);
      blanket.position.set(w / 2 - 0.75, 0.56, d / 2 - 1.2); g.add(blanket);
      const pillow = box(0.9, 0.14, 0.5, 0xe9e6df);
      pillow.position.set(w / 2 - 0.75, 0.57, d / 2 - 2.3); g.add(pillow);
      // Table (center-right) + chairs
      furn(1.2, 0.4, 1.4, 0.75, 0.8, 0x5a4028, 0.8);
      // Wardrobe (back wall, right)
      furn(w / 2 - 1.0, -d / 2 + 0.6, 0.9, 2.2, 0.55, 0x4a3421, 2.2);
      // Kitchen counter (back wall, center-left)
      furn(-0.6, -d / 2 + 0.55, 2.2, 0.9, 0.6, 0x5c6b70, 1.0);
      const stove = box(0.7, 0.06, 0.5, 0x1c1e20);
      stove.position.set(-1.2, 0.93, -d / 2 + 0.55); g.add(stove);
      // Small interior props (v18.9.26): poster, wall clock, mirror, toilet.
      const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xff5577, roughness: 0.8 }));
      poster.position.set(-w / 2 + 0.06, 1.8, 0); poster.rotation.y = Math.PI / 2; g.add(poster);
      const clockG = new THREE.Group(); clockG.position.set(w / 2 - 0.06, 2.4, -1); clockG.rotation.y = -Math.PI / 2; g.add(clockG);
      const cFace = new THREE.Mesh(new THREE.CircleGeometry(0.35, 20),
        new THREE.MeshStandardMaterial({ color: 0xf5f2e8, roughness: 0.6 }));
      clockG.add(cFace);
      const cHour = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.01), new THREE.MeshBasicMaterial({ color: 0x222222 }));
      cHour.position.z = 0.01; cHour.geometry.translate(0, 0.07, 0); clockG.add(cHour);
      const cMin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.26, 0.01), new THREE.MeshBasicMaterial({ color: 0x222222 }));
      cMin.position.z = 0.012; cMin.geometry.translate(0, 0.11, 0); clockG.add(cMin);
      decorClocks.push({ hour: cHour, minute: cMin, phase: Math.random() * 6 });
      const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2),
        new THREE.MeshStandardMaterial({ color: 0xbfd4e0, roughness: 0.05, metalness: 1 }));
      mirror.position.set(w / 2 - 0.06, 1.6, 1.8); mirror.rotation.y = -Math.PI / 2; g.add(mirror);
      const toiletBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.45, 10), mat(0xf5f5f5, 0.4));
      toiletBase.position.set(-w / 2 + 0.8, 0.22, -d / 2 + 1.4); g.add(toiletBase); shootable(toiletBase);
      const toiletTank = box(0.5, 0.5, 0.2, 0xf5f5f5);
      toiletTank.position.set(-w / 2 + 0.8, 0.6, -d / 2 + 1.05); g.add(toiletTank);
      const radio = box(0.6, 0.35, 0.25, 0x8a2a2a);
      radio.position.set(-0.6, 1.07, -d / 2 + 0.55); g.add(radio); shootable(radio, 'metal');
      radio.userData.propType = 'radio';
      // Indoor lamp (warm glow): emissive bulb + halo + one real PointLight
      // per house (v18.6.2 + fake bloom v18.6.8). Low quality turns the
      // PointLights off via setHouseLights (the emissive bulb stays lit).
      const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.6, 6), mat(0x2e3236, 0.6));
      lampPole.position.set(-w / 2 + 0.6, 0.8, d / 2 - 0.6); g.add(lampPole);
      const lampBallMat = new THREE.MeshStandardMaterial({ color: 0x332a10, emissive: 0xffd27a, emissiveIntensity: 2.2 });
      const lampBall = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), lampBallMat);
      lampBall.position.set(-w / 2 + 0.6, 1.7, d / 2 - 0.6); g.add(lampBall);
      const lampHalo = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.16, depthWrite: false }));
      lampHalo.position.copy(lampBall.position); g.add(lampHalo);
      const houseLight = new THREE.PointLight(0xffd9a0, 2.5, 7);
      houseLight.position.set(-w / 2 + 0.6, 2.4, d / 2 - 0.6); g.add(houseLight);
      decorHouseLights.push({ light: houseLight });
      // Ceiling bulbs on the upper floors (emissive only, no extra lights).
      for (let f = 2; f <= floors; f++) {
        const bulbMat = new THREE.MeshStandardMaterial({ color: 0x332a10, emissive: 0xffd27a, emissiveIntensity: 2.0 });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), bulbMat);
        bulb.position.set(0, (f - 1) * FH + 2.6, 0); g.add(bulb);
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mat(0x1c1e20, 0.6));
        cord.position.set(0, (f - 1) * FH + 2.9, 0); g.add(cord);
      }
      // Floor 2: a bed + a table
      if (floors >= 2) {
        const bed2 = box(1.1, 0.5, 1.9, 0x6b4a2a);
        bed2.position.set(w / 2 - 0.75, FH + 0.25, -d / 2 + 1.6); g.add(bed2); shootable(bed2);
        const r2 = mapRect(w / 2 - 1.3, -d / 2 + 0.65, w / 2 - 0.2, -d / 2 + 2.55);
        solid(r2.x0, r2.z0, r2.x1, r2.z1, FH, FH + 0.6);
        const table2 = box(1.2, 0.75, 0.7, 0x5a4028);
        table2.position.set(0.6, FH + 0.37, d / 2 - 1.0); g.add(table2); shootable(table2);
        const r3 = mapRect(0, d / 2 - 1.35, 1.2, d / 2 - 0.65);
        solid(r3.x0, r3.z0, r3.x1, r3.z1, FH, FH + 0.8);
      }
    }
    return g;
  }
  // Big open barn (no door panels — walk straight in), hay bales inside.
  function addBarn(o) {
    const hx = o.x, hz = o.z, rot = o.rot || 0;
    const w = o.w ?? 12, d = o.d ?? 9;
    const g = new THREE.Group();
    g.position.set(hx, 0, hz);
    g.rotation.y = (rot * Math.PI) / 180;
    group.add(g);
    const color = o.color ?? 0x7a3a2a;
    const T = 0.3;
    const mapRect = (lx0, lz0, lx1, lz1) => {
      const pts = _corners.map(([a, b]) => rotPt(lx0 + a * (lx1 - lx0), lz0 + b * (lz1 - lz0), rot));
      const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
      return { x0: hx + Math.min(...xs), z0: hz + Math.min(...zs), x1: hx + Math.max(...xs), z1: hz + Math.max(...zs) };
    };
    const wall = (lx, lz, ww, hh, dd) => {
      const m = box(ww, hh, dd, color);
      m.position.set(lx, hh / 2, lz); g.add(m); shootable(m, 'wood');
      const r = mapRect(lx - ww / 2, lz - dd / 2, lx + ww / 2, lz + dd / 2);
      solid(r.x0, r.z0, r.x1, r.z1, 0, hh);
    };
    // Back + side walls solid; front wall has a 2.4m open doorway (no panels).
    wall(0, -d / 2, w, FH, T);
    wall(-w / 2, 0, T, FH, d);
    wall(w / 2, 0, T, FH, d);
    const segW = (w - 2.4) / 2;
    wall(-(2.4 / 2 + segW / 2), d / 2, segW, FH, T);
    wall(2.4 / 2 + segW / 2, d / 2, segW, FH, T);
    // lintel above the doorway
    const lint = box(2.4, FH - 3, T, color);
    lint.position.set(0, 3 + (FH - 3) / 2, d / 2); g.add(lint); shootable(lint, 'wood');
    const lr = mapRect(-1.2, d / 2 - T / 2, 1.2, d / 2 + T / 2);
    solid(lr.x0, lr.z0, lr.x1, lr.z1, 3, FH);
    // Roof: high gable
    const roof = box(w + 0.8, 0.35, d + 0.8, 0x4a2a1a);
    roof.position.set(0, FH + 0.17, 0); g.add(roof);
    tagColor(roof, 'roof');
    for (const s of [-1, 1]) {
      const panel = box(w + 0.8, 0.12, d / 2 + 0.6, 0x4a2a1a);
      panel.position.set(0, FH + 0.9, s * d / 4);
      panel.rotation.x = -s * 0.4;
      g.add(panel);
    }
    // Hay bales inside
    for (const [bx, bz] of [[-3.5, -2.5], [-3.5, -1.2], [3.5, -2.5], [3.5, 2.5]]) {
      const bale = box(1.4, 0.9, 0.9, 0xc8a84a);
      bale.position.set(bx, 0.45, bz); g.add(bale); shootable(bale, 'wood');
      const r = mapRect(bx - 0.7, bz - 0.45, bx + 0.7, bz + 0.45);
      solid(r.x0, r.z0, r.x1, r.z1, 0, 0.9);
    }
    return g;
  }

    // ---- v22.3 / v22.4 props: bushes, power poles, city interactables ----
  function addBush(x, z) {
    const g = new THREE.Group();
    const m1 = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a5a2a, roughness: 1 }));
    m1.position.y = 0.6; m1.castShadow = true; g.add(m1);
    const m2 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 1 }));
    m2.position.set(0.5, 0.9, 0.3); m2.castShadow = true; g.add(m2);
    g.position.set(x, 0, z);
    group.add(g);
    m1.userData.propType = 'bush'; m2.userData.propType = 'bush';
    shootable(m1, 'wood'); shootable(m2, 'wood');
    bushes.push({ x, z, mesh: g });
    return g;
  }
  function addPowerPole(x, z) {
    const pole = box(0.25, 6, 0.25, 0x4a3a2a);
    pole.position.set(x, 3, z); group.add(pole);
    pole.userData.propType = 'power-pole';
    shootable(pole, 'wood');
    const cross = box(2.2, 0.15, 0.15, 0x4a3a2a);
    cross.position.set(x, 5.6, z); group.add(cross);
    const cable = box(4, 0.04, 0.04, 0x1a1a1a);
    cable.position.set(x + 2, 5.6, z); group.add(cable);
    cable.userData.propType = 'power-line';
    shootable(cable, 'metal');
    solid(x - 0.2, z - 0.2, x + 0.2, z + 0.2, 0, 6);
    return pole;
  }
  function addWoodPile(x, z) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 }));
      log.rotation.z = Math.PI / 2;
      log.position.set(0, 0.2 + Math.floor(i / 3) * 0.38, (i % 3 - 1) * 0.4);
      log.castShadow = true; g.add(log);
      log.userData.propType = 'wood-pile';
      shootable(log, 'wood');
    }
    g.position.set(x, 0, z);
    group.add(g);
    return g;
  }
  function addTrashCan(x, z) {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 0.9, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a5a3a, roughness: 0.7, metalness: 0.3 }));
    can.position.set(x, 0.45, z); can.castShadow = true; group.add(can);
    can.userData.propType = 'trash-can';
    shootable(can, 'metal');
    solid(x - 0.4, z - 0.4, x + 0.4, z + 0.4, 0, 0.9);
    return can;
  }
  function addRoadSign(x, z) {
    const pole = box(0.1, 2.2, 0.1, 0x888888);
    pole.position.set(x, 1.1, z); group.add(pole);
    const sign = box(0.9, 0.6, 0.06, 0xcc2222);
    sign.position.set(x, 2.3, z); group.add(sign);
    sign.userData.propType = 'road-sign';
    shootable(sign, 'metal');
    return sign;
  }
  function addRock(x, z) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0),
      new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 1 }));
    rock.position.set(x, 0.5, z); rock.castShadow = true; group.add(rock);
    rock.userData.propType = 'rock';
    tagColor(rock, 'rock');
    shootable(rock, 'wall');
    solid(x - 0.7, z - 0.7, x + 0.7, z + 0.7, 0, 1);
    return rock;
  }
  function addPlantPot(x, z) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 0.5, 10),
      new THREE.MeshStandardMaterial({ color: 0xa0522d, roughness: 0.9 }));
    pot.position.set(x, 0.25, z); pot.castShadow = true; group.add(pot);
    pot.userData.propType = 'plant-pot';
    shootable(pot, 'wood');
    const plant = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 1 }));
    plant.position.set(x, 0.7, z); group.add(plant);
    plant.userData.propType = 'plant-pot';
    shootable(plant, 'wood');
    return pot;
  }
  // Planter box (reference dusk look): low wooden box + shrubs, small
  // collider so bots and the player walk around it, not through it.
  function addPlanter(x, z, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const bx = box(1.9, 0.5, 0.9, 0x6b4a26); bx.position.y = 0.25; g.add(bx);
    bx.userData.propType = 'planter'; shootable(bx, 'wood');
    const soil = box(1.7, 0.06, 0.7, 0x2a1d12); soil.position.y = 0.52; g.add(soil);
    for (const [sx, sy, sr] of [[-0.6, 0.75, 0.32], [0, 0.85, 0.4], [0.6, 0.75, 0.32]]) {
      const shrub = new THREE.Mesh(new THREE.SphereGeometry(sr, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 1 }));
      shrub.position.set(sx, sy, 0); g.add(shrub);
      shrub.userData.propType = 'planter';
    }
    solid(x - 1, z - 0.5, x + 1, z + 0.5, 0, 1);
    return g;
  }
  function addTrafficLight(x, z) {
    const pole = box(0.15, 3.4, 0.15, 0x333333);
    pole.position.set(x, 1.7, z); group.add(pole);
    const head = box(0.4, 1.0, 0.4, 0x1a1a1a);
    head.position.set(x, 3.6, z); group.add(head);
    head.userData.propType = 'traffic-light';
    shootable(head, 'metal');
    const mk = (color, y) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 }));
      m.position.set(x, y, z + 0.22); group.add(m); return m;
    };
    const rec = { red: mk(0xff2222, 3.9), yellow: mk(0xffcc00, 3.6), green: mk(0x22ff44, 3.3), t: 0, dead: false, head };
    decorTraffic.push(rec);
    solid(x - 0.2, z - 0.2, x + 0.2, z + 0.2, 0, 3.4);
    return head;
  }
  function addHydrant(x, z) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.8, 10),
      new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5, metalness: 0.3 }));
    body.position.set(x, 0.4, z); body.castShadow = true; group.add(body);
    body.userData.propType = 'hydrant';
    shootable(body, 'metal');
    return body;
  }
  function addVending(x, z) {
    const m = box(1.0, 1.9, 0.7, 0x2266cc);
    m.position.set(x, 0.95, z); group.add(m); shootable(m, 'metal');
    m.userData.propType = 'vending';
    const panel = box(0.8, 0.9, 0.05, 0x99ccff);
    panel.position.set(x, 1.2, z + 0.38); group.add(panel);
    solid(x - 0.5, z - 0.35, x + 0.5, z + 0.35, 0, 1.9);
    interactables.push({ type: 'vending', x, z, mesh: m, used: false });
    return m;
  }
  function addATM(x, z) {
    const m = box(0.9, 1.5, 0.6, 0x2a2a2a);
    m.position.set(x, 0.75, z); group.add(m); shootable(m, 'metal');
    m.userData.propType = 'atm';
    const scr = box(0.6, 0.4, 0.05, 0x37c8d8);
    scr.position.set(x, 1.1, z + 0.33); group.add(scr);
    solid(x - 0.45, z - 0.3, x + 0.45, z + 0.3, 0, 1.5);
    interactables.push({ type: 'atm', x, z, mesh: m, used: false });
    return m;
  }
  function addPhoneBooth(x, z) {
    const m = box(0.9, 2.2, 0.9, 0x2266aa);
    m.position.set(x, 1.1, z); group.add(m); shootable(m, 'metal');
    m.userData.propType = 'phone-booth';
    solid(x - 0.45, z - 0.45, x + 0.45, z + 0.45, 0, 2.2);
    interactables.push({ type: 'phone-booth', x, z, mesh: m, used: false });
    return m;
  }
  function addCart(x, z) {
    const m = box(1.2, 0.5, 0.7, 0x8a6f4a);
    m.position.set(x, 0.6, z); group.add(m); shootable(m, 'wood');
    m.userData.propType = 'cart';
    interactables.push({ type: 'cart', x, z, mesh: m, used: false });
    return m;
  }
  function addSuitcase(x, z) {
    const m = box(0.6, 0.4, 0.25, 0x4a2a6a);
    m.position.set(x, 0.2, z); group.add(m); shootable(m, 'wood');
    m.userData.propType = 'suitcase';
    interactables.push({ type: 'suitcase', x, z, mesh: m, used: false });
    return m;
  }
  function addDummy(x, z) {
    const g = new THREE.Group();
    const torso = box(0.7, 0.9, 0.35, 0xcc7722);
    torso.position.y = 1.1; g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xd8b090, roughness: 0.8 }));
    head.position.y = 1.8; g.add(head);
    const legs = box(0.5, 0.7, 0.3, 0x333333);
    legs.position.y = 0.35; g.add(legs);
    g.position.set(x, 0, z);
    group.add(g);
    torso.userData.propType = 'dummy'; head.userData.propType = 'dummy';
    shootable(torso, 'wood'); shootable(head, 'wood');
    decorDummies.push({ group: g, phase: Math.random() * 6 });
    return g;
  }
  function addParkedCar(x, z, rot = 0, color = 0x5a5a5a) {
    const g = new THREE.Group();
    const body = box(2.0, 0.55, 4.2, color);
    body.position.y = 0.55; g.add(body);
    body.userData.propType = 'parked-car';
    shootable(body, 'metal');
    const cab = box(1.7, 0.5, 2.2, 0x1a2a3a);
    cab.position.set(0, 1.05, -0.2); g.add(cab);
    g.position.set(x, 0, z); g.rotation.y = rot;
    group.add(g);
    solid(x - 1.1, z - 2.1, x + 1.1, z + 2.1, 0, 1.4);
    return g;
  }
  function addMotorParked(x, z) {
    const g = new THREE.Group();
    const body = box(0.5, 0.5, 1.9, 0x1a3a6a);
    body.position.y = 0.7; g.add(body);
    body.userData.propType = 'motor';
    shootable(body, 'metal');
    g.position.set(x, 0, z);
    group.add(g);
    return g;
  }
  // ---- v27.0: ambient animals (wander in the main loop, no intervals) ----
  // kind: horse (rideable, E), cow, chicken, dog, cat, firefly (night glow).
  const ANIMAL_DEFS = {
    horse: { body: 0x6a4a2a, scale: 1.5, h: 1.1, emoji: '🐴' },
    cow: { body: 0xddddcc, scale: 1.3, h: 0.9, emoji: '🐄' },
    chicken: { body: 0xffffff, scale: 0.5, h: 0.35, emoji: '🐔' },
    dog: { body: 0x8a5a2a, scale: 0.7, h: 0.5, emoji: '🐶' },
    cat: { body: 0x888888, scale: 0.55, h: 0.35, emoji: '🐱' },
    firefly: { body: 0xccff44, scale: 0.2, h: 1.2, emoji: '✨' },
  };
  function addAnimal(kind, x, z) {
    const def = ANIMAL_DEFS[kind] || ANIMAL_DEFS.dog;
    const g = new THREE.Group();
    const s = def.scale;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9 * s, 0.55 * s, 0.5 * s),
      new THREE.MeshStandardMaterial({ color: def.body, roughness: 0.9 }));
    body.position.y = def.h * s; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35 * s, 0.35 * s, 0.4 * s),
      new THREE.MeshStandardMaterial({ color: def.body, roughness: 0.9 }));
    head.position.set(0.5 * s, (def.h + 0.25) * s, 0); g.add(head);
    let tail = null;
    if (kind === 'dog' || kind === 'cat' || kind === 'horse' || kind === 'cow') {
      tail = box(0.08 * s, 0.08 * s, 0.5 * s, 0x332211);
      tail.position.set(-0.5 * s, (def.h + 0.1) * s, 0); g.add(tail);
    }
    // Legs: 4 thin boxes.
    for (const [lx, lz] of [[0.3, 0.15], [0.3, -0.15], [-0.3, 0.15], [-0.3, -0.15]]) {
      const leg = box(0.1 * s, def.h * s, 0.1 * s, 0x222222);
      leg.position.set(lx * s, def.h * s / 2, lz * s); g.add(leg);
    }
    g.position.set(x, 0, z);
    group.add(g);
    body.userData.propType = 'animal'; body.userData.animalKind = kind;
    shootable(body, 'wood');
    const rec = { kind, group: g, x, z, phase: Math.random() * 6, head, headY: (def.h + 0.25) * s, tail, wanderT: 0, tx: x, tz: z, emoji: def.emoji };
    decorAnimals.push(rec);
    // Horses are mountable (E) — registered as an interactable too.
    if (kind === 'horse') interactables.push({ type: 'horse', x, z, mesh: g, used: false, animal: rec });
    return rec;
  }
  // ---- v27.0: civilian NPCs (original Indonesian names, local trade) ----
  // merchant: buy (opens buy menu). doctor: heal +50 for 50 coin.
  // mechanic: repair your vehicle for 100 coin. cook: cook +20 HP for 20 coin.
  const NPC_DEFS = {
    merchant: { name: 'Bu Sari', role: 'Pedagang', color: 0xcc8844, emoji: '🛒' },
    doctor: { name: 'Dr. Rani', role: 'Dokter', color: 0xffffff, emoji: '🩺' },
    mechanic: { name: 'Bang Joko', role: 'Montir', color: 0x446688, emoji: '🔧' },
    cook: { name: 'Kang Udin', role: 'Koki', color: 0xdddddd, emoji: '🍳' },
  };
  function addNPC(kind, x, z) {
    const def = NPC_DEFS[kind] || NPC_DEFS.merchant;
    const g = new THREE.Group();
    const body = box(0.6, 1.0, 0.35, def.color);
    body.position.y = 1.0; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xd8b090, roughness: 0.8 }));
    head.position.y = 1.75; g.add(head);
    const legs = box(0.45, 0.6, 0.3, 0x333333);
    legs.position.y = 0.3; g.add(legs);
    g.position.set(x, 0, z);
    group.add(g);
    body.userData.propType = 'npc';
    shootable(body, 'wood');
    interactables.push({ type: 'npc-' + kind, x, z, mesh: g, used: false, name: def.name, role: def.role, emoji: def.emoji });
    return g;
  }
  // ---- v27.0: house items (E to use, local state only) ----
  function addHouseItem(kind, x, z) {
    const g = new THREE.Group();
    if (kind === 'fridge') {
      const b = box(0.9, 1.8, 0.7, 0xddeeff); b.position.y = 0.9; g.add(b);
      b.userData.propType = 'fridge'; shootable(b, 'metal');
    } else if (kind === 'stove') {
      const b = box(1.0, 0.9, 0.7, 0x444444); b.position.y = 0.45; g.add(b);
      const top = box(1.0, 0.06, 0.7, 0x111111); top.position.y = 0.93; g.add(top);
      b.userData.propType = 'stove'; shootable(b, 'metal');
    } else if (kind === 'safe') {
      const b = box(0.7, 0.7, 0.6, 0x555577); b.position.y = 0.35; g.add(b);
      b.userData.propType = 'safe'; shootable(b, 'metal');
    } else if (kind === 'wardrobe') {
      const b = box(1.2, 2.0, 0.6, 0x6a4a2a); b.position.y = 1.0; g.add(b);
      b.userData.propType = 'wardrobe'; shootable(b, 'wood');
    }
    g.position.set(x, 0, z);
    group.add(g);
    interactables.push({ type: kind, x, z, mesh: g, used: false });
    return g;
  }
  function addFridge(x, z) { return addHouseItem('fridge', x, z); }
  function addStove(x, z) { return addHouseItem('stove', x, z); }
  function addSafe(x, z) { return addHouseItem('safe', x, z); }
  function addWardrobe(x, z) { return addHouseItem('wardrobe', x, z); }
  // ---- v27.0: harvest / pick (village map) ----
  function addCropPatch(x, z) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const c = box(0.25, 0.5, 0.25, 0x44aa22);
      c.position.set((i % 3 - 1) * 0.5, 0.25, (Math.floor(i / 3) - 0.5) * 0.5); g.add(c);
      tagColor(c, 'grass');
    }
    g.position.set(x, 0, z);
    group.add(g);
    interactables.push({ type: 'crop', x, z, mesh: g, used: false });
    return g;
  }
  function addFruitTree(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 }));
    trunk.position.y = 1.1; g.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a7a2a, roughness: 0.9 }));
    crown.position.y = 2.8; g.add(crown);
    tagColor(crown, 'leaves');
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xff5533, roughness: 0.6 }));
      const a = i * 1.26;
      f.position.set(Math.cos(a) * 1.0, 2.4 + (i % 2) * 0.4, Math.sin(a) * 1.0);
      g.add(f);
    }
    g.position.set(x, 0, z);
    group.add(g);
    interactables.push({ type: 'fruit', x, z, mesh: g, used: false });
    return g;
  }
  return {
    clear, addBox, addCylinder, addContainer, addCrate, addBarrel, addSandbag,
    addTree, addCar, addBus, addTower, addBridge, addStreetlight, addHelicopter,
    addRubble, addRiceField, addFence, addHaystack, addHouse, addBarn,
    addTV, addFlag, addMailbox, addCactus, addTent, addCarpet, addBed, addSofa,
    addTableSet, addBillboard, addCrane, addForklift, addPallet, addSwing,
    addPool, addStatue, addRoofAC, addRoadLines, addCrashedHeli,
    addRedBarrel, addDestructible, addBirds, addBrokenLight,
    addCampfire, addSpark, addOilPuddle, addFountain, addButterflies, addLeaves,
    addFlowers, addNeonSign, addTorch, addEmergencyLight,
    addPoster, addGraffiti, addCans, addPapers, addClock, addRadio, addComputer,
    addToilet, addMirror,
    addBottles, addGasTank, addGenerator, addLift, addEscalator, addMud, addAmmoBox,
    addLootCrate,
    addBush, addPowerPole, addWoodPile, addTrashCan, addRoadSign, addRock,
    addPlantPot, addSiteSign, addPlanter, addTrafficLight, addHydrant, addVending, addATM, addPhoneBooth,
    addCart, addSuitcase, addDummy, addParkedCar, addMotorParked,
    addAnimal, addNPC, addFridge, addStove, addSafe, addWardrobe,
    addCropPatch, addFruitTree,
    addBrickWall, addWallLetter, addHazardBarrier, brickTexture,
    propFall, setLightsOut, dropLeaves, recolor, setSeason, setLightColor,
    animateDecor, decorCounts, destructibles, houseRects, pools,
    treeRecs, flowerSpots, ammoBoxes, lifts, mudRects, lootCrates,
    bushes, containers, decorTraffic, decorDummies, interactables, decorAnimals,
    // Low graphics turns the per-house PointLights off (emissive bulbs stay).
    setHouseLights(on) { for (const h of decorHouseLights) h.light.visible = !!on; },
  };
}
