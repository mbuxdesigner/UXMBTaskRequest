/**
 * MBBank UX Team Planner & Calendar Service
 * 
 * Tích hợp 4 tầng dữ liệu thống nhất:
 * Tầng 1: Đề bài & Deadlines UX (ux_portal_real_requests) - Kéo thả / Sửa deadline có Activity log
 * Tầng 2: Lịch nghỉ phép nhân sự (Đồng bộ từ Google Sheet ngoài qua leaveService)
 * Tầng 3: Lịch nghỉ lễ, nghỉ hoán đổi và làm bù ngân hàng (workSchedule.holidays)
 * Tầng 4: Sự kiện team nội bộ (Design Review, Workshop, Teambuilding, Nhắc việc)
 */

import type { UXRequest, TaskUpdateRecord, UserRole } from "../data/mockData.ts"
import { fetchTeamLeaves, type TeamLeaveRecord } from "./leaveService.ts"
import {
  getSystemConfig,
  saveSystemConfig,
  type HolidayException,
  type TeamEvent,
  type EventCategoryConfig,
} from "../config/systemConfig.ts"
export interface UserSession {
  email?: string
  displayName?: string
  role?: string
  personalEmail?: string
  [key: string]: any
}

export function getStoredSession(): UserSession | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("mbbank_user_session") : null
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

export type CalendarLayer = 1 | 2 | 3 | 4
export type TaskRiskLevel = "on_track" | "at_risk" | "overdue"

export interface RiskAssessment {
  riskLevel: TaskRiskLevel
  riskReason: string
  remainingEffort: number
  availableCapacity: number
  daysUntilDeadline: number
  leaveDaysCount: number
}

export interface DesignerWorkload {
  name: string
  avatar?: string
  role?: string
  totalCapacityHours: number
  leaveHours: number
  availableHours: number
  assignedHours: number
  utilizationPercent: number
  isOverloaded: boolean
  activeTasksCount: number
  tasks: UXRequest[]
}

export interface CalendarItem {
  id: string
  layer: CalendarLayer
  title: string
  date: string // "YYYY-MM-DD" (ngày hiển thị chính: planned date hoặc deadline)
  startDate: string // ISO date or "YYYY-MM-DDTHH:mm"
  endDate: string // ISO date or "YYYY-MM-DDTHH:mm"
  allDay: boolean
  color: string // Tailwind color or Hex
  textColor?: string
  category: string
  categoryLabel: string
  assigneeName?: string
  assigneeEmail?: string
  assigneeAvatar?: string
  squadName?: string
  productName?: string
  status?: string
  priority?: string
  progress?: number
  hasConflict?: boolean
  conflictReason?: string
  // Resource & Delivery Fields
  plannedDate?: string
  committedDeadline?: string
  estimatedHours?: number
  riskLevel?: TaskRiskLevel
  riskReason?: string
  rawItem: UXRequest | TeamLeaveRecord | HolidayException | TeamEvent
}

/**
 * Chuẩn hóa chuỗi ngày thành "YYYY-MM-DD"
 */
export function normalizeDateToYMD(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return ""
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim()
    // Định dạng YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.substring(0, 10)
    }
    // Định dạng DD/MM/YYYY
    const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (dmy) {
      const d = dmy[1].padStart(2, "0")
      const m = dmy[2].padStart(2, "0")
      const y = dmy[3]
      return `${y}-${m}-${d}`
    }
    const parsed = new Date(trimmed)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0]
    }
    return ""
  }
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const y = dateInput.getFullYear()
    const m = String(dateInput.getMonth() + 1).padStart(2, "0")
    const d = String(dateInput.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }
  return ""
}

/**
 * Kiểm tra xem một ngày có nằm giữa ngày bắt đầu và kết thúc không
 */
export function isDateInRange(targetYMD: string, startYMD: string, endYMD: string): boolean {
  if (!targetYMD || !startYMD) return false
  const end = endYMD || startYMD
  return targetYMD >= startYMD && targetYMD <= end
}

