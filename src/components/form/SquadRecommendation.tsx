import { Squad, deriveCapacityStatus, CapacityStatus } from "../../data/mockData"

interface SquadRecommendationProps {
  recommendedSquad: Squad | null
  squads: Squad[]
  preferredSquad: string
  onPreferredChange: (name: string) => void
}

const statusColors: Record<CapacityStatus, string> = {
  "Sẵn sàng": "text-emerald-600",
  "Bình thường": "text-amber-600",
  "Đang bận": "text-orange-600",
  "Quá tải": "text-red-600",
}

export default function SquadRecommendation({
  recommendedSquad,
}: SquadRecommendationProps) {
  if (!recommendedSquad) return null

  const status = deriveCapacityStatus(recommendedSquad)
  const statusColor = statusColors[status] ?? statusColors["Sẵn sàng"]

  return (
    <div className="bg-navy-50 border border-navy-100 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-navy bg-navy/10 px-2 py-0.5 rounded">
              UX Squad phụ trách
            </span>
            <p className="font-bold text-base text-slate-900">{recommendedSquad.squad_name}</p>
          </div>
          <p className="text-xs text-slate-500">
            {recommendedSquad.domain || `Phụ trách các tính năng thuộc phân hệ ${recommendedSquad.squad_name}`}
          </p>
        </div>

        <div className="text-left sm:text-right flex-shrink-0 bg-white/70 sm:bg-transparent p-2.5 sm:p-0 rounded-lg">
          <p className="text-xs text-slate-500 mb-0.5">Khối lượng Squad hiện tại</p>
          <p className="text-xs font-semibold text-slate-800">
            {recommendedSquad.active_tasks} đang làm · {recommendedSquad.queued_tasks} chờ ·{" "}
            <span className={`font-bold ${statusColor}`}>{status}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
