import { UXRequest } from "../../data/mockData"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getStatusConfig } from "@/config/statusConfig"
import { UserAvatar } from "@/components/common/UserAvatar"
import { SpotlightCard } from "@/components/jolyui/spotlight-card"
import { ArrowUpRight } from "lucide-react"

interface RequestCardProps {
  request: UXRequest
  onClick: (request: UXRequest) => void
}

function formatDesignerDisplayName(rawName?: string): string {
  if (!rawName || rawName === "Chưa phân công" || rawName === "Đang phân công" || rawName.trim() === "") return "Chưa phân công"
  const clean = rawName.trim()
  if (clean.toLowerCase().includes("nam.designer") || clean.toLowerCase().includes("nam.")) {
    return "Lê Hoàng Nam"
  }
  if (clean.toLowerCase().includes("cuong") || clean.toLowerCase().includes("owner")) {
    return "Nguyễn Văn Cường"
  }
  if (clean.toLowerCase().includes("lan") || clean.toLowerCase().includes("po")) {
    return "Trần Mai Lan"
  }
  if (clean.includes("@")) {
    const userPart = clean.split("@")[0]
    return userPart.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return clean
}

function formatDateOnly(rawDate?: string): string {
  if (!rawDate || !rawDate.trim()) return "—"
  const clean = rawDate.trim()
  if (clean.includes(" ")) {
    const parts = clean.split(" ")
    if (parts[0].includes("/") || parts[0].includes("-")) {
      return parts[0]
    }
  }
  if (clean.includes("T")) {
    try {
      const d = new Date(clean)
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, "0")
        const mm = String(d.getMonth() + 1).padStart(2, "0")
        const yyyy = d.getFullYear()
        return `${dd}/${mm}/${yyyy}`
      }
    } catch {}
  }
  return clean
}

export default function RequestCard({ request, onClick }: RequestCardProps) {
  const statusConfig = getStatusConfig(request.status)
  const isCompleted = request.progress === 100
  const rawDesigner = request.assigned_designer || (request.ux_owner !== "Chưa phân công" && request.ux_owner !== "Đang phân công" ? request.ux_owner : "") || ""
  const isAssigned = Boolean(rawDesigner && rawDesigner !== "Chưa phân công" && rawDesigner !== "Đang phân công")
  const designerName = isAssigned ? formatDesignerDisplayName(rawDesigner) : "Chưa phân công"

  return (
    <SpotlightCard
      spotlightColor="rgba(16, 87, 251, 0.08)"
      onClick={() => onClick(request)}
      className="cursor-pointer hover:border-[#1B3A6B]/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group bg-white relative overflow-hidden"
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
            <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-[#1057FB] transition-colors line-clamp-2 break-words [overflow-wrap:anywhere] break-all max-w-full">
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
            <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-[#1057FB] group-hover:text-white text-slate-400 flex items-center justify-center transition-all shadow-2xs">
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </div>

        {/* Metadata info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
          <div>
            <p className="text-slate-400 text-[11px] font-semibold mb-0.5">UX Squad</p>
            <p className="font-semibold text-slate-800 truncate">{request.squad_name}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[11px] font-semibold mb-0.5">Phụ trách</p>
            {isAssigned ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <UserAvatar name={designerName} size="xs" />
                <span className="font-semibold text-slate-800 truncate">{designerName}</span>
              </div>
            ) : (
              <span className="text-slate-400 italic text-xs font-medium">Chưa phân công</span>
            )}
          </div>
          <div>
            <p className="text-slate-400 text-[11px] font-semibold mb-0.5">Cập nhật</p>
            <p className="font-semibold text-slate-700">{formatDateOnly(request.last_updated || request.submitted_at)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[11px] font-semibold mb-0.5">Giai đoạn</p>
            <p className="font-semibold text-[#1057FB] truncate">{request.current_phase}</p>
          </div>
        </div>

        {/* Progress Bar & Phase Status */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0D9B97]" />
              Tiến độ {request.current_phase}
            </span>
            <span className="font-mono font-bold text-slate-900">{request.progress}%</span>
          </div>
          <Progress
            value={request.progress}
            variant={isCompleted ? "success" : "default"}
            size="sm"
          />
        </div>
      </div>
    </SpotlightCard>
  )
}
