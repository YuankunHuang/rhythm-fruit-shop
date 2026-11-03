// localStorage 命名空间 + 存档读写。结构定义见 docs/save_schema.md。

import { ASSET_MAP } from './asset-map.js';

export const APP_CACHE_VERSION = '2026-05-10v';
export const SAVE_SCHEMA_VERSION = 2;
export const SAVE_SLOT_COUNT = 3;

export const KEYS = Object.freeze({
  saveSlots: 'rfaSaveSlots',
  visualTheme: 'rfaVisualTheme',
  fallSpeed: 'rfaFallSpeed',
  noteGameplaySfx: 'rfaNoteGameplaySfx',
  prologueSeen: 'rfaPrologueSeen',
  resourceIntro: 'rfaResourceIntroSeen',
});

/** `?story=30` plays the 30-day story while it is being written (data/story30/), with saves of its own. */
export const STORY_SET = (() => {
  try {
    return new URLSearchParams(location.search).get('story') === '30' ? 'story30' : '';
  } catch {
    return '';
  }
})();
const SAVE_SLOTS_KEY = STORY_SET ? `${KEYS.saveSlots}_${STORY_SET}` : KEYS.saveSlots;

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
    prologueDone: false,
    upgrades: { cutter: 1, blender: 1, sign: 1 },
    currentMenu: [],
    learnedSongs: [...initialLearnedSongs],
    unlockHistory: [],
    tutorialSeen: {},
    bossLettersSeen: [],
    inputs: [],
    wrongServed: {},
    // Story-mode money (src/core/ledger.js). `savings: null` means "not opened yet": the rules' starting savings.
    wallet: 0,
    savings: null,
    praisedWeeks: [],
    rentPaidDays: [],
    slipDay: -1,
    lastSlip: null,
    shopLedger: null,
  };
}

/** Ways of playing the story can unlock (see docs/input_modes.md). */
const INPUT_MODES = ['swipe', 'chop', 'flow'];
const asArray = (v) => (Array.isArray(v) ? v : []);
const asObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

function normalizeUnlockHistory(raw) {
  return asArray(raw?.unlockHistory).filter((x) => x && x.songId);
}

function normalizeLearnedSongs(raw, initialLearnedSongs) {
  const set = new Set(initialLearnedSongs);
  asArray(raw?.learnedSongs).forEach((id) => set.add(id));
  normalizeUnlockHistory(raw).forEach((x) => set.add(x.songId));
  return [...set];
}

export function normalizeSave(raw, initialLearnedSongs = INITIAL_LEARNED_SONGS_FALLBACK) {
  const base = defaultPlayerSave(initialLearnedSongs);
  if (!raw) return base;
  const DAY1_SHIFT_TUTORIAL_KEY = 'day1ShiftTutorial';
  const mergedTutorialSeen = { ...asObject(raw.tutorialSeen) };
  const firstShiftDone = !!(raw.firstShiftDone || mergedTutorialSeen[DAY1_SHIFT_TUTORIAL_KEY]);
  if (firstShiftDone && !mergedTutorialSeen[DAY1_SHIFT_TUTORIAL_KEY])
    mergedTutorialSeen[DAY1_SHIFT_TUTORIAL_KEY] = 1;
  const bossLettersSeen = asArray(raw?.bossLettersSeen).filter((x) => typeof x === 'string');
  const inputs = asArray(raw?.inputs).filter((x) => INPUT_MODES.includes(x));
  return {
    ...base,
    ...raw,
    firstShiftDone,
    // Saves from before this flag existed: anything past day 1's first shift has had its prologue.
    prologueDone: !!(raw.prologueDone || firstShiftDone || (raw.day || 1) > 1),
    upgrades: { ...base.upgrades, ...asObject(raw.upgrades) },
    wrongServed: asObject(raw.wrongServed),
    wallet: Number.isFinite(raw.wallet) ? raw.wallet : 0,
    savings: Number.isFinite(raw.savings) ? raw.savings : null,
    praisedWeeks: asArray(raw.praisedWeeks).filter(Number.isInteger),
    rentPaidDays: asArray(raw.rentPaidDays).filter(Number.isInteger),
    slipDay: Number.isInteger(raw.slipDay) ? raw.slipDay : -1,
    currentMenu: asArray(raw.currentMenu),
    learnedSongs: normalizeLearnedSongs(raw, initialLearnedSongs),
    unlockHistory: normalizeUnlockHistory(raw),
    tutorialSeen: mergedTutorialSeen,
    bossLettersSeen,
    inputs,
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
    const data = JSON.parse(localStorage.getItem(SAVE_SLOTS_KEY));
    if (Array.isArray(data)) raw = empty.map((_, i) => data[i] || null);
  } catch (_) {
    /* 损坏：使用空槽 */
  }
  return raw.map((slot) => readSlot(slot, initialLearnedSongs));
}

export function persistSaveSlots(slots) {
  try {
    localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots));
  } catch (_) {}
}

export function readVisualTheme() {
  try {
    return localStorage.getItem(KEYS.visualTheme) || '';
  } catch (_) {
    return '';
  }
}
export function saveVisualTheme(theme) {
  try {
    localStorage.setItem(KEYS.visualTheme, theme);
  } catch (_) {}
}

export function readFallSpeed(defaultIdx = 1) {
  try {
    const v = parseInt(localStorage.getItem(KEYS.fallSpeed) || String(defaultIdx + 1), 10);
    return Number.isFinite(v) ? v - 1 : defaultIdx;
  } catch (_) {
    return defaultIdx;
  }
}
export function saveFallSpeed(idx) {
  try {
    localStorage.setItem(KEYS.fallSpeed, String(idx + 1));
  } catch (_) {}
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
  try {
    return localStorage.getItem(KEYS.prologueSeen) === '1';
  } catch (_) {
    return false;
  }
}
export function savePrologueSeen() {
  try {
    localStorage.setItem(KEYS.prologueSeen, '1');
  } catch (_) {}
}
export function clearPrologueSeen() {
  try {
    localStorage.removeItem(KEYS.prologueSeen);
  } catch (_) {}
}

export function readResourceIntroSeen() {
  try {
    return localStorage.getItem(KEYS.resourceIntro) === '1';
  } catch (_) {
    return false;
  }
}
export function saveResourceIntroSeen() {
  try {
    localStorage.setItem(KEYS.resourceIntro, '1');
  } catch (_) {}
}

export function clearAllGameData() {
  try {
    [...Object.values(KEYS), SAVE_SLOTS_KEY].forEach((k) => localStorage.removeItem(k));
  } catch (_) {}
}

export function versionedUrl(src) {
  if (!src || /^(data:|blob:)/.test(src)) return src;
  src = ASSET_MAP[src] || src;
  return src + (src.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(APP_CACHE_VERSION);
}
