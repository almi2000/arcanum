// ============ Arcanum — Raum 4: Der Lange Flur des Erzmagiers ============
//
// Architektur-Hinweis (vgl. main.js / room2.js / room3.js):
// Gleiches eigenst\u00e4ndiges Modul-Prinzip wie die \u00fcbrigen R\u00e4ume \u2014 selber
// Renderer-/Toon-Aufbau, dieselbe register()-Interaktions-Registry, dieselbe
// Bewegungs-/Kollisions- und Tor-/Sieg-Logik. Neu ist die RAUMFORM:
// ein langer, rechteckiger KORRIDOR statt eines Rund- oder Sechseck-Saals.
// F\u00fcr ein sp\u00e4teres Gesamtspiel l\u00e4sst sich auch diese Datei zu einer init()-
// Funktion kapseln und vom selben Loader nacheinander aufrufen.
//
// VIER verkettete R\u00e4tsel f\u00fchren zum Ausgang:
//   1) Bilder-Code   \u2013 4 Bilder mit versteckten Zahlen, Reihenfolge aus einer Tafel
//                       \u2192 4-stelliger Code am Drehrad-Schloss.  (\u2192 erweckt die Lampe)
//   2) Schwarzlicht  \u2013 die UV-Lampe enth\u00fcllt eine sonst unsichtbare Farbtafel.
//                       (\u2192 verr\u00e4t die Farb-Reihenfolge)
//   3) Schrittfolge  \u2013 die Bodenfelder in genau dieser Farbfolge ablaufen.
//                       (\u2192 bestromt die T\u00fcren)
//   4) T\u00fcren-Logik   \u2013 f\u00fcnf T\u00fcren mit Schildern; nur der LEERE Raum f\u00fchrt hinaus.

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createMobileControls } from './mobileControls.js';

// ---------- Grundger\u00fcst ----------

const WALL_HEIGHT = 4.6;
const EYE_HEIGHT = 1.7;

// Korridor-Ma\u00dfe
const HALF_W = 4.3;       // halbe Flurbreite (x)
const Z_SOUTH = 12.6;    // Startwand (S\u00fcden, +Z)
const Z_NORTH = -12.6;   // T\u00fcrwand (Norden, -Z)

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0a10);
scene.fog = new THREE.FogExp2(0x0b0a10, 0.03);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, EYE_HEIGHT, 11); // Start im S\u00fcden, Blick nach Norden (-Z) zu den T\u00fcren

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Toon-Verlauf
const gradientData = new Uint8Array([60, 60, 60, 255, 120, 120, 120, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
const gradientMap = new THREE.DataTexture(gradientData, 4, 1, THREE.RGBAFormat);
gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;

function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap, ...opts });
}

