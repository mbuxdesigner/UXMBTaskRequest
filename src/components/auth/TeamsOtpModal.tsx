import { useState, useEffect } from "react"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IconTile } from "@/components/reui/icon-tile"
import { OtpInput } from "@/components/reui/otp-input"
import {
  requestTeamsOtp,
  verifyTeamsOtp,
  UserSession,
  DEMO_ACCOUNTS,
  saveSession,
} from "../../services/otpAuthService"
import { UserRole } from "../../data/mockData"
import {
  ShieldCheck,
  Mail,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  X,
  Lock,
  Sparkles,
  User,
  Shield,
  Palette,
  Briefcase,
  Loader2
} from "lucide-react"

interface TeamsOtpModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (session: UserSession) => void
}

export default function TeamsOtpModal({
  isOpen,
  onClose,
  onSuccess,
}: TeamsOtpModalProps) {
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(5)

  // Đếm ngược hiệu lực OTP (3 phút = 180s)
  const [otpCountdown, setOtpCountdown] = useState(180)
  // Đếm ngược cooldown gửi lại mã (60s)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null)
    }
  }, [isOpen])

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

  // Xử lý gửi OTP - CHUYỂN BƯỚC TỨC THÌ (0ms)
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
      setInfoMsg(res.message || "Mã xác thực đã được gửi tới tài khoản Microsoft Teams của bạn.")
    } catch {
      setInfoMsg("Nếu tài khoản hợp lệ, mã xác thực 6 số đã được gửi tới Teams của bạn.")
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Xử lý xác thực OTP
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
        onSuccess(res.session)
        onClose()
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
      28800
    )
    onSuccess(session)
    onClose()
  }

  const handleOtpComplete = (code: string) => {
    if (!isVerifying) {
      handleVerifyOtp(code)
    }
  }

  const handleResetToEmail = () => {
    setStep("email")
    setOtp("")
    setErrorMsg(null)
    setInfoMsg(null)
  }

  return (
    <Dialog open={isOpen} onClose={onClose} size="md">
      <DialogHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <IconTile size="default" variant="navy">
            <ShieldCheck className="w-5 h-5 text-[#0D9B97]" />
          </IconTile>
          <div>
            <DialogTitle>Xác thực bảo mật Microsoft Teams</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              {step === "email"
                ? "Nhập email của bạn để nhận mã xác thực 6 số qua Teams"
                : "Nhập mã OTP 6 số đã được gửi qua Microsoft Teams"}
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

      <DialogBody className="space-y-5 py-4">
        {/* Thông báo trạng thái gửi / thành công */}
        {infoMsg && (
          <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl text-xs text-blue-800 leading-relaxed animate-in fade-in-50 duration-200">
            {isSendingOtp ? (
              <Loader2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <span>{infoMsg}</span>
              {isSendingOtp && (
                <span className="block text-[11px] text-blue-500 mt-0.5">
                  Bạn có thể nhập trước mã OTP nếu đã nhận được.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Thông báo lỗi */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 leading-relaxed animate-in fade-in-50 duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === "email" ? (
          <div className="space-y-5">
            <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Email cá nhân / tài khoản MB của bạn
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: nam.designer@mbbank.com.vn hoặc email cá nhân..."
                  startIcon={<Mail className="w-4 h-4 text-slate-400" />}
                  required
                  autoFocus
                  className="h-12 text-sm rounded-xl"
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Hệ thống sẽ tra cứu danh mục quyền và chuyển tiếp mã xác thực tới tài khoản Teams tương ứng của bạn.
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={!email.trim()}
                className="w-full h-11 text-sm font-semibold gap-2 rounded-xl"
              >
                <span>Gửi mã xác thực qua Teams</span>
                <ArrowRight className="w-4 h-4 text-[#0D9B97]" />
              </Button>
            </form>

            {/* Quick Demo Role Picker */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                ⚡ Đăng nhập nhanh thử nghiệm 4 vai trò (RBAC Demo):
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const role = acc.role
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleQuickDemoLogin(acc)}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[#1B3A6B]/40 hover:shadow-xs transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-[#1B3A6B]">
                          {role}
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
                        >
                          {role}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-1">
                        {acc.teamsEmail}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }} className="space-y-5">
            {/* Email pill info */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-2 text-xs text-slate-600 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="font-semibold text-slate-800 truncate">{email}</span>
              </div>
              <button
                type="button"
                onClick={handleResetToEmail}
                className="text-xs text-[#1B3A6B] hover:underline font-bold flex items-center gap-1 flex-shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Đổi email</span>
              </button>
            </div>

            {/* 6-box ReUI OTP Input */}
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

              {/* 6 Segmented Boxes */}
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
              className="w-full h-11 text-sm font-semibold gap-2 rounded-xl"
            >
              <Lock className="w-4 h-4 text-[#0D9B97]" />
              <span>{isVerifying ? "Đang kiểm tra mã..." : "Xác thực & Bắt đầu tra cứu"}</span>
            </Button>

            {/* Gửi lại mã OTP */}
            <div className="text-center pt-1">
              <button
                type="button"
                disabled={resendCooldown > 0 || isSendingOtp || isVerifying}
                onClick={() => handleSendOtp()}
                className="text-xs text-[#1B3A6B] hover:text-[#1B3A6B]/80 disabled:text-slate-400 disabled:no-underline font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 || isSendingOtp ? "animate-spin" : ""}`} />
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
      </DialogBody>

      <DialogFooter className="bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Phiên xác thực an toàn 15 phút
        </span>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs font-semibold">
          Đóng
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
export { TeamsOtpModal }
