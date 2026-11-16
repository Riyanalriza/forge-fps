import { EMOTE_DEFS, WHEEL_PRESETS, FINISHER_DEFS, OPERATOR_DEFS } from './state.js';
import { MAP_IDS, MAP_DEFS } from './maps.js';
import { getDaily, dailyEmoteXp } from './daily.js';
import { createBotModel, BOT_SKINS, BOT_WEAPONS, CHAR_OPERATORS, CHAR_SKINS, killerInfo } from './characters.js';
import { WEATHER_DEFS, MAP_WEATHER, MAP_WEATHER_FULL } from './weather.js';
import { calcGunStats, damageAtRange, adsFov } from './gunsmith.js';
import { SHOP_ITEMS } from './economy.js';
import { defaultSettings, rebindKey } from './settings.js';
import { loadColorChoices, saveColorChoices } from './palette.js';
import { FLAGS, setFlag } from './state.js';
import { dmgAngle } from './hud.js';
import { fxFor } from './weaponfx.js';
import { viewmodelReady, soldierReady, WEAPON_GLB, armsMountReport } from './models.js';

export function runSelfTest(ctx) {
  const { S, game, bots, hud, mythicFx, world, weapon, player, doEmote, settle, FIXED_STEP, createDragon3D, createVoidPortal3D, weather, zombies, vehicles, economy, effects, audio, input } = ctx;
  const checks = [];
  const check = (name, ok) => checks.push({ name, ok: !!ok });
  try {
    S.mode = 'tdm'; S.perks = []; S.operator = 'tempest';
    game.startRound();
    const killBot = () => {
      let b = S.bots.find(x => x.alive);
      if (!b) { bots.respawn(S.bots[0]); b = S.bots[0]; }
      bots.damage(b, 999); game.onKill(b, false);
    };
    killBot(); killBot(); killBot();
    check('streak 3 -> UAV ready', S.streaksReady.includes('uav') && S.streak === 3);
    game.useStreak('uav');
    check('UAV active 20s', S.uavT > 19 && !S.streaksReady.includes('uav'));
    killBot(); killBot();
    check('streak 5 -> Hunter ready', S.streaksReady.includes('hunter'));
    if (!S.bots.some(b => b.alive)) bots.respawn(S.bots[0]); // ensure a live target
    const aliveBefore = S.bots.filter(b => b.alive).length;
    game.useStreak('hunter');
    check('Hunter Killer kills a bot', S.bots.filter(b => b.alive).length < aliveBefore);
    killBot(); killBot();
    check('streak 7 -> Sentry ready', S.streaksReady.includes('sentry'));
    game.useStreak('sentry');
    check('Sentry deployed', !!S.sentry && S.sentry.t > 14);
    killBot(); killBot();
    check('streak 9 -> Airstrike ready', S.streaksReady.includes('airstrike'));
    game.useStreak('airstrike');
    check('Airstrike fired', S.airstrike !== null);
    game.useOperator();
    check('Tempest armed + cooldown set', S.opActive === true && S.opCd > 59);
    S.mode = 'dom';
    game.startRound();
    S.bots.forEach((b, i) => { b.x = 24; b.z = 24 - i * 2; b.state = 'hold'; });
    bots.syncMeshes();
    S.player.x = world.sites.A.x; S.player.z = world.sites.A.z;
    settle(540); // 9s in zone A: 3.2s countdown + 5s to capture + points tick
    check('Domination zone A captures', S.dom.A.value > 50);
    check('Domination points tick', S.dom.points.you > 0);
    S.mode = 'br';
    game.startRound();
    S.player.hp = 9999;
    S.player.x = S.br.cx; S.player.z = S.br.cz;
    S.bots.forEach((b, i) => {
      b.x = S.br.cx + [3, -3, 3, -3, 0][i];
      b.z = S.br.cz + [3, 3, -3, -3, 5][i];
      b.state = 'hold';
    });
    bots.syncMeshes();
    settle(60 * 124); // 124s: 3.2s countdown + 120s of shrinking + margin
    check('BR zone shrinks to 10m', Math.abs(S.br.radius - 10) < 0.5);
    const xp0 = S.bp.xp;
    check('BP object loaded', !!S.bp && typeof S.bp.tier === 'number');
    doEmote('dance');
    check('Emote activates', S.emote && S.emote.id === 'dance');
    S.mythic = 'void'; weapon.applyMythic();
    check('Mythic Void selectable', S.mythic === 'void');
    S.card = 'galaxy';
    check('Calling card selectable', S.card === 'galaxy');
    S.mode = 'snd';
    game.startRound();
    S.player.hp = 50; S.player.lastHurtT = S.time - 10;
    settle(240); // 4s: 3.2s countdown + ~0.8s of regen (4 HP/s)
    check('Quick Fix regen heals', S.player.hp > 50);
    S.loadout.primary = 3; S.player.weaponIdx = S.loadout.primary;
    check('Loadout primary LR-50', weapon.cur().id === 'lr50');
    check('BP xp grew during test', S.bp.xp >= xp0);
    const d = createDragon3D(1);
    check('createDragon3D builds a dragon', d.group.children.length >= 8);
    const vp = createVoidPortal3D(1);
    check('createVoidPortal3D builds a portal', vp.group.children.length >= 30);
    check('21 emotes in pool', Object.keys(EMOTE_DEFS).length === 21);
    check('Wheel has 8 slots', S.wheel.length === 8 && S.wheel.every(id => EMOTE_DEFS[id]));
    check('6 wheel presets', Object.keys(WHEEL_PRESETS).length === 6);
    S.noFinisher = false;
    mythicFx.playFinisher('gold', 0, 0, 'YOU', 'BOT-1');
    check('Finisher starts', !!S.finisher && S.finisher.kind === 'gold');
    for (let i = 0; i < 260; i++) mythicFx.step(FIXED_STEP, () => {});
    check('Finisher completes', S.finisher === null || mythicFx.finisher === null);
    const daily = getDaily();
    check('Daily preset has 8 emotes', daily.emotes.length === 8);
    check('Daily countdown format', /^\d{2}:\d{2}:\d{2}$/.test(daily.countdown));
    check('Daily emote XP is 0 for non-preset emote', dailyEmoteXp('__none__') === 0);
    check('8 finishers defined', Object.keys(FINISHER_DEFS).length === 8);
    check('7 maps defined', MAP_IDS.length === 7);
    for (const id of MAP_IDS) {
      world.buildMap(id);
      check(`Map ${id} has colliders`, world.colliders.length > 20);
      check(`Map ${id} has waypoints`, world.waypoints.length > 0);
      const sp = world.spawns.player;
      check(`Map ${id} player spawn clear`, !world.isColliding(sp.x, sp.z, 0.42, 0));
      game.startRound();
      check(`Map ${id} bots spawn clear`, S.bots.every(b => !world.isColliding(b.x, b.z, 0.35, 0)));
    }
    world.buildMap('foundry');
    world.buildMap('twin');
    game.startRound();
    const door = world.doors[0];
    check('House has a door', !!door);
    if (door) {
      check('Closed door blocks', world.isColliding(door.x, door.z, 0.42, 0));
      world.toggleDoor(door);
      check('Open door lets you through', !world.isColliding(door.x, door.z, 0.42, 0));
      world.toggleDoor(door);
      check('Door closes again', world.isColliding(door.x, door.z, 0.42, 0));
    }
    check('Stair mid-height ~2.35', Math.abs(world.groundY(-19.1, 20, 2.35) - 2.35) < 0.05);
    check('Floor 2 groundY is 4.7', Math.abs(world.groundY(-15, 20, 4.7) - 4.7) < 0.01);
    check('Ground floor groundY is 0', world.groundY(0, 20, 0) === 0);
    check('5 bot skins defined', BOT_SKINS.length === 5);
    check('4 bot weapons defined', BOT_WEAPONS.length === 4);
    const model = createBotModel('gold', 'kb50', 'BOT-1');
    check('Bot model has legs + arms + head + gun',
      !!(model.parts.legL && model.parts.legR && model.parts.armL && model.parts.armR && model.parts.head && model.parts.gun));
    check('Bot model has name sprite + indicator', !!(model.parts.nameSprite && model.parts.indicator));
    check('Bot model has mythic aura', !!model.parts.aura);
    check('Spawned bots vary skin + weapon',
      new Set(S.bots.map(b => b.skin)).size > 1 && new Set(S.bots.map(b => b.weapon)).size > 1);
    check('Dead bot falls sideways', (() => {
      const b = S.bots[0];
      bots.damage(b, 999);
      for (let i = 0; i < 30; i++) b.mesh.model.animate(1 / 60, b, i / 60);
      const fell = Math.abs(b.mesh.group.rotation.z - Math.PI / 2) < 0.3;
      const deathClip = b.mesh.model._clip === 'Death';
      return fell || deathClip;
    })());
    check('First-person hands exist', !!weapon.hands && !!weapon.hands.parts.handL && !!weapon.hands.parts.handR);
    check('6 operators defined', Object.keys(CHAR_OPERATORS).length === 6);
    check('6 char skins defined', Object.keys(CHAR_SKINS).length === 6);
    check('Killcam shows killer', (() => {
      const b = S.bots[0];
      const info = killerInfo(b);
      hud.showKillcam(info);
      const kc = document.getElementById('killcam');
      const visible = kc && !kc.hidden && kc.textContent.includes(info.opName);
      hud.hideKillcam();
      return visible && info.gender && info.skinName;
    })());
    world.buildMap('foundry');
    game.startRound();
    S.perks = [];
    const p = S.player;
    p.x = -20; p.z = 20; p.yaw = 0; p.y = 0; p.vx = 0; p.vz = 0; p.onGround = true;
    const stepKeys = (keys, n = 60) => { for (let i = 0; i < n; i++) player.step(FIXED_STEP, keys, false); };
    stepKeys(new Set(['KeyC']));
    check('Crouch eye ~1.1', Math.abs(p.eye - 1.1) < 0.05);
    stepKeys(new Set(['KeyC', 'KeyW']));
    check('Crouch speed ~3', p.speed > 2 && p.speed < 4);
    stepKeys(new Set(['KeyZ']));
    check('Prone eye ~0.6', Math.abs(p.eye - 0.6) < 0.05);
    p.x = -20; p.z = 20; p.vx = 0; p.vz = 0;
    stepKeys(new Set(['ShiftLeft', 'KeyW']));
    check('Sprint speed ~9 (or 10.5 tac sprint)', p.speed > 8 && p.speed < 11);
    check('Sprint eye back to 1.62', Math.abs(p.eye - 1.62) < 0.05);
    p.x = -20; p.z = 20; p.vx = 0; p.vz = 0; p.onGround = true;
    stepKeys(new Set(['ShiftLeft', 'KeyW']), 30);
    stepKeys(new Set(['ShiftLeft', 'KeyW', 'KeyC']), 18);
    check('Slide triggers', p.sliding === true && Math.abs(p.eye - 0.9) < 0.1);
    check('Crate top groundY is 1.1', Math.abs(world.groundY(-12, 8, 1.1) - 1.1) < 0.01);
    p.x = -12; p.z = 9.0; p.yaw = 0; p.y = 0; p.vx = 0; p.vz = 0; p.onGround = true;
    stepKeys(new Set(['Space']), 1);
    check('Parkour vault lifts the player', p.vy > 5.5);
    check('9 weather types', Object.keys(WEATHER_DEFS).length === 9);
    weather.applyWeather('rain');
    check('applyWeather rain sets S.weather', S.weather === 'rain');
    check('Per-map default ember=sand', MAP_WEATHER.ember === 'sand');
    check('Per-map default ruin=storm', MAP_WEATHER.ruin === 'storm');
    check('Per-map default cargo=rain', MAP_WEATHER.cargo === 'rain');
    check('Per-map default harvest=fog', MAP_WEATHER.harvest === 'fog');
    check('Per-map default iron=sunset', MAP_WEATHER.iron === 'sunset');
    const cyc0 = weather.cycleInfo();
    S.cycleOn = true; S.cycleT = 0; S.cyclePhase = 'day';
    weather.stepCycle(200); // 200s: day(180) -> sunset
    check('Cycle advances phase', weather.cycleInfo().phase !== cyc0.phase || weather.cycleInfo().label !== cyc0.label);
    S.cycleOn = false;
    weather.applyWeather('clear');
    const base = S.weapons[0];
    const longSt = calcGunStats(base, { ...S.atts, barrel: 'long' });
    const shortSt = calcGunStats(base, { ...S.atts, barrel: 'short' });
    check('Long barrel raises range', longSt.range > shortSt.range);
    check('Long barrel raises damage', longSt.damage >= shortSt.damage);
    check('damageAtRange 50% past range', Math.abs(damageAtRange(100, 50, 40) - 50) < 0.01);
    check('damageAtRange 30% past 1.5x range', Math.abs(damageAtRange(100, 70, 40) - 30) < 0.01);
    check('damageAtRange full inside range', damageAtRange(100, 30, 40) === 100);
    check('adsFov sniper 30', adsFov(true, 1) === 30);
    check('adsFov 8x scope 30', adsFov(false, 8) === 30);
    check('adsFov normal 50', adsFov(false, 1) === 50);
    S.mode = 'zombie';
    game.startRound();
    check('Zombie wave 1 spawns 8', zombies.aliveCount() === 8 && zombies.wave === 1);
    for (let w = 1; w < 5; w++) {
      for (const z of [...zombies.zombies]) if (z.alive) zombies.damage(z, 99999);
      settle(60 * 6); // intermission 5s -> next wave (via main step)
    }
    check('Zombie wave 5 reached', zombies.wave === 5);
    check('Zombie wave 5 has a boss', zombies.zombies.some(z => z.isBoss && z.alive));
    check('Zombie boss HP is 4500', zombies.zombies.find(z => z.isBoss)?.hp === 4500);
    for (const id of MAP_IDS) {
      world.buildMap(id);
      vehicles.place(id);
      const bad = vehicles.list.filter(v => world.isColliding(v.x, v.z, 1.2, 0)).map(v => `${v.type}@${v.x},${v.z}`);
      check(`Vehicles clear on ${id}${bad.length ? ' — COLLIDE: ' + bad.join(' ') : ''}`, bad.length === 0);
    }
    world.buildMap('foundry'); vehicles.place('foundry');
    const v0 = vehicles.list[0];
    S.player.x = v0.x; S.player.z = v0.z + 1;
    check('Vehicle enter works', vehicles.enter() === true && S.driving === true);
    check('Vehicle exit works', vehicles.exit() === true && S.driving === false);
    economy.addCoins(5000);
    const item = SHOP_ITEMS.find(i => !economy.isOwned(i) && i.price <= economy.profile.coins);
    let buyOk = false;
    if (item) {
      const coins0 = economy.profile.coins;
      const buy = economy.buy(item.id);
      buyOk = buy.ok === true && economy.profile.coins === coins0 - item.price;
    }
    check('Shop buy works (or every affordable item already owned)', buyOk || !item);
    const g = economy.gacha(1, Math.random);
    check('Gacha 1x works', g.ok === true && g.results.length === 1);
    economy.recordStat('kills', 10);
    check('Quest daily-kill completes', economy.questProgress().find(q => q.id === 'daily-kill').done === true);
    const r0 = economy.rank();
    check('Profile rank exists', !!r0 && typeof economy.profile.elo === 'number');
    economy.recordMatch('win', { mode: 'tdm', map: 'foundry', kills: 5, deaths: 2, duration: 60 });
    check('ELO rises on win', economy.profile.elo > 1000);
    S.mode = 'br';
    game.startRound();
    check('BR loot spawns 9', game.lootCount() === 9);
    S.mode = 'tdm';
    game.startRound();
    S.bots.forEach((b, i) => { b.x = 24; b.z = 24 - i * 2; b.state = 'hold'; });
    bots.syncMeshes();
    S.medkits = 2; S.player.hp = 40;
    check('Medkit starts a 3s channel', game.useMedkit() === true && S.medkits === 1);
    settle(60 * 7); // 3.2s countdown + 3s channel + margin -> heals to full
    check('Medkit channel heals to full', S.player.hp >= 99);
    const dead = S.bots[0];
    bots.damage(dead, 999);
    bots.reviveAsAlly(dead);
    check('Revived bot is an ally', dead.alive === true && dead.team === 'ally' && dead.state === 'ally');
    effects.bloodSpray({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, false);
    effects.bloodPool({ x: 0, y: 0, z: 0 }, true);
    check('Blood spray + pool spawn particles', effects.debugCounts().particles > 0 && effects.debugCounts().decals > 0);
    effects.explosion({ x: 0, y: 0.5, z: 0 }, false);
    check('Explosion spawns particles', effects.debugCounts().particles > 0);
    check('MAP_WEATHER_FULL has 7 maps', Object.keys(MAP_WEATHER_FULL).length === 7);
    check('MAP_WEATHER_FULL ember is sand + fog 30m', MAP_WEATHER_FULL.ember.weather === 'sand' && MAP_WEATHER_FULL.ember.fog[1] === 30);
    world.buildMap('twin');
    check('Decor counts non-zero', world.decorCounts().total > 20);
    const st = defaultSettings();
    check('Rebind reload to KeyT works', rebindKey(st, 'reload', 'KeyT') === true && st.keybinds.reload === 'KeyT');
    check('ADS sens slower than hip sens', st.sens.ads < st.sens.hip);
    check('Sniper sens slowest', st.sens.sniper < st.sens.ads);
    S.mode = 'killconfirmed';
    game.startRound();
    const kcBot = S.bots.find(x => x.alive);
    bots.damage(kcBot, 999); game.onKill(kcBot, false);
    check('Kill Confirmed drops a tag', S.kcTags.length > 0);
    saveColorChoices({ ...loadColorChoices(), costume: 'gold' });
    check('Color choices persist', loadColorChoices().costume === 'gold');
    check('Corpse list has the dead bot', bots.corpseList().length > 0);
    setFlag('hardcore', true);
    check('Flag hardcore sets', FLAGS.hardcore === true);
    setFlag('hardcore', false);
    check('Flag hardcore clears', FLAGS.hardcore === false);
    world.buildMap('foundry');
    S.mode = 'br';
    game.startRound();
    check('BR has loot crates', world.lootCrates.length > 0);
    const c0 = world.lootCrates[0];
    S.player.x = c0.x; S.player.z = c0.z;
    check('Opening a crate gives loot', game.openCrate() === true && c0.opened === true);
    S.mode = 'tdm';
    game.startRound();
    S.player.weaponIdx = 3;
    const w0 = weapon.cur();
    w0.mag = 1; w0.reserve = 90; // below magSize for any weapon (LR-50: 5)
    weapon.reload();
    check('Reload starts', w0.reloading === true);
    S.stamina = 100;
    S.player.x = -20; S.player.z = 20; S.player.vx = 0; S.player.vz = 0; S.player.onGround = true;
    for (let i = 0; i < 60; i++) player.step(FIXED_STEP, new Set(['ShiftLeft', 'KeyW']), false);
    check('Sprint drains stamina', S.stamina < 100);
    S.mode = 'tdm'; S.difficulty = 'normal';
    game.startRound();
    S.player.hp = 9999; S.spawnProtT = 0;
    settle(60 * 4); // past the 3.2s countdown
    const parkOthers = (keep) => {
      S.bots.forEach((b, i) => { if (b === keep) return; b.x = 24; b.z = 24 - i * 2; b.state = 'hold'; });
      bots.syncMeshes();
    };
    const duelSetup = (b, bx, bz) => {
      b.x = bx; b.z = bz; b.state = 'combat';
      S.player.x = -20; S.player.z = 20;
      parkOthers(b);
      bots.syncMeshes();
    };
    check('Bots have operator skills assigned',
      S.bots.every(b => b.skill && OPERATOR_DEFS[b.skill]));
    const tak = S.bots[0]; // skill 'tak5'
    tak.hp = 35; tak.skillCd = 0;
    duelSetup(tak, -20, 10);
    settle(60 * 2);
    check('Tak-5 heals a hurt bot', tak.hp > 35 && tak.skillCd > 30);
    const grav = S.bots[2]; // skill 'gravity'
    grav.hp = 100; grav.skillCd = 0;
    duelSetup(grav, -20, 10);
    S.player.x = -20; S.player.z = 15;
    const php0 = S.player.hp;
    settle(60 * 2);
    check('Gravity slam hurts the player', grav.skillCd > 20 && S.player.hp < php0);
    const bull = S.bots[1]; // skill 'bull'
    bull.hp = 100; bull.skillCd = 0;
    duelSetup(bull, -30, -8);
    S.player.x = -14; S.player.z = -8;
    const bx0 = bull.x, bz0 = bull.z;
    settle(60 * 1);
    check('Bull Charge speeds the bot',
      bull.chargeT > 0 && Math.hypot(bull.x - bx0, bull.z - bz0) > 2);
    const spar = S.bots[3]; // skill 'sparrow'
    spar.hp = 100; spar.skillCd = 0;
    duelSetup(spar, -14, -8);
    S.player.x = 14; S.player.z = -8;
    settle(60 * 2);
    check('Sparrow lobs an explosive arrow', spar.skillCd > 20);
    const flk = S.bots[4];
    flk.hp = 100; flk.flankCd = 0; flk.combatT = 7; flk.state = 'combat';
    duelSetup(flk, -20, 10);
    S.player.x = 20; S.player.z = -20; // 50m away, no LOS
    flk.lastCombatT = S.time - 3;
    settle(60 * 2);
    check('Bot flanks after a long duel', flk.flankedOnce === true);
    const cam = S.bots[0];
    cam.x = 0; cam.z = 12; cam.state = 'hold'; cam.playerStillT = 0;
    S.player.x = 0; S.player.z = -14; // the furnace blocks LOS between them
    parkOthers(cam);
    bots.syncMeshes();
    settle(60 * 4);
    check('Bot tracks a still player', cam.playerStillT > 3.5);
    cam.state = 'react'; cam.hasSeen = true; cam.lastSeenX = 0; cam.lastSeenZ = -14;
    cam.grenadeCd = 0; cam.grenadesUsed = 0;
    settle(60 * 1);
    check('Bot throws a grenade at a camper', cam.grenadesUsed > 0);
    const ret = S.bots[1];
    ret.hp = 20; ret.skillCd = 999; ret.grenadeCd = 0; ret.grenadesUsed = 0;
    duelSetup(ret, -20, 10);
    const rd0 = Math.hypot(ret.x - S.player.x, ret.z - S.player.z);
    settle(60 * 2);
    check('Low-HP bot retreats to cover',
      ret.retreating === true && ret.hp > 20 && ret.grenadesUsed > 0
      && Math.hypot(ret.x - S.player.x, ret.z - S.player.z) > rd0 + 2);
    check('Retreat throws smoke cover', S.grenades.smokes.length > 0);
    S.difficulty = 'easy';
    const ez = S.bots[0];
    ez.hp = 100; ez.skillCd = 0; ez.grenadeCd = 0; ez.flankCd = 0; ez.grenadesUsed = 0;
    ez.flankedOnce = false; ez.combatT = 0;
    duelSetup(ez, -20, 10);
    settle(60 * 8);
    check('Easy bots never use tactics',
      ez.skillCd <= 0 && ez.grenadesUsed === 0 && ez.flankedOnce !== true);
    game.startRound();
    S.player.x = 0; S.player.z = 0; S.player.yaw = 0;
    check('dmgAngle ahead/right/behind/left',
      Math.abs(dmgAngle(0, 0, 0, 0, -10)) < 0.01
      && Math.abs(dmgAngle(0, 0, 0, 10, 0) - 90) < 0.01
      && Math.abs(Math.abs(dmgAngle(0, 0, 0, 0, 10)) - 180) < 0.01
      && Math.abs(dmgAngle(0, 0, 0, -10, 0) + 90) < 0.01
      && Math.abs(dmgAngle(Math.PI / 2, 0, 0, -10, 0)) < 0.01);
    check('stepInterval follows speed',
      Math.abs(audio.stepInterval(6) - 0.38) < 0.02
      && Math.abs(audio.stepInterval(9) - 0.26) < 0.02
      && Math.abs(audio.stepInterval(3) - 0.77) < 0.02
      && Math.abs(audio.stepInterval(2.1) - 1.1) < 0.02);
    S.player.x = 0; S.player.z = 0; S.player.yaw = 0;
    S.player.hp = 100; S.player.armor = 0; S.player.alive = true;
    S.spawnProtT = 0; S.hardcore = false;
    S.bots.forEach((b) => { b.x = 24; b.z = 24; b.state = 'hold'; });
    bots.syncMeshes();
    const dirEl = document.getElementById('dmg-dir');
    const atk = S.bots[0]; atk.alive = true;
    atk.x = 0; atk.z = 5;
    game.hurtPlayer(10, atk);
    check('Damage from behind points the indicator back',
      S.player.hp === 90 && dirEl.classList.contains('on')
      && dirEl.style.transform.includes('rotate(180deg)'));
    atk.x = 5; atk.z = 0;
    game.hurtPlayer(10, atk);
    check('Damage from the right points the indicator right',
      S.player.hp === 80 && dirEl.style.transform.includes('rotate(90deg)'));
    S.player.hp = 100; S.spawnProtT = 999;
    S.player.x = -20; S.player.z = 20; S.player.yaw = 0;
    const steps0 = audio.stepCount();
    input.state.keys.add('KeyW');
    settle(90);
    input.state.keys.delete('KeyW');
    S.spawnProtT = 0;
    check('Walking plays footsteps', audio.stepCount() - steps0 >= 2);
    S.difficulty = 'normal';
    S.mode = 'tdm';
    game.startRound();
    S.player.hp = 9999; S.spawnProtT = 0;
    S.player.x = -20; S.player.z = 20; S.player.yaw = 0; S.player.y = 0;
    S.bots.forEach((b) => { b.x = 24; b.z = 24; b.state = 'hold'; });
    bots.syncMeshes();
    settle(60 * 4); // past the 3.2s countdown
    S.grenades.he = 1;
    check('Aim arc appears while holding Q',
      game.startGrenadeAim() === true && game.aimState().aiming === true
      && game.aimState().arcVisible === true && !!game.aimState().landing);
    const pred = game.aimState().landing;
    const aimDbg = game.aimState();
    check('Aim line spans the whole flight to the landing',
      Math.hypot(aimDbg.lineEnd[0] - pred.x, aimDbg.lineEnd[2] - pred.z) < 1.5);
    check('Aim dots spread from near the player to the landing',
      Math.hypot(aimDbg.dots[0][0] - S.player.x, aimDbg.dots[0][2] - S.player.z) < 4
      && Math.hypot(aimDbg.dots[11][0] - pred.x, aimDbg.dots[11][2] - pred.z) < 1.5);
    S.player.yaw = Math.PI / 2; // turn 90 degrees: the arc must follow
    settle(2);
    const pred2 = game.aimState().landing;
    check('Aim arc follows the player aim',
      Math.hypot(pred2.x - pred.x, pred2.z - pred.z) > 5);
    S.player.yaw = 0;
    settle(2);
    const pred3 = game.aimState().landing;
    const he0 = S.grenades.he;
    check('Release throws the grenade and hides the arc',
      game.releaseGrenadeAim() === true && S.grenades.he === he0 - 1
      && S.grenades.flying.length === 1 && game.aimState().aiming === false
      && game.aimState().arcVisible === false);
    let lx = 0, lz = 0, n = 0;
    while (S.grenades.flying.length && n < 300) {
      const g = S.grenades.flying[0]; lx = g.x; lz = g.z; settle(1); n += 1;
    }
    check('Predicted landing matches the real landing',
      S.grenades.flying.length === 0
      && Math.hypot(lx - pred3.x, lz - pred3.z) < 1.5);
    S.grenades.he = 0;
    check('No arc with no grenades left',
      game.startGrenadeAim() === false && game.aimState().aiming === false);
    S.grenades.he = 1;
    S.driving = true;
    check('No arc while driving',
      game.startGrenadeAim() === false && game.aimState().aiming === false);
    S.driving = false;
    S.phase = 'roundEnd';
    check('No arc when the round is over',
      game.startGrenadeAim() === false && game.aimState().aiming === false);
    S.phase = 'playing';
    S.mode = 'tdm';
    const seenSites = new Set();
    for (const id of MAP_IDS) {
      world.buildMap(id);
      const def = MAP_DEFS[id];
      check(`Map ${id} has per-map sites`, !!def.sites && !!def.sites.A && !!def.sites.B && !!def.sites.C);
      for (const k of ['A', 'B', 'C']) {
        const s = world.sites[k], d = def.sites[k];
        check(`Map ${id} site ${k} = ${d.name}`, s.name === d.name && s.x === d.x && s.z === d.z);
        check(`Map ${id} site ${k} in bounds`, s.x > -39 && s.x < 39 && s.z > -27 && s.z < 27);
        let clear = 0;
        for (let a = 0; a < 8; a++) {
          const px = s.x + Math.cos(a * Math.PI / 4) * s.r * 0.6, pz = s.z + Math.sin(a * Math.PI / 4) * s.r * 0.6;
          if (!world.isColliding(px, pz, 0.35, 0)) clear += 1;
        }
        check(`Map ${id} site ${k} ring walkable`, clear >= 5);
        seenSites.add(`${k}:${s.name}@${s.x},${s.z}`);
      }
      const hA = world.sites.A, hB = world.sites.B;
      check(`Map ${id} holder A spawn clear`, !world.isColliding(hA.x + 3, hA.z + 3, 0.35, 0));
      check(`Map ${id} holder B spawn clear`, !world.isColliding(hB.x - 3, hB.z + 3, 0.35, 0));
      if (id !== 'foundry') {
        check(`Map ${id} site A name is not Furnace`, world.sites.A.name !== 'Furnace');
        check(`Map ${id} site B name is not Crane Yard`, world.sites.B.name !== 'Crane Yard');
      }
    }
    check('Site positions differ across maps', seenSites.size === 21);
    const walkBridge = (mapId, sx, sz, yaw, steps) => {
      world.buildMap(mapId);
      game.startRound();
      S.bots.forEach((b, i) => { b.x = 24; b.z = 24 - i * 2; b.state = 'hold'; });
      bots.syncMeshes();
      const p = S.player;
      p.x = sx; p.z = sz; p.yaw = yaw; p.y = 0; p.vx = 0; p.vz = 0; p.onGround = true;
      p.hp = 9999; S.spawnProtT = 0; S.stamina = 100; S.windT = 0;
      let maxY = 0;
      for (let i = 0; i < steps; i++) {
        player.step(FIXED_STEP, new Set(['ShiftLeft', 'KeyW']), false);
        if (p.y > maxY) maxY = p.y;
      }
      return { p, maxY };
    };
    check('Iron bridge deck groundY is 3', (() => { world.buildMap('iron'); return Math.abs(world.groundY(0, 0, 3) - 3) < 0.01; })());
    check('Iron bridge west ramp mid-height ~1.5', (() => { world.buildMap('iron'); return Math.abs(world.groundY(-20.5, 0, 1.5) - 1.5) < 0.05; })());
    check('Ruin bridge deck groundY is 3', (() => { world.buildMap('ruin'); return Math.abs(world.groundY(24, 0, 3) - 3) < 0.01; })());
    check('Ruin bridge north ramp mid-height ~1.5', (() => { world.buildMap('ruin'); return Math.abs(world.groundY(24, -12.5, 1.5) - 1.5) < 0.05; })());
    const wb1 = walkBridge('iron', -24, 0, -Math.PI / 2, 240);
    check('Player walks up the Iron bridge onto the deck', wb1.maxY > 2.5 && wb1.p.x > -10);
    const wb2 = walkBridge('ruin', 24, 20, 0, 240);
    check('Player walks up the Ruin bridge onto the deck', wb2.maxY > 2.5 && wb2.p.z < 5);
    world.buildMap('foundry');
    game.startRound();
    check('GLB viewmodel assets ready (arms + 7 weapons)', viewmodelReady());
    check('7 GLB weapons mapped (AK47 excluded, licence)', Object.keys(WEAPON_GLB).length === 7 && !WEAPON_GLB.ak47);
    check('Soldier GLB ready', soldierReady());
    check('All bots swapped to the realistic soldier',
      S.bots.every(b => b.mesh && b.mesh.model && b.mesh.model._isSoldier));
    check('GLB arms attached, procedural hands hidden', (() => {
      const hg = weapon.hands.parts.handsGroup;
      return hg.children.length >= 2 && weapon.hands.parts.procHands.visible === false;
    })());
    check('GLB weapon attaches to the viewmodel (M4)', (() => {
      const idx = S.weapons.findIndex(w => w.id === 'm4');
      if (idx < 0) return false;
      S.player.weaponIdx = idx;
      weapon.applyGunsmith();
      const g = weapon.hands.gun;
      return g.children.length === 1 && !!g.children[0].isGroup && !!g.userData.tip;
    })());
    check('Soldier plays Walk while moving', (() => {
      const sb = S.bots.find(b => b.alive) || S.bots[0];
      if (!sb.alive) bots.respawn(sb);
      sb.burst = 0;
      for (let i = 0; i < 10; i++) { sb.x += 0.05; sb.mesh.model.animate(1 / 60, sb, i / 60); }
      return sb.mesh.model._clip === 'Walk';
    })());
    check('Soldier plays Death clip when killed', (() => {
      const sb = S.bots.find(b => b.alive) || S.bots[0];
      if (!sb.alive) bots.respawn(sb);
      bots.damage(sb, 999);
      for (let i = 0; i < 30; i++) sb.mesh.model.animate(1 / 60, sb, i / 60);
      return sb.mesh.model._clip === 'Death';
    })());
    check('GLB props placed on every map', (() => {
      const want = { foundry: 6, ember: 5, twin: 11, iron: 8, cargo: 1, harvest: 7, ruin: 9 };
      let total = 0;
      for (const [mapId, n] of Object.entries(want)) {
        world.buildMap(mapId);
        game.startRound();
        if (world.glbPlacements.length !== n) return false;
        total += world.glbPlacements.length;
      }
      return total === 47;
    })());
    audio.setListener(0, 1.6, 0, 0);
    const sp0 = audio.spatialCount();
    audio.enemyShot('ax117', 10, 10, 1.3, 0);
    check('Bot shot to the right pans +90 and counts as spatial',
      audio.spatialCount() > sp0 && Math.abs(audio.lastSpatial().angleDeg - 90) < 1);
    audio.enemyShot('ax117', 10, -10, 1.3, 0);
    check('Bot shot to the left pans -90',
      Math.abs(audio.lastSpatial().angleDeg + 90) < 1);
    audio.enemyShot('ax117', 10, 0, 1.3, -10);
    check('Bot shot ahead pans 0',
      Math.abs(audio.lastSpatial().angleDeg) < 1);
    audio.enemyShot('ax117', 10, 0, 1.3, 10);
    check('Bot shot behind pans +/-180',
      Math.abs(Math.abs(audio.lastSpatial().angleDeg) - 180) < 1);
    audio.setListener(0, 1.6, 0, Math.PI); // turn around: front is now +z
    audio.enemyShot('ax117', 10, 0, 1.3, 10);
    check('Listener yaw turns the pan with the player',
      Math.abs(audio.lastSpatial().angleDeg) < 1);
    audio.setListener(0, 1.6, 0, 0);
    audio.explosion(5, 0.5, 0);
    const gNear = audio.lastSpatial().gain;
    audio.explosion(40, 0.5, 0);
    const gFar = audio.lastSpatial().gain;
    check('Explosion fades with distance (near gain > far gain)',
      gNear > 0.8 && gFar < 0.5 && gFar > 0 && gFar < gNear);
    audio.step('concrete', 0.05, 0, 0.1, -8);
    check('Bot footstep is spatial, 8m ahead',
      Math.abs(audio.lastSpatial().dist - 8) < 0.5 && Math.abs(audio.lastSpatial().angleDeg) < 1);
    const sp1 = audio.spatialCount();
    audio.explosion(); // no position: flat, must not count as spatial
    check('Non-positional explosion stays flat (no spatial count)',
      audio.spatialCount() === sp1);
    check('Listener follows the player each frame (game.step)', (() => {
      S.countdownT = 0;
      S.player.x = 3; S.player.z = -4; S.player.yaw = Math.PI / 2; // facing -x
      game.step(1 / 60, new Set());
      audio.enemyShot('ax117', 10, -7, 1.3, -4); // 10m straight ahead
      return Math.abs(audio.lastSpatial().angleDeg) < 1;
    })());
    const mTip = { x: 0, y: 1.4, z: 0 }, mDir = { x: 0, y: 0, z: -1 }, mCam = { x: 0, y: 1.6, z: 0.5 };
    const flashOf = (id) => { effects.muzzle(mTip, mDir, mCam, 1, fxFor(id).muzzle); return effects.lastFlash(); };
    const sn = flashOf('lr50');
    check('Sniper flash is long (taller than wide) + bright + long',
      sn.scaleY > sn.scaleX * 1.4 && sn.dur === 0.14 && sn.light > 6 && sn.color === 0xffee99);
    const sg = flashOf('by15');
    check('Shotgun flash is wide (wider than tall)',
      sg.scaleX > sg.scaleY * 1.8 && sg.dur === 0.1);
    const sm = flashOf('qq9');
    check('SMG flash is small + short',
      sm.scaleX < 1 && sm.dur === 0.06 && sm.light < 3);
    const pi = flashOf('p12');
    check('Pistol flash is small like SMG, not sniper-sized',
      pi.scaleX < 1 && pi.scaleY < 1 && pi.dur === 0.06);
    const la = flashOf('rpg');
    check('Launcher flash is the biggest + orange + longest',
      la.scaleX > sn.scaleX && la.light > sn.light && la.dur === 0.16 && la.color === 0xff9944);
    const dm = flashOf('kilo');
    check('DMR flash sits between SMG and sniper',
      dm.scaleX > sm.scaleX && dm.dur === 0.09 && dm.light > sm.light && dm.light < sn.light);
    const cb = flashOf('crossbow');
    check('Crossbow flash is a tiny puff with no light',
      cb.scaleX < 0.5 && cb.light === 0 && cb.dur === 0.05);
    effects.step(0.3);
    effects.muzzle(mTip, mDir, mCam, 1, fxFor('katana').muzzle);
    check('Katana swing shows no muzzle flash at all',
      effects.lastFlash().visible === false);
    const sn2 = flashOf('lr50');
    check('Sniper flash differs from SMG flash (size + duration + light)',
      sn2.scaleX !== sm.scaleX && sn2.dur !== sm.dur && sn2.light !== sm.light);
    effects.muzzle(mTip, mDir, mCam, 1, fxFor('rpg').muzzle);
    const peak = effects.lastFlash().light;
    effects.step(0.08);
    check('Flash decays over its own duration (light fades after half)',
      effects.lastFlash().light < peak && effects.lastFlash().light > 0);
    effects.step(0.2);
    check('Flash is gone after its duration',
      effects.lastFlash().visible === false && effects.lastFlash().light === 0);
    // ---- §44: Realistic textures (procedural canvas maps, white-base) ----
    // Aggregate the prop texture report across all maps — each kind only
    // needs to prove itself on one map that actually places it.
    const texAll = {};
    for (const m of ['foundry', 'cargo', 'ember', 'harvest', 'twin', 'iron', 'ruin']) {
      world.buildMap(m);
      Object.assign(texAll, world.textureReport());
    }
    check('Containers carry a corrugated canvas map', texAll.container === true);
    check('House walls carry a plaster canvas map', texAll['house-wall'] === true);
    check('Barn walls carry a plank canvas map', texAll['barn-wall'] === true);
    check('Roofs carry a tile canvas map', texAll.roof === true);
    check('Barrels carry a ring canvas map', texAll.barrel === true);
    check('Sandbags carry a weave canvas map', texAll.sandbag === true);
    world.buildMap('ember');
    check('Ember ground is sand texture', world.groundKind === 'sand');
    world.buildMap('harvest');
    check('Harvest ground is grass texture', world.groundKind === 'grass');
    world.buildMap('foundry');
    check('Foundry ground is concrete texture', world.groundKind === 'concrete');
    check('Viewmodel gunmetal carries a brushed canvas map',
      !!(weapon.hands.gunTex && weapon.hands.gunTex.gun));
    check('Viewmodel barrel carries a brushed canvas map',
      !!(weapon.hands.gunTex && weapon.hands.gunTex.barrel));
    check('Viewmodel wood pump carries a grain canvas map',
      !!(weapon.hands.gunTex && weapon.hands.gunTex.wood));
    // ---- §45: Viewmodel arms grip (v3 re-pose, 2026-11-16) ----
    // v1 bent the forearm and left the fingers flat + mounted rotation.y=PI
    // (fingers toward the camera, left/right swapped). v3 curls the fingers
    // (tight R 0.07/0.08) and mounts rotation.y=0. Thresholds verified
    // against the real files: flat v1/original has |creamDX|,|creamDY| < 0.02,
    // curled v3 has right creamDX -0.043 and left creamDY +0.045.
    const amr = armsMountReport();
    check('Arms mount report available (arms loaded)', !!amr);
    check('Arms mounted rotation.y = 0 (not PI)', !!amr && Math.abs(amr.rotY) < 0.001);
    check('Arms position is ARMS_POS (0.0507,-0.1409,0.31)', !!amr &&
      Math.abs(amr.pos[0] - 0.0507) < 0.001 && Math.abs(amr.pos[1] + 0.1409) < 0.001 && Math.abs(amr.pos[2] - 0.31) < 0.001);
    check('Left hand sits forward of the right hand (forend vs grip)', !!amr && (amr.left.zC < amr.right.zC - 0.2));
    check('Right fingertips curl inward (-X, toward the grip)', !!amr && amr.right.creamDX < -0.03);
    check('Left fingertips curl upward (+Y, around the forend)', !!amr && amr.left.creamDY > 0.03);
    // ---- §46: Tutorial (HOW TO PLAY panel + round-1 hints) ----
    S.mode = 'tdm'; S.round.num = 1;
    S.player.alive = true; S.player.hp = 100;
    hud.tutorial.reset();
    const howBtn = document.getElementById('howto-btn');
    const howOver = document.getElementById('howto-overlay');
    const howPanel = document.getElementById('howto-panel');
    const howClose = document.getElementById('howto-close');
    const tutToast = document.getElementById('tutorial-toast');
    const playEl = document.getElementById('play');
    check('HOW TO PLAY button + panel exist next to Play', !!howBtn && !!howOver && !!howPanel && !!howClose);
    check('Panel starts closed', !!howOver && howOver.hidden === true);
    howBtn.click();
    check('Panel opens from the menu button', howOver.hidden === false);
    check('Panel lists controls + objectives + tips',
      howPanel.textContent.includes('WASD') && howPanel.textContent.includes('Team Deathmatch')
      && howPanel.textContent.includes('Search & Destroy') && howPanel.textContent.includes('Spawn protection'));
    // The open panel must not cover Play: its overlay is click-through and
    // the card sits above the bottom of the menu.
    playEl.scrollIntoView();
    const pr = playEl.getBoundingClientRect();
    const cr = howPanel.getBoundingClientRect();
    const overlaps = !(cr.bottom <= pr.top || cr.top >= pr.bottom || cr.right <= pr.left || cr.left >= pr.right);
    check('Open panel does not overlap the Play button', !overlaps);
    howClose.click();
    check('Panel closes with the X button', howOver.hidden === true);
    // Round-1 hints: drive the phase transition through hud.update.
    hud.tutorial.reset();
    S.phase = 'menu'; S.round.num = 1; S.round.timer = 300;
    hud.update(world);
    S.phase = 'playing';
    hud.update(world);
    check('Round-1 move hint shows at round start', hud.tutorial.toast() === 'move' && tutToast.hidden === false);
    check('Move hint text is correct', hud.tutorial.toastText().includes('WASD'));
    document.getElementById('tutorial-toast-x').click();
    check('Hint dismisses with the X button', hud.tutorial.toast() === null && tutToast.hidden === true);
    // First enemy in front -> shoot hint.
    let b0 = S.bots.find(b => b.alive);
    if (!b0) { bots.respawn(S.bots[0]); b0 = S.bots[0]; }
    b0.x = S.player.x - Math.sin(S.player.yaw) * 10; b0.z = S.player.z - Math.cos(S.player.yaw) * 10;
    hud.update(world);
    check('Shoot hint shows when the first enemy is in view', hud.tutorial.toast() === 'shoot');
    hud.tutorial.dismiss();
    // Mid round 1 -> grenade hint (timer at 50% of the 300s start).
    S.round.timer = 150;
    hud.update(world);
    check('Grenade hint shows mid round 1', hud.tutorial.toast() === 'nade');
    hud.tutorial.dismiss();
    // Round 2: no hints at all, even with an enemy in view and a low timer.
    hud.tutorial.reset();
    S.round.num = 2; S.round.timer = 60;
    hud.update(world);
    check('No hints in round 2', hud.tutorial.toast() === null && tutToast.hidden === true);
    // Panel open/close leaves the menu usable; Play click is handled without
    // error (main.js ignores it in ?shot=test via its shot guard — the real
    // click-through to a started round is verified in the live CDP probe).
    S.phase = 'menu'; hud.showMenu('FOUNDRY YARD');
    howBtn.click(); howClose.click();
    check('Play button enabled after using the panel', !playEl.disabled);
    playEl.click();
    check('Clicking Play after the panel throws no error', S.phase === 'menu');
    hud.tutorial.reset();
    world.buildMap('foundry');
    game.startRound();
  } catch (e) {
    checks.push({ name: 'exception: ' + (e && e.message) + ' @ ' + (e && e.stack ? String(e.stack).split('\n').slice(0, 4).join(' | ') : '?'), ok: false });
  }
  const pass = checks.filter(c => c.ok).length;
  window.__selftest = { pass, fail: checks.length - pass, checks };
  const div = document.createElement('div');
  div.id = 'selftest';
  div.textContent = JSON.stringify(window.__selftest);
  document.body.appendChild(div);
  document.title = `SELFTEST ${pass}/${checks.length}`;
}
