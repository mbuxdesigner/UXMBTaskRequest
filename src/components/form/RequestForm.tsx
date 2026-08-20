import { useState, useEffect } from "react"
import {
  Squad,
  recommendSquad,
} from "../../data/mockData"
import { submitRequest, fetchFormSelections } from "../../api/api"
import {
  SelectionsData,
  FALLBACK_SELECTIONS,
} from "../../services/googleSheetService"
import {
  getStoredSession,
  getUserInitials,
  UserSession,
} from "../../services/otpAuthService"
import { DropdownMenu, DropdownOption } from "@/components/reui/dropdown-menu"
import { DatePicker } from "@/components/reui/date-picker"
import FileUpload from "./FileUpload"
import RequestReviewSheet from "./RequestReviewSheet"
import SuccessCelebrationCard from "./SuccessCelebrationCard"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { SpotlightCard } from "@/components/jolyui/spotlight-card"
import { BorderBeam } from "@/components/jolyui/border-beam"
import { ShimmerButton } from "@/components/jolyui/shimmer-button"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Link as LinkIcon,
  Paperclip,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Database,
  User,
  Send,
  HelpCircle,
  Clock,
  ShieldCheck,
  Check,
  Plus,
  Trash2,
  Edit3,
  FileText,
  FileCheck,
  ArrowLeft,
  X,
} from "lucide-react"

interface RequestFormProps {
  squads: Squad[]
}

interface FormState {
  title: string
  requester_email: string
  product: string
  request_type: string
  description: string
  business_need: string
  user_problem: string
  target_user: string
  release_date: string
  deadline_reason: string
  preferred_squad: string
  doc_links: string[]
  leader_report_note: string
  expected_output: string[]
}

