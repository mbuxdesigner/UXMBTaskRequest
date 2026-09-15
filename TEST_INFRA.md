# Information Architecture (IA) Interactive Mindmap Canvas — Test Infrastructure & Methodology Specification (TEST_INFRA.md)

> **Document Version**: 1.0.0  
> **Status**: APPROVED & PUBLISHED  
> **Architectural Scope**: MBBank UX Request Portal — IA Interactive Mindmap Canvas (`#ia`)  
> **Target Framework**: Node.js ESM (`node:assert/strict`), TypeScript AST / Contract Static Analysis, Pure Logic Oracles  
> **Test Suite Entrypoint**: `node test-e2e-ia-suite.mjs` (Project Root)  

---

## 1. Executive Summary & Testing Philosophy

The Information Architecture (IA) Interactive Mindmap Canvas is a mission-critical subsystem within the MBBank UX Request Portal. It provides a 4-tier visual hierarchy across MBBank digital channels (`App MBBank`, `Biz MB`, `Web Portal`, `BaaS Open API`), real-time linkage to design tasks (`UXRequest`), inline node CRUD with persistent state, and an interactive 60+ FPS canvas with cursor-centric zoom and intelligent search path auto-expansion.

To guarantee pristine quality, zero regressions, and mathematical correctness across all features, this test infrastructure enforces an **Opaque-Box 4-Tier Testing Methodology**:
- **Tier 1 — Feature Coverage**: Comprehensive unit & functional contract verification covering all 22 features (minimum 5 isolated test cases per feature = 110 test cases).
- **Tier 2 — Boundary & Corner Cases**: Stressing limits, degenerate states, extreme numbers, zero values, special characters, and corrupted storage (minimum 5 test cases across 8 boundary domains = 40 test cases).
- **Tier 3 — Cross-Feature Combinations**: Pairwise and complex multi-feature interactions (zoom + search, collapse + edit, delete + metric update, localStorage + session reload = 28 test cases).
- **Tier 4 — Real-World Banking Application Scenarios**: End-to-end user workflows modeling actual retail banking, corporate banking, retail portal, embedded API, and enterprise design operations (16 test cases).

**Grand Total**: **194 automated test cases** executed synchronously with deterministic verification and sub-second execution speed.

---

## 2. Test Architecture & Directory Layout

```
UXMBTaskRequest-main/
├── TEST_INFRA.md                     # This documentation (Test methodology & catalog)
├── TEST_READY.md                     # Readiness publication & runner commands
├── test-e2e-ia-suite.mjs             # The unified 4-tier automated test suite runner
│
├── src/
│   ├── types/ia.ts                   # 4-tier IA data types & schema contracts
│   ├── data/iaMockData.ts            # Realistic seed mock datasets for 4 products
│   ├── hooks/
│   │   ├── useCanvasTransform.ts     # Viewport math (zoomAtPoint, fitToView, cursor invariance)
│   │   └── useIATreeState.ts         # Tree state, CRUD mutations, search & localStorage sync
│   ├── components/
│   │   ├── Sidebar.tsx               # Navigation item & floating indicator contract
│   │   ├── AppHeader.tsx             # Header metadata & breadcrumb contract
│   │   └── ia/
│   │       ├── IACanvasViewport.tsx  # 60+ FPS Canvas container with pan/zoom & grid
│   │       ├── IABezierConnectors.tsx# SVG cubic bezier connection curves
│   │       ├── IATreeNodeCard.tsx    # 4-tier card components with badges & avatars
│   │       ├── IAToolbar.tsx         # Product switcher, count badge, search, zoom/fit
│   │       └── IANodeEditorModal.tsx # Inline Add/Edit/Delete dialog
│   ├── config/navVisibilityConfig.ts # RBAC matrix configuration for "ia" page
│   ├── pages/IAPage.tsx              # Root IA layout coordinating canvas, toolbar, drawer
│   └── App.tsx                       # Routing table, #ia hash handler, pageTitles
└── ...
```

---

## 3. Mathematical & Logical Invariant Contracts

