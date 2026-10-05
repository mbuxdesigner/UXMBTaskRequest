/**
 * ==============================================================================
 * ECHO ASSISTANT ACTION BAR: SAO CHÉP & TẠO LẠI
 * Tối giản theo quy chuẩn UX: Chỉ hiển thị 2 thao tác chính: Sao chép và Tạo lại
 * ==============================================================================
 */

import React, { useState } from "react"
import { motion } from "framer-motion"
import {
  Copy,
  Check,
  RotateCcw,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { copyToClipboard } from "@/lib/figmaExportUtils"
import { tactileProps } from "@/lib/motion"

export interface EchoAssistantActionBarProps {
  messageId: string
  content: string
  isStreaming?: boolean
  hasError?: boolean
  artifactName?: string
  artifactId?: string
  onRegenerate?: () => void
  onRetry?: () => void
  onOpenArtifact?: () => void
  onSaveAsArtifact?: (title: string, content: string) => void
  feedback?: "up" | "down"
  onFeedback?: (feedback: "up" | "down") => void
  className?: string
}

export function EchoAssistantActionBar({
  messageId,
  content,
  isStreaming = false,
  hasError = false,
  artifactName,
  artifactId,
  onRegenerate,
  onRetry,
  onOpenArtifact,
  onSaveAsArtifact,
  feedback,
  onFeedback,
  className = "",
}: EchoAssistantActionBarProps) {
  const [isCopied, setIsCopied] = useState(false)

  if (isStreaming) return null

  const handleCopy = async () => {
    const ok = await copyToClipboard(content)
    if (ok) {
      setIsCopied(true)
      toast.success("Đã sao chép phản hồi!")
      setTimeout(() => setIsCopied(false), 2000)
    } else {
      toast.error("Không thể sao chép vào bộ nhớ tạm.")
    }
  }

  return (
    <div
      role="toolbar"
      aria-label="Thao tác với phản hồi AI"
      className={`flex items-center flex-wrap gap-2 pt-2 text-xs text-slate-500 select-none transition-opacity ${className}`}
    >
      {hasError ? (
        onRetry && (
          <motion.button
            type="button"
            onClick={onRetry}
            {...tactileProps.button}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
            aria-label="Thử lại câu hỏi"
            title="Thử lại yêu cầu AI"
          >
            <RefreshCw className="size-3.5 stroke-[2.2]" />
            <span>Thử lại</span>
          </motion.button>
        )
      ) : (
        <>
          {/* Nút 1: Sao chép (Copy) */}
          <motion.button
            type="button"
            onClick={handleCopy}
            {...tactileProps.button}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent hover:border-slate-200/60 dark:hover:border-neutral-700 transition-colors cursor-pointer"
            title="Sao chép nội dung phản hồi"
            aria-label="Sao chép nội dung"
          >
            {isCopied ? (
              <>
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
                <span className="text-[11.5px] font-medium text-emerald-600 dark:text-emerald-400">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5 text-slate-400 group-hover:text-slate-700 dark:text-slate-500" />
                <span className="text-[11.5px] font-medium">Sao chép</span>
              </>
            )}
          </motion.button>

          {/* Nút 2: Tạo lại (Regenerate) */}
          {onRegenerate && (
            <motion.button
              type="button"
              onClick={onRegenerate}
              {...tactileProps.button}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent hover:border-slate-200/60 dark:hover:border-neutral-700 transition-colors cursor-pointer"
              title="Tạo lại phản hồi này với AI"
              aria-label="Tạo lại phản hồi"
            >
              <RotateCcw className="size-3.5 text-slate-400 group-hover:text-slate-700 dark:text-slate-500" />
              <span className="text-[11.5px] font-medium">Tạo lại</span>
            </motion.button>
          )}
        </>
      )}
    </div>
  )
}
