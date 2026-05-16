/**
 * Cauldron OS v0.240 — Unification Sprint 1
 * Witch Daddy Labs
 *
 * Merged codebase: public open-source features + private advanced features.
 * Upgrades:
 * 1. Impeccable Taste Prompt Injection (Grendel)
 * 2. Design Reference Selector (Camilo & Grendel)
 * 3. URL Research Sweep (Grendel)
 * 4. Annoying PM Mode / Interrogate Idea
 * 5. XML Tool Agent System (agent-loop, tools, workspace)
 * 6. Build Pipeline (build/start, generate, refine, stop)
 * 7. Research History & Project Status Records
 * 8. Scaffold Templates & OpenCode Handoff
 * 9. OpenAI-compatible Chat Completions Proxy
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

const app = express();
const PORT = Number(process.env.PORT || 3000);
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_URL = `${OLLAMA_BASE_URL}/api/generate`;
const OLLAMA_TAGS_URL = `${OLLAMA_BASE_URL}/api/tags`;
const OLLAMA_TIMEOUT_MS = 600000;
const CLOUD_TIMEOUT_MS = 300000;
const CLARIFY_NUM_PREDICT = Number(process.env.CAULDRON_CLARIFY_NUM_PREDICT || 2048);
const BLUEPRINT_NUM_PREDICT = Number(process.env.CAULDRON_BLUEPRINT_NUM_PREDICT || 8192);
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
  'refero-hyperstudio':{ name: 'Hyperstudio (Amber Monochrome)',         uuid: '8eb9c53e-d69c-497a-b640-610856cf3a60' },
  'refero-generalint': { name: 'General Intelligence (Night Sky)',       uuid: '34baa524-5d5b-4165-bbab-d01f05e6d6b9' },
  'refero-mercury':    { name: 'Mercury (Mountain Top Command)',         uuid: '3172cd4d-118a-4a16-a259-6b634d32322e' },
  'refero-elevenlabs': { name: 'ElevenLabs (Architect Blueprint)',       uuid: '031056ff-7af1-46db-8daa-115f731c5d26' },
  'refero-monopo':     { name: 'Monopo Saigon (Gradient Depths)',        uuid: '3e52dd36-6ab1-48c6-bc40-47ef6d33abc2' },
  'refero-minimal':    { name: 'Minimalissimo (White Gallery)',          uuid: '35ff063b-1fcc-48a2-83b3-56da01e23880' },
  'refero-stripe':     { name: 'Stripe (Architectural White)',           uuid: '48e5de76-05d5-4c4e-a269-c7c245b291ec' },
};

const OPENAI_BASE_URL = 'https://api.openai.com/v1/chat/completions';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/research-assets', express.static(path.join(db.paths.DATA_DIR, 'research')));

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
  // Refero styles — prefixed with 'refero-' for ID, flagged with __refero
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
    id: 'react-vite-tailwind',
    name: 'React + Vite + Tailwind',
    projectType: 'app',
    scaffold: 'react-vite-tailwind',
    recommendedUse: 'client-heavy dashboards, tools, and rich interactive MVPs',
    files: ['package.json', 'index.html', 'src/App.jsx', 'src/main.jsx', 'src/styles.css', 'README.md', 'blueprint.md', 'cauldron.project.json'],
    promptBias: 'Plan a React + Vite + Tailwind app with clear component boundaries, local state first (useState/useReducer), accessible interactions, and pragmatic package choices. Include loading/error/empty states for every data-dependent component. The HTML preview should demonstrate the core UI with working state management.',
  },
  {
    id: 'next-app-router',
    name: 'Next.js App Router',
    projectType: 'app',
    scaffold: 'next-app-router',
    recommendedUse: 'production-minded web apps needing routing, server actions, auth, or deployment structure',
    files: ['package.json', 'app/page.tsx', 'app/layout.tsx', 'app/globals.css', 'README.md', 'blueprint.md', 'cauldron.project.json'],
    promptBias: 'Plan a Next.js App Router implementation with crisp route structure, server/client boundaries, data model notes, and deployment assumptions. Include demo-mode fallback for auth and data so the app is previewable without a real backend. The HTML preview should show the core app shell with working navigation.',
  },
];

function getTemplate(templateId = '') {
  return TEMPLATES.find(t => t.id === templateId) || null;
}

function formatTemplateForPrompt(template) {
  if (!template) return '';
  return [
    `# Template Target: ${template.name}`,
    `Scaffold: ${template.scaffold}`,
    `Project type: ${template.projectType}`,
    `Best for: ${template.recommendedUse}`,
    `Expected files: ${template.files.join(', ')}`,
    '',
    'Template guidance:',
    template.promptBias,
    '',
    'When generating the blueprint, align architecture, preview code, handoff notes, and implementation assumptions to this template target.'
  ].join('\n');
}

// Active build controllers — for cancellation via POST /api/build/stop
const activeBuildControllers = new Map();
// Build session store — tracks build session metadata
const buildSessions = new Map();

// ─── 1. IMPECCABLE TASTE PROMPT (Grendel) ────────────────────────────────────
const DESIGN_GUIDE = `
ANTI-PATTERNS:
- Never default to Inter or Roboto fonts. Prefer system fonts or brand-specific typefaces.
- Never use pure black (#000); always tint it with the primary color or use deep charcoal.
- Avoid nested cards (cards inside cards) — embrace negative space and breathing room.
- Stop using generic blue gradients. Opt for nuanced monochromatic or duotone gradients.
- Never generate placeholder/wireframe HTML — the preview must be a working, interactive app.

MANDATES:
- High-contrast typography: large headings, generous line-height (1.6–1.8), clear hierarchy.
- Generous vertical rhythm: consistent spacing scale (multiples of 4px or 8px).
- Subtle border highlights: use rgba(255,255,255,0.1) or rgba(0,0,0,0.1) for depth.
- Premium aesthetic logic: spatial design first, intentional component states, clean micro-interactions.
- Component states: define exhausted hover/focus/active/disabled states for every interactive element.
- Borders: 1px solid rgba(255,255,255,0.1); hover → 1px solid rgba(255,255,255,0.2).
- Text: headings 600–700 weight; body never below 400. Line-clamp for truncation, never ellipsis overflow.
`;

const APP_SYSTEM_PROMPT = `You are a senior technical architect with impeccable taste.
Turn the user's product idea into a concise app blueprint.

${DESIGN_GUIDE}

Use exactly these sections:

# Project Blueprint

## PRD
- App Concept
- Core Features
- Target Users

## Database Schema
Provide one JSON code block with likely tables, fields, and relationships.

## Security Posture
- Auth / permissions
- Validation / rate limiting
- Secrets / data protection

## Architecture Notes
- Frontend
- Backend / APIs
- Database
- Hosting / deployment
- Integrations

At the end, include one HTML code block that previews the core app UI as a self-contained HTML + AlpineJS prototype.
Use triple backticks with html. Include Alpine via CDN when interactivity is useful, use x-data/x-show/x-for/click handlers for quick prototype behaviour, and keep the markup runnable in a sandboxed iframe.

Be concise, practical, and specific. No fluff.`;

const SITE_SYSTEM_PROMPT = `You are a sharp product designer and front-end planner with impeccable taste.
Turn the user's idea into a concise static-site blueprint.

${DESIGN_GUIDE}

Use exactly these sections:

# Project Blueprint

## PRD
- Site Concept
- Key Sections
- Target Audience

## Content Structure
Provide one JSON code block with page sections, modules, and content slots.

## Security Posture
- Form handling
- Validation / spam protection
- Secrets / data protection

## Architecture Notes
- Frontend
- Hosting / deployment
- CMS / content handling
- Analytics / integrations
- Performance / SEO

At the end, include one HTML code block that previews the landing page or site layout as a self-contained HTML + AlpineJS prototype.
Use triple backticks with html. Include Alpine via CDN when interactivity is useful, use x-data/x-show/x-for/click handlers for quick prototype behaviour, and keep the markup runnable in a sandboxed iframe.

Prioritise clean layout, hierarchy, and conversion clarity. No fluff.`;

const CLARIFY_SYSTEM_PROMPT = `You are a blunt senior product manager helping a non-developer clarify an app/site idea before any code is planned.

Return JSON only. No markdown. No commentary.

Schema:
{
  "questions": [
    { "id": "short-kebab-id", "label": "Question?", "why": "Short reason." }
  ],
  "assumptions": ["Short assumption."],
  "redFlags": ["Short risk or ambiguity."],
  "suggestedScope": ["Short scope suggestion."]
}

Rules:
- Ask 5 to 8 questions.
- Be practical, specific, and slightly jaded, not cute.
- Prioritise scope, users, workflows, data, risk, version one, and what not to build.
- Do not ask generic startup questions about markets or growth unless clearly relevant.
- Keep every question answerable by a non-developer.
- Keep assumptions, redFlags, and suggestedScope short.
- Never invent implementation details as facts.`;

function getSystemPrompt(projectType = 'app', designReference = '') {
  let base = projectType === 'site' ? SITE_SYSTEM_PROMPT : APP_SYSTEM_PROMPT;
  
  if (designReference && designReference !== 'none') {
    const designContent = designSystemCache.get(designReference);
    if (designContent) {
      base = `# Design Reference: ${DESIGN_SYSTEMS[designReference].name}\n\n${designContent}\n\n---\n\n${base}`;
    }
  }
  
  return base;
}

const CLOUD_MODELS = {
  gemini: {
    defaultModel: 'gemini-3.1-flash-lite-preview',
    models: ['gemini-3.1-flash-lite-preview', 'gemini-3.1-pro-preview'],
    labels: {
      'gemini-3.1-flash-lite-preview': 'Gemini Flash 3.1 Lite Preview',
      'gemini-3.1-pro-preview': 'Gemini Pro 3.1 Preview',
    },
  },
  openai: {
    defaultModel: 'gpt-5.4',
    models: ['gpt-5.4'],
    labels: {
      'gpt-5.4': 'GPT-5.4',
    },
  },
};

function getCloudModelName(provider, _projectType = 'app', requestedModel = '') {
  const config = CLOUD_MODELS[provider];
  if (!config) throw new Error(`Unsupported cloud provider: ${provider}`);
  if (requestedModel && config.models.includes(requestedModel)) return requestedModel;
  return config.defaultModel;
}

function extractJsonObject(text = '') {
  const trimmed = String(text).trim();
  try {
    return JSON.parse(trimmed);
  } catch {}

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return JSON.parse(trimmed.slice(first, last + 1));
  }

  throw new Error('Model did not return a JSON object');
}

function normaliseClarifyResult(raw) {
  const fallback = {
    questions: [],
    assumptions: [],
    redFlags: [],
    suggestedScope: [],
  };

  const result = { ...fallback, ...(raw || {}) };
  result.questions = Array.isArray(result.questions)
    ? result.questions.slice(0, 8).map((q, index) => {
        const id = String(q?.id || `question-${index + 1}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `question-${index + 1}`;
        return {
          id,
          label: String(q?.label || q?.question || '').trim(),
          why: String(q?.why || '').trim(),
        };
      }).filter(q => q.label)
    : [];

  result.assumptions = Array.isArray(result.assumptions) ? result.assumptions.slice(0, 4).map(String) : [];
  result.redFlags = Array.isArray(result.redFlags) ? result.redFlags.slice(0, 4).map(String) : [];
  result.suggestedScope = Array.isArray(result.suggestedScope) ? result.suggestedScope.slice(0, 5).map(String) : [];

  if (result.questions.length === 0) {
    throw new Error('Model returned no clarifying questions');
  }

  return result;
}

// ─── 2. DESIGN REFERENCE FETCHER ────────────────────────────────────────────
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

// ─── 3. URL RESEARCH SCRAPER (Grendel) ───────────────────────────────────────
function scrapeURL(targetUrl, callback) {
  try {
    new URL(targetUrl);
  } catch {
    return callback(new Error('Invalid URL'), null);
  }

  const protocol = targetUrl.startsWith('https') ? https : http;
  
  protocol.get(targetUrl, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', async () => {
      try {
        const findings = await analyseHTML(raw, targetUrl);
        callback(null, findings);
      } catch (err) {
        callback(err, null);
      }
    });
  }).on('error', callback);
}

async function analyseHTML(html, baseUrl) {
  const findings = {
    url: baseUrl,
    fonts: [],
    colors: {},
    cssVars: {},
    structureNotes: []
  };

  const fontLinks = html.match(/fonts\.googleapis\.com[^"'>]*/g) || [];
  findings.fonts = fontLinks.map(link => {
    const match = link.match(/family=([^:&]+)/);
    return match ? match[1] : null;
  }).filter(Boolean);

  const customProps = html.match(/--[\w-]+\s*:\s*[^;]+/g) || [];
  findings.cssVars = {};
  customProps.forEach(prop => {
    const [name, value] = prop.split(':').map(s => s.trim());
    if (name && value) findings.cssVars[name] = value;
  });

  const colors = html.match(/#[0-9A-Fa-f]{3,6}|rgb\([^)]+\)|hsl\([^)]+\)/g) || [];
  findings.colors = [...new Set(colors)].slice(0, 20);

  if (html.includes('class="container"') || html.includes('class="wrapper"')) {
    findings.structureNotes.push('Uses container/wrapper layout');
  }
  if (html.includes('flex') || html.includes('grid')) {
    findings.structureNotes.push('Uses modern CSS layout (flex/grid)');
  }
  if (html.includes('border-radius')) {
    findings.structureNotes.push('Rounded corners present');
  }
  if (html.includes('box-shadow')) {
    findings.structureNotes.push('Applies drop shadows');
  }

  return findings;
}

