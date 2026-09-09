import React, { useState, useRef, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { UXRequest } from "@/data/mockData"
import { getUserInitials } from "@/services/otpAuthService"
import { UserAvatar } from "@/components/common/UserAvatar"
import { getRequestPendingClassification } from "@/config/statusConfig"
import { getSquadColorDef } from "@/lib/colorUtils"
import { capitalizeFirstLetter } from "@/lib/utils"
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
  Flag,
  Clock,
  PauseCircle
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

export function getKanbanColumns(): KanbanColumnDef[] {
  try {
    const saved = localStorage.getItem("mbbank_admin_phases")
    if (saved) {
      const parsed: any[] = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p, idx) => {
          const name = p.name || `Khâu ${idx + 1}`
          const progress = p.defaultProgress || 15
          let status = "Đang thực hiện"
          let dotColor = "bg-[#1057FB]"
          let bgClass = "bg-[#F0F6FF]"
          let borderClass = "border-blue-200/90"
          let icon = <Palette className="w-3.5 h-3.5 text-[#1057FB]" />

          const lower = name.toLowerCase()
          if (lower.includes("backlog") || lower.includes("blacklog")) {
            status = "Chờ tiếp nhận"
            dotColor = "bg-slate-500"
            bgClass = "bg-slate-50"
            borderClass = "border-slate-200/90"
            icon = <Clock className="w-3.5 h-3.5 text-slate-600" />
          } else if (lower.includes("xác nhận") || lower.includes("phân loại") || lower.includes("tiếp nhận") || idx === 0) {
            status = "Chờ xác nhận"
            dotColor = "bg-amber-500"
            bgClass = "bg-[#FFF9EE]"
            borderClass = "border-amber-200/90"
            icon = <Filter className="w-3.5 h-3.5 text-amber-600" />
          } else if (lower.includes("discovery") || lower.includes("khám phá") || lower.includes("nghiên cứu")) {
            dotColor = "bg-purple-500"
            bgClass = "bg-[#FAF5FF]"
            borderClass = "border-purple-200/90"
            icon = <Compass className="w-3.5 h-3.5 text-purple-600" />
          } else if (lower.includes("flow") || lower.includes("luồng") || lower.includes("wireframe")) {
            dotColor = "bg-indigo-500"
            bgClass = "bg-[#F5F7FF]"
            borderClass = "border-indigo-200/90"
            icon = <GitFork className="w-3.5 h-3.5 text-indigo-600" />
          } else if (lower.includes("ui") || lower.includes("giao diện") || lower.includes("design")) {
            dotColor = "bg-[#1057FB]"
            bgClass = "bg-[#F0F6FF]"
            borderClass = "border-blue-200/90"
            icon = <Palette className="w-3.5 h-3.5 text-[#1057FB]" />
          } else if (lower.includes("prototype") || lower.includes("tương tác") || lower.includes("test")) {
            dotColor = "bg-teal-500"
            bgClass = "bg-[#F0FDFB]"
            borderClass = "border-teal-200/90"
            icon = <PlaySquare className="w-3.5 h-3.5 text-teal-600" />
          } else if (lower.includes("bàn giao") || lower.includes("nghiệm thu") || progress >= 100 || idx === parsed.length - 1) {
            status = "Hoàn thành"
            dotColor = "bg-emerald-500"
            bgClass = "bg-[#F2FBF6]"
            borderClass = "border-emerald-200/90"
            icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          }

          return {
            id: p.id || `phase-${idx}`,
            step: idx + 1,
            phase: name,
            title: name,
            status,
            defaultProgress: progress,
            dotColor,
            bgClass,
            borderClass,
            icon,
          }
        })
      }
    }
  } catch {}

  // Default 6 columns matching Admin Settings exactly
  return [
    { id: "classify", step: 1, phase: "Phân loại", title: "Phân loại", status: "Đang phân loại", defaultProgress: 15, dotColor: "bg-amber-500", bgClass: "bg-[#FFF9EE]", borderClass: "border-amber-200/90", icon: <Filter className="w-3.5 h-3.5 text-amber-600" /> },
    { id: "discovery", step: 2, phase: "Discovery", title: "Discovery", status: "Đang thực hiện", defaultProgress: 35, dotColor: "bg-purple-500", bgClass: "bg-[#FAF5FF]", borderClass: "border-purple-200/90", icon: <Compass className="w-3.5 h-3.5 text-purple-600" /> },
    { id: "user_flow", step: 3, phase: "User Flow", title: "User Flow", status: "Đang thực hiện", defaultProgress: 55, dotColor: "bg-indigo-500", bgClass: "bg-[#F5F7FF]", borderClass: "border-indigo-200/90", icon: <GitFork className="w-3.5 h-3.5 text-indigo-600" /> },
    { id: "ui_design", step: 4, phase: "UI Design", title: "UI Design", status: "Đang thực hiện", defaultProgress: 75, dotColor: "bg-[#1057FB]", bgClass: "bg-[#F0F6FF]", borderClass: "border-blue-200/90", icon: <Palette className="w-3.5 h-3.5 text-[#1057FB]" /> },
    { id: "prototype", step: 5, phase: "Prototype", title: "Prototype", status: "Đang thực hiện", defaultProgress: 90, dotColor: "bg-teal-500", bgClass: "bg-[#F0FDFB]", borderClass: "border-teal-200/90", icon: <PlaySquare className="w-3.5 h-3.5 text-teal-600" /> },
    { id: "handoff", step: 6, phase: "Bàn giao", title: "Bàn giao", status: "Hoàn thành", defaultProgress: 100, dotColor: "bg-emerald-500", bgClass: "bg-[#F2FBF6]", borderClass: "border-emerald-200/90", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
  ]
}

