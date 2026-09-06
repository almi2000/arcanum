import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { chapters, createActiveClock, formatTime, readStore, writeStore, validCheckpoint } from '../campaign.js';

test('active time excludes pause, background time and duplicate resume events', () => {
  let now = 0;
  const clock = createActiveClock(60000, () => now);
  now = 5000; assert.equal(clock.elapsed(), 60000);
  clock.resume(); now = 8000; clock.resume(); now = 10000;
  assert.equal(clock.elapsed(), 65000);
  clock.pause(); clock.pause(); now = 999000;
  assert.equal(clock.elapsed(), 65000);
  clock.resume(); now += 5000; clock.pause();
  assert.equal(clock.elapsed(), 70000);
});

test('time remains correct over chapter boundaries', () => {
  let now = 100;
  const first = createActiveClock(0, () => now);
  first.resume(); now += 125500; first.pause();
  const next = createActiveClock(first.elapsed(), () => now);
  now += 30000; next.resume(); now += 2500;
  assert.equal(formatTime(next.elapsed()), '02:08');
  assert.equal(formatTime(3600000), '60:00');
});

test('invalid time and corrupt checkpoints cannot break the title screen', () => {
  for (const value of [-1, NaN, Infinity]) assert.equal(formatTime(createActiveClock(value).elapsed()), '00:00');
  for (const value of [null, {}, { chapter: 2.5, finished: false }, { chapter: 6, finished: false }, { chapter: '2', finished: false }]) assert.equal(validCheckpoint(value), null);
  assert.deepEqual(validCheckpoint({ chapter: 3, finished: false }), { chapter: 3, finished: false });
});

test('storage refusal and malformed JSON are recoverable', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } } });
    assert.equal(readStore('test', 17), 17);
    assert.equal(writeStore('test', {}), false);
    globalThis.localStorage.getItem = () => '{broken';
    assert.deepEqual(readStore('test', []), []);
  } finally { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage; }
});

test('all chapters have reachable files and their hints use actual state flags', () => {
  for (const [i, chapter] of chapters.entries()) {
    assert.match(readFileSync(new URL(`../${chapter.file}`, import.meta.url), 'utf8'), /boot\.js/);
    const source = readFileSync(new URL(`../${i === 0 ? 'main' : `room${i + 1}`}.js`, import.meta.url), 'utf8');
    for (const [key] of [...chapter.tasks, ...chapter.hints]) assert.match(source, new RegExp(`${key}: false`));
  }
});

// Exercise the actual production candle function, including its asynchronous reset.
function candlesFixture() {
  const source = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
  const snippet = source.slice(source.indexOf('let candleResetting = false;'), source.indexOf('\nfunction openDoor()', source.indexOf('let candleResetting')));
  const state = { candleProgress: 0, candlesSolved: false };
  const candles = Object.fromEntries(['gold', 'rot', 'blau', 'gruen'].map(key => [key, { lit: false, flame: { visible: false }, light: { intensity: 0 } }]));
  const pending = [];
  const context = vm.createContext({ state, candles, CANDLE_ORDER: ['gold', 'rot', 'blau', 'gruen'], sound: { flame() {}, success() {}, thud() {} }, toast() {}, updateObjective() {}, setTimeout(fn) { pending.push(fn); } });
  vm.runInContext(snippet, context);
  return { state, candles, pending, use: key => context.lightCandle(key) };
}

test('candle puzzle rejects rapid input during a failed sequence reset', () => {
  const { state, candles, pending, use } = candlesFixture();
  use('rot'); use('gold'); use('blau'); use('gruen');
  assert.equal(pending.length, 1);
  assert.equal(state.candlesSolved, false);
  pending.shift()();
  assert.equal(state.candleProgress, 0);
  assert.ok(Object.values(candles).every(c => !c.lit && c.light.intensity === 0));
  ['gold', 'rot', 'blau', 'gruen'].forEach(use);
  assert.equal(state.candlesSolved, true);
});

test('repeated clicks on a lit candle do not advance the sequence', () => {
  const { state, use } = candlesFixture();
  use('gold'); use('gold');
  assert.equal(state.candleProgress, 1);
  assert.equal(state.candlesSolved, false);
});
