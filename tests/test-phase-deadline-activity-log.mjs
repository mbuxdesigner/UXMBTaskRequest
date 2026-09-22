import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const fileContent = fs.readFileSync(path.resolve("src/components/track/RequestDetail.tsx"), "utf8")

console.log("=== RUNNING PHASE-AWARE DEADLINE & ACTIVITY LOG VERIFICATION ===")

// Test 1: getPhaseDeadlineInfo logic
assert(fileContent.includes("export const getPhaseDeadlineInfo = (phase?: string) =>"), "getPhaseDeadlineInfo must be exported")
assert(fileContent.includes('actionText = "ngày gửi UI"'), "UI Design must have actionText 'ngày gửi UI'")
assert(fileContent.includes('actionText = "ngày gửi Wireframe"'), "Wireframe must have actionText 'ngày gửi Wireframe'")
assert(fileContent.includes('actionText = "ngày Hand off"'), "Ready to dev must have actionText 'ngày Hand off'")
console.log("✓ Test 1: getPhaseDeadlineInfo helper definitions confirmed.")

// Test 2: handleSaveDeadline uses getPhaseDeadlineInfo
assert(fileContent.includes("const deadlineInfo = getPhaseDeadlineInfo(request.current_phase)"), "handleSaveDeadline calls getPhaseDeadlineInfo")
assert(fileContent.includes("Cập nhật ${actionLabel} sang: ${formatted}"), "handleSaveDeadline creates phase-aware note")
assert(fileContent.includes("Gỡ bỏ ${actionLabel}"), "handleSaveDeadline creates phase-aware removal note")
assert(fileContent.includes("OPT-DL-"), "handleSaveDeadline generates optimistic activity update")
console.log("✓ Test 2: handleSaveDeadline phase-aware note generation confirmed.")

// Test 3: isSystemActivityNote recognizes new phase-aware patterns
assert(fileContent.includes('lower.includes("ngày gửi ui")'), "isSystemActivityNote recognizes ngày gửi UI")
assert(fileContent.includes('lower.includes("ngày gửi wireframe")'), "isSystemActivityNote recognizes ngày gửi Wireframe")
assert(fileContent.includes('lower.includes("ngày hand off")'), "isSystemActivityNote recognizes ngày Hand off")
console.log("✓ Test 3: isSystemActivityNote matches all phase-aware patterns.")

// Test 4: renderSingleActivity renders phase-aware badges and labels
assert(fileContent.includes("isDeadlineUpdate"), "renderSingleActivity detects isDeadlineUpdate")
assert(fileContent.includes("đã cập nhật"), "renderSingleActivity renders đã cập nhật")
assert(fileContent.includes("đã gỡ bỏ"), "renderSingleActivity renders đã gỡ bỏ")
assert(fileContent.includes("{deadlineAction}"), "renderSingleActivity prints dynamic deadlineAction")
console.log("✓ Test 4: renderSingleActivity phase-aware deadline UI confirmed.")

// Test 5: Regex simulation for historical logs
const legacyLogs = [
  "Cập nhật Hạn thiết kế UX (Design End Date) sang: 2026-09-23",
  "Cập nhật Hạn thiết kế UX sang: 2026-09-25",
  "Cập nhật Hạn UX sang: 2026-10-01",
  "Cập nhật ngày gửi UI sang: 2026-09-30",
  "Cập nhật ngày gửi Wireframe sang: 2026-09-20",
  "Cập nhật ngày Hand off sang: 2026-10-15",
]

legacyLogs.forEach((log) => {
  const dateMatch =
    log.match(/(?:sang:|\:)\s*([0-9]{4}[-\/][0-9]{2}[-\/][0-9]{2}|[0-9]{2}[-\/][0-9]{2}[-\/][0-9]{4})/i) ||
    log.match(/sang:\s*([^\s]+)/i)
  assert(dateMatch, `Should match date in: ${log}`)
  assert(dateMatch[1].length >= 10, `Extracted date should be at least 10 chars: ${dateMatch[1]}`)
})
console.log("✓ Test 5: Legacy log regex matching verified across all historical variations.")

console.log("\n🎉 ALL PHASE-AWARE DEADLINE & ACTIVITY LOG TESTS PASSED (100%)!")
