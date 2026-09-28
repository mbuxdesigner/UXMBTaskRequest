import React, { useCallback, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Flag,
  LayoutGrid,
  ListChecks,
  MapPin,
  Paperclip,
  Plus,
  RefreshCw,
  Repeat2,
  Rocket,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge, PriorityBadge, StatusPill } from "@/components/ui/badge"
import { HoverPreview } from "@/components/ui/hover-preview"
import { RightSheet } from "@/components/ui/right-sheet"
import { toast } from "@/components/ui/toast"
import { getRequestDisplayTitle, type UXRequest } from "@/data/mockData"
import { isTaskAssignedToUser } from "@/lib/accessControl"
import {
  buildRuleBasedBriefing,
  getDesignerPhaseDistribution,
  getGoLiveTasksInWeek,
  getTaskDeadline,
  getTaskPlannedDate,
  getWeekBounds,
  isTaskCompleted,
  type PlannerBriefingItem,
} from "@/lib/designerPlanner"
import { cascadeWaveContainerVariants, cascadeWaveItemVariants } from "@/lib/motion"
import {
  addTeamEvent,
  assessTaskRisk,
  computeCalendarWeeks,
  getLocalUXRequests,
  loadAllCalendarItems,
  normalizeDateToYMD,
  updateTaskPlannedDate,
  type CalendarItem,
} from "@/services/calendarService"
import { getStoredSession } from "@/services/otpAuthService"
import { useNotifications } from "@/services/notificationService"
import { fetchTeamMembersFromSheet, updateTaskProgressInSheet } from "@/services/googleSheetService"
import { getSystemConfig, type HolidayException } from "@/config/systemConfig"
import type { EventCategoryConfig, TeamEvent } from "@/config/systemConfig"
import { ScheduleMeetingDialog, type ScheduleMeetingDesigner, type ScheduleMeetingValues } from "@/components/planner/ScheduleMeetingDialog"
import type { TeamLeaveRecord } from "@/services/leaveService"
import { uploadFileToDrive } from "@/services/googleSheetService"
import { cn } from "@/lib/utils"

type PlannerView = "month" | "week"
type PlannerEntryType = "deadline" | "planned" | "leave" | "team" | "personal"
type QuoteAnimationPhase = "typing" | "holding" | "deleting"

interface PlannerEntry {
  id: string
  date: string
  type: PlannerEntryType
  title: string
  label: string
  color: string
  accentColor?: string
  time?: string
  location?: string
  description?: string
  attendees?: string[]
  endTime?: string
  recurrence?: TeamEvent["recurrence"]
  recurrenceEndDate?: string
  meetingOptions?: TeamEvent["meetingOptions"]
  attachments?: TeamEvent["attachments"]
  request?: UXRequest
  source?: CalendarItem
}

const QUOTES = [
  "Thiết kế tốt bắt đầu từ việc nhìn đúng vấn đề.",
  "Mỗi chi tiết rõ ràng hôm nay sẽ giảm một lần bối rối ngày mai.",
  "Đừng chỉ làm giao diện đẹp — hãy làm quyết định trở nên dễ dàng.",
  "Khoảng trắng cũng là một phần của câu chuyện thiết kế.",
  "Một trải nghiệm mạch lạc luôn được tạo nên từ nhiều lựa chọn nhỏ đúng đắn.",
  "Prototype sớm, học nhanh và giữ người dùng ở trung tâm.",
]

const QUOTE_HOLD_MS = 20_000
const QUOTE_TYPE_MS = 38
const QUOTE_DELETE_MS = 20

