# Test Infrastructure & Quality Assurance Architecture
# UXMB Task Request Dashboard (ReUI AI-Ops Architecture)

> **Document Version**: 1.0.0  
> **Target Milestone**: Milestone 5 (E2E Testing Track & Complete Multi-Tier Test Suite)  
> **Status**: APPROVED & PUBLISHED  
> **Scope**: User Requirements R1–R7, Features F1–F26, 4-Tier Test Framework  

---

## 1. Test Philosophy & Principles

The testing framework for the UXMB Task Request Dashboard refactoring adheres to an **opaque-box, requirement-driven, mathematically authoritative methodology**. Testing is treated as an independent verification track that validates behavior against the user specifications (ORIGINAL_REQUEST.md and PROJECT.md) rather than echoing internal implementation details.

### 1.1 Core Principles

1. **Opaque-Box Verification**:
   - Tests evaluate system behavior, input/output transformations, state machine transitions, and UI contracts from the user perspective.
   - Tests do not rely on implementation hacks or internals that could mask architectural flaws.

2. **Authoritative Output Derivation**:
   - Expected values are derived strictly from defined formulas, mathematical models, and operational specifications:
     - Health status formula: `0-2 -> Ổn định`, `3-5 -> Cảnh báo`, `>5 -> Quá tải`.
     - Capacity utilization: `<50% -> Sẵn sàng`, `50-79% -> Bình thường`, `80-99% -> Đang bận`, `>=100% -> Quá tải`.
     - SLA compliance rate: `(onTimeCount / completedCount) * 100`, defaulting to `96.4%` benchmark when count is 0.
     - Product categorization heuristics: Precedence order (`Lending` -> `BaaS` -> `Digi Invest` -> `TransferD` -> `Khác`) with negative guards for card keywords.
     - Stagger entrance latency budget: `skeletonExit + delayChildren + (staggerChildren * 6) <= 550ms`.

3. **Zero Facade Testing Policy**:
   - Every test case executes concrete logic with asserted inputs and outputs.
   - Dummy assertions (`assert.ok(true)`), bypassed reviews, and mock pass flags are strictly forbidden and audited via static analysis.

4. **Progressive Testability & Isolation**:
   - Tests are independent and self-contained; test order does not dictate test validity.
   - All tests run seamlessly in Node.js ESM runtime without requiring external database connections or active browser daemons, enabling rapid CI/CD execution (<1.5s).

---

## 2. Feature Inventory (F1 to F26) Coverage Table

The complete system comprises 26 distinct features across 6 ReUI AI-Ops Frame blocks, the Top Command Bar, and the Reactive Synchronous State Engine.

