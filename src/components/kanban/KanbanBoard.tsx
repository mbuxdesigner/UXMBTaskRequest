import React, { useState } from "react"
import { UXRequest } from "@/data/mockData"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getStatusConfig } from "@/config/statusConfig"
import { 
  Calendar, 
  Clock, 
  MoreHorizontal, 
  Layers, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ExternalLink,
  GripVertical
} from "lucide-react"

interface KanbanBoardProps {
  requests: UXRequest[]
  onSelectRequest: (request: UXRequest) => void
  onUpdateStatus?: (requestId: string, newStatus: string) => Promise<void> | void
}

interface ColumnDef {
  id: string
  title: string
  status: string
  dotColor: string
  badgeVariant: "warning" | "info" | "success" | "neutral"
  headerBg: string
}

const COLUMNS: ColumnDef[] = [
  {
    id: "classify",
    title: "Đang phân loại",
    status: "Đang phân loại",
    dotColor: "bg-amber-500",
    badgeVariant: "warning",
    headerBg: "bg-amber-50 text-amber-900 border-amber-200/60"
  },
  {
    id: "in_progress",
    title: "Đang thực hiện",
    status: "Đang thực hiện",
    dotColor: "bg-blue-600",
    badgeVariant: "info",
    headerBg: "bg-blue-50 text-blue-900 border-blue-200/60"
  },
  {
    id: "completed",
    title: "Hoàn thành",
    status: "Hoàn thành",
    dotColor: "bg-emerald-500",
    badgeVariant: "success",
    headerBg: "bg-emerald-50 text-emerald-900 border-emerald-200/60"
  }
]

export default function KanbanBoard({
  requests,
  onSelectRequest,
  onUpdateStatus
}: KanbanBoardProps) {
  const [draggedRequestId, setDraggedRequestId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, reqId: string) => {
    e.dataTransfer.setData("text/plain", reqId)
    e.dataTransfer.effectAllowed = "move"
    setDraggedRequestId(reqId)
  }

  const handleDragEnd = () => {
    setDraggedRequestId(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverColumn !== columnStatus) {
      setDragOverColumn(columnStatus)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    setDragOverColumn(null)
    const reqId = e.dataTransfer.getData("text/plain") || draggedRequestId
    if (!reqId) return

    const targetReq = requests.find((r) => r.request_id === reqId)
    if (targetReq && targetReq.status !== targetStatus) {
      if (onUpdateStatus) {
        await onUpdateStatus(reqId, targetStatus)
      }
    }
    setDraggedRequestId(null)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
      {COLUMNS.map((column) => {
        const columnRequests = requests.filter((r) => {
          if (column.status === "Đang phân loại") {
            return r.status === "Đang phân loại" || r.status === "Chờ tiếp nhận"
          }
          return r.status === column.status
        })

        const isOver = dragOverColumn === column.status

        return (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.status)}
            className={`flex flex-col rounded-2xl bg-slate-50/80 p-3.5 border transition-all duration-200 min-h-[580px] ${
              isOver 
                ? "border-[#1B3A6B] bg-blue-50/50 ring-2 ring-[#1B3A6B]/20" 
                : "border-slate-200/80"
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-2 py-1.5 mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${column.dotColor} shadow-2xs`} />
                <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                  {column.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200/80 shadow-2xs">
                  {columnRequests.length}
                </span>
              </div>
            </div>

            {/* Column Body / Cards */}
            <div className="flex-1 space-y-3">
              {columnRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-slate-300/80 bg-white/50 text-center p-4">
                  <Layers className="w-6 h-6 text-slate-300 mb-1.5" />
                  <p className="text-xs font-medium text-slate-500">Chưa có yêu cầu nào</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Kéo thả thẻ vào đây để đổi trạng thái</p>
                </div>
              ) : (
                columnRequests.map((req) => {
                  const isDragging = draggedRequestId === req.request_id
                  const statusCfg = getStatusConfig(req.status)

                  return (
                    <div
                      key={req.request_id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, req.request_id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectRequest(req)}
                      className={`group relative bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400/80 transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
                        isDragging ? "opacity-40 scale-[0.98] rotate-1" : "opacity-100"
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-[#1B3A6B] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                            {req.request_id}
                          </span>
                          <Badge variant="outline" size="xs" className="text-slate-600 bg-slate-50">
                            {req.product}
                          </Badge>
                        </div>
                        <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </div>

                      {/* Card Title */}
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-2 group-hover:text-[#1B3A6B] transition-colors leading-snug mb-2">
                        {req.title}
                      </h4>

                      {/* Squad / Phase info */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-3">
                        <span className="truncate max-w-[140px] font-medium">{req.squad_name || "UX Core Squad"}</span>
                        {req.current_phase && (
                          <>
                            <span>•</span>
                            <span className="text-[#1B3A6B] font-semibold truncate">
                              {req.current_phase}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Progress Bar for in-progress tasks */}
                      {req.status === "Đang thực hiện" && (
                        <div className="mb-3 space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Tiến độ UX</span>
                            <span className="font-bold text-[#1B3A6B]">{req.progress}%</span>
                          </div>
                          <Progress value={req.progress} size="xs" />
                        </div>
                      )}

                      {/* Card Footer */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                        {/* Assignee */}
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#1B3A6B]/10 text-[#1B3A6B] flex items-center justify-center text-[10px] font-bold ring-1 ring-[#1B3A6B]/20">
                            {req.assigned_designer ? req.assigned_designer.charAt(0).toUpperCase() : "U"}
                          </div>
                          <span className="text-[11px] font-medium text-slate-700 truncate max-w-[90px]">
                            {req.assigned_designer || "Chưa phân công"}
                          </span>
                        </div>

                        {/* Deadline / Submitted Date */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{req.expected_deadline || req.submitted_at}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
