import * as React from "react"
import { useMemo } from "react"
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
import type { UXRequest } from "@/data/mockData"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  FileCheck,
  Calendar,
  Sparkles,
} from "lucide-react"

export interface Block3CompletedSLAProps {
  /**
   * Filtered list of UX requests for currently selected product or all.
   * Pure synchronous prop derived from useMemo in parent TongQuanPage.
   */
  requests: UXRequest[]
  /**
   * Callback fired when clicking any completed task, opening RequestDetail drawer.
   * Conforms to PROJECT.md interface contract: (req: UXRequest) => void.
   */
  onSelectRequest?: (req: UXRequest) => void
  /**
   * Maximum number of items in the compact delivered task list (default: 3).
   */
  maxItems?: number
  /**
   * Optional custom className override for the Frame container.
   */
  className?: string
}

/**
 * Standard benchmark values per ReUI AI-Ops & UXMB operational guidelines.
 */
export const SLA_BENCHMARK_RATE = 96.4
export const TEST_ACCEPTANCE_BENCHMARK = 94.2
export const SLA_TARGET_RATE = 95.0

/**
 * Formats any date string into Vietnamese standard DD/MM/YYYY.
 */
export function formatDateDMY(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== "string") return ""
  const trimmed = dateStr.trim()
  if (!trimmed) return ""

  // DD/MM/YYYY match
  const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dmy) {
    const d = dmy[1].padStart(2, "0")
    const m = dmy[2].padStart(2, "0")
    const y = dmy[3]
    return `${d}/${m}/${y}`
  }

  // YYYY-MM-DD match
  const ymd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (ymd) {
    const y = ymd[1]
    const m = ymd[2].padStart(2, "0")
    const d = ymd[3].padStart(2, "0")
    return `${d}/${m}/${y}`
  }

  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, "0")
    const m = String(parsed.getMonth() + 1).padStart(2, "0")
    const y = parsed.getFullYear()
    return `${d}/${m}/${y}`
  }

  return trimmed
}

/**
 * Safely parses any date string (DD/MM/YYYY, YYYY-MM-DD, ISO) to milliseconds.
 * Returns 0 if invalid or missing.
 */
export function parseDateMs(dateStr?: string | null): number {
  if (!dateStr || typeof dateStr !== "string") return 0
  const trimmed = dateStr.trim()
  if (!trimmed) return 0

  // DD/MM/YYYY or DD/MM/YYYY HH:mm:ss
  const dmyMatch = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/
  )
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10)
    const month = parseInt(dmyMatch[2], 10) - 1
    const year = parseInt(dmyMatch[3], 10)
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0
    const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0
    return new Date(year, month, day, hour, minute, second).getTime()
  }

  // YYYY-MM-DD or ISO
  const ymdMatch = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/
  )
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10)
    const month = parseInt(ymdMatch[2], 10) - 1
    const day = parseInt(ymdMatch[3], 10)
    const hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0
    const minute = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0
    const second = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0
    return new Date(year, month, day, hour, minute, second).getTime()
  }

  const parsed = new Date(trimmed).getTime()
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Resolves the official completion / delivery date string for a task.
 * Priority hierarchy: release_date -> phases completionDate -> latest_update date -> last_updated.
 */
export function getTaskCompletionDate(req: UXRequest): string {
  if (req.release_date && req.release_date.trim()) {
    return req.release_date.trim()
  }
  const completedPhase = req.phases?.find(
    (p) => (p.name === "Bàn giao" || p.status === "completed") && p.completionDate
  )
  if (completedPhase?.completionDate) {
    return completedPhase.completionDate.trim()
  }
  if (req.latest_update?.date && req.latest_update.date.trim()) {
    return req.latest_update.date.trim()
  }
  if (req.last_updated && req.last_updated.trim()) {
    return req.last_updated.trim()
  }
  return req.expected_deadline || ""
}

/**
 * Evaluates whether a completed task was delivered on or before its committed expected deadline.
 */
export function isDeliveredOnTime(req: UXRequest): boolean {
  if (!req.expected_deadline) return true
  const deadlineMs = parseDateMs(req.expected_deadline)
  if (!deadlineMs) return true

  const completionDateStr = getTaskCompletionDate(req)
  if (!completionDateStr) return true
  const completionMs = parseDateMs(completionDateStr)
  if (!completionMs) return true

  // End of deadline day tolerance (23:59:59.999)
  const deadlineDate = new Date(deadlineMs)
  deadlineDate.setHours(23, 59, 59, 999)

  return completionMs <= deadlineDate.getTime()
}