export const KANBAN_PROCESS_COLUMNS: KanbanColumnDef[] = getKanbanColumns()

// Determine which column a request belongs to based on current_phase & status
export function getRequestKanbanPhase(req: UXRequest): string {
  const columns = getKanbanColumns()
  if (req.current_phase) {
    const p = req.current_phase.trim().toLowerCase()
    const matched = columns.find(
      (c) => c.phase.toLowerCase() === p || p.includes(c.phase.toLowerCase()) || c.phase.toLowerCase().includes(p)
    )
    if (matched) return matched.phase
  }

  // Fallbacks based on status
  if (req.status === "Hoàn thành") return columns[columns.length - 1]?.phase || "Bàn giao"
  if (
    req.status === "Chờ xác nhận" ||
    req.status === "1. Chờ xác nhận" ||
    req.status === "Đang phân loại" ||
    req.status === "Chờ tiếp nhận" ||
    req.status === "Đã gửi" ||
    req.status === "Mới tạo"
  ) {
    return columns[0]?.phase || "Chờ xác nhận"
  }

  // Fallbacks based on progress percentage
  if (req.progress >= 100) return columns[columns.length - 1]?.phase || "Bàn giao"
  for (let i = columns.length - 1; i >= 0; i--) {
    if (req.progress >= columns[i].defaultProgress - 5) {
      return columns[i].phase
    }
  }

  return columns[0]?.phase || "Chờ xác nhận"
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

// Squad badge dot + label (Thay thế badge TRIAGE/Status bằng Squad theo yêu cầu)
function getSquadBadgeDetails(req: UXRequest): { label: string; dotClass: string; hasSquad: boolean } {
  const rawSquad = (req.squad_name || req.preferred_squad || "").trim()
  const prod = (req.product || "").trim().toLowerCase()
  const hasSquad = Boolean(
    rawSquad &&
    rawSquad !== "Chưa phân công" &&
    rawSquad !== "Chưa có squad" &&
    rawSquad !== "Chưa phân squad" &&
    rawSquad !== "Triage Squad"
  )
  if (!hasSquad) {
    return { label: "Chưa phân squad", dotClass: "bg-slate-300", hasSquad: false }
  }
  const colorDef = getSquadColorDef(rawSquad, req.product)
  return { label: rawSquad, dotClass: colorDef.dotClass, hasSquad: true }
}

// Kiểm tra trạng thái Pending của thẻ Kanban - Phân loại chuẩn xác 2 loại:
// 1. PO Pending: Sau 24h kể từ khi Designer gửi lại figma cho PO nhưng chưa phản hồi (Amber)
// 2. Pending: Lí do theo đoạn chat của designer khi viết @pending (Slate)
function getRequestPendingInfo(req: UXRequest) {
  const p = getRequestPendingClassification(req)
  if (!p.isPending) {
    return { isPending: false, type: null, label: "", badgeClass: "", dotClass: "", tooltip: "", reason: "", elapsedHours: 0 }
  }

  if (p.type === "po_pending") {
    return {
      isPending: true,
      type: "po_pending" as const,
      label: "PO Pending",
      badgeClass: "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
      dotClass: "bg-amber-500",
      tooltip: "PO Pending: Sau 24h kể từ khi Designer gửi lại figma cho PO nhưng chưa phản hồi",
      reason: p.reason,
      elapsedHours: p.elapsedHours,
    }
  }

  return {
    isPending: true,
    type: "designer_pending" as const,
    label: "Pending",
    badgeClass: "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200",
    dotClass: "bg-slate-500",
    tooltip: `Pending: ${p.reason || "Theo đoạn chat của designer khi viết @pending"}`,
    reason: p.reason,
    elapsedHours: 0,
  }
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
  const [columnsVersion, setColumnsVersion] = useState(0)
  useEffect(() => {
    const onStorage = () => setColumnsVersion((v) => v + 1)
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])
  const kanbanColumns = useMemo(() => getKanbanColumns(), [columnsVersion])
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

  return (
    <div className="relative group/kanban w-full">
      {/* Kanban Horizontal Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-5 pt-1 px-1 sm:px-2 items-start scroll-smooth select-none scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100"
        style={{ scrollbarGutter: "stable" }}
      >
        {kanbanColumns.map((column) => {
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
              className={`w-[290px] min-w-[290px] shrink-0 flex flex-col rounded-2xl p-3 border transition-all duration-200 min-h-[580px] xl:min-h-[calc(100vh-17.5rem)] 2xl:min-h-[calc(100vh-16.5rem)] ${
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
              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-23rem)] pr-0.5 scrollbar-thin">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key={`kskel-col-${column.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2.5"
                    >
                      {[1, 2].map((k) => (
                        <div
                          key={`kskel-${column.id}-${k}`}
                          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-3"
                        >
                          <div className="flex justify-between items-center">
                            <Skeleton className="h-4 w-16 rounded-md" />
                            <Skeleton className="h-4 w-14 rounded-full" />
                          </div>
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-full rounded-md" />
                            <Skeleton className="h-3.5 w-3/4 rounded-md" />
                          </div>
                          <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <Skeleton className="size-5 rounded-full" />
                              <Skeleton className="h-3 w-16 rounded-md" />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Skeleton className="h-4 w-12 rounded-md" />
                              <Skeleton className="size-4 rounded-full" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  ) : columnRequests.length === 0 ? (
                    <motion.div
                      key={`kempty-col-${column.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center justify-center flex-1 min-h-[220px] rounded-2xl border border-dashed border-slate-300/80 bg-white/50 text-center p-4"
                    >
                      <p className="text-xs font-medium text-slate-400">No cards</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`kcards-col-${column.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-2.5"
                    >
                      {columnRequests.map((req, idx) => {
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

                    const squadBadge = getSquadBadgeDetails(req)
                    const pendingInfo = getRequestPendingInfo(req)

                    return (
                      <div
                        key={req.request_id ? `kcard-${req.request_id}-${idx}` : `kcard-idx-${idx}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, req.request_id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onSelectRequest(req)}
                        className={`group relative rounded-2xl border transition-all duration-200 cursor-grab active:cursor-grabbing select-none overflow-hidden ${
                          pendingInfo.type === "po_pending"
                            ? "bg-white border-amber-300/90 shadow-2xs ring-1 ring-amber-200/50 hover:border-amber-400 hover:shadow-md"
                            : pendingInfo.type === "designer_pending"
                            ? "bg-white border-slate-300/90 shadow-2xs ring-1 ring-slate-200/60 hover:border-slate-400 hover:shadow-md"
                            : "bg-white border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300"
                        } hover:-translate-y-0.5 ${
                          isDragging
                            ? "opacity-35 scale-[0.98] rotate-1 ring-2 ring-[#1057FB]"
                            : "opacity-100"
                        }`}
                      >
                        {/* SLEEK PENDING HEADER RIBBON (Tách biệt hoàn toàn lên mép trên, không làm chật chội bên trong thẻ) */}
                        {pendingInfo.isPending && (
                          pendingInfo.type === "po_pending" ? (
                            <div 
                              className="flex items-center justify-between gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border-b border-amber-200/80 text-[11px]"
                              title="PO Pending: Sau 24h kể từ khi Designer gửi lại figma cho PO nhưng chưa phản hồi"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="font-bold text-[10px] uppercase tracking-wide text-amber-800">PO Pending</span>
                                <span className="text-amber-700 font-medium truncate">· Quá hạn 24h</span>
                              </div>
                              {pendingInfo.elapsedHours ? (
                                <span className="text-[9.5px] font-bold text-amber-800 bg-amber-200/70 px-1.5 py-0.2 rounded shrink-0">
                                  {pendingInfo.elapsedHours}h trễ
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <div 
                              className="flex items-center justify-between gap-1.5 px-3 py-1 bg-slate-100/95 text-slate-800 border-b border-slate-200/80 text-[11px]"
                              title={`Pending: ${pendingInfo.reason || "Tạm dừng theo yêu cầu của Designer"}`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <PauseCircle className="w-3 h-3 text-slate-600 shrink-0" />
                                <span className="font-bold text-[10px] uppercase tracking-wide text-slate-700">Pending</span>
                                <span className="text-slate-600 truncate">
                                  · Lí do: <strong className="text-[#1057FB] font-medium">{pendingInfo.reason || "Tạm dừng"}</strong>
                                </span>
                              </div>
                            </div>
                          )
                        )}

                        <div className="p-3.5 space-y-2.5">
                          {/* Top Line: [Product Tag] ... [Squad Badge] (Rộng rãi, không bị co chữ thành A...) */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${getProductPillStyle(
                                req.product
                              )} truncate max-w-[130px]`}
                            >
                              {req.product || "App MBBank"}
                            </span>

                            {/* Squad Pill Badge with dot */}
                            <div 
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-slate-200/90 bg-slate-50/50 text-[10.5px] shrink-0 max-w-[125px] ${
                                squadBadge.hasSquad ? "text-slate-700 font-semibold" : "text-slate-400 italic font-normal"
                              }`}
                              title={`Squad: ${squadBadge.label}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${squadBadge.dotClass} shrink-0`} />
                              <span className="truncate">
                                {squadBadge.label}
                              </span>
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className="font-semibold text-xs sm:text-[13px] text-slate-900 leading-snug line-clamp-2 group-hover:text-[#1057FB] transition-colors break-words [overflow-wrap:break-word] max-w-full">
                            {capitalizeFirstLetter(req.title)}
                          </h4>

                        {/* Bottom Row: Assignee Avatar | Date Pill | Circular Progress */}
                        <div className="flex items-center justify-between gap-1.5 pt-0.5 text-xs">
                          {/* Assignee Avatar (ko cần tên designer) */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isAssigned ? (
                              <div title={`Designer: ${displayName}`}>
                                <UserAvatar name={displayName} avatarUrl={designerAvatar} size="xs" />
                              </div>
                            ) : (
                              <div
                                className="w-5 h-5 rounded-full border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 font-bold select-none"
                                title="Chưa phân công designer"
                              >
                                ?
                              </div>
                            )}

                            {/* Quick Pending toggle nếu task chưa Pending */}
                            {!pendingInfo.isPending && onUpdateStatus && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onUpdateStatus(req.request_id, "Pending")
                                }}
                                className="text-[10px] font-medium text-slate-400 hover:text-amber-700 hover:bg-amber-50 px-1.5 py-0.5 rounded border border-slate-200/70 hover:border-amber-300 opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex items-center gap-1"
                                title="Chuyển sang trạng thái Pending"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                <span>+ Pending</span>
                              </button>
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
                      </div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
            </div>
          )
        })}

        {/* Trailing spacer ensures column 6 is never cut off on horizontal scroll */}
        <div className="w-6 sm:w-10 shrink-0 h-10 pointer-events-none" aria-hidden="true" />
      </div>
    </div>
  )
}
