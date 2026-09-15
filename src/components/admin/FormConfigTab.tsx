import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Frame } from "@/components/reui/frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import {
  RequestFormConfig,
  FormFieldSetting,
  FormOptionItem,
  DEFAULT_FORM_CONFIG,
  getFormConfig,
  saveFormConfig,
  resetFormConfig,
  FORM_CONFIG_EVENT_NAME,
} from "@/config/formConfig"
import { syncFormConfigToSheet, fetchFormConfigFromSheet } from "@/services/googleSheetService"
import {
  SlidersHorizontal,
  Save,
  RotateCcw,
  Eye,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Clock,
  ShieldCheck,
  HelpCircle,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Tag,
  Settings,
  Lock,
  ArrowRight,
  Info,
  Cloud,
  CloudDownload,
} from "lucide-react"

interface FormConfigTabProps {
  onLogAction?: (action: string, target: string, details: string, type: "workflow" | "masterdata" | "security") => void
}

type SubTab = "fields" | "options" | "general"

export default function FormConfigTab({ onLogAction }: FormConfigTabProps) {
  const [config, setConfig] = useState<RequestFormConfig>(() => getFormConfig())
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("fields")
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isPulling, setIsPulling] = useState<boolean>(false)

  // Sub-tab Options states for new option inline input
  const [newRequestType, setNewRequestType] = useState({ label: "", description: "" })
  const [isAddingRequestType, setIsAddingRequestType] = useState(false)
  const [editingRtId, setEditingRtId] = useState<string | null>(null)
  const [editingRtText, setEditingRtText] = useState("")

  const [newDeadlineReason, setNewDeadlineReason] = useState({ label: "", description: "" })
  const [isAddingDeadlineReason, setIsAddingDeadlineReason] = useState(false)
  const [editingDrId, setEditingDrId] = useState<string | null>(null)
  const [editingDrText, setEditingDrText] = useState("")

  // Expanded sections accordion
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    request_info: true,
    detail_desc: true,
    plan_deadline: true,
  })

  // Listen to external updates
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setConfig(e.detail)
      }
    }
    window.addEventListener(FORM_CONFIG_EVENT_NAME, handleUpdate)
    return () => window.removeEventListener(FORM_CONFIG_EVENT_NAME, handleUpdate)
  }, [])

  // Helper to mark dirty
  const updateConfig = (updater: (prev: RequestFormConfig) => RequestFormConfig) => {
    setConfig((prev) => {
      const next = updater(prev)
      setIsDirty(true)
      return next
    })
  }

  // Toggle field enabled
  const handleToggleField = (fieldKey: string) => {
    updateConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => {
        if (f.key === fieldKey) {
          // If turning off, cannot be required
          const nextEnabled = !f.enabled
          return {
            ...f,
            enabled: nextEnabled,
            required: nextEnabled ? f.required : false,
          }
        }
        return f
      }),
    }))
  }

  // Toggle field required
  const handleToggleRequired = (fieldKey: string) => {
    updateConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.key === fieldKey ? { ...f, required: !f.required } : f)),
    }))
  }

  // Update field label or placeholder or helperText
  const handleFieldChange = (fieldKey: string, key: "label" | "placeholder" | "helperText", value: string) => {
    updateConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.key === fieldKey ? { ...f, [key]: value } : f)),
    }))
  }

  // Save changes (Local + Google Sheet RAW_SETTINGS -> FORM_CONFIG)
  const handleSave = async () => {
    setIsSaving(true)
    const toastId = toast.loading("Đang lưu cấu hình Form & đồng bộ lên Google Sheet...")
    try {
      // 1. Lưu LocalStorage & dispatch event cập nhật form tức thời
      saveFormConfig(config)
      setIsDirty(false)

      // 2. Đồng bộ lên Google Sheet RAW_SETTINGS -> FORM_CONFIG
      const res = await syncFormConfigToSheet(config)
      toast.dismiss(toastId)

      if (res.success) {
        toast.success(
          "Lưu cấu hình Form thành công",
          "Đã lưu vào bộ nhớ trình duyệt & đồng bộ lên Google Sheet (RAW_SETTINGS)."
        )
      } else {
        toast.warning(
          "Đã lưu nội bộ",
          res.message || "Không thể đồng bộ lên Google Sheet (vui lòng kiểm tra script URL)."
        )
      }

      if (onLogAction) {
        onLogAction(
          "Cập nhật Cấu hình Form",
          "RAW_SETTINGS",
          `Lưu phiên bản cấu hình v${config.version} (${config.fields.filter((f) => f.enabled).length}/${config.fields.length} trường hoạt động) lên Google Sheet`,
          "workflow"
        )
      }
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error("Lỗi khi lưu cấu hình", err?.message || "Không thể ghi dữ liệu cấu hình.")
    } finally {
      setIsSaving(false)
    }
  }

  // Pull from Google Sheet (RAW_SETTINGS -> FORM_CONFIG)
  const handlePullFromSheet = async () => {
    setIsPulling(true)
    const toastId = toast.loading("Đang tải cấu hình Form từ Google Sheet (RAW_SETTINGS)...")
    try {
      const res = await fetchFormConfigFromSheet()
      toast.dismiss(toastId)
      if (res.success && res.formConfig) {
        setConfig(res.formConfig)
        saveFormConfig(res.formConfig)
        setIsDirty(false)
        toast.success(
          "Tải thành công",
          "Đã cập nhật cấu hình Form mới nhất từ Google Sheet (RAW_SETTINGS)!"
        )
        if (onLogAction) {
          onLogAction(
            "Tải cấu hình Form",
            "RAW_SETTINGS",
            "Nạp cấu hình Form từ Google Sheet về thiết bị thành công",
            "workflow"
          )
        }
      } else {
        toast.error("Không tìm thấy", res.message || "Chưa có cấu hình Form trong RAW_SETTINGS trên Google Sheet.")
      }
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error("Lỗi tải từ Google Sheet", err?.message || String(err))
    } finally {
      setIsPulling(false)
    }
  }

  // Reset to default
  const handleReset = () => {
    if (window.confirm("Bạn có chắc chắn muốn khôi phục cấu hình Form về thiết lập chuẩn ban đầu của MBBank?")) {
      const def = resetFormConfig()
      setConfig(def)
      setIsDirty(false)
      toast.info("Đã khôi phục mặc định", "Cấu hình Form đã được hoàn tác về trạng thái ban đầu.")
      if (onLogAction) {
        onLogAction("Khôi phục mặc định", "Form Yêu cầu UX", "Đặt lại toàn bộ trường dữ liệu và danh mục về mặc định", "workflow")
      }
    }
  }

  // Export JSON
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2))
    const dlAnchor = document.createElement("a")
    dlAnchor.setAttribute("href", dataStr)
    dlAnchor.setAttribute("download", `mbbank-ux-form-config-v${config.version}.json`)
    dlAnchor.click()
    toast.success("Đã xuất file cấu hình JSON", "Bạn có thể lưu file để sao lưu hoặc import lại sau.")
  }

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (parsed && Array.isArray(parsed.fields)) {
          setConfig(parsed)
          setIsDirty(true)
          toast.success("Tải file cấu hình thành công", "Vui lòng bấm 'Lưu cấu hình Form' để áp dụng.")
        } else {
          toast.error("File JSON không hợp lệ", "Thiếu cấu trúc dữ liệu fields chuẩn của hệ thống.")
        }
      } catch {
        toast.error("Lỗi đọc file JSON", "Nội dung file không đúng định dạng JSON.")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  // Section fields grouping
  const section1Fields = useMemo(() => config.fields.filter((f) => f.section === "request_info"), [config.fields])
  const section2Fields = useMemo(() => config.fields.filter((f) => f.section === "detail_desc"), [config.fields])
  const section3Fields = useMemo(() => config.fields.filter((f) => f.section === "plan_deadline"), [config.fields])

  // Options handlers for Request Types
  const handleAddRequestType = () => {
    const label = newRequestType.label.trim()
    if (!label) return
    const newItem: FormOptionItem = {
      id: `opt-rt-${Date.now()}`,
      label,
      value: label,
      description: newRequestType.description.trim() || undefined,
      enabled: true,
    }
    updateConfig((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        requestTypes: [...prev.options.requestTypes, newItem],
      },
    }))
    setNewRequestType({ label: "", description: "" })
    setIsAddingRequestType(false)
    toast.success(`Đã thêm loại yêu cầu "${label}"`)
  }

  const handleDeleteRequestType = (id: string) => {
    updateConfig((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        requestTypes: prev.options.requestTypes.filter((item) => item.id !== id),
      },
    }))
  }

  const handleToggleRequestType = (id: string) => {
    updateConfig((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        requestTypes: prev.options.requestTypes.map((item) =>
          item.id === id ? { ...item, enabled: !item.enabled } : item
        ),
      },
    }))
  }

  // Options handlers for Deadline Reasons
  const handleAddDeadlineReason = () => {
    const label = newDeadlineReason.label.trim()
    if (!label) return
    const newItem: FormOptionItem = {
      id: `opt-dr-${Date.now()}`,
      label,
      value: label,
      description: newDeadlineReason.description.trim() || undefined,
      enabled: true,
    }
    updateConfig((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        deadlineReasons: [...prev.options.deadlineReasons, newItem],
      },
    }))
    setNewDeadlineReason({ label: "", description: "" })
    setIsAddingDeadlineReason(false)
    toast.success(`Đã thêm lý do thời hạn "${label}"`)
  }

  const handleDeleteDeadlineReason = (id: string) => {
    updateConfig((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        deadlineReasons: prev.options.deadlineReasons.filter((item) => item.id !== id),
      },
    }))
  }

  const handleToggleDeadlineReason = (id: string) => {
    updateConfig((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        deadlineReasons: prev.options.deadlineReasons.map((item) =>
          item.id === id ? { ...item, enabled: !item.enabled } : item
        ),
      },
    }))
  }

  const toggleSection = (sec: string) => {
    setExpandedSections((prev) => ({ ...prev, [sec]: !prev[sec] }))
  }

  // Field stats
  const activeFieldsCount = config.fields.filter((f) => f.enabled).length
  const requiredFieldsCount = config.fields.filter((f) => f.enabled && f.required).length

  return (
    <div className="space-y-6">
      {/* 1. TOP TOOLBAR & STATUS BAR */}
      <Frame className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1057FB] flex items-center justify-center font-bold">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Cấu hình Form Tiếp Nhận Yêu Cầu UX
              </h2>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-[11px] px-2 py-0.5">
                v{config.version}.0
              </Badge>
              {isDirty && (
                <Badge className="bg-amber-500 text-white font-semibold text-[11px] px-2 py-0.5 animate-pulse">
                  Chưa lưu thay đổi
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Tùy biến hiển thị các trường, quy định bắt buộc, đổi nhãn câu hỏi và danh mục dropdown cho màn hình Gửi yêu cầu.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePullFromSheet}
              disabled={isPulling}
              className="h-9 px-3 text-xs gap-1.5 rounded-xl border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 cursor-pointer"
              title="Tải cấu hình Form mới nhất từ Google Sheet (RAW_SETTINGS)"
            >
              <CloudDownload className={`w-3.5 h-3.5 ${isPulling ? "animate-spin text-blue-600" : "text-blue-500"}`} />
              <span className="hidden sm:inline">Tải từ Sheet</span>
            </Button>

            <label className="cursor-pointer">
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs gap-1.5 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                title="Nhập cấu hình từ file JSON"
                type="button"
                onClick={(e) => {
                  const input = e.currentTarget.parentElement?.querySelector("input")
                  input?.click()
                }}
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Nhập JSON</span>
              </Button>
            </label>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              className="h-9 px-3 text-xs gap-1.5 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
              title="Xuất file JSON sao lưu"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Xuất JSON</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-9 px-3 text-xs gap-1.5 rounded-xl border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 cursor-pointer"
              title="Khôi phục về form nguyên bản của MBBank"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mặc định</span>
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className={`h-9 px-4 text-xs font-semibold gap-1.5 rounded-xl cursor-pointer shadow-xs transition-all ${
                isDirty
                  ? "bg-[#1057FB] hover:bg-blue-700 text-white ring-2 ring-blue-300 ring-offset-1"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              <Save className={`w-3.5 h-3.5 ${isSaving ? "animate-spin" : ""}`} />
              <span>{isSaving ? "Đang lưu lên Sheet..." : isDirty ? "Lưu thay đổi *" : "Đã lưu"}</span>
            </Button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-4 sm:gap-6 text-xs text-slate-500 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Trường hoạt động: <strong className="text-slate-800">{activeFieldsCount}/{config.fields.length}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Trường bắt buộc (*): <strong className="text-slate-800">{requiredFieldsCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Loại yêu cầu: <strong className="text-slate-800">{config.options.requestTypes.filter((o) => o.enabled).length}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>Lý do thời hạn: <strong className="text-slate-800">{config.options.deadlineReasons.filter((o) => o.enabled).length}</strong></span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1 text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60" title="Cấu hình được lưu vào sheet RAW_SETTINGS trên Google Sheet">
              <Cloud className="w-3 h-3 text-blue-600" />
              Sheet: RAW_SETTINGS · FORM_CONFIG
            </span>
            <span>Cập nhật: {config.lastUpdated}</span>
          </div>
        </div>
      </Frame>

      {/* 2. MAIN 2-COLUMN WORKBENCH: SETTINGS (7 COLS) + LIVE SIMULATOR (5 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: EDITING TABS & CONTROLS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Sub-tab Navigation */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/60 w-fit">
            <button
              type="button"
              onClick={() => setActiveSubTab("fields")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeSubTab === "fields"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-4 h-4 text-[#1057FB]" />
              <span>Trường dữ liệu ({activeFieldsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("options")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeSubTab === "options"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Tag className="w-4 h-4 text-emerald-600" />
              <span>Danh mục Dropdowns</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("general")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeSubTab === "general"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Settings className="w-4 h-4 text-purple-600" />
              <span>Tiêu đề & Quy tắc File</span>
            </button>
          </div>

          {/* SUB-TAB 1: TRƯỜNG DỮ LIỆU (FIELDS & RULES) */}
          {activeSubTab === "fields" && (
            <div className="space-y-6">
              {/* SECTION 1 GROUP */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => toggleSection("request_info")}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                      01
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        {config.sections.requestInfoTitle}
                      </h3>
                      <p className="text-[11px] text-slate-400">Các thông tin cơ bản để phân loại và giao bài toán</p>
                    </div>
                  </div>
                  <button type="button" className="text-slate-400 hover:text-slate-600 p-1">
                    {expandedSections.request_info ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {expandedSections.request_info && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    {section1Fields.map((field) => (
                      <FieldConfigCard
                        key={field.key}
                        field={field}
                        onToggle={() => handleToggleField(field.key)}
                        onToggleRequired={() => handleToggleRequired(field.key)}
                        onChange={(k, v) => handleFieldChange(field.key, k, v)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2 GROUP */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => toggleSection("detail_desc")}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                      02
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        {config.sections.detailDescTitle}
                      </h3>
                      <p className="text-[11px] text-slate-400">Bối cảnh nghiệp vụ, nhu cầu người dùng và tài liệu đính kèm</p>
                    </div>
                  </div>
                  <button type="button" className="text-slate-400 hover:text-slate-600 p-1">
                    {expandedSections.detail_desc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {expandedSections.detail_desc && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    {section2Fields.map((field) => (
                      <FieldConfigCard
                        key={field.key}
                        field={field}
                        onToggle={() => handleToggleField(field.key)}
                        onToggleRequired={() => handleToggleRequired(field.key)}
                        onChange={(k, v) => handleFieldChange(field.key, k, v)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 3 GROUP: KẾ HOẠCH & THỜI HẠN (RIGHT PANEL) */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => toggleSection("plan_deadline")}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                      03
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        {config.sections.planDeadlineTitle} (Cột bên phải)
                      </h3>
                      <p className="text-[11px] text-slate-400">Mốc ngày release, lý do thời hạn và kế hoạch báo cáo</p>
                    </div>
                  </div>
                  <button type="button" className="text-slate-400 hover:text-slate-600 p-1">
                    {expandedSections.plan_deadline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {expandedSections.plan_deadline && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    {section3Fields.map((field) => (
                      <FieldConfigCard
                        key={field.key}
                        field={field}
                        onToggle={() => handleToggleField(field.key)}
                        onToggleRequired={() => handleToggleRequired(field.key)}
                        onChange={(k, v) => handleFieldChange(field.key, k, v)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: DANH MỤC LỰA CHỌN DROPDOWNS */}
          {activeSubTab === "options" && (
            <div className="space-y-6">
              {/* 1. LOẠI YÊU CẦU (REQUEST TYPES) */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#1057FB]" />
                      Danh mục: Loại yêu cầu (Request Types)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Xuất hiện trong ô chọn "Loại yêu cầu" ở Section 01
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddingRequestType(true)}
                    className="h-8 text-xs font-semibold gap-1.5 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm loại mới</span>
                  </Button>
                </div>

                {/* Form thêm mới */}
                <AnimatePresence>
                  {isAddingRequestType && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3 overflow-hidden"
                    >
                      <div className="text-xs font-bold text-blue-900">Thêm Loại yêu cầu mới:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          type="text"
                          placeholder="Tên loại yêu cầu (VD: Nghiên cứu người dùng)"
                          value={newRequestType.label}
                          onChange={(e) => setNewRequestType((p) => ({ ...p, label: e.target.value }))}
                          className="h-9 bg-white text-xs"
                          autoFocus
                        />
                        <Input
                          type="text"
                          placeholder="Mô tả phụ (Tùy chọn)"
                          value={newRequestType.description}
                          onChange={(e) => setNewRequestType((p) => ({ ...p, description: e.target.value }))}
                          className="h-9 bg-white text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setIsAddingRequestType(false)
                            setNewRequestType({ label: "", description: "" })
                          }}
                          className="h-8 text-xs text-slate-500 cursor-pointer"
                        >
                          Hủy
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAddRequestType}
                          disabled={!newRequestType.label.trim()}
                          className="h-8 text-xs font-semibold bg-[#1057FB] hover:bg-blue-700 text-white cursor-pointer"
                        >
                          Lưu vào danh sách
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Danh sách items */}
                <div className="space-y-2">
                  {config.options.requestTypes.map((opt) => (
                    <div
                      key={opt.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        opt.enabled
                          ? "bg-slate-50/60 border-slate-200/80 hover:bg-slate-50"
                          : "bg-slate-100/50 border-slate-200/40 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={opt.enabled}
                          onChange={() => handleToggleRequestType(opt.id)}
                          className="w-4 h-4 rounded text-blue-600 border-slate-300 cursor-pointer focus:ring-blue-500"
                          title="Bật/tắt hiển thị trong dropdown"
                        />
                        <div>
                          <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                            {opt.label}
                            {!opt.enabled && (
                              <span className="text-[10px] text-slate-400 font-normal italic">(Đã ẩn)</span>
                            )}
                          </div>
                          {opt.description && (
                            <div className="text-[11px] text-slate-500 line-clamp-1">{opt.description}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteRequestType(opt.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Xóa lựa chọn này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. LÝ DO THỜI HẠN (DEADLINE REASONS) */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      Danh mục: Lý do thời hạn quan trọng
                    </h3>
                    <p className="text-xs text-slate-500">
                      Xuất hiện trong ô chọn "Lý do thời hạn này quan trọng?" ở Cột kế hoạch
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddingDeadlineReason(true)}
                    className="h-8 text-xs font-semibold gap-1.5 rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm lý do mới</span>
                  </Button>
                </div>

                {/* Form thêm mới */}
                <AnimatePresence>
                  {isAddingDeadlineReason && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3 overflow-hidden"
                    >
                      <div className="text-xs font-bold text-indigo-900">Thêm Lý do thời hạn mới:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          type="text"
                          placeholder="Lý do thời hạn (VD: Quyết định Ban Lãnh Đạo)"
                          value={newDeadlineReason.label}
                          onChange={(e) => setNewDeadlineReason((p) => ({ ...p, label: e.target.value }))}
                          className="h-9 bg-white text-xs"
                          autoFocus
                        />
                        <Input
                          type="text"
                          placeholder="Mô tả phụ (Tùy chọn)"
                          value={newDeadlineReason.description}
                          onChange={(e) => setNewDeadlineReason((p) => ({ ...p, description: e.target.value }))}
                          className="h-9 bg-white text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setIsAddingDeadlineReason(false)
                            setNewDeadlineReason({ label: "", description: "" })
                          }}
                          className="h-8 text-xs text-slate-500 cursor-pointer"
                        >
                          Hủy
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAddDeadlineReason}
                          disabled={!newDeadlineReason.label.trim()}
                          className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                        >
                          Lưu vào danh sách
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Danh sách items */}
                <div className="space-y-2">
                  {config.options.deadlineReasons.map((opt) => (
                    <div
                      key={opt.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        opt.enabled
                          ? "bg-slate-50/60 border-slate-200/80 hover:bg-slate-50"
                          : "bg-slate-100/50 border-slate-200/40 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={opt.enabled}
                          onChange={() => handleToggleDeadlineReason(opt.id)}
                          className="w-4 h-4 rounded text-indigo-600 border-slate-300 cursor-pointer focus:ring-indigo-500"
                          title="Bật/tắt hiển thị trong dropdown"
                        />
                        <div>
                          <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                            {opt.label}
                            {!opt.enabled && (
                              <span className="text-[10px] text-slate-400 font-normal italic">(Đã ẩn)</span>
                            )}
                          </div>
                          {opt.description && (
                            <div className="text-[11px] text-slate-500 line-clamp-1">{opt.description}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteDeadlineReason(opt.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Xóa lựa chọn này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: TIÊU ĐỀ & QUY TẮC FILE (GENERAL & RULES) */}
          {activeSubTab === "general" && (
            <div className="space-y-6">
              {/* Header Texts */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Tiêu đề & Hướng dẫn trang Gửi yêu cầu
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Tiêu đề chính (Page Title)</label>
                    <Input
                      value={config.header.title}
                      onChange={(e) =>
                        updateConfig((p) => ({ ...p, header: { ...p.header, title: e.target.value } }))
                      }
                      className="h-10 text-xs bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Mô tả phụ (Subtitle)</label>
                    <Input
                      value={config.header.subtitle}
                      onChange={(e) =>
                        updateConfig((p) => ({ ...p, header: { ...p.header, subtitle: e.target.value } }))
                      }
                      className="h-10 text-xs bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Nhãn nút Gửi (Submit Button)</label>
                    <Input
                      value={config.sections.submitButtonText}
                      onChange={(e) =>
                        updateConfig((p) => ({ ...p, sections: { ...p.sections, submitButtonText: e.target.value } }))
                      }
                      className="h-10 text-xs bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>

              {/* Upload Rules */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-emerald-600" />
                  Quy tắc Tải tệp & Dán ảnh (Attachments)
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-800">
                        Cho phép dán ảnh chụp màn hình trực tiếp (Ctrl + V)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Tự động chuyển ảnh chụp màn hình trong clipboard thành tệp đính kèm
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.rules.allowScreenshotsPaste}
                      onChange={(e) =>
                        updateConfig((p) => ({
                          ...p,
                          rules: { ...p.rules, allowScreenshotsPaste: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Dung lượng tối đa mỗi tệp (MB)</label>
                      <Input
                        type="number"
                        value={config.rules.maxFileSizeMb}
                        onChange={(e) =>
                          updateConfig((p) => ({
                            ...p,
                            rules: { ...p.rules, maxFileSizeMb: Number(e.target.value) || 25 },
                          }))
                        }
                        className="h-10 text-xs bg-slate-50/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Số lượng tệp tối đa</label>
                      <Input
                        type="number"
                        value={config.rules.maxFilesCount}
                        onChange={(e) =>
                          updateConfig((p) => ({
                            ...p,
                            rules: { ...p.rules, maxFilesCount: Number(e.target.value) || 5 },
                          }))
                        }
                        className="h-10 text-xs bg-slate-50/50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: REALTIME LIVE SIMULATOR / PREVIEW (5 cols, sticky) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Xem trước Form Thực tế (Live Preview)
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
              Đồng bộ thời gian thực
            </Badge>
          </div>

          {/* SIMULATOR CARD CONTAINER */}
          <div className="bg-slate-100/90 border-2 border-slate-300/80 rounded-2xl p-4 sm:p-5 shadow-inner space-y-5 max-h-[calc(100vh-8rem)] overflow-y-auto no-scrollbar">
            {/* Simulator Header */}
            <div className="space-y-1 border-b border-slate-200 pb-3">
              <div className="text-[10px] text-slate-400 font-medium">
                {config.header.parentBreadcrumb} / {config.header.currentBreadcrumb}
              </div>
              <div className="text-sm font-bold text-slate-900 tracking-tight">
                {config.header.title || "Gửi yêu cầu thiết kế UX"}
              </div>
              <div className="text-[11px] text-slate-500 leading-snug">
                {config.header.subtitle}
              </div>
            </div>

            {/* Preview Section 01 */}
            <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-bold">
                  01
                </span>
                <span>{config.sections.requestInfoTitle}</span>
              </div>

              {/* Title preview */}
              {config.fields.find((f) => f.key === "title")?.enabled && (
                <div className="space-y-1">
                  <div className="text-[11px] font-medium text-slate-700">
                    {config.fields.find((f) => f.key === "title")?.label}{" "}
                    {config.fields.find((f) => f.key === "title")?.required && <span className="text-rose-500">*</span>}
                  </div>
                  <div className="h-8 px-3 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px] text-slate-400 flex items-center truncate">
                    {config.fields.find((f) => f.key === "title")?.placeholder}
                  </div>
                </div>
              )}

              {/* Dropdowns row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Product */}
                {config.fields.find((f) => f.key === "product")?.enabled && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-medium text-slate-700">
                      {config.fields.find((f) => f.key === "product")?.label}{" "}
                      {config.fields.find((f) => f.key === "product")?.required && <span className="text-rose-500">*</span>}
                    </div>
                    <div className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px] text-slate-600 font-medium flex items-center justify-between">
                      <span>Chọn sản phẩm...</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                )}

                {/* Squad */}
                {config.fields.find((f) => f.key === "preferred_squad")?.enabled && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-medium text-slate-700">
                      {config.fields.find((f) => f.key === "preferred_squad")?.label}{" "}
                      {config.fields.find((f) => f.key === "preferred_squad")?.required && <span className="text-rose-500">*</span>}
                    </div>
                    <div className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Chọn squad...</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                )}
              </div>

              {/* Request Type */}
              {config.fields.find((f) => f.key === "request_type")?.enabled && (
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-slate-700">
                    {config.fields.find((f) => f.key === "request_type")?.label}{" "}
                    {config.fields.find((f) => f.key === "request_type")?.required && <span className="text-rose-500">*</span>}
                  </div>
                  <div className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px] text-slate-600 font-medium flex items-center justify-between">
                    <span>{config.options.requestTypes.find((o) => o.enabled)?.label || "Chọn loại yêu cầu..."}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Preview Section 02 */}
            <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-indigo-100 text-indigo-700 text-[10px] flex items-center justify-center font-bold">
                  02
                </span>
                <span>{config.sections.detailDescTitle}</span>
              </div>

              {/* Description */}
              {config.fields.find((f) => f.key === "description")?.enabled && (
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-slate-700">
                    {config.fields.find((f) => f.key === "description")?.label}{" "}
                    {config.fields.find((f) => f.key === "description")?.required && <span className="text-rose-500">*</span>}
                  </div>
                  <div className="h-16 p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px] text-slate-400">
                    {config.fields.find((f) => f.key === "description")?.placeholder}
                  </div>
                </div>
              )}

              {/* Business Need */}
              {config.fields.find((f) => f.key === "business_need")?.enabled && (
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-slate-700">
                    {config.fields.find((f) => f.key === "business_need")?.label}{" "}
                    {config.fields.find((f) => f.key === "business_need")?.required && <span className="text-rose-500">*</span>}
                  </div>
                  <div className="h-12 p-2 rounded-lg border border-slate-200 bg-slate-50/70 text-[10px] text-slate-400">
                    {config.fields.find((f) => f.key === "business_need")?.placeholder}
                  </div>
                </div>
              )}

              {/* User Problem */}
              {config.fields.find((f) => f.key === "user_problem")?.enabled && (
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-slate-700">
                    {config.fields.find((f) => f.key === "user_problem")?.label}{" "}
                    {config.fields.find((f) => f.key === "user_problem")?.required && <span className="text-rose-500">*</span>}
                  </div>
                  <div className="h-12 p-2 rounded-lg border border-slate-200 bg-slate-50/70 text-[10px] text-slate-400">
                    {config.fields.find((f) => f.key === "user_problem")?.placeholder}
                  </div>
                </div>
              )}

              {/* Target User */}
              {config.fields.find((f) => f.key === "target_user")?.enabled && (
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-slate-700">
                    {config.fields.find((f) => f.key === "target_user")?.label}{" "}
                    {config.fields.find((f) => f.key === "target_user")?.required && <span className="text-rose-500">*</span>}
                  </div>
                  <div className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px] text-slate-400 flex items-center">
                    {config.fields.find((f) => f.key === "target_user")?.placeholder}
                  </div>
                </div>
              )}

              {/* Doc attachments */}
              {config.fields.find((f) => f.key === "doc_attachments")?.enabled && (
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] font-medium text-slate-700 flex items-center justify-between">
                    <span>{config.fields.find((f) => f.key === "doc_attachments")?.label}</span>
                    <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Link & File Upload</span>
                  </div>
                  <div className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <LinkIcon className="w-3 h-3 text-slate-400" />
                    <span>https://docs.google.com/...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Right Panel: Kế hoạch & Thời hạn */}
            <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-md">
              <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-700 text-[10px] flex items-center justify-center font-bold">
                  03
                </span>
                <span>{config.sections.planDeadlineTitle}</span>
              </div>

              {/* Release date */}
              {config.fields.find((f) => f.key === "release_date")?.enabled && (
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-slate-700">
                    {config.fields.find((f) => f.key === "release_date")?.label}{" "}
                    {config.fields.find((f) => f.key === "release_date")?.required && <span className="text-rose-500">*</span>}
                  </div>
                  <div className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px] text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {config.fields.find((f) => f.key === "release_date")?.placeholder}
                    </span>
                  </div>
                </div>
              )}

              {/* Deadline reason */}
              {config.fields.find((f) => f.key === "deadline_reason")?.enabled && (
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-slate-700">
                    {config.fields.find((f) => f.key === "deadline_reason")?.label}{" "}
                    {config.fields.find((f) => f.key === "deadline_reason")?.required && <span className="text-rose-500">*</span>}
                  </div>
                  <div className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px] text-slate-600 font-medium flex items-center justify-between">
                    <span>{config.options.deadlineReasons.find((o) => o.enabled)?.label || "Chọn lý do..."}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              )}

              {/* Leader report note */}
              {config.fields.find((f) => f.key === "leader_report_note")?.enabled && (
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-slate-700">
                    {config.fields.find((f) => f.key === "leader_report_note")?.label}{" "}
                    {config.fields.find((f) => f.key === "leader_report_note")?.required && <span className="text-rose-500">*</span>}
                  </div>
                  <div className="h-10 p-2 rounded-lg border border-slate-200 bg-slate-50/70 text-[10px] text-slate-400">
                    {config.fields.find((f) => f.key === "leader_report_note")?.placeholder}
                  </div>
                </div>
              )}

              {/* Submit Button preview */}
              <div className="pt-2">
                <div className="w-full h-9 bg-slate-900 text-white font-semibold text-xs rounded-lg flex items-center justify-center shadow-xs">
                  {config.sections.submitButtonText || "Gửi yêu cầu UX"}
                </div>
                <div className="text-[9px] text-slate-400 text-center mt-1">
                  ® Powered by MB UX Team
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Component card cấu hình riêng cho từng trường
 */
interface FieldConfigCardProps {
  field: FormFieldSetting
  onToggle: () => void
  onToggleRequired: () => void
  onChange: (key: "label" | "placeholder" | "helperText", value: string) => void
}

function FieldConfigCard({ field, onToggle, onToggleRequired, onChange }: FieldConfigCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div
      className={`rounded-xl border transition-all ${
        field.enabled
          ? "bg-slate-50/50 border-slate-200 hover:border-slate-300"
          : "bg-slate-100/60 border-slate-200/50 opacity-60"
      }`}
    >
      <div className="p-3 flex items-center justify-between gap-3">
        {/* Toggle & Field Title */}
        <div className="flex items-center gap-3 min-w-0">
          <input
            type="checkbox"
            checked={field.enabled}
            onChange={onToggle}
            className="w-4 h-4 rounded text-blue-600 border-slate-300 cursor-pointer focus:ring-blue-500 shrink-0"
            title={field.enabled ? "Bấm để ẩn trường này" : "Bấm để bật hiển thị trường này"}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900 truncate">{field.label}</span>
              {field.required && (
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100">
                  Bắt buộc *
                </span>
              )}
              {field.isCore && (
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                  Lõi hệ thống
                </span>
              )}
              {!field.enabled && (
                <span className="text-[10px] text-slate-400 italic">
                  (Đã ẩn trên form)
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 truncate max-w-sm">
              Gợi ý: "{field.placeholder}"
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Required Checkbox */}
          {field.enabled && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none px-2 py-1 rounded-lg hover:bg-slate-100">
              <input
                type="checkbox"
                checked={field.required}
                onChange={onToggleRequired}
                className="w-3.5 h-3.5 rounded text-rose-600 border-slate-300 focus:ring-rose-500 cursor-pointer"
              />
              <span className="text-[11px] font-medium">Bắt buộc</span>
            </label>
          )}

          {/* Expand Button to Edit Label & Placeholder */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            title="Chỉnh sửa nhãn và câu gợi ý"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Edit3 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Inline Editors */}
      <AnimatePresence>
        {isExpanded && field.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pb-3 pt-1 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs"
          >
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700 text-[11px]">Tiêu đề nhãn (Label):</label>
              <Input
                type="text"
                value={field.label}
                onChange={(e) => onChange("label", e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700 text-[11px]">Câu gợi ý (Placeholder):</label>
              <Input
                type="text"
                value={field.placeholder}
                onChange={(e) => onChange("placeholder", e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="block font-semibold text-slate-700 text-[11px]">Chú thích hướng dẫn (Tooltip / Helper):</label>
              <Input
                type="text"
                value={field.helperText || ""}
                onChange={(e) => onChange("helperText", e.target.value)}
                placeholder="Hướng dẫn cho người tạo task..."
                className="h-8 text-xs bg-white"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
