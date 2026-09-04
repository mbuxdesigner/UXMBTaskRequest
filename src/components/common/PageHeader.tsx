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
    <div className={`border-b border-slate-200/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
      <div className="space-y-1">
        {breadcrumb && (
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-0.5 select-none">
            {breadcrumb.parent && (
              <>
                <span>{breadcrumb.parent}</span>
                <span className="text-slate-300">/</span>
              </>
            )}
            <span className="text-slate-900 font-bold">{breadcrumb.current || title}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          {badge}
        </div>

        {subtitle && (
          <div className="text-xs sm:text-sm text-slate-500 font-medium">
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
