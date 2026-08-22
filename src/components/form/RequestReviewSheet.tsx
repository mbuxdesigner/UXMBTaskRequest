import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { 
  X, 
  ArrowLeft, 
  Send, 
  ExternalLink,
  Target,
  FileText,
  Paperclip
} from "lucide-react"
import { Squad } from "../../data/mockData"
import { UserSession } from "../../services/otpAuthService"

interface RequestReviewSheetProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isSubmitting: boolean
  form: {
    title: string
    product: string
    request_type: string
    description: string
    business_need: string
    user_problem: string
    target_user: string
    release_date: string
    deadline_reason: string
    leader_report_note: string
    doc_links: string[]
  }
  recommendedSquad?: Squad | null
  session?: UserSession | null
}

export default function RequestReviewSheet({
  open,
  onClose,
  onConfirm,
  isSubmitting,
  form
}: RequestReviewSheetProps) {
  const validLinks = form.doc_links.filter((l) => l.trim().length > 0)

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Blur Overlay with fade animation */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Floating Sheet Panel sliding from right to left */}
          <div className="fixed inset-y-2 right-2 sm:inset-y-4 sm:right-4 max-w-full flex z-50">
            <motion.aside 
              initial={{ x: "100%", opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="w-[95vw] sm:w-[540px] md:w-[600px] bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              {/* 1. Header */}
              <div className="p-6 pb-4 bg-white shrink-0 border-b border-slate-100">
                {/* Top row: Target Icon + ID & Close button */}
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
                  <div className="flex items-center gap-1.5 font-mono text-slate-500 font-semibold tracking-tight">
                    <Target className="w-3.5 h-3.5 text-slate-400" />
                    <span>UXMB-REVIEW</span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer"
                    title="Đóng"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Title */}
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                  {form.title || "Chưa đặt tiêu đề bài toán"}
                </h2>
              </div>

              {/* 2. Scrollable Definition Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 divide-y divide-slate-100">
                
                {/* DEFINITION SECTION */}
                <div className="space-y-3.5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    DEFINITION
                  </p>

                  <div className="space-y-3.5 text-xs sm:text-sm">
                    {/* 1. Nền tảng / Sản phẩm */}
                    <div className="flex items-start">
                      <span className="w-36 sm:w-44 text-slate-400 font-medium shrink-0 text-xs sm:text-sm">
                        Nền tảng / Sản phẩm
                      </span>
                      <span className="font-semibold text-slate-900 flex-1 break-words [overflow-wrap:anywhere]">
                        {form.product || "Chưa chọn"}
                      </span>
                    </div>

                    {/* 2. Loại yêu cầu */}
                    <div className="flex items-start">
                      <span className="w-36 sm:w-44 text-slate-400 font-medium shrink-0 text-xs sm:text-sm">
                        Loại yêu cầu
                      </span>
                      <span className="font-semibold text-slate-900 flex-1 break-words [overflow-wrap:anywhere]">
                        {form.request_type || "Chưa chọn"}
                      </span>
                    </div>

                    {/* 3. Mô tả nhu cầu UX */}
                    <div className="pt-1">
                      <span className="text-slate-400 font-medium block text-xs sm:text-sm mb-1">
                        Mô tả nhu cầu UX
                      </span>
                      <div className="font-normal text-slate-800 whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed text-xs sm:text-sm pl-0 sm:pl-0.5">
                        {form.description || "Chưa có mô tả chi tiết."}
                      </div>
                    </div>

                    {/* 4. Lý do cần thiết */}
                    {form.business_need && (
                      <div className="pt-1">
                        <span className="text-slate-400 font-medium block text-xs sm:text-sm mb-1">
                          Lý do cần thiết
                        </span>
                        <div className="font-normal text-slate-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed text-xs sm:text-sm pl-0 sm:pl-0.5">
                          {form.business_need}
                        </div>
                      </div>
                    )}

                    {/* 5. Vấn đề người dùng */}
                    {form.user_problem && (
                      <div className="pt-1">
                        <span className="text-slate-400 font-medium block text-xs sm:text-sm mb-1">
                          Vấn đề người dùng
                        </span>
                        <div className="font-normal text-slate-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed text-xs sm:text-sm pl-0 sm:pl-0.5">
                          {form.user_problem}
                        </div>
                      </div>
                    )}

                    {/* 6. Đối tượng mục tiêu */}
                    <div className="flex items-start">
                      <span className="w-36 sm:w-44 text-slate-400 font-medium shrink-0 text-xs sm:text-sm">
                        Đối tượng mục tiêu
                      </span>
                      <span className="font-medium text-slate-900 flex-1 break-words [overflow-wrap:anywhere]">
                        {form.target_user || "Chưa xác định"}
                      </span>
                    </div>

                    {/* 7. Ngày release dự kiến */}
                    <div className="flex items-start">
                      <span className="w-36 sm:w-44 text-slate-400 font-medium shrink-0 text-xs sm:text-sm">
                        Ngày release dự kiến
                      </span>
                      <span className="font-mono font-bold text-blue-600 flex-1">
                        {form.release_date || "Chưa có deadline"}
                      </span>
                    </div>

                    {/* 8. Lý do deadline */}
                    {form.deadline_reason && (
                      <div className="flex items-start">
                        <span className="w-36 sm:w-44 text-slate-400 font-medium shrink-0 text-xs sm:text-sm">
                          Lý do deadline
                        </span>
                        <span className="font-normal text-slate-700 flex-1 break-words [overflow-wrap:anywhere]">
                          {form.deadline_reason}
                        </span>
                      </div>
                    )}

                    {/* 9. Báo cáo Ban Lãnh Đạo */}
                    {form.leader_report_note && (
                      <div className="pt-1">
                        <span className="text-slate-400 font-medium block text-xs sm:text-sm mb-1">
                          Báo cáo Ban Lãnh Đạo
                        </span>
                        <div className="font-normal text-slate-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed text-xs sm:text-sm pl-0 sm:pl-0.5">
                          {form.leader_report_note}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* TÀI LIỆU & FILE ĐÍNH KÈM */}
                <div className="pt-5 space-y-3.5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>TÀI LIỆU & FILE ĐÍNH KÈM</span>
                    <span className="text-[11px] font-normal text-slate-400">({validLinks.length})</span>
                  </p>

                  {validLinks.length > 0 ? (
                    <div className="space-y-2">
                      {validLinks.map((link, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 group-hover:text-[#1057FB] flex items-center justify-center shrink-0 shadow-2xs">
                              <Paperclip className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-medium text-slate-800 truncate group-hover:text-[#1057FB] transition-colors">
                              {link}
                            </span>
                          </div>

                          <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-[#1057FB] p-1 shrink-0"
                            title="Mở liên kết"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">
                      Không có tài liệu hoặc file đính kèm nào.
                    </div>
                  )}
                </div>

              </div>

              {/* 3. Sheet Sticky Footer Action Bar */}
              <div className="p-4 sm:px-6 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={onClose}
                  className="gap-2 rounded-xl font-bold text-xs h-10 px-4 bg-white border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại chỉnh sửa</span>
                </Button>

                <Button
                  type="button"
                  size="default"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  onClick={onConfirm}
                  className="px-6 h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs gap-2 text-xs cursor-pointer"
                >
                  {!isSubmitting && <Send className="w-4 h-4" />}
                  <span>{isSubmitting ? "Đang gửi..." : "Gửi đầu bài"}</span>
                </Button>
              </div>
            </motion.aside>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
