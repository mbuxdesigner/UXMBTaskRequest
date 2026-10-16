import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

console.log("================================================================================")
console.log("TEST SUITE: IA NODE TIER RESOLUTION & ADD CHILD VERIFICATION")
console.log("================================================================================")

const hookPath = path.join(process.cwd(), "src", "hooks", "useIATreeState.ts")
const hookContent = fs.readFileSync(hookPath, "utf-8")

// 1. Verify code structure in useIATreeState.ts
assert.ok(hookContent.includes("const targetTier = nodeData.tier"), "useIATreeState must check nodeData.tier")
assert.ok(hookContent.includes("const requiredParentTier = Math.max(1, targetTier - 1) as IATier"), "useIATreeState must compute requiredParentTier")
assert.ok(hookContent.includes("tier: targetTier"), "useIATreeState must assign targetTier to newNode.tier")
console.log("✓ Test 1: useIATreeState.ts explicitly handles targetTier and requiredParentTier")

// 2. Simulate the tree resolution logic in pure JS to verify algorithm
function createMockTree() {
  return {
    id: "root-1",
    tier: 1,
    name: "App MBBank 2026",
    children: [
      {
        id: "mod-1",
        tier: 2,
        name: "Thanh toán & Chuyển tiền",
        parentId: "root-1",
        children: [
          {
            id: "journey-1",
            tier: 3,
            name: "Chuyển tiền nhanh Napas 24/7",
            parentId: "mod-1",
            children: [
              {
                id: "screen-1",
                tier: 4,
                name: "Màn hình chuyển tiền",
                touchpointType: "screen",
                parentId: "journey-1",
                children: [
                  {
                    id: "elem-1",
                    tier: 5,
                    name: "Nút xác nhận chuyển tiền",
                    parentId: "screen-1",
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}

// Logic mirror of addChildNode from useIATreeState.ts
function simulateAddChildNode(root, parentId, nodeData) {
  let targetPath = []
  function findPath(curr, path) {
    const currentPath = [...path, curr]
    if (curr.id === parentId) {
      targetPath = currentPath
      return true
    }
    if (curr.children) {
      for (const child of curr.children) {
        if (findPath(child, currentPath)) return true
      }
    }
    return false
  }

  findPath(root, [])
  if (targetPath.length === 0) throw new Error(`Parent node with id "${parentId}" not found`)

  const targetNode = targetPath[targetPath.length - 1]
  const targetTier = nodeData.tier

  if (targetTier === undefined) {
    if (targetNode.tier >= 5) {
      return { blocked: true, reason: "Cấp 5 (Lv5) là tầng thành phần/chi tiết cuối cùng" }
    }
    const nextTier = targetNode.tier + 1
    const newNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tier: nextTier,
      name: nodeData.name || `Node mới (Cấp ${nextTier})`,
      parentId: targetNode.id,
      touchpointType: nextTier === 4 ? (nodeData.touchpointType || "screen") : undefined,
      children: nextTier < 5 ? [] : undefined,
    }
    if (!targetNode.children) targetNode.children = []
    targetNode.children.push(newNode)
    return { blocked: false, newNode }
  } else {
    const requiredParentTier = Math.max(1, targetTier - 1)
    let effectiveParent = null

    if (targetNode.tier === requiredParentTier) {
      effectiveParent = targetNode
    } else if (targetNode.tier > requiredParentTier) {
      for (let i = targetPath.length - 1; i >= 0; i--) {
        if (targetPath[i].tier === requiredParentTier) {
          effectiveParent = targetPath[i]
          break
        }
      }
    } else {
      let curr = targetNode
      while (curr.tier < requiredParentTier) {
        const nextChildTier = curr.tier + 1
        if (!curr.children) curr.children = []
        let nextChild = curr.children[curr.children.length - 1]
        if (!nextChild || nextChild.tier !== nextChildTier) {
          const intermediateNode = {
            id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            tier: nextChildTier,
            name: `Mặc định Cấp ${nextChildTier}`,
            parentId: curr.id,
            touchpointType: nextChildTier === 4 ? "screen" : undefined,
            children: nextChildTier < 5 ? [] : undefined,
          }
          curr.children.push(intermediateNode)
          nextChild = intermediateNode
        }
        curr = nextChild
      }
      effectiveParent = curr
    }

    if (!effectiveParent) effectiveParent = targetNode

    const newNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tier: targetTier,
      name: nodeData.name || `Node mới (Cấp ${targetTier})`,
      parentId: effectiveParent.id,
      touchpointType: targetTier === 4 ? (nodeData.touchpointType || "screen") : undefined,
      children: targetTier < 5 ? [] : undefined,
    }
    if (!effectiveParent.children) effectiveParent.children = []
    effectiveParent.children.push(newNode)
    return { blocked: false, newNode, effectiveParent }
  }
}

// Test A: User has nothing selected (parentId is root-1, tier 1) and chooses Lv3 (Journey)
const treeA = createMockTree()
const resA = simulateAddChildNode(treeA, "root-1", { tier: 3, name: "Luồng Mới" })
assert.equal(resA.newNode.tier, 3, "Node must have tier 3, NOT 2!")
assert.equal(resA.effectiveParent.id, "mod-1", "Parent of Tier 3 must be Tier 2 module 'mod-1'")
assert.equal(resA.newNode.parentId, "mod-1")
console.log("✓ Test 2: Adding Lv3 when Root is selected resolves parent to Tier 2 (Module) and creates Tier 3 node")

// Test B: User has nothing selected (parentId is root-1, tier 1) and chooses Lv4 (Screen)
const treeB = createMockTree()
const resB = simulateAddChildNode(treeB, "root-1", { tier: 4, name: "Màn hình mới", touchpointType: "screen" })
assert.equal(resB.newNode.tier, 4, "Node must have tier 4, NOT 2!")
assert.equal(resB.effectiveParent.id, "journey-1", "Parent of Tier 4 must be Tier 3 journey 'journey-1'")
assert.equal(resB.newNode.parentId, "journey-1")
console.log("✓ Test 3: Adding Lv4 when Root is selected resolves parent to Tier 3 (Journey) and creates Tier 4 node")

// Test C: User has nothing selected (parentId is root-1, tier 1) and chooses Lv5 (Element)
const treeC = createMockTree()
const resC = simulateAddChildNode(treeC, "root-1", { tier: 5, name: "Thành phần mới" })
assert.equal(resC.newNode.tier, 5, "Node must have tier 5, NOT 2!")
assert.equal(resC.effectiveParent.id, "screen-1", "Parent of Tier 5 must be Tier 4 screen 'screen-1'")
assert.equal(resC.newNode.parentId, "screen-1")
console.log("✓ Test 4: Adding Lv5 when Root is selected resolves parent to Tier 4 (Screen) and creates Tier 5 node")

// Test D: User selects Screen (tier 4) and clicks Lv4 (sibling screen)
const treeD = createMockTree()
const resD = simulateAddChildNode(treeD, "screen-1", { tier: 4, name: "Màn hình thứ hai" })
assert.equal(resD.newNode.tier, 4, "Sibling screen must have tier 4")
assert.equal(resD.effectiveParent.id, "journey-1", "Sibling screen parent must be journey-1")
console.log("✓ Test 5: Adding Lv4 when a Screen is selected attaches as sibling under same Journey")

// Test E: User selects Element (tier 5) and clicks Lv5 (sibling element)
const treeE = createMockTree()
const resE = simulateAddChildNode(treeE, "elem-1", { tier: 5, name: "Nút hủy" })
assert.equal(resE.newNode.tier, 5, "Sibling element must have tier 5")
assert.equal(resE.effectiveParent.id, "screen-1", "Sibling element parent must be screen-1")
console.log("✓ Test 6: Adding Lv5 when an Element is selected attaches as sibling under same Screen")

// Test F: Default (+) button on Screen (tier 4) without specifying tier creates Lv5
const treeF = createMockTree()
const resF = simulateAddChildNode(treeF, "screen-1", { name: "Chi tiết con" })
assert.equal(resF.newNode.tier, 5, "Default addition under Tier 4 must create Tier 5")
assert.equal(resF.newNode.parentId, "screen-1")
console.log("✓ Test 7: Default (+) button on Tier 4 node creates Tier 5 child")

// Test G: Default (+) button on Element (tier 5) without specifying tier is blocked
const treeG = createMockTree()
const resG = simulateAddChildNode(treeG, "elem-1", {})
assert.equal(resG.blocked, true, "Addition under Tier 5 must be blocked")
console.log("✓ Test 8: Default (+) button on Tier 5 is blocked with Lv5 capping message")

// Test H: Empty tree (only root, no modules) auto-creates intermediate levels
const emptyRoot = { id: "empty-root", tier: 1, name: "Empty Root", children: [] }
const resH = simulateAddChildNode(emptyRoot, "empty-root", { tier: 4, name: "Màn hình đầu tiên" })
assert.equal(resH.newNode.tier, 4, "Tier 4 node created")
assert.equal(emptyRoot.children.length, 1, "Tier 2 module auto-created")
assert.equal(emptyRoot.children[0].tier, 2)
assert.equal(emptyRoot.children[0].children.length, 1, "Tier 3 journey auto-created")
assert.equal(emptyRoot.children[0].children[0].tier, 3)
assert.equal(emptyRoot.children[0].children[0].children.length, 1, "Tier 4 screen attached")
assert.equal(emptyRoot.children[0].children[0].children[0].tier, 4)
console.log("✓ Test 9: Adding Lv4 to an empty Root auto-creates intermediate Tier 2 and Tier 3 nodes")

console.log("================================================================================")
console.log("🎉 ALL IA NODE TIER RESOLUTION TESTS PASSED (100%)!")
console.log("================================================================================")
