import React, { memo, useState, useRef, useMemo } from "react"
import { motion } from "framer-motion"
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Sparkles,
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
  GripHorizontal,
  Tag,
  Users,
  ListTodo,
  Check,
} from "lucide-react"
import { springs, tactileProps } from "@/lib/motion"
import { IANode, IATier, IATouchpointType, IAPortPosition, getTierDefaultDisplaySettings } from "@/types/ia"
import { LayoutNode, computeSubtreeMetrics } from "@/hooks/useIATreeState"
import { UXRequest } from "@/data/mockData"

interface IATreeNodeCardProps {
  layoutNode: LayoutNode
  linkedRequest?: UXRequest
  requestsMap?: Map<string, UXRequest>
  isHighlighted?: boolean
  scale?: number
  onToggleCollapse: (nodeId: string) => void
  onOpenDetail?: (request: UXRequest) => void
  onAddChild: (parentNode: IANode) => void
  onAddChildInDirection?: (parentId: string, direction: IAPortPosition) => void
  onPortDragStart?: (nodeId: string, port: IAPortPosition, e: React.PointerEvent) => void
  isWireDropTarget?: boolean
  onEditNode: (node: IANode) => void
  onDeleteNode: (node: IANode) => void
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
    default:
      return {
        stripe: "bg-amber-500",
        accentHex: "#f59e0b",
        border: "border-slate-200 hover:border-amber-500",
        portBorder: "border-amber-500 text-amber-600 hover:bg-amber-50",
        squadBadgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      }
  }
}

