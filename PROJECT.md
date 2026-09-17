# Project: UXMB Task Request UI & Motion Standardization

## Architecture
- **Tech Stack**: React 19, TypeScript 5.7, Vite 8.2 (Rolldown runtime), Tailwind CSS v4, Framer Motion v13.
- **Design System Standards**:
  - Reference Screens: 4 production sample layouts (Track task, Task detail, Request form, Admin settings).
  - Component System: Keenthemes reUI component architecture (Stepper, Grouped Data Table, Timeline, Frame, Filter Popover, Drawer/Sheet).
  - Animation & Micro-Interactions: Animate UI & Framer Motion (60fps spring physics, sliding indicators, origin-aware popovers, CLS = 0).
- **Core Visual Tokens**:
  - Primary Button: Dark Navy `#0F172A` (Slate 900, text white, uniform radius) across 100% of screens.
  - Secondary/Outline Button: `bg-white border-slate-200 text-slate-700 hover:bg-slate-50`.
  - Status Pills: Soft pastel background + matching colored indicator dot (Define đầu bài: purple, Chờ xác nhận/tiếp nhận: amber, UI Design: emerald green, Wireframe: blue, Overload/Bị chặn: red/rose).
  - Priority Badges: Distinct tiered badges (Lv1: rose, Lv2: amber, Lv3: blue, Lv4: slate).
  - Breakpoints: Mobile (375px), Tablet (768px), Small Desktop (1024px), Wide Desktop (1440px).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Primary Button Dark Navy Token | Unify Button default & primary variant to Dark Navy `#0F172A` (Slate 900) across 100% of pages | M1 | Survey 1, ORIGINAL_REQUEST |
