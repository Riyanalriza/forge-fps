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
// Bot team gear (frost pass): procedural helmet + backpack + chest
// pouches + shoulder pads clipped onto the soldier GLB — the .glb file
// itself is never modified. Enemy team = orange, revived allies = teal
// (recoloured by the soldier model's setAlly). Positions come from the
// bind-pose bounding boxes of the head/body meshes, in wrap space (the
// clone sits at the wrap origin, front = +Z there, back = -Z).
const TEAM_ORANGE = 0xff7a1a, TEAM_TEAL = 0x2fd8c8;
function buildSoldierGear(wrap, headMesh, bodyMesh) {
  const gear = new THREE.Group();
  const teamMat = new THREE.MeshStandardMaterial({ color: TEAM_ORANGE, roughness: 0.6, metalness: 0.2 });
  const packMat = new THREE.MeshStandardMaterial({ color: 0x5a5a3a, roughness: 0.9 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a22, roughness: 0.9 });
  const box = (w, h, d, m, x, y, z) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); q.position.set(x, y, z); q.castShadow = true; gear.add(q); return q; };
  let headX = 0, headY = 1.62, headZ = 0, chestY = 1.15, shoulderY = 1.48;
  if (headMesh && headMesh.geometry) {
    headMesh.geometry.computeBoundingBox();
    const c = headMesh.geometry.boundingBox.getCenter(new THREE.Vector3());
    headX = c.x; headY = c.y; headZ = c.z;
  }
  if (bodyMesh && bodyMesh.geometry) {
    bodyMesh.geometry.computeBoundingBox();
    const b = bodyMesh.geometry.boundingBox;
    chestY = (b.max.y + b.min.y) / 2; shoulderY = b.max.y;
  }
  // Helmet: dome + brim, team colour.
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), teamMat);
  helm.position.set(headX, headY + 0.02, headZ); helm.scale.y = 0.8; helm.castShadow = true; gear.add(helm);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.025, 14), teamMat);
  brim.position.set(headX, headY + 0.01, headZ); brim.castShadow = true; gear.add(brim);
  // Backpack: khaki pack + team-colour top roll, on the back (-Z).
  box(0.42, 0.52, 0.2, packMat, 0, chestY, -0.27);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.44, 10), teamMat);
  roll.rotation.z = Math.PI / 2; roll.position.set(0, chestY + 0.29, -0.27); roll.castShadow = true; gear.add(roll);
  // Shoulder pads, team colour.
  box(0.17, 0.07, 0.22, teamMat, -0.25, shoulderY, 0);
  box(0.17, 0.07, 0.22, teamMat, 0.25, shoulderY, 0);
  // Chest pouches (front, +Z) with team-colour flaps + one belt pouch.
  box(0.13, 0.17, 0.09, darkMat, -0.12, chestY, 0.2);
  box(0.13, 0.17, 0.09, darkMat, 0.12, chestY, 0.2);
  box(0.13, 0.05, 0.095, teamMat, -0.12, chestY + 0.1, 0.2);
  box(0.13, 0.05, 0.095, teamMat, 0.12, chestY + 0.1, 0.2);
  box(0.15, 0.12, 0.1, darkMat, 0.18, chestY - 0.2, 0.19);
  noCamoDeep(gear);
  wrap.add(gear);
  return {
    group: gear, helmet: helm, headY,
    setTeam(ally) { teamMat.color.setHex(ally ? TEAM_TEAL : TEAM_ORANGE); },
    get teamHex() { return teamMat.color.getHex(); },
  };
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
  const gear = buildSoldierGear(wrap, headMesh, bodyMesh);
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
    setAlly(ally) { base.setAlly(ally); if (gear) gear.setTeam(ally); },
    _gear: gear,
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
        // A prone/crouched bot falls flat (v28): reset the stance tilt so
        // the Death clip lands on the floor instead of a tilted body.
        this._wrap.position.y = 0; this._wrap.rotation.x = 0;
        if (base.parts.nameSprite) base.parts.nameSprite.visible = false;
        if (indicator) indicator.visible = false;
        mixer.update(dt);
        aimGun();
        return;
      }
      if (this.deathT > 0) { this.deathT = 0; this._clip = null; }
      // Prone / crouch posture (v28): the soldier has no prone clip, so the
      // stance is the whole body pitched forward on its feet — lying flat
      // for prone, a deep lean for crouch. The hit meshes ride along, so
      // the smaller target is real, not just visual. This also finally
      // shows the old low-HP crouch on the soldier (it used to be invisible
      // — only the procedural model bent its legs).
      if (bot.prone) { this._wrap.position.y = 0; this._wrap.rotation.x = -1.35; }
      else if (bot.crouch) { this._wrap.position.y = -0.1; this._wrap.rotation.x = -0.45; }
      else { this._wrap.position.y = 0; this._wrap.rotation.x = 0; }
      if (base.parts.nameSprite) base.parts.nameSprite.position.y = bot.prone ? 0.9 : 2.15;
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
