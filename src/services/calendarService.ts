/**
 * MBBank UX Team Planner & Calendar Service
 * 
 * Tích hợp 4 tầng dữ liệu thống nhất:
 * Tầng 1: Đề bài & Deadlines UX (ux_portal_real_requests) - Kéo thả / Sửa deadline có Activity log
 * Tầng 2: Lịch nghỉ phép nhân sự (Đồng bộ từ Google Sheet ngoài qua leaveService)
 * Tầng 3: Lịch nghỉ lễ, nghỉ hoán đổi và làm bù ngân hàng (workSchedule.holidays)
 * Tầng 4: Sự kiện team nội bộ (Design Review, Workshop, Teambuilding, Nhắc việc)
 */

import { UXRequest, TaskUpdateRecord, UserRole } from "@/data/mockData"
import { fetchTeamLeaves, TeamLeaveRecord } from "@/services/leaveService"
import {
  getSystemConfig,
  saveSystemConfig,
  HolidayException,
  TeamEvent,
  EventCategoryConfig,
} from "@/config/systemConfig"
import { UserSession, getStoredSession } from "@/services/otpAuthService"

export type CalendarLayer = 1 | 2 | 3 | 4

export interface CalendarItem {
  id: string
  layer: CalendarLayer
  title: string
  date: string // "YYYY-MM-DD"
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
 * Dời / Cập nhật Deadline cho bài toán UX và tự động chèn Activity Log chuẩn TaskUpdateRecord
 */
export function updateTaskDeadlineWithLog(
  requestId: string,
  newDeadlineYMD: string,
  session?: UserSession | null,
  reason?: string
): { success: boolean; task?: UXRequest; error?: string } {
  try {
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
      note: `Dời hạn hoàn thành thiết kế từ [${oldDeadline}] sang [${newDeadlineYMD}] trên UX Team Planner${
        reason ? ` (Lý do: ${reason})` : ""
      }`,
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
    window.dispatchEvent(new CustomEvent("ux_portal_tasks_changed", { detail: { requestId, newDeadline: newDeadlineYMD } }))
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

  // 2. Tầng 1: Đề bài & Deadlines UX
  const requests = getLocalUXRequests()
  requests.forEach((req) => {
    const deadline = req.expected_deadline || req.design_deadline
    const dateYMD = normalizeDateToYMD(deadline)
    if (!dateYMD) return

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

    // Xác định màu sắc theo trạng thái / ưu tiên
    let color = "#3b82f6" // blue
    if (req.priority === "lv1" || req.status === "PO pending") {
      color = "#ef4444" // red
    } else if (req.status === "Hoàn thành" || req.progress === 100) {
      color = "#10b981" // green
    } else if (req.status === "Đã gửi PO") {
      color = "#f59e0b" // amber
    }

    items.push({
      id: `task-${req.request_id}`,
      layer: 1,
      title: req.title,
      date: dateYMD,
      startDate: dateYMD,
      endDate: dateYMD,
      allDay: true,
      color,
      category: "ux_task",
      categoryLabel: "Deadline UX",
      assigneeName: req.assigned_designer || "Chưa phân công",
      squadName: req.squad_name || req.preferred_squad,
      productName: req.product,
      status: req.status,
      priority: req.priority,
      progress: req.progress,
      hasConflict,
      conflictReason,
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
