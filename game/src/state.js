export const WEAPONS_DB = [
  { id: 'vk9', name: 'VK-9 Jackal', cls: 'AR', price: 0, magSize: 30, dmg: 34, headMult: 4, rate: 0.11, reload: 2.1, spread: 0.011, zoom: 1.15, auto: true, recoil: 1.0, range: 45, pellets: 1, projectile: null, blastR: 0, haptic: 25, sound: 'vk9' },
  { id: 'm4', name: 'M4 Carbine', cls: 'AR', price: 1400, magSize: 30, dmg: 28, headMult: 4, rate: 0.09, reload: 1.9, spread: 0.009, zoom: 1.2, auto: true, recoil: 0.85, range: 42, pellets: 1, projectile: null, blastR: 0, haptic: 40, sound: 'm4' },
  { id: 'ak117', name: 'AX-117 Wolverine', cls: 'AR', price: 1800, magSize: 30, dmg: 30, headMult: 4, rate: 0.095, reload: 2.0, spread: 0.010, zoom: 1.2, auto: true, recoil: 0.95, range: 44, pellets: 1, projectile: null, blastR: 0, haptic: 40, sound: 'ak117' },
  { id: 'lr50', name: 'LR-50 Longbow', cls: 'Sniper', price: 2700, magSize: 5, dmg: 110, headMult: 4, rate: 1.4, reload: 3.0, spread: 0.0015, zoom: 3.2, auto: false, recoil: 2.2, range: 120, pellets: 1, projectile: null, blastR: 0, haptic: 100, sound: 'lr50' },
  { id: 'qq9', name: 'VX-9 Stinger', cls: 'SMG', price: 1600, magSize: 40, dmg: 24, headMult: 4, rate: 0.07, reload: 1.7, spread: 0.016, zoom: 1.1, auto: true, recoil: 0.7, range: 28, pellets: 1, projectile: null, blastR: 0, haptic: 25, sound: 'qq9' },
  { id: 'rpd', name: 'RPD', cls: 'LMG', price: 2200, magSize: 75, dmg: 32, headMult: 4, rate: 0.13, reload: 3.4, spread: 0.014, zoom: 1.15, auto: true, recoil: 1.3, range: 55, pellets: 1, projectile: null, blastR: 0, haptic: 60, sound: 'rpd' },
  { id: 'p12', name: 'P-12 Sidewinder', cls: 'Pistol', price: 500, magSize: 7, dmg: 45, headMult: 2, rate: 0.32, reload: 1.6, spread: 0.008, zoom: 1.1, auto: false, recoil: 1.1, range: 25, pellets: 1, projectile: null, blastR: 0, haptic: 20, sound: 'p12' },
  { id: 'by15', name: 'B12 Breacher', cls: 'Shotgun', price: 1900, magSize: 5, dmg: 12, headMult: 2, rate: 0.9, reload: 2.5, spread: 0.05, zoom: 1.1, auto: false, recoil: 2.5, range: 18, pellets: 8, projectile: null, blastR: 0, haptic: 80, sound: 'shotgun' },
  { id: 'krm', name: 'SG-12 Marauder', cls: 'Shotgun', price: 2100, magSize: 6, dmg: 11, headMult: 2, rate: 0.85, reload: 2.5, spread: 0.045, zoom: 1.1, auto: false, recoil: 2.4, range: 20, pellets: 8, projectile: null, blastR: 0, haptic: 80, sound: 'shotgun' },
  { id: 'kilo', name: 'KB-50 Longshot', cls: 'DMR', price: 2400, magSize: 10, dmg: 50, headMult: 2, rate: 0.5, reload: 2.2, spread: 0.004, zoom: 2.0, auto: false, recoil: 1.4, range: 70, pellets: 1, projectile: null, blastR: 0, haptic: 40, sound: 'dmr' },
  { id: 'sks', name: 'SKS', cls: 'DMR', price: 2300, magSize: 10, dmg: 55, headMult: 2, rate: 0.45, reload: 2.2, spread: 0.005, zoom: 2.0, auto: false, recoil: 1.5, range: 65, pellets: 1, projectile: null, blastR: 0, haptic: 40, sound: 'dmr' },
  { id: 'rpg', name: 'RPG-7', cls: 'Launcher', price: 3000, magSize: 1, dmg: 150, headMult: 1, rate: 1.0, reload: 3.0, spread: 0.002, zoom: 1.1, auto: false, recoil: 2.5, range: 60, pellets: 1, projectile: 'rocket', blastR: 5, haptic: 120, sound: 'launcher' },
  { id: 'fhj', name: 'AP-18 Prowler', cls: 'Launcher', price: 3200, magSize: 2, dmg: 130, headMult: 1, rate: 1.2, reload: 3.0, spread: 0.002, zoom: 1.1, auto: false, recoil: 2.4, range: 60, pellets: 1, projectile: 'fhj', blastR: 4, haptic: 120, sound: 'launcher' },
  { id: 'thumper', name: 'TH-40 Lobber', cls: 'Launcher', price: 2600, magSize: 1, dmg: 120, headMult: 1, rate: 1.0, reload: 2.8, spread: 0.002, zoom: 1.1, auto: false, recoil: 2.2, range: 45, pellets: 1, projectile: 'thumper', blastR: 3, haptic: 100, sound: 'launcher' },
  { id: 'dual', name: 'Dual Pistol', cls: 'Pistol', price: 1500, magSize: 24, dmg: 22, headMult: 2, rate: 0.18, reload: 2.0, spread: 0.012, zoom: 1.1, auto: false, recoil: 0.9, range: 22, pellets: 2, projectile: null, blastR: 0, haptic: 20, sound: 'p12' },
  { id: 'katana', name: 'Katana', cls: 'Melee', price: 1200, magSize: 1, dmg: 75, headMult: 1, rate: 0.6, reload: 0, spread: 0, zoom: 1.0, auto: false, recoil: 0, range: 2.5, pellets: 1, projectile: null, blastR: 0, haptic: 30, sound: 'melee', melee: true },
  { id: 'crossbow', name: 'Crossbow', cls: 'Crossbow', price: 2500, magSize: 1, dmg: 70, headMult: 3, rate: 1.2, reload: 2.0, spread: 0.001, zoom: 1.5, auto: false, recoil: 0.5, range: 80, pellets: 1, projectile: 'arrow', blastR: 0, haptic: 20, sound: 'crossbow' },
  { id: 'mp5', name: 'MP5', cls: 'SMG', price: 1700, magSize: 40, dmg: 22, headMult: 4, rate: 0.08, reload: 1.8, spread: 0.014, zoom: 1.1, auto: true, recoil: 0.6, range: 26, pellets: 1, projectile: null, blastR: 0, haptic: 25, sound: 'qq9' },
  { id: 'pdw', name: 'PW-9 Wasp', cls: 'SMG', price: 1800, magSize: 50, dmg: 21, headMult: 4, rate: 0.09, reload: 1.9, spread: 0.015, zoom: 1.1, auto: true, recoil: 0.65, range: 24, pellets: 1, projectile: null, blastR: 0, haptic: 25, sound: 'qq9' },
  { id: 'm4lmg', name: 'M4LMG', cls: 'LMG', price: 2400, magSize: 75, dmg: 30, headMult: 4, rate: 0.12, reload: 3.8, spread: 0.013, zoom: 1.15, auto: true, recoil: 1.2, range: 55, pellets: 1, projectile: null, blastR: 0, haptic: 60, sound: 'rpd', heat: true },
  { id: 'arctic', name: 'GL-50 Frostbite', cls: 'Sniper', price: 3000, magSize: 5, dmg: 100, headMult: 1.8, rate: 1.5, reload: 3.2, spread: 0.001, zoom: 3.2, auto: false, recoil: 2.4, range: 130, pellets: 1, projectile: null, blastR: 0, haptic: 100, sound: 'lr50' },
];
export const WEAPONS = WEAPONS_DB;
const PEN_BY_CLS = { AR: 0.6, SMG: 0.4, Sniper: 0.9, DMR: 0.8, LMG: 0.7, Shotgun: 0.3, Launcher: 1, Pistol: 0.4, Melee: 0, Crossbow: 0.85 };
const DROP_BY_CLS = { Sniper: 0.02, DMR: 0.01, AR: 0.005, LMG: 0.005, Crossbow: 0.015 };
const RECOIL_PAT = {
  ak117: { up: 1, side: 0.6 }, vk9: { up: 1, side: 0.1 }, m4: { up: 0.9, side: 0 },
  mp5: { up: 0.4, side: 0.1 }, qq9: { up: 0.5, side: 0.2 }, pdw: { up: 0.4, side: 0.15 },
  rpd: { up: 0.8, side: 0.3 }, m4lmg: { up: 0.9, side: 0.3 },
  lr50: { up: 2.2, side: 0 }, arctic: { up: 2.0, side: 0 },
  kilo: { up: 1.2, side: 0.1 }, sks: { up: 1.1, side: 0.1 },
  by15: { up: 2.2, side: 0.2 }, krm: { up: 2.1, side: 0.2 },
};
for (const w of WEAPONS_DB) {
  w.pen = PEN_BY_CLS[w.cls] ?? 0.5;
  w.drop = DROP_BY_CLS[w.cls] ?? 0;
  w.recoilPat = RECOIL_PAT[w.id] || { up: 1, side: 0.2 };
}
export function calcBulletDrop(dist, w) { return (w?.drop || 0) * Math.max(0, dist - 30); }
export function calcTravelTime(dist, w) {
  const speed = w?.cls === 'Sniper' ? 300 : w?.cls === 'DMR' ? 260 : 400;
  return dist / speed;
}
export function calcHitboxDamage(dmg, part) {
  if (part === 'head') return dmg * 2;
  if (part === 'legs') return dmg * 0.8;
  return dmg;
}
export const DEFAULT_OWNED = WEAPONS_DB.map(w => w.id === 'vk9' || w.id === 'p12');

