// The visual song clock that notes are drawn and judged against. It follows the audio clock,
// smoothed so that coarse audio timestamps do not make notes jitter.

/**
 * One frame's step of the visual clock.
 * While playback is starting (`syncing`), it may lead the audio by up to 0.12 s of wall time,
 * because audio reports its position late at first.
 */
export function stepVisualClock(visual, { audioTime, wallTime, syncing, realDt }) {
  const target = syncing ? Math.max(audioTime, Math.min(wallTime, audioTime + 0.12)) : audioTime;
  // The step cap uses real frame time, not a clamped dt, so slow frames cannot leave the chart behind the music.
  return Math.max(visual, Math.min(target, visual + Math.max(realDt * 1.35, 0.018)));
}
