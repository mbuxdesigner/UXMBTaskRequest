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
  UserCheck,
  FolderTree,
} from "lucide-react"
import { springs, dialogOverlayVariants, drawerVariants } from "@/lib/motion"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IANode, IATier, IATouchpointType, IANodeDisplaySettings, getTierDefaultDisplaySettings, IAProductInfo } from "@/types/ia"
import { getAdminSquadsList, getAdminSquadsForProduct } from "@/data/iaMockData"
import { UXRequest, getRequestDisplayTitle, isDemoRequest } from "@/data/mockData"
import { Tooltip } from "@/components/ui/tooltip"

export type ModalMode = "add" | "edit" | "delete" | "reset" | "view" | null

export interface IANodeEditorModalProps {
  mode: ModalMode | "link-task"
  targetNode: IANode | null
  isOpen: boolean
  activeProduct?: IAProductInfo | null
  productName?: string
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
  activeProduct,
  productName,
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
  const [description, setDescription] = useState<string>("")
  const [squad, setSquad] = useState<string>("")
  const [customSquad, setCustomSquad] = useState<string>("")
  const [taskIds, setTaskIds] = useState<string[]>([])
  const [customTag, setCustomTag] = useState<string>("")
  const [colorTheme, setColorTheme] = useState<string>("blue")
  const [touchpointType, setTouchpointType] = useState<IATouchpointType>("screen")
  const [errorMessage, setErrorMessage] = useState<string>("")

  // Xác định Sản phẩm mục tiêu của Node / Cây IA
  const effectiveProduct = useMemo(() => {
    if (activeProduct) return activeProduct
    if (productName) return productName
    if (targetNode?.tier === 1 && targetNode.name) return targetNode.name
    return "App MBBank"
  }, [activeProduct, productName, targetNode])

  const effectiveProductName = useMemo(() => {
    if (typeof effectiveProduct === "string") return effectiveProduct
    return effectiveProduct?.name || "App MBBank"
  }, [effectiveProduct])

