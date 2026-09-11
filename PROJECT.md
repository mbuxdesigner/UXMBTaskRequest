# Project: UXMB Task Request Micro-Interactions & Motion Design Overhaul

## Architecture
- **Framework & Libraries**: React 19, TypeScript 5.7, Tailwind CSS v4, Framer Motion v13.1.0 (`vendor-motion` manual chunk in Vite 8.2.1).
- **Core Motion Paradigm**:
  - Global Configuration: `<MotionConfig reducedMotion="user">` in `src/App.tsx`.
  - Motion Tokens Foundation: `src/lib/motion.ts` exposing spring physics, durations, easings, stagger variants, and tactile feedback configurations.
  - Shared Layout Physics: `layoutId` on navigation indicators (`Sidebar`, `TrackRequestPage` view switcher, `tabs.tsx`, `MemberWorkloadSection.tsx`).
  - Origin-Aware Coordinate Anchoring: Trigger-anchored `transformOrigin` and clean `<AnimatePresence>` lifecycles for popovers, dropdowns, and modals.
  - Staggered Content Reveals: Coordinated `staggerContainerVariants` & `staggerItemVariants` across Dashboard, Track, Management, and Create Request.
  - Tactile Micro-Interactions: Spring-driven `whileHover` and `whileTap` on buttons, switches, and cards.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Comprehensive Motion & Interaction Audit | Full codebase audit identifying rigid transitions, unmount bugs, missing indicators, and lack of spatial continuity | M0 | Survey | DONE |
| 2 | Motion Tokens & System Foundation | Centralized motion tokens (`src/lib/motion.ts`) with springs, durations, easings, stagger configs, and reduced motion helpers | M1 | R2 | DONE |
| 3 | Motion Design Guidelines Documentation | Comprehensive documentation at `doc/motion-guidelines.md` detailing patterns, token references, and code samples | M1 | R2 | DONE |
| 4 | Global Accessibility & Reduced Motion Configuration | `App.tsx` wrapped in `<MotionConfig reducedMotion="user">` and CSS alignment for WCAG 2.2 compliance | M1 | R2 / AC | DONE |
| 5 | Enhanced Shimmer Skeleton Primitive | Hardware-accelerated horizontal shimmer wave on `src/components/ui/skeleton.tsx` replacing standard opacity pulse | M1 | R5 / Survey | DONE |
| 6 | Sidebar Floating Active Indicator | Sliding background indicator with `layoutId` and spring physics across menu items | M2 | R3 | DONE |
| 7 | View Switcher Sliding Pill Indicator | Sliding indicator pill with `layoutId` across Bảng, Kanban, Lưới, Gantt in `TrackRequestPage.tsx` | M2 | R3 | DONE |
| 8 | UI Primitive Tabs Floating Indicator | General-purpose floating active indicator support in `src/components/ui/tabs.tsx` | M2 | R3 | DONE |
| 9 | Secondary Navigation Floating Indicators | Sliding indicators on `QuanLyPage.tsx` admin tabs and `MemberWorkloadSection.tsx` role filter | M2 | R3 | DONE |
| 10 | Modal Exit-Animation Fix | Remove premature `if (!open) return null` early exits in `AddMemberModal.tsx`, `MemberDetailDrawer.tsx` | M3 | R4 / Survey | DONE |
| 11 | Origin-Aware TaskFilterPopover | Dynamic click-origin calculation (`transformOrigin`), spring scale/fade, tactile trigger | M3 | R4 | DONE |
| 12 | AppHeader Popovers & Dropdowns | `<AnimatePresence>` integration and spring transitions for User Profile dropdown, Apps grid, Search dialog | M3 | R4 | DONE |
| 13 | Notification Dropdown Exit-Animation Fix | Fix early unmount guard and enable smooth origin-aware entrance/exit transitions | M3 | R4 | DONE |
| 14 | Reusable DropdownMenu & Table Action Menus | Smooth spring entrance and `<AnimatePresence>` exit on `dropdown-menu.tsx` and table row menus | M3 | R4 | DONE |
| 15 | Dashboard Staggered Skeleton-to-Content | Smooth cross-fade from skeleton and staggered cascade reveal on KPI Bento cards, roadmap, and analytics in `TongQuanPage.tsx` | M4 | R5 | DONE |
| 16 | Track Page Staggered Skeleton-to-Content | Staggered reveal for request cards grid, Kanban columns, and table rows in `TrackRequestPage.tsx` and `SolutionAgentsTable.tsx` | M4 | R5 | DONE |
| 17 | Management Page Staggered Skeleton-to-Content | Replace early-return unmount with `<AnimatePresence mode="wait">` and staggered cards in `QuanLyPage.tsx` | M4 | R5 | DONE |
| 18 | Create Request Staggered Form Reveal | Smooth skeleton transition and cascading form sections in `CreateRequestPage.tsx` | M4 | R5 | DONE |
| 19 | Tactile Button Micro-Interactions | Spring physics press (`whileTap: { scale: 0.96 }`) and hover elevation on `src/components/ui/button.tsx` | M5 | R6 | DONE |
| 20 | Reusable Spring Switch Component | Accessible `<Switch />` primitive in `src/components/ui/switch.tsx` with smooth spring toggle thumb | M5 | R6 | DONE |
| 21 | Optimized Hover Elevation for Cards & Tables | Performance-optimized hover elevation and subtle shadow on `SpotlightCard.tsx`, `RequestCard.tsx`, and table rows | M5 | R6 | DONE |
| 22 | Full Verification & Build Validation | End-to-end verification, test pass, build integrity check (`npm run build`), review, and forensic audit | M6 | AC | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Survey & Interaction Audit | Auditing codebase, components, build scripts, and interaction gaps | none | DONE |
| M1 | Motion Tokens, Guidelines & Global Accessibility | `src/lib/motion.ts`, `doc/motion-guidelines.md`, `<MotionConfig>`, `skeleton.tsx` shimmer | M0 | DONE |
| M2 | Navigation & Floating Active Indicators | `Sidebar.tsx`, `TrackRequestPage.tsx` view switcher, `tabs.tsx`, secondary tabs | M1 | DONE |
| M3 | Origin-Aware Popovers, Modals & Dropdowns | `TaskFilterPopover.tsx`, `AppHeader.tsx`, `AddMemberModal.tsx`, `NotificationDropdown.tsx`, `dropdown-menu.tsx` | M1, M2 | DONE |
| M4 | Staggered Skeleton-to-Content Transitions | `TongQuanPage.tsx`, `TrackRequestPage.tsx`, `QuanLyPage.tsx`, `CreateRequestPage.tsx`, `SolutionAgentsTable.tsx` | M1 | DONE |
| M5 | Micro-interactions & Tactile Feedbacks | `button.tsx`, `switch.tsx`, `spotlight-card.tsx`, `RequestCard.tsx`, table rows | M1 | DONE |
| M6 | System Verification, Build & Forensic Audit | Verification, `npm run build` check, reviewer pass, challenger pass, forensic audit | M2, M3, M4, M5 | DONE |

