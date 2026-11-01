import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  availableMenus,
  canSupplyMenus,
  chooseDailyMenuIds,
  comboHeat,
  estimateIncome,
  goalStatus,
  heatBonusValue,
  makeDayStats,
  scaleResourceBag,
  shopLevel,
  shopStage,
  songProfile,
  upgradeBonus,
  upgradeCost,
} from './economy.js';

const upgrades = [{ id: 'cutter', baseBonus: 0.1, maxLv: 3, costs: [0, 200, 500] }];

test('shopLevel counts core upgrades at level 2+', () => {
  assert.equal(shopLevel({ upgrades: { cutter: 1, blender: 1, sign: 1 } }), 1);
  assert.equal(shopLevel({ upgrades: { cutter: 2, blender: 3, sign: 1 } }), 3);
  assert.equal(shopLevel({ upgrades: { cutter: 2, blender: 2, sign: 2 } }), 3);
  assert.equal(shopLevel({}), 1);
});

test('shopStage picks the highest stage reached', () => {
  const stages = [
    { id: 'a', minRep: 0 },
    { id: 'b', minRep: 50 },
    { id: 'c', minRep: 200 },
  ];
  assert.equal(shopStage(0, stages).id, 'a');
  assert.equal(shopStage(120, stages).id, 'b');
  assert.equal(shopStage(999, stages).id, 'c');
});

test('upgrade cost and bonus follow the catalog; max level costs Infinity', () => {
  assert.equal(upgradeCost({ cutter: 1 }, upgrades, 'cutter'), 200);
  assert.equal(upgradeCost({ cutter: 3 }, upgrades, 'cutter'), Infinity);
  assert.equal(upgradeCost({}, upgrades, 'missing'), Infinity);
  assert.equal(upgradeBonus({ cutter: 2 }, upgrades, 'cutter'), 0.2);
  assert.equal(upgradeBonus({}, upgrades, 'missing'), 0);
});

test('heat bonus rises with diminishing returns and is zero on failure', () => {
  assert.equal(heatBonusValue(0), 0);
  assert.ok(heatBonusValue(1000) < heatBonusValue(4000));
  assert.ok(heatBonusValue(1e9, 100) <= 280);
  assert.equal(heatBonusValue(5000, 90, true), 0);
  assert.equal(comboHeat(100), 50);
  assert.equal(comboHeat(10000), 70);
});

test('scaleResourceBag keeps positive entries at least 1', () => {
  assert.deepEqual(scaleResourceBag({ a: 1, b: 4, c: 0 }, 0.5), { a: 1, b: 2, c: 0 });
});

test('songProfile is deterministic per stage and id', () => {
  const day = songProfile({ id: 'lemon_water', stage: 'day', bpm: 118, duration: 32 });
  assert.equal(day.chunks, 2);
  assert.equal(day.juice, 1);
  assert.deepEqual(day, songProfile({ id: 'lemon_water', stage: 'day', bpm: 118, duration: 32 }));
  const night = songProfile({ id: 'x', stage: 'night', bpm: 160, duration: 200 });
  assert.equal(night.combo, 2);
  assert.equal(night.premium, 2);
});

const menus = [
  { id: 'cup', needs: { chunks: 2 } },
  { id: 'fizz', needs: { lime: 1 } },
  { id: 'grape', needs: { grape: 1 } },
  { id: 'critic', needs: { premium: 3 } },
];
const menuById = (id) => menus.find((m) => m.id === id);

test('availableMenus unlocks by reputation', () => {
  assert.equal(availableMenus(0, menus).length, 3);
  assert.equal(availableMenus(70, menus).length, 4);
  assert.equal(availableMenus(220, [...menus, { id: 'x' }]).length, 5);
});

test('canSupplyMenus searches song combinations within the slot limit', () => {
  const daySong = { id: 'a', stage: 'day' },
    duskSong = { id: 'b', stage: 'dusk' };
  assert.equal(canSupplyMenus([], [], 0, menuById), true);
  assert.equal(canSupplyMenus(['cup'], [daySong], 1, menuById), true);
  assert.equal(canSupplyMenus(['cup', 'fizz'], [daySong, duskSong], 2, menuById), true);
  assert.equal(canSupplyMenus(['critic'], [daySong, duskSong], 2, menuById), false);
});

test('chooseDailyMenuIds falls back to the first menu when nothing is suppliable', () => {
  assert.deepEqual(chooseDailyMenuIds(1, menus.slice(3), [], 1, menuById), ['critic']);
  assert.deepEqual(chooseDailyMenuIds(1, menus.slice(0, 3), [{ id: 'a', stage: 'day' }], 1, menuById), [
    'cup',
  ]);
});

test('goalStatus is complete only when money, menus and shifts all meet the plan', () => {
  const plan = { moneyGoal: 100, menuGoal: 1, shiftsTarget: 1 },
    stats = makeDayStats();
  assert.equal(goalStatus(plan, stats).complete, false);
  Object.assign(stats, { money: 150, shifts: 1, menuProgress: { cup: 1 }, ledger: [{ customer: 80 }] });
  assert.deepEqual(goalStatus(plan, stats), {
    money: true,
    menus: true,
    shifts: true,
    menuDone: 1,
    avg: 80,
    complete: true,
  });
});

test('estimateIncome combines base, products, heat and tip, scaled by difficulty', () => {
  const args = {
    stats: { notes: 0, holds: 0 },
    profile: { chunks: 1, juice: 0 },
    fit: 0,
    cutterBonus: 0,
    blenderBonus: 0,
    incomeMul: 1,
  };
  assert.equal(estimateIncome(args), 70 + 70 + 0 + 50);
  assert.equal(estimateIncome({ ...args, incomeMul: 2 }), 380);
});
