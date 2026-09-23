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
  addTeamEvent,
  updateTeamEvent,
  deleteTeamEvent,
  normalizeDateToYMD,
  getLocalUXRequests,
  computeCalendarWeeks,
} from "@/services/calendarService"
import { TeamLeaveRecord } from "@/services/leaveService"
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
  const [deadlineReason, setDeadlineReason] = useState<string>("")

  // Chi tiết Item khi Click
  const [detailItem, setDetailItem] = useState<CalendarItem | null>(null)

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
    } catch (err) {
      console.error("[CalendarPage] Load items error:", err)
      toast.error("Không thể tải toàn bộ dữ liệu lịch!")
    } finally {
      setLoading(false)
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

  // Danh sách Task: Assigned to me, Priorities, Today & Overdue
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

  const todayAndOverdueTasks = useMemo(() => {
    const todayYMD = normalizeDateToYMD(new Date())
    return rawRequests.filter((r) => {
      const d = normalizeDateToYMD(r.expected_deadline || r.design_deadline)
      return d && d <= todayYMD && r.status !== "Hoàn thành"
    })
  }, [rawRequests])

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

  const handleDropOnDate = (targetDateYMD: string) => {
    if (!draggedItem) return
    const req = draggedItem.req
    const currentDeadline = normalizeDateToYMD(req.expected_deadline || req.design_deadline)
    if (currentDeadline === targetDateYMD) {
      setDraggedItem(null)
      setHoveredDateYMD(null)
      return
    }

    const res = updateTaskDeadlineWithLog(
      req.request_id,
      targetDateYMD,
      session,
      "Dời hạn hoàn thành bài toán trực tiếp trên giao diện Lịch Planner"
    )
    if (res.success) {
      toast.success(
        `Đã dời hạn bài toán sang ngày ${targetDateYMD}! Đã tự động ghi nhận Activity Log.`
      )
      reloadData()
    } else {
      toast.error(res.error || "Không thể dời deadline")
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

  // Sửa nhanh deadline từ modal
  const handleOpenDeadlineModal = (task: UXRequest) => {
    setDeadlineModalTask(task)
    setNewDeadlineVal(
      normalizeDateToYMD(task.expected_deadline || task.design_deadline) || normalizeDateToYMD(new Date())
    )
    setDeadlineReason("")
  }

  const handleConfirmChangeDeadline = () => {
    if (!deadlineModalTask || !newDeadlineVal) return
    const res = updateTaskDeadlineWithLog(
      deadlineModalTask.request_id,
      newDeadlineVal,
      session,
      deadlineReason
    )
    if (res.success) {
      toast.success(
        `Đã dời hạn bài toán thành công sang ${newDeadlineVal} và ghi nhận đầy đủ Activity Log!`
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

              {/* Sidebar Content Sections */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs no-scrollbar">
                {/* WIDGET NGHỈ PHÉP: Vertex Studio · Today */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Palmtree className="w-3.5 h-3.5 text-pink-600" />
                      <span className="font-bold text-slate-900 text-xs tracking-tight">
                        Vertex Studio · Hôm nay
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => setShowAllLeavesModal(true)}
                    >
                      Xem tất cả
                    </Button>
                  </div>

                  {/* Overlap Avatars Stack */}
                  <div className="flex items-center -space-x-1.5 py-1 overflow-hidden">
                    {todayLeaves.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic">Toàn bộ nhân sự đi làm đầy đủ ✨</div>
                    ) : (
                      <>
                        {todayLeaves.slice(0, 4).map((lv, idx) => (
                          <Tooltip
                            key={`stack-${lv.id || idx}`}
                            content={`${lv.fullName} (${lv.shift || 'Nghỉ phép'}): ${lv.reason || 'Nghỉ phép'}`}
                          >
                            <div
                              className="inline-block ring-2 ring-white rounded-full transition-transform hover:scale-110 hover:z-10 cursor-pointer"
                              onClick={() => setShowAllLeavesModal(true)}
                            >
                              <UserAvatar
                                name={lv.fullName}
                                avatarUrl={lv.avatarUrl}
                                size="sm"
                                className="border border-slate-200 shadow-2xs"
                              />
                            </div>
                          </Tooltip>
                        ))}
                        {todayLeaves.length > 4 && (
                          <div
                            onClick={() => setShowAllLeavesModal(true)}
                            className="w-7 h-7 rounded-full bg-slate-100 ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-slate-700 cursor-pointer hover:bg-slate-200 transition-colors shadow-2xs"
                            title="Xem tất cả nhân sự nghỉ hôm nay"
                          >
                            +{todayLeaves.length - 4}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* SECTION 1: Priorities */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Ưu tiên cao (Priorities)</span>
                    <Badge variant="priorityLv1" size="xs">
                      {priorityTasks.length}
                    </Badge>
                  </div>
                  {priorityTasks.length === 0 ? (
                    <div className="p-3.5 rounded-xl border border-dashed border-slate-200 bg-white/60 text-center space-y-1.5">
                      <Flag className="w-4 h-4 text-slate-300 mx-auto" />
                      <p className="text-[11px] text-slate-400">
                        Chưa có đề bài ưu tiên Lv1/Lv2
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {priorityTasks.slice(0, 4).map((req) => (
                        <motion.div
                          key={`prio-${req.request_id}`}
                          {...tactileProps.card}
                          draggable={canModifyDeadlines}
                          onDragStart={(e) => handleDragStartTask(e as any, req)}
                          onClick={() => handleOpenDeadlineModal(req)}
                          className="p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <PriorityBadge priority={req.priority} size="xs" showFlag={true} />
                            <span className="truncate text-slate-900 font-semibold text-[11px]">
                              {req.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            {req.expected_deadline?.substring(5) || "Lv1"}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECTION 2: Meet with */}
                <div className="space-y-1.5">
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

                {/* SECTION 3: Assigned to me */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <span>Được giao cho tôi</span>
                    <Badge variant="secondary" size="xs">
                      {assignedToMeTasks.length}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto no-scrollbar">
                    {assignedToMeTasks.slice(0, 5).map((req) => (
                      <motion.div
                        key={`assigned-${req.request_id}`}
                        {...tactileProps.card}
                        draggable={canModifyDeadlines}
                        onDragStart={(e) => handleDragStartTask(e as any, req)}
                        onClick={() => handleOpenDeadlineModal(req)}
                        className="p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CircleDot className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="truncate text-slate-800 font-medium text-[11px]">
                            {req.title}
                          </span>
                        </div>
                        {req.expected_deadline && (
                          <span className="text-[10px] text-amber-700 font-mono shrink-0">
                            {req.expected_deadline.substring(5)}
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* SECTION 4: Today & overdue */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Đến hạn & Trễ hạn</span>
                    {todayAndOverdueTasks.length > 0 && (
                      <Badge variant="destructive" size="xs">
                        {todayAndOverdueTasks.length}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {todayAndOverdueTasks.length === 0 ? (
                      <div className="p-2.5 rounded-xl border border-slate-200/60 bg-white/40 text-center text-[11px] text-slate-400">
                        Không có task trễ hạn 👍
                      </div>
                    ) : (
                      todayAndOverdueTasks.slice(0, 4).map((req) => (
                        <motion.div
                          key={`today-over-${req.request_id}`}
                          {...tactileProps.card}
                          draggable={canModifyDeadlines}
                          onDragStart={(e) => handleDragStartTask(e as any, req)}
                          onClick={() => handleOpenDeadlineModal(req)}
                          className="p-2 rounded-xl bg-white border border-amber-200/90 shadow-2xs hover:border-amber-300 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <CircleDot className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate text-slate-900 font-medium text-[11px]">
                              {req.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-amber-700 font-mono font-bold shrink-0">
                            {req.expected_deadline?.substring(5) || "Hôm nay"}
                          </span>
                        </motion.div>
                      ))
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
            </div>

            {/* Right: Segmented View Switcher + 5D/7D Switcher + Action CTA */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Pattern 1: Floating Active Indicator Segmented View Switcher */}
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
                      {/* Hover Indicator */}
                      {isHovered && !isActive && (
                        <motion.span
                          layoutId="calendar-view-mode-hover-pill"
                          className="absolute inset-0 rounded-lg bg-slate-200/50 -z-10"
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        />
                      )}

                      {/* Active Indicator Solid White Pill */}
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

              {/* 5D / 7D Weekend Switcher */}
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
          {viewMode === "month" && (
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

                              // Layer 1: Đề bài & Deadline UX
                              if (item.layer === 1) {
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
                                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold truncate cursor-pointer transition-all flex items-center justify-between gap-1.5 ${
                                      item.status === "Hoàn thành"
                                        ? "bg-slate-100 text-slate-500 line-through border border-slate-200"
                                        : "bg-slate-900 text-white shadow-xs hover:bg-slate-800"
                                    }`}
                                    title={`Work on ${item.title}`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Headphones className="w-3 h-3 shrink-0 text-slate-300" />
                                      <span className="truncate">Work on {item.title}</span>
                                    </div>
                                    {item.hasConflict && (
                                      <span className="text-amber-300 shrink-0 text-xs" title={item.conflictReason}>
                                        ⚠️
                                      </span>
                                    )}
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

          {/* CHẾ ĐỘ TUẦN / NGÀY / LỊCH TRÌNH */}
          {viewMode !== "month" && (
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
                        {item.hasConflict && (
                          <Badge variant="destructive" size="xs">
                            ⚠️ Xung đột nghỉ phép
                          </Badge>
                        )}
                        <Badge variant="secondary" size="xs">
                          {item.categoryLabel}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Ngày: <strong className="text-slate-700">{item.date}</strong></span>
                        {item.assigneeName && (
                          <>
                            <span>•</span>
                            <span>Phụ trách: <strong className="text-slate-700">{item.assigneeName}</strong></span>
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
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VỊ TRÍ SEARCH DOCK Ở ĐÁY CHUẨN GLASSMORPHISM                             */}
      {/* ========================================================================= */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40">
        <button
          type="button"
          onClick={() => setShowCommandPalette(true)}
          className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-full border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xl hover:shadow-2xl hover:border-slate-300 transition-all text-xs text-slate-600 w-[380px] sm:w-[480px] cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 font-medium">Tìm đề bài, đồng nghiệp, lệnh thao tác...</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Kbd variant="default" size="xs">Ctrl</Kbd>
            <Kbd variant="default" size="xs">K</Kbd>
            <Sparkles className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-1" />
          </div>
        </button>
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
                  Chọn ngày hoàn thành mới:
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
                  Lý do điều chỉnh hạn (tự động ghi vào Activity Log):
                </label>
                <Textarea
                  rows={2}
                  placeholder="Ví dụ: Squad bổ sung thêm luồng sinh trắc học..."
                  value={deadlineReason}
                  onChange={(e) => setDeadlineReason(e.target.value)}
                />
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  Hành động này sẽ tự động ghi 1 bản ghi vào lịch sử <strong>Activity Logs</strong>{" "}
                  của bài toán với người thực hiện, thời gian và mốc hạn cũ/mới.
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
