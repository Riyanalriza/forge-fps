// Vehicles: car, heli, moto, tank, boat, jetski, bike, drone, truck, bus,
// police, ambulance, firetruck. Enter F (<3m), exit G. Drive W/S + A/D.
// Local single-player; everything moves in the main animate loop — no
// per-vehicle setInterval. Fuel, lights, horn, radio, drift, wheelie,
// heli flight + rockets, tank turret + cannon (v22.4).
import * as THREE from 'three';

export const VEHICLE_DEFS = {
  car: { name: 'Mobil', icon: '🚗', price: 1500, speed: 12, turn: 1.8, radius: 1.1, eye: 1.9, hp: 100, color: 0x8a2a2a, size: [2.0, 0.55, 4.2] },
  heli: { name: 'Helikopter', icon: '🚁', price: 2500, speed: 13, turn: 2.2, radius: 1.4, eye: 2.4, hp: 500, color: 0x2a4a2a, size: [1.8, 1.2, 3.6] },
  moto: { name: 'Motor', icon: '🏍️', price: 1200, speed: 15, turn: 2.4, radius: 0.7, eye: 1.5, hp: 60, color: 0x1a3a6a, size: [0.5, 0.5, 1.9] },
  tank: { name: 'Tank', icon: '🛡️', price: 5000, speed: 7, turn: 1.2, radius: 1.6, eye: 2.2, hp: 1000, color: 0x3a4a2a, size: [2.6, 0.8, 4.4] },
  boat: { name: 'Perahu', icon: '⛵', price: 1800, speed: 9, turn: 1.5, radius: 1.2, eye: 1.8, hp: 80, color: 0x6a4a2a, size: [1.8, 0.7, 4.0] },
  jetski: { name: 'Jetski', icon: '🌊', price: 2200, speed: 18, turn: 2.6, radius: 0.8, eye: 1.4, hp: 60, color: 0x2a6a8a, size: [0.9, 0.5, 2.4] },
  bike: { name: 'Sepeda', icon: '🚲', price: 600, speed: 8, turn: 2.0, radius: 0.6, eye: 1.5, hp: 40, color: 0x8a8a2a, size: [0.4, 0.5, 1.8] },
  drone: { name: 'Drone', icon: '🛸', price: 3000, speed: 10, turn: 2.0, radius: 0.7, eye: 8.0, hp: 50, color: 0x4a4a4a, size: [1.2, 0.3, 1.2] },
  truck: { name: 'Truk', icon: '🚚', price: 2800, speed: 10, turn: 1.4, radius: 1.5, eye: 2.2, hp: 150, color: 0x2a5a8a, size: [2.2, 0.9, 6.0] },
  bus: { name: 'Bus', icon: '🚌', price: 3200, speed: 9, turn: 1.3, radius: 1.6, eye: 2.3, hp: 180, color: 0xc8a02a, size: [2.4, 1.2, 7.0] },
  police: { name: 'Mobil Polisi', icon: '🚓', price: 3500, speed: 14, turn: 2.0, radius: 1.1, eye: 1.9, hp: 120, color: 0x222a3a, size: [2.0, 0.55, 4.2] },
  ambulance: { name: 'Ambulans', icon: '🚑', price: 3500, speed: 12, turn: 1.8, radius: 1.2, eye: 2.0, hp: 120, color: 0xe8e8e8, size: [2.2, 0.9, 5.0] },
  firetruck: { name: 'Pemadam', icon: '🚒', price: 4000, speed: 10, turn: 1.4, radius: 1.5, eye: 2.2, hp: 200, color: 0xa02020, size: [2.4, 1.0, 6.4] },
};
export const VEHICLE_IDS = Object.keys(VEHICLE_DEFS);
// Spawn spots per map (open ground, checked by the self-test).
const SPOTS = {
  foundry: { car: [-30, 20], heli: [30, -20], moto: [0, -24], tank: [-14, -22] },
  twin: { car: [0, -12], heli: [-28, -18], moto: [28, 18], tank: [24, -20] },
  ember: { car: [-20, 8], heli: [20, -8], moto: [0, 20], tank: [-26, -16] },
  iron: { car: [-28, 14], heli: [28, -14], moto: [0, 22], tank: [26, 20] },
  cargo: { car: [0, -18], heli: [-30, -20], moto: [30, 20], tank: [-20, 22] },
  harvest: { car: [-24, -14], heli: [24, 14], moto: [0, -22], tank: [20, -20] },
  ruin: { car: [26, 18], heli: [-26, -18], moto: [0, 20], tank: [-24, 20] },
};
// Fallback ring spots for the extra vehicle types (boat, jetski, bike,
// drone, truck, bus, police, ambulance, firetruck).
const EXTRA_SPOTS = [[-34, 0], [34, 0], [0, 24], [-10, 24], [10, -24], [-34, 22], [34, 22], [-20, -24], [20, 24]];

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true;
  return m;
}

