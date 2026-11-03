import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyStage, stageStep, stageLayout, stageLook, OFFSTAGE } from './stage.js';

const play = (lines, stage = emptyStage()) => lines.reduce((s, line) => stageStep(s, line), stage);
const slots = (stage) => Object.fromEntries(stageLayout(stage.cast).map((c) => [c.key, c.slot]));

test('whoever speaks walks on and is lit; the others dim', () => {
  const s = play([{ key: 'yuzu', expr: 'smile' }, { key: 'laofang' }]);
  assert.deepEqual(
    stageLook(s).map((c) => [c.key, c.lit, c.dim]),
    [
      ['laofang', true, false],
      ['yuzu', false, true],
    ],
  );
  assert.equal(s.cast.find((c) => c.key === 'yuzu').expr, 'smile');
});

test('柚子 keeps the right-hand slot; guests fill from the left in the order they came', () => {
  assert.deepEqual(slots(play([{ key: 'yuzu' }, { key: 'laofang' }])), { laofang: 'left', yuzu: 'right' });
  assert.deepEqual(slots(play([{ key: 'yuzu' }, { key: 'laofang' }, { key: 'yanzi' }])), {
    laofang: 'left',
    yanzi: 'center',
    yuzu: 'right',
  });
  assert.deepEqual(slots(play([{ key: 'laofang' }])), { laofang: 'left' });
  assert.deepEqual(slots(play([{ key: 'laofang' }, { key: 'yanzi' }])), { laofang: 'left', yanzi: 'right' });
  assert.deepEqual(slots(play([{ key: 'a' }, { key: 'b' }, { key: 'c' }])), {
    a: 'left',
    b: 'center',
    c: 'right',
  });
});

test('a full stage: a new speaker takes the place of the quietest guest, and 柚子 stays', () => {
  const s = play([
    { key: 'yuzu' },
    { key: 'laofang' },
    { key: 'yanzi' },
    { key: 'laofang' },
    { key: 'yuzu' },
    { key: 'chengwan' },
  ]);
  assert.deepEqual(
    s.cast.map((c) => c.key),
    ['yuzu', 'laofang', 'chengwan'],
  );
  assert.deepEqual(slots(s), { laofang: 'left', chengwan: 'center', yuzu: 'right' });
  const noHost = play([{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }]);
  assert.deepEqual(
    noHost.cast.map((c) => c.key),
    ['d', 'b', 'c'],
  );
});

test('the protagonist keeps the light; narration lights nobody; a voice with no portrait dims everyone', () => {
  const s = play([{ key: 'yuzu' }, { key: 'laofang' }]);
  assert.equal(stageStep(s, { keep: true }).speaker, 'laofang');
  const told = stageStep(s, {});
  assert.equal(told.speaker, '');
  assert.ok(stageLook(told).every((c) => !c.dim && !c.lit));
  const door = stageStep(s, { voice: true });
  assert.equal(door.speaker, OFFSTAGE);
  assert.ok(stageLook(door).every((c) => c.dim));
  assert.equal(door.cast.length, 2);
});

test('cast replaces the stage; enter and exit change it; the lit speaker leaving puts the light out', () => {
  const s = play([{ cast: ['yuzu', 'laowang'] }]);
  assert.deepEqual(
    s.cast.map((c) => c.key),
    ['yuzu', 'laowang'],
  );
  assert.equal(s.speaker, '');
  const gone = play([{ key: 'laowang' }, { exit: ['laowang'], keep: true }], s);
  assert.deepEqual(
    gone.cast.map((c) => c.key),
    ['yuzu'],
  );
  assert.equal(gone.speaker, '');
  const joined = stageStep(gone, { enter: ['miss_cat'] });
  assert.deepEqual(slots(joined), { miss_cat: 'left', yuzu: 'right' });
  assert.equal(stageStep(joined, { exit: ['all'] }).cast.length, 0);
});

test('silent people keep their last expression; speaking again changes it', () => {
  const s = play([{ key: 'yuzu', expr: 'teasing' }, { key: 'laofang', expr: 'smile' }, { key: 'yuzu' }]);
  assert.equal(s.cast.find((c) => c.key === 'yuzu').expr, 'teasing');
  assert.equal(s.cast.find((c) => c.key === 'laofang').expr, 'smile');
  assert.equal(stageStep(s, { key: 'yuzu', expr: 'sigh' }).cast.find((c) => c.key === 'yuzu').expr, 'sigh');
});
