// ============ Arcanum — Raum 3: Die Uhrwerkkammer des Erzmagiers ============
//
// Architektur-Hinweis (vgl. main.js / room2.js):
// Gleiches eigenständiges Modul-Prinzip wie die übrigen Räume — selber
// Renderer-/Toon-Aufbau, dieselbe register()-Interaktions-Registry, dieselbe
// Bewegungs-/Kollisionslogik und derselbe Tür-/Sieg-Ablauf. Neu sind nur die
// ORIGINELLE RAUMFORM (ein Sechseck statt des Rundsaals) und drei neue Rätsel.
// Für ein späteres Gesamtspiel lässt sich auch diese Datei zu einer init()-
// Funktion kapseln und vom selben Loader nacheinander aufrufen.
//
// Drei Rätsel öffnen das Tor (je ein Zahnrad-Schloss):
//   1) Das Glockenlied – höre die Melodie und wiederhole sie (Gedächtnis).
//   2) Die Waage       – wähle Gewichte, bis das Zielgewicht erreicht ist (Logik).
//   3) Die Astraluhr   – stelle Stunden- und Minutenzeiger auf die rechte Zeit.

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ---------- Grundgerüst ----------

const WALL_HEIGHT = 5.5;
const EYE_HEIGHT = 1.7;

// Sechseck: Umkreisradius (HEX_R) und Inkreis/Apothem (Wandabstand zur Mitte)
const HEX_R = 8.6;
const APOTHEM = HEX_R * Math.cos(Math.PI / 6);

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x140f08);
scene.fog = new THREE.FogExp2(0x140f08, 0.028);

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

// Text-Beschriftung als Canvas-Textur (Zahlen auf Gewichten, Ziffernblatt …)
function makeLabel(text, color = '#e9d8ab', size = 54) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
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
  return new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

// Zahnrad-Helfer (für Deko und die Tor-Schlösser)
function makeGear(radius, teeth, color, thickness = 0.12) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, Math.max(16, teeth * 2)), toon(color));
  body.rotation.x = Math.PI / 2;
  g.add(body);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const t = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.3, thickness, radius * 0.26), toon(color));
    t.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    t.rotation.z = a;
    g.add(t);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.32, radius * 0.32, thickness * 1.4, 12), toon(0x2a2118));
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.12, radius * 1.3, thickness * 0.6), toon(0x3a2c18));
    spoke.rotation.z = (i / 4) * Math.PI;
    g.add(spoke);
  }
  return g;
}

// ---------- Licht ----------

scene.add(new THREE.HemisphereLight(0x5a4a30, 0x1a1408, 0.6));

const torchLights = [];
function makeTorch(angle) {
  const grp = new THREE.Group();
  const r = APOTHEM - 0.35;
  grp.position.set(Math.sin(angle) * r, 2.6, Math.cos(angle) * r);
  grp.lookAt(0, 2.6, 0);

  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.7, 6), toon(0x4a3220));
  stick.rotation.x = Math.PI / 4;
  grp.add(stick);

  const bracket = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 10), toon(0x6b5320));
  bracket.position.set(0, 0.05, 0.12);
  grp.add(bracket);

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 7), new THREE.MeshBasicMaterial({ color: 0xffb347 }));
  flame.position.set(0, 0.5, 0.25);
  grp.add(flame);

  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff0b0 }));
  glow.position.copy(flame.position).y -= 0.12;
  grp.add(glow);

  const light = new THREE.PointLight(0xffa83a, 24, 16, 2);
  light.position.copy(flame.position);
  grp.add(light);

  torchLights.push({ light, flame, seed: Math.random() * 100 });
  scene.add(grp);
}
[Math.PI * 0.33, Math.PI * 0.67, Math.PI * 1.33, Math.PI * 1.67].forEach(makeTorch);

// ---------- Die sechseckige Kammer ----------

