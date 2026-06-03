# Public Interfaces

This document defines the stable seams for v0.40 work. If a branch changes one of these contracts, update this file and add or update smoke coverage.

## Runtime

- Server entry: `server.js`
- Default port: `3000`
- Static app: `public/`
- Runtime data: `data/`
- Generated projects: `projects/`
- Build workspaces: managed by `lib/workspace.js`

## Frontend Pipeline Contract

The Alpine app is created by `cauldronApp()` in `public/scripts/app.js` and mounted from `public/index.html`.

Pipeline stage IDs:

```text
dump -> interrogate -> system -> blueprint -> prototype -> build -> export
```

Important state names:

| State | Meaning |
| --- | --- |
| `form.brainDump` | raw user idea |
| `form.projectType` | `app` or `site` |
| `form.designReference` | selected design-system id |
| `form.templateId` | selected scaffold/template id |
| `systemPanelTab` | active Taste Engine source tab, `local` or `community` |
| `communityDesignSystems` | curated community DESIGN.md entries available for import |
| `communityTemplates` | curated community scaffold starter guidance entries |
| `selectedCommunityTemplate` | active community scaffold guidance layered onto `form.templateId` |
| `stageModels` | per-stage provider/model routing stored in localStorage |
| `keyHealth` | Settings API-key connection health status |
| `blueprint` | editable generated markdown |
| `blueprintVersions` | saved blueprint snapshots for version history |
| `blueprintDiff` | structured diff rows for the selected blueprint version |
| `prototypeHtml` | generated HTML preview |
| `prototypeQuality` | latest deterministic prototype quality score with A/B/C/D grade, category scores, and suggestions |
| `critiqueText` | current natural-language prototype critique |
| `prototypeIterations` | latest prototype snapshots and critique history |
| `buildSession` | active build workspace metadata |
| `selectedBuildAgentIds` | selected build-agent ids for multi-agent handoff |
| `handoffResult` | latest export/handoff response |
| `pipelineLog` | user-facing activity log |
| `pipelineProgress` | estimated live progress for model-backed generation |

Frontend agents should preserve these names unless the branch explicitly migrates the contract and updates tests.

## Core API Routes

### Generation And Research

| Route | Method | Request | Response |
| --- | --- | --- | --- |
| `/api/research-url` | POST | `{ url, projectName?, brainDump?, mode? }` | `{ success, findings, formatted, researchId?, reuseCount? }` |
| `/api/clarify` | POST | `{ prompt, model, projectType?, apiKey?, cloudModel? }` | clarify question payload |
| `/api/blueprint-diff` | POST | `{ previous, next }` | `{ success, rows, summary }` line diff |
| `/api/generate` | POST | blueprint generation payload | generated blueprint/session payload |
| `/api/generate-prototype` | POST SSE | `{ blueprint, model, cloudModel?, apiKey?, critique?, previousPrototypeHtml?, iterationIndex?, ... }` | `progress`, `prototype`, `error` events |
| `/api/refine` | POST | `{ prompt, existingBlueprint, ... }` | refined blueprint payload |
| `/api/handoff` | POST | `{ projectName, blueprint?, sessionId?, designReference?, prototypeHtml? }` | `{ success, message, projectPath, draftId?, filesCopied? }` |

`/api/generate-prototype` can be used for first generation or critique regeneration. When `critique` is provided, callers should also pass `previousPrototypeHtml` so the model can preserve useful interaction structure while applying the requested change.

`prototype` events include `data.quality`, a deterministic local score generated after HTML extraction. The quality payload is `{ score, grade, showSuggestions, categories, suggestions }`; grades are `A`, `B`, `C`, or `D`, and `showSuggestions` is true for `C` or below. Category IDs are `accessibility`, `visualHierarchy`, `spacing`, `colorContrast`, and `semanticHtml`.

Prototype generation progress currently reports three steps: blueprint analysis, prototype generation, and output quality scoring.

`/api/handoff` is the current export bridge. It creates a project folder, writes the shared v0.40 handoff package, records an initial project status, and saves a draft record.

### Drafts

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/drafts` | GET | list saved draft records |
| `/api/drafts` | POST | save blueprint plus optional prototype review metadata |
| `/api/drafts/:id` | GET | fetch a full draft including `prototype_html` and `prototype_iterations` |
| `/api/drafts/:id/export.md` | GET | download blueprint markdown |
| `/api/drafts/:id` | DELETE | remove a draft |

Draft saves accept optional `blueprintVersions`, `prototypeHtml`, and `prototypeIterations`. `blueprintVersions` stores capped blueprint snapshots for v0.40 diff/history UI. Prototype fields support the critique loop without mixing prototype snapshots into the editable blueprint markdown.

### Build Workspace

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/build/start` | POST | create a build session and workspace |
| `/api/build/generate` | POST SSE | run the XML-tool build loop against a session |
| `/api/build/refine` | POST SSE | continue/refine an existing build session |
| `/api/build/stop` | POST | abort an active build session |
| `/api/build/files/:sessionId` | GET | list workspace files |
| `/api/build/file/:sessionId` | GET | read one workspace file |
| `/api/build/status/:sessionId` | GET | inspect build session metadata |
| `/api/build-agents` | GET | detect BYOK build-agent CLIs |
| `/api/build-agents/run` | POST | create one or more build-agent handoff packages and optionally launch selected detected CLIs |

`/api/build-agents/run` accepts the existing single-agent `agentId` field and optional `agentIds` for v0.40 multi-agent orchestration. When `agentIds` contains 2+ ids, the route returns `mode: "multi-agent"`, writes a root `cauldron.project.json`, and creates scoped handoff packages under `agents/<agentId>/`.

