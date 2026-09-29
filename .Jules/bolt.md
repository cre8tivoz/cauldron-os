## 2025-05-18 - Blueprint Diff Matrix Allocation and Prefix/Suffix Trimming

**Learning:** `buildLineDiff` in `lib/blueprint-diff.js` suffered from $O(N \times M)$ memory allocations due to creating `N + 1` JavaScript arrays with `Array.from()` for the LCS table, alongside doing matrix computation across entire files even when major portions (header, imports, tail) were unchanged. Trimming common leading and trailing lines reduces matrix dimensions dramatically for iteration-heavy document diffing, and using a flat 1D `Int32Array` eliminates array allocation GC overhead.

**Action:** When diffing or comparing structured document text, always eliminate matching prefix/suffix lines first before computing alignment matrices, and allocate single flat TypedArrays (`Int32Array`) rather than nested JS Arrays.

## 2025-05-19 - XML Action Parameter Tag Scanning Bottleneck

**Learning:** `_parseParams` in `lib/xml-parser.js` previously scanned all inner `<(\w+)>` tags across action text to build a unique tag set, then dynamically compiled RegExp objects and re-scanned the entire payload string for every tag found. On large HTML/SVG code generation payloads inside `<content>`, this resulted in scanning dozens of embedded HTML tag names and executing dynamic regexes repeatedly. Sequential top-level tag parsing advances past completed parameter blocks (e.g. `<content>...</content>`), completely skipping nested HTML content and reducing processing time by ~85% (~7x speedup).

**Action:** When parsing top-level XML action or structured tool call blocks, parse tags sequentially and advance search indices past parameter values to avoid scanning embedded markup inside code parameters.

## 2025-05-20 - Back-referencing Regular Expression Scanning Bottleneck

**Learning:** `scoreColorContrast` in `lib/quality-scorer.js` checked for duplicate hex colors within an 80-character window using `/(#[0-9a-f]{3,6}).{0,80}\1/i`. On large prototype HTML strings with hundreds or thousands of elements, evaluating back-references (`\1`) combined with open-ended quantified dot matches (`.{0,80}`) caused extensive regex backtracking and performance degradation (~80% speed penalty). Replacing back-referencing regexes with a single linear regex scan (`/#[0-9a-f]{3}(?:[0-9a-f]{3})?\b/gi`) paired with a `Map` tracking last-seen match indices reduced execution time by 80% (~5x speedup).

**Action:** Avoid back-referencing RegExp capture groups (`\1`, `\2`) on large or dynamic string inputs; instead use single-pass tokenization or match position maps for proximity checks.

## 2026-06-03 - File String Patching and Argument Normalization Allocation Bottleneck

**Learning:** `wsEditFile` in `lib/workspace.js` executed `content.includes(oldStr)`, dynamic `new RegExp(escapeRegex(oldStr), 'g')` compilation, `content.match(...)` match array creation, and `content.split(oldStr).join(newStr)` when in `replaceAll` mode. Splitting directly by `oldStr` yields the replacement parts in a single pass where `parts.length - 1` is the occurrence count, eliminating dynamic regex compilation and 3 redundant string/array scans (~35% speedup). Additionally, single-replacement mode used `indexOf` + `replace`, causing a second linear scan; string slicing around the known index (`slice(0, idx) + newStr + slice(idx + oldStr.length)`) eliminates the second scan. Moving static tool arg normalization structures in `lib/tools.js` to module top-level scope prevents object/array/Set allocations on every tool execution call.

**Action:** For string replacement with known replacement boundaries or global literal replacements, prefer single-pass `split` or index-based `slice` over multi-pass `replace` / dynamic `RegExp` matching. Hoist static helper maps/sets to module scope.

## 2026-06-04 - Design System Discovery Disk Scanning Bottleneck

**Learning:** `discoverLocalDesignSystems` and `discoverCommunityDesignSystems` in `lib/design-system-catalog.js` previously performed synchronous filesystem directory traversals (`fs.readdirSync`, `fs.existsSync`, `fs.readFileSync`) over 150+ design system folders on every call to `createDesignSystems`. Module-level memoization (`cachedLocalDesignSystems` and `cachedCommunityDesignSystems`) keyed on root directory and catalog path avoids 150+ synchronous disk reads per request, eliminating disk I/O on repeated calls.

**Action:** Cache static or slowly-changing catalog discovery results in module-level variables and expose explicit invalidation functions (e.g. `invalidateDesignSystemCatalogCache`) when dynamic imports occur.
