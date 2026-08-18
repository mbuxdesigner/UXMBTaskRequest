import { Phase } from "../../data/mockData"

interface UXProgressTimelineProps {
  phases: Phase[]
}

const statusConfig = {
  completed: {
    ring: "bg-navy border-navy",
    icon: (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: "text-slate-500",
    connector: "bg-navy",
    badge: "text-emerald-600 bg-emerald-50",
    badgeText: "Hoàn thành",
  },
  in_progress: {
    ring: "bg-white border-navy",
    icon: <div className="w-2 h-2 rounded-full bg-navy" />,
    label: "text-slate-900 font-medium",
    connector: "bg-slate-200",
    badge: "text-navy bg-navy-50",
    badgeText: "Đang thực hiện",
  },
  upcoming: {
    ring: "bg-white border-slate-300",
    icon: null,
    label: "text-slate-400",
    connector: "bg-slate-100",
    badge: "text-slate-400 bg-slate-50",
    badgeText: "Chưa bắt đầu",
  },
}

export default function UXProgressTimeline({ phases }: UXProgressTimelineProps) {
  return (
    <div className="relative">
      {phases.map((phase, i) => {
        const cfg = statusConfig[phase.status]
        const isLast = i === phases.length - 1
        return (
          <div key={phase.name} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${cfg.ring}`}
              >
                {cfg.icon}
              </div>
              {!isLast && <div className={`w-0.5 flex-1 my-1 min-h-[24px] ${cfg.connector}`} />}
            </div>
            <div className="pb-6">
              <div className="flex items-center gap-2 mt-0.5">
                <p className={`text-sm ${cfg.label}`}>{phase.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                  {cfg.badgeText}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
