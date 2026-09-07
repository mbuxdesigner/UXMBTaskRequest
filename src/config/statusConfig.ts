/**
 * statusConfig.ts — Single source of truth for status colors
 * 
 * Per UI-13: All components must import from here.
 * Never hard-code status colors in individual components.
 */

// ─── Request Status (UX workflow) ─────────────────────────────
export type RequestStatus =
  | "Chờ tiếp nhận"
  | "Đã gửi yêu cầu"
  | "Đã gửi"
  | "Mới tạo"
  | "Phân loại"
  | "Đang phân loại"
  | "Discovery"
  | "Đang khám phá"
  | "User Flow"
  | "UI Design"
  | "Prototype"
  | "Bàn giao"
  | "Đang thực hiện"
  | "Đang review"
  | "Hoàn thành"
  | "Bị chặn"

export interface StatusBadgeConfig {
  /** Badge variant name matching the Badge component */
  variant: "info" | "warning" | "success" | "purple" | "secondary" | "navy" | "teal" | "destructive"
  /** Tailwind class for the status dot */
  dotColor: string
  /** Inline badge classes for contexts that don't use the Badge component */
  inlineClasses: {
    bg: string
    text: string
    border: string
    dot: string
  }
}

/**
 * Unified status → color mapping.
 * 
 * Semantic logic:
 * - Slate    → Neutral / waiting (submitted, new, pending receipt)
 * - Amber    → Processing / attention (classifying)
 * - Blue     → Active / in progress
 * - Purple   → Review stage / discovery
 * - Green    → Success / done
 * - Red      → Blocked / error
 */
export const STATUS_CONFIG: Record<string, StatusBadgeConfig> = {
  "Chờ tiếp nhận": {
    variant: "secondary",
    dotColor: "bg-slate-400",
    inlineClasses: {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-200",
      dot: "bg-slate-400",
    },
  },
  "Đã gửi yêu cầu": {
    variant: "secondary",
    dotColor: "bg-slate-400",
    inlineClasses: {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-200",
      dot: "bg-slate-400",
    },
  },
  "Đã gửi": {
    variant: "secondary",
    dotColor: "bg-slate-400",
    inlineClasses: {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-200",
      dot: "bg-slate-400",
    },
  },
  "Mới tạo": {
    variant: "secondary",
    dotColor: "bg-slate-400",
    inlineClasses: {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-200",
      dot: "bg-slate-400",
    },
  },
  "Phân loại": {
    variant: "warning",
    dotColor: "bg-amber-500",
    inlineClasses: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      dot: "bg-amber-500",
    },
  },
  "Đang phân loại": {
    variant: "warning",
    dotColor: "bg-amber-500",
    inlineClasses: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      dot: "bg-amber-500",
    },
  },
  "Discovery": {
    variant: "purple",
    dotColor: "bg-purple-500",
    inlineClasses: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      dot: "bg-purple-500",
    },
  },
  "Đang khám phá": {
    variant: "purple",
    dotColor: "bg-purple-500",
    inlineClasses: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      dot: "bg-purple-500",
    },
  },
  "User Flow": {
    variant: "navy",
    dotColor: "bg-indigo-500",
    inlineClasses: {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      border: "border-indigo-200",
      dot: "bg-indigo-500",
    },
  },
  "UI Design": {
    variant: "info",
    dotColor: "bg-blue-600",
    inlineClasses: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      dot: "bg-blue-600",
    },
  },
  "Prototype": {
    variant: "teal",
    dotColor: "bg-teal-500",
    inlineClasses: {
      bg: "bg-teal-50",
      text: "text-teal-700",
      border: "border-teal-200",
      dot: "bg-teal-500",
    },
  },
  "Bàn giao": {
    variant: "success",
    dotColor: "bg-emerald-500",
    inlineClasses: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
    },
  },
  "Đang thực hiện": {
    variant: "info",
    dotColor: "bg-blue-500",
    inlineClasses: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      dot: "bg-blue-500",
    },
  },
  "Đang review": {
    variant: "purple",
    dotColor: "bg-purple-500",
    inlineClasses: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      dot: "bg-purple-500",
    },
  },
  "Hoàn thành": {
    variant: "success",
    dotColor: "bg-emerald-500",
    inlineClasses: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
    },
  },
  "Đã gửi PO": {
    variant: "purple",
    dotColor: "bg-purple-500",
    inlineClasses: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      dot: "bg-purple-500",
    },
  },
  "Pending": {
    variant: "secondary",
    dotColor: "bg-slate-400",
    inlineClasses: {
      bg: "bg-slate-100",
      text: "text-slate-700",
      border: "border-slate-300",
      dot: "bg-slate-400",
    },
  },
  "pending": {
    variant: "secondary",
    dotColor: "bg-slate-400",
    inlineClasses: {
      bg: "bg-slate-100",
      text: "text-slate-700",
      border: "border-slate-300",
      dot: "bg-slate-400",
    },
  },
  "PO pending": {
    variant: "warning",
    dotColor: "bg-amber-500",
    inlineClasses: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-300",
      dot: "bg-amber-500",
    },
  },
  "PO Pending": {
    variant: "warning",
    dotColor: "bg-amber-500",
    inlineClasses: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-300",
      dot: "bg-amber-500",
    },
  },
  "Bị chặn": {
    variant: "destructive",
    dotColor: "bg-rose-500",
    inlineClasses: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      dot: "bg-rose-500",
    },
  },
  "Chờ phân bổ": {
    variant: "purple",
    dotColor: "bg-purple-500",
    inlineClasses: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      dot: "bg-purple-500",
    },
  },
  "Pending PO": {
    variant: "warning",
    dotColor: "bg-amber-500",
    inlineClasses: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-300",
      dot: "bg-amber-500",
    },
  },
}

