import * as React from "react"
import { useMemo } from "react"
import {
  Frame,
  FrameHeader,
  FrameTitle,
  FrameDescription,
  FrameActions,
  FrameBody,
  FrameFooter,
} from "@/components/reui/frame"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/common/UserAvatar"
import type { UXRequest } from "@/data/mockData"
import { cn } from "@/lib/utils"
import {
  Rocket,
  Calendar,
  ChevronRight,
  Radio,
  Smartphone,
  Building2,
  Globe,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react"

/**
 * Props for Block4ProductionReleases component.
 */
export interface Block4ProductionReleasesProps {
  /**
   * Filtered or full list of UX requests for currently selected product or all.
   */
  requests: UXRequest[]
  /**
   * Callback fired when clicking any release item, opening the RequestDetail drawer.
   */
  onSelectRequest?: (req: UXRequest) => void
  /**
   * Maximum number of released items to display before scroll (default: 5).
   */
  maxItems?: number
  /**
   * Optional custom className override for the Frame container.
   */
  className?: string
}

/**
 * Normalized channel information for visual categorization.
 */
export interface ChannelMeta {
  channelKey: "app" | "biz" | "web" | "baas" | "other"
  label: string
  badgeClass: string
  dotClass: string
  icon: React.ComponentType<{ className?: string }>
}

/**
 * Resolves the digital channel metadata for a given task/product.
 */
export function getChannelMeta(product?: string | null, preferredSquad?: string | null): ChannelMeta {
  const p = ((product || "") + " " + (preferredSquad || "")).toLowerCase().trim()

  if (p.includes("biz") || p.includes("corporate") || p.includes("doanh nghiệp")) {
    return {
      channelKey: "biz",
      label: "Biz MBBank",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200/80",
      dotClass: "bg-purple-500",
      icon: Building2,
    }
  }

  if (p.includes("baas") || p.includes("open api") || p.includes("api partner")) {
    return {
      channelKey: "baas",
      label: "BaaS Platform",
      badgeClass: "bg-teal-50 text-teal-700 border-teal-200/80",
      dotClass: "bg-teal-500",
      icon: Layers,
    }
  }

  if (p.includes("web") || p.includes("portal") || p.includes("online banking")) {
    return {
      channelKey: "web",
      label: "Web MBBank",
      badgeClass: "bg-sky-50 text-sky-700 border-sky-200/80",
      dotClass: "bg-sky-500",
      icon: Globe,
    }
  }

  if (
    p.includes("app") ||
    p.includes("lending") ||
    p.includes("transfer") ||
    p.includes("digi") ||
    p.includes("wealth") ||
    p.includes("thẻ") ||
    p.includes("saving") ||
    p.includes("tiết kiệm") ||
    p.includes("vay")
  ) {
    return {
      channelKey: "app",
      label: product && product.length > 2 ? product : "App MBBank",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
      dotClass: "bg-blue-500",
      icon: Smartphone,
    }
  }

  return {
    channelKey: "other",
    label: product && product.length > 2 ? product : "Kênh số MB",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200/80",
    dotClass: "bg-slate-400",
    icon: Sparkles,
  }
}

/**
 * Safely parses any date string (DD/MM/YYYY, DD/MM/YYYY HH:mm:ss, or ISO) to milliseconds.
 * Returns 0 if invalid or empty.
 */
export function parseReleaseDateMs(dateStr?: string | null): number {
  if (!dateStr || typeof dateStr !== "string") return 0
  const trimmed = dateStr.trim()
  if (!trimmed) return 0

  const dmyMatch = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/
  )
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10)
    const month = parseInt(dmyMatch[2], 10) - 1
    const year = parseInt(dmyMatch[3], 10)
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0
    const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0
    return new Date(year, month, day, hour, minute, second).getTime()
  }

  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/
  )
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10)
    const month = parseInt(isoMatch[2], 10) - 1
    const day = parseInt(isoMatch[3], 10)
    const hour = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0
    const minute = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0
    const second = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0
    return new Date(year, month, day, hour, minute, second).getTime()
  }

  const parsed = new Date(trimmed).getTime()
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Formats a release date into canonical DD/MM/YYYY.
 */