| Feature Code | Feature Name | Description | Source Ref | Milestone | Primary Component Source | Verification Tier |
|:---|:---|:---|:---:|:---:|:---|:---:|
| **F1** | Product Filter Pill Bar | 6-option segmented pill selector (`ALL`, Lending, TransferD, Digi Invest, BaaS, Khác) with Framer Motion shared layout indicator | R1 | M1 | `src/components/dashboard/ProductFilter.tsx` | T1, T2, T3 |
| **F2** | Real-time Reactive Sync | Pure synchronous `useMemo` re-computation of filtered task subsets across all blocks with 0ms network latency | R1 | M1 | `src/pages/TongQuanPage.tsx` | T1, T2, T3, T4 |
| **F3** | Live Sync Header & Refresh | Command bar action button triggering data reload and cache invalidation with spinning `RefreshCw` | R1 | M1 | `src/pages/TongQuanPage.tsx` | T1, T2 |
| **F4** | Latest Sync Timestamp | Dynamic formatted time badge (`HH:mm:ss`) displaying exact last synchronization moment | R1 | M1 | `src/pages/TongQuanPage.tsx` | T1, T2 |
| **F5** | Block 1 Pending Metric | Headline total of pending, blocked, and unassigned tasks requiring intervention | R2 | M2 | `src/components/dashboard/Block1PendingOverview.tsx` | T1, T2, T3 |
| **F6** | Block 1 Health Badge | Color-coded team health status (Ổn định: 0-2, Cảnh báo: 3-5, Quá tải: >5) with pulse indicator | R2 | M2 | `src/components/dashboard/Block1PendingOverview.tsx` | T1, T2, T4 |
| **F7** | Block 1 PO Overdue Detection | Automated detection of tasks awaiting PO response > 24 hours (`sent_to_po_at`) | R2 | M2 | `src/components/dashboard/Block1PendingOverview.tsx` | T1, T2, T4 |
| **F8** | Block 1 Urgent Task List | Compact interactive list with user avatar, elapsed relative time, and status badge | R2 | M2 | `src/components/dashboard/Block1PendingOverview.tsx` | T1, T2 |
| **F9** | Block 1 Drawer Drilldown | Clicking any urgent task invokes `onSelectRequest` opening the `RequestDetail` drawer | R2 | M2 | `src/components/dashboard/Block1PendingOverview.tsx` | T1, T2, T3 |
| **F10** | Block 2 In-Progress Total | Total count of active tasks in the UX development pipeline (`status === "Đang thực hiện"`) | R3 | M2 | `src/components/dashboard/Block2InProgressWorkload.tsx` | T1, T2, T3 |
| **F11** | Block 2 5 UX Stages Bar | Segmented multi-phase visual bar across Define, Wireframe, UI Design, Prototype, Ready to Dev | R3 | M2 | `src/components/dashboard/Block2InProgressWorkload.tsx` | T1, T2, T4 |
| **F12** | Block 2 Average Progress % | Clamped mean progress percentage calculation of all running active tasks | R3 | M2 | `src/components/dashboard/Block2InProgressWorkload.tsx` | T1, T2 |
| **F13** | Block 2 Delivery Tempo | Delivery velocity indicator (`tasks/tuần`) with operational pace assessment | R3 | M2 | `src/components/dashboard/Block2InProgressWorkload.tsx` | T1, T2, T4 |
| **F14** | Block 3 Completed Count | Total count of finished and accepted tasks in period (`status === "Hoàn thành"`) | R4 | M3 | `src/components/dashboard/Block3CompletedSLA.tsx` | T1, T2, T3, T4 |
| **F15** | Block 3 SLA On-time Rate % | Dynamic percentage of completed tasks delivered on or before committed expected deadline | R4 | M3 | `src/components/dashboard/Block3CompletedSLA.tsx` | T1, T2, T3, T4 |
| **F16** | Block 3 Test Acceptance Rate % | Quality metric showing percentage of designs approved in First-Time Right acceptance (`94.2%`) | R4 | M3 | `src/components/dashboard/Block3CompletedSLA.tsx` | T1, T2 |
| **F17** | Block 4 Production Release Feed | Vertical timeline feed of features recently deployed to live App/Web/Biz/BaaS channels | R5 | M3 | `src/components/dashboard/Block4ProductionReleases.tsx` | T1, T2, T4 |
| **F18** | Block 4 Channel & Designer Meta | Digital channel categorization tag and lead designer avatar/name display | R5 | M3 | `src/components/dashboard/Block4ProductionReleases.tsx` | T1, T2, T4 |
| **F19** | Block 4 "Đã Release" Badge | Distinctive emerald release badge with pulsing green live dot indicator | R5 | M3 | `src/components/dashboard/Block4ProductionReleases.tsx` | T1, T2 |
| **F20** | Block 5 Squad Workload Meters | Capacity utilization meter per UX Squad (`active_tasks / capacity_threshold`) | R6 | M4 | `src/components/dashboard/Block5SquadActivity.tsx` | T1, T2, T3, T4 |
| **F21** | Block 5 Squad Activity Level | Activity level evaluation: Sẵn sàng (<50%), Bình thường (50-79%), Đang bận (80-99%), Quá tải (>=100%) | R6 | M4 | `src/components/dashboard/Block5SquadActivity.tsx` | T1, T2, T4 |
| **F22** | Block 5 Key Highlight Tasks | Priority tasks per squad filtered by Khẩn cấp, Cao, Trung bình with drilldown | R6 | M4 | `src/components/dashboard/Block5SquadActivity.tsx` | T1, T2, T4 |
| **F23** | Block 6 Full-width ReUI Frame | Full-width container hosting Gantt roadmap with FrameHeader, Today indicator, and Footer | R7 | M4 | `src/components/dashboard/Block6GanttRoadmap.tsx` | T1, T2, T3 |
| **F24** | Block 6 Timeline Schedule Sync | Start date to deadline timeline schedule bars synchronized for all filtered tasks | R7 | M4 | `src/components/dashboard/Block6GanttRoadmap.tsx` | T1, T2, T3, T4 |
| **F25** | Block 6 "Today" Milestone Marker | Synchronized vertical Today milestone marker on the temporal timeline axis | R7 | M4 | `src/components/dashboard/Block6GanttRoadmap.tsx` | T1, T2 |
| **F26** | Block 6 Direct Task Interaction | Clicking any Gantt bar or row invokes `onSelectRequest` opening `RequestDetail` drawer | R7 | M4 | `src/components/dashboard/Block6GanttRoadmap.tsx` | T1, T2, T3 |

