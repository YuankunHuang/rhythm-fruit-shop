// Story check: what the game needs from each day file, beyond the routes (tools/route_check.mjs).
// node tools/story_check.mjs [--story30]
// Speakers with a portrait use only drawn expressions; drinks, tracks and places exist; every order serves
// what was picked (allowRetry false, except a `practice` order); each score_branch follows an order; phone
// cards are well formed. With --story30 also the day's shape: a ticker, and the road or home after the
// settlement (docs/narrative/00_skeleton_v4.md §3).
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const text = (rel) => readFileSync(new URL(rel, root), 'utf8').replace(/^﻿/, '');
const story30 = process.argv.includes('--story30');
const DIR = story30 ? 'data/story30/' : 'data/flows/';

const main = text('src/main.js');
const chars = main.slice(main.indexOf('const VN_CHARACTERS = {'), main.indexOf('function vnCharacterKey'));
const exprs = {};
for (const m of chars.matchAll(/^ {2}([a-z_]+): \{[\s\S]*?(?=^ {2}[a-z_]+: \{|^\};)/gm))
  exprs[m[1]] = [...m[0].matchAll(/^\s+([a-z0-9_]+): lazyImage/gm)].map((x) => x[1]);
const vip = Object.fromEntries(
  [...main.matchAll(/^ {4}([一-龥]+): '([a-z_]+)',$/gm)].map((m) => [m[1], m[2]]),
);
const keyOf = (s = '') =>
  s.includes('柚子') ? 'yuzu' : s.includes('学生') || s === '林小末' ? 'student_girl' : vip[s] || '';
const places = new Set(
  [
    ...main
      .slice(main.indexOf('const SCENE_BACKDROPS = {'), main.indexOf('let sceneBackdropKey'))
      .matchAll(/^ {2}([a-z_]+):/gm),
  ].map((m) => m[1]),
);
const songs = new Set(JSON.parse(text('data/songs.json')).songs.map((s) => s.id));

let problems = 0;
const days = readdirSync(new URL(DIR, root))
  .map((f) => /^day(\d+)\.json$/.exec(f))
  .filter(Boolean)
  .map((m) => +m[1])
  .sort((a, b) => a - b);
for (const d of days) {
  const flow = JSON.parse(text(`${DIR}day${d}.json`)),
    out = [],
    say = (msg) => out.push('  ' + msg);
  const lines = (nodes, where) =>
    (Array.isArray(nodes) ? nodes : []).forEach((n, j) => {
      if (!n || typeof n !== 'object') return say(`${where}[${j}] is not a line`);
      if (n.phone) {
        if (!(n.phone.items || []).length) say(`${where}[${j}] phone card with no items`);
        (n.phone.items || []).forEach(
          (it) => !(it.from && it.text) && say(`${where}[${j}] phone item needs from and text`),
        );
      } else if (!n.text && !n.html && !n.action) say(`${where}[${j}] empty line`);
      const k = keyOf(n.character || n.speaker);
      if (k && n.expr && exprs[k] && !exprs[k].includes(n.expr))
        say(`${where}[${j}] ${n.speaker}: no "${n.expr}" picture (has ${exprs[k].join(', ')})`);
    });
  const layered = (v, where) =>
    Array.isArray(v)
      ? lines(v, where)
      : v && Object.entries(v).forEach(([b, ns]) => lines(ns, `${where}.${b}`));
  let order = false,
    settled = false,
    evening = false,
    ticker = false;
  flow.phases.forEach((p, i) => {
    const at = `${p.id || p.type}`;
    if (p.backdrop && !places.has(p.backdrop)) say(`${at}: unknown place "${p.backdrop}"`);
    if (p.ticker && p.ticker.length) ticker = true;
    lines(p.nodes, `${at}.nodes`);
    lines(p.nodes_before, `${at}.nodes_before`);
    lines(p.after, `${at}.after`);
    (p.branches || []).forEach((b, k) => lines(b.nodes, `${at}.branches[${k}]`));
    for (const layer of ['byDrink', 'byStyle'])
      Object.entries(p[layer] || {}).forEach(([x, v]) => layered(v, `${at}.${layer}.${x}`));
    Object.entries(p.onWrong || {}).forEach(([x, v]) => lines(v, `${at}.onWrong.${x}`));
    (p.nodes || []).forEach((n) => n.ticker && n.ticker.length && (ticker = true));
    if (p.type === 'service' && !songs.has(p.songId)) say(`${at}: no drink "${p.songId}"`);
    if (p.type === 'track_event' && !songs.has(p.songId)) say(`${at}: no track "${p.songId}"`);
    if (p.type === 'service_select') {
      (p.options || []).forEach((o) => !songs.has(o.songId) && say(`${at}: no drink "${o.songId}"`));
      if (!(p.options || []).some((o) => o.songId === p.correctId))
        say(`${at}: the wanted drink is not an option`);
      if (story30 && p.allowRetry !== false && !p.practice)
        say(`${at}: a wrong pick must be served (allowRetry false)`);
      if (story30 && (p.options || []).length < 3) say(`${at}: fewer than three options`);
    }
    if (p.type === 'service' || p.type === 'service_select') order = true;
    if (p.type === 'score_branch') {
      if (!order) say(`${at}: a reaction with no order before it`);
      order = false;
    }
    if (p.type === 'settlement') settled = true;
    else if (settled && p.type === 'dialogue' && p.backdrop) evening = true;
  });
  if (story30 && !ticker) say('no ticker anywhere in the day');
  if (story30 && !evening) say('no road or home after the settlement (a dialogue with a backdrop)');
  problems += out.length;
  if (out.length) console.log(`第 ${d} 天\n${out.join('\n')}`);
}
console.log(`\n${days.length} 天，问题 ${problems} 处。`);
process.exitCode = problems ? 1 : 0;