// Ecken (x,z) auf dem Umkreis; eine Kante (corner5–corner0) zeigt nach -Z = Tür.
const corners = [];
for (let j = 0; j < 6; j++) {
  const a = Math.PI + Math.PI / 6 + j * (Math.PI / 3);
  corners.push(new THREE.Vector2(Math.sin(a) * HEX_R, Math.cos(a) * HEX_R));
}
const DOOR_EDGE = 5; // Kante zwischen corners[5] und corners[0]

// Kanten-Daten (Normale + Mittelpunkt) für Wände und Kollision
const hexEdges = [];
for (let k = 0; k < 6; k++) {
  const A = corners[k];
  const B = corners[(k + 1) % 6];
  const mid = new THREE.Vector2((A.x + B.x) / 2, (A.y + B.y) / 2);
  const n = mid.clone().normalize();
  const len = A.distanceTo(B);
  hexEdges.push({ A, B, mid, nx: n.x, nz: n.y, len, door: k === DOOR_EDGE });
}

// Wandpaneele (alle Kanten außer der Tür-Kante)
for (const e of hexEdges) {
  if (e.door) continue;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(e.len + 0.2, WALL_HEIGHT, 0.4), toon(0x5a4a32));
  wall.position.set(e.mid.x, WALL_HEIGHT / 2, e.mid.y);
  wall.lookAt(0, WALL_HEIGHT / 2, 0);
  scene.add(wall);

  // Messing-Sockelleiste
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(e.len + 0.2, 0.5, 0.45), toon(0x6b5320));
  skirt.position.set(e.mid.x, 0.25, e.mid.y);
  skirt.lookAt(0, 0.25, 0);
  scene.add(skirt);

  // dekoratives, drehendes Zahnrad an jeder vollen Wand
  const deco = makeGear(0.8 + Math.random() * 0.3, 12, 0x7a5e2a, 0.16);
  deco.position.set(e.mid.x * 0.93, 3.4, e.mid.y * 0.93);
  deco.lookAt(0, 3.4, 0);
  deco.userData.gearSpeed = (Math.random() < 0.5 ? 1 : -1) * (0.25 + Math.random() * 0.3);
  scene.add(deco);
}

// Sechseckiger Boden + Decke aus der gleichen Eckenliste (perfekt passend)
const hexShape = new THREE.Shape();
corners.forEach((c, i) => { const px = c.x, py = -c.y; if (i === 0) hexShape.moveTo(px, py); else hexShape.lineTo(px, py); });
hexShape.closePath();
const hexGeo = new THREE.ShapeGeometry(hexShape);

const floor = new THREE.Mesh(hexGeo, toon(0x3a2c18, { side: THREE.DoubleSide }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

const ceiling = new THREE.Mesh(hexGeo, toon(0x241a10, { side: THREE.DoubleSide }));
ceiling.rotation.x = -Math.PI / 2;
ceiling.position.y = WALL_HEIGHT;
scene.add(ceiling);

// Messing-Intarsie im Boden
const inlay = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.85, 6), toon(0xc9a227));
inlay.rotation.x = -Math.PI / 2;
inlay.rotation.z = Math.PI / 6;
inlay.position.y = 0.02;
scene.add(inlay);

// Großes, langsam drehendes Zahnrad an der Decke
const bigGear = makeGear(2.2, 18, 0x6b5320, 0.25);
bigGear.position.set(0, WALL_HEIGHT - 0.3, 0);
bigGear.rotation.x = Math.PI / 2;
scene.add(bigGear);
const ceilGlow = new THREE.PointLight(0xffcaa0, 8, 12, 2);
ceilGlow.position.set(0, WALL_HEIGHT - 1.0, 0);
scene.add(ceilGlow);

// Schwebender Pendel-Kristall
const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.34), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
crystal.position.set(0, 3.4, 0);
scene.add(crystal);

// Staub
const dustCount = 200;
const dustPos = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) {
  const a = Math.random() * Math.PI * 2;
  const rr = Math.random() * (APOTHEM - 1);
  dustPos[i * 3] = Math.sin(a) * rr;
  dustPos[i * 3 + 1] = Math.random() * WALL_HEIGHT;
  dustPos[i * 3 + 2] = Math.cos(a) * rr;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffca7a, size: 0.03, transparent: true, opacity: 0.5, sizeAttenuation: true }));
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
  bellSolved: false,
  scaleSolved: false,
  clockSolved: false,
  sealBroken: false,
  doorOpen: false,
  escaped: false,
  startTime: null,
};

