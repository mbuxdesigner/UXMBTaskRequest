import { Squad, deriveCapacityStatus } from "../../data/mockData"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { X, CheckCircle2, Clock, UserCheck } from "lucide-react"

interface SquadDetailModalProps {
  squad: Squad | null
  onClose: () => void
}

const statusBadgeVariant = {
  "Sẵn sàng": "success",
  "Bình thường": "warning",
  "Đang bận": "warning",
  "Quá tải": "destructive",
} as const

export default function SquadDetailModal({ squad, onClose }: SquadDetailModalProps) {
  if (!squad) return null

  const status = deriveCapacityStatus(squad)
  const total = squad.active_tasks + squad.queued_tasks
  const pct = Math.min(100, Math.round((total / squad.capacity_threshold) * 100))

  return (
    <Dialog open={Boolean(squad)} onClose={onClose} size="lg">
      <DialogHeader>
        <div>
          <DialogTitle>{squad.squad_name}</DialogTitle>
          <DialogDescription>{squad.domain} — Chi tiết năng lực vận hành</DialogDescription>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusBadgeVariant[status] || "default"} dot>
            {status}
          </Badge>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </DialogHeader>

      <DialogBody className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{squad.active_tasks}</p>
            <p className="text-xs text-slate-500 mt-1">Task đang làm</p>
          </div>
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{squad.queued_tasks}</p>
            <p className="text-xs text-slate-500 mt-1">Hàng đợi</p>
          </div>
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{pct}%</p>
            <p className="text-xs text-slate-500 mt-1">Công suất đã dùng</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Tiến độ tải công việc</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <Progress value={pct} variant={statusBadgeVariant[status] || "default"} size="md" />
        </div>

        {squad.ux_owner && (
          <div className="flex items-center gap-3 p-3.5 bg-navy-50/60 border border-navy-100 rounded-xl">
            <div className="w-9 h-9 rounded-xl bg-navy text-white flex items-center justify-center text-xs font-bold shadow-2xs">
              <UserCheck className="w-4 h-4 text-teal" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{squad.ux_owner}</p>
              <p className="text-xs text-slate-500">UX Lead phụ trách trực tiếp</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Task đang thực hiện ({squad.active_task_titles.length})
            </p>
            <ul className="space-y-2">
              {squad.active_task_titles.map((t, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {squad.queued_task_titles.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Task trong hàng đợi ({squad.queued_task_titles.length})
              </p>
              <ul className="space-y-2">
                {squad.queued_task_titles.map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogBody>

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          Đóng
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