export const PERK_DEFS = [
  { id: 'ghost', name: 'Phantom', icon: '👻', desc: 'Bots spot you at half range' },
  { id: 'lightweight', name: 'Lightweight', icon: '⚡', desc: '+15% move speed' },
  { id: 'hardline', name: 'Hardline', icon: '🎯', desc: 'Killstreaks need 1 fewer kill' },
  { id: 'quickfix', name: 'Quick Fix', icon: '💚', desc: 'Health regen 2x faster' },
  { id: 'dead_silence', name: 'Dead Silence', icon: '🤫', desc: 'Bots hear your shots at half range' },
  { id: 'flak_jacket', name: 'Flak Jacket', icon: '🛡️', desc: '-40% blast damage taken' },
  { id: 'cold_blooded', name: 'Cold-Blooded', icon: '❄️', desc: 'Bots detect you 20% closer' },
  { id: 'tracker', name: 'Tracker', icon: '👣', desc: 'Enemy shots mark them on the minimap' },
  { id: 'tune_up', name: 'Tune Up', icon: '🔧', desc: 'Operator skill recharges 25% faster' },
  { id: 'overkill', name: 'Overkill', icon: '🔫', desc: 'Secondary slot can hold a primary weapon' },
  { id: 'restock', name: 'Restock', icon: '🔄', desc: 'Grenades refill every 30s' },
  { id: 'high_alert', name: 'High Alert', icon: '🚨', desc: 'Screen edge pulses when a bot aims at you' },
  { id: 'alert', name: 'Alert', icon: '👂', desc: 'Hear bot footsteps louder (minimap ping)' },
  { id: 'engineer', name: 'Engineer', icon: '⚙️', desc: 'See enemy streaks + trip mines through walls' },
  { id: 'shrapnel', name: 'Shrapnel', icon: '💥', desc: '+25% grenade and blast damage' },
  { id: 'tactician', name: 'Tactician', icon: '🧪', desc: '+1 tactical grenade of each kind' },
  { id: 'tactical_mask', name: 'Tactical Mask', icon: '😷', desc: 'Flash blindness lasts half as long' },
  { id: 'gung_ho', name: 'Gung-Ho', icon: '🏃', desc: 'Reload while sprinting' },
  { id: 'skulker', name: 'Skulker', icon: '🐱', desc: 'Crouch moves 30% faster' },
  { id: 'demo_expert', name: 'Demo Expert', icon: '🧨', desc: '+25% explosive damage' },
];

