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

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

const inputCls =
  "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-colors"

export default function RequestForm({ squads }: RequestFormProps) {
  const [form, setForm] = useState<FormState>(INIT)
  const [files, setFiles] = useState<File[]>([])
  const [attachMode, setAttachMode] = useState<AttachMode>("link")
  const [submitState, setSubmitState] = useState<SubmitState>("idle")
  const [requestId, setRequestId] = useState("")
  const [sheetLogResult, setSheetLogResult] = useState<{ success: boolean; message: string } | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  
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
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-lg mx-auto">
        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13L9 17L19 7"
              stroke="#10B981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
          Yêu cầu đã được gửi
        </p>
        <h3 className="font-bold text-3xl text-slate-900 mb-1">{requestId}</h3>
        <p className="text-sm text-slate-500 mt-3 mb-2">
          Yêu cầu của bạn đã được UX team tiếp nhận. Bạn có thể dùng mã trên hoặc email{" "}
          <strong className="text-slate-800">{form.requester_email}</strong> để tra cứu tiến độ.
        </p>

        {/* Google Sheet Log status alert */}
        <div className="my-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs">
          <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Trạng thái ghi log Google Sheet:
          </p>
          <p className="text-slate-600">
            {sheetLogResult?.message || "Đã lưu bản ghi JSON vào hệ thống."}
          </p>
        </div>

        <button
          onClick={() => {
            setForm(INIT)
            setFiles([])
            setSubmitState("idle")
            setErrors({})
            setSheetLogResult(null)
          }}
          className="px-5 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
        >
          Gửi yêu cầu khác
        </button>
      </div>
    )
  }

  return (
    <section>
      {/* Header bar with Google Sheet Sync button */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gửi yêu cầu UX</h2>
          <p className="text-sm text-slate-500 mt-1.5">
            Mô tả nhu cầu của bạn. UX team sẽ xem xét và phản hồi trong thời gian sớm nhất.
          </p>
        </div>

        {/* Google Sheet Manager Button */}
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs self-start sm:self-auto"
        >
          <span className={`w-2 h-2 rounded-full ${sheetConfigured ? "bg-emerald-500" : "bg-amber-400"}`} />
          <span>Quản lý Selections từ Google Sheet</span>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-slate-400">
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="space-y-6">
        {/* Group 1 — Thông tin yêu cầu */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            01 · Thông tin người gửi & Yêu cầu
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Email MB người yêu cầu" required hint="Email MB để liên hệ và tra cứu tiến độ">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M2 3.5H14C14.55 3.5 15 3.95 15 4.5V11.5C15 12.05 14.55 12.5 14 12.5H2C1.45 12.5 1 12.05 1 11.5V4.5C1 3.95 1.45 3.5 2 3.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14.5 4L8 8.5L1.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={form.requester_email}
                  onChange={(e) => set("requester_email")(e.target.value)}
                  placeholder="VD: hoanten@mbbank.com.vn"
                  className={inputCls + " pl-8.5"}
                />
              </div>
              {errors.requester_email && (
                <p className="text-xs text-red-500 mt-1">{errors.requester_email}</p>
              )}
            </Field>

            <Field label="Tiêu đề yêu cầu" required>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set("title")(e.target.value)}
                placeholder="VD: Thiết kế lại màn hình chuyển tiền quốc tế"
                className={inputCls}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Nền tảng / Sản phẩm" required hint="Dữ liệu đồng bộ từ Google Sheet">
              <select
                value={form.product}
                onChange={(e) => set("product")(e.target.value)}
                className={inputCls}
              >
                <option value="">Chọn nền tảng…</option>
                {selections.products.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {errors.product && <p className="text-xs text-red-500 mt-1">{errors.product}</p>}
            </Field>

            <Field label="Loại yêu cầu" required hint="Dữ liệu đồng bộ từ Google Sheet">
              <select
                value={form.request_type}
                onChange={(e) => set("request_type")(e.target.value)}
                className={inputCls}
              >
                <option value="">Chọn loại yêu cầu…</option>
                {selections.request_types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.request_type && (
                <p className="text-xs text-red-500 mt-1">{errors.request_type}</p>
              )}
            </Field>
          </div>

          <Field label="Mô tả yêu cầu" required>
            <textarea
              value={form.description}
              onChange={(e) => set("description")(e.target.value)}
              rows={4}
              placeholder="Mô tả chi tiết nhu cầu cần UX team hỗ trợ…"
              className={inputCls + " resize-none"}
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">{errors.description}</p>
            )}
          </Field>
        </div>

        {/* Squad Recommendation */}
        {form.product && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <SquadRecommendation
              recommendedSquad={rec}
              squads={squads}
              preferredSquad={form.preferred_squad}
              onPreferredChange={set("preferred_squad")}
            />
          </div>
        )}

        {/* Group 2 — Bối cảnh kinh doanh */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            02 · Bối cảnh kinh doanh
          </p>

          <Field label="Tại sao yêu cầu này cần thiết?" required>
            <textarea
              value={form.business_need}
              onChange={(e) => set("business_need")(e.target.value)}
              rows={3}
              placeholder="Vấn đề kinh doanh bạn đang muốn giải quyết là gì?"
              className={inputCls + " resize-none"}
            />
            {errors.business_need && (
              <p className="text-xs text-red-500 mt-1">{errors.business_need}</p>
            )}
          </Field>

          <Field label="Vấn đề người dùng cần giải quyết?" required>
            <textarea
              value={form.user_problem}
              onChange={(e) => set("user_problem")(e.target.value)}
              rows={3}
              placeholder="Điểm đau hoặc nhu cầu chưa được đáp ứng của người dùng…"
              className={inputCls + " resize-none"}
            />
            {errors.user_problem && (
              <p className="text-xs text-red-500 mt-1">{errors.user_problem}</p>
            )}
          </Field>

          <Field label="Đối tượng người dùng mục tiêu">
            <input
              type="text"
              value={form.target_user}
              onChange={(e) => set("target_user")(e.target.value)}
              placeholder="VD: Khách hàng retail banking, độ tuổi 25–45"
              className={inputCls}
            />
          </Field>
        </div>

        {/* Group 3 — Kế hoạch release */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            03 · Kế hoạch release
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Ngày release dự kiến" required>
              <input
                type="date"
                value={form.release_date}
                onChange={(e) => set("release_date")(e.target.value)}
                className={inputCls}
              />
              {errors.release_date && (
                <p className="text-xs text-red-500 mt-1">{errors.release_date}</p>
              )}
            </Field>

            <Field label="Lý do thời hạn này quan trọng?" hint="Dữ liệu đồng bộ từ Google Sheet">
              <select
                value={form.deadline_reason}
                onChange={(e) => set("deadline_reason")(e.target.value)}
                className={inputCls}
              >
                <option value="">Chọn lý do…</option>
                {selections.deadline_reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Group 4 — Tài liệu đính kèm */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            04 · Tài liệu đính kèm
          </p>

          {/* Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
            {(["link", "file"] as AttachMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAttachMode(mode)}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                  attachMode === mode
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {mode === "link" ? "Gửi link tài liệu" : "Tải file lên"}
              </button>
            ))}
          </div>

          {attachMode === "link" ? (
            <Field
              label="Link tài liệu"
              hint="Dán link Google Docs, Confluence, Notion, Figma hoặc bất kỳ tài liệu trực tuyến nào."
            >
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M5.5 8.5L8.5 5.5M6.5 3.5L7.207 2.793A3.536 3.536 0 0110.707 7.793L10 8.5M7.5 10.5L6.793 11.207A3.536 3.536 0 013.293 6.207L4 5.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <input
                  type="url"
                  value={form.doc_link}
                  onChange={(e) => set("doc_link")(e.target.value)}
                  placeholder="https://docs.google.com/…"
                  className={inputCls + " pl-8"}
                />
              </div>
            </Field>
          ) : (
            <div>
              <p className="text-sm text-slate-500 mb-3">
                Đính kèm tài liệu hỗ trợ, ảnh chụp màn hình, hoặc tài liệu tham khảo.
              </p>
              <FileUpload files={files} onChange={setFiles} />
            </div>
          )}
        </div>

        {/* Confirm summary */}
        {submitState === "confirming" && (
          <div className="bg-navy-50 border border-navy-100 rounded-2xl p-6 space-y-4">
            <p className="text-xs font-semibold text-navy uppercase tracking-widest">
              Xác nhận trước khi gửi
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Email người yêu cầu</p>
                <p className="text-sm font-medium text-slate-900">{form.requester_email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Yêu cầu</p>
                <p className="text-sm font-medium text-slate-900">{form.title}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Squad phụ trách</p>
                <p className="text-sm font-medium text-slate-900">
                  {form.product || "Chưa chọn"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Ngày release dự kiến</p>
                <p className="text-sm font-medium text-slate-900">
                  {form.release_date
                    ? new Date(form.release_date).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500 border-t border-navy-100/60 pt-3 flex items-center gap-2">
              <span>📋</span>
              <span>Dữ liệu sẽ được tự động đồng bộ và log dạng JSON lên Google Sheet.</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {submitState === "confirming" && (
            <button
              type="button"
              onClick={() => setSubmitState("idle")}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors order-last sm:order-first"
            >
              Quay lại chỉnh sửa
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitState === "submitting"}
            className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150 ${
              submitState === "submitting"
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-navy text-white hover:bg-navy-dark active:scale-95"
            } ${submitState !== "confirming" ? "sm:ml-auto" : ""}`}
          >
            {submitState === "submitting"
              ? "Đang gửi…"
              : submitState === "confirming"
                ? "Xác nhận & Gửi yêu cầu"
                : "Gửi yêu cầu UX"}
          </button>
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
