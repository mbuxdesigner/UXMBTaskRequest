import { useState, useEffect, useMemo } from "react"
import { Squad, UXRequest } from "../data/mockData"
import { fetchSquads, fetchRequests } from "../api/api"
import SquadDetailModal from "../components/squad/SquadDetailModal"
import RequestDetail from "../components/track/RequestDetail"
import MemberDetailDrawer from "../components/dashboard/MemberDetailDrawer"
import { MemberMetrics } from "../components/dashboard/MemberWorkloadSection"
import ReUIGanttChart from "@/components/reui/gantt-chart"
import { Frame, FrameHeader, FrameTitle, FrameDescription, FrameBody } from "@/components/reui/frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { UserAvatar } from "@/components/common/UserAvatar"
import { 
  Sparkles, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  CircleDot, 
  Layers, 
  Activity, 
  Users, 
  Calendar,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
  FileCheck
} from "lucide-react"

// Date helpers
function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null
  const parts = dateStr.trim().split(/[\/\-]/)
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    }
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
  }
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

function getDaysDifference(targetDate: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  const diffTime = target.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export default function TongQuanPage() {
  const [squads, setSquads] = useState<Squad[]>([])
  const [requests, setRequests] = useState<UXRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Modals & Drawers State
  const [selectedRequest, setSelectedRequest] = useState<UXRequest | null>(null)
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null)
  const [selectedMember, setSelectedMember] = useState<MemberMetrics | null>(null)

  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const [squadsData, requestsData] = await Promise.all([
        fetchSquads(),
        fetchRequests(forceRefresh),
      ])
      setSquads(squadsData)
      setRequests(requestsData)
    } catch (err: any) {
      setError(err?.message || "Không thể tải dữ liệu từ Google Sheet.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // =========================================================================
  // METRICS & AGGREGATIONS
  // =========================================================================
  const {
    unassignedCount,
    inProgressCount,
    completedCount,
    blockedCount,
    totalCount,
    statusSegments,
    assigneeStats,
    completedThisWeek,
    recentActivities,
    riskTask,
    activeKeyTasks,
  } = useMemo(() => {
    let unassigned = 0
    let inProgress = 0
    let completed = 0
    let blocked = 0

    const assigneeMap: Record<string, { total: number; open: number; completed: number; name: string }> = {}
    let primaryRisk: UXRequest | null = null

    requests.forEach((req) => {
      const isDone = req.status === "Hoành thành" || req.status === "Hoàn thành"
      const isProgress = req.status === "Đang thực hiện"
      const isBlocked = req.status === "Bị chặn"
      const isUnassigned = !req.assigned_designer || req.status === "Chờ tiếp nhận" || req.status === "Đang phân loại"

      if (isDone) completed++
      else if (isProgress) inProgress++
      
      if (isBlocked) blocked++
      if (isUnassigned) unassigned++

      // Assignee stats
      const assignee = req.assigned_designer && req.assigned_designer.trim() ? req.assigned_designer.trim() : "Chưa gán"
      if (!assigneeMap[assignee]) {
        assigneeMap[assignee] = { total: 0, open: 0, completed: 0, name: assignee }
      }
      assigneeMap[assignee].total++
      if (isDone) {
        assigneeMap[assignee].completed++
      } else {
        assigneeMap[assignee].open++
      }

      if ((isBlocked || req.priority === "Urgent") && !isDone && !primaryRisk) {
        primaryRisk = req
      }
    })

    const total = requests.length || 1

    // Status breakdown for horizontal segmented bar
    const segments = [
      { label: "Chưa gán", count: unassigned, color: "bg-zinc-400" },
      { label: "Khảo sát & Flow", count: requests.filter(r => r.current_phase === "Discovery" || r.current_phase === "User Flow").length, color: "bg-indigo-500" },
      { label: "Đang làm UI/Proto", count: inProgress, color: "bg-[#1057FB]" },
      { label: "Đã hoàn thành", count: completed, color: "bg-emerald-500" },
    ]

    // Assignee lists
    const assigneeList = Object.values(assigneeMap).filter(a => a.total > 0)
    const completedList = assigneeList.filter(a => a.completed > 0 && a.name !== "Chưa gán")

    // Activity Stream
    const activities: Array<{
      id: string
      user: string
      action: string
      detail: string
      time: string
      taskTitle: string
      request: UXRequest
    }> = []

    requests.forEach((req, idx) => {
      if (req.task_updates && req.task_updates.length > 0) {
        req.task_updates.slice(0, 2).forEach((upd, uIdx) => {
          activities.push({
            id: `upd-${idx}-${uIdx}`,
            user: upd.author || req.assigned_designer || "Designer",
            action: upd.type === "phase_change" ? "đã chuyển giai đoạn" : "cập nhật tiến độ",
            detail: upd.note || upd.message || "",
            time: upd.created_at || "Vừa xong",
            taskTitle: req.title,
            request: req,
          })
        })
      } else if (req.latest_update) {
        activities.push({
          id: `latest-${idx}`,
          user: req.assigned_designer || req.ux_owner || "Cường",
          action: "bình luận:",
          detail: req.latest_update.message || "Cập nhật tiến độ thiết kế",
          time: req.latest_update.date || req.last_updated || "Hôm qua",
          taskTitle: req.title,
          request: req,
        })
      }
    })

    return {
      unassignedCount: unassigned,
      inProgressCount: inProgress,
      completedCount: completed,
      blockedCount: blocked,
      totalCount: requests.length,
      statusSegments: segments,
      assigneeStats: assigneeList,
      completedThisWeek: completedList,
      recentActivities: activities.slice(0, 6),
      riskTask: primaryRisk || requests.find(r => r.status === "Bị chặn") || null,
      activeKeyTasks: requests.filter(r => r.status === "Đang thực hiện").slice(0, 3),
    }
  }, [requests])

  return (
    <main className="w-full max-w-[1720px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-zinc-900 bg-[#f8fafc]/50 min-h-screen">
      {/* =========================================================================
          REUI HEADER BREADCRUMB & COMMAND BAR
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 mb-1">
            <span>MBBank UX Platform</span>
            <span>/</span>
            <span className="text-zinc-900 font-bold">Executive Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
              Bảng Điều Hành & Lộ Trình UX
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            loading={refreshing}
            className="h-9 px-3.5 text-xs font-bold rounded-xl bg-white border-zinc-200 text-zinc-700 shadow-2xs hover:bg-zinc-50 cursor-pointer gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Đồng bộ dữ liệu</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" onDismiss={() => setError(null)}>
          <AlertTitle>Lỗi kết nối</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* =========================================================================
          ROW 1: 4 HERO KPI BENTO CARDS (reUI Metric Tiles)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: In Progress */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs space-y-2 hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Đang triển khai</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-[#1057FB]">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-zinc-900 font-mono tracking-tight">
            {inProgressCount}
            <span className="text-xs text-zinc-400 font-sans font-normal ml-1">tasks</span>
          </div>
          <p className="text-[11.5px] text-zinc-500">Đang lên UI & Prototype đa Squad</p>
        </div>

        {/* Card 2: SLA On-time */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs space-y-2 hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Đúng hạn SLA</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">
            96.4<span className="text-base text-emerald-500 font-sans font-normal">%</span>
          </div>
          <p className="text-[11.5px] text-zinc-500">
            <span className="font-bold text-emerald-600 font-mono">+3.8%</span> so với tháng trước
          </p>
        </div>

        {/* Card 3: First Time Right */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs space-y-2 hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Nghiệm thu tuần</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200/70 flex items-center justify-center text-purple-600">
              <FileCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-zinc-900 font-mono tracking-tight">
            {completedCount}
            <span className="text-xs text-zinc-400 font-sans font-normal ml-1">đã duyệt</span>
          </div>
          <p className="text-[11.5px] text-zinc-500">Bàn giao Tech thành công</p>
        </div>

        {/* Card 4: Risks & Blockers */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs space-y-2 hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Cần hỗ trợ / Gấp</span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/70 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-rose-600 font-mono tracking-tight">
            {blockedCount || (riskTask ? 1 : 0)}
            <span className="text-xs text-zinc-400 font-sans font-normal ml-1">rủi ro</span>
          </div>
          <p className="text-[11.5px] text-rose-600 font-medium">Cần Leader can thiệp giải tỏa</p>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: AI EXECUTIVE BRIEFING + WORKLOAD METERS
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: AI Executive Briefing (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/80 shadow-2xs">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  AI Executive Digest
                </h3>
              </div>
              <span className="text-[11px] font-mono text-zinc-400 font-semibold">Realtime Synthesis</span>
            </div>

            <div className="text-xs sm:text-sm text-zinc-600 leading-relaxed space-y-3">
              <p>
                Đội ngũ <strong>UXTeamMB</strong> đang đồng loạt tăng tốc các sáng kiến số hóa trọng điểm:{" "}
                {activeKeyTasks.map((t, i) => (
                  <span key={t.request_id || `active-key-${i}`} className="inline-flex items-center gap-1 mx-1 flex-wrap">
                    <CircleDot className="w-3 h-3 text-[#1057FB] inline" />
                    <span 
                      onClick={() => setSelectedRequest(t)}
                      className="font-bold text-zinc-900 hover:text-[#1057FB] cursor-pointer underline decoration-zinc-300 underline-offset-2"
                    >
                      {t.title}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-[#1057FB] text-[10px] font-mono font-bold">
                      {t.current_phase || "UI"}
                    </span>
                    {i < activeKeyTasks.length - 1 ? "," : "."}
                  </span>
                ))}
              </p>

              {riskTask && (
                <div className="p-3.5 bg-rose-50/80 rounded-xl border border-rose-200/80 text-rose-950 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Dự án cần xử lý ngay:</span>
                  </div>
                  <p>
                    <strong 
                      onClick={() => setSelectedRequest(riskTask)}
                      className="hover:underline cursor-pointer text-rose-900 font-bold"
                    >
                      {riskTask.title}
                    </strong>{" "}
                    đang có điểm nghẽn bàn giao specs hoặc hạn chót ({riskTask.expected_deadline || "Khẩn"}). Cần Leader họp nhanh với PO Squad để chốt luồng.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>Tổng số: <strong>{totalCount}</strong> đề bài được tiếp nhận</span>
            <span className="font-mono text-emerald-600 font-bold">{completedCount} hoàn thành</span>
          </div>
        </div>

        {/* Right: Workload by Status & Team Distribution (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-3">
              <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Phân bổ Tải trọng (Workload Status)
              </h3>
              <span className="text-xs font-mono font-bold text-zinc-500">{totalCount} tasks</span>
            </div>

            {/* Segmented Bar */}
            <div className="w-full h-3.5 bg-zinc-100 rounded-full overflow-hidden flex shadow-inner mb-3">
              {statusSegments.map((seg, i) => {
                const pct = totalCount > 0 ? (seg.count / totalCount) * 100 : 0
                if (pct <= 0) return null
                return (
                  <div
                    key={i}
                    className={`${seg.color} h-full transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${seg.label}: ${seg.count} tasks`}
                  />
                )
              })}
            </div>

            {/* Breakdown List */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {statusSegments.map((seg, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${seg.color}`} />
                    <span className="text-zinc-600 truncate">{seg.label}</span>
                  </div>
                  <span className="font-mono font-bold text-zinc-900">{seg.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Designer capacity pills */}
          <div className="pt-3 border-t border-zinc-100">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Nhân sự chủ chốt</p>
            <div className="flex items-center gap-2 flex-wrap">
              {assigneeStats.map((item, idx) => (
                <div key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs">
                  <UserAvatar name={item.name} size="xs" />
                  <span className="font-medium text-zinc-700">{item.name.split(" ").slice(-1)[0]}</span>
                  <span className="font-mono font-bold text-[#1057FB] text-[11px]">({item.open})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 3: THE MAIN ATTRACTION - REUI GANTT ROADMAP BLOCK
          ========================================================================= */}
      <ReUIGanttChart
        requests={requests}
        onSelectRequest={setSelectedRequest}
      />

      {/* =========================================================================
          ROW 4: LATEST ACTIVITY STREAM (reUI Timeline Cards)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              Nhật ký Hoạt động Tác nghiệp Gần nhất
            </h3>
            <p className="text-xs text-zinc-500">
              Cập nhật tương tác, đổi khâu và phản hồi trực tiếp giữa PO & Designer
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400 font-semibold">{recentActivities.length} sự kiện</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {recentActivities.map((act, idx) => (
            <div
              key={act.id || `act-card-${idx}`}
              onClick={() => setSelectedRequest(act.request)}
              className="p-4 rounded-xl border border-zinc-200/80 bg-white hover:border-[#1057FB]/60 hover:shadow-sm transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-zinc-900 truncate group-hover:text-[#1057FB] transition-colors">
                  {act.taskTitle}
                </p>
                <span className="text-[10px] font-mono text-zinc-400 shrink-0">{act.time}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/70 text-xs text-zinc-700 leading-snug">
                {act.detail || "Cập nhật tài liệu thiết kế và prototype"}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 text-[11px] text-zinc-500">
                <UserAvatar name={act.user} size="xs" />
                <span className="truncate">
                  <strong className="text-zinc-800">{act.user}</strong> {act.action}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          MODALS & DRAWERS
          ========================================================================= */}
      <SquadDetailModal squad={selectedSquad} onClose={() => setSelectedSquad(null)} />

      <MemberDetailDrawer
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onSelectRequest={setSelectedRequest}
      />

      <RequestDetail
        open={Boolean(selectedRequest)}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onUpdated={async () => {
          await loadData(true)
          const allReqs = await fetchRequests()
          const found = allReqs.find((r) => r.request_id === selectedRequest?.request_id)
          if (found) setSelectedRequest(found)
        }}
      />
    </main>
  )
}
