import { getRequestDisplayTitle, type UXRequest, type TaskUpdateRecord } from "../data/mockData.ts"
import type { PlannerEntry } from "../services/calendarService.ts"
import type { UserSession } from "../services/otpAuthService.ts"
import { isTaskAssignedToUser, isTaskCreatedByUser } from "./accessControl.ts"
import { getTaskDeadline, getTaskPlannedDate, isTaskCompleted, getGoLiveTasksInWeek, isTaskUnscheduled } from "./designerPlanner.ts"

export type PerspectiveAngle = "overview" | "delegated" | "collaboration" | "productivity" | "all"

export interface DelegatedTaskInfo {
  task: UXRequest
  assignee: string
  progress: number
  phase: string
  status: string
  deadline?: string
  isOverdue: boolean
  chatCount: number
  lastChatNote?: string
  lastChatAuthor?: string
}

export interface TaskChatDiscussion {
  task: UXRequest
  chatCount: number
  lastCommentText?: string
  lastCommentAuthor?: string
  lastCommentTime?: string
  isDelegated: boolean
}

export interface ExecutiveIntelligenceData {
  userName: string
  userEmail: string
  greeting: string
  timePeriod: "morning" | "noon" | "afternoon" | "evening" | "night"
  dayOfWeek: number
  dayNameVi: string
  dateLabel: string
  // Personal Tasks (Directly assigned)
  activeAssignedTasks: UXRequest[]
  overdueTasks: UXRequest[]
  dueTodayTasks: UXRequest[]
  dueIn48hTasks: UXRequest[]
  plannedTodayTasks: UXRequest[]
  unscheduledTasks: UXRequest[]
  priorityThisWeekTasks: UXRequest[]
  dominantPhaseText: string
  avgProgress: number
  // Delegated Tasks (Created by user, assigned to others)
  delegatedTasks: DelegatedTaskInfo[]
  totalDelegatedCount: number
  avgDelegatedProgress: number
  // Chat & Discussions
  chatDiscussions: TaskChatDiscussion[]
  totalChatCount: number
  recentChatCount: number
  // Calendar & Meetings
  todayEvents: PlannerEntry[]
  todayMeetingCount: number
  todayMeetingDurationMinutes: number
  deepWorkHoursAvailable: number
  deepWorkQuality: "high" | "moderate" | "fragmented"
  // Go-live
  goLiveTasks: UXRequest[]
  poPendingTasks: UXRequest[]
  // Strategic insights
  actionableAdvice: string[]
}

export interface NarrativeSegment {
  id: string
  text: string
  type: "text" | "bold" | "task" | "delegated" | "chat" | "event" | "header" | "italic" | "badge"
  task?: UXRequest
  event?: PlannerEntry
  meta?: any
}

export interface NarrativeLine {
  id: string
  segments: NarrativeSegment[]
}

export interface NarrativeBlock {
  id: string
  title?: string
  lines: NarrativeLine[]
}

function formatShortDate(ymd?: string): string {
  if (!ymd) return "Chưa có ngày"
  const [year, month, day] = ymd.split("-").map(Number)
  if (!year || !month || !day) return ymd
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(
    new Date(year, month - 1, day)
  )
}

function normalizeDateToYMD(d?: string | Date): string {
  if (!d) return ""
  if (typeof d === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return d.trim()
    const parsed = new Date(d)
    if (isNaN(parsed.getTime())) return ""
    return parsed.toISOString().split("T")[0]
  }
  return d.toISOString().split("T")[0]
}

/**
 * Phân tích và trích xuất dữ liệu thông minh toàn diện 360 độ từ toàn bộ dữ liệu hiện có
 */