  // Cấp độ hiện tại của node đang xử lý
  const currentTier: IATier = useMemo(() => {
    if (mode === "add" && targetNode) {
      return Math.min(5, ((targetNode.tier || 1) + 1)) as IATier
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

  // Danh mục Squads nội bộ chuẩn xác - CHỈ LẤY CÁC SQUAD THUỘC ĐÚNG SẢN PHẨM NÀY
  const availableSquads = useMemo(() => {
    const list = getAdminSquadsForProduct(effectiveProduct)
    const currentSquad = targetNode?.squad?.trim()
    if (currentSquad && !list.includes(currentSquad)) {
      return [currentSquad, ...list]
    }
    return list
  }, [effectiveProduct, targetNode?.squad, isOpen])

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
    if ((mode === "edit" || mode === "link-task") && targetNode) {
      setName(targetNode.name || "")
      setDescription(targetNode.description || "")
      const nodeSquad = targetNode.squad || ""
      if (nodeSquad && !availableSquads.includes(nodeSquad)) {
        setSquad("custom")
        setCustomSquad(nodeSquad)
      } else {
        setSquad(nodeSquad)
        setCustomSquad("")
      }
      setFilterBySquadOnly(Boolean(nodeSquad))

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
      setDescription("")
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
      setDescription("")
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

  // Subtree Metrics and Grouped Tasks calculation for targetNode (used in view mode and details)
  const nodeSubtreeData = useMemo(() => {
    if (!targetNode) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        progressPercent: 0,
        directTasks: [] as UXRequest[],
        childGroups: [] as Array<{
          nodeId: string
          nodeName: string
          tier: IATier
          touchpointType?: IATouchpointType
          tasks: UXRequest[]
        }>,
      }
    }

    const reqMap = new Map<string, UXRequest>(
      availableRequests.map((r) => [r.request_id, r])
    )

    const resolveRequest = (id: string, fallbackSquad?: string): UXRequest => {
      const match = reqMap.get(id)
      if (match) return match
      return ({
        request_id: id,
        title: `Bài toán ${id}`,
        status: "Đang thực hiện",
        squad: fallbackSquad || targetNode.squad || "Chưa gán",
        squad_name: fallbackSquad || targetNode.squad || "Chưa gán",
        requester_name: "Hệ thống",
        assigned_designer: "Chưa gán",
        created_at: new Date().toISOString(),
      } as unknown) as UXRequest
    }

    // 1. Direct tasks at targetNode
    const directIds =
      targetNode.taskIds && targetNode.taskIds.length > 0
        ? targetNode.taskIds
        : targetNode.requestId
        ? [targetNode.requestId]
        : []
    const directTasks = directIds.map((id) => resolveRequest(id, targetNode.squad))

    // 2. Child nodes tasks grouped by descendant node (nodes lv sau)
    interface NodeTaskGroup {
      nodeId: string
      nodeName: string
      tier: IATier
      touchpointType?: IATouchpointType
      tasks: UXRequest[]
    }

    const childGroups: NodeTaskGroup[] = []
    const allSubtreeTaskIds = new Set<string>(directIds)

    const collectGroups = (curr: IANode) => {
      if (!curr.children || curr.children.length === 0) return
      for (const child of curr.children) {
        const cIds =
          child.taskIds && child.taskIds.length > 0
            ? child.taskIds
            : child.requestId
            ? [child.requestId]
            : []

        cIds.forEach((id) => allSubtreeTaskIds.add(id))

        if (cIds.length > 0) {
          const tasks = cIds.map((id) => resolveRequest(id, child.squad))
          childGroups.push({
            nodeId: child.id,
            nodeName: child.name,
            tier: child.tier,
            touchpointType: child.touchpointType,
            tasks,
          })
        }
        collectGroups(child)
      }
    }

    collectGroups(targetNode)

    // Calculate progress stats across all tasks
    const allTaskIds = Array.from(allSubtreeTaskIds)
    const totalTasks = allTaskIds.length
    let completedTasks = 0
    let inProgressTasks = 0

    for (const id of allTaskIds) {
      const req = reqMap.get(id)
      if (req) {
        const s = (req.status || "").toLowerCase()
        const isDone =
          s.includes("hoàn thành") ||
          s.includes("nghiệm thu") ||
          s.includes("release") ||
          req.progress === 100
        const isDoing =
          !isDone &&
          (s.includes("thực hiện") ||
            s.includes("đang làm") ||
            s.includes("tiến hành") ||
            s.includes("review") ||
            (req.progress !== undefined && req.progress > 0 && req.progress < 100))

        if (isDone) completedTasks++
        else if (isDoing) inProgressTasks++
      }
    }

    const progressPercent =
      totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : targetNode.progress || 0

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      progressPercent,
      directTasks,
      childGroups,
    }
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

    if (mode === "link-task" && targetNode) {
      const effectiveTaskIds = taskIds.length > 0 ? taskIds : undefined
      onConfirmEdit?.(targetNode.id, {
        taskIds: effectiveTaskIds,
        requestId: effectiveTaskIds && effectiveTaskIds.length > 0 ? effectiveTaskIds[0] : undefined,
        hasActiveTask: undefined,
      })
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
      description: description.trim() || undefined,
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
  const isTaskPickerMode = mode === "link-task"

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

        {/* ReUI Slide-Over Drawer Container */}
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
          {/* ReUI Drawer Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0 bg-white">
            <h3 className="text-base font-bold text-slate-900 tracking-tight truncate">
              {isTaskPickerMode
                ? "Liên kết task"
                : isViewMode
                ? "Xem chi tiết node"
                : isDeleteMode
                ? "Xác nhận xóa nhánh tính năng"
                : isResetMode
                ? "Khôi phục dữ liệu cây IA"
                : mode === "add"
                ? `Thêm nhánh con vào "${targetNode?.name || "Sơ đồ"}"`
                : "Cập nhật node"}
            </h3>

            <Tooltip content="Đóng (Esc)" shortcut="Esc" side="left">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 -mr-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 shrink-0"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>

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
                  {/* Header Title & Node Name */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      {(targetNode.code || targetNode.isCriticalPath) && (
                        <div className="flex items-center gap-2">
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
                      )}
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {targetNode.name}
                      </h3>
                    </div>
                  </div>

                  {/* Process % Working Card */}
                  <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80">
                          <CheckSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-800">Tiến độ thực hiện (Working)</div>
                          <div className="text-[11px] text-slate-500">
                            {nodeSubtreeData.totalTasks > 0
                              ? `${nodeSubtreeData.completedTasks}/${nodeSubtreeData.totalTasks} task hoàn thành`
                              : "Chưa có task liên kết"}
                          </div>
                        </div>
                      </div>
                      <span className="text-xl font-bold font-mono text-slate-900 tracking-tight">
                        {nodeSubtreeData.progressPercent}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-200/70 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${nodeSubtreeData.progressPercent}%` }}
                      />
                    </div>

                    {/* Micro Stats */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/60 text-center">
                        <div className="text-[10px] text-slate-500 uppercase font-medium">Tổng task</div>
                        <div className="text-xs font-bold text-slate-800 font-mono">{nodeSubtreeData.totalTasks}</div>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/60 text-center">
                        <div className="text-[10px] text-blue-600 uppercase font-medium">Đang làm</div>
                        <div className="text-xs font-bold text-blue-700 font-mono">{nodeSubtreeData.inProgressTasks}</div>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/60 text-center">
                        <div className="text-[10px] text-emerald-600 uppercase font-medium">Hoàn thành</div>
                        <div className="text-xs font-bold text-emerald-700 font-mono">{nodeSubtreeData.completedTasks}</div>
                      </div>
                    </div>
                  </div>

                  {/* Task liên kết theo nhóm các node level sau */}
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                        <span>Task liên kết ({nodeSubtreeData.totalTasks})</span>
                      </label>
                    </div>

                    {nodeSubtreeData.totalTasks === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 text-center space-y-1">
                        <p className="text-xs italic">Chưa có bài toán thiết kế nào được liên kết với node này hoặc các nhánh con.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Group 1: Task trực tiếp tại node này nếu có */}
                        {nodeSubtreeData.directTasks.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold font-mono">
                                Lv{targetNode.tier}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {targetNode.name} (Trực tiếp)
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                · {nodeSubtreeData.directTasks.length} task
                              </span>
                            </div>

                            <div className="space-y-2">
                              {nodeSubtreeData.directTasks.map((req) => (
                                <div
                                  key={req.request_id}
                                  className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors flex items-center justify-between gap-3"
                                >
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-blue-600 text-[11px]">
                                        {req.request_id}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getTaskStatusBadge(req.status)}`}>
                                        {req.status}
                                      </span>
                                    </div>
                                    <div className="font-semibold text-slate-800 truncate text-xs">
                                      {getRequestDisplayTitle(req)}
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
                          </div>
                        )}

                        {/* Groups: Tasks theo từng node level sau */}
                        {nodeSubtreeData.childGroups.map((group) => (
                          <div key={group.nodeId} className="space-y-2">
                            <div className="flex items-center gap-2 px-1 pt-1">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono border ${
                                  group.tier === 2
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : group.tier === 3
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-800 border-amber-200"
                                }`}
                              >
                                Lv{group.tier}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {group.nodeName}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                · {group.tasks.length} task
                              </span>
                            </div>

                            <div className="space-y-2">
                              {group.tasks.map((req) => (
                                <div
                                  key={req.request_id}
                                  className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors flex items-center justify-between gap-3"
                                >
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-blue-600 text-[11px]">
                                        {req.request_id}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getTaskStatusBadge(req.status)}`}>
                                        {req.status}
                                      </span>
                                    </div>
                                    <div className="font-semibold text-slate-800 truncate text-xs">
                                      {getRequestDisplayTitle(req)}
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Task Picker Sheet Mode (Khi bấm vào "Không có task" trên node) */}
              {isTaskPickerMode && targetNode && (
                <div className="space-y-5" data-testid="ia-node-task-picker">
                  {/* Header Title & Target Node Info */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-mono">
                          Lv{targetNode.tier} · {
                            targetNode.tier === 1
                              ? "Nút gốc"
                              : targetNode.tier === 2
                              ? "Luồng nghiệp vụ"
                              : targetNode.tier === 3
                              ? "Chức năng con"
                              : "Điểm chạm"
                          }
                        </span>
                        {targetNode.squad && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                            {targetNode.squad}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {targetNode.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Chọn các bài toán thiết kế (UX Request) để liên kết với tính năng này.
                      </p>
                    </div>
                  </div>

                  {/* Search Bar & Squad Filter */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>Danh sách bài toán khả dụng ({filteredAvailableTasks.length})</span>
                      </label>
                      {effectiveSquadName && (
                        <Tooltip
                          content={filterBySquadOnly ? "Hiển thị tất cả Squad" : `Chỉ lọc theo ${effectiveSquadName}`}
                          side="top"
                        >
                          <button
                            type="button"
                            onClick={() => setFilterBySquadOnly(!filterBySquadOnly)}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                              filterBySquadOnly
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            <Filter className="w-3 h-3" />
                            <span>
                              {filterBySquadOnly ? `Theo ${effectiveSquadName}` : "Tất cả Squad"}
                            </span>
                          </button>
                        </Tooltip>
                      )}
                    </div>

                    {/* Task Search Bar */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={taskSearchQuery}
                        onChange={(e) => setTaskSearchQuery(e.target.value)}
                        placeholder={`Tìm mã bài toán (REQ-...), tên task, designer...`}
                        className="w-full pl-8 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Selected Tasks Bar (If any selected) */}
                  {taskIds.length > 0 && (
                    <div className="space-y-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Đã chọn ({taskIds.length})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setTaskIds([])}
                          className="text-[11px] text-blue-600 hover:text-rose-600 font-medium cursor-pointer transition-colors"
                        >
                          Bỏ chọn tất cả
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                        {taskIds.map((tid) => {
                          const req = availableRequests.find((r) => r.request_id === tid)
                          return (
                            <span
                              key={`pill-${tid}`}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-blue-200 text-xs text-slate-800 shadow-2xs"
                            >
                              <span className="font-mono font-bold text-blue-600 text-[11px]">{tid}</span>
                              {req?.title && (
                                <span className="max-w-[160px] truncate text-[11px] text-slate-600">
                                  {getRequestDisplayTitle(req)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeTaskId(tid)}
                                className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Available Tasks Pick List */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                    {filteredAvailableTasks.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 space-y-2">
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
                              <p className="text-xs font-medium text-slate-800 break-words leading-relaxed">
                                {getRequestDisplayTitle(req)}
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
              )}

              {/* Form Fields for Add / Edit */}
              {isFormMode && (
                <>
                  {/* 1. TÊN TÍNH NĂNG */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-900">
                        Tên tính năng / Màn hình <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-normal">Bắt buộc</span>
                    </div>
                    <input
                      type="text"
                      data-testid="ia-node-modal-name-input"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (errorMessage) setErrorMessage("")
                      }}
                      placeholder="VD: Mở Thẻ Tín Dụng Online, Chia Tiền VietQR..."
                      className="w-full h-11 px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-all placeholder:text-slate-400 placeholder:font-normal font-semibold text-slate-900 shadow-2xs"
                      autoFocus
                    />
                  </div>

                  {/* 2. GHI CHÚ / MÔ TẢ (NOTE) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-900">
                        Ghi chú / Mô tả (Note)
                      </label>
                      <span className="text-[11px] text-slate-400 font-normal">Tùy chọn</span>
                    </div>
                    <textarea
                      data-testid="ia-node-modal-note-input"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Nhập ghi chú màn hình, logic nghiệp vụ hoặc chỉ dẫn thiết kế..."
                      rows={3}
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-all placeholder:text-slate-400 font-medium text-slate-800 shadow-2xs resize-none"
                    />
                  </div>

                  {/* 3. CHỌN SQUAD PHỤ TRÁCH (ReUI DropdownMenu Chuẩn, Đi theo Sản phẩm) */}
                  <div className="relative" ref={squadDropdownRef}>
                    <label className="block text-xs font-bold text-slate-900 mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>Chọn Squad phụ trách</span>
                      </div>
                      {effectiveProductName && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {effectiveProductName}
                        </span>
                      )}
                    </label>

                    {/* ReUI Dropdown Trigger */}
                    <button
                      type="button"
                      data-testid="ia-node-modal-squad-select"
                      onClick={() => setIsSquadDropdownOpen(!isSquadDropdownOpen)}
                      className={`w-full h-11 px-3.5 py-2.5 bg-white hover:bg-slate-50/80 border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-900/20 ${
                        isSquadDropdownOpen
                          ? "border-slate-400 ring-2 ring-slate-900/10"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                          <Users className="w-3.5 h-3.5" />
                        </div>
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
                          {/* Product Context Scope Header */}
                          <div className="px-3 py-1.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Squad thuộc sản phẩm:</span>
                            <span className="font-bold text-blue-600 truncate max-w-[180px]">{effectiveProductName}</span>
                          </div>

                          {/* Search Squad */}
                          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                            <div className="relative flex items-center">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                              <input
                                type="text"
                                value={squadSearchQuery}
                                onChange={(e) => setSquadSearchQuery(e.target.value)}
                                placeholder={`Tìm Squad trong ${effectiveProductName}...`}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                              />
                            </div>
                          </div>

                          {/* Options List (Chỉ chứa Squad nội bộ thuộc Sản phẩm) */}
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

                            {filteredSquads.length === 0 && (
                              <div className="p-3 text-center text-xs text-slate-400">
                                {squadSearchQuery.trim()
                                  ? `Không tìm thấy Squad nào khớp với "${squadSearchQuery}"`
                                  : `Chưa có Squad nào thuộc sản phẩm "${effectiveProductName}"`}
                              </div>
                            )}

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


                  {/* 5. LOẠI ĐIỂM CHẠM (NẾU CẤP 4 / SCREEN) */}
                  {showTouchpointSelect && (
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1.5">
                        Loại điểm chạm (Touchpoint)
                      </label>
                      <select
                        value={touchpointType}
                        onChange={(e) => setTouchpointType(e.target.value as IATouchpointType)}
                        className="w-full h-11 px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-all shadow-2xs"
                      >
                        {TOUCHPOINT_OPTIONS.map((opt) => (
                          <option key={`tp-opt-${opt.value}`} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 6. CÀI ĐẶT HIỂN THỊ TRÊN THẺ (DISPLAY SETTINGS) */}
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                            Cài đặt hiển thị trên thẻ
                          </h4>
                          <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                            Tùy biến bật/tắt các trường dữ liệu theo đặc thù Cấp {currentTier}
                          </p>
                        </div>
                      </div>
                      <Tooltip content={`Khôi phục chuẩn hiển thị của Cấp ${currentTier}`} side="top">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={resetToTierDefaults}
                          className="rounded-xl border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs text-xs font-semibold gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                          <span>Mặc định Cấp {currentTier}</span>
                        </Button>
                      </Tooltip>
                    </div>

                    {/* ReUI Frame Container with Divide-Y */}
                    <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
                      {/* Item 1: Hiển thị Tiến độ & Checklist */}
                      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900">
                            Hiển thị Tiến độ & Checklist
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            Hiển thị thanh % tiến độ và tóm tắt công việc (đang làm, hoàn thành) trên thẻ.
                          </p>
                        </div>
                        <Switch
                          size="sm"
                          checked={activeSettings.showProgress}
                          onCheckedChange={(val) => updateDisplaySetting("showProgress", val)}
                          className="shrink-0"
                        />
                      </div>

                      {/* Item 3: Tiến độ tổng hợp từ cấp dưới (Rollup) */}
                      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900">
                            Tiến độ tổng hợp từ nhánh con (Rollup)
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            Tự động gom toàn bộ task của cây con cháu bên dưới để tính % tiến độ và số task thực hiện.
                          </p>
                        </div>
                        <Switch
                          size="sm"
                          checked={activeSettings.rollupProgress}
                          onCheckedChange={(val) => updateDisplaySetting("rollupProgress", val)}
                          className="shrink-0"
                        />
                      </div>

                      {/* Item 4: Huy hiệu Squad */}
                      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900">
                            Huy hiệu Squad
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            Hiển thị nhãn Squad phụ trách ở góc trên bên trái thẻ.
                          </p>
                        </div>
                        <Switch
                          size="sm"
                          checked={activeSettings.showSquad}
                          onCheckedChange={(val) => updateDisplaySetting("showSquad", val)}
                          className="shrink-0"
                        />
                      </div>

                      {/* Item 5: Người phụ trách / Designer */}
                      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900">
                            Người phụ trách (UX Designer)
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            Hiển thị avatar và tên UX Designer phụ trách luồng hoặc màn hình.
                          </p>
                        </div>
                        <Switch
                          size="sm"
                          checked={activeSettings.showDesigner}
                          onCheckedChange={(val) => updateDisplaySetting("showDesigner", val)}
                          className="shrink-0"
                        />
                      </div>

                      {/* Item 6: Đèn báo trạng thái chân thẻ */}
                      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900">
                            Đèn báo trạng thái ở chân thẻ
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            Hiển thị nhãn "Đang có task làm", "Đã hoàn thành" hoặc "Chưa có task" ở góc dưới trái thẻ.
                          </p>
                        </div>
                        <Switch
                          size="sm"
                          checked={activeSettings.showStatus}
                          onCheckedChange={(val) => updateDisplaySetting("showStatus", val)}
                          className="shrink-0"
                        />
                      </div>

                      {/* Item 7: Số lượng nhánh con */}
                      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900">
                            Huy hiệu số lượng nhánh con
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            Hiển thị nút đếm số lượng nhánh con phụ thuộc ở góc dưới bên phải thẻ.
                          </p>
                        </div>
                        <Switch
                          size="sm"
                          checked={activeSettings.showBranchCount}
                          onCheckedChange={(val) => updateDisplaySetting("showBranchCount", val)}
                          className="shrink-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. GÁN TASK (Tách riêng; chỉ hiển thị khi chọn Squad; khi On thì hiện list task ngay ở dưới) */}
                  {Boolean(effectiveSquadName && effectiveSquadName.trim()) && (
                    <div className="pt-1 space-y-3">
                      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden transition-all">
                        {/* Header Row with Switch */}
                        <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-slate-900">
                                Gán task trực tiếp
                              </p>
                              {taskIds.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {taskIds.length} task đã chọn
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                              Cho phép tìm kiếm & liên kết các task UX/Jira của Squad {effectiveSquadName} vào node này.
                            </p>
                          </div>
                          <Switch
                            size="sm"
                            checked={activeSettings.allowDirectTasks}
                            onCheckedChange={(val) => updateDisplaySetting("allowDirectTasks", val)}
                            className="shrink-0"
                          />
                        </div>

                        {/* Khi ON thì danh sách task hiển thị ngay ở dưới */}
                        {activeSettings.allowDirectTasks && (
                          <div className="border-t border-slate-100 p-3.5 sm:p-4 space-y-3 bg-slate-50/40">
                            {/* Filter Bar */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-700">
                                Danh sách task khả dụng ({filteredAvailableTasks.length})
                              </span>
                              {effectiveSquadName && (
                                <Tooltip
                                  content={filterBySquadOnly ? "Hiển thị tất cả Squad" : `Chỉ lọc theo ${effectiveSquadName}`}
                                  side="top"
                                >
                                  <button
                                    type="button"
                                    onClick={() => setFilterBySquadOnly(!filterBySquadOnly)}
                                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                                      filterBySquadOnly
                                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                    }`}
                                  >
                                    <Filter className="w-3 h-3" />
                                    <span>{filterBySquadOnly ? `Theo ${effectiveSquadName}` : "Tất cả Squad"}</span>
                                  </button>
                                </Tooltip>
                              )}
                            </div>

                            {/* Selected Tasks List (Thẻ rộng, text dài đọc tên rõ ràng) */}
                            {taskIds.length > 0 && (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto p-1 bg-white rounded-xl border border-blue-100">
                                {taskIds.map((tid, tIdx) => {
                                  const req = availableRequests.find((r) => r.request_id === tid)
                                  return (
                                    <div
                                      key={`selected-task-${tid || tIdx}`}
                                      className="p-2.5 rounded-xl bg-blue-50/30 border border-blue-100 flex items-start justify-between gap-3 shadow-2xs hover:border-blue-200 transition-all"
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
                                        <p className="text-xs font-semibold text-slate-800 break-words leading-relaxed">
                                          {req ? getRequestDisplayTitle(req) : tid}
                                        </p>
                                      </div>
                                      <Tooltip content="Bỏ liên kết task này" side="left">
                                        <button
                                          type="button"
                                          onClick={() => removeTaskId(tid)}
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </Tooltip>
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
                                placeholder={`Tìm kiếm mã task hoặc tên task${effectiveSquadName ? ` (${effectiveSquadName})...` : "..."}`}
                                className="w-full pl-8 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800 shadow-2xs"
                              />
                            </div>

                            {/* Available Tasks Pick List */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs max-h-56 overflow-y-auto divide-y divide-slate-100">
                              {filteredAvailableTasks.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400 space-y-1.5">
                                  <p>
                                    {taskSearchQuery.trim()
                                      ? `Không tìm thấy task nào khớp với "${taskSearchQuery}"`
                                      : effectiveSquadName && filterBySquadOnly
                                      ? `Chưa có task nào thuộc Squad "${effectiveSquadName}"`
                                      : "Chưa có task nào trong hệ thống"}
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
                                        Xem task của tất cả các Squad khác
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
                                        <p className="text-xs font-medium text-slate-800 break-words leading-relaxed">
                                          {getRequestDisplayTitle(req)}
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
                        )}
                      </div>
                    </div>
                  )}
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
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 backdrop-blur-sm flex items-center justify-between gap-3 shrink-0">
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
                    className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-semibold text-xs px-4 h-9"
                  >
                    Đóng
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    {mode === "link-task" && (
                      <span className="text-xs text-slate-500 font-medium">
                        Đang liên kết <strong className="text-slate-900 font-bold">{taskIds.length}</strong> bài toán
                      </span>
                    )}
                    {mode === "edit" && targetNode && onConfirmDelete && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          onConfirmDelete(targetNode.id)
                          onClose()
                        }}
                        className="rounded-xl font-semibold text-xs px-3 h-9 gap-1.5 shadow-xs"
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
                      className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-semibold text-xs px-4 h-9"
                    >
                      {isDeleteMode ? "Hủy bỏ" : "Đóng"}
                    </Button>

                    <Button
                      type="submit"
                      variant={isDeleteMode ? "destructive" : "default"}
                      size="sm"
                      data-testid="ia-modal-confirm-btn"
                      className={
                        isDeleteMode
                          ? "rounded-xl font-semibold text-xs px-4 h-9 shadow-xs"
                          : "bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs font-semibold text-xs px-4 h-9 gap-1.5 focus-visible:ring-slate-900/30"
                      }
                    >
                      {mode === "link-task" && (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Lưu Bài Toán Liên Kết</span>
                        </>
                      )}
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
