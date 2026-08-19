import { useState, useEffect } from "react"
import { UXRequest } from "../data/mockData"
import { fetchRequests } from "../api/api"
import RequestCard from "../components/track/RequestCard"
import RequestDetail from "../components/track/RequestDetail"
import { Frame, FrameHeader, FrameTitle, FrameDescription, FrameBody, FrameActions } from "@/components/reui/frame"
import { IconTile } from "@/components/reui/icon-tile"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
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
  Calendar
} from "lucide-react"

const STATUS_FILTERS = ["Tất cả", "Đang thực hiện", "Đang phân loại", "Hoàn thành"]

const statusBadgeVariant: Record<
  string,
  { variant: "info" | "warning" | "success" | "purple" | "secondary" | "navy" | "teal"; dotColor?: string }
> = {
  "Đang thực hiện": { variant: "navy", dotColor: "bg-[#1B3A6B]" },
  "Đang phân loại": { variant: "warning", dotColor: "bg-amber-500" },
  "Đang khám phá": { variant: "purple", dotColor: "bg-purple-500" },
  "Hoàn thành": { variant: "success", dotColor: "bg-emerald-500" },
  "Đã gửi": { variant: "secondary", dotColor: "bg-slate-400" },
}

export default function QuanLyPage() {
  const [requests, setRequests] = useState<UXRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<UXRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState("Tất cả")
  const [searchFilter, setSearchFilter] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

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

  if (selectedRequest) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
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
      </main>
    )
  }

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
          <div className="flex items-center gap-2">
            <Badge variant="navy" size="xs">Quản lý tổng thể</Badge>
            <span className="text-xs text-slate-400 font-medium">Bảng điều phối Design Tasks</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
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
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "grid" ? "bg-white text-[#1B3A6B] shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Dạng lưới thẻ"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "table" ? "bg-white text-[#1B3A6B] shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Dạng bảng chi tiết"
              >
                <ListFilter className="w-4 h-4" />
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
        <Frame className="max-w-md mx-auto text-center p-10 bg-white" variant="flat">
          <div className="space-y-3">
            <IconTile size="lg" variant="default" className="mx-auto text-slate-400">
              <Inbox className="w-6 h-6" />
            </IconTile>
            <h3 className="font-bold text-slate-800 text-base">
              {requests.length === 0 ? "Chưa có yêu cầu nào trên Google Sheet" : "Không có yêu cầu phù hợp bộ lọc"}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              {requests.length === 0
                ? "Dữ liệu được đọc trực tiếp từ Google Sheet. Hãy tạo yêu cầu đầu tiên tại tab 'Tạo yêu cầu'!"
                : `Hiện không có yêu cầu nào khớp với trạng thái "${statusFilter}".`}
            </p>
          </div>
        </Frame>
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
                const statusCfg = statusBadgeVariant[r.status] ?? {
                  variant: "secondary",
                  dotColor: "bg-slate-400",
                }
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
    </main>
  )
}
export { QuanLyPage }
