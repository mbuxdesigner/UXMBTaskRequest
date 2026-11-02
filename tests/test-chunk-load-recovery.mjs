import assert from "node:assert/strict"
import { isChunkLoadError } from "../src/lib/chunkLoadRecovery.ts"

assert.equal(
  isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: /assets/IAPage-old.js")),
  true
)
assert.equal(isChunkLoadError(new Error("Loading chunk abc-123 failed")), true)
assert.equal(isChunkLoadError(new Error("ChunkLoadError: missing chunk")), true)
assert.equal(isChunkLoadError(new Error("Regular component render error")), false)

console.log("✓ Dynamic import failures are detected for one-time build refresh")
