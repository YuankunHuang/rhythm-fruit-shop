// Rules of one play session: hits, holds, misses, combo, heat, orders, anger and the final score.
// Deterministic and DOM-free. Every rule change pushes an event onto session.events; the caller
// drains them to play sound and draw effects, so a run can be replayed headless from inputs alone.
//
// Notes come in two kinds (tap, press) but can be played several ways. Tap and hold are always
// available; swipe, chop and flow are unlocked by the story and passed in as `inputs`
// (see docs/input_modes.md). With no inputs the rules are exactly the original ones.

import { judgeTiming, pickHitTarget } from './judge.js';
import { comboHeat, heatBonusValue } from './economy.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const ANGER_LIMIT = 100;
/** After a chop-enabled hold is released, how long the first cut may take before it is a miss. */
export const CHOP_GRACE = 0.35;
/** How long the finger must stay down, with no hold in hand, before notes start flowing in. */
export const FLOW_ARM = 0.3;
export const INPUT_MODES = ['swipe', 'chop', 'flow'];

/** Cuts a hold of this length needs: one per half second, rounded, at least one. */
export const chopsNeeded = (n) => Math.max(1, Math.round((n.end - n.time) / 0.5));

export function createSession(notes, orders, windows, inputs = []) {
  const holds = notes.filter((n) => n.kind === 'press').length;
  return {
    notes,
    orders,
    windows,
    inputs: new Set(inputs),
    heat: 0,
    combo: 0,
    maxCombo: 0,
    acc: 0,
    total: notes.length,
    timingTotal: notes.length,
    comboTarget: notes.length + holds,
    holding: false,
    activeHold: null,
    flowing: false,
    pressAt: -Infinity,
    lastResolveAt: -Infinity,
    lastTapHit: null,
    lastJudge: '准备',
    lastErr: 0,
    lastComboBurst: 0,
    customerAnger: 0,
    missCursor: 0,
    counts: { Perfect: 0, Great: 0, Good: 0, Miss: 0 },
    missReasons: { Miss: 0, EarlyRelease: 0, TooFewCuts: 0 },
    productCounts: { chunks: 0, juice: 0, waste: 0 },
    styles: { tap: 0, hold: 0, swipe: 0, chop: 0, flow: 0 },
    events: [],
  };
}

export function drainEvents(s) {
  const events = s.events;
  s.events = [];
  return events;
}

export const isAngry = (s) => s.customerAnger >= ANGER_LIMIT;

/** Share of judged notes finished with a given way of playing (tap, hold, swipe, chop, flow). */
export function styleShare(s, style) {
  const done = Object.values(s.styles).reduce((a, b) => a + b, 0);
  return done ? s.styles[style] / done : 0;
}

/** Finger down at song time t. */
export function press(s, t, defaultTravel) {
  s.holding = true;
  s.pressAt = t;
  const h = s.activeHold;
  if (h && h.state === 'chopping') {
    chop(s, t);
    return;
  }
  if (h && h.state === 'holding') {
    s.lastJudge = 'Hold';
    s.events.push({ type: 'holdRepress' });
    return;
  }
  s.events.push({ type: 'slash' });
  const target = pickHitTarget(s.notes, t, s.windows, defaultTravel);
  if (target) {
    const j = judgeTiming(target.err, s.windows);
    if (j) {
      if (target.n.kind === 'press') beginHold(s, target.n, j, target.err);
      else hit(s, target.n, j, target.err, t);
      return;
    }
  }
  s.lastJudge = 'Empty';
}

/** Finger up at song time t: a held press completes if released close enough to its end. */
export function release(s, t) {
  s.holding = false;
  s.flowing = false;
  const n = s.activeHold;
  if (!n || n.state === 'chopping') return;
  const remaining = n.end - t,
    len = Math.max(0.001, n.end - n.time),
    softWindow = Math.max(s.windows.good, Math.min(0.55, len * 0.38));
  if (remaining <= softWindow) completeHold(s, n, t);
  else if (s.inputs.has('chop')) {
    // Letting go is not a miss yet: the hold may be cut instead of held.
    n.state = 'chopping';
    n.chopGraceUntil = t + CHOP_GRACE;
  } else miss(s, n, t, 'Early Release');
}

/** A quick flick, reported just after the press that started it: the tap it hit becomes a swipe. */
export function swipe(s, t, angle) {
  const n = s.lastTapHit;
  if (!s.inputs.has('swipe') || !n || n.style !== 'tap' || n.hitAt !== s.pressAt) return;
  n.style = 'swipe';
  s.styles.tap--;
  s.styles.swipe++;
  s.events.push({ type: 'swipe', note: n, angle });
}

