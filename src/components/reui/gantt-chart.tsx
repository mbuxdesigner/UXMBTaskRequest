import React, { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UXRequest } from "../../data/mockData"
import { UserAvatar } from "@/components/common/UserAvatar"
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ListTree, 
  MoreHorizontal, 
  Lock, 
  Search, 
  CheckCircle2, 
  AlertTriangle,
  Filter,
  Check
} from "lucide-react"

interface ReUIGanttChartProps {
  requests: UXRequest[]
  onSelectRequest?: (req: UXRequest) => void
}

export type ViewScale = "Month" | "Week" | "Day" | "Year"

interface TimelinePhaseBlock {
  id: string
  phaseKey: string
  phaseName: string
  label: string
  timeBadge?: string
  startRatio: number // 0 to 1
  widthRatio: number // 0 to 1
  colorClass: string
  icon?: "lock" | "check" | "alert"
  startDateStr: string
  endDateStr: string
  slaDays: number
  deliverable: string
}

interface HoveredBlockInfo {
  block: TimelinePhaseBlock
  request: UXRequest
  clientX: number
  clientY: number
}

// 6 Official UX Stages from statusConfig.ts
export const UX_STAGES = [
  { key: "1_phan_loai", label: "1. Phân loại", fullTitle: "1. Phân loại đề bài", color: "bg-amber-100 text-amber-900 border border-amber-300", dot: "bg-amber-500", sla: 1, deliverable: "Phân loại & tiếp nhận yêu cầu" },
  { key: "2_discovery", label: "2. Discovery", fullTitle: "2. Khảo sát & Discovery", color: "bg-purple-100 text-purple-900 border border-purple-300", dot: "bg-purple-500", sla: 2, deliverable: "Nghiên cứu & PRD Specs" },
  { key: "3_user_flow", label: "3. User Flow", fullTitle: "3. Kiến trúc User Flow", color: "bg-indigo-100 text-indigo-900 border border-indigo-300", dot: "bg-indigo-500", sla: 2, deliverable: "User Flow & Wireframe Diagrams" },
  { key: "4_ui_design", label: "4. UI Design", fullTitle: "4. Thiết kế UI Design", color: "bg-blue-100 text-blue-900 border border-blue-300", dot: "bg-blue-600", sla: 3, deliverable: "Figma High-Fidelity UI Layouts" },
  { key: "5_prototype", label: "5. Prototype", fullTitle: "5. Interactive Prototype", color: "bg-teal-100 text-teal-900 border border-teal-300", dot: "bg-teal-500", sla: 2, deliverable: "Prototype tương tác & Review" },
  { key: "6_ban_giao", label: "6. Bàn giao", fullTitle: "6. Nghiệm thu & Bàn giao Tech", color: "bg-emerald-100 text-emerald-900 border border-emerald-300", dot: "bg-emerald-500", sla: 1, deliverable: "Dev Handoff & Assets Export" },
]

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

