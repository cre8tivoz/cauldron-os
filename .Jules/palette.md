# Palette's Journal - Critical Learnings

## 2025-05-18 - Tab Control Semantics vs Standard Buttons

**Learning:** Adding `role="tab"` to button groups creates an explicit WAI-ARIA tab pattern contract expecting roving `tabindex`, arrow key handling (Left/Right/Up/Down), and `aria-controls`/`aria-labelledby` panel associations. When these keyboard interactions are not implemented, screen readers announce composite tab semantics that conflict with standard click/Tab-key behavior.
**Action:** Unless full keyboard roving focus and tabpanel relationships are implemented, maintain standard `<button>` semantics for tab-styled toggle groups.

## 2026-11-21 - [DESIGN] Semantic Token Consolidation & WCAG AA Contrast Floor

**Pillar:** palette (design)
**Learning:** Inline `<style>` blocks and later feature sections in `public/index.html` and `public/styles/app.css` drifted from `public/styles/tokens.css`, hardcoding `#72727d` and raw status hexes (`#34d399`, `#fbbf24`, `#fb7185`, `#b794f6`). Both `#72727d` (~3.7:1) and the original `--text-faint` (`#707a78`, ~4.0:1) fell below WCAG 2.2 AA 4.5:1 text contrast on dark charcoal surfaces, and translucent panel styles lacked `@media (forced-colors: active)` system-color fallbacks.
**Action:** Anchor all UI status, metadata, and surface styles to semantic tokens in `tokens.css` with `--text-faint` >= `#8d9996` (4.5:1+ on `--charcoal-800`/`--charcoal-900`), and pair dark-theme tokens with `@media (prefers-contrast: more)` and `@media (forced-colors: active)` fallbacks.
