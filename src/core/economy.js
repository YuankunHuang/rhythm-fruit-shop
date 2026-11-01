// Shop economy and daily planning. Pure: every input is passed in, nothing reads globals.
// A "bag" is a resource tally such as { chunks: 2, juice: 1, apple: 1 }.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function makeResourceBag() {
  return { chunks: 0, juice: 0, combo: 0, apple: 0, orange: 0, lime: 0, grape: 0, premium: 0, sparkle: 0 };
}

export function makeDayStats() {
  return {
    shifts: 0,
    money: 0,
    rep: 0,
    best: 0,
    products: 0,
    orders: 0,
    misses: 0,
    resources: makeResourceBag(),
    menuProgress: {},
    goalBonus: 0,
    ledger: [],
    summaryCelebrated: false,
  };
}

export function addBag(a, b, mul = 1) {
  for (const k in b) a[k] = (a[k] || 0) + b[k] * mul;
  return a;
}

/** Scales positive entries in place, never below 1. */
export function scaleResourceBag(bag, mul = 1) {
  if (mul === 1) return bag;
  for (const k in bag) if (bag[k] > 0) bag[k] = Math.max(1, Math.round(bag[k] * mul));
  return bag;
}

/** 1 + number of the three core upgrades at level 2 or more, capped at 3. */
export function shopLevel(state) {
  const upgraded = ['cutter', 'blender', 'sign'].filter(
    (id) => ((state.upgrades || {})[id] || 1) >= 2,
  ).length;
  return Math.min(3, 1 + upgraded);
}

export function shopStage(reputation, stages) {
  let s = stages[0];
  for (const st of stages) if (reputation >= st.minRep) s = st;
  return s;
}

export function upgradeBonus(levels, catalog, id) {
  const u = catalog.find((x) => x.id === id);
  return u ? (levels[id] || 1) * u.baseBonus : 0;
}

export function upgradeCost(levels, catalog, id) {
  const u = catalog.find((x) => x.id === id);
  if (!u) return Infinity;
  const lv = levels[id] || 1;
  return lv >= u.maxLv ? Infinity : u.costs[lv];
}

export function comboHeat(combo, scale = 1) {
  return Math.min(70, Math.floor(Math.sqrt(Math.max(0, combo)) * 5 * scale));
}

/** Diminishing-returns bonus for accumulated heat, scaled by customer score. */
export function heatBonusValue(value, customer = 85, failed = false) {
  if (failed) return 0;
  const cap = 280,
    scale = 2200,
    quality = clamp(customer / 100, 0.55, 1.08);
  return Math.round(cap * (1 - Math.exp(-Math.max(0, value) / scale)) * quality);
}

export function expectedShiftIncome(day, slots) {
  return Math.round(slots * (360 + day * 65));
}

export function estimateIncome({ stats, profile, fit, cutterBonus, blenderBonus, incomeMul }) {
  const basePay = 70,
    productPay = Math.round(
      (profile.chunks || 0) * 70 * (1 + cutterBonus) + (profile.juice || 0) * 95 * (1 + blenderBonus),
    ),
    heatPay = heatBonusValue(stats.notes * 9 + stats.holds * 36 + fit * 45, 86, false),
    tip = 50;
  return Math.round((basePay + productPay + heatPay + tip) * incomeMul);
}

/** Resources a song yields: a base set per stage, one id-derived fruit, tempo and length extras. */
export function songProfile(song, resourceMul = 1) {
  const bag = makeResourceBag(),
    stage = song.stage || 'day',
    id = song.id || song.title;
  if (stage === 'day') addBag(bag, { chunks: 2, juice: 1, apple: 1, orange: 1 });
  else if (stage === 'dusk') addBag(bag, { chunks: 2, juice: 2, combo: 1, lime: 1, orange: 1 });
  else if (stage === 'night') addBag(bag, { juice: 2, combo: 1, grape: 1, premium: 1, sparkle: 1 });
  else addBag(bag, { juice: 2, combo: 2, premium: 2, sparkle: 1 });
  const fruits = ['apple', 'orange', 'lime', 'grape'];
  const extra = fruits[Math.abs([...id].reduce((n, ch) => n + ch.charCodeAt(0), 0)) % fruits.length];
  bag[extra] = (bag[extra] || 0) + 1;
  if ((song.bpm || 0) > 145) bag.combo++;
  if ((song.duration || 0) > 180) bag.premium++;
  return scaleResourceBag(bag, resourceMul);
}

/** Three menus to start, four from 70 reputation, all from 220. */
export function availableMenus(reputation, menuItems) {
  const count = reputation >= 220 ? menuItems.length : reputation >= 70 ? 4 : 3;
  return menuItems.slice(0, count);
}

export function songFitScore(song, plan, menuById, resourceMul = 1) {
  if (!plan) return 0;
  const bag = songProfile(song, resourceMul);
  let score = 0;
  for (const id of plan.menuIds) {
    const m = menuById(id);
    for (const k in m.needs) score += (bag[k] || 0) * m.needs[k];
  }
  if (plan.focus && bag[plan.focus]) score += 2;
  if (plan.stageHint === song.stage) score += 1;
  return score;
}

export function songSetBag(songs, resourceMul = 1) {
  const bag = makeResourceBag();
  songs.forEach((s) => addBag(bag, songProfile(s, resourceMul)));
  return bag;
}

export function menuNeedsSatisfied(menuIds, bag, menuById) {
  return menuIds.every((id) =>
    Object.entries(menuById(id).needs || {}).every(([k, v]) => (bag[k] || 0) >= v),
  );
}

/** Whether some set of at most `limit` songs yields every resource the menus need. */
export function canSupplyMenus(menuIds, songs, limit, menuById, resourceMul = 1) {
  if (!menuIds.length) return true;
  if (!songs.length || limit <= 0) return false;
  let ok = false;
  function pick(start, left, chosen) {
    if (ok) return;
    if (menuNeedsSatisfied(menuIds, songSetBag(chosen, resourceMul), menuById)) {
      ok = true;
      return;
    }
    if (left <= 0) return;
    for (let i = start; i < songs.length; i++) pick(i + 1, left - 1, chosen.concat(songs[i]));
  }
  pick(0, Math.min(limit, songs.length), []);
  return ok;
}

/** Rotates the menu list by day and keeps the first suppliable ones (one menu, two from day 3). */
export function chooseDailyMenuIds(day, menus, songs, slotCount, menuById, resourceMul = 1) {
  const ordered = menus.map((m, i) => menus[(i + day - 1) % menus.length]),
    target = Math.max(1, Math.min(slotCount, day >= 3 ? 2 : 1, menus.length)),
    supplies = (ids) => canSupplyMenus(ids, songs, slotCount, menuById, resourceMul);
  const ids = [];
  for (const m of ordered) {
    const next = ids.concat(m.id);
    if (supplies(next)) {
      ids.push(m.id);
      if (ids.length >= target) break;
    }
  }
  if (!ids.length) ids.push((menus.find((m) => supplies([m.id])) || menus[0]).id);
  return ids;
}

export function goalStatus(plan, dayStats) {
  const menuDone = Object.values(dayStats.menuProgress || {}).reduce((a, b) => a + b, 0),
    avg = dayStats.shifts
      ? Math.round(dayStats.ledger.reduce((s, r) => s + r.customer, 0) / dayStats.shifts)
      : 0,
    money = dayStats.money >= plan.moneyGoal,
    menus = menuDone >= plan.menuGoal,
    shifts = dayStats.shifts >= plan.shiftsTarget;
  return { money, menus, shifts, menuDone, avg, complete: money && menus && shifts };
}
