# Palette's Journal - Critical Learnings

## 2025-05-18 - Tab Control Semantics vs Standard Buttons

**Learning:** Adding `role="tab"` to button groups creates an explicit WAI-ARIA tab pattern contract expecting roving `tabindex`, arrow key handling (Left/Right/Up/Down), and `aria-controls`/`aria-labelledby` panel associations. When these keyboard interactions are not implemented, screen readers announce composite tab semantics that conflict with standard click/Tab-key behavior.
**Action:** Unless full keyboard roving focus and tabpanel relationships are implemented, maintain standard `<button>` semantics for tab-styled toggle groups.
