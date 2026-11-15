// FOUNDRY YARD — original industrial map, ~80 x 56. Colliders are AABBs {x0,z0,x1,z1,h}
// with optional y-ranges {y0, y1} so a closed door blocks only below 3m, a
// railing only at its floor, etc.
// v2: procedural canvas textures (concrete / metal panels / hazard stripes / camo),
// a dusk sky dome, and more detailed props (barrels, pipes, floodlights, sandbags).
// Maps: the base (sky, ground, walls, lights, site rings) stays fixed; the
// props, houses, vehicles and waypoints are rebuilt per map via buildMap().
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { createProps } from './props.js';
import { MAP_DEFS } from './maps.js';

const W = 80, D = 56; // x in [-40,40], z in [-28,28]
export const BOUNDS = { minX: -39, maxX: 39, minZ: -27, maxZ: 27 };
export const SITES = {
  A: { name: 'Furnace', x: -27, z: -19, r: 4.5, color: 0xf0a830 },
  B: { name: 'Crane Yard', x: 27, z: -19, r: 4.5, color: 0x37c8d8 },
  C: { name: 'Mid Yard', x: 0, z: 6, r: 4.5, color: 0x7ddc7d },
};
export const SPAWNS = {
  player: { x: 0, z: 24, yaw: 0 }, // yaw 0 faces -z (north, toward the yard)
  bots: [
    { x: -14, z: -24 }, { x: -4, z: -25 }, { x: 6, z: -25 }, { x: 16, z: -24 }, { x: 0, z: -20 },
  ],
};
// Nearest bomb site by name (radio callouts + killfeed context).
export function nearestSiteName(x, z) {
  let best = null, bd = 1e9;
  for (const k of ['A', 'B', 'C']) {
    const s = SITES[k];
    const d = Math.hypot(s.x - x, s.z - z);
    if (d < bd) { bd = d; best = s; }
  }
  return best ? best.name : 'Mid Yard';
}
// Patrol waypoint graph (small loop routes through mid and both sites).
export const WAYPOINTS = [
  { x: -30, z: -8 }, { x: -30, z: 8 }, { x: -12, z: 14 }, { x: 0, z: 6 },
  { x: 12, z: 14 }, { x: 30, z: 8 }, { x: 30, z: -8 }, { x: 14, z: -8 },
  { x: -14, z: -8 }, { x: 0, z: -14 }, { x: -27, z: -19 }, { x: 27, z: -19 },
  { x: -20, z: 20 }, { x: 20, z: 20 }, { x: 0, z: 20 },
];

