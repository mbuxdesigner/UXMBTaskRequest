import React, { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileCode,
  Upload,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  X,
  CheckCircle2,
  FileText,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { IANode, IATier, IATouchpointType } from "@/types/ia"
import { toast } from "@/components/ui/toast"
import { springs, tactileProps } from "@/lib/motion"
import { Tooltip } from "@/components/ui/tooltip"

interface IAJsonImportModalProps {
  isOpen: boolean
  onClose: () => void
  currentTree: IANode
  selectedProductName: string
  onImportJson: (imported: IANode | IANode[]) => void
}

const SAMPLE_JSON_OUTLINE = {
  name: "App MBBank 2026",
  code: "APP_MB",
  description: "Ứng dụng Ngân hàng số MBBank Khách hàng Cá nhân",
  children: [
    {
      name: "Thanh toán & Chuyển tiền",
      squad: "Payments & Transfer",
      children: [
        {
          name: "Chuyển tiền nhanh Napas 24/7",
          isCriticalPath: true,
          children: [
            { name: "Màn hình nhập thông tin chuyển khoản", touchpointType: "screen" },
            { name: "Hộp thoại xác nhận hạn mức & phí", touchpointType: "modal" },
            { name: "Xác thực bảo mật Face / Soft OTP", touchpointType: "modal" },
            { name: "Màn hình kết quả giao dịch thành công", touchpointType: "screen" },
          ],
        },
        {
          name: "Quét mã QR Code đa năng",
          children: [
            { name: "Màn hình quét camera QR Pay", touchpointType: "screen" },
            { name: "Tấm trượt nguồn tiền thanh toán", touchpointType: "bottom_sheet" },
          ],
        },
      ],
    },
    {
      name: "Tiền gửi & Tiết kiệm số",
      squad: "Savings & Deposits",
      children: [
        {
          name: "Mở sổ tiết kiệm Online",
          children: [
            { name: "Bảng chọn gói kỳ hạn linh hoạt", touchpointType: "screen" },
            { name: "Tấm trượt điều khoản tiền gửi", touchpointType: "bottom_sheet" },
            { name: "Thông báo biến động số dư lãi", touchpointType: "push_notification" },
          ],
        },
      ],
    },
  ],
}

// Convert any outline/raw JSON into validated 4-tier IANode tree
export function parseAndNormalizeIaJson(rawObj: any, defaultProductName: string): { success: boolean; data?: IANode | IANode[]; error?: string; stats?: { nodeCount: number; tier1Count: number } } {
  try {
    let rawTrees: any[] = []
    if (Array.isArray(rawObj)) {
      rawTrees = rawObj
    } else if (rawObj && typeof rawObj === "object") {
      // If object has 'trees' or 'data' key
      if (rawObj.trees && typeof rawObj.trees === "object") {
        rawTrees = Object.values(rawObj.trees)
      } else if (rawObj.data && Array.isArray(rawObj.data)) {
        rawTrees = rawObj.data
      } else {
        rawTrees = [rawObj]
      }
    } else {
      return { success: false, error: "Định dạng JSON phải là một đối tượng (Object) hoặc mảng (Array)." }
    }

    if (rawTrees.length === 0) {
      return { success: false, error: "Dữ liệu JSON rỗng, không có node nào." }
    }

    let nodeCounter = 0
    let tier1Count = 0

    function normalizeNode(raw: any, tier: IATier = 1, parentId: string | null = null): IANode {
      nodeCounter++
      if (tier === 1) tier1Count++

      const id = (raw.id && String(raw.id).trim()) || `imported-node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const rawName = raw.name ?? raw.title ?? raw.label ?? raw.text ?? raw.nodeName
      const name = (rawName && String(rawName).trim()) || (tier === 1 ? defaultProductName : `Node cấp ${tier}`)
      const description = raw.description || ""
      const code = raw.code || ""
      const squad = raw.squad || undefined
      const isCriticalPath = Boolean(raw.isCriticalPath)
      const touchpointType: IATouchpointType | undefined =
        tier === 4 ? (raw.touchpointType || "screen") : undefined

      const children: IANode[] = []
      const rawChildList = raw.children ?? raw.items ?? raw.subnodes ?? raw.childs
      if (Array.isArray(rawChildList) && tier < 4) {
        const nextTier = (tier + 1) as IATier
        for (const ch of rawChildList) {
          if (ch && typeof ch === "object") {
            children.push(normalizeNode(ch, nextTier, id))
          }
        }
      }

      return {
        id,
        tier,
        name,
        description,
        code,
        squad,
        isCriticalPath,
        touchpointType,
        parentId,
        children: tier < 4 ? children : undefined,
        customWidth: raw.customWidth,
        customHeight: raw.customHeight,
        customX: raw.customX,
        customY: raw.customY,
      }
    }

    const normalizedRoots: IANode[] = []
    for (const rt of rawTrees) {
      if (rt && typeof rt === "object") {
        normalizedRoots.push(normalizeNode(rt, 1, null))
      }
    }

    if (normalizedRoots.length === 1) {
      return {
        success: true,
        data: normalizedRoots[0],
        stats: { nodeCount: nodeCounter, tier1Count },
      }
    } else {
      // Primary root with siblingRoots
      const [primary, ...siblings] = normalizedRoots
      primary.siblingRoots = siblings
      return {
        success: true,
        data: normalizedRoots,
        stats: { nodeCount: nodeCounter, tier1Count },
      }
    }
  } catch (err: any) {
    return { success: false, error: `Lỗi xử lý JSON: ${err?.message || String(err)}` }
  }
}

export default function IAJsonImportModal({
  isOpen,
  onClose,
  currentTree,
  selectedProductName,
  onImportJson,
}: IAJsonImportModalProps) {
  const [jsonText, setJsonText] = useState("")
  const [copiedExport, setCopiedExport] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Live validation
  const validation = useMemo(() => {
    const trimmed = jsonText.trim()
    if (!trimmed) {
      return { isValid: false, message: "Hãy dán chuỗi JSON hoặc tải tệp lên để bắt đầu" }
    }
    try {
      const parsed = JSON.parse(trimmed)
      const result = parseAndNormalizeIaJson(parsed, selectedProductName)
      if (result.success && result.stats) {
        return {
          isValid: true,
          message: `Hợp lệ! Phát hiện ${result.stats.nodeCount} nodes (${result.stats.tier1Count} gốc Tier 1)`,
          data: result.data,
        }
      } else {
        return { isValid: false, message: result.error || "Cấu trúc JSON không hợp lệ" }
      }
    } catch (e: any) {
      return { isValid: false, message: `Cú pháp JSON sai: ${e?.message || "Syntax Error"}` }
    }
  }, [jsonText, selectedProductName])

  const handleLoadSample = () => {
    setJsonText(JSON.stringify(SAMPLE_JSON_OUTLINE, null, 2))
  }

  const handleCopyCurrentMap = () => {
    try {
      const cleanTree = JSON.stringify(currentTree, null, 2)
      navigator.clipboard?.writeText(cleanTree)
      setCopiedExport(true)
      toast.success("Đã sao chép toàn bộ JSON của sơ đồ hiện tại vào clipboard!")
      setTimeout(() => setCopiedExport(false), 2000)
    } catch {
      toast.error("Không thể sao chép JSON")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        setJsonText(content)
      }
    }
    reader.readAsText(file)
  }

  const handleApply = () => {
    if (!validation.isValid || !validation.data) return
    onImportJson(validation.data)
    toast.success("Đã nạp và tạo mới bản đồ IA map thành công!")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      data-testid="ia-json-import-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1057FB] flex items-center justify-center border border-blue-200/60">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Đẩy JSON lên để tạo IA Map siêu tốc
              </h2>
              <p className="text-xs text-slate-500">
                Nhập outline cây phân cấp hoặc cấu trúc IANode để sinh sơ đồ tức thì
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action helper bar */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <Tooltip content="Dán mẫu JSON chuẩn 4 tầng (Lv1-Lv4)" side="bottom">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadSample}
                className="text-xs h-7 gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Dán mẫu chuẩn</span>
              </Button>
            </Tooltip>
            <Tooltip content="Tải tệp JSON từ máy tính" side="bottom">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs h-7 gap-1"
              >
                <Upload className="w-3 h-3 text-slate-500" />
                <span>Tải file .json</span>
              </Button>
            </Tooltip>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <Tooltip content="Sao chép JSON sơ đồ hiện tại" side="bottom">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCurrentMap}
              className="text-xs h-7 gap-1 text-slate-600 hover:text-slate-900"
            >
              {copiedExport ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedExport ? "Đã copy!" : "Copy JSON hiện tại"}</span>
            </Button>
          </Tooltip>
        </div>

        {/* Code editor textarea */}
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          <textarea
            data-testid="ia-json-input"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='Dán JSON cấu trúc cây tại đây (ví dụ: { "name": "App MBBank", "children": [...] })'
            rows={14}
            className="w-full flex-1 p-3 font-mono text-xs text-slate-900 bg-slate-900/5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            spellCheck={false}
          />

          {/* Validation Status Indicator */}
          <div
            className={`mt-3 px-3 py-2 rounded-xl text-xs flex items-center gap-2 border ${
              validation.isValid
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : jsonText.trim()
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : "bg-slate-50 text-slate-600 border-slate-200"
            }`}
          >
            {validation.isValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : jsonText.trim() ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span className="font-medium">{validation.message}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="default"
            size="sm"
            data-testid="ia-apply-json-btn"
            onClick={handleApply}
            disabled={!validation.isValid}
            className="gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tạo map ngay</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
