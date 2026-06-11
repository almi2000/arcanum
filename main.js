// ============ Arcanum — Entkomme dem Turm des Erzmagiers ============
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ---------- Grundgerüst ----------

const ROOM_RADIUS = 9;
const WALL_HEIGHT = 5.5;
const EYE_HEIGHT = 1.7;

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0a1a);
scene.fog = new THREE.FogExp2(0x0d0a1a, 0.028);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, EYE_HEIGHT, 4.5);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Toon-Verlauf: vier harte Stufen für den Märchenbuch-Look
const gradientData = new Uint8Array([60, 60, 60, 255, 120, 120, 120, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
const gradientMap = new THREE.DataTexture(gradientData, 4, 1, THREE.RGBAFormat);
gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;

function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap, ...opts });
}

// ---------- Licht ----------

scene.add(new THREE.HemisphereLight(0x4a5588, 0x2a1f14, 0.65));

const torchLights = [];
function makeTorch(angle) {
  const g = new THREE.Group();
  const r = ROOM_RADIUS - 0.45;
  g.position.set(Math.sin(angle) * r, 2.6, Math.cos(angle) * r);
  g.lookAt(0, 2.6, 0);

  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.7, 6), toon(0x4a3220));
  stick.rotation.x = Math.PI / 4;
  g.add(stick);

  const bracket = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 10), toon(0x3a3a44));
  bracket.position.set(0, 0.05, 0.12);
  g.add(bracket);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.42, 7),
    new THREE.MeshBasicMaterial({ color: 0xffb347 })
  );
  flame.position.set(0, 0.5, 0.25);
  g.add(flame);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff0b0 })
  );
  glow.position.copy(flame.position).y -= 0.12;
  g.add(glow);

  const light = new THREE.PointLight(0xff8c3a, 26, 16, 2);
  light.position.copy(flame.position);
  g.add(light);

  torchLights.push({ light, flame, seed: Math.random() * 100 });
  scene.add(g);
}
[Math.PI * 0.3, Math.PI * 0.7, Math.PI * 1.3, Math.PI * 1.7].forEach(makeTorch);

// ---------- Der Turmraum ----------

const DOOR_THETA_GAP = 0.28; // Wandlücke für die Tür (bei -Z, also theta = PI)
const wall = new THREE.Mesh(
  new THREE.CylinderGeometry(ROOM_RADIUS, ROOM_RADIUS, WALL_HEIGHT, 48, 1, true, Math.PI + DOOR_THETA_GAP / 2, Math.PI * 2 - DOOR_THETA_GAP),
  toon(0x565b70, { side: THREE.BackSide })
);
wall.position.y = WALL_HEIGHT / 2;
scene.add(wall);

const floor = new THREE.Mesh(new THREE.CircleGeometry(ROOM_RADIUS, 48), toon(0x6b4a2e));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Sockelleiste aus dunklem Stein
const skirt = new THREE.Mesh(
  new THREE.CylinderGeometry(ROOM_RADIUS - 0.05, ROOM_RADIUS + 0.1, 0.5, 48, 1, true, Math.PI + DOOR_THETA_GAP / 2, Math.PI * 2 - DOOR_THETA_GAP),
  toon(0x3a3d4d, { side: THREE.BackSide })
);
skirt.position.y = 0.25;
scene.add(skirt);

const ceiling = new THREE.Mesh(new THREE.CircleGeometry(ROOM_RADIUS, 48), toon(0x2c2438));
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = WALL_HEIGHT;
scene.add(ceiling);

// Deckenbalken
for (let i = 0; i < 6; i++) {
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, ROOM_RADIUS * 2 - 0.6), toon(0x4a3220));
  beam.position.y = WALL_HEIGHT - 0.12;
  beam.rotation.y = (i / 6) * Math.PI;
  scene.add(beam);
}

// Teppich
const carpet = new THREE.Mesh(new THREE.CircleGeometry(3.2, 32), toon(0x7a2230));
carpet.rotation.x = -Math.PI / 2;
carpet.position.y = 0.01;
scene.add(carpet);
const carpetRing = new THREE.Mesh(new THREE.RingGeometry(2.5, 2.75, 32), toon(0xc9a227));
carpetRing.rotation.x = -Math.PI / 2;
carpetRing.position.y = 0.02;
scene.add(carpetRing);

