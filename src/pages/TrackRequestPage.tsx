import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { getStatusConfig } from "@/config/statusConfig"
import { UXRequest } from "../data/mockData"
import { fetchRequests, updateTaskProgress } from "../api/api"
import RequestDetail from "../components/track/RequestDetail"
import RequestCard from "../components/track/RequestCard"
import KanbanBoard, { getRequestKanbanPhase } from "../components/kanban/KanbanBoard"
import TaskFilterPopover from "@/components/reui/task-filter-popover"
import { AnimatedTableRow, tableContainerVariants } from "@/components/jolyui/animated-table"
import {
  getStoredSession,
  logoutTeamsSession,
  getRemainingSessionSeconds,
  getUserInitials,
  UserSession,
} from "../services/otpAuthService"
import { DropdownMenu, DropdownOption } from "@/components/reui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogBody } from "@/components/ui/dialog"
import { NumberTicker } from "@/components/jolyui/number-ticker"
import { EmptyState } from "@/components/reui/empty-state"
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
  ListFilter
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
  if (!rawName) return "Đang phân công"
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
  if (!name) return ""
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Session state
  const [session, setSession] = useState<UserSession | null>(getStoredSession())
  const [remainingSeconds, setRemainingSeconds] = useState(getRemainingSessionSeconds())

  const loadData = async (forceRefresh = false) => {
    setLoading(true)
    try {
      const reqs = await fetchRequests(forceRefresh)
      setAllRequests(reqs)
    } catch (err) {
      console.warn("Could not load requests:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

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

    // Optimistic UI update
    setAllRequests((prev) =>
      prev.map((r) => {
        if (r.request_id === requestId) {
          return {
            ...r,
            status: newStatus as any,
            progress: newProgress,
            current_phase: newPhase,
          }
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
    let list = allRequests

    // 1. Lọc theo Role người dùng
    if (session) {
      const userEmail = (session.teamsEmail || "").toLowerCase().trim()
      const userName = (session.displayName || "").toLowerCase().trim()
      const userRole = session.role

      if (userRole === "PO") {
        list = list.filter((r) => {
          const reqEmail = (r.requester_email || "").toLowerCase().trim()
          return reqEmail === userEmail || reqEmail.includes(userEmail.split("@")[0])
        })
      } else if (userRole === "Designer") {
        list = list.filter((r) => {
          const assigned = (r.assigned_designer || r.ux_owner || "").toLowerCase().trim()
          return (
            assigned.includes(userEmail) ||
            assigned.includes(userName) ||
            assigned.includes(userEmail.split("@")[0])
          )
        })
      }
    }

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
    let baseList = allRequests
    if (session?.role === "PO") {
      const userEmail = (session.teamsEmail || "").toLowerCase().trim()
      baseList = baseList.filter((r) => (r.requester_email || "").toLowerCase().includes(userEmail.split("@")[0]))
    } else if (session?.role === "Designer") {
      const userEmail = (session.teamsEmail || "").toLowerCase().trim()
      baseList = baseList.filter((r) => (r.assigned_designer || "").toLowerCase().includes(userEmail.split("@")[0]))
    }
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

  const formatLastUpdated = (req: UXRequest) => {
    if (req.latest_update?.date) return req.latest_update.date
    if (req.last_updated) return req.last_updated
    if (req.submitted_at) return req.submitted_at
    return "Gần đây"
  }

  const activeCount = filteredRequests.filter((r) => r.status === "Đang thực hiện").length
  const completedCount = filteredRequests.filter((r) => r.status === "Hoàn thành").length

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-16">
      {/* Top Header matching Create Task clean style */}
      <div className="border-b border-slate-200/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {session?.role === "PO" ? "Task của tôi" : "Task của tôi"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium flex flex-wrap items-center gap-1.5">
            <span>
              <NumberTicker value={totalItems} className="font-bold text-slate-800" /> bài toán hiển thị
            </span>
            <span className="mx-0.5 text-slate-300">•</span>
            <span className="text-amber-600 font-semibold">
              <NumberTicker value={activeCount} className="font-bold text-amber-600" /> đang thực hiện
            </span>
            <span className="mx-0.5 text-slate-300">•</span>
            <span className="text-emerald-600 font-semibold">
              <NumberTicker value={completedCount} className="font-bold text-emerald-600" /> hoàn thành
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* New Request Button */}
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

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            className="h-10 text-xs gap-1.5 bg-white border-slate-200 rounded-xl text-slate-600 font-semibold cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {/* Unified Container Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
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
              {/* View Mode Switcher: Kanban | Lưới | Bảng */}
              <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
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
              className="p-4 sm:p-6"
            >
              <KanbanBoard
                requests={filteredRequests}
                onSelectRequest={setSelectedRequest}
                onUpdatePhase={handleUpdatePhase}
              />
            </motion.div>
          ) : viewMode === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {filteredRequests.map((r) => (
                <RequestCard key={r.request_id} request={r} onClick={setSelectedRequest} />
              ))}
            </motion.div>
          ) : (
            /* Table View with JolyUI Animated Rows */
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-4 sm:p-6"
            >
              <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-full">
                    <thead className="bg-slate-50/90 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-3 sm:px-4 w-[20%]">
                          <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 select-none">
                            <span>Tên yêu cầu</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                          </div>
                        </th>
                        <th className="py-3 px-2.5 sm:px-4 w-[20%]">
                          <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 select-none">
                            <span>Người thực hiện</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                          </div>
                        </th>
                        <th className="py-3 px-2.5 sm:px-4 w-[20%]">
                          <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 select-none">
                            <span>Trạng thái</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                          </div>
                        </th>
                        <th className="py-3 px-3 sm:px-6 w-[40%]">
                          <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 select-none">
                            <span>Tiến độ</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                          </div>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        [...Array(6)].map((_, i) => (
                          <tr key={i} className={`animate-pulse ${i % 2 === 0 ? "bg-white" : "bg-[#F9FAFC]"}`}>
                            <td className="py-4 px-4 sm:px-6">
                              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                              <div className="h-3 bg-slate-100 rounded w-1/3" />
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                                <div className="h-3.5 bg-slate-100 rounded w-24" />
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="h-6 bg-slate-100 rounded-full w-24" />
                            </td>
                            <td className="py-4 px-4">
                              <div className="h-3.5 bg-slate-100 rounded w-16 mb-1.5" />
                              <div className="h-2 bg-slate-100 rounded-full w-full" />
                            </td>
                          </tr>
                        ))
                      ) : paginatedRequests.length > 0 ? (
                        paginatedRequests.map((req, index) => {
                          const displayName = formatDesignerDisplayName(req.assigned_designer || req.ux_owner)
                          const designerAvatar = getDesignerAvatar(displayName)
                          const avatarColorClass = getAvatarColorClass(displayName)
                          const progressVal = req.progress || (req.status === "Hoàn thành" ? 100 : req.status === "Đang thực hiện" ? 55 : 15)
                          const lastUpdatedStr = formatLastUpdated(req)

                          return (
                            <AnimatedTableRow
                              key={`${req.request_id}-${index}`}
                              index={index}
                              onClick={() => setSelectedRequest(req)}
                              className={index % 2 === 0 ? "bg-white" : "bg-[#F9FAFC]"}
                            >
                              <td className="py-3 px-3 sm:px-5">
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-slate-900 group-hover:text-[#1057FB] transition-colors leading-snug line-clamp-1 break-words">
                                    {req.title}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
                                    <span className="font-mono text-slate-400 font-normal tracking-[-0.005em] truncate max-w-[85px] sm:max-w-[130px] shrink">
                                      {req.request_id}
                                    </span>
                                    <span className="shrink-0">•</span>
                                    <span className="truncate shrink-0">Cập nhật: {lastUpdatedStr}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-2.5 sm:px-4">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {designerAvatar ? (
                                    <img
                                      src={designerAvatar}
                                      alt={displayName}
                                      className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                                    />
                                  ) : (
                                    <div
                                      className={`w-7 h-7 rounded-full font-bold text-[11px] flex items-center justify-center border shrink-0 shadow-2xs ${avatarColorClass}`}
                                    >
                                      {getUserInitials(displayName)}
                                    </div>
                                  )}
                                  <p className="text-xs font-bold text-slate-900 truncate max-w-[90px] sm:max-w-[140px] min-w-0">
                                    {displayName}
                                  </p>
                                </div>
                              </td>

                              <td className="py-3 px-2.5 sm:px-4">
                                {renderStatusBadge(req.status)}
                              </td>

                              <td className="py-3 px-3 sm:px-6">
                                <div className="space-y-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 text-xs">
                                    <span className="text-[11px] font-medium text-slate-600 leading-tight break-words line-clamp-1">
                                      {req.current_phase || "Ghi nhận"}
                                    </span>
                                    <span className="font-mono font-bold text-slate-800 text-[11px] shrink-0">
                                      {progressVal}%
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden shrink-0 mt-0.5">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${getPhaseProgressColor(
                                        req.current_phase,
                                        req.status,
                                        progressVal
                                      )}`}
                                      style={{ width: `${progressVal}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </AnimatedTableRow>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-6 text-center bg-white">
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
                                session?.role === "PO"
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
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

            {/* Pagination Footer */}
            <div className="p-4 sm:px-6 bg-white border-t border-slate-100 flex items-center justify-between gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2 shrink-0">
                <span>Số dòng mỗi trang</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:border-[#1057FB] shadow-2xs transition-colors"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-500 font-medium">
                  {totalItems === 0
                    ? "0 – 0 trên 0"
                    : `${startIndex + 1} – ${Math.min(startIndex + rowsPerPage, totalItems)} trên ${totalItems}`}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1
                    const isActive = pageNum === currentPage
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Trang sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SLIDE-OVER DRAWER XEM CHI TIẾT / HỒ SƠ YÊU CẦU */}
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
    </main>
  )
}
export { TrackRequestPage }
