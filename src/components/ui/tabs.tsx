import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ activeValue?: string; onChange?: (val: string) => void }>, {
            activeValue: value,
            onChange: onValueChange,
          })
        }
        return child
      })}
    </div>
  )
}

export function TabsList({
  children,
  className,
  activeValue,
  onChange,
  variant = "pill",
}: {
  children: React.ReactNode
  className?: string
  activeValue?: string
  onChange?: (val: string) => void
  variant?: "pill" | "underline"
}) {
  const variantCls = {
    pill: "bg-slate-100/90 p-1 rounded-xl gap-1 border border-slate-200/50",
    underline: "border-b border-slate-200 gap-6 p-0",
  }[variant]

  return (
    <div className={cn("flex items-center w-fit", variantCls, className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ activeValue?: string; onChange?: (val: string) => void; variant?: "pill" | "underline" }>, {
            activeValue,
            onChange,
            variant,
          })
        }
        return child
      })}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className,
  activeValue,
  onChange,
  variant = "pill",
  badge,
}: {
  value: string
  children: React.ReactNode
  className?: string
  activeValue?: string
  onChange?: (val: string) => void
  variant?: "pill" | "underline"
  badge?: React.ReactNode
}) {
  const active = activeValue === value

  const styleCls =
    variant === "pill"
      ? active
        ? "bg-white text-slate-900 shadow-xs font-semibold"
        : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
      : active
        ? "border-b-2 border-navy text-navy font-semibold pb-3"
        : "text-slate-500 hover:text-slate-800 pb-3 border-b-2 border-transparent"

  return (
    <button
      type="button"
      onClick={() => onChange?.(value)}
      className={cn(
        "flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 select-none cursor-pointer",
        styleCls,
        className
      )}
    >
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.2 rounded-full",
            active ? "bg-navy-50 text-navy font-bold" : "bg-slate-200 text-slate-600"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

export function TabsContent({
  value,
  children,
  className,
  activeValue,
}: {
  value: string
  children: React.ReactNode
  className?: string
  activeValue?: string
}) {
  if (activeValue !== value) return null
  return <div className={cn("animate-in fade-in-50 duration-150", className)}>{children}</div>
}
