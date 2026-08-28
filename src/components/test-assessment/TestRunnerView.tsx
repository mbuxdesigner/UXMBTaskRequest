import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  Award,
  HelpCircle,
  BookOpen,
  ArrowLeft,
  FileText,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { TestExam, TestSubmission } from "@/types/testAssessment"
import { submitUserExam } from "@/services/testAssessmentService"

interface TestRunnerViewProps {
  test: TestExam
  user: { email: string; name: string; squad?: string; role?: string }
  onFinish: (submission: TestSubmission) => void
  onExit: () => void
}

export default function TestRunnerView({
  test,
  user,
  onFinish,
  onExit,
}: TestRunnerViewProps) {
  // Test State
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<
    Record<string, { selectedOption?: "A" | "B" | "C" | "D"; essayAnswer?: string }>
  >({})
  
  // Timer State (in seconds)
  const totalSeconds = test.timeLimitMinutes * 60
  const [timeLeft, setTimeLeft] = useState(totalSeconds)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [submittedResult, setSubmittedResult] = useState<TestSubmission | null>(null)

  // Timer Countdown
  useEffect(() => {
    if (submittedResult) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [submittedResult])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const currentQ = test.questions[currentIdx]
  const currentAnswer = answers[currentQ?.id] || {}

  const handleSelectOption = (key: "A" | "B" | "C" | "D") => {
    if (submittedResult) return
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        selectedOption: key,
      },
    }))
  }

  const handleEssayChange = (text: string) => {
    if (submittedResult) return
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        essayAnswer: text,
      },
    }))
  }

  // Calculate answered count
  const answeredCount = test.questions.filter((q) => {
    const a = answers[q.id]
    if (q.type === "trac_nghiem") return !!a?.selectedOption
    if (q.type === "tu_luan") return !!a?.essayAnswer && a.essayAnswer.trim().length > 0
    return false
  }).length

  const handleAutoSubmit = async () => {
    toast.warning("Hết giờ làm bài!", "Hệ thống đang tự động nộp bài làm của bạn.")
    await doSubmit()
  }

  const doSubmit = async () => {
    setIsSubmitting(true)
    setShowConfirmModal(false)

    try {
      const timeSpent = totalSeconds - timeLeft
      const payloadAnswers = test.questions.map((q) => ({
        questionId: q.id,
        selectedOption: answers[q.id]?.selectedOption,
        essayAnswer: answers[q.id]?.essayAnswer,
      }))

      const submission = await submitUserExam(test, user, payloadAnswers, timeSpent)
      setSubmittedResult(submission)
      onFinish(submission)
      toast.success("Nộp bài thi thành công!")
    } catch (err: any) {
      toast.error("Lỗi khi nộp bài", err.message || "Vui lòng thử lại!")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ==========================================
  // RESULT SCREEN AFTER SUBMISSION
  // ==========================================
  if (submittedResult) {
    const isPassed = (test.passingScore && submittedResult.totalScore >= test.passingScore) || submittedResult.percentage >= 60

    return (
      <div className="max-w-3xl mx-auto py-8 px-4 animate-in fade-in-50 duration-200">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
            <Award className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">
              Hoàn thành bài thi!
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Bài làm của thí sinh <span className="font-semibold text-slate-800">{user.name}</span> đã được ghi nhận vào hệ thống quản lý & Google Sheets.
            </p>
          </div>

          {/* Scores Overview Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-center">
              <span className="text-xs text-blue-600 font-semibold block mb-1">Điểm Trắc nghiệm</span>
              <span className="text-2xl font-black text-blue-700">{submittedResult.scoreMcq} đ</span>
              <span className="text-[11px] text-blue-500 block mt-0.5">(Đã chấm tự động)</span>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 text-center">
              <span className="text-xs text-purple-600 font-semibold block mb-1">Điểm Tự luận</span>
              <span className="text-2xl font-black text-purple-700">
                {submittedResult.status === "Đã hoàn thành" ? `${submittedResult.scoreEssay} đ` : "Chờ chấm"}
              </span>
              <span className="text-[11px] text-purple-500 block mt-0.5">
                ({test.essayCount} câu tự luận)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-white text-center">
              <span className="text-xs text-slate-400 font-semibold block mb-1">Tổng điểm hiện tại</span>
              <span className="text-2xl font-black text-amber-400">
                {submittedResult.totalScore} / {submittedResult.maxScore}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {submittedResult.status}
              </span>
            </div>
          </div>

          {test.essayCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 max-w-xl mx-auto flex items-start gap-3 text-left">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                Bài thi của bạn có <strong>{test.essayCount} câu tự luận</strong>. Giám khảo / Admin UX Team sẽ chấm chi tiết và cập nhật tổng điểm chính thức lên hệ thống sau.
              </p>
            </div>
          )}

          <div className="pt-4 flex items-center justify-center gap-3">
            <Button
              type="button"
              onClick={onExit}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-6 cursor-pointer"
            >
              Quay lại danh sách bài kiểm tra
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // ACTIVE TEST TAKING INTERFACE
  // ==========================================
  const isTimeUrgent = timeLeft < 300 // < 5 minutes

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      
      {/* Top Test Header Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirmModal(true)}
            className="text-slate-500 hover:text-slate-900 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Rời phòng thi
          </Button>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900">
              {test.title}
            </h1>
            <p className="text-xs text-slate-500">
              Thí sinh: <span className="font-semibold text-slate-800">{user.name}</span> • {test.totalQuestions} câu hỏi ({test.totalPoints} điểm)
            </p>
          </div>
        </div>

        {/* Timer Badge */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-bold border transition-colors ${
            isTimeUrgent
              ? "bg-rose-50 border-rose-300 text-rose-700 animate-pulse"
              : "bg-blue-50 border-blue-200 text-blue-700"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left / Main Question Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            
            {/* Question Heading */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-bold text-xs">
                  Câu {currentIdx + 1} / {test.questions.length}
                </span>
                <Badge
                  variant="outline"
                  className={
                    currentQ.type === "trac_nghiem"
                      ? "bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold"
                      : "bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold"
                  }
                >
                  {currentQ.type === "trac_nghiem" ? "Trắc nghiệm" : "Tự luận"}
                </Badge>
              </div>

              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                {currentQ.points} Điểm
              </span>
            </div>

            {/* Question Text */}
            <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
              {currentQ.question}
            </div>

            {/* MCQ Options */}
            {currentQ.type === "trac_nghiem" && currentQ.options && (
              <div className="space-y-3 pt-2">
                {currentQ.options.map((opt) => {
                  const isSelected = currentAnswer.selectedOption === opt.key
                  return (
                    <div
                      key={opt.key}
                      onClick={() => handleSelectOption(opt.key)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3.5 group ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/70 text-blue-950 font-semibold shadow-xs"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 text-slate-700"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold shrink-0 transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                        }`}
                      >
                        {opt.key}
                      </span>
                      <span className="text-xs sm:text-sm">{opt.text}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Essay Textarea */}
            {currentQ.type === "tu_luan" && (
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Nhập câu trả lời tự luận của bạn vào đây:
                </label>
                <Textarea
                  value={currentAnswer.essayAnswer || ""}
                  onChange={(e) => handleEssayChange(e.target.value)}
                  placeholder="Gõ nội dung phân tích, giải pháp và luận điểm của bạn..."
                  className="min-h-[160px] rounded-xl text-xs sm:text-sm p-4 leading-relaxed bg-slate-50/50 border-slate-200 focus:bg-white"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Mẹo: Trình bày rõ ràng theo gạch đầu dòng các ý chính.</span>
                  <span>{(currentAnswer.essayAnswer || "").length} ký tự</span>
                </div>
              </div>
            )}

            {/* Bottom Nav Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                className="rounded-xl text-xs font-medium cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Câu trước
              </Button>

              {currentIdx < test.questions.length - 1 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setCurrentIdx((prev) => Math.min(test.questions.length - 1, prev + 1))}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
                >
                  Câu tiếp theo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowConfirmModal(true)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Nộp bài thi ({answeredCount}/{test.questions.length})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Questions Navigator & Progress */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Tiến độ làm bài</span>
                <span className="font-semibold text-blue-600">
                  {answeredCount} / {test.questions.length} câu
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${(answeredCount / test.questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Questions Grid */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                Danh sách câu hỏi:
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {test.questions.map((q, idx) => {
                  const isCurrent = idx === currentIdx
                  const a = answers[q.id]
                  const isDone =
                    q.type === "trac_nghiem"
                      ? !!a?.selectedOption
                      : !!a?.essayAnswer && a.essayAnswer.trim().length > 0

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? "ring-2 ring-blue-600 ring-offset-1 bg-blue-600 text-white shadow-xs"
                          : isDone
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
                <span>Đã trả lời</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
                <span>Chưa trả lời</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-600" />
                <span>Đang xem</span>
              </div>
            </div>

            {/* Quick Submit Button */}
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowConfirmModal(true)}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-xs mt-2"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Nộp bài thi
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Submit Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in-50 duration-150">
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Xác nhận nộp bài thi
                </h3>
                <p className="text-xs text-slate-500">
                  Thời gian còn lại: <strong>{formatTime(timeLeft)}</strong>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Số câu đã hoàn thành:</span>
                <span className="font-bold text-emerald-700">{answeredCount} / {test.questions.length}</span>
              </div>
              {answeredCount < test.questions.length && (
                <p className="text-rose-600 font-medium">
                  ⚠️ Bạn còn {test.questions.length - answeredCount} câu chưa điền câu trả lời!
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl text-xs"
              >
                Tiếp tục làm bài
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSubmitting}
                onClick={doSubmit}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                {isSubmitting ? "Đang nộp..." : "Xác nhận nộp bài"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
