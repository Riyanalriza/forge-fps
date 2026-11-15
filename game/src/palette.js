// FOUNDRY YARD — color system (v24.1). One source of truth for every color
// in the game: palette table, named costume/weapon/building/vehicle colors,
// seasons, and a localStorage store. Every setter below REALLY changes the
// material / HUD element it names — no stub functions that only add a kill.
// Back-compat: PALETTE + COL (the old industrial constants) are kept.
export const PALETTE = {
  canvas: 0x241c14, fog: 0x2e241a,
  sky: 0x2b2118, ground: 0x4a4036, groundDark: 0x3a332a,
  wall: 0x5c6b70, wallDark: 0x46545a, teal: 0x2e6f6a, tealDark: 0x1f4d4a,
  rust: 0x8a4a22, amber: 0xf0a830, amberBright: 0xffc24d,
  cyan: 0x37c8d8, steel: 0x8b9499, steelDark: 0x5a6368,
  crate: 0x7a5c33, crateDark: 0x5f4526, containerA: 0xb05a28, containerB: 0x2e6f6a,
  containerC: 0x7a7d84, botBody: 0x9c2b2b, botHead: 0xc9a06a, botTrim: 0x2b2b30,
  ink: 0xe9e6df, muted: 0x98a0a8, smoke: 0x9aa0a0,
};
export const COL = {
  amber: '#f0a830', cyan: '#37c8d8', ink: '#e9e6df', muted: '#98a0a8',
  red: '#ff5a4d', gold: '#ffc24d', green: '#7ddc7d',
};

// ---- 44 named colors (v24.1.1): one table, hexToName, applyColor helper.
export const COLOR_PALETTE = [
  { id: 'gold', name: 'Emas', hex: '#ffc24d' },
  { id: 'amber', name: 'Amber', hex: '#f0a830' },
  { id: 'orange', name: 'Oranye', hex: '#ff7a1a' },
  { id: 'red', name: 'Merah', hex: '#ff3b30' },
  { id: 'crimson', name: 'Crimson', hex: '#c81e3a' },
  { id: 'pink', name: 'Pink', hex: '#ff6fa5' },
  { id: 'purple', name: 'Ungu', hex: '#9b59ff' },
  { id: 'violet', name: 'Violet', hex: '#7a3cff' },
  { id: 'blue', name: 'Biru', hex: '#2f7bff' },
  { id: 'sky', name: 'Langit', hex: '#4fc3f7' },
  { id: 'cyan', name: 'Cyan', hex: '#37c8d8' },
  { id: 'teal', name: 'Teal', hex: '#2e6f6a' },
  { id: 'green', name: 'Hijau', hex: '#43c465' },
  { id: 'lime', name: 'Lime', hex: '#a8d84a' },
  { id: 'olive', name: 'Zaitun', hex: '#6b7a3a' },
  { id: 'forest', name: 'Hutan', hex: '#2e5a2e' },
  { id: 'yellow', name: 'Kuning', hex: '#ffe14d' },
  { id: 'sand', name: 'Pasir', hex: '#d8c08a' },
  { id: 'brown', name: 'Coklat', hex: '#7a4a22' },
  { id: 'rust', name: 'Karat', hex: '#8a4a22' },
  { id: 'white', name: 'Putih', hex: '#f2f2f2' },
  { id: 'grey', name: 'Abu-abu', hex: '#8b9499' },
  { id: 'silver', name: 'Perak', hex: '#c8ccd0' },
  { id: 'steel', name: 'Baja', hex: '#5a6368' },
  { id: 'black', name: 'Hitam', hex: '#141414' },
  { id: 'navy', name: 'Navy', hex: '#1a2a4a' },
  { id: 'maroon', name: 'Marun', hex: '#6b1a2a' },
  { id: 'magenta', name: 'Magenta', hex: '#ff2fb3' },
  { id: 'neon', name: 'Neon', hex: '#39ff9d' },
  { id: 'ice', name: 'Es', hex: '#bfefff' },
  { id: 'snow', name: 'Salju', hex: '#ffffff' },
  { id: 'bronze', name: 'Perunggu', hex: '#b08d57' },
  { id: 'copper', name: 'Tembaga', hex: '#b87333' },
  { id: 'emerald', name: 'Zamrud', hex: '#0f9d6e' },
  { id: 'ruby', name: 'Rubi', hex: '#d81b60' },
  { id: 'sapphire', name: 'Safir', hex: '#1e4fd8' },
  { id: 'charcoal', name: 'Arang', hex: '#2e3236' },
  { id: 'khaki', name: 'Khaki', hex: '#b5a06a' },
  { id: 'clay', name: 'Tanah Liat', hex: '#a0522d' },
  { id: 'mint', name: 'Mint', hex: '#7fe0c0' },
  { id: 'lavender', name: 'Lavender', hex: '#b9a7f2' },
  { id: 'coral', name: 'Koral', hex: '#ff7f6b' },
  { id: 'asphalt', name: 'Aspal', hex: '#3a3d40' },
  { id: 'wood', name: 'Kayu', hex: '#6b4a2a' },
];
export function colorById(id) {
  return COLOR_PALETTE.find(c => c.id === id) || null;
}
export function hexToName(hex) {
  const h = String(hex).replace('#', '').toLowerCase();
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  let best = null, bd = 1e9;
  for (const c of COLOR_PALETTE) {
    const ch = c.hex.slice(1);
    const dr = parseInt(ch.slice(0, 2), 16) - r, dg = parseInt(ch.slice(2, 4), 16) - g, db = parseInt(ch.slice(4, 6), 16) - b;
    const d = dr * dr + dg * dg + db * db;
    if (d < bd) { bd = d; best = c; }
  }
  return best ? best.name : hex;
}
export function hexIntToCss(n) { return '#' + n.toString(16).padStart(6, '0'); }
// Tint any mesh / group / material in place (real change, returns true if any).
export function applyColor(target, hex) {
  if (!target) return false;
  let changed = false;
  const set = (m) => { if (m && m.color) { m.color.set(hex); changed = true; } };
  if (target.isMesh) set(target.material);
  else if (target.isMaterial) set(target);
  else if (target.traverse) target.traverse(o => { if (o.isMesh) set(o.material); });
  return changed;
}
export function shade(hex, f) {
  const h = String(hex).replace('#', '');
  const r = Math.min(255, Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * f)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * f)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * f)));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ---- Costume colors (v24.1.2): 11 colors, per-part colors + gameplay effect.