// Bogenfenster mit Nachthimmel + Mond
function makeWindow(angle, withMoon) {
  const g = new THREE.Group();
  const r = ROOM_RADIUS - 0.15;
  g.position.set(Math.sin(angle) * r, 3.1, Math.cos(angle) * r);
  g.lookAt(0, 3.1, 0);

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.6),
    new THREE.MeshBasicMaterial({ color: 0x1e2a55 })
  );
  g.add(sky);

  const arch = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 16, 0, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0x1e2a55 })
  );
  arch.position.y = 0.8;
  g.add(arch);

  if (withMoon) {
    const moon = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 20),
      new THREE.MeshBasicMaterial({ color: 0xe8ecff })
    );
    moon.position.set(0.18, 0.55, 0.02);
    g.add(moon);
    const moonlight = new THREE.PointLight(0x8aa0ff, 6, 10, 2);
    moonlight.position.z = 1;
    g.add(moonlight);
  }

  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.3), toon(0x3a3d4d));
  sill.position.set(0, -0.85, 0.1);
  g.add(sill);

  scene.add(g);
}
makeWindow(Math.PI * 0.5, true);
makeWindow(Math.PI * 1.5, false);
makeWindow(0, false);

// Schwebender Kristall unter der Decke
const crystal = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.45),
  new THREE.MeshBasicMaterial({ color: 0x7de8e0 })
);
crystal.position.set(0, WALL_HEIGHT - 1.2, 0);
scene.add(crystal);
const crystalLight = new THREE.PointLight(0x5fd8d0, 10, 14, 2);
crystalLight.position.copy(crystal.position);
scene.add(crystalLight);

// Staub in der Luft
const dustCount = 220;
const dustPos = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) {
  const a = Math.random() * Math.PI * 2;
  const rr = Math.random() * (ROOM_RADIUS - 1);
  dustPos[i * 3] = Math.sin(a) * rr;
  dustPos[i * 3 + 1] = Math.random() * WALL_HEIGHT;
  dustPos[i * 3 + 2] = Math.cos(a) * rr;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  color: 0xf0c84a, size: 0.035, transparent: true, opacity: 0.55, sizeAttenuation: true,
}));
scene.add(dust);

// ---------- Interaktion: Registry ----------

const interactables = [];
function register(object, label, onUse) {
  const entry = { object, label, onUse, enabled: true };
  object.traverse((c) => { c.userData.entry = entry; });
  object.userData.entry = entry;
  interactables.push(entry);
  return entry;
}

// ---------- Kollision ----------

const colliders = []; // { x, z, r }
function block(x, z, r) { colliders.push({ x, z, r }); }

// ---------- Möbel & Rätselobjekte ----------

const RUNES = {
  feuer: { name: 'Feuerrune', glyph: 'ᚠ', color: 0xff5a3c },
  mond: { name: 'Mondrune', glyph: 'ᛗ', color: 0x8aa0ff },
  stern: { name: 'Sternenrune', glyph: 'ᛏ', color: 0xf0c84a },
};

function runeStone(runeKey, scale = 1) {
  const rune = RUNES[runeKey];
  const g = new THREE.Group();
  const stone = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.16 * scale),
    new THREE.MeshBasicMaterial({ color: rune.color })
  );
  g.add(stone);
  const halo = new THREE.PointLight(rune.color, 3, 3, 2);
  g.add(halo);
  g.userData.spin = true;
  return g;
}