const animations = []; // { t, dur, fn(k), done?, onDone? }

// =====================================================================
//  RÄTSEL 1 — DAS GLOCKENLIED  (Gedächtnis / Simon)
//  Fünf Glocken; ein Hebel spielt eine Melodie vor. Wiederhole sie,
//  indem du die Glocken in der gehörten Reihenfolge anschlägst.
// =====================================================================

const BELL_FREQS = [392.0, 440.0, 493.9, 587.3, 659.3]; // G A H D E
const BELL_SEQUENCE = [2, 0, 3, 1]; // die zu wiederholende Melodie
const bells = [];
let bellPlaying = false;
let bellStep = 0;

{
  const rack = new THREE.Group();
  rack.position.set(5.0, 0, 1.6);
  rack.lookAt(0, 0, 0);

  // Gestell
  for (const dx of [-1.5, 1.5]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 8), toon(0x4a3220));
    leg.position.set(dx, 1.2, 0);
    rack.add(leg);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 8), toon(0x6b5320));
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 2.3;
  rack.add(bar);

  const bellColors = [0xb5852a, 0xc9a227, 0xd8b94a, 0xe0c25a, 0xf0d870];
  for (let i = 0; i < 5; i++) {
    const x = -1.4 + i * 0.7;
    const g = new THREE.Group();
    g.position.set(x, 1.75, 0);

    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.42, 14, 1, true), toon(bellColors[i], { side: THREE.DoubleSide }));
    cup.position.y = -0.2;
    g.add(cup);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), toon(0x6b5320));
    crown.position.y = 0.04;
    g.add(crown);
    const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), toon(0x3a2c18));
    clapper.position.y = -0.42;
    g.add(clapper);

    const light = new THREE.PointLight(0xfff0b0, 0, 3, 2);
    light.position.y = -0.2;
    g.add(light);

    rack.add(g);
    const data = { group: g, cup, light, index: i, freq: BELL_FREQS[i] };
    bells.push(data);
    register(cup, 'Glocke anschlagen', () => strikeBell(data));
  }

  // Hebel zum Vorspielen der Melodie
  const lever = new THREE.Group();
  lever.position.set(1.9, 0.9, 0);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), toon(0x3a2c18));
  lever.add(base);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), toon(0xc9a227));
  handle.position.y = 0.35;
  handle.rotation.z = 0.4;
  lever.add(handle);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff8c3a }));
  knob.position.set(0.24, 0.62, 0);
  lever.add(knob);
  rack.add(lever);
  register(lever, 'Melodie anhören', () => playBellSequence());

  scene.add(rack);
  block(5.0, 1.6, 1.7);
}

function flashBell(data, dur = 0.45) {
  data.light.intensity = 6;
  const from = data.group.position.y;
  animations.push({
    t: 0, dur, fn: (k) => {
      data.light.intensity = 6 * (1 - k);
      data.group.position.y = from + Math.sin(k * Math.PI) * 0.06;
    },
    onDone: () => { data.group.position.y = from; },
  });
}

function playBellSequence() {
  if (state.bellSolved || bellPlaying) return;
  bellPlaying = true;
  bellStep = 0;
  toast('Lausche …');
  BELL_SEQUENCE.forEach((idx, i) => {
    setTimeout(() => {
      const b = bells[idx];
      sound.note(b.freq);
      flashBell(b);
      if (i === BELL_SEQUENCE.length - 1) setTimeout(() => { bellPlaying = false; }, 520);
    }, 650 * i + 300);
  });
}

