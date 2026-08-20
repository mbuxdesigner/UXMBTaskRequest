import React, { useState } from "react"
import { UXRequest } from "@/data/mockData"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getStatusConfig } from "@/config/statusConfig"
import { getUserInitials } from "@/services/otpAuthService"
import { 
  Calendar, 
  Layers, 
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
}

const COLUMNS: ColumnDef[] = [
  {
    id: "classify",
    title: "Đang phân loại",
    status: "Đang phân loại",
    dotColor: "bg-amber-500",
  },
  {
    id: "in_progress",
    title: "Đang thực hiện",
    status: "Đang thực hiện",
    dotColor: "bg-[#1057FB]",
  },
  {
    id: "completed",
    title: "Hoàn thành",
    status: "Hoàn thành",
    dotColor: "bg-emerald-500",
  }
]

// Bảng màu avatar text đa dạng phân biệt theo tên
const AVATAR_COLOR_PALETTES = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
]

function getAvatarColorClass(name: string): string {
  if (!name) return AVATAR_COLOR_PALETTES[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_COLOR_PALETTES.length
  return AVATAR_COLOR_PALETTES[index]
}

// Chuyển email sang tên hiển thị người dùng thân thiện
function formatDesignerDisplayName(rawName?: string): string {
  if (!rawName) return "Đang phân công"
  const clean = rawName.trim()
  if (clean.toLowerCase().includes("nam.designer") || clean.toLowerCase().includes("nam.")) {
    return "Lê Hoàng Nam"
  }
  if (clean.toLowerCase().includes("cuong") || clean.toLowerCase().includes("owner")) {
    return "Nguyễn Văn Cường"
  }
  if (clean.toLowerCase().includes("lan") || clean.toLowerCase().includes("po")) {
    return "Trần Mai Lan"
  }
  if (clean.includes("@")) {
    const userPart = clean.split("@")[0]
    return userPart
      .replace(/[._]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return clean
}

function getDesignerAvatar(name?: string) {
  if (!name) return ""
  if (name.includes("Nam")) return "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80"
  if (name.includes("Cường")) return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
  if (name.includes("Lan")) return "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
  return ""
}

// Bảng màu cho thanh tiến độ theo từng giai đoạn UX
function getPhaseProgressColor(phase?: string, status?: string, progress?: number): string {
  if (status === "Hoàn thành" || progress === 100 || phase === "Bàn giao" || phase?.toLowerCase().includes("hoàn thành")) {
    return "bg-emerald-500"
  }
  if (!phase) return "bg-[#1057FB]"
  const p = phase.toLowerCase()
  if (p.includes("prototype") || p.includes("kiểm thử")) {
    return "bg-teal-500"
  }
  if (p.includes("ui design") || p.includes("hi-fi") || p.includes("giao diện")) {
    return "bg-[#1057FB]"
  }
  if (p.includes("user flow") || p.includes("wireframe") || p.includes("luồng")) {
    return "bg-purple-500"
  }
  if (p.includes("discovery") || p.includes("khám phá") || p.includes("nghiên cứu")) {
    return "bg-amber-500"
  }
  if (p.includes("phân loại") || p.includes("tiếp nhận")) {
    return "bg-sky-500"
  }
  if (p.includes("đã gửi") || p.includes("ghi nhận")) {
    return "bg-slate-400"
  }
  if (progress && progress > 70) return "bg-[#1057FB]"
  if (progress && progress > 40) return "bg-purple-500"
  if (progress && progress > 20) return "bg-amber-500"
  return "bg-[#1057FB]"
}

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
            return r.status === "Đang phân loại" || r.status === "Chờ tiếp nhận" || r.status === "Đã gửi"
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
            className={`flex flex-col rounded-2xl bg-slate-50/70 p-3.5 border transition-all duration-200 min-h-[580px] ${
              isOver 
                ? "border-[#1057FB] bg-blue-50/50 ring-2 ring-[#1057FB]/20" 
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
                columnRequests.map((req, idx) => {
                  const isDragging = draggedRequestId === req.request_id
                  const displayName = formatDesignerDisplayName(req.assigned_designer || req.ux_owner)
                  const designerAvatar = getDesignerAvatar(displayName)
                  const avatarColorClass = getAvatarColorClass(displayName)
                  const progressVal = req.progress || (req.status === "Hoàn thành" ? 100 : req.status === "Đang thực hiện" ? 55 : 15)

                  return (
                    <div
                      key={`${req.request_id}-${idx}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, req.request_id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectRequest(req)}
                      className={`group relative bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#1057FB] transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
                        isDragging ? "opacity-40 scale-[0.98] rotate-1" : "opacity-100"
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-[#1057FB] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                            {req.request_id}
                          </span>
                          <Badge variant="outline" size="xs" className="text-slate-600 bg-slate-50">
                            {req.product}
                          </Badge>
                        </div>
                        <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </div>

                      {/* Card Title */}
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-2 group-hover:text-[#1057FB] transition-colors leading-snug mb-2">
                        {req.title}
                      </h4>

                      {/* Squad / Phase info */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-3">
                        <span className="truncate max-w-[140px] font-medium">{req.squad_name || "UX Core Squad"}</span>
                        {req.current_phase && (
                          <>
                            <span>•</span>
                            <span className="text-[#1057FB] font-semibold truncate">
                              {req.current_phase}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">{req.current_phase || "Tiến độ"}</span>
                          <span className="font-mono font-bold text-slate-800">{progressVal}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getPhaseProgressColor(
                              req.current_phase,
                              req.status,
                              progressVal
                            )}`}
                            style={{ width: `${progressVal}%` }}
                          />
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                        {/* Assignee */}
                        <div className="flex items-center gap-2 min-w-0">
                          {designerAvatar ? (
                            <img
                              src={designerAvatar}
                              alt={displayName}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div
                              className={`w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center border shrink-0 shadow-2xs ${avatarColorClass}`}
                            >
                              {getUserInitials(displayName)}
                            </div>
                          )}
                          <span className="text-[11px] font-bold text-slate-900 truncate max-w-[110px]">
                            {displayName}
                          </span>
                        </div>

                        {/* Deadline / Submitted Date */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{req.expected_deadline || req.submitted_at || "—"}</span>
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
