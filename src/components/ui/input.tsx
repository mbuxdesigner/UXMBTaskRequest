import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean | string
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, startIcon, endIcon, disabled, ...props }, ref) => {
    return (
      <div className="relative w-full group">
        {startIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-navy transition-colors pointer-events-none flex items-center justify-center">
            {startIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border bg-white/90 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
            startIcon && "pl-10.5",
            endIcon && "pr-10.5",
            error
              ? "border-red-300 focus-visible:ring-4 focus-visible:ring-red-500/10 focus-visible:border-red-500"
              : "border-slate-200/90 hover:border-slate-300 focus-visible:border-navy focus-visible:ring-4 focus-visible:ring-navy/10 focus-visible:bg-white",
            className
          )}
          ref={ref}
          disabled={disabled}
          {...props}
        />
        {endIcon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-navy transition-colors pointer-events-none flex items-center justify-center">
            {endIcon}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