/**
 * Tải toàn bộ danh sách bài toán UX từ localStorage hoặc fallback
 */
export function getLocalUXRequests(): UXRequest[] {
  try {
    const raw = localStorage.getItem("ux_portal_real_requests")
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list)) return list
    }
  } catch (err) {
    console.error("[CalendarService] Error loading local requests:", err)
  }
  return []
}

/**
 * Cập nhật Ngày làm việc dự kiến (Planned Work Date) cho bài toán
 * Kéo thả trên lịch mặc định CHỈ thay đổi ngày này, KHÔNG đổi Committed Deadline!
 */
export function updateTaskPlannedDate(
  requestId: string,
  newPlannedDateYMD: string
): { success: boolean; task?: UXRequest; error?: string } {
  try {
    const requests = getLocalUXRequests()
    const index = requests.findIndex((r) => r.request_id === requestId)
    if (index === -1) {
      return { success: false, error: `Không tìm thấy bài toán có mã ${requestId}` }
    }

    const currentTask = requests[index]
    const updatedTask: UXRequest = {
      ...currentTask,
      planned_work_date: newPlannedDateYMD,
      last_updated: new Date().toISOString(),
    } as any

    requests[index] = updatedTask
    localStorage.setItem("ux_portal_real_requests", JSON.stringify(requests))
    window.dispatchEvent(
      new CustomEvent("ux_portal_tasks_changed", {
        detail: { requestId, newPlannedDate: newPlannedDateYMD },
      })
    )
    window.dispatchEvent(new Event("storage"))

    return { success: true, task: updatedTask }
  } catch (err: any) {
    console.error("[CalendarService] Error updating planned work date:", err)
    return { success: false, error: err.message || "Lỗi cập nhật kế hoạch làm việc" }
  }
}

/**
 * Dời / Cập nhật Deadline cam kết cho bài toán UX và tự động chèn Activity Log chuẩn TaskUpdateRecord
 * BẮT BUỘC có lý do thay đổi deadline để đảm bảo tính minh bạch và audit log.
 */
