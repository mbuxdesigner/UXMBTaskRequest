import React, { useEffect, useMemo, useRef, useState } from "react"
import { ExternalLink, MessageSquare, User, Sparkles, Clock, CheckCircle2 } from "lucide-react"
import { getRequestDisplayTitle, type UXRequest } from "@/data/mockData"
import type { PlannerEntry } from "@/services/calendarService"
import { cn } from "@/lib/utils"
import {
  type ExecutiveIntelligenceData,
  type PerspectiveAngle,
  type NarrativeSegment,
  type NarrativeLine,
  type NarrativeBlock,
  buildAssistantNarrativeBlocks,
} from "@/lib/executiveIntelligence"

export interface ExecutiveSummaryTypewriterProps {
  todayYMD?: string
  newAssignedTasks?: UXRequest[]
  overdueTasks?: UXRequest[]
  dueTodayTasks?: UXRequest[]
  plannedTodayTasks?: UXRequest[]
  todayEvents?: PlannerEntry[]
  todayPersonalLeaves?: PlannerEntry[]
  activeTasks?: UXRequest[]
  dominantPhaseText?: string
  focusSummaryText?: string
  goLiveTasks?: UXRequest[]
  poPendingTasks?: UXRequest[]
  weekEvents?: PlannerEntry[]
  isEndOfWeek?: boolean
  isBeginningOfWeek?: boolean
  nextWeekDeadlines?: UXRequest[]
  nextWeekEvents?: PlannerEntry[]
  unscheduledTasks?: UXRequest[]
  recommendationText?: string
  triggerKey?: number
  // Rich Intelligence Engine props
  intelligence?: ExecutiveIntelligenceData
  perspectiveAngle?: PerspectiveAngle
  seed?: number
  onOpenTask: (task: UXRequest) => void
  onOpenEvent: (event: PlannerEntry) => void
  onOpenChat?: (task: UXRequest) => void
}

function formatShortDate(ymd?: string): string {
  if (!ymd) return "Chưa có ngày"
  const [year, month, day] = ymd.split("-").map(Number)
  if (!year || !month || !day) return ymd
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(
    new Date(year, month - 1, day)
  )
}

