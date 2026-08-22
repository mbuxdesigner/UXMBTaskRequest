import React, { useState, useRef } from "react"
import { UXRequest } from "@/data/mockData"
import { getUserInitials } from "@/services/otpAuthService"
import { UserAvatar } from "@/components/common/UserAvatar"
import { 
  Calendar, 
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Send,
  Filter,
  Compass,
  GitFork,
  Palette,
  PlaySquare,
  CheckCircle2,
  Flag
} from "lucide-react"

export interface KanbanBoardProps {
  requests: UXRequest[]
  onSelectRequest: (request: UXRequest) => void
  onUpdateStatus?: (requestId: string, newStatus: string) => Promise<void> | void
  onUpdatePhase?: (
    requestId: string,
    newPhase: string,
    newStatus: string,
    newProgress: number
  ) => Promise<void> | void
  loading?: boolean
}

export interface KanbanColumnDef {
  id: string
  step: number
  phase: string
  title: string
  status: string
  defaultProgress: number
  dotColor: string
  bgClass: string
  borderClass: string
  icon: React.ReactNode
}

export const KANBAN_PROCESS_COLUMNS: KanbanColumnDef[] = [
  {
    id: "submitted",
    step: 1,
    phase: "Chờ tiếp nhận",
    title: "Chờ tiếp nhận",
    status: "Chờ tiếp nhận",
    defaultProgress: 10,
    dotColor: "bg-slate-400",
    bgClass: "bg-slate-100/70",
    borderClass: "border-slate-200/90",
    icon: <Send className="w-3.5 h-3.5 text-slate-500" />
  },
  {
    id: "classify",
    step: 2,
    phase: "Phân loại",
    title: "Phân loại",
    status: "Đang phân loại",
    defaultProgress: 20,
    dotColor: "bg-amber-500",
    bgClass: "bg-[#FFF9EE]",
    borderClass: "border-amber-200/90",
    icon: <Filter className="w-3.5 h-3.5 text-amber-600" />
  },
  {
    id: "discovery",
    step: 3,
    phase: "Discovery",
    title: "Discovery",
    status: "Đang thực hiện",
    defaultProgress: 35,
    dotColor: "bg-purple-500",
    bgClass: "bg-[#FAF5FF]",
    borderClass: "border-purple-200/90",
    icon: <Compass className="w-3.5 h-3.5 text-purple-600" />
  },
  {
    id: "user_flow",
    step: 4,
    phase: "User Flow",
    title: "User Flow",
    status: "Đang thực hiện",
    defaultProgress: 55,
    dotColor: "bg-indigo-500",
    bgClass: "bg-[#F5F7FF]",
    borderClass: "border-indigo-200/90",
    icon: <GitFork className="w-3.5 h-3.5 text-indigo-600" />
  },
  {
    id: "ui_design",
    step: 5,
    phase: "UI Design",
    title: "UI Design",
    status: "Đang thực hiện",
    defaultProgress: 75,
    dotColor: "bg-[#1057FB]",
    bgClass: "bg-[#F0F6FF]",
    borderClass: "border-blue-200/90",
    icon: <Palette className="w-3.5 h-3.5 text-[#1057FB]" />
  },
  {
    id: "prototype",
    step: 6,
    phase: "Prototype",
    title: "Prototype",
    status: "Đang thực hiện",
    defaultProgress: 90,
    dotColor: "bg-teal-500",
    bgClass: "bg-[#F0FDFB]",
    borderClass: "border-teal-200/90",
    icon: <PlaySquare className="w-3.5 h-3.5 text-teal-600" />
  },
  {
    id: "handoff",
    step: 7,
    phase: "Bàn giao",
    title: "Bàn giao",
    status: "Hoàn thành",
    defaultProgress: 100,
    dotColor: "bg-emerald-500",
    bgClass: "bg-[#F2FBF6]",
    borderClass: "border-emerald-200/90",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
  }
]

