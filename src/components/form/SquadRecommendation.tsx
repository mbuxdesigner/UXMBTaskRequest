import { Squad, deriveCapacityStatus } from "../../data/mockData"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Activity } from "lucide-react"

interface SquadRecommendationProps {
  recommendedSquad: Squad | null
  squads: Squad[]
  preferredSquad: string
  onPreferredChange: (name: string) => void
}

const statusBadgeVariant = {
  "Sẵn sàng": "success",
  "Bình thường": "warning",
  "Đang bận": "warning",
  "Quá tải": "destructive",
} as const

export default function SquadRecommendation({
  recommendedSquad,
}: SquadRecommendationProps) {
  if (!recommendedSquad) return null

  const status = deriveCapacityStatus(recommendedSquad)

  return (
    <Card variant="accent" className="border-navy-200/80 bg-gradient-to-r from-navy-50/90 to-blue-50/50">
      <CardContent className="p-4.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="navy" size="sm" className="gap-1">
                <Sparkles className="w-3 h-3 text-teal" />
                UX Squad phụ trách
              </Badge>
              <span className="font-bold text-base text-slate-900">{recommendedSquad.squad_name}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {recommendedSquad.domain || `Phụ trách trực tiếp trải nghiệm phân hệ ${recommendedSquad.squad_name}`}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/80 border border-slate-200/80 p-2.5 rounded-xl flex-shrink-0">
            <Activity className="w-4 h-4 text-navy flex-shrink-0" />
            <div className="text-xs">
              <p className="text-slate-400 text-[10px] leading-tight">Trạng thái Squad</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-slate-700">
                  {recommendedSquad.active_tasks} đang làm · {recommendedSquad.queued_tasks} chờ
                </span>
                <Badge variant={statusBadgeVariant[status] || "default"} dot size="sm">
                  {status}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