### 3.1. Cursor-Centric Zoom Invariance Contract
When zooming at mouse pointer coordinate $(C_x, C_y)$ in viewport space, the canvas point under the cursor before zoom must remain exactly under the cursor after zoom:
$$\frac{C_x - X_{new}}{S_{new}} = \frac{C_x - X_{old}}{S_{old}}$$
$$X_{new} = C_x - (C_x - X_{old}) \times \frac{S_{new}}{S_{old}}$$
$$Y_{new} = C_y - (C_y - Y_{old}) \times \frac{S_{new}}{S_{old}}$$
Where:
- $S_{new} = \text{clamp}(S_{old} \times \text{factor}, 0.25, 2.0)$
- Scale factor $\Delta > 0$; scale strictly bound in $[0.25, 2.0]$ ($25\%$ to $200\%$).

### 3.2. Bounding-Box Fit-to-View Centering Contract
Given $N$ active (non-collapsed) nodes with bounding box $[\min X, \max X, \min Y, \max Y]$ and canvas dimensions $(W, H)$:
$$\text{contentWidth} = \max X - \min X + 2 \times \text{padding}$$
$$\text{contentHeight} = \max Y - \min Y + 2 \times \text{padding}$$
$$\text{scale} = \text{clamp}\left(\min\left(\frac{W}{\text{contentWidth}}, \frac{H}{\text{contentHeight}}\right), 0.25, 1.25\right)$$
$$\text{panX} = \frac{W}{2} - \frac{\min X + \max X}{2} \times \text{scale}$$
$$\text{panY} = \frac{H}{2} - \frac{\min Y + \max Y}{2} \times \text{scale}$$

### 3.3. Cubic Bezier Path Mathematical Invariance
For a parent node right edge $(x_1, y_1)$ connecting to child node left edge $(x_2, y_2)$:
$$dx = x_2 - x_1$$
$$\text{controlOffset} = \max\left(40, \frac{dx}{2}\right)$$
$$C_1 = (x_1 + \text{controlOffset}, y_1)$$
$$C_2 = (x_2 - \text{controlOffset}, y_2)$$
Path string format: `M x1 y1 C (x1+offset) y1, (x2-offset) y2, x2 y2`
Ensures smooth, tangent-continuous curves without oscillation or cusp singularities regardless of branch distance.

### 3.4. Search Multi-Field Matching & Ancestor Path Expansion Contract
A query $Q$ matches a node $U$ if any of:
1. $U.\text{name} \ni Q$ (case-insensitive substring)
2. $U.\text{code} \ni Q$
3. $U.\text{description} \ni Q$
4. $U.\text{requestId} \ni Q$
5. $\text{LinkedRequest}(U).\text{title} \ni Q$
6. $U.\text{assignedDesigner} \ni Q$ or $\text{LinkedRequest}(U).\text{assigned\_designer} \ni Q$

For each matched node $U$, every ancestor node $A \in \text{Ancestors}(U)$ is collected into $\text{ancestorIdsToExpand}$. All ancestors must have $\text{collapsed} = \text{false}$ during search active state.

---

## 4. Four-Tier Test Case Catalog

### 4.1. Tier 1: Isolated Feature Coverage (F1 to F22, >= 5 test cases each = 110 tests)

