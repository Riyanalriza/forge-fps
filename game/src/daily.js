// Daily wheel preset + daily reward — local only (localStorage).
// One preset per weekday; claiming is once per day, keyed by date.
import { WHEEL_PRESETS } from './state.js';

const CLAIM_KEY = 'forge_daily_claim_v2';
const EMOTE_XP_KEY = 'forge_daily_emote_xp_v2';
const SKIN_POOL = ['gold', 'neon', 'dragon', 'crimson'];

export const DAILY_MAP = [
  { day: 0, preset: 'love', icon: '💖', name: 'Love Sunday', reason: 'Sunday is for love — hearts and bows all day.', xp: 200, skin: true },
  { day: 1, preset: 'aggressive', icon: '😤', name: 'Aggressive Monday', reason: 'Start the week angry. Taunt everything.', xp: 100, skin: false },
  { day: 2, preset: 'funny', icon: '😂', name: 'Funny Tuesday', reason: 'Tuesday needs laughs — dance and dab.', xp: 100, skin: false },
  { day: 3, preset: 'toxic', icon: '🤢', name: 'Toxic Wednesday', reason: 'Midweek toxicity pays +350 XP.', xp: 350, skin: false },
  { day: 4, preset: 'pro', icon: '🏆', name: 'Pro Thursday', reason: 'Play like a pro. Salute, flex, win.', xp: 100, skin: false },
  { day: 5, preset: 'funny', icon: '😂', name: 'Funny Friday', reason: 'Friday is funny again — the week is almost over.', xp: 100, skin: false },
  { day: 6, preset: 'aggressive', icon: '😤', name: 'Aggressive Saturday', reason: 'Saturday: +400 XP and a random skin.', xp: 400, skin: true },
];

function todayStr() { try { return new Date().toDateString(); } catch { return 'day-0'; } }
function loadJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return fallback;
}
function saveJson(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export function getDaily() {
  const d = new Date();
  const entry = DAILY_MAP[d.getDay()];
  const preset = WHEEL_PRESETS[entry.preset];
  const claim = loadJson(CLAIM_KEY, {});
  const claimed = claim.date === todayStr();
  // Countdown to midnight, local time.
  const midnight = new Date(d); midnight.setHours(24, 0, 0, 0);
  const ms = Math.max(0, midnight - d);
  const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
  return {
    ...entry, presetName: preset.name, emotes: preset.emotes,
    claimed, countdown: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
  };
}

// Claim the daily reward once per day. Returns {ok, xp, skin} or {ok:false}.
export function claimDaily() {
  const claim = loadJson(CLAIM_KEY, {});
  if (claim.date === todayStr()) return { ok: false };
  const entry = DAILY_MAP[new Date().getDay()];
  let skin = null;
  if (entry.skin) skin = SKIN_POOL[Math.floor(Math.random() * SKIN_POOL.length)];
  saveJson(CLAIM_KEY, { date: todayStr(), xp: entry.xp, skin });
  return { ok: true, xp: entry.xp, skin };
}

// Using an emote from today's preset grants +25 XP, once per emote per day.
export function dailyEmoteXp(emoteId) {
  const entry = DAILY_MAP[new Date().getDay()];
  if (!WHEEL_PRESETS[entry.preset].emotes.includes(emoteId)) return 0;
  const rec = loadJson(EMOTE_XP_KEY, {});
  if (rec.date !== todayStr()) { saveJson(EMOTE_XP_KEY, { date: todayStr(), used: [emoteId] }); return 25; }
  if ((rec.used || []).includes(emoteId)) return 0;
  rec.used = [...(rec.used || []), emoteId];
  saveJson(EMOTE_XP_KEY, rec);
  return 25;
}
