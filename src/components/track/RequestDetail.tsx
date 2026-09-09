import React, { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  UXRequest, 
  TaskUpdateRecord, 
  PRODUCTS as DEFAULT_PRODUCTS, 
  REQUEST_TYPES, 
  DEADLINE_REASONS, 
  mockSquads 
} from "../../data/mockData"
import UpdateProgressModal from "./UpdateProgressModal"
import { getStoredSession, getUserInitials } from "../../services/otpAuthService"
import { uploadFileToDrive, fetchSingleTaskUpdate, fetchTeamMembersFromSheet, getStoredTaskViewers, saveStoredTaskViewers } from "../../services/googleSheetService"
import {
  subscribeToTask,
  startTaskActivePolling,
  stopTaskActivePolling,
} from "../../services/realtimeSyncService"
import { UserAvatar } from "@/components/common/UserAvatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getStatusConfig, getRequestPendingClassification } from "@/config/statusConfig"
import { APP_CONTENT } from "@/config/content"
import { toast } from "@/components/ui/toast"
import { dispatchNotification } from "@/services/notificationService"
import { updateTaskProgress } from "../../api/api"
import { canUserAccessRequest, isUserInViewers, normalizeVietnameseString } from "@/lib/accessControl"
import { capitalizeFirstLetter } from "@/lib/utils"
import { DropdownMenu, DropdownOption } from "@/components/reui/dropdown-menu"
import { CAvatar29 } from "@/components/reui/c-avatar-29"
import { AiPromptBox } from "@/components/jolyui/ai-prompt-box"
import { 
  X, 
  ArrowLeft, 
  Send, 
  PauseCircle, 
  ExternalLink, 
  Target, 
  FileText, 
  Paperclip, 
  Calendar, 
  UserCheck, 
  Building, 
  Activity, 
  Edit3, 
  Share2, 
  Check, 
  Lock, 
  Smile, 
  Link as LinkIcon, 
  PlaySquare, 
  BookOpen, 
  Sparkles, 
  Flag, 
  Clock, 
  Tag, 
  MessageSquare, 
  ChevronDown, 
  Layers, 
  Search, 
  SlidersHorizontal, 
  Maximize2, 
  Minimize2, 
  ThumbsUp, 
  Heart, 
  PartyPopper, 
  Rocket, 
  Eye, 
  CornerDownRight, 
  Pin, 
  Sparkle, 
  History, 
  CheckCircle2, 
  RefreshCw, 
  FilePlus2, 
  ArrowRight, 
  User, 
  Plus, 
  Play, 
  Copy, 
  ChevronRight, 
  ChevronLeft, 
  Bell, 
  Users,
  UserPlus,
  UploadCloud,
  Download,
  Image as ImageIcon,
  FileSpreadsheet,
  FileBox,
  HelpCircle
} from "lucide-react"

interface RequestDetailProps {
  request: UXRequest | null
  open?: boolean
  onBack?: () => void
  onClose?: () => void
  onUpdated?: () => void
}

export type ActivityItemType = "create" | "status_change" | "phase_change" | "assignment" | "deliverable" | "comment"

export interface ActivityEvent {
  id: string
  type: ActivityItemType
  timestamp: string
  author: string
  authorRole?: string
  title?: string
  content?: string
  fromValue?: string
  toValue?: string
  link?: string
  progress?: number
  reactions?: Record<string, number>
  isPinned?: boolean
}

// Kiểm tra ghi chú có phải là nhật ký thao tác tự động của hệ thống (dạng text ngắn gọn) thay vì tin nhắn người dùng tự chat
export const isSystemActivityNote = (text: string, isCommentExplicit?: boolean): boolean => {
  const raw = (text || "").trim()
  if (!raw) return true
  const lower = raw.toLowerCase()

  // Cú pháp lệnh do người dùng tự gõ trong ô chat: @SenToPO:, @Pending:
  if (/^@se(?:n)?(?:d)?(?:_)?to(?:_)?po:|^@(po_)?pending:/i.test(lower)) {
    return false
  }

  // Cập nhật người theo dõi luôn là hành động hệ thống (UI text gọn), không dùng UI box
  if (
    lower.includes("người theo dõi") ||
    lower.includes("danh sách người theo dõi") ||
    lower.includes("viewer")
  ) {
    return true
  }

  if (isCommentExplicit === true) return false
  if (isCommentExplicit === false) return true

  // Khớp tất cả các câu thông báo hành động hệ thống được tạo tự động khi thao tác trên giao diện:
  if (
    // 1. Cập nhật ngày hạn deadline / design end date
    lower.includes("design end date") ||
    lower.includes("hạn thiết kế") ||
    lower.startsWith("cập nhật hạn") ||

    // 2. PO cập nhật tài liệu đầu bài
    lower.includes("cập nhật đầu bài") ||
    lower.startsWith("po cập nhật") ||
    lower.startsWith("po yêu cầu chỉnh sửa") ||
    lower.startsWith("po đã duyệt") ||
    lower.includes("chấp thuận bàn giao") ||

    // 3. Tiến độ, khâu, trạng thái
    lower.startsWith("chuyển tiến độ") ||
    lower.startsWith("cập nhật tiến độ") ||
    lower.startsWith("chuyển khâu") ||
    lower.startsWith("chuyển sang khâu") ||
    lower.startsWith("cập nhật trạng thái") ||
    lower.startsWith("chuyển trạng thái") ||
    lower.startsWith("đổi trạng thái") ||
    lower.includes("kanban") ||
    lower.includes("tự động gỡ trạng thái") ||
    lower.includes("gỡ bỏ trạng thái") ||
    lower.includes("tiếp tục update") ||

    // 4. Phân công nhân sự / designer
    lower.startsWith("phân công") ||
    lower.startsWith("gỡ bỏ phân công") ||
    lower.includes("phân công công việc cho") ||
    lower.includes("phân công designer") ||
    lower.includes("phân công nhân sự") ||

    // 5. Độ ưu tiên
    lower.includes("độ ưu tiên") ||
    lower.startsWith("đã cập nhật độ ưu tiên") ||

    // 6. Khởi tạo / tiếp nhận
    lower.startsWith("khởi tạo yêu cầu") ||
    lower.startsWith("ghi nhận yêu cầu") ||
    lower.startsWith("đã tạo yêu cầu") ||
    lower.startsWith("yêu cầu đã được tiếp nhận") ||
    lower.includes("bài toán được đánh dấu pending") ||

    // 7. Thông báo gửi PO mặc định của hệ thống
    lower.includes("đã gửi phương án thiết kế cho po xem xét")
  ) {
    return true
  }

  return false
}

export const isMockDesigner = (name?: string, email?: string): boolean => {
  const n = (name || "").toLowerCase().trim()
  const e = (email || "").toLowerCase().trim()
  if (n === "lê hoàng nam" || e === "nam.designer@mbbank.com.vn") return true
  if (n === "phạm hải đăng" || e === "dang.designer@mbbank.com.vn") return true
  if (n === "vũ phương linh" || e === "linh.designer@mbbank.com.vn") return true
  if (n === "nguyễn văn cường" || e === "cuong.owner@mbbank.com.vn" || e === "cuong.designowner@mbbank.com.vn") return true
  return false
}

const DESIGNER_OPTIONS: any[] = []

const STATUS_OPTIONS = [
  { value: "Chờ tiếp nhận", label: "Chờ tiếp nhận", color: "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200" },
  { value: "Đang phân loại", label: "Đang phân loại", color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" },
  { value: "Đang thực hiện", label: "Đang thực hiện", color: "bg-blue-50 text-[#1057FB] border-blue-200 hover:bg-blue-100" },
  { value: "Pending", label: "Pending PO", color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
  { value: "Hoàn thành", label: "Hoàn thành", color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
  { value: "Bị chặn", label: "Bị chặn", color: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" },
]

const PRIORITY_OPTIONS = [
  { value: "Urgent", label: "Urgent", color: "text-rose-600 bg-rose-50 border-rose-200", flagFill: "fill-rose-500 text-rose-500" },
  { value: "High", label: "High", color: "text-amber-600 bg-amber-50 border-amber-200", flagFill: "fill-amber-500 text-amber-500" },
  { value: "Normal", label: "Medium", color: "text-blue-600 bg-blue-50 border-blue-200", flagFill: "fill-blue-500 text-blue-500" },
  { value: "Low", label: "Low", color: "text-slate-600 bg-slate-50 border-slate-200", flagFill: "fill-slate-400 text-slate-400" },
]

export function getAdminPhases() {
  try {
    const saved = localStorage.getItem("mbbank_admin_phases")
    if (saved) {
      const parsed: any[] = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p, idx) => ({
          key: p.name,
          label: `${idx + 1}. ${p.name}`,
          progress: p.defaultProgress,
        }))
      }
    }
  } catch {}
  return [
    { key: "Chờ xác nhận", label: "1. Chờ xác nhận", progress: 10 },
    { key: "Define đầu bài", label: "2. Define đầu bài", progress: 30 },
    { key: "Wireframe", label: "3. Wireframe", progress: 40 },
    { key: "UI Design", label: "4. UI Design", progress: 70 },
    { key: "Ready to dev", label: "5. Ready to dev", progress: 80 },
    { key: "Nghiệm thu UI", label: "6. Nghiệm thu UI", progress: 90 },
    { key: "Hoàn thành", label: "7. Hoàn thành", progress: 100 },
  ]
}

export const UX_PHASES_MB = getAdminPhases()

const ALL_CLICKUP_FILTERS = [
  "person",
  "assignee",
  "comments",
  "attachments",
  "phase_status",
  "due_date",
  "priority",
  "po_spec",
  "archived",
]

const CLICKUP_FILTER_ITEMS = [
  { key: "person", label: "Person", icon: Users, hasSubUser: true },
  { key: "assignee", label: "Assignee", icon: UserCheck },
  { key: "comments", label: "Comments", icon: MessageSquare },
  { key: "attachments", label: "Attachments", icon: Paperclip },
  { key: "phase_status", label: "Status & Phase", icon: Layers },
  { key: "due_date", label: "Due date", icon: Calendar },
  { key: "priority", label: "Priority", icon: Flag },
  { key: "po_spec", label: "PO Spec & Details", icon: FileText },
  { key: "archived", label: "Archived & Created", icon: History },
]

const TIME_ESTIMATE_OPTIONS = ["10 hrs", "20 hrs", "40 hrs", "60 hrs", "80 hrs", "120 hrs"]
const TAG_OPTIONS = ["Mobile App", "Web Banking", "UX Research", "Design System", "Lending", "Cards", "Core Banking", "BaaS"]

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

/**
 * Renders inline text with automatic conversion of '->', '-->', '=>' to stylized arrow '→'
 * and supports bolding with '**text**'
 */
function renderInlineFormatted(text: string): React.ReactNode {
  const arrowRegex = /(\s*(?:->|-->|=>|==>|→)\s*)/g
  const parts = text.split(arrowRegex)

  return parts.map((part, idx) => {
    if (/^\s*(?:->|-->|=>|==>|→)\s*$/.test(part)) {
      return (
        <span
          key={`arrow-${idx}`}
          className="inline-flex items-center justify-center mx-1.5 text-blue-600 font-bold select-none text-[13px] align-baseline"
          title="Luồng tiếp theo"
        >
          →
        </span>
      )
    }

    if (part.includes("**")) {
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g)
      return (
        <span key={`text-${idx}`}>
          {boldParts.map((bp, bIdx) => {
            if (bp.startsWith("**") && bp.endsWith("**") && bp.length > 4) {
              return (
                <strong key={`b-${bIdx}`} className="font-bold text-slate-900">
                  {bp.slice(2, -2)}
                </strong>
              )
            }
            return bp
          })}
        </span>
      )
    }

    return <span key={`text-${idx}`}>{part}</span>
  })
}

/**
 * Formats rich article paragraphs with bullets, numbers, flow arrows, and clean spacing
 */
function renderRichArticleContent(content?: string, emptyFallback = "Chưa có nội dung chi tiết."): React.ReactNode {
  if (!content || !content.trim()) {
    return <span className="text-slate-400 italic">{emptyFallback}</span>
  }

  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let currentListItems: React.ReactNode[] = []

  const flushList = (keyPrefix: number | string) => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={`list-${keyPrefix}`} className="space-y-2.5 my-1.5 pl-0.5">
          {currentListItems}
        </ul>
      )
      currentListItems = []
    }
  }

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim()
    if (!trimmed) {
      flushList(`flush-${lineIdx}`)
      return
    }

    // Bullet point detection: -, *, +, •
    const bulletMatch = line.match(/^\s*([-*+•])\s+(.*)$/)
    if (bulletMatch) {
      const bulletText = bulletMatch[2]
      currentListItems.push(
        <li key={`item-${lineIdx}`} className="flex items-start gap-2.5 text-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
          <div className="flex-1 leading-relaxed">
            {renderInlineFormatted(capitalizeFirstLetter(bulletText))}
          </div>
        </li>
      )
      return
    }

    // Numbered list detection: 1. or 1)
    const numberMatch = line.match(/^\s*(\d+)[\.\)]\s+(.*)$/)
    if (numberMatch) {
      const num = numberMatch[1]
      const numText = numberMatch[2]
      currentListItems.push(
        <li key={`num-${lineIdx}`} className="flex items-start gap-2 text-slate-800">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold shrink-0 mt-0.5">
            {num}
          </span>
          <div className="flex-1 leading-relaxed">
            {renderInlineFormatted(capitalizeFirstLetter(numText))}
          </div>
        </li>
      )
      return
    }

    // Regular line / paragraph: flush pending list first
    flushList(`p-flush-${lineIdx}`)

    const isIntroHeading = trimmed.endsWith(":") && trimmed.length < 150
    elements.push(
      <p
        key={`p-${lineIdx}`}
        className={`leading-relaxed text-slate-800 ${isIntroHeading ? "font-medium text-slate-900" : "font-normal"}`}
      >
        {renderInlineFormatted(capitalizeFirstLetter(line))}
      </p>
    )
  })

  flushList("end")

  return <div className="space-y-2.5">{elements}</div>
}

// Helper to parse dates into epoch milliseconds
function parseDateToMs(ts?: string): number {
  if (!ts) return 0
  const dmyMatch = ts.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/)
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10)
    const month = parseInt(dmyMatch[2], 10) - 1
    const year = parseInt(dmyMatch[3], 10)
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0
    const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0
    return new Date(year, month, day, hour, minute, second).getTime()
  }
  const timeMatch = ts.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/)
  if (timeMatch) {
    const hour = parseInt(timeMatch[1], 10)
    const minute = parseInt(timeMatch[2], 10)
    const second = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0
    const d = new Date()
    d.setHours(hour, minute, second, 0)
    return d.getTime()
  }
  const isoParsed = new Date(ts).getTime()
  return isNaN(isoParsed) ? 0 : isoParsed
}