// Determine which column a request belongs to based on current_phase & status
export function getRequestKanbanPhase(req: UXRequest): string {
  if (req.current_phase) {
    const p = req.current_phase.trim().toLowerCase()
    if (p.includes("bàn giao") || p.includes("nghiệm thu") || p.includes("hoàn thành")) return "Bàn giao"
    if (p.includes("prototype") || p.includes("kiểm thử") || p.includes("test")) return "Prototype"
    if (p.includes("ui design") || p.includes("hi-fi") || p.includes("giao diện")) return "UI Design"
    if (p.includes("user flow") || p.includes("wireframe") || p.includes("luồng")) return "User Flow"
    if (p.includes("discovery") || p.includes("khám phá") || p.includes("nghiên cứu")) return "Discovery"
    if (p.includes("phân loại")) return "Phân loại"
    if (p.includes("chờ tiếp nhận") || p.includes("đã gửi") || p.includes("mới tạo") || p.includes("tiếp nhận")) return "Chờ tiếp nhận"
  }

  // Fallbacks based on status
  if (req.status === "Hoàn thành") return "Bàn giao"
  if (req.status === "Đang phân loại") return "Phân loại"
  if (req.status === "Chờ tiếp nhận" || req.status === "Đã gửi" || req.status === "Đã gửi yêu cầu" || req.status === "Mới tạo") return "Chờ tiếp nhận"

  // Fallbacks based on progress percentage
  if (req.progress >= 100) return "Bàn giao"
  if (req.progress >= 85) return "Prototype"
  if (req.progress >= 65) return "UI Design"
  if (req.progress >= 45) return "User Flow"
  if (req.progress >= 25) return "Discovery"
  if (req.progress >= 15) return "Phân loại"

  return "Chờ tiếp nhận"
}

// Product / Category Pill style (Forms, Access, Auth, API, Mobile, Export style)
function getProductPillStyle(product?: string): string {
  if (!product) return "bg-slate-100 text-slate-700 border-slate-200"
  const p = product.toLowerCase()
  if (p.includes("card") || p.includes("thẻ")) return "bg-rose-50 text-rose-600 border-rose-200/80"
  if (p.includes("core")) return "bg-blue-50 text-blue-600 border-blue-200/80"
  if (p.includes("lending") || p.includes("vay")) return "bg-amber-50 text-amber-700 border-amber-200/80"
  if (p.includes("saving") || p.includes("tiết kiệm")) return "bg-emerald-50 text-emerald-700 border-emerald-200/80"
  if (p.includes("digi")) return "bg-purple-50 text-purple-700 border-purple-200/80"
  if (p.includes("baas")) return "bg-cyan-50 text-cyan-700 border-cyan-200/80"
  if (p.includes("internet") || p.includes("ib")) return "bg-indigo-50 text-indigo-700 border-indigo-200/80"
  return "bg-slate-100 text-slate-700 border-slate-200/80"
}

// Status badge dot + label (RELEASE, IN PROGRESS, TRIAGE, QUEUED, BLOCKED)
function getStatusBadgeDetails(status?: string, phase?: string): { label: string; dotClass: string } {
  if (status === "Hoàn thành" || phase === "Bàn giao") {
    return { label: "RELEASE", dotClass: "bg-emerald-500" }
  }
  if (status === "Bị chặn") {
    return { label: "BLOCKED", dotClass: "bg-rose-500" }
  }
  if (status === "Đang thực hiện" || phase === "UI Design" || phase === "Prototype" || phase === "User Flow" || phase === "Discovery") {
    return { label: "IN PROGRESS", dotClass: "bg-[#1057FB]" }
  }
  if (status === "Đang phân loại" || phase === "Phân loại") {
    return { label: "TRIAGE", dotClass: "bg-amber-500" }
  }
  if (status === "Chờ tiếp nhận" || phase === "Chờ tiếp nhận") {
    return { label: "QUEUED", dotClass: "bg-slate-400" }
  }
  return { label: "IN PROGRESS", dotClass: "bg-[#1057FB]" }
}

// Circular SVG progress ring component
function CircularProgress({ value }: { value: number }) {
  const radius = 6
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference

  const strokeColor =
    value >= 100
      ? "text-emerald-500"
      : value >= 70
      ? "text-[#1057FB]"
      : value >= 40
      ? "text-amber-500"
      : value >= 20
      ? "text-rose-500"
      : "text-slate-300"

  return (
    <svg className="w-3.5 h-3.5 -rotate-90 shrink-0" viewBox="0 0 16 16">
      <circle
        cx="8"
        cy="8"
        r={radius}
        className="stroke-slate-200/90 fill-none"
        strokeWidth="2"
      />
      <circle
        cx="8"
        cy="8"
        r={radius}
        className={`fill-none transition-all duration-300 stroke-current ${strokeColor}`}
        strokeWidth="2"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
      />
    </svg>
  )
}