// ─── Phân loại chuẩn 2 loại Pending ─────────────────────────
// 1. PO Pending: Sau 24h kể từ khi Designer gửi figma cho PO nhưng chưa phản hồi (Màu Amber)
// 2. Pending: Lý do theo đoạn chat của designer khi dùng @pending: (Màu Slate)

export interface RequestPendingClassification {
  isPending: boolean
  type: "po_pending" | "designer_pending" | null
  label: "PO Pending" | "Pending" | ""
  reason: string
  sentTimeStr: string
  elapsedHours: number
  hoursRemaining: number
  badgeClasses: {
    bg: string
    text: string
    border: string
    dot: string
  }
}

function parseTimeMs(dateStr?: string | null): number {
  if (!dateStr || typeof dateStr !== "string") return 0
  const trimmed = dateStr.trim()
  if (!trimmed) return 0
  const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/)
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10)
    const month = parseInt(dmyMatch[2], 10) - 1
    const year = parseInt(dmyMatch[3], 10)
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0
    const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0
    return new Date(year, month, day, hour, minute, second).getTime()
  }
  const parsed = new Date(trimmed).getTime()
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Phân loại chính xác 2 loại trạng thái Pending cho toàn bộ ứng dụng:
 * 1. PO Pending: Designer đã gửi phương án cho PO, quá 24h chưa nhận được phản hồi
 * 2. Pending: Designer chủ động tạm dừng với lý do cụ thể trong đoạn chat (@pending:)
 */
