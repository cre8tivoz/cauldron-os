# Cauldron OS — Product Improvement Plan

**Date:** 2026-06-02
**Status:** All core flows working

---

## What's Done

| Item | Status |
|------|--------|
| Reset Grok's mess, restore committed HEAD | Done |
| Phase 1: Extract lib/model-client.js + lib/research.js | Done |
| Phase 2: Route extraction (14 route files + barrel) | Done |
| Design system injection fix (ensureDesignSystem return value used) | Done |
| QW-1: Refero UUID audit | Done |
| QW-2: Replace orphan styles + rich prompt guidance | Done |
| QW-3: Update getSystemPrompt() to use promptGuidance | Done |
| QW-4: Trim regular design system list (10 distinct) | Done |
| QW-5: Handoff fix + comprehensive smoke test (9 tests) | Done |
| Blueprint/Prototype split (editable blueprint + separate prototype gen) | Done |
| Handoff/Export flow: prototype included, build uses blueprint, UI buttons | Done |
| All 6 smoke test suites passing | Verified |

**server.js:** 2,298 → ~700 lines (composition root)
**test suite:** 6 suites, all green

---

## What's Left (Optional)

### Refero Deep Search
Add a search input to the design system picker that queries the Refero API (`/api/styles`) so users can discover matching styles by keyword instead of scrolling a hardcoded list.

**Effort:** ~3-4 hours (backend proxy + frontend search component)
**Priority:** Low — 14 curated styles already cover the full API catalog

### Model Selection Polish
- Better defaults for stage model fields when left blank
- Clearer UI for what model will actually be used per stage
**Effort:** ~2-3 hours
**Priority:** Low — current system works

---

## Core Flow Working End-to-End

```
Brain Dump → Interrogate → Design System → Blueprint (editable) 
→ Prototype (separate) → Build (uses blueprint) → Export/Handoff (both files)
```

All smoke tests passing. Codebase clean. No urgent outstanding items.
