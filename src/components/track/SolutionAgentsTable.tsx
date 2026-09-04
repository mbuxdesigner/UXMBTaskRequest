import React, { useState, useMemo, useCallback } from "react"
import { UXRequest } from "@/data/mockData"
import { UserAvatar } from "@/components/common/UserAvatar"
import { toast } from "@/components/ui/toast"

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
  Plus
} from "lucide-react"

export interface SolutionAgentsTableProps {
  requests: UXRequest[]
  loading?: boolean
  onSelectRequest: (request: UXRequest) => void
  onNavigateToCreate?: () => void
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

const STATUS_GROUPS: StatusGroupDef[] = [
  {
    id: "running",
    label: "Đang thực hiện",
    summary: "Các bài toán đang trong quy trình thiết kế UX & triển khai giải pháp",
    focus: "Tiến độ",
    order: 1,
    dotClass: "bg-[#1057FB] ring-2 ring-[#1057FB]/25",
    badgeClass: "bg-blue-50 text-[#1057FB] border-blue-200",
    match: (r) => r.status === "Đang thực hiện",
  },
  {
    id: "waiting",
    label: "Đang phân loại / Chờ tiếp nhận",
    summary: "Bài toán mới tiếp nhận đang chờ rà soát hồ sơ & phân bổ UX Squad",
    focus: "Khởi tạo",
    order: 2,
    dotClass: "bg-sky-500 ring-2 ring-sky-500/25",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    match: (r) => r.status === "Đang phân loại" || r.status === "Chờ tiếp nhận" || r.status === "Phân loại",
  },
  {
    id: "approval",
    label: "Đã gửi PO & Chờ phản hồi",
    summary: "Đã hoàn thành thiết kế, đang chờ PO duyệt nghiệm thu hoặc sửa đổi",
    focus: "Phê duyệt",
    order: 3,
    dotClass: "bg-purple-600 ring-2 ring-purple-500/25",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    match: (r) => r.status === "Đã gửi PO" || r.status === "PO pending" || r.status === "Pending",
  },
  {
    id: "failed",
    label: "Bị chặn / Cần hỗ trợ",
    summary: "Bài toán gặp blocker về tài liệu, tài nguyên hoặc tạm hoãn",
    focus: "Cảnh báo",
    order: 4,
    dotClass: "bg-rose-500 ring-2 ring-rose-500/25",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    match: (r) => r.status === "Bị chặn" || r.status === "Blocked",
  },
  {
    id: "completed",
    label: "Hoàn thành",
    summary: "Đã nghiệm thu thiết kế và bàn giao thành công cho Squad",
    focus: "Nghiệm thu",
    order: 5,
    dotClass: "bg-emerald-500 ring-2 ring-emerald-500/25",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    match: (r) => r.status === "Hoàn thành" || r.status === "Done",
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
}: SolutionAgentsTableProps) {
  // Local Controls matching ReUI solution-agents-2
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const [showContext, setShowContext] = useState(true) // Latest step line
  const [density, setDensity] = useState<"compact" | "comfortable">("compact")
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null)
  const [showAttentionMenu, setShowAttentionMenu] = useState(false)
  const [showDisplayMenu, setShowDisplayMenu] = useState(false)