export function getRequestPendingClassification(req: any): RequestPendingClassification {
  if (!req) {
    return {
      isPending: false,
      type: null,
      label: "",
      reason: "",
      sentTimeStr: "",
      elapsedHours: 0,
      hoursRemaining: 0,
      badgeClasses: { bg: "", text: "", border: "", dot: "" },
    }
  }

  const rawStatus = (req.status || "").toLowerCase().trim()

  // Đã hoàn thành thì không phải pending (trừ khi trạng thái hiện tại được đặt là pending / po pending)
  if ((rawStatus === "hoàn thành" || rawStatus === "done") && rawStatus !== "pending" && rawStatus !== "po pending") {
    return {
      isPending: false,
      type: null,
      label: "",
      reason: "",
      sentTimeStr: "",
      elapsedHours: 0,
      hoursRemaining: 0,
      badgeClasses: { bg: "", text: "", border: "", dot: "" },
    }
  }
  const hasSentToPo = Boolean(req.sent_to_po_at && String(req.sent_to_po_at).trim() !== "")
  
  // Tính toán thời gian gửi PO
  let sentMs = 0
  let elapsedHours = 0
  let sentTimeStr = ""
  if (hasSentToPo || rawStatus === "đã gửi po") {
    sentMs = parseTimeMs(req.sent_to_po_at) || (rawStatus === "đã gửi po" ? Date.now() : 0)
    if (sentMs > 0) {
      elapsedHours = Math.max(0, (Date.now() - sentMs) / (1000 * 60 * 60))
      const sentDate = new Date(sentMs)
      sentTimeStr = !isNaN(sentDate.getTime()) ? sentDate.toLocaleString("vi-VN") : ""
    }
  }

  // 1. Trích xuất lý do pending từ chat (@pending: ...) nếu có
  let chatPendingReason = (req.pending_reason || "").trim()
  let hasDesignerPendingCommand = false

  const extractReason = (text: string) => {
    const trimmed = (text || "").trim()
    const m = trimmed.match(/@pending(?::|\s+)\s*([^.\n]*)/i) || trimmed.match(/\[Pending\]\s*([^.\n]*)/i)
    if (m && m[1] && m[1].trim()) {
      return m[1].trim().replace(/^:\s*/, "")
    }
    return ""
  }

  if (!chatPendingReason && Array.isArray(req.task_updates) && req.task_updates.length > 0) {
    for (const u of req.task_updates) {
      const note = (u.note || "").trim()
      if (/@pending\b/i.test(note) || /\[Pending\]/i.test(note)) {
        hasDesignerPendingCommand = true
        const r = extractReason(note)
        if (r) {
          chatPendingReason = r
          break
        }
      }
    }
  }

  if (!chatPendingReason && req.latest_update?.message) {
    const msg = (req.latest_update.message || "").trim()
    if (/@pending\b/i.test(msg) || /\[Pending\]/i.test(msg)) {
      hasDesignerPendingCommand = true
      const r = extractReason(msg)
      if (r) {
        chatPendingReason = r
      }
    }
  }

  // ==========================================
  // LOẠI 1: PO PENDING (Hổ phách / Cảnh báo 24h)
  // Xảy ra khi: sau 24h kể từ khi Designer gửi lại figma cho PO nhưng chưa phản hồi
  // ==========================================
  const isExplicitPoPending = rawStatus === "po pending" || rawStatus.includes("po pending")
  const isOverduePo = (rawStatus === "đã gửi po" || hasSentToPo) && elapsedHours >= 24 && !hasDesignerPendingCommand

  if (isExplicitPoPending || isOverduePo) {
    return {
      isPending: true,
      type: "po_pending",
      label: "PO Pending",
      reason: "Quá hạn 24h PO chưa phản hồi duyệt phương án",
      sentTimeStr,
      elapsedHours: Math.round(elapsedHours * 10) / 10,
      hoursRemaining: 0,
      badgeClasses: {
        bg: "bg-amber-50",
        text: "text-amber-800",
        border: "border-amber-300",
        dot: "bg-amber-500",
      },
    }
  }

  // ==========================================
  // LOẠI 2: PENDING (Xám Slate / Tạm dừng theo đoạn chat Designer)
  // Xảy ra khi: status là "Pending", hoặc Designer gõ @pending:
  // Lí do: theo đoạn chat của designer khi viết @pending
  // ==========================================
  const isExplicitPending = rawStatus === "pending" || hasDesignerPendingCommand
  if (isExplicitPending) {
    return {
      isPending: true,
      type: "designer_pending",
      label: "Pending",
      reason: chatPendingReason || "Tạm dừng theo yêu cầu của Designer",
      sentTimeStr: "",
      elapsedHours: 0,
      hoursRemaining: 0,
      badgeClasses: {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-300",
        dot: "bg-slate-500",
      },
    }
  }

  return {
    isPending: false,
    type: null,
    label: "",
    reason: "",
    sentTimeStr: "",
    elapsedHours: 0,
    hoursRemaining: 0,
    badgeClasses: { bg: "", text: "", border: "", dot: "" },
  }
}

/** Default fallback config for unknown statuses */
export const DEFAULT_STATUS_CONFIG: StatusBadgeConfig = {
  variant: "secondary",
  dotColor: "bg-slate-400",
  inlineClasses: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
}

/** Get status config with fallback */
export function getStatusConfig(status: string): StatusBadgeConfig {
  if (!status) return DEFAULT_STATUS_CONFIG
  const trimmed = status.trim()
  if (STATUS_CONFIG[trimmed]) return STATUS_CONFIG[trimmed]
  const lower = trimmed.toLowerCase()
  for (const [key, val] of Object.entries(STATUS_CONFIG)) {
    if (key.toLowerCase() === lower) return val
  }
  return DEFAULT_STATUS_CONFIG
}

// ─── Squad Capacity Status ───────────────────────────────────

export type CapacityStatusLabel = "Sẵn sàng" | "Bình thường" | "Đang bận" | "Quá tải"

export const CAPACITY_STATUS_CONFIG: Record<
  CapacityStatusLabel,
  { variant: "success" | "warning" | "destructive" | "default"; dotColor: string }
> = {
  "Sẵn sàng": { variant: "success", dotColor: "bg-emerald-500" },
  "Bình thường": { variant: "warning", dotColor: "bg-amber-500" },
  "Đang bận": { variant: "warning", dotColor: "bg-amber-500" },
  "Quá tải": { variant: "destructive", dotColor: "bg-rose-500" },
}

/** Get capacity status config with fallback */
export function getCapacityStatusConfig(status: string) {
  return (
    CAPACITY_STATUS_CONFIG[status as CapacityStatusLabel] ?? {
      variant: "default" as const,
      dotColor: "bg-slate-400",
    }
  )
}
