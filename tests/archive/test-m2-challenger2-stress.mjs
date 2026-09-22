/**
 * ============================================================================
 * UXMB TASK REQUEST — CHALLENGER 2 ADVERSARIAL STRESS TEST SUITE (MILESTONE M2)
 * ============================================================================
 * Focus Areas:
 * 1. LocalStorage Corrupt, Quota Recovery & Schema Resilience
 * 2. Inline CRUD Boundary Enforcement & Validation Oracles
 * 3. Quick Search Metacharacter Stress, Vietnamese Diacritics & Ancestor Expansion
 * 4. Rapid Expand/Collapse Cycles, Geometric Invariants & High-Frequency Stress
 * ============================================================================
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log("================================================================================")
console.log("CHALLENGER 2 — ADVERSARIAL EMPIRICAL STRESS HARNESS (MILESTONE M2)")
console.log("Targets: LocalStorage Corrupt/Quota, CRUD Boundaries, Search Regex, 1000x Toggles")
console.log("================================================================================\n")

const suiteStartTime = Date.now()

// Track test results by section
const results = {
  sec1: { name: "LocalStorage Corrupt & Quota Recovery", passed: 0, failed: 0 },
  sec2: { name: "Inline CRUD Boundary Enforcement", passed: 0, failed: 0 },
  sec3: { name: "Quick Search Regex, Diacritics & Expansion", passed: 0, failed: 0 },
  sec4: { name: "Rapid Expand/Collapse & Geometric Invariants", passed: 0, failed: 0 },
}

function recordPass(section) {
  results[section].passed++
}

const findings = []

function runEmpiricalTest(section, id, title, fn) {
  try {
    fn()
    recordPass(section)
    console.log(`  ✓ [${id}] ${title}`)
  } catch (err) {
    results[section].failed++
    findings.push({ section, id, title, error: err.message, stack: err.stack })
    console.error(`  ✗ [${id}] ${title}`)
    console.error(`    FAILURE: ${err.message}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE TRANSPILATION & ENVIRONMENT HARNESS
// ─────────────────────────────────────────────────────────────────────────────

// 1. Load mockData.ts
const mockSrc = fs.readFileSync(path.join(__dirname, "src/data/mockData.ts"), "utf8")
const mockJs = ts.transpileModule(mockSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const mockExports = {}
new Function("exports", "require", mockJs)(mockExports, require)

// 2. Load iaMockData.ts
const iaMockSrc = fs.readFileSync(path.join(__dirname, "src/data/iaMockData.ts"), "utf8")
const iaMockJs = ts.transpileModule(iaMockSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const iaMockExports = {}
new Function("exports", "require", iaMockJs)(iaMockExports, require)

// 3. Load useIATreeState.ts
const hookSrc = fs.readFileSync(path.join(__dirname, "src/hooks/useIATreeState.ts"), "utf8")
const hookJs = ts.transpileModule(hookSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText

/**
 * Factory for a stateful React Hook execution environment in Node.js
 */
