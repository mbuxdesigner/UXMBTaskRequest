import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3A6B]/30 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#1B3A6B] text-white shadow-xs hover:bg-[#152e54] hover:shadow-md",
        primary:
          "bg-[#1B3A6B] text-white shadow-xs hover:bg-[#152e54] hover:shadow-md",
        teal:
          "bg-[#0D9B97] text-white shadow-xs hover:bg-[#0b8380] hover:shadow-md",
        destructive:
          "bg-rose-600 text-white shadow-xs hover:bg-rose-700",
        outline:
          "border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200/80",
        ghost:
          "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
        link:
          "text-[#1B3A6B] underline-offset-4 hover:underline",
        softNavy:
          "bg-[#1B3A6B]/10 text-[#1B3A6B] hover:bg-[#1B3A6B]/20",
        softTeal:
          "bg-[#0D9B97]/10 text-[#0D9B97] hover:bg-[#0D9B97]/20",
        softSuccess:
          "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-lg gap-1.5",
        sm: "h-8 px-3 text-xs rounded-xl gap-1.5",
        default: "h-9.5 px-4 text-sm rounded-xl gap-2",
        lg: "h-11 px-5 text-sm rounded-xl gap-2.5",
        icon: "h-9 w-9 rounded-xl",
        iconSm: "h-7.5 w-7.5 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
export default Button
