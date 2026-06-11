// ============ Arcanum — Raum 2: Das Observatorium des Erzmagiers ============
//
// Architektur-Hinweis (für die spätere Zusammenführung aller Räume):
// Dieser Raum ist – wie Raum 1 (main.js) – als eigenständiges, in sich
// geschlossenes Modul aufgebaut: gleiches Grundgerüst (Renderer, Toon-Look,
// Fackeln, Wandkreis mit Türlücke), gleiche Interaktions-Registry, gleiche
// Bewegungs-/Kollisionslogik und derselbe Tür-/Sieg-Ablauf.
// Zum Testen wird jeder Raum für sich geladen (room2.html). Für ein späteres
// Gesamtspiel kann diese Datei zu einer init()-Funktion gekapselt werden, die
// vom selben Loader nacheinander aufgerufen wird – die hier verwendeten
// Bausteine (toon(), register(), block(), animations, sound, HUD-Helfer)
// existieren bereits identisch in Raum 1.
//
// Zwei Rätsel öffnen die Tür:
//   1) Das Astrolabium – drei Ringe auf die richtige Konstellation drehen.
//   2) Der Mondpfad    – drei Spiegel so stellen, dass der Strahl das Tor trifft.

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
scene.background = new THREE.Color(0x0a0814);
scene.fog = new THREE.FogExp2(0x0a0814, 0.03);

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

// Kleine Text-Beschriftung als Canvas-Textur (für die Astrolabium-Marken)
function makeLabel(text, color = '#e9d8ab') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.font = '700 54px "Grenze Gotisch", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.shadowColor = 'rgba(0,0,0,0.8)';
  g.shadowBlur = 8;
  g.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  return mesh;
}

// ---------- Licht ----------

scene.add(new THREE.HemisphereLight(0x394066, 0x1a1408, 0.55));

const torchLights = [];
function makeTorch(angle) {
  const grp = new THREE.Group();
  const r = ROOM_RADIUS - 0.45;
  grp.position.set(Math.sin(angle) * r, 2.6, Math.cos(angle) * r);
  grp.lookAt(0, 2.6, 0);

  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.7, 6), toon(0x4a3220));
  stick.rotation.x = Math.PI / 4;
  grp.add(stick);

  const bracket = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 10), toon(0x3a3a44));
  bracket.position.set(0, 0.05, 0.12);
  grp.add(bracket);

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 7), new THREE.MeshBasicMaterial({ color: 0x9ec6ff }));
  flame.position.set(0, 0.5, 0.25);
  grp.add(flame);

  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xdfeaff }));
  glow.position.copy(flame.position).y -= 0.12;
  grp.add(glow);

  // Im Observatorium brennen kühle, magische Geisterflammen
  const light = new THREE.PointLight(0x6f9cff, 20, 15, 2);
  light.position.copy(flame.position);
  grp.add(light);

  torchLights.push({ light, flame, seed: Math.random() * 100 });
  scene.add(grp);
}
[Math.PI * 0.3, Math.PI * 0.7, Math.PI * 1.3, Math.PI * 1.7].forEach(makeTorch);

// ---------- Der Turmraum (Observatorium) ----------

const DOOR_THETA_GAP = 0.28; // Wandlücke für die Tür (bei -Z, also theta = PI)
const wall = new THREE.Mesh(
  new THREE.CylinderGeometry(ROOM_RADIUS, ROOM_RADIUS, WALL_HEIGHT, 48, 1, true, Math.PI + DOOR_THETA_GAP / 2, Math.PI * 2 - DOOR_THETA_GAP),
  toon(0x47506e, { side: THREE.BackSide })
);
wall.position.y = WALL_HEIGHT / 2;
scene.add(wall);

