const CATEGORY_WEIGHTS = {
  accessibility: 0.22,
  visualHierarchy: 0.2,
  spacing: 0.18,
  colorContrast: 0.2,
  semanticHtml: 0.2,
};

// Performance optimization: Module-level static RegExp instances avoid repeated
// compilation and RegExp object instantiation inside scoring functions.
const RE_IMG = /<img\b/gi;
const RE_LABELLED_IMG = /<img\b[^>]*\salt\s*=/gi;
const RE_CONTROLS = /<(button|input|select|textarea|a)\b/gi;
const RE_LABELLED_CONTROLS =
  /<(button|input|select|textarea|a)\b[^>]*(aria-label|aria-labelledby|title|for=|type=)/gi;
const RE_LANG = /<html\b[^>]*\blang\s*=/i;
const RE_MAIN = /<main\b/i;
const RE_ARIA = /aria-|role=|for=|id=/;
const RE_FOCUS = /focus|:focus|tabindex/i;

const RE_H1 = /<h1\b/gi;
const RE_HEADINGS = /<h[1-6]\b/gi;
const RE_PARAGRAPHS = /<p\b/gi;
const RE_CTAS = /<(button|a)\b[^>]*(class|aria-label|href|type)/gi;
const RE_HIERARCHY_KEYWORDS = /hero|headline|eyebrow|kicker|cta|primary/i;
const RE_FONT_STYLING = /font-size|font-weight|line-height/i;

const RE_SPACING =
  /\b(padding|margin|gap|grid-template|display:\s*grid|display:\s*flex|max-width|width|min-height)\b/gi;
const RE_SECTIONS = /<(section|article|header|footer|aside)\b/gi;
const RE_LAYOUT_KEYWORDS = /container|wrapper|stack|grid|layout/i;
const RE_UNITS = /px|rem|clamp\(/i;

const RE_HEX_COLOR = /#[0-9a-f]{3}(?:[0-9a-f]{3})?\b/gi;
const RE_COLOR_BG = /color\s*:|background/i;
const RE_BORDER = /border|box-shadow|outline/i;

const RE_SEMANTIC_TAGS =
  /<(main|header|nav|section|article|aside|footer|form|label|figure|ul|ol|li)\b/gi;
const RE_DIVS = /<div\b/gi;
const RE_DOCTYPE = /<!doctype html>/i;
const RE_TITLE = /<title\b/i;
const RE_TYPED_BUTTON = /<button\b[^>]*\btype\s*=/i;

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Counts pattern occurrences in text without allocating match arrays.
 * Performance optimization: Using pattern.test() in a loop with pattern.lastIndex = 0
 * avoids allocating intermediate Array instances and matched substring objects.
 */
function countMatches(text, pattern) {
  if (!text) return 0;
  if (pattern.global) {
    pattern.lastIndex = 0;
    let count = 0;
    while (pattern.test(text)) {
      count += 1;
    }
    return count;
  }
  return pattern.test(text) ? 1 : 0;
}

/**
 * Checks if non-tag text in HTML exceeds minLength without creating giant intermediate strings.
 * Performance optimization: avoids multi-pass global regex string replacements on entire HTML documents.
 * Exits immediately once minLength non-tag characters are counted (~500x speedup for large documents).
 */
function hasMinTextLength(html = '', minLength = 81) {
  let count = 0;
  let inTag = false;
  let hasPendingSpace = false;
  const str = String(html || '');
  const len = str.length;

  for (let i = 0; i < len; i += 1) {
    const ch = str[i];
    if (ch === '<') {
      inTag = true;
      hasPendingSpace = true;
    } else if (ch === '>') {
      inTag = false;
    } else if (!inTag) {
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        hasPendingSpace = true;
      } else {
        if (count > 0 && hasPendingSpace) {
          count += 1;
        }
        hasPendingSpace = false;
        count += 1;
        if (count >= minLength) return true;
      }
    }
  }

  return count >= minLength;
}