function strikeBell(data) {
  if (state.bellSolved || bellPlaying) return;
  sound.note(data.freq);
  flashBell(data);

  if (data.index === BELL_SEQUENCE[bellStep]) {
    bellStep++;
    if (bellStep === BELL_SEQUENCE.length) {
      state.bellSolved = true;
      bells.forEach((b) => { b.light.color.setHex(0x52d273); flashBell(b); });
      toast('Die Glocken klingen rein im Einklang — das erste Zahnrad rastet ein.');
      sound.success();
      fillLock('bell');
    }
  } else {
    bellStep = 0;
    toast('Ein schiefer Ton hallt nach.');
    sound.thud();
  }
}

// --- Tafel mit dem Hinweis zum Glockenlied ---
{
  const sign = new THREE.Group();
  sign.position.set(6.6, 1.6, 3.6);
  sign.lookAt(0, 1.6, 0);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), toon(0xe9d8ab));
  sign.add(panel);
  scene.add(sign);
  register(panel, 'Tafel lesen', () => {
    openReading('Vom Lied der fünf Glocken', `
      <p>»Die Kammer kennt ein altes Lied — wer am Hebel zieht, bekommt es vorgesungen.</p>
      <p><i>Nur wer es fehlerfrei zurückgibt, weckt das Räderwerk.«</i></p>
    `);
  });
}

// =====================================================================
//  RÄTSEL 2 — DIE WAAGE  (Logik / Zielgewicht)
//  Vier Gewichtskugeln mit Werten; lege Kugeln auf die Waagschale, bis
//  ihr Gesamtgewicht dem Gegengewicht (13) genau entspricht.
// =====================================================================

const WEIGHT_VALUES = [2, 4, 7, 9]; // Lösungen: 4+9 oder 2+4+7
const SCALE_TARGET = 13;
const weights = [];
let scaleBeam, scaleRightPan, scaleLeftPan;

{
  const scaleGrp = new THREE.Group();
  scaleGrp.position.set(-5.0, 0, 1.8);
  scaleGrp.lookAt(0, 0, 0);

  // Standfuß + Säule
  const footBase = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.3, 16), toon(0x3a2c18));
  footBase.position.y = 0.15;
  scaleGrp.add(footBase);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 12), toon(0x6b5320));
  pillar.position.y = 1.4;
  scaleGrp.add(pillar);

  // Balken (dreht um die Säulenspitze)
  scaleBeam = new THREE.Group();
  scaleBeam.position.y = 2.55;
  const beamBar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.12), toon(0xc9a227));
  scaleBeam.add(beamBar);

  // linke Schale = festes Gegengewicht (Ziel)
  scaleLeftPan = new THREE.Group();
  scaleLeftPan.position.set(-1.2, -0.5, 0);
  const lChain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4), toon(0x6b5320));
  lChain.position.y = 0.25;
  scaleLeftPan.add(lChain);
  const lDish = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.12, 16), toon(0x7a5e2a));
  scaleLeftPan.add(lDish);
  const counter = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.3, 12), toon(0x8a6a2e));
  counter.position.y = 0.18;
  scaleLeftPan.add(counter);
  const targetLabel = makeLabel(String(SCALE_TARGET), '#2a1d12', 70);
  targetLabel.position.set(0, 0.34, 0.001);
  targetLabel.rotation.x = -0.3;
  scaleLeftPan.add(targetLabel);
  scaleBeam.add(scaleLeftPan);

  // rechte Schale = Spielerschale
  scaleRightPan = new THREE.Group();
  scaleRightPan.position.set(1.2, -0.5, 0);
  const rChain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4), toon(0x6b5320));
  rChain.position.y = 0.25;
  scaleRightPan.add(rChain);
  const rDish = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.12, 16), toon(0x7a5e2a));
  scaleRightPan.add(rDish);
  scaleBeam.add(scaleRightPan);

  scaleGrp.add(scaleBeam);
  scene.add(scaleGrp);
  block(-5.0, 1.8, 1.4);

  // Gewichtskugeln auf einem kleinen Tisch davor
  const table = new THREE.Group();
  table.position.set(-3.4, 0, 3.6);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.9), toon(0x5a3a22));
  top.position.y = 0.85;
  table.add(top);
  for (const [dx, dz] of [[-0.85, -0.3], [0.85, -0.3], [-0.85, 0.3], [0.85, 0.3]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), toon(0x4a2e1a));
    leg.position.set(dx, 0.42, dz);
    table.add(leg);
  }
  scene.add(table);
  block(-3.4, 3.6, 1.1);

  const orbColors = [0x6f9cff, 0x8a6bff, 0xc9a227, 0x52d273];
  WEIGHT_VALUES.forEach((val, i) => {
    const x = -0.75 + i * 0.5;
    const orb = new THREE.Group();
    orb.position.set(x, 1.02, 0);
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14 + val * 0.012), toon(orbColors[i]));
    orb.add(ball);
    const label = makeLabel(String(val), '#fff8dc', 66);
    label.position.set(0, 0.02, 0.2);
    orb.add(label);
    table.add(orb);

    const data = { orb, ball, value: val, on: false, homeY: 1.02 };
    weights.push(data);
    register(ball, `Gewicht ${val} auflegen`, () => toggleWeight(data));
  });

  updateScale();
}