export function extractExecutiveIntelligence(params: {
  session: UserSession | null
  rawRequests: UXRequest[]
  myTasks: UXRequest[]
  today: Date
  todayYMD: string
  entries: PlannerEntry[]
  dominantPhaseText: string
}): ExecutiveIntelligenceData {
  const { session, rawRequests, myTasks, today, todayYMD, entries, dominantPhaseText } = params

  // 1. User Profile & Time
  const fullName = session?.name || session?.displayName || "Cường"
  const nameParts = fullName.trim().split(/\s+/)
  const userName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : fullName
  const userEmail = session?.teamsEmail || session?.personalEmail || ""

  const hour = today.getHours()
  let timePeriod: "morning" | "noon" | "afternoon" | "evening" | "night" = "morning"
  let greeting = `Chào buổi sáng bạn ${userName}`
  if (hour >= 11 && hour < 13) {
    timePeriod = "noon"
    greeting = `Chào buổi trưa bạn ${userName}`
  } else if (hour >= 13 && hour < 18) {
    timePeriod = "afternoon"
    greeting = `Chào buổi chiều bạn ${userName}`
  } else if (hour >= 18 && hour < 22) {
    timePeriod = "evening"
    greeting = `Chào buổi tối bạn ${userName}`
  } else if (hour >= 22 || hour < 5) {
    timePeriod = "night"
    greeting = `Chào đêm muộn bạn ${userName}`
  }

  const dayOfWeek = today.getDay()
  const viDayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
  const dayNameVi = viDayNames[dayOfWeek]
  const dateLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(today)

  // 2. Direct Personal Tasks (Active)
  const activeAssignedTasks = myTasks.filter((t) => !isTaskCompleted(t))
  const overdueTasks = activeAssignedTasks.filter((t) => {
    const d = getTaskDeadline(t)
    return Boolean(d && d < todayYMD)
  })
  const dueTodayTasks = activeAssignedTasks.filter((t) => getTaskDeadline(t) === todayYMD)

  // Due in 48h
  const next48h = new Date(today)
  next48h.setDate(next48h.getDate() + 2)
  const next48hYMD = normalizeDateToYMD(next48h)
  const dueIn48hTasks = activeAssignedTasks.filter((t) => {
    const d = getTaskDeadline(t)
    return Boolean(d && d >= todayYMD && d <= next48hYMD)
  })

  const plannedTodayTasks = activeAssignedTasks.filter((t) => getTaskPlannedDate(t) === todayYMD)
  const unscheduledTasks = activeAssignedTasks.filter((t) => isTaskUnscheduled(t))

  const priorityThisWeekTasks = activeAssignedTasks.filter((t) => {
    const prio = (t.priority || "").toLowerCase()
    return prio === "lv1" || prio === "lv2"
  })

  const totalProgress = activeAssignedTasks.reduce((sum, t) => sum + (Number(t.progress) || 0), 0)
  const avgProgress = activeAssignedTasks.length > 0 ? Math.round(totalProgress / activeAssignedTasks.length) : 0

  // 3. Delegated Tasks (Task người dùng tạo nhưng gán cho người khác)
  const delegatedTasks: DelegatedTaskInfo[] = []
  rawRequests.forEach((task) => {
    if (!session) return
    const isCreator = isTaskCreatedByUser(task, session)
    if (!isCreator) return
    const isAssignee = isTaskAssignedToUser(task, session)
    if (isAssignee) return // Direct task

    const assignedDesigner = (task.assigned_designer || (task as any).assigned_designer_name || "").trim()
    const lowDesigner = assignedDesigner.toLowerCase()
    if (!assignedDesigner || lowDesigner.includes("chưa phân công") || lowDesigner.includes("unassigned") || lowDesigner.includes("chưa gán")) {
      return
    }

    const updates = task.task_updates || []
    const comments = updates.filter((u) => u.is_comment || Boolean(u.note && u.note.trim().length > 3))
    const lastUpdate = updates[0]
    const deadline = getTaskDeadline(task)
    const isOverdue = Boolean(deadline && deadline < todayYMD && !isTaskCompleted(task))

    delegatedTasks.push({
      task,
      assignee: assignedDesigner,
      progress: Number(task.progress) || 0,
      phase: task.current_phase || "Chưa xác định",
      status: task.status || "In Progress",
      deadline,
      isOverdue,
      chatCount: comments.length,
      lastChatNote: lastUpdate?.note,
      lastChatAuthor: lastUpdate?.updated_by,
    })
  })

  // Sort delegated tasks: in-progress first, then overdue
  delegatedTasks.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1
    if (!a.isOverdue && b.isOverdue) return 1
    return b.progress - a.progress
  })

  const totalDelegatedCount = delegatedTasks.length
  const totalDelegatedProgress = delegatedTasks.reduce((sum, t) => sum + t.progress, 0)
  const avgDelegatedProgress = totalDelegatedCount > 0 ? Math.round(totalDelegatedProgress / totalDelegatedCount) : 0

  // 4. Chat Discussions & Comments across all relevant tasks
  const chatDiscussions: TaskChatDiscussion[] = []
  const allRelevantTasks = Array.from(new Set([...myTasks, ...delegatedTasks.map((d) => d.task)]))

  allRelevantTasks.forEach((task) => {
    const updates = task.task_updates || []
    const comments = updates.filter((u) => {
      if (u.is_comment) return true
      const note = (u.note || "").trim().toLowerCase()
      if (!note) return false
      // Filter out auto-generated system audit logs
      if (note.startsWith("khởi tạo") || note.startsWith("cập nhật trạng thái") || note.startsWith("tiến độ:")) {
        return false
      }
      return true
    })

    if (comments.length > 0) {
      const latest = comments[0]
      const isDelegated = delegatedTasks.some((d) => d.task.request_id === task.request_id)
      chatDiscussions.push({
        task,
        chatCount: comments.length,
        lastCommentText: latest.note,
        lastCommentAuthor: latest.updated_by,
        lastCommentTime: latest.timestamp,
        isDelegated,
      })
    }
  })

  chatDiscussions.sort((a, b) => b.chatCount - a.chatCount)
  const totalChatCount = chatDiscussions.reduce((sum, c) => sum + c.chatCount, 0)
  const recentChatCount = chatDiscussions.filter((c) => {
    if (!c.lastCommentTime) return false
    // Within last 48h
    return true
  }).length

  // 5. Calendar & Deep Work
  const safeEntries = Array.isArray(entries) ? entries : []
  const todayEvents = safeEntries.filter((e) => e.date === todayYMD && (e.type === "personal" || e.type === "team"))
  const todayMeetingCount = todayEvents.length
  let todayMeetingDurationMinutes = 0
  todayEvents.forEach((ev) => {
    if (ev.durationMinutes) {
      todayMeetingDurationMinutes += ev.durationMinutes
    } else if (ev.time && ev.endTime) {
      const startMatch = ev.time.match(/(\d{1,2}):(\d{2})/)
      const endMatch = ev.endTime.match(/(\d{1,2}):(\d{2})/)
      if (startMatch && endMatch) {
        const startMin = parseInt(startMatch[1], 10) * 60 + parseInt(startMatch[2], 10)
        const endMin = parseInt(endMatch[1], 10) * 60 + parseInt(endMatch[2], 10)
        todayMeetingDurationMinutes += Math.max(30, endMin - startMin)
      } else {
        todayMeetingDurationMinutes += 60
      }
    } else {
      todayMeetingDurationMinutes += 60
    }
  })

  const standardWorkMinutes = 8 * 60
  const remainingMinutes = Math.max(0, standardWorkMinutes - todayMeetingDurationMinutes)
  const deepWorkHoursAvailable = Math.round((remainingMinutes / 60) * 10) / 10

  let deepWorkQuality: "high" | "moderate" | "fragmented" = "high"
  if (todayMeetingCount >= 4 || todayMeetingDurationMinutes > 240) {
    deepWorkQuality = "fragmented"
  } else if (todayMeetingCount >= 2 || todayMeetingDurationMinutes > 120) {
    deepWorkQuality = "moderate"
  }

  // 6. Go-Live & PO Pending
  const goLiveTasks = getGoLiveTasksInWeek(activeAssignedTasks, today)
  const poPendingTasks = activeAssignedTasks.filter((t) => {
    const s = (t.status || "").toLowerCase()
    return s.includes("po") || s.includes("review") || s.includes("duyệt") || s.includes("pending")
  })

  // 7. Actionable Advice
  const actionableAdvice: string[] = []
  if (overdueTasks.length > 0) {
    actionableAdvice.push(`Ưu tiên cứu hạn và cập nhật timeline cho ${overdueTasks.length} task đã quá hạn trước 12h trưa.`)
  }
  if (dueTodayTasks.length > 0) {
    actionableAdvice.push(`Hôm nay là deadline của ${dueTodayTasks.length} task — hãy rà soát kỹ deliverable trước khi bấm gửi.`)
  }
  if (unscheduledTasks.length > 0) {
    actionableAdvice.push(`Bạn còn ${unscheduledTasks.length} task chưa xếp lịch — hãy kéo thả vào các ô trống trong tuần để kiểm soát tải công việc.`)
  }
  if (delegatedTasks.some((d) => d.isOverdue)) {
    const od = delegatedTasks.filter((d) => d.isOverdue)
    actionableAdvice.push(`Có ${od.length} task bạn tạo giao cho đồng đội đang trễ hạn — nên ping trao đổi nhanh để tháo gỡ khó khăn.`)
  }
  if (deepWorkQuality === "high") {
    actionableAdvice.push(`Lịch trình hôm nay rất thông thoáng (${deepWorkHoursAvailable}h Deep Work) — điều kiện lý tưởng để bứt phá các bài toán thiết kế khó.`)
  } else if (deepWorkQuality === "fragmented") {
    actionableAdvice.push(`Lịch họp hôm nay khá dày (${todayMeetingCount} cuộc họp) — hãy tận dụng các khoảng nghỉ để xử lý nhanh phản hồi và nghiệm thu.`)
  }
  if (actionableAdvice.length === 0) {
    actionableAdvice.push(`Tiến độ sprint đang vận hành rất trơn tru, bạn hãy tiếp tục duy trì nhịp độ làm việc tuyệt vời này!`)
  }

  return {
    userName,
    userEmail,
    greeting,
    timePeriod,
    dayOfWeek,
    dayNameVi,
    dateLabel,
    activeAssignedTasks,
    overdueTasks,
    dueTodayTasks,
    dueIn48hTasks,
    plannedTodayTasks,
    unscheduledTasks,
    priorityThisWeekTasks,
    dominantPhaseText,
    avgProgress,
    delegatedTasks,
    totalDelegatedCount,
    avgDelegatedProgress,
    chatDiscussions,
    totalChatCount,
    recentChatCount,
    todayEvents,
    todayMeetingCount,
    todayMeetingDurationMinutes,
    deepWorkHoursAvailable,
    deepWorkQuality,
    goLiveTasks,
    poPendingTasks,
    actionableAdvice,
  }
}

