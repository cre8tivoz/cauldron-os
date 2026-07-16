function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractMatches(source, pattern) {
  return unique(Array.from(String(source || '').matchAll(pattern), (match) => match[1]?.trim()));
}

function inferTokens({ designReference = 'none', designSystemContent = '', prototypeHtml = '' }) {
  const combined = `${designSystemContent}\n${prototypeHtml}`;
  const colors = unique([
    ...extractMatches(combined, /`(#[0-9a-f]{3,8})`/gi),
    ...extractMatches(combined, /(#[0-9a-f]{3,8})\b/gi),
    ...extractMatches(combined, /(rgba?\([^)]+\))/gi),
  ]);
  const typography = unique([
    ...extractMatches(combined, /font-family:\s*([^;]+);/gi),
    ...extractMatches(combined, /fonts?:\s*\[([^\]]+)\]/gi),
  ]);
  const spacing = unique([
    ...extractMatches(combined, /(--[\w-]*spacing[\w-]*):\s*([^;]+);/gi).map((value) =>
      value.split(':').pop()?.trim()
    ),
    ...extractMatches(combined, /\b(\d+(?:\.\d+)?(?:px|rem))\b/gi).filter((value) =>
      /^(4|8|12|16|20|24|28|32|40|48|56|64)(px|rem)$/.test(value)
    ),
  ]);
  const radii = unique([
    ...extractMatches(combined, /border-radius:\s*([^;]+);/gi),
    ...extractMatches(combined, /\b(9999px|\d+(?:\.\d+)?px)\b/gi).filter(
      (value) => value === '9999px' || Number.parseFloat(value) <= 32
    ),
  ]);
  const elevation = unique(extractMatches(combined, /(box-shadow:\s*[^;]+;)/gi));
  const borders = unique(extractMatches(combined, /(border:\s*[^;]+;)/gi));
  const states = unique([
    ...extractMatches(combined, /(hover:[\w-]+)/gi),
    ...extractMatches(combined, /(focus:[\w-]+)/gi),
    ...extractMatches(combined, /(disabled:[\w-]+)/gi),
    ...extractMatches(combined, /(focus state[^.\n]*)/gi),
  ]);

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
