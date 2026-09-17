import React, { useState, useEffect, useMemo, useRef } from "react"
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
  CheckCircle2,
  Users,
  Search,
  Check,
  ChevronDown,
  Filter,
  Sparkles,
  Sliders,
  TrendingUp,
  CheckSquare,
  Eye,
  ExternalLink,
  Copy,
} from "lucide-react"
import { springs, dialogOverlayVariants, drawerVariants } from "@/lib/motion"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IANode, IATier, IATouchpointType, IANodeDisplaySettings, getTierDefaultDisplaySettings } from "@/types/ia"
import { getAdminSquadsList } from "@/data/iaMockData"
import { UXRequest, isDemoRequest } from "@/data/mockData"

export type ModalMode = "add" | "edit" | "delete" | "reset" | "view" | null

export interface IANodeEditorModalProps {
  mode: ModalMode
  targetNode: IANode | null
  isOpen: boolean
  availableRequests?: UXRequest[]
  onClose: () => void
  onConfirmAdd?: (parentId: string, data: Partial<IANode>) => void
  onConfirmEdit?: (nodeId: string, data: Partial<IANode>) => void
  onConfirmDelete?: (nodeId: string) => void
  onConfirmReset?: () => void
  onOpenRequestDetail?: (request: UXRequest) => void
}

const TOUCHPOINT_OPTIONS: { value: IATouchpointType; label: string }[] = [
  { value: "screen", label: "Màn hình chính (Screen)" },
  { value: "modal", label: "Hộp thoại Popup (Modal)" },
  { value: "bottom_sheet", label: "Bảng trượt đáy (Bottom Sheet)" },
  { value: "push_notification", label: "Thông báo đẩy (Push Notification)" },
  { value: "webview", label: "Nhúng web (WebView)" },
  { value: "action_sheet", label: "Menu thao tác (Action Sheet)" },
]

export const COLOR_OPTIONS = [
  { id: "blue", bg: "bg-[#1057FB]", name: "Xanh MB" },
  { id: "indigo", bg: "bg-indigo-600", name: "Tím than" },
  { id: "emerald", bg: "bg-emerald-600", name: "Xanh lá" },
  { id: "amber", bg: "bg-amber-500", name: "Vàng cam" },
  { id: "rose", bg: "bg-rose-500", name: "Đỏ hồng" },
  { id: "cyan", bg: "bg-cyan-500", name: "Xanh ngọc" },
  { id: "purple", bg: "bg-purple-600", name: "Tím" },
]

function getTouchpointIcon(type?: IATouchpointType) {
  switch (type) {
    case "modal":
      return <Layout className="w-3.5 h-3.5 text-purple-600 shrink-0" />
    case "bottom_sheet":
      return <PanelBottom className="w-3.5 h-3.5 text-amber-600 shrink-0" />
    case "push_notification":
      return <Bell className="w-3.5 h-3.5 text-rose-600 shrink-0" />
    case "webview":
      return <Globe className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
    case "action_sheet":
      return <PanelBottom className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
    case "screen":
    default:
      return <Smartphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
  }
}

