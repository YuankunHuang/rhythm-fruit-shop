import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeTiming, lowerBound, pickHitTarget } from './judge.js';

const W = { perfect: 0.095, great: 0.135, good: 0.19, miss: 0.24 };

test('judgeTiming grades by absolute error', () => {
  assert.equal(judgeTiming(0, W).name, 'Perfect');
  assert.equal(judgeTiming(-0.095, W).name, 'Perfect');
  assert.equal(judgeTiming(0.1, W).name, 'Great');
  assert.equal(judgeTiming(-0.18, W).score, 120);
});

test('judgeTiming forgives late presses up to the miss window, not early ones', () => {
  assert.equal(judgeTiming(0.22, W).score, 80);
  assert.equal(judgeTiming(-0.22, W), null);
  assert.equal(judgeTiming(0.25, W), null);
});

test('judgeTiming returns fresh objects', () => {
  const a = judgeTiming(0, W);
  a.score = 0;
  assert.equal(judgeTiming(0, W).score, 300);
});

test('lowerBound finds the first note at or after a time', () => {
  const notes = [{ time: 1 }, { time: 2 }, { time: 2 }, { time: 3 }];
  assert.equal(lowerBound(notes, 0), 0);
  assert.equal(lowerBound(notes, 2), 1);
  assert.equal(lowerBound(notes, 2.5), 3);
  assert.equal(lowerBound(notes, 9), 4);
});

const note = (id, time, extra = {}) => ({ id, time, kind: 'tap', state: 'pending', travel: 2, ...extra });

test('pickHitTarget prefers a due note over an earlier-arriving early one', () => {
  const notes = [note(1, 1.0), note(2, 1.15)];
  assert.equal(pickHitTarget(notes, 1.05, W, 2).n.id, 1);
  // At 0.95 note 1 is due (err −0.05) and note 2 is early (err −0.2, outside good): note 1.
  assert.equal(pickHitTarget(notes, 0.95, W, 2).n.id, 1);
});

test('pickHitTarget skips judged notes and non-hittable kinds', () => {
  const notes = [note(1, 1.0, { state: 'hit' }), note(2, 1.0, { kind: 'hold-tick' }), note(3, 1.05)];
  assert.equal(pickHitTarget(notes, 1.0, W, 2).n.id, 3);
});

test('pickHitTarget returns null outside every window', () => {
  assert.equal(pickHitTarget([note(1, 1.0)], 1.5, W, 2), null);
  assert.equal(pickHitTarget([note(1, 1.0)], 0.7, W, 2), null);
});

test('pickHitTarget breaks a time tie toward the note nearer the hit line', () => {
  const notes = [note(1, 1.0, { travel: 2 }), note(2, 1.0, { travel: 1 })];
  // Same err; the slower note (larger travel) is drawn closer to the line.
  assert.equal(pickHitTarget(notes, 1.02, W, 2).n.id, 1);
});
