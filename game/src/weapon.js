// Weapons: three originals. Fire / reload / spread / recoil. Raycast vs bot hitboxes.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const _dir = new THREE.Vector3();
const _cam = new THREE.Vector3();

export function createWeapon(scene, camera, S, audio) {
  const ray = new THREE.Raycaster();
  ray.far = 120;
  // Simple gun viewmodel attached to the camera
  const gun = new THREE.Group();
  const bodyM = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.5, metalness: 0.5 });
  const accentM = new THREE.MeshStandardMaterial({ color: PALETTE.amber, roughness: 0.5, metalness: 0.3 });
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.34), bodyM);
  barrel.position.set(0, -0.01, -0.28);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.2), bodyM);
  stock.position.set(0, -0.02, 0.02);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.05), accentM);
  sight.position.set(0, 0.035, -0.12);
  gun.add(barrel, stock, sight);
  gun.scale.setScalar(0.55);
  gun.position.set(0.22, -0.2, -0.8);
  camera.add(gun);
  scene.add(camera);

  function cur() { return S.weapons[S.player.weaponIdx]; }
  function spread() {
    const w = cur(), p = S.player;
    let s = w.spread;
    if (p.moving) s *= 1.9;
    if (p.crouched) s *= 0.6;
    if (!p.onGround) s *= 2.2;
    return s + p.spreadBloom;
  }
  function ready() {
    const w = cur();
    return S.phase === 'playing' && S.player.alive && !w.reloading &&
      S.time - w.lastShot >= w.rate && w.mag > 0;
  }
  function reload() {
    const w = cur();
    if (w.reloading || w.mag >= w.magSize || w.reserve <= 0) return;
    w.reloading = true; w.reloadT = w.reload;
    audio.reload();
  }
  function step(dt) {
    const w = cur();
    if (w.reloading) {
      w.reloadT -= dt;
      if (w.reloadT <= 0) {
        const need = w.magSize - w.mag, take = Math.min(need, w.reserve);
        w.mag += take; w.reserve -= take; w.reloading = false;
      }
    }
    // Viewmodel bob + ADS position
    const t = S.time;
    const bob = S.player.moving && S.player.onGround ? Math.sin(t * 11) * 0.012 : 0;
    gun.position.x += ((S.ads ? 0.0 : 0.22) - gun.position.x) * Math.min(1, dt * 12);
    gun.position.y += ((S.ads ? -0.16 : -0.2 + bob) - gun.position.y) * Math.min(1, dt * 12);
  }
  // Fire one shot. hitMeshes: bot body/head meshes. Returns {hit, head, bot} or null.
  function fire(hitMeshes, shootables, rng, onHit) {
    const w = cur();
    if (!ready()) { if (w.mag === 0 && !w.reloading) reload(); return null; }
    w.lastShot = S.time; w.mag -= 1; S.shotsFired += 1;
    camera.getWorldPosition(_cam);
    camera.getWorldDirection(_dir);
    const sp = spread();
    _dir.x += (rng() * 2 - 1) * sp; _dir.y += (rng() * 2 - 1) * sp; _dir.z += (rng() * 2 - 1) * sp;
    _dir.normalize();
    ray.set(_cam, _dir);
    const targets = ray.intersectObjects(hitMeshes.concat(shootables), false);
    const hit = targets[0] || null;
    let result = null;
    if (hit && hit.object.userData.botId !== undefined) {
      const bot = S.bots[hit.object.userData.botId];
      const head = hit.object.userData.part === 'head';
      result = { hit: true, head, bot, point: hit.point };
      onHit && onHit(bot, head, w);
    }
    S.player.spreadBloom = Math.min(0.05, S.player.spreadBloom + (w.id === 'lr50' ? 0.04 : 0.008));
    audio.shot(w.id);
    return result;
  }
  return { cur, ready, reload, step, fire, spread, gun };
}
