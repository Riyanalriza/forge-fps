// Input: pointer lock, mouse look, keys, fire + ADS, virtual joystick, gyro.
// v17.3: every key is rebindable through settings.keybinds. Physical codes
// are translated into the CANONICAL codes the movement code already reads
// (KeyW/KeyS/KeyA/KeyD/ShiftLeft/KeyC/KeyZ/Space/KeyE), so rebinding never
// touches player.js. ADS and crouch support Hold and Toggle modes; auto
// sprint adds ShiftLeft while moving forward. Gyro aims via
// deviceorientation (rate-based, iOS permission requested on demand).
import { CANONICAL, EMOTE_BINDINGS } from './settings.js';

export function createInput(canvas, cbs, settings) {
  const keys = new Set(); // canonical codes (what player.js reads)
  const state = { keys, firing: false, ads: false, lookX: 0, lookY: 0, locked: false, wheelOpen: false, joyMag: 0 };
  const shotMode = !!new URLSearchParams(window.location.search).get('shot');
  const held = new Set(); // physical codes currently down
  let crouchToggle = false;
  let btnCrouch = false; // mobile crouch button held (hold mode)
  let gyroOn = false, lastGamma = null, lastBeta = null;
  let lastTapT = 0, touchStart = null, slideTapUntil = 0; // v28.0.7 gestures

  function actionFor(code) {
    const kb = settings.keybinds;
    for (const a in kb) if (kb[a] === code) return a;
    return null;
  }
  // Recompute the canonical set from held keys + toggles + auto sprint.
  function syncKeys() {
    keys.clear();
    for (const code of held) {
      const a = actionFor(code);
      if (!a) continue;
      if (a === 'crouch') {
        if (settings.crouchMode === 'hold' || crouchToggle) keys.add('KeyC');
      } else if (CANONICAL[a]) keys.add(CANONICAL[a]);
    }
    if (crouchToggle && settings.crouchMode === 'toggle') keys.add('KeyC');
    if (btnCrouch && settings.crouchMode === 'hold') keys.add('KeyC');
    // Swipe-down slide (v28.0.7): a timed crouch tap, 600ms.
    if (Date.now() < slideTapUntil) keys.add('KeyC');
    if (settings.autoSprint && keys.has('KeyW')) keys.add('ShiftLeft');
  }
  // Touch gestures (v28.0.7): double-tap = jump, swipe down = slide,
  // swipe up = jump. Uses the held set so syncKeys() rebuilds correctly.
  function tapJump() {
    held.add('Space'); syncKeys();
    setTimeout(() => { held.delete('Space'); syncKeys(); }, 120);
  }
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  canvas.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = Date.now(), dtMs = t - touchStart.t;
    const end = e.changedTouches[0];
    const dx = (end ? end.clientX : 0) - touchStart.x;
    const dy = (end ? end.clientY : 0) - touchStart.y;
    if (dtMs < 300 && Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) {
      if (dy > 0) slideTapUntil = Date.now() + 600; // swipe down = slide
      else tapJump(); // swipe up = jump
    } else if (dtMs < 250 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      if (t - lastTapT < 300) tapJump(); // double-tap = jump
      lastTapT = t;
    }
    touchStart = null;
  }, { passive: true });
  function requestLock() {
    if (shotMode) return;
    try { canvas.requestPointerLock(); } catch { /* ignore */ }
  }
  document.addEventListener('pointerlockchange', () => {
    state.locked = document.pointerLockElement === canvas;
    cbs.onLockChange && cbs.onLockChange(state.locked);
  });
  document.addEventListener('mousemove', (e) => {
    if (!state.locked) return;
    if (state.wheelOpen) { cbs.onWheelMove && cbs.onWheelMove(e.movementX, e.movementY); return; }
    state.lookX += e.movementX; state.lookY += e.movementY;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (!state.locked && !shotMode) { requestLock(); return; }
    if (e.button === 0) state.firing = true;
    if (e.button === 2) {
      if (settings.adsMode === 'toggle') state.ads = !state.ads;
      else state.ads = true;
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) state.firing = false;
    if (e.button === 2 && settings.adsMode === 'hold') state.ads = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  function dispatchAction(a) {
    if (a === 'buy') cbs.onBuy && cbs.onBuy();
    else if (a === 'interact') cbs.onInteract && cbs.onInteract();
    else if (a === 'wheel') { state.wheelOpen = true; cbs.onWheelOpen && cbs.onWheelOpen(); }
    else if (a === 'slot1') cbs.onSlot && cbs.onSlot(0);
    else if (a === 'slot2') cbs.onSlot && cbs.onSlot(1);
    else if (a === 'operator') cbs.onOperator && cbs.onOperator();
    else if (EMOTE_BINDINGS[a]) cbs.onEmote && cbs.onEmote(EMOTE_BINDINGS[a]);
    else if (a === 'grenadeHE') cbs.onGrenade && cbs.onGrenade('he');
    else if (a === 'grenadeFlash') cbs.onGrenade && cbs.onGrenade('flash');
    else if (a === 'grenadeSmoke') cbs.onGrenade && cbs.onGrenade('smoke');
    else if (a === 'medkit') cbs.onMedkit && cbs.onMedkit();
    else if (a === 'armor') cbs.onArmor && cbs.onArmor();
    else if (a === 'flashlight') cbs.onFlashlight && cbs.onFlashlight();
    else if (a === 'molotov') cbs.onThrowable && cbs.onThrowable('molotov');
    else if (a === 'c4') cbs.onThrowable && cbs.onThrowable('c4');
    else if (a === 'tripmine') cbs.onThrowable && cbs.onThrowable('tripmine');
    // Tacticals (v23.0.6): Trophy System / Gas / Cryo Bomb.
    else if (a === 'tactTrophy') cbs.onGrenade && cbs.onGrenade('trophy');
    else if (a === 'tactGas') cbs.onGrenade && cbs.onGrenade('gas');
    else if (a === 'tactCryo') cbs.onGrenade && cbs.onGrenade('cryo');
    else if (a === 'inspect') cbs.onInspect && cbs.onInspect();
    else if (a === 'ping') cbs.onPing && cbs.onPing();
    else if (a === 'zoom') cbs.onZoom && cbs.onZoom();
    else if (a === 'laser') cbs.onLaser && cbs.onLaser();
    else if (a === 'chat') cbs.onChat && cbs.onChat();
    else if (a === 'bigmap') cbs.onBigMap && cbs.onBigMap();
    else if (a === 'voice') cbs.onVoice && cbs.onVoice();
  }
  window.addEventListener('keydown', (e) => {
    if (e.repeat) { held.add(e.code); syncKeys(); return; }
    held.add(e.code);
    const a = actionFor(e.code);
    if (a === 'crouch' && settings.crouchMode === 'toggle') crouchToggle = !crouchToggle;
    if (a === 'scoreboard') { e.preventDefault(); cbs.onScoreboard && cbs.onScoreboard(true); }
    if (a) dispatchAction(a);
    if (e.code === 'Space') e.preventDefault();
    syncKeys();
  });
  window.addEventListener('keyup', (e) => {
    held.delete(e.code);
    const a = actionFor(e.code);
    if (a === 'wheel' && state.wheelOpen) { state.wheelOpen = false; cbs.onWheelClose && cbs.onWheelClose(); }
    if (a === 'scoreboard') cbs.onScoreboard && cbs.onScoreboard(false);
    syncKeys();
  });
  window.addEventListener('blur', () => {
    held.clear(); keys.clear(); state.firing = false; state.ads = false; state.joyMag = 0;
    if (state.wheelOpen) { state.wheelOpen = false; cbs.onWheelClose && cbs.onWheelClose(); }
  });
  // ---- Mobile ADS / crouch buttons (hold vs toggle) ----
  function setAds(v) { state.ads = !!v; }
  function toggleAds() { state.ads = !state.ads; }
  function setCrouch(v) {
    if (settings.crouchMode === 'toggle') { if (v) crouchToggle = !crouchToggle; }
    else btnCrouch = !!v;
    syncKeys();
  }
  // ---- Gyro aim (mobile): rate-based tilt -> look deltas ----
  function enableGyro() {
    if (gyroOn || !settings.gyro) return;
    gyroOn = true;
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null || e.beta == null) return;
      if (lastGamma == null) { lastGamma = e.gamma; lastBeta = e.beta; return; }
      const f = 3 * (settings.sens.gyro || 1);
      state.lookX += (e.gamma - lastGamma) * f;
      state.lookY += (e.beta - lastBeta) * f;
      lastGamma = e.gamma; lastBeta = e.beta;
    });
  }
  function requestGyroPermission() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
        return DeviceOrientationEvent.requestPermission().then(r => r === 'granted');
      }
    } catch { /* ignore */ }
    return Promise.resolve(true); // Android and desktop need no permission
  }
  // ---- Virtual joystick: sets canonical movement keys + speed magnitude ----
  function bindJoystick(base, knob) {
    if (!base) return;
    let active = null;
    function update(e) {
      const r = base.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = (e.clientX - cx) / (r.width / 2);
      let dy = (e.clientY - cy) / (r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      const dz = settings.deadZone || 0;
      const mag = Math.max(0, Math.min(1, (Math.hypot(dx, dy) - dz) / (1 - dz))) * (settings.sens.joystick || 1);
      state.joyMag = Math.min(1, mag);
      if (knob) knob.style.transform = `translate(${dx * 28}px, ${dy * 28}px)`;
      keys.delete('KeyW'); keys.delete('KeyS'); keys.delete('KeyA'); keys.delete('KeyD');
      if (Math.hypot(dx, dy) > dz) {
        if (dy < -dz) keys.add('KeyW');
        if (dy > dz) keys.add('KeyS');
        if (dx < -dz) keys.add('KeyA');
        if (dx > dz) keys.add('KeyD');
      }
      if (settings.autoSprint && keys.has('KeyW')) keys.add('ShiftLeft');
    }
    function end() {
      active = null; state.joyMag = 0;
      if (knob) knob.style.transform = '';
      keys.delete('KeyW'); keys.delete('KeyS'); keys.delete('KeyA'); keys.delete('KeyD');
      syncKeys();
    }
    base.addEventListener('pointerdown', (e) => { active = e.pointerId; base.setPointerCapture(e.pointerId); update(e); });
    base.addEventListener('pointermove', (e) => { if (active === e.pointerId) update(e); });
    base.addEventListener('pointerup', (e) => { if (active === e.pointerId) end(); });
    base.addEventListener('pointercancel', () => end());
  }
  function bindFireButton(el) {
    if (!el) return;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); state.firing = true; });
    el.addEventListener('pointerup', () => { state.firing = false; });
    el.addEventListener('pointerleave', () => { state.firing = false; });
    el.addEventListener('pointercancel', () => { state.firing = false; });
  }
  return {
    state, requestLock, setAds, toggleAds, setCrouch,
    enableGyro, requestGyroPermission, bindJoystick, bindFireButton,
    resync() { syncKeys(); },
    takeLook() { const l = { x: state.lookX, y: state.lookY }; state.lookX = 0; state.lookY = 0; return l; },
  };
}
