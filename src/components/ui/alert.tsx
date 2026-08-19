import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-2xl border p-4 text-sm transition-all duration-200 flex items-start gap-3.5",
  {
    variants: {
      variant: {
        default:
          "bg-slate-50 border-slate-200/80 text-slate-800",
        primary:
          "bg-[#1B3A6B]/5 border-[#1B3A6B]/20 text-[#1B3A6B] border-l-4 border-l-[#1B3A6B]",
        teal:
          "bg-[#0D9B97]/5 border-[#0D9B97]/20 text-[#0D9B97] border-l-4 border-l-[#0D9B97]",
        success:
          "bg-emerald-50/80 border-emerald-200 text-emerald-900 border-l-4 border-l-emerald-600",
        warning:
          "bg-amber-50/80 border-amber-200 text-amber-900 border-l-4 border-l-amber-500",
        destructive:
          "bg-rose-50/80 border-rose-200 text-rose-900 border-l-4 border-l-rose-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const defaultIcons = {
  default: <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />,
  primary: <Info className="w-5 h-5 text-[#1B3A6B] shrink-0 mt-0.5" />,
  teal: <Info className="w-5 h-5 text-[#0D9B97] shrink-0 mt-0.5" />,
  success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
  destructive: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
}

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode
  onDismiss?: () => void
}

function Alert({
  className,
  variant = "default",
  icon,
  onDismiss,
  children,
  ...props
}: AlertProps) {
  const renderedIcon = icon !== undefined ? icon : defaultIcons[variant || "default"]

  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {renderedIcon}
      <div className="flex-1 space-y-1 min-w-0">{children}</div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          type="button"
          aria-label="Dismiss alert"
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn("font-semibold leading-tight tracking-tight text-slate-900", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div
      className={cn("text-xs leading-relaxed opacity-90", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
export default Alert