## Acceptance Criteria Conformance Matrix
| Criteria | Requirement | Status | Evidence |
|----------|-------------|--------|----------|
| 1 | Navigation & View Switcher Floating Indicators | PASSED | `Sidebar.tsx`, `TrackRequestPage.tsx`, `tabs.tsx` use `layoutId` + `springs.floating` without layout jumping. |
| 2 | Origin-Aware Popovers, Modals & Dropdowns | PASSED | `TaskFilterPopover.tsx`, `AppHeader.tsx`, `AddMemberModal.tsx`, `NotificationDropdown.tsx` open from click origin via `transformOrigin` and clean `<AnimatePresence>`. |
| 3 | Staggered Skeleton-to-Content Reveal | PASSED | `TongQuanPage.tsx`, `TrackRequestPage.tsx`, `QuanLyPage.tsx`, `CreateRequestPage.tsx`, `KanbanBoard.tsx`, `SolutionAgentsTable.tsx` use `<AnimatePresence mode="wait">` + `staggerContainerVariants`. |
| 4 | Tactile Micro-Interactions | PASSED | `button.tsx` (`whileTap: { scale: 0.96 }`), `switch.tsx` (`springs.bouncy`), `spotlight-card.tsx` (CSS variables, 60+ FPS), `RequestCard.tsx` (hover lift). |
| 5 | Accessibility (prefers-reduced-motion) | PASSED | Root `<MotionConfig reducedMotion="user">` in `App.tsx` and CSS media query in `index.css`. WCAG 2.2 SC 2.3.3 compliant. |
| 6 | Guidelines Documentation Complete | PASSED | `doc/motion-guidelines.md` (482 lines) covering animate-ui standards, motion tokens, 4 standard patterns, and code samples. |
| 7 | Clean Code & 60+ FPS Performance | PASSED | Composite GPU transforms (`transform`, `opacity`), 0 re-render thrashing on mousemove, `vendor-motion` Vite chunk isolation. |
| 8 | Production Build Pass | PASSED | `npm run build` succeeds in ~430ms with 0 errors and 0 warnings. 83/83 automated unit/integration tests pass. |
