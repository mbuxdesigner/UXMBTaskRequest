/**
 * ==============================================================================
 * ECHO ASSISTANT ACTION BAR: FIGMA COPY, REGENERATE, RETRY & ARTIFACT DRAWER
 * Milestone: M3 (Designer Chat UX & Accessibility)
 * Purpose: Provides 1-click actions under Assistant bubbles tailored to designer workflows.
 * ==============================================================================
 */

import React, { useState } from "react"
import {
  Copy,
  Check,
  FileText,
  RotateCcw,
  RefreshCw,
  Table,
  ExternalLink,
  Bookmark,
} from "lucide-react"
import { toast } from "sonner"
import {
  formatMarkdownForFigmaText,
  exportTableToTSV,
  copyToClipboard,
} from "@/lib/figmaExportUtils"

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
      className={`flex items-center flex-wrap gap-1 pt-2 text-xs text-muted-foreground select-none transition-opacity ${className}`}
    >
      {hasError ? (
        // When message has error, prominently display Retry button
        onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-medium transition-colors cursor-pointer shadow-2xs"
            aria-label="Thử lại câu hỏi"
            title="Thử lại yêu cầu AI"
          >
            <RefreshCw className="size-3.5" />
            <span>Thử lại</span>
          </button>
        )
      ) : (
        <>
          {/* Action 1: Copy for Figma (Clean Text) */}
          <button
            type="button"
            onClick={() => handleCopy("figma")}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Sao chép văn bản sạch (đã lọc Markdown, dán thẳng vào Text Layer Figma)"
            aria-label="Copy dạng Text sạch cho Figma"
          >
            {copiedType === "figma" ? (
              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span className="text-[11.5px] font-medium">Copy cho Figma</span>
          </button>

          {/* Action 2: Copy Raw Markdown */}
          <button
            type="button"
            onClick={() => handleCopy("markdown")}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Sao chép nguyên văn Markdown gốc"
            aria-label="Copy Markdown gốc"
          >
            {copiedType === "markdown" ? (
              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <FileText className="size-3.5" />
            )}
            <span className="text-[11.5px]">Markdown</span>
          </button>

          {/* Action 3: Copy TSV Table for Figma Auto-layout if table is present */}
          {hasTable && (
            <button
              type="button"
              onClick={() => handleCopy("tsv")}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Sao chép bảng dạng TSV để dán tạo Auto-Layout trong Figma"
              aria-label="Copy bảng TSV cho Figma"
            >
              {copiedType === "tsv" ? (
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Table className="size-3.5" />
              )}
              <span className="text-[11.5px]">Copy Table TSV</span>
            </button>
          )}

          {/* Action 4: Regenerate Assistant Response */}
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Tạo lại phản hồi này với AI"
              aria-label="Tạo lại phản hồi"
            >
              <RotateCcw className="size-3.5" />
              <span className="text-[11.5px]">Tạo lại</span>
            </button>
          )}

          {/* Action 5: Open Split View / Artifact Viewer */}
          {onOpenArtifact && (artifactName || artifactId) && (
            <button
              type="button"
              onClick={onOpenArtifact}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              title={`Mở Split View tài liệu ${artifactName || ""}`}
              aria-label="Mở Split View / Artifact"
            >
              <ExternalLink className="size-3.5" />
              <span className="text-[11.5px]">Mở Split View</span>
            </button>
          )}

          {/* Action 6: Save as Artifact if requested */}
          {onSaveAsArtifact && !artifactName && (
            <button
              type="button"
              onClick={() => onSaveAsArtifact("Tài liệu trích xuất từ AI Chat", content)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-emerald-600 transition-colors cursor-pointer"
              title="Lưu trích đoạn này thành Artifact mới"
              aria-label="Lưu thành Artifact"
            >
              <Bookmark className="size-3.5" />
              <span className="text-[11.5px]">Lưu Artifact</span>
            </button>
          )}
        </>
      )}
    </div>
  )
}
