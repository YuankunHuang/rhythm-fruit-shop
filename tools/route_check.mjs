// Route check: every way the player can finish an order must have its own lines.
// node tools/route_check.mjs [--all] [--story30]   (gaps per day; --all also lists complete orders;
// --story30 checks the 30-day story being written in data/story30/)
// An order is a service_select or service followed by its score_branch, or a track_event. Its routes are:
// each drink the player can serve (wrong drinks need onWrong and byDrink when they are served), each
// way of playing unlocked by then (byStyle, or a legacy `style` branch), and the three score bands.
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (rel) => JSON.parse(readFileSync(new URL(rel, root), 'utf8').replace(/^﻿/, ''));
const MADE = ['swipe', 'chop', 'flow'];
const NAMES = { swipe: '划', chop: '切', flow: '流' };
const DIR = process.argv.includes('--story30') ? 'data/story30/' : 'data/flows/';
const days = readdirSync(new URL(DIR, root))
  .map((f) => /^day(\d+)\.json$/.exec(f))
  .filter(Boolean)
  .map((m) => +m[1])
  .sort((a, b) => a - b);

const showAll = process.argv.includes('--all');
const unlocked = new Set();
let gaps = 0,
  orders = 0;

const hasBands = (p) =>
  [88, 62, 0].every((min) => (p.branches || []).some((b) => !b.style && b.min === min && b.nodes?.length));
const styleCovered = (p, st) =>
  !!(p.byStyle && p.byStyle[st]) || (p.branches || []).some((b) => b.style === st);

for (const d of days) {
  const flow = read(`${DIR}day${d}.json`);
  const lines = [];
  let order = null;
  for (const p of flow.phases) {
    if (p.unlockInput) unlocked.add(p.unlockInput);
    const styles = p.inputs ? p.inputs.filter((x) => MADE.includes(x)) : [...unlocked];
    if (p.type === 'service_select') order = { who: p.customer, select: p, styles };
    else if (p.type === 'service') order = { who: p.id.replace(/^service_/, ''), select: null, styles };
    else if (p.type === 'score_branch' || p.type === 'track_event') {
      const o =
        p.type === 'track_event'
          ? { who: '曲目·' + (p.vipName || p.songId), select: null, styles: [...unlocked] }
          : order;
      if (!o) continue;
      orders++;
      const missing = [];
      if (!hasBands(p)) missing.push('分数档不全');
      o.styles.filter((st) => !styleCovered(p, st)).forEach((st) => missing.push(`打法「${NAMES[st]}」`));
      if (o.select) {
        const wrong = o.select.options.map((x) => x.songId).filter((s) => s !== o.select.correctId);
        const serves = o.select.allowRetry === false;
        wrong.forEach((s) => {
          if (!(o.select.onWrong && o.select.onWrong[s])) missing.push(`点错「${s}」的当场反应`);
          if (serves && !(p.byDrink && p.byDrink[s])) missing.push(`端上「${s}」后的反应`);
        });
        // `practice`: 柚子 playing a customer on day 1 corrects a wrong pick; that order stays a lesson.
        if (!serves && wrong.length && !o.select.practice) missing.push('点错仍要求重选（未开放端错饮品）');
      }
      gaps += missing.length;
      if (missing.length || showAll)
        lines.push(`  ${o.who}：${missing.length ? missing.join('，') : '齐了'}`);
      order = null;
    }
  }
  if (lines.length) console.log(`第 ${d} 天\n${lines.join('\n')}`);
}
console.log(`\n${orders} 单，缺口 ${gaps} 处。`);
process.exitCode = gaps ? 1 : 0;
