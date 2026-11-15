// Rounds, bomb plant/defuse, economy, buy menu, grenades.
import * as THREE from 'three';

export function createGame(S, world, bots, hud, audio, scene) {
  let buyOpen = false;
  let beepT = 0;
  // Bomb mesh (hidden until planted)
  const bombMesh = new THREE.Group();
  const bombBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x1c1e20, roughness: 0.4, metalness: 0.6 }));
  const bombLight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
  bombLight.position.set(0.2, 0.25, 0);
  bombMesh.add(bombBody, bombLight);
  bombMesh.visible = false; scene.add(bombMesh);
  // Smoke meshes pool
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0x9aa0a0, transparent: true, opacity: 0.55, depthWrite: false });
  const smokeMeshes = [];

  function resetPlayer() {
    const p = S.player, sp = world.spawns.player;
    p.x = sp.x; p.z = sp.z; p.y = 0; p.vx = 0; p.vz = 0; p.vy = 0;
    p.yaw = sp.yaw; p.pitch = 0; p.hp = 100; p.alive = true;
    p.armor = S.keepArmor ? p.armor : 0;
    p.weaponIdx = 0;
  }
  function startRound() {
    S.phase = 'playing';
    S.round.timer = 100;
    S.round.result = '';
    S.bomb = { state: 'none', site: null, x: 0, z: 0, plantT: 0, fuse: 40, defuseT: 0, defuser: -1 };
    S.grenades.smokes = [];
    for (const m of smokeMeshes) m.visible = false;
    bombMesh.visible = false;
    S.lastShotPos = null;
    resetPlayer();
    bots.spawnAll();
    hud.hideMenu(); hud.hideEnd(); hud.showBuy(false); buyOpen = false;
    S.msg = `ROUND ${S.round.num} — PLANT THE CHARGE AT FURNACE OR CRANE YARD`;
    S.msgT = 4;
  }
  function endRound(won, reason) {
    if (S.phase !== 'playing') return;
    S.phase = 'roundEnd';
    S.round.result = won ? 'won' : 'lost';
    if (won) { S.round.wins += 1; S.economy.money += 1000; audio.win(); }
    else { S.round.losses += 1; audio.lose(); }
    const matchOver = S.round.wins >= S.round.winAt || S.round.losses >= S.round.winAt || S.round.num >= S.round.maxRounds;
    const title = matchOver
      ? (S.round.wins > S.round.losses ? 'MATCH WON' : 'MATCH LOST')
      : (won ? 'ROUND WON' : 'ROUND LOST');
    const sub = `${reason}  •  Score ${S.round.wins} - ${S.round.losses}` +
      (matchOver ? '  •  Click RESTART for a new match' : '  •  Click CONTINUE for the next round');
    hud.showEnd(title, sub);
    if (document.pointerLockElement) document.exitPointerLock();
    if (matchOver) S.phase = 'matchEnd';
  }
  function nextRound() {
    if (S.phase === 'matchEnd') {
      S.round = { num: 1, wins: 0, losses: 0, timer: 100, maxRounds: 5, winAt: 3, result: '' };
      S.economy.money = 800;
      S.owned = [true, false, false];
      for (const w of S.weapons) { w.mag = w.magSize; w.reserve = w.magSize * 3; w.reloading = false; }
      S.kills = 0;
    } else {
      S.round.num += 1;
    }
    startRound();
  }
  function nearestSite() {
    const p = S.player;
    for (const key of ['A', 'B']) {
      const s = world.sites[key];
      if (Math.hypot(p.x - s.x, p.z - s.z) < s.r) return key;
    }
    return null;
  }
  function buyHtml() {
    const rows = S.weapons.map((w, i) => {
      const owned = S.owned[i];
      const price = owned ? 'OWNED' : '$' + w.price;
      return `<button data-buy="w${i}" class="buy-row"><b>${w.name}</b><span>${w.dmg} dmg · ${w.magSize} mag · ${price}</span></button>`;
    }).join('');
    return rows + `<button data-buy="armor" class="buy-row"><b>Full Armor</b><span>absorbs 60% of damage · $1000</span></button>
      <div class="buy-note">Money: $${S.economy.money} — press B to close</div>`;
  }
  function toggleBuy() {
    if (S.phase !== 'playing' && S.phase !== 'roundEnd') return;
    buyOpen = !buyOpen;
    if (buyOpen) { hud.setBuyHtml(buyHtml()); hud.showBuy(true); if (document.pointerLockElement) document.exitPointerLock(); }
    else hud.showBuy(false);
  }
  function buy(id) {
    if (id === 'armor') {
      if (S.economy.money >= 1000 && S.player.armor < 100) { S.economy.money -= 1000; S.player.armor = 100; S.keepArmor = true; }
    } else {
      const i = Number(id.slice(1)), w = S.weapons[i];
      if (!S.owned[i] && S.economy.money >= w.price) {
        S.economy.money -= w.price; S.owned[i] = true; S.player.weaponIdx = i;
      } else if (S.owned[i]) S.player.weaponIdx = i;
    }
    hud.setBuyHtml(buyHtml());
  }
  function throwGrenade(kind, camera) {
    const g = S.grenades;
    const p = S.player;
    if (kind === 'smoke' && g.smoke > 0) {
      g.smoke -= 1;
      const fx = p.x - Math.sin(p.yaw) * 10, fz = p.z - Math.cos(p.yaw) * 10;
      const s = { x: fx, z: fz, r: 5, t: 12 };
      g.smokes.push(s);
      let m = smokeMeshes.find(m => !m.visible);
      if (!m) { m = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 10), smokeMat); scene.add(m); smokeMeshes.push(m); }
      m.position.set(fx, 1.5, fz); m.visible = true;
      S.msg = 'SMOKE OUT'; S.msgT = 1.5;
    } else if (kind === 'flash' && g.flash > 0) {
      g.flash -= 1;
      hud.flashWhite();
      for (const b of S.bots) if (b.alive && Math.hypot(b.x - p.x, b.z - p.z) < 30) b.blindT = 3;
      S.msg = 'FLASH OUT'; S.msgT = 1.5;
    } else if (kind === 'he' && g.he > 0) {
      g.he -= 1;
      const fx = p.x - Math.sin(p.yaw) * 12, fz = p.z - Math.cos(p.yaw) * 12;
      for (const b of S.bots) {
        if (!b.alive) continue;
        const d = Math.hypot(b.x - fx, b.z - fz);
        if (d < 7) { const killed = bots.damage(b, Math.round(120 - d * 12)); if (killed) onKill(b); }
      }
      audio.explosion(); S.msg = 'FRAG OUT'; S.msgT = 1.5;
    }
  }
  function onKill(bot) {
    S.kills += 1; S.economy.money += 300;
    hud.killfeed(`YOU ▸ BOT-${bot.id + 1}  +$300`);
  }
  function step(dt, keys) {
    if (S.phase !== 'playing') return;
    S.round.timer -= dt;
    // Smoke decay
    for (let i = 0; i < S.grenades.smokes.length; i++) {
      const s = S.grenades.smokes[i]; s.t -= dt;
      if (s.t <= 0) { smokeMeshes[i] && (smokeMeshes[i].visible = false); }
    }
    // Plant: hold E near a site
    const site = nearestSite();
    if (S.bomb.state === 'none' && site && keys.has('KeyE') && S.player.alive) {
      S.bomb.plantT += dt;
      hud.plantBar(true, S.bomb.plantT / 4, 'PLANTING…');
      if (S.bomb.plantT >= 4) {
        S.bomb.state = 'planted'; S.bomb.site = site;
        const s = world.sites[site];
        S.bomb.x = s.x; S.bomb.z = s.z; S.bomb.fuse = 40;
        bombMesh.position.set(s.x, 0.25, s.z); bombMesh.visible = true;
        audio.plant();
        S.msg = `CHARGE PLANTED AT ${s.name.toUpperCase()} — DEFEND IT`; S.msgT = 4;
        hud.killfeed(`CHARGE PLANTED — ${s.name}`);
        hud.plantBar(false, 0, '');
      }
    } else {
      S.bomb.plantT = Math.max(0, S.bomb.plantT - dt * 2);
      if (S.bomb.state === 'none') hud.plantBar(false, 0, '');
    }
    if (S.bomb.state === 'defused') { endRound(false, 'CHARGE DEFUSED'); return; }
    if (S.bomb.state === 'planted') {
      S.bomb.fuse -= dt;
      beepT -= dt;
      if (beepT <= 0) { beepT = S.bomb.fuse < 10 ? 0.4 : 1; audio.beep(); }
      bombLight.material.color.setHex(Math.floor(S.time * 4) % 2 ? 0xff3b30 : 0xffffff);
      if (S.bomb.defuseT > 0) hud.plantBar(true, S.bomb.defuseT / 7, 'ENEMY DEFUSING…');
      if (S.bomb.fuse <= 0) {
        bombMesh.visible = false; audio.explosion();
        endRound(true, 'CHARGE DETONATED'); return;
      }
    }
    if (S.round.timer <= 0) {
      endRound(false, S.bomb.state === 'planted' ? 'TIME UP' : 'TIME EXPIRED — NO PLANT');
      return;
    }
    if (!S.player.alive) { endRound(false, 'YOU WERE ELIMINATED'); return; }
    const alive = S.bots.filter(b => b.alive).length;
    if (alive === 0) { endRound(true, S.bomb.state === 'planted' ? 'SITE CLEARED — CHARGE STANDS' : 'ALL HOSTILES ELIMINATED'); }
  }
  return { startRound, endRound, nextRound, toggleBuy, buy, throwGrenade, onKill, step, buyHtml };
}
