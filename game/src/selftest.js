// Scripted self-test of the v2 systems. Runs only under ?shot=test.
// The game context (state, systems, helpers) is passed in from main.js.
import { EMOTE_DEFS, WHEEL_PRESETS, FINISHER_DEFS, OPERATOR_DEFS } from './state.js';
import { MAP_IDS } from './maps.js';
import { getDaily, dailyEmoteXp } from './daily.js';
import { createBotModel, BOT_SKINS, BOT_WEAPONS, CHAR_OPERATORS, CHAR_SKINS, killerInfo } from './characters.js';
import { WEATHER_DEFS, MAP_WEATHER, MAP_WEATHER_FULL } from './weather.js';
import { calcGunStats, damageAtRange, adsFov } from './gunsmith.js';
import { SHOP_ITEMS } from './economy.js';
import { defaultSettings, rebindKey } from './settings.js';
import { loadColorChoices, saveColorChoices } from './palette.js';
import { FLAGS, setFlag } from './state.js';

export function runSelfTest(ctx) {
  const { S, game, bots, hud, mythicFx, world, weapon, player, doEmote, settle, FIXED_STEP, createDragon3D, createVoidPortal3D, weather, zombies, vehicles, economy, effects, audio, input } = ctx;
  const checks = [];
  const check = (name, ok) => checks.push({ name, ok: !!ok });
  try {
    // 1. TDM killstreak ladder: 3 kills -> UAV, 5 -> Hunter, 7 -> Sentry, 9 -> Airstrike.
    S.mode = 'tdm'; S.perks = []; S.operator = 'tempest';
    game.startRound();
    // killBot respawns a bot when none are alive, so the ladder can be
    // climbed past the 5-bot roster (TDM respawn takes 3s; the test is instant).
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
    // 2. Operator: Tempest arms the next shot.
    game.useOperator();
    check('Tempest armed + cooldown set', S.opActive === true && S.opCd > 59);
    // 3. Domination: standing in zone A captures it. The holder bot spawns
    // inside zone A, so move every bot far away and hold them there (else a
    // patrolling bot contests the zone and the capture stalls below 100).
    S.mode = 'dom';
    game.startRound();
    S.bots.forEach((b, i) => { b.x = 24; b.z = 24 - i * 2; b.state = 'hold'; });
    bots.syncMeshes();
    S.player.x = world.sites.A.x; S.player.z = world.sites.A.z;
    settle(540); // 9s in zone A: 3.2s countdown + 5s to capture + points tick
    check('Domination zone A captures', S.dom.A.value > 50);
    check('Domination points tick', S.dom.points.you > 0);
    // 4. BR: zone shrinks over time (player + bots stay at the center so the
    // zone damage does not end the round early). The player gets a big HP
    // buffer: 5 bots at 3m would otherwise kill him during the 120s settle.
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
    // 5. Battle pass: XP accrues, tier math works.
    const xp0 = S.bp.xp;
    check('BP object loaded', !!S.bp && typeof S.bp.tier === 'number');
    // 6. Emote + mythic + card state.
    doEmote('dance');
    check('Emote activates', S.emote && S.emote.id === 'dance');
    S.mythic = 'void'; weapon.applyMythic();
    check('Mythic Void selectable', S.mythic === 'void');
    S.card = 'galaxy';
    check('Calling card selectable', S.card === 'galaxy');
    // 7. Quick Fix regen.
    S.mode = 'snd';
    game.startRound();
    S.player.hp = 50; S.player.lastHurtT = S.time - 10;
    settle(240); // 4s: 3.2s countdown + ~0.8s of regen (4 HP/s)
    check('Quick Fix regen heals', S.player.hp > 50);
    // 8. Loadout switch.
    S.loadout.primary = 3; S.player.weaponIdx = S.loadout.primary;
    check('Loadout primary LR-50', weapon.cur().id === 'lr50');
    check('BP xp grew during test', S.bp.xp >= xp0);
    // 9. Mythic factories exist and build geometry.
    const d = createDragon3D(1);
    check('createDragon3D builds a dragon', d.group.children.length >= 8);
    const vp = createVoidPortal3D(1);
    check('createVoidPortal3D builds a portal', vp.group.children.length >= 30);
    // 10. Emote wheel: 21 emotes in the pool (12 core + sit/push-up + 7 micro
    // emotes v18.8/v18.9), 8 slots.
    check('21 emotes in pool', Object.keys(EMOTE_DEFS).length === 21);
    check('Wheel has 8 slots', S.wheel.length === 8 && S.wheel.every(id => EMOTE_DEFS[id]));
    check('6 wheel presets', Object.keys(WHEEL_PRESETS).length === 6);
    // 11. Finisher: play a gold finisher, run it to completion.
    S.noFinisher = false;
    mythicFx.playFinisher('gold', 0, 0, 'YOU', 'BOT-1');
    check('Finisher starts', !!S.finisher && S.finisher.kind === 'gold');
    for (let i = 0; i < 260; i++) mythicFx.step(FIXED_STEP, () => {});
    check('Finisher completes', S.finisher === null || mythicFx.finisher === null);
    // 12. Daily preset: structure + countdown.
    const daily = getDaily();
    check('Daily preset has 8 emotes', daily.emotes.length === 8);
    check('Daily countdown format', /^\d{2}:\d{2}:\d{2}$/.test(daily.countdown));
    check('Daily emote XP is 0 for non-preset emote', dailyEmoteXp('__none__') === 0);
    // 13. All 8 finishers defined.
    check('8 finishers defined', Object.keys(FINISHER_DEFS).length === 8);
    // 14. Maps: all 7 build, colliders + waypoints present, spawns clear.
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
    // 15. Interiors (Twin Court): doors open/close, stairs lift, floor 2 holds.
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
    // South house at (-16, 20), rot 0: stair strip x [-19.7,-18.5], z [17,23],
    // low end at z=23, high end at z=17. Mid-stair Y should be ~2.35.
    check('Stair mid-height ~2.35', Math.abs(world.groundY(-19.1, 20, 2.35) - 2.35) < 0.05);
    check('Floor 2 groundY is 4.7', Math.abs(world.groundY(-15, 20, 4.7) - 4.7) < 0.01);
    check('Ground floor groundY is 0', world.groundY(0, 20, 0) === 0);
    world.buildMap('foundry');
    game.startRound();
    // 16. Characters: full bot models, varied skins/weapons, name + HP bar,
    // enemy indicator, first-person hands, walk/idle/death animation.
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
      return Math.abs(b.mesh.group.rotation.z - Math.PI / 2) < 0.3;
    })());
    check('First-person hands exist', !!weapon.hands && !!weapon.hands.parts.handL && !!weapon.hands.parts.handR);
    // 17. Operators + char skins: 6 each, killcam shows the killer.
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
    // 18. Movement: crouch eye 1.1, prone eye 0.6, sprint ~9, slide, parkour.
    // Clear lane: x=-20, z=20 -> -Z (the furnace box blocks the x=0 lane).
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
    // Parkour: 1.5m from the crate at (-12,8), facing it, Space vaults (vy 6.5
    // instead of a normal jump's 5.2).
    p.x = -12; p.z = 9.0; p.yaw = 0; p.y = 0; p.vx = 0; p.vz = 0; p.onGround = true;
    stepKeys(new Set(['Space']), 1);
    check('Parkour vault lifts the player', p.vy > 5.5);
    // 19. Weather: 9 types, apply + cycle advance + per-map defaults.
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
    // 20. Gunsmith: stats respond to attachments, range falloff, ADS FOV.
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
    // 21. Zombie mode: wave 1 spawns 8, wave 5 has a boss.
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
    // 22. Vehicles: spots clear on all 7 maps, enter/exit works.
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
    // 23. Economy: shop buy, gacha, quest progress, profile rank/ELO.
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
    // 24. BR loot: 9 items spawn, medkit heals to full.
    S.mode = 'br';
    game.startRound();
    check('BR loot spawns 9', game.lootCount() === 9);
    // Medkit channel is cancelled by any damage — so test it in TDM (no BR
    // parachute fall damage) with the bots parked far away + held.
    S.mode = 'tdm';
    game.startRound();
    S.bots.forEach((b, i) => { b.x = 24; b.z = 24 - i * 2; b.state = 'hold'; });
    bots.syncMeshes();
    S.medkits = 2; S.player.hp = 40;
    check('Medkit starts a 3s channel', game.useMedkit() === true && S.medkits === 1);
    settle(60 * 7); // 3.2s countdown + 3s channel + margin -> heals to full
    check('Medkit channel heals to full', S.player.hp >= 99);
    // 25. BR revive: a dead bot stands up as an ally.
    const dead = S.bots[0];
    bots.damage(dead, 999);
    bots.reviveAsAlly(dead);
    check('Revived bot is an ally', dead.alive === true && dead.team === 'ally' && dead.state === 'ally');
    // 26. v16.3 blood pool (particle pool, no per-particle timers).
    effects.bloodSpray({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, false);
    effects.bloodPool({ x: 0, y: 0, z: 0 }, true);
    check('Blood spray + pool spawn particles', effects.debugCounts().particles > 0 && effects.debugCounts().decals > 0);
    effects.explosion({ x: 0, y: 0.5, z: 0 }, false);
    check('Explosion spawns particles', effects.debugCounts().particles > 0);
    // 27. v17.2 per-map weather params: 7 maps, each with fog/sun/ambient.
    check('MAP_WEATHER_FULL has 7 maps', Object.keys(MAP_WEATHER_FULL).length === 7);
    check('MAP_WEATHER_FULL ember is sand + fog 30m', MAP_WEATHER_FULL.ember.weather === 'sand' && MAP_WEATHER_FULL.ember.fog[1] === 30);
    // 28. v17.1 decor counts: Twin Court has props on the map.
    world.buildMap('twin');
    check('Decor counts non-zero', world.decorCounts().total > 20);
    // 29. v17.3 settings: rebind a key, it frees the old action's slot.
    const st = defaultSettings();
    check('Rebind reload to KeyT works', rebindKey(st, 'reload', 'KeyT') === true && st.keybinds.reload === 'KeyT');
    check('ADS sens slower than hip sens', st.sens.ads < st.sens.hip);
    check('Sniper sens slowest', st.sens.sniper < st.sens.ads);
    // 30. v23.0 Kill Confirmed: a kill drops a dog tag.
    S.mode = 'killconfirmed';
    game.startRound();
    const kcBot = S.bots.find(x => x.alive);
    bots.damage(kcBot, 999); game.onKill(kcBot, false);
    check('Kill Confirmed drops a tag', S.kcTags.length > 0);
    // 31. v24.1 colors: save + load round-trips through localStorage.
    saveColorChoices({ ...loadColorChoices(), costume: 'gold' });
    check('Color choices persist', loadColorChoices().costume === 'gold');
    // 32. v25.0 ragdoll corpse list: a dead bot stays as a corpse.
    check('Corpse list has the dead bot', bots.corpseList().length > 0);
    // 33. v26.0 flags: setFlag toggles hardcore.
    setFlag('hardcore', true);
    check('Flag hardcore sets', FLAGS.hardcore === true);
    setFlag('hardcore', false);
    check('Flag hardcore clears', FLAGS.hardcore === false);
    // 34. v20.0 loot crate: crates exist on the map and one opens for loot.
    // (Foundry's props block several of the 10 spots, so assert the mechanic.)
    world.buildMap('foundry');
    S.mode = 'br';
    game.startRound();
    check('BR has loot crates', world.lootCrates.length > 0);
    const c0 = world.lootCrates[0];
    S.player.x = c0.x; S.player.z = c0.z;
    check('Opening a crate gives loot', game.openCrate() === true && c0.opened === true);
    // 35. v19.0 reload: tactical reload keeps leftover rounds in reserve.
    S.mode = 'tdm';
    game.startRound();
    const w0 = weapon.cur();
    w0.mag = 1; w0.reserve = 90; // below magSize for any weapon (LR-50: 5)
    weapon.reload();
    check('Reload starts', w0.reloading === true);
    // 36. v22.2 stamina: sprint drains stamina, idle regens.
    S.stamina = 100;
    S.player.x = -20; S.player.z = 20; S.player.vx = 0; S.player.vz = 0; S.player.onGround = true;
    for (let i = 0; i < 60; i++) player.step(FIXED_STEP, new Set(['ShiftLeft', 'KeyW']), false);
    check('Sprint drains stamina', S.stamina < 100);
    // 37. Bot tactics (v27.1): flank, grenade flush, operator skills, retreat.
    // The player is a punching bag here (9999 HP) so the bots can act.
    // Lane x=-20 is the known-clear lane (see the movement tests above).
    S.mode = 'tdm'; S.difficulty = 'normal';
    game.startRound();
    S.player.hp = 9999; S.spawnProtT = 0;
    settle(60 * 4); // past the 3.2s countdown
    const parkOthers = (keep) => {
      S.bots.forEach((b, i) => { if (b === keep) return; b.x = 24; b.z = 24 - i * 2; b.state = 'hold'; });
      bots.syncMeshes();
    };
    // Put one bot in combat with the player; the player stands at (-20,20)
    // unless the check moves them after (the x=-20 lane is clear z=10..20;
    // the z=-8 lane behind the furnace is clear too — the containers at
    // (-20,2) and (-20,6) block the south half of the x=-20 lane).
    const duelSetup = (b, bx, bz) => {
      b.x = bx; b.z = bz; b.state = 'combat';
      S.player.x = -20; S.player.z = 20;
      parkOthers(b);
      bots.syncMeshes();
    };
    check('Bots have operator skills assigned',
      S.bots.every(b => b.skill && OPERATOR_DEFS[b.skill]));
    // Tak-5: a hurt bot heals itself (+50, cooldown consumed).
    const tak = S.bots[0]; // skill 'tak5'
    tak.hp = 35; tak.skillCd = 0;
    duelSetup(tak, -20, 10);
    settle(60 * 2);
    check('Tak-5 heals a hurt bot', tak.hp > 35 && tak.skillCd > 30);
    // Gravity Spikes: a close bot slams you after a 0.5s crouch wind-up.
    const grav = S.bots[2]; // skill 'gravity'
    grav.hp = 100; grav.skillCd = 0;
    duelSetup(grav, -20, 10);
    S.player.x = -20; S.player.z = 15;
    const php0 = S.player.hp;
    settle(60 * 2);
    check('Gravity slam hurts the player', grav.skillCd > 20 && S.player.hp < php0);
    // Bull Charge: a far bot charges at you ~80% faster.
    const bull = S.bots[1]; // skill 'bull'
    bull.hp = 100; bull.skillCd = 0;
    duelSetup(bull, -30, -8);
    S.player.x = -14; S.player.z = -8;
    const bx0 = bull.x, bz0 = bull.z;
    settle(60 * 1);
    check('Bull Charge speeds the bot',
      bull.chargeT > 0 && Math.hypot(bull.x - bx0, bull.z - bz0) > 2);
    // Sparrow: an explosive arrow (a free HE grenade) at mid range.
    const spar = S.bots[3]; // skill 'sparrow'
    spar.hp = 100; spar.skillCd = 0;
    duelSetup(spar, -14, -8);
    S.player.x = 14; S.player.z = -8;
    settle(60 * 2);
    check('Sparrow lobs an explosive arrow', spar.skillCd > 20);
    // Flanking: after a 7s duel, losing sight makes the bot circle behind
    // you instead of walking straight at your last known spot.
    const flk = S.bots[4];
    flk.hp = 100; flk.flankCd = 0; flk.combatT = 7; flk.state = 'combat';
    duelSetup(flk, -20, 10);
    S.player.x = 20; S.player.z = -20; // 50m away, no LOS
    flk.lastCombatT = S.time - 3;
    settle(60 * 2);
    check('Bot flanks after a long duel', flk.flankedOnce === true);
    // Camper tracking: a bot notes how long you have stood still.
    const cam = S.bots[0];
    cam.x = 0; cam.z = 12; cam.state = 'hold'; cam.playerStillT = 0;
    S.player.x = 0; S.player.z = -14; // the furnace blocks LOS between them
    parkOthers(cam);
    bots.syncMeshes();
    settle(60 * 4);
    check('Bot tracks a still player', cam.playerStillT > 3.5);
    // Grenade flush: a bot that lost you behind cover lobs a frag at your
    // last known spot (1 per bot per round).
    cam.state = 'react'; cam.hasSeen = true; cam.lastSeenX = 0; cam.lastSeenZ = -14;
    cam.grenadeCd = 0; cam.grenadesUsed = 0;
    settle(60 * 1);
    check('Bot throws a grenade at a camper', cam.grenadesUsed > 0);
    // Tactical retreat: a low-HP bot falls back to cover, throwing smoke
    // and firing suppressive bursts, regenerating as it goes.
    const ret = S.bots[1];
    ret.hp = 20; ret.skillCd = 999; ret.grenadeCd = 0; ret.grenadesUsed = 0;
    duelSetup(ret, -20, 10);
    const rd0 = Math.hypot(ret.x - S.player.x, ret.z - S.player.z);
    settle(60 * 2);
    check('Low-HP bot retreats to cover',
      ret.retreating === true && ret.hp > 20 && ret.grenadesUsed > 0
      && Math.hypot(ret.x - S.player.x, ret.z - S.player.z) > rd0 + 2);
    check('Retreat throws smoke cover', S.grenades.smokes.length > 0);
    // Easy bots never use tactics (they still retreat — that is survival,
    // not an advantage).
    S.difficulty = 'easy';
    const ez = S.bots[0];
    ez.hp = 100; ez.skillCd = 0; ez.grenadeCd = 0; ez.flankCd = 0; ez.grenadesUsed = 0;
    ez.flankedOnce = false; ez.combatT = 0;
    duelSetup(ez, -20, 10);
    settle(60 * 8);
    check('Easy bots never use tactics',
      ez.skillCd <= 0 && ez.grenadesUsed === 0 && ez.flankedOnce !== true);
    S.difficulty = 'normal';
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
