// Headless replays of the session rules on real charts, stepped at 60 fps like the game loop.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { buildNotes } from './chart.js';
import { advance, createSession, drainEvents, isAngry, press, release, scoreShift } from './session.js';

const root = new URL('../../', import.meta.url);
const { windows } = JSON.parse(readFileSync(new URL('data/difficulties.json', root), 'utf8'));
const DT = 1 / 60;

// The game always has at least one order (makeOrders adds a combo order); one that a first hit completes.
function session(chart, orders = [{ kind: 'combo', need: 1, have: 0, done: false }]) {
  return createSession(buildNotes(chart, { travel: 2, fruits: [{ color: '#fff' }] }), orders, windows);
}

/** Runs to the end of the chart; `input(s, t)` may press or release on each frame. */
function run(s, input = () => {}) {
  const end = s.notes.reduce((m, n) => Math.max(m, n.end), 0) + 1;
  const events = [];
  for (let t = 0; t <= end && !isAngry(s); t += DT) {
    input(s, t);
    advance(s, t, DT);
    events.push(...drainEvents(s));
  }
  return events;
}

/** The game's ?autoplay: press on the first frame at or after each note, hold presses to the end. */
function autoplay() {
  let i = 0;
  return (s, t) => {
    if (s.holding && !s.activeHold) release(s, t);
    while (i < s.notes.length && s.notes[i].state !== 'pending') i++;
    if (s.notes[i] && !s.activeHold && t >= s.notes[i].time) press(s, t, 2);
  };
}

const chartFiles = ['service', 'tracks']
  .map((dir) => new URL(`charts/${dir}/`, root))
  .filter((dir) => existsSync(dir))
  .flatMap((dir) => readdirSync(dir).map((f) => new URL(f, dir)));
const lychee = JSON.parse(readFileSync(new URL('charts/service/lychee-juice.json', root), 'utf8')).charts
  .service;

for (const file of chartFiles) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  for (const [diffId, chart] of Object.entries(data.charts)) {
    if (!chart.length) continue;
    test(`autoplay is flawless: ${file.pathname.split('/').pop()} [${diffId}]`, () => {
      const s = session(chart);
      run(s, autoplay());
      assert.equal(s.counts.Miss, 0);
      assert.equal(s.counts.Perfect, s.total);
      assert.equal(s.maxCombo, s.comboTarget, 'every note and every completed hold counts toward combo');
      assert.equal(scoreShift(s, { failed: false }).rank, 'S');
    });
  }
}

test('autoplay on Lychee Juice matches the live baseline: 41 Perfect, combo 52/52', () => {
  const s = session(lychee);
  run(s, autoplay());
  assert.deepEqual([s.counts.Perfect, s.maxCombo, s.comboTarget], [41, 52, 52]);
});

test('the same inputs replay to the same result', () => {
  const a = session(lychee),
    b = session(lychee);
  run(a, autoplay());
  run(b, autoplay());
  const pick = (s) =>
    JSON.stringify([s.heat, s.combo, s.maxCombo, s.acc, s.counts, s.productCounts, s.missReasons]);
  assert.equal(pick(a), pick(b));
});

test('with no input the customer gets angry and the run fails', () => {
  const s = session(lychee);
  const events = run(s);
  assert.ok(isAngry(s));
  assert.equal(s.counts.Miss, events.filter((e) => e.type === 'miss').length);
  assert.ok(s.counts.Miss >= 10 && s.counts.Miss < s.total, `failed after ${s.counts.Miss} misses`);
  assert.equal(scoreShift(s, { failed: true }).rank, 'F');
});

test('releasing a hold early is an Early Release miss', () => {
  const s = session([{ id: 1, kind: 'press', time: 1, end: 3, fruit: 0 }]);
  press(s, 1.0, 2);
  assert.equal(s.activeHold, s.notes[0]);
  release(s, 1.2);
  assert.equal(s.missReasons.EarlyRelease, 1);
  assert.equal(s.combo, 0);
  assert.equal(s.activeHold, null);
  // The head judgement is replaced, not kept beside the Miss.
  assert.deepEqual(s.counts, { Perfect: 0, Great: 0, Good: 0, Miss: 1 });
  assert.equal(s.acc, 0);
});

test('every note is judged exactly once, whatever the input', () => {
  // A deterministic masher: random press and release times, including early hold releases.
  let seed = 7;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const s = session(lychee);
  run(s, (s, t) => {
    if (rand() < 0.08) press(s, t, 2);
    else if (s.holding && rand() < 0.15) release(s, t);
  });
  const { Perfect, Great, Good, Miss } = s.counts;
  assert.ok(s.missReasons.EarlyRelease > 0, 'the masher released at least one hold early');
  assert.equal(Perfect + Great + Good + Miss, s.notes.filter((n) => n.state === 'done').length);
  assert.equal(Miss, s.missReasons.Miss + s.missReasons.EarlyRelease);
});

test('releasing within the soft window still completes the hold', () => {
  const s = session([{ id: 1, kind: 'press', time: 1, end: 2, fruit: 0 }]);
  press(s, 1.0, 2);
  release(s, 1.7); // 0.3 s left, soft window is max(0.19, min(0.55, 1 * 0.38)) = 0.38
  assert.equal(s.productCounts.juice, 1);
  assert.equal(s.combo, 2);
});

test('a press with no note in range is Empty and costs nothing', () => {
  const s = session([{ id: 1, kind: 'tap', time: 5, end: 5, fruit: 0 }]);
  press(s, 1, 2);
  assert.equal(s.lastJudge, 'Empty');
  assert.deepEqual(s.counts, { Perfect: 0, Great: 0, Good: 0, Miss: 0 });
  assert.deepEqual(
    drainEvents(s).map((e) => e.type),
    ['slash'],
  );
});

test('products fill orders; a completed order adds 35 heat and an event', () => {
  const chart = [1, 2].map((t, i) => ({ id: i, kind: 'tap', time: t, end: t, fruit: 0 }));
  const s = session(chart, [{ name: 'Cup', kind: 'chunks', need: 2, have: 0, done: false }]);
  press(s, 1, 2);
  const heatAfterOne = s.heat;
  press(s, 2, 2);
  const events = drainEvents(s).map((e) => e.type);
  assert.ok(s.orders[0].done);
  assert.ok(events.includes('orderComplete'));
  assert.ok(s.heat - heatAfterOne >= 35);
});

test('event order keeps the last effect on top: hold completion comes after its combo burst', () => {
  // 23 taps and a hold: the head makes combo 24, the completion 25, which bursts.
  const chart = Array.from({ length: 23 }, (_, i) => ({
    id: i,
    kind: 'tap',
    time: 1 + i * 0.5,
    end: 1 + i * 0.5,
    fruit: 0,
  }));
  chart.push({ id: 23, kind: 'press', time: 14, end: 15, fruit: 0 });
  const s = session(chart);
  const types = run(s, autoplay()).map((e) => e.type);
  assert.equal(s.lastComboBurst, 25);
  // The caller shows the last centre judgement, so completion must follow the burst.
  assert.ok(types.lastIndexOf('comboBurst') < types.lastIndexOf('holdComplete'));
});
