import React, { useState, useMemo, useCallback } from "react"
import { UXRequest } from "@/data/mockData"
import { UserAvatar } from "@/components/common/UserAvatar"
import { toast } from "@/components/ui/toast"
import { getRequestPendingClassification, getStatusConfig } from "@/config/statusConfig"
import { getProductColorDef, getSquadColorDef } from "@/lib/colorUtils"
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
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    match: (r) => getTaskGroup(r) === "overload",
  },
  {
    id: "unassigned",
    label: "Chờ phân bổ",
    summary: "Bài toán mới tiếp nhận đang chờ rà soát hồ sơ & phân bổ UX Designer",
    focus: "Phân công",
    order: 2,
    dotClass: "bg-purple-500",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    match: (r) => getTaskGroup(r) === "unassigned",
  },
  {
    id: "running",
    label: "Đang thực hiện",
    summary: "Các bài toán đang trong quy trình thiết kế UX & triển khai giải pháp",
    focus: "Tiến độ",
    order: 3,
    dotClass: "bg-[#1057FB]",
    badgeClass: "bg-blue-50 text-[#1057FB] border-blue-200",
    match: (r) => getTaskGroup(r) === "running",
  },
  {
    id: "pending",
    label: "Pending",
    summary: "Đã gửi phương án thiết kế, đang chờ PO duyệt nghiệm thu hoặc phản hồi",
    focus: "Phê duyệt",
    order: 4,
    dotClass: "bg-slate-400",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    match: (r) => getTaskGroup(r) === "pending",
  },
  {
    id: "completed",
    label: "Hoàn thành",
    summary: "Đã nghiệm thu thiết kế và đóng gói bàn giao thành công cho Squad",
    focus: "Nghiệm thu",
    order: 5,
    dotClass: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
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
            <col className="w-[34%]" />
            <col className="w-[15%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[7.5%]" />
            <col className="w-[8.5%]" />
            <col className="w-[8%]" />
            <col className="w-[44px]" />
          </colgroup>
          <thead className="bg-slate-50/60 border-b border-slate-200/70 text-[11px] font-medium text-slate-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
            <tr className="h-9">
              <th className="px-4 py-1 text-left font-medium">Yêu cầu / Task & Luồng nghiệp vụ</th>
              <th className="px-3 py-1 text-left font-medium">Squad</th>
              <th className="px-3 py-1 text-left font-medium">Người thực hiện</th>
              <th className="px-3 py-1 text-left font-medium">Trạng thái</th>
              <th className="px-3 py-1 text-right font-medium">Ưu tiên</th>
              <th className="px-3 py-1 text-right font-medium whitespace-nowrap">Design done</th>
              <th className="px-3 py-1 text-right font-medium whitespace-nowrap">Release</th>
              <th className="px-2 py-1 text-right font-medium w-[44px]" />
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
                    {/* Collapsible Group Row Header (Flux AgentOps Style) */}
                    <tr
                      data-row-id={group.id}
                      onClick={() => toggleGroup(group.id)}
                      className="h-10 bg-slate-50/70 hover:bg-slate-100/70 border-y border-slate-200/80 cursor-pointer select-none transition-colors group/run-row"
                    >
                      <td colSpan={8} className="px-4 py-1.5 align-middle">
                        <div data-run-row="group" className="flex items-center justify-between">
                          {/* Left: Button + Status Dot + Group Name + Count pill */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleGroup(group.id)
                              }}
                              className="size-6 inline-flex items-center justify-center rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
                            >
                              <ChevronRight
                                className={`size-3.5 transition-transform duration-150 ${
                                  isExpanded ? "rotate-90 text-slate-700" : "text-slate-400"
                                }`}
                              />
                            </button>
                            <span className={`size-2.5 rounded-full shrink-0 ${group.dotClass}`} />
                            <span className="text-sm font-medium text-slate-900 truncate">
                              {group.label}
                            </span>
                            <span className="rounded-4xl border border-slate-200 bg-white px-1.5 py-0.5 text-xs h-5 min-w-5 shrink-0 inline-flex items-center justify-center font-medium text-slate-600 shadow-2xs">
                              {group.count}
                            </span>
                          </div>

                          {/* Right: Group description */}
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

                        // Business need & Journey description
                        const uxNeedText = req.business_need || req.user_problem || req.description || ""
                        const showJourneyBadge = Boolean(
                          req.feature_journey &&
                          req.feature_journey.trim() !== "" &&
                          req.feature_journey.trim().toLowerCase() !== req.title.trim().toLowerCase()
                        )

                        const pendingInfo = getRequestPendingClassification(req)
                        const isLastRow = rowIdx === group.items.length - 1
                        const isSecondToLast = rowIdx === group.items.length - 2 && group.items.length >= 3
                        const isNearBottom = isLastRow || isSecondToLast

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
                            className="h-13 hover:bg-slate-50/70 transition-colors border-b border-slate-100/80 group/run-row cursor-pointer"
                          >
                            {/* 1. Tiêu đề + Subtitle */}
                            <td className="px-4 py-2.5 align-middle">
                              <div data-run-row="run" className="flex min-w-0 flex-col gap-0.5">
                                <div className="min-w-0 text-sm leading-5 font-medium flex items-center gap-1.5">
                                  <span
                                    className="text-slate-900 group-hover/run-row:text-[#1057FB] truncate transition-colors text-sm font-medium"
                                    title={req.title}
                                  >
                                    {req.title}
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

                                  {/* Subtitle / Step / Context */}
                                  <p className="text-slate-400 truncate text-xs leading-4 flex items-center gap-1.5 font-normal">
                                    <span className="font-normal text-slate-500">{req.request_id}</span>
                                    <span>·</span>
                                    <span>Cập nhật {formatDateLabel(req.last_updated)}</span>
                                    {uxNeedText ? (
                                      <>
                                        <span>·</span>
                                        <span className="truncate max-w-xs">{uxNeedText}</span>
                                      </>
                                    ) : showJourneyBadge ? (
                                      <>
                                        <span>·</span>
                                        <span className="truncate max-w-xs">{req.feature_journey}</span>
                                      </>
                                    ) : null}
                                  </p>
                                </div>
                            </td>

                            {/* 2. Squad / Sản phẩm (2 dòng theo UI cột title: chữ to trên squad, chữ bé dưới sản phẩm) */}
                            <td className="px-3 py-2.5 align-middle">
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

                            {/* 3. Người thực hiện (Assignee) */}
                            <td className="px-3 py-2 align-middle">
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

                            {/* 4. Trạng thái (Lifecycle State) */}
                            <td className="px-3 py-2 align-middle">
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

                            {/* 5. Ưu tiên (Priority) */}
                            <td className="px-3 py-2 align-middle text-right">
                              {priorityStr === "urgent" || priorityStr === "khẩn cấp" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-4xl text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs h-6">
                                  Khẩn cấp
                                </span>
                              ) : priorityStr === "high" || priorityStr === "cao" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-4xl text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs h-6">
                                  Cao
                                </span>
                              ) : priorityStr === "low" || priorityStr === "thấp" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-4xl text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 h-6">
                                  Thấp
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-4xl text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 h-6">
                                  Normal
                                </span>
                              )}
                            </td>

                            {/* 6. Design done */}
                            <td className="px-3 py-2 align-middle text-right whitespace-nowrap">
                              {designDoneDate ? (
                                <div className="inline-flex items-center justify-end gap-1 text-xs tabular-nums text-slate-600 font-normal">
                                  <span className={isOverdue && group.id !== "overload" ? "text-rose-600 font-medium" : "text-slate-600"}>
                                    {formatDisplayDate(designDoneDate)}
                                  </span>
                                  {isOverdue && group.id !== "overload" && (
                                    <span className="px-1 py-0.2 rounded-4xl text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                                      Trễ
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </td>

                            {/* 7. Release */}
                            <td className="px-3 py-2 align-middle text-right whitespace-nowrap">
                              {releaseDate ? (
                                <span className="text-xs tabular-nums font-normal text-rose-600">
                                  {formatDisplayDate(releaseDate)}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </td>

                            {/* 8. Action Menu */}
                            <td className="px-2 py-2 align-middle text-right" onClick={(e) => e.stopPropagation()}>
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
