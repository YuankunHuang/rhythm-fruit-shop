// 启动时并行 fetch 所有 data/*.json，挂到 GameData 单例上。

import { versionedUrl } from '../storage.js';

export const GameData = {
  songs: [],
  difficulties: [],
  serviceDiff: null,
  windows: { perfect: 0.095, great: 0.135, good: 0.190, miss: 0.240 },
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
  const [songs, diffs, menus, shop, plans, prologue, bossLetters] = await Promise.all([
    fetchJson('data/songs.json'),
    fetchJson('data/difficulties.json'),
    fetchJson('data/menu_items.json'),
    fetchJson('data/shop.json'),
    fetchJson('data/day_plans.json'),
    fetchJson('data/dialogue/prologue.json'),
    fetchJson('data/boss_letters.json'),
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

  GameData.prologue = prologue || GameData.prologue;

  GameData.bossLetters = (bossLetters && bossLetters.letters) || [];

  return GameData;
}

export const menuById = (id) =>
  GameData.menuItems.find(m => m.id === id) || GameData.menuItems[0];

export const dayPlanConfig = (day) =>
  GameData.dayPlans.find(p => p.day === day) || GameData.dayPlans[GameData.dayPlans.length - 1];

export const dayUnlockEntries = (day) =>
  GameData.dayUnlocks.filter(x => x.day === day);

export const slotUnlockDay = (slotId) => {
  const p = GameData.dayPlans.find(x => (x.slots || []).includes(slotId));
  return p ? p.day : 1;
};

export async function loadDayFlow(day) {
  try {
    const res = await fetch(versionedUrl(`data/flows/day${day}.json`), { cache: 'reload' });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}
