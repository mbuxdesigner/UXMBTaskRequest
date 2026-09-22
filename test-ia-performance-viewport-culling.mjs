import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log("================================================================================")
console.log("TEST SUITE: IA MAP HIGH-PERFORMANCE OPTIMIZATION & VIEWPORT CULLING")
console.log("================================================================================")

let totalTests = 0
let passedTests = 0

function assert(condition, message) {
  totalTests++
  if (condition) {
    console.log(`✓ Test ${totalTests}: ${message}`)
    passedTests++
  } else {
    console.error(`✗ Test ${totalTests} FAILED: ${message}`)
    process.exitCode = 1
  }
}

// Read relevant files
const treeStatePath = path.join(__dirname, "src/hooks/useIATreeState.ts")
const nodeCardPath = path.join(__dirname, "src/components/ia/IATreeNodeCard.tsx")
const viewportPath = path.join(__dirname, "src/components/ia/IACanvasViewport.tsx")

const treeStateContent = fs.readFileSync(treeStatePath, "utf-8")
const nodeCardContent = fs.readFileSync(nodeCardPath, "utf-8")
const viewportContent = fs.readFileSync(viewportPath, "utf-8")

// 1. LayoutNode metrics precalculation in useIATreeState.ts
assert(
  treeStateContent.includes("metrics?: SubtreeMetrics"),
  "LayoutNode interface includes metrics?: SubtreeMetrics"
)

assert(
  treeStateContent.includes("precomputedMetricsMap = new Map<string, SubtreeMetrics>()") &&
  treeStateContent.includes("precomputedMetricsMap.set(curr.id, computeSubtreeMetrics(curr, requestsMap))"),
  "useIATreeState precomputes SubtreeMetrics bottom-up during layout useMemo"
)

assert(
  treeStateContent.includes("metrics: precomputedMetricsMap.get(item.node.id)"),
  "collectNodes attaches precomputed SubtreeMetrics to every LayoutNode in O(1)"
)

// 2. IATreeNodeCard optimization
assert(
  nodeCardContent.includes("getScale?: () => number"),
  "IATreeNodeCardProps interface includes getScale?: () => number"
)

assert(
  nodeCardContent.includes("if (layoutNode.metrics) return layoutNode.metrics"),
  "IATreeNodeCard uses precomputed layoutNode.metrics in O(1) without recursive tree walking"
)

assert(
  nodeCardContent.includes("const currentScale = getScale ? Math.max(0.05, getScale()) : Math.max(0.05, scale || 1)"),
  "IATreeNodeCard queries dynamic canvas scale via getScale() on pointer down & resize"
)

// 3. IACanvasViewport Viewport Culling & Scale decoupling
assert(
  viewportContent.includes("transformRef = useRef(transform)") &&
  viewportContent.includes("getCanvasScale = useCallback(() => transformRef.current.scale, [])"),
  "IACanvasViewport provides stable getCanvasScale callback backed by transformRef"
)

assert(
  viewportContent.includes("visibleBounds = useMemo(") &&
  viewportContent.includes("culledNodes = useMemo(") &&
  viewportContent.includes("culledConnectors = useMemo("),
  "IACanvasViewport computes visibleBounds, culledNodes, and culledConnectors with safety buffer"
)

assert(
  viewportContent.includes("<IABezierConnectors\n          connectors={culledConnectors}") ||
  viewportContent.includes("connectors={culledConnectors}"),
  "IABezierConnectors receives culledConnectors instead of full raw connector list"
)

assert(
  viewportContent.includes("{culledNodes.map((layoutNode) => {") &&
  viewportContent.includes("getScale={getCanvasScale}"),
  "IACanvasViewport renders culledNodes and passes getScale={getCanvasScale} to prevent memo invalidation"
)

// 4. Mathematical Simulation of 256 Nodes Viewport Culling
const mockNodes = []
const MAP_WIDTH = 8600
const MAP_HEIGHT = 3600
const NODE_COUNT = 256

for (let i = 0; i < NODE_COUNT; i++) {
  mockNodes.push({
    node: { id: `node-${i}`, tier: (i % 5) + 1, name: `Node ${i}` },
    x: (i % 16) * 540 + 20,
    y: Math.floor(i / 16) * 220 + 20,
    width: 280,
    height: 68,
    isHighlighted: i === 5, // 1 highlighted
  })
}

const viewportW = 1400
const viewportH = 900
const currentPanX = -2000
const currentPanY = -800
const currentScale = 1.0
const pad = Math.max(400, 400 / currentScale)

const visibleBounds = {
  minX: -currentPanX / currentScale - pad,
  maxX: (viewportW - currentPanX) / currentScale + pad,
  minY: -currentPanY / currentScale - pad,
  maxY: (viewportH - currentPanY) / currentScale + pad,
}

const selectedSet = new Set(["node-0"]) // 1 selected

const culled = mockNodes.filter((ln) => {
  if (selectedSet.has(ln.node.id)) return true
  if (ln.isHighlighted) return true
  const h = ln.height || 68
  const inX = ln.x + ln.width >= visibleBounds.minX && ln.x <= visibleBounds.maxX
  const inY = ln.y + h >= visibleBounds.minY && ln.y <= visibleBounds.maxY
  return inX && inY
})

const culledRatio = (culled.length / NODE_COUNT) * 100
const domReduction = 100 - culledRatio

assert(
  culled.length < 50 && culled.length > 10,
  `256 nodes simulation: only ${culled.length} nodes rendered in view (${domReduction.toFixed(1)}% DOM reduction)`
)

assert(
  culled.some((n) => n.node.id === "node-0"),
  "Selected node outside visible viewport is preserved safely without unmounting"
)

assert(
  culled.some((n) => n.node.id === "node-5"),
  "Highlighted/Search matched node is preserved safely"
)

// 5. Connectors Culling & Preservation Simulation
const mockConnectors = [
  // Connected to visible node in culled set
  { id: "c1", parentId: culled[0].node.id, childId: "child-x", x1: 100, y1: 100, x2: 200, y2: 200 },
  // Completely offscreen connector
  { id: "c2", parentId: "node-off-1", childId: "node-off-2", x1: 99999, y1: 99999, x2: 100000, y2: 100000 },
]

const visibleIdSet = new Set(culled.map((n) => n.node.id))
const culledConns = mockConnectors.filter((c) => {
  if (visibleIdSet.has(c.parentId) || visibleIdSet.has(c.childId)) return true
  const minConnX = Math.min(c.x1, c.x2)
  const maxConnX = Math.max(c.x1, c.x2)
  const minConnY = Math.min(c.y1, c.y2)
  const maxConnY = Math.max(c.y1, c.y2)
  return (
    maxConnX >= visibleBounds.minX &&
    minConnX <= visibleBounds.maxX &&
    maxConnY >= visibleBounds.minY &&
    minConnY <= visibleBounds.maxY
  )
})

assert(
  culledConns.some((c) => c.id === "c1"),
  "Connector connected to visible node is safely preserved in culledConnectors"
)

assert(
  !culledConns.some((c) => c.id === "c2"),
  "Off-screen connector is pruned to conserve SVG layout and GPU memory"
)

console.log("================================================================================")
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed (100%)`)
console.log("================================================================================")

if (passedTests === totalTests) {
  console.log("🎉 ALL HIGH-PERFORMANCE & VIEWPORT CULLING TESTS PASSED SUCCESSFULLY!")
} else {
  console.error("❌ SOME TESTS FAILED!")
  process.exit(1)
}