// --- Schreibtisch mit Zauberbuch ---
{
  const desk = new THREE.Group();
  desk.position.set(5.8, 0, 2.8);
  desk.rotation.y = -Math.PI / 3;

  const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.1), toon(0x5a3a22));
  top.position.y = 0.95;
  desk.add(top);
  for (const [dx, dz] of [[-0.95, -0.4], [0.95, -0.4], [-0.95, 0.4], [0.95, 0.4]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), toon(0x4a2e1a));
    leg.position.set(dx, 0.47, dz);
    desk.add(leg);
  }

  // aufgeschlagenes Buch
  const book = new THREE.Group();
  book.position.set(0.1, 1.04, 0);
  const pageL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.6), toon(0xe9d8ab));
  pageL.position.x = -0.21; pageL.rotation.z = 0.12;
  const pageR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.6), toon(0xe9d8ab));
  pageR.position.x = 0.21; pageR.rotation.z = -0.12;
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.04, 0.66), toon(0x6b1f2a));
  spine.position.y = -0.04;
  book.add(pageL, pageR, spine);
  desk.add(book);

  // Tintenfass + Feder
  const ink = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.12, 8), toon(0x22263a));
  ink.position.set(-0.7, 1.07, -0.25);
  desk.add(ink);
  const quill = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.5, 5), toon(0xdde4f0));
  quill.position.set(-0.68, 1.3, -0.24);
  quill.rotation.z = 0.5;
  desk.add(quill);

  scene.add(desk);
  block(5.8, 2.8, 1.5);

  register(book, 'Zauberbuch lesen', () => {
    openReading('Vom Wesen der vier Flammen', `
      <p>»Wer das Wächterfeuer wecken will, entzünde die Kerzen, wie die Welt entstand:</p>
      <p><i>Zuerst erwacht die <b>Sonne</b>,<br>
      dann vergießt das Herz sein <b>Blut</b>,<br>
      es folgt das tiefe <b>Meer</b>,<br>
      und zuletzt schweigt der <b>Wald</b>.</i>«</p>
      <p>Darunter, hastig gekritzelt: <i>Schlüssel wieder in die Schatulle legen!! Nicht vergessen!!</i></p>
    `);
    if (state.objectivePhase === 0) setObjective(1);
  });
}

// --- Bücherregal mit Mondrune ---
{
  const shelf = new THREE.Group();
  shelf.position.set(-6.6, 0, 3.2);
  shelf.lookAt(0, 0, 0);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 0.5), toon(0x4a2e1a));
  frame.position.y = 1.6;
  shelf.add(frame);

  const bookColors = [0x7a2230, 0x2e4a6b, 0x3f6b3a, 0xc9a227, 0x6b3a7a, 0x8c4a2e];
  for (let row = 0; row < 4; row++) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.46), toon(0x5a3a22));
    board.position.set(0, 0.5 + row * 0.72, 0.03);
    shelf.add(board);
    let x = -1.05;
    while (x < 0.95) {
      const w = 0.1 + Math.random() * 0.14;
      const h = 0.38 + Math.random() * 0.22;
      // eine Lücke pro Regal lassen
      if (Math.random() < 0.12) { x += 0.25; continue; }
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 0.3),
        toon(bookColors[Math.floor(Math.random() * bookColors.length)])
      );
      b.position.set(x + w / 2, 0.53 + row * 0.72 + h / 2, 0.08);
      b.rotation.z = (Math.random() - 0.5) * 0.08;
      shelf.add(b);
      x += w + 0.02;
    }
  }

  // Mondrune zwischen den Büchern
  const moonRune = runeStone('mond', 0.9);
  moonRune.position.set(0.4, 2.0, 0.3);
  shelf.add(moonRune);
  register(moonRune, 'Mondrune nehmen', (entry) => {
    collectRune('mond', entry, moonRune);
  });

  scene.add(shelf);
  block(-6.6, 3.2, 1.7);
}

// --- Kessel mit Feuerrune ---
{
  const cauldron = new THREE.Group();
  cauldron.position.set(5.2, 0, -3.4);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), toon(0x2c2f3a));
  body.scale.y = 0.85;
  body.position.y = 0.75;
  cauldron.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 8, 20), toon(0x3a3d4d));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.32;
  cauldron.add(rim);
  for (let i = 0; i < 3; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6), toon(0x22242e));
    const a = (i / 3) * Math.PI * 2;
    leg.position.set(Math.sin(a) * 0.5, 0.2, Math.cos(a) * 0.5);
    cauldron.add(leg);
  }

  // grünes Gebräu
  const brew = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), new THREE.MeshBasicMaterial({ color: 0x52d273 }));
  brew.rotation.x = -Math.PI / 2;
  brew.position.y = 1.28;
  cauldron.add(brew);
  const brewLight = new THREE.PointLight(0x52d273, 7, 6, 2);
  brewLight.position.y = 1.7;
  cauldron.add(brewLight);

  scene.add(cauldron);
  block(5.2, -3.4, 1.2);

  register(cauldron, 'Im Kessel wühlen', (entry) => {
    if (entry.searched) return;
    entry.searched = true;
    entry.label = 'Kessel';
    const fireRune = runeStone('feuer', 0.9);
    fireRune.position.set(5.2, 1.55, -3.4);
    scene.add(fireRune);
    toast('Zwischen Kräuterresten und etwas, das besser unbenannt bleibt: eine Feuerrune!');
    sound.pickup();
    register(fireRune, 'Feuerrune nehmen', (e2) => collectRune('feuer', e2, fireRune));
  });
}

