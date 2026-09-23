import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Frame } from "@/components/reui/frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import {
  SystemConfig,
  NotificationTemplateSetting,
  DEFAULT_NOTIFICATION_SETTINGS,
  getSystemConfig,
  saveSystemConfig,
  SYSTEM_CONFIG_EVENT_NAME,
} from "@/config/systemConfig"
import { formatNotificationFromTemplate } from "@/config/notificationTemplates"
import {
  Bell,
  Search,
  Check,
  Send,
  Sparkles,
  Save,
  RotateCcw,
  Sliders,
  Mail,
  MessageSquare,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  UserCheck,
  Workflow,
  Plus,
  RefreshCw,
  Eye,
  Tag,
} from "lucide-react"

interface NotificationTemplatesTabProps {
  onLogAction?: (action: string, target: string, details: string, type: "workflow" | "masterdata" | "security") => void
}

type CategoryKey = "all" | "lifecycle" | "approval" | "assignment" | "sla" | "interaction" | "system"

export default function NotificationTemplatesTab({ onLogAction }: NotificationTemplatesTabProps) {
  const [config, setConfig] = useState<SystemConfig>(() => getSystemConfig())
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all")
  const [selectedType, setSelectedType] = useState<string>("task_created")
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Lắng nghe sự kiện đồng bộ
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail?.notifications) {
        setConfig(e.detail)
      }
    }
    window.addEventListener(SYSTEM_CONFIG_EVENT_NAME, handleUpdate)
    return () => window.removeEventListener(SYSTEM_CONFIG_EVENT_NAME, handleUpdate)
  }, [])

  const templatesList = useMemo(() => {
    return Object.values(config.notifications || DEFAULT_NOTIFICATION_SETTINGS)
  }, [config.notifications])

  const filteredTemplates = useMemo(() => {
    return templatesList.filter((item) => {
      const matchCat = activeCategory === "all" || item.category === activeCategory
      const matchQuery =
        !searchQuery ||
        item.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.titleTemplate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.messageTemplate.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCat && matchQuery
    })
  }, [templatesList, activeCategory, searchQuery])

  const currentTemplate = useMemo(() => {
    return (
      config.notifications?.[selectedType] ||
      templatesList[0] ||
      DEFAULT_NOTIFICATION_SETTINGS.task_created
    )
  }, [config.notifications, selectedType, templatesList])

  const updateCurrentTemplate = (updater: (prev: NotificationTemplateSetting) => NotificationTemplateSetting) => {
    setConfig((prev) => {
      const updated = {
        ...prev,
        notifications: {
          ...prev.notifications,
          [currentTemplate.type]: updater(currentTemplate),
        },
      }
      setIsDirty(true)
      return updated
    })
  }

  // Chèn placeholder vào vị trí hiện tại
  const insertPlaceholder = (placeholder: string, field: "title" | "message") => {
    if (field === "title") {
      updateCurrentTemplate((t) => ({
        ...t,
        titleTemplate: `${t.titleTemplate} ${placeholder}`,
      }))
    } else {
      updateCurrentTemplate((t) => ({
        ...t,
        messageTemplate: `${t.messageTemplate} ${placeholder}`,
      }))
    }
    toast.info("Đã chèn biến", `Đã thêm ${placeholder} vào mẫu thông báo.`)
  }

  // Lưu cấu hình
  const handleSave = () => {
    setIsSaving(true)
    try {
      const saved = saveSystemConfig(config, "Admin Quản Trị Hệ Thống")
      setConfig(saved)
      setIsDirty(false)
      toast.success("Đã lưu mẫu thông báo", "Các mẫu thông báo tự động và kênh phân phối đã được cập nhật.")
      onLogAction?.("Cập nhật mẫu thông báo", "Notification Templates", `Lưu tùy biến mẫu ${currentTemplate.eventName}`, "workflow")
    } catch (err: any) {
      toast.error("Lỗi khi lưu", err?.message || "Không thể lưu dữ liệu")
    } finally {
      setIsSaving(false)
    }
  }

  // Khôi phục mẫu mặc định của sự kiện này
  const handleResetCurrent = () => {
    const defaultTpl = DEFAULT_NOTIFICATION_SETTINGS[currentTemplate.type]
    if (defaultTpl) {
      updateCurrentTemplate(() => ({ ...defaultTpl }))
      toast.info("Đã đặt lại mẫu", `Mẫu thông báo ${currentTemplate.eventName} đã về mặc định.`)
    }
  }

  // Gửi thử thông báo mẫu trên màn hình
  const handleTestSend = () => {
    const preview = formatNotificationFromTemplate(currentTemplate.type as any, {
      requestId: "REQ-2026-089",
      taskTitle: "Tối ưu luồng Mở Thẻ Tín Dụng Online",
      actorName: "Nguyễn Văn Cường (UX Lead)",
      squadName: "Cards & Digital Payment",
      phaseName: "UI Design",
      deadline: "25/08/2026",
      hours: config.sla.poPendingTimeoutHours || 24,
      note: "Đã hoàn thành bàn giao Interactive Prototype trên Figma",
    })

    const toastFn =
      currentTemplate.toastType === "success"
        ? toast.success
        : currentTemplate.toastType === "warning"
        ? toast.warning
        : currentTemplate.toastType === "error"
        ? toast.error
        : toast.info

    toastFn(preview.title, preview.message, {
      duration: 6000,
    })
  }

  // Dữ liệu mẫu mô phỏng cho Live Preview
  const livePreview = useMemo(() => {
    return formatNotificationFromTemplate(currentTemplate.type as any, {
      requestId: "REQ-2026-089",
      taskTitle: "Tối ưu luồng Mở Thẻ Tín Dụng Online",
      actorName: "Nguyễn Văn Cường (UX Lead)",
      squadName: "Cards & Digital Payment",
      phaseName: "UI Design",
      deadline: "25/08/2026",
      hours: config.sla.poPendingTimeoutHours || 24,
      note: "Đã hoàn thành bàn giao Interactive Prototype trên Figma",
    })
  }, [currentTemplate, config.sla.poPendingTimeoutHours])

  const categories = [
    { id: "all", label: "Tất cả", count: templatesList.length },
    { id: "lifecycle", label: "Vòng đời Task", count: templatesList.filter((t) => t.category === "lifecycle").length },
    { id: "approval", label: "Duyệt & Feedback", count: templatesList.filter((t) => t.category === "approval").length },
    { id: "assignment", label: "Phân công", count: templatesList.filter((t) => t.category === "assignment").length },
    { id: "sla", label: "SLA & Pending", count: templatesList.filter((t) => t.category === "sla").length },
    { id: "interaction", label: "Tương tác", count: templatesList.filter((t) => t.category === "interaction").length },
  ] as const

  const placeholders = [
    { key: "{requestId}", label: "Mã bài toán", example: "REQ-2026-089" },
    { key: "{taskTitle}", label: "Tiêu đề yêu cầu", example: "Tối ưu luồng Mở Thẻ..." },
    { key: "{actorName}", label: "Người thực hiện", example: "Nguyễn Văn Cường" },
    { key: "{squadName}", label: "Tên Squad", example: "Cards & Payment" },
    { key: "{phaseName}", label: "Khâu quy trình", example: "UI Design" },
    { key: "{deadline}", label: "Hạn cam kết", example: "25/08/2026" },
    { key: "{hours}", label: "Số giờ", example: "24" },
    { key: "{note}", label: "Ghi chú / Feedback", example: "Đã gửi prototype..." },
  ]

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs shrink-0 mt-0.5">
            <Bell className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Cấu hình Mẫu Thông báo & Kênh Phân phối</h2>
              {isDirty && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Có thay đổi chưa lưu
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-4xl">
              Tùy biến nội dung tiêu đề, lời nhắn tự động với biến placeholder và lựa chọn kênh gửi (In-app, Teams Webhook, Email).
            </p>
          </div>
        </div>

        {/* Buttons sitting below text */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2.5 flex-wrap justify-between sm:justify-start">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetCurrent}
            className="text-xs font-medium gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer h-9 px-3.5 rounded-xl shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định mẫu này</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="text-xs font-medium gap-1.5 bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs disabled:opacity-50 h-9 px-4 rounded-xl ml-auto sm:ml-0"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaving ? "Đang lưu..." : "Lưu mẫu thông báo"}</span>
          </Button>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Template List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Tìm theo sự kiện, biến..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-white"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id as CategoryKey)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeCategory === c.id
                    ? "bg-slate-900 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c.label} ({c.count})
              </button>
            ))}
          </div>

          {/* Template Cards List */}
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredTemplates.map((tpl) => {
              const isSelected = selectedType === tpl.type
              return (
                <button
                  key={tpl.type}
                  type="button"
                  onClick={() => setSelectedType(tpl.type)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-white border-slate-900 shadow-xs ring-1 ring-slate-900/10"
                      : "bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {tpl.eventName}
                    </span>
                    <Badge
                      variant={
                        tpl.toastType === "success"
                          ? "success"
                          : tpl.toastType === "warning"
                          ? "warning"
                          : tpl.toastType === "error"
                          ? "destructive"
                          : "info"
                      }
                      size="sm"
                    >
                      {tpl.badgeLabel || tpl.toastType}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {tpl.messageTemplate}
                  </p>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                    <span className="font-mono text-slate-400">{tpl.type}</span>
                    <span className="ml-auto flex items-center gap-1.5">
                      {tpl.channels?.teams && <span title="Teams Webhook" className="text-blue-600">💬</span>}
                      {tpl.channels?.inApp && <span title="In-app Toast" className="text-amber-600">🔔</span>}
                      {tpl.channels?.email && <span title="Email" className="text-emerald-600">📧</span>}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Column: Template Editor & Live Preview (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Frame variant="default" padding="lg" className="space-y-5">
            {/* Editor Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Tùy Biến Mẫu: {currentTemplate.eventName}
                  </h3>
                  <code className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                    {currentTemplate.type}
                  </code>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Người nhận: <strong>{currentTemplate.recipients}</strong> · Người gửi: <strong>{currentTemplate.sender}</strong>
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <span className="text-xs font-medium text-slate-600">
                  {currentTemplate.enabled ? "Kích hoạt" : "Tạm tắt"}
                </span>
                <input
                  type="checkbox"
                  checked={currentTemplate.enabled}
                  onChange={(e) =>
                    updateCurrentTemplate((t) => ({ ...t, enabled: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                />
              </label>
            </div>

            {/* Quick Insert Placeholders Bar */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>Bấm để chèn nhanh biến Placeholder vào mẫu:</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {placeholders.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => insertPlaceholder(p.key, "message")}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-mono transition-colors cursor-pointer border border-slate-200/60"
                    title={`Thêm vào nội dung: ${p.label} (Ví dụ: ${p.example})`}
                  >
                    <span>{p.key}</span>
                    <Plus className="w-2.5 h-2.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Message Inputs */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-700">
                    Tiêu đề thông báo (Title Template):
                  </label>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder("{requestId}", "title")}
                    className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                  >
                    + Thêm {"{requestId}"}
                  </button>
                </div>
                <Input
                  value={currentTemplate.titleTemplate}
                  onChange={(e) =>
                    updateCurrentTemplate((t) => ({ ...t, titleTemplate: e.target.value }))
                  }
                  className="text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Nội dung thông báo chi tiết (Message Template):
                </label>
                <Textarea
                  rows={3}
                  value={currentTemplate.messageTemplate}
                  onChange={(e) =>
                    updateCurrentTemplate((t) => ({ ...t, messageTemplate: e.target.value }))
                  }
                  className="text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Nhãn Badge Popover:
                  </label>
                  <Input
                    value={currentTemplate.badgeLabel}
                    onChange={(e) =>
                      updateCurrentTemplate((t) => ({ ...t, badgeLabel: e.target.value }))
                    }
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Kiểu Toast màu sắc:
                  </label>
                  <select
                    value={currentTemplate.toastType}
                    onChange={(e) =>
                      updateCurrentTemplate((t) => ({ ...t, toastType: e.target.value as any }))
                    }
                    className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-slate-800"
                  >
                    <option value="info">Info (Xanh dương)</option>
                    <option value="success">Success (Xanh lá)</option>
                    <option value="warning">Warning (Hổ phách)</option>
                    <option value="error">Error (Đỏ cảnh báo)</option>
                  </select>
                </div>
              </div>

              {/* Multi-Channel Distribution Toggles */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="text-xs font-semibold text-slate-800 block">
                  Kênh phân phối thông báo tự động:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentTemplate.channels?.inApp}
                      onChange={(e) =>
                        updateCurrentTemplate((t) => ({
                          ...t,
                          channels: { ...t.channels, inApp: e.target.checked },
                        }))
                      }
                      className="rounded text-slate-900 focus:ring-slate-900"
                    />
                    <span>🔔 In-App Toast</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentTemplate.channels?.teams}
                      onChange={(e) =>
                        updateCurrentTemplate((t) => ({
                          ...t,
                          channels: { ...t.channels, teams: e.target.checked },
                        }))
                      }
                      className="rounded text-slate-900 focus:ring-slate-900"
                    />
                    <span>💬 Teams Webhook</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentTemplate.channels?.email}
                      onChange={(e) =>
                        updateCurrentTemplate((t) => ({
                          ...t,
                          channels: { ...t.channels, email: e.target.checked },
                        }))
                      }
                      className="rounded text-slate-900 focus:ring-slate-900"
                    />
                    <span>📧 Email nội bộ</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentTemplate.channels?.push}
                      onChange={(e) =>
                        updateCurrentTemplate((t) => ({
                          ...t,
                          channels: { ...t.channels, push: e.target.checked },
                        }))
                      }
                      className="rounded text-slate-900 focus:ring-slate-900"
                    />
                    <span>🖥️ Browser Push</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Live Visual Preview & Test Send */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Khung Xem Trước Thực Tế (Live Preview):</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleTestSend}
                  className="text-xs gap-1.5 bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Bắn thử Toast trên màn hình</span>
                </Button>
              </div>

              {/* Toast Card Simulation */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    currentTemplate.toastType === "success"
                      ? "bg-emerald-100 text-emerald-700"
                      : currentTemplate.toastType === "warning"
                      ? "bg-amber-100 text-amber-800"
                      : currentTemplate.toastType === "error"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {livePreview.title}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">vừa xong</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {livePreview.message}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge
                      variant={
                        currentTemplate.toastType === "success"
                          ? "success"
                          : currentTemplate.toastType === "warning"
                          ? "warning"
                          : currentTemplate.toastType === "error"
                          ? "destructive"
                          : "info"
                      }
                      size="sm"
                    >
                      {currentTemplate.badgeLabel || "Thông báo"}
                    </Badge>
                    <span className="text-[10px] text-slate-400">
                      Gửi tới: {livePreview.recipients}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Frame>
        </div>
      </div>
    </div>
  )
}