function IATreeNodeCardComponent({
  layoutNode,
  linkedRequest,
  requestsMap,
  isHighlighted = false,
  scale = 1.0,
  onToggleCollapse,
  onOpenDetail,
  onAddChild,
  onAddChildInDirection,
  onPortDragStart,
  isWireDropTarget = false,
  onEditNode,
  onDeleteNode,
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
}: IATreeNodeCardProps) {
  const { node, x, y, width, isCollapsed, hasChildren, childCount } = layoutNode
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null)

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
    return computeSubtreeMetrics(node, requestsMap)
  }, [node, requestsMap])

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
    return directInProgressCount > 0
  }, [node.hasActiveTask, isRollup, subtreeMetrics.hasActiveTask, taskIdsList.length, directInProgressCount])

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

    const currentScale = Math.max(0.1, scale)
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
                x: Math.round(sPos.x + dx),
                y: Math.round(sPos.y + dy),
              })
            }
            onMultiNodeDrag?.(batchPositions, false)
          } else {
            const nextX = Math.round(activeDrag.initX + dx)
            const nextY = Math.round(activeDrag.initY + dy)
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
              x: Math.round(sPos.x + dx),
              y: Math.round(sPos.y + dy),
            })
          }
          onMultiNodeDrag?.(batchPositions, true)
        } else {
          const finalX = Math.round(endDrag.initX + dx)
          const finalY = Math.round(endDrag.initY + dy)
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
    const currentScale = Math.max(0.1, scale)
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
    if (linkedRequest && onOpenDetail) {
      e.stopPropagation()
      onOpenDetail(linkedRequest)
    }
  }

  const handleFigmaClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (effectiveFigmaUrl) {
      window.open(effectiveFigmaUrl, "_blank", "noopener,noreferrer")
    }
  }

  const highlightClass = isHighlighted
    ? "ring-2 ring-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.6)] border-blue-500"
    : ""

  const wireDropTargetClass = isWireDropTarget
    ? "ring-4 ring-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.8)] scale-[1.03] border-blue-500 z-50 bg-blue-50/40"
    : ""

  const draggingClass = readOnly
    ? "cursor-default"
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
      transition={isMotionFast ? { duration: 0 } : springs.snappy}
      onPointerDown={readOnly ? undefined : handlePointerDown}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        minHeight: layoutNode.height,
        zIndex: isDragging || isResizing ? 40 : isWireDropTarget ? 35 : isSelected ? 30 : isHighlighted ? 20 : 10,
        touchAction: "none",
      }}
      className={`group relative rounded-xl border bg-white p-3.5 pt-4 text-left flex flex-col justify-between ${transitionClass} select-none shadow-[0_2px_8px_-1px_rgba(15,23,42,0.08),0_1px_3px_0_rgba(15,23,42,0.06)] hover:shadow-[0_8px_20px_-2px_rgba(15,23,42,0.12),0_3px_6px_-1px_rgba(15,23,42,0.08)] ${themeStyles.border} ${highlightClass} ${wireDropTargetClass} ${draggingClass} ${selectedClass}`}
      onClick={handleCardClick}
      {...(isDragging || isResizing ? {} : tactileProps.card)}
    >
      {/* Selected Indicator Badge */}
      {isSelected && (
        <div
          data-testid={`ia-node-selected-badge-${node.id}`}
          className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md ring-2 ring-white z-40 pointer-events-none animate-in zoom-in-75 duration-150"
          title="Thẻ đang được chọn"
        >
          <Check className="w-3 h-3 stroke-[3]" />
        </div>
      )}

      {/* Top Accent Stripe indicating Tier (Clipped cleanly to inner rounded corners) */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        <div className={`h-1 w-full ${themeStyles.stripe}`} />
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 4-WAY CONNECTOR PORTS (Top, Bottom, Left, Right)                 */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {!readOnly && (
        <>
          {/* TOP PORT */}
          <div
            data-testid={`ia-port-top-${node.id}`}
            data-port="top"
            className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center justify-center z-30"
          >
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
              title="Kéo mũi tên nối node hoặc click để thêm node phía trên"
              className={`w-3.5 h-3.5 rounded-full bg-white border-2 shadow-xs flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-125 transition-all opacity-0 group-hover:opacity-100 cursor-crosshair ${themeStyles.portBorder}`}
            >
              <Plus className="w-2.5 h-2.5 stroke-[3]" />
            </button>
          </div>

          {/* BOTTOM PORT */}
          <div
            data-testid={`ia-port-bottom-${node.id}`}
            data-port="bottom"
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center z-30"
          >
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
              title="Kéo mũi tên nối node hoặc click để thêm node phía dưới"
              className={`w-3.5 h-3.5 rounded-full bg-white border-2 shadow-xs flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-125 transition-all opacity-0 group-hover:opacity-100 cursor-crosshair ${themeStyles.portBorder}`}
            >
              <Plus className="w-2.5 h-2.5 stroke-[3]" />
            </button>
          </div>

          {/* LEFT PORT */}
          <div
            data-testid={`ia-port-left-${node.id}`}
            data-port="left"
            className="absolute top-1/2 -left-2 -translate-y-1/2 flex items-center justify-center z-30"
          >
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
              title="Kéo mũi tên nối node hoặc click để thêm node bên trái"
              className={`w-3.5 h-3.5 rounded-full bg-white border-2 shadow-xs flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-125 transition-all opacity-0 group-hover:opacity-100 cursor-crosshair ${themeStyles.portBorder}`}
            >
              <Plus className="w-2.5 h-2.5 stroke-[3]" />
            </button>
          </div>

          {/* RIGHT PORT */}
          <div
            data-testid={`ia-port-right-${node.id}`}
            data-port="right"
            className="absolute top-1/2 -right-2 -translate-y-1/2 flex items-center justify-center z-30"
          >
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
              title="Kéo mũi tên nối node hoặc click để thêm node bên phải"
              className={`w-3.5 h-3.5 rounded-full bg-white border-2 shadow-xs flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-125 transition-all opacity-0 group-hover:opacity-100 cursor-crosshair ${themeStyles.portBorder}`}
            >
              <Plus className="w-2.5 h-2.5 stroke-[3]" />
            </button>
          </div>
        </>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* NODE CARD CONTENT (User-Authored First)                          */}
      {/* ───────────────────────────────────────────────────────────────── */}

      {/* Row 1: thanh kéo - squad (thay cho phần cấp phân hệ màu đi theo màu đã chọn trong setting) - cụm icon */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {!readOnly && (
            <div
              className="flex items-center text-slate-400 group-hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0"
              title="Kéo di chuyển node"
            >
              <GripHorizontal className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Row 1 header icons & touchpoint */}

          {node.code && (
            <span
              className="text-[10px] font-mono font-bold text-slate-500 tracking-tight shrink-0 truncate max-w-[80px]"
              title={node.code}
            >
              {node.code}
            </span>
          )}

          {node.isCriticalPath && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 shrink-0 shadow-2xs"
              title="Tính năng trọng yếu"
            >
              Critical
            </span>
          )}
        </div>

        {/* Cụm Action Icons - Unified subtle slate buttons like TrackTask */}
        {!readOnly && (
          <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
            {effectiveFigmaUrl && (
              <button
                type="button"
                data-testid={`ia-figma-btn-${node.id}`}
                onClick={handleFigmaClick}
                title="Mở thiết kế Figma"
                className="p-1 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            {node.tier < 4 && (
              <button
                type="button"
                data-testid={`ia-add-child-btn-${node.id}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onAddChild(node)
                }}
                title="Thêm node con"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              data-testid={`ia-edit-node-btn-${node.id}`}
              onClick={(e) => {
                e.stopPropagation()
                onEditNode(node)
              }}
              title="Chỉnh sửa node"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              data-testid={`ia-delete-node-btn-${node.id}`}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteNode(node)
              }}
              title="Xóa node"
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Row 2: Tên */}
      <div className="my-1">
        <h4
          className="text-[13px] font-bold text-slate-900 leading-snug tracking-tight line-clamp-2"
          title={node.name}
        >
          {node.name}
        </h4>
        {node.description && (
          <p
            className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 font-normal leading-relaxed"
            title={node.description}
          >
            {node.description}
          </p>
        )}
      </div>


      {/* Row 4: Dòng 2 là Track task */}
      {displaySettings.showProgress !== false && (
        <div className="flex flex-col gap-1 my-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1 text-slate-600">
              <ListTodo className="w-3.5 h-3.5 text-slate-400" />
              <span>{isRollup ? "Track task tổng hợp" : "Track task"}</span>
            </span>
            <span className="font-mono text-slate-700 text-[10px]">
              {totalTasks > 0 ? (
                <>
                  {completedTasksCount}/{totalTasks} - {taskPercent}%
                  {isRollup && inProgressCount > 0 && (
                    <span className="text-blue-600 font-medium ml-1">({inProgressCount} đang làm)</span>
                  )}
                </>
              ) : (
                `${taskPercent}%`
              )}
            </span>
          </div>
          {/* Sleek Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${taskPercent}%`,
                backgroundColor: themeStyles.accentHex || "#3b82f6",
              }}
            />
          </div>

          {/* Task Chips */}
          {isRollup && taskIdsList.length === 0 ? (
            /* Subtree Rollup summary chips when no direct tasks attached */
            totalTasks > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-1" data-testid={`ia-task-rollup-chips-${node.id}`}>
                {inProgressCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span>{inProgressCount} đang làm</span>
                  </span>
                )}
                {completedTasksCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    <span>{completedTasksCount} hoàn thành</span>
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
                    <span>{pendingCount} chờ làm</span>
                  </span>
                )}
              </div>
            )
          ) : (
            /* Linked Direct Task Chips */
            taskIdsList.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-1" data-testid={`ia-task-list-${node.id}`}>
                {taskIdsList.slice(0, 3).map((tid, idx) => {
                  const req = requestsMap?.get(tid) || (linkedRequest?.request_id === tid ? linkedRequest : undefined)
                  const badgeStyle = getStatusBadgeStyle(req?.status)
                  return (
                    <button
                      key={`task-chip-${node.id}-${tid || idx}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (req && onOpenDetail) onOpenDetail(req)
                      }}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border shadow-2xs transition-all hover:scale-105 cursor-pointer ${badgeStyle}`}
                      title={req ? `${tid}: ${req.title} (${req.status})` : tid}
                    >
                      <span>{tid}</span>
                    </button>
                  )
                })}
                {taskIdsList.length > 3 && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono font-bold"
                    title={taskIdsList.slice(3).join(", ")}
                  >
                    +{taskIdsList.length - 3}
                  </span>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* Row 5: Divider --------------- */}
      <div className="border-t border-slate-100 my-1" />

      {/* Row 6: Trạng thái có task thực hiện ----- số lượng nhánh con */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5 text-[10px]">
        {/* Trạng thái có task thực hiện */}
        <div className="flex items-center">
          {displaySettings.showStatus !== false && (
            hasActiveTask ? (
              <span
                data-testid={`ia-task-status-active-${node.id}`}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                title={isRollup ? "Có tính năng nhánh con đang triển khai" : "Tính năng đang có bài toán thiết kế đang triển khai"}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Đang có task làm</span>
              </span>
            ) : allTasksCompleted ? (
              <span
                data-testid={`ia-task-status-done-${node.id}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-300"
                title="Tất cả các task đã hoàn thành"
              >
                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                <span>Đã hoàn thành</span>
              </span>
            ) : (
              <span
                data-testid={`ia-task-status-idle-${node.id}`}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200"
                title="Hiện chưa có task nào đang làm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <span>Không có task</span>
              </span>
            )
          )}
        </div>

        {/* Số lượng nhánh con */}
        {hasChildren && displaySettings.showBranchCount !== false && (
          <button
            type="button"
            data-testid={`ia-collapse-toggle-${node.id}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleCollapse(node.id)
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer select-none ${
              isCollapsed
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-2xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80"
            }`}
            title={isCollapsed ? `Mở rộng ${childCount} nhánh con` : "Thu gọn nhánh"}
          >
            <span>{childCount}</span>
            {isCollapsed ? (
              <ChevronRight className="w-3 h-3 shrink-0" />
            ) : (
              <ChevronDown className="w-3 h-3 shrink-0" />
            )}
          </button>
        )}
      </div>

      {/* Interactive Right-Edge Horizontal Resize Handle (Kéo ngang mở rộng / thu hẹp thẻ) */}
      {!readOnly && (
        <div
          data-testid={`ia-resize-handle-${node.id}`}
          data-resize-handle="true"
          onPointerDown={handleResizePointerDown}
          title="Kéo sang trái / phải để điều chỉnh chiều rộng thẻ"
          className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-10 cursor-ew-resize flex items-center justify-center group/resize z-30 select-none opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="w-1 h-6 rounded-full bg-slate-300 group-hover/resize:bg-blue-500 group-hover/resize:w-1.5 group-hover/resize:h-8 transition-all shadow-xs" />
        </div>
      )}
    </motion.div>
  )
}

export const IATreeNodeCard = memo(IATreeNodeCardComponent)
export default IATreeNodeCard

