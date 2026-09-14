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
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { UserAvatar } from "@/components/common/UserAvatar"
import type { UXRequest } from "@/data/mockData"
import {
  getRequestPendingClassification,
  type RequestPendingClassification,
} from "@/config/statusConfig"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  UserX,
} from "lucide-react"

/**
 * Subtype of pending task for Block 1 categorization.
 */
export type PendingSubtype =
  | "blocked"
  | "po_overdue"
  | "unassigned"
  | "designer_pending"

/**
 * Enriched pending task structure for sorting, categorization, and presentation.
 */
export interface ClassifiedPendingTask {
  request: UXRequest
  subtype: PendingSubtype
  urgencyScore: number
  badgeLabel: string
  badgeVariant: BadgeProps["variant"]
  badgeDotColor: string
  detailText: string
  elapsedHours: number
}

/**
 * Props for Block1PendingOverview component.
 */
export interface Block1PendingOverviewProps {
  /**
   * Filtered list of UX requests for currently selected product or all.
   */
  requests: UXRequest[]
  /**
   * Callback fired when clicking any urgent task, opening RequestDetail drawer.
   */
  onSelectRequest?: (req: UXRequest) => void
  /**
   * Maximum number of items in the compact urgent task list (default: 4).
   */
  maxItems?: number
  /**
   * Optional custom className override for the Frame container.
   */
  className?: string
}

/**
 * Safely parses any date string (DD/MM/YYYY HH:mm:ss, DD/MM/YYYY, or ISO) to milliseconds.
 * Returns 0 if invalid, missing, or future date.
 */