// --- Kisten mit Sternenrune ---
{
  const crates = new THREE.Group();
  crates.position.set(1.6, 0, 6.4);
  crates.rotation.y = 0.4;

  const c1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), toon(0x6b4a2e));
  c1.position.y = 0.5;
  const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), toon(0x5a3a22));
  c2.position.set(1, 0.4, 0.2);
  c2.rotation.y = 0.5;
  const c3 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), toon(0x7a5a3a));
  c3.position.set(0.3, 1.35, 0);
  c3.rotation.y = -0.3;
  crates.add(c1, c2, c3);
  scene.add(crates);
  block(1.9, 6.4, 1.4);

  const starRune = runeStone('stern', 0.9);
  starRune.position.set(2.3, 0.45, 5.5);
  scene.add(starRune);
  register(starRune, 'Sternenrune nehmen', (entry) => collectRune('stern', entry, starRune));
}

// --- Kerzentisch (Rätsel 2) ---
const CANDLE_ORDER = ['gold', 'rot', 'blau', 'gruen'];
const CANDLE_DEFS = {
  gold: { color: 0xf0c84a, name: 'die goldene Kerze' },
  rot: { color: 0xc23a3a, name: 'die rote Kerze' },
  blau: { color: 0x3a6bc2, name: 'die blaue Kerze' },
  gruen: { color: 0x3f8c3a, name: 'die grüne Kerze' },
};
const candles = {};
{
  const table = new THREE.Group();
  table.position.set(-5.4, 0, -3.6);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 20), toon(0x5a3a22));
  top.position.y = 0.9;
  table.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.9, 8), toon(0x4a2e1a));
  leg.position.y = 0.45;
  table.add(leg);

  const spots = { gold: [-0.45, -0.3], rot: [0.45, -0.3], blau: [-0.45, 0.4], gruen: [0.45, 0.4] };
  for (const key of Object.keys(spots)) {
    const def = CANDLE_DEFS[key];
    const [cx, cz] = spots[key];
    const g = new THREE.Group();
    g.position.set(cx, 0.95, cz);

    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.45, 10), toon(def.color));
    wax.position.y = 0.22;
    g.add(wax);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 7), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
    flame.position.y = 0.55;
    flame.visible = false;
    g.add(flame);
    const light = new THREE.PointLight(def.color, 0, 4, 2);
    light.position.y = 0.6;
    g.add(light);

    table.add(g);
    candles[key] = { group: g, flame, light, lit: false };
    register(g, `${def.name[0].toUpperCase()}${def.name.slice(1)} entzünden`, () => lightCandle(key));
  }

  scene.add(table);
  block(-5.4, -3.6, 1.2);
}

// --- Schatulle mit Schlüssel ---
let chest, chestLid;
{
  chest = new THREE.Group();
  chest.position.set(-6.9, 0, -1.2);
  chest.lookAt(0, 0, 0);

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.65), toon(0x6b3a1a));
  base.position.y = 0.25;
  chest.add(base);

  chestLid = new THREE.Group();
  chestLid.position.set(0, 0.5, -0.32);
  const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.65), toon(0x7a4a26));
  lidMesh.position.set(0, 0.11, 0.32);
  chestLid.add(lidMesh);
  chest.add(chestLid);

  for (const dx of [-0.4, 0.4]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.68), toon(0xc9a227));
    band.position.set(dx, 0.26, 0);
    chest.add(band);
  }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.08), toon(0xc9a227));
  lock.position.set(0, 0.45, 0.36);
  chest.add(lock);

  scene.add(chest);
  block(-6.9, -1.2, 1.0);

  register(chest, 'Schatulle öffnen', (entry) => {
    if (!state.candlesSolved) {
      toast('Verschlossen. Noch.');
      sound.thud();
      return;
    }
    if (state.chestOpened) return;
    state.chestOpened = true;
    entry.label = 'Schatulle';
    animations.push({ t: 0, dur: 0.8, fn: (k) => { chestLid.rotation.x = -k * 1.9; } });
    const key = new THREE.Group();
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 12), new THREE.MeshBasicMaterial({ color: 0xf0c84a }));
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 6), new THREE.MeshBasicMaterial({ color: 0xf0c84a }));
    shaft.position.y = -0.16;
    const bit = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0xf0c84a }));
    bit.position.set(0.04, -0.26, 0);
    key.add(bow, shaft, bit);
    key.position.copy(chest.position).y = 0.75;
    key.userData.spin = true;
    const keyLight = new THREE.PointLight(0xf0c84a, 3, 3, 2);
    key.add(keyLight);
    scene.add(key);
    toast('Die Schatulle springt auf. Darin: ein Messingschlüssel.');
    sound.success();
    register(key, 'Messingschlüssel nehmen', (e2) => {
      e2.enabled = false;
      scene.remove(key);
      state.hasKey = true;
      fillSlot('key');
      toast('Der Messingschlüssel ist warm, als hätte ihn nie jemand abgelegt.');
      sound.pickup();
      updateObjective();
    });
  });
}

