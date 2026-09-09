import { UXRequest } from "../../data/mockData"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getStatusConfig, getRequestPendingClassification, formatPriority } from "@/config/statusConfig"
import { UserAvatar } from "@/components/common/UserAvatar"
import { SpotlightCard } from "@/components/jolyui/spotlight-card"
import { ArrowUpRight, Clock, PauseCircle } from "lucide-react"
import { getProductColorDef, getSquadColorDef } from "@/lib/colorUtils"

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
  const pendingInfo = getRequestPendingClassification(request)
  const statusConfig = getStatusConfig(pendingInfo.isPending ? pendingInfo.label : request.status)
  const isCompleted = request.progress === 100
  const rawDesigner = request.assigned_designer || (request.ux_owner !== "Chưa phân công" && request.ux_owner !== "Đang phân công" ? request.ux_owner : "") || ""
  const assignees = rawDesigner && rawDesigner !== "Chưa phân công" && rawDesigner !== "Đang phân công"
    ? rawDesigner.split(",").map((s) => s.trim()).filter(Boolean)
    : []
  const isAssigned = assignees.length > 0
  const designerName = isAssigned ? assignees.join(", ") : "Chưa phân công"

  const releaseDate = request.release_date || request.expected_deadline
  const endDate = request.design_deadline || request.expected_deadline
  const isOverdue = Boolean(
    endDate &&
    new Date(endDate).getTime() < Date.now() &&
    request.status !== "Hoàn thành" &&
    request.status !== "Done"
  )

  const uxNeedText = request.business_need || request.user_problem || request.description || "Chưa có mô tả nhu cầu"
  const journeyText = request.feature_journey || request.request_type || "Luồng chính"

  return (
    <SpotlightCard
      spotlightColor="rgba(16, 87, 251, 0.08)"
      onClick={() => onClick(request)}
      className="cursor-pointer hover:border-[#1B3A6B]/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group bg-white relative overflow-hidden"
    >
      {/* Top accent line on hover */}
      <div className="h-1 w-full bg-gradient-to-r from-[#1B3A6B] via-[#0D9B97] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-4 sm:p-5 space-y-3.5">
        {/* Header line: Tags & Status */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10.5px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80">
                {request.request_id}
              </span>
              {(() => {
                const prodName = request.product || "App MBBank"
                const prodColor = getProductColorDef(prodName)
                return (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${prodColor.badgeClass} flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${prodColor.dotClass} shrink-0`} />
                    <span>{prodName}</span>
                  </span>
                )
              })()}
              {request.priority && (() => {
                const pInfo = formatPriority(request.priority)
                return (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      pInfo.key === "urgent"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : pInfo.key === "high"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : pInfo.key === "low"
                        ? "bg-slate-50 text-slate-600 border-slate-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {pInfo.label}
                  </span>
                )
              })()}
            </div>

            {/* Task Title */}
            <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-[#1057FB] transition-colors line-clamp-1 break-words">
              {request.title}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant={
                pendingInfo.isPending
                  ? pendingInfo.type === "po_pending"
                    ? "warning"
                    : "secondary"
                  : statusConfig.variant
              }
              dot
              dotColor={
                pendingInfo.isPending
                  ? pendingInfo.badgeClasses.dot
                  : statusConfig.dotColor
              }
              size="sm"
              className={
                pendingInfo.isPending
                  ? `${pendingInfo.badgeClasses.bg} ${pendingInfo.badgeClasses.text} ${pendingInfo.badgeClasses.border}`
                  : undefined
              }
            >
              {pendingInfo.isPending ? pendingInfo.label : request.status}
            </Badge>
            <div className="w-7 h-7 rounded-lg bg-slate-50 group-hover:bg-[#1057FB] group-hover:text-white text-slate-400 flex items-center justify-center transition-all shadow-2xs">
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </div>

        {/* Cảnh báo rõ ràng cho 2 loại trạng thái: PO Pending (Quá hạn 24h) hoặc Pending (Lý do theo chat Designer) */}
        {pendingInfo.isPending && (
          <div
            className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs shadow-2xs ${
              pendingInfo.type === "po_pending"
                ? "bg-amber-50/90 border-amber-300 text-amber-950"
                : "bg-slate-100/95 border-slate-300 text-slate-800"
            }`}
          >
            {pendingInfo.type === "po_pending" ? (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[11px] text-amber-900 uppercase tracking-wide">PO Pending</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-extrabold text-[9.5px]">
                      Quá hạn 24h
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Sau 24h kể từ khi Designer gửi lại Figma cho PO nhưng chưa nhận được phản hồi duyệt.
                  </p>
                </div>
              </>
            ) : (
              <>
                <PauseCircle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[11px] text-slate-900 uppercase tracking-wide">Pending</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-extrabold text-[9.5px]">
                      Tạm dừng
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-snug">
                    <span className="font-semibold text-slate-900">Lí do: </span>
                    <span className="text-[#1057FB] font-medium">{pendingInfo.reason || "Theo đoạn chat của Designer khi viết @pending"}</span>
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Nhu cầu UX & Luồng nghiệp vụ */}
        <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-100 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
            <span className="font-semibold text-blue-700 bg-blue-50/80 px-1.5 py-0.2 rounded border border-blue-100 text-[10px] shrink-0">
              Luồng: {journeyText}
            </span>
          </div>
          <p className="text-slate-600 text-[11.5px] line-clamp-2 leading-relaxed font-normal" title={uxNeedText}>
            <strong className="text-slate-700 font-semibold">Nhu cầu UX: </strong>
            {uxNeedText}
          </p>
        </div>

        {/* Metadata info grid: Squad, Phụ trách, Release, End date */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs shadow-2xs">
          <div>
            <p className="text-slate-400 text-[10.5px] font-semibold mb-0.5">Squad</p>
            {(() => {
              const rawSquad = request.squad_name || request.preferred_squad
              const hasSquad = Boolean(
                rawSquad &&
                rawSquad !== "Chưa phân công" &&
                rawSquad !== "Chưa có squad" &&
                rawSquad !== "Chưa phân squad" &&
                rawSquad !== "Triage Squad" &&
                rawSquad.trim() !== ""
              )
              if (!hasSquad) {
                return (
                  <p className="text-slate-400 italic font-normal truncate text-[11.5px]">
                    Chưa phân squad
                  </p>
                )
              }
              const squadColor = getSquadColorDef(rawSquad, request.product)
              return (
                <p className="font-semibold truncate text-[11.5px] text-slate-800 flex items-center gap-1.5" title={rawSquad}>
                  <span className={`w-1.5 h-1.5 rounded-full ${squadColor.dotClass} shrink-0`} />
                  <span className="truncate">{rawSquad}</span>
                </p>
              )
            })()}
          </div>
          <div>
            <p className="text-slate-400 text-[10.5px] font-semibold mb-0.5">Người thực hiện</p>
            {isAssigned ? (
              <div className="flex items-center gap-1.5 min-w-0">
                {assignees.length > 1 ? (
                  <>
                    <div className="flex items-center -space-x-1.5 overflow-hidden shrink-0">
                      {assignees.slice(0, 2).map((name, i) => (
                        <div key={`card-av-${name}-${i}`} className="ring-1.5 ring-white rounded-full">
                          <UserAvatar name={name} size="xs" className="w-4.5 h-4.5 text-[8.5px]" />
                        </div>
                      ))}
                    </div>
                    <span className="font-semibold text-slate-800 truncate text-[11.5px]" title={designerName}>
                      {designerName}
                    </span>
                    <span className="px-1 py-0.2 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                      {assignees.length}
                    </span>
                  </>
                ) : (
                  <>
                    <UserAvatar name={designerName} size="xs" />
                    <span className="font-semibold text-slate-800 truncate text-[11.5px]">{designerName}</span>
                  </>
                )}
              </div>
            ) : (
              <span className="text-slate-400 italic text-[11px] font-medium">Chưa phân công</span>
            )}
          </div>
          <div>
            <p className="text-slate-400 text-[10.5px] font-semibold mb-0.5">Ngày release</p>
            <p className="font-semibold text-slate-800 font-mono text-[11px]">{formatDateOnly(releaseDate)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[10.5px] font-semibold mb-0.5">End date</p>
            <p className="font-semibold text-slate-800 font-mono text-[11px] flex items-center gap-1">
              <span>{formatDateOnly(endDate)}</span>
              {isOverdue && (
                <span className="px-1 py-0.2 rounded text-[8.5px] font-bold bg-rose-100 text-rose-700">
                  Trễ
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Progress Bar & Phase Status */}
        <div className="space-y-1 pt-0.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1.5 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0D9B97]" />
              Tiến độ {request.current_phase || "Khâu UX"}
            </span>
            <span className="font-mono font-bold text-slate-900 text-xs">{request.progress}%</span>
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
