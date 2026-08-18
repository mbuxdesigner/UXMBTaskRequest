import { Phase } from "../../data/mockData"
import { Badge } from "@/components/ui/badge"
import { Check, Clock, Circle } from "lucide-react"

interface UXProgressTimelineProps {
  phases: Phase[]
}

export default function UXProgressTimeline({ phases }: UXProgressTimelineProps) {
  return (
    <div className="relative space-y-1">
      {phases.map((phase, i) => {
        const isLast = i === phases.length - 1
        const isCompleted = phase.status === "completed"
        const isInProgress = phase.status === "in_progress"

        return (
          <div key={phase.name} className="flex gap-3.5 group">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  isCompleted
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : isInProgress
                      ? "bg-navy text-white ring-4 ring-navy/15 shadow-2xs"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : isInProgress ? (
                  <Clock className="w-3.5 h-3.5 stroke-[2.5] animate-spin" />
                ) : (
                  <Circle className="w-2 h-2 fill-slate-300 text-slate-300" />
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 my-1 min-h-[22px] rounded-full transition-colors ${
                    isCompleted ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                />
              )}
            </div>

            <div className="pb-5 pt-0.5 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-xs font-medium ${
                    isInProgress
                      ? "text-slate-900 font-bold"
                      : isCompleted
                        ? "text-slate-700"
                        : "text-slate-400"
                  }`}
                >
                  {phase.name}
                </p>
                <Badge
                  variant={
                    isCompleted
                      ? "success"
                      : isInProgress
                        ? "navy"
                        : "secondary"
                  }
                  size="sm"
                >
                  {isCompleted
                    ? "Hoàn thành"
                    : isInProgress
                      ? "Đang làm"
                      : "Chưa tới"}
                </Badge>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
