// ============ Arcanum — Raum 5: Die Dampfhalle des Erzmagiers ============
//
// Architektur-Hinweis (vgl. main.js / room2.js / room3.js / room4.js):
// Gleiches eigenständiges Modul-Prinzip wie die übrigen Räume — selber
// Renderer-/Toon-Aufbau, dieselbe register()-Interaktions-Registry, dieselbe
// Bewegungs-/Kollisions- und Tor-/Sieg-Logik. Neu ist die RAUMFORM: eine
// breite, rechteckige MASCHINENHALLE mit einem zentralen Reaktor-Kessel,
// um den herum man laufen muss. Für ein späteres Gesamtspiel lässt sich auch
// diese Datei zu einer init()-Funktion kapseln und vom selben Loader aufrufen.
//
// FÜNF Rätsel (Industrie-/Technik-Thema) führen zum Reaktortor:
//   Ⅰ) Rohrleitung/Ventil – verfolge den offenen Dampfweg, die Ventile darauf
//        ergeben den 4-stelligen Code am Schaltpult.
//   Ⅱ) Magnettafel       – ordne die Sicherheitssymbole in der Reihenfolge des
//        Aushangs an.
//   Ⅲ) Falscher Hinweis  – drei Hebel, drei widersprüchliche Schilder; nur einer
//        sagt die Wahrheit. Zieh den richtigen Hebel.
//   Ⅳ) Schrank-Nummern   – addiere die Schränke mit Feuerlöscher-Zeichen → Code.
//   Ⅴ) Schattenrätsel    – (erst nach Ⅰ–Ⅳ) richte die Lampe so aus, dass die drei
//        Objekte zusammen die Zahl 729 als Schatten werfen → Reaktortor öffnet.

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createMobileControls } from './mobileControls.js';

// ---------- Grundgerüst ----------

const WALL_HEIGHT = 5.5;
const EYE_HEIGHT = 1.7;

// Hallen-Maße (breites Rechteck)
const HALF_X = 6.0;       // halbe Hallenbreite (x)
const Z_FRONT = 9.0;      // Startwand (Süden, +Z)
const Z_BACK = -9.0;      // Reaktortor-Wand (Norden, -Z)

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10131a);
scene.fog = new THREE.FogExp2(0x10131a, 0.026);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, EYE_HEIGHT, 8); // Start im Süden, Blick nach Norden (-Z) zum Reaktor

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

// Canvas-Text/Icon-Helfer. Gibt ein Mesh zurück, das per .userData.redraw(text) neu beschriftet werden kann.
function drawTextMesh(text, { color = '#e9d8ab', size = 64, bg = null, w = 0.5, h = 0.28, emoji = false } = {}) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 144;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
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

const hemi = new THREE.HemisphereLight(0x49506a, 0x161208, 0.55);
scene.add(hemi);
const HEMI_BASE = 0.55;

const torchLights = [];
function makeSconce(x, z) {
  const grp = new THREE.Group();
  grp.position.set(x, 3.0, z);
  grp.lookAt(0, 3.0, z);

  const bracket = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 10), toon(0x6b5320));
  bracket.position.set(0, 0.05, 0.12);
  grp.add(bracket);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 7), new THREE.MeshBasicMaterial({ color: 0xffb24a }));
  flame.position.set(0, 0.42, 0.2);
  grp.add(flame);
  const light = new THREE.PointLight(0xffa83a, 16, 13, 2);
  light.position.set(0, 0.42, 0.5);
  grp.add(light);

  torchLights.push({ light, flame, seed: Math.random() * 100, base: 16 });
  scene.add(grp);
}
for (const z of [6, 0, -6]) {
  makeSconce(-HALF_X + 0.15, z);
  makeSconce(HALF_X - 0.15, z);
}

// ---------- Geometrie: die Halle ----------

const LEN = Z_FRONT - Z_BACK;
const MIDZ = (Z_FRONT + Z_BACK) / 2;

const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF_X * 2 + 0.4, LEN + 0.4), toon(0x2a2c36));
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0, MIDZ);
scene.add(floor);

// Boden-Riffelblech-Streifen (Deko)
for (let z = Z_FRONT - 1; z > Z_BACK; z -= 2.4) {
  const strip = new THREE.Mesh(new THREE.BoxGeometry(HALF_X * 2, 0.04, 0.12), toon(0x3a3d4a));
  strip.position.set(0, 0.02, z);
  scene.add(strip);
}

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(HALF_X * 2 + 0.4, LEN + 0.4), toon(0x16131c));
ceiling.rotation.x = Math.PI / 2;
ceiling.position.set(0, WALL_HEIGHT, MIDZ);
scene.add(ceiling);

// Seitenwände (Ost/West)
for (const side of [-1, 1]) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, WALL_HEIGHT, LEN + 0.4), toon(0x3a3f54));
  wall.position.set(side * (HALF_X + 0.2), WALL_HEIGHT / 2, MIDZ);
  scene.add(wall);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, LEN + 0.4), toon(0x24262f));
  skirt.position.set(side * (HALF_X + 0.18), 0.3, MIDZ);
  scene.add(skirt);
}

// Südwand (Rücken)
const southWall = new THREE.Mesh(new THREE.BoxGeometry(HALF_X * 2 + 0.8, WALL_HEIGHT, 0.4), toon(0x3a3f54));
southWall.position.set(0, WALL_HEIGHT / 2, Z_FRONT + 0.2);
scene.add(southWall);

// Deckenrohre quer durch die Halle (Industrie-Deko)
for (let z = Z_FRONT - 1.5; z > Z_BACK; z -= 3) {
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, HALF_X * 2, 10), toon(0x7a5a28));
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(0, WALL_HEIGHT - 0.4, z);
  scene.add(pipe);
}