function currentScaleSum() {
  return weights.reduce((s, w) => s + (w.on ? w.value : 0), 0);
}

function updateScale() {
  const sum = currentScaleSum();
  // rechts schwerer -> rechte Seite sinkt (Balken dreht negativ um Z)
  const diff = THREE.MathUtils.clamp((sum - SCALE_TARGET) * 0.05, -0.32, 0.32);
  animations.push({
    t: 0, dur: 0.35, fn: (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      const cur = scaleBeam.rotation.z;
      scaleBeam.rotation.z = cur + (-diff - cur) * e;
      scaleLeftPan.rotation.z = -scaleBeam.rotation.z;
      scaleRightPan.rotation.z = -scaleBeam.rotation.z;
    },
  });
}

function toggleWeight(data) {
  if (state.scaleSolved) return;
  data.on = !data.on;
  data.ball.material.emissive = new THREE.Color(data.on ? 0x554400 : 0x000000);
  const targetY = data.on ? 1.22 : data.homeY;
  const fromY = data.orb.position.y;
  animations.push({ t: 0, dur: 0.25, fn: (k) => { data.orb.position.y = fromY + (targetY - fromY) * k; } });
  sound.place();

  updateScale();
  if (currentScaleSum() === SCALE_TARGET) {
    state.scaleSolved = true;
    toast('Der Balken steht vollkommen waagerecht — das zweite Zahnrad rastet ein.');
    sound.success();
    fillLock('scale');
  }
}

// --- Tafel mit dem Hinweis zur Waage ---
{
  const sign = new THREE.Group();
  sign.position.set(-6.6, 1.6, 3.6);
  sign.lookAt(0, 1.6, 0);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), toon(0xe9d8ab));
  sign.add(panel);
  scene.add(sign);
  register(panel, 'Tafel lesen', () => {
    openReading('Von der Waage des Erzmagiers', `
      <p>»Das Gegengewicht wiegt <b>${SCALE_TARGET}</b> — kein Gran mehr, kein Gran weniger.</p>
      <p><i>Erst wenn beide Schalen in vollkommenem Gleichgewicht ruhen, gibt das Werk nach.«</i></p>
    `);
  });
}

// =====================================================================
//  RÄTSEL 3 — DIE ASTRALUHR  (stelle die Zeit)
//  Eine große Uhr mit Stunden- und Minutenzeiger. Stelle sie auf die
//  Zeit aus dem Rätsel: die dritte Stunde, zur Hälfte (3:30).
// =====================================================================

const CLOCK_TARGET_HOUR = 3; // Stundenzeiger auf 3
const CLOCK_TARGET_MIN = 6;  // Minutenzeiger-Position (6 von 12 = :30)
let clockHourHand, clockMinHand;
let clockHour = 0, clockMin = 0;