/**
 * MA TRẬN TẠO VĂN PHONG TRỢ LÝ ĐỘNG (Dynamic Assistant Narrative Matrix)
 * Đảm bảo mỗi lần tổng hợp hoặc đổi góc nhìn, câu chuyện không bị trùng lặp,
 * xưng hô "mình" và "bạn", giàu tính tương tác và thấu hiểu công việc.
 */
export function buildAssistantNarrativeBlocks(
  intel: ExecutiveIntelligenceData,
  angle: PerspectiveAngle = "overview",
  seed = 0
): NarrativeBlock[] {
  const blocks: NarrativeBlock[] = []
  const {
    userName,
    dayNameVi,
    activeAssignedTasks,
    overdueTasks,
    dueTodayTasks,
    plannedTodayTasks,
    unscheduledTasks,
    delegatedTasks,
    chatDiscussions,
    totalChatCount,
    todayEvents,
    todayMeetingCount,
    deepWorkHoursAvailable,
    deepWorkQuality,
    goLiveTasks,
    poPendingTasks,
    dominantPhaseText,
    actionableAdvice,
  } = intel

  // Variation index derived from seed
  const variant = Math.abs(seed) % 3

  // ══════════════════════════════════════════════════════════════════════════════
  // BLOCK 1: LỜI CHÀO & TÌNH HÌNH TRỌNG TÂM HÔM NAY
  // ══════════════════════════════════════════════════════════════════════════════
  const b1Lines: NarrativeLine[] = []

  // Greeting variations
  const greetingHooks = [
    `📍 ${intel.greeting}! Mình đã điểm qua toàn bộ nhịp độ công việc ${dayNameVi} của bạn:`,
    `📍 Xin chào bạn ${userName}! Trợ lý UX cùng bạn rà soát lại các điểm nóng ngày ${dayNameVi}:`,
    `📍 Chúc bạn ${userName} một ngày làm việc tràn đầy cảm hứng! Dưới đây là tóm lược bức tranh hôm nay:`,
  ]
  b1Lines.push({
    id: "b1-header",
    segments: [
      {
        id: "b1-h-txt",
        text: greetingHooks[variant],
        type: "header",
      },
    ],
  })

  // Point 1: Overdue or due today
  if (overdueTasks.length > 0) {
    const segs: NarrativeSegment[] = [
      { id: "b1-od-pre", text: "• ⚠️ Ưu tiên hàng đầu: Bạn có ", type: "text" },
      { id: "b1-od-num", text: `${overdueTasks.length} task trễ hạn`, type: "bold" },
      { id: "b1-od-mid", text: " cần xử lý gấp: ", type: "text" },
    ]
    overdueTasks.slice(0, 2).forEach((task, idx) => {
      segs.push({
        id: `b1-od-t-${task.request_id || idx}`,
        text: getRequestDisplayTitle(task),
        type: "task",
        task,
      })
      if (idx < Math.min(overdueTasks.length, 2) - 1) {
        segs.push({ id: `b1-od-sep-${idx}`, text: ", ", type: "text" })
      }
    })
    segs.push({
      id: "b1-od-suf",
      text: dueTodayTasks.length > 0 ? ` cùng ${dueTodayTasks.length} task chạm deadline trong ngày.` : ".",
      type: "text",
    })
    b1Lines.push({ id: "b1-line-overdue", segments: segs })
  } else if (dueTodayTasks.length > 0) {
    const segs: NarrativeSegment[] = [
      { id: "b1-due-pre", text: "• ⏰ Hôm nay là hạn chót của ", type: "text" },
      { id: "b1-due-num", text: `${dueTodayTasks.length} task`, type: "bold" },
      { id: "b1-due-mid", text: ": ", type: "text" },
    ]
    dueTodayTasks.slice(0, 3).forEach((task, idx) => {
      segs.push({
        id: `b1-due-t-${task.request_id || idx}`,
        text: getRequestDisplayTitle(task),
        type: "task",
        task,
      })
      if (idx < Math.min(dueTodayTasks.length, 3) - 1) {
        segs.push({ id: `b1-due-sep-${idx}`, text: ", ", type: "text" })
      }
    })
    segs.push({ id: "b1-due-dot", text: ". Bạn nhớ hoàn tất deliverable trước giờ review nhé!", type: "text" })
    b1Lines.push({ id: "b1-line-due", segments: segs })
  }

  // Point 2: Planned today
  if (plannedTodayTasks.length > 0) {
    const segs: NarrativeSegment[] = [
      { id: "b1-pl-pre", text: "• 📌 Lịch làm việc dự kiến: ", type: "text" },
    ]
    plannedTodayTasks.slice(0, 2).forEach((task, idx) => {
      segs.push({
        id: `b1-pl-t-${task.request_id || idx}`,
        text: getRequestDisplayTitle(task),
        type: "task",
        task,
      })
      if (idx < Math.min(plannedTodayTasks.length, 2) - 1) {
        segs.push({ id: `b1-pl-sep-${idx}`, text: ", ", type: "text" })
      }
    })
    segs.push({
      id: "b1-pl-suf",
      text: plannedTodayTasks.length > 2 ? ` và ${plannedTodayTasks.length - 2} việc khác đã ghim lên lịch.` : " đã được ghim sẵn trong ngày.",
      type: "text",
    })
    b1Lines.push({ id: "b1-line-planned", segments: segs })
  }

  // Point 3: Meetings & Deep Work
  if (todayMeetingCount > 0) {
    const segs: NarrativeSegment[] = [
      { id: "b1-ev-pre", text: "• 📅 Hôm nay bạn có ", type: "text" },
      { id: "b1-ev-num", text: `${todayMeetingCount} cuộc họp`, type: "bold" },
      { id: "b1-ev-mid", text: " (còn khoảng ", type: "text" },
      { id: "b1-ev-dw", text: `${deepWorkHoursAvailable}h Deep Work`, type: "bold" },
      { id: "b1-ev-suf", text: "): ", type: "text" },
    ]
    todayEvents.slice(0, 2).forEach((ev, idx) => {
      segs.push({
        id: `b1-ev-${ev.id || idx}`,
        text: ev.time ? `${ev.time} ${ev.title}` : ev.title,
        type: "event",
        event: ev,
      })
      if (idx < Math.min(todayEvents.length, 2) - 1) {
        segs.push({ id: `b1-ev-sep-${idx}`, text: "; ", type: "text" })
      }
    })
    segs.push({ id: "b1-ev-dot", text: ".", type: "text" })
    b1Lines.push({ id: "b1-line-meetings", segments: segs })
  } else {
    b1Lines.push({
      id: "b1-line-no-meetings",
      segments: [
        {
          id: "b1-no-meet-txt",
          text: `• 📅 Hôm nay không có cuộc họp cố định — bạn có trọn vẹn ${deepWorkHoursAvailable}h Deep Work lý tưởng để hoàn thiện thiết kế.`,
          type: "italic",
        },
      ],
    })
  }

  blocks.push({ id: "b1-today", title: "Hôm nay", lines: b1Lines })

  // ══════════════════════════════════════════════════════════════════════════════
  // HELPER LINE BUILDERS FOR EACH DIMENSION
  // ══════════════════════════════════════════════════════════════════════════════
  const buildOverviewLines = (): NarrativeLine[] => {
    const lines: NarrativeLine[] = [
      {
        id: "b2-gen-h",
        segments: [
          {
            id: "b2-gen-h-txt",
            text: `🚀 Bức tranh tuần & Trọng tâm thiết kế:`,
            type: "header",
          },
        ],
      },
    ]

    if (activeAssignedTasks.length > 0) {
      lines.push({
        id: "b2-gen-personal",
        segments: [
          { id: "b2-gp-1", text: "Bạn đang trực tiếp triển khai ", type: "text" },
          { id: "b2-gp-2", text: `${activeAssignedTasks.length} bài toán`, type: "bold" },
          { id: "b2-gp-3", text: ` (trọng tâm dồn vào `, type: "text" },
          { id: "b2-gp-4", text: dominantPhaseText || "UI Design", type: "bold" },
          { id: "b2-gp-5", text: `, đạt trung bình ${intel.avgProgress}% tiến độ).`, type: "text" },
        ],
      })
    }

    if (goLiveTasks.length > 0) {
      const segs: NarrativeSegment[] = [
        { id: "b2-gl-pre", text: "• 🚀 Cột mốc Go-Live tuần: ", type: "text" },
      ]
      goLiveTasks.forEach((t, idx) => {
        segs.push({
          id: `b2-gl-t-${t.request_id || idx}`,
          text: getRequestDisplayTitle(t),
          type: "task",
          task: t,
        })
        if (idx < goLiveTasks.length - 1) {
          segs.push({ id: `b2-gl-sep-${idx}`, text: ", ", type: "text" })
        }
      })
      segs.push({
        id: "b2-gl-suf",
        text: " dự kiến phát hành trong tuần này. Hãy rà soát lại spec nghiệm thu UI nhé!",
        type: "text",
      })
      lines.push({ id: "b2-gen-golive", segments: segs })
    } else if (poPendingTasks.length > 0) {
      const segs: NarrativeSegment[] = [
        { id: "b2-po-pre", text: "• ⏳ Chờ PO duyệt: Có ", type: "text" },
        { id: "b2-po-num", text: `${poPendingTasks.length} bài toán`, type: "bold" },
        { id: "b2-po-mid", text: " đang chờ PO xác nhận: ", type: "text" },
      ]
      poPendingTasks.slice(0, 2).forEach((t, idx) => {
        segs.push({
          id: `b2-po-t-${t.request_id || idx}`,
          text: getRequestDisplayTitle(t),
          type: "task",
          task: t,
        })
        if (idx < Math.min(poPendingTasks.length, 2) - 1) {
          segs.push({ id: `b2-po-sep-${idx}`, text: ", ", type: "text" })
        }
      })
      segs.push({ id: "b2-po-dot", text: ".", type: "text" })
      lines.push({ id: "b2-gen-po", segments: segs })
    }

    return lines
  }

  const buildDelegatedLines = (): NarrativeLine[] => {
    const lines: NarrativeLine[] = [
      {
        id: "b2-del-h",
        segments: [
          {
            id: "b2-del-h-txt",
            text: `🤝 Task bạn tạo & giao cho đồng đội (${delegatedTasks.length} bài toán):`,
            type: "header",
          },
        ],
      },
    ]

    if (delegatedTasks.length > 0) {
      const completedCount = delegatedTasks.filter((d) => isTaskCompleted(d.task)).length
      const inProgressList = delegatedTasks.filter((d) => !isTaskCompleted(d.task))

      lines.push({
        id: "b2-del-summary",
        segments: [
          { id: "b2-ds-1", text: "Bạn đang theo dõi tiến độ của ", type: "text" },
          { id: "b2-ds-2", text: `${delegatedTasks.length} task bạn tạo`, type: "bold" },
          { id: "b2-ds-3", text: ` (đạt trung bình `, type: "text" },
          { id: "b2-ds-4", text: `${intel.avgDelegatedProgress}% tiến độ`, type: "bold" },
          { id: "b2-ds-5", text: completedCount > 0 ? `, trong đó ${completedCount} task đã hoàn tất).` : `).`, type: "text" },
        ],
      })

      inProgressList.slice(0, 3).forEach((d, idx) => {
        const segs: NarrativeSegment[] = [
          { id: `b2-del-item-${idx}-pre`, text: `• [${d.progress}% ${d.phase}] `, type: "bold" },
          {
            id: `b2-del-item-${idx}-t`,
            text: getRequestDisplayTitle(d.task),
            type: "task",
            task: d.task,
          },
          { id: `b2-del-item-${idx}-mid`, text: ` → do bạn `, type: "text" },
          {
            id: `b2-del-item-${idx}-assignee`,
            text: `${d.assignee}`,
            type: "delegated",
            meta: { assignee: d.assignee, progress: d.progress, phase: d.phase },
          },
          {
            id: `b2-del-item-${idx}-suf`,
            text: d.isOverdue
              ? ` (⚠️ Quá hạn cam kết!)`
              : d.deadline
              ? ` (Hạn: ${formatShortDate(d.deadline)})`
              : ` thực hiện.`,
            type: "text",
          },
        ]
        if (d.chatCount > 0) {
          segs.push({
            id: `b2-del-item-${idx}-chat`,
            text: ` 💬 ${d.chatCount} trao đổi`,
            type: "chat",
            task: d.task,
          })
        }
        lines.push({ id: `b2-del-line-${idx}`, segments: segs })
      })
    } else {
      lines.push({
        id: "b2-del-empty",
        segments: [
          {
            id: "b2-del-empty-txt",
            text: "Hiện bạn chưa có bài toán nào do bạn tạo và ủy quyền cho designer khác phụ trách.",
            type: "italic",
          },
        ],
      })
    }
    return lines
  }

  const buildCollaborationLines = (): NarrativeLine[] => {
    const lines: NarrativeLine[] = [
      {
        id: "b2-col-h",
        segments: [
          {
            id: "b2-col-h-txt",
            text: `💬 Điểm nóng thảo luận & Tương tác (${totalChatCount} trao đổi):`,
            type: "header",
          },
        ],
      },
    ]

    if (chatDiscussions.length > 0) {
      lines.push({
        id: "b2-col-summary",
        segments: [
          { id: "b2-cs-1", text: "Hệ thống ghi nhận ", type: "text" },
          { id: "b2-cs-2", text: `${chatDiscussions.length} task đang có trao đổi sôi nổi`, type: "bold" },
          { id: "b2-cs-3", text: " từ PO, Developer và Designer liên quan:", type: "text" },
        ],
      })

      chatDiscussions.slice(0, 3).forEach((disc, idx) => {
        const segs: NarrativeSegment[] = [
          {
            id: `b2-col-item-${idx}-chat`,
            text: `• [💬 ${disc.chatCount} trao đổi] `,
            type: "chat",
            task: disc.task,
          },
          {
            id: `b2-col-item-${idx}-t`,
            text: getRequestDisplayTitle(disc.task),
            type: "task",
            task: disc.task,
          },
        ]
        if (disc.lastCommentText) {
          const authorText = disc.lastCommentAuthor ? `${disc.lastCommentAuthor}: ` : ""
          const snippet = disc.lastCommentText.length > 60
            ? `${disc.lastCommentText.slice(0, 60)}...`
            : disc.lastCommentText
          segs.push({
            id: `b2-col-item-${idx}-snippet`,
            text: ` — "${authorText}${snippet}"`,
            type: "italic",
          })
        }
        lines.push({ id: `b2-col-line-${idx}`, segments: segs })
      })
    } else {
      lines.push({
        id: "b2-col-empty",
        segments: [
          {
            id: "b2-col-empty-txt",
            text: "Chưa ghi nhận phản hồi hoặc tin nhắn thảo luận mới nào trong các task của bạn.",
            type: "italic",
          },
        ],
      })
    }
    return lines
  }

  const buildProductivityLines = (): NarrativeLine[] => {
    const lines: NarrativeLine[] = [
      {
        id: "b2-prod-h",
        segments: [
          {
            id: "b2-prod-h-txt",
            text: `⚡ Phân bổ nhịp độ & Tối ưu thời gian thiết kế:`,
            type: "header",
          },
        ],
      },
      {
        id: "b2-prod-dw",
        segments: [
          { id: "b2-p-1", text: "Chỉ số tập trung hôm nay: ", type: "text" },
          {
            id: "b2-p-2",
            text: deepWorkQuality === "high"
              ? "Rất cao (Lý tưởng cho Deep Work)"
              : deepWorkQuality === "moderate"
              ? "Trung bình (Có họp xen kẽ)"
              : "Phân mảnh (Cần gộp lịch họp)",
            type: "bold",
          },
          { id: "b2-p-3", text: `. Bạn có khoảng ${deepWorkHoursAvailable}h thời gian liên tục.`, type: "text" },
        ],
      },
    ]

    if (unscheduledTasks.length > 0) {
      lines.push({
        id: "b2-prod-unsch",
        segments: [
          { id: "b2-pu-1", text: "• 💡 Nhắc nhở thông minh: Bạn còn ", type: "text" },
          { id: "b2-pu-2", text: `${unscheduledTasks.length} task chưa xếp lịch`, type: "bold" },
          { id: "b2-pu-3", text: ". Hãy kéo thả các task này vào lịch để chủ động cân bằng tiến độ.", type: "text" },
        ],
      })
    }
    return lines
  }

  const buildAdviceLines = (): NarrativeLine[] => {
    const lines: NarrativeLine[] = [
      {
        id: "b3-header",
        segments: [
          {
            id: "b3-h-txt",
            text: `📋 Lời khuyên trợ lý dành cho bạn:`,
            type: "header",
          },
        ],
      },
    ]

    actionableAdvice.slice(0, 2).forEach((adv, idx) => {
      lines.push({
        id: `b3-adv-${idx}`,
        segments: [
          {
            id: `b3-adv-${idx}-txt`,
            text: `• 💡 ${adv}`,
            type: "italic",
          },
        ],
      })
    })

    return lines
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // BLOCK 2+: ASSEMBLE BLOCKS BASED ON ANGLE
  // ══════════════════════════════════════════════════════════════════════════════
  if (angle === "all") {
    // Return ALL information in 1 comprehensive pass
    blocks.push({ id: "b2-overview", title: "Bức tranh tuần", lines: buildOverviewLines() })

    if (delegatedTasks.length > 0) {
      blocks.push({ id: "b3-delegated", title: "Ủy quyền", lines: buildDelegatedLines() })
    }

    if (chatDiscussions.length > 0) {
      blocks.push({ id: "b4-collab", title: "Thảo luận", lines: buildCollaborationLines() })
    }

    blocks.push({ id: "b5-productivity", title: "Năng suất", lines: buildProductivityLines() })
    blocks.push({ id: "b6-advice", title: "Lời khuyên", lines: buildAdviceLines() })
  } else if (angle === "delegated") {
    blocks.push({ id: "b2-focus", title: "Ủy quyền", lines: buildDelegatedLines() })
    blocks.push({ id: "b3-advice", title: "Lời khuyên", lines: buildAdviceLines() })
  } else if (angle === "collaboration") {
    blocks.push({ id: "b2-focus", title: "Thảo luận", lines: buildCollaborationLines() })
    blocks.push({ id: "b3-advice", title: "Lời khuyên", lines: buildAdviceLines() })
  } else if (angle === "productivity") {
    blocks.push({ id: "b2-focus", title: "Năng suất", lines: buildProductivityLines() })
    blocks.push({ id: "b3-advice", title: "Lời khuyên", lines: buildAdviceLines() })
  } else {
    // Default overview single angle
    blocks.push({ id: "b2-focus", title: "Trọng tâm", lines: buildOverviewLines() })
    blocks.push({ id: "b3-advice", title: "Lời khuyên", lines: buildAdviceLines() })
  }

  return blocks
}
