// Map layouts — all original names and original geometry. The layout shapes
// take inspiration from classic FPS maps but every map here is built from
// scratch with its own name, props and lanes. Sites A/B/C keep the same
// roles (and the yard size 80x56) so every mode works on every map, but
// each map now has its own site positions and names.

const DEFAULT_SPAWNS = {
  player: { x: 0, z: 24, yaw: 0 },
  bots: [
    { x: -14, z: -24 }, { x: -4, z: -25 }, { x: 6, z: -25 }, { x: 16, z: -24 }, { x: 0, z: -20 },
  ],
};
const NORTH_HOUSE_SPAWNS = {
  player: { x: 0, z: 24, yaw: 0 },
  bots: [
    { x: -16, z: -24 }, { x: -8, z: -24 }, { x: 8, z: -24 }, { x: 16, z: -24 }, { x: 0, z: -14 },
  ],
};
const CORNERS = [[-36, -24], [36, -24], [-36, 24], [36, 24]];

function lights(api) { for (const [x, z] of CORNERS) api.addStreetlight(x, z); }
function scatterCrates(api, spots) { for (const [x, z] of spots) api.addCrate(x, z); }
function scatterBarrels(api, spots) {
  const cols = [0x8a4a22, 0x2e6f6a, 0x7a7d84];
  spots.forEach(([x, z], i) => api.addBarrel(x, z, cols[i % 3]));
}