| Feature | ID Range | Focus Areas Tested |
|---------|----------|-------------------|
| **F1: Sidebar IA Nav Item** | `T1.F1.1`–`T1.F1.5` | Page type union contains `"ia"`, navigation item `{ id: "ia", label: "Kiến trúc Thông tin" }`, icon assignment, platform section grouping, active indicator configuration. |
| **F2: App Routing & Headers** | `T1.F2.1`–`T1.F2.5` | URL hash `#ia` recognition, `validPages` inclusion, page title `"Kiến trúc Thông tin (IA)"`, `AppHeader` PAGE_METADATA mapping, ErrorBoundary wrapping. |
| **F3: RBAC & Nav Visibility** | `T1.F3.1`–`T1.F3.5` | Role matrix includes `ia` key, Admin/Design Owner/Designer/PO access allowed, role fallback navigation, default navigation order. |
| **F4: Product Switcher Bar** | `T1.F4.1`–`T1.F4.5` | 4 products supported (`app-mbbank`, `biz-mb`, `web-portal`, `baas`), active product switching, color token styling, icon mapping, invalid product fallback. |
| **F5: Screen/Feature Metrics Badge** | `T1.F5.1`–`T1.F5.5` | Badge text format `[X luồng · Y màn hình]`, accurate Tier 3 count, accurate Tier 4 count, empty tree handling (0/0), dynamic update upon branch collapse/expand. |
| **F6: 4-Tier IA Data Schema** | `T1.F6.1`–`T1.F6.5` | `IATier` valid values (1, 2, 3, 4), `IANode` required and optional fields, `IATouchpointType` union, `IAProductInfo` structure, `IALocalStorageData` structure. |
| **F7: Realistic Seed Mock Data** | `T1.F7.1`–`T1.F7.5` | All 4 products populated, Root nodes have Tier 1 and null parentId, Children have valid tier progression ($T_{child} = T_{parent} + 1$), unique IDs across dataset, required descriptions. |
| **F8: 60+ FPS Canvas Viewport** | `T1.F8.1`–`T1.F8.5` | Container transform CSS `translate3d(x, y, 0) scale(s)`, hardware acceleration styles (`will-change`, `backface-visibility`), dot-grid background, mouse drag pan calculation, cursor grab/grabbing states. |
| **F9: Cursor-Centric Zoom** | `T1.F9.1`–`T1.F9.5` | Zoom in multiplier ($1.15$), Zoom out multiplier ($0.85$), Cursor invariance formula verification, Min zoom clamp ($0.25$), Max zoom clamp ($2.0$). |
| **F10: Fit-to-View Engine** | `T1.F10.1`–`T1.F10.5` | Bounding box calculation, optimal scale calculation, center pan calculation, padding buffer preservation, empty/single-node tree behavior. |
| **F11: Expand/Collapse Branches** | `T1.F11.1`–`T1.F11.5` | Toggle `collapsed` state on node, subtree hiding when collapsed, child state preservation, root node collapse toggle, leaf node non-collapsible behavior. |
| **F12: SVG Cubic Bezier Connectors** | `T1.F12.1`–`T1.F12.5` | Control point calculation ($dx / 2$), SVG path `M C` syntax validity, horizontal left-to-right orientation, stroke styling and theme color inheritance, hidden connector for collapsed children. |
| **F13: 4-Tier Card Component** | `T1.F13.1`–`T1.F13.5` | Tier 1 Root visual styles (heavy elevation, brand gradient), Tier 2 Module styles (border accent), Tier 3 Feature styles (journey badges), Tier 4 Screen styles (touchpoint pill), interactive hover/tactile props. |
| **F14: Task Association & Badges** | `T1.F14.1`–`T1.F14.5` | `requestId` mapping to `UXRequest`, designer avatar rendering, status badge color mapping, progress bar percentage display, unassigned/missing task fallback. |
| **F15: RequestDetail Drawer Drilldown**| `T1.F15.1`–`T1.F15.5` | Node click triggers drawer selection, pass correct `UXRequest` object, drawer open state toggle, drawer close handler, stopPropagation on secondary controls. |
| **F16: Direct Figma Linkage** | `T1.F16.1`–`T1.F16.5` | Figma button renders when `figmaUrl` present, window.open called with `_blank` and `noopener`, URL protocol validation (`https://`), stopPropagation isolates canvas click, hidden button when no URL. |
| **F17: Inline Add Child Node** | `T1.F17.1`–`T1.F17.5` | Add child to Tier 1 creates Tier 2, Add child to Tier 2 creates Tier 3, Add child to Tier 3 creates Tier 4, Tier 4 cannot have children, auto-expand parent when child added. |
| **F18: Inline Edit Node** | `T1.F18.1`–`T1.F18.5` | Edit node name, edit node description, edit node code, edit figmaUrl, name validation (non-empty string required). |
| **F19: Inline Delete Node** | `T1.F19.1`–`T1.F19.5` | Delete leaf node removes from parent children, delete branch node removes entire subtree, Tier 1 Product Root deletion blocked/prohibited, parent child array immutably updated, cleanup orphaned mappings. |
| **F20: LocalStorage Persistence** | `T1.F20.1`–`T1.F20.5` | Storage key `ux_portal_ia_tree_data_v1`, serialization on CRUD mutation, deserialization on startup, JSON schema version header (`version: 1`), fallback to default on missing storage. |
| **F21: Reset to Default** | `T1.F21.1`–`T1.F21.5` | Reverts custom tree mutations back to seed mock data, clears localStorage key, restores pristine counts, confirmation dialog requirement, toast notification trigger. |
| **F22: Quick Search & Highlight Path**| `T1.F22.1`–`T1.F22.5` | Matches node name, matches node code, matches linked task title, matches assigned designer, builds ancestor expansion set. |