// Avatar color palettes
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

function formatDesignerDisplayName(rawName?: string): string {
  if (!rawName || rawName === "Chưa phân công" || rawName === "Đang phân công" || rawName.trim() === "") return "Chưa phân công"
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
  if (!name || name === "Chưa phân công") return ""
  try {
    const cached = localStorage.getItem("mbbank_team_members")
    if (cached) {
      const members: any[] = JSON.parse(cached)
      const found = members.find((m) => m.name === name || (name && m.name && (name.includes(m.name) || m.name.includes(name))))
      if (found && found.avatarUrl) return found.avatarUrl
    }
  } catch {}
  if (name.includes("Nam")) return "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80"
  if (name.includes("Cường")) return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
  if (name.includes("Lan")) return "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
  return ""
}

function formatDateOnly(rawDate?: string): string {
  if (!rawDate || !rawDate.trim()) return "—"
  const clean = rawDate.trim()
  // If format is "dd/MM/yyyy HH:mm:ss" or "dd/MM/yyyy HH:mm"
  if (clean.includes(" ")) {
    const parts = clean.split(" ")
    if (parts[0].includes("/") || parts[0].includes("-")) {
      return parts[0]
    }
  }
  // If format is ISO date e.g. "2026-08-22T..."
  if (clean.includes("T")) {
    try {
      const d = new Date(clean)
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, "0")
        const mm = String(d.getMonth() + 1).padStart(2, "0")
        const yyyy = d.getFullYear()
        return `${dd}/${mm}/${yyyy}`
      }
    } catch {}
  }
  return clean
}

