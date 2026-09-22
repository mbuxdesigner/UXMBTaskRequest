import fs from "fs"
import assert from "assert"

console.log("================================================================================")
console.log("TEST SUITE: IA UNIFIED BOTTOM DOCK (LIGHT GLASS) VERIFICATION")
console.log("================================================================================")

function readFile(p) {
  return fs.readFileSync(p, "utf-8").replace(/\r\n/g, "\n")
}

const bottomDockCode = readFile("src/components/ia/IABottomDock.tsx")
const viewportCode = readFile("src/components/ia/IACanvasViewport.tsx")
const sheetCode = readFile("src/components/ia/IASlideOverSheet.tsx")

// Test 1: IABottomDock exists and exports default function and IADockTool
assert.ok(bottomDockCode.includes("export default function IABottomDock"), "IABottomDock must export default function")
assert.ok(bottomDockCode.includes("export type IADockTool ="), "IABottomDock must export type IADockTool")
console.log("✓ Test 1: IABottomDock component and types exported correctly")

// Test 2: Positioned at bottom center with Light Glass styling
assert.ok(bottomDockCode.includes("bottom-5 left-1/2 -translate-x-1/2"), "IABottomDock must be positioned at bottom center")
assert.ok(bottomDockCode.includes("bg-white/95 backdrop-blur-xl"), "IABottomDock must use Light Glass backdrop blur")
assert.ok(bottomDockCode.includes("shadow-xl") && bottomDockCode.includes("rounded-2xl"), "IABottomDock must have shadow-xl and rounded-2xl pill container")
console.log("✓ Test 2: Bottom center positioning & Light Glass styling verified")

// Test 3: Group 1 - Canvas Interaction (Select V & Pan H)
assert.ok(bottomDockCode.includes("data-testid=\"ia-tool-select-btn\""), "Must have select tool button")
assert.ok(bottomDockCode.includes("data-testid=\"ia-tool-pan-btn\""), "Must have pan/hand tool button")
console.log("✓ Test 3: Group 1 (Canvas Interaction - V & H) verified")

// Test 4: Group 2 - Creation (Add Node)
assert.ok(bottomDockCode.includes("data-testid=\"ia-tool-add-node-btn\""), "Must have add-node button")
console.log("✓ Test 4: Group 2 (Creation - Thêm Node) verified")

// Test 5: Group 3 - Data & System (Unified Cloud + JSON Data)
assert.ok(bottomDockCode.includes("data-testid=\"ia-tool-data-system-btn\""), "Must have data & system button")
assert.ok(bottomDockCode.includes("Dữ liệu & Hệ thống"), "Must display text Dữ liệu & Hệ thống")
console.log("✓ Test 5: Group 3 (Dữ liệu & Hệ thống - Unified Cloud & JSON) verified")

// Test 6: Group 4 - Auto Layout & Grid
assert.ok(bottomDockCode.includes("data-testid=\"ia-auto-align-btn\""), "Must have auto-align button")
assert.ok(bottomDockCode.includes("Auto layout"), "Must display text Auto layout")
assert.ok(bottomDockCode.includes("data-testid=\"ia-snap-grid-btn\""), "Must have snap-grid button")
console.log("✓ Test 6: Group 4 (Auto layout & Grid) verified")

// Test 7: Group 5 - Viewport & Zoom (Fit to view has no text)
assert.ok(bottomDockCode.includes("data-testid=\"ia-zoom-in-btn\""), "Must have zoom-in button")
assert.ok(bottomDockCode.includes("data-testid=\"ia-zoom-out-btn\""), "Must have zoom-out button")
assert.ok(bottomDockCode.includes("data-testid=\"ia-zoom-reset-btn\""), "Must have zoom-% popover button")
assert.ok(bottomDockCode.includes("data-testid=\"ia-fit-view-btn\""), "Must have fit-to-view button")
assert.ok(!bottomDockCode.includes("<span>Căn giữa</span>"), "Fit to view button must not have text Căn giữa")
assert.ok(bottomDockCode.includes("data-testid=\"ia-fullscreen-btn\""), "Must have fullscreen button")
assert.ok(bottomDockCode.includes("data-testid=\"ia-toggle-minimap-btn\""), "Must have minimap toggle button")
console.log("✓ Test 7: Group 5 (Viewport & Zoom - icon only fit to view) verified")

// Test 8: IACanvasViewport integration
assert.ok(viewportCode.includes("<IABottomDock"), "IACanvasViewport must render IABottomDock")
assert.ok(!viewportCode.includes("<IAVerticalDock"), "IACanvasViewport must not render legacy IAVerticalDock")
assert.ok(!viewportCode.includes('className="absolute bottom-5 right-5 z-30 flex items-center'), "Legacy bottom-right floating controls must be removed")
console.log("✓ Test 8: IACanvasViewport successfully replaced separate toolbars with unified IABottomDock")

// Test 9: Slide-Over Sheet positioned on right with download JSON and data sub-tabs
assert.ok(sheetCode.includes("right: \"16px\""), "IASlideOverSheet must be positioned on the right")
assert.ok(sheetCode.includes("initial={{ x: 380"), "IASlideOverSheet must slide in from right (x: 380)")
assert.ok(sheetCode.includes("ia-sheet-download-json-btn"), "IASlideOverSheet must have download JSON button")
assert.ok(sheetCode.includes("ia-subtab-data-sync"), "IASlideOverSheet must have data-sync sub-tab")
assert.ok(sheetCode.includes("ia-bottom-dock"), "IASlideOverSheet click-outside must exclude ia-bottom-dock")
// Test 10: View-Only Mode Toolbar (Pan, Sync to refresh, Viewport & Zoom)
assert.ok(bottomDockCode.includes("data-testid=\"ia-tool-view-sync-btn\""), "Must have view-only sync button")
assert.ok(bottomDockCode.includes("onClick={() => onPullCloud?.()}"), "View-only sync button must call onPullCloud")
assert.ok(viewportCode.includes("onPullCloud={onPullCloud}"), "IACanvasViewport must pass onPullCloud to IABottomDock")
assert.ok(viewportCode.includes("readOnly || toolMode === \"pan\""), "IACanvasViewport must activate hand mode automatically in readOnly")
console.log("✓ Test 10: View-Only mode toolbar (Pan H, RefreshCw sync pull, Viewport & Zoom) verified")

console.log("================================================================================")
console.log("🎉 ALL 10 TESTS PASSED (100%) - UNIFIED BOTTOM DOCK & VIEW-ONLY MODE VERIFIED!")
console.log("================================================================================")