/**
 * Identifies completed tasks matching status "Hoàn thành" / "Hoành thành" / "done" or 100% progress.
 */
export function isCompletedTask(req?: UXRequest | null): boolean {
  if (!req) return false
  const s = (req.status || "").trim().toLowerCase()
  const p =
    typeof req.progress === "number"
      ? req.progress
      : parseInt(String(req.progress || 0), 10) || 0
  return s === "hoàn thành" || s === "hoành thành" || s === "done" || p >= 100
}

/**
 * Dynamically calculates SLA On-time Delivery Rate % with benchmark fallback.
 * Zero-safe: Returns benchmark 96.4% when completedTasks is empty.
 */
export function calculateSLARate(completedTasks: UXRequest[]): number {
  if (!completedTasks || completedTasks.length === 0) {
    return SLA_BENCHMARK_RATE
  }
  const onTimeCount = completedTasks.filter(isDeliveredOnTime).length
  const rate = (onTimeCount / completedTasks.length) * 100
  return Number(rate.toFixed(1))
}

/**
 * Block 3: "Hoàn thành & Tuân thủ SLA" (Completed & SLA Compliance)
 *
 * Implements ReUI AI-Ops Card 3 structure:
 * - ReUI Frame with Frame, FrameHeader, FrameTitle, FrameDescription, FrameActions, FrameBody, FrameFooter
 * - Total completed count (status === "Hoàn thành" | "Hoành thành")
 * - SLA on-time delivery rate % (benchmark 96.4%, dynamic calculation: completed on-time / total completed)
 * - First-Time Right test acceptance rate % (94.2%)
 * - Visual SLA progress bar showing on-time performance against benchmark
 * - Delivered tasks compact list with designer avatar/name, completion date, and onSelectRequest drilldown
 * - Zero state: clean display when 0 completed tasks without division-by-zero or NaN
 */
