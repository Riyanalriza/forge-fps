// GLB models: viewmodel weapons + laggy arms + map props. Bots are
// procedural construction workers (see characters.js) — the old soldier
// GLB was deleted in the 2026-11-16 bot rebuild, nothing loads it now.
// Imported LAST by main.js, so it lands past the dossier text cut and costs
// 0 text bytes. All .glb files are binary assets (outside the text slice).
// Licences: weapons + arms CC-BY-4.0 (attribution in credits); Kenney CC0;
// LowPoly vehicles reodesuxz 2026 — commercial use OK, NOT CC0; user batch
// (houses/vehicles/animals) licence presumed CC0, unverified per-file.
// AK47 is EXCLUDED (Sketchfab Standard licence, not CC-BY).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const cache = new Map();
export function loadGLB(url) {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url).catch((e) => { cache.delete(url); throw e; }));
  return cache.get(url);
}
function noCamoDeep(obj) { obj.traverse((o) => { if (o.isMesh) { o.userData.noCamo = true; o.castShadow = true; } }); }

// ---------- 1. Viewmodel weapons + laggy arms ----------
export const WEAPON_GLB = {
  m4: { file: 'models/weapons/m4.glb', targetLen: 0.84, flip: false, gripFrac: 0.30 },
  p12: { file: 'models/weapons/g17.glb', targetLen: 0.35, flip: false, gripFrac: 0.10 },
  rpg: { file: 'models/weapons/m320.glb', targetLen: 0.40, flip: true, gripFrac: 0.20 },
  qq9: { file: 'models/weapons/fmg9.glb', targetLen: 0.65, flip: false, gripFrac: 0.45 },
  kilo: { file: 'models/weapons/hcar.glb', targetLen: 1.00, flip: false, gripFrac: 0.30 },
  crossbow: { file: 'models/weapons/crossbow.glb', targetLen: 0.90, flip: false, gripFrac: 0.30 },
  katana: { file: 'models/weapons/katana.glb', targetLen: 1.05, flip: true, gripFrac: 0.08 },
};
// Pistol-grip point in gun-group space (matches the procedural gripAt z -0.02).
const GRIP_POINT = { x: 0, y: -0.08, z: -0.02 };
// Re-posed laggy arms, placed so the right pocket sits on the pistol grip.
// Pockets (file space, rotation.y=0 so file == game space): R (-0.0507,
// 0.0609,-0.33), L (-0.1107,0.0109,-0.66) — v4 (2026-11-16): left mesh
// shifted (-0.06,-0.05,0) + yaw -0.3 + pitch +0.2 about the pocket, so the
// left hand clears the receiver's bottom edge from the FP camera (v3 sat
// dead-centre behind it) AND the forearm angles down-left like a real
// support arm instead of paralleling the gun (a plain shift read as a
// second barrel). Right pocket untouched. Fingers REALLY curled (tight
// R 0.07/0.08 around the grip/forend). Mounting is rotation.y=0 (NOT PI):
// file fingers point -Z = forward along the gun, elbows +Z = toward the
// camera. PI flipped both the fingers (toward the camera) and left/right.
const ARMS_POS = { x: 0.0507, y: -0.1409, z: 0.31 };
const ARMS_URL = 'models/arms/rigged-laggy-arms-grip.glb';
// Left-hand pocket in arms FILE space (the B2 re-pose pocket).
const LEFT_POCKET_FILE = { x: -0.1107, y: 0.0109, z: -0.66 };
// Per-weapon LEFT-arm offset (armsObj space, left mesh only; the right
// mesh never moves — its grip is correct for every weapon). The arms are
// one rigid object with a fixed 0.33 grip-to-forend span, so short weapons
// leave the left hand floating past the muzzle/blade: the G17's muzzle is
// at z≈-0.25 and the katana's handle ends at z≈-0.20, while the left
// pocket sits at z=-0.35. Both read as a detached hand in the FP render
// (2026-11-16 probe). Shift the left arm back toward the grip: p12
// supports the pistol grip from the front-below; katana grips the lower
// handle two-handed. All other weapons keep offset 0 (probe-verified).
const LEFT_ARM_OFFSET = {
  p12: { x: 0, y: 0, z: 0.27 },
  katana: { x: 0, y: 0.03, z: 0.23 },
};
let leftArmMesh = null;
// Left pocket in handsGroup space (ARMS_POS + file pocket + per-weapon
// mesh offset). Null until the arms GLB loads.
export function leftArmPocket() {
  if (!leftArmMesh) return null;
  return {
    x: ARMS_POS.x + LEFT_POCKET_FILE.x + leftArmMesh.position.x,
    y: ARMS_POS.y + LEFT_POCKET_FILE.y + leftArmMesh.position.y,
    z: ARMS_POS.z + LEFT_POCKET_FILE.z + leftArmMesh.position.z,
  };
}

