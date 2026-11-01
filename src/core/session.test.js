// Headless replays of the session rules on real charts, stepped at 60 fps like the game loop.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { buildNotes } from './chart.js';
import {
  advance,
  chop,
  CHOP_GRACE,
  createSession,
  drainEvents,
  isAngry,
  press,
  release,
  scoreShift,
  styleShare,
  swipe,
} from './session.js';

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

// ---- Ways of playing beyond tap and hold (docs/input_modes.md) ----

const ALL_INPUTS = ['swipe', 'chop', 'flow'];
const withInputs = (chart, inputs = ALL_INPUTS) =>
  createSession(
    buildNotes(chart, { travel: 2, fruits: [{ color: '#fff' }] }),
    [{ kind: 'combo', need: 1, have: 0, done: false }],
    windows,
    inputs,
  );
const taps = (...times) => times.map((t, i) => ({ id: i, kind: 'tap', time: t, end: t, fruit: 0 }));
const hold = (time, end, id = 0) => ({ id, kind: 'press', time, end, fruit: 0 });
const types = (s) => drainEvents(s).map((e) => e.type);
const total = (c) => c.Perfect + c.Great + c.Good + c.Miss;

test('unlocked inputs do not change a standard autoplay run', () => {
  const plain = session(lychee),
    open = withInputs(lychee);
  run(plain, autoplay());
  run(open, autoplay());
  assert.deepEqual(open.counts, plain.counts);
  assert.equal(open.maxCombo, plain.maxCombo);
  assert.equal(open.styles.flow + open.styles.swipe + open.styles.chop, 0);
});

test('a swipe right after a tap turns that tap into a swipe, with the same judgement', () => {
  const s = withInputs(taps(1));
  press(s, 1, 2);
  swipe(s, 1.05, Math.PI / 4);
  assert.deepEqual([s.styles.tap, s.styles.swipe, s.counts.Perfect], [0, 1, 1]);
  assert.ok(types(s).includes('swipe'));
});

test('before swipe is unlocked, a swipe is just a tap', () => {
  const s = withInputs(taps(1), []);
  press(s, 1, 2);
  swipe(s, 1.05, 0);
  assert.deepEqual([s.styles.tap, s.styles.swipe], [1, 0]);
  assert.ok(!types(s).includes('swipe'));
});

test('a hold can be chopped: let go, then cut it enough times before the end', () => {
  const s = withInputs([hold(1, 3)]); // 2 s long: needs 4 cuts
  press(s, 1, 2);
  release(s, 1.2);
  assert.equal(s.activeHold.state, 'chopping', 'letting go is not a miss when chop is unlocked');
  for (const t of [1.4, 1.8, 2.2, 2.6]) press(s, t, 2);
  advance(s, 3, DT);
  assert.equal(s.styles.chop, 1);
  assert.equal(s.productCounts.chunks, 4, 'each cut is a portion of chunks');
  assert.equal(s.productCounts.juice, 0);
  assert.deepEqual(s.counts, { Perfect: 1, Great: 0, Good: 0, Miss: 0 });
  assert.equal(s.combo, 2, 'the head and the finished cut both count toward combo');
});

test('a zigzag while still pressed also cuts the hold', () => {
  const s = withInputs([hold(1, 2)]); // 1 s long: needs 2 cuts
  press(s, 1, 2);
  chop(s, 1.3);
  chop(s, 1.6);
  release(s, 1.7);
  advance(s, 2, DT);
  assert.equal(s.styles.chop, 1);
  assert.equal(s.counts.Miss, 0);
});

test('letting go of a hold and never cutting is still an early release after the grace time', () => {
  const s = withInputs([hold(1, 3)]);
  press(s, 1, 2);
  release(s, 1.2);
  advance(s, 1.2 + CHOP_GRACE - 0.01, DT);
  assert.equal(s.counts.Miss, 0);
  advance(s, 1.2 + CHOP_GRACE + 0.01, DT);
  assert.deepEqual(s.counts, { Perfect: 0, Great: 0, Good: 0, Miss: 1 });
  assert.equal(s.missReasons.EarlyRelease, 1);
});

test('too few cuts by the end is a miss, and the head judgement is withdrawn', () => {
  const s = withInputs([hold(1, 3)]);
  press(s, 1, 2);
  release(s, 1.2);
  press(s, 1.5, 2);
  advance(s, 3, DT);
  assert.equal(s.counts.Miss, 0, 'cuts still count just after the end');
  advance(s, 3.3, DT); // past the end (3.02 once built) plus the Good window
  assert.equal(s.missReasons.TooFewCuts, 1);
  assert.deepEqual(s.counts, { Perfect: 0, Great: 0, Good: 0, Miss: 1 });
  assert.equal(s.acc, 0);
});

test('keeping the finger down lets notes flow in: taps are taken as Good, holds are held', () => {
  const chart = [...taps(1, 1.5, 2), hold(2.5, 3.5, 3), ...taps(4, 4.5).map((n, i) => ({ ...n, id: 4 + i }))];
  const s = withInputs(chart);
  press(s, 0.2, 2); // no note there: just a finger on the glass
  run(s);
  assert.equal(s.counts.Miss, 0);
  assert.equal(s.counts.Good, 6, 'flowing trades precision for continuity');
  assert.equal(s.styles.flow, 6);
  assert.equal(s.productCounts.juice, 1);
});

test('flow does not start right after a hold finished with the finger still down', () => {
  const s = withInputs([hold(1, 2), ...taps(2.1).map((n) => ({ ...n, id: 1 }))]);
  press(s, 1, 2);
  run(s); // never lets go
  assert.equal(s.styles.hold, 1);
  assert.equal(s.styles.flow, 0, 'the tap 0.1 s after the hold is not swallowed by flow');
  assert.equal(s.counts.Miss, 1);
});

test('without flow unlocked, a held finger takes nothing', () => {
  const s = withInputs(taps(1, 1.5), ['swipe', 'chop']);
  press(s, 0.2, 2);
  run(s);
  assert.equal(s.counts.Miss, 2);
});

test('every note is still judged exactly once with every way of playing unlocked', () => {
  let seed = 3;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const s = withInputs(lychee);
  run(s, (s, t) => {
    const r = rand();
    if (r < 0.06) press(s, t, 2);
    else if (r < 0.08) swipe(s, t, 0);
    else if (r < 0.1) chop(s, t);
    else if (s.holding && r < 0.2) release(s, t);
  });
  const judged = s.notes.filter((n) => n.state === 'done').length;
  assert.equal(total(s.counts), judged);
  const finished = Object.values(s.styles).reduce((a, b) => a + b, 0);
  assert.equal(
    finished,
    judged - s.counts.Miss,
    'every note that was not missed has exactly one way it was played',
  );
  assert.equal(
    styleShare(s, 'tap') +
      styleShare(s, 'hold') +
      styleShare(s, 'swipe') +
      styleShare(s, 'chop') +
      styleShare(s, 'flow'),
    finished ? 1 : 0,
  );
});

test('a short hold needs a single cut', () => {
  const s = withInputs([hold(1, 1.4)]);
  press(s, 1, 2);
  release(s, 1.05);
  press(s, 1.2, 2);
  advance(s, 1.4, DT);
  assert.equal(s.styles.chop, 1);
  assert.equal(s.counts.Miss, 0);
});