export const MAP_DEFS = {
  frost: {
    id: 'frost', name: 'Frostworks Yard', emoji: '❄️',
    desc: 'Snow-covered industrial plant — pipes, containers, cranes.',
    sites: {
      A: { name: 'Boiler House', x: -22, z: -19, color: 0xf0a830 },
      B: { name: 'Crane Dock', x: 24, z: -20, color: 0x37c8d8 },
      C: { name: 'Frost Gate', x: 0, z: 0, color: 0x7ddc7d },
    },
    ground: 0xe8eef2, groundTex: 'snow', fog: 0x9ab0c0,
    // Corridor map (v29): three north-south lanes (west / mid / east)
    // joined by two east-west cross lanes — the reference layout, not an
    // open yard. Mid lane is the hero corridor: grate floor, overhead
    // pipes, steam, long sightline from spawn to the north end wall.
    waypoints: [
      { x: 0, z: 22 }, { x: 0, z: 12 }, { x: 0, z: 2 }, { x: 0, z: -8 },
      { x: 0, z: -18 }, { x: -8, z: -16 }, { x: -22, z: -16 }, { x: -22, z: -6 },
      { x: -22, z: 4 }, { x: -22, z: 14 }, { x: -22, z: 20 }, { x: -12, z: 16 },
      { x: 0, z: 16 }, { x: 12, z: 16 }, { x: 22, z: 16 }, { x: 22, z: 6 },
      { x: 22, z: -4 }, { x: 22, z: -14 }, { x: 22, z: -20 }, { x: 12, z: -16 },
      { x: 0, z: -16 },
    ],
    spawns: {
      player: { x: 0, z: 24, yaw: 0 },
      bots: [
        { x: -22, z: -22 }, { x: 0, z: -22 }, { x: 22, z: -22 }, { x: -22, z: -18 }, { x: 22, z: -18 },
      ],
    },
    build(api) {
      // West plant hall: long vertical hall, snow roof, furnace glow on
      // its east face — that face IS the west lane's west wall (z -18..12).
      // Corrugated panel walls + wall pipes + lit windows on the east face.
      api.addPanelWall(-30, -3, 10, 30, 7, 0x4a5258, { cap: false });
      api.addBox(-30, -3, 11, 0.6, 31, 0xe8eef2, { y: 7.2 });
      api.addBox(-24.9, -2, 0.1, 2.2, 4, 0xff7a1a, { y: 0.3, solid: false, extra: { emissive: 0xff7a1a, emissiveIntensity: 1 } });
      api.addCylinder(-32, -13, 0.9, 9, 0x2e3236, { y: 4.5 });
      api.addCylinder(-27, -15, 0.9, 11, 0x2e3236, { y: 4.5 });
      api.addPipe(-24.75, -3, 26, Math.PI / 2, 3.4);
      api.addPipe(-24.7, -3, 20, Math.PI / 2, 2.8);
      api.addGlowWindow(-24.9, -8, Math.PI / 2, 4.8);
      api.addGlowWindow(-24.9, 4, Math.PI / 2, 4.8);
      // Freestanding stack at the SW corner + overhead pipes: a north run
      // across the yard and a vertical run down the hall's east face.
      api.addCylinder(-36, 24, 1.1, 12, 0x2e3236);
      for (let i = 0; i < 3; i++) api.addBox(-23.5, -2, 0.44, 0.44, 26, 0x6a7a8a, { y: 1 + i * 1.1, solid: false });
      api.addBox(0, -20, 30, 0.44, 0.44, 0x6a7a8a, { y: 5, solid: false });
      // East boiler annex (SE corner) with furnace glow on its west face.
      // Panel walls + a lit window + a high wall pipe on the west face.
      api.addPanelWall(32, 20, 10, 9, 5, 0x5a4a3a, { cap: false });
      api.addBox(32, 20, 11, 0.5, 10, 0xe8eef2, { y: 5 });
      api.addBox(26.9, 20, 0.1, 1.8, 3, 0xff7a1a, { y: 0.3, solid: false, extra: { emissive: 0xff7a1a, emissiveIntensity: 1 } });
      api.addGlowWindow(26.9, 18, -Math.PI / 2, 3);
      api.addPipe(26.8, 20, 7, Math.PI / 2, 4.4);
      // ---- Corridor walls (h=6): mid lane at x=±9, west lane east wall
      // at x=-14, east lane west wall at x=+14. Gaps at the two cross
      // lanes (z -19..-13 and 13..19) so every lane stays connected.
      for (const wx of [-9, 9, -14, 14]) {
        api.addPanelWall(wx, -21.5, 1, 5, 6, 0x8a929a);
        api.addPanelWall(wx, 0, 1, 26, 6, 0x8a929a);
        api.addPanelWall(wx, 21.5, 1, 5, 6, 0x8a929a);
      }
      // West lane west boundary beyond the hall: panel segments north and
      // south of it. East lane east boundary: panel segments between the
      // house (NE) and the annex (SE).
      api.addPanelWall(-27, -21, 1, 6, 6, 0x8a929a);
      api.addPanelWall(-27, 18, 1, 12, 6, 0x8a929a);
      api.addPanelWall(30, -12, 1, 6, 6, 0x8a929a);
      api.addPanelWall(30, -6, 1, 6, 6, 0x8a929a);
      api.addPanelWall(30, 6, 1, 12, 6, 0x8a929a);
      api.addPanelWall(30, 13.5, 1, 3, 6, 0x8a929a);
      // North end walls: each lane ends at a wall with a giant site
      // letter on its south face (reference: SITE A / B on the end wall).
      api.addPanelWall(-24, -24, 8, 1, 6, 0x8a929a);
      api.addWallLetter(-24, -23.4, 0, 'A', 'BOILER HOUSE', '#f0a830', 5);
      api.addPanelWall(24, -24, 8, 1, 6, 0x8a929a);
      api.addWallLetter(24, -23.4, 0, 'B', 'CRANE DOCK', '#37c8d8', 5);
      api.addPanelWall(0, -24, 10, 1, 6, 0x8a929a);
      api.addGlowWindow(2, -23.4, 0, 3.5);
      // Site C letter on the mid lane's west wall, facing the lane.
      api.addWallLetter(-8.4, 0, Math.PI / 2, 'C', 'FROST GATE', '#7ddc7d', 5);
      // Crane at Site B (north end of the east lane): legs wide across
      // the lane mouth, beam along x, hook over the site.
      api.addBox(19, -20, 0.8, 8, 0.8, 0xf0a830);
      api.addBox(29, -20, 0.8, 8, 0.8, 0xf0a830);
      api.addBox(24, -20, 10, 0.8, 0.8, 0xf0a830, { y: 8, solid: false });
      api.addBox(24, -20, 1, 1.4, 1, 0x2e3236, { y: 6.5, solid: false });
      // Overhead pipes down the mid lane (the reference corridor) and
      // the east lane: twin runs, visual only.
      api.addPipe(-2, 0, 44, Math.PI / 2, 5.2);
      api.addPipe(2, 0, 44, Math.PI / 2, 4.6);
      api.addPipe(22, 0, 40, Math.PI / 2, 5);
      // Two enterable crew houses (doors + stairs + interiors, like Ember).
      api.addHouse({ x: 32, z: -16, rot: 270, floors: 2, color: 0x7a8a9a, roof: 0x2e3a44 });
      api.addHouse({ x: -32, z: 20, rot: 0, floors: 2, color: 0x7a8a9a, roof: 0x2e3a44 });
      // Grate floors down the lanes (reference walkway): mid lane full
      // length in 8m tiles, west/east lanes two tiles each.
      for (const gz of [-18, -6, 6, 18]) api.addGrate(0, gz, 10, 8);
      api.addGrate(-22, -12, 8, 8); api.addGrate(-22, 12, 8, 8);
      api.addGrate(22, -12, 8, 8); api.addGrate(22, 12, 8, 8);
      // Steam vents in the lanes (white steam, see props.js).
      api.addSteamVent(0, -10, 0.4);
      api.addSteamVent(0, 4, 0.4);
      api.addSteamVent(0, 14, 0.4);
      api.addSteamVent(-22, -2, 0.4);
      api.addSteamVent(22, 10, 0.4);
      // Hazard barriers flanking the mid lane's south entrance.
      api.addHazardBarrier(-7, 20, 0);
      api.addHazardBarrier(7, 20, 0);
      // Containers: tucked into the strips between lanes + yard corners,
      // never in a lane or a cross lane. Snow piled on top.
      api.addContainer(-11.5, -6, 2.5, 6, 0x8a2a2a);
      api.addContainer(-11.5, 6, 2.5, 6, 0x2a5a8a);
      api.addContainer(11.5, -6, 2.5, 6, 0x5a7a3a);
      api.addContainer(11.5, 6, 2.5, 6, 0x2a5a8a);
      api.addContainer(34, 8, 2.5, 6, 0x8a2a2a);
      api.addContainer(14, 20, 6, 2.5, 0x2a5a8a, { stack: true, stackColor: 0x5a7a3a });
      api.addContainer(36, -8, 2.5, 6, 0x2a5a8a);
      api.addContainer(-8, -24, 6, 2.5, 0x5a7a3a);
      for (const [x, z, w, d, top] of [[-11.5, -6, 2.5, 6, 2.73], [-11.5, 6, 2.5, 6, 2.73], [11.5, -6, 2.5, 6, 2.73], [11.5, 6, 2.5, 6, 2.73], [34, 8, 2.5, 6, 2.73], [14, 20, 6, 2.5, 5.23], [36, -8, 2.5, 6, 2.73], [-8, -24, 6, 2.5, 2.73]])
        api.addBox(x, z, w - 0.2, 0.08, d - 0.2, 0xeef2f6, { y: top, solid: false });
      // Crates as low cover inside the lanes, offset from the lane
      // centreline so the waypoint line stays clear. FW-7 stacks at the
      // two north sites.
      scatterCrates(api, [[2.5, 6], [-2.5, -6], [2.5, 18], [-19.5, -6], [-24.5, 8], [19.5, -6], [24.5, 8], [-2.5, -20], [2.5, -20]]);
      api.addCrate(-34, -22, 1.6, 'FW-7');
      api.addCrate(-34, -22, 1.6, 'FW-7', 1.16);
      api.addCrate(25, -22, 1.6, 'FW-7');
      api.addCrate(25, -22, 1.6, 'FW-7', 1.16);
      scatterBarrels(api, [[-8, 20], [-7, 19], [8, -18], [26, -14], [-26, -14], [10, 20], [-10, 20], [30, 0]]);
      api.addSandbag(-24, -14); api.addSandbag(-20, -14);
      api.addSandbag(20, -14); api.addSandbag(24, -14);
      api.addSandbag(-2, 4); api.addSandbag(2, 4);
      api.addTree(-36, 14); api.addTree(36, 14);
      api.addCar(-20, 24, 0, 0x5a6a7a); api.addCar(20, 24, 0, 0x7a2a2a);
      // Frostworks details: TV, flag, statue, billboard, bushes, planters.
      api.addTV(36, -2, 0);
      api.addFlag(12, -24, 0x2a5a8a);
      api.addStatue(36, 0);
      api.addBillboard(-36, -20, Math.PI / 2, 0x2a5a8a);
      api.addBush(-11, 22); api.addBush(28, -22); api.addBush(-12, -24);
      api.addPlanter(-4.5, 20); api.addPlanter(4.5, 20);
      api.addPowerPole(-36, -14); api.addWoodPile(34, -6);
      api.addTrashCan(-16, -22); api.addTrashCan(26, 20);
      // Ambient: dog, mechanic, fridge/stove/safe/wardrobe.
      api.addAnimal('dog', -16, 22); api.addNPC('mechanic', 18, 18);
      api.addFridge(-11.5, 18); api.addStove(11.5, 18); api.addSafe(-10, 20); api.addWardrobe(34, 12);
      // GLB props: Kenney industrial set + skyscraper backdrop.
      api.addGLB('models/kenney/buildings/industrial/factory.glb', -36, -22, { scale: 6 });
      api.addGLB('models/kenney/buildings/industrial/chimney.glb', 8, -24, { scale: 5 });
      api.addGLB('models/kenney/buildings/industrial/tank.glb', 36, 10, { scale: 5 });
      api.addGLB('models/kenney/buildings/industrial/watertower.glb', 34, -22, { scale: 5 });
      api.addGLB('models/kenney/props/factory/conveyor.glb', 34, 2, { scale: 4 });
      api.addGLB('models/kenney/buildings/skyscraper.glb', -8, 24, { scale: 8 });
      lights(api);
    },
  },

  foundry: {
    id: 'foundry', name: 'Foundry Yard', emoji: '🏭',
    desc: 'Industrial yard — furnace, containers, crane. The original map.',
    sites: {
      A: { name: 'Furnace', x: -27, z: -19, color: 0xf0a830 },
      B: { name: 'Crane Yard', x: 27, z: -19, color: 0x37c8d8 },
      C: { name: 'Mid Yard', x: 0, z: 6, color: 0x7ddc7d },
    },
    ground: 0xffffff, fog: 0x2e241a,
    waypoints: [
      { x: -30, z: -8 }, { x: -30, z: 8 }, { x: -12, z: 14 }, { x: 0, z: 6 },
      { x: 12, z: 14 }, { x: 30, z: 8 }, { x: 30, z: -8 }, { x: 14, z: -8 },
      { x: -14, z: -8 }, { x: 0, z: -14 }, { x: -27, z: -19 }, { x: 27, z: -19 },
      { x: -20, z: 20 }, { x: 20, z: 20 }, { x: 0, z: 20 },
    ],
    spawns: DEFAULT_SPAWNS,
    build(api) {
      // Central foundry building + roof + chimneys + furnace mouth + pipes
      api.addBox(0, -2, 16, 7, 10, 0x3a3f44);
      api.addBox(0, -2, 17, 0.6, 11, 0x8a4a22, { y: 7.2 });
      api.addCylinder(-5, -4, 0.9, 9, 0x2e3236, { y: 4.5 });
      api.addCylinder(5, -4, 0.9, 9, 0x2e3236, { y: 4.5 });
      api.addBox(0, 3.05, 4, 2.2, 0.1, 0xff7a1a, { y: 0.3, solid: false, extra: { emissive: 0xff7a1a, emissiveIntensity: 1 } });
      for (let i = 0; i < 3; i++) api.addBox(8.4, -2, 0.44, 0.44, 7, 0x5c6b70, { y: 1 + i * 1.1, solid: false });
      // Crane at Site B
      api.addBox(22, -19, 0.8, 8, 0.8, 0xf0a830);
      api.addBox(32, -19, 0.8, 8, 0.8, 0xf0a830);
      api.addBox(27, -19, 12, 0.8, 0.8, 0xf0a830, { y: 8, solid: false });
      api.addBox(27, -19, 1, 1.4, 1, 0x2e3236, { y: 6.5, solid: false });
      // Containers
      api.addContainer(-20, 2, 6, 2.5, 0x8a2a2a);
      api.addContainer(-20, 6, 6, 2.5, 0x2a5a8a);
      api.addContainer(20, 2, 6, 2.5, 0x2a5a8a);
      api.addContainer(20, -10, 2.5, 6, 0x5a7a3a);
      api.addContainer(-32, -12, 6, 2.5, 0x5a7a3a);
      api.addContainer(32, 4, 6, 2.5, 0x8a2a2a);
      api.addContainer(-8, -16, 2.5, 6, 0x8a2a2a);
      api.addContainer(10, 12, 6, 2.5, 0x2e6f6a);
      api.addContainer(-34, 16, 2.5, 6, 0x2a5a8a);
      api.addContainer(34, -14, 2.5, 6, 0x2a5a8a);
      api.addContainer(14, -20, 6, 2.5, 0x8a2a2a, { stack: true, stackColor: 0x5a7a3a });
      // Brick gate walls (reference look): two wall stubs flanking the mid
      // lane, giant painted site letters on their south faces, hazard
      // barriers framing the gate. Wide gaps at both ends keep every lane
      // open (bots slide around the ends; stuckT retargets after 2s).
      api.addBrickWall(-12.5, 6, 7, 1, 3.5);
      api.addWallLetter(-12.5, 6.56, 0, 'A', 'FURNACE', '#f0a830');
      api.addBrickWall(12.5, 6, 7, 1, 3.5);
      api.addWallLetter(12.5, 6.56, 0, 'B', 'CRANE YARD', '#37c8d8');
      api.addHazardBarrier(-8.5, 6, Math.PI / 2);
      api.addHazardBarrier(8.5, 6, Math.PI / 2);
      // Crates, grid-aligned (no overlaps): pairs 1.8m apart, plus a
      // two-high stack at each site corner.
      scatterCrates(api, [[-12, 8], [-10.2, 8], [12, 8], [13.8, 8], [0, 14], [-4, -12], [24, 12], [-24, -2], [6, -14], [-16, 20], [16, 20], [0, -22]]);
      api.addCrate(-27, -10, 1.6, 'FY-7');
      api.addCrate(-27, -10, 1.6, 'FY-7', 1.16);
      api.addCrate(27, -10, 1.6, 'FY-7');
      api.addCrate(27, -10, 1.6, 'FY-7', 1.16);
      scatterBarrels(api, [[-16, 4], [-15, 5], [16, -6], [26, 2], [-30, 2], [8, 18], [-6, 18], [30, -6]]);
      api.addSandbag(-23, -14); api.addSandbag(-21, -14);
      api.addSandbag(23, -14); api.addSandbag(21, -14);
      api.addSandbag(-2, 10); api.addSandbag(2, 10);
      api.addTree(-36, 14); api.addTree(36, 14);
      api.addCar(-24, 18, 0, 0x5a6a7a); api.addCar(24, 18, 0, 0x7a2a2a);
      // v17.1 details: TV, waving flag, statue, billboard.
      api.addTV(-34, 22, 0);
      api.addFlag(0, -24, 0xcc2222);
      api.addStatue(36, 0);
      api.addBillboard(-36, -20, Math.PI / 2, 0xf0a830);
      // v22.3/v22.4: bushes, power pole, trash cans, rocks, wood pile.
      api.addBush(-28, 22); api.addBush(28, -22); api.addBush(-34, 8);
      // Reference-style planter boxes flanking the spawn approach.
      api.addPlanter(-4.5, 18); api.addPlanter(4.5, 18);
      api.addPowerPole(-36, -14); api.addWoodPile(30, 14);
      api.addTrashCan(-26, -18); api.addTrashCan(26, 18);
      // v27.0 ambient: dog, mechanic, fridge/stove/safe/wardrobe.
      api.addAnimal('dog', -30, 18); api.addNPC('mechanic', 22, -16);
      api.addFridge(10, 16); api.addStove(12, 16); api.addSafe(-10, 20); api.addWardrobe(34, 12);
      // GLB props (wiring 2026-11-16): Kenney industrial set + skyscraper backdrop.
      api.addGLB('models/kenney/buildings/industrial/factory.glb', -30, 22, { scale: 6 });
      api.addGLB('models/kenney/buildings/industrial/chimney.glb', -20, 23, { scale: 5 });
      api.addGLB('models/kenney/buildings/industrial/tank.glb', 30, 22, { scale: 5 });
      api.addGLB('models/kenney/buildings/industrial/watertower.glb', 34, -22, { scale: 5 });
      api.addGLB('models/kenney/props/factory/conveyor.glb', 14, -16, { scale: 4 });
      api.addGLB('models/kenney/buildings/skyscraper.glb', 14, 22, { scale: 8 });
      lights(api);
    },
  },

  ember: {
    id: 'ember', name: 'Ember Market', emoji: '🏜️',
    desc: 'Desert market town — sandstone houses, stalls, palms.',
    sites: {
      A: { name: 'Spice Row', x: -24, z: -21, color: 0xf0a830 },
      B: { name: 'Tent Row', x: 22, z: -20, color: 0x37c8d8 },
      C: { name: 'Oasis Court', x: 2, z: 12, color: 0x7ddc7d },
    },
    ground: 0xd8b98a, groundTex: 'sand', fog: 0x8a6a4a,
    waypoints: [
      { x: -30, z: -2 }, { x: -30, z: 6 }, { x: -12, z: 14 }, { x: 0, z: 6 },
      { x: 12, z: 14 }, { x: 30, z: 6 }, { x: 30, z: -2 }, { x: 14, z: -8 },
      { x: -14, z: -8 }, { x: 0, z: -12 }, { x: -20, z: 20 }, { x: 20, z: 20 },
      { x: 0, z: 20 }, { x: -6, z: -20 }, { x: 6, z: -20 },
      { x: -24, z: -21 }, { x: 22, z: -20 }, { x: 2, z: 12 },
    ],
    spawns: NORTH_HOUSE_SPAWNS,
    build(api) {
      api.addHouse({ x: -30, z: -14, rot: 90, floors: 2, color: 0xa88a5a, roof: 0x7a4a2a });
      api.addHouse({ x: 30, z: -14, rot: 270, floors: 2, color: 0xa88a5a, roof: 0x7a4a2a });
      api.addHouse({ x: -30, z: 14, rot: 0, floors: 1, color: 0xb89a6a, roof: 0x8a5a2a });
      api.addHouse({ x: 30, z: 14, rot: 180, floors: 1, color: 0xb89a6a, roof: 0x8a5a2a });
      api.addHouse({ x: 0, z: -22, rot: 0, floors: 2, color: 0x9a7a4a, roof: 0x6b3a1a });
      // Market stalls (counters + crates)
      for (const [x, z] of [[-10, 0], [10, 0], [-6, 10], [6, 10]]) {
        api.addBox(x, z, 2.4, 1, 1.2, 0x7a5c38);
        api.addCrate(x + 2, z + 1, 1.2);
      }
      api.addContainer(-20, 2, 6, 2.5, 0xb89a6a);
      api.addContainer(20, -10, 2.5, 6, 0x8a6a3a);
      api.addContainer(10, 12, 6, 2.5, 0xa85a2a);
      api.addContainer(-14, 20, 6, 2.5, 0x7a5a3a);
      scatterCrates(api, [[-12, 8], [12, 6], [0, 17], [-4, -12], [24, 12], [-24, -2]]);
      scatterBarrels(api, [[-16, 4], [16, -6], [26, 2], [-30, 2], [8, 18], [-6, 18]]);
      api.addSandbag(-18, -17); api.addSandbag(15, -17);
      api.addSandbag(-6, 16); api.addSandbag(6, 16);
      api.addTree(-36, 0); api.addTree(36, 0); api.addTree(-36, 24);
      api.addTree(36, 24); api.addTree(-20, 22); api.addTree(20, 22);
      api.addTower(34, -24, 12);
      api.addCar(14, 18, 0, 0x7a2a2a); api.addCar(-14, -6, Math.PI / 2, 0x5a6a7a);
      // v17.1 market details: tents, carpets, table sets, cacti, statue, flags.
      api.addTent(-10, 6, 0, 0xc86a3a); api.addTent(10, -6, 0, 0x3a6a8a);
      api.addCarpet(-10, 0, 3, 2, 0x8a2a2a); api.addCarpet(10, 0, 3, 2, 0x2a5a8a);
      api.addTableSet(-6, 14, 0); api.addTableSet(6, -14, 0);
      api.addCactus(-24, -18); api.addCactus(24, 18); api.addCactus(-36, -8);
      api.addStatue(0, 0); // market centrepiece — clear of the (0,24) spawn lane and waypoint (0,20)
      api.addFlag(-30, 22, 0xffcc00); api.addFlag(30, 22, 0x2a5a8a);
      // v18.9 market ambience: campfire, neon sign, oil puddle, cable spark.
      api.addCampfire(-20, -16);
      api.addNeonSign(24, 0, 0xff7733);
      api.addOilPuddle(18, 14);
      api.addSpark(30, -20, 3.5);
      // v22.3/v22.4: bushes, rocks, plant pots, wood pile, trash can, cart.
      api.addBush(-26, 20); api.addBush(26, -20); api.addBush(-34, 10);
      api.addRock(-28, -20); api.addRock(28, 20);
      api.addPlantPot(-8, 4); api.addPlantPot(8, -4);
      // v27.0 ambient: merchant + cook at the stalls, chicken, dog, fruit tree.
      api.addNPC('merchant', -8, 2); api.addNPC('cook', 8, 2);
      api.addAnimal('chicken', -26, 18); api.addAnimal('dog', 24, 22); api.addFruitTree(28, 24);
      // GLB props: market goods on the stall counters + palms.
      api.addGLB('models/kenney/props/shop/market-fruit.glb', -10, 0, { scale: 2, y: 1 });
      api.addGLB('models/kenney/props/shop/market-bread.glb', 10, 0, { scale: 2, y: 1 });
      api.addGLB('models/kenney/props/shop/cash-register.glb', -6, 10, { scale: 1.5, y: 1 });
      api.addGLB('models/kenney/nature/palm.glb', -36, -24, { scale: 4 });
      api.addGLB('models/kenney/nature/palm.glb', 36, -8, { scale: 4 });
      lights(api);
    },
  },

  twin: {
    id: 'twin', name: 'Twin Court', emoji: '🏠',
    desc: 'Two houses face each other across a yellow bus.',
    sites: {
      A: { name: 'Garden Gate', x: -24, z: -17, color: 0xf0a830 },
      B: { name: 'Driveway', x: 24, z: -20, color: 0x37c8d8 },
      C: { name: 'Bus Stop', x: 0, z: 10, color: 0x7ddc7d },
    },
    ground: 0xe8dcc8, fog: 0x8a7a6a,
    waypoints: [
      { x: -30, z: -8 }, { x: -30, z: 8 }, { x: -12, z: 14 }, { x: 0, z: 6 },
      { x: 12, z: 14 }, { x: 30, z: 8 }, { x: 30, z: -8 }, { x: 14, z: -8 },
      { x: -14, z: -8 }, { x: 0, z: -14 }, { x: -24, z: 20 }, { x: 24, z: 20 },
      { x: 0, z: 20 }, { x: -24, z: -20 }, { x: 24, z: -20 },
      { x: -24, z: -17 }, { x: 24, z: -20 }, { x: 0, z: 10 },
    ],
    spawns: DEFAULT_SPAWNS,
    build(api) {
      api.addHouse({ x: -16, z: 20, rot: 0, floors: 2, color: 0xa8906a, roof: 0x7a5232 });
      api.addHouse({ x: 16, z: -20, rot: 180, floors: 2, color: 0x9888b8, roof: 0x5a4a6a });
      api.addBus(0, 2, 0, 0xe8b800);
      api.addCar(-8, 12, 0, 0x7a2a2a); api.addCar(8, -8, Math.PI / 2, 0x2a4a7a);
      api.addCar(0, -14, Math.PI / 2, 0x8a8a2a);
      api.addContainer(-20, 2, 6, 2.5, 0x7a8ab8);
      api.addContainer(20, -10, 2.5, 6, 0xb8a87a);
      scatterCrates(api, [[-12, 8], [12, 6], [-2, 15], [-4, -12], [24, 12], [-24, -2], [-16, -8], [16, 8]]);
      scatterBarrels(api, [[-16, 4], [16, -6], [26, 2], [-30, 2], [8, 18], [-6, 18]]);
      api.addSandbag(-17, -14); api.addSandbag(20, -16);
      api.addSandbag(-8, 14); api.addSandbag(10, 12);
      api.addTree(-36, 0); api.addTree(36, 0); api.addTree(-36, 24); api.addTree(36, 24);
      api.addTree(-36, -24); api.addTree(36, -24);
      api.addTower(34, 22, 12);
      // v17.1 court details: 4 mailboxes, statue, swing, fence.
      api.addMailbox(-18, 15.5, 0); api.addMailbox(18, -15.5, 0);
      api.addMailbox(-14, -17, 0); api.addMailbox(14, 17, 0);
      api.addStatue(0, -22);
      api.addSwing(-24, 20, 0);
      api.addFence(24, 24, 10, 0); api.addFence(-24, -24, 10, 0);
      // v18.9 garden touches: falling leaves + flowers.
      api.addLeaves(0, 10); api.addFlowers(-8, 18, 8); api.addFlowers(10, -16, 6);
      // v22.0.4 training dummies near the bus + v22.3/v22.4 props.
      api.addDummy(-6, -4); api.addDummy(-4, -4); api.addDummy(-5, -6);
      api.addBush(-30, 14); api.addBush(30, -14); api.addBush(-26, -20);
      api.addPowerPole(-36, -12); api.addWoodPile(24, 20);
      api.addTrashCan(-20, 18); api.addTrashCan(20, -18);
      // v27.0 ambient: cat, dog, doctor by the bus, fridge + wardrobe.
      api.addAnimal('cat', -20, 16); api.addAnimal('dog', 20, -14); api.addNPC('doctor', 6, 6);
      api.addFridge(-12, 17); api.addWardrobe(12, -17);
      // GLB props: real buses at the Bus Stop site + parked two-wheelers + ambulance.
      api.addGLB('models/lowpoly/city_bus.glb', -16, 10, { yaw: Math.PI / 2 });
      api.addGLB('models/lowpoly/school_bus.glb', 16, -14, { yaw: Math.PI / 2 });
      api.addGLB('models/lowpoly/motorbike.glb', 6, 14, { yaw: 0.5 });
      api.addGLB('models/lowpoly/scooter.glb', -6, 16, { yaw: -0.4 });
      api.addGLB('models/lowpoly/bicycle.glb', 12, 16, { yaw: 0.2 });
      api.addGLB('models/lowpoly/ambulance.glb', 12, 2, { yaw: Math.PI / 2 });
      api.addGLB('models/kenney/buildings/suburban/house-g.glb', -30, -20, { scale: 6, yaw: Math.PI / 2 });
      api.addGLB('models/kenney/buildings/suburban/house-a.glb', 30, -20, { scale: 6, yaw: -Math.PI / 2 });
      api.addGLB('models/kenney/buildings/suburban/house-d.glb', 30, 20, { scale: 6 });
      api.addGLB('models/kenney/nature/suburban/tree-large.glb', -32, 4, { scale: 8 });
      api.addGLB('models/kenney/nature/suburban/tree-small.glb', 32, 4, { scale: 8 });
      lights(api);
    },
  },

  iron: {
    id: 'iron', name: 'Iron Crossing', emoji: '🌉',
    desc: 'City streets under a highway overpass.',
    sites: {
      A: { name: 'Neon Alley', x: -25, z: -19, color: 0xf0a830 },
      B: { name: 'Plaza', x: 25, z: -17, color: 0x37c8d8 },
      C: { name: 'Crosswalk', x: 0, z: 9, color: 0x7ddc7d },
    },
    ground: 0xb8b8c0, fog: 0x6a6a7a,
    waypoints: [
      { x: -30, z: -8 }, { x: -14, z: -8 }, { x: 0, z: -8 }, { x: 14, z: -8 }, { x: 30, z: -8 },
      { x: -30, z: 8 }, { x: -14, z: 8 }, { x: 0, z: 8 }, { x: 14, z: 8 }, { x: 30, z: 8 },
      { x: 0, z: -16 }, { x: 0, z: 16 }, { x: -20, z: 20 }, { x: 20, z: 20 },
      { x: -8, z: -22 }, { x: 8, z: -22 },
      { x: -25, z: -19 }, { x: 25, z: -17 }, { x: 0, z: 9 },
    ],
    spawns: NORTH_HOUSE_SPAWNS,
    build(api) {
      api.addBridge(0, 0, 36, 6, 0);
      api.addHouse({ x: -28, z: -12, rot: 90, floors: 3, color: 0x6a6a72, roof: 0x3a3a42 });
      api.addHouse({ x: 28, z: -12, rot: 270, floors: 2, color: 0x7a6a5a, roof: 0x4a3a2a });
      api.addHouse({ x: -28, z: 12, rot: 90, floors: 2, color: 0x5a6a7a, roof: 0x3a4a5a });
      api.addHouse({ x: 28, z: 12, rot: 270, floors: 3, color: 0x6a6a72, roof: 0x3a3a42 });
      api.addHouse({ x: 0, z: -22, rot: 0, floors: 3, color: 0x8a7a5a, roof: 0x5a3a1a });
      api.addHouse({ x: -28, z: 20, rot: 90, floors: 2, color: 0x6a6a72, roof: 0x3a3a42 });
      api.addCar(-10, -6, 0, 0x7a2a2a); api.addCar(10, -6, 0, 0x2a4a7a);
      api.addCar(-10, 6, 0.3, 0x2e2e2e); api.addCar(10, 6, -0.4, 0x3a3a3a); // 2 wrecked
      api.addBus(18, 8, 0, 0x2a6a8a);
      api.addContainer(-20, 6, 6, 2.5, 0x3a5a7a);
      api.addContainer(20, -10, 2.5, 6, 0x6a6a72);
      api.addContainer(-34, -20, 6, 2.5, 0x8a3a3a);
      api.addContainer(34, 20, 6, 2.5, 0x2e6f6a);
      scatterCrates(api, [[-12, 10], [12, 10], [0, 14], [-4, -12], [24, 12], [-24, -2]]);
      scatterBarrels(api, [[-16, 4], [16, -6], [26, 2], [-30, 2], [8, 18], [-6, 18]]);
      api.addSandbag(-21, -15); api.addSandbag(21, -13);
      api.addSandbag(-10, 12); api.addSandbag(10, 6);
      api.addTree(-36, 0); api.addTree(36, 0); api.addTree(-20, 22); api.addTree(20, 22);
      api.addTower(-36, -22, 12);
      // v17.1 city details: 2 billboards, rubble, road lines, rooftop AC.
      api.addBillboard(36, -16, -Math.PI / 2, 0x2a5a8a);
      api.addBillboard(-36, 16, Math.PI / 2, 0x8a2a2a);
      api.addRubble(-14, 0, 2); api.addRubble(14, 0, 2);
      api.addRoadLines(-20, 0, 20, 0); api.addRoadLines(20, 0, 20, 0);
      api.addRoofAC(-28, -12, 14.3); api.addRoofAC(28, 12, 9.6);
      // v18.9 city ambience: neon sign, fluttering papers, graffiti, cans, spark.
      api.addNeonSign(-30, 0, 0x37c8d8);
      api.addPapers(0, 12, 6); api.addGraffiti(34, 8, 1.5, -Math.PI / 2, 0xff5577);
      api.addCans(-6, 18, 5); api.addSpark(-34, -8, 3.5); api.addOilPuddle(-18, -18);
      // v22.3/v22.4 city props: traffic lights, hydrant, vending, ATM, phone booth, power poles, road signs, parked cars.
      api.addTrafficLight(-8, -8); api.addTrafficLight(8, 8);
      api.addHydrant(-6, -2); api.addVending(30, 2); api.addATM(-30, -2);
      api.addPhoneBooth(24, 18);
      api.addPowerPole(-16, -14); api.addPowerPole(16, 14);
      api.addRoadSign(-4, 10); api.addRoadSign(4, -10);
      // v27.0 ambient: mechanic, cook, cat, firefly.
      api.addNPC('mechanic', -22, 18); api.addNPC('cook', 22, 16);
      api.addAnimal('cat', 32, -18); api.addAnimal('firefly', -4, -18);
      // GLB props: city vehicles + lamp posts (procedural traffic lights stay).
      api.addGLB('models/lowpoly/school_bus.glb', -18, 14, { yaw: Math.PI / 2 });
      api.addGLB('models/lowpoly/motorbike.glb', -6, 12, { yaw: 0.3 });
      api.addGLB('models/lowpoly/scooter.glb', 8, -14, { yaw: -0.5 });
      api.addGLB('models/lowpoly/bicycle.glb', -8, 16, { yaw: 0.2 });
      api.addGLB('models/lowpoly/car_taxi.glb', 16, -14, { yaw: Math.PI / 2 });
      api.addGLB('models/lowpoly/car_police.glb', 22, -18, { yaw: Math.PI / 2 });
      api.addGLB('models/kenney/props/lampPost.glb', -20, 20, { scale: 8, yaw: Math.PI });
      api.addGLB('models/kenney/props/lampPost.glb', 20, -20, { scale: 8 });
      lights(api);
    },
  },

  cargo: {
    id: 'cargo', name: 'Cargo Works', emoji: '📦',
    desc: 'Dense container yard — tight lanes, stacked boxes.',
    sites: {
      A: { name: 'Stack Row', x: -21, z: -12, color: 0xf0a830 },
      B: { name: 'Forklift Bay', x: 21, z: -12, color: 0x37c8d8 },
      C: { name: 'Crate Maze', x: 0, z: 14, color: 0x7ddc7d },
    },
    ground: 0xb0a890, fog: 0x7a6a5a,
    waypoints: [
      { x: -21, z: -12 }, { x: -7, z: -12 }, { x: 7, z: -12 }, { x: 21, z: -12 },
      { x: -21, z: 0 }, { x: -7, z: 0 }, { x: 7, z: 0 }, { x: 21, z: 0 },
      { x: -21, z: 12 }, { x: -7, z: 12 }, { x: 7, z: 12 }, { x: 21, z: 12 },
      { x: -21, z: 21 }, { x: 21, z: 21 }, { x: 0, z: 22 },
      { x: 0, z: 14 },
    ],
    spawns: DEFAULT_SPAWNS,
    build(api) {
      const cols = [0x7a3a2a, 0x3a6a8a, 0x6a7a2a, 0x8a6a2a];
      let ci = 0;
      for (const rz of [-18, -6, 6, 18]) {
        for (const rx of [-28, -14, 0, 14, 28]) {
          // (Gameplay pass 2026-11-15: leave a gap at (0,18) — the container
          // there sat 6m in front of the (0,24) spawn and walled off the
          // whole spawn view. The gap opens a central lane into the yard.)
          if (rx === 0 && rz === 18) { ci++; continue; }
          const rot = (ci % 2 === 0) ? 0 : Math.PI / 2;
          const stack = ci % 5 === 0;
          if (rot === 0) api.addContainer(rx, rz, 6, 2.5, cols[ci % 4], { stack, stackColor: cols[(ci + 1) % 4] });
          else api.addContainer(rx, rz, 2.5, 6, cols[ci % 4], { rot, stack, stackColor: cols[(ci + 1) % 4] });
          ci++;
        }
      }
      api.addHouse({ x: 34, z: 20, rot: 180, floors: 1, color: 0x6a6a72, roof: 0x3a3a42 });
      scatterCrates(api, [[-21, 2], [7, -12], [-7, 0], [21, 0], [-21, 12], [7, 12], [-7, 21], [21, 21]]);
      scatterBarrels(api, [[-7, -12], [21, 2], [-21, 0], [7, 0], [-7, 12], [21, 12], [3, 22], [-21, 21]]);
      api.addSandbag(-7, -16); api.addSandbag(7, -16);
      api.addSandbag(-7, 16); api.addSandbag(7, 16);
      api.addTower(0, -24, 12);
      api.addCar(34, -20, Math.PI / 2, 0x7a2a2a);
      api.addTree(-36, 24); api.addTree(36, -24);
      // v17.1 yard details: 2 forklifts, 4 pallets, 2 cranes, surrounding fence.
      api.addForklift(-7, -18, 0, 0xe8a800); api.addForklift(14, 12, Math.PI / 2, 0x2a7a8a);
      api.addPallet(-21, -12); api.addPallet(7, 0); api.addPallet(-7, 12); api.addPallet(21, 21);
      api.addCrane(-34, -24, 0); api.addCrane(34, -24, Math.PI);
      api.addFence(0, -27, 78, 0); api.addFence(0, 27, 78, 0);
      api.addFence(-39, 0, 54, Math.PI / 2); api.addFence(39, 0, 54, Math.PI / 2);
      // v18.9 yard ambience: oil puddle, cans, cable spark.
      api.addOilPuddle(10, 20); api.addCans(-14, 22, 5); api.addSpark(34, 0, 4);
      // v22.3/v22.4 yard props: wood piles, trash cans, rocks, suitcase, cart.
      api.addWoodPile(-28, 12); api.addWoodPile(28, -12);
      api.addTrashCan(-10, 22); api.addTrashCan(10, -22);
      api.addRock(-36, 10); api.addRock(36, 10);
      // v27.0 ambient: yard dog + mechanic.
      api.addAnimal('dog', -4, 22); api.addNPC('mechanic', 28, -18);
      // GLB props: a real forklift in the yard (procedural forklifts stay).
      api.addGLB('models/lowpoly/forklift.glb', 14, 21, { yaw: Math.PI / 2 });
      lights(api);
    },
  },

  harvest: {
    id: 'harvest', name: 'Harvest Town', emoji: '🌾',
    desc: 'Village, rice fields, a big barn and a water tower.',
    sites: {
      A: { name: 'Barn Gate', x: -22, z: -18, color: 0xf0a830 },
      B: { name: 'Mill Row', x: 22, z: -21, color: 0x37c8d8 },
      C: { name: 'Field Cross', x: 0, z: 12, color: 0x7ddc7d },
    },
    ground: 0xcfd8b0, groundTex: 'grass', fog: 0x7a8a6a,
    waypoints: [
      { x: -30, z: -2 }, { x: -30, z: 6 }, { x: -8, z: 14 }, { x: 0, z: 6 },
      { x: 12, z: 14 }, { x: 30, z: 6 }, { x: 30, z: -2 }, { x: 14, z: -8 },
      { x: -14, z: -8 }, { x: 0, z: -12 }, { x: -24, z: 20 }, { x: 20, z: 20 },
      { x: 0, z: 20 }, { x: -6, z: -20 }, { x: 6, z: -20 },
      { x: -22, z: -18 }, { x: 22, z: -21 }, { x: 0, z: 12 },
    ],
    spawns: NORTH_HOUSE_SPAWNS,
    build(api) {
      api.addHouse({ x: -28, z: -16, rot: 90, floors: 2, color: 0x9a7a5a, roof: 0x6b4a2a });
      api.addHouse({ x: 28, z: -16, rot: 270, floors: 2, color: 0x8a6a4a, roof: 0x5a3a1a });
      api.addHouse({ x: -28, z: 12, rot: 90, floors: 1, color: 0xa88a5a, roof: 0x7a4a2a });
      api.addHouse({ x: 28, z: 12, rot: 270, floors: 1, color: 0xa88a5a, roof: 0x7a4a2a });
      api.addHouse({ x: 0, z: -22, rot: 0, floors: 2, color: 0x9a7a5a, roof: 0x6b4a2a });
      api.addBarn({ x: -16, z: 16, rot: 0, w: 12, d: 9, color: 0x7a3a2a });
      api.addRiceField(-14, -4, 8, 6, 0x5a7a3a);
      api.addRiceField(14, -4, 8, 6, 0xa8a83a);
      api.addRiceField(-20, 8, 8, 6, 0x6a8a3a);
      api.addRiceField(20, 8, 8, 6, 0x5a7a3a);
      api.addFence(-14, -7.5, 8, 0); api.addFence(-14, -0.5, 8, 0);
      api.addFence(14, -7.5, 8, 0); api.addFence(14, -0.5, 8, 0);
      api.addFence(-20, 4.5, 8, 0); api.addFence(-20, 10.5, 8, 0);
      api.addFence(20, 4.5, 8, 0); api.addFence(20, 10.5, 8, 0);
      api.addHaystack(-10, -10); api.addHaystack(10, -10);
      api.addHaystack(-24, 4); api.addHaystack(24, 4);
      api.addHaystack(-8, 20); api.addHaystack(8, 20);
      api.addTree(-36, 0); api.addTree(36, 0); api.addTree(-36, 24); api.addTree(36, 24);
      api.addTree(-20, 22); api.addTree(20, 22); api.addTree(-36, -22); api.addTree(36, -22);
      api.addTower(34, -22, 14);
      api.addCar(10, 18, 0, 0x3a5a2a);
      api.addCar(-12, 18, 0, 0x8a8a2a); // was (0,22): sat 2m in front of the (0,24) spawn and walled off the view
      scatterCrates(api, [[-12, 8], [12, 6], [0, 17], [-4, -12], [24, 12], [-24, -2]]);
      scatterBarrels(api, [[-16, 4], [16, -6], [26, 2], [-30, 2], [8, 18], [-6, 18]]);
      api.addSandbag(-18, -13); api.addSandbag(20, -16);
      api.addSandbag(-10, 16); api.addSandbag(10, 14);
      // v17.1 garden details: pool, swing, mailboxes, TV.
      api.addPool(0, 0, 6, 4);
      api.addSwing(24, 0, 0);
      api.addMailbox(-28, 6.5, 0); api.addMailbox(28, 6.5, 0);
      api.addTV(6, -16, Math.PI);
      // v18.9 garden ambience: fountain, butterflies, leaves, flowers, torch.
      api.addFountain(-6, -14); api.addButterflies(0, 6);
      api.addLeaves(-10, 10); api.addFlowers(12, 16, 10); api.addFlowers(-20, -8, 8);
      api.addTorch(-4, 20); api.addTorch(4, 20);
      // v22.3/v22.4 village props: bushes, plant pots, wood pile, cart, suitcase, power pole.
      api.addBush(-18, 18); api.addBush(18, 18); api.addBush(-30, -22);
      api.addPlantPot(-26, 8); api.addPlantPot(26, 8);
      api.addWoodPile(-22, -18); api.addCart(3, 8); api.addSuitcase(-6, 2);
      // v27.0 ambient: horse + cow + chicken, merchant + cook, crops, fruit.
      api.addAnimal('horse', 6, 16); api.addAnimal('cow', -4, 18); api.addAnimal('chicken', 16, 20);
      api.addNPC('merchant', 4, 4); api.addNPC('cook', -14, 20);
      api.addCropPatch(-14, -1); api.addCropPatch(14, -1); api.addCropPatch(20, 11);
      api.addFruitTree(32, 16);
      // GLB props: user animals (coloured, static) + hay + user houses as facades.
      api.addGLB('models/user/animals/Pug_49_ye3e.glb', 10, 20, { scale: 0.23, yaw: Math.PI });
      api.addGLB('models/user/animals/Sheep_50_c304.glb', -20, 20, { scale: 0.25, yaw: 0.6 });
      api.addGLB('models/user/animals/Cow_51_ek9q.glb', 18, 16, { scale: 0.27, yaw: -0.8 });
      api.addGLB('models/user/animals/Pig_52_dqpm.glb', -8, 20, { scale: 0.2, yaw: 0.3 });
      api.addGLB('models/kenney/nature/graveyard/haybale.glb', 24, -4, { scale: 3 });
      api.addGLB('models/user/House1_41_skda.glb', -28, 23, { scale: 2.5 });
      api.addGLB('models/user/House2_39_vypb.glb', 28, 23, { scale: 2.5 });
      lights(api);
    },
  },

  ruin: {
    id: 'ruin', name: 'Ruin City', emoji: '🚁',
    desc: 'A downed helicopter in a ruined city — rubble everywhere.',
    sites: {
      A: { name: 'Wreck Yard', x: -24, z: -24, color: 0xf0a830 },
      B: { name: 'Crater Row', x: 24, z: -24, color: 0x37c8d8 },
      C: { name: 'Heli Pad', x: 0, z: 10, color: 0x7ddc7d },
    },
    ground: 0x9a9a9a, fog: 0x5a5a5a,
    waypoints: [
      { x: -30, z: -8 }, { x: -30, z: 8 }, { x: -12, z: 14 }, { x: 0, z: 6 },
      { x: 12, z: 14 }, { x: 30, z: 8 }, { x: 30, z: -8 }, { x: 14, z: -8 },
      { x: -14, z: -8 }, { x: 0, z: -12 }, { x: -20, z: 20 }, { x: 20, z: 20 },
      { x: 0, z: 20 }, { x: -6, z: -20 }, { x: 6, z: -20 },
      { x: -24, z: -24 }, { x: 24, z: -24 }, { x: 0, z: 10 },
    ],
    spawns: NORTH_HOUSE_SPAWNS,
    build(api) {
      api.addHouse({ x: -26, z: -14, rot: 90, floors: 3, color: 0x5a5a5e, roof: 0x2e2e32 });
      api.addHouse({ x: 26, z: -14, rot: 270, floors: 2, color: 0x4a4a4e, roof: 0x2e2e32 });
      api.addHouse({ x: 0, z: -22, rot: 0, floors: 3, color: 0x5a5a5e, roof: 0x2e2e32 });
      api.addCrashedHeli(0, 2, 0.6); // downed heli, tilted, fire + smoke
      api.addCar(-8, 8, 0.4, 0x2e2e2e); api.addCar(8, -6, -0.3, 0x3a3a3a); api.addCar(-14, 14, 1.2, 0x2e2e2e); // 3 wrecked
      api.addRubble(-10, 0, 2); api.addRubble(10, 0, 2);
      api.addRubble(-20, -6, 2.5); api.addRubble(20, -6, 2.5);
      api.addRubble(-6, 12, 2); api.addRubble(6, 12, 2);
      api.addRubble(-30, 4, 2); api.addRubble(30, 4, 2);
      api.addContainer(-20, 2, 6, 2.5, 0x3a3a3a);
      api.addContainer(20, -10, 2.5, 6, 0x4a4a4a);
      api.addContainer(-34, 20, 6, 2.5, 0x2e2e2e);
      api.addContainer(34, -20, 6, 2.5, 0x3a3a3a);
      // (Gameplay pass 2026-11-15: no container at (0,18) — it sat 6m in
      // front of the (0,24) spawn and walled off the view, same as cargo.)
      scatterCrates(api, [[-12, 8], [12, 6], [0, 17], [-4, -12], [20, 17], [-24, -2]]);
      scatterBarrels(api, [[-16, 4], [16, -6], [26, 2], [-30, 2], [8, 18], [-6, 18]]);
      api.addSandbag(-20, -14); api.addSandbag(20, -17);
      api.addSandbag(-8, 14); api.addSandbag(8, 8);
      api.addTower(34, 20, 8);
      // v17.1 ruin details: bridge, waving flag, TV.
      api.addBridge(24, 0, 20, 5, Math.PI / 2);
      api.addFlag(-30, 20, 0x3a3a3a);
      api.addTV(-24, 20, 0);
      // v18.9 ruin ambience: emergency light, graffiti, cans, papers, spark, oil.
      api.addEmergencyLight(-26, -8); api.addGraffiti(26, -8, 1.5, -Math.PI / 2, 0xff2222);
      api.addCans(6, 16, 5); api.addPapers(-10, 16, 6); api.addSpark(20, 14, 3);
      api.addOilPuddle(-18, 18);
      // v22.3/v22.4 ruin props: power poles, rocks, wood pile, trash can, road sign, parked cars, motor.
      api.addPowerPole(-18, -18); api.addPowerPole(18, 18);
      api.addRock(-32, -10); api.addRock(32, 10);
      api.addWoodPile(28, 16); api.addTrashCan(-4, 4); api.addRoadSign(10, -14);
      api.addParkedCar(-20, -2, 0.3, 0x3a3a3a); api.addParkedCar(20, 2, -0.3, 0x2e2e2e);
      // v27.0 ambient: doctor, dog, firefly, cat in the ruins.
      api.addNPC('doctor', -8, 20); api.addAnimal('dog', 14, 20);
      api.addAnimal('firefly', -26, 14); api.addAnimal('cat', 30, -14);
      // GLB props: graveyard cluster + dead pines + ruined facades + fire truck.
      api.addGLB('models/kenney/buildings/graveyard/crypt.glb', -30, -20, { scale: 3 });
      api.addGLB('models/kenney/buildings/graveyard/coffin.glb', -27, -19, { scale: 3, yaw: 0.4 });
      api.addGLB('models/kenney/props/graveyard/gravestone.glb', -24, -21, { scale: 1.5 });
      api.addGLB('models/kenney/nature/graveyard/pine-dead.glb', 30, -20, { scale: 3 });
      api.addGLB('models/kenney/nature/graveyard/pine-dead.glb', -32, 8, { scale: 3 });
      api.addGLB('models/kenney/nature/graveyard/haybale.glb', 24, 18, { scale: 3 });
      api.addGLB('models/user/Building1_Small_47_2o6l.glb', 36, -24, { scale: 2, yaw: -Math.PI / 2 });
      api.addGLB('models/kenney/buildings/building.glb', -36, 20, { scale: 8 });
      api.addGLB('models/lowpoly/fire_truck.glb', -16, 22, { yaw: Math.PI / 2 });
      lights(api);
    },
  },
};

export const MAP_IDS = Object.keys(MAP_DEFS);