function formatResearchForPrompt(findings) {
  if (!findings) return '';
  
  const summary = [];
  summary.push(`## Research Findings from ${findings.url}`);
  
  if (findings.fonts.length) {
    summary.push(`\n**Typography:** ${findings.fonts.join(', ')}`);
  }
  
  if (Object.keys(findings.cssVars).length) {
    summary.push('\n**CSS Variables:**');
    Object.entries(findings.cssVars).forEach(([k, v]) => {
      summary.push(`  - ${k}: ${v}`);
    });
  }
  
  if (findings.colors.length) {
    summary.push(`\n**Color Palette:** ${findings.colors.join(', ')}`);
  }
  
  if (findings.structureNotes.length) {
    summary.push(`\n**Layout Patterns:** ${findings.structureNotes.join('; ')}`);
  }
  
  return summary.join('\n');
}

// ─── Helper Functions for Build/Pipeline Routes ──────────────────────────────

function normaliseOpenAICompatibleChatUrl(baseUrl = '') {
  const raw = String(baseUrl || '').trim() || OPENAI_BASE_URL;
  if (raw.endsWith('/chat/completions')) return raw;
  return raw.replace(/\/$/, '').replace(/\/v1$/, '/v1') + '/chat/completions';
}

function modelRequiresDefaultTemperature(model = '') {
  const id = String(model || '').toLowerCase();
  return id.startsWith('gpt-5') || id.startsWith('o1') || id.startsWith('o3') || id.startsWith('o4');
}

function buildChatPayload({ model, messages, temperature, stream = false }) {
  const payload = { model, messages };
  if (stream) payload.stream = true;
  if (!modelRequiresDefaultTemperature(model)) payload.temperature = temperature;
  return payload;
}

