// Who is on stage during dialogue: up to three portraits at once, the speaker lit and the rest dimmed.
// Pure: names are already resolved to portrait keys (vnCharacterKey in main.js). Design: docs/narrative/00_skeleton_v4.md §6.
//
// A dialogue phase may carry `cast` (who is there when it starts); any line may carry `cast` (the whole stage
// from here on), `enter` and `exit` (names, or "all" for exit). Anyone with a portrait who speaks walks on by
// themselves; when the stage is full they take the place of whoever has been quiet longest.

export const STAGE_SIZE = 3;
/** 柚子 stands behind the counter: always the right-hand slot while she is on stage. */
export const HOST = 'yuzu';
/** `speaker` when a voice without a portrait talks (a rider at the door, the kitchen): everyone on stage dims. */
export const OFFSTAGE = '#offstage';

export function emptyStage() {
  return { cast: [], speaker: '', clock: 0 };
}

function admit(cast, key, clock) {
  if (cast.some((c) => c.key === key)) return cast;
  const entry = { key, expr: 'neutral', spoke: clock };
  if (cast.length < STAGE_SIZE) return [...cast, entry];
  const quietest = (list) => list.reduce((a, b) => (b.spoke < a.spoke ? b : a));
  const guests = cast.filter((c) => c.key !== HOST),
    out = quietest(guests.length ? guests : cast);
  return cast.map((c) => (c === out ? entry : c));
}

/**
 * Applies one line. `line`: { key, expr, keep, voice, cast, enter, exit }
 * - key: the portrait of whoever speaks; they come on stage if needed and are lit.
 * - keep: the protagonist or their thoughts; whoever was lit stays lit.
 * - voice: someone without a portrait speaks; everyone dims.
 * - none of these (narration, the order slip): nobody is lit, nobody dims.
 * - cast replaces the stage; exit (keys, or 'all') and enter are applied before the speaker.
 */
export function stageStep(stage, line = {}) {
  const clock = stage.clock + 1;
  let cast = stage.cast;
  if (line.cast) cast = line.cast.reduce((list, key) => admit(list, key, clock), []);
  if (line.exit && line.exit.length)
    cast = line.exit.includes('all') ? [] : cast.filter((c) => !line.exit.includes(c.key));
  for (const key of line.enter || []) cast = admit(cast, key, clock);
  let speaker = stage.speaker;
  if (line.key) {
    cast = admit(cast, line.key, clock).map((c) =>
      c.key === line.key ? { ...c, expr: line.expr || c.expr, spoke: clock } : c,
    );
    speaker = line.key;
  } else if (line.voice) speaker = OFFSTAGE;
  else if (!line.keep) speaker = '';
  if (speaker && speaker !== OFFSTAGE && !cast.some((c) => c.key === speaker)) speaker = '';
  return { cast, speaker, clock };
}

/** Slots, left to right, for everyone on stage: 柚子 on the right, the others in the order they came in. */
export function stageLayout(cast) {
  const host = cast.find((c) => c.key === HOST),
    guests = cast.filter((c) => c.key !== HOST),
    slots = host
      ? ['left', 'center']
      : guests.length === 1
        ? ['left']
        : guests.length === 2
          ? ['left', 'right']
          : ['left', 'center', 'right'];
  return [...guests.map((c, i) => ({ ...c, slot: slots[i] })), ...(host ? [{ ...host, slot: 'right' }] : [])];
}

/** How each portrait looks: `lit` for the speaker, `dim` for everyone else while someone speaks. */
export function stageLook(stage) {
  return stageLayout(stage.cast).map((c) => ({
    ...c,
    lit: c.key === stage.speaker,
    dim: !!stage.speaker && c.key !== stage.speaker,
  }));
}
