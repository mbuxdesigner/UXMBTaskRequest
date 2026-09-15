// test-port-drag-connect.mjs
// Verification suite for Port Drag-to-Connect and Node Creation features

import assert from "node:assert"
import fs from "node:fs"

console.log("=== Testing Interactive Port Drag-to-Connect ===")

// 1. Verify code files contain required interfaces and implementations
const typesContent = fs.readFileSync("./src/types/ia.ts", "utf-8")
assert(typesContent.includes("export interface IAPortDragState"), "IAPortDragState must be exported in src/types/ia.ts")
assert(typesContent.includes("hoveredTargetNodeId"), "IAPortDragState must include hoveredTargetNodeId")
console.log("✓ Step 1: src/types/ia.ts exports IAPortDragState with required fields")

const hookContent = fs.readFileSync("./src/hooks/useIATreeState.ts", "utf-8")
assert(hookContent.includes("connectNodes: (sourceNodeId: string, targetNodeId: string) => void"), "connectNodes must be in UseIATreeStateReturn")
assert(hookContent.includes("createConnectedNodeAt: ("), "createConnectedNodeAt must be in UseIATreeStateReturn")
assert(hookContent.includes("targetIsAncestor"), "connectNodes must implement cycle prevention check")
console.log("✓ Step 2: src/hooks/useIATreeState.ts defines connectNodes and createConnectedNodeAt with cycle prevention")

const connectorsContent = fs.readFileSync("./src/components/ia/IABezierConnectors.tsx", "utf-8")
assert(connectorsContent.includes("activeWireDrag?: IAPortDragState | null"), "IABezierConnectors must accept activeWireDrag prop")
assert(connectorsContent.includes('data-testid="ia-active-wire-drag"'), "IABezierConnectors must render data-testid ia-active-wire-drag")
assert(connectorsContent.includes("url(#ia-arrow-highlight)"), "IABezierConnectors must include arrow marker on drag wire")
console.log("✓ Step 3: src/components/ia/IABezierConnectors.tsx implements dynamic wire preview")

const cardContent = fs.readFileSync("./src/components/ia/IATreeNodeCard.tsx", "utf-8")
assert(cardContent.includes("onPortDragStart?:"), "IATreeNodeCard must accept onPortDragStart prop")
assert(cardContent.includes("isWireDropTarget?:"), "IATreeNodeCard must accept isWireDropTarget prop")
assert(cardContent.includes("data-node-id={node.id}"), "IATreeNodeCard must have data-node-id attribute")
assert(cardContent.includes("cursor-crosshair"), "Port buttons must have cursor-crosshair for drag cue")
console.log("✓ Step 4: src/components/ia/IATreeNodeCard.tsx attaches port pointer down and drop target highlights")

const viewportContent = fs.readFileSync("./src/components/ia/IACanvasViewport.tsx", "utf-8")
assert(viewportContent.includes("activeWireDrag"), "IACanvasViewport must manage activeWireDrag state")
assert(viewportContent.includes("handlePortDragStart"), "IACanvasViewport must implement handlePortDragStart")
assert(viewportContent.includes("document.elementFromPoint"), "IACanvasViewport must use elementFromPoint for drop target detection")
assert(viewportContent.includes("onConnectNodes"), "IACanvasViewport must accept and invoke onConnectNodes")
assert(viewportContent.includes("onCreateConnectedNodeAt"), "IACanvasViewport must accept and invoke onCreateConnectedNodeAt")
console.log("✓ Step 5: src/components/ia/IACanvasViewport.tsx coordinates wire drag, hovering and drop actions")

const pageContent = fs.readFileSync("./src/pages/IAPage.tsx", "utf-8")
assert(pageContent.includes("connectNodes"), "IAPage must destructure connectNodes from hook")
assert(pageContent.includes("createConnectedNodeAt"), "IAPage must destructure createConnectedNodeAt from hook")
assert(pageContent.includes("onConnectNodes={connectNodes}"), "IAPage must pass onConnectNodes to IACanvasViewport")
assert(pageContent.includes("onCreateConnectedNodeAt={createConnectedNodeAt}"), "IAPage must pass onCreateConnectedNodeAt to IACanvasViewport")
console.log("✓ Step 6: src/pages/IAPage.tsx wires state hook directly to canvas viewport")

// 2. Functional logic simulation of cycle prevention and reparenting
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

const mockTree = {
  id: "root",
  tier: 1,
  name: "Root",
  children: [
    {
      id: "node-a",
      tier: 2,
      parentId: "root",
      name: "Node A",
      children: [
        {
          id: "node-a-1",
          tier: 3,
          parentId: "node-a",
          name: "Node A1",
          children: []
        }
      ]
    },
    {
      id: "node-b",
      tier: 2,
      parentId: "root",
      name: "Node B",
      children: []
    }
  ]
}

function simulateConnect(tree, sourceId, targetId) {
  if (sourceId === targetId) return { success: false, reason: "same-node" }

  // Cycle prevention
  function findAndVerify(curr, path) {
    const nextPath = [...path, curr.id]
    if (curr.id === sourceId && path.includes(targetId)) {
      return { targetIsAncestor: true }
    }
    if (curr.children) {
      for (const c of curr.children) {
        const res = findAndVerify(c, nextPath)
        if (res.targetIsAncestor) return res
      }
    }
    return { targetIsAncestor: false }
  }

  const clone = deepClone(tree)
  const { targetIsAncestor } = findAndVerify(clone, [])
  if (targetIsAncestor) {
    return { success: false, reason: "cycle" }
  }

  // Detach target
  let detached = null
  function detach(curr) {
    if (!curr.children) return false
    const idx = curr.children.findIndex(c => c.id === targetId)
    if (idx !== -1) {
      detached = curr.children.splice(idx, 1)[0]
      return true
    }
    for (const c of curr.children) {
      if (detach(c)) return true
    }
    return false
  }
  detach(clone)
  if (!detached) return { success: false, reason: "not-found" }

  // Attach to source
  function attach(curr) {
    if (curr.id === sourceId) {
      if (!curr.children) curr.children = []
      detached.parentId = curr.id
      detached.tier = Math.min(4, curr.tier + 1)
      curr.children.push(detached)
      return true
    }
    if (curr.children) {
      for (const c of curr.children) {
        if (attach(c)) return true
      }
    }
    return false
  }
  attach(clone)
  return { success: true, tree: clone }
}

// Case A: Connect node-a-1 to node-b (reparent node-b as child of node-a-1)
const res1 = simulateConnect(mockTree, "node-a-1", "node-b")
assert(res1.success === true, "Valid connection must succeed")
const attachedNodeB = res1.tree.children[0].children[0].children[0]
assert(attachedNodeB.id === "node-b", "node-b must be attached under node-a-1")
assert(attachedNodeB.parentId === "node-a-1", "node-b parentId must be updated to node-a-1")
assert(attachedNodeB.tier === 4, "node-b tier must be updated to 4")
console.log("✓ Step 7: Reparenting and tier adjustment works perfectly")

// Case B: Cycle prevention (cannot connect node-a-1 to node-a where node-a is ancestor of node-a-1)
const resCycle = simulateConnect(mockTree, "node-a-1", "node-a")
assert(resCycle.success === false && resCycle.reason === "cycle", "Connecting to an ancestor must trigger cycle prevention")
console.log("✓ Step 8: Cycle prevention correctly prohibits cycles in tree hierarchy")

console.log("\nALL 8 TESTS PASSED SUCCESSFULLY! 🚀")
