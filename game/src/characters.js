// Characters: full bot models, operators, character skins, first-person hands.
// Single-player: "other players" are bots. All designs are original — the
// operator names are NOT the COD ones (Ghost/Soap/Price/Mara/Nikto).
import * as THREE from 'three';
import { PALETTE } from './palette.js';

// Weapon skins (the gun's look + mythic aura), varied per bot at spawn.
export const BOT_SKINS = ['default', 'gold', 'neon', 'crimson', 'frost'];
export const BOT_WEAPONS = ['ax117', 'kb50', 'vx9', 'mp5'];
export const BOT_WEAPON_NAMES = { ax117: 'AX-117', kb50: 'KB-50', vx9: 'VX-9', mp5: 'MP5' };
const WEAPON_SKIN = {
  default: { body: 0x2b2f33, glow: 0x222222, fx: null },
  gold: { body: 0xc9a227, glow: 0xffd700, fx: 'gold' },
  neon: { body: 0x0a2a1a, glow: 0x00ff88, fx: 'neon' },
  crimson: { body: 0x4a0a0a, glow: 0xff2233, fx: 'crimson' },
  frost: { body: 0x9fc8d8, glow: 0xaaeeff, fx: 'frost' },
};

// Character operators (the person, not the skill): 6 original names.
export const CHAR_OPERATORS = {
  specter: { name: 'Specter', gender: 'male', emoji: '💀', mask: 'skull', vest: 'black', desc: 'Topeng tengkorak hitam, vest hitam. Hantu yang tak pernah terlihat.' },
  blade: { name: 'Blade', gender: 'male', emoji: '🧔', beard: true, cap: true, desc: 'Jenggot lebat dan topi lapangan. Veteran yang tajam.' },
  captain: { name: 'Captain', gender: 'male', emoji: '🎖️', beret: true, mustache: true, desc: 'Baret miring dan kumis. Pemimpin yang tenang di tengah tembakan.' },
  viper: { name: 'Viper', gender: 'female', emoji: '🐍', hair: 'long-black', desc: 'Rambut panjang hitam. Cepat, sunyi, mematikan.' },
  scout: { name: 'Scout', gender: 'female', emoji: '🕶️', glasses: true, hair: 'brown', desc: 'Kacamata dan rambut coklat. Mata tim yang tak pernah berkedip.' },
  skull: { name: 'Skull', gender: 'male', emoji: '☠️', mask: 'skull-white', desc: 'Topeng tengkorak putih. Wajah terakhir yang kau lihat.' },
};
export const CHAR_OPERATOR_IDS = Object.keys(CHAR_OPERATORS);

// Character skins (the outfit, NOT the weapon): 6.
export const CHAR_SKINS = {
  default: { name: 'Default', desc: 'Seragam tempur standar.', body: 0x4a5240, trim: 0x2e332a },
  ghillie: { name: 'Ghillie', desc: 'Daun-daun menutupi badan — nyaris tak terlihat di semak.', body: 0x3d5230, leaves: true },
  samurai: { name: 'Samurai', desc: 'Katana di punggung. Kehormatan di setiap tembakan.', body: 0x5a2a2a, katana: true },
  zombie: { name: 'Zombie', desc: 'Kulit hijau, seragam robek. Sudah mati, masih menembak.', body: 0x3a4a2a, zombie: true },
  gold: { name: 'Gold Suit', desc: 'Setelan emas berkilau. Kemenangan yang bisa dilihat.', body: 0xc9a227, gold: true },
  stealth: { name: 'Stealth', desc: 'Hitam pekat dari ujung kepala sampai kaki.', body: 0x111114, stealth: true },
};
export const CHAR_SKIN_IDS = Object.keys(CHAR_SKINS);

// Costume shop database (v18.7.4): one shop, one database — a costume is a
// full set (colors + helmet + backpack + effect + camo) that layers over the
// operator + character skin. Bought with coins, equipped from the shop.
// Rarity: Common / Rare / Epic / Legendary. Camo only works on its map.
export const COSTUME_DEFS = {
  default: { name: 'Default', rarity: 'Common', price: 0, gender: 'any', colors: { shirt: 0x4a5240, pants: 0x3a4030, shoes: 0x1c1e20 }, helmet: 'none', backpack: true, effect: 'none', camo: null, desc: 'Seragam tempur standar.' },
  desert: { name: 'Desert Camo', rarity: 'Rare', price: 600, gender: 'any', colors: { shirt: 0xa88a5a, pants: 0x8a6a3a, shoes: 0x6b4a2a }, helmet: 'brim', backpack: true, effect: 'none', camo: 'sand', desc: 'Kamuflase gurun — menyatu dengan Ember Market.' },
  snow: { name: 'Snow Camo', rarity: 'Rare', price: 600, gender: 'any', colors: { shirt: 0xd8e0e8, pants: 0xb8c8d8, shoes: 0x8a9ab0 }, helmet: 'hood', backpack: true, effect: 'none', camo: 'snow', desc: 'Putih salju — menghilang saat salju turun.' },
  forest: { name: 'Forest Camo', rarity: 'Rare', price: 600, gender: 'any', colors: { shirt: 0x3d5230, pants: 0x2a3a1a, shoes: 0x1c2410 }, helmet: 'combat', backpack: true, effect: 'none', camo: 'forest', desc: 'Daun hutan — menyatu dengan Harvest Town.' },
  night: { name: 'Night Camo', rarity: 'Epic', price: 900, gender: 'any', colors: { shirt: 0x1a1a22, pants: 0x14141c, shoes: 0x0a0a0a }, helmet: 'nvg', backpack: false, effect: 'none', camo: 'night', desc: 'Hitam malam + night vision — bayangan di kegelapan.' },
  huntress: { name: 'Huntress', rarity: 'Epic', price: 1200, gender: 'female', colors: { shirt: 0x2a4a2a, pants: 0x1a2a1a, shoes: 0x0a0a0a }, helmet: 'hood', backpack: true, effect: 'none', camo: 'forest', desc: 'Pemburu hutan. Cepat, sunyi, tak terlihat.' },
  empress: { name: 'Empress', rarity: 'Legendary', price: 2200, gender: 'female', colors: { shirt: 0x6a1a2a, pants: 0x4a1220, shoes: 0xc9a227 }, helmet: 'crown', backpack: false, effect: 'gold', camo: null, desc: 'Mahkota emas dan kilau kemenangan.' },
  dragon: { name: 'Dragon Legend', rarity: 'Legendary', price: 2000, gender: 'any', colors: { shirt: 0x4a0a0a, pants: 0x2a0505, shoes: 0x1a1a1a }, helmet: 'horns', backpack: true, effect: 'fire', camo: null, desc: 'Api naga membakar di bahu. Legenda hidup.' },
  void: { name: 'Void Legend', rarity: 'Legendary', price: 2000, gender: 'any', colors: { shirt: 0x2a0a3a, pants: 0x1a0525, shoes: 0x0a0a12 }, helmet: 'hood', backpack: true, effect: 'void', camo: null, desc: 'Orb void mengorbit di sekelilingmu.' },
  gold: { name: 'Gold Legend', rarity: 'Legendary', price: 1800, gender: 'any', colors: { shirt: 0xc9a227, pants: 0x8a6a10, shoes: 0x5a4008 }, helmet: 'crown', backpack: false, effect: 'gold', camo: null, desc: 'Setelan emas berkilau dari ujung kepala sampai kaki.' },
  neon: { name: 'Neon Legend', rarity: 'Epic', price: 1500, gender: 'any', colors: { shirt: 0x0a2a1a, pants: 0x061a10, shoes: 0x0a0a0a }, helmet: 'combat', backpack: true, effect: 'neon', camo: null, desc: 'Cincin neon berdenyut. Terlihat dari jauh — dengan bangga.' },
};
export const COSTUME_IDS = Object.keys(COSTUME_DEFS);
// Helmet / hat variants (v18.7.6): picked per costume, additive on top of the
// operator's own face gear.
export const HELMET_DEFS = {
  none: { name: 'Tanpa Helm', desc: 'Kepala polos.' },
  skull: { name: 'Masker Tengkorak', desc: 'Topeng tengkorak putih.' },
  brim: { name: 'Topi Brim', desc: 'Topi lebar ala koboi gurun.' },
  combat: { name: 'Helm Tempur', desc: 'Helm baja standar.' },
  horns: { name: 'Tanduk Naga', desc: 'Dua tanduk merah menyala.' },
  crown: { name: 'Mahkota Emas', desc: 'Mahkota raja medan perang.' },
  hood: { name: 'Hoodie', desc: 'Tudung gelap menutupi kepala.' },
  nvg: { name: 'Night Vision', desc: 'Kacamata penglihatan malam hijau.' },
};
// Camo match (v18.7.2): the camo only works on its matching map / weather.
export function camoMatches(camo, mapId, weather) {
  if (!camo) return false;
  if (camo === 'sand') return mapId === 'ember';
  if (camo === 'snow') return weather === 'snow';
  if (camo === 'forest') return mapId === 'harvest';
  if (camo === 'night') return weather === 'night' || mapId === 'ruin';
  return false;
}

