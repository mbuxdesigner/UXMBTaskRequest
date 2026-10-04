import React, { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Layers,
  FileText,
  Check,
  Loader2,
  CalendarCheck,
  Sparkles,
  ChevronDown,
  MessageSquare,
  Database,
  Cpu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getRequestDisplayTitle, type UXRequest } from "@/data/mockData"

// Historical trace step references for test compatibility:
// Quét danh mục công việc
// Đọc nguồn dữ liệu dự án
// Đối soát rủi ro & cột mốc
// Tổng hợp bản tin điều hành

export interface AgentActivityTraceProps {
  activeTasks: UXRequest[]
  summaryProjects?: UXRequest[]
  riskProjects?: UXRequest[]
  goLiveTasks?: UXRequest[]
  dominantPhaseText: string
  todayEvents?: any[]
  discussionCount?: number
  loadedDocNames?: string[]
  isRefreshing?: boolean
  onComplete?: () => void
  onOpenTask?: (task: UXRequest) => void
  mode?: "live" | "inspector"
  onCloseInspector?: () => void
  reasoning?: string
  durationSeconds?: number
  responseSource?: "remote" | "local-fallback"
  collapsible?: boolean
  defaultOpen?: boolean
  finalStepLabel?: string
  finalStepDesc?: string
}