// --- Sockel vor der Tür (Rätsel 1) ---
const pedestals = [];
{
  const positions = [[-2.4, -4.6], [0, -5.3], [2.4, -4.6]];
  for (let i = 0; i < 3; i++) {
    const [px, pz] = positions[i];
    const g = new THREE.Group();
    g.position.set(px, 0, pz);

    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.1, 10), toon(0x565b70));
    column.position.y = 0.55;
    g.add(column);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.14, 10), toon(0x3a3d4d));
    cap.position.y = 1.15;
    g.add(cap);

    scene.add(g);
    block(px, pz, 0.65);

    const ped = { group: g, filled: false };
    pedestals.push(ped);
    register(g, 'Rune einsetzen', () => placeRune(ped));
  }
}

// --- Die versiegelte Tür ---
let doorPivot, sealRing, sealLight;
{
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, 0, -ROOM_RADIUS + 0.1);

  // Rahmen
  for (const dx of [-1.25, 1.25]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.8, 0.7), toon(0x3a3d4d));
    post.position.set(dx, 1.9, 0);
    doorGroup.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.5, 0.7), toon(0x3a3d4d));
  lintel.position.y = 3.85;
  doorGroup.add(lintel);
  const filler = new THREE.Mesh(new THREE.BoxGeometry(2.95, WALL_HEIGHT - 4.1, 0.4), toon(0x565b70));
  filler.position.y = 4.1 + (WALL_HEIGHT - 4.1) / 2;
  doorGroup.add(filler);

  // Türflügel mit Angel links
  doorPivot = new THREE.Group();
  doorPivot.position.set(-1.0, 0, 0);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.6, 0.18), toon(0x4a2e1a));
  panel.position.set(1.0, 1.8, 0);
  doorPivot.add(panel);
  for (const by of [0.9, 2.7]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 0.22), toon(0x2c2f3a));
    band.position.set(1.0, by, 0);
    doorPivot.add(band);
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), toon(0xc9a227));
  knob.position.set(1.75, 1.7, 0.14);
  doorPivot.add(knob);
  doorGroup.add(doorPivot);

  // Magisches Siegel
  sealRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.05, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xb05aff, transparent: true, opacity: 0.95 })
  );
  sealRing.position.set(0, 1.9, 0.25);
  doorGroup.add(sealRing);
  const sealInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.03, 8, 30),
    new THREE.MeshBasicMaterial({ color: 0xb05aff, transparent: true, opacity: 0.8 })
  );
  sealInner.position.copy(sealRing.position);
  sealInner.userData.counter = true;
  sealRing.userData.inner = sealInner;
  doorGroup.add(sealInner);
  sealLight = new THREE.PointLight(0xb05aff, 9, 8, 2);
  sealLight.position.set(0, 1.9, 1);
  doorGroup.add(sealLight);

  scene.add(doorGroup);

  // Flur dahinter
  const hallway = new THREE.Group();
  hallway.position.set(0, 0, -ROOM_RADIUS);
  const hwFloor = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 5), toon(0x3a3d4d));
  hwFloor.position.set(0, -0.05, -2.5);
  hallway.add(hwFloor);
  for (const dx of [-1.3, 1.3]) {
    const hwWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 5), toon(0x2c2f3a));
    hwWall.position.set(dx, 2, -2.5);
    hallway.add(hwWall);
  }
  const hwCeil = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 5), toon(0x22242e));
  hwCeil.position.set(0, 4, -2.5);
  hallway.add(hwCeil);
  // Licht der Freiheit am Ende
  const exitGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4), new THREE.MeshBasicMaterial({ color: 0xfff2cc }));
  exitGlow.position.set(0, 2, -4.9);
  hallway.add(exitGlow);
  const exitLight = new THREE.PointLight(0xfff2cc, 14, 12, 2);
  exitLight.position.set(0, 2, -4);
  hallway.add(exitLight);
  scene.add(hallway);

  register(doorPivot, 'Tür', () => {
    if (state.doorOpen) return;
    if (!state.sealBroken) {
      toast('Die Tür ist magisch versiegelt.');
      sound.thud();
    } else if (!state.hasKey) {
      toast('Das Siegel ist gebrochen, doch das Schloss hält noch.');
      sound.thud();
    } else {
      openDoor();
    }
  });
}

