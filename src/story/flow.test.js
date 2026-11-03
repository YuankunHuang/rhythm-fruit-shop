import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  FlowCursor,
  dominantStyle,
  PHASE_TYPES,
  afterServiceNodes,
  insertBossLetters,
  letterNodes,
  matchMilestone,
  pickBranch,
  pickLetter,
  reactionNodes,
  scoreBranchNodes,
  serviceBranch,
} from './flow.js';

const ctx = (over = {}) => ({ day: 1, reputation: 0, shopLevel: 1, rentDaysLeft: 7, seen: [], ...over });
const body = (L) => `<card ${L.id}>`;

test('FlowCursor hands out phases in order and reports when finished', () => {
  const c = new FlowCursor();
  assert.equal(c.finished, true);
  c.start([{ id: 'a' }, { id: 'b' }]);
  assert.equal(c.take().id, 'a');
  assert.equal(c.finished, false);
  assert.equal(c.take().id, 'b');
  assert.equal(c.finished, true);
  c.stop();
  assert.equal(c.active, false);
});

test('scoreBranchNodes takes the highest branch reached, then the shared tail', () => {
  const phase = {
    branches: [
      { min: 0, nodes: ['low'] },
      { min: 88, nodes: ['high'] },
      { min: 62, nodes: ['mid'] },
    ],
    after: ['tail'],
  };
  assert.deepEqual(scoreBranchNodes(phase, 90), ['high', 'tail']);
  assert.deepEqual(scoreBranchNodes(phase, 62), ['mid', 'tail']);
  assert.deepEqual(scoreBranchNodes(phase, 10), ['low', 'tail']);
  assert.deepEqual(scoreBranchNodes({ branches: [{ min: 50, nodes: ['x'] }] }, 10), []);
});

test('serviceBranch bands and afterServiceNodes fallbacks', () => {
  assert.equal(serviceBranch(null), 'good');
  assert.equal(serviceBranch(88), 'good');
  assert.equal(serviceBranch(70), 'ok');
  assert.equal(serviceBranch(10), 'bad');
  const data = { branches: { good: ['g'], ok: ['o'] }, shared: ['s'] };
  assert.deepEqual(afterServiceNodes(data, 'bad'), ['o', 's']);
  assert.deepEqual(afterServiceNodes(data, 'good'), ['g', 's']);
});

test('milestones read only the context', () => {
  assert.equal(matchMilestone({ type: 'day_gte', value: 2 }, ctx({ day: 2 })), true);
  assert.equal(matchMilestone({ type: 'day_eq', value: 10 }, ctx({ day: 10 })), true);
  assert.equal(matchMilestone({ type: 'day_eq', value: 10 }, ctx({ day: 11 })), false);
  assert.equal(matchMilestone({ type: 'rent_days_left_eq', value: 1 }, ctx({ rentDaysLeft: 2 })), false);
  assert.equal(matchMilestone({ type: 'no_boss_letters_seen' }, ctx({ seen: ['x'] })), false);
  assert.equal(matchMilestone({ type: 'unknown' }, ctx()), false);
});

test('pickLetter skips seen letters and prefers the lowest priority number', () => {
  const letters = [
    { id: 'a', priority: 5, milestone: { type: 'day_gte', value: 1 } },
    { id: 'b', priority: 1, milestone: { type: 'day_gte', value: 1 } },
    { id: 'c', priority: 0, milestone: { type: 'day_gte', value: 1 }, placement: { type: 'after_day_home' } },
  ];
  assert.equal(pickLetter(letters, 'day_start', ctx()).id, 'b');
  assert.equal(pickLetter(letters, 'day_start', ctx({ seen: ['b'] })).id, 'a');
  assert.equal(pickLetter(letters, 'after_day_home', ctx()).id, 'c');
});

test('the first letter ever arrives by mailbox unless a courier is named', () => {
  const L = { id: 'x', delivery: 'plain_read' };
  assert.notEqual(
    letterNodes(L, 'flow_start', true, body)[0].text,
    letterNodes(L, 'flow_start', false, body)[0].text,
  );
  assert.deepEqual(letterNodes(L, 'flow_start', true, body)[1], { html: '<card x>' });
});

test('insertBossLetters puts day_start letters first and after_flow_phase letters after their anchor', () => {
  const flow = { phases: [{ id: 'morning' }, { id: 'noon' }] },
    letters = [
      { id: 'open', priority: 0, milestone: { type: 'day_gte', value: 1 } },
      {
        id: 'mid',
        priority: 1,
        milestone: { type: 'day_gte', value: 1 },
        placement: { type: 'after_flow_phase', afterPhaseId: 'morning' },
      },
      {
        id: 'lost',
        priority: 0,
        milestone: { type: 'day_gte', value: 1 },
        placement: { type: 'after_flow_phase', afterPhaseId: 'nowhere' },
      },
    ],
    warnings = [];
  const out = insertBossLetters(flow, letters, ctx(), body, (...a) => warnings.push(a));
  assert.deepEqual(
    out.phases.map((p) => p.id),
    ['__boss_open', 'morning', '__boss_mid', 'noon'],
  );
  assert.equal(warnings.length, 1);
  assert.equal(flow.phases.length, 2, 'input flow is not mutated');
});

