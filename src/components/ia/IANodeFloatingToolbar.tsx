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
    <motion.div
      data-testid={`ia-floating-toolbar-${node.id}`}
      initial={{ opacity: 0, y: 6, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.92 }}
      transition={springs.snappy}
      style={{
        position: "absolute",
        left: x + nodeWidth / 2,
        top: y - 48,
        transform: "translateX(-50%)",
        zIndex: 60,
      }}
      className="flex items-center gap-1 p-1 bg-slate-900/95 text-white backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Tier indicator pill */}
      <span className="px-2 py-0.5 rounded-lg bg-blue-600/60 text-blue-200 text-[10px] font-mono font-bold tracking-tight">
        Lv{node.tier}
      </span>

      <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

      {/* Xem chi tiết Node (Luôn khả dụng cho cả View và Edit) */}
      <motion.button
        type="button"
        data-testid={`ia-float-view-${node.id}`}
        onClick={(e) => {
          e.stopPropagation()
          onViewDetail?.(node)
        }}
        title="Xem chi tiết thông tin node"
        className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer shadow-xs"
        {...tactileProps.button}
      >
        <Eye className="w-3.5 h-3.5" />
        <span>Xem chi tiết</span>
      </motion.button>

      {/* Xem bài toán liên kết (nếu có) */}
      {linkedRequest && onOpenTask && (
        <motion.button
          type="button"
          data-testid={`ia-float-task-${node.id}`}
          onClick={(e) => {
            e.stopPropagation()
            onOpenTask(linkedRequest)
          }}
          title={`Xem bài toán: ${linkedRequest.title}`}
          className="flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-semibold text-blue-200 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          {...tactileProps.button}
        >
          <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
          <span>Bài toán</span>
        </motion.button>
      )}

      {/* Add Child (Tier 1-3) - Chỉ khi có quyền Edit */}
      {!readOnly && node.tier < 4 && (
        <motion.button
          type="button"
          data-testid={`ia-float-add-${node.id}`}
          onClick={(e) => {
            e.stopPropagation()
            onAddChild(node)
          }}
          title="Thêm node con vào thẻ này"
          className="flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          {...tactileProps.button}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Thêm con</span>
        </motion.button>
      )}

      {/* Edit Node - Chỉ khi có quyền Edit */}
      {!readOnly && (
        <motion.button
          type="button"
          data-testid={`ia-float-edit-${node.id}`}
          onClick={(e) => {
            e.stopPropagation()
            onEditNode(node)
          }}
          title="Chỉnh sửa thông tin thẻ"
          className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          {...tactileProps.button}
        >
          <Pencil className="w-3.5 h-3.5" />
        </motion.button>
      )}

      {/* Figma link if present */}
      {node.figmaUrl && (
        <motion.button
          type="button"
          data-testid={`ia-float-figma-${node.id}`}
          onClick={handleFigma}
          title="Mở liên kết thiết kế Figma"
          className="p-1.5 rounded-xl text-purple-300 hover:text-purple-100 hover:bg-purple-900/50 transition-colors cursor-pointer"
          {...tactileProps.button}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </motion.button>
      )}

      {/* Copy ID */}
      <motion.button
        type="button"
        data-testid={`ia-float-copy-${node.id}`}
        onClick={handleCopyId}
        title="Sao chép Node ID"
        className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        {...tactileProps.button}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </motion.button>

      {/* Center view on this node */}
      {onCenterNode && (
        <motion.button
          type="button"
          data-testid={`ia-float-center-${node.id}`}
          onClick={(e) => {
            e.stopPropagation()
            onCenterNode(node)
          }}
          title="Căn giữa màn hình vào thẻ này"
          className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          {...tactileProps.button}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </motion.button>
      )}

      {/* Delete Node */}
      {!readOnly && (
        <>
          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
          <motion.button
            type="button"
            data-testid={`ia-float-delete-${node.id}`}
            onClick={(e) => {
              e.stopPropagation()
              onDeleteNode(node)
            }}
            title="Xóa node này"
            className="p-1.5 rounded-xl text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 transition-colors cursor-pointer"
            {...tactileProps.button}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </motion.button>
        </>
      )}
    </motion.div>
  )
}
