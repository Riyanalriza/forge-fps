// FOUNDRY YARD — original industrial map, ~80 x 56. Colliders are AABBs {x0,z0,x1,z1,h}.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const W = 80, D = 56; // x in [-40,40], z in [-28,28]
export const BOUNDS = { minX: -39, maxX: 39, minZ: -27, maxZ: 27 };
export const SITES = {
  A: { name: 'Furnace', x: -27, z: -19, r: 4.5, color: 0xf0a830 },
  B: { name: 'Crane Yard', x: 27, z: -19, r: 4.5, color: 0x37c8d8 },
};
export const SPAWNS = {
  player: { x: 0, z: 24, yaw: 0 }, // yaw 0 faces -z (north, toward the yard)
  bots: [
    { x: -14, z: -24 }, { x: -4, z: -25 }, { x: 6, z: -25 }, { x: 16, z: -24 }, { x: 0, z: -20 },
  ],
};
// Patrol waypoint graph (small loop routes through mid and both sites).
export const WAYPOINTS = [
  { x: -30, z: -8 }, { x: -30, z: 8 }, { x: -12, z: 14 }, { x: 0, z: 6 },
  { x: 12, z: 14 }, { x: 30, z: 8 }, { x: 30, z: -8 }, { x: 14, z: -8 },
  { x: -14, z: -8 }, { x: 0, z: -14 }, { x: -27, z: -19 }, { x: 27, z: -19 },
  { x: -20, z: 20 }, { x: 20, z: 20 }, { x: 0, z: 20 },
];

function mat(color, rough = 0.9) { return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.08 }); }