// Dampf-Partikel
const steamCount = 240;
const steamPos = new Float32Array(steamCount * 3);
for (let i = 0; i < steamCount; i++) {
  steamPos[i * 3] = (Math.random() * 2 - 1) * HALF_X;
  steamPos[i * 3 + 1] = Math.random() * WALL_HEIGHT;
  steamPos[i * 3 + 2] = MIDZ + (Math.random() * 2 - 1) * (LEN / 2);
}
const steamGeo = new THREE.BufferGeometry();
steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
const steam = new THREE.Points(steamGeo, new THREE.PointsMaterial({ color: 0xb8bccc, size: 0.05, transparent: true, opacity: 0.35, sizeAttenuation: true }));
scene.add(steam);

// ---------- Zentraler Reaktor-Kessel (Hindernis in der Hallenmitte) ----------

const boiler = new THREE.Group();
boiler.position.set(0, 0, 2.6);
{
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 3.4, 24), toon(0x8a6a2e));
  tank.position.y = 1.7;
  boiler.add(tank);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x9c7a36));
  cap.position.y = 3.4;
  boiler.add(cap);
  for (const ry of [0.6, 1.7, 2.8]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.08, 8, 24), toon(0x5a4520));
    band.rotation.x = Math.PI / 2;
    band.position.y = ry;
    boiler.add(band);
  }
  // glühendes Schauglas
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 18), new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
  glow.position.set(0, 1.7, 1.61);
  boiler.add(glow);
  const glowLight = new THREE.PointLight(0xff7a2a, 5, 6, 2);
  glowLight.position.set(0, 1.7, 2.0);
  boiler.add(glowLight);
  boiler.userData.glow = glow;
}
scene.add(boiler);

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
block(0, 2.6, 1.7); // Reaktor-Kessel

// ---------- Spielzustand ----------

const state = {
  pipesSolved: false,
  magnetSolved: false,
  leverSolved: false,
  numbersSolved: false,
  shadowReady: false,
  shadowSolved: false,
  doorOpen: false,
  escaped: false,
  startTime: null,
};

const animations = [];

// =====================================================================
//  RÄTSEL Ⅰ — ROHRLEITUNG / VENTIL
//  Ein Schaltplan an der Westwand: Dampf muss vom Eingang zum Reaktor.
//  Nur EIN Weg ist offen; gesperrte Leitungen sind rot durchgestrichen.
//  Die Ventile auf dem offenen Weg ergeben (in Flussrichtung) den Code.
//  Offener Weg:  DAMPF → V3 → V7 → V1 → V9 → REAKTOR   →  Code 3719
// =====================================================================

const PIPE_CODE = [3, 7, 1, 9];

// Schaltplan als gezeichnete Tafel
function makePipePlan() {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 460;
  const ctx = c.getContext('2d');
  // Hintergrund (Blaupause)
  ctx.fillStyle = '#13243a';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(120,160,210,0.18)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= c.width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke(); }
  for (let y = 0; y <= c.height; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke(); }

  // Knotenpositionen
  const P = {
    dampf:  [70, 380],
    v3:     [70, 250],
    v7:     [230, 250],
    v5:     [230, 380],   // Köder (gesperrt)
    v2:     [400, 380],   // Köder (Sackgasse)
    v1:     [400, 250],
    v8:     [400, 120],   // Köder (gesperrt)
    v9:     [560, 250],
    reaktor:[560, 110],
  };
  const line = (a, b, color, w = 10) => {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(P[b][0], P[b][1]); ctx.stroke();
  };
  const cross = (a, b) => {
    // rote Sperre in der Mitte einer Leitung
    const mx = (P[a][0] + P[b][0]) / 2, my = (P[a][1] + P[b][1]) / 2;
    ctx.strokeStyle = '#e0473a'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(mx - 12, my - 12); ctx.lineTo(mx + 12, my + 12);
    ctx.moveTo(mx + 12, my - 12); ctx.lineTo(mx - 12, my + 12); ctx.stroke();
  };

  // gesperrte / tote Leitungen (dunkel) zuerst
  line('dampf', 'v5', '#3c4a60');
  line('v5', 'v2', '#3c4a60');
  line('v2', 'v1', '#3c4a60');
  line('v1', 'v8', '#3c4a60');
  cross('dampf', 'v5');
  cross('v1', 'v8');

  // offener Dampfweg (leuchtendes Cyan)
  line('dampf', 'v3', '#46e0c8');
  line('v3', 'v7', '#46e0c8');
  line('v7', 'v1', '#46e0c8');
  line('v1', 'v9', '#46e0c8');
  line('v9', 'reaktor', '#46e0c8');

  // Ventile zeichnen
  const valve = (key, num, open) => {
    const [x, y] = P[key];
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fillStyle = open ? '#0f3b34' : '#2a2030';
    ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = open ? '#7af0d8' : '#7a5a6a';
    ctx.stroke();
    ctx.fillStyle = open ? '#bdfff2' : '#caa';
    ctx.font = '700 26px "Grenze Gotisch", serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('V' + num, x, y);
  };
  valve('v3', 3, true); valve('v7', 7, true); valve('v1', 1, true); valve('v9', 9, true);
  valve('v5', 5, false); valve('v2', 2, false); valve('v8', 8, false);

  // Endpunkte
  ctx.font = '700 26px "Grenze Gotisch", serif';
  ctx.fillStyle = '#ffe49a';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('DAMPF', 20, 415);
  ctx.textAlign = 'right';
  ctx.fillText('REAKTOR', 600, 80);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.87), new THREE.MeshBasicMaterial({ map: tex }));
}