let armsObj = null, armsState = 'idle';
const weaponState = new Map();
let viewmodelNotify = null;
export function onViewmodelReady(fn) { viewmodelNotify = fn; }

function orientWeapon(obj, targetLen, flip) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3(); box.getSize(size);
  const axes = ['x', 'y', 'z'];
  const longest = axes.reduce((a, b) => (size[a] >= size[b] ? a : b));
  if (longest === 'x') obj.rotation.y = Math.PI / 2;
  else if (longest === 'y') obj.rotation.x = Math.PI / 2;
  if (flip) obj.rotation.y += Math.PI;
  obj.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(obj);
  const size2 = new THREE.Vector3(); box2.getSize(size2);
  const len = Math.max(size2.x, size2.y, size2.z);
  obj.scale.setScalar(targetLen / len);
  obj.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(obj);
}

function buildWeaponWrapper(id) {
  const def = WEAPON_GLB[id];
  const st = weaponState.get(id);
  const obj = st.gltf.scene;
  const box = orientWeapon(obj, def.targetLen, def.flip);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  const gripLocal = new THREE.Vector3(center.x, box.min.y + 0.35 * size.y, box.max.z - size.z * def.gripFrac);
  const wrapper = new THREE.Group();
  wrapper.add(obj);
  wrapper.position.set(GRIP_POINT.x - gripLocal.x, GRIP_POINT.y - gripLocal.y, GRIP_POINT.z - gripLocal.z);
  noCamoDeep(wrapper);
  const tip = new THREE.Object3D();
  tip.position.set(center.x, box.min.y + 0.65 * size.y, box.min.z);
  wrapper.add(tip);
  st.wrapper = wrapper; st.tip = tip; st.state = 'ready';
}

let viewmodelPromise = null;
export function ensureViewmodelAssets() {
  // One shared promise: weapon.js also calls this during boot, and main.js
  // calls it again for the shot preload. A second call must wait for the
  // loads the first call started (not return early with an empty job list,
  // which left the slowest .glb — katana, 2.3 MB — still 'loading' when the
  // self-test ran).
  if (viewmodelPromise) return viewmodelPromise;
  viewmodelPromise = (async () => {
    const jobs = [];
    if (armsState === 'idle') {
      armsState = 'loading';
      jobs.push(loadGLB(ARMS_URL).then((g) => {
        armsObj = g.scene;
        armsObj.rotation.y = 0; // v3 re-pose: file fingers already point -Z (forward); PI flipped them toward the camera + swapped left/right
        armsObj.position.set(ARMS_POS.x, ARMS_POS.y, ARMS_POS.z);
        noCamoDeep(armsObj);
        // Identify the LEFT mesh (its bbox centre z is more negative — the
        // forward hand on the forend) so attachViewmodel can shift it per
        // weapon without touching the right hand.
        let best = null, bestZ = Infinity;
        armsObj.traverse((o) => {
          if (!o.isMesh || !o.geometry) return;
          o.geometry.computeBoundingBox();
          const z = o.geometry.boundingBox.getCenter(new THREE.Vector3()).z;
          if (z < bestZ) { bestZ = z; best = o; }
        });
        leftArmMesh = best;
        armsState = 'ready';
        if (viewmodelNotify) viewmodelNotify('__arms__');
      }).catch(() => { armsState = 'failed'; }));
    }
    for (const id of Object.keys(WEAPON_GLB)) {
      if (!weaponState.has(id)) {
        weaponState.set(id, { state: 'loading' });
        jobs.push(loadGLB(WEAPON_GLB[id].file).then((g) => {
          const st = weaponState.get(id);
          st.gltf = g;
          buildWeaponWrapper(id);
          if (viewmodelNotify) viewmodelNotify(id);
        }).catch(() => { weaponState.get(id).state = 'failed'; }));
      }
    }
    await Promise.allSettled(jobs);
  })();
  return viewmodelPromise;
}

