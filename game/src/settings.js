// Full control settings (v17.3) — one localStorage key, loaded at start.
// Keybinds map an ACTION to a physical key code; input.js translates them
// into the canonical codes the movement code already reads (KeyW/KeyS/KeyA/
// KeyD/ShiftLeft/KeyC/KeyZ/Space), so rebinding never touches player.js.
// Sensitivity is a multiplier on the base look speed (0.0022): hipfire 1.0,
// ADS 0.6, sniper scopes 0.3. No raw-input / mouse-acceleration setting is
// offered: pointer lock in the browser is already raw, so such a toggle
// would be fake.
export const SETTINGS_KEY = 'forge_settings_v2';

export const KEYBIND_ACTIONS = [
  { action: 'forward', label: 'Maju', def: 'KeyW', kind: 'move' },
  { action: 'back', label: 'Mundur', def: 'KeyS', kind: 'move' },
  { action: 'left', label: 'Kiri', def: 'KeyA', kind: 'move' },
  { action: 'right', label: 'Kanan', def: 'KeyD', kind: 'move' },
  { action: 'jump', label: 'Lompat / Parkour', def: 'Space', kind: 'move' },
  { action: 'sprint', label: 'Sprint', def: 'ShiftLeft', kind: 'move' },
  { action: 'crouch', label: 'Jongkok', def: 'KeyC', kind: 'move' },
  { action: 'prone', label: 'Tiduran', def: 'KeyZ', kind: 'move' },
  { action: 'reload', label: 'Reload', def: 'KeyR', kind: 'combat' },
  { action: 'grenadeHE', label: 'Granat HE', def: 'KeyQ', kind: 'combat' },
  { action: 'grenadeFlash', label: 'Granat Flash', def: 'KeyF', kind: 'combat' },
  { action: 'grenadeSmoke', label: 'Granat Smoke', def: 'KeyG', kind: 'combat' },
  { action: 'medkit', label: 'Pakai Medkit', def: 'KeyH', kind: 'combat' },
  { action: 'armor', label: 'Pakai Armor (+50)', def: 'KeyJ', kind: 'combat' },
  { action: 'flashlight', label: 'Senter', def: 'KeyK', kind: 'combat' },
  { action: 'molotov', label: 'Lempar Molotov', def: 'Digit9', kind: 'combat' },
  { action: 'c4', label: 'C4 (pasang / ledakkan)', def: 'Digit0', kind: 'combat' },
  { action: 'tripmine', label: 'Pasang Trip Mine', def: 'Minus', kind: 'combat' },
  { action: 'operator', label: 'Operator Skill', def: 'KeyX', kind: 'combat' },
  { action: 'interact', label: 'Interaksi / Plant', def: 'KeyE', kind: 'combat' },
  { action: 'buy', label: 'Buka Buy Menu', def: 'KeyN', kind: 'combat' },
  { action: 'inspect', label: 'Inspect Senjata', def: 'KeyI', kind: 'combat' },
  { action: 'ping', label: 'Ping Lokasi', def: 'KeyP', kind: 'combat' },
  { action: 'zoom', label: 'Zoom Sniper (2x/4x/8x)', def: 'KeyV', kind: 'combat' },
  { action: 'laser', label: 'Laser Sight on/off', def: 'KeyL', kind: 'combat' },
  { action: 'leanLeft', label: 'Lean Kiri', def: 'ArrowLeft', kind: 'move' },
  { action: 'leanRight', label: 'Lean Kanan', def: 'ArrowRight', kind: 'move' },
  { action: 'chat', label: 'Chat Lokal', def: 'KeyY', kind: 'ui' },
  { action: 'bigmap', label: 'Minimap Besar', def: 'KeyM', kind: 'ui' },
  { action: 'slot1', label: 'Senjata 1 (Primary)', def: 'Digit1', kind: 'combat' },
  { action: 'slot2', label: 'Senjata 2 (Sidearm)', def: 'Digit2', kind: 'combat' },
  { action: 'emote1', label: 'Emote 1 (Dance)', def: 'Digit4', kind: 'emote' },
  { action: 'emote2', label: 'Emote 2 (Wave)', def: 'Digit5', kind: 'emote' },
  { action: 'emote3', label: 'Emote 3 (Laugh)', def: 'Digit6', kind: 'emote' },
  // Emote 4/5 have no direct key — Digit7/Digit8 are the v23.0 tacticals;
  // all 8 emotes are reachable from the wheel (hold B).
  { action: 'emote4', label: 'Emote 4 (Salute)', def: '', kind: 'emote' },
  { action: 'emote5', label: 'Emote 5 (T-Pose)', def: '', kind: 'emote' },
  { action: 'tactTrophy', label: 'Trophy System', def: 'Digit7', kind: 'combat' },
  { action: 'tactGas', label: 'Gas Grenade', def: 'Digit8', kind: 'combat' },
  { action: 'tactCryo', label: 'Cryo Bomb', def: 'KeyU', kind: 'combat' },
  { action: 'wheel', label: 'Emote Wheel (tahan)', def: 'KeyB', kind: 'emote' },
  { action: 'scoreboard', label: 'Scoreboard (tahan)', def: 'Tab', kind: 'ui' },
  { action: 'voice', label: 'Voice Callout on/off', def: 'KeyT', kind: 'ui' },
];
// Canonical movement codes the movement code reads.
export const CANONICAL = {
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
  jump: 'Space', sprint: 'ShiftLeft', crouch: 'KeyC', prone: 'KeyZ',
  interact: 'KeyE', // plant/defuse in game.js reads KeyE from the key set
  leanLeft: 'ArrowLeft', leanRight: 'ArrowRight', // lean (hold) — read in main.js
};
export const EMOTE_BINDINGS = { emote1: 'dance', emote2: 'wave', emote3: 'laugh', emote4: 'salute', emote5: 'tpose' };
// Pro-player presets (v18.3): one click applies sens + dead zone + ADS mode
// + fire side, then saves.
export const PRO_PRESETS = {
  aggressive: { name: '🎯 Aggressive', sens: { hip: 1.4, ads: 0.8, sniper: 0.4 }, deadZone: 0.08, adsMode: 'hold', fireSide: 'right' },
  balanced: { name: '⚖️ Balanced', sens: { hip: 1.0, ads: 0.6, sniper: 0.3 }, deadZone: 0.15, adsMode: 'hold', fireSide: 'right' },
  sniper: { name: '🔭 Sniper', sens: { hip: 0.7, ads: 0.4, sniper: 0.2 }, deadZone: 0.2, adsMode: 'toggle', fireSide: 'right' },
};