function getTaskStatusBadge(status?: string) {
  const s = (status || "").toLowerCase()
  if (s.includes("hoàn thành") || s.includes("release") || s.includes("nghiệm thu")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }
  if (s.includes("thực hiện") || s.includes("đang làm") || s.includes("tiến hành")) {
    return "bg-blue-50 text-blue-700 border-blue-200"
  }
  if (s.includes("review")) {
    return "bg-purple-50 text-purple-700 border-purple-200"
  }
  if (s.includes("chặn") || s.includes("pending")) {
    return "bg-rose-50 text-rose-700 border-rose-200"
  }
  return "bg-slate-100 text-slate-700 border-slate-200"
}

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
  onOpenRequestDetail,
}: IANodeEditorModalProps) {
  const [copiedId, setCopiedId] = useState(false)
  const [name, setName] = useState<string>("")
  const [squad, setSquad] = useState<string>("")
  const [customSquad, setCustomSquad] = useState<string>("")
  const [taskIds, setTaskIds] = useState<string[]>([])
  const [customTag, setCustomTag] = useState<string>("")
  const [colorTheme, setColorTheme] = useState<string>("blue")
  const [touchpointType, setTouchpointType] = useState<IATouchpointType>("screen")
  const [errorMessage, setErrorMessage] = useState<string>("")

  // Cấp độ hiện tại của node đang xử lý
  const currentTier: IATier = useMemo(() => {
    if (mode === "add" && targetNode) {
      return Math.min(4, ((targetNode.tier || 1) + 1)) as IATier
    }
    return (targetNode?.tier || 3) as IATier
  }, [mode, targetNode])

  // Cấu hình hiển thị mặc định theo Cấp
  const tierDefaults = useMemo(() => {
    return getTierDefaultDisplaySettings(currentTier)
  }, [currentTier])

  // State cài đặt hiển thị tùy biến của node
  const [displaySettings, setDisplaySettings] = useState<IANodeDisplaySettings>({})

  // Cấu hình hiển thị thực tế đã merge giữa Tier Defaults và Overrides
  const activeSettings = useMemo<Required<IANodeDisplaySettings>>(() => {
    return {
      ...tierDefaults,
      ...displaySettings,
    }
  }, [tierDefaults, displaySettings])

  const updateDisplaySetting = (key: keyof IANodeDisplaySettings, value: boolean) => {
    setDisplaySettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const resetToTierDefaults = () => {
    setDisplaySettings(tierDefaults)
  }

  // ReUI Dropdown State for Squad
  const [isSquadDropdownOpen, setIsSquadDropdownOpen] = useState(false)
  const [squadSearchQuery, setSquadSearchQuery] = useState("")
  const squadDropdownRef = useRef<HTMLDivElement>(null)

  // Filter Tasks State
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>("")
  const [filterBySquadOnly, setFilterBySquadOnly] = useState<boolean>(true)
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState<boolean>(false)

  // Danh mục Squads nội bộ chuẩn xác (chỉ lấy đúng squad thực tế, không lấy dữ liệu lạ)
  const availableSquads = useMemo(
    () => Array.from(new Set(getAdminSquadsList().map((s) => s.trim()).filter(Boolean))),
    [isOpen]
  )

  // Close squad dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (squadDropdownRef.current && !squadDropdownRef.current.contains(e.target as Node)) {
        setIsSquadDropdownOpen(false)
      }
    }
    if (isSquadDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isSquadDropdownOpen])

  // Prepopulate or reset fields whenever mode or targetNode changes
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage("")
      setIsSquadDropdownOpen(false)
      setIsTaskDropdownOpen(false)
      setSquadSearchQuery("")
      setTaskSearchQuery("")
      return
    }
    if (mode === "edit" && targetNode) {
      setName(targetNode.name || "")
      const nodeSquad = targetNode.squad || ""
      if (nodeSquad && !availableSquads.includes(nodeSquad)) {
        setSquad("custom")
        setCustomSquad(nodeSquad)
      } else {
        setSquad(nodeSquad)
        setCustomSquad("")
      }

      // Populate taskIds (tự động loại bỏ bất kỳ mã demo nào)
      const initialTaskIds: string[] = []
      if (targetNode.taskIds && targetNode.taskIds.length > 0) {
        targetNode.taskIds.forEach((id) => {
          const t = (id || "").trim()
          if (t && !initialTaskIds.includes(t) && !isDemoRequest({ request_id: t })) {
            initialTaskIds.push(t)
          }
        })
      } else if (targetNode.requestId) {
        const t = (targetNode.requestId || "").trim()
        if (t && !initialTaskIds.includes(t) && !isDemoRequest({ request_id: t })) {
          initialTaskIds.push(t)
        }
      }
      setTaskIds(initialTaskIds)

      setCustomTag(targetNode.customTag || "")
      setColorTheme(targetNode.colorTheme || "blue")
      setTouchpointType(targetNode.touchpointType || "screen")
      setDisplaySettings(targetNode.displaySettings || getTierDefaultDisplaySettings(targetNode.tier || 3))
      setErrorMessage("")
    } else if (mode === "add" && targetNode) {
      setName("")
      setSquad(targetNode.squad || "")
      setCustomSquad("")
      setTaskIds([])
      setCustomTag("")
      setColorTheme(targetNode.colorTheme || "blue")
      setTouchpointType("screen")
      const childTier = Math.min(4, (targetNode.tier || 1) + 1) as IATier
      setDisplaySettings(getTierDefaultDisplaySettings(childTier))
      setErrorMessage("")
    } else {
      setName("")
      setSquad("")
      setCustomSquad("")
      setTaskIds([])
      setCustomTag("")
      setColorTheme("blue")
      setTouchpointType("screen")
      setDisplaySettings(getTierDefaultDisplaySettings(3))
      setErrorMessage("")
    }
  }, [isOpen, mode, targetNode, availableSquads])

  // Danh sách Squads lọc theo từ khóa tìm kiếm (bỏ các chuỗi rỗng)
  const filteredSquads = useMemo(() => {
    const validSquads = (availableSquads || []).filter((s) => Boolean(s && s.trim()))
    const q = squadSearchQuery.trim().toLowerCase()
    if (!q) return validSquads
    return validSquads.filter((s) => s.toLowerCase().includes(q))
  }, [availableSquads, squadSearchQuery])

  // Lọc bài toán (Requests) theo Squad đã chọn + từ khóa tìm kiếm (Loại bỏ 100% dữ liệu demo)
  const effectiveSquadName = squad === "custom" ? customSquad.trim() : squad
  const filteredAvailableTasks = useMemo(() => {
    let list = availableRequests.filter((r) => !isDemoRequest(r))

    // Nếu người dùng chọn lọc theo squad đã chọn và có squad
    if (filterBySquadOnly && effectiveSquadName) {
      const targetLower = effectiveSquadName.toLowerCase().trim()
      list = list.filter((r) => {
        const rSquad = (r.squad_name || r.preferred_squad || (r as any).squad || "").toLowerCase().trim()
        return rSquad === targetLower || rSquad.includes(targetLower) || targetLower.includes(rSquad)
      })
    }

    const q = taskSearchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          r.request_id.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          (r.assigned_designer && r.assigned_designer.toLowerCase().includes(q)) ||
          (r.product && r.product.toLowerCase().includes(q))
      )
    }

    return list
  }, [availableRequests, filterBySquadOnly, effectiveSquadName, taskSearchQuery])

  // Linked requests for targetNode (used in view mode and details)
  const targetNodeTasks = useMemo(() => {
    if (!targetNode) return []
    const ids = targetNode.taskIds && targetNode.taskIds.length > 0
      ? targetNode.taskIds
      : targetNode.requestId
      ? [targetNode.requestId]
      : []
    return ids.map((id) => {
      const match = availableRequests.find((r) => r.request_id === id)
      if (match) return match
      return ({
        request_id: id,
        title: `Bài toán ${id}`,
        status: "Đang thực hiện",
        squad: targetNode.squad || "Chưa gán",
        squad_name: targetNode.squad || "Chưa gán",
        requester_name: "Hệ thống",
        assigned_designer: "Chưa gán",
        created_at: new Date().toISOString(),
      } as unknown) as UXRequest
    })
  }, [targetNode, availableRequests])

  const toggleTaskId = (id: string) => {
    const cleanId = id.trim()
    if (!cleanId) return
    setTaskIds((prev) =>
      prev.includes(cleanId) ? prev.filter((item) => item !== cleanId) : [...prev, cleanId]
    )
  }

  const removeTaskId = (id: string) => {
    setTaskIds((prev) => prev.filter((item) => item !== id))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === "delete" && targetNode) {
      onConfirmDelete?.(targetNode.id)
      onClose()
      return
    }

    if (mode === "reset") {
      onConfirmReset?.()
      onClose()
      return
    }

    if (!name.trim()) {
      setErrorMessage("Vui lòng nhập tên tính năng / node (không được để trống)")
      return
    }

    const finalSquad = squad === "custom" ? customSquad.trim() : squad

    // Nếu tắt gán task trực tiếp, bỏ lưu trữ taskIds trực tiếp để nhường chỗ cho rollup cấp con
    const effectiveTaskIds = activeSettings.allowDirectTasks
      ? taskIds.length > 0
        ? taskIds
        : undefined
      : undefined

    // Trạng thái setting tự động (hasActiveTask: undefined) - hệ thống tự động tính toán từ các task liên kết
    const nodePayload: Partial<IANode> = {
      name: name.trim(),
      squad: finalSquad || undefined,
      taskIds: effectiveTaskIds,
      requestId: effectiveTaskIds && effectiveTaskIds.length > 0 ? effectiveTaskIds[0] : undefined,
      hasActiveTask: undefined, // Tự động tính toán theo task
      code: targetNode?.code || undefined,
      customTag: customTag.trim() || undefined,
      colorTheme: colorTheme || undefined,
      displaySettings: displaySettings, // Cài đặt hiển thị chi tiết của node
      touchpointType:
        (mode === "add" && targetNode?.tier === 3) ||
        (mode === "edit" && targetNode?.tier === 4)
          ? touchpointType
          : undefined,
    }

    if (mode === "add") {
      onConfirmAdd?.(targetNode?.id || "", nodePayload)
      onClose()
    } else if (mode === "edit" && targetNode) {
      onConfirmEdit?.(targetNode.id, nodePayload)
      onClose()
    }
  }

  const isViewMode = mode === "view"
  const isFormMode = mode === "add" || mode === "edit"
  const isDeleteMode = mode === "delete"
  const isResetMode = mode === "reset"

  const showTouchpointSelect =
    (mode === "add" && targetNode?.tier === 3) ||
    (mode === "edit" && targetNode?.tier === 4)

  return (
    <AnimatePresence>
      {isOpen && Boolean(mode) && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden select-none">
        {/* Backdrop Overlay */}
        <motion.div
          variants={dialogOverlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer"
        />

        {/* ReUI Sheet-9 Inset Right Panel (Không dùng Header) */}
        <motion.div
          role="dialog"
          aria-modal="true"
          variants={drawerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={springs.gentle}
          className="relative w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl bg-white shadow-2xl z-10 flex flex-col h-full overflow-hidden border-l border-slate-200"
        >
          {/* Nút Đóng (X) Tinh Gọn Nổi Góc Trên Phải */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            title="Đóng bảng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Sheet Body Content with Scroll */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Chi tiết Node cho View Mode */}
              {isViewMode && targetNode && (
                <div className="space-y-5" data-testid="ia-node-view-details">
                  {/* Header Title & Tier Badge */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-mono">
                          Tier {targetNode.tier} · {
                            targetNode.tier === 1
                              ? "Cấp 1 · Sản phẩm chính"
                              : targetNode.tier === 2
                              ? "Cấp 2 · Phân hệ chức năng"
                              : targetNode.tier === 3
                              ? "Cấp 3 · Tính năng nghiệp vụ"
                              : "Cấp 4 · Điểm chạm (Touchpoint)"
                          }
                        </span>
                        {targetNode.code && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-mono font-semibold">
                            {targetNode.code}
                          </span>
                        )}
                        {targetNode.isCriticalPath && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                            Tuyến trọng yếu
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {targetNode.name}
                      </h3>
                    </div>
                  </div>

                  {/* ID Node with Copy action */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div className="text-xs">
                      <span className="text-slate-500 font-medium">Mã định danh ID: </span>
                      <span className="font-mono font-bold text-slate-800">{targetNode.id}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(targetNode.id)
                        setCopiedId(true)
                        setTimeout(() => setCopiedId(false), 2000)
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 text-xs font-medium transition-colors cursor-pointer"
                    >
                      {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId ? "Đã chép" : "Sao chép"}</span>
                    </button>
                  </div>

                  {/* Thông tin chi tiết phân loại */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                      <div className="text-slate-500 font-medium flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>Squad phụ trách</span>
                      </div>
                      <div className="font-semibold text-slate-800">
                        {targetNode.squad || "Chưa phân công"}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                      <div className="text-slate-500 font-medium flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Loại điểm chạm</span>
                      </div>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        {getTouchpointIcon(targetNode.touchpointType)}
                        <span>
                          {TOUCHPOINT_OPTIONS.find((t) => t.value === targetNode.touchpointType)?.label.split(" (")[0] || "Màn hình chính"}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                      <div className="text-slate-500 font-medium flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Màu chủ đề</span>
                      </div>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            COLOR_OPTIONS.find((c) => c.id === targetNode.colorTheme)?.bg || "bg-[#1057FB]"
                          }`}
                        />
                        <span>{COLOR_OPTIONS.find((c) => c.id === targetNode.colorTheme)?.name || "Xanh MB"}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                      <div className="text-slate-500 font-medium">Thẻ phân loại (Tag)</div>
                      <div className="font-semibold text-slate-800">
                        {targetNode.customTag ? (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                            {targetNode.customTag}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">Không có thẻ</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mô tả / Ghi chú */}
                  <div className="space-y-1.5 text-xs">
                    <label className="font-semibold text-slate-700">Mô tả tính năng</label>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed min-h-[50px]">
                      {targetNode.description || <span className="text-slate-400 italic">Không có mô tả chi tiết cho node này.</span>}
                    </div>
                  </div>

                  {/* Figma URL */}
                  <div className="space-y-1.5 text-xs">
                    <label className="font-semibold text-slate-700">Thiết kế Figma</label>
                    {targetNode.figmaUrl ? (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 border border-purple-200/80 text-purple-900">
                        <div className="truncate max-w-[280px] font-mono text-[11px] text-purple-700">
                          {targetNode.figmaUrl}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(targetNode.figmaUrl, "_blank", "noopener,noreferrer")}
                          className="border-purple-300 text-purple-700 hover:bg-purple-100/60 h-7 text-xs"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          <span>Mở Figma</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 italic">
                        Chưa liên kết đường dẫn Figma
                      </div>
                    )}
                  </div>

                  {/* Bài toán thiết kế liên kết (UX Requests) */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                        <span>Bài toán thiết kế liên kết ({targetNodeTasks.length})</span>
                      </label>
                    </div>

                    {targetNodeTasks.length > 0 ? (
                      <div className="space-y-2">
                        {targetNodeTasks.map((req) => (
                          <div
                            key={req.request_id}
                            className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-blue-600 text-[11px]">
                                  {req.request_id}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getTaskStatusBadge(req.status)}`}>
                                  {req.status}
                                </span>
                              </div>
                              <div className="font-semibold text-slate-800 truncate text-xs">
                                {req.title}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {req.squad || req.squad_name || "Chưa gán squad"} · {req.assigned_designer || req.design_owner || "Chưa có designer"}
                              </div>
                            </div>

                            {onOpenRequestDetail && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  onClose()
                                  onOpenRequestDetail(req)
                                }}
                                className="shrink-0 h-7 text-xs"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                <span>Chi tiết</span>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-center italic">
                        Chưa có bài toán thiết kế nào được liên kết với node này.
                      </div>
                    )}
                  </div>

                  {/* Nhánh con phụ thuộc */}
                  {targetNode.children && targetNode.children.length > 0 && (
                    <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/60 text-xs text-blue-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold">Nhánh con trực thuộc</span>
                      </div>
                      <span className="font-bold text-blue-700">{targetNode.children.length} nhánh</span>
                    </div>
                  )}
                </div>
              )}

              {/* Form Fields for Add / Edit */}
              {isFormMode && (
                <>
                  {/* 1. MÀU SẮC CHỦ ĐỀ (Đưa lên trên đầu) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between pr-10">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Màu sắc chủ đề</span>
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {COLOR_OPTIONS.find((c) => c.id === colorTheme)?.name || "Xanh MB"}
                      </span>
                    </label>
                    <div className="flex items-center gap-2.5 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200 shadow-2xs">
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setColorTheme(c.id)}
                          title={c.name}
                          className={`w-7 h-7 rounded-full ${c.bg} transition-all cursor-pointer ${
                            colorTheme === c.id
                              ? "ring-2 ring-offset-2 ring-slate-800 scale-110 shadow-xs"
                              : "opacity-70 hover:opacity-100 hover:scale-105"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 2. TÊN TÍNH NĂNG */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-semibold text-slate-900 shadow-2xs"
                      autoFocus
                    />
                  </div>

                  {/* 2. CHỌN SQUAD PHỤ TRÁCH (ReUI DropdownMenu Chuẩn, Chỉ Squad Nội Bộ) */}
                  <div className="relative" ref={squadDropdownRef}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Chọn Squad phụ trách</span>
                    </label>

                    {/* ReUI Dropdown Trigger */}
                    <button
                      type="button"
                      data-testid="ia-node-modal-squad-select"
                      onClick={() => setIsSquadDropdownOpen(!isSquadDropdownOpen)}
                      className={`w-full px-3.5 py-2.5 bg-white hover:bg-slate-50/80 border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer shadow-2xs ${
                        isSquadDropdownOpen
                          ? "border-blue-500 ring-2 ring-blue-500/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {squad === "custom"
                            ? customSquad || "Squad tùy chỉnh..."
                            : squad || "-- Chưa phân Squad --"}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                          isSquadDropdownOpen ? "rotate-180 text-slate-700" : ""
                        }`}
                      />
                    </button>

                    {/* ReUI Dropdown Popover */}
                    <AnimatePresence>
                      {isSquadDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.98 }}
                          transition={springs.snappy}
                          className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden flex flex-col max-h-72"
                        >
                          {/* Search Squad */}
                          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                            <div className="relative flex items-center">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                              <input
                                type="text"
                                value={squadSearchQuery}
                                onChange={(e) => setSquadSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm Squad..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                              />
                            </div>
                          </div>

                          {/* Options List (Chỉ chứa Squad nội bộ thực tế) */}
                          <div className="overflow-y-auto p-1 space-y-0.5 flex-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSquad("")
                                setCustomSquad("")
                                setIsSquadDropdownOpen(false)
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                !squad
                                  ? "bg-blue-50 text-blue-700 font-bold"
                                  : "text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <span>-- Chưa phân Squad --</span>
                              {!squad && <Check className="w-3.5 h-3.5 text-blue-600" />}
                            </button>

                            {filteredSquads.map((s, sIdx) => {
                              const isSelected = squad === s
                              return (
                                <button
                                  key={`squad-opt-${s || sIdx}`}
                                  type="button"
                                  onClick={() => {
                                    setSquad(s)
                                    setCustomSquad("")
                                    setIsSquadDropdownOpen(false)
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                    isSelected
                                      ? "bg-blue-50 text-blue-700 font-bold"
                                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                  }`}
                                >
                                  <span>{s}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                </button>
                              )
                            })}

                            <div className="border-t border-slate-100 my-1 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSquad("custom")
                                  setIsSquadDropdownOpen(false)
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                  squad === "custom"
                                    ? "bg-indigo-50 text-indigo-700 font-bold"
                                    : "text-indigo-600 hover:bg-indigo-50 font-medium"
                                }`}
                              >
                                <span>+ Nhập Squad khác...</span>
                                {squad === "custom" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Custom Squad Input */}
                    {squad === "custom" && (
                      <input
                        type="text"
                        value={customSquad}
                        onChange={(e) => setCustomSquad(e.target.value)}
                        placeholder="Nhập tên Squad mới..."
                        className="w-full mt-2 px-3.5 py-2 text-xs bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 font-medium"
                      />
                    )}
                  </div>

                  {/* 3. DANH SÁCH TASK LIÊN KẾT */}
                  {activeSettings.allowDirectTasks ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          <span>Danh sách Task liên kết ({taskIds.length})</span>
                        </label>
                        {effectiveSquadName && (
                          <button
                            type="button"
                            onClick={() => setFilterBySquadOnly(!filterBySquadOnly)}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                              filterBySquadOnly
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                            title="Bật/Tắt lọc bài toán theo Squad đã chọn"
                          >
                            <Filter className="w-3 h-3" />
                            <span>
                              {filterBySquadOnly ? `Theo ${effectiveSquadName}` : "Tất cả Squad"}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Selected Tasks List (Thẻ rộng, text dài đọc tên rõ ràng) */}
                      {taskIds.length > 0 && (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto p-1 bg-slate-50/80 rounded-xl border border-slate-200/80">
                          {taskIds.map((tid, tIdx) => {
                            const req = availableRequests.find((r) => r.request_id === tid)
                            return (
                              <div
                                key={`selected-task-${tid || tIdx}`}
                                className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                      {tid}
                                    </span>
                                    {req?.status && (
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded font-medium border ${getTaskStatusBadge(
                                          req.status
                                        )}`}
                                      >
                                        {req.status}
                                      </span>
                                    )}
                                    {req?.assigned_designer && (
                                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                        <span className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[8px]">
                                          {req.assigned_designer.charAt(0).toUpperCase()}
                                        </span>
                                        <span>{req.assigned_designer}</span>
                                      </span>
                                    )}
                                  </div>
                                  {/* Tên bài toán hiển thị đầy đủ, không bị cắt ngắn */}
                                  <p className="text-xs font-semibold text-slate-800 break-words leading-relaxed">
                                    {req ? req.title : tid}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeTaskId(tid)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                  title="Bỏ chọn task này"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Task Search Bar */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={taskSearchQuery}
                          onChange={(e) => setTaskSearchQuery(e.target.value)}
                          placeholder={`Tìm kiếm mã bài toán hoặc tên task${effectiveSquadName ? ` (${effectiveSquadName})...` : "..."}`}
                          className="w-full pl-8 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800"
                        />
                      </div>

                      {/* Available Tasks Pick List (Khung rộng, text dài đọc tên dễ dàng) */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {filteredAvailableTasks.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400 space-y-1.5">
                            <p>
                              {taskSearchQuery.trim()
                                ? `Không tìm thấy bài toán nào khớp với "${taskSearchQuery}"`
                                : effectiveSquadName && filterBySquadOnly
                                ? `Chưa có bài toán nào thuộc Squad "${effectiveSquadName}"`
                                : "Chưa có bài toán nào trong hệ thống"}
                            </p>
                            {taskSearchQuery.trim() && (
                              <button
                                type="button"
                                onClick={() => {
                                  const trimmed = taskSearchQuery.trim().toUpperCase()
                                  if (trimmed && !taskIds.includes(trimmed)) {
                                    setTaskIds((prev) => [...prev, trimmed])
                                    setTaskSearchQuery("")
                                  }
                                }}
                                className="text-blue-600 font-bold hover:underline cursor-pointer inline-block"
                              >
                                + Thêm trực tiếp mã "{taskSearchQuery.trim().toUpperCase()}"
                              </button>
                            )}
                            {effectiveSquadName && filterBySquadOnly && (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setFilterBySquadOnly(false)}
                                  className="text-indigo-600 font-semibold hover:underline cursor-pointer text-[11px]"
                                >
                                  Xem bài toán của tất cả các Squad khác
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          filteredAvailableTasks.map((req) => {
                            const isSelected = taskIds.includes(req.request_id)
                            return (
                              <div
                                key={req.request_id}
                                onClick={() => toggleTaskId(req.request_id)}
                                className={`p-3 text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                                  isSelected
                                    ? "bg-blue-50/70 border-l-4 border-l-blue-600"
                                    : "hover:bg-slate-50/90"
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                      {req.request_id}
                                    </span>
                                    {req.status && (
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded font-medium border ${getTaskStatusBadge(
                                          req.status
                                        )}`}
                                      >
                                        {req.status}
                                      </span>
                                    )}
                                    {req.squad_name && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
                                        {req.squad_name}
                                      </span>
                                    )}
                                    {req.assigned_designer && (
                                      <span className="text-[11px] text-slate-500">
                                        • {req.assigned_designer}
                                      </span>
                                    )}
                                  </div>
                                  {/* Tên bài toán hiển thị rộng rãi, dễ đọc */}
                                  <p className="text-xs font-medium text-slate-800 break-words leading-relaxed">
                                    {req.title}
                                  </p>
                                </div>
                                <div className="shrink-0 pt-0.5">
                                  {isSelected ? (
                                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-blue-500 flex items-center justify-center transition-colors">
                                      <Plus className="w-3 h-3 text-slate-400" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Thông báo khi tắt gán task trực tiếp */
                    <div className="p-3.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-200/80 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              Gán bài toán trực tiếp: <span className="text-amber-600">Đang Tắt</span>
                            </p>
                            <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                              {currentTier <= 2
                                ? `Node Cấp ${currentTier} (${currentTier === 1 ? "Sản phẩm" : "Phân hệ"}) tự động tổng hợp tiến độ từ toàn bộ cây con cháu bên dưới (Rollup).`
                                : "Chức năng gán bài toán trực tiếp cho thẻ này đang được tắt trong Cài đặt hiển thị."}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateDisplaySetting("allowDirectTasks", true)}
                          className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg shadow-2xs transition-all shrink-0 cursor-pointer"
                        >
                          + Bật gán task
                        </button>
                      </div>
                      {taskIds.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
                          <span>Đang lưu trữ {taskIds.length} task trước đó.</span>
                          <button
                            type="button"
                            onClick={() => setTaskIds([])}
                            className="text-rose-600 hover:underline cursor-pointer font-medium"
                          >
                            Xóa liên kết cũ
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. LOẠI ĐIỂM CHẠM (NẾU CẤP 4 / SCREEN) */}
                  {showTouchpointSelect && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Loại điểm chạm
                      </label>
                      <select
                        value={touchpointType}
                        onChange={(e) => setTouchpointType(e.target.value as IATouchpointType)}
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 font-medium"
                      >
                        {TOUCHPOINT_OPTIONS.map((opt) => (
                          <option key={`tp-opt-${opt.value}`} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 5. CÀI ĐẶT HIỂN THỊ TRÊN THẺ (DISPLAY SETTINGS) */}
                  <div className="pt-4 border-t border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
                          <Sliders className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">
                            Cài đặt hiển thị trên thẻ
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Tùy biến bật/tắt các trường dữ liệu theo đặc thù Cấp {currentTier}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={resetToTierDefaults}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-slate-200/60 hover:border-blue-200"
                        title={`Khôi phục chuẩn hiển thị của Cấp ${currentTier}`}
                      >
                        <RotateCcw className="w-3 h-3 text-slate-400" />
                        <span>Mặc định Cấp {currentTier}</span>
                      </button>
                    </div>

                    <div className="space-y-2 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/70">
                      {/* Item 1: Gán bài toán trực tiếp */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs hover:border-slate-300 transition-colors gap-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>Gán bài toán trực tiếp</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Cho phép tìm kiếm & gán task Jira/UX trực tiếp vào node này. Khuyên tắt cho Cấp 1 & 2.
                          </p>
                        </div>
                        <Switch
                          size="sm"
                          checked={activeSettings.allowDirectTasks}
                          onCheckedChange={(val) => updateDisplaySetting("allowDirectTasks", val)}
                        />
                      </div>

                      {/* Item 2: Hiển thị Tiến độ & Checklist */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs hover:border-slate-300 transition-colors gap-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Hiển thị Tiến độ & Checklist</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Hiển thị thanh % tiến độ và tóm tắt công việc (đang làm, hoàn thành) trên thẻ.
                          </p>
                        </div>
                        <Switch
                          size="sm"
                          checked={activeSettings.showProgress}
                          onCheckedChange={(val) => updateDisplaySetting("showProgress", val)}
                        />
                      </div>

                      {/* Item 3: Tiến độ tổng hợp từ cấp dưới (Rollup) */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs hover:border-slate-300 transition-colors gap-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Tiến độ tổng hợp từ nhánh con (Rollup)</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Tự động gom toàn bộ task của cây con cháu bên dưới để tính % tiến độ và số task thực hiện.
                          </p>
                        </div>
                        <Switch
                          size="sm"
                          checked={activeSettings.rollupProgress}
                          onCheckedChange={(val) => updateDisplaySetting("rollupProgress", val)}
                        />
                      </div>

                      {/* Item 4: Huy hiệu Squad */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs hover:border-slate-300 transition-colors gap-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>Huy hiệu Squad</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Hiển thị nhãn Squad phụ trách ở góc trên bên trái thẻ.
                          </p>
                        </div>
                        <Switch
                          size="sm"
                          checked={activeSettings.showSquad}
                          onCheckedChange={(val) => updateDisplaySetting("showSquad", val)}
                        />
                      </div>

                      {/* Item 5: Người phụ trách / Designer */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs hover:border-slate-300 transition-colors gap-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Người phụ trách (UX Designer)</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Hiển thị avatar và tên UX Designer phụ trách luồng hoặc màn hình.
                          </p>
                        </div>
                        <Switch
                          size="sm"
                          checked={activeSettings.showDesigner}
                          onCheckedChange={(val) => updateDisplaySetting("showDesigner", val)}
                        />
                      </div>

                      {/* Item 6: Đèn báo trạng thái chân thẻ */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs hover:border-slate-300 transition-colors gap-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <Bell className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>Đèn báo trạng thái ở chân thẻ</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Hiển thị nhãn "Đang có task làm", "Đã hoàn thành" hoặc "Chưa có task" ở góc dưới trái thẻ.
                          </p>
                        </div>
                        <Switch
                          size="sm"
                          checked={activeSettings.showStatus}
                          onCheckedChange={(val) => updateDisplaySetting("showStatus", val)}
                        />
                      </div>

                      {/* Item 7: Số lượng nhánh con */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs hover:border-slate-300 transition-colors gap-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            <span>Huy hiệu số lượng nhánh con</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Hiển thị nút đếm số lượng nhánh con phụ thuộc ở góc dưới bên phải thẻ.
                          </p>
                        </div>
                        <Switch
                          size="sm"
                          checked={activeSettings.showBranchCount}
                          onCheckedChange={(val) => updateDisplaySetting("showBranchCount", val)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Confirmation for Delete Mode */}
              {isDeleteMode && targetNode && (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>Xác nhận xóa nhánh tính năng</span>
                    </div>
                    <p className="leading-relaxed text-slate-700">
                      Bạn có chắc chắn muốn xóa node{" "}
                      <span className="font-bold text-slate-900">"{targetNode.name}"</span> khỏi sơ đồ cây IA không?
                    </p>
                  </div>

                  {targetNode.children && targetNode.children.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Cảnh báo xóa nhánh con:</p>
                        <p className="mt-0.5 leading-relaxed">
                          Nhánh này hiện đang chứa{" "}
                          <span className="font-bold">{targetNode.children.length}</span> mục con bên dưới. Khi xóa, toàn bộ các luồng và màn hình phụ thuộc cũng sẽ bị loại bỏ.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation for Reset Mode */}
              {isResetMode && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                      <RotateCcw className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>Khôi phục dữ liệu cây IA chuẩn</span>
                    </div>
                    <p className="leading-relaxed text-slate-700">
                      Hành động này sẽ xóa các chỉnh sửa tạm thời và đưa toàn bộ cây sơ đồ về cấu trúc gốc sản phẩm sạch sẽ ban đầu của MBBank.
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Các node sản phẩm chính (Cấp 1) sẽ được bảo lưu an toàn.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Sheet Footer Buttons (ReUI Pinned Bottom Bar) */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 backdrop-blur-sm flex items-center justify-between gap-3 shrink-0">
              {isViewMode ? (
                <div className="w-full flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Chế độ xem thông tin chi tiết node
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    data-testid="ia-modal-close-btn"
                  >
                    Đóng
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    {mode === "edit" && targetNode && onConfirmDelete && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          onConfirmDelete(targetNode.id)
                          onClose()
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa node</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onClose}
                    >
                      {isDeleteMode ? "Hủy bỏ" : "Đóng"}
                    </Button>

                    <Button
                      type="submit"
                      variant={isDeleteMode ? "destructive" : "default"}
                      size="sm"
                      data-testid="ia-modal-confirm-btn"
                    >
                      {mode === "add" && (
                        <>
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Tạo Nhánh Mới</span>
                        </>
                      )}
                      {mode === "edit" && (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Lưu Thay Đổi</span>
                        </>
                      )}
                      {mode === "delete" && <span>Xác Nhận Xóa</span>}
                      {mode === "reset" && <span>Khôi Phục Ngay</span>}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  )
}

export const IANodeEditorSheet = IANodeEditorModal
