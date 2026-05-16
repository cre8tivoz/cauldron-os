const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-research-history-'));
  process.env.CAULDRON_DATA_DIR = tmp;

  const db = require('../db');
  await db.init();

  const first = db.upsertResearchRecord({
    url: 'https://example.com/inspiration',
    source: 'url-sweep',
    projectName: 'neon-cafe-app',
    brainDump: 'Build a cafe finder inspired by https://example.com/inspiration',
    findings: {
      url: 'https://example.com/inspiration',
      fonts: ['Fraunces'],
      colors: ['#10131B', '#C1FF00'],
      cssVars: { '--accent': '#C1FF00' },
      structureNotes: ['Uses modern CSS layout (flex/grid)'],
    },
    formatted: '## Research Findings from https://example.com/inspiration',
  });

  assert.ok(first.id, 'research record should return an id');
  assert.strictEqual(first.reuse_count, 1, 'first insert starts reuse count at 1');

  const second = db.upsertResearchRecord({
    url: 'https://example.com/inspiration',
    source: 'url-sweep',
    projectName: 'another-app',
    brainDump: 'Reuse same inspiration',
    findings: {
      url: 'https://example.com/inspiration',
      fonts: ['Fraunces'],
      colors: ['#10131B'],
      cssVars: {},
      structureNotes: [],
    },
    formatted: 'same site again',
  });

  assert.strictEqual(second.id, first.id, 'same URL should reuse/cache the existing research record');
  assert.strictEqual(second.reuse_count, 2, 'reusing a URL increments reuse count');

  db.setResearchFavorite(first.id, true);

  const records = db.getResearchHistory({ limit: 10 });
  assert.strictEqual(records.length, 1, 'history should list one unique researched URL');
  assert.strictEqual(records[0].url, 'https://example.com/inspiration');
  assert.strictEqual(records[0].favorite, 1, 'favorite flag should be persisted');
  assert.strictEqual(records[0].reuse_count, 2, 'list should expose reuse count');
  assert.deepStrictEqual(records[0].findings.fonts, ['Fraunces'], 'findings JSON should hydrate back into objects');

  const favoriteRecords = db.getResearchHistory({ favoriteOnly: true });
  assert.strictEqual(favoriteRecords.length, 1, 'favorite-only filter should return favourited research');

  const count = db.countResearchHistory();
  assert.strictEqual(count, 1, 'research history count should count unique URL records');

  console.log('Research history smoke tests passed');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