// Operator names are the ORIGINAL v13 ones (Specter/Blade/Captain/Viper/
// Scout/Skull) — never the COD names from the paste.
export const COSTUME_COLORS = [
  { id: 'default', name: 'Standar', body: '#3a4a3a', vest: '#2b2b30', pants: '#2e332a', helmet: '#2b2b30', effect: 'none' },
  { id: 'desert', name: 'Gurun', body: '#c8a86a', vest: '#8a6f4a', pants: '#a8894a', helmet: '#c8a86a', effect: 'camo-desert' },
  { id: 'snow', name: 'Salju', body: '#e8eef2', vest: '#c8d4dc', pants: '#d8e2e8', helmet: '#ffffff', effect: 'camo-snow' },
  { id: 'forest', name: 'Hutan', body: '#2e5a2e', vest: '#1e3a1e', pants: '#24401e', helmet: '#2e5a2e', effect: 'camo-forest' },
  { id: 'night', name: 'Malam', body: '#14161a', vest: '#0c0e10', pants: '#101214', helmet: '#14161a', effect: 'camo-night' },
  { id: 'crimson', name: 'Crimson', body: '#8a1a2a', vest: '#5a0e1a', pants: '#6b1420', helmet: '#8a1a2a', effect: 'none' },
  { id: 'neon', name: 'Neon', body: '#0f3a2a', vest: '#0a2a1e', pants: '#0f2a20', helmet: '#39ff9d', effect: 'glow-night' },
  { id: 'gold', name: 'Emas', body: '#c9a227', vest: '#8a6d1a', pants: '#a8891a', helmet: '#ffc24d', effect: 'none' },
  { id: 'royal', name: 'Royal', body: '#4a2a8a', vest: '#2a1a5a', pants: '#3a2070', helmet: '#7a3cff', effect: 'none' },
  { id: 'blood', name: 'Darah', body: '#6b1a1a', vest: '#3a0a0a', pants: '#4a1010', helmet: '#ff3b30', effect: 'none' },
  { id: 'ghost', name: 'Hantu', body: '#9aa8b0', vest: '#6a7880', pants: '#7a8890', helmet: '#d8e2e8', effect: 'camo-fog' },
];
// Gameplay effect of a costume color: hide bonus on the matching map/weather.
export function costumeHideBonus(colorId, mapId, weather) {
  const c = COSTUME_COLORS.find(x => x.id === colorId);
  if (!c) return 0;
  if (c.effect === 'camo-forest' && (mapId === 'harvest' || mapId === 'twin')) return 0.2;
  if (c.effect === 'camo-desert' && mapId === 'ember') return 0.2;
  if (c.effect === 'camo-snow' && weather === 'snow') return 0.2;
  if (c.effect === 'camo-night' && (weather === 'night' || mapId === 'ruin')) return 0.2;
  if (c.effect === 'camo-fog' && weather === 'fog') return 0.2;
  return 0;
}