// ---- Procedural canvas textures (all generated in code, no downloads) ----
function canvasTex(size, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function speckle(g, size, n, colors, rMin, rMax, rng) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[Math.floor(rng() * colors.length)];
    g.globalAlpha = 0.12 + rng() * 0.25;
    const r = rMin + rng() * (rMax - rMin);
    g.beginPath(); g.arc(rng() * size, rng() * size, r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}
function mulberry(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function concreteTex(rng) {
  return canvasTex(256, (g, s) => {
    g.fillStyle = '#4a4036'; g.fillRect(0, 0, s, s);
    // Large tonal blotches (dust, oil, wear) so the ground is never one flat
    // colour. Positions come from an index hash, NOT the shared rng — the
    // gameplay random sequence (loot, spawns) must stay byte-identical, so
    // this texture consumes exactly the same rng() calls as before: speckle
    // 900 + cracks 5, nothing else.
    for (let i = 0; i < 9; i++) {
      const x = (i * 97 + 31) % 256, y = (i * 57 + 113) % 256, r = 26 + (i * 37) % 55;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, i % 2 === 0 ? 'rgba(22,18,12,0.30)' : 'rgba(210,190,160,0.16)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    speckle(g, s, 900, ['#3a332a', '#5a5044', '#2e2820', '#6b5f4d', '#7a6a52'], 1, 4, rng);
    // tyre arcs (index hash, no rng)
    g.strokeStyle = 'rgba(18,14,10,0.35)'; g.lineWidth = 7;
    for (let i = 0; i < 3; i++) {
      const x = (i * 131 + 41) % 256, y = (i * 89 + 173) % 256, r = 40 + (i * 53) % 50;
      g.beginPath(); g.arc(x, y, r, i * 1.1, i * 1.1 + 1.4); g.stroke();
    }
    // cracks
    g.strokeStyle = 'rgba(20,16,10,0.55)'; g.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      let x = rng() * s, y = rng() * s;
      g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (rng() - 0.5) * 90; y += (rng() - 0.5) * 90; g.lineTo(x, y); }
      g.stroke();
    }
    // Expansion joints: heavy outer tile edge + a 2x2 sub-plate grid, so
    // plates still read at play distance (repeat 16x12 => ~6.5 m tiles).
    g.strokeStyle = 'rgba(20,16,10,0.85)'; g.lineWidth = 4;
    g.strokeRect(2, 2, s - 4, s - 4);
    g.lineWidth = 2; g.strokeStyle = 'rgba(20,16,10,0.6)';
    g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.moveTo(0, s / 2); g.lineTo(s, s / 2); g.stroke();
    // Cobblestone cells (reference dusk look): index-hash shading only —
    // NEVER rng() here, the gameplay random sequence must stay byte-identical.
    const cell = 32;
    for (let ry = 0; ry < 8; ry++) {
      const off = (ry % 2) * (cell / 2);
      for (let cx = -1; cx < 9; cx++) {
        const h = (((ry * 31 + cx * 17 + 7) * 2654435761) >>> 0) % 1000 / 1000;
        g.fillStyle = h < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
        g.fillRect(cx * cell + off, ry * cell, cell - 2, cell - 2);
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.5;
        g.strokeRect(cx * cell + off + 0.5, ry * cell + 0.5, cell - 2, cell - 2);
      }
    }
  }, 16, 12);
}
function hazardTex() {
  return canvasTex(128, (g, s) => {
    g.fillStyle = '#f0a830'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#14161a';
    for (let x = -s; x < s * 2; x += 32) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 16, 0); g.lineTo(x + 16 - s, s); g.lineTo(x - s, s); g.fill();
    }
  }, 4, 1);
}
function camoTex(rng) {
  return canvasTex(256, (g, s) => {
    g.fillStyle = '#5a6b4a'; g.fillRect(0, 0, s, s);
    const blobs = ['#3d4a33', '#7a6b4a', '#2e3826', '#8a7a55'];
    for (let i = 0; i < 26; i++) {
      g.fillStyle = blobs[Math.floor(rng() * blobs.length)];
      g.globalAlpha = 0.85;
      g.beginPath();
      const cx = rng() * s, cy = rng() * s, r = 14 + rng() * 30;
      g.ellipse(cx, cy, r, r * (0.5 + rng() * 0.6), rng() * 3, 0, 7);
      g.fill();
    }
    g.globalAlpha = 1;
    speckle(g, s, 300, ['#2e3826', '#8a7a55'], 1, 2, rng);
  }, 1, 1);
}
const SKY_DUSK = { top: '#0e1424', mid: '#3a2a3a', horizon: '#e07a2a', glow: 'rgba(255,190,90,0.9)', stars: true };
function skyTex(p = SKY_DUSK) {
  return canvasTex(512, (g, s) => {
    // Canvas top (v=1) is the zenith; the visible horizon sits near v=0.5,
    // so the horizon colour must peak there — the old stops (0.62-0.72) put
    // it below the visible horizon and left the whole sky a flat mid colour.
    const grad = g.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, p.top); grad.addColorStop(0.22, p.mid);
    grad.addColorStop(0.42, p.horizon); grad.addColorStop(0.5, p.horizon);
    grad.addColorStop(0.56, '#2e241a'); grad.addColorStop(1, '#241c14');
    g.fillStyle = grad; g.fillRect(0, 0, s, s);
    // faint stars up top
    if (p.stars) {
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 90; i++) { g.fillRect(Math.random() * s, Math.random() * s * 0.35, 1.5, 1.5); }
    }
    // low sun glow — centred on the horizon band (v≈0.5), not below it
    const sun = g.createRadialGradient(s * 0.7, s * 0.5, 4, s * 0.7, s * 0.5, 120);
    sun.addColorStop(0, p.glow); sun.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = sun; g.fillRect(0, 0, s, s);
  });
}

function mat(color, rough = 0.9, map = null) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.08 });
  if (map) m.map = map;
  return m;
}

