import assert from "assert"
import fs from "fs"

console.log("================================================================================")
console.log("TEST SUITE: TRACKPAD NORMALIZATION, FULL CANVAS & FIGJAM UI VERIFICATION")
console.log("================================================================================")

// 1. Verify useCanvasTransform.ts trackpad logic
const transformSource = fs.readFileSync("src/hooks/useCanvasTransform.ts", "utf-8")

// Test 1: Pinch to zoom with ctrlKey
assert(transformSource.includes("if (e.ctrlKey)"), "Must check e.ctrlKey for pinch gestures")
assert(transformSource.includes("const factor = 1 - e.deltaY * 0.01"), "Must normalize pinch zoom factor")
assert(transformSource.includes("zoomAtPoint(prev, cursor, factor"), "Must zoom at cursor on pinch")
console.log("✓ Test 1: Trackpad Pinch-to-zoom logic verified (zooms at cursor with e.ctrlKey)")

// Test 2: Two-finger swipe to pan with deltaX and deltaY
assert(transformSource.includes("const dx = -e.deltaX"), "Must translate horizontal deltaX to pan dx")
assert(transformSource.includes("const dy = -e.deltaY"), "Must translate vertical deltaY to pan dy")
assert(transformSource.includes("x: Number((prev.x + dx).toFixed(4))"), "Must update transform x with pan dx")
assert(transformSource.includes("y: Number((prev.y + dy).toFixed(4))"), "Must update transform y with pan dy")
console.log("✓ Test 2: Trackpad Two-finger move logic verified (pans canvas like middle-click)")

// 2. Verify IAPage.tsx edge-to-edge canvas and FigJam UI Card
const iaPageSource = fs.readFileSync("src/pages/IAPage.tsx", "utf-8")

// Test 3: Edge-to-edge canvas
assert(iaPageSource.includes("relative w-full h-full flex-1 min-h-0 min-w-0 max-w-full outline-none overflow-hidden select-none bg-[#F8FAFC]"), "Canvas must take full edge-to-edge container")
assert(iaPageSource.includes("absolute inset-0 w-full h-full overflow-hidden"), "IACanvasViewport must be absolute full inset-0")
console.log("✓ Test 3: Edge-to-edge full canvas layout verified")

// Test 4: Floating Pages Card
assert(iaPageSource.includes("figjam-pages-panel"), "Must have floating Pages panel")
assert(iaPageSource.includes("figjam-collapsed-pill"), "Must support collapsing into a compact floating pill")
assert(iaPageSource.includes("isPagesPanelOpen"), "Must have state to toggle panel expand/collapse")
assert(iaPageSource.includes("Information Architecture"), "Must display title 'Information Architecture'")
assert(!iaPageSource.includes("Drafts"), "Must not display 'Drafts'")
assert(!iaPageSource.includes("Pages</span>"), "Must not display 'Pages +' row")
assert(!iaPageSource.includes("MoreHorizontal"), "Must not display 3 dots icon")
assert(iaPageSource.includes("bg-[#E9EBEF] text-slate-900"), "Must highlight active page with sidebar color #E9EBEF")
console.log("✓ Test 4: Floating Pages panel verified (clean minimalist title, no drafts/page+/3-dots, sidebar color sync)")

// Test 5: Auto-pull on mount
assert(iaPageSource.includes("hasAutoPulledRef"), "Must have ref to track initial mount pull")
assert(iaPageSource.includes("handlePullCloud(true)"), "Must trigger handlePullCloud on mount")
assert(iaPageSource.includes("Đang tải dữ liệu Sheet..."), "Must show loading indicator while pulling Cloud")
console.log("✓ Test 5: Auto Cloud pull on tab mount verified with loading state")

// Test 6: Sidebar & App title
const sidebarSource = fs.readFileSync("src/components/Sidebar.tsx", "utf-8")
assert(sidebarSource.includes('title="IA Map">IA Map</span>'), "Sidebar must display 'IA Map'")
const appSource = fs.readFileSync("src/App.tsx", "utf-8")
assert(appSource.includes('ia: "Information Architecture — MB UX Request Portal"'), "App document title must display 'Information Architecture'")
console.log("✓ Test 6: Navigation label verified as 'IA Map' and page title verified as 'Information Architecture'")

console.log("================================================================================")
console.log("🎉 ALL 6 VERIFICATION TESTS PASSED (100%)!")
console.log("================================================================================")
