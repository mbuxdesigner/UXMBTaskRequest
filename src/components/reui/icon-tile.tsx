import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const iconTileVariants = cva(
  "inline-flex items-center justify-center shrink-0 rounded-2xl transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-700",
        navy: "bg-[#1B3A6B]/10 text-[#1B3A6B] border border-[#1B3A6B]/20",
        teal: "bg-[#0D9B97]/10 text-[#0D9B97] border border-[#0D9B97]/20",
        emerald: "bg-emerald-50 text-emerald-600 border border-emerald-200/80",
        amber: "bg-amber-50 text-amber-600 border border-amber-200/80",
        purple: "bg-purple-50 text-purple-600 border border-purple-200/80",
        rose: "bg-rose-50 text-rose-600 border border-rose-200/80",
        blue: "bg-blue-50 text-blue-600 border border-blue-200/80",
        solidNavy: "bg-[#1B3A6B] text-white shadow-md shadow-[#1B3A6B]/25",
        solidTeal: "bg-[#0D9B97] text-white shadow-md shadow-[#0D9B97]/25",
        gradient: "bg-gradient-to-tr from-[#1B3A6B] to-[#0D9B97] text-white shadow-md",
      },
      size: {
        xs: "w-7 h-7 text-xs rounded-lg",
        sm: "w-9 h-9 text-sm rounded-xl",
        default: "w-11 h-11 text-base rounded-xl",
        lg: "w-13 h-13 text-xl rounded-2xl",
        xl: "w-16 h-16 text-2xl rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface IconTileProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof iconTileVariants> {}

export function IconTile({ className, variant, size, ...props }: IconTileProps) {
  return (
    <div className={cn(iconTileVariants({ variant, size }), className)} {...props} />
  )
}

export function IconStack({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center p-4 rounded-3xl bg-slate-50 border border-slate-100/80 shadow-inner",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
