import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-semibold transition-all duration-150 select-none",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-[#1B3A6B] text-white shadow-2xs",
        secondary:
          "border border-slate-200/80 bg-slate-100 text-slate-700",
        outline:
          "border border-slate-200 text-slate-700 bg-white hover:bg-slate-50",
        destructive:
          "border border-rose-200/80 bg-rose-50 text-rose-700",
        success:
          "border border-emerald-200/80 bg-emerald-50 text-emerald-700",
        warning:
          "border border-amber-200/80 bg-amber-50 text-amber-700",
        info:
          "border border-blue-200/80 bg-blue-50 text-blue-700",
        purple:
          "border border-purple-200/80 bg-purple-50 text-purple-700",
        teal:
          "border border-teal-200/80 bg-teal-50 text-teal-700",
        navy:
          "border border-[#1B3A6B]/20 bg-[#1B3A6B]/10 text-[#1B3A6B]",
        solidNavy:
          "border border-transparent bg-[#1B3A6B] text-white",
        solidTeal:
          "border border-transparent bg-[#0D9B97] text-white",
        solidSuccess:
          "border border-transparent bg-emerald-600 text-white",
        solidWarning:
          "border border-transparent bg-amber-500 text-white",
        solidDestructive:
          "border border-transparent bg-rose-600 text-white",
      },
      size: {
        xs: "px-2 py-0.5 text-[10px] rounded-md",
        sm: "px-2.5 py-0.5 text-[11px] rounded-lg",
        default: "px-3 py-1 text-xs rounded-lg",
        lg: "px-3.5 py-1.5 text-sm rounded-xl",
        pill: "px-3 py-0.5 text-xs rounded-full",
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
  dotPulse?: boolean
  icon?: React.ReactNode
}

function Badge({
  className,
  variant,
  size,
  dot,
  dotColor,
  dotPulse,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span className="relative flex h-2 w-2 shrink-0">
          {dotPulse && (
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                dotColor || "bg-current"
              )}
            />
          )}
          <span
            className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              dotColor || "bg-current"
            )}
          />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </div>
  )
}

export { Badge, badgeVariants }
export default Badge
