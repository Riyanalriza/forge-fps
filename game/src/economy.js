// Meta systems: coins, shop, gacha, quests, profile, rank, replay history.
// All local (localStorage). Coins only — no real money, no server, no leaderboard.
export const RANKS = [
  { name: 'Bronze', icon: '🥉', min: 0 },
  { name: 'Silver', icon: '🥈', min: 1100 },
  { name: 'Gold', icon: '🥇', min: 1250 },
  { name: 'Platinum', icon: '💠', min: 1400 },
  { name: 'Diamond', icon: '💎', min: 1600 },
  { name: 'Master', icon: '👑', min: 1800 },
  { name: 'Legendary', icon: '🌟', min: 2000 },
];
export const TITLES = [
  { level: 1, name: 'Rookie' }, { level: 5, name: 'Soldier' },
  { level: 10, name: 'Veteran' }, { level: 15, name: 'Elite' }, { level: 20, name: 'Legend' },
];
export const SHOP_ITEMS = [
  { id: 'op-blade', kind: 'operator', key: 'blade', name: 'Blade', price: 800, rarity: 'rare', icon: '🧔' },
  { id: 'op-captain', kind: 'operator', key: 'captain', name: 'Captain', price: 800, rarity: 'rare', icon: '🎖️' },
  { id: 'op-viper', kind: 'operator', key: 'viper', name: 'Viper', price: 1000, rarity: 'epic', icon: '🐍' },
  { id: 'op-scout', kind: 'operator', key: 'scout', name: 'Scout', price: 1000, rarity: 'epic', icon: '🕶️' },
  { id: 'op-skull', kind: 'operator', key: 'skull', name: 'Skull', price: 1200, rarity: 'epic', icon: '☠️' },
  { id: 'skin-ghillie', kind: 'charSkin', key: 'ghillie', name: 'Ghillie', price: 1000, rarity: 'rare', icon: '🌿' },
  { id: 'skin-samurai', kind: 'charSkin', key: 'samurai', name: 'Samurai', price: 1200, rarity: 'epic', icon: '⚔️' },
  { id: 'skin-zombie', kind: 'charSkin', key: 'zombie', name: 'Zombie', price: 900, rarity: 'rare', icon: '🧟' },
  { id: 'skin-gold', kind: 'charSkin', key: 'gold', name: 'Gold Suit', price: 2000, rarity: 'legendary', icon: '👑' },
  { id: 'skin-stealth', kind: 'charSkin', key: 'stealth', name: 'Stealth', price: 1500, rarity: 'epic', icon: '🥷' },
  // Costume shop (v18.7.4): full outfits with colors/helmet/effect/camo.
  { id: 'cost-desert', kind: 'costume', key: 'desert', name: 'Desert Camo', price: 600, rarity: 'rare', icon: '🏜️' },
  { id: 'cost-snow', kind: 'costume', key: 'snow', name: 'Snow Camo', price: 600, rarity: 'rare', icon: '❄️' },
  { id: 'cost-forest', kind: 'costume', key: 'forest', name: 'Forest Camo', price: 600, rarity: 'rare', icon: '🌲' },
  { id: 'cost-night', kind: 'costume', key: 'night', name: 'Night Camo', price: 900, rarity: 'epic', icon: '🌙' },
  { id: 'cost-huntress', kind: 'costume', key: 'huntress', name: 'Huntress', price: 1200, rarity: 'epic', icon: '🏹' },
  { id: 'cost-empress', kind: 'costume', key: 'empress', name: 'Empress', price: 2200, rarity: 'legendary', icon: '👑' },
  { id: 'cost-dragon', kind: 'costume', key: 'dragon', name: 'Dragon Legend', price: 2000, rarity: 'legendary', icon: '🐉' },
  { id: 'cost-void', kind: 'costume', key: 'void', name: 'Void Legend', price: 2000, rarity: 'legendary', icon: '🌀' },
  { id: 'cost-gold', kind: 'costume', key: 'gold', name: 'Gold Legend', price: 1800, rarity: 'legendary', icon: '🟡' },
  { id: 'cost-neon', kind: 'costume', key: 'neon', name: 'Neon Legend', price: 1500, rarity: 'epic', icon: '🟢' },
  { id: 'mythic-gold', kind: 'mythic', key: 'gold', name: 'Gold', price: 500, rarity: 'common', icon: '🟡' },
  { id: 'mythic-neon', kind: 'mythic', key: 'neon', name: 'Neon', price: 800, rarity: 'rare', icon: '🟢' },
  { id: 'mythic-crimson', kind: 'mythic', key: 'crimson', name: 'Crimson', price: 1000, rarity: 'rare', icon: '🔴' },
  { id: 'mythic-frost', kind: 'mythic', key: 'frost', name: 'Frost', price: 1200, rarity: 'epic', icon: '❄️' },
  { id: 'mythic-rainbow', kind: 'mythic', key: 'rainbow', name: 'Rainbow', price: 1500, rarity: 'epic', icon: '🌈' },
  { id: 'mythic-dragon', kind: 'mythic', key: 'dragon', name: 'Inferno Dragon', price: 3000, rarity: 'legendary', icon: '🐉' },
  { id: 'mythic-void', kind: 'mythic', key: 'void', name: 'Void Reaper', price: 2500, rarity: 'legendary', icon: '👑' },
  { id: 'emote-clap', kind: 'emote', key: 'clap', name: 'Clap', price: 300, rarity: 'common', icon: '👏' },
  { id: 'emote-bow', kind: 'emote', key: 'bow', name: 'Bow', price: 300, rarity: 'common', icon: '🙇' },
  { id: 'emote-flex', kind: 'emote', key: 'flex', name: 'Flex', price: 300, rarity: 'common', icon: '💪' },
  { id: 'emote-cry', kind: 'emote', key: 'cry', name: 'Cry', price: 300, rarity: 'common', icon: '😭' },
  { id: 'veh-car', kind: 'vehicle', key: 'car', name: 'Mobil', price: 1500, rarity: 'rare', icon: '🚗' },
  { id: 'veh-heli', kind: 'vehicle', key: 'heli', name: 'Helikopter', price: 2500, rarity: 'legendary', icon: '🚁' },
  { id: 'veh-moto', kind: 'vehicle', key: 'moto', name: 'Motor', price: 1200, rarity: 'rare', icon: '🏍️' },
];
export const QUEST_DEFS = [
  { id: 'daily-kill', kind: 'daily', name: 'Daily Kill 10', target: 10, reward: 200, stat: 'kills' },
  { id: 'daily-win', kind: 'daily', name: 'Win 2', target: 2, reward: 300, stat: 'wins' },
  { id: 'weekly-kill', kind: 'weekly', name: 'Weekly Kill 50', target: 50, reward: 1000, stat: 'kills' },
];
// Lucky Draw / Crate odds (v26.0.6 — disclosed in the shop UI; coins only,
// never real money): skin 25% / camo 25% / emote 20% / coins 30%.
export const LUCKY_ODDS = [
  { kind: 'skin', label: 'Skin senjata acak', chance: 0.25 },
  { kind: 'camo', label: 'Camo acak', chance: 0.25 },
  { kind: 'emote', label: 'Emote acak', chance: 0.2 },
  { kind: 'coin', label: '+120 Coin', chance: 0.3 },
];
export const CRATE_ODDS = [
  { kind: 'coin', label: '+15 Coin', chance: 0.5 },
  { kind: 'ammo', label: '+60 peluru cadangan', chance: 0.3 },
  { kind: 'medkit', label: '+1 Medkit', chance: 0.2 },
];
const RARITY_W = [['common', 0.6], ['rare', 0.25], ['epic', 0.1], ['legendary', 0.05]];

