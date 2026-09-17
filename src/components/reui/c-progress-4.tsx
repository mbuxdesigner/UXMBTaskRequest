"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { cn } from "@/lib/utils"

/**
 * ReUI c-progress-4: Base Progress Bar with status messages
 * Source: https://reui.io/components/progress (Block 4)
 */
export function BaseProgressStatus({
  label = "Workspace Setup",
  className,
}: {
  label?: string
  className?: string
}) {
  const [downloadProgress, setDownloadProgress] = useState(0)

  // Get status message based on progress
  const getStatusMessage = (progress: number) => {
    if (progress < 5) return "Initializing download..."
    if (progress < 15) return "Setting up environment..."
    if (progress < 25) return "Connecting to server..."
    if (progress < 35) return "Verifying permissions..."
    if (progress < 50) return "Downloading core files..."
    if (progress < 65) return "Downloading assets..."
    if (progress < 80) return "Downloading dependencies..."
    if (progress < 90) return "Extracting files..."
    if (progress < 95) return "Validating integrity..."
    if (progress < 100) return "Finalizing installation..."
    return "Download complete!"
  }

  useEffect(() => {
    const downloadTimer = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          return 0 // Reset for continuous loop
        }
        return prev + Math.random() * 3 + 1
      })
    }, 150)

    return () => {
      clearInterval(downloadTimer)
    }
  }, [])

  return (
    <div className={cn("w-full max-w-xs space-y-2 select-none", className)}>
      <Progress value={downloadProgress} variant="default" size="md">
        <ProgressLabel>{label}</ProgressLabel>
        <ProgressValue />
      </Progress>
      <div className="text-slate-500 text-xs">
        {getStatusMessage(downloadProgress)}
      </div>
    </div>
  )
}

export interface SyncProgressStatusProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean
  progress?: number
  label?: string
  statusMessage?: string
  type?: "sync" | "push" | "pull" | "refresh"
  onComplete?: () => void
  variant?: "default" | "success" | "warning" | "destructive" | "teal"
  size?: "sm" | "md" | "lg"
}

/**
 * CProgress4 / SyncProgressStatus: ReUI c-progress-4 customized for live cloud & data synchronization.
 * Supports both controlled progress or automatic realistic simulation when active is true.
 */
export function SyncProgressStatus({
  active = false,
  progress: controlledProgress,
  label = "Đồng bộ dữ liệu Cloud",
  statusMessage: controlledMessage,
  type = "sync",
  onComplete,
  variant = "default",
  size = "md",
  className,
  ...props
}: SyncProgressStatusProps) {
  const [internalProgress, setInternalProgress] = useState(0)

  // Determine effective progress
  const isControlled = typeof controlledProgress === "number"
  const currentProgress = isControlled ? controlledProgress : internalProgress

  // Default contextual status message resolver
  const getContextualMessage = (pct: number) => {
    if (controlledMessage) return controlledMessage

    if (type === "push") {
      if (pct < 15) return "Khởi tạo kết nối Google Sheets Cloud..."
      if (pct < 35) return "Đang đóng gói cấu trúc node & sơ đồ sitemap..."
      if (pct < 65) return "Đang đẩy dữ liệu lên máy chủ Google Apps Script..."
      if (pct < 90) return "Đang xác thực bảo mật & đồng bộ Sheet..."
      if (pct < 100) return "Hoàn tất lưu trữ lên Cloud..."
      return "Đã đồng bộ lên Cloud thành công!"
    }

    if (type === "pull") {
      if (pct < 15) return "Kết nối máy chủ Google Sheets..."
      if (pct < 40) return "Đang tải bảng tính dữ liệu mới nhất..."
      if (pct < 70) return "Đang giải mã JSON & chuẩn hóa phân cấp 4 Tier..."
      if (pct < 95) return "Đang cập nhật layout Canvas..."
      return "Đã nạp dữ liệu Cloud thành công!"
    }

    if (type === "refresh") {
      if (pct < 20) return "Đang kiểm tra dữ liệu bài toán..."
      if (pct < 55) return "Đồng bộ KPI & tiến độ mới nhất..."
      if (pct < 90) return "Cập nhật dữ liệu vào bộ nhớ..."
      return "Làm mới thành công!"
    }

    // Default sync
    if (pct < 20) return "Khởi tạo kết nối hệ thống..."
    if (pct < 45) return "Đang kiểm tra phiên làm việc & phân quyền..."
    if (pct < 75) return "Đang đồng bộ dữ liệu hai chiều..."
    if (pct < 95) return "Đang kiểm tra tính nhất quán..."
    return "Đồng bộ hoàn tất!"
  }

  // Simulation when active and uncontrolled
  useEffect(() => {
    if (!active || isControlled) {
      if (!active) setInternalProgress(0)
      return
    }

    setInternalProgress(8)
    const timer = setInterval(() => {
      setInternalProgress((prev) => {
        if (prev >= 95) {
          return 95 // Hold at 95% until active becomes false
        }
        const step = prev < 40 ? 12 : prev < 70 ? 8 : 4
        return Math.min(prev + step, 95)
      })
    }, 180)

    return () => clearInterval(timer)
  }, [active, isControlled])

  // Trigger completion
  useEffect(() => {
    if (!active && internalProgress >= 90) {
      setInternalProgress(100)
      const timeout = setTimeout(() => {
        onComplete?.()
      }, 350)
      return () => clearTimeout(timeout)
    }
  }, [active, internalProgress, onComplete])

  if (!active && currentProgress === 0) return null

  return (
    <div
      data-testid="reui-c-progress-4"
      className={cn(
        "w-full rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-sm space-y-2 select-none transition-all",
        className
      )}
      {...props}
    >
      <Progress value={currentProgress} variant={variant} size={size}>
        <ProgressLabel className="font-semibold text-slate-800 text-xs">
          {label}
        </ProgressLabel>
        <ProgressValue />
      </Progress>
      <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
        <span className="truncate">{getContextualMessage(currentProgress)}</span>
        {currentProgress < 100 && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping shrink-0 ml-2" />
        )}
      </div>
    </div>
  )
}

export const CProgress4 = SyncProgressStatus
export default SyncProgressStatus