// ---------- Spielzustand ----------

const state = {
  runes: [],          // eingesammelte, noch nicht gesetzte Runen
  runesPlaced: 0,
  sealBroken: false,
  candleProgress: 0,
  candlesSolved: false,
  chestOpened: false,
  hasKey: false,
  doorOpen: false,
  escaped: false,
  objectivePhase: 0,
  startTime: null,
};

const animations = []; // { t, dur, fn(k), done? }

function collectRune(key, entry, mesh) {
  entry.enabled = false;
  mesh.removeFromParent();
  state.runes.push(key);
  fillSlot(key === 'feuer' ? 'feuer' : key);
  toast(`Die ${RUNES[key].name} summt leise in deiner Hand.`);
  sound.pickup();
  if (state.objectivePhase < 2) setObjective(2);
  updateObjective();
}

function placeRune(ped) {
  if (ped.filled) return;
  if (state.runes.length === 0) {
    toast('Eine runde Mulde — leer.');
    sound.thud();
    return;
  }
  const key = state.runes.shift();
  ped.filled = true;
  state.runesPlaced++;
  document.getElementById(`slot-${key === 'feuer' ? 'feuer' : key}`).classList.add('used');

  const stone = runeStone(key, 1.1);
  stone.position.set(0, 1.45, 0);
  ped.group.add(stone);
  sound.place();

  if (state.runesPlaced === 3) {
    state.sealBroken = true;
    toast('Die drei Runen flammen auf — das Siegel an der Tür zerbirst in violette Funken!');
    sound.success();
    animations.push({
      t: 0, dur: 1.6, fn: (k) => {
        sealRing.material.opacity = 0.95 * (1 - k);
        sealRing.userData.inner.material.opacity = 0.8 * (1 - k);
        sealRing.scale.setScalar(1 + k * 2.5);
        sealRing.userData.inner.scale.setScalar(1 + k * 3.5);
        sealLight.intensity = 9 * (1 - k);
      },
      onDone: () => { sealRing.visible = false; sealRing.userData.inner.visible = false; }
    });
  } else {
    toast('Die Rune rastet ein.');
  }
  updateObjective();
}

function lightCandle(key) {
  const c = candles[key];
  if (state.candlesSolved || c.lit) return;
  const expected = CANDLE_ORDER[state.candleProgress];
  c.lit = true;
  c.flame.visible = true;
  c.light.intensity = 5;
  sound.flame();

  if (key === expected) {
    state.candleProgress++;
    if (state.candleProgress === 4) {
      state.candlesSolved = true;
      toast('Vier Flammen tanzen im Takt. Irgendwo klickt zustimmend ein Schloss.');
      sound.success();
      updateObjective();
    }
  } else {
    // falsche Reihenfolge: kurz brennen lassen, dann alles löschen
    setTimeout(() => {
      for (const k of Object.keys(candles)) {
        candles[k].lit = false;
        candles[k].flame.visible = false;
        candles[k].light.intensity = 0;
      }
      state.candleProgress = 0;
      toast('Ein kalter Windhauch — alle Flammen erlöschen zischend.');
      sound.thud();
    }, 600);
  }
}

function openDoor() {
  state.doorOpen = true;
  toast('Der Schlüssel dreht sich dreimal. Die Tür schwingt knarrend auf — Freiheit!');
  sound.door();
  document.getElementById('slot-key').classList.add('used');
  animations.push({
    t: 0, dur: 2.2, fn: (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      doorPivot.rotation.y = -e * 1.9;
    }
  });
  setObjective(5);
}