const pipeWheels = [];
{
  // Schaltplan an der Westwand
  const planFrame = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.05, 0.1), toon(0x5a4520));
  planFrame.position.set(-HALF_X + 0.1, 2.7, 4.5);
  planFrame.rotation.y = Math.PI / 2;
  scene.add(planFrame);
  const plan = makePipePlan();
  plan.position.set(-HALF_X + 0.16, 2.7, 4.5);
  plan.rotation.y = Math.PI / 2;
  scene.add(plan);
  register(planFrame, 'Schaltplan studieren', () => {
    openReading('Dampf-Schaltplan', `
      <p>Die Blaupause ist voller alter Korrekturen. Nur eine Linie wirkt frisch nachgezogen.</p>
    `);
  });

  // Schaltpult mit vier Ziffern-Walzen (Westwand, weiter südlich)
  const console0 = new THREE.Group();
  console0.position.set(-HALF_X + 0.7, 0, 6.6);
  console0.rotation.y = Math.PI / 2;

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.7), toon(0x4a4f63));
  body.position.y = 1.0;
  body.rotation.x = -0.0;
  console0.add(body);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.1), toon(0x2a2e3a));
  panel.position.set(0, 1.25, 0.36);
  panel.rotation.x = -0.5;
  console0.add(panel);

  for (let i = 0; i < 4; i++) {
    const wx = -0.5 + i * 0.33;
    const drum = new THREE.Group();
    drum.position.set(wx, 1.28, 0.4);
    drum.rotation.x = -0.5;
    
    // Würfel statt Zylinder als Walze
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), toon(0xc9a227));
    cube.rotation.z = Math.PI / 2;
    drum.add(cube);
    
    // Ziffer auf Würfel-Vorderseite
    const digit = drawTextMesh('0', { color: '#2a1d12', size: 80, w: 0.19, h: 0.19 });
    digit.position.set(0, 0, 0.095);
    digit.rotation.x = 0.5;
    drum.add(digit);
    console0.add(drum);

    const data = { value: 0, digit, cube };
    pipeWheels.push(data);
    register(drum, 'Ventil-Walze drehen', () => bumpPipe(data));
  }
  scene.add(console0);
  block(-HALF_X + 0.7, 6.6, 0.9);
}

function bumpPipe(data) {
  if (state.pipesSolved) return;
  data.value = (data.value + 1) % 10;
  data.digit.userData.redraw(String(data.value));
  sound.tick();
  if (pipeWheels.every((w, i) => w.value === PIPE_CODE[i])) {
    state.pipesSolved = true;
    pipeWheels.forEach((w) => w.cube.material.color.setHex(0x52d273));
    fillLock('pipes');
    toast('Tief in der Halle öffnet sich ein Ventil — Dampf strömt durch die Leitung.');
    sound.success();
    sound.hiss();
    afterPuzzle();
  }
}

// =====================================================================
//  RÄTSEL Ⅱ — MAGNETTAFEL MIT SICHERHEITSSYMBOLEN
//  Eine Metalltafel mit fünf Magnet-Symbolen. Sie müssen in der Reihenfolge
//  des Sicherheits-Aushangs angeordnet werden. Klick auf ein Feld blättert
//  durch die Symbole.
//  Reihenfolge laut Aushang:  ⚠ Warnung → 🥽 Augenschutz → 🧤 Handschuhe →
//                             🔥 Feuer fernhalten → ❗ Restgefahr
// =====================================================================

const SYMBOLS = ['\u26A0\uFE0F', '\uD83E\uDD7D', '\uD83E\uDDE4', '\uD83D\uDD25', '\u2757'];
const SYMBOL_NAMES = ['Warnung', 'Augenschutz', 'Handschuhe', 'Feuer', 'Restgefahr'];
const MAGNET_TARGET = [0, 1, 2, 3, 4]; // Index in SYMBOLS, von links nach rechts
const magnetSlots = [];

{
  // Aushang (Poster) an der Südwand — gibt die Reihenfolge vor
  const posterFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.9, 0.08), toon(0x5a4520));
  posterFrame.position.set(-3.6, 2.6, Z_FRONT - 0.05);
  posterFrame.rotation.y = Math.PI;
  scene.add(posterFrame);
  const poster = drawSafetyPoster();
  poster.position.set(-3.6, 2.6, Z_FRONT - 0.1);
  poster.rotation.y = Math.PI;
  scene.add(poster);
  register(posterFrame, 'Sicherheits-Aushang lesen', () => {
    openReading('Sicherheits-Aushang', `
      <p style="text-align:center;font-size:1.6rem;letter-spacing:.3rem;">
      \u26A0\uFE0F&nbsp; \uD83E\uDD7D&nbsp; \uD83E\uDDE4&nbsp; \uD83D\uDD25&nbsp; \u2757</p>
      <p>Der untere Text ist von Dampf aufgeweicht.</p>
    `);
  });

  // Metalltafel an der Ostwand
  const board = new THREE.Group();
  board.position.set(HALF_X - 0.1, 2.4, -1.5);
  board.rotation.y = -Math.PI / 2;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.3, 0.1), toon(0x6b7280));
  board.add(plate);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.4, 0.06), toon(0x3a3f4a));
  rim.position.z = -0.04;
  board.add(rim);

  for (let i = 0; i < 5; i++) {
    const sx = -1.1 + i * 0.55;
    const slotBg = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), toon(0x2a2e38));
    slotBg.position.set(sx, 0.05, 0.06);
    board.add(slotBg);
    const sym = drawTextMesh(SYMBOLS[i], { emoji: true, size: 90, w: 0.42, h: 0.42 });
    sym.position.set(sx, 0.05, 0.07);
    board.add(sym);
    const data = { value: i, sym, index: i };
    magnetSlots.push(data);
    register(slotBg, 'Magnet versetzen', () => cycleMagnet(data));
  }
  scene.add(board);
}

