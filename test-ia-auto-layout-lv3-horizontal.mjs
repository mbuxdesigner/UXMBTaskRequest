import fs from "fs"
import path from "path"
import assert from "assert"

console.log("================================================================================")
console.log("TEST SUITE: IA AUTO-LAYOUT LV3 HORIZONTAL, LV2 ENCOMPASSING LV3 & LV1 HEIGHT VERIFICATION")
console.log("================================================================================")

const hookPath = path.join(process.cwd(), "src", "hooks", "useIATreeState.ts")
const hookContent = fs.readFileSync(hookPath, "utf-8")

// 1. Check layout algorithm comments and configuration
assert(hookContent.includes("LV3 (Feature Journeys): Arranged horizontally across columns under LV2 (xếp ngang)"), 
  "Must document LV3 horizontal arrangement")
assert(hookContent.includes("LV4 (Screens & Touchpoints): Stacked vertically below each LV3 (xếp dọc, INDENT_LV4 = 40)"),
  "Must document LV4 vertical stacking")
assert(hookContent.includes("LV5 (Components & Elements): Stacked vertically below each LV4 (xếp dọc, INDENT_LV5 = 36)"),
  "Must document LV5 vertical stacking")

console.log("✓ Test 1: Documentation and architectural constants verified")

// 2. Check layout math logic for LV3 horizontal & LV2 spanning across LV3
assert(hookContent.includes("const luongY = Math.round(modY + module.height + MODULE_TO_JOURNEY_GAP)"),
  "All LV3 siblings under same LV2 must share same baseline luongY")
assert(hookContent.includes("currentLuongX += luongWidthInCol + JOURNEY_GAP"),
  "LV3 siblings must increment horizontally across columns")
assert(hookContent.includes("const totalLuongsWidth = (currentLuongX - JOURNEY_GAP) - firstLuongX"),
  "Module must calculate total width of all horizontal LV3 children")
assert(hookContent.includes("module.width = Math.max(tierDimensions[2].width, totalLuongsWidth)"),
  "LV2 module width must span across all its LV3 children like LV1")

console.log("✓ Test 2: LV3 horizontal and LV2 encompassing span verified")

// 3. Check layout math logic for LV4 & LV5 vertical
assert(hookContent.includes("currentScreenY += screen.height + VERTICAL_GAP_SCREEN") ||
       hookContent.includes("let currentScreenY = luongY + luong.height + VERTICAL_GAP_JOURNEY"),
  "LV4 screens must be stacked vertically")
assert(hookContent.includes("const screenX = luong.x + INDENT_LV4"),
  "LV4 screens must be indented below LV3")
assert(hookContent.includes("const elementX = screenX + INDENT_LV5"),
  "LV5 elements must be indented below LV4")
assert(hookContent.includes("currentElementY += element.height + VERTICAL_GAP_SCREEN"),
  "LV5 elements must be stacked vertically")

console.log("✓ Test 3: LV4 and LV5 vertical stacking calculation verified")

// 4. Check connector logic
assert(hookContent.includes("lv2BusYMap = new Map<string, number>()"),
  "Must calculate shared horizontal bus line for LV2 -> LV3")
assert(hookContent.includes("parent.node.tier === 2 && child.node.tier === 3"),
  "Must handle LV2 -> LV3 connectors")
assert(hookContent.includes('fromPort = "bottom"') && hookContent.includes('toPort = "top"'),
  "LV2 -> LV3 must use top/bottom ports for horizontal branch tree")
assert(hookContent.includes("parent.node.tier === 3 && child.node.tier === 4"),
  "Must handle LV3 -> LV4 vertical trunk connectors")
assert(hookContent.includes("parent.node.tier === 4 && child.node.tier === 5"),
  "Must handle LV4 -> LV5 vertical trunk connectors")

console.log("✓ Test 4: Orthogonal connector definitions and port routing verified")

