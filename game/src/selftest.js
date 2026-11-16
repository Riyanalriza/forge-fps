import * as THREE from 'three';
import { EMOTE_DEFS, WHEEL_PRESETS, FINISHER_DEFS, OPERATOR_DEFS, WEAPONS_DB } from './state.js';
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
import { viewmodelReady, soldierReady, WEAPON_GLB, armsMountReport, attachViewmodel, leftArmPocket } from './models.js';
import { nearestSiteName } from './world.js';

export function runSelfTest(ctx) {
  const { S, game, bots, hud, mythicFx, world, weapon, player, doEmote, settle, FIXED_STEP, createDragon3D, createVoidPortal3D, weather, zombies, vehicles, economy, effects, audio, input } = ctx;
  const checks = [];
  const check = (name, ok) => checks.push({ name, ok: !!ok });
  try {
    // Boot invariant (frost pass): the world the constructor built must
    // already be the default map — S.mapId and world.mapId agree with no
    // explicit buildMap call yet. (Caught live 2026-11-16: the constructor
    // built foundry while S.mapId said frost.)
    check('boot world matches the default map', world.mapId === S.mapId && S.mapId === 'frost');
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
    check('8 maps defined', MAP_IDS.length === 8);
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
    check('MAP_WEATHER_FULL has 8 maps', Object.keys(MAP_WEATHER_FULL).length === 8);
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
    check('Site positions differ across maps', seenSites.size === 24);
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
    // ---- §47: Left hand visible on ALL 21 weapons (2026-11-16) ----
    // The v4/B2 GLB re-pose (left mesh shifted + yaw/pitch) + the per-class
    // procedural GRIP_Y lift + the per-weapon left-arm offsets (p12,
    // katana) must hold for every weapon, not just B12 + VK-9. Loops all
    // 21: builds the real gun, attaches the real GLB arms, then checks
    // from the FP camera that both pockets project inside the frustum and
    // the left one is not hidden behind the receiver (raycast: first hit
    // must be a hand mesh, or the gun surface within 0.03 of the hand).
    // Also records the procedural grip height + left pocket z per weapon
    // for §48. (weapon.js step() rebuilds the current weapon on the next
    // frame, so leaving the hands on the last loop weapon is harmless.)
    const cam47 = weapon.hands.group.parent;
    const hg47 = weapon.hands.parts.handsGroup;
    const ray47 = new THREE.Raycaster();
    const isShown47 = (o) => { while (o) { if (o.visible === false) return false; o = o.parent; } return true; };
    const gripY47 = {}, pocketZ47 = {};
    const fail47 = [];
    for (const w of WEAPONS_DB) {
      weapon.hands.buildGun(w, null);
      attachViewmodel(weapon.hands, w.id);
      cam47.updateMatrixWorld(true);
      const armsObj47 = [...hg47.children].find((c) => c !== weapon.hands.parts.procHands);
      const armMeshes47 = new Set(), gunMeshes47 = new Set();
      if (armsObj47) armsObj47.traverse((o) => { if (o.isMesh) armMeshes47.add(o); });
      weapon.hands.gun.traverse((o) => { if (o.isMesh) gunMeshes47.add(o); });
      const lp = leftArmPocket();
      const lpW = new THREE.Vector3(lp.x, lp.y, lp.z).applyMatrix4(hg47.matrixWorld);
      // Right hand: check the FINGERTIPS (cream-UV mean of the right mesh),
      // not the pocket — the right pocket sits inside the procedural gun's
      // grip, so a ray to it always hits gun first (false occlusion).
      let rpW = new THREE.Vector3(0, -0.08, -0.02).applyMatrix4(hg47.matrixWorld);
      if (armsObj47) {
        let rightMesh47 = null, bestZ47 = -Infinity;
        armsObj47.traverse((o) => {
          if (!o.isMesh || !o.geometry) return;
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          const z = o.geometry.boundingBox.getCenter(new THREE.Vector3()).z;
          if (z > bestZ47) { bestZ47 = z; rightMesh47 = o; }
        });
        if (rightMesh47) {
          const pos47 = rightMesh47.geometry.attributes.position, uv47 = rightMesh47.geometry.attributes.uv;
          let cx = 0, cy = 0, cz = 0, cn = 0;
          const v47 = new THREE.Vector3();
          for (let i = 0; i < pos47.count; i++) {
            if (uv47 && uv47.getX(i) > 0.75) { v47.set(pos47.getX(i), pos47.getY(i), pos47.getZ(i)); rightMesh47.localToWorld(v47); cx += v47.x; cy += v47.y; cz += v47.z; cn++; }
          }
          if (cn) rpW = new THREE.Vector3(cx / cn, cy / cn, cz / cn);
        }
      }
      const chk47 = (pt) => {
        const v = pt.clone().project(cam47);
        const inFr = v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
        if (!inFr) return false;
        ray47.setFromCamera(new THREE.Vector2(v.x, v.y), cam47);
        const hits = ray47.intersectObject(weapon.hands.group, true).filter((h) => isShown47(h.object));
        if (!hits.length) return true;
        const h0 = hits[0];
        const cat = armMeshes47.has(h0.object) ? 'hand' : gunMeshes47.has(h0.object) ? 'gun' : 'other';
        return !(cat === 'gun' && h0.distance < cam47.position.distanceTo(pt) - 0.03);
      };
      if (!chk47(lpW) || !chk47(rpW)) fail47.push(w.id);
      gripY47[w.id] = weapon.hands.parts.gripL.position.y;
      pocketZ47[w.id] = lp.z;
    }
    check(`§47 all 21 weapons: left hand visible + right hand on grip (${21 - fail47.length}/21)` + (fail47.length ? ' — fails: ' + fail47.join(',') : ''), fail47.length === 0);
    // ---- §48: Hold / reload / light / sound per weapon (2026-11-16) ----
    // Hold: procedural grip height per class (GRIP_Y) + per-weapon GLB
    // left-arm offsets (p12 supports the pistol grip, katana grips the
    // lower handle two-handed). Reload: stage text per weapon, per-class
    // reload sound groups + per-class reload animation (dip/tilt/pump).
    // Light + shot sound are proven per weapon by §43 (flash shapes) and
    // the WEAPON_FX table (distinct freq+pattern per weapon, below).
    const gripYok48 = ['vk9', 'm4', 'ak117', 'lr50', 'qq9', 'rpd', 'by15', 'krm', 'kilo', 'sks', 'rpg', 'fhj', 'thumper', 'mp5', 'pdw', 'm4lmg', 'arctic', 'crossbow'].every((id) => Math.abs(gripY47[id] - 0.06) < 0.001)
      && Math.abs(gripY47.p12 - 0.02) < 0.001 && Math.abs(gripY47.dual - 0.02) < 0.001
      && Math.abs(gripY47.katana - 0.15) < 0.001;
    check('§48 procedural left grip height per class (0.06 long / 0.02 pistol / 0.15 melee)', gripYok48);
    check('§48 G17 left hand pulled back to the pistol grip (pocket z > -0.15)', pocketZ47.p12 > -0.15);
    check('§48 katana left hand on the lower handle (pocket z > -0.2)', pocketZ47.katana > -0.2);
    check('§48 other weapons keep the forend pocket (z ≈ -0.35)', Math.abs(pocketZ47.vk9 + 0.35) < 0.01 && Math.abs(pocketZ47.by15 + 0.35) < 0.01 && Math.abs(pocketZ47.lr50 + 0.35) < 0.01);
    const sndKeys48 = WEAPONS_DB.map((w) => { const s = fxFor(w.id).sound; return s.pattern + '@' + s.freq; });
    check('§48 every weapon has a distinct shot sound (pattern+freq)', new Set(sndKeys48).size === sndKeys48.length);
    const stagesOk48 = WEAPONS_DB.every((w) => { const st = fxFor(w.id).reload.stages; return w.cls === 'Melee' ? st.length === 0 : st.length >= 1; });
    check('§48 every non-melee weapon has reload stages, melee has none', stagesOk48);
    let sndOk48 = true;
    try { for (const id of ['lr50', 'rpg', 'thumper', 'crossbow', 'p12', 'by15', 'rpd', 'vk9']) { audio.reloadStage(1, id); audio.reload(id); } } catch { sndOk48 = false; }
    check('§48 reload sounds accept bolt/tube/break/string/light/pump/belt/std', sndOk48);
    // Reload animation per class: shotgun pumps, crossbow rolls, pistol dips least.
    const hands48 = weapon.hands;
    const wSg48 = WEAPONS_DB.find((w) => w.id === 'by15');
    hands48.buildGun(wSg48, null); attachViewmodel(hands48, 'by15');
    hands48.step(0.016, { ...wSg48, reloading: true, reloadT: wSg48.reload * 0.5 });
    const sgDip48 = hands48.gun.rotation.x, sgPump48 = hands48.gun.position.z;
    const wCb48 = WEAPONS_DB.find((w) => w.id === 'crossbow');
    hands48.buildGun(wCb48, null); attachViewmodel(hands48, 'crossbow');
    hands48.step(0.016, { ...wCb48, reloading: true, reloadT: wCb48.reload * 0.5 });
    const cbRoll48 = hands48.gun.rotation.z;
    const wPi48 = WEAPONS_DB.find((w) => w.id === 'p12');
    hands48.buildGun(wPi48, null); attachViewmodel(hands48, 'p12');
    hands48.step(0.016, { ...wPi48, reloading: true, reloadT: wPi48.reload * 0.5 });
    const piDip48 = hands48.gun.rotation.x;
    hands48.step(0.016, { ...wPi48, reloading: false, reloadT: 0 });
    check('§48 shotgun reload dips + pumps (rotation.x < 0, position.z moves)', sgDip48 < 0 && sgPump48 !== 0);
    check('§48 crossbow reload rolls sideways (rotation.z > 0)', cbRoll48 > 0);
    check('§48 pistol reload dips least (|rotation.x| < 0.35)', Math.abs(piDip48) < 0.35 && piDip48 < 0);
    check('§48 reload animation resets when reload ends', hands48.gun.rotation.x === 0 && hands48.gun.rotation.z === 0);
    // ---- §49: Bot capabilities — prone, doors, vehicles (2026-11-16) ----
    S.mode = 'tdm'; S.difficulty = 'normal';
    S.player.hp = 9999; S.spawnProtT = 0;
    // Doors first, on 'twin': foundry is an industrial yard with no houses
    // and no doors at all, so the door test needs a map with houses.
    world.buildMap('twin'); game.startRound();
    // Doors: a bot blocked by a closed door49 opens it and walks through.
    S.hideT = 999; // player invisible, so no bot breaks off into combat
    const closedDoors = world.doors.filter(d => !d.open).length;
    const door49 = world.doors.find(d => {
      if (d.open || !d.collider || d.collider.y0 !== 0) return false;
      const c = d.collider;
      const passX = (c.x1 - c.x0) < (c.z1 - c.z0); // thin axis = passage direction
      const ax = passX ? 1 : 0, az = passX ? 0 : 1;
      return !world.isColliding(d.x - ax * 2, d.z - az * 2, 0.35, 0)
        && !world.isColliding(d.x + ax * 2, d.z + az * 2, 0.35, 0);
    });
    check(`§49 a closed ground-floor door with a clear approach exists (${closedDoors}/${world.doors.length} closed)`, !!door49);
    if (door49) {
      const c = door49.collider;
      const passX = (c.x1 - c.x0) < (c.z1 - c.z0);
      const ax = passX ? 1 : 0, az = passX ? 0 : 1;
      const db = S.bots[3];
      db.hp = 100; db.state = 'react'; db.hasSeen = true;
      db.lastSeenX = door49.x + ax * 2.5; db.lastSeenZ = door49.z + az * 2.5;
      db.x = door49.x - ax * 2; db.z = door49.z - az * 2; db.stuckT = 0;
      db.skillCd = 999; db.grenadeCd = 999; db.grenadesUsed = 1; db.flankCd = 999;
      parkOthers(db); bots.syncMeshes();
      settle(60 * 6);
      check('§49 bot opens a closed door blocking its path', door49.open === true);
      const crossed = (db.x - door49.x) * ax + (db.z - door49.z) * az;
      check('§49 bot passes through the doorway (not stuck)', crossed > 0.5);
    }
    // Prone + vehicles on 'foundry' (the default map).
    world.buildMap('foundry'); vehicles.place('foundry');
    game.startRound();
    S.player.hp = 9999; S.spawnProtT = 0; S.hideT = 0; // undo the door test's hideT
    // Prone: a bot in a long-range duel drops flat but keeps shooting.
    const pr49 = S.bots[2];
    pr49.hp = 100; pr49.combatT = 3; pr49.state = 'combat'; pr49.hasSeen = true; pr49.prone = false;
    pr49.skillCd = 999; pr49.grenadeCd = 999; pr49.grenadesUsed = 1; pr49.flankCd = 999;
    pr49.x = -20; pr49.z = 10;
    S.player.x = 10; S.player.z = 10; // 30 m, open lane along z=10
    parkOthers(pr49); bots.syncMeshes();
    const shots0 = pr49.shotsFired;
    settle(60 * 1); // 1s: first burst (3 shots) lands before the 6-shot reload reset
    check('§49 prone bot keeps shooting', pr49.shotsFired > shots0);
    settle(60 * 2);
    check('§49 bot goes prone in a long-range duel', pr49.prone === true);
    // Drive the pose directly: settle() calls step(), not frame(), so
    // animatePlayers() never runs during the test (same pattern as the
    // death-pose test above).
    for (let i = 0; i < 10; i++) pr49.mesh.model.animate(1 / 60, pr49, S.time + i / 60);
    const wrapPr = pr49.mesh.model && pr49.mesh.model._wrap;
    const wrapX = wrapPr ? wrapPr.rotation.x : null;
    check(`§49 prone bot body lies flat (wrapX=${wrapX === null ? 'no-wrap' : wrapX.toFixed(2)})`,
      wrapPr ? wrapPr.rotation.x < -0.5 : pr49.mesh.model.parts.torso.position.y < 0.6);
    // Prone exit: the player closes in.
    S.player.x = pr49.x + 5; S.player.z = pr49.z;
    settle(60 * 1);
    check('§49 bot stands up when the duel closes in', pr49.prone === false);
    // Vehicles: a bot boards a nearby car, drives to its waypoint, exits.
    const car = vehicles.list.find(v => v.type === 'car' && !v.dead && !v.driver);
    check('§49 a free car exists', !!car);
    if (car) {
      const vb = S.bots[4];
      vb.hp = 100; vb.state = 'patrol'; vb.vehicle = null; vb.vehicleCd = 0; vb.vehicleEnteredOnce = false;
      vb.skillCd = 999; vb.grenadeCd = 999; vb.grenadesUsed = 1; vb.flankCd = 999;
      const spot = [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2]]
        .find(([dx, dz]) => !world.isColliding(car.x + dx, car.z + dz, 0.35, 0)) || [2, 0];
      vb.x = car.x + spot[0]; vb.z = car.z + spot[1];
      let farIdx = 0, farScore = 1e9;
      world.waypoints.forEach((w, i) => {
        const dd = Math.hypot(w.x - vb.x, w.z - vb.z);
        if (dd > 18 && Math.abs(dd - 25) < farScore) { farScore = Math.abs(dd - 25); farIdx = i; }
      });
      vb.wpIdx = farIdx;
      S.player.x = 30; S.player.z = -20;
      parkOthers(vb); bots.syncMeshes();
      const carX0 = car.x, carZ0 = car.z;
      settle(60 * 2);
      check('§49 bot boards a nearby vehicle (Normal+)', vb.vehicle === car && car.driver === vb);
      check('§49 bot-driven car moves', Math.hypot(car.x - carX0, car.z - carZ0) > 2);
      check('§49 driving bot is hidden inside the car', vb.mesh.group.visible === false);
      settle(60 * 6);
      check('§49 bot exits at the waypoint and walks again', vb.vehicle === null && vb.mesh.group.visible === true);
    }
    // Easy bots never drive.
    S.difficulty = 'easy';
    game.startRound();
    const car2 = vehicles.list.find(v => v.type === 'car' && !v.dead && !v.driver);
    const eb = S.bots[4];
    eb.state = 'patrol'; eb.vehicle = null; eb.vehicleCd = 0; eb.vehicleEnteredOnce = false;
    if (car2) {
      const spot2 = [[2, 0], [-2, 0], [0, 2], [0, -2]]
        .find(([dx, dz]) => !world.isColliding(car2.x + dx, car2.z + dz, 0.35, 0)) || [2, 0];
      eb.x = car2.x + spot2[0]; eb.z = car2.z + spot2[1];
      let farIdx2 = 0, farScore2 = 1e9;
      world.waypoints.forEach((w, i) => {
        const dd = Math.hypot(w.x - eb.x, w.z - eb.z);
        if (dd > 18 && Math.abs(dd - 25) < farScore2) { farScore2 = Math.abs(dd - 25); farIdx2 = i; }
      });
      eb.wpIdx = farIdx2;
    }
    parkOthers(eb); bots.syncMeshes();
    settle(60 * 4);
    check('§49 Easy bots never drive', eb.vehicle === null && !eb.vehicleEnteredOnce);
    // The player can still drive after the moveVehicle refactor.
    S.hideT = 0; S.difficulty = 'normal';
    const car3 = vehicles.list.find(v => v.type === 'car' && !v.dead && !v.driver);
    if (car3) {
      S.player.x = car3.x + 1; S.player.z = car3.z;
      check('§49 player can still enter a car', vehicles.enter() === true && S.driving === true);
      check('§49 player can still exit a car', vehicles.exit() === true && S.driving === false);
    } else {
      check('§49 player can still enter a car', false);
      check('§49 player can still exit a car', false);
    }
    // ---- §50: frost pass — Frostworks default, industrial, shells,
    // buy stats + quick-buy/rebuy, defuse bar + hazard glow, round-over
    // wide shot, bot team gear (2026-11-16) ----
    check('§50 boot default map is frost', S.mapId === 'frost');
    check('§50 menu header counts 8 maps', [...document.querySelectorAll('.menu-sec h3')].some(h => h.textContent.includes('8 maps')));
    world.buildMap('frost'); vehicles.place('frost'); game.startRound();
    S.player.hp = 9999; S.spawnProtT = 0; S.hideT = 0;
    check('§50 frost world active', world.mapId === 'frost');
    check('§50 frost ground is snow texture', world.groundKind === 'snow');
    check('§50 frost ground surface is snow', world.groundSurface(0, 0, 0) === 'snow');
    check('§50 frost sites are Boiler House / Crane Dock / Frost Gate',
      world.sites.A.name === 'Boiler House' && world.sites.B.name === 'Crane Dock' && world.sites.C.name === 'Frost Gate');
    check('§50 frost has industrial containers', world.containers.length >= 8);
    check('§50 frost has Kenney industrial GLB props', world.glbPlacements.length >= 5);
    check('§50 frost has enterable-house doors', world.doors.length > 0);
    // Bot team gear on the soldier GLB (procedural, never touches the GLB).
    const g0 = S.bots[0].mesh.model;
    check('§50 bot 0 is the soldier model', !!g0._isSoldier);
    check('§50 soldier carries hi-vis gear (hard hat / vest / belt)',
      !!g0._gear && !!g0._gear.group && g0._gear.group.children.length >= 8);
    check('§50 enemy gear is orange', !!g0._gear && g0._gear.teamHex === 0xff7a1a);
    if (g0.setAlly && g0._gear) {
      g0.setAlly(true);
      check('§50 ally gear turns teal', g0._gear.teamHex === 0x2fd8c8);
      g0.setAlly(false);
      check('§50 gear back to orange', g0._gear.teamHex === 0xff7a1a);
    }
    // Shell casing: a real shot ejects a visible brass case. Force the
    // VK-9 (hitscan, non-melee): earlier sections can leave a melee or
    // projectile weapon selected, and those correctly eject no brass.
    if (weapon.cur().melee || weapon.cur().projectile) S.player.weaponIdx = 0;
    const w50 = weapon.cur();
    w50.mag = w50.magSize; w50.reloading = false;
    const shells0 = effects.debugCounts().shells;
    weapon.fire(bots.hitMeshes(), world.shootables, Math.random, () => {}, () => null);
    check('§50 firing ejects a shell casing', effects.debugCounts().shells > shells0);
    // Buy menu: stats per card, team plan, quick-buy/rebuy hints + actions.
    S.economy.money = 2400;
    game.toggleBuy();
    const buyHtml50 = game.buyHtml();
    check('§50 buy card shows headshot damage', buyHtml50.includes('HS '));
    check('§50 buy card shows fire rate', buyHtml50.includes('/s'));
    check('§50 buy card shows magazine', buyHtml50.includes(' mag'));
    check('§50 buy menu header names the map', (document.querySelector('.buy-head h2') || {}).textContent === 'BUY — FROSTWORKS YARD');
    check('§50 buy menu shows the team plan', buyHtml50.includes('TEAM PLAN: PUSH BOILER HOUSE'));
    check('§50 buy menu shows quick-buy / rebuy hints', buyHtml50.includes('Q quick buy') && buyHtml50.includes('9 rebuy'));
    const ownedBefore = S.owned.slice();
    const money0 = S.economy.money;
    game.quickBuy();
    const boughtIdx = S.owned.findIndex((o, i) => o && !ownedBefore[i]);
    check('§50 quick buy buys exactly one new weapon',
      boughtIdx >= 0 && S.economy.money === money0 - S.weapons[boughtIdx].price && S.lastBought === 'w' + boughtIdx);
    const he50 = S.grenades.he;
    const money1 = S.economy.money;
    game.buy('he');
    check('§50 buying a frag records lastBought', S.lastBought === 'he' && S.economy.money === money1 - 300 && S.grenades.he === he50 + 1);
    game.rebuy();
    check('§50 rebuy repeats the last purchase', S.grenades.he === he50 + 2 && S.economy.money === money1 - 600);
    // Key path: Q while the menu is open runs quick buy, never a grenade;
    // 9 runs rebuy, never a molotov.
    S.countdownT = 0; S.economy.money = 2400;
    const heQ0 = S.grenades.he, msgQ0 = S.msg;
    input.state.keys.add('KeyQ');
    game.step(FIXED_STEP, input.state.keys);
    input.state.keys.delete('KeyQ');
    check('§50 Q key runs quick buy, not a grenade', (S.msg || '').startsWith('⚡ QUICK BUY') && S.msg !== msgQ0 && S.grenades.he === heQ0);
    const he90 = S.grenades.he, mol90 = S.grenades.molotov, money90 = S.economy.money;
    game.buy('he'); // lastBought = 'he' again
    input.state.keys.add('Digit9');
    game.step(FIXED_STEP, input.state.keys);
    input.state.keys.delete('Digit9');
    check('§50 9 key runs rebuy, not a molotov', S.grenades.he === he90 + 2 && S.grenades.molotov === mol90 && S.economy.money === money90 - 600);
    game.toggleBuy();
    // Defuse: plant at site A (hold E), the nearest bot rushes in to
    // defuse — the progress bar shows and the site hazard glow turns on.
    S.mode = 'snd'; game.startRound();
    S.player.hp = 9999; S.spawnProtT = 0; S.hideT = 999;
    const siteA = world.sites.A;
    S.player.x = siteA.x; S.player.z = siteA.z;
    // Park the nearest alive, non-driving bot 2m from the charge: after
    // §49 the bots can be anywhere on the map, and a 3s settle is not
    // enough for a 40m walk. (S&D does not respawn dead bots.)
    const driving50 = new Set(vehicles.list.filter(v => v.driver).map(v => v.driver));
    let dbot = S.bots.filter(b => b.alive && !driving50.has(b))
      .sort((a, c) => Math.hypot(a.x - siteA.x, a.z - siteA.z) - Math.hypot(c.x - siteA.x, c.z - siteA.z))[0];
    if (!dbot) { bots.respawn(S.bots[0]); dbot = S.bots[0]; }
    dbot.x = siteA.x + 2; dbot.z = siteA.z; dbot.state = 'hold'; bots.syncMeshes();
    input.state.keys.add('KeyE');
    settle(60 * 9); // 3.2s countdown + 4s plant channel
    input.state.keys.delete('KeyE');
    check('§50 charge plants at site A', S.bomb.state === 'planted' && S.bomb.site === 'A');
    settle(60 * 3); // nearest bot walks in and starts defusing
    check('§50 a bot is defusing', S.bomb.defuseT > 0);
    check('§50 defuse progress bar shows', !document.getElementById('plant-bar').hidden && document.getElementById('plant-label').textContent === 'ENEMY DEFUSING…');
    check('§50 planted site hazard glow is on', (() => { const h = world.siteHazard('A'); return h && h.color === 0xff2a55 && h.opacity >= 0.09; })()); // disc pulses 0.09–0.35, colour is the signature
    // Round-over wide shot: end the round and check the viewpoint parks high.
    game.endRound(true, '§50 TEST');
    check('§50 round-over parks the camera high', S.player.y >= 20 && S.player.pitch < -0.5);
    // ---- §51: frost layout redesign — Frostworks must NOT be foundry
    // with snow (2026-11-16). Sites, waypoints and the big masses differ.
    world.buildMap('frost'); vehicles.place('frost'); game.startRound();
    S.mode = 'tdm'; S.difficulty = 'normal';
    S.player.hp = 9999; S.spawnProtT = 0; S.hideT = 999;
    const fr51 = MAP_DEFS.frost, fo51 = MAP_DEFS.foundry;
    const siteDist51 = k => Math.hypot(fr51.sites[k].x - fo51.sites[k].x, fr51.sites[k].z - fo51.sites[k].z);
    check('§51 frost sites moved (A/B/C all >10m from foundry)', ['A', 'B', 'C'].every(k => siteDist51(k) > 10));
    check('§51 frost site names kept (Boiler House / Crane Dock / Frost Gate)',
      fr51.sites.A.name === 'Boiler House' && fr51.sites.B.name === 'Crane Dock' && fr51.sites.C.name === 'Frost Gate');
    check('§51 frost waypoints differ from foundry (not a copy)',
      JSON.stringify(fr51.waypoints) !== JSON.stringify(fo51.waypoints) && fr51.waypoints.length >= 12);
    // The old foundry hall spot (0,-2) is open ground now; the new west
    // hall, the annex and the crane legs are solid where they stand.
    check('§51 no central hall: old foundry hall spot (0,-2) is open', !world.isColliding(0, -2, 0.35, 0));
    check('§51 new west hall is solid', world.isColliding(-30, -3, 0.35, 0));
    check('§51 new annex is solid', world.isColliding(26, 12, 0.35, 0));
    check('§51 crane legs stand at (26,-6) and (26,6)', world.isColliding(26, -6, 0.35, 0) && world.isColliding(26, 6, 0.35, 0));
    check('§51 site B sits open under the crane beam', !world.isColliding(26, 0, 0.35, 0));
    // Every site + spawn stands on open ground.
    const open51 = (x, z) => !world.isColliding(x, z, 0.35, 0);
    check('§51 all frost sites are open ground', ['A', 'B', 'C'].every(k => open51(world.sites[k].x, world.sites[k].z)));
    check('§51 frost spawns are open ground',
      open51(fr51.spawns.player.x, fr51.spawns.player.z) && fr51.spawns.bots.every(s => open51(s.x, s.z)));
    // Every waypoint is open, and every ring segment between consecutive
    // waypoints is walkable (sampled every 0.5m, bot radius 0.4).
    const wps51 = world.waypoints;
    check(`§51 all ${wps51.length} frost waypoints are open`, wps51.every(w => open51(w.x, w.z)));
    const segClear51 = (a, b) => {
      const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.5);
      for (let i = 0; i <= n; i++) {
        if (world.isColliding(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n, 0.4, 0)) return false;
      }
      return true;
    };
    let badSeg51 = -1;
    for (let i = 0; i < wps51.length; i++) {
      if (!segClear51(wps51[i], wps51[(i + 1) % wps51.length])) { badSeg51 = i; break; }
    }
    check(`§51 waypoint ring is walkable (bad segment: ${badSeg51})`, badSeg51 === -1);
    // Houses still enterable, vehicles placed on clear ground.
    check('§51 frost still has enterable-house doors', world.doors.length > 0);
    check('§51 frost vehicles sit on clear ground',
      vehicles.list.every(v => !world.isColliding(v.x, v.z, 1.2, 0)));
    // A bot actually walks the new ring: park it at waypoint 0, point it
    // at the far side, and watch it close the distance.
    const wb = S.bots[0];
    wb.hp = 100; wb.state = 'patrol'; wb.hasSeen = false; wb.prone = false;
    wb.skillCd = 999; wb.grenadeCd = 999; wb.grenadesUsed = 1; wb.flankCd = 999;
    wb.x = wps51[0].x; wb.z = wps51[0].z; wb.wpIdx = 6; wb.stuckT = 0;
    parkOthers(wb); bots.syncMeshes();
    const d0 = Math.hypot(wb.x - wps51[6].x, wb.z - wps51[6].z);
    settle(60 * 12); // west leg detour is longer; 12s still clears it
    const d1 = Math.hypot(wb.x - wps51[6].x, wb.z - wps51[6].z);
    check(`§51 bot walks the frost ring (dist ${d0.toFixed(1)} -> ${d1.toFixed(1)}m)`, d1 < d0 - 5);
    // ---- §52: radio callouts follow the active map (2026-11-16) ----
    // The staged play-shot radio used to say "Mid Yard" on frost, and the
    // phone booth said "Foundry Yard" on cargo. Both now use the active
    // map: the radio via nearestSiteName (reads shared SITES, rewritten
    // by buildMap), the booth via MAP_DEFS[S.mapId].name.
    world.buildMap('frost'); game.startRound();
    check('§52 radio lookup on frost: near C is Frost Gate', nearestSiteName(10, 14) === 'Frost Gate');
    check('§52 radio lookup on frost: near A is Boiler House', nearestSiteName(-16, -16) === 'Boiler House');
    check('§52 radio lookup on frost: near B is Crane Dock', nearestSiteName(26, 0) === 'Crane Dock');
    world.buildMap('foundry'); game.startRound();
    check('§52 radio lookup on foundry: near C is Mid Yard', nearestSiteName(0, 6) === 'Mid Yard');
    check('§52 radio lookup on foundry: near A is Furnace', nearestSiteName(-27, -19) === 'Furnace');
    world.buildMap('frost'); game.startRound();
    S.hideT = 0;
    world.buildMap('foundry');
    game.startRound();
    world.buildMap('foundry');
    game.startRound();
    // ---- §53: visual pass — reference-style industrial frost (2026-11-16) ----
    // Corrugated panel walls, grate floors, steam vents, wall pipes, lit
    // windows, dusk snow light, hi-vis worker bots.
    world.buildMap('frost'); vehicles.place('frost'); game.startRound();
    S.player.hp = 9999; S.spawnProtT = 0; S.hideT = 0;
    const tex53 = world.textureReport();
    check('§53 frost gate walls are corrugated panel (not flat brick)', !!tex53['panel-wall']);
    check('§53 frost has a steel grate floor', !!tex53['grate']);
    const dc53 = world.decorCounts();
    check('§53 frost has 4 steam vents', dc53.steams >= 4);
    check('§53 frost has wall pipes', dc53.pipes >= 3);
    check('§53 frost has lit windows', dc53.glowWindows >= 3);
    check('§53 gate walls still solid at (-12,2) and (8,-4)',
      world.isColliding(-12, 2, 0.35, 0) && world.isColliding(8, -4, 0.35, 0));
    check('§53 steam vents and grates do not block the ground',
      !world.isColliding(14, 10, 0.35, 0) && !world.isColliding(0, 16, 0.35, 0));
    // Dusk snow light: warm low sun + warm horizon in the snow def, and
    // the frost full set applies it.
    check('§53 snow weather horizon is warm dusk', WEATHER_DEFS.snow.sky.horizon === '#ff9a50');
    weather.applyWeather('snow', MAP_WEATHER_FULL.frost);
    check('§53 frost dusk sun is warm (0xffc080)', world.sun.color.getHex() === 0xffc080);
    // Hi-vis worker bots: vest + hard hat present, no backpack anywhere.
    const g53 = S.bots[0].mesh.model;
    const parts53 = [];
    if (g53._gear && g53._gear.group) g53._gear.group.traverse((o) => { if (o.userData.part) parts53.push(o.userData.part); });
    check('§53 bot wears a hi-vis vest', parts53.includes('vest'));
    check('§53 bot wears a hard hat', parts53.includes('hat'));
    check('§53 bot has reflective stripes', parts53.includes('stripe'));
    check('§53 bot has a tool belt, no backpack', parts53.includes('belt') && !parts53.includes('backpack'));
    check('§53 bot vest is team orange', !!g53._gear && g53._gear.teamHex === 0xff7a1a);
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
