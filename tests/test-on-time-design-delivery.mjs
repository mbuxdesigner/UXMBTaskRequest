import assert from "node:assert/strict"
import {
  calculateOnTimeDelivery,
  parseDateMs,
} from "../src/components/dashboard/ai-ops/kpiMetrics.ts"

const nowMs = parseDateMs("17/09/2026 12:00:00")

const currentRequests = [
  {
    title: "Sent on time",
    status: "Đã gửi PO",
    current_phase: "UI Design",
    design_deadline: "15/09/2026",
    sent_to_po_at: "15/09/2026 17:00:00",
  },
  {
    title: "Sent late",
    status: "Đã gửi PO",
    current_phase: "UI Design",
    design_deadline: "15/09/2026",
    sent_to_po_at: "16/09/2026 09:00:00",
  },
  {
    title: "Overdue and not sent",
    status: "Đang thực hiện",
    current_phase: "Wireframe",
    design_deadline: "14/09/2026",
  },
  {
    title: "Future commitment",
    status: "Đang thực hiện",
    current_phase: "UI Design",
    design_deadline: "25/09/2026",
  },
  {
    title: "Done without a design commitment",
    status: "Hoàn thành",
    expected_deadline: "10/09/2026",
    release_date: "16/09/2026",
  },
  {
    title: "Active UI task without a commitment",
    request_id: "UXMB-NO-DEADLINE-001",
    status: "Đang thực hiện",
    current_phase: "UI Design",
    assigned_designer: "Phong",
  },
  {
    title: "Early phase without a commitment",
    status: "Đang thực hiện",
    current_phase: "Define đầu bài",
  },
]

const currentStats = calculateOnTimeDelivery(currentRequests, nowMs)
assert.equal(currentStats.totalEvaluated, 3)
assert.equal(currentStats.onTimeCount, 1)
assert.equal(currentStats.delayedCount, 2)
assert.equal(currentStats.onTimeRate, 33.3)
assert.equal(currentStats.delayedItems.length, 2)
assert.equal(currentStats.delayedItems[0].title, "Sent late")
assert.equal(currentStats.delayedItems[0].phase, "ui-design")
assert.ok(currentStats.delayedItems[0].transitionedAtMs)
assert.equal(currentStats.delayedItems[1].title, "Overdue and not sent")
assert.equal(currentStats.delayedItems[1].transitionedAtMs, undefined)
assert.equal(currentStats.missingDeadlineCount, 1)
assert.equal(currentStats.missingDeadlineItems[0].requestId, "UXMB-NO-DEADLINE-001")
assert.equal(currentStats.missingDeadlineItems[0].phase, "ui-design")

const historicalStats = calculateOnTimeDelivery([
  {
    title: "Historical wireframe commitment",
    status: "Đang thực hiện",
    current_phase: "UI Design",
    task_updates: [
      {
        timestamp: "09/09/2026 16:00:00",
        previous_phase: "Wireframe",
        new_phase: "UI Design",
        previous_status: "Đang thực hiện",
        new_status: "Đang thực hiện",
        note: "Chuyển sang UI Design",
      },
      {
        timestamp: "05/09/2026 09:00:00",
        new_phase: "Wireframe",
        note: "Cập nhật ngày gửi Wireframe sang: 2026-09-09",
      },
    ],
  },
], nowMs)

assert.equal(historicalStats.totalEvaluated, 1)
assert.equal(historicalStats.onTimeCount, 1)
assert.equal(historicalStats.delayedCount, 0)

const pendingStats = calculateOnTimeDelivery([
  {
    title: "Pending cancels the previous commitment",
    status: "Pending",
    current_phase: "UI Design",
    design_deadline: "10/09/2026",
    task_updates: [
      {
        timestamp: "11/09/2026 09:00:00",
        previous_phase: "UI Design",
        new_phase: "UI Design",
        previous_status: "Đang thực hiện",
        new_status: "Pending",
        design_deadline: "10/09/2026",
        note: "Tạm dừng để chờ bổ sung thông tin",
      },
      {
        timestamp: "05/09/2026 09:00:00",
        new_phase: "UI Design",
        note: "Cập nhật ngày gửi UI sang: 2026-09-10",
      },
    ],
  },
  {
    title: "PO pending also cancels the previous commitment",
    status: "PO pending",
    current_phase: "UI Design",
    design_deadline: "10/09/2026",
  },
], nowMs)

assert.equal(pendingStats.totalEvaluated, 0)
assert.equal(pendingStats.onTimeCount, 0)
assert.equal(pendingStats.delayedCount, 0)

const stoppedStats = calculateOnTimeDelivery([
  {
    title: "Stopped task is excluded",
    status: "Tạm dừng",
    current_phase: "UI Design",
    design_deadline: "10/09/2026",
  },
  {
    title: "Frozen task is excluded",
    status: "Frozen",
    current_phase: "Wireframe",
    design_deadline: "10/09/2026",
  },
], nowMs)

assert.equal(stoppedStats.totalEvaluated, 0)
assert.equal(stoppedStats.delayedCount, 0)

const inactiveTaskStats = calculateOnTimeDelivery([
  {
    title: "Completed task with an old late commitment",
    status: "Hoàn thành",
    current_phase: "Hoàn thành",
    progress: 100,
    design_deadline: "10/09/2026",
    task_updates: [
      {
        timestamp: "12/09/2026 09:00:00",
        previous_phase: "UI Design",
        new_phase: "Ready to dev",
        previous_status: "Đang thực hiện",
        new_status: "Đang thực hiện",
        design_deadline: "10/09/2026",
        note: "Chuyển sang Ready to dev",
      },
    ],
  },
  {
    title: "Pending task with a previously delivered commitment",
    status: "Pending",
    current_phase: "UI Design",
    design_deadline: "10/09/2026",
    task_updates: [
      {
        timestamp: "12/09/2026 09:00:00",
        previous_phase: "Wireframe",
        new_phase: "UI Design",
        previous_status: "Đang thực hiện",
        new_status: "Đang thực hiện",
        design_deadline: "10/09/2026",
        note: "Chuyển sang UI Design",
      },
    ],
  },
  {
    title: "Rejected task",
    status: "Từ chối",
    current_phase: "Wireframe",
    design_deadline: "10/09/2026",
    rejected_reason: "Không tiếp tục triển khai",
  },
  {
    title: "Completed phase with stale active status",
    status: "Đang thực hiện",
    current_phase: "7. Hoàn thành",
    progress: 80,
    design_deadline: "10/09/2026",
  },
], nowMs)

assert.equal(inactiveTaskStats.totalEvaluated, 0)
assert.equal(inactiveTaskStats.onTimeCount, 0)
assert.equal(inactiveTaskStats.delayedCount, 0)
assert.equal(inactiveTaskStats.delayedItems.length, 0)
assert.equal(inactiveTaskStats.missingDeadlineCount, 0)

console.log("✓ On-time delivery uses the next transition and excludes Pending/stopped commitments")
