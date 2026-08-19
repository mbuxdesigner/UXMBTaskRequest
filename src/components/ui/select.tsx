import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean | string
  startIcon?: React.ReactNode
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, startIcon, disabled, children, ...props }, ref) => {
    return (
      <div className="relative w-full group">
        {startIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-navy transition-colors pointer-events-none flex items-center justify-center">
            {startIcon}
          </div>
        )}
        <select
          className={cn(
            "flex h-11 w-full appearance-none rounded-xl border bg-white/90 px-3.5 py-2.5 pr-10 text-sm text-slate-800 transition-all duration-150 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
            startIcon && "pl-10.5",
            error
              ? "border-red-300 focus-visible:ring-4 focus-visible:ring-red-500/10 focus-visible:border-red-500"
              : "border-slate-200/90 hover:border-slate-300 focus-visible:border-navy focus-visible:ring-4 focus-visible:ring-navy/10 focus-visible:bg-white",
            className
          )}
          ref={ref}
          disabled={disabled}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-navy pointer-events-none transition-colors">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
