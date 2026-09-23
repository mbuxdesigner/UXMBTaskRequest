import React, { useState, useEffect, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Frame } from "@/components/reui/frame"
import { Badge, PriorityBadge, StatusPill } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tooltip } from "@/components/ui/tooltip"
import { Kbd } from "@/components/ui/kbd"
import { toast } from "@/components/ui/toast"
import { UserAvatar } from "@/components/common/UserAvatar"
import {
  CalendarItem,
  CalendarLayer,
  loadAllCalendarItems,
  updateTaskDeadlineWithLog,
  updateTaskPlannedDate,
  calculateTeamWorkload,
  getLeavesFreshnessInfo,
  getTaskEffort,
  assessTaskRisk,
  type TaskRiskLevel,
  type DesignerWorkload,
  addTeamEvent,
  updateTeamEvent,
  deleteTeamEvent,
  normalizeDateToYMD,
  getLocalUXRequests,
  computeCalendarWeeks,
} from "@/services/calendarService"
import { fetchTeamLeaves, TeamLeaveRecord } from "@/services/leaveService"
import {
  getSystemConfig,
  CalendarConfig,
  EventCategoryConfig,
  TeamEvent,
  CalendarViewMode,
  DEFAULT_CALENDAR_CONFIG,
  SYSTEM_CONFIG_EVENT_NAME,
} from "@/config/systemConfig"
import { getStoredSession, UserSession } from "@/services/otpAuthService"
import { UXRequest } from "@/data/mockData"
import {
  springs,
  durations,
  tactileProps,
  cascadeWaveContainerVariants,
  cascadeWaveItemVariants,
} from "@/lib/motion"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Sliders,
  SlidersHorizontal,
  X,
  Edit3,
  Sun,
  Droplet,
  Sparkles,
  ChevronsLeft,
  ChevronsRight,
  Flag,
  Users,
  CheckCircle2,
  CircleDot,
  Palmtree,
  CalendarDays,
  Headphones,
  Check,
  ChevronDown,
  Clock,
  LayoutGrid,
  Columns3,
  ListFilter,
  CalendarRange,
  RefreshCw,
  AlertTriangle,
  Layers,
  Package,
  Flame,
  Inbox,
  Briefcase,
} from "lucide-react"

const VIEW_MODES = [
  { id: "month", label: "Tháng", icon: LayoutGrid },
  { id: "week", label: "Tuần", icon: Columns3 },
  { id: "day", label: "Ngày", icon: ListFilter },
  { id: "agenda", label: "Lịch trình", icon: CalendarRange },
] as const

