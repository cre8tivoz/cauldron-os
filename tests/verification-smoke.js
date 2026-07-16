const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { runVerification } = require('../lib/verification');
const { stopProcess } = require('./_process-cleanup');

const repoRoot = path.resolve(__dirname, '..');
const projectsRoot = path.join(repoRoot, 'projects');
const tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-verification-smoke-'));
const PORT = 3426;

const projectDirs = [];

function makeProject(name, files, manifest) {
  const projectPath = path.join(projectsRoot, name);
  fs.rmSync(projectPath, { recursive: true, force: true });
  fs.mkdirSync(projectPath, { recursive: true });
  projectDirs.push(projectPath);

  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(projectPath, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
  }

  fs.writeFileSync(
    path.join(projectPath, 'cauldron.project.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );
  return projectPath;
}

async function request(pathname, options = {}) {
  const res = await fetch(`http://127.0.0.1:${PORT}${pathname}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const body = await res.json();
  return { res, body };
}

async function waitForHealth() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Server did not become healthy');
}

(async () => {
  const passManifest = {
    schemaVersion: 1,
    source: 'cauldron-os',
    templateId: 'static-html',
    scaffold: {
      id: 'static-html',
      entrypoint: 'index.html',
      packageManager: null,
      commands: {},
      files: [
        { path: 'index.html', role: 'entry' },
        { path: 'styles.css', role: 'style' },
      ],
    },
  };

  const passProjectPath = makeProject(
    'verification-pass',
    {
      'index.html':
        '<!doctype html><html lang="en"><body><main><h1>Launch verified</h1><p>This project is ready for a local verification pass with meaningful structure and accessible controls.</p><img alt="demo" src="./logo.svg" /><button type="button" aria-label="Continue">Continue</button></main></body></html>',
      'styles.css': 'body { font-family: sans-serif; }',
      'logo.svg': '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    },
    passManifest
  );

  const passResult = await runVerification({ targetDir: passProjectPath });
  assert.equal(passResult.overall, 'PASS_WITH_WARNINGS');
  assert.equal(passResult.summary.failed, 0);
  assert.ok(passResult.summary.not_configured >= 1);
  assert.equal(passResult.checks.find((check) => check.id === 'entrypoint')?.status, 'passed');

  const failProjectPath = makeProject(
    'verification-fail',
    {
      'index.html':
        '<!doctype html><html><body><main><h1>TODO replace me</h1><script src="./missing.js"></script></main></body></html>',
      'styles.css': 'body { color: red; }',
    },
    passManifest
  );

  const failResult = await runVerification({ targetDir: failProjectPath });
  assert.equal(failResult.overall, 'BLOCKED');
  assert.equal(failResult.checks.find((check) => check.id === 'static-refs')?.status, 'failed');
  assert.equal(
    failResult.checks.find((check) => check.id === 'placeholder-copy')?.status,
    'failed'
  );

  const child = spawn(process.execPath, ['server.js'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(PORT),
      CAULDRON_DATA_DIR: tempDataDir,
      OLLAMA_BASE_URL: 'http://127.0.0.1:3999',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForHealth();

    const verifyResponse = await request('/api/build/verify', {
      method: 'POST',
      body: JSON.stringify({
        projectPath: passProjectPath,
        templateId: 'static-html',
      }),
    });

    assert.equal(verifyResponse.res.status, 200);
    assert.equal(verifyResponse.body.success, true);
    assert.equal(verifyResponse.body.verification.overall, 'PASS_WITH_WARNINGS');
    assert.ok(Array.isArray(verifyResponse.body.verification.checks));

    console.log('Verification smoke tests passed');
  } finally {
    await stopProcess(child);
    for (const dir of projectDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.rmSync(tempDataDir, { recursive: true, force: true });
  }
})().catch((err) => {
  console.error(err);
  for (const dir of projectDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.rmSync(tempDataDir, { recursive: true, force: true });
  process.exit(1);
});
