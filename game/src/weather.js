// Weather: 8 types + dawn, per-map defaults, random per round, day-night cycle.
// Local single-player state only — no server, no broadcast, no WebSocket.
import * as THREE from 'three';

export const WEATHER_DEFS = {
  clear: { name: 'Cerah Siang', icon: '☀️', sky: { top: '#3a7bd5', mid: '#7ab5e8', horizon: '#ffd9a0', glow: 'rgba(255,230,150,0.9)', stars: false }, bg: 0x87ceeb, fog: [30, 95], sun: { color: 0xffdf80, int: 2.8, pos: [-30, 60, 20] }, hemi: { sky: 0xbfd8ff, ground: 0x8a7a5a, int: 1.6 }, clouds: 15, rain: 0, snow: 0, dust: 0, stars: false, lights: false, lightning: null },
  sunset: { name: 'Sore', icon: '🌇', sky: { top: '#2a1a3a', mid: '#7a3a2a', horizon: '#ff6a2a', glow: 'rgba(255,80,40,0.95)', stars: false }, bg: 0xff7e2d, fog: [25, 85], sun: { color: 0xff5a2a, int: 2.2, pos: [-45, 12, 10] }, hemi: { sky: 0xff9a6a, ground: 0x4a2a1a, int: 1.2 }, clouds: 10, rain: 0, snow: 0, dust: 0, stars: false, lights: false, lightning: null },
  night: { name: 'Malam', icon: '🌙', sky: { top: '#020208', mid: '#0a0a20', horizon: '#1a1a3a', glow: 'rgba(200,200,255,0.25)', stars: true }, bg: 0x050510, fog: [20, 70], sun: { color: 0x9fb8ff, int: 0.5, pos: [30, 50, -20] }, hemi: { sky: 0x2a3a6a, ground: 0x0a0a14, int: 0.5 }, clouds: 4, rain: 0, snow: 0, dust: 0, stars: true, lights: true, lightning: null },
  rain: { name: 'Hujan', icon: '🌧️', sky: { top: '#1a2530', mid: '#2a3a4a', horizon: '#4a5a6a', glow: 'rgba(150,170,190,0.3)', stars: false }, bg: 0x3a4a5a, fog: [20, 70], sun: { color: 0xaab8c8, int: 1.0, pos: [-20, 50, 10] }, hemi: { sky: 0x6a7a8a, ground: 0x2a2a2a, int: 0.9 }, clouds: 12, rain: 500, snow: 0, dust: 0, stars: false, lights: false, lightning: 'rare' },
  storm: { name: 'Badai', icon: '⛈️', sky: { top: '#0a0e14', mid: '#141a22', horizon: '#2a3038', glow: 'rgba(180,190,210,0.35)', stars: false }, bg: 0x1a2028, fog: [15, 55], sun: { color: 0x8a9ab0, int: 0.7, pos: [-20, 40, 10] }, hemi: { sky: 0x3a4a5a, ground: 0x141414, int: 0.6 }, clouds: 14, rain: 500, snow: 0, dust: 0, stars: false, lights: false, lightning: 'storm' },
  sand: { name: 'Badai Pasir', icon: '🏜️', sky: { top: '#8a6a2a', mid: '#c8a050', horizon: '#e8c878', glow: 'rgba(255,220,140,0.5)', stars: false }, bg: 0xd8b25a, fog: [3, 20], sun: { color: 0xffd880, int: 1.6, pos: [-30, 40, 20] }, hemi: { sky: 0xe8c878, ground: 0x8a6a3a, int: 1.1 }, clouds: 6, rain: 0, snow: 0, dust: 200, stars: false, lights: false, lightning: null },
  snow: { name: 'Salju', icon: '❄️', sky: { top: '#5a6a7a', mid: '#8a9ab0', horizon: '#c8d8e8', glow: 'rgba(255,255,255,0.5)', stars: false }, bg: 0xb8c8d8, fog: [20, 75], sun: { color: 0xe8f0ff, int: 1.4, pos: [-20, 50, 10] }, hemi: { sky: 0xc8d8e8, ground: 0x6a7a8a, int: 1.2 }, clouds: 10, rain: 0, snow: 300, dust: 0, stars: false, lights: false, lightning: null },
  fog: { name: 'Kabut Tebal', icon: '🌫️', sky: { top: '#6a7a7a', mid: '#8a9a8a', horizon: '#a8b8b0', glow: 'rgba(200,210,200,0.3)', stars: false }, bg: 0x9aa8a8, fog: [2, 15], sun: { color: 0xc8d0c8, int: 0.8, pos: [-20, 40, 10] }, hemi: { sky: 0x9aa8a8, ground: 0x5a6a5a, int: 0.9 }, clouds: 3, rain: 0, snow: 0, dust: 0, stars: false, lights: false, lightning: null },
  dawn: { name: 'Subuh', icon: '🌅', sky: { top: '#3a2a5a', mid: '#c86a8a', horizon: '#ff9a6a', glow: 'rgba(255,150,100,0.9)', stars: true }, bg: 0xff9a7a, fog: [25, 90], sun: { color: 0xffb080, int: 1.8, pos: [45, 10, 10] }, hemi: { sky: 0xff9a8a, ground: 0x4a3a4a, int: 1.0 }, clouds: 10, rain: 0, snow: 0, dust: 0, stars: true, lights: false, lightning: null },
};
export const WEATHER_IDS = Object.keys(WEATHER_DEFS);
// Default weather per map (original map ids, not the COD names).
// v17.2: ruin = heavy rain + lightning, cargo = drizzle, harvest = foggy
// morning (the older fog/clear defaults for those maps are superseded).
export const MAP_WEATHER = { ember: 'sand', ruin: 'storm', iron: 'sunset', foundry: 'clear', twin: 'clear', cargo: 'rain', harvest: 'fog' };
// Full per-map weather parameters (v17.2): each map has its own sky + fog
// density + sun intensity + particle behaviour + wind + ambient sound.
// The base `weather` must match MAP_WEATHER above; the extras only apply
// while that map weather is in effect (cycle / random / manual override the
// base weather, and then the extras do not apply).
export const MAP_WEATHER_FULL = {
  ember: { weather: 'sand', fog: [3, 15], sunInt: 1.6, wind: 3, ambient: 'sand', bolt: null, puddles: false, fogBalls: false },
  twin: { weather: 'clear', fog: [30, 95], sunInt: 3.2, wind: 1, ambient: 'birds', bolt: null, puddles: false, fogBalls: false },
  iron: { weather: 'sunset', fog: [18, 60], sunInt: 1.2, wind: 1, ambient: 'city', bolt: null, puddles: false, fogBalls: false, sky: { top: '#3a3a42', mid: '#5a5a62', horizon: '#8a8a92', glow: 'rgba(180,180,190,0.3)', stars: false } },
  cargo: { weather: 'rain', fog: [25, 80], sunInt: 1.0, wind: 1, ambient: 'rain-light', bolt: null, puddles: true, fogBalls: false },
  harvest: { weather: 'fog', fog: [2, 15], sunInt: 0.8, wind: 0.5, ambient: 'birds', bolt: null, puddles: false, fogBalls: true },
  ruin: { weather: 'storm', fog: [15, 55], sunInt: 0.7, wind: 2, ambient: 'rain-heavy', bolt: [2, 4], puddles: true, fogBalls: false },
  foundry: { weather: 'clear', fog: [30, 95], sunInt: 2.8, wind: 1, ambient: 'city', bolt: null, puddles: false, fogBalls: false },
};
// Ambient sound per weather type (used when no per-map ambient is set).
const WEATHER_AMBIENT = { clear: 'birds', sunset: 'city', night: 'city', rain: 'rain-light', storm: 'rain-heavy', sand: 'sand', snow: 'wind', fog: 'wind', dawn: 'birds' };
// One day-night cycle = 10 minutes of game time.
export const CYCLE_PHASES = [
  { id: 'day', weather: 'clear', label: 'Siang', icon: '☀️', clock: '10:00', dur: 180 },
  { id: 'sunset', weather: 'sunset', label: 'Sore', icon: '🌇', clock: '17:30', dur: 120 },
  { id: 'night', weather: 'night', label: 'Malam', icon: '🌙', clock: '22:00', dur: 180 },
  { id: 'dawn', weather: 'dawn', label: 'Subuh', icon: '🌅', clock: '05:30', dur: 120 },
];
export const CYCLE_LEN = 600;