// --- Werkzeuge, Anzeigen und tote Ventile als thematischer Lärm ---
{
  const toolRack = new THREE.Group();
  toolRack.position.set(2.5, 0, 6.7);
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 0.65), toon(0x4a4f63));
  base.position.y = 0.75;
  toolRack.add(base);
  for (let i = 0; i < 5; i++) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 8), toon(0x9a9aa6));
    rod.rotation.z = 0.2 + i * 0.18;
    rod.position.set(-0.8 + i * 0.4, 1.05, 0);
    toolRack.add(rod);
  }
  scene.add(toolRack);
  block(2.5, 6.7, 0.9);
  register(toolRack, 'Werkzeugablage', () => toast('Schlüssel, Zangen, rostige Messfühler. Keiner passt ins Tor.'));

  for (const [x, z, col] of [[-4.4, 0.5, 0xd23a3a], [4.8, 2.2, 0x4a6bff], [-3.9, -7.2, 0xf0c84a]]) {
    const valve = new THREE.Group();
    valve.position.set(x, 1.6, z);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 8, 20), toon(col));
    wheel.rotation.x = Math.PI / 2;
    valve.add(wheel);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), toon(0x6b7280));
    valve.add(stem);
    scene.add(valve);
    register(wheel, 'Blindes Ventil', () => toast('Es dreht leer durch. Kein Dampf antwortet.'));
  }
}

function drawSafetyPoster() {
  const c = document.createElement('canvas');
  c.width = 300; c.height = 380;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e7dcc0'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#7a2d22'; ctx.fillRect(0, 0, c.width, 56);
  ctx.fillStyle = '#fff'; ctx.font = '700 30px "Grenze Gotisch", serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('SICHERHEIT', c.width / 2, 28);
  const items = ['\u26A0\uFE0F Warnung beachten', '\uD83E\uDD7D Augenschutz', '\uD83E\uDDE4 Handschuhe', '\uD83D\uDD25 Feuer fernhalten', '\u2757 Restgefahr'];
  ctx.textAlign = 'left';
  ctx.fillStyle = '#2a1d12';
  items.forEach((t, i) => {
    ctx.font = '32px serif';
    ctx.fillText(String(i + 1) + '.', 20, 100 + i * 56);
    ctx.font = '24px "IM Fell English", serif';
    ctx.fillText(t, 60, 100 + i * 56);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.78), new THREE.MeshBasicMaterial({ map: tex }));
}

function cycleMagnet(data) {
  if (state.magnetSolved) return;
  data.value = (data.value + 1) % SYMBOLS.length;
  data.sym.userData.redraw(SYMBOLS[data.value]);
  sound.clack();
  if (magnetSlots.every((s, i) => s.value === MAGNET_TARGET[i])) {
    state.magnetSolved = true;
    fillLock('magnet');
    toast('Die Symbole rasten in der richtigen Ordnung ein.');
    sound.success();
    afterPuzzle();
  }
}

// =====================================================================
//  RÄTSEL Ⅲ — FALSCHER HINWEIS (HEBEL-LOGIK)
//  Drei Hebel (rot, blau, grün) mit je einem Schild. Meta-Regel:
//  »Nur ein Schild sagt die Wahrheit.«
//    rot:  »Der sichere Hebel ist nicht der grüne.«
//    blau: »Der sichere Hebel ist der rote.«
//    grün: »Der sichere Hebel ist nicht der rote.«
//  Prüft man jeden Kandidaten, sagt nur bei GRÜN genau ein Schild die Wahrheit.
//  → Der grüne Hebel ist sicher.
// =====================================================================

const LEVER_DEFS = [
  { key: 'rot',  col: 0xd23a3a, x: 1.6, claim: '\u00bbDer sichere Hebel ist nicht der gr\u00fcne.\u00ab', safe: false },
  { key: 'blau', col: 0x4a6bff, x: 3.0, claim: '\u00bbDer sichere Hebel ist der rote.\u00ab',        safe: false },
  { key: 'gr\u00fcn', col: 0x3fae54, x: 4.4, claim: '\u00bbDer sichere Hebel ist nicht der rote.\u00ab', safe: true },
];

{
  // Meta-Schild über den Hebeln
  const meta = drawTextMesh('Nur eines lügt nicht.', { color: '#e9d8ab', size: 30, w: 3.0, h: 0.36 });
  meta.position.set(3.0, 3.5, Z_FRONT - 0.06);
  meta.rotation.y = Math.PI;
  scene.add(meta);

  for (const def of LEVER_DEFS) {
    const grp = new THREE.Group();
    grp.position.set(def.x, 0, Z_FRONT - 0.25);
    grp.rotation.y = Math.PI;

    // Sockel
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.4), toon(0x3a3f4a));
    base.position.y = 0.5;
    grp.add(base);
    // farbige Lampe
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), new THREE.MeshBasicMaterial({ color: def.col }));
    lamp.position.set(0, 0.95, 0.21);
    grp.add(lamp);
    // Hebel (dreht sich beim Ziehen)
    const pivot = new THREE.Group();
    pivot.position.set(0, 1.0, 0.18);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 10), toon(0x9a9aa6));
    handle.position.y = 0.3;
    pivot.add(handle);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), toon(def.col));
    knob.position.y = 0.6;
    pivot.add(knob);
    grp.add(pivot);

    // Schild mit Behauptung
    const signPlate = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), toon(0xe7dcc0));
    signPlate.position.set(0, 1.85, 0.05);
    grp.add(signPlate);
    const signText = drawTextMesh(def.key.toUpperCase(), { color: '#2a1d12', size: 38, w: 1.1, h: 0.4 });
    signText.position.set(0, 1.85, 0.06);
    grp.add(signText);

    scene.add(grp);

    const data = { def, pivot, lamp };
    register(knob, `Hebel ${def.key} ziehen`, () => pullLever(data));
    register(signPlate, `Schild ${def.key} lesen`, () => {
      openReading(`Schild am ${def.key}en Hebel`, `<p style="font-size:1.3rem;">${def.claim}</p>`);
    });
  }
}

