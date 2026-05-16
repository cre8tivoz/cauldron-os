#!/usr/bin/env node
/**
 * Build status + cloud model smoke test.
 * Expects the dev server to be running on PORT/base URL.
 */
const assert = require('node:assert/strict');

const BASE = process.env.CAULDRON_TEST_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;

async function request(pathname, options = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { res, body, text };
}

(async () => {
  const home = await request('/');
  assert.equal(home.res.status, 200, 'home page should load');
  assert.match(home.text, /Build/, 'Build stage should be present in UI');
  assert.match(home.text, /cauldronApp/, 'AlpineJS app controller should be wired');
  assert.match(home.text, /gemini-3\\.1-flash-lite-preview/, 'Gemini Flash 3.1 Lite preview should be exposed in UI');
  assert.match(home.text, /gemini-3\\.1-pro-preview/, 'Gemini Pro 3.1 Preview should be exposed in UI');

  const models = await request('/api/cloud-models');
  assert.equal(models.res.status, 200, 'cloud model metadata endpoint should exist');
  assert.equal(models.body.success, true, 'cloud model metadata should succeed');
  assert.equal(models.body.gemini.defaultModel, 'gemini-3.1-flash-lite-preview', 'Gemini should default to Flash Lite preview');
  assert.ok(models.body.gemini.models.includes('gemini-3.1-pro-preview'), 'Gemini Pro preview should be accepted');

  const status = await request('/api/build-status');
  assert.equal(status.res.status, 200, 'build status endpoint should exist');
  assert.equal(status.body.success, true, 'build status should succeed');
  assert.ok(Array.isArray(status.body.projects), 'build status returns project array');
  assert.ok(status.body.summary.tracked >= 5, 'summary should count tracked projects');

  const dryResume = await request('/api/projects/funeral-mode/resume?dryRun=1', { method: 'POST', body: JSON.stringify({}) });
  assert.equal(dryResume.res.status, 200, 'resume dry-run should be available');
  assert.equal(dryResume.body.success, true, 'resume dry-run should succeed');
  assert.equal(dryResume.body.dryRun, true, 'resume dry-run should not launch OpenCode');
  assert.match(dryResume.body.command, /opencode/, 'resume dry-run should report opencode command');

  const dryVisible = await request('/api/projects/funeral-mode/open-visible?dryRun=1', { method: 'POST', body: JSON.stringify({}) });
  assert.equal(dryVisible.res.status, 200, 'visible OpenCode dry-run should be available');
  assert.equal(dryVisible.body.success, true, 'visible dry-run should succeed');
  assert.equal(dryVisible.body.dryRun, true, 'visible dry-run should not open Terminal');

  // Test build start endpoint (just validates it responds, no session needed)
  const buildStart = await request('/api/build/start', {
    method: 'POST',
    body: JSON.stringify({
      prompt: 'Smoke test build',
      model: 'gemini-3.1-flash-lite',
      sessionId: 'smoke-test-session',
      designReference: 'none',
      templateId: 'html-alpine',
      projectType: 'site',
    }),
  });
  assert.equal(buildStart.res.status, 200, 'build/start endpoint should exist');
  assert.equal(buildStart.body.success, true, 'build/start should succeed');
  assert.equal(buildStart.body.sessionId, 'smoke-test-session', 'build session ID should match');

  const buildFiles = await request('/api/build/files/smoke-test-session');
  assert.equal(buildFiles.res.status, 200, 'build/files endpoint should exist');
  assert.equal(buildFiles.body.success, true, 'build/files should succeed');
  assert.ok(Array.isArray(buildFiles.body.files), 'build/files returns array');

  const buildStatus = await request('/api/build/status/smoke-test-session');
  assert.equal(buildStatus.res.status, 200, 'build/status endpoint should exist');
  assert.equal(buildStatus.body.success, true, 'build/status should succeed');
  assert.equal(buildStatus.body.status.sessionId, 'smoke-test-session', 'status should return session info');

  console.log('✓ build status + build API + Gemini cloud models smoke test passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
