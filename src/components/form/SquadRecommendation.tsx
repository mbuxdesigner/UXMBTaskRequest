import { Squad, deriveCapacityStatus } from "../../data/mockData"
import { Frame, FrameBody } from "@/components/reui/frame"
import { Badge } from "@/components/ui/badge"
import { IconTile } from "@/components/reui/icon-tile"
import { Sparkles, Activity, ShieldCheck, Users } from "lucide-react"

interface SquadRecommendationProps {
  recommendedSquad: Squad | null
  squads: Squad[]
  preferredSquad: string
  onPreferredChange: (name: string) => void
}

const statusBadgeVariant: Record<
  string,
  { variant: "success" | "warning" | "destructive" | "default"; dotColor?: string }
> = {
  "Sẵn sàng": { variant: "success", dotColor: "bg-emerald-500" },
  "Bình thường": { variant: "warning", dotColor: "bg-amber-500" },
  "Đang bận": { variant: "warning", dotColor: "bg-amber-500" },
  "Quá tải": { variant: "destructive", dotColor: "bg-rose-500" },
}

export default function SquadRecommendation({
  recommendedSquad,
}: SquadRecommendationProps) {
  if (!recommendedSquad) return null

  const status = deriveCapacityStatus(recommendedSquad)
  const statusCfg = statusBadgeVariant[status] || { variant: "default", dotColor: "bg-slate-400" }

  return (
    <Frame 
      variant="accent" 
      padding="sm"
      className="bg-gradient-to-r from-white via-slate-50/50 to-[#1B3A6B]/5 border-slate-200/90 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <IconTile variant="navy" size="default">
            <Sparkles className="w-5 h-5 text-[#1B3A6B]" />
          </IconTile>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="navy" size="xs" className="font-bold uppercase tracking-wider">
                UX Squad chuyên trách (1:1)
              </Badge>
              <h4 className="font-bold text-sm sm:text-base text-slate-900">
                {recommendedSquad.squad_name}
              </h4>
            </div>
            <p className="text-xs text-slate-500 leading-tight">
              {recommendedSquad.domain || `Chuyên trách trải nghiệm phân hệ ${recommendedSquad.squad_name}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white border border-slate-200/80 p-2.5 px-3.5 rounded-xl shrink-0 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Activity className="w-4 h-4 text-[#1B3A6B]" />
          </div>
          <div className="text-xs">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tải công việc</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-bold text-slate-800">
                {recommendedSquad.active_tasks} đang làm · {recommendedSquad.queued_tasks} chờ
              </span>
              <Badge
                variant={statusCfg.variant}
                dot
                dotColor={statusCfg.dotColor}
                size="xs"
                className="font-bold"
              >
                {status}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  )
}