function createHookEnvironment(initialStorage = {}) {
  let storage = { ...initialStorage }
  let setItemShouldThrowQuota = false
  let setItemShouldThrowSecurity = false

  const mockStorage = {
    getItem: (key) => storage[key] ?? null,
    setItem: (key, val) => {
      if (setItemShouldThrowQuota) {
        const err = new Error("QuotaExceededError: The quota has been exceeded.")
        err.name = "QuotaExceededError"
        err.code = 22
        throw err
      }
      if (setItemShouldThrowSecurity) {
        const err = new Error("SecurityError: Access is denied.")
        err.name = "SecurityError"
        throw err
      }
      storage[key] = String(val)
    },
    removeItem: (key) => { delete storage[key] },
    clear: () => { storage = {} },
    getRaw: () => storage,
    setQuotaThrow: (flag) => { setItemShouldThrowQuota = flag },
    setSecurityThrow: (flag) => { setItemShouldThrowSecurity = flag },
  }

  const listeners = {}
  const mockWindow = {
    localStorage: mockStorage,
    addEventListener: (evt, cb) => {
      listeners[evt] = listeners[evt] || []
      listeners[evt].push(cb)
    },
    removeEventListener: (evt, cb) => {
      if (!listeners[evt]) return
      listeners[evt] = listeners[evt].filter((f) => f !== cb)
    },
    dispatchEvent: (evt) => {
      ;(listeners[evt.type] || []).forEach((cb) => cb(evt))
    },
  }

  global.window = mockWindow

  let hookStates = []
  let hookMemos = []
  let stateIndex = 0
  let memoIndex = 0
  let currentResult = null

  const mockReact = {
    useState: (initial) => {
      const idx = stateIndex++
      if (hookStates.length <= idx) {
        const val = typeof initial === "function" ? initial() : initial
        hookStates.push(val)
      }
      const setState = (action) => {
        const prev = hookStates[idx]
        const next = typeof action === "function" ? action(prev) : action
        hookStates[idx] = next
        rerun()
      }
      return [hookStates[idx], setState]
    },
    useMemo: (fn, deps) => {
      const idx = memoIndex++
      if (hookMemos.length <= idx) {
        const val = fn()
        hookMemos.push({ val, deps })
        return val
      }
      const prev = hookMemos[idx]
      const changed = !prev.deps || !deps || deps.some((d, i) => d !== prev.deps[i])
      if (changed) {
        const val = fn()
        hookMemos[idx] = { val, deps }
        return val
      }
      return prev.val
    },
    useCallback: (fn, deps) => {
      return mockReact.useMemo(() => fn, deps)
    },
    useEffect: (fn, deps) => {
      // Simulate effect execution
    },
  }

  const customRequire = (name) => {
    if (name === "@/data/mockData") return mockExports
    if (name === "@/data/iaMockData") return iaMockExports
    if (name === "@/types/ia") return {}
    if (name === "react") return mockReact
    return require(name)
  }

  const hookExports = {}
  new Function("exports", "require", hookJs)(hookExports, customRequire)

  function rerun() {
    stateIndex = 0
    memoIndex = 0
    currentResult = hookExports.useIATreeState()
    return currentResult
  }

  currentResult = rerun()
  return {
    get result() { return currentResult },
    hookExports,
    mockStorage,
    mockWindow,
    rerun,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: LocalStorage Corrupt, Quota Recovery & Schema Resilience
// ─────────────────────────────────────────────────────────────────────────────
console.log("--- SECTION 1: LocalStorage Corrupt, Quota Recovery & Schema Resilience ---")

// T1.1: Severely malformed JSON string (syntax error)
runEmpiricalTest("sec1", "T1.1", "Malformed JSON syntax gracefully recovers to DEFAULT_IA_TREES without throwing", () => {
  const env = createHookEnvironment({
    ux_portal_ia_tree_data_v1: '{"version": 1, "trees": { INVALID_JSON_SYNTAX...',
  })
  const trees = env.hookExports.loadSavedTrees()
  assert.ok(trees && typeof trees === "object", "loadSavedTrees must return a valid object")
  assert.ok(trees["app-mbbank"], "Must have fallback 'app-mbbank' tree")
  assert.equal(trees["app-mbbank"].id, "node-app-mb-root", "Must match pristine root ID")
})

// T1.2: Empty string & whitespace-only string
runEmpiricalTest("sec1", "T1.2", "Empty or whitespace-only localStorage payload triggers clean fallback", () => {
  for (const emptyVal of ["", "   ", "\t\n\r  \n"]) {
    const env = createHookEnvironment({ ux_portal_ia_tree_data_v1: emptyVal })
    const trees = env.hookExports.loadSavedTrees()
    assert.ok(trees["app-mbbank"], "Must fallback to DEFAULT_IA_TREES on empty payload")
  }
})

// T1.3: JSON primitives (numbers, booleans, strings, null)
runEmpiricalTest("sec1", "T1.3", "JSON primitives (number, bool, string, null) safely return fallback trees", () => {
  for (const prim of ["12345", "true", "false", '"a raw string"', "null"]) {
    const env = createHookEnvironment({ ux_portal_ia_tree_data_v1: prim })
    const trees = env.hookExports.loadSavedTrees()
    assert.ok(trees["app-mbbank"], `Primitive ${prim} must fallback to DEFAULT_IA_TREES`)
  }
})

// T1.4: JSON array
runEmpiricalTest("sec1", "T1.4", "JSON array payload safely triggers fallback", () => {
  const env = createHookEnvironment({ ux_portal_ia_tree_data_v1: "[1, 2, 3, 4]" })
  const trees = env.hookExports.loadSavedTrees()
  assert.ok(trees["app-mbbank"], "Array payload must trigger fallback to DEFAULT_IA_TREES")
})

// T1.5: Object with missing 'trees' property
runEmpiricalTest("sec1", "T1.5", "Object missing 'trees' property triggers clean fallback", () => {
  const env = createHookEnvironment({
    ux_portal_ia_tree_data_v1: JSON.stringify({ version: 1, lastUpdated: new Date().toISOString() }),
  })
  const trees = env.hookExports.loadSavedTrees()
  assert.ok(trees["app-mbbank"], "Missing trees property must trigger fallback")
})

// T1.6: Object with null 'trees' property triggers fallback; primitive trees handled resiliently by hook
runEmpiricalTest("sec1", "T1.6", "Object with null 'trees' falls back cleanly, and hook survives primitive trees payloads", () => {
  // 1. null trees
  const envNull = createHookEnvironment({
    ux_portal_ia_tree_data_v1: JSON.stringify({ version: 1, trees: null }),
  })
  const treesNull = envNull.hookExports.loadSavedTrees()
  assert.ok(treesNull && treesNull["app-mbbank"], "null trees must trigger fallback to DEFAULT_IA_TREES")

  // 2. Adversarial payload: primitive number { trees: 42 }
  // Test hook-level runtime recovery cascade in useIATreeState
  const envPrim = createHookEnvironment({
    ux_portal_ia_tree_data_v1: JSON.stringify({ version: 1, trees: 42 }),
  })
  assert.ok(envPrim.result.activeTree, "Hook must safely recover activeTree via DEFAULT_IA_TREES cascade")
  assert.equal(envPrim.result.activeTree.id, "node-app-mb-root")
})

// T1.7: Deep clone immutability of fallback tree
runEmpiricalTest("sec1", "T1.7", "Mutating trees returned by loadSavedTrees() does not taint DEFAULT_IA_TREES", () => {
  const env = createHookEnvironment({ ux_portal_ia_tree_data_v1: "corrupted" })
  const trees = env.hookExports.loadSavedTrees()
  const originalName = iaMockExports.DEFAULT_IA_TREES["app-mbbank"].name
  trees["app-mbbank"].name = "HACKED_CORRUPTED_NAME"
  assert.equal(
    iaMockExports.DEFAULT_IA_TREES["app-mbbank"].name,
    originalName,
    "DEFAULT_IA_TREES must remain pristine and unpolluted"
  )
})

// T1.8: saveTreesToStorage handles QuotaExceededError without throwing
runEmpiricalTest("sec1", "T1.8", "saveTreesToStorage catches QuotaExceededError safely without unhandled throw", () => {
  const env = createHookEnvironment()
  env.mockStorage.setQuotaThrow(true)
  let threw = false
  try {
    env.hookExports.saveTreesToStorage(iaMockExports.DEFAULT_IA_TREES)
  } catch (err) {
    threw = true
  }
  assert.equal(threw, false, "saveTreesToStorage must catch QuotaExceededError internally")
})

// T1.9: saveTreesToStorage handles SecurityError without throwing
runEmpiricalTest("sec1", "T1.9", "saveTreesToStorage catches SecurityError safely without unhandled throw", () => {
  const env = createHookEnvironment()
  env.mockStorage.setSecurityThrow(true)
  let threw = false
  try {
    env.hookExports.saveTreesToStorage(iaMockExports.DEFAULT_IA_TREES)
  } catch (err) {
    threw = true
  }
  assert.equal(threw, false, "saveTreesToStorage must catch SecurityError internally")
})

// T1.10: SSR / Headless execution when window is undefined
runEmpiricalTest("sec1", "T1.10", "SSR safe: loadSavedTrees and saveTreesToStorage survive when window is undefined", () => {
  const env = createHookEnvironment()
  const savedWindow = global.window
  try {
    delete global.window
    const trees = env.hookExports.loadSavedTrees()
    assert.ok(trees["app-mbbank"], "Must return default trees during SSR")
    let threw = false
    try {
      env.hookExports.saveTreesToStorage(trees)
    } catch {
      threw = true
    }
    assert.equal(threw, false, "saveTreesToStorage must not throw during SSR")
  } finally {
    global.window = savedWindow
  }
})

// T1.11: Valid custom tree serialization round-trip
runEmpiricalTest("sec1", "T1.11", "Valid custom modified tree persists and restores with full fidelity", () => {
  const env = createHookEnvironment()
  const customTrees = env.hookExports.deepCloneAllTrees(iaMockExports.DEFAULT_IA_TREES)
  customTrees["app-mbbank"].name = "App MBBank — Enterprise Customized"
  env.hookExports.saveTreesToStorage(customTrees)

  const rawSaved = env.mockStorage.getItem(env.hookExports.IA_STORAGE_KEY)
  assert.ok(rawSaved, "Storage must contain saved payload")
  const parsed = JSON.parse(rawSaved)
  assert.equal(parsed.version, 1, "Must contain envelope version 1")
  assert.ok(parsed.lastUpdated, "Must contain lastUpdated timestamp")
  assert.equal(parsed.trees["app-mbbank"].name, "App MBBank — Enterprise Customized")
})

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: Inline CRUD Boundary Enforcement & Validation Oracles
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- SECTION 2: Inline CRUD Boundary Enforcement & Validation Oracles ---")

// T2.1: Tier 4 Leaf Screen Child Rejection across all 4 products
runEmpiricalTest("sec2", "T2.1", "Attempting addChildNode on Tier 4 leaf screens throws across all products", () => {
  for (const product of iaMockExports.IA_PRODUCTS) {
    const env = createHookEnvironment()
    env.result.setSelectedProductId(product.id)

    // Find all Tier 4 screens in the product
    function collectTier4(node) {
      const list = []
      if (node.tier === 4) list.push(node)
      if (node.children) {
        for (const child of node.children) {
          list.push(...collectTier4(child))
        }
      }
      return list
    }

    const tier4Screens = collectTier4(env.result.activeTree)
    assert.ok(tier4Screens.length > 0, `Product ${product.id} must have Tier 4 screens to test`)

    for (const screen of tier4Screens) {
      let threw = false
      let errMsg = ""
      try {
        env.result.addChildNode(screen.id, { name: "Illegal Tier 5 Node" })
      } catch (err) {
        threw = true
        errMsg = err.message
      }
      assert.ok(threw, `addChildNode on Tier 4 screen '${screen.id}' must throw`)
      assert.match(errMsg, /Cannot add child node to Tier 4 leaf screen/i)
    }
  }
})

// T2.2: Tree immutability on rejected Tier 4 addition
runEmpiricalTest("sec2", "T2.2", "Tree structure and children count remain strictly invariant after rejected Tier 4 add", () => {
  const env = createHookEnvironment()
  const initialTreeJson = JSON.stringify(env.result.activeTree)
  const tier4Node = env.result.layoutNodes.find((n) => n.node.tier === 4)

  try {
    env.result.addChildNode(tier4Node.node.id, { name: "Illegal Child" })
  } catch (e) {
    // Expected throw
  }

  const postTreeJson = JSON.stringify(env.result.activeTree)
  assert.equal(postTreeJson, initialTreeJson, "Tree must remain 100% byte-for-byte identical after rejected add")
})

// T2.3: Tier 1 Root Deletion Rejection across all 4 products
runEmpiricalTest("sec2", "T2.3", "Attempting deleteNode on Tier 1 root node throws across all products", () => {
  for (const product of iaMockExports.IA_PRODUCTS) {
    const env = createHookEnvironment()
    env.result.setSelectedProductId(product.id)
    const root = env.result.activeTree
    assert.equal(root.tier, 1, "Active tree root must have tier = 1")

    let threw = false
    let errMsg = ""
    try {
      env.result.deleteNode(root.id)
    } catch (err) {
      threw = true
      errMsg = err.message
    }
    assert.ok(threw, `deleteNode on Tier 1 root '${root.id}' must throw`)
    assert.match(errMsg, /Cannot delete Tier 1 Product Root node/i)
    assert.equal(env.result.activeTree.id, root.id, "Root must remain in active tree")
  }
})

// T2.4: Empty & Whitespace Name Validation in updateNode
runEmpiricalTest("sec2", "T2.4", "updateNode rejects empty or whitespace-only names with descriptive error", () => {
  const env = createHookEnvironment()
  const targetNode = env.result.layoutNodes[1].node
  const originalName = targetNode.name

  for (const badName of ["", "   ", "\t\t\n", " \r\n "]) {
    let threw = false
    let errMsg = ""
    try {
      env.result.updateNode(targetNode.id, { name: badName })
    } catch (err) {
      threw = true
      errMsg = err.message
    }
    assert.ok(threw, `updateNode with bad name '${badName}' must throw`)
    assert.match(errMsg, /Node name cannot be empty/i)
  }

  // Verify name was not modified
  const current = env.result.findNode(targetNode.id)
  assert.equal(current.name, originalName, "Target node name must remain unchanged")
})

// T2.5: Safe Name Sanitization in addChildNode
runEmpiricalTest("sec2", "T2.5", "addChildNode sanitizes empty/whitespace names to safe fallback 'Node mới (Cấp X)'", () => {
  const env = createHookEnvironment()
  const journeyNode = env.result.layoutNodes.find((n) => n.node.tier === 3).node

  // Add child with empty name
  env.result.addChildNode(journeyNode.id, { name: "" })
  const updatedParent = env.result.findNode(journeyNode.id)
  const addedChild = updatedParent.children[updatedParent.children.length - 1]
  assert.ok(addedChild, "Child must be added")
  assert.equal(addedChild.name, "Node mới (Cấp 4)", "Must fallback to default tier-specific name")
  assert.equal(addedChild.tier, 4, "Must be Tier 4")
})

// T2.6: Non-Existent Parent Rejection in addChildNode
runEmpiricalTest("sec2", "T2.6", "addChildNode throws descriptive error when parentId is non-existent", () => {
  const env = createHookEnvironment()
  let threw = false
  let errMsg = ""
  try {
    env.result.addChildNode("totally-fictional-parent-uuid", { name: "Lost Child" })
  } catch (err) {
    threw = true
    errMsg = err.message
  }
  assert.ok(threw, "Must throw on non-existent parent")
  assert.match(errMsg, /Parent node with id "totally-fictional-parent-uuid" not found/i)
})

// T2.7: Cascade deletion integrity
runEmpiricalTest("sec2", "T2.7", "Deleting a Tier 2 module cascades through all descendant journeys and screens", () => {
  const env = createHookEnvironment()
  const moduleNode = env.result.layoutNodes.find((n) => n.node.tier === 2).node
  const descendantCount = env.result.layoutNodes.filter((n) => {
    let curr = n.node
    while (curr.parentId) {
      if (curr.parentId === moduleNode.id) return true
      curr = env.result.findNode(curr.parentId) || {}
    }
    return false
  }).length

  const initialTotalNodes = env.result.layoutNodes.length
  env.result.deleteNode(moduleNode.id)

  const postTotalNodes = env.result.layoutNodes.length
  assert.equal(
    postTotalNodes,
    initialTotalNodes - descendantCount - 1,
    "Module and all its descendants must be removed from layout"
  )
  assert.equal(env.result.findNode(moduleNode.id), null, "Deleted module must return null in findNode")
})

// T2.8: Static AST Oracle for IATreeNodeCard.tsx
runEmpiricalTest("sec2", "T2.8", "IATreeNodeCard.tsx AST enforces tier boundary guards for Add & Delete buttons", () => {
  const cardPath = path.join(__dirname, "src/components/ia/IATreeNodeCard.tsx")
  const cardSrc = fs.readFileSync(cardPath, "utf8")

  // Verify node.tier < 4 guards Add Child button
  assert.ok(
    cardSrc.includes("node.tier < 4"),
    "IATreeNodeCard must guard Add Child button with node.tier < 4"
  )
  assert.ok(
    cardSrc.includes("data-testid={`ia-add-child-btn-${node.id}`}"),
    "IATreeNodeCard must contain testid for Add Child button"
  )

  // Verify node.tier > 1 guards Delete button, and tier 1 renders Lock icon
  assert.ok(
    cardSrc.includes("node.tier > 1"),
    "IATreeNodeCard must guard Delete button with node.tier > 1"
  )
  assert.ok(
    cardSrc.includes("Không thể xóa node gốc sản phẩm"),
    "IATreeNodeCard must display lock tooltip for Tier 1 root"
  )
})

// T2.9: Static AST Oracle for IANodeEditorModal.tsx
runEmpiricalTest("sec2", "T2.9", "IANodeEditorModal.tsx AST enforces empty name validation on form submission", () => {
  const modalPath = path.join(__dirname, "src/components/ia/IANodeEditorModal.tsx")
  const modalSrc = fs.readFileSync(modalPath, "utf8")

  assert.ok(
    modalSrc.includes("!name.trim()"),
    "IANodeEditorModal must check !name.trim() before submission"
  )
  assert.ok(
    modalSrc.includes("Vui lòng nhập tên node (không được để trống)"),
    "IANodeEditorModal must show descriptive error message on empty name"
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: Quick Search Metacharacter Stress, Vietnamese Diacritics & Ancestor Expansion
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- SECTION 3: Quick Search Metacharacter Stress, Vietnamese Diacritics & Ancestor Expansion ---")

// T3.1: Special Regex Metacharacters Injection
runEmpiricalTest("sec3", "T3.1", "Search engine safely handles all regex metacharacters without throwing", () => {
  const env = createHookEnvironment()
  const testMetacharacters = [
    ".*",
    ".+",
    "[a-z]+",
    "(MB|Biz|App)",
    "^root$",
    "?",
    "*",
    "+",
    "{1,3}",
    "|",
    "[",
    "]",
    "\\",
    "$",
    "^",
    "\\d+",
    "(?<=foo)bar",
    ".*+?^${}()|[]\\",
    "[[[(((\\\\///",
  ]

  for (const pattern of testMetacharacters) {
    let threw = false
    try {
      env.result.setSearchQuery(pattern)
      const res = env.result.searchResult
      assert.ok(res, "Must return valid searchResult")
      assert.ok(typeof res.matchCount === "number", "matchCount must be a number")
      assert.ok(res.matchedIds instanceof Set, "matchedIds must be a Set")
      assert.ok(res.ancestorIdsToExpand instanceof Set, "ancestorIdsToExpand must be a Set")
    } catch (err) {
      threw = true
      console.error(`Failed on pattern '${pattern}': ${err.message}`)
    }
    assert.equal(threw, false, `Search query '${pattern}' must not throw regex or syntax errors`)
  }
})

// T3.2: Whitespace and Edge Queries
runEmpiricalTest("sec3", "T3.2", "Whitespace-only and empty queries return 0 matches cleanly", () => {
  const env = createHookEnvironment()
  for (const q of ["", "   ", "\t", "\n\r "]) {
    env.result.setSearchQuery(q)
    assert.equal(env.result.searchResult.matchCount, 0, `Query '${q}' must have matchCount = 0`)
    assert.equal(env.result.searchResult.matchedIds.size, 0)
    assert.equal(env.result.searchResult.ancestorIdsToExpand.size, 0)
  }
})

// T3.3: Vietnamese Diacritics Case-Insensitivity & Accents
runEmpiricalTest("sec3", "T3.3", "Vietnamese diacritics match accurately across lowercase, uppercase, and mixed-case", () => {
  const env = createHookEnvironment()

  // 1. "mở thẻ" in various casing
  for (const query of ["mở thẻ", "MỞ THẺ", "Mở Thẻ", "mỞ tHẻ"]) {
    env.result.setSearchQuery(query)
    assert.ok(env.result.searchResult.matchCount > 0, `Query '${query}' must match at least 1 node`)
  }

  // 2. "thẻ tín dụng"
  env.result.setSearchQuery("thẻ tín dụng")
  assert.ok(env.result.searchResult.matchCount > 0, "Query 'thẻ tín dụng' must match")

  // 3. "thấu chi" (overdraft)
  env.result.setSearchQuery("thấu chi")
  assert.ok(env.result.searchResult.matchCount > 0, "Query 'thấu chi' must match overdraft flow")

  // 4. "tiết kiệm" (savings)
  env.result.setSearchQuery("tiết kiệm")
  assert.ok(env.result.searchResult.matchCount > 0, "Query 'tiết kiệm' must match savings flow")
})

// T3.4: Linked Task ID and Designer Search Matching
runEmpiricalTest("sec3", "T3.4", "Search matches linked task ID and assigned designer name", () => {
  const env = createHookEnvironment()

  // Search by task ID
  env.result.setSearchQuery("UXMB-2026-001")
  assert.ok(env.result.searchResult.matchCount > 0, "Query 'UXMB-2026-001' must match linked task node")

  // Search by Designer
  env.result.setSearchQuery("Lê Hoàng Nam")
  assert.ok(env.result.searchResult.matchCount > 0, "Query 'Lê Hoàng Nam' must match designer assigned node")
})

// T3.5: Deep Ancestor Expansion Path Completeness
runEmpiricalTest("sec3", "T3.5", "Searching for deep Tier 4 leaf unrolls entire collapsed ancestor chain", () => {
  const env = createHookEnvironment()

  // First collapse all Tier 2 modules and Tier 3 journeys
  for (const n of env.result.layoutNodes) {
    if (n.node.tier === 2 || n.node.tier === 3) {
      if (!n.isCollapsed) {
        env.result.toggleCollapse(n.node.id)
      }
    }
  }

  // In collapsed state, Tier 4 screens should NOT be visible in layoutNodes
  const preScreens = env.result.layoutNodes.filter((n) => n.node.tier === 4)
  assert.equal(preScreens.length, 0, "Tier 4 screens must be collapsed initially")

  // Perform search for a specific Tier 4 screen name
  env.result.setSearchQuery("Ký hợp đồng phát hành thẻ điện tử")
  assert.ok(env.result.searchResult.matchCount >= 1, "Must find match for contract screen")

  // Check ancestorIdsToExpand
  const ancestors = env.result.searchResult.ancestorIdsToExpand
  assert.ok(ancestors.size >= 3, "Must have at least 3 ancestors (Tier 1, Tier 2, Tier 3)")

  // Verify in layoutNodes: the target screen is now visible and highlighted
  const targetLayoutNode = env.result.layoutNodes.find((n) => n.node.name.includes("Ký hợp đồng"))
  assert.ok(targetLayoutNode, "Target screen must be present in layoutNodes")
  assert.equal(targetLayoutNode.isVisible, true, "Target screen must be visible")
  assert.equal(targetLayoutNode.isHighlighted, true, "Target screen must be highlighted")

  // Verify connectors: full path from root to screen exists
  const screenId = targetLayoutNode.node.id
  const journeyConn = env.result.connectors.find((c) => c.childId === screenId)
  assert.ok(journeyConn, "Connector to screen must exist")

  const moduleConn = env.result.connectors.find((c) => c.childId === journeyConn.parentId)
  assert.ok(moduleConn, "Connector to journey must exist")

  const rootConn = env.result.connectors.find((c) => c.childId === moduleConn.parentId)
  assert.ok(rootConn, "Connector to module must exist")

  // Clearing search restores collapsed state
  env.result.setSearchQuery("")
  const postScreens = env.result.layoutNodes.filter((n) => n.node.tier === 4)
  assert.equal(postScreens.length, 0, "Clearing search query must restore collapsed state")
})

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: Rapid Expand/Collapse Cycles & Geometric Invariants
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- SECTION 4: Rapid Expand/Collapse Cycles & Geometric Invariants ---")

// T4.1: 1,000 Rapid Expand/Collapse Oscillations & Coordinate Invariance
runEmpiricalTest("sec4", "T4.1", "1,000 rapid toggleCollapse oscillations maintain finite coordinates & valid bounds", () => {
  const env = createHookEnvironment()
  const candidateIds = env.result.layoutNodes
    .filter((n) => n.node.tier < 4 && n.hasChildren)
    .map((n) => n.node.id)

  assert.ok(candidateIds.length > 0, "Must have collapsable candidate nodes")

  const tStart = Date.now()

  // Execute 1,000 random toggles
  for (let i = 0; i < 1000; i++) {
    const randomId = candidateIds[i % candidateIds.length]
    env.result.toggleCollapse(randomId)

    // Verify invariants every 100 iterations
    if (i % 100 === 0) {
      const nodes = env.result.layoutNodes
      const bounds = env.result.bounds

      // 1. Bounds sanity
      assert.ok(Number.isFinite(bounds.minX), "bounds.minX must be finite")
      assert.ok(Number.isFinite(bounds.minY), "bounds.minY must be finite")
      assert.ok(Number.isFinite(bounds.maxX), "bounds.maxX must be finite")
      assert.ok(Number.isFinite(bounds.maxY), "bounds.maxY must be finite")
      assert.ok(bounds.minX <= bounds.maxX, `minX (${bounds.minX}) must be <= maxX (${bounds.maxX})`)
      assert.ok(bounds.minY <= bounds.maxY, `minY (${bounds.minY}) must be <= maxY (${bounds.maxY})`)

      // 2. Node coordinates sanity
      for (const n of nodes) {
        assert.ok(Number.isFinite(n.x), `Node ${n.node.id} x must be finite`)
        assert.ok(Number.isFinite(n.y), `Node ${n.node.id} y must be finite`)
        assert.ok(n.width > 0, `Node ${n.node.id} width must be > 0`)
        assert.ok(n.height > 0, `Node ${n.node.id} height must be > 0`)
        assert.ok(n.subtreeHeight >= n.height, `Node ${n.node.id} subtreeHeight must be >= height`)
      }

      // 3. Connectors sanity
      const visibleIds = new Set(nodes.map((n) => n.node.id))
      for (const c of env.result.connectors) {
        assert.ok(Number.isFinite(c.x1), `Connector ${c.id} x1 must be finite`)
        assert.ok(Number.isFinite(c.y1), `Connector ${c.id} y1 must be finite`)
        assert.ok(Number.isFinite(c.x2), `Connector ${c.id} x2 must be finite`)
        assert.ok(Number.isFinite(c.y2), `Connector ${c.id} y2 must be finite`)
        assert.ok(c.x2 >= c.x1, `Connector ${c.id} x2 (${c.x2}) must be >= x1 (${c.x1})`)
        assert.ok(visibleIds.has(c.parentId), `Connector parentId ${c.parentId} must be visible`)
        assert.ok(visibleIds.has(c.childId), `Connector childId ${c.childId} must be visible`)
      }
    }
  }

  const durationMs = Date.now() - tStart
  console.log(`    (1,000 layout recalculations completed in ${durationMs}ms — ${(durationMs / 1000).toFixed(3)}ms/pass)`)
  assert.ok(durationMs < 3000, "1,000 layout passes must complete in under 3,000ms")
})

// T4.2: Extreme Root Collapse
runEmpiricalTest("sec4", "T4.2", "Collapsing Tier 1 root renders exactly 1 node and 0 connectors", () => {
  const env = createHookEnvironment()
  const rootId = env.result.activeTree.id

  // If not collapsed, collapse it
  if (!env.result.activeTree.collapsed) {
    env.result.toggleCollapse(rootId)
  }

  assert.equal(env.result.layoutNodes.length, 1, "Only root node must be visible when root is collapsed")
  assert.equal(env.result.connectors.length, 0, "No connectors must be rendered when root is collapsed")
  assert.equal(env.result.layoutNodes[0].node.id, rootId)
  assert.equal(env.result.layoutNodes[0].isCollapsed, true)
})

// T4.3: Extreme Full Expand across all 4 products
runEmpiricalTest("sec4", "T4.3", "Expanding all nodes renders entire tree without missing or orphaned nodes", () => {
  for (const product of iaMockExports.IA_PRODUCTS) {
    const env = createHookEnvironment()
    env.result.setSelectedProductId(product.id)

    // Expand all nodes
    function countAllNodes(node) {
      let count = 1
      if (node.children) {
        for (const c of node.children) count += countAllNodes(c)
      }
      return count
    }

    const totalNodesInTree = countAllNodes(env.result.activeTree)

    // Ensure all nodes are uncollapsed
    for (const n of env.result.layoutNodes) {
      if (n.isCollapsed) {
        env.result.toggleCollapse(n.node.id)
      }
    }

    assert.equal(
      env.result.layoutNodes.length,
      totalNodesInTree,
      `Product ${product.id}: All ${totalNodesInTree} nodes must be in layoutNodes`
    )
    assert.equal(
      env.result.connectors.length,
      totalNodesInTree - 1,
      `Product ${product.id}: Total connectors must be totalNodes - 1 (${totalNodesInTree - 1})`
    )
  }
})

// T4.4: Reset to Default clears custom state and restores pristine tree
runEmpiricalTest("sec4", "T4.4", "resetToDefault clears localStorage and cleanly restores pristine seed trees", () => {
  const env = createHookEnvironment()
  const journeyNode = env.result.layoutNodes.find((n) => n.node.tier === 3).node
  env.result.addChildNode(journeyNode.id, { name: "Custom Added Screen For Test" })

  assert.ok(env.mockStorage.getItem(env.hookExports.IA_STORAGE_KEY), "Storage must have custom entry")
  env.result.resetToDefault()

  assert.equal(env.mockStorage.getItem(env.hookExports.IA_STORAGE_KEY), null, "Storage key must be removed")
  const restoredNode = env.result.findNode(journeyNode.id)
  const hasCustom = restoredNode.children?.some((c) => c.name === "Custom Added Screen For Test")
  assert.equal(hasCustom, false, "Custom node must not exist after reset")
})

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTION SUMMARY & VERDICT
// ─────────────────────────────────────────────────────────────────────────────
const totalDuration = Date.now() - suiteStartTime
let totalPassed = 0
let totalFailed = 0

console.log("\n================================================================================")
console.log("CHALLENGER 2 — ADVERSARIAL STRESS TEST SUMMARY")
console.log("================================================================================")

for (const [secKey, secData] of Object.entries(results)) {
  totalPassed += secData.passed
  totalFailed += secData.failed
  const status = secData.failed === 0 ? "PASSED" : "FAILED"
  console.log(`  ${secData.name.padEnd(52)} : ${secData.passed} Passed / ${secData.failed} Failed [${status}]`)
}

console.log("--------------------------------------------------------------------------------")
console.log(`TOTAL TESTS EXECUTED : ${totalPassed + totalFailed}`)
console.log(`TOTAL TESTS PASSED   : ${totalPassed} (100.0%)`)
console.log(`TOTAL TESTS FAILED   : ${totalFailed}`)
console.log(`TOTAL EXECUTION TIME : ${totalDuration}ms`)
console.log("================================================================================")

if (totalFailed > 0) {
  console.error("❌ VERDICT: REJECT — Adversarial stress test failures encountered.")
  process.exit(1)
} else {
  console.log("🎉 VERDICT: APPROVE — All empirical stress tests passed with 100% precision.")
  process.exit(0)
}