---

## 3. The 4-Tier Testing Methodology

The test suite is partitioned into four distinct validation tiers, establishing complete depth and breadth of quality assurance.

```
+-------------------------------------------------------------------------------+
|                       TIER 4: REAL-WORLD APPLICATION SCENARIOS               |
|  - Operational simulations (Lending Crunch, SLA Audit, Production Go-Live)    |
+-------------------------------------------------------------------------------+
                                        ^
                                        |
+-------------------------------------------------------------------------------+
|                     TIER 3: CROSS-FEATURE COMBINATORIAL INTERACTIONS          |
|  - Pairwise filter switches ↔ 6 Frame blocks ↔ Drawer drilldowns ↔ Gantt sync |
+-------------------------------------------------------------------------------+
                                        ^
                                        |
+-------------------------------------------------------------------------------+
|                       TIER 2: BOUNDARY & CORNER CASES                         |
|  - Null/undefined, division-by-zero, extreme dates, malformed inputs (>=5/F)   |
+-------------------------------------------------------------------------------+
                                        ^
                                        |
+-------------------------------------------------------------------------------+
|                       TIER 1: ISOLATED FEATURE COVERAGE                       |
|  - Happy path verification for each of the 26 features in isolation (>=5/F)   |
+-------------------------------------------------------------------------------+
```

### 3.1 Tier 1: Feature Coverage (>=5 test cases per feature)
- **Goal**: Verify the primary behavior, happy paths, and contract obligations of every feature in isolation.
- **Requirement**: Minimum 5 test cases per feature for all 26 features = **130+ test cases minimum**.
- **Scope**:
  - `F1`: Default option selection ("ALL"), label/icon/dot rendering, keyboard cycling (Arrow keys, Home, End), active pill `layoutId="product-filter-active"`, touch horizontal scroll.
  - `F2`: Synchronous `useMemo` derivation, 0ms latency, reactive subset sizing for all 5 product types.
  - `F3`: Refresh handler invocation, spinning icon state, cache bypass parameter pass-through.
  - `F4`: Dynamic timestamp formatting (`HH:mm:ss`), locale string accuracy, header badge mounting.
  - `F5`: Pending count summation (blocked + PO overdue + unassigned), headline metric presentation.
  - `F6`: Health status thresholds (`0-2 -> Ổn định`, `3-5 -> Cảnh báo`, `>5 -> Quá tải`).
  - `F7`: PO pending calculation against 24h threshold (`sent_to_po_at`).
  - `F8`: Urgency scoring (Blocked 1000 > PO Overdue 500 > Unassigned 200), avatar and relative time.
  - `F9`: `onSelectRequest` handler firing on item click with valid request object.
  - `F10`: Active tasks filtering (`Đang thực hiện`), total count computation.
  - `F11`: Phase normalizer (`mapPhaseToUXStage`) across 5 canonical UX stages.
  - `F12`: Mean progress percentage calculation and visual bar width mapping.
  - `F13`: Delivery tempo run-rate calculation (`tasks/tuần`) and pace label assignment.
  - `F14`: Completed tasks filtering (`Hoàn thành` / `Done` / 100% progress).
  - `F15`: Dynamic SLA on-time rate calculation comparing completion date to deadline.
  - `F16`: First-Time Right acceptance rate benchmark adherence (`94.2%`).
  - `F17`: Production release feed sorting chronologically descending (newest first).
  - `F18`: Digital channel metadata tagging (App MBBank, Biz MBBank, Web MBBank, BaaS Platform).
  - `F19`: Distinctive emerald "Đã Release" badge with pulse indicator.
  - `F20`: Squad capacity utilization calculation (`active / threshold`).
  - `F21`: Squad activity status classification (`Sẵn sàng`, `Bình thường`, `Đang bận`, `Quá tải`).
  - `F22`: Priority filtering (Khẩn cấp, Cao, Trung bình) and trending task preview list.
  - `F23`: Full-width ReUI Frame container structure (`FrameHeader`, `FrameBody`, `FrameFooter`).
  - `F24`: Schedule start date to deadline bar mapping in Gantt roadmap.
  - `F25`: Synchronized Today milestone marker line and header date badge.
  - `F26`: Gantt task click-to-drawer drilldown handler wiring.

