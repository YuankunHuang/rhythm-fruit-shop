// State machine unit tests. Run with: node --test src/state.test.js
// Uses Node.js built-in test runner (Node >= 18).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { S, TRANSITIONS, assertTransition } from './state.js';

// ── S constants ───────────────────────────────────────────────────────────────

test('S has 12 unique string constants', () => {
  const values = Object.values(S);
  assert.equal(values.length, 12);
  assert.equal(new Set(values).size, values.length, 'all values must be unique');
  for (const v of values) assert.equal(typeof v, 'string');
});

test('S is frozen', () => {
  assert.ok(Object.isFrozen(S));
});

// ── TRANSITIONS completeness ──────────────────────────────────────────────────

test('every state has a TRANSITIONS entry', () => {
  for (const key of Object.keys(S)) {
    assert.ok(TRANSITIONS.has(S[key]), `missing entry for S.${key}`);
  }
});

test('every target in TRANSITIONS is a known state', () => {
  const known = new Set(Object.values(S));
  for (const [from, targets] of TRANSITIONS) {
    for (const to of targets) {
      assert.ok(known.has(to), `unknown target "${to}" from "${from}"`);
    }
  }
});

// ── Key gameplay sequences ────────────────────────────────────────────────────

function allowed(from, to) {
  return TRANSITIONS.get(from)?.has(to) ?? false;
}

test('practice flow: HOME → SELECT → READY → LEAD_IN → PLAYING → ENDED → HOME', () => {
  const seq = [S.HOME, S.SELECT, S.READY, S.LEAD_IN, S.PLAYING, S.ENDED, S.HOME];
  for (let i = 0; i < seq.length - 1; i++) {
    assert.ok(allowed(seq[i], seq[i + 1]),
      `expected ${seq[i]} → ${seq[i + 1]} to be valid`);
  }
});

test('pause / resume cycle: PLAYING → PAUSED → RESUME_COUNTDOWN → PLAYING', () => {
  assert.ok(allowed(S.PLAYING, S.PAUSED));
  assert.ok(allowed(S.PAUSED, S.RESUME_COUNTDOWN));
  assert.ok(allowed(S.RESUME_COUNTDOWN, S.PLAYING));
});

test('day mode flow: HOME → FLOW → MENU_EDIT → OVERVIEW → READY → LEAD_IN → PLAYING → ENDED → FLOW', () => {
  const seq = [S.HOME, S.FLOW, S.MENU_EDIT, S.OVERVIEW, S.READY, S.LEAD_IN, S.PLAYING, S.ENDED, S.FLOW];
  for (let i = 0; i < seq.length - 1; i++) {
    assert.ok(allowed(seq[i], seq[i + 1]),
      `expected ${seq[i]} → ${seq[i + 1]} to be valid`);
  }
});

test('early quit: PAUSED → HOME', () => {
  assert.ok(allowed(S.PAUSED, S.HOME));
});

test('ENDED self-loop (restart same day)', () => {
  assert.ok(allowed(S.ENDED, S.ENDED));
});

// ── Blocked transitions ───────────────────────────────────────────────────────

test('PLAYING cannot go directly to HOME', () => {
  assert.equal(allowed(S.PLAYING, S.HOME), false);
});

test('HOME cannot go directly to PLAYING', () => {
  assert.equal(allowed(S.HOME, S.PLAYING), false);
});

test('READY cannot go directly to ENDED', () => {
  assert.equal(allowed(S.READY, S.ENDED), false);
});

// ── assertTransition ──────────────────────────────────────────────────────────

test('assertTransition warns on illegal transition', () => {
  const warnings = [];
  const orig = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  assertTransition(S.PLAYING, S.HOME);
  console.warn = orig;
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('playing'));
  assert.ok(warnings[0].includes('home'));
});

test('assertTransition is silent on legal transition', () => {
  const warnings = [];
  const orig = console.warn;
  console.warn = (...args) => warnings.push(args);
  assertTransition(S.PLAYING, S.PAUSED);
  console.warn = orig;
  assert.equal(warnings.length, 0);
});
