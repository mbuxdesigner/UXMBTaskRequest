import assert from "assert";

console.log("================================================================================");
console.log("TEST SUITE: IA CLOUD AUTO-CHUNKING & PAYLOAD SANITIZER VERIFICATION");
console.log("================================================================================");

// 1. Simulation of backend Auto-Chunking logic
function simulateBackendChunkSave(configsToSave, existingSheetRows = {}) {
  const MAX_CELL_LIMIT = 40000;
  const sheetRows = { ...existingSheetRows };

  for (const configKey in configsToSave) {
    const payloadStr = JSON.stringify(configsToSave[configKey]);
    if (payloadStr.length <= MAX_CELL_LIMIT) {
      sheetRows[configKey] = payloadStr;
      if (sheetRows[configKey + "_CHUNKS"]) {
        sheetRows[configKey + "_CHUNKS"] = "0";
      }
    } else {
      const numChunks = Math.ceil(payloadStr.length / MAX_CELL_LIMIT);
      sheetRows[configKey] = "[MULTI_CHUNK:" + numChunks + "]";
      sheetRows[configKey + "_CHUNKS"] = String(numChunks);
      for (let c = 0; c < numChunks; c++) {
        const chunkPart = payloadStr.substring(c * MAX_CELL_LIMIT, (c + 1) * MAX_CELL_LIMIT);
        sheetRows[configKey + "_CHUNK_" + c] = chunkPart;
      }
      let excess = numChunks;
      while (sheetRows[configKey + "_CHUNK_" + excess] !== undefined) {
        sheetRows[configKey + "_CHUNK_" + excess] = "";
        excess++;
      }
    }
  }

  return sheetRows;
}

// 2. Simulation of backend Auto-Reassembly logic
function simulateBackendReadMasterData(sheetRows) {
  const masterData = {};
  const rawMap = { ...sheetRows };

  for (const key in rawMap) {
    if (key.endsWith("_CHUNKS") || /_CHUNK_\d+$/.test(key)) {
      continue;
    }
    if (rawMap[key + "_CHUNKS"]) {
      const chunkCount = parseInt(rawMap[key + "_CHUNKS"], 10) || 0;
      if (chunkCount > 0) {
        let fullStr = "";
        for (let c = 0; c < chunkCount; c++) {
          fullStr += (rawMap[key + "_CHUNK_" + c] || "");
        }
        try {
          masterData[key] = JSON.parse(fullStr);
        } catch (e) {
          masterData[key] = fullStr;
        }
        continue;
      }
    }
    const valStr = rawMap[key];
    if (valStr && !valStr.startsWith("[MULTI_CHUNK:")) {
      try {
        masterData[key] = JSON.parse(valStr);
      } catch (err) {
        masterData[key] = valStr;
      }
    }
  }

  return masterData;
}