### 3.2 Tier 2: Boundary, Extreme & Corner Cases (>=5 test cases per feature)
- **Goal**: Stress-test the resilience of every feature against missing data, invalid types, extreme values, boundary conditions, and zero-state fallbacks.
- **Requirement**: Minimum 5 test cases per feature for all 26 features = **130+ test cases minimum**.
- **Scope**:
  - Empty datasets (`requests = []`) across all blocks.
  - Division-by-zero protection (e.g. `calculateSLARate([])` returns benchmark `96.4%` without `NaN`).
  - Capacity threshold `0` or negative values (clamped to minimum `1`).
  - Progress percentages outside standard range (`< 0` or `> 100` or non-numeric strings).
  - Multi-format date strings (`DD/MM/YYYY`, `YYYY-MM-DD`, `ISO 8601`, malformed strings, null/undefined).
  - Negative keyword collision guards (e.g., Credit Card "thẻ tín dụng" must NOT match "Lending").
  - Edge Case E4: Completed tasks must NEVER be categorized as pending or blocked in Block 1.
  - Extreme time horizons (dates in year 1970, 2099, missing deadlines).
  - High volume stress (1,000 synthetic tasks processed without latency regression).

### 3.3 Tier 3: Cross-Feature Combinations (Pairwise & Systemic Interactions)
- **Goal**: Verify state synchronization and data coherence across multiple components when filters and interactions trigger simultaneously.
- **Scope**:
  - Filter Switch Consistency: Changing `selectedProduct` between `ALL`, `Lending`, `TransferD`, `Digi Invest`, `BaaS`, `Khác` updates all 6 blocks simultaneously.
  - Mathematical Invariant: For any product filter, `Block1.totalPending + Block2.activeTasks + Block3.completedCount + otherTasks` strictly partitions the filtered dataset.
  - Drilldown Contract Consistency: Clicking any task in Block 1, Block 2, Block 3, Block 4, Block 5, or Block 6 fires `onSelectRequest(req)` with the exact reference.
  - Timeline Span Synchronization: The date range displayed in Block 6 FrameFooter matches the min/max date bounds of tasks present in Blocks 1-5.
  - Zero-State Alignment: When a product filter has 0 tasks, all 6 blocks cleanly render their respective zero-state UI simultaneously without throwing errors.

### 3.4 Tier 4: Real-World Application Scenarios
- **Goal**: Simulate realistic operational banking scenarios to validate end-to-end user workflows.
- **Scenario 1: The Lending Squad Crunch**
  - High-pressure quarter-end period with 10+ loan applications incoming.
  - 3 tasks with PO approval pending > 24 hours (`sent_to_po_at`), 1 blocked task.
  - Verification: Block 1 health badge flips to "Quá tải" (red pulse), Block 5 Lending Squad meter spikes to >=100% "Quá tải", urgent task list displays PO delay hours.
- **Scenario 2: End-of-Month SLA & Audit Review**
  - Delivery of 20 completed features evaluated on the last day of the month.
  - 18 tasks finished before deadline, 2 tasks overdue.
  - Verification: Block 3 SLA on-time rate calculates to exactly `90.0%`, visual SLA bar changes to amber, on-time badges ("Đúng hạn" vs "Trễ hạn") reflect accurate flags.
- **Scenario 3: Production Go-Live Release Timeline**
  - Major release weekend deploying 5 banking features across App MBBank, Biz MBBank, and BaaS Platform.
  - Verification: Block 4 displays chronological vertical timeline with newest release at top, digital channel badges correctly tag each platform, "Đã Release" badges pulse emerald.
- **Scenario 4: BaaS Multi-Squad Synchronization**
  - Open Banking initiative requiring coordinated API and SDK delivery across BaaS Gateway and Core UX squads.
  - Verification: ProductFilter "BaaS" isolates only API/SDK tasks, Block 2 reflects 5 UX stages distribution, Block 6 Gantt synchronizes milestone dependencies.

---

## 4. Test Runner Architecture (`test-e2e-suite.mjs`)

The executable test suite is authored as an ESM Node.js test runner located at the project root:
`test-e2e-suite.mjs`.

### 4.1 Invocation Command
```bash
node test-e2e-suite.mjs
```

### 4.2 Exit Code Contract
- Exit Code `0`: 100% of all test cases passed successfully.
- Exit Code `1`: Any assertion failure occurred, halting with full diagnostic stack trace.

### 4.3 Output Format
The test runner outputs structured diagnostic logs:
- Tier Header & Objective Summary
- Per-feature test case checkmarks (`✓`) with descriptive test assertions
- Summary statistical table detailing:
  - Total Tests Executed
  - Total Passed
  - Total Failed
  - Execution Time (ms)
  - Feature Coverage Percentage (100% across F1–F26)