export default function KanbanBoard({
  requests,
  onSelectRequest,
  onUpdateStatus,
  onUpdatePhase,
  loading = false,
}: KanbanBoardProps) {
  const [draggedRequestId, setDraggedRequestId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleDragStart = (e: React.DragEvent, reqId: string) => {
    e.dataTransfer.setData("text/plain", reqId)
    e.dataTransfer.effectAllowed = "move"
    setDraggedRequestId(reqId)
  }

  const handleDragEnd = () => {
    setDraggedRequestId(null)
    setDragOverColumnId(null)
  }

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverColumnId !== colId) {
      setDragOverColumnId(colId)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, column: KanbanColumnDef) => {
    e.preventDefault()
    setDragOverColumnId(null)
    const reqId = e.dataTransfer.getData("text/plain") || draggedRequestId
    if (!reqId) return

    const targetReq = requests.find((r) => r.request_id === reqId)
    if (!targetReq) {
      setDraggedRequestId(null)
      return
    }

    const currentPhase = getRequestKanbanPhase(targetReq)
    if (currentPhase !== column.phase) {
      if (onUpdatePhase) {
        await onUpdatePhase(reqId, column.phase, column.status, column.defaultProgress)
      } else if (onUpdateStatus) {
        await onUpdateStatus(reqId, column.status)
      }
    }
    setDraggedRequestId(null)
  }

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320 * 2
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      })
    }
  }

  return (
    <div className="relative group/kanban">
      {/* Scroll Navigation Buttons */}
      <div className="flex items-center justify-end mb-2.5 px-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            title="Cuộn sang trái"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            title="Cuộn sang phải"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kanban Horizontal Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 items-start scroll-smooth select-none scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100"
        style={{ scrollbarGutter: "stable" }}
      >
        {KANBAN_PROCESS_COLUMNS.map((column) => {
          const columnRequests = requests.filter(
            (r) => getRequestKanbanPhase(r) === column.phase
          )

          const isOver = dragOverColumnId === column.id

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column)}
              className={`w-[290px] min-w-[290px] shrink-0 flex flex-col rounded-2xl p-3 border transition-all duration-200 min-h-[620px] ${
                column.bgClass
              } ${column.borderClass} ${
                isOver
                  ? "border-[#1057FB] ring-2 ring-[#1057FB]/30 scale-[1.01] shadow-md"
                  : "shadow-2xs"
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1.5 py-1 mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[13px] sm:text-sm text-slate-800 tracking-tight">
                    {column.step}. {column.title}
                  </h3>
                  <span className="px-1.5 py-0.5 min-w-[20px] text-center rounded-md text-[11px] font-bold bg-white text-slate-600 border border-slate-200/90 shadow-2xs">
                    {columnRequests.length}
                  </span>
                </div>
                <MoreHorizontal className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
              </div>

              {/* Column Body / Cards */}
              <div className="flex-1 space-y-2.5">
                {loading ? (
                  <div className="space-y-2.5">
                    {[1, 2].map((k) => (
                      <div key={`kskel-${column.id}-${k}`} className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2.5 animate-pulse">
                        <div className="flex justify-between items-center">
                          <div className="h-4 bg-slate-100 rounded w-16" />
                          <div className="h-4 bg-slate-100 rounded-full w-14" />
                        </div>
                        <div className="h-4 bg-slate-100 rounded w-full" />
                        <div className="h-3 bg-slate-100 rounded w-2/3" />
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-100" />
                            <div className="h-3 bg-slate-100 rounded w-14" />
                          </div>
                          <div className="h-4 bg-slate-100 rounded w-12" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : columnRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-44 rounded-2xl border border-dashed border-slate-300/80 bg-white/50 text-center p-4">
                    <p className="text-xs font-medium text-slate-400">No cards</p>
                  </div>
                ) : (
                  columnRequests.map((req, idx) => {
                    const isDragging = draggedRequestId === req.request_id
                    const rawDesigner = req.assigned_designer || (req.ux_owner !== "Chưa phân công" && req.ux_owner !== "Đang phân công" ? req.ux_owner : "") || ""
                    const isAssigned = Boolean(rawDesigner && rawDesigner !== "Chưa phân công" && rawDesigner !== "Đang phân công")
                    const displayName = isAssigned ? formatDesignerDisplayName(rawDesigner) : "Chưa phân công"
                    const designerAvatar = isAssigned ? getDesignerAvatar(displayName) : ""
                    const progressVal =
                      req.progress ||
                      (column.phase === "Bàn giao"
                        ? 100
                        : column.defaultProgress)

                    const statusBadge = getStatusBadgeDetails(req.status, req.current_phase || column.phase)

                    return (
                      <div
                        key={req.request_id ? `kcard-${req.request_id}-${idx}` : `kcard-idx-${idx}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, req.request_id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onSelectRequest(req)}
                        className={`group relative bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing select-none space-y-2.5 ${
                          isDragging
                            ? "opacity-35 scale-[0.98] rotate-1 ring-2 ring-[#1057FB]"
                            : "opacity-100"
                        }`}
                      >
                        {/* Top Line: [Product Tag] ... [Status Badge with dot] */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${getProductPillStyle(
                                req.product
                              )} truncate max-w-[130px]`}
                            >
                              {req.product || "App"}
                            </span>
                          </div>

                          {/* Status Pill Badge with dot */}
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-200/90 bg-white text-[11px] font-medium text-slate-700 shrink-0 shadow-2xs">
                            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotClass} shrink-0`} />
                            <span className="text-[11px] font-medium text-slate-700">
                              {statusBadge.label}
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="font-semibold text-xs sm:text-[13px] text-slate-900 leading-snug line-clamp-2 group-hover:text-[#1057FB] transition-colors break-words [overflow-wrap:anywhere] break-all max-w-full">
                          {req.title}
                        </h4>

                        {/* Bottom Row: Assignee Avatar + Name | Date Pill | Circular Progress */}
                        <div className="flex items-center justify-between gap-1.5 pt-0.5 text-xs">
                          {/* Assignee */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isAssigned ? (
                              <>
                                <UserAvatar name={displayName} avatarUrl={designerAvatar} size="xs" />
                                <span className="text-xs text-slate-600 font-medium truncate max-w-[80px]">
                                  {displayName}
                                </span>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium italic truncate">
                                Chưa phân công
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Date Pill: Ngày cập nhật cuối */}
                            <div 
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-slate-200 bg-slate-50/70 text-[10.5px] text-slate-600 font-medium"
                              title="Ngày cập nhật cuối"
                            >
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>
                                {formatDateOnly(req.last_updated || req.submitted_at)}
                              </span>
                            </div>

                            {/* Circular Progress: [ ⭕ 26% ] */}
                            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-700">
                              <CircularProgress value={progressVal} />
                              <span className="font-mono text-[10.5px] text-slate-600 font-bold">
                                {progressVal}%
                              </span>
                            </div>
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
    </div>
  )
}