const floor = new THREE.Mesh(new THREE.CircleGeometry(ROOM_RADIUS, 48), toon(0x3a3550));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const skirt = new THREE.Mesh(
  new THREE.CylinderGeometry(ROOM_RADIUS - 0.05, ROOM_RADIUS + 0.1, 0.5, 48, 1, true, Math.PI + DOOR_THETA_GAP / 2, Math.PI * 2 - DOOR_THETA_GAP),
  toon(0x2a2d40, { side: THREE.BackSide })
);
skirt.position.y = 0.25;
scene.add(skirt);

// Kuppeldecke mit Okulus (offener Sternenhimmel)
const dome = new THREE.Mesh(
  new THREE.SphereGeometry(ROOM_RADIUS, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2),
  toon(0x1d1933, { side: THREE.BackSide })
);
dome.position.y = WALL_HEIGHT;
scene.add(dome);

// Okulus-Ring
const oculus = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.18, 10, 32), toon(0x2a2d40));
oculus.rotation.x = Math.PI / 2;
oculus.position.y = WALL_HEIGHT + ROOM_RADIUS * 0.18;
scene.add(oculus);
const oculusSky = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), new THREE.MeshBasicMaterial({ color: 0x10204a }));
oculusSky.rotation.x = Math.PI / 2;
oculusSky.position.y = WALL_HEIGHT + ROOM_RADIUS * 0.18 - 0.01;
scene.add(oculusSky);
const oculusMoon = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), new THREE.MeshBasicMaterial({ color: 0xe8ecff }));
oculusMoon.rotation.x = Math.PI / 2;
oculusMoon.position.set(0.5, WALL_HEIGHT + ROOM_RADIUS * 0.18 - 0.02, 0.3);
scene.add(oculusMoon);
const moonLight = new THREE.PointLight(0x9ab4ff, 9, 22, 2);
moonLight.position.set(0.5, WALL_HEIGHT - 0.5, 0.3);
scene.add(moonLight);

// Sterne unter der Kuppel
const starCount = 320;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const u = Math.random() * Math.PI * 2;
  const v = Math.random() * 0.42 * Math.PI; // obere Halbkugel
  const r = ROOM_RADIUS - 0.3;
  starPos[i * 3] = Math.sin(v) * Math.cos(u) * r;
  starPos[i * 3 + 1] = WALL_HEIGHT + Math.cos(v) * r * 0.35;
  starPos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 0.07, transparent: true, opacity: 0.9 }));
scene.add(stars);

// Sternkarten-Boden-Intarsie
const inlay = new THREE.Mesh(new THREE.RingGeometry(3.0, 3.25, 48), toon(0x8aa0ff));
inlay.rotation.x = -Math.PI / 2;
inlay.position.y = 0.02;
scene.add(inlay);
const inlay2 = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.32, 48), toon(0xc9a227));
inlay2.rotation.x = -Math.PI / 2;
inlay2.position.y = 0.02;
scene.add(inlay2);

// Bogenfenster
function makeWindow(angle) {
  const grp = new THREE.Group();
  const r = ROOM_RADIUS - 0.15;
  grp.position.set(Math.sin(angle) * r, 3.1, Math.cos(angle) * r);
  grp.lookAt(0, 3.1, 0);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6), new THREE.MeshBasicMaterial({ color: 0x16234d }));
  grp.add(sky);
  const arch = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x16234d }));
  arch.position.y = 0.8;
  grp.add(arch);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.3), toon(0x2a2d40));
  sill.position.set(0, -0.85, 0.1);
  grp.add(sill);
  scene.add(grp);
}
makeWindow(Math.PI * 0.5);
makeWindow(Math.PI * 1.5);

// Schwebender Kristall
const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), new THREE.MeshBasicMaterial({ color: 0x9ab4ff }));
crystal.position.set(0, WALL_HEIGHT - 1.4, 0);
scene.add(crystal);

// Staub
const dustCount = 200;
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
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x9ab4ff, size: 0.03, transparent: true, opacity: 0.5, sizeAttenuation: true }));
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

// ---------- Spielzustand ----------

const state = {
  astroSolved: false,
  lightSolved: false,
  sealBroken: false,
  doorOpen: false,
  escaped: false,
  objectivePhase: 0,
  startTime: null,
};

