import React, { useState, useEffect, useMemo } from "react"
import { UXRequest, Squad } from "@/data/mockData"
import { UserAvatar } from "@/components/common/UserAvatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import {
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
  Target,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Briefcase,
  SlidersHorizontal,
  CircleDot,
  Trophy,
  ArrowUpRight,
} from "lucide-react"

interface WeeklyCheckinSectionProps {
  requests: UXRequest[]
  squads: Squad[]
  onSelectRequest: (req: UXRequest) => void
  onSelectSquad?: (squad: Squad) => void
}

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const formatDay = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`

  const tempDate = new Date(now.valueOf())
  const dayNr = (now.getDay() + 6) % 7
  tempDate.setDate(tempDate.getDate() - dayNr + 3)
  const firstThursday = tempDate.valueOf()
  tempDate.setMonth(0, 1)
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay() + 7) % 7))
  }
  const weekNum = 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000)

  return {
    weekNumber: weekNum,
    monday,
    sunday,
    formattedRange: `${formatDay(monday)} - ${formatDay(sunday)}/${now.getFullYear()}`,
  }
}

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null
  const parts = dateStr.trim().split(/[\/\-]/)
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
    }
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10))
  }
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

export default function WeeklyCheckinSection({
  requests,
  squads,
  onSelectRequest,
  onSelectSquad,
}: WeeklyCheckinSectionProps) {
  const weekInfo = useMemo(() => getWeekRange(), [])

  // --- 1. MEETING TIMER STATE ---
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60)
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false)
  const [timerPreset, setTimerPreset] = useState<15 | 30>(15)

  useEffect(() => {
    let interval: any = null
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false)
      toast.warning("⏰ Đã hết thời gian họp check-in đầu tuần!", {
        description: "Vui lòng tổng kết các hành động ưu tiên và chốt biên bản.",
      })
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerRunning, timeLeft])

  const handleToggleTimer = () => setIsTimerRunning((prev) => !prev)

  const handleResetTimer = (preset?: 15 | 30) => {
    const p = preset || timerPreset
    setTimerPreset(p)
    setTimeLeft(p * 60)
    setIsTimerRunning(false)
  }

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  // --- 2. FILTERS STATE ---
  const [selectedSquadFilter, setSelectedSquadFilter] = useState<string>("ALL")
  const [selectedDesignerFilter, setSelectedDesignerFilter] = useState<string>("ALL")
  const [onlyAttention, setOnlyAttention] = useState<boolean>(false)
  const [focusedDesigner, setFocusedDesigner] = useState<string | null>(null)
  const [copiedBrief, setCopiedBrief] = useState<boolean>(false)

  const availableSquadNames = useMemo(() => {
    const set = new Set<string>()
    squads.forEach((s) => s.squad_name && set.add(s.squad_name))
    requests.forEach((r) => {
      if (r.squad_name) set.add(r.squad_name)
      if (r.preferred_squad) set.add(r.preferred_squad)
    })
    return Array.from(set).filter(Boolean)
  }, [squads, requests])

  const availableDesigners = useMemo(() => {
    const set = new Set<string>()
    requests.forEach((r) => {
      if (r.assigned_designer && r.assigned_designer.trim()) {
        set.add(r.assigned_designer.trim())
      }
    })
    return Array.from(set).filter(Boolean)
  }, [requests])

  // --- 3. FILTERED REQUESTS ---
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (selectedSquadFilter !== "ALL") {
        const sq = (r.squad_name || r.preferred_squad || "").toLowerCase()
        if (!sq.includes(selectedSquadFilter.toLowerCase())) return false
      }
      if (selectedDesignerFilter !== "ALL") {
        const des = (r.assigned_designer || "").toLowerCase()
        if (!des.includes(selectedDesignerFilter.toLowerCase())) return false
      }
      if (onlyAttention) {
        const isBlocked = r.status === "Bị chặn" || (r.priority === "Urgent" && r.status !== "Hoàn thành")
        const isPending = r.status === "PO pending" || r.status === "Đã gửi PO"
        if (!isBlocked && !isPending) return false
      }
      return true
    })
  }, [requests, selectedSquadFilter, selectedDesignerFilter, onlyAttention])

  // --- 4. DATA BLOCKS ---
  // Khối 1: Điểm nghẽn & Cần tháo gỡ ngay
  const blockersAndRisks = useMemo(() => {
    const nowMs = Date.now()

    return filteredRequests
      .filter((r) => {
        if (r.status === "Hoàn thành" || r.status === "Hoành thành") return false

        const isBlocked = r.status === "Bị chặn"
        const isPoPending = r.status === "PO pending"
        const isSentToPo = r.status === "Đã gửi PO"
        const isUrgent = r.priority === "Urgent"

        let isNearOverdue = false
        const targetDate = parseDate(r.design_deadline || r.expected_deadline)
        if (targetDate) {
          const diffDays = (targetDate.getTime() - nowMs) / (1000 * 3600 * 24)
          if (diffDays <= 3) {
            isNearOverdue = true
          }
        }

        return isBlocked || isPoPending || isSentToPo || isUrgent || isNearOverdue
      })
      .sort((a, b) => {
        const weight = (r: UXRequest) => {
          if (r.status === "Bị chặn") return 1
          if (r.status === "PO pending") return 2
          if (r.priority === "Urgent") return 3
          return 4
        }
        return weight(a) - weight(b)
      })
  }, [filteredRequests])

  // Khối 2: Trọng tâm cam kết tuần này
  const thisWeekCommitments = useMemo(() => {
    return filteredRequests
      .filter((r) => {
        if (r.status === "Hoàn thành" || r.status === "Hoành thành") return false
        return r.status === "Đang thực hiện" || r.current_phase === "UI Design" || r.current_phase === "Prototype"
      })
      .sort((a, b) => (b.progress || 0) - (a.progress || 0))
  }, [filteredRequests])

  // Khối 3: Bàn tròn Nhân sự
  const designerStandupList = useMemo(() => {
    const map = new Map<
      string,
      {
        designerName: string
        activeTasks: UXRequest[]
        completedTasks: UXRequest[]
        blockedTasks: UXRequest[]
        primarySquad: string
        capacityStatus: "Sẵn sàng" | "Vừa vặn" | "Đang bận" | "Quá tải"
      }
    >()

    const allKnownDesigners = availableDesigners.length > 0
      ? availableDesigners
      : ["Nguyễn Văn Cường", "Lê Hoàng Nam", "Phạm Hải Đăng", "Vũ Thùy Linh"]

    allKnownDesigners.forEach((name) => {
      map.set(name, {
        designerName: name,
        activeTasks: [],
        completedTasks: [],
        blockedTasks: [],
        primarySquad: "Đa Squad",
        capacityStatus: "Sẵn sàng",
      })
    })

    requests.forEach((r) => {
      const des = (r.assigned_designer || "").trim()
      if (!des || des === "Chưa phân công" || des === "Chưa gán") return

      if (!map.has(des)) {
        map.set(des, {
          designerName: des,
          activeTasks: [],
          completedTasks: [],
          blockedTasks: [],
          primarySquad: r.squad_name || r.preferred_squad || "Chưa rõ",
          capacityStatus: "Sẵn sàng",
        })
      }

      const entry = map.get(des)!
      const isDone = r.status === "Hoàn thành" || r.status === "Hoành thành"
      const isBlocked = r.status === "Bị chặn" || r.status === "PO pending"

      if (isDone) {
        entry.completedTasks.push(r)
      } else {
        entry.activeTasks.push(r)
        if (isBlocked) entry.blockedTasks.push(r)
      }

      if (entry.primarySquad === "Đa Squad" && (r.squad_name || r.preferred_squad)) {
        entry.primarySquad = r.squad_name || r.preferred_squad || "Đa Squad"
      }
    })

    const list = Array.from(map.values()).map((entry) => {
      const count = entry.activeTasks.length
      let status: "Sẵn sàng" | "Vừa vặn" | "Đang bận" | "Quá tải" = "Sẵn sàng"
      if (count >= 5) status = "Quá tải"
      else if (count >= 3) status = "Đang bận"
      else if (count >= 1) status = "Vừa vặn"

      return {
        ...entry,
        capacityStatus: status,
      }
    })

    if (selectedDesignerFilter !== "ALL") {
      return list.filter((d) => d.designerName.toLowerCase().includes(selectedDesignerFilter.toLowerCase()))
    }

    return list.sort((a, b) => b.activeTasks.length - a.activeTasks.length)
  }, [requests, availableDesigners, selectedDesignerFilter])

  // Khối 4: Chiến tích tuần trước
  const lastWeekWins = useMemo(() => {
    return filteredRequests
      .filter((r) => r.status === "Hoàn thành" || r.status === "Hoành thành")
      .slice(0, 5)
  }, [filteredRequests])

  // Khối 5: Ma trận Tải trọng Squads
  const squadCapacityMetrics = useMemo(() => {
    return squads.map((sq) => {
      const matchTasks = requests.filter(
        (r) =>
          (r.squad_name && r.squad_name.toLowerCase() === sq.squad_name.toLowerCase()) ||
          (r.preferred_squad && r.preferred_squad.toLowerCase() === sq.squad_name.toLowerCase()) ||
          (r.product && r.product.toLowerCase() === sq.product_name?.toLowerCase())
      )

      const active = matchTasks.filter((r) => r.status !== "Hoàn thành" && r.status !== "Hoành thành")
      const blocked = matchTasks.filter((r) => r.status === "Bị chặn" || r.status === "PO pending")
      const threshold = sq.capacity_threshold || 6
      const loadRatio = Math.min(Math.round((active.length / threshold) * 100), 100)

      let statusColor = "text-emerald-600 bg-emerald-50 border-emerald-200"
      let statusText = "Sẵn sàng"
      if (loadRatio >= 100) {
        statusColor = "text-rose-600 bg-rose-50 border-rose-200"
        statusText = "Quá tải"
      } else if (loadRatio >= 75) {
        statusColor = "text-amber-600 bg-amber-50 border-amber-200"
        statusText = "Bận"
      } else if (loadRatio >= 40) {
        statusColor = "text-blue-600 bg-blue-50 border-blue-200"
        statusText = "Bình thường"
      }

      return {
        squad: sq,
        activeCount: active.length,
        blockedCount: blocked.length,
        threshold,
        loadRatio,
        statusColor,
        statusText,
      }
    })
  }, [squads, requests])

  // --- 5. TỔNG HỢP & COPY TÓM TẮT HỌP GỬI TEAMS / SLACK ---
  const handleCopyMeetingBrief = () => {
    const dateStr = weekInfo.formattedRange
    const weekNr = weekInfo.weekNumber

    let brief = `📢 **BIÊN BẢN HỌP CHECK-IN ĐẦU TUẦN (TUẦN W${weekNr} • ${dateStr})**\n`
    brief += `*MB UX Team • Bảng điều phối tiến độ & cam kết mục tiêu tuần*\n\n`

    brief += `🚨 **1. ĐIỂM NGHẼN CẦN GIẢI TỎA GẤP (${blockersAndRisks.length} bài toán):**\n`
    if (blockersAndRisks.length === 0) {
      brief += `✅ Không có bài toán nào bị nghẽn trong tuần này!\n`
    } else {
      blockersAndRisks.slice(0, 5).forEach((t, i) => {
        const reason = t.pending_reason || t.latest_update?.message || "Cần thống nhất luồng với PO/Tech"
        brief += `${i + 1}. [${t.request_id}] **${t.title}** (${t.squad_name || t.product})\n`
        brief += `   - Phụ trách: ${t.assigned_designer || "Chưa gán"} | Trạng thái: ${t.status}\n`
        brief += `   - Vấn đề: ${reason}\n`
      })
    }
    brief += `\n`

    brief += `🎯 **2. TRỌNG TÂM CAM KẾT BÀN GIAO TUẦN NÀY (${thisWeekCommitments.length} bài toán):**\n`
    thisWeekCommitments.slice(0, 6).forEach((t, i) => {
      brief += `${i + 1}. **${t.title}** (${t.request_id})\n`
      brief += `   - Designer: ${t.assigned_designer || "Chưa gán"} | Khâu: ${t.current_phase} (${t.progress}%)\n`
      brief += `   - Hạn chót: ${t.design_deadline || t.expected_deadline || "Trong tuần"}\n`
    })
    brief += `\n`

    brief += `👥 **3. TỔNG HỢP NHÂN SỰ & TẢI TRỌNG:**\n`
    designerStandupList.forEach((d) => {
      brief += `- **${d.designerName}**: ${d.activeTasks.length} tasks (${d.capacityStatus})${d.blockedTasks.length > 0 ? ` ⚠️ Có ${d.blockedTasks.length} task bị nghẽn` : ""}\n`
    })
    brief += `\n`

    brief += `🏆 **4. KẾT QUẢ TUẦN TRƯỚC:** ${lastWeekWins.length} bài toán hoàn thành và bàn giao thành công.\n`
    brief += `\n---\n*Xem chi tiết trên UX Portal: https://mbuxdesigner.github.io/UXMBTaskRequest/#overview*`

    navigator.clipboard.writeText(brief).then(() => {
      setCopiedBrief(true)
      toast.success("Đã copy tóm tắt cuộc họp vào Clipboard!", {
        description: "Bạn có thể dán ngay vào kênh Microsoft Teams hoặc email của nhóm.",
      })
      setTimeout(() => setCopiedBrief(false), 3000)
    })
  }

  return (
    <div className="space-y-6">
      {/* =========================================================================
          CONTROL BAR: TUẦN LÀM VIỆC + MEETING TIMER + COPY TEAMS BRIEF + FILTERS
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Tuần hiện tại */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-navy text-white flex items-center justify-center shadow-sm shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Cuộc Họp Check-in Đầu Tuần
                </h2>
                <Badge variant="navy" size="xs">
                  Tuần W{weekInfo.weekNumber}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Khung làm việc: <strong className="text-slate-800 font-medium">{weekInfo.formattedRange}</strong>
              </p>
            </div>
          </div>

          {/* Meeting Timer & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Countdown Timer Widget */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                timeLeft <= 60
                  ? "bg-rose-50 border-rose-300 text-rose-700 animate-pulse"
                  : timeLeft <= 180
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-slate-50 border-slate-200/90 text-slate-800"
              }`}
            >
              <Clock className="w-4 h-4 shrink-0 text-slate-500" />
              <div className="font-mono font-bold text-sm tracking-wider">
                {formatTimer(timeLeft)}
              </div>

              {/* Play / Pause button */}
              <button
                type="button"
                onClick={handleToggleTimer}
                title={isTimerRunning ? "Tạm dừng đồng hồ" : "Bắt đầu tính giờ họp"}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:text-navy hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>

              {/* Reset button */}
              <button
                type="button"
                onClick={() => handleResetTimer()}
                title="Đặt lại đồng hồ"
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>

              {/* Presets 15m / 30m */}
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                <button
                  type="button"
                  onClick={() => handleResetTimer(15)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                    timerPreset === 15 ? "bg-navy text-white" : "text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  15p
                </button>
                <button
                  type="button"
                  onClick={() => handleResetTimer(30)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                    timerPreset === 30 ? "bg-navy text-white" : "text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  30p
                </button>
              </div>
            </div>

            {/* Copy Meeting Brief to Teams button */}
            <Button
              variant="default"
              size="sm"
              onClick={handleCopyMeetingBrief}
              className="h-9 px-3.5 text-xs font-semibold rounded-xl bg-[#1057FB] hover:bg-[#0046E5] text-white shadow-2xs gap-1.5 cursor-pointer"
            >
              {copiedBrief ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedBrief ? "Đã sao chép!" : "Copy Tóm tắt gửi Teams"}</span>
            </Button>
          </div>
        </div>

        {/* Quick Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Lọc nhanh:
            </span>

            {/* Squad Filter dropdown */}
            <select
              value={selectedSquadFilter}
              onChange={(e) => setSelectedSquadFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-navy cursor-pointer"
            >
              <option value="ALL">Tất cả Squads ({availableSquadNames.length})</option>
              {availableSquadNames.map((sq) => (
                <option key={sq} value={sq}>
                  {sq}
                </option>
              ))}
            </select>

            {/* Designer Filter dropdown */}
            <select
              value={selectedDesignerFilter}
              onChange={(e) => setSelectedDesignerFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-navy cursor-pointer"
            >
              <option value="ALL">Tất cả Designers ({availableDesigners.length})</option>
              {availableDesigners.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Only Attention Needed toggle */}
            <button
              type="button"
              onClick={() => setOnlyAttention((prev) => !prev)}
              className={`h-8 px-3 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer font-medium ${
                onlyAttention
                  ? "bg-rose-50 border-rose-300 text-rose-700 shadow-2xs font-semibold"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Chỉ task cần chú ý</span>
            </button>
          </div>

          <div className="text-slate-500 font-mono text-[11px]">
            Đang hiển thị: <strong className="text-slate-800">{filteredRequests.length}</strong> / {requests.length} tasks
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 1: THE 2 POWER HOOKS (BLOCKERS CẦN GỠ vs TRỌNG TÂM CAM KẾT TUẦN NÀY)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: BLOCKERS & AT-RISK (5 COLS) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-rose-200/90 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Điểm Nghẽn & Khẩn Cấp Cần Gỡ
                  </h3>
                  <p className="text-[11px] text-slate-500">Ưu tiên xử lý ngay đầu buổi họp</p>
                </div>
              </div>
              <Badge variant="destructive" size="xs" className="font-mono">
                {blockersAndRisks.length} tasks
              </Badge>
            </div>

            {blockersAndRisks.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">Tuần này thông suốt!</p>
                <p className="text-[11px] text-slate-400">Không có bài toán nào bị kẹt hoặc trễ hạn.</p>
              </div>
            ) : (
              <div className="space-y-2.5 pt-3 max-h-[380px] overflow-y-auto pr-1">
                {blockersAndRisks.map((task) => {
                  const isBlocked = task.status === "Bị chặn"
                  const isPoPending = task.status === "PO pending"

                  return (
                    <div
                      key={task.request_id}
                      onClick={() => onSelectRequest(task)}
                      className="p-3 rounded-xl border border-rose-200/80 bg-rose-50/40 hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-100/90 px-1.5 py-0.5 rounded">
                              {task.request_id}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500">
                              {task.squad_name || task.product}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#1057FB] transition-colors line-clamp-1">
                            {task.title}
                          </h4>
                        </div>
                        <Badge
                          variant={isBlocked ? "destructive" : isPoPending ? "amber" : "navy"}
                          size="xs"
                          className="shrink-0 text-[10px]"
                        >
                          {task.status}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-rose-900/90 bg-white/80 p-2 rounded-lg border border-rose-100 font-normal leading-relaxed">
                        {task.pending_reason || task.latest_update?.message || "Đang chờ thông tin từ các bên liên quan"}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <UserAvatar name={task.assigned_designer || "Chưa gán"} size="xs" />
                          <span className="text-slate-700 font-medium">
                            {task.assigned_designer?.split(" ").slice(-1)[0] || "Chưa gán"}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] text-rose-700 font-medium">
                          Hạn: {task.design_deadline || task.expected_deadline || "Chưa set"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-rose-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Click vào từng bài toán để cập nhật note / phân công trực tiếp</span>
          </div>
        </div>

        {/* Right: TRỌNG TÂM CAM KẾT TUẦN NÀY (7 COLS) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#1057FB] flex items-center justify-center font-bold">
                  <Target className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Trọng Tâm Bàn Giao Tuần Này (Sprint Commitments)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Các mốc thiết kế then chốt cần chuyển khâu & nghiệm thu
                  </p>
                </div>
              </div>
              <Badge variant="navy" size="xs" className="font-mono">
                {thisWeekCommitments.length} bài toán
              </Badge>
            </div>

            {thisWeekCommitments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Chưa có task nào được đánh dấu cam kết trong tuần này.
              </div>
            ) : (
              <div className="space-y-2.5 pt-3 max-h-[380px] overflow-y-auto pr-1">
                {thisWeekCommitments.map((task) => (
                  <div
                    key={task.request_id}
                    onClick={() => onSelectRequest(task)}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-[#1057FB]/70 hover:shadow-xs transition-all cursor-pointer space-y-2.5 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {task.request_id}
                          </span>
                          <Badge variant="outline" size="xs">
                            {task.squad_name || task.product}
                          </Badge>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#1057FB] transition-colors line-clamp-1">
                          {task.title}
                        </h4>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-[#1057FB]">
                          {task.progress || 0}%
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {task.current_phase || "UI Design"}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#1057FB] h-full rounded-full transition-all"
                        style={{ width: `${task.progress || 10}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <UserAvatar name={task.assigned_designer || "Chưa gán"} size="xs" />
                        <span className="text-slate-700 font-medium text-[11px]">
                          {task.assigned_designer || "Chưa gán Designer"}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-600">
                        Hạn: <strong className="text-slate-800">{task.design_deadline || task.expected_deadline || "Trong tuần"}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Đạt 100% mục tiêu cam kết giúp duy trì SLA tỷ lệ bàn giao đúng hạn</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: BÀN TRÒN BÁO CÁO NHÂN SỰ (ROUND-ROBIN DESIGNER STANDUP CARDS)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Bàn Tròn Báo Cáo Nhân Sự (Round-Robin Designer Standup)
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Lần lượt từng Designer trình bày nhanh: Việc tuần này • Khó khăn • Tình trạng tải
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Đội ngũ:</span>
            <strong className="text-slate-900 font-mono">{designerStandupList.length} nhân sự</strong>
          </div>
        </div>

        {/* Grid thẻ Designer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
          {designerStandupList.map((d) => {
            const isFocused = focusedDesigner === d.designerName
            const hasBlocked = d.blockedTasks.length > 0

            let capacityBadgeVariant: "success" | "navy" | "amber" | "destructive" = "success"
            if (d.capacityStatus === "Quá tải") capacityBadgeVariant = "destructive"
            else if (d.capacityStatus === "Đang bận") capacityBadgeVariant = "amber"
            else if (d.capacityStatus === "Vừa vặn") capacityBadgeVariant = "navy"

            return (
              <div
                key={d.designerName}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                  isFocused
                    ? "border-navy ring-2 ring-navy/20 bg-navy-50/20 shadow-md"
                    : hasBlocked
                    ? "border-rose-200 bg-rose-50/20 hover:border-rose-300"
                    : "border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs"
                }`}
              >
                {/* Header thẻ Designer */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar name={d.designerName} size="sm" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{d.designerName}</h4>
                      <p className="text-[11px] text-slate-500 truncate max-w-[130px]">{d.primarySquad}</p>
                    </div>
                  </div>

                  <Badge variant={capacityBadgeVariant} size="xs" className="shrink-0 text-[10px]">
                    {d.capacityStatus}
                  </Badge>
                </div>

                {/* Danh sách task active trong tuần */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Đang phụ trách ({d.activeTasks.length})</span>
                    {hasBlocked && (
                      <span className="text-rose-600 font-bold flex items-center gap-0.5 text-[10px]">
                        <AlertTriangle className="w-3 h-3" /> {d.blockedTasks.length} nghẽn
                      </span>
                    )}
                  </div>

                  {d.activeTasks.length === 0 ? (
                    <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-[11px] text-emerald-800 text-center font-medium">
                      ✨ Sẵn sàng tiếp nhận bài toán mới
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5">
                      {d.activeTasks.slice(0, 3).map((t) => (
                        <div
                          key={t.request_id}
                          onClick={() => onSelectRequest(t)}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors cursor-pointer text-[11px] space-y-1"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-slate-800 truncate line-clamp-1">
                              {t.title}
                            </span>
                            <span className="font-mono text-[10px] text-[#1057FB] shrink-0 font-bold">
                              {t.progress || 0}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>{t.current_phase || "UI Design"}</span>
                            <span>{t.design_deadline || t.expected_deadline || "Trong tuần"}</span>
                          </div>
                        </div>
                      ))}
                      {d.activeTasks.length > 3 && (
                        <p className="text-[10px] text-slate-400 text-center italic">
                          +{d.activeTasks.length - 3} bài toán khác
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer thẻ: Nút focus khi bạn đó đang phát biểu */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setFocusedDesigner(isFocused ? null : d.designerName)}
                    className={`text-[11px] font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                      isFocused
                        ? "bg-navy text-white"
                        : "text-slate-600 hover:text-navy hover:bg-slate-100"
                    }`}
                  >
                    <CircleDot className="w-3 h-3" />
                    <span>{isFocused ? "Đang báo cáo" : "Lượt phát biểu"}</span>
                  </button>

                  <span className="text-[10px] font-mono text-slate-400">
                    Hoàn thành: {d.completedTasks.length}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* =========================================================================
          ROW 3: SQUAD CAPACITY RADAR & LAST WEEK WINS
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: MA TRẬN SỨC KHỎE SQUAD (7 COLS) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Briefcase className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Ma Trận Tải Trọng & Sức Khỏe Squads
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono font-medium">
                {squadCapacityMetrics.length} Squads
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              {squadCapacityMetrics.map((item) => (
                <div
                  key={item.squad.squad_id || item.squad.squad_name}
                  onClick={() => onSelectSquad && onSelectSquad(item.squad)}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-2xs transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {item.squad.squad_name}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {item.squad.product_name || "Sản phẩm MB"}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.statusColor}`}
                    >
                      {item.statusText}
                    </span>
                  </div>

                  {/* Progress tải */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Tải trọng:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {item.activeCount} / {item.threshold} tasks ({item.loadRatio}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.loadRatio >= 100
                            ? "bg-rose-500"
                            : item.loadRatio >= 75
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${item.loadRatio}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>Lead: <strong className="text-slate-600 font-medium">{item.squad.ux_owner?.split(" ").slice(-1)[0] || "Lead"}</strong></span>
                    {item.blockedCount > 0 && (
                      <span className="text-rose-600 font-bold">⚠️ {item.blockedCount} nghẽn</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Cân đối chuyển việc từ Squad đỏ sang Squad xanh để giải phóng năng lực</span>
          </div>
        </div>

        {/* Right: CHIẾN TÍCH TUẦN TRƯỚC (LAST WEEK WINS - 5 COLS) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Trophy className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Chiến Tích Tuần Trước (Last Week Wins)
                  </h3>
                  <p className="text-[11px] text-slate-500">Bàn giao & PO đã duyệt nghiệm thu</p>
                </div>
              </div>
              <Badge variant="success" size="xs" className="font-mono">
                {lastWeekWins.length} hoàn thành
              </Badge>
            </div>

            {lastWeekWins.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Chưa ghi nhận task hoàn thành trong kỳ gần nhất.
              </div>
            ) : (
              <div className="space-y-2.5 pt-3">
                {lastWeekWins.map((task) => (
                  <div
                    key={task.request_id}
                    onClick={() => onSelectRequest(task)}
                    className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50/80 transition-all cursor-pointer space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        {task.request_id}
                      </span>
                      <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã nghiệm thu
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#1057FB] transition-colors line-clamp-1">
                      {task.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span className="text-slate-600">
                        {task.assigned_designer || "Designer"} • {task.squad_name || task.product}
                      </span>
                      {task.deliverables?.figma_url && (
                        <span className="text-[10px] font-semibold text-[#1057FB] flex items-center gap-0.5">
                          Figma Specs <ArrowUpRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 text-center">
            🎉 Duy trì năng lượng tích cực cho tuần làm việc mới!
          </div>
        </div>
      </div>
    </div>
  )
}
