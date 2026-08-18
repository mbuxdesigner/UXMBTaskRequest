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
import { getGoogleSheetConfig } from "../../config/googleSheetConfig"
import FileUpload from "./FileUpload"
import SquadRecommendation from "./SquadRecommendation"
import GoogleSheetSettingsModal from "../common/GoogleSheetSettingsModal"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { 
  Mail, 
  FileText, 
  Layers, 
  Calendar, 
  Link as LinkIcon, 
  Paperclip, 
  CheckCircle2, 
  Send, 
  Database, 
  Sparkles, 
  ArrowLeft, 
  Edit3, 
  Info,
  Check
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
  doc_link: string
}

const INIT: FormState = {
  title: "",
  requester_email: "",
  product: "",
  request_type: "",
  description: "",
  business_need: "",
  user_problem: "",
  target_user: "",
  release_date: "",
  deadline_reason: "",
  preferred_squad: "",
  doc_link: "",
}

type SubmitState = "idle" | "confirming" | "submitting" | "success"
type AttachMode = "link" | "file"

export default function RequestForm({ squads }: RequestFormProps) {
  const [form, setForm] = useState<FormState>(INIT)
  const [files, setFiles] = useState<File[]>([])
  const [attachMode, setAttachMode] = useState<AttachMode>("link")
  const [submitState, setSubmitState] = useState<SubmitState>("idle")
  const [requestId, setRequestId] = useState("")
  const [sheetLogResult, setSheetLogResult] = useState<{ success: boolean; message: string } | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>([])
  
  // Dynamic selections from Google Sheet
  const [selections, setSelections] = useState<SelectionsData>(FALLBACK_SELECTIONS)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [sheetConfigured, setSheetConfigured] = useState(false)

  useEffect(() => {
    fetchFormSelections().then((s) => {
      setSelections(s)
      const cfg = getGoogleSheetConfig()
      setSheetConfigured(Boolean(cfg.scriptUrl?.trim()))
    })
  }, [])

  const set = (field: keyof FormState) => (val: string) =>
    setForm((f) => ({ ...f, [field]: val }))

  const rec = recommendSquad(form.product)

  const toggleOutput = (opt: string) => {
    setSelectedOutputs((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    )
  }

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!form.requester_email.trim()) {
      e.requester_email = "Vui lòng nhập Email MB của bạn"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.requester_email.trim())) {
      e.requester_email = "Email không đúng định dạng (VD: name@mbbank.com.vn)"
    }
    if (!form.title.trim()) e.title = "Vui lòng nhập tiêu đề yêu cầu"
    if (!form.product) e.product = "Vui lòng chọn sản phẩm"
    if (!form.request_type) e.request_type = "Vui lòng chọn loại yêu cầu"
    if (!form.description.trim()) e.description = "Vui lòng mô tả yêu cầu"
    if (!form.business_need.trim()) e.business_need = "Vui lòng điền bối cảnh kinh doanh"
    if (!form.user_problem.trim()) e.user_problem = "Vui lòng điền vấn đề người dùng"
    if (!form.release_date) e.release_date = "Vui lòng chọn ngày release dự kiến"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (submitState === "idle") {
      if (!validate()) return
      setSubmitState("confirming")
      return
    }
    if (submitState === "confirming") {
      setSubmitState("submitting")
      try {
        const res = await submitRequest({
          ...form,
          preferred_squad: form.product,
          expected_output: selectedOutputs,
        })
        setRequestId(res.requestId)
        setSheetLogResult(res.googleSheetResult)
        setSubmitState("success")
      } catch {
        setSubmitState("confirming")
      }
    }
  }

  if (submitState === "success") {
    return (
      <Card className="max-w-xl mx-auto text-center p-8 shadow-lg border-slate-200">
        <CardContent className="p-0 space-y-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <Badge variant="success" size="default" className="mb-2">
              Yêu cầu đã tiếp nhận thành công
            </Badge>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-2">Mã Request ID chính thức</p>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">{requestId}</h2>
          </div>

          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Yêu cầu của bạn đã được chuyển tới UX Squad phụ trách. Bạn có thể dùng mã <strong className="text-slate-800">{requestId}</strong> hoặc email <strong className="text-slate-800">{form.requester_email}</strong> để theo dõi tiến độ thời gian thực.
          </p>

          <Alert variant="navy" icon={<Database className="w-4 h-4 text-navy" />}>
            <AlertTitle>Đồng bộ Google Sheet</AlertTitle>
            <AlertDescription>
              {sheetLogResult?.message || "Đã lưu bản ghi RAW JSON vào Google Sheet thành công."}
            </AlertDescription>
          </Alert>

          <Button
            variant="default"
            size="lg"
            onClick={() => {
              setForm(INIT)
              setFiles([])
              setSelectedOutputs([])
              setSubmitState("idle")
              setErrors({})
              setSheetLogResult(null)
            }}
            className="w-full sm:w-auto"
          >
            <Sparkles className="w-4 h-4 text-teal" />
            Tạo yêu cầu UX khác
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="space-y-6">
      {/* Header bar with Google Sheet Sync button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="navy" size="sm">Biểu mẫu</Badge>
            <span className="text-xs text-slate-400">Tiếp nhận yêu cầu UX</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">Gửi yêu cầu UX</h2>
          <p className="text-sm text-slate-500 mt-1">
            Mô tả chi tiết nhu cầu và bài toán trải nghiệm. UX team sẽ tiếp nhận và phản hồi sớm nhất.
          </p>
        </div>

        {/* Google Sheet Manager Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSettingsOpen(true)}
          className="self-start sm:self-auto gap-2"
        >
          <span className={`w-2 h-2 rounded-full ${sheetConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
          <span>Google Sheet API</span>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Group 1 — Thông tin người gửi & Sản phẩm */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-navy/10 text-navy flex items-center justify-center text-xs font-bold">1</span>
                Thông tin người gửi & Sản phẩm
              </CardTitle>
            </div>
            <CardDescription>
              Cung cấp email MB của bạn và phân hệ sản phẩm cần hỗ trợ thiết kế UX/UI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field 
                label="Email MB người yêu cầu" 
                required 
                error={errors.requester_email}
                hint="Dùng để nhận thông báo và tra cứu tiến độ"
              >
                <Input
                  type="email"
                  value={form.requester_email}
                  onChange={(e) => set("requester_email")(e.target.value)}
                  placeholder="name@mbbank.com.vn"
                  startIcon={<Mail className="w-4 h-4" />}
                  error={Boolean(errors.requester_email)}
                />
              </Field>

              <Field 
                label="Tiêu đề yêu cầu" 
                required 
                error={errors.title}
                hint="Tóm tắt ngắn gọn nhu cầu thiết kế"
              >
                <Input
                  type="text"
                  value={form.title}
                  onChange={(e) => set("title")(e.target.value)}
                  placeholder="VD: Thiết kế lại luồng Chuyển tiền quốc tế"
                  startIcon={<FileText className="w-4 h-4" />}
                  error={Boolean(errors.title)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field 
                label="Sản phẩm / Nền tảng" 
                required 
                error={errors.product}
                hint="Phân hệ này đồng thời là UX Squad phụ trách (1:1)"
              >
                <Select
                  value={form.product}
                  onChange={(e) => set("product")(e.target.value)}
                  startIcon={<Layers className="w-4 h-4" />}
                  error={Boolean(errors.product)}
                >
                  <option value="">-- Chọn sản phẩm / Phân hệ --</option>
                  {selections.products.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field 
                label="Loại yêu cầu" 
                required 
                error={errors.request_type}
                hint="Định loại công việc UX cần thực hiện"
              >
                <Select
                  value={form.request_type}
                  onChange={(e) => set("request_type")(e.target.value)}
                  error={Boolean(errors.request_type)}
                >
                  <option value="">-- Chọn loại yêu cầu --</option>
                  {selections.request_types.map((rt) => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* Smart Squad Recommendation Card */}
            {form.product && (
              <div className="pt-1">
                <SquadRecommendation
                  recommendedSquad={rec}
                  squads={squads}
                  preferredSquad={form.product}
                  onPreferredChange={() => {}}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group 2 — Chi tiết yêu cầu & Bối cảnh */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-navy/10 text-navy flex items-center justify-center text-xs font-bold">2</span>
              Chi tiết yêu cầu & Bài toán trải nghiệm
            </CardTitle>
            <CardDescription>
              Mô tả rõ ràng vấn đề người dùng gặp phải và kỳ vọng kinh doanh để UX Team đưa ra giải pháp chuẩn xác nhất.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field 
              label="Mô tả yêu cầu" 
              required 
              error={errors.description}
              hint="Chi tiết phạm vi công việc hoặc luồng trải nghiệm cần thực hiện"
            >
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
                placeholder="Mô tả cụ thể màn hình, hành trình hoặc tính năng cần thiết kế..."
                error={Boolean(errors.description)}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field 
                label="Bối cảnh kinh doanh & Mục tiêu" 
                required 
                error={errors.business_need}
                hint="Tại sao cần làm tính năng này? Chỉ số đo lường là gì?"
              >
                <Textarea
                  rows={3}
                  value={form.business_need}
                  onChange={(e) => set("business_need")(e.target.value)}
                  placeholder="VD: Tăng tỷ lệ hoàn thành giao dịch thêm 20%, giảm tỷ lệ drop-off..."
                  error={Boolean(errors.business_need)}
                />
              </Field>

              <Field 
                label="Vấn đề người dùng gặp phải" 
                required 
                error={errors.user_problem}
                hint="Khách hàng đang gặp khó khăn hay ma sát gì ở trải nghiệm hiện tại?"
              >
                <Textarea
                  rows={3}
                  value={form.user_problem}
                  onChange={(e) => set("user_problem")(e.target.value)}
                  placeholder="VD: Người dùng không hiểu cách nhập SWIFT code và biểu phí hiển thị không rõ..."
                  error={Boolean(errors.user_problem)}
                />
              </Field>
            </div>

            <Field 
              label="Đối tượng người dùng mục tiêu" 
              hint="Nhóm khách hàng chính sẽ sử dụng tính năng này (VD: Khách hàng Priority, Doanh nghiệp SME, GenZ...)"
            >
              <Input
                type="text"
                value={form.target_user}
                onChange={(e) => set("target_user")(e.target.value)}
                placeholder="VD: Toàn bộ khách hàng cá nhân sử dụng App MBBank"
              />
            </Field>
          </CardContent>
        </Card>

        {/* Group 3 — Output kỳ vọng & Thời hạn */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-navy/10 text-navy flex items-center justify-center text-xs font-bold">3</span>
              Output kỳ vọng & Kế hoạch thời hạn
            </CardTitle>
            <CardDescription>
              Lựa chọn sản phẩm bàn giao mong muốn từ UX Team và mốc thời gian release dự kiến.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2.5">
                Output kỳ vọng từ UX Team
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {selections.expected_outputs.map((opt) => {
                  const active = selectedOutputs.includes(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleOutput(opt)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                        active
                          ? "border-navy bg-navy text-white shadow-xs"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${active ? "bg-teal border-teal text-navy font-bold" : "border-slate-300 bg-white"}`}>
                        {active && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <span className="truncate">{opt}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <Field 
                label="Hạn release dự kiến" 
                required 
                error={errors.release_date}
                hint="Ngày dự kiến đưa tính năng lên môi trường Production"
              >
                <Input
                  type="date"
                  value={form.release_date}
                  onChange={(e) => set("release_date")(e.target.value)}
                  startIcon={<Calendar className="w-4 h-4" />}
                  error={Boolean(errors.release_date)}
                />
              </Field>

              <Field 
                label="Lý do mốc thời hạn" 
                hint="Căn cứ để UX Team sắp xếp thứ tự ưu tiên"
              >
                <Select
                  value={form.deadline_reason}
                  onChange={(e) => set("deadline_reason")(e.target.value)}
                >
                  <option value="">-- Chọn lý do thời hạn --</option>
                  {selections.deadline_reasons.map((dr) => (
                    <option key={dr} value={dr}>
                      {dr}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Group 4 — Tài liệu đính kèm */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-navy/10 text-navy flex items-center justify-center text-xs font-bold">4</span>
                Tài liệu đính kèm & Tham khảo
              </CardTitle>
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setAttachMode("link")}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    attachMode === "link" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <LinkIcon className="w-3 h-3" />
                  Link tài liệu
                </button>
                <button
                  type="button"
                  onClick={() => setAttachMode("file")}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    attachMode === "file" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Paperclip className="w-3 h-3" />
                  Tải file
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {attachMode === "link" ? (
              <Field hint="Dán link PRD, BRD, Confluence, Jira ticket hoặc tài liệu thiết kế tham khảo">
                <Input
                  type="url"
                  value={form.doc_link}
                  onChange={(e) => set("doc_link")(e.target.value)}
                  placeholder="https://jira.mbbank.com.vn/browse/... hoặc Google Drive link"
                  startIcon={<LinkIcon className="w-4 h-4" />}
                />
              </Field>
            ) : (
              <FileUpload files={files} onChange={setFiles} />
            )}
          </CardContent>
        </Card>

        {/* Confirmation card in review step */}
        {submitState === "confirming" && (
          <Card variant="accent" className="border-navy-200 animate-in fade-in-50 duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="navy">Xác nhận thông tin</Badge>
                <CardTitle className="text-sm">Kiểm tra thông tin trước khi gửi chính thức</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white/90 rounded-xl border border-slate-200/80">
                <div>
                  <p className="text-xs text-slate-400">Email người gửi</p>
                  <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{form.requester_email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Tiêu đề yêu cầu</p>
                  <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{form.title}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Squad phụ trách</p>
                  <p className="text-sm font-bold text-navy truncate mt-0.5">{form.product}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Hạn release</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {form.release_date ? new Date(form.release_date).toLocaleDateString("vi-VN") : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Info className="w-3.5 h-3.5 text-navy flex-shrink-0" />
                <span>Yêu cầu sẽ được tự động cấp mã chuẩn <strong>UXMB-xxx</strong> và log JSON lên Google Sheet.</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {submitState === "confirming" ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setSubmitState("idle")}
              className="gap-2 order-last sm:order-first w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại chỉnh sửa
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={handleSubmit}
            loading={submitState === "submitting"}
            className="gap-2 w-full sm:w-auto"
          >
            {submitState === "confirming" ? (
              <>
                <Send className="w-4 h-4 text-teal" />
                Xác nhận & Gửi yêu cầu
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-teal" />
                Gửi yêu cầu UX
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Google Sheet Sync Modal */}
      <GoogleSheetSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSynced={(newSelections) => {
          setSelections(newSelections)
          const cfg = getGoogleSheetConfig()
          setSheetConfigured(Boolean(cfg.scriptUrl?.trim()))
        }}
      />
    </section>
  )
}
