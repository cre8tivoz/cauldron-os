const fs = require('fs');
const https = require('https');
const path = require('path');

const { extractDesignSystemName, normaliseSystemId } = require('./design-system-catalog');

const COMMUNITY_REPO = 'witchdaddylabs/cauldron-community';
const COMMUNITY_REPO_URL = `https://github.com/${COMMUNITY_REPO}`;
const COMMUNITY_RAW_BASE = `https://raw.githubusercontent.com/${COMMUNITY_REPO}/main`;
const COMMUNITY_TIMEOUT_MS = 10000;

const communityDesignSystems = [
  {
    id: 'community-neon-command',
    name: 'Neon Command',
    description: 'Dense operator UI for launch rooms, agent consoles, and command-heavy SaaS tools.',
    sourceRepo: COMMUNITY_REPO,
    submitPath: 'design-systems/neon-command/DESIGN.md',
    rawUrl: `${COMMUNITY_RAW_BASE}/design-systems/neon-command/DESIGN.md`,
    fallbackContent: `---
name: Neon Command
---

# Neon Command Design System

Use a high-contrast command center aesthetic with compact panels, visible status chips, and deliberate acid-green action states.

## Visual Language
- Backgrounds: rich charcoal, near-black surfaces, and low-opacity grid texture.
- Accent: acid green for primary actions and live status, violet only for secondary structure.
- Typography: condensed uppercase labels for metadata, readable system sans for body text.
- Layout: dense dashboard rows, split panes, and stable sidebars.

## Components
- Command bars should keep primary actions within one click.
- Cards should be flat, bordered, and information-dense.
- Empty states should describe the next operational action.

## Accessibility
- Preserve visible focus rings.
- Use semantic landmarks and 44px minimum touch targets for all controls.
- Keep contrast AA or better for status text.`,
  },
  {
    id: 'community-editorial-lab',
    name: 'Editorial Lab',
    description: 'Sharp editorial layouts for content-heavy launches, essays, research pages, and portfolios.',
    sourceRepo: COMMUNITY_REPO,
    submitPath: 'design-systems/editorial-lab/DESIGN.md',
    rawUrl: `${COMMUNITY_RAW_BASE}/design-systems/editorial-lab/DESIGN.md`,
    fallbackContent: `---
name: Editorial Lab
---

# Editorial Lab Design System

Build like a premium magazine product page: generous whitespace, disciplined type hierarchy, strong captions, and crisp section rhythm.

## Visual Language
- Palette: warm off-white canvas, ink text, restrained accent colors.
- Typography: oversized editorial headings, compact metadata, body text with comfortable line length.
- Layout: asymmetrical grids, pull quotes, feature bands, and clear reading order.

## Components
- Hero sections should lead with the literal product or topic name.
- Content blocks need useful headings, captions, and scannable supporting details.
- Calls to action should be precise and visually restrained.

## Accessibility
- Avoid low-contrast gray text on light surfaces.
- Preserve keyboard-visible links and buttons.
- Keep decorative motion subtle and optional.`,
  },
  {
    id: 'community-product-os',
    name: 'Product OS',
    description: 'Clean product-building interface language for roadmaps, specs, handoffs, and async collaboration.',
    sourceRepo: COMMUNITY_REPO,
    submitPath: 'design-systems/product-os/DESIGN.md',
    rawUrl: `${COMMUNITY_RAW_BASE}/design-systems/product-os/DESIGN.md`,
    fallbackContent: `---
name: Product OS
---

# Product OS Design System

Use a calm product-operations interface: clear hierarchy, explicit workflow states, and practical controls that support deep work.

## Visual Language
- Palette: neutral canvas, charcoal text, one confident brand accent, and subtle state colors.
- Typography: strong section headings, compact labels, highly readable body copy.
- Layout: structured panes, timelines, checklists, and review surfaces.

## Components
- Workflow cards should show state, owner, next action, and risk.
- Review panels should separate findings, decisions, and follow-ups.
- Settings and import flows should show health, provenance, and rollback cues.

## Accessibility
- Controls need clear labels and predictable focus order.
- Status colors must include text labels.
- Empty states should be actionable, not decorative.`,
  },
];

