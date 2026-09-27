## 2025-05-18 - Blueprint Diff Matrix Allocation and Prefix/Suffix Trimming

**Learning:** `buildLineDiff` in `lib/blueprint-diff.js` suffered from $O(N \times M)$ memory allocations due to creating `N + 1` JavaScript arrays with `Array.from()` for the LCS table, alongside doing matrix computation across entire files even when major portions (header, imports, tail) were unchanged. Trimming common leading and trailing lines reduces matrix dimensions dramatically for iteration-heavy document diffing, and using a flat 1D `Int32Array` eliminates array allocation GC overhead.

**Action:** When diffing or comparing structured document text, always eliminate matching prefix/suffix lines first before computing alignment matrices, and allocate single flat TypedArrays (`Int32Array`) rather than nested JS Arrays.
