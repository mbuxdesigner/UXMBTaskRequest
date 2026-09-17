import React, { useMemo } from "react"
import { Users } from "lucide-react"
import type { UXRequest } from "@/data/mockData"
import { NumberTicker } from "@/components/jolyui/number-ticker"
import { cn } from "@/lib/utils"
import { calculateWorkloadCapacity, type WorkloadCapacityStats } from "./kpiMetrics"

export interface InProgressWorkloadCardProps {
  requests?: UXRequest[]
  customDesigners?: string[]
  selectedProduct?: string
}

export default function InProgressWorkloadCard({
  requests = [],
  customDesigners,
  selectedProduct,
}: InProgressWorkloadCardProps) {
  const stats: WorkloadCapacityStats = useMemo(() => {
    return calculateWorkloadCapacity(requests, customDesigners, selectedProduct)
  }, [requests, customDesigners, selectedProduct])

  return (
    <div
      data-testid="ai-ops-in-progress-card"
      className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col justify-between h-full min-w-0"
    >
      {/* Header on gray background */}
      <div className="flex items-center justify-between px-3 py-1.5 min-w-0">
        <span className="text-sm font-medium text-neutral-500 truncate" title="Workload / Capacity">
          Workload / Capacity
        </span>
        <Users className="size-4 text-neutral-400 stroke-[1.5] shrink-0 ml-1" />
      </div>

      {/* Inner White Card */}
      <div className="rounded-xl border border-neutral-200/70 bg-white p-3 sm:p-3.5 shadow-2xs flex flex-col flex-1 justify-between min-w-0">
        {/* Metric Value: Màu sắc trực tiếp vào số, không dùng badge */}
        <div className="flex items-baseline justify-between gap-x-2 gap-y-1 flex-wrap my-auto py-1 min-w-0">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span
              className={cn(
                "text-3xl sm:text-4xl 2xl:text-5xl font-black tracking-tight font-mono tabular-nums leading-none",
                stats.badgeVariant === "emerald" && "text-emerald-600",
                stats.badgeVariant === "amber" && "text-amber-600",
                stats.badgeVariant === "rose" && "text-rose-600"
              )}
            >
              <NumberTicker value={stats.workloadRatio} decimalPlaces={1} />
            </span>
            <span className="font-medium text-neutral-400 text-xs sm:text-sm">task/designer</span>
          </div>
        </div>

        {/* Footer details: Thông số Đang phụ trách minh bạch theo sản phẩm */}
        <div className="rounded-lg bg-neutral-50/60 border border-neutral-100/80 px-2 sm:px-2.5 py-1.5 flex items-center justify-between text-xs text-neutral-500 mt-1.5 min-w-0">
          <span className="truncate mr-1 text-[11px] sm:text-xs font-normal">Đang phụ trách:</span>
          <span className="font-semibold text-neutral-700 bg-white px-1.5 sm:px-2 py-0.5 rounded border border-neutral-200/70 text-[11px] inline-flex items-center gap-1 shadow-2xs shrink-0">
            <span className="font-mono font-bold text-neutral-900 tabular-nums text-xs">
              <NumberTicker value={stats.inProgressCount} />
            </span>
            <span>task</span>
            <span>·</span>
            <span className="font-mono font-bold text-neutral-900 tabular-nums text-xs">
              <NumberTicker value={stats.totalDesigners} />
            </span>
            <span>designer</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export { InProgressWorkloadCard as WorkloadCapacityCard }
