import React from "react"
import ReUIGanttChart from "@/components/reui/gantt-chart"
import type { UXRequest } from "@/data/mockData"
import { CalendarRange, SlidersHorizontal, Download } from "lucide-react"

interface TrackTaskGanttFrameProps {
  requests: UXRequest[]
  onSelectRequest?: (req: UXRequest) => void
}

export const DEFAULT_GANTT_TASKS: UXRequest[] = []

export default function TrackTaskGanttFrame({
  requests = [],
  onSelectRequest,
}: TrackTaskGanttFrameProps) {
  const displayRequests = Array.isArray(requests) ? requests : []

  return (
    <div
      data-testid="ai-ops-track-task-gantt"
      className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col w-full min-w-0"
    >
      {/* Header on gray background */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 py-2.5">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
            <CalendarRange className="size-4 text-neutral-700" />
            <span>Track Task — Lộ Trình Gantt Toàn Diện</span>
          </h3>
          <p className="text-xs text-neutral-400 font-normal mt-0.5">
            Theo dõi tiến trình từ ngày tạo đến hạn deadline dự kiến ({displayRequests.length} bài toán)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Today Synced</span>
          </span>
        </div>
      </div>

      {/* Inner White Card */}
      <div className="rounded-xl border border-neutral-200/70 bg-white p-4 shadow-2xs overflow-x-auto">
        {displayRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-10 rounded-full bg-neutral-100 flex items-center justify-center mb-2">
              <CalendarRange className="size-5 text-neutral-400" />
            </div>
            <p className="text-xs font-medium text-neutral-700">Chưa có bài toán trong danh sách</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Các bài toán theo sản phẩm & squad sẽ hiển thị trên biểu đồ Gantt tại đây.
            </p>
          </div>
        ) : (
          <ReUIGanttChart
            requests={displayRequests}
            onSelectRequest={onSelectRequest}
          />
        )}
      </div>
    </div>
  )
}
