// Timing judgement and hit-target selection. Pure: times in seconds, no DOM or view.
// err = press time − note time, so a positive err is late.

const RESULTS = {
  perfect: { name: 'Perfect', score: 300, acc: 1, color: '#8cffc1' },
  great: { name: 'Great', score: 220, acc: 0.72, color: '#80b7ff' },
  good: { name: 'Good', score: 120, acc: 0.4, color: '#ffe66d' },
  late: { name: 'Good', score: 80, acc: 0.22, color: '#ffe66d' },
};

export function judgeTiming(err, windows) {
  const a = Math.abs(err);
  if (a <= windows.perfect) return { ...RESULTS.perfect };
  if (a <= windows.great) return { ...RESULTS.great };
  if (a <= windows.good) return { ...RESULTS.good };
  // Late presses get a reduced Good up to the miss window; early ones past `good` get nothing.
  if (err > 0 && err <= windows.miss) return { ...RESULTS.late };
  return null;
}

/** First index whose note time is >= time. Notes must be sorted by time. */
export function lowerBound(notes, time) {
  let lo = 0,
    hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (notes[mid].time < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The pending tap/press note a press at time t should hit. A note already due (no earlier than
 * −perfect) wins over one that is still early; within each group the earliest note wins, and
 * notes at the same time go to the one nearest the hit line.
 */
export function pickHitTarget(notes, t, windows, defaultTravel) {
  let due = null,
    early = null;
  const start = Math.max(0, lowerBound(notes, t - windows.miss) - 2);
  for (let i = start; i < notes.length; i++) {
    const n = notes[i];
    if (n.time > t + windows.miss) break;
    if (n.state !== 'pending' || (n.kind !== 'tap' && n.kind !== 'press')) continue;
    const err = t - n.time;
    if (err > windows.miss || err < -windows.good) continue;
    // Screen distance to the hit line is |err| / travel times a constant lane height.
    const item = { n, err, dist: Math.abs(err) / (n.travel || defaultTravel) },
      slot = err >= -windows.perfect ? 'due' : 'early',
      cur = slot === 'due' ? due : early;
    if (!cur || n.time < cur.n.time || (n.time === cur.n.time && item.dist < cur.dist)) {
      if (slot === 'due') due = item;
      else early = item;
    }
  }
  return due || early;
}
