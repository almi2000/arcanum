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
import { createMobileControls } from './mobileControls.js';

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

function makeSymbolLabel(text, { color = '#e9d8ab', size = 64, w = 0.34, h = 0.22 } = {}) {
  const c = document.createElement('canvas');
  c.width = 192; c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.font = `700 ${size}px "Grenze Gotisch", serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.shadowColor = 'rgba(0,0,0,0.85)';
  g.shadowBlur = 8;
  g.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
}

function makeSmallTable(x, z, rotation) {
  const table = new THREE.Group();
  table.position.set(x, 0, z);
  table.rotation.y = rotation;
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.9), toon(0x3a2a4a));
  top.position.y = 0.78;
  table.add(top);
  for (const [dx, dz] of [[-0.8, -0.32], [0.8, -0.32], [-0.8, 0.32], [0.8, 0.32]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.78, 0.1), toon(0x2a2034));
    leg.position.set(dx, 0.39, dz);
    table.add(leg);
  }
  return table;
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

const MARK_NAMES = ['✦', '☾', '☉', '♜', '♛', '◉'];
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
    // Goldene Punkte entfernt - Labels sind jetzt sichtbar
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
  // Keine Farb-Rückmeldung - Spieler müssen selbst überprüfen

  if (astroRings.every((r) => r.correct)) {
    state.astroSolved = true;
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

  register(slab, 'Sternenkarte', () => {
    openReading('Ruhende Gestirne', `
      <p><i>Außen krönt sich der Kreis. Darunter brennt die Scheibe. Im Kern wacht das Auge.</i></p>
      <p>Die übrigen Zeichen sind mit Ruß verwischt.</p>
    `);
    if (state.objectivePhase < 1) setObjective(1);
  });
}

// --- Gerätschaften ohne Funktion, damit das Observatorium nicht nur aus Rätseln besteht ---
{
  const scrap = new THREE.Group();
  scrap.position.set(1.8, 0, 5.8);
  scrap.rotation.y = -0.25;
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.8), toon(0x2a2d40));
  crate.position.y = 0.28;
  scrap.add(crate);
  for (let i = 0; i < 4; i++) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), toon(0x6f9cff));
    tube.rotation.z = Math.PI / 2;
    tube.position.set(-0.4 + i * 0.25, 0.65, -0.12 + (i % 2) * 0.25);
    scrap.add(tube);
  }
  scene.add(scrap);
  block(1.8, 5.8, 0.9);
  register(scrap, 'Alte Fernrohre', () => toast('Zerkratzte Linsen, lose Schrauben. Der Himmel bleibt darin blind.'));
}

// --- Mondphasen-Scheibe: wirkt wichtig, gehoert aber nicht zur Loesung ---
{
  const phases = new THREE.Group();
  phases.position.set(6.5, 0, 1.0);
  phases.lookAt(0, 0, 0);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.48, 0.85, 12), toon(0x2a2d40));
  base.position.y = 0.42;
  phases.add(base);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), toon(0xc9a227));
  axle.rotation.z = Math.PI / 2;
  axle.position.y = 1.15;
  phases.add(axle);
  const disk = new THREE.Group();
  disk.position.y = 1.45;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.055, 8, 36), toon(0xc9a227));
  disk.add(ring);
  const dark = new THREE.Mesh(new THREE.CircleGeometry(0.48, 32), toon(0x101831));
  dark.position.z = -0.01;
  disk.add(dark);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const phase = new THREE.Mesh(new THREE.CircleGeometry(0.08, 18), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x8798cf : 0xe8ecff }));
    phase.position.set(Math.sin(a) * 0.38, Math.cos(a) * 0.38, 0.02);
    disk.add(phase);
  }
  phases.add(disk);
  scene.add(phases);
  block(6.5, 1.0, 0.75);
  register(disk, 'Mondphasen-Scheibe', () => {
    animations.push({ t: 0, dur: 0.45, fn: (k) => { disk.rotation.z += 0.04 * Math.sin(k * Math.PI); } });
    toast('Die Scheibe knirscht und bleibt zwischen zwei Phasen haengen.');
  });
}

// --- Prismen- und Linsentisch als falscher Lichtpfad-Kandidat ---
{
  const table = makeSmallTable(-1.0, 6.6, 0.18);
  register(table, 'Linsentisch', () => toast('Prismen, Okulare, Messingringe. Alles sieht nuetzlich aus.'));
  const prismColors = [0x9ab4ff, 0xc9a227, 0x8a6bff, 0xdfeaff];
  for (let i = 0; i < 4; i++) {
    const prism = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 3), new THREE.MeshBasicMaterial({ color: prismColors[i], transparent: true, opacity: 0.72 }));
    prism.position.set(-0.55 + i * 0.36, 1.02, -0.12 + (i % 2) * 0.28);
    prism.rotation.set(0.8, 0.3 + i * 0.4, 0.2);
    table.add(prism);
    register(prism, 'Kristallprisma', () => toast('Es bricht Licht in falsche Farben.'));
  }
  const lens = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24), toon(0xc9a227));
  lens.position.set(0.68, 1.03, 0.18);
  lens.rotation.x = Math.PI / 2;
  table.add(lens);
  register(lens, 'Lose Linse', () => toast('Die Linse ist blind geschliffen.'));
  scene.add(table);
  block(-1.0, 6.6, 1.0);
}

// --- Defektes Mini-Astrolabium als falscher Zwilling des echten Pults ---
{
  const broken = new THREE.Group();
  broken.position.set(-6.4, 0, 0.6);
  broken.lookAt(0, 0, 0);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.8, 10), toon(0x2a2d40));
  column.position.y = 0.4;
  broken.add(column);
  const face = new THREE.Group();
  face.position.y = 1.08;
  face.rotation.x = -0.45;
  const outer = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 30), toon(0x6f9cff));
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.028, 8, 24), toon(0x8a6bff));
  face.add(outer, inner);
  const brokenNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.54, 0.03), toon(0xe9d8ab));
  brokenNeedle.rotation.z = 0.75;
  face.add(brokenNeedle);
  const missing = makeSymbolLabel('✕', { color: '#2a2034', size: 84, w: 0.34, h: 0.28 });
  missing.position.z = 0.04;
  face.add(missing);
  broken.add(face);
  scene.add(broken);
  block(-6.4, 0.6, 0.65);
  register(face, 'Defektes Astrolabium', () => toast('Ein Lehrmodell. Die Ringe sind festgefressen.'));
}

// --- Zerrissene Sternkarten mit widerspruechlichen Symbolen ---
{
  const rack = new THREE.Group();
  rack.position.set(-4.6, 0, -2.3);
  rack.rotation.y = 0.55;
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.9), toon(0x4a2e1a));
  board.position.y = 0.72;
  rack.add(board);
  const symbols = ['♜', '☾', '✦', '♛', '◉'];
  for (let i = 0; i < 5; i++) {
    const scrapChart = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), toon(i % 2 ? 0xd8c28c : 0xe9d8ab));
    scrapChart.position.set(-0.62 + i * 0.31, 0.82 + (i % 2) * 0.03, -0.12 + (i % 3) * 0.12);
    scrapChart.rotation.x = -Math.PI / 2;
    scrapChart.rotation.z = (i - 2) * 0.18;
    rack.add(scrapChart);
    const symbol = makeSymbolLabel(symbols[i], { color: '#3a2a4a', size: 50, w: 0.18, h: 0.16 });
    symbol.position.copy(scrapChart.position);
    symbol.position.y += 0.01;
    symbol.rotation.copy(scrapChart.rotation);
    rack.add(symbol);
  }
  scene.add(rack);
  block(-4.6, -2.3, 0.9);
  register(rack, 'Zerrissene Sternkarten', () => openReading('Fetzen alter Karten', `
    <p>Mehrere Fragmente widersprechen einander. Ein Randstueck zeigt nur: <i>...nicht diese Nacht...</i></p>
  `));
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
  head.rotation.y = -Math.PI / 2;  // 90° nach links
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
  // Keine Farb-Rückmeldung - Spieler müssen selbst überprüfen

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

  register(panel, 'Wandfresko', () => {
    openReading('Wanderndes Licht', `
      <p>Drei blasse Scheiben, ein silberner Strich, ein Tor. Der Rest ist abgeplatzt.</p>
    `);
    if (state.objectivePhase < 2 && state.astroSolved) setObjective(2);
  });
}

{
  for (const [x, z, rot] of [[-5.7, -2.8, 0.8], [2.8, 6.4, -0.4]]) {
    const blind = new THREE.Group();
    blind.position.set(x, 0, z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.4, 8), toon(0x2a2d40));
    post.position.y = 0.7;
    blind.add(post);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24), toon(0x44506a));
    disc.position.y = 1.55;
    disc.rotation.y = rot;
    blind.add(disc);
    scene.add(blind);
    block(x, z, 0.45);
    register(disc, 'Blinder Spiegel', () => toast('Mattes Glas. Es schluckt den Mondschein.'));
  }
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
      toast('Das Tor trägt zwei kalte Siegel.');
      sound.thud();
    } else if (!state.sealBroken) {
      toast('Ein Siegel glüht — das andere schweigt noch.');
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
  'Ein fremder Saal voller Sterne. Sieh dich um.',
  'Hier ruht alte Mechanik — sie wartet auf die rechte Stellung.',
  'Ein Siegel glüht bereits. Etwas anderes liegt noch im Dunkeln.',
  'Beide Siegel brennen. Das Tor regt sich.',
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
    success() {},
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
const shouldAutoStart = new URLSearchParams(window.location.search).get('autostart') === '1';
const nextRoomUrl = 'room3.html?autostart=1';

function enterRoom() {
  titleScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  if (!state.startTime) state.startTime = performance.now();
}

document.getElementById('start-btn').addEventListener('click', () => {
  sound.unlock();
  enterRoom();
  if (touchControls.isTouchDevice) touchControls.enable();
  else controls.lock();
});
document.getElementById('resume-btn').addEventListener('click', () => {
  if (touchControls.isTouchDevice) touchControls.enable();
  else controls.lock();
});
document.getElementById('again-btn').addEventListener('click', () => { window.location.href = 'room3.html'; });

if (shouldAutoStart) {
  enterRoom();
  const lockOnInput = () => {
    sound.unlock();
    if (touchControls.isTouchDevice) touchControls.enable();
    else controls.lock();
    document.removeEventListener('click', lockOnInput);
    document.removeEventListener('keydown', lockOnInput);
  };
  document.addEventListener('click', lockOnInput);
  document.addEventListener('keydown', lockOnInput);
}

controls.addEventListener('lock', () => {
  enterRoom();
});
controls.addEventListener('unlock', () => {
  if (state.escaped) return;
  if (touchControls.isActive()) return;
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
  document.getElementById('hover-label').textContent = '';
  document.getElementById('crosshair').classList.remove('active');
}

function interact() {
  if (readingOpen) { closeReading(); return; }
  if (hovered && hovered.enabled) hovered.onUse(hovered);
}

const touchControls = createMobileControls({ THREE, camera, enterRoom, interact, updateHover, sound });

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
  const fwd = THREE.MathUtils.clamp((keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) + touchControls.move.z, -1, 1);
  const side = THREE.MathUtils.clamp((keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + touchControls.move.x, -1, 1);
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

  if ((controls.isLocked || touchControls.isActive()) && !state.escaped) {
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