function inferProviderFromModel(model = '') {
  const id = String(model || '').toLowerCase();
  if (id.startsWith('gemini-')) return 'gemini';
  if (id.startsWith('gpt-') || id.startsWith('o') || id.startsWith('chatgpt-')) return 'openai';
  if (id.startsWith('claude-') || id.startsWith('anthropic.')) return 'anthropic';
  if (id.startsWith('bedrock-') || id.includes('.claude-')) return 'bedrock';
  if (id.startsWith('nvidia/') || id.startsWith('nv-')) return 'nim';
  if (id.startsWith('glm-') || id.startsWith('qwen') || id.startsWith('kimi') || id.startsWith('deepseek')) return 'openai';
  return 'openai';
}

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
  if (/build (?:complete|completed|finished|successful)|implementation (?:complete|completed)|project (?:complete|completed)|done(?:[.!]|\s*$)|successfully (?:built|created|implemented)|all (?:set|done)|ready for review|handoff complete|everything is documented in the `?readme/i.test(tail)) return 'completed';
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

// ─── 3. URL RESEARCH SCRAPER (Grendel) ───────────────────────────────────────
function validateHttpUrl(targetUrl) {
  const parsed = new URL(targetUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only http/https URLs are supported');
  return parsed;
}

function scrapeURL(targetUrl, callback) {
  // Quick URL validation
  let parsed;
  try {
    parsed = validateHttpUrl(targetUrl);
  } catch {
    return callback(new Error('Invalid URL'), null);
  }

  const protocol = parsed.protocol === 'https:' ? https : http;
  
  protocol.get(targetUrl, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', async () => {
      try {
        const findings = await analyseHTML(raw, targetUrl);
        callback(null, findings);
      } catch (err) {
        callback(err, null);
      }
    });
  }).on('error', callback);
}

async function analyseHTML(html, baseUrl) {
  // Very lightweight extraction — no heavy DOM libs needed
  const findings = {
    mode: 'fast',
    url: baseUrl,
    fonts: [],
    colors: {},
    cssVars: {},
    structureNotes: []
  };

  // Extract fonts from Google Fonts or inline style links
  const fontLinks = html.match(/fonts\.googleapis\.com[^"'>]*/g) || [];
  findings.fonts = fontLinks.map(link => {
    const match = link.match(/family=([^:&]+)/);
    return match ? match[1] : null;
  }).filter(Boolean);

  // Extract CSS custom properties (--*)
  const customProps = html.match(/--[\w-]+\s*:\s*[^;]+/g) || [];
  findings.cssVars = {};
  customProps.forEach(prop => {
    const [name, value] = prop.split(':').map(s => s.trim());
    if (name && value) findings.cssVars[name] = value;
  });

  // Color extraction (hex/rgb/hsl)
  const colors = html.match(/#[0-9A-Fa-f]{3,6}|rgb\([^)]+\)|hsl\([^)]+\)/g) || [];
  findings.colors = [...new Set(colors)].slice(0, 20); // dedupe, top 20

  // Structure hints
  if (html.includes('class="container"') || html.includes('class="wrapper"')) {
    findings.structureNotes.push('Uses container/wrapper layout');
  }
  if (html.includes('flex') || html.includes('grid')) {
    findings.structureNotes.push('Uses modern CSS layout (flex/grid)');
  }
  if (html.includes('border-radius')) {
    findings.structureNotes.push('Rounded corners present');
  }
  if (html.includes('box-shadow')) {
    findings.structureNotes.push('Applies drop shadows');
  }

  return findings;
}

function rgbToHex(value) {
  const match = String(value || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return value;
  return `#${[match[1], match[2], match[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('')}`;
}

function researchAssetPaths(targetUrl) {
  const hash = crypto.createHash('sha1').update(`${targetUrl}-${Date.now()}`).digest('hex').slice(0, 16);
  const dir = path.join(db.paths.DATA_DIR, 'research', 'screenshots');
  fs.mkdirSync(dir, { recursive: true });
  return {
    screenshotPath: path.join(dir, `${hash}.png`),
    screenshotUrl: `/research-assets/screenshots/${hash}.png`,
  };
}

async function scrapeRenderedURL(targetUrl) {
  validateHttpUrl(targetUrl);
  const { screenshotPath, screenshotUrl } = researchAssetPaths(targetUrl);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const rendered = await page.evaluate(() => {
      const visible = Array.from(document.querySelectorAll('body *')).filter(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      }).slice(0, 160);
      const pick = (property) => [...new Set(visible.map(el => window.getComputedStyle(el)[property]).filter(Boolean))].slice(0, 30);
      const rootStyle = window.getComputedStyle(document.documentElement);
      const cssVars = {};
      for (const name of rootStyle) {
        if (name.startsWith('--')) cssVars[name] = rootStyle.getPropertyValue(name).trim();
      }
      const structureNotes = [];
      const bodyText = document.body?.innerText || '';
      if (document.querySelector('header, nav')) structureNotes.push('Rendered header/navigation present');
      if (document.querySelector('main')) structureNotes.push('Uses semantic main content area');
      if (visible.some(el => ['grid', 'inline-grid'].includes(window.getComputedStyle(el).display))) structureNotes.push('Rendered grid layout detected');
      if (visible.some(el => window.getComputedStyle(el).display.includes('flex'))) structureNotes.push('Rendered flex layout detected');
      if (visible.some(el => window.getComputedStyle(el).boxShadow !== 'none')) structureNotes.push('Rendered shadows present');
      if (visible.some(el => parseFloat(window.getComputedStyle(el).borderRadius) > 0)) structureNotes.push('Rendered rounded corners present');
      return {
        title: document.title || '',
        fonts: pick('fontFamily'),
        textColors: pick('color'),
        backgroundColors: pick('backgroundColor').filter(color => !['rgba(0, 0, 0, 0)', 'transparent'].includes(color)),
        borderColors: pick('borderColor'),
        radii: pick('borderRadius'),
        shadows: pick('boxShadow').filter(value => value !== 'none'),
        fontSizes: pick('fontSize'),
        cssVars,
        structureNotes,
        htmlStructure: Array.from(document.body?.children || []).slice(0, 16).map(el => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.className ? `.${String(el.className).trim().split(/\s+/).slice(0, 3).join('.')}` : '')),
        textSample: bodyText.slice(0, 500),
      };
    });

    const colors = [...new Set([
      ...rendered.textColors,
      ...rendered.backgroundColors,
      ...rendered.borderColors,
      ...Object.values(rendered.cssVars).filter(value => /^#|rgb|hsl/i.test(value)),
    ].map(rgbToHex))].slice(0, 32);

    return {
      mode: 'deep',
      url: targetUrl,
      title: rendered.title,
      fonts: rendered.fonts,
      colors,
      cssVars: rendered.cssVars,
      structureNotes: rendered.structureNotes,
      htmlStructure: rendered.htmlStructure,
      textSample: rendered.textSample,
      screenshotPath,
      screenshotUrl,
      viewport: { width: 1440, height: 1200 },
      computedStyles: {
        fonts: rendered.fonts,
        colors,
        radii: rendered.radii,
        shadows: rendered.shadows,
        fontSizes: rendered.fontSizes,
      },
    };
  } finally {
    await browser.close();
  }
}

