/**
 * Module-level static regular expressions for token inference.
 * Performance optimization:
 * Hoisting static RegExp definitions avoids compiling 15+ new RegExp objects
 * on every inferTokens call, eliminating dynamic regex allocation and compilation overhead.
 */
const RE_BACKTICK_HEX = /`(#[0-9a-f]{3,8})`/gi;
const RE_HEX_COLOR = /(#[0-9a-f]{3,8})\b/gi;
const RE_RGBA_COLOR = /(rgba?\([^)]+\))/gi;
const RE_FONT_FAMILY = /font-family:\s*([^;]+);/gi;
const RE_FONTS_ARRAY = /fonts?:\s*\[([^\]]+)\]/gi;
const RE_SPACING_VAR = /(--[\w-]*spacing[\w-]*):\s*([^;]+);/gi;
const RE_SPACING_VAL = /\b(\d+(?:\.\d+)?(?:px|rem))\b/gi;
const RE_ALLOWED_SPACING = /^(4|8|12|16|20|24|28|32|40|48|56|64)(px|rem)$/;
const RE_BORDER_RADIUS = /border-radius:\s*([^;]+);/gi;
const RE_RADII_VAL = /\b(9999px|\d+(?:\.\d+)?px)\b/gi;
const RE_BOX_SHADOW = /(box-shadow:\s*[^;]+;)/gi;
const RE_BORDER = /(border:\s*[^;]+;)/gi;
const RE_HOVER = /(hover:[\w-]+)/gi;
const RE_FOCUS = /(focus:[\w-]+)/gi;
const RE_DISABLED = /(disabled:[\w-]+)/gi;
const RE_FOCUS_STATE = /(focus state[^.\n]*)/gi;

/**
 * Extracts matching token values directly into a target Set in a single pass using stateful exec().
 * Performance optimization:
 * Direct Set populating using stateful exec() avoids matchAll iterator creation,
 * intermediate array mappings, array filtering, and redundant array-to-Set conversions.
 */
function extractMatchesIntoSet(source, pattern, set, transformFn) {
  if (!source) return;
  const str = String(source);
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(str)) !== null) {
    let val = match[1]?.trim();
    if (val && transformFn) {
      val = transformFn(val);
    }
    if (val) set.add(val);
  }
}

function inferTokens({ designReference = 'none', designSystemContent = '', prototypeHtml = '' }) {
  const combined = `${designSystemContent}\n${prototypeHtml}`;

  const colorsSet = new Set();
  extractMatchesIntoSet(combined, RE_BACKTICK_HEX, colorsSet);
  extractMatchesIntoSet(combined, RE_HEX_COLOR, colorsSet);
  extractMatchesIntoSet(combined, RE_RGBA_COLOR, colorsSet);
  const colors = Array.from(colorsSet);

  const typographySet = new Set();
  extractMatchesIntoSet(combined, RE_FONT_FAMILY, typographySet);
  extractMatchesIntoSet(combined, RE_FONTS_ARRAY, typographySet);
  const typography = Array.from(typographySet);

  const spacingSet = new Set();
  extractMatchesIntoSet(combined, RE_SPACING_VAR, spacingSet, (val) => val.split(':').pop()?.trim());
  extractMatchesIntoSet(combined, RE_SPACING_VAL, spacingSet, (val) => RE_ALLOWED_SPACING.test(val) ? val : null);
  const spacing = Array.from(spacingSet);

  const radiiSet = new Set();
  extractMatchesIntoSet(combined, RE_BORDER_RADIUS, radiiSet);
  extractMatchesIntoSet(combined, RE_RADII_VAL, radiiSet, (val) => (val === '9999px' || Number.parseFloat(val) <= 32) ? val : null);
  const radii = Array.from(radiiSet);

  const elevationSet = new Set();
  extractMatchesIntoSet(combined, RE_BOX_SHADOW, elevationSet);
  const elevation = Array.from(elevationSet);

  const bordersSet = new Set();
  extractMatchesIntoSet(combined, RE_BORDER, bordersSet);
  const borders = Array.from(bordersSet);

  const statesSet = new Set();
  extractMatchesIntoSet(combined, RE_HOVER, statesSet);
  extractMatchesIntoSet(combined, RE_FOCUS, statesSet);
  extractMatchesIntoSet(combined, RE_DISABLED, statesSet);
  extractMatchesIntoSet(combined, RE_FOCUS_STATE, statesSet);
  const states = Array.from(statesSet);

  const unknownTokens = [];
  if (!colors.length) unknownTokens.push('colors');
  if (!typography.length) unknownTokens.push('typography');
  if (!spacing.length) unknownTokens.push('spacing');
  if (!radii.length) unknownTokens.push('radii');
  if (!borders.length && !elevation.length) unknownTokens.push('borders/elevation');
  if (!states.length) unknownTokens.push('component-states');

  return {
    reference: designReference,
    colors,
    typography,
    spacing,
    radii,
    borders,
    elevation,
    states,
    accessibilityNotes: [
      'Use the generated prototype and verification results as the final accessibility source of truth.',
      'Treat any missing token category as a human follow-up rather than inventing values.',
    ],
    rationale: [
      'Derived from the selected design reference content and the actual prototype output where possible.',
      'Prototype values take precedence when they appear in rendered HTML or CSS.',
    ],
    unknownTokens,
  };
}