export function buildWorld(scene) {
  const colliders = [];
  const shootables = [];
  const add = (mesh, x, z, w, d, h, solid = true) => {
    mesh.position.set(x, (mesh.position.y || 0), z);
    scene.add(mesh);
    if (solid) { colliders.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2, h }); shootables.push(mesh); }
    return mesh;
  };
  const box = (w, h, d, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.castShadow = true; m.receiveShadow = true; return m;
  };

  // Ground + dusk sky
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W + 24, D + 24), mat(PALETTE.ground));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // Dust patches
  for (let i = 0; i < 26; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(1.5 + (i % 4), 10), mat(i % 2 ? PALETTE.groundDark : 0x55483a));
    p.rotation.x = -Math.PI / 2; p.position.set(-36 + (i * 37 % 72), 0.01, -24 + (i * 29 % 48)); scene.add(p);
  }

  // Perimeter walls (h 4)
  const wallM = mat(PALETTE.wall);
  const mkWall = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 4, d), wallM); m.position.y = 2; m.castShadow = true; m.receiveShadow = true; add(m, x, z, w, d, 4); };
  mkWall(W, 1, 0, -28.5); mkWall(W, 1, 0, 28.5); mkWall(1, D, -40.5, 0); mkWall(1, D, 40.5, 0);
  // Wall trim stripe
  const trim = new THREE.Mesh(new THREE.BoxGeometry(W, 0.25, 1.1), mat(PALETTE.amber, 0.6));
  trim.position.set(0, 3.6, -28.5); scene.add(trim);

  // Central foundry building (the big block mid-map, with a gap lane either side)
  const foundry = box(16, 7, 10, PALETTE.wallDark); foundry.position.y = 3.5; add(foundry, 0, -2, 16, 10, 7);
  const roof = box(17, 0.6, 11, PALETTE.rust); roof.position.y = 7.2; add(roof, 0, -2, 17, 11, 0.6);
  // Chimneys
  for (const cx of [-5, 5]) {
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 9, 10), mat(PALETTE.steelDark));
    ch.position.set(cx, 9, -4); ch.castShadow = true; scene.add(ch); shootables.push(ch);
    colliders.push({ x0: cx - 1, z0: -5, x1: cx + 1, z1: -3, h: 13 });
  }
  // Furnace glow mouth on the foundry's south face
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.2), new THREE.MeshBasicMaterial({ color: 0xff7a1a }));
  mouth.position.set(0, 1.4, 3.05); scene.add(mouth);

  // Shipping containers — lanes and cover
  const cont = (x, z, w, d, color, rot = 0) => {
    const m = box(w, 2.6, d, color); m.position.y = 1.3; m.rotation.y = rot;
    const hw = rot ? d : w, hd = rot ? w : d;
    add(m, x, z, hw, hd, 2.6);
    const lid = box(w * 0.98, 0.15, d * 0.98, PALETTE.steelDark); lid.position.y = 2.65; lid.rotation.y = rot; scene.add(lid); lid.position.x = x; lid.position.z = z;
  };
  cont(-20, 2, 6, 2.5, PALETTE.containerA); cont(-20, 6, 6, 2.5, PALETTE.containerB, 0);
  cont(20, 2, 6, 2.5, PALETTE.containerB); cont(20, -10, 2.5, 6, PALETTE.containerC, 0);
  cont(-32, -12, 6, 2.5, PALETTE.containerC); cont(32, 4, 6, 2.5, PALETTE.containerA);
  cont(-8, -16, 2.5, 6, PALETTE.containerA, 0); cont(10, 12, 6, 2.5, PALETTE.teal);
  cont(-34, 16, 2.5, 6, PALETTE.containerB, 0); cont(34, -14, 2.5, 6, PALETTE.containerB, 0);
  // Stacked container pair (climbable-looking cover, still solid)
  cont(14, -20, 6, 2.5, PALETTE.containerA);
  const top = box(6, 2.6, 2.5, PALETTE.containerC); top.position.y = 3.9; add(top, 14, -20, 6, 2.5, 5.2);

  // Crates — low cover (h 1.1, blocks movement, not sight over the top)
  const crate = (x, z, s = 1.6) => { const m = box(s, 1.1, s, PALETTE.crate); m.position.y = 0.55; add(m, x, z, s, s, 1.1); };
  crate(-12, 8); crate(-11, 8, 1.2); crate(12, 6); crate(0, 14); crate(-4, -12, 1.2);
  crate(24, 12); crate(-24, -2); crate(6, -14); crate(-27, -10, 1.3); crate(27, -10, 1.3);
  crate(-16, 20); crate(16, 20); crate(0, -22);

  // Crane at Site B — two legs + beam (beam high, legs solid)
  for (const lx of [22, 32]) {
    const leg = box(0.8, 8, 0.8, PALETTE.amber); leg.position.y = 4; add(leg, lx, -19, 0.8, 0.8, 8);
  }
  const beam = box(12, 0.8, 0.8, PALETTE.amber); beam.position.y = 8; scene.add(beam); beam.position.x = 27; beam.position.z = -19;
  const hook = new THREE.Mesh(new THREE.BoxGeometry(1, 1.4, 1), mat(PALETTE.steelDark));
  hook.position.set(27, 6.5, -19); scene.add(hook);

  // Site rings (flat rings on the ground) + site posts
  for (const key of ['A', 'B']) {
    const s = SITES[key];
    const ring = new THREE.Mesh(new THREE.RingGeometry(s.r - 0.35, s.r, 40),
      new THREE.MeshBasicMaterial({ color: s.color, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(s.x, 0.03, s.z); scene.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(s.r - 0.4, 32),
      new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.10 }));
    disc.rotation.x = -Math.PI / 2; disc.position.set(s.x, 0.02, s.z); scene.add(disc);
    const post = box(0.5, 3, 0.5, s.color); post.position.y = 1.5; add(post, s.x + s.r + 0.6, s.z, 0.5, 0.5, 3);
  }

  // Lights: dusk hemisphere + low sun + site glows
  scene.add(new THREE.HemisphereLight(0x9a8a76, 0x3a2f22, 1.5));
  const sun = new THREE.DirectionalLight(0xffb45e, 2.4);
  sun.position.set(-30, 38, 20); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 35, bottom: -35, far: 120 });
  scene.add(sun);
  const glowA = new THREE.PointLight(0xff7a1a, 30, 22); glowA.position.set(SITES.A.x, 3, SITES.A.z); scene.add(glowA);
  const glowB = new THREE.PointLight(0x37c8d8, 18, 20); glowB.position.set(SITES.B.x, 3, SITES.B.z); scene.add(glowB);
  const glowM = new THREE.PointLight(0xffa040, 20, 18); glowM.position.set(0, 2, 4); scene.add(glowM);

  return { colliders, shootables, sites: SITES, spawns: SPAWNS, waypoints: WAYPOINTS, bounds: BOUNDS };
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