export const OPERATOR_DEFS = {
  tempest: { name: 'Tempest', icon: '⚡', cooldown: 60, desc: 'Next shot is a one-hit lightning bolt' },
  annihilator: { name: 'Annihilator', icon: '🔫', cooldown: 50, desc: 'Next 6 shots deal 200 damage' },
  gravity: { name: 'Gravity Spikes', icon: '💥', cooldown: 70, desc: 'Slam: 80 damage to bots within 8m' },
  warmachine: { name: 'War Machine', icon: '💣', cooldown: 70, desc: 'Grenade launcher — lobs 6 HE grenades at your crosshair' },
  hive: { name: 'H.I.V.E', icon: '🐝', cooldown: 65, desc: 'Deploy 3 trap mines that explode on approach' },
  bull: { name: 'Bull Charge', icon: '🐂', cooldown: 55, desc: 'Charge forward — 100 damage to bots in your path' },
  purifier: { name: 'Purifier', icon: '🔥', cooldown: 75, desc: 'Flamethrower cone: 60 damage + fire zone' },
  sparrow: { name: 'Sparrow', icon: '🏹', cooldown: 60, desc: 'Explosive arrow: 150 blast at the crosshair' },
  tak5: { name: 'Tak-5', icon: '💚', cooldown: 80, desc: 'Heal to full + revive knocked ally bots' },
  k9: { name: 'K9 Unit', icon: '🐕', cooldown: 70, desc: 'Attack dog: bites the nearest bot for 20 damage' },
};

