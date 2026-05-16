#!/usr/bin/env node
/**
 * Private Cauldron records smoke test.
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
  assert.match(home.text, /id="recordsPanel"/, 'private records panel should exist in UI');
  assert.match(home.text, /id="importProjectsBtn"/, 'project-folder import button should exist in UI');
  assert.match(home.text, /loadRecordsDashboard/, 'records dashboard JS should be wired');

  const before = await request('/api/stats');
  assert.equal(before.res.status, 200, 'stats should load');
  assert.equal(before.body.success, true, 'stats response should be successful');

  const dryRun = await request('/api/projects/import?dryRun=1', { method: 'POST', body: JSON.stringify({}) });
  assert.equal(dryRun.res.status, 200, 'project import dry-run endpoint should exist');
  assert.equal(dryRun.body.success, true, 'project import dry-run should succeed');
  assert.ok(Array.isArray(dryRun.body.projects), 'dry-run should return project list');
  assert.ok(dryRun.body.projects.length >= 5, 'dry-run should find existing project folders');
  assert.ok(dryRun.body.projects.some(project => project.name === 'ghosted-social-club'), 'dry-run should include Ghosted Social Club');

  const importResult = await request('/api/projects/import', { method: 'POST', body: JSON.stringify({}) });
  assert.equal(importResult.res.status, 200, 'project import endpoint should succeed');
  assert.equal(importResult.body.success, true, 'project import should be successful');
  assert.ok(importResult.body.imported + importResult.body.skipped >= 5, 'project import should account for existing project folders');

  const drafts = await request('/api/drafts?q=ghosted');
  assert.equal(drafts.res.status, 200, 'draft search should load');
  assert.ok(drafts.body.drafts.some(draft => /ghosted/i.test(draft.project_name)), 'imported Ghosted draft should be searchable');

  console.log('✓ private records smoke test passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
