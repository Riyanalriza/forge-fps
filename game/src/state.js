// ONE state object: everything mutable lives here. Modules read/write it.
export function createState(rng) {
  return {
    rng, time: 0, seed: 1,
    phase: 'menu', // menu | playing | roundEnd | matchEnd
    round: { num: 1, wins: 0, losses: 0, timer: 100, maxRounds: 5, winAt: 3, result: '' },
    player: {
      x: 0, y: 0, z: 24, yaw: 0, pitch: 0, vx: 0, vz: 0,
      eye: 1.62, crouched: false, onGround: true, vy: 0,
      hp: 100, armor: 0, alive: true, speed: 0, moving: false,
      weaponIdx: 0, spreadBloom: 0, recoilPitch: 0,
    },
    weapons: [
      { id: 'vk9', name: 'VK-9 Jackal', price: 0, mag: 30, reserve: 90, magSize: 30, dmg: 34, headMult: 4, rate: 0.11, reload: 2.1, spread: 0.011, zoom: 1.15, auto: true, lastShot: -9, reloading: false, reloadT: 0 },
      { id: 'lr50', name: 'LR-50 Longbow', price: 2700, mag: 5, reserve: 15, magSize: 5, dmg: 110, headMult: 4, rate: 1.4, reload: 3.0, spread: 0.0015, zoom: 3.2, auto: false, lastShot: -9, reloading: false, reloadT: 0 },
      { id: 'p12', name: 'P-12 Sidewinder', price: 500, mag: 7, reserve: 21, magSize: 7, dmg: 53, headMult: 4, rate: 0.32, reload: 1.6, spread: 0.008, zoom: 1.1, auto: false, lastShot: -9, reloading: false, reloadT: 0 },
    ],
    owned: [true, false, false],
    economy: { money: 800 },
    bots: [], // {id,x,z,yaw,hp,alive,state,wp,wpIdx,holdT,shootT,lastSeenX,lastSeenZ,defuseT,blindT,mesh,headMesh,bodyMesh}
    bomb: { state: 'none', site: null, x: 0, z: 0, plantT: 0, fuse: 40, defuseT: 0, defuser: -1 },
    grenades: { smoke: 2, flash: 1, he: 1, smokes: [] }, // smokes: {x,z,r,t}
    kills: 0, shotsFired: 0,
    events: [], // killfeed strings {text, t}
    lastShotPos: null, // {x,z} for bot investigation
    flashT: 0, // player flash blindness
    msg: '', msgT: 0,
  };
}