const animations = []; // { t, dur, fn(k), done?, onDone? }

// =====================================================================
//  RÄTSEL 1 — DAS ASTROLABIUM
//  Drei Ringe; jeder Klick dreht einen Ring eine Marke weiter (6 Marken).
//  Ziel: jeder Ring zeigt auf das in der Sternenkarte genannte Gestirn.
// =====================================================================

const MARK_NAMES = ['STERN', 'MOND', 'SONNE', 'DRACHE', 'KRONE', 'AUGE'];
const ASTRO_TARGETS = { outer: 4 /* KRONE */, middle: 2 /* SONNE */, inner: 5 /* AUGE */ };
const astroRings = [];

{
  const console3d = new THREE.Group();
  console3d.position.set(-4.6, 0, 1.6);

  // Säule + Teller
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.0, 12), toon(0x2a2d40));
  column.position.y = 0.5;
  console3d.add(column);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.15, 0.16, 32), toon(0x3a3d55));
  dish.position.y = 1.05;
  console3d.add(dish);

  // Feste Sternmarken (Beschriftung) rund um den Teller
  const markRadius = 1.05;
  for (let i = 0; i < 6; i++) {
    const ang = i * (Math.PI / 3); // Marke i bei +Z gedreht um i*60°
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xc9a227 }));
    dot.position.set(Math.sin(ang) * markRadius, 1.16, Math.cos(ang) * markRadius);
    console3d.add(dot);
    const label = makeLabel(MARK_NAMES[i]);
    label.rotation.x = -Math.PI / 2;
    label.position.set(Math.sin(ang) * (markRadius - 0.02), 1.15, Math.cos(ang) * (markRadius - 0.02));
    console3d.add(label);
  }

  // Die drei drehbaren Ringe
  const ringDefs = [
    { key: 'outer', radius: 0.92, y: 1.16, color: 0x6f9cff },
    { key: 'middle', radius: 0.66, y: 1.20, color: 0x8a6bff },
    { key: 'inner', radius: 0.4, y: 1.24, color: 0xc9a227 },
  ];

  for (const def of ringDefs) {
    const ring = new THREE.Group();
    ring.position.y = def.y;

    const torus = new THREE.Mesh(new THREE.TorusGeometry(def.radius, 0.045, 8, 40), toon(def.color, { emissive: def.color, emissiveIntensity: 0.15 }));
    torus.rotation.x = Math.PI / 2;
    ring.add(torus);

    // Zeiger nach +Z (zeigt bei Index 0 auf die Marke STERN)
    const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 6), new THREE.MeshBasicMaterial({ color: 0xe9d8ab }));
    pointer.rotation.x = Math.PI / 2;
    pointer.position.set(0, 0, def.radius + 0.02);
    ring.add(pointer);

    // Feedback-Edelstein an der Zeigerspitze
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07), new THREE.MeshBasicMaterial({ color: 0xb05aff }));
    gem.position.set(0, 0.02, def.radius + 0.16);
    ring.add(gem);

    console3d.add(ring);
    const data = { key: def.key, ring, gem, index: 0, target: ASTRO_TARGETS[def.key], correct: false };
    astroRings.push(data);

    register(torus, `${def.key === 'outer' ? 'Äußeren' : def.key === 'middle' ? 'Mittleren' : 'Inneren'} Ring drehen`, () => rotateRing(data));
  }

  scene.add(console3d);
  block(-4.6, 1.6, 1.5);
}

