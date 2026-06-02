# Cauldron OS — Product Improvement Plan

**Date:** 2026-06-02
**Status:** Active
**Billy's directive:** Tidy up what we have, scope the deep search feature properly, don't lose focus.

---

## Context

Grok's old refactor doc was mostly structural line-count bullshit. This plan covers actual product improvements that make the tool better at its job: generating varied, high-quality website blueprints that meaningfully respond to design references.

---

## Completed

| Item | Status |
|------|--------|
| Reset Grok's uncommitted work, restore committed HEAD | Done |
| Phase 1: Extract lib/model-client.js + lib/research.js | Done + committed |
| Phase 2: Route extraction (14 route files + barrel) | Done + committed |
| server.js reduced 2298 → 686 lines | Verified |
| Design system injection fix (ensureDesignSystem return value now used) | Done + committed |
| QW-1: Refero UUID audit (all 14 checked against live API) | Done + committed |
| QW-2: Replace orphan styles + write rich prompt guidance | Done + committed |
| QW-3: Update getSystemPrompt() to use promptGuidance | Done + committed |
| All 5 smoke tests passing | Verified |

---

## Quick Wins (Remaining)

### QW-4: Trim Regular Design System List
**Problem:** 11 regular design systems (none, cursor, vercel, lovable, raycast, linear, stripe, notion, apple, figma, supabase, webflow, opencode) — some are redundant and produce similar outputs.

**Steps:**
1. Review the 11 names + their fetched DESIGN.md content
2. Flag near-duplicates (Cursor/Linear/Webflow all similar dark-mode SaaS)
3. Keep 6-8 strong distinct ones, remove the rest
4. Update DESIGN_SYSTEMS in server.js

**Definition of Done:** 6-8 distinct regular design systems, each producing visibly different output.

### QW-5: Handoff Smoke Test
**Problem:** Grok claimed handoff was "fundamentally broken" but we haven't verified.

**Steps:**
1. Hit POST /api/handoff with test blueprint
2. Verify files created on disk (blueprint.md, prototype.html, .opencode/config.md)
3. Check draft record created in DB
4. Document any breakage

**Definition of Done:** Handoff verified working or specific bugs documented.

---

## Medium-Term Feature: Refero Deep Search

**API findings (2026-06-02):**
- `https://styles.refero.design/api/styles` returns paginated JSON with 20 unique styles
- Each entry has: id (UUID), siteName, url, screenshotUrl, colorScheme, colors[], fonts[], northStar, managementSignals
- Pagination via `cursor` and `nextCursor` params
- `q=` parameter accepted but doesn't appear to filter results
- Screenshot images available at `https://images.refero.design/...`

**Feature design:**
1. **Backend:** New endpoint `GET /api/refero-search?q=<query>` that:
   - Proxies to Refero API
   - Returns matching style entries with UUID, name, screenshot URL, color data
   - Caches results for responsiveness
2. **Frontend:** Search input in design system selector that:
   - Shows results as selectable cards (name + color swatches + preview thumbnail)
   - Selected style flows into existing design reference injection
   - If no results, falls back to the hardcoded list

**Pre-requisites:** QW-1 (done) — we know the API works and has useful data.

**Estimated effort:** 3-5 hours (simple proxy endpoint + frontend search component)

---

## Success Criteria (Quick Wins Complete)

- Refero style list is 14 current, working API styles with rich prompt guidance ✓
- Each active Refero style produces visibly different output
- Regular design system list trimmed to distinct, strong options
- Handoff verified working
- All smoke tests still passing ✓

---

## Out of Scope (For Now)

- Splitting blueprint/prototype generation (bigger feature, separate plan)
- Log area CSS cleanup (frontend polish, low priority)
- Model selection UX improvements (nice-to-have, low priority)
- 3-panel layout revival (Billy: explicitly off the table)
