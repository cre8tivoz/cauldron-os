const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'index.html'), 'utf8');

// New unified frontend structure
assert.match(html, /x-data="cauldronApp/, 'AlpineJS app should be wired');
assert.match(html, /Interrogate brief/, 'Interrogate button should exist');
assert.match(html, /Blueprint next/, 'Blueprint button should exist');
assert.match(html, /Build this/, 'Build stage button should exist');
assert.match(html, /Handoff to export/, 'Handoff to export button should exist');
assert.match(html, /Create project \+ OpenCode handoff/, 'OpenCode handoff button should exist');
assert.match(html, /stageModels/, 'Stage model routing should be configured');
assert.match(html, /Brain dump →/, 'Pipeline subtitle should reference brain dump');

console.log('Frontend static smoke tests passed');
