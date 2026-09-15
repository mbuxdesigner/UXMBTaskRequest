import React, { memo, useState, useRef } from "react"
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
} from "lucide-react"
import { springs, tactileProps } from "@/lib/motion"
import { IANode, IATier, IATouchpointType, IAPortPosition } from "@/types/ia"
import { LayoutNode } from "@/hooks/useIATreeState"
import { UXRequest } from "@/data/mockData"

interface IATreeNodeCardProps {
  layoutNode: LayoutNode
  linkedRequest?: UXRequest
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

function getColorThemeStyles(theme?: string) {
  switch (theme) {
    case "emerald":
      return {
        border: "border-emerald-200 hover:border-emerald-400",
        accent: "bg-emerald-50 text-emerald-700 border-emerald-200",
        portBorder: "border-emerald-500 hover:bg-emerald-50",
      }
    case "purple":
      return {
        border: "border-purple-200 hover:border-purple-400",
        accent: "bg-purple-50 text-purple-700 border-purple-200",
        portBorder: "border-purple-500 hover:bg-purple-50",
      }
    case "amber":
      return {
        border: "border-amber-200 hover:border-amber-400",
        accent: "bg-amber-50 text-amber-700 border-amber-200",
        portBorder: "border-amber-500 hover:bg-amber-50",
      }
    case "rose":
      return {
        border: "border-rose-200 hover:border-rose-400",
        accent: "bg-rose-50 text-rose-700 border-rose-200",
        portBorder: "border-rose-500 hover:bg-rose-50",
      }
    case "cyan":
      return {
        border: "border-cyan-200 hover:border-cyan-400",
        accent: "bg-cyan-50 text-cyan-700 border-cyan-200",
        portBorder: "border-cyan-500 hover:bg-cyan-50",
      }
    case "blue":
    default:
      return {
        border: "border-slate-200 hover:border-blue-400",
        accent: "bg-blue-50 text-blue-700 border-blue-200",
        portBorder: "border-blue-500 hover:bg-blue-50",
      }
  }
}

function IATreeNodeCardComponent({
  layoutNode,
  linkedRequest,
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
}: IATreeNodeCardProps) {
  const { node, x, y, width, isCollapsed, hasChildren, childCount } = layoutNode
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null)

  const effectiveFigmaUrl = node.figmaUrl || linkedRequest?.deliverables?.figma_url || linkedRequest?.deliverables?.prototype_url
  const effectiveDesigner = node.assignedDesigner || linkedRequest?.assigned_designer
  const effectiveStatus = node.status || linkedRequest?.status
  const effectiveProgress = node.progress ?? linkedRequest?.progress

  const themeStyles = getColorThemeStyles(node.colorTheme)

  // Drag and drop arranger logic
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    // Ignore clicks on buttons, inputs, links, or connection port add actions
    if (target.closest("button, a, input, textarea, [data-port-action]")) {
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

  // Tier Theme Styling
  let tierBadgeText = "Cấp 4"
  let tierBadgeClass = "bg-slate-100 text-slate-600"

  if (node.tier === 1) {
    tierBadgeText = "Cấp 1 · Sản phẩm"
    tierBadgeClass = "bg-blue-600 text-white font-bold"
  } else if (node.tier === 2) {
    tierBadgeText = "Cấp 2 · Phân hệ"
    tierBadgeClass = "bg-slate-100 text-slate-700 font-semibold"
  } else if (node.tier === 3) {
    tierBadgeText = "Cấp 3 · Luồng"
    tierBadgeClass = "bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/50"
  } else if (node.tier === 4) {
    tierBadgeText = "Cấp 4 · Màn hình"
    tierBadgeClass = "bg-amber-50 text-amber-700 font-semibold border border-amber-200/50"
  }

  const highlightClass = isHighlighted
    ? "ring-2 ring-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.6)] border-blue-500"
    : ""

  const wireDropTargetClass = isWireDropTarget
    ? "ring-4 ring-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.8)] scale-[1.03] border-blue-500 z-50 bg-blue-50/40"
    : ""

  const draggingClass = isDragging
    ? "shadow-2xl ring-2 ring-blue-400 opacity-95 scale-[1.02] cursor-grabbing z-40"
    : "cursor-grab"

  const transitionClass = isDragging ? "transition-none" : "transition-all duration-150"

  return (
    <motion.div
      data-testid={`ia-node-card-${node.id}`}
      data-tier={node.tier}
      data-node-id={node.id}
      data-is-drop-target={isWireDropTarget ? "true" : undefined}
      layoutId={isDragging ? undefined : `ia-card-motion-${node.id}`}
      transition={isDragging ? { duration: 0 } : springs.snappy}
      onPointerDown={handlePointerDown}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        minHeight: layoutNode.height,
        zIndex: isDragging ? 40 : isWireDropTarget ? 35 : isHighlighted ? 20 : 10,
        touchAction: "none",
      }}
      className={`group relative rounded-xl border bg-white p-3 text-left ${transitionClass} select-none ${themeStyles.border} ${highlightClass} ${wireDropTargetClass} ${draggingClass}`}
      onClick={handleCardClick}
      {...(isDragging ? {} : tactileProps.card)}
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

      {/* Top Header Row: Drag Handle, Tier Badge, Tag, Action Menu */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <GripHorizontal className="w-3 h-3 text-slate-300 group-hover:text-slate-500 shrink-0" />
          <span className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${tierBadgeClass}`}>
            {tierBadgeText}
          </span>
          {node.customTag && (
            <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium truncate max-w-[90px]" title={node.customTag}>
              <Tag className="w-2 h-2" />
              {node.customTag}
            </span>
          )}
          {node.code && !node.customTag && (
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

      {/* User-Authored Node Title & Description */}
      <div className="mb-2">
        <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug" title={node.name}>
          {node.name}
        </h4>
        {node.description && (
          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal" title={node.description}>
            {node.description}
          </p>
        )}
      </div>

      {/* Middle Row: Touchpoint type, Critical Path, Optional Task badge */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {node.tier === 4 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-600">
            {getTouchpointIcon(node.touchpointType)}
            <span className="capitalize">{node.touchpointType || "Screen"}</span>
          </span>
        )}

        {node.isCriticalPath && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700">
            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
            Trọng yếu
          </span>
        )}

        {/* Optional Task ID Badge */}
        {node.requestId && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium border ${getStatusBadgeStyle(
              effectiveStatus
            )}`}
            title={`Bài toán thiết kế liên kết: ${node.requestId}`}
          >
            {node.requestId}
          </span>
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
    </motion.div>
  )
}

export const IATreeNodeCard = memo(IATreeNodeCardComponent)
export default IATreeNodeCard