function formatResearchForPrompt(findings) {
  if (!findings) return '';
  
  const summary = [];
  summary.push(`## Research Findings from ${findings.url}`);
  
  if (findings.fonts && findings.fonts.length) {
    summary.push(`\n**Typography:** ${findings.fonts.join(', ')}`);
  }
  
  if (findings.cssVars && Object.keys(findings.cssVars).length) {
    summary.push('\n**CSS Variables:**');
    Object.entries(findings.cssVars).forEach(([k, v]) => {
      summary.push(`  - ${k}: ${v}`);
    });
  }
  
  if (findings.colors && findings.colors.length) {
    summary.push(`\n**Color Palette:** ${findings.colors.join(', ')}`);
  }
  
  if (findings.structureNotes && findings.structureNotes.length) {
    summary.push(`\n**Layout Patterns:** ${findings.structureNotes.join('; ')}`);
  }

  if (findings.mode === 'deep') {
    if (findings.screenshotUrl) summary.push(`\n**Screenshot:** ${findings.screenshotUrl}`);
    if (findings.computedStyles?.radii?.length) summary.push(`\n**Rendered Radii:** ${findings.computedStyles.radii.slice(0, 8).join(', ')}`);
    if (findings.computedStyles?.shadows?.length) summary.push(`\n**Rendered Shadows:** ${findings.computedStyles.shadows.slice(0, 4).join(' | ')}`);
    if (findings.htmlStructure?.length) summary.push(`\n**Rendered Structure:** ${findings.htmlStructure.join(' → ')}`);
  }
  
  return summary.join('\n');
}

// ─── Cloud Agent Build Helper ─────────────────────────────────────────────────

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

// ─── API ROUTES ──────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Cauldron OS v0.240' });
});

function normaliseLimitOffset(query) {
  return {
    limit: Math.min(Math.max(Number(query.limit) || 50, 1), 200),
    offset: Math.max(Number(query.offset) || 0, 0),
  };
}

function sendMarkdownDownload(res, filename, markdown) {
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(markdown);
}

// Drafts API — local-first public feature. Runtime files live in ./data.
app.get('/api/drafts', (req, res) => {
  try {
    const { limit, offset } = normaliseLimitOffset(req.query);
    const drafts = db.getAllDrafts(limit, offset, req.query.q || '');
    res.json({ success: true, drafts, total: db.countDrafts() });
  } catch (err) {
    console.error('[Cauldron] Draft list error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch drafts', details: err.message });
  }
});

app.post('/api/drafts', (req, res) => {
  try {
    const { projectName, brainDump = '', blueprint, designReference = 'none', generationMode = 'local', modelUsed = null } = req.body;
    if (!projectName || !blueprint) {
      return res.status(400).json({ success: false, error: 'projectName and blueprint are required' });
    }

    const result = db.createDraft({ projectName, brainDump, blueprint, designReference, generationMode, modelUsed });
    db.createSession({
      sessionId: req.headers['x-session-id'] || db.generateSessionId(),
      brainDump,
      designReference,
      generationMode,
      modelUsed,
      draftId: result.id,
    });

    res.json({ success: true, draftId: result.id, filename: result.filename });
  } catch (err) {
    console.error('[Cauldron] Save draft error:', err);
    res.status(500).json({ success: false, error: 'Failed to save draft', details: err.message });
  }
});

app.get('/api/drafts/:id', (req, res) => {
  try {
    const draft = db.getDraftById(req.params.id);
    if (!draft) return res.status(404).json({ success: false, error: 'Draft not found' });
    res.json({ success: true, draft });
  } catch (err) {
    console.error('[Cauldron] Draft fetch error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch draft', details: err.message });
  }
});

app.get('/api/drafts/:id/export.md', (req, res) => {
  try {
    const draft = db.getDraftById(req.params.id);
    if (!draft) return res.status(404).json({ success: false, error: 'Draft not found' });
    const safeName = String(draft.project_name || 'cauldron-draft').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cauldron-draft';
    sendMarkdownDownload(res, `${safeName}.md`, draft.blueprint || '');
  } catch (err) {
    console.error('[Cauldron] Draft export error:', err);
    res.status(500).json({ success: false, error: 'Failed to export draft', details: err.message });
  }
});

app.delete('/api/drafts/:id', (req, res) => {
  try {
    const ok = db.deleteDraft(req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: 'Draft not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Cauldron] Delete draft error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete draft', details: err.message });
  }
});

app.get('/api/history', (req, res) => {
  try {
    const { limit, offset } = normaliseLimitOffset(req.query);
    res.json({ success: true, sessions: db.getSessions(limit, offset), total: db.countSessions() });
  } catch (err) {
    console.error('[Cauldron] History error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch history', details: err.message });
  }
});

app.post('/api/history/cleanup', (req, res) => {
  try {
    const days = Number(req.body.days || 90);
    res.json({ success: true, purged: db.purgeOldDays(days) });
  } catch (err) {
    console.error('[Cauldron] History cleanup error:', err);
    res.status(500).json({ success: false, error: 'Cleanup failed', details: err.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    res.json({
      success: true,
      stats: {
        totalDrafts: db.countDrafts(),
        totalSessions: db.countSessions(),
        totalResearchHistory: typeof db.countResearchHistory === 'function' ? db.countResearchHistory() : 0,
        recentActivity: db.getSessions(10, 0).length,
      },
    });
  } catch (err) {
    console.error('[Cauldron] Stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats', details: err.message });
  }
});

// ─── Research History API ──────────────────────────────────────────────────────

app.get('/api/research-history', (req, res) => {
  try {
    const { limit, offset } = normaliseLimitOffset(req.query);
    const research = db.getResearchHistory({
      limit,
      offset,
      q: req.query.q || '',
      favoriteOnly: req.query.favorite === '1' || req.query.favorite === 'true',
    });
    res.json({ success: true, research, total: db.countResearchHistory() });
  } catch (err) {
    console.error('[Cauldron] Research history error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch research history', details: err.message });
  }
});