function rotateRing(data) {
  if (state.astroSolved) return;
  data.index = (data.index + 1) % 6;
  const from = data.ring.rotation.y;
  const to = data.index * (Math.PI / 3);
  animations.push({ t: 0, dur: 0.3, fn: (k) => { data.ring.rotation.y = from + (to - from) * (1 - Math.pow(1 - k, 3)); } });
  sound.place();

  data.correct = data.index === data.target;
  data.gem.material.color.setHex(data.correct ? 0x52d273 : 0xb05aff);

  if (astroRings.every((r) => r.correct)) {
    state.astroSolved = true;
    astroRings.forEach((r) => { r.gem.material.color.setHex(0x52d273); });
    fillSeal('astro');
    toast('Die Ringe rasten ein — über dir gleiten Sterne in eine alte Konstellation. Ein Siegel am Tor erwacht.');
    sound.success();
    updateObjective();
    checkBothSeals();
  }
}

// --- Sternenkarte (Pult mit dem Hinweis zum Astrolabium) ---
{
  const stand = new THREE.Group();
  stand.position.set(-3.0, 0, 4.6);
  stand.rotation.y = -0.5;

  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.0, 8), toon(0x4a2e1a));
  leg.position.y = 0.5;
  stand.add(leg);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.7), toon(0x6b1f2a));
  slab.position.y = 1.0;
  slab.rotation.x = -0.5;
  stand.add(slab);
  const chart = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.6), toon(0xe9d8ab));
  chart.position.set(0, 1.06, 0.02);
  chart.rotation.x = -0.5 - Math.PI / 2;
  stand.add(chart);

  scene.add(stand);
  block(-3.0, 4.6, 0.7);

  register(slab, 'Sternenkarte lesen', () => {
    openReading('Die Karte der ruhenden Gestirne', `
      <p>»Wenn der Komet über dem Okulus steht, kommen die Gestirne zur Ruhe — und nur dann gibt das Astrolabium das erste Siegel frei.</p>
      <p><i>Der <b>äußere</b> Ring weise auf die <b>KRONE</b>,<br>
      der <b>mittlere</b> Ring auf die <b>SONNE</b>,<br>
      der <b>innere</b> Ring auf das <b>AUGE</b>.</i></p>
      <p>Dreht jeden Ring, bis sein Edelstein grün glüht.«</p>
    `);
    if (state.objectivePhase < 1) setObjective(1);
  });
}

// =====================================================================
//  RÄTSEL 2 — DER MONDPFAD
//  Drei Spiegel; jeder Klick dreht den Spiegel um 90° (4 Stellungen).
//  Stehen alle drei richtig, fließt das Mondlicht von der Quelle über
//  die Spiegel zum Tor und entzündet das zweite Siegel.
// =====================================================================

const MIRROR_TARGETS = [1, 3, 2]; // Sollstellung je Spiegel
const mirrors = [];
const mirrorPositions = [
  [5.4, 0, -3.0],
  [4.6, 0, 3.4],
  [-2.0, 0, 5.4],
];
const beamSource = new THREE.Vector3(6.2, 2.2, 0.0);     // Mondlicht-Quelle
const beamReceiver = new THREE.Vector3(0, 1.9, -ROOM_RADIUS + 0.35); // Tor-Siegel

// Mondlicht-Quelle (an der Wand)
{
  const src = new THREE.Group();
  src.position.copy(beamSource);
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.5, 12), toon(0x2a2d40));
  housing.rotation.z = Math.PI / 2;
  src.add(housing);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.22, 20), new THREE.MeshBasicMaterial({ color: 0xdfeaff }));
  lens.position.x = -0.26;
  lens.rotation.y = -Math.PI / 2;
  src.add(lens);
  const srcLight = new THREE.PointLight(0xbcd0ff, 5, 6, 2);
  src.add(srcLight);
  scene.add(src);
}

