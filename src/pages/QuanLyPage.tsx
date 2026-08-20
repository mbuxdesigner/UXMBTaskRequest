import { useState, useEffect, useMemo } from "react"
import { UXRequest } from "../data/mockData"
import { fetchRequests, updateTaskProgress } from "../api/api"
import RequestCard from "../components/track/RequestCard"
import RequestDetail from "../components/track/RequestDetail"
import KanbanBoard from "../components/kanban/KanbanBoard"
import { DropdownMenu, DropdownOption } from "@/components/reui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogBody } from "@/components/ui/dialog"
import { EmptyState } from "@/components/reui/empty-state"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberTicker } from "@/components/jolyui/number-ticker"
import { getStatusConfig } from "@/config/statusConfig"
import { getUserInitials } from "@/services/otpAuthService"
import { 
  RefreshCw, 
  Search,
  LayoutGrid, 
  ListFilter, 
  Columns3,
  Layers,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Plus
} from "lucide-react"

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

export default function QuanLyPage() {
  const [requests, setRequests] = useState<UXRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<UXRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState("Tất cả")
  const [productFilter, setProductFilter] = useState("all")
  const [searchFilter, setSearchFilter] = useState("")
  const [viewMode, setViewMode] = useState<"kanban" | "grid" | "table">("kanban")

  // Pagination for Table View
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(6)

  const rowsPerPageOptions: DropdownOption[] = [
    { value: "6", label: "6" },
    { value: "10", label: "10" },
    { value: "20", label: "20" },
    { value: "50", label: "50" },
  ]

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.request_id === requestId) {
          const newProgress = newStatus === "Hoàn thành" ? 100 : newStatus === "Đang thực hiện" ? Math.max(r.progress, 30) : 10
          const newPhase = newStatus === "Hoàn thành" ? "Nghiệm thu & Bàn giao" : newStatus === "Đang thực hiện" ? "Đang thiết kế UX" : "Đã tiếp nhận"
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
      const target = requests.find((r) => r.request_id === requestId)
      if (target) {
        const newProgress = newStatus === "Hoàn thành" ? 100 : newStatus === "Đang thực hiện" ? Math.max(target.progress, 30) : 10
        const newPhase = newStatus === "Hoàn thành" ? "Nghiệm thu & Bàn giao" : newStatus === "Đang thực hiện" ? "Đang thiết kế UX" : "Đã tiếp nhận"
        await updateTaskProgress(requestId, {
          new_status: newStatus,
          new_phase: newPhase,
          new_progress: newProgress,
          note: `Trạng thái đã được chuyển sang [${newStatus}] qua Kanban Board.`,
          assigned_designer: target.assigned_designer,
        })
      }
    } catch (err) {
      console.error("Error updating status:", err)
    }
  }

  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await fetchRequests(forceRefresh)
      setRequests(data)
    } catch (err) {
      console.error("Error loading requests:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const productOptions: DropdownOption[] = useMemo(() => {
    const prods = Array.from(new Set(requests.map((r) => r.product).filter(Boolean)))
    return [
      { value: "all", label: "Tất cả sản phẩm" },
      ...prods.map((p) => ({
        value: p,
        label: p,
      })),
    ]
  }, [requests])

  const filteredByStatus =
    statusFilter === "Tất cả"
      ? requests
      : requests.filter((r) => {
          if (statusFilter === "Đang phân loại") {
            return r.status === "Đang phân loại" || r.status === "Chờ tiếp nhận" || r.status === "Đã gửi"
          }
          return r.status === statusFilter
        })

  const filteredByProduct =
    productFilter === "all"
      ? filteredByStatus
      : filteredByStatus.filter((r) => r.product === productFilter)

  const filtered = searchFilter.trim()
    ? filteredByProduct.filter(
        (r) =>
          r.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
          r.request_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
          r.product.toLowerCase().includes(searchFilter.toLowerCase()) ||
          (r.assigned_designer && r.assigned_designer.toLowerCase().includes(searchFilter.toLowerCase())) ||
          r.requester_email.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : filteredByProduct

  const getCount = (status: string) => {
    if (status === "Tất cả") return requests.length
    if (status === "Đang phân loại") {
      return requests.filter((r) => r.status === "Đang phân loại" || r.status === "Chờ tiếp nhận" || r.status === "Đã gửi").length
    }
    return requests.filter((r) => r.status === status).length
  }

  const activeCount = requests.filter((r) => r.status === "Đang thực hiện").length
  const completedCount = requests.filter((r) => r.status === "Hoàn thành").length
  const totalItems = filtered.length

  // Pagination for table view
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedRequests = filtered.slice(startIndex, startIndex + rowsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchFilter, statusFilter, productFilter, rowsPerPage])

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

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-16">
      {/* Top Header matching Create Task clean style */}
      <div className="border-b border-slate-200/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý yêu cầu & Tiến độ UX
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium flex flex-wrap items-center gap-1.5">
            <span>
              <NumberTicker value={requests.length} className="font-bold text-slate-800" /> bài toán tổng thể
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            loading={refreshing}
            className="h-10 text-xs gap-1.5 bg-white border-slate-200 rounded-xl text-slate-600 font-semibold cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {/* Unified Container Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">

        {/* Unified Filter & Toolbar Bar */}
        <div className="p-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            {/* Left: Status Filter Tabs */}
            <div className="overflow-x-auto pb-1 lg:pb-0">
              <Tabs value={statusFilter} onValueChange={setStatusFilter} variant="pills">
                <TabsList className="bg-slate-100/90 p-1 rounded-xl">
                  {STATUS_FILTERS.map((f) => (
                    <TabsTrigger
                      key={f}
                      value={f}
                      badge={getCount(f)}
                      className="text-xs rounded-lg font-semibold"
                    >
                      {f}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Right: Search, Product Dropdown, View Mode Switcher */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative w-full sm:w-56 lg:w-60">
                <Input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Lọc theo tên, mã ID, squad..."
                  startIcon={<Search className="w-4 h-4 text-slate-400" />}
                  className="h-10 text-xs sm:text-sm bg-white rounded-xl border-slate-200"
                />
              </div>

              {/* Product dropdown */}
              <DropdownMenu
                options={productOptions}
                value={productFilter}
                onChange={setProductFilter}
                placeholder="Tất cả sản phẩm"
                icon={<Layers className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto"
                buttonClassName="w-full sm:w-40 h-10 text-xs font-semibold"
              />

              {/* View Mode Switcher: Kanban | Lưới | Bảng */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setViewMode("kanban")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 px-2.5 text-xs ${
                    viewMode === "kanban" ? "bg-white text-[#1057FB] shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Bảng Kanban kéo thả"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  <span className="font-semibold">Kanban</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 px-2.5 text-xs ${
                    viewMode === "grid" ? "bg-white text-[#1057FB] shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Dạng lưới thẻ"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="font-semibold">Lưới</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 px-2.5 text-xs ${
                    viewMode === "table" ? "bg-white text-[#1057FB] shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Dạng bảng chi tiết"
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span className="font-semibold">Bảng</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body based on View Mode */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-6 h-28 bg-slate-50 rounded-2xl animate-pulse border border-slate-100">
                  <div className="h-4 bg-slate-200/80 rounded w-1/4 mb-3" />
                  <div className="h-5 bg-slate-200/80 rounded w-1/2 mb-4" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 bg-white text-center">
              <EmptyState
                title={requests.length === 0 ? "Chưa có bài toán nào" : "Không có bài toán phù hợp bộ lọc"}
                description={
                  requests.length === 0
                    ? "Dữ liệu được đồng bộ từ Google Sheet. Hãy tạo bài toán đầu tiên để bắt đầu quản lý!"
                    : "Hiện không có bài toán nào khớp với từ khóa tìm kiếm hoặc bộ lọc đã chọn."
                }
                secondaryAction={
                  searchFilter || statusFilter !== "Tất cả" || productFilter !== "all"
                    ? {
                        label: "Đặt lại bộ lọc",
                        onClick: () => {
                          setSearchFilter("")
                          setStatusFilter("Tất cả")
                          setProductFilter("all")
                        },
                        icon: <RefreshCw className="w-4 h-4" />,
                      }
                    : undefined
                }
              />
            </div>
          ) : viewMode === "kanban" ? (
            <KanbanBoard
              requests={filtered}
              onSelectRequest={setSelectedRequest}
              onUpdateStatus={handleUpdateStatus}
            />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((r) => (
                <RequestCard key={r.request_id} request={r} onClick={setSelectedRequest} />
              ))}
            </div>
          ) : (
            /* Table View - Exactly synchronized with TrackRequestPage table format */
            <div className="border border-slate-200/80 rounded-xl overflow-hidden">
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
                    {paginatedRequests.map((req, index) => {
                      const displayName = formatDesignerDisplayName(req.assigned_designer || req.ux_owner)
                      const designerAvatar = getDesignerAvatar(displayName)
                      const avatarColorClass = getAvatarColorClass(displayName)
                      const progressVal = req.progress || (req.status === "Hoàn thành" ? 100 : req.status === "Đang thực hiện" ? 55 : 15)
                      const lastUpdatedStr = formatLastUpdated(req)

                      return (
                        <tr
                          key={`${req.request_id}-${index}`}
                          onClick={() => setSelectedRequest(req)}
                          className={`${
                            index % 2 === 0 ? "bg-white" : "bg-[#F9FAFC]"
                          } hover:bg-blue-50/50 transition-colors cursor-pointer group`}
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
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer for Table View */}
              <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-4 text-xs text-slate-500 overflow-x-auto">
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
          )}
        </div>

      </div>

      {/* POPUP MODAL XEM CHI TIẾT HỒ SƠ YÊU CẦU */}
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
                await loadData(true)
                const updated = await fetchRequests()
                const found = updated.find((r) => r.request_id === selectedRequest.request_id)
                if (found) setSelectedRequest(found)
              }}
            />
          )}
        </DialogBody>
      </Dialog>
    </main>
  )
}
export { QuanLyPage }