app.post('/api/research-history/:id/favorite', (req, res) => {
  try {
    const ok = db.setResearchFavorite(req.params.id, req.body.favorite !== false);
    if (!ok) return res.status(404).json({ success: false, error: 'Research record not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Cauldron] Research favorite error:', err);
    res.status(500).json({ success: false, error: 'Failed to update research favorite', details: err.message });
  }
});

// ─── Templates & Build Status ─────────────────────────────────────────────────

app.get('/api/templates', (req, res) => {
  res.json({ success: true, defaultTemplateId: 'html-alpine', templates: TEMPLATES });
});

app.get('/api/build-status', (req, res) => {
  try {
    res.json({ success: true, ...getBuildStatus() });
  } catch (err) {
    console.error('[Cauldron] Build status error:', err);
    res.status(500).json({ success: false, error: 'Build status failed', details: err.message });
  }
});

// ─── Project Status Overrides ──────────────────────────────────────────────────

app.post('/api/projects/:name/status', (req, res) => {
  try {
    const { safe } = getProjectPath(req.params.name);
    const { status, note = 'manual' } = req.body || {};
    if (!status) return res.status(400).json({ success: false, error: 'status is required' });
    const override = db.setProjectStatusOverride(safe, status, note);
    res.json({ success: true, project: safe, override });
  } catch (err) {
    console.error('[Cauldron] Project status update error:', err);
    res.status(500).json({ success: false, error: 'Project status update failed', details: err.message });
  }
});

app.delete('/api/projects/:name/status', (req, res) => {
  try {
    const { safe } = getProjectPath(req.params.name);
    db.clearProjectStatusOverride(safe);
    res.json({ success: true, project: safe });
  } catch (err) {
    console.error('[Cauldron] Project status reset error:', err);
    res.status(500).json({ success: false, error: 'Project status reset failed', details: err.message });
  }
});

app.post('/api/projects/:name/resume', (req, res) => {
  try {
    const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true' || req.body?.dryRun === true;
    const { safe, projectPath } = getProjectPath(req.params.name);
    const prompt = req.body?.prompt || buildResumePrompt(safe);
    const opencodeArgs = buildOpencodeArgs(prompt, projectPath);
    const command = commandPreview('opencode', opencodeArgs);
    const logPath = path.join(projectPath, 'opencode-resume.log');

    if (dryRun) return res.json({ success: true, dryRun: true, project: safe, command, logPath });

    const outFd = fs.openSync(logPath, 'a');
    fs.appendFileSync(logPath, `\n\n=== Resume launched ${new Date().toISOString()} ===\n${command}\n\n`);
    const child = spawn('opencode', opencodeArgs, { cwd: projectPath, detached: true, stdio: ['ignore', outFd, outFd] });
    child.unref();
    res.json({ success: true, dryRun: false, project: safe, pid: child.pid, command, logPath });
  } catch (err) {
    console.error('[Cauldron] Resume build error:', err);
    res.status(500).json({ success: false, error: 'Resume build failed', details: err.message });
  }
});

app.post('/api/projects/:name/open-visible', (req, res) => {
  try {
    const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true' || req.body?.dryRun === true;
    const { safe, projectPath } = getProjectPath(req.params.name);
    const shellCommand = `cd ${JSON.stringify(projectPath)} && opencode`;

    if (dryRun) return res.json({ success: true, dryRun: true, project: safe, command: shellCommand });

    let child;
    if (process.platform === 'darwin') {
      const osa = [
        'tell application "Terminal"',
        'activate',
        `do script ${JSON.stringify(shellCommand)}`,
        'end tell'
      ].join('\n');
      child = spawn('osascript', ['-e', osa], { detached: true, stdio: 'ignore' });
    } else {
      child = spawn('opencode', [], { cwd: projectPath, detached: true, stdio: 'ignore' });
    }
    child.unref();
    res.json({ success: true, dryRun: false, project: safe, pid: child.pid, command: shellCommand });
  } catch (err) {
    console.error('[Cauldron] Visible OpenCode error:', err);
    res.status(500).json({ success: false, error: 'Visible OpenCode launch failed', details: err.message });
  }
});

app.post('/api/projects/import', (req, res) => {
  try {
    const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true' || req.body?.dryRun === true;
    const projects = listImportableProjects();
    const imported = [];
    const skipped = [];

    if (!dryRun) {
      for (const project of projects) {
        if (project.alreadyImported) {
          skipped.push({ name: project.name, reason: 'already imported', draftId: project.existingDraftId });
          continue;
        }

        const draft = db.createDraft({
          projectName: project.name,
          brainDump: `Imported from existing private project folder: ${project.path}`,
          blueprint: project.blueprint,
          designReference: 'private-project-folder',
          generationMode: 'opencode-import',
          modelUsed: 'opencode-go/deepseek-v4-flash',
        });
        db.createSession({
          sessionId: `import-${project.name}`,
          brainDump: `Imported from existing private project folder: ${project.path}`,
          designReference: 'private-project-folder',
          generationMode: 'opencode-import',
          modelUsed: 'opencode-go/deepseek-v4-flash',
          draftId: draft.id,
        });
        imported.push({ name: project.name, draftId: draft.id, source: project.source });
      }
    }

    res.json({
      success: true,
      dryRun,
      imported: imported.length,
      skipped: skipped.length,
      projects: projects.map(({ blueprint, ...project }) => ({ ...project, blueprintChars: blueprint.length })),
      importedProjects: imported,
      skippedProjects: skipped,
    });
  } catch (err) {
    console.error('[Cauldron] Project import error:', err);
    res.status(500).json({ success: false, error: 'Project import failed', details: err.message });
  }
});

// ─── Cloud Models & Ollama ──────────────────────────────────────────────────────

app.get('/api/cloud-models', (req, res) => {
  res.json({ success: true, providers: CLOUD_MODELS });
});

app.get('/api/ollama-models', async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(OLLAMA_TAGS_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`Ollama ${response.status}`);
    const data = await response.json();
    const models = Array.isArray(data.models)
      ? data.models.map(model => ({
          name: model.name,
          label: model.name,
          size: model.size || null,
          modifiedAt: model.modified_at || null,
        })).filter(model => model.name)
      : [];
    res.json({ success: true, baseUrl: OLLAMA_BASE_URL, models });
  } catch (err) {
    res.status(503).json({ success: false, baseUrl: OLLAMA_BASE_URL, models: [], error: 'Unable to detect Ollama models', details: err.message });
  } finally {
    clearTimeout(timeout);
  }
});

// Get available design systems
app.get('/api/design-systems', (req, res) => {
  const list = Object.entries(DESIGN_SYSTEMS)
    .filter(([key]) => key !== 'none')
    .map(([key, val]) => ({ id: key, name: val.name }));
  res.json({ systems: list });
});

// Pre-load a design system reference into cache
app.post('/api/design-reference', async (req, res) => {
  const { system } = req.body;
  
  if (!system || !DESIGN_SYSTEMS[system]) {
    return res.status(400).json({ error: 'Invalid design system' });
  }
  
  if (designSystemCache.has(system)) {
    return res.json({ cached: true, system });
  }
  
  const { repo, path: filePath } = DESIGN_SYSTEMS[system];
  if (!repo) {
    return res.json({ cached: false, system, content: '' });
  }
  
  fetchDesignSystem(repo, (err, content) => {
    if (err) {
      console.error(`Failed to fetch ${repo}:`, err.message);
      return res.status(500).json({ error: `Failed to fetch design system: ${err.message}` });
    }
    
    designSystemCache.set(system, content);
    res.json({ cached: false, system, content });
  });
});

// Research endpoint — scrape a URL for design signals
app.post('/api/research-url', async (req, res) => {
  const { url, projectName = '', brainDump = '', mode = 'fast' } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }

  const persistAndRespond = (findings) => {
    const formatted = formatResearchForPrompt(findings);
    let researchRecord = null;
    try {
      researchRecord = db.upsertResearchRecord({
        url: findings.url || url,
        source: findings.mode === 'deep' ? 'playwright-deep' : 'url-sweep',
        projectName,
        brainDump,
        findings,
        formatted,
      });
    } catch (recordErr) {
      console.warn('[Cauldron] Research history warning:', recordErr.message);
    }
    res.json({ success: true, findings, formatted, researchId: researchRecord?.id || null, reuseCount: researchRecord?.reuse_count || null });
  };

  if (mode === 'deep') {
    try {
      const findings = await scrapeRenderedURL(url);
      return persistAndRespond(findings);
    } catch (err) {
      console.error('Deep research failed:', err);
      return res.status(500).json({ error: `Deep research failed: ${err.message}` });
    }
  }
  
  scrapeURL(url, (err, findings) => {
    if (err) {
      console.error('Research failed:', err);
      return res.status(500).json({ error: `Research failed: ${err.message}` });
    }
    persistAndRespond(findings);
  });
});

// POST /api/clarify — Ask project-manager questions before blueprint generation
app.post('/api/clarify', async (req, res) => {
  try {
    const { prompt, model, projectType = 'app', apiKey = '', cloudModel = '' } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    const clarifyPrompt = `Project type: ${projectType}\n\nBrain dump:\n${prompt}\n\nAsk the project-manager questions needed before generating a build blueprint.`;
    let rawText = '';

    if (['openai', 'gemini'].includes(model)) {
      if (!apiKey) {
        return res.status(400).json({ error: 'Missing API key', details: `No API key was provided for ${model}.` });
      }
      rawText = await callCloudModel({
        provider: model,
        apiKey,
        prompt: clarifyPrompt,
        systemPrompt: CLARIFY_SYSTEM_PROMPT,
        projectType,
        requestedModel: cloudModel,
      });
    } else {
      rawText = await callOllamaModel({
        model,
        prompt: clarifyPrompt,
        systemPrompt: CLARIFY_SYSTEM_PROMPT,
        numPredict: CLARIFY_NUM_PREDICT,
        temperature: 0.35,
      });
    }

    const questions = normaliseClarifyResult(extractJsonObject(rawText));
    res.json({ success: true, ...questions });
  } catch (err) {
    console.error('Clarify error:', err);
    res.status(500).json({ error: 'Clarification failed', details: err.message });
  }
});