let leverBusy = false;
function pullLever(data) {
  if (state.leverSolved || leverBusy) return;
  leverBusy = true;
  // Hebel-Animation nach unten und (bei falsch) zurück
  animations.push({ t: 0, dur: 0.4, fn: (k) => { data.pivot.rotation.x = k * 0.9; } });
  if (data.def.safe) {
    sound.clack();
    setTimeout(() => {
      state.leverSolved = true;
      data.lamp.material.color.setHex(0x52ff8a);
      fillLock('lever');
      toast('Ein sattes Klacken — der richtige Hebel rastet ein.');
      sound.success();
      afterPuzzle();
      leverBusy = false;
    }, 420);
  } else {
    sound.hiss();
    toast('Zischend entweicht Dampf — der Hebel springt zurück.');
    setTimeout(() => {
      animations.push({ t: 0, dur: 0.4, fn: (k) => { data.pivot.rotation.x = 0.9 * (1 - k); } });
      leverBusy = false;
    }, 450);
  }
}

// =====================================================================
//  RÄTSEL Ⅳ — SCHRANK-NUMMERN (ZAHLENSCHLOSS)
//  Eine Reihe nummerierter Schränke an der Westwand. Einige tragen ein
//  Feuerlöscher-Zeichen (🧯). Ein Schild fordert: »Addiere alle Schränke
//  mit dem Feuerlöscher-Zeichen.«   112 + 230 + 51 = 393  → Code 393.
// =====================================================================

const LOCKERS = [
  { n: 112, fire: true }, { n: 47, fire: false }, { n: 230, fire: true },
  { n: 8, fire: false }, { n: 51, fire: true }, { n: 19, fire: false },
];
const NUMBER_CODE = [3, 9, 3];
const numberWheels = [];

{
  // Schrankreihe (Westwand, Nordteil) — 2 Reihen × 3 Spalten
  const cab = new THREE.Group();
  cab.position.set(-HALF_X + 0.12, 0, -3.5);
  cab.rotation.y = Math.PI / 2;
  const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 0.12), toon(0x44485a));
  back.position.set(0, 1.6, 0);
  cab.add(back);

  LOCKERS.forEach((l, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const dx = -1.0 + col * 1.0;
    const dy = 2.25 - row * 1.15;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.05, 0.1), toon(0x6b7280));
    door.position.set(dx, dy, 0.08);
    cab.add(door);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), toon(0x2a2e38));
    handle.position.set(dx + 0.35, dy, 0.15);
    cab.add(handle);
    // Nummernschild
    const plate = drawTextMesh(String(l.n).padStart(3, '0'), { color: '#1a1410', bg: '#cdb277', size: 60, w: 0.55, h: 0.26 });
    plate.position.set(dx, dy + 0.32, 0.14);
    cab.add(plate);
    // Feuerlöscher-Zeichen
    if (l.fire) {
      const fire = drawTextMesh('\uD83E\uDDEF', { emoji: true, size: 80, w: 0.4, h: 0.4 });
      fire.position.set(dx, dy - 0.18, 0.14);
      cab.add(fire);
    }
    register(door, `Schrank ${String(l.n).padStart(3, '0')}`, () => {
      openReading(`Schrank ${String(l.n).padStart(3, '0')}`, `
        <p>Verschlossen.</p>
        ${l.fire ? '<p style="text-align:center;font-size:2.4rem;">\uD83E\uDDEF</p>' : '<p>Nur abgeplatzter Lack.</p>'}
      `);
    });
  });
  scene.add(cab);

  // Anweisungsschild
  const instr = drawTextMesh('\uD83E\uDDEF zählt.', { color: '#e9d8ab', size: 34, w: 1.5, h: 0.34 });
  instr.position.set(-HALF_X + 0.16, 3.4, -3.5);
  instr.rotation.y = Math.PI / 2;
  scene.add(instr);

  // Zahlenschloss (3 Walzen) auf einem Pult davor
  const pad = new THREE.Group();
  pad.position.set(-HALF_X + 0.9, 0, -6.0);
  pad.rotation.y = Math.PI / 2;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.05, 0.6), toon(0x4a4f63));
  body.position.y = 0.95;
  pad.add(body);
  const face = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.1), toon(0x2a2e3a));
  face.position.set(0, 1.2, 0.32);
  face.rotation.x = -0.5;
  pad.add(face);
  for (let i = 0; i < 3; i++) {
    const wx = -0.36 + i * 0.36;
    const drum = new THREE.Group();
    drum.position.set(wx, 1.22, 0.36);
    drum.rotation.x = -0.5;
    
    // Würfel statt Zylinder als Walze
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), toon(0xc9a227));
    cube.rotation.z = Math.PI / 2;
    drum.add(cube);
    
    // Ziffer auf Würfel-Vorderseite
    const digit = drawTextMesh('0', { color: '#2a1d12', size: 80, w: 0.19, h: 0.19 });
    digit.position.set(0, 0, 0.095);
    digit.rotation.x = 0.5;
    drum.add(digit);
    pad.add(drum);
    const data = { value: 0, digit, cube };
    numberWheels.push(data);
    register(drum, 'Zahlenrad drehen', () => bumpNumber(data));
  }
  scene.add(pad);
  block(-HALF_X + 0.9, -6.0, 0.8);
}