// ---------- Aufgaben-Text ----------

const OBJECTIVES = [
  'Du bist eingeschlossen. Finde selbst einen Weg hinaus.',
  'Überall liegen Spuren alter Zauberei. Sieh genauer hin.',
  'Diese Tür verlangt nach mehr als nur einem beherzten Griff.',
  'Die Tür gibt langsam nach — doch noch hält etwas sie fest.',
  'Beinahe frei. Ein letzter Widerstand bleibt.',
  'Lauf! Durch den Gang, bevor der Erzmagier zurückkehrt!',
];

function setObjective(phase) {
  state.objectivePhase = phase;
  document.getElementById('objective-text').textContent = OBJECTIVES[phase];
}

function updateObjective() {
  if (state.doorOpen) return setObjective(5);
  if (state.sealBroken && state.candlesSolved && !state.hasKey) return setObjective(4);
  if (state.sealBroken && !state.candlesSolved) return setObjective(3);
  if (state.hasKey && !state.sealBroken) return setObjective(2);
  if (state.objectivePhase === 1 && state.runes.length + state.runesPlaced > 0) return setObjective(2);
}

// ---------- HUD-Helfer ----------

let toastTimeout;
function toast(msg, ms = 4200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove('show'), ms);
}

function fillSlot(key) {
  document.getElementById(`slot-${key}`).classList.add('filled');
}

let readingOpen = false;
function openReading(title, html) {
  readingOpen = true;
  document.getElementById('reading-title').textContent = title;
  document.getElementById('reading-body').innerHTML = html;
  document.getElementById('reading').classList.remove('hidden');
}
function closeReading() {
  readingOpen = false;
  document.getElementById('reading').classList.add('hidden');
}

// ---------- Klang (WebAudio, rein synthetisch) ----------

const sound = (() => {
  let ctx;
  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.12, when = 0) {
    const a = ac();
    const t0 = a.currentTime + when;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
  return {
    unlock() { ac().resume(); },
    pickup() { tone(660, 0.15); tone(990, 0.25, 'sine', 0.1, 0.08); },
    place() { tone(440, 0.2, 'triangle'); tone(550, 0.3, 'triangle', 0.08, 0.1); },
    flame() { tone(330, 0.12, 'triangle', 0.08); },
    thud() { tone(110, 0.25, 'square', 0.06); },
    success() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'sine', 0.1, i * 0.12)); },
    door() { tone(80, 1.2, 'sawtooth', 0.05); tone(60, 1.5, 'square', 0.04, 0.2); [392, 523, 659].forEach((f, i) => tone(f, 0.5, 'sine', 0.08, 0.5 + i * 0.15)); },
  };
})();

// ---------- Steuerung ----------

const controls = new PointerLockControls(camera, document.body);
const keys = {};
document.addEventListener('keydown', (e) => { keys[e.code] = true; });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

const titleScreen = document.getElementById('title-screen');
const pauseScreen = document.getElementById('pause-screen');
const winScreen = document.getElementById('win-screen');
const hud = document.getElementById('hud');
const nextRoomUrl = 'room2.html?autostart=1';

document.getElementById('start-btn').addEventListener('click', () => {
  sound.unlock();
  controls.lock();
});
document.getElementById('resume-btn').addEventListener('click', () => controls.lock());
document.getElementById('again-btn').addEventListener('click', () => { window.location.href = 'room2.html'; });

controls.addEventListener('lock', () => {
  titleScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  if (!state.startTime) state.startTime = performance.now();
});
controls.addEventListener('unlock', () => {
  if (state.escaped) return;
  closeReading();
  pauseScreen.classList.remove('hidden');
});

// ---------- Interaktion (Raycast) ----------

const raycaster = new THREE.Raycaster();
raycaster.far = 3.6;
const center = new THREE.Vector2(0, 0);
let hovered = null;

function updateHover() {
  raycaster.setFromCamera(center, camera);
  const meshes = [];
  for (const e of interactables) if (e.enabled) meshes.push(e.object);
  const hits = raycaster.intersectObjects(meshes, true);
  hovered = hits.length ? hits[0].object.userData.entry : null;
  document.getElementById('hover-label').textContent = hovered ? hovered.label : '';
  document.getElementById('crosshair').classList.toggle('active', !!hovered);
}