// Canvas-Text/Icon-Helfer. Gibt ein Mesh zur\u00fcck, das per .userData.redraw(text) neu beschriftet werden kann.
function drawTextMesh(text, { color = '#e9d8ab', size = 64, bg = null, w = 0.5, h = 0.28, emoji = false } = {}) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 144;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  mesh.userData.redraw = (txt) => {
    ctx.clearRect(0, 0, c.width, c.height);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.font = `${emoji ? '' : '700 '}${size}px ${emoji ? 'serif' : '"Grenze Gotisch", serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 8;
    ctx.fillText(txt, c.width / 2, c.height / 2);
    tex.needsUpdate = true;
  };
  mesh.userData.redraw(text);
  return mesh;
}

// ---------- Licht ----------

const hemi = new THREE.HemisphereLight(0x3a3550, 0x14110a, 0.5);
scene.add(hemi);
const HEMI_BASE = 0.5;

const torchLights = [];
function makeSconce(x, z, faceX) {
  const grp = new THREE.Group();
  grp.position.set(x, 2.7, z);
  grp.lookAt(0, 2.7, z);

  const bracket = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 10), toon(0x6b5320));
  bracket.position.set(0, 0.05, 0.12);
  grp.add(bracket);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.36, 7), new THREE.MeshBasicMaterial({ color: 0xffb347 }));
  flame.position.set(0, 0.4, 0.2);
  grp.add(flame);
  const light = new THREE.PointLight(0xffa83a, 16, 11, 2);
  light.position.set(0, 0.4, 0.4);
  grp.add(light);

  torchLights.push({ light, flame, seed: Math.random() * 100, base: 16 });
  scene.add(grp);
}
for (const z of [9, 3, -3, -9]) {
  makeSconce(-HALF_W + 0.15, z);
  makeSconce(HALF_W - 0.15, z);
}

// ---------- Geometrie: der Korridor ----------

const LEN = Z_SOUTH - Z_NORTH;
const MIDZ = (Z_SOUTH + Z_NORTH) / 2;

const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2 + 0.4, LEN + 0.4), toon(0x2c2636));
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0, MIDZ);
scene.add(floor);

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2 + 0.4, LEN + 0.4), toon(0x1a1726));
ceiling.rotation.x = Math.PI / 2;
ceiling.position.set(0, WALL_HEIGHT, MIDZ);
scene.add(ceiling);

// Seitenw\u00e4nde
for (const side of [-1, 1]) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, WALL_HEIGHT, LEN + 0.4), toon(0x3c4058));
  wall.position.set(side * (HALF_W + 0.2), WALL_HEIGHT / 2, MIDZ);
  scene.add(wall);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, LEN + 0.4), toon(0x262a3c));
  skirt.position.set(side * (HALF_W + 0.18), 0.25, MIDZ);
  scene.add(skirt);
  // Deckenleiste / Pilaster
  for (let z = Z_SOUTH - 2; z > Z_NORTH; z -= 4) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.25, WALL_HEIGHT, 0.4), toon(0x2c3046));
    pil.position.set(side * (HALF_W + 0.05), WALL_HEIGHT / 2, z);
    scene.add(pil);
  }
}

// S\u00fcdwand (R\u00fccken)
const southWall = new THREE.Mesh(new THREE.BoxGeometry(HALF_W * 2 + 0.8, WALL_HEIGHT, 0.4), toon(0x3c4058));
southWall.position.set(0, WALL_HEIGHT / 2, Z_SOUTH + 0.2);
scene.add(southWall);

// Nordwand (mit T\u00fcren) \u2013 als Segmente zwischen den T\u00fcren gebaut (s.u. bei den T\u00fcren)

// Staub
const dustCount = 200;
const dustPos = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) {
  dustPos[i * 3] = (Math.random() * 2 - 1) * HALF_W;
  dustPos[i * 3 + 1] = Math.random() * WALL_HEIGHT;
  dustPos[i * 3 + 2] = MIDZ + (Math.random() * 2 - 1) * (LEN / 2);
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x8a90b0, size: 0.03, transparent: true, opacity: 0.4, sizeAttenuation: true }));
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
  codeSolved: false,
  uvPowered: false,
  uvOn: false,
  stepsSolved: false,
  doorsLive: false,
  doorOpen: false,
  escaped: false,
  startTime: null,
};

const animations = [];

// =====================================================================
//  R\u00c4TSEL 1 \u2014 BILDER-CODE
//  Vier Bilder (Uhr, Schl\u00fcssel, Ventil, T\u00fcr) mit je einer kleinen Zahl,
//  verstreut aufgeh\u00e4ngt. Eine Tafel gibt die REIHENFOLGE vor.
//  Code wird an vier Drehr\u00e4dern eingestellt.
// =====================================================================

// icon -> { emoji, zahl }
const PICTURES = {
  uhr:       { emoji: '\uD83D\uDD52', zahl: 5, name: 'Die Uhr' },
  schluessel:{ emoji: '\uD83D\uDD11', zahl: 2, name: 'Der Schl\u00fcssel' },
  ventil:    { emoji: '\uD83D\uDEBF', zahl: 8, name: 'Das Ventil' },
  tuer:      { emoji: '\uD83D\uDEAA', zahl: 4, name: 'Die T\u00fcr' },
};
const DECO_PICTURES = {
  kelch: { emoji: '♕', zahl: 7, name: 'Der Kelch' },
  feder: { emoji: '✒', zahl: 1, name: 'Die Feder' },
  auge: { emoji: '◉', zahl: 6, name: 'Das Auge' },
};
// Lese-Reihenfolge laut Tafel (NICHT die r\u00e4umliche!): Uhr, Schl\u00fcssel, Ventil, T\u00fcr
const CODE_ORDER = ['uhr', 'schluessel', 'ventil', 'tuer'];
const CODE = CODE_ORDER.map((k) => PICTURES[k].zahl); // [5,2,8,4]

// Bilder absichtlich r\u00e4umlich gemischt aufh\u00e4ngen
function hangPicture(key, x, z, faceSide) {
  const pic = PICTURES[key];
  const grp = new THREE.Group();
  grp.position.set(x, 2.3, z);
  grp.rotation.y = faceSide < 0 ? Math.PI / 2 : -Math.PI / 2; // Vorderseite zur Flurmitte

  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.08), toon(0x6b5320));
  grp.add(frame);
  const canvasPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.02), toon(0x1c2438));
  canvasPlate.position.z = 0.05;
  grp.add(canvasPlate);

  const icon = drawTextMesh(pic.emoji, { emoji: true, size: 120, w: 0.62, h: 0.62 });
  icon.position.set(0, 0.12, 0.06);
  grp.add(icon);

  // kleine, versteckte Zahl unten in der Ecke
  const num = drawTextMesh(String(pic.zahl), { color: '#9a8a5a', size: 40, w: 0.18, h: 0.12 });
  num.position.set(0.28, -0.4, 0.06);
  grp.add(num);

  scene.add(grp);
  register(frame, `${pic.name} betrachten`, () => {
    openReading(pic.name, `
      <p style="text-align:center;font-size:3rem;margin:6px 0;">${pic.emoji}</p>
      <p>Firnis, Kratzer und eine auffällig dunkle Ecke.</p>
    `);
  });
}
// Reihenfolge an der Wand bewusst durcheinander: T\u00fcr, Ventil, Uhr, Schl\u00fcssel
hangPicture('tuer', -HALF_W + 0.05, 8, -1);
hangPicture('ventil', HALF_W - 0.05, 4, 1);
hangPicture('uhr', -HALF_W + 0.05, -1, -1);
hangPicture('schluessel', HALF_W - 0.05, -6, 1);

function hangDecoyPicture(key, x, z, faceSide) {
  const pic = DECO_PICTURES[key];
  const grp = new THREE.Group();
  grp.position.set(x, 2.3, z);
  grp.rotation.y = faceSide < 0 ? Math.PI / 2 : -Math.PI / 2;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.05, 0.08), toon(0x5a4520));
  grp.add(frame);
  const canvasPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.88), toon(0x20243a));
  canvasPlate.position.z = 0.05;
  grp.add(canvasPlate);
  const icon = drawTextMesh(pic.emoji, { size: 110, w: 0.54, h: 0.54 });
  icon.position.set(0, 0.12, 0.06);
  grp.add(icon);
  const num = drawTextMesh(String(pic.zahl), { color: '#8a805a', size: 36, w: 0.16, h: 0.12 });
  num.position.set(-0.25, -0.35, 0.06);
  grp.add(num);
  scene.add(grp);
  register(frame, `${pic.name} betrachten`, () => openReading(pic.name, '<p>Ein altes Bild. Es scheint nicht zu der täglichen Runde zu gehören.</p>'));
}
hangDecoyPicture('kelch', HALF_W - 0.05, 7.0, 1);
hangDecoyPicture('feder', -HALF_W + 0.05, 3.0, -1);
hangDecoyPicture('auge', HALF_W - 0.05, -2.0, 1);

// Code-Schloss (Lesepult mit vier Drehr\u00e4dern) im S\u00fcdteil
const codeWheels = [];
{
  const lectern = new THREE.Group();
  lectern.position.set(3.0, 0, 9.0);
  lectern.lookAt(0, 0, 9.0);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.1, 8), toon(0x4a3220));
  post.position.y = 0.55;
  lectern.add(post);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.7), toon(0x5a3a22));
  slab.position.y = 1.12;
  slab.rotation.x = -0.45;
  lectern.add(slab);

  // vier Ziffern-R\u00e4der
  for (let i = 0; i < 4; i++) {
    const wx = -0.45 + i * 0.3;
    const drum = new THREE.Group();
    drum.position.set(wx, 1.2, 0.06);
    drum.rotation.x = -0.45;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 16), toon(0xc9a227));
    body.rotation.z = Math.PI / 2;
    drum.add(body);
    const digit = drawTextMesh('0', { color: '#2a1d12', size: 80, w: 0.16, h: 0.16 });
    digit.position.set(0, 0, 0.085);
    drum.add(digit);
    lectern.add(drum);

    const data = { value: 0, digit, body };
    codeWheels.push(data);
    register(body, 'Walze drehen', () => bumpWheel(data));
  }

  // Hinweistafel mit der REIHENFOLGE (diegetisch, ohne Bedien-Anweisung)
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), toon(0xe9d8ab));
  plaque.position.set(0, 1.4, -0.2);
  plaque.rotation.x = -0.2;
  lectern.add(plaque);
  register(plaque, 'Gravur lesen', () => {
    openReading('In den Stein geritzt', `
      <p><i>Gong. Bart. Dampf. Schwelle.</i></p>
    `);
  });

  scene.add(lectern);
  block(3.0, 9.0, 0.9);
}

function bumpWheel(data) {
  if (state.codeSolved) return;
  data.value = (data.value + 1) % 10;
  data.digit.userData.redraw(String(data.value));
  sound.tick();
  if (codeWheels.every((w, i) => w.value === CODE[i])) {
    state.codeSolved = true;
    codeWheels.forEach((w) => w.body.material.color.setHex(0x52d273));
    state.uvPowered = true;
    fillLock('code');
    toast('Ein metallisches Klacken \u2014 und an der Wand surrt etwas zu Leben.');
    sound.success();
    // Lampe sichtbar \u201ebestromen\u201c
    if (uvBulb) uvBulb.material.color.setHex(0x6a4aa0);
    updateProgress();
  }
}

// =====================================================================
//  R\u00c4TSEL 2 \u2014 SCHWARZLICHT (UV)
//  Die Lampe ist erst nach R\u00e4tsel 1 bestromt. Eingeschaltet dimmt sie das
//  Hauptlicht und enth\u00fcllt eine sonst unsichtbare Farbtafel an der Wand,
//  die die Reihenfolge f\u00fcr die Bodenfelder verr\u00e4t.
// =====================================================================

let uvBulb;
const uvReveal = []; // Meshes, die nur unter UV sichtbar sind

{
  const lamp = new THREE.Group();
  lamp.position.set(-HALF_W + 0.05, 2.5, 1.5);
  lamp.rotation.y = Math.PI / 2;

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.18), toon(0x2c3046));
  lamp.add(back);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.4, 12, 1, true), toon(0x3a3d55, { side: THREE.DoubleSide }));
  hood.rotation.x = Math.PI / 2;
  hood.position.z = 0.25;
  lamp.add(hood);
  uvBulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), new THREE.MeshBasicMaterial({ color: 0x2a2436 }));
  uvBulb.position.z = 0.32;
  lamp.add(uvBulb);

  const uvLight = new THREE.PointLight(0x8a5cff, 0, 16, 2);
  uvLight.position.set(0, 0, 1.5);
  lamp.add(uvLight);

  scene.add(lamp);

  register(back, 'Schwarzlicht-Lampe', () => {
    if (!state.uvPowered) {
      toast('Die Lampe ist kalt und tot. Ihr fehlt der Strom.');
      sound.thud();
      return;
    }
    state.uvOn = !state.uvOn;
    uvBulb.material.color.setHex(state.uvOn ? 0xb59cff : 0x6a4aa0);
    uvLight.intensity = state.uvOn ? 9 : 0;
    uvReveal.forEach((m) => { m.visible = state.uvOn; });
    sound.flick();
    if (state.uvOn && !state.stepsSolved && !fillLock.uvSeen) {
      fillLock.uvSeen = true;
      fillLock('uv');
      updateProgress();
    }
  });

  // Versteckte Farbtafel an der gegen\u00fcberliegenden Wand \u2013 nur unter UV sichtbar
  const chart = new THREE.Group();
  chart.position.set(HALF_W - 0.05, 2.4, 1.5);
  chart.rotation.y = -Math.PI / 2;
  const chartBg = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.7), new THREE.MeshBasicMaterial({ color: 0x1a0d33, transparent: true, opacity: 0.9 }));
  chart.add(chartBg);

  // Reihenfolge der Farben (= Schrittfolge): blau(1) \u2192 gelb(2) \u2192 rot(3) \u2192 gr\u00fcn(4)
  const order = [
    { col: 0x4a6bff, n: 1 },
    { col: 0xf0c84a, n: 2 },
    { col: 0xd23a3a, n: 3 },
    { col: 0x3fae54, n: 4 },
  ];
  order.forEach((o, i) => {
    const x = -0.6 + i * 0.4;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), new THREE.MeshBasicMaterial({ color: o.col }));
    disc.position.set(x, 0.05, 0.01);
    chart.add(disc);
    const mark = drawTextMesh('•', { color: '#ffffff', size: 64, w: 0.18, h: 0.18 });
    mark.position.set(x, -0.22, 0.02);
    chart.add(mark);
  });
  chart.children.forEach((c) => { c.visible = false; uvReveal.push(c); });
  scene.add(chart);
}

// =====================================================================
//  R\u00c4TSEL 3 \u2014 SCHRITTFOLGE
//  Farbige Bodenfelder. In der unter UV enth\u00fcllten Reihenfolge ablaufen.
//  Falsches Feld \u2192 alles erlischt. Vollst\u00e4ndig \u2192 die T\u00fcren werden bestromt.
// =====================================================================

const STEP_TILES = [
  { col: 0xd23a3a, order: 3, x: -2.6, z: 5.0 },   // rot
  { col: 0x4a6bff, order: 1, x: 2.6, z: 1.5 },    // blau
  { col: 0xf0c84a, order: 2, x: -1.6, z: -1.5 },  // gelb
  { col: 0x3fae54, order: 4, x: 1.8, z: -5.0 },   // gr\u00fcn
];
const stepTiles = [];
let stepIndex = 0;
let lastTileId = -1;

STEP_TILES.forEach((t, i) => {
  const tile = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.5), toon(t.col));
  tile.position.set(t.x, 0.03, t.z);
  tile.material.transparent = true;
  tile.material.opacity = 0.55; // gedeckt, verblichen
  scene.add(tile);
  const glow = new THREE.PointLight(t.col, 0, 3, 2);
  glow.position.set(t.x, 0.6, t.z);
  scene.add(glow);
  stepTiles.push({ mesh: tile, glow, order: t.order, lit: false, index: i });
});

function resetSteps() {
  stepIndex = 0;
  stepTiles.forEach((s) => { s.lit = false; s.glow.intensity = 0; s.mesh.material.opacity = 0.55; });
}

function stepOnTile(tile) {
  if (state.stepsSolved) return;
  if (tile.order === stepIndex + 1) {
    tile.lit = true;
    tile.glow.intensity = 6;
    tile.mesh.material.opacity = 1.0;
    stepIndex++;
    sound.note(330 + stepIndex * 80);
    if (stepIndex === stepTiles.length) {
      state.stepsSolved = true;
      state.doorsLive = true;
      fillLock('steps');
      toast('Unter deinen F\u00fc\u00dfen gl\u00fcht der Pfad auf \u2014 am Flurende erwachen die T\u00fcren.');
      sound.success();
      energizeDoors();
      updateProgress();
    }
  } else {
    resetSteps();
    sound.thud();
  }
}

// =====================================================================
//  R\u00c4TSEL 4 \u2014 F\u00dcNF T\u00dcREN, NUR EINE F\u00dcHRT WEITER
//  Schilder + Gravuren. Meta-Hinweis: \u201eNur der Raum, der nichts enth\u00e4lt,
//  f\u00fchrt weiter.\u201c \u2192 per Ausschluss bleibt der LEERE Raum (Lager).
// =====================================================================

const DOOR_DEFS = [
  { x: -3.4, name: 'Archiv',     clue: 'Papier.',      empty: false },
  { x: -1.7, name: 'Labor',      clue: 'Dampf.',       empty: false },
  { x: 0.0,  name: 'Notausgang', clue: 'Stein.',       empty: false },
  { x: 1.7,  name: 'Lager',      clue: 'Staub.',       empty: true },
  { x: 3.4,  name: 'Kontrolle',  clue: 'Hebel.',       empty: false },
];
const doors = [];
let exitDoorX = 0;

function buildDoors() {
  const wallY = WALL_HEIGHT / 2;
  const z = Z_NORTH - 0.2;
  const doorW = 1.3, doorH = 3.2;

  // Nordwand als Segmente zwischen den T\u00fcren (damit die T\u00fcr\u00f6ffnungen frei sind)
  const edges = [-HALF_W - 0.2, ...DOOR_DEFS.map((d) => d.x), HALF_W + 0.2];
  // F\u00fcllsegmente zwischen den T\u00fcr-Au\u00dfenkanten
  const stops = [];
  let cursor = -HALF_W - 0.2;
  for (const d of DOOR_DEFS) {
    stops.push([cursor, d.x - doorW / 2]);
    cursor = d.x + doorW / 2;
  }
  stops.push([cursor, HALF_W + 0.2]);
  for (const [a, b] of stops) {
    if (b - a <= 0.02) continue;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(b - a, WALL_HEIGHT, 0.4), toon(0x3c4058));
    seg.position.set((a + b) / 2, wallY, z);
    scene.add(seg);
  }
  // oberer Sturz \u00fcber die ganze Wand
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(HALF_W * 2 + 0.4, WALL_HEIGHT - doorH, 0.4), toon(0x2c3046));
  lintel.position.set(0, doorH + (WALL_HEIGHT - doorH) / 2, z);
  scene.add(lintel);

  for (const def of DOOR_DEFS) {
    const grp = new THREE.Group();
    grp.position.set(def.x, 0, z);

    // Rahmen
    for (const dx of [-doorW / 2 - 0.06, doorW / 2 + 0.06]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, doorH, 0.5), toon(0x2c3046));
      post.position.set(dx, doorH / 2, 0);
      grp.add(post);
    }

    // T\u00fcrfl\u00fcgel (Angel links)
    const pivot = new THREE.Group();
    pivot.position.set(-doorW / 2, 0, 0.12);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH - 0.1, 0.14), toon(def.empty ? 0x4a3a22 : 0x39312a));
    panel.position.set(doorW / 2, doorH / 2, 0);
    pivot.add(panel);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), toon(0xc9a227));
    knob.position.set(doorW - 0.2, doorH / 2, 0.1);
    pivot.add(knob);
    grp.add(pivot);

    // Schild mit Namen
    const sign = drawTextMesh(def.name, { color: '#2a1d12', size: 52, bg: '#cdb277', w: 1.0, h: 0.3 });
    sign.position.set(0, doorH + 0.18, 0.22);
    grp.add(sign);

    // Gravur mit Hinweis (kleiner, dunkler)
    const clue = drawTextMesh(def.clue, { color: '#9aa0c0', size: 30, w: 1.15, h: 0.26 });
    clue.position.set(0, 0.7, 0.16);
    grp.add(clue);

    scene.add(grp);

    const data = { def, pivot, panel, sign, opened: false };
    doors.push(data);
    if (def.empty) exitDoorX = def.x;
    register(panel, def.name, () => tryDoor(data));
  }

  // Meta-Hinweistafel mittig \u00fcber den T\u00fcren
  const meta = drawTextMesh('Was nichts trägt, trägt dich fort.', { color: '#e9d8ab', size: 30, w: 3.2, h: 0.4 });
  meta.position.set(0, doorH + 0.7, Z_NORTH);
  scene.add(meta);
}

function energizeDoors() {
  // T\u00fcrkn\u00e4ufe leuchten kurz auf \u2013 die T\u00fcren \u201eleben\u201c jetzt
  doors.forEach((d) => {
    animations.push({ t: 0, dur: 0.8, fn: (k) => { d.sign.position.z = 0.22 + Math.sin(k * Math.PI) * 0.05; } });
  });
  const pulse = new THREE.PointLight(0xfff2cc, 0, 16, 2);
  pulse.position.set(0, 2.5, Z_NORTH + 1.5);
  scene.add(pulse);
  animations.push({ t: 0, dur: 1.2, fn: (k) => { pulse.intensity = 8 * Math.sin(k * Math.PI); } });
}

function tryDoor(data) {
  if (state.doorOpen) return;
  if (!state.doorsLive) {
    toast('Die T\u00fcr sitzt fest. Dem Flur fehlt noch die Macht, sie zu \u00f6ffnen.');
    sound.thud();
    return;
  }
  if (!data.def.empty) {
    toast('Verschlossen \u2014 dahinter ist kein Durchgang.');
    sound.thud();
    return;
  }
  // richtige (leere) T\u00fcr
  data.opened = true;
  state.doorOpen = true;
  fillLock('door');
  toast('Die T\u00fcr schwingt auf \u2014 dahinter nur Dunkelheit und ein Hauch frischer Luft.');
  sound.door();
  animations.push({ t: 0, dur: 1.8, fn: (k) => { data.pivot.rotation.y = -(1 - Math.pow(1 - k, 3)) * 1.9; } });

  // Durchgang ins Freie hinter der T\u00fcr
  const hall = new THREE.Group();
  hall.position.set(data.def.x, 0, Z_NORTH - 0.4);
  const f = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 4), toon(0x2c3046));
  f.position.set(0, -0.05, -2);
  hall.add(f);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.0), new THREE.MeshBasicMaterial({ color: 0xfff2cc }));
  glow.position.set(0, 1.6, -3.9);
  hall.add(glow);
  const exitLight = new THREE.PointLight(0xfff2cc, 12, 12, 2);
  exitLight.position.set(0, 1.8, -3);
  hall.add(exitLight);
  scene.add(hall);

  updateProgress();
}

buildDoors();

// ---------- Aufgaben-Text (bewusst vage) ----------

function objText(s) { document.getElementById('objective-text').textContent = s; }
function updateProgress() {
  if (state.doorOpen) { objText('Eine Tür steht offen.'); return; }
  if (state.doorsLive) { objText('Fünf Türen warten.'); return; }
  if (state.codeSolved) { objText('Etwas an der Wand erwacht.'); return; }
  objText('Ein finsterer Flur voller alter Dinge.');
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

function fillLock(key) {
  document.getElementById(`lock-${key}`).classList.add('filled');
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

// ---------- Klang ----------

const sound = (() => {
  let ctx;
  function ac() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }
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
    tick() { tone(900, 0.05, 'square', 0.05); tone(1400, 0.04, 'square', 0.03, 0.01); },
    note(freq) { tone(freq, 0.4, 'sine', 0.12); tone(freq * 2, 0.25, 'sine', 0.04, 0.01); },
    flick() { tone(1200, 0.05, 'square', 0.06); tone(220, 0.18, 'sawtooth', 0.04, 0.02); },
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
const nextRoomUrl = 'room5.html?autostart=1';

function enterRoom() {
  titleScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  if (!state.startTime) state.startTime = performance.now();
}

document.getElementById('start-btn').addEventListener('click', () => { sound.unlock(); enterRoom(); if (touchControls.isTouchDevice) touchControls.enable(); else controls.lock(); });
document.getElementById('resume-btn').addEventListener('click', () => { if (touchControls.isTouchDevice) touchControls.enable(); else controls.lock(); });
document.getElementById('again-btn').addEventListener('click', () => { window.location.href = 'room5.html'; });

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

function updateHover(pointer = center) {
  raycaster.setFromCamera(pointer, camera);
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

document.addEventListener('mousedown', (e) => { if (controls.isLocked && e.button === 0) interact(); });
document.addEventListener('keydown', (e) => { if (controls.isLocked && e.code === 'KeyE') interact(); });

// ---------- Bewegung & Kollision (Korridor) ----------

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

  // Bei offener Ausgangst\u00fcr und Ausrichtung auf deren x hebt sich die Nord-Begrenzung
  const inDoorway = state.doorOpen && Math.abs(p.x - exitDoorX) < 0.6;

  // Rechteck-Begrenzung
  if (inDoorway) {
    // im T\u00fcrdurchgang schmal um die T\u00fcrachse f\u00fchren, nach Norden frei
    if (p.z < Z_NORTH + 0.4) p.x = THREE.MathUtils.clamp(p.x, exitDoorX - 0.55, exitDoorX + 0.55);
    else p.x = THREE.MathUtils.clamp(p.x, -HALF_W + 0.3, HALF_W - 0.3);
    if (p.z > Z_SOUTH - 0.4) p.z = Z_SOUTH - 0.4;
  } else {
    p.x = THREE.MathUtils.clamp(p.x, -HALF_W + 0.3, HALF_W - 0.3);
    if (p.z > Z_SOUTH - 0.4) p.z = Z_SOUTH - 0.4;
    if (p.z < Z_NORTH + 0.4) p.z = Z_NORTH + 0.4;
  }

  // M\u00f6bel
  for (const c of colliders) {
    const dx = p.x - c.x, dz = p.z - c.z;
    const d = Math.hypot(dx, dz);
    const min = c.r + 0.35;
    if (d < min && d > 0.0001) {
      p.x = c.x + (dx / d) * min;
      p.z = c.z + (dz / d) * min;
    }
  }

  // Schrittfolge: betreten eines Bodenfelds erkennen
  let onTile = -1;
  for (const s of stepTiles) {
    if (Math.abs(p.x - s.mesh.position.x) < 0.75 && Math.abs(p.z - s.mesh.position.z) < 0.75) { onTile = s.index; break; }
  }
  if (onTile !== lastTileId) {
    lastTileId = onTile;
    if (onTile >= 0) stepOnTile(stepTiles[onTile]);
  }

  // Flucht geschafft?
  if (state.doorOpen && !state.escaped && p.z < Z_NORTH - 3.5) win();
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

  // unter UV das Hauptlicht d\u00e4mpfen
  const targetHemi = state.uvOn ? 0.12 : HEMI_BASE;
  hemi.intensity += (targetHemi - hemi.intensity) * Math.min(1, dt * 6);

  for (const torch of torchLights) {
    const flick = Math.sin(t * 11 + torch.seed) * 0.5 + Math.sin(t * 23 + torch.seed * 2) * 0.3;
    const target = state.uvOn ? 2 : torch.base;
    torch.light.intensity += (target + flick * (state.uvOn ? 0.5 : 5) - torch.light.intensity) * Math.min(1, dt * 6);
    torch.flame.scale.setScalar(1 + flick * 0.12);
    torch.flame.visible = !state.uvOn || true;
  }

  // Staub
  const pos = dust.geometry.attributes.position;
  for (let i = 0; i < dustCount; i++) {
    let y = pos.getY(i) + dt * 0.05;
    if (y > WALL_HEIGHT) y = 0;
    pos.setY(i, y);
  }
  pos.needsUpdate = true;

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
