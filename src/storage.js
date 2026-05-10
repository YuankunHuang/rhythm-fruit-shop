// localStorage 命名空间 + 存档读写。结构定义见 docs/save_schema.md。

export const APP_CACHE_VERSION = '2026-05-10v';
export const SAVE_SCHEMA_VERSION = 2;
export const SAVE_SLOT_COUNT = 3;

export const KEYS = Object.freeze({
  saveSlots:     'rfaSaveSlots',
  visualTheme:   'rfaVisualTheme',
  fallSpeed:     'rfaFallSpeed',
  noteGameplaySfx: 'rfaNoteGameplaySfx',
  prologueSeen:  'rfaPrologueSeen',
  resourceIntro: 'rfaResourceIntroSeen',
});

const INITIAL_LEARNED_SONGS_FALLBACK = ['tutorial'];

export function defaultPlayerSave(initialLearnedSongs = INITIAL_LEARNED_SONGS_FALLBACK) {
  return {
    day: 1,
    coins: 0,
    reputation: 0,
    rentDueDay: 7,
    rentAmount: 480,
    homeStage: 'apartment',
    readyForNextDay: false,
    totalShifts: 0,
    totalMoney: 0,
    firstShiftDone: false,
    upgrades: { cutter: 1, blender: 1, sign: 1 },
    currentMenu: [],
    learnedSongs: [...initialLearnedSongs],
    unlockHistory: [],
    tutorialSeen: {},
  };
}

const asArray = v => Array.isArray(v) ? v : [];
const asObject = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};

function normalizeUnlockHistory(raw) {
  return asArray(raw?.unlockHistory).filter(x => x && x.songId);
}

function normalizeLearnedSongs(raw, initialLearnedSongs) {
  const set = new Set(initialLearnedSongs);
  asArray(raw?.learnedSongs).forEach(id => set.add(id));
  normalizeUnlockHistory(raw).forEach(x => set.add(x.songId));
  return [...set];
}

export function normalizeSave(raw, initialLearnedSongs = INITIAL_LEARNED_SONGS_FALLBACK) {
  const base = defaultPlayerSave(initialLearnedSongs);
  if (!raw) return base;
  const DAY1_SHIFT_TUTORIAL_KEY = 'day1ShiftTutorial';
  const mergedTutorialSeen = { ...asObject(raw.tutorialSeen) };
  const firstShiftDone = !!(raw.firstShiftDone || mergedTutorialSeen[DAY1_SHIFT_TUTORIAL_KEY]);
  if (firstShiftDone && !mergedTutorialSeen[DAY1_SHIFT_TUTORIAL_KEY]) mergedTutorialSeen[DAY1_SHIFT_TUTORIAL_KEY] = 1;
  return {
    ...base,
    ...raw,
    firstShiftDone,
    upgrades: { ...base.upgrades, ...asObject(raw.upgrades) },
    currentMenu: asArray(raw.currentMenu),
    learnedSongs: normalizeLearnedSongs(raw, initialLearnedSongs),
    unlockHistory: normalizeUnlockHistory(raw),
    tutorialSeen: mergedTutorialSeen,
  };
}

export function cloneSave(s, initialLearnedSongs = INITIAL_LEARNED_SONGS_FALLBACK) {
  return normalizeSave(s || defaultPlayerSave(initialLearnedSongs), initialLearnedSongs);
}

function readSlot(slot, initialLearnedSongs) {
  if (!slot || slot.schemaVersion !== SAVE_SCHEMA_VERSION) return null;
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    updatedAt: slot.updatedAt || Date.now(),
    shopState: normalizeSave(slot.shopState, initialLearnedSongs),
  };
}

export function loadSaveSlots(initialLearnedSongs = INITIAL_LEARNED_SONGS_FALLBACK) {
  const empty = Array.from({ length: SAVE_SLOT_COUNT }, () => null);
  let raw = empty;
  try {
    const data = JSON.parse(localStorage.getItem(KEYS.saveSlots));
    if (Array.isArray(data)) raw = empty.map((_, i) => data[i] || null);
  } catch (_) { /* 损坏：使用空槽 */ }
  return raw.map(slot => readSlot(slot, initialLearnedSongs));
}

export function persistSaveSlots(slots) {
  try { localStorage.setItem(KEYS.saveSlots, JSON.stringify(slots)); } catch (_) {}
}

export function readVisualTheme() {
  try { return localStorage.getItem(KEYS.visualTheme) || ''; } catch (_) { return ''; }
}
export function saveVisualTheme(theme) {
  try { localStorage.setItem(KEYS.visualTheme, theme); } catch (_) {}
}

export function readFallSpeed(defaultIdx = 1) {
  try {
    const v = parseInt(localStorage.getItem(KEYS.fallSpeed) || String(defaultIdx + 1), 10);
    return Number.isFinite(v) ? v - 1 : defaultIdx;
  } catch (_) { return defaultIdx; }
}
export function saveFallSpeed(idx) {
  try { localStorage.setItem(KEYS.fallSpeed, String(idx + 1)); } catch (_) {}
}

/** 打歌时音符判定等音效；默认关闭（未写入则为 false）。 */
export function readNoteGameplaySfx() {
  try {
    return localStorage.getItem(KEYS.noteGameplaySfx) === '1';
  } catch (_) {
    return false;
  }
}

export function saveNoteGameplaySfx(enabled) {
  try {
    if (enabled) localStorage.setItem(KEYS.noteGameplaySfx, '1');
    else localStorage.removeItem(KEYS.noteGameplaySfx);
  } catch (_) {}
}

export function readPrologueSeen() {
  try { return localStorage.getItem(KEYS.prologueSeen) === '1'; } catch (_) { return false; }
}
export function savePrologueSeen() {
  try { localStorage.setItem(KEYS.prologueSeen, '1'); } catch (_) {}
}
export function clearPrologueSeen() {
  try { localStorage.removeItem(KEYS.prologueSeen); } catch (_) {}
}

export function readResourceIntroSeen() {
  try { return localStorage.getItem(KEYS.resourceIntro) === '1'; } catch (_) { return false; }
}
export function saveResourceIntroSeen() {
  try { localStorage.setItem(KEYS.resourceIntro, '1'); } catch (_) {}
}

export function clearAllGameData() {
  try { Object.values(KEYS).forEach(k => localStorage.removeItem(k)); } catch (_) {}
}

export function versionedUrl(src) {
  if (!src || /^(data:|blob:)/.test(src)) return src;
  return src + (src.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(APP_CACHE_VERSION);
}