// POST /api/generate — Routes to local Ollama or cloud models
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, model, projectType = 'app', apiKey = '', designReference = 'none', researchData = null, cloudModel = '', researchUrl = '', templateId = '' } = req.body;
    
    await ensureDesignSystem(designReference);
    let systemPrompt = getSystemPrompt(projectType, designReference);

    // Inject template guidance if specified
    if (templateId) {
      const template = getTemplate(templateId);
      if (template) {
        systemPrompt += `\n\n${formatTemplateForPrompt(template)}`;
      }
    }
    
    // Inject dedicated research URL
    if (researchUrl) {
      systemPrompt += `\n\n## User-provided research URL\n${researchUrl}\nUse this as a visual/reference target when relevant.`;
    }

    // Inject research findings if provided
    if (researchData && researchData.formatted) {
      systemPrompt += `\n\n${researchData.formatted}\n\nUse these design signals to match the visual language and structure.`;
    }
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }
    
    // Cloud models
    if (['openai', 'gemini'].includes(model)) {
      if (!apiKey) {
        return res.status(400).json({
          error: 'Missing API key',
          details: `No API key was provided for ${model}. Add it in Cloud Cauldron and try again.`
        });
      }
      
      const modelUsed = getCloudModelName(model, projectType, cloudModel);
      const blueprint = await callCloudModel({
        provider: model,
        apiKey,
        prompt,
        systemPrompt,
        projectType,
        requestedModel: cloudModel,
      });
      
      db.createSession({
        sessionId: req.headers['x-session-id'] || db.generateSessionId(),
        brainDump: prompt,
        urlResearch: researchData || null,
        designReference,
        generationMode: 'cloud',
        modelUsed,
        draftId: null,
      });
      return res.json({ success: true, blueprint, canHandoff: true, modelUsed, providerUsed: model });
    }
    
    // Local models → Ollama
    const ollamaModel = model;
    const blueprint = await callOllamaModel({
      model: ollamaModel,
      prompt,
      systemPrompt,
      numPredict: BLUEPRINT_NUM_PREDICT,
      temperature: 0.55,
    });
    
    db.createSession({
      sessionId: req.headers['x-session-id'] || db.generateSessionId(),
      brainDump: prompt,
      urlResearch: researchData || null,
      designReference,
      generationMode: 'local',
      modelUsed: ollamaModel,
      draftId: null,
    });
    res.json({ success: true, blueprint, canHandoff: true, modelUsed: ollamaModel, providerUsed: 'ollama' });
    
  } catch (err) {
    console.error('Generate error:', err);
    
    if (err.name === 'AbortError') {
      return res.status(504).json({
        error: 'Generation timed out',
        details: ['openai', 'gemini'].includes(model)
          ? `Cloud model did not respond within ${CLOUD_TIMEOUT_MS / 1000}s.`
          : `Ollama did not respond within ${OLLAMA_TIMEOUT_MS / 1000}s. Try a shorter prompt or a smaller model output.`
      });
    }
    
    res.status(500).json({ error: 'Generation failed', details: err.message });
  }
});

async function callOllamaModel({ model, prompt, systemPrompt, numPredict = 8192, temperature = 0.55 }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const ollamaRes = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        system: systemPrompt,
        stream: false,
        options: {
          num_predict: numPredict,
          temperature,
          top_p: 0.9,
        },
      }),
    }).catch(() => {
      throw new Error(`Cannot reach Ollama at ${OLLAMA_URL}. Is Ollama running?`);
    });

    if (!ollamaRes.ok) {
      const text = await ollamaRes.text();
      throw new Error(`Ollama ${ollamaRes.status}: ${text}`);
    }

    const data = await ollamaRes.json();
    return data.response || data.message || '';
  } finally {
    clearTimeout(timeout);
  }
}

async function callCloudModel({ provider, apiKey, prompt, systemPrompt, projectType, requestedModel = '', baseUrl = '' }) {
  const url = provider === 'gemini' ? GEMINI_BASE_URL : normaliseOpenAICompatibleChatUrl(baseUrl);
  const model = getCloudModelName(provider, projectType, requestedModel);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);
  
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify(buildChatPayload({
        model,
        messages,
        temperature: provider === 'gemini' ? 0.5 : 0.55,
      })),
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${provider} ${response.status}: ${text}`);
    }
    
    const data = await response.json();
    const blueprint = data?.choices?.[0]?.message?.content;
    
    if (!blueprint) {
      throw new Error(`${provider} returned no blueprint content`);
    }
    
    return blueprint;
  } finally {
    clearTimeout(timeout);
  }
}

// POST /api/refine — Refine an existing blueprint
app.post('/api/refine', async (req, res) => {
  try {
    const { currentBlueprint, refinementPrompt, model, projectType = 'app', apiKey = '', designReference = 'none', cloudModel = '' } = req.body;
    
    await ensureDesignSystem(designReference);
    let systemPrompt = getSystemPrompt(projectType, designReference);
    
    const prompt = `Here is the current blueprint:

${currentBlueprint}

Here is the requested refinement:
${refinementPrompt}

