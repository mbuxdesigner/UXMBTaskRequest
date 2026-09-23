import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Frame } from "@/components/reui/frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { TimePicker } from "@/components/reui/time-picker"
import { Slider } from "@/components/ui/slider"
import {
  SystemConfig,
  DEFAULT_SYSTEM_CONFIG,
  getSystemConfig,
  saveSystemConfig,
  resetSystemConfig,
  exportSystemConfigJson,
  importSystemConfigJson,
  SYSTEM_CONFIG_EVENT_NAME,
  PriorityLevelConfig,
  VIETNAM_PUBLIC_HOLIDAYS_2026,
  VIETNAM_COMPENSATORY_WORKDAYS_2026,
  DEFAULT_WORK_SCHEDULE,
  HolidayException,
  DayOfWeekKey,
  getDailyWorkingMinutes,
  getWeeklyCapacityHours,
} from "@/config/systemConfig"
import {
  Clock,
  Zap,
  Sliders,
  Sparkles,
  Award,
  Bell,
  Globe,
  Briefcase,
  CalendarCheck,
  Paperclip,
  Save,
  RotateCcw,
  Download,
  Upload,
  Check,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Users,
  AlertCircle,
  FileCheck,
  Building,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Eye,
  Plus,
  Trash2,
  CalendarDays,
  CheckCircle2,
  Lock,
  Coffee,
  X,
} from "lucide-react"

interface SystemParamsTabProps {
  onLogAction?: (action: string, target: string, details: string, type: "workflow" | "masterdata" | "security") => void
}

type SubTabKey = "sla" | "work_schedule" | "capacity" | "priorities" | "evaluation" | "assessment" | "portal"

