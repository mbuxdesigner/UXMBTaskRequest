import React, { useState, useMemo, useCallback } from "react"
import { UXRequest } from "@/data/mockData"
import { UserAvatar } from "@/components/common/UserAvatar"
import { toast } from "@/components/ui/toast"
import { getRequestPendingClassification } from "@/config/statusConfig"

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
    status === "mới tạo" ||
    r.current_phase === "Phân loại" ||
    r.current_phase === "Chờ tiếp nhận"
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
    dotClass: "bg-rose-500 ring-2 ring-rose-500/25",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    match: (r) => getTaskGroup(r) === "overload",
  },
  {
    id: "unassigned",
    label: "Chờ phân bổ",
    summary: "Bài toán mới tiếp nhận đang chờ rà soát hồ sơ & phân bổ UX Designer",
    focus: "Phân công",
    order: 2,
    dotClass: "bg-purple-500 ring-2 ring-purple-500/25",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    match: (r) => getTaskGroup(r) === "unassigned",
  },
  {
    id: "running",
    label: "Đang thực hiện",
    summary: "Các bài toán đang trong quy trình thiết kế UX & triển khai giải pháp",
    focus: "Tiến độ",
    order: 3,
    dotClass: "bg-[#1057FB] ring-2 ring-[#1057FB]/25",
    badgeClass: "bg-blue-50 text-[#1057FB] border-blue-200",
    match: (r) => getTaskGroup(r) === "running",
  },
  {
    id: "pending",
    label: "Pending",
    summary: "Đã gửi phương án thiết kế, đang chờ PO duyệt nghiệm thu hoặc phản hồi",
    focus: "Phê duyệt",
    order: 4,
    dotClass: "bg-slate-400 ring-2 ring-slate-400/25",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    match: (r) => getTaskGroup(r) === "pending",
  },
  {
    id: "completed",
    label: "Hoàn thành",
    summary: "Đã nghiệm thu thiết kế và đóng gói bàn giao thành công cho Squad",
    focus: "Nghiệm thu",
    order: 5,
    dotClass: "bg-emerald-500 ring-2 ring-emerald-500/25",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    match: (r) => getTaskGroup(r) === "completed",
  },
]

// ReUI Radial Steps Progress Ring
function RadialStepsProgress({ progress }: { progress: number }) {
  const safeProgress = Math.max(0, Math.min(100, progress))
  const radius = 8
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safeProgress / 100) * circumference

  const colorClass =
    safeProgress >= 75
      ? "text-emerald-500"
      : safeProgress >= 35
      ? "text-amber-500"
      : "text-rose-500"

  return (
    <div className="flex items-center justify-end gap-2" title={`${safeProgress}% tiến độ`}>
      <svg viewBox="0 0 24 24" className={`w-4 h-4 shrink-0 ${colorClass}`} aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          className="stroke-slate-200"
          strokeWidth="2.5"
        />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          className="stroke-current"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 12 12)"
        />
      </svg>
      <span className="font-mono text-xs font-bold text-slate-700 tabular-nums min-w-[28px] text-right">
        {safeProgress}%
      </span>
    </div>
  )
}

