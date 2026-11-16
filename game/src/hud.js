// HUD: DOM updates, minimap, compass, killfeed, hitmarker, overlays, buy menu.
// v2: killstreak bar, operator box, objective bar, UAV-gated minimap,
// calling-card styled killfeed, battle-pass menu rendering.
import { STREAK_DEFS, MODE_DEFS, OPERATOR_DEFS, MYTHIC_DEFS, EMOTE_DEFS } from './state.js';
import { MAP_DEFS } from './maps.js';
import { xpInTier, missionList } from './battlepass.js';

// Damage direction (deg): 0 = attacker straight ahead, +90 = right,
// 180/-180 = behind, -90 = left. forward = (-sin yaw, -cos yaw),
// right = (cos yaw, -sin yaw) — same basis as player.js movement.
export function dmgAngle(yaw, px, pz, ax, az) {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const dx = ax - px, dz = az - pz;
  return Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz) * 180 / Math.PI;
}

export function createHud(S) {
  const $ = (id) => document.getElementById(id);
  const el = {
    hud: $('hud'),
    hp: $('hp'), armor: $('armor'), money: $('money'), ammoMag: $('ammo-mag'),
    ammoRes: $('ammo-reserve'), weapon: $('weapon-name'), timer: $('timer'),
    score: $('score-value'), round: $('round-label'), compass: $('compass'),
    scoreYou: $('score-you'), scoreBot: $('score-bot'),
    scoreYouPips: $('score-you-pips'), scoreBotPips: $('score-bot-pips'),
    mapLabel: $('map-label'), nadeRow: $('nade-row'),
    radio: $('radio-callout'), radioText: $('radio-text'),
    minimap: $('minimap'), killfeed: $('killfeed'), hitmarker: $('hitmarker'),
    msg: $('center-msg'), vignette: $('vignette'), flash: $('flash'),
    menu: $('menu'), buy: $('buy-menu'), buyItems: $('buy-items'),
    endTitle: $('end-title'), endSub: $('end-sub'), endTables: $('end-tables'), menuTitle: $('menu-title'),
    plantBar: $('plant-bar'), plantFill: $('plant-fill'), plantLabel: $('plant-label'),
    objective: $('objective'), modeName: $('mode-name'), objectiveText: $('objective-text'),
    streakBar: $('killstreak-bar'), streakCount: $('streak-count'), ksList: $('ks-list'),
    opName: $('operator-name'), opBar: $('operator-bar'), opCd: $('operator-cd'),
    emotePop: $('emote-pop'), mythicFx: $('mythic-effect'),
    bpTier: $('bp-tier'), bpBar: $('bp-bar'), bpMissions: $('bp-missions'),
    wheel: $('emote-wheel'), wheelBtn: $('wheel-btn'),
    interactHint: $('interact-hint'),
    finisher: $('finisher'), finTitle: $('finisher-title'), finSub: $('finisher-sub'),
    finDesc: $('finisher-desc'), finBar: $('finisher-bar'), flashPurple: $('flash-purple'),
    killcam: $('killcam'), kcBody: $('killcam-body'), kcDetail: $('killcam-detail'),
    specBar: $('spectate-bar'), specName: $('spectate-name'),
    specPrev: $('spec-prev'), specFree: $('spec-free'), specNext: $('spec-next'), specExit: $('spec-exit'),
    scope: $('scope-overlay'), crosshair: $('crosshair'),
    profileChip: $('profile-chip'), dmgNum: $('dmg-number'),
    cycleTime: $('cycle-time'), cycleCount: $('cycle-countdown'), cycleBar: $('cycle-bar'),
    levelup: $('levelup'), scoreboard: $('scoreboard'), fps: $('fps'), ping: $('ping'),
    fpsGraph: $('fps-graph'), engineStats: $('engine-stats'),
    staminaBar: $('stamina-bar'), staminaFill: $('stamina-fill'),
    moveStatus: $('move-status'), surfaceLabel: $('surface-label'),
    reloadBar: $('reload-bar'), reloadFill: $('reload-fill'), reloadLabel: $('reload-label'),
    hintBar: $('hint-bar'), chatLog: $('chat-log'), chatBubble: $('chat-bubble'),
    killMsg: $('kill-message'), killTitle: $('kill-title'), killSub: $('kill-sub'),
    killConfirm: $('kill-confirm'), weaponFx: $('weapon-fx'),
    minimapBig: $('minimap-big'), scopeZoom: $('scope-zoom'),
    quickEmotes: $('quick-emotes'), surrenderBtn: $('surrender-btn'), dsToggle: $('ds-toggle'),
    bloodLens: $('blood-lens'), lensRain: $('lens-rain'),
    nvOverlay: $('nv-overlay'), thermalOverlay: $('thermal-overlay'),
    deathScreen: $('death-screen'), deathInfo: $('death-info'), deathTimer: $('death-timer'),
    victoryScreen: $('victory-screen'), victoryTitle: $('victory-title'), victoryInfo: $('victory-info'),
    kcTimer: $('killcam-timer'), bloodSplatter: $('blood-splatter'),
    fireBtn: $('fire-btn'), fireBtnLeft: $('fire-btn-left'),
    dashBtn: $('dash-btn'), scopeBtn: $('scope-btn'), reloadBtn: $('reload-btn'),
  };
  const mm = el.minimap.getContext('2d');
  let hitT = null, dmgT = null, dmgDirT = null;
  const dmgDirEl = document.createElement('div');
  dmgDirEl.id = 'dmg-dir';
  dmgDirEl.innerHTML = '<i></i>';
  (el.hud || document.body).appendChild(dmgDirEl);
  // Emote wheel selection state (mouse-vector based, works with pointer lock)
  const wheelVec = { x: 0, y: 0 };
  let wheelSel = 0;
  function show(node, on) { if (node) node.hidden = !on; }
  function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  // ---- Tutorial: HOW TO PLAY panel + round-1 hints ----
  // Built here (hud.js is outside the dossier text slice) so index.html /
  // main.js stay untouched. The overlay is pointer-events:none with only
  // the card interactive, so the PLAY button stays clickable while the
  // panel is open. Hints are suppressed in screenshot staging (?shot=
  // start/play/buy/end) — the staging harness is not a first-time player —
  // but run in ?shot=test so the self-test can drive them.
  const shotParam = new URLSearchParams(location.search).get('shot');
  const tutHintsOff = !!shotParam && shotParam !== 'test';
  const tutBtn = document.createElement('button');
  tutBtn.id = 'howto-btn';
  tutBtn.type = 'button';
  tutBtn.className = 'cta howto-btn';
  tutBtn.textContent = '❓ HOW TO PLAY';
  const playBtn = $('play');
  if (playBtn && playBtn.parentNode) playBtn.parentNode.insertBefore(tutBtn, playBtn);
  const tutOverlay = document.createElement('div');
  tutOverlay.id = 'howto-overlay';
  tutOverlay.hidden = true;
  tutOverlay.innerHTML = `<div id="howto-panel" role="dialog" aria-label="How to play">
    <div class="howto-head"><h2>🎮 HOW TO PLAY</h2><button id="howto-close" type="button" aria-label="Close">✕</button></div>
    <h3>CONTROLS</h3>
    <table class="howto-keys">
      <tr><td><kbd>WASD</kbd></td><td>Move</td><td><kbd>Mouse</kbd></td><td>Aim</td></tr>
      <tr><td><kbd>Click</kbd></td><td>Fire</td><td><kbd>Right-click</kbd></td><td>Aim down sights</td></tr>
      <tr><td><kbd>R</kbd></td><td>Reload</td><td><kbd>Q</kbd></td><td>Frag grenade</td></tr>
      <tr><td><kbd>F</kbd></td><td>Flash</td><td><kbd>G</kbd></td><td>Smoke</td></tr>
      <tr><td><kbd>V</kbd></td><td>Sniper zoom</td><td><kbd>H</kbd></td><td>Medkit</td></tr>
      <tr><td><kbd>J</kbd></td><td>Armor +50</td><td><kbd>X</kbd></td><td>Operator skill</td></tr>
      <tr><td><kbd>M</kbd></td><td>Big minimap</td><td><kbd>1</kbd> <kbd>2</kbd></td><td>Switch weapon</td></tr>
      <tr><td><kbd>Shift</kbd></td><td>Sprint</td><td><kbd>C</kbd></td><td>Crouch (slide while running)</td></tr>
      <tr><td><kbd>Z</kbd></td><td>Prone</td><td><kbd>Space</kbd></td><td>Jump</td></tr>
    </table>
    <h3>OBJECTIVE</h3>
    <p><b>Team Deathmatch</b> — first to 15 kills wins. <b>Search &amp; Destroy</b> — plant the charge at Site A or B, defend it until it blows; win 3 rounds. Other modes: read the mode description on the menu.</p>
    <h3>TIPS</h3>
    <ul>
      <li>Spawn protection: 3 seconds invulnerable at the start of every round.</li>
      <li>3-kill streak = UAV — enemies show on the minimap.</li>
      <li>Kill Confirmed: pick up the gold dog tags enemies drop.</li>
    </ul>
  </div>`;
  (el.menu || document.body).appendChild(tutOverlay);
  const tutToast = document.createElement('div');
  tutToast.id = 'tutorial-toast';
  tutToast.hidden = true;
  tutToast.innerHTML = `<span id="tutorial-toast-text"></span><button id="tutorial-toast-x" type="button" aria-label="Dismiss hint">✕</button>`;
  document.body.appendChild(tutToast);
  const TUT_HINTS = {
    move: '🏃 WASD to move — Shift to sprint, Space to jump',
    shoot: '🎯 Click to shoot — R to reload',
    nade: '💣 Q for grenade — X for operator skill',
  };
  let tutShown = { move: false, shoot: false, nade: false };
  let tutQueue = [];
  let tutCur = null;
  let tutHideT = null;
  let tutStartTimer = null;
  let tutLastPhase = S.phase;
  function tutShowToast(id) {
    const t = document.getElementById('tutorial-toast-text');
    if (t) t.textContent = TUT_HINTS[id];
    tutToast.hidden = false;
    tutCur = id;
    clearTimeout(tutHideT);
    tutHideT = setTimeout(() => tutHideToast(), 4000);
  }
  function tutHideToast() {
    clearTimeout(tutHideT);
    tutToast.hidden = true;
    tutCur = null;
  }
  function tutTick() {
    if (tutHintsOff) return;
    const entering = S.phase === 'playing' && tutLastPhase !== 'playing';
    tutLastPhase = S.phase;
    if (entering) {
      if (S.round.num === 1 && !tutShown.move) { tutShown.move = true; tutQueue.push('move'); }
      tutStartTimer = S.round.timer;
    }
    if (S.phase !== 'playing') { if (tutCur) tutHideToast(); return; }
    if (S.round.num !== 1) return;
    const p = S.player;
    if (!tutShown.shoot && p.alive) {
      const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
      const seen = S.bots.some((b) => {
        if (!b.alive) return false;
        const dx = b.x - p.x, dz = b.z - p.z;
        const d = Math.hypot(dx, dz);
        return d < 30 && d > 0.5 && (dx * fx + dz * fz) / d > 0.5;
      });
      if (seen) { tutShown.shoot = true; tutQueue.push('shoot'); }
    }
    if (!tutShown.nade && tutStartTimer != null && S.round.timer <= tutStartTimer * 0.6) {
      tutShown.nade = true; tutQueue.push('nade');
    }
    if (!tutCur && tutQueue.length) tutShowToast(tutQueue.shift());
  }
  tutBtn.addEventListener('click', () => { tutOverlay.hidden = !tutOverlay.hidden; });
  tutOverlay.querySelector('#howto-close').addEventListener('click', () => { tutOverlay.hidden = true; });
  tutToast.querySelector('#tutorial-toast-x').addEventListener('click', () => tutHideToast());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !tutOverlay.hidden) tutOverlay.hidden = true; });
  function update(world) {
    const p = S.player, w = S.weapons[S.player.weaponIdx];
    el.hp.textContent = Math.ceil(p.hp);
    el.armor.textContent = Math.ceil(p.armor) + (p.armor > 0 ? ' +H' : '');
    // HP colour: green >60, yellow >30, red below (v24.0.3).
    if (el.hp) el.hp.className = p.hp > 60 ? 'hp-good' : p.hp > 30 ? 'hp-mid' : 'hp-low';
    // Vignette classes for low HP (v18.6.7).
    if (el.vignette) el.vignette.classList.toggle('low', p.hp < 50 && p.hp >= 30);
    if (el.vignette) el.vignette.classList.toggle('crit', p.hp < 30);
    el.money.textContent = '$' + S.economy.money;
    el.ammoMag.textContent = w.mag;
    el.ammoRes.textContent = '/ ' + w.reserve + (w.reloading ? '  RELOADING' : '');
    // Grenade row (reference HUD): Frag / Flash / Smoke / Kit counts.
    if (el.nadeRow) el.nadeRow.textContent = `Frag ${S.grenades.he} · Flash ${S.grenades.flash} · Smoke ${S.grenades.smoke} · Kit ${S.medkits}`;
    // Ammo warning: red + blink at <=5, flashing RELOAD at 0 (v18.1.2).
    if (el.ammoMag) el.ammoMag.classList.toggle('ammo-low', w.mag <= 5);
    if (el.ammoMag) el.ammoMag.classList.toggle('ammo-empty', w.mag === 0);
    if (el.reloadBtn) {
      el.reloadBtn.classList.toggle('blink-red', w.mag === 0);
      el.reloadBtn.classList.toggle('blink-orange', w.mag > 0 && w.mag <= 5);
    }
    // Reload progress bar (v19.0.6).
    if (el.reloadBar && w.reloading) {
      el.reloadBar.hidden = false;
      const frac = w.reloadTotal > 0 ? 1 - Math.max(0, w.reloadT) / w.reloadTotal : 0;
      if (el.reloadFill) el.reloadFill.style.width = Math.round(frac * 100) + '%';
      if (el.reloadLabel) el.reloadLabel.textContent = `RELOADING ${w.name} — ${Math.max(0, w.reloadT).toFixed(1)}s`;
    } else if (el.reloadBar) el.reloadBar.hidden = true;
    // Stamina bar + movement status + surface (v22.6.4).
    if (el.staminaFill) el.staminaFill.style.width = Math.round(Math.max(0, Math.min(100, S.stamina ?? 100))) + '%';
    // Movement + surface as ONE tidy chip (was two stacked labels). "di atas"
    // makes the chip read as a sentence — status + the ground under you.
    if (el.moveStatus) {
      const surfName = { concrete: 'beton', wood: 'kayu', grass: 'rumput', sand: 'pasir', snow: 'salju', metal: 'besi', water: 'air', mud: 'lumpur', stairs: 'tangga' };
      el.moveStatus.textContent = `${S.moveStatus || 'DIAM'} · di atas ${surfName[S.surface] || S.surface || 'beton'}`;
    }
    // Crosshair pulse while firing (v18.1.16) + lock when aiming at a bot (v18.2).
    if (el.crosshair) {
      el.crosshair.classList.toggle('pulse', !!S.crossPulse);
      el.crosshair.classList.toggle('lock', !!S.crossLock);
    }
    // Weapon FX panel removed from the play HUD (debug read-out: sound
    // pattern, muzzle hex, recoil numbers). Element stays in the DOM.
    if (el.weaponFx) el.weaponFx.style.display = 'none';
    // Night vision / thermal overlays (v27.0) + rain on lens (v28.0.3).
    if (el.nvOverlay) el.nvOverlay.classList.toggle('on', !!S.nightVision);
    if (el.thermalOverlay) el.thermalOverlay.classList.toggle('on', !!S.thermal);
    if (el.lensRain) el.lensRain.classList.toggle('on', (S.weather === 'rain' || S.weather === 'storm'));
    // Big minimap (M): copy the small canvas scaled up (v18.3.11).
    if (el.minimapBig && S.bigMap) {
      el.minimapBig.hidden = false;
      const c2 = el.minimapBig.getContext('2d');
      c2.imageSmoothingEnabled = false;
      c2.drawImage(el.minimap, 0, 0, el.minimapBig.width, el.minimapBig.height);
    } else if (el.minimapBig) el.minimapBig.hidden = true;
    // Minimap danger border: enemy bot within 10m (v18.1.15).
    if (el.minimap) {
      const danger = S.bots.some(b => b.alive && Math.hypot(p.x - b.x, p.z - b.z) < 10);
      el.minimap.classList.toggle('danger', danger);
    }
    // Hardcore: hide HUD elements; Realistic: hide minimap + crosshair (v26.0.5).
    if (el.hud) el.hud.classList.toggle('hardcore', !!S.hardcore);
    if (el.hud) el.hud.classList.toggle('realistic', !!S.realistic);
    el.weapon.textContent = w.name + (S.opActive && S.operator === 'annihilator' ? ' [ANNIHILATOR]' : S.opActive && S.operator === 'tempest' ? ' [TEMPEST]' : '');
    el.timer.textContent = fmtTime(S.round.timer);
    if (S.mode === 'zombie' && S.zombieInfo) {
      el.timer.textContent = `WAVE ${S.zombieInfo.wave}`;
      el.score.textContent = `${S.zombieInfo.alive} left`;
    }
    // Profile chip: rank + ELO + coins (updated from the economy by main.js).
    // When a profile picture is set, main.js writes rich HTML instead.
    if (el.profileChip && S.profileText && !S.profileAvatar) el.profileChip.textContent = S.profileText;
    // Killcam hides itself when you are alive again.
    if (el.killcam && !el.killcam.hidden && S.player.alive && !S.spectate) hideKillcam();
    // Scope overlay + crosshair while aiming down sights.
    if (el.scope) {
      const showScope = S.ads && S.phase === 'playing';
      el.scope.hidden = !showScope;
      if (showScope) el.scope.dataset.scope = S.scopeKind || 'iron';
    }
    if (el.crosshair) el.crosshair.classList.toggle('ads', !!S.ads);
    // Day-night cycle UI (menu).
    if (el.cycleTime && S.cycleText) el.cycleTime.textContent = S.cycleText;
    if (el.cycleCount && S.cycleCountdown) el.cycleCount.textContent = S.cycleCountdown;
    if (el.cycleBar && S.cycleProgress != null) el.cycleBar.style.width = Math.round(S.cycleProgress * 100) + '%';
    // Topbar team chips (reference layout): YOU vs BOT + round-win pips.
    let you = S.kills, bot = S.botKills;
    if (S.mode === 'dom') { you = Math.floor(S.dom.points.you); bot = Math.floor(S.dom.points.bot); }
    else if (S.mode === 'snd' || S.mode === 'control') { you = S.round.wins; bot = S.round.losses; }
    else if (S.mode === 'zombie' && S.zombieInfo) { you = S.zombieInfo.wave; bot = S.zombieInfo.alive; }
    if (el.scoreYou) el.scoreYou.textContent = you;
    if (el.scoreBot) el.scoreBot.textContent = bot;
    if (el.score) el.score.textContent = `${you} - ${bot}`;
    const pips = (n) => '▮'.repeat(Math.min(n, S.round.maxRounds)) + '▯'.repeat(Math.max(0, S.round.maxRounds - Math.min(n, S.round.maxRounds)));
    if (el.scoreYouPips) el.scoreYouPips.textContent = (S.mode === 'snd' || S.mode === 'control') ? pips(S.round.wins) : '';
    if (el.scoreBotPips) el.scoreBotPips.textContent = (S.mode === 'snd' || S.mode === 'control') ? pips(S.round.losses) : '';
    el.round.textContent = `ROUND ${S.round.num} / ${S.round.maxRounds}`;
    // Map name under the round minimap (reference layout).
    if (el.mapLabel) el.mapLabel.textContent = (MAP_DEFS[S.mapId] || MAP_DEFS.foundry).name.toUpperCase();
    // Compass: yaw 0 = N
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const deg = ((-p.yaw * 180 / Math.PI) % 360 + 360) % 360;
    el.compass.textContent = dirs[Math.round(deg / 45) % 8] + ' ' + Math.round(deg) + '°';
    el.msg.textContent = S.msgT > 0 ? S.msg : '';
    // Objective bar
    if (el.modeName) {
      const def = MODE_DEFS[S.mode];
      el.modeName.textContent = def.name.toUpperCase();
      let text = def.desc;
      if (S.mode === 'tdm') text = `First to ${def.target} kills — YOU ${S.kills} : ${S.botKills} BOT`;
      else if (S.mode === 'dom') text = `A:${S.dom.A.owner || '-'} B:${S.dom.B.owner || '-'} C:${S.dom.C.owner || '-'} — ${Math.floor(S.dom.points.you)} / ${Math.floor(S.dom.points.bot)} pts`;
      else if (S.mode === 'br') text = `Zone radius ${Math.round(S.br.radius)}m — stay inside! ${S.bots.filter(b => b.alive).length} bots left`;
      else if (S.mode === 'snd') text = S.bomb.state === 'planted' ? `CHARGE PLANTED — fuse ${Math.ceil(S.bomb.fuse)}s` : 'Plant the charge at a bomb site';
      el.objectiveText.textContent = text;
    }
    // Killstreak bar
    if (el.streakCount) {
      el.streakCount.textContent = S.streak;
      const names = Object.fromEntries(STREAK_DEFS.map(d => [d.id, d]));
      el.ksList.innerHTML = S.streaksReady.map(id => {
        const d = names[id];
        return `<button data-streak="${id}" class="ks-btn">${d.icon} ${d.name} — USE</button>`;
      }).join('');
    }
    // Operator box
    if (el.opName) {
      const def = OPERATOR_DEFS[S.operator];
      el.opName.textContent = `${def.icon} ${def.name}`;
      const frac = S.opCd > 0 ? 1 - S.opCd / def.cooldown : 1;
      el.opBar.style.width = Math.round(frac * 100) + '%';
      el.opCd.textContent = S.opCd > 0 ? `Cooldown ${Math.ceil(S.opCd)}s` : (S.opActive ? 'ARMED — fire!' : 'Ready! Press [X]');
    }
    // Door hint: show [E] when the player stands near a door.
    if (el.interactHint && world.doors) {
      let near = null, nearD = 2.5;
      for (const d of world.doors) {
        const dd = Math.hypot(d.x - p.x, d.z - p.z);
        if (dd < nearD) { nearD = dd; near = d; }
      }
      if (near && S.phase === 'playing') {
        el.interactHint.textContent = near.open ? '[E] Tutup Pintu' : '[E] Buka Pintu';
        el.interactHint.style.display = 'block';
      } else el.interactHint.style.display = 'none';
    }
    tutTick();
    drawMinimap(world);
  }
  function drawMinimap(world) {
    const c = mm, W = 148, H = 148;
    c.clearRect(0, 0, W, H);
    c.fillStyle = 'rgba(10,12,10,0.72)'; c.fillRect(0, 0, W, H);
    // Square map, true aspect: one scale for x and z, z centred vertically.
    const s = W / 80, zOff = (H - 56 * s) / 2;
    const sx = (x) => (x + 40) * s, sz = (z) => (z + 28) * s + zOff;
    c.fillStyle = '#5c6b70';
    for (const col of world.colliders) {
      if (col.h < 1.2) continue;
      c.fillRect(sx(col.x0), sz(col.z0), Math.max(2, sx(col.x1) - sx(col.x0)), Math.max(2, sz(col.z1) - sz(col.z0)));
    }
    for (const key of ['A', 'B', 'C']) {
      const s = world.sites[key];
      const owner = S.mode === 'dom' ? S.dom[key].owner : null;
      c.strokeStyle = owner === 'you' ? '#7ddc7d' : owner === 'bot' ? '#ff5a4d' : (key === 'A' ? '#f0a830' : key === 'B' ? '#37c8d8' : '#7ddc7d');
      c.lineWidth = 2;
      c.beginPath(); c.arc(sx(s.x), sz(s.z), 7, 0, 7); c.stroke();
      c.fillStyle = c.strokeStyle; c.font = 'bold 10px sans-serif'; c.fillText(key, sx(s.x) - 3, sz(s.z) + 3);
    }
    if (S.bomb.state === 'planted') {
      c.fillStyle = '#ff5a4d'; c.beginPath(); c.arc(sx(S.bomb.x), sz(S.bomb.z), 4, 0, 7); c.fill();
    }
    // BR zone circle
    if (S.mode === 'br') {
      c.strokeStyle = '#ff5a4d'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(sx(S.br.cx), sz(S.br.cz), S.br.radius * s, 0, 7); c.stroke();
    }
    // Bots are hidden on the minimap unless UAV is up, they are close, or in combat.
    const p = S.player;
    for (const b of S.bots) {
      if (!b.alive) continue;
      const d = Math.hypot(p.x - b.x, p.z - b.z);
      const visible = S.uavT > 0 || d < 15 || b.state === 'combat';
      if (!visible) continue;
      c.fillStyle = '#ff5a4d'; c.beginPath(); c.arc(sx(b.x), sz(b.z), 3, 0, 7); c.fill();
    }
    // Ping marker (V key): yellow diamond for 5s.
    if (S.ping && S.ping.t > 0) {
      c.fillStyle = '#ffd24d';
      c.beginPath();
      c.moveTo(sx(S.ping.x), sz(S.ping.z) - 5); c.lineTo(sx(S.ping.x) + 5, sz(S.ping.z));
      c.lineTo(sx(S.ping.x), sz(S.ping.z) + 5); c.lineTo(sx(S.ping.x) - 5, sz(S.ping.z));
      c.closePath(); c.fill();
    }
    // Tracker perk: last bot that fired at you, pulsing gold (v23.0.5).
    if (S.trackMark && S.trackMark.t > 0) {
      c.fillStyle = '#ffd24d';
      c.beginPath(); c.arc(sx(S.trackMark.x), sz(S.trackMark.z), 4 + Math.sin(Date.now() / 150) * 1.5, 0, 7); c.fill();
    }
    // Enemy on a killstreak: gold ring (v19.1.5) / ally down: red blink (v19.1.4).
    for (const b of S.bots) {
      if (!b.alive) continue;
      if ((b.streak || 0) >= 5) {
        c.strokeStyle = '#ffd24d'; c.lineWidth = 2;
        c.beginPath(); c.arc(sx(b.x), sz(b.z), 6, 0, 7); c.stroke();
      }
      if (b.team === 'you' && b.down) {
        c.fillStyle = '#ff5a4d';
        c.beginPath(); c.arc(sx(b.x), sz(b.z), 4, 0, 7); c.fill();
      }
    }
    c.fillStyle = '#7ddc7d';
    c.beginPath(); c.arc(sx(p.x), sz(p.z), 3.5, 0, 7); c.fill();
    c.strokeStyle = '#7ddc7d'; c.beginPath();
    c.moveTo(sx(p.x), sz(p.z));
    c.lineTo(sx(p.x) - Math.sin(p.yaw) * 9, sz(p.z) - Math.cos(p.yaw) * 9); c.stroke();
  }
  function killfeed(text, mythic) {
    const d = document.createElement('div');
    d.textContent = text;
    d.className = 'kill kill-' + (S.card || 'firestorm');
    if (mythic && mythic !== 'none') d.classList.add('kill-mythic-' + mythic);
    el.killfeed.prepend(d);
    while (el.killfeed.children.length > 5) el.killfeed.lastChild.remove();
    setTimeout(() => d.remove(), 6000);
  }
  // Radio callout bar (reference HUD): shows a site callout for 4s.
  let radioT = null;
  function showRadio(text) {
    if (!el.radio) return;
    el.radioText.textContent = text;
    el.radio.hidden = false;
    if (radioT) clearTimeout(radioT);
    radioT = setTimeout(() => { el.radio.hidden = true; }, 4000);
  }
  function hitmarker(head, kill, dmg, holdMs = 90) {
    el.hitmarker.classList.add('on');
    el.hitmarker.classList.toggle('head', !!head);
    el.hitmarker.classList.toggle('kill', !!kill);
    clearTimeout(hitT);
    hitT = setTimeout(() => el.hitmarker.classList.remove('on', 'head', 'kill'), holdMs);
    // Floating damage number near the crosshair.
    if (el.dmgNum && typeof dmg === 'number') {
      el.dmgNum.textContent = (head ? 'HEADSHOT ' : '') + Math.round(dmg) + (kill ? ' 💀' : '');
      el.dmgNum.className = 'show' + (head ? ' head' : '') + (kill ? ' kill' : '');
      el.dmgNum.style.left = `calc(50% + ${(Math.random() * 30 - 15).toFixed(0)}px)`;
      // BUGFIX (gameplay pass): hitT is a numeric setTimeout id — writing
      // hitT._dmg on it throws in strict mode on EVERY player hit, aborting
      // onBotHit before game.onKill (kills never counted, no killstreaks).
      // The damage-number timer gets its own variable.
      clearTimeout(dmgT);
      dmgT = setTimeout(() => { el.dmgNum.className = ''; }, 700);
    }
  }
  function vignette() { el.vignette.classList.add('on'); setTimeout(() => el.vignette.classList.remove('on'), 220); }
  function dmgDir(deg, holdMs = 1000) {
    if (!dmgDirEl) return;
    dmgDirEl.style.transform = `translate(-50%,-50%) rotate(${deg.toFixed(0)}deg)`;
    dmgDirEl.classList.add('on');
    clearTimeout(dmgDirT);
    dmgDirT = setTimeout(() => dmgDirEl.classList.remove('on'), holdMs);
  }
  function flashWhite(ms = 300) { el.flash.classList.add('on'); setTimeout(() => el.flash.classList.remove('on'), ms); }
  // Level-up popup: big title + DOM confetti (30 falling pieces, CSS animated).
  function showLevelUp(title) {
    if (!el.levelup) return;
    el.levelup.hidden = false;
    el.levelup.innerHTML = `<div class="lu-title">🎉 ${title}</div><div class="lu-sub">LEVEL UP!</div>` +
      Array.from({ length: 30 }, (_, i) => {
        const c = ['#ff5a4d', '#ffd24d', '#7ddc7d', '#37c8d8', '#c86aff', '#ff8ad8'][i % 6];
        return `<i class="confetti" style="left:${(i * 37) % 100}%;background:${c};animation-delay:${(i % 10) * 0.08}s"></i>`;
      }).join('');
    el.levelup.classList.add('show');
    clearTimeout(showLevelUp._t);
    showLevelUp._t = setTimeout(() => { el.levelup.classList.remove('show'); el.levelup.hidden = true; }, 2600);
  }
  function setProfileChip(html) { if (el.profileChip) el.profileChip.innerHTML = html; }
  function setFps(fps, pingMs) {
    if (el.fps) el.fps.textContent = fps != null ? `FPS ${fps}` : '';
    if (el.ping) el.ping.textContent = pingMs != null ? `Ping ${pingMs} ms • OFFLINE` : '';
  }
  // Scoreboard overlay (hold Tab): local stats only, no server.
  function showScoreboard(on, stats) {
    if (!el.scoreboard) return;
    if (!on) { el.scoreboard.hidden = true; return; }
    el.scoreboard.hidden = false;
    if (stats) {
      el.scoreboard.innerHTML = `<h3>📊 SCOREBOARD</h3>
        <div>Kills <b>${stats.kills}</b> · Deaths <b>${stats.deaths}</b> · K/D <b>${stats.kd}</b></div>
        <div>Streak <b>${stats.streak}</b> · Headshots <b>${stats.headshots}</b></div>
        <div>${stats.rank} · ${stats.elo} ELO · Tier ${stats.tier}/50</div>
        <div>🪙 ${stats.coins} coins · ${stats.mode} · ${stats.map}</div>`;
    }
  }
  function showMenu(title) { el.menuTitle.textContent = title; show(el.menu, true); }
  function hideMenu() { show(el.menu, false); }
  function showEnd(title, sub) {
    el.endTitle.textContent = title; el.endSub.textContent = sub;
    // Match scoreboard (reference end screen): two team tables built only
    // from stats the game already tracks — player kills/deaths/score and
    // each bot's weapon + alive status. Deaths(YOU) = S.botKills is the
    // game's own convention (main.js records matches that way).
    if (el.endTables) {
      const acc = S.shotsFired > 0 ? Math.round((S.shotsHit || 0) / S.shotsFired * 100) : 0;
      // Bot weapon keys (game.js BOT_WEAPON_IDX) → display names from
      // WEAPONS_DB: ax117='ak117' AX-117 Wolverine, kb50='kilo' KB-50
      // Longshot, vx9='qq9' VX-9 Stinger, mp5='mp5' MP5.
      const BOT_WEAPON_NAMES = { ax117: 'AX-117 Wolverine', kb50: 'KB-50 Longshot', vx9: 'VX-9 Stinger', mp5: 'MP5' };
      const wname = (b) => BOT_WEAPON_NAMES[b.weapon] || b.weapon || '—';
      const botRows = (S.bots || []).map((b) =>
        `<tr><td>BOT-${b.id + 1}</td><td>${wname(b)}</td><td>${b.alive ? 'ALIVE' : 'ELIMINATED'}</td></tr>`).join('');
      el.endTables.innerHTML =
        `<div class="end-team"><div class="end-team-head"><span>YOU</span><span>${S.kills}</span></div>`
        + `<table class="end-table"><tr><th>PLAYER</th><th>KILLS</th><th>DEATHS</th><th>SCORE</th></tr>`
        + `<tr><td>YOU</td><td>${S.kills}</td><td>${S.botKills}</td><td>${S.score || 0}</td></tr></table>`
        + `<div class="end-sub2">Accuracy ${acc}% · Headshots ${S.headshots || 0}</div></div>`
        + `<div class="end-team"><div class="end-team-head bot"><span>BOT</span><span>${S.botKills}</span></div>`
        + `<table class="end-table"><tr><th>PLAYER</th><th>WEAPON</th><th>STATUS</th></tr>${botRows}</table></div>`;
    }
    show($('end'), true);
  }
  function hideEnd() { show($('end'), false); }
  function showBuy(on) { show(el.buy, on); }
  function plantBar(showIt, frac, label) {
    show(el.plantBar, showIt);
    if (showIt) { el.plantFill.style.width = Math.round(frac * 100) + '%'; el.plantLabel.textContent = label; }
  }
  function showEmote(emoji) {
    if (!el.emotePop) return;
    el.emotePop.textContent = emoji;
    el.emotePop.classList.add('show');
    setTimeout(() => el.emotePop.classList.remove('show'), 1000);
  }
  function showMythicEffect(kind, emoji) {
    if (!el.mythicFx) return;
    el.mythicFx.className = '';
    el.mythicFx.classList.add(kind);
    el.mythicFx.style.display = 'flex';
    el.mythicFx.innerHTML = `<div class="mythic-pop">${emoji}</div>`;
    setTimeout(() => { el.mythicFx.style.display = 'none'; }, 1000);
  }
  function showMythicKill(kind) {
    if (!el.mythicFx) return;
    const label = kind === 'dragon' ? '🐉 DRAGON KILL!' : '🌀 VOID KILL!';
    el.mythicFx.className = '';
    el.mythicFx.classList.add(kind === 'dragon' ? 'fire' : 'void');
    el.mythicFx.style.display = 'flex';
    el.mythicFx.innerHTML = `<div class="mythic-pop" style="text-align:center"><div style="font-size:80px">${kind === 'dragon' ? '🐉' : '🌀'}</div><div style="font-size:34px;font-weight:900;letter-spacing:.1em">${label}</div></div>`;
    setTimeout(() => { el.mythicFx.style.display = 'none'; }, 1200);
  }
  function flashPurple() {
    if (!el.flashPurple) return;
    el.flashPurple.classList.add('on');
    setTimeout(() => el.flashPurple.classList.remove('on'), 500);
  }
  // ---- Emote wheel ----
  function renderWheel(wheel) {
    if (!el.wheel) return;
    el.wheel.innerHTML = wheel.map((id, i) => {
      const e = EMOTE_DEFS[id] || EMOTE_DEFS.dance;
      const ang = -90 + i * 45;
      return `<button class="wheel-slot${i === wheelSel ? ' sel' : ''}" data-emote="${id}" data-slot="${i}" style="--ang:${ang}deg"><span>${e.icon}</span><b>${e.name}</b></button>`;
    }).join('') + `<div class="wheel-center">🎭</div>`;
  }
  function showWheel(on) {
    if (!el.wheel) return;
    el.wheel.hidden = !on;
    if (on) { wheelVec.x = 0; wheelVec.y = 0; wheelSel = 0; highlightWheel(); }
  }
  function highlightWheel() {
    if (!el.wheel) return;
    el.wheel.querySelectorAll('.wheel-slot').forEach((s, i) => s.classList.toggle('sel', i === wheelSel));
  }
  function wheelMove(dx, dy) {
    wheelVec.x += dx; wheelVec.y += dy;
    const mag = Math.hypot(wheelVec.x, wheelVec.y);
    if (mag < 24) return; // dead zone: keep current selection
    const ang = (Math.atan2(wheelVec.y, wheelVec.x) * 180 / Math.PI + 360) % 360;
    // Slot i sits at (-90 + i*45) deg, i.e. angle measured from top clockwise.
    const rel = (ang + 90 + 360) % 360;
    wheelSel = Math.round(rel / 45) % 8;
    highlightWheel();
  }
  function wheelSelected(wheel) {
    return wheel[wheelSel] || wheel[0];
  }
  // ---- Finisher cinematic overlay ----
  function showFinisher(kind, title, killer, victim, desc) {
    if (!el.finisher) return;
    el.finisher.hidden = false;
    el.finisher.className = 'fin-' + kind;
    el.finTitle.textContent = title;
    el.finSub.textContent = `${killer} ▸ ${victim}`;
    el.finDesc.textContent = desc;
    el.finBar.style.width = '0%';
    requestAnimationFrame(() => el.finisher.classList.add('in'));
  }
  function setFinisherProgress(frac) {
    if (el.finBar) el.finBar.style.width = Math.round(frac * 100) + '%';
  }
  function hideFinisher() {
    if (!el.finisher) return;
    el.finisher.classList.remove('in');
    el.finisher.classList.add('out');
    setTimeout(() => { el.finisher.hidden = true; el.finisher.classList.remove('out'); }, 500);
  }
  // ---- Killcam + spectator ----
  function showKillcam(info) {
    if (!el.killcam) return;
    el.killcam.hidden = false;
    if (el.kcBody) {
      el.kcBody.innerHTML = `
        <div style="font-size:44px">${info.emoji}</div>
        <div style="font-size:22px;font-weight:900">${info.name} — ${info.opName}</div>
        <div style="font-size:13px;opacity:.85">${info.genderIcon} ${info.gender} · Skin: ${info.skinName}</div>
        <div style="font-size:13px;opacity:.85">🔫 ${info.weapon} · Mythic: ${info.mythic}</div>`;
    }
    if (el.kcDetail) {
      el.kcDetail.hidden = true;
      el.kcDetail.innerHTML = `
        <div><b>${info.opName}</b> — ${info.opDesc}</div>
        <div><b>Skin ${info.skinName}</b> — ${info.skinDesc}</div>
        <div><b>Senjata:</b> ${info.weapon} (${info.weaponSkin === 'default' ? 'Standard' : info.weaponSkin})</div>
        <div><b>Mythic:</b> ${info.mythic}</div>`;
    }
  }
  function hideKillcam() {
    if (!el.killcam) return;
    el.killcam.hidden = true;
    if (el.kcDetail) el.kcDetail.hidden = true;
  }
  function showSpectate(name) {
    if (!el.specBar) return;
    el.specBar.hidden = false;
    if (el.specName) el.specName.textContent = name;
  }
  function hideSpectate() { if (el.specBar) el.specBar.hidden = true; }
  function refreshBattlePass() {
    if (!el.bpTier || !S.bp) return;
    el.bpTier.textContent = `Tier ${S.bp.tier}/50`;
    el.bpBar.style.width = Math.round(xpInTier(S.bp) / 500 * 100) + '%';
    el.bpMissions.innerHTML = missionList(S.bp).map(m =>
      `<div>${m.claimed ? '✅' : '🎯'} ${m.label}: <span>${m.done}/${m.target}</span> → +${m.reward} XP</div>`).join('');
  }
  // ---- v24.0.3: one consolidated HUD updater (update() is the body).
  function updateHUDAll(world) { update(world); }
  // ---- v19.0.16: big kill message (title + sub, 2.5s).
  function showKillMessage(title, sub) {
    if (!el.killMsg) return;
    el.killTitle.textContent = title;
    el.killSub.textContent = sub || '';
    el.killMsg.hidden = false;
    el.killMsg.classList.add('show');
    clearTimeout(showKillMessage._t);
    showKillMessage._t = setTimeout(() => { el.killMsg.classList.remove('show'); el.killMsg.hidden = true; }, 2500);
  }
  // ---- v18.1.4: kill confirm visual, 600ms.
  function killConfirmVisual(text) {
    if (!el.killConfirm) return;
    el.killConfirm.textContent = text;
    el.killConfirm.hidden = false;
    el.killConfirm.classList.add('show');
    clearTimeout(killConfirmVisual._t);
    killConfirmVisual._t = setTimeout(() => { el.killConfirm.classList.remove('show'); el.killConfirm.hidden = true; }, 600);
  }
  // ---- v18.2.2: blood on the lens, 1s fade.
  function bloodLens() {
    if (!el.bloodLens) return;
    el.bloodLens.classList.add('on');
    setTimeout(() => el.bloodLens.classList.remove('on'), 1000);
  }
  // ---- v18.0: scope zoom label (2x/4x/8x).
  function setScopeZoom(level) {
    if (!el.scopeZoom) return;
    if (!level) { el.scopeZoom.hidden = true; return; }
    el.scopeZoom.hidden = false;
    el.scopeZoom.textContent = `🔭 ${level}x`;
  }
  // ---- v26.0.1: engine stats from renderer.info (FPS + draws + tris + RAM).
  function setEngineStats(fps, draws, tris, ram) {
    if (!el.engineStats) return;
    el.engineStats.textContent = `⚙️ ${fps} FPS · ${draws} draw calls · ${(tris / 1000).toFixed(0)}k tris${ram != null ? ` · RAM ${ram} MB` : ''}`;
  }
  // ---- v18.2.10: FPS graph, 30 bars (green >50, yellow >30, red below).
  function setFpsGraph(history) {
    if (!el.fpsGraph || !history || !history.length) return;
    el.fpsGraph.innerHTML = history.map(f => {
      const h = Math.max(2, Math.min(20, Math.round(f / 3)));
      const c = f > 50 ? '#7ddc7d' : f > 30 ? '#ffd24d' : '#ff5a4d';
      return `<i style="height:${h}px;background:${c}"></i>`;
    }).join('');
  }
  // ---- v18.2.12: chat log (local chat, filtered in main.js).
  function chatLog(msg) {
    if (!el.chatLog) return;
    const d = document.createElement('div');
    d.textContent = msg;
    el.chatLog.prepend(d);
    while (el.chatLog.children.length > 6) el.chatLog.lastChild.remove();
    setTimeout(() => d.remove(), 8000);
  }
  function showChatBubble(text) {
    if (!el.chatBubble) return;
    el.chatBubble.textContent = text;
    el.chatBubble.hidden = false;
    clearTimeout(showChatBubble._t);
    showChatBubble._t = setTimeout(() => { el.chatBubble.hidden = true; }, 3000);
  }
  // ---- v25.0.8: contextual hint bar.
  function showHint(text) {
    if (!el.hintBar) return;
    el.hintBar.textContent = text || '';
    el.hintBar.style.opacity = text ? '1' : '0';
  }
  function setKillcamTimer(s) { if (el.kcTimer) el.kcTimer.textContent = Math.ceil(s); }
  // ---- v24.0.4: death + victory screens.
  function showDeathScreen(info) {
    if (!el.deathScreen) return;
    el.deathScreen.hidden = false;
    if (el.deathInfo) el.deathInfo.textContent = info || '';
  }
  function hideDeathScreen() { if (el.deathScreen) el.deathScreen.hidden = true; }
  function setDeathTimer(s) { if (el.deathTimer) el.deathTimer.textContent = Math.ceil(s); }
  function showVictoryScreen(title, info) {
    if (!el.victoryScreen) return;
    el.victoryScreen.hidden = false;
    if (el.victoryTitle) el.victoryTitle.textContent = title;
    if (el.victoryInfo) el.victoryInfo.innerHTML = info || '';
  }
  function hideVictoryScreen() { if (el.victoryScreen) el.victoryScreen.hidden = true; }
  // ---- v24.1.8: apply colour choices to HUD elements (real changes, not stubs).
  function applyColors(choices) {
    if (!choices) return;
    if (choices.crosshair && el.crosshair) el.crosshair.style.borderColor = choices.crosshair;
    if (choices.hud && el.hud) el.hud.style.setProperty('--hud-accent', choices.hud);
    if (choices.team && el.hud) el.hud.style.setProperty('--team-color', choices.team);
    document.documentElement.style.setProperty('--crosshair-color', choices.crosshair || '#ffffff');
  }
  // ---- v19.1.1: killfeed entry from raw HTML (bot-vs-bot, team colours).
  function killfeedHtml(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    d.className = 'kill';
    el.killfeed.prepend(d);
    while (el.killfeed.children.length > 5) el.killfeed.lastChild.remove();
    setTimeout(() => d.remove(), 5000);
  }
  // ---- v18.8.8: quick emote bar (tap shortcuts next to the wheel).
  function renderQuickEmotes(emotes) {
    if (!el.quickEmotes) return;
    el.quickEmotes.innerHTML = emotes.map(id => {
      const e = EMOTE_DEFS[id] || EMOTE_DEFS.dance;
      return `<button class="qe-btn" data-emote="${id}" type="button">${e.icon}</button>`;
    }).join('');
  }
  function refreshLoadout() { refreshBattlePass(); }
  function refreshStreaks() { /* redrawn in update() */ }
  function refreshOperator() { /* redrawn in update() */ }
  return {
    update, updateHUDAll, killfeed, killfeedHtml, hitmarker, vignette, dmgDir, flashWhite, flashPurple,
    showMenu, hideMenu, showEnd, hideEnd, showBuy, plantBar,
    showEmote, showMythicEffect, showMythicKill, refreshBattlePass, refreshLoadout, refreshStreaks, refreshOperator,
    renderWheel, showWheel, wheelMove, wheelSelected,
    showFinisher, setFinisherProgress, hideFinisher,
    showKillcam, hideKillcam, showSpectate, hideSpectate,
    showLevelUp, setProfileChip, setFps, setFpsGraph, setEngineStats, showScoreboard,
    showKillMessage, killConfirmVisual, bloodLens, setScopeZoom, showRadio,
    chatLog, showChatBubble, showHint, setKillcamTimer,
    tutorial: {
      open: () => { tutOverlay.hidden = false; },
      close: () => { tutOverlay.hidden = true; },
      isOpen: () => !tutOverlay.hidden,
      toast: () => tutCur,
      toastText: () => { const t = document.getElementById('tutorial-toast-text'); return t ? t.textContent : ''; },
      dismiss: () => tutHideToast(),
      reset: () => { tutShown = { move: false, shoot: false, nade: false }; tutQueue = []; tutHideToast(); tutStartTimer = null; tutLastPhase = S.phase; },
    },
    showDeathScreen, hideDeathScreen, setDeathTimer, showVictoryScreen, hideVictoryScreen,
    applyColors, renderQuickEmotes,
    onPlay(cb) { $('play').addEventListener('click', cb); },
    onRestart(cb) { $('restart').addEventListener('click', cb); },
    onBuyItem(cb) { el.buyItems.addEventListener('click', (e) => { const b = e.target.closest('[data-buy]'); if (b) cb(b.dataset.buy); }); },
    setBuyHtml(html) { el.buyItems.innerHTML = html; },
    onStreak(cb) { el.ksList.addEventListener('click', (e) => { const b = e.target.closest('[data-streak]'); if (b) cb(b.dataset.streak); }); },
    onWheelBtn(cb) { el.wheelBtn && el.wheelBtn.addEventListener('click', cb); },
    onWheelSlot(cb) { el.wheel && el.wheel.addEventListener('click', (e) => { const b = e.target.closest('[data-emote]'); if (b) cb(b.dataset.emote); }); },
    onKillcamDetail(cb) { const b = $('killcam-detail-btn'); b && b.addEventListener('click', () => { if (el.kcDetail) el.kcDetail.hidden = !el.kcDetail.hidden; cb && cb(); }); },
    onKillcamSkip(cb) { const b = $('killcam-skip'); b && b.addEventListener('click', cb); },
    onSpecNext(cb) { const b = $('spec-next'); b && b.addEventListener('click', cb); },
    onSpecPrev(cb) { const b = $('spec-prev'); b && b.addEventListener('click', cb); },
    onSpecExit(cb) { const b = $('spec-exit'); b && b.addEventListener('click', cb); },
    onSpecFree(cb) { const b = $('spec-free'); b && b.addEventListener('click', cb); },
    onSurrender(cb) { const b = $('surrender-btn'); b && b.addEventListener('click', cb); },
    onDSToggle(cb) { const b = $('ds-toggle'); b && b.addEventListener('click', cb); },
    setDS(on) { const b = $('ds-toggle'); if (b) b.classList.toggle('on', !!on); },
    onDeathSkip(cb) { const b = $('death-skip'); b && b.addEventListener('click', cb); },
    onVictoryClose(cb) { const b = $('victory-close'); b && b.addEventListener('click', cb); },
    onQuickEmote(cb) { el.quickEmotes && el.quickEmotes.addEventListener('click', (e) => { const b = e.target.closest('[data-emote]'); if (b) cb(b.dataset.emote); }); },
    onDashBtn(cb) { const b = $('dash-btn'); if (!b) return; b.addEventListener('pointerdown', () => cb()); },
    onScopeBtn(cb) { const b = $('scope-btn'); if (!b) return; b.addEventListener('pointerdown', () => cb()); },
    onReloadBtn(cb) { const b = $('reload-btn'); if (!b) return; b.addEventListener('pointerdown', () => cb()); },
    onFireBtn(cb, up) { const bind = (b) => { if (!b) return; b.addEventListener('pointerdown', () => cb(true)); b.addEventListener('pointerup', () => cb(false)); b.addEventListener('pointerleave', () => cb(false)); }; bind($('fire-btn')); bind($('fire-btn-left')); },
    onCrouchBtn(cb) { const b = $('crouch-btn'); if (!b) return; b.addEventListener('pointerdown', () => cb(true)); b.addEventListener('pointerup', () => cb(false)); b.addEventListener('pointerleave', () => cb(false)); },
    onAdsBtn(cb) { const b = $('ads-btn'); if (!b) return; b.addEventListener('pointerdown', () => cb(true)); b.addEventListener('pointerup', () => cb(false)); b.addEventListener('pointerleave', () => cb(false)); },
    money() { return S.economy.money; },
  };
}
