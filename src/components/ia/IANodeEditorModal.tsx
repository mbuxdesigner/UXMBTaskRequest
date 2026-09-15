import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Layers,
  Smartphone,
  Layout,
  Globe,
  Bell,
  PanelBottom,
  ExternalLink,
  CheckCircle2,
  Users,
  Search,
  Check,
} from "lucide-react"
import { springs, dialogOverlayVariants, dialogContentVariants } from "@/lib/motion"
import { IANode, IATier, IATouchpointType } from "@/types/ia"
import { STANDARD_SQUADS } from "@/data/iaMockData"
import { UXRequest } from "@/data/mockData"

export type ModalMode = "add" | "edit" | "delete" | "reset" | null

interface IANodeEditorModalProps {
  mode: ModalMode
  targetNode: IANode | null
  isOpen: boolean
  availableRequests?: UXRequest[]
  onClose: () => void
  onConfirmAdd?: (parentId: string, data: Partial<IANode>) => void
  onConfirmEdit?: (nodeId: string, data: Partial<IANode>) => void
  onConfirmDelete?: (nodeId: string) => void
  onConfirmReset?: () => void
}

const TOUCHPOINT_OPTIONS: { value: IATouchpointType; label: string }[] = [
  { value: "screen", label: "Màn hình chính (Screen)" },
  { value: "modal", label: "Hộp thoại Popup (Modal)" },
  { value: "bottom_sheet", label: "Bảng trượt đáy (Bottom Sheet)" },
  { value: "push_notification", label: "Thông báo đẩy (Push Notification)" },
  { value: "webview", label: "Nhúng web (WebView)" },
  { value: "action_sheet", label: "Menu thao tác (Action Sheet)" },
]

