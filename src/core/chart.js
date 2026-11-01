// Chart data -> playable notes, and chart difficulty rating. Pure functions.

export const HOLD_TICK_INTERVAL = 0.25;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Runtime notes for one chart, shifted by the song's audio offset and sorted by time. */
export function buildNotes(chart, { audioOffset = 0, travel, fruits }) {
  const delta = audioOffset + 0.02;
  return chart
    .map((n) => {
      const duration = Math.max(0, (n.end || n.time) - n.time);
      return {
        id: n.id,
        kind: n.kind,
        time: n.time + delta,
        end: n.end + delta,
        lane: n.lane || 0,
        fruit: fruits[n.fruit % fruits.length],
        accent: n.accent,
        state: 'pending',
        travel,
        tickInterval: HOLD_TICK_INTERVAL,
        holdTicks: n.kind === 'press' ? Math.max(1, Math.floor(duration / HOLD_TICK_INTERVAL)) : 0,
        ticksDone: 0,
      };
    })
    .sort((a, b) => a.time - b.time || a.end - b.end || a.id - b.id);
}

export function chartStats(chart) {
  return { notes: chart.length, holds: chart.filter((n) => n.kind === 'press').length };
}

/** 0..1 blend of note density, hold share, tempo and length. */
export function chartComplexity(stats, song) {
  const minutes = Math.max(0.75, (song.duration || 120) / 60),
    notesPerMin = stats.notes / minutes,
    holdRate = stats.holds / Math.max(1, stats.notes),
    bpm = song.bpm || 120,
    density = clamp((notesPerMin - 55) / 210, 0, 1),
    holds = clamp(holdRate / 0.22, 0, 1),
    tempo = clamp((bpm - 95) / 95, 0, 1),
    endurance = clamp(((song.duration || 120) - 110) / 170, 0, 1);
  return density * 0.62 + holds * 0.22 + tempo * 0.1 + endurance * 0.06;
}

/** Level 1..10 inside the difficulty's band. */
export function chartLevel(stats, song, band = [1, 10]) {
  const level = Math.round(band[0] + chartComplexity(stats, song) * (band[1] - band[0]));
  return clamp(level, 1, 10);
}
