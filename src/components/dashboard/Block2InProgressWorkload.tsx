import * as React from "react"
import { useMemo } from "react"
import {
  Frame,
  FrameHeader,
  FrameTitle,
  FrameDescription,
  FrameBody,
  FrameFooter,
  FrameActions,
} from "@/components/reui/frame"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/common/UserAvatar"
import { cn } from "@/lib/utils"
import type { UXRequest } from "@/data/mockData"
import { Zap, Clock } from "lucide-react"

/**
 * 5 Standard UX Stages for MBBank UX Workload Distribution.
 */
export type UXStageKey = "define" | "wireframe" | "ui" | "prototype" | "ready_to_dev"

export interface UXStageDefinition {
  key: UXStageKey
  name: string
  shortLabel: string
  color: string // Tailwind bg class for bar
  dotColor: string // Tailwind dot class
  bgLight: string // Tailwind light bg for chips
  textColor: string // Tailwind text color
  borderColor: string // Tailwind border color
}

export const UX_STAGES: UXStageDefinition[] = [
  {
    key: "define",
    name: "Define đầu bài",
    shortLabel: "Define",
    color: "bg-purple-500",
    dotColor: "bg-purple-500",
    bgLight: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-200",
  },
  {
    key: "wireframe",
    name: "Wireframe",
    shortLabel: "Wireframe",
    color: "bg-indigo-500",
    dotColor: "bg-indigo-500",
    bgLight: "bg-indigo-50",
    textColor: "text-indigo-700",
    borderColor: "border-indigo-200",
  },
  {
    key: "ui",
    name: "UI Design",
    shortLabel: "UI Design",
    color: "bg-blue-500",
    dotColor: "bg-blue-500",
    bgLight: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
  },
  {
    key: "prototype",
    name: "Prototype",
    shortLabel: "Prototype",
    color: "bg-amber-500",
    dotColor: "bg-amber-500",
    bgLight: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
  },
  {
    key: "ready_to_dev",
    name: "Ready to Dev",
    shortLabel: "Ready to Dev",
    color: "bg-emerald-500",
    dotColor: "bg-emerald-500",
    bgLight: "bg-emerald-50",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
  },
]

/**
 * Normalizes any phase string into one of the 5 canonical UX Stages.
 * Handles prefix numbers (e.g. "1. Chờ xác nhận", "2. Define đầu bài"),
 * legacy phase names ("Discovery", "User Flow", "Bàn giao"), and unknowns.
 */
export function mapPhaseToUXStage(phase?: string | null): UXStageKey {
  if (!phase || typeof phase !== "string") return "ui"
  const lower = phase.trim().toLowerCase()

  // 1. Define đầu bài
  if (
    lower.includes("define") ||
    lower.includes("discovery") ||
    lower.includes("phân loại") ||
    lower.includes("khám phá") ||
    lower.includes("khảo sát") ||
    lower.includes("đầu bài") ||
    lower.includes("tiếp nhận") ||
    lower.includes("chờ xác nhận") ||
    lower.startsWith("1.") ||
    lower.startsWith("2.")
  ) {
    return "define"
  }

  // 2. Wireframe / Flow
  if (
    lower.includes("wireframe") ||
    lower.includes("user flow") ||
    lower.includes("flow") ||
    lower.includes("architecture") ||
    lower.startsWith("3.")
  ) {
    return "wireframe"
  }

  // 4. Prototype
  if (
    lower.includes("prototype") ||
    lower.includes("proto") ||
    lower.includes("usability") ||
    lower.includes("testing")
  ) {
    return "prototype"
  }

  // 5. Ready to Dev / Bàn giao / Nghiệm thu
  if (
    lower.includes("ready") ||
    lower.includes("bàn giao") ||
    lower.includes("dev") ||
    lower.includes("nghiệm thu") ||
    lower.startsWith("5.") ||
    lower.startsWith("6.")
  ) {
    return "ready_to_dev"
  }

  // 3. UI Design
  if (
    lower.includes("ui") ||
    lower.includes("design") ||
    lower.includes("visual") ||
    lower.startsWith("4.")
  ) {
    return "ui"
  }

  return "ui"
}

export interface Block2InProgressWorkloadProps {
  /** Filtered or full list of requests from parent dashboard */
  requests: UXRequest[]
  /** Interaction handler: called when clicking an active task item or stage pill */
  onSelectRequest?: (req: UXRequest) => void
  /** Optional container className */
  className?: string
}

