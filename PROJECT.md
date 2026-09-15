# Project: UXMB Information Architecture (IA) Interactive Mindmap Canvas

## Architecture
The Information Architecture (IA) system provides an interactive, hardware-accelerated mindmap canvas for visualizing and managing the 4-tier banking information architecture across MBBank's digital products (App MBBank, Biz MB, Web Portal, BaaS Open API).

```
User Navigation (Sidebar / App.tsx: page = "ia")
  │
  ▼
IAPage.tsx (Main Layout & Coordination Frame)
  ├── IAToolbar.tsx (Product Switcher, Count Badges, Quick Search, Zoom/Fit Controls, Reset)
  └── IACanvasViewport.tsx (60+ FPS Viewport: Pan, Zoom, Grid Background, Wheel Invariance)
        ├── IABezierConnectors.tsx (SVG Cubic Bezier Paths with Zero Drift)
        └── IATreeNodeCard.tsx (4-Tier Cards: Badges, Avatars, Progress, Figma Button, Expand/Collapse)
              │
              ├── RequestDetail.tsx (Drawer drilldown for linked UXRequest)
              └── IANodeEditorModal.tsx (Inline Add Child / Edit Title / Delete Node)
```

- **State Management & Persistence**:
  - `useIATreeState.ts`: Manages the 4-tier tree hierarchy, node mutations (CRUD), search matching, ancestor path expansion, and `localStorage` synchronization (`ux_portal_ia_tree_data_v1`).
  - `useCanvasTransform.ts`: Hardware-accelerated canvas pan/zoom engine with cursor-centric invariance, rAF animation, boundary clamping (25%–200%), and bounding-box Fit-to-View calculation.
- **Motion & Accessibility**:
  - Root `<MotionConfig reducedMotion="user">` compliance.
  - Motion tokens from `src/lib/motion.ts`: `springs.snappy` (buttons, toggles), `springs.gentle` (drawer, Fit-to-View), `drawerVariants`.

---

## Feature Inventory
Every feature extracted during the Survey phase is enumerated here and assigned to a milestone.

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Sidebar IA Nav Item | Add "Kiến trúc Thông tin" (`page = "ia"`) to `Sidebar.tsx` with Network icon and floating indicator | M1 | Survey |
| 2 | App Routing & Headers | Add `#ia` route to `App.tsx`, `AppHeader.tsx`, and `pageTitles` with breadcrumbs | M1 | Survey |
| 3 | RBAC & Nav Visibility | Configure role permissions in `navVisibilityConfig.ts` & `QuanLyPage.tsx` matrix | M1 | Survey |
| 4 | Product Switcher Bar | Top toolbar switcher for 4 products (App MBBank, Biz MB, Web Portal, BaaS Open API) | M1 | Survey |
| 5 | Screen/Feature Metrics Badge | Display dynamic count badge `[X luồng · Y màn hình]` per product | M1 | Survey |
| 6 | 4-Tier IA Data Schema | Type definitions (`IATier`, `IANode`, `IAProductInfo`, `IALocalStorageData`) in `ia.ts` | M1 | Survey |
| 7 | Realistic Seed Mock Data | Rich 4-tier tree datasets for all 4 products in `iaMockData.ts` | M1 | Survey |
| 8 | 60+ FPS Canvas Viewport | GPU-accelerated pan/zoom canvas container (`translate3d`, `scale`) | M2 | Survey |
| 9 | Cursor-Centric Zoom | Mouse wheel and button zoom (25%–200%) with cursor coordinate invariance | M2 | Survey |
| 10 | Fit-to-View Engine | Automatic bounding-box calculation and camera centering with padding | M2 | Survey |
| 11 | Expand/Collapse Branches | Animated subtree toggle with tidy tree height clamping via Framer Motion | M2 | Survey |
| 12 | SVG Cubic Bezier Connectors | Smooth hardware-accelerated cubic bezier connector paths connecting nodes | M2 | Survey |
| 13 | 4-Tier Card Component | Visual distinction for Root (L1), Module (L2), Feature (L3), Screen (L4) | M2 | Survey |
| 14 | Task Association & Badges | Map nodes to `UXRequest`, display Designer avatar, status badge, progress % | M2 | Survey |
| 15 | RequestDetail Drawer Drilldown | Clicking linked task node opens `RequestDetail` drawer with live synchronization | M2 | Survey |
| 16 | Direct Figma Linkage | Dedicated Figma action button opening design file/prototype in new tab | M2 | Survey |
| 17 | Inline Add Child Node | Add child node at next tier (Tiers 1-3) with validation and auto-expand | M2 | Survey |
| 18 | Inline Edit Node | Modal/popover to edit node title, description, code, figmaUrl, and task ID | M2 | Survey |
| 19 | Inline Delete Node | Delete node with confirmation dialog; protect Tier 1 Product Root from deletion | M2 | Survey |
| 20 | LocalStorage Persistence | Automatic persistence to `localStorage` key `ux_portal_ia_tree_data_v1` | M2 | Survey |
| 21 | Reset to Default | Reset to pristine seed data with confirmation modal and toast notification | M2 | Survey |
| 22 | Quick Search & Highlight Path | Search bar matching title/task/code/designer; auto-expand ancestor path & glow ring | M2 | Survey |
| 23 | E2E Test Suite (Tiers 1-4) | Opaque-box test suite verifying all 22 features across 4 tiers | E2E-Track | Survey |
| 24 | Adversarial Hardening (Tier 5) | White-box edge-case and stress test hardening | M3 | Survey |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Suite | Create `TEST_INFRA.md`, runner `test-e2e-ia-suite.mjs` (Tiers 1-4), publish `TEST_READY.md` | none | DONE |
| M1 | Navigation & Product Selector | Sidebar `page="ia"`, App routing, AppHeader, RBAC, Product Switcher, Metric Badges, IA Types & Mock Data | none | DONE |
| M2 | Interactive Mindmap Canvas & Management | 60+ FPS Viewport, Pan/Zoom, Cursor Invariance, Fit-to-View, 4-Tier Cards, Bezier Connectors, Task Badges, RequestDetail Drawer, Figma Link, Inline CRUD, LocalStorage Persistence, Reset to Default, Quick Search & Path Glow | M1 | DONE |
| M3 | Final Verification & Hardening | Pass 100% E2E tests (194/194), Tier 5 Adversarial Hardening, `npm run build`, `npm run test` (100%), 60+ FPS verification | M2, E2E | DONE |