// 3. Simulation of frontend sanitizeNodeForStorage logic
function sanitizeNodeForStorage(node) {
  if (!node || typeof node !== "object") return node;
  const clean = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "metrics") continue;
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      if (key === "children") {
        clean.children = value.map(sanitizeNodeForStorage);
      } else {
        clean[key] = value;
      }
    } else if (typeof value === "object") {
      const cleanedObj = sanitizeNodeForStorage(value);
      if (Object.keys(cleanedObj).length > 0) {
        clean[key] = cleanedObj;
      }
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

// ==========================================
// TEST CASES
// ==========================================

// Test 1: Generate a 256-node sitemap structure
console.log("Running Test 1: Generate 256-node realistic sitemap tree...");
const mock256Tree = {
  id: "root-app",
  tier: 1,
  name: "App MBBank Core",
  code: "APP_MB",
  description: "Root Banking Application",
  metrics: { subtreeCount: 255, maxSubtreeDepth: 4 }, // Runtime metrics that should be stripped
  children: []
};

let globalNodeCount = 1;
for (let lv2 = 0; lv2 < 5; lv2++) {
  const lv2Node = {
    id: `node-lv2-${lv2}`,
    tier: 2,
    name: `Module ${lv2} Financial Service`,
    description: "", // Empty string to test sanitizer
    customX: lv2 * 600,
    customY: 120,
    customWidth: 500,
    metrics: { subtreeCount: 63 },
    children: []
  };
  globalNodeCount++;

  for (let lv3 = 0; lv3 < 6; lv3++) {
    const lv3Node = {
      id: `node-lv3-${lv2}-${lv3}`,
      tier: 3,
      name: `Feature Group ${lv2}.${lv3}`,
      taskIds: [], // Empty array to test sanitizer
      metrics: { subtreeCount: 12 },
      children: []
    };
    globalNodeCount++;

    for (let lv4 = 0; lv4 < 8; lv4++) {
      const lv4Node = {
        id: `node-lv4-${lv2}-${lv3}-${lv4}`,
        tier: 4,
        name: `Screen Action ${lv2}.${lv3}.${lv4} with extended details, wireframes, and design specs`,
        taskIds: ["TASK-001", "TASK-002"],
        squad: "Lending & Vay Vốn",
        status: "Đang làm",
        children: [] // Empty children array
      };
      globalNodeCount++;
      lv3Node.children.push(lv4Node);
    }
    lv2Node.children.push(lv3Node);
  }
  mock256Tree.children.push(lv2Node);
}

assert(globalNodeCount > 150, "Should generate > 150 nodes");
console.log(`✓ Test 1: Successfully generated mock tree with ${globalNodeCount} nodes.`);

// Test 2: Verify Frontend Sanitization trims redundant fields
console.log("Running Test 2: Verify Frontend Sanitization...");
const rawJson = JSON.stringify(mock256Tree);
const cleanedTree = sanitizeNodeForStorage(mock256Tree);
const cleanedJson = JSON.stringify(cleanedTree);

console.log(`  - Raw JSON size: ${rawJson.length} bytes`);
console.log(`  - Cleaned JSON size: ${cleanedJson.length} bytes`);
console.log(`  - Reduction: ${Math.round((1 - cleanedJson.length / rawJson.length) * 100)}%`);

assert(!cleanedJson.includes('"metrics"'), "Sanitized JSON must strip runtime metrics");
assert(!cleanedJson.includes('"taskIds":[]'), "Sanitized JSON must strip empty taskIds");
assert(!cleanedJson.includes('"description":""'), "Sanitized JSON must strip empty strings");
console.log("✓ Test 2: Payload sanitizer successfully reduced bloat and removed runtime properties.");

// Test 3: Large payload chunking
console.log("Running Test 3: Auto-Chunking for large sitemaps exceeding 40,000 chars...");
// Create a tree payload that is > 100,000 chars
const largeIaPayload = {
  "App MBBank": cleanedTree,
  "Biz MBBank": cleanedTree,
  "Portal Admin": cleanedTree
};
const largeStr = JSON.stringify(largeIaPayload);
console.log(`  - Large multi-product IA trees payload size: ${largeStr.length} characters`);
assert(largeStr.length > 50000, "Payload must exceed 50,000 cell limit to test chunking");

const savedSheet = simulateBackendChunkSave({
  IA_TREES_DATA: largeIaPayload,
  SQUADS_CONFIG: [{ id: "sq-1", name: "Squad 1" }]
});

// Check chunk cells
const numChunks = parseInt(savedSheet["IA_TREES_DATA_CHUNKS"], 10);
assert(numChunks >= 2, `Expected at least 2 chunks, got ${numChunks}`);
console.log(`  - Stored in ${numChunks} chunks on Google Sheet:`);
for (let c = 0; c < numChunks; c++) {
  const chunkContent = savedSheet["IA_TREES_DATA_CHUNK_" + c];
  assert(chunkContent, `Chunk ${c} must exist`);
  assert(chunkContent.length <= 40000, `Chunk ${c} (${chunkContent.length} chars) must not exceed 40,000 limit!`);
  console.log(`    * IA_TREES_DATA_CHUNK_${c}: ${chunkContent.length} chars (within safe limit)`);
}
assert.strictEqual(savedSheet["IA_TREES_DATA"], `[MULTI_CHUNK:${numChunks}]`);
assert.strictEqual(savedSheet["SQUADS_CONFIG"], JSON.stringify([{ id: "sq-1", name: "Squad 1" }]));
console.log("✓ Test 3: Auto-Chunking successfully partitioned payload into safe <= 40,000 character cells.");

// Test 4: Reassembly & Integrity
console.log("Running Test 4: Auto-Reassembly & 100% data integrity...");
const restoredMasterData = simulateBackendReadMasterData(savedSheet);

assert(restoredMasterData["IA_TREES_DATA"], "Master data must have IA_TREES_DATA");
assert(restoredMasterData["IA_TREES_DATA"]["App MBBank"], "Must have App MBBank");
assert(restoredMasterData["IA_TREES_DATA"]["Biz MBBank"], "Must have Biz MBBank");
assert.strictEqual(
  JSON.stringify(restoredMasterData["IA_TREES_DATA"]),
  JSON.stringify(largeIaPayload),
  "Reassembled data must match original payload 100% character-for-character!"
);
assert.deepStrictEqual(restoredMasterData["SQUADS_CONFIG"], [{ id: "sq-1", name: "Squad 1" }]);
console.log("✓ Test 4: Auto-Reassembly reconstructed original complex IA trees with 100% exact fidelity.");

// Test 5: Shrinking payload cleans up older excess chunks
console.log("Running Test 5: Dynamic payload shrinkage & excess chunk cleanup...");
const smallerPayload = { "App MBBank": { id: "small", tier: 1, name: "Small" } };
const updatedSheet = simulateBackendChunkSave({ IA_TREES_DATA: smallerPayload }, savedSheet);

assert.strictEqual(updatedSheet["IA_TREES_DATA_CHUNKS"], "0");
assert.strictEqual(updatedSheet["IA_TREES_DATA"], JSON.stringify(smallerPayload));
const restoredSmall = simulateBackendReadMasterData(updatedSheet);
assert.deepStrictEqual(restoredSmall["IA_TREES_DATA"], smallerPayload);
console.log("✓ Test 5: Seamless transition from multi-chunk back to single-cell storage when payload shrinks.");

console.log("================================================================================");
console.log("🎉 ALL IA CLOUD AUTO-CHUNKING & PAYLOAD SANITIZER TESTS PASSED (100%)!");
console.log("================================================================================");