export function defaultSettings() {
  const keybinds = {};
  for (const a of KEYBIND_ACTIONS) keybinds[a.action] = a.def;
  return {
    keybinds,
    sens: { hip: 1.0, ads: 0.6, sniper: 0.3, joystick: 1.0, gyro: 1.0 },
    adsMode: 'hold', // 'hold' | 'toggle'
    crouchMode: 'hold', // 'hold' | 'toggle'
    autoSprint: false,
    deadZone: 0.15, // virtual joystick dead zone, 0-0.5
    gyro: false,
    layout: '3', // mobile fingers: '2' | '3' | '4'
    fireSide: 'right', // 'right' | 'left' | 'both'
    btnSize: 1.0, // 0.7-1.4
    btnOpacity: 0.8, // 0.3-1
    btnPos: {}, // {id: {x, y}} custom button positions (px, edit mode)
    haptic: true,
    aimAssist: 0.5, // 0-1 strength (0 = off)
    invertX: false, invertY: false,
    callouts: true, // voice callouts (TTS) on/off
    muted: false, // v18.3: mute-all
    graphics: { shadows: true, blood: true, muzzle: true, showFps: false, showPing: false, crosshairColor: '#ffffff', fov: 75, brightness: 1.0, autoQuality: true, quality: 'med', hdr: false },
    autoFire: false, // v18.4: hold fire = continuous (auto weapons)
    friendlyFire: true, // v28.0.7: area damage can hurt allies
    volume: { gun: 1.0, voice: 1.0 },
    lang: 'id', // 'id' | 'en'
  };
}

