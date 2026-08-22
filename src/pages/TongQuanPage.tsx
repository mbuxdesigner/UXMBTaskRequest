import { useState, useEffect } from "react"
import { Squad, UXRequest } from "../data/mockData"
import { fetchSquads, fetchRequests } from "../api/api"
import SquadCapacityOverview from "../components/squad/SquadCapacityOverview"
import RequestCard from "../components/track/RequestCard"
import RequestDetail from "../components/track/RequestDetail"
import { Frame, FrameHeader, FrameTitle, FrameDescription, FrameBody, FrameActions } from "@/components/reui/frame"
import { IconTile } from "@/components/reui/icon-tile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { 
  Layers, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Boxes, 
  Activity,
  BarChart3,
  RefreshCw,
  Sparkles,
  TrendingUp,
  ArrowRight,
  ShieldCheck
} from "lucide-react"

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  variant = "default",
  trend,
}: {
  label: string
  value: number
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  variant?: "navy" | "teal" | "emerald" | "amber" | "purple" | "blue"
  trend?: string
}) {
  return (
    <Frame variant="default" padding="default" className="relative overflow-hidden group hover:border-[#1B3A6B]/30 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <IconTile variant={variant} size="default">
          <Icon className="w-5 h-5" />
        </IconTile>
        {trend && (
          <Badge variant="success" size="xs" className="font-bold gap-1">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </Badge>
        )}
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-500 font-medium pt-0.5">{sub}</p>}
      </div>
    </Frame>
  )
}

export default function TongQuanPage() {
  const [squads, setSquads] = useState<Squad[]>([])
  const [requests, setRequests] = useState<UXRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<UXRequest | null>(null)

  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const [squadsData, requestsData] = await Promise.all([
        fetchSquads(),
        fetchRequests(forceRefresh),
      ])
      setSquads(squadsData)
      setRequests(requestsData)
    } catch {
      setError("Không thể tải dữ liệu từ Google Sheet.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const total = requests.length
  const inProgress = requests.filter((r) => r.status === "Đang thực hiện").length
  const completed = requests.filter((r) => r.status === "Hoàn thành").length
  const inTriage = requests.filter((r) => r.status === "Đang phân loại" || r.status === "Chờ tiếp nhận").length

  const totalActiveTasks = squads.reduce((s, q) => s + q.active_tasks, 0)
  const totalQueuedTasks = squads.reduce((s, q) => s + q.queued_tasks, 0)
  const recentRequests = requests.slice(0, 4)

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-16">
      {/* Top Header matching Create Task clean style */}
      <div className="border-b border-slate-200/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="navy" size="xs" dot dotColor="bg-emerald-400" dotPulse>
              Hệ thống trực tuyến
            </Badge>
            <span className="text-xs text-slate-400 font-medium">Đồng bộ Google Sheet realtime</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Tổng quan Hệ sinh thái UX MB
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Theo dõi khối lượng yêu cầu, công suất tiếp nhận của các Squad và sản phẩm bàn giao thiết kế.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            loading={refreshing}
            className="gap-2 font-semibold text-xs rounded-xl bg-white border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Làm mới dữ liệu</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" onDismiss={() => setError(null)}>
          <AlertTitle>Lỗi kết nối dữ liệu</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* KPI Stats Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#1B3A6B]" />
            Chỉ số vận hành yêu cầu UX ({total} yêu cầu)
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Tổng yêu cầu"
            value={total}
            sub="Đã tiếp nhận vào cổng"
            icon={Layers}
            variant="navy"
            trend="+18%"
          />
          <StatCard
            label="Đang thiết kế"
            value={inProgress}
            sub="Trong các khâu UX/UI"
            icon={Clock}
            variant="blue"
          />
          <StatCard
            label="Đang phân loại"
            value={inTriage}
            sub="Chờ Squad tiếp nhận"
            icon={AlertCircle}
            variant="amber"
          />
          <StatCard
            label="Đã hoàn thành"
            value={completed}
            sub="Đã bàn giao Design Spec"
            icon={CheckCircle2}
            variant="emerald"
            trend="+24%"
          />
        </div>
      </section>

      {/* Squad Workload Stats */}
      {!loading && squads.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#0D9B97]" />
              Năng lực & Tải trọng 4 UX Squads
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Task đang thực hiện"
              value={totalActiveTasks}
              sub="Phân bổ trên 4 Squad"
              icon={Activity}
              variant="teal"
            />
            <StatCard
              label="Hàng đợi (Backlog)"
              value={totalQueuedTasks}
              sub="Yêu cầu chờ xử lý"
              icon={Clock}
              variant="amber"
            />
            <StatCard
              label="UX Squads"
              value={squads.length}
              sub="Đang vận hành chuyên sâu"
              icon={Boxes}
              variant="purple"
            />
            <StatCard
              label="UX Design Leads"
              value={squads.filter((s) => s.ux_owner).length}
              sub="Chịu trách nhiệm trực tiếp"
              icon={Users}
              variant="emerald"
            />
          </div>
        </section>
      )}

      {/* Recent Requests Section */}
      {recentRequests.length > 0 && (
        <Frame variant="default">
          <FrameHeader>
            <FrameTitle>
              <IconTile size="xs" variant="navy"><Sparkles className="w-3.5 h-3.5" /></IconTile>
              Yêu cầu thiết kế cập nhật gần nhất
            </FrameTitle>
            <FrameDescription>
              Các yêu cầu UX đang trong giai đoạn triển khai hoặc vừa được tạo mới.
            </FrameDescription>
          </FrameHeader>
          <FrameBody className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentRequests.map((req) => (
                <RequestCard
                  key={req.request_id}
                  request={req}
                  onClick={setSelectedRequest}
                />
              ))}
            </div>
          </FrameBody>
        </Frame>
      )}

      {/* Squad Capacity Overview Component */}
      <div className="pt-4 border-t border-slate-200/80">
        <SquadCapacityOverview
          squads={squads}
          loading={loading}
          error={error}
          interactive={true}
        />
      </div>

      {/* Slide-over Drawer Xem chi tiết bài toán */}
      <RequestDetail
        open={Boolean(selectedRequest)}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onUpdated={async () => {
          await loadData(true)
          const allReqs = await fetchRequests()
          const found = allReqs.find((r) => r.request_id === selectedRequest?.request_id)
          if (found) setSelectedRequest(found)
        }}
      />
    </main>
  )
}
