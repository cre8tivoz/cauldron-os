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

## 2026-06-05 - HTML Text Length Evaluation and Tag Stripping Bottleneck

**Learning:** `scoreAccessibility` in `lib/quality-scorer.js` used `stripTags(html).length > 80` to evaluate whether HTML prototype content contained substantial copy (>80 chars). `stripTags` executed multi-pass global regular expressions (`/<[^>]*>/g` and `/\s+/g`) across the entire HTML string, allocating large intermediate strings. Replacing full HTML tag stripping with an early-exiting single-pass character scanner (`hasMinTextLength(html, 81)`) eliminates string allocations and stops scanning immediately once 81 non-tag characters are counted (~500x speedup for large documents).

**Action:** When checking threshold constraints on string contents (such as minimum text length or token count), use early-exiting character scanners instead of full string transformations or multi-pass regex replacements.

## 2026-06-06 - Streaming XML Action Tag Scanning and String Allocation Bottleneck

**Learning:** `findNextAction` in `lib/xml-parser.js` executed `text.slice(fromIndex).match(...)` and `text.toLowerCase().indexOf('</action>')` on every streaming parse pass. On large model response buffers, `text.slice()` created unnecessary substring heap allocations and `text.toLowerCase()` duplicated the entire response string in memory on every token chunk iteration. Using module-scoped global RegExp objects (`ACTION_OPEN_RE` and `ACTION_CLOSE_RE`) with explicit `.lastIndex = fromIndex` allows searching directly within the raw target string without slicing or lowercasing, reducing action detection time by ~95% (~20x speedup).

**Action:** When parsing tokens or delimiter tags in streaming string buffers, search directly within the raw string using stateful global RegExp instances (`.lastIndex = offset`) or index offsets rather than creating intermediate substring slices or full string lowercasing transformations.

## 2026-06-07 - XML Action Parameter Tag Regex Caching and Set Hoisting

**Learning:** `_parseParams` in `lib/xml-parser.js` previously created a new `Set` (`rawStringParams`) and compiled dynamic `RegExp` objects (`new RegExp('</' + escTag + '\\s*>', 'gi')`) on every parameter tag matched during action parsing. Module-level Map caches for tag closing/opening RegExps (`_getSimpleCloseRe`, `_getRawOpenRe`, `_getRawCloseRe`) and hoisting static Sets to module scope eliminated dynamic RegExp compilation and heap allocation churn, yielding a ~45% execution time reduction (~2x speedup).

**Action:** When parsing dynamic tags or tokens with RegExp constructors, cache compiled `RegExp` instances in module-level `Map`s and reset `.lastIndex` before execution rather than compiling `new RegExp` instances inside loops.

## 2026-06-08 - Synchronous CLI Binary Path Detection Bottleneck

**Learning:** `detectBuildAgents` in `lib/build-agents.js` previously executed `execFileSync` 5 times synchronously (`which`/`where`) on every call. Spawning child processes synchronously blocked the Node.js event loop for ~20ms per invocation. Adding a module-level TTL cache (10s) for binary path lookups reduced detection execution time to <0.05ms on cache hits (~500x speedup), eliminating event loop stalling on frequent `/api/build-agents` polling or multi-agent handoff generation.

**Action:** Always cache synchronous binary/CLI lookup operations (`which`/`where` or `execFileSync`) with a short TTL when detecting installed environment tools on the backend.
