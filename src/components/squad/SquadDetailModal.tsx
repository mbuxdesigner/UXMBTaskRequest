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
import { IconTile } from "@/components/reui/icon-tile"
import { X, CheckCircle2, Clock, UserCheck, Activity, Layers, ArrowUpRight } from "lucide-react"
import { getCapacityStatusConfig } from "@/config/statusConfig"

interface SquadDetailModalProps {
  squad: Squad | null
  onClose: () => void
}

export default function SquadDetailModal({ squad, onClose }: SquadDetailModalProps) {
  if (!squad) return null

  const status = deriveCapacityStatus(squad)
  const statusCfg = getCapacityStatusConfig(status)
  const total = squad.active_tasks + squad.queued_tasks
  const pct = Math.min(100, Math.round((total / squad.capacity_threshold) * 100))

  return (
    <Dialog open={Boolean(squad)} onClose={onClose} size="lg">
      <DialogHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <IconTile size="default" variant="navy">
            <Layers className="w-5 h-5 text-[#1B3A6B]" />
          </IconTile>
          <div>
            <div className="flex items-center gap-2">
              <DialogTitle>{squad.squad_name}</DialogTitle>
              <Badge
                variant={statusCfg.variant}
                dot
                dotColor={statusCfg.dotColor}
                size="xs"
                className="font-bold"
              >
                {status}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              {squad.domain} — Chi tiết tải trọng & Danh sách bài toán UX
            </DialogDescription>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </DialogHeader>

      <DialogBody className="space-y-6 pt-4">
        {/* Metric KPI cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{squad.active_tasks}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Task đang làm</p>
          </div>
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{squad.queued_tasks}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Hàng đợi</p>
          </div>
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#1B3A6B]">{pct}%</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Tải định mức</p>
          </div>
        </div>

        {/* Workload bar */}
        <div className="space-y-2 p-4 rounded-2xl bg-[#1B3A6B]/5 border border-[#1B3A6B]/15">
          <div className="flex justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#1B3A6B]" />
              Tiến độ công suất định mức ({total} / {squad.capacity_threshold} điểm task)
            </span>
            <span className="font-bold text-[#1B3A6B]">{pct}%</span>
          </div>
          <Progress
            value={pct}
            variant={
              status === "Sẵn sàng"
                ? "success"
                : status === "Quá tải"
                ? "destructive"
                : "default"
            }
            size="md"
          />
        </div>

        {/* Lead & Designer Assignment */}
        {squad.ux_owner && (
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1B3A6B] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                <UserCheck className="w-4.5 h-4.5 text-[#0D9B97]" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{squad.ux_owner}</p>
                <p className="text-xs text-slate-500">UX Design Lead / Chuyên trách chính</p>
              </div>
            </div>
            <Badge variant="navy" size="xs">Chính thức</Badge>
          </div>
        )}

        {/* Task lists */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Yêu cầu đang thiết kế ({squad.active_task_titles.length})
            </p>
            {squad.active_task_titles.length > 0 ? (
              <ul className="space-y-2">
                {squad.active_task_titles.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2.5 text-xs font-medium text-slate-800 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="flex-1 truncate">{t}</span>
                    <Badge variant="success" size="xs">Đang làm</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                Squad hiện sẵn sàng nhận thêm yêu cầu mới.
              </p>
            )}
          </div>

          {squad.queued_task_titles.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                Hàng đợi chờ phân bổ ({squad.queued_task_titles.length})
              </p>
              <ul className="space-y-2">
                {squad.queued_task_titles.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2.5 text-xs font-medium text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/70"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="flex-1 truncate">{t}</span>
                    <Badge variant="warning" size="xs">Chờ tiếp nhận</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogBody>

      <DialogFooter className="border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" onClick={onClose} className="font-semibold">
          Đóng cửa sổ
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
export { SquadDetailModal }
