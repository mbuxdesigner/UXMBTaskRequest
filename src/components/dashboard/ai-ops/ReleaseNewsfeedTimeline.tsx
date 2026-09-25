"use client"

import React, { useMemo, useRef, useEffect } from "react"
import { Check, Loader2, Calendar } from "lucide-react"
import { getRequestDisplayTitle, type UXRequest } from "@/data/mockData"
import { getStoredSession } from "@/services/otpAuthService"
import { canUserAccessRequest, generateMaskedTitle } from "@/lib/accessControl"
import UserAvatar from "@/components/common/UserAvatar"
import { getRequestPendingClassification } from "@/config/statusConfig"

interface TaskCardItem {
  id: string
  title: string
  designerName: string
  designerAvatar: string
  rawRequest?: UXRequest
}

interface TimelineDateGroup {
  dateKey: string
  displayDate: string
  parsedTimestamp: number
  status: "future" | "current" | "past"
  tasks: TaskCardItem[]
}

interface ReleaseNewsfeedTimelineProps {
  requests?: UXRequest[]
  onSelectRequest?: (req: UXRequest) => void
}

interface SettingUser {
  name: string
  avatarUrl: string
}

// Danh sách tài khoản chuẩn mực fallback theo Admin Setting & DEMO_ACCOUNTS
const DEFAULT_SETTING_USERS: SettingUser[] = [
  {
    name: "Hoàng Thu Trang",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80",
  },
  {
    name: "Nguyễn Văn Cường",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Trần Mai Lan",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
  },
  {
    name: "Vũ Quốc Anh",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80",
  },
  {
    name: "Nguyễn Minh Tuấn",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80",
  },
  {
    name: "Admin Quản Trị",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
  },
]

/**
 * Đọc danh sách nhân sự thực tế đã cấu hình trong Cài đặt hệ thống (mbbank_admin_team / mbbank_team_members)
 */
function getSettingTeamMembers(): SettingUser[] {
  if (typeof window === "undefined") return DEFAULT_SETTING_USERS
  try {
    const storageKeys = ["mbbank_admin_team", "mbbank_team_members"]
    for (const key of storageKeys) {
      const cached = localStorage.getItem(key)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .map((m: any) => ({
              name: String(m.name || m.displayName || "").trim(),
              avatarUrl: String(m.avatarUrl || m.avatar || m.avatar_url || "").trim(),
            }))
            .filter((m) => m.name.length > 0)
        }
      }
    }
  } catch {}
  return DEFAULT_SETTING_USERS
}

/**
 * Tra cứu chính xác Tên và Avatar từ Cài đặt hệ thống (Admin Setting)
 */
function resolveSettingUser(rawNameOrEmail: string = ""): SettingUser {
  if (!rawNameOrEmail || rawNameOrEmail.trim() === "" || rawNameOrEmail === "Chưa phân công") {
    return { name: "Chưa phân công", avatarUrl: "" }
  }

  const clean = rawNameOrEmail.replace(/\(.*?\)/g, "").split("/")[0].trim()
  const cleanLower = clean.toLowerCase()

  const members = getSettingTeamMembers()

  // 1. Khớp chính xác tên
  const exact = members.find((m) => m.name.toLowerCase() === cleanLower)
  if (exact) return exact

  // 2. Khớp từ khóa chứa (VD: "Trang" -> "Hoàng Thu Trang", "Cường" -> "Nguyễn Văn Cường")
  const partial = members.find((m) => {
    const mName = m.name.toLowerCase()
    return mName.includes(cleanLower) || cleanLower.includes(mName)
  })
  if (partial) return partial

  // 3. Khớp trong danh sách tài khoản chuẩn fallback
  const defaultMatch = DEFAULT_SETTING_USERS.find((m) => {
    const mName = m.name.toLowerCase()
    return mName.includes(cleanLower) || cleanLower.includes(mName)
  })
  if (defaultMatch) return defaultMatch

  return { name: clean, avatarUrl: "" }
}

// Chuyển chuỗi ngày (DD/MM/YYYY hoặc YYYY-MM-DD) thành timestamp để sắp xếp
function parseDateStringToTimestamp(dateStr: string): number {
  if (!dateStr) return 0
  const clean = dateStr.trim()

  if (clean.includes("/")) {
    const parts = clean.split("/")
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const year = parseInt(parts[2], 10)
      return new Date(year, month, day).getTime()
    }
  }

  if (clean.includes("-")) {
    const parts = clean.split("-")
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      return new Date(year, month, day).getTime()
    }
  }

  const d = new Date(clean)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

