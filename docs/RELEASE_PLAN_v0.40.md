# Cauldron OS — v0.40 Release Plan

> **Author:** Claudia (COO, Witch Daddy Labs)
> **Date:** 2026-06-03
> **Status:** Draft — ready for Codex execution

---

## Goal

Take Cauldron OS from a solid v0.30 (design-to-prototype pipeline) to v0.40 — a more useful, more shareable, more "holy shit this is clever" tool. Focus on features that make people want to fork it.

---

## Phase 0: Delegation Setup

**Owner:** Claudia (orchestration) + Codex (implementation)

1. Create `docs/RELEASE_PLAN_v0.40.md` (this file)
2. Ensure AGENTS.md is up to date with current architecture
3. Define public interfaces for new subsystems

---

## Phase 1: Blueprint Diffing

**Owner:** Codex

**Problem:** When you iterate on a blueprint, you can't see what changed between versions.

**Solution:**
- After each blueprint generation/refinement, diff against the previous version
- Show a unified diff view in the panel (additions in green, deletions in red)
- Store blueprint versions in the draft record
- Add a "Version history" dropdown to the blueprint panel: v1, v2, v3...

**Files:**
- `routes/generation.js` — add diff endpoint
- `public/scripts/app.js` — diff display logic
- `public/index.html` — version history UI
- `db/index.js` — blueprint version storage

**Effort:** 4-6 hours

---

## Phase 2: Multi-Agent Build Orchestration

**Owner:** Codex

**Problem:** The build stage hands off to one agent. Real projects need multiple agents (e.g., Cursor for frontend, Codex for tests).

**Solution:**
- In the Build stage, allow selecting multiple agents
- Generate separate handoff packages per agent with scoped prompts
- Example: "Cursor gets the UI components, Codex gets the API routes, Claude Code gets the tests"
- Show per-agent build status in the pipeline log

**Files:**
- `routes/build-agents.js` — multi-agent orchestration
- `lib/handoff-package.js` — scoped prompt generation
- `public/scripts/app.js` — multi-agent UI
- `public/index.html` — agent selection checkboxes

**Effort:** 6-8 hours

---

## Phase 3: Plugin/Scaffold Marketplace (Community)

**Owner:** Codex

**Problem:** People can't easily share their DESIGN.md systems or scaffold templates.

**Solution:**
- Add a "Community" tab to the Design Reference panel
- Fetch community DESIGN.md files from a curated GitHub repo (e.g., `witchdaddylabs/cauldron-community`)
- Allow one-click import of community design systems
- Allow users to submit their own via PR to the community repo
- Same for scaffold templates — community Astro/Next.js starters

**Files:**
- `routes/community.js` — community content API
- `lib/design-system-catalog.js` — remote import support
- `public/scripts/app.js` — community tab UI
- `public/index.html` — community panel

**Effort:** 6-8 hours

---

## Phase 4: Build Output Quality Scoring

**Owner:** Claudia (prompt design) + Codex (implementation)

**Problem:** Cauldron generates prototypes but doesn't critique its own output before showing it to you.

**Solution:**
- After prototype generation, run a self-critique pass
- Score the prototype on: accessibility, visual hierarchy, spacing, color contrast, semantic HTML
- Show a "Quality Score" badge (A/B/C/D) next to the prototype
- If score is C or below, show specific suggestions before the user even critiques
- This is the "Annoying PM Mode for prototypes"

**Files:**
- `routes/generation.js` — quality scoring endpoint
- `lib/quality-scorer.js` — scoring logic (heuristic + LLM)
- `public/scripts/app.js` — score display
- `public/index.html` — score badge UI

**Effort:** 8-10 hours

---

## Phase 5: Polish & Release

**Owner:** Claudia (QA) + Codex (fixes)

1. Update README with v0.40 features
2. Update CHANGELOG
3. Capture new screenshots
4. Record walkthrough GIF
5. Version bump to 0.40.0
6. Tag and push
7. Write release notes for GitHub

**Effort:** 3-4 hours

---

## Delegation Map

| Phase | Work Package | Who | Method |
|-------|-------------|-----|--------|
| P0 | Setup + AGENTS.md | Claudia | Write directly |
| P1 | Blueprint diffing | Codex | Terminal + file tools |
| P2 | Multi-agent orchestration | Codex | Terminal + file tools |
| P3 | Community marketplace | Codex | Terminal + file tools |
| P4 | Quality scoring | Claudia (prompts) + Codex (impl) | Split |
| P5 | QA + release | Claudia | Direct |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Multi-agent orchestration is too complex for v0.40 | Medium | High | Scope to 2-agent max (frontend + tests). Expand later. |
| Community content API depends on external repo | Medium | Medium | Start with hardcoded list. Fetch from GitHub later. |
| Quality scoring is subjective | High | Low | Use simple heuristics first (contrast ratio, semantic HTML checks). LLM scoring as enhancement. |
| Diff view breaks existing blueprint panel | Medium | Medium | Add as new tab, don't replace existing view. |

---

## Success Criteria

Cauldron OS v0.40 ships when:

- [ ] Blueprint diffing works — see what changed between versions
- [ ] Multi-agent build orchestration works — select 2+ agents, get scoped handoffs
- [ ] Community tab shows importable design systems and scaffolds
- [ ] Quality score badge appears on prototypes with specific suggestions
- [ ] All existing tests pass + new tests for diff, multi-agent, quality scoring
- [ ] README updated with v0.40 features
- [ ] Version bumped to 0.40.0

---

## Out of Scope for v0.40

- Mobile PWA (v0.50+)
- Collaborative/multi-user brewing (v0.50+)
- Desktop app (Electron/Tauri) — web-first forever
- Plugin runtime (actual code execution) — security nightmare, not worth it
