import React, { useState, useMemo, useCallback } from "react"
import { UXRequest } from "@/data/mockData"
import { UserAvatar } from "@/components/common/UserAvatar"
import { toast } from "@/components/ui/toast"
import { getRequestPendingClassification, getStatusConfig, formatPriority } from "@/config/statusConfig"
import { getProductColorDef, getSquadColorDef } from "@/lib/colorUtils"
import { capitalizeFirstLetter } from "@/lib/utils"
import { fetchSingleTaskUpdate } from "@/services/googleSheetService"

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
    const prefix = clean.split("@")[0]
    return prefix.charAt(0).toUpperCase() + prefix.slice(1)
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
  if (name.includes("Cường")) return "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80"
  if (name.includes("Lan")) return "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
  return ""
}

import { motion, AnimatePresence } from "framer-motion"
import { TableRowsSkeleton } from "@/components/common/ReuiSkeletons"
import { EmptyState } from "@/components/reui/empty-state"
import {
  ChevronRight,
  Search,
  X,
  SlidersHorizontal,
  Bell,
  ArrowRight,
  MoreHorizontal,
  Eye,
  Copy,
  Share2,
  CalendarClock,
  Check,
  Plus,
  RefreshCw,
} from "lucide-react"

export interface SolutionAgentsTableProps {
  requests: UXRequest[]
  loading?: boolean
  onSelectRequest: (request: UXRequest) => void
  onNavigateToCreate?: () => void
  hideHeader?: boolean
  onResetFilters?: () => void
  hasActiveFilters?: boolean
}

interface StatusGroupDef {
  id: string
  label: string
  summary: string
  focus: string
  order: number
  dotClass: string
  badgeClass: string
  headerBg?: string
  headerBorderLeft?: string
  labelClass?: string
  countBadgeClass?: string
  match: (r: UXRequest) => boolean
}

export type TaskGroupId = "overload" | "unassigned" | "running" | "pending" | "completed"

export function getTaskGroup(r: UXRequest): TaskGroupId {
  const status = (r.status || "").toLowerCase().trim()
  const progress = typeof r.progress === "number" ? r.progress : 0

  // 1. Hoàn thành
  if (status === "hoàn thành" || status === "done" || progress >= 100) {
    return "completed"
  }

  // 2. Pending (Chờ PO duyệt nghiệm thu / phản hồi)
  if (
    status === "pending" ||
    status === "po pending" ||
    status === "đã gửi po" ||
    status === "chờ duyệt" ||
    status === "chờ phản hồi"
  ) {
    return "pending"
  }

  // 3. Overload (Bị chặn, Quá tải hoặc trễ hạn deadline)
  const isBlocked = status === "bị chặn" || status === "blocked" || status.includes("overload") || status.includes("quá tải")
  const isOverdue = Boolean(r.expected_deadline && new Date(r.expected_deadline).getTime() < Date.now() && status !== "hoàn thành")
  if (isBlocked || isOverdue) {
    return "overload"
  }

  // 4. Chờ phân bổ (Chưa có Designer hoặc khâu tiếp nhận/phân loại)
  const isUnassigned =
    !r.assigned_designer ||
    r.assigned_designer === "Chưa phân công" ||
    r.assigned_designer === "Unassigned" ||
    r.assigned_designer === "Đang phân công" ||
    r.assigned_designer.trim() === ""
  const isTriage =
    status === "đang phân loại" ||
    status === "chờ tiếp nhận" ||
    status === "phân loại" ||
    status === "chờ phân bổ" ||
    status === "chờ xác nhận" ||
    status === "1. chờ xác nhận" ||
    status === "mới tạo" ||
    r.current_phase === "Phân loại" ||
    r.current_phase === "Chờ tiếp nhận" ||
    r.current_phase === "Chờ xác nhận" ||
    r.current_phase === "1. Chờ xác nhận"
  if (isUnassigned || isTriage) {
    return "unassigned"
  }

  // 5. Đang thực hiện (Tất cả các task còn lại)
  return "running"
}

