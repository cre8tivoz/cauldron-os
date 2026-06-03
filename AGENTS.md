# Cauldron OS Agent Guide

This guide is the first read for agents working on Cauldron OS. It keeps parallel work scoped, names the public surfaces, and points each contributor at the smallest safe edit area.

## Product Shape

Cauldron OS is a local-first, design-aware project pipeline. A user writes a rough idea, optionally runs Annoying PM Mode, selects a design reference, generates an editable blueprint, generates an HTML/AlpineJS prototype, then exports or hands the project to a build agent.

Current runtime:

- Backend: Node.js, Express 5, route modules under `routes/`.
- Frontend: static AlpineJS app in `public/index.html` and `public/scripts/app.js`.
- Styles: token-first CSS in `public/styles/tokens.css` and `public/styles/app.css`.
- Storage: local `sql.js` database through `db/index.js`.
- Agent build support: XML action loop in `lib/agent-loop.js`, workspace sandbox in `lib/workspace.js`, and project handoff routes.

## Start Here

```bash
npm install
npm start
# open http://localhost:3000
```

Validation:

```bash
npm test
```

The test suite is smoke-test oriented. Add focused smoke coverage when a change touches a route, frontend contract, generated file format, or export behavior.

## Repository Map

| Path | Purpose | Safe Owners |
| --- | --- | --- |
| `server.js` | constants, prompt helpers, route registration, shared dependency object | architecture owner only unless a task explicitly touches constants |
| `routes/generation.js` | research, clarify, blueprint/prototype generation, `/api/handoff` | generation/backend agent |
| `routes/build.js` | build workspace start/generate/refine/stop/files/status | build-agent/backend agent |
| `routes/projects.js` | project status, import, visible OpenCode resume/open flows | handoff/backend agent |
| `routes/models-design.js` | cloud/Ollama model lists, design-system API, Refero search | design-system agent |
| `routes/templates.js` | templates and build-status API | scaffold/backend agent |
| `public/scripts/app.js` | Alpine state machine, API calls, localStorage config, pipeline behavior | frontend agent |
| `public/index.html` | app shell, stage cards, modals, preview panel | frontend agent |
| `public/styles/` | visual system and responsive layout | frontend/design agent |
| `db/index.js` | draft/session/research/project status schema and persistence | data agent |
| `lib/` | pure utilities and XML tool agent loop | build-agent/backend agent |
| `docs/` | architecture, execution plans, public contracts | any agent, with care for current version language |
| `tests/` | smoke tests for public contracts | owner of related feature |

## Working Rules

- Branch from `main` for each PR-sized phase or work package.
- Keep PRs narrow. Do not combine unrelated v0.30 phases in one branch.
- Preserve user changes. If a file has unrelated edits, inspect before touching it and stage only intended paths.
- Prefer existing route and frontend patterns over new frameworks. The app intentionally has no frontend bundler.
- Use structured parsing or explicit schemas for generated artifacts. Avoid brittle text scraping when JSON manifests can do the job.
- Keep generated project directories under `projects/`; runtime data belongs under `data/`. Both are local runtime surfaces, not source.
- Do not print API keys or credential-bearing remote URLs in docs, tests, or logs.
- UI work should use existing CSS variables and avoid broad palette resets.
- Treat current handoff copy carefully: package creation and CLI launch are different states.

## Public Interface Boundaries

Before editing a subsystem, read `docs/PUBLIC_INTERFACES.md`. It captures the API routes, generated files, and frontend state names that other work packages depend on.

When changing an interface:

1. Update the route or manifest contract.
2. Update `docs/PUBLIC_INTERFACES.md`.
3. Add or update the relevant smoke test.
4. Mention the contract change in the PR body.

## Delegation Map For v0.30

- Phase 0: documentation, repo rules, interface contracts.
- Phase 1: design-system catalog import and validation.
- Phase 2: BYOK/CLI build-agent handoff.
- Phase 3: prototype critique and iteration history.
- Phase 4: UI polish, progress, empty states, shortcuts, settings health.
- Phase 5: real scaffold export for static HTML, Alpine, Next.js, and Astro.

Suggested parallel split:

- Backend handoff/build agent: `routes/build.js`, `routes/generation.js`, `routes/projects.js`, `lib/`.
- Frontend pipeline agent: `public/index.html`, `public/scripts/app.js`, `public/styles/`.
- Design-system agent: `server.js` design constants, `routes/models-design.js`, `design-systems/`, import/validation scripts.
- Data agent: `db/index.js`, draft/session/iteration history tests.
- Scaffold agent: `routes/templates.js`, project generation helpers, scaffold smoke tests.

## Commit And PR Expectations

- Branch names: `codex/<phase-or-feature>`.
- Commit messages: terse imperative summary.
- PRs should include changed surfaces, validation run, and any follow-up risks.
- Open draft PRs unless the user asks for ready-for-review.

## Known v0.30 Coordination Risks

- `/api/handoff` is implemented in `routes/generation.js`, while project resume/open helpers are in `routes/projects.js`.
- The current handoff route writes an OpenCode config but does not launch OpenCode.
- The Build workspace SSE routes should be verified before Phase 2 depends on them.
- `form.designReference` may contain a canonical design-system id or a Refero style/site value.
- Stage-model routing is per stage, but API-key storage is still keyed by the global provider selector.