/** One cut into the hold in hand: a fresh tap during it, or a turn in a zigzag while pressed. */
export function chop(s, t) {
  const n = s.activeHold;
  if (!s.inputs.has('chop') || !n || (n.state !== 'holding' && n.state !== 'chopping')) return;
  if (t > n.end + s.windows.good) return;
  n.state = 'chopping';
  n.chops++;
  addHeat(s, 3);
  s.productCounts.chunks++;
  s.events.push({ type: 'chop', note: n });
  addProduct(s, 'chunks', n.fruit.color);
}

/** Time passes to t: anger cools, flowing notes are taken, overdue notes miss, a hold ticks or ends. */
export function advance(s, t, dt) {
  s.customerAnger = Math.max(0, s.customerAnger - dt * 5.5);
  if (s.inputs.has('flow')) takeFlowingNotes(s, t);
  while (s.missCursor < s.notes.length && t > s.notes[s.missCursor].time + s.windows.miss) {
    const n = s.notes[s.missCursor++];
    if (n.state === 'pending') miss(s, n, t, 'Miss');
    if (isAngry(s)) return;
  }
  const h = s.activeHold;
  if (!h) return;
  if (h.state === 'holding' && s.holding) {
    holdTick(s, h, t);
    if (t >= h.end - s.windows.perfect) completeHold(s, h, t);
  } else if (h.state === 'chopping') {
    // Cuts count until the hold's end plus the Good window; letting go and never cutting is an early release.
    const deadline = h.end + s.windows.good;
    if (h.chops >= chopsNeeded(h) && t >= h.end - s.windows.perfect) completeChop(s, h, t);
    else if (h.chops === 0 && t > Math.min(h.chopGraceUntil, deadline)) miss(s, h, t, 'Early Release');
    else if (t > deadline) miss(s, h, t, 'Too Few Cuts');
  }
}

function takeFlowingNotes(s, t) {
  // Only notes that arrive after the flow is armed are taken; ones it held through before that still miss.
  const armedAt = Math.max(s.pressAt, s.lastResolveAt) + FLOW_ARM;
  s.flowing = s.holding && (s.activeHold?.flowBegun || t >= armedAt);
  if (!s.flowing || s.activeHold) return;
  const j = judgeTiming(s.windows.good, s.windows);
  for (let i = s.missCursor; i < s.notes.length && s.notes[i].time <= t; i++) {
    const n = s.notes[i];
    if (n.state !== 'pending' || n.time < armedAt) continue;
    if (n.kind === 'press') {
      beginHold(s, n, j, s.windows.good);
      n.flowBegun = true;
      return;
    }
    hit(s, n, j, s.windows.good, t, 'flow');
  }
}

function addHeat(s, v) {
  s.heat += Math.max(0, Math.round(v));
}

function scoreJudge(s, j) {
  s.counts[j.name]++;
  s.acc += j.acc;
  s.combo++;
  s.maxCombo = Math.max(s.maxCombo, s.combo);
}

function hit(s, n, j, err, t, style = 'tap') {
  n.state = 'done';
  n.style = style;
  n.hitAt = t;
  s.styles[style]++;
  if (style === 'tap') s.lastTapHit = n;
  scoreJudge(s, j);
  addHeat(s, j.name === 'Perfect' ? 14 : j.name === 'Great' ? 10 : 6);
  addHeat(s, comboHeat(s.combo, 0.25));
  s.productCounts.chunks++;
  s.lastJudge = j.name;
  s.lastErr = err * 1000;
  s.events.push({ type: 'judge', note: n, judge: j, hold: false, style });
  addProduct(s, 'chunks', n.fruit.color);
  updateComboOrders(s);
  checkComboBurst(s);
}

function beginHold(s, n, j, err) {
  n.state = 'holding';
  n.nextTick = n.time + n.tickInterval;
  n.ticksDone = 0;
  n.chops = 0;
  n.chopGraceUntil = Infinity;
  n.headJudge = j;
  s.activeHold = n;
  scoreJudge(s, j);
  addHeat(s, j.name === 'Perfect' ? 12 : j.name === 'Great' ? 9 : 6);
  addHeat(s, comboHeat(s.combo, 0.22));
  s.lastJudge = '按住 ' + j.name;
  s.lastErr = err * 1000;
  s.events.push({ type: 'judge', note: n, judge: j, hold: true });
  updateComboOrders(s);
  checkComboBurst(s);
}

function resolveHold(s, n, t) {
  n.state = 'done';
  s.activeHold = null;
  s.combo++;
  s.maxCombo = Math.max(s.maxCombo, s.combo);
  // A hold finished with the finger still down should not slide straight into flowing.
  if (s.holding && !n.flowBegun) s.lastResolveAt = t;
}

function completeHold(s, n, t, label = '榨汁完成') {
  if (n.state !== 'holding') return;
  addHeat(s, 16 + n.holdTicks * 5 + comboHeat(s.combo, 0.25));
  resolveHold(s, n, t);
  s.styles[n.flowBegun ? 'flow' : 'hold']++;
  s.productCounts.juice++;
  addProduct(s, 'juice', n.fruit.color);
  updateComboOrders(s);
  checkComboBurst(s);
  s.lastJudge = label;
  s.events.push({ type: 'holdComplete', note: n, label });
}

