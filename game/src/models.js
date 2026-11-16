// GLB models: viewmodel weapons + laggy arms + soldier bots + map props.
// Imported LAST by main.js, so it lands past the dossier text cut and costs
// 0 text bytes. All .glb files are binary assets (outside the text slice).
// Licences: weapons + arms CC-BY-4.0 (attribution in credits); soldier
// Quaternius CC0 (via Cinevva, presumed — unverified per-file); Kenney CC0;
// LowPoly vehicles reodesuxz 2026 — commercial use OK, NOT CC0; user batch
// (houses/vehicles/animals) licence presumed CC0, unverified per-file.
// AK47 is EXCLUDED (Sketchfab Standard licence, not CC-BY).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { makeNameSprite } from './characters.js';

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
// Pockets after rot.y=PI: R (0.0495,0.030,0.024), L (0.075,0.1055,-0.276).
const ARMS_POS = { x: -0.055, y: -0.11, z: -0.044 };
const ARMS_URL = 'models/arms/rigged-laggy-arms-grip.glb';

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
        armsObj.rotation.y = Math.PI;
        armsObj.position.set(ARMS_POS.x, ARMS_POS.y, ARMS_POS.z);
        noCamoDeep(armsObj);
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
export function viewmodelStates() {
  const w = {};
  for (const [id, s] of weaponState) w[id] = s.state;
  return { arms: armsState, weapons: w };
}

