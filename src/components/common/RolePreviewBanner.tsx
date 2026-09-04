import React, { useState } from "react"
import { Eye, ShieldAlert, LogOut, ChevronDown, ChevronUp } from "lucide-react"
import { UserRole } from "../../data/mockData"
import { UserSession, startRolePreview, stopRolePreview } from "../../services/otpAuthService"
import { toast } from "../ui/toast"

interface RolePreviewBannerProps {
  session: UserSession | null
}

const PREVIEWABLE_ROLES: Array<{ role: UserRole; label: string }> = [
  { role: "Design Owner", label: "Design Owner" },
  { role: "Designer", label: "Designer" },
  { role: "PO", label: "PO (Product Owner)" },
]

export const RolePreviewBanner: React.FC<RolePreviewBannerProps> = ({ session }) => {
  const [isMinimized, setIsMinimized] = useState(false)

  if (!session?.isImpersonating) {
    return null
  }

  const currentRole = session.role
  const originalRole = session.originalRole || "Admin"

  const handleSwitchRole = (role: UserRole) => {
    if (role === currentRole) return
    startRolePreview(role)
    toast.info(`Chuyển chế độ xem: ${role}`, `Giao diện đang hiển thị theo quyền hạn của ${role}`)
  }

  const handleExitPreview = () => {
    stopRolePreview()
    toast.success("Đã thoát chế độ xem trước", `Trở lại quyền hạn quản trị ${originalRole}`)
  }

  // Chế độ thu nhỏ (Minimized) - Chỉ là 1 badge nhỏ ở góc để không che khuất màn hình test
  if (isMinimized) {
    return (
      <div className="fixed top-3 right-4 sm:right-6 z-[999]">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/95 text-white border border-amber-500/40 shadow-xl backdrop-blur-md hover:bg-slate-900 transition-all text-xs font-semibold cursor-pointer group hover:border-amber-400"
          title="Bấm để mở rộng bảng điều khiển xem trước"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>Xem trước: <strong className="text-amber-300">{currentRole}</strong></span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
        </button>
      </div>
    )
  }

  // Chế độ đầy đủ (Expanded)
  return (
    <div className="fixed top-3 right-4 sm:right-6 z-[999] max-w-[calc(100vw-32px)]">
      <div className="bg-slate-900/95 text-white border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-3 sm:p-3.5 flex flex-col gap-2.5 min-w-[280px] sm:min-w-[340px] animate-in fade-in-50 slide-in-from-top-2 duration-200">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold tracking-tight text-slate-200">
                Đang xem với vai trò:
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black">
                {currentRole}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Thu nhỏ để kiểm thử toàn màn hình"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>

        {/* Role Switcher Pills */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Chuyển nhanh vai trò kiểm thử:
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {PREVIEWABLE_ROLES.map(({ role, label }) => {
              const isActive = currentRole === role
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleSwitchRole(role)}
                  className={`px-2 py-1.5 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer truncate ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md font-bold ring-2 ring-blue-400/50"
                      : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/50"
                  }`}
                  title={`Xem dưới dạng ${label}`}
                >
                  {role}
                </button>
              )
            })}
          </div>
        </div>

        {/* Exit Impersonation Button */}
        <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-400 truncate">
            Gốc: <strong className="text-slate-300">{originalRole}</strong>
          </span>
          <button
            type="button"
            onClick={handleExitPreview}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer hover:shadow-amber-500/20 active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Thoát xem trước</span>
          </button>
        </div>
      </div>
    </div>
  )
}
