import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  mergeRemoteRequestsPreservingNicknames,
  preserveCachedNickname,
} from "../src/lib/nicknameSync.ts"

const cached = { request_id: "UXMB-1", nickname: "Tên gợi nhớ" }

assert.deepEqual(
  preserveCachedNickname(
    { request_id: "UXMB-1", title: "Tên gốc" },
    { request_id: "UXMB-1", title: "Tên gốc" },
    cached
  ),
  { request_id: "UXMB-1", title: "Tên gốc", nickname: "Tên gợi nhớ" },
  "A response that omits nickname must not erase the cached nickname"
)

assert.deepEqual(
  preserveCachedNickname(
    { request_id: "UXMB-1", nickname: "" },
    { request_id: "UXMB-1", nickname: undefined },
    cached
  ),
  { request_id: "UXMB-1", nickname: undefined },
  "An explicit empty nickname must still clear the cached nickname"
)

assert.deepEqual(
  mergeRemoteRequestsPreservingNicknames(
    [
      { request_id: "UXMB-1", title: "Tên gốc" },
      { request_id: "UXMB-2", nickname: "Tên mới" },
    ],
    (request) => ({ ...request }),
    [cached, { request_id: "UXMB-2", nickname: "Tên cũ" }]
  ),
  [
    { request_id: "UXMB-1", title: "Tên gốc", nickname: "Tên gợi nhớ" },
    { request_id: "UXMB-2", nickname: "Tên mới" },
  ],
  "List sync must preserve only omitted nicknames and accept returned nicknames"
)

console.log("✓ nickname cache merge contract passed")

const backendSource = readFileSync(new URL("../google-apps-script-backend.js", import.meta.url), "utf8")
assert.match(
  backendSource,
  /item\.nickname\s*=\s*cleanNickname\s*\?\s*sanitizeFormulaCell\(cleanNickname\)\s*:\s*""/,
  "Apps Script must store nickname on the task payload"
)
assert.match(
  backendSource,
  /payloadCell\.getValue\(\)/,
  "Apps Script must verify nickname by reading Payload_JSON back"
)
assert.match(
  backendSource,
  /nickname_persistence_version:\s*1/,
  "Apps Script responses must expose the nickname persistence contract version"
)
assert.match(
  backendSource,
  /nickname_persisted:/,
  "Apps Script update response must acknowledge nickname persistence"
)

console.log("✓ Apps Script nickname persistence contract passed")
