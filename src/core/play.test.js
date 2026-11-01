// Replays every shipped chart with a press exactly on each note and checks the judgement
// path end to end on real data: chart -> notes -> hit target -> timing grade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { buildNotes } from './chart.js';
import { judgeTiming, pickHitTarget } from './judge.js';

const root = new URL('../../', import.meta.url);
const { windows } = JSON.parse(readFileSync(new URL('data/difficulties.json', root), 'utf8'));
const chartFiles = ['service', 'tracks']
  .map((dir) => new URL(`charts/${dir}/`, root))
  .filter((dir) => existsSync(dir))
  .flatMap((dir) => readdirSync(dir).map((f) => new URL(f, dir)));

for (const file of chartFiles) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  for (const [diffId, chart] of Object.entries(data.charts)) {
    if (!chart.length) continue;
    test(`perfect run: ${data.id} [${diffId}]`, () => {
      const notes = buildNotes(chart, { travel: 2, fruits: ['f'] });
      for (const n of notes) {
        const target = pickHitTarget(notes, n.time, windows, 2);
        assert.ok(target, `no target for note ${n.id} at ${n.time}`);
        assert.equal(target.n, n, `note ${n.id} lost to note ${target.n.id}`);
        assert.equal(judgeTiming(target.err, windows).name, 'Perfect');
        n.state = 'hit';
      }
    });
  }
}