export default function SolutionAgentsTable({
  requests,
  loading = false,
  onSelectRequest,
  onNavigateToCreate,
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
    <section className="flex w-full flex-col p-3 sm:p-4 space-y-4 select-none">
      {/* ReUI Solution Agents 2 Triage Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-xs min-w-[960px] border-collapse">
            {/* Table Header: 8 Cột sắp xếp khoa học, chuẩn xác */}
            <thead className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4 sm:px-5 w-[28%]">Yêu cầu / Task & Luồng nghiệp vụ</th>
                <th className="py-2.5 px-3 w-[12%]">Sản phẩm</th>
                <th className="py-2.5 px-3 w-[12%]">Squad</th>
                <th className="py-2.5 px-3 w-[14%]">Người thực hiện</th>
                <th className="py-2.5 px-3 w-[7%] text-right">Tiến độ</th>
                <th className="py-2.5 px-3 w-[9%] text-right">Độ ưu tiên</th>
                <th className="py-2.5 px-3 w-[15%] min-w-[155px] text-right whitespace-nowrap">Thời hạn & Release</th>
                <th className="py-2.5 px-2 w-[3%] text-right" />
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={`load-skel-${i}`} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-4 bg-slate-50/30">
                      <div className="h-4 bg-slate-100 rounded w-1/3 mb-1" />
                      <div className="h-3 bg-slate-100 rounded w-1/5" />
                    </td>
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 sm:py-12 px-4 text-center bg-white">
                    <EmptyState
                      title="Không tìm thấy bài toán nào"
                      description="Không có bài toán nào khớp với bộ lọc hiện tại. Hãy thử thay đổi từ khóa hoặc xóa bộ lọc."
                      secondaryAction={
                        onResetFilters && hasActiveFilters
                          ? {
                              label: "Đặt lại bộ lọc",
                              onClick: onResetFilters,
                              icon: <RefreshCw className="w-4 h-4" />,
                            }
                          : undefined
                      }
                      primaryAction={
                        onNavigateToCreate
                          ? {
                              label: "Tạo yêu cầu mới",
                              onClick: onNavigateToCreate,
                              icon: <Plus className="w-4 h-4" />,
                            }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                groupedData.map((group) => {
                  if (group.count === 0) return null
                  const isExpanded = expandedGroups[group.id] !== false

                  return (
                    <React.Fragment key={group.id}>
                      {/* Collapsible Group Row Header (ReUI Solution Agents 2 'ip' Style) */}
                      <tr
                        onClick={() => toggleGroup(group.id)}
                        className="bg-slate-100/75 hover:bg-slate-100 transition-colors border-y border-slate-200/90 cursor-pointer select-none"
                      >
                        <td colSpan={8} className="py-2 px-3 sm:px-4">
                          <div className="flex items-center justify-between">
                            {/* Left: Chevron + Dot + Group Label + Count badge */}
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleGroup(group.id)
                                }}
                                className="p-0.5 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                              >
                                <ChevronRight
                                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                    isExpanded ? "rotate-90 text-slate-800" : "text-slate-400"
                                  }`}
                                />
                              </button>

                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${group.dotClass}`} />

                              <span className="font-bold text-sm sm:text-[14.5px] text-slate-900 truncate">
                                {group.label}
                              </span>

                              <span className="px-2 py-0.2 rounded-full text-xs font-bold bg-white text-slate-600 border border-slate-200/90 shadow-2xs shrink-0">
                                {group.count}
                              </span>
                            </div>

                            {/* Right: Group Summary Hint */}
                            <span className="text-xs text-slate-400 truncate max-w-sm hidden md:inline-block pr-2 font-normal">
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
                          const progressVal = req.progress ?? (req.status === "Hoàn thành" ? 100 : 35)

                          const rowHeightClass = (density as string) === "compact" ? "py-2.5" : "py-3"
                          const priorityStr = (req.priority || "Normal").toLowerCase()

                          // Dates
                          const releaseDate = req.release_date || req.expected_deadline
                          const designDoneDate = req.design_deadline || req.expected_deadline
                          const isOverdue = Boolean(
                            designDoneDate &&
                            new Date(designDoneDate).getTime() < Date.now() &&
                            req.status !== "Hoàn thành" &&
                            req.status !== "Done"
                          )

                          // Business need & Journey description (Lược bỏ lặp lại)
                          const uxNeedText = req.business_need || req.user_problem || req.description || ""
                          const showJourneyBadge = Boolean(
                            req.feature_journey &&
                            req.feature_journey.trim() !== "" &&
                            req.feature_journey.trim().toLowerCase() !== req.title.trim().toLowerCase()
                          )

                          const pendingInfo = getRequestPendingClassification(req)

                          return (
                            <tr
                              key={req.request_id || `req-${rowIdx}`}
                              onClick={() => onSelectRequest(req)}
                              className={`group hover:bg-blue-50/40 transition-colors cursor-pointer ${
                                rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/35"
                              }`}
                            >
                              {/* 1. Task Title & UX Business Need & Journey */}
                              <td className={`${rowHeightClass} px-4 sm:px-5 min-w-0 max-w-0 overflow-hidden`}>
                                <div className="space-y-1 min-w-0 pr-2">
                                  {/* Line 1: Tiêu đề bài toán + Badge PO Pending / Pending nếu có (Ẩn khi đang trong group Pending) */}
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-sm sm:text-[14.5px] font-bold text-slate-900 group-hover:text-[#1057FB] transition-colors leading-snug truncate" title={req.title}>
                                      {req.title}
                                    </span>
                                    {pendingInfo.isPending && group.id !== "pending" && (
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0 border shadow-2xs ${
                                          pendingInfo.type === "po_pending"
                                            ? "bg-amber-50 text-amber-800 border-amber-300"
                                            : "bg-slate-100 text-slate-700 border-slate-300"
                                        }`}
                                        title={pendingInfo.type === "po_pending" ? "PO Pending: Quá hạn 24h PO chưa duyệt" : `Pending: ${pendingInfo.reason}`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pendingInfo.type === "po_pending" ? "bg-amber-500" : "bg-slate-500"}`} />
                                        <span>{pendingInfo.label}</span>
                                      </span>
                                    )}
                                    <ArrowRight className="w-3.5 h-3.5 text-[#1057FB] shrink-0 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 hidden sm:inline-block" />
                                  </div>

                                  {/* Line 2: Hiển thị rõ lý do Pending (theo chat Designer) hoặc Quá hạn 24h (PO Pending) */}
                                  {pendingInfo.isPending ? (
                                    pendingInfo.type === "designer_pending" ? (
                                      <div className="flex items-center gap-1.5 text-xs text-slate-700 min-w-0" title={`Lí do: ${pendingInfo.reason}`}>
                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded font-bold bg-slate-200/90 text-slate-800 text-[10px] shrink-0">
                                          Lí do
                                        </span>
                                        <span className="text-[#1057FB] font-medium truncate min-w-0 text-[11.5px]">
                                          {pendingInfo.reason || "Theo đoạn chat của designer khi viết @pending"}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 text-xs text-amber-900 min-w-0" title="Sau 24h kể từ khi Designer gửi lại figma cho PO nhưng chưa phản hồi">
                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded font-bold bg-amber-200 text-amber-900 text-[10px] shrink-0">
                                          Quá hạn 24h
                                        </span>
                                        <span className="text-amber-800 font-medium truncate min-w-0 text-[11.5px]">
                                          Designer đã gửi lại Figma cho PO nhưng chưa nhận được phản hồi duyệt{pendingInfo.elapsedHours ? ` (${pendingInfo.elapsedHours}h)` : ""}
                                        </span>
                                      </div>
                                    )
                                  ) : uxNeedText ? (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0" title={`Nhu cầu UX: ${uxNeedText}`}>
                                      {showJourneyBadge && (
                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded font-medium bg-blue-50 text-blue-800 border border-blue-100 text-[10.5px] shrink-0">
                                          {req.feature_journey}
                                        </span>
                                      )}
                                      <span className="text-slate-500 font-normal truncate min-w-0">
                                        {uxNeedText}
                                      </span>
                                    </div>
                                  ) : showJourneyBadge ? (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded font-medium bg-blue-50 text-blue-800 border border-blue-100 text-[10.5px] shrink-0">
                                        {req.feature_journey}
                                      </span>
                                    </div>
                                  ) : null}

                                  {/* Line 3: ID task & Ngày cập nhật lần cuối (Thay cho Khâu) */}
                                  {showContext && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-normal truncate">
                                      <span>{req.request_id}</span>
                                      <span>•</span>
                                      <span>
                                        Cập nhật {formatDateLabel(req.last_updated)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 3. Sản phẩm (Product) */}
                              <td className={`${rowHeightClass} px-3 min-w-0 overflow-hidden`}>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs h-[24px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                  <span className="truncate max-w-[110px]" title={req.product || "App MBBank"}>
                                    {req.product || "App MBBank"}
                                  </span>
                                </span>
                              </td>

                              {/* 4. Squad nghiệp vụ */}
                              <td className={`${rowHeightClass} px-3 min-w-0 overflow-hidden`}>
                                {(() => {
                                  const rawSquad = req.squad_name || req.preferred_squad
                                  const hasSquad = rawSquad && rawSquad !== req.product && rawSquad !== "Chưa phân công" && rawSquad !== "Triage Squad"
                                  const squadDisplay = hasSquad ? rawSquad : "Chưa phân squad"

                                  return hasSquad ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50/70 text-indigo-700 border border-indigo-200/70 shadow-2xs h-[24px]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                      <span className="truncate max-w-[110px]" title={squadDisplay}>{squadDisplay}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-normal text-slate-400 bg-slate-50 border border-slate-200/60 h-[24px]">
                                      Chưa phân squad
                                    </span>
                                  )
                                })()}
                              </td>

                              {/* 4. Người thực hiện (Assignee) */}
                              <td className={`${rowHeightClass} px-3 min-w-0 overflow-hidden`}>
                                {isAssigned ? (
                                  <div className="flex items-center gap-2 min-w-0">
                                    <UserAvatar
                                      name={displayName}
                                      avatarUrl={designerAvatar}
                                      size="sm"
                                    />
                                    <span className="text-sm font-semibold text-slate-800 truncate" title={displayName}>
                                      {displayName}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-400 italic font-normal">
                                    Chưa phân công
                                  </span>
                                )}
                              </td>

                              {/* 5. Tiến độ (ReUI Steps Progress Ring) */}
                              <td className={`${rowHeightClass} px-3 text-right`}>
                                <RadialStepsProgress progress={progressVal} />
                              </td>

                              {/* 6. Độ ưu tiên (Priority Badge) - Đồng nhất chiều cao h-[24px] */}
                              <td className={`${rowHeightClass} px-3 text-right`}>
                                {priorityStr === "urgent" || priorityStr === "khẩn cấp" ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs h-[24px]">
                                    Khẩn cấp
                                  </span>
                                ) : priorityStr === "high" || priorityStr === "cao" ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs h-[24px]">
                                    Cao
                                  </span>
                                ) : priorityStr === "low" || priorityStr === "thấp" ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 h-[24px]">
                                    Thấp
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 h-[24px]">
                                    Normal
                                  </span>
                                )}
                              </td>

                              {/* 7. Thời hạn & Release: Design done (trên) & Release (dưới) - Không xuống dòng */}
                              <td className={`${rowHeightClass} px-3 text-right whitespace-nowrap shrink-0 min-w-[155px]`}>
                                <div className="flex flex-col items-end gap-0.5 whitespace-nowrap shrink-0">
                                  {/* Design done (Hạn hoàn thành UX) - Nằm trên */}
                                  <div className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold text-slate-800 font-mono whitespace-nowrap shrink-0" title={`Hạn hoàn thành thiết kế (Design done): ${formatDisplayDate(designDoneDate)}`}>
                                    <span className="text-xs text-slate-400 font-sans font-normal whitespace-nowrap shrink-0">Design done:</span>
                                    <span className="whitespace-nowrap shrink-0">{formatDisplayDate(designDoneDate)}</span>
                                    {isOverdue && group.id !== "overload" && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 ml-0.5 whitespace-nowrap shrink-0">
                                        Trễ
                                      </span>
                                    )}
                                  </div>
                                  {/* Release dự kiến - Nằm dưới */}
                                  {releaseDate && (
                                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono whitespace-nowrap shrink-0" title={`Ngày Release dự kiến: ${formatDisplayDate(releaseDate)}`}>
                                      <span className="text-[11px] text-slate-400 font-sans font-normal whitespace-nowrap shrink-0">Release:</span>
                                      <span className="font-semibold text-rose-600 whitespace-nowrap shrink-0">{formatDisplayDate(releaseDate)}</span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 8. Thao tác nhanh (Action Menu) */}
                              <td className={`${rowHeightClass} px-2 text-right relative`} onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActiveActionMenuId(activeActionMenuId === req.request_id ? null : req.request_id)
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Thao tác nhanh"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>

                                {activeActionMenuId === req.request_id && (
                                  <div
                                    className="absolute right-2 top-full mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-left"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null)
                                        onSelectRequest(req)
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
                              </td>
                            </tr>
                          )
                        })}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Queue Mix Footer (ReUI Solution Agents 2 Style) */}
        <div className="bg-slate-50/80 border-t border-slate-200/90 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-500">
          {/* Left: Info */}
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">Bảng theo dõi tiến độ bài toán UX</span>
          </div>

          {/* Right: Total Visible */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <span className="font-semibold text-slate-700 font-mono">
              {totalVisible}/{requests.length}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${
              totalVisible !== requests.length
                ? "bg-blue-50 text-[#1057FB] border-blue-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}>
              {totalVisible !== requests.length ? "Đã lọc" : "Tất cả"}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
