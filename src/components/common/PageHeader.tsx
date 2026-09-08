import React from "react"

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
  breadcrumb,
  title,
  badge,
  subtitle,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 ${className}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-[28px] font-semibold text-slate-900 tracking-tight">
            {title}
          </h1>
          {badge}
        </div>

        {subtitle && (
          <div className="text-xs sm:text-sm text-slate-500 font-normal">
            {subtitle}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  )
}
