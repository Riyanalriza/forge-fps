// Input: pointer lock, mouse look, keys, fire + ADS. No lock needed in shot mode.
export function createInput(canvas, cbs) {
  const keys = new Set();
  const state = { keys, firing: false, ads: false, lookX: 0, lookY: 0, locked: false };
  const shotMode = !!new URLSearchParams(window.location.search).get('shot');
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
    state.lookX += e.movementX; state.lookY += e.movementY;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (!state.locked && !shotMode) { requestLock(); return; }
    if (e.button === 0) state.firing = true;
    if (e.button === 2) state.ads = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) state.firing = false;
    if (e.button === 2) state.ads = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {
    if (e.repeat) { keys.add(e.code); return; }
    keys.add(e.code);
    if (e.code === 'KeyB') cbs.onBuy && cbs.onBuy();
    if (e.code === 'Digit1') cbs.onSlot && cbs.onSlot(0);
    if (e.code === 'Digit2') cbs.onSlot && cbs.onSlot(1);
    if (e.code === 'Digit3') cbs.onSlot && cbs.onSlot(2);
    if (e.code === 'KeyG') cbs.onGrenade && cbs.onGrenade('smoke');
    if (e.code === 'KeyF') cbs.onGrenade && cbs.onGrenade('flash');
    if (e.code === 'KeyQ') cbs.onGrenade && cbs.onGrenade('he');
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); state.firing = false; state.ads = false; });
  return {
    state, requestLock,
    takeLook() { const l = { x: state.lookX, y: state.lookY }; state.lookX = 0; state.lookY = 0; return l; },
  };
}
