import React from "react"
import { motion } from "framer-motion"
import { MBRobotHead, type RobotHeadState } from "./MBRobotHead"
import { cn } from "@/lib/utils"

export interface MBRobotLoaderProps {
  title?: string
  description?: string
  state?: RobotHeadState
  size?: number
  fullScreen?: boolean
  className?: string
  badgeText?: string
}

/**
 * MBRobotLoader: Modern, brand-themed loading & cloud synchronization component.
 * Uses 3D-styled animated RobotHead with 'working' state (animated LED progress bar & bobbing).
 */
export function MBRobotLoader({
  title = "Đang đồng bộ dữ liệu...",
  description = "Hệ thống đang kết nối với Google Cloud và cập nhật dữ liệu mới nhất.",
  state = "working",
  size = 96,
  fullScreen = false,
  className,
  badgeText = "Hệ thống MB Cloud Sync",
}: MBRobotLoaderProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center text-center p-6 sm:p-8 max-w-md mx-auto",
        className
      )}
    >
      {/* Robot with ambient glow */}
      <div className="relative flex items-center justify-center mb-3">
        <div
          className="absolute -inset-4 rounded-full bg-blue-500/10 blur-xl pointer-events-none"
          aria-hidden="true"
        />
        <MBRobotHead
          shape="rectangle"
          state={state}
          size={size}
          interactive={true}
        />
      </div>

      {/* Cloud Sync Status Badge */}
      {badgeText && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 text-[11px] font-medium text-blue-700 dark:text-blue-300 mb-2">
          <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span>{badgeText}</span>
        </div>
      )}

      {/* Title */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-1">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
          {description}
        </p>
      )}
    </motion.div>
  )

  if (fullScreen) {
    return (
      <div className="flex-1 min-h-[360px] w-full flex items-center justify-center py-12">
        {content}
      </div>
    )
  }

  return content
}
