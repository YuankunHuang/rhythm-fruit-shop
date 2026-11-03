import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  weekday,
  nextRentDay,
  isRentDay,
  settleOrder,
  closeDay,
  payRent,
  addToShopLedger,
} from './ledger.js';

const rules = JSON.parse(readFileSync(new URL('../../data/ledger.json', import.meta.url), 'utf8'));
const order = (customer, wanted, served, score) => settleOrder({ customer, wanted, served, score }, rules);

test('the prologue is a Saturday and rent falls on every Saturday from day 7', () => {
  assert.equal(weekday(0), '六');
  assert.equal(weekday(1), '天');
  assert.equal(weekday(7), '六');
  assert.deepEqual(
    [1, 7, 8, 14, 29].map((d) => nextRentDay(d, rules)),
    [7, 7, 14, 14, 35],
  );
  assert.deepEqual(
    [6, 7, 14, 21, 28, 30].map((d) => isRentDay(d, rules)),
    [false, true, true, true, true, false],
  );
});

test('a customer pays for what they ordered; a pricier drink is the clerk’s treat', () => {
  const treat = order('林小末', 'lemon_water', 'grape_smoothie_still', 90);
  assert.equal(treat.paid, 6);
  assert.equal(treat.treat, 16);
  const cheaper = order('林小末', 'fruit_cup', 'lemon_water', 90);
  assert.equal(cheaper.paid, 6);
  assert.equal(cheaper.treat, 0);
  const pays = order('老宋', 'fruit_cup_quiet', 'grape_smoothie_still', 70);
  assert.equal(pays.paid, 22);
  assert.equal(pays.treat, 0);
});

test('regulars keep their habits: rounding up, six cups, another cup, role-play pays nothing', () => {
  assert.equal(order('老王', 'lemon_water', 'lemon_water', 70).change, 4);
  assert.equal(order('老王', 'lemon_water', 'lemon_water', 40).change, 0);
  assert.equal(order('程晚', 'grape_smoothie_smolder', 'grape_smoothie_smolder', 80).change, 0);
  assert.equal(order('程晚', 'grape_smoothie_smolder', 'grape_smoothie_smolder', 95).change, 3);
  const fang = order('老方', 'fruit_cup', 'fruit_cup', 90);
  assert.equal(fang.cups, 6);
  assert.equal(fang.paid, 90);
  assert.equal(order('阿晟', 'grape_smoothie_still', 'grape_smoothie_still', 92).again, true);
  assert.equal(order('阿晟', 'grape_smoothie_still', 'lemon_water', 92).again, false);
  assert.equal(order('柚子（扮演）', 'fruit_cup', 'fruit_cup', 95).cups, 0);
});

test('the wage slip lists every line and lands on the wallet', () => {
  const orders = [
    order('老王', 'lemon_water', 'lemon_water', 90),
    order('林小末', 'lemon_water', 'grape_smoothie_still', 90),
    order('猫小姐', 'lemon_water_light', 'lemon_water_light', 95),
  ];
  const slip = closeDay({ day: 5, wallet: 300, praisedWeeks: [] }, orders, rules);
  const labels = slip.lines.map((l) => `${l.label} ${l.amount}`);
  assert.deepEqual(labels, [
    '日薪 70',
    '提成 3 杯 9',
    '老王 “不用找了” 4',
    '林小末的葡萄冰沙 “算你请的” -16',
    '柚子 “今天不错” 10',
    '公交 -4',
    '晚饭 泡面 -4',
  ]);
  assert.equal(slip.net, 69);
  assert.equal(slip.wallet, 369);
  assert.equal(slip.praised, true);
  assert.equal(slip.takings, 18);
});

test('praise comes once a week, the prologue is half a day, dinner follows the money', () => {
  const good = [
    order('猫小姐', 'lemon_water_light', 'lemon_water_light', 95),
    order('焰子', 'citrus_fizz', 'citrus_fizz', 95),
  ];
  assert.equal(closeDay({ day: 3, praisedWeeks: [0] }, good, rules).praised, false);
  assert.equal(closeDay({ day: 8, praisedWeeks: [0] }, good, rules).praised, true);
  const pro = closeDay(
    { day: 0, prologue: true },
    [order('林小末', 'lemon_water', 'lemon_water', 90)],
    rules,
  );
  assert.equal(pro.lines[0].label, '试工半天');
  assert.equal(pro.lines.find((l) => l.label === '公交').amount, -2);
  assert.equal(pro.praised, false);
  const flush = closeDay({ day: 6, wallet: 600 }, good, rules);
  assert.equal(flush.lines.at(-1).label, '晚饭 盒饭');
  assert.equal(closeDay({ day: 6, wallet: 100 }, good, rules).lines.at(-1).label, '晚饭 泡面');
  assert.equal(
    closeDay({ day: 8, wallet: 100, rentPaid: true }, good, rules).lines.at(-1).label,
    '晚饭 盒饭',
  );
});

test('rent comes out of the wallet first, then savings', () => {
  assert.deepEqual(payRent({ wallet: 500, savings: 5200 }, rules), {
    wallet: 20,
    savings: 5200,
    fromSavings: 0,
    short: 0,
  });
  assert.deepEqual(payRent({ wallet: 430, savings: 5200 }, rules), {
    wallet: 0,
    savings: 5150,
    fromSavings: 50,
    short: 0,
  });
  assert.deepEqual(payRent({ wallet: 0, savings: 100 }, rules), {
    wallet: 0,
    savings: 0,
    fromSavings: 100,
    short: 380,
  });
});

test('the shop ledger adds takings and story income, and stays off until it is opened', () => {
  assert.equal(addToShopLedger(null, 50), null);
  const l = addToShopLedger({ target: 9000, raised: 1000 }, 60, [{ label: '存杯本', amount: 300 }]);
  assert.equal(l.raised, 1360);
  assert.equal(l.last.takings, 60);
});

test('a normal first week pays the rent with a little left; a poor one dips into savings', () => {
  // Real days have three to five orders; a normal player makes some cups well and some just fine.
  const week = (scores) => {
    let wallet = closeDay(
      { day: 0, prologue: true },
      [order('林小末', 'lemon_water', 'lemon_water', scores[1])],
      rules,
    ).wallet;
    const praisedWeeks = [];
    for (let day = 1; day <= 7; day++) {
      const day1 = day === 1 ? [order('柚子（扮演）', 'fruit_cup', 'fruit_cup', scores[0])] : [];
      const regular = ['猫小姐', '焰子', '顾薇'].map((who, i) =>
        order(who, 'lemon_water_light', 'lemon_water_light', scores[i]),
      );
      const slip = closeDay({ day, wallet, praisedWeeks }, day1.length ? day1 : regular, rules);
      if (slip.praised) praisedWeeks.push(slip.week);
      wallet = slip.wallet;
    }
    return payRent({ wallet, savings: rules.savings }, rules);
  };
  const normal = week([92, 80, 75]);
  assert.equal(normal.fromSavings, 0);
  assert.ok(normal.wallet > 0 && normal.wallet < 40, `left ${normal.wallet}`);
  assert.ok(week([95, 92, 90]).wallet > normal.wallet + 25);
  assert.ok(week([55, 60, 40]).fromSavings > 0);
});
