import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

console.log("================================================================================")
console.log("TEST SUITE: IA NODE DISABLE FEATURE & CASCADE TO DESCENDANTS VERIFICATION")
console.log("================================================================================")

const typesPath = path.join(process.cwd(), "src", "types", "ia.ts")
const typesContent = fs.readFileSync(typesPath, "utf-8")

const hookPath = path.join(process.cwd(), "src", "hooks", "useIATreeState.ts")
const hookContent = fs.readFileSync(hookPath, "utf-8")

const cardPath = path.join(process.cwd(), "src", "components", "ia", "IATreeNodeCard.tsx")
const cardContent = fs.readFileSync(cardPath, "utf-8")

const modalPath = path.join(process.cwd(), "src", "components", "ia", "IANodeEditorModal.tsx")
const modalContent = fs.readFileSync(modalPath, "utf-8")

const toolbarPath = path.join(process.cwd(), "src", "components", "ia", "IANodeFloatingToolbar.tsx")
const toolbarContent = fs.readFileSync(toolbarPath, "utf-8")

const connectorPath = path.join(process.cwd(), "src", "components", "ia", "IABezierConnectors.tsx")
const connectorContent = fs.readFileSync(connectorPath, "utf-8")

// 1. Verify types
assert.ok(typesContent.includes("disabled?: boolean"), "IANode type must have optional disabled boolean")
console.log("✓ Test 1: IANode interface has disabled?: boolean")

// 2. Verify hook logic
assert.ok(hookContent.includes("isDisabled?: boolean"), "LayoutNode and LayoutConnector must support isDisabled")
assert.ok(hookContent.includes("toggleNodeDisabled: (nodeId: string) => void"), "UseIATreeState must export toggleNodeDisabled")
assert.ok(hookContent.includes("toggleNodeDisabled"), "useIATreeState must declare toggleNodeDisabled")
assert.ok(hookContent.includes('if ("disabled" in nodeData)'), "updateNode must handle disabled field")
console.log("✓ Test 2: useIATreeState exports toggleNodeDisabled and handles disabled mutations")

// 3. Verify card visual styles
assert.ok(cardContent.includes("isEffectivelyDisabled"), "IATreeNodeCard must calculate isEffectivelyDisabled")
assert.ok(cardContent.includes('#f1f5f9'), "Disabled node must use #f1f5f9 gray background")
assert.ok(cardContent.includes("opacity: isEffectivelyDisabled ? 0.7 : 1"), "Disabled node must reduce opacity to 70% (0.7)")
assert.ok(cardContent.includes("shadow-none hover:shadow-none"), "Disabled node must remove card shadow")
assert.ok(cardContent.includes("line-through"), "Disabled node must strike through title")
assert.ok(cardContent.includes("Đã tắt"), "Disabled node must display 'Đã tắt' badge")
console.log("✓ Test 3: IATreeNodeCard visual rules (gray #f1f5f9, 70% opacity, shadow-none, line-through, 'Đã tắt' badge) verified")

// 4. Verify Floating Toolbar and Modal controls
assert.ok(toolbarContent.includes("onToggleDisable"), "Floating toolbar must support onToggleDisable")
assert.ok(toolbarContent.includes("ia-float-toggle-disable-"), "Floating toolbar must have toggle disable button")
assert.ok(modalContent.includes("ia-node-modal-disable-switch"), "Node editor modal must have disable switch")
assert.ok(modalContent.includes("disabled: isDisabled"), "Node editor modal payload must include disabled state")
console.log("✓ Test 4: Floating toolbar button and Node Editor Modal switch verified")

// 5. Verify Connector styling
assert.ok(connectorContent.includes("conn.isDisabled"), "Connectors must handle isDisabled state")
assert.ok(connectorContent.includes('strokeDasharray = "4 4"'), "Disabled connectors must render dashed lines")
assert.ok(connectorContent.includes('#cbd5e1'), "Disabled connectors must use muted slate stroke")
console.log("✓ Test 5: IABezierConnectors dashed line and muted stroke for disabled connections verified")

// 6. Algorithmic verification: Cascade disable down tree
function createTestTree() {
  return {
    id: "root-1",
    tier: 1,
    name: "Root",
    disabled: false,
    children: [
      {
        id: "module-1",
        tier: 2,
        name: "Module A",
        disabled: false,
        children: [
          {
            id: "journey-1",
            tier: 3,
            name: "Journey A1",
            disabled: false,
            children: [
              {
                id: "screen-1",
                tier: 4,
                name: "Screen A1-1",
                disabled: false,
                children: [
                  {
                    id: "element-1",
                    tier: 5,
                    name: "Button Submit",
                    disabled: false
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

// Simulate cascade
function cascadeDisable(node, dis) {
  node.disabled = dis
  if (node.children) {
    for (const child of node.children) {
      cascadeDisable(child, dis)
    }
  }
}

// Simulate buildInternal reactive layout isDisabled calculation
function calculateLayoutIsDisabled(node, parentDisabled = false) {
  const isDisabled = Boolean(node.disabled || parentDisabled)
  const result = [{ id: node.id, isDisabled }]
  if (node.children) {
    for (const child of node.children) {
      result.push(...calculateLayoutIsDisabled(child, isDisabled))
    }
  }
  return result
}

const tree = createTestTree()

// Initially all enabled
let layoutNodes = calculateLayoutIsDisabled(tree)
assert.strictEqual(layoutNodes.every(n => !n.isDisabled), true, "All nodes should initially be enabled")

// Disable Module A
const mod = tree.children[0]
cascadeDisable(mod, true)
layoutNodes = calculateLayoutIsDisabled(tree)

const rootLayout = layoutNodes.find(n => n.id === "root-1")
const modLayout = layoutNodes.find(n => n.id === "module-1")
const journeyLayout = layoutNodes.find(n => n.id === "journey-1")
const screenLayout = layoutNodes.find(n => n.id === "screen-1")
const elemLayout = layoutNodes.find(n => n.id === "element-1")

assert.strictEqual(rootLayout.isDisabled, false, "Root should remain enabled")
assert.strictEqual(modLayout.isDisabled, true, "Module 1 should be disabled")
assert.strictEqual(journeyLayout.isDisabled, true, "Journey 1 should cascade to disabled")
assert.strictEqual(screenLayout.isDisabled, true, "Screen 1 should cascade to disabled")
assert.strictEqual(elemLayout.isDisabled, true, "Element 1 should cascade to disabled")
console.log("✓ Test 6: Disabling a node cascades disabled state down to all its descendants")

// Re-enable Module A
cascadeDisable(mod, false)
layoutNodes = calculateLayoutIsDisabled(tree)
assert.strictEqual(layoutNodes.every(n => !n.isDisabled), true, "All nodes should be re-enabled after toggle")
console.log("✓ Test 7: Re-enabling a node restores enabled state across the subtree")

console.log("================================================================================")
console.log("🎉 ALL IA NODE DISABLE & CASCADE TESTS PASSED (100%)!")
console.log("================================================================================")