const ENTRY_META: Record<PlannerEntryType, { label: string; color: string; dot: string }> = {
  deadline: { label: "Deadline", color: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  planned: { label: "Dự kiến làm", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  leave: { label: "Lịch nghỉ", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  team: { label: "Event team", color: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  personal: { label: "Event của tôi", color: "bg-cyan-50 text-cyan-700 border-cyan-200", dot: "bg-cyan-500" },
}

function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatShortDate(ymd?: string): string {
  if (!ymd) return "Chưa có ngày"
  const [year, month, day] = ymd.split("-").map(Number)
  if (!year || !month || !day) return ymd
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(
    new Date(year, month - 1, day),
  )
}

function parseYMD(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function colorWithAlpha(color: string, alpha: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color
}

function addMinutesToLocalDateTime(date: string, time: string, minutes: number): string {
  const [year, month, day] = date.split("-").map(Number)
  const [hour, minute] = time.split(":").map(Number)
  const result = new Date(year, month - 1, day, hour, minute + minutes)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}T${pad(result.getHours())}:${pad(result.getMinutes())}`
}

function BriefingTypewriter({ text, runKey, delay = 0 }: { text: string; runKey: number; delay?: number }) {
  const [visibleLength, setVisibleLength] = useState(0)

  useEffect(() => {
    setVisibleLength(0)
    let interval: number | undefined
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        setVisibleLength((current) => {
          if (current >= text.length) {
            if (interval) window.clearInterval(interval)
            return current
          }
          return current + 1
        })
      }, 16)
    }, delay)
    return () => {
      window.clearTimeout(start)
      if (interval) window.clearInterval(interval)
    }
  }, [text, runKey, delay])

  return (
    <span aria-label={text}>
      <span aria-hidden="true">{text.slice(0, visibleLength)}</span>
      {visibleLength < text.length && <span aria-hidden="true" className="ml-0.5 inline-block h-3 w-px animate-pulse bg-slate-400" />}
    </span>
  )
}

function normalizeMeetingDesigners(members: unknown[]): ScheduleMeetingDesigner[] {
  const seen = new Set<string>()
  return members.flatMap((raw, index) => {
    const member = raw as Record<string, unknown>
    const name = String(member.name || member.displayName || "").trim()
    const email = String(member.email || member.teamsEmail || member.personalEmail || "").trim()
    const role = String(member.role || "Designer").trim()
    const roleLower = role.toLowerCase()
    const isDesigner = roleLower.includes("design") || roleLower.includes("ux") || roleLower.includes("ui")
    const key = email.toLowerCase()
    if (!name || !email || !isDesigner || seen.has(key)) return []
    seen.add(key)
    return [{
      id: String(member.id || `designer-${index}`),
      name,
      email,
      role,
      avatar: String(member.avatarUrl || member.avatar || "").trim() || undefined,
    }]
  })
}

function isSameIdentity(value: string | undefined, name: string, email: string): boolean {
  if (!value) return false
  const normalized = value.toLowerCase()
  const nameToken = name.toLowerCase().trim()
  const emailToken = email.toLowerCase().trim()
  const emailPrefix = emailToken.split("@")[0]
  return Boolean(
    (nameToken && normalized.includes(nameToken)) ||
      (emailToken && normalized.includes(emailToken)) ||
      (emailPrefix && normalized.includes(emailPrefix)),
  )
}

function getGreeting(hour: number): string {
  if (hour < 11) return "Chào buổi sáng"
  if (hour < 14) return "Chào buổi trưa"
  if (hour < 18) return "Chào buổi chiều"
  return "Chào buổi tối"
}

function getTaskDateForWeek(task: UXRequest): string {
  return getTaskPlannedDate(task) || getTaskDeadline(task)
}

export default function DesignerPlannerPage() {
  const session = getStoredSession()
  const today = useMemo(() => new Date(), [])
  const todayYMD = normalizeDateToYMD(today)
  const designerName = session?.displayName?.trim() || "Designer"
  const designerEmail = session?.personalEmail || session?.teamsEmail || ""

  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length))
  const [displayedQuote, setDisplayedQuote] = useState("")
  const [quotePhase, setQuotePhase] = useState<QuoteAnimationPhase>("typing")
  const [rawRequests, setRawRequests] = useState<UXRequest[]>([])
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([])
  const [leaves, setLeaves] = useState<TeamLeaveRecord[]>([])
  const [holidays, setHolidays] = useState<HolidayException[]>([])
  const [eventCategories, setEventCategories] = useState<EventCategoryConfig[]>([])
  const [meetingDesigners, setMeetingDesigners] = useState<ScheduleMeetingDesigner[]>(() => {
    try {
      const cached = localStorage.getItem("mbbank_admin_team") || localStorage.getItem("mbbank_team_members")
      return cached ? normalizeMeetingDesigners(JSON.parse(cached)) : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<PlannerView>("month")
  const [anchorDate, setAnchorDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState(todayYMD)
  const [briefingCollapsed, setBriefingCollapsed] = useState(false)
  const [briefingUpdatedAt, setBriefingUpdatedAt] = useState(new Date())
  const [briefingPulse, setBriefingPulse] = useState(0)
  const [notificationFilter, setNotificationFilter] = useState<"unread" | "all">("unread")
  const [visibleTypes, setVisibleTypes] = useState<Record<PlannerEntryType, boolean>>({
    deadline: true,
    planned: true,
    leave: true,
    team: true,
    personal: true,
  })
  const [scheduleTask, setScheduleTask] = useState<UXRequest | null>(null)
  const [detailEntry, setDetailEntry] = useState<PlannerEntry | null>(null)
  const [scheduleDate, setScheduleDate] = useState(todayYMD)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [eventDate, setEventDate] = useState(todayYMD)
  const [eventSaving, setEventSaving] = useState(false)

  const {
    notifications,
    markAsRead,
  } = useNotifications()

  const availableMeetingDesigners = useMemo(() => {
    const currentRole = String(session?.role || "").toLowerCase()
    const currentIsDesigner = currentRole.includes("design") || currentRole.includes("ux") || currentRole.includes("ui")
    if (!currentIsDesigner || !designerEmail || meetingDesigners.some((designer) => designer.email.toLowerCase() === designerEmail.toLowerCase())) return meetingDesigners
    return [{ id: "current-designer", name: designerName, email: designerEmail, role: session?.role || "Designer" }, ...meetingDesigners]
  }, [designerEmail, designerName, meetingDesigners, session?.role])
  const defaultMeetingAttendee = availableMeetingDesigners.find((designer) => designer.email.toLowerCase() === designerEmail.toLowerCase())?.email || availableMeetingDesigners[0]?.email || ""

  const quote = QUOTES[quoteIndex]

  useEffect(() => {
    const selectNextQuote = () => {
      setQuoteIndex((current) => {
        if (QUOTES.length < 2) return current
        const offset = 1 + Math.floor(Math.random() * (QUOTES.length - 1))
        return (current + offset) % QUOTES.length
      })
    }

    if (quotePhase === "typing") {
      if (displayedQuote.length >= quote.length) {
        setQuotePhase("holding")
        return
      }
      const timeout = window.setTimeout(() => {
        setDisplayedQuote(quote.slice(0, displayedQuote.length + 1))
      }, QUOTE_TYPE_MS)
      return () => window.clearTimeout(timeout)
    }

    if (quotePhase === "holding") {
      const timeout = window.setTimeout(() => setQuotePhase("deleting"), QUOTE_HOLD_MS)
      return () => window.clearTimeout(timeout)
    }

    if (displayedQuote.length > 0) {
      const timeout = window.setTimeout(() => {
        setDisplayedQuote((current) => current.slice(0, -1))
      }, QUOTE_DELETE_MS)
      return () => window.clearTimeout(timeout)
    }

    selectNextQuote()
    setQuotePhase("typing")
  }, [displayedQuote, quote, quotePhase])

  useEffect(() => {
    let active = true
    fetchTeamMembersFromSheet().then((members) => {
      if (!active || !Array.isArray(members) || members.length === 0) return
      const designers = normalizeMeetingDesigners(members)
      if (designers.length > 0) setMeetingDesigners(designers)
    }).catch(() => {})
    return () => { active = false }
  }, [])

  const reloadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await loadAllCalendarItems()
      setCalendarItems(data.items)
      setLeaves(data.leaves)
      setHolidays(data.holidays || [])
      setEventCategories(data.categories || [])
      setRawRequests(getLocalUXRequests())
    } catch (error) {
      console.error("[DesignerPlanner] Unable to load planner data:", error)
      toast.error("Không thể tải dữ liệu Planner")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reloadData()
    const handleDataChange = () => reloadData()
    window.addEventListener("ux_portal_tasks_changed", handleDataChange)
    window.addEventListener("mbbank_system_config_changed", handleDataChange)
    return () => {
      window.removeEventListener("ux_portal_tasks_changed", handleDataChange)
      window.removeEventListener("mbbank_system_config_changed", handleDataChange)
    }
  }, [reloadData])

  const myTasks = useMemo(() => {
    if (!session) return rawRequests
    return rawRequests.filter((task) => isTaskAssignedToUser(task, session, true))
  }, [rawRequests, session])

  const activeTasks = useMemo(() => myTasks.filter((task) => !isTaskCompleted(task)), [myTasks])
  const taskIds = useMemo(() => new Set(myTasks.map((task) => task.request_id)), [myTasks])

  const riskByTaskId = useMemo(() => {
    return Object.fromEntries(
      activeTasks.map((task) => [task.request_id, assessTaskRisk(task, leaves).riskLevel]),
    )
  }, [activeTasks, leaves])

  const overloadedTasks = useMemo(
    () => activeTasks.filter((task) => riskByTaskId[task.request_id] !== "on_track"),
    [activeTasks, riskByTaskId],
  )
  const goLiveTasks = useMemo(() => getGoLiveTasksInWeek(activeTasks, today), [activeTasks, today])
  const phaseDistribution = useMemo(() => getDesignerPhaseDistribution(activeTasks), [activeTasks])
  const briefing = useMemo(
    () => buildRuleBasedBriefing(activeTasks, today, riskByTaskId),
    [activeTasks, today, riskByTaskId, briefingPulse],
  )

  const personalLeaves = useMemo(
    () => leaves.filter((leave) => isSameIdentity(`${leave.fullName} ${leave.email || ""} ${leave.account || ""}`, designerName, designerEmail)),
    [leaves, designerName, designerEmail],
  )

  const entries = useMemo<PlannerEntry[]>(() => {
    const result: PlannerEntry[] = []
    myTasks.forEach((task) => {
      const planned = getTaskPlannedDate(task)
      const deadline = getTaskDeadline(task)
      if (planned) {
        result.push({
          id: `planned-${task.request_id}`,
          date: planned,
          type: "planned",
          title: getRequestDisplayTitle(task),
          label: "Dự kiến làm",
          color: ENTRY_META.planned.dot,
          request: task,
        })
      }
      if (deadline) {
        result.push({
          id: `deadline-${task.request_id}`,
          date: deadline,
          type: "deadline",
          title: getRequestDisplayTitle(task),
          label: "Deadline",
          color: ENTRY_META.deadline.dot,
          request: task,
        })
      }
    })

    personalLeaves.forEach((leave) => {
      const from = normalizeDateToYMD(leave.fromDate)
      const to = normalizeDateToYMD(leave.toDate) || from
      if (!from) return
      let cursor = parseYMD(from)
      const end = parseYMD(to)
      while (cursor <= end) {
        result.push({
          id: `leave-${leave.id}-${normalizeDateToYMD(cursor)}`,
          date: normalizeDateToYMD(cursor),
          type: "leave",
          title: `Nghỉ ${leave.shift || "cả ngày"}`,
          label: "Lịch nghỉ",
          color: ENTRY_META.leave.dot,
        })
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
      }
    })

    calendarItems.filter((item) => item.layer === 4).forEach((item) => {
      const rawEvent = item.rawItem as TeamEvent
      const attendeeText = `${rawEvent.createdBy || ""} ${(rawEvent.attendees || []).join(" ")}`
      const isPersonal = isSameIdentity(attendeeText, designerName, designerEmail) &&
        Boolean(rawEvent.createdBy && isSameIdentity(rawEvent.createdBy, designerName, designerEmail))
      result.push({
        id: item.id,
        date: item.date,
        type: isPersonal ? "personal" : "team",
        title: item.title,
        label: isPersonal ? "Event của tôi" : "Event team",
        color: isPersonal ? ENTRY_META.personal.dot : ENTRY_META.team.dot,
        accentColor: item.color,
        time: item.allDay ? "Cả ngày" : item.startDate.includes("T") ? item.startDate.split("T")[1]?.slice(0, 5) : undefined,
        location: rawEvent.location,
        description: rawEvent.description,
        attendees: rawEvent.attendees,
        endTime: item.allDay ? undefined : item.endDate.includes("T") ? item.endDate.split("T")[1]?.slice(0, 5) : undefined,
        recurrence: rawEvent.recurrence,
        recurrenceEndDate: rawEvent.recurrenceEndDate,
        meetingOptions: rawEvent.meetingOptions,
        attachments: rawEvent.attachments,
        source: item,
      })
    })
    return result.filter((entry) => visibleTypes[entry.type])
  }, [myTasks, personalLeaves, calendarItems, designerName, designerEmail, visibleTypes])

  const workSchedule = useMemo(() => getSystemConfig().workSchedule, [holidays])
  const holidayByDate = useMemo(() => {
    const result = new Map<string, HolidayException>()
    holidays.forEach((holiday) => {
      const startYMD = normalizeDateToYMD(holiday.date)
      const endYMD = normalizeDateToYMD(holiday.endDate) || startYMD
      if (!startYMD) return
      let cursor = parseYMD(startYMD)
      const end = parseYMD(endYMD)
      while (cursor <= end) {
        result.set(normalizeDateToYMD(cursor), holiday)
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
      }
    })
    return result
  }, [holidays])

  const entriesByDate = useMemo(() => {
    const map = new Map<string, PlannerEntry[]>()
    entries.forEach((entry) => {
      const current = map.get(entry.date) || []
      current.push(entry)
      map.set(entry.date, current)
    })
    map.forEach((dayEntries) => {
      dayEntries.sort((a, b) => {
        const order: Record<PlannerEntryType, number> = { deadline: 0, planned: 1, personal: 2, team: 3, leave: 4 }
        return order[a.type] - order[b.type]
      })
    })
    return map
  }, [entries])

  const calendarWeeks = useMemo(() => computeCalendarWeeks(anchorDate, true), [anchorDate])
  const visibleDays = useMemo(() => {
    if (view === "month") return calendarWeeks.flatMap((week) => week.days)
    const { start } = getWeekBounds(anchorDate)
    const monday = parseYMD(start)
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      const dateYMD = normalizeDateToYMD(date)
      return {
        date,
        dateYMD,
        dayNumber: date.getDate(),
        isCurrentMonth: true,
        isToday: dateYMD === todayYMD,
        isFirstOfMonth: date.getDate() === 1,
        monthShort: "",
        dayOfWeekIndex: index,
        weekNumber: 0,
      }
    })
  }, [view, calendarWeeks, anchorDate, todayYMD])

  const selectedEntries = useMemo(() => entriesByDate.get(selectedDate) || [], [entriesByDate, selectedDate])
  const { start: weekStart, end: weekEnd } = useMemo(() => getWeekBounds(parseYMD(selectedDate)), [selectedDate])
  const priorityThisWeek = useMemo(() => {
    return activeTasks
      .filter((task) => {
        const priority = (task.priority || "").toLowerCase()
        const date = getTaskDateForWeek(task)
        return (priority === "lv1" || priority === "lv2") && Boolean(date && date >= weekStart && date <= weekEnd)
      })
      .sort((a, b) => getTaskDateForWeek(a).localeCompare(getTaskDateForWeek(b)))
  }, [activeTasks, weekStart, weekEnd])

  const unscheduledTasks = useMemo(
    () => activeTasks.filter((task) => !getTaskPlannedDate(task)),
    [activeTasks],
  )

  const relevantNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (notification.requestId && taskIds.has(notification.requestId)) return true
      return isSameIdentity(notification.recipient, designerName, designerEmail)
    })
  }, [notifications, taskIds, designerName, designerEmail])
  const shownNotifications = notificationFilter === "unread"
    ? relevantNotifications.filter((notification) => !notification.read)
    : relevantNotifications

  const markRelevantAsRead = () => {
    relevantNotifications.forEach((notification) => {
      if (!notification.read) markAsRead(notification.id)
    })
  }

  const navigateToTasks = useCallback(() => {
    window.location.hash = "#track"
    window.dispatchEvent(new CustomEvent("app_navigate", { detail: { page: "track" } }))
  }, [])

  const openTask = useCallback((requestId?: string) => {
    if (!requestId) return
    sessionStorage.setItem("ux_pending_open_task", requestId)
    window.location.hash = `#track?requestId=${encodeURIComponent(requestId)}`
    window.dispatchEvent(new CustomEvent("app_navigate", { detail: { page: "track", requestId } }))
  }, [])

  const openSchedule = (task: UXRequest, fallbackDate?: string) => {
    setScheduleTask(task)
    setScheduleDate(getTaskPlannedDate(task) || fallbackDate || selectedDate || todayYMD)
  }

  const saveSchedule = async () => {
    if (!scheduleTask || !scheduleDate) return
    const localResult = updateTaskPlannedDate(scheduleTask.request_id, scheduleDate)
    if (!localResult.success) {
      toast.error(localResult.error || "Không thể xếp ngày dự kiến")
      return
    }
    const result = await updateTaskProgressInSheet(scheduleTask.request_id, {
      new_phase: scheduleTask.current_phase,
      new_status: scheduleTask.status,
      new_progress: scheduleTask.progress,
      planned_work_date: scheduleDate,
      note: `Xếp ngày dự kiến làm vào [${scheduleDate}] trên Designer Planner`,
    })
    if (result.success) {
      toast.success("Đã xếp ngày dự kiến", `${getRequestDisplayTitle(scheduleTask)} · ${formatShortDate(scheduleDate)}`)
    } else {
      toast.warning("Đã lưu trên thiết bị", result.message || "Chưa thể đồng bộ ngày dự kiến lên Cloud")
    }
    setScheduleTask(null)
    setSelectedDate(scheduleDate)
    reloadData()
  }

  const openAddEvent = (date = selectedDate) => {
    setEventDate(date)
    setEventModalOpen(true)
  }

  const savePersonalEvent = async (values: ScheduleMeetingValues, images: File[]) => {
    if (!values.title || !values.date || !values.time) return
    setEventSaving(true)
    try {
      const uploadResults = await Promise.all(images.map((file) => uploadFileToDrive(file, "UX_Planner_Event_Attachments")))
      const attachments = uploadResults.flatMap((result, index) => {
        const url = result.downloadUrl || result.fileUrl
        if (!result.success || !url) return []
        return [{
          name: result.fileName || images[index].name,
          url,
          size: result.fileSize || images[index].size,
          type: images[index].type,
        }]
      })
      const failedUploads = uploadResults.length - attachments.length
      addTeamEvent({
        title: values.title,
        categoryId: values.categoryId,
        startDate: `${values.date}T${values.time}`,
        endDate: addMinutesToLocalDateTime(values.date, values.time, values.durationMinutes),
        allDay: false,
        attendees: values.attendees,
        location: values.location,
        description: values.description,
        durationMinutes: values.durationMinutes,
        recurrence: values.recurrence,
        recurrenceEndDate: values.recurrenceEndDate,
        attachments,
      }, session)
      toast.success("Đã lên lịch cuộc họp", `${values.time} · ${formatShortDate(values.date)}`)
      if (failedUploads > 0) toast.warning(`${failedUploads} ảnh chưa tải lên được`, "Event vẫn được tạo với các ảnh đã tải thành công.")
      setEventModalOpen(false)
      setSelectedDate(values.date)
      reloadData()
    } catch (error) {
      console.error("[DesignerPlanner] Unable to create meeting:", error)
      toast.error("Không thể tạo cuộc họp", error instanceof Error ? error.message : "Vui lòng thử lại sau.")
    } finally {
      setEventSaving(false)
    }
  }

  const movePeriod = (direction: -1 | 1) => {
    const next = new Date(anchorDate)
    if (view === "month") next.setMonth(next.getMonth() + direction)
    else next.setDate(next.getDate() + direction * 7)
    setAnchorDate(next)
  }

  const handleBriefingClick = (item: PlannerBriefingItem) => {
    if (item.requestId) openTask(item.requestId)
    else if (item.date) setSelectedDate(item.date)
  }

  const monthTitle = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(anchorDate)
  const selectedDateLabel = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" }).format(parseYMD(selectedDate))
  const totalPhase = Math.max(1, phaseDistribution.reduce((sum, item) => sum + item.count, 0))

  return (
    <div className="h-full overflow-y-auto bg-[#F7F8FA]">
      <div className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{formatDateLong(today)}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {getGreeting(today.getHours())}, {designerName.split(" ").pop()}
            </h1>
            <p className="mt-1.5 min-h-5 max-w-2xl text-sm text-slate-500" aria-label={`“${quote}”`}>
              <span aria-hidden="true">“{displayedQuote}</span>
              <span
                aria-hidden="true"
                className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-slate-400"
              />
              <span aria-hidden="true">”</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm" dot dotColor="bg-emerald-500">Dữ liệu đã đồng bộ</Badge>
            <Button variant="outline" size="sm" onClick={reloadData} loading={loading}>
              <RefreshCw className="h-3.5 w-3.5" /> Làm mới
            </Button>
          </div>
        </motion.header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(520px,0.88fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
            <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                  <img src="/ai-default.png" alt="AI" className="h-7 w-7 object-contain" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-950">AI điểm nhanh hôm nay</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Rule-based briefing · cập nhật {briefingUpdatedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setBriefingUpdatedAt(new Date())
                    setBriefingPulse((value) => value + 1)
                  }}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Tóm tắt lại"
                  title="Tóm tắt lại"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setBriefingCollapsed((value) => !value)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label={briefingCollapsed ? "Mở rộng" : "Thu gọn"}
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform", briefingCollapsed && "-rotate-90")} />
                </button>
              </div>
            </div>
            <AnimatePresence initial={false}>
              {!briefingCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-slate-100"
                >
                  <div className="divide-y divide-slate-100">
                    {briefing.map((item, index) => {
                      const relatedTask = item.requestId ? myTasks.find((task) => task.request_id === item.requestId) : undefined
                      return (
                        <HoverPreview
                          key={item.id}
                          preview={(
                            <div>
                              <div className="flex items-center gap-2.5">
                                <img src="/ai-default.png" alt="" className="h-8 w-8 rounded-lg object-contain" />
                                <div className="min-w-0"><p className="truncate text-xs font-bold text-slate-950">{item.title}</p><p className="mt-0.5 text-[10px] text-slate-400">AI điểm nhanh · {item.tone}</p></div>
                              </div>
                              <p className="mt-3 text-xs leading-5 text-slate-600">{item.description}</p>
                              {relatedTask && (
                                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
                                  <span className="rounded-md bg-slate-100 px-2 py-1">{relatedTask.product}</span>
                                  <span className="rounded-md bg-slate-100 px-2 py-1">{relatedTask.squad_name || relatedTask.preferred_squad}</span>
                                  <span className="rounded-md bg-slate-100 px-2 py-1">Hạn {formatShortDate(getTaskDeadline(relatedTask))}</span>
                                </div>
                              )}
                            </div>
                          )}
                        >
                          <button
                            onClick={() => handleBriefingClick(item)}
                            className="group flex min-h-[86px] w-full items-start gap-3 bg-white px-5 py-4 text-left transition-colors hover:bg-slate-50/80 sm:px-6"
                          >
                            <span className={cn(
                              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                              item.tone === "danger" && "bg-rose-500",
                              item.tone === "warning" && "bg-amber-500",
                              item.tone === "info" && "bg-blue-500",
                              item.tone === "success" && "bg-emerald-500",
                            )} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                              <span className="mt-1 block min-h-5 text-xs leading-5 text-slate-500">
                                <BriefingTypewriter text={item.description} runKey={briefingPulse} delay={index * 120} />
                              </span>
                            </span>
                            <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" />
                          </button>
                        </HoverPreview>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Số liệu cá nhân</h2>
                <p className="mt-0.5 text-xs text-slate-500">Khối lượng công việc đang gắn với bạn</p>
              </div>
              <button onClick={navigateToTasks} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Mở My task</button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "Đang phụ trách", value: activeTasks.length, icon: BriefcaseBusiness, color: "text-slate-800 bg-slate-100" },
                { label: "Task overload", value: overloadedTasks.length, icon: AlertTriangle, color: "text-amber-700 bg-amber-50" },
                { label: "Go-live tuần này", value: goLiveTasks.length, icon: Rocket, color: "text-emerald-700 bg-emerald-50" },
              ].map((card) => (
                <button key={card.label} onClick={navigateToTasks} className="rounded-xl border border-slate-200/80 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm">
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", card.color)}><card.icon className="h-3.5 w-3.5" /></span>
                  <span className="mt-2 block text-xl font-bold text-slate-950">{card.value}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{card.label}</span>
                </button>
              ))}
            </div>
            <button onClick={navigateToTasks} className="mt-5 block w-full text-left">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Phân bố theo khâu UX</span>
                <span className="text-slate-400">{activeTasks.length} task</span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                {phaseDistribution.map((item) => item.count > 0 && (
                  <span key={item.key} style={{ width: `${(item.count / totalPhase) * 100}%`, backgroundColor: item.color }} />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                {phaseDistribution.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex min-w-0 items-center gap-1.5 text-slate-500"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate">{item.label}</span></span>
                    <strong className="text-slate-800">{item.count}</strong>
                  </div>
                ))}
              </div>
            </button>
          </section>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex flex-col gap-4 border-b border-slate-200/80 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-2">
                <h2 className="text-base font-bold text-slate-950">Lịch làm việc</h2>
                <p className="text-xs capitalize text-slate-500">{monthTitle}</p>
              </div>
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button onClick={() => movePeriod(-1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-900"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => { setAnchorDate(today); setSelectedDate(todayYMD) }} className="px-2.5 text-xs font-semibold text-slate-700">Hôm nay</button>
                <button onClick={() => movePeriod(1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-900"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="flex items-center rounded-xl bg-slate-100 p-1">
                <button onClick={() => setView("month")} className={cn("flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold", view === "month" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500")}><LayoutGrid className="h-3.5 w-3.5" />Tháng</button>
                <button onClick={() => setView("week")} className={cn("flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold", view === "week" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500")}><ListChecks className="h-3.5 w-3.5" />Tuần</button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {(Object.keys(ENTRY_META) as PlannerEntryType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setVisibleTypes((current) => ({ ...current, [type]: !current[type] }))}
                    className={cn("flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[10px] font-semibold transition-opacity", ENTRY_META[type].color, !visibleTypes[type] && "opacity-35")}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", ENTRY_META[type].dot)} />{ENTRY_META[type].label}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={() => openAddEvent()}><Plus className="h-3.5 w-3.5" />Thêm lịch</Button>
            </div>
          </div>

          <div className="grid min-h-[620px] xl:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
            <div className="min-w-0 overflow-x-auto border-b border-slate-200 xl:border-b-0 xl:border-r">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">
                  {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"].map((day) => (
                    <div key={day} className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">{day}</div>
                  ))}
                </div>
                <div className={cn("grid grid-cols-7", view === "month" ? "auto-rows-[118px]" : "auto-rows-[520px]") }>
                  {visibleDays.map((day) => {
                    const dayEntries = entriesByDate.get(day.dateYMD) || []
                    const holiday = holidayByDate.get(day.dateYMD)
                    const isCompensatoryWorkday = holiday?.type === "compensatory_workday"
                    const dayKey = (["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const)[day.dayOfWeekIndex]
                    const isRegularDayOff = !workSchedule.workweek.includes(dayKey)
                    const isPublicDayOff = Boolean(holiday && !isCompensatoryWorkday)
                    const isNonWorkingDay = isPublicDayOff || (isRegularDayOff && !isCompensatoryWorkday)
                    const maxVisible = view === "month" ? 3 : 12
                    const shown = dayEntries.slice(0, maxVisible)
                    const isSelected = selectedDate === day.dateYMD
                    return (
                      <button
                        key={day.dateYMD}
                        onClick={() => setSelectedDate(day.dateYMD)}
                        onDoubleClick={() => openAddEvent(day.dateYMD)}
                        className={cn(
                          "group relative min-w-0 border-b border-r border-slate-100 p-2 text-left align-top transition-colors hover:bg-blue-50/35",
                          !day.isCurrentMonth && view === "month" && "bg-slate-50/50 text-slate-300",
                          isNonWorkingDay && "bg-slate-100/75 hover:bg-slate-100",
                          isCompensatoryWorkday && "bg-emerald-50/35",
                          isSelected && "bg-blue-50/60 ring-1 ring-inset ring-blue-300",
                        )}
                      >
                        {holiday && (
                          <div className="pointer-events-none absolute inset-0 flex select-none flex-col items-center justify-center overflow-hidden px-3 text-center" aria-hidden="true">
                            <span className={cn(
                              "text-sm font-black uppercase tracking-[0.12em] sm:text-base",
                              isCompensatoryWorkday ? "text-emerald-200/70" : "text-slate-300/70",
                            )}>{isCompensatoryWorkday ? "Làm bù" : "Nghỉ lễ"}</span>
                            <span className={cn(
                              "mt-1 line-clamp-2 text-[9px] font-semibold leading-3",
                              isCompensatoryWorkday ? "text-emerald-300/80" : "text-slate-300/90",
                            )}>{holiday.name}</span>
                          </div>
                        )}
                        <div className="relative z-10 mb-1.5 flex items-center justify-between">
                          <span className={cn(
                            "flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-xs font-semibold",
                            day.isToday ? "bg-slate-950 text-white" : isSelected ? "bg-blue-600 text-white" : "text-slate-600",
                          )}>{day.dayNumber}</span>
                          <Plus className="h-3.5 w-3.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        <div className="relative z-10 space-y-1">
                          {shown.map((entry) => (
                            <div
                              key={entry.id}
                              className={cn("flex min-w-0 items-center gap-1.5 rounded-md border px-1.5 py-1 text-[10px] font-medium", ENTRY_META[entry.type].color)}
                              style={entry.accentColor ? { borderColor: colorWithAlpha(entry.accentColor, "40"), backgroundColor: colorWithAlpha(entry.accentColor, "12"), color: entry.accentColor } : undefined}
                              title={`${entry.label}: ${entry.title}`}
                            >
                              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", !entry.accentColor && entry.color)} style={entry.accentColor ? { backgroundColor: entry.accentColor } : undefined} />
                              <span className="truncate">{entry.time && `${entry.time} · `}{entry.title}</span>
                              {entry.attachments && entry.attachments.length > 0 && <Paperclip className="ml-auto h-2.5 w-2.5 shrink-0 opacity-70" />}
                            </div>
                          ))}
                          {dayEntries.length > maxVisible && (
                            <div className="px-1 text-[10px] font-semibold text-slate-500">+{dayEntries.length - maxVisible} mục khác</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <aside className="min-w-0 bg-slate-50/40">
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ngày đang chọn</p>
                    <h3 className="mt-1 text-sm font-bold capitalize text-slate-950">{selectedDateLabel}</h3>
                  </div>
                  <Button variant="outline" size="xs" onClick={() => openAddEvent(selectedDate)}><Plus className="h-3 w-3" />Thêm việc</Button>
                </div>
                <div className="mt-4 space-y-2">
                  {selectedEntries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-7 text-center">
                      <CalendarDays className="mx-auto h-5 w-5 text-slate-300" />
                      <p className="mt-2 text-xs font-medium text-slate-500">Chưa có lịch trong ngày này</p>
                    </div>
                  ) : selectedEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-slate-300 hover:shadow-xs"
                    >
                      <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", !entry.accentColor && entry.color)} style={entry.accentColor ? { backgroundColor: entry.accentColor } : undefined} />
                      <button onClick={() => entry.request ? openTask(entry.request.request_id) : setDetailEntry(entry)} className="min-w-0 flex-1 text-left">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{entry.label}{entry.time ? ` · ${entry.time}` : ""}</span>
                        <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-800">{entry.title}</span>
                        {entry.location && <span className="mt-1 flex items-center gap-1 text-[10px] text-slate-500"><MapPin className="h-3 w-3" />{entry.location}</span>}
                      </button>
                      {entry.request && entry.type === "planned" && (
                        <button onClick={() => openSchedule(entry.request!, selectedDate)} className="text-[10px] font-semibold text-blue-600">Đổi ngày</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-b border-slate-200 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xs font-bold text-slate-900"><Flag className="h-3.5 w-3.5 text-rose-500" />Ưu tiên cao trong tuần</h3>
                  <span className="text-[10px] text-slate-400">{formatShortDate(weekStart)}–{formatShortDate(weekEnd)}</span>
                </div>
                <div className="space-y-2">
                  {priorityThisWeek.length === 0 ? (
                    <p className="rounded-xl bg-white p-3 text-xs text-slate-500">Không có task Lv1/Lv2 trong tuần.</p>
                  ) : priorityThisWeek.slice(0, 4).map((task) => (
                    <button key={task.request_id} onClick={() => openTask(task.request_id)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-slate-300">
                      <div className="flex items-center justify-between gap-2"><PriorityBadge priority={task.priority} size="xs" /><span className="text-[10px] text-slate-400">{formatShortDate(getTaskDateForWeek(task))}</span></div>
                      <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-800">{getRequestDisplayTitle(task)}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xs font-bold text-slate-900"><Clock3 className="h-3.5 w-3.5 text-amber-500" />Chưa xếp ngày</h3>
                  <Badge variant="warning" size="xs">{unscheduledTasks.length}</Badge>
                </div>
                <div className="space-y-2">
                  {unscheduledTasks.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700"><Check className="h-3.5 w-3.5" />Tất cả công việc đã có kế hoạch.</div>
                  ) : unscheduledTasks.slice(0, 5).map((task) => (
                    <div key={task.request_id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <button onClick={() => openTask(task.request_id)} className="line-clamp-2 w-full text-left text-xs font-semibold leading-5 text-slate-800">{getRequestDisplayTitle(task)}</button>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <StatusPill status={task.status} size="xs" />
                        <button onClick={() => openSchedule(task)} className="text-[10px] font-bold text-blue-600 hover:text-blue-700">+ Xếp ngày</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-950"><Bell className="h-4 w-4 text-blue-600" />Cập nhật liên quan đến bạn</h2>
              <p className="mt-0.5 text-xs text-slate-500">Feedback, công việc mới, thay đổi lịch và kết quả phê duyệt</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button onClick={() => setNotificationFilter("unread")} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", notificationFilter === "unread" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500")}>Chưa đọc</button>
                <button onClick={() => setNotificationFilter("all")} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", notificationFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500")}>Tất cả</button>
              </div>
              <Button variant="ghost" size="xs" onClick={markRelevantAsRead}>Đánh dấu đã đọc</Button>
            </div>
          </div>
          <motion.div variants={cascadeWaveContainerVariants} initial="hidden" animate="visible" className="divide-y divide-slate-100">
            {shownNotifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Check className="mx-auto h-5 w-5 text-emerald-500" />
                <p className="mt-2 text-sm font-semibold text-slate-700">Bạn đã xem hết cập nhật</p>
                <p className="mt-1 text-xs text-slate-400">Thông báo mới liên quan đến task của bạn sẽ xuất hiện tại đây.</p>
              </div>
            ) : shownNotifications.slice(0, 10).map((notification) => (
              <motion.button
                variants={cascadeWaveItemVariants}
                key={notification.id}
                onClick={() => {
                  markAsRead(notification.id)
                  if (notification.requestId) openTask(notification.requestId)
                }}
                className={cn("flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50", !notification.read && "bg-blue-50/30")}
              >
                <span className={cn("mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", !notification.read ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500")}><Bell className="h-3.5 w-3.5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><span className="truncate text-xs font-bold text-slate-900">{notification.title}</span>{!notification.read && <Circle className="h-2 w-2 fill-blue-600 text-blue-600" />}</span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">{notification.message}</span>
                </span>
                <span className="shrink-0 text-[10px] text-slate-400">{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(notification.timestamp))}</span>
              </motion.button>
            ))}
          </motion.div>
        </section>
      </div>

      <RightSheet
        open={Boolean(scheduleTask)}
        onClose={() => setScheduleTask(null)}
        size="sm"
        title="Xếp ngày dự kiến làm"
        description="Deadline cam kết không thay đổi."
        icon={<CalendarDays className="h-4 w-4" />}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setScheduleTask(null)}>Hủy</Button>
            <Button onClick={saveSchedule} disabled={!scheduleDate}>Hoàn tất</Button>
          </div>
        )}
      >
        <div className="space-y-4 p-5 sm:p-6">
          <div className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">{scheduleTask && getRequestDisplayTitle(scheduleTask)}</div>
          <label className="block text-xs font-semibold text-slate-700">Ngày dự kiến làm
            <input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          {scheduleTask && <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><span>Deadline cam kết</span><strong>{formatShortDate(getTaskDeadline(scheduleTask))}</strong></div>}
        </div>
      </RightSheet>

      <ScheduleMeetingDialog
        open={eventModalOpen}
        initialDate={eventDate}
        defaultAttendee={defaultMeetingAttendee}
        categories={eventCategories}
        designers={availableMeetingDesigners}
        saving={eventSaving}
        onClose={() => !eventSaving && setEventModalOpen(false)}
        onSubmit={savePersonalEvent}
      />

      <RightSheet
        open={Boolean(detailEntry)}
        onClose={() => setDetailEntry(null)}
        size="md"
        title="Chi tiết lịch & mốc cần nhớ"
        description={detailEntry?.label}
        icon={<CalendarDays className="h-4 w-4" />}
        footer={<div className="flex justify-end"><Button onClick={() => setDetailEntry(null)}>Đóng</Button></div>}
      >
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", !detailEntry?.accentColor && detailEntry?.color)} style={detailEntry?.accentColor ? { backgroundColor: detailEntry.accentColor } : undefined} />
            <div><h4 className="text-sm font-bold text-slate-900">{detailEntry?.title}</h4><p className="mt-1 text-xs text-slate-500">{detailEntry?.date ? formatDateLong(parseYMD(detailEntry.date)) : ""}</p></div>
          </div>
          <div className="grid gap-2 text-xs text-slate-600">
            {detailEntry?.time && <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-3"><Clock3 className="h-4 w-4 text-slate-400" /><span>Thời gian</span><strong className="ml-auto text-slate-900">{detailEntry.time}{detailEntry.endTime ? ` – ${detailEntry.endTime}` : ""}</strong></div>}
            {detailEntry?.location && <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-3"><MapPin className="h-4 w-4 text-slate-400" /><span>Địa điểm</span><strong className="ml-auto text-right text-slate-900">{detailEntry.location}</strong></div>}
            {detailEntry?.attendees && detailEntry.attendees.length > 0 && <div className="flex items-start gap-2 rounded-xl border border-slate-200 p-3"><Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>Người tham gia</span><strong className="ml-auto max-w-[65%] text-right text-slate-900">{detailEntry.attendees.join(", ")}</strong></div>}
            {detailEntry?.recurrence && detailEntry.recurrence !== "none" && <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-3"><Repeat2 className="h-4 w-4 text-slate-400" /><span>Lặp lại</span><strong className="ml-auto text-right text-slate-900">{detailEntry.recurrence === "daily" ? "Hàng ngày" : detailEntry.recurrence === "weekly" ? "Hàng tuần" : "Hàng tháng"}{detailEntry.recurrenceEndDate ? ` · đến ${formatShortDate(detailEntry.recurrenceEndDate)}` : ""}</strong></div>}
            {detailEntry?.description && <div className="rounded-xl border border-slate-200 p-3"><p className="font-semibold text-slate-900">Nội dung chuẩn bị</p><p className="mt-1.5 whitespace-pre-wrap leading-5 text-slate-500">{detailEntry.description}</p></div>}
            {detailEntry?.attachments && detailEntry.attachments.length > 0 && (
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="flex items-center gap-2 font-semibold text-slate-900"><Paperclip className="h-3.5 w-3.5 text-slate-400" />Ảnh đính kèm ({detailEntry.attachments.length})</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {detailEntry.attachments.map((attachment) => (
                    <a key={`${attachment.name}-${attachment.url}`} href={attachment.url} target="_blank" rel="noreferrer" className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100" title={attachment.name}>
                      <img src={attachment.url} alt={attachment.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </RightSheet>
    </div>
  )
}