export const STREAK_DEFS = [
  { at: 3, id: 'uav', name: 'UAV', icon: '🛰️', desc: 'Reveal bots on the minimap for 20s', cost: 300 },
  { at: 4, id: 'predator', name: 'Predator Missile', icon: '🚀', desc: 'Guided missile at your crosshair — 8m blast, 150 damage', cost: 450 },
  { at: 5, id: 'hunter', name: 'Hunter Killer', icon: '🚁', desc: 'Drone auto-kills a random bot', cost: 500 },
  { at: 6, id: 'heli', name: 'Attack Heli', icon: '🚁', desc: 'Attack heli circles overhead for 30s', cost: 900 },
  { at: 7, id: 'sentry', name: 'Sentry Gun', icon: '🤖', desc: 'Auto-turret guards you for 15s', cost: 1200 },
  { at: 8, id: 'stealth', name: 'Stealth Chopper', icon: '🥷', desc: 'Silent heli for 45s — no warning to bots', cost: 1400 },
  { at: 9, id: 'airstrike', name: 'Airstrike', icon: '💣', desc: 'Plane flies over, 3 blasts in the target area', cost: 600 },
  { at: 10, id: 'vtol', name: 'VTOL', icon: '🛩️', desc: 'VTOL makes 3 strafing passes, 100 damage each', cost: 1600 },
  { at: 12, id: 'swarm', name: 'Swarm', icon: '🐝', desc: '5 hunter drones kill 5 random bots', cost: 2000 },
  { at: 20, id: 'nuke', name: 'Nuke', icon: '☢️', desc: '2000 points — every enemy bot dies', cost: 2000 },
];

export const MODE_DEFS = {
  snd: { name: 'Search & Destroy', desc: 'Plant the charge at a bomb site, defend it until it blows — or clear every hostile.', timer: 100, target: 3 },
  tdm: { name: 'Team Deathmatch', desc: 'First to 15 kills wins. Bots respawn; so do you.', timer: 300, target: 15 },
  dom: { name: 'Domination', desc: 'Hold zones A / B / C. Each held zone scores 1 point per second. First to 100 wins.', timer: 300, target: 100 },
  br: { name: 'Battle Royale Mini', desc: 'The zone shrinks. Stay inside it and be the last one standing.', timer: 180, target: 5 },
  zombie: { name: 'Zombie Mode', desc: 'Waves 1-20 of zombies. Boss every 5 waves. Survive them all.', timer: 9999, target: 20 },
  hardpoint: { name: 'Hardpoint', desc: 'Hold the center point — 1 point per second inside it. First to 50 wins.', timer: 300, target: 50 },
  gungame: { name: 'Gun Game', desc: 'Each kill upgrades your weapon: Pistol → MP5 → AX-117 → B12 → LR-50 → RPG-7 → Knife. First to finish the ladder wins.', timer: 300, target: 7 },
  prophunt: { name: 'Prop Hunt', desc: 'You are a prop (box or chair). Hide for 20 seconds while the bot hunters search.', timer: 20, target: 1 },
  control: { name: 'Control', desc: 'Capture points A and B. Win when both are yours.', timer: 300, target: 2 },
  killconfirmed: { name: 'Kill Confirmed', desc: 'Bots drop dog tags when they die. Collect tags — first to 20 wins.', timer: 300, target: 20 },
  ffa: { name: 'Free-For-All', desc: 'Everyone against everyone. First to 20 kills wins.', timer: 300, target: 20 },
  sniperonly: { name: 'Sniper Only', desc: 'Only KB-50 and GL-50 Frostbite. One shot, one lesson.', timer: 300, target: 15 },
};

