import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNotes, chartStats, chartComplexity, chartLevel } from './chart.js';

const fruits = ['apple', 'orange', 'lime'];

test('buildNotes shifts by audio offset plus 20 ms and sorts', () => {
  const notes = buildNotes(
    [
      { id: 2, kind: 'tap', time: 2, end: 2, fruit: 4 },
      { id: 1, kind: 'tap', time: 1, end: 1, fruit: 0 },
    ],
    { audioOffset: -0.02, travel: 1.9, fruits },
  );
  assert.deepEqual(
    notes.map((n) => [n.id, n.time, n.fruit]),
    [
      [1, 1, 'apple'],
      [2, 2, 'orange'],
    ],
  );
  assert.equal(notes[0].state, 'pending');
  assert.equal(notes[0].travel, 1.9);
});

test('buildNotes gives presses one tick per 0.25 s, at least one', () => {
  const [short, long, tap] = buildNotes(
    [
      { id: 1, kind: 'press', time: 0, end: 0.1, fruit: 0 },
      { id: 2, kind: 'press', time: 1, end: 2.1, fruit: 0 },
      { id: 3, kind: 'tap', time: 3, end: 3, fruit: 0 },
    ],
    { travel: 2, fruits },
  );
  assert.equal(short.holdTicks, 1);
  assert.equal(long.holdTicks, 4);
  assert.equal(tap.holdTicks, 0);
});

test('chartStats counts notes and holds', () => {
  assert.deepEqual(chartStats([{ kind: 'tap' }, { kind: 'press' }, { kind: 'press' }]), {
    notes: 3,
    holds: 2,
  });
});

test('chartLevel maps complexity into the band and clamps to 1..10', () => {
  const easy = { notes: 0, holds: 0 },
    song = { duration: 60, bpm: 90 };
  assert.equal(chartComplexity(easy, song), 0);
  assert.equal(chartLevel(easy, song, [3, 7]), 3);
  const dense = { notes: 10000, holds: 5000 },
    fast = { duration: 300, bpm: 200 };
  assert.equal(chartComplexity(dense, fast), 1);
  assert.equal(chartLevel(dense, fast, [7, 10]), 10);
});