export function updateTaskDeadlineWithLog(
  requestId: string,
  newDeadlineYMD: string,
  session?: UserSession | null,
  reason?: string
): { success: boolean; task?: UXRequest; error?: string } {
  try {
    if (!reason || !reason.trim()) {
      return {
        success: false,
        error: "Thay đổi hạn cam kết (Deadline) bắt buộc phải có lý do cụ thể để lưu Audit Log!",
      }
    }

    const requests = getLocalUXRequests()
    const index = requests.findIndex((r) => r.request_id === requestId)
    if (index === -1) {
      return { success: false, error: `Không tìm thấy bài toán có mã ${requestId}` }
    }

    const currentTask = requests[index]
    const oldDeadline = currentTask.expected_deadline || currentTask.design_deadline || "Chưa xác định"
    const currentSession = session || getStoredSession()

    // 1. Tạo Activity Log mới
    const newLogRecord: TaskUpdateRecord = {
      id: `log-deadline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      request_id: requestId,
      timestamp: new Date().toISOString(),
      updated_by: currentSession?.displayName || "Admin",
      author_role: (currentSession?.role as UserRole) || "Admin",
      previous_phase: currentTask.current_phase,
      new_phase: currentTask.current_phase,
      previous_progress: currentTask.progress,
      new_progress: currentTask.progress,
      note: `Dời hạn hoàn thành thiết kế từ [${oldDeadline}] sang [${newDeadlineYMD}] trên UX Team Planner (Lý do: ${reason.trim()})`,
      is_comment: false,
    }

    // 2. Cập nhật thuộc tính của task
    const updatedTask: UXRequest = {
      ...currentTask,
      expected_deadline: newDeadlineYMD,
      design_deadline: newDeadlineYMD,
      last_updated: new Date().toISOString(),
      task_updates: [newLogRecord, ...(currentTask.task_updates || [])],
    }

    requests[index] = updatedTask

    // 3. Lưu vào localStorage và dispatch custom event
    localStorage.setItem("ux_portal_real_requests", JSON.stringify(requests))
    window.dispatchEvent(
      new CustomEvent("ux_portal_tasks_changed", {
        detail: { requestId, newDeadline: newDeadlineYMD, reason },
      })
    )
    window.dispatchEvent(new Event("storage"))

    return { success: true, task: updatedTask }
  } catch (err: any) {
    console.error("[CalendarService] Error updating task deadline:", err)
    return { success: false, error: err.message || "Lỗi cập nhật deadline" }
  }
}

/**
 * Thêm sự kiện team mới
 */
export function addTeamEvent(
  eventData: Omit<TeamEvent, "id" | "createdAt">,
  session?: UserSession | null
): TeamEvent {
  const currentSession = session || getStoredSession()
  const config = getSystemConfig()
  const newEvent: TeamEvent = {
    ...eventData,
    id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdBy: currentSession?.displayName || "Admin",
    createdAt: new Date().toISOString(),
  }

  const updatedEvents = [newEvent, ...(config.calendar.teamEvents || [])]
  saveSystemConfig({
    ...config,
    calendar: {
      ...config.calendar,
      teamEvents: updatedEvents,
    },
  })

  return newEvent
}

/**
 * Cập nhật sự kiện team
 */
export function updateTeamEvent(
  updatedEvent: TeamEvent,
  _session?: UserSession | null
): boolean {
  const config = getSystemConfig()
  const events = config.calendar.teamEvents || []
  const index = events.findIndex((e) => e.id === updatedEvent.id)
  if (index === -1) return false

  events[index] = updatedEvent
  saveSystemConfig({
    ...config,
    calendar: {
      ...config.calendar,
      teamEvents: [...events],
    },
  })
  return true
}

/**
 * Xóa sự kiện team
 */
export function deleteTeamEvent(eventId: string): boolean {
  const config = getSystemConfig()
  const events = config.calendar.teamEvents || []
  const filtered = events.filter((e) => e.id !== eventId)
  if (filtered.length === events.length) return false

  saveSystemConfig({
    ...config,
    calendar: {
      ...config.calendar,
      teamEvents: filtered,
    },
  })
  return true
}

/**
 * Tìm các nhân sự nghỉ trong ngày cụ thể (Ví dụ: Hôm nay)
 */
export function getLeavesOnDate(leaves: TeamLeaveRecord[], targetDateYMD?: string): TeamLeaveRecord[] {
  const checkYMD = targetDateYMD || normalizeDateToYMD(new Date())
  if (!checkYMD || !Array.isArray(leaves)) return []

  return leaves.filter((leave) => {
    const fromYMD = normalizeDateToYMD(leave.fromDate)
    const toYMD = normalizeDateToYMD(leave.toDate) || fromYMD
    return isDateInRange(checkYMD, fromYMD, toYMD)
  })
}

/**
 * Kiểm tra xem một nhân sự (theo tên hoặc email) có nghỉ trong ngày cho trước không
 */
export function isPersonOnLeave(
  leaves: TeamLeaveRecord[],
  personNameOrEmail: string,
  targetDateYMD: string
): { onLeave: boolean; leaveRecord?: TeamLeaveRecord } {
  if (!personNameOrEmail || !targetDateYMD) return { onLeave: false }

  const searchTarget = personNameOrEmail.trim().toLowerCase()
  const leavesOnDate = getLeavesOnDate(leaves, targetDateYMD)

  const found = leavesOnDate.find((leave) => {
    const emailMatch = leave.email?.toLowerCase().includes(searchTarget)
    const nameMatch = leave.fullName?.toLowerCase().includes(searchTarget)
    const accountMatch = leave.account?.toLowerCase().includes(searchTarget)
    return Boolean(emailMatch || nameMatch || accountMatch)
  })

  return { onLeave: Boolean(found), leaveRecord: found }
}

/**
 * Lấy số giờ ước tính (Estimated Effort Hours) của đề bài UX
 * Nếu chưa được gán cụ thể, nội suy theo Priority: Lv1 = 24h, Lv2 = 16h, Lv3 = 8h (Mặc định 16h)
 */
export function getTaskEffort(task: UXRequest): number {
  if (typeof (task as any).estimated_hours === "number" && (task as any).estimated_hours > 0) {
    return (task as any).estimated_hours
  }
  const prio = (task.priority || "").toLowerCase()
  if (prio === "lv1") return 24
  if (prio === "lv2") return 16
  if (prio === "lv3") return 8
  return 16
}

/**
 * Động cơ Đánh giá Rủi ro (Risk Engine):
 * So sánh Remaining Effort (giờ cần làm) với Available Working Capacity (giờ khả dụng thực tế trước deadline)
 * Tính đến: Ngày làm việc ngân hàng, trừ ngày nghỉ lễ, trừ ngày nghỉ phép của Designer
 */
export function assessTaskRisk(
  task: UXRequest,
  leaves: TeamLeaveRecord[],
  targetDateYMD?: string
): RiskAssessment {
  const todayYMD = targetDateYMD || normalizeDateToYMD(new Date())
  const deadlineYMD = normalizeDateToYMD(task.expected_deadline || task.design_deadline)
  const totalEffort = getTaskEffort(task)
  const progress = task.progress ?? 0

  // 1. Task hoàn thành -> On track
  if (task.status === "Hoàn thành" || progress >= 100) {
    return {
      riskLevel: "on_track",
      riskReason: "Đề bài đã hoàn thành",
      remainingEffort: 0,
      availableCapacity: 40,
      daysUntilDeadline: 0,
      leaveDaysCount: 0,
    }
  }

  // 2. Không có deadline -> Không xác định
  if (!deadlineYMD) {
    return {
      riskLevel: "on_track",
      riskReason: "Chưa ấn định deadline",
      remainingEffort: totalEffort,
      availableCapacity: 40,
      daysUntilDeadline: 999,
      leaveDaysCount: 0,
    }
  }

  // 3. Đã quá hạn
  if (deadlineYMD < todayYMD) {
    return {
      riskLevel: "overdue",
      riskReason: `Đã quá hạn hoàn thành (${deadlineYMD})`,
      remainingEffort: Math.round(totalEffort * (1 - progress / 100)),
      availableCapacity: 0,
      daysUntilDeadline: -1,
      leaveDaysCount: 0,
    }
  }

  const remainingEffort = Math.max(1, Math.round(totalEffort * (1 - progress / 100)))

  // 4. Tính toán số ngày và số giờ khả dụng giữa today và deadline
  const sysConfig = getSystemConfig()
  const holidays = sysConfig.workSchedule?.holidays || []
  const holidayDates = new Set(
    holidays
      .filter((h) => h.type !== "compensatory_workday")
      .map((h) => normalizeDateToYMD(h.date))
  )
  const compensatoryDates = new Set(
    holidays
      .filter((h) => h.type === "compensatory_workday")
      .map((h) => normalizeDateToYMD(h.date))
  )

  let availableHours = 0
  let daysCount = 0
  let leaveDaysCount = 0

  const cur = new Date(todayYMD + "T00:00:00")
  const end = new Date(deadlineYMD + "T00:00:00")

  while (cur <= end) {
    const curYMD = normalizeDateToYMD(cur)
    const dayOfWeek = cur.getDay() // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isCompensatory = compensatoryDates.has(curYMD)
    const isHoliday = holidayDates.has(curYMD)

    const isWorkday = (!isWeekend || isCompensatory) && !isHoliday

    if (isWorkday) {
      daysCount++
      let dayHours = 8 // chuẩn 8 tiếng/ngày

      if (task.assigned_designer) {
        const leaveCheck = isPersonOnLeave(leaves, task.assigned_designer, curYMD)
        if (leaveCheck.onLeave && leaveCheck.leaveRecord) {
          const shift = (leaveCheck.leaveRecord.shift || "").toLowerCase()
          if (shift.includes("sáng") || shift.includes("chiều") || shift.includes("nửa ngày")) {
            dayHours -= 4
            leaveDaysCount += 0.5
          } else {
            dayHours = 0
            leaveDaysCount += 1
          }
        }
      }

      availableHours += dayHours
    }

    cur.setDate(cur.getDate() + 1)
  }

  // 5. Kết luận rủi ro
  if (remainingEffort > availableHours) {
    let reason = `Cần ${remainingEffort}h, chỉ còn ${availableHours}h khả dụng trước hạn`
    if (leaveDaysCount > 0) {
      reason += ` (${task.assigned_designer || "Designer"} nghỉ ${leaveDaysCount} ngày)`
    }
    return {
      riskLevel: "at_risk",
      riskReason: reason,
      remainingEffort,
      availableCapacity: availableHours,
      daysUntilDeadline: daysCount,
      leaveDaysCount,
    }
  }

  return {
    riskLevel: "on_track",
    riskReason: `Tiến độ đảm bảo: Cần ${remainingEffort}h / Khả dụng ${availableHours}h`,
    remainingEffort,
    availableCapacity: availableHours,
    daysUntilDeadline: daysCount,
    leaveDaysCount,
  }
}

/**
 * Tính toán Năng lực và Khối lượng công việc tuần của từng Designer (Capacity & Workload Board)
 */
export function calculateTeamWorkload(
  requests: UXRequest[],
  leaves: TeamLeaveRecord[],
  targetDate: Date = new Date()
): DesignerWorkload[] {
  // Lấy danh sách ngày Mon -> Fri của tuần chứa targetDate
  const d = new Date(targetDate)
  const dayIndex = (d.getDay() + 6) % 7 // 0 = Mon, 4 = Fri
  const monday = new Date(d)
  monday.setDate(monday.getDate() - dayIndex)

  const weekYMDs: string[] = []
  for (let i = 0; i < 5; i++) {
    const day = new Date(monday)
    day.setDate(day.getDate() + i)
    weekYMDs.push(normalizeDateToYMD(day))
  }

  // Tập hợp danh sách Designer
  const designerMap = new Map<string, UXRequest[]>()
  requests.forEach((req) => {
    const designer = req.assigned_designer?.trim()
    if (!designer || designer === "Chưa phân công") return
    if (!designerMap.has(designer)) {
      designerMap.set(designer, [])
    }
    designerMap.get(designer)!.push(req)
  })

  // Nếu chưa có ai trong requests, lấy từ leaves
  leaves.forEach((l) => {
    const name = l.fullName?.trim()
    if (name && !designerMap.has(name)) {
      designerMap.set(name, [])
    }
  })

  const results: DesignerWorkload[] = []

  designerMap.forEach((tasks, name) => {
    // 1. Tính số giờ nghỉ phép trong tuần này (Mon - Fri)
    let leaveHours = 0
    weekYMDs.forEach((ymd) => {
      const check = isPersonOnLeave(leaves, name, ymd)
      if (check.onLeave && check.leaveRecord) {
        const shift = (check.leaveRecord.shift || "").toLowerCase()
        if (shift.includes("sáng") || shift.includes("chiều") || shift.includes("nửa ngày")) {
          leaveHours += 4
        } else {
          leaveHours += 8
        }
      }
    })

    const totalCapacityHours = 40
    const availableHours = Math.max(0, totalCapacityHours - leaveHours)

    // 2. Tính số giờ công việc được giao đang active trong tuần
    const activeTasks = tasks.filter((t) => t.status !== "Hoàn thành")
    let assignedHours = 0
    activeTasks.forEach((t) => {
      const effort = getTaskEffort(t)
      const prog = t.progress ?? 0
      const remain = effort * (1 - prog / 100)
      // Phân bổ ước tính 1 phần vào tuần này
      assignedHours += Math.min(20, Math.round(remain))
    })

    const utilizationPercent =
      availableHours > 0
        ? Math.round((assignedHours / availableHours) * 100)
        : assignedHours > 0
        ? 150
        : 0

    results.push({
      name,
      totalCapacityHours,
      leaveHours,
      availableHours,
      assignedHours,
      utilizationPercent,
      isOverloaded: utilizationPercent > 100,
      activeTasksCount: activeTasks.length,
      tasks: activeTasks,
    })
  })

  return results.sort((a, b) => b.utilizationPercent - a.utilizationPercent)
}

/**
 * Lấy thông tin độ tươi dữ liệu nghỉ phép (Freshness)
 */
export function getLeavesFreshnessInfo(): { text: string; isFresh: boolean; lastSyncMs: number | null } {
  try {
    const savedTime = localStorage.getItem("uxmb_cached_team_leaves_time")
    if (!savedTime) {
      return { text: "Chưa đồng bộ", isFresh: false, lastSyncMs: null }
    }
    const diffMs = Date.now() - Number(savedTime)
    const diffMinutes = Math.floor(diffMs / (60 * 1000))
    if (diffMinutes < 1) {
      return { text: "Vừa xong", isFresh: true, lastSyncMs: Number(savedTime) }
    }
    if (diffMinutes < 60) {
      return { text: `${diffMinutes} phút trước`, isFresh: diffMinutes <= 30, lastSyncMs: Number(savedTime) }
    }
    const diffHours = Math.floor(diffMinutes / 60)
    return { text: `${diffHours} giờ trước`, isFresh: false, lastSyncMs: Number(savedTime) }
  } catch {
    return { text: "Không xác định", isFresh: false, lastSyncMs: null }
  }
}

/**
 * Tải và hợp nhất toàn bộ 4 tầng dữ liệu của Calendar
 */
export async function loadAllCalendarItems(): Promise<{
  items: CalendarItem[]
  leaves: TeamLeaveRecord[]
  todayLeaves: TeamLeaveRecord[]
  categories: EventCategoryConfig[]
}> {
  const sysConfig = getSystemConfig()
  const categories = sysConfig.calendar.eventCategories || []
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  // 1. Tầng 2: Tải lịch nghỉ phép nhân sự từ Google Sheet ngoài
  let leaves: TeamLeaveRecord[] = []
  try {
    const leaveRes = await fetchTeamLeaves(false)
    if (leaveRes && Array.isArray(leaveRes.leaves)) {
      leaves = leaveRes.leaves
    }
  } catch (err) {
    console.error("[CalendarService] Error loading leaves:", err)
  }

  const todayLeaves = getLeavesOnDate(leaves)

  const items: CalendarItem[] = []

  // 2. Tầng 1: Đề bài & Deadlines UX (kèm Động cơ Đánh giá Rủi ro)
  const requests = getLocalUXRequests()
  requests.forEach((req) => {
    const deadline = req.expected_deadline || req.design_deadline
    const dateYMD = normalizeDateToYMD(deadline)
    if (!dateYMD) return

    const plannedYMD = normalizeDateToYMD((req as any).planned_work_date) || dateYMD
    const effort = getTaskEffort(req)
    const risk = assessTaskRisk(req, leaves)

    // Kiểm tra xung đột với lịch nghỉ phép của Designer phụ trách
    let hasConflict = false
    let conflictReason = ""
    if (sysConfig.calendar.enableConflictAlert && req.assigned_designer) {
      const conflictCheck = isPersonOnLeave(leaves, req.assigned_designer, dateYMD)
      if (conflictCheck.onLeave && conflictCheck.leaveRecord) {
        hasConflict = true
        conflictReason = `Nhân sự [${req.assigned_designer}] đang nghỉ phép (${conflictCheck.leaveRecord.shift || "Cả ngày"}): "${conflictCheck.leaveRecord.reason || "Nghỉ việc riêng"}"`
      }
    }

    // Kết hợp xung đột năng lực từ Risk Engine
    if (risk.riskLevel === "at_risk") {
      hasConflict = true
      conflictReason = conflictReason ? `${conflictReason} | ${risk.riskReason}` : risk.riskReason
    }

    // Xác định màu sắc theo trạng thái / ưu tiên / rủi ro
    let color = "#3b82f6" // blue
    if (risk.riskLevel === "overdue" || req.priority === "lv1" || req.status === "PO pending") {
      color = "#ef4444" // red
    } else if (risk.riskLevel === "at_risk") {
      color = "#f59e0b" // amber (rủi ro)
    } else if (req.status === "Hoàn thành" || req.progress === 100) {
      color = "#10b981" // green
    } else if (req.status === "Đã gửi PO") {
      color = "#8b5cf6" // purple
    }

    items.push({
      id: `task-${req.request_id}`,
      layer: 1,
      title: req.title,
      date: plannedYMD, // Hiển thị trên ô ngày làm việc
      startDate: plannedYMD,
      endDate: dateYMD,
      allDay: true,
      color,
      category: "ux_task",
      categoryLabel: "Kế hoạch UX",
      assigneeName: req.assigned_designer || "Chưa phân công",
      squadName: req.squad_name || req.preferred_squad,
      productName: req.product,
      status: req.status,
      priority: req.priority,
      progress: req.progress,
      hasConflict,
      conflictReason,
      plannedDate: plannedYMD,
      committedDeadline: dateYMD,
      estimatedHours: effort,
      riskLevel: risk.riskLevel,
      riskReason: risk.riskReason,
      rawItem: req,
    })
  })

  // 3. Tầng 2: Thêm từng bản ghi nghỉ phép vào Calendar
  leaves.forEach((leave) => {
    const fromYMD = normalizeDateToYMD(leave.fromDate)
    const toYMD = normalizeDateToYMD(leave.toDate) || fromYMD
    if (!fromYMD) return

    items.push({
      id: `leave-${leave.id}`,
      layer: 2,
      title: `🏖️ ${leave.fullName} nghỉ phép (${leave.shift || "Cả ngày"})`,
      date: fromYMD,
      startDate: fromYMD,
      endDate: toYMD,
      allDay: true,
      color: "#ec4899", // pink-500
      category: "team_leave",
      categoryLabel: "Nghỉ phép",
      assigneeName: leave.fullName,
      assigneeEmail: leave.email,
      assigneeAvatar: leave.avatarUrl,
      rawItem: leave,
    })
  })

  // 4. Tầng 3: Lịch nghỉ lễ ngân hàng & ngày làm bù (workSchedule.holidays)
  const holidays = sysConfig.workSchedule?.holidays || []
  holidays.forEach((hol) => {
    const startYMD = normalizeDateToYMD(hol.date)
    const endYMD = normalizeDateToYMD(hol.endDate) || startYMD
    if (!startYMD) return

    const isCompensatory = hol.type === "compensatory_workday"
    const color = isCompensatory ? "#6366f1" : "#64748b" // Indigo nếu làm bù, Slate nếu nghỉ lễ

    items.push({
      id: `holiday-${hol.id}`,
      layer: 3,
      title: isCompensatory ? `💼 ${hol.name} (Làm bù)` : `🏦 ${hol.name} (Nghỉ lễ)`,
      date: startYMD,
      startDate: startYMD,
      endDate: endYMD,
      allDay: true,
      color,
      category: "bank_holiday",
      categoryLabel: isCompensatory ? "Làm bù ngân hàng" : "Nghỉ lễ ngân hàng",
      rawItem: hol,
    })
  })

  // 5. Tầng 4: Sự kiện team nội bộ (Team Events)
  const teamEvents = sysConfig.calendar?.teamEvents || []
  teamEvents.forEach((ev) => {
    const startYMD = normalizeDateToYMD(ev.startDate)
    const endYMD = normalizeDateToYMD(ev.endDate) || startYMD
    if (!startYMD) return

    const cat = categoryMap.get(ev.categoryId)
    const color = cat?.color || "#8b5cf6"

    // Kiểm tra xem có người tham gia nào đang nghỉ phép vào ngày diễn ra sự kiện không
    let hasConflict = false
    let conflictReason = ""
    if (sysConfig.calendar.enableConflictAlert && Array.isArray(ev.attendees) && ev.attendees.length > 0) {
      for (const attendee of ev.attendees) {
        const check = isPersonOnLeave(leaves, attendee, startYMD)
        if (check.onLeave && check.leaveRecord) {
          hasConflict = true
          conflictReason = `Thành viên [${attendee}] đang nghỉ phép (${check.leaveRecord.shift}): "${check.leaveRecord.reason}"`
          break
        }
      }
    }

    items.push({
      id: `event-${ev.id}`,
      layer: 4,
      title: ev.title,
      date: startYMD,
      startDate: ev.startDate,
      endDate: ev.endDate,
      allDay: ev.allDay,
      color,
      textColor: cat?.textColor,
      category: ev.categoryId,
      categoryLabel: cat?.name || "Sự kiện team",
      assigneeName: ev.attendees?.join(", "),
      hasConflict,
      conflictReason,
      rawItem: ev,
    })
  })

  return { items, leaves, todayLeaves, categories }
}

export interface CalendarDayCell {
  date: Date
  dateYMD: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isFirstOfMonth: boolean
  monthShort: string
  dayOfWeekIndex: number // 0 = Mon, 1 = Tue, ..., 4 = Fri, 5 = Sat, 6 = Sun
  weekNumber: number
}

export interface CalendarWeekRow {
  weekNumber: number
  days: CalendarDayCell[]
}

/**
 * Tính toán các tuần trong tháng cho lưới lịch chuẩn ClickUp
 * @param currentDate Mốc thời gian xem
 * @param showWeekends true: 7 cột (Mon-Sun), false: 5 cột (Mon-Fri)
 */
export function computeCalendarWeeks(
  currentDate: Date,
  showWeekends: boolean = false
): CalendarWeekRow[] {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  // Thứ 2 = 0, Thứ 3 = 1, ..., Thứ 6 = 4, Thứ 7 = 5, Chủ Nhật = 6
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7

  // Ngày đầu tiên của tuần chứa ngày 1 tháng này (luôn bắt đầu vào Thứ 2)
  const curDay = new Date(year, month, 1 - startDayOfWeek)

  const monthShorts = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const now = new Date()
  const todayYMD = normalizeDateToYMD(now)

  const weeks: CalendarWeekRow[] = []

  // Helper tính số thứ tự tuần trong năm (ISO 8601)
  const getISOWeekNumber = (d: Date) => {
    const target = new Date(d.valueOf())
    const dayNr = (d.getDay() + 6) % 7
    target.setDate(target.getDate() - dayNr + 3)
    const firstThursday = target.valueOf()
    target.setMonth(0, 1)
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7))
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
  }

  let safetyLimit = 0
  while (safetyLimit < 6) {
    safetyLimit++
    const weekNumber = getISOWeekNumber(curDay)
    const weekDays: CalendarDayCell[] = []

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const d = new Date(curDay)
      const dateYMD = normalizeDateToYMD(d)
      const isCurrentMonth = d.getMonth() === month
      const isToday = dateYMD === todayYMD
      const isFirstOfMonth = d.getDate() === 1
      const monthShort = monthShorts[d.getMonth()]

      // Nếu không bật weekend, bỏ qua Thứ 7 (dayIdx = 5) và Chủ Nhật (dayIdx = 6)
      if (showWeekends || (dayIdx !== 5 && dayIdx !== 6)) {
        weekDays.push({
          date: d,
          dateYMD,
          dayNumber: d.getDate(),
          isCurrentMonth,
          isToday,
          isFirstOfMonth,
          monthShort,
          dayOfWeekIndex: dayIdx,
          weekNumber,
        })
      }

      // Tăng curDay sang ngày kế tiếp
      curDay.setDate(curDay.getDate() + 1)
    }

    weeks.push({
      weekNumber,
      days: weekDays,
    })

    if (curDay > lastDayOfMonth && weeks.length >= 5) {
      break
    }
  }

  return weeks
}
