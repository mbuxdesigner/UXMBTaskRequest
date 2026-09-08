import { useState, useEffect, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DashboardSkeleton } from "@/components/common/ReuiSkeletons"
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
import PageHeader from "@/components/common/PageHeader"
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
  const selectedRequestRef = useRef<UXRequest | null>(null)
  useEffect(() => {
    selectedRequestRef.current = selectedRequest
  }, [selectedRequest])
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
      setError(err?.message || "Không thể tải dữ liệu bài toán từ hệ thống.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData(true)
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
      { label: "Chưa gán", count: unassigned, color: "bg-slate-400" },
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
          const updateAny = upd as any
          activities.push({
            id: `upd-${idx}-${uIdx}`,
            user: upd.updated_by || updateAny.author || req.assigned_designer || "Designer",
            action: upd.new_phase ? `chuyển sang ${upd.new_phase}` : (updateAny.type === "phase_change" ? "đã chuyển giai đoạn" : "cập nhật tiến độ"),
            detail: upd.note || updateAny.message || "",
            time: upd.timestamp || updateAny.created_at || "Vừa xong",
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
    <main id="main-content" tabIndex={-1} className="w-full space-y-6 text-slate-900 animate-in fade-in-50 duration-200 pb-8 outline-none">
      {/* =========================================================================
          REUI HEADER BREADCRUMB & COMMAND BAR
          ========================================================================= */}
      <PageHeader
        breadcrumb={{
          parent: "MBBank UX Platform",
          current: "Executive Dashboard",
        }}
        title="Bảng Điều Hành & Lộ Trình UX"
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </span>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            loading={refreshing}
            aria-label="Làm mới dữ liệu bảng điều hành"
            className="h-10 px-4 text-xs font-bold rounded-xl bg-white border-slate-200 text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive" onDismiss={() => setError(null)}>
          <AlertTitle>Lỗi kết nối</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="dashboard-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="w-full"
          >
            <DashboardSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-content"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="space-y-6"
          >
            {/* =========================================================================
                ROW 1: 4 HERO KPI BENTO CARDS (reUI Metric Tiles)
                ========================================================================= */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: In Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang triển khai</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-[#1057FB]">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-semibold text-slate-900 font-mono tracking-tight">
            {inProgressCount}
            <span className="text-xs text-slate-400 font-sans font-normal ml-1">tasks</span>
          </div>
          <p className="text-[11.5px] text-slate-500 font-normal">Đang lên UI & Prototype đa Squad</p>
        </div>

        {/* Card 2: SLA On-time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đúng hạn SLA</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-semibold text-emerald-600 font-mono tracking-tight">
            96.4<span className="text-base text-emerald-500 font-sans font-normal">%</span>
          </div>
          <p className="text-[11.5px] text-slate-500 font-normal">
            <span className="font-medium text-emerald-600 font-mono">+3.8%</span> so với tháng trước
          </p>
        </div>

        {/* Card 3: First Time Right */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nghiệm thu tuần</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200/70 flex items-center justify-center text-purple-600">
              <FileCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-semibold text-slate-900 font-mono tracking-tight">
            {completedCount}
            <span className="text-xs text-slate-400 font-sans font-normal ml-1">đã duyệt</span>
          </div>
          <p className="text-[11.5px] text-slate-500 font-normal">Bàn giao Tech thành công</p>
        </div>

        {/* Card 4: Risks & Blockers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cần hỗ trợ / Gấp</span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/70 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-semibold text-rose-600 font-mono tracking-tight">
            {blockedCount || (riskTask ? 1 : 0)}
            <span className="text-xs text-slate-400 font-sans font-normal ml-1">rủi ro</span>
          </div>
          <p className="text-[11.5px] text-rose-600 font-medium">Cần Leader can thiệp giải tỏa</p>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: AI EXECUTIVE BRIEFING + WORKLOAD METERS
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: AI Executive Briefing (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/80 shadow-2xs" aria-hidden="true">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  AI Executive Digest
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-500 font-normal">Realtime Synthesis</span>
            </div>

            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3 font-normal">
              <p>
                Đội ngũ <strong className="font-medium text-slate-900">UXTeamMB</strong> đang đồng loạt tăng tốc các sáng kiến số hóa trọng điểm:{" "}
                {activeKeyTasks.map((t, i) => (
                  <span key={t.request_id || `active-key-${i}`} className="inline-flex items-center gap-1 mx-1 flex-wrap font-normal">
                    <CircleDot className="w-3 h-3 text-[#1057FB] inline" />
                    <span 
                      onClick={() => setSelectedRequest(t)}
                      className="font-medium text-slate-900 hover:text-[#1057FB] cursor-pointer underline decoration-slate-300 underline-offset-2"
                    >
                      {t.title}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-[#1057FB] text-[10px] font-mono font-medium">
                      {t.current_phase || "UI"}
                    </span>
                    {i < activeKeyTasks.length - 1 ? "," : "."}
                  </span>
                ))}
              </p>

              {riskTask && (
                <div className="p-3.5 bg-rose-50/80 rounded-xl border border-rose-200/80 text-rose-950 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-rose-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Dự án cần xử lý ngay:</span>
                  </div>
                  <p className="font-normal">
                    <strong 
                      onClick={() => setSelectedRequest(riskTask)}
                      className="hover:underline cursor-pointer text-rose-900 font-medium"
                    >
                      {riskTask.title}
                    </strong>{" "}
                    đang có điểm nghẽn bàn giao specs hoặc hạn chót ({riskTask.expected_deadline || "Khẩn"}). Cần Leader họp nhanh với PO Squad để chốt luồng.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-normal">
            <span>Tổng số: <strong className="font-medium text-slate-900">{totalCount}</strong> đề bài được tiếp nhận</span>
            <span className="font-mono text-[#047857] font-medium">{completedCount} hoàn thành</span>
          </div>
        </div>

        {/* Right: Workload by Status & Team Distribution (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Phân bổ Tải trọng (Workload Status)
              </h2>
              <span className="text-xs font-mono font-medium text-slate-600">{totalCount} tasks</span>
            </div>

            {/* Segmented Bar */}
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner mb-3">
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

            {/* Breakdown List (2-sided: 1 bên regular 1 bên medium) */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {statusSegments.map((seg, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${seg.color}`} />
                    <span className="text-slate-600 truncate font-normal">{seg.label}</span>
                  </div>
                  <span className="font-mono font-medium text-slate-900">{seg.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Designer capacity pills */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Nhân sự chủ chốt</p>
            <div className="flex items-center gap-2 flex-wrap">
              {assigneeStats.map((item, idx) => (
                <div key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <UserAvatar name={item.name} size="xs" />
                  <span className="font-normal text-slate-700">{item.name.split(" ").slice(-1)[0]}</span>
                  <span className="font-mono font-medium text-[#1057FB] text-[11px]">({item.open})</span>
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
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Nhật ký Hoạt động Tác nghiệp Gần nhất
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              Cập nhật tương tác, đổi khâu và phản hồi trực tiếp giữa PO & Designer
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 font-normal">{recentActivities.length} sự kiện</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {recentActivities.map((act, idx) => (
            <div
              key={act.id || `act-card-${idx}`}
              onClick={() => setSelectedRequest(act.request)}
              className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-[#1057FB]/60 hover:shadow-sm transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-[#1057FB] transition-colors">
                  {act.taskTitle}
                </p>
                <span className="text-[10px] font-mono text-slate-400 font-normal shrink-0">{act.time}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs text-slate-600 font-normal leading-snug">
                {act.detail || "Cập nhật tài liệu thiết kế và prototype"}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500 font-normal">
                <UserAvatar name={act.user} size="xs" />
                <span className="truncate">
                  <strong className="text-slate-900 font-medium">{act.user}</strong> {act.action}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        onClose={() => {
          selectedRequestRef.current = null
          setSelectedRequest(null)
        }}
        onUpdated={async () => {
          await loadData(true)
          const allReqs = await fetchRequests()
          // CHỈ cập nhật bài toán NẾU người dùng VẪN ĐANG MỞ bài toán đó.
          // Nếu người dùng đã đóng bài toán (selectedRequestRef.current === null),
          // TUYỆT ĐỐI KHÔNG gọi setSelectedRequest để tránh tự động mở lại!
          if (selectedRequestRef.current) {
            const activeId = selectedRequestRef.current.request_id
            const found = allReqs.find((r) => r.request_id === activeId)
            if (found && selectedRequestRef.current?.request_id === activeId) {
              selectedRequestRef.current = found
              setSelectedRequest(found)
            }
          }
        }}
      />
    </main>
  )
}
