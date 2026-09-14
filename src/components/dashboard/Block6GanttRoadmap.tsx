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
import ReUIGanttChart from "@/components/reui/gantt-chart"
import type { UXRequest } from "@/data/mockData"
import { cn } from "@/lib/utils"
import {
  CalendarRange,
  MousePointerClick,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

/**
 * Props for Block6GanttRoadmap component.
 */
export interface Block6GanttRoadmapProps {
  /**
   * Filtered or full list of UX requests (typically filteredRequests matching selectedProduct).
   */
  requests: UXRequest[]
  /**
   * Callback fired when clicking any task row or capsule bar, opening the RequestDetail drawer.
   */
  onSelectRequest?: (req: UXRequest) => void
  /**
   * Optional custom className override for the outer Frame container.
   */
  className?: string
  /**
   * Optional currently active product filter name (e.g. "ALL", "Lending", "TransferD")
   * for contextual badges and empty state messages.
   */
  selectedProduct?: string
}

/**
 * Safe date parser supporting YYYY-MM-DD, DD/MM/YYYY, and ISO date strings.
 */
function parseDateSafe(dateStr?: string | null): Date | null {
  if (!dateStr) return null
  const trimmed = dateStr.trim()
  const parts = trimmed.split(/[\/\-]/)
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
      return isNaN(d.getTime()) ? null : d
    }
    const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10))
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(trimmed)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Formats a Date object to DD/MM/YYYY.
 */
function formatDateSafe(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Block 6: Lộ trình Gantt Toàn diện (Full-width ReUI Gantt Roadmap)
 *
 * Wraps ReUIGanttChart in a full-width ReUI Frame with header metrics, Today synchronization
 * indicators, interactive task click-to-drawer drilldown, responsive horizontal scrolling,
 * and zero-task resilient empty state.
 */
export function Block6GanttRoadmap({
  requests,
  onSelectRequest,
  className,
  selectedProduct,
}: Block6GanttRoadmapProps) {
  // Today reference
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const todayFormatted = useMemo(() => formatDateSafe(today), [today])

  // Roadmap Metrics & Temporal Span
  const { totalCount, overdueCount, temporalSpanLabel } = useMemo(() => {
    const total = requests.length
    let overdue = 0
    let minDateMs = Infinity
    let maxDateMs = -Infinity

    requests.forEach((req) => {
      const isDone =
        req.status === "Hoàn thành" ||
        req.status === "Hoành thành" ||
        req.status === "Done" ||
        (req.progress ?? 0) >= 100

      const dueDate = parseDateSafe(req.release_date || req.expected_deadline)
      const startDate = parseDateSafe(req.submitted_at)

      if (dueDate) {
        const dMs = dueDate.getTime()
        if (dMs > maxDateMs) maxDateMs = dMs
        if (!isDone && dMs < today.getTime()) {
          overdue++
        }
      }

      if (startDate) {
        const sMs = startDate.getTime()
        if (sMs < minDateMs) minDateMs = sMs
      }
    })

    let spanLabel: string | null = null
    if (minDateMs !== Infinity && maxDateMs !== -Infinity) {
      spanLabel = `${formatDateSafe(new Date(minDateMs))} — ${formatDateSafe(new Date(maxDateMs))}`
    }

    return {
      totalCount: total,
      overdueCount: overdue,
      temporalSpanLabel: spanLabel,
    }
  }, [requests, today])

  return (
    <Frame
      padding="none"
      className={cn(
        "w-full bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden transition-all",
        className
      )}
    >
      {/* =====================================================================
          FRAME HEADER: Title, Description, Total Badge & Today Sync Indicator
          ===================================================================== */}
      <FrameHeader className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-0">
        <div className="space-y-1">
          <FrameTitle className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span
              className="p-1.5 rounded-lg bg-blue-50 text-[#1057FB] border border-blue-200/80 shadow-2xs"
              aria-hidden="true"
            >
              <CalendarRange className="w-4 h-4" />
            </span>
            <span>Bảng tiến độ tổng thể (Gantt)</span>
          </FrameTitle>
          <FrameDescription className="text-xs text-slate-500 font-normal mt-0.5">
            Lộ trình từ ngày bắt đầu đến deadline của tất cả các bài toán
          </FrameDescription>
        </div>

        <FrameActions className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Contextual Product Badge */}
          {selectedProduct && selectedProduct !== "ALL" && (
            <Badge variant="info" size="sm" className="text-xs font-semibold">
              <span>Sản phẩm:</span>
              <span className="ml-1 font-bold">{selectedProduct}</span>
            </Badge>
          )}

          {/* Total Tasks Count Badge */}
          <Badge
            variant="outline"
            size="sm"
            className="font-mono text-xs font-medium text-slate-700 bg-slate-50/80 border-slate-200"
          >
            <span className="font-bold text-slate-900">{totalCount}</span>
            <span className="text-slate-500 ml-1">tasks</span>
          </Badge>

          {/* Synchronized Today Indicator Badge */}
          <Badge
            variant="secondary"
            size="sm"
            dot
            dotColor="bg-rose-500"
            dotPulse
            className="text-xs text-slate-700 font-medium"
            title="Mốc Hôm nay trên trục thời gian"
          >
            <span>Hôm nay:</span>
            <span className="font-mono font-semibold text-rose-600 ml-1">
              {todayFormatted}
            </span>
          </Badge>
        </FrameActions>
      </FrameHeader>

      {/* =====================================================================
          FRAME BODY: ReUIGanttChart or Zero-Task Empty State
          ===================================================================== */}
      <FrameBody className="p-0 space-y-0 relative w-full overflow-hidden">
        {requests.length === 0 ? (
          <div className="py-16 px-6 flex flex-col items-center justify-center text-center bg-slate-50/40">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1057FB] mb-3 shadow-2xs">
              <CalendarRange className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800 mb-1">
              Không có bài toán nào trong phạm vi lọc
            </h4>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              {selectedProduct && selectedProduct !== "ALL"
                ? `Không tìm thấy bài toán nào thuộc sản phẩm "${selectedProduct}". Vui lòng chọn "Tất cả" trên thanh bộ lọc sản phẩm để xem đầy đủ lộ trình.`
                : "Hiện tại chưa có bài toán nào trong hệ thống hoặc toàn bộ bài toán đã hoàn tất lưu trữ."}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <ReUIGanttChart
              requests={requests}
              onSelectRequest={onSelectRequest}
              borderless
            />
          </div>
        )}
      </FrameBody>

      {/* =====================================================================
          FRAME FOOTER: Interaction Hints & Roadmap Scope Summary
          ===================================================================== */}
      <FrameFooter className="px-5 sm:px-6 py-3 border-t border-slate-100 mt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
        <div className="flex items-center gap-3.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
            <MousePointerClick className="w-3.5 h-3.5 text-[#1057FB]" />
            <span>Nhấp vào bất kỳ thanh bài toán nào để mở Drawer chi tiết đề bài</span>
          </span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Kéo thanh phân cách (splitter) để tùy chỉnh độ rộng danh sách</span>
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-[11px]">
          {overdueCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/80">
              <AlertCircle className="w-3 h-3" />
              <span>{overdueCount} quá hạn</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>100% đúng hạn cam kết</span>
            </span>
          )}
          {temporalSpanLabel && (
            <span className="text-slate-400 font-normal">
              Phạm vi: <strong className="text-slate-600 font-medium font-mono">{temporalSpanLabel}</strong>
            </span>
          )}
        </div>
      </FrameFooter>
    </Frame>
  )
}

export default Block6GanttRoadmap