export function loadSettings() {
  const d = defaultSettings();
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return d;
    const s = JSON.parse(raw);
    if (typeof s !== 'object' || !s) return d;
    const out = { ...d, ...s };
    out.keybinds = { ...d.keybinds, ...(s.keybinds || {}) };
    out.sens = { ...d.sens, ...(s.sens || {}) };
    out.graphics = { ...d.graphics, ...(s.graphics || {}) };
    out.volume = { ...d.volume, ...(s.volume || {}) };
    out.btnPos = { ...(s.btnPos || {}) };
    return out;
  } catch { return d; }
}

export function saveSettings(s) {
  try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// Export as a base64 code (shareable), import validates and merges.
export function exportSettings(s) {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(s)))); } catch { return ''; }
}
export function importSettings(code) {
  try {
    const s = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (typeof s !== 'object' || !s) return null;
    const d = defaultSettings();
    const out = { ...d, ...s };
    out.keybinds = { ...d.keybinds, ...(s.keybinds || {}) };
    out.sens = { ...d.sens, ...(s.sens || {}) };
    out.graphics = { ...d.graphics, ...(s.graphics || {}) };
    out.volume = { ...d.volume, ...(s.volume || {}) };
    out.btnPos = { ...(s.btnPos || {}) };
    return out;
  } catch { return null; }
}

// Rebind one action: if the key is already used by another action, that
// action is unbound (set to '') so one key never fires two actions.
export function rebindKey(s, action, code) {
  if (code === 'Escape') return false; // Escape exits pointer lock
  for (const a of KEYBIND_ACTIONS) {
    if (a.action !== action && s.keybinds[a.action] === code) s.keybinds[a.action] = '';
  }
  s.keybinds[action] = code;
  return true;
}

// Human label for a key code (KeyW -> W, Digit1 -> 1, Space -> Space).
export function keyLabel(code) {
  if (!code) return '—';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  if (code === 'AltLeft' || code === 'AltRight') return 'Alt';
  return code;
}

// Main-menu labels in Indonesian and English.
export const STRINGS = {
  id: {
    play: 'CLICK TO PLAY',
    mode: '🎮 GAME MODE', map: '🗺️ MAP — 7 maps, click to preview',
    weather: '🌤️ CUACA + SIKLUS SIANG-MALAM', loadout: '🎒 LOADOUT',
    character: '🧑‍🚀 KARAKTER — operator + outfit', gunsmith: '🔧 GUNSMITH — 5 attachment',
    perks: '✨ PERKS — pick up to 3', mythic: '👑 MYTHIC SKIN',
    bp: '🏆 BATTLE PASS — SEASON 1', finisher: '🎬 MYTHIC FINISHER — round-win cinematic',
    wheel: '🎭 EMOTE WHEEL — custom', card: '🃏 CALLING CARD', shop: '🛒 SHOP',
    quests: '🎯 QUESTS', profile: '👤 PROFIL + RANK', replays: '📼 REPLAY — match history',
    settings: '⚙️ PENGATURAN', keys: '⌨️ TOMBOL',
  },
  en: {
    play: 'CLICK TO PLAY',
    mode: '🎮 GAME MODE', map: '🗺️ MAP — 7 maps, click to preview',
    weather: '🌤️ WEATHER + DAY-NIGHT CYCLE', loadout: '🎒 LOADOUT',
    character: '🧑‍🚀 CHARACTER — operator + outfit', gunsmith: '🔧 GUNSMITH — 5 attachments',
    perks: '✨ PERKS — pick up to 3', mythic: '👑 MYTHIC SKIN',
    bp: '🏆 BATTLE PASS — SEASON 1', finisher: '🎬 MYTHIC FINISHER — round-win cinematic',
    wheel: '🎭 EMOTE WHEEL — custom', card: '🃏 CALLING CARD', shop: '🛒 SHOP',
    quests: '🎯 QUESTS', profile: '👤 PROFILE + RANK', replays: '📼 REPLAY — match history',
    settings: '⚙️ SETTINGS', keys: '⌨️ KEYS',
  },
};