export function formatReleaseDate(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== "string") return "Chưa cập nhật"
  const trimmed = dateStr.trim()
  if (!trimmed) return "Chưa cập nhật"

  const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0")
    const month = dmyMatch[2].padStart(2, "0")
    const year = dmyMatch[3]
    return `${day}/${month}/${year}`
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    const year = isoMatch[1]
    const month = isoMatch[2].padStart(2, "0")
    const day = isoMatch[3].padStart(2, "0")
    return `${day}/${month}/${year}`
  }

  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, "0")
    const month = String(parsed.getMonth() + 1).padStart(2, "0")
    const year = parsed.getFullYear()
    return `${day}/${month}/${year}`
  }

  return trimmed
}

/**
 * Determines whether a request qualifies as released / go-live in production.
 */
export function isReleasedRequest(req: UXRequest): boolean {
  if (!req) return false
  const status = (req.status || "").trim().toLowerCase()
  const progress = typeof req.progress === "number" ? req.progress : parseInt(String(req.progress || 0), 10) || 0
  const phase = (req.current_phase || "").trim().toLowerCase()

  // Explicit completion or release status
  if (
    status === "hoàn thành" ||
    status === "hoành thành" ||
    status === "done" ||
    status.includes("release") ||
    status.includes("go-live")
  ) {
    return true
  }

  // 100% progress completed
  if (progress >= 100) return true

  // Has explicit release date and reached final phase
  if (req.release_date && (phase.includes("bàn giao") || phase.includes("nghiệm thu") || phase.includes("ready to dev"))) {
    return true
  }

  return false
}

/**
 * Block 4: "Tính năng đã Go-live" (Released to Production)
 *
 * ReUI AI-Ops Architecture replacement for "Provider Failover":
 * - Displays a continuous vertical timeline feed of features recently deployed to live MBBank digital channels.
 * - Channels covered: App MBBank, Web Portal, Biz MBBank, BaaS Platform.
 * - Fields per item:
 *   1. Feature Title (with hover transition and tooltip support)
 *   2. Digital Channel Badge (App / Biz / Web / BaaS)
 *   3. Actual Release Date (formatted DD/MM/YYYY)
 *   4. Lead Designer Avatar & Name (UserAvatar)
 *   5. Distinctive "Đã Release" Badge (variant="success", emerald with pulsing green dot)
 * - Interactive: Clicking any item fires onSelectRequest(req) to open the RequestDetail drawer.
 * - Zero state: Clean empty state ("Chưa có tính năng phát hành trong bộ lọc").
 */
