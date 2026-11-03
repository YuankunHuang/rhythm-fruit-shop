// The player's own money in story mode: daily wage slip, weekly rent, savings, and the shop's ledger.
// Pure: rules come from data/ledger.json, state is passed in. Design: docs/narrative/00_skeleton_v4.md §4.

const WEEKDAYS = ['天', '一', '二', '三', '四', '五', '六'];

/** "礼拜X" for a story day; the prologue (day 0) is a Saturday. */
export function weekday(day) {
  return WEEKDAYS[(((6 + day) % 7) + 7) % 7];
}

export function band(score) {
  return score >= 88 ? 'good' : score >= 62 ? 'ok' : 'bad';
}

/** The first rent day on or after `day` (rent falls every `every` days from day `first`). */
export function nextRentDay(day, rules) {
  const { first, every } = rules.rent;
  return day <= first ? first : first + Math.ceil((day - first) / every) * every;
}

export function isRentDay(day, rules) {
  return day >= 1 && nextRentDay(day, rules) === day;
}

const drink = (rules, id) => rules.drinks[id] || { name: id || '', price: 0 };

/**
 * What one served order means for the clerk. `order`: { customer, wanted, served, score }.
 * Most customers pay for what they ordered; a pricier drink they did not ask for is the clerk's treat.
 */
export function settleOrder(order, rules) {
  const who = rules.customers[order.customer] || {},
    b = band(order.score || 0),
    cups = who.roleplay ? 0 : who.cups || 1,
    wanted = drink(rules, order.wanted).price * cups,
    served = drink(rules, order.served).price * cups;
  let paid = wanted,
    treat = 0;
  if (served > wanted) {
    if (who.paysServed) paid = served;
    else treat = served - wanted;
  } else if (served < wanted) paid = served;
  const roundUpOk =
    who.roundUp && !treat && paid < who.roundUp && (who.roundUpBand === 'good' ? b === 'good' : b !== 'bad');
  return {
    ...order,
    band: b,
    cups,
    paid,
    treat,
    change: roundUpOk ? who.roundUp - paid : 0,
    again: !!(who.again && b === 'good' && order.served === order.wanted),
    againPrice: drink(rules, order.served).price,
  };
}

/**
 * Closes a day: the wage slip. Returns the slip lines (label, amount, kind) and the new wallet.
 * `state`: { day, wallet, praisedWeeks, rentPaid, prologue }; `orders`: settled orders.
 */
export function closeDay(state, orders, rules) {
  const { day, wallet = 0, praisedWeeks = [], rentPaid = false, prologue = false } = state,
    lines = [],
    add = (label, amount, kind = 'income') => lines.push({ label, amount, kind });
  add(prologue ? '试工半天' : '日薪', prologue ? rules.prologueWage : rules.wage);
  const sold = orders.reduce((n, o) => n + o.cups, 0),
    commission = orders.reduce((n, o) => n + (rules.commission[o.band] || 0) * o.cups, 0);
  if (sold) add(`提成 ${sold} 杯`, commission);
  for (const o of orders) {
    if (o.change) add(`${o.customer} “不用找了”`, o.change);
    if (o.again) add(`${o.customer} “再来一杯”`, rules.commission.good);
    if (o.treat) add(`${o.customer}的${drink(rules, o.served).name} “算你请的”`, -o.treat, 'expense');
  }
  const week = Math.floor((day - 1) / 7),
    scored = orders.filter((o) => !rules.customers[o.customer]?.roleplay),
    avg = scored.length ? scored.reduce((s, o) => s + (o.score || 0), 0) / scored.length : 0,
    praised =
      !prologue &&
      scored.length >= rules.praise.minOrders &&
      avg >= rules.praise.minAvg &&
      !praisedWeeks.includes(week);
  if (praised) add('柚子 “今天不错”', rules.praise.amount);
  add('公交', -(prologue ? rules.bus / 2 : rules.bus), 'expense');
  const beforeDinner = wallet + lines.reduce((s, l) => s + l.amount, 0),
    owed = rentPaid ? 0 : rules.rent.amount,
    [cheap, ...better] = rules.dinners,
    meal = better.filter((m) => beforeDinner - m.cost - owed >= m.margin).pop() || cheap;
  add(`晚饭 ${meal.name}`, -meal.cost, 'expense');
  const net = lines.reduce((s, l) => s + l.amount, 0);
  return {
    day,
    lines,
    net,
    wallet: wallet + net,
    praised,
    week,
    takings: orders.reduce((s, o) => s + o.paid, 0),
  };
}

/** Rent from the wallet; what the wallet cannot cover comes out of savings. */
export function payRent({ wallet = 0, savings = 0 }, rules) {
  const amount = rules.rent.amount;
  if (wallet >= amount) return { wallet: wallet - amount, savings, fromSavings: 0, short: 0 };
  const take = Math.min(savings, amount - wallet);
  return { wallet: 0, savings: savings - take, fromSavings: take, short: amount - wallet - take };
}

/** Adds a day's takings and any story income (`[{ label, amount }]`) to the shop's ledger. */
export function addToShopLedger(ledger, takings, extra = []) {
  if (!ledger) return null;
  const more = extra.reduce((s, x) => s + (x.amount || 0), 0);
  return { ...ledger, raised: (ledger.raised || 0) + takings + more, last: { takings, extra } };
}