The v0.40 BYOK/CLI work should treat this as an existing local-agent path, not assume the build stage is empty.

Known v0.40 gap: `/api/build/generate` and `/api/build/refine` are intended SSE execution routes, but they currently depend on helper names that are not imported or passed into the route module. Verify and repair this path before relying on it for real Build-stage execution.

### Models And Design Systems

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/cloud-models` | GET | list supported cloud providers/models |
| `/api/ollama-models` | GET | detect local Ollama models from `/api/tags` |
| `/api/design-systems` | GET | list selectable design-system ids/names/sources |
| `/api/design-reference` | POST | fetch/cache a selected local, Refero, or remote design reference |
| `/api/refero-search` | GET | proxy cached Refero style search |
| `/api/community` | GET | list curated community DESIGN.md systems and scaffold starters |
| `/api/community/import` | POST | import a community design system or scaffold starter guidance |

`/api/design-systems` returns `{ systems: [{ id, name, source }] }`. IDs are canonical catalog IDs. `source` may be `open-design`, `refero`, or `remote`.

Local source catalog entries live under `design-systems/<id>/DESIGN.md` and are indexed by `design-systems/catalog.json`. Community imports are runtime data and live under `data/community/design-systems/<id>/DESIGN.md` or `CAULDRON_DATA_DIR/community/design-systems/<id>/DESIGN.md`; they are discovered on server restart and registered immediately after import. `/api/design-reference` shares the same cache and loader for local files, runtime community imports, Refero prompt guidance, and legacy remote fallbacks.

`/api/community` returns:

```json
{
  "success": true,
  "sourceRepo": "witchdaddylabs/cauldron-community",
  "sourceUrl": "https://github.com/witchdaddylabs/cauldron-community",
  "submitUrl": "https://github.com/witchdaddylabs/cauldron-community/pulls",
  "designSystems": [{ "id": "community-neon-command", "name": "Neon Command", "description": "...", "rawUrl": "..." }],
  "templates": [{ "id": "community-next-dashboard", "name": "...", "baseTemplateId": "nextjs", "promptBias": "..." }]
}
```

`POST /api/community/import` accepts `{ type: "design-system", id }` or `{ type: "template", id }`. Design-system imports write markdown to runtime data, add the system to the in-memory catalog, and return `{ success, type, system }`. Template imports return `{ success, type, template }`; callers should set `form.templateId` to `template.baseTemplateId` and include `template.promptBias` in blueprint prompts rather than treating the community id as a new deterministic scaffold writer.

### Project And Status

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/templates` | GET | return available scaffold templates |
| `/api/build-status` | GET | return aggregate project status |
| `/api/projects/:name/status` | POST/DELETE | set or clear manual project status |
| `/api/projects/:name/resume` | POST | launch OpenCode resume in a project folder |
| `/api/projects/:name/open-visible` | POST | open a visible OpenCode terminal |
| `/api/projects/import` | POST | import existing private project folders |
| `/api/health` | GET | health response |

## Generated Handoff Files

Current `/api/handoff` and `/api/build-agents/run` output may include:

| File | Purpose |
| --- | --- |
| `blueprint.md` | source product/build specification |
| `prototype.html` | standalone generated prototype |
| `design-system.md` | selected design reference content |
| `cauldron.project.json` | machine-readable handoff manifest |
| `README.md` | human run/build instructions |
| `agent-prompt.md` | prompt for a local build-agent CLI |
| `.cursorrules` | Cursor-oriented project rules |
| `.opencode/config.md` | OpenCode-oriented instructions |
| template scaffold files | deterministic starter project files for the selected template |

`/api/handoff` creates package files only. `/api/build-agents/run` creates the same package and may launch a detected CLI when the selected agent supports automated launch. Responses distinguish `mode: "handoff-only"`, `mode: "dry-run"`, and `mode: "launched"`.

`cauldron.project.json.scaffold` is the generated scaffold contract:

| Field | Meaning |
| --- | --- |
| `templateId` | selected public template id |
| `scaffold` | scaffold writer id used by Cauldron |
| `entrypoint` | primary file to open or edit first |
| `packageManager` | `npm` for package-based templates, otherwise `null` |
| `commands` | run/build command map when package-based |
| `files[]` | generated scaffold files with `{ path, role, kind, generated }` metadata |

Current scaffold outputs:

| Template | Entrypoint | Files |
| --- | --- | --- |
| `static-html` | `index.html` | `index.html`, `styles.css` |
| `html-alpine` | `index.html` | `index.html`, `styles.css`, `app.js` |
| `nextjs` | `app/page.tsx` | `package.json`, `next.config.mjs`, `tsconfig.json`, `next-env.d.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css` |
| `astro` | `src/pages/index.astro` | `package.json`, `astro.config.mjs`, `src/pages/index.astro`, `src/styles/global.css` |

## Template Contract

`TEMPLATES` is currently defined in `server.js` and returned by `/api/templates`.

Each template has:

- `id`
- `name`
- `projectType`
- `scaffold`
- `recommendedUse`
- `files`
- `promptBias`

The handoff response `files.scaffold` remains a simple array of generated scaffold paths for frontend display compatibility; use `cauldron.project.json.scaffold.files` for richer metadata.

## Test Expectations

Use `npm test` for the existing smoke suite. Add targeted tests when changing:

- API response shapes.
- Generated handoff files.
- Template/scaffold output.
- Frontend text or state required by `tests/frontend-static-smoke.js`.
- Build or project status behavior.