export default function IANodeEditorModal({
  mode,
  targetNode,
  isOpen,
  availableRequests = [],
  onClose,
  onConfirmAdd,
  onConfirmEdit,
  onConfirmDelete,
  onConfirmReset,
}: IANodeEditorModalProps) {
  const [name, setName] = useState<string>("")
  const [squad, setSquad] = useState<string>("")
  const [customSquad, setCustomSquad] = useState<string>("")
  const [taskIds, setTaskIds] = useState<string[]>([])
  const [hasActiveTaskState, setHasActiveTaskState] = useState<"auto" | "active" | "idle">("auto")
  const [code, setCode] = useState<string>("")
  const [customTag, setCustomTag] = useState<string>("")
  const [colorTheme, setColorTheme] = useState<string>("blue")
  const [description, setDescription] = useState<string>("")
  const [touchpointType, setTouchpointType] = useState<IATouchpointType>("screen")
  const [figmaUrl, setFigmaUrl] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")

  // Task multi-select dropdown states
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>("")
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState<boolean>(false)

  // Prepopulate or reset fields whenever mode or targetNode changes
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage("")
      setIsTaskDropdownOpen(false)
      setTaskSearchQuery("")
      return
    }
    if (mode === "edit" && targetNode) {
      setName(targetNode.name || "")
      const nodeSquad = targetNode.squad || ""
      if (nodeSquad && !STANDARD_SQUADS.includes(nodeSquad)) {
        setSquad("custom")
        setCustomSquad(nodeSquad)
      } else {
        setSquad(nodeSquad)
        setCustomSquad("")
      }

      // Populate taskIds
      const initialTaskIds: string[] = []
      if (targetNode.taskIds && targetNode.taskIds.length > 0) {
        targetNode.taskIds.forEach((id) => {
          if (id && !initialTaskIds.includes(id)) initialTaskIds.push(id)
        })
      } else if (targetNode.requestId && !initialTaskIds.includes(targetNode.requestId)) {
        initialTaskIds.push(targetNode.requestId)
      }
      setTaskIds(initialTaskIds)

      // Populate active status
      if (targetNode.hasActiveTask === true) {
        setHasActiveTaskState("active")
      } else if (targetNode.hasActiveTask === false) {
        setHasActiveTaskState("idle")
      } else {
        setHasActiveTaskState("auto")
      }

      setCode(targetNode.code || "")
      setCustomTag(targetNode.customTag || "")
      setColorTheme(targetNode.colorTheme || "blue")
      setDescription(targetNode.description || "")
      setTouchpointType(targetNode.touchpointType || "screen")
      setFigmaUrl(targetNode.figmaUrl || "")
      setErrorMessage("")
    } else if (mode === "add" && targetNode) {
      setName("")
      setSquad(targetNode.squad || "")
      setCustomSquad("")
      setTaskIds([])
      setHasActiveTaskState("auto")
      setCode("")
      setCustomTag("")
      setColorTheme(targetNode.colorTheme || "blue")
      setDescription("")
      setTouchpointType("screen")
      setFigmaUrl("")
      setErrorMessage("")
    } else {
      setErrorMessage("")
    }
  }, [isOpen, mode, targetNode])

  // Filter available tasks based on search query
  const filteredAvailableTasks = useMemo(() => {
    const q = taskSearchQuery.trim().toLowerCase()
    if (!q) return availableRequests.slice(0, 10)
    return availableRequests.filter(
      (r) =>
        r.request_id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.assigned_designer && r.assigned_designer.toLowerCase().includes(q))
    )
  }, [availableRequests, taskSearchQuery])

  const toggleTaskId = (id: string) => {
    setTaskIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const removeTaskId = (id: string) => {
    setTaskIds((prev) => prev.filter((item) => item !== id))
  }

  const addManualTaskId = (manualId: string) => {
    const trimmed = manualId.trim().toUpperCase()
    if (trimmed && !taskIds.includes(trimmed)) {
      setTaskIds((prev) => [...prev, trimmed])
      setTaskSearchQuery("")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setErrorMessage("Vui lòng nhập tên tính năng / node (không được để trống)")
      return
    }

    const finalSquad = squad === "custom" ? customSquad.trim() : squad
    const finalHasActive =
      hasActiveTaskState === "active"
        ? true
        : hasActiveTaskState === "idle"
        ? false
        : undefined

    const nodePayload: Partial<IANode> = {
      name: name.trim(),
      squad: finalSquad || undefined,
      taskIds: taskIds.length > 0 ? taskIds : undefined,
      requestId: taskIds.length > 0 ? taskIds[0] : undefined,
      hasActiveTask: finalHasActive,
      code: code.trim() || undefined,
      customTag: customTag.trim() || undefined,
      colorTheme: colorTheme || undefined,
      description: description.trim() || undefined,
      touchpointType:
        (mode === "add" && targetNode?.tier === 3) ||
        (mode === "edit" && targetNode?.tier === 4)
          ? touchpointType
          : undefined,
      figmaUrl: figmaUrl.trim() || undefined,
    }

    if (mode === "add" && targetNode) {
      onConfirmAdd?.(targetNode.id, nodePayload)
      onClose()
    } else if (mode === "edit" && targetNode) {
      onConfirmEdit?.(targetNode.id, nodePayload)
      onClose()
    } else if (mode === "delete" && targetNode) {
      onConfirmDelete?.(targetNode.id)
      onClose()
    } else if (mode === "reset") {
      onConfirmReset?.()
      onClose()
    }
  }

  if (!isOpen || !mode) return null

  const isFormMode = mode === "add" || mode === "edit"
  const isDeleteMode = mode === "delete"
  const isResetMode = mode === "reset"

  const nextTier = targetNode ? ((targetNode.tier + 1) as IATier) : 2
  const showTouchpointSelect =
    (mode === "add" && targetNode?.tier === 3) ||
    (mode === "edit" && targetNode?.tier === 4)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop Overlay */}
        <motion.div
          variants={dialogOverlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        {/* Dialog Card */}
        <motion.div
          role="dialog"
          aria-modal="true"
          variants={dialogContentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={springs.gentle}
          className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isDeleteMode
                    ? "bg-rose-50 text-rose-600"
                    : isResetMode
                    ? "bg-amber-50 text-amber-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                {mode === "add" && <Plus className="w-5 h-5" />}
                {mode === "edit" && <Pencil className="w-4 h-4" />}
                {mode === "delete" && <Trash2 className="w-4 h-4" />}
                {mode === "reset" && <RotateCcw className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {mode === "add" && `Thêm Tính Năng / Node mới (Cấp ${nextTier})`}
                  {mode === "edit" && `Chỉnh sửa Tính Năng: ${targetNode?.name}`}
                  {mode === "delete" && "Xác nhận xóa Node"}
                  {mode === "reset" && "Khôi phục dữ liệu cây IA chuẩn"}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {mode === "add" && `Thuộc nhánh: ${targetNode?.name}`}
                  {mode === "edit" && `Cấp bậc Tầng ${targetNode?.tier}`}
                  {mode === "delete" && "Hành động này sẽ loại bỏ node khỏi cây"}
                  {mode === "reset" && "Tái tạo lại sơ đồ mặc định ban đầu"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content with Scroll */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form Fields for Add / Edit */}
              {isFormMode && (
                <>
                  {/* 1. Tên Tính Năng */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên tính năng <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      data-testid="ia-node-modal-name-input"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (errorMessage) setErrorMessage("")
                      }}
                      placeholder="VD: Mở Thẻ Tín Dụng Online, Chia Tiền VietQR..."
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-semibold text-slate-900"
                      autoFocus
                    />
                  </div>

                  {/* 2. Chọn Squad */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Chọn Squad phụ trách</span>
                    </label>
                    <select
                      data-testid="ia-node-modal-squad-select"
                      value={squad}
                      onChange={(e) => setSquad(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
                    >
                      <option value="">-- Chưa phân Squad --</option>
                      {STANDARD_SQUADS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      <option value="custom">-- Nhập Squad khác... --</option>
                    </select>

                    {squad === "custom" && (
                      <input
                        type="text"
                        value={customSquad}
                        onChange={(e) => setCustomSquad(e.target.value)}
                        placeholder="Nhập tên Squad tùy chỉnh..."
                        className="w-full mt-2 px-3.5 py-2 text-xs bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
                      />
                    )}
                  </div>

                  {/* 3. Chọn Danh sách Task liên kết */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>Danh sách Task liên kết ({taskIds.length})</span>
                      </label>
                    </div>

                    {/* Selected Task Chips */}
                    {taskIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-slate-50 rounded-xl border border-slate-200/70 max-h-24 overflow-y-auto">
                        {taskIds.map((tid) => {
                          const req = availableRequests.find((r) => r.request_id === tid)
                          return (
                            <span
                              key={tid}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono font-medium text-slate-800 shadow-2xs"
                            >
                              <span>{tid}</span>
                              {req && (
                                <span className="font-sans text-[10px] text-slate-500 max-w-[120px] truncate">
                                  · {req.title}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeTaskId(tid)}
                                className="hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}

                    {/* Task Search & Selection Dropdown */}
                    <div className="relative">
                      <div className="relative flex items-center">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                        <input
                          type="text"
                          value={taskSearchQuery}
                          onChange={(e) => {
                            setTaskSearchQuery(e.target.value)
                            setIsTaskDropdownOpen(true)
                          }}
                          onFocus={() => setIsTaskDropdownOpen(true)}
                          placeholder="Tìm và chọn mã task (VD: UXMB-2026-001...)"
                          className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                        />
                        {isTaskDropdownOpen && (
                          <button
                            type="button"
                            onClick={() => setIsTaskDropdownOpen(false)}
                            className="absolute right-2 p-1 text-slate-400 hover:text-slate-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Menu */}
                      {isTaskDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-1 space-y-0.5">
                          {filteredAvailableTasks.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400">
                              {taskSearchQuery.trim() ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    addManualTaskId(taskSearchQuery.trim())
                                    setIsTaskDropdownOpen(false)
                                  }}
                                  className="text-blue-600 font-semibold hover:underline cursor-pointer"
                                >
                                  + Thêm mã task "{taskSearchQuery.trim()}"
                                </button>
                              ) : (
                                "Không tìm thấy bài toán nào"
                              )}
                            </div>
                          ) : (
                            filteredAvailableTasks.map((req) => {
                              const isSelected = taskIds.includes(req.request_id)
                              return (
                                <button
                                  key={req.request_id}
                                  type="button"
                                  onClick={() => toggleTaskId(req.request_id)}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                    isSelected
                                      ? "bg-blue-50 text-blue-900 font-medium"
                                      : "hover:bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  <div className="flex flex-col truncate pr-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-[11px] font-bold text-slate-900">
                                        {req.request_id}
                                      </span>
                                      <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                        {req.title}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                      {req.status} · {req.assigned_designer || "Chưa gán"}
                                    </span>
                                  </div>
                                  {isSelected ? (
                                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  )}
                                </button>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Trạng thái có task đang làm hay không */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Trạng thái có Task đang làm
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setHasActiveTaskState("auto")}
                        className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                          hasActiveTaskState === "auto"
                            ? "bg-blue-50 border-blue-400 text-blue-700 shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        ⚡ Tự động theo task
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasActiveTaskState("active")}
                        className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                          hasActiveTaskState === "active"
                            ? "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        🟢 Đang có task làm
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasActiveTaskState("idle")}
                        className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                          hasActiveTaskState === "idle"
                            ? "bg-slate-200 border-slate-400 text-slate-800 shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        ⚪ Không có task làm
                      </button>
                    </div>
                  </div>

                  {/* 5. Thông tin bổ sung: Màu sắc, Touchpoint, Figma, Mô tả */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Màu sắc chủ đề
                      </label>
                      <div className="flex items-center gap-1.5 pt-1">
                        {[
                          { id: "blue", bg: "bg-blue-500", name: "Xanh dương" },
                          { id: "emerald", bg: "bg-emerald-500", name: "Xanh lá" },
                          { id: "purple", bg: "bg-purple-500", name: "Tím" },
                          { id: "amber", bg: "bg-amber-500", name: "Vàng cam" },
                          { id: "rose", bg: "bg-rose-500", name: "Đỏ hồng" },
                          { id: "cyan", bg: "bg-cyan-500", name: "Xanh ngọc" },
                        ].map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setColorTheme(c.id)}
                            title={c.name}
                            className={`w-5 h-5 rounded-full ${c.bg} transition-all cursor-pointer ${
                              colorTheme === c.id
                                ? "ring-2 ring-offset-1 ring-slate-700 scale-110"
                                : "opacity-70 hover:opacity-100"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {showTouchpointSelect ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Loại điểm chạm
                        </label>
                        <select
                          value={touchpointType}
                          onChange={(e) => setTouchpointType(e.target.value as IATouchpointType)}
                          className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
                        >
                          {TOUCHPOINT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Đường dẫn Figma
                        </label>
                        <input
                          type="url"
                          value={figmaUrl}
                          onChange={(e) => setFigmaUrl(e.target.value)}
                          placeholder="https://www.figma.com/file/..."
                          className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mô tả nghiệp vụ
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Mô tả mục tiêu của tính năng hoặc màn hình..."
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 resize-none"
                    />
                  </div>
                </>
              )}

              {/* Confirmation for Delete Mode */}
              {isDeleteMode && targetNode && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Bạn có chắc chắn muốn xóa tính năng / node{" "}
                    <span className="font-bold text-slate-900">"{targetNode.name}"</span> không?
                  </p>
                  {targetNode.children && targetNode.children.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Cảnh báo xóa nhánh:</p>
                        <p className="mt-0.5">
                          Nhánh này hiện chứa{" "}
                          <span className="font-bold">{targetNode.children.length}</span> mục con.
                          Việc xóa sẽ loại bỏ toàn bộ các luồng và màn hình bên dưới.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation for Reset Mode */}
              {isResetMode && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Khôi phục dữ liệu mặc định sẽ xóa toàn bộ các thay đổi và đưa cây IA về trạng thái gốc sạch sẽ của MBBank.
                  </p>
                  <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Hệ thống sẽ giữ lại node gốc sản phẩm sạch sẽ để bạn tự do xây dựng.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                data-testid="ia-modal-confirm-btn"
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-all cursor-pointer ${
                  isDeleteMode
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                    : isResetMode
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                }`}
              >
                {mode === "add" && "Thêm Tính Năng"}
                {mode === "edit" && "Lưu Thay Đổi"}
                {mode === "delete" && "Xác nhận xóa"}
                {mode === "reset" && "Khôi phục dữ liệu"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
