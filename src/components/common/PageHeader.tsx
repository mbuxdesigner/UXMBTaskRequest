import React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  breadcrumb?: {
    parent?: string
    current?: string
  }
  title: string
  badge?: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export default function PageHeader({
  title,
  badge,
  subtitle,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 w-full",
        className
      )}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          {badge}
        </div>

        {subtitle && (
          <div className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
            {subtitle}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 shrink-0 self-start sm:self-center">
          {actions}
        </div>
      )}
    </div>
  )
}
