# TEST READY — Information Architecture (IA) Interactive Canvas E2E Test Suite

> **Status**: READY FOR MILESTONE IMPLEMENTATION VERIFICATION  
> **Published At**: 2026-09-15T00:34:00Z  
> **Runner Entrypoint**: `node test-e2e-ia-suite.mjs`  
> **Infrastructure Spec**: `TEST_INFRA.md`  
> **Coverage**: 22 / 22 Features (100.0%) across 4 MBBank Products & 4-Tier Hierarchy  

---

## 1. Test Suite Execution Summary

The comprehensive 4-tier opaque-box test suite runner `test-e2e-ia-suite.mjs` has been constructed and verified at the project root. It executes via native Node.js ESM with sub-100ms deterministic execution speed.

```
================================================================================
UXMB TASK REQUEST — IA INTERACTIVE CANVAS E2E TEST EXECUTION SUMMARY
================================================================================
Tier 1 (Isolated Feature Coverage F1–F22):      110/110 Passed (100.0%)
Tier 2 (Boundary, Extreme & Corner Cases):      40/40 Passed (100.0%)
Tier 3 (Cross-Feature Combinations):            28/28 Passed (100.0%)
Tier 4 (Real-World Banking Scenarios):          16/16 Passed (100.0%)
--------------------------------------------------------------------------------
TOTAL TESTS EXECUTED:   194
TOTAL TESTS PASSED:     194 (100.0%)
TOTAL TESTS FAILED:     0
FEATURE COVERAGE:       22 / 22 Features (100.0% Coverage)
TOTAL EXECUTION TIME:   ~77ms
================================================================================
🎉 ALL 194 TESTS PASSED SUCCESSFULLY (Exit Code 0)
```

---

## 2. Four-Tier Coverage Breakdown

