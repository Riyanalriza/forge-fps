// Gunsmith: 5 attachment slots that change the player's weapon stats.
// All stats and damage are computed locally (single-player, no server).
export const GUNSMITH_SLOTS = {
  barrel: {
    name: 'Barrel',
    options: {
      standard: { name: 'Standard', desc: 'Barrel standar.', mods: {} },
      long: { name: 'Long Barrel', desc: '+damage, +range, +recoil.', mods: { damage: 1.12, range: 1.25, recoil: 1.15 } },
      short: { name: 'Short Barrel', desc: '-damage, -range, -recoil, ADS lebih cepat.', mods: { damage: 0.9, range: 0.8, recoil: 0.85, ads: 1.2 } },
    },
  },
  scope: {
    name: 'Scope',
    options: {
      iron: { name: 'Iron Sights', desc: 'Bidikan besi standar.', mods: {} },
      reddot: { name: 'Red Dot', desc: 'Titik merah, ADS lebih cepat.', mods: { ads: 1.25, zoom: 1.2 } },
      holo: { name: 'Holo', desc: 'Lingkaran holografik, ADS lebih cepat.', mods: { ads: 1.2, zoom: 1.3 } },
      scope4x: { name: '4x Scope', desc: 'Pembesaran 4x, ADS lebih lambat.', mods: { ads: 0.75, zoom: 4 } },
      scope8x: { name: '8x Scope', desc: 'Pembesaran 8x, ADS jauh lebih lambat.', mods: { ads: 0.6, zoom: 8 } },
    },
  },
  grip: {
    name: 'Grip',
    options: {
      none: { name: 'No Grip', desc: 'Tanpa grip.', mods: {} },
      vertical: { name: 'Vertical Grip', desc: '-recoil.', mods: { recoil: 0.8 } },
      angled: { name: 'Angled Grip', desc: '-spread.', mods: { spread: 0.8 } },
    },
  },
  stock: {
    name: 'Stock',
    options: {
      standard: { name: 'Standard', desc: 'Popor standar.', mods: {} },
      heavy: { name: 'Heavy Stock', desc: '-recoil, ADS lebih lambat.', mods: { recoil: 0.85, ads: 0.85 } },
      light: { name: 'Light Stock', desc: 'ADS lebih cepat, +recoil.', mods: { ads: 1.15, recoil: 1.1 } },
    },
  },
  mag: {
    name: 'Magazine',
    options: {
      normal: { name: 'Normal Mag', desc: 'Mag standar, reload 1.4 detik.', mods: {} },
      extended: { name: 'Extended Mag', desc: '+50% peluru, reload lebih lama.', mods: { mag: 1.5, reload: 1.25 } },
      fast: { name: 'Fast Mag', desc: 'Reload 0.8 detik.', mods: { reload: 0.57 } },
    },
  },
  muzzle: {
    name: 'Muzzle',
    options: {
      none: { name: 'No Muzzle', desc: 'Tanpa muzzle.', mods: {} },
      suppressor: { name: 'Suppressor', desc: '-spread, -recoil, -range (suara lebih pelan).', mods: { spread: 0.9, recoil: 0.95, range: 0.9 } },
      compensator: { name: 'Compensator', desc: '-recoil banyak, -spread sedikit.', mods: { recoil: 0.8, spread: 0.95 } },
    },
  },
  // v23.0.2: slots 7-8 — Laser and Perk.
  laser: {
    name: 'Laser',
    options: {
      none: { name: 'No Laser', desc: 'Tanpa laser.', mods: {} },
      '5mw': { name: '5mW Laser', desc: '-spread, ADS lebih cepat, tapi laser terlihat musuh.', mods: { spread: 0.8, ads: 0.9 } },
    },
  },
  perk: {
    name: 'Perk',
    options: {
      none: { name: 'No Perk', desc: 'Tanpa perk senjata.', mods: {} },
      fmj: { name: 'FMJ', desc: '+20% range (tembus tembok lebih baik).', mods: { range: 1.2 } },
      fastmag: { name: 'Fast Mag', desc: 'Reload 15% lebih cepat.', mods: { reload: 0.85 } },
      sleight: { name: 'Sleight of Hand', desc: 'ADS 20% lebih cepat.', mods: { ads: 0.8 } },
    },
  },
};
export const DEFAULT_ATTS = { barrel: 'standard', scope: 'iron', grip: 'none', stock: 'standard', mag: 'normal', muzzle: 'none', laser: 'none', perk: 'none' };

