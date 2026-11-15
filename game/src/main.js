// FOUNDRY YARD — boot, fixed 60 Hz loop, ?shot= screenshot protocol.
// ?shot=start|play|buy|end with &seed=N: deterministic frame, render twice, freeze, __shotReady.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { createState } from './state.js';
import { buildWorld } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createWeapon } from './weapon.js';
import { createBots } from './bots.js';
import { createGame } from './game.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';

const FIXED_STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

function mulberry32(initial) {
  let a = initial;
  return function random() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(seed);
const S = createState(rng);
S.seed = seed;
S.ads = false;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.canvas);
scene.fog = new THREE.Fog(new THREE.Color(PALETTE.fog), 30, 95);
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 200);
scene.add(camera);

const world = buildWorld(scene);
const audio = createAudio();
const hud = createHud(S);
const player = createPlayer(world, S);
const weapon = createWeapon(scene, camera, S, audio);
const bots = createBots(scene, world, S, rng);
const game = createGame(S, world, bots, hud, audio, scene);

let started = false, frozen = false, accumulator = 0, lastTime = performance.now();
const markerHoldMs = shot ? 4000 : 90;

function syncCamera() {
  const p = S.player;
  camera.position.set(p.x, p.y + p.eye, p.z);
  camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
  const w = weapon.cur();
  const targetFov = S.ads ? 74 / w.zoom : 74;
  if (Math.abs(camera.fov - targetFov) > 0.1) { camera.fov = targetFov; camera.updateProjectionMatrix(); }
}
function aimAt(x, y, z) {
  const p = S.player;
  const dx = x - p.x, dy = y - (p.y + p.eye), dz = z - p.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  p.yaw = Math.atan2(-dx, -dz);
  p.pitch = Math.asin(Math.max(-1, Math.min(1, dy / len)));
  syncCamera();
}
function onBotHit(bot, head, w) {
  const dmg = w.dmg * (head ? w.headMult : 1);
  const killed = bots.damage(bot, dmg);
  hud.hitmarker(head, markerHoldMs);
  audio.hit(head);
  if (killed) {
    game.onKill(bot);
    if (S.bots.every(b => !b.alive)) { /* game.step ends the round */ }
  }
}
function shoot() {
  const w = weapon.cur();
  const magBefore = w.mag;
  weapon.fire(bots.hitMeshes(), world.shootables, rng, onBotHit);
  if (w.mag < magBefore) {
    S.lastShotPos = { x: S.player.x, z: S.player.z };
    player.recoil(0.008 + rng() * 0.005, (rng() * 2 - 1) * 0.004);
  }
}
function onPlayerHit(dmg, bot) {
  if (S.phase !== 'playing' || !S.player.alive) return;
  player.damage(dmg);
  hud.vignette();
}

const input = createInput(renderer.domElement, {
  onLockChange(locked) {
    if (shot) return;
    if (locked) { started = true; hud.hideMenu(); audio.unlock(); }
    else if (S.phase === 'playing') hud.showMenu('PAUSED — click to resume');
  },
  onBuy: () => game.toggleBuy(),
  onSlot: (i) => { if (S.owned[i]) S.player.weaponIdx = i; },
  onGrenade: (k) => { if (S.phase === 'playing') game.throwGrenade(k, camera); },
});
hud.onPlay(() => {
  if (shot) return;
  if (S.phase === 'menu') { game.startRound(); input.requestLock(); }
  else if (S.phase === 'playing') input.requestLock();
  else if (S.phase === 'roundEnd' || S.phase === 'matchEnd') { game.nextRound(); input.requestLock(); }
});
hud.onRestart(() => {
  if (shot) return;
  game.nextRound(); input.requestLock();
});
hud.onBuyItem((id) => game.buy(id));

function step(dt) {
  S.time += dt;
  if (S.msgT > 0) S.msgT -= dt;
  if (S.flashT > 0) S.flashT -= dt;
  if (S.phase === 'playing') player.step(dt, input.state.keys, S.ads);
  weapon.step(dt);
  bots.step(dt, onPlayerHit);
  game.step(dt, input.state.keys);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  if (!frozen) {
    const look = input.takeLook();
    player.look(look.x, look.y);
    S.ads = input.state.ads && S.phase === 'playing';
    if (input.state.firing && S.phase === 'playing') {
      const w = weapon.cur();
      if (w.auto) { if (weapon.ready()) shoot(); }
      else if (weapon.ready() && !frame._fired) { shoot(); frame._fired = true; }
    }
    if (!input.state.firing) frame._fired = false;
    if (input.state.keys.has('KeyR')) weapon.reload();
    accumulator += dt;
    let n = 0;
    while (accumulator >= FIXED_STEP && n < 5) { step(FIXED_STEP); accumulator -= FIXED_STEP; n += 1; }
    if (accumulator > FIXED_STEP * 5) accumulator = 0;
    syncCamera();
    hud.update(world);
  }
  renderer.render(scene, camera);
}

function settle(steps) { for (let i = 0; i < steps; i++) step(FIXED_STEP); }

function runShot(name) {
  hud.hideMenu(); hud.hideEnd(); hud.showBuy(false);
  const p = S.player;
  if (name === 'start') {
    p.x = 0; p.z = 24; p.yaw = 0; p.pitch = 0.02;
    bots.spawnAll();
    settle(20);
    aimAt(0, 2.5, -10);
    hud.showMenu('FOUNDRY YARD');
    hud.update(world);
  } else if (name === 'play') {
    game.startRound();
    // Place 3 bots visible mid-map ahead of the player.
    const spots = [[-4, 10, 100], [5, 6, 40], [9, 12, 100]];
    spots.forEach(([x, z, hp], i) => {
      const b = S.bots[i]; b.x = x; b.z = z; b.hp = hp; b.state = 'combat';
    });
    bots.syncMeshes();
    settle(10);
    aimAt(S.bots[0].x, 1.4, S.bots[0].z);
    // One bot already damaged: land a hit for a visible hitmarker.
    const b0 = S.bots[0];
    bots.damage(b0, 60);
    hud.hitmarker(false, 4000);
    hud.killfeed('YOU ▸ BOT-1 — HIT');
    settle(2);
    hud.update(world);
  } else if (name === 'buy') {
    game.startRound();
    S.economy.money = 2400;
    settle(10);
    aimAt(0, 2, -10);
    game.toggleBuy();
    S.msgT = 0;
    hud.update(world);
  } else if (name === 'end') {
    game.startRound();
    settle(10);
    aimAt(0, 2.5, -10);
    game.endRound(true, 'ALL HOSTILES ELIMINATED');
    S.msgT = 0;
    hud.update(world);
  }
  paintTwiceThenReady();
}
function paintTwiceThenReady() {
  let painted = 0;
  function paint() {
    requestAnimationFrame(paint);
    syncCamera();
    hud.update(world);
    renderer.render(scene, camera);
    painted += 1;
    if (painted === 2) { window.__shotReady = true; frozen = true; }
  }
  requestAnimationFrame(paint);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

syncCamera();
if (shot) runShot(shot);
else { hud.showMenu('FOUNDRY YARD'); requestAnimationFrame(frame); }