function makePoints(n, color, size, area) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() * 2 - 1) * area.x;
    pos[i * 3 + 1] = Math.random() * area.y;
    pos[i * 3 + 2] = (Math.random() * 2 - 1) * area.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.9, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.visible = false;
  return pts;
}

export function createWeather(scene, S, world, audio) {
  const flashEl = document.getElementById('weather-flash');
  // Sun + moon (slow drift across the sky).
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffdf80, fog: false }));
  sunMesh.position.set(-60, 55, 40);
  scene.add(sunMesh);
  const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 12), new THREE.MeshBasicMaterial({ color: 0xe8ecff, fog: false }));
  moonMesh.position.set(60, 55, -40);
  moonMesh.visible = false;
  scene.add(moonMesh);
  // Clouds: 15 flattened spheres drifting with the wind.
  const cloudGeo = new THREE.SphereGeometry(1, 8, 6);
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, fog: false });
  const clouds = [];
  for (let i = 0; i < 15; i++) {
    const c = new THREE.Mesh(cloudGeo, cloudMat);
    c.scale.set(4 + Math.random() * 3, 1.1 + Math.random() * 0.6, 2.5 + Math.random() * 1.5);
    c.position.set((Math.random() * 2 - 1) * 60, 26 + Math.random() * 14, (Math.random() * 2 - 1) * 55);
    scene.add(c);
    clouds.push(c);
  }
  // Stars: 100 twinkling points in a dome.
  const starGeo = new THREE.BufferGeometry();
  {
    const pos = new Float32Array(100 * 3);
    for (let i = 0; i < 100; i++) {
      const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.2, r = 140;
      pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
      pos[i * 3 + 1] = Math.sin(e) * r;
      pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  }
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false; stars.visible = false;
  scene.add(stars);
  // Rain / snow / dust as single Points draws (not hundreds of meshes).
  const rain = makePoints(500, 0x9fb8cc, 0.09, { x: 40, y: 30, z: 28 });
  const snow = makePoints(300, 0xffffff, 0.14, { x: 40, y: 30, z: 28 });
  const dust = makePoints(200, 0xc8a860, 0.22, { x: 40, y: 12, z: 28 });
  scene.add(rain, snow, dust);
  // City lights: warm dots at night.
  const lights = makePoints(40, 0xffc860, 0.3, { x: 38, y: 8, z: 26 });
  {
    const pos = lights.geometry.attributes.position.array;
    for (let i = 0; i < 40; i++) pos[i * 3 + 1] = 1.5 + Math.random() * 7;
  }
  lights.geometry.attributes.position.needsUpdate = true;
  scene.add(lights);
  // Rain puddles: glossy discs, shown only on drizzle / heavy-rain maps.
  const puddleMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.08, metalness: 0.9 });
  const puddles = [];
  // Puddle shine (v18.6.3): a transparent blue reflective layer on top of
  // each glossy disc — the "reflection" of the sky in the water.
  const shineMat = new THREE.MeshBasicMaterial({ color: 0x88bbff, transparent: true, opacity: 0.16, depthWrite: false });
  const puddleShines = [];
  for (const [px, pz, pr] of [[-12, 4, 2.2], [8, -8, 1.8], [0, 14, 2.6], [20, 10, 1.5]]) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(pr, 20), puddleMat);
    m.rotation.x = -Math.PI / 2; m.position.set(px, 0.03, pz);
    m.visible = false; scene.add(m); puddles.push(m);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(pr * 0.9, 20), shineMat);
    sh.rotation.x = -Math.PI / 2; sh.position.set(px, 0.05, pz);
    sh.visible = false; scene.add(sh); puddleShines.push(sh);
  }
  // Air dust (v18.6.4): 50 motes drifting slowly in the air on every map —
  // the one ambient particle layer that never depends on the weather.
  const airDust = makePoints(50, 0xd8c8a8, 0.12, { x: 40, y: 10, z: 28 });
  airDust.material.opacity = 0.35;
  scene.add(airDust);
  // Rainbow (v18.9.16): 7-color arc, appears 10s after rain stops, fades.
  const rainbow = new THREE.Group();
  const RAINBOW_COLORS = [0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x4b0082, 0x9400d3];
  RAINBOW_COLORS.forEach((c, i) => {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(34 - i * 0.9, 0.45, 6, 40, Math.PI),
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5 }));
    arc.position.set(0, 2, -30); arc.rotation.z = 0;
    rainbow.add(arc);
  });
  rainbow.visible = false;
  scene.add(rainbow);
  let rainbowDelay = -1; // counts down after rain stops; then shows for 10s
  let rainbowT = 0;
  // Morning fog balls: 20 big soft white blobs drifting over the garden map.
  const fogBalls = makePoints(20, 0xffffff, 3.2, { x: 38, y: 3, z: 26 });
  fogBalls.material.opacity = 0.28;
  scene.add(fogBalls);

  let boltT = 8; // seconds to the next lightning bolt
  let flash = 0;
  let baseSunInt = 2.4;
  let boltRange = null; // [min, max] seconds between bolts (ruin map: faster)

  // Sun path (v18.6.1): one sun, driven by the day-night cycle when it is
  // on — east to west, blue morning, white noon, orange evening. The cycle
  // phases reuse the weather defs' sun color/intensity/position, so there
  // is no second sun system: applyWeather is the only place the sun moves.
  let sunBase = { x: -30, y: 60, z: 20 }; // sun mesh drift anchor
  function applyWeather(id, over) {
    const def = WEATHER_DEFS[id] || WEATHER_DEFS.clear;
    const prev = S.weather;
    // Rainbow (v18.9.16): when rain/storm ends, a rainbow appears 10s later.
    if ((prev === 'rain' || prev === 'storm') && id !== 'rain' && id !== 'storm') {
      rainbowDelay = 10; rainbowT = 0;
    }
    S.weather = id;
    scene.background = new THREE.Color(def.bg);
    scene.fog.color.setHex(def.bg);
    // Graphics quality (v18.6.10): Low pulls the fog in close, Ultra pushes it out.
    const fogF = S.fogFactor || 1;
    scene.fog.near = ((over && over.fog) ? over.fog[0] : def.fog[0]) * fogF;
    scene.fog.far = ((over && over.fog) ? over.fog[1] : def.fog[1]) * fogF;
    world.setSky((over && over.sky) ? over.sky : def.sky);
    world.sun.color.setHex(def.sun.color);
    // Brightness slider (v18.3.2) × Ultra sun boost (v18.6.10).
    const bright = (S.settings && S.settings.graphics && S.settings.graphics.brightness) || 1;
    const qSun = S.qualitySun || 1;
    world.sun.intensity = ((over && over.sunInt != null) ? over.sunInt : def.sun.int) * bright * qSun;
    world.sun.position.set(...def.sun.pos);
    baseSunInt = world.sun.intensity;
    sunBase = { x: def.sun.pos[0] * 1.6, y: Math.max(12, def.sun.pos[1]), z: def.sun.pos[2] * 1.6 };
    world.hemi.color.setHex(def.hemi.sky);
    world.hemi.groundColor.setHex(def.hemi.ground);
    world.hemi.intensity = def.hemi.int;
    sunMesh.visible = id !== 'night';
    sunMesh.material.color.setHex(id === 'sunset' ? 0xff5a2a : id === 'dawn' ? 0xffb080 : 0xffdf80);
    sunMesh.scale.setScalar(id === 'sunset' ? 1.8 : 1);
    moonMesh.visible = id === 'night';
    const nClouds = def.clouds;
    clouds.forEach((c, i) => { c.visible = i < nClouds; c.material = cloudMat; });
    cloudMat.color.setHex(id === 'night' ? 0x2a2a3a : id === 'storm' || id === 'rain' ? 0x3a4550 : id === 'dawn' ? 0xffc8d0 : (over && over.sky) ? 0x6a6a72 : 0xffffff);
    cloudMat.opacity = id === 'storm' || id === 'rain' ? 0.95 : 0.8;
    stars.visible = !!def.stars;
    rain.visible = def.rain > 0;
    snow.visible = def.snow > 0;
    dust.visible = def.dust > 0;
    lights.visible = !!def.lights;
    // Per-map extras: puddles (+ shine layer), fog balls, wind, lightning.
    const showPuddles = !!(over && over.puddles);
    puddles.forEach(m => { m.visible = showPuddles; });
    puddleShines.forEach(m => { m.visible = showPuddles; });
    fogBalls.visible = !!(over && over.fogBalls);
    S.windAmp = (over && over.wind != null) ? over.wind : 1;
    boltRange = (over && over.bolt) ? over.bolt : null;
    if (def.lightning === 'storm') boltT = boltRange ? boltRange[0] + Math.random() * (boltRange[1] - boltRange[0]) : 3 + Math.random() * 4;
    else if (def.lightning === 'rare') boltT = 15 + Math.random() * 15;
    // Ambient sound follows the weather (one loop, cleaned up on switch).
    if (audio && audio.ambient) audio.ambient((over && over.ambient) || WEATHER_AMBIENT[id] || 'wind');
  }
  // Apply the resolved weather for a map: the map's full parameter set
  // applies only while the resolved weather IS the map's default (cycle /
  // random / manual override wins and gets plain base weather instead).
  function applyMapWeather(mapId, rng) {
    const resolved = resolveWeather(mapId, rng);
    const full = MAP_WEATHER_FULL[mapId];
    if (full && resolved === full.weather) applyWeather(resolved, full);
    else applyWeather(resolved);
    return resolved;
  }
  function bolt() {
    flash = 1;
    world.sun.intensity = 7;
    if (audio && audio.thunder) audio.thunder();
  }
  function animateWeather(dt, time, camera) {
    const def = WEATHER_DEFS[S.weather] || WEATHER_DEFS.clear;
    // Rain / snow / dust follow the camera so there is always weather
    // around the player (the Points clouds are recentered, particles wrap
    // inside their local box).
    if (camera && camera.position) {
      const cx = Math.max(-38, Math.min(38, camera.position.x));
      const cz = Math.max(-26, Math.min(26, camera.position.z));
      rain.position.set(cx, 0, cz);
      snow.position.set(cx, 0, cz);
      dust.position.set(cx, 0, cz);
    }
    // Clouds drift with the wind and wrap around the map.
    for (const c of clouds) {
      if (!c.visible) continue;
      c.position.x += dt * (S.weather === 'sand' ? 3 : 0.6);
      if (c.position.x > 70) c.position.x = -70;
    }
    // Rain falls fast; snow falls slowly and sways; dust flies sideways.
    if (rain.visible) {
      const pos = rain.geometry.attributes.position.array;
      for (let i = 0; i < 500; i++) {
        pos[i * 3 + 1] -= 22 * dt;
        if (pos[i * 3 + 1] < 0) { pos[i * 3 + 1] = 25 + Math.random() * 5; pos[i * 3] = (Math.random() * 2 - 1) * 40; pos[i * 3 + 2] = (Math.random() * 2 - 1) * 28; }
      }
      rain.geometry.attributes.position.needsUpdate = true;
    }
    if (snow.visible) {
      const pos = snow.geometry.attributes.position.array;
      for (let i = 0; i < 300; i++) {
        pos[i * 3 + 1] -= 1.2 * dt;
        pos[i * 3] += Math.sin(time * 0.8 + i) * dt * 0.5;
        if (pos[i * 3 + 1] < 0) { pos[i * 3 + 1] = 25 + Math.random() * 5; pos[i * 3] = (Math.random() * 2 - 1) * 40; }
      }
      snow.geometry.attributes.position.needsUpdate = true;
    }
    if (dust.visible) {
      const pos = dust.geometry.attributes.position.array;
      for (let i = 0; i < 200; i++) {
        pos[i * 3] += 6 * dt;
        pos[i * 3 + 1] += Math.sin(time * 2 + i) * dt * 0.4;
        if (pos[i * 3] > 40) { pos[i * 3] = -40; pos[i * 3 + 1] = Math.random() * 12; }
      }
      dust.geometry.attributes.position.needsUpdate = true;
    }
    // Stars twinkle; the sun and moon drift slowly around their phase anchor.
    if (stars.visible) starMat.opacity = 0.5 + Math.sin(time * 2) * 0.3;
    sunMesh.position.set(sunBase.x + Math.sin(time * 0.01) * 8, sunBase.y, sunBase.z);
    moonMesh.position.set(60 + Math.cos(time * 0.01) * 8, 55, -40);
    // Rainbow (v18.9.16): 10s after the rain stops it appears, shows 10s.
    if (rainbowDelay > 0) {
      rainbowDelay -= dt;
      if (rainbowDelay <= 0) { rainbowT = 10; rainbow.visible = true; }
    } else if (rainbowT > 0) {
      rainbowT -= dt;
      rainbow.children.forEach(m => { m.material.opacity = Math.max(0, Math.min(0.5, rainbowT * 0.1)); });
      if (rainbowT <= 0) rainbow.visible = false;
    }
    // Air dust (v18.6.4): 50 motes drifting slowly on every map (off on Low).
    airDust.visible = S.dustOn !== false;
    if (airDust.visible) {
      if (camera && camera.position) {
        const cx = Math.max(-38, Math.min(38, camera.position.x));
        const cz = Math.max(-26, Math.min(26, camera.position.z));
        airDust.position.set(cx, 0, cz);
      }
      const pos = airDust.geometry.attributes.position.array;
      for (let i = 0; i < 50; i++) {
        pos[i * 3] += 0.3 * dt;
        pos[i * 3 + 1] += Math.sin(time * 0.5 + i * 1.7) * dt * 0.15;
        if (pos[i * 3] > 40) { pos[i * 3] = -40; pos[i * 3 + 1] = Math.random() * 10; }
      }
      airDust.geometry.attributes.position.needsUpdate = true;
    }
    // Morning fog balls drift slowly across the garden map.
    if (fogBalls.visible) {
      const pos = fogBalls.geometry.attributes.position.array;
      for (let i = 0; i < 20; i++) {
        pos[i * 3] += dt * 0.4;
        if (pos[i * 3] > 38) pos[i * 3] = -38;
      }
      fogBalls.geometry.attributes.position.needsUpdate = true;
    }
    // Lightning: storm every 3-7s, rain occasionally, ruin map every 2-4s.
    if (def.lightning) {
      boltT -= dt;
      if (boltT <= 0) {
        bolt();
        if (def.lightning === 'storm') boltT = boltRange ? boltRange[0] + Math.random() * (boltRange[1] - boltRange[0]) : 3 + Math.random() * 4;
        else boltT = 15 + Math.random() * 15;
      }
    }
    if (flash > 0) {
      flash = Math.max(0, flash - dt * 2.5);
      world.sun.intensity += (baseSunInt - world.sun.intensity) * Math.min(1, dt * 4);
      if (flashEl) flashEl.style.opacity = String(flash * 0.55);
    } else if (flashEl && flashEl.style.opacity !== '0') {
      flashEl.style.opacity = '0';
    }
  }
  // Day-night cycle: 10 minutes — Day 3m -> Sunset 2m -> Night 3m -> Dawn 2m.
  // The cycle only drives clear/sunset/night/dawn; a manually picked
  // rain/storm/sand/snow/fog weather is never overridden by it.
  function phaseAt(t) {
    let acc = 0;
    for (const ph of CYCLE_PHASES) {
      if (t < acc + ph.dur) return { phase: ph, into: t - acc };
      acc += ph.dur;
    }
    return { phase: CYCLE_PHASES[0], into: 0 };
  }
  function stepCycle(dt) {
    if (!S.cycleOn) return null;
    S.cycleT = (S.cycleT + dt) % CYCLE_LEN;
    const { phase } = phaseAt(S.cycleT);
    if (phase.id !== S.cyclePhase) {
      S.cyclePhase = phase.id;
      if (!S.weatherManual) applyWeather(phase.weather);
    }
    return phase;
  }
  function cycleInfo() {
    const { phase, into } = phaseAt(S.cycleT % CYCLE_LEN);
    const idx = CYCLE_PHASES.indexOf(phase);
    const next = CYCLE_PHASES[(idx + 1) % CYCLE_PHASES.length];
    return {
      phase, next, nextIn: Math.ceil(phase.dur - into),
      progress: (S.cycleT % CYCLE_LEN) / CYCLE_LEN,
      label: `${phase.icon} ${phase.label} (${phase.clock})`,
      countdown: `${next.label} dalam ${Math.floor((phase.dur - into) / 60)}:${String(Math.floor((phase.dur - into) % 60)).padStart(2, '0')}`,
    };
  }
  // Which weather applies now: cycle > random/auto > per-map > manual select.
  function resolveWeather(mapId, rng) {
    if (S.cycleOn && !S.weatherManual) return phaseAt(S.cycleT % CYCLE_LEN).phase.weather;
    if (S.weatherSelect === 'random' || S.weatherAuto) {
      const pool = ['clear', 'sunset', 'night', 'rain', 'storm', 'sand', 'snow', 'fog'];
      return pool[Math.floor((rng ? rng() : Math.random()) * pool.length)];
    }
    if (S.mapWeatherOn) return MAP_WEATHER[mapId] || 'clear';
    return S.weatherSelect || 'clear';
  }
  return {
    applyWeather, applyMapWeather, animateWeather, stepCycle, cycleInfo, resolveWeather, phaseAt,
    rainPos: () => ({ x: rain.position.x, z: rain.position.z, visible: rain.visible }),
    sunVisible: () => sunMesh.visible, // lens flare only when the sun is up
  };
}