---

## Interface Contracts

### 1. Navigation & App Routing Contract
- `Sidebar.tsx`:
  - `export type Page = "overview" | "create" | "track" | "manage" | "test" | "compressor" | "ia"`
  - Add `{ id: "ia", label: "Kiến trúc Thông tin", icon: Network, section: "platform" }`
- `App.tsx`:
  - `validPages` includes `"ia"`
  - `pageTitles.ia = "Kiến trúc Thông tin (IA) — MB UX Request Portal"`
  - Renders `<IAPage />` within `<AnimatePresence mode="wait">`
- `AppHeader.tsx`:
  - `PAGE_METADATA.ia = { title: "Kiến trúc Thông tin", section: "Platform" }`

### 2. IA Data Model Contract (`src/types/ia.ts`)
```typescript
export type IATier = 1 | 2 | 3 | 4
export type IATouchpointType = "screen" | "modal" | "bottom_sheet" | "push_notification" | "webview" | "action_sheet"

export interface IANode {
  id: string
  tier: IATier
  name: string
  code?: string
  description?: string
  parentId?: string | null
  children?: IANode[]
  requestId?: string
  figmaUrl?: string
  touchpointType?: IATouchpointType
  status?: string
  progress?: number
  assignedDesigner?: string
  colorTheme?: string
  isCriticalPath?: boolean
  collapsed?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface IAProductInfo {
  id: string
  name: string
  code: string
  description: string
  color: string
  iconName: string
}

export interface IALocalStorageData {
  version: number
  lastUpdated: string
  trees: Record<string, IANode>
}
```

### 3. Canvas Engine Contract (`src/hooks/useCanvasTransform.ts`)
```typescript
export interface CanvasTransform {
  x: number
  y: number
  scale: number
}
export function zoomAtPoint(current: CanvasTransform, cursor: { x: number; y: number }, factor: number): CanvasTransform
export function computeFitToView(viewport: { width: number; height: number }, bounds: { minX: number; minY: number; maxX: number; maxY: number }, padding?: number): CanvasTransform
```

### 4. Tree Layout & CRUD Contract (`src/hooks/useIATreeState.ts`)
```typescript
export interface UseIATreeStateReturn {
  activeTree: IANode
  products: IAProductInfo[]
  selectedProductId: string
  setSelectedProductId: (id: string) => void
  toggleCollapse: (nodeId: string) => void
  addChildNode: (parentId: string, nodeData: Partial<IANode>) => void
  updateNode: (nodeId: string, nodeData: Partial<IANode>) => void
  deleteNode: (nodeId: string) => void
  resetToDefault: () => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResult: { matchedIds: Set<string>; ancestorIdsToExpand: Set<string>; matchCount: number }
}
```

---

## Code Layout
- `src/types/ia.ts` — IA data types, tier definitions, touchpoints, persistence schema
- `src/data/iaMockData.ts` — Pristine seed datasets for App MBBank, Biz MB, Web Portal, BaaS Open API
- `src/hooks/useCanvasTransform.ts` — High-performance pan/zoom and viewport math
- `src/hooks/useIATreeState.ts` — State management for tree hierarchy, CRUD, search, and persistence
- `src/components/ia/IACanvasViewport.tsx` — Pan/Zoom viewport container with dot-grid canvas
- `src/components/ia/IABezierConnectors.tsx` — Hardware-accelerated SVG cubic bezier connector curves
- `src/components/ia/IATreeNodeCard.tsx` — Interactive card components for Tiers 1–4
- `src/components/ia/IAToolbar.tsx` — Header toolbar (Product tabs, count badges, search, zoom/fit controls)
- `src/components/ia/IANodeEditorModal.tsx` — Inline Add/Edit/Delete node dialog
- `src/pages/IAPage.tsx` — Main IA page assembling toolbar, canvas, and drawer
- `test-e2e-ia-suite.mjs` — Comprehensive E2E test suite covering Tiers 1–4
- `TEST_INFRA.md` — E2E test suite documentation and coverage matrix
