import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MemberMetrics } from "./MemberWorkloadSection"
import { UXRequest } from "../../data/mockData"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { UserAvatar } from "@/components/common/UserAvatar"
import { 
  X, 
  User, 
  Mail, 
  ShieldCheck, 
  Boxes, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  ArrowUpRight, 
  Layers, 
  Sparkles, 
  Calendar,
  Zap,
  Target
} from "lucide-react"

interface MemberDetailDrawerProps {
  member: MemberMetrics | null
  onClose: () => void
  onSelectRequest: (req: UXRequest) => void
}

export default function MemberDetailDrawer({
  member,
  onClose,
  onSelectRequest,
}: MemberDetailDrawerProps) {
  if (!member) return null

  const utilPct = Math.min(100, Math.round((member.activeTasks / member.capacityLimit) * 100))
  const isOverloaded = utilPct >= 100
  const isBusy = utilPct >= 75 && utilPct < 100

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative w-full max-w-xl bg-white shadow-2xl z-10 flex flex-col h-full overflow-hidden border-l border-slate-200"
        >
          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/60">
            <div className="flex items-center gap-3.5">
              <UserAvatar name={member.name} size="lg" className="w-14 h-14 text-lg ring-2 ring-white shadow-xs" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{member.name}</h3>
                  <Badge
                    variant={isOverloaded ? "destructive" : isBusy ? "warning" : "success"}
                    size="xs"
                    className="font-bold"
                  >
                    {isOverloaded ? "Quá tải" : isBusy ? "Đang bận" : "Sẵn sàng"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium">{member.role} • {member.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Workload & Capacity Progress */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Công suất Tải trọng định mức</span>
                <span className="font-mono font-bold text-slate-900">
                  {member.activeTasks} / {member.capacityLimit} task ({utilPct}%)
                </span>
              </div>
              <Progress
                value={utilPct}
                variant={isOverloaded ? "destructive" : isBusy ? "default" : "success"}
                size="md"
              />
              <p className="text-[11px] text-slate-500">
                {isOverloaded
                  ? "⚠️ Nhân sự đang vượt định mức chịu tải. Khuyến nghị Leader điều chuyển bớt task."
                  : "✅ Công suất trong tầm kiểm soát an toàn."}
              </p>
            </div>

            {/* 4 Performance Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-lg font-black text-purple-600 font-mono">{member.qualityScore}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Chất lượng</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-lg font-black text-blue-600 font-mono">{member.onTimeRate}%</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Đúng hạn</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className={`text-lg font-black font-mono ${member.overdueTasks > 0 ? "text-rose-600" : "text-slate-900"}`}>
                  {member.overdueTasks}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Quá hạn</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-lg font-black text-emerald-600 font-mono">{member.completedTasks}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Đã bàn giao</p>
              </div>
            </div>

            {/* Squads Assigned */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Squads & Sản phẩm phụ trách</h4>
              <div className="flex flex-wrap gap-1.5">
                {member.squads.map((sq) => (
                  <Badge key={sq} variant="secondary" size="xs" className="font-semibold">
                    {sq}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Task List Assigned to this Member */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Danh sách Yêu cầu UX Đang Phụ Trách ({member.tasks.length > 0 ? member.tasks.length : member.activeTasks})
                </h4>
              </div>

              {member.tasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  Nhân sự này hiện không có task nào đang bị chậm trễ.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {member.tasks.map((req, idx) => (
                    <div
                      key={req.request_id ? `${req.request_id}-${idx}` : `memreq-${idx}`}
                      onClick={() => {
                        onClose()
                        onSelectRequest(req)
                      }}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-2xs transition-all cursor-pointer bg-white group space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="navy" size="xs" className="font-bold">
                          {req.preferred_squad || "Chung"}
                        </Badge>
                        <span className="text-xs font-mono font-bold text-slate-900">{req.progress || 0}%</span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 group-hover:text-[#1057FB] transition-colors line-clamp-1">
                        {req.title}
                      </h5>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>Hạn: <strong className="text-slate-700">{req.expected_deadline || "Chưa có"}</strong></span>
                        <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                          Chi tiết <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold rounded-xl"
            >
              Đóng
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onClose}
              className="bg-[#1057FB] hover:bg-[#0f4fe4] text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Hoàn tất đánh giá
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
