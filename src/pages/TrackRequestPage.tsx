import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { getStatusConfig, getRequestPendingClassification } from "@/config/statusConfig"
import { UXRequest, TaskUpdateRecord } from "../data/mockData"
import { fetchRequests, updateTaskProgress } from "../api/api"
import RequestDetail from "../components/track/RequestDetail"
import RequestCard from "../components/track/RequestCard"
import KanbanBoard, { getRequestKanbanPhase } from "../components/kanban/KanbanBoard"
import TaskFilterPopover from "@/components/reui/task-filter-popover"
import SolutionAgentsTable, { getTaskGroup } from "@/components/track/SolutionAgentsTable"
import { AnimatedTableRow, tableContainerVariants } from "@/components/jolyui/animated-table"
import {
  getStoredSession,
  logoutTeamsSession,
  getRemainingSessionSeconds,
  getUserInitials,
  UserSession,
} from "../services/otpAuthService"
import { canUserAccessRequest, filterRequestsByRole } from "@/lib/accessControl"
import { DropdownMenu, DropdownOption } from "@/components/reui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogBody } from "@/components/ui/dialog"
import { NumberTicker } from "@/components/jolyui/number-ticker"
import { EmptyState } from "@/components/reui/empty-state"
import { UserAvatar } from "@/components/common/UserAvatar"
import PageHeader from "@/components/common/PageHeader"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import {
  Search,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Layers,
  ArrowUpDown,
  Columns3,
  LayoutGrid,
  ListFilter,
  Flag
} from "lucide-react"

interface TrackRequestPageProps {
  onNavigateToCreate?: () => void
}

const STATUS_FILTERS = ["Tất cả", "Đang phân loại", "Đang thực hiện", "Hoàn thành"]

const AVATAR_COLOR_PALETTES = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
]