const SKIN_TONE = { male: 0xc89878, female: 0xd9a986 };
const GLOVE_COLOR = { default: 0x4a4a52, ghillie: 0x2a3a1a, samurai: 0x3a1a1a, zombie: 0x4a6a2a, gold: 0xc9a227, stealth: 0x0a0a0a };
// Dark charcoal default glove: reads as a hand against the bright gold
// mythic gun even under warm dusk light (a brown glove washes gold).

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  return m;
}

// A bot's gun, by weapon id. Forward is local -z. Distinct per weapon class
// so a sniper, an LMG and a launcher read differently even at distance.
const BOT_GUN_CLS = {
  ax117: 'ar', vk9: 'ar', m4: 'ar', ak117: 'ar',
  kb50: 'sniper', lr50: 'sniper', arctic: 'sniper',
  vx9: 'smg', mp5: 'smg', pdw: 'smg',
  rpd: 'lmg', m4lmg: 'lmg', by15: 'shotgun', krm: 'shotgun',
  kilo: 'dmr', sks: 'dmr',
  rpg: 'launcher', fhj: 'launcher', thumper: 'launcher',
  p12: 'pistol', dual: 'pistol', katana: 'melee', crossbow: 'crossbow',
};
function buildBotGun(weaponId, gunMat, glowMat) {
  const g = new THREE.Group();
  const cls = BOT_GUN_CLS[weaponId] || 'ar';
  const B = (w, h, d, x, y, z, rx = 0, ry = 0) => {
    const q = box(w, h, d, gunMat); q.position.set(x, y, z);
    if (rx) q.rotation.x = rx; if (ry) q.rotation.y = ry; g.add(q); return q;
  };
  const C = (r, len, x, y, z) => {
    const q = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), gunMat);
    q.rotation.x = Math.PI / 2; q.position.set(x, y, z); q.castShadow = true; g.add(q); return q;
  };
  let tipZ = -0.35;
  if (cls === 'sniper') {
    B(0.07, 0.09, 0.9, 0, 0, -0.1);
    C(0.02, 0.5, 0, 0.01, -0.7);
    C(0.035, 0.22, 0, 0.09, -0.15); // scope
    B(0.06, 0.1, 0.2, 0, -0.01, 0.4);
    tipZ = -0.95;
  } else if (cls === 'smg') {
    B(0.07, 0.09, 0.45, 0, 0, -0.05);
    B(0.05, 0.2, 0.06, 0, -0.13, -0.05, 0.15);
    B(0.05, 0.12, 0.06, 0, -0.09, 0.15, 0.3);
    C(0.03, 0.12, 0, 0, -0.28); // suppressor-ish muzzle
    tipZ = -0.34;
  } else if (cls === 'lmg') {
    B(0.07, 0.1, 0.7, 0, 0, -0.1);
    C(0.02, 0.3, 0, 0.01, -0.55);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 10), gunMat);
    drum.rotation.z = Math.PI / 2; drum.position.set(0, -0.12, -0.05); drum.castShadow = true; g.add(drum);
    B(0.06, 0.1, 0.18, 0, -0.01, 0.32);
    tipZ = -0.72;
  } else if (cls === 'shotgun') {
    B(0.07, 0.1, 0.6, 0, 0, -0.05);
    C(0.03, 0.35, 0, 0.01, -0.5);
    B(0.08, 0.07, 0.16, 0, -0.02, -0.45); // pump
    B(0.06, 0.1, 0.18, 0, -0.01, 0.32);
    tipZ = -0.7;
  } else if (cls === 'dmr') {
    B(0.07, 0.09, 0.7, 0, 0, -0.08);
    C(0.018, 0.3, 0, 0.01, -0.55);
    C(0.03, 0.18, 0, 0.085, -0.15); // scope
    B(0.05, 0.2, 0.06, 0, -0.13, -0.08, 0.15);
    B(0.06, 0.1, 0.18, 0, -0.01, 0.32);
    tipZ = -0.72;
  } else if (cls === 'launcher') {
    C(0.06, 0.7, 0, 0, -0.15); // fat tube
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 10), gunMat);
    cone.rotation.x = -Math.PI / 2; cone.position.set(0, 0, -0.58); cone.castShadow = true; g.add(cone);
    B(0.05, 0.12, 0.06, 0, -0.09, 0.05, 0.3);
    tipZ = -0.55;
  } else if (cls === 'pistol') {
    B(0.06, 0.07, 0.3, 0, 0, -0.05);
    B(0.05, 0.14, 0.06, 0, -0.1, 0.05, 0.25);
    tipZ = -0.22;
  } else if (cls === 'melee') {
    B(0.02, 0.06, 0.8, 0, 0, -0.2); // blade
    B(0.05, 0.05, 0.14, 0, 0, 0.22); // handle
    tipZ = -0.6;
  } else if (cls === 'crossbow') {
    B(0.06, 0.07, 0.5, 0, 0, -0.05);
    B(0.34, 0.03, 0.04, -0.13, 0.02, -0.32, 0, 0.5); // limbs
    B(0.34, 0.03, 0.04, 0.13, 0.02, -0.32, 0, -0.5);
    C(0.01, 0.3, 0, 0.01, -0.45); // bolt
    tipZ = -0.6;
  } else { // ar
    B(0.07, 0.09, 0.6, 0, 0, -0.05);
    C(0.02, 0.2, 0, 0.01, -0.42);
    B(0.05, 0.22, 0.07, 0, -0.14, -0.08, 0.35);
    B(0.06, 0.09, 0.18, 0, -0.01, 0.32);
    tipZ = -0.52;
  }
  if (cls !== 'melee') {
    const tip = box(0.05, 0.05, 0.06, glowMat); tip.position.set(0, 0, tipZ); g.add(tip);
    const sight = box(0.02, 0.07, 0.02, gunMat); sight.position.set(0, 0.08, tipZ + 0.15); g.add(sight);
    if (cls !== 'crossbow') {
      const guard = box(0.02, 0.07, 0.14, gunMat); guard.position.set(0, -0.08, 0.1); g.add(guard);
      const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 8), gunMat);
      brake.rotation.x = Math.PI / 2; brake.position.set(0, 0, tipZ - 0.03); brake.castShadow = true; g.add(brake);
    }
  }
  return g;
}

// Name + HP bar sprite above a bot's head. depthTest false so it reads through walls.
export function makeNameSprite(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const tex = new THREE.CanvasTexture(canvas);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  spr.scale.set(1.6, 0.4, 1);
  let label = name, lastHp = 100;
  const draw = (hp, maxHp) => {
    lastHp = hp;
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, 256, 64);
    g.font = 'bold 24px sans-serif';
    g.textAlign = 'center';
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(28, 2, 200, 28);
    g.fillStyle = '#ffffff';
    g.fillText(label, 128, 25);
    const f = Math.max(0, hp / maxHp);
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(28, 36, 200, 14);
    g.fillStyle = f > 0.6 ? '#33cc44' : f > 0.3 ? '#ffcc22' : '#ff3333';
    g.fillRect(30, 38, 196 * f, 10);
    tex.needsUpdate = true;
  };
  draw(100, 100);
  return { sprite: spr, draw, setName(n) { label = n; draw(lastHp, 100); } };
}

