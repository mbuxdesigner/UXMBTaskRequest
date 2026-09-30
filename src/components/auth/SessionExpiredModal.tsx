import React from "react"
import { motion } from "framer-motion"
import { Clock, LogIn, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconTile } from "@/components/reui/icon-tile"

interface SessionExpiredModalProps {
  message?: string
  onLoginAgain: () => void
}

/**
 * SessionExpiredModal
 * Chuẩn hóa 100% theo ReUI Alert Dialog System (https://reui.io/components/alert-dialog):
 * - Surface: Clean solid white bg, rounded-2xl, border-slate-200/90, shadow-2xl
 * - Icon: ReUI IconTile variant="amber" size="xl" rounded-2xl
 * - Typography: ReUI DialogTitle (text-lg font-bold) + DialogDescription (text-sm text-slate-500)
 * - Information: ReUI subtle callout card with ShieldCheck
 * - Action: ReUI Button variant="default" (màu đen sang trọng bg-slate-900) h-10.5 rounded-xl with spring tactile micro-interactions
 * - Backdrop: Clean dark frosted glass blur (bg-slate-950/40 backdrop-blur-sm)
 */
export default function SessionExpiredModal({
  message,
  onLoginAgain,
}: SessionExpiredModalProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-desc"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none"
    >
      {/* Backdrop overlay làm mờ toàn bộ giao diện phía sau (frosted glass blur) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
      />

      {/* Card Popup trung tâm chuẩn ReUI Alert Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 6 }}
        transition={{ type: "spring", stiffness: 450, damping: 30 }}
        className="relative z-10 w-full max-w-[400px] rounded-2xl bg-white border border-slate-200/90 shadow-2xl p-6 text-center flex flex-col items-center"
      >
        {/* ReUI IconTile Visual */}
        <div className="mb-4">
          <IconTile size="xl" variant="amber" className="rounded-2xl shadow-xs">
            <Clock className="size-7 text-amber-600 stroke-[2.2]" />
          </IconTile>
        </div>

        {/* Tiêu đề chuẩn ReUI DialogTitle */}
        <h3
          id="session-expired-title"
          className="text-lg font-bold text-slate-900 tracking-tight"
        >
          Phiên làm việc đã hết hạn
        </h3>

        {/* Nội dung thông báo chuẩn ReUI DialogDescription */}
        <p
          id="session-expired-desc"
          className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed font-normal"
        >
          {message ||
            "Phiên làm việc đã hết hạn để đảm bảo an toàn dữ liệu. Vui lòng bấm đăng nhập lại để tiếp tục làm việc."}
        </p>

        {/* Thông tin an toàn dữ liệu chuẩn ReUI Callout */}
        <div className="mt-4 w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-2.5 text-left">
          <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
          <span className="leading-snug">Hệ thống bảo toàn dữ liệu bài toán và tiến độ của bạn.</span>
        </div>

        {/* Nút Đăng nhập lại chuẩn ReUI Button (màu đen sang trọng) */}
        <div className="w-full mt-6">
          <Button
            type="button"
            variant="default"
            onClick={onLoginAgain}
            autoFocus
            className="w-full h-10.5 rounded-xl font-semibold text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950"
          >
            <LogIn className="size-4" />
            <span>Đăng nhập lại</span>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