{
  const clock = new THREE.Group();
  clock.position.set(0, 0, -APOTHEM + 0.6);
  // Tür ist ebenfalls bei -Z; die Uhr etwas seitlich versetzen, damit sie nicht den Gang blockiert
  clock.position.x = -4.2;
  clock.position.z = -3.2;
  clock.lookAt(0, 0, 0); // gleiche Höhe wie der Gruppenursprung -> reine Drehung um Y (kein Kippen)

  // Standfuß
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.2, 12), toon(0x4a3220));
  stand.position.y = 0.6;
  // (stand steht nicht gedreht – als eigenes Mesh in Weltkoordinaten an der Uhr-Basis)
  clock.add(stand);

  // Ziffernblatt (Scheibe), Front zeigt zur Raummitte (+Z nach lookAt)
  const faceGrp = new THREE.Group();
  faceGrp.position.y = 2.7;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.16, 40), toon(0x6b5320));
  disc.rotation.x = Math.PI / 2;
  faceGrp.add(disc);
  const facePlate = new THREE.Mesh(new THREE.CircleGeometry(1.12, 40), toon(0xe9d8ab));
  facePlate.position.z = 0.09;
  faceGrp.add(facePlate);

  // Stundenmarken + die vier Hauptziffern
  for (let i = 0; i < 12; i++) {
    const a = i * (Math.PI / 6);
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.02), toon(0x3a2c18));
    tick.position.set(Math.sin(a) * 0.98, Math.cos(a) * 0.98, 0.1);
    tick.rotation.z = -a;
    faceGrp.add(tick);
  }
  const numerals = { 12: 0, 3: Math.PI / 2, 6: Math.PI, 9: Math.PI * 1.5 };
  for (const [num, a] of Object.entries(numerals)) {
    const lbl = makeLabel(num, '#3a2c18', 60);
    lbl.position.set(Math.sin(a) * 0.82, Math.cos(a) * 0.82, 0.11);
    faceGrp.add(lbl);
  }

  // Stundenzeiger (kurz, dick)
  clockHourHand = new THREE.Group();
  clockHourHand.position.z = 0.12;
  const hourBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.04), toon(0x2a2118));
  hourBar.position.y = 0.3;
  clockHourHand.add(hourBar);
  faceGrp.add(clockHourHand);

  // Minutenzeiger (lang, schlank)
  clockMinHand = new THREE.Group();
  clockMinHand.position.z = 0.15;
  const minBar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.92, 0.04), toon(0x6b1f2a));
  minBar.position.y = 0.46;
  clockMinHand.add(minBar);
  faceGrp.add(clockMinHand);

  const centerPin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12), toon(0xc9a227));
  centerPin.rotation.x = Math.PI / 2;
  centerPin.position.z = 0.18;
  faceGrp.add(centerPin);

  clock.add(faceGrp);
  scene.add(clock);
  block(clock.position.x, clock.position.z, 0.9);

  // große, unsichtbare Klickflächen für die beiden Zeiger
  const hourHit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
  hourHit.position.set(0, 0.3, 0.25);
  clockHourHand.add(hourHit);
  register(hourHit, 'Stundenzeiger stellen', () => advanceHand('hour'));

  const minHit = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
  minHit.position.set(0, 0.5, 0.25);
  clockMinHand.add(minHit);
  register(minHit, 'Minutenzeiger stellen', () => advanceHand('min'));

  applyClockRotation('hour', false);
  applyClockRotation('min', false);
}

function applyClockRotation(which, animate = true) {
  const hand = which === 'hour' ? clockHourHand : clockMinHand;
  const idx = which === 'hour' ? clockHour : clockMin;
  const to = -idx * (Math.PI / 6);
  if (!animate) { hand.rotation.z = to; return; }
  const from = hand.rotation.z;
  animations.push({ t: 0, dur: 0.25, fn: (k) => { hand.rotation.z = from + (to - from) * (1 - Math.pow(1 - k, 3)); } });
}