// Full character model for one bot. Forward is local -z (yaw = atan2(-dx,-dz)).
// opts: { costumeId, helmet, backWeaponId, playerModel } (v18.7).
// Bot rebuild (2026-11-16): every bot is a stocky construction worker —
// red hard hat + red hi-vis vest with silver reflective stripes, dark work
// pants and boots. The old operator/skin/costume variety is gone: the
// worker look IS the identity (team colour = vest + hat). Enemy = red,
// revived ally = teal (setAlly repaints the team material).
export function createBotModel(weaponSkin, weaponId, name, charOpId = 'specter', charSkinId = 'default', opts = {}) {
  const op = CHAR_OPERATORS[charOpId] || CHAR_OPERATORS.specter;
  const costume = (opts.costumeId && COSTUME_DEFS[opts.costumeId]) || null;
  const ws = WEAPON_SKIN[weaponSkin] || WEAPON_SKIN.default;
  const female = op.gender === 'female';
  const tone = female ? SKIN_TONE.female : SKIN_TONE.male;
  const cc = opts.colors || {};
  const hex = (h) => parseInt(String(h).replace('#', ''), 16);
  const TEAM_RED = 0xe02020, TEAM_TEAL = 0x2fd8c8;
  // Team material (shared by vest + hard hat + shoulder pads) — the one
  // material setAlly repaints. Kept OUT of wetMats so rain never restores
  // an ally back to red (see the wetMats traverse below).
  const teamM = new THREE.MeshStandardMaterial({ color: TEAM_RED, roughness: 0.55, metalness: 0.1 });
  const stripeM = new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.35, metalness: 0.4, emissive: 0x555a60, emissiveIntensity: 0.5 });
  const shirtM = new THREE.MeshStandardMaterial({ color: cc.body ? hex(cc.body) : 0x2e3236, roughness: 0.9 });
  const pantsM = new THREE.MeshStandardMaterial({ color: cc.pants ? hex(cc.pants) : 0x23262b, roughness: 0.9 });
  const bootM = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.6 });
  const effect = costume ? costume.effect : 'none';
  const skinM = new THREE.MeshStandardMaterial({ color: tone, roughness: 0.7 });
  const gunM = new THREE.MeshStandardMaterial({ color: ws.body, roughness: 0.5, metalness: 0.5, emissive: ws.glow, emissiveIntensity: ws.fx ? 0.5 : 0 });
  const glowM = new THREE.MeshBasicMaterial({ color: ws.glow });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6 });

  const group = new THREE.Group();
  // Gear parts (hard hat / vest / stripes / pads) — collected for the
  // self-test (§55) and recoloured as one team by setAlly.
  const gearParts = [];
  const tag = (mesh, part) => { mesh.userData.part = part; gearParts.push(mesh); return mesh; };
  // Legs (pivot at the hip so they can swing). Stocky worker: thicker
  // capsules, dark work pants, heavy boots.
  const mkLeg = (x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.78, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.5, 4, 10), pantsM);
    leg.position.y = -0.39; leg.castShadow = true; pivot.add(leg);
    const boot = box(0.26, 0.13, 0.4, bootM); boot.position.set(0, -0.72, -0.04); pivot.add(boot);
    group.add(pivot);
    return pivot;
  };
  const legL = mkLeg(-0.15), legR = mkLeg(0.15);
  // Torso (pivot at the waist): broad capsule chest in a dark work shirt,
  // wrapped in a red hi-vis vest shell with silver reflective bands that
  // run all the way round (readable from the front AND the back).
  const torso = new THREE.Group();
  torso.position.y = 0.78;
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.32, 4, 12), shirtM);
  chest.scale.set(1.35, 1, 0.8); chest.position.y = 0.36; chest.castShadow = true; torso.add(chest);
  const vest = box(0.72, 0.6, 0.44, teamM); vest.position.set(0, 0.38, 0); tag(vest, 'vest'); torso.add(vest);
  // Thin reflective bands (0.035m): the old 0.07m bands covered ~40% of
  // the vest and read as a barber pole. Two thin bands, still wrapping.
  for (const sy of [0.52, 0.28]) {
    const stripe = box(0.74, 0.035, 0.46, stripeM); stripe.position.set(0, sy, 0); tag(stripe, 'stripe'); torso.add(stripe);
  }
  // Front chest pockets, below the lower stripe (face is local -Z).
  for (const px of [-0.14, 0.14]) {
    const pocket = box(0.14, 0.12, 0.04, darkM); pocket.position.set(px, 0.16, -0.23); torso.add(pocket);
  }
  // Broad shoulders (team colour) + tool belt with a pouch on each hip.
  for (const sx of [-0.42, 0.42]) {
    const pad = box(0.2, 0.09, 0.3, teamM); pad.position.set(sx, 0.68, 0); tag(pad, 'pad'); torso.add(pad);
  }
  const belt = box(0.62, 0.09, 0.46, darkM); belt.position.set(0, 0.05, 0); tag(belt, 'belt'); torso.add(belt);
  for (const sx of [-0.29, 0.29]) {
    const pouch = box(0.13, 0.17, 0.13, darkM); pouch.position.set(sx, 0.02, 0.05); tag(pouch, 'pouch'); torso.add(pouch);
  }
  group.add(torso);
  // Arms (pivot at the shoulder): dark work-shirt sleeves, dark gloves.
  // Right arm holds the gun.
  const mkArm = (x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.42, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.42, 4, 10), shirtM);
    arm.position.y = -0.31; arm.castShadow = true; pivot.add(arm);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), darkM);
    glove.position.y = -0.65; glove.scale.set(1, 1.2, 1); pivot.add(glove);
    group.add(pivot);
    return pivot;
  };
  const armL = mkArm(-0.44), armR = mkArm(0.44);
  const gun = buildBotGun(weaponId, gunM, glowM);
  gun.position.set(0, -0.68, -0.25);
  armR.add(gun);
  // Head (pivot at the neck): skin-tone face, red hard hat (dome + wide
  // brim + centre ridge). Face is local -Z.
  const headG = new THREE.Group();
  headG.position.y = 1.5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 14), skinM);
  head.position.y = 0.17; head.castShadow = true; headG.add(head);
  const nose = box(0.06, 0.08, 0.06, skinM); nose.position.set(0, 0.14, -0.19); headG.add(nose);
  for (const ex of [-0.19, 0.19]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), skinM);
    ear.position.set(ex, 0.17, 0); headG.add(ear);
  }
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x111111 });
  for (const ex of [-0.08, 0.08]) {
    const eye = box(0.05, 0.04, 0.02, eyeM); eye.position.set(ex, 0.2, -0.19); headG.add(eye);
  }
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), teamM);
  helm.position.y = 0.32; helm.scale.y = 0.8; helm.castShadow = true; tag(helm, 'hat'); headG.add(helm);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.025, 14), teamM);
  brim.position.y = 0.32; brim.castShadow = true; tag(brim, 'hat'); headG.add(brim);
  const ridge = box(0.06, 0.05, 0.38, teamM); ridge.position.set(0, 0.48, 0); tag(ridge, 'hat'); headG.add(ridge);
  group.add(headG);
  // Worker bots: no costume effects (fire/void/neon) — the hi-vis
  // worker look is the whole identity. fxMeshes stays null; animate()
  // guards it, and the mythic aura below still pulses for mythic skins.
  const fxMeshes = null;
  // Mythic aura: pulsing translucent shell.
  const aura = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 1.95, 0.65),
    new THREE.MeshBasicMaterial({ color: ws.glow, transparent: true, opacity: ws.fx ? 0.14 : 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  aura.position.y = 0.98;
  group.add(aura);
  // Name + HP sprite and enemy indicator (red triangle, bobbing).
  const nameTag = makeNameSprite(name);
  nameTag.sprite.position.y = 2.15;
  group.add(nameTag.sprite);
  const indicator = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.3, 4),
    new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.9 }),
  );
  indicator.rotation.x = Math.PI; // point down
  indicator.position.y = 2.45;
  group.add(indicator);

  // Wet clothes (v18.2.5): rain darkens the outfit 20%. Base colors are
  // stored once so the darkening never compounds across map changes.
  const wetMats = [];
  const camoMats = [];
  {
    const seen = new Set();
    group.traverse(o => {
      if (o.isMesh && o.material && o.material.isMeshStandardMaterial && !seen.has(o.material)) {
        seen.add(o.material);
        camoMats.push({ m: o.material });
        // The team material is NOT rain-darkened: its base hex is enemy
        // red, so restoring it after rain would repaint an ally red.
        if (o.material !== teamM) wetMats.push({ m: o.material, hex: o.material.color.getHex() });
      }
    });
  }

  const model = {
    group, skin: weaponSkin, weaponId, name, charOp: charOpId, charSkin: charSkinId,
    costume: opts.costumeId || null, effect, helmet: 'hardhat',
    parts: { legL, legR, armL, armR, head: headG, headMesh: head, torso, bodyMesh: chest, gun, backGun: null, aura, fxMeshes, nameSprite: nameTag.sprite, indicator },
    deathT: 0, emote: null, lastHp: 100,
    // Worker gear (team colour): vest + hard hat + pads share teamM.
    _gear: {
      parts: gearParts,
      get teamHex() { return teamM.color.getHex(); },
      setTeam(ally) { teamM.color.setHex(ally ? TEAM_TEAL : TEAM_RED); },
    },
    // Camo (v18.7.2): the whole outfit goes 70% transparent on its map.
    setCamo(on) {
      if (this._camo === on) return;
      this._camo = on;
      for (const { m } of camoMats) { m.transparent = !!on; m.opacity = on ? 0.7 : 1; }
    },
    setWet(wet) {
      if (this._wet === wet) return;
      this._wet = wet;
      for (const { m, hex } of wetMats) {
        if (wet) { const c = new THREE.Color(hex); c.multiplyScalar(0.8); m.color.copy(c); }
        else m.color.setHex(hex);
      }
    },
    setHp(hp, maxHp = 100) {
      if (hp === this.lastHp) return;
      this.lastHp = hp;
      nameTag.draw(hp, maxHp);
    },
    // BR revive: a dead bot stands up as your ally (green tag, no red marker).
    setAlly(ally) {
      indicator.visible = !ally;
      nameTag.setName(ally ? `ALLY ${name}` : name);
      if (this._gear) this._gear.setTeam(ally);
    },
    setEmote(id) { this.emote = { id, t: 0 }; },
    animate(dt, bot, time) {
      const g = group;
      if (!bot.alive) {
        this.deathT += dt;
        // Fall direction (v18.8.10): shot from the front -> falls backward,
        // from behind -> falls forward, arms thrown up; else the sideways fall.
        const dir = bot.deathDir || 'side';
        if (dir === 'back') g.rotation.x = -Math.min(Math.PI / 2, this.deathT * 6);
        else if (dir === 'front') g.rotation.x = Math.min(Math.PI / 2, this.deathT * 6);
        else g.rotation.z = Math.min(Math.PI / 2, this.deathT * 6);
        armL.rotation.x = -2.6; armR.rotation.x = -2.6;
        nameTag.sprite.visible = false;
        indicator.visible = false;
        return;
      }
      this.deathT = 0;
      if (g.rotation.z !== 0) g.rotation.z = Math.max(0, g.rotation.z - dt * 4);
      if (g.rotation.x !== 0) g.rotation.x -= Math.sign(g.rotation.x) * Math.min(Math.abs(g.rotation.x), dt * 4);
      nameTag.sprite.visible = true;
      indicator.visible = true;
      if (bot.hp !== this.lastHp) this.setHp(bot.hp);
      // Walk vs idle: speed from position change.
      const dx = bot.x - (bot._px ?? bot.x), dz = bot.z - (bot._pz ?? bot.z);
      const speed = dt > 0 ? Math.hypot(dx, dz) / dt : 0;
      bot._px = bot.x; bot._pz = bot.z;
      const walking = speed > 0.5;
      // Backwards walk (v18.18): backpedalling while facing the player —
      // legs swing the other way, torso leans back.
      // Smooth swing: the amplitude eases in/out instead of snapping when
      // a bot starts or stops walking.
      bot._swAmp = (bot._swAmp ?? 0) + ((walking ? 0.6 : 0) - (bot._swAmp ?? 0)) * Math.min(1, dt * 8);
      const sw = Math.sin(time * 10) * bot._swAmp * (bot.backwards ? -1 : 1);
      legL.rotation.x = sw;
      legR.rotation.x = -sw;
      armL.rotation.x = -sw * 0.7;
      armR.rotation.x = sw * 0.3;
      armL.rotation.z = 0; armR.rotation.z = 0;
      torso.position.y = 0.78 + Math.abs(Math.sin(time * 10)) * 0.05 * bot._swAmp;
      torso.rotation.x = bot.backwards && walking ? 0.12 : 0;
      headG.position.y = 1.5 + (walking ? 0 : Math.sin(time * 2) * 0.015); // idle breathing
      headG.rotation.x = 0; headG.rotation.z = 0;
      g.position.y = 0;
      // Hit flinch (v18.8.1): body + head snap back for 150ms after a hit.
      if (bot.flinchT > 0) {
        bot.flinchT -= dt;
        torso.rotation.x = -0.15;
        headG.rotation.x = -0.2;
      }
      // Strafe lean (v18.8.3): the body tilts into the strafe.
      torso.rotation.z = bot.lean || 0;
      // ADS pose (v18.8.4): arms up front, body tilted while aiming down sights.
      if (bot.ads) {
        armL.rotation.x = -1.2; armR.rotation.x = -1.2;
        torso.rotation.x = 0.1;
      }
      // Swimming (v18.8.6): horizontal body, paddling arms, kicking legs.
      if (bot.swimming) {
        torso.rotation.x = 1.15;
        armL.rotation.x = Math.sin(time * 4) * 0.8 - 0.4;
        armR.rotation.x = -Math.sin(time * 4) * 0.8 - 0.4;
        legL.rotation.x = Math.sin(time * 6) * 0.5;
        legR.rotation.x = -Math.sin(time * 6) * 0.5;
        g.position.y = -0.4;
      }
      // Idle head (v18.8.9): the head looks left and right while standing still.
      headG.rotation.y = (!walking && !this.emote) ? Math.sin(time * 0.5 + (bot.id || 0)) * 0.4 : 0;
      // Jump (v18.18): legs tuck while airborne.
      if (bot.hopT > 0) {
        bot.hopT -= dt;
        const k = Math.sin(Math.max(0, (0.5 - bot.hopT) / 0.5) * Math.PI);
        g.position.y = k * 0.4;
        legL.rotation.x = -0.9 * k; legR.rotation.x = 0.5 * k;
      }
      // Crouch walk (v18.18): bent legs, lower body.
      if (bot.crouch) {
        legL.rotation.x = -0.7; legR.rotation.x = -0.5;
        torso.position.y = 0.62;
        headG.position.y = 1.35;
      }
      // Reload (v18.18): right arm lifts, gun tilts up.
      if (bot.reloadT > 0) {
        armR.rotation.x = -2.0;
        if (gun) gun.rotation.x = -0.5;
      } else if (gun) {
        gun.rotation.x = 0;
      }
      // Prone (v28): lying flat, gun forward — same horizontal-body trick
      // as swimming. Runs after crouch/reload so prone wins over both.
      if (bot.prone) {
        torso.rotation.x = 1.25;
        torso.position.y = 0.35;
        headG.position.y = 0.9;
        legL.rotation.x = 0.25; legR.rotation.x = 0.25;
        armL.rotation.x = -1.2; armR.rotation.x = -1.2;
        g.position.y = -0.55;
      }
      // Emote overrides the base pose.
      if (this.emote) {
        const e = this.emote;
        e.t += dt;
        const t = e.t;
        if (e.id === 'dance') {
          g.position.y = Math.abs(Math.sin(t * 6)) * 0.25;
          g.rotation.y += dt * 4;
          legL.rotation.x = Math.sin(t * 10) * 0.8;
          legR.rotation.x = -Math.sin(t * 10) * 0.8;
          armL.rotation.x = -2.2; armR.rotation.x = -2.2;
        } else if (e.id === 'wave') {
          armR.rotation.x = -2.4; armR.rotation.z = Math.sin(t * 8) * 0.3;
        } else if (e.id === 'tpose') {
          armL.rotation.z = Math.PI / 2; armR.rotation.z = -Math.PI / 2;
        } else if (e.id === 'laugh') {
          torso.rotation.x = -0.15 + Math.sin(t * 10) * 0.05;
          headG.rotation.x = -0.2;
        } else if (e.id === 'salute') {
          armR.rotation.x = -2.2; armR.rotation.z = 0.3;
        } else if (e.id === 'dab') {
          armR.rotation.x = -2.6; armR.rotation.z = -0.8;
          headG.rotation.x = 0.4; headG.rotation.z = 0.3;
        } else if (e.id === 'heart') {
          armL.rotation.x = -1.2; armR.rotation.x = -1.2;
          armL.rotation.z = 0.5; armR.rotation.z = -0.5;
        } else if (e.id === 'clap') {
          armL.rotation.x = -1.4; armR.rotation.x = -1.4;
          armL.rotation.z = 0.4 + Math.sin(t * 10) * 0.25; armR.rotation.z = -0.4 - Math.sin(t * 10) * 0.25;
        } else if (e.id === 'bow') {
          torso.rotation.x = 0.5 + Math.sin(t * 3) * 0.1;
          headG.rotation.x = 0.3;
        } else if (e.id === 'flex') {
          armL.rotation.x = -2.4; armR.rotation.x = -2.4;
          armL.rotation.z = 0.6; armR.rotation.z = -0.6;
        } else if (e.id === 'cry') {
          armL.rotation.x = -0.8; armR.rotation.x = -0.8;
          headG.rotation.x = 0.5;
          torso.rotation.x = 0.2;
        } else if (e.id === 'sit') {
          // Sitting (v18.8.8): legs folded, body low, hands resting.
          torso.position.y = 0.35;
          legL.rotation.x = -1.4; legR.rotation.x = -1.4;
          armL.rotation.x = -0.4; armR.rotation.x = -0.4;
          g.position.y = -0.35;
        } else if (e.id === 'pushup') {
          // Push-up (v18.8.8): horizontal body, pressing arms.
          torso.rotation.x = 1.25;
          g.position.y = -0.55;
          armL.rotation.x = -1.5 + Math.sin(t * 5) * 0.5;
          armR.rotation.x = -1.5 + Math.sin(t * 5) * 0.5;
          legL.rotation.x = 0.1; legR.rotation.x = 0.1;
        } else if (e.id === 'scratch') {
          armR.rotation.x = -2.5; armR.rotation.z = 0.5;
          headG.rotation.z = 0.2; headG.rotation.x = -0.1;
        } else if (e.id === 'cough') {
          armR.rotation.x = -1.8; armR.rotation.z = 0.4;
          torso.rotation.x = 0.25 + Math.sin(t * 6) * 0.12;
          headG.rotation.x = 0.3;
        } else if (e.id === 'sneeze') {
          headG.rotation.x = t < 0.6 ? -0.4 : 0.5;
          armL.rotation.x = -1.0; armR.rotation.x = -1.0;
          torso.rotation.x = t < 0.6 ? -0.2 : 0.3;
        } else if (e.id === 'drink') {
          armR.rotation.x = -2.0; armR.rotation.z = 0.3;
          headG.rotation.x = -0.25;
          torso.rotation.x = -0.05;
        } else if (e.id === 'eat') {
          armR.rotation.x = -1.9 + Math.sin(t * 5) * 0.3; armR.rotation.z = 0.3;
          headG.rotation.x = 0.15 + Math.sin(t * 5) * 0.08;
        } else if (e.id === 'phone') {
          armR.rotation.x = -0.9; armR.rotation.z = 0.5;
          headG.rotation.x = 0.45;
        } else if (e.id === 'sleep') {
          torso.rotation.x = 1.5;
          g.position.y = -0.7;
          armL.rotation.x = 0.1; armR.rotation.x = 0.1;
          legL.rotation.x = 0; legR.rotation.x = 0;
        }
        if (e.t >= 2) { this.emote = null; torso.rotation.x = 0; g.rotation.y = bot.yaw; }
      }
      // Mythic aura pulse + enemy indicator bob (no setInterval per enemy).
      aura.material.opacity = ws.fx ? 0.12 + Math.sin(time * 4) * 0.06 : 0;
      aura.scale.setScalar(1 + (ws.fx ? Math.sin(time * 4) * 0.03 : 0));
      // Legendary costume effects (v18.7.3): fire flickers, the void orb
      // circles the torso, gold shimmers, neon pulses — all in the main loop.
      if (fxMeshes) {
        if (effect === 'fire') {
          for (let i = 0; i < fxMeshes.length; i++) {
            const s = 1 + Math.sin(time * 9 + i * 2.4) * 0.22;
            fxMeshes[i].scale.set(s, 1 + Math.sin(time * 11 + i) * 0.25, s);
          }
        } else if (effect === 'void') {
          const a = time * 2 + (bot.id || 0);
          fxMeshes[0].position.set(Math.cos(a) * 0.55, 1.2 + Math.sin(time * 3) * 0.15, Math.sin(a) * 0.55);
          fxMeshes[1].rotation.z += dt * 1.5;
        } else if (effect === 'neon') {
          fxMeshes[0].rotation.z += dt * 2;
          fxMeshes[0].material.emissiveIntensity = 1.6 + Math.sin(time * 5) * 0.8;
        }
      }
      if (effect === 'gold') {
        aura.material.color.setHex(0xffd700);
        aura.material.opacity = 0.18 + Math.sin(time * 3) * 0.08;
      }
      indicator.position.y = 2.45 + Math.sin(time * 3 + bot.id) * 0.08;
      indicator.rotation.y += dt * 2;
    },
  };
  return model;
}

