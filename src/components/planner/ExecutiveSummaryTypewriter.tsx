import React, { useEffect, useMemo, useRef, useState } from "react"
import { ExternalLink, SkipForward } from "lucide-react"
import { getRequestDisplayTitle, type UXRequest } from "@/data/mockData"
import type { PlannerEntry } from "@/services/calendarService"
import { cn } from "@/lib/utils"

export interface ExecutiveSummaryTypewriterProps {
  todayYMD: string
  newAssignedTasks: UXRequest[]
  overdueTasks: UXRequest[]
  dueTodayTasks: UXRequest[]
  plannedTodayTasks: UXRequest[]
  todayEvents: PlannerEntry[]
  todayPersonalLeaves: PlannerEntry[]
  activeTasks: UXRequest[]
  dominantPhaseText: string
  focusSummaryText: string
  goLiveTasks: UXRequest[]
  poPendingTasks: UXRequest[]
  weekEvents: PlannerEntry[]
  isEndOfWeek: boolean
  isBeginningOfWeek: boolean
  nextWeekDeadlines: UXRequest[]
  nextWeekEvents: PlannerEntry[]
  unscheduledTasks: UXRequest[]
  recommendationText: string
  triggerKey?: number
  onOpenTask: (task: UXRequest) => void
  onOpenEvent: (event: PlannerEntry) => void
}

function formatShortDate(ymd?: string): string {
  if (!ymd) return "Chưa có ngày"
  const [year, month, day] = ymd.split("-").map(Number)
  if (!year || !month || !day) return ymd
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(
    new Date(year, month - 1, day),
  )
}

interface Segment {
  id: string
  text: string
  type: "text" | "bold" | "task" | "event" | "header" | "italic"
  task?: UXRequest
  event?: PlannerEntry
}

interface Line {
  id: string
  segments: Segment[]
}

interface Block {
  id: string
  lines: Line[]
}

