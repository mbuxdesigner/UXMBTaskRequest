import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Copy, 
  ArrowRight, 
  Plus, 
  Rocket,
  CheckCheck
} from "lucide-react"
import { Squad } from "../../data/mockData"
import { FallingText } from "../jolyui/falling-text"

interface SuccessCelebrationCardProps {
  requestId: string
  squad?: Squad | null
  syncMessage?: string
  onCreateAnother: () => void
  onGoToTrack: () => void
}

export default function SuccessCelebrationCard({
  requestId,
  onCreateAnother,
  onGoToTrack
}: SuccessCelebrationCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyId = () => {
    if (requestId) {
      navigator.clipboard.writeText(requestId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="relative w-full min-h-[580px] sm:min-h-[640px] flex items-center justify-center p-4 overflow-hidden rounded-3xl">
      {/* 1. JOLY UI FALLING TEXT IN THE BACKGROUND (Sau background - Đầy ắp từ khóa UX/Banking đa sắc) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-auto select-none opacity-90">
        <FallingText
          text="MBBank UXTeam UXUI UserFlow Prototype Request-Sent! All-Set! You’re-Done! Nice-One! Good-to-Go! It’s-In! Successfully-Shipped! Design-Incoming! Let’s-Design! Make-It-Better Pixel-Perfect Craft-the-Flow Think-Design-Ship Better-by-Design Flow-Matters Money-Moves Banking Better Smart-Money Make-Money-Flow Design-Meets-Finance"
          trigger="auto"
          gravity={0.4}
          fontSize="1.8rem"
          mouseConstraintStiffness={0.3}
          wordSpacing={8}
          minHeight="100%"
          className="h-full w-full"
        />
      </div>

      {/* 2. Main Foreground Warm & Friendly Card (Nằm nổi phía trên background) */}
      <div className="relative z-10 w-full max-w-xl bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl shadow-2xl shadow-slate-300/40 p-6 sm:p-10 text-center space-y-6 animate-in zoom-in-95 duration-300">
        
        {/* Top Decorative Background Glow */}
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-blue-50/70 via-emerald-50/20 to-transparent pointer-events-none rounded-t-3xl" />

        {/* Celebratory Illustration Image */}
        <div className="pt-2" style={{ marginBottom: "16px" }}>
          <img
            src="/general_illus_success.webp"
            alt="Success"
            className="w-36 h-36 sm:w-44 sm:h-44 object-contain mx-auto animate-in zoom-in-75 duration-300 drop-shadow-sm select-none"
          />
        </div>

        {/* Title & Subtext */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight">
            Đầu bài đã hạ cánh an toàn! 🚀
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed font-normal">
            UX Team đã tiếp nhận đầu bài và sẽ sắp xếp nhân sự thực hiện, trao đổi thêm với PO trong thời gian sớm nhất.
          </p>
        </div>

        {/* Smart Ticket Box with 1-Click Copy */}
        <div className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/90 rounded-2xl flex items-center justify-between gap-3 transition-colors text-left max-w-md mx-auto shadow-2xs">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Mã bài toán của bạn
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-[0.12em] truncate block">
              {requestId || "UXMB-001"}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyId}
            className={`rounded-xl font-bold text-xs gap-1.5 h-10 px-3.5 transition-all cursor-pointer ${
              copied
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {copied ? (
              <>
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span>Đã copy!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy mã</span>
              </>
            )}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            type="button"
            size="lg"
            onClick={onGoToTrack}
            className="w-full sm:w-auto h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md gap-2 text-xs cursor-pointer"
          >
            <span>Theo dõi trong Task của tôi</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onCreateAnother}
            className="w-full sm:w-auto h-11 px-5 rounded-xl font-bold text-xs border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer gap-1.5 bg-white"
          >
            <Plus className="w-4 h-4" />
            <span>Gửi thêm bài toán khác</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
