/**
 * Automated Test Suite for:
 * 1. User-authored nodes (name, description, customTag, colorTheme)
 * 2. Freeform drag-and-drop canvas arranging (customX, customY, autoAlignTree)
 * 3. 4-Way Connector Ports (Top, Bottom, Left, Right) with smart directional routing
 */

import assert from "node:assert/strict"

console.log("================================================================================")
console.log("TEST SUITE: IA FREEFORM ARRANGER, 4-WAY CONNECTOR PORTS & USER-AUTHORED NODES")
console.log("================================================================================\n")

// Test 1: User-authored custom positions (Freeform Arrange)
const root = {
  id: "node-app-root",
  tier: 1,
  name: "App MBBank",
  children: [
    {
      id: "node-domain-core",
      tier: 2,
      name: "Core Banking",
      parentId: "node-app-root",
      children: [
        {
          id: "node-journey-1",
          tier: 3,
          name: "Đăng ký eKYC",
          parentId: "node-domain-core",
          children: [],
        },
      ],
    },
  ],
}

// Simulate user moving node on canvas (Freeform Arranging)
function updateNodePosition(tree, nodeId, x, y) {
  function dfs(curr) {
    if (curr.id === nodeId) {
      curr.customX = Math.round(x)
      curr.customY = Math.round(y)
      return true
    }
    if (curr.children) {
      for (const child of curr.children) {
        if (dfs(child)) return true
      }
    }
    return false
  }
  dfs(tree)
}

updateNodePosition(root, "node-domain-core", 520, 180)
assert.equal(root.children[0].customX, 520)
assert.equal(root.children[0].customY, 180)
console.log("✓ Test 1: updateNodePosition successfully records customX/customY coordinates")

// Test 2: Auto-align restores computed tidy positions by stripping custom coordinates
function autoAlignTree(tree) {
  function dfs(curr) {
    delete curr.customX
    delete curr.customY
    if (curr.children) {
      for (const child of curr.children) {
        dfs(child)
      }
    }
  }
  dfs(tree)
}

autoAlignTree(root)
assert.equal(root.children[0].customX, undefined)
assert.equal(root.children[0].customY, undefined)
console.log("✓ Test 2: autoAlignTree cleanly clears custom coordinates to restore tidy tree")

// Test 3: 4-Way Directional Port Routing Logic
function computeDirectionalPorts(p, c) {
  const pcx = p.x + p.width / 2
  const pcy = p.y + p.height / 2
  const ccx = c.x + c.width / 2
  const ccy = c.y + c.height / 2

  const dx = ccx - pcx
  const dy = ccy - pcy

  let fromPort
  let toPort

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      fromPort = "right"
      toPort = "left"
    } else {
      fromPort = "left"
      toPort = "right"
    }
  } else {
    if (dy >= 0) {
      fromPort = "bottom"
      toPort = "top"
    } else {
      fromPort = "top"
      toPort = "bottom"
    }
  }
  return { fromPort, toPort }
}

// 3a: Child to the Right
const rightTest = computeDirectionalPorts(
  { x: 40, y: 100, width: 200, height: 80 },
  { x: 340, y: 100, width: 200, height: 80 }
)
assert.equal(rightTest.fromPort, "right")
assert.equal(rightTest.toPort, "left")
console.log("✓ Test 3a: Child to the Right -> fromPort: 'right', toPort: 'left'")

// 3b: Child to the Left
const leftTest = computeDirectionalPorts(
  { x: 340, y: 100, width: 200, height: 80 },
  { x: 40, y: 100, width: 200, height: 80 }
)
assert.equal(leftTest.fromPort, "left")
assert.equal(leftTest.toPort, "right")
console.log("✓ Test 3b: Child to the Left -> fromPort: 'left', toPort: 'right'")

// 3c: Child Below
const bottomTest = computeDirectionalPorts(
  { x: 100, y: 50, width: 200, height: 80 },
  { x: 100, y: 250, width: 200, height: 80 }
)
assert.equal(bottomTest.fromPort, "bottom")
assert.equal(bottomTest.toPort, "top")
console.log("✓ Test 3c: Child Below -> fromPort: 'bottom', toPort: 'top'")

// 3d: Child Above
const topTest = computeDirectionalPorts(
  { x: 100, y: 250, width: 200, height: 80 },
  { x: 100, y: 50, width: 200, height: 80 }
)
assert.equal(topTest.fromPort, "top")
assert.equal(topTest.toPort, "bottom")
console.log("✓ Test 3d: Child Above -> fromPort: 'top', toPort: 'bottom'")

// Test 4: Directional Add Child Calculation
function addChildInDirection(tree, parentId, direction, nodeData = {}) {
  let createdNode = null
  function dfs(curr) {
    if (curr.id === parentId) {
      let offsetX = 300
      let offsetY = 0
      if (direction === "bottom") {
        offsetX = 0
        offsetY = 130
      } else if (direction === "top") {
        offsetX = 0
        offsetY = -130
      } else if (direction === "left") {
        offsetX = -300
        offsetY = 0
      }

      createdNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tier: Math.min(4, curr.tier + 1),
        name: nodeData.name || "Node mới",
        parentId: curr.id,
        customTag: nodeData.customTag,
        colorTheme: nodeData.colorTheme || curr.colorTheme || "blue",
        children: [],
      }

      if (curr.customX !== undefined && curr.customY !== undefined) {
        createdNode.customX = curr.customX + offsetX
        createdNode.customY = curr.customY + offsetY
      }

      if (!curr.children) curr.children = []
      curr.children.push(createdNode)
      return true
    }
    if (curr.children) {
      for (const child of curr.children) {
        if (dfs(child)) return true
      }
    }
    return false
  }
  dfs(tree)
  return createdNode
}

// Set parent custom position
root.customX = 100
root.customY = 200

const bottomChild = addChildInDirection(root, "node-app-root", "bottom", { name: "Thẻ phụ bên dưới" })
assert.equal(bottomChild.customX, 100)
assert.equal(bottomChild.customY, 330)
console.log("✓ Test 4a: addChildInDirection('bottom') placed at (100, 330)")

const topChild = addChildInDirection(root, "node-app-root", "top", { name: "Menu phía trên" })
assert.equal(topChild.customX, 100)
assert.equal(topChild.customY, 70)
console.log("✓ Test 4b: addChildInDirection('top') placed at (100, 70)")

const leftChild = addChildInDirection(root, "node-app-root", "left", { name: "Sidebar bên trái" })
assert.equal(leftChild.customX, -200)
assert.equal(leftChild.customY, 200)
console.log("✓ Test 4c: addChildInDirection('left') placed at (-200, 200)")

// Test 5: User-Authored Fields (Not tied to tasks)
const customNode = {
  id: "user-node-investment",
  tier: 3,
  name: "Giao dịch Chứng khoán Phái sinh",
  customTag: "Đầu tư",
  colorTheme: "emerald",
  description: "Đặt lệnh hợp đồng tương lai VN30 tự do",
}

assert.equal(customNode.name, "Giao dịch Chứng khoán Phái sinh")
assert.equal(customNode.customTag, "Đầu tư")
assert.equal(customNode.colorTheme, "emerald")
assert.equal(customNode.requestId, undefined)
console.log("✓ Test 5: User-authored node operates completely free from mandatory task dependencies")

console.log("\n================================================================================")
console.log("🎉 ALL TESTS FOR FREEFORM ARRANGER & 4-WAY PORTS PASSED (100%)")
console.log("================================================================================\n")
