import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  CalendarRange,
  Columns3,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  Flag,
  ImageIcon,
  LayoutGrid,
  ListChecks,
  MapPin,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  Repeat2,
  Rocket,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge, PriorityBadge, StatusPill } from "@/components/ui/badge"
import { HoverPreview } from "@/components/ui/hover-preview"
import { RightSheet } from "@/components/ui/right-sheet"
import { toast } from "@/components/ui/toast"
import { Tooltip } from "@/components/ui/tooltip"
import { BorderBeam } from "@/components/jolyui/border-beam"
import { AgentActivityTrace } from "@/components/planner/AgentActivityTrace"
import { ExecutiveSummaryTypewriter } from "@/components/planner/ExecutiveSummaryTypewriter"
import PageHeader from "@/components/common/PageHeader"
import { UserAvatar, getDesignerAvatar, getAvatarColorClass } from "@/components/common/UserAvatar"
import { CAvatar29, Avatar, AvatarImage, AvatarFallback } from "@/components/reui/c-avatar-29"
import { fetchRequests } from "@/api/api"
import { isTaskAssignedToUser, isTaskRelatedToUser } from "@/lib/accessControl"
import {
  buildRuleBasedBriefing,
  getDesignerPhaseDistribution,
  getGoLiveTasksInWeek,
  getTaskDeadline,
  getTaskPlannedDate,
  getWeekBounds,
  isTaskCompleted,
  type PlannerBriefingItem,
} from "@/lib/designerPlanner"
import { cascadeWaveContainerVariants, cascadeWaveItemVariants, durations } from "@/lib/motion"
import {
  DesignerPlannerSkeleton,
  DesignerPlannerWeeklyCardSkeleton,
  DesignerPlannerCalendarSkeleton,
} from "@/components/common/ReuiSkeletons"
import {
  addTeamEvent,
  assessTaskRisk,
  computeCalendarWeeks,
  deleteTeamEvent,
  getLocalUXRequests,
  loadAllCalendarItems,
  normalizeDateToYMD,
  updateTaskPlannedDate,
  updateTeamEvent,
  type CalendarItem,
} from "@/services/calendarService"
import { getStoredSession, getUserInitials } from "@/services/otpAuthService"
import { useNotifications } from "@/services/notificationService"
import { fetchTeamMembersFromSheet, updateTaskProgressInSheet } from "@/services/googleSheetService"
import { getSystemConfig, type HolidayException } from "@/config/systemConfig"
import type { EventCategoryConfig, TeamEvent } from "@/config/systemConfig"
import { ScheduleMeetingDialog, type ScheduleMeetingDesigner, type ScheduleMeetingValues } from "@/components/planner/ScheduleMeetingDialog"
import type { TeamLeaveRecord } from "@/services/leaveService"
import { uploadFileToDrive } from "@/services/googleSheetService"
import RequestDetail from "@/components/track/RequestDetail"
import { cn } from "@/lib/utils"

type PlannerView = "month" | "week" | "agenda"
type PlannerEntryType = "deadline" | "planned" | "leave" | "team" | "personal"
type QuoteAnimationPhase = "typing" | "holding" | "deleting"

const WEEK_START_HOUR = 7
const WEEK_END_HOUR = 20
const WEEK_HOURS = Array.from({ length: WEEK_END_HOUR - WEEK_START_HOUR + 1 }, (_, i) => WEEK_START_HOUR + i)

function formatHourDisplay(hour: number): string {
  if (hour === 0) return "12 AM"
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return "12 PM"
  return `${hour - 12} PM`
}

function getEntryAvatarInfo(entry: PlannerEntry): { name: string; avatarUrl?: string } {
  if (entry.attendees && entry.attendees.length > 0) {
    const name = entry.attendees[0]
    return { name, avatarUrl: getDesignerAvatar(name) || undefined }
  }
  if (entry.request?.assigned_designer) {
    const name = entry.request.assigned_designer
    return { name, avatarUrl: getDesignerAvatar(name) || undefined }
  }
  return { name: "MB", avatarUrl: undefined }
}

interface PlannerEntry {
  id: string
  date: string
  type: PlannerEntryType
  title: string
  label: string
  color: string
  accentColor?: string
  time?: string
  location?: string
  description?: string
  attendees?: string[]
  endTime?: string
  recurrence?: TeamEvent["recurrence"]
  recurrenceEndDate?: string
  meetingOptions?: TeamEvent["meetingOptions"]
  attachments?: TeamEvent["attachments"]
  categoryId?: string
  durationMinutes?: number
  createdBy?: string
  createdAt?: string
  request?: UXRequest
  source?: CalendarItem
}

type EventAttachment = NonNullable<TeamEvent["attachments"]>[number]