// First-person hands: gloved hands + forearms holding the gun viewmodel.
// Glove color follows the player's character skin.
export function createFirstPersonHands(S) {
  const group = new THREE.Group();
  const gloveM = new THREE.MeshStandardMaterial({ color: GLOVE_COLOR[S.charSkin] || 0x4a4a52, roughness: 0.9 });
  const fingerM = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 1 });
  // Palm/thumb material: glove colour darkened — the cool-white fill light
  // sits ~30cm away and blasts a smooth sphere pale, so the base must be
  // darker than the flat box it replaces.
  const palmM = gloveM.clone(); palmM.color.multiplyScalar(0.62);
  // Sleeve fabric: procedural canvas with fold stripes along the arm so the
  // green sleeve reads as cloth, not a plain plastic tube. Map carries the
  // base green itself, so the material colour stays white. (Math.random here
  // is texture-only — the gameplay rng is untouched.)
  const sleeveTex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#2e8b62'; g.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x += 8) { // fold ridges around the arm
      g.fillStyle = (x / 8) % 2 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.10)';
      g.fillRect(x, 0, 4, 128);
    }
    for (let i = 0; i < 5; i++) { // crease lines across the arm
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 20 + i * 24, 128, 2);
    }
    for (let i = 0; i < 300; i++) { // weave speckle
      g.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
      g.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const sleeveM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: sleeveTex, roughness: 0.85, emissive: 0x0a2e1c, emissiveIntensity: 0.25 });
  // Realistic-textures pass: brushed gunmetal + wood grain, white-base so
  // buildGun's dark colour (0x2b2f33) and applyCamo tints still hold.
  const brushedTex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#ececef'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 2) { // fine horizontal brush streaks
      g.fillStyle = (y / 2) % 2 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
      g.fillRect(0, y, 128, 1);
    }
    for (let i = 0; i < 6; i++) { // wear scratches (fixed positions)
      g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 1;
      const y = 12 + i * 19;
      g.beginPath(); g.moveTo(8 + i * 6, y); g.lineTo(90 + i * 4, y + 3); g.stroke();
    }
    for (let i = 0; i < 120; i++) { // speckle
      g.fillStyle = 'rgba(0,0,0,0.07)';
      g.fillRect((i * 37) % 128, (i * 53) % 128, 1.5, 1.5);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const woodTex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#f5efe6'; g.fillRect(0, 0, 128, 128);
    for (let p = 0; p < 4; p++) { // grain bands
      const y = p * 32;
      g.strokeStyle = 'rgba(90,60,30,0.30)'; g.lineWidth = 1.5;
      for (let k = 0; k < 2; k++) {
        const gy = y + 8 + k * 12;
        g.beginPath(); g.moveTo(0, gy);
        g.bezierCurveTo(40, gy + 3, 90, gy - 3, 128, gy + 2); g.stroke();
      }
      g.fillStyle = 'rgba(60,40,18,0.25)'; g.fillRect(0, y, 128, 2); // plank seam
    }
    g.strokeStyle = 'rgba(70,45,20,0.45)'; g.lineWidth = 2; // one knot
    g.beginPath(); g.ellipse(96, 64, 7, 5, 0, 0, 7); g.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const gunM = new THREE.MeshStandardMaterial({ color: 0x23272b, roughness: 0.45, metalness: 0.65, map: brushedTex }); // dark gunmetal, not washed white
  const barrelM = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.35, metalness: 0.8, map: brushedTex });
  const gripM = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.95 });
  const woodM = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.8, map: woodTex });
  const bladeM = new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.25, metalness: 0.9 });
  const accentM = new THREE.MeshStandardMaterial({ color: 0xffb020, roughness: 0.5, metalness: 0.3 });
  // HANDS REWORK (2026-11-16, reference: hand clearly gripping the gun):
  // palms sit BELOW the gun so they read against the world instead of
  // hiding behind the receiver, fingers curl up around the grip/fore-end,
  // thumbs ride the near side, forearms + green sleeves run down toward
  // the camera. All hand/arm meshes live in handsGroup so recoil (step)
  // moves the hands together with the gun — the gun no longer slides out
  // of the grip when it kicks.
  const handsGroup = new THREE.Group(); group.add(handsGroup);
  const procHands = new THREE.Group(); handsGroup.add(procHands);
  // ROUNDED HANDS (2026-11-16): no more boxes — palms are flattened
  // spheres, fingers are 2 capsule segments + knuckle ball + tapered tip,
  // thumbs are capsules, forearms are capsules. Same positions/curls as
  // before, so grip + animation are unchanged.
  const cap = (r, len, mat) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat); m.castShadow = true; return m; };
  const ball = (r, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat); m.castShadow = true; return m; };
  const mkFinger = (parent, x, y, z, curl) => {
    const fg = new THREE.Group();
    fg.position.set(x, y, z); fg.rotation.x = curl;
    const prox = cap(0.02, 0.05, fingerM); prox.position.y = -0.035; fg.add(prox);
    const knuckle = ball(0.02, fingerM); knuckle.position.y = -0.068; fg.add(knuckle);
    const dist = cap(0.017, 0.038, fingerM); dist.position.y = -0.096; dist.rotation.x = 0.55; fg.add(dist);
    const tip = ball(0.015, fingerM); tip.position.set(0, -0.126, 0.02); fg.add(tip);
    parent.add(fg);
  };
  const mkThumb = (parent, x, y, z, yaw) => {
    const tg = new THREE.Group();
    tg.position.set(x, y, z); tg.rotation.y = yaw;
    const th = cap(0.022, 0.07, palmM); th.rotation.x = Math.PI / 2; tg.add(th);
    const tip = ball(0.02, palmM); tip.position.set(0, 0, -0.055); tg.add(tip);
    parent.add(tg);
  };
  const handR = ball(0.105, palmM); handR.scale.set(0.95, 0.62, 0.85); handR.position.set(0.08, -0.2, -0.04); procHands.add(handR);
  for (let i = 0; i < 4; i++) mkFinger(procHands, 0.015 + i * 0.052, -0.1, -0.03 - i * 0.004, 0.45 + i * 0.12);
  mkThumb(procHands, 0.16, -0.15, -0.03, -0.6);
  const armR = cap(0.048, 0.15, sleeveM); armR.position.set(0.11, -0.38, 0.16); armR.rotation.x = Math.PI / 2 + 0.55; procHands.add(armR);
  // Left hand rides a subgroup so buildGun can slide it along the fore-end
  // per weapon class (pump on shotguns, handguard on rifles, grip on pistols).
  const gripL = new THREE.Group(); procHands.add(gripL);
  const handL = ball(0.105, palmM); handL.scale.set(0.95, 0.6, 0.85); handL.position.set(-0.05, -0.21, 0); gripL.add(handL);
  for (let i = 0; i < 4; i++) mkFinger(gripL, -0.12 + i * 0.052, -0.11, 0.0 - i * 0.004, 0.45 + i * 0.12);
  mkThumb(gripL, 0.03, -0.16, 0, 0.6);
  gripL.position.set(0, 0, -0.5);
  const armL = cap(0.048, 0.15, sleeveM); armL.position.set(-0.08, -0.38, -0.3); armL.rotation.x = Math.PI / 2 + 0.6; procHands.add(armL);
  // Camo repaints the GUN only: hands + sleeves keep their colours.
  handsGroup.traverse(o => { if (o.isMesh) o.userData.noCamo = true; });
  // Gun (rebuilt per weapon below).
  const gun = new THREE.Group();
  group.add(gun);
  const hands = {
    group, gun, parts: { handL, handR, armL, armR, gun, gripL, handsGroup, procHands },
    kickT: 0, weaponId: null,
    // Realistic-textures pass: viewmodel materials carry a canvas map.
    gunTex: { gun: !!gunM.map, barrel: !!barrelM.map, wood: !!woodM.map },
    buildGun(w, mythicDef) {
      while (gun.children.length) gun.remove(gun.children[0]);
      // GRAPHICS FIX (2026-11-15): the body stays dark gunmetal — the mythic
      // colour is only an accent (trim strip, sight, mag base, muzzle ring).
      // The old code painted the WHOLE gun in the mythic body colour, which
      // is why the dragon loadout rendered as a solid yellow block.
      gunM.color.setHex(0x2b2f33);
      gunM.emissive.setHex(0x000000); gunM.emissiveIntensity = 0;
      const myth = mythicDef && mythicDef.body ? mythicDef.body : 0xffb020;
      const mGlow = mythicDef && mythicDef.glow ? mythicDef.glow : 0x000000;
      accentM.color.setHex(myth);
      accentM.emissive.setHex(mGlow);
      accentM.emissiveIntensity = mythicDef && mythicDef.fx ? 0.9 : 0;
      const P = (wd, h, d, m, x, y, z, rx = 0, rz = 0) => {
        const q = box(wd, h, d, m); q.position.set(x, y, z);
        if (rx) q.rotation.x = rx; if (rz) q.rotation.z = rz; gun.add(q); return q;
      };
      const CYL = (r, len, m, x, y, z) => {
        const q = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), m);
        q.rotation.x = Math.PI / 2; q.position.set(x, y, z); q.castShadow = true; gun.add(q); return q;
      };
      // BUGFIX (2026-11-16): WEAPONS_DB classes are capitalized ('Shotgun',
      // 'Sniper', 'Pistol'...) but the branches below compare lowercase, so
      // EVERY weapon used to build the AR-default viewmodel — the double
      // barrel, sniper scope and pistol slide never rendered. Lowercase once.
      const cls = (w.cls || 'ar').toLowerCase();
      let tipZ = -0.72, mag = null;
      // Magazine: base y MUST stay -0.09 (the reload animation in step()
      // resets mag.position.y to exactly -0.09).
      const magAt = (x, z, tilt = 0.3, h = 0.13) => {
        const m = P(0.06, h, 0.07, gunM, x, -0.09, z, tilt);
        P(0.062, 0.02, 0.072, accentM, x, -0.09 - h / 2 + 0.01, z + 0.015, tilt);
        return m;
      };
      const gripAt = (x, z) => P(0.055, 0.12, 0.07, gripM, x, -0.08, z, 0.35);
      const stockAt = (len) => { P(0.06, 0.09, len, gunM, 0, -0.02, 0.06); P(0.065, 0.1, 0.03, gripM, 0, -0.02, 0.06 + len / 2); };
      const railStrip = (z, len) => P(0.052, 0.012, len, accentM, 0, 0.028, z);
      const frontPost = (z) => P(0.015, 0.05, 0.015, barrelM, 0, 0.045, z);
      const rearSight = (z) => P(0.025, 0.035, 0.03, accentM, 0, 0.032, z);
      const muzzle = (z) => CYL(0.026, 0.07, barrelM, 0, -0.01, z);
      const scopeAt = (z, r, len) => {
        CYL(r, len, gunM, 0, 0.055, z);
        CYL(r + 0.003, 0.02, accentM, 0, 0.055, z - len / 2);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.005, r - 0.005, 0.012, 10),
          new THREE.MeshBasicMaterial({ color: 0x9fd8ff }));
        lens.rotation.x = Math.PI / 2; lens.position.set(0, 0.055, z - len / 2 - 0.008); gun.add(lens);
        P(0.05, 0.04, 0.05, gunM, 0, 0.025, z);
      };
      if (cls === 'sniper') {
        P(0.06, 0.08, 0.4, gunM, 0, -0.01, -0.3);
        CYL(0.018, 0.36, barrelM, 0, -0.01, -0.62);
        scopeAt(-0.3, 0.035, 0.2);
        mag = magAt(0, -0.2, 0.1);
        gripAt(0, -0.02); stockAt(0.2);
        P(0.09, 0.02, 0.02, barrelM, 0.05, 0.01, -0.18); // bolt handle
        P(0.03, 0.03, 0.03, barrelM, 0.09, 0.01, -0.18);
        P(0.012, 0.16, 0.012, barrelM, -0.05, -0.1, -0.5, 0, 0.5); // bipod
        P(0.012, 0.16, 0.012, barrelM, 0.05, -0.1, -0.5, 0, -0.5);
        muzzle(-0.82); tipZ = -0.86;
      } else if (cls === 'smg') {
        P(0.06, 0.07, 0.26, gunM, 0, -0.01, -0.26);
        CYL(0.018, 0.1, barrelM, 0, -0.01, -0.46);
        if (w.id === 'qq9') CYL(0.028, 0.14, barrelM, 0, -0.01, -0.55);
        mag = magAt(0, -0.18, 0.1, 0.2);
        gripAt(0, 0.0);
        P(0.05, 0.1, 0.05, gripM, 0, -0.08, -0.38, 0.1); // foregrip
        P(0.04, 0.06, 0.14, gunM, 0, -0.02, 0.05); // collapsible stock
        frontPost(-0.4); rearSight(-0.14); tipZ = -0.55;
      } else if (cls === 'dmr') {
        P(0.06, 0.08, 0.36, gunM, 0, -0.01, -0.3);
        CYL(0.018, 0.26, barrelM, 0, -0.01, -0.58);
        scopeAt(-0.3, 0.03, 0.16);
        mag = magAt(0, -0.22, 0.12);
        gripAt(0, -0.04); stockAt(0.18);
        muzzle(-0.72); tipZ = -0.76;
      } else if (cls === 'shotgun') {
        P(0.075, 0.09, 0.3, gunM, 0, -0.01, -0.26);
        // Double barrel (reference look): two thick side-by-side barrels.
        CYL(0.028, 0.3, barrelM, -0.032, -0.01, -0.55);
        CYL(0.028, 0.3, barrelM, 0.032, -0.01, -0.55);
        CYL(0.026, 0.24, gunM, 0, -0.055, -0.5); // tube mag under barrels
        const pump = P(0.11, 0.08, 0.16, woodM, 0, -0.02, -0.5); pump.userData.noCamo = true; // wooden pump
        P(0.112, 0.02, 0.02, barrelM, 0, -0.02, -0.44);
        P(0.112, 0.02, 0.02, barrelM, 0, -0.02, -0.56);
        P(0.02, 0.012, 0.3, barrelM, 0, 0.032, -0.5); // top rib
        frontPost(-0.68); rearSight(-0.12);
        gripAt(0, -0.02); stockAt(0.2); tipZ = -0.72;
      } else if (cls === 'lmg') {
        P(0.07, 0.09, 0.4, gunM, 0, -0.01, -0.3);
        CYL(0.022, 0.28, barrelM, 0, -0.01, -0.62);
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12), gunM);
        drum.rotation.z = Math.PI / 2; drum.position.set(0, -0.1, -0.2); drum.castShadow = true; gun.add(drum);
        P(0.04, 0.03, 0.2, gunM, 0, 0.05, -0.3); // carry handle
        gripAt(0, -0.02); stockAt(0.2);
        P(0.012, 0.16, 0.012, barrelM, -0.05, -0.1, -0.52, 0, 0.5);
        P(0.012, 0.16, 0.012, barrelM, 0.05, -0.1, -0.52, 0, -0.5);
        muzzle(-0.78); tipZ = -0.82;
      } else if (cls === 'pistol') {
        if (w.id === 'dual') {
          for (const sx of [-0.055, 0.055]) {
            const rz = sx > 0 ? 0.12 : -0.12;
            P(0.05, 0.05, 0.24, gunM, sx, 0.005, -0.3, 0, rz);
            P(0.05, 0.07, 0.2, gripM, sx, -0.035, -0.26, 0, rz);
            P(0.05, 0.11, 0.07, gripM, sx, -0.1, -0.12, 0.25, rz);
          }
          mag = P(0.035, 0.08, 0.05, gunM, -0.055, -0.09, -0.12, 0.25, -0.12);
          P(0.037, 0.02, 0.052, accentM, -0.055, -0.125, -0.11, 0.25, -0.12);
          tipZ = -0.44;
        } else {
          P(0.05, 0.05, 0.24, gunM, 0, 0.005, -0.3); // slide
          P(0.05, 0.07, 0.2, gripM, 0, -0.035, -0.26); // frame
          P(0.05, 0.11, 0.07, gripM, 0, -0.1, -0.12, 0.25); // grip
          mag = magAt(0, -0.12, 0.25, 0.08);
          frontPost(-0.4); rearSight(-0.16); tipZ = -0.44;
        }
      } else if (cls === 'launcher') {
        CYL(0.06, 0.6, gunM, 0, -0.01, -0.28); // fat tube
        if (w.id === 'rpg') {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.16, 10), barrelM);
          cone.rotation.x = -Math.PI / 2; cone.position.set(0, -0.01, -0.62); cone.castShadow = true; gun.add(cone);
        }
        if (w.id === 'thumper') {
          const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), gunM);
          drum.rotation.z = Math.PI / 2; drum.position.set(0, -0.09, -0.2); drum.castShadow = true; gun.add(drum);
        }
        P(0.04, 0.1, 0.05, gripM, 0, -0.09, -0.15, 0.3); // rear grip
        P(0.06, 0.03, 0.12, gunM, 0, -0.06, 0.0); // shoulder rest
        P(0.02, 0.05, 0.02, accentM, 0, 0.06, -0.3); // sight
        tipZ = -0.6;
      } else if (cls === 'melee') {
        P(0.016, 0.05, 0.3, bladeM, 0, 0.02, -0.45); // blade
        P(0.016, 0.045, 0.14, bladeM, 0, 0.028, -0.66, 0.12); // blade tip
        CYL(0.024, 0.14, gripM, 0, -0.01, -0.12); // wrapped handle
        P(0.07, 0.02, 0.02, accentM, 0, -0.01, -0.2); // guard
        tipZ = -0.75;
      } else if (cls === 'crossbow') {
        P(0.06, 0.07, 0.4, gunM, 0, -0.01, -0.28); // stock
        P(0.3, 0.02, 0.03, gunM, -0.12, 0, -0.5, 0, 0.5); // limbs
        P(0.3, 0.02, 0.03, gunM, 0.12, 0, -0.5, 0, -0.5);
        P(0.5, 0.008, 0.008, barrelM, 0, 0, -0.42); // string
        CYL(0.008, 0.3, barrelM, 0, 0.01, -0.45); // bolt
        scopeAt(-0.28, 0.025, 0.12);
        gripAt(0, -0.04); tipZ = -0.6;
      } else { // ar (default)
        P(0.065, 0.08, 0.34, gunM, 0, -0.01, -0.28); // receiver
        P(0.07, 0.07, 0.2, gunM, 0, -0.01, -0.5); // handguard
        P(0.05, 0.1, 0.05, gripM, 0, -0.08, -0.48, 0.1); // foregrip
        CYL(0.02, 0.14, barrelM, 0, -0.01, -0.66);
        railStrip(-0.4, 0.3);
        frontPost(-0.58); rearSight(-0.14);
        if (w.id === 'vk9') CYL(0.034, 0.16, barrelM, 0, -0.01, -0.76); // suppressor
        else muzzle(-0.74);
        mag = magAt(0, -0.2, 0.35); // curved mag
        P(0.05, 0.08, 0.06, gunM, 0, -0.14, -0.17, 0.5);
        gripAt(0, -0.02); stockAt(0.18);
        P(0.02, 0.02, 0.05, barrelM, 0.035, 0.01, -0.3); // charging handle
        tipZ = -0.8;
      }
      // Left-hand grip point per weapon class (reference: hand on the
      // fore-end for long guns, supporting the grip for pistols).
      const GRIP_Z = { shotgun: -0.5, ar: -0.5, smg: -0.42, sniper: -0.55, dmr: -0.55, lmg: -0.48, pistol: -0.16, launcher: -0.35, melee: -0.14, crossbow: -0.48 };
      gripL.position.z = GRIP_Z[cls] ?? -0.5;
      // LEFT-HAND VISIBILITY (2026-11-16): the left hand floated ~50 px
      // below the fore-end (knuckles 0.065 under the handguard bottom), so
      // it read as a detached ball. Raise the grip so the knuckles touch
      // the handguard and the fingers wrap it from below; the forearm
      // follows so the wrist stays connected. Pistol stays low (it supports
      // the grip, it does not reach the fore-end); melee rises most (the
      // katana handle is thin and high, the hand must wrap it, not dangle).
      const GRIP_Y = { shotgun: 0.06, ar: 0.06, smg: 0.06, sniper: 0.06, dmr: 0.06, lmg: 0.06, pistol: 0.02, launcher: 0.06, melee: 0.15, crossbow: 0.06 };
      const gy = GRIP_Y[cls] ?? 0.06;
      gripL.position.y = gy;
      armL.position.y = -0.38 + gy;
      armL.position.z = (GRIP_Z[cls] ?? -0.5) + 0.2;
      gun.userData.mag = mag;
      const tip = new THREE.Object3D();
      tip.position.set(0, -0.01, tipZ);
      gun.add(tip);
      gun.userData.tip = tip;
      this.weaponId = w.id;
    },
    // GRAPHICS FIX: the mythic glow pulses on the ACCENT parts only (trim
    // strip, sight, mag base). The old version repainted the whole gun body
    // in the mythic colour every frame, which is why the dragon loadout
    // rendered as a solid yellow block even after buildGun kept the body dark.
    setGlow(colorHex, emissiveHex, intensity) {
      accentM.color.setHex(colorHex);
      accentM.emissive.setHex(emissiveHex);
      accentM.emissiveIntensity = intensity;
    },
    kick() { this.kickT = 1; },
    step(dt, w) {
      // Recoil: gun jumps forward 0.05 then settles back — the hands ride
      // along (handsGroup) so the grip never slides out of the fingers.
      if (this.kickT > 0) this.kickT = Math.max(0, this.kickT - dt * 8);
      gun.position.z = this.kickT * 0.08;
      handsGroup.position.z = this.kickT * 0.08;
      // Reload: weapon dips down and the magazine drops, then returns.
      // Per-class feel (2026-11-16, presentation only — the reload
      // DURATION is balance and is untouched): heavy launchers dip
      // deepest, bolt guns dip + tilt, pistols barely move, the crossbow
      // rolls sideways as the string is drawn, shotguns pump.
      if (w.reloading) {
        const p = 1 - Math.max(0, w.reloadT) / w.reload;
        const dip = Math.sin(Math.min(1, p) * Math.PI);
        const cls = w.cls || '';
        const amp = cls === 'Launcher' ? 0.7 : (cls === 'Sniper' || cls === 'DMR') ? 0.6 : cls === 'Pistol' ? 0.3 : 0.5;
        gun.rotation.x = -amp * dip;
        gun.rotation.z = cls === 'Crossbow' ? 0.25 * dip : 0;
        if (cls === 'Shotgun') gun.position.z += -0.06 * Math.sin(p * Math.PI * 2);
        if (gun.userData.mag) gun.userData.mag.position.y = -0.09 - dip * 0.12;
      } else {
        gun.rotation.x = 0;
        gun.rotation.z = 0;
        if (gun.userData.mag) gun.userData.mag.position.y = -0.09;
      }
    },
  };
  return hands;
}

