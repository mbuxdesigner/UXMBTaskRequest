import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const kbdVariants = cva(
  "inline-flex items-center justify-center font-mono font-medium select-none pointer-events-none rounded border border-slate-200/90 bg-slate-100 text-slate-600 shadow-[0_1px_0_1px_rgba(0,0,0,0.04)] dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-300",
  {
    variants: {
      variant: {
        default:
          "border-slate-200/90 bg-slate-100/90 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
        outline:
          "border-slate-200 bg-transparent text-slate-600 shadow-none dark:border-slate-700 dark:text-slate-400",
        subtle:
          "border-transparent bg-slate-100 text-slate-500 shadow-none dark:bg-slate-800 dark:text-slate-400",
      },
      size: {
        xs: "h-4 min-w-4 px-1 text-[9.5px] rounded",
        sm: "h-5 min-w-5 px-1.5 text-[10.5px] rounded-[4px]",
        default: "h-5.5 min-w-5.5 px-1.5 text-[11px] rounded-[5px]",
        lg: "h-6 min-w-6 px-2 text-xs rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "xs",
    },
  }
)

export interface KbdProps
  extends React.ComponentProps<"kbd">,
    VariantProps<typeof kbdVariants> {}

function Kbd({ className, variant, size, ...props }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(kbdVariants({ variant, size }), className)}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup, kbdVariants }
