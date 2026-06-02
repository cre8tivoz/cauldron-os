# Handoff & Export Fix — Implementation Spec

**Problem:** The blueprint/prototype split broke every step after prototype generation. Prototype HTML is generated but never saved, handoff doesn't include it, build ignores the blueprint, and prototype stage is missing a generation button.

---

## Issue 1: Handoff Must Include Prototype HTML

### Frontend: `public/scripts/app.js`

**`handoffToOpenCode()`** (line 717) — Add `prototypeHtml` to the POST body:
```js
body: JSON.stringify({
    projectName: this.form.projectName || 'cauldron-project',
    blueprint: this.blueprint,
    prototypeHtml: this.prototypeHtml,   // ← ADD THIS
}),
```

**`handoffFromBuild()`** (line 772) — Same fix:
```js
body: JSON.stringify({
    projectName: this.form.projectName || 'cauldron-project',
    sessionId: this.buildSession.sessionId,
    blueprint: this.blueprint,
    prototypeHtml: this.prototypeHtml,   // ← ADD THIS
}),
```

### Backend: `routes/generation.js` — `/api/handoff` handler (line 315)

Currently the handler extracts HTML from the blueprint:
```js
const htmlBlockMatch = (useBlueprint || '').match(/```html\s*([\s\S]*?)\s*```/i);
```

**Change:** Accept `prototypeHtml` from the request body. If provided (non-empty), write it directly as `prototype.html`. If NOT provided, fall back to the existing extraction logic.

After reading `prototypeHtml` from req.body:
```js
const { projectName, blueprint, sessionId, designReference, prototypeHtml } = req.body;
```

Then after creating the project directory, change the prototype writing logic:
```js
// Write prototype from explicit parameter, or fall back to extraction from blueprint
if (prototypeHtml && prototypeHtml.trim()) {
    const fullPrototype = `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>\n<body>\n${prototypeHtml}\n</body>\n</html>`;
    fs.writeFileSync(path.join(projectPath, 'prototype.html'), fullPrototype, 'utf-8');
} else {
    // existing extraction logic from blueprint HTML fenced blocks
    const htmlBlockMatch = (useBlueprint || '').match(/```html\s*([\s\S]*?)\s*```/i);
    if (htmlBlockMatch && htmlBlockMatch[1]) {
        // ... existing logic ...
    }
}
```

---

## Issue 2: Build Should Use Blueprint, Not Brain Dump

### Frontend: `public/scripts/app.js` — `startBuild()` (line 737)

**Change line 746** from:
```js
prompt: this.form.brainDump,
```
to:
```js
prompt: this.blueprint,
```

Also **fix the model** from hardcoded gemini:
```js
model: this.form.cloudModel || 'gemini-3.1-flash-lite',
```
to use the stage model routing:
```js
model: this.stageModels.blueprint?.provider || this.form.provider,
```

---

## Issue 3: "Generate Prototype" Button in Prototype Stage

### Frontend: `public/index.html` — prototype stage (lines 475-487)

Add a "Generate Prototype from this Blueprint" button in the prototype stage, shown when `prototypeHtml` is empty and `blueprint` is non-empty. Same button template as the one in the blueprint stage (line 470).

After line 481 (`</div>` closing the "No prototype yet" callout), add:
```html
<button class="btn btn-accent" type="button" @click="generatePrototype" :disabled="busy || !blueprint.trim()" x-show="!prototypeHtml && blueprint.trim()" style="background:var(--acid-500);color:var(--text-dark);font-weight:700;">Generate Prototype from Blueprint</button>
```

---

## Issue 4: Download Should Include Prototype

### Frontend: `public/scripts/app.js` — `downloadBlueprint()` (line 810)

Currently only downloads blueprint markdown. Change to download a zip or expand the download to also offer the prototype HTML.

**Simpler fix:** Add a separate `downloadPrototype()` method and a button for it in the export stage and prototype stage.

Actually, the simplest useful change: show the prototype HTML file path in the handoff result display. The prototype.html file is being created on disk as part of the handoff. The user can access it from there.

For now, just fix the download to be clearer — maybe change the button text to "Download blueprint.md" (which it already does) and add context that prototype.html will be in the project folder after handoff.

---

## Files to Change

| File | Changes | 
|------|---------|
| `public/scripts/app.js` | 4 changes: handoffToOpenCode, handoffFromBuild, startBuild, downloadBlueprint |
| `public/index.html` | 1 change: Add Generate Prototype button in prototype stage |
| `routes/generation.js` | 1 change: Accept prototypeHtml in handoff handler |

---

## Verification

1. `node --check public/scripts/app.js routes/generation.js`
2. `npm test` — all 6 suites pass
3. Manual: Generate blueprint → generate prototype → handoff → verify project folder has both blueprint.md and prototype.html
4. Manual: Build starts and uses the blueprint as the prompt
