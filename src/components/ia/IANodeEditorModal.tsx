import React, { useState, useEffect } from "react"
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
  ExternalLink,
  CheckCircle2,
} from "lucide-react"
import { springs, dialogOverlayVariants, dialogContentVariants } from "@/lib/motion"
import { IANode, IATier, IATouchpointType } from "@/types/ia"

export type ModalMode = "add" | "edit" | "delete" | "reset" | null

interface IANodeEditorModalProps {
  mode: ModalMode
  targetNode: IANode | null
  isOpen: boolean
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
  onClose,
  onConfirmAdd,
  onConfirmEdit,
  onConfirmDelete,
  onConfirmReset,
}: IANodeEditorModalProps) {
  const [name, setName] = useState<string>("")
  const [code, setCode] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [touchpointType, setTouchpointType] = useState<IATouchpointType>("screen")
  const [requestId, setRequestId] = useState<string>("")
  const [figmaUrl, setFigmaUrl] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")

  // Prepopulate or reset fields whenever mode or targetNode changes
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage("")
      return
    }
    if (mode === "edit" && targetNode) {
      setName(targetNode.name || "")
      setCode(targetNode.code || "")
      setDescription(targetNode.description || "")
      setTouchpointType(targetNode.touchpointType || "screen")
      setRequestId(targetNode.requestId || "")
      setFigmaUrl(targetNode.figmaUrl || "")
      setErrorMessage("")
    } else if (mode === "add" && targetNode) {
      const nextTier = (targetNode.tier + 1) as IATier
      setName("")
      setCode("")
      setDescription("")
      setTouchpointType("screen")
      setRequestId("")
      setFigmaUrl("")
      setErrorMessage("")
    } else {
      setErrorMessage("")
    }
  }, [isOpen, mode, targetNode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === "add" && targetNode) {
      if (!name.trim()) {
        setErrorMessage("Vui lòng nhập tên node (không được để trống)")
        return
      }
      onConfirmAdd?.(targetNode.id, {
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        touchpointType: targetNode.tier === 3 ? touchpointType : undefined,
        requestId: requestId.trim() || undefined,
        figmaUrl: figmaUrl.trim() || undefined,
      })
      onClose()
    } else if (mode === "edit" && targetNode) {
      if (!name.trim()) {
        setErrorMessage("Vui lòng nhập tên node (không được để trống)")
        return
      }
      onConfirmEdit?.(targetNode.id, {
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        touchpointType: targetNode.tier === 4 ? touchpointType : undefined,
        requestId: requestId.trim() || undefined,
        figmaUrl: figmaUrl.trim() || undefined,
      })
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
          className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
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
                  {mode === "add" && `Thêm Node con mới (Cấp ${nextTier})`}
                  {mode === "edit" && `Chỉnh sửa Node: ${targetNode?.name}`}
                  {mode === "delete" && "Xác nhận xóa Node"}
                  {mode === "reset" && "Khôi phục dữ liệu cây IA chuẩn"}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {mode === "add" && `Node cha: ${targetNode?.name}`}
                  {mode === "edit" && `Thuộc tầng Cấp ${targetNode?.tier}`}
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

          {/* Body Content */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form Fields for Add / Edit */}
              {isFormMode && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên Node <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      data-testid="ia-node-modal-name-input"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (errorMessage) setErrorMessage("")
                      }}
                      placeholder="VD: Màn hình chọn gói thẻ, Luồng vay..."
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mã Code
                      </label>
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="VD: SCR_CARD_01"
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-mono"
                      />
                    </div>

                    {showTouchpointSelect && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Loại điểm chạm (Touchpoint)
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
                      placeholder="Mô tả chi tiết mục tiêu của luồng hoặc màn hình..."
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mã bài toán liên kết (Request ID)
                      </label>
                      <input
                        type="text"
                        value={requestId}
                        onChange={(e) => setRequestId(e.target.value)}
                        placeholder="VD: UXMB-2026-001"
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Đường dẫn Figma (URL)
                      </label>
                      <input
                        type="url"
                        value={figmaUrl}
                        onChange={(e) => setFigmaUrl(e.target.value)}
                        placeholder="https://www.figma.com/file/..."
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Confirmation for Delete Mode */}
              {isDeleteMode && targetNode && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Bạn có chắc chắn muốn xóa node{" "}
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
                    Khôi phục dữ liệu mặc định sẽ xóa toàn bộ các thay đổi, node thêm mới và tùy biến
                    của cây IA đã lưu trên trình duyệt của bạn, đưa hệ thống về cấu trúc chuẩn ban đầu của MBBank.
                  </p>
                  <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Dữ liệu gốc chuẩn hóa từ ngân hàng sẽ được nạp lại đầy đủ.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
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
                {mode === "add" && "Thêm Node"}
                {mode === "edit" && "Lưu thay đổi"}
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