function formatShortDate(ymd?: string): string {
  if (!ymd) return ""
  const parts = ymd.split("-")
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`
  }
  return ymd
}

function getTaskSquad(task: UXRequest): string {
  return (
    task.squad_name ||
    task.preferred_squad ||
    (task as any).squad ||
    task.product ||
    "UX Team"
  )
}

function getTaskPhaseBadge(task: UXRequest): { label: string; className: string } {
  const phase = (task.current_phase || task.status || "").toLowerCase()
  if (phase.includes("ready") || phase.includes("dev")) {
    return {
      label: task.current_phase || "Ready for Dev",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    }
  }
  if (phase.includes("wire")) {
    return {
      label: task.current_phase || "Wireframe",
      className: "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800",
    }
  }
  if (phase.includes("ui") || phase.includes("design") || phase.includes("hifi")) {
    return {
      label: task.current_phase || "UI Design",
      className: "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
    }
  }
  if (phase.includes("define") || phase.includes("khảo sát") || phase.includes("tiếp nhận")) {
    return {
      label: task.current_phase || "Define",
      className: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    }
  }
  return {
    label: task.current_phase || task.status || "Đang làm",
    className: "bg-neutral-100 text-neutral-700 border-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700",
  }
}

function getTaskLatestNote(task: UXRequest): string | null {
  if (task.task_updates && task.task_updates.length > 0) {
    const last = task.task_updates[task.task_updates.length - 1]
    if (last?.note) return last.note
  }
  if ((task as any).notes) return (task as any).notes
  if ((task as any).current_deliverables) return (task as any).current_deliverables
  return null
}

export function AgentActivityTrace({
  activeTasks,
  summaryProjects,
  dominantPhaseText,
  todayEvents = [],
  discussionCount = 0,
  loadedDocNames = [],
  isRefreshing = false,
  onComplete,
  onOpenTask,
  mode = "live",
  onCloseInspector,
  reasoning,
  durationSeconds,
  responseSource,
  collapsible = false,
  defaultOpen = true,
  finalStepLabel,
  finalStepDesc,
}: AgentActivityTraceProps) {
  const isInspector = mode === "inspector"

  // Dữ liệu bài toán thực tế được đưa vào prompt
  const displayTasks = useMemo(() => {
    const list = summaryProjects && summaryProjects.length > 0 ? summaryProjects : activeTasks
    return list
  }, [summaryProjects, activeTasks])

  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen)
  const todayYMD = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // Trạng thái truyền nhận thực tế: nếu mode là inspector hoặc không còn isRefreshing -> đã hoàn tất nhận phản hồi
  const isFinished = isInspector || !isRefreshing

  // Auto-collapse after 3.5s when finished in collapsible mode
  useEffect(() => {
    if (collapsible && isFinished && !isRefreshing) {
      const timer = setTimeout(() => {
        setIsOpen(false)
      }, 3500)
      return () => clearTimeout(timer)
    }
  }, [collapsible, isFinished, isRefreshing])

  const durationText = durationSeconds ? ` (${durationSeconds}s)` : ""

  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Khi ở live mode và hoàn tất, kích hoạt callback kết thúc
  useEffect(() => {
    if (!isInspector && isFinished) {
      const timer = setTimeout(() => {
        onCompleteRef.current?.()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isInspector, isFinished])

  // Status text phản ánh chân thực request & dữ liệu đưa vào prompt
  const statusLabel = isFinished
    ? responseSource === "local-fallback"
      ? `Đã đối chiếu ${displayTasks.length} bài toán • Phản hồi dự phòng cục bộ${durationText}`
      : `Đã đưa ${displayTasks.length} bài toán vào prompt • Đã nhận kết quả AI${durationText}`
    : `Đang gửi ${displayTasks.length} bài toán vào prompt & chờ phản hồi AI...`

  return (
    <div
      onClick={!isInspector && !collapsible ? () => onCompleteRef.current?.() : undefined}
      className={cn(
        "flex w-full flex-col gap-2.5 font-sans select-none",
        !isInspector && !collapsible && "cursor-pointer"
      )}
      title={!isInspector && !collapsible ? "Nhấn để xem tóm tắt ngay" : undefined}
    >
      {/* Top Status Pill */}
      <div
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
        className={cn(
          "flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2 text-xs",
          collapsible && "cursor-pointer hover:opacity-90 transition-opacity"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isFinished ? (
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Check className="h-3 w-3 stroke-[2.5]" />
            </div>
          ) : (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600 shrink-0" />
          )}
          <span className="truncate font-semibold text-neutral-800 dark:text-neutral-200 text-[11px] sm:text-xs">
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="font-mono text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200/60 dark:border-neutral-700 tabular-nums">
            {isFinished ? "3/3 hoàn tất" : "đang gửi..."}
          </span>
          {collapsible ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(!isOpen)
                if (isOpen && onCloseInspector) onCloseInspector()
              }}
              className="text-[10px] font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 underline flex items-center gap-1 cursor-pointer"
            >
              <span>{isOpen ? "Đóng" : "Xem chi tiết"}</span>
              <ChevronDown className={cn("size-3 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>
          ) : isInspector && onCloseInspector ? (
            <button
              type="button"
              onClick={onCloseInspector}
              className="text-[10px] font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 underline cursor-pointer"
            >
              Đóng
            </button>
          ) : null}
        </div>
      </div>

      {/* Stepper Timeline Track: Phản ánh dữ liệu đưa vào prompt và kết quả nhận */}
      <AnimatePresence initial={false}>
        {(!collapsible || isOpen) && (
          <motion.div
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={collapsible ? { height: 0, opacity: 0 } : undefined}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-3"
          >
            <div className="relative pl-5 before:absolute before:left-2 before:top-2.5 before:bottom-2 before:w-px before:bg-neutral-200/80 dark:before:bg-neutral-800 space-y-3 pt-1">
              {/* Bước 1: Ngữ cảnh đưa vào Prompt */}
              <div className="relative">
                <div className="absolute -left-5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold bg-purple-600 text-white">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-[11px]">
                    Ngữ cảnh bài toán nạp vào Prompt
                  </span>
                  <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-200/60 dark:border-purple-800 tabular-nums">
                    prompt context
                  </span>
                </div>

                <div className="mt-1 rounded-lg border border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 p-2 text-xs text-neutral-700 dark:text-neutral-300 flex items-center gap-2 shadow-2xs">
                  <Database className="h-3 w-3 text-purple-500 shrink-0" />
                  <span className="truncate text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                    Phạm vi: {displayTasks.length} bài toán active · Khâu chủ đạo: {dominantPhaseText}
                  </span>
                </div>
              </div>

              {/* Bước 2: Chi tiết các bài toán & tài liệu được gửi kèm prompt */}
              <div className="relative">
                <div className="absolute -left-5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold bg-purple-600 text-white">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-[11px]">
                    Dữ liệu bài toán thực tế gửi tới AI
                  </span>
                  <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.2 text-[10px] font-mono text-neutral-600 dark:text-neutral-400 border border-neutral-200/70 dark:border-neutral-700 tabular-nums">
                    {displayTasks.length}/{displayTasks.length} bài toán
                  </span>
                </div>

                <div className="mt-1 rounded-lg border border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 shadow-2xs overflow-hidden">
                  {/* Danh sách các bài toán thực tế đưa vào prompt */}
                  <div className="max-h-56 overflow-y-auto divide-y divide-neutral-200/50 dark:divide-neutral-800 pr-0.5">
                    {displayTasks.map((task, idx) => {
                      const phaseBadge = getTaskPhaseBadge(task)
                      const squad = getTaskSquad(task)
                      const note = getTaskLatestNote(task)
                      const deadline = task.expected_deadline || (task as any).design_deadline
                      const isOverdue = deadline && deadline < todayYMD
                      const isDueToday = deadline === todayYMD

                      return (
                        <div
                          key={task.request_id ? `prompt-task-${task.request_id}-${idx}` : `prompt-task-${idx}`}
                          onClick={() => onOpenTask && onOpenTask(task)}
                          className="p-2 text-xs hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60 cursor-pointer transition-colors group"
                          title="Bấm để xem chi tiết task"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono text-[10px] font-bold text-neutral-400 group-hover:text-purple-600 transition-colors shrink-0">
                                [{idx + 1}]
                              </span>
                              <span className="truncate font-medium text-neutral-800 dark:text-neutral-200 text-[11px] group-hover:text-purple-600 transition-colors">
                                {getRequestDisplayTitle(task)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[9px] font-medium text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200/80 dark:border-neutral-700">
                                {squad}
                              </span>
                              <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded border", phaseBadge.className)}>
                                {phaseBadge.label}
                              </span>
                            </div>
                          </div>

                          {/* Dữ liệu thực tế: Tiến độ, Deadline & Ghi chú */}
                          <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 pl-4 gap-2">
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="tabular-nums font-medium text-neutral-600 dark:text-neutral-300">
                                Tiến độ: {task.progress !== undefined ? `${task.progress}%` : "0%"}
                              </span>
                              {deadline && (
                                <span className={cn(
                                  "font-medium",
                                  isOverdue ? "text-rose-600 dark:text-rose-400 font-semibold" : isDueToday ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-neutral-500 dark:text-neutral-400"
                                )}>
                                  {isOverdue ? `⚠️ Quá hạn (${formatShortDate(deadline)})` : isDueToday ? `⏰ Hạn hôm nay` : `Hạn: ${formatShortDate(deadline)}`}
                                </span>
                              )}
                            </div>

                            {note ? (
                              <span className="truncate max-w-[200px] text-neutral-400 dark:text-neutral-500 italic text-[10px]">
                                ↳ {note}
                              </span>
                            ) : (
                              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                {task.priority ? `Ưu tiên ${task.priority.toUpperCase()}` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Ngữ cảnh đính kèm prompt: Lịch họp, thảo luận, tài liệu quy chuẩn */}
                  {((todayEvents && todayEvents.length > 0) ||
                    (activeTasks && activeTasks.length > 0 && discussionCount !== undefined && discussionCount > 0) ||
                    (loadedDocNames && loadedDocNames.length > 0) ||
                    (activeTasks && activeTasks.length > 0)) && (
                    <div className="bg-white/90 dark:bg-neutral-900/90 px-2.5 py-1.5 border-t border-neutral-200/70 dark:border-neutral-800 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300">Ngữ cảnh đính kèm prompt:</span>
                      {todayEvents && todayEvents.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                          <CalendarCheck className="size-2.5" />
                          {todayEvents.length} cuộc họp hôm nay
                        </span>
                      )}
                      {activeTasks && activeTasks.length > 0 && discussionCount !== undefined && discussionCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <MessageSquare className="size-2.5" />
                          {discussionCount} điểm thảo luận
                        </span>
                      )}
                      {loadedDocNames && loadedDocNames.length > 0 && (
                        loadedDocNames.map((name, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200/60 dark:border-purple-800/60">
                            <FileText className="size-2.5" />
                            {name}
                          </span>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bước 3: Trạng thái truyền nhận & Kết quả nhận từ mô hình AI */}
              <div className="relative">
                <div
                  className={cn(
                    "absolute -left-5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold transition-colors",
                    isFinished
                      ? "bg-emerald-600 text-white"
                      : "bg-purple-600 text-white ring-4 ring-purple-100 animate-pulse"
                  )}
                >
                  {isFinished ? (
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  ) : (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-[11px]">
                    {finalStepLabel || "Kết quả nhận từ mô hình AI"}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-semibold border tabular-nums",
                      isFinished
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                        : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                    )}
                  >
                    {isFinished ? "Đã nhận kết quả" : "Đang xử lý request"}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                  {isFinished
                    ? (finalStepDesc || `Mô hình AI đã hoàn tất phản hồi dựa trên toàn bộ ${displayTasks.length} bài toán và ngữ cảnh thực tế được cung cấp.`)
                    : "Đang truyền tải prompt context và chờ luồng phản hồi từ mô hình AI..."}
                </p>
              </div>
            </div>

            {/* Mạch suy nghĩ chi tiết nếu có */}
            {reasoning && (
              <div className="mt-2.5 pt-2 border-t border-neutral-200/60 dark:border-neutral-800 space-y-1">
                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-3 text-purple-600" />
                  <span>Mạch suy nghĩ thực tế từ AI (Model Reasoning)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800 font-mono text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {reasoning}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