function makeMirror(idx, x, z) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.9, 8), toon(0x2a2d40));
  post.position.y = 0.95;
  grp.add(post);

  // Drehbarer Spiegelkopf
  const head = new THREE.Group();
  head.position.y = 2.0;
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 24), toon(0xc9a227, { emissive: 0x000000 }));
  head.add(frame);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.38, 24), new THREE.MeshBasicMaterial({ color: 0x9fb8e8 }));
  glass.position.z = 0.01;
  head.add(glass);
  // Richtungszeiger, damit die Stellung sichtbar ist
  const dir = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 6), new THREE.MeshBasicMaterial({ color: 0xe9d8ab }));
  dir.position.set(0, 0.5, 0.05);
  head.add(dir);
  grp.add(head);

  scene.add(grp);
  block(x, z, 0.5);

  const data = { idx, head, frame, glass, state: 0, target: MIRROR_TARGETS[idx], correct: false };
  mirrors.push(data);
  register(head, 'Spiegel drehen', () => rotateMirror(data));
  return grp;
}
mirrorPositions.forEach(([x, , z], i) => makeMirror(i, x, z));

// Strahl-Segmente (nur sichtbar bei gelöstem Rätsel; magischer Lichtpfad)
const beamPoints = [beamSource, new THREE.Vector3(...mirrorPositions[0]).setY(2.0),
  new THREE.Vector3(...mirrorPositions[1]).setY(2.0), new THREE.Vector3(...mirrorPositions[2]).setY(2.0), beamReceiver];
const beamSegments = [];
for (let i = 0; i < beamPoints.length - 1; i++) {
  const a = beamPoints[i], b = beamPoints[i + 1];
  const len = a.distanceTo(b);
  const seg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, len, 6),
    new THREE.MeshBasicMaterial({ color: 0xdfeaff, transparent: true, opacity: 0.0 })
  );
  seg.position.copy(a).lerp(b, 0.5);
  seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  scene.add(seg);
  beamSegments.push(seg);
}

function rotateMirror(data) {
  if (state.lightSolved) return;
  data.state = (data.state + 1) % 4;
  const from = data.head.rotation.y;
  const to = data.state * (Math.PI / 2);
  animations.push({ t: 0, dur: 0.3, fn: (k) => { data.head.rotation.y = from + (to - from) * (1 - Math.pow(1 - k, 3)); } });
  sound.place();

  data.correct = data.state === data.target;
  data.frame.material.emissive.setHex(data.correct ? 0x52d273 : 0x000000);
  data.glass.material.color.setHex(data.correct ? 0xbfe8c8 : 0x9fb8e8);

  if (mirrors.every((m) => m.correct)) {
    state.lightSolved = true;
    fillSeal('light');
    // Lichtpfad entzünden
    animations.push({
      t: 0, dur: 1.2, fn: (k) => { beamSegments.forEach((s) => { s.material.opacity = 0.85 * k; }); },
    });
    toast('Klick — der Mondstrahl springt von Spiegel zu Spiegel und trifft das Tor. Das zweite Siegel lodert auf.');
    sound.success();
    updateObjective();
    checkBothSeals();
  }
}

// --- Fresko mit dem Hinweis zum Mondpfad ---
{
  const fresco = new THREE.Group();
  fresco.position.set(3.5, 2.8, 5.5);
  fresco.lookAt(0, 2.8, 0);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), toon(0x3a3d55));
  fresco.add(panel);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.18, 20), new THREE.MeshBasicMaterial({ color: 0xe8ecff }));
  moon.position.set(-0.5, 0.3, 0.02);
  fresco.add(moon);
  scene.add(fresco);

  register(panel, 'Wandfresko betrachten', () => {
    openReading('Das Fresko vom wandernden Licht', `
      <p>»Das Mondlicht ist scheu und gehorcht nur den richtig gestellten Spiegeln.</p>
      <p><i>Dreh jeden der drei Spiegel, bis sein Rahmen golden-grün erglüht —
      dann reichen sie das Licht einander zu, bis es das Tor erreicht.«</i></p>
      <p>Unten, in verblasster Schrift: <i>Drei Spiegel, drei Wendungen. Das Auge erkennt, wann jeder still steht.</i></p>
    `);
    if (state.objectivePhase < 2 && state.astroSolved) setObjective(2);
  });
}

// =====================================================================
//  DIE VERSIEGELTE TÜR (zwei Siegel)
// =====================================================================

let doorPivot;
const seals = {}; // astro / light -> { ring, inner, light, group }

