const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

function waitForServer(url, timeoutMs = 15000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch {}
      if (Date.now() - started > timeoutMs) return reject(new Error(`Timed out waiting for ${url}`));
      setTimeout(tick, 250);
    };
    tick();
  });
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-community-'));
  const probe = http.createServer((req, res) => res.end('ok'));
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const appPort = probe.address().port + 1;
  await new Promise(resolve => probe.close(resolve));

  const app = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(appPort), CAULDRON_DATA_DIR: tmp, CAULDRON_COMMUNITY_OFFLINE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer(`http://127.0.0.1:${appPort}/api/health`);

    const catalogRes = await fetch(`http://127.0.0.1:${appPort}/api/community`);
    const catalog = await catalogRes.json();
    assert.strictEqual(catalogRes.status, 200);
    assert.strictEqual(catalog.success, true);
    assert.ok(Array.isArray(catalog.designSystems), 'community design systems should be listed');
    assert.ok(Array.isArray(catalog.templates), 'community scaffold starters should be listed');
    assert.ok(catalog.submitUrl.includes('witchdaddylabs/cauldron-community'), 'submit URL should point to community repo');

    const importRes = await fetch(`http://127.0.0.1:${appPort}/api/community/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'design-system', id: 'community-neon-command' }),
    });
    const imported = await importRes.json();
    assert.strictEqual(importRes.status, 200, imported.details || imported.error);
    assert.strictEqual(imported.success, true);
    assert.strictEqual(imported.system.id, 'community-neon-command');
    assert.strictEqual(imported.system.source, 'community');

    const designSystemsRes = await fetch(`http://127.0.0.1:${appPort}/api/design-systems`);
    const designSystems = await designSystemsRes.json();
    assert.ok(
      designSystems.systems.some(system => system.id === 'community-neon-command' && system.source === 'community'),
      'imported community system should be selectable immediately',
    );

    const referenceRes = await fetch(`http://127.0.0.1:${appPort}/api/design-reference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: 'community-neon-command' }),
    });
    const reference = await referenceRes.json();
    assert.strictEqual(referenceRes.status, 200, reference.details || reference.error);
    assert.match(reference.content || '', /Neon Command/i, 'imported design markdown should be returned');

    const templateRes = await fetch(`http://127.0.0.1:${appPort}/api/community/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'template', id: 'community-next-dashboard' }),
    });
    const template = await templateRes.json();
    assert.strictEqual(templateRes.status, 200, template.details || template.error);
    assert.strictEqual(template.template.baseTemplateId, 'nextjs');
    assert.match(template.template.promptBias, /dashboard/i);

    console.log('Community catalog smoke tests passed');
  } finally {
    app.kill('SIGTERM');
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
