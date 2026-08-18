import { Squad, CapacityStatus, deriveCapacityStatus } from "../../data/mockData"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ArrowRight, UserCheck } from "lucide-react"

interface SquadCapacityCardProps {
  squad: Squad
  onViewDetails?: (squad: Squad) => void
  interactive?: boolean
}

const statusBadgeVariant: Record<CapacityStatus, "success" | "warning" | "destructive" | "default"> = {
  "Sẵn sàng": "success",
  "Bình thường": "warning",
  "Đang bận": "warning",
  "Quá tải": "destructive",
}

const progressVariant: Record<CapacityStatus, "success" | "warning" | "destructive" | "default"> = {
  "Sẵn sàng": "success",
  "Bình thường": "warning",
  "Đang bận": "warning",
  "Quá tải": "destructive",
}

export default function SquadCapacityCard({
  squad,
  onViewDetails,
  interactive = true,
}: SquadCapacityCardProps) {
  const status = deriveCapacityStatus(squad)
  const total = squad.active_tasks + squad.queued_tasks
  const pct = Math.min(100, Math.round((total / squad.capacity_threshold) * 100))

  return (
    <Card className="flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200">
      <CardContent className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm leading-snug truncate">
              {squad.squad_name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{squad.domain}</p>
          </div>
          <Badge variant={statusBadgeVariant[status] || "default"} dot size="sm">
            {status}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Khối lượng công việc</span>
            <span className="font-semibold text-slate-800">{pct}%</span>
          </div>
          <Progress 
            value={pct} 
            variant={progressVariant[status] || "default"} 
            size="sm" 
          />
        </div>

        <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 items-center text-center">
          <div>
            <p className="text-lg font-bold text-slate-900 leading-none">{squad.active_tasks}</p>
            <p className="text-[11px] text-slate-400 mt-1">Đang làm</p>
          </div>
          <div className="border-x border-slate-100 px-1">
            <p className="text-lg font-bold text-slate-900 leading-none">{squad.queued_tasks}</p>
            <p className="text-[11px] text-slate-400 mt-1">Hàng đợi</p>
          </div>
          <div className="min-w-0 px-1">
            <p className="text-xs font-semibold text-slate-800 leading-none truncate flex items-center justify-center gap-1">
              <UserCheck className="w-3 h-3 text-teal flex-shrink-0" />
              <span className="truncate">{squad.ux_owner.split(" ")[0]}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">UX Owner</p>
          </div>
        </div>

        {interactive && onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(squad)}
            className="mt-auto w-full group"
          >
            <span>Xem chi tiết</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-navy group-hover:translate-x-0.5 transition-all" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
