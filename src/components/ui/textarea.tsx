import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, disabled, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[90px] w-full rounded-xl border bg-white/90 px-3.5 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-150 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 leading-relaxed",
          error
            ? "border-red-300 focus-visible:ring-4 focus-visible:ring-red-500/10 focus-visible:border-red-500"
            : "border-slate-200/90 hover:border-slate-300 focus-visible:border-navy focus-visible:ring-4 focus-visible:ring-navy/10 focus-visible:bg-white",
          className
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
