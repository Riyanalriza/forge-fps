// Battle Pass — local only (localStorage), 50 tiers, daily missions.
// XP: kill +100, headshot +50, round/match win +200. 500 XP per tier.
const KEY = 'forge_bp_v2';
export const TIER_REWARDS = {
  5: '🟡 Gold Skin', 10: '🟢 Neon Skin', 15: '💃 Dance Emote',
  20: '🐉 Dragon Skin', 25: '🔴 Crimson Skin', 30: '🌌 Galaxy Calling Card',
  35: '❄️ Frost Skin', 40: '🌈 Rainbow Skin',
  45: '👑 Mythic Void Reaper', 50: '🐉 Mythic Inferno Dragon',
};
const MISSIONS = [
  { id: 'kill5', label: 'Kill 5 enemies', target: 5, reward: 100, type: 'kill' },
  { id: 'headshot', label: 'Headshot 3 times', target: 3, reward: 150, type: 'headshot' },
  { id: 'win', label: 'Win 1 round', target: 1, reward: 200, type: 'win' },
];

function today() { try { return new Date().toDateString(); } catch { return 'day-0'; } }
function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const bp = JSON.parse(raw);
      if (bp && typeof bp.xp === 'number') return bp;
    }
  } catch { /* storage unavailable — play without persistence */ }
  return null;
}
function fresh() {
  return {
    xp: 0, tier: 1, date: today(),
    missions: Object.fromEntries(MISSIONS.map((m) => [m.id, 0])),
    claimed: [],
  };
}

export function getBattlePass() {
  let bp = load();
  if (!bp) { bp = fresh(); save(bp); return bp; }
  if (bp.date !== today()) {
    // New day: missions reset, XP and tier stay.
    bp.date = today();
    bp.missions = Object.fromEntries(MISSIONS.map((m) => [m.id, 0]));
    bp.claimed = [];
    save(bp);
  }
  return bp;
}
export function save(bp) {
  try { window.localStorage.setItem(KEY, JSON.stringify(bp)); } catch { /* ignore */ }
}

// Award XP. Returns {tierUp, reward, missionsDone[]} for HUD toasts.
export function addXP(bp, amount, type) {
  const out = { tierUp: 0, reward: null, missionsDone: [] };
  bp.xp += amount;
  if (type) {
    const m = MISSIONS.find((x) => x.type === type);
    if (m && bp.missions[m.id] < m.target) {
      bp.missions[m.id] += 1;
      if (bp.missions[m.id] >= m.target && !bp.claimed.includes(m.id)) {
        bp.claimed.push(m.id);
        out.missionsDone.push({ id: m.id, label: m.label, reward: m.reward });
        bp.xp += m.reward;
      }
    }
  }
  let tier = Math.min(50, Math.floor(bp.xp / 500) + 1);
  if (tier > bp.tier) {
    out.tierUp = tier;
    out.reward = TIER_REWARDS[tier] || '100 Coins';
    bp.tier = tier;
  }
  save(bp);
  return out;
}
export function xpInTier(bp) { return bp.xp - (bp.tier - 1) * 500; }
export function missionList(bp) {
  return MISSIONS.map((m) => ({
    id: m.id, label: m.label, done: bp.missions[m.id] || 0, target: m.target,
    reward: m.reward, claimed: bp.claimed.includes(m.id),
  }));
}
