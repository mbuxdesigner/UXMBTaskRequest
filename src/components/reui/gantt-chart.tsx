import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UXRequest } from "../../data/mockData"
import { UserAvatar } from "@/components/common/UserAvatar"
import { getStatusConfig, getRequestPendingClassification } from "@/config/statusConfig"
import { getSquadColorDef } from "@/lib/colorUtils"
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ListTree, 
  MoreHorizontal, 
  Search, 
  Filter, 
  Check, 
  Plus, 
  Minus, 
  Users, 
  Flag,
  Folder
} from "lucide-react"

interface ReUIGanttChartProps {
  requests: UXRequest[]
  onSelectRequest?: (req: UXRequest) => void
  borderless?: boolean
  className?: string
}

export type ViewScale = "Day" | "Week" | "Month" | "Quarter" | "Year"

interface HoveredBlockInfo {
  request: UXRequest
  clientX: number
  clientY: number
}

interface OffscreenChip {
  id: string
  title: string
  dateLabel: string
  side: "start" | "end"
  top: number
  color: string
  targetScrollLeft: number
}

// Date helpers
function parseDate(dateStr?: string): Date {
  if (!dateStr) {
    const d = new Date()
    d.setDate(d.getDate() + 5)
    return d
  }
  const parts = dateStr.trim().split(/[\/\-]/)
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    }
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
  }
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? new Date() : d
}

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTH_NAMES_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatDueDate(dateStr?: string): string {
  if (!dateStr) return ""
  const d = parseDate(dateStr)
  if (isNaN(d.getTime())) return ""
  return `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getDate()}`
}

export interface TaskStageStatusInfo {
  isPending: boolean
  text: string
  title: string
  dot: string
  badgeClass: string
  theme: {
    bg: string
    fill: string
    dot: string
    colorHex: string
  }
}

export function getTaskStageStatusInfo(req: UXRequest, index: number = 0): TaskStageStatusInfo {
  // 1. Phân loại Pending chính xác từ hệ thống
  const pendingClassification = getRequestPendingClassification(req)
  const isPending = Boolean(pendingClassification.isPending)

  if (isPending) {
    const pLabel = pendingClassification.label || "Pending"
    const pReason = pendingClassification.type === "po_pending"
      ? "PO Pending: Quá hạn 24h PO chưa phản hồi duyệt"
      : (pendingClassification.reason ? `Pending: ${pendingClassification.reason}` : "Pending")
    const pDot = pendingClassification.badgeClasses?.dot || "bg-amber-500"
    const pBadge = `${pendingClassification.badgeClasses?.bg || "bg-amber-50"} ${pendingClassification.badgeClasses?.text || "text-amber-800"} border ${pendingClassification.badgeClasses?.border || "border-amber-300"}`

    return {
      isPending: true,
      text: pLabel,
      title: pReason,
      dot: pDot,
      badgeClass: pBadge,
      theme: {
        bg: "bg-amber-500/20 text-amber-800",
        fill: "bg-amber-500/45",
        dot: "bg-amber-500",
        colorHex: "#f59e0b",
      },
    }
  }

  // 2. Trạng thái bình thường đi theo nội dung khâu UX của task
  const rawPhase = (req.current_phase || req.status || "Chờ xác nhận").trim()
  const cleaned = rawPhase.replace(/^(khâu|step|bước)?\s*\d+[\.\:\-\s]+/i, "").trim()
  const displayPhase = (
    cleaned === "Đang phân loại" ||
    cleaned === "Tiếp nhận" ||
    cleaned === "Đã gửi yêu cầu" ||
    cleaned === "Đã gửi" ||
    cleaned === "Mới tạo"
  )
    ? "Chờ xác nhận"
    : (cleaned || "Chờ xác nhận")

  const cfg = getStatusConfig(displayPhase)

  // Bảng màu 7 khâu chính thức MB Bank đồng bộ SLA:
  // 1. Chờ xác nhận (Hổ phách)
  // 2. Define đầu bài (Tím)
  // 3. Wireframe (Chàm / Navy)
  // 4. UI Design (Xanh dương)
  // 5. Ready to dev (Xanh mòng két / Cyan)
  // 6. Nghiệm thu UI (Hồng cánh sen)
  // 7. Hoàn thành (Xanh ngọc lục bảo)
  const lower = displayPhase.toLowerCase()
  let theme = {
    bg: "bg-[#38bdf8]/25 text-[#0369a1]",
    fill: "bg-[#38bdf8]/50",
    dot: "bg-[#0284c7]",
    colorHex: "#0284c7"
  }

  if (lower.includes("hoàn thành") || lower.includes("done")) {
    theme = { bg: "bg-[#10b981]/25 text-[#047857]", fill: "bg-[#10b981]/50", dot: "bg-[#10b981]", colorHex: "#10b981" }
  } else if (lower.includes("xác nhận") || lower.includes("tiếp nhận")) {
    theme = { bg: "bg-[#f59e0b]/25 text-[#b45309]", fill: "bg-[#f59e0b]/50", dot: "bg-[#f59e0b]", colorHex: "#f59e0b" }
  } else if (lower.includes("define") || lower.includes("đầu bài")) {
    theme = { bg: "bg-[#9333ea]/25 text-[#7e22ce]", fill: "bg-[#9333ea]/50", dot: "bg-[#9333ea]", colorHex: "#9333ea" }
  } else if (lower.includes("wireframe") || lower.includes("flow")) {
    theme = { bg: "bg-[#4f46e5]/25 text-[#4338ca]", fill: "bg-[#4f46e5]/50", dot: "bg-[#4f46e5]", colorHex: "#4f46e5" }
  } else if (lower.includes("ui") || lower.includes("design")) {
    theme = { bg: "bg-[#2563eb]/25 text-[#1d4ed8]", fill: "bg-[#2563eb]/50", dot: "bg-[#2563eb]", colorHex: "#2563eb" }
  } else if (lower.includes("ready") || lower.includes("dev")) {
    theme = { bg: "bg-[#0891b2]/25 text-[#0e7490]", fill: "bg-[#0891b2]/50", dot: "bg-[#0891b2]", colorHex: "#0891b2" }
  } else if (lower.includes("nghiệm thu") || lower.includes("review")) {
    theme = { bg: "bg-[#db2777]/25 text-[#be185d]", fill: "bg-[#db2777]/50", dot: "bg-[#db2777]", colorHex: "#db2777" }
  }

  return {
    isPending: false,
    text: displayPhase,
    title: displayPhase,
    dot: cfg.inlineClasses?.dot || cfg.dotColor || "bg-blue-600",
    badgeClass: `${cfg.inlineClasses?.bg || "bg-slate-50"} ${cfg.inlineClasses?.text || "text-slate-700"} border ${cfg.inlineClasses?.border || "border-slate-200"}`,
    theme,
  }
}

function getPriorityConfig(priority?: string) {
  const p = (priority || "").toLowerCase().trim()
  if (p.includes("khẩn cấp") || p.includes("urgent") || p.includes("p0")) {
    return { label: "Urgent", flag: "text-rose-500" }
  }
  if (p.includes("cao") || p.includes("high") || p.includes("p1")) {
    return { label: "High", flag: "text-amber-500" }
  }
  if (p.includes("thấp") || p.includes("low") || p.includes("p3")) {
    return { label: "Low", flag: "text-slate-400" }
  }
  return { label: "Medium", flag: "text-blue-500" }
}

