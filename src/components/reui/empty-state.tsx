import React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { IconStack } from "./icon-stack"
import { Bell, CalendarDays, Layers } from "lucide-react"

export interface EmptyStateProps {
  title?: string
  description?: string
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  className?: string
  illustration?: "cards" | "icon-stack"
  icon?: React.ReactNode
}

export function EmptyState({
  title = "Chưa có bài toán nào",
  description = "Không tìm thấy yêu cầu phù hợp với bộ lọc hiện tại. Hãy thử thay đổi từ khóa hoặc xóa bộ lọc.",
  primaryAction,
  secondaryAction,
  className,
  illustration = "cards",
  icon,
}: EmptyStateProps) {
  return (
    <div className={cn("py-10 sm:py-12 px-4 text-center max-w-lg mx-auto", className)}>
      {illustration === "icon-stack" || icon ? (
        <div className="mb-5 flex items-center justify-center pointer-events-none select-none">
          <IconStack className="h-20 w-18">
            {icon || <Layers className="size-5 text-[#1057FB]" />}
          </IconStack>
        </div>
      ) : (
        /* 3D Tight Stacked Cards Illustration (reui.io empty-state-1) */
        <div className="relative w-56 sm:w-60 h-20 mx-auto mb-5 select-none pointer-events-none">
          {/* Layer 3: Backmost card (nhô lên 5px) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[76%] h-9 rounded-[14px] bg-[#FAFAFC] border border-slate-200/60 shadow-2xs" />

          {/* Layer 2: Middle card (nhô lên 5px) */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[88%] h-10 rounded-[14px] bg-[#F4F5F8] border border-slate-200/80 shadow-2xs" />

          {/* Layer 1: Front Card (nằm đè phía trước) */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 w-full h-[54px] bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs flex items-center gap-3 text-left">
            {/* Square Placeholder Box */}
            <div className="w-8 h-8 rounded-xl bg-slate-100/90 border border-slate-200/60 shrink-0" />
            {/* Skeleton Lines */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="h-2 bg-slate-200/80 rounded-full w-28" />
              <div className="h-1.5 bg-slate-100 rounded-full w-16" />
            </div>
          </div>
        </div>
      )}

      {/* Main Heading Title */}
      <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
        {title}
      </h3>

      {/* Subheading Description */}
      <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed max-w-md mx-auto font-medium">
        {description}
      </p>

      {/* Action Buttons Group */}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
          {primaryAction && (
            <Button
              variant="primary"
              size="sm"
              onClick={primaryAction.onClick}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 rounded-xl h-10 px-4 text-xs sm:text-sm shadow-xs cursor-pointer"
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={secondaryAction.onClick}
              className="bg-white hover:bg-slate-50 text-slate-700 font-semibold gap-2 rounded-xl border border-slate-200/90 h-10 px-4 text-xs sm:text-sm cursor-pointer"
            >
              {secondaryAction.icon}
              <span>{secondaryAction.label}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export interface EmptyState10Props {
  title: string
  description?: string
  icon?: React.ReactNode
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  className?: string
}

/**
 * EmptyState10 - ReUI Base Empty State 10
 * Features a stacked 3D multi-layer card illustration with title, subtitle, and action buttons.
 * https://reui.io/preview/base/empty-state-10
 */
export function EmptyState10({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  className,
}: EmptyState10Props) {
  return (
    <div
      className={cn(
        "relative flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 text-left shadow-2xs",
        className
      )}
    >
      {/* Stacked Illustration on Left */}
      <div className="relative shrink-0 ml-1 mt-1 sm:mt-0">
        {/* Layer 3 (Back card) */}
        <div className="absolute inset-0 translate-x-2 -translate-y-2 rounded-xl border border-slate-200/60 bg-slate-100/60 shadow-2xs" />
        {/* Layer 2 (Middle card) */}
        <div className="absolute inset-0 translate-x-1 -translate-y-1 rounded-xl border border-slate-200/80 bg-slate-100 shadow-2xs" />
        {/* Layer 1 (Front card with icon) */}
        <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          {icon || <CalendarDays className="h-6 w-6 text-slate-700" />}
        </div>
      </div>

      {/* Content on Right */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm sm:text-base font-semibold text-slate-900">{title}</h4>
        {description && (
          <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
            {description}
          </p>
        )}
        {(primaryAction || secondaryAction) && (
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white shadow-xs transition-colors hover:bg-slate-800 cursor-pointer"
              >
                {primaryAction.icon}
                <span>{primaryAction.label}</span>
              </button>
            )}
            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50 cursor-pointer"
              >
                {secondaryAction.icon}
                <span>{secondaryAction.label}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export interface EmptyState1Props {
  title: string
  description?: string
  icon?: React.ReactNode
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  className?: string
}

/**
 * EmptyState1 - ReUI Base Empty State 1
 * Features a stacked horizontal card illustration with skeleton placeholders, title, subtitle, and action buttons.
 * https://reui.io/preview/base/empty-state-1
 */
export function EmptyState1({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  className,
}: EmptyState1Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-8 px-4 max-w-md mx-auto select-none", className)}>
      {/* Stacked Illustration Header */}
      <div className="relative mb-5 flex items-center justify-center pointer-events-none">
        {/* Stacked Layer 3 (Back) */}
        <div className="absolute -top-3 w-40 h-16 rounded-xl border border-slate-200/60 bg-slate-100/50 shadow-2xs" />
        {/* Stacked Layer 2 (Middle) */}
        <div className="absolute -top-1.5 w-44 h-16 rounded-xl border border-slate-200/80 bg-slate-100/80 shadow-2xs" />
        {/* Stacked Layer 1 (Front Card) */}
        <div className="relative z-10 w-48 h-20 rounded-xl border border-slate-200 bg-white p-3 shadow-xs flex flex-col justify-between text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-50 border border-blue-100/80 text-blue-600">
              {icon || <Bell className="h-3 w-3" />}
            </div>
            <div className="h-2 w-20 rounded bg-slate-200/80" />
          </div>
          <div className="h-2 w-28 rounded bg-slate-100" />
        </div>
      </div>

      {/* Title & Description */}
      <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {/* Action Buttons */}
      {(primaryAction || secondaryAction) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white shadow-xs transition-colors hover:bg-slate-800 cursor-pointer"
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50 cursor-pointer"
            >
              {secondaryAction.icon}
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