export const DIFFICULTY_DEFS = {
  easy: { name: 'Easy', reaction: 1.2, aimErr: 0.14, dmg: 0.7, hp: 0.9 },
  normal: { name: 'Normal', reaction: 0.8, aimErr: 0.09, dmg: 1, hp: 1 },
  hard: { name: 'Hard', reaction: 0.5, aimErr: 0.05, dmg: 1.2, hp: 1.1 },
  veteran: { name: 'Veteran', reaction: 0.3, aimErr: 0.02, dmg: 1.5, hp: 1.25 },
};

export const FLAGS = { hardcore: false, realistic: false, colorblind: false, batterySaver: false, dynRes: true, fpsLimit: 0 };
export function setFlag(name, v) { if (name in FLAGS) FLAGS[name] = !!v; return FLAGS[name]; }
export function toggleFlag(name) { if (name in FLAGS) FLAGS[name] = !FLAGS[name]; return FLAGS[name]; }

export const MYTHIC_DEFS = {
  none: { name: 'Standard', body: 0x2b2f33, glow: 0x000000, fx: null, tier: 0 },
  gold: { name: '🟡 Gold', body: 0xffcc00, glow: 0xffcc00, fx: null, tier: 5 },
  neon: { name: '🟢 Neon', body: 0x00ff88, glow: 0x00ff88, fx: null, tier: 10 },
  crimson: { name: '🔴 Crimson', body: 0xcc1122, glow: 0xff2244, fx: null, tier: 25 },
  frost: { name: '❄️ Frost', body: 0xaaeeff, glow: 0x66ccff, fx: null, tier: 35 },
  rainbow: { name: '🌈 Rainbow', body: 0xff00ff, glow: 0xffffff, fx: 'rainbow', tier: 40 },
  dragon: { name: '🐉 Inferno Dragon', body: 0xff2200, glow: 0xffaa00, fx: 'fire', tier: 50 },
  void: { name: '👑 Void Reaper', body: 0x8a00ff, glow: 0x00ffff, fx: 'void', tier: 45 },
};

export const CARD_DEFS = {
  firestorm: { name: '🔥 Firestorm', css: 'firestorm', desc: 'Burning fire' },
  galaxy: { name: '🌌 Galaxy', css: 'galaxy', desc: 'Moving stars' },
  lightning: { name: '⚡ Lightning', css: 'lightning', desc: 'Striking bolts' },
  dragon: { name: '🐉 Dragon Lord', css: 'dragon', desc: 'Flying dragon' },
};