function advanceHand(which) {
  if (state.clockSolved) return;
  if (which === 'hour') clockHour = (clockHour + 1) % 12;
  else clockMin = (clockMin + 1) % 12;
  applyClockRotation(which);
  sound.tick();

  if (clockHour === CLOCK_TARGET_HOUR && clockMin === CLOCK_TARGET_MIN) {
    state.clockSolved = true;
    toast('Ein tiefer Gong — die rechte Stunde ist gestellt. Das dritte Zahnrad rastet ein.');
    sound.success();
    fillLock('clock');
  }
}

// --- Tafel mit dem Hinweis zur Uhr ---
{
  const sign = new THREE.Group();
  sign.position.set(-6.4, 1.6, -1.4);
  sign.lookAt(0, 1.6, 0);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), toon(0xe9d8ab));
  sign.add(panel);
  scene.add(sign);
  register(panel, 'Tafel lesen', () => {
    openReading('Die Stunde des Aufbruchs', `
      <p>»Der Turm gibt nur frei, wenn die große Uhr jene Stunde zeigt,
      da der Erzmagier einst seinen Pakt schloss:</p>
      <p><i>Zur <b>dritten Stunde</b> nach Mitternacht,<br>
      wenn der lange Zeiger zur <b>Hälfte</b> gewandert ist.«</i></p>
    `);
  });
}

// =====================================================================
//  DAS TOR MIT DEN DREI ZAHNRAD-SCHLÖSSERN
// =====================================================================

let doorPivot;
const gearLocks = {}; // bell / scale / clock -> { gear, light, lit }

function makeGearLock(key, color, x) {
  const g = makeGear(0.42, 12, 0x4a3a1e, 0.16);
  g.position.set(x, 1.9, 0.28);
  // dunkles, erloschenes Zahnrad bis zur Lösung
  g.traverse((c) => { if (c.material) c.material = c.material.clone(); });
  const light = new THREE.PointLight(color, 0, 4, 2);
  light.position.set(x, 1.9, 0.7);
  gearLocks[key] = { gear: g, light, color, lit: false, parentX: x };
  return { gear: g, light };
}

function fillLock(key) {
  const lock = gearLocks[key];
  if (lock.lit) return;
  lock.lit = true;
  document.getElementById(`lock-${key}`).classList.add('filled');
  lock.gear.traverse((c) => { if (c.material && c.material.color) c.material.color.setHex(lock.color); });
  lock.gear.userData.gearSpeed = 0.9;
  animations.push({ t: 0, dur: 0.6, fn: (k) => { lock.light.intensity = 7 * k; } });
  updateProgress();
  checkAllLocks();
}

function checkAllLocks() {
  if (state.bellSolved && state.scaleSolved && state.clockSolved && !state.sealBroken) {
    state.sealBroken = true;
    toast('Die drei Zahnräder greifen ineinander — das Schloss des Tors mahlt sich auf!');
    sound.success();
    for (const key of Object.keys(gearLocks)) gearLocks[key].gear.userData.gearSpeed = 2.2;
    updateProgress();
  }
}