function formatDueDate(dateStr?: string): string {
  if (!dateStr) return "-"
  const d = parseDate(dateStr)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${day}/${month}`
}

function getStatusBadgeConfig(status?: string, phase?: string, isOverdue?: boolean) {
  if (isOverdue) {
    return {
      dot: "bg-rose-500",
      text: "Overdue",
      badgeClass: "bg-rose-50 text-rose-700 border border-rose-200",
    }
  }
  if (status === "Hoàn thành" || status === "Hoành thành") {
    return {
      dot: "bg-emerald-500",
      text: "Done",
      badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
    }
  }
  if (status === "Đang thực hiện") {
    return {
      dot: "bg-blue-500",
      text: "In Progress",
      badgeClass: "bg-purple-50 text-purple-700 border border-purple-200/80",
    }
  }
  if (status === "Bị chặn") {
    return {
      dot: "bg-amber-500",
      text: "Blocked",
      badgeClass: "bg-amber-50 text-amber-800 border border-amber-200/80",
    }
  }
  return {
    dot: "border-2 border-zinc-400 bg-white",
    text: "To Do",
    badgeClass: "bg-zinc-100 text-zinc-700 border border-zinc-200",
  }
}

// Map task's status or current_phase to one of the 6 stages index (0 to 5)
function getTaskStageIndex(req: UXRequest): number {
  if (req.status === "Hoàn thành" || req.status === "Hoành thành") return 5
  
  const text = `${req.current_phase || ""} ${req.status || ""}`.toLowerCase()
  if (text.includes("bàn giao") || text.includes("handoff")) return 5
  if (text.includes("prototype") || text.includes("review")) return 4
  if (text.includes("ui") || text.includes("design")) return 3
  if (text.includes("flow") || text.includes("wireframe")) return 2
  if (text.includes("discovery") || text.includes("khảo sát") || text.includes("khám phá")) return 1
  if (text.includes("phân loại") || text.includes("tiếp nhận") || text.includes("mới")) return 0

  // Fallback by progress
  const p = req.progress ?? 50
  if (p >= 100) return 5
  if (p >= 75) return 4
  if (p >= 50) return 3
  if (p >= 30) return 2
  if (p >= 15) return 1
  return 0
}

export default function ReUIGanttChart({ requests, onSelectRequest }: ReUIGanttChartProps) {
  const [viewScale, setViewScale] = useState<ViewScale>("Month")
  const [showScaleDropdown, setShowScaleDropdown] = useState(false)
  const [showSquadFilterPopover, setShowSquadFilterPopover] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSquads, setSelectedSquads] = useState<string[]>([])
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  // Tooltip State
  const [hoveredTooltip, setHoveredTooltip] = useState<HoveredBlockInfo | null>(null)

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
      if (r.preferred_squad) set.add(r.preferred_squad)
      else if (r.product) set.add(r.product)
    })
    return Array.from(set)
  }, [requests])

  // Navigation handlers
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      if (viewScale === "Day") d.setDate(d.getDate() - 1)
      else if (viewScale === "Week") d.setDate(d.getDate() - 7)
      else if (viewScale === "Month") d.setMonth(d.getMonth() - 1)
      else if (viewScale === "Year") d.setFullYear(d.getFullYear() - 1)
      return d
    })
  }

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      if (viewScale === "Day") d.setDate(d.getDate() + 1)
      else if (viewScale === "Week") d.setDate(d.getDate() + 7)
      else if (viewScale === "Month") d.setMonth(d.getMonth() + 1)
      else if (viewScale === "Year") d.setFullYear(d.getFullYear() + 1)
      return d
    })
  }

  const handleResetToday = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setCurrentDate(d)
  }

  // Header Title
  const headerTitle = useMemo(() => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    if (viewScale === "Day") {
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      return `${daysOfWeek[currentDate.getDay()]}, ${months[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`
    }
    if (viewScale === "Week") {
      const d = new Date(currentDate)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(d.setDate(diff))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return `${monday.getDate()} ${months[monday.getMonth()].slice(0, 3)} - ${sunday.getDate()} ${months[sunday.getMonth()].slice(0, 3)}, ${sunday.getFullYear()}`
    }
    if (viewScale === "Year") {
      return `${currentDate.getFullYear()}`
    }
    return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }, [currentDate, viewScale])

  // Columns & scale setup
  const { timelineStart, timelineEnd, columns, todayPositionPercent } = useMemo(() => {
    const cols: Array<{ id: string; label: string; subLabel?: string; isWeekend?: boolean; isToday?: boolean }> = []
    let start = new Date(currentDate)
    let end = new Date(currentDate)

    if (viewScale === "Day") {
      start.setHours(8, 0, 0, 0)
      end.setHours(18, 0, 0, 0)
      for (let h = 8; h <= 18; h++) {
        cols.push({
          id: `h-${h}`,
          label: `${h}:00`,
          subLabel: h >= 12 ? "PM" : "AM",
        })
      }
    } else if (viewScale === "Week") {
      const d = new Date(currentDate)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      start = new Date(d.setDate(diff))
      start.setHours(0, 0, 0, 0)

      for (let i = 0; i < 7; i++) {
        const cur = new Date(start)
        cur.setDate(start.getDate() + i)
        const isSun = cur.getDay() === 0
        const isSat = cur.getDay() === 6
        cols.push({
          id: `w-${i}`,
          label: cur.toLocaleDateString("vi-VN", { weekday: "short" }),
          subLabel: `${cur.getDate()}/${cur.getMonth() + 1}`,
          isWeekend: isSun || isSat,
          isToday: cur.toDateString() === today.toDateString(),
        })
      }
      end = new Date(start)
      end.setDate(start.getDate() + 7)
    } else if (viewScale === "Year") {
      const y = currentDate.getFullYear()
      start = new Date(y, 0, 1)
      end = new Date(y, 11, 31, 23, 59, 59)
      const monthNames = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"]
      monthNames.forEach((m, idx) => {
        cols.push({
          id: `m-${idx}`,
          label: m,
          isToday: today.getFullYear() === y && today.getMonth() === idx,
        })
      })
    } else {
      const y = currentDate.getFullYear()
      const m = currentDate.getMonth()
      start = new Date(y, m, 1)
      const daysCount = new Date(y, m + 1, 0).getDate()
      end = new Date(y, m, daysCount, 23, 59, 59)

      for (let i = 1; i <= daysCount; i++) {
        const cur = new Date(y, m, i)
        const dayOfWeek = cur.getDay()
        cols.push({
          id: `d-${i}`,
          label: cur.toLocaleDateString("vi-VN", { weekday: "narrow" }),
          subLabel: `${i}`,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          isToday: cur.toDateString() === today.toDateString(),
        })
      }
    }

    // Accurate Today Marker Center Position
    let todayPct: number | null = null

    if (viewScale === "Month") {
      const y = currentDate.getFullYear()
      const m = currentDate.getMonth()
      if (today.getFullYear() === y && today.getMonth() === m) {
        const daysCount = new Date(y, m + 1, 0).getDate()
        todayPct = ((today.getDate() - 0.5) / daysCount) * 100
      }
    } else if (viewScale === "Week") {
      const dIdx = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (dIdx >= 0 && dIdx < 7) {
        todayPct = ((dIdx + 0.5) / 7) * 100
      }
    } else if (viewScale === "Day") {
      if (today.toDateString() === currentDate.toDateString()) {
        const now = new Date()
        const curHour = now.getHours() + now.getMinutes() / 60
        const clampedHour = Math.max(8, Math.min(18, curHour))
        todayPct = ((clampedHour - 8) / 10) * 100
      }
    } else if (viewScale === "Year") {
      if (today.getFullYear() === currentDate.getFullYear()) {
        todayPct = ((today.getMonth() + 0.5) / 12) * 100
      }
    }

    return {
      timelineStart: start,
      timelineEnd: end,
      columns: cols,
      todayPositionPercent: todayPct,
    }
  }, [currentDate, viewScale, today])

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const squadName = r.preferred_squad || r.product || "Core"
      if (selectedSquads.length > 0 && !selectedSquads.includes(squadName)) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (!r.title.toLowerCase().includes(q) && !(r.assigned_designer || "").toLowerCase().includes(q)) {
          return false
        }
      }
      return true
    })
  }, [requests, selectedSquads, searchQuery])

  // Group filtered requests
  const groupedTasks = useMemo(() => {
    const groups: Record<string, UXRequest[]> = {}
    filteredRequests.forEach((r) => {
      const gName = r.preferred_squad || r.product || "Core"
      if (!groups[gName]) groups[gName] = []
      groups[gName].push(r)
    })
    return groups
  }, [filteredRequests])

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }))
  }

  const handleToggleSquadFilter = (sq: string) => {
    setSelectedSquads((prev) =>
      prev.includes(sq) ? prev.filter((s) => s !== sq) : [...prev, sq]
    )
  }

  // Calculate sequential timeline blocks strictly mapped to the 6 UX Stages (Phân loại -> Discovery -> User Flow -> UI Design -> Prototype -> Bàn giao)
  const calculateTaskTimelineBlocks = (req: UXRequest, taskIndex: number): TimelinePhaseBlock[] => {
    const deadline = parseDate(req.expected_deadline)
    const isOverdue = deadline.getTime() < today.getTime() && req.status !== "Hoàn thành"

    const totalTimelineMs = timelineEnd.getTime() - timelineStart.getTime()
    const msPerDay = 1000 * 60 * 60 * 24

    const toRatio = (ms: number) => Math.max(0.005, Math.min(0.995, (ms - timelineStart.getTime()) / totalTimelineMs))

    const blocks: TimelinePhaseBlock[] = []
    // Full day of Today: includes all 24 hours of the current day up to midnight
    const nowMs = today.getTime() + msPerDay

    // Determine current active stage index (0 to 5)
    const activeStageIdx = getTaskStageIndex(req)
    const isCompleted = req.status === "Hoàn thành" || req.status === "Hoành thành" || activeStageIdx === 5

    // Total days to distribute across completed & active stages
    const stageCount = activeStageIdx + 1
    const daysPerStage = 2
    const totalDaysSpan = stageCount * daysPerStage
    const startMs = nowMs - totalDaysSpan * msPerDay

    for (let i = 0; i <= activeStageIdx; i++) {
      const stage = UX_STAGES[i]
      const isCurrentActive = i === activeStageIdx && !isCompleted

      const pStartMs = startMs + i * daysPerStage * msPerDay
      const pEndMs = (i === activeStageIdx) ? nowMs : pStartMs + daysPerStage * msPerDay

      const startRatio = toRatio(pStartMs)
      const endRatio = toRatio(pEndMs)
      const widthRatio = Math.max(0.038, endRatio - startRatio)

      const isAlert = isOverdue && isCurrentActive
      const colorClass = isAlert
        ? "bg-rose-100 text-rose-950 border border-rose-300 font-bold shadow-xs"
        : isCurrentActive
        ? `${stage.color} font-bold shadow-2xs`
        : `${stage.color} opacity-90 font-medium`

      blocks.push({
        id: `stg-${req.request_id}-${stage.key}`,
        phaseKey: stage.key,
        phaseName: isAlert ? `Cảnh báo Quá hạn (${stage.fullTitle})` : stage.fullTitle,
        label: stage.label,
        timeBadge: isAlert ? "Overdue" : isCurrentActive ? "Hôm nay" : "Done",
        startRatio,
        widthRatio,
        colorClass,
        icon: isAlert ? "alert" : (i === 5 || !isCurrentActive) ? "check" : undefined,
        startDateStr: new Date(pStartMs).toLocaleDateString("vi-VN"),
        endDateStr: isCurrentActive ? "Hôm nay (Đang thực hiện)" : new Date(pEndMs).toLocaleDateString("vi-VN"),
        slaDays: stage.sla,
        deliverable: stage.deliverable,
      })
    }

    return blocks
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm overflow-hidden flex flex-col font-sans select-none relative">
      {/* =========================================================================
          TOP TOOLBAR (reUI Style: Today | Month ⌵ | < > | Title)
          ========================================================================= */}
      <div className="h-14 px-4 sm:px-6 border-b border-zinc-200/80 bg-white flex items-center justify-between gap-4">
        {/* Left Navigation Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetToday}
            className="text-xs font-semibold text-zinc-800 hover:text-zinc-950 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100/80 transition-colors cursor-pointer"
          >
            Today
          </button>

          {/* Scale Dropdown Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowScaleDropdown(!showScaleDropdown)}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 hover:text-zinc-950 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100/80 transition-colors cursor-pointer"
            >
              <span>{viewScale}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {showScaleDropdown && (
              <div className="absolute left-0 top-full mt-1 w-28 bg-white rounded-xl border border-zinc-200 shadow-lg py-1 z-40 animate-in fade-in-50">
                {(["Day", "Week", "Month", "Year"] as ViewScale[]).map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => {
                      setViewScale(scale)
                      setShowScaleDropdown(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 cursor-pointer ${
                      viewScale === scale ? "text-[#1057FB] font-bold bg-blue-50/50" : "text-zinc-700"
                    }`}
                  >
                    {scale}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Steppers < > */}
          <div className="flex items-center gap-0.5 text-zinc-700">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
              title="Lùi thời gian"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
              title="Tiến thời gian"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Title */}
          <span className="text-sm font-bold text-zinc-900 ml-1">
            {headerTitle}
          </span>
        </div>

        {/* Right Search & Squad Filter Popover */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs bg-zinc-50 hover:bg-white focus:bg-white rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#1057FB] focus:border-[#1057FB] text-zinc-800 placeholder-zinc-400 w-36 sm:w-48 transition-all"
            />
          </div>

          {/* Squad Filter Popover Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSquadFilterPopover(!showSquadFilterPopover)}
              className={`h-8 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedSquads.length > 0
                  ? "bg-blue-50 border-[#1057FB] text-[#1057FB]"
                  : "bg-zinc-50 hover:bg-white border-zinc-200 text-zinc-700"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>
                {selectedSquads.length === 0
                  ? "Tất cả Squads"
                  : `${selectedSquads.length} Squads`}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Squad Filter Popover Modal */}
            {showSquadFilterPopover && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-2xl border border-zinc-200 shadow-xl p-3 z-50 animate-in fade-in-50 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <span className="text-xs font-bold text-zinc-900">Lọc theo Squad</span>
                  {selectedSquads.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSquads([])}
                      className="text-[11px] text-[#1057FB] hover:underline font-semibold cursor-pointer"
                    >
                      Bỏ chọn tất cả
                    </button>
                  )}
                </div>

                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {allSquadOptions.map((sq) => {
                    const isChecked = selectedSquads.includes(sq)
                    const count = requests.filter(
                      (r) => r.preferred_squad === sq || r.product === sq
                    ).length

                    return (
                      <div
                        key={sq}
                        onClick={() => handleToggleSquadFilter(sq)}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                          isChecked ? "bg-blue-50 text-[#1057FB]" : "hover:bg-zinc-50 text-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isChecked
                                ? "bg-[#1057FB] border-[#1057FB] text-white"
                                : "border-zinc-300 bg-white"
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                          <span>{sq}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 font-bold">
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">
                    {filteredRequests.length} tasks hiển thị
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSquadFilterPopover(false)}
                    className="px-2.5 py-1 bg-zinc-900 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-zinc-800"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SPLIT VIEW: EXACT 1-TO-1 ALIGNMENT BETWEEN LEFT TABLE & RIGHT TIMELINE
          ========================================================================= */}
      <div className="flex overflow-x-auto divide-x divide-zinc-200">
        {/* =========================================================================
            LEFT COLUMN (GANTT-1): NAME | STATUS | ASSIGNEE | DUE DATE | +
            ========================================================================= */}
        <div className="w-[480px] sm:w-[520px] shrink-0 bg-white flex flex-col">
          {/* Header Row (Height: 40px) */}
          <div className="h-10 px-4 bg-white border-b border-zinc-200 flex items-center text-xs font-semibold text-zinc-400">
            <div className="flex-1 pl-6">Name</div>
            <div className="w-20 text-center">Assignee</div>
            <div className="w-20 text-left pl-2">Due date</div>
            <div className="w-8 text-center text-zinc-400 hover:text-zinc-600 cursor-pointer font-bold">+</div>
          </div>

          {/* Table Body (Each row exact h-12: 48px) */}
          <div className="divide-y divide-zinc-100 flex-1">
            {Object.entries(groupedTasks).map(([groupName, tasks], gIdx) => {
              const isCollapsed = Boolean(collapsedGroups[groupName])

              return (
                <div key={`left-grp-${groupName}-${gIdx}`} className="flex flex-col">
                  {/* Group Header Row */}
                  <div
                    onClick={() => toggleGroup(groupName)}
                    className="h-12 px-4 bg-white hover:bg-zinc-50/70 border-b border-zinc-100 flex items-center cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                          isCollapsed ? "-rotate-90" : ""
                        }`}
                      />
                      <ListTree className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-xs font-bold text-zinc-900 truncate">
                        {groupName}
                      </span>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-zinc-300 border-t-zinc-700 inline-block shrink-0" />
                    </div>

                    <div className="w-8 flex justify-end text-zinc-300 group-hover:text-zinc-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Task Rows */}
                  {!isCollapsed &&
                    tasks.map((req, rIdx) => {
                      const isOverdue = (() => {
                        if (!req.expected_deadline || req.status === "Hoàn thành") return false
                        const d = parseDate(req.expected_deadline)
                        return d.getTime() < today.getTime()
                      })()

                      const badge = getStatusBadgeConfig(req.status, req.current_phase, isOverdue)
                      const dueDateFormatted = formatDueDate(req.expected_deadline)

                      return (
                        <div
                          key={req.request_id || `left-task-${rIdx}`}
                          onClick={() => onSelectRequest?.(req)}
                          className="h-12 px-4 bg-white hover:bg-zinc-50/80 flex items-center cursor-pointer transition-colors group border-b border-zinc-100/60"
                        >
                          {/* Name Column with dot */}
                          <div className="flex-1 flex items-center gap-2.5 pl-6 min-w-0 pr-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${badge.dot}`} />
                            <span className="text-xs font-medium text-zinc-800 truncate group-hover:text-[#1057FB] transition-colors">
                              {req.title}
                            </span>
                          </div>

                          {/* Assignee Avatar (Single User) */}
                          <div className="w-20 flex justify-center shrink-0">
                            {req.assigned_designer && req.assigned_designer.trim() && req.assigned_designer !== "Chưa phân công" ? (
                              <UserAvatar name={req.assigned_designer} size="xs" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border border-dashed border-zinc-300" title="Chưa phân công" />
                            )}
                          </div>

                          {/* Due Date */}
                          <div className={`w-20 pl-2 text-xs font-medium shrink-0 ${isOverdue ? "text-rose-600 font-bold" : "text-zinc-600"}`}>
                            {dueDateFormatted}
                          </div>

                          {/* Three-dots menu */}
                          <div className="w-8 flex justify-end text-zinc-300 group-hover:text-zinc-600 shrink-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )
            })}
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN (GANTT-2): CALENDAR GRID & SEQUENTIAL 6-STAGE PHASE BLOCKS
            ========================================================================= */}
        <div className="flex-1 min-w-[720px] bg-white flex flex-col overflow-x-auto relative">
          {/* Header Row (Height: 40px) */}
          <div className="h-10 bg-white border-b border-zinc-200 flex sticky top-0 z-20">
            {columns.map((col) => (
              <div
                key={col.id}
                className={`flex-1 min-w-[28px] border-r border-zinc-100 text-[10.5px] flex flex-col items-center justify-center font-mono ${
                  col.isToday
                    ? "bg-rose-50/70 text-rose-600 font-bold"
                    : col.isWeekend
                    ? "bg-zinc-50/70 text-zinc-400"
                    : "text-zinc-600"
                }`}
              >
                <span className="leading-none text-[9px] uppercase font-sans">
                  {col.label}
                </span>
                {col.subLabel && (
                  <span className="leading-tight font-bold mt-0.5">{col.subLabel}</span>
                )}
              </div>
            ))}
          </div>

          {/* Timeline Body Rows with CONTINUOUS RED TODAY LINE */}
          <div className="flex-1 relative divide-y divide-zinc-100 bg-[repeating-linear-gradient(45deg,#fafafa_0,#fafafa_1px,transparent_0,transparent_50%)] bg-[size:12px_12px]">
            {/* CONTINUOUS VERTICAL RED TODAY LINE */}
            {todayPositionPercent !== null && (
              <div
                className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
                style={{ left: `${todayPositionPercent}%`, transform: "translateX(-50%)" }}
              >
                <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm -mt-3.5 z-40 whitespace-nowrap">
                  Today
                </span>
                <div className="w-[2px] bg-rose-500 flex-1 shadow-sm" />
              </div>
            )}

            {Object.entries(groupedTasks).map(([groupName, tasks], gIdx) => {
              const isCollapsed = Boolean(collapsedGroups[groupName])

              return (
                <React.Fragment key={`right-grp-${groupName}-${gIdx}`}>
                  {/* Group Spacer Row (h-12) */}
                  <div className="h-12 bg-zinc-50/40 border-b border-zinc-100 relative">
                    <div className="absolute inset-0 flex pointer-events-none">
                      {columns.map((col) => (
                        <div key={`gcol-bg-${col.id}`} className="flex-1 min-w-[28px] border-r border-zinc-100/60" />
                      ))}
                    </div>
                  </div>

                  {/* Task Timeline Rows (h-12) */}
                  {!isCollapsed &&
                    tasks.map((req, rIdx) => {
                      const blocks = calculateTaskTimelineBlocks(req, rIdx)

                      return (
                        <div
                          key={`right-row-${gIdx}-${rIdx}`}
                          className="h-12 relative flex items-center hover:bg-zinc-50/40 transition-colors border-b border-zinc-100/60"
                        >
                          {/* Background Grid Lines & Weekend Shading */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {columns.map((col) => (
                              <div
                                key={`tcol-bg-${col.id}`}
                                className={`flex-1 min-w-[28px] border-r border-zinc-200/50 ${
                                  col.isWeekend ? "bg-zinc-50/60" : ""
                                } ${col.isToday ? "bg-rose-50/20" : ""}`}
                              />
                            ))}
                          </div>

                          {/* Multi-Status Phase Blocks with SMOOTH CURSOR-TRACKING TOOLTIP */}
                          {blocks.map((block) => {
                            const leftPct = block.startRatio * 100
                            const widthPct = block.widthRatio * 100

                            return (
                              <div
                                key={block.id}
                                onClick={() => onSelectRequest?.(req)}
                                onMouseEnter={(e) => {
                                  setHoveredTooltip({
                                    block,
                                    request: req,
                                    clientX: e.clientX,
                                    clientY: e.clientY,
                                  })
                                }}
                                onMouseMove={(e) => {
                                  setHoveredTooltip({
                                    block,
                                    request: req,
                                    clientX: e.clientX,
                                    clientY: e.clientY,
                                  })
                                }}
                                onMouseLeave={() => setHoveredTooltip(null)}
                                style={{
                                  left: `${leftPct}%`,
                                  width: `${Math.max(5.2, widthPct)}%`,
                                }}
                                className={`absolute h-7.5 rounded-lg ${block.colorClass} flex items-center justify-center px-2 text-[11.5px] font-semibold shadow-2xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group z-10`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  {block.icon === "lock" && <Lock className="w-3 h-3 shrink-0 opacity-75" />}
                                  {block.icon === "check" && <CheckCircle2 className="w-3 h-3 shrink-0 opacity-75" />}
                                  {block.icon === "alert" && <AlertTriangle className="w-3 h-3 shrink-0 opacity-75" />}
                                  <span className="truncate drop-shadow-2xs">{block.label}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                </React.Fragment>
              )
            })}
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
            className="w-72 bg-zinc-900/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl z-50 pointer-events-none border border-zinc-700/80 space-y-2.5 will-change-transform"
          >
            {/* Tooltip Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-mono font-bold">
                {hoveredTooltip.request.preferred_squad || hoveredTooltip.request.product || "MBBank"}
              </span>
              <span className="text-[11px] font-bold text-amber-400">
                {hoveredTooltip.block.phaseName}
              </span>
            </div>

            {/* Full Task Title */}
            <p className="text-xs font-bold text-white leading-snug">
              {hoveredTooltip.request.title}
            </p>

            {/* Details Grid */}
            <div className="space-y-1.5 text-[11px] text-zinc-300">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Phụ trách:</span>
                <span className="font-semibold text-white">
                  {hoveredTooltip.request.assigned_designer || "Chưa gán"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Hạn bàn giao:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {hoveredTooltip.request.expected_deadline || "Chưa hạn"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Thời gian xử lý:</span>
                <span className="font-mono text-white font-medium">
                  {hoveredTooltip.block.slaDays} ngày làm việc
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Tiến độ khâu:</span>
                <span className="font-mono text-white font-bold">
                  {hoveredTooltip.request.progress || 0}%
                </span>
              </div>

              <div className="pt-1.5 border-t border-zinc-800/80 text-[10.5px] text-zinc-400">
                📎 Bàn giao: <span className="text-zinc-300">{hoveredTooltip.block.deliverable}</span>
              </div>
            </div>

            {/* Hint */}
            <div className="pt-1 text-[10px] text-zinc-500 font-medium text-center">
              💡 Click để mở chi tiết đề bài & cập nhật tiến độ
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          FOOTER LEGEND (6 Official UX Stages from Dropdown Menu)
          ========================================================================= */}
      <div className="px-4 py-3 bg-zinc-50/80 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-zinc-700">Khâu UX (Status):</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 1. Phân loại</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> 2. Discovery</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> 3. User Flow</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> 4. UI Design</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> 5. Prototype</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 6. Bàn giao</span>
        </div>

        <div className="text-[11.5px] text-zinc-400 font-medium">
          💡 Rê chuột vào thanh để xem Tooltip • Click để mở chi tiết đề bài
        </div>
      </div>
    </div>
  )
}
