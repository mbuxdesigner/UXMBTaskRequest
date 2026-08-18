import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-navy/30",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-navy text-white shadow-2xs",
        secondary:
          "border-transparent bg-slate-100 text-slate-800",
        destructive:
          "border-red-200 bg-red-50 text-red-700",
        outline:
          "border-slate-200 text-slate-700 bg-white",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        warning:
          "border-amber-200 bg-amber-50 text-amber-700",
        info:
          "border-blue-200 bg-blue-50 text-blue-700",
        purple:
          "border-purple-200 bg-purple-50 text-purple-700",
        teal:
          "border-teal-200 bg-teal-50 text-teal-700",
        navy:
          "border-navy-100 bg-navy-50 text-navy",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
  dotColor?: string
}

function Badge({ className, variant, size, dot, dotColor, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            dotColor || "bg-current"
          )}
        />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
