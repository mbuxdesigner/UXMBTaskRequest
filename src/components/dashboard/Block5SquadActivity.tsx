import * as React from "react"
import { useMemo, useState } from "react"
import {
  Frame,
  FrameHeader,
  FrameTitle,
  FrameDescription,
  FrameActions,
  FrameBody,
  FrameFooter,
} from "@/components/reui/frame"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/common/UserAvatar"
import type { Squad, UXRequest } from "@/data/mockData"
import { cn } from "@/lib/utils"
import {
  Flame,
  Users,
  Sparkles,
  ChevronRight,
  Activity,
  Layers,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RotateCcw,
} from "lucide-react"

/**
 * Filter keys for trending task priority filter.
 */
export type PriorityFilterType = "ALL" | "URGENT" | "HIGH" | "MEDIUM"

/**
 * Capacity status labels conforming to Milestone 4 specifications:
 * - "Sẵn sàng" (<50%, emerald)
 * - "Bình thường" (50-79%, blue)
 * - "Đang bận" (80-99%, amber)
 * - "Quá tải" (>=100%, rose)
 */
export type CapacityStatus = "Sẵn sàng" | "Bình thường" | "Đang bận" | "Quá tải"

/**
 * Metadata derived from squad workload and capacity threshold.
 */
export interface CapacityUtilizationMeta {
  status: CapacityStatus
  utilizationPct: number
  statusVariant: "success" | "info" | "warning" | "destructive"
  statusBadgeClass: string
  dotColor: string
  barColor: string
}

/**
 * Metadata derived for task priority classification.
 */
export interface PriorityMeta {
  level: "urgent" | "high" | "medium"
  label: string
  badgeVariant: "destructive" | "warning" | "info" | "secondary"
  badgeClass: string
  dotColor: string
}

/**
 * Enriched squad workload information for display and interaction.
 */
export interface SquadWorkloadInfo {
  id: string
  squad: Squad
  name: string
  product: string
  uxOwner: string
  designers: string[]
  activeCount: number
  capacity: number
  utilizationPct: number
  statusLabel: CapacityStatus
  statusVariant: "success" | "info" | "warning" | "destructive"
  statusBadgeClass: string
  dotColor: string
  barColor: string
  visualBarPct: number
  matchedTasks: UXRequest[]
}

/**
 * Props for Block5SquadActivity component.
 */
export interface Block5SquadActivityProps {
  /**
   * Filtered list of UX requests for currently selected product or all.
   * Pure synchronous prop derived from useMemo in TongQuanPage.
   */
  requests: UXRequest[]
  /**
   * Optional squad master list.
   */
  squads?: Squad[]
  /**
   * Callback fired when clicking any highlight task, opening RequestDetail drawer.
   */
  onSelectRequest?: (req: UXRequest) => void
  /**
   * Callback fired when clicking any squad row or selecting a squad.
   */
  onSelectSquad?: (squad: Squad) => void
  /**
   * Optional custom className override for the Frame container.
   */
  className?: string
  /**
   * Maximum number of trending tasks to display (default: 4).
   */
  maxTrendingTasks?: number
}

/**
 * Standard MBBank UX Squads used as robust fallback if squads list is empty.
 */
export const STANDARD_MB_SQUADS: Squad[] = [
  {
    squad_id: "squad-lending",
    squad_name: "Lending Squad",
    product_id: "Lending",
    product_name: "Lending",
    domain: "Vay vốn & Thấu chi",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 6,
    ux_owner: "Đặng Cường",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "squad-transfer",
    squad_name: "TransferD Squad",
    product_id: "TransferD",
    product_name: "TransferD",
    domain: "Chuyển tiền & Thanh toán",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 6,
    ux_owner: "Nguyễn Hải",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "squad-invest",
    squad_name: "Digi Invest Squad",
    product_id: "Digi Invest",
    product_name: "Digi Invest",
    domain: "Đầu tư & Tiết kiệm",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 5,
    ux_owner: "Thu Hương",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "squad-baas",
    squad_name: "BaaS Open API",
    product_id: "BaaS",
    product_name: "BaaS",
    domain: "Ngân hàng mở & SDK",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 4,
    ux_owner: "Trần Quân",
    active_task_titles: [],
    queued_task_titles: [],
  },
  {
    squad_id: "squad-other",
    squad_name: "Core UX & Khác",
    product_id: "Khác",
    product_name: "Khác",
    domain: "Hệ thống chung",
    active_tasks: 0,
    queued_tasks: 0,
    capacity_threshold: 5,
    ux_owner: "UXTeamMB",
    active_task_titles: [],
    queued_task_titles: [],
  },
]