export const EMOTE_DEFS = {
  dance: { name: 'Dance', icon: '💃', key: '4' },
  wave: { name: 'Wave', icon: '👋', key: '5' },
  laugh: { name: 'Laugh', icon: '😂', key: '6' },
  salute: { name: 'Salute', icon: '🫡', key: '7' },
  tpose: { name: 'T-Pose', icon: '🧍', key: '8' },
  dab: { name: 'Dab', icon: '🕺', key: '' },
  heart: { name: 'Heart', icon: '❤️', key: '' },
  taunt: { name: 'Taunt', icon: '😤', key: '' },
  clap: { name: 'Clap', icon: '👏', key: '' },
  bow: { name: 'Bow', icon: '🙇', key: '' },
  flex: { name: 'Flex', icon: '💪', key: '' },
  cry: { name: 'Cry', icon: '😭', key: '' },
  sit: { name: 'Sit', icon: '🧎', key: '' },
  pushup: { name: 'Push-up', icon: '🏋️', key: '' },
  scratch: { name: 'Garuk Kepala', icon: '🤔', key: '' },
  cough: { name: 'Batuk', icon: '😷', key: '' },
  sneeze: { name: 'Bersin', icon: '🤧', key: '' },
  drink: { name: 'Minum', icon: '🥤', key: '' },
  eat: { name: 'Makan', icon: '🍔', key: '' },
  phone: { name: 'Cek HP', icon: '📱', key: '' },
  sleep: { name: 'Tidur', icon: '😴', key: '' },
};

export const WHEEL_PRESETS = {
  default: { name: 'Default', icon: '🎮', emotes: ['dance', 'wave', 'laugh', 'salute', 'tpose', 'dab', 'heart', 'taunt'] },
  aggressive: { name: 'Aggressive', icon: '😤', emotes: ['taunt', 'flex', 'salute', 'dab', 'tpose', 'laugh', 'dance', 'cry'] },
  funny: { name: 'Funny', icon: '😂', emotes: ['laugh', 'dance', 'dab', 'cry', 'wave', 'tpose', 'heart', 'taunt'] },
  toxic: { name: 'Toxic', icon: '🤢', emotes: ['taunt', 'laugh', 'cry', 'dab', 'dance', 'flex', 'salute', 'wave'] },
  pro: { name: 'Pro', icon: '🏆', emotes: ['salute', 'wave', 'flex', 'dance', 'dab', 'tpose', 'laugh', 'heart'] },
  love: { name: 'Love', icon: '💖', emotes: ['heart', 'wave', 'bow', 'laugh', 'dance', 'clap', 'salute', 'cry'] },
};

export const FINISHER_DEFS = {
  execution: { name: 'Execution', icon: '🎯', desc: 'Slow-mo zoom kill', dur: 2.5, mythic: false },
  dragon: { name: 'Dragon Wrath', icon: '🐉', desc: '3 giant dragons breathe fire', dur: 4, mythic: true },
  void: { name: 'Void Collapse', icon: '🌀', desc: 'Giant black hole swallows the yard', dur: 4, mythic: true },
  gold: { name: 'Gold Rain', icon: '🪙', desc: '50 gold coins rain down', dur: 4, mythic: false },
  neon: { name: 'Neon Storm', icon: '⚡', desc: '8 neon lasers + glitch cubes', dur: 4, mythic: false },
  crimson: { name: 'Crimson Hunt', icon: '🔪', desc: 'Red fog + spinning blades', dur: 4, mythic: false },
  frost: { name: 'Frost Nova', icon: '❄️', desc: 'Ice crystals + expanding ice ring', dur: 4, mythic: false },
  rainbow: { name: 'Rainbow Party', icon: '🌈', desc: '60 confetti + 7-color rainbow', dur: 4, mythic: false },
};

