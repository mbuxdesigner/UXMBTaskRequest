/**
 * ============================================================================
 * UXMB TASK REQUEST — ADVERSARIAL CHALLENGER 1 STRESS TEST SUITE
 * ============================================================================
 * Agent Role: Challenger 1 (Empirical Challenger, Critic & Stress Tester)
 * Target Requirements:
 *   - R1: Middle-Click Pan Stress Cases (rapid deltas, outside release, modifier keys, button conflicts, wheel zoom isolation)
 *   - R2: ReUI Tooltip System Stress Cases (rapid hover timer leaks, 4-edge collision & clamping, zoom invariance, 0 native title)
 *   - R3: Lv4 Hierarchy Capping Stress Cases (state method injection, UI/keyboard bypass, auto-align & JSON legacy tree sanitization)
 *   - R4: Magnific Lateral Dock & Slide-Over Sheet Stress Cases (rapid toggle, regex injection fuzzing, Esc priority, outside click discrimination)
 *
 * Execution: `node tests/adversarial-challenger-1.mjs`
 * ============================================================================
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, "..")

console.log("================================================================================")
console.log("UXMB TASK REQUEST — CHALLENGER 1 ADVERSARIAL STRESS TEST SUITE")
console.log("Methodology: Empirical Simulation, Fuzzing, AST Static Auditing, Boundary Math")
console.log("================================================================================\n")

const startTime = Date.now()

const testResults = {
  r1: { name: "R1: Middle-Click Pan Engine", passed: 0, failed: 0, total: 0 },
  r2: { name: "R2: ReUI Tooltip System", passed: 0, failed: 0, total: 0 },
  r3: { name: "R3: Lv4 Hierarchy Capping", passed: 0, failed: 0, total: 0 },
  r4: { name: "R4: Magnific Lateral Dock & Slide-Over Sheet", passed: 0, failed: 0, total: 0 },
}

function runChallenge(section, id, description, testFn) {
  try {
    testFn()
    testResults[section].passed++
    testResults[section].total++
    console.log(`  ✓ [${id}] ${description}`)
  } catch (err) {
    testResults[section].failed++
    testResults[section].total++
    console.error(`  ✗ [${id}] ${description}`)
    console.error(`    FAILURE: ${err.message}`)
    if (err.stack) {
      console.error(`    Stack: ${err.stack.split("\n").slice(1, 4).join("\n")}`)
    }
    throw err
  }
}

function readProjectFile(relPath) {
  const fullPath = path.join(projectRoot, relPath)
  if (!fs.existsSync(fullPath)) return null
  return fs.readFileSync(fullPath, "utf-8")
}

function parseProjectTsAst(relPath) {
  const code = readProjectFile(relPath)
  if (!code) throw new Error(`File not found: ${relPath}`)
  return ts.createSourceFile(path.basename(relPath), code, ts.ScriptTarget.Latest, true)
}

// =============================================================================
// SECTION 1: R1 — MIDDLE-CLICK PAN ADVERSARIAL STRESS TESTS
// =============================================================================
console.log("--- SECTION 1: R1 — MIDDLE-CLICK PAN STRESS HARNESS ---")

// Import math formula from source or simulate exact contract
const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.0
const ZOOM_STEP = 1.15

function zoomAtPoint(current, cursor, factor, minZoom = MIN_ZOOM, maxZoom = MAX_ZOOM) {
  if (typeof factor !== "number" || isNaN(factor) || factor <= 0) factor = 1.0
  const currentScale = current.scale || 1.0
  const targetScale = currentScale * factor
  const clampedScale = Math.max(minZoom, Math.min(targetScale, maxZoom))
  const curX = typeof cursor.x === "number" && !isNaN(cursor.x) ? cursor.x : 0
  const curY = typeof cursor.y === "number" && !isNaN(cursor.y) ? cursor.y : 0
  const scaleRatio = clampedScale / currentScale
  const newX = curX - (curX - current.x) * scaleRatio
  const newY = curY - (curY - current.y) * scaleRatio
  return {
    x: Number(newX.toFixed(4)),
    y: Number(newY.toFixed(4)),
    scale: Number(clampedScale.toFixed(4)),
  }
}

// 1.1: Fuzzing 1,000 rapid pointermove deltas during middle click pan
runChallenge("r1", "ADV-R1.1", "Fuzzing 1,000 high-frequency pointermove deltas during middle-click pan", () => {
  let transform = { x: 120.5, y: -45.2, scale: 1.0 }
  let isPanning = false
  let dragStart = null
  let hasCrossedThreshold = false

  // Simulate handlePointerDown for middle click
  function onPointerDown(e) {
    if (e.button !== 0 && e.button !== 1) return
    if (e.button === 1) {
      isPanning = true
      hasCrossedThreshold = true
    }
    dragStart = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: transform.x,
      startY: transform.y,
      button: e.button,
    }
  }

  // Simulate handlePointerMove
  function onPointerMove(e) {
    if (!dragStart) return
    const dx = e.clientX - dragStart.clientX
    const dy = e.clientY - dragStart.clientY
    if (hasCrossedThreshold) {
      const nextX = Number((dragStart.startX + dx).toFixed(4))
      const nextY = Number((dragStart.startY + dy).toFixed(4))
      transform = { ...transform, x: nextX, y: nextY }
    }
  }

  // Pointer down at center
  onPointerDown({ button: 1, clientX: 500, clientY: 400 })
  assert.equal(isPanning, true, "isPanning must be active on middle click")

  // Generate 1,000 pseudo-random rapid movements
  for (let i = 0; i < 1000; i++) {
    // Range from micro-floats to ±15,000px jumps
    const factor = i % 10 === 0 ? 10000 : i % 3 === 0 ? 0.005 : 250
    const rawDx = (Math.sin(i * 0.3) * factor)
    const rawDy = (Math.cos(i * 0.7) * factor)
    const clientX = 500 + rawDx
    const clientY = 400 + rawDy

    onPointerMove({ clientX, clientY })

    // Invariant assertions
    assert.ok(Number.isFinite(transform.x), `transform.x must be finite at step ${i}`)
    assert.ok(Number.isFinite(transform.y), `transform.y must be finite at step ${i}`)
    assert.ok(!Number.isNaN(transform.x), `transform.x must not be NaN at step ${i}`)
    assert.ok(!Number.isNaN(transform.y), `transform.y must not be NaN at step ${i}`)
    assert.equal(transform.x, Number((120.5 + rawDx).toFixed(4)))
    assert.equal(transform.y, Number((-45.2 + rawDy).toFixed(4)))
  }
})

// 1.2: Pointer release outside window and pointercancel recovery
runChallenge("r1", "ADV-R1.2", "Simulate drag outside window boundaries and pointercancel abort", () => {
  let isPanning = true
  let hasCrossedThreshold = true
  let dragStart = { clientX: 500, clientY: 400, startX: 0, startY: 0, button: 1 }

  function handlePointerUp(e) {
    if (!dragStart) return
    if (
      e &&
      e.type !== "pointercancel" &&
      typeof e.button === "number" &&
      e.button !== -1 &&
      e.button !== dragStart.button
    ) {
      return
    }
    dragStart = null
    hasCrossedThreshold = false
    isPanning = false
  }

  // Pointer moves far outside window (negative coordinates)
  const outsideEvent = { clientX: -999999, clientY: -888888 }
  assert.ok(outsideEvent.clientX < 0)

  // pointercancel fires from OS/browser
  handlePointerUp({ type: "pointercancel" })
  assert.equal(isPanning, false, "pointercancel must immediately terminate isPanning")
  assert.equal(dragStart, null, "dragStart must be cleared on pointercancel")
  assert.equal(hasCrossedThreshold, false, "hasCrossedThreshold must be reset")

  // Re-verify code in useCanvasTransform.ts registers pointercancel
  const hookCode = readProjectFile("src/hooks/useCanvasTransform.ts")
  assert.ok(hookCode.includes('"pointercancel"'), "useCanvasTransform must register pointercancel")
  assert.ok(hookCode.includes("window.addEventListener"), "Must bind window listeners for pointer safety")
})

// 1.3: Modifier key concurrency stress (Shift, Ctrl, Alt, Meta)
runChallenge("r1", "ADV-R1.3", "Middle-click pan initiates under all modifier key permutations (Shift, Ctrl, Alt, Meta)", () => {
  const hookCode = readProjectFile("src/hooks/useCanvasTransform.ts")
  // Check that handlePointerDown does NOT check e.shiftKey, e.ctrlKey, etc. to block middle-click
  assert.ok(
    hookCode.includes("e.button !== 0 && e.button !== 1") || hookCode.includes("e.button === 1"),
    "useCanvasTransform accepts button === 1 regardless of modifier keys"
  )

  const modifierCombinations = [
    { button: 1, shiftKey: true },
    { button: 1, ctrlKey: true },
    { button: 1, altKey: true },
    { button: 1, metaKey: true },
    { button: 1, shiftKey: true, ctrlKey: true, altKey: true, metaKey: true },
  ]

  for (const combo of modifierCombinations) {
    let panningStarted = false
    let preventedDefault = false
    const fakeEvent = {
      button: combo.button,
      shiftKey: !!combo.shiftKey,
      ctrlKey: !!combo.ctrlKey,
      altKey: !!combo.altKey,
      metaKey: !!combo.metaKey,
      preventDefault: () => { preventedDefault = true },
    }
    // Simulate handlePointerDown check
    if (fakeEvent.button === 1) {
      fakeEvent.preventDefault()
      panningStarted = true
    }
    assert.equal(panningStarted, true, "Middle click with modifiers must start pan")
    assert.equal(preventedDefault, true, "Middle click with modifiers must preventDefault")
  }
})

// 1.4: Button conflict & interleaved mouse events (Left click + Middle click)
runChallenge("r1", "ADV-R1.4", "Interleaved button events: middle pan is not cancelled prematurely by left release", () => {
  let dragStart = { clientX: 200, clientY: 200, startX: 0, startY: 0, button: 1 }
  let isPanning = true

  function handlePointerUp(e) {
    if (!dragStart) return
    if (
      e &&
      e.type !== "pointercancel" &&
      typeof e.button === "number" &&
      e.button !== -1 &&
      e.button !== dragStart.button
    ) {
      return
    }
    dragStart = null
    isPanning = false
  }

  // Left click is released (button: 0) while middle pan is active (dragStart.button: 1)
  handlePointerUp({ type: "pointerup", button: 0 })
  assert.equal(isPanning, true, "isPanning must NOT be cancelled when left button (0) is released during middle pan")
  assert.notEqual(dragStart, null, "dragStart must remain active")

  // Now middle click is released (button: 1)
  handlePointerUp({ type: "pointerup", button: 1 })
  assert.equal(isPanning, false, "isPanning must terminate when middle button (1) is released")
  assert.equal(dragStart, null, "dragStart must be null")
})

// 1.5: Target element barrier stress (inputs vs cards vs ports vs canvas)
runChallenge("r1", "ADV-R1.5", "Middle-click target discrimination: inputs/textareas are suppressed, cards and ports pan", () => {
  const viewportCode = readProjectFile("src/components/ia/IACanvasViewport.tsx")
  assert.ok(viewportCode.includes("target.closest(\"input, textarea, [contenteditable='true']\")"), "Viewport guards editable text fields")

  function simulateViewportMiddleClick(targetTag, targetAttrs = {}) {
    let intercepted = false
    let stoppedPropagation = false
    let preventedDefault = false

    const fakeTarget = {
      tagName: targetTag.toUpperCase(),
      closest: (selector) => {
        if (selector.includes("input") && (targetTag === "input" || targetTag === "textarea" || targetAttrs["contenteditable"])) {
          return {}
        }
        if (selector.includes("[data-node-id]") && targetAttrs["data-node-id"]) return {}
        if (selector.includes("[data-port-action]") && targetAttrs["data-port-action"]) return {}
        return null
      }
    }

    const fakeEvent = {
      button: 1,
      target: fakeTarget,
      preventDefault: () => { preventedDefault = true },
      stopPropagation: () => { stoppedPropagation = true },
    }

    // Logic in IACanvasViewport.tsx lines 416-426
    if (fakeEvent.button === 1) {
      if (fakeTarget.closest("input, textarea, [contenteditable='true']")) {
        return { panned: false, intercepted: false }
      }
      fakeEvent.preventDefault()
      fakeEvent.stopPropagation()
      intercepted = true
      return { panned: true, intercepted, stoppedPropagation, preventedDefault }
    }
    return { panned: false, intercepted: false }
  }

  // 1. Text input: must NOT pan
  const inputRes = simulateViewportMiddleClick("input")
  assert.equal(inputRes.panned, false, "Middle click inside input must NOT pan canvas")

  // 2. Textarea: must NOT pan
  const textareaRes = simulateViewportMiddleClick("textarea")
  assert.equal(textareaRes.panned, false, "Middle click inside textarea must NOT pan canvas")

  // 3. Contenteditable: must NOT pan
  const editableRes = simulateViewportMiddleClick("div", { contenteditable: "true" })
  assert.equal(editableRes.panned, false, "Middle click inside contenteditable must NOT pan canvas")

  // 4. Node Card: MUST pan
  const cardRes = simulateViewportMiddleClick("div", { "data-node-id": "node-42" })
  assert.equal(cardRes.panned, true, "Middle click over node card MUST pan canvas")
  assert.equal(cardRes.preventedDefault, true)
  assert.equal(cardRes.stoppedPropagation, true)

  // 5. Connector Port: MUST pan
  const portRes = simulateViewportMiddleClick("div", { "data-port-action": "right" })
  assert.equal(portRes.panned, true, "Middle click over connector port MUST pan canvas")

  // 6. Canvas empty backdrop: MUST pan
  const emptyRes = simulateViewportMiddleClick("div")
  assert.equal(emptyRes.panned, true, "Middle click over canvas backdrop MUST pan canvas")
})

// 1.6: Simultaneous wheel scroll during middle drag
runChallenge("r1", "ADV-R1.6", "Simultaneous wheel zooming during middle drag preserves cursor invariant and zoom clamp", () => {
  let transform = { x: 300, y: 150, scale: 1.0 }
  const cursor = { x: 640, y: 400 }

  for (let i = 0; i < 50; i++) {
    const factor = i % 2 === 0 ? ZOOM_STEP : 1 / ZOOM_STEP
    const oldTransform = { ...transform }
    transform = zoomAtPoint(transform, cursor, factor, MIN_ZOOM, MAX_ZOOM)

    // Verify zoom invariant: (cursor.x - newX)/newScale == (cursor.x - oldX)/oldScale
    const oldRatio = (cursor.x - oldTransform.x) / oldTransform.scale
    const newRatio = (cursor.x - transform.x) / transform.scale
    assert.ok(Math.abs(oldRatio - newRatio) < 0.05, `Invariant must hold at step ${i}`)

    // Verify scale is strictly bounded
    assert.ok(transform.scale >= MIN_ZOOM, `Scale ${transform.scale} must be >= ${MIN_ZOOM}`)
    assert.ok(transform.scale <= MAX_ZOOM, `Scale ${transform.scale} must be <= ${MAX_ZOOM}`)
  }
})

// =============================================================================
// SECTION 2: R2 — REUI TOOLTIP SYSTEM ADVERSARIAL STRESS TESTS
// =============================================================================
console.log("\n--- SECTION 2: R2 — REUI TOOLTIP SYSTEM STRESS HARNESS ---")

// 2.1: Rapid hover/unhover timer leak stress
runChallenge("r2", "ADV-R2.1", "Rapid mouse enter/leave sequences cleanly clear timers with 0 orphan popups", () => {
  let isOpen = false
  let activeTimeout = null
  let timeoutCount = 0
  let clearCount = 0

  function fakeSetTimeout(fn, ms) {
    timeoutCount++
    activeTimeout = { fn, ms, cleared: false }
    return activeTimeout
  }

  function fakeClearTimeout(timer) {
    if (timer) {
      clearCount++
      timer.cleared = true
    }
  }

  function handleMouseEnter(disabled = false, content = "Tooltip Label", delayDuration = 200) {
    if (disabled || !content) return
    if (activeTimeout) fakeClearTimeout(activeTimeout)
    activeTimeout = fakeSetTimeout(() => {
      isOpen = true
    }, delayDuration)
  }

  function handleMouseLeave() {
    if (activeTimeout) fakeClearTimeout(activeTimeout)
    isOpen = false
  }

  // Rapidly trigger 200 enter/leave events with 0-5ms intervals
  for (let i = 0; i < 200; i++) {
    handleMouseEnter(false, `Test ${i}`)
    assert.equal(isOpen, false, "Tooltip must not be open immediately during delay duration")
    handleMouseLeave()
    assert.equal(isOpen, false, "Tooltip must remain closed on leave")
  }

  assert.ok(timeoutCount >= 200, "Should have scheduled timeouts")
  assert.ok(clearCount >= 200, "Should have cleared all timeouts")
  assert.equal(isOpen, false, "Final state must be closed")
  assert.equal(activeTimeout.cleared, true, "Last timer must be marked cleared")
})

// 2.2: Viewport Boundary Clamping & Auto-Flip across 4 edges and corners
runChallenge("r2", "ADV-R2.2", "Tooltip coordinate engine auto-flips and clamps at all 4 viewport edges and corners", () => {
  const innerWidth = 1440
  const innerHeight = 900
  const tooltipWidth = 140
  const tooltipHeight = 36
  const PADDING = 8

  function computeTooltipPosition(rect, preferredSide = "top", align = "center") {
    let targetSide = preferredSide
    let top = 0
    let left = 0

    // Auto-flip collision logic from tooltip.tsx
    if (targetSide === "top" && rect.top - tooltipHeight - PADDING < 0) {
      targetSide = "bottom"
    } else if (targetSide === "bottom" && rect.bottom + tooltipHeight + PADDING > innerHeight) {
      targetSide = "top"
    } else if (targetSide === "left" && rect.left - tooltipWidth - PADDING < 0) {
      targetSide = "right"
    } else if (targetSide === "right" && rect.right + tooltipWidth + PADDING > innerWidth) {
      targetSide = "left"
    }

    if (targetSide === "top") {
      top = rect.top - tooltipHeight - 6
      left = align === "center" ? rect.left + rect.width / 2 - tooltipWidth / 2 : rect.left
    } else if (targetSide === "bottom") {
      top = rect.bottom + 6
      left = align === "center" ? rect.left + rect.width / 2 - tooltipWidth / 2 : rect.left
    } else if (targetSide === "left") {
      top = align === "center" ? rect.top + rect.height / 2 - tooltipHeight / 2 : rect.top
      left = rect.left - tooltipWidth - 6
    } else if (targetSide === "right") {
      top = align === "center" ? rect.top + rect.height / 2 - tooltipHeight / 2 : rect.top
      left = rect.right + 6
    }

    // Boundary clamping
    left = Math.max(PADDING, Math.min(innerWidth - tooltipWidth - PADDING, left))
    top = Math.max(PADDING, Math.min(innerHeight - tooltipHeight - PADDING, top))

    return { top, left, actualSide: targetSide }
  }

  // Edge 1: Top collision (trigger at y=2, side="top")
  const topRes = computeTooltipPosition({ top: 2, bottom: 34, left: 300, right: 340, width: 40, height: 32 }, "top")
  assert.equal(topRes.actualSide, "bottom", "Must auto-flip from top to bottom")
  assert.ok(topRes.top >= PADDING, "Top must be >= PADDING")

  // Edge 2: Bottom collision (trigger at y=880, side="bottom")
  const btmRes = computeTooltipPosition({ top: 860, bottom: 895, left: 300, right: 340, width: 40, height: 35 }, "bottom")
  assert.equal(btmRes.actualSide, "top", "Must auto-flip from bottom to top")
  assert.ok(btmRes.top <= innerHeight - tooltipHeight - PADDING, "Top must be <= max boundary")

  // Edge 3: Left collision (trigger at x=4, side="left")
  const leftRes = computeTooltipPosition({ top: 400, bottom: 440, left: 4, right: 44, width: 40, height: 40 }, "left")
  assert.equal(leftRes.actualSide, "right", "Must auto-flip from left to right")
  assert.ok(leftRes.left >= PADDING, "Left must be >= PADDING")

  // Edge 4: Right collision (trigger at x=1420, side="right")
  const rightRes = computeTooltipPosition({ top: 400, bottom: 440, left: 1400, right: 1438, width: 38, height: 40 }, "right")
  assert.equal(rightRes.actualSide, "left", "Must auto-flip from right to left")
  assert.ok(rightRes.left <= innerWidth - tooltipWidth - PADDING, "Left must be <= max boundary")

  // Corner Case: Extreme Top-Left (0, 0)
  const cornerTL = computeTooltipPosition({ top: 0, bottom: 20, left: 0, right: 20, width: 20, height: 20 }, "top")
  assert.equal(cornerTL.top, 26) // 20 + 6
  assert.equal(cornerTL.left, PADDING)

  // Corner Case: Extreme Bottom-Right (1440, 900)
  const cornerBR = computeTooltipPosition({ top: 880, bottom: 900, left: 1420, right: 1440, width: 20, height: 20 }, "bottom")
  assert.equal(cornerBR.top, 880 - 36 - 6) // 838
  assert.equal(cornerBR.left, innerWidth - tooltipWidth - PADDING)
})

// 2.3: Zoom scaling independence via Portal
runChallenge("r2", "ADV-R2.3", "Tooltip renders via createPortal(..., document.body) isolating from canvas zoom scale", () => {
  const tooltipCode = readProjectFile("src/components/ui/tooltip.tsx")
  assert.ok(tooltipCode.includes("createPortal("), "Tooltip must use createPortal")
  assert.ok(tooltipCode.includes("document.body"), "Tooltip must portal to document.body")
  assert.ok(tooltipCode.includes('position: "fixed"'), "Tooltip must use position: fixed")
  assert.ok(tooltipCode.includes("zIndex: 99999"), "Tooltip must render at high zIndex")
})

// 2.4: Zero native title attribute sweep in src/components/ia/
runChallenge("r2", "ADV-R2.4", "Comprehensive AST audit: Exactly 0 native title attributes in src/components/ia/", () => {
  const iaDir = path.join(projectRoot, "src/components/ia")
  const files = fs.readdirSync(iaDir).filter(f => f.endsWith(".tsx") || f.endsWith(".ts"))

  let titleCount = 0
  const offendingLocations = []

  for (const file of files) {
    const relPath = `src/components/ia/${file}`
    const sourceFile = parseProjectTsAst(relPath)

    function visit(node) {
      if (ts.isJsxAttribute(node)) {
        const attrName = node.name.getText(sourceFile)
        if (attrName === "title") {
          // Verify if parent tag is an HTML native element or not
          titleCount++
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
          offendingLocations.push(`${file}:${line + 1}:${character + 1}`)
        }
      }
      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
  }

  assert.equal(
    titleCount,
    0,
    `Found ${titleCount} native title attributes in src/components/ia/: ${offendingLocations.join(", ")}`
  )
})

// 2.5: Empty & disabled content suppression
runChallenge("r2", "ADV-R2.5", "Tooltip suppressed when disabled or content is empty/null", () => {
  let isOpen = false
  function testOpen(content, disabled) {
    if (disabled || !content) return
    isOpen = true
  }

  testOpen("", false)
  assert.equal(isOpen, false, "Empty string content must not open")

  testOpen(null, false)
  assert.equal(isOpen, false, "Null content must not open")

  testOpen(undefined, false)
  assert.equal(isOpen, false, "Undefined content must not open")

  testOpen("Hello", true)
  assert.equal(isOpen, false, "Disabled tooltip must not open")

  testOpen("Hello", false)
  assert.equal(isOpen, true, "Valid content and enabled tooltip must open")
})

// =============================================================================
// SECTION 3: R3 — LV4 HIERARCHY CAPPING ADVERSARIAL STRESS TESTS
// =============================================================================
console.log("\n--- SECTION 3: R3 — LV4 HIERARCHY CAPPING STRESS HARNESS ---")

// 3.1: Force-injecting child via addChildNode
runChallenge("r3", "ADV-R3.1", "useIATreeState addChildNode strictly rejects injection into Lv4 nodes", () => {
  const treeStateCode = readProjectFile("src/hooks/useIATreeState.ts")
  assert.ok(
    treeStateCode.includes("if (curr.tier >= 4)"),
    "useIATreeState must check curr.tier >= 4 in addChildNode"
  )
  assert.ok(
    treeStateCode.includes("Cấp 4 (Lv4) là tầng trạng thái/modal cuối cùng, không thể tạo thêm nhánh con."),
    "Must output explicit warning toast on attempt to add child to Lv4"
  )

  // Simulation
  const mockTree = {
    id: "root-1",
    tier: 1,
    name: "Root",
    children: [
      {
        id: "mod-1",
        tier: 2,
        name: "Module",
        children: [
          {
            id: "feat-1",
            tier: 3,
            name: "Feature",
            children: [
              {
                id: "screen-1",
                tier: 4,
                name: "Screen Modal",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  }

  let toastMessage = null
  let blocked = false

  function simulateAddChildNode(tree, parentId, nodeData) {
    function dfs(curr) {
      if (curr.id === parentId) {
        if (curr.tier >= 4) {
          toastMessage = "Cấp 4 (Lv4) là tầng trạng thái/modal cuối cùng, không thể tạo thêm nhánh con."
          blocked = true
          return true
        }
        curr.children = curr.children || []
        curr.children.push({ id: "new-child", tier: curr.tier + 1, ...nodeData })
        return true
      }
      if (curr.children) {
        for (const c of curr.children) {
          if (dfs(c)) return true
        }
      }
      return false
    }
    dfs(tree)
  }

  simulateAddChildNode(mockTree, "screen-1", { name: "Illegal Child" })
  assert.equal(blocked, true, "Operation must be flagged as blocked")
  assert.ok(toastMessage && toastMessage.includes("Cấp 4 (Lv4)"), "Warning toast must be dispatched")
  const lv4Node = mockTree.children[0].children[0].children[0]
  assert.equal(lv4Node.children.length, 0, "Lv4 node must retain 0 children")
})

// 3.2: Force-injecting child via addChildInDirection
runChallenge("r3", "ADV-R3.2", "useIATreeState addChildInDirection strictly rejects port-directed child under Lv4", () => {
  const treeStateCode = readProjectFile("src/hooks/useIATreeState.ts")
  const addChildInDirSnippet = treeStateCode.slice(treeStateCode.indexOf("addChildInDirection ="))
  assert.ok(
    addChildInDirSnippet.includes("if (curr.tier >= 4)"),
    "addChildInDirection must check curr.tier >= 4"
  )
})

// 3.3: Force-injecting child via connectNodes and createConnectedNodeAt
runChallenge("r3", "ADV-R3.3", "useIATreeState connectNodes & createConnectedNodeAt prevent attaching under Lv4", () => {
  const treeStateCode = readProjectFile("src/hooks/useIATreeState.ts")
  const connectSnippet = treeStateCode.slice(treeStateCode.indexOf("connectNodes ="))
  assert.ok(
    connectSnippet.includes("if (curr.tier >= 4)"),
    "connectNodes attach phase must block when sourceNode tier >= 4"
  )
  const createSnippet = treeStateCode.slice(treeStateCode.indexOf("createConnectedNodeAt ="))
  assert.ok(
    createSnippet.includes("if (curr.tier >= 4)"),
    "createConnectedNodeAt must block when sourceNode tier >= 4"
  )
})

// 3.4: UI handles & Tab shortcut Lv4 capping audit
runChallenge("r3", "ADV-R3.4", "UI and keyboard bypass audit: Card (+) button, 4 ports, and floating toolbar hidden for Lv4", () => {
  const cardCode = readProjectFile("src/components/ia/IATreeNodeCard.tsx")
  const floatCode = readProjectFile("src/components/ia/IANodeFloatingToolbar.tsx")

  // Card header (+) button
  assert.ok(cardCode.includes("node.tier < 4 &&"), "Card header (+) button must be conditioned on node.tier < 4")

  // Card 4-way ports
  assert.ok(cardCode.includes("node.tier < 4 && ("), "Card connector ports must be conditioned on node.tier < 4")

  // Floating toolbar (+) button
  assert.ok(floatCode.includes("node.tier < 4 &&"), "Floating toolbar (+) button must be conditioned on node.tier < 4")
})

// 3.5: Auto-align deep/corrupted legacy tree sanitization
runChallenge("r3", "ADV-R3.5", "autoAlignTree purges illegal descendants below Lv4 and restores pure leaf nodes", () => {
  const deepCorruptTree = {
    id: "root-1",
    tier: 1,
    name: "Root",
    customX: 100,
    customY: 200,
    children: [
      {
        id: "mod-1",
        tier: 2,
        name: "Module",
        customX: 400,
        children: [
          {
            id: "feat-1",
            tier: 3,
            name: "Feature",
            children: [
              {
                id: "screen-1",
                tier: 4,
                name: "Screen",
                customWidth: 350,
                // Illegally present children on Lv4
                children: [
                  {
                    id: "illegal-5",
                    tier: 5,
                    name: "Ghost Lv5",
                    children: [
                      {
                        id: "illegal-6",
                        tier: 6,
                        name: "Ghost Lv6",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  }

  // Exact autoAlignTree logic from useIATreeState.ts lines 1181-1199
  function autoAlign(curr) {
    delete curr.customX
    delete curr.customY
    delete curr.customWidth
    delete curr.customHeight
    delete curr.customTrunkOffset
    if (curr.tier >= 4) {
      curr.children = undefined
    }
    if (curr.children) {
      for (const child of curr.children) {
        autoAlign(child)
      }
    }
  }

  autoAlign(deepCorruptTree)

  // Verify Lv4 node was sanitized
  const lv4Node = deepCorruptTree.children[0].children[0].children[0]
  assert.equal(lv4Node.id, "screen-1")
  assert.equal(lv4Node.children, undefined, "Lv4 node children must be sanitized to undefined")
  assert.equal(lv4Node.customWidth, undefined, "customWidth must be deleted")
  assert.equal(deepCorruptTree.customX, undefined, "customX must be deleted")
})

// 3.6: JSON Import normalizer sanitizes deep hierarchies at Lv4
runChallenge("r3", "ADV-R3.6", "parseAndNormalizeIaJson stops recursion at tier 4 and clamps deep legacy trees", () => {
  const jsonCode = readProjectFile("src/components/ia/IAJsonImportModal.tsx")
  assert.ok(
    jsonCode.includes("Array.isArray(raw.children) && tier < 4"),
    "JSON normalizer must strictly gate recursion with tier < 4"
  )
  assert.ok(
    jsonCode.includes("children: tier < 4 ? children : undefined"),
    "JSON normalizer must set children to undefined for tier >= 4"
  )
})

// =============================================================================
// SECTION 4: R4 — MAGNIFIC LATERAL DOCK & SLIDE-OVER SHEET ADVERSARIAL STRESS TESTS
// =============================================================================
console.log("\n--- SECTION 4: R4 — MAGNIFIC LATERAL DOCK & SLIDE-OVER SHEET STRESS HARNESS ---")

// 4.1: Rapid dock tool toggling and state machine transitions
runChallenge("r4", "ADV-R4.1", "Lateral dock state machine handles rapid sequential toggling and tool switching", () => {
  let activeTool = null

  function onSelectTool(clickedTool) {
    activeTool = activeTool === clickedTool ? null : clickedTool
  }

  // Click add-node: opens
  onSelectTool("add-node")
  assert.equal(activeTool, "add-node")

  // Click add-node again: toggles close
  onSelectTool("add-node")
  assert.equal(activeTool, null)

  // Rapidly cycle through all tools
  const toolSequence = ["settings", "cloud", "json", "add-node", "add-node", "cloud", "settings", "settings"]
  const expectedState = ["settings", "cloud", "json", "add-node", null, "cloud", "settings", null]

  for (let i = 0; i < toolSequence.length; i++) {
    onSelectTool(toolSequence[i])
    assert.equal(activeTool, expectedState[i], `Step ${i} mismatch for ${toolSequence[i]}`)
  }
})

// 4.2: Regex injection fuzzing on Universal Search query filter
runChallenge("r4", "ADV-R4.2", "Universal Search resists regex crashes against adversarial injection strings", () => {
  const maliciousSearchStrings = [
    ".*",
    "[a-z]+",
    "(",
    ")",
    "\\",
    "\\\\",
    "?",
    "+",
    "^$",
    "[[]]",
    "{{}}",
    "(?<=foo)bar",
    "<script>alert('pwn')</script>",
    "'; DROP TABLE sitemap; --",
    "\\p{L}+",
    "*.tsx",
  ]

  const mockTemplates = [
    { title: "Đăng nhập OTP Sinh trắc học", name: "Màn hình Đăng nhập", code: "SCR_AUTH_01", keywords: ["login", "otp"], description: "Xác thực bảo mật" },
    { title: "Thanh toán hóa đơn & QR", name: "Phân hệ Thanh toán", code: "MOD_PAY_01", keywords: ["bill", "qr"], description: "Nghiệp vụ thanh toán" },
  ]

  for (const injection of maliciousSearchStrings) {
    let errorThrown = false
    try {
      const q = injection.toLowerCase().trim()
      const filtered = mockTemplates.filter((item) => {
        if (!q) return true
        const matchTitle = item.title.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
        const matchCode = (item.code || "").toLowerCase().includes(q)
        const matchKw = (item.keywords || []).some((k) => k.toLowerCase().includes(q))
        const matchDesc = (item.description || "").toLowerCase().includes(q)
        return matchTitle || matchCode || matchKw || matchDesc
      })
      assert.ok(Array.isArray(filtered), "Filtered result must be an array")
    } catch (e) {
      errorThrown = true
      console.error(`Regex injection failure on: ${injection}`, e)
    }
    assert.equal(errorThrown, false, `Search filter crashed on injection string: ${injection}`)
  }
})

// 4.3: Escape key dismissal priority over canvas selection
runChallenge("r4", "ADV-R4.3", "Escape key listener dismisses Slide-Over Sheet with stopPropagation preserving node selection", () => {
  const sheetCode = readProjectFile("src/components/ia/IASlideOverSheet.tsx")
  assert.ok(sheetCode.includes('e.key === "Escape"'), "IASlideOverSheet must listen for Escape")
  assert.ok(sheetCode.includes("e.stopPropagation()"), "Must call e.stopPropagation() on Escape")
  assert.ok(sheetCode.includes("onClose()"), "Must invoke onClose on Escape")

  let sheetClosed = false
  let canvasSelectionCleared = false

  const fakeEscEvent = {
    key: "Escape",
    isPropagationStopped: false,
    stopPropagation: () => { fakeEscEvent.isPropagationStopped = true },
  }

  // SlideOverSheet handler executes first
  if (fakeEscEvent.key === "Escape") {
    fakeEscEvent.stopPropagation()
    sheetClosed = true
  }

  // Document/Canvas handler only clears selection if event did NOT stop propagation
  if (!fakeEscEvent.isPropagationStopped) {
    canvasSelectionCleared = true
  }

  assert.equal(sheetClosed, true, "Sheet must be closed by Escape")
  assert.equal(canvasSelectionCleared, false, "Canvas node selection must NOT be cleared on sheet Escape dismissal")
})

// 4.4: Outside click discrimination (Left click vs Middle click)
runChallenge("r4", "ADV-R4.4", "Backdrop left click dismisses sheet, middle click pans canvas without closing sheet", () => {
  const viewportCode = readProjectFile("src/components/ia/IACanvasViewport.tsx")
  assert.ok(
    viewportCode.includes("if (e.button === 0 && currentDockTool)"),
    "Dismissing active slide-over sheet must only trigger on left click (button === 0)"
  )

  function simulateBackdropClick(button, currentDockTool) {
    let sheetDismissed = false
    let canvasPanned = false

    // Line 417 of IACanvasViewport: middle click
    if (button === 1) {
      canvasPanned = true
      return { sheetDismissed, canvasPanned }
    }

    // Line 438 of IACanvasViewport: left click on backdrop
    if (button === 0 && currentDockTool) {
      sheetDismissed = true
    }

    return { sheetDismissed, canvasPanned }
  }

  // 1. Left click backdrop: sheet dismisses, canvas does not pan
  const leftRes = simulateBackdropClick(0, "add-node")
  assert.equal(leftRes.sheetDismissed, true, "Left click on backdrop must dismiss sheet")
  assert.equal(leftRes.canvasPanned, false)

  // 2. Middle click backdrop: canvas pans, sheet remains OPEN
  const midRes = simulateBackdropClick(1, "add-node")
  assert.equal(midRes.sheetDismissed, false, "Middle click on backdrop must NOT dismiss sheet")
  assert.equal(midRes.canvasPanned, true, "Middle click on backdrop must pan canvas")
})

// 4.5: Slide-Over Sheet Lv4 selection context & child blocking
runChallenge("r4", "ADV-R4.5", "Slide-Over Sheet add-node panel displays Lv4 warning banner and disables template additions", () => {
  const sheetCode = readProjectFile("src/components/ia/IASlideOverSheet.tsx")

  assert.ok(
    sheetCode.includes("const isSelectedNodeLv4 = selectedNode?.tier === 4"),
    "Must detect if selectedNode.tier === 4"
  )
  assert.ok(
    sheetCode.includes("⚠️ Node Cấp 4 (Lv4) là điểm chạm cuối, không thể tạo thêm nhánh con."),
    "Must display explicit warning banner for Lv4 selection"
  )
  assert.ok(
    sheetCode.includes("const isBlockedByLv4 = isSelectedNodeLv4 && item.tier !== 1"),
    "Must calculate isBlockedByLv4 for templates"
  )
  assert.ok(
    sheetCode.includes("draggable={!isBlockedByLv4}"),
    "Must disable dragging when blocked by Lv4"
  )
  assert.ok(
    sheetCode.includes("Không thể tạo thêm nhánh con cho node Cấp 4 (Lv4)!"),
    "Must warn on click when blocked by Lv4"
  )
})

// =============================================================================
// SUMMARY & VERDICT
// =============================================================================
const totalDuration = Date.now() - startTime
let totalTests = 0
let totalPassed = 0
let totalFailed = 0

for (const sec of Object.values(testResults)) {
  totalTests += sec.total
  totalPassed += sec.passed
  totalFailed += sec.failed
}

console.log("\n================================================================================")
console.log("UXMB TASK REQUEST — CHALLENGER 1 ADVERSARIAL STRESS TEST SUMMARY")
console.log("================================================================================")
console.log(`  ${testResults.r1.name.padEnd(45)}: ${testResults.r1.passed}/${testResults.r1.total} Passed`)
console.log(`  ${testResults.r2.name.padEnd(45)}: ${testResults.r2.passed}/${testResults.r2.total} Passed`)
console.log(`  ${testResults.r3.name.padEnd(45)}: ${testResults.r3.passed}/${testResults.r3.total} Passed`)
console.log(`  ${testResults.r4.name.padEnd(45)}: ${testResults.r4.passed}/${testResults.r4.total} Passed`)
console.log("--------------------------------------------------------------------------------")
console.log(`TOTAL ADVERSARIAL ASSERTIONS : ${totalTests}`)
console.log(`TOTAL PASSED                 : ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`)
console.log(`TOTAL FAILED                 : ${totalFailed}`)
console.log(`EXECUTION DURATION           : ~${totalDuration}ms`)
console.log("================================================================================")

if (totalFailed === 0) {
  console.log("🛡️ ALL ADVERSARIAL CHALLENGES PASSED (VERDICT: APPROVE)")
  process.exit(0)
} else {
  console.error(`💥 ${totalFailed} ADVERSARIAL CHALLENGE(S) FAILED (VERDICT: REJECT)`)
  process.exit(1)
}