export function createVehicles(scene, world, S, audio = null, effects = null, cbs = {}) {
  const group = new THREE.Group(); scene.add(group);
  const glassM = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.2, metalness: 0.6 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.7 });
  const list = [];
  let gas = { x: 34, z: 20 }; // SPBU position for the current map (v22.4.1)

  function mat(color) { return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.4 }); }
  function addWheels(g, spots) {
    for (const [x, z] of spots) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 10), darkM);
      w.rotation.z = Math.PI / 2; w.position.set(x, 0.36, z); w.castShadow = true;
      g.add(w);
      g.userData.wheels = (g.userData.wheels || []).concat(w);
    }
  }
  function build(type) {
    const def = VEHICLE_DEFS[type];
    const [w, h, d] = def.size;
    const g = new THREE.Group();
    const bodyM = mat(def.color);
    g.userData.bodyM = bodyM; // v24.1.5: recolor(type, hex) tints the paint
    if (type === 'heli' || type === 'drone') {
      g.add(box(w, h, d, bodyM, 0, 1.0, 0));
      if (type === 'heli') {
        g.add(box(1.4, 0.7, 1.2, glassM, 0, 1.1, -1.2));
        g.add(box(0.4, 0.4, 2.4, darkM, 0, 1.1, 2.6));
        const rotor = new THREE.Group();
        rotor.position.y = 1.75;
        rotor.add(box(3.6, 0.06, 0.18, darkM));
        rotor.add(box(0.18, 0.06, 3.6, darkM));
        g.add(rotor);
        g.userData.rotor = rotor;
        g.add(box(0.06, 0.5, 0.06, darkM, 0, 1.3, 3.7));
      } else {
        const rotor = new THREE.Group();
        rotor.position.y = 0.35;
        rotor.add(box(1.6, 0.04, 0.12, darkM));
        rotor.add(box(0.12, 0.04, 1.6, darkM));
        g.add(rotor);
        g.userData.rotor = rotor;
        const cam = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x220000 }));
        cam.position.set(0, 0.1, 0.6); g.add(cam);
      }
      return g;
    }
    if (type === 'tank') {
      g.add(box(w, h, d, bodyM, 0, 0.55, 0));
      const turret = new THREE.Group();
      turret.position.set(0, 1.0, 0);
      turret.add(box(1.4, 0.5, 1.8, bodyM, 0, 0.25, 0));
      turret.add(box(0.18, 0.18, 2.6, darkM, 0, 0.3, -1.6)); // cannon barrel
      g.add(turret);
      g.userData.turret = turret;
      addWheels(g, [[-1.2, 1.4], [1.2, 1.4], [-1.2, -1.4], [1.2, -1.4]]);
      return g;
    }
    if (type === 'moto' || type === 'jetski' || type === 'bike') {
      g.add(box(w, h, d, bodyM, 0, 0.7, 0));
      g.add(box(w * 0.8, 0.25, 0.6, darkM, 0, 1.0, 0.3));
      for (const z of [d / 2 - 0.2, -(d / 2 - 0.2)]) {
        const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.14, 10), darkM);
        wh.rotation.z = Math.PI / 2; wh.position.set(0, 0.34, z); wh.castShadow = true;
        g.add(wh);
        g.userData.wheels = (g.userData.wheels || []).concat(wh);
      }
      if (type === 'moto') g.add(box(0.7, 0.05, 0.05, darkM, 0, 1.05, -0.8));
      return g;
    }
    // car / boat / truck / bus / police / ambulance / firetruck: body + cabin
    g.add(box(w, h, d, bodyM, 0, 0.55, 0));
    g.add(box(w * 0.85, 0.5, d * 0.5, glassM, 0, 1.05, -0.2));
    addWheels(g, [[-w / 2 + 0.15, d / 2 - 0.7], [w / 2 - 0.15, d / 2 - 0.7], [-w / 2 + 0.15, -(d / 2 - 0.7)], [w / 2 - 0.15, -(d / 2 - 0.7)]]);
    if (type === 'police') {
      const strobe = new THREE.Group();
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 }));
      r.position.set(-0.25, 1.35, 0);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x0000ff, emissive: 0x0000ff }));
      b.position.set(0.25, 1.35, 0);
      strobe.add(r, b);
      g.add(strobe);
      g.userData.strobe = { r, b };
      const light = new THREE.PointLight(0xff0000, 0, 10);
      light.position.set(0, 2, 0); g.add(light);
      g.userData.strobeLight = light;
    }
    if (type === 'firetruck') g.add(box(1.6, 0.7, 2.0, new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.7 }), 0, 1.2, 1.4));
    if (type === 'ambulance') {
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.05),
        new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0x880000 }));
      cross.position.set(0, 1.1, d / 2 + 0.03); g.add(cross);
    }
    // Headlights (car/police/ambulance/firetruck/truck/bus): one PointLight
    // toggled with L while driving (v22.4.2).
    const head = new THREE.PointLight(0xfff2cc, 0, 14);
    head.position.set(0, 0.8, -d / 2 - 0.5); g.add(head);
    g.userData.headlight = head;
    return g;
  }
  for (const type of VEHICLE_IDS) {
    const mesh = build(type);
    mesh.traverse(o => { if (o.isMesh) { o.userData.vehicleType = type; } });
    group.add(mesh);
    list.push({ type, x: 0, z: 0, yaw: 0, speed: 0, alt: 0, mesh, fuel: 100, hp: VEHICLE_DEFS[type].hp, lightsOn: false, cannonT: 0, rocketT: 0, wheelieT: 0, drifting: false, turretYaw: 0, dead: false });
  }
  // SPBU (gas station) visual: canopy + 2 pumps, placed per map (v22.4.1).
  const gasGroup = new THREE.Group();
  gasGroup.add(box(6, 0.3, 4, new THREE.MeshStandardMaterial({ color: 0xd83a2a, roughness: 0.5 }), 0, 3.2, 0));
  for (const x of [-2.6, 2.6]) gasGroup.add(box(0.25, 3.2, 0.25, darkM, x, 1.6, -1.8));
  for (const x of [-1, 1]) gasGroup.add(box(0.7, 1.4, 0.5, new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4 }), x, 0.7, 0));
  group.add(gasGroup);

  // Find a clear spot near (x,z): the named spot may sit inside a prop
  // (container, house) on some maps, so spiral out until it is clear.
  function findClear(x, z, r) {
    if (!world.isColliding(x, z, r, 0)) return [x, z];
    for (let ring = 1; ring <= 8; ring++) {
      const d = ring * 2;
      for (let a = 0; a < 8; a++) {
        const ang = a * Math.PI / 4;
        const nx = x + Math.cos(ang) * d, nz = z + Math.sin(ang) * d;
        if (Math.abs(nx) > 38 || Math.abs(nz) > 26) continue;
        if (!world.isColliding(nx, nz, r, 0)) return [nx, nz];
      }
    }
    return [x, z]; // give up: keep the named spot
  }
  function place(mapId) {
    const spots = SPOTS[mapId] || SPOTS.foundry;
    let extra = 0;
    for (const v of list) {
      let sp = spots[v.type];
      if (!sp) { sp = EXTRA_SPOTS[extra++ % EXTRA_SPOTS.length]; }
      const def = VEHICLE_DEFS[v.type];
      const [x, z] = findClear(sp[0], sp[1], Math.max(def.radius, 1.2));
      v.x = x; v.z = z; v.yaw = 0; v.speed = 0; v.alt = 0;
      v.fuel = 100; v.hp = def.hp; v.dead = false; v.lightsOn = false;
      v.cannonT = 0; v.rocketT = 0; v.wheelieT = 0; v.turretYaw = 0;
      v.mesh.position.set(v.x, 0, v.z);
      v.mesh.rotation.set(0, 0, 0);
      v.mesh.visible = true;
      if (v.mesh.userData.headlight) v.mesh.userData.headlight.intensity = 0;
    }
    const [gx, gz] = findClear(34, 20, 3);
    gas = { x: gx, z: gz };
    gasGroup.position.set(gx, 0, gz);
    if (S.vehicle) S.vehicle = null; // leaving a map drops you out
    S.driving = false;
    S.droneMark = false;
  }
  function nearest(x, z, r) {
    let best = null, bestD = r;
    for (const v of list) {
      if (v.dead) continue;
      const d = Math.hypot(v.x - x, v.z - z);
      if (d < bestD) { bestD = d; best = v; }
    }
    return best;
  }
  function nearestGas(x, z, r) {
    return Math.hypot(gas.x - x, gas.z - z) < r ? gas : null;
  }
  // Refuel at the SPBU: 100 coin for a full tank (v22.4.1). spend(n) must
  // return true when the coins were actually taken.
  function refuel(spend) {
    const v = S.vehicle && S.vehicle.ref;
    if (!v || !nearestGas(S.player.x, S.player.z, 4)) return false;
    if (v.fuel >= 100) return false;
    if (spend && !spend(100)) return false;
    v.fuel = 100;
    if (audio && audio.coin) audio.coin();
    return true;
  }
  function enter() {
    const v = nearest(S.player.x, S.player.z, 3);
    if (!v) return false;
    S.vehicle = { ref: v };
    S.driving = true;
    v.speed = 0;
    if (v.type === 'drone') { v.alt = 8; S.droneMark = true; }
    if (audio && audio.vehicleHum) audio.vehicleHum(true); // engine hum on
    if (audio && audio.vehicleDoor) audio.vehicleDoor();
    return true;
  }
  function exit() {
    if (!S.vehicle) return false;
    const v = S.vehicle.ref;
    S.vehicle = null;
    S.driving = false;
    S.droneMark = false;
    if (v.type === 'drone') v.alt = 0;
    if (audio && audio.vehicleHum) audio.vehicleHum(false); // engine hum off
    if (audio && audio.vehicleDoor) audio.vehicleDoor();
    return true;
  }
  function toggleLights() {
    const v = S.vehicle && S.vehicle.ref;
    if (!v || !v.mesh.userData.headlight) return false;
    v.lightsOn = !v.lightsOn;
    v.mesh.userData.headlight.intensity = v.lightsOn ? 6 : 0;
    return v.lightsOn;
  }
  function horn() {
    if (!S.vehicle) return false;
    if (audio && audio.horn) audio.horn();
    return true;
  }
  function radio() {
    if (!S.vehicle) return false;
    if (audio && audio.radioJingle) audio.radioJingle();
    return true;
  }
  function explodeVehicle(v) {
    v.dead = true;
    v.mesh.visible = false;
    if (effects && effects.explosion) effects.explosion({ x: v.x, y: 1, z: v.z }, true);
    if (S.vehicle && S.vehicle.ref === v) { S.vehicle = null; S.driving = false; if (audio && audio.vehicleHum) audio.vehicleHum(false); }
    if (cbs.onBlast) cbs.onBlast(v.x, v.z, 5, 120);
  }
  function damageVehicle(v, dmg) {
    if (!v || v.dead) return false;
    v.hp -= dmg;
    if (v.hp <= 0) { explodeVehicle(v); return true; }
    return false;
  }
  function hitMeshes() {
    const out = [];
    for (const v of list) {
      if (v.dead) continue;
      v.mesh.traverse(o => { if (o.isMesh) { o.userData.vehicleRef = v; out.push(o); } });
    }
    return out;
  }
  function step(dt, keys) {
    const cur = S.vehicle;
    // Ambulance heal aura: +5 HP/s to the player within 4m (v22.4.6).
    for (const v of list) {
      if (v.type !== 'ambulance' || v.dead) continue;
      if (Math.hypot(v.x - S.player.x, v.z - S.player.z) < 4 && S.player.hp < 100) {
        S.player.hp = Math.min(100, S.player.hp + 5 * dt);
      }
    }
    if (!cur) return;
    const v = cur.ref, def = VEHICLE_DEFS[v.type];
    if (v.dead) { exit(); return; }
    const hasFuel = v.fuel > 0 || v.type === 'bike';
    let throttle = 0;
    if (keys.has('KeyW')) throttle = 1;
    if (keys.has('KeyS')) throttle = -0.5;
    if (!hasFuel) throttle = 0;
    // Tank turret: Q/E rotate while driving (v22.4.5).
    if (v.type === 'tank') {
      if (keys.has('KeyQ')) v.turretYaw += 1.6 * dt;
      if (keys.has('KeyE')) v.turretYaw -= 1.6 * dt;
      if (v.mesh.userData.turret) v.mesh.userData.turret.rotation.y = v.turretYaw;
    }
    // Heli flight (v22.4.4): W climbs + flies forward, S descends.
    if (v.type === 'heli') {
      if (keys.has('KeyW')) v.alt = Math.min(18, v.alt + 4 * dt);
      if (keys.has('KeyS')) v.alt = Math.max(0, v.alt - 4 * dt);
      throttle = v.alt > 1 ? 0.7 : 0;
      v.rocketT = Math.max(0, v.rocketT - dt);
      if (keys.has('Space') && v.rocketT <= 0 && cbs.onBlast) {
        v.rocketT = 1;
        const rx = v.x - Math.sin(v.yaw) * 30, rz = v.z - Math.cos(v.yaw) * 30;
        if (effects && effects.explosion) effects.explosion({ x: rx, y: 1, z: rz }, false);
        cbs.onBlast(rx, rz, 5, 120);
        if (audio && audio.rocket) audio.rocket();
      }
    }
    // Tank cannon (v22.4.5): Space fires, 3s reload.
    if (v.type === 'tank') {
      v.cannonT = Math.max(0, v.cannonT - dt);
      if (keys.has('Space') && v.cannonT <= 0 && cbs.onBlast) {
        v.cannonT = 3;
        const a = v.yaw + v.turretYaw;
        const rx = v.x - Math.sin(a) * 45, rz = v.z - Math.cos(a) * 45;
        if (effects && effects.explosion) effects.explosion({ x: rx, y: 1, z: rz }, true);
        cbs.onBlast(rx, rz, 6, 150);
        if (audio && audio.cannon) audio.cannon();
      }
    }
    // Firetruck water spray (v22.4.6): Space sprays water ahead.
    if (v.type === 'firetruck' && keys.has('Space') && effects && effects.splash) {
      const sx = v.x - Math.sin(v.yaw) * 6, sz = v.z - Math.cos(v.yaw) * 6;
      effects.splash({ x: sx, y: 0.5, z: sz });
    }
    // Drift (v22.4.2): Space + turn in the car = tire smoke + sharper turn.
    v.drifting = false;
    if (v.type === 'car' && keys.has('Space') && Math.abs(v.speed) > 4 && (keys.has('KeyA') || keys.has('KeyD'))) {
      v.drifting = true;
      if (effects && effects.tireTrack) {
        const bx = v.x + Math.sin(v.yaw) * 1.6, bz = v.z + Math.cos(v.yaw) * 1.6;
        effects.tireTrack(bx, bz, v.yaw);
      }
    }
    // Motor wheelie (v22.4.3): Space lifts the front wheel for 0.8s.
    if (v.type === 'moto' && keys.has('Space') && v.wheelieT <= 0 && Math.abs(v.speed) > 3) {
      v.wheelieT = 0.8;
      if (effects && effects.smokePuff) effects.smokePuff(v.x, 0.5, v.z);
    }
    v.wheelieT = Math.max(0, v.wheelieT - dt);
    const dir = throttle >= 0 ? 1 : -1;
    const turnRate = def.turn * (v.drifting ? 1.6 : 1);
    if (keys.has('KeyA')) v.yaw += turnRate * dt * dir;
    if (keys.has('KeyD')) v.yaw -= turnRate * dt * dir;
    v.speed += (throttle * def.speed - v.speed) * Math.min(1, dt * 2);
    if (hasFuel && Math.abs(v.speed) > 0.5) v.fuel = Math.max(0, v.fuel - 1.2 * dt);
    const nx = v.x - Math.sin(v.yaw) * v.speed * dt;
    const nz = v.z - Math.cos(v.yaw) * v.speed * dt;
    const hitWall = world.isColliding(nx, v.z, def.radius, 0) || world.isColliding(v.x, nz, def.radius, 0);
    if (!world.isColliding(nx, v.z, def.radius, 0)) v.x = nx;
    else { if (Math.abs(v.speed) > 6) { v.hp -= 8; if (audio && audio.crash) audio.crash(); } v.speed *= v.type === 'tank' ? 0.9 : 0.5; }
    if (!world.isColliding(v.x, nz, def.radius, 0)) v.z = nz;
    else { if (Math.abs(v.speed) > 6) { v.hp -= 8; if (audio && audio.crash) audio.crash(); } v.speed *= v.type === 'tank' ? 0.9 : 0.5; }
    if (v.hp <= 0) { explodeVehicle(v); return; }
    void hitWall;
    v.mesh.position.set(v.x, v.alt, v.z);
    v.mesh.rotation.y = v.yaw;
    v.mesh.rotation.x = v.wheelieT > 0 ? -0.35 : 0;
    // Tire tracks behind a driven vehicle (v18.9.11), every 0.35s.
    v._trackT = (v._trackT || 0) - dt;
    if (Math.abs(v.speed) > 3 && v._trackT <= 0 && effects && effects.tireTrack && v.type !== 'heli' && v.type !== 'drone') {
      v._trackT = 0.35;
      const bx = v.x + Math.sin(v.yaw) * 1.2, bz = v.z + Math.cos(v.yaw) * 1.2;
      effects.tireTrack(bx, bz, v.yaw);
    }
    // The player rides along.
    S.player.x = v.x; S.player.z = v.z;
    S.player.yaw = v.yaw;
    S.player.y = v.type === 'heli' ? v.alt : (v.type === 'drone' ? 8 : 0);
  }
  function animate(dt, time) {
    for (const v of list) {
      if (v.mesh.userData.rotor) v.mesh.userData.rotor.rotation.y += dt * 18;
      if (v.mesh.userData.wheels) {
        for (const w of v.mesh.userData.wheels) w.rotation.x += (v.speed || 0) * dt * 2;
      }
      if (v.type === 'boat' || v.type === 'jetski') {
        if (!S.vehicle || S.vehicle.ref !== v) v.mesh.position.y = Math.sin(time * 1.2 + v.x) * 0.12;
      }
      if (v.type === 'police' && v.mesh.userData.strobe) {
        const on = Math.floor(time * 4) % 2 === 0;
        v.mesh.userData.strobe.r.material.emissiveIntensity = on ? 2 : 0.2;
        v.mesh.userData.strobe.b.material.emissiveIntensity = on ? 0.2 : 2;
        if (v.mesh.userData.strobeLight) {
          v.mesh.userData.strobeLight.color.setHex(on ? 0xff0000 : 0x0000ff);
          v.mesh.userData.strobeLight.intensity = 3;
        }
      }
    }
  }
  // v24.1.5: recolor every vehicle of a type (parked + driven). Real change:
  // the body material color is set on the live meshes.
  function recolor(type, hex) {
    for (const v of list) {
      if (v.type !== type) continue;
      const m = v.mesh.userData.bodyM;
      if (m) m.color.set(hex);
    }
  }
  return { list, place, nearest, nearestGas, refuel, enter, exit, step, animate, toggleLights, horn, radio, damageVehicle, hitMeshes, recolor, gasPos: () => gas };
}