export function createState(rng) {
  return {
    rng, time: 0, seed: 1,
    phase: 'menu',
    mode: 'snd',
    round: { num: 1, wins: 0, losses: 0, timer: 100, maxRounds: 5, winAt: 3, result: '' },
    player: {
      x: 0, y: 0, z: 24, yaw: 0, pitch: 0, vx: 0, vz: 0,
      eye: 1.62, crouched: false, prone: false, sliding: false, slideT: 0,
      onGround: true, vy: 0, recoilPitch: 0, lastShotT: -99,
      hp: 100, armor: 0, alive: true, speed: 0, moving: false,
      weaponIdx: 0, spreadBloom: 0,
      respawnT: 0, lastHurtT: -99, regenT: 0,
    },
    loadout: { primary: 0, secondary: 6 },
    weapons: WEAPONS.map((w) => ({
      ...w, mag: w.magSize, reserve: w.magSize * 3,
      lastShot: -9, reloading: false, reloadT: 0,
    })),
    owned: [...DEFAULT_OWNED],
    economy: { money: 800 },
    perks: [],
    operator: 'tempest', opCd: 0, opShots: 0, opActive: false,
    charOp: 'specter', charSkin: 'default',
    costume: 'default',
    atts: { barrel: 'standard', scope: 'iron', grip: 'none', stock: 'standard', mag: 'normal', muzzle: 'none', laser: 'none', perk: 'none' },
    weaponCamo: 'none',
    weather: 'clear', weatherSelect: 'clear', weatherAuto: false, mapWeatherOn: true,
    cycleOn: false, cycleT: 0, cyclePhase: 'day', weatherManual: false,
    joyMag: 0,
    lastKiller: null, spectate: null,
    spectateFree: false,
    freeCam: { x: 0, y: 3, z: 0 },
    windAmp: 1,
    streak: 0, streaksReady: [],
    score: 0,
    nukeReady: false, nukeUsed: false,
    knockT: 0, knockReviveT: 0,
    multiKill: { count: 0, lastT: -99 },
    markedBot: null,
    flashlightOn: false,
    radioOn: false,
    lightsOutT: 0,
    parachuting: false,
    medkits: 2, armorKits: 1,
    medkitChannel: 0,
    reloadFrac: 0, reloadSecs: 0, reloadStage: '',
    ggIdx: 0,
    hardpoint: { you: 0, bot: 0 },
    fireZones: [],
    c4: null,
    tripmines: [],
    droppedWeapons: [],
    uavT: 0,
    sentry: null,
    heli: null,
    airstrike: null,
    bots: [],
    bomb: { state: 'none', site: null, x: 0, z: 0, plantT: 0, fuse: 40, defuseT: 0, defuser: -1 },
    dom: {
      A: { value: 0, owner: null }, B: { value: 0, owner: null }, C: { value: 0, owner: null },
      points: { you: 0, bot: 0 },
    },
    br: { radius: 40, cx: 0, cz: 0, shrinkT: 0 },
    grenades: { smoke: 2, flash: 1, he: 1, molotov: 1, c4: 1, tripmine: 1, trophy: 1, gas: 1, cryo: 1, smokes: [], flying: [] },
    kills: 0, botKills: 0, shotsFired: 0, shotsHit: 0, headshots: 0,
    mythic: 'none', card: 'firestorm',
    mapId: 'foundry',
    emote: null,
    wheel: ['dance', 'wave', 'laugh', 'salute', 'tpose', 'dab', 'heart', 'taunt'],
    finisherSel: 'execution',
    finisher: null,
    pendingEnd: null,
    noFinisher: false,
    unlockedSkins: [],
    events: [],
    lastShotPos: null,
    noise: null,
    stamina: 100, windT: 0,
    diveT: 0, fallDmg: 0, fallDrop: 0, landedSoft: false, diveLanded: false,
    swimT: 0, diving: false, diveBreathT: 10,
    mudT: 0,
    droneMark: false,
    noCountdown: false,
    isMobile: false,
    indoors: false, surface: 'concrete',
    lean: 0, zoomLevel: 0, laserOn: false, breathT: 2,
    wetT: 0, minimapDanger: false, firstBloodDone: false,
    lastKillCause: null, meleeBackstab: false, barrelHot: false, gunBlood: 0,
    wmQueue: null,
    planeT: 0, brPlane: null,
    propDisguise: null,
    control: { A: null, B: null },
    flashT: 0,
    msg: '', msgT: 0,
    bp: null,
    kcTags: [],
    kcScore: 0, ffaKills: 0,
    timeScale: 1, timeScaleT: 0, freezeT: 0,
    nightVision: false, thermal: false, mounted: false, hideT: 0,
    gravityMul: 1,
    trackMark: null,
    colorChoices: null, weaponColor: 'steel', costumeColor: 'default',
    difficulty: 'normal', spawnProtT: 0, weaponStats: {}, achievements: {},
    hardcore: false, realistic: false, colorblind: false,
    engineStats: { fps: 0, draws: 0, tris: 0, ram: 0 },
    hint: '',
    tacSprint: false,
    papWeapons: [],
    perkCola: [],
    maxHp: 100,
    trophySys: null,
    gasClouds: [],
    frozenBots: [],
    k9: null,
    vtolPasses: 0,
    stealthT: 0,
  };
}