export function ExecutiveSummaryTypewriter({
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
  triggerKey = 0,
  onOpenTask,
  onOpenEvent,
}: ExecutiveSummaryTypewriterProps) {
  // Build structured blocks
  const blocks = useMemo<Block[]>(() => {
    const result: Block[] = []

    // ─── BLOCK 1: HÔM NAY ─────────────────────────────────────────────────────
    const block1Lines: Line[] = [
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
      const segs: Segment[] = [
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
      const segs: Segment[] = [
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
      const segs: Segment[] = [
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
      const segs: Segment[] = [
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
      const segs: Segment[] = [
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

    // 1.5 Lịch nghỉ phép cá nhân hôm nay
    if (todayPersonalLeaves.length > 0) {
      block1Lines.push({
        id: "b1-line-leave",
        segments: [
          {
            id: "b1-leave-txt",
            text: `• 🏖️ Lưu ý: Bạn có lịch nghỉ phép (${todayPersonalLeaves.map((l) => l.title).join(", ")}) hôm nay.`,
            type: "text",
          },
        ],
      })
    }

    result.push({ id: "b1-today", lines: block1Lines })

    // ─── BLOCK 2: TUẦN NÀY & GO-LIVE ──────────────────────────────────────────
    const block2Lines: Line[] = [
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

    // 2.1 Số lượng task & phase trọng tâm
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
    } else {
      block2Lines.push({
        id: "b2-line-empty",
        segments: [
          {
            id: "b2-empty-txt",
            text: "Hiện tại bạn chưa có bài toán nào đang thực hiện hoặc theo dõi.",
            type: "italic",
          },
        ],
      })
    }

    // 2.2 Go-Live trong tuần
    if (goLiveTasks.length > 0) {
      const segs: Segment[] = [
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
    } else if (poPendingTasks.length > 0) {
      const segs: Segment[] = [
        { id: "b2-po-pre", text: "• ⏳ Có ", type: "text" },
        { id: "b2-po-num", text: `${poPendingTasks.length} bài toán`, type: "bold" },
        { id: "b2-po-mid", text: " đang chờ PO xác nhận duyệt phương án: ", type: "text" },
      ]
      poPendingTasks.slice(0, 2).forEach((t, idx) => {
        segs.push({
          id: `b2-po-t-${t.request_id || idx}`,
          text: getRequestDisplayTitle(t),
          type: "task",
          task: t,
        })
        if (idx < Math.min(poPendingTasks.length, 2) - 1) {
          segs.push({ id: `b2-po-sep-${idx}`, text: ", ", type: "text" })
        }
      })
      segs.push({ id: "b2-po-dot", text: ".", type: "text" })
      block2Lines.push({ id: "b2-line-po", segments: segs })
    }

    // 2.3 Sự kiện trong tuần
    if (weekEvents.length > 0) {
      const segs: Segment[] = [
        { id: "b2-wev-pre", text: `• 🗓️ Sự kiện tuần có ${weekEvents.length} lịch làm việc: `, type: "text" },
      ]
      weekEvents.slice(0, 3).forEach((e, idx) => {
        segs.push({
          id: `b2-wev-${e.id || idx}`,
          text: e.title,
          type: "event",
          event: e,
        })
        if (idx < Math.min(weekEvents.length, 3) - 1) {
          segs.push({ id: `b2-wev-sep-${idx}`, text: ", ", type: "text" })
        } else {
          segs.push({ id: "b2-wev-dot", text: ".", type: "text" })
        }
      })
      block2Lines.push({ id: "b2-line-wev", segments: segs })
    }

    result.push({ id: "b2-week", lines: block2Lines })

    // ─── BLOCK 3: KẾ HOẠCH TIẾP THEO & CẢNH BÁO ─────────────────────────────
    const block3Header = isEndOfWeek
      ? "📋 Kế hoạch tuần sau (Cảnh báo T5 - T6):"
      : isBeginningOfWeek
      ? "📋 Định hướng đầu tuần:"
      : "📋 Tiến độ giữa tuần:"

    const block3Lines: Line[] = [
      {
        id: "b3-header",
        segments: [
          {
            id: "b3-h-txt",
            text: block3Header,
            type: "header",
          },
        ],
      },
    ]

    if (isEndOfWeek) {
      // Deadline đầu tuần sau
      if (nextWeekDeadlines.length > 0) {
        const segs: Segment[] = [
          { id: "b3-nw-pre", text: "• 📋 ", type: "text" },
          { id: "b3-nw-num", text: `Đầu tuần tới có ${nextWeekDeadlines.length} deadline cam kết: `, type: "bold" },
        ]
        nextWeekDeadlines.slice(0, 3).forEach((t, idx) => {
          segs.push({
            id: `b3-nw-t-${t.request_id || idx}`,
            text: getRequestDisplayTitle(t),
            type: "task",
            task: t,
          })
          if (idx < Math.min(nextWeekDeadlines.length, 3) - 1) {
            segs.push({ id: `b3-nw-sep-${idx}`, text: ", ", type: "text" })
          }
        })
        segs.push({
          id: "b3-nw-suf",
          text: ". Khuyến nghị hoàn tất bàn giao deliverables trước chiều Thứ 6 để tránh dồn việc.",
          type: "text",
        })
        block3Lines.push({ id: "b3-line-nw", segments: segs })
      } else {
        block3Lines.push({
          id: "b3-line-nw-free",
          segments: [
            {
              id: "b3-nw-free-txt",
              text: "• 📋 Đầu tuần tới tiến độ các bài toán tương đối thông thoáng, không ghi nhận deadline đột xuất.",
              type: "text",
            },
          ],
        })
      }

      // Sự kiện tuần tới
      if (nextWeekEvents.length > 0) {
        const segs: Segment[] = [
          { id: "b3-nwev-pre", text: `• 🗓️ Lịch tuần tới: Có ${nextWeekEvents.length} cuộc họp/workshop đã lên lịch: `, type: "text" },
        ]
        nextWeekEvents.slice(0, 2).forEach((e, idx) => {
          segs.push({
            id: `b3-nwev-${e.id || idx}`,
            text: e.title,
            type: "event",
            event: e,
          })
          if (idx < Math.min(nextWeekEvents.length, 2) - 1) {
            segs.push({ id: `b3-nwev-sep-${idx}`, text: ", ", type: "text" })
          } else {
            segs.push({ id: "b3-nwev-dot", text: ".", type: "text" })
          }
        })
        block3Lines.push({ id: "b3-line-nwev", segments: segs })
      }

      // Task chưa xếp ngày
      if (unscheduledTasks.length > 0) {
        block3Lines.push({
          id: "b3-line-unsch",
          segments: [
            {
              id: "b3-unsch-txt",
              text: `• 💡 Bạn còn ${unscheduledTasks.length} task chưa xếp ngày dự kiến. Hãy tranh thủ kéo thả hoặc xếp ngày làm việc trên Planner để chủ động lịch trình tuần mới.`,
              type: "text",
            },
          ],
        })
      }
    } else {
      block3Lines.push({
        id: "b3-line-recom",
        segments: [
          {
            id: "b3-recom-txt",
            text: `• 💡 ${recommendationText}`,
            type: "italic",
          },
        ],
      })
    }

    result.push({ id: "b3-plan", lines: block3Lines })
    return result
  }, [
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
    const list: Array<Segment & { start: number; end: number; blockId: string; lineId: string; isLineHeader: boolean }> = []
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

  // Run typewriter animation on mount and when triggerKey increments
  useEffect(() => {
    setVisibleChars(0)
    let animationFrameId: number | undefined
    let lastTick = performance.now()
    let current = 0

    // Rapid, responsive token typing rate (approx 160-200 chars/sec)
    const tick = (now: number) => {
      const delta = now - lastTick
      if (delta >= 14) {
        // Advance by 2-3 characters per frame tick
        const charsToAdd = Math.max(1, Math.round(delta / 8))
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
  }, [totalChars, triggerKey])

  // Skip typing on click
  const handleSkipTyping = () => {
    setVisibleChars(totalChars)
  }

  return (
    <div
      onClick={!isTypingComplete ? handleSkipTyping : undefined}
      className={cn("space-y-3 relative group", !isTypingComplete && "cursor-pointer")}
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
            className={cn("space-y-1", bIdx > 0 && "pt-2.5 border-t border-slate-100")}
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
                  <p>
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
                            title={`Mở chi tiết: ${getRequestDisplayTitle(seg.task)}`}
                          >
                            {displayedText}
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

      {!isTypingComplete && (
        <div className="pt-1 flex items-center justify-end">
          <button
            type="button"
            onClick={handleSkipTyping}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            <SkipForward className="h-3 w-3" />
            <span>Hiện nhanh toàn bộ</span>
          </button>
        </div>
      )}
    </div>
  )
}
