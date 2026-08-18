import { Squad, CapacityStatus, deriveCapacityStatus } from "../../data/mockData"

interface SquadCapacityCardProps {
  squad: Squad
  onViewDetails?: (squad: Squad) => void
  interactive?: boolean
}

const statusConfig: Record<
  CapacityStatus,
  { dot: string; bar: string; text: string; bg: string; border: string }
> = {
  "Sẵn sàng": {
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  "Bình thường": {
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  "Đang bận": {
    dot: "bg-orange-500",
    bar: "bg-orange-500",
    text: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  "Quá tải": {
    dot: "bg-red-500",
    bar: "bg-red-500",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
}

export default function SquadCapacityCard({
  squad,
  onViewDetails,
  interactive = true,
}: SquadCapacityCardProps) {
  const status = deriveCapacityStatus(squad)
  const cfg = statusConfig[status] ?? statusConfig["Sẵn sàng"]
  const total = squad.active_tasks + squad.queued_tasks
  const pct = Math.min(100, Math.round((total / squad.capacity_threshold) * 100))

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 hover:border-slate-300 hover:shadow-sm transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 text-sm leading-snug truncate">
            {squad.squad_name}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{squad.domain}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 border ${cfg.bg} ${cfg.text} ${cfg.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
          {status}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">Khối lượng công việc</span>
          <span className="text-xs font-medium text-slate-700">{pct}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div>
          <p className="text-lg font-semibold text-slate-900 leading-none">{squad.active_tasks}</p>
          <p className="text-xs text-slate-500 mt-0.5">Đang làm</p>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div>
          <p className="text-lg font-semibold text-slate-900 leading-none">{squad.queued_tasks}</p>
          <p className="text-xs text-slate-500 mt-0.5">Hàng đợi</p>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 leading-none truncate">{squad.ux_owner}</p>
          <p className="text-xs text-slate-500 mt-0.5">UX Owner</p>
        </div>
      </div>

      {interactive && onViewDetails && (
        <button
          onClick={() => onViewDetails(squad)}
          className="mt-auto w-full py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:border-navy hover:text-navy hover:bg-navy-50 transition-all duration-150"
        >
          Xem chi tiết
        </button>
      )}
    </div>
  )
}
