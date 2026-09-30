import React from "react"
import { motion } from "framer-motion"
import { Clock, LogIn, ShieldAlert } from "lucide-react"

interface SessionExpiredModalProps {
  message?: string
  onLoginAgain: () => void
}

export default function SessionExpiredModal({
  message,
  onLoginAgain,
}: SessionExpiredModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none"
    >
      {/* Backdrop overlay làm mờ toàn bộ giao diện phía sau (frosted glass blur) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
      />

      {/* Card Popup trung tâm */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 14 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className="relative z-10 w-full max-w-[420px] rounded-3xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] p-6 sm:p-8 text-center flex flex-col items-center"
      >
        {/* Icon cảnh báo an toàn phiên làm việc */}
        <div className="relative mb-4">
          <div className="size-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shadow-xs">
            <Clock className="size-8 stroke-[2.2]" />
          </div>
          <span className="absolute -top-1 -right-1 flex size-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-4 bg-amber-500 items-center justify-center">
              <ShieldAlert className="size-2.5 text-white" />
            </span>
          </span>
        </div>

        {/* Tiêu đề */}
        <h3
          id="session-expired-title"
          className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
        >
          Phiên làm việc đã hết hạn
        </h3>

        {/* Nội dung thông báo */}
        <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed font-normal">
          {message ||
            "Phiên đăng nhập của bạn đã hết hạn để đảm bảo an toàn dữ liệu. Vui lòng bấm đăng nhập lại để tiếp tục làm việc."}
        </p>

        {/* Gợi ý bảo mật */}
        <div className="mt-4 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/70 text-[11.5px] text-slate-500 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
          <span>Hệ thống bảo toàn dữ liệu bài toán và tiến độ của bạn.</span>
        </div>

        {/* Nút Đăng nhập lại */}
        <button
          type="button"
          onClick={onLoginAgain}
          autoFocus
          className="w-full mt-6 py-3 px-5 rounded-2xl bg-[#1057FB] hover:bg-[#0043CE] active:scale-[0.99] text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer group"
        >
          <LogIn className="size-4.5 transition-transform group-hover:translate-x-0.5" />
          <span>Đăng nhập lại</span>
        </button>
      </motion.div>
    </div>
  )
}
