import * as React from "react"
import { cn } from "@/lib/utils"

export interface TimelineProps extends React.HTMLAttributes<HTMLOListElement> {
  orientation?: "vertical" | "horizontal"
}

export function Timeline({
  orientation = "vertical",
  className,
  children,
  ...props
}: TimelineProps) {
  return (
    <ol
      className={cn(
        "relative",
        orientation === "vertical"
          ? "flex flex-col space-y-6 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200"
          : "flex flex-row space-x-6 before:absolute before:top-4 before:left-2 before:right-2 before:h-[2px] before:bg-slate-200",
        className
      )}
      {...props}
    >
      {children}
    </ol>
  )
}

export interface TimelineItemProps extends React.HTMLAttributes<HTMLLIElement> {
  status?: "completed" | "current" | "pending" | "failed"
}

export function TimelineItem({
  status = "pending",
  className,
  children,
  ...props
}: TimelineItemProps) {
  return (
    <li
      className={cn(
        "relative flex items-start gap-4 group",
        status === "completed" && "timeline-item-completed",
        status === "current" && "timeline-item-current",
        className
      )}
      {...props}
    >
      {children}
    </li>
  )
}

export interface TimelineIconProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: "completed" | "current" | "pending" | "failed"
  variant?: "solid" | "soft" | "outline"
}

export function TimelineIcon({
  status = "pending",
  variant = "solid",
  className,
  children,
  ...props
}: TimelineIconProps) {
  return (
    <div
      className={cn(
        "relative z-10 flex items-center justify-center rounded-full shrink-0 transition-all duration-200",
        "w-8 h-8 text-xs font-semibold ring-4 ring-white shadow-xs",
        status === "completed" &&
          "bg-emerald-500 text-white shadow-emerald-500/20",
        status === "current" &&
          "bg-[#1B3A6B] text-white ring-4 ring-[#1B3A6B]/15 shadow-md shadow-[#1B3A6B]/30",
        status === "pending" &&
          "bg-slate-100 text-slate-400 border border-slate-200",
        status === "failed" &&
          "bg-rose-500 text-white shadow-rose-500/20",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function TimelineContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 min-w-0 pt-0.5 space-y-1", className)} {...props}>
      {children}
    </div>
  )
}

export function TimelineHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between gap-2 flex-wrap", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function TimelineTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4
      className={cn(
        "text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2",
        className
      )}
      {...props}
    >
      {children}
    </h4>
  )
}

export function TimelineTime({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("text-xs font-normal text-slate-400 flex items-center gap-1", className)}
      {...props}
    >
      {children}
    </span>
  )
}

export function TimelineDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-slate-600 leading-relaxed", className)} {...props}>
      {children}
    </p>
  )
}