export function Block2InProgressWorkload({
  requests,
  onSelectRequest,
  className,
}: Block2InProgressWorkloadProps) {
  // 1. Filter active tasks currently in progress
  const activeTasks = useMemo(() => {
    return (requests || []).filter((r) => {
      if (!r) return false
      const s = (r.status || "").trim().toLowerCase()
      // Active condition: status is "Đang thực hiện" or "In Progress"
      return s === "đang thực hiện" || s === "in progress"
    })
  }, [requests])

  // 2. Compute Average Progress safely (0 if activeTasks is empty)
  const avgProgress = useMemo(() => {
    if (activeTasks.length === 0) return 0
    const totalProgress = activeTasks.reduce((acc, r) => {
      const p =
        typeof r.progress === "number"
          ? r.progress
          : parseInt(String(r.progress || 0), 10) || 0
      return acc + Math.max(0, Math.min(100, p))
    }, 0)
    return Math.round(totalProgress / activeTasks.length)
  }, [activeTasks])

  // 3. Compute 5 UX Stages Distribution
  const stageDistribution = useMemo(() => {
    const buckets: Record<UXStageKey, UXRequest[]> = {
      define: [],
      wireframe: [],
      ui: [],
      prototype: [],
      ready_to_dev: [],
    }

    activeTasks.forEach((task) => {
      const key = mapPhaseToUXStage(task.current_phase)
      buckets[key].push(task)
    })

    const total = activeTasks.length

    return UX_STAGES.map((stage) => {
      const tasks = buckets[stage.key]
      const count = tasks.length
      const percentage = total > 0 ? (count / total) * 100 : 0
      return {
        ...stage,
        count,
        percentage,
        tasks,
      }
    })
  }, [activeTasks])

  // 4. Delivery Tempo calculation (tasks/tuần)
  const deliveryTempo = useMemo(() => {
    if (activeTasks.length === 0) {
      return {
        rate: "0.0",
        unit: "tasks/tuần",
        label: "Tạm dừng",
        statusBadge: "bg-slate-50 text-slate-600 border-slate-200",
      }
    }

    // Heuristic: estimate weekly completion pace based on active volume and completed tasks
    const completedCount = (requests || []).filter((r) => {
      const s = (r?.status || "").trim().toLowerCase()
      return s === "hoàn thành" || s === "hoành thành"
    }).length

    // Estimated run-rate: 4-week window delivery rate or standard velocity
    const weeklyRate =
      completedCount > 0
        ? Math.max(1.5, Math.round((completedCount / 4) * 10) / 10)
        : Math.max(1.0, Math.round((activeTasks.length * 0.6) * 10) / 10)

    let label = "Ổn định"
    let statusBadge = "bg-blue-50 text-blue-700 border-blue-200"

    if (weeklyRate >= 4) {
      label = "Tốc độ cao"
      statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200"
    } else if (weeklyRate < 2) {
      label = "Cần bứt tốc"
      statusBadge = "bg-amber-50 text-amber-700 border-amber-200"
    }

    return {
      rate: weeklyRate.toFixed(1),
      unit: "tasks/tuần",
      label,
      statusBadge,
    }
  }, [activeTasks.length, requests])

  return (
    <Frame variant="default" className={cn("flex flex-col h-full", className)}>
      {/* ─── FRAME HEADER ─── */}
      <FrameHeader>
        <div>
          <FrameTitle className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
            </span>
            Đang thực hiện
          </FrameTitle>
          <FrameDescription className="text-xs text-slate-500 font-normal mt-0.5">
            Phân bổ khối lượng công việc theo 5 khâu UX
          </FrameDescription>
        </div>
        <FrameActions>
          <Badge
            variant="outline"
            size="sm"
            className="font-mono text-[11px] bg-slate-50 text-slate-600 border-slate-200/90"
          >
            {activeTasks.length} Active
          </Badge>
        </FrameActions>
      </FrameHeader>

      {/* ─── FRAME BODY ─── */}
      <FrameBody className="space-y-4 flex-1">
        {/* 1. Headline Metric Row */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900">
              {activeTasks.length}
            </span>
            <span className="text-xs font-semibold text-slate-400">bài toán đang chạy</span>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="text-[11px]">Tiến độ TB:</span>
              <span className="font-mono font-bold text-slate-900">{avgProgress}%</span>
            </div>
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${avgProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2. Multi-Segment Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex gap-0.5 p-0.5 border border-slate-200/60 shadow-inner">
            {activeTasks.length === 0 ? (
              <div className="h-full w-full bg-slate-200/50 rounded-full" />
            ) : (
              stageDistribution.map((stage) => {
                if (stage.percentage === 0) return null
                return (
                  <div
                    key={stage.key}
                    className={cn(
                      stage.color,
                      "h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full hover:brightness-110 relative group cursor-pointer"
                    )}
                    style={{ width: `${stage.percentage}%` }}
                    title={`${stage.name}: ${stage.count} bài toán (${Math.round(stage.percentage)}%)`}
                    onClick={() => {
                      if (stage.tasks.length > 0 && onSelectRequest) {
                        onSelectRequest(stage.tasks[0])
                      }
                    }}
                  />
                )
              })
            )}
          </div>
        </div>

        {/* 3. 5 UX Stages Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {stageDistribution.map((stage) => {
            const hasTasks = stage.count > 0
            return (
              <button
                key={stage.key}
                type="button"
                disabled={!hasTasks}
                onClick={() => {
                  if (hasTasks && onSelectRequest) {
                    onSelectRequest(stage.tasks[0])
                  }
                }}
                className={cn(
                  "p-2 rounded-xl border text-left transition-all relative select-none flex flex-col justify-between",
                  hasTasks
                    ? "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs cursor-pointer active:scale-95"
                    : "bg-slate-50/50 border-slate-100 opacity-60 cursor-default"
                )}
                title={
                  hasTasks
                    ? `Xem bài toán thuộc ${stage.name} (${stage.count} tasks)`
                    : `Không có bài toán ở khâu ${stage.name}`
                }
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 truncate">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", stage.dotColor)} />
                    <span className="truncate">{stage.shortLabel}</span>
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-mono px-1 rounded",
                      stage.bgLight,
                      stage.textColor
                    )}
                  >
                    {Math.round(stage.percentage)}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-auto">
                  <span className="text-base font-black font-mono text-slate-900">
                    {stage.count}
                  </span>
                  <span className="text-[10px] text-slate-400">tasks</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* 4. Active Tasks Quick Preview List */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Bài toán trọng điểm đang chạy</span>
            {activeTasks.length > 3 && (
              <span className="text-[10px] font-normal text-slate-400">
                Hiển thị 3/{activeTasks.length}
              </span>
            )}
          </div>

          {activeTasks.length === 0 ? (
            <div className="py-5 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200">
              <p className="text-xs text-slate-500 font-medium">
                Không có bài toán nào đang thực hiện
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Các yêu cầu đang chờ tiếp nhận hoặc đã hoàn thành
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {activeTasks.slice(0, 3).map((task) => {
                const stageKey = mapPhaseToUXStage(task.current_phase)
                const stageDef = UX_STAGES.find((s) => s.key === stageKey)
                return (
                  <div
                    key={task.request_id || task.id}
                    onClick={() => onSelectRequest?.(task)}
                    className="group flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <UserAvatar
                        name={task.assigned_designer || task.ux_owner || "UX"}
                        size="xs"
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                          {task.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
                          <span className="font-mono text-slate-500">{task.request_id}</span>
                          <span>•</span>
                          <span>{task.squad_name || task.preferred_squad || "UX Team"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-md border",
                          stageDef?.bgLight || "bg-slate-100",
                          stageDef?.textColor || "text-slate-700",
                          stageDef?.borderColor || "border-slate-200"
                        )}
                      >
                        {stageDef?.shortLabel || task.current_phase}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700 w-7 text-right">
                        {task.progress ?? 0}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </FrameBody>

      {/* ─── FRAME FOOTER ─── */}
      <FrameFooter className="pt-3 border-t border-slate-100 mt-auto flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Zap className="w-3 h-3" />
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-medium text-slate-500">Nhịp độ:</span>
            <span className="font-mono font-bold text-slate-900">{deliveryTempo.rate}</span>
            <span className="text-slate-500">{deliveryTempo.unit}</span>
          </div>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-md font-semibold border",
              deliveryTempo.statusBadge
            )}
          >
            {deliveryTempo.label}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <span>Chu kỳ:</span>
          <span className="font-mono font-bold text-slate-800">
            {activeTasks.length > 0 ? "5.2 ngày/khâu" : "—"}
          </span>
        </div>
      </FrameFooter>
    </Frame>
  )
}

export default Block2InProgressWorkload