export function Block4ProductionReleases({
  requests,
  onSelectRequest,
  maxItems = 5,
  className,
}: Block4ProductionReleasesProps) {
  // 1. Filter and sort released tasks chronologically (newest release first)
  const releasedTasks = useMemo(() => {
    if (!requests || !Array.isArray(requests)) return []

    const matching = requests.filter(isReleasedRequest)

    return matching.sort((a, b) => {
      const timeB = parseReleaseDateMs(b.release_date || b.last_updated || b.submitted_at)
      const timeA = parseReleaseDateMs(a.release_date || a.last_updated || a.submitted_at)
      return timeB - timeA
    })
  }, [requests])

  const releasedCount = releasedTasks.length
  const displayedTasks = releasedTasks.slice(0, maxItems)

  return (
    <Frame
      className={cn(
        "h-full flex flex-col justify-between hover:border-slate-300 transition-all duration-200",
        className
      )}
    >
      {/* =====================================================================
          FRAME HEADER
          ===================================================================== */}
      <FrameHeader className="pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center justify-between w-full">
          <div>
            <FrameTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs">
                <Rocket className="w-4 h-4" />
              </span>
              <span>Tính năng đã Go-live</span>
            </FrameTitle>
            <FrameDescription className="text-xs text-slate-500">
              Nhật ký phát hành trên các kênh số MBBank
            </FrameDescription>
          </div>

          <FrameActions>
            <Badge
              variant="outline"
              className="bg-emerald-50/80 text-emerald-700 border-emerald-200/90 font-medium text-[11px] px-2.5 py-0.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block animate-pulse" />
              <span className="font-mono font-bold mr-1">{releasedCount}</span> Đã Go-live
            </Badge>
          </FrameActions>
        </div>
      </FrameHeader>

      {/* =====================================================================
          FRAME BODY: VERTICAL TIMELINE FEED / ZERO STATE
          ===================================================================== */}
      <FrameBody className="space-y-3 flex-1 flex flex-col justify-center">
        {releasedCount === 0 ? (
          /* Clean Zero State */
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-xl bg-slate-50/60 border border-dashed border-slate-200 my-auto">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
              <Rocket className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs font-semibold text-slate-700">
              Chưa có tính năng phát hành trong bộ lọc
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] leading-relaxed">
              Các tính năng hoàn thành và go-live trên App/Web/Biz/BaaS sẽ tự động hiển thị tại nhật ký phát hành này.
            </p>
          </div>
        ) : (
          /* Vertical Timeline Feed */
          <div className="relative pl-2 pr-1 py-1 space-y-3 overflow-y-auto max-h-[380px] scrollbar-thin">
            {/* Continuous Vertical Timeline Line */}
            <div
              className="absolute left-[21px] top-3 bottom-4 w-0.5 bg-slate-100"
              aria-hidden="true"
            />

            {displayedTasks.map((task) => {
              const channel = getChannelMeta(task.product, task.preferred_squad)
              const ChannelIcon = channel.icon
              const releaseDateFormatted = formatReleaseDate(
                task.release_date || task.expected_deadline || task.last_updated
              )
              const designerName = task.assigned_designer || task.ux_owner || "UX Designer"

              return (
                <div
                  key={task.request_id}
                  onClick={() => onSelectRequest?.(task)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onSelectRequest?.(task)
                    }
                  }}
                  aria-label={`Xem chi tiết tính năng ${task.title}`}
                  className="group relative flex items-start gap-3 p-2 rounded-xl transition-all duration-150 cursor-pointer hover:bg-slate-50/90 border border-transparent hover:border-slate-200/80 hover:shadow-2xs"
                >
                  {/* Timeline Step Node */}
                  <div
                    className="relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 border-2 border-white shadow-2xs ring-1 ring-emerald-300 text-emerald-600 group-hover:bg-emerald-100 group-hover:ring-emerald-400 transition-all shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    <Rocket className="w-3 h-3" />
                  </div>

                  {/* Timeline Content Block */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Top Row: Channel Badge + Release Date + Đã Release Badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {/* Channel Badge */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border shrink-0",
                            channel.badgeClass
                          )}
                        >
                          <ChannelIcon className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[90px]">{channel.label}</span>
                        </span>

                        {/* Release Date */}
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-mono shrink-0">
                          <Calendar className="w-2.5 h-2.5 text-slate-400" />
                          <span>{releaseDateFormatted}</span>
                        </span>
                      </div>

                      {/* Distinctive "Đã Release" Badge */}
                      <Badge
                        variant="success"
                        size="xs"
                        dot
                        dotColor="bg-emerald-500"
                        dotPulse
                        className="font-semibold text-[10px] px-1.5 py-0.2 shrink-0 group-hover:bg-emerald-100/80 transition-colors"
                      >
                        Đã Release
                      </Badge>
                    </div>

                    {/* Feature Title */}
                    <h4 className="text-xs font-semibold text-slate-800 group-hover:text-emerald-800 transition-colors line-clamp-1">
                      {task.title}
                    </h4>

                    {/* Meta Row: Designer Info + Request ID + Arrow Link */}
                    <div className="flex items-center justify-between pt-0.5 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <UserAvatar name={designerName} size="xs" />
                        <span className="text-xs text-slate-600 font-medium truncate max-w-[120px]">
                          {designerName}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          {task.request_id}
                        </span>
                      </div>

                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </FrameBody>

      {/* =====================================================================
          FRAME FOOTER
          ===================================================================== */}
      <FrameFooter className="pt-3 border-t border-slate-100 mt-auto flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
          <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>100% Kênh số bảo mật & tuân thủ</span>
        </span>
        <span className="font-mono text-slate-400 text-[10px]">Live Production Feed</span>
      </FrameFooter>
    </Frame>
  )
}

export default Block4ProductionReleases
