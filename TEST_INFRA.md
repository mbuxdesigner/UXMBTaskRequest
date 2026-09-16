# UXMB Task Request — Design System & Motion Standardization: Test Infrastructure & Methodology Specification (TEST_INFRA.md)

> **Document Version**: 2.0.0  
> **Status**: APPROVED & PUBLISHED  
> **Architectural Scope**: UXMB Task Request UI & Motion Standardization (Follow-up 2026-09-15T17:01:11Z, R1–R4, Features F1–F18)  
> **Target Framework**: Node.js ESM (`node:assert/strict`), TypeScript AST / Static Analysis, Pure Logic Oracles  
> **Test Suite Entrypoint**: `node test-e2e-design-system.mjs` (Project Root)  

---

## 1. Executive Summary & Testing Philosophy

The Design System & Motion Standardization milestone establishes visual consistency, robust responsive adaptation across all device tiers (375px Mobile, 768px Tablet, 1024px Small Desktop, 1440px Wide Desktop), seamless micro-interactions with 60fps spring physics and zero cumulative layout shift (CLS = 0), and full integration of Keenthemes reUI component primitives (`Stepper`, `Timeline`, `Frame`, `Drawer`).

To ensure total quality, prevent regression, and verify interface contracts without facade tests, this test infrastructure enforces an **Opaque-Box 4-Tier Testing Methodology**:
- **Tier 1 — Feature Coverage**: Isolated unit and contract verification covering 7 core feature domains (Button #0F172A, Status Pills, Priority Tags, Stepper, Table, Form, Admin) with at least 5 tests per feature (42 test cases).
- **Tier 2 — Boundary & Corner Cases**: Responsive breakpoints (375px, 768px, 1024px, 1440px), Drawer viewport bounds, and text truncation/overflow deflection (35 test cases).
- **Tier 3 — Cross-Feature Combinations**: Pairwise and complex multi-component interactions including status transitions, stepper + timeline activity sync, responsive tab routing, and compound multi-dimensional filtering (20 test cases).
- **Tier 4 — Real-World Application Scenarios**: End-to-end user workflows modeling actual task creation, detail inspection & stage advancement, admin configuration synchronization, and multi-device responsive stress verification (17 test cases).

**Grand Total**: **114 automated test cases** executed synchronously with sub-100ms execution speed, zero external browser flakiness, and deterministic exit code contracts.

---

## 2. Test Architecture & Directory Layout

```
UXMBTaskRequest-main/
├── TEST_INFRA.md                     # This specification (Test methodology & catalog)
├── TEST_READY.md                     # Readiness publication & runner checklist
├── test-e2e-design-system.mjs        # The 4-tier automated E2E test suite runner
├── doc/
│   └── UI_DESIGN_SYSTEM.md           # Design system tokens and pattern specifications
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx            # Dark Navy #0F172A button primitive
│   │   │   ├── badge.tsx             # Semantic badge primitive
│   │   │   └── dialog.tsx            # Modal primitive
│   │   ├── reui/
│   │   │   ├── stepper.tsx           # ReUI Stepper with Dark Navy current step
│   │   │   ├── timeline.tsx          # ReUI Timeline activity log
│   │   │   ├── frame.tsx             # ReUI Frame card wrapper
│   │   │   ├── drawer.tsx            # Slide-over Drawer with responsive bounds
│   │   │   └── task-filter-popover.tsx
│   │   ├── track/
│   │   │   ├── SolutionAgentsTable.tsx # Grouped table with sticky right-0 column
│   │   │   ├── RequestDetail.tsx     # Task detail drawer with Stepper & Timeline
│   │   │   └── RequestCard.tsx
│   │   └── form/
│   │       ├── RequestForm.tsx       # 2-column form + sticky summary card
│   │       └── FileUpload.tsx
│   ├── config/
│   │   ├── statusConfig.ts           # Semantic colors (Emerald UI Design, Blue Wireframe)
│   │   └── formConfig.ts
│   ├── pages/
│   │   ├── TrackRequestPage.tsx      # Table and board views
│   │   ├── CreateRequestPage.tsx     # Request creation page
│   │   ├── QuanLyPage.tsx            # Admin 6-table management & Frame cards
│   │   ├── TongQuanPage.tsx          # Dashboard overview
│   │   └── IAPage.tsx                # IA Interactive Canvas
│   └── data/
│       └── mockData.ts               # Mock requests, squads, and reference schemas
└── package.json
```

---

## 3. Interface Contracts & Visual Tokens

### 3.1. Primary Button Token (`src/components/ui/button.tsx`)
- **Default & Primary Variants**:
  - Background: `bg-slate-900` (`#0F172A`)
  - Text: `text-white`
  - Hover: `hover:bg-slate-800`
  - Active: `active:bg-slate-950`
  - Focus Ring: `focus-visible:ring-slate-900/30`
- **Secondary / Outline Variant**:
  - Background: `bg-white`
  - Border: `border border-slate-200`
  - Text: `text-slate-700`
  - Hover: `hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900`
- **Height Scale**:
  - `xs`: `h-7 px-2.5 text-xs rounded-lg`
  - `sm`: `h-8 px-3 text-xs rounded-xl`
  - `default`: `h-9.5 px-4 text-sm rounded-xl`
  - `lg`: `h-11 px-5 text-sm rounded-xl`
  - `icon`: `h-9 w-9 rounded-xl`
  - `iconSm`: `h-7.5 w-7.5 rounded-lg`

### 3.2. Status Configuration (`src/config/statusConfig.ts`)
- **Semantic Colors**:
  - `UI Design` (Emerald Green): `bg-emerald-50 text-emerald-700 border-emerald-200 dot: bg-emerald-500`
  - `Wireframe` (Blue): `bg-blue-50 text-blue-700 border-blue-200 dot: bg-blue-500`
  - `Define đầu bài` (Purple): `bg-purple-50 text-purple-700 border-purple-200 dot: bg-purple-600`
  - `Chờ xác nhận` (Amber): `bg-amber-50 text-amber-700 border-amber-200 dot: bg-amber-500`
  - `Bị chặn` / `Quá tải` (Rose): `bg-rose-50 text-rose-700 border-rose-200 dot: bg-rose-500`
- **Dual Pending Classification**:
  - `PO Pending`: Quá hạn 24h PO chưa duyệt (`bg-amber-50 text-amber-800 border-amber-300 dot: bg-amber-500`)
  - `Pending`: Tạm dừng theo yêu cầu của Designer (`bg-slate-100 text-slate-700 border-slate-300 dot: bg-slate-500`)

### 3.3. Priority Tags (Lv1 - Lv4 Standard)
- `Lv1`: `bg-rose-50 text-rose-700 border-rose-200` | Flag: `fill-rose-500 text-rose-500` | Level 1 ("Cao nhất")
- `Lv2`: `bg-amber-50 text-amber-700 border-amber-200` | Flag: `fill-amber-500 text-amber-500` | Level 2 ("Cao")
- `Lv3`: `bg-blue-50 text-blue-700 border-blue-200` | Flag: `fill-blue-500 text-blue-500` | Level 3 ("Trung bình")
- `Lv4`: `bg-slate-50 text-slate-600 border-slate-200` | Flag: `text-slate-400 fill-slate-400` | Level 4 ("Thấp nhất")

### 3.4. ReUI Stepper (`src/components/reui/stepper.tsx`)
- Current Step: `bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/25 ring-4 ring-slate-900/15`
- Completed Step: `bg-emerald-600 border-emerald-600 text-white` with Check icon
- Upcoming Step: `bg-slate-50 border-slate-200 text-slate-400`
- Error Step: `bg-rose-500 border-rose-500 text-white` with AlertCircle icon

### 3.5. Responsive Invariants
- `375px (Mobile)`: Single column (`grid-cols-1`), table horizontal scroll (`overflow-x-auto`), stepper descriptions hidden (`hidden sm:block`), touch targets >= 32-44px.
- `768px (Tablet)`: Drawer width clamped to `calc(100vw - 48px)` preventing 24px overflow, metric cards in 2 columns, collapsible navigation rail.
- `1024px (Small Desktop)`: Double sidebar squeeze resolved, form transitions to side-by-side or stacked summary, table sticky action column locked at `right-0`.
- `1440px (Wide Desktop)`: Full table column rendering, sticky summary card positioned at `top-6`, max container width constraints (`max-w-7xl` or fluid margins).

---

## 4. Four-Tier Test Inventory

### Tier 1: Feature Coverage (42 Tests)
- **F1: Primary Button #0F172A Token** (6 tests): Default/primary Dark Navy tokens, outline tokens, size variants, loading state, snappy springs, polymorphic asChild.
- **F2: Status Pills & Dot Primitives** (6 tests): Emerald UI Design, Blue Wireframe, Purple/Amber/Rose semantics, prefix normalization, Dual Pending classification, unknown fallback.
- **F3: Priority Tags** (6 tests): Lv1 Rose, Lv2 Amber, Lv3 Blue, Lv4 Slate, technical/Vietnamese aliases, default Lv3 fallback.
- **F4: ReUI Stepper** (6 tests): Dark Navy current indicator, emerald completed, upcoming slate, error rose, horizontal separators, onStepClick callback.
- **F5: Grouped Data Table** (6 tests): Sticky right-0 action column, status pill cells, priority badge cells, squad grouping, overflow-x-auto wrapper, empty state.
- **F6: Request Form** (6 tests): 2-column layout, sticky summary panel, live field binding, field validation, Dark Navy submit button, attachment mode switching.
- **F7: Admin 6-Table Management** (6 tests): 6 configuration sections, ReUI Frame metric cards, Dark Navy table action buttons, 1024px layout, localStorage CRUD persistence, custom phase sync.

### Tier 2: Boundary & Corner Cases (35 Tests)
- **B1: Mobile 375px Viewport** (6 tests): Horizontal blowout prevention, table scroll container, 1-col form stack, hidden stepper description, touch target sizing, drawer slide-over.
- **B2: Tablet 768px Viewport** (6 tests): Drawer width clamp preventing 24px overflow, 2-col metric cards, toolbar wrapping, sidebar collapse, modal clamp, stepper connectors.
- **B3: Small Desktop 1024px Viewport** (6 tests): Double sidebar squeeze resolution, form breakpoint transition, sticky action column lock, stepper label spacing, Frame padding scale, drawer proportional width.
- **B4: Wide Desktop 1440px Viewport** (5 tests): Centered container max-w, sticky summary scroll boundary, full table metadata, stepper fluid stretching, drawer right-alignment.
- **B5: Drawer Bounds & Modals** (6 tests): ARIA dialog attributes, Escape key listener, body scroll lock, independent DrawerBody scroll, size presets, 4-side slide-over coordinates.
- **B6: Text Truncation & Overflow Deflection** (6 tests): 250-char title truncation, long email wrapping, button label padding integrity, whitespace-nowrap badges, accordion overflow-hidden for zero CLS, extreme URL strings.

### Tier 3: Cross-Feature Combinations (20 Tests)
- **C1: Status Transition Pipeline** (5 tests): Pill color update, Stepper step progression, automatic activity log entry, grouped table squad partition, error state on blocked.
- **C2: Stepper + Timeline Synchronization** (5 tests): Stepper activeStep correlation, step selection event filter, overflow-hidden activity list (CLS = 0), system note vs comment separation, milestone icon color alignment.
- **C3: Responsive Tabs & AnimatePresence** (5 tests): URL hash routing sync, layoutId sliding active indicator, filter persistence on tab return, AnimatePresence mode="wait", memory leak prevention.
- **C4: Compound Multi-Dimensional Filtering** (5 tests): Multi-criteria intersection, squad group count reactivity, empty state with reset filter CTA, case-insensitive text search, filter reset baseline restoration.

### Tier 4: Real-World Application Scenarios (17 Tests)
- **S1: Task Creation Flow** (4 tests): 2-column form input with live sticky summary, API payload generation, task insertion into table, uniform styling presentation.
- **S2: Detail Inspection Workflow** (4 tests): Drawer launch with tablet width bounds, ReUI Stepper inspection, ReUI Timeline review, phase advancement from drawer.
- **S3: Admin Configuration Lifecycle** (4 tests): Navigation without 1024px double sidebar squeeze, 6 Frame metric cards review, phase editing in Phân loại, getStatusConfig palette synchronization.
- **S4: Multi-Device Responsive Lifecycle** (5 tests): 1440px -> 1024px -> 768px -> 375px transition simulation, drawer dynamic resizing, sticky action column integrity, zero CLS enforcement, full suite pass verification.

---

## 5. Test Execution & Verification

### Running the Test Suite
```bash
node test-e2e-design-system.mjs
```

### Exit Code Contract
- `0`: 100% of all 114 test assertions passed.
- `1`: Any assertion failure occurred (terminates immediately with descriptive error log).

### Build & Integration Verification
```bash
npm run build   # Verifies TypeScript compilation and bundle packaging
npm run test    # Runs repository unit and smart diffing regression suite
```