function makeSeal(key, color, offsetX) {
  const grp = new THREE.Group();
  grp.position.set(offsetX, 1.9, 0.25);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 8, 36),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 }));
  grp.add(ring);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 }));
  grp.add(inner);
  const light = new THREE.PointLight(color, 0.5, 5, 2);
  grp.add(light);
  seals[key] = { ring, inner, light, group: grp, color, lit: false };
  return grp;
}

function fillSeal(key) {
  const s = seals[key];
  s.lit = true;
  document.getElementById(`seal-${key}`).classList.add('filled');
  animations.push({
    t: 0, dur: 0.6, fn: (k) => {
      s.ring.material.opacity = 0.35 + 0.6 * k;
      s.inner.material.opacity = 0.3 + 0.6 * k;
      s.light.intensity = 0.5 + 7.5 * k;
    },
  });
}

function checkBothSeals() {
  if (state.astroSolved && state.lightSolved && !state.sealBroken) {
    state.sealBroken = true;
    toast('Beide Siegel brennen im Einklang — das Schloss des Tors gibt nach. Stoß es auf!');
    sound.success();
    // großes Siegel zerspringt
    for (const key of ['astro', 'light']) {
      const s = seals[key];
      animations.push({
        t: 0, dur: 1.6, fn: (k) => {
          s.ring.material.opacity = 0.95 * (1 - k);
          s.inner.material.opacity = 0.9 * (1 - k);
          s.ring.scale.setScalar(1 + k * 2.2);
          s.inner.scale.setScalar(1 + k * 3.0);
          s.light.intensity = 8 * (1 - k);
        },
        onDone: () => { s.ring.visible = false; s.inner.visible = false; },
      });
    }
    updateObjective();
  }
}

{
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, 0, -ROOM_RADIUS + 0.1);

  for (const dx of [-1.25, 1.25]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.8, 0.7), toon(0x2a2d40));
    post.position.set(dx, 1.9, 0);
    doorGroup.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.5, 0.7), toon(0x2a2d40));
  lintel.position.y = 3.85;
  doorGroup.add(lintel);
  const filler = new THREE.Mesh(new THREE.BoxGeometry(2.95, WALL_HEIGHT - 4.1, 0.4), toon(0x47506e));
  filler.position.y = 4.1 + (WALL_HEIGHT - 4.1) / 2;
  doorGroup.add(filler);

  doorPivot = new THREE.Group();
  doorPivot.position.set(-1.0, 0, 0);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.6, 0.18), toon(0x3a2a4a));
  panel.position.set(1.0, 1.8, 0);
  doorPivot.add(panel);
  for (const by of [0.9, 2.7]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 0.22), toon(0x22242e));
    band.position.set(1.0, by, 0);
    doorPivot.add(band);
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), toon(0xc9a227));
  knob.position.set(1.75, 1.7, 0.14);
  doorPivot.add(knob);
  doorGroup.add(doorPivot);

  // Zwei Siegel nebeneinander
  doorGroup.add(makeSeal('astro', 0x6f9cff, -0.65));
  doorGroup.add(makeSeal('light', 0xf0c84a, 0.65));

  scene.add(doorGroup);

  // Flur dahinter
  const hallway = new THREE.Group();
  hallway.position.set(0, 0, -ROOM_RADIUS);
  const hwFloor = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 5), toon(0x2a2d40));
  hwFloor.position.set(0, -0.05, -2.5);
  hallway.add(hwFloor);
  for (const dx of [-1.3, 1.3]) {
    const hwWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 5), toon(0x22242e));
    hwWall.position.set(dx, 2, -2.5);
    hallway.add(hwWall);
  }
  const hwCeil = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 5), toon(0x1a1c26));
  hwCeil.position.set(0, 4, -2.5);
  hallway.add(hwCeil);
  const exitGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4), new THREE.MeshBasicMaterial({ color: 0xcfe0ff }));
  exitGlow.position.set(0, 2, -4.9);
  hallway.add(exitGlow);
  const exitLight = new THREE.PointLight(0xcfe0ff, 14, 12, 2);
  exitLight.position.set(0, 2, -4);
  hallway.add(exitLight);
  scene.add(hallway);

  register(doorPivot, 'Tor', () => {
    if (state.doorOpen) return;
    if (!state.astroSolved && !state.lightSolved) {
      toast('Das Tor trägt zwei kalte Siegel. Beide müssen erwachen, ehe es sich rührt.');
      sound.thud();
    } else if (!state.sealBroken) {
      toast('Ein Siegel glüht bereits — doch erst beide zusammen brechen das Schloss.');
      sound.thud();
    } else {
      openDoor();
    }
  });
}

