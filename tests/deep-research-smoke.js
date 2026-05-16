const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

function listen(server, port = 0) {
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server.address().port)));
}

function close(server) {
  return new Promise(resolve => server.close(resolve));
}

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
  const fixtureServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html>
      <html>
        <head>
          <style>
            :root { --brand-accent: #c1ff00; --panel-radius: 18px; }
            body { margin: 0; font-family: Georgia, serif; background: #10131b; color: #f7f8ef; }
            main { min-height: 100vh; display: grid; place-items: center; padding: 48px; }
            .hero { width: 720px; border-radius: var(--panel-radius); background: linear-gradient(135deg, #151924, #232a3a); box-shadow: 0 30px 80px rgba(0,0,0,.45); padding: 44px; border: 1px solid rgba(255,255,255,.12); }
            button { background: var(--brand-accent); color: #10131b; border: 0; border-radius: 999px; padding: 14px 20px; font-weight: 800; }
          </style>
        </head>
        <body><main><section class="hero"><h1>Deep Research Fixture</h1><p>Rendered design target.</p><button>Start</button></section></main></body>
      </html>`);
  });
  const fixturePort = await listen(fixtureServer);
  const fixtureUrl = `http://127.0.0.1:${fixturePort}/fixture`;

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-deep-research-'));
  const appPort = fixturePort + 1;
  const app = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(appPort), CAULDRON_DATA_DIR: tmp },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  app.stdout.on('data', chunk => output += chunk.toString());
  app.stderr.on('data', chunk => output += chunk.toString());

  try {
    await waitForServer(`http://127.0.0.1:${appPort}/api/health`);

    const res = await fetch(`http://127.0.0.1:${appPort}/api/research-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: fixtureUrl, mode: 'deep', projectName: 'deep-fixture' }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200, data.error || data.details || 'deep research request should succeed');
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.findings.mode, 'deep');
    assert.ok(data.findings.screenshotPath, 'deep research should return a screenshot path');
    assert.ok(fs.existsSync(data.findings.screenshotPath), 'screenshot should exist on disk');
    assert.ok(data.findings.screenshotUrl, 'deep research should expose a screenshot URL');
    assert.ok(data.findings.computedStyles.colors.includes('#c1ff00'), 'computed colors should include rendered brand accent');
    assert.ok(data.findings.computedStyles.fonts.some(font => font.toLowerCase().includes('georgia')), 'computed fonts should include rendered font family');

    const historyRes = await fetch(`http://127.0.0.1:${appPort}/api/research-history`);
    const history = await historyRes.json();
    assert.strictEqual(history.total, 1, 'deep research should persist to research history');
    assert.ok(history.research[0].findings.screenshotPath, 'history should preserve screenshot path');

    console.log('Deep research smoke tests passed');
  } finally {
    app.kill('SIGTERM');
    await close(fixtureServer);
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});