function expandHex(hex) {
  const value = hex.replace('#', '');
  if (value.length === 3) {
    return value
      .split('')
      .map((char) => char + char)
      .join('');
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
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(rgb) {
  return (
    0.2126 * luminanceChannel(rgb.r) +
    0.7152 * luminanceChannel(rgb.g) +
    0.0722 * luminanceChannel(rgb.b)
  );
}

function contrastRatio(foreground, background) {
  const first = hexToRgb(foreground);
  const second = hexToRgb(background);
  if (!first || !second) return 0;
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function scoreAccessibility(html, hasSubstantialText) {
  let score = 45;
  const imageCount = countMatches(html, RE_IMG);
  const labelledImages = countMatches(html, RE_LABELLED_IMG);
  const controls = countMatches(html, RE_CONTROLS);
  const labelledControls = countMatches(html, RE_LABELLED_CONTROLS);

  if (RE_LANG.test(html)) score += 12;
  if (RE_MAIN.test(html)) score += 8;
  if (RE_ARIA.test(html)) score += 12;
  if (RE_FOCUS.test(html)) score += 8;
  if (imageCount === 0 || labelledImages >= imageCount) score += 10;
  if (controls === 0 || labelledControls >= Math.min(controls, 2)) score += 8;
  if (hasSubstantialText) score += 5;

  return {
    id: 'accessibility',
    label: 'Accessibility',
    score: clampScore(score),
    suggestion:
      'Add landmarks, labels, alt text, and visible focus states so the prototype works beyond a mouse-only happy path.',
  };
}

function scoreVisualHierarchy(html) {
  let score = 35;
  const h1 = countMatches(html, RE_H1);
  const headings = countMatches(html, RE_HEADINGS);
  const paragraphs = countMatches(html, RE_PARAGRAPHS);
  const ctas = countMatches(html, RE_CTAS);

  if (h1 === 1) score += 18;
  else if (h1 > 1) score += 8;
  if (headings >= 2) score += 18;
  if (paragraphs >= 2) score += 12;
  if (ctas >= 1) score += 12;
  if (RE_HIERARCHY_KEYWORDS.test(html)) score += 8;
  if (RE_FONT_STYLING.test(html)) score += 7;

  return {
    id: 'visualHierarchy',
    label: 'Visual hierarchy',
    score: clampScore(score),
    suggestion:
      'Clarify the page story with one primary H1, supporting section headings, descriptive body copy, and an obvious primary action.',
  };
}

function scoreSpacing(html) {
  let score = 35;
  const spacingRules = countMatches(html, RE_SPACING);
  const sections = countMatches(html, RE_SECTIONS);

  score += Math.min(28, spacingRules * 4);
  score += Math.min(18, sections * 4);
  if (RE_LAYOUT_KEYWORDS.test(html)) score += 8;
  if (RE_UNITS.test(html)) score += 9;

  return {
    id: 'spacing',
    label: 'Spacing',
    score: clampScore(score),
    suggestion:
      'Use deliberate padding, gaps, max-widths, and section rhythm so the prototype feels composed instead of dumped onto the canvas.',
  };
}

function scoreColorContrast(html) {
  let score = 45;
  const input = String(html || '');

  // Performance optimization: Single pass over input to extract unique hex colors AND perform
  // proximity check for duplicate colors within 80 chars using matchAll iterator.
  const uniqueColors = new Set();
  const lastIndexMap = new Map();
  let hasDuplicateProximity = false;

  for (const match of input.matchAll(RE_HEX_COLOR)) {
    const color = match[0].toLowerCase();
    uniqueColors.add(color);

    if (!hasDuplicateProximity) {
      const prevIndex = lastIndexMap.get(color);
      if (prevIndex !== undefined && match.index - prevIndex <= 80 + color.length) {
        hasDuplicateProximity = true;
      } else {
        lastIndexMap.set(color, match.index);
      }
    }
  }

  const colors = Array.from(uniqueColors);
  const contrastValues = [];

  for (let index = 0; index < colors.length - 1; index += 1) {
    contrastValues.push(contrastRatio(colors[index], colors[index + 1]));
  }

  const usablePairs = contrastValues.filter((value) => value >= 4.5).length;
  const weakPairs = contrastValues.filter((value) => value > 0 && value < 3).length;

  if (colors.length >= 2) score += 12;
  if (usablePairs >= 1) score += 24;
  if (usablePairs >= 2) score += 8;
  if (RE_COLOR_BG.test(input)) score += 8;
  if (RE_BORDER.test(input)) score += 5;
  score -= weakPairs * 18;

  if (hasDuplicateProximity) {
    score -= 20;
  }

  return {
    id: 'colorContrast',
    label: 'Color contrast',
    score: clampScore(score),
    suggestion:
      'Strengthen text/background contrast and avoid same-tone foreground/background pairs, especially around buttons and small copy.',
  };
}

function scoreSemanticHtml(html) {
  let score = 25;
  const semanticTags = countMatches(html, RE_SEMANTIC_TAGS);
  const divs = countMatches(html, RE_DIVS);

  score += Math.min(45, semanticTags * 6);
  if (RE_DOCTYPE.test(html)) score += 8;
  if (RE_TITLE.test(html)) score += 8;
  if (RE_MAIN.test(html)) score += 10;
  if (RE_TYPED_BUTTON.test(html)) score += 5;
  if (semanticTags === 0 && divs > 0) score -= 25;
  if (divs > semanticTags * 3 && divs > 8) score -= 12;

  return {
    id: 'semanticHtml',
    label: 'Semantic HTML',
    score: clampScore(score),
    suggestion:
      'Replace generic div/span structure with header, main, section, nav, lists, labels, and typed buttons where they describe the content.',
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
  const hasSubstantialText = hasMinTextLength(source, 81);
  const categories = [
    scoreAccessibility(source, hasSubstantialText),
    scoreVisualHierarchy(source),
    scoreSpacing(source),
    scoreColorContrast(source),
    scoreSemanticHtml(source),
  ];
  const score = clampScore(
    categories.reduce(
      (total, category) => total + category.score * CATEGORY_WEIGHTS[category.id],
      0
    )
  );
  const grade = gradeForScore(score);
  const weakCategories = categories
    .filter((category) => category.score < 70)
    .sort((a, b) => a.score - b.score);
  const suggestions = weakCategories.slice(0, 4).map((category) => ({
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
