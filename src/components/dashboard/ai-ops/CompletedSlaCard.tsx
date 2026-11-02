import React, { useMemo, useState } from "react"
import { AlertTriangle, ChevronRight, ShieldCheck, X } from "lucide-react"
import type { UXRequest } from "@/data/mockData"
import { NumberTicker } from "@/components/jolyui/number-ticker"
import { Dialog, DialogBody, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { calculateOnTimeDelivery, type OnTimeDeliveryStats } from "./kpiMetrics"

export interface CompletedSlaCardProps {
  requests?: UXRequest[]
}

export default function CompletedSlaCard({ requests = [] }: CompletedSlaCardProps) {
  const [showDelayedReport, setShowDelayedReport] = useState(false)
  const stats: OnTimeDeliveryStats = useMemo(() => {
    return calculateOnTimeDelivery(requests)
  }, [requests])

  const formatDateTime = (value?: number) => {
    if (!value) return "Chưa chuyển trạng thái"
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  }

  const formatDeadline = (value: number) =>
    new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value))

  const getPhaseLabel = (phase: "wireframe" | "ui-design" | "design") => {
    if (phase === "wireframe") return "Wireframe"
    if (phase === "ui-design") return "UI Design"
    return "Thiết kế"
  }

  return (
    <div
      data-testid="ai-ops-completed-card"
      className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col justify-between h-full min-w-0"
    >
      {/* Header on gray background */}
      <div className="flex items-center justify-between px-3 py-1.5 min-w-0">
        <span className="text-sm font-medium text-neutral-500 truncate" title="On-time Delivery">
          On-time Delivery
        </span>
        <ShieldCheck className="size-4 text-neutral-400 stroke-[1.5] shrink-0 ml-1" />
      </div>

      {/* Inner White Card */}
      <div className="rounded-xl border border-neutral-200/70 bg-white p-3 sm:p-3.5 shadow-2xs flex flex-col flex-1 justify-between min-w-0">
        {/* Metric Value: Tô màu trực tiếp vào số, bỏ badge */}
        <div className="flex items-baseline justify-between gap-x-2 gap-y-1 flex-wrap my-auto py-1 min-w-0">
          <div className="flex items-baseline gap-1 min-w-0">
            <span
              className={cn(
                "text-3xl sm:text-4xl 2xl:text-5xl font-black tracking-tight font-mono tabular-nums leading-none",
                stats.badgeVariant === "emerald" && "text-emerald-600",
                stats.badgeVariant === "amber" && "text-amber-600",
                stats.badgeVariant === "rose" && "text-rose-600"
              )}
            >
              <NumberTicker value={stats.onTimeRate} decimalPlaces={1} />
            </span>
            <span className="text-2xl 2xl:text-3xl text-neutral-400 font-light font-sans tracking-normal leading-none">%</span>
          </div>
        </div>

        {/* Footer details với khung màu nền và badge nổi bật */}
        <div className="rounded-lg bg-neutral-50/60 border border-neutral-100/80 px-2 sm:px-2.5 py-1.5 flex items-center justify-between text-xs text-neutral-500 mt-1.5 min-w-0">
          <span className="truncate mr-1 text-[11px] sm:text-xs font-normal">Cam kết gửi:</span>
          <button
            type="button"
            onClick={() => setShowDelayedReport(true)}
            className="font-semibold text-neutral-700 bg-white px-1.5 sm:px-2 py-0.5 rounded border border-neutral-200/70 text-[11px] inline-flex items-center gap-1 shadow-2xs shrink-0 transition-colors hover:border-rose-200 hover:bg-rose-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
            aria-label={`Xem báo cáo ${stats.delayedCount} task trễ`}
          >
            <span className="font-mono font-bold text-neutral-900 tabular-nums text-xs">
              {stats.onTimeCount}/{stats.totalEvaluated}
            </span>
            <span>đúng hạn</span>
            <span>·</span>
            <span
              className={cn(
                "font-mono font-bold tabular-nums text-xs",
                stats.delayedCount > 0 ? "text-rose-600" : "text-emerald-600"
              )}
            >
              {stats.delayedCount}
            </span>
            <span>trễ</span>
            <ChevronRight className="size-3 text-neutral-400" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Dialog
        open={showDelayedReport}
        onClose={() => setShowDelayedReport(false)}
        size="3xl"
      >
        <DialogHeader>
          <div className="min-w-0">
            <DialogTitle className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="size-4" aria-hidden="true" />
              </span>
              Báo cáo task trễ
            </DialogTitle>
            <DialogDescription>
              {stats.delayedCount} lần hẹn chuyển trạng thái bị trễ. Pending, PO pending và task đã dừng không được tính.
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => setShowDelayedReport(false)}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label="Đóng báo cáo"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </DialogHeader>

        <DialogBody className="p-0 space-y-0">
          {stats.delayedItems.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
              <ShieldCheck className="mb-3 size-9 text-emerald-500" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-900">Không có task trễ</p>
              <p className="mt-1 text-xs text-slate-500">Các lần hẹn đã đánh giá đều đúng hạn.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Task</th>
                    <th className="px-4 py-3">Designer</th>
                    <th className="px-4 py-3">Giai đoạn</th>
                    <th className="px-4 py-3">Ngày hẹn</th>
                    <th className="px-5 py-3">Chuyển trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.delayedItems.map((item, index) => (
                    <tr key={`${item.requestId}-${item.phase}-${item.deadlineMs}-${index}`} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <p className="max-w-[280px] truncate font-semibold text-slate-900" title={item.title}>
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{item.requestId || "Chưa có mã task"}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">{item.designer}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {getPhaseLabel(item.phase)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium tabular-nums text-slate-700">
                        {formatDeadline(item.deadlineMs)}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium tabular-nums text-rose-600">
                          {formatDateTime(item.transitionedAtMs)}
                        </p>
                        {!item.transitionedAtMs && (
                          <p className="mt-0.5 text-xs text-slate-500">Hiện tại: {item.currentStatus || "Đang thực hiện"}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogBody>
      </Dialog>
    </div>
  )
}

export { CompletedSlaCard as OnTimeDeliveryCard }
