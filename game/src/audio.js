// Procedural WebAudio only. Every call guarded — a missing AudioContext never throws.
import { fxFor } from './weaponfx.js';

export function createAudio() {
  let ctx = null;
  const cinematicTimers = [];
  let rotorNodes = null; // attack-heli rotor oscillators (one pair, started/stopped)
  let vehicleNodes = null; // vehicle engine hum (one pair, started/stopped)
  let lobbyNodes = null; // lobby pad (one pair, started/stopped)
  let ambientSrc = null, ambientKind = null, ambientBirdTimer = null, ambientGain = null;
  let gunVol = 1, voiceVol = 1, calloutsOn = true; // v17.3 separate volumes
  let muted = false; // v18.3: mute-all silences every sound
  let hapticOn = true; // v28.0.1: vibration master switch
  let mobile = false; // v18.4: phone speakers get a bass boost in shot()
  // Reload sound groups (2026-11-16, Priority 2): the shot sound was
  // already per weapon via WEAPON_FX, but the reload clicks were one
  // generic sound for all 21 weapons. Belt-fed and pump guns are deep,
  // bolt guns rack metallic, launchers clunk heavy, crossbow twangs a
  // string, pistols click light. Groups not listed use the standard click.
  const RELOAD_CLS = {
    rpd: 'belt', m4lmg: 'belt', by15: 'pump', krm: 'pump',
    lr50: 'bolt', kilo: 'bolt', sks: 'bolt', arctic: 'bolt',
    rpg: 'tube', fhj: 'tube', thumper: 'break', crossbow: 'string',
    p12: 'light', dual: 'light',
  };
  function stopAmbient() {
    if (ambientBirdTimer) { clearInterval(ambientBirdTimer); ambientBirdTimer = null; }
    const s = ambientSrc, g = ambientGain; ambientSrc = null; ambientGain = null;
    if (s) {
      try {
        const c = ac();
        if (c && g) { g.gain.cancelScheduledValues(c.currentTime); g.gain.setValueAtTime(g.gain.value, c.currentTime); g.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.4); }
        setTimeout(() => { try { s.stop(); } catch { /* ignore */ } }, 450);
      } catch { try { s.stop(); } catch { /* ignore */ } }
    }
    ambientKind = null;
  }
  function stopCinematic() {
    for (const id of cinematicTimers) clearTimeout(id);
    cinematicTimers.length = 0;
  }
  function ac() {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    } catch { return null; }
  }
  function tone(freq, dur, type = 'square', vol = 0.12, slide = 0, pos = null) {
    if (muted) return;
    const c = ac(); if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), c.currentTime + dur);
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.linearRampToValueAtTime(vol * gunVol, c.currentTime + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g); route(g, pos);
      o.start(); o.stop(c.currentTime + dur);
    } catch { /* ignore */ }
  }
  function noise(dur, vol = 0.25, low = 400, pos = null) {
    if (muted) return;
    const c = ac(); if (!c) return;
    try {
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(vol * gunVol, c.currentTime + 0.02);
      src.connect(f); f.connect(g); route(g, pos); src.start();
    } catch { /* ignore */ }
  }
  let lastCallout = 0;
  let steps = 0; // footstep counter (self-test reads it via stepCount)
  // 3D positional audio (combat-feedback pass): one shared listener,
  // updated once per frame from game.step(); any sound given a world
  // position routes through a PannerNode (HRTF, linear falloff to 60m)
  // so it pans left/right and fades with distance. Sounds without a
  // position (own gun, UI, voice) stay flat. Headless tests read
  // spatialCount() / lastSpatial() — no speaker needed to prove the
  // direction + falloff. Angle convention matches hud.js dmgAngle:
  // ahead 0, right +90, behind +/-180, left -90.
  let listener = { x: 0, y: 1.6, z: 0, yaw: 0 };
  let spatialPlays = 0, lastSpatial = null;
  function route(g, pos, maxDist) {
    const c = ac(); if (!c) return;
    if (!pos || !c.createPanner) { try { g.connect(c.destination); } catch { /* ignore */ } return; }
    try {
      const pn = c.createPanner();
      pn.panningModel = 'HRTF'; pn.distanceModel = 'linear';
      pn.refDistance = 1; pn.maxDistance = maxDist || 60; pn.rolloffFactor = 1;
      if (pn.positionX) { pn.positionX.value = pos.x; pn.positionY.value = pos.y || 0; pn.positionZ.value = pos.z; }
      else pn.setPosition(pos.x, pos.y || 0, pos.z);
      g.connect(pn); pn.connect(c.destination);
      spatialPlays += 1;
      const dx = pos.x - listener.x, dy = (pos.y || 0) - listener.y, dz = pos.z - listener.z;
      const d = Math.hypot(dx, dy, dz) || 0.001;
      const fx = -Math.sin(listener.yaw), fz = -Math.cos(listener.yaw);
      const rx = Math.cos(listener.yaw), rz = -Math.sin(listener.yaw);
      const ang = Math.atan2((dx * rx + dz * rz) / d, (dx * fx + dz * fz) / d) * 180 / Math.PI;
      const max = maxDist || 60;
      lastSpatial = { x: pos.x, y: pos.y || 0, z: pos.z, dist: Math.round(d * 10) / 10, angleDeg: Math.round(ang * 10) / 10, gain: d <= 1 ? 1 : Math.max(0, Math.round((1 - (d - 1) / (max - 1)) * 100) / 100) };
    } catch { try { g.connect(c.destination); } catch { /* ignore */ } }
  }
  function stepInterval(speed) { // stride 2.3m: walk 6 -> 0.38s, sprint 9 -> 0.26s, crouch 3 -> 0.77s, prone 2.1 -> 1.1s
    return Math.max(0.2, Math.min(1.2, 2.3 / Math.max(0.5, speed || 6)));
  }
  return {
    unlock() { ac(); },
    stepCount() { return steps; },
    // Listener follows the camera (called once per frame from game.step).
    // Also drives the real AudioListener so the panning is audible, not
    // just recorded in lastSpatial().
    setListener(x, y, z, yaw) {
      listener = { x: x || 0, y: y == null ? 1.6 : y, z: z || 0, yaw: yaw || 0 };
      const c = ac(); if (!c || !c.listener) return;
      try {
        const l = c.listener;
        const fx = -Math.sin(listener.yaw), fz = -Math.cos(listener.yaw);
        if (l.positionX) { l.positionX.value = listener.x; l.positionY.value = listener.y; l.positionZ.value = listener.z; l.forwardX.value = fx; l.forwardY.value = 0; l.forwardZ.value = fz; l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0; }
        else { l.setPosition(listener.x, listener.y, listener.z); l.setOrientation(fx, 0, fz, 0, 1, 0); }
      } catch { /* ignore */ }
    },
    spatialCount() { return spatialPlays; },
    lastSpatial() { return lastSpatial; },
    stepInterval,
    setVolumes(gun, voice) { gunVol = Math.max(0, Math.min(1, gun ?? 1)); voiceVol = Math.max(0, Math.min(1, voice ?? 1)); },
    setCallouts(on) { calloutsOn = !!on; },
    setHaptic(on) { hapticOn = !!on; },
    // Mute-all (v18.3): silences tones, noise, ambient loops, rotors and TTS.
    setMuted(m) {
      muted = !!m;
      if (muted) { stopAmbient(); this.rotor(false); this.vehicleHum(false); this.lobbyMusic(false); }
    },
    isMuted() { return muted; },
    setMobile(on) { mobile = on; }, // v18.4.11: bass boost for phone speakers
    shot(id, indoors = false, mythic = 'none') {
      // Sound driven by the WEAPON_FX table (v22.1): one pattern per weapon.
      const map = { shotgun: 'by15', dmr: 'kilo', launcher: 'rpg', melee: 'katana' };
      const fx = fxFor(map[id] || id);
      const s = fx.sound;
      if (s.pattern === 'swish') { noise(0.18, 0.1, 2500); } // blade, no bang
      else if (s.pattern === 'click') { tone(1400, 0.03, 'square', 0.05); } // crossbow
      else if (s.pattern === 'whoosh-boom') { noise(0.5, 0.18, 600); tone(300, 0.4, 'sawtooth', 0.08, -500); } // RPG launch
      else if (s.pattern === 'boom-echo') { // sniper: deep boom + long echo
        noise(0.25, 0.32, 700); tone(s.freq, 0.3, 'sine', 0.3, -40);
        setTimeout(() => { noise(0.15, 0.12, 500); tone(s.freq * 0.8, 0.2, 'sine', 0.1, -30); }, 200);
        setTimeout(() => { noise(0.1, 0.07, 400); }, 420);
      } else if (s.pattern === 'burst3') { // RPD / M4LMG: 3 quick cracks
        for (let i = 0; i < 3; i++) setTimeout(() => { noise(0.07, 0.22, 1200); tone(s.freq, 0.07, 'square', 0.12, -60); }, i * 60);
      } else if (s.pattern === 'dum') { // AK bass / shotgun pump
        noise(0.25, 0.34, 500); tone(s.freq, 0.2, 'sine', 0.3, -40);
      } else if (s.pattern === 'thump') {
        noise(0.15, 0.25, 900); tone(s.freq, 0.15, 'sine', 0.2, -60);
      } else { // crack / tak / tick / pak: short burst + tone from the table
        noise(s.dur, s.vol, 1500 + s.freq);
        tone(s.freq, s.dur, s.type, s.vol * 0.6, -70);
      }
      // Mythic gunshot flavor (v18.5.12): dragon crackles, void drops low.
      if (mythic === 'dragon') { noise(0.12, 0.3, 3000); tone(90, 0.15, 'sawtooth', 0.1, -40); }
      else if (mythic === 'void') { tone(120, 0.25, 'sine', 0.14, -80); }
      // Phone-speaker bass boost (v18.4.11): 80Hz + 150Hz thump.
      if (mobile) { tone(80, 0.12, 'sine', 0.12); tone(150, 0.08, 'sine', 0.08); }
      // Simple indoor reverb (v18.17): one quiet delayed echo when inside.
      if (indoors) {
        setTimeout(() => { noise(0.09, 0.08, 900); tone(140, 0.08, 'sawtooth', 0.05, -60); }, 110);
      }
    },
    reload(weaponId = '') {
      // Start click (mag release) varies per reload group; the sound-test
      // button calls it with no id and gets the standard click.
      const g = RELOAD_CLS[weaponId] || 'std';
      const f = g === 'belt' || g === 'pump' ? 300 : g === 'tube' ? 200 : g === 'bolt' ? 750 : g === 'string' ? 1100 : g === 'light' ? 1200 : 900;
      tone(f, 0.05, g === 'bolt' || g === 'string' ? 'square' : 'sine', 0.06);
      setTimeout(() => tone(f * 0.67, 0.05, 'square', 0.06), 120);
    },
    hit(head, kill) {
      if (kill) { tone(1400, 0.06, 'sine', 0.12); setTimeout(() => tone(1800, 0.1, 'sine', 0.14), 60); return; }
      tone(head ? 1400 : 1000, 0.06, 'sine', 0.12);
    },
    // Water splash (v18.3.9): bright burst + falling tone.
    splash(x, y, z) { const pos = x !== undefined ? { x, y: y == null ? 0.3 : y, z, max: 30 } : null; noise(0.3, 0.2, 800, pos); tone(600, 0.25, 'sine', 0.08, -300, pos); },
    thunder() { noise(2.2, 0.4, 120); tone(50, 2.0, 'sine', 0.25, -20); },
    plant() { tone(880, 0.12, 'sine', 0.12); },
    defuse() { tone(660, 0.12, 'sine', 0.12); },
    beep() { tone(1200, 0.08, 'sine', 0.1); },
    explosion(x, y, z) { const pos = x !== undefined ? { x, y: y == null ? 0.5 : y, z, max: 60 } : null; noise(1.2, 0.5, 300, pos); tone(60, 1.0, 'sine', 0.3, -30, pos); },
    // Grenade pin pull: short metallic click.
    pin() { tone(3200, 0.03, 'square', 0.08); setTimeout(() => tone(1800, 0.05, 'square', 0.06), 50); },    // Attack-heli rotor: one persistent looping pair of oscillators, started
    // and stopped explicitly — no interval, no new context per call.
    rotor(on) {
      if (muted && on) return;
      const c = ac(); if (!c) return;
      if (on && !rotorNodes) {
        try {
          const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
          o1.type = 'sawtooth'; o1.frequency.value = 55;
          o2.type = 'square'; o2.frequency.value = 110;
          g.gain.value = 0.05;
          o1.connect(g); o2.connect(g); g.connect(c.destination);
          o1.start(); o2.start();
          rotorNodes = { o1, o2 };
        } catch { /* ignore */ }
      } else if (!on && rotorNodes) {
        try { rotorNodes.o1.stop(); rotorNodes.o2.stop(); } catch { /* ignore */ }
        rotorNodes = null;
      }
    },
    // Ear ringing after a close explosion.
    ring() { tone(3200, 1.5, 'sine', 0.10, -900); },
    // Per-map ambient: ONE looping noise source + ONE bird timer, both
    // cleaned up before any switch. Kinds: sand, birds, rain-light,
    // rain-heavy, city, wind. Call ambient('off') or stopAmbient() to end it.
    ambient(kind) {
      if (muted) return;
      const c = ac(); if (!c) return;
      stopAmbient();
      if (!kind || kind === 'off') return;
      const defs = {
        sand: { freq: 400, vol: 0.16, type: 'lowpass' },
        birds: { freq: 900, vol: 0.05, type: 'bandpass' },
        'rain-light': { freq: 1400, vol: 0.10, type: 'lowpass' },
        'rain-heavy': { freq: 900, vol: 0.20, type: 'lowpass' },
        city: { freq: 300, vol: 0.08, type: 'lowpass' },
        wind: { freq: 500, vol: 0.10, type: 'lowpass' },
      };
      const d = defs[kind] || defs.wind;
      try {
        const len = c.sampleRate * 2;
        const buf = c.createBuffer(1, len, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
        const f = c.createBiquadFilter(); f.type = d.type; f.frequency.value = d.freq;
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(d.vol, c.currentTime + 1.5);
        src.connect(f).connect(g).connect(c.destination); src.start();
        ambientSrc = src; ambientGain = g; ambientKind = kind;
        if (kind === 'birds') {
          ambientBirdTimer = setInterval(() => {
            const f0 = 2200 + Math.random() * 1200;
            tone(f0, 0.12, 'sine', 0.05, 600);
            setTimeout(() => tone(f0 * 1.2, 0.1, 'sine', 0.04, -300), 140);
          }, 2600);
        }
      } catch { /* ignore */ }
    },
    stopAmbient() { stopAmbient(); },
    win() { tone(523, 0.15, 'sine', 0.14); setTimeout(() => tone(784, 0.3, 'sine', 0.14), 150); },
    lose() { tone(392, 0.2, 'sine', 0.12); setTimeout(() => tone(262, 0.4, 'sine', 0.12), 200); },
    streak() { tone(880, 0.1, 'sine', 0.14); setTimeout(() => tone(1174, 0.18, 'sine', 0.14), 110); },
    operator() { tone(220, 0.25, 'sawtooth', 0.16, 660); noise(0.3, 0.15, 2500); },
    // Mythic kill effects
    roar() { tone(300, 0.8, 'sawtooth', 0.22, -240); noise(0.7, 0.2, 500); },
    voidSound() { tone(420, 0.7, 'sine', 0.2, -370); tone(210, 0.7, 'sine', 0.12, -160); },
    coin() { [880, 1174, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'sine', 0.14), i * 90)); },
    laser() { tone(1400, 0.3, 'sawtooth', 0.14, -1000); tone(900, 0.25, 'square', 0.1, -600); },
    freeze() { tone(1200, 0.6, 'sine', 0.12, -800); noise(0.5, 0.08, 4000); },
    door() { tone(140, 0.18, 'sawtooth', 0.1, -60); },
    // Finisher cinematic music: bass sawtooth + drum beat, base note per kind.
    cinematic(kind) {
      stopCinematic();
      const base = { dragon: 55, void: 49, gold: 65, neon: 73, crimson: 58, frost: 62, rainbow: 69, execution: 60 }[kind] || 60;
      for (let i = 0; i < 8; i++) {
        const id = setTimeout(() => {
          tone(base, 0.22, 'sawtooth', 0.2);
          tone(base * 2, 0.1, 'square', 0.08);
          noise(0.12, 0.25, 300); // drum thump
          if (i % 4 === 3) tone(base * 1.5, 0.3, 'sine', 0.12);
        }, i * 500);
        cinematicTimers.push(id);
      }
    },
    stopCinematic() { stopCinematic(); },
    // Blood: wet splat (short filtered noise burst).
    splat(x, y, z) { const pos = x !== undefined ? { x, y: y == null ? 1 : y, z, max: 30 } : null; noise(0.12, 0.2, 500, pos); tone(180, 0.1, 'sine', 0.1, -80, pos); },
    // Headshot / metal "ting!" — bright metallic ping.
    ting(x, y, z) { const pos = x !== undefined ? { x, y: y == null ? 1 : y, z, max: 30 } : null; tone(2400, 0.18, 'sine', 0.16, -400, pos); tone(3200, 0.1, 'sine', 0.08, 0, pos); },
    // Shell casing bouncing on the floor.
    shellTing() { tone(2800, 0.06, 'sine', 0.06, -600); },
    // Kill confirm: ting + TTS "Eliminated".
    killConfirm() {
      tone(2400, 0.15, 'sine', 0.14, -300);
      setTimeout(() => tone(1800, 0.2, 'sine', 0.12), 90);
      this.callout('Eliminated!');
    },
    // Level up: rising arpeggio + TTS.
    levelUp() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.15), i * 110));
      this.callout('Level Up!');
    },
    // v18/v18.1/v18.2 sounds (all procedural, all guarded).
    // Empty magazine click (rate-limited by the caller).
    emptyClick() { tone(1800, 0.04, 'square', 0.09); setTimeout(() => tone(1400, 0.04, 'square', 0.07), 70); },
    // Jump effort: rising 300 -> 500 Hz.
    hup() { tone(300, 0.16, 'sine', 0.1, 200); },
    // Shattering glass: bright noise burst + high pings.
    glass(x, y, z) { const pos = x !== undefined ? { x, y: y == null ? 1 : y, z, max: 30 } : null; noise(0.25, 0.22, 5000, pos); tone(3200, 0.12, 'sine', 0.1, -1200, pos); setTimeout(() => tone(2600, 0.1, 'sine', 0.08, 0, pos), 60); },
    // Grenade bouncing off the floor: dull thud.
    bounce(x, y, z) { const pos = x !== undefined ? { x, y: y == null ? 0.1 : y, z, max: 30 } : null; tone(120, 0.09, 'sine', 0.14, -40, pos); noise(0.06, 0.1, 300, pos); },
    // An enemy reloading nearby: two soft clicks.
    enemyReload(x, y, z) { const pos = x !== undefined ? { x, y: y == null ? 1.2 : y, z, max: 40 } : null; tone(900, 0.04, 'square', 0.04, 0, pos); setTimeout(() => tone(600, 0.04, 'square', 0.04, 0, pos), 120); },
    // Enemy gunshot with distance falloff (v18.17): quieter the farther away.
    // With a position, the PannerNode does the falloff (linear to 60m —
    // matches the old 1-dist/60 curve) and pans by direction.
    enemyShot(id, dist, x, y, z) {
      if (x !== undefined) {
        const pos = { x, y: y == null ? 1.3 : y, z, max: 60 };
        noise(0.1, 0.2, 1200, pos); tone(150, 0.08, 'sawtooth', 0.1, -60, pos);
        return;
      }
      const f = Math.max(0.08, 1 - (dist || 20) / 60);
      noise(0.1, 0.2 * f, 1200); tone(150, 0.08, 'sawtooth', 0.1 * f, -60);
    },
    // Footstep, per surface (v18.14 + v18.2.4): sand is nearly silent,
    // wood is a dull 800 Hz knock, metal/concrete a brighter step.
    // Volume: 0.05 normal, 0.02 crouched, 0.01 prone (v18.1.6).
    // With a position (bot steps) the panner fades them out by 25m.
    step(surface = 'concrete', vol = 0.05, x, y, z) {
      steps += 1;
      const pos = x !== undefined ? { x, y: y == null ? 0.1 : y, z, max: 25 } : null;
      // 8 surfaces (v22.2.1): sand, wood, metal + grass, snow, water, mud,
      // stairs. Left/right alternation is handled by the caller timing.
      if (surface === 'sand') { noise(0.05, vol * 0.4, 200, pos); return; }
      if (surface === 'wood') { tone(800, 0.05, 'sine', vol * 0.7, -200, pos); noise(0.04, vol * 0.5, 600, pos); return; }
      if (surface === 'metal') { tone(2500, 0.04, 'sine', vol * 0.6, -800, pos); noise(0.04, vol * 0.6, 3000, pos); return; }
      if (surface === 'grass') { noise(0.06, vol * 0.7, 900, pos); tone(500, 0.04, 'sine', vol * 0.3, -100, pos); return; }
      if (surface === 'snow') { noise(0.07, vol * 0.5, 400, pos); return; }
      if (surface === 'water') { noise(0.08, vol * 0.8, 1200, pos); tone(700, 0.1, 'sine', vol * 0.3, -300, pos); return; }
      if (surface === 'mud') { noise(0.09, vol * 0.6, 150, pos); tone(120, 0.08, 'sine', vol * 0.4, -40, pos); return; }
      if (surface === 'stairs') { tone(1100, 0.05, 'sine', vol * 0.8, -300, pos); noise(0.03, vol * 0.4, 800, pos); return; }
      noise(0.05, vol, 300, pos);
    },
    // Shell casing bounce: pitch follows the floor material (v18.2.4).
    shellTing(freq = 2800) { tone(freq, 0.06, 'sine', 0.06, -freq * 0.3); },
    // Vehicle engine hum: one persistent low pair, started/stopped explicitly.
    vehicleHum(on) {
      if (muted && on) return;
      const c = ac(); if (!c) return;
      if (on && !vehicleNodes) {
        try {
          const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
          o1.type = 'sawtooth'; o1.frequency.value = 42;
          o2.type = 'sine'; o2.frequency.value = 84;
          g.gain.value = 0.04;
          o1.connect(g); o2.connect(g); g.connect(c.destination);
          o1.start(); o2.start();
          vehicleNodes = { o1, o2 };
        } catch { /* ignore */ }
      } else if (!on && vehicleNodes) {
        try { vehicleNodes.o1.stop(); vehicleNodes.o2.stop(); } catch { /* ignore */ }
        vehicleNodes = null;
      }
    },
    // Lobby music: soft detuned pad, one persistent pair (v18.13).
    // Mood (v18.9.7): the pad's base note changes with the selected map.
    lobbyMusic(on, base = 220) {
      if (muted && on) return;
      const c = ac(); if (!c) return;
      if (on && !lobbyNodes) {
        try {
          const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
          o1.type = 'sine'; o1.frequency.value = base;
          o2.type = 'sine'; o2.frequency.value = base * 1.26;
          g.gain.value = 0.025;
          o1.connect(g); o2.connect(g); g.connect(c.destination);
          o1.start(); o2.start();
          lobbyNodes = { o1, o2, base };
        } catch { /* ignore */ }
      } else if (on && lobbyNodes && lobbyNodes.base !== base) {
        // Retune the pad for the new map instead of restarting it.
        try { lobbyNodes.o1.frequency.value = base; lobbyNodes.o2.frequency.value = base * 1.26; lobbyNodes.base = base; } catch { /* ignore */ }
      } else if (!on && lobbyNodes) {
        try { lobbyNodes.o1.stop(); lobbyNodes.o2.stop(); } catch { /* ignore */ }
        lobbyNodes = null;
      }
    },
    // Reload in 3 stages (v19.0.7): mag out -> mag in -> cock, per weapon.
    // Stage frequencies per reload group (2026-11-16): belt/pump keep the
    // old deep values (300/380/220); bolt, tube, break, string and light
    // get their own pitch + timbre. Pump adds a second click (the pump
    // stroke) and bolt adds a slam noise on the final cock.
    reloadStage(stage, weaponId = '') {
      const g = RELOAD_CLS[weaponId] || 'std';
      const F = {
        belt: [300, 380, 220], pump: [300, 380, 220], std: [420, 540, 300],
        bolt: [800, 650, 1100], tube: [180, 240, 160], break: [500, 700, 400],
        string: [1200, 900, 1500], light: [1100, 1300, 900],
      }[g];
      const f = F[Math.min(stage, 2)];
      tone(f, stage === 2 ? 0.14 : 0.07, g === 'bolt' || g === 'string' || g === 'light' ? 'square' : 'sine', 0.1, stage === 2 ? -150 : 0);
      if (stage === 0) noise(0.05, 0.03, 'highpass');
      if (g === 'pump' && stage === 1) setTimeout(() => tone(300, 0.06, 'square', 0.08), 90);
      if (g === 'bolt' && stage === 2) noise(0.06, 0.05, 'highpass');
    },
    // Tire pop (v19.2.5): short low burst.
    pop() { noise(0.09, 0.22, 'lowpass'); tone(90, 0.1, 'sine', 0.2, -60); },
    // Radio jingle (v19.2.11): a short 4-note tune when a radio toggles on.
    radioJingle() { [660, 550, 440, 660].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.08), i * 130)); },
    // Stair step "tuk" (v19.2.14): low wooden knock while climbing.
    tuk() { tone(180, 0.06, 'sine', 0.12, -80); noise(0.03, 0.05, 'lowpass'); },
    // Grenade throw whoosh (v22.1.6): air rushing past on the throw.
    whoosh() { noise(0.25, 0.12, 1200); tone(500, 0.2, 'sine', 0.06, -300); },
    // Melee swish (v22.1.5): blade cutting air + a bright glint tick.
    swish() { noise(0.15, 0.14, 3000); setTimeout(() => tone(2400, 0.05, 'sine', 0.06), 60); },
    // Victory / defeat melodies (short WebAudio, v18.13).
    victory() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'sine', 0.15), i * 140)); },
    defeat() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sine', 0.13), i * 160)); },
    // Killstreak fanfare: a different pitch per streak (v18.1.16).
    streakSound(n) {
      const base = n >= 5 ? 1174 : n >= 3 ? 880 : 660;
      tone(base, 0.12, 'sine', 0.14);
      setTimeout(() => tone(base * 1.33, 0.2, 'sine', 0.14), 110);
      if (n >= 5) setTimeout(() => tone(base * 1.5, 0.25, 'sine', 0.12), 220);
    },
    // Ping marker sound (v18.2.10).
    ping() { tone(1200, 0.12, 'sine', 0.12, -300); setTimeout(() => tone(900, 0.1, 'sine', 0.08), 120); },
    // Emote sounds (v18.2.11): dance / laugh / taunt get a short jingle.
    emoteSound(id) {
      if (id === 'dance') [523, 659, 784, 659].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'square', 0.06), i * 90));
      else if (id === 'laugh') [880, 1100, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, 0.07, 'sine', 0.08), i * 80));
      else if (id === 'taunt') [600, 400, 300].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'sawtooth', 0.07), i * 110));
    },
    // ---- Movement & interaction sounds (v22.2) ----
    land(hard = false) { // landing thud; hard = bone crack + yell
      noise(0.12, 0.25, 200); tone(90, 0.15, 'sine', 0.18, -40);
      if (hard) { noise(0.08, 0.2, 3000); tone(300, 0.3, 'sawtooth', 0.12, -150); }
    },
    slide() { noise(0.3, 0.12, 600); tone(300, 0.2, 'sine', 0.05, -150); },
    dolphin() { noise(0.35, 0.14, 1500); tone(600, 0.25, 'sine', 0.07, -400); },
    mantle() { tone(200, 0.12, 'sine', 0.1, 100); noise(0.08, 0.08, 500); },
    swim() { noise(0.3, 0.18, 900); tone(500, 0.2, 'sine', 0.08, -250); },
    bubble() { tone(900, 0.08, 'sine', 0.06, 400); setTimeout(() => tone(1200, 0.06, 'sine', 0.05, 300), 120); },
    heartbeat() { tone(70, 0.12, 'sine', 0.2, -20); setTimeout(() => tone(60, 0.1, 'sine', 0.16), 160); },
    breath() { noise(0.25, 0.1, 700); tone(400, 0.2, 'sine', 0.05, -150); }, // panting
    cough() { noise(0.12, 0.16, 800); tone(250, 0.1, 'sawtooth', 0.08, -100); },
    zoneAlarm() { tone(880, 0.15, 'square', 0.1); setTimeout(() => tone(660, 0.15, 'square', 0.1), 200); },
    hurt() { tone(180, 0.15, 'sawtooth', 0.14, -80); noise(0.08, 0.12, 600); }, // hit taken
    death() { tone(300, 0.6, 'sawtooth', 0.14, -220); noise(0.3, 0.12, 400); },
    doorMetal() { tone(220, 0.2, 'sawtooth', 0.1, 60); noise(0.1, 0.08, 2000); },
    crate() { noise(0.12, 0.16, 700); tone(1400, 0.06, 'sine', 0.08, -400); },
    bombBeep(fast = false) { tone(fast ? 1600 : 1100, 0.07, 'square', 0.1); },
    revive() { tone(70, 0.15, 'sine', 0.16, -10); setTimeout(() => tone(90, 0.12, 'sine', 0.12), 180); tone(1200, 0.1, 'sine', 0.06, 200); },
    medkitSnd() { noise(0.2, 0.1, 2500); setTimeout(() => noise(0.15, 0.08, 1800), 150); },
    armorSnd() { tone(500, 0.08, 'square', 0.1); setTimeout(() => tone(350, 0.08, 'square', 0.09), 100); },
    eatSnd() { noise(0.15, 0.1, 500); tone(300, 0.1, 'sine', 0.07, -100); },
    drinkSnd() { tone(600, 0.12, 'sine', 0.07, -200); setTimeout(() => tone(500, 0.1, 'sine', 0.06, -150), 140); },
    adsClick() { tone(1600, 0.04, 'square', 0.08); },
    switchGun() { noise(0.1, 0.1, 1200); tone(700, 0.06, 'square', 0.07, -200); },
    inspectClick() { tone(2000, 0.05, 'square', 0.07); setTimeout(() => tone(1500, 0.05, 'square', 0.06), 90); },
    // ---- Vehicle sounds (v22.4) ----
    horn() { tone(370, 0.35, 'square', 0.12); tone(466, 0.35, 'square', 0.1); },
    vehicleDoor() { tone(140, 0.1, 'sine', 0.14, -50); noise(0.06, 0.1, 400); },
    crash() { noise(0.3, 0.3, 250); tone(70, 0.25, 'sine', 0.2, -30); },
    rocket() { noise(0.4, 0.2, 1800); tone(800, 0.3, 'sawtooth', 0.1, -500); },
    cannon() { noise(0.7, 0.4, 200); tone(50, 0.6, 'sine', 0.28, -25); },
    alarm() { [1200, 900, 1200, 900].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'square', 0.09), i * 160)); },
    uavBeep() { tone(1400, 0.08, 'sine', 0.1); setTimeout(() => tone(1400, 0.08, 'sine', 0.08), 200); },
    siren() { tone(700, 0.4, 'sawtooth', 0.1, 500); setTimeout(() => tone(900, 0.4, 'sawtooth', 0.1, -300), 400); },
    bell() { tone(1800, 0.2, 'sine', 0.1, -600); setTimeout(() => tone(1800, 0.15, 'sine', 0.08), 180); },
    parachute() { noise(0.6, 0.12, 1000); },
    // ---- Micro sounds (v28.0.2): tiny WebAudio blips, no new files. ----
    cloth() { noise(0.08, 0.05, 1200); },
    zip() { noise(0.12, 0.07, 3000); },
    velcro() { noise(0.1, 0.09, 2500); },
    buckle() { tone(900, 0.05, 'square', 0.08); tone(600, 0.05, 'square', 0.08); },
    magClick() { tone(1400, 0.04, 'square', 0.1); },
    magDrop() { tone(500, 0.08, 'sine', 0.1, -200); noise(0.05, 0.06, 800); },
    bulletDrop() { tone(2000, 0.03, 'sine', 0.06, -800); },
    cock() { tone(300, 0.06, 'square', 0.12, 200); tone(500, 0.05, 'square', 0.1); },
    safety() { tone(1600, 0.03, 'square', 0.07); },
    modeSwitch() { tone(1000, 0.05, 'square', 0.08); tone(1300, 0.05, 'square', 0.08); },
    scopeClick() { tone(1100, 0.04, 'square', 0.09); },
    breathHold() { noise(0.3, 0.04, 600); },
    sneeze() { noise(0.15, 0.12, 2000); tone(300, 0.1, 'sawtooth', 0.06, -100); },
    yawn() { tone(200, 0.5, 'sine', 0.06, 80); },
    grunt() { tone(140, 0.15, 'sawtooth', 0.1, -40); },
    slip() { noise(0.25, 0.1, 1500); tone(400, 0.2, 'sine', 0.06, -200); },
    // ---- Distant ambient (v28.0.2): far horns / rotors, quiet. ----
    distantHeli() { tone(90, 1.2, 'sawtooth', 0.04, 20); },
    distantPlane() { noise(1.5, 0.05, 900); },
    trainHorn() { tone(220, 0.8, 'sawtooth', 0.08); tone(277, 0.8, 'sawtooth', 0.06); },
    shipHorn() { tone(110, 1.2, 'sawtooth', 0.09); },
    // ---- Haptic patterns (v28.0.1): ONE table, all vibration goes
    // through here. navigator.vibrate is guarded (desktop: no-op).
    // Patterns are ms arrays; explosion scales with distance.
    haptic(type, dist = 0) {
      try {
        if (!navigator.vibrate || !hapticOn) return;
        const T = {
          light: [10], medium: [25], heavy: [60],
          headshot: [30, 40, 30], kill: [20, 30, 50], damage: [80],
          step: [8], engine: [15, 20, 15], heartbeat: [40, 60, 40],
          rain: [5], thunder: [100, 50, 100],
          explosionNear: [120, 40, 120], explosionFar: [40],
        };
        let pat = T[type] || T.light;
        if (type === 'explosion') pat = dist > 15 ? T.explosionFar : T.explosionNear;
        navigator.vibrate(pat);
      } catch { /* ignore */ }
    },
    // Voice callout ("Headshot!") via speech synthesis, rate-limited, guarded.
    callout(text) {
      try {
        if (muted || !calloutsOn || !('speechSynthesis' in window)) return;
        const now = Date.now();
        if (now - lastCallout < 2000) return;
        lastCallout = now;
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.2; u.volume = 0.8 * voiceVol;
        window.speechSynthesis.speak(u);
      } catch { /* ignore */ }
    },
  };
}
