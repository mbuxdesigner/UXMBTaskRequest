# UXMB Task Request — UI Design System Guidelines & Pattern Specs

> **Document Version**: 2.0.0 (Production Release)  
> **Status**: Approved & Certified  
> **Last Updated**: 2026-09-15T21:00:00Z  
> **Target Platform**: MBBank UX Task Request Management Platform  
> **Authoring Team**: UXMB Architecture & Design System Core Team  

---

## Table of Contents
1. [Chapter 1: Introduction & Architecture Principles](#chapter-1-introduction--architecture-principles)
   - [1.1 Purpose & Scope](#11-purpose--scope)
   - [1.2 Reference Screen Alignments](#12-reference-screen-alignments)
   - [1.3 Core Guiding Principles](#13-core-guiding-principles)
2. [Chapter 2: Core Visual Tokens & Color Palette](#chapter-2-core-visual-tokens--color-palette)
   - [2.1 Primary Action Token (Dark Navy `#0F172A`)](#21-primary-action-token-dark-navy-0f172a)
   - [2.2 Functional Slate Neutral Scale (Slate 50 – Slate 950)](#22-functional-slate-neutral-scale-slate-50--slate-950)
   - [2.3 Status Color System (8 Workflow Categories)](#23-status-color-system-8-workflow-categories)
   - [2.4 Tiered Priority System (Lv1 – Lv4)](#24-tiered-priority-system-lv1--lv4)
   - [2.5 Typography Hierarchy & Scales](#25-typography-hierarchy--scales)
   - [2.6 Border Radius & Elevation Tiers](#26-border-radius--elevation-tiers)
3. [Chapter 3: Keenthemes reUI Component Architecture](#chapter-3-keenthemes-reui-component-architecture)
   - [3.1 ReUI Stepper (`<Stepper>`)](#31-reui-stepper-stepper)
   - [3.2 ReUI Timeline (`<Timeline>`)](#32-reui-timeline-timeline)
   - [3.3 ReUI Frame (`<Frame>`)](#33-reui-frame-frame)
   - [3.4 ReUI Data Grid Tables](#34-reui-data-grid-tables)
   - [3.5 ReUI Slide-Over Drawer (`<Drawer>`)](#35-reui-slide-over-drawer-drawer)
   - [3.6 ReUI Task Filter Popover (`<TaskFilterPopover>`)](#36-reui-task-filter-popover-taskfilterpopover)
   - [3.7 ReUI Sonner Toast Notification Architecture (`<Toaster>`)](#37-reui-sonner-toast-notification-architecture-toaster)
4. [Chapter 4: Animate UI Motion Tokens & Spring Micro-Interactions](#chapter-4-animate-ui-motion-tokens--spring-micro-interactions)
   - [4.1 Harmonic Oscillator Spring Physics](#41-harmonic-oscillator-spring-physics)
   - [4.2 Motion Token Catalog & Curves](#42-motion-token-catalog--curves)
   - [4.3 Sliding Tab Indicators & `layoutId` Collision Isolation](#43-sliding-tab-indicators--layoutid-collision-isolation)
   - [4.4 WAI-ARIA Accessible Tab Synchronization](#44-wai-aria-accessible-tab-synchronization)
   - [4.5 Modal/Drawer Exit Lifecycles & CLS = 0 Architecture](#45-modaldrawer-exit-lifecycles--cls--0-architecture)
   - [4.6 Cascade Wave Entry & Per-Element Micro-Staggering (Silky Smooth Motion)](#46-cascade-wave-entry--per-element-micro-staggering-silky-smooth-motion)
   - [4.7 Architectural Boundary & IA Map Isolation](#47-architectural-boundary--ia-map-isolation)
5. [Chapter 5: Responsive Breakpoint Architecture & Layout Resilience](#chapter-5-responsive-breakpoint-architecture--layout-resilience)
   - [5.1 Responsive Viewport Matrix](#51-responsive-viewport-matrix)
   - [5.2 Two-Tier Anti-Overflow Containment](#52-two-tier-anti-overflow-containment)
   - [5.3 Form Stacking & Desktop Sticky Summary Geometry](#53-form-stacking--desktop-sticky-summary-geometry)
   - [5.4 Tablet 1024px Double Sidebar Squeeze Resolution](#54-tablet-1024px-double-sidebar-squeeze-resolution)
   - [5.5 Drawer & Popover Viewport Clamping](#55-drawer--popover-viewport-clamping)
6. [Chapter 6: Quick Reference, Token Tables & Anti-Patterns](#chapter-6-quick-reference-token-tables--anti-patterns)
   - [6.1 Complete Design Token Lookup Table](#61-complete-design-token-lookup-table)
   - [6.2 Component Utility Class Cheat Sheet](#62-component-utility-class-cheat-sheet)
   - [6.3 Top 6 Anti-Patterns & Production Solutions (Do's & Don'ts)](#63-top-6-anti-patterns--production-solutions-dos--donts)

---

# Chapter 1: Introduction & Architecture Principles

## 1.1 Purpose & Scope

The **UXMB Task Request Design System** is the authoritative UI/UX standard and component engineering framework for the internal design operations platform of Military Commercial Joint Stock Bank (MBBank). 

The platform coordinates design demand, technical handoffs, and resource capacity across four primary digital product divisions:
- **App MBBank**: Retail mobile banking consumer journey.
- **Biz MB**: Corporate and enterprise financial transaction hub.
- **BaaS & Open API**: Banking-as-a-Service integration gateways for fintech partners.
- **Internal Tools**: Operational dashboards, credit risk interfaces, and branch consoles.

This specification unifies visual styling, component architecture, responsive behavior, and physics-driven micro-interactions across all screens and user roles (Product Owners, UX/UI Designers, Design Leads, and Administrators).

---

## 1.2 Reference Screen Alignments

The design system directly codifies patterns observed across the four reference production screens:

```
+-----------------------------------------------------------------------------------+
| 1. TRACK TASK (TrackRequestPage)                                                  |
| Toolbar: Search, Product Selector, TaskFilterPopover, View Mode Switcher (Pill)  |
| Content: Grouped Solution Table, Sticky Action Column, Soft Pastel Status Pills   |
+-----------------------------------------------------------------------------------+
| 2. TASK DETAIL (RequestDetail Drawer)                                             |
| Header: Task ID, Title, Status Pill, Priority Badge, Quick Actions                |
| Body: ReUI Stepper (6 Phases), 2-Col Metadata Grid, ReUI Timeline (Chat & Audit)  |
+-----------------------------------------------------------------------------------+
| 3. REQUEST FORM (CreateRequestPage / RequestForm)                                 |
| Layout: 1-Col Stack (<=1024px) -> 8/4 Grid Split (>=1280px)                       |
| Left (Col 8): Stepped Form Sections, Inputs, Selectors, Rich Textarea             |
| Right (Col 4): Sticky Live Summary Card (24px clearance beneath 56px AppHeader)   |
+-----------------------------------------------------------------------------------+
| 4. ADMIN SETTINGS (QuanLyPage)                                                    |
| Nav: Secondary Sidebar Rail (>=1280px) -> Horizontal Tab Rail (<=1024px)         |
| Header: ReUI Frame KPI Metric Cards (2x2 grid on mobile, 4-col on desktop)        |
| Content: 6 Standardized ReUI Data Grid Tables (Team, RBAC, Nav, Capacity, etc.)   |
+-----------------------------------------------------------------------------------+
```

1. **Track Task (`TrackRequestPage.tsx`)**: High-density board featuring grouped task tables, sticky right action column (`sticky right-0`), origin-aware filter popovers (`TaskFilterPopover`), and floating active tab pills.
2. **Task Detail (`RequestDetail.tsx`)**: Slide-over drawer container enforcing viewport clamping, interactive horizontal ReUI Stepper progression, two-column metadata grid, and rich ReUI Timeline unifying user comments with system audit logs.
3. **Request Form (`CreateRequestPage.tsx` / `RequestForm.tsx`)**: Dual-column layout converting automatically from single-column vertical flow on mobile/tablet to an 8/4 split on desktop, featuring a live summary card pinned at `xl:sticky xl:top-20`.
4. **Admin Settings (`QuanLyPage.tsx`)**: Multi-tab management console featuring 4 KPI metric cards in ReUI Frame containers, 6 enterprise data grid tables, and responsive subnav elevation resolving dual-sidebar squeeze at 1024px.

---

## 1.3 Core Guiding Principles

The UXMB Task Request Design System is engineered on five non-negotiable architectural pillars:

```
                      +-----------------------------+
                      |   UXMB CORE PRINCIPLES      |
                      +-----------------------------+
                                     |
         +---------------------------+---------------------------+
         |                           |                           |
+------------------+       +-------------------+       +------------------+
| 1. DARK NAVY     |       | 2. REUI ARCH      |       | 3. 60FPS ANIMATE |
| #0F172A Primary  |       | Composable        |       | Physical Spring  |
| Across 100% UI   |       | Compound Slots    |       | Micro-Dynamics   |
+------------------+       +-------------------+       +------------------+
         |                           |                           |
         +---------------------------+---------------------------+
                                     |
                       +---------------------------+
                       |                           |
             +-------------------+       +-------------------+
             | 4. ZERO CLS       |       | 5. RESPONSIVE     |
             | Stable Scrollbar  |       | Overflow-Proof    |
             | Gutter & Portals  |       | 375px - 1440px+   |
             +-------------------+       +-------------------+
```

### 1. Dark Navy Primary Brand Anchor (`#0F172A` / Slate 900)
All primary call-to-action buttons, active stepper indicators, checked inputs, and selected tabs converge onto a single authoritative enterprise token: Dark Navy `#0F172A`. Divergent button styles (such as random royal blues or bright teals) are strictly deprecated.

### 2. Keenthemes reUI Component Architecture
Components are structured around composable, slot-driven compound patterns (`<Frame>`, `<FrameHeader>`, `<FrameBody>`, `<FrameFooter>`) powered by Class Variance Authority (CVA). Components encapsulate structural styles while permitting clean custom overrides.

### 3. 60fps Animate UI Micro-Interactions
Dynamic feedback relies on physically modeled damped harmonic oscillators via Framer Motion v13. Linear and synthetic easing curves are replaced with tuned spring constants (`stiffness`, `damping`, `mass`) providing natural, tactile responsiveness without sluggish animation delays.

### 4. Zero Cumulative Layout Shift (CLS = 0.000)
Modal overlays, slide-over drawers, and expandable accordions must never cause layout repositioning. The application enforces `scrollbar-gutter: stable`, root DOM portal mounting (`createPortal`), and strict container boundaries (`overflow-hidden`) on all collapsible content.

### 5. Responsive Resilience Across All Breakpoints
From 375px mobile viewports to ultra-wide 1440px+ monitors, components automatically adapt without horizontal page blowout. The shell applies `overflow-x-clip`, flex shrink containment (`min-w-0 max-w-full flex-1`), and elevation breakpoints (`hidden xl:block` / `xl:hidden`).

---

# Chapter 2: Core Visual Tokens & Color Palette

## 2.1 Primary Action Token (Dark Navy `#0F172A`)

The **Primary Dark Navy** token serves as the singular brand anchor for high-intent interactive elements across the platform.

```
+-----------------------------------------------------------------------------+
| HEX: #0F172A | RGB: 15, 23, 42 | TAILWIND: bg-slate-900 / text-slate-900    |
+-----------------------------------------------------------------------------+
| Hover:        #1E293B (bg-slate-800)                                        |
| Active/Tap:   #020617 (bg-slate-950)                                        |
| Focus Ring:   rgba(15, 23, 42, 0.30) (focus-visible:ring-slate-900/30)      |
| Elevation:    0 1px 2px 0 rgba(0, 0, 0, 0.05) (shadow-xs)                   |
| Text:         #FFFFFF (text-white)                                          |
| Radius:       12px (rounded-xl)                                             |
+-----------------------------------------------------------------------------+
```

### Canonical Utility Class String:
```css
bg-slate-900 text-white rounded-xl shadow-xs hover:bg-slate-800 active:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30
```

### Contrast Compliance:
- Foreground `#FFFFFF` on Background `#0F172A`: **18.73:1 contrast ratio**, exceeding WCAG AAA standard (7:1) for both normal text and graphical user interface controls.

### Unified Application Matrix:
1. **Primary Buttons**: Submit request, Create task, Confirm modal, Save configuration.
2. **Stepper Active Node**: Active step indicator circle (`bg-slate-900 border-slate-900 text-white ring-4 ring-slate-900/15`).
3. **Timeline Marker**: Current active milestone marker (`bg-slate-900 text-white ring-4 ring-slate-900/15 shadow-md shadow-slate-900/30`).
4. **Active Tab Indicator**: Sliding active pill (`bg-slate-900 rounded-xl text-white shadow-xs`).
5. **Form Checkbox**: Selected check state (`bg-slate-900 border-slate-900 text-white shadow-2xs`).

---

## 2.2 Functional Slate Neutral Scale (Slate 50 – Slate 950)

The Slate neutral scale provides the functional foundation for backgrounds, surface contrast, subtle borders, and readable typography hierarchy.

| Token | Hex Code | RGB | Semantic Role | Tailwind Utility | Production Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Slate 50** | `#F8FAFC` | `248, 250, 252` | Canvas Background & Striped Rows | `bg-slate-50` | Main canvas background, alternating table row hover (`even:bg-slate-50/40`), upcoming step node |
| **Slate 100** | `#F1F5F9` | `241, 245, 249` | Subdued Surfaces & Tab Trays | `bg-slate-100` | Segmented tab tray container (`bg-slate-100/90`), secondary button background |
| **Slate 200** | `#E2E8F0` | `226, 232, 240` | Default Structural Borders | `border-slate-200` | Card borders (`border-slate-200/80`), table cell dividers (`border-slate-200/70`), Stepper track line |
| **Slate 300** | `#CBD5E1` | `203, 213, 225` | Interactive Hover Borders | `border-slate-300` | Input hover state, card hover border, thin scrollbar hover thumb |
| **Slate 400** | `#94A3B8` | `148, 163, 184` | Placeholders & Inactive Icons | `text-slate-400` | Form field placeholders, inactive stepper numbers, unknown status fallback dot |
| **Slate 500** | `#64748B` | `100, 116, 139` | Secondary Metadata & Subtitles | `text-slate-500` | Timestamp captions, card description subtitles, table header column titles |
| **Slate 600** | `#475569` | `71, 85, 105` | Standard Body Copy & Unselected Tabs | `text-slate-600` | Default body paragraphs, unselected navigation links, low-priority badge text |
| **Slate 700** | `#334155` | `51, 65, 85` | Field Labels & Emphasized Text | `text-slate-700` | Form input labels, secondary button text, strong table text |
| **Slate 800** | `#1E293B` | `30, 41, 59` | Input Values & Dark Hover States | `text-slate-800` | Form input typed text, Dark Navy button hover state |
| **Slate 900** | `#0F172A` | `15, 23, 42` | Primary Navy & Main Headings | `text-slate-900` | Display H1–H4 titles, modal headings, primary action buttons, active indicator |
| **Slate 950** | `#020617` | `2, 6, 23` | High-Contrast Pressed & Overlays | `bg-slate-950` | Button active/tap state, modal backdrop overlay bases |

---

## 2.3 Status Color System (8 Workflow Categories)

Every status pill in the system adheres strictly to the **Soft Pastel Background + Solid Colored Indicator Dot** pattern:
`bg-*-50 text-*-700 border-*-200` with `dot: bg-*-500/600`.

This eliminates saturated glare, preserves readability, and accelerates cognitive scanning across high-density task boards.

```
+----------------------------------------------------------------------------------------------------+
|                                    STATUS COLOR MATRIX                                             |
+----------------+--------------------------+---------------------+-------------------+--------------+
| Category ID    | Workflow Statuses (VI/EN)| Background & Border | Text & Dot Token  | Dot Hex Code |
+----------------+--------------------------+---------------------+-------------------+--------------+
| 1. received    | Chờ tiếp nhận, Mới tạo   | bg-slate-50 / 200   | text-slate-600/400| #94A3B8      |
| 2. processing  | Chờ xác nhận, Phân loại  | bg-amber-50 / 200   | text-amber-700/500| #F59E0B      |
| 3. analyzing   | Discovery, Define đầu bài| bg-purple-50 / 200  | text-purple-700/600 #9333EA      |
| 4. planning    | Wireframe, User Flow     | bg-blue-50 / 200    | text-blue-700 /500| #3B82F6      |
| 5. in_progress | UI Design, Ready to Dev  | bg-emerald-50 / 200 | text-emerald-700/500 #10B981     |
| 6. review      | Đang review, Nghiệm thu  | bg-pink-50 / 200    | text-pink-700 /600| #DB2777      |
| 7. completed   | Hoàn thành, Released     | bg-emerald-50 / 200 | text-emerald-700/600 #059669     |
| 8. rejected    | Bị chặn, Quá tải, Đã hủy | bg-rose-50 / 200    | text-rose-700 /500| #F43F5E      |
+----------------+--------------------------+---------------------+-------------------+--------------+
```

### Special Sub-Status Rules:
- **PO Pending (Amber Alert, >24h)**: Automatically highlighted when a design solution has awaited PO sign-off for over 24 hours: `bg-amber-50 text-amber-800 border-amber-300 dot: bg-amber-500`.
- **Designer Pending (Slate Pause, Chat-Driven)**: Activated when a designer temporarily pauses progress with the `@pending:` directive: `bg-slate-100 text-slate-700 border-slate-300 dot: bg-slate-500`.

---

## 2.4 Tiered Priority System (Lv1 – Lv4)

Task criticality is organized into four standardized priority tiers, complete with dedicated badges and flag indicator tokens:

```
+--------------------------------------------------------------------------------------------------+
| Level | Key          | Label | SLA / Business Impact        | Badge Style Tokens  | Flag & Dot   |
+-------+--------------+-------+------------------------------+---------------------+--------------+
| Lv1   | lv1 / urgent | Lv1   | Khẩn cấp / Blocker (<24h)    | bg-rose-50 / 200    | fill-rose-500|
| Lv2   | lv2 / high   | Lv2   | Cao / Cam kết đợt Release    | bg-amber-50 / 200   | fill-amber-500
| Lv3   | lv3 / normal | Lv3   | Trung bình / Backlog mặc định| bg-blue-50 / 200    | fill-blue-500|
| Lv4   | lv4 / low    | Lv4   | Thấp / Tối ưu & Đánh giá phụ | bg-slate-50 / 200   | fill-slate-400
+--------------------------------------------------------------------------------------------------+
```

### Priority Badge Specifications:
- **Lv1 (Urgent)**: `bg-rose-50 text-rose-700 border-rose-200 shadow-2xs font-bold whitespace-nowrap`
- **Lv2 (High)**: `bg-amber-50 text-amber-700 border-amber-200 shadow-2xs font-bold whitespace-nowrap`
- **Lv3 (Medium)**: `bg-blue-50 text-blue-700 border-blue-200 font-semibold whitespace-nowrap`
- **Lv4 (Low)**: `bg-slate-50 text-slate-600 border-slate-200 font-medium whitespace-nowrap`

---

## 2.5 Typography Hierarchy & Scales

The typography system uses **Google Sans Flex** / **Inter** for user interface elements and **DM Mono** for numerical values and identifiers.

```
Display H1    32px / 41px  Bold (700)      tracking-tight  Page titles, authentication hero
Heading H2    28px / 28px  Bold (700)      tracking-tight  Major section headers, modal hero
Heading H3    24px / 24px  Bold (700)      tracking-tight  Frame card headers, drawer title
Heading H4    20px / 20px  Semibold (600)  tracking-tight  Sub-section cards, dialog headers
Body XL       18px / 24px  Normal / Medium leading-relaxed Lead intros, summary callouts
Body LG       16px / 22px  Normal (400)    leading-normal  Modal body text, descriptions
Body MD       14px / 19px  Normal (400)    leading-relaxed Standard inputs, table cells
Body SM       12px / 16px  Normal (400)    leading-normal  Timestamps, card footers, hints
Badge XS      10-11px/11px Semibold (600)  tracking-normal Compact table badges, count pills
Mono MD       16px / 16px  Medium (500)    tracking-tight  Numeric token displays, KPI stats
Mono SM       14px / 14px  Medium (500)    tracking-tight  Request IDs (UXMB-2026-001)
```

---

## 2.6 Border Radius & Elevation Tiers

### Standardized Radius Hierarchy:
1. **Compact (`6px – 8px` / `rounded-md` – `rounded-lg`)**: Priority Badges (`rounded-md`), XS/SM buttons (`rounded-lg`), dropdown menu items, tooltips.
2. **Standard (`12px` / `rounded-xl`)**: **Buttons** (all primary variants), **Input fields**, **Select dropdowns**, **Textareas**, **Modal dialogs**, **Stepper indicator nodes**, **Tab list trays**.
3. **Container (`16px` / `rounded-2xl`)**: **ReUI Frame cards**, Dashboard summary blocks, Admin configuration panels, Chat comment cards.
4. **Pill / Circular (`9999px` / `rounded-full`)**: **Status Pills**, Status indicator dots, User avatars, Stepper connecting lines.

### Elevation & Shadow Tiers:
- **`shadow-2xs` (Micro)**: `0 1px 2px 0 rgba(0, 0, 0, 0.03)` — Outline buttons, priority tags, secondary badges.
- **`shadow-xs` (Base)**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)` — Primary buttons, ReUI Frame default cards, active tab pill.
- **`shadow-sm` (Subtle)**: `0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)` — Popovers, date pickers.
- **`shadow-md` (Medium)**: `0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)` — Dropdown menus, elevated frames.
- **`shadow-xl` (Large)**: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)` — Centered dialog modals.
- **`shadow-2xl` (Deep)**: `0 25px 50px -12px rgba(0, 0, 0, 0.25)` — Full-height slide-over drawers.

---

# Chapter 3: Keenthemes reUI Component Architecture

## 3.1 ReUI Stepper (`<Stepper>`)

The ReUI Stepper provides linear and interactive workflow progression tracking. Located at `src/components/reui/stepper.tsx`, it implements a compound model governed by `StepperContext`.

```
           Step 1              Step 2              Step 3              Step 4
       +------------+      +------------+      +------------+      +------------+
       |   ( v )    |======|   [ 2 ]    |------|    ( 3 )   |------|    ( 4 )   |
       +------------+      +------------+      +------------+      +------------+
         Completed             Active              Upcoming            Upcoming
       bg-emerald-600       bg-slate-900         bg-slate-50         bg-slate-50
```

### TypeScript Prop Definitions:
```typescript
export type StepStatus = "complete" | "current" | "upcoming" | "error"

export interface StepDef {
  id: string
  title: string
  description?: string
  status: StepStatus
}

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  activeStep: number
  orientation?: "horizontal" | "vertical"
  variant?: "default" | "pills" | "circles" | "simple"
  onStepClick?: (stepIndex: number) => void
  children: React.ReactNode
}

export interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number
  title: string
  description?: string
  icon?: React.ReactNode
  state?: StepStatus
  disabled?: boolean
}
```

### Indicator Visual States:
- **Active / Current (Sonar Motion & Live Beacon)**:
  - **Lõi nút**: `bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25`
  - **Sóng Sonar / Radar Ping Wave sau UI (`-z-10`)**: `absolute inset-0 -z-10 rounded-full bg-blue-500/20 animate-pulse` (sử dụng độ mờ opacity, nghiêm cấm dùng `transform: scale` để tránh layout jitter).
  - **Vòng xoay nét đứt ngoài duy nhất**: `absolute -inset-1 rounded-full border border-dashed border-blue-500/50 animate-[spin_8s_linear_infinite]` (loại bỏ nét đứt bên trong, chỉ giữ 1 vòng xoay ngoài).
  - **Live Pulse Beacon cạnh tiêu đề**: `w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-2 ring-emerald-500/20` ngay trước tiêu đề khâu đang xử lý.
- **Completed**: `bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-500/20` with `<Check className="w-4 h-4 stroke-[2.5]" />`
- **Upcoming / Pending**: `bg-slate-50 border-slate-200 text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600`
- **Error / Blocker**: `bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-500/20` with `<AlertCircle className="w-4 h-4" />`
- **Connector Track**: Emerald (`bg-emerald-500`) for completed segments, Slate 200 (`bg-slate-200`) for pending.

### Horizontal Overflow Containment & Anti-Jitter Architecture:
To prevent long Vietnamese step labels from breaking mobile or tablet layouts and completely eliminate vertical bounce/jitter ("thụt ra thụt vào"):
```tsx
<div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-100 overflow-x-auto overflow-y-hidden no-scrollbar shrink-0 touch-pan-x">
  <Stepper activeStep={currentStep} className="min-w-[640px] lg:min-w-full">
    {/* Step Items */}
  </Stepper>
</div>
```
- **Quy tắc vàng chống co giật (CLS = 0)**: Bắt buộc kèm `overflow-y-hidden` trên wrapper cuộn ngang để chặn triệt để việc trình duyệt tự động kích hoạt thanh cuộn dọc ảo khi hiệu ứng hoạt họa kích hoạt.

---

## 3.2 ReUI Timeline (`<Timeline>`)

The ReUI Timeline at `src/components/reui/timeline.tsx` renders chronological activity streams, dividing cleanly between user discussions and system audit events.

```
       Timeline Marker                     Content Card
       +-------------+        +----------------------------------------+
       | [UserAvatar]| ------ | User Comment Card (16px rounded-2xl)   |
       +-------------+        | Author Name, Role Badge, Time, Message |
              |               +----------------------------------------+
       Continuous Track
       before:bg-slate-200
              |
       +-------------+        +----------------------------------------+
       | (Check Icon)| ------ | System Audit Note (Inline text)        |
       +-------------+        | Designer assigned, phase updated       |
```

### Compound Subcomponents:
- `<Timeline>`: Root `<ol>` element with pseudo-element connector: `before:absolute before:left-4 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200`.
- `<TimelineItem>`: Semantic `<li>` element.
- `<TimelineIcon>`: 32x32px or 28x28px marker with `ring-4 ring-white` ensuring clean visual separation over the vertical track line.
- `<TimelineContent>`, `<TimelineHeader>`, `<TimelineTitle>`, `<TimelineTime>`, `<TimelineDescription>`.

### Production JSX Example:
```tsx
import { Timeline, TimelineItem, TimelineIcon, TimelineContent, TimelineHeader, TimelineTitle, TimelineTime } from "@/components/reui/timeline"
import { Check } from "lucide-react"
import { UserAvatar } from "@/components/common/UserAvatar"

export function ActivityTimelineExample() {
  return (
    <Timeline className="before:left-3.5 space-y-4">
      {/* 1. Modern Chat Card */}
      <TimelineItem status="current">
        <TimelineIcon status="current" className="w-8 h-8 ring-2 ring-white p-0 overflow-hidden">
          <UserAvatar name="Nguyen Van A" size="sm" />
        </TimelineIcon>
        <TimelineContent className="flex-1 min-w-0">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <TimelineHeader>
              <TimelineTitle className="text-sm font-semibold text-slate-900">Nguyen Van A</TimelineTitle>
              <TimelineTime className="text-xs text-slate-400">10:30 AM</TimelineTime>
            </TimelineHeader>
            <p className="text-sm text-slate-800">Đã cập nhật phương án thiết kế luồng Chuyển tiền nhanh 24/7 theo góp ý của PO.</p>
          </div>
        </TimelineContent>
      </TimelineItem>

      {/* 2. Automated System Audit Event */}
      <TimelineItem status="completed">
        <TimelineIcon status="completed" className="w-7 h-7 text-xs">
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        </TimelineIcon>
        <TimelineContent className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">System</span>
            <span>chuyển trạng thái sang</span>
            <span className="font-semibold text-emerald-700">UI Design</span>
            <span className="text-slate-400 font-mono text-[11px] ml-auto">09:15 AM</span>
          </div>
        </TimelineContent>
      </TimelineItem>
    </Timeline>
  )
}
```

---

## 3.3 ReUI Frame (`<Frame>`)

The ReUI Frame at `src/components/reui/frame.tsx` is the structural container primitive for dashboard cards, analytics metrics, and data tables.

### CVA Variant Specifications:
- **`default`**: `bg-white border border-slate-200/80 shadow-xs hover:border-slate-300/80 rounded-2xl overflow-hidden`
- **`elevated`**: `bg-white border border-slate-200/60 shadow-md hover:shadow-lg rounded-2xl overflow-hidden`
- **`flat`**: `bg-slate-50/50 border border-slate-200 shadow-none rounded-2xl overflow-hidden`
- **`glass`**: `bg-white/90 backdrop-blur-md border border-white/40 shadow-sm rounded-2xl overflow-hidden`
- **`accent`**: `bg-white border border-slate-200/80 border-l-4 border-l-slate-900 shadow-xs rounded-2xl overflow-hidden`
- **`teal`**: `bg-white border border-slate-200/80 border-l-4 border-l-[#0D9B97] shadow-xs rounded-2xl overflow-hidden`
- **`dashed`**: `border-dashed border-2 border-slate-200 bg-slate-50/30 hover:border-slate-300 rounded-2xl overflow-hidden`

### Padding Hierarchy:
- **`none` (`p-0`)**: Tables and full-bleed media.
- **`sm` (`p-3 sm:p-4`)**: KPI metrics, compact counters.
- **`default` (`p-5 sm:p-6`)**: Standard cards, form sections.
- **`lg` (`p-6 sm:p-8`)**: Hero banners, onboarding containers.

---

## 3.4 ReUI Data Grid Tables

The ReUI Data Grid pattern standardizes `SolutionAgentsTable.tsx` and all 6 tables in `QuanLyPage.tsx`.

### Core Class Composition:
```html
<!-- Outer Frame Wrapper -->
<div class="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
  <div data-slot="data-grid" class="w-full select-none">
    <div class="overflow-x-auto w-full overscroll-x-contain touch-pan-x min-h-[240px] pb-1">
      <table data-slot="data-grid-table" class="text-slate-900 text-left text-xs sm:text-sm w-full min-w-[800px] border-separate border-spacing-0">
        
        <!-- Sticky Thead with Backdrop Blur -->
        <thead class="bg-slate-50/80 text-[11px] font-medium text-slate-500 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
          <tr class="h-9">
            <th class="py-2.5 px-4 text-left font-medium border-b border-slate-200/70">Cột thông tin</th>
            <!-- Pinned Right Action Header -->
            <th class="py-2.5 px-3 text-right font-medium w-[80px] min-w-[80px] sticky right-0 top-0 z-20 bg-slate-50/95 backdrop-blur-xs shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)] border-b border-slate-200/70">
              Thao tác
            </th>
          </tr>
        </thead>

        <!-- Alternating Striped Rows -->
        <tbody data-slot="data-grid-table-body" class="text-slate-700">
          <tr class="transition-colors hover:bg-slate-50/80 even:bg-slate-50/40 group">
            <td class="py-3 px-4 align-middle border-b border-slate-200/70 font-semibold text-slate-900">Dữ liệu hàng</td>
            <!-- Pinned Right Action Data Cell -->
            <td class="py-3 px-3 text-right align-middle w-[80px] min-w-[80px] sticky right-0 z-10 bg-white/95 group-hover:bg-slate-50/95 group-even:bg-slate-50/95 backdrop-blur-xs shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)] border-b border-slate-200/70">
              <button class="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100">Sửa</button>
            </td>
          </tr>
        </tbody>

      </table>
    </div>
  </div>
</div>
```

---

## 3.5 ReUI Slide-Over Drawer (`<Drawer>`)

Located at `src/components/reui/drawer.tsx`, the Drawer provides focused slide-over experiences for task inspection, editing, and mobile navigation.

### Essential Architectural Rules:
1. **Direct Portal Mounting**: Mounts via `createPortal(content, document.body)` to escape any parent `transform` or `overflow: hidden` restrictions.
2. **Responsive Clamping**:
   - Standard Drawer: `w-full sm:max-w-[calc(100vw-24px)] md:w-[720px]`.
   - Task Detail Drawer: `w-full sm:w-[600px] md:w-[720px] lg:w-[980px] xl:w-[1180px] sm:max-w-[calc(100vw-24px)]`.
   - On 768px tablet, width clamps to $\le 744\text{px}$, leaving 12px margin on both sides and eliminating the 24px overflow bug.
3. **Motion Physics**: Slide-in animation driven by Framer Motion `springs.gentle`.
4. **Lifecycle Scroll Lock & Escape Dismiss**: Locks `document.body.style.overflow = "hidden"` on mount and cleanly restores `document.body.style.overflow = "unset"` on unmount; dismisses on `Escape` key.

---

## 3.6 ReUI Task Filter Popover (`<TaskFilterPopover>`)

Located at `src/components/reui/task-filter-popover.tsx`, this component coordinates multi-faceted filtering on task lists.

### Features:
- **Mobile Viewport Clamping**: `w-72 max-w-[calc(100vw-2.5rem)] max-h-[min(580px,calc(100vh-140px))] overflow-y-auto`.
- **Origin-Aware Anchor Spring**: Computes trigger coordinates via `useAnchorOrigin` and expands via `springs.popover` (`stiffness: 420, damping: 26`).
- **Dark Navy CTAs**:
  - Filter Trigger (Active): `bg-slate-900 text-white border-slate-900 shadow-xs`.
  - Filter Checkboxes: `bg-slate-900 border-slate-900 text-white`.
  - Apply Button: `bg-slate-900 text-white hover:bg-slate-800 shadow-xs`.

---

## 3.7 ReUI Sonner Toast Notification Architecture (`<Toaster>`)

Located at `src/components/reui/sonner.tsx` (and aliased at `src/components/ui/sonner.tsx` and `src/components/ui/toast.tsx`), this component provides the official ReUI Sonner notification system conforming to `https://reui.io/components/sonner`.

### Architectural Characteristics:
1. **3D Card Stacking Engine (`visibleToasts={4}`, `expand={false}`)**:
   - Multiple notifications collapse into a compact, 3D stacked deck of cards at the bottom-right of the screen instead of pushing content vertically.
   - Front toast has 100% scale; underlying cards scale down proportionally with natural drop shadow depth.
   - Smooth hover interaction: When the user hovers over the stack, cards smoothly fan out and expand via spring physics for inspection and dismissal.
2. **Design Token Alignment**:
   - **Container**: `rounded-2xl border border-slate-200/90 bg-white text-slate-900 shadow-xl shadow-slate-950/10 p-3.5 flex items-start gap-3`.
   - **Action Button**: Dark Navy `#0F172A` (`bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-3 h-7 text-xs font-semibold shadow-xs cursor-pointer`).
   - **Cancel Button**: Slate 100 (`bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl px-2.5 h-7 text-xs font-medium cursor-pointer`).
   - **Close Button (Nút đóng X)**: Nằm cố định tại **góc trên bên phải (Top-Right)** (`right: 10px; top: 10px; left: auto; transform: none; width: 22px; height: 22px; rounded-lg`), xóa bỏ hoàn toàn lỗi nút đóng bị lệch treo lơ lửng ngoài góc trên bên trái của thiết kế mặc định Sonner.
3. **MB Bank UX Semantic Status Icons & Căn Đỉnh Tuyệt Đối (Top-Aligned Icons)**:
   - **Quy tắc căn đỉnh (Top-Alignment)**: Toast container áp dụng `align-items: flex-start !important` và icon wrapper áp dụng `align-self: flex-start !important; margin-top: 2px !important`. Khi văn bản thông báo dài (2 dòng, 3 dòng hoặc nhiều hơn), **icon luôn giữ vị trí ở đỉnh thẳng hàng với dòng chữ đầu tiên**, không bao giờ bị trôi lơ lửng ở giữa thẻ.
   - **Khoảng đệm an toàn**: Phần nội dung văn bản (`[data-content]`) có `padding-right: 28px !important` để tiêu đề và nội dung dài không bao giờ bị đè lên nút đóng `X`.
   - **Success**: Emerald Check badge (`bg-emerald-50 text-emerald-600 border border-emerald-200/80`).
   - **Error**: Rose Alert badge (`bg-rose-50 text-rose-600 border border-rose-200/80`).
   - **Warning**: Amber Alert badge (`bg-amber-50 text-amber-600 border border-amber-200/80`).
   - **Info**: Blue Info badge (`bg-blue-50 text-blue-600 border border-blue-200/80`).
   - **Loading**: Slate Loader spinner (`bg-slate-100 text-slate-700 border border-slate-200`).
4. **Interactive Action Linking**:
   - Notification toasts automatically provide an action button (`action: { label: "Xem chi tiết", onClick: () => ... }`) routing directly to task details.
5. **Cross-Tab Synchronization & Auto-Toasting**:
   - New unread notifications arriving via BroadcastChannel, storage events, or unread session detection automatically trigger toast announcements on the active viewport.

### Usage Example:
```tsx
import { toast } from "@/components/ui/toast"

// 1. Success toast with action
toast.success("Cập nhật thành công", "Yêu cầu UXMB-004 đã chuyển sang UI Design", {
  action: {
    label: "Xem chi tiết",
    onClick: () => navigateToTask("UXMB-004"),
  },
})

// 2. Error toast
toast.error("Không thể lưu", "Vui lòng kiểm tra lại kết nối mạng.")

// 3. Stacking demo trigger
import { triggerTestStackedNotifications } from "@/services/notificationService"
triggerTestStackedNotifications() // Launches 3 stacked toasts
```

---

# Chapter 4: Animate UI Motion Tokens & Spring Micro-Interactions

## 4.1 Harmonic Oscillator Spring Physics

Rather than synthetic bezier curves, all interactive transitions in UXMB follow the Newtonian damped harmonic oscillator equation:

$$m \frac{d^2x}{dt^2} + c \frac{dx}{dt} + k x = 0$$

Where:
- $m$ = mass
- $k$ = stiffness (spring constant)
- $c$ = damping coefficient

The dimensionless damping ratio $\zeta$ governs dynamic settling and overshoot:

$$\zeta = \frac{c}{2 \sqrt{m k}}$$

```
               DISPLACEMENT OVER TIME (SPRING DYNAMICS)
   +1.05 |       .-.   <- 5% intentional tactile overshoot (zeta = 0.75)
   +1.00 |------/---\---------------------------------- [Target Rest Point]
         |     /     \
         |    /       '--.
   0.00  +---/------------'----------------------------
         0ms      100ms     180ms (Settled)
```

---

## 4.2 Motion Token Catalog & Curves

Cataloged in `src/lib/motion.ts`:

| Token | Parameters | Damping Ratio $\zeta$ | Settling Time | Primary Usage |
| :--- | :--- | :---: | :---: | :--- |
| **`springs.indicator`** | `stiffness: 400, damping: 30, mass: 1.0` | $\mathbf{0.75}$ | ~180ms | **Sliding Tab Indicators**: Smooth 60fps glide with ~5% subtle overshoot. |
| **`springs.gentle`** | `stiffness: 320, damping: 28, mass: 1.0` | $\mathbf{0.81}$ | ~260ms | **Drawers & Modals**: Smooth, elegant slide-overs with $<2\%$ overshoot. |
| **`springs.snappy`** | `stiffness: 450, damping: 35, mass: 0.8` | $\mathbf{0.92}$ | $<16$ms | **Micro-Interactions**: Rapid tactile feedback on buttons, cards, and toggles. |
| **`springs.smooth`** | `stiffness: 260, damping: 25, mass: 1.0` | $\mathbf{0.78}$ | ~340ms | **Page Containers**: Broad layout shifts and expandable accordions. |
| **`springs.bouncy`** | `stiffness: 400, damping: 20, mass: 1.0` | $\mathbf{0.50}$ | ~320ms | **Alerts & Badges**: Noticeable bounce for counters and notification pings. |
| **`springs.popover`** | `stiffness: 420, damping: 26, mass: 0.9` | $\mathbf{0.67}$ | ~220ms | **Origin-Aware Popovers**: Origin expansion and scale transitions. |

### Duration Tokens:
- `durations.instant`: `0.08s` (80ms) — Hover state color swaps.
- `durations.fast`: `0.15s` (150ms) — Popover dismissals.
- `durations.normal`: `0.25s` (250ms) — Cross-fades and view switches.
- `durations.slow`: `0.35s` (350ms) — Fullscreen sheet dismissals.
- `durations.skeletonExit`: `0.20s` (200ms) — Skeleton shimmer fade-out.

---

## 4.3 Sliding Tab Indicators & `layoutId` Collision Isolation

When multiple tab rails render simultaneously, shared layout IDs must be collision-isolated to prevent indicator teleportation across unrelated components:

```
+-----------------------------------------------------------------------------+
|                          LAYOUT ID NAMESPACE MATRIX                         |
+------------------------------------+----------------------------------------+
| Component / Scope                  | Assigned layoutId String               |
+------------------------------------+----------------------------------------+
| View Mode Switcher (Track Screen)  | layoutId="view-mode-pill"              |
| Admin Mobile Horizontal Rail       | layoutId="admin-mob-tab-pill"          |
| Admin Desktop Vertical Rail        | layoutId="admin-sidebar-active-indicator"
| Dashboard Product Filter           | layoutId="tongquan-product-pill"       |
| Navigation Sidebar (Desktop)       | layoutId="sidebar-active-indicator"    |
| Navigation Sidebar (Mobile)        | layoutId="sidebar-active-indicator-mobile"
| Reusable Tabs Primitive            | layoutId={`tabs-indicator-${variant}-${useId()}`}
+------------------------------------+----------------------------------------+
```

---

## 4.4 WAI-ARIA Accessible Tab Synchronization

Visual sliding indicators must accompany full WAI-ARIA 1.2 semantics:

```tsx
<div role="tablist" aria-label="Chế độ hiển thị" className="inline-flex p-1 bg-slate-100 rounded-lg">
  {items.map((item) => {
    const isSelected = activeId === item.id
    return (
      <button
        key={item.id}
        role="tab"
        type="button"
        aria-selected={isSelected}
        tabIndex={isSelected ? 0 : -1}
        onClick={() => onChange(item.id)}
        className="relative px-3 py-1.5 text-xs font-semibold"
      >
        {isSelected && (
          <motion.div
            layoutId="view-mode-pill"
            className="absolute inset-0 bg-white rounded-md shadow-2xs -z-10"
            transition={springs.indicator}
          />
        )}
        <span className="relative z-10">{item.label}</span>
      </button>
    )
  })}
</div>
```

---

## 4.5 Modal/Drawer Exit Lifecycles & CLS = 0 Architecture

### The Direct `<motion.div>` Child Rule:
`<AnimatePresence>` intercepts unmount only when the immediate child is a `<motion.*>` element. 

```tsx
// ❌ ANTI-PATTERN: Intermediate regular div unmounts immediately (frame 0 flash)
<AnimatePresence>
  {open && (
    <div className="fixed inset-0">
      <motion.aside exit={{ x: "100%" }} />
    </div>
  )}
</AnimatePresence>

// ✅ PRODUCTION PATTERN: Direct motion child guarantees exit animation executes
<AnimatePresence>
  {open && (
    <motion.div key="drawer-root" initial="initial" animate="animate" exit="exit" className="fixed inset-0">
      <motion.aside variants={drawerVariants} transition={springs.gentle} className="fixed inset-y-0 right-0">
        {children}
      </motion.aside>
    </motion.div>
  )}
</AnimatePresence>
```

### Cumulative Layout Shift Elimination (CLS = 0.000):
When `document.body.style.overflow = "hidden"` is set, browser vertical scrollbar disappearance causes a 15–17px layout jump. This is neutralized via `scrollbar-gutter` in `src/index.css`:

```css
html {
  scrollbar-gutter: stable; /* Permanently preserves scrollbar gutter */
}
```

---

## 4.6 Cascade Wave Entry & Per-Element Micro-Staggering (Silky Smooth Motion)

To elevate UXMB Task Request to an Apple HIG / modern SaaS grade of visual fluidity, all loaded data arrays and complex surface containers apply **Silky Smooth Cascade Waves** and **Per-Element Micro-Staggering**:

### 1. Staggered Entry Wave Physics (`cascadeWaveContainerVariants`, `cascadeWaveItemVariants`)
- Rather than an overwhelming simultaneous UI reveal ("monolithic pop"), data elements flow into the viewport as cohesive sequential waves:
  - **Inter-Item Stagger Interval**: $28\text{ms}$ (`staggerChildren: 0.028s`).
  - **Initial Launch Delay**: $15\text{ms}$ (`delayChildren: 0.015s`).
  - **Multi-Axis Translation**: $Y: 12\text{px} \to 0\text{px}$ synchronized with $Opacity: 0 \to 1.0$.
  - **Exponential Deceleration Curve**: `easeOutExpo: [0.16, 1, 0.3, 1]`. The curve accelerates during the first $0 - 50\text{ms}$ for instantaneous tactile responsiveness, then rapidly decelerates into an ultra-smooth landing without cartoonish bounce.
  - **Perception Threshold Guarantee**: The entire wave entry sequence finishes under **$280\text{ms}$**, well beneath human impatience thresholds.

### 2. Per-Element 3-Tier Micro-Staggering (`microStaggerTier1..3Variants`)
Within complex container views (e.g., Slide-Over Drawer `RequestDetail`, Request Form `RequestForm`), interior elements animate with architectural hierarchy:
- **Tier 1 (`microStaggerTier1Variants`)**: Structural Frame, Header & Title bar (`delay: 40ms`, `duration: 0.20s`).
- **Tier 2 (`microStaggerTier2Variants`)**: Visual Stepper progression, KPI Summary Badge, or Floating Preview Card (`delay: 90ms`, `duration: 0.24s`).
- **Tier 3 (`microStaggerTier3Variants`)**: Two-column task metadata grid, interactive comment stream & activity timeline (`delay: 140ms`, `duration: 0.28s`).

### 3. Data Continuity & Layout Morphing (`dataContinuityTransition` / FLIP)
When users filter tasks by Phase, Squad, or Status, or change view modes (Table, Kanban, Grid, Gantt):
- Elements maintain DOM identity and glide continuously to their new grid/column coordinates using Framer Motion FLIP (`layout="position"`).
- `dataContinuityTransition`: `duration: 0.28s`, `ease: easings.easeOutExpo`.
- Prevents jarring disappearance/reappearance flash and guarantees Cumulative Layout Shift ($\text{CLS} = 0.000$).

---

## 4.7 Architectural Boundary & IA Map Isolation

### Design System Rule:
**The IA Map interactive canvas (`src/pages/IAPage.tsx`) is strictly isolated from standard DOM cascade wave animations.**

### Rationale:
1. **Dedicated 60 FPS GPU Transform Engine**: IA Map renders hundreds of hierarchical nodes (LV1 to LV5) and dynamic Bezier connectors over an infinite zoomable canvas powered by FigJam-style trackpad pan/zoom gestures (`transform: translate3d(x, y, 0) scale(s)`).
2. **Matrix Transform Conflict Avoidance**: Wrapping canvas nodes in staggered Framer Motion DOM wrappers disrupts hardware-accelerated canvas viewport scaling and forces continuous browser reflow cycles during pan operations.
3. **Viewport Culling Protection**: The canvas engine incorporates an active Viewport Culling system (culled offscreen nodes and connectors, achieving an 83.6% DOM reduction). Applying DOM cascade wrappers to virtualized canvas nodes causes mounting thrashing.

---

# Chapter 5: Responsive Breakpoint Architecture & Layout Resilience

## 5.1 Responsive Viewport Matrix

| Breakpoint | Target Device | Base Padding | Container Behavior | Navigation Pattern | Form Layout | Drawer Behavior |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| **375px** | Mobile | `px-3.5 py-4` | Full width stacked | Off-canvas drawer via hamburger | 1-column stacked | Full width edge-to-edge |
| **768px** | Tablet Portrait | `px-6 py-6` | `md:ml-60` offset | Collapsible sidebar rail | 1-column stacked | Clamped: `max-w-[calc(100vw-24px)]` |
| **1024px** | Tablet Landscape| `px-8 py-8` | Single sidebar layout | Subnav elevated to horizontal rail | 1-column stacked | Clamped: `max-w-[calc(100vw-24px)]` |
| **1280px / 1440px** | Desktop / Wide | `px-8 py-8` | Permanent 240px sidebar | Full sidebar + admin vertical rail | 8/4 grid split | Full desktop sheet (`1180px`) |

---

## 5.2 Two-Tier Anti-Overflow Containment

### 1. Root-Level Clip (`overflow-x-clip`)
Declared in `src/App.tsx`:
```tsx
<div className="min-h-screen bg-[#FCFCFD] w-full max-w-full overflow-x-clip relative">
```
- **Why `overflow-x-clip`**: Unlike `overflow-x: hidden`, which creates a scroll container and destroys `position: sticky` on all descendants, `overflow-x-clip` clips horizontal excess at the viewport edge while fully preserving sticky headers and sticky cards.

### 2. Flex Hierarchy Containment (`min-w-0 max-w-full flex-1`)
CSS flex items default to `min-width: auto`. Wide tables with minimum widths force parent flex containers to expand beyond the viewport width. Enforcing `min-w-0 max-w-full flex-1` throughout all parent wrappers enables inner table scrollbars (`overflow-x-auto`) to function without triggering window-level page scrolling.

---

## 5.3 Form Stacking & Desktop Sticky Summary Geometry

In `RequestForm.tsx`, the layout automatically transitions between mobile vertical flow and desktop split layout:

```tsx
<div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
  {/* Left: Form Input Fields */}
  <div className="w-full xl:col-span-8 space-y-8">
    {/* Stepped Field Groups */}
  </div>

  {/* Right: Sticky Summary Card */}
  <div className="w-full xl:col-span-4 xl:sticky xl:top-20">
    <SummaryCard />
  </div>
</div>
```

### Mathematical Clearance Calculation:
- **Global Header**: `AppHeader` height = `h-14` = **56px**, `sticky top-0 z-40`.
- **Top Offset**: `xl:top-20` = **80px**.
- **Vertical Clearance**:
  $$\text{Clearance} = \text{Top Offset} - \text{Header Height} = 80\text{px} - 56\text{px} = \mathbf{24\text{px}}$$
The summary card scrolls naturally with the form and docks 24px beneath the header line with zero overlap.

---

## 5.4 Tablet 1024px Double Sidebar Squeeze Resolution

At 1024px viewport width, maintaining both the 240px primary sidebar and a 240px secondary admin sidebar leaves only 544px for content, severely truncating table columns.

UXMB resolves this via elevated breakpoints in `QuanLyPage.tsx`:
- At $\le 1024\text{px}$ (`xl:hidden`), the secondary sidebar collapses into a horizontal scrollable tab rail (`no-scrollbar`), granting complex tables the full 736px available content width.
- At $\ge 1280\text{px}$ (`hidden xl:block`), the vertical admin sidebar rail is restored.

---

## 5.5 Drawer & Popover Viewport Clamping

- **Slide-Over Drawers**: Enforce `sm:max-w-[calc(100vw-24px)] md:w-[720px]`, eliminating the 24px overflow bug on 768px tablet portrait.
- **Filter Popovers**: Enforce `max-w-[calc(100vw-2.5rem)]`, ensuring filter popovers fit cleanly on 375px mobile displays without horizontal scrollbars.

---

# Chapter 6: Quick Reference, Token Tables & Anti-Patterns

## 6.1 Complete Design Token Lookup Table

| Token Name | CSS Variable / Formula | Tailwind Utility Class | Value / Specs | Primary Application Area |
| :--- | :--- | :--- | :--- | :--- |
| **Navy Primary** | `--color-navy-primary` | `bg-slate-900 text-white` | `#0F172A` | Primary Buttons, Active Stepper, Checked Input |
| **Navy Hover** | `--color-navy-hover` | `hover:bg-slate-800` | `#1E293B` | Primary Button hover state |
| **Navy Active** | `--color-navy-active` | `active:bg-slate-950` | `#020617` | Primary Button pressed/tap state |
| **Navy Ring** | `--color-navy-ring` | `focus-visible:ring-slate-900/30` | `rgba(15, 23, 42, 0.30)` | Accessible focus outlines |
| **Slate Canvas** | `--color-slate-50` | `bg-slate-50` | `#F8FAFC` | Main app background, striped table hover |
| **Slate Tray** | `--color-slate-100` | `bg-slate-100` | `#F1F5F9` | Tab segmented trays, secondary buttons |
| **Slate Border** | `--color-slate-200` | `border-slate-200` | `#E2E8F0` | Structural dividers, card borders |
| **Slate Hover Border** | `--color-slate-300` | `border-slate-300` | `#CBD5E1` | Input hover border, card hover border |
| **Slate Placeholder**| `--color-slate-400` | `text-slate-400` | `#94A3B8` | Placeholder text, disabled labels |
| **Slate Subtext** | `--color-slate-500` | `text-slate-500` | `#64748B` | Timestamp captions, card descriptions |
| **Slate Body** | `--color-slate-600` | `text-slate-600` | `#475569` | Default paragraphs, unselected nav links |
| **Slate Label** | `--color-slate-700` | `text-slate-700` | `#334155` | Form labels, table header titles |
| **Slate Strong** | `--color-slate-800` | `text-slate-800` | `#1E293B` | Input value text, section headers |
| **Status Received** | Semantic Pastel | `bg-slate-50 text-slate-600` | Dot: `#94A3B8` | Chờ tiếp nhận, Mới tạo |
| **Status Processing**| Semantic Pastel | `bg-amber-50 text-amber-700` | Dot: `#F59E0B` | Chờ xác nhận, Phân loại, PO Pending |
| **Status Analyzing** | Semantic Pastel | `bg-purple-50 text-purple-700`| Dot: `#9333EA` | Discovery, Define đầu bài |
| **Status Planning** | Semantic Pastel | `bg-blue-50 text-blue-700` | Dot: `#3B82F6` | Wireframe, User Flow |
| **Status In Progress**| Semantic Pastel | `bg-emerald-50 text-emerald-700`| Dot: `#10B981` | UI Design, Ready to Dev |
| **Status Review** | Semantic Pastel | `bg-pink-50 text-pink-700` | Dot: `#DB2777` | Đang review, Nghiệm thu UI |
| **Status Completed** | Semantic Pastel | `bg-emerald-50 text-emerald-700`| Dot: `#059669` | Hoàn thành, Released |
| **Status Rejected** | Semantic Pastel | `bg-rose-50 text-rose-700` | Dot: `#F43F5E` | Bị chặn, Quá tải, Đã hủy |
| **Priority Lv1** | Urgent Tier | `bg-rose-50 text-rose-700` | Dot: `#F43F5E` | Khẩn cấp, Blocker (<24h) |
| **Priority Lv2** | High Tier | `bg-amber-50 text-amber-700` | Dot: `#F59E0B` | Cao, cam kết Release |
| **Priority Lv3** | Medium Tier | `bg-blue-50 text-blue-700` | Dot: `#3B82F6` | Trung bình (mặc định) |
| **Priority Lv4** | Low Tier | `bg-slate-50 text-slate-600` | Dot: `#94A3B8` | Thấp, cải tiến nội bộ |
| **Radius Control** | Uniform Control | `rounded-xl` | `12px` | Buttons, Inputs, Select, Modals |
| **Radius Frame** | Uniform Container | `rounded-2xl` | `16px` | Frame cards, Summary blocks |
| **Radius Pill** | Infinite Circle | `rounded-full` | `9999px` | Status pills, Dots, Avatars |
| **Spring Indicator** | $\zeta = 0.75$ | `transition={springs.indicator}`| $k=400, c=30$ | Sliding tab indicators (~5% overshoot) |
| **Spring Gentle** | $\zeta = 0.81$ | `transition={springs.gentle}` | $k=320, c=28$ | Slide-over drawers, dialog entrance |
| **Spring Snappy** | $\zeta = 0.92$ | `transition={springs.snappy}` | $k=450, c=35, m=0.8$ | Button tactile tap, hover elevation |

---

## 6.2 Component Utility Class Cheat Sheet

```tsx
// 1. PRIMARY BUTTON (Dark Navy)
"bg-slate-900 text-white rounded-xl shadow-xs hover:bg-slate-800 active:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 font-semibold px-4 h-9.5 text-sm gap-2"

// 2. OUTLINE / SECONDARY BUTTON
"border border-slate-200 bg-white text-slate-700 rounded-xl shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 font-semibold px-4 h-9.5 text-sm gap-2"

// 3. FORM INPUT
"flex h-11 w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-all"

// 4. STATUS PILL
"inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap border"

// 5. REUI FRAME CARD
"rounded-2xl transition-all duration-200 bg-white border border-slate-200/80 shadow-xs hover:border-slate-300/80 overflow-hidden p-5 sm:p-6"

// 6. DATA GRID TABLE THEAD
"bg-slate-50/80 text-[11px] font-medium text-slate-500 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs"

// 7. PINNED TABLE ACTION CELL
"py-3 px-3 text-right align-middle w-[80px] min-w-[80px] sticky right-0 z-10 bg-white/95 group-hover:bg-slate-50/95 group-even:bg-slate-50/95 backdrop-blur-xs shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)] border-b border-slate-200/70"
```

---

## 6.3 Top 6 Anti-Patterns & Production Solutions (Do's & Don'ts)

### Anti-Pattern 1: Intermediate Non-Motion Element in `<AnimatePresence>`
- **Problem**: Wrapping a `<motion.div>` in an unmanaged `<div>` causes the container to unmount immediately at frame 0, breaking the exit animation.
- **Do**: Ensure the direct child of `<AnimatePresence>` is a `<motion.div>` with a stable `key`.
- **Don't**: Never place an intermediate raw HTML element between `<AnimatePresence>` and motion components.

### Anti-Pattern 2: `overflow-x: hidden` on Root Layout Containers
- **Problem**: `overflow-x: hidden` instantiates a scroll container, breaking `position: sticky` on headers (`AppHeader`), summary cards, and table headers.
- **Do**: Use `overflow-x-clip` on root containers to clip horizontal bleed while preserving sticky positioning.
- **Don't**: Do not use `overflow-x: hidden` on top-level layout wrappers.

### Anti-Pattern 3: Duplicate `layoutId` Strings Across Components
- **Problem**: Reusing the same `layoutId` across separate tab bars causes active indicators to teleport across the screen.
- **Do**: Scope reusable primitives via `React.useId()`: `layoutId={'tabs-${variant}-${useId()}'}` and use domain prefixes for page-level tabs (`view-mode-pill`, `admin-mob-tab-pill`).
- **Don't**: Never hardcode generic strings like `layoutId="active-tab"` across multiple components.

### Anti-Pattern 4: Missing `min-w-0` on Flex Layout Parents
- **Problem**: CSS flex items default to `min-width: auto`. Wide tables expand parent flex wrappers beyond 100vw, producing an unwanted global page scrollbar.
- **Do**: Apply `min-w-0 max-w-full flex-1` down all flex wrappers to allow tables to scroll internally.
- **Don't**: Do not omit `min-w-0` on flex containers housing data grids.

### Anti-Pattern 5: Scroll Lock Without `scrollbar-gutter: stable`
- **Problem**: Toggling `document.body.style.overflow = "hidden"` removes the OS vertical scrollbar, causing an abrupt 15–17px layout jump (high CLS).
- **Do**: Declare `html { scrollbar-gutter: stable; }` in global CSS so scrollbar space is permanently preserved.
- **Don't**: Do not lock body scrolling without layout gutter compensation.

### Anti-Pattern 6: Inconsistent Button Colors & Arbitrary Border Radii
- **Problem**: Mixing custom button hex colors (`#001A9C`, `#1057FB`, `#0D9B97`) and non-standard radii (`rounded-none`, `rounded-3xl`) degrades brand coherence.
- **Do**: Standardize all primary interactive controls on Dark Navy `#0F172A` / `bg-slate-900` with uniform 12px `rounded-xl`.
- **Don't**: Never introduce arbitrary hex colors or rogue radius classes on core buttons.

---

*Certified for Production Release — MBBank UX Task Request Management Platform*