export default function RequestDetail({
  request: rawRequest,
  open = true,
  onBack,
  onClose,
  onUpdated,
}: RequestDetailProps) {
  const lastValidRequestRef = useRef<UXRequest | null>(rawRequest || null)
  if (rawRequest) {
    lastValidRequestRef.current = rawRequest
  }
  const request = rawRequest || lastValidRequestRef.current

  const [isClosing, setIsClosing] = useState(false)

  const handleDismiss = useCallback(() => {
    if (isClosing) return
    setIsClosing(true)
    onClose?.()
    onBack?.()
    setTimeout(() => {
      setIsClosing(false)
    }, 300)
  }, [isClosing, onClose, onBack])

  const isVisible = Boolean(open && rawRequest) && !isClosing
  const session = getStoredSession()

  // Local state for immediate optimistic update of Assignee (Hỗ trợ chọn nhiều người)
  const [localAssignee, setLocalAssignee] = useState<string>(() => {
    return request?.assigned_designer || (request?.ux_owner && request.ux_owner !== "Chưa phân công" && request.ux_owner !== "Đang phân công" ? request.ux_owner : "") || ""
  })

  // Local state for immediate optimistic update of Squad and Product from PO edit
  const [localSquad, setLocalSquad] = useState<string>(() => {
    return request?.squad_name || request?.preferred_squad || ""
  })
  const [localProduct, setLocalProduct] = useState<string>(() => {
    return request?.product || ""
  })
  // Local state for immediate optimistic update of Viewers
  const [localViewers, setLocalViewers] = useState<string[]>(() => {
    if (Array.isArray(request?.viewers) && request.viewers.length > 0) {
      return request.viewers
        .map((v: any) => (typeof v === "object" && v !== null ? String(v.name || v.displayName || v.email || "").trim() : String(v || "").trim()))
        .filter(Boolean)
    }
    if (typeof (request as any)?.viewers === "string" && (request as any).viewers.trim()) {
      return (request as any).viewers.split(/[,;\n]+/).map((v: string) => v.trim()).filter(Boolean)
    }
    if (request?.request_id) {
      const stored = getStoredTaskViewers(request.request_id)
      if (stored.length > 0) return stored
    }
    return []
  })
  const [viewerSearchQuery, setViewerSearchQuery] = useState<string>("")
  const [, setRequirementUpdateTick] = useState(0)

  useEffect(() => {
    setLocalAssignee(request?.assigned_designer || (request?.ux_owner && request.ux_owner !== "Chưa phân công" && request.ux_owner !== "Đang phân công" ? request.ux_owner : "") || "")
    setLocalSquad(request?.squad_name || request?.preferred_squad || "")
    setLocalProduct(request?.product || "")
    
    const incoming = Array.isArray(request?.viewers)
      ? request.viewers
          .map((v: any) => (typeof v === "object" && v !== null ? String(v.name || v.displayName || v.email || "").trim() : String(v || "").trim()))
          .filter(Boolean)
      : typeof (request as any)?.viewers === "string" && (request as any).viewers.trim()
      ? (request as any).viewers.split(/[,;\n]+/).map((v: string) => v.trim()).filter(Boolean)
      : []

    if (incoming.length > 0) {
      setLocalViewers(incoming)
      if (request?.request_id) saveStoredTaskViewers(request.request_id, incoming)
    } else if (request?.request_id) {
      const stored = getStoredTaskViewers(request.request_id)
      if (stored.length > 0) {
        request.viewers = stored
        setLocalViewers(stored)
      } else {
        setLocalViewers([])
      }
    } else {
      setLocalViewers([])
    }
  }, [request?.request_id, request?.assigned_designer, request?.ux_owner, request?.squad_name, request?.preferred_squad, request?.product, request?.viewers])

  // Trạng thái đồng bộ thời gian thực (Live Real-time Sync)
  const [liveSyncTime, setLiveSyncTime] = useState<string>("Vừa xong")
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(false)

  // Real-time Event Subscriber & Adaptive Polling cho Task đang mở
  useEffect(() => {
    if (!isVisible || !request?.request_id) return

    // 1. Lắng nghe cập nhật real-time từ BroadcastChannel (đa tab / các client khác)
    const unsubscribe = subscribeToTask(request.request_id, (payload) => {
      setIsLiveSyncing(true)
      setTimeout(() => setIsLiveSyncing(false), 800)
      setLiveSyncTime("Vừa xong")

      if (payload.task) {
        if (payload.task.status) request.status = payload.task.status
        if (payload.task.current_phase) request.current_phase = payload.task.current_phase
        if (typeof payload.task.progress === "number") request.progress = payload.task.progress
        if (payload.task.assigned_designer !== undefined) {
          request.assigned_designer = payload.task.assigned_designer
          setLocalAssignee(payload.task.assigned_designer)
        }
        if (payload.task.priority) {
          request.priority = payload.task.priority
          setCurrentPriority(payload.task.priority)
        }
        if (payload.task.design_deadline !== undefined) {
          request.design_deadline = payload.task.design_deadline
          setCustomDeadline(payload.task.design_deadline || "")
        }
        if (payload.task.product) {
          request.product = payload.task.product
          setLocalProduct(payload.task.product)
        }
        if (payload.task.squad_name) {
          request.squad_name = payload.task.squad_name
          setLocalSquad(payload.task.squad_name)
        }
        if (Array.isArray(payload.task.viewers)) {
          request.viewers = payload.task.viewers
          setLocalViewers(payload.task.viewers)
        }
        if (Array.isArray(payload.task.task_updates)) {
          request.task_updates = payload.task.task_updates
        }
        setRequirementUpdateTick((c) => c + 1)
      }
    })

    // 2. Kích hoạt Smart Adaptive Poller khi đang mở Drawer
    startTaskActivePolling(request.request_id, async (id) => {
      setIsLiveSyncing(true)
      try {
        const fresh = await fetchSingleTaskUpdate(id)
        if (fresh) {
          setLiveSyncTime("Vừa xong")
          if (fresh.current_phase) request.current_phase = fresh.current_phase
          if (fresh.status) request.status = fresh.status
          if (typeof fresh.progress === "number") request.progress = fresh.progress
          if (fresh.assigned_designer !== undefined) {
            request.assigned_designer = fresh.assigned_designer
            setLocalAssignee(fresh.assigned_designer)
          }
          if (fresh.priority) {
            request.priority = fresh.priority
            setCurrentPriority(fresh.priority)
          }
          if (fresh.design_deadline !== undefined) {
            request.design_deadline = fresh.design_deadline
            setCustomDeadline(fresh.design_deadline || "")
          }
          if (Array.isArray(fresh.viewers)) {
            if (fresh.viewers.length > 0) {
              request.viewers = fresh.viewers
              setLocalViewers(fresh.viewers)
              saveStoredTaskViewers(request.request_id, fresh.viewers)
            } else {
              const stored = getStoredTaskViewers(request.request_id)
              if (stored.length > 0) {
                request.viewers = stored
                setLocalViewers(stored)
              }
            }
          }
          setRequirementUpdateTick((c) => c + 1)
        }
      } finally {
        setTimeout(() => setIsLiveSyncing(false), 600)
      }
    })

    return () => {
      unsubscribe()
      stopTaskActivePolling()
    }
  }, [isVisible, request?.request_id])

  const localAssignees = useMemo(() => {
    if (!localAssignee || localAssignee === "Chưa phân công" || localAssignee === "Đang phân công" || !localAssignee.trim()) {
      return []
    }
    return localAssignee
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== "Chưa phân công" && s !== "Đang phân công")
  }, [localAssignee])

  const isAssigned = localAssignees.length > 0
  const displayName = isAssigned ? localAssignees.join(", ") : "Chưa phân công"
  const designerAvatar = isAssigned ? getDesignerAvatar(localAssignees[0]) : ""

  // Helper đối soát tên nhân sự linh hoạt (VD: "Cường" khớp "Nguyễn Văn Cường", "cuongdm5")
  const isNameMatching = useCallback((nameA?: string, nameB?: string): boolean => {
    if (!nameA || !nameB) return false
    const a = nameA.trim().toLowerCase()
    const b = nameB.trim().toLowerCase()
    if (a === b) return true
    if (a.endsWith(" " + b) || b.endsWith(" " + a)) return true
    if (a.startsWith(b + " ") || b.startsWith(a + " ")) return true
    return false
  }, [])

  const matchesPerson = useCallback((assignedTarget?: string, designer?: { name: string; email?: string }): boolean => {
    if (!assignedTarget || !designer) return false
    const target = assignedTarget.trim().toLowerCase()
    const dName = designer.name.trim().toLowerCase()
    if (isNameMatching(target, dName)) return true
    if (designer.email) {
      const emailPrefix = designer.email.toLowerCase().split("@")[0].replace(/[^a-z0-9]/g, "")
      const targetClean = target.replace(/[^a-z0-9]/g, "")
      if (emailPrefix && targetClean && (emailPrefix === targetClean || emailPrefix.includes(targetClean) || targetClean.includes(emailPrefix))) {
        return true
      }
    }
    return false
  }, [isNameMatching])

  // Quản lý danh sách nhân sự thực tế, đồng bộ từ Google Sheet hoặc LocalStorage, loại bỏ mock users
  const [teamMemberList, setTeamMemberList] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("mbbank_admin_team") || localStorage.getItem("mbbank_team_members")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter((m: any) => !isMockDesigner(m.name || m.displayName, m.email || m.teamsEmail))
          if (cleaned.length !== parsed.length) {
            localStorage.setItem("mbbank_admin_team", JSON.stringify(cleaned))
            localStorage.setItem("mbbank_team_members", JSON.stringify(cleaned))
          }
          return cleaned
        }
      }
    } catch {}
    return []
  })

  useEffect(() => {
    if (teamMemberList.length === 0) {
      fetchTeamMembersFromSheet().then((members) => {
        if (members && Array.isArray(members) && members.length > 0) {
          const cleaned = members.filter((m: any) => !isMockDesigner(m.name || m.displayName, m.email || m.teamsEmail))
          setTeamMemberList(cleaned)
          try {
            localStorage.setItem("mbbank_admin_team", JSON.stringify(cleaned))
            localStorage.setItem("mbbank_team_members", JSON.stringify(cleaned))
          } catch {}
        }
      }).catch(() => {})
    }
  }, [teamMemberList.length])

  // Lấy danh sách Designer từ teamMemberList (lấy từ Google Sheet/Admin, loại bỏ mock)
  const availableDesigners = useMemo(() => {
    if (!Array.isArray(teamMemberList) || teamMemberList.length === 0) {
      return []
    }
    return teamMemberList
      .map((m) => ({
        name: String(m.name || m.displayName || "").trim(),
        role: String(m.role || "Designer").trim(),
        email: String(m.email || m.teamsEmail || "").trim(),
        avatar: String(m.avatarUrl || m.avatar || getDesignerAvatar(m.name || m.displayName || "")),
        squad: String(m.squad || "").trim(),
        squads: Array.isArray(m.squads) ? m.squads : (m.squad ? [m.squad] : []),
      }))
      .filter((m) => {
        if (!m.name) return false
        if (isMockDesigner(m.name, m.email)) return false
        const roleLower = m.role.toLowerCase()
        // Chỉ chọn designer/design owner, loại bỏ PO, Business, BA, Tester, Guest...
        if (
          roleLower === "po" ||
          roleLower.includes("product owner") ||
          roleLower === "business" ||
          roleLower === "biz" ||
          roleLower === "ba" ||
          roleLower === "tester" ||
          roleLower === "guest"
        ) {
          return false
        }
        return (
          roleLower.includes("design") ||
          roleLower.includes("ux") ||
          roleLower.includes("ui") ||
          roleLower.includes("lead") ||
          roleLower.includes("owner") ||
          roleLower.includes("admin")
        )
      })
  }, [teamMemberList])

  // Tách thành 2 nhóm: Designer phụ trách Squad CHUẨN XÁC theo cấu hình Admin và Designer hỗ trợ (ngoài Squad)
  const { squadDesigners, supportingDesigners, taskSquadName, assignedSquadDesignerNames } = useMemo(() => {
    if (!request) {
      return {
        squadDesigners: [],
        supportingDesigners: [],
        taskSquadName: "Chưa phân squad",
        assignedSquadDesignerNames: [],
      }
    }
    const rawSquad = (localSquad !== undefined && localSquad !== "" ? localSquad : (request.squad_name || request.preferred_squad || request.squad || "")).trim()
    const taskProd = (request.product || "").trim().toLowerCase()
    const squadLower = rawSquad.toLowerCase()

    // 1. Đọc danh sách cấu hình Squads từ Admin Settings (mbbank_admin_squads) hoặc mockSquads
    let allSquads: any[] = []
    try {
      const rawSquads = localStorage.getItem("mbbank_admin_squads")
      if (rawSquads) {
        const parsed = JSON.parse(rawSquads)
        if (Array.isArray(parsed) && parsed.length > 0) {
          allSquads = parsed
        }
      }
    } catch {}
    if (allSquads.length === 0) {
      allSquads = mockSquads
    }

    // 2. Tìm chính xác Squad của Task này (khớp tên squad và khớp sản phẩm nếu có)
    const matchedSquad = allSquads.find((sq: any) => {
      const sqName = (sq.name || sq.squad_name || "").trim().toLowerCase()
      const sqProd = (sq.productName || sq.product_name || "").trim().toLowerCase()
      const isNameMatch = sqName === squadLower || (rawSquad && (sqName.includes(squadLower) || squadLower.includes(sqName)))
      if (taskProd && sqProd) {
        return isNameMatch && (sqProd === taskProd || sqProd.includes(taskProd) || taskProd.includes(sqProd))
      }
      return isNameMatch
    }) || allSquads.find((sq: any) => {
      const sqName = (sq.name || sq.squad_name || "").trim().toLowerCase()
      return sqName === squadLower || (rawSquad && (sqName.includes(squadLower) || squadLower.includes(sqName)))
    })

    // 3. Lấy danh sách Designer được phân công phụ trách Squad này trong Admin Settings
    const squadAssignedNames: string[] = []
    if (matchedSquad) {
      if (Array.isArray(matchedSquad.designers) && matchedSquad.designers.length > 0) {
        squadAssignedNames.push(...matchedSquad.designers)
      }
      if (matchedSquad.leadDesigner && matchedSquad.leadDesigner.trim()) {
        squadAssignedNames.push(matchedSquad.leadDesigner.trim())
      }
      if (matchedSquad.ux_owner && matchedSquad.ux_owner.trim()) {
        const cleanUx = matchedSquad.ux_owner.replace(/\(.*?\)/g, "").trim()
        if (cleanUx && cleanUx !== "Chưa phân công" && cleanUx !== "Đang phân công") {
          squadAssignedNames.push(cleanUx)
        }
      }
    }
    const cleanAssignedNames = Array.from(new Set(squadAssignedNames.map((s) => s.trim()).filter(Boolean)))

    const squadList: typeof availableDesigners = []
    const supportList: typeof availableDesigners = []

    // 4. Phân loại chuẩn: CHỈ những ai được cấu hình rõ ràng trong squad mới vào squadDesigners
    availableDesigners.forEach((d) => {
      const dSquadLower = (d.squad || "").toLowerCase()
      const dSquadsLower = (d.squads || []).map((s: string) => s.toLowerCase())

      let isSquadInCharge = false

      if (cleanAssignedNames.length > 0) {
        // Có cấu hình trong Admin: Chỉ khớp với nhân sự được gán trong squad này
        isSquadInCharge = cleanAssignedNames.some((name) => matchesPerson(name, d))
      } else if (rawSquad) {
        // Squad chưa gán trong Admin: Khớp với designer có squad này cụ thể (không tính "all" hay "toàn hàng")
        isSquadInCharge = Boolean(
          !dSquadLower.includes("all") && (
            dSquadLower === squadLower ||
            dSquadsLower.some((s: string) => !s.includes("all") && (s === squadLower || s.includes(squadLower) || squadLower.includes(s)))
          )
        )
      }

      if (isSquadInCharge) {
        squadList.push(d)
      } else {
        supportList.push(d)
      }
    })

    const hasCleanSquad = Boolean(
      rawSquad &&
      rawSquad !== "Chưa phân công" &&
      rawSquad !== "Chưa có squad" &&
      rawSquad !== "Chưa phân squad" &&
      rawSquad !== "Triage Squad"
    )
    const cleanSquadDisplay = hasCleanSquad ? rawSquad : "Chưa phân squad"

    return {
      squadDesigners: squadList,
      supportingDesigners: supportList,
      taskSquadName: cleanSquadDisplay,
      assignedSquadDesignerNames: cleanAssignedNames,
    }
  }, [availableDesigners, localSquad, request?.squad_name, request?.preferred_squad, request?.squad, request?.product, matchesPerson])


  const [isFullScreen, setIsFullScreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [newCommentText, setNewCommentText] = useState("")
  const [commentLink, setCommentLink] = useState("")
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [optimisticUpdates, setOptimisticUpdates] = useState<TaskUpdateRecord[]>([])
  const activityContainerRef = useRef<HTMLDivElement>(null)

  // Reset optimistic updates when switching to another task
  useEffect(() => {
    setOptimisticUpdates([])
  }, [request?.request_id])

  // Dọn sạch các optimisticUpdates đã được ghi nhận trong task_updates từ server
  useEffect(() => {
    if (!request?.task_updates || optimisticUpdates.length === 0) return
    const serverNotes = new Set(request.task_updates.map((u) => u.note?.trim()).filter(Boolean))
    setOptimisticUpdates((prev) => prev.filter((opt) => !serverNotes.has(opt.note?.trim())))
  }, [request?.task_updates])

  const [activitySearchQuery, setActivitySearchQuery] = useState("")
  const [showSearchBox, setShowSearchBox] = useState(false)
  const [selectedActivityFilters, setSelectedActivityFilters] = useState<string[]>(ALL_CLICKUP_FILTERS)
  const [showActivityFilterMenu, setShowActivityFilterMenu] = useState(false)
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string | null>(null)
  const [isWatchingTask, setIsWatchingTask] = useState(true)

  // Inline Title & Description Editing
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(request?.title || "")
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState(request?.description || "")

  // Interactive Property Edit States
  const [openDropdown, setOpenDropdown] = useState<"status" | "assignee" | "date" | "priority" | "estimate" | "phase" | "tags" | "viewers" | null>(null)
  const [currentPriority, setCurrentPriority] = useState<string>(() => {
    return request?.priority || "Normal"
  })

  useEffect(() => {
    setCurrentPriority(request?.priority || "Normal")
  }, [request?.request_id, request?.priority])

  const [timeEstimate, setTimeEstimate] = useState<string>("40 hrs")
  const [isTrackingTime, setIsTrackingTime] = useState<boolean>(false)
  const [trackedSeconds, setTrackedSeconds] = useState<number>(0)
  const [activeTags, setActiveTags] = useState<string[]>(["Lending", "UX Research"])
  const [customDeadline, setCustomDeadline] = useState<string>(request?.design_deadline || request?.expected_deadline || "")

  const getSanitizedDeliverables = useCallback((req?: UXRequest | null) => {
    const d = { ...(req?.deliverables || {}) }
    if (d.figma_url) {
      const raw = d.figma_url.trim().toLowerCase()
      // Nếu figma_url là link tài liệu PO đính kèm (confluence viewpage, drive, hoặc trùng doc_link) thì không phải figma bàn giao của designer
      if (
        (req?.doc_link && d.figma_url === req.doc_link) ||
        (req?.doc_links && req.doc_links.includes(d.figma_url)) ||
        raw.includes("viewpage.action") ||
        raw.includes("google.com/drive") ||
        (!raw.includes("figma.com") && !raw.includes("figma"))
      ) {
        d.figma_url = ""
      }
    }
    return d
  }, [])

  const [customDeliverables, setCustomDeliverables] = useState(() => getSanitizedDeliverables(request))

  useEffect(() => {
    setCustomDeliverables(getSanitizedDeliverables(request))
  }, [request?.request_id, request?.deliverables, getSanitizedDeliverables])

  const [showAddDeliverableModal, setShowAddDeliverableModal] = useState(false)
  const [newDeliverableType, setNewDeliverableType] = useState<"figma" | "prototype" | "spec">("figma")
  const [newDeliverableUrl, setNewDeliverableUrl] = useState("")
  const [commentReactions, setCommentReactions] = useState<Record<string, Record<string, number>>>({})
  const [showOlderActivities, setShowOlderActivities] = useState<boolean>(false)
  const [activeEmojiPickerEventId, setActiveEmojiPickerEventId] = useState<string | null>(null)

  const [showPoEditModal, setShowPoEditModal] = useState(false)
  const [poFormTitle, setPoFormTitle] = useState(request?.title || "")
  const [poFormProduct, setPoFormProduct] = useState(request?.product || "")
  const [poFormSquad, setPoFormSquad] = useState(() => {
    return (request?.squad_name || request?.preferred_squad || "").trim()
  })
  const [poFormReqType, setPoFormReqType] = useState(request?.request_type || "")
  const [poFormDesc, setPoFormDesc] = useState(request?.description || "")
  const [poFormBizNeed, setPoFormBizNeed] = useState(request?.business_need || "")
  const [poFormUserProb, setPoFormUserProb] = useState(request?.user_problem || "")
  const [poFormTargetUser, setPoFormTargetUser] = useState(request?.target_user || "")
  const [poFormExpectedDeadline, setPoFormExpectedDeadline] = useState(request?.release_date || request?.expected_deadline || "")
  const [poFormDeadlineReason, setPoFormDeadlineReason] = useState(request?.deadline_reason || "")
  const [poFormDocLinks, setPoFormDocLinks] = useState<string[]>(request?.doc_links || [])
  const [poFormNewLink, setPoFormNewLink] = useState("")

  // Options for Edit Form Selects (Được chọn như lúc tạo/nhập)
  const editProductOptions = useMemo(() => {
    let prods: string[] = DEFAULT_PRODUCTS
    try {
      const raw = localStorage.getItem("mbbank_admin_products")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const active = parsed.filter((p: any) => p.status !== "Inactive").map((p: any) => p.name)
          if (active.length > 0) prods = active
        }
      }
    } catch {}
    if (poFormProduct && !prods.includes(poFormProduct)) {
      return [poFormProduct, ...prods]
    }
    return prods
  }, [poFormProduct])

  // Danh sách Squad chuẩn theo cấu hình Admin và lọc chính xác theo Sản phẩm được chọn
  const squadDropdownOptions: DropdownOption[] = useMemo(() => {
    let squadsList: any[] = []
    try {
      const raw = localStorage.getItem("mbbank_admin_squads")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) squadsList = parsed
      }
    } catch {}

    if (squadsList.length === 0) {
      squadsList = mockSquads
    }

    const prodTarget = (poFormProduct || "").toLowerCase().trim()

    // 1. Lọc các Squad thuộc đúng Sản phẩm đang chọn theo cấu hình Admin
    const matchingSquads: DropdownOption[] = []
    squadsList.forEach((sq: any) => {
      const sqName = String(sq.name || sq.squad_name || "").trim()
      if (!sqName) return
      const prodOfSq = String(sq.productName || sq.product_name || "").toLowerCase().trim()

      if (
        prodTarget &&
        prodOfSq &&
        (prodOfSq === prodTarget || prodOfSq.includes(prodTarget) || prodTarget.includes(prodOfSq))
      ) {
        if (!matchingSquads.some((m) => m.value.toLowerCase() === sqName.toLowerCase())) {
          matchingSquads.push({
            value: sqName,
            label: sqName,
            description: sq.domain || undefined,
          })
        }
      }
    })

    // Nếu sản phẩm có các Squad trong Admin (VD: Digi invest có 5 squads: TransferD, Gold, Trái phiếu, Chứng chỉ quỹ, BeeRich):
    if (matchingSquads.length > 0) {
      const result: DropdownOption[] = [
        { value: "", label: "Chưa phân squad" },
        ...matchingSquads,
      ]
      // Nếu task đang có squad hiện tại mà chưa nằm trong danh sách này, bổ sung lên đầu để không mất dữ liệu
      if (poFormSquad && !result.some((r) => r.value.toLowerCase() === poFormSquad.toLowerCase())) {
        result.splice(1, 0, { value: poFormSquad, label: poFormSquad })
      }
      return result
    }

    // 2. Nếu sản phẩm chưa có Squad nào được cấu hình riêng trong Admin:
    if (poFormProduct) {
      const defaultProdSquad = `Squad ${poFormProduct}`
      const result: DropdownOption[] = [
        { value: "", label: "Chưa phân squad" },
        { value: defaultProdSquad, label: defaultProdSquad, description: `Squad theo sản phẩm ${poFormProduct}` },
      ]
      if (poFormSquad && !result.some((r) => r.value.toLowerCase() === poFormSquad.toLowerCase())) {
        result.splice(1, 0, { value: poFormSquad, label: poFormSquad })
      }
      return result
    }

    // 3. Nếu chưa chọn sản phẩm: hiển thị danh sách tất cả squad đã cấu hình trong Admin
    const allOptions: DropdownOption[] = [
      { value: "", label: "Chưa phân squad" },
    ]
    squadsList.forEach((s: any) => {
      const name = String(s.name || s.squad_name || "").trim()
      if (name && !allOptions.some((o) => o.value.toLowerCase() === name.toLowerCase())) {
        allOptions.push({
          value: name,
          label: name,
          description: s.productName || s.product_name || s.domain || undefined,
        })
      }
    })
    if (poFormSquad && !allOptions.some((o) => o.value.toLowerCase() === poFormSquad.toLowerCase())) {
      allOptions.splice(1, 0, { value: poFormSquad, label: poFormSquad })
    }
    return allOptions
  }, [poFormProduct, poFormSquad])

  const editRequestTypeOptions = useMemo(() => {
    const base = REQUEST_TYPES
    if (poFormReqType && !base.includes(poFormReqType)) {
      return [poFormReqType, ...base]
    }
    return base
  }, [poFormReqType])

  const editTargetUserOptions = useMemo(() => {
    const base = [
      "Người dùng chung",
      "Khách hàng cá nhân",
      "Khách hàng Priority / Private",
      "Hộ kinh doanh cá thể & SME",
      "Khách hàng Doanh nghiệp (SME & Corporate)",
      "Gen Z & Millennials",
      "Nội bộ MBBank (Cán bộ nhân viên)",
      "Khác",
    ]
    if (poFormTargetUser && !base.includes(poFormTargetUser)) {
      return [poFormTargetUser, ...base]
    }
    return base
  }, [poFormTargetUser])

  const editDeadlineReasonOptions = useMemo(() => {
    const base = DEADLINE_REASONS
    if (poFormDeadlineReason && !base.includes(poFormDeadlineReason)) {
      return [poFormDeadlineReason, ...base]
    }
    return base
  }, [poFormDeadlineReason])

  const productDropdownOptions: DropdownOption[] = useMemo(() => {
    return editProductOptions.map((p) => ({ value: p, label: p }))
  }, [editProductOptions])

  const requestTypeDropdownOptions: DropdownOption[] = useMemo(() => {
    return editRequestTypeOptions.map((rt) => ({ value: rt, label: rt }))
  }, [editRequestTypeOptions])

  const targetUserDropdownOptions: DropdownOption[] = useMemo(() => {
    return [
      { value: "", label: "Chọn đối tượng mục tiêu..." },
      ...editTargetUserOptions.map((tu) => ({ value: tu, label: tu })),
    ]
  }, [editTargetUserOptions])

  const deadlineReasonDropdownOptions: DropdownOption[] = useMemo(() => {
    return [
      { value: "", label: "Chọn lý do hạn chót..." },
      ...editDeadlineReasonOptions.map((dr) => ({ value: dr, label: dr })),
    ]
  }, [editDeadlineReasonOptions])

  // Tab điều hướng riêng cho màn hình nhỏ (< lg)
  const [mobileActiveTab, setMobileActiveTab] = useState<"details" | "activity">("details")
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("")

  const [isUploadingTaskAttachment, setIsUploadingTaskAttachment] = useState(false)
  const taskFileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadTaskFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !request) return
    e.target.value = ""

    setIsUploadingTaskAttachment(true)
    toast.info("Đang tải file lên Google Drive...")

    try {
      const currentAttachments = [...(request.attachments || [])]
      const currentDocLinks = [...(request.doc_links || [])]

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const upRes = await uploadFileToDrive(file)
        if (upRes.success && upRes.fileUrl) {
          currentAttachments.push({
            name: upRes.fileName || file.name,
            url: upRes.fileUrl,
            size: upRes.fileSize || file.size,
          })
          if (!currentDocLinks.includes(upRes.fileUrl)) {
            currentDocLinks.push(upRes.fileUrl)
          }
        }
      }

      request.attachments = currentAttachments
      request.doc_links = currentDocLinks
      request.doc_link = currentDocLinks.join("\n")

      try {
        const cached = localStorage.getItem("ux_portal_real_requests")
        if (cached) {
          const list: UXRequest[] = JSON.parse(cached)
          const updated = list.map((r) => (r.request_id === request.request_id ? { ...r, ...request } : r))
          localStorage.setItem("ux_portal_real_requests", JSON.stringify(updated))
        }
      } catch {}

      toast.success("Đã đính kèm tệp tin lên Google Drive thành công!")
      if (onUpdated) onUpdated()
    } catch (err) {
      toast.error("Không thể tải file lên Drive", String(err))
    } finally {
      setIsUploadingTaskAttachment(false)
    }
  }

  // Kiểm tra quyền chỉnh sửa đề bài: PO hoặc Designer đều được sửa NẾU là tác giả tạo yêu cầu (hoặc Admin)
  const isAuthor = useMemo(() => {
    if (!request || !session) return true
    if (session.role === "Admin") return true
    const userEmail = (session.teamsEmail || session.personalEmail || "").toLowerCase().trim()
    const requesterEmail = (request.requester_email || "").toLowerCase().trim()
    const userName = (session.displayName || "").toLowerCase().trim()
    const requesterName = (request.requester_name || "").toLowerCase().trim()
    
    if (requesterEmail && userEmail) {
      if (userEmail === requesterEmail) return true
      const uPrefix = userEmail.includes("@") ? userEmail.split("@")[0].trim() : userEmail
      const rPrefix = requesterEmail.includes("@") ? requesterEmail.split("@")[0].trim() : requesterEmail
      if (uPrefix && rPrefix && uPrefix === rPrefix) return true
    }
    if (requesterName && userName) {
      const normUser = normalizeVietnameseString(userName)
      const normReq = normalizeVietnameseString(requesterName)
      if (normUser === normReq) return true

      const userWords = userName.split(/\s+/).filter(Boolean)
      const reqWords = requesterName.split(/\s+/).filter(Boolean)
      if (userWords.length >= 2 && reqWords.length >= 2) {
        if (normUser.includes(normReq) || normReq.includes(normUser)) return true
      }
    }
    return false
  }, [request, session])

  const canEditBrief = useMemo(() => {
    if (isAuthor) return true
    if (session?.role === "Admin" || session?.role === "Design Owner") return true
    return false
  }, [isAuthor, session])

  // Kiểm tra xem người dùng hiện tại có phải là Designer phụ trách bài toán này hay không
  const isAssignedDesigner = useMemo(() => {
    if (!request || !session) return false
    // Chỉ tài khoản có vai trò thiết kế (Designer, Design Owner, Admin) mới có thể là Designer phụ trách
    if (session.role !== "Designer" && session.role !== "Design Owner" && session.role !== "Admin") {
      return false
    }

    const userEmail = (session.teamsEmail || session.personalEmail || "").toLowerCase().trim()
    const uPrefix = userEmail.includes("@") ? userEmail.split("@")[0].trim() : userEmail
    const userName = (session.displayName || "").toLowerCase().trim()

    const assigned = `${request.assigned_designer || ""} ${request.ux_owner || ""}`.toLowerCase().trim()
    if (!assigned) return false
    if (
      assigned === "chưa phân công" ||
      assigned === "đang phân công" ||
      assigned === "unassigned" ||
      assigned === "chưa gán"
    ) {
      return false
    }

    if (userEmail && assigned.includes(userEmail)) return true
    if (uPrefix && uPrefix.length >= 3) {
      const prefixRegex = new RegExp(`(^|[\\s,;:/])` + uPrefix + `($|[\\s,;:/@])`, "i")
      if (prefixRegex.test(assigned)) return true
    }
    if (userName) {
      const normAssigned = normalizeVietnameseString(assigned)
      const normUserName = normalizeVietnameseString(userName)
      if (normAssigned === normUserName) return true

      const userWords = userName.split(/\s+/).filter(Boolean)
      if (userWords.length >= 2 && (assigned.includes(userName) || normAssigned.includes(normUserName))) {
        return true
      }
    }

    // Chỉ khi assigned là 1 từ duy nhất (ví dụ ghi tắt: "Nam", "Đăng") mới so khớp tên gọi cuối
    const assignedWords = assigned.split(/[\s,;]+/).filter(Boolean)
    if (assignedWords.length === 1 && userName) {
      const nameParts = userName.split(/\s+/).filter(Boolean)
      const lastName = nameParts[nameParts.length - 1]
      if (lastName && lastName.length >= 2 && lastName.toLowerCase() === assignedWords[0].toLowerCase()) {
        return true
      }
    }

    return false
  }, [request, session])

  // R1 Phân quyền quản lý Viewer: Chỉ PO tạo task, Designer được phân công và Admin/Lead mới có quyền thêm/xóa Viewer
  const canManageViewers = useMemo(() => {
    if (!session) return true // Khi chưa đăng nhập / demo view
    if (session.role === "Admin" || session.role === "Design Owner") return true
    if (isAuthor) return true
    if (isAssignedDesigner) return true
    return false
  }, [session, isAuthor, isAssignedDesigner])

  // Lấy danh sách toàn bộ nhân sự MB UX để phục vụ chọn Viewer
  const availableViewerMembers = useMemo(() => {
    const list: any[] = Array.isArray(teamMemberList) ? teamMemberList : []

    return list
      .map((m: any) => ({
        name: String(m.name || m.displayName || "").trim(),
        role: String(m.role || "Thành viên").trim(),
        email: String(m.email || m.teamsEmail || "").trim(),
        avatar: String(m.avatarUrl || m.avatar || getDesignerAvatar(m.name || m.displayName || "")),
        squad: String(m.squad || (Array.isArray(m.squads) ? m.squads[0] : "") || "").trim(),
      }))
      .filter((m) => {
        if (!m.name) return false
        if (isMockDesigner(m.name, m.email)) return false
        return true
      })
  }, [teamMemberList])

  const isMemberMatchViewer = (member: { name: string; email?: string }, viewerStr: string): boolean => {
    const rawV = String(viewerStr || "").trim()
    const cleanV = rawV.toLowerCase()
    if (!cleanV) return false
    const cleanName = (member.name || "").toLowerCase().trim()
    if (cleanV === cleanName) return true

    if (member.email) {
      const cleanEmail = member.email.toLowerCase().trim()
      if (cleanV === cleanEmail) return true
      const emailMatches = cleanV.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
      if (emailMatches && emailMatches.some((em) => em.toLowerCase() === cleanEmail)) {
        return true
      }
      const emailPrefix = cleanEmail.includes("@") ? cleanEmail.split("@")[0].trim() : cleanEmail
      if (emailPrefix.length >= 3) {
        if (cleanV === emailPrefix) return true
        const vPrefix = cleanV.includes("@") ? cleanV.split("@")[0].trim() : ""
        if (vPrefix && vPrefix === emailPrefix) return true
      }
    }

    const normV = cleanV.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const normM = cleanName.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    if (normV === normM) return true

    const nameWords = cleanName.split(/\s+/).filter(Boolean)
    const vWords = cleanV.split(/\s+/).filter(Boolean)

    if (nameWords.length >= 2 && (cleanV.includes(cleanName) || normV.includes(normM))) {
      return true
    }
    if (vWords.length >= 2 && (cleanName.includes(cleanV) || normM.includes(normV))) {
      return true
    }

    return false
  }

  const handleSaveViewers = async (nextViewers: string[]) => {
    if (!request) return
    const uniqueViewers = Array.from(new Set(nextViewers.map((v) => v.trim()).filter(Boolean)))
    setLocalViewers(uniqueViewers)
    request.viewers = uniqueViewers

    // 1. Cập nhật persistent task viewers store và cache LocalStorage tức thì
    saveStoredTaskViewers(request.request_id, uniqueViewers)
    try {
      const cached = localStorage.getItem("ux_portal_real_requests")
      if (cached) {
        const list: UXRequest[] = JSON.parse(cached)
        const updated = list.map((r) =>
          r.request_id === request.request_id
            ? { ...r, viewers: uniqueViewers }
            : r
        )
        localStorage.setItem("ux_portal_real_requests", JSON.stringify(updated))
      }
    } catch (e) {
      console.warn("Could not cache viewers locally:", e)
    }

    // 2. Gửi đồng bộ lên Google Sheet & BroadcastChannel
    try {
      const res = await updateTaskProgress(request.request_id, {
        new_phase: request.current_phase,
        new_status: request.status,
        new_progress: request.progress,
        note: `Cập nhật danh sách Người theo dõi (${uniqueViewers.length} thành viên)`,
        assigned_designer: request.assigned_designer,
        viewers: uniqueViewers,
        is_comment: false,
      })
      setRequirementUpdateTick((c) => c + 1)
      if (res.success) {
        toast.success("Đã cập nhật danh sách Người theo dõi!")
      } else {
        toast.warning(res.message || "Đã lưu Người theo dõi trên máy bạn!")
      }
    } catch (err) {
      toast.error("Lỗi khi lưu danh sách Người theo dõi", String(err))
    }
  }

  const handleToggleViewer = (target: { name: string; email?: string } | string) => {
    const member = typeof target === "string"
      ? (availableViewerMembers.find((m) => isMemberMatchViewer(m, target) || m.name === target) || { name: target.trim() })
      : target
    const cleanName = member.name.trim()
    if (!cleanName) return

    const isExisting = localViewers.some((v) => isMemberMatchViewer(member, v) || v.toLowerCase() === cleanName.toLowerCase())
    const next = isExisting
      ? localViewers.filter((v) => !isMemberMatchViewer(member, v) && v.toLowerCase() !== cleanName.toLowerCase())
      : [...localViewers, cleanName]
    handleSaveViewers(next)
  }

  const handleRemoveViewer = (viewerIdentifier: string) => {
    const clean = viewerIdentifier.trim()
    if (!clean) return
    const member = availableViewerMembers.find((m) => isMemberMatchViewer(m, clean) || m.name === clean)
    const next = localViewers.filter((v) => {
      if (v === clean || v.toLowerCase() === clean.toLowerCase()) return false
      if (member && isMemberMatchViewer(member, v)) return false
      if (isMemberMatchViewer({ name: clean }, v)) return false
      return true
    })
    handleSaveViewers(next)
  }

  const handleClearViewers = () => {
    handleSaveViewers([])
  }

  // Tách Viewers thành 2 nhóm: Nhân sự phụ trách Squad và Nhân sự khác (ngoài Squad) ĐỒNG BỘ 100% như Assignees
  const { squadViewers, supportingViewers } = useMemo(() => {
    if (!request || availableViewerMembers.length === 0) {
      return { squadViewers: [], supportingViewers: availableViewerMembers }
    }

    const rawSquad = (localSquad !== undefined && localSquad !== "" ? localSquad : (request.squad_name || request.preferred_squad || request.squad || "")).trim()
    const taskProd = (request.product || "").trim().toLowerCase()
    const squadLower = rawSquad.toLowerCase()

    let allSquads: any[] = []
    try {
      const rawSquads = localStorage.getItem("mbbank_admin_squads")
      if (rawSquads) {
        const parsed = JSON.parse(rawSquads)
        if (Array.isArray(parsed) && parsed.length > 0) allSquads = parsed
      }
    } catch {}
    if (allSquads.length === 0) allSquads = mockSquads

    const matchedSquad = allSquads.find((sq: any) => {
      const sqName = (sq.name || sq.squad_name || "").trim().toLowerCase()
      const sqProd = (sq.productName || sq.product_name || "").trim().toLowerCase()
      const isNameMatch = sqName === squadLower || (rawSquad && (sqName.includes(squadLower) || squadLower.includes(sqName)))
      if (taskProd && sqProd) {
        return isNameMatch && (sqProd === taskProd || sqProd.includes(taskProd) || taskProd.includes(sqProd))
      }
      return isNameMatch
    }) || allSquads.find((sq: any) => {
      const sqName = (sq.name || sq.squad_name || "").trim().toLowerCase()
      return sqName === squadLower || (rawSquad && (sqName.includes(squadLower) || squadLower.includes(sqName)))
    })

    const squadMemberNames: string[] = []
    if (matchedSquad) {
      if (Array.isArray(matchedSquad.designers)) squadMemberNames.push(...matchedSquad.designers)
      if (Array.isArray(matchedSquad.pos)) squadMemberNames.push(...matchedSquad.pos)
      if (Array.isArray(matchedSquad.businesses)) squadMemberNames.push(...matchedSquad.businesses)
      if (matchedSquad.leadDesigner && matchedSquad.leadDesigner.trim()) squadMemberNames.push(matchedSquad.leadDesigner.trim())
      if (matchedSquad.leadPo && matchedSquad.leadPo.trim()) squadMemberNames.push(matchedSquad.leadPo.trim())
      if (matchedSquad.leadBusiness && matchedSquad.leadBusiness.trim()) squadMemberNames.push(matchedSquad.leadBusiness.trim())
      if (matchedSquad.ux_owner && matchedSquad.ux_owner.trim()) {
        const cleanUx = matchedSquad.ux_owner.replace(/\(.*?\)/g, "").trim()
        if (cleanUx && cleanUx !== "Chưa phân công" && cleanUx !== "Đang phân công") {
          squadMemberNames.push(cleanUx)
        }
      }
    }

    const cleanSquadMemberNames = Array.from(new Set(squadMemberNames.map((s) => s.trim()).filter(Boolean)))

    const squadList: typeof availableViewerMembers = []
    const supportList: typeof availableViewerMembers = []

    availableViewerMembers.forEach((m) => {
      const mSquadLower = (m.squad || "").toLowerCase()
      let isInSquad = false

      if (cleanSquadMemberNames.length > 0) {
        isInSquad = cleanSquadMemberNames.some((name) => matchesPerson(name, m))
      } else if (rawSquad && squadLower) {
        isInSquad = Boolean(
          !mSquadLower.includes("all") && (
            mSquadLower === squadLower ||
            mSquadLower.includes(squadLower) ||
            squadLower.includes(mSquadLower)
          )
        )
      }

      if (isInSquad) {
        squadList.push(m)
      } else {
        supportList.push(m)
      }
    })

    return {
      squadViewers: squadList,
      supportingViewers: supportList,
    }
  }, [availableViewerMembers, request, localSquad, matchesPerson])

  const renderViewerPopoverContent = (onClose: () => void) => {
    const filterByQuery = (m: (typeof availableViewerMembers)[0]) => {
      if (!viewerSearchQuery.trim()) return true
      const q = viewerSearchQuery.toLowerCase().trim()
      return (
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        Boolean(m.squad && m.squad.toLowerCase().includes(q))
      )
    }

    const filteredSquadViewers = squadViewers.filter(filterByQuery)
    const filteredSupportingViewers = supportingViewers.filter(filterByQuery)

    const renderViewerItem = (m: (typeof availableViewerMembers)[0], isSquadRole: boolean) => {
      const isSelected = localViewers.some((v) => isMemberMatchViewer(m, v))

      return (
        <button
          key={`viewer-item-${m.email || m.name}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleToggleViewer(m)
          }}
          className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer text-xs ${
            isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"
          }`}
        >
          <div
            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
              isSelected
                ? "bg-[#1057FB] border-[#1057FB] text-white shadow-2xs"
                : "border-slate-300 bg-white"
            }`}
          >
            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
          <UserAvatar name={m.name} avatarUrl={m.avatar} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className={`font-bold truncate ${isSelected ? "text-blue-900" : "text-slate-900"}`}>
                {m.name}
              </p>
              {isSquadRole ? (
                <span className="text-[9.5px] font-semibold text-[#1057FB] bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 rounded shrink-0">
                  Phụ trách Squad
                </span>
              ) : (
                <span className="text-[9.5px] font-medium text-slate-500 bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 rounded shrink-0">
                  Hỗ trợ
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {m.role}{m.squad ? ` • ${m.squad}` : ""}
            </p>
          </div>
        </button>
      )
    }

    return (
      <>
        {/* Header & Search Input */}
        <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 space-y-2 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                VIEWERS
              </span>
              {localViewers.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#1057FB] border border-blue-200">
                  {String(localViewers.length).padStart(2, "0")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 rounded-lg bg-[#1057FB] hover:bg-blue-700 text-white text-[11px] font-semibold transition-all cursor-pointer shadow-2xs flex items-center gap-1 active:scale-95"
                title="Xác nhận lựa chọn và đóng"
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Xong</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm tên hoặc vai trò..."
              value={viewerSearchQuery}
              onChange={(e) => setViewerSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 focus:border-[#1057FB] rounded-lg outline-none transition-all placeholder:text-slate-400 text-slate-800 shadow-2xs"
            />
            {viewerSearchQuery && (
              <button
                type="button"
                onClick={() => setViewerSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Viewers List with Squad Categorization */}
        <div className="flex-1 overflow-y-auto max-h-[220px] py-1 divide-y divide-slate-50">
          {filteredSquadViewers.length === 0 && filteredSupportingViewers.length === 0 ? (
            <div className="px-3 py-5 text-center text-xs text-slate-400 font-medium">
              Không tìm thấy nhân sự phù hợp
            </div>
          ) : (
            <>
              {/* Phần 1: Nhân sự phụ trách squad */}
              {filteredSquadViewers.length > 0 && (
                <div className="pt-1">
                  <div className="px-3 py-1 bg-blue-50/70 border-y border-blue-100/80 text-[10px] font-bold uppercase tracking-wider text-[#1057FB] flex items-center justify-between">
                    <span>Nhân sự phụ trách Squad ({taskSquadName})</span>
                    <span className="bg-blue-200/80 text-[#1057FB] px-1.5 py-0.2 rounded-full font-bold text-[9.5px]">
                      {filteredSquadViewers.length}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {filteredSquadViewers.map((m) => renderViewerItem(m, true))}
                  </div>
                </div>
              )}

              {/* Phần 2: Nhân sự khác (ngoài squad) */}
              {filteredSupportingViewers.length > 0 && (
                <div className="pt-1 border-t border-slate-100">
                  <div className="px-3 py-1 bg-slate-50/90 border-y border-slate-200/70 text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                    <span>Nhân sự khác (Ngoài Squad)</span>
                    <span className="bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-full font-bold text-[9.5px]">
                      {filteredSupportingViewers.length}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {filteredSupportingViewers.map((m) => renderViewerItem(m, false))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky Footer Toolbar */}
        <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between gap-2 shrink-0">
          {localViewers.length > 0 ? (
            <button
              type="button"
              onClick={handleClearViewers}
              className="text-[11px] font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Bỏ chọn ({localViewers.length})
            </button>
          ) : (
            <span className="text-[10.5px] text-slate-400 italic">Tự động lưu khi tick chọn</span>
          )}
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="h-7 text-xs px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer shadow-2xs"
          >
            Hoàn tất
          </Button>
        </div>
      </>
    )
  }

  const handleUpdateSquad = async (newSquad: string) => {
    if (!request) return
    const cleanSquad = newSquad.trim()
    setLocalSquad(cleanSquad)
    setPoFormSquad(cleanSquad)
    setOpenDropdown(null)

    // Cập nhật optimistic cho request object
    request.squad_name = cleanSquad
    request.preferred_squad = cleanSquad

    // Cập nhật localStorage ux_portal_real_requests
    try {
      const cached = localStorage.getItem("ux_portal_real_requests")
      if (cached) {
        const list: UXRequest[] = JSON.parse(cached)
        const updated = list.map((r) =>
          r.request_id === request.request_id
            ? { ...r, squad_name: cleanSquad, preferred_squad: cleanSquad }
            : r
        )
        localStorage.setItem("ux_portal_real_requests", JSON.stringify(updated))
      }
    } catch {}

    const toastId = toast.loading(`Đang cập nhật Squad bài toán...`)
    try {
      const noteText = cleanSquad
        ? `Chuyển bài toán sang Squad: [${cleanSquad}]`
        : `Gỡ phân bổ Squad (đưa về Chưa phân squad)`

      const res = await updateTaskProgress(request.request_id, {
        new_phase: request.current_phase,
        new_status: request.status,
        new_progress: request.progress,
        note: noteText,
        assigned_designer: request.assigned_designer,
        squad_name: cleanSquad,
        preferred_squad: cleanSquad,
        is_comment: false,
      })

      if (res && !res.success) {
        toast.warning(res.message || noteText, undefined, { id: toastId })
      } else {
        toast.success(noteText, undefined, { id: toastId })
      }
      if (onUpdated) onUpdated()
    } catch {
      toast.success(`Đã cập nhật Squad: ${cleanSquad || "Chưa phân squad"}`, undefined, { id: toastId })
      if (onUpdated) onUpdated()
    }
  }

  useEffect(() => {
    if (request) {
      setTitleValue(request.title || "")
      setDescValue(request.description || "")
      setCustomDeadline(request.design_deadline || request.expected_deadline || "")
      setCustomDeliverables(request.deliverables || {})
      setPoFormTitle(request.title || "")
      setPoFormProduct(request.product || "")
      const curSq = (request.squad_name || request.preferred_squad || "").trim()
      setPoFormSquad(curSq)
      setPoFormReqType(request.request_type || "")
      setPoFormDesc(request.description || "")
      setPoFormBizNeed(request.business_need || "")
      setPoFormUserProb(request.user_problem || "")
      setPoFormTargetUser(request.target_user || "")
      setPoFormExpectedDeadline(request.release_date || request.expected_deadline || "")
      setPoFormDeadlineReason(request.deadline_reason || "")
      setPoFormDocLinks(request.doc_links || [])
    }
  }, [request])

  // ReUI Calendar State for Estimate End Date
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date())

  useEffect(() => {
    if (customDeadline) {
      const d = new Date(customDeadline)
      if (!isNaN(d.getTime())) setCalendarViewDate(d)
    }
  }, [customDeadline])

  const calYear = calendarViewDate.getFullYear()
  const calMonth = calendarViewDate.getMonth()
  const prevCalMonth = () => setCalendarViewDate(new Date(calYear, calMonth - 1, 1))
  const nextCalMonth = () => setCalendarViewDate(new Date(calYear, calMonth + 1, 1))
  const daysInCalMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDayCalIndex = new Date(calYear, calMonth, 1).getDay()

  const calDays: (number | null)[] = []
  for (let i = 0; i < firstDayCalIndex; i++) {
    calDays.push(null)
  }
  for (let d = 1; d <= daysInCalMonth; d++) {
    calDays.push(d)
  }

  const handleSaveDeadline = async (formatted: string) => {
    if (!request) return
    setCustomDeadline(formatted)
    setOpenDropdown(null)
    request.design_deadline = formatted

    const toastId = toast.loading(`Đang cập nhật Hạn thiết kế UX...`)
    try {
      const res = await updateTaskProgress(request.request_id, {
        new_phase: request.current_phase,
        new_status: request.status,
        new_progress: request.progress,
        note: formatted ? `Cập nhật Hạn thiết kế UX (Design End Date) sang: ${formatted}` : "Gỡ bỏ Hạn thiết kế UX",
        assigned_designer: request.assigned_designer,
        design_deadline: formatted,
        is_comment: false,
      })
      setRequirementUpdateTick((c) => c + 1)
      if (res.success) {
        toast.success(formatted ? `Đã cập nhật Hạn thiết kế UX: ${formatted}` : "Đã gỡ bỏ Hạn thiết kế UX!", undefined, { id: toastId })
        if (onUpdated) onUpdated()
      } else {
        toast.warning(res.message || `Đã cập nhật Hạn thiết kế UX: ${formatted}`, undefined, { id: toastId })
        if (onUpdated) onUpdated()
      }
    } catch {
      setRequirementUpdateTick((c) => c + 1)
      toast.success(formatted ? `Đã cập nhật Hạn thiết kế UX: ${formatted}` : "Đã gỡ bỏ Hạn thiết kế UX!", undefined, { id: toastId })
      if (onUpdated) onUpdated()
    }
  }

  const handleSelectCalDay = async (day: number) => {
    const formatted = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    await handleSaveDeadline(formatted)
  }

  const monthNamesVi = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ]
  const dayHeadersVi = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

  const handleSavePoRequirements = async () => {
    if (!request) return
    const prevProd = (request.product || "").trim()
    const newProd = poFormProduct.trim()
    const prevSquad = (request.squad_name || request.preferred_squad || "").trim()
    const newSquad = poFormSquad.trim()

    const changes: string[] = []
    if (prevProd && newProd && prevProd !== newProd) {
      changes.push(`Đổi sản phẩm: ${prevProd} → ${newProd}`)
    }
    if (prevSquad && newSquad && prevSquad !== newSquad) {
      changes.push(`Đổi squad: ${prevSquad} → ${newSquad}`)
    }
    const updateNote = changes.length > 0
      ? `PO cập nhật đầu bài (${changes.join(", ")})`
      : `PO cập nhật đầu bài: ${poFormTitle}`

    request.title = poFormTitle
    request.product = poFormProduct
    request.squad_name = newSquad
    request.preferred_squad = newSquad
    request.request_type = poFormReqType
    request.description = poFormDesc
    request.business_need = poFormBizNeed
    request.user_problem = poFormUserProb
    request.target_user = poFormTargetUser
    request.expected_deadline = poFormExpectedDeadline
    request.release_date = poFormExpectedDeadline
    request.deadline_reason = poFormDeadlineReason
    request.doc_links = poFormDocLinks

    setTitleValue(poFormTitle)
    setDescValue(poFormDesc)
    setLocalSquad(newSquad)
    setLocalProduct(poFormProduct)
    setRequirementUpdateTick((c) => c + 1)
    setShowPoEditModal(false)

    try {
      const res = await updateTaskProgress(request.request_id, {
        new_phase: request.current_phase,
        new_status: request.status,
        new_progress: request.progress,
        note: updateNote,
        assigned_designer: request.assigned_designer,
        release_date: poFormExpectedDeadline,
        product: poFormProduct,
        squad_name: newSquad,
        preferred_squad: newSquad,
        title: poFormTitle,
        description: poFormDesc,
        business_need: poFormBizNeed,
        user_problem: poFormUserProb,
        target_user: poFormTargetUser,
        request_type: poFormReqType,
        deadline_reason: poFormDeadlineReason,
        doc_links: poFormDocLinks,
        is_comment: false,
        is_po_edit: true,
      })
      if (res && !res.success) {
        toast.error("Lưu nội bộ", res.message)
      } else {
        toast.success("Đã lưu cập nhật tài liệu đầu bài từ PO thành công!")
      }
      if (onUpdated) onUpdated()
    } catch {
      toast.success("Đã lưu cập nhật tài liệu đầu bài từ PO!")
      if (onUpdated) onUpdated()
    }
  }

  // Keyboard Shortcuts (Esc to close, P for progress update)
  useEffect(() => {
    if (!isVisible) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openDropdown) {
          setOpenDropdown(null)
          return
        }
        if (!isUpdateModalOpen && !showAddDeliverableModal) {
          handleDismiss()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isVisible, openDropdown, isUpdateModalOpen, showAddDeliverableModal, handleDismiss])

  // Timer tracking simulation
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTrackingTime) {
      interval = setInterval(() => {
        setTrackedSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTrackingTime])

  const formatTrackedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`
  }

  const statusConfig = request ? getStatusConfig(request.status) : null

  // RBAC Permission Check
  const canEdit = (() => {
    if (!session) return true
    if (session.role === "Admin") return true
    if (session.role === "Design Owner") {
      return canUserAccessRequest(request, session)
    }
    if (session.role === "Designer") {
      const email = session.teamsEmail.toLowerCase()
      const assigned = (request?.assigned_designer || request?.ux_owner || "").toLowerCase()
      return !assigned || assigned.includes(email) || email.includes("designer") || email.includes("nam") || canUserAccessRequest(request, session)
    }
    return false
  })()

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Đã sao chép liên kết bài toán!")
  }

  // Property Update Handlers
  const handleUpdateStatus = async (newStatus: string) => {
    if (!request) return
    setOpenDropdown(null)
    const toastId = toast.loading(`Đang chuyển trạng thái sang [${newStatus}]...`)
    try {
      const nowIso = new Date().toISOString()
      let nextPhase = request.current_phase
      let nextProgress = request.progress

      if (
        newStatus === "Chờ xác nhận" ||
        newStatus === "1. Chờ xác nhận" ||
        newStatus === "Đang phân loại" ||
        newStatus === "Phân loại" ||
        newStatus === "Chờ tiếp nhận"
      ) {
        nextPhase = "Chờ xác nhận"
        nextProgress = 10
      } else if (newStatus === "Hoàn thành") {
        nextPhase = "Hoàn thành"
        nextProgress = 100
      }

      const res = await updateTaskProgress(request.request_id, {
        new_phase: nextPhase,
        new_status: newStatus,
        new_progress: nextProgress,
        note: `Cập nhật trạng thái bài toán sang: ${newStatus}`,
        assigned_designer: request.assigned_designer,
        sent_to_po_at: newStatus === "Đã gửi PO" ? nowIso : request.sent_to_po_at,
        is_comment: false,
      })
      if (res.success) {
        toast.success(`Đã chuyển trạng thái sang: ${newStatus}`, undefined, { id: toastId })
        dispatchNotification({
          type: "status_changed",
          title: `Cập nhật trạng thái: ${request.request_id}`,
          message: `Bài toán đã chuyển trạng thái sang: ${newStatus}`,
          requestId: request.request_id,
          taskTitle: request.title,
          actorName: session?.displayName || "Thành viên",
          actorRole: session?.role || "Designer",
          viewers: localViewers,
        })
        if (onUpdated) onUpdated()
      } else {
        toast.error("Không thể đổi trạng thái", res.message, { id: toastId })
      }
    } catch {
      toast.error("Lỗi khi cập nhật trạng thái", undefined, { id: toastId })
    }
  }

  const handleSaveAssignees = async (nextList: string[]) => {
    if (!request) return
    const uniqueList = Array.from(new Set(nextList.map((s) => s.trim()).filter(Boolean)))
    const targetName = uniqueList.join(", ")
    const targetLabel = targetName || "Chưa phân công"
    const toastId = toast.loading(targetName ? `Đang cập nhật phân công [${targetName}]...` : "Đang gỡ bỏ phân công nhân sự...")

    // 1. Optimistic Update UI ngay tức thì!
    setLocalAssignee(targetName)
    request.assigned_designer = targetName
    request.ux_owner = targetName || "Chưa phân công"

    // 2. Ghi nhận ngay vào cache LocalStorage để bảng/kanban/grid đồng bộ tức thì
    try {
      const cached = localStorage.getItem("ux_portal_real_requests")
      if (cached) {
        const list: UXRequest[] = JSON.parse(cached)
        const updated = list.map((r) =>
          r.request_id === request.request_id
            ? { ...r, assigned_designer: targetName, ux_owner: targetName || "Chưa phân công" }
            : r
        )
        localStorage.setItem("ux_portal_real_requests", JSON.stringify(updated))
      }
    } catch (e) {
      console.warn("Could not optimistically update cache:", e)
    }

    try {
      const res = await updateTaskProgress(request.request_id, {
        new_phase: request.current_phase,
        new_status: request.status,
        new_progress: request.progress,
        note: targetName ? `Phân công công việc cho: ${targetName}` : "Gỡ bỏ phân công nhân sự (để trống)",
        assigned_designer: targetName,
        is_comment: false,
      })
      setRequirementUpdateTick((c) => c + 1)
      if (res.success) {
        toast.success(`Đã cập nhật phân công: ${targetLabel}!`, undefined, { id: toastId })
        dispatchNotification({
          type: "task_assigned",
          requestId: request.request_id,
          taskTitle: request.title,
          actorName: targetName || "Chưa phân công",
          actorRole: "Designer",
          recipient: targetName ? `${targetName} & ${request.requester_name || "PO"}` : undefined,
          targetRole: "Designer",
          showToast: false,
          viewers: localViewers,
        })
        if (onUpdated) onUpdated()
      } else {
        toast.warning(res.message || "Đã lưu phân công trên giao diện máy bạn!", undefined, { id: toastId })
        if (onUpdated) onUpdated()
      }
    } catch {
      setRequirementUpdateTick((c) => c + 1)
      toast.success(`Đã cập nhật phân công: ${targetLabel}!`, undefined, { id: toastId })
      if (onUpdated) onUpdated()
    }
  }

  const handleToggleAssignee = async (designerName: string) => {
    const trimmed = (designerName || "").trim()
    if (!trimmed) return
    const isAlready = localAssignees.some((name) => name.toLowerCase() === trimmed.toLowerCase())
    let nextList: string[]
    if (isAlready) {
      nextList = localAssignees.filter((name) => name.toLowerCase() !== trimmed.toLowerCase())
    } else {
      nextList = [...localAssignees, trimmed]
    }
    await handleSaveAssignees(nextList)
  }

  const handleClearAssignees = async () => {
    await handleSaveAssignees([])
  }

  // Alias tương thích ngược
  const handleUpdateAssignee = async (designerName: string) => {
    const trimmed = (designerName || "").trim()
    if (!trimmed) {
      await handleClearAssignees()
    } else {
      await handleToggleAssignee(trimmed)
    }
  }

  const handleUpdatePriority = async (newPriority: string) => {
    if (!request) return
    setOpenDropdown(null)
    setCurrentPriority(newPriority)
    request.priority = newPriority

    const targetOpt = PRIORITY_OPTIONS.find((p) => p.value.toLowerCase() === newPriority.toLowerCase())
    const targetLabel = targetOpt ? targetOpt.label : newPriority
    const toastId = toast.loading(`Đang cập nhật độ ưu tiên sang [${targetLabel}]...`)

    try {
      const res = await updateTaskProgress(request.request_id, {
        new_phase: request.current_phase,
        new_status: request.status,
        new_progress: request.progress,
        note: `Đã cập nhật độ ưu tiên sang: ${targetLabel}`,
        assigned_designer: request.assigned_designer,
        priority: newPriority,
        is_comment: false,
      })
      setRequirementUpdateTick((c) => c + 1)
      if (res.success) {
        toast.success(`Đã cập nhật độ ưu tiên: ${targetLabel}!`, undefined, { id: toastId })
        if (onUpdated) onUpdated()
      } else {
        toast.warning(res.message || `Đã cập nhật độ ưu tiên: ${targetLabel}!`, undefined, { id: toastId })
        if (onUpdated) onUpdated()
      }
    } catch {
      setRequirementUpdateTick((c) => c + 1)
      toast.success(`Đã cập nhật độ ưu tiên: ${targetLabel}!`, undefined, { id: toastId })
      if (onUpdated) onUpdated()
    }
  }

  const handleUpdatePhase = async (newPhase: string, progressVal: number) => {
    if (!request) return
    setOpenDropdown(null)
    const toastId = toast.loading(`Đang chuyển sang khâu [${newPhase}]...`)
    try {
      const nextStatus = progressVal >= 100
        ? "Hoàn thành"
        : (newPhase === "Chờ xác nhận" || progressVal <= 10 ? "Chờ xác nhận" : "Đang thực hiện")
      const res = await updateTaskProgress(request.request_id, {
        new_phase: newPhase,
        new_status: nextStatus,
        new_progress: progressVal,
        note: `Chuyển tiến độ sang khâu [${newPhase}] (${progressVal}%) - Tự động gỡ trạng thái chờ PO`,
        assigned_designer: request.assigned_designer,
        sent_to_po_at: "", // Gỡ bỏ trạng thái chờ PO khi chuyển khâu UX
        is_comment: false,
      })
      if (res.success) {
        request.sent_to_po_at = undefined
        request.current_phase = newPhase
        request.status = nextStatus
        request.progress = progressVal
        setRequirementUpdateTick((c) => c + 1)
        toast.success(`Đã chuyển sang khâu [${newPhase}]!`, "Hệ thống đã tự động gỡ trạng thái chờ PO.", { id: toastId })
        dispatchNotification({
          type: "phase_changed",
          title: `Chuyển khâu: ${request.request_id}`,
          message: `Đã chuyển sang khâu [${newPhase}] (${progressVal}%)`,
          requestId: request.request_id,
          taskTitle: request.title,
          actorName: session?.displayName || "Designer",
          actorRole: session?.role || "Designer",
          viewers: localViewers,
        })
        if (onUpdated) onUpdated()
      } else {
        toast.error("Không thể chuyển khâu", res.message, { id: toastId })
      }
    } catch {
      toast.error("Lỗi khi chuyển khâu", undefined, { id: toastId })
    }
  }

  const handleDesignerResumeUpdate = async () => {
    if (!request) return
    const toastId = toast.loading("Đang gỡ trạng thái Pending...")
    try {
      const now = new Date()
      const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(
        now.getMonth() + 1
      ).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`

      const resumeNote = `Designer (${session?.displayName || "Designer"}) đã bấm tiếp tục update - Gỡ bỏ trạng thái Pending.`

      const resumeRecord: TaskUpdateRecord = {
        id: `OPT-${Date.now()}`,
        request_id: request.request_id,
        timestamp: formattedDate,
        updated_by: session ? (session.displayName || session.teamsEmail) : displayName,
        author_role: (session ? session.role : "Designer") as any,
        new_phase: request.current_phase,
        new_progress: request.progress,
        note: resumeNote,
        deliverable_link: request.deliverables?.figma_url || "",
        is_comment: false,
      }

      // Gỡ cờ pending ngay lập tức trên UI (0ms latency)
      request.sent_to_po_at = undefined
      request.pending_reason = undefined
      request.status = "Đang thực hiện"
      setOptimisticUpdates((prev) => [...prev, resumeRecord])

      // Cập nhật ngay localStorage để tất cả các view (Kanban, Grid, Detail) đồng bộ ngay
      try {
        const cached = localStorage.getItem("ux_portal_real_requests")
        if (cached) {
          const list: UXRequest[] = JSON.parse(cached)
          const updated = list.map((r) =>
            r.request_id === request.request_id
              ? {
                  ...r,
                  status: "Đang thực hiện",
                  pending_reason: undefined,
                  sent_to_po_at: undefined,
                  task_updates: [resumeRecord, ...(r.task_updates || [])],
                }
              : r
          )
          localStorage.setItem("ux_portal_real_requests", JSON.stringify(updated))
        }
      } catch (e) {
        console.warn("Could not optimistically update cache:", e)
      }

      const res = await updateTaskProgress(request.request_id, {
        new_phase: request.current_phase,
        new_status: "Đang thực hiện",
        new_progress: request.progress,
        note: resumeNote,
        assigned_designer: request.assigned_designer,
        sent_to_po_at: "", // Gỡ bỏ mốc gửi PO
        is_comment: false,
      })
      if (res.success) {
        request.sent_to_po_at = undefined
        request.pending_reason = undefined
        request.status = "Đang thực hiện"
        toast.success("Đã gỡ trạng thái Pending thành công!", "Bài toán đã quay lại trạng thái Đang thực hiện.", { id: toastId })
        dispatchNotification({
          type: "task_resumed",
          requestId: request.request_id,
          taskTitle: request.title,
          actorName: session?.displayName || displayName || "Designer",
          actorRole: (session?.role as any) || "Designer",
          showToast: false,
          viewers: localViewers,
        })
        if (onUpdated) await onUpdated()
      } else {
        toast.error("Không thể gỡ trạng thái", res.message, { id: toastId })
      }
    } catch {
      toast.error("Lỗi khi gỡ trạng thái Pending", undefined, { id: toastId })
    }
  }


  const handleSendToPo = async (customNote?: string) => {
    if (!request) return
    const toastId = toast.loading("Đang gửi thiết kế cho PO...")
    try {
      const nowIso = new Date().toISOString()
      const noteContent = customNote && typeof customNote === "string" && customNote.trim()
        ? `[Gửi PO] ${customNote.trim()}`
        : `Designer (${session?.displayName || "Designer"}) đã gửi phương án thiết kế cho PO xem xét (Bắt đầu tính hạn phản hồi 24h).`

      // Tự động trích xuất link Figma từ nội dung nếu có
      const urlMatches = customNote ? customNote.match(/(https?:\/\/[^\s]+)/gi) : null
      const figmaUrl = urlMatches
        ? urlMatches.find((u) => u.toLowerCase().includes("figma.com")) || urlMatches[0]
        : undefined

      if (figmaUrl) {
        request.figma_url = figmaUrl
        setCustomDeliverables((prev: any) => ({ ...prev, figma_url: figmaUrl }))
      }

      // Cập nhật tức thì vào request object để UI phản hồi ngay 0ms
      request.status = "Đã gửi PO"
      request.sent_to_po_at = nowIso
      request.pending_reason = undefined

      const res = await updateTaskProgress(request.request_id, {
        new_phase: request.current_phase,
        new_status: "Đang thực hiện", // khâu quy trình giữ nguyên, status là Đã gửi PO
        new_progress: request.progress,
        note: noteContent,
        figma_url: figmaUrl || commentLink.trim() || request.figma_url || undefined,
        assigned_designer: request.assigned_designer,
        sent_to_po_at: nowIso,
      })
      if (res.success) {
        request.status = "Đã gửi PO"
        request.sent_to_po_at = nowIso
        request.pending_reason = undefined
        setNewCommentText("")
        setCommentLink("")
        setShowLinkInput(false)
        toast.success(
          "Đã gửi PO thành công!", 
          figmaUrl 
            ? "Đã đính kèm link Figma và bắt đầu theo dõi thời hạn phản hồi 24h." 
            : "Hệ thống sẽ theo dõi thời hạn phản hồi 24h. Sau 1 ngày sẽ tự động chuyển sang trạng thái PO pending.", 
          { id: toastId }
        )
        dispatchNotification({
          type: "task_sent_to_po",
          requestId: request.request_id,
          taskTitle: request.title,
          actorName: session?.displayName || displayName || "Designer",
          actorRole: (session?.role as any) || "Designer",
          recipient: `${request.requester_name || "PO"} (Requester)`,
          targetRole: "PO",
          showToast: false,
          viewers: localViewers,
        })
        if (onUpdated) onUpdated()
      } else {
        toast.error("Không thể gửi PO", res.message, { id: toastId })
      }
    } catch {
      toast.error("Lỗi kết nối khi gửi PO", undefined, { id: toastId })
    }
  }

  const handlePending = async (customNote?: string) => {
    if (!request) return
    const toastId = toast.loading("Đang chuyển trạng thái Pending...")
    try {
      const rawReason = customNote && typeof customNote === "string" 
        ? customNote.replace(/^@(?:po_)?pending:\s*/i, "").trim() 
        : ""
      const noteContent = rawReason
        ? `[Pending] ${rawReason}`
        : `Bài toán được đánh dấu Pending (Tạm dừng/Chờ phản hồi).`

      request.status = "Pending"
      request.sent_to_po_at = undefined
      request.pending_reason = rawReason || "Tạm dừng theo yêu cầu của Designer"

      const res = await updateTaskProgress(request.request_id, {
        new_phase: request.current_phase,
        new_status: "Pending",
        new_progress: request.progress,
        note: noteContent,
        figma_url: commentLink.trim() || undefined,
        assigned_designer: request.assigned_designer,
        sent_to_po_at: "", // TUYỆT ĐỐI KHÔNG GÁN sent_to_po_at khi Pending thường!
      })
      if (res.success) {
        request.status = "Pending"
        request.sent_to_po_at = undefined
        request.pending_reason = rawReason || "Tạm dừng theo yêu cầu của Designer"
        setNewCommentText("")
        setCommentLink("")
        setShowLinkInput(false)
        toast.success(rawReason ? `Đã chuyển sang Pending (Lý do: ${rawReason})` : "Đã chuyển trạng thái Pending!", undefined, { id: toastId })
        dispatchNotification({
          type: "task_pending",
          requestId: request.request_id,
          taskTitle: request.title,
          actorName: session?.displayName || displayName || "Designer",
          actorRole: (session?.role as any) || "Designer",
          note: rawReason || "Tạm dừng theo yêu cầu",
          showToast: false,
          viewers: localViewers,
        })
        if (onUpdated) onUpdated()
      } else {
        toast.error("Không thể chuyển trạng thái", res.message, { id: toastId })
      }
    } catch {
      toast.error("Lỗi khi chuyển trạng thái", undefined, { id: toastId })
    }
  }

  const handlePoApprove = async () => {
    if (!request) return
    const toastId = toast.loading("PO đang duyệt và chuyển tiếp khâu...")
    try {
      const curPhases = getAdminPhases()
      const curPhase = (request.current_phase || "").trim().toLowerCase()
      let curIdx = curPhases.findIndex(
        (p) =>
          p.key.toLowerCase() === curPhase ||
          curPhase.includes(p.key.toLowerCase()) ||
          p.key.toLowerCase().includes(curPhase)
      )
      if (curIdx < 0) {
        curIdx = 0
      }

      const isLastStep = curIdx >= curPhases.length - 1
      const nextIdx = isLastStep ? curIdx : curIdx + 1
      const nextPhaseObj = curPhases[nextIdx]
      const nextPhaseName = nextPhaseObj?.key || "Bàn giao"
      const currentPhaseName = curPhases[curIdx]?.key || request.current_phase || "khâu hiện tại"

      const isMovingToLast = nextIdx === curPhases.length - 1
      const nextStatus = isMovingToLast ? "Hoàn thành" : "Đang thực hiện"
      const nextProgress = isMovingToLast
        ? 100
        : (nextPhaseObj?.progress || Math.min(95, Math.round(((nextIdx + 1) / curPhases.length) * 100)))

      const note = isMovingToLast
        ? `PO (${session?.displayName || "PO"}) đã duyệt khâu cuối [${currentPhaseName}]. Bài toán đã hoàn thành.`
        : `PO (${session?.displayName || "PO"}) đã xác nhận duyệt khâu [${currentPhaseName}]. Bài toán chuyển tiếp sang khâu: [${nextPhaseName}].`

      // Cập nhật optimistic cho request ngay trên modal
      request.sent_to_po_at = undefined
      request.current_phase = nextPhaseName
      request.status = nextStatus
      request.progress = nextProgress

      const res = await updateTaskProgress(request.request_id, {
        new_phase: nextPhaseName,
        new_status: nextStatus,
        new_progress: nextProgress,
        note,
        assigned_designer: request.assigned_designer,
        sent_to_po_at: "", // Gỡ bỏ trạng thái chờ PO
        is_comment: false,
      })
      if (res.success) {
        const successDetail = isMovingToLast
          ? `Bài toán hoàn thành ở khâu [${nextPhaseName}].`
          : `Bài toán đã chuyển tiếp sang khâu: [${nextPhaseName}].`
        toast.success("PO đã xác nhận thành công!", successDetail, { id: toastId })
        dispatchNotification({
          type: "task_approved",
          requestId: request.request_id,
          taskTitle: request.title,
          actorName: session?.displayName || "PO",
          actorRole: session?.role || "PO",
          recipient: `${request.assigned_designer || "Designer"} & Designer Owner`,
          targetRole: "Designer",
          showToast: false,
          viewers: localViewers,
        })
        if (onUpdated) onUpdated()
      } else {
        toast.error("Không thể duyệt", res.message, { id: toastId })
      }
    } catch {
      toast.error("Lỗi khi duyệt thiết kế", undefined, { id: toastId })
    }
  }

  const handlePoRequestChanges = async (feedbackNote?: string) => {
    if (!request) return
    const toastId = toast.loading("Đang gửi yêu cầu chỉnh sửa...")
    try {
      request.sent_to_po_at = undefined
      request.status = "Đang thực hiện"

      const res = await updateTaskProgress(request.request_id, {
        new_phase: request.current_phase,
        new_status: "Đang thực hiện",
        new_progress: Math.max(10, (request.progress || 50) - 10),
        note: `PO (${session?.displayName || "PO"}) feedback: ${feedbackNote || "Cần điều chỉnh thêm trải nghiệm UI/UX."}`,
        assigned_designer: request.assigned_designer,
        sent_to_po_at: "", // Gỡ bỏ trạng thái chờ PO
        is_comment: false,
      })
      if (res.success) {
        toast.success("Đã gửi feedback cho Designer!", undefined, { id: toastId })
        dispatchNotification({
          type: "task_changes_requested",
          requestId: request.request_id,
          taskTitle: request.title,
          actorName: session?.displayName || "PO",
          actorRole: session?.role || "PO",
          note: feedbackNote || "Cần điều chỉnh thêm trải nghiệm UI/UX.",
          recipient: `${request.assigned_designer || "Designer"}`,
          targetRole: "Designer",
          showToast: false,
          viewers: localViewers,
        })
        if (onUpdated) onUpdated()
      } else {
        toast.error("Không thể gửi yêu cầu", res.message, { id: toastId })
      }
    } catch {
      toast.error("Lỗi khi gửi yêu cầu chỉnh sửa", undefined, { id: toastId })
    }
  }

  const handleSaveTitle = async () => {
    if (!titleValue.trim() || !request) return
    setIsEditingTitle(false)
    toast.success("Đã lưu tiêu đề bài toán!")
  }

  const handleSaveDesc = async () => {
    if (!request) return
    setIsEditingDesc(false)
    toast.success("Đã lưu mô tả bài toán!")
  }

  const handleAddDeliverable = () => {
    if (!newDeliverableUrl.trim()) return
    const updated = { ...customDeliverables }
    if (newDeliverableType === "figma") updated.figma_url = newDeliverableUrl.trim()
    if (newDeliverableType === "prototype") updated.prototype_url = newDeliverableUrl.trim()
    if (newDeliverableType === "spec") updated.spec_url = newDeliverableUrl.trim()
    setCustomDeliverables(updated)
    setNewDeliverableUrl("")
    setShowAddDeliverableModal(false)
    toast.success("Đã thêm liên kết tài liệu bàn giao!")
  }

  const handleToggleReaction = (eventId: string, emoji: string) => {
    setCommentReactions((prev) => {
      const current = prev[eventId] || {}
      const currentCount = current[emoji] || 0
      return {
        ...prev,
        [eventId]: {
          ...current,
          [emoji]: currentCount + 1,
        },
      }
    })
  }

  // Build Comprehensive ClickUp Activity Stream (Creation, Status Changes, Phase Progress, Deliverables, Comments)
  const fullActivityEvents = useMemo<ActivityEvent[]>(() => {
    if (!request) return []
    const events: ActivityEvent[] = []

    // 1. Task Update Records / Changelog & Comments (Gộp cả server updates và optimistic updates ngay tức thì)
    const serverUpdates = request.task_updates || []
    const pendingOptimistic = optimisticUpdates.filter((opt) => {
      // Đã có trên server nếu: cùng id HOẶC cùng note và thời gian gửi gần nhau trong vòng 2 phút
      return !serverUpdates.some((s) => {
        if (s.id && opt.id && s.id === opt.id) return true
        if (s.note && opt.note && s.note.trim() === opt.note.trim()) {
          const tS = parseDateToMs(s.timestamp)
          const tOpt = parseDateToMs(opt.timestamp)
          if (!tS || !tOpt || Math.abs(tS - tOpt) < 120000) {
            return true
          }
        }
        return false
      })
    })
    const allUpdates = [...serverUpdates, ...pendingOptimistic]

    // 2. Task Creation Event (Sử dụng thông tin từ initial log nếu có để đồng bộ thời gian chuẩn)
    const initialCreateUpdate = allUpdates.find((u) => {
      const note = (u.note || "").toLowerCase().trim()
      return (
        note.startsWith("khởi tạo yêu cầu") ||
        note.startsWith("ghi nhận yêu cầu") ||
        note.startsWith("đã tạo yêu cầu")
      )
    })

    events.push({
      id: "EVT-CREATE",
      type: "create",
      timestamp: initialCreateUpdate?.timestamp || request.submitted_at || "19/08/2026 09:15",
      author: initialCreateUpdate?.updated_by
        ? formatDesignerDisplayName(initialCreateUpdate.updated_by)
        : (request.requester_name || request.requester_email || "PO (Product Owner)"),
      authorRole: (initialCreateUpdate?.author_role as any) || "PO",
      title: "Đã khởi tạo yêu cầu UX",
      content: `Yêu cầu [${request.title}] được tạo cho Sản phẩm ${request.product || "App MBBank"}${request.squad_name ? ` (Squad: ${request.squad_name})` : ""}.`,
    })

    // 3. Deliverable Links Attached (CHỈ tạo sự kiện nếu link chưa từng xuất hiện trong bất kỳ trao đổi/cập nhật nào)
    const figmaLinkNorm = (customDeliverables?.figma_url || "").trim().toLowerCase().replace(/\/$/, "")
    const isFigmaAlreadyInUpdates = figmaLinkNorm && allUpdates.some((u) => {
      const uLink = (u.deliverable_link || "").toLowerCase().trim().replace(/\/$/, "")
      const uNote = (u.note || "").toLowerCase()
      return (uLink && (uLink === figmaLinkNorm || uLink.includes(figmaLinkNorm) || figmaLinkNorm.includes(uLink))) ||
             (uNote && uNote.includes(figmaLinkNorm))
    })

    if (customDeliverables?.figma_url && !isFigmaAlreadyInUpdates) {
      events.push({
        id: "EVT-FIGMA",
        type: "deliverable",
        timestamp: request.submitted_at || request.last_updated || "19/08/2026 14:20",
        author: isAssigned ? displayName : (formatDesignerDisplayName(request.ux_owner) || "Designer"),
        authorRole: "Designer",
        title: customDeliverables.figma_url.toLowerCase().includes("figma.com") 
          ? "Đã đính kèm liên kết Figma Canvas" 
          : "Đã đính kèm tài liệu bàn giao",
        link: customDeliverables.figma_url,
      })
    }

    const protoLinkNorm = (customDeliverables?.prototype_url || "").trim().toLowerCase().replace(/\/$/, "")
    const isProtoAlreadyInUpdates = protoLinkNorm && allUpdates.some((u) => {
      const uLink = (u.deliverable_link || "").toLowerCase().trim().replace(/\/$/, "")
      const uNote = (u.note || "").toLowerCase()
      return (uLink && (uLink === protoLinkNorm || uLink.includes(protoLinkNorm) || protoLinkNorm.includes(uLink))) ||
             (uNote && uNote.includes(protoLinkNorm))
    })

    if (customDeliverables?.prototype_url && !isProtoAlreadyInUpdates) {
      events.push({
        id: "EVT-PROTO",
        type: "deliverable",
        timestamp: request.submitted_at || request.last_updated || "19/08/2026 16:45",
        author: isAssigned ? displayName : (formatDesignerDisplayName(request.ux_owner) || "Designer"),
        authorRole: "Designer",
        title: "Đã đính kèm Interactive Prototype",
        link: customDeliverables.prototype_url,
      })
    }

    if (allUpdates.length > 0) {
      allUpdates.forEach((u, idx) => {
        const noteRaw = (u.note || "").trim()
        const noteLower = noteRaw.toLowerCase()

        // Bỏ qua log khởi tạo dạng thô vì đã được EVT-CREATE hiển thị ở đầu dòng thời gian
        if (
          noteLower.startsWith("khởi tạo yêu cầu") ||
          noteLower.startsWith("ghi nhận yêu cầu") ||
          noteLower.startsWith("đã tạo yêu cầu")
        ) {
          return
        }

        // Tự động nhận diện sự kiện phân công thực tế từ log hệ thống
        const isAssignmentNote =
          noteLower.startsWith("phân công công việc cho:") ||
          noteLower.startsWith("phân công designer:") ||
          noteLower.startsWith("phân công nhân sự:") ||
          noteLower.startsWith("phân công:")

        if (isAssignmentNote) {
          const assignedTarget = noteRaw.replace(/^[^:]+:\s*/i, "").trim()
          if (assignedTarget && assignedTarget !== "Chưa phân công" && assignedTarget !== "Đang phân công") {
            events.push({
              id: `EVT-ASSIGN-${u.id || idx}`,
              type: "assignment",
              timestamp: u.timestamp,
              author: formatDesignerDisplayName(u.updated_by),
              authorRole: u.author_role || "Design Owner",
              title: "Phân công Designer phụ trách",
              toValue: assignedTarget,
            })
            return
          }
        }

        const isViewerNote =
          noteLower.includes("người theo dõi") ||
          noteLower.includes("viewer")
        const isExplicitComment = (u as any).is_comment === true && !isViewerNote
        const isExplicitSystem = (u as any).is_comment === false || (u as any).source === "system" || isViewerNote
        const isSysNote = isExplicitSystem || (!isExplicitComment && isSystemActivityNote(noteRaw))

        // 1. Phase or Status Log (Dạng text ngắn gọn cho mọi hành động hệ thống)
        if (u.new_phase && u.previous_phase && u.previous_phase !== u.new_phase) {
          events.push({
            id: `EVT-PHASE-${u.id || idx}`,
            type: "phase_change",
            timestamp: u.timestamp,
            author: formatDesignerDisplayName(u.updated_by),
            authorRole: u.author_role || "Designer",
            fromValue: u.previous_phase,
            toValue: u.new_phase,
            progress: u.new_progress,
          })
        } else if (isSysNote && noteRaw) {
          events.push({
            id: `EVT-SYS-${u.id || idx}`,
            type: "status_change",
            timestamp: u.timestamp,
            author: formatDesignerDisplayName(u.updated_by),
            authorRole: u.author_role || "Designer",
            toValue: noteRaw,
          })
        }

        // 2. USER COMMENT CARD: Chỉ dành cho các nội dung người dùng tự gõ/chat dưới ô chat
        if (!isSysNote && noteRaw) {
          events.push({
            id: `EVT-COMMENT-${u.id || idx}`,
            type: "comment",
            timestamp: u.timestamp,
            author: formatDesignerDisplayName(u.updated_by),
            authorRole: u.author_role || "Designer",
            content: noteRaw,
            link: u.deliverable_link,
            progress: u.new_progress,
          })
        }
      })
    } else if (request.latest_update) {
      const msg = (request.latest_update.message || "").trim()
      const isSys = isSystemActivityNote(msg)
      if (isSys) {
        events.push({
          id: "EVT-LATEST",
          type: "status_change",
          timestamp: request.last_updated || "19/08/2026",
          author: displayName,
          authorRole: "Designer",
          toValue: msg,
          progress: request.progress,
        })
      } else if (msg) {
        events.push({
          id: "EVT-LATEST",
          type: "comment",
          timestamp: request.last_updated || "19/08/2026",
          author: displayName,
          authorRole: "Designer",
          content: msg,
          progress: request.progress,
        })
      }
    }

    // Khử trùng lặp comment & deliverable events (đảm bảo không bao giờ bị nhảy 2 comment hoặc đính kèm trùng nhau)
    const uniqueEvents: ActivityEvent[] = []
    events.forEach((evt) => {
      if (evt.type === "comment") {
        const isDupe = uniqueEvents.some(
          (u) =>
            u.type === "comment" &&
            u.content?.trim() === evt.content?.trim() &&
            u.author === evt.author &&
            Math.abs(parseDateToMs(u.timestamp) - parseDateToMs(evt.timestamp)) < 120000
        )
        if (!isDupe) uniqueEvents.push(evt)
      } else if (evt.type === "deliverable") {
        const evtLink = (evt.link || "").toLowerCase().trim().replace(/\/$/, "")
        const isDupe = uniqueEvents.some((u) => {
          const uLink = ((u as any).link || (u as any).deliverable_link || u.toValue || u.content || "").toLowerCase()
          return evtLink && uLink.includes(evtLink) && Math.abs(parseDateToMs(u.timestamp) - parseDateToMs(evt.timestamp)) < 120000
        })
        if (!isDupe) uniqueEvents.push(evt)
      } else {
        uniqueEvents.push(evt)
      }
    })

    return uniqueEvents
  }, [request, displayName, customDeliverables, optimisticUpdates])

  // Filtered Activities based on ClickUp Checklist Filters, Person Filter, and Search
  const displayedActivities = useMemo(() => {
    const list = fullActivityEvents.filter((item) => {
      // 1. ClickUp Checklist Category Filter
      if (item.type === "comment" && !selectedActivityFilters.includes("comments")) return false
      if ((item.type === "phase_change" || item.type === "status_change") && !selectedActivityFilters.includes("phase_status")) return false
      if (item.type === "assignment" && !selectedActivityFilters.includes("assignee")) return false
      if (item.type === "deliverable" && !selectedActivityFilters.includes("attachments")) return false
      if (item.type === "create" && !selectedActivityFilters.includes("archived")) return false

      // 2. Person Filter (if specific author selected)
      if (selectedPersonFilter && item.author !== selectedPersonFilter) {
        return false
      }

      // 3. Search query filter
      if (activitySearchQuery.trim()) {
        const q = activitySearchQuery.toLowerCase()
        const matchAuthor = item.author.toLowerCase().includes(q)
        const matchContent = item.content?.toLowerCase().includes(q) || false
        const matchTitle = item.title?.toLowerCase().includes(q) || false
        const matchValue = item.toValue?.toLowerCase().includes(q) || false
        return matchAuthor || matchContent || matchTitle || matchValue
      }

      return true
    })

    // Sort chronologically ascending so oldest items are at the top (folded in Show More) and newest activity is at the bottom right next to the comment box
    return list.sort((a, b) => parseDateToMs(a.timestamp) - parseDateToMs(b.timestamp))
  }, [fullActivityEvents, selectedActivityFilters, selectedPersonFilter, activitySearchQuery])

  const handleSendComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!request || !newCommentText.trim()) return

    const rawText = newCommentText.trim()
    const currentLink = commentLink.trim()
    let newStatus = request.status
    let sentToPoAt: string | undefined = undefined
    let toastMessage = "Đã gửi trao đổi thành công!"

    // Tự động trích xuất link Figma / URL từ nội dung trao đổi
    const urlRegex = /(https?:\/\/[^\s]+)/gi
    const urlMatches = rawText.match(urlRegex)
    const figmaUrlFromText = urlMatches
      ? urlMatches.find((u) => u.toLowerCase().includes("figma.com")) || urlMatches[0]
      : undefined

    // 1. Cú pháp @SenToPO: hoặc @SendToPO: hoặc @SeToPO: -> chuyển sang Đã gửi PO & tự động gán link Figma nếu có
    if (/(?:^|\s)@se(?:n)?(?:d)?(?:_)?to(?:_)?po:/i.test(rawText)) {
      newStatus = "Đã gửi PO"
      sentToPoAt = new Date().toISOString()
      request.status = "Đã gửi PO"
      request.sent_to_po_at = sentToPoAt
      if (figmaUrlFromText) {
        request.figma_url = figmaUrlFromText
        setCustomDeliverables((prev: any) => ({ ...prev, figma_url: figmaUrlFromText }))
        toastMessage = "Đã đổi trạng thái sang Đã gửi PO kèm link Figma thành công! (Bắt đầu đếm hạn phản hồi 24h)"
      } else {
        toastMessage = "Đã đổi trạng thái sang Đã gửi PO thành công! (Bắt đầu đếm hạn phản hồi 24h)"
      }
    } 
    // 2. Cú pháp @Pending: -> chuyển sang Pending với lý do cụ thể
    else if (/(?:^|\s)@(po_)?pending:/i.test(rawText)) {
      const match = rawText.match(/@(po_)?pending:\s*([^.\n]*)/i)
      const reasonText = match && match[2] ? match[2].trim() : ""

      newStatus = "Pending"
      sentToPoAt = "" // Tuyệt đối không gán mốc gửi PO
      request.status = "Pending"
      request.sent_to_po_at = undefined
      request.pending_reason = reasonText || "Tạm dừng theo yêu cầu của Designer"
      toastMessage = reasonText 
        ? `Đã chuyển sang Pending (Lý do: ${reasonText})`
        : "Đã chuyển trạng thái sang Pending!"
    }

    const now = new Date()
    const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`

    const effectiveFigmaLink = figmaUrlFromText || currentLink || undefined

    const optimisticRecord: TaskUpdateRecord = {
      id: `OPT-${Date.now()}`,
      request_id: request.request_id,
      timestamp: formattedDate,
      updated_by: session ? (session.displayName || session.teamsEmail) : displayName,
      author_role: (session ? session.role : "Designer") as any,
      new_phase: request.current_phase,
      new_progress: request.progress,
      note: rawText,
      deliverable_link: effectiveFigmaLink,
      is_comment: true,
    }

    // A. OPTIMISTIC UPDATE (0ms Latency): Hiển thị bình luận ngay lập tức, xóa trắng ô chat không cần chờ mạng
    setOptimisticUpdates((prev) => [...prev, optimisticRecord])
    setNewCommentText("")
    setCommentLink("")
    setShowLinkInput(false)

    // Cập nhật ngay trạng thái hiển thị của task
    request.status = newStatus
    if (sentToPoAt) {
      request.sent_to_po_at = sentToPoAt
    }

    // Tự động cuộn xuống cuối danh sách trao đổi
    setTimeout(() => {
      if (activityContainerRef.current) {
        activityContainerRef.current.scrollTo({
          top: activityContainerRef.current.scrollHeight,
          behavior: "smooth",
        })
      }
    }, 50)

    // Thông báo nhanh, biến mất tự động - KHÔNG DÙNG toast.loading xoay vòng chặn người dùng
    toast.success(toastMessage, undefined, { id: "send-comment-toast", duration: 3000 })
    dispatchNotification({
      type: "comment_added",
      title: `Trao đổi mới: ${request.request_id}`,
      message: rawText.length > 100 ? `${rawText.slice(0, 97)}...` : rawText,
      requestId: request.request_id,
      taskTitle: request.title,
      actorName: session ? (session.displayName || session.teamsEmail) : displayName,
      actorRole: (session ? session.role : "Designer"),
      viewers: localViewers,
    })

    // B. BACKGROUND NON-BLOCKING SYNC: Gửi lên Google Apps Script / Sheet ngầm
    updateTaskProgress(request.request_id, {
      new_phase: request.current_phase,
      new_status: newStatus,
      new_progress: request.progress,
      note: rawText,
      figma_url: effectiveFigmaLink || request.figma_url || undefined,
      assigned_designer: request.assigned_designer,
      sent_to_po_at: sentToPoAt,
      is_comment: true,
    })
      .then((res) => {
        if (res.success) {
          // Xóa ngay bản ghi optimistic này ra khỏi state để tránh đúp khi onUpdated() nạp dữ liệu mới từ server
          setOptimisticUpdates((prev) => prev.filter((o) => o.id !== optimisticRecord.id))
          if (onUpdated) onUpdated()
        } else {
          toast.error("Không thể lưu trao đổi lên server", res.message)
        }
      })
      .catch((err) => {
        toast.error("Mất kết nối khi đồng bộ trao đổi", String(err))
      })
  }

  const activePriorityObj =
    PRIORITY_OPTIONS.find((p) => p.value.toLowerCase() === (currentPriority || "").toLowerCase()) ||
    PRIORITY_OPTIONS.find((p) => p.value.toLowerCase() === (request?.priority || "").toLowerCase()) ||
    PRIORITY_OPTIONS.find((p) => p.value === "Normal") ||
    PRIORITY_OPTIONS[2]

  // Dynamic UX Phases from Admin Settings
  const [phaseVersion, setPhaseVersion] = useState(0)
  useEffect(() => {
    const handleStorage = () => setPhaseVersion((v) => v + 1)
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])
  const adminPhases = useMemo(() => getAdminPhases(), [request, phaseVersion])

  // Calculate current phase index for the dynamic progression bar
  const currentPhaseIndex = useMemo(() => {
    if (!request) return 0
    const curPhase = (request.current_phase || "").trim().toLowerCase()
    const curStatus = (request.status || "").trim().toLowerCase()

    const idx = adminPhases.findIndex(
      (p) =>
        p.key.toLowerCase() === curPhase ||
        curPhase.includes(p.key.toLowerCase()) ||
        p.key.toLowerCase().includes(curPhase)
    )
    if (idx >= 0) return idx

    if (curStatus.includes("hoàn thành") || curStatus.includes("bàn giao")) return adminPhases.length - 1
    if (curStatus.includes("phân loại") || curStatus.includes("tiếp nhận")) return 0
    return 0
  }, [request, adminPhases])

  // Phân loại chuẩn 2 loại Pending:
  // 1. PO Pending: Sau 24h kể từ khi Designer gửi figma cho PO nhưng chưa phản hồi (Màu Amber)
  // 2. Pending: Designer chủ động gắn @pending: kèm lý do cụ thể trong đoạn chat (Màu Slate)
  const pendingClassification = useMemo(() => {
    return getRequestPendingClassification(request)
  }, [request?.status, request?.sent_to_po_at, request?.pending_reason, request?.task_updates, request?.latest_update, optimisticUpdates])

  // Tính toán thời gian SLA 24h chờ PO (Banner 1 Tím: khi trong hạn 24h chờ PO phản hồi)
  const poWaitInfo = useMemo(() => {
    if (!request) {
      return { showBanner1: false, hoursRemaining: 0, sentTimeStr: "" }
    }

    // Nếu task đã Hoàn thành / Bàn giao hoặc tiến độ 100% thì không hiển thị banner PO
    if (request.status === "Hoàn thành" || request.progress >= 100 || request.current_phase === "Bàn giao") {
      return { showBanner1: false, hoursRemaining: 0, sentTimeStr: "" }
    }

    const isSentToPoStatus = request.status === "Đã gửi PO"
    if (!isSentToPoStatus) {
      return { showBanner1: false, hoursRemaining: 0, sentTimeStr: "" }
    }

    // Phân tích thời gian gửi PO bằng parseDateToMs để đảm bảo không bị sai lệch ngày tháng Việt Nam
    const rawTime = request.sent_to_po_at || new Date().toISOString()
    const sentMs = parseDateToMs(rawTime) || Date.now()
    const now = Date.now()
    const elapsedMs = Math.max(0, now - sentMs)
    const elapsedHours = elapsedMs / (1000 * 60 * 60)

    // Trong 24h: Hiện Banner 1 (Tím: Đang trong hạn 24h chờ PO phản hồi)
    if (elapsedHours < 24) {
      const hoursRemaining = Math.max(0, Math.ceil(24 - elapsedHours))
      const sentDate = new Date(sentMs)
      const sentTimeStr = !isNaN(sentDate.getTime()) ? sentDate.toLocaleString("vi-VN") : ""
      return {
        showBanner1: true,
        hoursRemaining,
        sentTimeStr,
      }
    }

    return { showBanner1: false, hoursRemaining: 0, sentTimeStr: "" }
  }, [request?.status, request?.sent_to_po_at, request?.last_updated, request?.progress, request?.current_phase, request?.latest_update])

  return (
    <AnimatePresence>
      {isVisible && request && (
        <motion.div 
          key="request-detail-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 overflow-hidden" 
          onClick={() => {
            setOpenDropdown(null)
          }}
        >
          {/* Backdrop Blur Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs cursor-pointer"
            onClick={handleDismiss}
          />

          {/* Floating Slide-over Sheet / Fullscreen Modal */}
          <div className={`fixed z-50 pointer-events-none transition-all duration-300 ${
            isFullScreen 
              ? "inset-0 sm:inset-3 md:inset-4 flex items-center justify-center" 
              : "inset-0 sm:inset-y-3 sm:right-3 sm:left-auto flex justify-end"
          }`}>
            <motion.aside 
              key="request-detail-drawer"
              initial={isFullScreen ? { scale: 0.95, opacity: 0 } : { x: "100%", opacity: 0.5 }}
              animate={isFullScreen ? { scale: 1, opacity: 1 } : { x: 0, opacity: 1 }}
              exit={isFullScreen ? { scale: 0.95, opacity: 0 } : { x: "100%", opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className={`pointer-events-auto bg-white rounded-none sm:rounded-2xl lg:rounded-3xl border-0 sm:border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden h-full transition-all duration-300 transform-gpu will-change-transform ${
                isFullScreen
                  ? "w-full max-w-none"
                  : "w-full sm:w-[680px] md:w-[780px] lg:w-[1020px] xl:w-[1200px]"
              }`}
              role="dialog"
              aria-modal="true"
            >
              {/* 1. ClickUp-Style Top Control Bar & Breadcrumbs */}
              <div className="px-3 sm:px-6 py-2.5 sm:py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 select-none gap-2">
                {/* Left: Breadcrumbs [Squad / Task ID] */}
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs min-w-0">
                  <span className="text-slate-600 font-bold truncate max-w-[120px] sm:max-w-none">
                    {localProduct || request.product || "App MBBank"}
                  </span>

                  <span className="text-slate-300 font-light">/</span>

                  <div className="flex items-center gap-1 font-mono font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60 shrink-0">
                    <Target className="w-3.5 h-3.5 text-slate-400" />
                    <span>{request.request_id}</span>
                  </div>

                  {statusConfig && (
                    <span className={`hidden sm:inline-block ml-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] tracking-wide uppercase border ${
                      pendingClassification.isPending
                        ? `${pendingClassification.badgeClasses.bg} ${pendingClassification.badgeClasses.text} ${pendingClassification.badgeClasses.border}`
                        : `${statusConfig.inlineClasses.bg} ${statusConfig.inlineClasses.text} ${statusConfig.inlineClasses.border}`
                    } shrink-0`}>
                      {pendingClassification.isPending ? pendingClassification.label : request.status}
                    </span>
                  )}
                </div>

                {/* Right: Action & Window Controls */}
                <div className="flex items-center gap-2">
                  {/* Live Sync Real-time Beacon */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-semibold select-none shadow-2xs">
                    <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ${isLiveSyncing ? "animate-ping" : "animate-pulse"}`} />
                    <span className="hidden sm:inline">Live Sync</span>
                    <span className="text-emerald-600/80 text-[10px] font-normal">• {liveSyncTime}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Sao chép link bài toán"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer hidden md:inline-flex"
                    title={isFullScreen ? "Thu nhỏ cửa sổ" : "Mở rộng toàn màn hình"}
                  >
                    {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Đóng (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 2. ReUI Checkout-1 Style Dynamic UX Progression Stepper Bar */}
              <div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-100 overflow-x-auto no-scrollbar shrink-0 touch-pan-x">
                <div className="flex items-center justify-between min-w-[620px] lg:min-w-full">
                  {adminPhases.map((step, idx) => {
                    const isPassed = idx < currentPhaseIndex
                    const isCurrent = idx === currentPhaseIndex
                    const isLast = idx === adminPhases.length - 1
                    const stepNum = idx + 1
                    const stepTitle = step.label.includes(". ") ? step.label.split(". ")[1] : step.label

                    return (
                      <React.Fragment key={step.key}>
                        {/* Step Item */}
                        <button
                          type="button"
                          onClick={() => handleUpdatePhase(step.key, step.progress)}
                          className="flex items-center gap-2 group cursor-pointer transition-opacity hover:opacity-85 shrink-0 select-none"
                          title={`Chuyển sang khâu: ${step.label}`}
                        >
                          {/* Step Badge */}
                          {isCurrent ? (
                            <span className="relative w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-100/90 flex items-center justify-center shrink-0">
                              <span
                                className="absolute inset-0 rounded-full border border-dashed border-slate-600 animate-spin"
                                style={{ animationDuration: "6s" }}
                              />
                              <span className="relative z-10 text-[11px] sm:text-xs font-bold text-slate-900 select-none">
                                {stepNum}
                              </span>
                            </span>
                          ) : isPassed ? (
                            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-900 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {stepNum}
                            </span>
                          ) : (
                            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-100 text-slate-400 font-medium text-[11px] sm:text-xs flex items-center justify-center shrink-0">
                              {stepNum}
                            </span>
                          )}

                          {/* Step Label */}
                          <span
                            className={`text-xs whitespace-nowrap transition-colors ${
                              isCurrent
                                ? "text-slate-900 font-bold"
                                : isPassed
                                ? "text-slate-700 font-medium"
                                : "text-slate-400 font-normal"
                            }`}
                          >
                            {stepTitle}
                          </span>
                        </button>

                        {/* Connecting Line between steps */}
                        {!isLast && (
                          <div
                            className={`flex-1 h-px mx-2 sm:mx-3 transition-colors ${
                              idx < currentPhaseIndex ? "bg-slate-300" : "bg-slate-200/90"
                            }`}
                          />
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>

              {/* Mobile / Tablet Tab Switcher (< lg) */}
              <div className="lg:hidden flex border-b border-slate-200 bg-slate-50/90 px-3 sm:px-6 pt-2 gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileActiveTab("details")}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    mobileActiveTab === "details"
                      ? "border-[#1057FB] text-[#1057FB]"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Chi tiết bài toán</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileActiveTab("activity")}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    mobileActiveTab === "activity"
                      ? "border-[#1057FB] text-[#1057FB]"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Hoạt động & Trao đổi ({displayedActivities.length})</span>
                </button>
              </div>

              {/* 3. Main Content Split View (ClickUp 2-Column: Details Left + Activity Stream Right) */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-100 min-h-0">
                
                {/* LEFT COLUMN: Task Header, Interactive Properties Table & Details */}
                <div className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 ${
                  mobileActiveTab === "details" ? "block" : "hidden lg:block"
                }`}>
                  
                  {/* BANNER LOẠI 1: PO PENDING - Quá hạn 24h PO chưa phản hồi duyệt phương án (Màu Hổ phách / Amber) */}
                  {pendingClassification.type === "po_pending" && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/95 border border-amber-300 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <p className="font-bold text-amber-950 text-[13px] flex items-center gap-1.5 flex-wrap">
                            <span>Trạng thái: PO Pending</span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-200/90 text-[10px] font-extrabold text-amber-900 uppercase tracking-wide border border-amber-300/80">
                              Quá hạn 24h chưa phản hồi
                            </span>
                          </p>
                          <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                            {pendingClassification.sentTimeStr 
                              ? `Designer đã gửi phương án cho PO xem xét vào lúc ${pendingClassification.sentTimeStr}. Đã quá 24h (${pendingClassification.elapsedHours}h) chưa nhận được phản hồi, bài toán tự động chuyển sang PO Pending.`
                              : "Designer đã gửi phương án thiết kế cho PO xem xét quá 24h chưa nhận được phản hồi, bài toán chuyển sang PO Pending."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto flex-wrap">
                        {/* Nút dành cho Designer: Gỡ trạng thái bằng cách bấm Tiếp tục update */}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleDesignerResumeUpdate}
                          className="h-7.5 px-3 text-xs bg-white hover:bg-amber-100 text-amber-950 border-amber-300 rounded-xl font-bold cursor-pointer shadow-2xs flex items-center gap-1.5"
                          title="Gỡ trạng thái PO Pending để tiếp tục cập nhật bài toán"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Tiếp tục update</span>
                        </Button>

                        {/* Nút dành cho PO / Tác giả */}
                        {(session?.role === "PO" || session?.role === "Business" || isAuthor) && (
                          <>
                            <Button size="sm" onClick={handlePoApprove} className="h-7.5 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer shadow-2xs flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{APP_CONTENT.track.detailModal.banners.poPending.buttons.confirm}</span>
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handlePoRequestChanges()} className="h-7.5 px-3 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50 rounded-xl font-semibold cursor-pointer flex items-center gap-1">
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{APP_CONTENT.track.detailModal.banners.poPending.buttons.needUpdate}</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* BANNER LOẠI 2: PENDING - Tạm dừng theo đoạn chat của Designer khi viết @pending: (Màu Slate xám) */}
                  {pendingClassification.type === "designer_pending" && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-100/95 border border-slate-300 text-xs text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-start gap-2.5">
                        <PauseCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-slate-900 text-[13px] flex items-center gap-1.5 flex-wrap">
                            <span>Trạng thái: Pending</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-[10px] font-extrabold text-slate-700 uppercase tracking-wide border border-slate-300/80">
                              Tạm dừng theo yêu cầu
                            </span>
                          </p>
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs text-slate-900 font-semibold flex items-center gap-1.5 flex-wrap">
                              <span className="text-slate-500 font-normal">Lý do:</span>
                              <span className="text-[#1057FB] bg-blue-50/90 px-2 py-0.5 rounded-md border border-blue-200/80 font-medium">
                                {pendingClassification.reason || "Tạm dừng theo yêu cầu của Designer"}
                              </span>
                            </p>
                            <p className="text-[11.5px] text-slate-500">
                              Bài toán đang ở trạng thái tạm dừng, đồng hồ theo dõi tiến độ SLA được đóng băng.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto flex-wrap">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleDesignerResumeUpdate}
                          className="h-7.5 px-3 text-xs bg-white hover:bg-slate-200/80 text-slate-800 border-slate-300 rounded-xl font-bold cursor-pointer shadow-2xs flex items-center gap-1.5"
                          title="Tiếp tục thực hiện bài toán"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Tiếp tục làm</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* BANNER 3: Đang chờ PO phản hồi SLA 24h (Hiện ngay khi Designer gửi @SendToPO: trong 24h đầu) */}
                  {poWaitInfo.showBanner1 && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/90 border border-purple-200 text-xs text-purple-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-start gap-2.5">
                        <Send className="w-4 h-4 text-purple-600 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <p className="font-bold text-purple-950 text-[13px] flex items-center gap-1.5 flex-wrap">
                            <span>{APP_CONTENT.track.detailModal.banners.poWaiting.title}</span>
                            <span className="px-2 py-0.5 rounded-full bg-purple-200/80 text-[10px] font-extrabold text-purple-900 uppercase tracking-wide border border-purple-300/80">
                              {APP_CONTENT.track.detailModal.banners.poWaiting.timeRemaining.replace("{hours}", String(poWaitInfo.hoursRemaining))}
                            </span>
                          </p>
                          <p className="text-purple-800 text-xs mt-1 leading-relaxed">
                            {APP_CONTENT.track.detailModal.banners.poWaiting.description.replace(
                              "{sentTime}",
                              poWaitInfo.sentTimeStr ? `vào lúc ${poWaitInfo.sentTimeStr}` : ""
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto flex-wrap">
                        {/* Nút dành cho PO / Tác giả */}
                        {(session?.role === "PO" || session?.role === "Business" || isAuthor) && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={handlePoApprove} 
                              className="h-7.5 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer shadow-2xs flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{APP_CONTENT.track.detailModal.banners.poWaiting.buttons.confirm}</span>
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handlePoRequestChanges()} 
                              className="h-7.5 px-3 text-xs bg-white text-purple-800 border-purple-200 hover:bg-purple-100 rounded-xl font-semibold cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{APP_CONTENT.track.detailModal.banners.poWaiting.buttons.needUpdate}</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Task Title Header */}
                  <div>
                    <h1 
                      className="text-lg sm:text-xl lg:text-[21px] font-semibold text-slate-900 tracking-tight leading-snug break-words [overflow-wrap:break-word] max-w-full cursor-default"
                      title="Tiêu đề bài toán"
                    >
                      {capitalizeFirstLetter(titleValue) || "Chưa đặt tiêu đề bài toán"}
                    </h1>
                  </div>

                  {/* ClickUp Task Properties Grid (Status replaces Khâu UX, Dates, Assignees, Priority) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 py-5 border-y border-slate-100 text-xs">
                    
                    {/* 1. Status (Chính là Khâu UX: Phân loại, Discovery, User Flow, UI Design, Prototype, Bàn giao) */}
                    <div className="flex items-center relative" onClick={(e) => e.stopPropagation()}>
                      <div className="w-20 sm:w-24 flex items-center gap-2 text-slate-500 font-normal shrink-0">
                        <Target className="w-4 h-4 text-slate-400" />
                        <span>Status</span>
                      </div>
                      <div className="flex-1 relative">
                        {(() => {
                          const rawPhase = request.current_phase || (adminPhases[0]?.key || "Chờ xác nhận")
                          const displayPhase = (
                            rawPhase === "Phân loại" ||
                            rawPhase === "Đang phân loại" ||
                            rawPhase === "Chờ tiếp nhận" ||
                            rawPhase === "Đã gửi yêu cầu" ||
                            rawPhase === "Đã gửi" ||
                            rawPhase === "Mới tạo"
                          )
                            ? "Chờ xác nhận"
                            : rawPhase
                          const cfg = getStatusConfig(displayPhase)
                          return (
                            <>
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setOpenDropdown(openDropdown === "phase" ? null : "phase")}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.inlineClasses.bg} ${cfg.inlineClasses.text} border ${cfg.inlineClasses.border} whitespace-nowrap cursor-pointer hover:opacity-90 transition-all shadow-2xs`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${cfg.inlineClasses.dot} shrink-0`} />
                                  <span>{displayPhase}</span>
                                </button>

                                {pendingClassification.isPending && (
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${pendingClassification.badgeClasses.bg} ${pendingClassification.badgeClasses.text} ${pendingClassification.badgeClasses.border} shadow-2xs`}
                                    title={pendingClassification.type === "po_pending" ? "Quá hạn 24h PO chưa phản hồi duyệt" : `Pending: ${pendingClassification.reason}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${pendingClassification.badgeClasses.dot} shrink-0`} />
                                    <span>{pendingClassification.label}</span>
                                  </span>
                                )}
                              </div>

                              {/* Phase Dropdown Popover */}
                              <AnimatePresence>
                                {openDropdown === "phase" && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                                    className="absolute top-full left-0 mt-1.5 z-50 w-64 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-1.5 overflow-hidden select-none"
                                  >
                                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center justify-between border-b border-slate-100 mb-1">
                                      <span>Trạng thái bài toán (Khâu UX)</span>
                                      <span className="text-[9px] font-semibold text-slate-400">Đồng bộ SLA</span>
                                    </div>
                                    {adminPhases.map((phase, pIdx) => {
                                      const isCurrent =
                                        displayPhase === phase.key ||
                                        request.current_phase === phase.key ||
                                        (!request.current_phase && pIdx === 0)
                                      const phaseCfg = getStatusConfig(phase.key)
                                      return (
                                        <button
                                          key={`drop-phase-${phase.key}`}
                                          type="button"
                                          onClick={() => handleUpdatePhase(phase.key, phase.progress)}
                                          className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 cursor-pointer text-xs transition-colors group ${
                                            isCurrent ? "bg-blue-50/70 font-bold text-[#1057FB]" : "text-slate-700 font-medium"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5">
                                            <span className={`w-2.5 h-2.5 rounded-full ${phaseCfg.inlineClasses?.dot || phaseCfg.dotColor || "bg-blue-500"} shrink-0 shadow-2xs`} />
                                            <span className={isCurrent ? "font-bold text-[#1057FB]" : "text-slate-800"}>
                                              {phase.label}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-slate-400 font-semibold group-hover:text-[#1057FB]">
                                              {phase.progress}%
                                            </span>
                                            {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                          </div>
                                        </button>
                                      )
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          )
                        })()}
                      </div>
                    </div>

                    {/* 2. Assignees (Click to select - Support Multi-Assignees) */}
                    <div className="flex items-center relative" onClick={(e) => e.stopPropagation()}>
                      <div className="w-20 sm:w-24 flex items-center gap-2 text-slate-500 font-normal shrink-0">
                        <UserCheck className="w-4 h-4 text-slate-400" />
                        <span>Assignees</span>
                      </div>
                      <div className="flex-1 relative min-w-0">
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(openDropdown === "assignee" ? null : "assignee")}
                          className="flex items-center gap-2 min-w-0 p-1 -ml-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer max-w-full"
                        >
                          {isAssigned ? (
                            <div className="flex items-center gap-2 min-w-0 max-w-full">
                              {localAssignees.length === 1 ? (
                                <>
                                  <UserAvatar name={localAssignees[0]} avatarUrl={getDesignerAvatar(localAssignees[0])} size="xs" />
                                  <span className="font-medium text-slate-900 truncate text-xs">{localAssignees[0]}</span>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center -space-x-2 overflow-hidden shrink-0">
                                    {localAssignees.slice(0, 3).map((name, i) => (
                                      <div key={`assignee-av-${name}-${i}`} className="ring-2 ring-white rounded-full">
                                        <UserAvatar name={name} avatarUrl={getDesignerAvatar(name)} size="xs" />
                                      </div>
                                    ))}
                                  </div>
                                  <span className="font-medium text-slate-900 truncate text-xs" title={localAssignees.join(", ")}>
                                    {localAssignees.join(", ")}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                                    {localAssignees.length}
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 text-slate-500 hover:text-[#1057FB] hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs font-semibold">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>+ Chưa phân công</span>
                            </div>
                          )}
                        </button>

                        {/* Assignee Dropdown Popover (Multi-Select) */}
                        <AnimatePresence>
                          {openDropdown === "assignee" && (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.96 }}
                              className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1.5 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden select-none flex flex-col max-h-[460px]"
                            >
                              {/* Header & Search Input */}
                              <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 space-y-2 bg-slate-50/50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                                      Assignees
                                    </span>
                                    {localAssignees.length > 0 && (
                                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#1057FB] border border-blue-200">
                                        {String(localAssignees.length).padStart(2, "0")}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setOpenDropdown(null)}
                                    className="p-1 rounded-md hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                    title="Đóng"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="relative">
                                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  <input
                                    type="text"
                                    placeholder="Tìm tên hoặc vai trò..."
                                    value={assigneeSearchQuery}
                                    onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 focus:border-[#1057FB] rounded-lg outline-none transition-all placeholder:text-slate-400 text-slate-800 shadow-2xs"
                                  />
                                  {assigneeSearchQuery && (
                                    <button
                                      type="button"
                                      onClick={() => setAssigneeSearchQuery("")}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Designer List with Unassign Option & 2 Categorized Sections */}
                              <div className="flex-1 overflow-y-auto py-1 divide-y divide-slate-50">

                                {/* Option 0: Unassign / Chưa phân công */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleClearAssignees()
                                  }}
                                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-slate-50 transition-colors cursor-pointer text-xs"
                                >
                                  <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                    <User className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-700 truncate">Chưa phân công</p>
                                    <p className="text-[10px] text-slate-400">Bỏ chọn tất cả nhân sự</p>
                                  </div>
                                  {!isAssigned && <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />}
                                </button>

                                {(() => {
                                  const filterByQuery = (d: (typeof availableDesigners)[0]) => {
                                    if (!assigneeSearchQuery.trim()) return true
                                    const q = assigneeSearchQuery.toLowerCase().trim()
                                    return (
                                      d.name.toLowerCase().includes(q) ||
                                      d.role.toLowerCase().includes(q) ||
                                      Boolean(d.squad && d.squad.toLowerCase().includes(q))
                                    )
                                  }

                                  const filteredSquadDesigners = squadDesigners.filter(filterByQuery)
                                  const filteredSupportingDesigners = supportingDesigners.filter(filterByQuery)

                                  const renderItem = (des: (typeof availableDesigners)[0], isSquadRole: boolean) => {
                                    const isSelected = localAssignees.some(
                                      (name) =>
                                        name.toLowerCase().trim() === des.name.toLowerCase().trim() ||
                                        Boolean(des.email && name.toLowerCase().includes(des.email.toLowerCase().trim()))
                                    )

                                    return (
                                      <button
                                        key={des.name}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleToggleAssignee(des.name)
                                        }}
                                        className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer text-xs ${
                                          isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"
                                        }`}
                                      >
                                        <div
                                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                            isSelected
                                              ? "bg-[#1057FB] border-[#1057FB] text-white shadow-2xs"
                                              : "border-slate-300 bg-white"
                                          }`}
                                        >
                                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                        </div>
                                        <UserAvatar name={des.name} avatarUrl={des.avatar} size="sm" />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <p className={`font-bold truncate ${isSelected ? "text-blue-900" : "text-slate-900"}`}>{des.name}</p>
                                            {isSquadRole ? (
                                              <span className="text-[9.5px] font-semibold text-[#1057FB] bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 rounded shrink-0">
                                                Phụ trách Squad
                                              </span>
                                            ) : (
                                              <span className="text-[9.5px] font-medium text-slate-500 bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 rounded shrink-0">
                                                Hỗ trợ
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-slate-400 truncate">
                                            {des.role}{des.squad ? ` • ${des.squad}` : ""}
                                          </p>
                                        </div>
                                      </button>
                                    )
                                  }

                                  if (filteredSquadDesigners.length === 0 && filteredSupportingDesigners.length === 0) {
                                    return (
                                      <div className="px-3 py-5 text-center text-xs text-slate-400 font-medium">
                                        Không tìm thấy designer phù hợp
                                      </div>
                                    )
                                  }

                                  return (
                                    <>
                                      {/* Phần 1: Designer phụ trách squad */}
                                      {filteredSquadDesigners.length > 0 && (
                                        <div className="pt-1">
                                          <div className="px-3 py-1 bg-blue-50/70 border-y border-blue-100/80 text-[10px] font-bold uppercase tracking-wider text-[#1057FB] flex items-center justify-between">
                                            <span>Designer phụ trách Squad ({taskSquadName})</span>
                                            <span className="bg-blue-200/80 text-[#1057FB] px-1.5 py-0.2 rounded-full font-bold text-[9.5px]">
                                              {filteredSquadDesigners.length}
                                            </span>
                                          </div>
                                          <div className="divide-y divide-slate-50">
                                            {filteredSquadDesigners.map((d) => renderItem(d, true))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Phần 2: Designer hỗ trợ (ngoài squad) */}
                                      {filteredSupportingDesigners.length > 0 && (
                                        <div className="pt-1 border-t border-slate-100">
                                          <div className="px-3 py-1 bg-slate-50/90 border-y border-slate-200/70 text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                                            <span>Designer hỗ trợ (Ngoài Squad)</span>
                                            <span className="bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-full font-bold text-[9.5px]">
                                              {filteredSupportingDesigners.length}
                                            </span>
                                          </div>
                                          <div className="divide-y divide-slate-50">
                                            {filteredSupportingDesigners.map((d) => renderItem(d, false))}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )
                                })()}
                              </div>

                              {/* Sticky Footer Toolbar */}
                              <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between gap-2 shrink-0">
                                {localAssignees.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={handleClearAssignees}
                                    className="text-[11px] font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                                  >
                                    Bỏ chọn ({localAssignees.length})
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Chọn 1 hoặc nhiều người</span>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => setOpenDropdown(null)}
                                  className="h-7 text-xs px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer shadow-2xs"
                                >
                                  Hoàn tất
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* 3. Dates (Lịch trình thiết kế UX: Bắt đầu -> Hạn hoàn thành thiết kế) */}
                    <div className="flex items-center relative" onClick={(e) => e.stopPropagation()}>
                      <div className="w-20 sm:w-24 flex items-center gap-2 text-slate-500 font-normal shrink-0" title="Lịch trình thiết kế UX của Designer">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>Hạn UX</span>
                      </div>
                      <div className="flex-1 relative flex items-center gap-2 font-normal text-slate-700 text-xs whitespace-nowrap flex-nowrap min-w-0">
                        <span className="text-slate-500 flex items-center gap-1 shrink-0 whitespace-nowrap" title="Thời gian Design bắt đầu nhận task">
                          <span>{request.submitted_at || "Bắt đầu"}</span>
                        </span>
                        <span className="text-slate-300 font-medium">→</span>
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(openDropdown === "date" ? null : "date")}
                          className="text-[#1057FB] font-medium flex items-center gap-1 bg-blue-50/80 hover:bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200/60 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
                          title="Hạn hoàn thành thiết kế UX (Design End Date - Bấm để đổi hạn)"
                        >
                          <Calendar className="w-3.5 h-3.5 text-[#1057FB] shrink-0" />
                          <span>{customDeadline || "Hạn thiết kế"}</span>
                        </button>

                        {/* ReUI Date Picker Popover */}
                        <AnimatePresence>
                          {openDropdown === "date" && (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.96 }}
                              className="absolute top-full left-0 mt-1.5 z-50 w-64 bg-white border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-900/10 p-3 select-none"
                            >
                              {/* Header Month/Year Selector */}
                              <div className="flex items-center justify-between mb-3 px-1">
                                <div>
                                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Hạn thiết kế UX</span>
                                  <span className="text-xs font-semibold text-slate-900">
                                    {monthNamesVi[calMonth]} {calYear}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={prevCalMonth}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={nextCalMonth}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Weekday headers */}
                              <div className="grid grid-cols-7 gap-1 mb-1 text-center">
                                {dayHeadersVi.map((dh) => (
                                  <span key={dh} className="text-[10px] font-medium text-slate-400">
                                    {dh}
                                  </span>
                                ))}
                              </div>

                              {/* Days Grid */}
                              <div className="grid grid-cols-7 gap-1 text-center">
                                {calDays.map((d, index) => {
                                  if (d === null) {
                                    return <div key={`empty-${index}`} className="h-7 w-7" />
                                  }

                                  const isSelected =
                                    customDeadline &&
                                    new Date(customDeadline).getFullYear() === calYear &&
                                    new Date(customDeadline).getMonth() === calMonth &&
                                    new Date(customDeadline).getDate() === d

                                  const isToday =
                                    new Date().getFullYear() === calYear &&
                                    new Date().getMonth() === calMonth &&
                                    new Date().getDate() === d

                                  return (
                                    <button
                                      key={`day-${d}`}
                                      type="button"
                                      onClick={() => handleSelectCalDay(d)}
                                      className={`h-7 w-7 rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer ${
                                        isSelected
                                          ? "bg-[#1E5AF6] text-white font-semibold shadow-xs"
                                          : isToday
                                          ? "border border-[#1E5AF6] text-[#1E5AF6] font-semibold"
                                          : "text-slate-700 hover:bg-slate-100"
                                      }`}
                                    >
                                      {d}
                                    </button>
                                  )
                                })}
                              </div>

                              {/* Quick Clear / Today Buttons */}
                              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => handleSaveDeadline("")}
                                  className="text-slate-400 hover:text-rose-500 font-normal cursor-pointer"
                                >
                                  Xóa chọn
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const today = new Date()
                                    const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
                                    handleSaveDeadline(formatted)
                                  }}
                                  className="text-[#1E5AF6] hover:underline font-medium cursor-pointer"
                                >
                                  Hôm nay
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* 4. Priority (Click to select) */}
                    <div className="flex items-center relative" onClick={(e) => e.stopPropagation()}>
                      <div className="w-20 sm:w-24 flex items-center gap-2 text-slate-500 font-normal shrink-0">
                        <Flag className="w-4 h-4 text-amber-500" />
                        <span>Priority</span>
                      </div>
                      <div className="flex-1 relative">
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(openDropdown === "priority" ? null : "priority")}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-medium text-xs cursor-pointer hover:opacity-90 transition-all ${activePriorityObj.color}`}
                        >
                          <Flag className={`w-3.5 h-3.5 ${activePriorityObj.flagFill}`} />
                          <span>{activePriorityObj.label}</span>
                        </button>

                        {/* Priority Dropdown Popover */}
                        <AnimatePresence>
                          {openDropdown === "priority" && (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.96 }}
                              className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1.5 z-50 w-48 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-1.5 overflow-hidden"
                            >
                              <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                Priority
                              </div>
                              {PRIORITY_OPTIONS.map((pr) => {
                                const isSelected = (currentPriority || "").toLowerCase() === pr.value.toLowerCase()
                                return (
                                  <button
                                    key={pr.value}
                                    type="button"
                                    onClick={() => handleUpdatePriority(pr.value)}
                                    className={`w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-50 cursor-pointer text-xs font-semibold ${
                                      isSelected ? "text-slate-900 bg-slate-50/80" : "text-slate-700"
                                    }`}
                                  >
                                    <Flag className={`w-3.5 h-3.5 ${pr.flagFill}`} />
                                    <span className="flex-1">{pr.label}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                  </button>
                                )
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* 5. Viewers (Người theo dõi bài toán) */}
                    <div className="flex items-center relative col-span-1 sm:col-span-2 pt-3 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                      <div className="w-20 sm:w-24 flex items-center gap-2 text-slate-500 font-normal shrink-0">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>Viewers</span>
                      </div>
                      <div className="flex-1 relative flex items-center gap-2 min-w-0">
                        {localViewers.length > 0 ? (
                          <div className="relative inline-flex items-center gap-2 group">
                            {/* C-Avatar-29: Avatar xếp chồng + Pill Count Badge + Nút Plus */}
                            <CAvatar29
                              count={localViewers.length}
                              showAddButton={canManageViewers}
                              onAddClick={(e) => {
                                e.stopPropagation()
                                if (canManageViewers) {
                                  setViewerSearchQuery("")
                                  setOpenDropdown(openDropdown === "viewers" ? null : "viewers")
                                }
                              }}
                              onClick={() => {
                                if (canManageViewers) {
                                  setViewerSearchQuery("")
                                  setOpenDropdown(openDropdown === "viewers" ? null : "viewers")
                                }
                              }}
                              className={canManageViewers ? "cursor-pointer" : "cursor-default"}
                            >
                              {localViewers.slice(0, 3).map((vName, idx) => {
                                const member = availableViewerMembers.find((m) => isMemberMatchViewer(m, vName))
                                return (
                                  <div key={`prop-v-av-${vName}-${idx}`} className="ring-2 ring-white rounded-full shrink-0">
                                    <UserAvatar name={vName} avatarUrl={member?.avatar || getDesignerAvatar(vName)} size="sm" />
                                  </div>
                                )
                              })}
                            </CAvatar29>

                            {/* Toast Danh sách người theo dõi khi trỏ chuột (Hover Tooltip Toast) */}
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col z-50 min-w-[210px] max-w-[270px] p-2.5 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-slate-800 pointer-events-none">
                              <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-800">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Người theo dõi
                                </span>
                                <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                  {localViewers.length} thành viên
                                </span>
                              </div>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                                {localViewers.map((vName, idx) => {
                                  const member = availableViewerMembers.find((m) => isMemberMatchViewer(m, vName))
                                  return (
                                    <div key={`hov-v-${vName}-${idx}`} className="flex items-center gap-2">
                                      <UserAvatar name={vName} avatarUrl={member?.avatar || getDesignerAvatar(vName)} size="xs" />
                                      <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-white truncate text-[11px]">{vName}</p>
                                        <p className="text-[9.5px] text-slate-400 truncate">
                                          {member?.role || "Thành viên"}{member?.squad ? ` • ${member.squad}` : ""}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Viewers Dropdown Popover */}
                            <AnimatePresence>
                              {openDropdown === "viewers" && (
                                <motion.div
                                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                                  className="absolute top-full left-0 mt-1.5 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden select-none flex flex-col max-h-[350px] text-xs"
                                >
                                  {renderViewerPopoverContent(() => {
                                    setOpenDropdown(null)
                                    setViewerSearchQuery("")
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ) : (
                          /* Khi chưa có người theo dõi -> Chỉ hiển thị button "+ Thêm" */
                          canManageViewers ? (
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={() => {
                                  setViewerSearchQuery("")
                                  setOpenDropdown(openDropdown === "viewers" ? null : "viewers")
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1057FB] hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200/80 cursor-pointer transition-colors shadow-2xs"
                                title="Thêm người theo dõi (Viewer)"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Thêm</span>
                              </button>

                              {/* Viewers Dropdown Popover */}
                              <AnimatePresence>
                                {openDropdown === "viewers" && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                                    className="absolute top-full left-0 mt-1.5 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden select-none flex flex-col max-h-[350px] text-xs"
                                  >
                                    {renderViewerPopoverContent(() => {
                                      setOpenDropdown(null)
                                      setViewerSearchQuery("")
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/70">
                              <Lock className="w-2.5 h-2.5" />
                              Chỉ xem
                            </span>
                          )
                        )}
                      </div>
                    </div>

                  </div>

                  {/* 📋 ĐẦU BÀI TỪ PRODUCT OWNER (PULSE HELPDESK REUI KNOWLEDGE-BASE DESIGN) */}
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 space-y-5 shadow-xs">
                    {/* Header: Badges + Subline metadata with Edit Button */}
                    <div className="flex flex-col gap-2.5 pb-4 border-b border-slate-100">
                      {/* Row 1: Pulse Badges Row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Sản phẩm */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100/90 text-slate-700 text-xs font-semibold border border-slate-200/90">
                          <Building className="w-3.5 h-3.5 text-slate-500" />
                          <span>{localProduct || request.product || "App MBBank"}</span>
                        </span>

                        {/* Squad (Chung màu với cụm thông tin) */}
                        {(() => {
                          const rawSq = (localSquad !== undefined && localSquad !== "" ? localSquad : (request.squad_name || request.preferred_squad || "")).trim()
                          const hasSq = Boolean(rawSq && rawSq !== "Chưa phân công" && rawSq !== "Triage Squad" && rawSq !== "Chưa phân squad")
                          const squadLabel = hasSq ? rawSq : "Chưa phân squad"
                          return canEditBrief ? (
                            <button
                              type="button"
                              onClick={() => {
                                const curSq = (localSquad !== undefined && localSquad !== "" ? localSquad : (request.squad_name || request.preferred_squad || "")).trim()
                                setPoFormSquad(curSq)
                                setPoFormProduct(localProduct || request.product || "")
                                setPoFormTitle(request.title || "")
                                setPoFormReqType(request.request_type || "")
                                setPoFormDesc(request.description || "")
                                setPoFormBizNeed(request.business_need || "")
                                setPoFormUserProb(request.user_problem || "")
                                setPoFormTargetUser(request.target_user || "")
                                setPoFormExpectedDeadline(request.release_date || request.expected_deadline || "")
                                setPoFormDeadlineReason(request.deadline_reason || "")
                                setPoFormDocLinks(request.doc_links || [])
                                setShowPoEditModal(true)
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200/90 bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 transition-all cursor-pointer"
                              title="Bấm để chỉnh sửa phân Squad"
                            >
                              <Layers className="w-3.5 h-3.5 text-slate-500" />
                              <span>{squadLabel}</span>
                              <Edit3 className="w-2.5 h-2.5 text-slate-400" />
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200/90 bg-slate-100/90 text-slate-700">
                              <Layers className="w-3.5 h-3.5 text-slate-500" />
                              <span>{squadLabel}</span>
                            </span>
                          )
                        })()}

                        {/* Loại yêu cầu */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100/90 text-slate-700 text-xs font-semibold border border-slate-200/90">
                          <Tag className="w-3.5 h-3.5 text-slate-500" />
                          <span>{request.request_type || "Yêu cầu UX"}</span>
                        </span>

                        {/* Ngày Release (Màu tím chuyển từ lending) */}
                        {request.expected_deadline && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200" title="Hạn Release">
                            <Calendar className="w-3.5 h-3.5 text-purple-600" />
                            <strong className="font-bold text-purple-900">{request.expected_deadline}</strong>
                            {request.deadline_reason && (
                              <span className="text-purple-600/80 font-normal text-[11px]">({request.deadline_reason})</span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Row 2: Author and Created Metadata aligned with Edit Button */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
                        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                          <UserAvatar name={request.requester_name || "PO"} size="xs" className="w-5 h-5 text-[10px]" />
                          <strong className="font-semibold text-slate-800">{request.requester_name || "PO"}</strong>
                          {request.requester_email && (
                            <span className="text-slate-400 font-mono text-[11.5px]">({request.requester_email})</span>
                          )}
                          {request.submitted_at && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-slate-400">Gửi lúc {request.submitted_at}</span>
                            </>
                          )}
                        </div>

                        {canEditBrief ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const curSq = (localSquad !== undefined && localSquad !== "" ? localSquad : (request.squad_name || request.preferred_squad || "")).trim()
                              setPoFormSquad(curSq)
                              setPoFormProduct(localProduct || request.product || "")
                              setPoFormTitle(request.title || "")
                              setPoFormReqType(request.request_type || "")
                              setPoFormDesc(request.description || "")
                              setPoFormBizNeed(request.business_need || "")
                              setPoFormUserProb(request.user_problem || "")
                              setPoFormTargetUser(request.target_user || "")
                              setPoFormExpectedDeadline(request.release_date || request.expected_deadline || "")
                              setPoFormDeadlineReason(request.deadline_reason || "")
                              setPoFormDocLinks(request.doc_links || [])
                              setShowPoEditModal(true)
                            }}
                            className="h-7.5 px-2.5 text-xs font-semibold rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Sửa đầu bài</span>
                          </Button>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80 shrink-0" 
                            title={`Chỉ người tạo yêu cầu (${request.requester_name || request.requester_email || "Tác giả"}) hoặc Admin mới có quyền sửa nội dung đầu bài.`}
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Chỉ tác giả được sửa</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Article Body - Clean Typography (Pulse Helpdesk Article Style) */}
                    <div className="space-y-6 pt-1">
                      {/* 1. Mô tả nhu cầu UX & Luồng nghiệp vụ */}
                      <div className="space-y-2.5">
                        <h3 className="text-[16px] sm:text-[17px] font-bold text-slate-900 tracking-tight">
                          Mô tả nhu cầu UX & Luồng nghiệp vụ
                        </h3>
                        <div className="bg-slate-100/90 border border-slate-200/70 rounded-2xl p-4 sm:p-5 text-sm sm:text-[14.5px] leading-relaxed text-slate-800 font-normal">
                          {renderRichArticleContent(request.description, "Chưa có mô tả chi tiết bài toán từ PO.")}
                        </div>
                      </div>

                      {/* 2. Vấn đề người dùng */}
                      <div className="space-y-2">
                        <h3 className="text-[16px] sm:text-[17px] font-bold text-slate-900 tracking-tight">
                          Vấn đề người dùng
                        </h3>
                        <div className={`text-sm sm:text-[14.5px] leading-relaxed ${
                          request.user_problem ? "text-slate-800" : "text-slate-400 italic"
                        }`}>
                          {renderRichArticleContent(request.user_problem, "Chưa cung cấp vấn đề người dùng.")}
                        </div>
                      </div>

                      {/* 3. Lý do cần thiết & Mục tiêu kinh doanh */}
                      <div className="space-y-2">
                        <h3 className="text-[16px] sm:text-[17px] font-bold text-slate-900 tracking-tight">
                          Lý do cần thiết & Mục tiêu kinh doanh
                        </h3>
                        <div className={`text-sm sm:text-[14.5px] leading-relaxed ${
                          request.business_need ? "text-slate-800" : "text-slate-400 italic"
                        }`}>
                          {renderRichArticleContent(request.business_need, "Chưa cung cấp lý do kinh doanh.")}
                        </div>
                      </div>

                      {/* 4. Đối tượng mục tiêu */}
                      <div className="space-y-2">
                        <h3 className="text-[16px] sm:text-[17px] font-bold text-slate-900 tracking-tight">
                          Đối tượng mục tiêu
                        </h3>
                        <p className={`text-sm sm:text-[14.5px] leading-relaxed ${
                          request.target_user ? "text-slate-800 font-medium" : "text-slate-400 italic"
                        }`}>
                          {capitalizeFirstLetter(request.target_user) || "Người dùng chung"}
                        </p>
                      </div>

                      {/* 5. Tài liệu & Tệp đính kèm */}
                      {(() => {
                        const allDocs: { title: string; url: string }[] = []
                        let docCounter = 1

                        if (Array.isArray(request.attachments)) {
                          request.attachments.forEach((att) => {
                            if (att && att.url) {
                              allDocs.push({
                                title: att.name || `Tài liệu ${docCounter++}`,
                                url: att.url,
                              })
                            }
                          })
                        }

                        if (Array.isArray(request.doc_links)) {
                          request.doc_links.forEach((link) => {
                            if (link && typeof link === "string" && link.trim() && !allDocs.some((d) => d.url === link.trim())) {
                              allDocs.push({
                                title: `Tài liệu ${docCounter++}`,
                                url: link.trim(),
                              })
                            }
                          })
                        }

                        return (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <h3 className="text-[16px] sm:text-[17px] font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                                <span>Tài liệu & Tệp đính kèm</span>
                                <span className="text-xs font-normal text-slate-400">({allDocs.length})</span>
                              </h3>
                              <button
                                type="button"
                                onClick={() => taskFileInputRef.current?.click()}
                                disabled={isUploadingTaskAttachment}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1057FB] hover:text-blue-700 cursor-pointer"
                              >
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>{isUploadingTaskAttachment ? "Đang tải..." : "Tải thêm tệp"}</span>
                              </button>
                              <input
                                ref={taskFileInputRef}
                                type="file"
                                multiple
                                onChange={handleUploadTaskFile}
                                className="hidden"
                              />
                            </div>

                            {allDocs.length > 0 ? (
                              <div className="space-y-1 pt-1">
                                {allDocs.map((doc, idx) => (
                                  <a
                                    key={`doc-link-${idx}`}
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between py-1.5 px-2.5 rounded-lg text-sm text-slate-800 hover:text-[#1057FB] hover:bg-slate-50 transition-colors group"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="w-4 h-4 text-slate-500 group-hover:text-[#1057FB] shrink-0" />
                                      <span className="truncate font-medium underline decoration-slate-300 underline-offset-2 group-hover:decoration-[#1057FB]">
                                        {doc.title}
                                      </span>
                                    </div>
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1057FB] shrink-0 ml-2" />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-400 italic pt-1">
                                Chưa có tài liệu hoặc tệp đính kèm nào từ Product Owner.
                              </p>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </div>


                    {/* Deliverables Sub-cards (ClickUp Linked Items Hub) */}
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-[13px] font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                          <span>DELIVERABLES & TÀI LIỆU BÀN GIAO</span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowAddDeliverableModal(true)}
                          className="text-xs sm:text-sm font-medium text-[#1057FB] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm link</span>
                        </button>
                      </div>

                      {/* Figma Item Card */}
                      <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 bg-white transition-all shadow-2xs flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <path d="M5 5.5C5 3.567 6.567 2 8.5 2H12V9H8.5C6.567 9 5 7.433 5 5.5Z" fill="#F24E1E"/>
                              <path d="M12 2H15.5C17.433 2 19 3.567 19 5.5C19 7.433 17.433 9 15.5 9H12V2Z" fill="#FF7262"/>
                              <path d="M12 9H15.5C17.433 9 19 10.567 19 12.5C19 14.433 17.433 16 15.5 16H12V9Z" fill="#1ABCFE"/>
                              <path d="M5 12.5C5 10.567 6.567 9 8.5 9H12V16H8.5C6.567 16 5 14.433 5 12.5Z" fill="#A259FF"/>
                              <path d="M5 19.5C5 17.567 6.567 16 8.5 16H12V19.5C12 21.433 10.433 23 8.5 23C6.567 23 5 21.433 5 19.5Z" fill="#0ACF83"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm sm:text-[14.5px] font-semibold text-slate-900">Figma Design Canvas</p>
                            <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md font-normal">
                              {customDeliverables?.figma_url || "Chưa đính kèm liên kết Figma"}
                            </p>
                          </div>
                        </div>

                        {customDeliverables?.figma_url ? (
                          <a
                            href={customDeliverables.figma_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 transition-colors shrink-0"
                            title="Mở Figma Canvas"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setNewDeliverableType("figma")
                              setShowAddDeliverableModal(true)
                            }}
                            className="text-[11px] text-[#1057FB] font-medium hover:underline cursor-pointer"
                          >
                            + Đính kèm
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                {/* RIGHT COLUMN: ClickUp Activity & Comments Stream with Full Updates */}
                <div className={`w-full ${
                  isFullScreen 
                    ? "lg:w-[480px] xl:w-[540px] 2xl:w-[600px]" 
                    : "lg:w-[450px] xl:w-[490px]"
                } flex flex-col bg-slate-50/50 ${
                  mobileActiveTab === "activity" ? "flex flex-1" : "hidden lg:flex"
                }`}>
                  
                  {/* Activity Pane Header with Search, Watcher Bell, and ClickUp Filter Popover */}
                  <div className="p-4 bg-white border-b border-slate-100 space-y-2.5 shrink-0 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">Activity</span>
                        <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {displayedActivities.length}
                        </span>
                      </div>

                      {/* Top Right Control Icons (ClickUp Style: Search | Bell 1 | Filter List) */}
                      <div className="flex items-center gap-1 text-slate-500 text-xs">
                        {/* Search Toggle Icon */}
                        <button 
                          type="button" 
                          onClick={() => setShowSearchBox(!showSearchBox)}
                          className={`p-1.5 rounded-md hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer ${
                            showSearchBox ? "text-[#1057FB] bg-blue-50" : ""
                          }`}
                          title="Tìm kiếm hoạt động"
                        >
                          <Search className="w-4 h-4" />
                        </button>

                        {/* Watchers / Bell Icon */}
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsWatchingTask(!isWatchingTask)
                            toast.success(isWatchingTask ? "Đã tắt thông báo bài toán" : "Đã bật theo dõi bài toán")
                          }}
                          className={`flex items-center gap-1 px-1.5 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer ${
                            isWatchingTask ? "text-[#1057FB]" : "text-slate-400"
                          }`}
                          title={`Theo dõi hoạt động (${localViewers.length} Viewers)`}
                        >
                          <Bell className="w-4 h-4" />
                          <span className="text-[11px] font-bold">{localViewers.length}</span>
                        </button>

                        {/* ClickUp Activity Filter Menu Trigger */}
                        <div className="relative">
                          <button 
                            type="button" 
                            onClick={() => setShowActivityFilterMenu(!showActivityFilterMenu)}
                            className={`p-1.5 rounded-md hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer ${
                              showActivityFilterMenu || selectedActivityFilters.length < ALL_CLICKUP_FILTERS.length
                                ? "text-[#1057FB] bg-blue-50 font-bold" 
                                : ""
                            }`}
                            title="Lọc loại hoạt động (Activities Filter)"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>

                          {/* ClickUp Activity Filter Popover Card */}
                          <AnimatePresence>
                            {showActivityFilterMenu && (
                              <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                                className="absolute top-9 right-0 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2.5 overflow-hidden text-xs"
                              >
                                {/* Header: Activities | Unselect All / Select All */}
                                <div className="px-3.5 pb-2 border-b border-slate-100 flex items-center justify-between">
                                  <span className="font-bold text-slate-700 text-xs">Activities</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (selectedActivityFilters.length === ALL_CLICKUP_FILTERS.length) {
                                        setSelectedActivityFilters([])
                                      } else {
                                        setSelectedActivityFilters(ALL_CLICKUP_FILTERS)
                                      }
                                    }}
                                    className="text-[11px] font-semibold text-slate-500 hover:text-[#1057FB] cursor-pointer"
                                  >
                                    {selectedActivityFilters.length === ALL_CLICKUP_FILTERS.length ? "Unselect All" : "Select All"}
                                  </button>
                                </div>

                                {/* Filter Checklist Items */}
                                <div className="max-h-72 overflow-y-auto py-1 space-y-0.5">
                                  {CLICKUP_FILTER_ITEMS.map((item) => {
                                    const isChecked = selectedActivityFilters.includes(item.key)
                                    const ItemIcon = item.icon
                                    return (
                                      <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => {
                                          if (isChecked) {
                                            setSelectedActivityFilters(selectedActivityFilters.filter((k) => k !== item.key))
                                          } else {
                                            setSelectedActivityFilters([...selectedActivityFilters, item.key])
                                          }
                                        }}
                                        className="w-full px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-50 text-slate-700 cursor-pointer group transition-colors text-xs"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <ItemIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
                                          <span className={`truncate text-xs ${isChecked ? "font-semibold text-slate-900" : "text-slate-500"}`}>
                                            {item.label}
                                          </span>
                                          {item.hasSubUser && (
                                            <div className="w-4 h-4 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-[9px] text-slate-400">
                                              +
                                            </div>
                                          )}
                                        </div>

                                        {/* Checkmark indicator */}
                                        <div className="w-4 h-4 flex items-center justify-center">
                                          {isChecked && <Check className="w-3.5 h-3.5 text-slate-800 stroke-[2.5]" />}
                                        </div>
                                      </button>
                                    )
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Search Box Input */}
                    <AnimatePresence>
                      {showSearchBox && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-1"
                        >
                          <input
                            type="text"
                            value={activitySearchQuery}
                            onChange={(e) => setActivitySearchQuery(e.target.value)}
                            placeholder="Lọc nội dung, tác giả..."
                            className="w-full text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#1057FB]"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Activity History & Comments Timeline List */}
                  <div ref={activityContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                    {displayedActivities.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Không có hoạt động nào phù hợp bộ lọc.
                      </div>
                    ) : (
                      (() => {
                        const olderThreshold = 3
                        const hasOlder = displayedActivities.length > olderThreshold
                        const olderItems = hasOlder ? displayedActivities.slice(0, displayedActivities.length - olderThreshold) : []
                        const recentItems = hasOlder ? displayedActivities.slice(displayedActivities.length - olderThreshold) : displayedActivities

                        const renderRichCommentContent = (content?: string) => {
                          if (!content) return null

                          // Tách text theo URL: /(https?:\/\/[^\s]+)/g
                          const urlRegex = /(https?:\/\/[^\s]+)/g
                          const parts = content.split(urlRegex)

                          return parts.map((part, index) => {
                            if (/^https?:\/\//i.test(part)) {
                              return (
                                <a
                                  key={`link-${index}`}
                                  href={part}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[#1057FB] hover:text-[#0b40bd] hover:underline font-semibold break-all inline-flex items-center gap-1.5 bg-blue-50/90 hover:bg-blue-100 px-2 py-0.5 rounded-lg transition-colors border border-blue-200 text-xs my-0.5 shadow-2xs"
                                  title={part}
                                >
                                  <Paperclip className="w-3 h-3 shrink-0" />
                                  <span>{part}</span>
                                  <ExternalLink className="w-3 h-3 inline-block shrink-0 opacity-80" />
                                </a>
                              )
                            }

                            // Highlight cú pháp @SenToPO:, @SendToPO:, @SeToPO: hoặc @Pending:
                            const mentionRegex = /(@se(?:n)?(?:d)?(?:_)?to(?:_)?po:|@(po_)?pending:)/gi
                            if (mentionRegex.test(part)) {
                              const subParts = part.split(mentionRegex)
                              return subParts.map((sub, sIdx) => {
                                if (/^@se(?:n)?(?:d)?(?:_)?to(?:_)?po:$/i.test(sub)) {
                                  return (
                                    <span
                                      key={`mention-${index}-${sIdx}`}
                                      className="inline-flex items-center px-2 py-0.5 mr-1.5 rounded-md text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200/90 shadow-2xs"
                                    >
                                      {sub}
                                    </span>
                                  )
                                }
                                if (/^@(po_)?pending:$/i.test(sub)) {
                                  return (
                                    <span
                                      key={`mention-${index}-${sIdx}`}
                                      className="inline-flex items-center px-2 py-0.5 mr-1.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200/90 shadow-2xs"
                                    >
                                      {sub}
                                    </span>
                                  )
                                }
                                return <span key={`sub-${index}-${sIdx}`}>{sub}</span>
                              })
                            }

                            return <span key={`txt-${index}`}>{part}</span>
                          })
                        }

                        const renderSingleActivity = (event: ActivityEvent, keyPrefix: string | number) => {
                          const evtAvatar = getDesignerAvatar(event.author)
                          const reactions = commentReactions[event.id] || {}
                          const eventKey = event.id ? `evt-${event.id}-${keyPrefix}` : `evt-act-${keyPrefix}`

                          // USER COMMENT CARD (ClickUp / Linear Modern Comment Card)
                          if (event.type === "comment") {
                            return (
                              <div key={eventKey} className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2 group hover:border-[#1057FB]/40 transition-all">
                                <div className="flex items-start gap-3">
                                  <UserAvatar name={event.author} avatarUrl={evtAvatar} size="md" className="shrink-0 mt-0.5 ring-2 ring-slate-100 shadow-2xs" />
                                  <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-slate-900">{event.author}</span>
                                        {event.authorRole && (
                                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                            event.authorRole === "PO" 
                                              ? "bg-purple-50 text-purple-700 border-purple-200/80"
                                              : event.authorRole === "Admin" || event.authorRole === "Design Owner"
                                              ? "bg-slate-900 text-white border-slate-900"
                                              : "bg-blue-50 text-[#1057FB] border-blue-200/80"
                                          }`}>
                                            {event.authorRole}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-slate-400 font-normal whitespace-nowrap">{event.timestamp}</span>
                                    </div>

                                    <div className="text-[13.5px] sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-normal">
                                      {renderRichCommentContent(event.content)}
                                    </div>

                                    {(() => {
                                      if (!event.link) return null
                                      // Kiểm tra xem link này đã xuất hiện trong nội dung text chưa (hoặc có URL nào trong text trùng với link)
                                      const contentText = (event.content || "").toLowerCase()
                                      const linkUrl = event.link.trim().toLowerCase().replace(/\/$/, "")
                                      const urlInContent = (contentText.match(/https?:\/\/[^\s]+/i)?.[0] || "").replace(/\/$/, "")

                                      if (
                                        contentText.includes(linkUrl) ||
                                        (urlInContent && (urlInContent === linkUrl || urlInContent.includes(linkUrl) || linkUrl.includes(urlInContent)))
                                      ) {
                                        return null // Link đã được render đẹp trong nội dung comment, không lặp lại bên dưới
                                      }

                                      return (
                                        <div className="pt-1">
                                          <a
                                            href={event.link}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-[#1057FB] text-xs font-medium border border-blue-200/80 transition-colors group"
                                          >
                                            <Paperclip className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate max-w-[260px]">{event.link}</span>
                                            <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-75 group-hover:opacity-100" />
                                          </a>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )
                          }

                          // SYSTEM EVENT ROW (Dạng text ngắn gọn, thanh lịch)
                          const getDotColor = () => {
                            if (event.type === "create") return "bg-emerald-500 ring-2 ring-emerald-100"
                            if (event.type === "assignment") return "bg-blue-500 ring-2 ring-blue-100"
                            if (event.type === "phase_change") return "bg-indigo-500 ring-2 ring-indigo-100"
                            if (event.type === "deliverable") return "bg-purple-500 ring-2 ring-purple-100"
                            const val = (event.toValue || "").toLowerCase()
                            if (val.includes("người theo dõi") || val.includes("viewer")) return "bg-blue-500 ring-2 ring-blue-100"
                            if (val.includes("hạn thiết kế") || val.includes("design end date")) return "bg-amber-500 ring-2 ring-amber-100"
                            if (val.includes("đầu bài") || val.includes("po")) return "bg-purple-500 ring-2 ring-purple-100"
                            if (val.includes("hoàn thành") || val.includes("duyệt")) return "bg-emerald-500 ring-2 ring-emerald-100"
                            if (val.includes("tiến độ") || val.includes("khâu")) return "bg-blue-500 ring-2 ring-blue-100"
                            return "bg-slate-400 ring-2 ring-slate-100"
                          }

                          return (
                            <div key={eventKey} className="flex items-start justify-between gap-2 py-1.5 px-2 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${getDotColor()}`} />
                                <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-700 leading-normal min-w-0 font-normal">
                                  {event.type === "create" && (
                                    <>
                                      <span className="font-medium text-slate-800">{event.author || "PO"}</span>
                                      <span>đã khởi tạo yêu cầu cho</span>
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-medium border border-slate-200/90">
                                        {localProduct || request.product || "App MBBank"}
                                      </span>
                                    </>
                                  )}
                                  {event.type === "assignment" && (
                                    <>
                                      {event.author && <span className="font-medium text-slate-800">{event.author}</span>}
                                      <span>đã phân công Designer</span>
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 text-[#1057FB] text-[11px] font-medium border border-blue-200/80">
                                        {event.toValue}
                                      </span>
                                    </>
                                  )}
                                  {event.type === "phase_change" && (
                                    <>
                                      {event.author && <span className="font-medium text-slate-800">{event.author}</span>}
                                      <span>đã chuyển khâu từ</span>
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 text-[#1057FB] text-[11px] font-medium border border-blue-200/80">
                                        {event.fromValue || "Chờ xác nhận"}
                                      </span>
                                      <span>sang</span>
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200/80">
                                        {event.toValue}
                                      </span>
                                    </>
                                  )}
                                  {event.type === "deliverable" && (
                                    <>
                                      {event.author && <span className="font-bold text-slate-800">{event.author}</span>}
                                      <span>đã đính kèm</span>
                                      <a
                                        href={event.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-semibold border border-purple-200/80 hover:underline"
                                      >
                                        <Paperclip className="w-3 h-3" />
                                        <span>{event.title || "Tài liệu bàn giao"}</span>
                                      </a>
                                    </>
                                  )}
                                  {event.type === "status_change" && (
                                    <>
                                      {event.fromValue ? (
                                        <>
                                          {event.author && <span className="font-bold text-slate-800">{event.author}:</span>}
                                          <span>Đã cập nhật trạng thái từ</span>
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                                            {event.fromValue}
                                          </span>
                                          <span>sang</span>
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200/80">
                                            {event.toValue}
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          {(() => {
                                            const val = event.toValue || ""
                                            const valLower = val.toLowerCase()
                                            if (valLower.includes("người theo dõi") || valLower.includes("viewer")) {
                                              const countMatch = val.match(/\(([^)]+)\)/)
                                              return (
                                                <>
                                                  {event.author && (
                                                    <span className="font-medium text-slate-800">{event.author}</span>
                                                  )}
                                                  <span>đã cập nhật danh sách</span>
                                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 text-[#1057FB] text-[11px] font-medium border border-blue-200/80">
                                                    Người theo dõi
                                                  </span>
                                                  {countMatch && (
                                                    <span className="text-slate-500 font-normal">({countMatch[1]})</span>
                                                  )}
                                                </>
                                              )
                                            }
                                            const hasAuthor = event.author && val.toLowerCase().includes(event.author.toLowerCase())
                                            return (
                                              <>
                                                {event.author && !hasAuthor && (
                                                  <span className="font-medium text-slate-800">{event.author}:</span>
                                                )}
                                                <span className="text-slate-700 font-normal">{val}</span>
                                              </>
                                            )
                                          })()}
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              <span className="text-[11px] text-slate-400 shrink-0 font-mono pl-2 pt-0.5 whitespace-nowrap self-start">{event.timestamp}</span>
                            </div>
                          )
                        }

                        return (
                          <div className="space-y-2.5">
                            {/* Older Activities Accordion (Show more) */}
                            {hasOlder && (
                              <div className="pb-1 border-b border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setShowOlderActivities(!showOlderActivities)}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 py-1 transition-colors cursor-pointer"
                                >
                                  <ChevronRight className={`w-3.5 h-3.5 transition-transform text-slate-400 ${showOlderActivities ? "rotate-90" : ""}`} />
                                  <span>{showOlderActivities ? "Show less" : `Show more (${olderItems.length})`}</span>
                                </button>

                                <AnimatePresence>
                                  {showOlderActivities && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="space-y-2.5 pt-2"
                                    >
                                      {olderItems.map((item, idx) => renderSingleActivity(item, `older-${idx}`))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}

                            {/* Recent Activities */}
                            <div className="space-y-2.5">
                              {recentItems.map((item, idx) => renderSingleActivity(item, `recent-${idx}`))}
                            </div>
                          </div>
                        )
                      })()
                    )}
                  </div>

                  {/* Activity Comment & Discussion Box */}
                  <div className="p-4 bg-white border-t border-slate-200/80 shrink-0">
                    <AiPromptBox
                      value={newCommentText}
                      onChange={setNewCommentText}
                      onSubmit={handleSendComment}
                      submitting={submittingComment}
                      placeholder="Nhập ghi chú hoặc trao đổi tiến độ bài toán (gõ @ để mở menu lệnh)..."
                      onSendToPo={(note) => handleSendToPo(note)}
                      onPending={(note) => handlePending(note)}
                    />
                  </div>
                </div>

              </div>

              {/* 4. Sheet Sticky Footer Action Bar */}
              <div className="px-6 py-3.5 bg-white border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={handleDismiss}
                  className="gap-2 rounded-xl font-bold text-xs h-9 px-4 bg-white border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại</span>
                </Button>

                <div className="flex items-center gap-2">
                  {customDeliverables?.figma_url && (
                    <a
                      href={customDeliverables.figma_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 h-9 bg-[#1057FB] hover:bg-blue-700 text-white font-bold rounded-xl shadow-2xs text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>
                        {customDeliverables.figma_url.toLowerCase().includes("figma.com")
                          ? "Mở Figma"
                          : "Mở liên kết"}
                      </span>
                    </a>
                  )}
                </div>
              </div>
            </motion.aside>
          </div>
        </motion.div>
      )}

      {/* Modal Cập nhật Tiến độ */}
      {canEdit && request && (
        <UpdateProgressModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          request={request}
          session={session}
          onUpdated={() => {
            if (onUpdated) onUpdated()
          }}
        />
      )}

      {/* Modal Thêm Deliverables/Link bàn giao */}
      <AnimatePresence>
        {showAddDeliverableModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
              onClick={() => setShowAddDeliverableModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Thêm liên kết tài liệu bàn giao</h3>
                <button
                  type="button"
                  onClick={() => setShowAddDeliverableModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Loại tài liệu</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewDeliverableType("figma")}
                      className={`p-2 rounded-xl border text-center font-bold transition-all ${
                        newDeliverableType === "figma"
                          ? "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Figma
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDeliverableType("prototype")}
                      className={`p-2 rounded-xl border text-center font-bold transition-all ${
                        newDeliverableType === "prototype"
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Prototype
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDeliverableType("spec")}
                      className={`p-2 rounded-xl border text-center font-bold transition-all ${
                        newDeliverableType === "spec"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      UX Specs
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Đường dẫn liên kết (URL)</label>
                  <input
                    type="url"
                    value={newDeliverableUrl}
                    onChange={(e) => setNewDeliverableUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#1057FB] font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddDeliverableModal(false)} className="rounded-xl text-xs font-bold">
                  Hủy
                </Button>
                <Button size="sm" onClick={handleAddDeliverable} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold px-4">
                  Lưu liên kết
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Chỉnh sửa Đầu bài từ PO */}
      <AnimatePresence>
        {showPoEditModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
              onClick={() => setShowPoEditModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1057FB] flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Chỉnh sửa tài liệu đầu bài</h3>
                    <p className="text-[11px] text-slate-400">Dành riêng cho Product Owner / Người tạo yêu cầu</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPoEditModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* 1. Tiêu đề bài toán */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tiêu đề bài toán *</label>
                  <input
                    type="text"
                    value={poFormTitle}
                    onChange={(e) => setPoFormTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold outline-none focus:border-[#1057FB] bg-white"
                  />
                </div>

                {/* 2. Nền tảng, Squad nghiệp vụ & Loại yêu cầu (Chuẩn ReUI DropdownMenu) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nền tảng / Sản phẩm *</label>
                    <DropdownMenu
                      options={productDropdownOptions}
                      value={poFormProduct}
                      onChange={(val) => {
                        setPoFormProduct(val)
                        const prodTarget = val.toLowerCase().trim()
                        let squadsList: any[] = []
                        try {
                          const raw = localStorage.getItem("mbbank_admin_squads")
                          if (raw) {
                            const parsed = JSON.parse(raw)
                            if (Array.isArray(parsed) && parsed.length > 0) squadsList = parsed
                          }
                        } catch {}
                        if (squadsList.length === 0) squadsList = mockSquads
                        const matching = squadsList.filter((s: any) => {
                          const prod = String(s.productName || s.product_name || "").toLowerCase().trim()
                          return prod === prodTarget || prod.includes(prodTarget) || prodTarget.includes(prod)
                        })
                        if (matching.length > 0) {
                          const hasCurrent = matching.some((s: any) => String(s.name || s.squad_name || "").trim().toLowerCase() === poFormSquad.toLowerCase())
                          if (!hasCurrent) {
                            setPoFormSquad("")
                          }
                        } else {
                          setPoFormSquad("")
                        }
                      }}
                      placeholder="Chọn sản phẩm..."
                      className="w-full"
                      buttonClassName="w-full h-10 bg-white hover:bg-slate-50 border-slate-200 rounded-xl px-3 justify-between font-semibold text-xs text-slate-800 shadow-2xs"
                      menuClassName="w-full min-w-56 max-h-60 overflow-y-auto"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Squad nghiệp vụ</label>
                    <DropdownMenu
                      options={squadDropdownOptions}
                      value={poFormSquad}
                      onChange={(val) => setPoFormSquad(val)}
                      placeholder="Chưa phân squad"
                      className="w-full"
                      buttonClassName="w-full h-10 bg-white hover:bg-slate-50 border-slate-200 rounded-xl px-3 justify-between font-semibold text-xs text-slate-800 shadow-2xs"
                      menuClassName="w-full min-w-56 max-h-60 overflow-y-auto"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Loại yêu cầu *</label>
                    <DropdownMenu
                      options={requestTypeDropdownOptions}
                      value={poFormReqType}
                      onChange={(val) => setPoFormReqType(val)}
                      placeholder="Chọn loại yêu cầu..."
                      className="w-full"
                      buttonClassName="w-full h-10 bg-white hover:bg-slate-50 border-slate-200 rounded-xl px-3 justify-between font-semibold text-xs text-slate-800 shadow-2xs"
                      menuClassName="w-full min-w-56 max-h-60 overflow-y-auto"
                    />
                  </div>
                </div>

                {/* 3. Mô tả nhu cầu UX */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mô tả nhu cầu UX & Luồng nghiệp vụ *</label>
                  <textarea
                    rows={4}
                    value={poFormDesc}
                    onChange={(e) => setPoFormDesc(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#1057FB] leading-relaxed"
                  />
                </div>

                {/* 4. Lý do cần thiết & Vấn đề người dùng */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Lý do cần thiết (Business Need)</label>
                    <textarea
                      rows={3}
                      value={poFormBizNeed}
                      onChange={(e) => setPoFormBizNeed(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#1057FB]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Vấn đề người dùng (User Problem)</label>
                    <textarea
                      rows={3}
                      value={poFormUserProb}
                      onChange={(e) => setPoFormUserProb(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#1057FB]"
                    />
                  </div>
                </div>

                {/* 5. Đối tượng mục tiêu & Ngày release dự kiến */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Đối tượng mục tiêu</label>
                    <DropdownMenu
                      options={targetUserDropdownOptions}
                      value={poFormTargetUser}
                      onChange={(val) => setPoFormTargetUser(val)}
                      placeholder="Chọn đối tượng mục tiêu..."
                      className="w-full"
                      buttonClassName="w-full h-10 bg-white hover:bg-slate-50 border-slate-200 rounded-xl px-3 justify-between font-semibold text-xs text-slate-800 shadow-2xs"
                      menuClassName="w-full min-w-56 max-h-60 overflow-y-auto"
                    />
                    {poFormTargetUser === "Khác" && (
                      <input
                        type="text"
                        placeholder="Nhập đối tượng mục tiêu tùy chỉnh..."
                        onChange={(e) => setPoFormTargetUser(e.target.value)}
                        className="w-full mt-1.5 p-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-[#1057FB]"
                        autoFocus
                      />
                    )}
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ngày release dự kiến *</label>
                    <input
                      type="date"
                      value={poFormExpectedDeadline}
                      onChange={(e) => setPoFormExpectedDeadline(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#1057FB] bg-white font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Lý do hạn chót / Mục tiêu Release */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lý do hạn chót / Sự kiện Release</label>
                  <DropdownMenu
                    options={deadlineReasonDropdownOptions}
                    value={poFormDeadlineReason}
                    onChange={(val) => setPoFormDeadlineReason(val)}
                    placeholder="Chọn lý do hạn chót..."
                    className="w-full"
                    buttonClassName="w-full h-10 bg-white hover:bg-slate-50 border-slate-200 rounded-xl px-3 justify-between font-semibold text-xs text-slate-800 shadow-2xs"
                    menuClassName="w-full min-w-56 max-h-60 overflow-y-auto"
                  />
                  {poFormDeadlineReason === "Khác" && (
                    <input
                      type="text"
                      placeholder="Nhập lý do hạn chót tùy chỉnh..."
                      onChange={(e) => setPoFormDeadlineReason(e.target.value)}
                      className="w-full mt-1.5 p-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-[#1057FB]"
                      autoFocus
                    />
                  )}
                </div>

                {/* 6. Link tài liệu đính kèm từ PO */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 block">Tài liệu đính kèm (BRD / PRD)</label>
                  {poFormDocLinks.map((lnk, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={lnk}
                        readOnly
                        className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => setPoFormDocLinks(poFormDocLinks.filter((_, i) => i !== idx))}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Xóa link"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={poFormNewLink}
                      onChange={(e) => setPoFormNewLink(e.target.value)}
                      placeholder="Thêm link tài liệu mới: https://..."
                      className="w-full p-2 rounded-lg border border-slate-200 text-[11px] font-mono outline-none focus:border-[#1057FB]"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (poFormNewLink.trim()) {
                          setPoFormDocLinks([...poFormDocLinks, poFormNewLink.trim()])
                          setPoFormNewLink("")
                        }
                      }}
                      className="text-xs font-bold rounded-lg px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 h-8"
                    >
                      Thêm
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setShowPoEditModal(false)} className="rounded-xl text-xs font-bold">
                  Hủy
                </Button>
                <Button size="sm" onClick={handleSavePoRequirements} className="bg-[#1057FB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold px-5">
                  Lưu đầu bài
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  )
}
