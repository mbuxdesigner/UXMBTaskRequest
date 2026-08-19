import { useState, useEffect, useMemo } from "react"
import { getStatusConfig } from "@/config/statusConfig"
import { UXRequest } from "../data/mockData"
import { fetchRequests } from "../api/api"
import RequestDetail from "../components/track/RequestDetail"
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
import { BlurFade } from "@/components/jolyui/blur-fade"
import { EmptyState } from "@/components/reui/empty-state"
import {
  Search,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Clock,
  LogOut,
  Layers,
  Inbox,
  ArrowUpDown,
} from "lucide-react"

interface TrackRequestPageProps {
  onNavigateToCreate?: () => void
}

// Bảng màu avatar text đa dạng phân biệt theo tên
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

// Chuyển email sang tên hiển thị người dùng thân thiện
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

// Bảng màu cho thanh tiến độ theo từng giai đoạn UX
function getPhaseProgressColor(phase?: string, status?: string, progress?: number): string {
  if (status === "Hoàn thành" || progress === 100 || phase === "Bàn giao" || phase?.toLowerCase().includes("hoàn thành")) {
    return "bg-emerald-500" // Xanh lá: Hoàn thành / Bàn giao
  }
  if (!phase) return "bg-[#1B3A6B]"
  const p = phase.toLowerCase()
  if (p.includes("prototype") || p.includes("kiểm thử")) {
    return "bg-teal-500" // Xanh Teal: Prototype
  }
  if (p.includes("ui design") || p.includes("hi-fi") || p.includes("giao diện")) {
    return "bg-[#1E5AF6]" // Xanh dương Royal: Thiết kế UI Hi-Fi
  }
  if (p.includes("user flow") || p.includes("wireframe") || p.includes("luồng")) {
    return "bg-purple-500" // Tím: Luồng trải nghiệm & Wireframe
  }
  if (p.includes("discovery") || p.includes("khám phá") || p.includes("nghiên cứu")) {
    return "bg-amber-500" // Vàng cam: Nghiên cứu & Discovery
  }
  if (p.includes("phân loại") || p.includes("tiếp nhận")) {
    return "bg-sky-500" // Xanh da trời: Phân loại bài toán
  }
  if (p.includes("đã gửi") || p.includes("ghi nhận")) {
    return "bg-slate-400" // Xám nhạt: Khởi tạo / Đã gửi
  }
  if (progress && progress > 70) return "bg-[#1E5AF6]"
  if (progress && progress > 40) return "bg-purple-500"
  if (progress && progress > 20) return "bg-amber-500"
  return "bg-[#1B3A6B]"
}

