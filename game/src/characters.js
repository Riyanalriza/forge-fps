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
const GLOVE_COLOR = { default: 0x1c1e20, ghillie: 0x2a3a1a, samurai: 0x3a1a1a, zombie: 0x4a6a2a, gold: 0xc9a227, stealth: 0x0a0a0a };

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
function makeNameSprite(name) {
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
export function createBotModel(weaponSkin, weaponId, name, charOpId = 'specter', charSkinId = 'default', opts = {}) {
  const op = CHAR_OPERATORS[charOpId] || CHAR_OPERATORS.specter;
  const skin = CHAR_SKINS[charSkinId] || CHAR_SKINS.default;
  const costume = (opts.costumeId && COSTUME_DEFS[opts.costumeId]) || null;
  const ws = WEAPON_SKIN[weaponSkin] || WEAPON_SKIN.default;
  const female = op.gender === 'female';
  const tone = female ? SKIN_TONE.female : SKIN_TONE.male;
  // v24.1.2: opts.colors ({body, vest, pants, helmet} as CSS hex) overrides
  // the costume/skin colors — the color picker in the menu repaints live.
  const cc = opts.colors || {};
  const hex = (h) => parseInt(String(h).replace('#', ''), 16);
  const shirtC = cc.body ? hex(cc.body) : (costume ? costume.colors.shirt : skin.body);
  // GRAPHICS FIX: zombie/ghille skins used the same green for shirt AND pants,
  // so at distance the bot read as one solid green column. Dark pants break
  // the silhouette into a person again.
  const pantsC = cc.pants ? hex(cc.pants) : (costume ? costume.colors.pants : (skin.zombie ? 0x2a2a22 : skin.leaves ? 0x2a2418 : skin.body));
  const shoesC = costume ? costume.colors.shoes : 0x141414;
  const bodyM = new THREE.MeshStandardMaterial({ color: shirtC, roughness: 0.85 });
  const pantsM = new THREE.MeshStandardMaterial({ color: pantsC, roughness: 0.85 });
  const shoeM = new THREE.MeshStandardMaterial({ color: shoesC, roughness: 0.6 });
  const trimM = new THREE.MeshStandardMaterial({ color: cc.vest ? hex(cc.vest) : (skin.trim || 0x2e332a), roughness: 0.85 });
  const effect = costume ? costume.effect : 'none';
  const helmetId = opts.helmet || (costume ? costume.helmet : 'none');
  const skinM = new THREE.MeshStandardMaterial({ color: skin.zombie ? 0x5a8a3a : tone, roughness: 0.7 });
  const gunM = new THREE.MeshStandardMaterial({ color: ws.body, roughness: 0.5, metalness: 0.5, emissive: ws.glow, emissiveIntensity: ws.fx ? 0.5 : 0 });
  const glowM = new THREE.MeshBasicMaterial({ color: ws.glow });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6 });
  const goldM = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.35, metalness: 0.8 });

  const group = new THREE.Group();
  // Legs (pivot at the hip so they can swing). HD (v22.0.9): capsule legs +
  // shoes with laces, same pivots so every animation keeps working.
  const mkLeg = (x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.78, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.5, 4, 10), pantsM);
    leg.position.y = -0.39; leg.castShadow = true; pivot.add(leg);
    const shoe = box(0.24, 0.12, 0.36, shoeM); shoe.position.set(0, -0.72, -0.05); pivot.add(shoe);
    const laces = box(0.14, 0.02, 0.2, new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.9 }));
    laces.position.set(0, -0.65, -0.08); pivot.add(laces);
    group.add(pivot);
    return pivot;
  };
  const legL = mkLeg(-0.14), legR = mkLeg(0.14);
  // Torso + vest + pockets + backpack. HD (v22.0.9): capsule torso + badge.
  const torso = new THREE.Group();
  torso.position.y = 0.78;
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.3, 4, 12), skin.gold ? goldM : bodyM);
  chest.scale.set(1.25, 1, 0.72); chest.position.y = 0.36; chest.castShadow = true; torso.add(chest);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12),
    new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.3, metalness: 0.8 }));
  badge.position.set(0.14, 0.52, 0.2); torso.add(badge);
  const vest = box(0.5, 0.45, 0.08, op.vest === 'black' ? darkM : trimM); vest.position.set(0, 0.4, 0.2); torso.add(vest);
  for (const px of [-0.13, 0.13]) {
    const pocket = box(0.16, 0.16, 0.04, trimM); pocket.position.set(px, 0.32, 0.25); torso.add(pocket);
  }
  if (skin.zombie) {
    const belt = box(0.52, 0.07, 0.36, darkM); belt.position.set(0, 0.06, 0); torso.add(belt);
    const tear = box(0.18, 0.14, 0.03, new THREE.MeshStandardMaterial({ color: 0x1e2a16, roughness: 1 }));
    tear.position.set(-0.12, 0.42, 0.26); tear.rotation.z = 0.4; torso.add(tear);
  }
  const pack = box(0.5, 0.55, 0.16, trimM); pack.position.set(0, 0.38, -0.25);
  if (!costume || costume.backpack !== false) torso.add(pack);
  // Second weapon on the back (v18.7.5): the sidearm/secondary rides slung
  // across the backpack while the primary is in hand.
  let backGun = null;
  if (opts.backWeaponId) {
    backGun = buildBotGun(opts.backWeaponId, gunM, glowM);
    backGun.position.set(0, 0.45, -0.38);
    backGun.rotation.set(0.35, 0, 0.5);
    backGun.scale.setScalar(0.85);
    torso.add(backGun);
  }
  if (skin.leaves) {
    for (let i = 0; i < 12; i++) {
      const leaf = box(0.12, 0.03, 0.12, new THREE.MeshStandardMaterial({ color: [0x2a4a1a, 0x4a6a2a, 0x5a7a2a][i % 3], roughness: 1 }));
      leaf.position.set((i % 4 - 1.5) * 0.2, 0.15 + (i % 3) * 0.25, i % 2 ? 0.2 : -0.28);
      leaf.rotation.y = i * 0.7;
      torso.add(leaf);
    }
  }
  if (skin.katana) {
    const katana = box(0.05, 1.1, 0.03, darkM); katana.position.set(0.1, 0.5, -0.36); katana.rotation.z = 0.6; torso.add(katana);
    const handle = box(0.05, 0.18, 0.05, new THREE.MeshStandardMaterial({ color: 0x8a2a2a, roughness: 0.7 }));
    handle.position.set(-0.18, 0.95, -0.36); handle.rotation.z = 0.6; torso.add(handle);
  }
  group.add(torso);
  // Arms (pivot at the shoulder). Right arm holds the gun. HD (v22.0.9):
  // capsule arms + glove spheres, same pivots as before.
  const mkArm = (x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.42, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.42, 4, 10), skinM);
    arm.position.y = -0.31; arm.castShadow = true; pivot.add(arm);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), darkM);
    glove.position.y = -0.65; glove.scale.set(1, 1.2, 1); pivot.add(glove);
    group.add(pivot);
    return pivot;
  };
  const armL = mkArm(-0.38), armR = mkArm(0.38);
  const gun = buildBotGun(weaponId, gunM, glowM);
  gun.position.set(0, -0.68, -0.25);
  armR.add(gun);
  // Head (pivot at the neck). Face is local -z. HD (v22.0.9): sphere head +
  // nose + ears + hair; the face gear sits on the sphere surface.
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
  if (!female) {
    const helmetM = cc.helmet ? new THREE.MeshStandardMaterial({ color: hex(cc.helmet), roughness: 0.85 }) : (skin.stealth ? darkM : trimM);
    const helmet = box(0.38, 0.16, 0.38, helmetM); helmet.position.y = 0.38; headG.add(helmet);
  }
  const headsetL = box(0.05, 0.12, 0.12, darkM); headsetL.position.set(-0.19, 0.2, 0); headG.add(headsetL);
  const headsetR = box(0.05, 0.12, 0.12, darkM); headsetR.position.set(0.19, 0.2, 0); headG.add(headsetR);
  const mic = box(0.03, 0.03, 0.16, darkM); mic.position.set(0.14, 0.06, -0.14); headG.add(mic);
  // Operator face gear.
  if (op.mask === 'skull' || op.mask === 'skull-white') {
    const plateM = new THREE.MeshStandardMaterial({ color: op.mask === 'skull-white' ? 0xf0f0f0 : 0x1a1a1a, roughness: 0.5 });
    const plate = box(0.36, 0.3, 0.04, plateM); plate.position.set(0, 0.14, -0.2); headG.add(plate);
    for (const ex of [-0.08, 0.08]) {
      const hole = box(0.06, 0.05, 0.02, new THREE.MeshBasicMaterial({ color: 0x000000 }));
      hole.position.set(ex, 0.2, -0.23); headG.add(hole);
    }
    for (let i = 0; i < 3; i++) {
      const tooth = box(0.02, 0.08, 0.02, new THREE.MeshBasicMaterial({ color: op.mask === 'skull-white' ? 0x111111 : 0xf0f0f0 }));
      tooth.position.set(-0.06 + i * 0.06, 0.04, -0.23); headG.add(tooth);
    }
  }
  if (op.beard) {
    const beard = box(0.3, 0.14, 0.1, darkM); beard.position.set(0, 0.02, -0.2); headG.add(beard);
  }
  if (op.cap) {
    const cap = box(0.4, 0.08, 0.4, trimM); cap.position.y = 0.42; headG.add(cap);
    const brim = box(0.4, 0.04, 0.18, trimM); brim.position.set(0, 0.38, -0.24); headG.add(brim);
  }
  if (op.beret) {
    const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 0.9 }));
    beret.position.y = 0.4; beret.rotation.z = 0.25; beret.castShadow = true; headG.add(beret);
  }
  if (op.mustache) {
    const mo = box(0.2, 0.05, 0.05, darkM); mo.position.set(0, 0.08, -0.21); headG.add(mo);
  }
  if (op.hair === 'long-black') {
    const hairM = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
    const back = box(0.36, 0.6, 0.1, hairM); back.position.set(0, -0.1, 0.2); headG.add(back);
    for (const sx of [-0.18, 0.18]) {
      const strand = box(0.08, 0.5, 0.1, hairM); strand.position.set(sx, -0.05, 0.14); headG.add(strand);
    }
    const top = box(0.38, 0.12, 0.38, hairM); top.position.y = 0.38; headG.add(top);
  }
  if (op.hair === 'brown') {
    const hairM = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 });
    const top = box(0.38, 0.12, 0.38, hairM); top.position.y = 0.38; headG.add(top);
    const back = box(0.36, 0.3, 0.08, hairM); back.position.set(0, 0.2, 0.2); headG.add(back);
  }
  if (op.glasses) {
    const frameM = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 });
    for (const ex of [-0.08, 0.08]) {
      const frame = box(0.11, 0.09, 0.02, frameM); frame.position.set(ex, 0.2, -0.19); headG.add(frame);
    }
    const bridge = box(0.06, 0.02, 0.02, frameM); bridge.position.set(0, 0.2, -0.19); headG.add(bridge);
  }
  // Helmet / hat variants (v18.7.6): additive on top of the operator's gear.
  if (helmetId === 'brim') {
    const brimM = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 12), brimM);
    disc.position.y = 0.36; disc.castShadow = true; headG.add(disc);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), brimM);
    dome.position.y = 0.36; headG.add(dome);
  } else if (helmetId === 'combat' && female) {
    const helm = box(0.38, 0.16, 0.38, trimM); helm.position.y = 0.38; headG.add(helm);
  } else if (helmetId === 'horns') {
    const hornM = new THREE.MeshStandardMaterial({ color: 0x8a2a2a, roughness: 0.5, emissive: 0x441111, emissiveIntensity: 0.6 });
    for (const sx of [-0.14, 0.14]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 8), hornM);
      horn.position.set(sx, 0.48, 0.05); horn.rotation.z = -sx * 2.2; horn.castShadow = true; headG.add(horn);
    }
  } else if (helmetId === 'crown') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.1, 8), goldM);
    crown.position.y = 0.4; crown.castShadow = true; headG.add(crown);
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 6), goldM);
      const a = i * Math.PI / 2;
      spike.position.set(Math.cos(a) * 0.18, 0.48, Math.sin(a) * 0.18); headG.add(spike);
    }
  } else if (helmetId === 'hood') {
    const hoodM = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 1 });
    const top = box(0.4, 0.1, 0.4, hoodM); top.position.y = 0.38; headG.add(top);
    const back = box(0.38, 0.4, 0.08, hoodM); back.position.set(0, 0.2, 0.2); headG.add(back);
  } else if (helmetId === 'nvg') {
    const nvgM = new THREE.MeshStandardMaterial({ color: 0x1a4a1a, roughness: 0.4, emissive: 0x22aa22, emissiveIntensity: 0.8 });
    const nvg = box(0.22, 0.1, 0.08, nvgM); nvg.position.set(0, 0.3, -0.2); headG.add(nvg);
    for (const ex of [-0.06, 0.06]) {
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), nvgM);
      lens.rotation.x = Math.PI / 2; lens.position.set(ex, 0.3, -0.25); headG.add(lens);
    }
  } else if (helmetId === 'skull' && !op.mask) {
    const plateM = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.5 });
    const plate = box(0.36, 0.3, 0.04, plateM); plate.position.set(0, 0.14, -0.18); headG.add(plate);
  }
  group.add(headG);
  // Legendary costume effects (v18.7.3): persistent meshes on the model,
  // animated in animate() from the main loop — no per-effect setInterval.
  let fxMeshes = null;
  if (effect === 'fire') {
    const flameM = new THREE.MeshStandardMaterial({ color: 0xcc4400, emissive: 0xff5500, emissiveIntensity: 2.2, transparent: true, opacity: 0.9 });
    fxMeshes = [];
    for (const sx of [-0.42, 0.42]) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 8), flameM);
      flame.position.set(sx, 1.55, 0); group.add(flame);
      fxMeshes.push(flame);
    }
  } else if (effect === 'void') {
    const orbM = new THREE.MeshStandardMaterial({ color: 0x3a0a5a, emissive: 0xaa00ff, emissiveIntensity: 2.5 });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), orbM);
    orb.position.set(0.55, 1.2, 0); group.add(orb);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.02, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xaa00ff, transparent: true, opacity: 0.6 }));
    ring.position.y = 1.0; ring.rotation.x = Math.PI / 2; group.add(ring);
    fxMeshes = [orb, ring];
  } else if (effect === 'neon') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0x0a2a1a, emissive: 0x00ff88, emissiveIntensity: 2.0 }));
    ring.position.y = 1.0; ring.rotation.x = Math.PI / 2; group.add(ring);
    fxMeshes = [ring];
    // One real point light, only on the player's own preview model —
    // five bots with lights each would be too many lights.
    if (opts.playerModel) {
      const pl = new THREE.PointLight(0x00ff88, 1.5, 4);
      pl.position.y = 1.0; group.add(pl);
      fxMeshes.push(pl);
    }
  }
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
  {
    const seen = new Set();
    group.traverse(o => {
      if (o.isMesh && o.material && o.material.isMeshStandardMaterial && !seen.has(o.material)) {
        seen.add(o.material);
        wetMats.push({ m: o.material, hex: o.material.color.getHex() });
      }
    });
  }

  const model = {
    group, skin: weaponSkin, weaponId, name, charOp: charOpId, charSkin: charSkinId,
    costume: opts.costumeId || null, effect, helmet: helmetId,
    parts: { legL, legR, armL, armR, head: headG, headMesh: head, torso, bodyMesh: chest, gun, backGun, aura, fxMeshes, nameSprite: nameTag.sprite, indicator },
    deathT: 0, emote: null, lastHp: 100,
    // Camo (v18.7.2): the whole outfit goes 70% transparent on its map.
    setCamo(on) {
      if (this._camo === on) return;
      this._camo = on;
      for (const { m } of wetMats) { m.transparent = !!on; m.opacity = on ? 0.7 : 1; }
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
      const sw = walking ? Math.sin(time * 10) * 0.6 * (bot.backwards ? -1 : 1) : 0;
      legL.rotation.x = sw;
      legR.rotation.x = -sw;
      armL.rotation.x = walking ? -sw * 0.7 : 0;
      armR.rotation.x = walking ? sw * 0.3 : 0;
      armL.rotation.z = 0; armR.rotation.z = 0;
      torso.position.y = 0.78 + (walking ? Math.abs(Math.sin(time * 10)) * 0.03 : 0);
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
  const gloveM = new THREE.MeshStandardMaterial({ color: GLOVE_COLOR[S.charSkin] || 0x1c1e20, roughness: 0.9 });
  const sleeveM = new THREE.MeshStandardMaterial({ color: 0x2e332a, roughness: 0.85 });
  const gunM = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.5, metalness: 0.5 });
  const barrelM = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.35, metalness: 0.8 });
  const gripM = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.95 });
  const bladeM = new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.25, metalness: 0.9 });
  const accentM = new THREE.MeshStandardMaterial({ color: 0xffb020, roughness: 0.5, metalness: 0.3 });
  // GRAPHICS FIX (2026-11-15): hands are no longer plain boxes — the right
  // hand grips the pistol grip and the left hand holds the handguard, with
  // finger segments wrapping the grip and a thumb on each side.
  const handR = box(0.09, 0.08, 0.16, gloveM); handR.position.set(0.07, -0.1, -0.04); group.add(handR);
  for (let i = 0; i < 3; i++) {
    const f = box(0.02, 0.03, 0.07, gloveM);
    f.position.set(0.035 + i * 0.035, -0.07, -0.06); f.rotation.x = 0.6; group.add(f);
  }
  const thumbR = box(0.025, 0.03, 0.07, gloveM); thumbR.position.set(0.115, -0.07, -0.05); thumbR.rotation.y = -0.5; group.add(thumbR);
  const armR = box(0.09, 0.09, 0.4, sleeveM); armR.position.set(0.13, -0.18, 0.02); armR.rotation.x = 0.15; group.add(armR);
  const handL = box(0.09, 0.08, 0.16, gloveM); handL.position.set(-0.05, -0.08, -0.5); group.add(handL);
  for (let i = 0; i < 3; i++) {
    const f = box(0.02, 0.03, 0.07, gloveM);
    f.position.set(-0.085 + i * 0.035, -0.05, -0.54); f.rotation.x = 0.6; group.add(f);
  }
  const thumbL = box(0.025, 0.03, 0.07, gloveM); thumbL.position.set(-0.005, -0.05, -0.52); thumbL.rotation.y = 0.5; group.add(thumbL);
  const armL = box(0.09, 0.09, 0.5, sleeveM); armL.position.set(-0.08, -0.17, -0.3); armL.rotation.x = 0.35; group.add(armL);
  // Gun (rebuilt per weapon below).
  const gun = new THREE.Group();
  group.add(gun);
  const hands = {
    group, gun, parts: { handL, handR, armL, armR, gun },
    kickT: 0, weaponId: null,
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
      const cls = w.cls || 'ar';
      let tipZ = -0.72, mag = null;
      // Magazine: base y MUST stay -0.09 (the reload animation in step()
      // resets mag.position.y to exactly -0.09).
      const magAt = (x, z, tilt = 0.3, h = 0.13) => {
        const m = P(0.05, h, 0.06, gunM, x, -0.09, z, tilt);
        P(0.052, 0.02, 0.062, accentM, x, -0.09 - h / 2 + 0.01, z + 0.015, tilt);
        return m;
      };
      const gripAt = (x, z) => P(0.045, 0.11, 0.06, gripM, x, -0.08, z, 0.35);
      const stockAt = (len) => { P(0.05, 0.08, len, gunM, 0, -0.02, 0.06); P(0.055, 0.09, 0.03, gripM, 0, -0.02, 0.06 + len / 2); };
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
        P(0.05, 0.07, 0.4, gunM, 0, -0.01, -0.3);
        CYL(0.014, 0.36, barrelM, 0, -0.01, -0.62);
        scopeAt(-0.3, 0.035, 0.2);
        mag = magAt(0, -0.2, 0.1);
        gripAt(0, -0.02); stockAt(0.2);
        P(0.09, 0.02, 0.02, barrelM, 0.05, 0.01, -0.18); // bolt handle
        P(0.03, 0.03, 0.03, barrelM, 0.09, 0.01, -0.18);
        P(0.012, 0.16, 0.012, barrelM, -0.05, -0.1, -0.5, 0, 0.5); // bipod
        P(0.012, 0.16, 0.012, barrelM, 0.05, -0.1, -0.5, 0, -0.5);
        muzzle(-0.82); tipZ = -0.86;
      } else if (cls === 'smg') {
        P(0.05, 0.06, 0.26, gunM, 0, -0.01, -0.26);
        CYL(0.015, 0.1, barrelM, 0, -0.01, -0.46);
        if (w.id === 'qq9') CYL(0.028, 0.14, barrelM, 0, -0.01, -0.55);
        mag = magAt(0, -0.18, 0.1, 0.2);
        gripAt(0, 0.0);
        P(0.04, 0.09, 0.04, gripM, 0, -0.08, -0.38, 0.1); // foregrip
        P(0.04, 0.06, 0.14, gunM, 0, -0.02, 0.05); // collapsible stock
        frontPost(-0.4); rearSight(-0.14); tipZ = -0.55;
      } else if (cls === 'dmr') {
        P(0.05, 0.07, 0.36, gunM, 0, -0.01, -0.3);
        CYL(0.015, 0.26, barrelM, 0, -0.01, -0.58);
        scopeAt(-0.3, 0.03, 0.16);
        mag = magAt(0, -0.22, 0.12);
        gripAt(0, -0.04); stockAt(0.18);
        muzzle(-0.72); tipZ = -0.76;
      } else if (cls === 'shotgun') {
        P(0.055, 0.07, 0.3, gunM, 0, -0.01, -0.26);
        CYL(0.026, 0.3, barrelM, 0, -0.01, -0.55);
        CYL(0.02, 0.24, gunM, 0, -0.05, -0.5); // tube mag under barrel
        P(0.07, 0.06, 0.14, gripM, 0, -0.015, -0.5); // pump
        P(0.072, 0.02, 0.02, barrelM, 0, -0.015, -0.44);
        P(0.072, 0.02, 0.02, barrelM, 0, -0.015, -0.56);
        frontPost(-0.68); rearSight(-0.12);
        gripAt(0, -0.02); stockAt(0.2); tipZ = -0.72;
      } else if (cls === 'lmg') {
        P(0.055, 0.08, 0.4, gunM, 0, -0.01, -0.3);
        CYL(0.018, 0.28, barrelM, 0, -0.01, -0.62);
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
            P(0.04, 0.045, 0.24, gunM, sx, 0.005, -0.3, 0, rz);
            P(0.04, 0.06, 0.2, gripM, sx, -0.035, -0.26, 0, rz);
            P(0.04, 0.1, 0.06, gripM, sx, -0.1, -0.12, 0.25, rz);
          }
          mag = P(0.035, 0.08, 0.05, gunM, -0.055, -0.09, -0.12, 0.25, -0.12);
          P(0.037, 0.02, 0.052, accentM, -0.055, -0.125, -0.11, 0.25, -0.12);
          tipZ = -0.44;
        } else {
          P(0.04, 0.045, 0.24, gunM, 0, 0.005, -0.3); // slide
          P(0.04, 0.06, 0.2, gripM, 0, -0.035, -0.26); // frame
          P(0.04, 0.1, 0.06, gripM, 0, -0.1, -0.12, 0.25); // grip
          mag = magAt(0, -0.12, 0.25, 0.08);
          frontPost(-0.4); rearSight(-0.16); tipZ = -0.44;
        }
      } else if (cls === 'launcher') {
        CYL(0.05, 0.6, gunM, 0, -0.01, -0.28); // fat tube
        if (w.id === 'rpg') {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 10), barrelM);
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
        P(0.012, 0.05, 0.3, bladeM, 0, 0.02, -0.45); // blade
        P(0.012, 0.045, 0.14, bladeM, 0, 0.028, -0.66, 0.12); // blade tip
        CYL(0.02, 0.14, gripM, 0, -0.01, -0.12); // wrapped handle
        P(0.07, 0.02, 0.02, accentM, 0, -0.01, -0.2); // guard
        tipZ = -0.75;
      } else if (cls === 'crossbow') {
        P(0.05, 0.06, 0.4, gunM, 0, -0.01, -0.28); // stock
        P(0.3, 0.02, 0.03, gunM, -0.12, 0, -0.5, 0, 0.5); // limbs
        P(0.3, 0.02, 0.03, gunM, 0.12, 0, -0.5, 0, -0.5);
        P(0.5, 0.008, 0.008, barrelM, 0, 0, -0.42); // string
        CYL(0.008, 0.3, barrelM, 0, 0.01, -0.45); // bolt
        scopeAt(-0.28, 0.025, 0.12);
        gripAt(0, -0.04); tipZ = -0.6;
      } else { // ar (default)
        P(0.05, 0.07, 0.34, gunM, 0, -0.01, -0.28); // receiver
        P(0.055, 0.055, 0.2, gunM, 0, -0.01, -0.5); // handguard
        CYL(0.016, 0.14, barrelM, 0, -0.01, -0.66);
        railStrip(-0.4, 0.3);
        frontPost(-0.58); rearSight(-0.14);
        if (w.id === 'vk9') CYL(0.03, 0.16, barrelM, 0, -0.01, -0.76); // suppressor
        else muzzle(-0.74);
        mag = magAt(0, -0.2, 0.35); // curved mag
        P(0.05, 0.08, 0.06, gunM, 0, -0.14, -0.17, 0.5);
        gripAt(0, -0.02); stockAt(0.18);
        P(0.02, 0.02, 0.05, barrelM, 0.035, 0.01, -0.3); // charging handle
        tipZ = -0.8;
      }
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
      // Recoil: gun jumps forward 0.05 then settles back.
      if (this.kickT > 0) this.kickT = Math.max(0, this.kickT - dt * 8);
      gun.position.z = this.kickT * 0.05;
      // Reload: weapon dips down and the magazine drops, then returns.
      if (w.reloading) {
        const p = 1 - Math.max(0, w.reloadT) / w.reload;
        const dip = Math.sin(Math.min(1, p) * Math.PI);
        gun.rotation.x = -0.5 * dip;
        if (gun.userData.mag) gun.userData.mag.position.y = -0.09 - dip * 0.12;
      } else {
        gun.rotation.x = 0;
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