function getAvatarColorClass(name: string): string {
  if (!name) return AVATAR_COLOR_PALETTES[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_COLOR_PALETTES.length
  return AVATAR_COLOR_PALETTES[index]
}

function formatDesignerDisplayName(rawName?: string): string {
  if (!rawName || rawName === "Chưa phân công" || rawName === "Đang phân công" || rawName.trim() === "") return "Chưa phân công"
  const clean = rawName.trim()
  if (clean.toLowerCase().includes("nam.designer") || clean.toLowerCase().includes("nam.")) {
    return "Lê Hoàng Nam"
  }
  if (clean.toLowerCase().includes("cuong") || clean.toLowerCase().includes("owner")) {
    return "Nguyễn Văn Cường"
  }
  if (clean.toLowerCase().includes("lan") || clean.toLowerCase().includes("po")) {
    return "Trần Mai Lan"
  }
  if (clean.includes("@")) {
    const userPart = clean.split("@")[0]
    return userPart
      .replace(/[._]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return clean
}

function getDesignerAvatar(name?: string) {
  if (!name || name === "Chưa phân công") return ""
  try {
    const cached = localStorage.getItem("mbbank_team_members")
    if (cached) {
      const members: any[] = JSON.parse(cached)
      const found = members.find((m) => m.name === name || (name && m.name && (name.includes(m.name) || m.name.includes(name))))
      if (found && found.avatarUrl) return found.avatarUrl
    }
  } catch {}
  if (name.includes("Nam")) return "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80"
  if (name.includes("Cường")) return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
  if (name.includes("Lan")) return "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
  return ""
}

function getPhaseProgressColor(phase?: string, status?: string, progress?: number): string {
  if (status === "Hoàn thành" || progress === 100 || phase === "Bàn giao" || phase?.toLowerCase().includes("hoàn thành")) {
    return "bg-emerald-500"
  }
  if (!phase) return "bg-[#1057FB]"
  const p = phase.toLowerCase()
  if (p.includes("prototype") || p.includes("kiểm thử")) {
    return "bg-teal-500"
  }
  if (p.includes("ui design") || p.includes("hi-fi") || p.includes("giao diện")) {
    return "bg-[#1057FB]"
  }
  if (p.includes("user flow") || p.includes("wireframe") || p.includes("luồng")) {
    return "bg-purple-500"
  }
  if (p.includes("discovery") || p.includes("khám phá") || p.includes("nghiên cứu")) {
    return "bg-amber-500"
  }
  if (p.includes("phân loại") || p.includes("tiếp nhận")) {
    return "bg-sky-500"
  }
  if (p.includes("đã gửi") || p.includes("ghi nhận")) {
    return "bg-slate-400"
  }
  if (progress && progress > 70) return "bg-[#1057FB]"
  if (progress && progress > 40) return "bg-purple-500"
  if (progress && progress > 20) return "bg-amber-500"
  return "bg-[#1057FB]"
}

export default function TrackRequestPage({ onNavigateToCreate }: TrackRequestPageProps) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("Tất cả")
  const [productFilter, setProductFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"table" | "kanban" | "grid">("table")
  const [selectedRequest, setSelectedRequest] = useState<UXRequest | null>(null)
  const [allRequests, setAllRequests] = useState<UXRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Pagination state: Trên màn hình lớn (chiều cao >= 850px), mặc định hiển thị 15 dòng
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    if (typeof window !== "undefined" && window.innerHeight >= 850) {
      return 15
    }
    return 10
  })

  // Session state
  const [session, setSession] = useState<UserSession | null>(getStoredSession())
  const [remainingSeconds, setRemainingSeconds] = useState(getRemainingSessionSeconds())

  const loadData = async (forceRefresh = false) => {
    setLoading(true)
    const startTime = Date.now()
    try {
      const reqs = await fetchRequests(forceRefresh)
      // Đảm bảo skeleton hiển thị mượt mà tối thiểu 400ms khi bấm làm mới
      if (forceRefresh) {
        const elapsed = Date.now() - startTime
        if (elapsed < 400) {
          await new Promise((r) => setTimeout(r, 400 - elapsed))
        }
      }
      setAllRequests(reqs)
      if (forceRefresh) {
        toast.success("Đã làm mới dữ liệu từ Google Sheet!")
      }
    } catch (err) {
      console.warn("Could not load requests:", err)
      if (forceRefresh) {
        toast.error("Lỗi làm mới dữ liệu", "Không thể tải danh sách yêu cầu.")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Lắng nghe sự kiện điều hướng từ màn hình Thành công (Tạo bài toán) -> Tự động mở chi tiết bài toán
  useEffect(() => {
    const handleNavEvent = (e: Event) => {
      const customEvent = e as CustomEvent
      const targetId = customEvent.detail?.requestId
      if (targetId) {
        loadData(true).then(() => {
          try {
            const cached = localStorage.getItem("ux_portal_real_requests")
            if (cached) {
              const list: UXRequest[] = JSON.parse(cached)
              const found = list.find((r) => r.request_id === targetId)
              if (found) {
                setSelectedRequest(found)
                return
              }
            }
          } catch {}
          const found = allRequests.find((r) => r.request_id === targetId)
          if (found) {
            setSelectedRequest(found)
          }
        })
      }
    }
    window.addEventListener("app_navigate", handleNavEvent)
    return () => window.removeEventListener("app_navigate", handleNavEvent)
  }, [allRequests])

  useEffect(() => {
    const timer = setInterval(() => {
      const currentSession = getStoredSession()
      setSession(currentSession)
      setRemainingSeconds(getRemainingSessionSeconds())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleUpdatePhase = async (
    requestId: string,
    newPhase: string,
    newStatus: string,
    newProgress: number
  ) => {
    // Show loading toast immediately while processing
    const toastId = toast.loading(
      "Đang cập nhật trạng thái...",
      `Chuyển yêu cầu ${requestId} sang khâu [${newPhase}]`
    )

    const currentSession = getStoredSession()
    const now = new Date()
    const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`

    const targetReq = allRequests.find((r) => r.request_id === requestId)
    const newLogRecord: TaskUpdateRecord = {
      id: `LOG-${Date.now()}`,
      request_id: requestId,
      timestamp: formattedDate,
      updated_by: currentSession ? (currentSession.displayName || currentSession.teamsEmail) : "Lê Hoàng Nam",
      author_role: currentSession ? currentSession.role : "Designer",
      new_phase: newPhase,
      new_progress: newProgress,
      previous_phase: targetReq?.current_phase,
      note: `Chuyển sang khâu [${newPhase}] (${newProgress}%) qua Kanban Board.`,
    }

    // Optimistic UI update
    setAllRequests((prev) =>
      prev.map((r) => {
        if (r.request_id === requestId) {
          const updated = {
            ...r,
            status: newStatus as any,
            progress: newProgress,
            current_phase: newPhase,
            last_updated: formattedDate,
            latest_update: {
              date: formattedDate,
              phase: newPhase,
              message: `Chuyển sang khâu [${newPhase}] (${newProgress}%) qua Kanban Board.`,
            },
            task_updates: [newLogRecord, ...(r.task_updates || [])],
          }
          if (selectedRequest?.request_id === requestId) {
            setSelectedRequest(updated)
          }
          return updated
        }
        return r
      })
    )

    try {
      const target = allRequests.find((r) => r.request_id === requestId)
      const res = await updateTaskProgress(requestId, {
        new_status: newStatus,
        new_phase: newPhase,
        new_progress: newProgress,
        note: `Chuyển sang khâu [${newPhase}] (${newProgress}%) qua Kanban Board.`,
        assigned_designer: target?.assigned_designer,
      })

      if (res.success) {
        toast.success(
          "Cập nhật trạng thái thành công!",
          `Yêu cầu ${requestId} đã chuyển sang khâu [${newPhase}] (${newProgress}%).`,
          { id: toastId }
        )
      } else {
        toast.error(
          "Cập nhật không thành công",
          res.message || "Vui lòng thử lại sau.",
          { id: toastId }
        )
      }
    } catch (err) {
      console.error("Error updating phase:", err)
      toast.error(
        "Lỗi cập nhật",
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng!",
        { id: toastId }
      )
    }
  }

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    const toastId = toast.loading("Đang cập nhật trạng thái...", `Yêu cầu: ${requestId}`)
    const currentSession = getStoredSession()
    const now = new Date()
    const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`

    const targetReq = allRequests.find((r) => r.request_id === requestId)
    const newLogRecord: TaskUpdateRecord = {
      id: `LOG-${Date.now()}`,
      request_id: requestId,
      timestamp: formattedDate,
      updated_by: currentSession ? (currentSession.displayName || currentSession.teamsEmail) : "Lê Hoàng Nam",
      author_role: currentSession ? currentSession.role : "Designer",
      new_phase: targetReq?.current_phase || "Chờ tiếp nhận",
      new_progress: targetReq?.progress ?? 0,
      note: `Chuyển trạng thái sang [${newStatus}] qua Kanban Board.`,
    }

    // Optimistic UI update
    setAllRequests((prev) =>
      prev.map((r) => {
        if (r.request_id === requestId) {
          const updated = {
            ...r,
            status: newStatus as any,
            last_updated: formattedDate,
            latest_update: {
              date: formattedDate,
              phase: r.current_phase,
              message: `Chuyển trạng thái sang [${newStatus}] qua Kanban Board.`,
            },
            task_updates: [newLogRecord, ...(r.task_updates || [])],
          }
          if (selectedRequest?.request_id === requestId) {
            setSelectedRequest(updated)
          }
          return updated
        }
        return r
      })
    )

    try {
      const res = await updateTaskProgress(requestId, {
        new_status: newStatus,
        new_phase: targetReq?.current_phase || "Chờ tiếp nhận",
        new_progress: targetReq?.progress ?? 0,
        note: `Chuyển trạng thái sang [${newStatus}] qua Kanban Board.`,
        assigned_designer: targetReq?.assigned_designer,
      })

      if (res.success) {
        toast.success(
          "Cập nhật trạng thái thành công!",
          `Yêu cầu ${requestId} đã chuyển sang [${newStatus}].`,
          { id: toastId }
        )
      } else {
        toast.error(
          "Cập nhật không thành công",
          res.message || "Vui lòng thử lại sau.",
          { id: toastId }
        )
      }
    } catch (err) {
      console.error("Error updating status:", err)
      toast.error(
        "Lỗi cập nhật",
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng!",
        { id: toastId }
      )
    }
  }

  // Danh sách sản phẩm duy nhất cho Dropdown
  const productOptions: DropdownOption[] = useMemo(() => {
    const prods = Array.from(new Set(allRequests.map((r) => r.product).filter(Boolean)))
    return [
      { value: "all", label: "Tất cả sản phẩm" },
      ...prods.map((p) => ({
        value: p,
        label: p,
      })),
    ]
  }, [allRequests])

  const rowsPerPageOptions: DropdownOption[] = [
    { value: "10", label: "10" },
    { value: "20", label: "20" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ]

  const [selectedPhases, setSelectedPhases] = useState<string[]>([])
  const [selectedSquads, setSelectedSquads] = useState<string[]>([])

  // Lọc dữ liệu theo Role, Trạng thái, Sản phẩm và Từ khóa tìm kiếm
  const filteredRequests = useMemo(() => {
    // 1. Lọc theo Phân quyền Vai trò người dùng (Admin: tất cả; PO & Business: do mình tạo; Designer: được gán; Design Owner: theo sản phẩm & squad)
    let list = filterRequestsByRole(allRequests, session)

    // 2. Lọc theo Workstream / Phase
    if (selectedPhases.length > 0) {
      list = list.filter((r) => selectedPhases.includes(getRequestKanbanPhase(r)))
    }

    // 3. Lọc theo Squad
    if (selectedSquads.length > 0) {
      list = list.filter((r) => selectedSquads.includes(r.squad_name || r.product || "Khác"))
    }

    // 4. Tìm kiếm theo Tên task (title), Mã yêu cầu (request_id), Designer, Sản phẩm
    if (query.trim()) {
      const q = query.toLowerCase().trim()
      list = list.filter(
        (r) =>
          (r.title && r.title.toLowerCase().includes(q)) ||
          (r.request_id && r.request_id.toLowerCase().includes(q)) ||
          (r.product && r.product.toLowerCase().includes(q)) ||
          (r.assigned_designer && r.assigned_designer.toLowerCase().includes(q)) ||
          (r.current_phase && r.current_phase.toLowerCase().includes(q)) ||
          (r.squad_name && r.squad_name.toLowerCase().includes(q))
      )
    }

    return list
  }, [allRequests, session, selectedPhases, selectedSquads, query])

  const handleClearAllFilters = () => {
    setQuery("")
    setSelectedPhases([])
    setSelectedSquads([])
  }

  const getCount = (status: string) => {
    const baseList = filterRequestsByRole(allRequests, session)
    if (status === "Tất cả") return baseList.length
    if (status === "Đang phân loại") {
      return baseList.filter((r) => r.status === "Đang phân loại" || r.status === "Chờ tiếp nhận" || r.status === "Đã gửi").length
    }
    return baseList.filter((r) => r.status === status).length
  }

  // Phân trang
  const totalItems = filteredRequests.length
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + rowsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [query, statusFilter, productFilter, rowsPerPage])

  const renderStatusBadge = (status: string) => {
    const cfg = getStatusConfig(status)
    const isActive = status === "Đang thực hiện"
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.inlineClasses.bg} ${cfg.inlineClasses.text} border ${cfg.inlineClasses.border} whitespace-nowrap shrink-0`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.inlineClasses.dot} shrink-0 ${isActive ? "animate-pulse" : ""}`} />
        <span>{status || "Đã gửi"}</span>
      </span>
    )
  }

  const renderPriorityBadge = (priority?: string) => {
    const p = (priority || "Normal").toLowerCase()
    if (p.includes("urgent") || p.includes("khẩn")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
          <Flag className="w-3 h-3 fill-rose-500 text-rose-500" />
          <span>Khẩn cấp</span>
        </span>
      )
    }
    if (p.includes("high") || p.includes("cao")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
          <Flag className="w-3 h-3 fill-amber-500 text-amber-500" />
          <span>High (Cao)</span>
        </span>
      )
    }
    if (p.includes("low") || p.includes("thấp")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200 shadow-2xs">
          <Flag className="w-3 h-3 text-slate-400" />
          <span>Thấp</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
        <Flag className="w-3 h-3 fill-blue-500 text-blue-500" />
        <span>Bình thường</span>
      </span>
    )
  }

  const formatLastUpdated = (req: UXRequest) => {
    if (req.latest_update?.date) return req.latest_update.date
    if (req.last_updated) return req.last_updated
    if (req.submitted_at) return req.submitted_at
    return "Gần đây"
  }

  const activeCount = filteredRequests.filter((r) => r.status === "Đang thực hiện" || r.status === "Đã gửi PO").length
  const runsCount = filteredRequests.length

  const groupCounts = useMemo(() => {
    const counts = { overload: 0, unassigned: 0, running: 0, pending: 0, completed: 0 }
    filteredRequests.forEach((r) => {
      const g = getTaskGroup(r)
      counts[g] = (counts[g] || 0) + 1
    })
    return counts
  }, [filteredRequests])

  const { poPendingCount, designerPendingCount } = useMemo(() => {
    let po = 0
    let des = 0
    filteredRequests.forEach((r) => {
      const p = getRequestPendingClassification(r)
      if (p.isPending) {
        if (p.type === "po_pending") po++
        else if (p.type === "designer_pending") des++
      }
    })
    return { poPendingCount: po, designerPendingCount: des }
  }, [filteredRequests])

  const overloadCount = groupCounts.overload
  const unassignedCount = groupCounts.unassigned
  const runningCount = groupCounts.running
  const pendingCount = groupCounts.pending
  const completedCount = groupCounts.completed

  return (
    <main className="w-full max-w-[1720px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-h-screen animate-in fade-in-50 duration-200 pb-16">
      {/* 1. Page Header Đồng Bộ theo Design System */}
      <PageHeader
        breadcrumb={{
          parent: "MBBank UX Platform",
          current: "Task của tôi",
        }}
        title="Task của tôi"
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </span>
        }
        subtitle={
          <div className="flex flex-wrap items-center gap-2.5 pt-0.5 select-none text-xs">
            {/* Runs */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium text-xs">Runs</span>
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200/60 min-w-[20px]">
                {runsCount}
              </span>
            </div>

            {/* Overload (Chỉ hiển thị nếu > 0) */}
            {overloadCount > 0 && (
              <>
                <div className="h-3 w-px bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium text-xs">Overload</span>
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 min-w-[20px]">
                    {overloadCount}
                  </span>
                </div>
              </>
            )}

            {/* Chờ phân bổ (Chỉ hiển thị nếu > 0) */}
            {unassignedCount > 0 && (
              <>
                <div className="h-3 w-px bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium text-xs">Chờ phân bổ</span>
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 min-w-[20px]">
                    {unassignedCount}
                  </span>
                </div>
              </>
            )}

            {/* Đang thực hiện */}
            <div className="h-3 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium text-xs">Đang thực hiện</span>
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-[#1057FB] border border-blue-200 min-w-[20px]">
                {runningCount}
              </span>
            </div>

            {/* PO Pending (Quá hạn 24h) */}
            {poPendingCount > 0 && (
              <>
                <div className="h-3 w-px bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-1.5" title="PO Pending: Sau 24h kể từ khi Designer gửi lại Figma cho PO nhưng chưa phản hồi">
                  <span className="text-slate-500 font-medium text-xs">PO Pending</span>
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 min-w-[20px]">
                    {poPendingCount}
                  </span>
                </div>
              </>
            )}

            {/* Pending (Tạm dừng theo chat @pending của Designer) */}
            {designerPendingCount > 0 && (
              <>
                <div className="h-3 w-px bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-1.5" title="Pending: Tạm dừng theo đoạn chat của Designer khi viết @pending">
                  <span className="text-slate-500 font-medium text-xs">Pending</span>
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 min-w-[20px]">
                    {designerPendingCount}
                  </span>
                </div>
              </>
            )}

            {/* Fallback nếu không thuộc 2 loại trên nhưng pendingCount > 0 */}
            {poPendingCount === 0 && designerPendingCount === 0 && pendingCount > 0 && (
              <>
                <div className="h-3 w-px bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium text-xs">Pending</span>
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 min-w-[20px]">
                    {pendingCount}
                  </span>
                </div>
              </>
            )}

            {/* Hoàn thành (Chỉ hiển thị nếu > 0) */}
            {completedCount > 0 && (
              <>
                <div className="h-3 w-px bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium text-xs">Hoàn thành</span>
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 min-w-[20px]">
                    {completedCount}
                  </span>
                </div>
              </>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (onNavigateToCreate) {
                  onNavigateToCreate()
                } else {
                  window.location.hash = "#create"
                }
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold gap-1.5 rounded-xl h-10 px-4 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo task mới</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              className="h-10 px-4 text-xs font-bold rounded-xl bg-white border-slate-200 text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </Button>
          </div>
        }
      />

      {/* Unified Container Card */}
      <div className="bg-white rounded-2xl shadow-xs overflow-hidden min-h-[calc(100vh-13rem)] flex flex-col justify-between">
        {/* Unified Filter & Toolbar Bar */}
        <div className="p-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            {/* Left: Search input */}
            <div className="relative w-full sm:w-96 lg:w-[460px] max-w-xl">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm yêu cầu, designer, squad..."
                startIcon={<Search className="w-4 h-4 text-slate-400" />}
                className="h-10 text-xs sm:text-sm bg-white rounded-xl border-slate-200 shadow-2xs w-full"
              />
            </div>

            {/* Right: View Mode Switcher + Filter Popover */}
            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
              {/* View Mode Switcher: Bảng | Kanban | Lưới */}
              <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 px-2.5 text-xs ${
                    viewMode === "table"
                      ? "bg-white text-[#1057FB] shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900 font-medium"
                  }`}
                  title="Dạng bảng chi tiết"
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Bảng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("kanban")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 px-2.5 text-xs ${
                    viewMode === "kanban"
                      ? "bg-white text-[#1057FB] shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900 font-medium"
                  }`}
                  title="Bảng Kanban"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  <span>Kanban</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 px-2.5 text-xs ${
                    viewMode === "grid"
                      ? "bg-white text-[#1057FB] shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900 font-medium"
                  }`}
                  title="Dạng lưới thẻ"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Lưới</span>
                </button>
              </div>

              {/* ReUI Task Filter Popover */}
              <TaskFilterPopover
                requests={allRequests}
                selectedPhases={selectedPhases}
                selectedSquads={selectedSquads}
                onPhasesChange={setSelectedPhases}
                onSquadsChange={setSelectedSquads}
                onClearAll={handleClearAllFilters}
              />
            </div>
          </div>
        </div>

        {/* Content Body based on View Mode */}
        <AnimatePresence mode="wait">
          {viewMode === "kanban" ? (
            <motion.div
              key="kanban"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-4 sm:p-6 flex-1 flex flex-col"
            >
              <KanbanBoard
                requests={filteredRequests}
                loading={loading}
                onSelectRequest={setSelectedRequest}
                onUpdatePhase={handleUpdatePhase}
                onUpdateStatus={handleUpdateStatus}
              />
            </motion.div>
          ) : viewMode === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-4 sm:p-6 flex-1"
            >
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={`grid-skel-${i}`} className="p-5 rounded-2xl border border-slate-200 bg-white animate-pulse space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="h-5 bg-slate-100 rounded-md w-24" />
                        <div className="h-5 bg-slate-100 rounded-full w-16" />
                      </div>
                      <div className="h-5 bg-slate-100 rounded w-3/4" />
                      <div className="h-4 bg-slate-100 rounded w-1/2" />
                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100" />
                          <div className="h-3.5 bg-slate-100 rounded w-20" />
                        </div>
                        <div className="h-4 bg-slate-100 rounded w-12" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {filteredRequests.map((r, idx) => (
                    <RequestCard key={r.request_id ? `${r.request_id}-${idx}` : `grid-${idx}`} request={r} onClick={setSelectedRequest} />
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-10 shadow-2xs">
                  <EmptyState
                    title="Không tìm thấy bài toán nào"
                    description="Không có bài toán nào khớp với bộ lọc hiện tại. Hãy thử thay đổi từ khóa hoặc xóa bộ lọc."
                    secondaryAction={
                      query || selectedPhases.length > 0 || selectedSquads.length > 0
                        ? {
                            label: "Đặt lại bộ lọc",
                            onClick: handleClearAllFilters,
                            icon: <RefreshCw className="w-4 h-4" />,
                          }
                        : undefined
                    }
                    primaryAction={
                      session?.role === "PO" || session?.role === "Business"
                        ? {
                            label: "Tạo yêu cầu mới",
                            onClick: () => {
                              if (onNavigateToCreate) onNavigateToCreate()
                            },
                            icon: <Plus className="w-4 h-4" />,
                          }
                        : undefined
                    }
                  />
                </div>
              )}
            </motion.div>
          ) : (
            /* ReUI Solution Agents 2 Table View */
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-0 flex-1 flex flex-col"
            >
              <SolutionAgentsTable
                requests={filteredRequests}
                loading={loading}
                onSelectRequest={setSelectedRequest}
                onNavigateToCreate={onNavigateToCreate}
                onResetFilters={handleClearAllFilters}
                hasActiveFilters={Boolean(query || selectedPhases.length > 0 || selectedSquads.length > 0)}
                hideHeader={true}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SLIDE-OVER DRAWER XEM CHI TIẾT / HỒ SƠ YÊU CẦU */}
      {selectedRequest && (
        <RequestDetail
          open={Boolean(selectedRequest)}
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdated={async () => {
            const reqs = await fetchRequests(true)
            setAllRequests(reqs)
            const found = reqs.find((r) => r.request_id === selectedRequest?.request_id)
            if (found) setSelectedRequest(found)
          }}
        />
      )}
    </main>
  )
}
export { TrackRequestPage }
