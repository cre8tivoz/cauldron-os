## 2025-05-18 - Blueprint Diff Matrix Allocation and Prefix/Suffix Trimming

**Learning:** `buildLineDiff` in `lib/blueprint-diff.js` suffered from $O(N \times M)$ memory allocations due to creating `N + 1` JavaScript arrays with `Array.from()` for the LCS table, alongside doing matrix computation across entire files even when major portions (header, imports, tail) were unchanged. Trimming common leading and trailing lines reduces matrix dimensions dramatically for iteration-heavy document diffing, and using a flat 1D `Int32Array` eliminates array allocation GC overhead.

**Action:** When diffing or comparing structured document text, always eliminate matching prefix/suffix lines first before computing alignment matrices, and allocate single flat TypedArrays (`Int32Array`) rather than nested JS Arrays.

## 2025-05-19 - XML Action Parameter Tag Scanning Bottleneck

**Learning:** `_parseParams` in `lib/xml-parser.js` previously scanned all inner `<(\w+)>` tags across action text to build a unique tag set, then dynamically compiled RegExp objects and re-scanned the entire payload string for every tag found. On large HTML/SVG code generation payloads inside `<content>`, this resulted in scanning dozens of embedded HTML tag names and executing dynamic regexes repeatedly. Sequential top-level tag parsing advances past completed parameter blocks (e.g. `<content>...</content>`), completely skipping nested HTML content and reducing processing time by ~85% (~7x speedup).

**Action:** When parsing top-level XML action or structured tool call blocks, parse tags sequentially and advance search indices past parameter values to avoid scanning embedded markup inside code parameters.