function getGoogleDriveFileId(url: string): string {
  if (!url) return ""
  const pathMatch = url.match(/\/file\/d\/([^/?#]+)/i)
  if (pathMatch?.[1]) return pathMatch[1]
  try {
    const parsed = new URL(url)
    return parsed.searchParams.get("id") || ""
  } catch {
    return ""
  }
}

function getAttachmentImageCandidates(attachment: EventAttachment): string[] {
  const fileId = attachment.fileId || getGoogleDriveFileId(attachment.thumbnailUrl || attachment.url)
  const candidates = [
    attachment.thumbnailUrl,
    fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200` : "",
    fileId ? `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}` : "",
    attachment.url,
  ].filter(Boolean) as string[]
  return Array.from(new Set(candidates))
}

function EventThumbnailImage({ attachment, className }: { attachment: EventAttachment; className?: string }) {
  const candidates = useMemo(() => getAttachmentImageCandidates(attachment), [attachment])
  const [candidateIndex, setCandidateIndex] = useState(0)

  useEffect(() => setCandidateIndex(0), [attachment.url, attachment.thumbnailUrl, attachment.fileId])

  const src = candidates[candidateIndex]
  if (!src) {
    return <span className={cn("flex items-center justify-center bg-slate-100 text-slate-400", className)}><ImageIcon className="h-4 w-4" /></span>
  }

  return (
    <img
      src={src}
      alt={attachment.name}
      className={className}
      onError={() => setCandidateIndex((current) => current + 1)}
    />
  )
}

const QUOTES = [
  "Thiết kế tốt bắt đầu từ việc nhìn đúng vấn đề.",
  "Mỗi chi tiết rõ ràng hôm nay sẽ giảm một lần bối rối ngày mai.",
  "Đừng chỉ làm giao diện đẹp — hãy làm quyết định trở nên dễ dàng.",
  "Khoảng trắng cũng là một phần của câu chuyện thiết kế.",
  "Một trải nghiệm mạch lạc luôn được tạo nên từ nhiều lựa chọn nhỏ đúng đắn.",
  "Prototype sớm, học nhanh và giữ người dùng ở trung tâm.",
]

const QUOTE_HOLD_MS = 20_000
const QUOTE_TYPE_MS = 38
const QUOTE_DELETE_MS = 20

const FALLBACK_TRACE_TASKS: UXRequest[] = [
  {
    request_id: "preview-1",
    title: "eKYC onboarding doanh nghiệp",
    nickname: "eKYC onboarding doanh nghiệp",
    product: "MB-CORP",
    preferred_squad: "SME Onboarding",
    squad_name: "SME Onboarding",
    status: "Đang thực hiện",
    current_phase: "Wireframe",
    priority: "lv1",
  } as any,
  {
    request_id: "preview-2",
    title: "Revamp App MBBank 2026",
    nickname: "Revamp App MBBank 2026",
    product: "RETAIL",
    preferred_squad: "App Banking",
    squad_name: "App Banking",
    status: "Đang thực hiện",
    current_phase: "Wireframe",
    priority: "lv2",
  } as any,
  {
    request_id: "preview-3",
    title: "Loyalty Rewards Point Hub",
    nickname: "Loyalty Rewards Point Hub",
    product: "ECOSYS",
    preferred_squad: "Gamification",
    squad_name: "Gamification",
    status: "Đang thực hiện",
    current_phase: "Ready for Dev",
    priority: "lv3",
  } as any,
]

const ENTRY_META: Record<PlannerEntryType, { label: string; color: string; dot: string }> = {
  deadline: { label: "Deadline", color: "bg-[#FFE4E6] text-rose-950 border-rose-200/80", dot: "bg-rose-500" },
  planned: { label: "Dự kiến làm", color: "bg-[#EEF2FF] text-indigo-950 border-indigo-200/80", dot: "bg-indigo-500" },
  leave: { label: "Lịch nghỉ", color: "bg-[#FEF3C7] text-amber-950 border-amber-300/70", dot: "bg-amber-500" },
  team: { label: "Event team", color: "bg-[#D1FAE5] text-emerald-950 border-emerald-300/70", dot: "bg-emerald-500" },
  personal: { label: "Event của tôi", color: "bg-[#CCFBF1] text-teal-950 border-teal-300/70", dot: "bg-teal-500" },
}

function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatShortDate(ymd?: string): string {
  if (!ymd) return "Chưa có ngày"
  const [year, month, day] = ymd.split("-").map(Number)
  if (!year || !month || !day) return ymd
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(
    new Date(year, month - 1, day),
  )
}

function parseYMD(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function colorWithAlpha(color: string, alpha: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color
}

function getMeetingLinkMeta(value: string): { href: string; label: string } | null {
  const trimmed = value.trim()
  const href = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : /^www\./i.test(trimmed)
      ? `https://${trimmed}`
      : ""
  if (!href) return null

  try {
    const url = new URL(href)
    const host = url.hostname.replace(/^www\./i, "")
    const fullPath = `${host}${url.pathname}`.toLowerCase()
    if (fullPath.includes("google.com/maps") || host === "maps.app.goo.gl") return { href, label: "Mở Google Maps" }
    if (host.includes("teams.microsoft.com")) return { href, label: "Tham gia Microsoft Teams" }
    if (host === "meet.google.com") return { href, label: "Tham gia Google Meet" }
    if (host.includes("zoom.us")) return { href, label: "Tham gia Zoom" }
    return { href, label: `Mở ${host}` }
  } catch {
    return null
  }
}

function addMinutesToLocalDateTime(date: string, time: string, minutes: number): string {
  const [year, month, day] = date.split("-").map(Number)
  const [hour, minute] = time.split(":").map(Number)
  const result = new Date(year, month - 1, day, hour, minute + minutes)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}T${pad(result.getHours())}:${pad(result.getMinutes())}`
}

function BriefingTypewriter({ text, runKey, delay = 0 }: { text: string; runKey: number; delay?: number }) {
  const [visibleLength, setVisibleLength] = useState(0)

  useEffect(() => {
    setVisibleLength(0)
    let interval: number | undefined
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        setVisibleLength((current) => {
          if (current >= text.length) {
            if (interval) window.clearInterval(interval)
            return current
          }
          return current + 1
        })
      }, 16)
    }, delay)
    return () => {
      window.clearTimeout(start)
      if (interval) window.clearInterval(interval)
    }
  }, [text, runKey, delay])

  return (
    <span aria-label={text}>
      <span aria-hidden="true">{text.slice(0, visibleLength)}</span>
      {visibleLength < text.length && <span aria-hidden="true" className="ml-0.5 inline-block h-3 w-px animate-pulse bg-slate-400" />}
    </span>
  )
}

function getTaskPhaseLabel(task: UXRequest): string {
  const stage = String((task as any).stage || task.current_phase || task.status || "WIREFRAME").toUpperCase()
  if (stage.includes("WIRE")) return "WIREFRAME"
  if (stage.includes("READY") || stage.includes("DEV")) return "READY FOR DEV"
  if (stage.includes("REVIEW")) return "REVIEW"
  if (stage.includes("DOING") || stage.includes("PROGRESS")) return "IN PROGRESS"
  if (stage.includes("DONE") || stage.includes("HOÀN THÀNH")) return "COMPLETED"
  return stage.length > 14 ? stage.slice(0, 14) : stage
}

function getTaskFocusDescription(task: UXRequest): string {
  const title = (task.title || "").toLowerCase()
  const need = (task.business_need || task.user_problem || "").toLowerCase()

  if (title.includes("bán chéo") || need.includes("bán chéo") || title.includes("cross")) {
    return "tối ưu trải nghiệm bán chéo sản phẩm số"
  }
  if (title.includes("nfc") || need.includes("nfc")) {
    return "triển khai giải pháp xác thực CCCD gắn chip qua NFC"
  }
  if (title.includes("sổ quầy") || title.includes("quầy") || title.includes("counter")) {
    return "số hóa quy trình giao dịch tại quầy lên nền tảng số"
  }
  if (title.includes("dòng tiền") || title.includes("cash")) {
    return "tối ưu dashboard theo dõi dòng tiền và tài chính cá nhân"
  }
  if (title.includes("định danh") || title.includes("ekyc") || title.includes("kyc")) {
    return "chuẩn hóa luồng định danh số eKYC cho khách hàng mới"
  }
  if (title.includes("thẻ") || title.includes("card")) {
    return "nâng tầm trải nghiệm phát hành và quản lý thẻ trực tuyến"
  }
  if (title.includes("tiết kiệm") || title.includes("saving") || title.includes("deposit")) {
    return "tối ưu luồng tích lũy và gửi tiết kiệm online"
  }
  if (task.feature_journey) {
    return `hoàn thiện trải nghiệm người dùng luồng ${task.feature_journey.toLowerCase()}`
  }
  return `tối ưu trải nghiệm tương tác cho ${getRequestDisplayTitle(task)}`
}

function ClickUpTaskChip({
  task,
  onOpenTask,
}: {
  task: UXRequest
  onOpenTask: (id: string) => void
}) {
  const displayTitle = getRequestDisplayTitle(task)
  const phaseLabel = getTaskPhaseLabel(task)
  const isWireframe = phaseLabel === "WIREFRAME"
  const isReady = phaseLabel === "READY FOR DEV"

  const phaseBadgeClass = isWireframe
    ? "bg-purple-100/90 text-purple-700 border-purple-200/80"
    : isReady
      ? "bg-blue-100/90 text-blue-700 border-blue-200/80"
      : "bg-slate-100 text-slate-700 border-slate-200"

  const dotClass = isWireframe
    ? "bg-purple-500 ring-purple-100"
    : isReady
      ? "bg-blue-500 ring-blue-100"
      : "bg-emerald-500 ring-emerald-100"

  const assigneeName = (task as any).assigned_designer_name || task.assigned_designer || (task as any).assignee || "Designer"
  const assigneeInitial = assigneeName.trim().charAt(0).toUpperCase() || "D"
  const deadline = getTaskDeadline(task)

  return (
    <HoverPreview
      className="inline-flex items-center align-middle ml-1 mr-0.5"
      preview={(
        <div className="p-1 space-y-2">
          <div className="flex items-start gap-2.5">
            <img src="/ai-default.png" alt="AI" className="h-8 w-8 rounded-lg object-contain shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-950 leading-snug">{displayTitle}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {task.product || "Sản phẩm MB"} · {task.squad_name || task.preferred_squad || "UX Team"}
                {task.nickname?.trim() && task.title && task.nickname.trim() !== task.title && (
                  <span className="block text-slate-400/80 truncate mt-0.5" title={task.title}>
                    Gốc: {task.title}
                  </span>
                )}
              </p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 line-clamp-3" title={task.description}>
            {task.description || "Bài toán đang được triển khai thiết kế giao diện và luồng trải nghiệm người dùng."}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
            <span className={cn("rounded-md px-1.5 py-0.5 font-bold uppercase border", phaseBadgeClass)}>
              {phaseLabel}
            </span>
            {deadline && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                Hạn {formatShortDate(deadline)}
              </span>
            )}
            <span className="ml-auto flex items-center gap-1 font-medium text-slate-600">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[8px] font-bold text-slate-700">
                {assigneeInitial}
              </span>
              <span>{assigneeName}</span>
            </span>
          </div>
        </div>
      )}
    >
      <button
        type="button"
        onClick={() => onOpenTask(task.request_id)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2 py-0.5 text-xs font-semibold text-slate-800 shadow-2xs hover:border-blue-400 hover:bg-blue-50/40 hover:text-blue-700 transition-all cursor-pointer align-middle my-0.5"
      >
        <span className={cn("h-1.5 w-1.5 rounded-full ring-2", dotClass)} />
        <span className="max-w-[170px] truncate">{displayTitle}</span>
        <span className={cn("rounded px-1 py-0.2 text-[9px] font-bold tracking-tight uppercase border", phaseBadgeClass)}>
          {phaseLabel}
        </span>
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-100 text-[8px] font-bold text-slate-600">
          {assigneeInitial}
        </span>
      </button>
    </HoverPreview>
  )
}

function CalendarEventChip({
  entry,
  onOpenEvent,
}: {
  entry: PlannerEntry
  onOpenEvent: (entry: PlannerEntry) => void
}) {
  const isLeave = entry.type === "leave"
  const isPersonal = entry.type === "personal"
  const dotColor = isLeave ? "bg-amber-500" : isPersonal ? "bg-teal-500" : "bg-emerald-500"
  const badgeClass = isLeave
    ? "border-amber-200 bg-amber-50/80 text-amber-900 hover:bg-amber-100"
    : isPersonal
      ? "border-teal-200 bg-teal-50/80 text-teal-900 hover:bg-teal-100"
      : "border-emerald-200 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-100"

  return (
    <HoverPreview
      className="inline-flex items-center align-middle mx-1 my-0.5"
      preview={(
        <div className="p-1 space-y-1.5 min-w-[200px]">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", dotColor)} />
            <span className="text-xs font-bold text-slate-900">{entry.title}</span>
          </div>
          {entry.time && (
            <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
              <Clock3 className="h-3 w-3 text-slate-400" />
              <span>
                {entry.time}
                {entry.endTime ? ` – ${entry.endTime}` : ""}
              </span>
            </p>
          )}
          {entry.location && (
            <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-slate-400" />
              <span className="truncate">{entry.location}</span>
            </p>
          )}
          {entry.attendees && entry.attendees.length > 0 && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <Users className="h-3 w-3 text-slate-400" />
              <span>{entry.attendees.length} thành viên tham gia</span>
            </p>
          )}
        </div>
      )}
    >
      <button
        type="button"
        onClick={() => onOpenEvent(entry)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer align-middle my-0.5",
          badgeClass
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
        {entry.time && <span className="text-[10px] font-mono font-bold opacity-85">{entry.time}</span>}
        <span className="max-w-[170px] truncate">{entry.title}</span>
      </button>
    </HoverPreview>
  )
}

function normalizeMeetingDesigners(members: unknown[]): ScheduleMeetingDesigner[] {
  const seen = new Set<string>()
  return members.flatMap((raw, index) => {
    const member = raw as Record<string, unknown>
    const name = String(member.name || member.displayName || "").trim()
    const email = String(member.email || member.teamsEmail || member.personalEmail || "").trim()
    const role = String(member.role || "Designer").trim()
    const roleLower = role.toLowerCase()
    const isDesigner = roleLower.includes("design") || roleLower.includes("ux") || roleLower.includes("ui")
    const isAdmin = roleLower.includes("admin")
    const key = email.toLowerCase()
    if (!name || !email || (!isDesigner && !isAdmin) || seen.has(key)) return []
    seen.add(key)
    const avatar = String(member.avatarUrl || member.avatar || "").trim() || getDesignerAvatar(name, email) || undefined
    return [{
      id: String(member.id || `designer-${index}`),
      name,
      email,
      role,
      avatar,
    }]
  })
}

function getAttendeeDisplay(emailOrName: string, designers: ScheduleMeetingDesigner[]) {
  const clean = emailOrName.trim().toLowerCase()
  const found = designers.find((d) => d.email?.toLowerCase() === clean || d.name?.toLowerCase() === clean)
  const avatar = found?.avatar || getDesignerAvatar(found?.name || emailOrName, found?.email || (emailOrName.includes("@") ? emailOrName : undefined)) || undefined

  if (found) {
    return {
      name: found.name,
      email: found.email,
      initial: found.name.trim().charAt(0).toUpperCase() || "U",
      avatar,
    }
  }
  const namePart = emailOrName.includes("@")
    ? emailOrName.split("@")[0].replace(/[._0-9]/g, " ").trim()
    : emailOrName
  const formattedName = namePart
    ? namePart
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : emailOrName
  return {
    name: formattedName || emailOrName,
    email: emailOrName.includes("@") ? emailOrName : "",
    initial: (formattedName || emailOrName).charAt(0).toUpperCase() || "?",
    avatar: getDesignerAvatar(formattedName || emailOrName, emailOrName.includes("@") ? emailOrName : undefined) || undefined,
  }
}

function isSameIdentity(value: string | undefined, name: string, email: string): boolean {
  if (!value) return false
  const normalized = value.toLowerCase()
  const nameToken = name.toLowerCase().trim()
  const emailToken = email.toLowerCase().trim()
  const emailPrefix = emailToken.split("@")[0]
  return Boolean(
    (nameToken && normalized.includes(nameToken)) ||
      (emailToken && normalized.includes(emailToken)) ||
      (emailPrefix && normalized.includes(emailPrefix)),
  )
}

/**
 * Kiểm tra sự kiện có liên quan đến designer hay không:
 * 1. Họ tạo (createdBy)
 * 2. Họ được gán / tham gia (attendees) hoặc toàn team
 * 3. Họ làm viewer (viewers)
 */
function isEventRelatedToUser(
  rawEvent: TeamEvent,
  designerName: string,
  designerEmail: string,
  session: ReturnType<typeof getStoredSession>,
): boolean {
  if (!rawEvent) return false

  // 1. Họ tạo (Created by designer)
  if (rawEvent.createdBy && isSameIdentity(rawEvent.createdBy, designerName, designerEmail)) {
    return true
  }

  // 2. Được gán / Tham gia (Attendees / Participants)
  const attendees = Array.isArray(rawEvent.attendees) ? rawEvent.attendees : []
  const hasAttendee = attendees.some((att) => {
    const clean = String(att || "").toLowerCase().trim()
    if (!clean) return false
    // Toàn team / Chung cả team
    if (
      clean === "all" ||
      clean === "all team" ||
      clean === "toàn team" ||
      clean === "toàn bộ" ||
      clean === "ux team" ||
      clean === "uxteam" ||
      clean === "*"
    ) {
      return true
    }
    return isSameIdentity(clean, designerName, designerEmail)
  })
  if (hasAttendee) return true

  // 3. Làm viewer (Viewers nếu có trong event)
  const viewers = Array.isArray((rawEvent as any).viewers) ? (rawEvent as any).viewers : []
  if (viewers.some((v: string) => isSameIdentity(v, designerName, designerEmail))) {
    return true
  }

  return false
}

function getGreeting(hour: number): string {
  if (hour < 11) return "Chào buổi sáng"
  if (hour < 14) return "Chào buổi trưa"
  if (hour < 18) return "Chào buổi chiều"
  return "Chào buổi tối"
}

function getTaskDateForWeek(task: UXRequest): string {
  return getTaskPlannedDate(task) || getTaskDeadline(task)
}

export default function DesignerPlannerPage() {
  const session = getStoredSession()
  const today = useMemo(() => new Date(), [])
  const todayYMD = normalizeDateToYMD(today)
  const designerName = session?.displayName?.trim() || "Designer"
  const designerEmail = session?.personalEmail || session?.teamsEmail || ""

  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length))
  const [displayedQuote, setDisplayedQuote] = useState("")
  const [quotePhase, setQuotePhase] = useState<QuoteAnimationPhase>("typing")
  const [rawRequests, setRawRequests] = useState<UXRequest[]>(() => {
    try {
      return getLocalUXRequests()
    } catch {
      return []
    }
  })
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([])
  const [leaves, setLeaves] = useState<TeamLeaveRecord[]>([])
  const [holidays, setHolidays] = useState<HolidayException[]>([])
  const [eventCategories, setEventCategories] = useState<EventCategoryConfig[]>([])
  const [meetingDesigners, setMeetingDesigners] = useState<ScheduleMeetingDesigner[]>(() => {
    try {
      const cached = localStorage.getItem("mbbank_admin_team") || localStorage.getItem("mbbank_team_members")
      return cached ? normalizeMeetingDesigners(JSON.parse(cached)) : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<PlannerView>("month")
  const [anchorDate, setAnchorDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState(todayYMD)
  const [briefingCollapsed, setBriefingCollapsed] = useState(false)
  const [briefingUpdatedAt, setBriefingUpdatedAt] = useState(new Date())
  const [briefingPulse, setBriefingPulse] = useState(0)
  const [isAiRefreshing, setIsAiRefreshing] = useState(false)
  const [isViewingAiTrace, setIsViewingAiTrace] = useState(false)
  const [isBriefingExpanded, setIsBriefingExpanded] = useState(false)
  const [notificationFilter, setNotificationFilter] = useState<"unread" | "all">("unread")
  const [visibleTypes, setVisibleTypes] = useState<Record<PlannerEntryType, boolean>>({
    deadline: true,
    planned: true,
    leave: true,
    team: true,
    personal: true,
  })
  const [scheduleTask, setScheduleTask] = useState<UXRequest | null>(null)
  const [detailEntry, setDetailEntry] = useState<PlannerEntry | null>(null)
  const [activeDetailTask, setActiveDetailTask] = useState<UXRequest | null>(null)
  const [scheduleDate, setScheduleDate] = useState(todayYMD)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [eventDate, setEventDate] = useState(todayYMD)
  const [editingEntry, setEditingEntry] = useState<PlannerEntry | null>(null)
  const [eventSaving, setEventSaving] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<EventAttachment | null>(null)
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false)
  const [streamsDropdownOpen, setStreamsDropdownOpen] = useState(false)
  const [hoveredPhaseKey, setHoveredPhaseKey] = useState<string | null>(null)
  const viewDropdownRef = useRef<HTMLDivElement>(null)
  const streamsDropdownRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const [calendarHeight, setCalendarHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    const node = calendarRef.current
    if (!node) return

    const updateHeight = () => {
      if (window.innerWidth >= 1280) {
        const height = node.getBoundingClientRect().height
        if (height > 0) {
          setCalendarHeight(Math.round(height))
        }
      } else {
        setCalendarHeight(undefined)
      }
    }

    const observer = new ResizeObserver(() => {
      updateHeight()
    })

    observer.observe(node)
    window.addEventListener("resize", updateHeight)
    updateHeight()

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateHeight)
    }
  }, [view, anchorDate])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setViewDropdownOpen(false)
      }
      if (streamsDropdownRef.current && !streamsDropdownRef.current.contains(event.target as Node)) {
        setStreamsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const {
    notifications,
    markAsRead,
  } = useNotifications()

  const availableMeetingDesigners = useMemo(() => {
    const currentRole = String(session?.role || "").toLowerCase()
    const currentCanBeInvited = currentRole.includes("design") || currentRole.includes("ux") || currentRole.includes("ui") || currentRole.includes("admin")
    const currentAvatar = session?.avatarUrl || getDesignerAvatar(designerName, designerEmail) || undefined
    if (!currentCanBeInvited || !designerEmail || meetingDesigners.some((designer) => designer.email.toLowerCase() === designerEmail.toLowerCase())) {
      return meetingDesigners.map((d) => {
        if (d.email.toLowerCase() === designerEmail.toLowerCase() && !d.avatar && currentAvatar) {
          return { ...d, avatar: currentAvatar }
        }
        return d
      })
    }
    return [{ id: "current-designer", name: designerName, email: designerEmail, role: session?.role || "Designer", avatar: currentAvatar }, ...meetingDesigners]
  }, [designerEmail, designerName, meetingDesigners, session?.role, session?.avatarUrl])
  const defaultMeetingAttendee = availableMeetingDesigners.find((designer) => designer.email.toLowerCase() === designerEmail.toLowerCase())?.email || availableMeetingDesigners[0]?.email || ""

  const quote = QUOTES[quoteIndex]

  useEffect(() => {
    const selectNextQuote = () => {
      setQuoteIndex((current) => {
        if (QUOTES.length < 2) return current
        const offset = 1 + Math.floor(Math.random() * (QUOTES.length - 1))
        return (current + offset) % QUOTES.length
      })
    }

    if (quotePhase === "typing") {
      if (displayedQuote.length >= quote.length) {
        setQuotePhase("holding")
        return
      }
      const timeout = window.setTimeout(() => {
        setDisplayedQuote(quote.slice(0, displayedQuote.length + 1))
      }, QUOTE_TYPE_MS)
      return () => window.clearTimeout(timeout)
    }

    if (quotePhase === "holding") {
      const timeout = window.setTimeout(() => setQuotePhase("deleting"), QUOTE_HOLD_MS)
      return () => window.clearTimeout(timeout)
    }

    if (displayedQuote.length > 0) {
      const timeout = window.setTimeout(() => {
        setDisplayedQuote((current) => current.slice(0, -1))
      }, QUOTE_DELETE_MS)
      return () => window.clearTimeout(timeout)
    }

    selectNextQuote()
    setQuotePhase("typing")
  }, [displayedQuote, quote, quotePhase])

  useEffect(() => {
    let active = true
    fetchTeamMembersFromSheet().then((members) => {
      if (!active || !Array.isArray(members) || members.length === 0) return
      const designers = normalizeMeetingDesigners(members)
      if (designers.length > 0) setMeetingDesigners(designers)
    }).catch(() => {})
    return () => { active = false }
  }, [])

  const reloadTimeoutRef = useRef<number | null>(null)

  const reloadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await loadAllCalendarItems()
      setCalendarItems(data.items)
      setLeaves(data.leaves)
      setHolidays(data.holidays || [])
      setEventCategories(data.categories || [])

      const localReqs = getLocalUXRequests()
      if (localReqs.length > 0) {
        setRawRequests(localReqs)
      }

      try {
        const requests = await fetchRequests(false)
        if (requests && requests.length > 0) {
          setRawRequests(requests)
        }
      } catch {
        if (localReqs.length === 0) {
          setRawRequests(getLocalUXRequests())
        }
      }

      // Background remote sync without blocking UI
      if (!silent) {
        fetchRequests(true).then((fresh) => {
          if (fresh && fresh.length > 0) {
            setRawRequests(fresh)
          }
        }).catch(() => {})
      }
    } catch (error) {
      console.error("[DesignerPlanner] Unable to load planner data:", error)
      if (!silent) toast.error("Không thể tải dữ liệu Planner")
    }
  }, [])

  const handleTraceComplete = useCallback(() => {
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!loading) return
    const safety = window.setTimeout(() => {
      setLoading(false)
    }, 6000)
    return () => window.clearTimeout(safety)
  }, [loading])

  const debouncedSilentReload = useCallback(() => {
    if (reloadTimeoutRef.current) window.clearTimeout(reloadTimeoutRef.current)
    reloadTimeoutRef.current = window.setTimeout(() => {
      reloadData(true)
    }, 50)
  }, [reloadData])

  useEffect(() => {
    reloadData(false)
    const handleDataChange = () => debouncedSilentReload()
    window.addEventListener("ux_portal_tasks_changed", handleDataChange)
    window.addEventListener("mbbank_system_config_changed", handleDataChange)
    return () => {
      if (reloadTimeoutRef.current) window.clearTimeout(reloadTimeoutRef.current)
      window.removeEventListener("ux_portal_tasks_changed", handleDataChange)
      window.removeEventListener("mbbank_system_config_changed", handleDataChange)
    }
  }, [reloadData, debouncedSilentReload])

  const myTasks = useMemo(() => {
    if (!session) return []
    // Trang cá nhân của designer: chỉ hiển thị thông tin xoay quanh designer (họ tạo / được gán / làm viewer) - kể cả admin
    return rawRequests.filter((task) => isTaskRelatedToUser(task, session))
  }, [rawRequests, session])

  const activeTasks = useMemo(() => myTasks.filter((task) => !isTaskCompleted(task)), [myTasks])
  const taskIds = useMemo(() => new Set(myTasks.map((task) => task.request_id)), [myTasks])

  const riskByTaskId = useMemo(() => {
    return Object.fromEntries(
      activeTasks.map((task) => [task.request_id, assessTaskRisk(task, leaves).riskLevel]),
    )
  }, [activeTasks, leaves])

  const overloadedTasks = useMemo(
    () => activeTasks.filter((task) => riskByTaskId[task.request_id] !== "on_track"),
    [activeTasks, riskByTaskId],
  )
  const goLiveTasks = useMemo(() => getGoLiveTasksInWeek(activeTasks, today), [activeTasks, today])
  const phaseDistribution = useMemo(() => getDesignerPhaseDistribution(activeTasks), [activeTasks])
  const TOTAL_BARS = 56
  const phaseBarGroups = useMemo(() => {
    if (activeTasks.length === 0) {
      return [
        {
          key: "empty",
          label: "Chưa có task phụ trách",
          color: "#94a3b8",
          barClass: "bg-slate-200",
          count: 0,
          barsCount: TOTAL_BARS,
        },
      ]
    }
    const activePhases = phaseDistribution.filter((p) => p.count > 0)
    if (activePhases.length === 0) {
      return [
        {
          key: "empty",
          label: "Chưa có task phụ trách",
          color: "#94a3b8",
          barClass: "bg-slate-200",
          count: 0,
          barsCount: TOTAL_BARS,
        },
      ]
    }

    const total = activePhases.reduce((sum, item) => sum + item.count, 0)
    let assignedBars = 0
    const groups = activePhases.map((phase, idx) => {
      const isLast = idx === activePhases.length - 1
      let barsCount = Math.max(1, Math.round((phase.count / total) * TOTAL_BARS))
      if (isLast) {
        barsCount = Math.max(1, TOTAL_BARS - assignedBars)
      } else {
        const remainingPhases = activePhases.length - 1 - idx
        if (assignedBars + barsCount + remainingPhases > TOTAL_BARS) {
          barsCount = Math.max(1, TOTAL_BARS - assignedBars - remainingPhases)
        }
      }
      assignedBars += barsCount

      const barClass =
        phase.key === "define"
          ? "bg-purple-500"
          : phase.key === "design"
            ? "bg-blue-500"
            : phase.key === "ready"
              ? "bg-teal-500"
              : "bg-pink-500"

      return {
        ...phase,
        barClass,
        barsCount,
      }
    })

    return groups
  }, [activeTasks.length, phaseDistribution])
  const briefing = useMemo(
    () => buildRuleBasedBriefing(activeTasks, today, riskByTaskId),
    [activeTasks, today, riskByTaskId, briefingPulse],
  )

  const personalLeaves = useMemo(
    () => leaves.filter((leave) => isSameIdentity(`${leave.fullName} ${leave.email || ""} ${leave.account || ""}`, designerName, designerEmail)),
    [leaves, designerName, designerEmail],
  )

  const entries = useMemo<PlannerEntry[]>(() => {
    const result: PlannerEntry[] = []
    myTasks.forEach((task) => {
      const planned = getTaskPlannedDate(task)
      const deadline = getTaskDeadline(task)
      if (planned) {
        result.push({
          id: `planned-${task.request_id}`,
          date: planned,
          type: "planned",
          title: getRequestDisplayTitle(task),
          label: "Dự kiến làm",
          color: ENTRY_META.planned.dot,
          request: task,
        })
      }
      if (deadline) {
        result.push({
          id: `deadline-${task.request_id}`,
          date: deadline,
          type: "deadline",
          title: getRequestDisplayTitle(task),
          label: "Deadline",
          color: ENTRY_META.deadline.dot,
          request: task,
        })
      }
    })

    personalLeaves.forEach((leave) => {
      const from = normalizeDateToYMD(leave.fromDate)
      const to = normalizeDateToYMD(leave.toDate) || from
      if (!from) return
      let cursor = parseYMD(from)
      const end = parseYMD(to)
      while (cursor <= end) {
        result.push({
          id: `leave-${leave.id}-${normalizeDateToYMD(cursor)}`,
          date: normalizeDateToYMD(cursor),
          type: "leave",
          title: `Nghỉ ${leave.shift || "cả ngày"}`,
          label: "Lịch nghỉ",
          color: ENTRY_META.leave.dot,
        })
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
      }
    })

    calendarItems.filter((item) => item.layer === 4).forEach((item) => {
      const rawEvent = item.rawItem as TeamEvent
      if (!rawEvent) return

      // Trang cá nhân: Chỉ hiển thị event họ tạo, được gán (tham gia), hoặc làm viewer
      if (!isEventRelatedToUser(rawEvent, designerName, designerEmail, session)) {
        return
      }

      const isPersonal = Boolean(rawEvent.createdBy && isSameIdentity(rawEvent.createdBy, designerName, designerEmail))
      result.push({
        id: item.id,
        date: item.date,
        type: isPersonal ? "personal" : "team",
        title: item.title,
        label: isPersonal ? "Event của tôi" : "Event team",
        color: isPersonal ? ENTRY_META.personal.dot : ENTRY_META.team.dot,
        accentColor: item.color,
        time: item.allDay ? "Cả ngày" : item.startDate.includes("T") ? item.startDate.split("T")[1]?.slice(0, 5) : undefined,
        location: rawEvent.location,
        description: rawEvent.description,
        attendees: rawEvent.attendees,
        endTime: item.allDay ? undefined : item.endDate.includes("T") ? item.endDate.split("T")[1]?.slice(0, 5) : undefined,
        recurrence: rawEvent.recurrence,
        recurrenceEndDate: rawEvent.recurrenceEndDate,
        meetingOptions: rawEvent.meetingOptions,
        attachments: rawEvent.attachments,
        categoryId: rawEvent.categoryId,
        durationMinutes: rawEvent.durationMinutes,
        createdBy: rawEvent.createdBy,
        createdAt: rawEvent.createdAt,
        source: item,
      })
    })
    return result.filter((entry) => visibleTypes[entry.type])
  }, [myTasks, personalLeaves, calendarItems, designerName, designerEmail, session, visibleTypes])

  const workSchedule = useMemo(() => getSystemConfig().workSchedule, [holidays])
  const holidayByDate = useMemo(() => {
    const result = new Map<string, HolidayException>()
    holidays.forEach((holiday) => {
      const startYMD = normalizeDateToYMD(holiday.date)
      const endYMD = normalizeDateToYMD(holiday.endDate) || startYMD
      if (!startYMD) return
      let cursor = parseYMD(startYMD)
      const end = parseYMD(endYMD)
      while (cursor <= end) {
        result.set(normalizeDateToYMD(cursor), holiday)
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
      }
    })
    return result
  }, [holidays])

  const entriesByDate = useMemo(() => {
    const map = new Map<string, PlannerEntry[]>()
    entries.forEach((entry) => {
      const current = map.get(entry.date) || []
      current.push(entry)
      map.set(entry.date, current)
    })
    map.forEach((dayEntries) => {
      dayEntries.sort((a, b) => {
        const order: Record<PlannerEntryType, number> = { deadline: 0, planned: 1, personal: 2, team: 3, leave: 4 }
        return order[a.type] - order[b.type]
      })
    })
    return map
  }, [entries])

  const calendarWeeks = useMemo(() => computeCalendarWeeks(anchorDate, true), [anchorDate])
  const visibleDays = useMemo(() => {
    if (view === "month") return calendarWeeks.flatMap((week) => week.days)
    const { start } = getWeekBounds(anchorDate)
    const monday = parseYMD(start)
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      const dateYMD = normalizeDateToYMD(date)
      return {
        date,
        dateYMD,
        dayNumber: date.getDate(),
        isCurrentMonth: true,
        isToday: dateYMD === todayYMD,
        isFirstOfMonth: date.getDate() === 1,
        monthShort: "",
        dayOfWeekIndex: index,
        weekNumber: 0,
      }
    })
  }, [view, calendarWeeks, anchorDate, todayYMD])

  const weekDays = useMemo(() => {
    const { start } = getWeekBounds(anchorDate)
    const monday = parseYMD(start)
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      const dateYMD = normalizeDateToYMD(date)
      const enDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      const viDays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"]
      return {
        date,
        dateYMD,
        dayNumber: date.getDate(),
        dayNameEn: enDays[index],
        dayNameVi: viDays[index],
        isToday: dateYMD === todayYMD,
        dayOfWeekIndex: index,
      }
    })
  }, [anchorDate, todayYMD])

  const agendaDays = useMemo(() => {
    if (view !== "agenda") return []
    const days: Array<{
      date: Date
      dateYMD: string
      dayNameVi: string
      dayNameEn: string
      entries: PlannerEntry[]
    }> = []
    const cursor = new Date(anchorDate)
    for (let i = 0; i < 30; i++) {
      const d = new Date(cursor)
      d.setDate(cursor.getDate() + i)
      const ymd = normalizeDateToYMD(d)
      const dayEntries = entriesByDate.get(ymd) || []
      if (dayEntries.length > 0) {
        const viDayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
        const enDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        days.push({
          date: d,
          dateYMD: ymd,
          dayNameVi: viDayNames[d.getDay()],
          dayNameEn: enDayNames[d.getDay()],
          entries: dayEntries,
        })
      }
    }
    return days
  }, [view, anchorDate, entriesByDate])

  const selectedEntries = useMemo(() => entriesByDate.get(selectedDate) || [], [entriesByDate, selectedDate])
  const { start: weekStart, end: weekEnd } = useMemo(() => getWeekBounds(parseYMD(selectedDate)), [selectedDate])
  const priorityThisWeek = useMemo(() => {
    return activeTasks
      .filter((task) => {
        const priority = (task.priority || "").toLowerCase()
        const date = getTaskDateForWeek(task)
        return (priority === "lv1" || priority === "lv2") && Boolean(date && date >= weekStart && date <= weekEnd)
      })
      .sort((a, b) => getTaskDateForWeek(a).localeCompare(getTaskDateForWeek(b)))
  }, [activeTasks, weekStart, weekEnd])

  const unscheduledTasks = useMemo(
    () => activeTasks.filter((task) => !getTaskPlannedDate(task)),
    [activeTasks],
  )

  const relevantNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (notification.requestId && taskIds.has(notification.requestId)) return true
      return isSameIdentity(notification.recipient, designerName, designerEmail)
    })
  }, [notifications, taskIds, designerName, designerEmail])
  const shownNotifications = notificationFilter === "unread"
    ? relevantNotifications.filter((notification) => !notification.read)
    : relevantNotifications

  const markRelevantAsRead = () => {
    relevantNotifications.forEach((notification) => {
      if (!notification.read) markAsRead(notification.id)
    })
  }

  const navigateToTasks = useCallback(() => {
    window.location.hash = "#track"
    window.dispatchEvent(new CustomEvent("app_navigate", { detail: { page: "track" } }))
  }, [])

  const openTask = useCallback((target?: UXRequest | string) => {
    if (!target) return
    if (typeof target === "object" && target.request_id) {
      setActiveDetailTask(target)
      return
    }
    const requestId = typeof target === "string" ? target : undefined
    if (!requestId) return
    const found = rawRequests.find((r) => r.request_id === requestId)
    if (found) {
      setActiveDetailTask(found)
    } else {
      sessionStorage.setItem("ux_pending_open_task", requestId)
      window.location.hash = `#track?requestId=${encodeURIComponent(requestId)}`
      window.dispatchEvent(new CustomEvent("app_navigate", { detail: { page: "track", requestId } }))
    }
  }, [rawRequests])

  const openSchedule = (task: UXRequest, fallbackDate?: string) => {
    setScheduleTask(task)
    setScheduleDate(getTaskPlannedDate(task) || fallbackDate || selectedDate || todayYMD)
  }

  const saveSchedule = async () => {
    if (!scheduleTask || !scheduleDate) return
    const localResult = updateTaskPlannedDate(scheduleTask.request_id, scheduleDate)
    if (!localResult.success) {
      toast.error(localResult.error || "Không thể xếp ngày dự kiến")
      return
    }
    const result = await updateTaskProgressInSheet(scheduleTask.request_id, {
      new_phase: scheduleTask.current_phase,
      new_status: scheduleTask.status,
      new_progress: scheduleTask.progress,
      planned_work_date: scheduleDate,
      note: `Xếp ngày dự kiến làm vào [${scheduleDate}] trên Designer Planner`,
    })
    if (result.success) {
      toast.success("Đã xếp ngày dự kiến", `${getRequestDisplayTitle(scheduleTask)} · ${formatShortDate(scheduleDate)}`)
    } else {
      toast.warning("Đã lưu trên thiết bị", result.message || "Chưa thể đồng bộ ngày dự kiến lên Cloud")
    }
    setScheduleTask(null)
    setSelectedDate(scheduleDate)
    debouncedSilentReload()
  }

  const isAdmin = useMemo(() => {
    const roleLower = String(session?.role || "").toLowerCase()
    return roleLower.includes("admin") || session?.teamsEmail === "cuongnh.ux@gmail.com" || session?.personalEmail === "cuongnh.ux@gmail.com"
  }, [session?.role, session?.teamsEmail, session?.personalEmail])

  const canManageDetailEvent = useMemo(() => {
    if (!detailEntry) return false
    if (detailEntry.type !== "personal" && detailEntry.type !== "team") return false
    if (isAdmin) return true
    if (detailEntry.type === "personal") return true
    if (detailEntry.createdBy && isSameIdentity(detailEntry.createdBy, designerName, designerEmail)) return true
    return false
  }, [detailEntry, isAdmin, designerName, designerEmail])

  const editInitialValues = useMemo<
    (Partial<ScheduleMeetingValues> & { existingAttachments?: NonNullable<TeamEvent["attachments"]> }) | undefined
  >(() => {
    if (!editingEntry) return undefined
    const rawEvent = editingEntry.source?.rawItem as TeamEvent | undefined
    return {
      title: editingEntry.title,
      categoryId: editingEntry.categoryId || rawEvent?.categoryId || eventCategories[0]?.id || "meeting",
      date: editingEntry.date,
      time: editingEntry.time && editingEntry.time !== "Cả ngày" ? editingEntry.time : "09:00",
      durationMinutes: editingEntry.durationMinutes || rawEvent?.durationMinutes || 30,
      recurrence: editingEntry.recurrence || rawEvent?.recurrence || "none",
      recurrenceEndDate: editingEntry.recurrenceEndDate || rawEvent?.recurrenceEndDate,
      attendees: editingEntry.attendees || rawEvent?.attendees || [],
      location: editingEntry.location || rawEvent?.location || "",
      description: editingEntry.description || rawEvent?.description || "",
      existingAttachments: editingEntry.attachments || rawEvent?.attachments || [],
    }
  }, [editingEntry, eventCategories])

  const handleOpenEditEvent = (entry: PlannerEntry) => {
    setEditingEntry(entry)
    setEventDate(entry.date)
    setEventModalOpen(true)
  }

  const openAddEvent = (date = selectedDate) => {
    setEditingEntry(null)
    setEventDate(date)
    setEventModalOpen(true)
  }

  const savePersonalEvent = async (
    values: ScheduleMeetingValues,
    images: File[],
    existingAttachments?: NonNullable<TeamEvent["attachments"]>
  ) => {
    if (!values.title || !values.date || !values.time) return
    setEventSaving(true)
    try {
      const uploadResults = await Promise.all(images.map((file) => uploadFileToDrive(file, "UX_Planner_Event_Attachments")))
      const newAttachments = uploadResults.flatMap((result, index) => {
        const url = result.fileUrl || result.downloadUrl
        if (!result.success || !url) return []
        return [{
          name: result.fileName || images[index].name,
          url,
          thumbnailUrl: result.thumbnailUrl,
          fileId: result.fileId,
          size: result.fileSize || images[index].size,
          type: images[index].type,
        }]
      })
      const failedUploads = uploadResults.length - newAttachments.length
      const combinedAttachments = [...(existingAttachments || []), ...newAttachments]

      if (editingEntry) {
        const rawId = editingEntry.id.replace(/^(personal|team)-/, "")
        const rawEvent = editingEntry.source?.rawItem as TeamEvent | undefined
        const updatedEvent: TeamEvent = {
          id: rawId,
          title: values.title,
          categoryId: values.categoryId,
          startDate: `${values.date}T${values.time}`,
          endDate: addMinutesToLocalDateTime(values.date, values.time, values.durationMinutes),
          allDay: false,
          attendees: values.attendees,
          location: values.location,
          description: values.description,
          durationMinutes: values.durationMinutes,
          recurrence: values.recurrence,
          recurrenceEndDate: values.recurrenceEndDate,
          meetingOptions: rawEvent?.meetingOptions,
          attachments: combinedAttachments,
          createdBy: rawEvent?.createdBy || editingEntry.createdBy || session?.displayName || "Team Member",
          createdAt: rawEvent?.createdAt || editingEntry.createdAt || new Date().toISOString(),
        }
        updateTeamEvent(updatedEvent, session)
        toast.success("Đã cập nhật sự kiện", `${values.time} · ${formatShortDate(values.date)}`)
        if (failedUploads > 0) toast.warning(`${failedUploads} ảnh chưa tải lên được`, "Event vẫn được cập nhật với các ảnh đã tải thành công.")

        if (detailEntry && (detailEntry.id === editingEntry.id || detailEntry.id.replace(/^(personal|team)-/, "") === rawId)) {
          setDetailEntry((prev) => prev ? ({
            ...prev,
            title: updatedEvent.title,
            date: values.date,
            time: values.time,
            endTime: updatedEvent.endDate.includes("T") ? updatedEvent.endDate.split("T")[1]?.slice(0, 5) : undefined,
            location: updatedEvent.location,
            description: updatedEvent.description,
            attendees: updatedEvent.attendees,
            durationMinutes: updatedEvent.durationMinutes,
            categoryId: updatedEvent.categoryId,
            recurrence: updatedEvent.recurrence,
            recurrenceEndDate: updatedEvent.recurrenceEndDate,
            attachments: updatedEvent.attachments,
          }) : null)
        }
      } else {
        addTeamEvent({
          title: values.title,
          categoryId: values.categoryId,
          startDate: `${values.date}T${values.time}`,
          endDate: addMinutesToLocalDateTime(values.date, values.time, values.durationMinutes),
          allDay: false,
          attendees: values.attendees,
          location: values.location,
          description: values.description,
          durationMinutes: values.durationMinutes,
          recurrence: values.recurrence,
          recurrenceEndDate: values.recurrenceEndDate,
          attachments: combinedAttachments,
        }, session)
        toast.success("Đã lên lịch cuộc họp", `${values.time} · ${formatShortDate(values.date)}`)
        if (failedUploads > 0) toast.warning(`${failedUploads} ảnh chưa tải lên được`, "Event vẫn được tạo với các ảnh đã tải thành công.")
      }

      setEventModalOpen(false)
      setEditingEntry(null)
      setSelectedDate(values.date)
      debouncedSilentReload()
    } catch (error) {
      console.error("[DesignerPlanner] Unable to save meeting:", error)
      toast.error(editingEntry ? "Không thể cập nhật cuộc họp" : "Không thể tạo cuộc họp", error instanceof Error ? error.message : "Vui lòng thử lại sau.")
    } finally {
      setEventSaving(false)
    }
  }

  const movePeriod = (direction: -1 | 1) => {
    const next = new Date(anchorDate)
    if (view === "month") next.setMonth(next.getMonth() + direction)
    else if (view === "week") next.setDate(next.getDate() + direction * 7)
    else next.setDate(next.getDate() + direction * 30)
    setAnchorDate(next)
  }

  const handleBriefingClick = (item: PlannerBriefingItem) => {
    if (item.requestId) openTask(item.requestId)
    else if (item.date) setSelectedDate(item.date)
  }

  const summaryProjects = useMemo(() => {
    if (activeTasks.length > 0) return activeTasks.slice(0, 3)
    if (myTasks.length > 0) return myTasks.slice(0, 3)
    return []
  }, [activeTasks, myTasks])

  const riskProjects = useMemo(() => {
    return activeTasks.filter((t) => riskByTaskId[t.request_id] === "overdue" || riskByTaskId[t.request_id] === "at_risk")
  }, [activeTasks, riskByTaskId])

  const keyInitiatives = useMemo(() => {
    return summaryProjects.map((task) => {
      let desc = ""
      const stage = String((task as any).stage || task.current_phase || task.status || "").toLowerCase()
      if (stage.includes("wire")) {
        desc = "Tập trung hoàn thiện bản vẽ wireframe, kiểm thử tương tác và hoàn thiện luồng trải nghiệm người dùng."
      } else if (stage.includes("ready") || stage.includes("dev")) {
        desc = "Đã hoàn tất nghiệm thu thiết kế UI, đang chuẩn bị bàn giao Design Token và Specs cho đội ngũ kỹ thuật."
      } else if (stage.includes("review")) {
        desc = "Đang tổng hợp phản hồi từ Hội đồng dự án và PO để chốt phương án giao diện cuối cùng."
      } else {
        desc = "Dự án ưu tiên tập trung nghiên cứu hành trình khách hàng số và tối ưu tỷ lệ chuyển đổi."
      }
      return {
        task,
        text: desc,
      }
    })
  }, [summaryProjects])

  const dominantPhaseText = useMemo(() => {
    if (phaseDistribution.length === 0) return "hoàn thiện thiết kế UI"
    const sorted = [...phaseDistribution].sort((a, b) => b.count - a.count)
    const top = sorted[0]
    if (!top || top.count === 0) return "hoàn thiện thiết kế UI"
    if (top.key === "define") return "khảo sát nghiệp vụ & định nghĩa đầu bài (Define)"
    if (top.key === "design") return "hoàn thiện Wireframe và thiết kế UI chi tiết"
    if (top.key === "ready") return "chuẩn hóa Design Specs và bàn giao Tech (Ready for Dev)"
    return "nghiệm thu giao diện & kiểm thử trải nghiệm (Design QA)"
  }, [phaseDistribution])

  const focusSummaryText = useMemo(() => {
    if (summaryProjects.length === 0) return ""
    const descriptions = Array.from(new Set(summaryProjects.map((task) => getTaskFocusDescription(task))))
    if (descriptions.length === 1) return descriptions[0]
    if (descriptions.length === 2) return `${descriptions[0]} và ${descriptions[1]}`
    return `${descriptions.slice(0, -1).join(", ")}, và ${descriptions[descriptions.length - 1]}`
  }, [summaryProjects])

  // ─── Tầng dữ liệu chi tiết cho Executive Copilot ─────────────────────────────────
  // 1. Phân loại Task thông minh
  const newAssignedTasks = useMemo(() => {
    return activeTasks.filter((t) => {
      const stage = `${t.current_phase || ""} ${t.status || ""}`.toLowerCase()
      const isNewStatus = stage.includes("tiếp nhận") || stage.includes("phân loại")
      const isUntouched = (t.progress === 0 || !t.progress) && !getTaskPlannedDate(t)
      return isNewStatus || isUntouched
    })
  }, [activeTasks])

  const overdueTasks = useMemo(() => {
    return activeTasks.filter((t) => {
      const deadline = getTaskDeadline(t)
      return riskByTaskId[t.request_id] === "overdue" || Boolean(deadline && deadline < todayYMD)
    })
  }, [activeTasks, riskByTaskId, todayYMD])

  const dueTodayTasks = useMemo(() => {
    return activeTasks.filter((t) => getTaskDeadline(t) === todayYMD)
  }, [activeTasks, todayYMD])

  const plannedTodayTasks = useMemo(() => {
    return activeTasks.filter((t) => getTaskPlannedDate(t) === todayYMD)
  }, [activeTasks, todayYMD])

  const poPendingTasks = useMemo(() => {
    return activeTasks.filter((t) => {
      const s = `${t.status || ""} ${t.current_phase || ""}`.toLowerCase()
      return s.includes("po pending") || s.includes("đã gửi po")
    })
  }, [activeTasks])

  // 2. Sự kiện theo lịch (Events & Leaves)
  const todayEvents = useMemo(() => {
    return entries.filter((e) => e.date === todayYMD && (e.type === "team" || e.type === "personal"))
  }, [entries, todayYMD])

  const todayPersonalLeaves = useMemo(() => {
    return entries.filter((e) => e.date === todayYMD && e.type === "leave")
  }, [entries, todayYMD])

  const weekEvents = useMemo(() => {
    return entries.filter((e) => e.date >= weekStart && e.date <= weekEnd && (e.type === "team" || e.type === "personal"))
  }, [entries, weekStart, weekEnd])

  const weekLeaves = useMemo(() => {
    return entries.filter((e) => e.date >= weekStart && e.date <= weekEnd && e.type === "leave")
  }, [entries, weekStart, weekEnd])

  // 3. Kế hoạch tuần tới (Next-Week Horizon)
  const nextWeekAnchor = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() + 7)
    return d
  }, [today])
  const { start: nextWeekStart, end: nextWeekEnd } = useMemo(() => getWeekBounds(nextWeekAnchor), [nextWeekAnchor])

  const nextWeekDeadlines = useMemo(() => {
    return activeTasks.filter((t) => {
      const d = getTaskDeadline(t)
      return Boolean(d && d >= nextWeekStart && d <= nextWeekEnd)
    })
  }, [activeTasks, nextWeekStart, nextWeekEnd])

  const nextWeekEvents = useMemo(() => {
    return entries.filter((e) => e.date >= nextWeekStart && e.date <= nextWeekEnd && (e.type === "team" || e.type === "personal"))
  }, [entries, nextWeekStart, nextWeekEnd])

  const dayOfWeek = today.getDay() // 0: CN, 1: T2, ..., 6: T7
  const isEndOfWeek = dayOfWeek === 4 || dayOfWeek === 5 // T5, T6
  const isBeginningOfWeek = dayOfWeek === 1 || dayOfWeek === 2 // T2, T3

  const recommendationText = useMemo(() => {
    const hasRisk = riskProjects.length > 0
    const hasGoLive = goLiveTasks.length > 0

    if (dayOfWeek === 1 || dayOfWeek === 2) {
      if (hasRisk) {
        return "Khuyến nghị phân bổ thời gian tập trung giải quyết dứt điểm các hạng mục ưu tiên cao trong 48h tới trước khi mở rộng sang các yêu cầu mới."
      }
      return "Khuyến nghị chốt sớm timeline các mốc review với PO để chủ động nhịp độ thiết kế trong cả tuần."
    }
    if (dayOfWeek === 3 || dayOfWeek === 4) {
      if (hasRisk) {
        return "Nên tổ chức trao đổi nhanh với PO và Tech Lead để tháo gỡ vướng mắc phát sinh và thống nhất phương án xử lý."
      }
      if (hasGoLive) {
        return "Nên rà soát lại checklist Design QA và đồng bộ lần cuối với đội ngũ phát triển trước thời điểm phát hành."
      }
      return "Tiếp tục duy trì nhịp độ sprint hiện tại để hoàn thành các deliverables theo đúng kế hoạch cam kết."
    }
    if (hasGoLive) {
      return "Ưu tiên hỗ trợ Tech kiểm thử giao diện thực tế trên môi trường Staging/UAT để đảm bảo trải nghiệm người dùng đồng nhất."
    }
    if (hasRisk) {
      return "Cần tổng hợp lại các điểm nghẽn chưa thể xử lý trong tuần để đưa vào kế hoạch hành động đầu tuần tới."
    }
    return "Thời điểm phù hợp để tổng kết sprint, đóng các task đã hoàn thành và chuẩn bị backlog thiết kế cho tuần tới."
  }, [dayOfWeek, riskProjects.length, goLiveTasks.length])

  const [copiedSummary, setCopiedSummary] = useState(false)
  const handleCopyExecutiveSummary = useCallback(() => {
    const lines: string[] = []
    lines.push(`Executive Summary — UX Team MB (${formatDateLong(today)})`)
    lines.push("")

    // Block 1: Hôm nay
    lines.push(`🔴 [HÔM NAY - ${formatShortDate(todayYMD)}]`)
    if (newAssignedTasks.length > 0) {
      lines.push(`• Task mới gán (${newAssignedTasks.length}): ${newAssignedTasks.slice(0, 3).map((t) => t.title).join(", ")} (cần tiếp nhận & phân tích).`)
    }
    if (overdueTasks.length > 0) {
      lines.push(`• Cần cứu hạn (${overdueTasks.length} task trễ): ${overdueTasks.slice(0, 2).map((t) => `${t.title} [Hạn: ${formatShortDate(getTaskDeadline(t))}]`).join(", ")}.`)
    }
    if (dueTodayTasks.length > 0) {
      lines.push(`• Chạm deadline hôm nay: ${dueTodayTasks.map((t) => t.title).join(", ")}.`)
    }
    if (plannedTodayTasks.length > 0) {
      lines.push(`• Dự kiến làm hôm nay: ${plannedTodayTasks.map((t) => t.title).join(", ")}.`)
    }
    if (todayEvents.length > 0) {
      lines.push(`• Lịch họp & sự kiện hôm nay (${todayEvents.length}): ${todayEvents.map((e) => `${e.time ? `[${e.time}] ` : ""}${e.title}${e.location ? ` (${e.location})` : ""}`).join("; ")}.`)
    } else {
      lines.push(`• Lịch hôm nay: Không có cuộc họp cố định — thuận lợi Deep Work.`)
    }
    if (todayPersonalLeaves.length > 0) {
      lines.push(`• Lịch nghỉ phép: ${todayPersonalLeaves.map((l) => l.title).join(", ")}.`)
    }
    lines.push("")

    // Block 2: Tuần này & Go-Live
    lines.push(`🚀 [TUẦN NÀY & MỐC GO-LIVE]`)
    if (activeTasks.length > 0) {
      lines.push(`• Bạn đang phụ trách ${activeTasks.length} bài toán, trọng tâm vào ${dominantPhaseText}${focusSummaryText ? `. Hướng đến ${focusSummaryText}` : ""}.`)
    } else {
      lines.push(`• Hiện tại bạn chưa có bài toán nào đang thực hiện hoặc theo dõi.`)
    }
    if (goLiveTasks.length > 0) {
      lines.push(`• Mốc Go-Live tuần: Dự án "${goLiveTasks.map((t) => t.title).join(", ")}" dự kiến phát hành trong tuần này — cần rà soát spec nghiệm thu UI và báo cáo PO/Tech.`)
    }
    if (poPendingTasks.length > 0) {
      lines.push(`• Đang chờ PO duyệt: ${poPendingTasks.map((t) => t.title).join(", ")}.`)
    }
    if (weekEvents.length > 0) {
      lines.push(`• Sự kiện tuần (${weekEvents.length}): ${weekEvents.slice(0, 3).map((e) => e.title).join(", ")}.`)
    }
    lines.push("")

    // Block 3: Kế hoạch tiếp theo
    lines.push(`📋 [${isEndOfWeek ? "KẾ HOẠCH TUẦN TỚI (CẢNH BÁO T5-T6)" : "KẾ HOẠCH & ĐỀ XUẤT"}]`)
    if (isEndOfWeek) {
      if (nextWeekDeadlines.length > 0) {
        lines.push(`• Deadline đầu tuần sau (${nextWeekDeadlines.length}): ${nextWeekDeadlines.slice(0, 3).map((t) => `${t.title} [Hạn: ${formatShortDate(getTaskDeadline(t))}]`).join(", ")}.`)
      }
      if (nextWeekEvents.length > 0) {
        lines.push(`• Sự kiện tuần sau: ${nextWeekEvents.slice(0, 2).map((e) => `${formatShortDate(e.date)}: ${e.title}`).join("; ")}.`)
      }
      if (unscheduledTasks.length > 0) {
        lines.push(`• Task chưa xếp ngày: Còn ${unscheduledTasks.length} task cần xếp ngày dự kiến trên Planner.`)
      }
      lines.push(`• Khuyến nghị: Dành chiều thứ 6 hoàn thiện bàn giao deliverables và chuẩn bị backlog tuần mới.`)
    } else {
      lines.push(`• Khuyến nghị: ${recommendationText}`)
    }

    const text = lines.join("\n")
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedSummary(true)
        toast.success("Đã sao chép Executive Summary!")
        setTimeout(() => setCopiedSummary(false), 2000)
      })
    }
  }, [
    today,
    todayYMD,
    newAssignedTasks,
    overdueTasks,
    dueTodayTasks,
    plannedTodayTasks,
    todayEvents,
    todayPersonalLeaves,
    activeTasks.length,
    dominantPhaseText,
    focusSummaryText,
    goLiveTasks,
    poPendingTasks,
    weekEvents,
    isEndOfWeek,
    nextWeekDeadlines,
    nextWeekEvents,
    unscheduledTasks.length,
    recommendationText,
  ])

  const handleRefreshBriefing = useCallback(() => {
    if (isAiRefreshing) return
    setIsViewingAiTrace(false)
    setIsAiRefreshing(true)
    setBriefingPulse((v) => v + 1)
  }, [isAiRefreshing])

  const handleFinishAiRefresh = useCallback(() => {
    setBriefingUpdatedAt(new Date())
    setIsAiRefreshing(false)
    toast.success("Đã hoàn tất phân tích & làm mới AI Executive!")
  }, [])

  const monthTitle = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(anchorDate)
  const calendarTitle = useMemo(() => {
    if (view === "month") {
      return new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(anchorDate)
    }
    if (view === "week") {
      const { start, end } = getWeekBounds(anchorDate)
      const startDate = parseYMD(start)
      const endDate = parseYMD(end)
      return `${startDate.getDate()} thg ${startDate.getMonth() + 1} – ${endDate.getDate()} thg ${endDate.getMonth() + 1}, ${endDate.getFullYear()}`
    }
    // agenda view: 30 days
    const startDate = anchorDate
    const endDate = new Date(anchorDate)
    endDate.setDate(endDate.getDate() + 30)
    return `${startDate.getDate()} thg ${startDate.getMonth() + 1} – ${endDate.getDate()} thg ${endDate.getMonth() + 1}, ${endDate.getFullYear()}`
  }, [view, anchorDate])
  const selectedDateLabel = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" }).format(parseYMD(selectedDate))
  const totalPhase = Math.max(1, phaseDistribution.reduce((sum, item) => sum + item.count, 0))

  return (
    <div className="w-full space-y-6">
      <PageHeader
          breadcrumb={{
            parent: "Dashboards",
            current: "Planner",
          }}
          title={`${getGreeting(today.getHours())}, ${designerName.split(" ").pop()}`}
          badge={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          }
          subtitle={
            <div className="flex items-center text-xs text-slate-500">
              <span className="text-[13px] sm:text-sm italic font-medium text-slate-600" aria-label={`“${quote}”`}>
                <span aria-hidden="true">“{displayedQuote}</span>
                <span
                  aria-hidden="true"
                  className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-slate-400"
                />
                <span aria-hidden="true">”</span>
              </span>
            </div>
          }
        />

        <div className="w-full min-w-0 space-y-5">
          {/* ROW 1: 2 Bento Cards */}
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(520px,0.88fr)]">
            {/* Card 1: Executive Summary - ĐỨNG IM, KHÔNG ANIMATION XUẤT HIỆN */}
            <div className="relative rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col h-[240px] min-w-0 shadow-2xs overflow-hidden">
              <BorderBeam
                colorFrom="#1057FB"
                colorTo="#0D9B97"
                colorVia="#4079fc"
                duration={4.5}
                iterations={2}
                triggerKey={briefingPulse}
                borderRadius="1rem"
              />
              {/* Header on gray background */}
              <div className="flex items-center justify-between px-3.5 py-1.5 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <img src="/ai-default.png" alt="AI" className="h-4 w-4 object-contain shrink-0" />
                  <h3 className="text-sm font-semibold text-neutral-900 truncate">Executive Summary</h3>
                  <span className="hidden sm:inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200/60 shrink-0">
                    UXTeamMB
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyExecutiveSummary}
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-200/60 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-neutral-600 shadow-2xs hover:bg-white hover:text-neutral-900 transition-colors cursor-pointer"
                    title="Sao chép nội dung tóm tắt"
                  >
                    {copiedSummary ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-neutral-400" />}
                    <span className="hidden sm:inline">{copiedSummary ? "Đã chép" : "Sao chép"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBriefingExpanded(true)}
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-200/60 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-neutral-600 shadow-2xs hover:bg-white hover:text-neutral-900 transition-colors cursor-pointer"
                    title="Mở sheet đọc đầy đủ thông tin"
                  >
                    <Maximize2 className="h-3 w-3 text-neutral-400" />
                    <span className="hidden sm:inline">Mở rộng</span>
                  </button>
                </div>
              </div>

              {/* Inner White Card */}
              <div className="rounded-xl border border-neutral-200/70 bg-white p-3.5 sm:p-4 shadow-2xs flex-1 flex flex-col justify-between overflow-hidden min-w-0">
                {/* Scrollable Summary Body */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5 text-sm leading-relaxed text-neutral-700">
                  {loading || isAiRefreshing ? (
                    <AgentActivityTrace
                      activeTasks={activeTasks.length > 0 ? activeTasks : FALLBACK_TRACE_TASKS}
                      summaryProjects={summaryProjects.length > 0 ? summaryProjects : FALLBACK_TRACE_TASKS}
                      riskProjects={riskProjects}
                      goLiveTasks={goLiveTasks}
                      dominantPhaseText={dominantPhaseText || "giai đoạn Wireframe"}
                      isRefreshing={true}
                      onComplete={handleTraceComplete}
                      onOpenTask={openTask}
                      mode="live"
                    />
                  ) : isViewingAiTrace ? (
                    <div className="space-y-2">
                      <AgentActivityTrace
                        activeTasks={activeTasks}
                        summaryProjects={summaryProjects}
                        riskProjects={riskProjects}
                        goLiveTasks={goLiveTasks}
                        dominantPhaseText={dominantPhaseText}
                        mode="inspector"
                        onCloseInspector={() => setIsViewingAiTrace(false)}
                        onOpenTask={openTask}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <ExecutiveSummaryTypewriter
                        todayYMD={todayYMD}
                        newAssignedTasks={newAssignedTasks}
                        overdueTasks={overdueTasks}
                        dueTodayTasks={dueTodayTasks}
                        plannedTodayTasks={plannedTodayTasks}
                        todayEvents={todayEvents}
                        todayPersonalLeaves={todayPersonalLeaves}
                        activeTasks={activeTasks}
                        dominantPhaseText={dominantPhaseText}
                        focusSummaryText={focusSummaryText}
                        goLiveTasks={goLiveTasks}
                        poPendingTasks={poPendingTasks}
                        weekEvents={weekEvents}
                        isEndOfWeek={isEndOfWeek}
                        isBeginningOfWeek={isBeginningOfWeek}
                        nextWeekDeadlines={nextWeekDeadlines}
                        nextWeekEvents={nextWeekEvents}
                        unscheduledTasks={unscheduledTasks}
                        recommendationText={recommendationText}
                        triggerKey={briefingPulse}
                        onOpenTask={openTask}
                        onOpenEvent={(ev) => setDetailEntry(ev)}
                      />

                      {/* Gợi ý thao tác nhanh - đặt ở cuối đoạn chat */}
                      <div className="pt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-neutral-400">Gợi ý thao tác:</span>
                        <button
                          type="button"
                          onClick={handleRefreshBriefing}
                          disabled={isAiRefreshing}
                          className="inline-flex items-center gap-1 rounded-full border border-neutral-200/80 bg-neutral-50/70 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600 shadow-2xs hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Sparkles className={cn("h-3 w-3 text-purple-500", isAiRefreshing && "animate-spin")} />
                          <span>{isAiRefreshing ? "Đang đọc & tóm tắt..." : "Tóm tắt lại"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsViewingAiTrace((v) => !v)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium shadow-2xs transition-colors",
                            isViewingAiTrace
                              ? "border-purple-400 bg-purple-50 text-purple-700 font-semibold"
                              : "border-neutral-200/80 bg-neutral-50/70 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100/70"
                          )}
                          title="Xem lại chi tiết các nguồn dự án và tiêu chí AI đã quét"
                        >
                          <ListChecks className="h-3 w-3 text-neutral-500" />
                          <span>{isViewingAiTrace ? "Ẩn nhật ký đọc" : "Nhật ký AI đã đọc"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Thông tin tuần */}
            <AnimatePresence mode="wait">
              {loading ? (
                <DesignerPlannerWeeklyCardSkeleton key="card2-skel" />
              ) : (
                <motion.div
                  key="card2-content"
                  variants={cascadeWaveItemVariants}
                  custom={0}
                  layout="position"
                  className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col h-[240px] min-w-0 shadow-2xs"
                >
            {/* Header on gray background */}
            <div className="flex items-center justify-between px-3.5 py-1.5 min-w-0">
              <h3 className="text-sm font-semibold text-neutral-900">
                Thông tin tuần
              </h3>
              <button
                type="button"
                onClick={navigateToTasks}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200/60 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-neutral-600 shadow-2xs hover:bg-white hover:text-blue-600 transition-colors"
                title="Mở danh sách My task"
              >
                <span>My task</span>
                <ArrowRight className="h-3 w-3 text-neutral-400" />
              </button>
            </div>

            {/* Inner White Card */}
            <div className="rounded-xl border border-neutral-200/70 bg-white p-3.5 sm:p-4 shadow-2xs flex-1 flex flex-col justify-between min-w-0">
              {/* Main Highlight: Big Metric + Delta / Status + Context */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[28px] font-bold tracking-tight text-neutral-900 leading-none shrink-0">
                  {activeTasks.length > 0 ? `${activeTasks.length} task` : "0 task"}
                </span>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {overloadedTasks.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>+{overloadedTasks.length} overload</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span>100% on-track</span>
                    </span>
                  )}
                  <span className="text-neutral-300 font-bold select-none">•</span>
                  <span
                    className={cn(
                      "inline-flex items-center",
                      goLiveTasks.length > 0 ? "text-blue-600" : "text-neutral-400"
                    )}
                  >
                    {goLiveTasks.length} go-live tuần này
                  </span>
                </div>
              </div>

              {/* 56 Segmented Vertical-Bar Meter (Signature ReUI chart-14) */}
              <div
                aria-label={`Phân bố công việc tuần này: ${activeTasks.length} task`}
                role="img"
                className="flex h-7 w-full items-center overflow-hidden my-2"
              >
                {phaseBarGroups.map((group) => {
                  const isDimmed = Boolean(hoveredPhaseKey && hoveredPhaseKey !== group.key)
                  const isHovered = hoveredPhaseKey === group.key
                  const pct =
                    activeTasks.length > 0 && group.count > 0
                      ? Math.round((group.count / activeTasks.length) * 100)
                      : 0

                  return (
                    <Tooltip
                      key={group.key}
                      delayDuration={50}
                      side="top"
                      content={
                        <div className="flex items-center gap-2 py-0.5 text-xs font-sans">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: group.color }}
                          />
                          <span className="font-medium text-slate-200">{group.label}:</span>
                          <span className="font-bold text-white">{group.count} task</span>
                          {pct > 0 && <span className="text-slate-400 text-[11px]">({pct}%)</span>}
                        </div>
                      }
                    >
                      <div
                        onMouseEnter={() => setHoveredPhaseKey(group.key)}
                        onMouseLeave={() => setHoveredPhaseKey(null)}
                        style={{ flex: `${group.barsCount} ${group.barsCount} 0%` }}
                        className="flex items-center justify-around h-full cursor-pointer"
                      >
                        {Array.from({ length: group.barsCount }).map((_, barIdx) => (
                          <span
                            key={barIdx}
                            className={cn(
                              "h-full w-[2.5px] sm:w-[3px] shrink-0 rounded-full transition-all duration-200",
                              group.barClass,
                              isDimmed ? "opacity-30" : "opacity-100",
                              isHovered ? "scale-y-115 brightness-110 shadow-xs" : ""
                            )}
                          />
                        ))}
                      </div>
                    </Tooltip>
                  )
                })}
              </div>

              {/* Phase Legend: Xếp ngang chú thích (không cần số, hiển thị tooltip khi trỏ vào) */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2.5 border-t border-neutral-100">
                {phaseDistribution.map((item) => {
                  const isDimmed = Boolean(hoveredPhaseKey && hoveredPhaseKey !== item.key)
                  const isHovered = hoveredPhaseKey === item.key
                  const pct =
                    activeTasks.length > 0 && item.count > 0
                      ? Math.round((item.count / activeTasks.length) * 100)
                      : 0

                  return (
                    <Tooltip
                      key={item.key}
                      delayDuration={50}
                      side="top"
                      content={
                        <div className="flex items-center gap-2 py-0.5 text-xs font-sans">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium text-slate-200">{item.label}:</span>
                          <span className="font-bold text-white">{item.count} task</span>
                          {pct > 0 && <span className="text-slate-400 text-[11px]">({pct}%)</span>}
                        </div>
                      }
                    >
                      <div
                        onMouseEnter={() => setHoveredPhaseKey(item.key)}
                        onMouseLeave={() => setHoveredPhaseKey(null)}
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-medium transition-all duration-200 cursor-pointer select-none px-2 py-0.5 rounded-md",
                          isHovered
                            ? "bg-neutral-100 text-neutral-950 font-semibold"
                            : isDimmed
                              ? "text-neutral-400 opacity-60"
                              : "text-neutral-600 hover:text-neutral-900"
                        )}
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.label}</span>
                      </div>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* ROW 2: Calendar & Task Sidebar Section */}
    <AnimatePresence mode="wait">
      {loading ? (
        <DesignerPlannerCalendarSkeleton key="cal-skel" />
      ) : (
        <motion.div
          key="cal-content"
          variants={cascadeWaveContainerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          <motion.section
            variants={cascadeWaveItemVariants}
            custom={1}
            layout="position"
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs"
          >
                {/* Calendar Toolbar (Roster HR Style) */}
                <div className="flex flex-col gap-3 border-b border-slate-200/80 px-4 py-3 sm:px-5 sm:flex-row sm:items-center sm:justify-between bg-white">
            {/* Left Controls: Today, View dropdown, Prev/Next buttons, Month/Year label */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAnchorDate(today)
                  setSelectedDate(todayYMD)
                }}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                Hôm nay
              </button>

              {/* View Dropdown */}
              <div className="relative" ref={viewDropdownRef}>
                <button
                  type="button"
                  onClick={() => setViewDropdownOpen((prev) => !prev)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <span>{view === "month" ? "Tháng" : view === "week" ? "Tuần" : "Lịch trình"}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform duration-200", viewDropdownOpen && "rotate-180")} />
                </button>

                {viewDropdownOpen && (
                  <div className="absolute left-0 mt-1 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg z-50 animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setView("month")
                        setViewDropdownOpen(false)
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
                        view === "month" ? "bg-slate-100 text-slate-900 font-semibold" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Tháng
                      </span>
                      {view === "month" && <Check className="h-3.5 w-3.5 text-slate-900" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setView("week")
                        setViewDropdownOpen(false)
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
                        view === "week" ? "bg-slate-100 text-slate-900 font-semibold" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <Columns3 className="h-3.5 w-3.5" />
                        Tuần
                      </span>
                      {view === "week" && <Check className="h-3.5 w-3.5 text-slate-900" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setView("agenda")
                        setViewDropdownOpen(false)
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
                        view === "agenda" ? "bg-slate-100 text-slate-900 font-semibold" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <CalendarRange className="h-3.5 w-3.5" />
                        Lịch trình
                      </span>
                      {view === "agenda" && <Check className="h-3.5 w-3.5 text-slate-900" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => movePeriod(-1)}
                  className="h-8 w-8 rounded-l-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
                  aria-label="Thời gian trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => movePeriod(1)}
                  className="h-8 w-8 -ml-px rounded-r-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
                  aria-label="Thời gian sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Month/Week/Agenda Title */}
              <h2 className="ml-1 text-sm sm:text-base font-bold text-slate-900 capitalize">
                {calendarTitle}
              </h2>
            </div>

            {/* Right Controls: Streams / Filter Dropdown & Add Event Button */}
            <div className="flex items-center gap-2">
              {/* Filter Dropdown */}
              <div className="relative" ref={streamsDropdownRef}>
                <button
                  type="button"
                  onClick={() => setStreamsDropdownOpen((prev) => !prev)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5"
                  title="Bộ lọc hiển thị"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                  <span>Bộ lọc</span>
                  {!Object.values(visibleTypes).every(Boolean) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-white" />
                  )}
                  <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform duration-200", streamsDropdownOpen && "rotate-180")} />
                </button>

                {streamsDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-50 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Bộ lọc</span>
                      <button
                        type="button"
                        onClick={() => {
                          const allVisible = Object.values(visibleTypes).every(Boolean)
                          setVisibleTypes({
                            deadline: !allVisible,
                            planned: !allVisible,
                            leave: !allVisible,
                            team: !allVisible,
                            personal: !allVisible,
                          })
                        }}
                        className="text-[10px] font-semibold text-blue-600 hover:underline capitalize"
                      >
                        {Object.values(visibleTypes).every(Boolean) ? "Ẩn hết" : "Hiện hết"}
                      </button>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {(Object.keys(ENTRY_META) as PlannerEntryType[]).map((type) => {
                        const meta = ENTRY_META[type]
                        const isChecked = visibleTypes[type]
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setVisibleTypes((current) => ({ ...current, [type]: !current[type] }))}
                            className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                              <span className="font-medium">{meta.label}</span>
                            </div>
                            <div className={cn(
                              "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                              isChecked ? "bg-slate-900 border-slate-900 text-white" : "border-slate-300 bg-white"
                            )}>
                              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* + Thêm lịch Button */}
              <Button
                size="sm"
                onClick={() => openAddEvent()}
                className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm lịch</span>
              </Button>
            </div>
          </div>

          {/* Calendar Views & Task Sidebar Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_440px] items-stretch min-w-0">
            {/* Left Column: Calendar Views */}
            <div ref={calendarRef} className="min-w-0 overflow-x-auto flex flex-col h-full">
              <div className="min-w-[760px] w-full flex-1 flex flex-col">
              {/* VIEW 1: MONTH VIEW */}
              {view === "month" && (
                <div className="flex-1 flex flex-col h-full">
                  {/* Day of Week Header (Roster HR style) */}
                  <div className="grid grid-cols-7 border-b border-slate-200/80 bg-white shrink-0">
                    {[
                      { en: "Mon", vi: "Thứ 2" },
                      { en: "Tue", vi: "Thứ 3" },
                      { en: "Wed", vi: "Thứ 4" },
                      { en: "Thu", vi: "Thứ 5" },
                      { en: "Fri", vi: "Thứ 6" },
                      { en: "Sat", vi: "Thứ 7" },
                      { en: "Sun", vi: "CN" },
                    ].map((day) => (
                      <div key={day.en} className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600">
                        {day.en}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Cells Grid */}
                  <div
                    className="grid grid-cols-7 flex-1"
                    style={{ gridTemplateRows: `repeat(${calendarWeeks.length}, minmax(120px, 1fr))` }}
                  >
                    {visibleDays.map((day, dayIdx) => {
                      const isLastRow = dayIdx >= (calendarWeeks.length - 1) * 7
                      const isLastCol = day.dayOfWeekIndex === 6
                      const dayEntries = entriesByDate.get(day.dateYMD) || []
                      const holiday = holidayByDate.get(day.dateYMD)
                      const isCompensatoryWorkday = holiday?.type === "compensatory_workday"
                      const dayKey = (["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const)[day.dayOfWeekIndex]
                      const isRegularDayOff = !workSchedule.workweek.includes(dayKey)
                      const isPublicDayOff = Boolean(holiday && !isCompensatoryWorkday)
                      const isNonWorkingDay = isPublicDayOff || (isRegularDayOff && !isCompensatoryWorkday)
                      const maxVisible = 3
                      const shown = dayEntries.slice(0, maxVisible)
                      const isSelected = selectedDate === day.dateYMD

                      return (
                        <div
                          key={day.dateYMD}
                          onClick={() => setSelectedDate(day.dateYMD)}
                          onDoubleClick={() => openAddEvent(day.dateYMD)}
                          className={cn(
                            "group relative min-w-0 p-2 text-left align-top transition-colors bg-white flex flex-col justify-between cursor-pointer hover:bg-slate-50/40",
                            !isLastRow && "border-b border-slate-200/80",
                            !isLastCol ? "border-r border-slate-200/80" : "xl:border-r-0 border-r border-slate-200/80",
                            !day.isCurrentMonth && "bg-slate-50/50 text-slate-300",
                            isNonWorkingDay && "bg-slate-100/75 hover:bg-slate-100",
                            isCompensatoryWorkday && "bg-emerald-50/35",
                            isSelected && "bg-blue-50/40 ring-1 ring-inset ring-blue-300",
                          )}
                        >
                          {holiday && (
                            <div className="pointer-events-none absolute inset-0 flex select-none flex-col items-center justify-center overflow-hidden px-3 text-center" aria-hidden="true">
                              <span className={cn(
                                "text-sm font-black uppercase tracking-[0.12em] sm:text-base",
                                isCompensatoryWorkday ? "text-emerald-200/70" : "text-slate-300/70",
                              )}>{isCompensatoryWorkday ? "Làm bù" : "Nghỉ lễ"}</span>
                              <span className={cn(
                                "mt-1 line-clamp-2 text-[9px] font-semibold leading-3",
                                isCompensatoryWorkday ? "text-emerald-300/80" : "text-slate-300/90",
                              )}>{holiday.name}</span>
                            </div>
                          )}

                          {/* Top: Event Pills */}
                          <div className="relative z-10 space-y-1 w-full min-w-0">
                            {shown.map((entry, idx) => {
                              const avatarInfo = getEntryAvatarInfo(entry)

                              return (
                                <div
                                  key={entry.id || `shown-${entry.date}-${idx}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (entry.request) openTask(entry.request.request_id)
                                    else setDetailEntry(entry)
                                  }}
                                  className={cn(
                                    "flex min-w-0 items-center justify-between gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all shadow-2xs hover:shadow-xs",
                                    ENTRY_META[entry.type].color
                                  )}
                                  style={entry.accentColor ? { borderColor: colorWithAlpha(entry.accentColor, "40"), backgroundColor: colorWithAlpha(entry.accentColor, "12"), color: entry.accentColor } : undefined}
                                  title={`${entry.label}: ${entry.title}`}
                                >
                                  <div className="flex min-w-0 items-center gap-1.5">
                                    {entry.attachments?.[0] ? (
                                      <EventThumbnailImage attachment={entry.attachments[0]} className="h-4 w-4 shrink-0 rounded object-cover ring-1 ring-black/5" />
                                    ) : (
                                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", !entry.accentColor && ENTRY_META[entry.type].dot)} style={entry.accentColor ? { backgroundColor: entry.accentColor } : undefined} />
                                    )}
                                    <span className="truncate">{entry.time && `${entry.time} · `}{entry.title}</span>
                                  </div>
                                  <UserAvatar
                                    name={avatarInfo.name}
                                    avatarUrl={avatarInfo.avatarUrl}
                                    size="xs"
                                    className="h-3.5 w-3.5 text-[7px] shrink-0 rounded-full ring-1 ring-black/5"
                                  />
                                </div>
                              )
                            })}
                          </div>

                          {/* Bottom: Overflow on Left, Day Number on Right (Roster HR style) */}
                          <div className="relative z-10 mt-2 flex items-center justify-between pt-1">
                            {dayEntries.length > maxVisible ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedDate(day.dateYMD)
                                }}
                                className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                              >
                                +{dayEntries.length - maxVisible} more
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openAddEvent(day.dateYMD)
                                }}
                                className="h-5 w-5 rounded text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center"
                                title="Thêm lịch vào ngày này"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {day.isToday ? (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white shadow-xs">
                                {day.dayNumber}
                              </span>
                            ) : isSelected ? (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white shadow-xs">
                                {day.dayNumber}
                              </span>
                            ) : (
                              <span className={cn(
                                "text-xs font-semibold select-none pr-1",
                                day.isCurrentMonth ? "text-slate-700" : "text-slate-300 font-normal"
                              )}>
                                {day.dayNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* VIEW 2: WEEK VIEW (Roster HR layout) */}
              {view === "week" && (
                <div className="flex-1 flex flex-col h-full">
                  {/* Day Header Row */}
                  <div className="flex border-b border-slate-200/80 bg-white">
                    <div className="w-14 sm:w-16 shrink-0 border-r border-slate-200/80" />
                    <div className="grid grid-cols-7 flex-1">
                      {weekDays.map((day) => {
                        const isToday = day.dateYMD === todayYMD
                        const isSelected = selectedDate === day.dateYMD
                        return (
                          <div
                            key={day.dateYMD}
                            onClick={() => setSelectedDate(day.dateYMD)}
                            className={cn(
                              "py-2.5 px-2 text-center border-r border-slate-200/80 cursor-pointer transition-colors hover:bg-slate-50/80",
                              isSelected && "bg-blue-50/40"
                            )}
                          >
                            <span className="text-xs font-medium text-slate-500">{day.dayNameEn}</span>
                            <div className="mt-0.5 flex items-center justify-center">
                              <span className={cn(
                                "text-xs font-semibold h-6 w-6 flex items-center justify-center rounded-full transition-colors",
                                isToday ? "bg-slate-950 text-white shadow-xs" : isSelected ? "bg-blue-600 text-white" : "text-slate-800"
                              )}>
                                {day.dayNumber}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* All-day Section */}
                  <div className="flex border-b border-slate-200/80 bg-slate-50/30 min-h-[46px]">
                    <div className="w-14 sm:w-16 shrink-0 border-r border-slate-200/80 px-2 py-2 text-right text-[11px] font-medium text-slate-400 select-none flex items-center justify-end">
                      All day
                    </div>
                    <div className="grid grid-cols-7 flex-1 divide-x divide-slate-200/80 p-1">
                      {weekDays.map((day) => {
                        const dayEntries = entriesByDate.get(day.dateYMD) || []
                        const allDayList = dayEntries.filter((e) => e.type === "leave" || e.type === "deadline" || !e.time || e.time.toLowerCase().includes("cả ngày"))

                        return (
                          <div key={day.dateYMD} className="px-1 py-0.5 space-y-1 min-h-[36px]">
                            {allDayList.map((entry, idx) => {
                              const avatarInfo = getEntryAvatarInfo(entry)
                              return (
                                <div
                                  key={entry.id || `allday-${entry.date}-${idx}`}
                                  onClick={() => {
                                    if (entry.request) openTask(entry.request.request_id)
                                    else setDetailEntry(entry)
                                  }}
                                  className={cn(
                                    "flex items-center justify-between gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium shadow-2xs hover:shadow-xs transition-all cursor-pointer",
                                    ENTRY_META[entry.type].color
                                  )}
                                  title={`${entry.label}: ${entry.title}`}
                                >
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", !entry.accentColor && ENTRY_META[entry.type].dot)} />
                                    <span className="truncate">{entry.title}</span>
                                  </div>
                                  <UserAvatar name={avatarInfo.name} avatarUrl={avatarInfo.avatarUrl} size="xs" className="h-3 w-3 text-[6px] shrink-0 rounded-full" />
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Hourly Time Grid */}
                  <div className="flex flex-1 overflow-y-auto relative bg-white min-h-[500px]">
                    {/* Time gutter on left */}
                    <div className="w-14 sm:w-16 shrink-0 border-r border-slate-200/80 bg-white select-none">
                      {WEEK_HOURS.map((hour) => (
                        <div key={hour} className="h-16 text-right pr-2 text-[11px] font-medium text-slate-400 -mt-2.5">
                          {formatHourDisplay(hour)}
                        </div>
                      ))}
                    </div>

                    {/* 7 Columns */}
                    <div className="grid grid-cols-7 flex-1 relative divide-x divide-slate-200/80 bg-white">
                      {/* Background horizontal hour lines */}
                      <div className="absolute inset-0 pointer-events-none">
                        {WEEK_HOURS.map((hour) => (
                          <div key={hour} className="h-16 border-b border-slate-100" />
                        ))}
                      </div>

                      {/* Day Columns */}
                      {weekDays.map((day) => {
                        const dayEntries = entriesByDate.get(day.dateYMD) || []
                        const timedList = dayEntries.filter((e) => !(e.type === "leave" || e.type === "deadline" || !e.time || e.time.toLowerCase().includes("cả ngày")))

                        return (
                          <div
                            key={day.dateYMD}
                            onDoubleClick={() => openAddEvent(day.dateYMD)}
                            className="relative"
                            style={{ height: `${WEEK_HOURS.length * 64}px` }}
                          >
                            {timedList.map((entry, idx) => {
                              const timeMatch = entry.time?.match(/(\d{1,2}):(\d{2})/)
                              const startHour = timeMatch ? parseInt(timeMatch[1], 10) : 9
                              const startMinute = timeMatch ? parseInt(timeMatch[2], 10) : 0
                              const endMatch = entry.endTime?.match(/(\d{1,2}):(\d{2})/)
                              let durationMinutes = 60
                              if (endMatch) {
                                const endHour = parseInt(endMatch[1], 10)
                                const endMinute = parseInt(endMatch[2], 10)
                                durationMinutes = Math.max(30, (endHour * 60 + endMinute) - (startHour * 60 + startMinute))
                              }
                              const topPixels = Math.max(0, ((startHour - WEEK_START_HOUR) * 60 + startMinute) * (64 / 60))
                              const heightPixels = Math.max(40, (durationMinutes / 60) * 64)
                              const avatarInfo = getEntryAvatarInfo(entry)

                              return (
                                <div
                                  key={entry.id || `timed-${entry.date}-${idx}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (entry.request) openTask(entry.request.request_id)
                                    else setDetailEntry(entry)
                                  }}
                                  style={{
                                    top: `${topPixels}px`,
                                    height: `${heightPixels}px`,
                                    ...(entry.accentColor ? { borderColor: colorWithAlpha(entry.accentColor, "50"), backgroundColor: colorWithAlpha(entry.accentColor, "18"), color: entry.accentColor } : {}),
                                  }}
                                  className={cn(
                                    "absolute left-1 right-1 z-10 rounded-md border p-1 sm:p-1.5 text-left text-xs shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between cursor-pointer",
                                    !entry.accentColor && ENTRY_META[entry.type].color
                                  )}
                                  title={`${entry.time} · ${entry.title}`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", !entry.accentColor && ENTRY_META[entry.type].dot)} style={entry.accentColor ? { backgroundColor: entry.accentColor } : undefined} />
                                      <span className="text-[10px] font-semibold text-slate-500 truncate">{entry.time}{entry.endTime ? ` - ${entry.endTime}` : ""}</span>
                                    </div>
                                    <UserAvatar name={avatarInfo.name} avatarUrl={avatarInfo.avatarUrl} size="xs" className="h-3.5 w-3.5 text-[7px] shrink-0" />
                                  </div>
                                  <p className="font-semibold text-[11px] leading-tight truncate text-slate-900 mt-0.5">{entry.title}</p>
                                  {entry.location && <p className="text-[9px] text-slate-500 truncate mt-auto">{entry.location}</p>}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 3: AGENDA VIEW (Roster HR style) */}
              {view === "agenda" && (
                <div className="flex-1 divide-y divide-slate-100 bg-white min-h-[500px]">
                  {agendaDays.length === 0 ? (
                    <div className="py-20 text-center">
                      <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-3 text-sm font-semibold text-slate-600">Không có lịch trong khoảng thời gian này</p>
                      <p className="mt-1 text-xs text-slate-400">Bấm "+ Thêm lịch" để thêm sự kiện hoặc cuộc họp mới.</p>
                    </div>
                  ) : (
                    agendaDays.map((dayGroup) => (
                      <div key={dayGroup.dateYMD} className="divide-y divide-slate-100">
                        {/* Day Group Header */}
                        <div className="flex items-center justify-between bg-slate-50/80 px-4 sm:px-6 py-2.5 border-y border-slate-200/80">
                          <span className="text-sm font-bold text-slate-900">{dayGroup.dayNameVi}</span>
                          <span className="text-xs font-medium text-slate-500">{formatDateLong(dayGroup.date)}</span>
                        </div>
                        {/* Day Entries */}
                        {dayGroup.entries.map((entry, idx) => {
                          const avatarInfo = getEntryAvatarInfo(entry)
                          return (
                            <div
                              key={entry.id || `agenda-${dayGroup.dateYMD}-${idx}`}
                              onClick={() => {
                                if (entry.request) openTask(entry.request.request_id)
                                else setDetailEntry(entry)
                              }}
                              className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                            >
                              <div className="w-28 sm:w-44 shrink-0 text-xs font-medium text-slate-500">
                                {entry.time || "Cả ngày"}
                                {entry.endTime && ` – ${entry.endTime}`}
                              </div>
                              <div className="flex-1 min-w-0 flex items-center gap-2.5">
                                <span className={cn("h-2 w-2 rounded-full shrink-0", !entry.accentColor && ENTRY_META[entry.type].dot)} style={entry.accentColor ? { backgroundColor: entry.accentColor } : undefined} />
                                <span className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                  {entry.title}
                                </span>
                                <span className={cn("hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0", ENTRY_META[entry.type].color)}>
                                  {entry.label}
                                </span>
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                <UserAvatar
                                  name={avatarInfo.name}
                                  avatarUrl={avatarInfo.avatarUrl}
                                  size="xs"
                                  className="h-5 w-5 text-[9px]"
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))
                  )}
                </div>
              )}
              </div>
            </div>

            {/* Right Column: Task Sidebar (Height matches left calendar, scrolls internally on overflow) */}
            <aside
              style={calendarHeight ? { maxHeight: `${calendarHeight}px`, height: `${calendarHeight}px` } : undefined}
              className="relative min-w-0 border-t xl:border-t-0 xl:border-l border-slate-200/80 bg-slate-50/40 flex flex-col"
            >
              <div className="xl:absolute xl:inset-0 xl:overflow-y-auto divide-y divide-slate-200/80 flex flex-col">
                {/* 1. Ưu tiên cao trong tuần */}
                <div className="p-4 sm:p-5 flex flex-col">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Flag className="h-3.5 w-3.5 text-rose-500" />
                      Ưu tiên cao trong tuần
                    </h3>
                    <span className="text-[10px] text-slate-400">{formatShortDate(weekStart)}–{formatShortDate(weekEnd)}</span>
                  </div>
                  <div className="space-y-2">
                    {priorityThisWeek.length === 0 ? (
                      <div className="rounded-xl bg-white p-3.5 text-xs text-slate-500 text-center border border-slate-200/60">
                        Không có task Lv1/Lv2 trong tuần.
                      </div>
                    ) : priorityThisWeek.map((task, idx) => (
                      <button
                        key={task.request_id || `priority-${idx}`}
                        onClick={() => openTask(task.request_id)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-slate-300 hover:shadow-xs transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <PriorityBadge priority={task.priority} size="xs" />
                          <span className="text-[10px] text-slate-400">{formatShortDate(getTaskDateForWeek(task))}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-800">
                          {getRequestDisplayTitle(task)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Task hôm nay / Ngày đang chọn */}
                <div className="p-4 sm:p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {selectedDate === todayYMD ? "Task hôm nay" : "Ngày đang chọn"}
                      </p>
                      <h3 className="mt-0.5 text-sm font-bold capitalize text-slate-950">{selectedDateLabel}</h3>
                    </div>
                    <Button variant="outline" size="xs" onClick={() => openAddEvent(selectedDate)}>
                      <Plus className="h-3 w-3" />
                      Thêm việc
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {selectedEntries.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center flex flex-col items-center justify-center">
                        <CalendarDays className="h-5 w-5 text-slate-300" />
                        <p className="mt-1.5 text-xs font-medium text-slate-500">Chưa có lịch trong ngày này</p>
                      </div>
                    ) : selectedEntries.map((entry, idx) => (
                      <div
                        key={entry.id || `selected-entry-${entry.date || selectedDate}-${idx}`}
                        className="flex w-full items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-slate-300 hover:shadow-xs"
                      >
                        {entry.attachments?.[0] ? (
                          <EventThumbnailImage attachment={entry.attachments[0]} className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
                        ) : (
                          <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", !entry.accentColor && entry.color)} style={entry.accentColor ? { backgroundColor: entry.accentColor } : undefined} />
                        )}
                        <button onClick={() => entry.request ? openTask(entry.request.request_id) : setDetailEntry(entry)} className="min-w-0 flex-1 text-left">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{entry.label}{entry.time ? ` · ${entry.time}` : ""}</span>
                          <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-800 line-clamp-2">{entry.title}</span>
                          {entry.location && (
                            <span className="mt-1 flex min-w-0 items-center gap-1 text-[10px] text-slate-500">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{getMeetingLinkMeta(entry.location)?.label || entry.location}</span>
                            </span>
                          )}
                        </button>
                        {entry.request && entry.type === "planned" && (
                          <button onClick={() => openSchedule(entry.request!, selectedDate)} className="text-[10px] font-semibold text-blue-600 hover:underline shrink-0">
                            Đổi ngày
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Chưa xếp lịch */}
                <div className="p-4 sm:p-5 flex flex-col">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Clock3 className="h-3.5 w-3.5 text-amber-500" />
                      Chưa xếp lịch
                    </h3>
                    <Badge variant="warning" size="xs">{unscheduledTasks.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {unscheduledTasks.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs font-medium text-emerald-700">
                        <Check className="h-3.5 w-3.5 shrink-0" />
                        Tất cả công việc đã có kế hoạch.
                      </div>
                    ) : unscheduledTasks.map((task, idx) => (
                      <div key={task.request_id || `unscheduled-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-300 transition-colors shadow-2xs">
                        <button onClick={() => openTask(task.request_id)} className="line-clamp-2 w-full text-left text-xs font-semibold leading-5 text-slate-800 hover:text-blue-600 transition-colors">
                          {getRequestDisplayTitle(task)}
                        </button>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <StatusPill status={task.status} size="xs" />
                          <button onClick={() => openSchedule(task)} className="text-[10px] font-bold text-blue-600 hover:text-blue-700">
                            + Xếp ngày
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
              </motion.section>

              {/* ROW 3: Notifications Section */}
              <motion.section
                variants={cascadeWaveItemVariants}
                custom={2}
                layout="position"
                className="rounded-2xl border border-slate-200/80 bg-white shadow-xs"
              >
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-950"><Bell className="h-4 w-4 text-blue-600" />Cập nhật liên quan đến bạn</h2>
              <p className="mt-0.5 text-xs text-slate-500">Feedback, công việc mới, thay đổi lịch và kết quả phê duyệt</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button onClick={() => setNotificationFilter("unread")} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", notificationFilter === "unread" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500")}>Chưa đọc</button>
                <button onClick={() => setNotificationFilter("all")} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", notificationFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500")}>Tất cả</button>
              </div>
              <Button variant="ghost" size="xs" onClick={markRelevantAsRead}>Đánh dấu đã đọc</Button>
            </div>
          </div>
          <motion.div variants={cascadeWaveContainerVariants} initial="hidden" animate="visible" className="divide-y divide-slate-100">
            {shownNotifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Check className="mx-auto h-5 w-5 text-emerald-500" />
                <p className="mt-2 text-sm font-semibold text-slate-700">Bạn đã xem hết cập nhật</p>
                <p className="mt-1 text-xs text-slate-400">Thông báo mới liên quan đến task của bạn sẽ xuất hiện tại đây.</p>
              </div>
            ) : shownNotifications.slice(0, 10).map((notification, idx) => (
              <motion.button
                variants={cascadeWaveItemVariants}
                custom={3}
                key={notification.id || `notif-${idx}`}
                onClick={() => {
                  markAsRead(notification.id)
                  if (notification.requestId) openTask(notification.requestId)
                }}
                className={cn("flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50", !notification.read && "bg-blue-50/30")}
              >
                <span className={cn("mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", !notification.read ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500")}><Bell className="h-3.5 w-3.5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><span className="truncate text-xs font-bold text-slate-900">{notification.title}</span>{!notification.read && <Circle className="h-2 w-2 fill-blue-600 text-blue-600" />}</span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">{notification.message}</span>
                </span>
                <span className="shrink-0 text-[10px] text-slate-400">{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(notification.timestamp))}</span>
              </motion.button>
            ))}
          </motion.div>
        </motion.section>
      </motion.div>
    )}
  </AnimatePresence>
</div>

      <RightSheet
        open={Boolean(scheduleTask)}
        onClose={() => setScheduleTask(null)}
        size="sm"
        title="Xếp ngày dự kiến làm"
        description="Deadline cam kết không thay đổi."
        icon={<CalendarDays className="h-4 w-4" />}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setScheduleTask(null)}>Hủy</Button>
            <Button onClick={saveSchedule} disabled={!scheduleDate}>Hoàn tất</Button>
          </div>
        )}
      >
        <div className="space-y-4 p-5 sm:p-6">
          <div className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">{scheduleTask && getRequestDisplayTitle(scheduleTask)}</div>
          <label className="block text-xs font-semibold text-slate-700">Ngày dự kiến làm
            <input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          {scheduleTask && <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><span>Deadline cam kết</span><strong>{formatShortDate(getTaskDeadline(scheduleTask))}</strong></div>}
        </div>
      </RightSheet>

      {/* Executive Summary Slide-Over Sheet */}
      <RightSheet
        open={isBriefingExpanded}
        onClose={() => setIsBriefingExpanded(false)}
        size="lg"
        title="Bản tin điều hành UX (Executive Summary)"
        description={`Cập nhật tuần ${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)} · Trọng tâm ${dominantPhaseText}`}
        icon={<img src="/ai-default.png" alt="AI" className="h-5 w-5 object-contain" />}
        bodyClassName="overflow-y-auto bg-slate-50/50 p-0"
        footer={(
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyExecutiveSummary}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                {copiedSummary ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-neutral-500" />}
                <span>{copiedSummary ? "Đã sao chép" : "Sao chép tóm tắt"}</span>
              </button>
              <button
                type="button"
                onClick={handleRefreshBriefing}
                disabled={isAiRefreshing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className={cn("h-3.5 w-3.5 text-purple-600", isAiRefreshing && "animate-spin")} />
                <span>{isAiRefreshing ? "Đang quét & đọc..." : "Tóm tắt lại"}</span>
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBriefingExpanded(false)}
              className="h-9 px-5 text-sm font-semibold"
            >
              Đóng
            </Button>
          </div>
        )}
      >
        <div className="p-6 sm:p-7 space-y-6">
          {/* Top highlight card */}
          <div className="rounded-2xl border border-purple-200/70 bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/40 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-100/80 px-2 py-0.5 text-xs font-bold text-purple-700 border border-purple-200/60">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                Định hướng điều hành tuần
              </span>
              <span className="text-[11px] text-purple-600/80 font-semibold bg-white/80 px-2 py-0.5 rounded-md border border-purple-100">
                UXTeamMB Intelligence
              </span>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-slate-800">
              {/* BLOCK 1: HÔM NAY */}
              <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-900 text-xs sm:text-sm">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>Tiêu điểm hôm nay ({formatShortDate(todayYMD)})</span>
                </div>
                <div className="space-y-1.5 text-xs sm:text-[13px] text-neutral-800 leading-relaxed">
                  {newAssignedTasks.length > 0 && (
                    <p>
                      🔔 Bạn có <strong className="text-rose-950 font-bold">{newAssignedTasks.length} bài toán mới</strong> cần tiếp nhận:{" "}
                      {newAssignedTasks.slice(0, 4).map((task, idx) => (
                        <React.Fragment key={task.request_id || `sheet-new-${idx}`}>
                          <ClickUpTaskChip task={task} onOpenTask={(id) => { setIsBriefingExpanded(false); openTask(id); }} />
                          {idx < Math.min(newAssignedTasks.length, 4) - 1 ? ", " : ""}
                        </React.Fragment>
                      ))}
                      {newAssignedTasks.length > 4 ? ` và ${newAssignedTasks.length - 4} task khác.` : "."}
                    </p>
                  )}

                  {overdueTasks.length > 0 ? (
                    <p className="text-rose-900 font-medium">
                      ⚠️ Cần cứu hạn <strong className="font-bold">{overdueTasks.length} task trễ hạn</strong>:{" "}
                      {overdueTasks.slice(0, 3).map((task, idx) => (
                        <React.Fragment key={task.request_id || `sheet-overdue-${idx}`}>
                          <ClickUpTaskChip task={task} onOpenTask={(id) => { setIsBriefingExpanded(false); openTask(id); }} />
                          {idx < Math.min(overdueTasks.length, 3) - 1 ? ", " : ""}
                        </React.Fragment>
                      ))}
                      {dueTodayTasks.length > 0 ? ` cùng ${dueTodayTasks.length} task chạm hạn hôm nay.` : "."}
                    </p>
                  ) : dueTodayTasks.length > 0 ? (
                    <p className="text-amber-900 font-medium">
                      ⏰ Hôm nay là hạn chót của{" "}
                      {dueTodayTasks.map((task, idx) => (
                        <React.Fragment key={task.request_id || `sheet-due-${idx}`}>
                          <ClickUpTaskChip task={task} onOpenTask={(id) => { setIsBriefingExpanded(false); openTask(id); }} />
                          {idx < dueTodayTasks.length - 1 ? ", " : "."}
                        </React.Fragment>
                      ))}
                    </p>
                  ) : null}

                  {plannedTodayTasks.length > 0 && (
                    <p>
                      📌 Việc dự kiến làm hôm nay:{" "}
                      {plannedTodayTasks.slice(0, 4).map((task, idx) => (
                        <React.Fragment key={task.request_id || `sheet-plan-${idx}`}>
                          <ClickUpTaskChip task={task} onOpenTask={(id) => { setIsBriefingExpanded(false); openTask(id); }} />
                          {idx < Math.min(plannedTodayTasks.length, 4) - 1 ? ", " : "."}
                        </React.Fragment>
                      ))}
                    </p>
                  )}

                  {todayEvents.length > 0 ? (
                    <p>
                      📅 Lịch làm việc hôm nay: Có <strong className="text-neutral-900 font-bold">{todayEvents.length} lịch hẹn/họp</strong>:{" "}
                      {todayEvents.map((ev, idx) => (
                        <React.Fragment key={ev.id || `sheet-ev-${idx}`}>
                          <CalendarEventChip entry={ev} onOpenEvent={(entry) => { setIsBriefingExpanded(false); setDetailEntry(entry); }} />
                          {idx < todayEvents.length - 1 ? ", " : "."}
                        </React.Fragment>
                      ))}
                    </p>
                  ) : (
                    <p className="text-neutral-500 italic text-xs">
                      📅 Hôm nay không có cuộc họp cố định — thời gian lý tưởng để bạn tập trung hoàn thành các file thiết kế chuyên sâu (Deep Work).
                    </p>
                  )}

                  {todayPersonalLeaves.length > 0 && (
                    <p className="text-amber-800">
                      🏖️ Lưu ý: Bạn có lịch nghỉ phép ({todayPersonalLeaves.map((l) => l.title).join(", ")}) hôm nay.
                    </p>
                  )}
                </div>
              </div>

              {/* BLOCK 2: TUẦN NÀY & GO-LIVE */}
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-900 text-xs sm:text-sm">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span>Toàn cảnh tuần &amp; Cột mốc Go-Live</span>
                </div>
                <div className="space-y-1.5 text-xs sm:text-[13px] text-neutral-800 leading-relaxed">
                  {activeTasks.length > 0 ? (
                    <p>
                      Bạn đang phụ trách <strong>{activeTasks.length} bài toán</strong>, trọng tâm dồn vào{" "}
                      <strong className="text-blue-950 font-semibold">{dominantPhaseText}</strong>
                      {focusSummaryText ? `. Hướng đến ${focusSummaryText}.` : "."}
                    </p>
                  ) : (
                    <p className="text-slate-500">
                      Hiện tại bạn chưa có bài toán nào đang thực hiện hoặc theo dõi.
                    </p>
                  )}

                  {goLiveTasks.length > 0 ? (
                    <div className="rounded-lg border border-blue-300 bg-white p-2.5 text-blue-950 font-medium shadow-2xs">
                      🚀 <strong>Mốc Go-Live tuần này:</strong> Bài toán{" "}
                      {goLiveTasks.map((t, idx) => (
                        <React.Fragment key={t.request_id || `sheet-golive-${idx}`}>
                          <ClickUpTaskChip task={t} onOpenTask={(id) => { setIsBriefingExpanded(false); openTask(id); }} />
                          {idx < goLiveTasks.length - 1 ? ", " : ""}
                        </React.Fragment>
                      ))}{" "}
                      dự kiến phát hành trong tuần. Đề nghị bạn rà soát lại specs bàn giao và nhắn PO báo cáo kết quả nghiệm thu UI.
                    </div>
                  ) : poPendingTasks.length > 0 ? (
                    <p className="text-purple-900">
                      ⏳ Có {poPendingTasks.length} bài toán đang chờ PO duyệt:{" "}
                      {poPendingTasks.slice(0, 3).map((t, idx) => (
                        <React.Fragment key={t.request_id || `sheet-popending-${idx}`}>
                          <ClickUpTaskChip task={t} onOpenTask={(id) => { setIsBriefingExpanded(false); openTask(id); }} />
                          {idx < Math.min(poPendingTasks.length, 3) - 1 ? ", " : "."}
                        </React.Fragment>
                      ))}
                    </p>
                  ) : null}

                  {weekEvents.length > 0 && (
                    <p className="text-neutral-600 text-xs">
                      🗓️ Sự kiện tuần: Có {weekEvents.length} lịch làm việc ({weekEvents.slice(0, 4).map((e) => e.title).join(", ")}).
                    </p>
                  )}
                </div>
              </div>

              {/* BLOCK 3: KẾ HOẠCH TIẾP THEO & CẢNH BÁO */}
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-xs sm:text-sm">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span>
                    {isEndOfWeek ? "Kế hoạch tuần sau (Cảnh báo T5 - T6)" : isBeginningOfWeek ? "Định hướng đầu tuần" : "Tiến độ giữa tuần"}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs sm:text-[13px] text-neutral-800 leading-relaxed">
                  {isEndOfWeek ? (
                    <>
                      {nextWeekDeadlines.length > 0 ? (
                        <p>
                          📋 <strong>Đầu tuần tới có {nextWeekDeadlines.length} deadline cam kết:</strong>{" "}
                          {nextWeekDeadlines.slice(0, 4).map((t, idx) => (
                            <React.Fragment key={t.request_id || `sheet-nextweek-${idx}`}>
                              <ClickUpTaskChip task={t} onOpenTask={(id) => { setIsBriefingExpanded(false); openTask(id); }} />
                              {idx < Math.min(nextWeekDeadlines.length, 4) - 1 ? ", " : ""}
                            </React.Fragment>
                          ))}
                          . Hãy chủ động hoàn tất bàn giao specs trước chiều Thứ 6 để không bị dồn việc.
                        </p>
                      ) : (
                        <p>
                          📋 Đầu tuần tới tiến độ các bài toán tương đối thuận lợi, không có deadline gấp.
                        </p>
                      )}

                      {nextWeekEvents.length > 0 && (
                        <p className="text-neutral-600 text-xs">
                          🗓️ Sự kiện tuần sau: Có {nextWeekEvents.length} lịch họp/review ({nextWeekEvents.slice(0, 3).map((e) => `${formatShortDate(e.date)}: ${e.title}`).join("; ")}).
                        </p>
                      )}

                      {unscheduledTasks.length > 0 && (
                        <p className="text-amber-900 text-xs font-medium">
                          💡 Bạn còn {unscheduledTasks.length} bài toán chưa xếp ngày dự kiến làm. Hãy kéo thả xếp ngày trên Planner để chuẩn bị kế hoạch tuần mới.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-neutral-700 italic">
                      💡 {recommendationText}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Phân bổ 4 giai đoạn */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Phân bổ giai đoạn ({activeTasks.length} dự án đang triển khai)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {phaseDistribution.map((item) => {
                const pct = activeTasks.length > 0 ? Math.round((item.count / activeTasks.length) * 100) : 0
                return (
                  <div key={item.key} className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold text-slate-700 truncate">{item.label}</span>
                    </div>
                    <p className="text-xl font-extrabold text-slate-900">{item.count} <span className="text-xs font-medium text-slate-400">task</span></p>
                    <p className="text-[11px] text-slate-400 font-medium">{pct}% tổng tải</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section: Danh sách các task trọng điểm */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Danh sách dự án trọng tâm
              </h4>
              <span className="text-xs text-slate-400 font-medium">{activeTasks.length} bài toán</span>
            </div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
              {activeTasks.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Không có dự án nào đang chạy</div>
              ) : (
                activeTasks.slice(0, 10).map((task) => (
                  <div
                    key={task.request_id}
                    onClick={() => {
                      setIsBriefingExpanded(false)
                      openTask(task.request_id)
                    }}
                    className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-400">{task.request_id}</span>
                        <PriorityBadge priority={task.priority} size="xs" />
                        <span className="text-[10px] font-medium text-slate-500 truncate">{task.product || "App MB"} · {task.squad_name || "UX"}</span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                        {getRequestDisplayTitle(task)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {getTaskPhaseLabel(task)}
                      </span>
                      <span className="block mt-0.5 text-[10px] text-slate-400 font-medium">
                        Hạn: {formatShortDate(getTaskDeadline(task))}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section: Nhật ký AI đã đối soát */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Nhật ký nguồn dữ liệu AI đối soát
            </h4>
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <AgentActivityTrace
                activeTasks={activeTasks}
                summaryProjects={summaryProjects}
                riskProjects={riskProjects}
                goLiveTasks={goLiveTasks}
                dominantPhaseText={dominantPhaseText}
                mode="inspector"
                onOpenTask={(id) => {
                  setIsBriefingExpanded(false)
                  openTask(id)
                }}
              />
            </div>
          </div>
        </div>
      </RightSheet>

      <ScheduleMeetingDialog
        open={eventModalOpen}
        initialDate={eventDate}
        defaultAttendee={defaultMeetingAttendee}
        categories={eventCategories}
        designers={availableMeetingDesigners}
        saving={eventSaving}
        isEditing={Boolean(editingEntry)}
        initialValues={editInitialValues}
        onClose={() => {
          if (!eventSaving) {
            setEventModalOpen(false)
            setEditingEntry(null)
          }
        }}
        onSubmit={savePersonalEvent}
      />

      <RightSheet
        open={Boolean(detailEntry)}
        onClose={() => setDetailEntry(null)}
        size="lg"
        title="Chi tiết sự kiện / Cuộc họp"
        description={detailEntry?.date ? formatDateLong(parseYMD(detailEntry.date)) : "Kế hoạch Designer"}
        icon={<CalendarDays className="h-4 w-4 text-purple-600" />}
        bodyClassName="overflow-y-auto bg-white p-0"
        footer={
          detailEntry ? (
            <div className="flex items-center justify-between w-full">
              {canManageDetailEvent && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const entryToEdit = detailEntry
                      handleOpenEditEvent(entryToEdit)
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Sửa sự kiện</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const rawId = detailEntry.id.replace(/^(personal|team)-/, "")
                      if (window.confirm("Bạn có chắc chắn muốn xóa sự kiện này khỏi lịch?")) {
                        deleteTeamEvent(rawId)
                        setDetailEntry(null)
                        toast.success("Đã xóa sự kiện thành công!")
                        debouncedSilentReload()
                      }
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Xóa sự kiện</span>
                  </button>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDetailEntry(null)}
                className="ml-auto h-9 px-5 text-sm font-semibold"
              >
                Đóng
              </Button>
            </div>
          ) : undefined
        }
      >
        {detailEntry && (
          <div className="min-w-0">
            {/* Top subtle decorative line */}
            <div className="h-1 bg-gradient-to-r from-purple-500/40 via-indigo-500/25 to-blue-500/20" />

            <div className="p-6 sm:p-7 space-y-6">
              {/* Header Hero: Tối ưu chuẩn cho ảnh poster/thumbnail tỉ lệ 224x259 */}
              {detailEntry.attachments?.[0] ? (
                <div className="flex flex-col sm:flex-row items-start gap-6 pb-6 border-b border-slate-100">
                  {/* Cột thông tin chi tiết và Bảng thuộc tính bên trái poster */}
                  <div className="flex-1 min-w-0 space-y-4">
                    <div>
                      {detailEntry.recurrence && detailEntry.recurrence !== "none" && (
                        <div className="mb-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200/70">
                            <Repeat2 className="h-3 w-3" />
                            <span>{detailEntry.recurrence === "daily" ? "Hàng ngày" : detailEntry.recurrence === "weekly" ? "Hàng tuần" : "Hàng tháng"}</span>
                          </span>
                        </div>
                      )}

                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 leading-snug">
                        {detailEntry.title}
                      </h1>
                    </div>

                    {/* Notion Properties Table */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-2.5 text-sm">
                      {/* Thuộc tính: Thời gian */}
                      <div className="flex items-center min-h-[32px] px-2 -mx-2 rounded-md hover:bg-slate-100/60 transition-colors">
                        <div className="flex items-center gap-2.5 w-32 sm:w-36 shrink-0 text-slate-500 font-medium">
                          <Clock3 className="h-4 w-4 text-slate-400" />
                          <span>Thời gian</span>
                        </div>
                        <div className="flex-1 min-w-0 font-medium text-slate-900 flex items-center gap-2">
                          <span className="truncate">{detailEntry.date && formatDateLong(parseYMD(detailEntry.date))}</span>
                          {detailEntry.time && (
                            <span className="shrink-0 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800 shadow-2xs">
                              {detailEntry.time}{detailEntry.endTime ? ` – ${detailEntry.endTime}` : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Thuộc tính: Phân loại */}
                      <div className="flex items-center min-h-[32px] px-2 -mx-2 rounded-md hover:bg-slate-100/60 transition-colors">
                        <div className="flex items-center gap-2.5 w-32 sm:w-36 shrink-0 text-slate-500 font-medium">
                          <Tag className="h-4 w-4 text-slate-400" />
                          <span>Phân loại</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border",
                              ENTRY_META[detailEntry.type]?.color || "bg-purple-50 text-purple-700 border-purple-200/80"
                            )}
                          >
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full shrink-0",
                                ENTRY_META[detailEntry.type]?.dot || "bg-purple-500"
                              )}
                            />
                            <span>{detailEntry.label}</span>
                          </span>
                        </div>
                      </div>

                      {/* Thuộc tính: Người tham gia */}
                      {detailEntry.attendees && detailEntry.attendees.length > 0 && (
                        <div className="flex items-center min-h-[32px] py-1 px-2 -mx-2 rounded-md hover:bg-slate-100/60 transition-colors">
                          <div className="flex items-center gap-2.5 w-32 sm:w-36 shrink-0 text-slate-500 font-medium">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span>Tham gia ({detailEntry.attendees.length})</span>
                          </div>
                          <div className="flex-1 relative flex items-center gap-2 min-w-0">
                            <div className="relative inline-flex items-center gap-2 group">
                              <CAvatar29
                                totalCount={detailEntry.attendees.length}
                                showAddButton={false}
                                className="cursor-pointer"
                              >
                                {detailEntry.attendees.slice(0, 5).map((att, idx) => {
                                  const user = getAttendeeDisplay(att, availableMeetingDesigners)
                                  const initials = getUserInitials(user.name)
                                  const colorClass = getAvatarColorClass(user.name)
                                  return (
                                    <Avatar key={`att-av-${user.name}-${idx}`} className="size-7 ring-2 ring-white">
                                      {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                                      <AvatarFallback className={colorClass}>
                                        {initials}
                                      </AvatarFallback>
                                    </Avatar>
                                  )
                                })}
                              </CAvatar29>

                              {/* Hover Tooltip Toast hiển thị danh sách người tham gia */}
                              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col z-50 min-w-[220px] max-w-[280px] p-2.5 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-slate-800 pointer-events-none">
                                <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-800">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Người tham gia
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                    {detailEntry.attendees.length} thành viên
                                  </span>
                                </div>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                                  {detailEntry.attendees.map((att, idx) => {
                                    const user = getAttendeeDisplay(att, availableMeetingDesigners)
                                    return (
                                      <div key={`hov-att-${att}-${idx}`} className="flex items-center gap-2">
                                        <UserAvatar name={user.name} avatarUrl={user.avatar} size="xs" />
                                        <div className="min-w-0 flex-1">
                                          <p className="font-semibold text-white truncate text-[11px]">{user.name}</p>
                                          <p className="text-[9.5px] text-slate-400 truncate">
                                            {user.email || "Thành viên"}
                                          </p>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Thuộc tính: Địa điểm / Link họp */}
                      {detailEntry.location && (() => {
                        const link = getMeetingLinkMeta(detailEntry.location)
                        return (
                          <div className="flex items-center min-h-[32px] px-2 -mx-2 rounded-md hover:bg-slate-100/60 transition-colors">
                            <div className="flex items-center gap-2.5 w-32 sm:w-36 shrink-0 text-slate-500 font-medium">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              <span>Địa điểm</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              {link ? (
                                <a
                                  href={link.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                                >
                                  <Video className="h-3.5 w-3.5" />
                                  <span className="truncate">{link.label}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-slate-800 font-medium text-sm truncate">{detailEntry.location}</span>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Thumbnail Card bên phải: giữ nguyên tỉ lệ 224x259 */}
                  <div className="relative shrink-0 w-full sm:w-[190px] md:w-[214px] aspect-[224/259] rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-50 shadow-md group">
                    <EventThumbnailImage
                      attachment={detailEntry.attachments[0]}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                      <span className="text-[10px] font-semibold tracking-wider text-white/90">224 × 259</span>
                      <button
                        type="button"
                        onClick={() => setLightboxImage(detailEntry.attachments![0])}
                        className="inline-flex items-center gap-1 rounded-md bg-white/95 backdrop-blur-xs px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow hover:bg-white transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Xem lớn</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Header layout khi không có thumbnail */
                <div className="space-y-4 pb-6 border-b border-slate-100">
                  <div>
                    {detailEntry.recurrence && detailEntry.recurrence !== "none" && (
                      <div className="mb-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200/70">
                          <Repeat2 className="h-3 w-3" />
                          <span>{detailEntry.recurrence === "daily" ? "Hàng ngày" : detailEntry.recurrence === "weekly" ? "Hàng tuần" : "Hàng tháng"}</span>
                        </span>
                      </div>
                    )}

                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 leading-snug">
                      {detailEntry.title}
                    </h1>
                  </div>

                  {/* Notion Properties Table Full Width */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5 space-y-3 text-sm">
                    {/* Thuộc tính: Thời gian */}
                    <div className="flex items-center min-h-[34px] px-2.5 -mx-2.5 rounded-lg hover:bg-slate-100/60 transition-colors">
                      <div className="flex items-center gap-2.5 w-36 sm:w-40 shrink-0 text-slate-500 font-medium">
                        <Clock3 className="h-4 w-4 text-slate-400" />
                        <span>Thời gian</span>
                      </div>
                      <div className="flex-1 min-w-0 font-medium text-slate-900 flex items-center gap-2">
                        <span>{detailEntry.date && formatDateLong(parseYMD(detailEntry.date))}</span>
                        {detailEntry.time && (
                          <span className="rounded-md bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800 shadow-2xs">
                            {detailEntry.time}{detailEntry.endTime ? ` – ${detailEntry.endTime}` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Thuộc tính: Phân loại */}
                    <div className="flex items-center min-h-[34px] px-2.5 -mx-2.5 rounded-lg hover:bg-slate-100/60 transition-colors">
                      <div className="flex items-center gap-2.5 w-36 sm:w-40 shrink-0 text-slate-500 font-medium">
                        <Tag className="h-4 w-4 text-slate-400" />
                        <span>Phân loại</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border",
                            ENTRY_META[detailEntry.type]?.color || "bg-purple-50 text-purple-700 border-purple-200/80"
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full shrink-0",
                              ENTRY_META[detailEntry.type]?.dot || "bg-purple-500"
                            )}
                          />
                          <span>{detailEntry.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Thuộc tính: Người tham gia */}
                    {detailEntry.attendees && detailEntry.attendees.length > 0 && (
                      <div className="flex items-center min-h-[34px] py-1 px-2.5 -mx-2.5 rounded-lg hover:bg-slate-100/60 transition-colors">
                        <div className="flex items-center gap-2.5 w-36 sm:w-40 shrink-0 text-slate-500 font-medium">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span>Tham gia ({detailEntry.attendees.length})</span>
                        </div>
                        <div className="flex-1 relative flex items-center gap-2 min-w-0">
                          <div className="relative inline-flex items-center gap-2 group">
                            <CAvatar29
                              totalCount={detailEntry.attendees.length}
                              showAddButton={false}
                              className="cursor-pointer"
                            >
                              {detailEntry.attendees.slice(0, 5).map((att, idx) => {
                                const user = getAttendeeDisplay(att, availableMeetingDesigners)
                                const initials = getUserInitials(user.name)
                                const colorClass = getAvatarColorClass(user.name)
                                return (
                                  <Avatar key={`att-av2-${user.name}-${idx}`} className="size-7 ring-2 ring-white">
                                    {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                                    <AvatarFallback className={colorClass}>
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>
                                )
                              })}
                            </CAvatar29>

                            {/* Hover Tooltip Toast hiển thị danh sách người tham gia */}
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col z-50 min-w-[220px] max-w-[280px] p-2.5 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-slate-800 pointer-events-none">
                              <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-800">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Người tham gia
                                </span>
                                <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                  {detailEntry.attendees.length} thành viên
                                </span>
                              </div>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                                {detailEntry.attendees.map((att, idx) => {
                                  const user = getAttendeeDisplay(att, availableMeetingDesigners)
                                  return (
                                    <div key={`hov-att2-${att}-${idx}`} className="flex items-center gap-2">
                                      <UserAvatar name={user.name} avatarUrl={user.avatar} size="xs" />
                                      <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-white truncate text-[11px]">{user.name}</p>
                                        <p className="text-[9.5px] text-slate-400 truncate">
                                          {user.email || "Thành viên"}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Thuộc tính: Địa điểm / Link họp */}
                    {detailEntry.location && (() => {
                      const link = getMeetingLinkMeta(detailEntry.location)
                      return (
                        <div className="flex items-center min-h-[34px] px-2.5 -mx-2.5 rounded-lg hover:bg-slate-100/60 transition-colors">
                          <div className="flex items-center gap-2.5 w-36 sm:w-40 shrink-0 text-slate-500 font-medium">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span>Địa điểm</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            {link ? (
                              <a
                                href={link.href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                              >
                                <Video className="h-4 w-4" />
                                <span className="truncate">{link.label}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-800 font-medium text-sm">
                                <span>{detailEntry.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* Notion Document Content (Nội dung ghi chú & Agenda) */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center gap-2 text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2.5">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span>Nội dung & Agenda cuộc họp</span>
                </div>

                {detailEntry.description ? (
                  <div className="text-base leading-relaxed text-slate-800 whitespace-pre-wrap font-normal">
                    {detailEntry.description}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic py-2">
                    Chưa có nội dung chuẩn bị hoặc agenda cho buổi làm việc này.
                  </p>
                )}
              </div>

              {/* Các tài liệu khác nếu có */}
              {detailEntry.attachments && detailEntry.attachments.length > 1 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Tài liệu khác ({detailEntry.attachments.length - 1})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {detailEntry.attachments.slice(1).map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative aspect-[224/259] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs hover:border-purple-300 transition-colors"
                      >
                        <EventThumbnailImage attachment={att} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 text-white">
                          <p className="truncate text-[10px] font-medium">{att.name}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </RightSheet>

      {/* Lightbox phóng to ảnh thumbnail */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
            onClick={() => setLightboxImage(null)}
          >
            <div
              className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={lightboxImage.url}
                alt={lightboxImage.name || "Thumbnail preview"}
                className="max-h-[85vh] w-auto object-contain"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
      {/* Chi tiết task (Slide-over drawer in-place) */}
      <RequestDetail
        open={Boolean(activeDetailTask)}
        request={activeDetailTask}
        onClose={() => setActiveDetailTask(null)}
        onUpdated={(updatedRequest) => {
          if (updatedRequest) {
            setActiveDetailTask(updatedRequest)
          }
          debouncedSilentReload()
        }}
      />
    </div>
  )
}
