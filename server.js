/**
 * Cauldron OS v0.250 — Witch Daddy Labs
 *
 * Thin composition root. All business logic and routes extracted to:
 * - lib/        (model-client, research, agent-loop, tools, workspace, xml-parser)
 * - routes/     (route handlers organized by domain)
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { chromium } = require('playwright');
const db = require('./db');
const { findNextAction } = require('./lib/xml-parser');
const workspace = require('./lib/workspace');
const { runTool, toolsSystemPrompt } = require('./lib/tools');
const { generateWithTools, buildSystemPrompt } = require('./lib/agent-loop');
const {
  CLOUD_MODELS,
  getCloudModelName,
  extractJsonObject,
  normaliseClarifyResult,
  normaliseOpenAICompatibleChatUrl,
  modelRequiresDefaultTemperature,
  buildChatPayload,
  inferProviderFromModel,
  callOllamaModel,
  callCloudModel,
} = require('./lib/model-client');
const {
  scrapeURLFast,
  scrapeRenderedURL,
  formatResearchForPrompt,
} = require('./lib/research');
const registerAllRoutes = require('./routes');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_URL = `${OLLAMA_BASE_URL}/api/generate`;
const OLLAMA_TAGS_URL = `${OLLAMA_BASE_URL}/api/tags`;
const OLLAMA_TIMEOUT_MS = 600000;
const CLOUD_TIMEOUT_MS = 300000;
const CLARIFY_NUM_PREDICT = Number(process.env.CAULDRON_CLARIFY_NUM_PREDICT || 2048);
const BLUEPRINT_NUM_PREDICT = Number(process.env.CAULDRON_BLUEPRINT_NUM_PREDICT || 8192);
const OPENAI_BASE_URL = 'https://api.openai.com/v1/chat/completions';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const REFERO_BASE = 'https://styles.refero.design/style';

// ─── Refero Styles Index ──────────────────────────────────────────────────
const REFERO_STYLES = {
  'refero-antimetal':  { name: 'Antimetal (Electric Storm Blueprint)',   uuid: '9f9a4a4f-1a27-47ca-a65b-68b9850a84e4' },
  'refero-good-glyphs':{ name: 'Good Glyphs (Neon Playbill)',            uuid: '41220ec0-ca0d-4697-a2fc-7a9a50d52e7c' },
  'refero-linear':     { name: 'Linear (Midnight Command Center)',       uuid: '90ce5883-bb24-4466-93f7-801cd617b0d1' },
  'refero-cursor':     { name: 'Cursor (Warm Ivory Studio)',             uuid: '4e3b4717-84c8-4599-baaf-a343c3d619b6' },
  'refero-anthropic':  { name: 'Anthropic (Research Journal)',           uuid: 'd469cba4-c448-4a43-a033-883f8bfcdc42' },
  'refero-raycast':    { name: 'Raycast (Obsidian Terminal)',            uuid: '3b6a17f0-3bdf-418c-a95e-0b89e5a8b2f8' },
  'refero-superhuman': { name: 'Superhuman (Cinematic Cockpit)',         uuid: '418b374a-be64-44f0-b17e-1d45308c7e62' },
  'refero-hyperstudio':{ name: 'Hyperstudio (Amber Monochrome)',         uuid: '8eb9c53e-d69c-497a-b640-610856cf3a0' },
  'refero-generalint': { name: 'General Intelligence (Night Sky)',       uuid: '34baa524-5d5b-4165-bbab-d01f05e6d6b9' },
  'refero-mercury':    { name: 'Mercury (Mountain Top Command)',         uuid: '3172cd4d-118a-4a16-a259-6b634d32322e' },
  'refero-elevenlabs': { name: 'ElevenLabs (Architect Blueprint)',       uuid: '031056ff-7af1-46db-8daa-115f731c5d26' },
  'refero-monopo':     { name: 'Monopo Saigon (Gradient Depths)',        uuid: '3e52dd36-6ab1-48c6-bc40-47ef6d33abc2' },
  'refero-minimal':    { name: 'Minimalissimo (White Gallery)',          uuid: '35ff063b-1fcc-48a2-83b3-56da01e23880' },
  'refero-stripe':     { name: 'Stripe (Architectural White)',           uuid: '48e5de76-05d5-4c4e-a269-c7c245b291ec' },
};

// Cache for design system references (avoid re-fetching)
const designSystemCache = new Map();
const DESIGN_SYSTEM_SOURCE = 'https://raw.githubusercontent.com/Meliwat/awesome-design-md-pre-paywall/main/design-md';
const DESIGN_SYSTEMS = {
  none: { name: 'None', repo: null, path: null },
  cursor: { name: 'Cursor (Sleek Dark)', repo: 'cursor', path: 'DESIGN.md' },
  vercel: { name: 'Vercel (Precision Geist)', repo: 'vercel', path: 'DESIGN.md' },
  lovable: { name: 'Lovable (Playful Gradients)', repo: 'lovable', path: 'DESIGN.md' },
  raycast: { name: 'Raycast (Vibrant Chrome)', repo: 'raycast', path: 'DESIGN.md' },
  linear: { name: 'Linear (Precise Dark Ops)', repo: 'linear.app', path: 'DESIGN.md' },
  stripe: { name: 'Stripe (Editorial Systems)', repo: 'stripe', path: 'DESIGN.md' },
  notion: { name: 'Notion (Warm Structured Docs)', repo: 'notion', path: 'DESIGN.md' },
  apple: { name: 'Apple (Quiet Premium)', repo: 'apple', path: 'DESIGN.md' },
  figma: { name: 'Figma (Collaborative Canvas)', repo: 'figma', path: 'DESIGN.md' },
  supabase: { name: 'Supabase (Developer Emerald)', repo: 'supabase', path: 'DESIGN.md' },
  resend: { name: 'Resend (Minimal Developer SaaS)', repo: 'resend', path: 'DESIGN.md' },
  webflow: { name: 'Webflow (Visual Builder Polish)', repo: 'webflow', path: 'DESIGN.md' },
  opencode: { name: 'OpenCode (Terminal-native Builder)', repo: 'opencode.ai', path: 'DESIGN.md' },
  ...Object.fromEntries(
    Object.entries(REFERO_STYLES).map(([id, val]) => [id, { name: val.name, __refero: true, uuid: val.uuid }])
  ),
};

// ─── TEMPLATES ───────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'static-html',
    name: 'Static HTML/CSS',
    projectType: 'site',
    scaffold: 'static-html',
    recommendedUse: 'simple landing pages, microsites, and zero-build concept pages',
    files: ['index.html', 'styles.css', 'README.md', 'blueprint.md', 'cauldron.project.json'],
    promptBias: 'Build a polished static HTML/CSS site with semantic markup, responsive sections, strong hierarchy, and no build tooling. The HTML preview must be a complete, working landing page with all sections rendered using realistic content and proper design states.',
  },
  {
    id: 'html-alpine',
    name: 'HTML + AlpineJS',
    projectType: 'prototype',
    scaffold: 'html-alpine',
    recommendedUse: 'interactive lightweight prototypes and single-page tools',
    files: ['index.html', 'styles.css', 'README.md', 'blueprint.md', 'cauldron.project.json'],
    promptBias: 'Build a polished, self-contained interactive prototype using semantic HTML, AlpineJS state management (x-data, x-show, x-transition, x-for), minimal dependencies, accessible controls, and premium dark UI styling. Include baked-in demo data, localStorage persistence, and proper loading/empty/error states. The HTML preview must be a fully working app.',
  },
  {
    id: 'nextjs',
    name: 'Next.js App',
    projectType: 'app',
    scaffold: 'nextjs',
    recommendedUse: 'modern React apps, SaaS dashboards, and production web apps',
    files: ['app/page.tsx', 'app/layout.tsx', 'package.json', 'README.md', 'blueprint.md', 'cauldron.project.json'],
    promptBias: 'Build a production-quality Next.js app with TypeScript, App Router, Server Components by default, and client components for interactive sections. Use Tailwind CSS for styling with a professional design system approach. Include proper loading/error/empty states, responsive design, and accessible markup.',
  },
  {
    id: 'astro',
    name: 'Astro Static',
    projectType: 'site',
    scaffold: 'astro',
    recommendedUse: 'content-heavy sites, blogs, documentation, and marketing pages',
    files: ['src/pages/index.astro', 'public/', 'package.json', 'README.md', 'blueprint.md', 'cauldron.project.json'],
    promptBias: 'Build a polished Astro site with static output, semantic HTML, and modern CSS. Use Astro components for layout and content sections. The site must be fully working with realistic content, proper meta tags, responsive design, and accessible markup.',
  },
];

// ─── Session state for build pipeline ──────────────────────────────────────
const activeBuildControllers = new Map();
const buildSessions = new Map();

// ─── Prompt System ─────────────────────────────────────────────────────────
const DESIGN_GUIDE = `
## Taste Mandates (non-negotiable)
- No purple unless explicitly requested. No gradients unless they serve the design.
- No emojis as design elements. No stock photography placeholders.
- No generic "lorem ipsum" — all copy must be real and contextual.
- No centered layouts for body content. Left-aligned is the default.
- No pure black (#000000) — use rich dark grays instead.
- No pure white (#FFFFFF) — use warm off-whites instead.
- Typography must have clear hierarchy: display → heading → body → meta.
- Spacing must follow a consistent 4px or 8px grid.
- Interactive elements must have visible hover/focus states.
- Motion must be purposeful — no gratuitous animation.
- Every component must work at mobile (375px), tablet (768px), and desktop (1440px).
- WCAG 2.1 AA contrast compliance is mandatory.
- Dark mode is the default aesthetic — light mode is the alternative.
`;

const APP_SYSTEM_PROMPT = `You are a senior technical architect with impeccable taste.
${DESIGN_GUIDE}

Your job is to produce a complete, structured blueprint document for a web application.

## Output Format\nProduce a complete blueprint document with these sections:\n\n### 1. Project Overview\n- App name, tagline, and one-paragraph description\n- Target users and core value proposition\n\n### 2. Core Features\n- Numbered list of 5-8 MVP features\n- Each feature: name, 1-line description, why it matters\n\n### 3. User Flows\n- Describe 2-3 key user journeys step by step\n- Include entry points, decision points, and outcomes\n\n### 4. Technical Architecture\n- Recommended frontend approach (from the selected template)\n- State management strategy\n- Data flow overview\n- Key integration points\n\n### 5. UI/UX Specifications\n- Layout grid and breakpoints\n- Primary navigation pattern\n- Key screens/views (3-5)\n- Component inventory\n\n### 6. Information Architecture\n- Sitemap or screen hierarchy\n- Content types and data models\n\n### 7. Visual Direction\n- Typography scale (display, heading, body, meta)\n- Color palette (primary, secondary, accent, neutral, semantic)\n- Spacing system\n- Interaction patterns\n\n### 8. Implementation Notes\n- Build considerations\n- Performance requirements\n- Accessibility requirements\n- Browser support\n`;

const SITE_SYSTEM_PROMPT = `You are a sharp product designer and front-end planner with impeccable taste.
${DESIGN_GUIDE}

Your job is to produce a complete, structured blueprint document for a website.

## Output Format
Produce a complete blueprint document with these sections:

### 1. Project Overview
- Site name, tagline, and one-paragraph description
- Target audience and key message

### 2. Content Strategy
- Primary pages (5-8)
- Content hierarchy per page
- Key calls to action

### 3. User Experience
- Primary user journey(s)
- Navigation structure
- Interaction patterns

### 4. Page Specifications
- For each primary page: purpose, layout, key components
- Responsive behavior notes

### 5. Visual Identity
- Typography system (fonts, scale, weights)
- Color palette (with specific hex values)
- Imagery style and art direction
- Spacing and layout grid

### 6. Technical Approach
- Build approach (from the selected template)
- Performance targets
- SEO considerations
- Analytics/tracking needs

### 7. Component Inventory
- Reusable components needed
- Per-component specs (props, states, behavior)

### 8. Implementation Notes
- Build priorities
- Content migration needs
- Third-party integrations
`;

const CLARIFY_SYSTEM_PROMPT = `You are a blunt senior product manager helping a non-developer clarify an app/site idea before any code is planned.

Your job is to ask clarifying questions and surface assumptions.

Return JSON only:
{
  "questions": [{"id": "unique-id", "label": "The question?", "why": "Why this matters"}],
  "assumptions": ["assumption 1"],
  "redFlags": ["risk 1"],
  "suggestedScope": ["scope suggestion 1"]
}

Ask no more than 8 questions. Focus on: users, workflows, scope, constraints, success criteria.`;

function getSystemPrompt(projectType = 'app', designReference = '') {
  let base = projectType === 'site' ? SITE_SYSTEM_PROMPT : APP_SYSTEM_PROMPT;

  if (designReference && designReference !== 'none') {
    base += `\n\n## Active Design Reference: ${DESIGN_SYSTEMS[designReference]?.name || designReference}\nUse the selected design system as the primary visual language.`;
  }

  return base;
}

function getTemplate(templateId = '') {
  return TEMPLATES.find(t => t.id === templateId) || null;
}

function formatTemplateForPrompt(template) {
  if (!template) return '';
  return `## Project Type: ${template.name}\n${template.promptBias}`;
}

// ─── Design System Fetcher ─────────────────────────────────────────────────
function fetchDesignSystem(repo, callback) {
  const url = `${DESIGN_SYSTEM_SOURCE}/${repo}/DESIGN.md`;

  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        callback(null, data);
      } else {
        callback(new Error(`HTTP ${res.statusCode}`), null);
      }
    });
  }).on('error', callback);
}

function ensureDesignSystem(system) {
  if (!system || system === 'none' || !DESIGN_SYSTEMS[system]) return Promise.resolve('');
  if (designSystemCache.has(system)) return Promise.resolve(designSystemCache.get(system));
  const { repo } = DESIGN_SYSTEMS[system];
  if (!repo) return Promise.resolve('');
  return new Promise((resolve) => {
    fetchDesignSystem(repo, (err, content) => {
      if (err) {
        console.warn(`[Cauldron] Design reference ${system} unavailable:`, err.message);
        return resolve('');
      }
      designSystemCache.set(system, content);
      resolve(content);
    });
  });
}

// ─── Cloud Agent Build Helper ──────────────────────────────────────────────

async function _runCloudAgentBuild({ prompt, model, apiKey, systemPrompt, sessionId, onToken, signal, cloudModel }) {
  const MAX_ROUNDS = 40;
  const provider = model;
  const url = provider === 'gemini' ? GEMINI_BASE_URL : OPENAI_BASE_URL;
  const modelName = getCloudModelName(provider, 'app', cloudModel || '');

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  const finalActions = [];
  const finalFiles = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (signal && signal.aborted) break;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      signal,
      body: JSON.stringify({
        model: modelName,
        messages,
        stream: true,
        temperature: provider === 'gemini' ? 0.5 : 0.55,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`${provider} ${response.status}: ${text}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.trim().startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content || '';
          if (content) {
            fullText += content;
            if (onToken) onToken(content);
          }
        } catch (e) {
          // Skip malformed JSON lines
        }
      }
    }

    const actions = _extractBuildActions(fullText);

    if (actions.length === 0) {
      return { files: [...new Set(finalFiles)], actions: finalActions, messages };
    }

    for (const action of actions) {
      if (signal && signal.aborted) break;
      const ctx = { sessionId };
      const result = await runTool(action.name, action.args, ctx);
      if (['write_file', 'edit_file', 'delete_file'].includes(action.name)) {
        if (action.args && action.args.path) {
          finalFiles.push(action.args.path);
        }
      }
      finalActions.push({ name: action.name, args: action.args, result });
      messages.push({
        role: 'user',
        content: `[Tool Result: ${action.name}]\n\n${result}\n\nContinue working. If you are done, respond with a summary of what was completed.`,
      });
    }
    messages.push({ role: 'assistant', content: fullText });
  }

  return { files: [...new Set(finalFiles)], actions: finalActions, messages };
}

function _extractBuildActions(text) {
  const actions = [];
  let fromIndex = 0;
  while (fromIndex < text.length) {
    const result = findNextAction(text, fromIndex);
    if (result === null || result === 'incomplete') break;
    actions.push({ name: result.name, args: result.args });
    fromIndex = result.end;
  }
  return actions;
}

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/research-assets', express.static(path.join(db.paths.DATA_DIR, 'research')));

// ─── Register all routes ───────────────────────────────────────────────────
// ─── Project & Build Status Helpers ────────────────────────────────────────

function safeProjectName(name) {
  const safe = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!safe) throw new Error('Invalid project name');
  return safe;
}

function getProjectsDir() {
  return path.join(__dirname, 'projects');
}

function getProjectPath(name) {
  const safe = safeProjectName(name);
  const projectPath = path.join(getProjectsDir(), safe);
  const root = getProjectsDir();
  if (!projectPath.startsWith(root)) throw new Error('Invalid project path');
  if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) throw new Error(`Project not found: ${safe}`);
  return { safe, projectPath };
}

function readTextIfExists(filePath, maxChars = 12000) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8').slice(0, maxChars);
}

function detectProjectTypeFromFolder(projectPath, packageJson = null) {
  if (packageJson?.dependencies?.next || fs.existsSync(path.join(projectPath, 'app'))) return 'app';
  if (fs.existsSync(path.join(projectPath, 'index.html'))) return 'site';
  return 'app';
}

function summarisePackage(packageJson) {
  if (!packageJson) return 'No package.json found.';
  const deps = Object.keys(packageJson.dependencies || {}).slice(0, 18);
  const devDeps = Object.keys(packageJson.devDependencies || {}).slice(0, 12);
  return [
    `Package name: ${packageJson.name || 'unknown'}`,
    `Scripts: ${Object.keys(packageJson.scripts || {}).join(', ') || 'none'}`,
    `Dependencies: ${deps.join(', ') || 'none'}`,
    `Dev dependencies: ${devDeps.join(', ') || 'none'}`,
  ].join('\n');
}

function buildProjectInventory(projectPath) {
  const ignore = new Set(['node_modules', '.next', 'dist', 'build', '.git']);
  const entries = [];
  function walk(dir, depth = 0) {
    if (depth > 2 || entries.length > 80) return;
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignore.has(item.name) || item.name.startsWith('.env')) continue;
      const rel = path.relative(projectPath, path.join(dir, item.name));
      entries.push(`${item.isDirectory() ? 'd' : 'f'} ${rel}`);
      if (item.isDirectory()) walk(path.join(dir, item.name), depth + 1);
    }
  }
  walk(projectPath);
  return entries.join('\n');
}

function createBlueprintFromProjectFolder(projectPath, name, packageJson) {
  const blueprint = readTextIfExists(path.join(projectPath, 'blueprint.md'));
  if (blueprint.trim()) return { blueprint, source: 'blueprint.md' };

  const readme = readTextIfExists(path.join(projectPath, 'README.md'), 6000);
  const claude = readTextIfExists(path.join(projectPath, 'CLAUDE.md'), 2000);
  const packageSummary = summarisePackage(packageJson);
  const inventory = buildProjectInventory(projectPath);

  return {
    source: 'project-folder-reconstruction',
    blueprint: [
      `# Project Blueprint`,
      ``,
      `## Imported Project`,
      `- Project folder: ${name}`,
      `- Source: reconstructed from existing project files because no blueprint.md was present.`,
      ``,
      `## README Extract`,
      readme || 'No README.md found.',
      ``,
      `## Package / Stack Signals`,
      '```text',
      packageSummary,
      '```',
      ``,
      claude ? `## Agent Notes\n${claude}\n` : '',
      `## File Inventory`,
      '```text',
      inventory || 'No readable project files found.',
      '```',
    ].filter(Boolean).join('\n'),
  };
}

function listImportableProjects() {
  const projectsDir = getProjectsDir();
  if (!fs.existsSync(projectsDir)) return [];

  return fs.readdirSync(projectsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const projectPath = path.join(projectsDir, entry.name);
      const packagePath = path.join(projectPath, 'package.json');
      let packageJson = null;
      if (fs.existsSync(packagePath)) {
        try { packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8')); } catch {}
      }
      const { blueprint, source } = createBlueprintFromProjectFolder(projectPath, entry.name, packageJson);
      const existing = db.getDraftByProjectName(entry.name);
      return {
        name: entry.name,
        path: projectPath,
        projectType: detectProjectTypeFromFolder(projectPath, packageJson),
        packageName: packageJson?.name || entry.name,
        source,
        hasBlueprint: fs.existsSync(path.join(projectPath, 'blueprint.md')),
        alreadyImported: Boolean(existing),
        existingDraftId: existing?.id || null,
        blueprint,
      };
    })
    .filter(project => project.blueprint && project.blueprint.trim());
}

function readTail(filePath, maxChars = 6000) {
  if (!fs.existsSync(filePath)) return '';
  const stat = fs.statSync(filePath);
  const start = Math.max(0, stat.size - maxChars);
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(stat.size - start);
    fs.readSync(fd, buffer, 0, buffer.length, start);
    return buffer.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

function getProcessLines() {
  try {
    return execFileSync('ps', ['-axo', 'pid,ppid,stat,etime,command'], { encoding: 'utf8', timeout: 2000 }).split('\n');
  } catch {
    return [];
  }
}

function getRunningProcessForProject(projectPath, processLines = getProcessLines()) {
  return processLines.find(line => line.includes(projectPath) && /(opencode|npm run dev|next dev|vite|astro)/i.test(line)) || '';
}

function classifyProjectStatus({ projectPath, hasPackage, hasLog, logTail, runningLine }) {
  if (runningLine) return 'running';
  const tail = String(logTail || '').toLowerCase();
  if (/permission|external_directory|denied|failed|error|traceback|exception|cancelled|aborted/.test(tail)) return 'stalled';
  if (/build (?:complete|completed|finished|successful)|implementation (?:complete|completed)|project (?:complete|completed)|done(?:[.!]|\\s*$)|successfully (?:built|created|implemented)|all (?:set|done)|ready for review|handoff complete|everything is documented in the `?readme/i.test(tail)) return 'completed';
  if (/project scaffold(?:ed| is built)|here'?s what was built/i.test(tail)) return 'completed';
  if (/next steps|todo|remaining|manual|configure|migration|supabase|prisma|env|needs/.test(tail)) return 'needs_review';
  if (hasPackage && (fs.existsSync(path.join(projectPath, 'README.md')) || fs.existsSync(path.join(projectPath, 'app')) || fs.existsSync(path.join(projectPath, 'src')))) return 'needs_review';
  if (hasLog) return 'unknown';
  return hasPackage ? 'needs_review' : 'unknown';
}

function getBuildStatus() {
  const projectsDir = getProjectsDir();
  if (!fs.existsSync(projectsDir)) return { projects: [], summary: { tracked: 0, running: 0, stalled: 0, failed: 0, needs_review: 0, completed: 0, unknown: 0 } };
  const overrides = new Map(db.getProjectStatusOverrides().map(row => [row.project_name, row]));
  const processLines = getProcessLines();
  const projects = fs.readdirSync(projectsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const projectPath = path.join(projectsDir, entry.name);
      const logPaths = ['opencode-handoff.log', 'opencode-resume.log'].map(file => path.join(projectPath, file));
      const newestLog = logPaths
        .filter(file => fs.existsSync(file))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
      const hasPackage = fs.existsSync(path.join(projectPath, 'package.json'));
      const hasBlueprint = fs.existsSync(path.join(projectPath, 'blueprint.md'));
      const logTail = newestLog ? readTail(newestLog, 3500) : '';
      const runningLine = getRunningProcessForProject(projectPath, processLines);
      const autoStatus = classifyProjectStatus({ projectPath, hasPackage, hasLog: Boolean(newestLog), logTail, runningLine });
      const override = overrides.get(entry.name);
      const status = override?.status || autoStatus;
      return {
        name: entry.name,
        path: projectPath,
        status,
        autoStatus,
        manualStatus: override?.status || null,
        statusNote: override?.note || null,
        statusUpdatedAt: override?.updated_at || null,
        hasPackage,
        hasBlueprint,
        hasLog: Boolean(newestLog),
        logPath: newestLog,
        logTail,
        running: Boolean(runningLine),
        runningProcess: runningLine.trim(),
        updatedAt: newestLog ? fs.statSync(newestLog).mtime.toISOString() : fs.statSync(projectPath).mtime.toISOString(),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const summary = { tracked: projects.length, running: 0, stalled: 0, failed: 0, needs_review: 0, completed: 0, unknown: 0 };
  for (const project of projects) {
    summary[project.status] = (summary[project.status] || 0) + 1;
  }
  return { projects, summary };
}

function buildResumePrompt(projectName) {
  return [
    `Continue the stalled build for ${projectName}.`,
    'Read blueprint.md, README.md, package.json, and any opencode logs first.',
    'Finish the most useful first-pass implementation without requiring real secrets.',
    'If credentials are needed, update .env.example and document exact setup steps.',
    'Prioritise getting the app scaffold runnable, then write a concise completion report.'
  ].join(' ');
}

function buildOpencodeArgs(prompt, projectPath) {
  return ['--model', 'opencode-go/deepseek-v4-flash', 'run', prompt, '--dir', projectPath];
}

function commandPreview(command, args) {
  return [command, ...args.map(arg => /\s/.test(arg) ? JSON.stringify(arg) : arg)].join(' ');
}

const deps = {
  db,
  TEMPLATES,
  DESIGN_SYSTEMS,
  workspace,
  designSystemCache,
  getSystemPrompt,
  getTemplate,
  formatTemplateForPrompt,
  ensureDesignSystem,
  CLARIFY_SYSTEM_PROMPT,
  CLARIFY_NUM_PREDICT,
  BLUEPRINT_NUM_PREDICT,
  OLLAMA_BASE_URL,
  OLLAMA_TAGS_URL,
  CLOUD_TIMEOUT_MS,
  activeBuildControllers,
  buildSessions,
  safeProjectName,
  getProjectPath,
  buildResumePrompt,
  buildOpencodeArgs,
  commandPreview,
  listImportableProjects,
  getBuildStatus,
  callOllamaModel,
  callCloudModel,
  getCloudModelName,
  extractJsonObject,
  normaliseClarifyResult,
  scrapeURLFast,
  scrapeRenderedURL,
  formatResearchForPrompt,
  inferProviderFromModel,
  CLOUD_MODELS,
  rootDir: __dirname,
};

registerAllRoutes(app, deps);

// ─── Start server ──────────────────────────────────────────────────────────
(async () => {
  try {
    await db.init();
    app.listen(PORT, () => {
      console.log(`\n🔥 Cauldron OS v0.250 — Witch Daddy Labs (Unification Sprint 4)`);
      console.log(`   Merged features from public open-source + private advanced builds`);
      console.log(`   Master Brain upgrades loaded:`);
      console.log(`   • Impeccable Taste (Grendel)`);
      console.log(`   • Design Reference Selector (Camillo & Grendel)`);
      console.log(`   • URL Research Sweep (Grendel)`);
      console.log(`   • Annoying PM Mode / Interrogate Idea`);
      console.log(`   • XML Tool Agent System (agent-loop, tools, workspace)`);
      console.log(`   • Build Pipeline (start / generate / refine / stop)`);
      console.log(`   • Research History & Project Status Records`);
      console.log(`   • Scaffold Templates & OpenCode Handoff`);
      console.log(`   Server running at http://localhost:${PORT}`);
      console.log(`   Data directory: ${db.paths.DATA_DIR}\n`);
    });
  } catch (err) {
    console.error('[Cauldron] Failed to initialise database:', err);
    process.exit(1);
  }
})();
