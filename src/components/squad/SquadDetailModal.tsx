import { useEffect } from "react"
import { Squad, deriveCapacityStatus, CapacityStatus } from "../../data/mockData"

interface SquadDetailModalProps {
  squad: Squad | null
  onClose: () => void
}

const statusColors: Record<CapacityStatus, string> = {
  "Sẵn sàng": "text-emerald-600 bg-emerald-50 border-emerald-200",
  "Bình thường": "text-amber-600 bg-amber-50 border-amber-200",
  "Đang bận": "text-orange-600 bg-orange-50 border-orange-200",
  "Quá tải": "text-red-600 bg-red-50 border-red-200",
}

const barColors: Record<CapacityStatus, string> = {
  "Sẵn sàng": "bg-emerald-500",
  "Bình thường": "bg-amber-500",
  "Đang bận": "bg-orange-500",
  "Quá tải": "bg-red-500",
}

export default function SquadDetailModal({ squad, onClose }: SquadDetailModalProps) {
  useEffect(() => {
    if (!squad) return
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [squad, onClose])

  if (!squad) return null

  const status = deriveCapacityStatus(squad)
  const statusClass = statusColors[status] ?? statusColors["Sẵn sàng"]
  const barClass = barColors[status] ?? barColors["Sẵn sàng"]
  const total = squad.active_tasks + squad.queued_tasks
  const pct = Math.min(100, Math.round((total / squad.capacity_threshold) * 100))

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-lg text-slate-900">{squad.squad_name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{squad.domain}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusClass}`}>
              {status}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{squad.active_tasks}</p>
              <p className="text-xs text-slate-500 mt-1">Task đang làm</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{squad.queued_tasks}</p>
              <p className="text-xs text-slate-500 mt-1">Hàng đợi</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{pct}%</p>
              <p className="text-xs text-slate-500 mt-1">Công suất đã dùng</p>
            </div>
          </div>

          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barClass}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {squad.ux_owner && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-navy-50 border border-navy-100 flex items-center justify-center text-navy text-xs font-semibold">
                {squad.ux_owner
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{squad.ux_owner}</p>
                <p className="text-xs text-slate-500">UX Owner</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 font-mono">
                Task đang thực hiện
              </p>
              <ul className="space-y-2">
                {squad.active_task_titles.map((t, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {squad.queued_task_titles.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 font-mono">
                  Task trong hàng đợi
                </p>
                <ul className="space-y-2">
                  {squad.queued_task_titles.map((t, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
