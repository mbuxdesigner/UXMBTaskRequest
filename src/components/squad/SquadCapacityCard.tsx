import { Squad, CapacityStatus, deriveCapacityStatus } from "../../data/mockData"
import { Frame } from "@/components/reui/frame"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { getCapacityStatusConfig } from "@/config/statusConfig"
import { ArrowRight, UserCheck, Layers, Clock, Activity, CheckCircle2 } from "lucide-react"

interface SquadCapacityCardProps {
  squad: Squad
  onViewDetails?: (squad: Squad) => void
  interactive?: boolean
}

export default function SquadCapacityCard({
  squad,
  onViewDetails,
  interactive = true,
}: SquadCapacityCardProps) {
  const status = deriveCapacityStatus(squad)
  const statusConfig = getCapacityStatusConfig(status)
  const total = squad.active_tasks + squad.queued_tasks
  const pct = Math.min(100, Math.round((total / squad.capacity_threshold) * 100))

  return (
    <Frame
      variant="default"
      padding="none"
      className="flex flex-col hover:border-[#1B3A6B]/40 hover:shadow-lg transition-all duration-200 group bg-white relative overflow-hidden"
    >
      {/* Top accent status indicator line */}
      <div
        className={`h-1 w-full ${
          status === "Sẵn sàng"
            ? "bg-emerald-500"
            : status === "Bình thường"
            ? "bg-blue-500"
            : status === "Đang bận"
            ? "bg-amber-500"
            : "bg-rose-500"
        }`}
      />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Squad header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900 text-base leading-snug group-hover:text-[#1B3A6B] transition-colors truncate">
              {squad.squad_name}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{squad.domain}</p>
          </div>
          <Badge
            variant={statusConfig.variant}
            dot
            dotColor={statusConfig.dotColor}
            size="xs"
            className="font-bold"
          >
            {status}
          </Badge>
        </div>

        {/* Capacity utilization */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#1B3A6B]" />
              Tải trọng định mức
            </span>
            <span className="font-bold text-slate-900">{pct}%</span>
          </div>
          <Progress
            value={pct}
            variant={
              status === "Sẵn sàng"
                ? "success"
                : status === "Quá tải"
                ? "destructive"
                : "default"
            }
            size="sm"
          />
        </div>

        {/* Task Counts Summary */}
        <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100 items-center text-center">
          <div>
            <p className="text-lg font-bold text-slate-900 leading-none">{squad.active_tasks}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Đang làm</p>
          </div>
          <div className="border-x border-slate-200 px-1">
            <p className="text-lg font-bold text-slate-900 leading-none">{squad.queued_tasks}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Hàng đợi</p>
          </div>
          <div className="min-w-0 px-1">
            <p className="text-xs font-bold text-[#1B3A6B] leading-none truncate flex items-center justify-center gap-1">
              <UserCheck className="w-3 h-3 text-[#0D9B97] shrink-0" />
              <span className="truncate">{squad.ux_owner.split(" ")[0]}</span>
            </p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">UX Lead</p>
          </div>
        </div>

        {/* Details action button */}
        {interactive && onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(squad)}
            className="mt-auto w-full justify-between font-semibold text-xs rounded-xl group-hover:border-[#1B3A6B]/30"
          >
            <span>Chi tiết năng lực Squad</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1B3A6B] group-hover:translate-x-0.5 transition-all" />
          </Button>
        )}
      </div>
    </Frame>
  )
}
export { SquadCapacityCard }
