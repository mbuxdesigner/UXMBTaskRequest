import React, { useEffect, useMemo, useState } from "react"
import { MessageSquare, User } from "lucide-react"
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
  // 1. Build structured blocks for typewriter narrative
  const blocks = useMemo<NarrativeBlock[]>(() => {
    if (intelligence) {
      return buildAssistantNarrativeBlocks(intelligence, perspectiveAngle, seed)
    }

    // Legacy fallback blocks for backward compatibility
    const result: NarrativeBlock[] = []

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
        }
      })
      segs.push({
        id: "b1-pl-suf",
        text: plannedTodayTasks.length > 3 ? ` và ${plannedTodayTasks.length - 3} task khác.` : ".",
        type: "text",
      })
      block1Lines.push({ id: "b1-line-pl", segments: segs })
    }

    if (todayPersonalLeaves.length > 0) {
      const leave = todayPersonalLeaves[0]
      block1Lines.push({
        id: "b1-line-leave",
        segments: [
          { id: "b1-lv-pre", text: "• 🌴 Bạn có lịch nghỉ phép hôm nay (", type: "text" },
          { id: "b1-lv-title", text: leave.title, type: "bold" },
          { id: "b1-lv-suf", text: "). Hệ thống sẽ không xếp lịch phát sinh.", type: "text" },
        ],
      })
    } else if (todayEvents.length > 0) {
      const segs: NarrativeSegment[] = [
        { id: "b1-ev-pre", text: "• 📅 Bạn có ", type: "text" },
        { id: "b1-ev-num", text: `${todayEvents.length} sự kiện/cuộc họp`, type: "bold" },
        { id: "b1-ev-mid", text: " hôm nay: ", type: "text" },
      ]
      todayEvents.slice(0, 2).forEach((event, idx) => {
        segs.push({
          id: `b1-ev-e-${event.id || idx}`,
          text: event.title,
          type: "event",
          event,
        })
        if (idx < Math.min(todayEvents.length, 2) - 1) {
          segs.push({ id: `b1-ev-sep-${idx}`, text: ", ", type: "text" })
        }
      })
      segs.push({
        id: "b1-ev-suf",
        text: todayEvents.length > 2 ? ` và ${todayEvents.length - 2} sự kiện khác.` : ".",
        type: "text",
      })
      block1Lines.push({ id: "b1-line-ev", segments: segs })
    }

    result.push({ id: "block-1", lines: block1Lines })
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
  ])

  // Flatten segments for rules-based typewriter animation
  const { flatSegments, totalChars } = useMemo(() => {
    let cursor = 0
    const list: Array<NarrativeSegment & { blockId: string; lineId: string; start: number; end: number }> = []

    blocks.forEach((block) => {
      block.lines.forEach((line) => {
        line.segments.forEach((seg) => {
          const len = seg.text.length
          list.push({
            ...seg,
            blockId: block.id,
            lineId: line.id,
            start: cursor,
            end: cursor + len,
          })
          cursor += len
        })
      })
    })
    return { flatSegments: list, totalChars: cursor }
  }, [blocks])

  const [visibleChars, setVisibleChars] = useState(0)
  const isTypingComplete = visibleChars >= totalChars

  // Run typewriter animation
  useEffect(() => {
    setVisibleChars(0)
    let animationFrameId: number | undefined
    let lastTick = performance.now()
    let current = 0

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

  return (
    <div className="space-y-3">
      <div
        onClick={!isTypingComplete ? () => setVisibleChars(totalChars) : undefined}
        className={cn("space-y-3 relative group select-text", !isTypingComplete && "cursor-pointer")}
        title={!isTypingComplete ? "Nhấn vào đây để hiện toàn bộ văn bản ngay" : undefined}
      >
          {blocks.map((block, bIdx) => {
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
    </div>
  )
}

