import React, { memo, useState, useRef, useMemo, useEffect } from "react"
import { motion } from "framer-motion"
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Layers,
  Smartphone,
  Layout,
  Globe,
  Bell,
  PanelBottom,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Tag,
  Users,
  ListTodo,
  Check,
} from "lucide-react"
import { springs, tactileProps } from "@/lib/motion"
import { Tooltip } from "@/components/ui/tooltip"
import { IANode, IATier, IATouchpointType, IAPortPosition, getTierDefaultDisplaySettings } from "@/types/ia"
import { LayoutNode, computeSubtreeMetrics } from "@/hooks/useIATreeState"
import { UXRequest } from "@/data/mockData"

interface IATreeNodeCardProps {
  layoutNode: LayoutNode
  linkedRequest?: UXRequest
  requestsMap?: Map<string, UXRequest>
  isHighlighted?: boolean
  scale?: number
  getScale?: () => number
  onToggleCollapse: (nodeId: string) => void
  onOpenDetail?: (request: UXRequest) => void
  onAddChild: (parentNode: IANode) => void
  onAddChildInDirection?: (parentId: string, direction: IAPortPosition) => void
  onPortDragStart?: (nodeId: string, port: IAPortPosition, e: React.PointerEvent) => void
  isWireDropTarget?: boolean
  onEditNode: (node: IANode) => void
  onUpdateNode?: (nodeId: string, nodeData: Partial<IANode>) => void
  onDeleteNode: (node: IANode) => void
  onOpenNodeDetail?: (node: IANode) => void
  onOpenTaskPicker?: (node: IANode) => void
  onNodeDrag?: (nodeId: string, x: number, y: number) => void
  onNodeDragEnd?: (nodeId: string, x: number, y: number) => void
  isSelected?: boolean
  onCardSelect?: (nodeId: string, e: React.PointerEvent) => void
  onMultiNodeDrag?: (positions: Array<{ nodeId: string; x: number; y: number }>, persist: boolean) => void
  selectedNodePositions?: Map<string, { x: number; y: number }>
  onNodeResize?: (nodeId: string, width: number, height: number, persist?: boolean) => void
  onNodeResizeEnd?: (nodeId: string, width: number, height: number, persist?: boolean) => void
  readOnly?: boolean
  isAnyDragging?: boolean
  onDragStateChange?: (isDragging: boolean) => void
  snapToGrid?: boolean
}

function getTouchpointIcon(type?: IATouchpointType) {
  switch (type) {
    case "modal":
      return <Layout className="w-3 h-3 text-purple-600 shrink-0" />
    case "bottom_sheet":
      return <PanelBottom className="w-3 h-3 text-amber-600 shrink-0" />
    case "push_notification":
      return <Bell className="w-3 h-3 text-rose-600 shrink-0" />
    case "webview":
      return <Globe className="w-3 h-3 text-cyan-600 shrink-0" />
    case "action_sheet":
      return <PanelBottom className="w-3 h-3 text-indigo-600 shrink-0" />
    case "screen":
    default:
      return <Smartphone className="w-3 h-3 text-blue-600 shrink-0" />
  }
}

function getStatusBadgeStyle(status?: string) {
  switch (status) {
    case "Đã Release":
    case "Hoàn thành":
      return "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
    case "Đang thực hiện":
    case "UI Design":
    case "Discovery":
    case "User Flow":
      return "bg-blue-50 text-blue-800 border-blue-300 font-bold"
    case "PO pending":
    case "Bị chặn":
      return "bg-rose-50 text-rose-800 border-rose-300 font-bold"
    case "Đã gửi PO":
    case "Chờ tiếp nhận":
      return "bg-amber-50 text-amber-800 border-amber-300 font-bold"
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 font-medium"
  }
}