function completeChop(s, n, t, label = '切块完成') {
  addHeat(s, 10 + n.chops * 3);
  resolveHold(s, n, t);
  s.styles.chop++;
  updateComboOrders(s);
  checkComboBurst(s);
  s.lastJudge = label;
  s.events.push({ type: 'chopComplete', note: n, label });
}

function holdTick(s, n, t) {
  while (n.nextTick && t >= n.nextTick && n.nextTick < n.end) {
    n.nextTick += n.tickInterval;
    n.ticksDone++;
    addHeat(s, 2 + Math.min(8, Math.floor(s.combo * 0.025)));
    s.events.push({ type: 'holdTick', note: n });
  }
}

const MISS_REASON = { 'Early Release': 'EarlyRelease', 'Too Few Cuts': 'TooFewCuts' };

function miss(s, n, t, label) {
  if (n.state === 'done') return;
  n.state = 'done';
  n.missed = true;
  if (s.activeHold === n) s.activeHold = null;
  // A hold that was started and then lost turns its head judgement into this Miss, so every note is counted once.
  if (n.headJudge) {
    s.counts[n.headJudge.name]--;
    s.acc -= n.headJudge.acc;
  }
  s.counts.Miss++;
  s.missReasons[MISS_REASON[label] || 'Miss']++;
  s.combo = 0;
  s.productCounts.waste++;
  s.customerAnger = clamp(s.customerAnger + (label === 'Miss' ? 10 : 14), 0, ANGER_LIMIT);
  s.lastJudge = label;
  s.lastErr = (t - (n.time || t)) * 1000;
  s.events.push({ type: 'miss', note: n, label });
  addProduct(s, 'waste', '#77809f');
}

function addProduct(s, kind, color) {
  s.events.push({ type: 'product', kind, color });
  for (const o of s.orders) {
    if (o.done) continue;
    // 'orders' counts every product, waste included.
    if (o.kind === kind || o.kind === 'orders') {
      o.have = Math.min(o.need, o.have + 1);
      if (o.have >= o.need) completeOrder(s, o);
    }
  }
}

function updateComboOrders(s) {
  for (const o of s.orders) {
    if (o.done) continue;
    if (o.kind === 'combo') {
      o.have = Math.min(o.need, Math.max(o.have, s.combo));
      if (o.have >= o.need) completeOrder(s, o);
    } else if (o.kind === 'quality') {
      const q = Math.round((s.timingTotal ? s.acc / s.timingTotal : 0) * 100);
      o.have = Math.min(o.need, Math.max(o.have, q));
      if (o.have >= o.need) completeOrder(s, o);
    }
  }
}

function completeOrder(s, o) {
  if (o.done) return;
  o.done = true;
  addHeat(s, 35);
  s.events.push({ type: 'orderComplete', order: o });
}

function checkComboBurst(s) {
  if (s.combo >= 25 && s.combo % 25 === 0 && s.combo !== s.lastComboBurst) {
    s.lastComboBurst = s.combo;
    s.events.push({ type: 'comboBurst', combo: s.combo });
  }
}

/** Customer score, pay, reputation and rank for a finished session. */
export function scoreShift(s, { failed, cutterBonus = 0, blenderBonus = 0, signBonus = 0, incomeMul = 1 }) {
  const timing = s.timingTotal ? s.acc / s.timingTotal : 0,
    ordersDone = s.orders.filter((o) => o.done).length,
    baseCustomer =
      timing * 72 +
      (s.maxCombo / Math.max(1, s.comboTarget)) * 18 +
      (ordersDone / s.orders.length) * 12 -
      s.counts.Miss * 1.4 -
      s.customerAnger * 0.32,
    customer = failed ? 0 : Math.round(clamp(baseCustomer, 0, 100)),
    basePay = failed ? 30 : 80,
    productPay = Math.round(
      s.productCounts.chunks * 5 * (1 + cutterBonus) + s.productCounts.juice * 18 * (1 + blenderBonus),
    ),
    heatPay = heatBonusValue(s.heat, customer, failed),
    tip = failed ? 0 : customer >= 96 ? 140 : customer >= 90 ? 90 : customer >= 80 ? 45 : 0,
    money = Math.round((basePay + productPay + heatPay + tip) * incomeMul),
    rawRep = failed ? 0 : Math.round(customer / 8 + s.counts.Perfect * 0.05 + ordersDone * 1.5),
    rep = Math.round(rawRep * (1 + signBonus)),
    rank = failed
      ? 'F'
      : customer >= 96
        ? 'S'
        : customer >= 88
          ? 'A'
          : customer >= 76
            ? 'B'
            : customer >= 62
              ? 'C'
              : 'D';
  return { timing, customer, basePay, productPay, heatPay, tip, money, rep, rank, ordersDone };
}