const STATUS_GROUPS: StatusGroupDef[] = [
  {
    id: "overload",
    label: "Overload",
    summary: "Các bài toán quá tải, chậm tiến độ hoặc gặp trở ngại cần xử lý gấp",
    focus: "Cảnh báo",
    order: 1,
    dotClass: "bg-rose-500",
    headerBg: "bg-rose-50/80 hover:bg-rose-100/70 border-rose-200/90",
    headerBorderLeft: "border-l-4 border-l-rose-500",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    labelClass: "text-rose-950 font-bold",
    countBadgeClass: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
    match: (r) => getTaskGroup(r) === "overload",
  },
  {
    id: "unassigned",
    label: "Chờ phân bổ",
    summary: "Bài toán mới tiếp nhận đang chờ rà soát hồ sơ & phân bổ UX Designer",
    focus: "Phân công",
    order: 2,
    dotClass: "bg-purple-600",
    headerBg: "bg-purple-50/80 hover:bg-purple-100/70 border-purple-200/90",
    headerBorderLeft: "border-l-4 border-l-purple-600",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
    labelClass: "text-purple-950 font-bold",
    countBadgeClass: "bg-purple-100 text-purple-800 border-purple-300 font-bold",
    match: (r) => getTaskGroup(r) === "unassigned",
  },
  {
    id: "running",
    label: "Đang thực hiện",
    summary: "Các bài toán đang trong quy trình thiết kế UX & triển khai giải pháp",
    focus: "Tiến độ",
    order: 3,
    dotClass: "bg-[#1057FB]",
    headerBg: "bg-blue-50/80 hover:bg-blue-100/70 border-blue-200/90",
    headerBorderLeft: "border-l-4 border-l-[#1057FB]",
    badgeClass: "bg-blue-100 text-[#1057FB] border-blue-200",
    labelClass: "text-blue-950 font-bold",
    countBadgeClass: "bg-blue-100 text-[#1057FB] border-blue-300 font-bold",
    match: (r) => getTaskGroup(r) === "running",
  },
  {
    id: "pending",
    label: "Pending",
    summary: "Đã gửi phương án thiết kế, đang chờ PO duyệt nghiệm thu hoặc phản hồi",
    focus: "Phê duyệt",
    order: 4,
    dotClass: "bg-amber-500",
    headerBg: "bg-amber-50/80 hover:bg-amber-100/70 border-amber-200/90",
    headerBorderLeft: "border-l-4 border-l-amber-500",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    labelClass: "text-amber-950 font-bold",
    countBadgeClass: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
    match: (r) => getTaskGroup(r) === "pending",
  },
  {
    id: "completed",
    label: "Hoàn thành",
    summary: "Đã nghiệm thu thiết kế và đóng gói bàn giao thành công cho Squad",
    focus: "Nghiệm thu",
    order: 5,
    dotClass: "bg-emerald-600",
    headerBg: "bg-emerald-50/80 hover:bg-emerald-100/70 border-emerald-200/90",
    headerBorderLeft: "border-l-4 border-l-emerald-600",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    labelClass: "text-emerald-950 font-bold",
    countBadgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
    match: (r) => getTaskGroup(r) === "completed",
  },
]

// Helper phân giải Trạng thái / Khâu UX của bài toán theo Cấu hình Quy trình Khâu UX & SLA
export function getTaskPhaseStatus(req: UXRequest): { name: string; progress: number } {
  // 1. Kiểm tra trạng thái pending đặc biệt (PO Pending hoặc Designer Pending)
  const pendingClass = getRequestPendingClassification(req)
  if (pendingClass.isPending && pendingClass.label) {
    return { name: pendingClass.label, progress: typeof req.progress === "number" ? req.progress : 0 }
  }

  // 2. Nếu bài toán hoàn thành
  const rawStatus = (req.status || "").trim().toLowerCase()
  if (rawStatus === "hoàn thành" || rawStatus === "done" || (typeof req.progress === "number" && req.progress >= 100)) {
    return { name: "Hoàn thành", progress: 100 }
  }

  // 3. Nếu bị chặn
  if (rawStatus === "bị chặn" || rawStatus === "blocked") {
    return { name: "Bị chặn", progress: typeof req.progress === "number" ? req.progress : 0 }
  }

  // 4. Nếu có current_phase thì ưu tiên hiển thị tên khâu UX (chuẩn hóa bỏ tiền tố số "1. ", "2. ", v.v.)
  const rawPhase = (req.current_phase || "").trim()
  if (rawPhase) {
    const clean = rawPhase.replace(/^\d+\.\s*/, "").trim()
    if (clean) {
      return { name: clean, progress: typeof req.progress === "number" ? req.progress : 0 }
    }
  }

  // 5. Thử tra cứu từ Cấu hình Quy trình Khâu UX & Tiêu chuẩn SLA (localStorage: mbbank_admin_phases)
  try {
    const saved = localStorage.getItem("mbbank_admin_phases")
    if (saved) {
      const phases: any[] = JSON.parse(saved)
      if (Array.isArray(phases) && phases.length > 0) {
        const pVal = typeof req.progress === "number" ? req.progress : 0
        // Khớp theo tiến độ % mặc định của khâu
        const matched = phases.find((p) => p.defaultProgress === pVal)
        if (matched && matched.name) {
          return { name: matched.name, progress: pVal }
        }
        // Khớp theo tên khâu nằm trong status
        const statusMatch = phases.find((p) => rawStatus.includes(p.name.toLowerCase()))
        if (statusMatch && statusMatch.name) {
          return { name: statusMatch.name, progress: statusMatch.defaultProgress || pVal }
        }
      }
    }
  } catch {}

  // 6. Fallback về status hoặc "Chờ tiếp nhận"
  const finalStatus = req.status || "Chờ tiếp nhận"
  return { name: finalStatus, progress: typeof req.progress === "number" ? req.progress : 0 }
}

