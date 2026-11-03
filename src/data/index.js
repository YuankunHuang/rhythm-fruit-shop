// 启动时并行 fetch 所有 data/*.json，挂到 GameData 单例上。

import { versionedUrl, STORY_SET } from '../storage.js';

export const GameData = {
  songs: [],
  difficulties: [],
  serviceDiff: null,
  windows: { perfect: 0.095, great: 0.135, good: 0.19, miss: 0.24 },
  fruits: [],
  speeds: [],
  chartLevelBands: {},

  resourceLabels: {},
  menuItems: [],

  upgrades: [],
  shopStages: [],
  timeSlots: [],
  stageLabels: {},
  ambientMusic: { homeLoop: '', subLoop: '' },

  bossLetters: [],

  /** Story-mode money (data/ledger.json); the story runs from day 1 to `storyDays`. */
  ledger: null,
  storyDays: 0,

  firstDaySongs: [],
  dayPlans: [],
  dayUnlocks: [],

  prologue: { opening: [], afterService: { branches: { good: [], ok: [], bad: [] }, shared: [] } },
};

async function fetchJson(path) {
  const res = await fetch(versionedUrl(path), { cache: 'reload' });
  if (!res.ok) throw new Error(`failed to load ${path}: ${res.status}`);
  return res.json();
}

export async function loadGameData() {
  const [songs, diffs, menus, shop, plans, prologue, bossLetters, ledger] = await Promise.all([
    fetchJson('data/songs.json'),
    fetchJson('data/difficulties.json'),
    fetchJson('data/menu_items.json'),
    fetchJson('data/shop.json'),
    fetchJson('data/day_plans.json'),
    fetchJson('data/dialogue/prologue.json'),
    fetchJson('data/boss_letters.json'),
    fetchJson('data/ledger.json'),
  ]);

  GameData.songs = songs.songs || [];
  GameData.difficulties = diffs.difficulties || [];
  GameData.serviceDiff = diffs.service || null;
  GameData.windows = diffs.windows || GameData.windows;
  GameData.fruits = diffs.fruits || [];
  GameData.speeds = diffs.speeds || [];
  GameData.chartLevelBands = diffs.chartLevelBands || {};

  GameData.resourceLabels = menus.resourceLabels || {};
  GameData.menuItems = menus.menuItems || [];

  GameData.upgrades = shop.upgrades || [];
  GameData.shopStages = shop.stages || [];
  GameData.timeSlots = shop.timeSlots || [];
  GameData.stageLabels = shop.stageLabels || {};
  GameData.ambientMusic = shop.ambientMusic || GameData.ambientMusic;

  GameData.firstDaySongs = plans.firstDaySongs || [];
  GameData.dayPlans = plans.plans || [];
  GameData.dayUnlocks = plans.unlocks || [];
  GameData.storyDays = plans.storyDays || 0;
  // The 30-day story while it is being written: its days so far (data/story30/index.json).
  if (STORY_SET) GameData.storyDays = (await fetchJson(`data/${STORY_SET}/index.json`)).storyDays || 0;
  GameData.ledger = ledger;

  GameData.prologue = prologue || GameData.prologue;

  GameData.bossLetters = (bossLetters && bossLetters.letters) || [];

  return GameData;
}

export const menuById = (id) => GameData.menuItems.find((m) => m.id === id) || GameData.menuItems[0];

export const dayPlanConfig = (day) =>
  GameData.dayPlans.find((p) => p.day === day) || GameData.dayPlans[GameData.dayPlans.length - 1];

export const dayUnlockEntries = (day) => GameData.dayUnlocks.filter((x) => x.day === day);

export const slotUnlockDay = (slotId) => {
  const p = GameData.dayPlans.find((x) => (x.slots || []).includes(slotId));
  return p ? p.day : 1;
};

export async function loadDayFlow(day) {
  try {
    const res = await fetch(versionedUrl(`data/${STORY_SET || 'flows'}/day${day}.json`), { cache: 'reload' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
