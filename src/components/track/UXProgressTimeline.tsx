import { Phase } from "../../data/mockData"
import { Badge } from "@/components/ui/badge"
import {
  Timeline,
  TimelineItem,
  TimelineIcon,
  TimelineContent,
  TimelineHeader,
  TimelineTitle,
  TimelineTime,
  TimelineDescription,
} from "@/components/reui/timeline"
import { Check, Clock, CircleDot, AlertCircle } from "lucide-react"

interface UXProgressTimelineProps {
  phases: Phase[]
  interactive?: boolean
}

export default function UXProgressTimeline({ phases }: UXProgressTimelineProps) {
  return (
    <Timeline className="py-2">
      {phases.map((phase) => {
        const isCompleted = phase.status === "completed"
        const isInProgress = phase.status === "in_progress"
        const isPending = phase.status === "pending"

        const timelineStatus = isCompleted
          ? "completed"
          : isInProgress
          ? "current"
          : "pending"

        return (
          <TimelineItem key={phase.name} status={timelineStatus}>
            <TimelineIcon status={timelineStatus}>
              {isCompleted ? (
                <Check className="w-4 h-4 stroke-[2.5]" />
              ) : isInProgress ? (
                <Clock className="w-4 h-4 animate-spin stroke-[2]" />
              ) : (
                <CircleDot className="w-3.5 h-3.5 text-slate-400" />
              )}
            </TimelineIcon>

            <TimelineContent className="bg-slate-50/70 hover:bg-slate-50 transition-colors p-3.5 rounded-xl border border-slate-200/60 mb-2">
              <TimelineHeader>
                <div className="flex items-center gap-2">
                  <TimelineTitle
                    className={
                      isInProgress
                        ? "text-[#1B3A6B] font-bold"
                        : isCompleted
                        ? "text-slate-900"
                        : "text-slate-500"
                    }
                  >
                    {phase.name}
                  </TimelineTitle>
                </div>
                <Badge
                  variant={
                    isCompleted
                      ? "success"
                      : isInProgress
                      ? "navy"
                      : "secondary"
                  }
                  size="xs"
                  dot={isInProgress}
                  dotColor="bg-[#1B3A6B]"
                  dotPulse={isInProgress}
                >
                  {isCompleted
                    ? "Đã hoàn thành"
                    : isInProgress
                    ? "Đang thực hiện"
                    : "Chờ xử lý"}
                </Badge>
              </TimelineHeader>

              {phase.assignee && (
                <TimelineDescription className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Phụ trách: <strong className="text-slate-700">{phase.assignee}</strong></span>
                  {phase.completionDate && (
                    <TimelineTime>{phase.completionDate}</TimelineTime>
                  )}
                </TimelineDescription>
              )}
            </TimelineContent>
          </TimelineItem>
        )
      })}
    </Timeline>
  )
}
export { UXProgressTimeline }