{
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, 0, -APOTHEM + 0.1);

  for (const dx of [-1.25, 1.25]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.8, 0.7), toon(0x4a3a1e));
    post.position.set(dx, 1.9, 0);
    doorGroup.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.5, 0.7), toon(0x4a3a1e));
  lintel.position.y = 3.85;
  doorGroup.add(lintel);
  const filler = new THREE.Mesh(new THREE.BoxGeometry(2.95, WALL_HEIGHT - 4.1, 0.4), toon(0x5a4a32));
  filler.position.y = 4.1 + (WALL_HEIGHT - 4.1) / 2;
  doorGroup.add(filler);

  doorPivot = new THREE.Group();
  doorPivot.position.set(-1.0, 0, 0);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.6, 0.18), toon(0x3a2c18));
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

  // Drei Zahnrad-Schlösser nebeneinander
  const bellLock = makeGearLock('bell', 0xf0c84a, -0.7);
  const scaleLock = makeGearLock('scale', 0x52d273, 0.0);
  const clockLock = makeGearLock('clock', 0x6f9cff, 0.7);
  doorGroup.add(bellLock.gear, bellLock.light);
  doorGroup.add(scaleLock.gear, scaleLock.light);
  doorGroup.add(clockLock.gear, clockLock.light);

  scene.add(doorGroup);

  // Flur dahinter
  const hallway = new THREE.Group();
  hallway.position.set(0, 0, -APOTHEM);
  const hwFloor = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 5), toon(0x3a2c18));
  hwFloor.position.set(0, -0.05, -2.5);
  hallway.add(hwFloor);
  for (const dx of [-1.3, 1.3]) {
    const hwWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 5), toon(0x22242e));
    hwWall.position.set(dx, 2, -2.5);
    hallway.add(hwWall);
  }
  const hwCeil = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 5), toon(0x1a140c));
  hwCeil.position.set(0, 4, -2.5);
  hallway.add(hwCeil);
  const exitGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4), new THREE.MeshBasicMaterial({ color: 0xfff2cc }));
  exitGlow.position.set(0, 2, -4.9);
  hallway.add(exitGlow);
  const exitLight = new THREE.PointLight(0xfff2cc, 14, 12, 2);
  exitLight.position.set(0, 2, -4);
  hallway.add(exitLight);
  scene.add(hallway);

  register(doorPivot, 'Tor', () => {
    if (state.doorOpen) return;
    if (!state.sealBroken) {
      toast('Drei Zahnräder verriegeln das Tor — noch schweigen sie.');
      sound.thud();
    } else {
      openDoor();
    }
  });
}

function openDoor() {
  state.doorOpen = true;
  toast('Das Tor mahlt sich knarrend auf. Der nächste Teil des Turms liegt frei.');
  sound.door();
  animations.push({
    t: 0, dur: 2.2, fn: (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      doorPivot.rotation.y = -e * 1.9;
    },
  });
  updateProgress();
}

// ---------- Aufgaben-Text ----------

function objText(s) { document.getElementById('objective-text').textContent = s; }

function updateProgress() {
  if (state.doorOpen) { objText('Hinaus durch den Gang!'); return; }
  if (state.sealBroken) { objText('Das Räderwerk steht still — das Tor regt sich.'); return; }
  objText('Drei stumme Zahnräder verriegeln das Tor. Bring sie zum Drehen.');
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
    note(freq) { tone(freq, 0.6, 'sine', 0.14); tone(freq * 2, 0.4, 'sine', 0.05, 0.01); },
    place() { tone(440, 0.18, 'triangle', 0.08); },
    tick() { tone(900, 0.05, 'square', 0.05); tone(1400, 0.04, 'square', 0.03, 0.01); },
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

// ---------- Bewegung & Kollision (Sechseck) ----------

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

  const inDoorway = state.doorOpen && Math.abs(p.x) < 1.0 && p.z < -(APOTHEM - 0.4);

  // Sechseck-Begrenzung: jede Kante als Halbebene
  const lim = APOTHEM - 0.55;
  for (const e of hexEdges) {
    if (e.door && inDoorway) continue;
    const d = p.x * e.nx + p.z * e.nz;
    if (d > lim) {
      p.x -= e.nx * (d - lim);
      p.z -= e.nz * (d - lim);
    }
  }
  if (inDoorway) p.x = THREE.MathUtils.clamp(p.x, -0.9, 0.9);

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

  if (state.doorOpen && !state.escaped && p.z < -APOTHEM - 2.5) {
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
    torch.light.intensity = 24 + n * 7;
    torch.flame.scale.setScalar(1 + n * 0.12);
  }

  // großes Deckenzahnrad + Kristall
  bigGear.rotation.z = t * 0.15;
  crystal.rotation.y = t * 0.6;
  crystal.position.y = 3.4 + Math.sin(t * 0.8) * 0.12;

  // alle Zahnräder mit gearSpeed drehen (Deko + gelöste Schlösser)
  scene.traverse((o) => {
    if (o.userData.gearSpeed) o.rotation.z += dt * o.userData.gearSpeed;
  });

  // Staub treibt
  const pos = dust.geometry.attributes.position;
  for (let i = 0; i < dustCount; i++) {
    let y = pos.getY(i) + dt * 0.06;
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
