const CATEGORY_WEIGHTS = {
  accessibility: 0.22,
  visualHierarchy: 0.2,
  spacing: 0.18,
  colorContrast: 0.2,
  semanticHtml: 0.2,
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function stripTags(html = '') {
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function findHexColors(html = '') {
  return Array.from(new Set(String(html).match(/#[0-9a-f]{3}(?:[0-9a-f]{3})?\b/gi) || []))
    .map(color => color.toLowerCase());
}

function expandHex(hex) {
  const value = hex.replace('#', '');
  if (value.length === 3) {
    return value.split('').map(char => char + char).join('');
  }
  return value;
}

function hexToRgb(hex) {
  const value = expandHex(hex);
  if (value.length !== 6) return null;
  const number = Number.parseInt(value, 16);
  if (Number.isNaN(number)) return null;
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function luminanceChannel(value) {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(rgb) {
  return (0.2126 * luminanceChannel(rgb.r)) + (0.7152 * luminanceChannel(rgb.g)) + (0.0722 * luminanceChannel(rgb.b));
}

function contrastRatio(foreground, background) {
  const first = hexToRgb(foreground);
  const second = hexToRgb(background);
  if (!first || !second) return 0;
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function scoreAccessibility(html, text) {
  let score = 45;
  const imageCount = countMatches(html, /<img\b/gi);
  const labelledImages = countMatches(html, /<img\b[^>]*\salt\s*=/gi);
  const controls = countMatches(html, /<(button|input|select|textarea|a)\b/gi);
  const labelledControls = countMatches(html, /<(button|input|select|textarea|a)\b[^>]*(aria-label|aria-labelledby|title|for=|type=)/gi);

  if (/<html\b[^>]*\blang\s*=/i.test(html)) score += 12;
  if (/<main\b/i.test(html)) score += 8;
  if (/aria-|role=|for=|id=/.test(html)) score += 12;
  if (/focus|:focus|tabindex/i.test(html)) score += 8;
  if (imageCount === 0 || labelledImages >= imageCount) score += 10;
  if (controls === 0 || labelledControls >= Math.min(controls, 2)) score += 8;
  if (text.length > 80) score += 5;

  return {
    id: 'accessibility',
    label: 'Accessibility',
    score: clampScore(score),
    suggestion: 'Add landmarks, labels, alt text, and visible focus states so the prototype works beyond a mouse-only happy path.',
  };
}

function scoreVisualHierarchy(html) {
  let score = 35;
  const h1 = countMatches(html, /<h1\b/gi);
  const headings = countMatches(html, /<h[1-6]\b/gi);
  const paragraphs = countMatches(html, /<p\b/gi);
  const ctas = countMatches(html, /<(button|a)\b[^>]*(class|aria-label|href|type)/gi);

  if (h1 === 1) score += 18;
  else if (h1 > 1) score += 8;
  if (headings >= 2) score += 18;
  if (paragraphs >= 2) score += 12;
  if (ctas >= 1) score += 12;
  if (/hero|headline|eyebrow|kicker|cta|primary/i.test(html)) score += 8;
  if (/font-size|font-weight|line-height/i.test(html)) score += 7;

  return {
    id: 'visualHierarchy',
    label: 'Visual hierarchy',
    score: clampScore(score),
    suggestion: 'Clarify the page story with one primary H1, supporting section headings, descriptive body copy, and an obvious primary action.',
  };
}

function scoreSpacing(html) {
  let score = 35;
  const spacingRules = countMatches(html, /\b(padding|margin|gap|grid-template|display:\s*grid|display:\s*flex|max-width|width|min-height)\b/gi);
  const sections = countMatches(html, /<(section|article|header|footer|aside)\b/gi);

  score += Math.min(28, spacingRules * 4);
  score += Math.min(18, sections * 4);
  if (/container|wrapper|stack|grid|layout/i.test(html)) score += 8;
  if (/px|rem|clamp\(/i.test(html)) score += 9;

  return {
    id: 'spacing',
    label: 'Spacing',
    score: clampScore(score),
    suggestion: 'Use deliberate padding, gaps, max-widths, and section rhythm so the prototype feels composed instead of dumped onto the canvas.',
  };
}

function scoreColorContrast(html) {
  let score = 45;
  const colors = findHexColors(html);
  const contrastValues = [];

  for (let index = 0; index < colors.length - 1; index += 1) {
    contrastValues.push(contrastRatio(colors[index], colors[index + 1]));
  }

  const usablePairs = contrastValues.filter(value => value >= 4.5).length;
  const weakPairs = contrastValues.filter(value => value > 0 && value < 3).length;

  if (colors.length >= 2) score += 12;
  if (usablePairs >= 1) score += 24;
  if (usablePairs >= 2) score += 8;
  if (/color\s*:|background/i.test(html)) score += 8;
  if (/border|box-shadow|outline/i.test(html)) score += 5;
  score -= weakPairs * 18;
  if (/(#[0-9a-f]{3,6}).{0,80}\1/i.test(html)) score -= 20;

  return {
    id: 'colorContrast',
    label: 'Color contrast',
    score: clampScore(score),
    suggestion: 'Strengthen text/background contrast and avoid same-tone foreground/background pairs, especially around buttons and small copy.',
  };
}

function scoreSemanticHtml(html) {
  let score = 25;
  const semanticTags = countMatches(html, /<(main|header|nav|section|article|aside|footer|form|label|figure|ul|ol|li)\b/gi);
  const divs = countMatches(html, /<div\b/gi);

  score += Math.min(45, semanticTags * 6);
  if (/<!doctype html>/i.test(html)) score += 8;
  if (/<title\b/i.test(html)) score += 8;
  if (/<main\b/i.test(html)) score += 10;
  if (/<button\b[^>]*\btype\s*=/i.test(html)) score += 5;
  if (semanticTags === 0 && divs > 0) score -= 25;
  if (divs > semanticTags * 3 && divs > 8) score -= 12;

  return {
    id: 'semanticHtml',
    label: 'Semantic HTML',
    score: clampScore(score),
    suggestion: 'Replace generic div/span structure with header, main, section, nav, lists, labels, and typed buttons where they describe the content.',
  };
}

function gradeForScore(score) {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

function scorePrototypeHtml(html = '') {
  const source = String(html || '');
  const text = stripTags(source);
  const categories = [
    scoreAccessibility(source, text),
    scoreVisualHierarchy(source),
    scoreSpacing(source),
    scoreColorContrast(source),
    scoreSemanticHtml(source),
  ];
  const score = clampScore(categories.reduce((total, category) => (
    total + (category.score * CATEGORY_WEIGHTS[category.id])
  ), 0));
  const grade = gradeForScore(score);
  const weakCategories = categories
    .filter(category => category.score < 70)
    .sort((a, b) => a.score - b.score);
  const suggestions = weakCategories.slice(0, 4).map(category => ({
    category: category.label,
    text: category.suggestion,
  }));

  return {
    score,
    grade,
    showSuggestions: grade === 'C' || grade === 'D',
    categories,
    suggestions,
  };
}

module.exports = {
  scorePrototypeHtml,
};