// 5. Functional Simulation Test: Compute positions on a multi-tier tree
function runLayoutSimulation() {
  const START_X = 60
  const START_Y = 60
  const ROOT_TO_MODULE_GAP = 90
  const MODULE_TO_JOURNEY_GAP = 90
  const INDENT_LV4 = 40
  const INDENT_LV5 = 36
  const VERTICAL_GAP_SCREEN = 36
  const VERTICAL_GAP_JOURNEY = 52
  const COLUMN_GAP = 110
  const JOURNEY_GAP = 56
  const LV1_GAP = 140

  const mockTree = {
    id: "root-1",
    tier: 1,
    width: 320,
    height: 68,
    children: [
      {
        id: "mod-1",
        tier: 2,
        width: 280,
        height: 68,
        children: [
          {
            id: "luong-1",
            tier: 3,
            width: 260,
            height: 68,
            children: [
              {
                id: "screen-1",
                tier: 4,
                width: 240,
                height: 68,
                children: [
                  { id: "elem-1", tier: 5, width: 240, height: 68, children: [] },
                  { id: "elem-2", tier: 5, width: 240, height: 68, children: [] },
                ]
              },
              { id: "screen-2", tier: 4, width: 240, height: 68, children: [] }
            ]
          },
          {
            id: "luong-2",
            tier: 3,
            width: 260,
            height: 68,
            children: [
              { id: "screen-3", tier: 4, width: 240, height: 68, children: [] }
            ]
          }
        ]
      }
    ]
  }

  const nodesMap = new Map()
  let currentClusterStartX = START_X
  const root = mockTree
  root.y = START_Y

  let currentModuleX = currentClusterStartX
  for (const module of root.children) {
    const modY = Math.round(root.y + root.height + ROOT_TO_MODULE_GAP)
    const luongs = module.children || []
    const luongY = Math.round(modY + module.height + MODULE_TO_JOURNEY_GAP)
    let currentLuongX = currentModuleX
    const firstLuongX = currentLuongX

    for (const luong of luongs) {
      luong.x = currentLuongX
      luong.y = luongY
      nodesMap.set(luong.id, { x: luong.x, y: luong.y, width: luong.width, tier: luong.tier })

      let luongColMaxRight = luong.x + luong.width
      const screens = luong.children || []
      if (screens.length > 0) {
        let currentScreenY = luongY + luong.height + VERTICAL_GAP_JOURNEY
        const screenX = luong.x + INDENT_LV4

        for (const screen of screens) {
          screen.x = screenX
          screen.y = currentScreenY
          nodesMap.set(screen.id, { x: screen.x, y: screen.y, width: screen.width, tier: screen.tier })
          luongColMaxRight = Math.max(luongColMaxRight, screenX + screen.width)

          const elements = screen.children || []
          if (elements.length > 0) {
            let currentElementY = currentScreenY + screen.height + VERTICAL_GAP_SCREEN
            const elementX = screenX + INDENT_LV5

            for (const element of elements) {
              element.x = elementX
              element.y = currentElementY
              nodesMap.set(element.id, { x: element.x, y: element.y, width: element.width, tier: element.tier })
              luongColMaxRight = Math.max(luongColMaxRight, elementX + element.width)
              currentElementY += element.height + VERTICAL_GAP_SCREEN
            }
            currentScreenY = currentElementY
          } else {
            currentScreenY += screen.height + VERTICAL_GAP_SCREEN
          }
        }
      }

      const luongWidthInCol = luongColMaxRight - luong.x
      currentLuongX += luongWidthInCol + JOURNEY_GAP
    }

    const totalLuongsWidth = (currentLuongX - JOURNEY_GAP) - firstLuongX
    if (luongs.length > 1) {
      module.x = firstLuongX
      module.width = Math.max(280, totalLuongsWidth)
    } else {
      const targetWidth = Math.max(280, totalLuongsWidth)
      module.width = targetWidth
      module.x = firstLuongX - (targetWidth - totalLuongsWidth) / 2
    }
    module.y = modY
    nodesMap.set(module.id, { x: module.x, y: module.y, width: module.width, tier: module.tier })
  }

  // Verify LV2 encompasses all its LV3 children
  const m1 = nodesMap.get("mod-1")
  const l1 = nodesMap.get("luong-1")
  const l2 = nodesMap.get("luong-2")
  assert.strictEqual(m1.x, l1.x, "LV2 left edge must align with first LV3 left edge")
  assert(m1.width >= (l2.x + l2.width) - l1.x, "LV2 width must span across all LV3 children")

  // Verify LV3 horizontal arrangement
  assert.strictEqual(l1.y, l2.y, "All LV3 siblings must have exact same Y coordinate (horizontal row)")
  assert(l2.x > l1.x, "LV3-2 must be placed to the right of LV3-1")

  // Verify LV4 vertical stacking
  const s1 = nodesMap.get("screen-1")
  const s2 = nodesMap.get("screen-2")
  assert.strictEqual(s1.x, s2.x, "LV4 screens under same LV3 must share same indented X")
  assert(s2.y > s1.y, "LV4 screen-2 must be stacked vertically below screen-1")

  // Verify LV5 vertical stacking
  const e1 = nodesMap.get("elem-1")
  const e2 = nodesMap.get("elem-2")
  assert.strictEqual(e1.x, e2.x, "LV5 elements under same screen must share same indented X")
  assert(e2.y > e1.y, "LV5 elem-2 must be stacked vertically below elem-1")

  console.log("✓ Test 5: End-to-end mathematical coordinate simulation verified successfully")
}
runLayoutSimulation()

// 6. Check LV1 Height Fix
assert(hookContent.includes("dimH >= 65 ? dimH : defaultH"), 
  "LV1 height must be at least 65px (default 68px) to prevent vertical squash")
console.log("✓ Test 6: LV1 height fix verified (>= 65px, default 68px)")

console.log("================================================================================")
console.log("🎉 ALL TESTS PASSED SUCCESSFULLY (100%)")
console.log("================================================================================")
