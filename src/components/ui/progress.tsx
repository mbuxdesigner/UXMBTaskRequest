import * as React from "react"
import { cn } from "@/lib/utils"

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  variant?: "default" | "success" | "warning" | "destructive" | "teal"
  size?: "sm" | "md" | "lg"
}

const ProgressContext = React.createContext<{ value: number; max: number }>({ value: 0, max: 100 })

export const ProgressLabel = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn("font-medium text-slate-700 text-xs", className)} {...props} />
  )
)
ProgressLabel.displayName = "ProgressLabel"

export const ProgressValue = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, children, ...props }, ref) => {
    const { value, max } = React.useContext(ProgressContext)
    const pct = Math.round(Math.min(Math.max((value / max) * 100, 0), 100))
    return (
      <span
        ref={ref}
        className={cn("font-mono font-semibold text-slate-600 text-xs tabular-nums ml-auto", className)}
        {...props}
      >
        {children ?? `${pct}%`}
      </span>
    )
  }
)
ProgressValue.displayName = "ProgressValue"

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = "default", size = "md", children, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    const variantStyles = {
      default: "bg-navy",
      success: "bg-emerald-500",
      warning: "bg-amber-500",
      destructive: "bg-red-500",
      teal: "bg-teal",
    }[variant]

    const sizeStyles = {
      sm: "h-1.5",
      md: "h-2",
      lg: "h-3",
    }[size]

    const track = (
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={cn(
          "w-full overflow-hidden rounded-full bg-slate-100/90 border border-slate-200/50",
          sizeStyles
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out",
            variantStyles
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    )

    if (children) {
      return (
        <ProgressContext.Provider value={{ value, max }}>
          <div ref={ref} className={cn("w-full space-y-1.5", className)} {...props}>
            <div className="flex items-center justify-between text-xs">{children}</div>
            {track}
          </div>
        </ProgressContext.Provider>
      )
    }

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={cn(
          "w-full overflow-hidden rounded-full bg-slate-100/90 border border-slate-200/50",
          sizeStyles,
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            variantStyles
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