export default function CalendarPage() {
  const [session, setSession] = useState<UserSession | null>(getStoredSession())
  const [calendarConfig, setCalendarConfig] = useState<CalendarConfig>(() => {
    return getSystemConfig().calendar || DEFAULT_CALENDAR_CONFIG
  })

  // Dữ liệu tổng hợp từ service
  const [items, setItems] = useState<CalendarItem[]>([])
  const [leaves, setLeaves] = useState<TeamLeaveRecord[]>([])
  const [todayLeaves, setTodayLeaves] = useState<TeamLeaveRecord[]>([])
  const [categories, setCategories] = useState<EventCategoryConfig[]>([])
  const [rawRequests, setRawRequests] = useState<UXRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Mốc thời gian đang xem (Tháng/Năm)
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<CalendarViewMode>(calendarConfig.defaultView || "month")
  const [showLeftSidebar, setShowLeftSidebar] = useState(!calendarConfig.hideSidebarByDefault)
  const [showWeekends, setShowWeekends] = useState<boolean>(calendarConfig.showWeekends ?? false)
  const [hoveredMode, setHoveredMode] = useState<string | null>(null)

  // Bộ lọc
  const [selectedDesigner, setSelectedDesigner] = useState<string>("all")
  const [meetWithSearch, setMeetWithSearch] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // ClickUp Command Palette Modal state
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandSearch, setCommandSearch] = useState("")
  const commandInputRef = useRef<HTMLInputElement | null>(null)

  // Modal xem tất cả nhân sự nghỉ hôm nay (Vertex Studio · Today -> All)
  const [showAllLeavesModal, setShowAllLeavesModal] = useState(false)

  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState<{ id: string; req: UXRequest } | null>(null)
  const [hoveredDateYMD, setHoveredDateYMD] = useState<string | null>(null)

  // Modal Thêm / Sửa sự kiện
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TeamEvent | null>(null)
  const [eventForm, setEventForm] = useState<{
    title: string
    categoryId: string
    startDate: string
    endDate: string
    allDay: boolean
    attendees: string
    location: string
    description: string
  }>({
    title: "",
    categoryId: "cat-review",
    startDate: new Date().toISOString().split("T")[0] + "T09:00",
    endDate: new Date().toISOString().split("T")[0] + "T10:30",
    allDay: false,
    attendees: "",
    location: "",
    description: "",
  })

  // Popover Sửa Nhanh Deadline cho Task
  const [deadlineModalTask, setDeadlineModalTask] = useState<UXRequest | null>(null)
  const [newDeadlineVal, setNewDeadlineVal] = useState<string>("")
  const [deadlineReasonType, setDeadlineReasonType] = useState<string>("scope_change")
  const [customDeadlineReason, setCustomDeadlineReason] = useState<string>("")

  // Chi tiết Item khi Click
  const [detailItem, setDetailItem] = useState<CalendarItem | null>(null)

  // Chế độ xem kép: Delivery (Hạn chót/Cam kết) vs Capacity (Năng lực/Tải nhân sự)
  const [activeWorkspaceView, setActiveWorkspaceView] = useState<"delivery" | "capacity">("delivery")
  const [freshnessInfo, setFreshnessInfo] = useState(getLeavesFreshnessInfo())
  const [isSyncingLeaves, setIsSyncingLeaves] = useState(false)

  // Tải dữ liệu lịch
  const reloadData = async () => {
    setLoading(true)
    try {
      const data = await loadAllCalendarItems()
      setItems(data.items)
      setLeaves(data.leaves)
      setTodayLeaves(data.todayLeaves)
      setCategories(data.categories)
      setRawRequests(getLocalUXRequests())
      setFreshnessInfo(getLeavesFreshnessInfo())
    } catch (err) {
      console.error("[CalendarPage] Load items error:", err)
      toast.error("Không thể tải toàn bộ dữ liệu lịch!")
    } finally {
      setLoading(false)
    }
  }

  // Quét cưỡng bức đồng bộ lịch nghỉ phép từ Google Sheets
  const handleForceSyncLeaves = async () => {
    setIsSyncingLeaves(true)
    try {
      await fetchTeamLeaves(true)
      toast.success("Đã đồng bộ lại dữ liệu Lịch nghỉ phép từ Google Sheets!")
      await reloadData()
      setFreshnessInfo(getLeavesFreshnessInfo())
    } catch (err) {
      toast.error("Lỗi đồng bộ lịch nghỉ phép")
    } finally {
      setIsSyncingLeaves(false)
    }
  }

  useEffect(() => {
    reloadData()

    const handleTaskChange = () => reloadData()
    const handleConfigChange = () => {
      const cfg = getSystemConfig().calendar || DEFAULT_CALENDAR_CONFIG
      setCalendarConfig(cfg)
      if (typeof cfg.showWeekends === "boolean") {
        setShowWeekends(cfg.showWeekends)
      }
      reloadData()
    }

    window.addEventListener("ux_portal_tasks_changed", handleTaskChange)
    window.addEventListener(SYSTEM_CONFIG_EVENT_NAME, handleConfigChange)

    return () => {
      window.removeEventListener("ux_portal_tasks_changed", handleTaskChange)
      window.removeEventListener(SYSTEM_CONFIG_EVENT_NAME, handleConfigChange)
    }
  }, [])

  // Phím tắt Ctrl+K để mở ClickUp Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setShowCommandPalette((prev) => !prev)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault()
        setShowLeftSidebar((prev) => !prev)
      }
      if (e.key === "Escape") {
        setShowCommandPalette(false)
        setDeadlineModalTask(null)
        setDetailItem(null)
        setShowEventModal(false)
        setShowAllLeavesModal(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (showCommandPalette && commandInputRef.current) {
      setTimeout(() => commandInputRef.current?.focus(), 50)
    }
  }, [showCommandPalette])

  // Phân quyền
  const userRole = session?.role || "Designer"
  const canManageEvents = calendarConfig.rolePermissions?.manageEvents?.includes(userRole) ?? true
  const canModifyDeadlines = calendarConfig.rolePermissions?.modifyDeadlines?.includes(userRole) ?? true

  // Danh sách Designers để lọc
  const allDesigners = useMemo(() => {
    const set = new Set<string>()
    items.forEach((it) => {
      if (it.assigneeName && it.assigneeName !== "Chưa phân công") {
        set.add(it.assigneeName)
      }
    })
    return Array.from(set).sort()
  }, [items])

  // Danh sách Task: Assigned to me, Priorities
  const assignedToMeTasks = useMemo(() => {
    const myName = session?.displayName || ""
    const myEmail = session?.personalEmail || ""
    return rawRequests.filter((r) => {
      if (!myName && !myEmail) return true
      const designer = r.assigned_designer || ""
      return (
        designer.toLowerCase().includes(myName.toLowerCase()) ||
        (r.requester_email && r.requester_email.toLowerCase() === myEmail.toLowerCase())
      )
    })
  }, [rawRequests, session])

  const priorityTasks = useMemo(() => {
    return rawRequests.filter((r) => r.priority === "lv1" || r.priority === "lv2")
  }, [rawRequests])

  // 1. Phân loại Rủi ro theo Risk Engine: At Risk, Overdue
  const { atRiskTasks, overdueTasks } = useMemo(() => {
    const atRisk: Array<{ req: UXRequest; risk: ReturnType<typeof assessTaskRisk> }> = []
    const overdue: UXRequest[] = []

    rawRequests.forEach((req) => {
      if (req.status === "Hoàn thành") return
      const risk = assessTaskRisk(req, leaves)
      if (risk.riskLevel === "at_risk") {
        atRisk.push({ req, risk })
      } else if (risk.riskLevel === "overdue") {
        overdue.push(req)
      }
    })

    return { atRiskTasks: atRisk, overdueTasks: overdue }
  }, [rawRequests, leaves])

  // 2. Tính toán Năng lực và Khối lượng công việc tuần của từng Designer
  const teamWorkload = useMemo(() => {
    return calculateTeamWorkload(rawRequests, leaves, currentDate)
  }, [rawRequests, leaves, currentDate])

  const overloadedDesigners = useMemo(() => {
    return teamWorkload.filter((w) => w.isOverloaded)
  }, [teamWorkload])

  // 3. Đề bài chưa lên lịch (Unscheduled Work)
  const unscheduledTasks = useMemo(() => {
    return rawRequests.filter((r) => {
      if (r.status === "Hoàn thành") return false
      const hasDeadline = Boolean(r.expected_deadline || r.design_deadline)
      const hasPlanned = Boolean((r as any).planned_work_date)
      const hasDesigner = Boolean(r.assigned_designer && r.assigned_designer !== "Chưa phân công")
      return !hasDeadline || !hasPlanned || !hasDesigner || r.status === "Chờ tiếp nhận"
    })
  }, [rawRequests])

  // 4. Lịch nghỉ phép và Tác động đến các bài toán đang chạy
  const leaveImpactList = useMemo(() => {
    return todayLeaves.map((leave) => {
      const affected = rawRequests.filter(
        (r) =>
          r.status !== "Hoàn thành" &&
          r.assigned_designer?.toLowerCase().includes(leave.fullName.toLowerCase())
      )
      return {
        leave,
        affectedTasks: affected,
      }
    })
  }, [todayLeaves, rawRequests])

  // Lọc items theo designer và search query
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (selectedDesigner !== "all") {
        if (!it.assigneeName?.toLowerCase().includes(selectedDesigner.toLowerCase())) {
          return false
        }
      }
      if (meetWithSearch.trim()) {
        const q = meetWithSearch.trim().toLowerCase()
        if (!it.assigneeName?.toLowerCase().includes(q)) {
          return false
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const matchTitle = it.title.toLowerCase().includes(q)
        const matchAssignee = it.assigneeName?.toLowerCase().includes(q)
        const matchProduct = it.productName?.toLowerCase().includes(q)
        if (!matchTitle && !matchAssignee && !matchProduct) return false
      }
      return true
    })
  }, [items, selectedDesigner, meetWithSearch, searchQuery])

  // Up next tasks cho Command Palette ClickUp
  const upNextTasks = useMemo(() => {
    const todayYMD = normalizeDateToYMD(new Date())
    return items
      .filter((it) => it.layer === 1 && it.date >= todayYMD)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
  }, [items])

  // Điều hướng thời gian
  const handlePrev = () => {
    const next = new Date(currentDate)
    if (viewMode === "month") next.setMonth(next.getMonth() - 1)
    else if (viewMode === "week") next.setDate(next.getDate() - 7)
    else if (viewMode === "day") next.setDate(next.getDate() - 1)
    setCurrentDate(next)
  }

  const handleNext = () => {
    const next = new Date(currentDate)
    if (viewMode === "month") next.setMonth(next.getMonth() + 1)
    else if (viewMode === "week") next.setDate(next.getDate() + 7)
    else if (viewMode === "day") next.setDate(next.getDate() + 1)
    setCurrentDate(next)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Tiêu đề tháng năm: "Tháng 9, 2026" / "September 2026"
  const clickUpMonthYearTitle = useMemo(() => {
    const monthNamesEn = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    return `Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()} (${monthNamesEn[currentDate.getMonth()]})`
  }, [currentDate])

  // Tính các tuần và ngày chuẩn ClickUp (5 cột khi showWeekends = false, 7 cột khi true)
  const calendarWeeks = useMemo(() => {
    return computeCalendarWeeks(currentDate, showWeekends)
  }, [currentDate, showWeekends])

  // Danh sách các cột thứ
  const columnHeaders = useMemo(() => {
    return showWeekends
      ? [
          { key: "mon", label: "Thứ 2", sub: "Mon" },
          { key: "tue", label: "Thứ 3", sub: "Tue" },
          { key: "wed", label: "Thứ 4", sub: "Wed" },
          { key: "thu", label: "Thứ 5", sub: "Thu" },
          { key: "fri", label: "Thứ 6", sub: "Fri" },
          { key: "sat", label: "Thứ 7", sub: "Sat" },
          { key: "sun", label: "Chủ nhật", sub: "Sun" },
        ]
      : [
          { key: "mon", label: "Thứ 2", sub: "Mon" },
          { key: "tue", label: "Thứ 3", sub: "Tue" },
          { key: "wed", label: "Thứ 4", sub: "Wed" },
          { key: "thu", label: "Thứ 5", sub: "Thu" },
          { key: "fri", label: "Thứ 6", sub: "Fri" },
        ]
  }, [showWeekends])

  // Kéo thả dời hạn Deadline từ List hoặc từ ô ngày sang ô ngày khác
  const handleDragStartTask = (e: React.DragEvent, req: UXRequest) => {
    if (!canModifyDeadlines) {
      e.preventDefault()
      return
    }
    setDraggedItem({ id: req.request_id, req })
    e.dataTransfer.setData("text/plain", req.request_id)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDropOnDate = (targetDateYMD: string, targetDesigner?: string) => {
    if (!draggedItem) return
    const req = draggedItem.req
    const currentPlanned = normalizeDateToYMD(
      (req as any).planned_work_date || req.expected_deadline || req.design_deadline
    )
    if (currentPlanned === targetDateYMD && (!targetDesigner || targetDesigner === req.assigned_designer)) {
      setDraggedItem(null)
      setHoveredDateYMD(null)
      return
    }

    // 1. Cập nhật ngày thực hiện dự kiến (Planned Work Date)
    const res = updateTaskPlannedDate(req.request_id, targetDateYMD)
    if (res.success) {
      // 2. Nếu kéo vào dòng của designer khác trên Capacity Board, cập nhật người phụ trách
      if (targetDesigner && targetDesigner !== req.assigned_designer) {
        const all = getLocalUXRequests()
        const idx = all.findIndex((r) => r.request_id === req.request_id)
        if (idx !== -1) {
          all[idx].assigned_designer = targetDesigner
          localStorage.setItem("ux_portal_real_requests", JSON.stringify(all))
          window.dispatchEvent(new Event("storage"))
        }
      }

      toast.success(
        `Đã xếp lịch làm việc cho [${req.title}] vào ngày ${targetDateYMD}!${
          targetDesigner ? ` (Gán cho ${targetDesigner})` : ""
        }`
      )
      reloadData()
    } else {
      toast.error(res.error || "Không thể xếp lịch làm việc")
    }
    setDraggedItem(null)
    setHoveredDateYMD(null)
  }

  // Xử lý tạo / sửa sự kiện team
  const handleOpenAddEvent = (initialDateYMD?: string) => {
    const start = initialDateYMD ? `${initialDateYMD}T09:00` : new Date().toISOString().split("T")[0] + "T09:00"
    const end = initialDateYMD ? `${initialDateYMD}T10:30` : new Date().toISOString().split("T")[0] + "T10:30"
    setEditingEvent(null)
    setEventForm({
      title: "",
      categoryId: categories[0]?.id || "cat-review",
      startDate: start,
      endDate: end,
      allDay: false,
      attendees: session?.personalEmail || "",
      location: "Phòng họp Hội sở / Teams",
      description: "",
    })
    setShowEventModal(true)
  }

  const handleOpenEditEvent = (ev: TeamEvent) => {
    setEditingEvent(ev)
    setEventForm({
      title: ev.title,
      categoryId: ev.categoryId,
      startDate: ev.startDate,
      endDate: ev.endDate,
      allDay: ev.allDay,
      attendees: ev.attendees?.join(", ") || "",
      location: ev.location || "",
      description: ev.description || "",
    })
    setShowEventModal(true)
  }

  const handleSaveEvent = () => {
    if (!eventForm.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề sự kiện!")
      return
    }

    const attendeesList = eventForm.attendees
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    if (editingEvent) {
      const updated: TeamEvent = {
        ...editingEvent,
        title: eventForm.title.trim(),
        categoryId: eventForm.categoryId,
        startDate: eventForm.startDate,
        endDate: eventForm.endDate,
        allDay: eventForm.allDay,
        attendees: attendeesList,
        location: eventForm.location.trim(),
        description: eventForm.description.trim(),
      }
      const ok = updateTeamEvent(updated, session)
      if (ok) {
        toast.success("Đã cập nhật sự kiện team!")
        setShowEventModal(false)
        reloadData()
      } else {
        toast.error("Không thể cập nhật sự kiện!")
      }
    } else {
      addTeamEvent(
        {
          title: eventForm.title.trim(),
          categoryId: eventForm.categoryId,
          startDate: eventForm.startDate,
          endDate: eventForm.endDate,
          allDay: eventForm.allDay,
          attendees: attendeesList,
          location: eventForm.location.trim(),
          description: eventForm.description.trim(),
        },
        session
      )
      toast.success("Đã tạo sự kiện team mới!")
      setShowEventModal(false)
      reloadData()
    }
  }

  const handleDeleteEvent = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa sự kiện này?")) {
      deleteTeamEvent(id)
      toast.success("Đã xóa sự kiện team!")
      setShowEventModal(false)
      reloadData()
    }
  }

  // Mở modal thay đổi hạn cam kết (Committed Deadline)
  const handleOpenDeadlineModal = (task: UXRequest) => {
    setDeadlineModalTask(task)
    setNewDeadlineVal(
      normalizeDateToYMD(task.expected_deadline || task.design_deadline) || normalizeDateToYMD(new Date())
    )
    setDeadlineReasonType("scope_change")
    setCustomDeadlineReason("")
  }

  const handleConfirmChangeDeadline = () => {
    if (!deadlineModalTask || !newDeadlineVal) return

    const reasonLabelMap: Record<string, string> = {
      scope_change: "Phạm vi đề bài thay đổi (Scope creep)",
      waiting_dependency: "Chờ tài liệu / API / Phụ thuộc bên thứ 3",
      leave_absence: "Nhân sự vắng mặt / Nghỉ ốm đột xuất",
      release_change: "Điều chỉnh kế hoạch phát hành Sprint",
      other: customDeadlineReason.trim() || "Điều chỉnh kế hoạch nghiệp vụ",
    }
    const baseReason = reasonLabelMap[deadlineReasonType] || "Điều chỉnh kế hoạch nghiệp vụ"
    const finalReason =
      deadlineReasonType === "other"
        ? customDeadlineReason.trim()
        : customDeadlineReason.trim()
        ? `${baseReason}: ${customDeadlineReason.trim()}`
        : baseReason

    if (!finalReason.trim()) {
      toast.error("Vui lòng chọn hoặc nhập lý do dời hạn cam kết!")
      return
    }

    const res = updateTaskDeadlineWithLog(
      deadlineModalTask.request_id,
      newDeadlineVal,
      session,
      finalReason
    )
    if (res.success) {
      toast.success(
        `Đã dời hạn cam kết sang ngày ${newDeadlineVal}! Đã tự động lưu vào Activity Log.`
      )
      setDeadlineModalTask(null)
      reloadData()
    } else {
      toast.error(res.error || "Lỗi cập nhật deadline")
    }
  }

  return (
    <div className="relative h-full w-full bg-[#FCFCFD] flex flex-col font-sans select-none overflow-hidden">
      {/* ========================================================================= */}
      {/* WORKSPACE LAYOUT: SIDEBAR TRÁI + LỊCH LỚN TRUNG TÂM                        */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* ----------------------------------------------------------------------- */}
        {/* CỘT TRÁI: PLANNER SIDEBAR CHUẨN DESIGN SYSTEM                           */}
        {/* ----------------------------------------------------------------------- */}
        <AnimatePresence initial={false}>
          {showLeftSidebar && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 285, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: durations.fast, ease: "easeInOut" }}
              className="w-[285px] shrink-0 border-r border-slate-200/80 bg-slate-50/70 flex flex-col h-full overflow-hidden z-20"
            >
              {/* Sidebar Header */}
              <div className="p-3.5 pb-3 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    <CalendarDays className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-bold text-slate-900 tracking-tight">UX Planner</span>
                </div>

                <div className="flex items-center gap-1">
                  <Tooltip content="Tìm kiếm nhanh" shortcut="Ctrl+K">
                    <Button
                      type="button"
                      variant="ghost"
                      size="iconSm"
                      onClick={() => setShowCommandPalette(true)}
                      className="text-slate-500 hover:text-slate-900"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </Button>
                  </Tooltip>

                  <Tooltip content="Thu gọn Sidebar" shortcut="⌘ \">
                    <Button
                      type="button"
                      variant="ghost"
                      size="iconSm"
                      onClick={() => setShowLeftSidebar(false)}
                      className="text-slate-500 hover:text-slate-900"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </Button>
                  </Tooltip>

                  {canManageEvents && (
                    <Tooltip content="Tạo sự kiện mới">
                      <Button
                        type="button"
                        variant="ghost"
                        size="iconSm"
                        onClick={() => handleOpenAddEvent()}
                        className="text-slate-500 hover:text-slate-900"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Sidebar Content Sections: Action & Triage Hub */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs no-scrollbar">
                {/* KHỐI 1: CẦN CAN THIỆP GẤP (NEEDS ATTENTION) */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-bold text-slate-900 text-xs tracking-tight">
                        Cần can thiệp gấp
                      </span>
                    </div>
                    {(atRiskTasks.length > 0 || overdueTasks.length > 0 || overloadedDesigners.length > 0) ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                        {atRiskTasks.length + overdueTasks.length + overloadedDesigners.length}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                        Tối ưu ✨
                      </span>
                    )}
                  </div>

                  {atRiskTasks.length === 0 && overdueTasks.length === 0 && overloadedDesigners.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic py-1">
                      Không có đề bài nguy cơ hoặc nhân sự quá tải 👍
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
                      {/* Danh sách Designer quá tải */}
                      {overloadedDesigners.map((w) => (
                        <div
                          key={`overload-${w.name}`}
                          className="p-2 rounded-xl bg-red-50/80 border border-red-200/80 text-[11px] space-y-1"
                        >
                          <div className="flex items-center justify-between font-bold text-red-900">
                            <span className="truncate">🔥 {w.name} quá tải</span>
                            <span className="font-mono text-red-700">{w.utilizationPercent}%</span>
                          </div>
                          <div className="text-[10px] text-red-700 leading-tight">
                            Gánh {w.assignedHours}h / Khả dụng {w.availableHours}h
                          </div>
                        </div>
                      ))}

                      {/* Danh sách Task At-Risk */}
                      {atRiskTasks.map(({ req, risk }) => (
                        <div
                          key={`risk-${req.request_id}`}
                          onClick={() => handleOpenDeadlineModal(req)}
                          className="p-2 rounded-xl bg-amber-50/90 border border-amber-200/90 hover:border-amber-300 transition-colors cursor-pointer text-[11px] space-y-1"
                        >
                          <div className="flex items-center justify-between font-bold text-amber-950">
                            <span className="truncate">{req.title}</span>
                            <span className="text-[10px] font-mono text-amber-800 shrink-0 ml-1">
                              {req.expected_deadline?.substring(5)}
                            </span>
                          </div>
                          <div className="text-[10px] text-amber-800 leading-tight font-medium">
                            ⚠️ {risk.riskReason}
                          </div>
                        </div>
                      ))}

                      {/* Danh sách Task Quá Hạn */}
                      {overdueTasks.map((req) => (
                        <div
                          key={`overdue-${req.request_id}`}
                          onClick={() => handleOpenDeadlineModal(req)}
                          className="p-2 rounded-xl bg-red-50/70 border border-red-200 hover:border-red-300 transition-colors cursor-pointer text-[11px] flex items-center justify-between gap-1"
                        >
                          <span className="truncate font-semibold text-red-950">🔴 {req.title}</span>
                          <span className="text-[10px] font-mono text-red-700 font-bold shrink-0">
                            Quá hạn
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* KHỐI 2: ĐỀ BÀI CHƯA LÊN LỊCH (UNSCHEDULED WORK) */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Inbox className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-bold text-slate-900 text-xs tracking-tight">
                        Chờ xếp lịch (Unscheduled)
                      </span>
                    </div>
                    <Badge variant="secondary" size="xs">
                      {unscheduledTasks.length}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Kéo thả vào ô ngày hoặc hàng của Designer để phân bổ
                  </p>

                  <div className="space-y-1.5 max-h-[190px] overflow-y-auto no-scrollbar pt-1">
                    {unscheduledTasks.length === 0 ? (
                      <div className="text-center py-2 text-slate-400 text-[11px] italic">
                        Đã lên lịch toàn bộ đề bài! ✨
                      </div>
                    ) : (
                      unscheduledTasks.slice(0, 6).map((req) => (
                        <motion.div
                          key={`unsched-${req.request_id}`}
                          {...tactileProps.card}
                          draggable={canModifyDeadlines}
                          onDragStart={(e) => handleDragStartTask(e as any, req)}
                          onClick={() => handleOpenDeadlineModal(req)}
                          className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-300 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-colors group"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <CircleDot className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="truncate text-slate-800 font-medium text-[11px]">
                              {req.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">
                            {getTaskEffort(req)}h
                          </span>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* KHỐI 3: LỊCH VẮNG MẶT & TÁC ĐỘNG (LEAVE IMPACT) */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Palmtree className="w-3.5 h-3.5 text-pink-600" />
                      <span className="font-bold text-slate-900 text-xs tracking-tight">
                        Nghỉ phép hôm nay
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setShowAllLeavesModal(true)}
                      className="text-pink-600 hover:text-pink-700 h-6 px-1.5"
                    >
                      Chi tiết ({todayLeaves.length})
                    </Button>
                  </div>

                  {todayLeaves.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic">
                      Toàn bộ nhân sự đi làm đầy đủ ✨
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                      {leaveImpactList.map(({ leave, affectedTasks }) => (
                        <div
                          key={`leave-impact-${leave.id}`}
                          className="p-1.5 rounded-xl border border-pink-100 bg-pink-50/50 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <UserAvatar
                              name={leave.fullName}
                              avatarUrl={leave.avatarUrl}
                              size="xs"
                              className="border border-pink-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-[11px] text-slate-900 truncate">
                                {leave.fullName}
                              </div>
                              <div className="text-[10px] text-pink-700 truncate">
                                {leave.shift || "Nghỉ cả ngày"}
                              </div>
                            </div>
                          </div>
                          {affectedTasks.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[9px] shrink-0">
                              {affectedTasks.length} task
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* BỘ LỌC NHÂN SỰ GỌN GÀNG */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Lọc theo nhân sự
                  </div>
                  <div className="relative">
                    <Users className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Tìm theo tên hoặc email.."
                      value={meetWithSearch}
                      onChange={(e) => setMeetWithSearch(e.target.value)}
                      className="h-8 pl-8 pr-2.5 text-xs bg-white"
                    />
                    {meetWithSearch && (
                      <button
                        type="button"
                        onClick={() => setMeetWithSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ----------------------------------------------------------------------- */}
        {/* KHU VỰC TRUNG TÂM: LỊCH LỚN CHUẨN REUI & CLICKUP PLANNER               */}
        {/* ----------------------------------------------------------------------- */}
        <div className="flex-1 min-w-0 flex flex-col bg-white overflow-hidden">
          {/* Top Navigation Toolbar */}
          <div className="p-3 px-4 flex items-center justify-between border-b border-slate-200/80 bg-white flex-wrap gap-2.5">
            {/* Left: Sidebar Toggle + Month Title + Navigation Controls */}
            <div className="flex items-center gap-2">
              {!showLeftSidebar && (
                <Tooltip content="Mở thanh bên" shortcut="⌘ \">
                  <Button
                    type="button"
                    variant="outline"
                    size="iconSm"
                    onClick={() => setShowLeftSidebar(true)}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </Tooltip>
              )}

              <div className="flex items-center gap-1">
                <Tooltip content="Kỳ trước" shortcut="←">
                  <Button
                    type="button"
                    variant="outline"
                    size="iconSm"
                    onClick={handlePrev}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </Tooltip>

                <Tooltip content="Kỳ sau" shortcut="→">
                  <Button
                    type="button"
                    variant="outline"
                    size="iconSm"
                    onClick={handleNext}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Tooltip>
              </div>

              <span className="text-base sm:text-lg font-bold text-slate-900 ml-1.5 tracking-tight">
                {clickUpMonthYearTitle}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="ml-2 font-semibold"
              >
                Hôm nay
              </Button>

              {/* DUAL-VIEW SWITCHER: DELIVERY VS CAPACITY */}
              <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/90 text-xs font-semibold ml-2">
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceView("delivery")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeWorkspaceView === "delivery"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  <span>📦 Delivery</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceView("capacity")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeWorkspaceView === "capacity"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>👥 Capacity & Workload</span>
                  {overloadedDesigners.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            {/* Right: Integrated Search + Freshness + Mode Switchers */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* HEADER SEARCH BAR (Chuẩn SaaS Desktop) */}
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Tìm đề bài, designer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-14 text-xs w-[200px] lg:w-[240px] bg-slate-50 border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setShowCommandPalette(true)}
                  className="absolute right-1.5 flex items-center gap-0.5 p-1 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
                  title="Mở Command Palette (Ctrl+K)"
                >
                  <Kbd size="xs">Ctrl</Kbd>
                  <Kbd size="xs">K</Kbd>
                </button>
              </div>

              {/* ĐỘ TƯƠI DỮ LIỆU NGHỈ PHÉP (FRESHNESS BADGE) */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    freshnessInfo.isFresh ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <span className="text-slate-600 font-medium">Lịch nghỉ: {freshnessInfo.text}</span>
                <Tooltip content="Quét đồng bộ lại lịch nghỉ từ Google Sheets">
                  <button
                    type="button"
                    onClick={handleForceSyncLeaves}
                    disabled={isSyncingLeaves}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncingLeaves ? "animate-spin text-blue-600" : ""}`} />
                  </button>
                </Tooltip>
              </div>

              {/* View Modes chỉ hiển thị khi ở Delivery View */}
              {activeWorkspaceView === "delivery" && (
                <>
                  <div
                    role="tablist"
                    aria-label="Chế độ xem lịch"
                    className="relative flex items-center rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 text-xs select-none"
                    onMouseLeave={() => setHoveredMode(null)}
                  >
                    {VIEW_MODES.map((mode) => {
                      const isActive = viewMode === mode.id
                      const isHovered = hoveredMode === mode.id
                      const Icon = mode.icon

                      return (
                        <button
                          key={mode.id}
                          role="tab"
                          aria-selected={isActive}
                          type="button"
                          onClick={() => setViewMode(mode.id as CalendarViewMode)}
                          onMouseEnter={() => setHoveredMode(mode.id)}
                          className={`relative h-7 px-2.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer z-10 ${
                            isActive ? "text-slate-900 font-bold" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {isHovered && !isActive && (
                            <motion.span
                              layoutId="calendar-view-mode-hover-pill"
                              className="absolute inset-0 rounded-lg bg-slate-200/50 -z-10"
                              transition={{ type: "spring", stiffness: 500, damping: 40 }}
                            />
                          )}
                          {isActive && (
                            <motion.span
                              layoutId="calendar-view-mode-active-pill"
                              className="absolute inset-0 rounded-lg bg-white shadow-2xs border border-slate-200/50 -z-10"
                              transition={springs.floating}
                            />
                          )}
                          <Icon className="w-3.5 h-3.5 relative z-10" />
                          <span className="relative z-10">{mode.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="relative flex items-center rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 text-xs select-none">
                    <button
                      type="button"
                      onClick={() => setShowWeekends(false)}
                      className={`relative h-7 px-2.5 rounded-lg font-semibold transition-colors cursor-pointer z-10 ${
                        !showWeekends ? "text-slate-900 font-bold" : "text-slate-500 hover:text-slate-900"
                      }`}
                      title="Chỉ xem 5 ngày làm việc (Thứ 2 - Thứ 6)"
                    >
                      {!showWeekends && (
                        <motion.span
                          layoutId="calendar-weekend-pill"
                          className="absolute inset-0 rounded-lg bg-white shadow-2xs border border-slate-200/50 -z-10"
                          transition={springs.floating}
                        />
                      )}
                      <span className="relative z-10">5D</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWeekends(true)}
                      className={`relative h-7 px-2.5 rounded-lg font-semibold transition-colors cursor-pointer z-10 ${
                        showWeekends ? "text-slate-900 font-bold" : "text-slate-500 hover:text-slate-900"
                      }`}
                      title="Xem đầy đủ 7 ngày kể cả cuối tuần"
                    >
                      {showWeekends && (
                        <motion.span
                          layoutId="calendar-weekend-pill"
                          className="absolute inset-0 rounded-lg bg-white shadow-2xs border border-slate-200/50 -z-10"
                          transition={springs.floating}
                        />
                      )}
                      <span className="relative z-10">7D</span>
                    </button>
                  </div>
                </>
              )}

              {/* Lighten non-working hours toggle */}
              <Tooltip content="Làm nổi bật giờ hành chính">
                <Button
                  type="button"
                  variant="outline"
                  size="iconSm"
                  onClick={() => {
                    setCalendarConfig((prev) => ({
                      ...prev,
                      lightenNonWorkingHours: !prev.lightenNonWorkingHours,
                    }))
                    toast.success("Đã đổi chế độ làm sáng/tối")
                  }}
                >
                  <Sun className="w-3.5 h-3.5 text-slate-600" />
                </Button>
              </Tooltip>

              {/* Add event CTA with Dark Navy Primary Token */}
              {canManageEvents && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => handleOpenAddEvent()}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Sự kiện</span>
                </Button>
              )}

              {/* User Avatar */}
              <UserAvatar
                name={session?.displayName || "Admin"}
                size="sm"
                className="border border-slate-200 shadow-2xs"
              />
            </div>
          </div>

          {/* LƯỚI LỊCH THÁNG (Month View Grid chuẩn ClickUp Planner & ReUI) */}
          {activeWorkspaceView === "delivery" && viewMode === "month" && (
            <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar bg-slate-100/50">
              {/* Day Header Row: Thứ 2 đến Thứ 6 (hoặc Chủ nhật) */}
              <div
                className={`grid ${
                  showWeekends ? "grid-cols-7" : "grid-cols-5"
                } border-b border-slate-200/80 bg-white shrink-0 shadow-2xs`}
              >
                {columnHeaders.map((col) => (
                  <div key={col.key} className="py-2.5 px-3 text-center border-r border-slate-200/60 last:border-r-0">
                    <span className="text-xs font-bold text-slate-800">{col.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono ml-1.5">({col.sub})</span>
                  </div>
                ))}
              </div>

              {/* Rows of Weeks */}
              <div className="flex-1 flex flex-col divide-y divide-slate-200/70 border-b border-slate-200/70">
                {calendarWeeks.map((week, wIdx) => (
                  <div
                    key={`week-${week.weekNumber}-${wIdx}`}
                    className={`flex-1 min-h-[118px] grid ${
                      showWeekends ? "grid-cols-7" : "grid-cols-5"
                    } divide-x divide-slate-200/70`}
                  >
                    {week.days.map((cell) => {
                      const dayItems = filteredItems.filter((it) => it.date === cell.dateYMD)
                      const isHoveredTarget = hoveredDateYMD === cell.dateYMD

                      return (
                        <div
                          key={`cell-${cell.dateYMD}`}
                          onDragEnter={() => setHoveredDateYMD(cell.dateYMD)}
                          onDragOver={(e) => {
                            if (draggedItem) {
                              e.preventDefault()
                              e.dataTransfer.dropEffect = "move"
                            }
                          }}
                          onDragLeave={() => {
                            if (hoveredDateYMD === cell.dateYMD) {
                              setHoveredDateYMD(null)
                            }
                          }}
                          onDrop={() => handleDropOnDate(cell.dateYMD)}
                          className={`p-2 flex flex-col justify-between transition-colors relative group ${
                            !cell.isCurrentMonth
                              ? "bg-slate-50/60 text-slate-400"
                              : cell.isToday
                              ? "bg-blue-50/20"
                              : "bg-white"
                          } ${
                            isHoveredTarget ? "ring-2 ring-slate-900 bg-blue-50/60 shadow-inner z-10" : ""
                          }`}
                        >
                          {/* Top Date Badge: Today = Red Circle, Day 1 = Dark Navy Pill */}
                          <div className="flex items-center justify-between mb-1.5">
                            {cell.isToday ? (
                              <span className="w-5.5 h-5.5 rounded-full bg-[#E53935] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                                {cell.dayNumber}
                              </span>
                            ) : cell.isFirstOfMonth ? (
                              <span className="inline-flex items-center gap-1 font-bold text-xs text-slate-900">
                                <span className="px-1.5 py-0.2 rounded-md bg-slate-900 text-white text-[10px] font-bold">
                                  {cell.monthShort}
                                </span>
                                <span>{cell.dayNumber}</span>
                              </span>
                            ) : (
                              <span
                                className={`text-xs font-semibold ${
                                  cell.isCurrentMonth ? "text-slate-700" : "text-slate-300"
                                }`}
                              >
                                {cell.dayNumber}
                              </span>
                            )}

                            {cell.isCurrentMonth && canManageEvents && (
                              <button
                                type="button"
                                onClick={() => handleOpenAddEvent(cell.dateYMD)}
                                className="w-5 h-5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Thêm sự kiện ngày này"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Items List inside Day Cell */}
                          <div className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar max-h-[96px]">
                            {dayItems.slice(0, 3).map((item, itIdx) => {
                              const isTask = item.layer === 1
                              const isDraggable = isTask && canModifyDeadlines
                              const itemKey = `item-${item.id || item.title}-${cell.dateYMD}-${itIdx}`

                              // Layer 4: Sự kiện Team
                              if (item.layer === 4 || item.title.includes("Tập thể dục")) {
                                return (
                                  <div
                                    key={itemKey}
                                    onClick={() => setDetailItem(item)}
                                    className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-semibold truncate cursor-pointer shadow-2xs hover:brightness-105 transition-all flex items-center gap-1.5"
                                    title={item.title}
                                  >
                                    <span className="truncate">{item.title}</span>
                                  </div>
                                )
                              }

                              // Layer 1: Đề bài & Kế hoạch UX (Work Block + Committed Deadline)
                              if (item.layer === 1) {
                                const isAtRisk = item.riskLevel === "at_risk"
                                const isOverdue = item.riskLevel === "overdue"

                                return (
                                  <div
                                    key={itemKey}
                                    draggable={isDraggable}
                                    onDragStart={(e) => {
                                      if (item.rawItem) {
                                        handleDragStartTask(e, item.rawItem as UXRequest)
                                      }
                                    }}
                                    onClick={() => handleOpenDeadlineModal(item.rawItem as UXRequest)}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold truncate cursor-pointer transition-all flex items-center justify-between gap-1.5 shadow-2xs ${
                                      item.status === "Hoàn thành"
                                        ? "bg-slate-100 text-slate-500 line-through border border-slate-200"
                                        : isOverdue
                                        ? "bg-red-700 text-white hover:bg-red-800"
                                        : isAtRisk
                                        ? "bg-amber-600 text-white hover:bg-amber-700"
                                        : "bg-slate-900 text-white hover:bg-slate-800"
                                    }`}
                                    title={`Kế hoạch: ${item.title} (${item.estimatedHours || 16}h) - Hạn: ${item.committedDeadline || "Chưa có"}`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Headphones className="w-3 h-3 shrink-0 text-slate-300" />
                                      <span className="truncate">{item.title}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="text-[9px] font-mono px-1 py-0.2 bg-white/20 rounded">
                                        {item.estimatedHours || 16}h
                                      </span>
                                      {isAtRisk && (
                                        <span className="text-amber-200 text-xs" title={item.riskReason || item.conflictReason}>
                                          ⚠️
                                        </span>
                                      )}
                                      {isOverdue && (
                                        <span className="text-red-200 text-xs" title="Đã quá hạn hoàn thành!">
                                          🔴
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              }

                              // Layer 2: Nghỉ phép nhân sự
                              if (item.layer === 2) {
                                return (
                                  <div
                                    key={itemKey}
                                    onClick={() => setDetailItem(item)}
                                    className="px-2 py-1 rounded-lg bg-pink-50 text-pink-700 text-[10.5px] font-semibold truncate cursor-pointer flex items-center gap-1.5 border border-pink-200/80 hover:bg-pink-100 transition-colors"
                                    title={item.title}
                                  >
                                    <Palmtree className="w-3 h-3 text-pink-600 shrink-0" />
                                    <span className="truncate">{item.title}</span>
                                  </div>
                                )
                              }

                              // Layer 3: Lịch nghỉ lễ ngân hàng / thông báo nhẹ
                              return (
                                <div
                                  key={itemKey}
                                  onClick={() => setDetailItem(item)}
                                  className="px-2 py-0.5 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] font-medium truncate cursor-pointer flex items-center gap-1.5"
                                  title={item.title}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                  <span className="truncate">{item.title}</span>
                                </div>
                              )
                            })}

                            {dayItems.length > 3 && (
                              <div
                                onClick={() => {
                                  setCurrentDate(new Date(cell.date))
                                  setViewMode("day")
                                }}
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-900 text-center cursor-pointer py-0.5"
                              >
                                + {dayItems.length - 3} mục khác
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHẾ ĐỘ TUẦN / NGÀY / LỊCH TRÌNH (DELIVERY VIEW) */}
          {activeWorkspaceView === "delivery" && viewMode !== "month" && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {viewMode === "week"
                    ? "Chế độ xem tuần (Week View)"
                    : viewMode === "day"
                    ? "Chế độ xem ngày (Day View)"
                    : "Lịch trình công việc tập trung (Agenda)"}
                </div>
                <Badge variant="secondary" size="sm">
                  {filteredItems.length} mục
                </Badge>
              </div>

              <motion.div
                variants={cascadeWaveContainerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2.5 max-w-4xl"
              >
                {filteredItems.map((item, itIdx) => (
                  <motion.div
                    key={`other-mode-${item.id || item.title}-${item.date}-${itIdx}`}
                    variants={cascadeWaveItemVariants}
                    onClick={() => {
                      if (item.layer === 1) handleOpenDeadlineModal(item.rawItem as UXRequest)
                      else setDetailItem(item)
                    }}
                    className="p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex items-center justify-between gap-4 cursor-pointer"
                    style={{ borderLeftColor: item.color || "#0F172A", borderLeftWidth: "4px" }}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2 flex-wrap">
                        <span>{item.title}</span>
                        {item.riskLevel === "at_risk" && (
                          <Badge variant="warning" size="xs">
                            ⚠️ {item.riskReason || "Có rủi ro"}
                          </Badge>
                        )}
                        {item.riskLevel === "overdue" && (
                          <Badge variant="destructive" size="xs">
                            🔴 Quá hạn
                          </Badge>
                        )}
                        {item.hasConflict && item.riskLevel !== "at_risk" && (
                          <Badge variant="destructive" size="xs">
                            ⚠️ Xung đột nghỉ phép
                          </Badge>
                        )}
                        <Badge variant="secondary" size="xs">
                          {item.categoryLabel}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Kế hoạch: <strong className="text-slate-700">{item.date}</strong></span>
                        {item.committedDeadline && (
                          <>
                            <span>•</span>
                            <span>Hạn cam kết: <strong className="text-red-600">{item.committedDeadline}</strong></span>
                          </>
                        )}
                        {item.assigneeName && (
                          <>
                            <span>•</span>
                            <span>Phụ trách: <strong className="text-slate-700">{item.assigneeName}</strong></span>
                          </>
                        )}
                        {item.estimatedHours && (
                          <>
                            <span>•</span>
                            <span>Định mức: <strong className="text-purple-700 font-mono">{item.estimatedHours}h</strong></span>
                          </>
                        )}
                      </div>
                    </div>

                    {item.layer === 1 && (
                      <Button type="button" variant="outline" size="sm" className="h-8 shrink-0">
                        Đổi Deadline
                      </Button>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}

          {/* ================================================================= */}
          {/* CHẾ ĐỘ 2: BẢNG NĂNG LỰC & TẢI CÔNG VIỆC (CAPACITY & WORKLOAD BOARD) */}
          {/* ================================================================= */}
          {activeWorkspaceView === "capacity" && (
            <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar bg-slate-50/70 p-4 space-y-3">
              {/* Header Banner */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-xs">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Bảng Quản Trị Năng Lực & Tải Công Việc (Capacity & Workload Board)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Theo dõi năng lực thực tế tuần ({clickUpMonthYearTitle}), đối chiếu ngày nghỉ phép và san sẻ tải công việc
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-600 font-medium">&lt; 80% (Còn trống)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-slate-600 font-medium">80% - 100% (Tối ưu)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-700 font-bold">&gt; 100% (Quá tải ⚠️)</span>
                  </div>
                </div>
              </div>

              {/* Grid / Swimlanes */}
              <div className="flex-1 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col min-h-[460px]">
                {/* Table Header: 6 Columns */}
                <div className="grid grid-cols-[280px_repeat(5,1fr)] border-b border-slate-200/80 bg-slate-50/90 text-xs font-bold text-slate-700 divide-x divide-slate-200/80 shrink-0">
                  <div className="p-3 pl-4 flex items-center justify-between">
                    <span>Thành viên UX Team</span>
                    <span className="text-[11px] text-slate-400 font-normal">Chuẩn 40h/tuần</span>
                  </div>
                  {/* Monday to Friday dates for the viewed week */}
                  {(() => {
                    const d = new Date(currentDate)
                    const dayIdx = (d.getDay() + 6) % 7
                    const mon = new Date(d)
                    mon.setDate(mon.getDate() - dayIdx)
                    const dayLabels = [
                      { label: "Thứ 2", sub: "Mon" },
                      { label: "Thứ 3", sub: "Tue" },
                      { label: "Thứ 4", sub: "Wed" },
                      { label: "Thứ 5", sub: "Thu" },
                      { label: "Thứ 6", sub: "Fri" },
                    ]
                    return dayLabels.map((lbl, idx) => {
                      const cur = new Date(mon)
                      cur.setDate(cur.getDate() + idx)
                      const ymd = normalizeDateToYMD(cur)
                      const isToday = ymd === normalizeDateToYMD(new Date())
                      return (
                        <div key={`cap-header-${idx}`} className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-slate-900">{lbl.label}</span>
                            {isToday ? (
                              <span className="w-5 h-5 rounded-full bg-[#E53935] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                                {cur.getDate()}
                              </span>
                            ) : (
                              <span className="text-slate-500 font-mono text-[11px] font-normal">
                                {cur.getDate()}/{cur.getMonth() + 1}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>

                {/* Rows per Designer */}
                <div className="divide-y divide-slate-200/70 overflow-y-auto no-scrollbar flex-1">
                  {teamWorkload.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs italic">
                      Chưa có dữ liệu nhân sự để phân tích tải công việc
                    </div>
                  ) : (
                    teamWorkload.map((designer) => {
                      const d = new Date(currentDate)
                      const dayIdx = (d.getDay() + 6) % 7
                      const mon = new Date(d)
                      mon.setDate(mon.getDate() - dayIdx)

                      return (
                        <div
                          key={`workload-row-${designer.name}`}
                          className="grid grid-cols-[280px_repeat(5,1fr)] divide-x divide-slate-200/70 min-h-[96px] hover:bg-slate-50/40 transition-colors"
                        >
                          {/* Column 1: Designer Info & Workload Progress */}
                          <div className="p-3 pl-4 flex flex-col justify-between space-y-2 bg-white">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <UserAvatar name={designer.name} size="default" className="shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-xs text-slate-900 truncate">
                                  {designer.name}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {designer.activeTasksCount} đề tài đang thực hiện
                                </div>
                              </div>
                            </div>

                            {/* Capacity Utilization Bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-semibold">
                                <span
                                  className={
                                    designer.isOverloaded
                                      ? "text-red-700 font-bold"
                                      : designer.utilizationPercent < 80
                                      ? "text-emerald-700 font-bold"
                                      : "text-blue-700 font-bold"
                                  }
                                >
                                  {designer.utilizationPercent}% tải {designer.isOverloaded ? "⚠️ Quá tải" : ""}
                                </span>
                                <span className="font-mono text-slate-500">
                                  {designer.assignedHours}h / {designer.availableHours}h
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    designer.isOverloaded
                                      ? "bg-red-500"
                                      : designer.utilizationPercent < 80
                                      ? "bg-emerald-500"
                                      : "bg-blue-500"
                                  }`}
                                  style={{ width: `${Math.min(100, designer.utilizationPercent)}%` }}
                                />
                              </div>
                              {designer.leaveHours > 0 && (
                                <div className="text-[9.5px] text-pink-700 font-medium">
                                  🌴 Nghỉ {designer.leaveHours}h trong tuần
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 5 Day Columns (Mon to Fri) */}
                          {[0, 1, 2, 3, 4].map((colIdx) => {
                            const cur = new Date(mon)
                            cur.setDate(cur.getDate() + colIdx)
                            const colYMD = normalizeDateToYMD(cur)
                            const leaveCheck = isPersonOnLeave(leaves, designer.name, colYMD)
                            const isHovered = hoveredDateYMD === `${designer.name}-${colYMD}`

                            // Tasks of this designer that match planned date
                            const dayTasks = designer.tasks.filter((t) => {
                              const plan = normalizeDateToYMD(
                                (t as any).planned_work_date || t.expected_deadline || t.design_deadline
                              )
                              return plan === colYMD
                            })

                            return (
                              <div
                                key={`col-${designer.name}-${colIdx}`}
                                onDragEnter={() => setHoveredDateYMD(`${designer.name}-${colYMD}`)}
                                onDragOver={(e) => {
                                  if (draggedItem) {
                                    e.preventDefault()
                                    e.dataTransfer.dropEffect = "move"
                                  }
                                }}
                                onDragLeave={() => {
                                  if (hoveredDateYMD === `${designer.name}-${colYMD}`) {
                                    setHoveredDateYMD(null)
                                  }
                                }}
                                onDrop={() => handleDropOnDate(colYMD, designer.name)}
                                className={`p-2 flex flex-col justify-between transition-colors relative ${
                                  leaveCheck.onLeave
                                    ? "bg-pink-50/40"
                                    : isHovered
                                    ? "bg-purple-50/70 ring-2 ring-purple-500 z-10"
                                    : "bg-white"
                                }`}
                              >
                                {leaveCheck.onLeave && (
                                  <div className="p-1 rounded-lg bg-pink-100/70 text-pink-800 text-[10px] font-semibold flex items-center gap-1 mb-1.5 border border-pink-200/60">
                                    <Palmtree className="w-3 h-3 text-pink-600 shrink-0" />
                                    <span className="truncate">
                                      Nghỉ ({leaveCheck.leaveRecord?.shift || "Cả ngày"})
                                    </span>
                                  </div>
                                )}

                                {/* Task Blocks */}
                                <div className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar max-h-[140px]">
                                  {dayTasks.map((t) => {
                                    const effort = getTaskEffort(t)
                                    const risk = assessTaskRisk(t, leaves)
                                    return (
                                      <motion.div
                                        key={`board-task-${t.request_id}`}
                                        {...tactileProps.card}
                                        draggable={canModifyDeadlines}
                                        onDragStart={(e) => handleDragStartTask(e as any, t)}
                                        onClick={() => handleOpenDeadlineModal(t)}
                                        className={`p-2 rounded-xl text-white text-[11px] shadow-2xs cursor-grab active:cursor-grabbing hover:brightness-105 transition-all space-y-1 ${
                                          risk.riskLevel === "at_risk"
                                            ? "bg-gradient-to-r from-amber-600 to-amber-700"
                                            : risk.riskLevel === "overdue"
                                            ? "bg-gradient-to-r from-red-600 to-red-700"
                                            : "bg-slate-900"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-1 font-bold">
                                          <span className="truncate">{t.title}</span>
                                          <span className="px-1 py-0.2 rounded bg-white/20 text-[9px] font-mono shrink-0">
                                            {effort}h
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[9.5px] text-slate-200/90">
                                          <span className="truncate">{t.squad_name || t.product}</span>
                                          {t.expected_deadline && (
                                            <span className="font-mono text-amber-200 shrink-0">
                                              DL: {t.expected_deadline.substring(5)}
                                            </span>
                                          )}
                                        </div>
                                      </motion.div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>



      {/* ========================================================================= */}
      {/* CLICKUP COMMAND PALETTE POPOVER                                          */}
      {/* ========================================================================= */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showCommandPalette && (
              <div
                className="fixed inset-0 z-50 flex items-end justify-center pb-6 px-4 bg-slate-900/40 backdrop-blur-xs"
                onClick={() => setShowCommandPalette(false)}
              >
                <motion.div
                  initial={{ y: 24, opacity: 0, scale: 0.98 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 16, opacity: 0, scale: 0.98 }}
                  transition={springs.popover}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col"
                >
                  {/* Scrollable list */}
                  <div className="max-h-[380px] overflow-y-auto p-4 space-y-4 text-xs divide-y divide-slate-100 no-scrollbar">
                    {/* 1. UP NEXT */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Sắp đến hạn (Up next)
                      </div>
                      {upNextTasks.map((t) => (
                        <div
                          key={`cmd-up-${t.id}`}
                          onClick={() => {
                            setCurrentDate(new Date(t.date))
                            setShowCommandPalette(false)
                          }}
                          className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2 border-l-2 border-slate-900 pl-3 transition-colors"
                        >
                          <div className="font-semibold text-slate-900 truncate">
                            Work on {t.title}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {t.date}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* 2. COMMANDS */}
                    <div className="pt-3 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Lệnh nhanh (Commands)
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCalendarConfig((prev) => ({
                            ...prev,
                            lightenNonWorkingHours: !prev.lightenNonWorkingHours,
                          }))
                          toast.success("Đã thay đổi hiển thị giờ ngoài hành chính!")
                          setShowCommandPalette(false)
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer text-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <Droplet className="w-4 h-4 text-slate-500" />
                          <span>Làm mờ giờ ngoài hành chính</span>
                        </span>
                        <Badge variant="secondary" size="xs">
                          {calendarConfig.lightenNonWorkingHours ? "Bật" : "Tắt"}
                        </Badge>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowWeekends((prev) => !prev)
                          toast.success(showWeekends ? "Đã chuyển sang xem 5 ngày làm việc" : "Đã bật xem 7 ngày cuối tuần")
                          setShowCommandPalette(false)
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer text-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                          <span>Chuyển đổi 5 ngày / 7 ngày</span>
                        </span>
                        <Badge variant="secondary" size="xs">
                          {showWeekends ? "7 ngày" : "5 ngày"}
                        </Badge>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowLeftSidebar((prev) => !prev)
                          setShowCommandPalette(false)
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer text-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-slate-500" />
                          <span>Đóng / Mở thanh bên (Sidebar)</span>
                        </span>
                        <Kbd variant="default" size="xs">⌘ \</Kbd>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleNext()
                          setShowCommandPalette(false)
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer text-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                          <span>Tháng tiếp theo</span>
                        </span>
                        <Kbd variant="default" size="xs">→</Kbd>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handlePrev()
                          setShowCommandPalette(false)
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer text-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <ChevronLeft className="w-4 h-4 text-slate-500" />
                          <span>Tháng trước</span>
                        </span>
                        <Kbd variant="default" size="xs">←</Kbd>
                      </button>
                    </div>

                    {/* 3. TEAM */}
                    <div className="pt-3 space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Thành viên nhóm (Team)
                      </div>
                      {allDesigners.slice(0, 5).map((designer) => (
                        <div
                          key={`cmd-team-${designer}`}
                          onClick={() => {
                            setSelectedDesigner(designer)
                            setShowCommandPalette(false)
                            toast.success(`Đang lọc lịch của: ${designer}`)
                          }}
                          className="p-2 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center gap-2.5 transition-colors"
                        >
                          <UserAvatar name={designer} size="sm" />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">{designer}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Input Search at bottom */}
                  <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center gap-2.5">
                    <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                    <input
                      ref={commandInputRef}
                      type="text"
                      placeholder="Tìm sự kiện, nhân sự, lệnh thao tác..."
                      value={commandSearch}
                      onChange={(e) => {
                        setCommandSearch(e.target.value)
                        setSearchQuery(e.target.value)
                      }}
                      className="w-full text-xs bg-transparent border-none outline-none text-slate-900 placeholder-slate-400 font-medium"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="iconSm"
                      onClick={() => setShowCommandPalette(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* ========================================================================= */}
      {/* MODAL XEM TẤT CẢ NHÂN SỰ NGHỈ HÔM NAY (Vertex Studio · Today -> All)      */}
      {/* ========================================================================= */}
      {typeof document !== "undefined" &&
        createPortal(
          <Dialog
            open={showAllLeavesModal}
            onClose={() => setShowAllLeavesModal(false)}
            size="sm"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Palmtree className="w-4 h-4 text-pink-600" />
                <span>Nhân sự nghỉ phép hôm nay ({todayLeaves.length})</span>
              </DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                onClick={() => setShowAllLeavesModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogHeader>

            <DialogBody className="space-y-2.5 max-h-[340px] overflow-y-auto no-scrollbar">
              {todayLeaves.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  Hôm nay toàn bộ nhân sự có mặt làm việc đầy đủ! ✨
                </div>
              ) : (
                todayLeaves.map((lv) => (
                  <div
                    key={`all-lv-${lv.id}`}
                    className="p-3 rounded-2xl border border-pink-100 bg-pink-50/50 flex items-start gap-3"
                  >
                    <UserAvatar
                      name={lv.fullName}
                      avatarUrl={lv.avatarUrl}
                      size="default"
                      className="shrink-0 border border-pink-200"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900">{lv.fullName}</div>
                      <div className="text-[11px] text-pink-700 font-semibold mt-0.5">
                        {lv.shift || "Nghỉ cả ngày"}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{lv.reason}</div>
                    </div>
                  </div>
                ))
              )}
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setShowAllLeavesModal(false)}
              >
                Đóng
              </Button>
            </DialogFooter>
          </Dialog>,
          document.body
        )}

      {/* ========================================================================= */}
      {/* MODAL THÊM / SỬA SỰ KIỆN TEAM (Event Modal)                              */}
      {/* ========================================================================= */}
      {typeof document !== "undefined" &&
        createPortal(
          <Dialog
            open={showEventModal}
            onClose={() => setShowEventModal(false)}
            size="sm"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-slate-900" />
                <span>{editingEvent ? "Chỉnh sửa sự kiện team" : "Thêm sự kiện team mới"}</span>
              </DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                onClick={() => setShowEventModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogHeader>

            <DialogBody className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề sự kiện *</label>
                <Input
                  type="text"
                  placeholder="Ví dụ: Họp Sprint Review giải pháp thẻ tín dụng"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loại sự kiện:</label>
                <select
                  value={eventForm.categoryId}
                  onChange={(e) => setEventForm({ ...eventForm, categoryId: e.target.value })}
                  className="w-full text-xs h-9 rounded-xl border border-slate-200 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bắt đầu:</label>
                  <Input
                    type="datetime-local"
                    value={eventForm.startDate}
                    onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kết thúc:</label>
                  <Input
                    type="datetime-local"
                    value={eventForm.endDate}
                    onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Thành viên tham dự (Email cách nhau dấu phẩy):
                </label>
                <Input
                  type="text"
                  placeholder="manhcuong1340@gmail.com, cachien1501@gmail.com"
                  value={eventForm.attendees}
                  onChange={(e) => setEventForm({ ...eventForm, attendees: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa điểm / Link họp:</label>
                <Input
                  type="text"
                  placeholder="Phòng họp Sao Mai 3 hoặc Teams link"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                />
              </div>
            </DialogBody>

            <DialogFooter>
              {editingEvent ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteEvent(editingEvent.id)}
                  className="mr-auto"
                >
                  Xóa
                </Button>
              ) : null}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEventModal(false)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSaveEvent}
              >
                {editingEvent ? "Lưu thay đổi" : "Tạo sự kiện"}
              </Button>
            </DialogFooter>
          </Dialog>,
          document.body
        )}

      {/* ========================================================================= */}
      {/* MODAL SỬA NHANH DEADLINE KÈM ACTIVITY LOG                             */}
      {/* ========================================================================= */}
      {typeof document !== "undefined" &&
        createPortal(
          <Dialog
            open={Boolean(deadlineModalTask)}
            onClose={() => setDeadlineModalTask(null)}
            size="sm"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-900" />
                <span>Dời hạn hoàn thành thiết kế (Deadline)</span>
              </DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                onClick={() => setDeadlineModalTask(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogHeader>

            <DialogBody className="space-y-3.5 text-xs">
              {deadlineModalTask && (
                <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-1">
                  <div className="font-bold text-slate-900">{deadlineModalTask.title}</div>
                  <div className="text-slate-500 flex items-center gap-2">
                    <span>Mã: <strong className="font-mono text-slate-700">{deadlineModalTask.request_id}</strong></span>
                    <span>•</span>
                    <span>
                      Hạn hiện tại:{" "}
                      <strong className="text-slate-800">{deadlineModalTask.expected_deadline || "Chưa xác định"}</strong>
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Chọn ngày hoàn thành cam kết mới (Deadline):
                </label>
                <Input
                  type="date"
                  value={newDeadlineVal}
                  onChange={(e) => setNewDeadlineVal(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Danh mục lý do thay đổi hạn cam kết: <span className="text-red-500">*</span>
                </label>
                <select
                  value={deadlineReasonType}
                  onChange={(e) => setDeadlineReasonType(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="scope_change">Phạm vi đề bài thay đổi (Scope creep)</option>
                  <option value="waiting_dependency">Chờ tài liệu / API / Phụ thuộc bên thứ 3</option>
                  <option value="leave_absence">Nhân sự vắng mặt / Nghỉ ốm đột xuất</option>
                  <option value="release_change">Điều chỉnh kế hoạch phát hành Sprint</option>
                  <option value="other">Lý do nghiệp vụ khác...</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ghi chú chi tiết (lưu vào Activity Log):
                </label>
                <Textarea
                  rows={2}
                  placeholder="Nhập ghi chú chi tiết về quyết định dời deadline..."
                  value={customDeadlineReason}
                  onChange={(e) => setCustomDeadlineReason(e.target.value)}
                />
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  Thay đổi <strong>Committed Deadline</strong> là cam kết bàn giao với PO/Business. Hệ thống sẽ tự động lưu 1 bản ghi vào lịch sử <strong>Activity Logs</strong> với người thực hiện, thời gian, hạn cũ/mới và lý do.
                </div>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeadlineModalTask(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleConfirmChangeDeadline}
              >
                Xác nhận dời hạn
              </Button>
            </DialogFooter>
          </Dialog>,
          document.body
        )}

      {/* ========================================================================= */}
      {/* MODAL CHI TIẾT ITEM (Nghỉ phép / Nghỉ lễ / Sự kiện)                    */}
      {/* ========================================================================= */}
      {typeof document !== "undefined" &&
        createPortal(
          <Dialog
            open={Boolean(detailItem)}
            onClose={() => setDetailItem(null)}
            size="sm"
          >
            <DialogHeader>
              <DialogTitle>
                <Badge variant="secondary" size="sm">
                  {detailItem?.categoryLabel}
                </Badge>
              </DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogHeader>

            <DialogBody className="space-y-2.5 text-xs">
              <h3 className="font-bold text-sm text-slate-900 leading-snug">{detailItem?.title}</h3>
              <div className="text-slate-600">
                <strong>Ngày:</strong> <span className="font-mono">{detailItem?.date}</span>
              </div>
              {detailItem?.assigneeName && (
                <div className="text-slate-600">
                  <strong>Người liên quan:</strong> {detailItem.assigneeName}
                </div>
              )}
              {detailItem?.hasConflict && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                  <strong>Cảnh báo xung đột:</strong> {detailItem.conflictReason}
                </div>
              )}
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setDetailItem(null)}
              >
                Đóng
              </Button>
            </DialogFooter>
          </Dialog>,
          document.body
        )}
    </div>
  )
}