export default function SolutionAgentsTable({
  requests,
  loading = false,
  onSelectRequest,
  onNavigateToCreate,
  hideHeader = false,
  onResetFilters,
  hasActiveFilters,
}: SolutionAgentsTableProps) {
  const showContext = true // Latest step line
  const density: "comfortable" | "compact" = "comfortable" // Auto bảng thoáng theo yêu cầu người dùng
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null)

  // Collapsed Groups State (all expanded by default)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    STATUS_GROUPS.forEach((g) => {
      initial[g.id] = true
    })
    return initial
  })

  // Group requests by status group
  const groupedData = useMemo(() => {
    return STATUS_GROUPS.map((group) => {
      const items = requests.filter((r) => group.match(r))
      return {
        ...group,
        items,
        count: items.length,
      }
    })
  }, [requests])

  // Stat counters for footer
  const totalVisible = requests.length

  // Are all groups expanded?
  const allExpanded = useMemo(() => {
    return STATUS_GROUPS.every((g) => expandedGroups[g.id] !== false)
  }, [expandedGroups])

  const toggleAllGroups = useCallback(() => {
    if (allExpanded) {
      const collapsed: Record<string, boolean> = {}
      STATUS_GROUPS.forEach((g) => {
        collapsed[g.id] = false
      })
      setExpandedGroups(collapsed)
    } else {
      const expanded: Record<string, boolean> = {}
      STATUS_GROUPS.forEach((g) => {
        expanded[g.id] = true
      })
      setExpandedGroups(expanded)
    }
  }, [allExpanded])

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }, [])

  // Listen to external toggle event (e.g. from top toolbar "Thu gọn nhóm")
  React.useEffect(() => {
    const handleToggle = () => {
      toggleAllGroups()
    }
    window.addEventListener("toggle-all-table-groups", handleToggle)
    return () => window.removeEventListener("toggle-all-table-groups", handleToggle)
  }, [toggleAllGroups])

  // Format date helper for display (dd/MM/yyyy or dd/MM)
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return "Chưa set"
    try {
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, "0")
        const mm = String(d.getMonth() + 1).padStart(2, "0")
        const yyyy = d.getFullYear()
        return `${dd}/${mm}/${yyyy}`
      }
      if (dateStr.includes("/")) {
        return dateStr
      }
    } catch {}
    return dateStr || "Chưa set"
  }

  const formatDateLabel = (isoDate?: string) => {
    if (!isoDate) return "Gần đây"
    try {
      const d = new Date(isoDate)
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, "0")
        const mm = String(d.getMonth() + 1).padStart(2, "0")
        return `${dd}/${mm}`
      }
      if (isoDate.includes("/")) return isoDate
    } catch {}
    return "Gần đây"
  }

  // Get status badge properties
  const getStatusBadge = (status?: string, group?: TaskGroupId) => {
    const s = (status || "").toLowerCase().trim()
    if (s === "hoàn thành" || s === "done" || group === "completed") {
      return {
        label: "Hoàn thành",
        bgClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dotClass: "bg-emerald-500",
      }
    }
    if (s.includes("pending") || s.includes("chờ duyệt") || s.includes("đã gửi po") || group === "pending") {
      return {
        label: "Pending PO",
        bgClass: "bg-amber-50 text-amber-700 border-amber-200",
        dotClass: "bg-amber-500",
      }
    }
    if (s.includes("bị chặn") || s.includes("blocked") || group === "overload") {
      return {
        label: "Bị chặn",
        bgClass: "bg-rose-50 text-rose-700 border-rose-200",
        dotClass: "bg-rose-500",
      }
    }
    if (s.includes("chờ phân bổ") || s.includes("phân loại") || s.includes("chờ tiếp nhận") || group === "unassigned") {
      return {
        label: "Chờ phân bổ",
        bgClass: "bg-purple-50 text-purple-700 border-purple-200",
        dotClass: "bg-purple-500",
      }
    }
    return {
      label: status || "Đang thực hiện",
      bgClass: "bg-blue-50 text-[#1057FB] border-blue-200",
      dotClass: "bg-[#1057FB]",
    }
  }

  // Copy helper
  const handleCopyId = (e: React.MouseEvent, reqId: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(reqId)
    toast.success(`Đã sao chép mã: ${reqId}`)
    setActiveActionMenuId(null)
  }

  const handleCopyLink = (e: React.MouseEvent, reqId: string) => {
    e.stopPropagation()
    const url = `${window.location.origin}/#task-${reqId}`
    navigator.clipboard.writeText(url)
    toast.success("Đã sao chép liên kết bài toán!")
    setActiveActionMenuId(null)
  }

  return (
    <div data-slot="data-grid" className="w-full select-none rounded-b-2xl">
      <div className="overflow-x-auto w-full">
        <table data-slot="data-grid-table" className="text-slate-900 caption-bottom text-left align-middle text-sm font-normal w-full min-w-[980px] table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[14%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[12%]" />
            <col className="w-[7.5%]" />
            <col className="w-[8.5%]" />
            <col className="w-[44px]" />
          </colgroup>
          <thead className="bg-slate-50/60 border-b border-slate-200/70 text-[11px] font-medium text-slate-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
            <tr className="h-9">
              <th className="px-4 sm:px-5 py-2 text-left font-medium">Yêu cầu / Task & Luồng nghiệp vụ</th>
              <th className="px-3 sm:px-4 py-2 text-left font-medium">Squad</th>
              <th className="px-3 sm:px-4 py-2 text-left font-medium">Created by</th>
              <th className="px-3 sm:px-4 py-2 text-left font-medium">Designer</th>
              <th className="px-3 sm:px-4 py-2 text-left font-medium">Trạng thái</th>
              <th className="px-3 sm:px-4 py-2 text-right font-medium">Priority</th>
              <th className="px-3 sm:px-4 py-2 text-right font-medium whitespace-nowrap">Release</th>
              <th className="px-2 sm:px-3 py-2 text-right font-medium w-[44px]" />
            </tr>
          </thead>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.tbody
                key="table-loading-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                data-slot="data-grid-table-body"
              >
                <TableRowsSkeleton rowCount={6} />
              </motion.tbody>
            ) : requests.length === 0 ? (
              <motion.tbody
                key="table-empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                data-slot="data-grid-table-body"
              >
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center bg-white">
                    <EmptyState
                      title="Không tìm thấy bài toán nào"
                      description="Không có bài toán nào khớp với bộ lọc hiện tại. Hãy thử thay đổi từ khóa hoặc xóa bộ lọc."
                      secondaryAction={
                        onResetFilters && hasActiveFilters
                          ? {
                              label: "Đặt lại bộ lọc",
                              onClick: onResetFilters,
                              icon: <RefreshCw className="size-3.5" />,
                            }
                          : undefined
                      }
                      primaryAction={
                        onNavigateToCreate
                          ? {
                              label: "Tạo yêu cầu mới",
                              onClick: onNavigateToCreate,
                              icon: <Plus className="size-3.5" />,
                            }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              </motion.tbody>
            ) : (
              <motion.tbody
                key="table-data-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                data-slot="data-grid-table-body"
              >
                {groupedData.map((group) => {
                if (group.count === 0) return null
                const isExpanded = expandedGroups[group.id] !== false

                return (
                  <React.Fragment key={group.id}>
                    {/* Collapsible Group Row Header (Enhanced Hierarchy) */}
                    <tr
                      data-row-id={group.id}
                      onClick={() => toggleGroup(group.id)}
                      className={`h-11 ${group.headerBg || "bg-slate-50/80"} ${group.headerBorderLeft || "border-l-4 border-l-slate-400"} border-y cursor-pointer select-none transition-all group/run-row shadow-2xs`}
                    >
                      <td colSpan={8} className="px-4 sm:px-5 py-2.5 align-middle border-y border-slate-200/90">
                        <div data-run-row="group" className="flex items-center justify-between">
                          {/* Left: Button + Status Dot + Group Name + Count pill */}
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleGroup(group.id)
                              }}
                              className="size-6 inline-flex items-center justify-center rounded-full hover:bg-black/5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
                            >
                              <ChevronRight
                                className={`size-4 transition-transform duration-150 ${
                                  isExpanded ? "rotate-90 text-slate-800" : "text-slate-500"
                                }`}
                              />
                            </button>
                            <span className={`size-2.5 rounded-full shrink-0 ring-2 ring-white shadow-xs ${group.dotClass}`} />
                            <span className={`text-sm ${group.labelClass || "font-bold text-slate-900"} truncate`}>
                              {group.label}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 text-xs h-5 min-w-5 shrink-0 inline-flex items-center justify-center shadow-2xs ${group.countBadgeClass || "border-slate-200 bg-white font-bold text-slate-600"}`}>
                              {group.count}
                            </span>
                          </div>

                          {/* Right: Group description */}
                          <span className="text-xs text-slate-500 font-medium truncate max-w-sm hidden md:inline-block pr-2">
                            {group.summary}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Group Item Rows (When expanded) */}
                    {isExpanded &&
                      group.items.map((req, rowIdx) => {
                        const rawDesigner =
                          req.assigned_designer ||
                          (req.ux_owner !== "Chưa phân công" && req.ux_owner !== "Đang phân công"
                            ? req.ux_owner
                            : "") ||
                          ""
                        const isAssigned = Boolean(
                          rawDesigner && rawDesigner !== "Chưa phân công" && rawDesigner !== "Đang phân công"
                        )
                        const displayName = isAssigned ? formatDesignerDisplayName(rawDesigner) : "Chưa phân công"
                        const designerAvatar = isAssigned ? getDesignerAvatar(displayName) : ""

                        // Created by
                        const rawCreator = (req.requester_name || req.requester_email || "PO").trim()
                        const displayCreator = rawCreator.includes("@")
                          ? rawCreator.split("@")[0].charAt(0).toUpperCase() + rawCreator.split("@")[0].slice(1)
                          : rawCreator
                        const creatorAvatar = getDesignerAvatar(displayCreator) || getDesignerAvatar(rawCreator)

                        const priorityInfo = formatPriority(req.priority)

                        // Dates
                        const releaseDate = req.release_date || req.expected_deadline
                        const designDoneDate = req.design_deadline || req.expected_deadline
                        const isOverdue = Boolean(
                          designDoneDate &&
                          new Date(designDoneDate).getTime() < Date.now() &&
                          req.status !== "Hoàn thành" &&
                          req.status !== "Done"
                        )

                        const pendingInfo = getRequestPendingClassification(req)
                        const isLastRow = rowIdx === group.items.length - 1
                        const isSecondToLast = rowIdx === group.items.length - 2 && group.items.length >= 3
                        const isNearBottom = isLastRow || isSecondToLast
                        const cellBorderClass = isLastRow ? "border-b-2 border-slate-300" : "border-b border-slate-200"

                        const prodName = (req.product || "Khác").trim()
                        const rawSquad = (req.squad_name || req.preferred_squad || "").trim()
                        const hasSquad = Boolean(
                          rawSquad &&
                          rawSquad !== "Chưa phân công" &&
                          rawSquad !== "Chưa có squad" &&
                          rawSquad !== "Chưa phân squad" &&
                          rawSquad !== "Triage Squad" &&
                          rawSquad !== ""
                        )
                        const projectDisplay = hasSquad
                          ? (rawSquad.toLowerCase() === prodName.toLowerCase() ? prodName : `${prodName} · ${rawSquad}`)
                          : prodName

                        const phaseInfo = getTaskPhaseStatus(req)
                        const cfg = getStatusConfig(phaseInfo.name)

                        return (
                          <tr
                            key={req.request_id || `req-${rowIdx}`}
                            data-row-id={req.request_id}
                            data-depth="1"
                            onClick={() => onSelectRequest(req)}
                            onMouseEnter={() => {
                              if (req.request_id) {
                                fetchSingleTaskUpdate(req.request_id)
                              }
                            }}
                            className="hover:bg-slate-50/90 transition-colors group/run-row cursor-pointer bg-white"
                          >
                            {/* 1. Tiêu đề + Subtitle */}
                            <td className={`px-4 sm:px-5 py-3.5 sm:py-4 align-middle ${cellBorderClass}`}>
                              <div data-run-row="run" className="flex min-w-0 flex-col gap-0.5">
                                <div className="min-w-0 text-sm leading-5 font-medium flex items-center gap-1.5">
                                  <span
                                    className="text-slate-900 group-hover/run-row:text-[#1057FB] truncate transition-colors text-sm font-medium"
                                    title={capitalizeFirstLetter(req.title)}
                                  >
                                    {capitalizeFirstLetter(req.title)}
                                  </span>
                                  {pendingInfo.isPending && group.id !== "pending" && (
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-4xl text-[10px] font-medium shrink-0 border ${
                                        pendingInfo.type === "po_pending"
                                          ? "bg-amber-50 text-amber-800 border-amber-300"
                                          : "bg-slate-100 text-slate-700 border-slate-300"
                                      }`}
                                      title={pendingInfo.type === "po_pending" ? "PO Pending: Quá hạn 24h PO chưa duyệt" : `Pending: ${pendingInfo.reason}`}
                                    >
                                      <span className={`size-1.5 rounded-full shrink-0 ${pendingInfo.type === "po_pending" ? "bg-amber-500" : "bg-slate-500"}`} />
                                      <span>{pendingInfo.label}</span>
                                    </span>
                                  )}
                                  <ArrowRight className="size-3 text-[#1057FB] shrink-0 -translate-x-1 opacity-0 transition-all group-hover/run-row:translate-x-0 group-hover/run-row:opacity-100 hidden sm:inline-block" />
                                </div>

                                {/* Dòng lý do Pending */}
                                {pendingInfo.isPending && Boolean(pendingInfo.reason || req.pending_reason) && (
                                  <div className="flex items-center gap-1.5 text-xs min-w-0 my-0.5">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0 leading-none">
                                      Lí do
                                    </span>
                                    <span 
                                      className="text-[#1057FB] text-xs font-normal truncate max-w-sm sm:max-w-md lg:max-w-lg" 
                                      title={pendingInfo.reason || req.pending_reason}
                                    >
                                      {pendingInfo.reason || req.pending_reason}
                                    </span>
                                  </div>
                                )}

                                {/* Subtitle / Step / Context */}
                                <p className="text-slate-400 truncate text-xs leading-4 flex items-center gap-1.5 font-normal">
                                  <span className="font-normal text-slate-500">{req.request_id}</span>
                                  <span>·</span>
                                  <span>Cập nhật {formatDateLabel(req.last_updated)}</span>
                                </p>
                              </div>
                            </td>

                            {/* 2. Squad / Sản phẩm (2 dòng theo UI cột title: chữ to trên squad, chữ bé dưới sản phẩm) */}
                            <td className={`px-3 sm:px-4 py-3.5 sm:py-4 align-middle ${cellBorderClass}`}>
                              <div className="flex min-w-0 flex-col gap-0.5">
                                {/* Chữ to trên: Squad */}
                                <div className="min-w-0 text-sm leading-5 font-medium">
                                  <span
                                    className={`truncate block text-sm font-medium ${
                                      hasSquad ? "text-slate-800" : "text-slate-400 italic"
                                    }`}
                                    title={hasSquad ? rawSquad : "Chưa phân squad"}
                                  >
                                    {hasSquad ? rawSquad : "Chưa phân squad"}
                                  </span>
                                </div>

                                {/* Chữ bé dưới: Sản phẩm */}
                                <p className="text-slate-400 truncate text-xs leading-4 font-normal" title={prodName}>
                                  <span className="truncate">{prodName}</span>
                                </p>
                              </div>
                            </td>

                            {/* 3. Created by */}
                            <td className={`px-3 sm:px-4 py-3.5 sm:py-4 align-middle ${cellBorderClass}`}>
                              {displayCreator ? (
                                <div className="flex items-center gap-2 min-w-0">
                                  <UserAvatar name={displayCreator} avatarUrl={creatorAvatar} size="xs" />
                                  <span className="text-xs text-slate-700 font-normal truncate" title={displayCreator}>
                                    {displayCreator}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic font-normal">
                                  -
                                </span>
                              )}
                            </td>

                            {/* 4. Designer */}
                            <td className={`px-3 sm:px-4 py-3.5 sm:py-4 align-middle ${cellBorderClass}`}>
                              {isAssigned ? (
                                <div className="flex items-center gap-2 min-w-0">
                                  <UserAvatar name={displayName} avatarUrl={designerAvatar} size="xs" />
                                  <span className="text-xs text-slate-700 font-normal truncate" title={displayName}>
                                    {displayName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic font-normal">
                                  Chưa phân công
                                </span>
                              )}
                            </td>

                            {/* 5. Trạng thái (Lifecycle State) */}
                            <td className={`px-3 sm:px-4 py-3.5 sm:py-4 align-middle ${cellBorderClass}`}>
                              {pendingInfo.isPending ? (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-4xl text-xs font-medium border shadow-2xs whitespace-nowrap bg-amber-50 text-amber-800 border-amber-300 h-6"
                                  title={`Pending: ${pendingInfo.reason || pendingInfo.label}`}
                                >
                                  <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                                  <span className="truncate">{pendingInfo.label || phaseInfo.name}</span>
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-4xl text-xs font-medium border shadow-2xs whitespace-nowrap h-6 ${cfg.inlineClasses.bg} ${cfg.inlineClasses.text} ${cfg.inlineClasses.border}`}
                                  title={`Trạng thái: ${phaseInfo.name}${phaseInfo.progress ? ` (${phaseInfo.progress}%)` : ""}`}
                                >
                                  <span className={`size-1.5 rounded-full ${cfg.inlineClasses.dot} shrink-0`} />
                                  <span className="truncate">{phaseInfo.name}</span>
                                </span>
                              )}
                            </td>

                            {/* 6. Priority */}
                            <td className={`px-3 sm:px-4 py-3.5 sm:py-4 align-middle text-right ${cellBorderClass}`}>
                              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-4xl text-xs font-medium border h-6 whitespace-nowrap ${priorityInfo.badgeClass}`}>
                                {priorityInfo.label}
                              </span>
                            </td>

                            {/* 7. Release */}
                            <td className={`px-3 sm:px-4 py-3.5 sm:py-4 align-middle text-right whitespace-nowrap ${cellBorderClass}`}>
                              {releaseDate ? (
                                <span className="text-xs tabular-nums font-normal text-rose-600">
                                  {formatDisplayDate(releaseDate)}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </td>

                            {/* 8. Action Menu */}
                            <td className={`px-2 sm:px-3 py-3.5 sm:py-4 align-middle text-right ${cellBorderClass}`} onClick={(e) => e.stopPropagation()}>
                              <div className="relative inline-block text-left">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActiveActionMenuId(activeActionMenuId === req.request_id ? null : req.request_id)
                                  }}
                                  className="size-7 inline-flex items-center justify-center rounded-4xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Thao tác nhanh"
                                >
                                  <MoreHorizontal className="size-4" />
                                </button>

                                {/* Action Popover */}
                                {activeActionMenuId === req.request_id && (
                                  <div
                                    className={`absolute right-0 ${
                                      isNearBottom ? "bottom-full mb-1.5 origin-bottom-right" : "top-full mt-1.5 origin-top-right"
                                    } z-30 w-44 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1 text-left animate-in fade-in-50 zoom-in-95`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onSelectRequest(req)
                                        setActiveActionMenuId(null)
                                      }}
                                      className="w-full px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer font-medium"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Mở chi tiết</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyId(e, req.request_id)}
                                      className="w-full px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer font-medium"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Sao chép mã ID</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyLink(e, req.request_id)}
                                      className="w-full px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer font-medium"
                                    >
                                      <Share2 className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Sao chép liên kết</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </React.Fragment>
                )
              })}
            </motion.tbody>
          )}
        </AnimatePresence>
      </table>
      </div>

      {/* Table Footer - Flux AgentOps Style */}
      <div className="bg-slate-50/40 border-t border-slate-100 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500 select-none rounded-b-2xl">
        <span className="font-normal text-slate-500">Bảng theo dõi tiến độ bài toán UX</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-normal text-slate-600 tabular-nums">
            {totalVisible}/{requests.length}
          </span>
          <span className="rounded-4xl border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-2xs">
            {totalVisible !== requests.length ? "Đã lọc" : "Tất cả"}
          </span>
        </div>
      </div>
    </div>
  )
}