// Blueprints (v23.0.2): 3 preset builds with a damage bonus + skin.
export const BLUEPRINT_DEFS = {
  forge_fang: { name: 'Forge Fang', weapon: 'vk9', dmgBonus: 1.1, skin: 'red', desc: 'VK-9 Jackal dengan laras panjang dan cat merah menyala. +10% damage.' },
  ember_king: { name: 'Ember King', weapon: 'lr50', dmgBonus: 1.15, skin: 'gold', desc: 'LR-50 Longbow emas — satu tembakan, satu cerita. +15% damage.' },
  void_ripper: { name: 'Void Ripper', weapon: 'qq9', dmgBonus: 1.12, skin: 'purple', desc: 'VX-9 ungu void, fire rate liar. +12% damage.' },
};
// Camo unlock progression (v23.0.2): Gold = 100 kills with that weapon,
// Diamond = 500, Damascus = every weapon Gold. Kills are tracked in
// localStorage (forge_weapon_kills_v2) by economy.js.
export function camoUnlocked(camo, weaponId, killsByWeapon) {
  if (camo === 'none' || camo === 'neon' || camo === 'red' || camo === 'blue') return true;
  const k = killsByWeapon || {};
  if (camo === 'gold') return (k[weaponId] || 0) >= 100;
  if (camo === 'diamond') return (k[weaponId] || 0) >= 500;
  if (camo === 'damascus') {
    const ids = Object.keys(k);
    return ids.length >= 5 && ids.every(id => (k[id] || 0) >= 100);
  }
  return false;
}
// Loadout share (v26.0.4): export/import a loadout as a short base64 code.
export function exportLoadout(loadout) {
  try { return btoa(JSON.stringify(loadout)).replace(/=+$/, ''); } catch { return ''; }
}
export function importLoadout(code) {
  try {
    const o = JSON.parse(atob(String(code).trim()));
    if (!o || typeof o !== 'object') return null;
    return o;
  } catch { return null; }
}

// Weapon camos (v20.0.10): pure cosmetics on the gun model, separate from
// mythic skins. color = body tint, emissive = glow color (0 = none).
export const WEAPON_CAMOS = {
  none: { name: 'Standard', color: 0x2b2f33, emissive: 0x000000 },
  gold: { name: 'Gold', color: 0xffd700, emissive: 0x442200 },
  diamond: { name: 'Diamond', color: 0xd8f4ff, emissive: 0x88ccff },
  damascus: { name: 'Damascus', color: 0x6a6a72, emissive: 0x111111 },
  neon: { name: 'Neon', color: 0x37c8d8, emissive: 0x37c8d8 },
  red: { name: 'Red', color: 0xcc2222, emissive: 0x330000 },
  blue: { name: 'Blue', color: 0x2266cc, emissive: 0x001133 },
};

// Effective combat stats for a base weapon + attachments.
export function calcGunStats(base, atts) {
  const s = {
    damage: base.dmg,
    recoil: base.recoil ?? 1,
    spread: base.spread,
    range: base.range ?? 40,
    magSize: base.magSize,
    reload: base.reload ?? 1.4,
    ads: base.adsSpeed ?? 1,
    zoom: 1,
  };
  for (const slot of Object.keys(GUNSMITH_SLOTS)) {
    const opts = GUNSMITH_SLOTS[slot].options;
    const opt = opts[atts && atts[slot]] || opts[Object.keys(opts)[0]];
    const m = opt.mods || {};
    if (m.damage) s.damage *= m.damage;
    if (m.recoil) s.recoil *= m.recoil;
    if (m.spread) s.spread *= m.spread;
    if (m.range) s.range *= m.range;
    if (m.mag) s.magSize = Math.round(s.magSize * m.mag);
    if (m.reload) s.reload *= m.reload;
    if (m.ads) s.ads *= m.ads;
    if (m.zoom) s.zoom = m.zoom;
  }
  s.damage = Math.round(s.damage);
  s.reload = Math.round(s.reload * 100) / 100;
  return s;
}

// Damage falloff by range: past the effective range damage halves,
// past 1.5x range it drops to 30%.
export function damageAtRange(dmg, dist, range) {
  if (dist > range * 1.5) return Math.round(dmg * 0.3);
  if (dist > range) return Math.round(dmg * 0.5);
  return dmg;
}

// ADS field of view for a weapon + scope: base 75 -> 50, sniper 30,
// 4x scope 35, 8x scope 30.
export function adsFov(isSniper, scopeZoom) {
  if (scopeZoom >= 8) return 30;
  if (scopeZoom >= 4) return 35;
  return isSniper ? 30 : 50;
}
