// Zombie Mode: waves 1-20. Zombies walk to the player and melee-attack.
// Boss every 5 waves. +50 coins per kill. Next wave 5s after the last one falls.
// Local single-player only — the zombies are NOT the regular bots.
import * as THREE from 'three';

function hpSprite(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const tex = new THREE.CanvasTexture(canvas);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  spr.scale.set(1.6, 0.4, 1);
  const draw = (hp, maxHp) => {
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, 256, 64);
    g.font = 'bold 24px sans-serif';
    g.textAlign = 'center';
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(28, 2, 200, 28);
    g.fillStyle = '#aaffaa';
    g.fillText(name, 128, 25);
    const f = Math.max(0, hp / maxHp);
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(28, 36, 200, 14);
    g.fillStyle = f > 0.6 ? '#33cc44' : f > 0.3 ? '#ffcc22' : '#ff3333';
    g.fillRect(30, 38, 196 * f, 10);
    tex.needsUpdate = true;
  };
  draw(100, 100);
  return { sprite: spr, draw };
}

export function createZombies(scene, world, S, rng) {
  // Pack-a-Punch + Perk-a-Cola (v23.0.9): bought with in-match cash
  // (S.economy.money). PaP doubles one weapon's damage; colas are
  // persistent zombie-mode buffs. Machines are simple glowing boxes
  // placed by buildMachines() on start().
  const PAP = { x: 0, z: -24, cost: 5000 };
  const COLAS = {
    juggernog: { x: -20, z: -20, cost: 2500, name: 'Juggernog', desc: '+50 max HP', color: 0xff4444 },
    speed: { x: 20, z: -20, cost: 3000, name: 'Speed Cola', desc: 'reload 30% faster', color: 0x44ff88 },
    doubletap: { x: -20, z: 20, cost: 2000, name: 'Double Tap', desc: 'fire rate 20% faster', color: 0xffcc44 },
    quickrevive: { x: 20, z: 20, cost: 1500, name: 'Quick Revive', desc: 'self-revive once', color: 0x66ccff },
  };
  let machines = [];
  function buildMachines() {
    for (const m of machines) scene.remove(m);
    machines = [];
    const mk = (x, z, color, label) => {
      const g = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 }));
      box.position.y = 1.1; g.add(box);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.1),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 }));
      glow.position.set(0, 1.7, 0.45); g.add(glow);
      g.position.set(x, 0, z); g.userData.label = label;
      scene.add(g); machines.push(g);
      return g;
    };
    mk(PAP.x, PAP.z, 0xaa44ff, 'PACK-A-PUNCH');
    for (const [id, c] of Object.entries(COLAS)) mk(c.x, c.z, c.color, c.name.toUpperCase());
  }
  // Nearest machine within 2.5m, or null. Main.js calls this on E.
  function nearestMachine(x, z) {
    const dp = Math.hypot(x - PAP.x, z - PAP.z);
    if (dp < 2.5) return { kind: 'pap', cost: PAP.cost, name: 'Pack-a-Punch', desc: 'weapon damage x2 ($5000)' };
    for (const [id, c] of Object.entries(COLAS)) {
      if (Math.hypot(x - c.x, z - c.z) < 2.5) return { kind: 'cola', id, cost: c.cost, name: c.name, desc: c.desc };
    }
    return null;
  }
  // Buy the machine the player stands near. Returns a message string.
  function buyMachine(m, weaponId) {
    if (!m) return null;
    if (S.economy.money < m.cost) return `💰 Butuh $${m.cost} (punya $${S.economy.money})`;
    if (m.kind === 'pap') {
      if (S.papWeapons.includes(weaponId)) return '⚡ Senjata ini sudah Pack-a-Punch!';
      S.economy.money -= m.cost;
      S.papWeapons.push(weaponId);
      return '⚡ PACK-A-PUNCH! Damage senjata x2';
    }
    if (S.perkCola.includes(m.id)) return `🥤 ${m.name} sudah dibeli!`;
    S.economy.money -= m.cost;
    S.perkCola.push(m.id);
    if (m.id === 'juggernog') { S.maxHp = 150; S.player.hp = Math.min(S.maxHp, S.player.hp + 50); }
    return `🥤 ${m.name} — ${m.desc}`;
  }
  const group = new THREE.Group(); scene.add(group);
  const zombies = [];
  let wave = 0, intermissionT = 0, started = false, done = false;
  let nextId = 0;

  function makeZombie(isBoss) {
    const g = new THREE.Group();
    const green = new THREE.MeshStandardMaterial({ color: isBoss ? 0x2a4a1a : 0x4a7a2a, roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a22, roughness: 0.9 });
    const skinM = new THREE.MeshStandardMaterial({ color: 0x5a8a3a, roughness: 0.8 });
    const mk = (w, h, d, m, x, y, z) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); q.position.set(x, y, z); q.castShadow = true; g.add(q); return q; };
    // Legs + torso (torn clothes) + arms stretched forward.
    mk(0.22, 0.78, 0.22, dark, -0.14, 0.39, 0);
    mk(0.22, 0.78, 0.22, dark, 0.14, 0.39, 0);
    const chest = mk(0.62, 0.72, 0.34, green, 0, 1.14, 0);
    const armL = mk(0.16, 0.62, 0.16, skinM, -0.38, 1.35, -0.25);
    const armR = mk(0.16, 0.62, 0.16, skinM, 0.38, 1.35, -0.25);
    armL.rotation.x = -1.4; armR.rotation.x = -1.4; // arms forward, reaching
    const head = mk(0.34, 0.34, 0.34, skinM, 0, 1.67, 0);
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    for (const ex of [-0.08, 0.08]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.02), eyeM);
      eye.position.set(ex, 1.7, -0.18); g.add(eye);
    }
    if (isBoss) {
      const aura = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.7), new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false }));
      aura.position.y = 1.0; g.add(aura);
      g.scale.setScalar(1.5);
    }
    const tag = hpSprite(isBoss ? '👑 BOSS' : '🧟 ZOMBIE');
    tag.sprite.position.y = 2.3;
    g.add(tag.sprite);
    return { group: g, body: chest, head, tag };
  }

  function spawnAtEdge() {
    for (let tries = 0; tries < 12; tries++) {
      const x = (rng() * 2 - 1) * 36, z = (rng() * 2 - 1) * 24;
      if (Math.abs(x) < 12 && Math.abs(z) < 12) continue; // not on top of the player
      if (!world.isColliding(x, z, 0.4, 0)) return { x, z };
    }
    return { x: 0, z: -24 };
  }
  function spawnWave(n) {
    wave = n;
    const count = 5 + n * 3;
    for (let i = 0; i < count; i++) {
      const sp = spawnAtEdge();
      const hp = 100 + n * 50;
      const mesh = makeZombie(false);
      group.add(mesh.group);
      const z = {
        id: nextId++, kind: 'zombie', x: sp.x, z: sp.z, yaw: 0,
        hp, maxHp: hp, alive: true, isBoss: false,
        speed: Math.min(3.5, 1.5 + n * 0.15),
        dmg: 8 + n * 2, atkT: 0, mesh,
      };
      mesh.body.userData = { zombieId: z.id, part: 'body' };
      mesh.head.userData = { zombieId: z.id, part: 'head' };
      zombies.push(z);
    }
    if (n % 5 === 0) {
      const sp = spawnAtEdge();
      const hp = 2000 + n * 500;
      const mesh = makeZombie(true);
      group.add(mesh.group);
      const z = {
        id: nextId++, kind: 'zombie', x: sp.x, z: sp.z, yaw: 0,
        hp, maxHp: hp, alive: true, isBoss: true,
        speed: 2.0, dmg: 30, atkT: 0, mesh,
      };
      mesh.body.userData = { zombieId: z.id, part: 'body' };
      mesh.head.userData = { zombieId: z.id, part: 'head' };
      zombies.push(z);
    }
    syncMeshes();
  }
  function start() {
    for (const z of zombies) group.remove(z.mesh.group);
    zombies.length = 0;
    wave = 0; intermissionT = 0; started = true; done = false;
    S.papWeapons = []; S.perkCola = []; S.maxHp = 100;
    buildMachines();
    spawnWave(1);
  }
  function syncMeshes() {
    for (const z of zombies) {
      z.mesh.group.position.set(z.x, 0, z.z);
      z.mesh.group.rotation.y = z.yaw;
      z.mesh.group.visible = z.alive;
    }
  }
  function hitMeshes() {
    const out = [];
    for (const z of zombies) if (z.alive) out.push(z.mesh.body, z.mesh.head);
    return out;
  }
  function damage(z, dmg) {
    if (!z.alive) return false;
    z.hp -= dmg;
    z.mesh.tag.draw(z.hp, z.maxHp);
    if (z.hp <= 0) {
      z.hp = 0; z.alive = false; z.mesh.group.visible = false;
      return true;
    }
    return false;
  }
  function aliveCount() { return zombies.filter(z => z.alive).length; }
  function step(dt, onPlayerHit) {
    if (!started || done) return;
    const p = S.player;
    if (intermissionT > 0) {
      intermissionT -= dt;
      if (intermissionT <= 0) {
        if (wave >= 20) { done = true; return; }
        spawnWave(wave + 1);
      }
      return;
    }
    for (const z of zombies) {
      if (!z.alive) continue;
      const d = Math.hypot(p.x - z.x, p.z - z.z);
      z.yaw = Math.atan2(-(p.x - z.x), -(p.z - z.z));
      if (d < 1.6) {
        z.atkT -= dt;
        if (z.atkT <= 0) {
          z.atkT = 1;
          if (p.alive) onPlayerHit && onPlayerHit(z.dmg, null);
        }
      } else {
        // Walk to the player, axis-separated so zombies slide along walls.
        const dx = p.x - z.x, dz = p.z - z.z, dd = Math.hypot(dx, dz) || 1;
        const mx = dx / dd * z.speed * dt, mz = dz / dd * z.speed * dt;
        if (!world.isColliding(z.x + mx, z.z, 0.4, 0)) z.x += mx;
        if (!world.isColliding(z.x, z.z + mz, 0.4, 0)) z.z += mz;
        // Shamble: arms sway, body bobs.
        z.mesh.group.position.y = Math.abs(Math.sin(S.time * 5 + z.id)) * 0.06;
      }
    }
    syncMeshes();
    if (aliveCount() === 0) intermissionT = 5;
  }
  return {
    start, step, damage, hitMeshes, aliveCount, syncMeshes, zombies,
    nearestMachine, buyMachine, PAP, COLAS,
    get wave() { return wave; },
    get intermissionT() { return intermissionT; },
    get done() { return done; },
    get started() { return started; },
  };
}
