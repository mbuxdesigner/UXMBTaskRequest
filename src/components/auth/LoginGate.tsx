import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { OtpInput } from "@/components/reui/otp-input"
import { UserAvatar } from "@/components/common/UserAvatar"
import BrandLogo from "@/components/common/BrandLogo"
import {
  requestTeamsOtp,
  verifyTeamsOtp,
  refreshAllDataOnLogin,
  UserSession,
  DEMO_ACCOUNTS,
  saveSession,
  SESSION_DURATION_SECONDS,
} from "../../services/otpAuthService"
import {
  ShieldCheck,
  Mail,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Lock,
  RefreshCw,
  Loader2,
  KeyRound,
  Shield,
  Send,
  Quote,
} from "lucide-react"
import { CharacterMorph } from "@/components/ui/character-morph"

// 5 Cụm thông tin / Châm ngôn về giải pháp và thiết kế
const QUOTES = [
  {
    text: "A problem well stated is a problem half solved.",
    author: "Charles Kettering",
  },
  {
    text: "Design is not just what it looks like and feels like. Design is how it works.",
    author: "Steve Jobs",
  },
  {
    text: "We cannot solve our problems with the same thinking we used when we created them.",
    author: "Albert Einstein",
  },
  {
    text: "Simplicity is about subtracting the obvious and adding the meaningful.",
    author: "John Maeda",
  },
  {
    text: "Recognizing the need is the primary condition for design.",
    author: "Charles Eames",
  },
]

interface LoginGateProps {
  onAuthSuccess: (session: UserSession) => void
}

const DOMAIN_SUFFIX = "@mbbank.com.vn"