  // Collapsed Groups State (all expanded by default)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    STATUS_GROUPS.forEach((g) => {
      initial[g.id] = true
    })
    return initial
  })

  // Filter requests based on local search and priority attention
  const filteredRequests = useMemo(() => {
    let result = requests

    const query = searchQuery.trim().toLowerCase()
    if (query) {
      result = result.filter((r) => {
        const titleMatch = r.title.toLowerCase().includes(query)
        const idMatch = r.request_id.toLowerCase().includes(query)
        const designerMatch = (r.assigned_designer || r.ux_owner || "").toLowerCase().includes(query)
        const squadMatch = (r.squad_name || "").toLowerCase().includes(query)
        const phaseMatch = (r.current_phase || "").toLowerCase().includes(query)
        return titleMatch || idMatch || designerMatch || squadMatch || phaseMatch
      })
    }

    if (selectedPriorities.length > 0) {
      result = result.filter((r) => {
        const p = (r.priority || "Normal").toLowerCase()
        return selectedPriorities.some((sp) => sp.toLowerCase() === p)
      })
    }

    return result
  }, [requests, searchQuery, selectedPriorities])

  // Group requests by status group
  const groupedData = useMemo(() => {
    return STATUS_GROUPS.map((group) => {
      const items = filteredRequests.filter((r) => group.match(r))
      return {
        ...group,
        items,
        count: items.length,
      }
    })
  }, [filteredRequests])

  // Stat counters for top bar (ReUI Solution Agents 2 Exact Match)
  const totalVisible = filteredRequests.length
  const runsCount = requests.length
  const runningCount = requests.filter((r) => r.status === "Đang thực hiện").length
  const escalatedCount = useMemo(() => {
    return requests.filter((r) => {
      const p = (r.priority || "").toLowerCase()
      const s = (r.status || "").toLowerCase()
      return p === "urgent" || p === "khẩn cấp" || p === "high" || s.includes("escalated")
    }).length
  }, [requests])
  const needsApprovalCount = useMemo(() => {
    return requests.filter((r) => {
      const s = (r.status || "").toLowerCase()
      return s === "po pending" || s === "đã gửi po" || s === "pending" || s === "chờ duyệt"
    }).length
  }, [requests])
  const unassignedCount = useMemo(() => {
    return requests.filter((r) => !r.assigned_designer || r.assigned_designer === "Chưa phân công" || r.assigned_designer === "Unassigned").length
  }, [requests])

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

  // Format date helper
  const formatDateLabel = (isoDate?: string) => {
    if (!isoDate) return "Gần đây"
    try {
      const d = new Date(isoDate)
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, "0")
        const mm = String(d.getMonth() + 1).padStart(2, "0")
        return `${dd}/${mm}`
      }
    } catch {}
    return "Gần đây"
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
    <section className="flex w-full flex-col p-4 sm:p-6 space-y-4 select-none">
      {/* 1. Header: Run Queue Title + Counters (ReUI Solution Agents 2 Exact Match) */}
      <div className="flex flex-col gap-1.5 pb-1">
        {/* Title row */}
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Run Queue
          </h2>
          <span className="flex items-center gap-1.5">
            <span className="relative flex size-2 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-slate-400 text-sm font-normal">Live</span>
          </span>
        </div>

        {/* Subtitle & Metrics row (Aligned on the same line) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-slate-500 text-sm">
            Triage the live agent run backlog.
          </p>

          {/* Right Metrics / Counters with Dividers */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Runs */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-normal text-xs">Runs</span>
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200/60 min-w-[20px]">
                {runsCount}
              </span>
            </div>

            {/* Divider */}
            <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />

            {/* Escalated */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-normal text-xs">Escalated</span>
              <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-semibold min-w-[20px] border ${
                escalatedCount > 0
                  ? "bg-rose-50 text-rose-600 border-rose-200"
                  : "bg-slate-100 text-slate-600 border-slate-200/60"
              }`}>
                {escalatedCount}
              </span>
            </div>

            {/* Divider */}
            <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />

            {/* Needs approval */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-normal text-xs">Needs approval</span>
              <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-semibold min-w-[20px] border ${
                needsApprovalCount > 0
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-600 border-slate-200/60"
              }`}>
                {needsApprovalCount}
              </span>
            </div>

            {/* Divider */}
            <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />

            {/* Unassigned */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-normal text-xs">Unassigned</span>
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/60 min-w-[20px]">
                {unassignedCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Operations Toolbar (ReUI Solution Agents 2 Style) */}
      <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-2.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 shadow-2xs">
        {/* Left: Search Input Group */}
        <div className="relative w-full lg:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm yêu cầu, designer, squad..."
            className="w-full h-8 pl-8 pr-8 text-xs bg-white text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1057FB] focus:ring-1 focus:ring-[#1057FB]/30 placeholder:text-slate-400 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Controls (Attention Filter, Display Options, Collapse/Expand All, Clear) */}
        <div className="flex flex-wrap items-center gap-1.5 self-end lg:self-auto">
          {/* Attention / Priority Filter Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowAttentionMenu(!showAttentionMenu)
                setShowDisplayMenu(false)
              }}
              className={`h-8 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedPriorities.length > 0
                  ? "bg-amber-50 text-amber-800 border-amber-200 shadow-2xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span>Độ ưu tiên</span>
              {selectedPriorities.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-bold">
                  {selectedPriorities.length}
                </span>
              )}
            </button>

            {showAttentionMenu && (
              <div
                className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1 text-[10.5px] font-bold uppercase text-slate-400 border-b border-slate-100 mb-1">
                  Lọc theo mức độ
                </div>
                {["Urgent", "High", "Normal", "Low"].map((p) => {
                  const checked = selectedPriorities.includes(p)
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setSelectedPriorities((prev) =>
                          checked ? prev.filter((item) => item !== p) : [...prev, p]
                        )
                      }}
                      className="w-full px-2 py-1.5 text-xs text-left rounded-lg hover:bg-slate-50 flex items-center justify-between cursor-pointer text-slate-700"
                    >
                      <span className="font-medium">{p === "Urgent" ? "Khẩn cấp" : p}</span>
                      {checked && <Check className="w-3.5 h-3.5 text-[#1057FB]" />}
                    </button>
                  )
                })}
                {selectedPriorities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedPriorities([])}
                    className="w-full mt-1 pt-1 border-t border-slate-100 text-[11px] font-semibold text-rose-600 hover:text-rose-700 text-center py-1 cursor-pointer"
                  >
                    Xóa chọn
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Display Options Popover (Density & Context Line) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowDisplayMenu(!showDisplayMenu)
                setShowAttentionMenu(false)
              }}
              className="h-8 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Hiển thị</span>
            </button>

            {showDisplayMenu && (
              <div
                className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[10.5px] font-bold uppercase text-slate-400 border-b border-slate-100 pb-1">
                  Tùy chỉnh bảng
                </div>

                {/* Density Switch */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium">Độ giãn dòng:</span>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setDensity("compact")}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                        density === "compact" ? "bg-white text-[#1057FB] shadow-2xs font-bold" : "text-slate-600"
                      }`}
                    >
                      Gọn
                    </button>
                    <button
                      type="button"
                      onClick={() => setDensity("comfortable")}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                        density === "comfortable" ? "bg-white text-[#1057FB] shadow-2xs font-bold" : "text-slate-600"
                      }`}
                    >
                      Thoáng
                    </button>
                  </div>
                </div>

                {/* Latest step line / context toggle */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-700 font-medium">Dòng ngữ cảnh ID:</span>
                  <button
                    type="button"
                    onClick={() => setShowContext(!showContext)}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                      showContext ? "bg-[#1057FB]" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        showContext ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Collapse/Expand Groups Button */}
          <button
            type="button"
            onClick={toggleAllGroups}
            className="h-8 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            {allExpanded ? "Thu gọn nhóm" : "Mở rộng nhóm"}
          </button>

          {/* Clear Filters if active */}
          {(searchQuery || selectedPriorities.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setSelectedPriorities([])
              }}
              className="h-8 px-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
            >
              Xóa lọc
            </button>
          )}

          {/* New Run Button for quick creation */}
          {onNavigateToCreate && (
            <button
              type="button"
              onClick={onNavigateToCreate}
              className="h-8 px-3 rounded-xl bg-[#1057FB] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo bài toán</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. ReUI Solution Agents 2 Triage Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px] border-collapse">
            {/* Table Header */}
            <thead className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4 sm:px-5 w-[38%]">Yêu cầu / Task</th>
                <th className="py-2.5 px-3 w-[16%]">Người thực hiện</th>
                <th className="py-2.5 px-3 w-[14%] text-right">Phân hệ / Squad</th>
                <th className="py-2.5 px-3 w-[11%] text-right">Thời gian</th>
                <th className="py-2.5 px-3 w-[11%] text-right">Tiến độ</th>
                <th className="py-2.5 px-3 w-[10%] text-right">Độ ưu tiên</th>
                <th className="py-2.5 px-2 w-[5%] text-right" />
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={`load-skel-${i}`} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-4 bg-slate-50/30">
                      <div className="h-4 bg-slate-100 rounded w-1/3 mb-1" />
                      <div className="h-3 bg-slate-100 rounded w-1/5" />
                    </td>
                  </tr>
                ))
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">Không tìm thấy bài toán nào khớp bộ lọc</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Thử thay đổi từ khóa tìm kiếm hoặc bấm "Xóa lọc"
                    </p>
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
                        <td colSpan={7} className="py-2 px-3 sm:px-4">
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

                              <span className="font-bold text-xs sm:text-[13px] text-slate-900 truncate">
                                {group.label}
                              </span>

                              <span className="px-2 py-0.2 rounded-full text-[10.5px] font-bold bg-white text-slate-600 border border-slate-200/90 shadow-2xs shrink-0">
                                {group.count}
                              </span>
                            </div>

                            {/* Right: Group Summary Hint */}
                            <span className="text-[11px] text-slate-400 truncate max-w-sm hidden md:inline-block pr-2 font-normal">
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

                          const rowHeightClass = density === "compact" ? "py-2.5" : "py-3.5"
                          const priorityStr = (req.priority || "Normal").toLowerCase()

                          return (
                            <tr
                              key={req.request_id || `req-${rowIdx}`}
                              onClick={() => onSelectRequest(req)}
                              className={`group hover:bg-blue-50/40 transition-colors cursor-pointer ${
                                rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/35"
                              }`}
                            >
                              {/* 1. Task Title: NO ICON IN FRONT (per user instruction) + hover arrow */}
                              <td className={`${rowHeightClass} px-4 sm:px-5`}>
                                <div className="space-y-0.5 min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs sm:text-[13px] font-semibold text-slate-900 group-hover:text-[#1057FB] transition-colors leading-snug line-clamp-1 truncate">
                                      {req.title}
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-[#1057FB] shrink-0 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                                  </div>

                                  {showContext && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-normal truncate">
                                      <span className="font-mono text-slate-500 font-semibold tracking-tight">
                                        {req.request_id}
                                      </span>
                                      <span>•</span>
                                      <span className="text-slate-500 truncate max-w-[130px]">
                                        {req.current_phase || "Khâu 1. Phân loại"}
                                      </span>
                                      <span className="hidden sm:inline">•</span>
                                      <span className="hidden sm:inline text-slate-400">
                                        {formatDateLabel(req.last_updated)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 2. Owner */}
                              <td className={`${rowHeightClass} px-3`}>
                                {isAssigned ? (
                                  <div className="flex items-center gap-2 min-w-0">
                                    <UserAvatar name={displayName} avatarUrl={designerAvatar} size="sm" />
                                    <span className="text-xs font-semibold text-slate-800 truncate max-w-[110px]">
                                      {displayName}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">Chưa phân công</span>
                                )}
                              </td>

                              {/* 3. Squad / Phân hệ (Env) */}
                              <td className={`${rowHeightClass} px-3 text-right`}>
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                  <span className="truncate max-w-[95px]">{req.squad_name || req.preferred_squad || "UX Team"}</span>
                                </span>
                              </td>

                              {/* 4. Started / Date */}
                              <td className={`${rowHeightClass} px-3 text-right`}>
                                <div className="inline-flex items-center justify-end gap-1.5 text-xs text-slate-600 font-medium font-mono">
                                  <CalendarClock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{formatDateLabel(req.last_updated)}</span>
                                </div>
                              </td>

                              {/* 5. Steps / Radial SVG Progress */}
                              <td className={`${rowHeightClass} px-3 text-right`}>
                                <RadialStepsProgress progress={progressVal} />
                              </td>

                              {/* 6. Priority / Attention */}
                              <td className={`${rowHeightClass} px-3 text-right`}>
                                {priorityStr === "urgent" || priorityStr === "khẩn cấp" ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                    Khẩn cấp
                                  </span>
                                ) : priorityStr === "high" || priorityStr === "cao" ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                    Cao
                                  </span>
                                ) : priorityStr === "low" || priorityStr === "thấp" ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                                    Thấp
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                    Normal
                                  </span>
                                )}
                              </td>

                              {/* 7. Row Actions Menu */}
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
          {/* Left: Queue Mix Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700">Queue Mix:</span>
            {groupedData.map((g) => (
              <span
                key={g.id}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium text-[11px] shadow-2xs"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${g.dotClass}`} />
                <span>{g.label.split(" / ")[0]}:</span>
                <span className="font-bold text-slate-900">{g.count}</span>
              </span>
            ))}
          </div>

          {/* Right: Total Visible */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <span className="font-semibold text-slate-700">
              {totalVisible} hiển thị
            </span>
            <span>trên</span>
            <span className="font-mono text-slate-600">{requests.length} bài toán</span>
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
