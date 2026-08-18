import { useState, useEffect } from "react"
import { Squad, mockRequests } from "../data/mockData"
import { fetchSquads } from "../api/api"
import SquadCapacityOverview from "../components/squad/SquadCapacityOverview"

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: number
  sub?: string
  color: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className={`text-xs font-medium mt-1 ${color}`}>{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
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
        <h1 className="text-2xl font-bold text-slate-900">Tổng quan hệ thống</h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Theo dõi trạng thái tổng thể của các yêu cầu UX và năng lực Squad.
        </p>
      </div>

      {/* Summary stats */}
      <section>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
          Tổng quan yêu cầu
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Tổng yêu cầu"
            value={total}
            sub="Toàn bộ"
            color="text-slate-600"
          />
          <StatCard
            label="Đang thực hiện"
            value={inProgress}
            sub="Đang trong luồng UX"
            color="text-blue-600"
          />
          <StatCard
            label="Đang phân loại"
            value={inTriage}
            sub="Chờ UX Lead xem xét"
            color="text-amber-600"
          />
          <StatCard
            label="Hoàn thành"
            value={completed}
            sub="Đã bàn giao"
            color="text-emerald-600"
          />
        </div>
      </section>

      {/* Squad workload stats */}
      {!loading && squads.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
            Khối lượng UX Squad
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Task đang thực hiện"
              value={totalActiveTasks}
              sub="Trên toàn bộ Squad"
              color="text-slate-600"
            />
            <StatCard
              label="Task trong hàng đợi"
              value={totalQueuedTasks}
              sub="Chờ được xử lý"
              color="text-slate-600"
            />
            <StatCard
              label="Squad hoạt động"
              value={squads.length}
              sub="UX Squad hiện có"
              color="text-slate-600"
            />
            <StatCard
              label="UX Owner"
              value={squads.filter((s) => s.ux_owner).length}
              sub="Đang phụ trách"
              color="text-slate-600"
            />
          </div>
        </section>
      )}

      {/* Squad capacity — read only, no detail modal */}
      <div className="border-t border-slate-200 pt-10">
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