const communityTemplates = [
  {
    id: 'community-next-dashboard',
    name: 'Community Next.js Dashboard Starter',
    description: 'A Next.js App Router starter direction for dashboards, agents, and SaaS control rooms.',
    sourceRepo: COMMUNITY_REPO,
    baseTemplateId: 'nextjs',
    submitPath: 'scaffolds/next-dashboard/template.json',
    recommendedUse: 'production-style app shells, dashboards, and authenticated product flows',
    promptBias: 'Prefer a dense dashboard shell with side navigation, route-ready sections, realistic demo data, loading states, empty states, and strong accessibility defaults.',
  },
  {
    id: 'community-astro-launch',
    name: 'Community Astro Launch Starter',
    description: 'An Astro static starter direction for launch pages, editorial sites, and content-heavy product stories.',
    sourceRepo: COMMUNITY_REPO,
    baseTemplateId: 'astro',
    submitPath: 'scaffolds/astro-launch/template.json',
    recommendedUse: 'static product launches, docs-adjacent sites, and high-performance editorial pages',
    promptBias: 'Prefer an editorial Astro site with semantic content sections, real copy hierarchy, responsive image slots, SEO-ready structure, and accessible navigation.',
  },
];

function getRuntimeDataDir(rootDir) {
  return process.env.CAULDRON_DATA_DIR || path.join(rootDir, 'data');
}

function listCommunityCatalog() {
  return {
    success: true,
    sourceRepo: COMMUNITY_REPO,
    sourceUrl: COMMUNITY_REPO_URL,
    submitUrl: `${COMMUNITY_REPO_URL}/pulls`,
    designSystems: communityDesignSystems.map(({ fallbackContent, ...item }) => item),
    templates: communityTemplates,
  };
}

function getCommunityDesignSystem(id) {
  const normalised = normaliseSystemId(id);
  return communityDesignSystems.find(item => item.id === normalised) || null;
}

function getCommunityTemplate(id) {
  const normalised = normaliseSystemId(id);
  return communityTemplates.find(item => item.id === normalised) || null;
}

function fetchMarkdown(url, timeoutMs = COMMUNITY_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    if (!url || !/^https:\/\//i.test(url)) {
      reject(new Error('Invalid community markdown URL'));
      return;
    }

    const request = https.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`Community markdown returned HTTP ${res.statusCode}`));
        return;
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve(body));
    });

    request.on('timeout', () => {
      request.destroy(new Error('Community markdown request timed out'));
    });
    request.on('error', reject);
  });
}

async function readCommunityMarkdown(item) {
  if (process.env.CAULDRON_COMMUNITY_OFFLINE === '1') {
    return { content: item.fallbackContent, fetched: false };
  }

  try {
    const markdown = await fetchMarkdown(item.rawUrl);
    if (markdown.trim()) return { content: markdown, fetched: true };
  } catch (err) {
    console.warn(`[Cauldron] Community catalog fallback for ${item.id}:`, err.message);
  }

  return { content: item.fallbackContent, fetched: false };
}

async function importCommunityDesignSystem({ rootDir, id }) {
  const item = getCommunityDesignSystem(id);
  if (!item) {
    const err = new Error('Unknown community design system');
    err.statusCode = 404;
    throw err;
  }

  const { content, fetched } = await readCommunityMarkdown(item);
  const systemId = normaliseSystemId(item.id);
  const targetDir = path.join(getRuntimeDataDir(rootDir), 'community', 'design-systems', systemId);
  const targetPath = path.join(targetDir, 'DESIGN.md');
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf8');

  return {
    id: systemId,
    name: extractDesignSystemName(content, systemId) || item.name,
    repo: null,
    absolutePath: targetPath,
    source: 'community',
    origin: COMMUNITY_REPO,
    importedAt: new Date().toISOString(),
    fetched,
  };
}

function templateToPromptTemplate(item) {
  return {
    id: item.id,
    name: item.name,
    source: 'community',
    origin: COMMUNITY_REPO,
    projectType: item.baseTemplateId === 'nextjs' ? 'app' : 'site',
    scaffold: item.baseTemplateId,
    baseTemplateId: item.baseTemplateId,
    recommendedUse: item.recommendedUse,
    files: [],
    promptBias: item.promptBias,
  };
}

module.exports = {
  COMMUNITY_REPO,
  COMMUNITY_REPO_URL,
  getCommunityDesignSystem,
  getCommunityTemplate,
  getRuntimeDataDir,
  importCommunityDesignSystem,
  listCommunityCatalog,
  templateToPromptTemplate,
};