function load(key, fallback) {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return fallback;
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export function createEconomy() {
  const profile = load('forge_profile_v2', {
    name: 'YOU', avatar: '🎖️', elo: 1000, wins: 0, losses: 0,
    kills: 0, deaths: 0, coins: 1000, xp: 0,
  });
  const owned = load('forge_owned_v2', {
    operators: ['specter'], charSkins: ['default'],
    mythics: ['none', 'gold'], emotes: ['dance', 'wave', 'laugh', 'salute', 'tpose'],
    vehicles: [], costumes: ['default'],
  });
  const questState = load('forge_quests_v2', { day: '', kills: 0, wins: 0, claimed: {}, week: '', wkills: 0, wclaimed: false });
  const replays = load('forge_replays_v2', []);

  function saveAll() {
    save('forge_profile_v2', profile);
    save('forge_owned_v2', owned);
    save('forge_quests_v2', questState);
    save('forge_replays_v2', replays);
  }
  function rank() {
    let r = RANKS[0];
    for (const x of RANKS) if (profile.elo >= x.min) r = x;
    return r;
  }
  function level() { return 1 + Math.floor(profile.xp / 500); }
  function title() {
    let t = TITLES[0].name;
    for (const x of TITLES) if (level() >= x.level) t = x.name;
    return t;
  }
  function kd() { return profile.deaths > 0 ? (profile.kills / profile.deaths).toFixed(2) : String(profile.kills); }
  function addCoins(n) { profile.coins += n; saveAll(); }
  function isOwned(item) {
    const list = item.kind === 'operator' ? owned.operators : item.kind === 'charSkin' ? owned.charSkins
      : item.kind === 'mythic' ? owned.mythics : item.kind === 'emote' ? owned.emotes
      : item.kind === 'costume' ? (owned.costumes || (owned.costumes = ['default'])) : owned.vehicles;
    return list.includes(item.key);
  }
  function grant(item) {
    const list = item.kind === 'operator' ? owned.operators : item.kind === 'charSkin' ? owned.charSkins
      : item.kind === 'mythic' ? owned.mythics : item.kind === 'emote' ? owned.emotes
      : item.kind === 'costume' ? (owned.costumes || (owned.costumes = ['default'])) : owned.vehicles;
    if (!list.includes(item.key)) list.push(item.key);
    saveAll();
  }
  function buy(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item || isOwned(item)) return { ok: false, reason: isOwned(item) ? 'owned' : 'missing' };
    if (profile.coins < item.price) return { ok: false, reason: 'poor' };
    profile.coins -= item.price;
    grant(item);
    return { ok: true, item };
  }
  function gacha(n, rng) {
    const cost = n === 10 ? 900 : 100;
    if (profile.coins < cost) return { ok: false, reason: 'poor' };
    profile.coins -= cost;
    const results = [];
    for (let i = 0; i < n; i++) {
      const roll = (rng ? rng() : Math.random());
      let rarity = 'common', acc = 0;
      for (const [r, w] of RARITY_W) { acc += w; if (roll <= acc) { rarity = r; break; } }
      const pool = SHOP_ITEMS.filter(x => x.rarity === rarity);
      const item = pool[Math.floor((rng ? rng() : Math.random()) * pool.length)];
      const dup = isOwned(item);
      if (dup) profile.coins += 50; else grant(item);
      results.push({ item, dup });
    }
    saveAll();
    return { ok: true, results };
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function weekKey() {
    const d = new Date();
    const jan1 = new Date(d.getFullYear(), 0, 1);
    return `${d.getFullYear()}-W${Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)}`;
  }
  function questProgress() {
    const day = today(), wk = weekKey();
    if (questState.day !== day) { questState.day = day; questState.kills = 0; questState.wins = 0; questState.claimed = {}; }
    if (questState.week !== wk) { questState.week = wk; questState.wkills = 0; questState.wclaimed = false; }
    return QUEST_DEFS.map(q => {
      const cur = q.kind === 'weekly' ? questState.wkills : q.stat === 'kills' ? questState.kills : questState.wins;
      const claimed = q.kind === 'weekly' ? questState.wclaimed : !!questState.claimed[q.id];
      return { ...q, cur, done: cur >= q.target, claimed };
    });
  }
  function recordStat(stat, n = 1) {
    questProgress(); // resets the day/week buckets if needed
    if (stat === 'kills') { questState.kills += n; questState.wkills += n; profile.kills += n; }
    if (stat === 'wins') { questState.wins += n; profile.wins += n; }
    if (stat === 'deaths') profile.deaths += n;
    if (stat === 'losses') profile.losses += n;
    profile.xp += stat === 'kills' ? n * 10 : stat === 'wins' ? n * 50 : 0;
    saveAll();
  }
  function claimQuest(id) {
    const q = questProgress().find(x => x.id === id);
    if (!q || !q.done || q.claimed) return { ok: false };
    if (q.kind === 'weekly') questState.wclaimed = true;
    else questState.claimed[id] = true;
    profile.coins += q.reward;
    saveAll();
    return { ok: true, reward: q.reward };
  }
  function recordMatch(result, m) {
    // result: 'win' | 'loss'. ELO: +25 win, -15 loss.
    profile.elo = Math.max(0, profile.elo + (result === 'win' ? 25 : -15));
    replays.unshift({
      id: Date.now(), date: new Date().toISOString().slice(0, 10),
      mode: m.mode, map: m.map, kills: m.kills, deaths: m.deaths,
      result, duration: m.duration,
    });
    if (replays.length > 20) replays.length = 20;
    saveAll();
  }
  // v23.0.8: Lucky Draw (80 coin) + Crate (10 coin), coins only.
  function luckyDraw(rng) {
    if (profile.coins < 80) return { ok: false, reason: 'poor' };
    profile.coins -= 80;
    const roll = rng ? rng() : Math.random();
    let acc = 0, prize = LUCKY_ODDS[LUCKY_ODDS.length - 1];
    for (const o of LUCKY_ODDS) { acc += o.chance; if (roll <= acc) { prize = o; break; } }
    let detail = prize.label;
    if (prize.kind === 'skin') {
      const pool = SHOP_ITEMS.filter(x => x.kind === 'mythic' && !isOwned(x));
      const item = pool.length ? pool[Math.floor((rng ? rng() : Math.random()) * pool.length)] : null;
      if (item) { grant(item); detail = item.name; } else { profile.coins += 120; detail = '+120 Coin (semua skin dimiliki)'; }
    } else if (prize.kind === 'camo') {
      const camos = ['gold', 'diamond', 'damascus', 'neon', 'red', 'blue'];
      detail = 'Camo ' + camos[Math.floor((rng ? rng() : Math.random()) * camos.length)];
    } else if (prize.kind === 'emote') {
      const pool = SHOP_ITEMS.filter(x => x.kind === 'emote' && !isOwned(x));
      const item = pool.length ? pool[Math.floor((rng ? rng() : Math.random()) * pool.length)] : null;
      if (item) { grant(item); detail = item.name; } else { profile.coins += 120; detail = '+120 Coin (semua emote dimiliki)'; }
    } else { profile.coins += 120; }
    saveAll();
    return { ok: true, prize: prize.kind, detail };
  }
  function crate(rng) {
    if (profile.coins < 10) return { ok: false, reason: 'poor' };
    profile.coins -= 10;
    const roll = rng ? rng() : Math.random();
    let acc = 0, prize = CRATE_ODDS[CRATE_ODDS.length - 1];
    for (const o of CRATE_ODDS) { acc += o.chance; if (roll <= acc) { prize = o; break; } }
    if (prize.kind === 'coin') profile.coins += 15;
    saveAll();
    return { ok: true, prize: prize.kind, detail: prize.label };
  }
  // v23.0.2: per-weapon kill counts for camo unlocks (Gold 100 / Diamond 500).
  function weaponKills() { return load('forge_weapon_kills_v2', {}); }
  function recordWeaponKill(weaponId) {
    const k = weaponKills();
    k[weaponId] = (k[weaponId] || 0) + 1;
    save('forge_weapon_kills_v2', k);
    return k[weaponId];
  }
  function isCamoUnlocked(camo, weaponId) {
    if (camo === 'none' || camo === 'neon' || camo === 'red' || camo === 'blue') return true;
    const k = weaponKills();
    if (camo === 'gold') return (k[weaponId] || 0) >= 100;
    if (camo === 'diamond') return (k[weaponId] || 0) >= 500;
    if (camo === 'damascus') {
      const ids = Object.keys(k);
      return ids.length >= 5 && ids.every(id => (k[id] || 0) >= 100);
    }
    return false;
  }
  // v26.0.3: local analytics — per weapon / map / mode stats + kill heatmap.
  // No server, no other players; purely your own match history, visualized.
  function getAnalytics() {
    return load('forge_analytics_v2', { weapons: {}, maps: {}, modes: {}, heat: [] });
  }
  function trackKill(weaponId, mapId, mode, x, z) {
    const a = getAnalytics();
    a.weapons[weaponId] = (a.weapons[weaponId] || 0) + 1;
    a.maps[mapId] = (a.maps[mapId] || 0) + 1;
    a.modes[mode] = (a.modes[mode] || 0) + 1;
    if (typeof x === 'number') { a.heat.push({ x: Math.round(x), z: Math.round(z) }); if (a.heat.length > 200) a.heat.shift(); }
    save('forge_analytics_v2', a);
  }
  return {
    profile, owned, replays, rank, level, title, kd,
    addCoins, isOwned, grant, buy, gacha, questProgress, recordStat, claimQuest, recordMatch, saveAll,
    luckyDraw, crate, weaponKills, recordWeaponKill, isCamoUnlocked, getAnalytics, trackKill,
  };
}
