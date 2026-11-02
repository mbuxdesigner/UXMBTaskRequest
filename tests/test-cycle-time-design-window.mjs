import assert from "node:assert/strict"
import { calculateCycleTime, parseDateMs } from "../src/components/dashboard/ai-ops/kpiMetrics.ts"

const nowMs = parseDateMs("20/09/2026 12:00:00")

const stats = calculateCycleTime([
  {
    request_id: "UXMB-CYCLE-001",
    title: "Five-day design cycle",
    status: "Hoàn thành",
    submitted_at: "20/08/2026 09:00:00",
    task_updates: [
      { timestamp: "01/09/2026 09:00:00", new_phase: "2. Define đầu bài", note: "Chuyển sang Define", new_progress: 30 },
      { timestamp: "06/09/2026 09:00:00", new_phase: "5. Ready to dev", note: "Chuyển sang Ready to dev", new_progress: 80 },
    ],
  },
  {
    request_id: "UXMB-CYCLE-002",
    title: "Eight-day design cycle",
    status: "Đang thực hiện",
    submitted_at: "01/08/2026 12:00:00",
    task_updates: [
      { timestamp: "02/09/2026 12:00:00", new_phase: "Define đầu bài", note: "Bắt đầu Define", new_progress: 30 },
      { timestamp: "10/09/2026 12:00:00", new_phase: "Ready for Dev", note: "Design done", new_progress: 80 },
    ],
  },
  {
    request_id: "UXMB-CYCLE-003",
    title: "Missing Ready milestone",
    status: "Đang thực hiện",
    submitted_at: "01/09/2026 09:00:00",
    task_updates: [
      { timestamp: "03/09/2026 09:00:00", new_phase: "Define đầu bài", note: "Bắt đầu Define", new_progress: 30 },
    ],
  },
  {
    request_id: "UXMB-CYCLE-004",
    title: "Legacy completed task without workflow history",
    status: "Hoàn thành",
    submitted_at: "01/09/2026 09:00:00",
    release_date: "05/09/2026",
  },
], nowMs)

assert.equal(stats.sampleCount, 2)
assert.equal(stats.avgCycleTime, 6.5)
assert.equal(stats.targetCycleTime, 5)
assert.equal(stats.badgeVariant, "amber")
assert.equal(stats.badgeText, "Cần cải thiện")

const emptyStats = calculateCycleTime([
  {
    request_id: "UXMB-CYCLE-005",
    title: "No transition history",
    status: "Đang thực hiện",
    submitted_at: "01/09/2026 09:00:00",
  },
], nowMs)

assert.equal(emptyStats.sampleCount, 0)
assert.equal(emptyStats.avgCycleTime, 0)

console.log("✓ Cycle Time uses Ready to dev minus Define đầu bài milestones")
