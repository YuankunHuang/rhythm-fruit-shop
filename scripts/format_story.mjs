// Rewrites the story JSON (data/flows/day*.json, data/story30/day*.json, data/dialogue/prologue.json) in the canonical layout
// from src/story/format.js, keeping each file's byte-order mark and line endings.
// Usage: node scripts/format_story.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { formatStoryJson } from '../src/story/format.js';

const root = new URL('../', import.meta.url);
const files = [
  'data/dialogue/prologue.json',
  ...readdirSync(new URL('data/flows/', root))
    .filter((f) => /^day\d+\.json$/.test(f))
    .map((f) => 'data/flows/' + f),
  // The 30-day story while it is written.
  ...readdirSync(new URL('data/story30/', root))
    .filter((f) => /^dayd+.json$/.test(f))
    .map((f) => 'data/story30/' + f),
];
for (const rel of files) {
  const url = new URL(rel, root),
    raw = readFileSync(url, 'utf8'),
    bom = raw.startsWith('﻿'),
    crlf = raw.includes('\r\n');
  let out = formatStoryJson(JSON.parse(raw.replace(/^﻿/, '')));
  if (crlf) out = out.replace(/\n/g, '\r\n');
  if (bom) out = '﻿' + out;
  if (out !== raw) {
    writeFileSync(url, out);
    console.log('formatted', rel);
  }
}
