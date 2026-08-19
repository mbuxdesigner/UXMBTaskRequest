import React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
}

export function EmptyState({
  title = "Chưa có bài toán nào",
  description = "Không tìm thấy yêu cầu phù hợp với bộ lọc hiện tại. Hãy thử thay đổi từ khóa hoặc xóa bộ lọc.",
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("py-10 sm:py-12 px-4 text-center max-w-lg mx-auto", className)}>
      {/* 3D Tight Stacked Cards Illustration (reui.io empty-state-1) */}
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
