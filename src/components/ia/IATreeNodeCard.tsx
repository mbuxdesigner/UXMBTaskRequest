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
} from "lucide-react"
import { springs, tactileProps } from "@/lib/motion"
import { IANode, IATier, IATouchpointType, IAPortPosition } from "@/types/ia"
import { LayoutNode } from "@/hooks/useIATreeState"
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
  onNodeResize?: (nodeId: string, width: number, height: number, persist?: boolean) => void
  onNodeResizeEnd?: (nodeId: string, width: number, height: number, persist?: boolean) => void
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
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "Đang thực hiện":
    case "UI Design":
    case "Discovery":
    case "User Flow":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "PO pending":
    case "Bị chặn":
      return "bg-rose-50 text-rose-700 border-rose-200"
    case "Đã gửi PO":
    case "Chờ tiếp nhận":
      return "bg-amber-50 text-amber-700 border-amber-200"
    default:
      return "bg-slate-50 text-slate-700 border-slate-200"
  }
}

function getTierThemeStyles(tier: IATier, customTheme?: string) {
  // If user selected an explicit custom theme
  if (customTheme && customTheme !== "blue") {
    switch (customTheme) {
      case "emerald":
        return {
          cardBg: "bg-gradient-to-b from-emerald-50/70 via-emerald-50/20 to-white",
          border: "border-emerald-200/90 hover:border-emerald-400 shadow-xs shadow-emerald-500/5",
          portBorder: "border-emerald-500 hover:bg-emerald-50",
          tierBadge: "bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200/80",
          tierText: tier === 1 ? "Cấp 1 · Sản phẩm" : tier === 2 ? "Cấp 2 · Phân hệ" : tier === 3 ? "Cấp 3 · Luồng" : "Cấp 4 · Màn hình",
          accent: "bg-emerald-50 text-emerald-700 border-emerald-200",
        }
      case "purple":
      case "violet":
        return {
          cardBg: "bg-gradient-to-b from-purple-50/70 via-purple-50/20 to-white",
          border: "border-purple-200/90 hover:border-purple-400 shadow-xs shadow-purple-500/5",
          portBorder: "border-purple-500 hover:bg-purple-50",
          tierBadge: "bg-purple-100 text-purple-800 font-semibold border border-purple-200/80",
          tierText: tier === 1 ? "Cấp 1 · Sản phẩm" : tier === 2 ? "Cấp 2 · Phân hệ" : tier === 3 ? "Cấp 3 · Luồng" : "Cấp 4 · Màn hình",
          accent: "bg-purple-50 text-purple-700 border-purple-200",
        }
      case "amber":
        return {
          cardBg: "bg-gradient-to-b from-amber-50/70 via-amber-50/20 to-white",
          border: "border-amber-200/90 hover:border-amber-400 shadow-xs shadow-amber-500/5",
          portBorder: "border-amber-500 hover:bg-amber-50",
          tierBadge: "bg-amber-100 text-amber-800 font-semibold border border-amber-200/80",
          tierText: tier === 1 ? "Cấp 1 · Sản phẩm" : tier === 2 ? "Cấp 2 · Phân hệ" : tier === 3 ? "Cấp 3 · Luồng" : "Cấp 4 · Màn hình",
          accent: "bg-amber-50 text-amber-700 border-amber-200",
        }
      case "rose":
        return {
          cardBg: "bg-gradient-to-b from-rose-50/70 via-rose-50/20 to-white",
          border: "border-rose-200/90 hover:border-rose-400 shadow-xs shadow-rose-500/5",
          portBorder: "border-rose-500 hover:bg-rose-50",
          tierBadge: "bg-rose-100 text-rose-800 font-semibold border border-rose-200/80",
          tierText: tier === 1 ? "Cấp 1 · Sản phẩm" : tier === 2 ? "Cấp 2 · Phân hệ" : tier === 3 ? "Cấp 3 · Luồng" : "Cấp 4 · Màn hình",
          accent: "bg-rose-50 text-rose-700 border-rose-200",
        }
      case "cyan":
        return {
          cardBg: "bg-gradient-to-b from-cyan-50/70 via-cyan-50/20 to-white",
          border: "border-cyan-200/90 hover:border-cyan-400 shadow-xs shadow-cyan-500/5",
          portBorder: "border-cyan-500 hover:bg-cyan-50",
          tierBadge: "bg-cyan-100 text-cyan-800 font-semibold border border-cyan-200/80",
          tierText: tier === 1 ? "Cấp 1 · Sản phẩm" : tier === 2 ? "Cấp 2 · Phân hệ" : tier === 3 ? "Cấp 3 · Luồng" : "Cấp 4 · Màn hình",
          accent: "bg-cyan-50 text-cyan-700 border-cyan-200",
        }
    }
  }

  // Chia màu mặc định theo Level (Lv 1, Lv 2, Lv 3, Lv 4) chuẩn nhận diện MBBank
  switch (tier) {
    case 1:
      return {
        cardBg: "bg-gradient-to-b from-blue-50/80 via-blue-50/25 to-white",
        border: "border-blue-300 hover:border-blue-500 shadow-xs shadow-blue-500/10",
        portBorder: "border-blue-600 text-blue-600 hover:bg-blue-50 hover:border-blue-700",
        tierBadge: "bg-blue-600 text-white font-bold shadow-xs",
        tierText: "Cấp 1 · Sản phẩm",
        accent: "bg-blue-50 text-blue-700 border-blue-200",
      }
    case 2:
      return {
        cardBg: "bg-gradient-to-b from-indigo-50/70 via-indigo-50/20 to-white",
        border: "border-indigo-200 hover:border-indigo-400 shadow-xs shadow-indigo-500/5",
        portBorder: "border-indigo-500 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-700",
        tierBadge: "bg-indigo-100 text-indigo-800 font-semibold border border-indigo-200/80",
        tierText: "Cấp 2 · Phân hệ",
        accent: "bg-indigo-50 text-indigo-700 border-indigo-200",
      }
    case 3:
      return {
        cardBg: "bg-gradient-to-b from-emerald-50/70 via-emerald-50/20 to-white",
        border: "border-emerald-200 hover:border-emerald-400 shadow-xs shadow-emerald-500/5",
        portBorder: "border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-700",
        tierBadge: "bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200/80",
        tierText: "Cấp 3 · Luồng",
        accent: "bg-emerald-50 text-emerald-700 border-emerald-200",
      }
    case 4:
    default:
      return {
        cardBg: "bg-gradient-to-b from-amber-50/70 via-amber-50/20 to-white",
        border: "border-amber-200 hover:border-amber-400 shadow-xs shadow-amber-500/5",
        portBorder: "border-amber-500 text-amber-600 hover:bg-amber-50 hover:border-amber-700",
        tierBadge: "bg-amber-100 text-amber-800 font-semibold border border-amber-200/80",
        tierText: "Cấp 4 · Màn hình",
        accent: "bg-amber-50 text-amber-700 border-amber-200",
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
  onNodeResize,
  onNodeResizeEnd,
}: IATreeNodeCardProps) {
  const { node, x, y, width, isCollapsed, hasChildren, childCount } = layoutNode
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null)

  // Resolve all linked tasks (from node.taskIds or node.requestId)
  const taskIdsList = useMemo(() => {
    const list: string[] = []
    if (node.taskIds && node.taskIds.length > 0) {
      node.taskIds.forEach((id) => {
        if (id && !list.includes(id)) list.push(id)
      })
    }
    if (node.requestId && !list.includes(node.requestId)) {
      list.push(node.requestId)
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

  // Determine "Trạng thái có task đang làm hay không"
  const hasActiveTask = useMemo(() => {
    if (node.hasActiveTask !== undefined) {
      return node.hasActiveTask
    }
    if (taskIdsList.length === 0) return false
    return linkedRequests.some((r) => {
      const s = (r.status || "").toLowerCase()
      return (
        s.includes("thực hiện") ||
        s.includes("đang làm") ||
        s.includes("review") ||
        s.includes("tiến hành") ||
        (r.progress > 0 && r.progress < 100)
      )
    })
  }, [node.hasActiveTask, taskIdsList, linkedRequests])

  const allTasksCompleted = useMemo(() => {
    if (taskIdsList.length === 0) return false
    if (hasActiveTask) return false
    return linkedRequests.every((r) => {
      const s = (r.status || "").toLowerCase()
      return s.includes("hoàn thành") || s.includes("nghiệm thu") || s.includes("release") || r.progress === 100
    })
  }, [taskIdsList, hasActiveTask, linkedRequests])

  const effectiveFigmaUrl = node.figmaUrl || linkedRequest?.deliverables?.figma_url || linkedRequest?.deliverables?.prototype_url
  const effectiveDesigner = node.assignedDesigner || linkedRequest?.assigned_designer
  const effectiveStatus = node.status || linkedRequest?.status
  const effectiveProgress = node.progress ?? linkedRequest?.progress

  const themeStyles = getTierThemeStyles(node.tier, node.colorTheme)

  // Drag and drop arranger logic
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    // Ignore clicks on buttons, inputs, links, connection ports, or resize handle
    if (target.closest("button, a, input, textarea, [data-port-action], [data-resize-handle]")) {
      return
    }

    e.stopPropagation()
    setIsDragging(true)
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

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!dragRef.current) return
      latestClientX = moveEvt.clientX
      latestClientY = moveEvt.clientY

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null
          const activeDrag = dragRef.current
          if (!activeDrag) return
          const dx = (latestClientX - activeDrag.startX) / currentScale
          const dy = (latestClientY - activeDrag.startY) / currentScale
          const nextX = Math.round(activeDrag.initX + dx)
          const nextY = Math.round(activeDrag.initY + dy)
          onNodeDrag?.(node.id, nextX, nextY)
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
      const endDrag = dragRef.current
      dragRef.current = null
      if (endDrag) {
        const dx = (upEvt.clientX - endDrag.startX) / currentScale
        const dy = (upEvt.clientY - endDrag.startY) / currentScale
        const finalX = Math.round(endDrag.initX + dx)
        const finalY = Math.round(endDrag.initY + dy)
        onNodeDragEnd?.(node.id, finalX, finalY)
      }
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)
  }

  // Interactive Node Resizing (Bottom-Right corner drag)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<{ startX: number; startY: number; initWidth: number; initHeight: number } | null>(null)

  const handleResizePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()

    setIsResizing(true)
    const currentScale = Math.max(0.1, scale)
    const currentW = width
    const currentH = layoutNode.height

    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initWidth: currentW,
      initHeight: currentH,
    }

    let rafId: number | null = null
    let latestClientX = e.clientX
    let latestClientY = e.clientY

    const handleResizePointerMove = (moveEvt: PointerEvent) => {
      if (!resizeRef.current) return
      latestClientX = moveEvt.clientX
      latestClientY = moveEvt.clientY

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null
          const active = resizeRef.current
          if (!active) return
          const dx = (latestClientX - active.startX) / currentScale
          const dy = (latestClientY - active.startY) / currentScale
          const nextW = Math.max(180, Math.min(650, Math.round(active.initWidth + dx)))
          const nextH = Math.max(90, Math.min(550, Math.round(active.initHeight + dy)))
          onNodeResize?.(node.id, nextW, nextH)
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
      const endResize = resizeRef.current
      resizeRef.current = null
      if (endResize) {
        const dx = (upEvt.clientX - endResize.startX) / currentScale
        const dy = (upEvt.clientY - endResize.startY) / currentScale
        const finalW = Math.max(180, Math.min(650, Math.round(endResize.initWidth + dx)))
        const finalH = Math.max(90, Math.min(550, Math.round(endResize.initHeight + dy)))
        onNodeResizeEnd?.(node.id, finalW, finalH)
      }
    }

    window.addEventListener("pointermove", handleResizePointerMove)
    window.addEventListener("pointerup", handleResizePointerUp)
    window.addEventListener("pointercancel", handleResizePointerUp)
  }

  const handleCardClick = (e: React.MouseEvent) => {
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

  // Tier Theme Styling (Level 1: Blue, Level 2: Indigo, Level 3: Emerald, Level 4: Amber)
  const tierBadgeText = themeStyles.tierText
  const tierBadgeClass = themeStyles.tierBadge

  const highlightClass = isHighlighted
    ? "ring-2 ring-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.6)] border-blue-500"
    : ""

  const wireDropTargetClass = isWireDropTarget
    ? "ring-4 ring-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.8)] scale-[1.03] border-blue-500 z-50 bg-blue-50/40"
    : ""

  const draggingClass = isDragging
    ? "shadow-2xl ring-2 ring-blue-400 opacity-95 scale-[1.02] cursor-grabbing z-40"
    : "cursor-grab"

  const transitionClass = isDragging || isResizing ? "transition-none" : "transition-all duration-150"

  return (
    <motion.div
      data-testid={`ia-node-card-${node.id}`}
      data-tier={node.tier}
      data-node-id={node.id}
      data-is-drop-target={isWireDropTarget ? "true" : undefined}
      layoutId={isDragging || isResizing ? undefined : `ia-card-motion-${node.id}`}
      transition={isDragging || isResizing ? { duration: 0 } : springs.snappy}
      onPointerDown={handlePointerDown}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        minHeight: layoutNode.height,
        height: node.customHeight ? layoutNode.height : undefined,
        zIndex: isDragging || isResizing ? 40 : isWireDropTarget ? 35 : isHighlighted ? 20 : 10,
        touchAction: "none",
      }}
      className={`group relative rounded-xl border p-3 text-left flex flex-col justify-between ${transitionClass} select-none ${themeStyles.cardBg} ${themeStyles.border} ${highlightClass} ${wireDropTargetClass} ${draggingClass}`}
      onClick={handleCardClick}
      {...(isDragging || isResizing ? {} : tactileProps.card)}
    >
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 4-WAY CONNECTOR PORTS (Top, Bottom, Left, Right)                 */}
      {/* ───────────────────────────────────────────────────────────────── */}

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

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* NODE CARD CONTENT (User-Authored First)                          */}
      {/* ───────────────────────────────────────────────────────────────── */}

      {/* Top Header Row: Drag Handle, Tier Badge, Action Menu */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <GripHorizontal className="w-3 h-3 text-slate-300 group-hover:text-slate-500 shrink-0" />
          <span className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${tierBadgeClass}`}>
            {tierBadgeText}
          </span>
          {node.code && (
            <span className="text-[10px] font-mono text-slate-400 truncate max-w-[80px]" title={node.code}>
              {node.code}
            </span>
          )}
        </div>

        {/* Action Controls: Add Child (+), Edit (pencil), Delete (trash) */}
        <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
          {node.tier < 4 && (
            <button
              type="button"
              data-testid={`ia-add-child-btn-${node.id}`}
              onClick={(e) => {
                e.stopPropagation()
                onAddChild(node)
              }}
              title="Thêm node con"
              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
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
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Pencil className="w-3 h-3" />
          </button>

          {node.tier > 1 ? (
            <button
              type="button"
              data-testid={`ia-delete-node-btn-${node.id}`}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteNode(node)
              }}
              title="Xóa node"
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          ) : (
            <span title="Không thể xóa node gốc sản phẩm" className="p-1 text-slate-300">
              <Lock className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>

      {/* Tên Tính Năng (Feature Name) & Squad & Mô tả */}
      <div className="mb-2">
        {node.squad && (
          <div className="mb-1.5 flex items-center">
            <span
              data-testid={`ia-node-squad-${node.id}`}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/70 font-semibold truncate max-w-full"
              title={`Squad phụ trách: ${node.squad}`}
            >
              <Users className="w-3 h-3 shrink-0 text-indigo-500" />
              <span className="truncate">{node.squad}</span>
            </span>
          </div>
        )}
        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug" title={node.name}>
          {node.name}
        </h4>
        {node.description && (
          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal" title={node.description}>
            {node.description}
          </p>
        )}
      </div>

      {/* Middle Row: Trạng thái có task đang làm & Danh sách Task & Badges */}
      <div className="flex flex-col gap-1.5 mb-2">
        {/* Trạng thái task */}
        <div className="flex flex-wrap items-center gap-1.5">
          {hasActiveTask ? (
            <span
              data-testid={`ia-task-status-active-${node.id}`}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs"
              title="Tính năng đang có bài toán thiết kế đang triển khai"
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
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60"
              title="Tất cả các task đã hoàn thành"
            >
              <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
              <span>Đã hoàn thành</span>
            </span>
          ) : (
            <span
              data-testid={`ia-task-status-idle-${node.id}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-normal text-slate-400 bg-slate-50 border border-slate-200/60"
              title="Hiện chưa có task nào đang làm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span>Không có task làm</span>
            </span>
          )}

          {node.isCriticalPath && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700">
              <Sparkles className="w-2.5 h-2.5 text-amber-600" />
              Trọng yếu
            </span>
          )}

          {node.tier === 4 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-600">
              {getTouchpointIcon(node.touchpointType)}
              <span className="capitalize">{node.touchpointType || "Screen"}</span>
            </span>
          )}
        </div>

        {/* Danh sách Task liên kết */}
        {taskIdsList.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-0.5" data-testid={`ia-task-list-${node.id}`}>
            {taskIdsList.slice(0, 2).map((tid) => {
              const req = requestsMap?.get(tid) || (linkedRequest?.request_id === tid ? linkedRequest : undefined)
              const badgeStyle = getStatusBadgeStyle(req?.status)
              return (
                <button
                  key={tid}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (req && onOpenDetail) onOpenDetail(req)
                  }}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-medium border transition-colors cursor-pointer ${badgeStyle}`}
                  title={req ? `${tid}: ${req.title} (${req.status})` : tid}
                >
                  <span>{tid}</span>
                </button>
              )
            })}
            {taskIdsList.length > 2 && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono font-medium"
                title={taskIdsList.slice(2).join(", ")}
              >
                +{taskIdsList.length - 2} task
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Row: Figma Link, Designer avatar, and Expand/Collapse */}
      <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-100 text-[10px]">
        {/* Left: Designer Avatar & Figma Button */}
        <div className="flex items-center gap-1.5">
          {effectiveDesigner && (
            <div
              className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px] shrink-0"
              title={`Phụ trách: ${effectiveDesigner}`}
            >
              {effectiveDesigner.charAt(0).toUpperCase()}
            </div>
          )}

          {effectiveFigmaUrl && (
            <button
              type="button"
              data-testid={`ia-figma-btn-${node.id}`}
              onClick={handleFigmaClick}
              title="Mở thiết kế Figma"
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-medium transition-colors cursor-pointer"
            >
              <span>Figma</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          )}

          {effectiveProgress !== undefined && (
            <span className="text-[10px] font-medium text-slate-500 font-mono">
              {effectiveProgress}%
            </span>
          )}
        </div>

        {/* Right: Expand/Collapse Pill for Nodes with Children */}
        {hasChildren && (
          <button
            type="button"
            data-testid={`ia-collapse-toggle-${node.id}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleCollapse(node.id)
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer select-none ${
              isCollapsed
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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

      {/* Interactive Bottom-Right Corner Resize Handle */}
      <div
        data-testid={`ia-resize-handle-${node.id}`}
        data-resize-handle="true"
        onPointerDown={handleResizePointerDown}
        title="Kéo dãn kích thước node"
        className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 z-30 select-none"
      >
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          className="w-3 h-3 rotate-0 pointer-events-none"
        >
          <circle cx="13" cy="13" r="1.5" />
          <circle cx="13" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
          <circle cx="13" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" />
        </svg>
      </div>
    </motion.div>
  )
}

export const IATreeNodeCard = memo(IATreeNodeCardComponent)
export default IATreeNodeCard