Please rewrite the blueprint entirely to incorporate the requested refinements while keeping the rest of the structure and intent intact. Ensure the output is a complete blueprint.`;
    
    if (!currentBlueprint || !refinementPrompt) {
      return res.status(400).json({ error: 'currentBlueprint and refinementPrompt required' });
    }
    
    if (['openai', 'gemini'].includes(model)) {
      if (!apiKey) return res.status(400).json({ error: 'Missing API key' });
      const modelUsed = getCloudModelName(model, projectType, cloudModel);
      const blueprint = await callCloudModel({
        provider: model, apiKey, prompt, systemPrompt, projectType, requestedModel: cloudModel,
      });
      return res.json({ success: true, blueprint, canHandoff: true, modelUsed, providerUsed: model });
    }
    
    const ollamaModel = model;
    const blueprint = await callOllamaModel({
      model: ollamaModel, prompt, systemPrompt, numPredict: BLUEPRINT_NUM_PREDICT, temperature: 0.55,
    });
    res.json({ success: true, blueprint, canHandoff: true, modelUsed: ollamaModel, providerUsed: 'ollama' });
  } catch (err) {
    console.error('Refine error:', err);
    res.status(500).json({ error: 'Refinement failed', details: err.message });
  }
});

// POST /api/handoff — Creates project folder, saves blueprint + OpenCode stub
app.post('/api/handoff', (req, res) => {
  const { projectName, blueprint, sessionId, designReference } = req.body;

  if (!projectName || (!blueprint && !sessionId)) {
    return res.status(400).json({ error: 'projectName and either blueprint or sessionId required' });
  }

  const safeName = safeProjectName(projectName);
  const projectPath = path.join(__dirname, 'projects', safeName);

  if (fs.existsSync(projectPath)) {
    return res.status(409).json({ error: `Project "${safeName}" already exists` });
  }

  try {
    fs.mkdirSync(projectPath, { recursive: true });
    let buildFilesList = [];
    let useBlueprint = blueprint;

    if (sessionId) {
      const wsDir = workspace.workspaceDir(sessionId);
      if (fs.existsSync(wsDir)) {
        const copyRecursive = (src, dest) => {
          fs.mkdirSync(dest, { recursive: true });
          const entries = fs.readdirSync(src, { withFileTypes: true });
          for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
              copyRecursive(srcPath, destPath);
            } else {
              fs.copyFileSync(srcPath, destPath);
              buildFilesList.push(entry.name);
            }
          }
        };
        copyRecursive(wsDir, projectPath);
        if (!useBlueprint) {
          try {
            const files = workspace.wsListFiles(sessionId);
            useBlueprint = `# Build Session: ${safeName}\n\nCopied ${buildFilesList.length} files from build session ${sessionId}.\n\n## Files\n${files.map(f => `- ${f}`).join('\n')}`;
          } catch {
            useBlueprint = `# Build Session: ${safeName}\n\nBuild handoff from session ${sessionId}.`;
          }
        }
      }
    }

    if (useBlueprint) {
      const blueprintPath = path.join(projectPath, 'blueprint.md');
      fs.writeFileSync(blueprintPath, useBlueprint, 'utf-8');
    }

    // Extract HTML prototype from fenced block
    const htmlBlockMatch = (useBlueprint || '').match(/```html\s*([\s\S]*?)\s*```/i);
    if (htmlBlockMatch && htmlBlockMatch[1]) {
      let prototypeHtml = htmlBlockMatch[1].trim();
      const hasAlpine = /alpinejs|x-data|x-show|x-for|@click|x-on:/i.test(prototypeHtml);
      const hasAlpineCdn = /cdn\.jsdelivr\.net\/npm\/alpinejs|unpkg\.com\/alpinejs/i.test(prototypeHtml);
      const alpineScript = hasAlpine && !hasAlpineCdn
        ? '\n        <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>'
        : '';
      const fullPrototype = `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <style>\n    * { box-sizing: border-box; }\n    body { margin: 0; min-height: 100vh; }\n  </style>${alpineScript}\n</head>\n<body>\n${prototypeHtml}\n</body>\n</html>`;
      fs.writeFileSync(path.join(projectPath, 'prototype.html'), fullPrototype, 'utf-8');
    }

    // Save OpenCode task stub
    const opencodeConfigPath = path.join(projectPath, '.opencode', 'config.md');
    const opencodeConfig = `# ${projectName}\n\nGenerated by [Cauldron OS](https://github.com/witchdaddylabs/cauldron-os).\n\n## What's included\n\n- \`blueprint.md\` — full product specification\n- \`prototype.html\` — live HTML/AlpineJS prototype (open in browser)\n- \`.opencode/config.md\` — this file\n\n## Build this project\n\n1. Open this folder in your terminal\n2. Run: \`opencode\`\n3. Paste the content of \`blueprint.md\` when prompted\n4. Choose your preferred model — whatever you select is what gets used to build\n\n---\n*Model: your choice in OpenCode. Cauldron saves the blueprint; you own the model decision.*\n`;
    fs.mkdirSync(path.join(projectPath, '.opencode'), { recursive: true });
    fs.writeFileSync(opencodeConfigPath, opencodeConfig, 'utf-8');

    // Set initial project status
    try {
      db.setProjectStatusOverride(safeName, 'needs_review', 'Handoff dispatched');
    } catch (statusErr) {
      console.warn('[Cauldron] Status override warning:', statusErr.message);
    }

    let draftId = null;
    try {
      const draft = db.createDraft({
        projectName: safeName,
        brainDump: sessionId ? `Build session: ${sessionId}` : '',
        blueprint: useBlueprint || '',
        designReference: sessionId ? 'build-handoff' : (designReference || 'handoff'),
        generationMode: sessionId ? 'build-execute' : 'handoff',
        modelUsed: 'opencode-go/deepseek-v4-flash',
      });
      draftId = draft.id;
    } catch (recordErr) {
      console.warn('[Cauldron] Handoff record warning:', recordErr.message);
    }

    res.json({
      success: true,
      message: buildFilesList.length > 0
        ? `Project created with ${buildFilesList.length} built files and prototype exported`
        : 'Project created',
      projectPath,
      draftId,
      filesCopied: buildFilesList.length,
    });
  } catch (err) {
    console.error('[Cauldron] Handoff error:', err);
    res.status(500).json({ error: 'Handoff failed', details: err.message });
  }
});

// ─── OpenAI-Compatible Chat Completions Proxy ──────────────────────────────────

app.post('/api/chat/completions', async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);
  try {
    const { model, messages = [], temperature = 0.55, stream = false, base_url: baseUrl = '', provider: explicitProvider = '' } = req.body || {};
    if (!model) return res.status(400).json({ error: { message: 'model is required' } });
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: { message: 'messages array is required' } });
    }

    const authHeader = req.headers.authorization || '';
    const apiKey = authHeader.replace(/^Bearer\s+/i, '') || req.body.apiKey || '';
    if (!apiKey) return res.status(401).json({ error: { message: 'Bearer API key required' } });

    const provider = explicitProvider || inferProviderFromModel(model);
    if (!['gemini', 'openai'].includes(provider)) {
      return res.status(501).json({ error: { message: `${provider} routing is not implemented yet` } });
    }

    const targetUrl = provider === 'gemini' ? GEMINI_BASE_URL : normaliseOpenAICompatibleChatUrl(baseUrl);
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify(buildChatPayload({ model, messages, temperature, stream })),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.type(upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (err) {
    const status = err.name === 'AbortError' ? 504 : 500;
    res.status(status).json({ error: { message: 'Chat completion proxy failed', details: err.message } });
  } finally {
    clearTimeout(timeout);
  }
});

// ─── Build API — XML Tool Agent System ─────────────────────────────────────────