export default function LoginGate({ onAuthSuccess }: LoginGateProps) {
  // Luồng chuẩn: "email" -> "otp"
  const [step, setStep] = useState<"email" | "otp">("email")
  const [emailPrefix, setEmailPrefix] = useState("")
  const [email, setEmail] = useState("")
  const [quoteIndex, setQuoteIndex] = useState(0)

  // Tự động xoay chuyển 5 câu châm ngôn mỗi 5 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  // OTP State
  const [otp, setOtp] = useState("")
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<React.ReactNode | null>(null)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(5)
  const [otpCountdown, setOtpCountdown] = useState(180)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [logoFailed, setLogoFailed] = useState(false)

  // Timer cho hiệu lực OTP (180s)
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (step === "otp" && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [step, otpCountdown])

  // Timer cho resend cooldown (60s)
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [resendCooldown])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  // Bước 1: Gửi mã OTP qua Teams
  const handleSendOtp = async (targetEmail?: string) => {
    const cleanEmail = (targetEmail || email).trim()
    if (!cleanEmail) {
      setErrorMsg("Vui lòng nhập địa chỉ email cá nhân hoặc tài khoản MB.")
      return
    }

    setEmail(cleanEmail)
    setStep("otp")
    setIsSendingOtp(true)
    setErrorMsg(null)
    setInfoMsg(
      <span>
        Đang gửi OTP đến <strong>{cleanEmail}</strong>...
      </span>
    )
    setOtpCountdown(180)
    setResendCooldown(60)
    setOtp("")

    try {
      const res = await requestTeamsOtp(cleanEmail)
      if (res.expiresIn) {
        setOtpCountdown(res.expiresIn)
      }
      setInfoMsg(
        <span>
          Vui lòng kiểm tra Teams <strong>"Workflowws"</strong> để lấy OTP truy cập
        </span>
      )
    } catch {
      setInfoMsg(
        <span>
          Vui lòng kiểm tra Teams <strong>"Workflowws"</strong> để lấy OTP truy cập
        </span>
      )
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Bước 2: Xác thực mã OTP
  const handleVerifyOtp = async (otpValue?: string) => {
    const cleanOtp = (typeof otpValue === "string" ? otpValue : otp).trim()
    if (!cleanOtp || cleanOtp.length < 6) {
      setErrorMsg("Vui lòng nhập đủ 6 chữ số mã OTP.")
      return
    }

    if (otpCountdown <= 0) {
      setErrorMsg("Mã xác thực đã hết hạn. Vui lòng bấm 'Gửi lại mã OTP'.")
      return
    }

    setIsVerifying(true)
    setErrorMsg(null)

    try {
      const res = await verifyTeamsOtp(email, cleanOtp)
      if (res.success && res.session) {
        onAuthSuccess(res.session)
      } else {
        setErrorMsg(res.message || "Mã xác thực không chính xác. Vui lòng kiểm tra lại.")
        if (typeof res.remainingAttempts === "number") {
          setRemainingAttempts(res.remainingAttempts)
        }
      }
    } catch {
      setErrorMsg("Lỗi xác thực mã OTP. Vui lòng thử lại.")
    } finally {
      setIsVerifying(false)
    }
  }

  // Đăng nhập nhanh Demo Role (1-Click)
  const handleQuickDemoLogin = (account: typeof DEMO_ACCOUNTS[0]) => {
    const session = saveSession(
      "MOCK_TOKEN_" + Date.now(),
      account.personalEmail,
      account.teamsEmail,
      account.role,
      account.squad,
      account.displayName,
      account.avatarUrl,
      SESSION_DURATION_SECONDS,
      account.squads,
      account.products
    )
    onAuthSuccess(session)
    refreshAllDataOnLogin().catch(() => {})
  }

  const handleOtpComplete = (code: string) => {
    if (!isVerifying) {
      handleVerifyOtp(code)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col justify-between relative overflow-hidden font-sans select-none antialiased">
      {/* Top subtle ambient border glow */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500/40 via-purple-500/30 to-amber-500/30 z-30" />

      {/* Atmospheric Pastel Gradient Mesh Blobs (ReUI Onboarding-9 Signature Aesthetic) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {/* Top-Right Warm Peach/Amber Glow */}
        <div className="absolute -top-16 -right-16 w-[550px] h-[550px] rounded-full bg-gradient-to-br from-[#FED7AA]/40 to-[#FDBA74]/25 blur-[120px]" />
        {/* Center-Right Soft Rose/Magenta Glow */}
        <div className="absolute top-[28%] -right-12 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-[#FBCFE8]/40 via-[#F472B6]/20 to-transparent blur-[130px]" />
        {/* Lower-Right Lavender/Violet Glow */}
        <div className="absolute bottom-[-10%] right-[10%] w-[580px] h-[580px] rounded-full bg-gradient-to-tl from-[#DDD6FE]/40 via-[#C084FC]/25 to-transparent blur-[140px]" />
        {/* Bottom-Center Soft Cyan/Sky Blue Glow */}
        <div className="absolute -bottom-24 right-[28%] w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-[#BAE6FD]/40 to-[#7DD3FC]/25 blur-[130px]" />
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:4px_4px] opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* TOP NAVIGATION BAR */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-12 pt-8 pb-4 flex items-center justify-end z-20">
        {/* Right: Step Indicator */}
        <div className="text-xs font-medium text-neutral-400 tracking-wide">
          {step === "email" ? "Step 1 of 2" : "Step 2 of 2"}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-8 my-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* LEFT COLUMN: HERO TEXT & VALUE PROPOSITION */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6">
            {/* Pill Badge: Design Philosophy với animation nháy màu sống động */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border bg-white/90 backdrop-blur-md shadow-2xs text-xs font-semibold text-neutral-800 animate-badge-color transition-all">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 animate-dot-color" />
                <span className="relative inline-flex rounded-full h-2 w-2 animate-dot-color" />
              </span>
              <span className="font-semibold tracking-wide">Design Philosophy</span>
            </div>

            {/* Main Headline: Chuyển động Character Morph giữa 5 câu châm ngôn */}
            <div className="pt-1 pb-2">
              <h1 className="h-[160px] sm:h-[180px] lg:h-[195px] xl:h-[210px] flex items-start text-3xl sm:text-4xl lg:text-[40px] xl:text-[44px] font-bold text-neutral-950 tracking-tight leading-[1.25] pb-2">
                <CharacterMorph
                  texts={QUOTES.map((q) => `"${q.text}"`)}
                  currentIndex={quoteIndex}
                  className="font-bold text-neutral-950"
                />
              </h1>

              {/* Phân trang & Tên tác giả ở góc phải */}
              <div className="flex items-center justify-between pt-5 border-t border-neutral-200/60 mt-4">
                {/* 5 chấm chuyển câu */}
                <div className="flex items-center gap-2">
                  {QUOTES.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setQuoteIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        quoteIndex === idx
                          ? "w-7 bg-neutral-900"
                          : "w-1.5 bg-neutral-300 hover:bg-neutral-400"
                      }`}
                      aria-label={`Câu ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Tên tác giả ở góc phải */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={quoteIndex}
                    initial={{ opacity: 0, x: 12, filter: "blur(4px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: -12, filter: "blur(4px)" }}
                    transition={{ duration: 0.3 }}
                    className="text-right text-sm sm:text-base font-semibold text-neutral-600"
                  >
                    — {QUOTES[quoteIndex].author}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: REUI ONBOARDING CARD (AUDITED SENIOR UI) */}
          <div className="lg:col-span-6 xl:col-span-5 flex justify-center lg:justify-end">
            <motion.div
              layout
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[460px] bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] transition-all"
            >
              {/* Header Unit */}
              <div>
                <p className="text-xs text-neutral-500 font-medium">
                  Chào mừng đến với
                </p>
                <div className="mt-2 min-h-8 flex items-center">
                  {!logoFailed ? (
                    <img
                      src="/img-logo-UXTeamWith.webp"
                      alt="MB UX Team"
                      className="h-8 w-auto object-contain"
                      onError={() => setLogoFailed(true)}
                    />
                  ) : (
                    <BrandLogo size="sm" />
                  )}
                </div>
              </div>

              {/* Unified Form Area */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (step === "email") {
                    const cleanPrefix = emailPrefix.trim().toLowerCase().replace(/@.*$/, "")
                    if (!cleanPrefix) {
                      setErrorMsg("Vui lòng nhập tên tài khoản hoặc email MB.")
                      return
                    }
                    const fullEmail = `${cleanPrefix}${DOMAIN_SUFFIX}`
                    handleSendOtp(fullEmail)
                  } else {
                    handleVerifyOtp()
                  }
                }}
                className="mt-6 space-y-4"
              >
                {/* Global Error Messages */}
                {errorMsg && (
                  <div className="flex items-center gap-2.5 p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-700">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Input bên trên: Tài khoản MB */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-700 block">
                      Tài khoản MB
                    </label>
                    {step === "otp" && (
                      <button
                        type="button"
                        onClick={() => {
                          setStep("email")
                          setOtp("")
                          setErrorMsg(null)
                          setInfoMsg(null)
                        }}
                        className="text-[11.5px] text-neutral-500 hover:text-neutral-900 font-medium hover:underline cursor-pointer"
                      >
                        Đổi tài khoản
                      </button>
                    )}
                  </div>
                  
                  <div className="relative flex items-center h-11 rounded-xl bg-neutral-50/70 border border-neutral-200 hover:border-neutral-300 focus-within:bg-white focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-900/10 transition-all overflow-hidden shadow-2xs">
                    <div className="pl-3.5 pr-2 text-neutral-400 pointer-events-none shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>

                    <input
                      type="text"
                      value={emailPrefix}
                      disabled={step === "otp" || isSendingOtp}
                      onChange={(e) => {
                        let val = e.target.value.trim().toLowerCase()
                        if (val.includes("@")) {
                          val = val.split("@")[0]
                        }
                        setEmailPrefix(val)
                        setErrorMsg(null)
                      }}
                      placeholder="Nhập mail MB"
                      required
                      autoFocus={step === "email"}
                      className="flex-1 h-full bg-transparent text-sm text-neutral-900 disabled:text-neutral-600 outline-none placeholder:text-neutral-400 min-w-0 px-2 font-medium"
                    />
                    
                    <div className="pr-3 pl-2.5 py-1 mr-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg select-none pointer-events-none shrink-0 flex items-center">
                      @mbbank.com.vn
                    </div>
                  </div>
                </div>

                {/* Phần mã OTP: Fade hiện lên sau khi bấm Tiếp tục */}
                <AnimatePresence>
                  {step === "otp" && (
                    <motion.div
                      key="otp-section"
                      initial={{ opacity: 0, height: 0, y: -8 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -8 }}
                      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-3 pt-1 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-neutral-700">
                          Nhập OTP được gửi đến Teams
                        </label>
                        <div className="flex items-center gap-1 text-xs text-neutral-500">
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                          <span
                            className={`font-mono font-bold ${
                              otpCountdown < 30 ? "text-rose-600 animate-pulse" : "text-neutral-700"
                            }`}
                          >
                            {formatTime(otpCountdown)}
                          </span>
                        </div>
                      </div>

                      <OtpInput
                        value={otp}
                        onChange={(val) => {
                          setOtp(val)
                          setErrorMsg(null)
                        }}
                        onComplete={handleOtpComplete}
                        hasError={Boolean(errorMsg)}
                        disabled={isVerifying}
                        autoFocus={true}
                      />

                      <div className="flex items-center justify-between text-[11.5px] text-neutral-400 pt-0.5">
                        <span>
                          {remainingAttempts !== null
                            ? `Còn lại ${remainingAttempts} lần thử`
                            : "Tối đa 5 lần thử"}
                        </span>
                        <button
                          type="button"
                          disabled={resendCooldown > 0 || isSendingOtp || isVerifying}
                          onClick={() => handleSendOtp(email)}
                          className="text-neutral-600 hover:text-neutral-900 disabled:text-neutral-300 font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${
                              resendCooldown > 0 || isSendingOtp ? "animate-spin" : ""
                            }`}
                          />
                          {resendCooldown > 0 ? (
                            <span>Gửi lại mã sau {resendCooldown}s</span>
                          ) : isSendingOtp ? (
                            <span>Đang gửi mã...</span>
                          ) : (
                            <span>Gửi lại mã OTP</span>
                          )}
                        </button>
                      </div>

                      {/* Blue Info Message */}
                      {infoMsg && (
                        <div className="flex items-start gap-2.5 p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-900 leading-relaxed">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <div>{infoMsg}</div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Primary Button: Đổi trạng thái từ Tiếp tục -> Đăng nhập */}
                <button
                  type="submit"
                  disabled={
                    step === "email"
                      ? !emailPrefix.trim() || isSendingOtp
                      : otp.length !== 6 || otpCountdown <= 0 || isVerifying
                  }
                  className="w-full bg-[#09090B] text-white hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none rounded-xl h-11 text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  {step === "email" ? (
                    isSendingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang gửi mã...</span>
                      </>
                    ) : (
                      <>
                        <span>Tiếp tục nhận mã OTP</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )
                  ) : isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang kiểm tra mã...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Đăng nhập</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </main>

      {/* FOOTER BAR */}
      <footer className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400 border-t border-neutral-200/60 z-20">
        <div className="flex items-center gap-2">
          <span>© 2026 MB Digital Banking Division • UX Team</span>
        </div>
        <div className="flex items-center gap-4 text-neutral-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Enterprise Security • 8h Session</span>
          </span>
          <span>•</span>
          <span>Bảo mật chuẩn OTP Teams</span>
        </div>
      </footer>
    </div>
  )
}