function bumpNumber(data) {
  if (state.numbersSolved) return;
  data.value = (data.value + 1) % 10;
  data.digit.userData.redraw(String(data.value));
  sound.tick();
  if (numberWheels.every((w, i) => w.value === NUMBER_CODE[i])) {
    state.numbersSolved = true;
    numberWheels.forEach((w) => w.cube.material.color.setHex(0x52d273));
    fillLock('numbers');
    toast('Das Zahlenschloss springt auf.');
    sound.success();
    afterPuzzle();
  }
}

// =====================================================================
//  RÄTSEL Ⅴ — SCHATTENRÄTSEL (FINALE, erst nach Ⅰ–Ⅳ)
//  Über dem Reaktor hängt eine Lampe und davor drei seltsame Objekte.
//  Erst wenn die ersten vier Rätsel gelöst sind, bekommt die Lampe Strom.
//  Per Klick wandert ihr Strahl durch vier Stellungen; in genau einer
//  fügen sich die Schatten der drei Objekte zur Zahl 729 — dann öffnet
//  sich das Reaktortor.
// =====================================================================

const SHADOW_CORRECT = 2; // korrekte Lampenstellung (0..3)
let shadowIndex = 0;
let shadowLamp, shadowBulb, shadowLight, shadowObjGroup, shadowScreenTex, shadowScreenMesh;

{
  // Projektionswand an der Nordwand, östlich des Tors
  const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 0.1), toon(0x2a2e3a));
  screenFrame.position.set(3.3, 2.4, Z_BACK + 0.06);
  scene.add(screenFrame);
  const sc = document.createElement('canvas');
  sc.width = 320; sc.height = 280;
  shadowScreenTex = new THREE.CanvasTexture(sc);
  shadowScreenTex.anisotropy = 4;
  shadowScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.8), new THREE.MeshBasicMaterial({ map: shadowScreenTex }));
  shadowScreenMesh.position.set(3.3, 2.4, Z_BACK + 0.12);
  scene.add(shadowScreenMesh);
  shadowScreenMesh.userData.draw = (idx, powered) => {
    const ctx = sc.getContext('2d');
    ctx.fillStyle = powered ? '#cdbf9a' : '#3a3a40';
    ctx.fillRect(0, 0, sc.width, sc.height);
    if (!powered) { shadowScreenTex.needsUpdate = true; return; }
    ctx.fillStyle = 'rgba(20,16,12,0.92)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (idx === SHADOW_CORRECT) {
      ctx.font = '700 150px "Grenze Gotisch", serif';
      ctx.fillText('729', sc.width / 2, sc.height / 2 + 6);
    } else {
      // verzerrte, übereinanderliegende Schatten
      ctx.save();
      ctx.globalAlpha = 0.5;
      const sets = [['7', '2', '9'], ['1', '5', '3'], ['4', '8', '6'], ['9', '0', '2']];
      const glyphs = sets[idx % sets.length];
      glyphs.forEach((g, i) => {
        ctx.font = '700 150px "Grenze Gotisch", serif';
        ctx.fillText(g, sc.width / 2 + (i - 1) * 18 * (idx + 1), sc.height / 2 + 6 + (i - 1) * 10);
      });
      ctx.restore();
    }
    shadowScreenTex.needsUpdate = true;
  };
  shadowScreenMesh.userData.draw(0, false);

  // Lampe (hängt von der Decke)
  shadowLamp = new THREE.Group();
  shadowLamp.position.set(3.3, 4.3, -4.0);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), toon(0x222));
  cord.position.y = 0.7;
  shadowLamp.add(cord);
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.4, 16, 1, true), toon(0x7a5a28, { side: THREE.DoubleSide }));
  shadowLamp.add(hood);
  shadowBulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshBasicMaterial({ color: 0x3a3320 }));
  shadowBulb.position.y = -0.05;
  shadowLamp.add(shadowBulb);
  shadowLight = new THREE.SpotLight(0xfff0c4, 0, 16, 0.6, 0.4, 1.5);
  shadowLight.position.set(0, 0, 0);
  shadowLamp.add(shadowLight);
  const lampTarget = new THREE.Object3D();
  lampTarget.position.set(0, -4, -2);
  shadowLamp.add(lampTarget);
  shadowLight.target = lampTarget;
  scene.add(shadowLamp);
  register(hood, 'Lampe ausrichten', () => cycleShadow());

  // drei seltsame Objekte zwischen Lampe und Wand
  shadowObjGroup = new THREE.Group();
  shadowObjGroup.position.set(3.3, 2.6, -6.2);
  const o1 = new THREE.Mesh(new THREE.TorusKnotGeometry(0.18, 0.06, 64, 8), toon(0x9a7a3a));
  o1.position.set(-0.5, 0.3, 0);
  shadowObjGroup.add(o1);
  const o2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.26), toon(0x8a8a96));
  o2.position.set(0, -0.1, 0);
  shadowObjGroup.add(o2);
  const o3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22), toon(0x7a5a52));
  o3.position.set(0.5, 0.25, 0);
  shadowObjGroup.add(o3);
  // Über eine Kopie iterieren — sonst wachsen die neuen Schnüre die Liste endlos.
  const shadowObjects = [...shadowObjGroup.children];
  for (const o of shadowObjects) {
    const cordo = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.6, 5), toon(0x222));
    cordo.position.set(o.position.x, o.position.y + 0.9, o.position.z);
    shadowObjGroup.add(cordo);
  }
  scene.add(shadowObjGroup);
}

