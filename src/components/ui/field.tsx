import * as React from "react"
import { cn } from "@/lib/utils"

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode
  required?: boolean
  hint?: React.ReactNode
  error?: string
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, label, required, hint, error, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-1.5 w-full", className)} {...props}>
        {label && (
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            {label}
            {required && <span className="text-red-500 ml-1 font-bold">*</span>}
          </label>
        )}
        {children}
        {error ? (
          <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        ) : hint ? (
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{hint}</p>
        ) : null}
      </div>
    )
  }
)
Field.displayName = "Field"

export { Field }
