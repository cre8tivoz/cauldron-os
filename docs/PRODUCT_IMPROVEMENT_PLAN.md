# Cauldron OS — Product Improvement Plan

**Date:** 2026-06-02
**Status:** Active
**Billy's directive:** Tidy up what we have, scope the deep search feature properly, don't lose focus.

---

## Context

Grok's refactor doc (REFACTOR_EXECUTION_PLAN.md) was mostly structural line-count bullshit. This plan covers actual product improvements that make the tool better at its job: generating varied, high-quality website blueprints that meaningfully respond to design references.

---

## Recently Done

| Item | Status |
|------|--------|
| Reset Grok's uncommitted work, restore committed HEAD | Done |
| Phase 1: Extract lib/model-client.js + lib/research.js | DONE + committed |
| Phase 2: Route extraction (14 route files + barrel) | DONE + committed |
| Design system injection fix (ensureDesignSystem return value now used) | DONE + committed |
| server.js reduced 2298 → 686 lines | Verified |
| All 5 smoke tests passing | Verified |

---

## Quick Wins (Next Session)

### QW-1: Audit Refero Style UUIDs
**Problem:** 15 Refero styles spread into DESIGN_SYSTEMS but none have `repo` — so they get zero content injection. Some UUIDs might be dead or point to trash styles.

**Steps:**
1. Hit `https://styles.refero.design/style/<uuid>` for all 15 UUIDs
2. Record which return valid content vs 404/empty
3. Remove or disable dead ones
4. Keep list with name + confirmed working status

**Definition of Done:** Dead styles removed. Working list documented.

### QW-2: Write Proper Prompt Guidance for Remaining Refero Styles
**Problem:** Refero styles can't fetch a DESIGN.md (no repo), so they rely entirely on name-based prompting — which is weak.

**Steps:**
1. For each surviving Refero style from QW-1, write a 2-3 sentence prompt block describing:
   - Visual aesthetic (colors, mood, typography feel)
   - Typical use case
   - Key differentiator from other styles
2. Inject into system prompt when that style is selected (replacing the bare name injection)
3. Test that selecting different Refero styles produces visibly different outputs

**Definition of Done:** Each active Refero style has custom prompt text. Style selection meaningfully affects output.

### QW-3: Trim Regular Design System List
**Problem:** 11 regular design systems (none, cursor, vercel, lovable, raycast, linear, stripe, notion, apple, figma, supabase, webflow, opencode) — some are redundant (Cursor/Linear/Webflow all produce similar dark-mode SaaS).

**Steps:**
1. Review the 11 names + their fetched DESIGN.md content
2. Flag near-duplicates that produce similar outputs
3. Keep 6-8 strong distinct ones, remove the rest
4. Update DESIGN_SYSTEMS in server.js

**Definition of Done:** 6-8 distinct regular design systems, each producing visibly different output.

### QW-4: Handoff Smoke Test
**Problem:** Grok claimed handoff was "fundamentally broken" but we haven't verified.

**Steps:**
1. Hit POST /api/handoff with test blueprint
2. Verify files created on disk (blueprint.md, prototype.html, .opencode/config.md)
3. Check draft record created in DB
4. Document any breakage

**Definition of Done:** Handoff verified working or specific bugs documented.

---

## Medium-Term Feature: Refero Deep Search

**Problem:** Users have to pick from a hardcoded list of Refero styles. Better: let them describe what they want (or paste a URL) and search the Refero API for matching styles.

**Scope:**
1. Research Refero API endpoints for search/filter (check refero.design for available APIs or scrape approach)
2. Backend: New endpoint `GET /api/refero-search?q=<query>` that returns matching styles
3. Frontend: Search input in design system selector; results shown as selectable cards (name + preview image if available)
4. Selected style flows into existing design reference prompt injection unchanged

**Estimated effort:** 4-6 hours (frontend + backend, depends on API availability)

**Pre-requisites:** QW-1 (know which styles actually work)

---

## Success Criteria (Quick Wins)

-Refero style list cleaned to only working entries
- Each active Refero style produces visibly different output
- Regular design system list trimmed to distinct, strong options
- Handoff verified working
- All smoke tests still passing after changes

---

## Out of Scope (For Now)

- Splitting blueprint/prototype generation (bigger feature, separate plan)
- Log area CSS cleanup (frontend polish, low priority)
- Model selection UX improvements (nice-to-have, low priority)
- 3-panel layout revival (Billy: explicitly off the table)