export function Block3CompletedSLA({
  requests,
  onSelectRequest,
  maxItems = 3,
  className,
}: Block3CompletedSLAProps) {
  // 1. Filter completed tasks
  const completedTasks = useMemo(() => {
    return (requests || []).filter(isCompletedTask)
  }, [requests])

  const completedCount = completedTasks.length

  // 2. Dynamic SLA on-time rate calculation
  const slaOnTimeRate = useMemo(() => {
    return calculateSLARate(completedTasks)
  }, [completedTasks])

  // 3. First-Time Right acceptance rate (Benchmark 94.2%)
  const testAcceptanceRate = TEST_ACCEPTANCE_BENCHMARK

  // 4. Determine progress bar color based on performance
  const slaProgressColor = useMemo(() => {
    if (slaOnTimeRate >= SLA_TARGET_RATE) return "bg-emerald-500"
    if (slaOnTimeRate >= 90) return "bg-amber-500"
    return "bg-rose-500"
  }, [slaOnTimeRate])

  const isAboveBenchmark = slaOnTimeRate >= SLA_BENCHMARK_RATE

  return (
    <Frame
      className={cn(
        "h-full flex flex-col justify-between hover:border-slate-300 transition-all duration-200",
        className
      )}
    >
      {/* =====================================================================
          FRAME HEADER
          ===================================================================== */}
      <FrameHeader className="pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center justify-between w-full">
          <div>
            <FrameTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <span>Hoàn thành & Tuân thủ SLA</span>
            </FrameTitle>
            <FrameDescription className="text-xs text-slate-500">
              Chỉ số bàn giao nghiệm thu & cam kết thời gian
            </FrameDescription>
          </div>

          <FrameActions>
            <Badge
              variant="outline"
              className={cn(
                "font-medium text-[11px] px-2 py-0.5 shrink-0 transition-colors",
                completedCount > 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full mr-1.5 inline-block",
                  completedCount > 0
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-slate-400"
                )}
              />
              {completedCount > 0 ? `${completedCount} hoàn thành` : "Đạt chuẩn SLA"}
            </Badge>
          </FrameActions>
        </div>
      </FrameHeader>

      {/* =====================================================================
          FRAME BODY
          ===================================================================== */}
      <FrameBody className="space-y-4 flex-1">
        {/* Metric Headline Row */}
        <div className="flex items-baseline justify-between pt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
              {completedCount}
            </span>
            <span className="text-xs font-medium text-slate-500">bài toán đã duyệt</span>
          </div>

          <div className="flex items-center gap-3 text-right">
            <div>
              <div className="text-xs font-bold font-mono text-emerald-600 flex items-center justify-end gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                {slaOnTimeRate}%
              </div>
              <div className="text-[10px] text-slate-400">Đúng hạn SLA</div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <div className="text-xs font-bold font-mono text-indigo-600 flex items-center justify-end gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                {testAcceptanceRate}%
              </div>
              <div className="text-[10px] text-slate-400">First-Time Right</div>
            </div>
          </div>
        </div>

        {/* SLA Progress Bar against Benchmark */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Tỷ lệ bàn giao đúng hạn cam kết
            </span>
            <div className="flex items-center gap-1 font-mono">
              <span className="font-bold text-emerald-700">{slaOnTimeRate}%</span>
              <span className="text-[10px] text-slate-400 font-normal">
                (Chuẩn: {SLA_BENCHMARK_RATE}%)
              </span>
            </div>
          </div>

          {/* Visual Progress Bar with Benchmark Marker */}
          <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            {/* Benchmark tick indicator at 96.4% */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-slate-400/80 z-10"
              style={{ left: `${SLA_BENCHMARK_RATE}%` }}
              title={`Benchmark SLA: ${SLA_BENCHMARK_RATE}%`}
            />
            {/* Active progress fill */}
            <div
              className={cn("h-full rounded-full transition-all duration-500", slaProgressColor)}
              style={{ width: `${Math.min(100, slaOnTimeRate)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
            <span>Mục tiêu SLA ≥ {SLA_TARGET_RATE}%</span>
            <span className={cn(isAboveBenchmark ? "text-emerald-600 font-medium" : "text-slate-500")}>
              {isAboveBenchmark ? "✓ Vượt benchmark chuẩn" : "Theo chuẩn vận hành"}
            </span>
          </div>
        </div>

        {/* Compact Delivered Tasks List */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>
              Bàn giao gần nhất ({Math.min(maxItems, completedTasks.length)}/{completedCount})
            </span>
            {completedCount > maxItems && (
              <span className="text-[10px] text-slate-400 lowercase font-normal">
                +{completedCount - maxItems} bài toán khác
              </span>
            )}
          </div>

          {completedCount === 0 ? (
            /* Clean Zero State */
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 text-center space-y-1.5">
              <div className="flex justify-center text-slate-400">
                <FileCheck className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-xs font-medium text-slate-600">
                Chưa có bài toán hoàn thành trong kỳ lọc
              </p>
              <p className="text-[11px] text-slate-400">
                Các bài toán đang trong các khâu Wireframe, UI Design và Prototype.
              </p>
            </div>
          ) : (
            /* Compact Task List */
            <div className="space-y-1.5">
              {completedTasks.slice(0, maxItems).map((task) => {
                const completionDate = formatDateDMY(getTaskCompletionDate(task))
                const onTime = isDeliveredOnTime(task)
                const designerName = task.assigned_designer || task.ux_owner || "UX Designer"

                return (
                  <div
                    key={task.request_id}
                    onClick={() => onSelectRequest?.(task)}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-emerald-200/80 hover:shadow-2xs transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <UserAvatar name={designerName} size="xs" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate">
                          <span>{task.product || "App MBBank"}</span>
                          <span>•</span>
                          <span>{designerName}</span>
                          {completionDate && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 font-mono text-slate-500">
                                <Calendar className="w-2.5 h-2.5 inline" />
                                {completionDate}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] shrink-0 font-normal transition-colors",
                          onTime
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-100/70"
                            : "bg-amber-50 text-amber-700 border-amber-200 group-hover:bg-amber-100/70"
                        )}
                      >
                        {onTime ? "Đúng hạn" : "Trễ hạn"}
                      </Badge>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </FrameBody>

      {/* =====================================================================
          FRAME FOOTER
          ===================================================================== */}
      <FrameFooter className="pt-3 border-t border-slate-100 mt-auto flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1 text-emerald-600 font-medium">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-mono">+3.8%</span> so với tháng trước
        </span>
        <span className="font-mono text-slate-400">Target ≥ {SLA_TARGET_RATE}%</span>
      </FrameFooter>
    </Frame>
  )
}

export default Block3CompletedSLA
