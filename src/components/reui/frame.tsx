import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const frameVariants = cva(
  "rounded-2xl transition-all duration-200 bg-white border border-slate-200/80 overflow-hidden",
  {
    variants: {
      variant: {
        default: "shadow-xs hover:border-slate-300/80",
        elevated: "shadow-md hover:shadow-lg border-slate-200/60",
        flat: "border-slate-200 shadow-none bg-slate-50/50",
        glass: "bg-white/90 backdrop-blur-md border-white/40 shadow-sm",
        accent: "border-l-4 border-l-[#1B3A6B] shadow-xs",
        teal: "border-l-4 border-l-[#0D9B97] shadow-xs",
        dashed: "border-dashed border-2 border-slate-200 hover:border-slate-300 bg-slate-50/30",
      },
      padding: {
        none: "p-0",
        sm: "p-3 sm:p-4",
        default: "p-5 sm:p-6",
        lg: "p-6 sm:p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  }
)

export interface FrameProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof frameVariants> {}

export function Frame({ className, variant, padding, ...props }: FrameProps) {
  return (
    <div className={cn(frameVariants({ variant, padding }), className)} {...props} />
  )
}

export function FrameHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4",
        className
      )}
      {...props}
    />
  )
}

export function FrameTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-base font-bold text-slate-900 tracking-tight flex items-center gap-2",
        className
      )}
      {...props}
    />
  )
}

export function FrameDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-slate-500 font-normal mt-0.5", className)}
      {...props}
    />
  )
}

export function FrameActions({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-2 shrink-0 flex-wrap", className)}
      {...props}
    />
  )
}

export function FrameBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-4", className)} {...props} />
}

export function FrameFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 pt-4 border-t border-slate-100 mt-4",
        className
      )}
      {...props}
    />
  )
}
