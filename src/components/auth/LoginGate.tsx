import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IconTile } from "@/components/reui/icon-tile"
import { OtpInput } from "@/components/reui/otp-input"
import { UserAvatar } from "@/components/common/UserAvatar"
import {
  requestTeamsOtp,
  verifyTeamsOtp,
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
  Layers,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from "lucide-react"

interface LoginGateProps {
  onAuthSuccess: (session: UserSession) => void
}

export default function LoginGate({ onAuthSuccess }: LoginGateProps) {
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(5)

  // Đếm ngược hiệu lực mã OTP (3 phút = 180s)
  const [otpCountdown, setOtpCountdown] = useState(180)
  // Đếm ngược cooldown gửi lại mã (60s)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Timer cho hiệu lực OTP
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (step === "otp" && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [step, otpCountdown])

  // Timer cho resend cooldown
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

  // Gửi OTP
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
    setInfoMsg("Đang kết nối gửi mã xác thực 6 số qua Microsoft Teams...")
    setOtpCountdown(180)
    setResendCooldown(60)
    setOtp("")

    try {
      const res = await requestTeamsOtp(cleanEmail)
      if (res.expiresIn) {
        setOtpCountdown(res.expiresIn)
      }
      setInfoMsg(res.message || "Mã xác thực đã được gửi tới Microsoft Teams của bạn.")
    } catch {
      setInfoMsg("Nếu tài khoản hợp lệ, mã xác thực 6 số đã được gửi tới Teams của bạn.")
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Xác thực OTP
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

  // Đăng nhập nhanh Demo Role
  const handleQuickDemoLogin = (demo: typeof DEMO_ACCOUNTS[0]) => {
    const session = saveSession(
      "MOCK_TOKEN_" + Date.now(),
      demo.personalEmail,
      demo.teamsEmail,
      demo.role,
      demo.squad,
      demo.displayName,
      demo.avatarUrl,
      SESSION_DURATION_SECONDS,
      demo.squads,
      demo.products
    )
    onAuthSuccess(session)
  }

  const handleOtpComplete = (code: string) => {
    if (!isVerifying) {
      handleVerifyOtp(code)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A192F] via-[#1B3A6B] to-[#0A2540] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background glowing ambient orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#0D9B97]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#1B3A6B]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#0D9B97]/10 to-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1B3A6B] to-[#0D9B97] shadow-xl shadow-[#0D9B97]/20 border border-white/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              MBBank UX Request Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
              Cổng tiếp nhận & Quản lý bài toán Thiết kế Trải nghiệm Người dùng
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <IconTile size="sm" variant="navy">
                <ShieldCheck className="w-4.5 h-4.5 text-[#0D9B97]" />
              </IconTile>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {step === "email" ? "Xác thực bảo mật Microsoft Teams" : "Nhập mã xác thực OTP"}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {step === "email"
                    ? "Nhập email của bạn để nhận mã OTP 6 số qua Teams"
                    : "Mã OTP 6 chữ số đã được gửi qua Microsoft Teams"}
                </p>
              </div>
            </div>
            <Badge variant="navy" size="xs" className="font-extrabold">
              Hiệu lực 8h trong Tab
            </Badge>
          </div>

          {/* Thông báo trạng thái */}
          {infoMsg && (
            <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/90 border border-blue-200/80 rounded-2xl text-xs text-blue-900 leading-relaxed animate-in fade-in-50 duration-200">
              {isSendingOtp ? (
                <Loader2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span>{infoMsg}</span>
                {isSendingOtp && (
                  <span className="block text-[11px] text-blue-600 mt-0.5 font-medium">
                    Bạn có thể nhập trước mã OTP nếu đã nhận được.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Thông báo lỗi */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 leading-relaxed animate-in fade-in-50 duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === "email" ? (
            <div className="space-y-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendOtp()
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email của bạn (Personal Email / MB Account)
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: nam.designer@mbbank.com.vn hoặc email cá nhân..."
                    startIcon={<Mail className="w-4 h-4 text-slate-400" />}
                    required
                    autoFocus
                    className="h-12 text-sm rounded-2xl border-slate-200 focus:border-[#1B3A6B]"
                  />
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Hệ thống sẽ tra cứu danh mục quyền và chuyển tiếp mã xác thực tới tài khoản Teams tương ứng của bạn.
                  </p>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={!email.trim()}
                  className="w-full h-12 text-sm font-bold gap-2 rounded-2xl shadow-lg shadow-[#1B3A6B]/20"
                >
                  <span>Gửi mã xác thực qua Teams</span>
                  <ArrowRight className="w-4 h-4 text-[#0D9B97]" />
                </Button>
              </form>

              {/* Quick Demo Role Picker */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <span>⚡ Đăng nhập nhanh thử nghiệm (Demo RBAC):</span>
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium">Bấm 1-click vào role</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {DEMO_ACCOUNTS.map((acc) => {
                    const role = acc.role
                    return (
                      <button
                        key={acc.personalEmail || acc.teamsEmail || acc.role}
                        type="button"
                        onClick={() => handleQuickDemoLogin(acc)}
                        className="p-3 rounded-2xl border border-slate-200/90 bg-slate-50/80 hover:bg-white hover:border-[#1057FB] hover:shadow-md transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={acc.displayName} avatarUrl={acc.avatarUrl} size="lg" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 group-hover:text-[#1B3A6B] truncate">
                                {acc.displayName.split(" ")[0]}
                              </span>
                              <Badge
                                variant={
                                  role === "Admin"
                                    ? "destructive"
                                    : role === "Design Owner"
                                    ? "purple"
                                    : role === "Designer"
                                    ? "navy"
                                    : "success"
                                }
                                size="xs"
                                className="text-[9px] px-1.5 py-0 font-extrabold"
                              >
                                {role}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {acc.teamsEmail}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleVerifyOtp()
              }}
              className="space-y-6"
            >
              {/* Email Pill Info */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="flex items-center gap-2 text-xs text-slate-600 truncate">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-semibold text-slate-900 truncate">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email")
                    setOtp("")
                    setErrorMsg(null)
                    setInfoMsg(null)
                  }}
                  className="text-xs text-[#1B3A6B] hover:underline font-bold flex items-center gap-1 flex-shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Đổi email</span>
                </button>
              </div>

              {/* 6-box Segmented OTP Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mã OTP 6 chữ số
                  </label>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span
                      className={`font-mono font-bold ${
                        otpCountdown < 30 ? "text-rose-600 animate-pulse" : "text-slate-600"
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

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 px-1">
                  <span>
                    {remainingAttempts !== null
                      ? `Còn lại ${remainingAttempts} lần thử`
                      : "Tối đa 5 lần thử"}
                  </span>
                  <span className="text-slate-500 font-medium">Tự động xác thực khi đủ 6 số</span>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                loading={isVerifying}
                disabled={otp.length !== 6 || otpCountdown <= 0}
                className="w-full h-12 text-sm font-bold gap-2 rounded-2xl shadow-lg shadow-[#1B3A6B]/20"
              >
                <Lock className="w-4 h-4 text-[#0D9B97]" />
                <span>{isVerifying ? "Đang kiểm tra mã..." : "Xác thực & Vào hệ thống"}</span>
              </Button>

              {/* Gửi lại mã OTP */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isSendingOtp || isVerifying}
                  onClick={() => handleSendOtp()}
                  className="text-xs text-[#1B3A6B] hover:text-[#1B3A6B]/80 disabled:text-slate-400 disabled:no-underline font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      resendCooldown > 0 || isSendingOtp ? "animate-spin" : ""
                    }`}
                  />
                  {resendCooldown > 0 ? (
                    <span>Gửi lại mã sau {resendCooldown}s</span>
                  ) : isSendingOtp ? (
                    <span>Đang gửi mã...</span>
                  ) : (
                    <span>Gửi lại mã OTP mới</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Security Footer Notice */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hiệu lực theo Tab • Tối đa 8 tiếng</span>
            </span>
            <span className="font-semibold text-slate-500">MB Digital Enterprise</span>
          </div>
        </div>
      </div>
    </div>
  )
}
