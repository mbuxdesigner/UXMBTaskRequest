import React, { useMemo } from "react"
import { Brain, TrendingUp } from "lucide-react"
import type { UXRequest } from "@/data/mockData"

interface InProgressWorkloadCardProps {
  requests?: UXRequest[]
}

export default function InProgressWorkloadCard({ requests = [] }: InProgressWorkloadCardProps) {
  const stats = useMemo(() => {
    let inProgress = 0
    let totalProgressSum = 0

    requests.forEach((r) => {
      const s = (r.status || "").toLowerCase()
      if (s.includes("đang thực hiện") || s.includes("tiến hành") || s.includes("processing") || s.includes("thiết kế")) {
        inProgress++
        totalProgressSum += typeof r.progress === "number" ? r.progress : 50
      }
    })

    const avgProgress = inProgress > 0 ? Math.round(totalProgressSum / inProgress) : 0
    return { inProgress, avgProgress }
  }, [requests])

  return (
    <div
      data-testid="ai-ops-in-progress-card"
      className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col justify-between h-full min-w-0"
    >
      {/* Header on gray background */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-sm font-medium text-neutral-500">Đang thực hiện</span>
        <Brain className="size-4 text-neutral-400 stroke-[1.5]" />
      </div>

      {/* Inner White Card */}
      <div className="rounded-xl border border-neutral-200/70 bg-white p-4 shadow-2xs flex flex-col flex-1 justify-between">
        {/* Header content: Value & Badge + Description */}
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl font-bold tracking-tight text-neutral-900">
              {stats.inProgress}
              <span className="font-normal text-neutral-400 text-lg ml-1">tasks</span>
            </span>
            {stats.inProgress > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200/70">
                <TrendingUp className="size-3.5" />
                <span>Đang thực hiện</span>
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 font-normal mt-1.5">
            Phân bổ 5 khâu UX chính theo tiến độ.
          </p>
        </div>

        {/* Footer details với khung màu nền và badge nổi bật */}
        <div className="rounded-lg bg-neutral-50/60 border border-neutral-100/80 p-2 flex items-center justify-between text-xs text-neutral-500 mt-3">
          <span>Tải trọng bình quân:</span>
          <span className="font-semibold text-neutral-800 bg-white px-2 py-0.5 rounded border border-neutral-200/70 text-[11px]">
            2.4 task/designer
          </span>
        </div>
      </div>
    </div>
  )
}
