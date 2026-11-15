// HUD: DOM updates, minimap, compass, killfeed, hitmarker, overlays, buy menu.
export function createHud(S) {
  const $ = (id) => document.getElementById(id);
  const el = {
    hp: $('hp'), armor: $('armor'), money: $('money'), ammoMag: $('ammo-mag'),
    ammoRes: $('ammo-reserve'), weapon: $('weapon-name'), timer: $('timer'),
    score: $('score-value'), round: $('round-label'), compass: $('compass'),
    minimap: $('minimap'), killfeed: $('killfeed'), hitmarker: $('hitmarker'),
    msg: $('center-msg'), vignette: $('vignette'), flash: $('flash'),
    menu: $('menu'), buy: $('buy-menu'), buyItems: $('buy-items'),
    endTitle: $('end-title'), endSub: $('end-sub'), menuTitle: $('menu-title'),
    plantBar: $('plant-bar'), plantFill: $('plant-fill'), plantLabel: $('plant-label'),
  };
  const mm = el.minimap.getContext('2d');
  let hitT = null;
  function show(node, on) { if (node) node.hidden = !on; }
  function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  function update(world) {
    const p = S.player, w = S.weapons[S.player.weaponIdx];
    el.hp.textContent = Math.ceil(p.hp);
    el.armor.textContent = Math.ceil(p.armor);
    el.money.textContent = '$' + S.economy.money;
    el.ammoMag.textContent = w.mag;
    el.ammoRes.textContent = '/ ' + w.reserve + (w.reloading ? '  RELOADING' : '');
    el.weapon.textContent = w.name;
    el.timer.textContent = fmtTime(S.round.timer);
    el.score.textContent = `${S.round.wins} - ${S.round.losses}`;
    el.round.textContent = `ROUND ${S.round.num} / ${S.round.maxRounds}`;
    // Compass: yaw 0 = N
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const deg = ((-p.yaw * 180 / Math.PI) % 360 + 360) % 360;
    el.compass.textContent = dirs[Math.round(deg / 45) % 8] + ' ' + Math.round(deg) + '°';
    el.msg.textContent = S.msgT > 0 ? S.msg : '';
    drawMinimap(world);
  }
  function drawMinimap(world) {
    const c = mm, W = 148, H = 100;
    c.clearRect(0, 0, W, H);
    c.fillStyle = 'rgba(10,12,10,0.72)'; c.fillRect(0, 0, W, H);
    const sx = (x) => (x + 40) / 80 * W, sz = (z) => (z + 28) / 56 * H;
    c.fillStyle = '#5c6b70';
    for (const col of world.colliders) {
      if (col.h < 1.2) continue;
      c.fillRect(sx(col.x0), sz(col.z0), Math.max(2, sx(col.x1) - sx(col.x0)), Math.max(2, sz(col.z1) - sz(col.z0)));
    }
    for (const key of ['A', 'B']) {
      const s = world.sites[key];
      c.strokeStyle = key === 'A' ? '#f0a830' : '#37c8d8'; c.lineWidth = 2;
      c.beginPath(); c.arc(sx(s.x), sz(s.z), 7, 0, 7); c.stroke();
      c.fillStyle = c.strokeStyle; c.font = 'bold 10px sans-serif'; c.fillText(key, sx(s.x) - 3, sz(s.z) + 3);
    }
    if (S.bomb.state === 'planted') {
      c.fillStyle = '#ff5a4d'; c.beginPath(); c.arc(sx(S.bomb.x), sz(S.bomb.z), 4, 0, 7); c.fill();
    }
    for (const b of S.bots) {
      if (!b.alive) continue;
      c.fillStyle = '#ff5a4d'; c.beginPath(); c.arc(sx(b.x), sz(b.z), 3, 0, 7); c.fill();
    }
    const p = S.player;
    c.fillStyle = '#7ddc7d';
    c.beginPath(); c.arc(sx(p.x), sz(p.z), 3.5, 0, 7); c.fill();
    c.strokeStyle = '#7ddc7d'; c.beginPath();
    c.moveTo(sx(p.x), sz(p.z));
    c.lineTo(sx(p.x) - Math.sin(p.yaw) * 9, sz(p.z) - Math.cos(p.yaw) * 9); c.stroke();
  }
  function killfeed(text) {
    const d = document.createElement('div');
    d.textContent = text; el.killfeed.prepend(d);
    while (el.killfeed.children.length > 5) el.killfeed.lastChild.remove();
    setTimeout(() => d.remove(), 6000);
  }
  function hitmarker(head, holdMs = 90) {
    el.hitmarker.classList.add('on');
    el.hitmarker.classList.toggle('head', !!head);
    clearTimeout(hitT);
    hitT = setTimeout(() => el.hitmarker.classList.remove('on'), holdMs);
  }
  function vignette() { el.vignette.classList.add('on'); setTimeout(() => el.vignette.classList.remove('on'), 220); }
  function flashWhite() { el.flash.classList.add('on'); setTimeout(() => el.flash.classList.remove('on'), 300); }
  function showMenu(title) { el.menuTitle.textContent = title; show(el.menu, true); }
  function hideMenu() { show(el.menu, false); }
  function showEnd(title, sub) { el.endTitle.textContent = title; el.endSub.textContent = sub; show($('end'), true); }
  function hideEnd() { show($('end'), false); }
  function showBuy(on) { show(el.buy, on); }
  function plantBar(showIt, frac, label) {
    show(el.plantBar, showIt);
    if (showIt) { el.plantFill.style.width = Math.round(frac * 100) + '%'; el.plantLabel.textContent = label; }
  }
  return {
    update, killfeed, hitmarker, vignette, flashWhite,
    showMenu, hideMenu, showEnd, hideEnd, showBuy, plantBar,
    onPlay(cb) { $('play').addEventListener('click', cb); },
    onRestart(cb) { $('restart').addEventListener('click', cb); },
    onBuyItem(cb) { el.buyItems.addEventListener('click', (e) => { const b = e.target.closest('[data-buy]'); if (b) cb(b.dataset.buy); }); },
    setBuyHtml(html) { el.buyItems.innerHTML = html; },
    money() { return S.economy.money; },
  };
}