export default function TrackRequestPage({ onNavigateToCreate }: TrackRequestPageProps) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [productFilter, setProductFilter] = useState<string>("all")
  const [selectedRequest, setSelectedRequest] = useState<UXRequest | null>(null)
  const [allRequests, setAllRequests] = useState<UXRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(6)

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

  // Timer đếm ngược session
  useEffect(() => {
    const timer = setInterval(() => {
      const currentSession = getStoredSession()
      setSession(currentSession)
      setRemainingSeconds(getRemainingSessionSeconds())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatSessionTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  const handleLogout = async () => {
    await logoutTeamsSession()
    setSession(null)
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

  // Danh sách trạng thái cho Dropdown
  const statusOptions: DropdownOption[] = [
    { value: "all", label: "Tất cả trạng thái" },
    {
      value: "Đang thực hiện",
      label: "Đang thực hiện",
      badge: <span className={`w-2 h-2 rounded-full ${getStatusConfig("Đang thực hiện").dotColor} flex-shrink-0`} />,
    },
    {
      value: "Hoàn thành",
      label: "Hoàn thành",
      badge: <span className={`w-2 h-2 rounded-full ${getStatusConfig("Hoàn thành").dotColor} flex-shrink-0`} />,
    },
    {
      value: "Đang phân loại",
      label: "Đang phân loại",
      badge: <span className={`w-2 h-2 rounded-full ${getStatusConfig("Đang phân loại").dotColor} flex-shrink-0`} />,

    },
    {
      value: "Đã gửi",
      label: "Đã gửi",
      badge: <span className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />,
    },
  ]

  const rowsPerPageOptions: DropdownOption[] = [
    { value: "6", label: "6" },
    { value: "10", label: "10" },
    { value: "20", label: "20" },
    { value: "50", label: "50" },
  ]

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

    // 2. Lọc theo trạng thái
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter)
    }

    // 3. Lọc theo sản phẩm / queue
    if (productFilter !== "all") {
      list = list.filter((r) => r.product === productFilter)
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
          (r.current_phase && r.current_phase.toLowerCase().includes(q))
      )
    }

    return list
  }, [allRequests, session, statusFilter, productFilter, query])

  // Phân trang
  const totalItems = filteredRequests.length
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + rowsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [query, statusFilter, productFilter, rowsPerPage])

  // Render status dot badge (giữ nguyên kích thước chuẩn)
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

  const getDesignerAvatar = (name?: string) => {
    if (!name) return ""
    if (name.includes("Nam")) return "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80"
    if (name.includes("Cường")) return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
    if (name.includes("Lan")) return "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
    return ""
  }

  const formatLastUpdated = (req: UXRequest) => {
    if (req.latest_update?.date) return req.latest_update.date
    if (req.last_updated) return req.last_updated
    if (req.submitted_at) return req.submitted_at
    return "Gần đây"
  }



  const activeCount = allRequests.filter((r) => r.status === "Đang thực hiện").length
  const completedCount = allRequests.filter((r) => r.status === "Hoàn thành").length

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-16">
      {/* ReUI Data Table Container Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs">
        
        {/* Card Header: Title + Action Button */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {session?.role === "PO" ? "Danh sách yêu cầu của bạn" : "Danh sách yêu cầu"}
            </h1>
            <p className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-1.5">
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

          {totalItems > 0 && (
            <div className="flex items-center gap-3">
              {/* New Ticket / Request Button */}
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
                <span>Tạo yêu cầu</span>
              </Button>
            </div>
          )}
        </div>

        {/* Filter & Toolbar Bar (Căn trái toàn bộ công cụ) */}
        <div className="p-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5 w-full">
            {/* Search Input */}
            <div className="relative w-full sm:w-64 lg:w-72">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên task, mã..."
                startIcon={<Search className="w-4 h-4 text-slate-400" />}
                className="h-10 text-xs sm:text-sm bg-white rounded-xl border-slate-200"
              />
            </div>

            {/* ReUI All Queues / Product Custom Dropdown */}
            <DropdownMenu
              options={productOptions}
              value={productFilter}
              onChange={setProductFilter}
              placeholder="Tất cả sản phẩm"
              icon={<Layers className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto"
              buttonClassName="w-full sm:w-44"
            />

            {/* ReUI Status Filter Custom Dropdown */}
            <DropdownMenu
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Tất cả trạng thái"
              icon={<Filter className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto"
              buttonClassName="w-full sm:w-40"
            />

            {/* Nút Làm mới căn trái liền kề */}
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

        {/* ReUI Data Table (Co giãn linh hoạt không bị scrollbar) */}
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
                    <tr
                      key={req.request_id}
                      onClick={() => setSelectedRequest(req)}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-[#F9FAFC]"
                      } hover:bg-blue-50/50 transition-colors cursor-pointer group`}
                    >
                      {/* Cột 1: Tên task (cập nhật lần cuối x) - ID task có thể 3 chấm */}
                      <td className="py-3 px-3 sm:px-5">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-900 group-hover:text-[#1B3A6B] transition-colors leading-snug line-clamp-1 break-words">
                            {req.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
                            {/* Mã yêu cầu: có thể 3 chấm, cùng màu với cập nhật, letter-spacing -0.5% */}
                            <span className="font-mono text-slate-400 font-normal tracking-[-0.005em] truncate max-w-[85px] sm:max-w-[130px] shrink">
                              {req.request_id}
                            </span>
                            <span className="shrink-0">•</span>
                            <span className="truncate shrink-0">Cập nhật: {lastUpdatedStr}</span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Designer working (Tên có thể 3 chấm) */}
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

                      {/* Cột 3: Status (Giữ nguyên kích thước chuẩn) */}
                      <td className="py-3 px-2.5 sm:px-4">
                        {renderStatusBadge(req.status)}
                      </td>

                      {/* Cột 4: Tiến độ */}
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
                          {/* Progress bar theo màu giai đoạn UX */}
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
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center bg-white">
                    <EmptyState
                      title="Không tìm thấy bài toán nào"
                      description="Không có bài toán nào khớp với bộ lọc hiện tại. Hãy thử thay đổi từ khóa hoặc xóa bộ lọc."
                      secondaryAction={
                        query || productFilter !== "all" || statusFilter !== "all"
                          ? {
                              label: "Đặt lại bộ lọc",
                              onClick: () => {
                                setQuery("")
                                setProductFilter("all")
                                setStatusFilter("all")
                              },
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

        {/* Pagination Footer (Luôn nằm trên 1 hàng ngang duy nhất) */}
        <div className="p-4 sm:px-6 bg-white border-t border-slate-100 flex items-center justify-between gap-4 text-xs text-slate-500 overflow-x-auto">
          {/* Left: Rows per page custom selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span>Số dòng mỗi trang</span>
            <DropdownMenu
              options={rowsPerPageOptions}
              value={String(rowsPerPage)}
              onChange={(v) => setRowsPerPage(Number(v))}
              position="top"
              buttonClassName="h-8 px-2.5 bg-slate-50 text-xs font-semibold"
              menuClassName="w-20 min-w-[75px]"
            />
          </div>

          {/* Right: Page Indicator & Controls */}
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

              {/* Number buttons */}
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

      {/* POPUP MODAL XEM CHI TIẾT / HỒ SƠ YÊU CẦU */}
      <Dialog
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        size="2xl"
      >
        <DialogBody className="p-4 sm:p-6 max-h-[88vh] overflow-y-auto">
          {selectedRequest && (
            <RequestDetail
              request={selectedRequest}
              onBack={() => setSelectedRequest(null)}
              onUpdated={async () => {
                const reqs = await fetchRequests(true)
                setAllRequests(reqs)
                const found = reqs.find((r) => r.request_id === selectedRequest.request_id)
                if (found) setSelectedRequest(found)
              }}
            />
          )}
        </DialogBody>
      </Dialog>
    </main>
  )
}
export { TrackRequestPage }
