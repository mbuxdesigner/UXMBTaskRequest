import React, { useState, useMemo } from "react"
import { Squad, UXRequest, deriveCapacityStatus } from "../../data/mockData"
import { Frame, FrameHeader, FrameTitle, FrameDescription, FrameBody } from "@/components/reui/frame"
import { IconTile } from "@/components/reui/icon-tile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { UserAvatar } from "@/components/common/UserAvatar"
import { SpotlightCard } from "@/components/jolyui/spotlight-card"
import { 
  Boxes, 
  Layers, 
  PieChart, 
  BarChart2, 
  Flame, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowUpRight, 
  Sparkles,
  Zap,
  Target
} from "lucide-react"

interface SquadDistributionSectionProps {
  squads: Squad[]
  requests: UXRequest[]
  onSelectSquad: (squad: Squad) => void
  onSelectRequest: (req: UXRequest) => void
}

export default function SquadDistributionSection({
  squads,
  requests,
  onSelectSquad,
  onSelectRequest,
}: SquadDistributionSectionProps) {
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null)

  // Compute breakdown metrics per Squad
  const squadAnalytics = useMemo(() => {
    const totalAllTasks = requests.length || 1

    return squads.map((squad) => {
      const matchingReqs = requests.filter(
        (r) =>
          (r.preferred_squad && r.preferred_squad.toLowerCase() === squad.squad_name.toLowerCase()) ||
          (r.product && r.product.toLowerCase() === squad.squad_name.toLowerCase()) ||
          (r.squad_name && r.squad_name.toLowerCase() === squad.squad_name.toLowerCase())
      )

      const active = matchingReqs.filter((r) => r.status === "Đang thực hiện")
      const queued = matchingReqs.filter((r) => r.status === "Đang phân loại" || r.status === "Chờ tiếp nhận")
      const completed = matchingReqs.filter((r) => r.status === "Hoàn thành")
      const blocked = matchingReqs.filter((r) => r.status === "Bị chặn" || r.latest_update?.message?.toLowerCase().includes("block"))

      // Task types breakdown
      const typeMap: Record<string, number> = {
        "Tính năng mới": 0,
        "Thiết kế lại": 0,
        "UX Review": 0,
        "UX Research": 0,
        "Khác": 0,
      }
      matchingReqs.forEach((r) => {
        const t = r.request_type || "Tính năng mới"
        if (t.includes("mới")) typeMap["Tính năng mới"]++
        else if (t.includes("lại") || t.includes("Redesign")) typeMap["Thiết kế lại"]++
        else if (t.includes("Review")) typeMap["UX Review"]++
        else if (t.includes("Research")) typeMap["UX Research"]++
        else typeMap["Khác"]++
      })

      const totalCount = matchingReqs.length
      const workloadShare = Math.round((totalCount / totalAllTasks) * 100)
      const capacityPct = Math.min(100, Math.round(((squad.active_tasks + squad.queued_tasks) / squad.capacity_threshold) * 100))

      return {
        ...squad,
        matchingReqs,
        activeCount: active.length || squad.active_tasks,
        queuedCount: queued.length || squad.queued_tasks,
        completedCount: completed.length,
        blockedCount: blocked.length,
        workloadShare,
        capacityPct,
        typeMap,
      }
    })
  }, [squads, requests])

  const currentSquadDetail = useMemo(() => {
    if (!selectedSquadId) return squadAnalytics[0] || null
    return squadAnalytics.find((s) => s.squad_id === selectedSquadId) || squadAnalytics[0] || null
  }, [squadAnalytics, selectedSquadId])

  return (
    <div className="space-y-6">
      {/* 4 Multi-Squad Visual Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {squadAnalytics.map((squad) => {
          const status = deriveCapacityStatus(squad)
          const isSelected = currentSquadDetail?.squad_id === squad.squad_id

          return (
            <div
              key={squad.squad_id}
              onClick={() => setSelectedSquadId(squad.squad_id)}
              className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer bg-white flex flex-col justify-between gap-3 ${
                isSelected
                  ? "border-[#1057FB] shadow-md ring-2 ring-[#1057FB]/20 -translate-y-0.5"
                  : "border-slate-200/90 hover:border-slate-300 hover:shadow-2xs"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{squad.squad_name}</h4>
                    <p className="text-[11px] text-slate-500 truncate">{squad.domain}</p>
                  </div>
                  <Badge
                    variant={
                      status === "Sẵn sàng"
                        ? "success"
                        : status === "Quá tải"
                        ? "destructive"
                        : status === "Đang bận"
                        ? "warning"
                        : "secondary"
                    }
                    size="xs"
                    className="font-bold shrink-0"
                  >
                    {status}
                  </Badge>
                </div>

                {/* Progress & Share */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Tải trọng</span>
                    <span className="font-mono font-bold text-slate-900">{squad.capacityPct}% ({squad.activeCount + squad.queuedCount}/{squad.capacity_threshold})</span>
                  </div>
                  <Progress
                    value={squad.capacityPct}
                    variant={status === "Quá tải" ? "destructive" : status === "Sẵn sàng" ? "success" : "default"}
                    size="sm"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Tỷ trọng: <strong className="text-slate-800 font-mono">{squad.workloadShare}%</strong></span>
                <span className="text-[#1057FB] font-semibold flex items-center gap-0.5">
                  Chi tiết
                  <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Deep-dive Squad Breakdown Matrix */}
      {currentSquadDetail && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Squad Overview & Task Type Composition */}
          <div className="lg:col-span-1 space-y-6">
            <Frame variant="default" className="h-full flex flex-col justify-between">
              <FrameHeader>
                <div>
                  <FrameTitle>
                    <IconTile size="xs" variant="navy"><PieChart className="w-3.5 h-3.5" /></IconTile>
                    Cơ cấu Yêu cầu: {currentSquadDetail.squad_name}
                  </FrameTitle>
                  <FrameDescription>
                    Phân bổ theo loại hình thiết kế của Squad này.
                  </FrameDescription>
                </div>
              </FrameHeader>

              <FrameBody className="space-y-4">
                {/* Type distribution bars */}
                <div className="space-y-3">
                  {Object.entries(currentSquadDetail.typeMap).map(([typeName, count]) => {
                    const total = currentSquadDetail.matchingReqs.length || 1
                    const pct = Math.round((count / total) * 100)
                    return (
                      <div key={typeName} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{typeName}</span>
                          <span className="font-mono text-slate-500">{count} task ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#1057FB]"
                            style={{ width: `${Math.max(5, pct)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Squad Owner Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Design Lead phụ trách</span>
                  <div className="flex items-center gap-2.5">
                    <UserAvatar name={currentSquadDetail.ux_owner || "Design Lead"} size="md" />
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs">{currentSquadDetail.ux_owner || "Chưa phân công"}</h5>
                      <p className="text-[11px] text-slate-500">{currentSquadDetail.domain}</p>
                    </div>
                  </div>
                </div>
              </FrameBody>

              <div className="p-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectSquad(currentSquadDetail)}
                  className="w-full text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer shadow-2xs"
                >
                  Xem toàn bộ năng lực & Modal Squad
                </Button>
              </div>
            </Frame>
          </div>

          {/* Right: Task Matrix of Current Squad */}
          <div className="lg:col-span-2">
            <Frame variant="default" className="h-full flex flex-col justify-between">
              <FrameHeader className="flex items-center justify-between">
                <div>
                  <FrameTitle>
                    <IconTile size="xs" variant="teal"><Boxes className="w-3.5 h-3.5" /></IconTile>
                    Danh sách Yêu cầu thuộc {currentSquadDetail.squad_name}
                  </FrameTitle>
                  <FrameDescription>
                    {currentSquadDetail.matchingReqs.length} yêu cầu thiết kế được phân bổ vào Squad này.
                  </FrameDescription>
                </div>
                <Badge variant="navy" size="xs" className="font-bold">
                  {currentSquadDetail.activeCount} đang làm • {currentSquadDetail.queuedCount} hàng đợi
                </Badge>
              </FrameHeader>

              <FrameBody className="space-y-3">
                {currentSquadDetail.matchingReqs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Chưa có yêu cầu nào được gán cho Squad này.
                  </div>
                ) : (
                  currentSquadDetail.matchingReqs.slice(0, 6).map((req, idx) => (
                    <div
                      key={req.request_id ? `${req.request_id}-${idx}` : `req-${idx}`}
                      onClick={() => onSelectRequest(req)}
                      className="p-3 rounded-xl border border-slate-200/80 hover:border-[#1057FB]/50 hover:bg-slate-50/70 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono font-bold text-slate-400">
                            {req.request_id || `REQ-${idx + 1}`}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {req.request_type || "Tính năng mới"}
                          </span>
                          <Badge variant="secondary" size="xs">
                            {req.status}
                          </Badge>
                        </div>
                        <h5 className="font-bold text-slate-900 text-xs group-hover:text-[#1057FB] transition-colors truncate">
                          {req.title}
                        </h5>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right text-xs">
                          <p className="font-bold font-mono text-slate-900">{req.progress || 0}%</p>
                          <p className="text-[10px] text-slate-400">{req.expected_deadline || "Chưa có hạn"}</p>
                        </div>
                        <UserAvatar name={req.assigned_designer || req.ux_owner || "Designer"} size="sm" />
                      </div>
                    </div>
                  ))
                )}
              </FrameBody>

              <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Hiển thị tối đa 6 yêu cầu tiêu biểu</span>
                <span className="font-semibold text-blue-600">Click để xem & cập nhật tiến độ</span>
              </div>
            </Frame>
          </div>
        </div>
      )}
    </div>
  )
}
