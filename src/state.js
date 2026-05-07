// Game state machine — states and valid transitions.
// C++ equivalent: enum class GameState { ... } with a transition guard table.

export const S = Object.freeze({
  HOME:             'home',
  SAVE:             'save',
  FLOW:             'flow',
  MENU_EDIT:        'menuEdit',
  OVERVIEW:         'overview',
  SELECT:           'select',
  READY:            'ready',
  LEAD_IN:          'leadIn',
  PLAYING:          'playing',
  PAUSED:           'paused',
  RESUME_COUNTDOWN: 'resumeCountdown',
  ENDED:            'ended',
});

// Adjacency map: each state → the set of states it may directly enter.
// Enforced as console warnings (not hard errors) so unexpected hot-reloads don't lock the game.
export const TRANSITIONS = new Map([
  [S.HOME,             new Set([S.SAVE, S.SELECT, S.FLOW])],
  [S.SAVE,             new Set([S.HOME, S.FLOW])],
  [S.FLOW,             new Set([S.FLOW, S.MENU_EDIT, S.ENDED, S.HOME])],
  [S.MENU_EDIT,        new Set([S.FLOW, S.OVERVIEW, S.HOME])],
  [S.OVERVIEW,         new Set([S.MENU_EDIT, S.READY, S.HOME])],
  [S.SELECT,           new Set([S.HOME, S.READY])],
  [S.READY,            new Set([S.LEAD_IN, S.PAUSED])],
  [S.LEAD_IN,          new Set([S.PLAYING, S.PAUSED])],
  [S.PLAYING,          new Set([S.PAUSED, S.ENDED])],
  [S.PAUSED,           new Set([S.RESUME_COUNTDOWN, S.ENDED, S.SELECT, S.MENU_EDIT, S.HOME])],
  [S.RESUME_COUNTDOWN, new Set([S.PLAYING, S.PAUSED])],
  [S.ENDED,            new Set([S.HOME, S.FLOW, S.MENU_EDIT, S.READY, S.SELECT, S.ENDED])],
]);

export function assertTransition(from, to) {
  const allowed = TRANSITIONS.get(from);
  if (allowed && !allowed.has(to)) {
    console.warn(`[FSM] unexpected transition: ${from} → ${to}`);
  }
}
