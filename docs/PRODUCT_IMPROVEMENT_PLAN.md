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
| QW-2: Replace orphan styles + write rich prompt guidance for each style | Done + committed |
| QW-3: Update getSystemPrompt() to use promptGuidance | Done + committed |
| QW-4: Trim regular design system list (10 distinct entries kept) | Done + committed |
| QW-5: Handoff smoke test (9 tests + bug fix) | Done + committed |
| Blueprint/Prototype split (backend endpoint + editable UI) | Done + committed |
| All 6 smoke test suites passing | Verified |

---

## Remaining: Refero Deep Search

**Problem:** Users pick from a hardcoded list of 14 Refero styles. Better: let them describe what they want (or paste a URL) and search the Refero API for matching styles.

**API Research (2026-06-02):**
- `https://styles.refero.design/api/styles` returns paginated JSON with 20 unique styles
- Each entry: id (UUID), siteName, url, screenshotUrl, colorScheme, colors[], fonts[], northStar
- Pagination via `cursor` and `nextCursor` params
- `q=` parameter accepted but doesn't filter (returns same results)
- Screenshot images at `https://images.refero.design/...`

### Frontend: Search UI in Design System Selector

Replace the current static dropdown with a hybrid component:

1. **Search input** — text field at top of design system picker
2. **Results display** — cards showing: name, URL, color swatches, screenshot thumbnail
3. **Selection** — clicking a result sets it as the active design reference (same as picking from dropdown)
4. **Fallback** — if no search results or user clears the search, show the hardcoded list as before

### Backend: Refero Search Proxy

New endpoint in `routes/models-design.js`:

- `GET /api/refero-search?q=<query>` — proxies to Refero API and returns matching styles
- Optional caching layer (in-memory, TTL ~5min) so repeated searches don't hammer the Refero API

### Implementation Notes

- The search is a proxy lookup, not AI-powered. The Refero API has ~20 total styles, so results are limited.
- Screenshot URLs can be used directly (they're public CDN URLs).
- Color swatches can be rendered from the `colors[]` array in the API response.
- Design system config already carries `__refero: true` and `uuid` — selected search result just needs to map to the same format.

### Estimated Effort

- **Backend:** 30-45 min (simple proxy endpoint)
- **Frontend:** 2-3 hours (search input + card results + integration with existing design system selector)
- **Total:** ~3-4 hours

---

## What's Next After Deep Search

The biggest remaining product issue (per the old workflow restoration section of Grok's doc) is:

### Potential Future: Split Blueprint / Prototype Generation

**Problem:** Single "Generate blueprint + prototype" button means the user never sees or edits the blueprint before it becomes a website. Outputs feel same-y because the model has to do everything in one shot.

**Approach:**
1. "Generate Blueprint" produces markdown-planning-document only
2. Blueprint displayed as editable text
3. "Generate Prototype from this Blueprint" button appears after blueprint exists
4. Prototype step reads current (possibly edited) blueprint + design reference
5. Results in more diverse, user-directed output

**Status:** Scoped but not started. This is a larger feature touching both frontend (UI flow) and backend (new endpoint or split logic).

---

## Out of Scope (For Now)

- Log area CSS cleanup (frontend polish, low priority)
- Model selection UX improvements (nice-to-have, low priority)
- 3-panel layout revival (Billy: explicitly off the table)
- Performance optimization (not currently a bottleneck)
