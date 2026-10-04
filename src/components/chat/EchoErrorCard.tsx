/**
 * ==============================================================================
 * ECHO ERROR CARD: FRIENDLY VIETNAMESE ERROR PRESENTATION & RETRY ACTION
 * Milestone: M3 (Designer Chat UX & Accessibility)
 * Purpose: Maps HTTP, gateway, and network errors into clear Vietnamese guidance
 * for UX/UI designers with an immediate 1-click retry button.
 * ==============================================================================
 */

import React from "react"
import { AlertTriangle, RotateCcw, ShieldAlert, WifiOff, Key } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface VietnameseErrorInfo {
  title: string
  message: string
  adminNote?: string
  canRetry: boolean
}

/**
 * Maps arbitrary raw errors, response statuses, or error strings into human-friendly
 * Vietnamese explanations with actionable retry hints.
 */
export function mapErrorToVietnamese(error: any): VietnameseErrorInfo {
  const status = error?.status || error?.statusCode || null
  const code = error?.code || ""
  const message = error?.message || (typeof error === "string" ? error : "")

  // 1. Session expiration / 401 Unauthorized
  if (
    status === 401 ||
    code === "UNAUTHORIZED" ||
    message.includes("401") ||
    message.toLowerCase().includes("unauthorized") ||
    message.toLowerCase().includes("phiên đăng nhập")
  ) {
    return {
      title: "Phiên đăng nhập hết hạn",
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
      canRetry: true,
    }
  }

  // 2. Rate limit / 429 Too Many Requests
  if (
    status === 429 ||
    code === "RATE_LIMIT_EXCEEDED" ||
    message.includes("429") ||
    message.toLowerCase().includes("rate limit") ||
    message.toLowerCase().includes("tần suất")
  ) {
    return {
      title: "Giới hạn tần suất",
      message: "Quá giới hạn tần suất yêu cầu (tối đa 20 yêu cầu/phút). Vui lòng thử lại sau giây lát.",
      canRetry: true,
    }
  }

  // 3. Missing Server API Key / 503 Service Unavailable
  if (
    status === 503 ||
    code === "MISSING_SERVER_API_KEY" ||
    message.includes("503") ||
    message.includes("OPENROUTER_API_KEY") ||
    message.toLowerCase().includes("chưa được cấu hình khóa api")
  ) {
    return {
      title: "Chưa cấu hình dịch vụ AI",
      message: "Dịch vụ AI chưa được cấu hình khóa API (OPENROUTER_API_KEY) trên máy chủ.",
      adminNote:
        "Hệ thống chưa được cấu hình khóa API (OPENROUTER_API_KEY) trên máy chủ Vercel. Vui lòng liên hệ quản trị viên để thiết lập biến môi trường.",
      canRetry: false,
    }
  }

  // 4. Offline / Network / Connection failure
  if (
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    code === "OFFLINE" ||
    message.toLowerCase().includes("offline") ||
    message.toLowerCase().includes("kết nối mạng")
  ) {
    return {
      title: "Lỗi kết nối",
      message: "Mất kết nối mạng hoặc máy chủ không phản hồi. Vui lòng kiểm tra đường truyền và thử lại.",
      canRetry: true,
    }
  }

  // 5. Default generic error
  const sanitizedMsg = message.replace(/^⚠️\s*/, "").trim()
  return {
    title: "Lỗi xử lý",
    message: sanitizedMsg || "Đã xảy ra lỗi khi xử lý yêu cầu AI. Vui lòng thử lại sau.",
    canRetry: true,
  }
}

export interface EchoErrorCardProps {
  error: any
  onRetry?: () => void
  isRetrying?: boolean
  className?: string
}

export function EchoErrorCard({ error, onRetry, isRetrying = false, className = "" }: EchoErrorCardProps) {
  const errorInfo = mapErrorToVietnamese(error)

  const getIcon = () => {
    if (errorInfo.title.includes("kết nối")) return <WifiOff className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
    if (errorInfo.title.includes("cấu hình")) return <Key className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
    if (errorInfo.title.includes("hết hạn")) return <ShieldAlert className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
    return <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
  }

  return (
    <div
      role="alert"
      className={`rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 p-3.5 text-xs sm:text-sm text-foreground space-y-2.5 transition-all ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <div className="size-7 rounded-lg bg-rose-100 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <h4 className="font-semibold text-rose-900 dark:text-rose-200 text-[13px] sm:text-sm flex items-center gap-1.5">
            {errorInfo.title}
          </h4>
          <p className="text-muted-foreground leading-relaxed text-xs">
            {errorInfo.message}
          </p>
          {errorInfo.adminNote && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300/90 font-mono bg-amber-50/70 dark:bg-amber-950/40 p-2 rounded border border-amber-200/60 dark:border-amber-900/40">
              💡 {errorInfo.adminNote}
            </p>
          )}
        </div>
      </div>

      {errorInfo.canRetry && onRetry && (
        <div className="flex items-center justify-end pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-7 px-3 text-xs bg-white dark:bg-card border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 cursor-pointer gap-1.5 shadow-2xs"
            aria-label="Thử lại câu hỏi"
          >
            <RotateCcw className={`size-3.5 ${isRetrying ? "animate-spin" : ""}`} />
            <span>Thử lại ngay</span>
          </Button>
        </div>
      )}
    </div>
  )
}