// Per-frame animation for every bot model (called in animate before render).
// Idle bots occasionally emote on their own; the player mirroring is in main.js.
export function animatePlayers(bots, S, dt, time) {
  const EMOTE_POOL = ['dance', 'wave', 'laugh', 'salute', 'dab', 'heart'];
  for (const b of bots) {
    const m = b.mesh && b.mesh.model;
    if (!m) continue;
    m.animate(dt, b, time);
    if (b.alive && b.state === 'hold' && !m.emote) {
      const gap = 18 + b.id * 3;
      if (S.time - (b.lastEmoteT || -99) > gap) {
        b.lastEmoteT = S.time;
        m.setEmote(EMOTE_POOL[Math.floor(Math.random() * EMOTE_POOL.length)]);
      }
    }
  }
}

// The nearest alive bot mirrors the player's emote on its own model.
export function mirrorEmote(bots, S, emoteId) {
  let best = null, bestD = 1e9;
  for (const b of bots) {
    if (!b.alive || !b.mesh || !b.mesh.model) continue;
    const d = Math.hypot(b.x - S.player.x, b.z - S.player.z);
    if (d < bestD) { bestD = d; best = b; }
  }
  if (best && bestD < 40) best.mesh.model.setEmote(emoteId);
}

// Full killer card for the killcam, from a bot.
export function killerInfo(bot) {
  const op = CHAR_OPERATORS[bot.charOp] || CHAR_OPERATORS.specter;
  const skin = CHAR_SKINS[bot.charSkin] || CHAR_SKINS.default;
  return {
    name: `BOT-${bot.id + 1}`,
    emoji: op.emoji,
    opName: op.name,
    gender: op.gender === 'female' ? 'Cewek' : 'Cowok',
    genderIcon: op.gender === 'female' ? '♀' : '♂',
    opDesc: op.desc,
    skinName: skin.name,
    skinDesc: skin.desc,
    weapon: BOT_WEAPON_NAMES[bot.weapon] || bot.weapon,
    mythic: bot.skin === 'default' ? 'Standard' : bot.skin.charAt(0).toUpperCase() + bot.skin.slice(1),
    weaponSkin: bot.skin,
  };
}

export { PALETTE };
