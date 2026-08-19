import { UXRequest } from "../../data/mockData"
import { Frame, FrameBody } from "@/components/reui/frame"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getStatusConfig } from "@/config/statusConfig"
import { ChevronRight, Calendar, UserCheck, Sparkles, Layers, ArrowUpRight } from "lucide-react"

interface RequestCardProps {
  request: UXRequest
  onClick: (request: UXRequest) => void
}

export default function RequestCard({ request, onClick }: RequestCardProps) {
  const statusConfig = getStatusConfig(request.status)

  const isCompleted = request.progress === 100

  return (
    <Frame
      onClick={() => onClick(request)}
      className="cursor-pointer hover:border-[#1B3A6B]/40 hover:shadow-lg transition-all duration-200 group bg-white relative overflow-hidden"
      padding="none"
    >
      {/* Top accent line on hover */}
      <div className="h-1 w-full bg-gradient-to-r from-[#1B3A6B] via-[#0D9B97] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-5 sm:p-6 space-y-4">
        {/* Header line */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="navy" size="xs" className="font-mono font-bold tracking-wider">
                {request.request_id}
              </Badge>
              <Badge variant="outline" size="xs" className="text-slate-500 font-medium">
                {request.product}
              </Badge>
              {request.priority && (
                <Badge
                  variant={
                    request.priority === "Cao" || request.priority === "Khẩn cấp"
                      ? "destructive"
                      : "secondary"
                  }
                  size="xs"
                >
                  {request.priority}
                </Badge>
              )}
            </div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-[#1B3A6B] transition-colors line-clamp-3 break-words">
              {request.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant={statusConfig.variant}
              dot
              dotColor={statusConfig.dotColor}
              size="sm"
            >
              {request.status}
            </Badge>
            <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-[#1B3A6B] group-hover:text-white text-slate-400 flex items-center justify-center transition-all">
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </div>

        {/* Metadata info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
          <div>
            <p className="text-slate-400 text-xs font-semibold mb-0.5">UX Squad</p>
            <p className="font-semibold text-slate-800 truncate">{request.squad_name}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold mb-0.5">Giai đoạn</p>
            <p className="font-semibold text-[#1B3A6B] truncate">{request.current_phase}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold mb-0.5">Cập nhật</p>
            <p className="font-semibold text-slate-700">{request.last_updated}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold mb-0.5">Deadline</p>
            <p className="font-semibold text-slate-700">{request.expected_deadline || "—"}</p>
          </div>
        </div>

        {/* Progress Bar & Phase Status */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0D9B97]" />
              Tiến độ {request.current_phase}
            </span>
            <span className="font-bold text-slate-900">{request.progress}%</span>
          </div>
          <Progress
            value={request.progress}
            variant={isCompleted ? "success" : "default"}
            size="sm"
          />
        </div>
      </div>
    </Frame>
  )
}
