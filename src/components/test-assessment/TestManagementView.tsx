import { useState, useEffect, useMemo } from "react"
import * as XLSX from "xlsx"
import {
  FileSpreadsheet,
  Plus,
  Download,
  Search,
  CheckCircle2,
  Clock,
  Award,
  BookOpen,
  Filter,
  Eye,
  Edit3,
  Trash2,
  RefreshCw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  CheckSquare,
  AlertCircle,
  FileCheck,
  History,
} from "lucide-react"
import { NumberTicker } from "@/components/jolyui/number-ticker"
import { EmptyState } from "@/components/reui/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"
import { UserAvatar } from "@/components/common/UserAvatar"
import { TestExam, TestSubmission } from "@/types/testAssessment"
import {
  getStoredTests,
  getStoredSubmissions,
  saveStoredTests,
  saveStoredSubmissions,
  downloadExcelTemplate,
} from "@/services/testAssessmentService"
import TestUploadModal from "./TestUploadModal"
import GradeEssayModal from "./GradeEssayModal"

interface TestManagementViewProps {
  userRole: "Admin" | "Design Owner" | "Designer" | "PO"
  currentUserName: string
  currentUserEmail: string
  currentUserSquad?: string
  onStartExam: (test: TestExam) => void
}

export default function TestManagementView({
  userRole,
  currentUserName,
  currentUserEmail,
  currentUserSquad,
  onStartExam,
}: TestManagementViewProps) {
  // Chỉ tài khoản vai trò 'Admin' mới có quyền chấm bài, sửa điểm và tạo/xóa đề thi
  const isAdmin = userRole === "Admin"

  const [tests, setTests] = useState<TestExam[]>(getStoredTests())
  const [submissions, setSubmissions] = useState<TestSubmission[]>(getStoredSubmissions())

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<TestSubmission | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Realtime reload on events
  useEffect(() => {
    const handleUpdate = () => {
      setTests(getStoredTests())
      setSubmissions(getStoredSubmissions())
    }
    window.addEventListener("test_exams_updated", handleUpdate)
    window.addEventListener("test_submissions_updated", handleUpdate)
    return () => {
      window.removeEventListener("test_exams_updated", handleUpdate)
      window.removeEventListener("test_submissions_updated", handleUpdate)
    }
  }, [])

  // Filter Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      // Nếu là Designer/PO thông thường, chỉ xem bài nộp của chính mình
      if (!isAdmin) {
        if (s.userEmail.toLowerCase() !== currentUserEmail.toLowerCase()) return false
      }

      const matchesSearch =
        s.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.testTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.userSquad && s.userSquad.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && s.status === "Chờ chấm tự luận") ||
        (statusFilter === "completed" && s.status === "Đã hoàn thành")

      return matchesSearch && matchesStatus
    })
  }, [submissions, isAdmin, currentUserEmail, searchQuery, statusFilter])

  // Phân trang
  const totalItems = filteredSubmissions.length
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedSubmissions = filteredSubmissions.slice(startIndex, startIndex + rowsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, rowsPerPage])

  const pendingCount = filteredSubmissions.filter((s) => s.status === "Chờ chấm tự luận").length
  const completedCount = filteredSubmissions.filter((s) => s.status === "Đã hoàn thành").length

  // Export Submissions to Excel
  const handleExportSubmissionsExcel = () => {
    if (filteredSubmissions.length === 0) {
      toast.info("Không có dữ liệu bài nộp để xuất file!")
      return
    }

    const exportRows = filteredSubmissions.map((s, idx) => ({
      STT: idx + 1,
      "Mã bài nộp": s.id,
      "Tên nhân sự": s.userName,
      Email: s.userEmail,
      Squad: s.userSquad || "Chưa gán",
      "Tên đề thi": s.testTitle,
      "Thời gian nộp": s.submittedAt,
      "Điểm trắc nghiệm": s.scoreMcq,
      "Điểm tự luận": s.scoreEssay,
      "Tổng điểm": s.totalScore,
      "Thang điểm tối đa": s.maxScore,
      "Tỷ lệ (%)": `${s.percentage}%`,
      "Trạng thái chấm": s.status,
      "Người chấm": s.gradedBy || "Hệ thống tự động",
    }))

    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Bang_Diem_Nhan_Su")
    XLSX.writeFile(wb, `Bang_Diem_Danh_Gia_UXTeam_${Date.now()}.xlsx`)
    toast.success("Xuất bảng điểm Excel thành công!")
  }

  return (
    <div className="space-y-6">
      
      {/* 1. TOP HEADER MATCHING 'TASK CỦA TÔI' EXACTLY */}
      <div className="border-b border-slate-200/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isAdmin ? "Bài test & Đánh giá năng lực" : "Bài test của tôi"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium flex flex-wrap items-center gap-1.5">
            <span>
              <NumberTicker value={totalItems} className="font-bold text-slate-800" /> bài làm hiển thị
            </span>
            <span className="mx-0.5 text-slate-300">•</span>
            <span className="text-amber-600 font-semibold">
              <NumberTicker value={pendingCount} className="font-bold text-amber-600" /> chờ chấm tự luận
            </span>
            <span className="mx-0.5 text-slate-300">•</span>
            <span className="text-emerald-600 font-semibold">
              <NumberTicker value={completedCount} className="font-bold text-emerald-600" /> hoàn thành
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isAdmin && (
            <>
              {/* Tải file mẫu Excel Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={downloadExcelTemplate}
                className="h-10 text-xs gap-1.5 bg-white border-slate-200 rounded-xl text-slate-600 font-semibold cursor-pointer shrink-0 shadow-2xs hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5 mr-0.5 text-slate-500" />
                <span>Tải file mẫu Excel</span>
              </Button>

              {/* Upload Excel Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setUploadModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold gap-1.5 rounded-xl h-10 px-4 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Excel tạo đề mới</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. PHẦN TRÊN: BÀI TEST CẦN THỰC HIỆN */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Đề thi chuyên môn cần thực hiện ({tests.length})
            </h2>
            <p className="text-xs text-slate-500">
              Chọn đề thi bên dưới để bắt đầu làm bài kiểm tra trực tuyến
            </p>
          </div>
        </div>

        {tests.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <EmptyState
              title="Chưa có đề thi nào"
              description={
                isAdmin
                  ? "Hiện chưa có đề thi nào trong hệ thống. Hãy bấm 'Upload Excel tạo đề mới' để đưa đề thi vào."
                  : "Hiện chưa có bài kiểm tra chuyên môn nào được mở."
              }
              primaryAction={
                isAdmin
                  ? {
                      label: "Upload Excel tạo đề mới",
                      onClick: () => setUploadModalOpen(true),
                      icon: <Plus className="w-4 h-4" />,
                    }
                  : undefined
              }
              secondaryAction={
                isAdmin
                  ? {
                      label: "Tải file mẫu Excel",
                      onClick: downloadExcelTemplate,
                      icon: <Download className="w-4 h-4" />,
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map((t) => (
              <div
                key={t.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md hover:border-slate-300 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold"
                    >
                      {t.category || "Đánh giá chuyên môn"}
                    </Badge>
                    <span className="text-[11px] font-bold text-slate-400 font-mono">
                      {t.id}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                      {t.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed font-normal">
                      {t.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] text-slate-400 block font-medium">Thời gian</span>
                      <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {t.timeLimitMinutes}p
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-blue-50">
                      <span className="text-[10px] text-blue-500 block font-medium">Câu hỏi</span>
                      <span className="text-xs font-bold text-blue-700 mt-0.5 block">
                        {t.totalQuestions} câu
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-emerald-50">
                      <span className="text-[10px] text-emerald-600 block font-medium">Thang điểm</span>
                      <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                        {t.totalPoints} đ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => onStartExam(t)}
                    className="flex-1 rounded-xl bg-[#1057FB] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-2xs gap-1.5 h-9"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Bắt đầu làm bài
                  </Button>

                  {isAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Bạn có chắc chắn muốn xóa đề thi "${t.title}"?`)) {
                          const updated = tests.filter((item) => item.id !== t.id)
                          saveStoredTests(updated)
                          setTests(updated)
                          toast.success("Đã xóa đề thi!")
                        }
                      }}
                      className="rounded-xl border-slate-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs px-2.5 h-9 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. PHẦN DƯỚI: UNIFIED CONTAINER CARD MATCHING 'TASK CỦA TÔI' */}
      <section className="space-y-3 pt-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-4 h-4 text-purple-600" />
            Lịch sử điểm & Kết quả bài thi ({filteredSubmissions.length})
          </h2>
          <p className="text-xs text-slate-500">
            Xem lại chi tiết bài làm, đáp án trắc nghiệm và nhận xét tự luận
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          
          {/* Unified Filter & Toolbar Bar */}
          <div className="p-4 sm:px-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-96 lg:w-[460px] max-w-xl">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên nhân sự, email, squad hoặc đề thi..."
                startIcon={<Search className="w-4 h-4 text-slate-400" />}
                className="h-10 text-xs sm:text-sm bg-white rounded-xl border-slate-200 shadow-2xs w-full"
              />
            </div>

            {/* Right: Filter status switcher + Excel export */}
            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
              <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("pending")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === "pending"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Chờ chấm tự luận
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("completed")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === "completed"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Đã hoàn thành
                </button>
              </div>

              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSubmissionsExcel}
                  className="h-10 text-xs gap-1.5 bg-white border-slate-200 rounded-xl text-slate-600 font-semibold cursor-pointer shrink-0 shadow-2xs hover:bg-slate-50"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Xuất Excel</span>
                </Button>
              )}
            </div>
          </div>

          {/* Submissions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200/80 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Thí sinh / Nhân sự</th>
                  <th className="py-3.5 px-6">Tên đề thi</th>
                  <th className="py-3.5 px-6">Thời gian nộp</th>
                  <th className="py-3.5 px-4 text-center">Trắc nghiệm</th>
                  <th className="py-3.5 px-4 text-center">Tự luận</th>
                  <th className="py-3.5 px-4 text-center">Tổng điểm</th>
                  <th className="py-3.5 px-6">Trạng thái</th>
                  <th className="py-3.5 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center bg-white">
                      <EmptyState
                        title="Chưa có bài nộp nào"
                        description="Không tìm thấy kết quả bài làm nào phù hợp với bộ lọc hiện tại. Hãy thử thay đổi từ khóa hoặc xóa bộ lọc."
                        secondaryAction={
                          searchQuery || statusFilter !== "all"
                            ? {
                                label: "Đặt lại bộ lọc",
                                onClick: () => {
                                  setSearchQuery("")
                                  setStatusFilter("all")
                                },
                                icon: <RefreshCw className="w-4 h-4" />,
                              }
                            : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedSubmissions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={s.userName} size="sm" />
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{s.userName}</p>
                            <p className="text-[11px] text-slate-400">{s.userEmail}</p>
                            {s.userSquad && (
                              <span className="inline-block mt-0.5 text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.2 rounded">
                                {s.userSquad}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-6 max-w-xs">
                        <p className="font-semibold text-slate-800 truncate">{s.testTitle}</p>
                        <span className="text-[10px] text-slate-400">
                          Thời gian làm: {Math.round(s.timeSpentSeconds / 60)} phút
                        </span>
                      </td>

                      <td className="py-3.5 px-6 text-[11px] text-slate-500">
                        {s.submittedAt}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-blue-700">
                        {s.scoreMcq} đ
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-purple-700">
                        {s.status === "Đã hoàn thành" ? `${s.scoreEssay} đ` : "—"}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-black text-slate-900 text-sm">
                          {s.totalScore}
                        </span>
                        <span className="text-[11px] text-slate-400">/{s.maxScore}</span>
                      </td>

                      <td className="py-3.5 px-6">
                        <Badge
                          variant="outline"
                          className={
                            s.status === "Đã hoàn thành"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold"
                              : "bg-amber-50 text-amber-800 border-amber-200 text-[11px] font-semibold"
                          }
                        >
                          {s.status}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        {isAdmin && s.status === "Chờ chấm tự luận" ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setSelectedSubmission(s)}
                            className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer shadow-2xs gap-1.5 h-8"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Chấm bài ngay
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSubmission(s)}
                            className="rounded-xl border-slate-200 hover:bg-slate-50 text-xs font-semibold cursor-pointer gap-1.5 h-8"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            Xem điểm & Lời giải
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer Matching Task của tôi */}
          <div className="p-4 px-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Số dòng mỗi trang:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:border-[#1057FB] shadow-2xs transition-colors"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                {totalItems === 0
                  ? "0 – 0 trên 0"
                  : `${startIndex + 1} – ${Math.min(startIndex + rowsPerPage, totalItems)} trên ${totalItems}`}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1
                  const isActive = pageNum === currentPage
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Upload Modal */}
      <TestUploadModal
        open={uploadModalOpen}
        creatorName={currentUserName || "Admin"}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={(newTest) => {
          setTests((prev) => [newTest, ...prev])
          toast.success("Tạo đề thi mới thành công!", `Đề thi "${newTest.title}" đã sẵn sàng.`)
        }}
      />

      {/* Review Answers & Grade Modal */}
      <GradeEssayModal
        open={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        submission={selectedSubmission}
        adminName={currentUserName}
        isAdmin={isAdmin}
        onGraded={(updated) => {
          setSubmissions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        }}
      />

    </div>
  )
}
