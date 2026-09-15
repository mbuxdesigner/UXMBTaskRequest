import React, { memo } from "react"
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
} from "lucide-react"
import { springs, tactileProps } from "@/lib/motion"
import { IANode, IATier, IATouchpointType } from "@/types/ia"
import { LayoutNode } from "@/hooks/useIATreeState"
import { UXRequest } from "@/data/mockData"

interface IATreeNodeCardProps {
  layoutNode: LayoutNode
  linkedRequest?: UXRequest
  isHighlighted?: boolean
  onToggleCollapse: (nodeId: string) => void
  onOpenDetail?: (request: UXRequest) => void
  onAddChild: (parentNode: IANode) => void
  onEditNode: (node: IANode) => void
  onDeleteNode: (node: IANode) => void
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

function IATreeNodeCardComponent({
  layoutNode,
  linkedRequest,
  isHighlighted = false,
  onToggleCollapse,
  onOpenDetail,
  onAddChild,
  onEditNode,
  onDeleteNode,
}: IATreeNodeCardProps) {
  const { node, x, y, width, isCollapsed, isExpanded, hasChildren, childCount } = layoutNode

  const effectiveFigmaUrl = node.figmaUrl || linkedRequest?.deliverables?.figma_url || linkedRequest?.deliverables?.prototype_url
  const effectiveDesigner = node.assignedDesigner || linkedRequest?.assigned_designer
  const effectiveStatus = node.status || linkedRequest?.status
  const effectiveProgress = node.progress ?? linkedRequest?.progress

  const handleCardClick = (e: React.MouseEvent) => {
    // If card has linked task, open request detail drawer
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

  // Tier Theme Border & Accent Styling
  let tierBorderClass = "border-slate-200 hover:border-slate-300"
  let tierBgClass = "bg-white"
  let tierBadgeText = "Cấp 4"
  let tierBadgeClass = "bg-slate-100 text-slate-600"

  if (node.tier === 1) {
    tierBorderClass = "border-blue-400/80 shadow-md shadow-blue-500/10"
    tierBgClass = "bg-gradient-to-br from-white via-blue-50/20 to-white"
    tierBadgeText = "Cấp 1 · Sản phẩm"
    tierBadgeClass = "bg-blue-600 text-white font-bold"
  } else if (node.tier === 2) {
    tierBorderClass = "border-slate-200 hover:border-blue-300 shadow-xs"
    tierBgClass = "bg-white"
    tierBadgeText = "Cấp 2 · Phân hệ"
    tierBadgeClass = "bg-slate-100 text-slate-700 font-semibold"
  } else if (node.tier === 3) {
    tierBorderClass = "border-slate-200 hover:border-emerald-300 shadow-xs"
    tierBgClass = "bg-white"
    tierBadgeText = "Cấp 3 · Luồng"
    tierBadgeClass = "bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/50"
  } else if (node.tier === 4) {
    tierBorderClass = "border-slate-200 hover:border-amber-300 shadow-2xs"
    tierBgClass = "bg-slate-50/70"
    tierBadgeText = "Cấp 4 · Màn hình"
    tierBadgeClass = "bg-amber-50 text-amber-700 font-semibold border border-amber-200/50"
  }

  const highlightClass = isHighlighted
    ? "ring-2 ring-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.6)] border-blue-500"
    : ""

  return (
    <motion.div
      data-testid={`ia-node-card-${node.id}`}
      data-tier={node.tier}
      layoutId={`ia-card-motion-${node.id}`}
      transition={springs.snappy}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        zIndex: isHighlighted ? 20 : 10,
      }}
      className={`group rounded-xl border p-3 text-left transition-shadow duration-200 cursor-default select-none ${tierBgClass} ${tierBorderClass} ${highlightClass}`}
      onClick={handleCardClick}
      {...tactileProps.card}
    >
      {/* Top Header Row: Tier Badge, Code, and Action Menu */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${tierBadgeClass}`}>
            {tierBadgeText}
          </span>
          {node.code && (
            <span className="text-[10px] font-mono text-slate-400 truncate max-w-[100px]" title={node.code}>
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

      {/* Node Title & Description */}
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

      {/* Middle Row: Badges, Touchpoint Type, Critical Path */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {node.tier === 4 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-medium text-slate-600">
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

        {/* Linked Task ID Badge */}
        {node.requestId && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium border ${getStatusBadgeStyle(
              effectiveStatus
            )}`}
            title={`Bài toán thiết kế: ${node.requestId}`}
          >
            {node.requestId}
          </span>
        )}
      </div>

      {/* Bottom Row: Linked Task Details & Expand/Collapse Toggle */}
      <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-100 text-[10px]">
        {/* Left: Designer Avatar & Figma Button */}
        <div className="flex items-center gap-1.5">
          {effectiveDesigner && (
            <div
              className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px] shrink-0"
              title={`Designer phụ trách: ${effectiveDesigner}`}
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

          {/* Progress Bar if present */}
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