export default function ReUIGanttChart({ 
  requests, 
  onSelectRequest, 
  borderless = false, 
  className: customClassName = "" 
}: ReUIGanttChartProps) {
  const [viewScale, setViewScale] = useState<ViewScale>("Month")
  const [showScaleDropdown, setShowScaleDropdown] = useState(false)
  const [showSquadFilterPopover, setShowSquadFilterPopover] = useState(false)
  const [showUserFilterPopover, setShowUserFilterPopover] = useState(false)
  const [showColumnsPopover, setShowColumnsPopover] = useState(false)
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState("")

  const [selectedSquads, setSelectedSquads] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  // Columns visibility toggle (Priority hidden by default as requested!)
  const [visibleColumns, setVisibleColumns] = useState({
    status: true,
    assignee: true,
    due: true,
    priority: false, // DEFAULT HIDDEN
  })

  // Tree pane width & resizing (tempo-tasks splitter)
  const [treeWidth, setTreeWidth] = useState(500)
  const isResizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(500)

  // Timeline zoom
  const [zoomLevel, setZoomLevel] = useState(1.0)

  // Infinite Scroll buffer (Number of months before & after currentDate)
  const [bufferMonthsBefore, setBufferMonthsBefore] = useState(3)
  const [bufferMonthsAfter, setBufferMonthsAfter] = useState(12)

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  // Real-time viewport center date for toolbar header synchronization
  const [viewportDate, setViewportDate] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const viewportDateRef = useRef<Date>(viewportDate)
  viewportDateRef.current = viewportDate
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  // Tooltip State
  const [hoveredTooltip, setHoveredTooltip] = useState<HoveredBlockInfo | null>(null)

  // Scroll Container Refs
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const isInitialScrollDoneRef = useRef(false)

  // Offscreen chips state
  const [offscreenChips, setOffscreenChips] = useState<OffscreenChip[]>([])

  // Today Date
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // Squad list from requests
  const allSquadOptions = useMemo(() => {
    const set = new Set<string>()
    requests.forEach((r) => {
      const sq = (r.preferred_squad || r.product || "").trim()
      if (sq) set.add(sq)
    })
    return Array.from(set)
  }, [requests])

  // Assignee user list from requests
  const allUserOptions = useMemo(() => {
    const userMap = new Map<string, { name: string; count: number }>()
    requests.forEach((r) => {
      const u = (r.assigned_designer || "").trim()
      if (u && u !== "Chưa phân công") {
        const existing = userMap.get(u)
        if (existing) {
          existing.count++
        } else {
          userMap.set(u, { name: u, count: 1 })
        }
      }
    })
    return Array.from(userMap.values()).sort((a, b) => b.count - a.count)
  }, [requests])

  // Filtered users in popover
  const filteredUserOptions = useMemo(() => {
    if (!userSearchQuery.trim()) return allUserOptions
    const q = userSearchQuery.toLowerCase().trim()
    return allUserOptions.filter(u => u.name.toLowerCase().includes(q))
  }, [allUserOptions, userSearchQuery])

  // Navigation handlers (smoothly scrolls the timeline pane & updates viewport date)
  const handlePrev = () => {
    const container = timelineScrollRef.current
    if (!container) return
    const stepPx = Math.max(200, Math.round(container.clientWidth * 0.6))
    container.scrollBy({ left: -stepPx, behavior: "smooth" })
  }

  const handleNext = () => {
    const container = timelineScrollRef.current
    if (!container) return
    const stepPx = Math.max(200, Math.round(container.clientWidth * 0.6))
    container.scrollBy({ left: stepPx, behavior: "smooth" })
  }


  // Zoom handlers (step 0.25 matching ReUI Tempo Tasks)
  const isZoomingRef = useRef(false)
  const preZoomCenterMsRef = useRef<number | null>(null)

  const handleZoomIn = () => {
    if (zoomLevel >= 2.0) return
    preZoomCenterMsRef.current = viewportDateRef.current.getTime()
    isZoomingRef.current = true
    setZoomLevel(prev => Math.min(2.0, +(prev + 0.25).toFixed(2)))
  }

  const handleZoomOut = () => {
    if (zoomLevel <= 0.5) return
    preZoomCenterMsRef.current = viewportDateRef.current.getTime()
    isZoomingRef.current = true
    setZoomLevel(prev => Math.max(0.5, +(prev - 0.25).toFixed(2)))
  }

  // Filter handlers
  const handleToggleSquadFilter = (sq: string) => {
    setSelectedSquads(prev => prev.includes(sq) ? prev.filter(x => x !== sq) : [...prev, sq])
  }

  const handleToggleUserFilter = (userName: string) => {
    setSelectedUsers(prev => prev.includes(userName) ? prev.filter(x => x !== userName) : [...prev, userName])
  }

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))
  }

  // Splitter mouse drag logic
  const handleSplitterPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    isResizingRef.current = true
    startXRef.current = e.clientX
    startWidthRef.current = treeWidth
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    const onPointerMove = (moveEv: PointerEvent) => {
      if (!isResizingRef.current) return
      const delta = moveEv.clientX - startXRef.current
      const newW = Math.min(760, Math.max(340, startWidthRef.current + delta))
      setTreeWidth(newW)
    }

    const onPointerUp = () => {
      isResizingRef.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
  }

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (selectedSquads.length > 0) {
        const sq = r.preferred_squad || r.product || ""
        if (!selectedSquads.includes(sq)) return false
      }
      if (selectedUsers.length > 0) {
        const u = (r.assigned_designer || "").trim()
        if (!selectedUsers.includes(u)) return false
      }
      return true
    })
  }, [requests, selectedSquads, selectedUsers])

  // 2-level Grouping: Product -> Squad -> Tasks
  const productGroups = useMemo(() => {
    const prodMap = new Map<string, Map<string, UXRequest[]>>()

    filteredRequests.forEach((req) => {
      const prod = (req.product || req.preferred_squad || "Khác").trim() || "Khác"
      const squad = (req.preferred_squad || req.squad_name || req.squad || "Squad Chung").trim() || "Squad Chung"

      if (!prodMap.has(prod)) {
        prodMap.set(prod, new Map())
      }
      const squadMap = prodMap.get(prod)!
      if (!squadMap.has(squad)) {
        squadMap.set(squad, [])
      }
      squadMap.get(squad)!.push(req)
    })

    const result: Array<{
      productName: string
      productKey: string
      squads: Array<{
        squadName: string
        squadKey: string
        tasks: UXRequest[]
      }>
      allTasks: UXRequest[]
    }> = []

    prodMap.forEach((squadMap, prodName) => {
      const allTasks: UXRequest[] = []
      const squads: Array<{ squadName: string; squadKey: string; tasks: UXRequest[] }> = []

      squadMap.forEach((tasks, squadName) => {
        allTasks.push(...tasks)
        squads.push({
          squadName,
          squadKey: `squad:${prodName}:${squadName}`,
          tasks,
        })
      })

      result.push({
        productName: prodName,
        productKey: `prod:${prodName}`,
        squads,
        allTasks,
      })
    })

    return result
  }, [filteredRequests])

  // Column Width based on zoomLevel
  const columnWidth = useMemo(() => {
    let base = 54
    if (viewScale === "Day") base = 38
    else if (viewScale === "Week") base = 80
    else if (viewScale === "Quarter") base = 96
    else if (viewScale === "Year") base = 120
    return Math.round(base * zoomLevel)
  }, [viewScale, zoomLevel])

  // Header Title dynamically synced with the month/period in the viewport center
  const headerTitle = useMemo(() => {
    const year = viewportDate.getFullYear()
    const month = MONTH_NAMES_FULL[viewportDate.getMonth()]
    if (viewScale === "Quarter") {
      const q = Math.floor(viewportDate.getMonth() / 3) + 1
      return `Q${q} ${year}`
    }
    if (viewScale === "Year") {
      return `${year}`
    }
    return `${month} ${year}`
  }, [viewportDate, viewScale])

  // Build Continuous Infinite Calendar Timeline Columns & Week Spans
  const { columns, weekSpans, timelineStart, timelineEnd, todayPositionPercent } = useMemo(() => {
    const baseYear = currentDate.getFullYear()
    const baseMonth = currentDate.getMonth()

    // Start date is bufferMonthsBefore in the past, aligned to Sunday
    const start = new Date(baseYear, baseMonth - bufferMonthsBefore, 1)
    const startDayOfWeek = start.getDay()
    start.setDate(start.getDate() - startDayOfWeek) // Align to Sunday

    // End date is bufferMonthsAfter in the future, aligned to Saturday
    const end = new Date(baseYear, baseMonth + bufferMonthsAfter + 1, 0)
    const endDayOfWeek = end.getDay()
    end.setDate(end.getDate() + (6 - endDayOfWeek)) // Align to Saturday

    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    const cols: Array<{
      id: string
      date: Date
      dayNumber: number
      dayName: string
      label: string
      isWeekend: boolean
      isToday: boolean
      isCurrentMonth: boolean
    }> = []

    const cur = new Date(start)
    while (cur <= end) {
      const isWeekend = cur.getDay() === 0 || cur.getDay() === 6
      const isTd = cur.toDateString() === today.toDateString()
      const dNum = cur.getDate()
      const dName = DAY_NAMES_SHORT[cur.getDay()]
      const isCurMonth = cur.getMonth() === baseMonth

      cols.push({
        id: cur.toISOString().split("T")[0],
        date: new Date(cur),
        dayNumber: dNum,
        dayName: dName,
        label: `${dName} ${dNum}`,
        isWeekend,
        isToday: isTd,
        isCurrentMonth: isCurMonth,
      })

      cur.setDate(cur.getDate() + 1)
    }

    // Tier 1 Week Spans (e.g. W40 Oct 5 - 11)
    const spans: Array<{
      weekKey: string
      label: string
      colSpan: number
    }> = []

    let currentWeekKey = ""
    let currentWeekSpan = 0
    let weekStartCol: (typeof cols)[0] | null = null

    cols.forEach((col, idx) => {
      const d = col.date
      const firstDayOfYear = new Date(d.getFullYear(), 0, 1)
      const pastDays = (d.getTime() - firstDayOfYear.getTime()) / 86400000
      const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7)
      const wKey = `${d.getFullYear()}-W${weekNum}`

      if (wKey !== currentWeekKey) {
        if (currentWeekKey && weekStartCol) {
          const prevCol = cols[idx - 1]
          const mStart = MONTH_NAMES_SHORT[weekStartCol.date.getMonth()]
          const mEnd = weekStartCol.date.getMonth() !== prevCol.date.getMonth() ? ` ${MONTH_NAMES_SHORT[prevCol.date.getMonth()]}` : ""
          spans.push({
            weekKey: currentWeekKey,
            label: `W${currentWeekKey.split("-W")[1]} ${mStart} ${weekStartCol.dayNumber} -${mEnd} ${prevCol.dayNumber}`,
            colSpan: currentWeekSpan,
          })
        }
        currentWeekKey = wKey
        currentWeekSpan = 1
        weekStartCol = col
      } else {
        currentWeekSpan++
      }
    })

    if (currentWeekKey && weekStartCol) {
      const startCol = weekStartCol as (typeof cols)[0]
      const prevCol = cols[cols.length - 1]
      const mStart = MONTH_NAMES_SHORT[startCol.date.getMonth()]
      const mEnd = startCol.date.getMonth() !== prevCol.date.getMonth() ? ` ${MONTH_NAMES_SHORT[prevCol.date.getMonth()]}` : ""
      spans.push({
        weekKey: currentWeekKey,
        label: `W${currentWeekKey.split("-W")[1]} ${mStart} ${startCol.dayNumber} -${mEnd} ${prevCol.dayNumber}`,
        colSpan: currentWeekSpan,
      })
    }

    // Continuous Today Line Position
    const totalMs = end.getTime() - start.getTime()
    const todayMs = today.getTime() + 12 * 3600 * 1000
    let todayPct: number | null = null
    if (todayMs >= start.getTime() && todayMs <= end.getTime()) {
      todayPct = ((todayMs - start.getTime()) / totalMs) * 100
    }

    return {
      columns: cols,
      weekSpans: spans,
      timelineStart: start,
      timelineEnd: end,
      todayPositionPercent: todayPct,
    }
  }, [currentDate, bufferMonthsBefore, bufferMonthsAfter, today])

  // Focus directly on Today (positions Today right near the beginning of the visible timeline)
  const scrollToToday = useCallback((smooth = false) => {
    const container = timelineScrollRef.current
    if (!container || columns.length === 0) return

    const todayIdx = columns.findIndex(col => col.isToday)
    let targetLeft = 0
    if (todayIdx !== -1) {
      // 1 column before Today as buffer so Today is clearly visible right at the start
      targetLeft = Math.max(0, (todayIdx - 1) * columnWidth)
    } else {
      const todayEl = container.querySelector("[data-today='true']") as HTMLElement
      if (todayEl) {
        targetLeft = Math.max(0, todayEl.offsetLeft - columnWidth)
      } else {
        const totalMs = timelineEnd.getTime() - timelineStart.getTime()
        const todayMs = today.getTime()
        if (totalMs > 0 && container.scrollWidth > 0) {
          const ratio = (todayMs - timelineStart.getTime()) / totalMs
          targetLeft = Math.max(0, ratio * container.scrollWidth - columnWidth)
        }
      }
    }

    if (smooth) {
      container.scrollTo({
        left: targetLeft,
        behavior: "smooth"
      })
    } else {
      container.scrollLeft = targetLeft
    }
    setViewportDate(new Date(today))
  }, [columns, columnWidth, timelineStart, timelineEnd, today])

  const handleResetToday = () => {
    scrollToToday(true)
  }

  // Calculate task timeline bar positioning
  const calculateTaskTimelineBar = useCallback((req: UXRequest, index: number = 0) => {
    const totalTimelineMs = timelineEnd.getTime() - timelineStart.getTime()
    const msPerDay = 1000 * 60 * 60 * 24

    const toRatio = (ms: number) => {
      const r = (ms - timelineStart.getTime()) / totalTimelineMs
      return Math.max(0.0005, Math.min(0.9995, r))
    }

    const dueDate = parseDate(req.release_date || req.expected_deadline)
    let endMs = dueDate.getTime()
    let startMs = req.submitted_at ? parseDate(req.submitted_at).getTime() : endMs - 5 * msPerDay

    const isOverdue = dueDate.getTime() < today.getTime() && req.status !== "Hoàn thành" && req.status !== "Done"

    if (endMs <= startMs) {
      endMs = startMs + 3 * msPerDay
    }

    const startRatio = toRatio(startMs)
    const endRatio = toRatio(endMs)
    const widthRatio = Math.max(0.015, endRatio - startRatio)

    const prog = Math.max(0, Math.min(100, req.progress ?? 50))
    const isDone = req.status === "Hoàn thành" || req.status === "Hoành thành" || req.status === "Done" || prog === 100
    const stageInfo = getTaskStageStatusInfo(req, index)

    return {
      startRatio,
      widthRatio,
      startMs,
      endMs,
      progressPercent: isDone ? 100 : prog,
      isDone,
      isOverdue,
      isPending: stageInfo.isPending,
      stageInfo,
      theme: stageInfo.theme,
      startDateFormatted: new Date(startMs).toLocaleDateString("vi-VN"),
      endDateFormatted: new Date(endMs).toLocaleDateString("vi-VN"),
    }
  }, [timelineStart, timelineEnd, today])

  // Calculate group span (thin gray progress line with % at end)
  const calculateGroupTimelineBar = (tasks: UXRequest[]) => {
    if (!tasks || tasks.length === 0) return null
    const totalTimelineMs = timelineEnd.getTime() - timelineStart.getTime()
    const msPerDay = 1000 * 60 * 60 * 24

    const toRatio = (ms: number) => Math.max(0.0005, Math.min(0.9995, (ms - timelineStart.getTime()) / totalTimelineMs))

    let minStartMs = Infinity
    let maxEndMs = -Infinity
    let totalProg = 0

    tasks.forEach((t) => {
      const d = parseDate(t.release_date || t.expected_deadline)
      const endMs = d.getTime()
      const startMs = t.submitted_at ? parseDate(t.submitted_at).getTime() : endMs - 5 * msPerDay
      if (startMs < minStartMs) minStartMs = startMs
      if (endMs > maxEndMs) maxEndMs = endMs
      totalProg += (t.status === "Hoàn thành" || t.status === "Done") ? 100 : (t.progress ?? 40)
    })

    if (minStartMs === Infinity) return null
    if (maxEndMs <= minStartMs) maxEndMs = minStartMs + 4 * msPerDay

    const startRatio = toRatio(minStartMs)
    const endRatio = toRatio(maxEndMs)
    const widthRatio = Math.max(0.02, endRatio - startRatio)
    const avgProg = Math.round(totalProg / tasks.length)

    return {
      startRatio,
      widthRatio,
      avgProgress: avgProg,
    }
  }

  // Infinite Scroll Handler: Automatically extends date window when scrolling near edges & syncs header date
  const handleTimelineScroll = useCallback(() => {
    const container = timelineScrollRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container

    // 1. Calculate the real-time date in the center of the visible viewport (Tempo Tasks sync)
    const totalMs = timelineEnd.getTime() - timelineStart.getTime()
    if (totalMs > 0 && scrollWidth > 0) {
      const centerPx = scrollLeft + clientWidth / 2
      const centerMs = timelineStart.getTime() + (centerPx / scrollWidth) * totalMs
      const centerDate = new Date(centerMs)

      const prev = viewportDateRef.current
      const isDiff =
        viewScale === "Day"
          ? centerDate.toDateString() !== prev.toDateString()
          : viewScale === "Quarter"
          ? Math.floor(centerDate.getMonth() / 3) !== Math.floor(prev.getMonth() / 3) || centerDate.getFullYear() !== prev.getFullYear()
          : viewScale === "Year"
          ? centerDate.getFullYear() !== prev.getFullYear()
          : centerDate.getMonth() !== prev.getMonth() || centerDate.getFullYear() !== prev.getFullYear()

      if (isDiff) {
        viewportDateRef.current = centerDate
        setViewportDate(new Date(centerDate))
      }
    }

    // 2. Infinite scroll buffer extension near edges (Only when initial scroll to Today is complete)
    if (isInitialScrollDoneRef.current && scrollLeft > 50 && scrollLeft < 200) {
      const prevScrollWidth = scrollWidth
      setBufferMonthsBefore(prev => prev + 3)
      // Compensate scrollLeft so user experiences zero visual jump
      requestAnimationFrame(() => {
        if (timelineScrollRef.current) {
          const newScrollWidth = timelineScrollRef.current.scrollWidth
          timelineScrollRef.current.scrollLeft = scrollLeft + (newScrollWidth - prevScrollWidth)
        }
      })
    } else if (isInitialScrollDoneRef.current && scrollWidth > clientWidth && scrollLeft + clientWidth > scrollWidth - 200) {
      setBufferMonthsAfter(prev => prev + 3)
    }

    // 3. Calculate dynamic offscreen chips on scroll (2-level: Product -> Squad -> Tasks)
    const chips: OffscreenChip[] = []
    let currentRowTop = 40 // header height
    let taskIdx = 0

    productGroups.forEach((prod) => {
      currentRowTop += 36 // Product row height
      if (!collapsedGroups[prod.productKey]) {
        prod.squads.forEach((squad) => {
          currentRowTop += 36 // Squad row height
          if (!collapsedGroups[squad.squadKey]) {
            squad.tasks.forEach((req) => {
              const bar = calculateTaskTimelineBar(req, taskIdx++)
              const barStartPx = bar.startRatio * scrollWidth
              const barEndPx = (bar.startRatio + bar.widthRatio) * scrollWidth

              if (barEndPx < scrollLeft - 8) {
                chips.push({
                  id: req.request_id || req.title,
                  title: req.title,
                  dateLabel: formatDueDate(req.release_date || req.expected_deadline),
                  side: "start",
                  top: currentRowTop + 18,
                  color: bar.theme.colorHex,
                  targetScrollLeft: Math.max(0, barStartPx - 40)
                })
              } else if (barStartPx > scrollLeft + clientWidth + 8) {
                chips.push({
                  id: req.request_id || req.title,
                  title: req.title,
                  dateLabel: formatDueDate(req.release_date || req.expected_deadline),
                  side: "end",
                  top: currentRowTop + 18,
                  color: bar.theme.colorHex,
                  targetScrollLeft: Math.max(0, barStartPx - clientWidth / 2)
                })
              }
              currentRowTop += 36 // task row height
            })
          }
        })
      }
    })

    setOffscreenChips(chips)
  }, [productGroups, collapsedGroups, calculateTaskTimelineBar, timelineStart, timelineEnd, viewScale])

  // Attach scroll listener to timeline container
  useEffect(() => {
    const container = timelineScrollRef.current
    if (!container) return
    container.addEventListener("scroll", handleTimelineScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleTimelineScroll)
  }, [handleTimelineScroll])

  // Focus directly on Today on initial mount and ensure it positions on Today
  useEffect(() => {
    if (columns.length === 0 || !timelineScrollRef.current) return

    const performScroll = () => {
      if (!timelineScrollRef.current) return
      scrollToToday(false)
      if (timelineScrollRef.current.scrollLeft > 0) {
        isInitialScrollDoneRef.current = true
      }
    }

    // Scroll immediately
    performScroll()

    // Re-apply on next animation frame and after transition delays (for tab animation)
    const raf = requestAnimationFrame(performScroll)
    const t1 = setTimeout(performScroll, 50)
    const t2 = setTimeout(performScroll, 150)
    const t3 = setTimeout(() => {
      performScroll()
      isInitialScrollDoneRef.current = true
    }, 300)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [columns, scrollToToday])

  const handleJumpToChip = (chip: OffscreenChip) => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollTo({
        left: chip.targetScrollLeft,
        behavior: "smooth"
      })
    }
  }

  // Preserve the center date position when zooming in or out (matching ReUI)
  useEffect(() => {
    if (isZoomingRef.current && preZoomCenterMsRef.current && timelineScrollRef.current) {
      const container = timelineScrollRef.current
      const totalMs = timelineEnd.getTime() - timelineStart.getTime()
      if (totalMs > 0 && container.scrollWidth > 0) {
        const ratio = (preZoomCenterMsRef.current - timelineStart.getTime()) / totalMs
        const targetLeft = Math.max(0, ratio * container.scrollWidth - container.clientWidth / 2)
        container.scrollLeft = targetLeft
      }
      isZoomingRef.current = false
      preZoomCenterMsRef.current = null
    }
  }, [columnWidth, timelineStart, timelineEnd])

  return (
    <div className={`bg-white overflow-hidden flex flex-col font-sans select-none relative w-full ${
      borderless ? "rounded-b-2xl border-0 shadow-none" : "rounded-2xl border border-slate-200/90 shadow-sm"
    } ${customClassName}`}>
      {/* =========================================================================
          TOP TOOLBAR (Exact ReUI Style: Today | Month ⌵ | < > | Title | Assignee Filter | Split Button)
          ========================================================================= */}
      <div className="h-14 px-4 sm:px-5 border-b border-slate-200/80 bg-white flex items-center justify-between gap-4">
        {/* Left Navigation Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToday}
            className="text-xs font-semibold text-slate-700 hover:text-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200/90 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            Today
          </button>

          {/* Scale Dropdown Selector (Day, Week, Month, Quarter, Year) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowScaleDropdown(!showScaleDropdown)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200/90 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            >
              <span>{viewScale}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {showScaleDropdown && (
              <div className="absolute left-0 top-full mt-1 w-32 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50 animate-in fade-in-50">
                {(["Day", "Week", "Month", "Quarter", "Year"] as ViewScale[]).map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => {
                      setViewScale(scale)
                      setShowScaleDropdown(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-50 cursor-pointer flex items-center justify-between ${
                      viewScale === scale ? "text-[#1057FB] font-bold bg-blue-50/50" : "text-slate-700"
                    }`}
                  >
                    <span>{scale}</span>
                    {viewScale === scale && <Check className="w-3 h-3 text-[#1057FB]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Steppers < > */}
          <div className="flex items-center rounded-lg border border-slate-200/90 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Lùi thời gian"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Tiến thời gian"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Title */}
          <span className="text-sm font-bold text-slate-900 ml-1 truncate max-w-[200px] sm:max-w-none">
            {headerTitle}
          </span>
        </div>

        {/* Right Controls: User Filter Capsule + Squad Filter + Split Button */}
        <div className="flex items-center gap-2">
          {/* User Filter Avatar Capsule (Exact Tempo Tasks aa Component) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserFilterPopover(!showUserFilterPopover)}
              className={`h-8 px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                selectedUsers.length > 0
                  ? "bg-blue-50/80 border-[#1057FB]"
                  : "bg-white hover:bg-slate-50 border-slate-200"
              }`}
              title="Filter by assignee"
            >
              {selectedUsers.length === 0 ? (
                <>
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-medium text-slate-500">All Assignees</span>
                </>
              ) : (
                <div className="flex items-center -space-x-1.5">
                  {selectedUsers.slice(0, 4).map((uName) => (
                    <UserAvatar
                      key={`sel-${uName}`}
                      name={uName}
                      size="xs"
                      className="w-5 h-5 text-[9px] ring-2 ring-white"
                    />
                  ))}
                  {selectedUsers.length > 4 && (
                    <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 flex items-center justify-center ring-2 ring-white">
                      +{selectedUsers.length - 4}
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* User Filter Popover */}
            {showUserFilterPopover && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in-50 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Lọc theo nhân sự</span>
                  {selectedUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedUsers([])}
                      className="text-[11px] text-blue-600 hover:underline cursor-pointer font-medium"
                    >
                      Bỏ chọn tất cả
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Tìm nhân sự..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {filteredUserOptions.map((u) => {
                    const isChecked = selectedUsers.includes(u.name)
                    return (
                      <div
                        key={`user-opt-${u.name}`}
                        onClick={() => handleToggleUserFilter(u.name)}
                        className={`flex items-center justify-between p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          isChecked ? "bg-blue-50 text-[#1057FB]" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar name={u.name} size="xs" className="w-5 h-5 text-[9px] shrink-0" />
                          <span className="truncate">{u.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-slate-400 font-bold">{u.count}</span>
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isChecked ? "bg-[#1057FB] border-[#1057FB] text-white" : "border-slate-300"}`}>
                            {isChecked && <Check className="w-2.5 h-2.5" />}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setShowUserFilterPopover(false)}
                    className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-800"
                  >
                    Xong
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Squad Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSquadFilterPopover(!showSquadFilterPopover)}
              className={`h-8 px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                selectedSquads.length > 0
                  ? "bg-blue-50 text-[#1057FB] border-[#1057FB]"
                  : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Squad {selectedSquads.length > 0 && `(${selectedSquads.length})`}</span>
            </button>

            {showSquadFilterPopover && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in-50 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Lọc theo Squad / Dự án</span>
                  {selectedSquads.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSquads([])}
                      className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                    >
                      Bỏ lọc
                    </button>
                  )}
                </div>

                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {allSquadOptions.map((sq, sIdx) => {
                    const isChecked = selectedSquads.includes(sq)
                    const count = requests.filter(
                      (r) => r.preferred_squad === sq || r.product === sq
                    ).length

                    return (
                      <div
                        key={`sq-opt-${sq}-${sIdx}`}
                        onClick={() => handleToggleSquadFilter(sq)}
                        className={`flex items-center justify-between p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          isChecked ? "bg-blue-50 text-[#1057FB]" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className="truncate">{sq}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-slate-400 font-bold">{count}</span>
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isChecked ? "bg-[#1057FB] border-[#1057FB] text-white" : "border-slate-300"}`}>
                            {isChecked && <Check className="w-2.5 h-2.5" />}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSquadFilterPopover(false)}
                    className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-800"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Split Button: + Add Task / New List */}
          <div className="relative flex items-center rounded-lg shadow-2xs">
            <button
              type="button"
              className="h-8 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-l-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="h-8 px-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-r-lg border-l border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showCreateMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50 animate-in fade-in-50">
                <button
                  type="button"
                  onClick={() => setShowCreateMenu(false)}
                  className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  <span>New Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateMenu(false)}
                  className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <ListTree className="w-3.5 h-3.5 text-slate-500" />
                  <span>New List</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SPLIT VIEW: EXACT 1-TO-1 ALIGNMENT BETWEEN LEFT TABLE & RIGHT TIMELINE
          With Resizable Splitter (tempo-tasks splitter)
          ========================================================================= */}
      <div className="flex overflow-hidden relative">
        {/* =========================================================================
            LEFT COLUMN (TREE PANE): NAME | STATUS | ASSIGNEE | DUE DATE | +
            NO CHECKBOXES, NO DRAG GRIP ICONS (Exactly matching Tempo Tasks screenshot)
            ========================================================================= */}
        <div 
          style={{ width: `${treeWidth}px`, minWidth: `${treeWidth}px`, maxWidth: `${treeWidth}px` }} 
          className="shrink-0 bg-white flex flex-col select-none overflow-hidden border-r border-slate-200"
        >
          {/* Header Row (Height: 40px) */}
          <div className="h-10 px-3 bg-white border-b border-slate-200 flex items-center text-[12px] font-normal text-slate-500 select-none">
            {/* Name Column */}
            <div className="flex-1 pl-3 min-w-[140px] truncate font-medium text-slate-500">
              Name
            </div>

            {/* Optional Columns */}
            {visibleColumns.status && (
              <div className="w-28 text-left pl-1 shrink-0 font-medium text-slate-500">
                Status
              </div>
            )}

            {visibleColumns.assignee && (
              <div className="w-20 text-center shrink-0 font-medium text-slate-500">
                Assignee
              </div>
            )}

            {visibleColumns.due && (
              <div className="w-20 text-left pl-2 shrink-0 font-medium text-slate-500">
                Due date
              </div>
            )}

            {visibleColumns.priority && (
              <div className="w-20 text-left pl-2 shrink-0 font-medium text-slate-500">
                Priority
              </div>
            )}

            {/* + Columns Menu Dropdown Button */}
            <div className="relative w-7 flex items-center justify-center shrink-0">
              <button
                type="button"
                onClick={() => setShowColumnsPopover(!showColumnsPopover)}
                className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                title="Add or remove columns"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {showColumnsPopover && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in-50 space-y-1">
                  <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Columns
                  </div>
                  {[
                    { key: "status", label: "Status" },
                    { key: "assignee", label: "Assignee" },
                    { key: "due", label: "Due date" },
                    { key: "priority", label: "Priority" },
                  ].map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-700"
                    >
                      <span>{col.label}</span>
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.key as keyof typeof visibleColumns]}
                        onChange={() => setVisibleColumns(prev => ({ ...prev, [col.key]: !prev[col.key as keyof typeof visibleColumns] }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table Body (Each row exact h-9: 36px - 2 Level Tree: Product -> Squad -> Tasks) */}
          <div className="flex-1">
            {productGroups.map((prod, pIdx) => {
              const isProdCollapsed = Boolean(collapsedGroups[prod.productKey])

              return (
                <div key={`left-prod-${prod.productKey}-${pIdx}`} className="flex flex-col">
                  {/* Level 1: Product Header Row (h-9: 36px) */}
                  <div
                    onClick={() => toggleGroup(prod.productKey)}
                    className="h-9 px-3 bg-slate-50/90 hover:bg-slate-100/80 border-b border-slate-200/90 flex items-center cursor-pointer transition-colors group select-none"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Chevron */}
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                          isProdCollapsed ? "-rotate-90" : ""
                        }`}
                      />

                      {/* Product Icon */}
                      <Folder className="w-3.5 h-3.5 text-slate-700 shrink-0" />

                      {/* Product Name */}
                      <span className="text-[13px] font-bold text-slate-900 truncate">
                        {prod.productName}
                      </span>

                      {/* Task Count Badge */}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-mono font-semibold">
                        {prod.allTasks.length}
                      </span>

                      {/* Circular Progress Wheel */}
                      <span className="w-3 h-3 rounded-full border border-slate-300 border-t-slate-700 inline-block shrink-0" />
                    </div>

                    {/* 3-dots actions menu */}
                    <div className="w-7 flex justify-end text-slate-300 group-hover:text-slate-500">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Level 2: Squad Rows (Only if Product is not collapsed) */}
                  {!isProdCollapsed &&
                    prod.squads.map((squad, sIdx) => {
                      const isSquadCollapsed = Boolean(collapsedGroups[squad.squadKey])
                      const squadColorDef = getSquadColorDef(squad.squadName, prod.productName)

                      return (
                        <div key={`left-squad-${squad.squadKey}-${sIdx}`} className="flex flex-col">
                          {/* Squad Header Row (h-9: 36px) indented */}
                          <div
                            onClick={() => toggleGroup(squad.squadKey)}
                            className="h-9 px-3 pl-6 bg-white hover:bg-slate-50 border-b border-slate-100 flex items-center cursor-pointer transition-colors group select-none"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {/* Chevron */}
                              <ChevronDown
                                className={`w-3 h-3 text-slate-400 transition-transform ${
                                  isSquadCollapsed ? "-rotate-90" : ""
                                }`}
                              />

                              {/* Squad Color Dot (follows squad setting) */}
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${squadColorDef.dotClass || "bg-blue-600"}`}
                                style={squadColorDef.hex ? { backgroundColor: squadColorDef.hex } : undefined}
                              />

                              {/* Squad Name */}
                              <span className="text-[12.5px] font-medium text-slate-700 truncate">
                                {squad.squadName}
                              </span>

                              {/* Task count pill */}
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-mono font-medium">
                                {squad.tasks.length}
                              </span>
                            </div>

                            {/* 3-dots actions menu */}
                            <div className="w-7 flex justify-end text-slate-300 group-hover:text-slate-500">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          {/* Level 3: Task Rows (Only if Squad is not collapsed) */}
                          {!isSquadCollapsed &&
                            squad.tasks.map((req, rIdx) => {
                              const stageInfo = getTaskStageStatusInfo(req, rIdx)
                              const isOverdue = (() => {
                                if (!req.expected_deadline || req.status === "Hoàn thành") return false
                                const d = parseDate(req.expected_deadline)
                                return d.getTime() < today.getTime()
                              })()

                              const releaseDateFormatted = formatDueDate(req.release_date || req.expected_deadline)
                              const priority = getPriorityConfig(req.priority)

                              return (
                                <div
                                  key={req.request_id ? `left-task-${req.request_id}-${pIdx}-${sIdx}-${rIdx}` : `left-task-${pIdx}-${sIdx}-${rIdx}`}
                                  onClick={() => onSelectRequest?.(req)}
                                  className={`h-9 px-3 ${stageInfo.isPending ? "opacity-50 bg-amber-50/15" : "bg-white"} hover:bg-blue-50/40 border-b border-slate-100 flex items-center cursor-pointer transition-all group select-none`}
                                >
                                  {/* Name column, indented pl-10 */}
                                  <div className="flex-1 flex items-center min-w-[140px] pl-10">
                                    {/* Title */}
                                    <span className={`text-[12.5px] font-normal ${stageInfo.isPending ? "text-slate-500 italic" : "text-slate-800"} truncate group-hover:text-blue-600 transition-colors`}>
                                      {req.title}
                                    </span>
                                  </div>

                                  {/* Status Badge */}
                                  {visibleColumns.status && (
                                    <div className="w-28 flex justify-start items-center pl-1 shrink-0">
                                      <span
                                        className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 border ${stageInfo.badgeClass}`}
                                        title={stageInfo.title}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stageInfo.dot}`} />
                                        <span className="truncate max-w-[85px]">{stageInfo.text}</span>
                                      </span>
                                    </div>
                                  )}

                                  {/* Assignee Avatar */}
                                  {visibleColumns.assignee && (
                                    <div className="w-20 flex justify-center shrink-0">
                                      {req.assigned_designer && req.assigned_designer !== "Chưa phân công" ? (
                                        <UserAvatar
                                          name={req.assigned_designer}
                                          size="xs"
                                          className="w-5 h-5 text-[9px] ring-1 ring-white shadow-2xs"
                                        />
                                      ) : (
                                        /* Clean dashed circle for unassigned */
                                        <span className="w-5 h-5 rounded-full border border-dashed border-slate-300 flex items-center justify-center shrink-0" />
                                      )}
                                    </div>
                                  )}

                                  {/* Due Date */}
                                  {visibleColumns.due && (
                                    <div className={`w-20 text-left pl-2 text-[11.5px] shrink-0 font-mono truncate ${
                                      isOverdue ? "text-rose-600 font-semibold" : "text-slate-500 font-normal"
                                    }`}>
                                      {releaseDateFormatted || "—"}
                                    </div>
                                  )}

                                  {/* Priority */}
                                  {visibleColumns.priority && (
                                    <div className="w-20 text-left pl-2 flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0 truncate">
                                      <Flag className={`w-3 h-3 ${priority.flag}`} />
                                      <span>{priority.label}</span>
                                    </div>
                                  )}

                                  {/* 3-dots actions menu */}
                                  <div className="w-7 flex justify-end text-slate-300 group-hover:text-slate-500">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      )
                    })}
                </div>
              )
            })}

            {/* Add Task Button at bottom */}
            <div className="h-9 px-4 flex items-center gap-1.5 text-[12px] font-normal text-slate-400 hover:text-slate-600 cursor-pointer border-b border-slate-100/70 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              <span>Add task</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RESIZABLE SPLITTER (Exact Tempo Tasks Divider)
            ========================================================================= */}
        <div
          role="separator"
          aria-orientation="vertical"
          onPointerDown={handleSplitterPointerDown}
          onDoubleClick={() => setTreeWidth(500)}
          className="group/splitter relative z-30 w-px shrink-0 cursor-col-resize touch-none bg-slate-200 hover:bg-blue-500 transition-colors after:absolute after:inset-y-0 after:-start-1 after:-end-1 select-none"
          title="Kéo để điều chỉnh độ rộng bảng (Double-click để reset)"
        >
          {/* Grip Indicator */}
          <span className="absolute top-1/2 left-1/2 h-6 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 opacity-0 group-hover/splitter:opacity-100 transition-opacity" />
        </div>

        {/* =========================================================================
            RIGHT COLUMN (TIMELINE PANE): Wrapper with Fixed Floating Controls
            Matching ReUI Tempo Tasks data-slot="gantt-timeline-pane"
            ========================================================================= */}
        <div 
          data-slot="gantt-timeline-pane"
          className="flex-1 min-w-[500px] bg-white flex flex-col relative overflow-hidden h-full"
        >
          {/* FLOATING VERTICAL ZOOM PILL (Exact ReUI gantt-zoom) - ALWAYS VISIBLE AT BOTTOM-RIGHT */}
          <div 
            data-slot="gantt-zoom"
            className="absolute right-3 bottom-5 z-40 flex flex-col rounded-md border border-slate-200/90 bg-white shadow-sm select-none"
          >
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2.0}
              className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-t-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              title="Zoom in (+)"
              aria-label="Zoom in"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-b-md border-t border-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              title="Zoom out (−)"
              aria-label="Zoom out"
            >
              <Minus className="w-3 h-3" />
            </button>
          </div>

          {/* Scrollable Timeline Viewport */}
          <div 
            ref={timelineScrollRef}
            className="w-full flex-1 overflow-x-auto relative"
          >
          {/* Inner content with guaranteed pixel width matching all columns */}
          <div 
            style={{ 
              width: `${Math.max(720, columns.length * columnWidth)}px`, 
              minWidth: `${Math.max(720, columns.length * columnWidth)}px` 
            }} 
            className="flex flex-col relative"
          >
            {/* Header Row (Height: 40px - 2 Tiers) */}
            <div className="h-10 bg-white border-b border-slate-200 flex flex-col sticky top-0 z-20 select-none">
              {/* Tier 1: Week Ranges */}
              <div className="h-5 flex border-b border-slate-100 text-[11px] font-normal text-slate-400">
                {weekSpans.map((ws, idx) => (
                  <div
                    key={`ws-${idx}`}
                    style={{
                      width: `${ws.colSpan * columnWidth}px`,
                      minWidth: `${ws.colSpan * columnWidth}px`,
                    }}
                    className="shrink-0 border-r border-slate-100/80 px-2 flex items-center overflow-hidden whitespace-nowrap"
                  >
                    {ws.label}
                  </div>
                ))}
              </div>

              {/* Tier 2: Days */}
              <div className="h-5 flex text-[11px] font-normal relative">
                {columns.map((col) => (
                  <div
                    key={col.id}
                    data-today={col.isToday ? "true" : undefined}
                    style={{
                      width: `${columnWidth}px`,
                      minWidth: `${columnWidth}px`,
                      maxWidth: `${columnWidth}px`,
                    }}
                    className={`shrink-0 h-5 border-r border-slate-100/70 flex items-center justify-center whitespace-nowrap select-none overflow-hidden relative ${
                      col.isToday
                        ? "bg-blue-50/50 text-[#1057FB] font-semibold"
                        : col.isWeekend
                        ? "bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,rgba(0,0,0,0.025)_5px,rgba(0,0,0,0.025)_6px)] bg-slate-50/60 text-slate-400 font-normal"
                        : "text-slate-500 font-normal"
                    }`}
                  >
                    <span className={`whitespace-nowrap leading-none ${col.isToday ? "rounded-full bg-blue-100/80 px-1.5 py-0.5 text-[#1057FB]" : ""}`}>
                      {col.label}
                    </span>

                    {/* Today Dot in Header (Kr component) */}
                    {col.isToday && (
                      <span className="absolute -bottom-0.5 z-20 w-1.5 h-1.5 rounded-full bg-rose-500 left-1/2 -translate-x-1/2" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Body Rows with CONTINUOUS VERTICAL RED TODAY LINE */}
            <div className="flex-1 relative divide-y divide-slate-100 bg-[repeating-linear-gradient(45deg,#fafafa_0,#fafafa_1px,transparent_0,transparent_50%)] bg-[size:12px_12px]">
              {/* CONTINUOUS VERTICAL RED TODAY LINE (Gr component) */}
              {todayPositionPercent !== null && (
                <div
                  className="absolute top-0 bottom-0 z-20 pointer-events-none w-px bg-gradient-to-b from-rose-500/80 via-rose-500/40 to-rose-500/10"
                  style={{ left: `${todayPositionPercent}%` }}
                />
              )}

              {productGroups.map((prod, pIdx) => {
                const isProdCollapsed = Boolean(collapsedGroups[prod.productKey])
                const prodBar = calculateGroupTimelineBar(prod.allTasks)

                return (
                  <React.Fragment key={`right-prod-${prod.productKey}-${pIdx}`}>
                    {/* Level 1: Product Spacer Row (h-9: 36px) */}
                    <div className="h-9 bg-slate-50/70 border-b border-slate-200/90 relative flex items-center">
                      <div className="absolute inset-0 flex pointer-events-none">
                        {columns.map((col) => (
                          <div
                            key={`pcol-bg-${col.id}`}
                            style={{
                              width: `${columnWidth}px`,
                              minWidth: `${columnWidth}px`,
                              maxWidth: `${columnWidth}px`,
                            }}
                            className={`shrink-0 border-r border-slate-100/70 ${
                              col.isWeekend
                                ? "bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,rgba(0,0,0,0.025)_5px,rgba(0,0,0,0.025)_6px)] bg-slate-50/60"
                                : ""
                            } ${col.isToday ? "bg-blue-50/15" : ""}`}
                          />
                        ))}
                      </div>

                      {/* Product Summary Progress Bar */}
                      {prodBar && (
                        <div
                          style={{
                            left: `${prodBar.startRatio * 100}%`,
                            width: `${prodBar.widthRatio * 100}%`,
                          }}
                          className="absolute h-[3px] rounded-full bg-slate-300 flex items-center z-10 select-none"
                        >
                          <div
                            style={{ width: `${prodBar.avgProgress}%` }}
                            className="h-full rounded-full bg-slate-800 transition-all"
                          />
                          <span className="absolute left-[calc(100%+8px)] text-[11px] font-semibold font-mono text-slate-700 whitespace-nowrap">
                            {prodBar.avgProgress}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Level 2: Squad Rows (Only if Product is not collapsed) */}
                    {!isProdCollapsed &&
                      prod.squads.map((squad, sIdx) => {
                        const isSquadCollapsed = Boolean(collapsedGroups[squad.squadKey])
                        const squadBar = calculateGroupTimelineBar(squad.tasks)

                        return (
                          <React.Fragment key={`right-squad-${squad.squadKey}-${sIdx}`}>
                            {/* Squad Spacer Row (h-9: 36px) with Squad Summary Line */}
                            <div className="h-9 bg-white border-b border-slate-100 relative flex items-center">
                              <div className="absolute inset-0 flex pointer-events-none">
                                {columns.map((col) => (
                                  <div
                                    key={`scol-bg-${col.id}`}
                                    style={{
                                      width: `${columnWidth}px`,
                                      minWidth: `${columnWidth}px`,
                                      maxWidth: `${columnWidth}px`,
                                    }}
                                    className={`shrink-0 border-r border-slate-100/70 ${
                                      col.isWeekend
                                        ? "bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,rgba(0,0,0,0.025)_5px,rgba(0,0,0,0.025)_6px)] bg-slate-50/60"
                                        : ""
                                    } ${col.isToday ? "bg-blue-50/15" : ""}`}
                                  />
                                ))}
                              </div>

                              {squadBar && (
                                <div
                                  style={{
                                    left: `${squadBar.startRatio * 100}%`,
                                    width: `${squadBar.widthRatio * 100}%`,
                                  }}
                                  className="absolute h-[2px] rounded-full bg-slate-200 flex items-center z-10 select-none"
                                >
                                  <div
                                    style={{ width: `${squadBar.avgProgress}%` }}
                                    className="h-full rounded-full bg-blue-500 transition-all"
                                  />
                                  <span className="absolute left-[calc(100%+8px)] text-[10.5px] font-normal font-mono text-slate-500 whitespace-nowrap">
                                    {squadBar.avgProgress}%
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Level 3: Task Rows (Only if Squad is not collapsed) */}
                            {!isSquadCollapsed &&
                              squad.tasks.map((req, rIdx) => {
                                const taskBar = calculateTaskTimelineBar(req, rIdx)
                                const leftPct = taskBar.startRatio * 100
                                const widthPct = taskBar.widthRatio * 100

                                return (
                                  <div
                                    key={`right-row-${pIdx}-${sIdx}-${rIdx}`}
                                    className="h-9 relative flex items-center hover:bg-blue-50/20 transition-colors group select-none"
                                  >
                                    {/* Background Column Dividers */}
                                    <div className="absolute inset-0 flex pointer-events-none">
                                      {columns.map((col) => (
                                        <div
                                          key={`tcol-bg-${col.id}`}
                                          style={{
                                            width: `${columnWidth}px`,
                                            minWidth: `${columnWidth}px`,
                                            maxWidth: `${columnWidth}px`,
                                          }}
                                          className={`shrink-0 border-r border-slate-100/70 ${
                                            col.isWeekend
                                              ? "bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,rgba(0,0,0,0.025)_5px,rgba(0,0,0,0.025)_6px)] bg-slate-50/60"
                                              : ""
                                          } ${col.isToday ? "bg-blue-50/15" : ""}`}
                                        />
                                      ))}
                                    </div>

                                    {/* Task Capsule Bar */}
                                    <div
                                      onClick={() => onSelectRequest?.(req)}
                                      onMouseEnter={(e) => {
                                        setHoveredTooltip({
                                          request: req,
                                          clientX: e.clientX,
                                          clientY: e.clientY,
                                        })
                                      }}
                                      onMouseMove={(e) => {
                                        setHoveredTooltip({
                                          request: req,
                                          clientX: e.clientX,
                                          clientY: e.clientY,
                                        })
                                      }}
                                      onMouseLeave={() => setHoveredTooltip(null)}
                                      style={{
                                        left: `${leftPct}%`,
                                        width: `${Math.max(1.5, widthPct)}%`,
                                      }}
                                      className={`group/bar absolute h-[20px] rounded-[5px] ${taskBar.theme.bg} ${taskBar.isPending ? "opacity-50" : ""} flex items-center overflow-hidden border-0 ring-0 outline-none transition-all cursor-pointer z-10 select-none`}
                                    >
                                      {/* Left Resize Handle */}
                                      <span className="absolute inset-y-0 start-0.5 flex w-2 cursor-ew-resize items-center justify-start opacity-0 group-hover/bar:opacity-100 transition-opacity">
                                        <span className="h-2.5 w-0.5 rounded-full bg-slate-500/40" />
                                      </span>

                                      {/* Progress Fill Overlay */}
                                      <div
                                        style={{ width: `${taskBar.progressPercent}%` }}
                                        className={`h-full ${taskBar.theme.fill} rounded-l-[5px] flex items-center justify-start pl-1.5 transition-all`}
                                      >
                                        {taskBar.isDone && (
                                          <Check className="w-2.5 h-2.5 text-current stroke-[2.5]" />
                                        )}
                                      </div>

                                      {/* Right Resize Handle */}
                                      <span className="absolute inset-y-0 end-0.5 flex w-2 cursor-ew-resize items-center justify-end opacity-0 group-hover/bar:opacity-100 transition-opacity">
                                        <span className="h-2.5 w-0.5 rounded-full bg-slate-500/40" />
                                      </span>
                                    </div>

                                    {/* Title Label Placed to the Right of Capsule Bar */}
                                    <span
                                      onClick={() => onSelectRequest?.(req)}
                                      style={{
                                        left: `calc(${leftPct + Math.max(1.5, widthPct)}% + 8px)`,
                                      }}
                                      className={`absolute text-[11.5px] font-normal ${taskBar.isPending ? "text-slate-400 italic" : "text-slate-700"} hover:text-blue-600 truncate max-w-[280px] cursor-pointer z-10 transition-colors pointer-events-auto select-none whitespace-nowrap`}
                                      title={req.title}
                                    >
                                      {req.title}
                                      {taskBar.isPending && (
                                        <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 not-italic">
                                          {taskBar.stageInfo.text}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                )
                              })}
                          </React.Fragment>
                        )
                      })}
                  </React.Fragment>
                )
              })}

              {/* Bottom Spacer Row */}
              <div className="h-9 relative border-b border-slate-100/70">
                <div className="absolute inset-0 flex pointer-events-none">
                  {columns.map((col) => (
                    <div
                      key={`add-col-bg-${col.id}`}
                      style={{
                        width: `${columnWidth}px`,
                        minWidth: `${columnWidth}px`,
                        maxWidth: `${columnWidth}px`,
                      }}
                      className={`shrink-0 border-r border-slate-100/70 ${
                        col.isWeekend
                          ? "bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,rgba(0,0,0,0.025)_5px,rgba(0,0,0,0.025)_6px)] bg-slate-50/60"
                          : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              OFFSCREEN CHIPS (Exact Tempo Tasks gantt-offscreen-chip Component)
              ========================================================================= */}
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
            {offscreenChips.map((chip) => (
              <button
                key={`chip-${chip.id}-${chip.side}`}
                type="button"
                onClick={() => handleJumpToChip(chip)}
                style={{
                  top: `${chip.top}px`,
                  ...(chip.side === "start" ? { left: "0.5rem" } : { right: "1rem" })
                }}
                className="pointer-events-auto absolute flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-xs hover:text-slate-800 hover:shadow-sm transition-all group"
                title={`Nhảy tới: ${chip.title} (${chip.dateLabel})`}
              >
                {chip.side === "start" ? (
                  <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                ) : (
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                )}
                {/* Colored task dot indicator */}
                <span 
                  className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full ring-1 ring-white" 
                  style={{ backgroundColor: chip.color }}
                />
              </button>
            ))}
          </div>

          </div>
        </div>
      </div>

      {/* =========================================================================
          RICH FLOATING REUI TOOLTIP CARD (Smooth Cursor Following)
          ========================================================================= */}
      <AnimatePresence>
        {hoveredTooltip && (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
              x: Math.min(window.innerWidth - 304, Math.max(12, hoveredTooltip.clientX - 140)),
              y: hoveredTooltip.clientY > 170 ? hoveredTooltip.clientY - 148 : hoveredTooltip.clientY + 18,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              x: Math.min(window.innerWidth - 304, Math.max(12, hoveredTooltip.clientX - 140)),
              y: hoveredTooltip.clientY > 170 ? hoveredTooltip.clientY - 148 : hoveredTooltip.clientY + 18,
            }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
            transition={{
              x: { type: "spring", damping: 32, stiffness: 500, mass: 0.25 },
              y: { type: "spring", damping: 32, stiffness: 500, mass: 0.25 },
              opacity: { duration: 0.12 },
              scale: { duration: 0.12 },
            }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
            }}
            className="w-72 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl z-50 pointer-events-none border border-slate-700/80 space-y-2.5 will-change-transform"
          >
            {/* Tooltip Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono font-bold">
                {hoveredTooltip.request.preferred_squad || hoveredTooltip.request.product || "MBBank"}
              </span>
              {(() => {
                const sInfo = getTaskStageStatusInfo(hoveredTooltip.request)
                return (
                  <span className={`text-[11px] font-bold ${sInfo.isPending ? "text-amber-400" : "text-blue-400"}`}>
                    {sInfo.text}
                  </span>
                )
              })()}
            </div>

            {/* Full Task Title */}
            <p className="text-xs font-bold text-white leading-snug">
              {hoveredTooltip.request.title}
            </p>

            {/* Details Grid */}
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Phụ trách:</span>
                <span className="font-semibold text-white">
                  {hoveredTooltip.request.assigned_designer || "Chưa gán"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Release / Hạn:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {hoveredTooltip.request.release_date || hoveredTooltip.request.expected_deadline || "Chưa hạn"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tiến độ tổng:</span>
                <span className="font-mono text-white font-bold">
                  {hoveredTooltip.request.progress || 0}%
                </span>
              </div>

              {(() => {
                const sInfo = getTaskStageStatusInfo(hoveredTooltip.request)
                return sInfo.isPending ? (
                  <div className="flex items-center justify-between text-amber-300 pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Lý do Pending:</span>
                    <span className="font-medium text-amber-300 truncate max-w-[150px]" title={sInfo.title}>
                      {sInfo.title}
                    </span>
                  </div>
                ) : null
              })()}
            </div>

            {/* Hint */}
            <div className="pt-1 text-[10px] text-slate-500 font-medium text-center">
              💡 Click để mở chi tiết đề bài & cập nhật tiến độ
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          FOOTER LEGEND
          ========================================================================= */}
      <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-3.5 flex-wrap">
          <span className="font-bold text-slate-800 text-[11.5px]">Khâu UX:</span>
          <span className="inline-flex items-center gap-1.5 font-medium"><span className="w-2 h-2 rounded-full bg-amber-500" /> 1. Phân loại</span>
          <span className="inline-flex items-center gap-1.5 font-medium"><span className="w-2 h-2 rounded-full bg-purple-500" /> 2. Discovery</span>
          <span className="inline-flex items-center gap-1.5 font-medium"><span className="w-2 h-2 rounded-full bg-indigo-500" /> 3. User Flow</span>
          <span className="inline-flex items-center gap-1.5 font-medium"><span className="w-2 h-2 rounded-full bg-blue-600" /> 4. UI Design</span>
          <span className="inline-flex items-center gap-1.5 font-medium"><span className="w-2 h-2 rounded-full bg-teal-500" /> 5. Prototype</span>
          <span className="inline-flex items-center gap-1.5 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 6. Bàn giao</span>
        </div>

        <div className="text-[11px] text-slate-400 font-medium">
          💡 Rê chuột vào thanh để xem chi tiết • Vuốt ngang timeline vô cực
        </div>
      </div>
    </div>
  )
}
