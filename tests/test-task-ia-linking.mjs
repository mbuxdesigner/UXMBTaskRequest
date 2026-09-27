import assert from "node:assert/strict"
import {
  createIANodeForTask,
  findTaskIALink,
  isNodeInSquadScope,
  linkTaskToIANode,
  mergeCloudIATreesPreservingDirtyProducts,
  resolveIAProductId,
  unlinkTaskFromIA,
} from "../src/lib/iaTaskLink.ts"

const products = [
  { id: "digi-invest", name: "Digi invest", code: "DIGI_INVEST" },
]
const baseTrees = {
  "digi-invest": {
    id: "root",
    tier: 1,
    name: "Digi invest",
    children: [
      {
        id: "module-beerich",
        tier: 2,
        name: "BeeRich",
        squad: "BeeRich",
        children: [
          {
            id: "journey-old",
            tier: 3,
            name: "Old journey",
            squad: "BeeRich",
            taskIds: ["UXMB-OLD"],
            children: [],
          },
          {
            id: "journey-new",
            tier: 3,
            name: "New journey",
            squad: "BeeRich",
            children: [],
          },
        ],
      },
      {
        id: "module-card",
        tier: 2,
        name: "Cards",
        squad: "Cards",
        children: [],
      },
    ],
  },
}

assert.equal(
  resolveIAProductId(products, baseTrees, "Digi Invest"),
  "digi-invest",
)
assert.equal(
  resolveIAProductId(products, baseTrees, "DIGI_INVEST"),
  "digi-invest",
)
console.log("✓ Product mapping accepts admin name and code")

const firstLink = linkTaskToIANode(
  baseTrees,
  "UXMB-001",
  "digi-invest",
  "journey-old",
)
assert.equal(findTaskIALink(firstLink, "UXMB-001")?.node.id, "journey-old")

const movedLink = linkTaskToIANode(
  firstLink,
  "UXMB-001",
  "digi-invest",
  "journey-new",
)
assert.equal(findTaskIALink(movedLink, "UXMB-001")?.node.id, "journey-new")
assert.equal(
  firstLink["digi-invest"].children[0].children[0].taskIds.includes("UXMB-001"),
  true,
)
assert.equal(
  movedLink["digi-invest"].children[0].children[0].taskIds?.includes(
    "UXMB-001",
  ) || false,
  false,
)
console.log("✓ One task is linked to exactly one IA node and moves atomically")

const unlinked = unlinkTaskFromIA(movedLink, "UXMB-001")
assert.equal(findTaskIALink(unlinked, "UXMB-001"), null)
console.log("✓ IA link can be removed without affecting other tasks")

const staleCloudTrees = {
  "digi-invest": baseTrees["digi-invest"],
  "other-product": { id: "other-root-cloud", tier: 1, name: "Cloud version" },
}
const localWithPendingLink = {
  ...movedLink,
  "other-product": { id: "other-root-local", tier: 1, name: "Local version" },
}
const mergedAfterAutoPull = mergeCloudIATreesPreservingDirtyProducts(
  localWithPendingLink,
  staleCloudTrees,
  ["digi-invest"],
)
assert.equal(
  findTaskIALink(mergedAfterAutoPull, "UXMB-001")?.node.id,
  "journey-new",
  "Auto-pull must preserve a pending local task link",
)
assert.equal(
  mergedAfterAutoPull["other-product"].id,
  "other-root-cloud",
  "Auto-pull must still refresh products without local pending changes",
)
console.log("✓ Cloud auto-pull preserves pending task links only on dirty products")

assert.equal(
  isNodeInSquadScope(baseTrees["digi-invest"].children[0], "BeeRich"),
  true,
)
assert.equal(
  isNodeInSquadScope(baseTrees["digi-invest"].children[1], "BeeRich"),
  false,
)
console.log("✓ IA choices are scoped to the task squad")

const created = createIANodeForTask({
  trees: baseTrees,
  productId: "digi-invest",
  parentId: "journey-new",
  tier: 4,
  name: "Màn hình xác nhận",
  squad: "BeeRich",
})
assert.equal(
  findTaskIALink(created.trees, "UXMB-002"),
  null,
  "Creating a node must not link the task before the user confirms",
)
const linkedCreated = linkTaskToIANode(
  created.trees,
  "UXMB-002",
  "digi-invest",
  created.node.id,
)
const createdMatch = findTaskIALink(linkedCreated, "UXMB-002")
assert.equal(createdMatch?.node.name, "Màn hình xác nhận")
assert.equal(createdMatch?.node.tier, 4)
assert.equal(createdMatch?.node.squad, "BeeRich")
assert.deepEqual(
  createdMatch?.path.map((node) => node.id),
  ["root", "module-beerich", "journey-new", created.node.id],
)
console.log(
  "✓ Quick-created node inherits squad, hierarchy and receives the task",
)

console.log("\n✅ TASK ↔ IA LINKING TESTS PASSED (6/6)")
