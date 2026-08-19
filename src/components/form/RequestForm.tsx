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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
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
  ArrowLeft
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
      <div className="max-w-xl mx-auto text-center p-8 sm:p-10 bg-white border border-slate-200 rounded-3xl shadow-xl my-8 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <Badge variant="success" size="default" className="mb-2 font-bold">
            Tiếp nhận yêu cầu thành công
          </Badge>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-3">Mã Request ID chính thức</p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#1B3A6B] mt-1 tracking-tight">{requestId}</h2>
        </div>

        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Yêu cầu đã được tự động phân loại và gửi đến <strong className="text-slate-900 font-bold">{rec?.squad_name || "UX Squad"}</strong>. Bạn có thể sử dụng mã tra cứu để xem tiến độ trực tiếp.
        </p>

        <Alert variant="primary" icon={<Database className="w-4.5 h-4.5 text-[#1B3A6B]" />}>
          <AlertTitle className="font-bold">Hệ thống đồng bộ</AlertTitle>
          <AlertDescription>
            {sheetLogResult?.message || "Đã ghi nhận dữ liệu vào Google Sheet trung tâm thành công."}
          </AlertDescription>
        </Alert>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
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
            className="w-full sm:w-auto gap-2 bg-[#1E5AF6] hover:bg-[#1546CC] font-bold rounded-xl"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>Tạo thêm yêu cầu mới</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto rounded-xl"
          >
            <span>Về màn hình chính</span>
          </Button>
        </div>
      </div>
    )
  }

  // ==========================================
  // MÀN HÌNH 2: XEM LẠI & REVIEW YÊU CẦU
  // ==========================================
  if (viewMode === "review") {
    const validLinks = form.doc_links.filter((l) => l.trim().length > 0)
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Header Review */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="navy" size="xs">Bước kiểm tra cuối</Badge>
              <span className="text-xs text-slate-400 font-medium">Xác nhận thông tin đề bài</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Xem lại hồ sơ yêu cầu UX
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Vui lòng kiểm tra lại các nội dung trước khi gửi chính thức đến Squad UX.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("edit")}
              className="gap-1.5 rounded-xl font-bold text-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Chỉnh sửa lại</span>
            </Button>
          </div>
        </div>

        {/* Review Card Details */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          
          {/* Mục 1: Thông tin chung */}
          <div className="space-y-3 pb-6 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1E5AF6]" />
              01 · Thông tin chung
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="sm:col-span-2">
                <span className="text-xs text-slate-400 block font-medium">Tiêu đề bài toán:</span>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">{form.title}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Sản phẩm / Nền tảng:</span>
                <p className="font-bold text-slate-800 mt-0.5">{form.product}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Loại yêu cầu:</span>
                <p className="font-bold text-slate-800 mt-0.5">{form.request_type}</p>
              </div>
            </div>
          </div>

          {/* Mục 2: Chi tiết bài toán UX */}
          <div className="space-y-4 pb-6 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1E5AF6]" />
              02 · Bối cảnh & Chi tiết bài toán
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Mô tả nhu cầu UX:</span>
                <div className="mt-1 p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {form.description}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Tại sao yêu cầu này cần thiết:</span>
                  <div className="mt-1 p-3 bg-slate-50 border border-slate-200/70 rounded-2xl text-slate-700 text-xs leading-relaxed">
                    {form.business_need || "Không có"}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Vấn đề người dùng cần giải quyết:</span>
                  <div className="mt-1 p-3 bg-slate-50 border border-slate-200/70 rounded-2xl text-slate-700 text-xs leading-relaxed">
                    {form.user_problem || "Không có"}
                  </div>
                </div>
              </div>
              {form.target_user && (
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Đối tượng người dùng mục tiêu:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{form.target_user}</p>
                </div>
              )}
            </div>
          </div>

          {/* Mục 3: Tài liệu đính kèm */}
          <div className="space-y-3 pb-6 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-[#1E5AF6]" />
              03 · Tài liệu đính kèm ({validLinks.length} liên kết)
            </h3>
            {validLinks.length > 0 ? (
              <div className="space-y-2">
                {validLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                    <LinkIcon className="w-3.5 h-3.5 text-[#1E5AF6] shrink-0" />
                    <a href={link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate font-medium">
                      {link}
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Chưa đính kèm liên kết tài liệu.</p>
            )}
          </div>

          {/* Mục 4: Kế hoạch & Thời hạn */}
          <div className="space-y-3 pb-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1E5AF6]" />
              04 · Kế hoạch & Thời hạn
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-blue-50/40 p-4 rounded-2xl border border-blue-100">
              <div>
                <span className="text-xs text-slate-500 block font-medium">Ngày release dự kiến:</span>
                <p className="text-base font-extrabold text-[#1B3A6B] mt-0.5">{form.release_date}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Lý do thời hạn:</span>
                <p className="font-bold text-slate-800 mt-0.5">{form.deadline_reason || "Chưa xác định"}</p>
              </div>
              {form.leader_report_note && (
                <div className="sm:col-span-2 pt-2 border-t border-blue-100/80">
                  <span className="text-xs text-slate-500 block font-medium">Kế hoạch báo cáo Lãnh đạo:</span>
                  <p className="text-slate-800 text-xs mt-0.5 font-semibold">{form.leader_report_note}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setViewMode("edit")}
              className="w-full sm:w-auto gap-2 rounded-2xl font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại chỉnh sửa</span>
            </Button>

            <Button
              type="button"
              size="lg"
              loading={submitLoading}
              disabled={submitLoading}
              onClick={handleFinalSubmit}
              className="w-full sm:w-auto px-8 h-12 bg-[#1E5AF6] hover:bg-[#1546CC] text-white font-bold rounded-2xl shadow-md gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Xác nhận & Gửi chính thức</span>
            </Button>
          </div>

        </div>
      </div>
    )
  }

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
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Gửi yêu cầu UX
            </h1>
          </div>

          {/* 01 · THÔNG TIN YÊU CẦU */}
          <div className="space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              01 · THÔNG TIN YÊU CẦU
            </h2>

            {/* Tiêu đề yêu cầu */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                TIÊU ĐỀ YÊU CẦU <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                value={form.title}
                onChange={(e) => set("title")(e.target.value)}
                placeholder="VD: Thiết kế lại màn hình chuyển tiền quốc tế"
                className="h-12 bg-white rounded-2xl border-slate-200/90 text-sm px-4 focus:border-[#1E5AF6]"
                error={Boolean(errors.title)}
              />
              {errors.title && <p className="text-xs text-rose-500 font-semibold">{errors.title}</p>}
            </div>

            {/* 2-Column: Nền tảng / Sản phẩm & Loại yêu cầu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Nền tảng / Sản phẩm <span className="text-rose-500">*</span>
                </label>
                <DropdownMenu
                  options={productOptions}
                  value={form.product}
                  onChange={(val) => set("product")(val)}
                  placeholder="Chọn nền tảng..."
                  className="w-full"
                  buttonClassName={`w-full h-12 bg-slate-100/70 hover:bg-slate-100 border-slate-200/60 rounded-2xl px-4 justify-between font-bold text-slate-800 ${
                    errors.product ? "border-rose-400 ring-1 ring-rose-200" : ""
                  }`}
                />
                {errors.product && <p className="text-xs text-rose-500 font-semibold">{errors.product}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Loại yêu cầu <span className="text-rose-500">*</span>
                </label>
                <DropdownMenu
                  options={requestTypeOptions}
                  value={form.request_type}
                  onChange={(val) => set("request_type")(val)}
                  placeholder="Chọn loại yêu cầu..."
                  className="w-full"
                  buttonClassName={`w-full h-12 bg-slate-100/70 hover:bg-slate-100 border-slate-200/60 rounded-2xl px-4 justify-between font-bold text-slate-800 ${
                    errors.request_type ? "border-rose-400 ring-1 ring-rose-200" : ""
                  }`}
                />
                {errors.request_type && <p className="text-xs text-rose-500 font-semibold">{errors.request_type}</p>}
              </div>
            </div>
          </div>

          {/* 02 · Mô tả chi tiết nhu cầu cần UX team hỗ trợ */}
          <div className="space-y-4 pt-2">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              02 · Mô tả chi tiết nhu cầu cần UX team hỗ trợ
            </h2>

            {/* Mô tả yêu cầu */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                MÔ TẢ YÊU CẦU <span className="text-rose-500">*</span>
              </label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
                placeholder="Mô tả chi tiết nhu cầu cần UX team hỗ trợ..."
                rows={5}
                className="bg-white rounded-2xl border-slate-200/90 p-4 text-sm focus:border-[#1E5AF6]"
                error={Boolean(errors.description)}
              />
              {errors.description && <p className="text-xs text-rose-500 font-semibold">{errors.description}</p>}
            </div>

            {/* 2-Column: Tại sao yêu cầu này cần thiết & Vấn đề người dùng cần giải quyết */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  TẠI SAO YÊU CẦU NÀY CẦN THIẾT?
                </label>
                <Textarea
                  value={form.business_need}
                  onChange={(e) => set("business_need")(e.target.value)}
                  placeholder="Vấn đề kinh doanh bạn đang muốn giải quyết là gì?"
                  rows={3}
                  className="bg-white rounded-2xl border-slate-200/90 p-3.5 text-xs focus:border-[#1E5AF6]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  VẤN ĐỀ NGƯỜI DÙNG CẦN GIẢI QUYẾT
                </label>
                <Textarea
                  value={form.user_problem}
                  onChange={(e) => set("user_problem")(e.target.value)}
                  placeholder="Điểm đau hoặc nhu cầu chưa được đáp ứng của người dùng..."
                  rows={3}
                  className="bg-white rounded-2xl border-slate-200/90 p-3.5 text-xs focus:border-[#1E5AF6]"
                />
              </div>
            </div>

            {/* Đối tượng người dùng mục tiêu */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                ĐỐI TƯỢNG NGƯỜI DÙNG MỤC TIÊU
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
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                03 · TÀI LIỆU ĐÍNH KÈM
              </h2>

              {/* Segmented Pill Toggle: Gửi link tài liệu | Tải file lên */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setAttachMode("link")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  className="gap-1.5 text-xs font-bold rounded-xl border-dashed border-slate-300 hover:border-[#1E5AF6] hover:text-[#1E5AF6] bg-white h-9 px-3"
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

        {/* RIGHT COLUMN: KẾ HOẠCH Floating Card (4 Cols - Identical UI for Both Fields) */}
        <div className="lg:col-span-4 sticky top-6">
          <div
            className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 space-y-6"
            style={{ boxShadow: "0 40px 32px -24px rgba(15, 15, 15, 0.12)" }}
          >
            
            {/* Card Header */}
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                KẾ HOẠCH
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                <span>Hosted by</span>
                {session?.avatarUrl ? (
                  <img
                    src={session.avatarUrl}
                    alt={hostName}
                    className="w-5 h-5 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#1B3A6B] text-white text-[9px] font-bold flex items-center justify-center">
                    {getUserInitials(hostName)}
                  </div>
                )}
                <span className="font-bold text-slate-900">{hostName}</span>
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
              {errors.release_date && <p className="text-xs text-rose-500 font-semibold pl-1">{errors.release_date}</p>}
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                KẾ HOẠCH BÁO CÁO SẮP TỚI
              </label>
              <Textarea
                value={form.leader_report_note}
                onChange={(e) => set("leader_report_note")(e.target.value)}
                placeholder="VD: Báo cáo sếp Mai Anh vào ngày 01/06"
                rows={4}
                className="bg-white rounded-2xl border-slate-200/90 p-3.5 text-xs focus:border-[#1E5AF6]"
              />
            </div>

            {/* Submit Button -> Chuyển sang màn Review */}
            <Button
              type="submit"
              className="w-full h-12 rounded-2xl bg-[#1E5AF6] hover:bg-[#1546CC] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <span>Gửi yêu cầu UX</span>
            </Button>

            {/* Footer Power by Tag */}
            <p className="text-[11px] text-slate-400 text-center font-medium">
              ® Power by MB UXTeam
            </p>

          </div>
        </div>

      </div>
    </form>
  )
}
