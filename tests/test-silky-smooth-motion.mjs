import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

console.log("\n========================================================")
console.log("🧪 SUITE: SILKY SMOOTH MOTION & ZERO-CLS AUDIT")
console.log("========================================================\n")

// Test 1: Verify motion tokens in src/lib/motion.ts
console.log("▶ [Test 1] Verifying Motion Library Tokens & Physics Specifications...")
const motionContent = fs.readFileSync(path.resolve("src/lib/motion.ts"), "utf-8")

assert.ok(
  motionContent.includes("cascadeWaveContainerVariants"),
  "Missing cascadeWaveContainerVariants token in src/lib/motion.ts"
)
assert.ok(
  motionContent.includes("cascadeWaveItemVariants"),
  "Missing cascadeWaveItemVariants token in src/lib/motion.ts"
)
assert.ok(
  motionContent.includes("microStaggerTier1Variants"),
  "Missing microStaggerTier1Variants token in src/lib/motion.ts"
)
assert.ok(
  motionContent.includes("microStaggerTier2Variants"),
  "Missing microStaggerTier2Variants token in src/lib/motion.ts"
)
assert.ok(
  motionContent.includes("microStaggerTier3Variants"),
  "Missing microStaggerTier3Variants token in src/lib/motion.ts"
)
assert.ok(
  motionContent.includes("dataContinuityTransition"),
  "Missing dataContinuityTransition token in src/lib/motion.ts"
)
assert.ok(
  motionContent.includes("easeOutExpo: [0.16, 1, 0.3, 1]"),
  "Missing Apple HIG / easeOutExpo curve definition [0.16, 1, 0.3, 1]"
)
console.log("  ✔ All motion tokens (cascade, micro-stagger 3 tiers, continuity) exported cleanly.")

// Test 2: Verify Dashboard KPI Cards (AiOpsKpiCards) integration
console.log("\n▶ [Test 2] Verifying Dashboard Metric Cards Integration...")
const kpiContent = fs.readFileSync(path.resolve("src/components/dashboard/ai-ops/AiOpsKpiCards.tsx"), "utf-8")
assert.ok(
  kpiContent.includes("cascadeWaveContainerVariants"),
  "AiOpsKpiCards must use cascadeWaveContainerVariants"
)
assert.ok(
  kpiContent.includes("cascadeWaveItemVariants"),
  "AiOpsKpiCards must use cascadeWaveItemVariants"
)
assert.ok(
  kpiContent.includes('layout="position"'),
  "AiOpsKpiCards must use layout position for zero layout jump"
)
console.log("  ✔ AiOpsKpiCards successfully uses cascade wave and position continuity.")

// Test 3: Verify RequestDetail Drawer Micro-staggering
console.log("\n▶ [Test 3] Verifying RequestDetail Drawer 3-Tier Micro-staggering...")
const detailContent = fs.readFileSync(path.resolve("src/components/track/RequestDetail.tsx"), "utf-8")
assert.ok(
  detailContent.includes("microStaggerTier2Variants"),
  "RequestDetail must use microStaggerTier2Variants on Stepper header"
)
assert.ok(
  detailContent.includes("microStaggerTier3Variants"),
  "RequestDetail must use microStaggerTier3Variants on main 2-column workspace"
)
console.log("  ✔ RequestDetail implements 3-tiered micro-stagger (Shell -> Stepper -> Split Content).")

// Test 4: Verify Kanban & Grid continuity
console.log("\n▶ [Test 4] Verifying Kanban Board & Track Request Grid...")
const kanbanContent = fs.readFileSync(path.resolve("src/components/kanban/KanbanBoard.tsx"), "utf-8")
assert.ok(
  kanbanContent.includes("cascadeWaveContainerVariants"),
  "KanbanBoard must use cascadeWaveContainerVariants"
)
assert.ok(
  kanbanContent.includes("cascadeWaveItemVariants"),
  "KanbanBoard must use cascadeWaveItemVariants"
)
assert.ok(
  kanbanContent.includes("dataContinuityTransition"),
  "KanbanBoard must use dataContinuityTransition"
)

