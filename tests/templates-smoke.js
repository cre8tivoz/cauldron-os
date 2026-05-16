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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-templates-'));
  const probe = http.createServer((req, res) => res.end('ok'));
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const appPort = probe.address().port + 1;
  await new Promise(resolve => probe.close(resolve));

  const app = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(appPort), CAULDRON_DATA_DIR: tmp },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer(`http://127.0.0.1:${appPort}/api/health`);
    const res = await fetch(`http://127.0.0.1:${appPort}/api/templates`);
    const data = await res.json();
    assert.strictEqual(res.status, 200, data.error || 'templates endpoint should succeed');
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.templates), 'templates response should include templates array');

    const alpine = data.templates.find(template => template.id === 'html-alpine');
    assert.ok(alpine, 'HTML + AlpineJS template should be first-class');
    assert.strictEqual(alpine.name, 'HTML + AlpineJS');
    assert.strictEqual(alpine.projectType, 'prototype');
    assert.strictEqual(alpine.scaffold, 'html-alpine');
    assert.ok(alpine.files.includes('index.html'));
    assert.ok(alpine.files.includes('styles.css'));
    assert.ok(alpine.promptBias.toLowerCase().includes('alpinejs'));
    assert.ok(data.defaultTemplateId, 'response should expose a default template id');

    console.log('Templates smoke tests passed');
  } finally {
    app.kill('SIGTERM');
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
