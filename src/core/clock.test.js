import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepVisualClock } from './clock.js';

/** Plays 30 s at a fixed frame rate; audio reports its position in 10 ms steps, like a browser. */
function simulate(fps, dtFor = (realDt) => realDt) {
  const realDt = 1 / fps;
  let visual = 0,
    worstLag = 0,
    worstStep = 0;
  for (let t = realDt; t <= 30; t += realDt) {
    const audioTime = Math.floor(t * 100) / 100,
      next = stepVisualClock(visual, { audioTime, wallTime: t, syncing: false, realDt: dtFor(realDt) });
    worstStep = Math.max(worstStep, next - visual);
    visual = next;
    worstLag = Math.max(worstLag, audioTime - visual);
  }
  return { worstLag, worstStep };
}

for (const fps of [3, 20, 60, 120]) {
  test(`the visual clock keeps up with the music at ${fps} fps`, () => {
    assert.ok(simulate(fps).worstLag < 0.011, 'never more than one audio step behind');
  });
}

test('a step cap from the clamped dt would fall behind on slow frames', () => {
  // The old behaviour: the cap used min(0.033, frame time), so 3 fps ran at about a fifth of real speed.
  const { worstLag } = simulate(3, (realDt) => Math.min(0.033, realDt));
  assert.ok(worstLag > 20, `lagged ${worstLag.toFixed(1)} s behind after 30 s`);
});

test('at 60 fps the clock never jumps more than 1.35 frames', () => {
  assert.ok(simulate(60).worstStep <= (1 / 60) * 1.35 + 1e-9);
});

test('while syncing, the clock may lead the audio by up to 0.12 s of wall time', () => {
  const step = (visual, audioTime, wallTime) =>
    stepVisualClock(visual, { audioTime, wallTime, syncing: true, realDt: 1 });
  assert.equal(step(0, 0, 0.05), 0.05);
  assert.equal(step(0, 0, 0.5), 0.12);
  assert.equal(step(0.3, 0.1, 0.2), 0.3, 'never steps backwards');
});