/**
 * Derives squad capacity utilization meters strictly according to Milestone 4 specs:
 * - "Sẵn sàng" (<50%, emerald)
 * - "Bình thường" (50-79%, blue)
 * - "Đang bận" (80-99%, amber)
 * - "Quá tải" (>=100%, rose)
 * Division by zero safe (minimum capacity capped at 1).
 */
export function deriveCapacityUtilization(
  activeCount: number,
  capacityThreshold: number
): CapacityUtilizationMeta {
  const cap = Math.max(1, capacityThreshold || 6)
  const safeCount = Math.max(0, activeCount || 0)
  const utilizationPct = Math.round((safeCount / cap) * 100)

  if (utilizationPct < 50) {
    return {
      status: "Sẵn sàng",
      utilizationPct,
      statusVariant: "success",
      statusBadgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotColor: "bg-emerald-500",
      barColor: "bg-emerald-500",
    }
  }

  if (utilizationPct < 80) {
    return {
      status: "Bình thường",
      utilizationPct,
      statusVariant: "info",
      statusBadgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      dotColor: "bg-blue-500",
      barColor: "bg-blue-500",
    }
  }

  if (utilizationPct < 100) {
    return {
      status: "Đang bận",
      utilizationPct,
      statusVariant: "warning",
      statusBadgeClass: "bg-amber-50 text-amber-800 border-amber-300",
      dotColor: "bg-amber-500",
      barColor: "bg-amber-500",
    }
  }

  return {
    status: "Quá tải",
    utilizationPct,
    statusVariant: "destructive",
    statusBadgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotColor: "bg-rose-500",
    barColor: "bg-rose-500",
  }
}

/**
 * Normalizes priority metadata: Khẩn cấp, Cao, Trung bình.
 */
export function getPriorityMeta(priorityStr?: string, status?: string): PriorityMeta {
  const p = (priorityStr || "").trim().toLowerCase()
  const s = (status || "").trim().toLowerCase()

  // Detect urgent / khẩn cấp
  if (
    p.includes("lv1") ||
    p.includes("urgent") ||
    p.includes("khẩn cấp") ||
    p.includes("critical") ||
    s === "bị chặn"
  ) {
    return {
      level: "urgent",
      label: "Khẩn cấp",
      badgeVariant: "destructive",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      dotColor: "bg-rose-500",
    }
  }

  // Detect high / cao
  if (p.includes("lv2") || p.includes("high") || p.includes("cao")) {
    return {
      level: "high",
      label: "Cao",
      badgeVariant: "warning",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
      dotColor: "bg-amber-500",
    }
  }

  // Medium / trung bình (default)
  return {
    level: "medium",
    label: "Trung bình",
    badgeVariant: "info",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotColor: "bg-blue-500",
  }
}

/**
 * Maps UX stage name to designated color badge styles.
 */
