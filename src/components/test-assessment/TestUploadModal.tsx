import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Award,
  Sparkles,
  HelpCircle,
  FileText,
  ListChecks,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"
import { TestExam, Question } from "@/types/testAssessment"
import { parseTestExcelFile, downloadExcelTemplate, saveStoredTests, getStoredTests } from "@/services/testAssessmentService"

interface TestUploadModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newTest: TestExam) => void
  creatorName?: string
}

export default function TestUploadModal({
  open,
  onClose,
  onSuccess,
  creatorName = "Admin",
}: TestUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string>("")
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [step, setStep] = useState<"upload" | "preview">("upload")

  // Form State
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("Chuyên môn UX/UI")
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30)
  const [passingScore, setPassingScore] = useState(7)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setFileName(file.name)

    try {
      const result = await parseTestExcelFile(file)
      setParsedQuestions(result.questions)
      setWarnings(result.warnings)

      if (!title) {
        // Tự động gợi ý tên đề thi theo tên file
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
        setTitle(`Bài Đánh giá: ${cleanName}`)
      }

      setStep("preview")
      toast.success("Phân tích file Excel thành công!", `Trích xuất được ${result.questions.length} câu hỏi.`)
    } catch (err: any) {
      toast.error("Lỗi đọc file Excel", err.message || "File không đúng định dạng mẫu!")
      setFileName("")
      if (fileInputRef.current) fileInputRef.current.value = ""
    } finally {
      setLoading(false)
    }
  }

  const mcqCount = parsedQuestions.filter((q) => q.type === "trac_nghiem").length
  const essayCount = parsedQuestions.filter((q) => q.type === "tu_luan").length
  const totalPoints = Math.round(parsedQuestions.reduce((sum, q) => sum + q.points, 0) * 10) / 10

  const handleSaveTest = () => {
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên đề thi!")
      return
    }
    if (parsedQuestions.length === 0) {
      toast.error("Đề thi chưa có câu hỏi nào!")
      return
    }

    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19)
    const newTest: TestExam = {
      id: `TEST_${Date.now()}`,
      title: title.trim(),
      description: description.trim() || "Bài đánh giá năng lực chuyên môn định kỳ.",
      category,
      timeLimitMinutes: Math.max(5, Number(timeLimitMinutes) || 30),
      passingScore: Number(passingScore) || Math.round(totalPoints * 0.7),
      totalPoints,
      totalQuestions: parsedQuestions.length,
      mcqCount,
      essayCount,
      questions: parsedQuestions,
      status: "Active",
      createdAt: nowStr,
      createdBy: creatorName || "Admin UX Team",
    }

    const allTests = getStoredTests()
    saveStoredTests([newTest, ...allTests])

    toast.success("Xuất bản đề thi thành công!", `Mã đề: ${newTest.id} với ${newTest.totalQuestions} câu hỏi.`)
    onSuccess(newTest)
    onClose()
  }

  const resetForm = () => {
    setFileName("")
    setParsedQuestions([])
    setWarnings([])
    setTitle("")
    setDescription("")
    setTimeLimitMinutes(30)
    setPassingScore(7)
    setStep("upload")
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in-50 duration-150">
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-blue-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tạo Đề thi & Bài Đánh giá mới
              </h2>
              <p className="text-xs text-slate-500">
                Tải file Excel câu hỏi trắc nghiệm & tự luận để tự động xuất bản đề thi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm()
              onClose()
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === "upload" ? (
            <div className="space-y-6">
              {/* Dropzone Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50/70 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Chọn hoặc kéo thả file Excel câu hỏi vào đây
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  Hỗ trợ định dạng .xlsx, .xls, .csv. Tự động nhận diện câu hỏi trắc nghiệm A/B/C/D và câu hỏi tự luận.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-xs">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Duyệt file từ máy tính</span>
                </div>
              </div>

              {/* Template Download & Guide */}
              <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/60 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Chưa có file câu hỏi đúng định dạng?
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Tải file Excel mẫu chuẩn đã có sẵn công thức và hướng dẫn điền câu hỏi.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadExcelTemplate}
                  className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 text-xs font-semibold shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Tải file mẫu Excel
                </Button>
              </div>

              {/* Quick Guide Card */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 text-xs text-amber-800 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Quy tắc nhận diện câu hỏi từ Excel:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900/80 pl-1">
                  <li><strong>Trắc nghiệm:</strong> Cột `Type` ghi `trac_nghiem`, điền các cột `Option_A`, `Option_B`... và `Correct_Answer` (A, B, C hoặc D).</li>
                  <li><strong>Tự luận:</strong> Cột `Type` ghi `tu_luan`, để trống các cột Option, chỉ cần điền nội dung câu hỏi và điểm số `Points`.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Test Information Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Tên bài kiểm tra / Đánh giá *</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Kiểm tra Chuyên môn UX Core & Design System MB 2026"
                    className="rounded-xl text-xs h-9 bg-white"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Mô tả & Hướng dẫn làm bài</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="VD: Bài kiểm tra gồm trắc nghiệm và tự luận, thời gian 30 phút..."
                    className="rounded-xl text-xs bg-white min-h-[60px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Thời gian làm bài (Phút) *</label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <Input
                      type="number"
                      min={5}
                      max={180}
                      value={timeLimitMinutes}
                      onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                      className="rounded-xl text-xs pl-9 h-9 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Điểm tối thiểu đạt (Passing Score)</label>
                  <div className="relative">
                    <Award className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <Input
                      type="number"
                      min={1}
                      max={totalPoints}
                      step={0.5}
                      value={passingScore}
                      onChange={(e) => setPassingScore(Number(e.target.value))}
                      className="rounded-xl text-xs pl-9 h-9 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Extraction Metrics Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                  <span className="text-xs text-slate-500 font-medium block">Tổng số câu hỏi</span>
                  <span className="text-lg font-bold text-slate-900">{parsedQuestions.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
                  <span className="text-xs text-blue-600 font-medium block">Trắc nghiệm / Tự luận</span>
                  <span className="text-lg font-bold text-blue-700">{mcqCount} MCQ / {essayCount} Tự luận</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                  <span className="text-xs text-emerald-600 font-medium block">Tổng thang điểm</span>
                  <span className="text-lg font-bold text-emerald-700">{totalPoints} Điểm</span>
                </div>
              </div>

              {/* Warnings list if any */}
              {warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Một số lưu ý khi import ({warnings.length}):
                  </p>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 max-h-24 overflow-y-auto">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Questions Preview List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-blue-600" />
                    Xem trước danh sách câu hỏi ({parsedQuestions.length})
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("upload")}
                    className="text-xs text-slate-500 hover:text-slate-900 h-7"
                  >
                    Chọn file khác
                  </Button>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {parsedQuestions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="border border-slate-200/80 rounded-xl p-3 bg-white space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Câu {idx + 1}.</span>
                          <Badge
                            variant="outline"
                            className={
                              q.type === "trac_nghiem"
                                ? "bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
                                : "bg-purple-50 text-purple-700 border-purple-200 text-[10px]"
                            }
                          >
                            {q.type === "trac_nghiem" ? "Trắc nghiệm" : "Tự luận"}
                          </Badge>
                        </div>
                        <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                          {q.points} điểm
                        </span>
                      </div>

                      <p className="text-slate-800 font-medium">{q.question}</p>

                      {q.type === "trac_nghiem" && q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {q.options.map((opt) => {
                            const isCorrect = opt.key === q.correctAnswer
                            return (
                              <div
                                key={opt.key}
                                className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-2 ${
                                  isCorrect
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-medium"
                                    : "bg-slate-50 border-slate-200 text-slate-600"
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0 ${
                                    isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {opt.key}
                                </span>
                                <span className="truncate">{opt.text}</span>
                                {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              resetForm()
              onClose()
            }}
            className="rounded-xl text-xs cursor-pointer"
          >
            Hủy bỏ
          </Button>

          {step === "preview" && (
            <Button
              type="button"
              size="sm"
              onClick={handleSaveTest}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Xuất bản Đề thi ({parsedQuestions.length} câu)
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