function interact() {
  if (readingOpen) { closeReading(); return; }
  if (hovered && hovered.enabled) hovered.onUse(hovered);
}

document.addEventListener('mousedown', (e) => {
  if (controls.isLocked && e.button === 0) interact();
});
document.addEventListener('keydown', (e) => {
  if (controls.isLocked && e.code === 'KeyE') interact();
});

// ---------- Bewegung & Kollision ----------

const velocity = new THREE.Vector3();
function move(dt) {
  const speed = 4.2;
  const fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const side = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  velocity.x = THREE.MathUtils.damp(velocity.x, side * speed, 12, dt);
  velocity.z = THREE.MathUtils.damp(velocity.z, fwd * speed, 12, dt);
  controls.moveRight(velocity.x * dt);
  controls.moveForward(velocity.z * dt);

  const p = camera.position;
  p.y = EYE_HEIGHT;

  // Im Türgang freie Bahn, sonst Kreisraum
  const inDoorway = state.doorOpen && Math.abs(p.x) < 1.0 && p.z < -7.5;
  if (!inDoorway) {
    const r = Math.hypot(p.x, p.z);
    const maxR = ROOM_RADIUS - 0.55;
    if (r > maxR) {
      p.x = (p.x / r) * maxR;
      p.z = (p.z / r) * maxR;
    }
  } else {
    p.x = THREE.MathUtils.clamp(p.x, -0.9, 0.9);
  }

  // Möbel
  for (const c of colliders) {
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const d = Math.hypot(dx, dz);
    const min = c.r + 0.35;
    if (d < min && d > 0.0001) {
      p.x = c.x + (dx / d) * min;
      p.z = c.z + (dz / d) * min;
    }
  }

  // Flucht geschafft?
  if (state.doorOpen && !state.escaped && p.z < -ROOM_RADIUS - 2.5) {
    win();
  }
}

function win() {
  state.escaped = true;
  controls.unlock();
  sound.success();
  window.location.href = nextRoomUrl;
}

// ---------- Hauptschleife ----------

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // Fackelflackern
  for (const torch of torchLights) {
    const n = Math.sin(t * 11 + torch.seed) * 0.5 + Math.sin(t * 23 + torch.seed * 2) * 0.3;
    torch.light.intensity = 26 + n * 7;
    torch.flame.scale.setScalar(1 + n * 0.12);
  }

  // Kristall
  crystal.rotation.y = t * 0.6;
  crystal.rotation.x = Math.sin(t * 0.4) * 0.3;
  crystal.position.y = WALL_HEIGHT - 1.2 + Math.sin(t * 0.8) * 0.12;
  crystalLight.position.copy(crystal.position);

  // Siegel pulsiert
  if (!state.sealBroken) {
    sealRing.rotation.z = t * 0.5;
    sealRing.userData.inner.rotation.z = -t * 0.8;
    sealLight.intensity = 9 + Math.sin(t * 3) * 2.5;
  }

  // Schwebende Objekte (Runen, Schlüssel)
  scene.traverse((o) => {
    if (o.userData.spin) {
      o.rotation.y += dt * 1.5;
      o.position.y += Math.sin(t * 2 + o.id) * 0.0012;
    }
  });

  // Staub treibt
  const pos = dust.geometry.attributes.position;
  for (let i = 0; i < dustCount; i++) {
    let y = pos.getY(i) + dt * 0.06;
    if (y > WALL_HEIGHT) y = 0;
    pos.setY(i, y);
  }
  pos.needsUpdate = true;

  // Animationen
  for (const a of animations) {
    if (a.done) continue;
    a.t += dt;
    const k = Math.min(a.t / a.dur, 1);
    a.fn(k);
    if (k >= 1) { a.done = true; if (a.onDone) a.onDone(); }
  }

  if (controls.isLocked && !state.escaped) {
    move(dt);
    updateHover();
    if (state.startTime) {
      const secs = Math.floor((performance.now() - state.startTime) / 1000);
      const mm = String(Math.floor(secs / 60)).padStart(2, '0');
      const ss = String(secs % 60).padStart(2, '0');
      document.getElementById('timer').textContent = `${mm}:${ss}`;
    }
  }

  renderer.render(scene, camera);
}

animate();