export function getPhaseBadgeClass(phase?: string): { bg: string; text: string; border: string } {
  const p = (phase || "").toLowerCase()
  if (p.includes("define") || p.includes("discovery") || p.includes("phân loại")) {
    return { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" }
  }
  if (p.includes("wireframe") || p.includes("flow")) {
    return { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" }
  }
  if (p.includes("ui") || p.includes("design")) {
    return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" }
  }
  if (p.includes("prototype") || p.includes("testing")) {
    return { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" }
  }
  if (p.includes("ready") || p.includes("bàn giao") || p.includes("nghiệm thu")) {
    return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" }
  }
  return { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" }
}

/**
 * Robust heuristics matcher connecting UX requests with squads.
 */
export function matchesSquad(r: UXRequest, sq: Squad): boolean {
  if (!r || !sq) return false

  // 1. Direct ID match
  if (r.id && sq.squad_id && r.id === sq.squad_id) return true
  const rAny = r as any
  if (rAny.squad_id && rAny.squad_id === sq.squad_id) return true

  const sqName = (sq.squad_name || "").toLowerCase()
  const sqProd = (sq.product_name || sq.product_id || "").toLowerCase()
  const rSq = (r.squad_name || r.preferred_squad || r.squad || "").toLowerCase()
  const rProd = (r.product || "").toLowerCase()
  const rTitle = (r.title || "").toLowerCase()

  // 2. Exact or substring squad name match
  if (rSq && (rSq === sqName || sqName.includes(rSq) || rSq.includes(sqName))) {
    return true
  }

  // 3. Domain / Product keyword heuristics for MBBank UX Squads
  // Lending
  if (
    (sqName.includes("lending") || sqProd.includes("lending") || sq.squad_id.toLowerCase().includes("lending")) &&
    (rProd.includes("lending") || rSq.includes("lending") || rTitle.includes("vay") || rTitle.includes("thấu chi"))
  ) {
    return true
  }

  // Transfer / Chuyển tiền / Card
  if (
    (sqName.includes("transfer") || sqName.includes("chuyển tiền") || sqProd.includes("transfer") || sq.squad_id.toLowerCase().includes("transfer")) &&
    (rProd.includes("transfer") || rSq.includes("transfer") || rSq.includes("chuyển") || rTitle.includes("chuyển") || rTitle.includes("thanh toán"))
  ) {
    return true
  }

  // Digi Invest / Wealth / Saving / Đầu tư
  if (
    (sqName.includes("invest") || sqName.includes("wealth") || sqName.includes("đầu tư") || sqProd.includes("invest")) &&
    (rProd.includes("digi") || rProd.includes("invest") || rProd.includes("saving") || rSq.includes("invest") || rSq.includes("wealth") || rTitle.includes("đầu tư") || rTitle.includes("tiết kiệm"))
  ) {
    return true
  }

  // BaaS / Open API
  if (
    (sqName.includes("baas") || sqProd.includes("baas") || sq.squad_id.toLowerCase().includes("baas")) &&
    (rProd.includes("baas") || rSq.includes("baas") || rTitle.includes("baas") || rTitle.includes("open api") || rProd.includes("open api"))
  ) {
    return true
  }

  // Core / Khác
  if (
    (sqName.includes("core") || sqName.includes("khác")) &&
    (rSq.includes("core") || rProd.includes("core") || (!rProd.includes("lending") && !rProd.includes("transfer") && !rProd.includes("invest") && !rProd.includes("baas")))
  ) {
    return true
  }

  return false
}

/**
 * Checks whether a request is currently active (not finished / released).
 */
export function isTaskActive(req: UXRequest): boolean {
  if (!req) return false
  const s = (req.status || "").trim().toLowerCase()
  const isDone = s === "hoàn thành" || s === "hoành thành" || (typeof req.progress === "number" && req.progress >= 100)
  if (isDone) return false

  return (
    s === "đang thực hiện" ||
    s === "in progress" ||
    s === "active" ||
    s === "bị chặn" ||
    s === "chờ tiếp nhận" ||
    s === "đang phân loại" ||
    s === "po pending" ||
    s === "chờ phản hồi po" ||
    !isDone
  )
}

/**
 * Block 5 Component: "Trending Task & Hoạt động Squad" (Full Squad Activity & Trending Tasks)
 *
 * Implements ReUI AI-Ops Card 5 structure:
 * - Asymmetric 2-column wide layout (desktop lg:col-span-2)
 * - Squad capacity utilization meters: Sẵn sàng (<50%), Bình thường (50-79%), Đang bận (80-99%), Quá tải (>=100%)
 * - Active tasks count, designer assignments, and visual utilization progress bar
 * - Key priority trending tasks with task metadata (title, code, priority badge, designer with avatar, phase badge)
 * - Interactive drilldown: onSelectRequest(req) -> RequestDetail drawer; clicking squad filters trending tasks
 * - Safe zero-state and division by zero handling
 */
export function Block5SquadActivity({
  requests,
  squads = [],
  onSelectRequest,
  onSelectSquad,
  className,
  maxTrendingTasks = 4,
}: Block5SquadActivityProps) {
  // Local state for interactive filtering
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilterType>("ALL")

  // Safely guard inputs against null / undefined
  const safeRequests = useMemo(() => (Array.isArray(requests) ? requests : []), [requests])
  const safeSquads = useMemo(
    () => (Array.isArray(squads) && squads.length > 0 ? squads : STANDARD_MB_SQUADS),
    [squads]
  )

  // Derived squad workload and capacity metrics
  const { squadData, totalActiveTasks, activeSquadsCount, avgUtilization } = useMemo(() => {
    const activeReqs = safeRequests.filter(isTaskActive)

    const list: SquadWorkloadInfo[] = safeSquads.map((sq) => {
      const sqName = sq.squad_name || "Squad"
      const sqOwner = sq.ux_owner || "Designer"
      const cap = Math.max(1, sq.capacity_threshold || 6)

      // Find tasks matching this squad
      const matchedTasks = activeReqs.filter((r) => matchesSquad(r, sq))

      // Extract unique designers currently assigned to this squad's tasks
      const designerSet = new Set<string>()
      if (sqOwner && sqOwner.trim()) designerSet.add(sqOwner.trim())
      matchedTasks.forEach((t) => {
        if (t.assigned_designer && t.assigned_designer.trim()) {
          designerSet.add(t.assigned_designer.trim())
        }
      })
      const designers = Array.from(designerSet)

      const activeCount = matchedTasks.length > 0 ? matchedTasks.length : (sq.active_tasks || 0)
      const capMeta = deriveCapacityUtilization(activeCount, cap)

      // Clamped visual width between 0% and 100% (minimum 6% if activeCount > 0 for visibility)
      const visualBarPct = Math.min(100, Math.max(activeCount > 0 ? 6 : 0, capMeta.utilizationPct))

      return {
        id: sq.squad_id,
        squad: sq,
        name: sqName,
        product: sq.product_name || sq.product_id || sqName,
        uxOwner: sqOwner,
        designers,
        activeCount,
        capacity: cap,
        utilizationPct: capMeta.utilizationPct,
        statusLabel: capMeta.status,
        statusVariant: capMeta.statusVariant,
        statusBadgeClass: capMeta.statusBadgeClass,
        dotColor: capMeta.dotColor,
        barColor: capMeta.barColor,
        visualBarPct,
        matchedTasks,
      }
    })

    // Sort squads with active workload first
    list.sort((a, b) => b.activeCount - a.activeCount || b.utilizationPct - a.utilizationPct)

    const activeSquads = list.filter((s) => s.activeCount > 0)
    const avgUtil =
      list.length > 0
        ? Math.round(list.reduce((acc, s) => acc + s.utilizationPct, 0) / list.length)
        : 0

    return {
      squadData: list,
      totalActiveTasks: activeReqs.length,
      activeSquadsCount: activeSquads.length > 0 ? activeSquads.length : list.length,
      avgUtilization: avgUtil,
    }
  }, [safeRequests, safeSquads])

  // Selected squad object if any
  const currentSelectedSquad = useMemo(() => {
    if (!selectedSquadId) return null
    return squadData.find((s) => s.id === selectedSquadId) || null
  }, [selectedSquadId, squadData])

  // Derived and filtered trending tasks
  const filteredTrendingTasks = useMemo(() => {
    let sourceTasks: UXRequest[] = []

    if (currentSelectedSquad) {
      sourceTasks = currentSelectedSquad.matchedTasks
    } else {
      sourceTasks = safeRequests.filter(isTaskActive)
    }

    // Apply priority filter
    if (priorityFilter !== "ALL") {
      sourceTasks = sourceTasks.filter((t) => {
        const meta = getPriorityMeta(t.priority, t.status)
        if (priorityFilter === "URGENT") return meta.level === "urgent"
        if (priorityFilter === "HIGH") return meta.level === "high"
        if (priorityFilter === "MEDIUM") return meta.level === "medium"
        return true
      })
    }

    // Sort by priority urgency and progress
    const sorted = [...sourceTasks].sort((a, b) => {
      const pScore = (req: UXRequest) => {
        const m = getPriorityMeta(req.priority, req.status)
        if (m.level === "urgent") return 3
        if (m.level === "high") return 2
        return 1
      }
      const scoreDiff = pScore(b) - pScore(a)
      if (scoreDiff !== 0) return scoreDiff
      return (b.progress || 0) - (a.progress || 0)
    })

    return sorted.slice(0, maxTrendingTasks)
  }, [safeRequests, currentSelectedSquad, priorityFilter, maxTrendingTasks])

  // Handle squad click / toggle
  const handleSquadCardClick = (info: SquadWorkloadInfo) => {
    if (selectedSquadId === info.id) {
      // Toggle off
      setSelectedSquadId(null)
    } else {
      setSelectedSquadId(info.id)
    }
    onSelectSquad?.(info.squad)
  }

  return (
    <Frame
      variant="default"
      className={cn(
        "h-full flex flex-col justify-between hover:border-slate-300 transition-all duration-200",
        className
      )}
    >
      {/* =====================================================================
          FRAME HEADER
          ===================================================================== */}
      <FrameHeader className="pb-3 mb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div>
            <FrameTitle className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200/80 shadow-2xs">
                <Flame className="w-4 h-4 text-indigo-600" />
              </span>
              <span>Trending Task & Hoạt động Squad</span>
            </FrameTitle>
            <FrameDescription className="text-xs text-slate-500 font-normal mt-0.5">
              Tải trọng làm việc & tiến độ các squad theo sản phẩm
            </FrameDescription>
          </div>

          <FrameActions className="flex items-center gap-2 flex-wrap">
            {/* Active squad count badge */}
            <Badge
              variant="outline"
              size="sm"
              className="font-mono text-[11px] bg-indigo-50 text-indigo-700 border-indigo-200/80 font-medium px-2.5 py-0.5"
            >
              <Users className="w-3.5 h-3.5 mr-1 text-indigo-600 inline" />
              <span className="font-bold">{activeSquadsCount}</span> Squads hoạt động
            </Badge>

            {/* Priority Filter Segmented Buttons */}
            <div
              role="group"
              aria-label="Lọc theo mức độ ưu tiên"
              className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/70 text-[11px]"
            >
              <button
                type="button"
                onClick={() => setPriorityFilter("ALL")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all cursor-pointer select-none",
                  priorityFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900 font-medium"
                )}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter("URGENT")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 select-none",
                  priorityFilter === "URGENT"
                    ? "bg-white text-rose-700 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900 font-medium"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Khẩn
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter("HIGH")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 select-none",
                  priorityFilter === "HIGH"
                    ? "bg-white text-amber-700 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900 font-medium"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Cao
              </button>
            </div>
          </FrameActions>
        </div>
      </FrameHeader>

      {/* =====================================================================
          FRAME BODY: 2-COLUMN ASYMMETRIC GRID
          Left: Squad Workload & Capacity Meters
          Right: Trending & Priority Tasks List
          ===================================================================== */}
      <FrameBody className="space-y-4 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {/* ─────────────────────────────────────────────────────────────────
              LEFT COLUMN: SQUAD WORKLOAD & CAPACITY METERS
              ───────────────────────────────────────────────────────────────── */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Công suất Squad ({squadData.length})
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Tải / Định mức</span>
            </div>

            {squadData.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
                Chưa có thông tin squad
              </div>
            ) : (
              <div className="space-y-2">
                {squadData.slice(0, 5).map((sq) => {
                  const isSelected = selectedSquadId === sq.id

                  return (
                    <div
                      key={sq.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Chọn squad ${sq.name} để lọc task`}
                      onClick={() => handleSquadCardClick(sq)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          handleSquadCardClick(sq)
                        }
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all cursor-pointer space-y-2 select-none group outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                        isSelected
                          ? "border-indigo-400 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-300"
                          : "border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-2xs"
                      )}
                    >
                      {/* Top row: Squad Name, Lead Owner, Active Count & Status Pill */}
                      <div className="flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn("w-2 h-2 rounded-full shrink-0", sq.dotColor)} />
                          <span
                            className={cn(
                              "font-semibold text-slate-800 truncate transition-colors",
                              isSelected
                                ? "text-indigo-700"
                                : "group-hover:text-indigo-600"
                            )}
                          >
                            {sq.name}
                          </span>
                          <span className="text-[10px] text-slate-400 hidden sm:inline truncate">
                            ({sq.uxOwner})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {sq.activeCount}/{sq.capacity}
                          </span>
                          <span
                            className={cn(
                              "px-1.5 py-0.2 rounded-md text-[10px] font-semibold border",
                              sq.statusBadgeClass
                            )}
                          >
                            {sq.statusLabel}
                          </span>
                        </div>
                      </div>

                      {/* Workload Progress Bar (clamped 0-100%) */}
                      <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-300", sq.barColor)}
                          style={{ width: `${sq.visualBarPct}%` }}
                        />
                      </div>

                      {/* Bottom row: Designer assignments & Utilization percentage */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-slate-400 shrink-0">Phụ trách:</span>
                          <div className="flex items-center -space-x-1.5 overflow-hidden">
                            {sq.designers.slice(0, 3).map((designer, dIdx) => (
                              <UserAvatar
                                key={dIdx}
                                name={designer}
                                size="xs"
                                className="ring-1 ring-white"
                              />
                            ))}
                          </div>
                          <span className="text-slate-600 truncate max-w-[100px] sm:max-w-[140px] ml-1">
                            {sq.designers.slice(0, 2).join(", ")}
                            {sq.designers.length > 2 ? ` +${sq.designers.length - 2}` : ""}
                          </span>
                        </div>

                        <span className="font-mono text-slate-500 shrink-0">
                          {sq.utilizationPct}% công suất
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────────
              RIGHT COLUMN: TRENDING & PRIORITY TASKS
              ───────────────────────────────────────────────────────────────── */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  {currentSelectedSquad
                    ? `Task: ${currentSelectedSquad.name}`
                    : "Bài toán trọng điểm"}
                </span>
                {priorityFilter !== "ALL" && (
                  <span className="font-normal lowercase text-[10px] text-slate-400">
                    ({priorityFilter === "URGENT" ? "khẩn" : "cao"})
                  </span>
                )}
              </span>

              {selectedSquadId ? (
                <button
                  type="button"
                  onClick={() => setSelectedSquadId(null)}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 cursor-pointer font-normal"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Xem tất cả
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 font-normal">Click xem chi tiết</span>
              )}
            </div>

            {filteredTrendingTasks.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50/80 border border-slate-100 text-center flex flex-col items-center justify-center my-auto">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  Không có bài toán đang chạy phù hợp
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed font-normal">
                  {selectedSquadId
                    ? "Squad này hiện không có bài toán đang chạy theo mức ưu tiên đã chọn."
                    : "Tất cả bài toán trong bộ lọc đã hoàn thành hoặc chưa khởi tạo."}
                </p>
                {(priorityFilter !== "ALL" || selectedSquadId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPriorityFilter("ALL")
                      setSelectedSquadId(null)
                    }}
                    className="mt-3 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg shadow-2xs hover:bg-indigo-50/50 cursor-pointer transition-colors"
                  >
                    Đặt lại bộ lọc
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTrendingTasks.map((task) => {
                  const priorityMeta = getPriorityMeta(task.priority, task.status)
                  const phase = task.current_phase || "UI Design"
                  const phaseStyle = getPhaseBadgeClass(phase)
                  const designerName = task.assigned_designer || task.ux_owner || "UX Designer"

                  return (
                    <div
                      key={task.request_id || task.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Mở chi tiết bài toán ${task.title}`}
                      onClick={() => onSelectRequest?.(task)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onSelectRequest?.(task)
                        }
                      }}
                      className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-300 hover:shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-3 group select-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      {/* Left: Designer Avatar & Task Metadata */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar name={designerName} size="xs" />

                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                            {task.title || "Bài toán chưa có tiêu đề"}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <span className="font-mono font-medium text-slate-600">
                              {task.request_id}
                            </span>
                            <span>•</span>
                            <span className="truncate">{task.product || "App MBBank"}</span>
                            <span>•</span>
                            <span className="truncate text-slate-500">{designerName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Phase, Priority & Navigation Chevron */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Current UX Phase */}
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded-md text-[10px] font-medium border",
                            phaseStyle.bg,
                            phaseStyle.text,
                            phaseStyle.border
                          )}
                        >
                          {phase}
                        </span>

                        {/* Priority Badge */}
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1",
                            priorityMeta.badgeClass
                          )}
                        >
                          <span className={cn("w-1 h-1 rounded-full", priorityMeta.dotColor)} />
                          {priorityMeta.label}
                        </span>

                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </FrameBody>

      {/* =====================================================================
          FRAME FOOTER
          ===================================================================== */}
      <FrameFooter className="pt-3 border-t border-slate-100 mt-auto flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2 text-indigo-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span>Theo dõi nhịp độ & phân bổ công suất {squadData.length} Squads</span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-slate-400">Tải trung bình:</span>
          <span className="font-mono font-bold text-slate-900">{avgUtilization}%</span>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
              avgUtilization < 50
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : avgUtilization < 80
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : avgUtilization < 100
                ? "bg-amber-50 text-amber-800 border-amber-300"
                : "bg-rose-50 text-rose-700 border-rose-200"
            )}
          >
            {avgUtilization < 50
              ? "Công suất tối ưu"
              : avgUtilization < 80
              ? "Vận hành ổn định"
              : avgUtilization < 100
              ? "Tải cao"
              : "Cần bổ sung nhân sự"}
          </span>
        </div>
      </FrameFooter>
    </Frame>
  )
}

export default Block5SquadActivity