function getTierThemeStyles(tier: IATier, customTheme?: string) {
  // If user selected an explicit custom theme
  if (customTheme && customTheme !== "blue") {
    switch (customTheme) {
      case "emerald":
        return {
          stripe: "bg-emerald-500",
          accentHex: "#10b981",
          border: "border-slate-200 hover:border-emerald-500",
          portBorder: "border-emerald-500 text-emerald-600 hover:bg-emerald-50",
          squadBadgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        }
      case "purple":
      case "violet":
        return {
          stripe: "bg-purple-600",
          accentHex: "#8b5cf6",
          border: "border-slate-200 hover:border-purple-500",
          portBorder: "border-purple-500 text-purple-600 hover:bg-purple-50",
          squadBadgeClass: "bg-purple-50 text-purple-700 border-purple-200",
        }
      case "amber":
        return {
          stripe: "bg-amber-500",
          accentHex: "#f59e0b",
          border: "border-slate-200 hover:border-amber-500",
          portBorder: "border-amber-500 text-amber-600 hover:bg-amber-50",
          squadBadgeClass: "bg-amber-50 text-amber-800 border-amber-200",
        }
      case "rose":
        return {
          stripe: "bg-rose-500",
          accentHex: "#f43f5e",
          border: "border-slate-200 hover:border-rose-500",
          portBorder: "border-rose-500 text-rose-600 hover:bg-rose-50",
          squadBadgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        }
      case "cyan":
        return {
          stripe: "bg-cyan-500",
          accentHex: "#06b6d4",
          border: "border-slate-200 hover:border-cyan-500",
          portBorder: "border-cyan-500 text-cyan-600 hover:bg-cyan-50",
          squadBadgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200",
        }
    }
  }

  // Chia màu mặc định theo Level (Lv 1, Lv 2, Lv 3, Lv 4) chuẩn nhận diện MBBank
  switch (tier) {
    case 1:
      return {
        stripe: "bg-[#1057FB]",
        accentHex: "#1057FB",
        border: "border-slate-200 hover:border-[#1057FB]",
        portBorder: "border-[#1057FB] text-[#1057FB] hover:bg-blue-50",
        squadBadgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      }
    case 2:
      return {
        stripe: "bg-indigo-600",
        accentHex: "#6366f1",
        border: "border-slate-200 hover:border-indigo-500",
        portBorder: "border-indigo-500 text-indigo-600 hover:bg-indigo-50",
        squadBadgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
      }
    case 3:
      return {
        stripe: "bg-emerald-600",
        accentHex: "#10b981",
        border: "border-slate-200 hover:border-emerald-500",
        portBorder: "border-emerald-500 text-emerald-600 hover:bg-emerald-50",
        squadBadgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      }
    case 4:
      return {
        stripe: "bg-amber-500",
        accentHex: "#f59e0b",
        border: "border-slate-200 hover:border-amber-500",
        portBorder: "border-amber-500 text-amber-600 hover:bg-amber-50",
        squadBadgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      }
    case 5:
    default:
      return {
        stripe: "bg-purple-600",
        accentHex: "#8b5cf6",
        border: "border-slate-200 hover:border-purple-500",
        portBorder: "border-purple-500 text-purple-600 hover:bg-purple-50",
        squadBadgeClass: "bg-purple-50 text-purple-700 border-purple-200",
      }
  }
}

