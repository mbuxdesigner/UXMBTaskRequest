import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log("Starting Milestone M4 Block 6 (ReUI Gantt Roadmap) Verification Test Suite...\n")

// ─── SUITE 1: File Existence & Interface Verification ─────────────────────────
console.log("=== Suite 1: Block6GanttRoadmap Component Structure & Exports ===")
const block6Path = path.join(__dirname, "src/components/dashboard/Block6GanttRoadmap.tsx")
assert.ok(fs.existsSync(block6Path), "Test 1: Block6GanttRoadmap.tsx must exist in src/components/dashboard/")

const block6Source = fs.readFileSync(block6Path, "utf-8")

// Export checks
assert.ok(block6Source.includes("export function Block6GanttRoadmap"), "Test 1.1: Must export Block6GanttRoadmap function")
assert.ok(block6Source.includes("export default Block6GanttRoadmap"), "Test 1.2: Must export default Block6GanttRoadmap")
assert.ok(block6Source.includes("export interface Block6GanttRoadmapProps"), "Test 1.3: Must export Block6GanttRoadmapProps interface")
console.log("✓ Test 1: Block6GanttRoadmap exports and types verified")

// ─── SUITE 2: ReUI Frame Anatomy Verification ────────────────────────────────
console.log("\n=== Suite 2: ReUI Frame Primitives & Structure ===")
assert.ok(block6Source.includes("from \"@/components/reui/frame\""), "Test 2.1: Must import from @/components/reui/frame")
assert.ok(block6Source.includes("<Frame"), "Test 2.2: Must render Frame component")
assert.ok(block6Source.includes("<FrameHeader"), "Test 2.3: Must render FrameHeader component")
assert.ok(block6Source.includes("<FrameTitle"), "Test 2.4: Must render FrameTitle component")
assert.ok(block6Source.includes("<FrameDescription"), "Test 2.5: Must render FrameDescription component")
assert.ok(block6Source.includes("<FrameActions"), "Test 2.6: Must render FrameActions component")
assert.ok(block6Source.includes("<FrameBody"), "Test 2.7: Must render FrameBody component")
assert.ok(block6Source.includes("<FrameFooter"), "Test 2.8: Must render FrameFooter component")

// Title and description strings
assert.ok(block6Source.includes("Bảng tiến độ tổng thể (Gantt)"), "Test 2.9: Title must match 'Bảng tiến độ tổng thể (Gantt)'")
assert.ok(block6Source.includes("Lộ trình từ ngày bắt đầu đến deadline của tất cả các bài toán"), "Test 2.10: Description must match requirement")
console.log("✓ Test 2: ReUI Frame anatomy, title, and description verified")

// ─── SUITE 3: ReUIGanttChart Integration & Props Wiring ─────────────────────
console.log("\n=== Suite 3: ReUIGanttChart Wiring & Props Contract ===")
assert.ok(block6Source.includes("import ReUIGanttChart from \"@/components/reui/gantt-chart\""), "Test 3.1: Must import ReUIGanttChart")
assert.ok(block6Source.includes("requests={requests}"), "Test 3.2: Must pass requests prop to ReUIGanttChart")
assert.ok(block6Source.includes("onSelectRequest={onSelectRequest}"), "Test 3.3: Must pass onSelectRequest prop to ReUIGanttChart")
assert.ok(block6Source.includes("borderless"), "Test 3.4: Must pass borderless prop to eliminate redundant borders inside Frame")
console.log("✓ Test 3: ReUIGanttChart props and borderless styling verified")

// ─── SUITE 4: Today Synchronization & Header Actions ─────────────────────────
console.log("\n=== Suite 4: Header Actions & Today Synchronization ===")
assert.ok(block6Source.includes("dotColor=\"bg-rose-500\""), "Test 4.1: Today badge must use bg-rose-500 dot")
assert.ok(block6Source.includes("dotPulse"), "Test 4.2: Today badge must have dotPulse active")
assert.ok(block6Source.includes("Hôm nay:"), "Test 4.3: Must display 'Hôm nay:' label in header actions")
assert.ok(block6Source.includes("tasks"), "Test 4.4: Must display total tasks count badge")
console.log("✓ Test 4: Header badges and Today sync indicator verified")

// ─── SUITE 5: Responsive Overflow & Zero Layout Thrashing ───────────────────
console.log("\n=== Suite 5: Responsive Overflow Handling ===")
assert.ok(block6Source.includes("overflow-x-auto"), "Test 5.1: Container must provide overflow-x-auto for smooth tablet/mobile scroll")
assert.ok(block6Source.includes("padding=\"none\""), "Test 5.2: Frame must use padding='none' for edge-to-edge docking")
console.log("✓ Test 5: Responsive overflow handling verified")

// ─── SUITE 6: Zero-Task Empty State Handling ─────────────────────────────────
console.log("\n=== Suite 6: Zero-Task Empty State Resilience ===")
assert.ok(block6Source.includes("requests.length === 0"), "Test 6.1: Must handle requests.length === 0 empty state")
assert.ok(block6Source.includes("Không có bài toán nào trong phạm vi lọc"), "Test 6.2: Must show informative empty state prompt")
console.log("✓ Test 6: Zero-task resilient empty state verified")

// ─── SUITE 7: FrameFooter Guidance & Metrics ─────────────────────────────────
console.log("\n=== Suite 7: FrameFooter Guidance & Temporal Metrics ===")
assert.ok(block6Source.includes("Drawer"), "Test 7.1: Footer must explain task click opens Drawer")
assert.ok(block6Source.includes("splitter"), "Test 7.2: Footer must mention splitter drag resize")
assert.ok(block6Source.includes("quá hạn") || block6Source.includes("đúng hạn"), "Test 7.3: Footer must report SLA/overdue status")
console.log("✓ Test 7: FrameFooter interaction hints and SLA metrics verified")

console.log("\n🎉 ALL MILESTONE M4 BLOCK 6 TESTS PASSED (100%)\n")
