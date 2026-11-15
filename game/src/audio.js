// Procedural WebAudio only. Every call guarded — a missing AudioContext never throws.
export function createAudio() {
  let ctx = null;
  function ac() {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    } catch { return null; }
  }
  function tone(freq, dur, type = 'square', vol = 0.12, slide = 0) {
    const c = ac(); if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), c.currentTime + dur);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g).connect(c.destination);
      o.start(); o.stop(c.currentTime + dur);
    } catch { /* ignore */ }
  }
  function noise(dur, vol = 0.25, low = 400) {
    const c = ac(); if (!c) return;
    try {
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low;
      const g = c.createGain(); g.gain.value = vol;
      src.connect(f).connect(g).connect(c.destination); src.start();
    } catch { /* ignore */ }
  }
  return {
    unlock() { ac(); },
    shot(id) {
      if (id === 'lr50') { noise(0.22, 0.3, 900); tone(140, 0.18, 'sawtooth', 0.16, -90); }
      else if (id === 'p12') { noise(0.1, 0.22, 1400); tone(220, 0.08, 'square', 0.1, -120); }
      else { noise(0.09, 0.2, 1800); tone(180, 0.07, 'square', 0.09, -80); }
    },
    reload() { tone(900, 0.05, 'square', 0.06); setTimeout(() => tone(600, 0.05, 'square', 0.06), 120); },
    hit(head) { tone(head ? 1400 : 1000, 0.06, 'sine', 0.12); },
    plant() { tone(880, 0.12, 'sine', 0.12); },
    defuse() { tone(660, 0.12, 'sine', 0.12); },
    beep() { tone(1200, 0.08, 'sine', 0.1); },
    explosion() { noise(1.2, 0.5, 300); tone(60, 1.0, 'sine', 0.3, -30); },
    win() { tone(523, 0.15, 'sine', 0.14); setTimeout(() => tone(784, 0.3, 'sine', 0.14), 150); },
    lose() { tone(392, 0.2, 'sine', 0.12); setTimeout(() => tone(262, 0.4, 'sine', 0.12), 200); },
  };
}