export function buildWorld(scene) {
  const rng = mulberry(1337);
  const colliders = [];
  const shootables = [];
  const doors = [];   // {x, z, hinge, angle, target, open, collider, dir}
  const levels = [];  // {x0,z0,x1,z1,y} walkable floor slabs (floor 2/3, balconies)
  const stairs = [];  // {x0,z0,x1,z1,ax,az,bx,bz,y0,y1} stair ramps
  const add = (mesh, x, z, w, d, h, solid = true) => {
    mesh.position.set(x, (mesh.position.y || 0), z);
    scene.add(mesh);
    if (solid) { colliders.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2, h, y0: 0, y1: 99, active: true }); shootables.push(mesh); }
    return mesh;
  };
  const box = (w, h, d, color, map = null) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, 0.9, map));
    m.castShadow = true; m.receiveShadow = true; return m;
  };

  // Dusk sky dome (gradient canvas, no fog on it)
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(160, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);

  // Ground — procedural concrete (tint changes per map)
  const groundMat = mat(0xffffff, 0.95, concreteTex(rng));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W + 24, D + 24), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // Dust patches
  for (let i = 0; i < 26; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(1.5 + (i % 4), 10), mat(i % 2 ? PALETTE.groundDark : 0x55483a));
    p.rotation.x = -Math.PI / 2; p.position.set(-36 + (i * 37 % 72), 0.01, -24 + (i * 29 % 48)); scene.add(p);
  }

  // ---- Map system: props / waypoints / spawns rebuilt per map ----
  // Created BEFORE the perimeter walls so the walls can use the shared
  // brick texture from props (one canvas, reused by every map).
  const props = createProps(scene, colliders, shootables, doors, levels, stairs);

  // Perimeter walls (h 4) — red brick (shared props texture, one canvas).
  const wallTex = props.brickTexture();
  const wallM = mat(0xffffff, 0.85, wallTex);
  const mkWall = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 4, d), wallM); m.position.y = 2; m.castShadow = true; m.receiveShadow = true; add(m, x, z, w, d, 4); };
  mkWall(W, 1, 0, -28.5); mkWall(W, 1, 0, 28.5); mkWall(1, D, -40.5, 0); mkWall(1, D, 40.5, 0);
  // Wall trim stripe — hazard
  const trim = new THREE.Mesh(new THREE.BoxGeometry(W, 0.25, 1.1), mat(0xffffff, 0.6, hazardTex()));
  trim.position.set(0, 3.6, -28.5); scene.add(trim);

  // Site rings (flat rings on the ground) + site posts — A, B and C (Domination)
  for (const key of ['A', 'B', 'C']) {
    const s = SITES[key];
    const ring = new THREE.Mesh(new THREE.RingGeometry(s.r - 0.35, s.r, 40),
      new THREE.MeshBasicMaterial({ color: s.color, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(s.x, 0.03, s.z); scene.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(s.r - 0.4, 32),
      new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.10 }));
    disc.rotation.x = -Math.PI / 2; disc.position.set(s.x, 0.02, s.z); scene.add(disc);
    const post = box(0.5, 3, 0.5, s.color); post.position.y = 1.5; add(post, s.x + s.r + 0.6, s.z, 0.5, 0.5, 3);
  }

  // BR shrinking-zone ring (hidden unless BR mode)
  const brRing = new THREE.Mesh(
    new THREE.RingGeometry(0.96, 1, 64),
    new THREE.MeshBasicMaterial({ color: 0xff5a4d, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  );
  brRing.rotation.x = -Math.PI / 2; brRing.position.set(0, 0.05, 0); brRing.visible = false;
  scene.add(brRing);

  // Lights: dusk hemisphere + low sun + site glows
  const hemi = new THREE.HemisphereLight(0x9a8a76, 0x3a2f22, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb45e, 2.4);
  sun.position.set(-30, 38, 20); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 35, bottom: -35, near: 1, far: 120 });
  // The projection must be rebuilt after changing the camera bounds —
  // without this the shadow frustum stays at the ±5 default and almost
  // nothing outside the map centre casts a shadow.
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const glowA = new THREE.PointLight(0xff7a1a, 30, 22); glowA.position.set(SITES.A.x, 3, SITES.A.z); scene.add(glowA);
  const glowB = new THREE.PointLight(0x37c8d8, 18, 20); glowB.position.set(SITES.B.x, 3, SITES.B.z); scene.add(glowB);
  const glowM = new THREE.PointLight(0xffa040, 20, 18); glowM.position.set(0, 2, 4); scene.add(glowM);

  // ---- Map system: props / waypoints / spawns rebuilt per map ----
  // (props created above, before the perimeter walls, for brickTexture)
  const waypoints = [...WAYPOINTS];
  const spawns = { player: { ...SPAWNS.player }, bots: SPAWNS.bots.map(s => ({ ...s })) };
  let mapId = 'foundry';
  function setGroundTint(color) { groundMat.color.setHex(color); }
  function setFogTint(color) { if (scene.fog) scene.fog.color.setHex(color); }
  function buildMap(id) {
    const def = MAP_DEFS[id] || MAP_DEFS.foundry;
    props.clear();
    mapId = def.id;
    def.build(props);
    props.addBirds(); // 5 birds circling overhead on every map (v18.15)
    // Bomb-site signs on the north wall (reference-style "SITE A" boards,
    // flush to the wall so they need no collider).
    props.addSiteSign(-27, -27.9, 0, 'SITE A', SITES.A.name.toUpperCase());
    props.addSiteSign(27, -27.9, 0, 'SITE B', SITES.B.name.toUpperCase());
    placeDestructibles(); // red barrels + breakable table + broken lamp (v18)
    waypoints.length = 0;
    waypoints.push(...def.waypoints);
    spawns.player = { ...def.spawns.player };
    spawns.bots = def.spawns.bots.map(s => ({ ...s }));
    setGroundTint(def.ground);
    setFogTint(def.fog);
    return def;
  }
  // Destructibles (v18): 2 red barrels + 1 breakable table + 1 flickering
  // broken lamp, auto-placed on clear spots so they never overlap a prop.
  function placeDestructibles() {
    const sp = MAP_DEFS[mapId].spawns.player;
    const clearSpot = (x, z, r) =>
      !isColliding(x, z, r, 0) && Math.hypot(x - sp.x, z - sp.z) > 4;
    const barrelSpots = [[-8, 20], [8, 20], [-20, 0], [20, 0], [0, 14], [0, -14], [-14, -14], [14, -14], [-24, 8], [24, 8], [-6, -20], [6, -20]];
    let placed = 0;
    for (const [x, z] of barrelSpots) {
      if (placed >= 2) break;
      if (clearSpot(x, z, 1.0)) { props.addRedBarrel(x, z); placed += 1; }
    }
    for (const [x, z] of [[-4, 16], [4, 16], [-16, -8], [16, -8], [0, 22], [-24, -12], [24, -12]]) {
      if (clearSpot(x, z, 1.2)) { props.addDestructible(x, z, 'table'); break; }
    }
    for (const [x, z] of [[-30, -24], [30, -24], [-30, 24], [30, 24]]) {
      if (clearSpot(x, z, 0.6)) { props.addBrokenLight(x, z); break; }
    }
    // Ammo boxes (v19.0.9): 2 green boxes, +60 reserve when approached.
    for (const [x, z] of [[-10, -16], [10, 16], [-18, 10], [18, -10]]) {
      if (clearSpot(x, z, 1.0)) { props.addAmmoBox(x, z); if (props.ammoBoxes.length >= 2) break; }
    }
    // Loot crates (BR, v20.0.2): 10 yellow crates, E to open for random loot.
    const crateSpots = [[-12, -18], [12, -18], [-24, 0], [24, 0], [-12, 18], [12, 18], [0, -22], [0, 22], [-30, -10], [30, 10]];
    let crates = 0;
    for (const [x, z] of crateSpots) {
      if (crates >= 10) break;
      if (clearSpot(x, z, 1.2)) { props.addLootCrate ? props.addLootCrate(x, z) : null; crates += 1; }
    }
    // Gas tanks + generators + lifts + escalators + mud (v19.2/v20.0).
    for (const [x, z] of [[-6, -20], [6, 20]]) if (clearSpot(x, z, 0.8)) props.addGasTank(x, z);
    for (const [x, z] of [[-26, 22], [26, -22]]) if (clearSpot(x, z, 1.0)) props.addGenerator(x, z);
    if (mapId === 'iron') { props.addEscalator(0, 18, 0); props.addLift(-24, -12); }
    if (mapId === 'ruin') { props.addLift(-22, -14); }
    if (mapId === 'harvest') { props.addMud(-20, -14, 6, 4); props.addMud(20, 14, 6, 4); }
  }
  // Circle (player/bot) vs AABB, with a vertical span check: a collider only
  // blocks when the body's [y, y+1.8] overlaps its [y0, y1].
  function isColliding(x, z, r, y = 0) {
    if (x - r < BOUNDS.minX || x + r > BOUNDS.maxX || z - r < BOUNDS.minZ || z + r > BOUNDS.maxZ) return true;
    const yTop = y + 1.8;
    for (const c of colliders) {
      if (c.active === false) continue;
      const cY0 = c.y0 ?? 0, cY1 = c.y1 ?? 99;
      if (yTop <= cY0 || y >= cY1) continue;
      if (x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1) return true;
    }
    return false;
  }
  // Ground height at (x, z) given the body's current height: stairs ramp up,
  // floor slabs hold their level, everywhere else is 0. The +0.6 slack keeps
  // a player on floor 2 from snapping down to floor 1 while standing on it.
  function groundY(x, z, curY) {
    for (const s of stairs) {
      if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) {
        const dx = s.bx - s.ax, dz = s.bz - s.az;
        const len2 = dx * dx + dz * dz || 1;
        let k = ((x - s.ax) * dx + (z - s.az) * dz) / len2;
        k = Math.max(0, Math.min(1, k));
        return s.y0 + (s.y1 - s.y0) * k;
      }
    }
    let best = 0;
    for (const L of levels) {
      if (x >= L.x0 && x <= L.x1 && z >= L.z0 && z <= L.z1 && L.y <= curY + 0.6 && L.y > best) best = L.y;
    }
    // Parkour: low props (crates, sandbags, h <= 1.4m) can be stood on —
    // only when the player is already near the top, so walking past one
    // on the ground never lifts them.
    for (const c of colliders) {
      if (!c.active || c.h > 1.4) continue;
      if (x < c.x0 - 0.1 || x > c.x1 + 0.1 || z < c.z0 - 0.1 || z > c.z1 + 0.1) continue;
      if (curY > c.h - 0.6 && curY < c.h + 0.6 && c.h > best) best = c.h;
    }
    return best;
  }
  // The collider containing a point (for the parkour vault check).
  function obstacleAt(x, z, y = 0) {
    for (const c of colliders) {
      if (c.active === false) continue;
      if (x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1) return c;
    }
    return null;
  }
  function toggleDoor(door) {
    door.open = !door.open;
    door.target = door.open ? 1.9 : 0;
    door.collider.active = !door.open;
  }
  function stepDoors(dt) {
    for (const d of doors) {
      if (Math.abs(d.angle - d.target) > 0.01) {
        d.angle += Math.sign(d.target - d.angle) * dt * 3.5;
        d.angle = Math.max(0, Math.min(1.9, d.angle));
        d.hinge.rotation.y = d.angle * d.dir;
      }
    }
  }
  buildMap('foundry');

  // Redraw the sky dome gradient for a weather palette.
  function setSky(p) {
    sky.material.map = skyTex(p);
    sky.material.needsUpdate = true;
  }
  // v24.1.7: recolor the sky dome from one hex (top darker, horizon = hex).
  function setSkyColor(hex) {
    const c = String(hex).replace('#', '');
    const shade = (f) => '#' + [0, 2, 4].map(i => Math.min(255, Math.max(0, Math.round(parseInt(c.slice(i, i + 2), 16) * f))).toString(16).padStart(2, '0')).join('');
    setSky({ top: shade(0.35), mid: shade(0.7), horizon: hex, glow: 'rgba(255,190,90,0.9)', stars: true });
  }
  function setGroundColor(hex) { setGroundTint(parseInt(String(hex).replace('#', ''), 16)); }

  return {
    colliders, shootables, sites: SITES, spawns, waypoints, bounds: BOUNDS, brRing,
    doors, levels, stairs, buildMap, isColliding, groundY, obstacleAt, toggleDoor, stepDoors,
    setGroundTint, setFogTint, setSky, setSkyColor, setGroundColor,
    skyMat: sky.material, sun, hemi,
    // v24.1 color system (delegates to props registries).
    recolor(kind, hex) { props.recolor(kind, hex); },
    setSeason(season) { props.setSeason(season); },
    setLightColor(hex) { props.setLightColor(hex); },
    animateDecor(dt, time, wind) { props.animateDecor(dt, time, wind); },
    decorCounts() { return props.decorCounts(); },
    destructibles: props.destructibles,
    ammoBoxes: props.ammoBoxes,
    lifts: props.lifts,
    mudRects: props.mudRects,
    flowerSpots: props.flowerSpots,
    lootCrates: props.lootCrates,
    bushes: props.bushes,
    containers: props.containers,
    decorTraffic: props.decorTraffic,
    interactables: props.interactables,
    setHouseLights(on) { props.setHouseLights(on); },
    // Nearest interactable (vending / ATM / phone / suitcase / cart) within 2m.
    nearestInteractable(x, z, type) {
      for (const it of props.interactables) {
        if (type && it.type !== type) continue;
        if (Math.hypot(it.x - x, it.z - z) < 2) return it;
      }
      return null;
    },
    // Nearest container within 2m (v22.3.12): E opens it.
    nearestContainer(x, z) {
      for (const c of props.containers) if (Math.hypot(c.x - x, c.z - z) < 2) return c;
      return null;
    },
    // Inside a bush (v22.3.1): bots lose you for 3s.
    inBush(x, z) {
      for (const b of props.bushes) if (Math.hypot(b.x - x, b.z - z) < 1) return true;
      return false;
    },
    setLightsOut(on) { props.setLightsOut(on); },
    propFall(mesh, dx, dz) { props.propFall(mesh, dx, dz); },
    // In a mud patch (v19.2.14): move 20% slower for 1s after leaving it.
    inMud(x, z) {
      for (const r of props.mudRects) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true;
      return false;
    },
    // Nearest lift within 3m (v19.2.15): press E to ride between floors.
    nearestLift(x, z) {
      for (const l of props.lifts) if (Math.hypot(l.x - x, l.z - z) < 3) return l;
      return null;
    },
    // Nearest unopened loot crate within 2m (BR, v20.0.2).
    nearestCrate(x, z) {
      for (const c of props.lootCrates) if (!c.opened && Math.hypot(c.x - x, c.z - z) < 2) return c;
      return null;
    },
    // Floor material at a point (v18.2.4 + v18.14): sand on the desert map,
    // wood on floor 2+, metal on the container yard, concrete elsewhere.
    groundSurface(x, z, y = 0) {
      if (mapId === 'ember') return 'sand';
      if (y > 2.5) return 'wood';
      if (mapId === 'cargo' || mapId === 'iron') return 'metal';
      return 'concrete';
    },
    // Inside a house/barn footprint (indoor reverb, v18.17).
    isIndoors(x, z) {
      for (const r of props.houseRects) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true;
      return false;
    },
    // Inside a pool (wet character, v18.3.10).
    inPool(x, z) {
      for (const r of props.pools) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true;
      return false;
    },
    // Remove a destroyed prop: mesh out of the scene + shootables, collider off.
    removeProp(rec) {
      if (!rec) return;
      for (const m of rec.meshes || []) {
        const si = shootables.indexOf(m);
        if (si >= 0) shootables.splice(si, 1);
        if (m.parent) m.parent.remove(m);
      }
      if (rec.collider) rec.collider.active = false;
      const di = props.destructibles.indexOf(rec);
      if (di >= 0) props.destructibles.splice(di, 1);
    },
    get mapId() { return mapId; },
  };
}

// 2D segment vs AABB — true only if the segment is blocked by a tall collider.
export function losClear(x0, z0, x1, z1, colliders) {
  for (const c of colliders) {
    if (c.h < 1.5) continue;
    // Slab test in 2D
    const dx = x1 - x0, dz = z1 - z0;
    let tmin = 0, tmax = 1, ok = true;
    for (const [p, d, lo, hi] of [[x0, dx, c.x0, c.x1], [z0, dz, c.z0, c.z1]]) {
      if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) { ok = false; break; } }
      else {
        let t0 = (lo - p) / d, t1 = (hi - p) / d;
        if (t0 > t1) [t0, t1] = [t1, t0];
        tmin = Math.max(tmin, t0); tmax = Math.min(tmax, t1);
        if (tmin > tmax) { ok = false; break; }
      }
    }
    if (ok) return false;
  }
  return true;
}
