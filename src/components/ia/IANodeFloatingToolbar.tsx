import React from "react"
import { motion } from "framer-motion"
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Maximize2,
  Sparkles,
  Eye,
  CheckSquare,
} from "lucide-react"
import { IANode } from "@/types/ia"
import { UXRequest } from "@/data/mockData"
import { springs, tactileProps } from "@/lib/motion"
import { toast } from "@/components/ui/toast"
import { Tooltip } from "@/components/ui/tooltip"

interface IANodeFloatingToolbarProps {
  node: IANode
  x: number
  y: number
  nodeWidth: number
  scale: number
  onAddChild: (node: IANode) => void
  onEditNode: (node: IANode) => void
  onDeleteNode: (node: IANode) => void
  onCenterNode?: (node: IANode) => void
  onViewDetail?: (node: IANode) => void
  onOpenTask?: (request: UXRequest) => void
  linkedRequest?: UXRequest
  readOnly?: boolean
}

export default function IANodeFloatingToolbar({
  node,
  x,
  y,
  nodeWidth,
  scale,
  onAddChild,
  onEditNode,
  onDeleteNode,
  onCenterNode,
  onViewDetail,
  onOpenTask,
  linkedRequest,
  readOnly = false,
}: IANodeFloatingToolbarProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(node.id)
    setCopied(true)
    toast.success(`Đã sao chép ID: ${node.id}`)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFigma = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.figmaUrl) {
      window.open(node.figmaUrl, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <div
      data-testid={`ia-floating-toolbar-${node.id}`}
      style={{
        position: "absolute",
        left: x + nodeWidth / 2,
        top: y - 52,
        transform: "translateX(-50%)",
        zIndex: 60,
      }}
      className="pointer-events-auto select-none"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.92 }}
        transition={springs.snappy}
        className="flex items-center justify-center gap-1 p-1 bg-slate-900/95 text-white backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl"
      >
      {/* Xem chi tiết Node (Luôn khả dụng cho cả View và Edit) */}
      <Tooltip content="Xem chi tiết node" side="top">
        <motion.button
          type="button"
          data-testid={`ia-float-view-${node.id}`}
          onClick={(e) => {
            e.stopPropagation()
            onViewDetail?.(node)
          }}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer shadow-xs"
          {...tactileProps.button}
        >
          <Eye className="w-4 h-4" />
        </motion.button>
      </Tooltip>

      {/* Xem bài toán liên kết (nếu có) */}
      {linkedRequest && onOpenTask && (
        <Tooltip content={`Xem bài toán: ${linkedRequest.title}`} side="top">
          <motion.button
            type="button"
            data-testid={`ia-float-task-${node.id}`}
            onClick={(e) => {
              e.stopPropagation()
              onOpenTask(linkedRequest)
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-blue-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            {...tactileProps.button}
          >
            <CheckSquare className="w-4 h-4" />
          </motion.button>
        </Tooltip>
      )}

      {/* Add Child (Tier 1-3) - Chỉ khi có quyền Edit */}
      {!readOnly && node.tier < 4 && (
        <Tooltip content="Thêm node con" shortcut="Tab" side="top">
          <motion.button
            type="button"
            data-testid={`ia-float-add-${node.id}`}
            onClick={(e) => {
              e.stopPropagation()
              onAddChild(node)
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            {...tactileProps.button}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </motion.button>
        </Tooltip>
      )}

      {/* Edit Node - Chỉ khi có quyền Edit */}
      {!readOnly && (
        <Tooltip content="Chỉnh sửa thông tin thẻ" side="top">
          <motion.button
            type="button"
            data-testid={`ia-float-edit-${node.id}`}
            onClick={(e) => {
              e.stopPropagation()
              onEditNode(node)
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            {...tactileProps.button}
          >
            <Pencil className="w-4 h-4" />
          </motion.button>
        </Tooltip>
      )}

      {/* Figma link if present */}
      {node.figmaUrl && (
        <Tooltip content="Mở thiết kế Figma liên kết" side="top">
          <motion.button
            type="button"
            data-testid={`ia-float-figma-${node.id}`}
            onClick={handleFigma}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-purple-300 hover:text-purple-100 hover:bg-purple-900/50 transition-colors cursor-pointer"
            {...tactileProps.button}
          >
            <ExternalLink className="w-4 h-4" />
          </motion.button>
        </Tooltip>
      )}

      {/* Copy ID */}
      <Tooltip content="Sao chép mã Node ID" side="top">
        <motion.button
          type="button"
          data-testid={`ia-float-copy-${node.id}`}
          onClick={handleCopyId}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          {...tactileProps.button}
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </motion.button>
      </Tooltip>

      {/* Center view on this node */}
      {onCenterNode && (
        <Tooltip content="Căn giữa vào thẻ này" side="top">
          <motion.button
            type="button"
            data-testid={`ia-float-center-${node.id}`}
            onClick={(e) => {
              e.stopPropagation()
              onCenterNode(node)
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            {...tactileProps.button}
          >
            <Maximize2 className="w-4 h-4" />
          </motion.button>
        </Tooltip>
      )}

      {/* Delete Node */}
      {!readOnly && (
        <>
          <div className="w-px h-4 bg-slate-700/80 mx-0.5" />
          <Tooltip content="Xóa node này" shortcut="Del" side="top">
            <motion.button
              type="button"
              data-testid={`ia-float-delete-${node.id}`}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteNode(node)
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 transition-colors cursor-pointer"
              {...tactileProps.button}
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </Tooltip>
        </>
      )}
      </motion.div>
    </div>
  )
}