export function ExecutiveSummaryTypewriter({
  todayYMD = "",
  newAssignedTasks = [],
  overdueTasks = [],
  dueTodayTasks = [],
  plannedTodayTasks = [],
  todayEvents = [],
  todayPersonalLeaves = [],
  activeTasks = [],
  dominantPhaseText = "",
  focusSummaryText = "",
  goLiveTasks = [],
  poPendingTasks = [],
  weekEvents = [],
  isEndOfWeek = false,
  isBeginningOfWeek = false,
  nextWeekDeadlines = [],
  nextWeekEvents = [],
  unscheduledTasks = [],
  recommendationText = "",
  triggerKey = 0,
  intelligence,
  perspectiveAngle = "overview",
  seed = 0,
  onOpenTask,
  onOpenEvent,
  onOpenChat,
}: ExecutiveSummaryTypewriterProps) {
  // Build structured blocks: Use rich intelligence narrative if available, else legacy blocks
  const blocks = useMemo<NarrativeBlock[]>(() => {
    if (intelligence) {
      return buildAssistantNarrativeBlocks(intelligence, perspectiveAngle, seed)
    }

    // Legacy fallback blocks for backward compatibility
    const result: NarrativeBlock[] = []

    // ─── BLOCK 1: HÔM NAY ─────────────────────────────────────────────────────
    const block1Lines: NarrativeLine[] = [
      {
        id: "b1-header",
        segments: [
          {
            id: "b1-h-txt",
            text: `📍 Hôm nay (${formatShortDate(todayYMD)}):`,
            type: "header",
          },
        ],
      },
    ]

    // 1.1 Task mới gán
    if (newAssignedTasks.length > 0) {
      const segs: NarrativeSegment[] = [
        { id: "b1-new-pre", text: "• 🔔 Bạn có ", type: "text" },
        { id: "b1-new-num", text: `${newAssignedTasks.length} task mới`, type: "bold" },
        { id: "b1-new-mid", text: " cần tiếp nhận & phân tích: ", type: "text" },
      ]
      newAssignedTasks.slice(0, 3).forEach((task, idx) => {
        segs.push({
          id: `b1-new-t-${task.request_id || idx}`,
          text: getRequestDisplayTitle(task),
          type: "task",
          task,
        })
        if (idx < Math.min(newAssignedTasks.length, 3) - 1) {
          segs.push({ id: `b1-new-sep-${idx}`, text: ", ", type: "text" })
        }
      })
      segs.push({
        id: "b1-new-suf",
        text: newAssignedTasks.length > 3 ? ` và ${newAssignedTasks.length - 3} task khác.` : ".",
        type: "text",
      })
      block1Lines.push({ id: "b1-line-new", segments: segs })
    }

    // 1.2 Task trễ hạn / chạm deadline
    if (overdueTasks.length > 0) {
      const segs: NarrativeSegment[] = [
        { id: "b1-od-pre", text: "• ⚠️ Ưu tiên cứu hạn ", type: "text" },
        { id: "b1-od-num", text: `${overdueTasks.length} task trễ hạn`, type: "bold" },
        { id: "b1-od-mid", text: ": ", type: "text" },
      ]
      overdueTasks.slice(0, 2).forEach((task, idx) => {
        segs.push({
          id: `b1-od-t-${task.request_id || idx}`,
          text: getRequestDisplayTitle(task),
          type: "task",
          task,
        })
        if (idx < Math.min(overdueTasks.length, 2) - 1) {
          segs.push({ id: `b1-od-sep-${idx}`, text: ", ", type: "text" })
        }
      })
      segs.push({
        id: "b1-od-suf",
        text: dueTodayTasks.length > 0 ? ` cùng ${dueTodayTasks.length} task chạm deadline hôm nay.` : ".",
        type: "text",
      })
      block1Lines.push({ id: "b1-line-od", segments: segs })
    } else if (dueTodayTasks.length > 0) {
      const segs: NarrativeSegment[] = [
        { id: "b1-due-pre", text: "• ⏰ Hôm nay là hạn chót của ", type: "text" },
      ]
      dueTodayTasks.forEach((task, idx) => {
        segs.push({
          id: `b1-due-t-${task.request_id || idx}`,
          text: getRequestDisplayTitle(task),
          type: "task",
          task,
        })
        if (idx < dueTodayTasks.length - 1) {
          segs.push({ id: `b1-due-sep-${idx}`, text: ", ", type: "text" })
        } else {
          segs.push({ id: "b1-due-dot", text: ".", type: "text" })
        }
      })
      block1Lines.push({ id: "b1-line-due", segments: segs })
    }

    // 1.3 Lịch dự kiến làm hôm nay
    if (plannedTodayTasks.length > 0) {
      const segs: NarrativeSegment[] = [
        { id: "b1-pl-pre", text: "• 📌 Lịch dự kiến làm hôm nay: ", type: "text" },
      ]
      plannedTodayTasks.slice(0, 3).forEach((task, idx) => {
        segs.push({
          id: `b1-pl-t-${task.request_id || idx}`,
          text: getRequestDisplayTitle(task),
          type: "task",
          task,
        })
        if (idx < Math.min(plannedTodayTasks.length, 3) - 1) {
          segs.push({ id: `b1-pl-sep-${idx}`, text: ", ", type: "text" })
        } else {
          segs.push({ id: "b1-pl-dot", text: ".", type: "text" })
        }
      })
      block1Lines.push({ id: "b1-line-pl", segments: segs })
    }

    // 1.4 Lịch sự kiện/họp hôm nay
    if (todayEvents.length > 0) {
      const segs: NarrativeSegment[] = [
        { id: "b1-ev-pre", text: "• 📅 Hôm nay bạn có ", type: "text" },
        { id: "b1-ev-num", text: `${todayEvents.length} lịch hẹn/họp`, type: "bold" },
        { id: "b1-ev-mid", text: ": ", type: "text" },
      ]
      todayEvents.forEach((ev, idx) => {
        const titleWithTime = ev.time ? `${ev.time} ${ev.title}` : ev.title
        segs.push({
          id: `b1-ev-${ev.id || idx}`,
          text: titleWithTime,
          type: "event",
          event: ev,
        })
        if (idx < todayEvents.length - 1) {
          segs.push({ id: `b1-ev-sep-${idx}`, text: ", ", type: "text" })
        } else {
          segs.push({ id: "b1-ev-dot", text: ".", type: "text" })
        }
      })
      block1Lines.push({ id: "b1-line-ev", segments: segs })
    } else {
      block1Lines.push({
        id: "b1-line-ev-empty",
        segments: [
          {
            id: "b1-ev-none",
            text: "• 📅 Hôm nay không có lịch họp cố định — thuận lợi để bạn tập trung làm việc chuyên sâu (Deep Work).",
            type: "italic",
          },
        ],
      })
    }

    result.push({ id: "b1-today", lines: block1Lines })

    // ─── BLOCK 2: TUẦN NÀY & GO-LIVE ──────────────────────────────────────────
    const block2Lines: NarrativeLine[] = [
      {
        id: "b2-header",
        segments: [
          {
            id: "b2-h-txt",
            text: "🚀 Tuần này & Cột mốc Go-Live:",
            type: "header",
          },
        ],
      },
    ]

    if (activeTasks.length > 0) {
      block2Lines.push({
        id: "b2-line-overview",
        segments: [
          { id: "b2-ov-pre", text: "Bạn đang phụ trách ", type: "text" },
          { id: "b2-ov-num", text: `${activeTasks.length} bài toán`, type: "bold" },
          { id: "b2-ov-mid", text: ", trọng tâm dồn vào ", type: "text" },
          { id: "b2-ov-phase", text: dominantPhaseText, type: "bold" },
          { id: "b2-ov-focus", text: focusSummaryText ? `. Hướng đến ${focusSummaryText}.` : ".", type: "text" },
        ],
      })
    }

    if (goLiveTasks.length > 0) {
      const segs: NarrativeSegment[] = [
        { id: "b2-gl-pre", text: "• 🚀 Mốc Go-Live tuần: Dự án ", type: "text" },
      ]
      goLiveTasks.forEach((t, idx) => {
        segs.push({
          id: `b2-gl-t-${t.request_id || idx}`,
          text: getRequestDisplayTitle(t),
          type: "task",
          task: t,
        })
        if (idx < goLiveTasks.length - 1) {
          segs.push({ id: `b2-gl-sep-${idx}`, text: ", ", type: "text" })
        }
      })
      segs.push({
        id: "b2-gl-suf",
        text: " có kế hoạch phát hành trong tuần này. Hãy rà soát lại spec nghiệm thu UI và nhắn PO/Tech Lead báo cáo tiến độ.",
        type: "text",
      })
      block2Lines.push({ id: "b2-line-gl", segments: segs })
    }

    result.push({ id: "b2-week", lines: block2Lines })

    // ─── BLOCK 3: LỜI KHUYÊN & KẾ HOẠCH ─────────────────────────────────────
    const block3Lines: NarrativeLine[] = [
      {
        id: "b3-header",
        segments: [
          {
            id: "b3-h-txt",
            text: isEndOfWeek ? "📋 Kế hoạch tuần sau (Cảnh báo T5 - T6):" : "📋 Tiến độ & Đề xuất:",
            type: "header",
          },
        ],
      },
    ]

    block3Lines.push({
      id: "b3-line-recom",
      segments: [
        {
          id: "b3-recom-txt",
          text: `• 💡 ${recommendationText || "Duy trì nhịp độ làm việc và rà soát tiến độ thường xuyên."}`,
          type: "italic",
        },
      ],
    })

    result.push({ id: "b3-plan", lines: block3Lines })
    return result
  }, [
    intelligence,
    perspectiveAngle,
    seed,
    todayYMD,
    newAssignedTasks,
    overdueTasks,
    dueTodayTasks,
    plannedTodayTasks,
    todayEvents,
    todayPersonalLeaves,
    activeTasks,
    dominantPhaseText,
    focusSummaryText,
    goLiveTasks,
    poPendingTasks,
    weekEvents,
    isEndOfWeek,
    isBeginningOfWeek,
    nextWeekDeadlines,
    nextWeekEvents,
    unscheduledTasks,
    recommendationText,
  ])

  // Flatten segments and calculate total character length
  const { flatSegments, totalChars } = useMemo(() => {
    const list: Array<
      NarrativeSegment & {
        start: number
        end: number
        blockId: string
        lineId: string
        isLineHeader: boolean
      }
    > = []
    let cursor = 0
    blocks.forEach((block) => {
      block.lines.forEach((line) => {
        line.segments.forEach((seg, sIdx) => {
          const len = seg.text.length
          list.push({
            ...seg,
            start: cursor,
            end: cursor + len,
            blockId: block.id,
            lineId: line.id,
            isLineHeader: sIdx === 0 && seg.type === "header",
          })
          cursor += len
        })
      })
    })
    return { flatSegments: list, totalChars: cursor }
  }, [blocks])

  const [visibleChars, setVisibleChars] = useState(0)
  const isTypingComplete = visibleChars >= totalChars

  // Run typewriter animation on mount and when triggerKey / seed changes
  useEffect(() => {
    setVisibleChars(0)
    let animationFrameId: number | undefined
    let lastTick = performance.now()
    let current = 0

    // Rapid, responsive token typing rate (approx 180-240 chars/sec)
    const tick = (now: number) => {
      const delta = now - lastTick
      if (delta >= 14) {
        const charsToAdd = Math.max(1, Math.round(delta / 7))
        current = Math.min(totalChars, current + charsToAdd)
        setVisibleChars(current)
        lastTick = now
      }
      if (current < totalChars) {
        animationFrameId = requestAnimationFrame(tick)
      }
    }

    animationFrameId = requestAnimationFrame(tick)
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [totalChars, triggerKey, seed, perspectiveAngle])

  // Skip typing on click
  const handleSkipTyping = () => {
    setVisibleChars(totalChars)
  }

  return (
    <div
      onClick={!isTypingComplete ? handleSkipTyping : undefined}
      className={cn("space-y-3 relative group select-text", !isTypingComplete && "cursor-pointer")}
      title={!isTypingComplete ? "Nhấn vào đây để hiện toàn bộ văn bản ngay" : undefined}
    >
      {blocks.map((block, bIdx) => {
        // Check if any segment in this block has started typing
        const blockSegments = flatSegments.filter((s) => s.blockId === block.id)
        const blockStart = blockSegments[0]?.start ?? 0
        if (visibleChars < blockStart) return null

        return (
          <div
            key={block.id}
            className={cn("space-y-1.5", bIdx > 0 && "pt-2.5 border-t border-slate-100")}
          >
            {block.lines.map((line) => {
              const lineSegments = blockSegments.filter((s) => s.lineId === line.id)
              const lineStart = lineSegments[0]?.start ?? 0
              if (visibleChars < lineStart) return null

              const isHeaderLine = line.segments[0]?.type === "header"

              return (
                <div
                  key={line.id}
                  className={cn(
                    isHeaderLine
                      ? "font-bold text-slate-900 flex items-center gap-1.5 text-xs sm:text-[13px]"
                      : "space-y-1 text-slate-700 pl-0.5 text-xs sm:text-[13px] leading-relaxed"
                  )}
                >
                  <p className="leading-relaxed">
                    {lineSegments.map((seg) => {
                      if (visibleChars <= seg.start) return null
                      const isComplete = visibleChars >= seg.end
                      const displayedText = isComplete ? seg.text : seg.text.slice(0, visibleChars - seg.start)
                      const isCurrentlyTypingThis = !isComplete && visibleChars > seg.start

                      let element: React.ReactNode = displayedText

                      if (seg.type === "task" && seg.task) {
                        element = (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpenTask(seg.task!)
                            }}
                            className="font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2 decoration-blue-300 hover:decoration-blue-700 cursor-pointer inline transition-colors text-left"
                            title={`Mở chi tiết bài toán: ${getRequestDisplayTitle(seg.task)}`}
                          >
                            {displayedText}
                          </button>
                        )
                      } else if (seg.type === "delegated") {
                        element = (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (seg.task) onOpenTask(seg.task)
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-1.5 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200/80 shadow-2xs hover:bg-purple-100 hover:text-purple-900 transition-colors cursor-pointer align-baseline"
                            title={`Xem tiến độ của ${seg.text}`}
                          >
                            <User className="h-2.5 w-2.5 text-purple-600 inline shrink-0" />
                            <span>{displayedText}</span>
                          </button>
                        )
                      } else if (seg.type === "chat") {
                        element = (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (seg.task) {
                                onOpenChat ? onOpenChat(seg.task) : onOpenTask(seg.task)
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/80 shadow-2xs hover:bg-blue-100 hover:text-blue-900 transition-colors cursor-pointer align-baseline"
                            title="Bấm để xem chi tiết trao đổi trong task"
                          >
                            <MessageSquare className="h-2.5 w-2.5 text-blue-600 inline shrink-0" />
                            <span>{displayedText}</span>
                          </button>
                        )
                      } else if (seg.type === "event" && seg.event) {
                        element = (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpenEvent(seg.event!)
                            }}
                            className="font-semibold text-purple-600 hover:text-purple-800 underline underline-offset-2 decoration-purple-300 hover:decoration-purple-700 cursor-pointer inline transition-colors text-left"
                            title={`Xem sự kiện: ${seg.event.title}`}
                          >
                            {displayedText}
                          </button>
                        )
                      } else if (seg.type === "bold") {
                        element = <strong className="text-slate-950 font-bold">{displayedText}</strong>
                      } else if (seg.type === "italic") {
                        element = <span className="text-slate-500 italic text-[11px]">{displayedText}</span>
                      }

                      return (
                        <React.Fragment key={seg.id}>
                          {element}
                          {isCurrentlyTypingThis && (
                            <span
                              aria-hidden="true"
                              className="inline-block w-1.5 h-3.5 ml-0.5 translate-y-0.5 bg-blue-600 animate-pulse rounded-[1px]"
                            />
                          )}
                        </React.Fragment>
                      )
                    })}
                  </p>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
