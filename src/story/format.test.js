import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { formatStoryJson } from './format.js';

const root = new URL('../../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, root), 'utf8').replace(/^﻿/, '');
const storyFiles = [
  'data/dialogue/prologue.json',
  ...readdirSync(new URL('data/flows/', root))
    .filter((f) => /^day\d+\.json$/.test(f))
    .map((f) => 'data/flows/' + f),
];

test('a line of dialogue sits on one line; nested structure is indented', () => {
  const out = formatStoryJson({
    id: 'd',
    slots: ['day', 'dusk'],
    nodes: [{ speaker: '柚子', text: '来了。' }],
  });
  assert.equal(
    out,
    '{\n  "id": "d",\n  "slots": ["day", "dusk"],\n  "nodes": [\n    { "speaker": "柚子", "text": "来了。" }\n  ]\n}\n',
  );
});

for (const rel of storyFiles) {
  test(`formatting keeps every value and is stable: ${rel}`, () => {
    const data = JSON.parse(read(rel)),
      once = formatStoryJson(data);
    assert.deepEqual(JSON.parse(once), data);
    assert.equal(formatStoryJson(JSON.parse(once)), once);
  });
}

test('story files are stored in the canonical layout', () => {
  for (const rel of storyFiles) {
    const text = read(rel).replace(/\r\n/g, '\n');
    assert.equal(text, formatStoryJson(JSON.parse(text)), `${rel}: run node scripts/format_story.mjs`);
  }
});