export function parseTimeMs(dateStr?: string | null): number {
  if (!dateStr || typeof dateStr !== "string") return 0
  const trimmed = dateStr.trim()
  if (!trimmed) return 0

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

  const parsed = new Date(trimmed).getTime()
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Formats relative elapsed time string (e.g. "Vừa xong", "Hôm qua", "2 ngày trước", "36h trước").
 */
export function formatRelativeTime(dateStr?: string | null): string {
  const ms = parseTimeMs(dateStr)
  if (!ms) return "Vừa xong"
  const diffMs = Date.now() - ms
  if (diffMs < 0) return "Vừa xong"
  const hours = diffMs / 3600000
  if (hours < 1) return "Vừa xong"
  if (hours < 24) return `${Math.floor(hours)}h trước`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Hôm qua"
  if (days < 30) return `${days} ngày trước`
  return `${Math.floor(days / 30)} tháng trước`
}

/**
 * Classifies a UXRequest into Block 1 Pending/Blocker structure.
 * Returns null if the request is completed, delivered, or not pending.
 */
export function classifyPendingTask(
  req: UXRequest,
  nowMs: number = Date.now()
): ClassifiedPendingTask | null {
  if (!req) return null

  const rawStatus = (req.status || "").toLowerCase().trim()
  const rawPhase = (req.current_phase || "").toLowerCase().trim()

  // Edge Case E4: Completed or delivered tasks must NEVER be classified as pending or blocked
  const isDone =
    rawStatus === "hoàn thành" ||
    rawStatus === "hoành thành" ||
    rawStatus === "done" ||
    rawStatus === "bàn giao" ||
    rawPhase === "bàn giao" ||
    (typeof req.progress === "number" && req.progress >= 100)
  if (isDone) return null

  // Evaluate statusConfig pending classification
  const pClassification: RequestPendingClassification =
    getRequestPendingClassification(req)

  const isBlocked = rawStatus === "bị chặn" || rawPhase === "bị chặn"

  // Check PO pending overdue (> 24h since sent_to_po_at)
  const hasSentToPo = Boolean(
    req.sent_to_po_at && String(req.sent_to_po_at).trim() !== ""
  )
  let elapsedPoHours = 0
  if (hasSentToPo || rawStatus === "đã gửi po") {
    const sentMs = parseTimeMs(req.sent_to_po_at)
    if (sentMs > 0) {
      elapsedPoHours = Math.max(0, (nowMs - sentMs) / 3600000)
    } else if (pClassification.elapsedHours > 0) {
      elapsedPoHours = pClassification.elapsedHours
    }
  }

  const isPoOverdue =
    (pClassification.isPending && pClassification.type === "po_pending") ||
    ((rawStatus === "đã gửi po" || hasSentToPo) &&
      elapsedPoHours >= 24 &&
      rawStatus !== "đang thực hiện")

  // Check unassigned
  const isUnassigned =
    !req.assigned_designer ||
    !req.assigned_designer.trim() ||
    req.assigned_designer.toLowerCase() === "chưa gán" ||
    rawStatus === "chờ tiếp nhận" ||
    rawStatus === "đang phân loại" ||
    rawStatus === "chờ phân bổ" ||
    rawStatus === "đã gửi" ||
    rawStatus === "đã gửi yêu cầu"

  // Check designer pending
  const isDesignerPending =
    (pClassification.isPending &&
      pClassification.type === "designer_pending") ||
    rawStatus === "pending" ||
    rawStatus === "tạm dừng" ||
    rawStatus === "chờ phản hồi"

  // Urgency multiplier for Priority Lv1 / Urgent
  const pStr = (req.priority || "").toLowerCase()
  const isPriorityUrgent =
    pStr.includes("lv1") ||
    pStr.includes("urgent") ||
    pStr.includes("khẩn cấp") ||
    pStr.includes("cao")
  const priorityBoost = isPriorityUrgent ? 300 : 0

  // 1. Blocked has highest severity (Base: 1000)
  if (isBlocked) {
    return {
      request: req,
      subtype: "blocked",
      urgencyScore: 1000 + priorityBoost,
      badgeLabel: "Bị chặn",
      badgeVariant: "destructive",
      badgeDotColor: "bg-rose-500",
      detailText: req.pending_reason || "Cần tháo gỡ trở ngại",
      elapsedHours: 0,
    }
  }

  // 2. PO Pending overdue has high severity (Base: 500 + elapsedPoHours * 5)
  if (isPoOverdue) {
    const displayHours = Math.round(elapsedPoHours)
    return {
      request: req,
      subtype: "po_overdue",
      urgencyScore: 500 + Math.min(300, elapsedPoHours * 5) + priorityBoost,
      badgeLabel: displayHours > 0 ? `${displayHours}h trễ` : "Chờ PO",
      badgeVariant: "warning",
      badgeDotColor: "bg-amber-500",
      detailText: `Chờ PO duyệt ${displayHours > 0 ? `(${displayHours}h)` : "> 24h"}`,
      elapsedHours: elapsedPoHours,
    }
  }

  // 3. Unassigned needs resource allocation (Base: 200)
  if (isUnassigned) {
    const submittedAgo = formatRelativeTime(req.submitted_at)
    return {
      request: req,
      subtype: "unassigned",
      urgencyScore: 200 + priorityBoost,
      badgeLabel: "Chờ gán",
      badgeVariant: "purple",
      badgeDotColor: "bg-purple-500",
      detailText: `Gửi ${submittedAgo} • Chưa gán`,
      elapsedHours: 0,
    }
  }

  // 4. Designer pending (Base: 100)
  if (isDesignerPending) {
    return {
      request: req,
      subtype: "designer_pending",
      urgencyScore: 100 + priorityBoost,
      badgeLabel: "Tạm dừng",
      badgeVariant: "secondary",
      badgeDotColor: "bg-slate-400",
      detailText:
        pClassification.reason ||
        req.pending_reason ||
        "Tạm dừng theo yêu cầu",
      elapsedHours: 0,
    }
  }

  return null
}

/**
 * Derives the Health Badge representation based on total pending tasks.
 * Formula:
 * - 0-2: "Ổn định" (emerald)
 * - 3-5: "Cảnh báo" (amber)
 * - >5: "Quá tải" (rose)
 */
export function deriveHealthStatus(totalCount: number): {
  label: "Ổn định" | "Cảnh báo" | "Quá tải"
  variant: BadgeProps["variant"]
  dotColor: string
  dotPulse: boolean
  badgeClass: string
} {
  if (totalCount <= 2) {
    return {
      label: "Ổn định",
      variant: "success",
      dotColor: "bg-emerald-500",
      dotPulse: false,
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    }
  }
  if (totalCount <= 5) {
    return {
      label: "Cảnh báo",
      variant: "warning",
      dotColor: "bg-amber-500",
      dotPulse: true,
      badgeClass: "bg-amber-50 text-amber-800 border-amber-300/80",
    }
  }
  return {
    label: "Quá tải",
    variant: "destructive",
    dotColor: "bg-rose-500",
    dotPulse: true,
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200/80",
  }
}

/**
 * Block1PendingOverview — ReUI AI-Ops Report Block 1: "Đang chờ & Điểm nghẽn"
 *
 * Replaces legacy Provider Health card.
 * Displays total count of pending, blocked, and unassigned requests, team health status,
 * PO pending > 24h overdue detection, and a compact interactive list linking to RequestDetail drawer.
 */
export function Block1PendingOverview({
  requests = [],
  onSelectRequest,
  maxItems = 4,
  className,
}: Block1PendingOverviewProps) {
  // Compute pending metrics and sorted urgent tasks
  const {
    totalPending,
    blockedCount,
    poOverdueCount,
    unassignedCount,
    displayedTasks,
  } = useMemo(() => {
    const classified: ClassifiedPendingTask[] = []
    let blocked = 0
    let poOverdue = 0
    let unassigned = 0

    const now = Date.now()

    for (const req of requests) {
      const item = classifyPendingTask(req, now)
      if (item) {
        classified.push(item)
        if (item.subtype === "blocked") blocked++
        else if (item.subtype === "po_overdue") poOverdue++
        else if (item.subtype === "unassigned") unassigned++
      }
    }

    // Sort by urgencyScore descending (blocked first, then overdue PO, then urgent priority, then unassigned)
    classified.sort((a, b) => b.urgencyScore - a.urgencyScore)

    return {
      totalPending: classified.length,
      blockedCount: blocked,
      poOverdueCount: poOverdue,
      unassignedCount: unassigned,
      displayedTasks: classified.slice(0, maxItems),
    }
  }, [requests, maxItems])

  const health = deriveHealthStatus(totalPending)

  return (
    <Frame
      variant="default"
      className={cn(
        "flex flex-col h-full justify-between bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:border-slate-300/80 transition-all duration-200",
        className
      )}
    >
      <div>
        {/* FrameHeader: Title + Health Badge */}
        <FrameHeader className="pb-3 mb-3 border-b border-slate-100">
          <div>
            <FrameTitle className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Đang chờ & Điểm nghẽn</span>
            </FrameTitle>
            <FrameDescription className="text-xs text-slate-500 font-normal mt-0.5">
              Tổng quan các yêu cầu chờ PO, bị chặn hoặc chờ phân bổ
            </FrameDescription>
          </div>
          <FrameActions>
            <Badge
              variant={health.variant}
              size="sm"
              dot
              dotColor={health.dotColor}
              dotPulse={health.dotPulse}
              className={cn("font-medium", health.badgeClass)}
            >
              {health.label}
            </Badge>
          </FrameActions>
        </FrameHeader>

        {/* FrameBody: Headline Metric + List or Clean Empty State */}
        <FrameBody className="space-y-4">
          {/* Headline Metric + breakdown tags */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono tracking-tight text-slate-900">
                  {totalPending}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  bài toán cần can thiệp
                </span>
              </div>

              {/* Sub-breakdown badges */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {blockedCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/60 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    {blockedCount} bị chặn
                  </span>
                )}
                {poOverdueCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300/60 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    {poOverdueCount} chờ PO
                  </span>
                )}
                {unassignedCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                    {unassignedCount} chờ gán
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content: Compact Task List or Clean Zero State */}
          {totalPending === 0 ? (
            <div className="py-6 px-4 text-center my-auto flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 mb-2 shadow-2xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                Không có bài toán bị nghẽn
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed font-normal">
                Tất cả yêu cầu đang được triển khai đúng tiến độ hoặc đã hoàn thành nghiệm thu.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedTasks.map((item, index) => {
                const req = item.request
                const pStr = (req.priority || "").toLowerCase()
                const isPriorityUrgent =
                  pStr.includes("lv1") ||
                  pStr.includes("urgent") ||
                  pStr.includes("khẩn cấp")

                return (
                  <div
                    key={req.request_id || req.id || `pending-task-${index}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectRequest?.(req)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onSelectRequest?.(req)
                      }
                    }}
                    className={cn(
                      "group flex items-center justify-between gap-2.5 p-2.5 rounded-xl border border-slate-100 bg-slate-50/60",
                      "hover:bg-white hover:border-slate-300/80 hover:shadow-xs transition-all duration-150 cursor-pointer",
                      "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1057FB]"
                    )}
                    aria-label={`Chi tiết bài toán: ${req.title}`}
                  >
                    {/* Avatar / Designer fallback */}
                    <div className="shrink-0">
                      {item.subtype === "unassigned" ? (
                        <div
                          className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200/80 shadow-2xs"
                          title="Chưa phân bổ Designer"
                        >
                          <UserX className="w-3.5 h-3.5 text-purple-600" />
                        </div>
                      ) : (
                        <UserAvatar
                          name={req.assigned_designer || "Designer"}
                          size="sm"
                          className="w-7 h-7"
                        />
                      )}
                    </div>

                    {/* Title & Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-xs font-semibold text-slate-900 truncate group-hover:text-[#1057FB] transition-colors"
                          title={req.title}
                        >
                          {req.title}
                        </span>
                        {isPriorityUrgent && (
                          <span className="shrink-0 px-1 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            Gấp
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-600 truncate max-w-[100px]">
                          {req.product || req.squad_name || "UXMB"}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-400 truncate">
                          {item.detailText}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge & Arrow */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge
                        variant={item.badgeVariant}
                        size="xs"
                        dot
                        dotColor={item.badgeDotColor}
                        className="font-medium text-[10.5px]"
                      >
                        {item.badgeLabel}
                      </Badge>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </FrameBody>
      </div>

      {/* FrameFooter: SLA guarantee or summary note */}
      <FrameFooter className="pt-3 mt-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100">
        {totalPending > 0 ? (
          <>
            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>SLA phản hồi cam kết ≤ 24h</span>
            </span>
            {totalPending > maxItems ? (
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
                +{totalPending - maxItems} bài toán khác
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">
                Hiển thị toàn bộ điểm nghẽn
              </span>
            )}
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hệ thống vận hành thông suốt</span>
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              100% On-track
            </span>
          </>
        )}
      </FrameFooter>
    </Frame>
  )
}

export default Block1PendingOverview