function yamlList(values = [], indent = '    ') {
  if (!values.length) return `${indent}[]`;
  return values.map((value) => `${indent}- ${JSON.stringify(value)}`).join('\n');
}

function renderDesignMarkdown(tokens) {
  return `# Design package\n\n\`\`\`yaml\nreference: ${JSON.stringify(tokens.reference)}\ntokens:\n  colors:\n${yamlList(tokens.colors)}\n  typography:\n${yamlList(tokens.typography)}\n  spacing:\n${yamlList(tokens.spacing)}\n  radii:\n${yamlList(tokens.radii)}\n  borders:\n${yamlList(tokens.borders)}\n  elevation:\n${yamlList(tokens.elevation)}\n  states:\n${yamlList(tokens.states)}\naccessibilityNotes:\n${yamlList(tokens.accessibilityNotes, '  ')}\nunknownTokens:\n${yamlList(tokens.unknownTokens, '  ')}\n\`\`\`\n\n## Rationale\n\n${tokens.rationale.map((line) => `- ${line}`).join('\n')}\n`;
}

function renderTokenSection(title, values, renderValue) {
  if (!values.length) {
    return `<section><h2>${title}</h2><p>No reliable values were inferred for this category.</p></section>`;
  }
  return `<section><h2>${title}</h2><div class="token-grid">${values.map(renderValue).join('')}</div></section>`;
}

function renderDesignHtml(tokens) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Design package</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, system-ui, sans-serif; }
    body { margin: 0; background: #0d0f14; color: #f5f0e8; padding: 32px; }
    h1, h2 { margin: 0 0 12px; }
    p, li { color: rgba(245,240,232,0.75); line-height: 1.55; }
    section { margin-top: 28px; padding: 20px; border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; background: rgba(255,255,255,0.03); }
    .token-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .token-card { border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 14px; background: rgba(0,0,0,0.18); }
    .swatch { height: 48px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); margin-bottom: 10px; }
    code { color: #c1ff00; }
  </style>
</head>
<body>
  <h1>Design package</h1>
  <p>Reference: <code>${tokens.reference}</code></p>
  ${renderTokenSection('Colors', tokens.colors, (value) => `<div class="token-card"><div class="swatch" style="background:${value};"></div><code>${value}</code></div>`)}
  ${renderTokenSection('Typography', tokens.typography, (value) => `<div class="token-card"><strong style="font-family:${value};">Sample Aa</strong><br /><code>${value}</code></div>`)}
  ${renderTokenSection('Spacing', tokens.spacing, (value) => `<div class="token-card"><strong>${value}</strong><br /><code>${value}</code></div>`)}
  ${renderTokenSection('Radii', tokens.radii, (value) => `<div class="token-card"><div class="swatch" style="background:rgba(193,255,0,0.16);border-radius:${value};"></div><code>${value}</code></div>`)}
  ${renderTokenSection('Borders', tokens.borders, (value) => `<div class="token-card"><code>${value}</code></div>`)}
  ${renderTokenSection('Elevation', tokens.elevation, (value) => `<div class="token-card"><code>${value}</code></div>`)}
  ${renderTokenSection('Component states', tokens.states, (value) => `<div class="token-card"><code>${value}</code></div>`)}
  <section>
    <h2>Accessibility notes</h2>
    <ul>${tokens.accessibilityNotes.map((note) => `<li>${note}</li>`).join('')}</ul>
  </section>
  <section>
    <h2>Unknown tokens</h2>
    <ul>${(tokens.unknownTokens.length ? tokens.unknownTokens : ['None']).map((token) => `<li>${token}</li>`).join('')}</ul>
  </section>
</body>
</html>`;
}

function buildDesignPackage({
  designReference = 'none',
  designSystemContent = '',
  prototypeHtml = '',
}) {
  const tokens = inferTokens({ designReference, designSystemContent, prototypeHtml });
  return {
    tokens,
    markdown: renderDesignMarkdown(tokens),
    html: renderDesignHtml(tokens),
  };
}

module.exports = {
  buildDesignPackage,
};