function cycleShadow() {
  if (!state.shadowReady) {
    toast('Die Lampe über dem Reaktor bleibt dunkel — ihr fehlt noch die Kraft.');
    sound.thud();
    return;
  }
  if (state.shadowSolved) return;
  shadowIndex = (shadowIndex + 1) % 4;
  // Lampe sichtbar schwenken
  const ang = -0.5 + shadowIndex * 0.33;
  animations.push({ t: 0, dur: 0.4, fn: (k) => { shadowLamp.rotation.z = THREE.MathUtils.lerp(shadowLamp.rotation.z, ang, k); } });
  shadowObjGroup.rotation.y = shadowIndex * 0.25;
  shadowScreenMesh.userData.draw(shadowIndex, true);
  sound.flick();
  if (shadowIndex === SHADOW_CORRECT) {
    state.shadowSolved = true;
    fillLock('shadow');
    toast('Die Schatten fügen sich — deutlich steht die Zahl 729 an der Wand. Das Reaktortor erbebt.');
    sound.success();
    openReactor();
  }
}

// =====================================================================
//  REAKTORTOR (Ausgang an der Nordwand, x = 0)
// =====================================================================

const REACTOR_X = 0;
let reactorPivot;

function buildReactorDoor() {
  const z = Z_BACK - 0.2;
  const doorW = 2.4, doorH = 3.8;

  // Nordwand als Segmente links/rechts der Toröffnung
  const stops = [[-HALF_X - 0.2, REACTOR_X - doorW / 2], [REACTOR_X + doorW / 2, HALF_X + 0.2]];
  for (const [a, b] of stops) {
    if (b - a <= 0.02) continue;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(b - a, WALL_HEIGHT, 0.4), toon(0x3a3f54));
    seg.position.set((a + b) / 2, WALL_HEIGHT / 2, z);
    scene.add(seg);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(HALF_X * 2 + 0.4, WALL_HEIGHT - doorH, 0.4), toon(0x2c3046));
  lintel.position.set(0, doorH + (WALL_HEIGHT - doorH) / 2, z);
  scene.add(lintel);

  // Rahmen + Nieten
  for (const dx of [-doorW / 2 - 0.1, doorW / 2 + 0.1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, doorH, 0.6), toon(0x7a5a28));
    post.position.set(REACTOR_X + dx, doorH / 2, z);
    scene.add(post);
  }

  // Torflügel (schwere Schiebetür-Optik, dreht zum Öffnen)
  reactorPivot = new THREE.Group();
  reactorPivot.position.set(REACTOR_X - doorW / 2, 0, z + 0.12);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH - 0.1, 0.22), toon(0x5a4520));
  panel.position.set(doorW / 2, doorH / 2, 0);
  reactorPivot.add(panel);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 8, 20), toon(0xc9a227));
  wheel.position.set(doorW / 2, doorH / 2, 0.14);
  reactorPivot.add(wheel);
  const spokes = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.07, 0.07), toon(0xc9a227));
  spokes.position.set(doorW / 2, doorH / 2, 0.14);
  reactorPivot.add(spokes);
  const spokes2 = spokes.clone(); spokes2.rotation.z = Math.PI / 2; reactorPivot.add(spokes2);
  scene.add(reactorPivot);
  register(panel, 'Reaktortor', () => {
    if (!state.doorOpen) { toast('Das Tor ist fest verriegelt. Die Maschine schweigt noch.'); sound.thud(); }
  });

  // Schild über dem Tor
  const sign = drawTextMesh('REAKTOR', { color: '#ffcf6a', size: 56, w: 2.2, h: 0.5 });
  sign.position.set(REACTOR_X, doorH + 0.5, z + 0.25);
  scene.add(sign);
}
buildReactorDoor();

function openReactor() {
  state.doorOpen = true;
  animations.push({ t: 0, dur: 2.4, fn: (k) => { reactorPivot.rotation.y = -(1 - Math.pow(1 - k, 3)) * 1.95; } });
  sound.door();
  sound.hiss();

  // Durchgang ins Freie
  const hall = new THREE.Group();
  hall.position.set(REACTOR_X, 0, Z_BACK - 0.4);
  const f = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 5), toon(0x2c3046));
  f.position.set(0, -0.05, -2.5);
  hall.add(f);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.6), new THREE.MeshBasicMaterial({ color: 0xbfe6ff }));
  glow.position.set(0, 1.9, -4.9);
  hall.add(glow);
  const exitLight = new THREE.PointLight(0xbfe6ff, 14, 14, 2);
  exitLight.position.set(0, 2.0, -3.5);
  hall.add(exitLight);
  scene.add(hall);

  updateProgress();
}

// =====================================================================
//  Verkettung: erst nach Ⅰ–Ⅳ bekommt die Schatten-Lampe Strom
// =====================================================================

function afterPuzzle() {
  updateProgress();
  const core = state.pipesSolved && state.magnetSolved && state.leverSolved && state.numbersSolved;
  if (core && !state.shadowReady) {
    state.shadowReady = true;
    shadowBulb.material.color.setHex(0xfff0c4);
    shadowLight.intensity = 10;
    shadowScreenMesh.userData.draw(shadowIndex, true);
    if (boiler.userData.glow) boiler.userData.glow.material.color.setHex(0xffd24a);
    toast('Der Reaktor erwacht — über ihm flammt eine Lampe auf und wirft Schatten an die Wand.');
    sound.flame && sound.flame();
  }
}