// ---- Weapon colors (v24.1.3): 16-color picker, separate from camo unlocks.
export const WEAPON_COLORS = [
  'black', 'steel', 'silver', 'gold', 'bronze', 'copper', 'red', 'crimson',
  'orange', 'blue', 'sky', 'cyan', 'teal', 'green', 'purple', 'neon',
].map(id => ({ id, name: (colorById(id) || {}).name || id, hex: (colorById(id) || {}).hex || '#888888' }));

// ---- Building / vehicle / nature palettes (v24.1.4–7).
export const BUILDING_COLORS = ['sand', 'brown', 'grey', 'white', 'rust', 'teal', 'navy', 'maroon'].map(id => colorById(id));
export const ROOF_COLORS = ['rust', 'brown', 'charcoal', 'asphalt', 'clay', 'grey', 'navy', 'green'].map(id => colorById(id));
export const DOOR_COLORS = ['wood', 'brown', 'teal', 'black', 'red', 'blue', 'white', 'steel'].map(id => colorById(id));
export const WINDOW_COLORS = ['sky', 'ice', 'blue', 'cyan', 'white', 'lavender'].map(id => colorById(id));
export const VEHICLE_COLORS = ['red', 'blue', 'black', 'white', 'olive', 'yellow', 'orange', 'grey', 'green', 'purple'].map(id => colorById(id));
// Seasons (v24.1.6): leaves / grass / flowers / tree trunk tint.
export const SEASONS = {
  summer: { name: 'Panas', leaves: '#3d5a2e', grass: '#5a7a3a', flowers: '#ff5577', tree: '#5a4028' },
  autumn: { name: 'Gugur', leaves: '#c8862a', grass: '#a8862a', flowers: '#ff8844', tree: '#6b4a2a' },
  winter: { name: 'Dingin', leaves: '#dfe8ee', grass: '#c8d4dc', flowers: '#ffffff', tree: '#4a3a28' },
  spring: { name: 'Semi', leaves: '#7ab84a', grass: '#6aa83a', flowers: '#ff9ecf', tree: '#6b4a2a' },
};

// ---- Store (v24.1.10): localStorage, same pattern as settings v17.3.
export const COLOR_KEY = 'forge_colors_v2';
export const DEFAULT_COLORS = {
  costume: 'default', weapon: 'steel',
  building: 'sand', roof: 'rust', door: 'wood', window: 'sky',
  car: 'red', motor: 'black', heli: 'olive', tank: 'olive', boat: 'white',
  season: 'summer', flower: 'pink', rock: 'grey', sand: 'sand', water: 'blue',
  sky: 'dusk', road: 'asphalt', fence: 'wood', container: 'orange',
  tent: 'green', statue: 'bronze',
  crosshair: '#ffffff', hud: '#37c8d8', team: '#37c8d8', light: '#ffd9a0',
  billboard: 'cyan', hitmarker: '#ffffff', minimap: '#37c8d8',
  parachute: 'orange', grenade: 'olive', medkit: 'white', armor: 'steel',
  drone: 'grey', flashlight: '#fff2cc', colorblind: false,
};
export function loadColorChoices() {
  try {
    const raw = localStorage.getItem(COLOR_KEY);
    if (!raw) return { ...DEFAULT_COLORS };
    return { ...DEFAULT_COLORS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_COLORS }; }
}
export function saveColorChoices(c) {
  try { localStorage.setItem(COLOR_KEY, JSON.stringify(c)); } catch { /* offline-safe */ }
}
// Resolve a stored color id / hex to a CSS hex string.
export function resolveColor(v) {
  if (!v) return '#888888';
  if (String(v).startsWith('#')) return v;
  const c = colorById(v);
  return c ? c.hex : '#888888';
}
