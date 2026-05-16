#!/usr/bin/env node
/**
 * Private Cauldron build status + Gemini model smoke test.
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
  assert.match(home.text, /id="buildStatusStrip"/, 'bottom live build status strip should exist');
  assert.match(home.text, /loadBuildStatus/, 'build status JS should be wired');
  assert.match(home.text, /gemini-3\.1-flash-lite/, 'Gemini Flash 3.1 Lite should be exposed in UI');
  assert.match(home.text, /gemini-3\.1-pro-preview/, 'Gemini Pro 3.1 Preview should be exposed in UI');

  const models = await request('/api/cloud-models');
  assert.equal(models.res.status, 200, 'cloud model metadata endpoint should exist');
  assert.equal(models.body.success, true, 'cloud model metadata should succeed');
  assert.equal(models.body.gemini.defaultModel, 'gemini-3.1-flash-lite', 'Gemini should default to Flash Lite');
  assert.ok(models.body.gemini.models.includes('gemini-3.1-pro-preview'), 'Gemini Pro preview should be accepted');

  const status = await request('/api/build-status');
  assert.equal(status.res.status, 200, 'build status endpoint should exist');
  assert.equal(status.body.success, true, 'build status should succeed');
  assert.ok(Array.isArray(status.body.projects), 'build status returns project array');
  assert.ok(status.body.projects.length >= 5, 'build status should scan existing project folders');
  assert.ok(status.body.summary.tracked >= 5, 'summary should count tracked projects');
  const funeral = status.body.projects.find(project => project.name === 'funeral-mode');
  assert.ok(funeral, 'funeral-mode should be tracked');
  assert.ok(['stalled', 'failed', 'needs_review', 'unknown', 'running', 'completed'].includes(funeral.status), 'status should be normalised');
  assert.ok(typeof funeral.logTail === 'string', 'status should include log tail string');

  const dryResume = await request('/api/projects/funeral-mode/resume?dryRun=1', { method: 'POST', body: JSON.stringify({}) });
  assert.equal(dryResume.res.status, 200, 'resume dry-run should be available');
  assert.equal(dryResume.body.success, true, 'resume dry-run should succeed');
  assert.equal(dryResume.body.dryRun, true, 'resume dry-run should not launch OpenCode');
  assert.match(dryResume.body.command, /opencode/, 'resume dry-run should report opencode command');

  const dryVisible = await request('/api/projects/funeral-mode/open-visible?dryRun=1', { method: 'POST', body: JSON.stringify({}) });
  assert.equal(dryVisible.res.status, 200, 'visible OpenCode dry-run should be available');
  assert.equal(dryVisible.body.success, true, 'visible dry-run should succeed');
  assert.equal(dryVisible.body.dryRun, true, 'visible dry-run should not open Terminal');

  console.log('✓ build status + Gemini smoke test passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