// POST /api/build/start
app.post('/api/build/start', async (req, res) => {
  try {
    const { prompt, model, sessionId, designReference, templateId, projectType } = req.body;
    const sid = sessionId || db.generateSessionId();
    const wsDir = await workspace.ensureWorkspace(sid);

    buildSessions.set(sid, {
      sessionId: sid,
      prompt: prompt || '',
      model: model || 'llama3.2',
      designReference: designReference || 'none',
      templateId: templateId || '',
      projectType: projectType || 'app',
      workspaceDir: wsDir,
      startedAt: new Date().toISOString(),
      actions: [],
      files: [],
      status: 'initialized',
    });

    res.json({ success: true, sessionId: sid, workspaceDir: wsDir });
  } catch (err) {
    console.error('[Build] Start error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/build/generate (SSE Streaming)
app.post('/api/build/generate', async (req, res) => {
  const { prompt, model, sessionId, systemPrompt, apiKey, cloudModel } = req.body;
  const sid = sessionId;

  if (!sid) {
    return res.status(400).json({ error: 'sessionId required' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const startTime = Date.now();
  const isCloud = ['openai', 'gemini'].includes(model);
  const controller = new AbortController();
  activeBuildControllers.set(sid, controller);

  try {
    await workspace.ensureWorkspace(sid);
    const sysPrompt = systemPrompt || await buildSystemPrompt({ sessionId: sid });

    const sendEvent = (event, data) => {
      if (!controller.signal.aborted) {
        try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (e) {}
      }
    };

    let finalFiles = [];
    let finalActions = [];
    let finalMessages = [];

    if (isCloud) {
      if (!apiKey) {
        sendEvent('error', { message: `API key required for ${model}` });
        return res.end();
      }
      const result = await _runCloudAgentBuild({
        prompt, model, apiKey, systemPrompt: sysPrompt, sessionId: sid,
        onToken: (text) => sendEvent('token', { text }),
        signal: controller.signal, cloudModel,
      });
      finalFiles = result.files || [];
      finalActions = result.actions || [];
      finalMessages = result.messages || [];
      for (const action of finalActions) {
        sendEvent('action', { tool: action.name, path: action.args?.path, status: 'start' });
        sendEvent('result', { tool: action.name, path: action.args?.path, status: 'complete', output: action.result });
        if (action.args && action.args.path && ['write_file', 'edit_file', 'delete_file'].includes(action.name)) {
          sendEvent('filechange', { path: action.args.path });
        }
      }
    } else {
      const agentGen = generateWithTools({
        prompt, model, systemPrompt: sysPrompt, sessionId: sid,
        onStream: (chunk) => { if (chunk && chunk.token) sendEvent('token', { text: chunk.token }); },
        onAction: ({ action, args, result }) => {
          sendEvent('action', { tool: action, path: args?.path, status: 'start' });
          sendEvent('result', { tool: action, path: args?.path, status: 'complete', output: result });
        },
        onFileChange: ({ action, path }) => { sendEvent('filechange', { path }); },
      });
      for await (const chunk of agentGen) {
        if (controller.signal.aborted) break;
        if (chunk.done) {
          finalFiles = chunk.files || [];
          finalActions = chunk.actions || [];
          finalMessages = chunk.messages || [];
        }
      }
    }

    if (!controller.signal.aborted) {
      const duration = Date.now() - startTime;
      buildSessions.set(sid, {
        ...(buildSessions.get(sid) || {}),
        sessionId: sid, status: 'completed', completedAt: new Date().toISOString(),
        files: finalFiles, actions: finalActions, duration,
      });

      let draftId = null;
      try {
        const draftRecord = db.createDraft({
          projectName: `build-${sid.slice(0, 8)}`,
          brainDump: prompt,
          blueprint: JSON.stringify({ files: finalFiles, actions: finalActions }),
          designReference: 'build', generationMode: 'build', modelUsed: model,
        });
        draftId = draftRecord.id;
      } catch (e) { console.warn('[Build] Draft save warning:', e.message); }

      sendEvent('done', { files: finalFiles, actions: finalActions, duration, draftId });
    }
    res.end();
  } catch (err) {
    console.error('[Build] Generate error:', err);
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
      res.end();
    } catch (e) {}
  } finally {
    activeBuildControllers.delete(sid);
  }
});

// POST /api/build/refine (SSE Streaming)
app.post('/api/build/refine', async (req, res) => {
  const { prompt, sessionId, systemPrompt, model, apiKey, cloudModel } = req.body;
  const sid = sessionId;

  if (!sid) {
    return res.status(400).json({ error: 'sessionId required' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const startTime = Date.now();
  const isCloud = ['openai', 'gemini'].includes(model);
  const controller = new AbortController();
  activeBuildControllers.set(sid, controller);

  try {
    await workspace.ensureWorkspace(sid);
    const sysPrompt = systemPrompt || await buildSystemPrompt({ sessionId: sid });

    const sendEvent = (event, data) => {
      if (!controller.signal.aborted) {
        try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (e) {}
      }
    };

    let finalFiles = [];
    let finalActions = [];
    let finalMessages = [];

    if (isCloud) {
      if (!apiKey) {
        sendEvent('error', { message: `API key required for ${model}` });
        return res.end();
      }
      const result = await _runCloudAgentBuild({
        prompt, model, apiKey, systemPrompt: sysPrompt, sessionId: sid,
        onToken: (text) => sendEvent('token', { text }),
        signal: controller.signal, cloudModel,
      });
      finalFiles = result.files || [];
      finalActions = result.actions || [];
      finalMessages = result.messages || [];
      for (const action of finalActions) {
        sendEvent('action', { tool: action.name, path: action.args?.path, status: 'start' });
        sendEvent('result', { tool: action.name, path: action.args?.path, status: 'complete', output: action.result });
        if (action.args && action.args.path && ['write_file', 'edit_file', 'delete_file'].includes(action.name)) {
          sendEvent('filechange', { path: action.args.path });
        }
      }
    } else {
      const agentGen = generateWithTools({
        prompt, model: model || 'llama3.2', systemPrompt: sysPrompt, sessionId: sid,
        onStream: (chunk) => { if (chunk && chunk.token) sendEvent('token', { text: chunk.token }); },
        onAction: ({ action, args, result }) => {
          sendEvent('action', { tool: action, path: args?.path, status: 'start' });
          sendEvent('result', { tool: action, path: args?.path, status: 'complete', output: result });
        },
        onFileChange: ({ action, path }) => { sendEvent('filechange', { path }); },
      });
      for await (const chunk of agentGen) {
        if (controller.signal.aborted) break;
        if (chunk.done) {
          finalFiles = chunk.files || [];
          finalActions = chunk.actions || [];
          finalMessages = chunk.messages || [];
        }
      }
    }

    if (!controller.signal.aborted) {
      const duration = Date.now() - startTime;
      const existingSession = buildSessions.get(sid) || {};
      const mergedFiles = [...new Set([...(existingSession.files || []), ...finalFiles])];
      const mergedActions = [...(existingSession.actions || []), ...finalActions];
      buildSessions.set(sid, {
        ...existingSession, status: 'refined', completedAt: new Date().toISOString(),
        files: mergedFiles, actions: mergedActions, duration: (existingSession.duration || 0) + duration,
      });
      sendEvent('done', { files: mergedFiles, actions: mergedActions, duration });
    }
    res.end();
  } catch (err) {
    console.error('[Build] Refine error:', err);
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
      res.end();
    } catch (e) {}
  } finally {
    activeBuildControllers.delete(sid);
  }
});

// POST /api/build/stop
app.post('/api/build/stop', (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId required' });
    }
    const controller = activeBuildControllers.get(sessionId);
    if (controller) {
      controller.abort();
      activeBuildControllers.delete(sessionId);
    }
    const session = buildSessions.get(sessionId);
    if (session) session.status = 'stopped';
    res.json({ success: true });
  } catch (err) {
    console.error('[Build] Stop error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/build/files/:sessionId
app.get('/api/build/files/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sanitized = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!sanitized) return res.status(400).json({ success: false, error: 'Invalid sessionId' });
    const files = await workspace.wsListFiles(sanitized);
    res.json({ success: true, files });
  } catch (err) {
    console.error('[Build] List files error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/build/file/:sessionId
app.get('/api/build/file/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ success: false, error: 'path query parameter required' });
    const sanitized = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!sanitized) return res.status(400).json({ success: false, error: 'Invalid sessionId' });
    const content = await workspace.wsReadFile(sanitized, filePath);
    res.json({ success: true, content });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ success: false, error: 'File not found' });
    console.error('[Build] Read file error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/build/status/:sessionId
app.get('/api/build/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sanitized = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!sanitized) return res.status(400).json({ success: false, error: 'Invalid sessionId' });
    const files = await workspace.wsListFiles(sanitized);
    const fileCount = files.filter(f => f.type === 'file').length;
    const totalSize = files.filter(f => f.type === 'file').reduce((sum, f) => sum + f.size, 0);
    const sessionData = buildSessions.get(sanitized) || {};
    res.json({
      success: true,
      status: {
        sessionId: sanitized, fileCount, totalSize,
        lastAction: sessionData.actions ? sessionData.actions[sessionData.actions.length - 1] || null : null,
        duration: sessionData.duration || null, status: sessionData.status || 'unknown',
        startedAt: sessionData.startedAt || null, completedAt: sessionData.completedAt || null,
        files,
      },
    });
  } catch (err) {
    console.error('[Build] Status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Workspace Preview File Server ───────────────────────────────────────────
app.use('/workspace-preview', (req, res, next) => {
  const parts = req.path.split('/').filter(Boolean);
  const sessionId = parts[0] || '';
  const sanitized = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!sanitized || sanitized !== sessionId) {
    return res.status(400).send('Invalid session ID');
  }
  const wsDir = workspace.workspaceDir(sanitized);
  if (!fs.existsSync(wsDir)) {
    return res.status(404).send('Workspace not found');
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  const relPath = '/' + parts.slice(1).join('/');
  if (relPath === '/' || relPath === '') {
    const indexPath = path.join(wsDir, 'index.html');
    if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
    return res.status(404).send('No index.html found in workspace');
  }
  const fullPath = path.join(wsDir, relPath);
  if (!fullPath.startsWith(wsDir)) return res.status(403).send('Forbidden');
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return res.status(404).send('File not found');
  res.sendFile(fullPath);
});

// Serve frontend for all other routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

(async () => {
  try {
    await db.init();
    app.listen(PORT, () => {
      console.log(`\n🔥 Cauldron OS v0.250 — Witch Daddy Labs (Unification Sprint 4)`);
      console.log(`   Merged features from public open-source + private advanced builds`);
      console.log(`   Master Brain upgrades loaded:`);
      console.log(`   • Impeccable Taste (Grendel)`);
      console.log(`   • Design Reference Selector (Camilo & Grendel)`);
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
