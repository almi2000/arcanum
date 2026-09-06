import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as Three from '../vendor/three/three.module.js';
import { softenGeometry } from '../soft-geometry.js';

// Real Three.js geometry and production puzzle code; replace only browser I/O.
function loadRoom(file) {
  const pending = new Map(); let nextTimer = 0; let destination = null, completed = false;
  const context2d = new Proxy({ measureText: text => ({ width: text.length * 20 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) }, { get: (target, key) => key in target ? target[key] : () => {} });
  const element = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, getContext: () => context2d });
  const elements = new Map();
  const context = vm.createContext({
    THREE: { ...Three, WebGLRenderer: class { shadowMap = {}; setSize() {} setPixelRatio() {} render() {} } },
    PointerLockControls: class { addEventListener() {} unlock() {} moveRight() {} moveForward() {} },
    document: { body: element(), createElement: element, getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); }, addEventListener() {} },
    window: { innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, addEventListener() {}, location: { search: '' } },
    performance, URLSearchParams, console,
    setTimeout(fn) { pending.set(++nextTimer, fn); return nextTimer; }, clearTimeout(id) { pending.delete(id); }, requestAnimationFrame() {},
    createMobileControls: () => ({ isTouchDevice: false, move: { x: 0, z: 0 }, isActive: () => false }),
    softenGeometry,
    createExperience: () => ({ tick() {}, begin() {}, record() {}, complete() { completed = true; }, elapsed: () => 120000, isPlaying: () => false }),
    fadeOutAndGo(url) { destination = url; }, saveElapsedMs() {}, clearElapsed() {}, storedElapsedMs: () => 0,
  });
  const atmosphere = readFileSync(new URL('../atmosphere.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export function', 'function');
  vm.runInContext(atmosphere, context, { filename: 'atmosphere.js' });
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  vm.runInContext(source, context, { filename: file, timeout: 15000 });
  vm.runInContext('Object.keys(sound).forEach(key => sound[key] = () => {});', context);
  const run = code => vm.runInContext(code, context, { timeout: 5000 });
  const use = label => run(`{const entry = interactables.find(e => e.label === ${JSON.stringify(label)}); if (!entry) throw Error('Missing interaction'); entry.onUse(entry);}`);
  const flush = () => { for (let i = 0; pending.size && i < 100; i++) { const [id, fn] = pending.entries().next().value; pending.delete(id); fn(); } };
  return { run, use, flush, result: () => ({ destination, completed }) };
}

test('study: all puzzles lead to an open door and chapter II', () => {
  const room = loadRoom('main.js');
  room.use('Tür'); assert.equal(room.run('state.doorOpen'), false);
  for (const label of ['Mondrune nehmen', 'Sternenrune nehmen', 'Im Kessel wühlen', 'Feuerrune nehmen']) room.use(label);
  room.run('pedestals.forEach(placeRune)');
  assert.equal(room.run('state.sealBroken'), true);
  room.use('Schatulle öffnen'); assert.equal(room.run('state.hasKey'), false);
  room.run("['gold','rot','blau','gruen'].forEach(lightCandle)");
  room.use('Schatulle öffnen'); room.use('Messingschlüssel nehmen'); room.use('Tür');
  assert.equal(room.run('state.doorOpen'), true);
  room.run('win()'); assert.deepEqual(room.result(), { destination: 'room2.html?autostart=1', completed: true });
});

test('observatory: both seals are required before the exit opens', () => {
  const room = loadRoom('room2.js');
  room.run('astroRings.forEach(ring => { for(let i=0;i<ring.target;i++) rotateRing(ring); })');
  assert.equal(room.run('state.astroSolved'), true);
  room.use('Tor'); assert.equal(room.run('state.doorOpen'), false);
  room.run('mirrors.forEach(mirror => { for(let i=0;i<mirror.target;i++) rotateMirror(mirror); })');
  room.use('Tor'); assert.equal(room.run('state.doorOpen'), true);
  room.run('win()'); assert.equal(room.result().destination, 'room3.html?autostart=1');
});

test('clockwork: melody, balance and clock jointly unlock chapter IV', () => {
  const room = loadRoom('room3.js');
  room.run('[2,0,3,1].forEach(index => strikeBell(bells[index]))');
  assert.equal(room.run('state.bellSolved'), true);
  room.use('Gewicht 4 auflegen'); room.use('Gewicht 9 auflegen');
  assert.equal(room.run('state.scaleSolved'), true);
  room.run("for(let i=0;i<12 && !state.clockSolved;i++) { if(clockHour !== CLOCK_TARGET_HOUR) advanceHand('hour'); if(clockMin !== CLOCK_TARGET_MIN) advanceHand('min'); }");
  room.flush(); assert.equal(room.run('state.doorOpen'), true);
  room.run('win()'); assert.equal(room.result().destination, 'room4.html?autostart=1');
});

test('corridor: code, UV clue and floor sequence unlock only the correct door', () => {
  const room = loadRoom('room4.js');
  room.run('[...stepTiles].sort((a,b)=>a.order-b.order).forEach(stepOnTile)');
  assert.equal(room.run('state.stepsSolved'), false);
  room.run('codeWheels.forEach((wheel,i) => { for(let n=0;n<CODE[i];n++) bumpWheel(wheel); })');
  assert.equal(room.run('state.codeSolved'), true);
  room.use('Schwarzlicht-Lampe');
  room.use('Schwarzlicht-Lampe');
  assert.equal(room.run('state.uvOn'), false);
  assert.equal(room.run('state.uvSeen'), true);
  room.run('[...stepTiles].sort((a,b)=>a.order-b.order).forEach(stepOnTile)');
  assert.equal(room.run('state.stepsSolved'), true);
  room.use('Notausgang'); assert.equal(room.run('state.doorOpen'), false);
  room.use('Lager'); assert.equal(room.run('state.doorOpen'), true);
  room.run('win()'); assert.equal(room.result().destination, 'room5.html?autostart=1');
});

test('steam hall: four safeguards power the final shadow puzzle and result', () => {
  const room = loadRoom('room5.js');
  room.use('Lampe ausrichten'); assert.equal(room.run('state.shadowSolved'), false);
  room.run('[3,7,1,9].forEach((digit,i)=>{for(let n=0;n<digit;n++)bumpPipe(pipeWheels[i]);})');
  room.run('magnetSlots.forEach((slot,i)=>{for(let n=0;n<6 && slot.value!==MAGNET_TARGET[i];n++)cycleMagnet(slot);})');
  room.use('Hebel grün ziehen'); room.flush();
  room.run('[3,9,3].forEach((digit,i)=>{for(let n=0;n<digit;n++)bumpNumber(numberWheels[i]);})');
  assert.equal(room.run('state.shadowReady'), true);
  room.run('for(let i=0;i<4 && !state.shadowSolved;i++)cycleShadow()');
  room.use('Reaktortor'); assert.equal(room.run('state.doorOpen'), true);
  room.run('win()'); assert.equal(room.result().completed, true);
});
