import React, { useMemo } from "react"
import { ShieldCheck, TrendingUp } from "lucide-react"
import type { UXRequest } from "@/data/mockData"
import { NumberTicker } from "@/components/jolyui/number-ticker"

interface CompletedSlaCardProps {
  requests?: UXRequest[]
}

export default function CompletedSlaCard({ requests = [] }: CompletedSlaCardProps) {
  const stats = useMemo(() => {
    let completed = 0

    requests.forEach((r) => {
      const s = (r.status || "").toLowerCase()
      if (s.includes("hoàn thành") || s.includes("bàn giao") || s.includes("release") || s.includes("nghiệm thu")) {
        completed++
      }
    })

    return { completed, slaRate: "96.4%", firstTimeRight: "94.2%" }
  }, [requests])

  return (
    <div
      data-testid="ai-ops-completed-card"
      className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col justify-between h-full min-w-0"
    >
      {/* Header on gray background */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-sm font-medium text-neutral-500">Đã hoàn thành</span>
        <ShieldCheck className="size-4 text-neutral-400 stroke-[1.5]" />
      </div>

      {/* Inner White Card */}
      <div className="rounded-xl border border-neutral-200/70 bg-white p-3 sm:p-3.5 shadow-2xs flex flex-col flex-1 justify-between">
        {/* Metric Value & Badge */}
        <div className="flex items-baseline gap-2.5 my-auto py-1">
          <span className="text-5xl font-black tracking-tight text-neutral-900 font-mono tabular-nums leading-none">
            <NumberTicker value={stats.completed} />
          </span>
          <span className="font-medium text-neutral-400 text-sm sm:text-base">tasks</span>
          {stats.completed > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200/70 ml-1 self-center">
              <TrendingUp className="size-3.5" />
              <span>SLA <strong className="font-mono font-bold tabular-nums"><NumberTicker value={96.4} decimalPlaces={1} />%</strong></span>
            </span>
          )}
        </div>

        {/* Footer details với khung màu nền và badge nổi bật */}
        <div className="rounded-lg bg-neutral-50/60 border border-neutral-100/80 px-2.5 py-1.5 flex items-center justify-between text-xs text-neutral-500 mt-1.5">
          <span>Lead time trung bình:</span>
          <span className="font-semibold text-neutral-800 bg-white px-2 py-0.5 rounded border border-neutral-200/70 text-[11px] inline-flex items-center gap-1 shadow-2xs">
            <span className="font-mono font-bold text-neutral-900 tabular-nums text-xs">
              <NumberTicker value={3.8} decimalPlaces={1} />
            </span>
            <span>ngày/task</span>
          </span>
        </div>
      </div>
    </div>
  )
}
