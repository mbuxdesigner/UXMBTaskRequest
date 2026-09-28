import type { UXRequest } from "../data/mockData.ts"
import { normalizeDateToYMD } from "../services/calendarService.ts"

export type DesignerPhaseKey = "define" | "design" | "ready" | "acceptance"

export interface DesignerPhaseStat {
  key: DesignerPhaseKey
  label: string
  color: string
  count: number
}

export interface PlannerBriefingItem {
  id: string
  title: string
  description: string
  requestId?: string
  date?: string
  tone: "danger" | "warning" | "info" | "success"
}

export function getWeekBounds(anchor: Date): { start: string; end: string } {
  const date = new Date(anchor)
  date.setHours(0, 0, 0, 0)
  const mondayOffset = (date.getDay() + 6) % 7
  const monday = new Date(date)
  monday.setDate(date.getDate() - mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: normalizeDateToYMD(monday),
    end: normalizeDateToYMD(sunday),
  }
}

export function getTaskDeadline(task: UXRequest): string {
  return normalizeDateToYMD(task.expected_deadline || task.design_deadline)
}

export function getTaskPlannedDate(task: UXRequest): string {
  return normalizeDateToYMD(task.planned_work_date)
}

export function isTaskCompleted(task: UXRequest): boolean {
  const status = `${task.status || ""} ${task.current_phase || ""}`.toLowerCase()
  return task.progress >= 100 || status.includes("hoàn thành") || status.includes("complete")
}

export function getDesignerPhaseKey(task: UXRequest): DesignerPhaseKey | null {
  if (isTaskCompleted(task)) return null
  const phase = `${task.current_phase || ""} ${task.status || ""}`.toLowerCase()
  if (phase.includes("nghiệm thu") || phase.includes("acceptance") || phase.includes("po pending")) {
    return "acceptance"
  }
  if (phase.includes("ready") || phase.includes("hand off") || phase.includes("handoff")) {
    return "ready"
  }
  if (phase.includes("wireframe") || phase.includes("ui design") || phase.includes("prototype")) {
    return "design"
  }
  return "define"
}

export function getDesignerPhaseDistribution(tasks: UXRequest[]): DesignerPhaseStat[] {
  const counts: Record<DesignerPhaseKey, number> = {
    define: 0,
    design: 0,
    ready: 0,
    acceptance: 0,
  }
  tasks.forEach((task) => {
    const key = getDesignerPhaseKey(task)
    if (key) counts[key] += 1
  })
  return [
    { key: "define", label: "Define đầu bài", color: "#8b5cf6", count: counts.define },
    { key: "design", label: "Wireframe + UI", color: "#3b82f6", count: counts.design },
    { key: "ready", label: "Ready to dev", color: "#0891b2", count: counts.ready },
    { key: "acceptance", label: "Nghiệm thu UI", color: "#ec4899", count: counts.acceptance },
  ]
}

export function getGoLiveTasksInWeek(tasks: UXRequest[], anchor: Date): UXRequest[] {
  const { start, end } = getWeekBounds(anchor)
  return tasks.filter((task) => {
    const release = normalizeDateToYMD(task.release_date)
    return Boolean(release && release >= start && release <= end)
  })
}

export function buildRuleBasedBriefing(
  tasks: UXRequest[],
  anchor: Date,
  riskByTaskId: Record<string, "on_track" | "at_risk" | "overdue"> = {},
): PlannerBriefingItem[] {
  const today = normalizeDateToYMD(anchor)
  const { end: weekEnd } = getWeekBounds(anchor)
  const active = tasks.filter((task) => !isTaskCompleted(task))
  const overdue = active.filter((task) => {
    const deadline = getTaskDeadline(task)
    return riskByTaskId[task.request_id] === "overdue" || Boolean(deadline && deadline < today)
  })
  const atRisk = active.filter((task) => riskByTaskId[task.request_id] === "at_risk")
  const dueSoon = active.filter((task) => {
    const deadline = getTaskDeadline(task)
    return Boolean(deadline && deadline >= today && deadline <= weekEnd)
  })
  const unscheduled = active.filter((task) => !getTaskPlannedDate(task))
  const goLive = getGoLiveTasksInWeek(active, anchor)

  const result: PlannerBriefingItem[] = []
  if (overdue.length > 0) {
    result.push({
      id: "overdue",
      title: `${overdue.length} công việc đã quá hạn`,
      description: "Ưu tiên rà soát cam kết và cập nhật kế hoạch thực hiện hôm nay.",
      requestId: overdue[0].request_id,
      date: getTaskDeadline(overdue[0]),
      tone: "danger",
    })
  } else if (atRisk.length > 0) {
    result.push({
      id: "at-risk",
      title: `${atRisk.length} công việc có nguy cơ quá tải`,
      description: "Khối lượng còn lại đang cao hơn thời gian khả dụng trước deadline.",
      requestId: atRisk[0].request_id,
      date: getTaskDeadline(atRisk[0]),
      tone: "warning",
    })
  }
  if (dueSoon.length > 0) {
    result.push({
      id: "due-soon",
      title: `${dueSoon.length} deadline trong tuần này`,
      description: "Kiểm tra deliverable và thời gian review trước khi bàn giao.",
      requestId: dueSoon[0].request_id,
      date: getTaskDeadline(dueSoon[0]),
      tone: "info",
    })
  }
  if (goLive.length > 0) {
    result.push({
      id: "go-live",
      title: `${goLive.length} task dự kiến go-live`,
      description: "Chuẩn bị checklist nghiệm thu UI và theo dõi phản hồi sau phát hành.",
      requestId: goLive[0].request_id,
      date: normalizeDateToYMD(goLive[0].release_date),
      tone: "success",
    })
  }
  if (unscheduled.length > 0) {
    result.push({
      id: "unscheduled",
      title: `${unscheduled.length} công việc chưa xếp ngày`,
      description: "Xếp ngày dự kiến làm để lịch phản ánh đúng tải công việc cá nhân.",
      requestId: unscheduled[0].request_id,
      tone: "warning",
    })
  }
  if (result.length === 0) {
    result.push({
      id: "clear",
      title: "Kế hoạch đang trong tầm kiểm soát",
      description: "Chưa có deadline gấp hoặc công việc quá tải cần can thiệp.",
      tone: "success",
    })
  }
  return result.slice(0, 4)
}