// ---------- Aufgaben-Text (bewusst vage) ----------

function objText(s) { document.getElementById('objective-text').textContent = s; }
function updateProgress() {
  if (state.doorOpen) { objText('Das Reaktortor steht offen.'); return; }
  if (state.shadowReady) { objText('Die Lampe wirft Schatten.'); return; }
  const n = [state.pipesSolved, state.magnetSolved, state.leverSolved, state.numbersSolved].filter(Boolean).length;
  if (n > 0) { objText('Die Maschine erwacht Stück für Stück.'); return; }
  objText('Eine dampfende Maschinenhalle.');
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
  function noise(dur, vol = 0.06, when = 0) {
    const a = ac();
    const t0 = a.currentTime + when;
    const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = a.createBufferSource(); src.buffer = buf;
    const g = a.createGain(); g.gain.value = vol;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800;
    src.connect(f).connect(g).connect(a.destination);
    src.start(t0);
  }
  return {
    unlock() { ac().resume(); },
    tick() { tone(900, 0.05, 'square', 0.05); tone(1400, 0.04, 'square', 0.03, 0.01); },
    note(freq) { tone(freq, 0.4, 'sine', 0.12); tone(freq * 2, 0.25, 'sine', 0.04, 0.01); },
    flick() { tone(1200, 0.05, 'square', 0.06); tone(220, 0.18, 'sawtooth', 0.04, 0.02); },
    clack() { tone(320, 0.08, 'square', 0.08); tone(180, 0.12, 'triangle', 0.05, 0.01); },
    hiss() { noise(0.6, 0.05); },
    flame() { tone(160, 0.5, 'sawtooth', 0.05); noise(0.4, 0.03); },
    thud() { tone(110, 0.25, 'square', 0.06); },
    success() {},
    door() { tone(70, 1.4, 'sawtooth', 0.06); tone(55, 1.6, 'square', 0.05, 0.2); [392, 523, 659].forEach((f, i) => tone(f, 0.5, 'sine', 0.08, 0.6 + i * 0.15)); },
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

function enterRoom() {
  titleScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  if (!state.startTime) state.startTime = performance.now();
}

document.getElementById('start-btn').addEventListener('click', () => { sound.unlock(); enterRoom(); if (touchControls.isTouchDevice) touchControls.enable(); else controls.lock(); });
document.getElementById('resume-btn').addEventListener('click', () => { if (touchControls.isTouchDevice) touchControls.enable(); else controls.lock(); });
document.getElementById('again-btn').addEventListener('click', () => { window.location.href = 'index.html'; });

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
raycaster.far = 3.8;
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

// ---------- Bewegung & Kollision (Halle) ----------

const velocity = new THREE.Vector3();
function move(dt) {
  const speed = 4.4;
  const fwd = THREE.MathUtils.clamp((keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) + touchControls.move.z, -1, 1);
  const side = THREE.MathUtils.clamp((keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + touchControls.move.x, -1, 1);
  velocity.x = THREE.MathUtils.damp(velocity.x, side * speed, 12, dt);
  velocity.z = THREE.MathUtils.damp(velocity.z, fwd * speed, 12, dt);
  controls.moveRight(velocity.x * dt);
  controls.moveForward(velocity.z * dt);

  const p = camera.position;
  p.y = EYE_HEIGHT;

  // Bei offenem Reaktortor und Ausrichtung auf dessen x hebt sich die Nord-Begrenzung
  const inDoorway = state.doorOpen && Math.abs(p.x - REACTOR_X) < 1.0;

  if (inDoorway) {
    if (p.z < Z_BACK + 0.4) p.x = THREE.MathUtils.clamp(p.x, REACTOR_X - 1.0, REACTOR_X + 1.0);
    else p.x = THREE.MathUtils.clamp(p.x, -HALF_X + 0.3, HALF_X - 0.3);
    if (p.z > Z_FRONT - 0.4) p.z = Z_FRONT - 0.4;
  } else {
    p.x = THREE.MathUtils.clamp(p.x, -HALF_X + 0.3, HALF_X - 0.3);
    if (p.z > Z_FRONT - 0.4) p.z = Z_FRONT - 0.4;
    if (p.z < Z_BACK + 0.4) p.z = Z_BACK + 0.4;
  }

  // Möbel / Kessel
  for (const c of colliders) {
    const dx = p.x - c.x, dz = p.z - c.z;
    const d = Math.hypot(dx, dz);
    const min = c.r + 0.35;
    if (d < min && d > 0.0001) {
      p.x = c.x + (dx / d) * min;
      p.z = c.z + (dz / d) * min;
    }
  }

  // Flucht geschafft?
  if (state.doorOpen && !state.escaped && p.z < Z_BACK - 3.5) win();
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
    const flick = Math.sin(t * 11 + torch.seed) * 0.5 + Math.sin(t * 23 + torch.seed * 2) * 0.3;
    torch.light.intensity += (torch.base + flick * 5 - torch.light.intensity) * Math.min(1, dt * 6);
    torch.flame.scale.setScalar(1 + flick * 0.12);
  }

  // Reaktor pocht
  if (boiler.userData.glow) {
    const pulse = 0.7 + Math.sin(t * 2.2) * 0.3;
    boiler.userData.glow.scale.setScalar(pulse);
  }

  // Dampf steigt
  const pos = steam.geometry.attributes.position;
  for (let i = 0; i < steamCount; i++) {
    let y = pos.getY(i) + dt * 0.18;
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





