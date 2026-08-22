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
  return STATUS_CONFIG[status] ?? DEFAULT_STATUS_CONFIG
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
