import { useState, useEffect } from "react"
import { Squad, mockRequests } from "../data/mockData"
import { fetchSquads } from "../api/api"
import SquadCapacityOverview from "../components/squad/SquadCapacityOverview"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Layers, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Boxes, 
  Activity,
  BarChart3
} from "lucide-react"

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  variant = "default",
}: {
  label: string
  value: number
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  variant?: "default" | "info" | "warning" | "success" | "navy"
}) {
  const iconColor = {
    default: "text-slate-600 bg-slate-100",
    info: "text-blue-600 bg-blue-50",
    warning: "text-amber-600 bg-amber-50",
    success: "text-emerald-600 bg-emerald-50",
    navy: "text-navy bg-navy-50",
  }[variant]

  return (
    <Card className="hover:shadow-md hover:border-slate-300 transition-all">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <Badge variant={variant === "default" ? "secondary" : variant} size="sm">
            {label}
          </Badge>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export default function TongQuanPage() {
  const [squads, setSquads] = useState<Squad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSquads()
      .then(setSquads)
      .catch(() => setError("Không thể tải dữ liệu Squad."))
      .finally(() => setLoading(false))
  }, [])

  const total = mockRequests.length
  const inProgress = mockRequests.filter((r) => r.status === "Đang thực hiện").length
  const completed = mockRequests.filter((r) => r.status === "Hoàn thành").length
  const inTriage = mockRequests.filter((r) => r.status === "Đang phân loại").length

  const totalActiveTasks = squads.reduce((s, q) => s + q.active_tasks, 0)
  const totalQueuedTasks = squads.reduce((s, q) => s + q.queued_tasks, 0)

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="navy" size="sm">Tổng quan</Badge>
          <span className="text-xs text-slate-400">Dashboard thời gian thực</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Tổng quan hệ thống</h1>
        <p className="text-sm text-slate-500 mt-1">
          Theo dõi trạng thái tổng thể của các yêu cầu UX và năng lực tiếp nhận của từng Squad.
        </p>
      </div>

      {/* Summary stats */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-navy" />
            Tổng quan yêu cầu
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Tổng yêu cầu"
            value={total}
            sub="Toàn bộ yêu cầu trong hệ thống"
            icon={Layers}
            variant="default"
          />
          <StatCard
            label="Đang thực hiện"
            value={inProgress}
            sub="Đang trong quy trình thiết kế UX"
            icon={Clock}
            variant="info"
          />
          <StatCard
            label="Đang phân loại"
            value={inTriage}
            sub="Chờ UX Lead & Squad tiếp nhận"
            icon={AlertCircle}
            variant="warning"
          />
          <StatCard
            label="Hoàn thành"
            value={completed}
            sub="Đã bàn giao và nghiệm thu"
            icon={CheckCircle2}
            variant="success"
          />
        </div>
      </section>

      {/* Squad workload stats */}
      {!loading && squads.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-teal" />
              Khối lượng UX Squad
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Task đang làm"
              value={totalActiveTasks}
              sub="Trên tất cả các Squad"
              icon={Activity}
              variant="navy"
            />
            <StatCard
              label="Hàng đợi (Queue)"
              value={totalQueuedTasks}
              sub="Yêu cầu đang chờ xử lý"
              icon={Clock}
              variant="warning"
            />
            <StatCard
              label="Squad hoạt động"
              value={squads.length}
              sub="Phân hệ số đang vận hành"
              icon={Boxes}
              variant="default"
            />
            <StatCard
              label="UX Lead / Owner"
              value={squads.filter((s) => s.ux_owner).length}
              sub="Đang phụ trách trực tiếp"
              icon={Users}
              variant="success"
            />
          </div>
        </section>
      )}

      {/* Squad capacity */}
      <div className="border-t border-slate-200 pt-8">
        <SquadCapacityOverview
          squads={squads}
          loading={loading}
          error={error}
          interactive={false}
        />
      </div>
    </main>
  )
}
