import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { formatPriority, getStatusConfig } from "@/config/statusConfig"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-semibold transition-all duration-150 select-none whitespace-nowrap",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-slate-900 text-white shadow-2xs",
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
          "border border-slate-200 bg-slate-900/10 text-slate-900",
        solidNavy:
          "border border-transparent bg-slate-900 text-white",
        solidTeal:
          "border border-transparent bg-[#0D9B97] text-white",
        solidSuccess:
          "border border-transparent bg-emerald-600 text-white",
        solidWarning:
          "border border-transparent bg-amber-500 text-white",
        solidDestructive:
          "border border-transparent bg-rose-600 text-white",
        priorityLv1:
          "border border-rose-200/80 bg-rose-50 text-rose-700 shadow-2xs",
        priorityLv2:
          "border border-amber-200/80 bg-amber-50 text-amber-700 shadow-2xs",
        priorityLv3:
          "border border-blue-200/80 bg-blue-50 text-blue-700",
        priorityLv4:
          "border border-slate-200/80 bg-slate-50 text-slate-600",
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
  pill?: boolean
  icon?: React.ReactNode
}

function Badge({
  className,
  variant,
  size,
  dot,
  dotColor,
  dotPulse,
  pill,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({ variant, size }),
        pill && "rounded-full",
        className
      )}
      {...props}
    >
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

export interface PriorityBadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  priority?: string
  showFlag?: boolean
  size?: "xs" | "sm" | "default"
}

export function PriorityBadge({
  priority = "lv3",
  showFlag = true,
  className,
  size = "sm",
  ...props
}: PriorityBadgeProps) {
  const pInfo = formatPriority(priority)
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 font-bold border shadow-2xs whitespace-nowrap select-none",
        size === "xs"
          ? "px-1.5 py-0.2 text-[10px] rounded-md"
          : size === "sm"
          ? "px-2 py-0.5 text-[11px] rounded-md"
          : "px-2.5 py-1 text-xs rounded-lg",
        pInfo.badgeClass,
        className
      )}
      {...props}
    >
      {showFlag && (
        <svg
          className={cn("w-3 h-3 shrink-0", pInfo.flagColor)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" x2="4" y1="22" y2="15" />
        </svg>
      )}
      <span>{pInfo.label}</span>
    </div>
  )
}

export interface StatusPillProps extends BadgeProps {
  status?: string
}

export function StatusPill({
  status,
  className,
  dot = true,
  size = "pill",
  children,
  ...props
}: StatusPillProps) {
  const cfg = status ? getStatusConfig(status) : null
  const resolvedDotColor = props.dotColor || cfg?.dotColor
  const inline = cfg?.inlineClasses

  return (
    <Badge
      size={size}
      dot={dot}
      dotColor={resolvedDotColor}
      pill
      className={cn(
        inline ? `${inline.bg} ${inline.text} ${inline.border} border` : "",
        className
      )}
      {...props}
    >
      {children || status}
    </Badge>
  )
}

export { Badge, badgeVariants }
export default Badge