| 2 | Status Color Correction | Align `statusConfig.ts` semantic tokens (UI Design -> emerald green, Wireframe -> blue) | M1 | Survey 1, ORIGINAL_REQUEST |
| 3 | Status Pills & Priority Badge Primitives | Uniform pill padding, rounded-full, colored dot indicator, tiered priority tags | M1 | Survey 1, ORIGINAL_REQUEST |
| 4 | ReUI Stepper, Timeline & Frame Primitives | Standardize `reui/stepper.tsx`, `reui/timeline.tsx`, `reui/frame.tsx`, and new `reui/drawer.tsx` | M1 | Survey 2 |
| 5 | TypeScript Baseline Fix | Fix 2 TS errors in `ReleaseNewsfeedTimeline.tsx:200` to ensure `npx tsc --noEmit` passes cleanly | M1 | Survey 3 |
| 6 | Track Screen Table & Controls Alignment | Grouped table with sticky right-0 action column, responsive toolbar, uniform status pills | M2 | Survey 1 & 3 |
| 7 | Detail Screen ReUI Stepper & Timeline | Replace hand-rolled stepper and activity feed in `RequestDetail.tsx` with ReUI components | M2 | Survey 2 |
| 8 | Detail Screen Tablet Drawer Width Fix | Fix `RequestDetail.tsx` drawer container width to prevent 24px overflow on 768px tablet | M2 | Survey 3 |
| 9 | Detail Accordion CLS Elimination | Add `overflow-hidden` to expandable activity list and detail accordion | M2 | Survey 2 |
| 10 | Request Form 2-Column & Sticky Summary | Standardize 2-column form + sticky summary card, responsive stack on <=1024px | M3 | Survey 1 & 3 |
| 11 | Admin 6-Table ReUI Standardization | Standardize 6 raw HTML tables in `QuanLyPage.tsx` with ReUI styled tables and filters | M3 | Survey 2 |
| 12 | Admin Metrics Cards & 1024px Layout | Use ReUI `Frame` for Admin metric cards; resolve double sidebar squeeze on 1024px | M3 | Survey 2 & 3 |
| 13 | IA Canvas & Dashboard Token Alignment | Harmonize buttons, frames, status pills, and modals in `TongQuanPage.tsx` and `IAPage.tsx` | M3 | Survey 1 |
| 14 | Responsive Breakpoint Hardening (375/768/1024/1440) | Eliminate unwanted horizontal scroll, text wrapping deformation, fix base padding in `App.tsx` | M4 | Survey 3, ORIGINAL_REQUEST |
| 15 | Animate UI Micro-Interactions & Transitions | Sliding indicators with `layoutId`, modal enter/exit without premature unmount, 60fps | M4 | Survey 2, ORIGINAL_REQUEST |
| 16 | Design System Guidelines Documentation | Author complete `doc/UI_DESIGN_SYSTEM.md` with tokens, guidelines, and code snippets | M5 | ORIGINAL_REQUEST R4 |
| 17 | Final E2E Test Suite & Build Verification | Pass 100% of E2E test suite, `npm run build`, and verify zero TypeScript regressions | M5 | Acceptance Criteria |
| 18 | E2E Opaque-Box Test Suite (Tiers 1-4) | Comprehensive test suite verifying tokens, responsive layouts, components, and interactions | E2E Track | Dual Track |
| 19 | ReUI Sonner Toast Notifications & 3D Stacking | Official ReUI Sonner component, 3D card stacking, top-right close button, top-aligned multiline icons | Polish | User Request |
| 20 | Google Sheet Two-Way Sync & Email Persistence | Bi-directional sync between USERS sheet and RAW_SETTINGS, separated Teams/Personal emails, onEdit trigger | Backend/Admin | User Request |
| 21 | Canvas Middle-Click Pan (R1) | Wheel button drag (`e.button === 1`), dynamic `cursor-grabbing`, global release listeners, autoscroll prevention, zero zoom conflict | M7 | Survey 1, ORIGINAL_REQUEST |
| 22 | ReUI Tooltip Standardization (R2) | `src/components/ui/tooltip.tsx` ReUI/shadcn primitive, 100% replacement of 61 native `title` tags, dark `<Kbd>` shortcuts, auto-flip collision detection | M8 | Survey 2, ORIGINAL_REQUEST |
| 23 | 4-Tier Node Hierarchy & Lv4 Capping (R3) | `✨ Lv1`, `Lv2`, `Lv3`, `Lv4` badges, Lv4 (+) child creation blocking on card header, 4 ports, Tab shortcut and tree state, auto-layout tidy tree preservation | M9 | Survey 3, ORIGINAL_REQUEST |
| 24 | Magnific UI Lateral Dock & Slide-Over Sheet (R4) | Left vertical dock (56px) + slide-over sheet (360px) with unified search, category tabs, dynamic panels (Add, Settings, Cloud, JSON), Esc/outside-click dismissal | M10 | Survey 3, ORIGINAL_REQUEST |
| 25 | IA Map E2E Test Suite & Final Integration | Comprehensive opaque-box test suite (Tiers 1-4) covering R1-R4, build verification (`npm run build` 0 errors), adversarial hardening | M11 | Dual Track |
| 26 | Task Detail Expected Release & Breadcrumb Tokens | Restored "Release dự kiến" purple badge (Row 1 Header) & Section 5; Building icon, softened mono ID badge border, status pill dot | M12 | User Request |
| 27 | Stepper Sonar Motion & Layout Anti-Jitter | Sonar wave behind UI (`-z-10`), opacity pulse (no scale), 1 rotating dashed ring, live green beacon, `overflow-y-hidden` | M12 | User Request |
| 28 | Auth Resilience & Google Sheet 2-Way Fallback | Direct Sheet USERS verification polling via GViz API when GAS hangs >6s; Master OTPs `123456`/`583921`; clean LoginGate | M12 | User Request |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Tokens & Base ReUI Primitives | Standardize Button (#0F172A), Status Colors, Badge, Stepper, Timeline, Drawer, fix TS error | none | DONE (Gate Passed: 8/8 unit, 114/114 E2E, 0 errors) |
| M2 | Track Task & Task Detail Alignment | Standardize Track table (sticky action col), Filter popover, Detail Stepper, Timeline, Tablet drawer width | M1 | DONE (Gate Passed: 19/19 unit, 114/114 E2E, 24/24 & 22/22 adv, Auditor CLEAN) |
| M3 | Form, Admin & Dashboard Alignment | Standardize Request Form (2-col + summary), Admin 6 tables & Frame cards, Dashboard & IA tokens | M1 | DONE (Gate Passed: 25/25 unit, 114/114 E2E, 43/43 & 48/48 adv, Auditor CLEAN) |
| M4 | Responsive Hardening & Animate UI | Fix responsive issues across 375px/768px/1024px/1440px, sliding indicators, modal animations | M2, M3 | DONE (Gate Passed: 114/114 E2E, 0 CLS, Auditor CLEAN) |
| M5 | Documentation & Final Verification | Author `doc/UI_DESIGN_SYSTEM.md`, run full E2E test suite, verify build & test passing | M4, E2E | DONE (Gate Passed: 833 lines doc, 114/114 E2E, 0 errors) |
| M6 | IA Map v2 & View-Only RBAC Optimization | 8 standards exceeding ReUI Flow, Multi-Root Tier 1, n8n QuickAdd, Snap Grid, View-Only Zero Clutter | M1-M5 | DONE (34/34 v2 tests pass, 30/30 view-only tests pass, Vite build in 567ms) |
| FIX | ReUI Sonner & Google Sheet Two-Way Sync | ReUI Sonner toast stacking, top-right close button, icon top-alignment, Google Sheet 2-way sync & 09:02 email retention | all | DONE (10/10 Sonner tests, sheet live verified) |
| E2E | E2E Testing Track | Independent opaque-box test suite for design tokens, components, responsive layouts | none | DONE (TEST_READY.md published, 114/114 tests) |
| M7 | Canvas Middle-Click Pan Engine | `useCanvasTransform.ts` & `IACanvasViewport.tsx` middle-click drag, `cursor-grabbing`, release listeners, zero wheel zoom conflict | none | DONE (Gate Passed: 5/5 pan tests, 0 coordinate drift, autoscroll suppressed) |
| M8 | ReUI Tooltip Standardization | `src/components/ui/tooltip.tsx`, dark `<Kbd>`, replace 61 native `title` attributes with smart placement | none | DONE (Gate Passed: 4/4 suites, strictly 0 residual `title` attributes in `src/components/ia/`) |
| M9 | 4-Tier Hierarchy & Lv4 Capping & Auto-Layout | Lv1-Lv4 badges, card header/port/Tab/hook child blocking at Lv4, preserve tidy tree layout | none | DONE (Gate Passed: 7/7 hierarchy tests, Lv4 capping enforced across 5 layers) |
| M10 | Magnific UI Lateral Dock & Slide-Over Sheet | `IAVerticalDock.tsx`, `IASlideOverSheet.tsx` (Search, tabs, settings/cloud/JSON/node panels), Esc & outside click | M7, M8, M9 | DONE (Gate Passed: 56px dock + 360px sheet, universal search, category tabs, dynamic panels) |
| M11 | E2E Test Suite & Final Verification | 100% E2E test pass (Tiers 1-4), adversarial test pass, `npm run build` verification | M7-M10 | DONE (Gate Passed: 45/45 E2E, 22/22 adv-1, 21/21 adv-2, 34/34 v2, Auditor CLEAN, build 0 errors) |
| M12 | Detail & Stepper Refinements & Auth Fallback | Expected release badge, Stepper sonar behind UI + anti-jitter, 2-way GViz USERS verification | all | DONE (100% test pass, 0 TS errors, clean login UX) |

---

## Interface Contracts

### Button Component (`src/components/ui/button.tsx`)
```typescript
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost" | "destructive" | "teal" | "blue"
  size?: "default" | "sm" | "lg" | "icon" | "iconSm"
  asChild?: boolean
  loading?: boolean
  tactile?: boolean
}
// Default & Primary MUST resolve to bg-slate-900 (#0F172A) text-white hover:bg-slate-800
// Outline MUST resolve to border border-slate-200 bg-white text-slate-700 hover:bg-slate-50
```

### Status Configuration (`src/config/statusConfig.ts`)
```typescript
export interface StatusColorDef {
  label: string
  color: string        // Tailwind text color
  bgColor: string      // Tailwind bg pastel
  borderColor: string  // Tailwind border color
  dotColor: string     // Tailwind bg dot color
  dotPulse?: boolean
}
// "UI Design" -> bg-emerald-50 text-emerald-700 border-emerald-200 dot: bg-emerald-500
// "Wireframe" -> bg-blue-50 text-blue-700 border-blue-200 dot: bg-blue-500
// "Define đầu bài" -> bg-purple-50 text-purple-700 border-purple-200 dot: bg-purple-500
// "Chờ xác nhận" -> bg-amber-50 text-amber-700 border-amber-200 dot: bg-amber-500
// "Quá tải" / "Bị chặn" -> bg-rose-50 text-rose-700 border-rose-200 dot: bg-rose-500
```

### Stepper Component (`src/components/reui/stepper.tsx`)
```typescript
export interface StepDef {
  id: string
  title: string
  description?: string
  status: "complete" | "current" | "upcoming" | "error"
}
// Current step uses Dark Navy #0F172A indicator
```

---

## Code Layout
- `src/components/ui/`: Atomic UI primitives (`button.tsx`, `badge.tsx`, `dialog.tsx`, `tabs.tsx`, etc.)
- `src/components/reui/`: Complex ReUI components (`stepper.tsx`, `timeline.tsx`, `frame.tsx`, `task-filter-popover.tsx`, `gantt-chart.tsx`)
- `src/config/`: System-wide configurations (`statusConfig.ts`, `navVisibilityConfig.ts`)
- `src/components/track/`: Track screen components (`SolutionAgentsTable.tsx`, `RequestDetail.tsx`, `RequestCard.tsx`)
- `src/pages/`: Main screen pages (`TrackRequestPage.tsx`, `CreateRequestPage.tsx`, `QuanLyPage.tsx`, `TongQuanPage.tsx`, `IAPage.tsx`)
- `doc/`: Design system guidelines (`doc/UI_DESIGN_SYSTEM.md`)
- `tests/` / root `test-*.mjs`: Automated verification suites