function IATreeNodeCardComponent({
  layoutNode,
  linkedRequest,
  requestsMap,
  isHighlighted = false,
  scale = 1.0,
  getScale,
  onToggleCollapse,
  onOpenDetail,
  onAddChild,
  onAddChildInDirection,
  onPortDragStart,
  isWireDropTarget = false,
  onEditNode,
  onUpdateNode,
  onDeleteNode,
  onOpenNodeDetail,
  onOpenTaskPicker,
  onNodeDrag,
  onNodeDragEnd,
  isSelected = false,
  onCardSelect,
  onMultiNodeDrag,
  selectedNodePositions,
  onNodeResize,
  onNodeResizeEnd,
  readOnly = false,
  isAnyDragging = false,
  onDragStateChange,
  snapToGrid = false,
}: IATreeNodeCardProps) {
  const snapCoord = (v: number) => (snapToGrid ? Math.round(v / 20) * 20 : v)
  const { node, x, y, width, isCollapsed, hasChildren, childCount } = layoutNode
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null)

  // Inline Node Name Editing (Double-click or Enter)
  const [isInlineEditing, setIsInlineEditing] = useState(false)
  const [inlineName, setInlineName] = useState(node.name)
  const inlineInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInlineName(node.name)
  }, [node.name])

  useEffect(() => {
    if (isInlineEditing && inlineInputRef.current) {
      inlineInputRef.current.focus()
      const len = inlineInputRef.current.value.length
      inlineInputRef.current.setSelectionRange(len, len)
    }
  }, [isInlineEditing])

  const handleCommitInlineEdit = () => {
    const trimmed = inlineName.trim()
    if (trimmed && trimmed !== node.name) {
      if (onUpdateNode) {
        onUpdateNode(node.id, { name: trimmed })
      } else {
        onEditNode({ ...node, name: trimmed })
      }
    } else {
      setInlineName(node.name)
    }
    setIsInlineEditing(false)
  }

  const handleCancelInlineEdit = () => {
    setInlineName(node.name)
    setIsInlineEditing(false)
  }

  // Resolve all linked tasks (from node.taskIds or node.requestId)
  const taskIdsList = useMemo(() => {
    const list: string[] = []
    if (node.taskIds && node.taskIds.length > 0) {
      node.taskIds.forEach((id) => {
        const t = (id || "").trim()
        if (t && !list.includes(t)) list.push(t)
      })
    }
    if (node.requestId) {
      const t = (node.requestId || "").trim()
      if (t && !list.includes(t)) {
        list.push(t)
      }
    }
    return list
  }, [node.taskIds, node.requestId])

  // Look up UXRequests for all linked tasks
  const linkedRequests = useMemo(() => {
    const reqs: UXRequest[] = []
    if (linkedRequest) reqs.push(linkedRequest)
    if (requestsMap) {
      taskIdsList.forEach((id) => {
        const r = requestsMap.get(id)
        if (r && !reqs.some((existing) => existing.request_id === r.request_id)) {
          reqs.push(r)
        }
      })
    }
    return reqs
  }, [linkedRequest, requestsMap, taskIdsList])

  // Effective Display Settings (Tier Defaults merged with node's custom displaySettings)
  const displaySettings = useMemo(() => {
    const defaults = getTierDefaultDisplaySettings(node.tier)
    return { ...defaults, ...(node.displaySettings || {}) }
  }, [node.tier, node.displaySettings])

  const effectiveFigmaUrl = node.figmaUrl || linkedRequest?.deliverables?.figma_url || linkedRequest?.deliverables?.prototype_url
  const effectiveDesigner = node.assignedDesigner || linkedRequest?.assigned_designer
  const effectiveStatus = node.status || linkedRequest?.status
  const effectiveProgress = node.progress ?? linkedRequest?.progress

  // Subtree Metrics (Rollup from lower-level descendants)
  const subtreeMetrics = useMemo(() => {
    if (layoutNode.metrics) return layoutNode.metrics
    return computeSubtreeMetrics(node, requestsMap)
  }, [layoutNode.metrics, node, requestsMap])

  // Rollup is active when enabled in displaySettings AND the node has child branches
  const isRollup = Boolean(displaySettings.rollupProgress && hasChildren)

  // Direct task status counts
  const directCompletedTasksCount = useMemo(() => {
    return linkedRequests.filter((r) => {
      const s = (r.status || "").toLowerCase()
      return s.includes("hoàn thành") || s.includes("nghiệm thu") || s.includes("release") || r.progress === 100
    }).length
  }, [linkedRequests])

  const directInProgressCount = useMemo(() => {
    return linkedRequests.filter((r) => {
      const s = (r.status || "").toLowerCase()
      return (
        s.includes("thực hiện") ||
        s.includes("đang làm") ||
        s.includes("review") ||
        s.includes("tiến hành") ||
        (r.progress > 0 && r.progress < 100)
      )
    }).length
  }, [linkedRequests])

  // Resolved metrics depending on whether Rollup is active
  const totalTasks = isRollup ? subtreeMetrics.totalTasks : taskIdsList.length
  const completedTasksCount = isRollup ? subtreeMetrics.completedTasks : directCompletedTasksCount
  const inProgressCount = isRollup ? subtreeMetrics.inProgressTasks : directInProgressCount
  const pendingCount = isRollup ? subtreeMetrics.pendingTasks : Math.max(0, totalTasks - completedTasksCount - inProgressCount)
  const activeTaskCount = inProgressCount > 0 ? inProgressCount : (totalTasks > completedTasksCount ? totalTasks - completedTasksCount : totalTasks)

  const taskPercent = useMemo(() => {
    if (isRollup) return subtreeMetrics.progressPercent
    if (totalTasks > 0) {
      return Math.round((completedTasksCount / totalTasks) * 100)
    }
    return effectiveProgress ?? 0
  }, [isRollup, subtreeMetrics.progressPercent, totalTasks, completedTasksCount, effectiveProgress])

  // Determine "Trạng thái có task đang làm hay không"
  const hasActiveTask = useMemo(() => {
    if (node.hasActiveTask !== undefined) {
      return node.hasActiveTask
    }
    if (isRollup) {
      return subtreeMetrics.hasActiveTask
    }
    if (taskIdsList.length === 0) return false
    return directInProgressCount > 0 || (totalTasks > 0 && completedTasksCount < totalTasks)
  }, [node.hasActiveTask, isRollup, subtreeMetrics.hasActiveTask, taskIdsList.length, directInProgressCount, totalTasks, completedTasksCount])

  const allTasksCompleted = useMemo(() => {
    if (isRollup) return subtreeMetrics.allCompleted
    if (totalTasks === 0) return false
    if (hasActiveTask) return false
    return completedTasksCount === totalTasks
  }, [isRollup, subtreeMetrics.allCompleted, totalTasks, hasActiveTask, completedTasksCount])

  const themeStyles = getTierThemeStyles(node.tier, node.colorTheme)

  // Drag and drop arranger logic
  const handlePointerDown = (e: React.PointerEvent) => {
    if (readOnly || e.button !== 0) return
    const target = e.target as HTMLElement
    // Ignore clicks on buttons, inputs, links, connection ports, or resize handle
    if (target.closest("button, a, input, textarea, [data-port-action], [data-resize-handle]")) {
      return
    }

    e.stopPropagation()
    onCardSelect?.(node.id, e)

    setIsDragging(true)
    onDragStateChange?.(true)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: x,
      initY: y,
    }

    const currentScale = getScale ? Math.max(0.05, getScale()) : Math.max(0.05, scale || 1)
    let rafId: number | null = null
    let latestClientX = e.clientX
    let latestClientY = e.clientY
    let hasMoved = false

    // Check if we are dragging a multi-selection
    const isMultiDrag = !!(isSelected && selectedNodePositions && selectedNodePositions.size > 1 && onMultiNodeDrag)
    const snapshotPositions = isMultiDrag ? new Map(selectedNodePositions) : null

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!dragRef.current) return
      latestClientX = moveEvt.clientX
      latestClientY = moveEvt.clientY

      const totalDist = Math.hypot(moveEvt.clientX - dragRef.current.startX, moveEvt.clientY - dragRef.current.startY)
      if (totalDist > 3) {
        hasMoved = true
      }

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null
          const activeDrag = dragRef.current
          if (!activeDrag) return
          const dx = (latestClientX - activeDrag.startX) / currentScale
          const dy = (latestClientY - activeDrag.startY) / currentScale

          if (isMultiDrag && snapshotPositions) {
            const batchPositions: Array<{ nodeId: string; x: number; y: number }> = []
            for (const [sId, sPos] of snapshotPositions.entries()) {
              batchPositions.push({
                nodeId: sId,
                x: snapCoord(Math.round(sPos.x + dx)),
                y: snapCoord(Math.round(sPos.y + dy)),
              })
            }
            onMultiNodeDrag?.(batchPositions, false)
          } else {
            const nextX = snapCoord(Math.round(activeDrag.initX + dx))
            const nextY = snapCoord(Math.round(activeDrag.initY + dy))
            onNodeDrag?.(node.id, nextX, nextY)
          }
        })
      }
    }

    const handlePointerUp = (upEvt: PointerEvent) => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
      setIsDragging(false)
      onDragStateChange?.(false)
      const endDrag = dragRef.current
      dragRef.current = null
      if (endDrag && hasMoved) {
        const dx = (upEvt.clientX - endDrag.startX) / currentScale
        const dy = (upEvt.clientY - endDrag.startY) / currentScale

        if (isMultiDrag && snapshotPositions) {
          const batchPositions: Array<{ nodeId: string; x: number; y: number }> = []
          for (const [sId, sPos] of snapshotPositions.entries()) {
            batchPositions.push({
              nodeId: sId,
              x: snapCoord(Math.round(sPos.x + dx)),
              y: snapCoord(Math.round(sPos.y + dy)),
            })
          }
          onMultiNodeDrag?.(batchPositions, true)
        } else {
          const finalX = snapCoord(Math.round(endDrag.initX + dx))
          const finalY = snapCoord(Math.round(endDrag.initY + dy))
          onNodeDragEnd?.(node.id, finalX, finalY)
        }
      }
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)
  }

  // Interactive Node Horizontal Resizing (Width only: kéo ra kéo vào chiều ngang)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<{ startX: number; initWidth: number } | null>(null)

  const handleResizePointerDown = (e: React.PointerEvent) => {
    if (readOnly || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()

    setIsResizing(true)
    onDragStateChange?.(true)
    const currentScale = getScale ? Math.max(0.05, getScale()) : Math.max(0.05, scale || 1)
    const currentW = width

    resizeRef.current = {
      startX: e.clientX,
      initWidth: currentW,
    }

    let rafId: number | null = null
    let latestClientX = e.clientX

    const handleResizePointerMove = (moveEvt: PointerEvent) => {
      if (!resizeRef.current) return
      latestClientX = moveEvt.clientX

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null
          const active = resizeRef.current
          if (!active) return
          const dx = (latestClientX - active.startX) / currentScale
          const nextW = Math.max(180, Math.min(700, Math.round(active.initWidth + dx)))
          onNodeResize?.(node.id, nextW, 0)
        })
      }
    }

    const handleResizePointerUp = (upEvt: PointerEvent) => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      window.removeEventListener("pointermove", handleResizePointerMove)
      window.removeEventListener("pointerup", handleResizePointerUp)
      window.removeEventListener("pointercancel", handleResizePointerUp)
      setIsResizing(false)
      onDragStateChange?.(false)
      const endResize = resizeRef.current
      resizeRef.current = null
      if (endResize) {
        const dx = (upEvt.clientX - endResize.startX) / currentScale
        const finalW = Math.max(180, Math.min(700, Math.round(endResize.initWidth + dx)))
        onNodeResizeEnd?.(node.id, finalW, 0)
      }
    }

    window.addEventListener("pointermove", handleResizePointerMove)
    window.addEventListener("pointerup", handleResizePointerUp)
    window.addEventListener("pointercancel", handleResizePointerUp)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelected && selectedNodePositions && selectedNodePositions.size > 1) {
      return
    }
    onCardSelect?.(node.id, e as unknown as React.PointerEvent)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onOpenNodeDetail) {
      onOpenNodeDetail(node)
    } else if (linkedRequest && onOpenDetail) {
      onOpenDetail(linkedRequest)
    } else if (!readOnly && onEditNode) {
      onEditNode(node)
    }
  }


  const highlightClass = isHighlighted
    ? "ring-2 ring-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.6)] border-blue-500"
    : ""

  const wireDropTargetClass = isWireDropTarget
    ? "ring-4 ring-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.8)] scale-[1.03] border-blue-500 z-50 bg-blue-50/40"
    : ""

  const draggingClass = readOnly
    ? "cursor-pointer"
    : isDragging
    ? "shadow-2xl ring-2 ring-blue-400 opacity-95 scale-[1.02] cursor-grabbing z-40"
    : "cursor-grab"

  const selectedClass = isSelected
    ? "ring-3 ring-blue-500 ring-offset-2 ring-offset-white shadow-xl shadow-blue-500/25 border-blue-400 bg-blue-50/15"
    : ""

  const isMotionFast = isDragging || isResizing || isSelected || isAnyDragging
  const transitionClass = isMotionFast
    ? "transition-none"
    : "transition-[box-shadow,border-color,background-color] duration-150"

  return (
    <motion.div
      data-testid={`ia-node-card-${node.id}`}
      data-tier={node.tier}
      data-node-id={node.id}
      data-is-drop-target={isWireDropTarget ? "true" : undefined}
      data-is-selected={isSelected ? "true" : undefined}
      initial={{ opacity: 0, scale: 0.88, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={isMotionFast ? { duration: 0 } : springs.snappy}
      onPointerDown={readOnly ? undefined : handlePointerDown}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height: layoutNode.height,
        minHeight: layoutNode.height,
        zIndex: isDragging || isResizing ? 40 : isWireDropTarget ? 35 : isSelected ? 30 : isHighlighted ? 20 : 10,
        touchAction: "none",
      }}
      className={`group relative rounded-xl border bg-white px-2.5 pt-2 pb-2.5 text-left flex flex-col justify-start ${transitionClass} select-none shadow-[0_2px_8px_-1px_rgba(15,23,42,0.08),0_1px_3px_0_rgba(15,23,42,0.06)] hover:shadow-[0_8px_20px_-2px_rgba(15,23,42,0.12),0_3px_6px_-1px_rgba(15,23,42,0.08)] ${themeStyles.border} ${highlightClass} ${wireDropTargetClass} ${draggingClass} ${selectedClass}`}
      onClick={handleCardClick}
      onDoubleClick={handleDoubleClick}
      {...(isDragging || isResizing ? {} : tactileProps.card)}
    >
      {/* Level Label ngay trên thẻ (không box, không nền) */}
      <div className="absolute -top-5 left-1 flex items-center select-none pointer-events-none max-w-[calc(100%-20px)]">
        <Tooltip
          content={
            (node.tier === 1
              ? "Cấp 1: Nút gốc / Sản phẩm"
              : node.tier === 2
              ? "Cấp 2: Luồng nghiệp vụ chính"
              : node.tier === 3
              ? "Cấp 3: Màn hình chi tiết / Chức năng"
              : node.tier === 4
              ? "Cấp 4: Màn hình & Điểm chạm"
              : "Cấp 5: Thành phần & Chi tiết tương tác") +
            (node.squad?.trim() ? ` • Squad: ${node.squad.trim()}` : "")
          }
          side="top"
        >
          <span
            data-testid={`ia-node-level-badge-${node.id}`}
            className={`text-[11px] font-bold tracking-tight inline-flex items-center gap-1 pointer-events-auto select-none truncate ${
              node.tier === 1
                  ? "text-[#1057FB]"
                  : node.tier === 2
                  ? "text-indigo-600"
                  : node.tier === 3
                  ? "text-emerald-600"
                  : node.tier === 4
                  ? "text-amber-600"
                  : "text-purple-600"
            }`}
          >
            <span>{node.tier === 1 ? "✨ Lv1" : `Lv${node.tier}`}</span>
            {node.squad?.trim() && (
              <span className="font-semibold text-slate-600 truncate max-w-[180px]">
                {` - "${node.squad.trim()}"`}
              </span>
            )}
            {node.tier === 4 && getTouchpointIcon(node.touchpointType)}
          </span>
        </Tooltip>
      </div>

      {/* Selected Indicator Badge */}
      {isSelected && (
        <Tooltip content="Thẻ đang được chọn" side="top">
          <div
            data-testid={`ia-node-selected-badge-${node.id}`}
            className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md ring-2 ring-white z-40 pointer-events-auto animate-in zoom-in-75 duration-150"
          >
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
        </Tooltip>
      )}

      {/* Top Accent Stripe indicating Tier (Clipped cleanly to inner rounded corners) */}
      <div className="absolute inset-0 rounded-[11px] overflow-hidden pointer-events-none">
        <div className={`h-1 w-full ${themeStyles.stripe}`} />
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 4-WAY CONNECTOR PORTS (Top, Bottom, Left, Right)                 */}
      {/* CHỈ HIỂN THỊ KHI ĐƯỢC CHỌN VÀ CHƯA ĐẠT CẤP 5 (Lv5 Capping)        */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {!readOnly && isSelected && node.tier < 5 && (
        <>
          {/* TOP PORT */}
          <div
            data-testid={`ia-port-top-${node.id}`}
            data-port="top"
            className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center justify-center z-30 animate-in fade-in zoom-in-75 duration-150"
          >
            <Tooltip content="Kéo mũi tên nối node hoặc click để thêm node phía trên" side="top">
              <button
                type="button"
                data-port-action="true"
                data-testid={`ia-port-add-top-${node.id}`}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  onPortDragStart?.(node.id, "top", e)
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!onPortDragStart) {
                    onAddChildInDirection?.(node.id, "top")
                  }
                }}
                className={`w-3.5 h-3.5 rounded-full bg-white border-2 shadow-xs flex items-center justify-center text-slate-500 hover:text-blue-600 hover:scale-125 transition-all opacity-100 cursor-crosshair ${themeStyles.portBorder}`}
              >
                <Plus className="w-2.5 h-2.5 stroke-[3]" />
              </button>
            </Tooltip>
          </div>

          {/* BOTTOM PORT */}
          <div
            data-testid={`ia-port-bottom-${node.id}`}
            data-port="bottom"
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center z-30 animate-in fade-in zoom-in-75 duration-150"
          >
            <Tooltip content="Kéo mũi tên nối node hoặc click để thêm node phía dưới" side="bottom">
              <button
                type="button"
                data-port-action="true"
                data-testid={`ia-port-add-bottom-${node.id}`}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  onPortDragStart?.(node.id, "bottom", e)
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!onPortDragStart) {
                    onAddChildInDirection?.(node.id, "bottom")
                  }
                }}
                className={`w-3.5 h-3.5 rounded-full bg-white border-2 shadow-xs flex items-center justify-center text-slate-500 hover:text-blue-600 hover:scale-125 transition-all opacity-100 cursor-crosshair ${themeStyles.portBorder}`}
              >
                <Plus className="w-2.5 h-2.5 stroke-[3]" />
              </button>
            </Tooltip>
          </div>

          {/* LEFT PORT */}
          <div
            data-testid={`ia-port-left-${node.id}`}
            data-port="left"
            className="absolute top-1/2 -left-2 -translate-y-1/2 flex items-center justify-center z-30 animate-in fade-in zoom-in-75 duration-150"
          >
            <Tooltip content="Kéo mũi tên nối node hoặc click để thêm node bên trái" side="left">
              <button
                type="button"
                data-port-action="true"
                data-testid={`ia-port-add-left-${node.id}`}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  onPortDragStart?.(node.id, "left", e)
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!onPortDragStart) {
                    onAddChildInDirection?.(node.id, "left")
                  }
                }}
                className={`w-3.5 h-3.5 rounded-full bg-white border-2 shadow-xs flex items-center justify-center text-slate-500 hover:text-blue-600 hover:scale-125 transition-all opacity-100 cursor-crosshair ${themeStyles.portBorder}`}
              >
                <Plus className="w-2.5 h-2.5 stroke-[3]" />
              </button>
            </Tooltip>
          </div>

          {/* RIGHT PORT */}
          <div
            data-testid={`ia-port-right-${node.id}`}
            data-port="right"
            className="absolute top-1/2 -right-2 -translate-y-1/2 flex items-center justify-center z-30 animate-in fade-in zoom-in-75 duration-150"
          >
            <Tooltip content="Kéo mũi tên nối node hoặc click để thêm node bên phải" side="right">
              <button
                type="button"
                data-port-action="true"
                data-testid={`ia-port-add-right-${node.id}`}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  onPortDragStart?.(node.id, "right", e)
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!onPortDragStart) {
                    onAddChildInDirection?.(node.id, "right")
                  }
                }}
                className={`w-3.5 h-3.5 rounded-full bg-white border-2 shadow-xs flex items-center justify-center text-slate-500 hover:text-blue-600 hover:scale-125 transition-all opacity-100 cursor-crosshair ${themeStyles.portBorder}`}
              >
                <Plus className="w-2.5 h-2.5 stroke-[3]" />
              </button>
            </Tooltip>
          </div>
        </>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* NODE CARD CONTENT (User-Authored First)                          */}
      {/* ───────────────────────────────────────────────────────────────── */}

      {/* Top section: Tên Node (Click để sửa tên trực tiếp) & Mô tả */}
      <div>
        {isInlineEditing && !readOnly ? (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inlineInputRef}
              type="text"
              value={inlineName}
              onChange={(e) => setInlineName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === "Enter") {
                  handleCommitInlineEdit()
                } else if (e.key === "Escape") {
                  handleCancelInlineEdit()
                }
              }}
              onBlur={handleCommitInlineEdit}
              className="w-full text-[15px] font-bold text-slate-900 bg-transparent border-0 outline-none ring-0 focus:ring-0 p-0 m-0 leading-tight tracking-tight cursor-text caret-slate-900"
            />
          </div>
        ) : (
          <Tooltip content={node.name + (readOnly ? "" : " (Click để sửa tên trực tiếp)")} side="top">
            <h4
              className="text-[15px] font-bold text-slate-900 leading-tight tracking-tight line-clamp-2 hover:text-blue-600 cursor-text transition-colors"
              onClick={(e) => {
                if (!readOnly) {
                  e.stopPropagation()
                  setIsInlineEditing(true)
                }
              }}
              onDoubleClick={(e) => {
                if (!readOnly) {
                  e.stopPropagation()
                  setIsInlineEditing(true)
                }
              }}
            >
              {node.name}
            </h4>
          </Tooltip>
        )}
        {/* Bỏ sub ở Lv1: chỉ render description khi node.tier !== 1 */}
        {node.description && node.tier !== 1 && (
          <Tooltip content={node.description} side="top">
            <p
              className="text-[10.5px] text-slate-500 line-clamp-1 mt-0.5 font-normal leading-tight"
            >
              {node.description}
            </p>
          </Tooltip>
        )}
      </div>

      {/* Bottom section: Căn dưới - Sleek progress bar & Footer */}
      <div className="mt-auto pt-0.5 flex flex-col gap-0.5">
        {/* Row 4: Chỉ giữ lại thanh process (được bọc Tooltip hiển thị số liệu khi hover) */}
        {displaySettings.showProgress !== false && (
          <Tooltip content={`Tiến độ thực hiện: ${completedTasksCount}/${totalTasks} (${taskPercent}%)`} side="top">
            <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden my-0.5 cursor-help">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${taskPercent}%`,
                  backgroundColor: themeStyles.accentHex || "#3b82f6",
                }}
              />
            </div>
          </Tooltip>
        )}

        {/* Row 5 & 6: Divider & Footer (Trạng thái có task thực hiện ----- số lượng nhánh con) */}
        <div className="pt-0.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[9.5px]">
        {/* Trạng thái có task thực hiện */}
        <div className="flex items-center">
          {displaySettings.showStatus !== false && (
            hasActiveTask ? (
              <Tooltip
                content={
                  activeTaskCount > 0
                    ? `Đang có ${activeTaskCount} task đang thực hiện - Click để quản lý task`
                    : isRollup
                      ? "Có tính năng nhánh con đang triển khai - Click để quản lý task"
                      : "Tính năng đang có bài toán thiết kế đang triển khai - Click để quản lý task"
                }
                side="top"
              >
                <button
                  type="button"
                  data-testid={`ia-task-status-active-${node.id}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!readOnly && onOpenTaskPicker) {
                      onOpenTaskPicker(node)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>
                    {activeTaskCount > 0 ? (
                      <>
                        Đang làm <span className="font-normal font-sans tabular-nums">{activeTaskCount}</span> task
                      </>
                    ) : (
                      "Đang có task làm"
                    )}
                  </span>
                </button>
              </Tooltip>
            ) : allTasksCompleted ? (
              <Tooltip content="Tất cả các task đã hoàn thành - Click để quản lý task" side="top">
                <button
                  type="button"
                  data-testid={`ia-task-status-done-${node.id}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!readOnly && onOpenTaskPicker) {
                      onOpenTaskPicker(node)
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  <span>Đã hoàn thành</span>
                </button>
              </Tooltip>
            ) : (
              <Tooltip content="Chưa có task - Click để mở bảng chọn bài toán" side="top">
                <button
                  type="button"
                  data-testid={`ia-task-status-idle-${node.id}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!readOnly) {
                      if (onOpenTaskPicker) {
                        onOpenTaskPicker(node)
                      } else if (onEditNode) {
                        onEditNode(node)
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-500 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all border border-slate-200 cursor-pointer group/task-btn"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover/task-btn:bg-blue-500 transition-colors"></span>
                  <span>Không có task</span>
                  <Plus className="w-2.5 h-2.5 text-slate-400 group-hover/task-btn:text-blue-600 transition-colors" />
                </button>
              </Tooltip>
            )
          )}
        </div>

        {/* Số lượng nhánh con */}
        {hasChildren && displaySettings.showBranchCount !== false && (
          <Tooltip content={isCollapsed ? `Mở rộng ${childCount} nhánh con` : "Thu gọn nhánh"} side="top">
            <button
              type="button"
              data-testid={`ia-collapse-toggle-${node.id}`}
              onClick={(e) => {
                e.stopPropagation()
                onToggleCollapse(node.id)
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all cursor-pointer select-none ${
                isCollapsed
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80"
              }`}
            >
              <span>{childCount}</span>
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3 shrink-0" />
              ) : (
                <ChevronDown className="w-3 h-3 shrink-0" />
              )}
            </button>
          </Tooltip>
        )}
        </div>
      </div>

      {/* Interactive Right-Edge Horizontal Resize Handle (Kéo ngang mở rộng / thu hẹp thẻ) */}
      {!readOnly && (
        <Tooltip content="Kéo sang trái / phải để điều chỉnh chiều rộng thẻ" side="right">
          <div
            data-testid={`ia-resize-handle-${node.id}`}
            data-resize-handle="true"
            onPointerDown={handleResizePointerDown}
            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-10 cursor-ew-resize flex items-center justify-center group/resize z-30 select-none opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-1 h-6 rounded-full bg-slate-300 group-hover/resize:bg-blue-500 group-hover/resize:w-1.5 group-hover/resize:h-8 transition-all shadow-xs" />
          </div>
        </Tooltip>
      )}
    </motion.div>
  )
}

export const IATreeNodeCard = memo(IATreeNodeCardComponent)
export default IATreeNodeCard