function formatDateDisplay(timestamp: number): string {
  if (!timestamp) return "Kế hoạch"
  const d = new Date(timestamp)
  const day = d.getDate().toString().padStart(2, "0")
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Kiểm tra xem bài toán có phải là pending hoặc chưa phân bổ hay không.
 * Theo yêu cầu người dùng: NewsFeed không hiển thị các bài toán pending hoặc chưa phân bổ.
 */
function isPendingOrUnallocated(r: UXRequest): boolean {
  if (!r) return true

  // 1. Kiểm tra Pending (PO Pending, Designer Pending, hoặc trạng thái pending / tạm dừng)
  const pendingCls = getRequestPendingClassification(r)
  if (pendingCls.isPending) return true

  const rawStatus = (r.status || "").toLowerCase().trim()
  const rawPhase = (r.current_phase || "").toLowerCase().trim()
  const hasPendingReason = Boolean(r.pending_reason && r.pending_reason.trim().length > 0)

  if (
    hasPendingReason ||
    rawStatus.includes("pending") ||
    rawStatus.includes("tạm dừng") ||
    rawStatus.includes("chờ phản hồi") ||
    rawStatus.includes("po pending") ||
    rawPhase.includes("pending") ||
    rawPhase.includes("tạm dừng")
  ) {
    return true
  }

  // 2. Kiểm tra Chưa phân bổ (Unallocated):
  // - Chưa có designer phụ trách hoặc tên mang nghĩa chưa gán/phân bổ
  const designer = (r.assigned_designer || r.ux_owner || "").trim().toLowerCase()
  const isDesignerMissing =
    !designer ||
    designer === "chưa gán" ||
    designer === "chưa phân công" ||
    designer === "chưa phân bổ" ||
    designer === "chưa tiếp nhận" ||
    designer === "unassigned" ||
    designer === "none" ||
    designer === "-" ||
    designer === "chưa có"

  if (isDesignerMissing) {
    return true
  }

  // - Hoặc trạng thái/khâu quy trình thuộc giai đoạn chờ tiếp nhận / chờ phân bổ / mới tạo
  if (
    rawStatus.includes("chờ tiếp nhận") ||
    rawStatus.includes("chờ phân bổ") ||
    rawStatus.includes("chờ xác nhận") ||
    rawStatus.includes("đang phân loại") ||
    rawStatus.includes("mới tạo") ||
    rawStatus.includes("đã gửi yêu cầu") ||
    rawStatus === "đã gửi" ||
    rawPhase.includes("chờ tiếp nhận") ||
    rawPhase.includes("chờ xác nhận") ||
    rawPhase.includes("chờ phân bổ")
  ) {
    return true
  }

  return false
}

export default function ReleaseNewsfeedTimeline({
  requests = [],
  onSelectRequest,
}: ReleaseNewsfeedTimelineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeNodeRef = useRef<HTMLDivElement | null>(null)

  // Ngày tham chiếu hiện tại của hệ thống: 16/09/2026
  const CURRENT_SYSTEM_DATE = useMemo(() => new Date(2026, 8, 16).getTime(), [])

  // Nhóm các bài toán theo ngày release dự kiến
  const timelineGroups = useMemo<TimelineDateGroup[]>(() => {
    // 1. Thu thập các task có ngày từ requests
    const taskMap = new Map<string, { timestamp: number; tasks: TaskCardItem[] }>()

    const rawList = requests.length > 0 ? requests : []

    rawList.forEach((r) => {
      // Bỏ qua các dự án pending hoặc chưa phân bổ theo yêu cầu
      if (isPendingOrUnallocated(r)) return

      const rawDate = r.release_date || r.expected_deadline || r.submitted_at || ""
      if (!rawDate) return
      const ts = parseDateStringToTimestamp(rawDate)
      if (!ts) return

      const formatted = formatDateDisplay(ts)
      if (!taskMap.has(formatted)) {
        taskMap.set(formatted, { timestamp: ts, tasks: [] })
      }

      const user = resolveSettingUser(r.assigned_designer || r.ux_owner || "MB Designer")
      taskMap.get(formatted)!.tasks.push({
        id: r.request_id || r.id || "",
        title: getRequestDisplayTitle(r),
        designerName: user.name,
        designerAvatar: user.avatarUrl,
        rawRequest: r,
      })
    })

    // 2. Chuyển thành mảng và sắp xếp TIMELINE NGƯỢC:
    // List ngày xa nhất ở trên cùng, ngày đã qua ở dưới cùng (giảm dần theo timestamp)
    const sortedList: TimelineDateGroup[] = Array.from(taskMap.entries())
      .map(([formattedDate, item]) => ({
        dateKey: formattedDate,
        displayDate: formattedDate,
        parsedTimestamp: item.timestamp,
        status: "past" as const,
        tasks: item.tasks,
      }))
      .sort((a, b) => b.parsedTimestamp - a.parsedTimestamp)

    // 4. Xác định mốc "gần hiện tại / sắp tới":
    // Tìm mốc ngày có timestamp >= CURRENT_SYSTEM_DATE gần với CURRENT_SYSTEM_DATE nhất
    let nearestCurrentIdx = -1
    let minDiff = Infinity

    sortedList.forEach((g, idx) => {
      // Ưu tiên mốc ngày bằng hoặc sau ngày hiện tại
      const diff = g.parsedTimestamp - CURRENT_SYSTEM_DATE
      if (diff >= 0 && diff < minDiff) {
        minDiff = diff
        nearestCurrentIdx = idx
      }
    })

    // Nếu không có ngày tương lai, chọn ngày gần nhất bất kỳ
    if (nearestCurrentIdx === -1 && sortedList.length > 0) {
      let absMin = Infinity
      sortedList.forEach((g, idx) => {
        const absDiff = Math.abs(g.parsedTimestamp - CURRENT_SYSTEM_DATE)
        if (absDiff < absMin) {
          absMin = absDiff
          nearestCurrentIdx = idx
        }
      })
    }

    // Gán trạng thái:
    // - Item tại nearestCurrentIdx -> "current" (có spint xoay tròn)
    // - Các item có index < nearestCurrentIdx (tương lai xa hơn ở phía trên) -> "future" (circle rỗng)
    // - Các item có index > nearestCurrentIdx (quá khứ đã qua ở phía dưới) -> "past" (check icon)
    return sortedList.map((g, idx) => {
      if (idx === nearestCurrentIdx) {
        return { ...g, status: "current" }
      }
      if (idx < nearestCurrentIdx) {
        return { ...g, status: "future" }
      }
      return { ...g, status: "past" }
    })
  }, [requests, CURRENT_SYSTEM_DATE])

  // Tự động scroll đến mốc ngày gần hiện tại khi vào màn hình
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeNodeRef.current && containerRef.current) {
        const container = containerRef.current
        const target = activeNodeRef.current

        const containerRect = container.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()

        const relativeTop = targetRect.top - containerRect.top
        const targetScroll = container.scrollTop + relativeTop - (container.clientHeight / 2) + (target.clientHeight / 2)

        container.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: "smooth",
        })
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [timelineGroups])

  return (
    <div
      data-testid="ai-ops-newsfeed-timeline"
      className="rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 flex flex-col h-full min-w-0"
    >
      {/* Header on gray background */}
      <div className="px-3.5 py-2 flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">NewsFeed</h3>
          <span className="text-[11px] font-medium text-neutral-500 bg-white/80 border border-neutral-200/60 px-2 py-0.5 rounded-md flex items-center gap-1">
            <Calendar className="size-3 text-neutral-400" />
            Lịch Release
          </span>
        </div>
        <p className="text-xs text-neutral-400 font-normal">Timeline phát hành tính năng theo ngày dự kiến</p>
      </div>

      {/* Inner White Card: Chiều cao khớp với Squad Trending (~340px) */}
      <div className="rounded-xl border border-neutral-200/70 bg-white p-4 shadow-2xs flex-1 flex flex-col justify-between overflow-hidden">
        {/* Scrollable Container */}
        <div
          ref={containerRef}
          className="w-full flex-1 overflow-y-auto pl-1 pr-1.5 space-y-4 max-h-[250px] min-h-[240px] scrollbar-thin scrollbar-thumb-neutral-200 hover:scrollbar-thumb-neutral-300"
        >
          {timelineGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4">
              <div className="size-10 rounded-full bg-neutral-100 flex items-center justify-center mb-2">
                <Calendar className="size-5 text-neutral-400" />
              </div>
              <p className="text-xs font-medium text-neutral-700">Chưa có bài toán theo lịch release</p>
              <p className="text-[11px] text-neutral-400 mt-0.5 max-w-[200px]">
                Các bài toán có ngày release dự kiến sẽ tự động hiển thị theo dòng thời gian tại đây.
              </p>
            </div>
          ) : (
            timelineGroups.map((group, idx) => {
            const isLast = idx === timelineGroups.length - 1
            const isCurrent = group.status === "current"
            const isPast = group.status === "past"

            return (
              <div
                key={group.dateKey ? `grp-${group.dateKey}` : `grp-idx-${idx}`}
                ref={isCurrent ? activeNodeRef : undefined}
                className="relative flex items-start gap-2.5 group/timeline-node"
              >
                {/* Cột Timeline Indicator & Đường nối dọc separator liên tục */}
                <div className="relative flex flex-col items-center shrink-0 w-7 self-stretch">
                  {/* Đường nối dọc separator liên tục chạm vào node tiếp theo */}
                  {!isLast && (
                    <div
                      className={`absolute top-3 -bottom-6 w-[1.5px] left-1/2 -translate-x-1/2 z-0 ${
                        isPast ? "bg-neutral-900" : "bg-neutral-200"
                      }`}
                      aria-hidden="true"
                    />
                  )}

                  {/* Indicator Node */}
                  <div className="relative z-10 flex items-center justify-center">
                    {isCurrent ? (
                      // Ngày sắp tới gần hiện tại: node đen với spinner xoay tròn đồng trục tuyệt đối
                      <div
                        className="w-[22px] h-[22px] shrink-0 rounded-full bg-neutral-900 text-white flex items-center justify-center ring-4 ring-neutral-900/15 shadow-sm"
                        title="Mốc ngày sắp tới gần hiện tại"
                      >
                        <svg
                          className="w-3 h-3 animate-spin text-white block shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          style={{ transformOrigin: "center" }}
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="8.5"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          />
                          <circle
                            className="opacity-100"
                            cx="12"
                            cy="12"
                            r="8.5"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeDasharray="53.4"
                            strokeDashoffset="35"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    ) : isPast ? (
                      // Ngày đã qua: node đen với dấu checkmark
                      <div
                        className="w-[22px] h-[22px] shrink-0 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-2xs"
                        title="Đã qua / Đã hoàn thành"
                      >
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    ) : (
                      // Ngày xa hơn trong tương lai: node tròn viền xám rỗng
                      <div
                        className="w-[22px] h-[22px] shrink-0 rounded-full border-2 border-neutral-300 bg-white flex items-center justify-center"
                        title="Kế hoạch tương lai"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Nội dung bên phải */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Text bé (ngày) */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-neutral-400 font-medium tracking-tight">
                      {group.displayDate}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 rounded-full">
                        <span className="size-1.5 rounded-full bg-blue-600 animate-pulse" />
                        Sắp release
                      </span>
                    )}
                  </div>

                  {/* Card hiển thị danh sách task release không lồng box con, phân tách bằng divider */}
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 overflow-hidden divide-y divide-neutral-200/80 shadow-2xs">
                    {group.tasks.map((task, taskIdx) => (
                      <div
                        key={task.rawRequest?.request_id || task.id || `feed-task-${taskIdx}`}
                        className="flex items-center justify-between gap-2.5 px-3 py-2 hover:bg-neutral-100/70 transition-colors group/item"
                      >
                        {/* Cột trái: [ Số thứ tự ] + Tên task - căn giữa thẳng hàng tuyệt đối */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="inline-flex items-center justify-center size-5 rounded-md border border-neutral-200 text-[10px] font-mono font-semibold text-neutral-600 bg-white shadow-2xs shrink-0 select-none">
                            {taskIdx + 1}
                          </span>

                          <span
                            onClick={() => {
                              if (task.rawRequest && onSelectRequest) {
                                onSelectRequest(task.rawRequest)
                              }
                            }}
                            className="text-xs font-medium text-neutral-800 line-clamp-1 hover:text-blue-600 cursor-pointer transition-colors leading-normal truncate select-none"
                            title={task.title}
                          >
                            {task.title}
                          </span>
                        </div>

                        {/* Cột phải: Ava + tên designer - căn giữa cùng trục */}
                        <div className="flex items-center gap-1.5 shrink-0 pl-1.5 select-none bg-white px-2 py-0.5 rounded-full border border-neutral-200/60 shadow-2xs">
                          <UserAvatar
                            name={task.designerName}
                            avatarUrl={task.designerAvatar}
                            size="xs"
                            className="!w-[18px] !h-[18px] !text-[9px] rounded-full object-cover shrink-0 ring-1 ring-neutral-200/80"
                            showBorder={false}
                          />
                          <span
                            className="text-[11px] text-neutral-600 truncate max-w-[90px] font-medium leading-none"
                            title={task.designerName}
                          >
                            {task.designerName}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          }))}
        </div>
      </div>
    </div>
  )
}

