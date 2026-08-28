import { useState, useEffect } from "react"
import {
  X,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Clock,
  Sparkles,
  Save,
  MessageSquare,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Check,
  CheckSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"
import { TestSubmission, UserAnswer } from "@/types/testAssessment"
import { gradeEssaySubmission, getStoredTests } from "@/services/testAssessmentService"

interface GradeEssayModalProps {
  open: boolean
  onClose: () => void
  submission: TestSubmission | null
  adminName: string
  isAdmin?: boolean
  onGraded?: (updatedSubmission: TestSubmission) => void
}

export default function GradeEssayModal({
  open,
  onClose,
  submission,
  adminName,
  isAdmin = false,
  onGraded,
}: GradeEssayModalProps) {
  const [grades, setGrades] = useState<Record<string, { points: number; feedback: string }>>({})
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (submission) {
      const initial: Record<string, { points: number; feedback: string }> = {}
      const expandMap: Record<string, boolean> = {}

      submission.answers.forEach((ans) => {
        expandMap[ans.questionId] = true // Expand all by default
        if (ans.type === "tu_luan") {
          initial[ans.questionId] = {
            points: ans.earnedPoints || 0,
            feedback: ans.adminFeedback || "",
          }
        }
      })
      setGrades(initial)
      setExpandedQuestions(expandMap)
    }
  }, [submission])

  if (!open || !submission) return null

  // Lookup full question metadata if available from test bank
  const tests = getStoredTests()
  const originalTest = tests.find((t) => t.id === submission.testId)

  const essayAnswers = submission.answers.filter((a) => a.type === "tu_luan")
  const mcqAnswers = submission.answers.filter((a) => a.type === "trac_nghiem")

  // Live calculation of essay sum & total
  const currentEssayTotal = Object.values(grades).reduce(
    (acc, curr) => acc + (Number(curr.points) || 0),
    0
  )
  const previewTotalScore = Math.round((submission.scoreMcq + currentEssayTotal) * 10) / 10
  const previewPercentage = Math.round((previewTotalScore / submission.maxScore) * 100)

  const handlePointChange = (questionId: string, maxPoints: number, valStr: string) => {
    let val = parseFloat(valStr)
    if (isNaN(val)) val = 0
    if (val < 0) val = 0
    if (val > maxPoints) val = maxPoints

    setGrades((prev) => ({
      ...prev,
      [questionId]: {
        points: val,
        feedback: prev[questionId]?.feedback || "",
      },
    }))
  }

  const handleFeedbackChange = (questionId: string, feedback: string) => {
    setGrades((prev) => ({
      ...prev,
      [questionId]: {
        points: prev[questionId]?.points || 0,
        feedback,
      },
    }))
  }

  const handleSaveGrade = () => {
    const payload = Object.entries(grades).map(([qId, data]) => ({
      questionId: qId,
      earnedPoints: data.points,
      feedback: data.feedback,
    }))

    const updated = gradeEssaySubmission(
      submission.id,
      payload,
      adminName || "Admin UX Team"
    )
    if (updated) {
      toast.success(
        "Đã hoàn tất chấm bài!",
        `Tổng điểm: ${updated.totalScore}/${updated.maxScore} (${updated.percentage}%)`
      )
      if (onGraded) onGraded(updated)
      onClose()
    }
  }

  const toggleQuestionExpand = (qId: string) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50 duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1057FB] shadow-2xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Chi tiết Bài làm & Kết quả Đánh giá
                <Badge variant="outline" className="text-xs bg-white text-blue-700 border-blue-200 font-bold">
                  {submission.testTitle}
                </Badge>
              </h2>
              <p className="text-xs text-slate-500">
                Thí sinh: <span className="font-semibold text-slate-800">{submission.userName}</span> ({submission.userEmail}) • {submission.userSquad || "UX Team"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Ribbon */}
        <div className="bg-slate-900 text-white px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-400 block text-[11px]">Trắc nghiệm:</span>
              <span className="font-bold text-emerald-400 text-sm">{submission.scoreMcq} đ</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Tự luận:</span>
              <span className="font-bold text-purple-300 text-sm">
                {isAdmin ? `${Math.round(currentEssayTotal * 10) / 10} đ` : `${submission.scoreEssay} đ`}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Tổng điểm đạt được:</span>
              <span className="font-bold text-amber-400 text-sm">
                {isAdmin ? previewTotalScore : submission.totalScore} / {submission.maxScore} (
                {isAdmin ? previewPercentage : submission.percentage}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">
              Thời gian làm: {Math.round(submission.timeSpentSeconds / 60)} phút
            </span>
            <Badge
              variant="outline"
              className={
                submission.status === "Đã hoàn thành"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs"
              }
            >
              {submission.status}
            </Badge>
          </div>
        </div>

        {/* Body Content: Scrollable List of All Questions & Answers */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ==========================================
              PHẦN 1: CÂU HỎI TRẮC NGHIỆM
              ========================================== */}
          {mcqAnswers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  1. Phần Trắc nghiệm ({mcqAnswers.length} câu - Đạt {submission.scoreMcq} điểm)
                </h3>
                <span className="text-xs text-slate-400">Hệ thống chấm tự động</span>
              </div>

              <div className="space-y-3">
                {mcqAnswers.map((ans, idx) => {
                  const origQ = originalTest?.questions.find((q) => q.id === ans.questionId)
                  const options = ans.options || origQ?.options || []
                  const correctKey = ans.correctAnswer || origQ?.correctAnswer
                  const explanation = ans.explanation || origQ?.explanation
                  const isExpanded = expandedQuestions[ans.questionId] !== false

                  return (
                    <div
                      key={ans.questionId}
                      className={`border rounded-2xl p-4 transition-all ${
                        ans.isCorrect
                          ? "bg-emerald-50/20 border-emerald-200/80"
                          : "bg-rose-50/20 border-rose-200/80"
                      }`}
                    >
                      {/* Question Top Header */}
                      <div
                        onClick={() => toggleQuestionExpand(ans.questionId)}
                        className="flex items-start justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              ans.isCorrect
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-900 leading-snug">
                              {ans.questionText}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-slate-500 font-medium">
                                Bạn chọn:{" "}
                                <strong className={ans.isCorrect ? "text-emerald-700" : "text-rose-700"}>
                                  {ans.selectedOption ? `Đáp án ${ans.selectedOption}` : "Chưa chọn"}
                                </strong>
                              </span>
                              {!ans.isCorrect && correctKey && (
                                <span className="text-[11px] text-emerald-700 font-semibold">
                                  • Đáp án đúng: <strong>Đáp án {correctKey}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              ans.isCorrect
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {ans.earnedPoints} / {ans.maxPoints} đ
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Options & Explanation */}
                      {isExpanded && (
                        <div className="mt-3.5 pt-3 border-t border-slate-200/60 space-y-2.5">
                          {/* Options List */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {options.map((opt) => {
                              const isUserPick = ans.selectedOption === opt.key
                              const isActualCorrect = correctKey === opt.key

                              let cardStyle = "border-slate-200 bg-white text-slate-700"
                              if (isActualCorrect) {
                                cardStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold ring-1 ring-emerald-500/20"
                              } else if (isUserPick && !isActualCorrect) {
                                cardStyle = "border-rose-400 bg-rose-50 text-rose-900 font-semibold"
                              }

                              return (
                                <div
                                  key={opt.key}
                                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${cardStyle}`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-5 h-5 rounded-md bg-white/80 border border-slate-200 flex items-center justify-center font-bold text-[11px] shrink-0">
                                      {opt.key}
                                    </span>
                                    <span className="truncate">{opt.text}</span>
                                  </div>

                                  <div className="shrink-0 flex items-center gap-1">
                                    {isUserPick && (
                                      <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white text-[9.5px] font-bold">
                                        Đã chọn
                                      </span>
                                    )}
                                    {isActualCorrect && (
                                      <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {/* Explanation if any */}
                          {explanation && (
                            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 flex items-start gap-2">
                              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">Giải thích: </span>
                                <span>{explanation}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ==========================================
              PHẦN 2: CÂU HỎI TỰ LUẬN
              ========================================== */}
          {essayAnswers.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  2. Phần Tự luận ({essayAnswers.length} câu)
                </h3>
                <span className="text-xs text-purple-700 font-semibold">
                  {isAdmin ? "Admin có thể chấm & nhập nhận xét bên dưới" : "Nhận xét & Điểm từ Trưởng nhóm / Admin"}
                </span>
              </div>

              <div className="space-y-4">
                {essayAnswers.map((ans, idx) => {
                  const currentGrade = grades[ans.questionId] || {
                    points: ans.earnedPoints || 0,
                    feedback: ans.adminFeedback || "",
                  }

                  return (
                    <div
                      key={ans.questionId}
                      className="border border-purple-200/80 rounded-2xl p-5 bg-purple-50/20 space-y-4"
                    >
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {mcqAnswers.length + idx + 1}
                          </span>
                          <div>
                            <span className="text-[11px] font-bold text-purple-700 block mb-0.5">
                              Câu hỏi Tự luận
                            </span>
                            <p className="text-xs font-bold text-slate-900 leading-relaxed">
                              {ans.questionText}
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold text-xs shrink-0">
                          Tối đa {ans.maxPoints} điểm
                        </span>
                      </div>

                      {/* Candidate's Answer */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          Bài làm của thí sinh:
                        </label>
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[70px]">
                          {ans.essayAnswer ? (
                            ans.essayAnswer
                          ) : (
                            <span className="text-slate-400 italic">Thí sinh không điền câu trả lời cho câu này.</span>
                          )}
                        </div>
                      </div>

                      {/* Admin Grading Controls OR Candidate Review View */}
                      {isAdmin ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-purple-100">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-800">
                              Điểm cho câu này (0 - {ans.maxPoints}):
                            </label>
                            <Input
                              type="number"
                              step={0.25}
                              min={0}
                              max={ans.maxPoints}
                              value={currentGrade.points}
                              onChange={(e) =>
                                handlePointChange(ans.questionId, ans.maxPoints, e.target.value)
                              }
                              className="h-9 rounded-xl text-xs bg-white font-bold text-purple-700"
                            />
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                              Nhận xét & Góp ý của Giám khảo:
                            </label>
                            <Input
                              value={currentGrade.feedback}
                              onChange={(e) => handleFeedbackChange(ans.questionId, e.target.value)}
                              placeholder="VD: Tư duy xử lý tốt, phương án thiết kế rõ ràng..."
                              className="h-9 rounded-xl text-xs bg-white"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="font-bold text-slate-700 flex items-center gap-1.5 mb-0.5">
                              <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                              Nhận xét của Giám khảo ({ans.gradedBy || "Hội đồng UX"}):
                            </span>
                            <p className="text-purple-950 font-medium">
                              {ans.adminFeedback || "Chưa có nhận xét hoặc đang chờ chấm điểm."}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-[10px] text-slate-400 block">Điểm đạt:</span>
                            <span className="font-black text-purple-700 text-sm">
                              {ans.earnedPoints} / {ans.maxPoints} đ
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl border-slate-200 text-xs font-semibold cursor-pointer"
          >
            Đóng cửa sổ
          </Button>

          {isAdmin && (
            <Button
              type="button"
              size="sm"
              onClick={handleSaveGrade}
              className="rounded-xl bg-[#1057FB] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-2xs gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Lưu điểm & Hoàn thành chấm bài
            </Button>
          )}
        </div>

      </div>
    </div>
  )
}