export default function RequestForm({ squads }: RequestFormProps) {
  const [session, setSession] = useState<UserSession | null>(getStoredSession())
  const [attachMode, setAttachMode] = useState<"link" | "file">("link")
  const [files, setFiles] = useState<File[]>([])
  const [viewMode, setViewMode] = useState<"edit" | "review" | "success">("edit")
  const [submitLoading, setSubmitLoading] = useState(false)
  const [requestId, setRequestId] = useState("")
  const [sheetLogResult, setSheetLogResult] = useState<{ success: boolean; message: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loadingSelections, setLoadingSelections] = useState(true)

  // Dynamic selections from Google Sheet
  const [selections, setSelections] = useState<SelectionsData>(FALLBACK_SELECTIONS)

  const [form, setForm] = useState<FormState>({
    title: "",
    requester_email: session?.teamsEmail || session?.personalEmail || "",
    product: "",
    request_type: "",
    description: "",
    business_need: "",
    user_problem: "",
    target_user: "",
    release_date: "",
    deadline_reason: "",
    preferred_squad: "",
    doc_links: [""],
    leader_report_note: "",
    expected_output: ["Wireframe", "Prototype tương tác"],
  })

  useEffect(() => {
    const cur = getStoredSession()
    setSession(cur)
    if (cur) {
      setForm((f) => ({
        ...f,
        requester_email: cur.teamsEmail || cur.personalEmail,
      }))
    }
  }, [])

  useEffect(() => {
    setLoadingSelections(true)
    fetchFormSelections()
      .then(setSelections)
      .finally(() => setTimeout(() => setLoadingSelections(false), 200))
  }, [])

  const set = (field: keyof FormState) => (val: any) => {
    setForm((f) => ({ ...f, [field]: val }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // Quản lý nhiều link tài liệu
  const handleLinkChange = (index: number, val: string) => {
    const newLinks = [...form.doc_links]
    newLinks[index] = val
    set("doc_links")(newLinks)
  }

  const handleAddLink = () => {
    set("doc_links")([...form.doc_links, ""])
  }

  const handleRemoveLink = (index: number) => {
    if (form.doc_links.length <= 1) {
      set("doc_links")([""])
      return
    }
    const newLinks = form.doc_links.filter((_, i) => i !== index)
    set("doc_links")(newLinks)
  }

  const rec = recommendSquad(form.product)

  // Validate form
  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = "Vui lòng nhập tiêu đề yêu cầu"
    if (!form.product) e.product = "Vui lòng chọn nền tảng / sản phẩm"
    if (!form.request_type) e.request_type = "Vui lòng chọn loại yêu cầu"
    if (!form.description.trim()) e.description = "Vui lòng mô tả chi tiết yêu cầu"
    if (!form.release_date) e.release_date = "Vui lòng chọn ngày release dự kiến"

    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Khi bấm "Gửi yêu cầu UX" ở màn hình nhập -> Chuyển sang màn Review
  const handleProceedToReview = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    setViewMode("review")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Khi bấm "Xác nhận & Gửi chính thức" ở màn Review -> Gửi lên Google Sheet
  const handleFinalSubmit = async () => {
    setSubmitLoading(true)
    const finalEmail = session?.teamsEmail || form.requester_email || "user@mbbank.com.vn"
    const validLinks = form.doc_links.filter((l) => l.trim().length > 0)

    try {
      const res = await submitRequest({
        ...form,
        doc_link: validLinks.join("\n"),
        requester_email: finalEmail,
        requester_name: session?.displayName || "PO",
        preferred_squad: form.product,
      })
      setRequestId(res.requestId)
      setSheetLogResult(res.googleSheetResult)
      setViewMode("success")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {
      setViewMode("edit")
    } finally {
      setSubmitLoading(false)
    }
  }

  // Options for custom ReUI dropdowns
  const productOptions: DropdownOption[] = selections.products.map((p) => ({
    value: p,
    label: p,
  }))

  const requestTypeOptions: DropdownOption[] = selections.request_types.map((rt) => ({
    value: rt,
    label: rt,
  }))

  const deadlineReasonOptions: DropdownOption[] = [
    { value: "", label: "Chọn lý do..." },
    ...selections.deadline_reasons.map((dr) => ({
      value: dr,
      label: dr,
    })),
  ]

  if (loadingSelections) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-8">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  // ==========================================
  // MÀN HÌNH 3: THÀNH CÔNG (SUCCESS SCREEN)
  // ==========================================
  if (viewMode === "success") {
    return (
      <SuccessCelebrationCard
        requestId={requestId}
        squad={rec}
        syncMessage={sheetLogResult?.message}
        onCreateAnother={() => {
          setForm({
            title: "",
            requester_email: session?.teamsEmail || session?.personalEmail || "",
            product: "",
            request_type: "",
            description: "",
            business_need: "",
            user_problem: "",
            target_user: "",
            release_date: "",
            deadline_reason: "",
            preferred_squad: "",
            doc_links: [""],
            leader_report_note: "",
            expected_output: ["Wireframe", "Prototype tương tác"],
          })
          setFiles([])
          setViewMode("edit")
          setErrors({})
        }}
        onGoToTrack={() => {
          window.location.hash = "#track"
          window.dispatchEvent(new HashChangeEvent("hashchange"))
        }}
      />
    )
  }

  const validLinks = form.doc_links.filter((l) => l.trim().length > 0)

  // ==========================================
  // MÀN HÌNH 1: FORM NHẬP YÊU CẦU (EDIT SCREEN)
  // ==========================================
  const hostName = session?.displayName || "Trần Hoàng Long"

  return (
    <form onSubmit={handleProceedToReview} className="space-y-8 pb-16">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Main Form Content (8 Cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Main Title */}
          <div className="border-b border-slate-200/80 pb-5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Gửi yêu cầu UX
            </h1>
          </div>

          {/* 01 · THÔNG TIN YÊU CẦU */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              01 · THÔNG TIN YÊU CẦU
            </h2>

            {/* Tiêu đề yêu cầu */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Tiêu đề yêu cầu <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                value={form.title}
                onChange={(e) => set("title")(e.target.value)}
                placeholder="VD: Thiết kế lại màn hình chuyển tiền quốc tế"
                className="h-12 bg-white rounded-xl border-slate-200/90 text-sm px-4 focus:border-[#1E5AF6]"
                error={Boolean(errors.title)}
              />
              {errors.title && <p className="text-sm text-rose-500 font-medium">{errors.title}</p>}
            </div>

            {/* 2-Column: Nền tảng / Sản phẩm & Loại yêu cầu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Nền tảng / Sản phẩm <span className="text-rose-500">*</span>
                </label>
                <DropdownMenu
                  options={productOptions}
                  value={form.product}
                  onChange={(val) => set("product")(val)}
                  placeholder="Chọn nền tảng..."
                  className="w-full"
                  buttonClassName={`w-full h-12 bg-slate-100/70 hover:bg-slate-100 border-slate-200/60 rounded-xl px-4 justify-between font-semibold text-slate-800 ${
                    errors.product ? "border-rose-400 ring-1 ring-rose-200" : ""
                  }`}
                />
                {errors.product && <p className="text-sm text-rose-500 font-medium">{errors.product}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Loại yêu cầu <span className="text-rose-500">*</span>
                </label>
                <DropdownMenu
                  options={requestTypeOptions}
                  value={form.request_type}
                  onChange={(val) => set("request_type")(val)}
                  placeholder="Chọn loại yêu cầu..."
                  className="w-full"
                  buttonClassName={`w-full h-12 bg-slate-100/70 hover:bg-slate-100 border-slate-200/60 rounded-xl px-4 justify-between font-semibold text-slate-800 ${
                    errors.request_type ? "border-rose-400 ring-1 ring-rose-200" : ""
                  }`}
                />
                {errors.request_type && <p className="text-sm text-rose-500 font-medium">{errors.request_type}</p>}
              </div>
            </div>
          </div>

          {/* 02 · MÔ TẢ CHI TIẾT NHU CẦU CẦN UX TEAM HỖ TRỢ */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              02 · MÔ TẢ CHI TIẾT NHU CẦU CẦN UX TEAM HỖ TRỢ
            </h2>

            {/* Mô tả yêu cầu */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Mô tả yêu cầu <span className="text-rose-500">*</span>
              </label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
                placeholder="Mô tả chi tiết nhu cầu cần UX team hỗ trợ..."
                rows={5}
                className="bg-white rounded-xl border-slate-200/90 p-4 text-sm focus:border-[#1E5AF6]"
                error={Boolean(errors.description)}
              />
              {errors.description && <p className="text-sm text-rose-500 font-medium">{errors.description}</p>}
            </div>

            {/* 2-Column: Tại sao yêu cầu này cần thiết & Vấn đề người dùng cần giải quyết */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Tại sao yêu cầu này cần thiết?
                </label>
                <Textarea
                  value={form.business_need}
                  onChange={(e) => set("business_need")(e.target.value)}
                  placeholder="Vấn đề kinh doanh bạn đang muốn giải quyết là gì?"
                  rows={3}
                  className="bg-white rounded-xl border-slate-200/90 p-3.5 text-sm focus:border-[#1E5AF6]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Vấn đề người dùng cần giải quyết
                </label>
                <Textarea
                  value={form.user_problem}
                  onChange={(e) => set("user_problem")(e.target.value)}
                  placeholder="Điểm đau hoặc nhu cầu chưa được đáp ứng của người dùng..."
                  rows={3}
                  className="bg-white rounded-xl border-slate-200/90 p-3.5 text-sm focus:border-[#1E5AF6]"
                />
              </div>
            </div>

            {/* Đối tượng người dùng mục tiêu */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Đối tượng người dùng mục tiêu
              </label>
              <Input
                type="text"
                value={form.target_user}
                onChange={(e) => set("target_user")(e.target.value)}
                placeholder="VD: Khách hàng retail banking, độ tuổi 25-45"
                className="h-12 bg-white rounded-2xl border-slate-200/90 text-sm px-4 focus:border-[#1E5AF6]"
              />
            </div>
          </div>

          {/* 03 · TÀI LIỆU ĐÍNH KÈM */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                03 · TÀI LIỆU ĐÍNH KÈM
              </h2>

              {/* Segmented Pill Toggle: Gửi link tài liệu | Tải file lên */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setAttachMode("link")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    attachMode === "link"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Gửi link tài liệu
                </button>
                <button
                  type="button"
                  onClick={() => setAttachMode("file")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    attachMode === "file"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Tải file lên
                </button>
              </div>
            </div>

            {/* Input Link (Multiple Links with + Button) or File Upload */}
            {attachMode === "link" ? (
              <div className="space-y-2.5">
                {form.doc_links.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="url"
                        value={link}
                        onChange={(e) => handleLinkChange(index, e.target.value)}
                        placeholder="https://docs.google.com/..."
                        startIcon={<LinkIcon className="w-4 h-4 text-slate-400" />}
                        className="h-12 bg-white rounded-2xl border-slate-200/90 text-sm pl-10 focus:border-[#1E5AF6]"
                      />
                    </div>
                    {form.doc_links.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(index)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                        title="Xóa link này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {/* + Button gắn thêm link */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLink}
                  className="gap-1.5 text-xs sm:text-sm font-semibold rounded-xl border-dashed border-slate-300 hover:border-[#1E5AF6] hover:text-[#1E5AF6] bg-white h-9 px-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm liên kết tài liệu khác</span>
                </Button>
              </div>
            ) : (
              <FileUpload files={files} onFilesChange={setFiles} />
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: KẾ HOẠCH Floating Card with Joly UI SpotlightCard & BorderBeam */}
        <div className="lg:col-span-4 sticky top-6">
          <SpotlightCard
            className="bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/5 relative"
          >
            <BorderBeam colorFrom="#1057FB" colorTo="#0D9B97" duration={7} />
            
            <div className="p-6 sm:p-7 space-y-6 relative z-20">
              {/* Card Header */}
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 line-clamp-3 break-words leading-snug">
                  {form.title ? form.title : "Tên yêu cầu"}
                </h3>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
                  <span>Người gửi</span>
                  {session?.avatarUrl ? (
                    <img
                      src={session.avatarUrl}
                      alt={hostName}
                      className="w-5 h-5 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#1B3A6B] text-white text-[10px] font-bold flex items-center justify-center">
                      {getUserInitials(hostName)}
                    </div>
                  )}
                  <span className="font-semibold text-slate-900">{hostName}</span>
                </div>
              </div>

              {/* Ô CHỌN 1: Ngày release dự kiến (Nguyên khối chuẩn Figma / ReUI) */}
              <div className="space-y-1">
                <DatePicker
                  label="Ngày release dự kiến *"
                  icon={<Calendar className="w-5 h-5" />}
                  value={form.release_date}
                  onChange={(val) => set("release_date")(val)}
                  placeholder="Chọn ngày..."
                  className="w-full"
                />
                {errors.release_date && <p className="text-sm text-rose-500 font-medium pl-1">{errors.release_date}</p>}
              </div>

              {/* Ô CHỌN 2: Lý do thời hạn (CÙNG THIẾT KẾ NGUYÊN KHỐI 100%) */}
              <div className="space-y-1">
                <DropdownMenu
                  label="Lý do thời hạn này quan trọng?"
                  icon={<User className="w-5 h-5" />}
                  options={deadlineReasonOptions}
                  value={form.deadline_reason}
                  onChange={(val) => set("deadline_reason")(val)}
                  placeholder="Chọn lý do..."
                  className="w-full"
                />
              </div>

              {/* Kế hoạch báo cáo sắp tới */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Kế hoạch báo cáo sắp tới
                </label>
                <Textarea
                  value={form.leader_report_note}
                  onChange={(e) => set("leader_report_note")(e.target.value)}
                  placeholder="VD: Báo cáo sếp Mai Anh vào ngày 01/06"
                  rows={4}
                  className="bg-white rounded-xl border-slate-200/90 p-3.5 text-sm focus:border-[#1E5AF6]"
                />
              </div>

              {/* Submit Button -> ShimmerButton từ Joly UI */}
              <Button
                type="submit"
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-base rounded-lg shadow-md cursor-pointer"
              >
                Gửi yêu cầu UX
              </Button>

              {/* Footer Power by Tag */}
              <p className="text-[11px] text-slate-400 text-center font-medium">
                ® Powered by MB UX Team
              </p>
            </div>
          </SpotlightCard>
        </div>

      </div>

      {/* REUI APPLICATION SHEET-11: XÁC NHẬN THÔNG TIN ĐỀ BÀI */}
      <RequestReviewSheet
        open={viewMode === "review"}
        onClose={() => setViewMode("edit")}
        onConfirm={handleFinalSubmit}
        isSubmitting={submitLoading}
        form={form}
        recommendedSquad={rec}
        session={session}
      />
    </form>
  )
}