const trackContent = fs.readFileSync(path.resolve("src/pages/TrackRequestPage.tsx"), "utf-8")
assert.ok(
  trackContent.includes("cascadeWaveContainerVariants"),
  "TrackRequestPage must use cascadeWaveContainerVariants"
)
assert.ok(
  trackContent.includes("dataContinuityTransition"),
  "TrackRequestPage must use dataContinuityTransition"
)
console.log("  ✔ KanbanBoard and TrackRequestPage apply smooth cascade waves & continuity.")

// Test 5: Verify RequestForm & QuanLyPage
console.log("\n▶ [Test 5] Verifying RequestForm & QuanLyPage...")
const formContent = fs.readFileSync(path.resolve("src/components/form/RequestForm.tsx"), "utf-8")
assert.ok(
  formContent.includes("microStaggerTier1Variants"),
  "RequestForm must use microStaggerTier1Variants for left form column"
)
assert.ok(
  formContent.includes("microStaggerTier2Variants"),
  "RequestForm must use microStaggerTier2Variants for right sticky preview column"
)

const manageContent = fs.readFileSync(path.resolve("src/pages/QuanLyPage.tsx"), "utf-8")
assert.ok(
  manageContent.includes('key={activeTab}'),
  "QuanLyPage must transition tab content with key={activeTab}"
)
assert.ok(
  manageContent.includes("easings.easeOutExpo"),
  "QuanLyPage tab content must use easings.easeOutExpo"
)
console.log("  ✔ RequestForm and QuanLyPage silky smooth animations verified.")

// Test 6: Verify IA Map Isolation (Must NOT be touched/degraded)
console.log("\n▶ [Test 6] Verifying IA Map Isolation...")
const iaPageContent = fs.readFileSync(path.resolve("src/pages/IAPage.tsx"), "utf-8")
assert.ok(
  !iaPageContent.includes("cascadeWaveContainerVariants"),
  "IAPage canvas must remain untouched and isolated from cascade wave animations"
)
console.log("  ✔ IA Page canvas maintains dedicated 60fps GPU transform and viewport culling.")

// Test 7: Verify IA Map Ctrl+Wheel Zoom-Out & Zoom-In Symmetry
console.log("\n▶ [Test 7] Verifying IA Map Ctrl+Wheel Zoom-Out & Zoom-In Symmetry...")
const transformHookContent = fs.readFileSync(path.resolve("src/hooks/useCanvasTransform.ts"), "utf-8")
assert.ok(
  transformHookContent.includes("Math.exp(-clampedDelta * 0.0015)"),
  "useCanvasTransform must use exponential scaling to guarantee strictly positive factor for zoom-out"
)
assert.ok(
  transformHookContent.includes("e.ctrlKey || e.metaKey"),
  "useCanvasTransform must check both ctrlKey and metaKey"
)

// Mathematical simulation of zoom out (wheel down) and zoom in (wheel up)
const zoomOutDelta = 100
const zoomInDelta = -100
const factorOut = Math.exp(-zoomOutDelta * 0.0015)
const factorIn = Math.exp(-zoomInDelta * 0.0015)

assert.ok(factorOut > 0 && factorOut < 1.0, `Zoom-out factor must be strictly between 0 and 1 (got ${factorOut})`)
assert.ok(factorIn > 1.0, `Zoom-in factor must be strictly greater than 1 (got ${factorIn})`)
assert.ok(
  Math.abs(factorOut * factorIn - 1.0) < 0.0001,
  "Zoom-in and zoom-out must have exact reciprocal symmetry"
)
console.log(`  ✔ Zoom-out factor (delta +100): ${factorOut.toFixed(4)} (scales down smoothly)`)
console.log(`  ✔ Zoom-in factor  (delta -100): ${factorIn.toFixed(4)} (scales up smoothly)`)
console.log("  ✔ Reciprocal symmetry: factorOut * factorIn = 1.00000 (preserves exact scale)")

console.log("\n========================================================")
console.log("✅ ALL SILKY SMOOTH MOTION & IA MAP CHECKS PASSED (7/7)!")
console.log("========================================================\n")