// ---------- 2. Soldier bots (realistic Quaternius soldier, 1 variant) ----------
const SOLDIER_URL = 'models/soldier.glb';
let soldierGLB = null, soldierState = 'idle';
export function soldierReady() { return soldierState === 'ready'; }
export async function ensureSoldier() {
  if (soldierState === 'ready') return soldierGLB;
  if (soldierState === 'loading') return loadGLB(SOLDIER_URL);
  soldierState = 'loading';
  try { soldierGLB = await loadGLB(SOLDIER_URL); soldierState = 'ready'; }
  catch (e) { soldierState = 'failed'; throw e; }
  return soldierGLB;
}
// Procedural gun held by the soldier: barrel along the character's forward (+Z).
// Tune SOLDIER_GUN_ROT from the probe render if the barrel points the wrong way.
export const SOLDIER_GUN_ROT = { x: 2.137, y: 1.373, z: -1.961 };
export function buildSoldierGun() {
  const g = new THREE.Group();
  const gunM = new THREE.MeshStandardMaterial({ color: 0x23272b, roughness: 0.45, metalness: 0.65 });
  const barrelM = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.35, metalness: 0.8 });
  const gripM = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.95 });
  const box = (w, h, d, m, x, y, z) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); q.position.set(x, y, z); q.castShadow = true; g.add(q); return q; };
  box(0.07, 0.09, 0.34, gunM, 0, 0, 0.05);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), barrelM);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.01, -0.28); barrel.castShadow = true; g.add(barrel);
  box(0.05, 0.12, 0.06, gripM, 0, -0.09, 0.1);
  box(0.055, 0.14, 0.07, gunM, 0, -0.1, -0.02);
  box(0.06, 0.09, 0.18, gunM, 0, -0.01, 0.28);
  g.rotation.set(SOLDIER_GUN_ROT.x, SOLDIER_GUN_ROT.y, SOLDIER_GUN_ROT.z);
  noCamoDeep(g);
  return g;
}
function findMeshByMaterial(parent, matName) {
  let best = null, bestY = -1e9;
  parent.traverse((o) => {
    if (!o.isMesh || !o.material || o.material.name !== matName) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const c = o.geometry.boundingBox.getCenter(new THREE.Vector3()).y;
    if (c > bestY) { bestY = c; best = o; }
  });
  return best;
}
function createSoldierModel(base, gltf) {
  const clone = cloneSkinned(gltf.scene);
  const wrap = new THREE.Group();
  wrap.rotation.y = Math.PI; // soldier faces +Z locally; the procedural bot faces -Z
  wrap.add(clone);
  const mixer = new THREE.AnimationMixer(clone);
  const clips = {};
  for (const c of gltf.animations) clips[c.name] = c;
  const bodyMesh = findMeshByMaterial(clone, 'Black');
  const headMesh = findMeshByMaterial(clone, 'Skin');
  const wristR = clone.getObjectByName('WristR');
  const gun = buildSoldierGun();
  if (wristR) wristR.add(gun);
  // Per-frame gun aim: the wrist bone twists a lot between clips (Idle_Gun
  // vs Run_Shoot differ by ~90 deg), so a fixed SOLDIER_GUN_ROT cannot keep
  // the barrel forward. Instead, every frame, aim the gun along the
  // soldier's facing (the wrapper's forward): gunLocal =
  // wristWorld^-1 * wrapWorld * rotY(pi). The gun still follows the hand's
  // position (it is parented to the wrist); only its direction is corrected.
  // It also falls with the body in the Death clip (wrapWorld rotates too).
  const _wq = new THREE.Quaternion();
  const _pq = new THREE.Quaternion();
  const _rotYPI = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  function aimGun() {
    if (!wristR || !gun) return;
    clone.updateMatrixWorld(true);
    wristR.getWorldQuaternion(_wq);
    wrap.getWorldQuaternion(_pq);
    gun.quaternion.copy(_wq.invert()).multiply(_pq).multiply(_rotYPI);
  }
  const indicator = base.parts.indicator;
  const model = {
    group: base.group, skin: base.skin, weaponId: base.weaponId, name: base.name,
    charOp: base.charOp, charSkin: base.charSkin, costume: base.costume, effect: base.effect, helmet: base.helmet,
    parts: { bodyMesh, headMesh, gun, nameSprite: base.parts.nameSprite, indicator, legL: null, legR: null, armL: null, armR: null, head: null, torso: null, backGun: null, aura: null, fxMeshes: null },
    deathT: 0, emote: null, lastHp: 100, _clip: null, _action: null, _mixer: mixer, _wrap: wrap, _clone: clone,
    setCamo() {}, setWet() {},
    setHp(hp, maxHp = 100) { this.lastHp = hp; base.setHp(hp, maxHp); },
    setAlly(ally) { base.setAlly(ally); },
    setEmote(id) { this.emote = { id, t: 0 }; },
    _play(name, loop = true) {
      if (this._clip === name && this._action) return;
      const clip = clips[name];
      if (!clip) return;
      const next = mixer.clipAction(clip);
      next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
      next.clampWhenFinished = !loop;
      if (this._action) this._action.fadeOut(0.15);
      next.reset().fadeIn(0.15).play();
      this._clip = name; this._action = next;
    },
    animate(dt, bot, time) {
      const dx = bot.x - (bot._px ?? bot.x), dz = bot.z - (bot._pz ?? bot.z);
      const speed = dt > 0 ? Math.hypot(dx, dz) / dt : 0;
      bot._px = bot.x; bot._pz = bot.z;
      if (!bot.alive) {
        this.deathT += dt;
        this._play('Death', false);
        if (base.parts.nameSprite) base.parts.nameSprite.visible = false;
        if (indicator) indicator.visible = false;
        mixer.update(dt);
        aimGun();
        return;
      }
      if (this.deathT > 0) { this.deathT = 0; this._clip = null; }
      if (base.parts.nameSprite) base.parts.nameSprite.visible = true;
      if (indicator) indicator.visible = true;
      if (bot.hp !== this.lastHp) this.setHp(bot.hp);
      if (this.emote) {
        this.emote.t += dt;
        if (this.emote.id === 'wave') this._play('Wave', false);
        if (this.emote.t > 2) { this.emote = null; this._clip = null; }
        mixer.update(dt);
        aimGun();
        return;
      }
      const shooting = (bot.burst || 0) > 0;
      if (speed > 3.2) this._play(shooting ? 'Run_Shoot' : 'Run');
      else if (speed > 0.5) this._play(shooting ? 'Run_Shoot' : 'Walk');
      else this._play(shooting ? 'Idle_Gun_Shoot' : 'Idle_Gun');
      mixer.update(dt);
      aimGun();
    },
  };
  return { model, wrap, bodyMesh, headMesh, gun };
}
export function swapBotToSoldier(bot) {
  if (soldierState !== 'ready' || !bot || !bot.mesh || !bot.mesh.model || bot.mesh.model._isSoldier) return false;
  const base = bot.mesh.model;
  const group = bot.mesh.group;
  const keep = new Set([base.parts.nameSprite, base.parts.indicator].filter(Boolean));
  for (const child of [...group.children]) if (!keep.has(child)) group.remove(child);
  const { model, wrap, bodyMesh, headMesh, gun } = createSoldierModel(base, soldierGLB);
  model._isSoldier = true;
  group.add(wrap);
  if (bodyMesh) { bodyMesh.userData = { botId: bot.id, part: 'body' }; bot.mesh.body = bodyMesh; }
  if (headMesh) { headMesh.userData = { botId: bot.id, part: 'head' }; bot.mesh.head = headMesh; }
  bot.mesh.gun = gun;
  bot.mesh.model = model;
  return true;
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
