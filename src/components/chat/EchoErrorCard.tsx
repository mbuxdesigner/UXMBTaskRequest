/**
 * ==============================================================================
 * ECHO ERROR CARD: FRIENDLY VIETNAMESE ERROR PRESENTATION & RETRY ACTION
 * Milestone: M3 (Designer Chat UX & Accessibility)
 * Purpose: Maps HTTP, gateway, and network errors into clear Vietnamese guidance
 * for UX/UI designers with an immediate 1-click retry button.
 * ==============================================================================
 */

import React from "react"
import { motion } from "framer-motion"
import { AlertTriangle, RotateCcw, ShieldAlert, WifiOff, Key } from "lucide-react"
import { springs, tactileProps } from "@/lib/motion"

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
    if (errorInfo.title.includes("kết nối")) return <WifiOff className="size-4 text-rose-600 shrink-0" />
    if (errorInfo.title.includes("cấu hình")) return <Key className="size-4 text-amber-600 shrink-0" />
    if (errorInfo.title.includes("hết hạn")) return <ShieldAlert className="size-4 text-rose-600 shrink-0" />
    return <AlertTriangle className="size-4 text-rose-600 shrink-0" />
  }

  return (
    <div
      role="alert"
      className={`rounded-2xl border border-rose-200/90 bg-rose-50/70 p-4 text-xs sm:text-sm text-slate-800 space-y-3 shadow-2xs ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="size-8 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <h4 className="font-bold text-rose-900 text-[13.5px] sm:text-sm flex items-center gap-1.5">
            {errorInfo.title}
          </h4>
          <p className="text-slate-600 leading-relaxed text-xs">
            {errorInfo.message}
          </p>
          {errorInfo.adminNote && (
            <p className="text-[11px] text-amber-800 font-mono bg-amber-50/90 p-2.5 rounded-xl border border-amber-200/80">
              💡 {errorInfo.adminNote}
            </p>
          )}
        </div>
      </div>

      {errorInfo.canRetry && onRetry && (
        <div className="flex items-center justify-end pt-1">
          <motion.button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            {...tactileProps.button}
            className="h-8 px-3.5 text-xs bg-white border border-rose-200 text-rose-700 hover:bg-rose-100/80 rounded-xl font-semibold cursor-pointer flex items-center gap-1.5 shadow-2xs"
            aria-label="Thử lại câu hỏi"
          >
            <RotateCcw className={`size-3.5 stroke-[2.2] ${isRetrying ? "animate-spin" : ""}`} />
            <span>Thử lại ngay</span>
          </motion.button>
        </div>
      )}
    </div>
  )
}

