# Blueprint / Prototype Split — Implementation Spec

**Status:** Draft for execution
**Estimate:** 4-5 hours (one autonomous pass)
**Risk:** 3/10 (frontend + backend integration)

---

## Problem

The current UI has one button: "Generate blueprint + prototype." The backend produces a blueprint markdown, then the frontend blindly extracts HTML from it with a regex. The user never sees or edits the blueprint as a separate artifact. This causes:
- Same-y outputs because the model has to produce a document AND a website in one shot
- No user steering between planning and building
- The `extractHtml()` regex is fragile and gives the user zero control

## Target Flow

1. User clicks **"Generate Blueprint"** → backend produces markdown blueprint → displayed as **editable text**
2. User reviews/edits the blueprint markdown
3. User clicks **"Generate Prototype from this Blueprint"** → sends current blueprint + design ref to backend → backend produces HTML prototype only
4. Prototype shown in preview as before

---

## Backend Changes

### New endpoint: `POST /api/generate-prototype`

**File:** `routes/generation.js`

**Request body:**
```json
{
  "blueprint": "# The user's reviewed/edited blueprint markdown...",
  "designReference": "lovable",
  "templateId": "html-alpine",
  "model": "ollama",
  "cloudModel": "",
  "apiKey": "",
  "projectType": "site"
}
```

**Response:** SSE stream (same format as `/api/generate` but prototype-focused)
```json
{"type":"progress","step":1,"total":2,"label":"Analyzing blueprint...","status":"active"}
{"type":"progress","step":2,"total":2,"label":"Generating prototype...","status":"active"}
{"type":"prototype","data":{"html":"<div class=\"hero\">..."},"duration":45.2}
```

**Implementation:**
1. Copy the existing `/api/generate` handler's structure but simplify to 2 stages
2. Stage 1: Research (design system fetch, template lookup) — same as existing
3. Stage 2: Generate prototype — call model with a **simpler, HTML-focused system prompt** that:
   - Takes the blueprint markdown as authoritative context ("Build exactly what this blueprint describes")
   - Uses the selected design reference for visual styling
   - Output is an HTML fenced block (`\`\`\`html...\`\`\``) — the model should only produce the HTML, not another planning document
4. Return SSE with `type: 'prototype'` events containing the HTML
5. Keep the same deps pattern (uses db, getSystemPrompt, ensureDesignSystem, callOllamaModel, callCloudModel from deps)

**System prompt for prototype generation (new constant in server.js or inline):**
```
You are a senior front-end developer with impeccable taste.
Your job is to convert a product blueprint into a polished, working HTML prototype.

## Instructions
- Read the blueprint below carefully — this is your source of truth
- Produce a complete, self-contained HTML page with embedded CSS
- Use AlpineJS (via CDN) for any interactivity
- Follow the selected design reference for visual styling
- Output only the HTML inside a ```html``` fenced code block
- Do NOT produce another planning document — only the prototype HTML
- Respect the blueprint's structure: sections, components, features, flow

## Blueprint
{blueprint text goes here}
```

---

## Frontend Changes

### File: `public/scripts/app.js`

### 1. Rename primary action (lines 480-568)
- Rename `generateBlueprint()` to match new label
- Button text changes from "Generate blueprint + prototype" to **"Generate Blueprint"**
- Remove the automatic `extractHtml()` and auto-navigation to prototype stage
- After blueprint arrives, navigate to blueprint stage and show editable text

### 2. Add editable blueprint view (new UI in index.html)
- In the blueprint stage, show a `<textarea>` (or contenteditable `<pre>`) pre-filled with `this.blueprint`
- The textarea value binds to `this.blueprint` two-way (Alpine: `x-model="blueprint"`)
- Style it as a monospace code block with appropriate height

### 3. Add "Generate Prototype from this Blueprint" button
- New method `async generatePrototype()` that:
  - POSTs to `/api/generate-prototype` with current blueprint + settings
  - Streams SSE progress events to the pipeline log
  - On completion, stores the HTML in `this.prototypeHtml`
  - Navigates to prototype stage
  - Shows the rendered prototype in the existing preview iframe
- Button appears only when `this.blueprint` is non-empty
- Positioned next to existing "Download Blueprint" and "Save Draft" actions

### 4. Update `extractHtml()` usage
- `extractHtml()` should still work for loading drafts that have embedded HTML
- But the primary flow no longer relies on it — prototype comes from the new endpoint

### 5. Update stage completion logic (line 87-89)
```js
if (this.blueprint) complete.add('blueprint');           // unchanged
if (this.prototypeHtml) complete.add('prototype');        // unchanged — now set by generatePrototype()
```

---

## Integration Contract

The frontend calls `POST /api/generate-prototype` with:
```json
{
  "blueprint": "<current edited blueprint text>",
  "designReference": "<selected>",
  "templateId": "<selected>",
  "model": "<provider>",
  "cloudModel": "<optional>",
  "apiKey": "<saved key>",
  "projectType": "<site|app>"
}
```

The backend returns SSE events:
- `{"type":"progress","step":1,"total":2,"label":"...","status":"active|complete"}`
- `{"type":"prototype","data":{"html":"<the HTML>"},"duration":45.2}`
- `{"type":"error","step":2,"label":"...","message":"..."}`

Frontend handles the SSE stream same as `generateBlueprint()` but looks for `type: 'prototype'` instead of `type: 'blueprint'`.

---

## Files to Modify

| File | Changes | Complexity |
|------|---------|------------|
| `routes/generation.js` | New `POST /api/generate-prototype` handler (~40 lines) | Medium |
| `server.js` | New system prompt constant for prototype gen (~15 lines) | Low |
| `public/scripts/app.js` | New `generatePrototype()` method, UI wiring, button text (~80 lines) | Medium |
| `public/index.html` | Blueprint textarea in blueprint stage, new button in actions area (~20 lines) | Low |

---

## Edge Cases

1. **Empty blueprint submitted** → return 400 with error message telling user to generate a blueprint first
2. **Model times out** → same SSE error handling as existing `/api/generate`
3. **No HTML produced** (model returns markdown instead) → return error, suggest regenerating
4. **User edits blueprint to be empty** → disable "Generate Prototype" button when `this.blueprint` is empty
5. **Design reference changed between blueprint and prototype** → perfectly fine, the user may want to try different visual treatments on the same blueprint
6. **Loading saved draft with embedded HTML** → `extractHtml()` still works, `prototypeHtml` is set, but the user can still regenerate with the new endpoint if they want

---

## Verification

After implementation:
1. `node --check server.js routes/generation.js public/scripts/app.js`
2. `npm test` — all 6 suites pass
3. Manual: Generate a blueprint → see editable text → edit it → click "Generate Prototype" → see the prototype rendered
4. Manual: Load a saved draft → blueprint shows in textarea → prototype still renders from `extractHtml()`
5. Manual: Submit empty blueprint to new endpoint → 400 error