function openDoor() {
  state.doorOpen = true;
  toast('Das Tor schwingt knarrend auf. Dahinter wartet der nächste Teil des Turms.');
  sound.door();
  animations.push({
    t: 0, dur: 2.2, fn: (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      doorPivot.rotation.y = -e * 1.9;
    },
  });
  setObjective(4);
}

// ---------- Aufgaben-Text ----------

const OBJECTIVES = [
  'Ein fremder Raum voller Sterne. Untersuche die Sternwarte.',
  'Lies die Sternenkarte und stelle das Astrolabium richtig ein.',
  'Lenke das Mondlicht über die drei Spiegel zum Tor.',
  'Beide Siegel brennen. Öffne das Tor.',
  'Hinaus! Weiter durch den Gang.',
];

function setObjective(phase) {
  state.objectivePhase = phase;
  document.getElementById('objective-text').textContent = OBJECTIVES[phase];
}

function updateObjective() {
  if (state.doorOpen) return setObjective(4);
  if (state.sealBroken) return setObjective(3);
  if (state.astroSolved && !state.lightSolved) return setObjective(2);
  if (!state.astroSolved && state.objectivePhase < 1) return;
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
    place() { tone(520, 0.12, 'triangle', 0.07); },
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

document.getElementById('start-btn').addEventListener('click', () => {
  sound.unlock();
  controls.lock();
});
document.getElementById('resume-btn').addEventListener('click', () => controls.lock());
document.getElementById('again-btn').addEventListener('click', () => location.reload());

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

  if (state.doorOpen && !state.escaped && p.z < -ROOM_RADIUS - 2.5) {
    win();
  }
}

function win() {
  state.escaped = true;
  const secs = Math.floor((performance.now() - state.startTime) / 1000);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  document.getElementById('win-time').textContent = `${mm}:${ss}`;
  hud.classList.add('hidden');
  winScreen.classList.remove('hidden');
  controls.unlock();
  sound.success();
}

// ---------- Hauptschleife ----------

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  for (const torch of torchLights) {
    const n = Math.sin(t * 11 + torch.seed) * 0.5 + Math.sin(t * 23 + torch.seed * 2) * 0.3;
    torch.light.intensity = 20 + n * 6;
    torch.flame.scale.setScalar(1 + n * 0.12);
  }

  crystal.rotation.y = t * 0.6;
  crystal.position.y = WALL_HEIGHT - 1.4 + Math.sin(t * 0.8) * 0.12;

  // Siegel pulsieren, solange sie noch nicht zersprungen sind
  if (!state.sealBroken) {
    for (const key of ['astro', 'light']) {
      const s = seals[key];
      if (s.lit) {
        s.ring.rotation.z = t * 0.5;
        s.inner.rotation.z = -t * 0.8;
      }
    }
  }

  // Staub treibt
  const pos = dust.geometry.attributes.position;
  for (let i = 0; i < dustCount; i++) {
    let y = pos.getY(i) + dt * 0.06;
    if (y > WALL_HEIGHT) y = 0;
    pos.setY(i, y);
  }
  pos.needsUpdate = true;

  // Sterne funkeln
  stars.material.opacity = 0.7 + Math.sin(t * 1.5) * 0.2;

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