// ── Story data checks: run against the real files so script edits cannot silently break a day ──

const root = new URL('../../', import.meta.url);
// Some data files start with a UTF-8 BOM, which fetch().json() drops but JSON.parse does not.
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8').replace(/^﻿/, ''));
const songIds = new Set(read('data/songs.json').songs.map((s) => s.id));
const days = [];
for (let d = 1; existsSync(new URL(`data/flows/day${d}.json`, root)); d++)
  days.push([d, read(`data/flows/day${d}.json`)]);

test('there are day flows to check', () => assert.ok(days.length >= 10));

for (const [d, flow] of days) {
  test(`day ${d}: phases are well formed and reference known songs`, () => {
    const ids = flow.phases.map((p) => p.id).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length, 'phase ids are unique');
    for (const p of flow.phases) {
      assert.ok(PHASE_TYPES.includes(p.type), `unknown phase type ${p.type} (${p.id})`);
      if (p.type === 'service' || p.type === 'track_event')
        assert.ok(songIds.has(p.songId), `${p.id}: unknown song ${p.songId}`);
      if (p.type === 'service_select') {
        const options = p.options.map((o) => o.songId);
        options.forEach((id) => assert.ok(songIds.has(id), `${p.id}: unknown song ${id}`));
        if (p.correctId) assert.ok(options.includes(p.correctId), `${p.id}: correctId not among options`);
      }
      if (p.type === 'score_branch') {
        assert.ok(p.branches.length > 0, `${p.id}: no branches`);
        assert.ok(
          p.branches.some((b) => b.min === 0),
          `${p.id}: no branch catches every score`,
        );
      }
    }
  });

  test(`day ${d}: a cursor walks every phase to the end`, () => {
    const c = new FlowCursor();
    c.start(flow.phases);
    let n = 0;
    while (!c.finished) {
      c.take();
      n++;
    }
    assert.equal(n, flow.phases.length);
  });
}

test('every after_flow_phase boss letter anchors to a phase that exists in some day', () => {
  const allIds = new Set(days.flatMap(([, f]) => f.phases.map((p) => p.id)));
  for (const L of read('data/boss_letters.json').letters)
    if (L.placement && L.placement.type === 'after_flow_phase')
      assert.ok(
        allIds.has(L.placement.afterPhaseId),
        `${L.id} anchors to missing ${L.placement.afterPhaseId}`,
      );
});

test('a style branch wins when that way of playing finished enough of the notes', () => {
  const branches = [
    { min: 88, nodes: ['good'] },
    { min: 0, nodes: ['low'] },
    { style: 'chop', minShare: 0.5, nodes: ['cut'] },
  ];
  assert.deepEqual(pickBranch(branches, 95, { chop: 0.6 }).nodes, ['cut']);
  assert.deepEqual(pickBranch(branches, 95, { chop: 0.4 }).nodes, ['good']);
  assert.deepEqual(pickBranch(branches, 10).nodes, ['low'], 'no style shares: score bands as before');
  assert.deepEqual(scoreBranchNodes({ branches, after: ['x'] }, 95, { chop: 1 }), ['cut', 'x']);
});

test('a layered reaction plays drink, then style, then score band, then the tail', () => {
  const phase = {
    branches: [{ min: 88, nodes: ['good'] }, { min: 62, nodes: ['ok'] }, { min: 0, nodes: ['bad'] }],
    byStyle: { tap: ['plain'], chop: { good: ['clean cut'], ok: ['cut'], bad: ['hacked'] } },
    byDrink: { lemon_water: ['not what I asked'], _default: ['hm'] },
    after: ['bye'],
  };
  const ask = { served: 'grape', wanted: 'grape' };
  assert.deepEqual(reactionNodes(phase, { ...ask, score: 95 }), ['plain', 'good', 'bye']);
  assert.deepEqual(reactionNodes(phase, { ...ask, score: 70, styleShares: { chop: 0.8 } }), ['cut', 'ok', 'bye']);
  assert.deepEqual(reactionNodes(phase, { served: 'lemon_water', wanted: 'grape', score: 95 }), ['not what I asked', 'plain', 'bye'],
    'a wrong drink replaces the score band');
  assert.deepEqual(reactionNodes(phase, { served: 'fruit_cup', wanted: 'grape', score: 10, styleShares: { chop: 1 } }),
    ['hm', 'hacked', 'bye'], 'unlisted wrong drink falls back to _default; banded style layer follows the score');
  assert.deepEqual(reactionNodes({ branches: phase.branches, after: ['x'] }, { score: 70 }), ['ok', 'x'],
    'phases without layers behave as before');
  assert.equal(dominantStyle({ swipe: 0.4, chop: 0.3 }), 'tap');
  assert.equal(dominantStyle({ flow: 0.7 }), 'flow');
});
