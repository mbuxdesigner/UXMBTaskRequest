import * as React from "react"
import { motion } from "framer-motion"
import { springs } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
  variant?: "default" | "pills" | "line" | "segmented"
  id?: string
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  onValueChange: (value: string) => void
  variant?: "default" | "pills" | "line" | "segmented"
}

export function Tabs({
  value,
  onValueChange,
  variant = "default",
  className,
  children,
  id,
  ...props
}: TabsProps) {
  const generatedId = React.useId()
  const tabsId = id || generatedId

  return (
    <TabsContext.Provider value={{ value, onValueChange, variant, id: tabsId }}>
      <div className={cn("w-full space-y-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(TabsContext)
  const variant = context?.variant || "default"

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center justify-start select-none",
        variant === "default" &&
          "p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl gap-1",
        variant === "segmented" &&
          "p-1 bg-slate-100 rounded-xl w-full grid gap-1",
        variant === "line" &&
          "border-b border-slate-200 gap-6 w-full px-1",
        variant === "pills" &&
          "gap-2 flex-wrap",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  badge?: React.ReactNode
  icon?: React.ReactNode
}

export function TabsTrigger({
  value,
  badge,
  icon,
  className,
  children,
  ...props
}: TabsTriggerProps) {
  const context = React.useContext(TabsContext)
  const isSelected = context?.value === value
  const variant = context?.variant || "default"
  const layoutId = `tabs-active-indicator-${variant}-${context?.id || "tabs"}`

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isSelected}
      onClick={() => context?.onValueChange(value)}
      className={cn(
        "relative isolate inline-flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm transition-colors cursor-pointer",
        variant === "default" && [
          "px-3.5 py-1.5 rounded-lg",
          isSelected
            ? "text-slate-900 font-bold"
            : "text-slate-600 hover:text-slate-900 hover:bg-white/50",
        ],
        variant === "segmented" && [
          "py-1.5 px-3 rounded-lg text-center",
          isSelected
            ? "text-[#1B3A6B] font-bold"
            : "text-slate-600 hover:text-slate-900",
        ],
        variant === "line" && [
          "py-3 -mb-px px-1 font-medium",
          isSelected
            ? "text-[#1B3A6B] font-bold"
            : "text-slate-500 hover:text-slate-800",
        ],
        variant === "pills" && [
          "px-3.5 py-1.5 rounded-xl border",
          isSelected
            ? "text-white font-bold border-transparent"
            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900",
        ],
        className
      )}
      {...props}
    >
      {/* Shared Layout Active Indicator */}
      {isSelected && (
        <>
          {(variant === "default" || variant === "segmented") && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 bg-white rounded-lg shadow-xs -z-10"
              transition={springs.floating}
            />
          )}
          {variant === "line" && (
            <motion.span
              layoutId={layoutId}
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1B3A6B]"
              transition={springs.floating}
            />
          )}
          {variant === "pills" && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 bg-[#1B3A6B] rounded-xl shadow-xs -z-10"
              transition={springs.floating}
            />
          )}
        </>
      )}

      {icon && <span className="shrink-0 relative z-10">{icon}</span>}
      <span className="relative z-10">{children}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "ml-1 px-1.5 py-0.5 text-[10px] rounded-full font-bold transition-colors relative z-10",
            isSelected
              ? variant === "pills"
                ? "bg-white/20 text-white"
                : "bg-[#1B3A6B]/10 text-[#1B3A6B]"
              : "bg-slate-200 text-slate-600"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

export interface TabsContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: TabsContentProps) {
  const context = React.useContext(TabsContext)
  if (context?.value !== value) return null

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={cn("outline-none animate-in fade-in-50 duration-200", className)}
      {...props}
    >
      {children}
    </div>
  )
}

