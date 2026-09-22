import React, { useMemo } from "react"
import { Users } from "lucide-react"
import type { UXRequest } from "@/data/mockData"
import { NumberTicker } from "@/components/jolyui/number-ticker"
import { cn } from "@/lib/utils"
import {
  calculateWorkloadCapacity,
  extractTaskDesigners,
  isInProgressTask,
  isValidTask,
  type WorkloadCapacityStats,
} from "./kpiMetrics"
import { CAvatar21, type CAvatar21Member } from "@/components/reui/c-avatar-21"
import { getDesignerAvatar } from "@/components/common/UserAvatar"

export interface InProgressWorkloadCardProps {
  requests?: UXRequest[]
  customDesigners?: string[]
  selectedProduct?: string
}

/**
 * Chỉ lấy danh sách các designer ĐANG THỰC HIỆN TASK (in-progress),
 * KHÔNG fill toàn bộ danh bạ nhân sự trong hệ thống.
 */
function getActiveTaskDesigners(requests: UXRequest[] = []): CAvatar21Member[] {
  const inProgressTasks = requests.filter(isValidTask).filter(isInProgressTask)
  const memberMap = new Map<string, CAvatar21Member>()

  inProgressTasks.forEach((r) => {
    const designerNames = extractTaskDesigners(r)
    designerNames.forEach((dName) => {
      const clean = dName.trim()
      if (!clean) return
      const lower = clean.toLowerCase()
      if (!memberMap.has(lower)) {
        memberMap.set(lower, {
          id: `active-des-${lower}`,
          name: clean,
          role: "Designer",
          avatarUrl: getDesignerAvatar(clean),
        })
      }
    })
  })

  return Array.from(memberMap.values())
}

export default function InProgressWorkloadCard({
  requests = [],
  customDesigners,
  selectedProduct,
}: InProgressWorkloadCardProps) {
  const stats: WorkloadCapacityStats = useMemo(() => {
    return calculateWorkloadCapacity(requests, customDesigners, selectedProduct)
  }, [requests, customDesigners, selectedProduct])

  // Chỉ lấy các designer đang thực hiện task (không fill toàn bộ designer)
  const activeDesigners = useMemo(() => {
    return getActiveTaskDesigners(requests)
  }, [requests])

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

        {/* Footer: ReUI c-avatar-21 component (chỉ hiển thị các designer đang thực hiện task) */}
        <div className="rounded-lg bg-neutral-50/70 border border-neutral-100/90 px-2.5 py-1.5 flex items-center justify-between text-xs text-neutral-500 mt-2 min-w-0">
          <CAvatar21
            members={activeDesigners}
            maxVisible={3}
            totalCount={activeDesigners.length}
            taskCount={stats.inProgressCount}
            textPrefix={
              activeDesigners.length > 0
                ? `${activeDesigners.length} designer thực hiện`
                : "Chưa gán designer cho"
            }
            textSuffix="task"
            size="sm"
          />
        </div>
      </div>
    </div>
  )
}

export { InProgressWorkloadCard as WorkloadCapacityCard }
