import { useState, useEffect } from "react"
import { UXRequest } from "../data/mockData"
import { fetchRequests, updateTaskProgress } from "../api/api"
import RequestCard from "../components/track/RequestCard"
import RequestDetail from "../components/track/RequestDetail"
import KanbanBoard from "../components/kanban/KanbanBoard"
import { Frame, FrameHeader, FrameTitle, FrameDescription, FrameBody, FrameActions } from "@/components/reui/frame"
import { IconTile } from "@/components/reui/icon-tile"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogBody } from "@/components/ui/dialog"
import { EmptyState } from "@/components/reui/empty-state"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { getStatusConfig } from "@/config/statusConfig"
import { 
  FolderKanban, 
  Inbox, 
  RefreshCw, 
  Sparkles, 
  Filter, 
  LayoutGrid, 
  ListFilter, 
  Search,
  ArrowUpRight,
  UserCheck,
  Calendar,
  Columns3
} from "lucide-react"

const STATUS_FILTERS = ["Tất cả", "Đang thực hiện", "Đang phân loại", "Hoàn thành"]

export default function QuanLyPage() {
  const [requests, setRequests] = useState<UXRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<UXRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState("Tất cả")
  const [searchFilter, setSearchFilter] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table" | "kanban">("kanban")

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    // Optimistic update
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



  const filteredByStatus =
    statusFilter === "Tất cả"
      ? requests
      : requests.filter((r) => r.status === statusFilter)

  const filtered = searchFilter.trim()
    ? filteredByStatus.filter(
        (r) =>
          r.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
          r.request_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
          r.product.toLowerCase().includes(searchFilter.toLowerCase()) ||
          r.requester_email.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : filteredByStatus

  const getCount = (status: string) => {
    if (status === "Tất cả") return requests.length
    return requests.filter((r) => r.status === status).length
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý yêu cầu & Tiến độ UX
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Giám sát, phân loại và điều phối các bài toán trải nghiệm của toàn bộ các Squad MBBank.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            loading={refreshing}
            className="gap-2 font-semibold text-xs rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Frame className="p-4 sm:p-5 bg-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="overflow-x-auto pb-1 md:pb-0">
            <Tabs value={statusFilter} onValueChange={setStatusFilter} variant="pills">
              <TabsList>
                {STATUS_FILTERS.map((f) => (
                  <TabsTrigger
                    key={f}
                    value={f}
                    badge={getCount(f)}
                  >
                    {f}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* View switch & search */}
          <div className="flex items-center gap-2.5">
            <div className="relative min-w-[220px]">
              <Input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Lọc theo tên, mã ID, squad..."
                startIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                className="h-10 text-xs rounded-lg"
              />
            </div>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 px-2.5 text-xs ${
                  viewMode === "kanban" ? "bg-white text-[#1B3A6B] shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Bảng Kanban kéo thả"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-semibold">Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 px-2.5 text-xs ${
                  viewMode === "grid" ? "bg-white text-[#1B3A6B] shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Dạng lưới thẻ"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-semibold">Lưới</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 px-2.5 text-xs ${
                  viewMode === "table" ? "bg-white text-[#1B3A6B] shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Dạng bảng chi tiết"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-semibold">Bảng</span>
              </button>
            </div>
          </div>
        </div>
      </Frame>

      {/* Loading state */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Frame key={i} className="p-6 h-32 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/4 mb-3" />
              <div className="h-5 bg-slate-100 rounded w-1/2 mb-4" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
            </Frame>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Frame className="bg-white py-4" variant="flat">
          <EmptyState
            title={requests.length === 0 ? "Chưa có bài toán nào" : "Không có bài toán phù hợp bộ lọc"}
            description={
              requests.length === 0
                ? "Dữ liệu được đồng bộ từ Google Sheet. Hãy tạo bài toán đầu tiên để bắt đầu quản lý!"
                : `Hiện không có bài toán nào khớp với từ khóa tìm kiếm hoặc bộ lọc đã chọn.`
            }
            secondaryAction={
              searchFilter || statusFilter !== "Tất cả"
                ? {
                    label: "Đặt lại bộ lọc",
                    onClick: () => {
                      setSearchFilter("")
                      setStatusFilter("Tất cả")
                    },
                    icon: <RefreshCw className="w-4 h-4" />,
                  }
                : undefined
            }
          />
        </Frame>
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
        <Frame variant="default" padding="none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Mã ID</TableHead>
                <TableHead>Tiêu đề yêu cầu</TableHead>
                <TableHead>Sản phẩm / Squad</TableHead>
                <TableHead>Giai đoạn</TableHead>
                <TableHead className="w-28 text-center">Tiến độ</TableHead>
                <TableHead className="w-32 text-center">Trạng thái</TableHead>
                <TableHead className="w-24 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const statusCfg = getStatusConfig(r.status)
                return (
                  <TableRow
                    key={r.request_id}
                    onClick={() => setSelectedRequest(r)}
                    className="cursor-pointer group"
                  >
                    <TableCell className="font-mono font-bold text-xs text-[#1B3A6B]">
                      {r.request_id}
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-900 group-hover:text-[#1B3A6B] transition-colors line-clamp-1">
                        {r.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {r.requester_email}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" size="xs" className="text-slate-700">
                        {r.product}
                      </Badge>
                      <p className="text-[11px] text-slate-500 mt-1 truncate">{r.squad_name}</p>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800">
                      {r.current_phase}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-center">
                        <span className="text-xs font-bold text-slate-900">{r.progress}%</span>
                        <Progress value={r.progress} size="sm" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={statusCfg.variant}
                        dot
                        dotColor={statusCfg.dotColor}
                        size="xs"
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="iconSm"
                        className="group-hover:bg-[#1B3A6B] group-hover:text-white"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Frame>
      )}

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
