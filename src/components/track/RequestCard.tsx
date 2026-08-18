import { UXRequest } from "../../data/mockData"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChevronRight, Calendar, UserCheck, Layers } from "lucide-react"

interface RequestCardProps {
  request: UXRequest
  onClick: (request: UXRequest) => void
}

const statusBadgeVariant: Record<string, "info" | "warning" | "success" | "purple" | "secondary"> = {
  "Đang thực hiện": "info",
  "Đang phân loại": "warning",
  "Đang khám phá": "purple",
  "Hoàn thành": "success",
  "Đã gửi": "secondary",
}

export default function RequestCard({ request, onClick }: RequestCardProps) {
  const badgeVariant = statusBadgeVariant[request.status] ?? "secondary"

  return (
    <Card 
      onClick={() => onClick(request)}
      className="cursor-pointer hover:border-slate-300 hover:shadow-md transition-all duration-200 group"
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="navy" size="sm" className="font-mono font-bold">
                {request.request_id}
              </Badge>
              <span className="text-xs text-slate-400 font-medium">{request.product}</span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-navy transition-colors">
              {request.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={badgeVariant} dot size="sm">
              {request.status}
            </Badge>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-navy group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-y border-slate-100 text-xs">
          <div>
            <p className="text-slate-400 text-[11px] mb-0.5">UX Squad</p>
            <p className="font-semibold text-slate-800 truncate">{request.squad_name}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[11px] mb-0.5">Giai đoạn</p>
            <p className="font-semibold text-navy truncate">{request.current_phase}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[11px] mb-0.5">Cập nhật cuối</p>
            <p className="font-semibold text-slate-700">{request.last_updated}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[11px] mb-0.5">Hạn dự kiến</p>
            <p className="font-semibold text-slate-700">{request.expected_deadline || "—"}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">{request.current_phase}</span>
            <span className="font-bold text-slate-900">{request.progress}%</span>
          </div>
          <Progress
            value={request.progress}
            variant={request.progress === 100 ? "success" : "default"}
            size="sm"
          />
        </div>
      </CardContent>
    </Card>
  )
}
