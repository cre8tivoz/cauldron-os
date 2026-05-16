# Changelog

All notable changes to Cauldron OS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Note:** Prior history (v2.x era) has been archived to `docs/history/CHANGELOG-2.x.md`.
> The version was reset to 0.240.0 to reflect the unification Sprint 1 milestone.

---

## [0.250.0] — 2026-05-16 — Polish & Release (Sprint 4)

### Added
- **7-Stage Pipeline UI**: Build stage added between Prototype and Export, making the full pipeline: Brain Dump → Interrogate → Design System → Blueprint → Prototype → Build → Export.
- **Build Stage Frontend**: Start build workspace, file listing with preview links, workspace iframe preview, handoff to export flow.
- **Workspace Preview Server**: `/workspace-preview/:sessionId/` middleware for serving built files from sandboxed workspaces.

### Changed
- **Version bump**: `package.json` → v0.250.0, startup banner → "Cauldron OS v0.250"
- **Rebranded agent**: System prompt changed from "Private Cauldron" to "Cauldron OS"
- **Version consistency**: Frontend UI ribbon changed from "v3.0" to "v0.250"
- **MANIFEST.md**: Complete rewrite documenting actual v0.250 structure
- **ARCHITECTURE.md**: Full rewrite documenting unified architecture with AlpineJS SPA, 7-stage pipeline, XML agent system, build pipeline
- **GETTING_STARTED.md**: Fixed repo URL (`witch-daddy-labs` → `witchdaddylabs`)
- **DESIGN_REFERENCE.md**: Fixed repo URLs throughout
- **PUSH_GUIDE.md**: Replaced with brief deprecation notice (one-time setup, no longer relevant)
- **All smoke tests updated**: Model version strings, frontend DOM checks, build API endpoint verification

### Fixed
- Stale frontend static smoke test (checked for old DOM IDs that no longer exist)
- Cloud model version string test (gemini-3.1-flash-lite → gemini-3.1-flash-lite-preview)

## [0.240.0] — 2026-05-16 — Unification Sprint 1

### Added
- **Database schema merge**: `research_history` and `project_status_overrides` tables merged from private build into public `db/index.js`.
  - `research_history` tracks URL research sweeps with findings, favorites, and reuse counts.
  - `project_status_overrides` stores manual status overrides for build projects.
- **XML Tool Agent System** (`lib/` directory): agent-loop.js, tools.js, workspace.js, xml-parser.js — multi-turn model <-> tool loop for AI-assisted project building.
- **AlpineJS SPA Frontend**: Replaced vanilla JS + Tailwind CDN frontend with private's AlpineJS single-page app (`public/index.html`, `scripts/app.js`, `styles/tokens.css`, `styles/app.css`).
- **Scaffold Templates**: 4 template types (static HTML, HTML+AlpineJS, React+Vite+Tailwind, Next.js) with associated API endpoint `/api/templates`.
- **Refero Design Styles**: 14 curated design references from refero.design merged into the DESIGN_SYSTEMS catalog.
- **API Routes ported from private build**:
  - GET/POST `/api/research-history` + POST `/api/research-history/:id/favorite`
  - GET `/api/templates`, GET `/api/build-status`
  - POST/DELETE `/api/projects/:name/status`
  - POST `/api/projects/:name/resume`, POST `/api/projects/:name/open-visible`
  - POST `/api/projects/import`
  - POST `/api/build/start`, `/api/build/generate` (SSE), `/api/build/refine` (SSE), `/api/build/stop`
  - GET `/api/build/files/:sessionId`, `/api/build/file/:sessionId`, `/api/build/status/:sessionId`
  - POST `/api/chat/completions` (OpenAI-compatible proxy)
  - Static: `/workspace-preview/:sessionId/*`, `/research-assets/*`
- **Build Pipeline**: End-to-end project building workflow with workspace sandboxing, SSE streaming, and OpenCode handoff.
- **Project Import**: Import existing project folders as drafts via `/api/projects/import`.
- **Build Status Monitoring**: Auto-detection of running/stalled/completed/failed projects with manual status overrides.

### Changed
- **Version bump**: `package.json` → v0.240.0, startup banner → "Cauldron OS v0.240"
- **README.md**: Banner and version references updated to v0.240
- **CHANGELOG.md**: Previous v2.x history archived to `docs/history/CHANGELOG-2.x.md`
- **Design systems**: Expanded from 13 to 27 entries (14 Refero styles + 13 curated brands)
- **Cloud model routing**: Updated `callCloudModel` to support flexible base URLs via `normaliseOpenAICompatibleChatUrl`
- **Handoff flow**: Enhanced to copy build workspace files and save HTML prototypes

### Removed
- Public vanilla JS + Tailwind CDN frontend (replaced by AlpineJS SPA)

---

*Archived history follows below:*
