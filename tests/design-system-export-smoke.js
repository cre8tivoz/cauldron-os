const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { stopProcess } = require('./_process-cleanup');

const repoRoot = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-design-export-'));
const createdProjects = [];

function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch {}
      if (Date.now() - started > timeoutMs)
        return reject(new Error(`Timed out waiting for ${url}`));
      setTimeout(tick, 250);
    };
    tick();
  });
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

(async () => {
  const app = spawn(process.execPath, ['server.js'], {
    cwd: repoRoot,
    env: { ...process.env, PORT: '3428', CAULDRON_DATA_DIR: tmp },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer('http://127.0.0.1:3428/api/health');

    const withDesign = await postJson('http://127.0.0.1:3428/api/build-agents/run', {
      projectName: 'design-export-with-package',
      agentId: 'handoff',
      blueprint: '# Design export\n\nCreate a polished handoff.',
      prototypeHtml:
        '<main style="--surface:#f7f4ed;color:#1c1c1c;font-family:Inter, sans-serif;"><button style="border-radius:9999px;">Launch</button></main>',
      designReference: 'lovable',
      templateId: 'html-alpine',
      projectType: 'site',
      includeDesignPackage: true,
    });

    assert.equal(
      withDesign.res.status,
      200,
      withDesign.data.error || 'design package export should succeed'
    );
    createdProjects.push(withDesign.data.projectPath);

    const designMdPath = path.join(withDesign.data.projectPath, 'docs', 'design.md');
    const designHtmlPath = path.join(withDesign.data.projectPath, 'docs', 'design.html');
    assert.ok(fs.existsSync(designMdPath), 'docs/design.md should exist');
    assert.ok(fs.existsSync(designHtmlPath), 'docs/design.html should exist');

    const manifest = JSON.parse(fs.readFileSync(withDesign.data.manifestPath, 'utf8'));
    assert.equal(manifest.exports.designPackage.markdown, 'docs/design.md');
    assert.equal(manifest.exports.designPackage.html, 'docs/design.html');

    const designMd = fs.readFileSync(designMdPath, 'utf8');
    const designHtml = fs.readFileSync(designHtmlPath, 'utf8');
    for (const token of ['#f7f4ed', '#1c1c1c', '9999px']) {
      assert.ok(designMd.includes(token), `design.md should contain ${token}`);
      assert.ok(designHtml.includes(token), `design.html should contain ${token}`);
    }
    assert.ok(!designHtml.includes('<script src='), 'design.html should be self-contained');
    assert.ok(
      !designHtml.includes('<link rel='),
      'design.html should not require external stylesheets'
    );

    const withoutDesign = await postJson('http://127.0.0.1:3428/api/build-agents/run', {
      projectName: 'design-export-without-package',
      agentId: 'handoff',
      blueprint: '# No design export\n\nDefault handoff.',
      prototypeHtml: '<main><h1>No design package</h1></main>',
      designReference: 'none',
      templateId: 'static-html',
      projectType: 'site',
    });

    assert.equal(
      withoutDesign.res.status,
      200,
      withoutDesign.data.error || 'default export should succeed'
    );
    createdProjects.push(withoutDesign.data.projectPath);
    assert.ok(
      !fs.existsSync(path.join(withoutDesign.data.projectPath, 'docs')),
      'docs/ directory should not exist by default'
    );

    console.log('Design system export smoke tests passed');
  } finally {
    await stopProcess(app);
    fs.rmSync(tmp, { recursive: true, force: true });
    for (const projectPath of createdProjects) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
