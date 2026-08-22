import React, { useState, useMemo, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UXRequest, TaskUpdateRecord } from "../../data/mockData"
import UpdateProgressModal from "./UpdateProgressModal"
import { getStoredSession, getUserInitials } from "../../services/otpAuthService"
import { uploadFileToDrive } from "../../services/googleSheetService"
import { UserAvatar } from "@/components/common/UserAvatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getStatusConfig } from "@/config/statusConfig"
import { toast } from "@/components/ui/toast"
import { updateTaskProgress } from "../../api/api"
import { AiPromptBox } from "@/components/jolyui/ai-prompt-box"
import { 
  X, 
  ArrowLeft, 
  Send, 
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
  UploadCloud,
  Download,
  Image as ImageIcon,
  FileSpreadsheet,
  FileBox
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

const DESIGNER_OPTIONS = [
  { name: "Lê Hoàng Nam", role: "Designer", email: "nam.designer@mbbank.com.vn", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80" },
  { name: "Nguyễn Văn Cường", role: "Design Owner", email: "cuong.owner@mbbank.com.vn", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" },
  { name: "Trần Mai Lan", role: "UX Lead", email: "lan.po@mbbank.com.vn", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" },
  { name: "UX Designer phụ trách", role: "Designer", email: "ux.designer@mbbank.com.vn", avatar: "" },
]

const STATUS_OPTIONS = [
  { value: "Chờ tiếp nhận", label: "QUEUED", color: "bg-slate-200 text-slate-800 hover:bg-slate-300" },
  { value: "Đang phân loại", label: "TRIAGE", color: "bg-amber-100 text-amber-800 hover:bg-amber-200" },
  { value: "Đang thực hiện", label: "IN PROGRESS", color: "bg-[#1057FB] text-white hover:bg-blue-700" },
  { value: "Hoàn thành", label: "RELEASE", color: "bg-emerald-600 text-white hover:bg-emerald-700" },
  { value: "Bị chặn", label: "BLOCKED", color: "bg-rose-500 text-white hover:bg-rose-600" },
]

const PRIORITY_OPTIONS = [
  { value: "Urgent", label: "Khẩn cấp", color: "text-rose-600 bg-rose-50 border-rose-200", flagFill: "fill-rose-500 text-rose-500" },
  { value: "High", label: "High (Cao)", color: "text-amber-600 bg-amber-50 border-amber-200", flagFill: "fill-amber-500 text-amber-500" },
  { value: "Normal", label: "Normal (Vừa)", color: "text-blue-600 bg-blue-50 border-blue-200", flagFill: "fill-blue-500 text-blue-500" },
  { value: "Low", label: "Low (Thấp)", color: "text-slate-600 bg-slate-50 border-slate-200", flagFill: "fill-slate-400 text-slate-400" },
]

const UX_PHASES_MB = [
  { key: "Phân loại", label: "1. Phân loại", progress: 15 },
  { key: "Discovery", label: "2. Discovery", progress: 35 },
  { key: "User Flow", label: "3. User Flow", progress: 55 },
  { key: "UI Design", label: "4. UI Design", progress: 75 },
  { key: "Prototype", label: "5. Prototype", progress: 90 },
  { key: "Bàn giao", label: "6. Bàn giao", progress: 100 },
]

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

export default function RequestDetail({
  request,
  open = true,
  onBack,
  onClose,
  onUpdated,
}: RequestDetailProps) {
  const handleDismiss = onClose || onBack || (() => {})
  const isVisible = Boolean(open && request)
  const session = getStoredSession()

  const rawDesigner = request?.assigned_designer || (request?.ux_owner && request.ux_owner !== "Chưa phân công" && request.ux_owner !== "Đang phân công" ? request.ux_owner : "") || ""
  const isAssigned = Boolean(rawDesigner && rawDesigner !== "Chưa phân công" && rawDesigner !== "Đang phân công")
  const displayName = isAssigned ? formatDesignerDisplayName(rawDesigner) : "Chưa phân công"
  const designerAvatar = isAssigned ? getDesignerAvatar(displayName) : ""

  const [isFullScreen, setIsFullScreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [newCommentText, setNewCommentText] = useState("")
  const [commentLink, setCommentLink] = useState("")
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
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
  const [openDropdown, setOpenDropdown] = useState<"status" | "assignee" | "date" | "priority" | "estimate" | "phase" | "tags" | null>(null)
  const [currentPriority, setCurrentPriority] = useState<string>("High")
  const [timeEstimate, setTimeEstimate] = useState<string>("40 hrs")
  const [isTrackingTime, setIsTrackingTime] = useState<boolean>(false)
  const [trackedSeconds, setTrackedSeconds] = useState<number>(0)
  const [activeTags, setActiveTags] = useState<string[]>(["Lending", "UX Research"])
  const [customDeadline, setCustomDeadline] = useState<string>(request?.expected_deadline || "")
  const [customDeliverables, setCustomDeliverables] = useState(request?.deliverables || {})
  const [showAddDeliverableModal, setShowAddDeliverableModal] = useState(false)
  const [newDeliverableType, setNewDeliverableType] = useState<"figma" | "prototype" | "spec">("figma")
  const [newDeliverableUrl, setNewDeliverableUrl] = useState("")
  const [commentReactions, setCommentReactions] = useState<Record<string, Record<string, number>>>({})
  const [showOlderActivities, setShowOlderActivities] = useState<boolean>(false)
  const [activeEmojiPickerEventId, setActiveEmojiPickerEventId] = useState<string | null>(null)

  // PO Requirements Editing (Only PO can edit, Designer can only view)
  const [showPoEditModal, setShowPoEditModal] = useState(false)
  const [poFormTitle, setPoFormTitle] = useState(request?.title || "")
  const [poFormProduct, setPoFormProduct] = useState(request?.product || "")
  const [poFormReqType, setPoFormReqType] = useState(request?.request_type || "")
  const [poFormDesc, setPoFormDesc] = useState(request?.description || "")
  const [poFormBizNeed, setPoFormBizNeed] = useState(request?.business_need || "")
  const [poFormUserProb, setPoFormUserProb] = useState(request?.user_problem || "")
  const [poFormTargetUser, setPoFormTargetUser] = useState(request?.target_user || "")
  const [poFormDocLinks, setPoFormDocLinks] = useState<string[]>(request?.doc_links || [])
  const [poFormNewLink, setPoFormNewLink] = useState("")

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
      const uPrefix = userEmail.split("@")[0]
      const rPrefix = requesterEmail.split("@")[0]
      if (uPrefix && rPrefix && (uPrefix === rPrefix || uPrefix.includes(rPrefix) || rPrefix.includes(uPrefix))) return true
    }
    if (requesterName && userName) {
      if (userName.includes(requesterName) || requesterName.includes(userName)) return true
    }
    return false
  }, [request, session])

  useEffect(() => {
    if (request) {
      setTitleValue(request.title || "")
      setDescValue(request.description || "")
      setCustomDeadline(request.expected_deadline || "")
      setCustomDeliverables(request.deliverables || {})
      setPoFormTitle(request.title || "")
      setPoFormProduct(request.product || "")
      setPoFormReqType(request.request_type || "")
      setPoFormDesc(request.description || "")
      setPoFormBizNeed(request.business_need || "")
      setPoFormUserProb(request.user_problem || "")
      setPoFormTargetUser(request.target_user || "")
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

  const handleSelectCalDay = (day: number) => {
    const formatted = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    setCustomDeadline(formatted)
    setOpenDropdown(null)
    toast.success(`Đã cập nhật Estimate End Date: ${formatted}`)
  }

  const monthNamesVi = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ]
  const dayHeadersVi = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

  const handleSavePoRequirements = async () => {
    if (!request) return
    request.title = poFormTitle
    request.product = poFormProduct
    request.request_type = poFormReqType
    request.description = poFormDesc
    request.business_need = poFormBizNeed
    request.user_problem = poFormUserProb
    request.target_user = poFormTargetUser
    request.doc_links = poFormDocLinks

    setTitleValue(poFormTitle)
    setDescValue(poFormDesc)
    setShowPoEditModal(false)

    try {
      await updateTaskProgress(request.request_id, {
        new_phase: request.current_phase,
        new_status: request.status,
        new_progress: request.progress,
        note: `PO cập nhật đầu bài: ${poFormTitle}`,
        assigned_designer: request.assigned_designer,
      })
      if (onUpdated) onUpdated()
      toast.success("Đã lưu cập nhật tài liệu đầu bài từ PO thành công!")
    } catch {
      toast.success("Đã lưu cập nhật tài liệu đầu bài từ PO!")
    }
  }

  // Keyboard Shortcuts (Esc to close, P for progress update)
  useEffect(() => {
    if (!isVisible) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !openDropdown && !isUpdateModalOpen && !showAddDeliverableModal) {
        handleDismiss()
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
    if (session.role === "Admin" || session.role === "Design Owner") return true
    if (session.role === "Designer") {
      const email = session.teamsEmail.toLowerCase()
      const assigned = (request?.assigned_designer || request?.ux_owner || "").toLowerCase()
      return !assigned || assigned.includes(email) || email.includes("designer") || email.includes("nam")
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
      const res = await updateTaskProgress(request.request_id, {
        new_phase: request.current_phase,
        new_status: newStatus,
        new_progress: newStatus === "Hoàn thành" ? 100 : request.progress,
        note: `Cập nhật trạng thái bài toán sang: ${newStatus}`,
        assigned_designer: request.assigned_designer,
      })
      if (res.success) {
        toast.success(`Đã chuyển trạng thái sang: ${newStatus}`, undefined, { id: toastId })
        if (onUpdated) onUpdated()
      } else {
        toast.error("Không thể đổi trạng thái", res.message, { id: toastId })
      }
    } catch {
      toast.error("Lỗi khi cập nhật trạng thái", undefined, { id: toastId })
    }
  }

  const handleUpdateAssignee = async (designerName: string) => {
    if (!request) return
    setOpenDropdown(null)
    const toastId = toast.loading(`Đang phân công cho [${designerName}]...`)
    try {
      const res = await updateTaskProgress(request.request_id, {
        new_phase: request.current_phase,
        new_status: request.status,
        new_progress: request.progress,
        note: `Phân công công việc cho designer: ${designerName}`,
        assigned_designer: designerName,
      })
      if (res.success) {
        toast.success(`Đã phân công thành công cho ${designerName}!`, undefined, { id: toastId })
        if (onUpdated) onUpdated()
      } else {
        toast.error("Không thể phân công", res.message, { id: toastId })
      }
    } catch {
      toast.error("Lỗi khi phân công", undefined, { id: toastId })
    }
  }

  const handleUpdatePhase = async (newPhase: string, progressVal: number) => {
    if (!request) return
    setOpenDropdown(null)
    const toastId = toast.loading(`Đang chuyển sang khâu [${newPhase}]...`)
    try {
      const res = await updateTaskProgress(request.request_id, {
        new_phase: newPhase,
        new_status: progressVal >= 100 ? "Hoàn thành" : "Đang thực hiện",
        new_progress: progressVal,
        note: `Chuyển tiến độ sang khâu [${newPhase}] (${progressVal}%)`,
        assigned_designer: request.assigned_designer,
      })
      if (res.success) {
        toast.success(`Đã chuyển sang khâu [${newPhase}]!`, undefined, { id: toastId })
        if (onUpdated) onUpdated()
      } else {
        toast.error("Không thể chuyển khâu", res.message, { id: toastId })
      }
    } catch {
      toast.error("Lỗi khi chuyển khâu", undefined, { id: toastId })
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

    // 1. Task Creation Event
    events.push({
      id: "EVT-CREATE",
      type: "create",
      timestamp: request.submitted_at || "19/08/2026 09:15",
      author: request.requester_email || "PO (Product Owner)",
      authorRole: "PO",
      title: "Đã khởi tạo yêu cầu UX",
      content: `Yêu cầu [${request.title}] được tạo cho Squad ${request.product || request.squad_name}.`,
    })

    // 2. Assignment Event
    if (request.assigned_designer || request.ux_owner) {
      events.push({
        id: "EVT-ASSIGN",
        type: "assignment",
        timestamp: request.submitted_at || "19/08/2026 10:30",
        author: "Nguyễn Văn Cường (Design Owner)",
        authorRole: "Design Owner",
        title: "Phân công Designer phụ trách",
        toValue: displayName,
      })
    }

    // 3. Deliverable Links Attached
    if (customDeliverables?.figma_url) {
      events.push({
        id: "EVT-FIGMA",
        type: "deliverable",
        timestamp: request.last_updated || "19/08/2026 14:20",
        author: displayName,
        authorRole: "Designer",
        title: "Đã đính kèm liên kết Figma Canvas",
        link: customDeliverables.figma_url,
      })
    }
    if (customDeliverables?.prototype_url) {
      events.push({
        id: "EVT-PROTO",
        type: "deliverable",
        timestamp: request.last_updated || "19/08/2026 16:45",
        author: displayName,
        authorRole: "Designer",
        title: "Đã đính kèm Interactive Prototype",
        link: customDeliverables.prototype_url,
      })
    }

    // 4. Task Update Records / Changelog & Comments
    if (request.task_updates && request.task_updates.length > 0) {
      request.task_updates.forEach((u, idx) => {
        const isSysNote = !u.note || 
          u.note.toLowerCase().startsWith("chuyển khâu") || 
          u.note.toLowerCase().startsWith("chuyển tiến độ") || 
          u.note.toLowerCase().startsWith("cập nhật trạng thái") || 
          u.note.toLowerCase().startsWith("phân công") || 
          u.note.toLowerCase().startsWith("khởi tạo") || 
          u.note.toLowerCase().startsWith("ghi nhận") ||
          u.note.toLowerCase().startsWith("đã tạo") ||
          u.note.toLowerCase().startsWith("cập nhật khâu")

        // Phase or Status Log (Bullet list UI)
        if (u.new_phase) {
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
        } else if (isSysNote && u.note) {
          events.push({
            id: `EVT-SYS-${u.id || idx}`,
            type: "status_change",
            timestamp: u.timestamp,
            author: formatDesignerDisplayName(u.updated_by),
            authorRole: u.author_role || "Designer",
            toValue: u.note,
          })
        }

        // Only REAL USER-ENTERED COMMENTS get a comment card
        if (!isSysNote && u.note && u.note.trim()) {
          events.push({
            id: `EVT-COMMENT-${u.id || idx}`,
            type: "comment",
            timestamp: u.timestamp,
            author: formatDesignerDisplayName(u.updated_by),
            authorRole: u.author_role || "Designer",
            content: u.note,
            link: u.deliverable_link,
            progress: u.new_progress,
          })
        }
      })
    } else if (request.latest_update) {
      const msg = request.latest_update.message || ""
      const isSys = msg.toLowerCase().startsWith("chuyển") || msg.toLowerCase().startsWith("cập nhật")
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
      } else {
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

    return events
  }, [request, displayName, customDeliverables])

  // Helper to parse dates into epoch milliseconds
  const parseDateToMs = (ts?: string): number => {
    if (!ts) return 0
    const dmyMatch = ts.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/)
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10)
      const month = parseInt(dmyMatch[2], 10) - 1
      const year = parseInt(dmyMatch[3], 10)
      const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0
      const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0
      return new Date(year, month, day, hour, minute).getTime()
    }
    const timeMatch = ts.match(/(\d{1,2}):(\d{1,2})/)
    if (timeMatch) {
      const hour = parseInt(timeMatch[1], 10)
      const minute = parseInt(timeMatch[2], 10)
      const d = new Date()
      d.setHours(hour, minute, 0, 0)
      return d.getTime()
    }
    return 0
  }

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

    setSubmittingComment(true)
    const toastId = toast.loading("Đang gửi trao đổi...")

    try {
      const res = await updateTaskProgress(request.request_id, {
        new_phase: request.current_phase,
        new_status: request.status,
        new_progress: request.progress,
        note: newCommentText.trim(),
        figma_url: commentLink.trim() || undefined,
        assigned_designer: request.assigned_designer,
      })

      if (res.success) {
        setNewCommentText("")
        setCommentLink("")
        setShowLinkInput(false)
        toast.success("Đã đăng trao đổi & cập nhật Activity!", undefined, { id: toastId })
        if (onUpdated) onUpdated()
      } else {
        toast.error("Không thể gửi bình luận", res.message, { id: toastId })
      }
    } catch {
      toast.error("Lỗi kết nối khi gửi trao đổi", undefined, { id: toastId })
    } finally {
      setSubmittingComment(false)
    }
  }

  const activePriorityObj = PRIORITY_OPTIONS.find((p) => p.value === currentPriority) || PRIORITY_OPTIONS[1]

  // Calculate current phase index for the 6-step progress bar
  const currentPhaseIndex = useMemo(() => {
    if (!request) return 0
    const idx = UX_PHASES_MB.findIndex((p) => p.key === request.current_phase || request.current_phase.includes(p.key))
    return idx >= 0 ? idx : 0
  }, [request])

  return (
    <AnimatePresence>
      {isVisible && request && (
        <div className="fixed inset-0 z-50 overflow-hidden" onClick={() => setOpenDropdown(null)}>
          {/* Backdrop Blur Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs"
            onClick={handleDismiss}
          />

          {/* Floating Slide-over Sheet / Fullscreen Modal */}
          <div className={`fixed z-50 transition-all duration-300 ${
            isFullScreen 
              ? "inset-0 sm:inset-3 md:inset-4 flex items-center justify-center" 
              : "inset-0 sm:inset-y-3 sm:right-3 sm:left-auto flex justify-end"
          }`}>
            <motion.aside 
              initial={{ x: "100%", opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className={`bg-white rounded-none sm:rounded-2xl lg:rounded-3xl border-0 sm:border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden h-full transition-all duration-300 ${
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
                    {request.product || "MBBank App"}
                  </span>

                  <span className="text-slate-300 font-light">/</span>

                  <div className="flex items-center gap-1 font-mono font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60 shrink-0">
                    <Target className="w-3.5 h-3.5 text-slate-400" />
                    <span>{request.request_id}</span>
                  </div>

                  {statusConfig && (
                    <span className={`hidden sm:inline-block ml-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] tracking-wide uppercase border ${statusConfig.inlineClasses.bg} ${statusConfig.inlineClasses.text} ${statusConfig.inlineClasses.border} shrink-0`}>
                      {request.status}
                    </span>
                  )}
                </div>

                {/* Right: Window Controls */}
                <div className="flex items-center gap-1">
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

              {/* 2. ReUI Checkout-1 Style 6-Step UX Progression Stepper Bar */}
              <div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-100 overflow-x-auto no-scrollbar shrink-0 touch-pan-x">
                <div className="flex items-center justify-between min-w-[620px] lg:min-w-full">
                  {UX_PHASES_MB.map((step, idx) => {
                    const isPassed = idx < currentPhaseIndex
                    const isCurrent = idx === currentPhaseIndex
                    const isLast = idx === UX_PHASES_MB.length - 1
                    const stepNum = idx + 1
                    const stepTitle = step.label.split(". ")[1]

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
                  
                  {/* Task Title Header */}
                  <div className="group relative">
                    {isEditingTitle && isAuthor ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={titleValue}
                          onChange={(e) => setTitleValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveTitle()
                            if (e.key === "Escape") setIsEditingTitle(false)
                          }}
                          autoFocus
                          className="w-full text-xl sm:text-2xl font-extrabold text-slate-900 border-b-2 border-[#1057FB] outline-none pb-1 bg-transparent"
                        />
                        <Button size="sm" onClick={handleSaveTitle} className="h-8 text-xs bg-slate-900 text-white rounded-lg cursor-pointer">
                          Lưu
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <h1 
                          onClick={() => {
                            if (isAuthor) setIsEditingTitle(true)
                          }}
                          className={`text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight transition-colors break-words [overflow-wrap:anywhere] break-all max-w-full ${
                            isAuthor ? "hover:text-[#1057FB] cursor-pointer" : "cursor-default"
                          }`}
                          title={isAuthor ? "Tác giả đề bài: Bấm để sửa tiêu đề" : "Tiêu đề bài toán"}
                        >
                          {titleValue || "Chưa đặt tiêu đề bài toán"}
                        </h1>
                        {isAuthor && (
                          <button
                            type="button"
                            onClick={() => setIsEditingTitle(true)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-opacity cursor-pointer shrink-0"
                            title="Sửa tiêu đề"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ClickUp Task Properties Grid (Status is Khâu UX, Dates is Start -> Estimate End Date, Assignees, Priority) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 py-5 border-y border-slate-100 text-xs">
                    
                    {/* 1. Status (Chính là Khâu UX - Click to select) */}
                    <div className="flex items-center relative" onClick={(e) => e.stopPropagation()}>
                      <div className="w-20 sm:w-24 flex items-center gap-2 text-slate-500 font-medium shrink-0">
                        <Target className="w-4 h-4 text-slate-400" />
                        <span>Status</span>
                      </div>
                      <div className="flex-1 relative">
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
                          className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide cursor-pointer hover:opacity-90 transition-all ${
                            request.current_phase === "Bàn giao" || request.progress >= 100
                              ? "bg-emerald-600 text-white" 
                              : request.current_phase === "UI Design" || request.current_phase === "Prototype"
                              ? "bg-[#1057FB] text-white"
                              : request.current_phase === "Discovery" || request.current_phase === "User Flow"
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-200 text-slate-800"
                          }`}
                        >
                          {request.current_phase}
                        </button>

                        {/* Status (Khâu UX) Dropdown Popover */}
                        <AnimatePresence>
                          {openDropdown === "status" && (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.96 }}
                              className="absolute top-full left-0 mt-1.5 z-50 w-56 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-1.5 overflow-hidden"
                            >
                              <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                Chọn Khâu UX (Status)
                              </div>
                              {UX_PHASES_MB.map((ph) => (
                                <button
                                  key={ph.key}
                                  type="button"
                                  onClick={() => handleUpdatePhase(ph.key, ph.progress)}
                                  className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 cursor-pointer text-xs"
                                >
                                  <span className="font-bold text-slate-900">{ph.label}</span>
                                  {request.current_phase === ph.key && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* 2. Assignees (Click to select - Support Unassigned State) */}
                    <div className="flex items-center relative" onClick={(e) => e.stopPropagation()}>
                      <div className="w-20 sm:w-24 flex items-center gap-2 text-slate-500 font-medium shrink-0">
                        <UserCheck className="w-4 h-4 text-slate-400" />
                        <span>Assignees</span>
                      </div>
                      <div className="flex-1 relative min-w-0">
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(openDropdown === "assignee" ? null : "assignee")}
                          className="flex items-center gap-2 min-w-0 p-1 -ml-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          {isAssigned ? (
                            <>
                              <UserAvatar name={displayName} avatarUrl={designerAvatar} size="xs" />
                              <span className="font-bold text-slate-900 truncate text-xs">{displayName}</span>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 text-slate-500 hover:text-[#1057FB] hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs font-semibold">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>+ Chưa phân công</span>
                            </div>
                          )}
                        </button>

                        {/* Assignee Dropdown Popover */}
                        <AnimatePresence>
                          {openDropdown === "assignee" && (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.96 }}
                              className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1.5 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 overflow-hidden select-none"
                            >
                              {/* Header & Search Input */}
                              <div className="px-3 pt-1.5 pb-2 border-b border-slate-100 space-y-1.5">
                                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                  Phân công Designer
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
                                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#1057FB] rounded-lg outline-none transition-all placeholder:text-slate-400 text-slate-800"
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

                              {/* Designer List with Unassign Option */}
                              <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50">
                                {/* Option 0: Unassign / Chưa phân công */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateAssignee("")
                                    setAssigneeSearchQuery("")
                                  }}
                                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-slate-50 transition-colors cursor-pointer text-xs"
                                >
                                  <div className="w-7 h-7 rounded-full border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                    <User className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-700 truncate">Chưa phân công</p>
                                    <p className="text-[10px] text-slate-400">Để trống chưa chỉ định nhân sự</p>
                                  </div>
                                  {!isAssigned && <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />}
                                </button>

                                {DESIGNER_OPTIONS.filter((des) => {
                                  if (!assigneeSearchQuery.trim()) return true
                                  const q = assigneeSearchQuery.toLowerCase().trim()
                                  return des.name.toLowerCase().includes(q) || des.role.toLowerCase().includes(q)
                                }).length === 0 ? (
                                  <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">
                                    Không tìm thấy designer phù hợp
                                  </div>
                                ) : (
                                  DESIGNER_OPTIONS.filter((des) => {
                                    if (!assigneeSearchQuery.trim()) return true
                                    const q = assigneeSearchQuery.toLowerCase().trim()
                                    return des.name.toLowerCase().includes(q) || des.role.toLowerCase().includes(q)
                                  }).map((des) => (
                                    <button
                                      key={des.name}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateAssignee(des.name)
                                        setAssigneeSearchQuery("")
                                      }}
                                      className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-slate-50 transition-colors cursor-pointer text-xs"
                                    >
                                      <UserAvatar name={des.name} avatarUrl={des.avatar} size="md" />
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 truncate">{des.name}</p>
                                        <p className="text-[10px] text-slate-400">{des.role}</p>
                                      </div>
                                      {displayName === des.name && <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />}
                                    </button>
                                  ))
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* 3. Dates (Bắt đầu nhận task -> Estimate End Date trên 1 dòng) */}
                    <div className="flex items-center relative" onClick={(e) => e.stopPropagation()}>
                      <div className="w-20 sm:w-24 flex items-center gap-2 text-slate-500 font-medium shrink-0">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>Dates</span>
                      </div>
                      <div className="flex-1 relative flex items-center gap-2 font-medium text-slate-700 text-xs whitespace-nowrap flex-nowrap min-w-0">
                        <span className="text-slate-500 flex items-center gap-1 shrink-0 whitespace-nowrap" title="Thời gian Design bắt đầu nhận task">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{request.submitted_at || "Start"}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(openDropdown === "date" ? null : "date")}
                          className="text-blue-600 font-bold flex items-center gap-1 hover:bg-blue-50 px-1.5 py-0.5 rounded cursor-pointer transition-colors shrink-0 whitespace-nowrap"
                          title="Estimate End Date (Bấm để đổi hạn chót)"
                        >
                          <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{customDeadline || request.expected_deadline || "Estimate End Date"}</span>
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
                                <span className="text-xs font-extrabold text-slate-900">
                                  {monthNamesVi[calMonth]} {calYear}
                                </span>
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
                                  <span key={dh} className="text-[10px] font-bold text-slate-400">
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
                                      className={`h-7 w-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                        isSelected
                                          ? "bg-[#1E5AF6] text-white font-bold shadow-xs"
                                          : isToday
                                          ? "border border-[#1E5AF6] text-[#1E5AF6] font-bold"
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
                                  onClick={() => {
                                    setCustomDeadline("")
                                    setOpenDropdown(null)
                                  }}
                                  className="text-slate-400 hover:text-rose-500 font-semibold cursor-pointer"
                                >
                                  Xóa chọn
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const today = new Date()
                                    const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
                                    setCustomDeadline(formatted)
                                    setOpenDropdown(null)
                                    toast.success(`Đã cập nhật Estimate End Date: ${formatted}`)
                                  }}
                                  className="text-[#1E5AF6] hover:underline font-bold cursor-pointer"
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
                      <div className="w-20 sm:w-24 flex items-center gap-2 text-slate-500 font-medium shrink-0">
                        <Flag className="w-4 h-4 text-amber-500" />
                        <span>Priority</span>
                      </div>
                      <div className="flex-1 relative">
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(openDropdown === "priority" ? null : "priority")}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-bold text-xs cursor-pointer hover:opacity-90 transition-all ${activePriorityObj.color}`}
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
                                Độ ưu tiên
                              </div>
                              {PRIORITY_OPTIONS.map((pr) => (
                                <button
                                  key={pr.value}
                                  type="button"
                                  onClick={() => {
                                    setCurrentPriority(pr.value)
                                    setOpenDropdown(null)
                                    toast.success(`Đã cập nhật độ ưu tiên: ${pr.label}`)
                                  }}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700"
                                >
                                  <Flag className={`w-3.5 h-3.5 ${pr.flagFill}`} />
                                  <span className="flex-1">{pr.label}</span>
                                  {currentPriority === pr.value && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                  </div>

                  {/* 📋 TÀI LIỆU ĐẦU BÀI TỪ PO (PO REQUIREMENTS SPEC - REVIEW SHEET STYLE) */}
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs space-y-0">
                    {/* Section Header with Role Switcher / PO Edit Trigger */}
                    <div className="px-4 sm:px-5 py-3 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#1057FB]" />
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          ĐẦU BÀI TỪ PRODUCT OWNER (PO SPEC)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Edit Button (Available if isAuthor) */}
                        {isAuthor ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setShowPoEditModal(true)}
                            className="h-7 px-2.5 text-xs font-bold bg-[#1057FB] hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Chỉnh sửa đầu bài</span>
                          </Button>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs" 
                            title={`Chỉ người tạo yêu cầu (${request.requester_name || request.requester_email || "Tác giả"}) mới có quyền sửa nội dung đầu bài.`}
                          >
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>Chỉ tác giả đề bài được sửa</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Structured Definition Body (Review Sheet Style) */}
                    <div className="p-4 sm:p-5 space-y-4 text-xs">
                      {/* Product & Request Type */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Nền tảng / Sản phẩm
                          </span>
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {request.product || "Mobile App"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Loại yêu cầu
                          </span>
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {request.request_type || "Tính năng mới"}
                          </span>
                        </div>
                      </div>

                      {/* Requester Info */}
                      <div className="pb-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Người tạo yêu cầu (PO / PM)
                          </span>
                          <span className="font-semibold text-slate-800">
                            {request.requester_name}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px] ml-1.5">
                            ({request.requester_email || "po@mbbank.com.vn"})
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-slate-600 bg-slate-50">
                          {request.department || "Khối Ngân hàng số"}
                        </Badge>
                      </div>

                      {/* UX Scope & Detailed Description */}
                      <div>
                        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Mô tả nhu cầu UX & Luồng nghiệp vụ
                        </span>
                        <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 font-normal text-slate-800 whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere] break-all max-w-full overflow-hidden">
                          {request.description || "Chưa có mô tả chi tiết bài toán từ PO."}
                        </div>
                      </div>

                      {/* Business Need & User Problem */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 overflow-hidden">
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                            Lý do cần thiết (Business Need)
                          </span>
                          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] break-all max-w-full">
                            {request.business_need || "Chưa cung cấp lý do kinh doanh."}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 overflow-hidden">
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                            Vấn đề người dùng (User Problem)
                          </span>
                          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] break-all max-w-full">
                            {request.user_problem || "Chưa cung cấp vấn đề người dùng."}
                          </p>
                        </div>
                      </div>

                      {/* Target User */}
                      {request.target_user && (
                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Đối tượng mục tiêu (Target User)
                          </span>
                          <p className="font-medium text-slate-800">{request.target_user}</p>
                        </div>
                      )}

                      {/* PO Attached Documentation & Files */}
                      <div className="pt-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>TÀI LIỆU & TỆP ĐÍNH KÈM ({(request.attachments?.length || 0) + (request.doc_links?.length || 0)})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => taskFileInputRef.current?.click()}
                            disabled={isUploadingTaskAttachment}
                            className="text-[11px] font-bold text-[#1057FB] hover:underline flex items-center gap-1 cursor-pointer bg-blue-50/70 hover:bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-100"
                          >
                            <UploadCloud className="w-3 h-3" />
                            <span>{isUploadingTaskAttachment ? "Đang tải..." : "+ Tải thêm tệp"}</span>
                          </button>
                          <input
                            ref={taskFileInputRef}
                            type="file"
                            multiple
                            onChange={handleUploadTaskFile}
                            className="hidden"
                          />
                        </div>

                        {/* Attachments List */}
                        {((request.attachments && request.attachments.length > 0) || (request.doc_links && request.doc_links.length > 0)) ? (
                          <div className="space-y-1.5">
                            {/* 1. Files from request.attachments */}
                            {request.attachments?.map((att, idx) => {
                              const hasExt = att.name.includes(".")
                              const ext = hasExt ? att.name.split(".").pop()?.toLowerCase() || "" : ""
                              
                              let iconEl = <FileText className="w-4 h-4 text-[#1057FB]" />
                              let bgClass = "bg-blue-50 border-blue-200/80"
                              
                              if (ext === "pdf") {
                                iconEl = <FileText className="w-4 h-4 text-rose-600" />
                                bgClass = "bg-rose-50 border-rose-200/80"
                              } else if (["doc", "docx"].includes(ext)) {
                                iconEl = <FileText className="w-4 h-4 text-blue-600" />
                                bgClass = "bg-blue-50 border-blue-200/80"
                              } else if (["xls", "xlsx", "csv"].includes(ext)) {
                                iconEl = <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                bgClass = "bg-emerald-50 border-emerald-200/80"
                              } else if (["png", "jpg", "jpeg", "svg", "webp", "gif"].includes(ext)) {
                                iconEl = <ImageIcon className="w-4 h-4 text-purple-600" />
                                bgClass = "bg-purple-50 border-purple-200/80"
                              } else if (["zip", "rar", "7z", "tar"].includes(ext)) {
                                iconEl = <FileBox className="w-4 h-4 text-amber-600" />
                                bgClass = "bg-amber-50 border-amber-200/80"
                              }

                              return (
                                <div
                                  key={`att-${idx}`}
                                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#1057FB]/40 transition-all group shadow-2xs"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-8 h-8 rounded-xl ${bgClass} flex items-center justify-center shrink-0 border shadow-2xs`}>
                                      {iconEl}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-slate-900 text-xs truncate group-hover:text-[#1057FB] transition-colors">{att.name}</p>
                                      {att.size ? (
                                        <p className="text-[10px] text-slate-400">{(att.size / 1024).toFixed(0)} KB · Google Drive</p>
                                      ) : (
                                        <p className="text-[10px] text-slate-400">Google Drive · Đính kèm</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <a
                                      href={att.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#1057FB] hover:bg-blue-50 transition-colors"
                                      title="Xem / Tải file"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              )
                            })}

                            {/* 2. Links from request.doc_links (if not duplicated with attachments) */}
                            {request.doc_links
                              ?.filter((l) => !request.attachments?.some((a) => a.url === l))
                              .map((link, idx) => (
                                <a
                                  key={`link-${idx}`}
                                  href={link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-200 text-[#1057FB] transition-all group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 text-[#1057FB] flex items-center justify-center shrink-0 shadow-2xs">
                                      <Paperclip className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-mono text-[11px] truncate block text-slate-700 group-hover:text-[#1057FB] transition-colors">{link}</span>
                                      <span className="text-[10px] text-slate-400">Liên kết trực tuyến</span>
                                    </div>
                                  </div>
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                                </a>
                              ))}
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-400">
                            Chưa có tệp đính kèm nào. Bấm <strong>+ Tải thêm tệp</strong> để đính kèm từ máy tính.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                    {/* Deliverables Sub-cards (ClickUp Linked Items Hub) */}
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <span>DELIVERABLES & TÀI LIỆU BÀN GIAO</span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowAddDeliverableModal(true)}
                          className="text-xs font-bold text-[#1057FB] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm link</span>
                        </button>
                      </div>

                      {/* Figma Item Card */}
                      <div className="p-3 rounded-xl border border-slate-200 hover:border-purple-300 bg-white transition-all shadow-2xs flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M5 5.5C5 3.567 6.567 2 8.5 2H12V9H8.5C6.567 9 5 7.433 5 5.5Z" fill="#F24E1E"/>
                              <path d="M12 2H15.5C17.433 2 19 3.567 19 5.5C19 7.433 17.433 9 15.5 9H12V2Z" fill="#FF7262"/>
                              <path d="M12 9H15.5C17.433 9 19 10.567 19 12.5C19 14.433 17.433 16 15.5 16H12V9Z" fill="#1ABCFE"/>
                              <path d="M5 12.5C5 10.567 6.567 9 8.5 9H12V16H8.5C6.567 16 5 14.433 5 12.5Z" fill="#A259FF"/>
                              <path d="M5 19.5C5 17.567 6.567 16 8.5 16H12V19.5C12 21.433 10.433 23 8.5 23C6.567 23 5 21.433 5 19.5Z" fill="#0ACF83"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">Figma Design Canvas</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">
                              {customDeliverables?.figma_url || "Chưa đính kèm liên kết Figma"}
                            </p>
                          </div>
                        </div>

                        {customDeliverables?.figma_url ? (
                          <a
                            href={customDeliverables.figma_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs transition-colors"
                          >
                            <span>Mở Canvas</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setNewDeliverableType("figma")
                              setShowAddDeliverableModal(true)
                            }}
                            className="text-[11px] text-[#1057FB] font-bold hover:underline cursor-pointer"
                          >
                            + Đính kèm
                          </button>
                        )}
                      </div>

                      {/* Prototype Item Card */}
                      <div className="p-3 rounded-xl border border-slate-200 hover:border-teal-300 bg-white transition-all shadow-2xs flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9B97] flex items-center justify-center shrink-0 border border-teal-100">
                            <PlaySquare className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">Interactive Prototype</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">
                              {customDeliverables?.prototype_url || "Chưa đính kèm liên kết Prototype"}
                            </p>
                          </div>
                        </div>

                        {customDeliverables?.prototype_url ? (
                          <a
                            href={customDeliverables.prototype_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-50 text-[#0D9B97] hover:bg-teal-100 font-bold text-xs transition-colors"
                          >
                            <span>Xem Prototype</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setNewDeliverableType("prototype")
                              setShowAddDeliverableModal(true)
                            }}
                            className="text-[11px] text-[#0D9B97] font-bold hover:underline cursor-pointer"
                          >
                            + Đính kèm
                          </button>
                        )}
                      </div>

                      {/* UX Specs Item Card */}
                      <div className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 bg-white transition-all shadow-2xs flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">UX Specifications & Flow</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">
                              {customDeliverables?.spec_url || "Chưa đính kèm tài liệu specs"}
                            </p>
                          </div>
                        </div>

                        {customDeliverables?.spec_url ? (
                          <a
                            href={customDeliverables.spec_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs transition-colors"
                          >
                            <span>Xem Specs</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setNewDeliverableType("spec")
                              setShowAddDeliverableModal(true)
                            }}
                            className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
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
                        <span className="text-xs font-bold text-slate-900">Activity</span>
                        <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
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
                          title="Theo dõi hoạt động (Watchers)"
                        >
                          <Bell className="w-4 h-4" />
                          <span className="text-[11px] font-bold">1</span>
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
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
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

                        const renderSingleActivity = (event: ActivityEvent, keyPrefix: string | number) => {
                          const evtAvatar = getDesignerAvatar(event.author)
                          const reactions = commentReactions[event.id] || {}
                          const eventKey = event.id ? `evt-${event.id}-${keyPrefix}` : `evt-act-${keyPrefix}`

                          // USER COMMENT CARD (ClickUp Style)
                          if (event.type === "comment") {
                            return (
                              <div key={eventKey} className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2 group hover:border-[#1057FB]/30 transition-all">
                                <div className="flex items-center gap-2">
                                  <UserAvatar name={event.author} avatarUrl={evtAvatar} size="sm" />
                                  <span className="text-xs font-bold text-slate-900">{event.author}</span>
                                  <span className="text-[11px] text-slate-400 font-normal">{event.timestamp}</span>
                                </div>

                                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-8">
                                  {event.content}
                                </p>

                                {event.link && (
                                  <div className="pl-8 pt-0.5">
                                    <a
                                      href={event.link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[#1057FB] text-[11px] hover:underline font-mono"
                                    >
                                      <Paperclip className="w-3 h-3" />
                                      <span className="truncate max-w-[200px]">{event.link}</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            )
                          }

                          // SYSTEM EVENT ROW (ClickUp Bullet List Style - Top-Aligned)
                          return (
                            <div key={eventKey} className="flex items-start justify-between gap-2.5 py-1.5 px-1 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-1.5" />
                                <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-700 leading-normal min-w-0">
                                  {event.type === "create" && (
                                    <>
                                      <span>Đã khởi tạo yêu cầu cho</span>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200/90">
                                        {request.product || "Lending"}
                                      </span>
                                    </>
                                  )}
                                  {event.type === "assignment" && (
                                    <>
                                      <span>Đã phân công Designer</span>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-[#1057FB] text-xs font-bold border border-blue-200/80">
                                        {event.toValue}
                                      </span>
                                    </>
                                  )}
                                  {event.type === "phase_change" && (
                                    <>
                                      <span>Đã chuyển khâu từ</span>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-[#1057FB] text-xs font-semibold border border-blue-200/80">
                                        {event.fromValue || "Phân loại"}
                                      </span>
                                      <span>sang</span>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/80">
                                        {event.toValue}
                                      </span>
                                    </>
                                  )}
                                  {event.type === "deliverable" && (
                                    <>
                                      <span>Đã đính kèm</span>
                                      <a
                                        href={event.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200/80 hover:underline"
                                      >
                                        <Paperclip className="w-3 h-3" />
                                        <span>{event.title || "Tài liệu bàn giao"}</span>
                                      </a>
                                    </>
                                  )}
                                  {event.type === "status_change" && (
                                    <>
                                      <span>Đã cập nhật trạng thái</span>
                                      {event.fromValue && (
                                        <>
                                          <span>từ</span>
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                                            {event.fromValue}
                                          </span>
                                        </>
                                      )}
                                      {event.toValue && (
                                        <>
                                          <span>sang</span>
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/80">
                                            {event.toValue}
                                          </span>
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
                      placeholder="Nhập ghi chú hoặc trao đổi tiến độ bài toán..."
                      linkValue={commentLink}
                      onLinkChange={setCommentLink}
                      showLinkInput={showLinkInput}
                      onToggleLinkInput={() => setShowLinkInput(!showLinkInput)}
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
                      <span>Mở Figma</span>
                    </a>
                  )}
                </div>
              </div>
            </motion.aside>
          </div>
        </div>
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

                {/* 2. Nền tảng & Loại yêu cầu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nền tảng / Sản phẩm</label>
                    <input
                      type="text"
                      value={poFormProduct}
                      onChange={(e) => setPoFormProduct(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#1057FB]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Loại yêu cầu</label>
                    <input
                      type="text"
                      value={poFormReqType}
                      onChange={(e) => setPoFormReqType(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#1057FB]"
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

                {/* 5. Đối tượng mục tiêu */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Đối tượng mục tiêu (Target User)</label>
                  <input
                    type="text"
                    value={poFormTargetUser}
                    onChange={(e) => setPoFormTargetUser(e.target.value)}
                    placeholder="Khách hàng cá nhân, Doanh nghiệp SME..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#1057FB]"
                  />
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