---

### 4.2. Tier 2: Boundary & Corner Cases (8 Domains, >= 5 test cases each = 40 tests)

| Category | ID Range | Focus Areas Tested |
|----------|----------|-------------------|
| **B1: Zoom Clamping Extremes** | `T2.B1.1`–`T2.B1.5` | Zoom in beyond 200% clamped at exactly 2.0, Zoom out beyond 25% clamped at exactly 0.25, Zero factor handling, Negative factor rejected, 100 consecutive zoom clicks remain finite. |
| **B2: Pan Coordinate Extremes** | `T2.B2.1`–`T2.B2.5` | Very large pan values ($10^6$) remain finite, NaN/undefined input fallback to 0, Cursor coordinates outside canvas viewport handled smoothly, Sub-pixel dragging precision, Pan with scale $\neq 1.0$. |
| **B3: Fit-to-View Degenerates** | `T2.B3.1`–`T2.B3.5` | Empty tree (0 nodes) returns default transform, Single-node tree (width/height = 0) returns centered view without zero division, Ultra-wide tree (aspect ratio 50:1), Ultra-tall tree (aspect ratio 1:50), Zero viewport dimensions (0x0). |
| **B4: CRUD Validation Limits** | `T2.B4.1`–`T2.B4.5` | Whitespace-only name (`"   "`) rejected, Maximum length name (255 chars) truncated smoothly, Maximum description (2000 chars), Special characters in name (`<script>`, `&`, `"`, `'`), Adding child to non-existent parent returns error. |
| **B5: LocalStorage Malformed/Corrupt**| `T2.B5.1`–`T2.B5.5`| Corrupted JSON string in localStorage recovers gracefully without crash, Empty string in localStorage recovers to seed data, Storage quota exceeded (`QuotaExceededError`) caught safely, Unsupported schema version auto-migrated, Non-object storage content ignored. |
| **B6: Search Boundary Queries** | `T2.B6.1`–`T2.B6.5` | Empty query returns 0 matches and empty expansion set, Whitespace query returns 0 matches, Regex special characters (`.*+?^${}()|[]\`) do not throw syntax errors, Unicode/Vietnamese diacritic query (`"Vay thấu chi"`), Query matching 100% of nodes. |
| **B7: Deep Hierarchy & Cycles** | `T2.B7.1`–`T2.B7.5` | Tree with 50+ nodes in single branch, Preventing circular parent-child references, Node pointing to non-existent parentId, Multiple nodes sharing same tier, Flat sibling branches (100+ children). |
| **B8: Task Linking Edge Cases** | `T2.B8.1`–`T2.B8.5` | `requestId` with leading/trailing spaces, `requestId` referencing non-existent task, Task with progress = 0%, Task with progress = 100%, Task with empty designer name. |

---

### 4.3. Tier 3: Cross-Feature Combinations (8 Combinations, 28 tests)

| Combination | ID Range | Complex Interaction Tested |
|-------------|----------|----------------------------|
| **C1: Zoom + Quick Search** | `T3.C1.1`–`T3.C1.4` | Performing quick search while zoomed at 25% or 200%; ensuring highlighted node coordinate transform remains valid. |
| **C2: Collapse + Quick Search** | `T3.C2.1`–`T3.C2.4` | Deeply nested leaf node inside collapsed Tier 2 and Tier 3 ancestors; search triggers ancestor expansion so node is exposed and visible. |
| **C3: Add Child + LocalStorage + Reload** | `T3.C3.1`–`T3.C3.4` | Adding new screen at Tier 4, serializing to localStorage, instantiating fresh tree state from storage, verifying new screen persists with exact parent link. |
| **C4: Edit Node + Task Sync** | `T3.C4.1`–`T3.C4.3` | Updating node's `requestId` immediately updates displayed task title, status badge color, progress percentage, and designer avatar. |
| **C5: Delete Branch + Metrics Recalculation** | `T3.C5.1`–`T3.C5.4` | Deleting a Tier 2 module containing 3 feature journeys (Tier 3) and 12 screens (Tier 4); verifying toolbar badge immediately decrements by $(3, 12)$. |
| **C6: Product Switch + Fit-to-View** | `T3.C6.1`–`T3.C6.3` | Switching from `app-mbbank` (large tree) to `baas` (compact tree); verifying active tree swaps, metrics update, and Fit-to-View recalculates bounding box. |
| **C7: CRUD Overrides + Reset to Default** | `T3.C7.1`–`T3.C7.3` | Modifying tree heavily (adding 5 nodes, deleting 2, renaming 3), triggering Reset to Default; verifying storage is purged and pristine seed tree is restored. |
| **C8: Rapid Expand/Collapse Cycles** | `T3.C8.1`–`T3.C8.3` | Stress-toggling collapse 20 times in rapid sequence; verifying tree height stays consistent, connector coordinates don't drift, and no duplicate nodes are created. |

---

### 4.4. Tier 4: Real-World Banking Application Scenarios (5 Scenarios, 16 tests)

| Scenario | ID Range | Operational Banking Workflow Tested |
|----------|----------|-------------------------------------|
| **S1: Retail App eKYC & Cards Journey** | `T4.S1.1`–`T4.S1.4` | Customer navigates App MBBank IA -> Cards Module -> Online Credit Card Flow -> Verifies 3 screens (Select Card, NFC eKYC, Digital Contract) -> Links to `UXMB-2026-001` -> Inspects 85% progress & Figma link. |
| **S2: Corporate Biz MB Payroll Flow** | `T4.S2.1`–`T4.S2.3` | Corporate user selects Biz MB product -> Inspects Maker-Checker approval and automated Payroll Module -> Verifies multi-tier screens (Excel upload, Dual Authorization, Success Receipt) -> Checks PO pending status. |
| **S3: Retail Web Portal QR Sync Flow** | `T4.S3.1`–`T4.S3.3` | Web Portal Internet Banking product -> Navigation to QR Login Sync flow -> Verifies screens linked to `UXMB-2026-003` -> Validates Released status and 100% completion. |
| **S4: BaaS Open API Partner Sandbox Flow** | `T4.S4.1`–`T4.S4.3` | FinTech partner explores BaaS Open API -> Navigates to Embedded Lending API & Developer Sandbox -> Verifies Tier 4 API endpoints/mock screens -> Validates Figma technical spec link. |
| **S5: Enterprise Design Ops End-to-End** | `T4.S5.1`–`T4.S5.3` | Design Lead creates new "Tiết kiệm mục tiêu" flow under Savings Module -> Adds 2 new screens -> Modifies titles -> Saves to LocalStorage -> Runs Quick Search -> Verifies full-text discovery. |

---

## 5. Execution Instructions & Exit Code Contract

### 5.1. Running the Test Suite
From the repository root (`UXMBTaskRequest-main`), execute:
```bash
node test-e2e-ia-suite.mjs
```

### 5.2. Exit Code Contract
- **Exit Code `0`**: All 194 tests across Tiers 1–4 passed with 100% assertion success.
- **Exit Code `1`**: Any assertion failure or unexpected exception occurred. Full error trace, expected vs. actual values, and test ID are printed to stderr.

---
*Authored by Teamwork Preview E2E Test Writer for MBBank UX Request Portal.*