export default function SystemParamsTab({ onLogAction }: SystemParamsTabProps) {
  const [config, setConfig] = useState<SystemConfig>(() => getSystemConfig())
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>("sla")
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importJsonText, setImportJsonText] = useState("")
  const [importError, setImportError] = useState("")

  // State cho modal Thêm ngày nghỉ ngoại lệ / làm bù
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false)
  const [newHolidayName, setNewHolidayName] = useState("")
  const [newHolidayDate, setNewHolidayDate] = useState("")
  const [newHolidayEndDate, setNewHolidayEndDate] = useState("")
  const [newHolidayType, setNewHolidayType] = useState<"public_holiday" | "internal_holiday" | "day_off" | "compensatory_workday">("internal_holiday")
  const [newHolidayDesc, setNewHolidayDesc] = useState("")
  const [newHolidayCompensatoryFor, setNewHolidayCompensatoryFor] = useState("")
  const [calendarFilter, setCalendarFilter] = useState<"all" | "holiday" | "compensatory">("all")

  // Lắng nghe sự kiện đồng bộ chéo
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setConfig(e.detail)
      }
    }
    window.addEventListener(SYSTEM_CONFIG_EVENT_NAME, handleUpdate)
    return () => window.removeEventListener(SYSTEM_CONFIG_EVENT_NAME, handleUpdate)
  }, [])

  const updateConfig = (updater: (prev: SystemConfig) => SystemConfig) => {
    setConfig((prev) => {
      const next = updater(prev)
      setIsDirty(true)
      return next
    })
  }

  // Lưu cấu hình
  const handleSave = () => {
    setIsSaving(true)
    try {
      const saved = saveSystemConfig(config, "Admin Quản Trị Hệ Thống")
      setConfig(saved)
      setIsDirty(false)
      toast.success("Đã lưu thông số cấu hình", "Toàn bộ thông số hệ thống và SLA đã được cập nhật thời gian thực.")
      onLogAction?.("Cập nhật thông số hệ thống", "System Config", "Lưu thay đổi thông số SLA, tải việc & portal", "workflow")
    } catch (err: any) {
      toast.error("Lỗi khi lưu cấu hình", err?.message || "Không thể lưu vào bộ nhớ")
    } finally {
      setIsSaving(false)
    }
  }

  // Khôi phục mặc định
  const handleReset = () => {
    try {
      const reset = resetSystemConfig("Admin Quản Trị Hệ Thống")
      setConfig(reset)
      setIsDirty(false)
      setShowResetConfirm(false)
      toast.info("Đã khôi phục mặc định", "Toàn bộ thông số đã được đưa về tiêu chuẩn gốc MBBank.")
      onLogAction?.("Khôi phục mặc định", "System Config", "Đưa toàn bộ thông số về cấu hình mặc định MBBank", "security")
    } catch (err: any) {
      toast.error("Lỗi khi khôi phục", err?.message || "Có lỗi xảy ra")
    }
  }

  // Xuất file JSON
  const handleExport = () => {
    const jsonStr = exportSystemConfigJson()
    const blob = new Blob([jsonStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `MB_System_Config_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Xuất file JSON thành công", "File sao lưu cấu hình hệ thống đã được tải xuống.")
  }

  // Nhập file JSON
  const handleImport = () => {
    setImportError("")
    if (!importJsonText.trim()) {
      setImportError("Vui lòng dán nội dung JSON cấu hình.")
      return
    }
    const res = importSystemConfigJson(importJsonText, "Admin Quản Trị")
    if (res.success && res.config) {
      setConfig(res.config)
      setIsDirty(false)
      setShowImportModal(false)
      setImportJsonText("")
      toast.success("Nhập cấu hình thành công", "Các thông số từ file sao lưu đã được kích hoạt.")
      onLogAction?.("Nhập file JSON", "System Config", "Khôi phục thông số từ file sao lưu JSON", "security")
    } else {
      setImportError(res.message)
    }
  }

  // Kiểm tra tổng trọng số KPI
  const evaluationWeightSum = useMemo(() => {
    const { qualityWeight, slaComplianceWeight, ftrWeight, designSystemWeight } = config.evaluation
    return qualityWeight + slaComplianceWeight + ftrWeight + designSystemWeight
  }, [config.evaluation])

  const subTabs = [
    { id: "sla", label: "SLA & Thời gian", icon: Clock },
    { id: "work_schedule", label: "Lịch làm việc & Ngày nghỉ", icon: Calendar },
    { id: "capacity", label: "Định mức Tải việc", icon: Users },
    { id: "priorities", label: "Cấp độ Ưu tiên", icon: Zap },
    { id: "evaluation", label: "Trọng số KPI", icon: Sparkles },
    { id: "assessment", label: "Khảo sát & Đề thi", icon: Award },
    { id: "portal", label: "Cổng Portal & Banner", icon: Globe },
  ] as const

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar Card */}
      {/* 1. Header Toolbar: Title and description take full width, action buttons positioned neatly below */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs shrink-0 mt-0.5">
            <Sliders className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Quản trị Thông số Hệ thống & Tiêu chuẩn SLA</h2>
              {isDirty && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Có thay đổi chưa lưu
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Toàn bộ các thông số định mức, thời hạn PO pending, cam kết SLA, trọng số KPI có thể tinh chỉnh linh hoạt 100%.
            </p>
          </div>
        </div>

        {/* Cụm Action Buttons nằm dưới khối text để text không bị co hẹp */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2.5 flex-wrap justify-between sm:justify-start">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="text-xs font-medium gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer h-9 px-3.5 rounded-xl shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Xuất JSON</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="text-xs font-medium gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer h-9 px-3.5 rounded-xl shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Nhập JSON</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs font-medium gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 cursor-pointer h-9 px-3.5 rounded-xl shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục gốc</span>
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="text-xs font-medium gap-1.5 bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs disabled:opacity-50 h-9 px-4 rounded-xl ml-auto sm:ml-0"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</span>
          </Button>
        </div>
      </div>

      {/* 2. Sub-tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto select-none scrollbar-none border border-slate-200/60">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as SubTabKey)}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? "text-slate-900 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sys-param-tab-active"
                  className="absolute inset-0 bg-white rounded-lg -z-10 shadow-2xs"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
                />
              )}
              <Icon className={`w-4 h-4 ${isActive ? "text-slate-900" : "text-slate-500"}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* 3. Sub-tab Content Panels */}

      {/* SUB-TAB 1: SLA & THỜI GIAN */}
      {activeSubTab === "sla" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PO Pending Timeout Card */}
            <Frame variant="default" padding="lg" className="space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Thời hạn Chờ PO Phản Hồi (PO Pending)</h3>
                    <p className="text-xs text-slate-500">Tự động gắn cờ PO Pending khi vượt quá số giờ quy định</p>
                  </div>
                </div>
                <Badge variant="warning" size="sm">
                  {config.sla.poPendingTimeoutHours} giờ
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">
                    Chọn nhanh mốc thời gian chuẩn:
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[12, 24, 36, 48, 72].map((hours) => (
                      <button
                        key={hours}
                        type="button"
                        onClick={() =>
                          updateConfig((prev) => ({
                            ...prev,
                            sla: { ...prev.sla, poPendingTimeoutHours: hours },
                          }))
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-colors cursor-pointer ${
                          config.sla.poPendingTimeoutHours === hours
                            ? "bg-slate-900 text-white border-slate-900 font-semibold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {hours}h {hours === 24 && <span className="text-[10px] block opacity-80">(Gốc)</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs text-slate-700 mb-2">
                    <span className="font-medium">Số giờ tùy chỉnh:</span>
                    <span className="font-medium font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-xs">
                      {config.sla.poPendingTimeoutHours} giờ ({Math.round((config.sla.poPendingTimeoutHours / 24) * 10) / 10} ngày)
                    </span>
                  </div>
                  <Slider
                    min={4}
                    max={168}
                    step={2}
                    value={config.sla.poPendingTimeoutHours}
                    onChange={(val) =>
                      updateConfig((prev) => ({
                        ...prev,
                        sla: { ...prev.sla, poPendingTimeoutHours: val },
                      }))
                    }
                    color="#0F172A"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-medium">
                    <span>4 giờ</span>
                    <span>24h (1 ngày)</span>
                    <span>72h (3 ngày)</span>
                    <span>168h (7 ngày)</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200/60 text-xs text-amber-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-950">
                    <Info className="w-3.5 h-3.5" />
                    <span>Cơ chế kích hoạt PO Pending:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900/90">
                    Khi Designer gửi thiết kế cho PO (@SendToPO), nếu sau <strong>{config.sla.poPendingTimeoutHours} giờ</strong> PO chưa bấm Đồng thuận hoặc Feedback, task sẽ tự động chuyển sang trạng thái <strong>PO Pending</strong> (Màu hổ phách) trên cả My Task và Dashboard.
                  </p>
                </div>
              </div>
            </Frame>

            {/* Cycle Time & Fast Velocity Card */}
            <Frame variant="default" padding="lg" className="space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Mục Tiêu Cam Kết Chu Kỳ SLA (Cycle Time)</h3>
                    <p className="text-xs text-slate-500">Thời gian trung bình hoàn thành bài toán từ lúc tạo đến bàn giao</p>
                  </div>
                </div>
                <Badge variant="info" size="sm">
                  {config.sla.targetCycleDays} ngày/task
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Mục tiêu SLA chuẩn (ngày):
                    </label>
                    <Input
                      type="number"
                      step={0.5}
                      min={1}
                      max={30}
                      value={config.sla.targetCycleDays}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          sla: { ...prev.sla, targetCycleDays: parseFloat(e.target.value) || 5.0 },
                        }))
                      }
                      className="font-mono text-sm"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Chuẩn MBBank: 5.0 ngày/task</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Mốc tốc độ nhanh (ngày):
                    </label>
                    <Input
                      type="number"
                      step={0.5}
                      min={0.5}
                      max={15}
                      value={config.sla.fastCycleDays}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          sla: { ...prev.sla, fastCycleDays: parseFloat(e.target.value) || 3.5 },
                        }))
                      }
                      className="font-mono text-sm"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Gắn badge 'Tốc độ nhanh' khi ≤ mốc này</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs text-slate-700 mb-2">
                    <span className="font-medium">Ngưỡng cảnh báo sắp trễ hạn SLA:</span>
                    <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-mono text-xs">
                      {config.sla.slaWarningPercent}% thời gian
                    </span>
                  </div>
                  <Slider
                    min={50}
                    max={95}
                    step={5}
                    value={config.sla.slaWarningPercent}
                    onChange={(val) =>
                      updateConfig((prev) => ({
                        ...prev,
                        sla: { ...prev.sla, slaWarningPercent: val },
                      }))
                    }
                    color="#D97706"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-medium">
                    <span>50%</span>
                    <span>80% (Khuyến nghị)</span>
                    <span>95%</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                  <div className="font-medium text-slate-800">Quy tắc phân loại huy hiệu Cycle Time trên Dashboard:</div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <strong>≤ {config.sla.fastCycleDays} ngày</strong>
                      <p className="text-[10px] text-emerald-600 mt-0.5">Tốc độ nhanh</p>
                    </div>
                    <div className="p-2 rounded bg-blue-50 text-blue-800 border border-blue-200">
                      <strong>≤ {config.sla.targetCycleDays} ngày</strong>
                      <p className="text-[10px] text-blue-600 mt-0.5">Đạt chuẩn SLA</p>
                    </div>
                    <div className="p-2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      <strong>&gt; {config.sla.targetCycleDays} ngày</strong>
                      <p className="text-[10px] text-amber-600 mt-0.5">Cần cải thiện</p>
                    </div>
                  </div>
                </div>
              </div>
            </Frame>
          </div>

          {/* Working Hours & Calendar Rules */}
          <Frame variant="default" padding="lg" className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Quy Tắc Lịch Làm Việc & Giờ Hành Chính</h3>
                <p className="text-xs text-slate-500">Thiết lập ngày công và loại trừ cuối tuần trong phép tính deadline</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1.5">
                  Số ngày làm việc / tuần:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { value: 5, label: "5 ngày (T2-T6)" },
                    { value: 5.5, label: "5.5 ngày (+T7 sáng)" },
                    { value: 6, label: "6 ngày (T2-T7)" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        updateConfig((prev) => ({
                          ...prev,
                          sla: { ...prev.sla, workingDaysPerWeek: item.value as any },
                        }))
                      }
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-colors cursor-pointer ${
                        config.sla.workingDaysPerWeek === item.value
                          ? "bg-slate-900 text-white border-slate-900 font-semibold"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1.5">
                  Số giờ làm việc / ngày:
                </label>
                <Input
                  type="number"
                  min={4}
                  max={12}
                  value={config.sla.dailyWorkingHours}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      sla: { ...prev.sla, dailyWorkingHours: parseInt(e.target.value, 10) || 8 },
                    }))
                  }
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">Quy định chuẩn: 8.0 giờ/ngày</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700 block mb-1.5">
                  Tùy chọn tự động:
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sla.excludeWeekendsInSla}
                    onChange={(e) =>
                      updateConfig((prev) => ({
                        ...prev,
                        sla: { ...prev.sla, excludeWeekendsInSla: e.target.checked },
                      }))
                    }
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Loại trừ Thứ 7, CN và ngày lễ khi tính SLA</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sla.autoMarkPoPending}
                    onChange={(e) =>
                      updateConfig((prev) => ({
                        ...prev,
                        sla: { ...prev.sla, autoMarkPoPending: e.target.checked },
                      }))
                    }
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Tự động gán nhãn PO Pending khi quá hạn</span>
                </label>
              </div>
            </div>
          </Frame>
        </div>
      )}

      {/* SUB-TAB: LỊCH LÀM VIỆC & NGÀY NGHỈ (WORK SCHEDULE) */}
      {activeSubTab === "work_schedule" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-7">
            {/* Header */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Work Schedule
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Tailor your workspace's work schedule to anticipate the impact of days off on your project planning.
                <span className="block text-slate-400 text-xs mt-0.5">
                  (Thiết lập thời gian biểu của tổ chức để dự trù tác động của ngày nghỉ cuối tuần và ngày lễ lên tiến độ cam kết SLA và Lộ trình Gantt).
                </span>
              </p>
            </div>

            {/* Section 1: Workweek */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-900">Workweek</span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {[
                  { key: "Mo" as DayOfWeekKey, label: "Mo", sub: "Thứ 2" },
                  { key: "Tu" as DayOfWeekKey, label: "Tu", sub: "Thứ 3" },
                  { key: "We" as DayOfWeekKey, label: "We", sub: "Thứ 4" },
                  { key: "Th" as DayOfWeekKey, label: "Th", sub: "Thứ 5" },
                  { key: "Fr" as DayOfWeekKey, label: "Fr", sub: "Thứ 6" },
                  { key: "Sa" as DayOfWeekKey, label: "Sa", sub: "Thứ 7" },
                  { key: "Su" as DayOfWeekKey, label: "Su", sub: "Chủ Nhật" },
                ].map((d) => {
                  const isSelected = (config.workSchedule?.workweek || []).includes(d.key)
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => {
                        updateConfig((prev) => {
                          const curr = prev.workSchedule?.workweek || ["Mo", "Tu", "We", "Th", "Fr"]
                          const next = curr.includes(d.key)
                            ? curr.filter((k) => k !== d.key)
                            : [...curr, d.key]
                          return {
                            ...prev,
                            workSchedule: {
                              ...prev.workSchedule,
                              workweek: next,
                            },
                          }
                        })
                      }}
                      className={`flex flex-col items-center justify-center min-w-[52px] h-[52px] px-3 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-indigo-50/70 border-indigo-400 text-indigo-700 shadow-2xs ring-2 ring-indigo-200/50"
                          : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      }`}
                    >
                      <span className="leading-tight">{d.label}</span>
                      <span className="text-[10px] font-normal opacity-75">{d.sub}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Section 2: Working hours */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-900">Working hours</span>
              </div>

              {/* Working hours inputs */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <TimePicker
                    value={config.workSchedule?.startTime || "08:00"}
                    onChange={(val) => {
                      updateConfig((prev) => ({
                        ...prev,
                        workSchedule: { ...prev.workSchedule, startTime: val },
                      }))
                    }}
                    className="w-32"
                    placeholder="08:00"
                  />
                  <span className="text-sm text-slate-500 font-medium">to</span>
                  <TimePicker
                    value={config.workSchedule?.endTime || "17:30"}
                    onChange={(val) => {
                      updateConfig((prev) => ({
                        ...prev,
                        workSchedule: { ...prev.workSchedule, endTime: val },
                      }))
                    }}
                    className="w-32"
                    placeholder="17:30"
                  />

                  {/* Lunch Break Toggle */}
                  <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(config.workSchedule?.lunchBreak?.enabled)}
                        onChange={(e) => {
                          updateConfig((prev) => ({
                            ...prev,
                            workSchedule: {
                              ...prev.workSchedule,
                              lunchBreak: {
                                ...prev.workSchedule?.lunchBreak,
                                enabled: e.target.checked,
                                startTime: prev.workSchedule?.lunchBreak?.startTime || "12:00",
                                endTime: prev.workSchedule?.lunchBreak?.endTime || "13:30",
                              },
                            },
                          }))
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="flex items-center gap-1">
                        <Coffee className="w-3.5 h-3.5 text-amber-600" />
                        Trừ giờ nghỉ trưa:
                      </span>
                    </label>
                    {config.workSchedule?.lunchBreak?.enabled && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <TimePicker
                          size="sm"
                          value={config.workSchedule?.lunchBreak?.startTime || "12:00"}
                          onChange={(val) => {
                            updateConfig((prev) => ({
                              ...prev,
                              workSchedule: {
                                ...prev.workSchedule,
                                lunchBreak: {
                                  ...prev.workSchedule.lunchBreak,
                                  startTime: val,
                                },
                              },
                            }))
                          }}
                          className="w-28"
                          placeholder="12:00"
                        />
                        <span className="text-slate-400 font-medium">-</span>
                        <TimePicker
                          size="sm"
                          value={config.workSchedule?.lunchBreak?.endTime || "13:30"}
                          onChange={(val) => {
                            updateConfig((prev) => ({
                              ...prev,
                              workSchedule: {
                                ...prev.workSchedule,
                                lunchBreak: {
                                  ...prev.workSchedule.lunchBreak,
                                  endTime: val,
                                },
                              },
                            }))
                          }}
                          className="w-28"
                          placeholder="13:30"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Capacity calculation text */}
                {(() => {
                  const dailyMins = getDailyWorkingMinutes(config.workSchedule)
                  const dailyH = Math.floor(dailyMins / 60)
                  const dailyM = dailyMins % 60
                  const weeklyH = getWeeklyCapacityHours(config.workSchedule)
                  return (
                    <p className="text-xs text-slate-500 font-medium">
                      Daily capacity: {dailyH}h {dailyM > 0 ? `${dailyM}m` : "00m"}
                      {config.workSchedule?.lunchBreak?.enabled ? " (đã trừ giờ nghỉ trưa)" : ""} • Weekly capacity: {weeklyH}h
                    </p>
                  )
                })()}
              </div>
            </div>

            {/* Section 3: Lịch Ngày Nghỉ Lễ & Ngày Làm Bù Ngoại Lệ */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              {(() => {
                const allCalendarItems = config.workSchedule?.holidays || []
                const holidayItems = allCalendarItems.filter((h) => h.type !== "compensatory_workday")
                const compensatoryItems = allCalendarItems.filter((h) => h.type === "compensatory_workday")
                const displayedItems = calendarFilter === "holiday"
                  ? holidayItems
                  : calendarFilter === "compensatory"
                  ? compensatoryItems
                  : allCalendarItems

                return (
                  <>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                            Lịch Ngày Nghỉ Lễ & Ngày Làm Bù
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" size="sm" className="font-mono text-xs font-normal">
                              {holidayItems.length} ngày nghỉ
                            </Badge>
                            <Badge size="sm" className="font-mono text-xs font-medium bg-amber-50 text-amber-800 border-amber-300">
                              {compensatoryItems.length} ngày làm bù (tính SLA)
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">
                          Ngày nghỉ sẽ được loại trừ khi đếm SLA. Ngày làm bù được tính thời gian xử lý như ngày thường, áp dụng cả Thứ 7 và Chủ Nhật.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            updateConfig((prev) => {
                              const existing = prev.workSchedule?.holidays || []
                              const nonVn = existing.filter((h) => !VIETNAM_PUBLIC_HOLIDAYS_2026.some((v) => v.id === h.id))
                              return {
                                ...prev,
                                workSchedule: {
                                  ...prev.workSchedule,
                                  holidays: [...VIETNAM_PUBLIC_HOLIDAYS_2026, ...nonVn],
                                },
                              }
                            })
                            toast.success("Đã nạp 11 ngày lễ VN 2026", "Lịch nghỉ lễ ngân hàng Việt Nam đã được cập nhật.")
                          }}
                          className="text-xs h-8 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Nạp 11 ngày lễ VN</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            updateConfig((prev) => {
                              const existing = prev.workSchedule?.holidays || []
                              const merged = [...existing]
                              VIETNAM_COMPENSATORY_WORKDAYS_2026.forEach((cw) => {
                                if (!merged.some((m) => m.id === cw.id || m.date === cw.date)) {
                                  merged.push(cw)
                                }
                              })
                              return {
                                ...prev,
                                workSchedule: {
                                  ...prev.workSchedule,
                                  holidays: merged,
                                },
                              }
                            })
                            toast.success("Đã nạp ngày làm bù mẫu", "Lịch làm bù hoán đổi nghỉ lễ đã được thêm vào hệ thống.")
                          }}
                          className="text-xs h-8 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                          title="Nạp các ngày thứ Bảy hoán đổi làm bù theo quy định Nhà nước 2026"
                        >
                          <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                          <span>Nạp làm bù mẫu</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewHolidayType("internal_holiday")
                            setNewHolidayCompensatoryFor("")
                            setShowAddHolidayModal(true)
                          }}
                          className="text-xs h-8 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-slate-500" />
                          <span>Thêm ngày nghỉ</span>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setNewHolidayType("compensatory_workday")
                            setNewHolidayCompensatoryFor("")
                            setShowAddHolidayModal(true)
                          }}
                          className="text-xs h-8 gap-1.5 bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs"
                        >
                          <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                          <span>Thêm ngày làm bù</span>
                        </Button>
                      </div>
                    </div>

                    {/* Filter Tabs */}
                    {allCalendarItems.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1">
                        {[
                          { key: "all", label: `Tất cả (${allCalendarItems.length})` },
                          { key: "holiday", label: `🌴 Ngày nghỉ lễ (${holidayItems.length})` },
                          { key: "compensatory", label: `💼 Ngày làm bù (${compensatoryItems.length})` },
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setCalendarFilter(tab.key as any)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                              calendarFilter === tab.key
                                ? "bg-slate-900 text-white shadow-2xs font-semibold"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* EMPTY STATE */}
                    {allCalendarItems.length === 0 ? (
                      <div className="border border-slate-200 rounded-2xl bg-white p-10 text-center flex flex-col items-center justify-center space-y-4 shadow-2xs">
                        <div className="relative w-16 h-16 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-600">
                          <Calendar className="w-8 h-8 stroke-[1.5]" />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                            <Clock className="w-3 h-3" />
                          </div>
                        </div>

                        <div className="max-w-md space-y-1">
                          <h4 className="text-base font-semibold text-slate-900">
                            Chưa có ngày nghỉ lễ hoặc ngày làm bù
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Thiết lập ngày nghỉ lễ để loại trừ khỏi SLA, hoặc thêm ngày làm bù để kích hoạt tính SLA trong các ngày cuối tuần hoán đổi.
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 pt-2 flex-wrap justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateConfig((prev) => ({
                                ...prev,
                                workSchedule: {
                                  ...prev.workSchedule,
                                  holidays: VIETNAM_PUBLIC_HOLIDAYS_2026,
                                },
                              }))
                              toast.success("Đã nạp 11 ngày lễ VN 2026", "Toàn bộ lịch nghỉ lễ quốc gia 2026 đã được đưa vào hệ thống.")
                            }}
                            className="text-xs h-9 px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer font-medium shadow-2xs"
                          >
                            <CalendarDays className="w-3.5 h-3.5 text-indigo-600 mr-1.5" />
                            <span>Nạp 11 ngày lễ VN 2026</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNewHolidayType("internal_holiday")
                              setShowAddHolidayModal(true)
                            }}
                            className="text-xs h-9 px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer font-medium shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            <span>Thêm ngày nghỉ</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setNewHolidayType("compensatory_workday")
                              setShowAddHolidayModal(true)
                            }}
                            className="text-xs h-9 px-3.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 cursor-pointer font-medium shadow-2xs"
                          >
                            <Briefcase className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
                            <span>Thêm ngày làm bù</span>
                          </Button>
                        </div>
                      </div>
                    ) : displayedItems.length === 0 ? (
                      <div className="border border-slate-200 rounded-xl bg-white p-8 text-center text-xs text-slate-500">
                        Không có mục nào phù hợp với bộ lọc đang chọn.
                      </div>
                    ) : (
                      /* HOLIDAYS & COMPENSATORY WORKDAYS TABLE */
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                        <div className="overflow-x-auto w-full overscroll-x-contain pb-1">
                          <table className="w-full min-w-[780px] text-left text-xs border-separate border-spacing-0">
                            <thead className="bg-slate-50/90 text-slate-500 uppercase tracking-wider text-[11px] font-semibold sticky top-0 backdrop-blur-xs">
                              <tr>
                                <th className="px-4 py-3 border-b border-slate-200/80 min-w-[240px]">Tên ngày nghỉ / Ngày làm bù</th>
                                <th className="px-4 py-3 border-b border-slate-200/80 w-[150px] whitespace-nowrap">Ngày diễn ra</th>
                                <th className="px-4 py-3 border-b border-slate-200/80 w-[160px] whitespace-nowrap">Phân loại & Tính SLA</th>
                                <th className="px-4 py-3 border-b border-slate-200/80 min-w-[220px]">Ghi chú / Mục đích</th>
                                <th className="px-4 py-3 border-b border-slate-200/80 w-[80px] text-right whitespace-nowrap">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {displayedItems.map((h, idx) => {
                                const isCompensatory = h.type === "compensatory_workday"
                                return (
                                  <tr
                                    key={h.id || idx}
                                    className={`transition-colors ${
                                      isCompensatory
                                        ? "bg-amber-50/30 hover:bg-amber-50/60"
                                        : "hover:bg-slate-50/80 even:bg-slate-50/30"
                                    }`}
                                  >
                                    <td className="px-4 py-3.5 font-medium text-slate-900 border-b border-slate-100">
                                      <div className="flex items-center gap-2.5">
                                        <div
                                          className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                                            isCompensatory
                                              ? "bg-amber-50 text-amber-700 border-amber-200"
                                              : "bg-indigo-50 text-indigo-600 border-indigo-100/80"
                                          }`}
                                        >
                                          {isCompensatory ? (
                                            <Briefcase className="w-3.5 h-3.5" />
                                          ) : (
                                            <CalendarDays className="w-3.5 h-3.5" />
                                          )}
                                        </div>
                                        <div>
                                          <span className="font-semibold text-slate-900 text-xs block">{h.name}</span>
                                          {h.compensatoryFor && (
                                            <span className="text-[11px] text-amber-700 font-normal">
                                              Bù cho: {h.compensatoryFor}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3.5 font-mono text-slate-600 whitespace-nowrap border-b border-slate-100">
                                      {h.endDate && h.endDate !== h.date ? `${h.date} → ${h.endDate}` : h.date}
                                    </td>
                                    <td className="px-4 py-3.5 whitespace-nowrap border-b border-slate-100">
                                      {isCompensatory ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                                          Làm Bù (Tính SLA)
                                        </span>
                                      ) : h.type === "public_holiday" ? (
                                        <Badge variant="success" size="sm" className="font-normal text-[11px] rounded-lg">Lễ Quốc Gia (Nghỉ)</Badge>
                                      ) : h.type === "internal_holiday" ? (
                                        <Badge variant="info" size="sm" className="font-normal text-[11px] rounded-lg">Nội Bộ MB (Nghỉ)</Badge>
                                      ) : (
                                        <Badge variant="secondary" size="sm" className="font-normal text-[11px] rounded-lg">Nghỉ Phép</Badge>
                                      )}
                                    </td>
                                    <td className="px-4 py-3.5 text-slate-500 border-b border-slate-100 leading-relaxed">
                                      {h.description || "—"}
                                    </td>
                                    <td className="px-4 py-3.5 text-right whitespace-nowrap border-b border-slate-100">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          updateConfig((prev) => ({
                                            ...prev,
                                            workSchedule: {
                                              ...prev.workSchedule,
                                              holidays: (prev.workSchedule?.holidays || []).filter((item) => item.id !== h.id),
                                            },
                                          }))
                                          toast.info("Đã xóa", `Đã xóa "${h.name}" khỏi lịch.`)
                                        }}
                                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer inline-flex items-center justify-center ml-auto"
                                        title="Xóa mục này"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="p-3 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                          <span>
                            Hiển thị <strong className="text-slate-900 font-semibold">{displayedItems.length}</strong> / {allCalendarItems.length} mục ngoại lệ
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách ngày nghỉ và ngày làm bù?")) {
                                updateConfig((prev) => ({
                                  ...prev,
                                  workSchedule: {
                                    ...prev.workSchedule,
                                    holidays: [],
                                  },
                                }))
                                toast.info("Đã xóa toàn bộ lịch ngoại lệ")
                              }
                            }}
                            className="text-xs text-rose-600 hover:underline cursor-pointer font-medium"
                          >
                            Xóa toàn bộ
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ĐỊNH MỨC TẢI VIỆC & CÔNG SUẤT */}
      {activeSubTab === "capacity" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Designer Capacity Benchmarks */}
            <Frame variant="default" padding="lg" className="space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Định Mức Tải Việc Chuẩn Designer</h3>
                    <p className="text-xs text-slate-500">Cơ sở tính toán tỷ lệ % tải trọng và cảnh báo quá tải cá nhân</p>
                  </div>
                </div>
                <Badge variant="success" size="sm">
                  {config.capacity.defaultDesignerCapacity} task/người
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Định mức số task đang chạy đồng thời / Designer:
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={config.capacity.defaultDesignerCapacity}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          capacity: { ...prev.capacity, defaultDesignerCapacity: parseInt(e.target.value, 10) || 2 },
                        }))
                      }
                      className="font-mono text-sm w-32"
                    />
                    <span className="text-xs text-slate-500">task / designer cùng lúc (Khuyến nghị: 2.0)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Công thức công suất: <code>% Công suất = [Tổng task InProgress] / ([Số Designer active] × {config.capacity.defaultDesignerCapacity}) × 100</code>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Ngưỡng "Tải cao" (task/người):
                    </label>
                    <Input
                      type="number"
                      step={0.1}
                      min={1.0}
                      max={5.0}
                      value={config.capacity.workloadHighThreshold}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          capacity: { ...prev.capacity, workloadHighThreshold: parseFloat(e.target.value) || 2.0 },
                        }))
                      }
                      className="font-mono text-sm"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Mặc định: 2.0 task/người</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Ngưỡng "Quá tải" (task/người):
                    </label>
                    <Input
                      type="number"
                      step={0.1}
                      min={1.5}
                      max={8.0}
                      value={config.capacity.workloadOverloadThreshold}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          capacity: { ...prev.capacity, workloadOverloadThreshold: parseFloat(e.target.value) || 2.8 },
                        }))
                      }
                      className="font-mono text-sm"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Mặc định: 2.8 task/người</p>
                  </div>
                </div>

                {/* Visual Threshold Bar */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>Dải đo tải trọng công việc (Workload Ratio):</span>
                  </div>
                  <div className="h-3 w-full rounded-full overflow-hidden flex shadow-2xs">
                    <div
                      style={{ width: `${(config.capacity.workloadHighThreshold / config.capacity.workloadOverloadThreshold) * 60}%` }}
                      className="bg-emerald-500 flex items-center justify-center text-[9px] font-bold text-white"
                      title="Cân bằng"
                    />
                    <div
                      style={{ width: `${((config.capacity.workloadOverloadThreshold - config.capacity.workloadHighThreshold) / config.capacity.workloadOverloadThreshold) * 60}%` }}
                      className="bg-amber-500 flex items-center justify-center text-[9px] font-bold text-white"
                      title="Tải cao"
                    />
                    <div className="bg-rose-500 flex-1 flex items-center justify-center text-[9px] font-bold text-white" title="Quá tải" />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span className="text-emerald-700 font-medium">≤ {config.capacity.workloadHighThreshold} (Cân bằng)</span>
                    <span className="text-amber-700 font-medium">{config.capacity.workloadHighThreshold} - {config.capacity.workloadOverloadThreshold} (Tải cao)</span>
                    <span className="text-rose-700 font-medium">&gt; {config.capacity.workloadOverloadThreshold} (Quá tải)</span>
                  </div>
                </div>
              </div>
            </Frame>

            {/* Squad Capacity Settings */}
            <Frame variant="default" padding="lg" className="space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Hạn Mức Sức Chứa Toàn Squad</h3>
                    <p className="text-xs text-slate-500">Cấu hình ngưỡng nhận bài toán tối đa của từng UX Squad</p>
                  </div>
                </div>
                <Badge variant="purple" size="sm">
                  {config.capacity.defaultSquadCapacity} task/squad
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Hạn mức tối đa mặc định cho mỗi Squad:
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={config.capacity.defaultSquadCapacity}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          capacity: { ...prev.capacity, defaultSquadCapacity: parseInt(e.target.value, 10) || 6 },
                        }))
                      }
                      className="font-mono text-sm w-32"
                    />
                    <span className="text-xs text-slate-500">task InProgress cùng lúc</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Khi một Squad vượt quá con số này, trạng thái của Squad sẽ tự động chuyển thành 'Quá tải'.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Cảnh báo Quá tải khi tạo Form:</div>
                      <p className="text-[11px] text-slate-500">Hiện thông báo màu vàng trên trang tạo bài toán khi Squad được chọn đang quá tải</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.capacity.overloadNotificationEnabled}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          capacity: { ...prev.capacity, overloadNotificationEnabled: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </Frame>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CẤP ĐỘ ƯU TIÊN (PRIORITY MATRIX) */}
      {activeSubTab === "priorities" && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-slate-700 leading-relaxed">
                Hệ thống hỗ trợ <strong>4 cấp độ ưu tiên (Lv1 - Lv4)</strong>. Bạn có thể tinh chỉnh tên nhãn, cam kết SLA theo giờ và mô tả điều kiện kích hoạt cho từng cấp.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
            {config.priorities.map((p, idx) => {
              const themeStyles = [
                {
                  cardBorder: "border-rose-200/90",
                  headerBg: "bg-rose-50/60 border-rose-200/70",
                  badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
                  numBadge: "bg-rose-100 text-rose-800",
                  titleColor: "text-rose-950",
                  icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
                },
                {
                  cardBorder: "border-amber-200/90",
                  headerBg: "bg-amber-50/60 border-amber-200/70",
                  badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
                  numBadge: "bg-amber-100 text-amber-800",
                  titleColor: "text-amber-950",
                  icon: <Zap className="w-4 h-4 text-amber-600" />,
                },
                {
                  cardBorder: "border-blue-200/90",
                  headerBg: "bg-blue-50/60 border-blue-200/70",
                  badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
                  numBadge: "bg-blue-100 text-blue-800",
                  titleColor: "text-blue-950",
                  icon: <Layers className="w-4 h-4 text-blue-600" />,
                },
                {
                  cardBorder: "border-slate-200",
                  headerBg: "bg-slate-50 border-slate-200/80",
                  badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                  numBadge: "bg-slate-200/80 text-slate-700",
                  titleColor: "text-slate-900",
                  icon: <CheckCircle2 className="w-4 h-4 text-slate-600" />,
                },
              ][idx] || {
                cardBorder: "border-slate-200",
                headerBg: "bg-slate-50 border-slate-200",
                badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                numBadge: "bg-slate-100 text-slate-700",
                titleColor: "text-slate-900",
                icon: <Clock className="w-4 h-4 text-slate-600" />,
              }

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl border ${themeStyles.cardBorder} shadow-2xs overflow-hidden flex flex-col transition-all`}
                >
                  {/* Card Header with Level, Icon and Active Switch */}
                  <div className={`px-4 py-3 border-b ${themeStyles.headerBg} flex items-center justify-between`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-lg ${themeStyles.numBadge} flex items-center justify-center font-bold text-xs font-mono`}>
                        {idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${themeStyles.titleColor}`}>{p.id.toUpperCase()}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${themeStyles.badgeClass}`}>
                          {p.label}
                        </span>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
                      <input
                        type="checkbox"
                        checked={p.active}
                        onChange={(e) => {
                          const updated = [...config.priorities]
                          updated[idx] = { ...p, active: e.target.checked }
                          updateConfig((prev) => ({ ...prev, priorities: updated }))
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900 relative" />
                      <span className="text-[11px] text-slate-600">{p.active ? "Đang bật" : "Tắt"}</span>
                    </label>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Tiêu đề nhãn: <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={p.label}
                            onChange={(e) => {
                              const updated = [...config.priorities]
                              updated[idx] = { ...p, label: e.target.value }
                              updateConfig((prev) => ({ ...prev, priorities: updated }))
                            }}
                            className="text-xs rounded-xl border-slate-200 font-medium h-9"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Thời hạn SLA: <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Input
                              type="number"
                              min={1}
                              value={p.slaHours}
                              onChange={(e) => {
                                const hours = parseInt(e.target.value, 10) || 24
                                const updated = [...config.priorities]
                                updated[idx] = {
                                  ...p,
                                  slaHours: hours,
                                  slaDaysText: `${hours} giờ (${Math.round((hours / 24) * 10) / 10} ngày làm việc)`,
                                }
                                updateConfig((prev) => ({ ...prev, priorities: updated }))
                              }}
                              className="font-mono text-xs rounded-xl border-slate-200 font-medium h-9 pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                              Giờ
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Mô tả tiêu chuẩn phân loại:
                        </label>
                        <Textarea
                          rows={2}
                          value={p.description}
                          onChange={(e) => {
                            const updated = [...config.priorities]
                            updated[idx] = { ...p, description: e.target.value }
                            updateConfig((prev) => ({ ...prev, priorities: updated }))
                          }}
                          placeholder="Mô tả mức độ nghiêm trọng và tiêu chí bài toán..."
                          className="text-xs rounded-xl border-slate-200 resize-none leading-relaxed"
                        />
                      </div>
                    </div>

                    {/* Footer live preview */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="text-[11px]">Xem trước nhãn bài toán:</span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-medium border ${themeStyles.badgeClass}`}>
                          {themeStyles.icon}
                          <span>{p.label}</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {p.slaHours}h
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: TRỌNG SỐ ĐÁNH GIÁ KPI */}
      {activeSubTab === "evaluation" && (
        <div className="space-y-6">
          <Frame variant="default" padding="lg" className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Ma Trận Trọng Số Đánh Giá Năng Lực & KPI</h3>
                  <p className="text-xs text-slate-500">Xác định tỷ trọng 4 tiêu chí cốt lõi trong thang điểm tổng kết định kỳ</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium">Tổng tỷ trọng:</span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                    evaluationWeightSum === 100
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                  }`}
                >
                  {evaluationWeightSum}% / 100%
                </span>
                {evaluationWeightSum !== 100 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateConfig((prev) => ({
                        ...prev,
                        evaluation: {
                          ...prev.evaluation,
                          qualityWeight: 40,
                          slaComplianceWeight: 30,
                          ftrWeight: 20,
                          designSystemWeight: 10,
                        },
                      }))
                    }
                    className="text-xs h-7 px-2 border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Tự động cân bằng 100%
                  </Button>
                )}
              </div>
            </div>

            {evaluationWeightSum !== 100 && (
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Cảnh báo: Tổng tỷ trọng các tiêu chí hiện tại là {evaluationWeightSum}%. Tổng số cần bằng đúng 100% để đảm bảo kết quả đánh giá chuẩn xác.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
              {/* Tiêu chí 1 */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-900 text-xs sm:text-sm">1. Chất lượng Thiết kế & Tuân thủ ReUI</span>
                  <span className="font-medium text-slate-900 font-mono text-sm bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/80">
                    {config.evaluation.qualityWeight}%
                  </span>
                </div>
                <Slider
                  min={10}
                  max={70}
                  step={5}
                  value={config.evaluation.qualityWeight}
                  onChange={(val) =>
                    updateConfig((prev) => ({
                      ...prev,
                      evaluation: { ...prev.evaluation, qualityWeight: val },
                    }))
                  }
                  color="#0F172A"
                />
                <p className="text-[11px] text-slate-500 leading-relaxed">Đánh giá độ chuẩn mực của layout, visual hierarchy và hệ thống token</p>
              </div>

              {/* Tiêu chí 2 */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-900 text-xs sm:text-sm">2. Tuân thủ SLA Bàn Giao Đúng Hạn</span>
                  <span className="font-medium text-slate-900 font-mono text-sm bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/80">
                    {config.evaluation.slaComplianceWeight}%
                  </span>
                </div>
                <Slider
                  min={10}
                  max={70}
                  step={5}
                  value={config.evaluation.slaComplianceWeight}
                  onChange={(val) =>
                    updateConfig((prev) => ({
                      ...prev,
                      evaluation: { ...prev.evaluation, slaComplianceWeight: val },
                    }))
                  }
                  color="#0F172A"
                />
                <p className="text-[11px] text-slate-500 leading-relaxed">Tỷ lệ các bài toán nghiệm thu đúng hoặc sớm hơn mốc deadline cam kết</p>
              </div>

              {/* Tiêu chí 3 */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-900 text-xs sm:text-sm">3. First-Time-Right (Duyệt Lần 1)</span>
                  <span className="font-medium text-slate-900 font-mono text-sm bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/80">
                    {config.evaluation.ftrWeight}%
                  </span>
                </div>
                <Slider
                  min={5}
                  max={50}
                  step={5}
                  value={config.evaluation.ftrWeight}
                  onChange={(val) =>
                    updateConfig((prev) => ({
                      ...prev,
                      evaluation: { ...prev.evaluation, ftrWeight: val },
                    }))
                  }
                  color="#0F172A"
                />
                <p className="text-[11px] text-slate-500 leading-relaxed">Tỷ lệ giải pháp được PO đồng thuận ngay sau phiên review đầu tiên</p>
              </div>

              {/* Tiêu chí 4 */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-900 text-xs sm:text-sm">4. Đóng Góp Component / UI Kit</span>
                  <span className="font-medium text-slate-900 font-mono text-sm bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/80">
                    {config.evaluation.designSystemWeight}%
                  </span>
                </div>
                <Slider
                  min={5}
                  max={40}
                  step={5}
                  value={config.evaluation.designSystemWeight}
                  onChange={(val) =>
                    updateConfig((prev) => ({
                      ...prev,
                      evaluation: { ...prev.evaluation, designSystemWeight: val },
                    }))
                  }
                  color="#0F172A"
                />
                <p className="text-[11px] text-slate-500 leading-relaxed">Tái sử dụng và xây dựng mới các component cho ReUI Design System MB</p>
              </div>
            </div>

            {/* Ngưỡng xếp loại thi đua */}
            <div className="pt-3 border-t border-slate-200/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                Ngưỡng Điểm Xếp Loại Thi Đua:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Hạng Xuất Sắc */}
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2.5 shadow-2xs">
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" />
                      <span>Hạng Xuất Sắc</span>
                    </span>
                    <span className="font-mono text-xs font-medium px-2 py-0.5 bg-emerald-100/80 text-emerald-800 rounded-md border border-emerald-200">
                      ≥ {config.evaluation.excellentMinScore} điểm
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      value={config.evaluation.excellentMinScore}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          evaluation: {
                            ...prev.evaluation,
                            excellentMinScore: parseInt(e.target.value, 10) || 90,
                          },
                        }))
                      }
                      className="font-mono text-sm h-9 bg-white rounded-xl border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20 pr-16 font-medium"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">/ 100 đ</span>
                  </div>
                </div>

                {/* Hạng Tốt */}
                <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-2.5 shadow-2xs">
                  <div className="flex justify-between items-center text-xs font-bold text-blue-900">
                    <span className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-blue-600" />
                      <span>Hạng Tốt</span>
                    </span>
                    <span className="font-mono text-xs font-medium px-2 py-0.5 bg-blue-100/80 text-blue-800 rounded-md border border-blue-200">
                      ≥ {config.evaluation.goodMinScore} điểm
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      value={config.evaluation.goodMinScore}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          evaluation: {
                            ...prev.evaluation,
                            goodMinScore: parseInt(e.target.value, 10) || 80,
                          },
                        }))
                      }
                      className="font-mono text-sm h-9 bg-white rounded-xl border-blue-200 focus:border-blue-500 focus:ring-blue-500/20 pr-16 font-medium"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">/ 100 đ</span>
                  </div>
                </div>

                {/* Hạng Đạt Yêu Cầu */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5 shadow-2xs">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-slate-500" />
                      <span>Hạng Đạt Yêu Cầu</span>
                    </span>
                    <span className="font-mono text-xs font-medium px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md border border-slate-300">
                      ≥ {config.evaluation.passMinScore} điểm
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      value={config.evaluation.passMinScore}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          evaluation: {
                            ...prev.evaluation,
                            passMinScore: parseInt(e.target.value, 10) || 70,
                          },
                        }))
                      }
                      className="font-mono text-sm h-9 bg-white rounded-xl border-slate-200 focus:border-slate-400 pr-16 font-medium"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">/ 100 đ</span>
                  </div>
                </div>
              </div>
            </div>
          </Frame>
        </div>
      )}

      {/* SUB-TAB 5: KHẢO SÁT & ĐỀ THI */}
      {activeSubTab === "assessment" && (
        <div className="space-y-6">
          <Frame variant="default" padding="lg" className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Thông Số Khảo Sát & Bài Thi Năng Lực UX</h3>
                <p className="text-xs text-slate-500">Cấu hình tiêu chuẩn điểm sàn, thời lượng và cơ chế thi cử</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Điểm số đạt chuẩn (%):
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={40}
                    max={100}
                    value={config.assessment.passingScorePercent}
                    onChange={(e) =>
                      updateConfig((prev) => ({
                        ...prev,
                        assessment: { ...prev.assessment, passingScorePercent: parseInt(e.target.value, 10) || 70 },
                      }))
                    }
                    className="font-mono text-sm"
                  />
                  <span className="text-xs text-slate-500">% đúng</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Đạt chứng chỉ năng lực khi bài thi ≥ mốc này</p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Thời lượng làm bài tiêu chuẩn (phút):
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={10}
                    max={180}
                    value={config.assessment.defaultDurationMinutes}
                    onChange={(e) =>
                      updateConfig((prev) => ({
                        ...prev,
                        assessment: { ...prev.assessment, defaultDurationMinutes: parseInt(e.target.value, 10) || 45 },
                      }))
                    }
                    className="font-mono text-sm"
                  />
                  <span className="text-xs text-slate-500">phút</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Hệ thống tự động thu bài khi hết giờ</p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Số lần thử tối đa / nhân sự:
                </label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={config.assessment.maxAttempts}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      assessment: { ...prev.assessment, maxAttempts: parseInt(e.target.value, 10) || 3 },
                    }))
                  }
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">Số lượt thi lại nếu chưa đạt điểm sàn</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="text-xs font-semibold text-slate-900 block mb-1">Quy tắc bảo mật đề thi:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-700 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.assessment.shuffleQuestions}
                    onChange={(e) =>
                      updateConfig((prev) => ({
                        ...prev,
                        assessment: { ...prev.assessment, shuffleQuestions: e.target.checked },
                      }))
                    }
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Xáo trộn câu hỏi & đáp án</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.assessment.showImmediateResults}
                    onChange={(e) =>
                      updateConfig((prev) => ({
                        ...prev,
                        assessment: { ...prev.assessment, showImmediateResults: e.target.checked },
                      }))
                    }
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Hiện kết quả & điểm ngay</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.assessment.allowReviewAnswers}
                    onChange={(e) =>
                      updateConfig((prev) => ({
                        ...prev,
                        assessment: { ...prev.assessment, allowReviewAnswers: e.target.checked },
                      }))
                    }
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Cho phép xem lại lời giải chi tiết</span>
                </label>
              </div>
            </div>
          </Frame>
        </div>
      )}

      {/* SUB-TAB 6: CỔNG PORTAL & BANNER THÔNG BÁO KHẨN */}
      {activeSubTab === "portal" && (
        <div className="space-y-6">
          {/* Global Announcement Banner Editor */}
          <Frame variant="default" padding="lg" className="space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Banner Thông Báo Khẩn Toàn Hệ Thống (Global Announcement)</h3>
                  <p className="text-xs text-slate-500">Phát thông báo nổi bật trên đỉnh tất cả các màn hình cho toàn thể người dùng</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-medium text-slate-600">
                  {config.portal.announcement.enabled ? "Đang bật" : "Đang tắt"}
                </span>
                <input
                  type="checkbox"
                  checked={config.portal.announcement.enabled}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      portal: {
                        ...prev.portal,
                        announcement: { ...prev.portal.announcement, enabled: e.target.checked },
                      },
                    }))
                  }
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Kiểu thông báo:</label>
                  <select
                    value={config.portal.announcement.type}
                    onChange={(e) =>
                      updateConfig((prev) => ({
                        ...prev,
                        portal: {
                          ...prev.portal,
                          announcement: { ...prev.portal.announcement, type: e.target.value as any },
                        },
                      }))
                    }
                    className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-slate-800"
                  >
                    <option value="info">Thông tin chung (Info - Xanh dương)</option>
                    <option value="warning">Cảnh báo / Bảo trì (Warning - Hổ phách)</option>
                    <option value="success">Phát hành tính năng (Success - Xanh lá)</option>
                    <option value="destructive">Khẩn cấp / Sự cố (Destructive - Đỏ)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Đường dẫn liên kết (tùy chọn):</label>
                  <Input
                    placeholder="https://wiki.mbbank.com.vn/..."
                    value={config.portal.announcement.linkUrl || ""}
                    onChange={(e) =>
                      updateConfig((prev) => ({
                        ...prev,
                        portal: {
                          ...prev.portal,
                          announcement: { ...prev.portal.announcement, linkUrl: e.target.value },
                        },
                      }))
                    }
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Nhãn nút liên kết:</label>
                  <Input
                    placeholder="Xem chi tiết"
                    value={config.portal.announcement.linkText || ""}
                    onChange={(e) =>
                      updateConfig((prev) => ({
                        ...prev,
                        portal: {
                          ...prev.portal,
                          announcement: { ...prev.portal.announcement, linkText: e.target.value },
                        },
                      }))
                    }
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Nội dung thông báo khẩn:</label>
                <Textarea
                  rows={2}
                  placeholder="Nhập nội dung thông báo muốn truyền tải đến người dùng toàn hệ thống..."
                  value={config.portal.announcement.message}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      portal: {
                        ...prev.portal,
                        announcement: { ...prev.portal.announcement, message: e.target.value },
                      },
                    }))
                  }
                  className="text-xs resize-none"
                />
              </div>

              {/* Live Preview of the Announcement Banner */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Xem trước Banner thực tế:
                </span>
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  <div className={`p-3 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 ${
                    config.portal.announcement.type === "warning"
                      ? "bg-amber-900 text-amber-50"
                      : config.portal.announcement.type === "success"
                      ? "bg-emerald-950 text-emerald-50"
                      : config.portal.announcement.type === "destructive"
                      ? "bg-rose-950 text-rose-50"
                      : "bg-slate-900 text-white"
                  }`}>
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 shrink-0 text-amber-300" />
                      <span className="font-semibold">{config.portal.announcement.message || "Chưa có nội dung thông báo"}</span>
                    </div>
                    {config.portal.announcement.linkUrl && (
                      <span className="underline text-xs font-semibold cursor-pointer shrink-0">
                        {config.portal.announcement.linkText || "Chi tiết"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Frame>

          {/* Brand & Portal Metadata */}
          <Frame variant="default" padding="lg" className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Thông Tin Thương Hiệu & Kênh Hỗ Trợ</h3>
                <p className="text-xs text-slate-500">Cấu hình tên gọi hiển thị trên tiêu đề trang, email và tài liệu hệ thống</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Tên Cổng Portal Đầy Đủ:</label>
                <Input
                  value={config.portal.brandName}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      portal: { ...prev.portal, brandName: e.target.value },
                    }))
                  }
                  className="text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Tên Viết Tắt (Header):</label>
                <Input
                  value={config.portal.shortName}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      portal: { ...prev.portal, shortName: e.target.value },
                    }))
                  }
                  className="text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Đơn vị Quản trị / Khối Nghiệp vụ:</label>
                <Input
                  value={config.portal.department}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      portal: { ...prev.portal, department: e.target.value },
                    }))
                  }
                  className="text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Email Kỹ Thuật Hỗ Trợ:</label>
                <Input
                  value={config.portal.supportEmail}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      portal: { ...prev.portal, supportEmail: e.target.value },
                    }))
                  }
                  className="text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-700 block mb-1">Khẩu hiệu / Tagline:</label>
                <Input
                  value={config.portal.tagline}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      portal: { ...prev.portal, tagline: e.target.value },
                    }))
                  }
                  className="text-xs font-medium"
                />
              </div>
            </div>
          </Frame>

          {/* Attachments Limits */}
          <Frame variant="default" padding="lg" className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <Paperclip className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Giới Hạn Tệp Tin Đính Kèm (Upload Rules)</h3>
                <p className="text-xs text-slate-500">Quy định dung lượng và số lượng file tài liệu/ảnh trên form yêu cầu</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Dung lượng tối đa / file (MB):</label>
                <Input
                  type="number"
                  min={2}
                  max={100}
                  value={config.attachments.maxFileSizeMb}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      attachments: { ...prev.attachments, maxFileSizeMb: parseInt(e.target.value, 10) || 20 },
                    }))
                  }
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Số tệp tối đa / yêu cầu:</label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={config.attachments.maxFilesCount}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      attachments: { ...prev.attachments, maxFilesCount: parseInt(e.target.value, 10) || 10 },
                    }))
                  }
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.attachments.allowScreenshotsPaste}
                    onChange={(e) =>
                      updateConfig((prev) => ({
                        ...prev,
                        attachments: { ...prev.attachments, allowScreenshotsPaste: e.target.checked },
                      }))
                    }
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Cho phép dán trực tiếp ảnh chụp màn hình (Ctrl+V)</span>
                </label>
              </div>
            </div>
          </Frame>
        </div>
      )}

      {/* MODAL 1: Xác nhận Khôi phục Gốc */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Khôi phục cấu hình mặc định?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Thao tác này sẽ đặt lại toàn bộ thông số SLA (24h PO pending, 5.0 ngày cycle), định mức tải việc và trọng số KPI về giá trị tiêu chuẩn ban đầu của MBBank.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowResetConfirm(false)}
                className="text-xs cursor-pointer"
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleReset}
                className="text-xs bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
              >
                Xác nhận khôi phục
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Nhập JSON cấu hình */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-slate-600" />
                <span>Nhập File Cấu Hình Hệ Thống (JSON)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Dán nội dung tệp JSON sao lưu cấu hình vào khung bên dưới để nạp lại các thông số.
            </p>

            <Textarea
              rows={8}
              placeholder="Dán mã JSON cấu hình tại đây..."
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="font-mono text-xs"
            />

            {importError && (
              <p className="text-xs text-rose-600 font-medium">{importError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowImportModal(false)}
                className="text-xs cursor-pointer"
              >
                Đóng
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleImport}
                className="text-xs bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
              >
                Áp dụng cấu hình
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Thêm ngày nghỉ ngoại lệ / Ngày làm bù */}
      {showAddHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {newHolidayType === "compensatory_workday" ? (
                  <>
                    <Briefcase className="w-4 h-4 text-amber-600" />
                    <span>Thêm Ngày Làm Bù (Compensatory Workday)</span>
                  </>
                ) : (
                  <>
                    <CalendarDays className="w-4 h-4 text-indigo-600" />
                    <span>Thêm Ngày Nghỉ Lễ / Ngoại Lệ</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddHolidayModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {newHolidayType === "compensatory_workday"
                ? "Thiết lập ngày làm bù cuối tuần (hoán đổi nghỉ lễ). Hệ thống sẽ tự động TÍNH SLA như ngày làm việc thông thường."
                : "Thêm các ngày nghỉ lễ, team-building hoặc ngoại lệ để hệ thống LOẠI TRỪ khi tính hạn cam kết SLA của bài toán."}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {newHolidayType === "compensatory_workday" ? "Tên sự kiện làm bù" : "Tên ngày nghỉ / Dịp lễ"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder={
                    newHolidayType === "compensatory_workday"
                      ? "Ví dụ: Làm bù thứ Bảy hoán đổi nghỉ lễ Quốc khánh..."
                      : "Ví dụ: Team Building MBBank, Kỷ niệm ngày thành lập..."
                  }
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Phân loại & Cơ chế SLA</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { type: "public_holiday", label: "Lễ Quốc Gia" },
                    { type: "internal_holiday", label: "Nội bộ MB" },
                    { type: "day_off", label: "Nghỉ phép" },
                    { type: "compensatory_workday", label: "💼 Làm bù (Tính SLA)" },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setNewHolidayType(item.type as any)}
                      className={`py-1.5 px-2 rounded-lg border text-center text-[11px] transition-all cursor-pointer ${
                        newHolidayType === item.type
                          ? item.type === "compensatory_workday"
                            ? "border-amber-500 bg-amber-50 text-amber-900 font-semibold shadow-2xs"
                            : "border-indigo-600 bg-indigo-50/70 text-indigo-700 font-semibold shadow-2xs"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {newHolidayType === "compensatory_workday" && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2">
                  <Briefcase className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="font-semibold">Cơ chế ngày làm bù:</strong> Hệ thống sẽ đếm hạn SLA bình thường cho ngày này (kể cả khi là Thứ 7 hoặc Chủ Nhật).
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {newHolidayType === "compensatory_workday" ? "Ngày làm bù" : "Từ ngày"}{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {newHolidayType === "compensatory_workday" ? "Đến ngày (nếu làm bù nhiều ngày)" : "Đến ngày (nếu có)"}
                  </label>
                  <Input
                    type="date"
                    value={newHolidayEndDate}
                    onChange={(e) => setNewHolidayEndDate(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>

              {newHolidayType === "compensatory_workday" && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Làm bù cho dịp lễ / ngày nghỉ nào</label>
                  <Input
                    placeholder="Ví dụ: Nghỉ liền kề Quốc khánh 01/09, Nghỉ Tết Nguyên Đán..."
                    value={newHolidayCompensatoryFor}
                    onChange={(e) => setNewHolidayCompensatoryFor(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">Ghi chú / Căn cứ ban hành</label>
                <Input
                  placeholder="Ghi chú chi tiết hoặc số hiệu thông báo..."
                  value={newHolidayDesc}
                  onChange={(e) => setNewHolidayDesc(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddHolidayModal(false)}
                className="text-xs cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (!newHolidayName.trim()) {
                    toast.error("Vui lòng nhập tên sự kiện")
                    return
                  }
                  if (!newHolidayDate) {
                    toast.error("Vui lòng chọn ngày")
                    return
                  }
                  const newHoliday: HolidayException = {
                    id: `cal-${Date.now()}`,
                    name: newHolidayName.trim(),
                    date: newHolidayDate,
                    endDate: newHolidayEndDate ? newHolidayEndDate : undefined,
                    type: newHolidayType,
                    description: newHolidayDesc.trim() || undefined,
                    compensatoryFor: newHolidayType === "compensatory_workday" && newHolidayCompensatoryFor.trim()
                      ? newHolidayCompensatoryFor.trim()
                      : undefined,
                  }
                  updateConfig((prev) => ({
                    ...prev,
                    workSchedule: {
                      ...prev.workSchedule,
                      holidays: [...(prev.workSchedule?.holidays || []), newHoliday],
                    },
                  }))
                  setShowAddHolidayModal(false)
                  setNewHolidayName("")
                  setNewHolidayDate("")
                  setNewHolidayEndDate("")
                  setNewHolidayDesc("")
                  setNewHolidayCompensatoryFor("")
                  const actionText = newHolidayType === "compensatory_workday" ? "ngày làm bù" : "ngày nghỉ"
                  toast.success(`Đã thêm ${actionText}`, `Đã lưu "${newHoliday.name}" vào lịch làm việc.`)
                }}
                className={`text-xs text-white cursor-pointer shadow-xs ${
                  newHolidayType === "compensatory_workday"
                    ? "bg-slate-900 hover:bg-slate-800"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {newHolidayType === "compensatory_workday" ? "Lưu ngày làm bù" : "Lưu ngày nghỉ"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
