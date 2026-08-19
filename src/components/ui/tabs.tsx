import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
  variant?: "default" | "pills" | "line" | "segmented"
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
  ...props
}: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange, variant }}>
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

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isSelected}
      onClick={() => context?.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm transition-all duration-150 cursor-pointer",
        variant === "default" && [
          "px-3.5 py-1.5 rounded-lg",
          isSelected
            ? "bg-white text-slate-900 shadow-xs font-bold"
            : "text-slate-600 hover:text-slate-900 hover:bg-white/50",
        ],
        variant === "segmented" && [
          "py-1.5 px-3 rounded-lg text-center",
          isSelected
            ? "bg-white text-[#1B3A6B] shadow-xs font-bold"
            : "text-slate-600 hover:text-slate-900",
        ],
        variant === "line" && [
          "py-3 border-b-2 -mb-px px-1 font-medium",
          isSelected
            ? "border-[#1B3A6B] text-[#1B3A6B] font-bold"
            : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300",
        ],
        variant === "pills" && [
          "px-3.5 py-1.5 rounded-xl border",
          isSelected
            ? "bg-[#1B3A6B] border-[#1B3A6B] text-white shadow-xs font-bold"
            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900",
        ],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "ml-1 px-1.5 py-0.5 text-[10px] rounded-full font-bold transition-colors",
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