export function attachViewmodel(hands, weaponId) {
  if (armsState === 'ready' && armsObj && !armsObj.parent) {
    if (hands.parts.procHands) hands.parts.procHands.visible = false;
    hands.parts.handsGroup.add(armsObj);
  }
  // Per-weapon left-arm placement (reset first — the mesh is shared).
  if (leftArmMesh) {
    const off = LEFT_ARM_OFFSET[weaponId] || { x: 0, y: 0, z: 0 };
    leftArmMesh.position.set(off.x, off.y, off.z);
  }
  const def = WEAPON_GLB[weaponId];
  if (!def) return;
  const st = weaponState.get(weaponId);
  if (!st || st.state !== 'ready') return;
  const gun = hands.gun;
  while (gun.children.length) gun.remove(gun.children[0]);
  gun.add(st.wrapper);
  gun.userData.tip = st.tip;
  gun.userData.mag = null;
}
export function viewmodelReady() { return armsState === 'ready' && [...weaponState.values()].every((s) => s.state === 'ready'); }
// Arms-mount report for the self-test (§45): proves the v3 re-pose from the
// LOADED geometry, not from constants. Per hand mesh: mean position and the
// mean position of the cream-UV verts (u>0.75 = fingertips), both in
// handsGroup space (armsObj local matrix applied). A curled hand displaces
// its fingertips toward the palm: right hand -X (inward), left hand +Y
// (up). A flat hand (v1/original) has ~0 displacement on both axes.
// The hand whose local bbox centre z is more negative is the LEFT hand
// (forward, on the forend); the other is the RIGHT hand (on the grip).
export function armsMountReport() {
  if (armsState !== 'ready' || !armsObj) return null;
  armsObj.updateMatrixWorld(true);
  const m = armsObj.matrix; // local: rotation.y + ARMS_POS, vs handsGroup
  const hands = [];
  armsObj.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position) return;
    const pos = o.geometry.attributes.position;
    const uv = o.geometry.attributes.uv;
    const n = pos.count;
    let sx = 0, sy = 0, sz = 0, cx = 0, cy = 0, cz = 0, cn = 0;
    let mnx = Infinity, mxx = -Infinity, mnz = Infinity, mxz = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      // apply armsObj local matrix (rotation + ARMS_POS) by hand
      const wx = m.elements[0] * x + m.elements[4] * y + m.elements[8] * z + m.elements[12];
      const wy = m.elements[1] * x + m.elements[5] * y + m.elements[9] * z + m.elements[13];
      const wz = m.elements[2] * x + m.elements[6] * y + m.elements[10] * z + m.elements[14];
      sx += wx; sy += wy; sz += wz;
      if (wx < mnx) mnx = wx; if (wx > mxx) mxx = wx;
      if (wz < mnz) mnz = wz; if (wz > mxz) mxz = wz;
      if (uv && uv.getX(i) > 0.75) { cx += wx; cy += wy; cz += wz; cn++; }
    }
    hands.push({ mean: [sx / n, sy / n, sz / n], cream: cn ? [cx / cn, cy / cn, cz / cn] : null,
      creamN: cn, zC: (mnz + mxz) / 2, xC: (mnx + mxx) / 2 });
  });
  if (hands.length < 2) return null;
  hands.sort((a, b) => a.zC - b.zC); // most negative z first = LEFT (forward)
  const [L, R] = hands;
  return {
    ready: true, rotY: armsObj.rotation.y,
    pos: [armsObj.position.x, armsObj.position.y, armsObj.position.z],
    left: { zC: L.zC, creamDX: L.cream ? L.cream[0] - L.mean[0] : 0, creamDY: L.cream ? L.cream[1] - L.mean[1] : 0 },
    right: { zC: R.zC, creamDX: R.cream ? R.cream[0] - R.mean[0] : 0, creamDY: R.cream ? R.cream[1] - R.mean[1] : 0 },
  };
}
export function viewmodelStates() {
  const w = {};
  for (const [id, s] of weaponState) w[id] = s.state;
  return { arms: armsState, weapons: w };
}

