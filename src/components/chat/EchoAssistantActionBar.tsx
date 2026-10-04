/**
 * ==============================================================================
 * ECHO ASSISTANT ACTION BAR: FIGMA COPY, REGENERATE, RETRY & ARTIFACT DRAWER
 * Milestone: M3 (Designer Chat UX & Accessibility)
 * Purpose: Provides 1-click actions under Assistant bubbles tailored to designer workflows.
 * ==============================================================================
 */

import React, { useState } from "react"
import { motion } from "framer-motion"
import {
  Copy,
  Check,
  FileText,
  RotateCcw,
  RefreshCw,
  Table,
  ExternalLink,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"
import { toast } from "sonner"
import {
  formatMarkdownForFigmaText,
  exportTableToTSV,
  copyToClipboard,
} from "@/lib/figmaExportUtils"
import { springs, tactileProps } from "@/lib/motion"

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
  const [copiedType, setCopiedType] = useState<"figma" | "markdown" | "tsv" | null>(null)

  if (isStreaming) return null

  // Check if content has Markdown table
  const hasTable = Boolean(
    content &&
    content.includes("|") &&
    /(?:\|[^\n]+\|\r?\n?){2,}/.test(content)
  )

  const handleCopy = async (type: "figma" | "markdown" | "tsv") => {
    let payload = content
    if (type === "figma") {
      payload = formatMarkdownForFigmaText(content)
    } else if (type === "tsv") {
      payload = exportTableToTSV(content)
    }

    const ok = await copyToClipboard(payload)
    if (ok) {
      setCopiedType(type)
      if (type === "figma") {
        toast.success("Đã sao chép văn bản sạch cho Figma!")
      } else if (type === "tsv") {
        toast.success("Đã sao chép bảng TSV cho Figma Auto-Layout!")
      } else {
        toast.success("Đã sao chép Markdown gốc!")
      }
      setTimeout(() => setCopiedType(null), 2000)
    } else {
      toast.error("Không thể sao chép vào bộ nhớ tạm.")
    }
  }

  return (
    <div
      role="toolbar"
      aria-label="Thao tác với phản hồi AI"
      className={`flex items-center flex-wrap gap-1.5 pt-2 text-xs text-slate-500 select-none transition-opacity ${className}`}
    >
      {hasError ? (
        // When message has error, prominently display Soft Pastel Retry button
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
          {/* Action 1: Copy for Figma (Clean Text) */}
          <motion.button
            type="button"
            onClick={() => handleCopy("figma")}
            {...tactileProps.button}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200/60 transition-colors cursor-pointer"
            title="Sao chép văn bản sạch (đã lọc Markdown, dán thẳng vào Text Layer Figma)"
            aria-label="Copy dạng Text sạch cho Figma"
          >
            {copiedType === "figma" ? (
              <Check className="size-3.5 text-emerald-600 stroke-[2.2]" />
            ) : (
              <Copy className="size-3.5 text-slate-400 group-hover:text-slate-700" />
            )}
            <span className="text-[11.5px] font-medium">Copy cho Figma</span>
          </motion.button>

          {/* Action 2: Copy Raw Markdown */}
          <motion.button
            type="button"
            onClick={() => handleCopy("markdown")}
            {...tactileProps.button}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200/60 transition-colors cursor-pointer"
            title="Sao chép nguyên văn Markdown gốc"
            aria-label="Copy Markdown gốc"
          >
            {copiedType === "markdown" ? (
              <Check className="size-3.5 text-emerald-600 stroke-[2.2]" />
            ) : (
              <FileText className="size-3.5 text-slate-400 group-hover:text-slate-700" />
            )}
            <span className="text-[11.5px] font-medium">Markdown</span>
          </motion.button>

          {/* Action 3: Copy TSV Table for Figma Auto-layout if table is present */}
          {hasTable && (
            <motion.button
              type="button"
              onClick={() => handleCopy("tsv")}
              {...tactileProps.button}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200/60 transition-colors cursor-pointer"
              title="Sao chép bảng dạng TSV để dán tạo Auto-Layout trong Figma"
              aria-label="Copy bảng TSV cho Figma"
            >
              {copiedType === "tsv" ? (
                <Check className="size-3.5 text-emerald-600 stroke-[2.2]" />
              ) : (
                <Table className="size-3.5 text-slate-400 group-hover:text-slate-700" />
              )}
              <span className="text-[11.5px] font-medium">Copy Table TSV</span>
            </motion.button>
          )}

          {/* Action 4: Regenerate Assistant Response */}
          {onRegenerate && (
            <motion.button
              type="button"
              onClick={onRegenerate}
              {...tactileProps.button}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200/60 transition-colors cursor-pointer"
              title="Tạo lại phản hồi này với AI"
              aria-label="Tạo lại phản hồi"
            >
              <RotateCcw className="size-3.5 text-slate-400 group-hover:text-slate-700" />
              <span className="text-[11.5px] font-medium">Tạo lại</span>
            </motion.button>
          )}

          {onFeedback && (
            <div className="ml-0.5 inline-flex items-center border-l border-slate-200 pl-1.5">
              <motion.button
                type="button"
                onClick={() => onFeedback("up")}
                {...tactileProps.iconButton}
                className={`inline-flex size-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${feedback === "up" ? "bg-emerald-50 text-emerald-700" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}
                title="Phản hồi hữu ích"
                aria-label="Đánh giá phản hồi hữu ích"
                aria-pressed={feedback === "up"}
              >
                <ThumbsUp className="size-3.5" />
              </motion.button>
              <motion.button
                type="button"
                onClick={() => onFeedback("down")}
                {...tactileProps.iconButton}
                className={`inline-flex size-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${feedback === "down" ? "bg-rose-50 text-rose-700" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}
                title="Phản hồi chưa hữu ích"
                aria-label="Đánh giá phản hồi chưa hữu ích"
                aria-pressed={feedback === "down"}
              >
                <ThumbsDown className="size-3.5" />
              </motion.button>
            </div>
          )}

          {/* Action 5: Open Split View / Artifact Viewer */}
          {onOpenArtifact && (artifactName || artifactId) && (
            <motion.button
              type="button"
              onClick={onOpenArtifact}
              {...tactileProps.button}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200/60 transition-colors cursor-pointer"
              title={`Mở Split View tài liệu ${artifactName || ""}`}
              aria-label="Mở Split View / Artifact"
            >
              <ExternalLink className="size-3.5 text-slate-400 group-hover:text-slate-700" />
              <span className="text-[11.5px] font-medium">Mở Split View</span>
            </motion.button>
          )}

          {/* Action 6: Save as Artifact if requested */}
          {onSaveAsArtifact && !artifactName && (
            <motion.button
              type="button"
              onClick={() => onSaveAsArtifact("Tài liệu trích xuất từ AI Chat", content)}
              {...tactileProps.button}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-emerald-700 border border-transparent hover:border-slate-200/60 transition-colors cursor-pointer"
              title="Lưu trích đoạn này thành Artifact mới"
              aria-label="Lưu thành Artifact"
            >
              <Bookmark className="size-3.5 text-slate-400 group-hover:text-emerald-600" />
              <span className="text-[11.5px] font-medium">Lưu Artifact</span>
            </motion.button>
          )}
        </>
      )}
    </div>
  )
}