### Tier 1: Isolated Feature Coverage (F1 to F22 — 110 Test Cases)
- **F1: Sidebar IA Nav Item** (5 tests): Page union includes `"ia"`, `{ id: "ia", label: "Kiến trúc Thông tin", icon: "Network" }`, platform grouping, floating indicator contract, click routing.
- **F2: App Routing & Headers** (5 tests): URL hash `#ia` parsing, `validPages` inclusion, page title `"Kiến trúc Thông tin (IA)"`, `PAGE_METADATA.ia`, ErrorBoundary & AnimatePresence wrappers.
- **F3: RBAC & Nav Visibility** (5 tests): `RoleNavVisibility.ia`, Admin/Design Owner/Designer/PO access, unauthorized role redirect to default page, `DEFAULT_NAV_ORDER.platform`, fallback safety.
- **F4: Product Switcher Bar** (5 tests): 4 products (`app-mbbank`, `biz-mb`, `web-portal`, `baas`), active product switching, theme styling, Lucide icon mappings (`Smartphone`, `Building2`, `Globe`, `Cpu`), unknown product fallback.
- **F5: Screen/Feature Metrics Badge** (5 tests): Format strictly `[X luồng · Y màn hình]`, Tier 3 feature journey counting, Tier 4 screen counting, empty tree handling (0/0), dynamic mutation reactivity.
- **F6: 4-Tier IA Data Schema** (5 tests): `IATier` (1..4), `IANode` contract, `IATouchpointType` (6 categories), `IAProductInfo`, `IALocalStorageData` versioned schema.
- **F7: Realistic Seed Mock Data** (5 tests): All 4 products populated, Tier 1 root nodes with null parent, strict tier progression ($T_{child} = T_{parent} + 1$), globally unique IDs, realistic banking descriptions.
- **F8: 60+ FPS Canvas Viewport Container** (5 tests): CSS `translate3d(x,y,0) scale(s)`, GPU hints (`will-change: transform`, `backface-visibility`), responsive dot-grid background, drag delta accumulation, grab/grabbing cursor states.
- **F9: Cursor-Centric Zoom & Invariance** (5 tests): 1.15x zoom in, 0.85x zoom out, mathematical cursor invariance $(C_x - X)/S = (C_x - X')/S'$, min zoom clamp 0.25 (25%), max zoom clamp 2.0 (200%).
- **F10: Fit-to-View Engine** (5 tests): Bounding box calculation, optimal scale bounded in `[0.25, 1.25]`, center midpoint alignment, padding buffer preservation, degenerate fallback without NaN/Infinity.
- **F11: Expand/Collapse Branches** (5 tests): Toggle `collapsed` boolean, subtree hiding from active render list, child state preservation upon parent re-expansion, leaf non-collapsible rule, sibling isolation.
- **F12: SVG Cubic Bezier Connectors** (5 tests): `M C` SVG syntax validity, horizontal tangent offset $\max(40, dx/2)$, zero-kink horizontal alignment, theme color stroke styling, collapsed subtree connector suppression.
- **F13: 4-Tier Card Component** (5 tests): Tier 1 Root brand elevation, Tier 2 Module border accents, Tier 3 Journey badges, Tier 4 Screen touchpoint pills, tactile spring props.
- **F14: Task Association & Badges** (5 tests): `requestId` mapping to `UXRequest`, designer avatar rendering, status badge color mapping (Green/Blue/Rose), progress bar percentage, unassigned task fallback.
- **F15: RequestDetail Drawer Drilldown** (5 tests): Linked node click selects `UXRequest`, opens drawer, drawer close resets selection, stopPropagation isolates canvas pan, real-time metadata display.
- **F16: Direct Figma Linkage** (5 tests): Figma button renders only when `figmaUrl` present, opens `_blank`, security `noopener noreferrer`, stopPropagation isolates canvas, URL protocol validation.
- **F17: Inline Add Child Node** (5 tests): Tier 1 -> Tier 2, Tier 2 -> Tier 3, Tier 3 -> Tier 4, Tier 4 child addition rejected, auto-expand parent on addition.
- **F18: Inline Edit Node** (5 tests): Updates name, description, code, figmaUrl, requestId, touchpointType, empty name validation throws error.
- **F19: Inline Delete Node & Root Protection** (5 tests): Deletes leaf node, cascade deletes subtree, Tier 1 Product Root deletion prohibited, non-existent node returns false, immutable tree mutation.
- **F20: LocalStorage Persistence** (5 tests): Storage key `ux_portal_ia_tree_data_v1`, JSON serialization, startup deserialization, version header `{ version: 1, lastUpdated, trees }`, fallback on missing storage.
- **F21: Reset to Default & Restore** (5 tests): Purges localStorage key, reloads pristine seed trees, restores original metrics, confirmation dialog required, toast notification triggered.
- **F22: Quick Search & Path Highlight** (5 tests): Matches name (case-insensitive), matches code and description, matches linked task ID, matches task title, builds `ancestorIdsToExpand` set.

### Tier 2: Boundary & Corner Cases (8 Domains — 40 Test Cases)
- **B1: Zoom Clamping Extremes** (5 tests): Factor 100 clamped to 2.0, Factor 0.0001 clamped to 0.25, Zero factor safe fallback, Negative factor sanitized, 50 successive zoom in/out steps remain finite.
- **B2: Pan Coordinate Extremes & Invariance** (5 tests): Large pan ($10^7$) finite, NaN/undefined fallback to 0, Cursor invariance under non-zero pan offset, Sub-pixel dragging precision, Scale 2.0 stability.
- **B3: Fit-to-View Degenerates** (5 tests): Empty tree fallback, Single-node tree $(0 \times 0)$ centers without zero division, Ultra-wide tree (50:1), Ultra-tall tree (1:50), Zero viewport $(0 \times 0)$ returns safe default.
- **B4: CRUD Validation Limits** (5 tests): Whitespace-only name rejected, 500-char name handled, 5000-char description handled, HTML/JS characters sanitized, Non-existent parent error.
- **B5: LocalStorage Corrupt/Quota Recovery** (5 tests): Corrupted JSON recovers to defaults, Empty string handled, QuotaExceededError caught safely, Missing trees property triggers fallback, Non-object payload triggers fallback.
- **B6: Search Boundary Queries** (5 tests): Empty query returns 0 matches, Whitespace query returns 0 matches, Regex meta-characters search as literal substrings without RegExp error, Vietnamese diacritics match, Global query builds complete expansion set.
- **B7: Deep Hierarchy & Cycles** (5 tests): 100-child wide sibling list traverses in < 5ms, Deep cloning produces true immutability, Root node with null parentId handles traversal, Orphan node detected, 4-tier ancestor chain integrity preserved.
- **B8: Task Linking Edge Cases** (5 tests): Whitespace-padded task ID trimmed, Non-existent task ID returns undefined, 0% progress displays without NaN, 100% progress displays completed badge, Empty designer fallback.

### Tier 3: Cross-Feature Combinations (8 Combinations — 28 Test Cases)
- **C1: Zoom + Quick Search** (4 tests): Search at 0.25x zoom, Search at 2.0x zoom, Clearing search preserves viewport, Navigating to match computes centering pan.
- **C2: Collapse + Quick Search & Ancestor Expansion** (4 tests): Search inside collapsed module derives module ID, Deeply nested node expands all ancestor levels, Applying expansion exposes target in active list, Unrelated branches stay collapsed.
- **C3: Add Child + LocalStorage + Reload Simulation** (4 tests): Added screen persists across simulated session reload, Retains touchpointType and parentId, Multiple children persist entire hierarchy, Unmodified products remain pristine.
- **C4: Edit Node + Task Sync** (3 tests): Assigning requestId resolves task, Unassigning requestId removes task badge, Editing Figma URL preserves task linkage.
- **C5: Delete Branch + Metrics Recalculation** (4 tests): Deleting journey decrements journey by 1 and screens by child count, Toolbar badge reflects count immediately, Deleting module cascades across sub-branches, Deleting leaf screen decrements only screen count.
- **C6: Product Switch + Fit-to-View Recalculation** (3 tests): Switching product updates active tree root and code, Metrics badge updates to match product, Fit-to-View recalculates bounding box for new product layout.
- **C7: CRUD Overrides + Reset to Default** (3 tests): Multiple mutations apply and persist, Reset to Default purges mutations and reloads pristine seed tree, Pristine metrics restored.
- **C8: Rapid Expand/Collapse Cycles** (3 tests): 20 rapid collapse/expand cycles preserve tree structure, Connector coordinates remain invariant with zero drift, Active node count alternates deterministically.

### Tier 4: Real-World Banking Scenarios (5 Scenarios — 16 Test Cases)
- **S1: Retail App eKYC & Cards Journey** (4 tests): Navigate App MBBank IA -> Locate Cards Module -> Open Online Credit Card Journey -> Verify 2 screens with Figma links -> Inspect linked task `UXMB-2026-001` (85% progress & In Progress).
- **S2: Corporate Biz MB Payroll Flow** (3 tests): Select Biz MB -> Inspect Payroll Module -> Verify Maker-Checker Excel upload and digital signature modal -> Verify linked task `UXMB-2026-002` tracking SME credit and payroll.
- **S3: Retail Web Portal QR Sync Flow** (3 tests): Switch to Web Portal -> Inspect Internet Banking -> Navigate QR Login sync flow -> Verify touchpoint screen and dynamic QR countdown.
- **S4: BaaS Open API Partner Sandbox Flow** (3 tests): Access BaaS Open API -> Inspect Embedded Lending -> Inspect API gateway linked to task `UXMB-2026-003` -> Verify Developer Sandbox webview touchpoint and technical Figma spec.
- **S5: Enterprise Design Ops End-to-End Workflow** (3 tests): Lead designer creates new savings journey -> Adds 2 screens, links Figma file and task, persists to LocalStorage -> Runs quick search and verifies instant discovery.

---

## 3. How to Run

```bash
# Run the complete E2E IA test suite
node test-e2e-ia-suite.mjs

# Run project build verification
npm run build

# Run existing unit tests
npm run test
```

---
*Published by Teamwork Preview E2E Test Writer (`teamwork_preview_test_writer_e2e`).*