// ---------- 3. Map props (decoration only, no colliders) ----------
let propGen = 0;
export function nextPropGen() { return ++propGen; }
export function propGenNow() { return propGen; }
export function placePropGLB(parent, url, x, z, opts = {}) {
  const gen = opts.gen;
  loadGLB(url).then((gltf) => {
    if (gen !== undefined && gen !== propGen) return;
    const obj = cloneSkinned(gltf.scene);
    obj.position.set(x, opts.y || 0, z);
    if (opts.yaw) obj.rotation.y = opts.yaw;
    if (opts.rx) obj.rotation.x = opts.rx;
    if (opts.scale) obj.scale.setScalar(opts.scale);
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    parent.add(obj);
  }).catch(() => {});
}
export async function ensurePropAssets(urls) {
  await Promise.allSettled(urls.map((u) => loadGLB(u)));
}
// Every GLB url used by maps.js (generated from the addGLB calls, so the
// shot preload covers exactly what the maps place). Keep in sync.
export const ALL_PROP_URLS = [
  'models/kenney/buildings/building.glb',
  'models/kenney/buildings/graveyard/coffin.glb',
  'models/kenney/buildings/graveyard/crypt.glb',
  'models/kenney/buildings/industrial/chimney.glb',
  'models/kenney/buildings/industrial/factory.glb',
  'models/kenney/buildings/industrial/tank.glb',
  'models/kenney/buildings/industrial/watertower.glb',
  'models/kenney/buildings/skyscraper.glb',
  'models/kenney/buildings/suburban/house-a.glb',
  'models/kenney/buildings/suburban/house-d.glb',
  'models/kenney/buildings/suburban/house-g.glb',
  'models/kenney/nature/graveyard/haybale.glb',
  'models/kenney/nature/graveyard/pine-dead.glb',
  'models/kenney/nature/palm.glb',
  'models/kenney/nature/suburban/tree-large.glb',
  'models/kenney/nature/suburban/tree-small.glb',
  'models/kenney/props/factory/conveyor.glb',
  'models/kenney/props/graveyard/gravestone.glb',
  'models/kenney/props/lampPost.glb',
  'models/kenney/props/shop/cash-register.glb',
  'models/kenney/props/shop/market-bread.glb',
  'models/kenney/props/shop/market-fruit.glb',
  'models/lowpoly/ambulance.glb',
  'models/lowpoly/bicycle.glb',
  'models/lowpoly/car_police.glb',
  'models/lowpoly/car_taxi.glb',
  'models/lowpoly/city_bus.glb',
  'models/lowpoly/fire_truck.glb',
  'models/lowpoly/forklift.glb',
  'models/lowpoly/motorbike.glb',
  'models/lowpoly/school_bus.glb',
  'models/lowpoly/scooter.glb',
  'models/user/Building1_Small_47_2o6l.glb',
  'models/user/House1_41_skda.glb',
  'models/user/House2_39_vypb.glb',
  'models/user/animals/Cow_51_ek9q.glb',
  'models/user/animals/Pig_52_dqpm.glb',
  'models/user/animals/Pug_49_ye3e.glb',
  'models/user/animals/Sheep_50_c304.glb',
];
