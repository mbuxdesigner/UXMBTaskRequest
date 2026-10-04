import React, { useState, useMemo } from "react"
import {
  FileText,
  FileCode,
  FileSpreadsheet,
  X,
  ExternalLink,
  Copy,
  Check,
  File,
  Trash2
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { UXArtifact } from "@/services/aiArtifactsService"

interface EchoArtifactSplitViewerProps {
  artifact: UXArtifact
  onClose: () => void
  onAskAboutDoc?: (prompt: string) => void
  onDelete?: () => void
  canDelete?: boolean
}

/**
 * Helper to get distinctive file icon & color badge matching ReUI Echo Chat
 */
function getArtifactIcon(fileType: string, ext?: string) {
  const normalized = (ext || fileType).toLowerCase()
  if (normalized === "pdf" || fileType === "pdf") {
    return {
      icon: FileText,
      color: "text-rose-500/90 dark:text-rose-400 stroke-[1.5]",
      bg: "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-900/40",
      label: "PDF",
    }
  }
  if (["ts", "tsx", "js", "jsx", "code", "json"].includes(normalized) || fileType === "code" || fileType === "json") {
    return {
      icon: FileCode,
      color: "text-sky-500/90 dark:text-sky-400 stroke-[1.5]",
      bg: "bg-sky-50/60 dark:bg-sky-950/30 border-sky-200/50 dark:border-sky-900/40",
      label: normalized === "json" ? "JSON" : "CODE",
    }
  }
  if (normalized === "csv" || fileType === "csv") {
    return {
      icon: FileSpreadsheet,
      color: "text-emerald-500/90 dark:text-emerald-400 stroke-[1.5]",
      bg: "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-900/40",
      label: "CSV",
    }
  }
  return {
    icon: FileText,
    color: "text-slate-500 dark:text-slate-400 stroke-[1.5]",
    bg: "bg-slate-100/70 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-700/40",
    label: "DOC",
  }
}

/**
 * Inline text parser for bold **text**, italic *text*, and `code`
 */
function formatInlineText(text: string): React.ReactNode {
  if (!text) return null

  // Auto-bold key-value prefix if not already markdown formatted
  // e.g. "Định vị UX: ..." or "Lãi suất: ..." -> bold "Định vị UX:"
  if (!text.includes("**") && !text.includes("*") && !text.includes("`")) {
    const colonMatch = text.match(/^([A-ZÀ-Ỹa-zà-ỹ0-9\s/]{2,30}:)(\s+.*)?$/)
    if (colonMatch) {
      return (
        <>
          <strong className="font-semibold text-[#1F2328]">{colonMatch[1]}</strong>
          {colonMatch[2] ? colonMatch[2] : null}
        </>
      )
    }
  }

  // Regex splitting by bold, inline code, and links
  const parts: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g
  let lastIdx = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(
        <React.Fragment key={`txt-${lastIdx}`}>
          {text.substring(lastIdx, match.index)}
        </React.Fragment>
      )
    }
    const token = match[0]
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-[#1F2328]">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith("`") && token.endsWith("`")) {
      // Exact Notion-style inline code tag (soft red text on warm light grey badge)
      parts.push(
        <code
          key={`c-${match.index}`}
          className="font-mono text-[85%] px-1.5 py-0.5 rounded-[4px] bg-[rgba(135,131,120,0.15)] text-[#EB5757] font-normal"
        >
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={`i-${match.index}`} className="italic text-[#787774]">
          {token.slice(1, -1)}
        </em>
      )
    } else if (token.startsWith("[") && token.includes("](")) {
      const titleMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/)
      if (titleMatch) {
        parts.push(
          <a
            key={`a-${match.index}`}
            href={titleMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#37352F] underline underline-offset-2 decoration-[#C4C4C2] hover:decoration-[#37352F] transition-colors font-medium"
          >
            {titleMatch[1]}
          </a>
        )
      } else {
        parts.push(<React.Fragment key={`tok-${match.index}`}>{token}</React.Fragment>)
      }
    } else {
      parts.push(<React.Fragment key={`tok-${match.index}`}>{token}</React.Fragment>)
    }
    lastIdx = match.index + token.length
  }

  if (lastIdx < text.length) {
    parts.push(
      <React.Fragment key={`txt-end-${lastIdx}`}>
        {text.substring(lastIdx)}
      </React.Fragment>
    )
  }

  return parts.length > 0 ? parts : text
}

export function EchoArtifactSplitViewer({
  artifact,
  onClose,
  onAskAboutDoc,
  onDelete,
  canDelete = false,
}: EchoArtifactSplitViewerProps) {
  const [isCopied, setIsCopied] = useState<boolean>(false)

  const ext = artifact.name.split(".").pop()?.toLowerCase() || ""
  const iconMeta = getArtifactIcon(artifact.fileType, ext)
  const IconComponent = iconMeta.icon

  const handleCopyContent = () => {
    navigator.clipboard.writeText(artifact.content)
    setIsCopied(true)
    toast.success("Đã sao chép nội dung tài liệu")
    setTimeout(() => setIsCopied(false), 2000)
  }

  // Parse structured blocks from markdown / text content in Notion styling
  const renderedContent = useMemo(() => {
    if (artifact.fileType === "code" || artifact.fileType === "json") {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4 py-2 rounded-t-md bg-[#F7F6F3] text-[#787774] text-xs font-mono border border-b-0 border-[#E9E9E7]">
            <span className="font-medium text-[#37352F]">{artifact.name}</span>
            <button
              onClick={handleCopyContent}
              className="flex items-center gap-1 text-[#787774] hover:text-[#37352F] transition-colors cursor-pointer"
            >
              {isCopied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              <span>{isCopied ? "Đã chép" : "Sao chép"}</span>
            </button>
          </div>
          <pre className="p-4 sm:p-5 rounded-b-md bg-[#F7F6F3] text-[#37352F] font-mono text-[13.5px] leading-relaxed overflow-x-auto border border-[#E9E9E7]">
            <code>{artifact.content}</code>
          </pre>
        </div>
      )
    }

    if (artifact.fileType === "csv") {
      const rows = artifact.content
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean)
        .map((r) => r.split(",").map((c) => c.replace(/^["']|["']$/g, "").trim()))

      if (rows.length > 0) {
        const header = rows[0]
        const dataRows = rows.slice(1)
        return (
          <div className="overflow-x-auto rounded-md border border-[#E9E9E7] my-4 shadow-2xs">
            <table className="w-full text-left text-[13.5px] border-collapse font-sans">
              <thead className="bg-[#F7F6F3] text-[#787774] font-medium border-b border-[#E9E9E7]">
                <tr>
                  {header.map((col, idx) => (
                    <th key={idx} className="p-3 border-r border-[#E9E9E7] last:border-r-0 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E9E7] text-[#37352F]">
                {dataRows.map((r, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#FBFBFA] transition-colors">
                    {r.map((c, cIdx) => (
                      <td key={cIdx} className="p-3 border-r border-[#E9E9E7] last:border-r-0 whitespace-nowrap">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    }

    // High-fidelity Markdown line-by-line block parser (Exact Notion visual system)
    const rawLines = artifact.content.split(/\r?\n/)
    const elements: React.ReactNode[] = []
    let i = 0

    while (i < rawLines.length) {
      const line = rawLines[i]
      const trimmed = line.trim()

      // 1. Skip completely empty lines
      if (!trimmed) {
        i++
        continue
      }

      // 2. Notion Divider (---)
      if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
        elements.push(<hr key={`hr-${i}`} className="my-6 border-0 h-[1px] bg-[#E9E9E7]" />)
        i++
        continue
      }

      // 3. Headings (Single line only!)
      if (trimmed.startsWith("# ")) {
        elements.push(
          <div key={`h1-${i}`} className="group relative -ml-6 pl-6 pt-1 pb-1 mb-2">
            <div className="absolute left-0 top-2 opacity-50 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-xs text-[#9B9A97] select-none cursor-grab">
              <span className="text-sm leading-none font-light">+</span>
              <span className="text-xs leading-none tracking-tighter">⋮⋮</span>
            </div>
            <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-[#1F2328] leading-[1.3]">
              {formatInlineText(trimmed.replace(/^#\s+/, ""))}
            </h1>
          </div>
        )
        i++
        continue
      }

      if (trimmed.startsWith("## ")) {
        elements.push(
          <div key={`h2-${i}`} className="group relative -ml-6 pl-6 pt-5 pb-1 mb-1">
            <div className="absolute left-0 top-6 opacity-0 group-hover:opacity-50 transition-opacity flex items-center gap-0.5 text-xs text-[#9B9A97] select-none cursor-grab">
              <span className="text-sm leading-none font-light">+</span>
              <span className="text-xs leading-none tracking-tighter">⋮⋮</span>
            </div>
            <h2 className="text-[19px] sm:text-[22px] font-bold text-[#1F2328] tracking-tight leading-[1.3]">
              {formatInlineText(trimmed.replace(/^##\s+/, ""))}
            </h2>
          </div>
        )
        i++
        continue
      }

      if (trimmed.startsWith("### ")) {
        elements.push(
          <div key={`h3-${i}`} className="pt-4 pb-1 mb-1">
            <h3 className="text-[16px] sm:text-[18px] font-bold text-[#1F2328] tracking-tight leading-[1.3]">
              {formatInlineText(trimmed.replace(/^###\s+/, ""))}
            </h3>
          </div>
        )
        i++
        continue
      }

      // 3b. Numbered section heading (e.g. "1.1. TK Siêu Lãi Ngày" or "1.2. Chứng chỉ tiền gửi")
      if (/^(\d+\.\d+(?:\.\d+)*\.?)\s+(.+)$/.test(trimmed)) {
        elements.push(
          <div key={`h-num-${i}`} className="pt-5 pb-1 mt-2 mb-1">
            <h3 className="text-[16px] sm:text-[18px] font-bold text-[#1F2328] tracking-tight leading-[1.3]">
              {formatInlineText(trimmed)}
            </h3>
          </div>
        )
        i++
        continue
      }

      // 4. Code block (``` to ```)
      if (trimmed.startsWith("```")) {
        const startIdx = i
        const codeLines: string[] = []
        i++
        while (i < rawLines.length && !rawLines[i].trim().startsWith("```")) {
          codeLines.push(rawLines[i])
          i++
        }
        if (i < rawLines.length && rawLines[i].trim().startsWith("```")) {
          i++ // skip closing ```
        }
        const codeContent = codeLines.join("\n")
        elements.push(
          <div key={`code-${startIdx}`} className="relative group my-3">
            <pre className="p-4 sm:p-5 rounded-md bg-[#F7F6F3] text-[#37352F] font-mono text-[13.5px] leading-relaxed overflow-x-auto border border-[#E9E9E7]/60">
              <code>{codeContent}</code>
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(codeContent)
                toast.success("Đã sao chép mã")
              }}
              className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-white shadow-2xs border border-[#E9E9E7] text-[#787774] hover:text-[#37352F] hover:bg-white text-xs cursor-pointer flex items-center gap-1"
              title="Sao chép"
            >
              <Copy className="size-3" />
              <span className="text-[11px]">Copy</span>
            </button>
          </div>
        )
        continue
      }

      // 5. Notion Callout / Quote (> ...)
      if (trimmed.startsWith("> ")) {
        const startIdx = i
        const quoteLines: string[] = []
        while (i < rawLines.length && rawLines[i].trim().startsWith(">")) {
          quoteLines.push(rawLines[i].trim().replace(/^>\s*/, ""))
          i++
        }
        const quoteContent = quoteLines.join("\n")
        elements.push(
          <div
            key={`quote-${startIdx}`}
            className="flex items-start gap-3 p-4 rounded-md bg-[#F1F1EF] text-[#37352F] text-[15px] leading-relaxed my-3 border border-[#E9E9E7]/40"
          >
            <span className="text-base select-none shrink-0">💡</span>
            <div className="flex-1">
              {formatInlineText(quoteContent)}
            </div>
          </div>
        )
        continue
      }

      // 6. Markdown Table (| ... |)
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const startIdx = i
        const tableLines: string[] = []
        while (i < rawLines.length && rawLines[i].trim().startsWith("|") && rawLines[i].trim().endsWith("|")) {
          tableLines.push(rawLines[i].trim())
          i++
        }
        if (tableLines.length >= 2) {
          const headerCells = tableLines[0]
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim())
          const bodyLines = tableLines.slice(1).filter((l) => !/^[\|\s\-:]+$/.test(l))
          elements.push(
            <div key={`table-${startIdx}`} className="overflow-x-auto rounded-md border border-[#E9E9E7] my-4 shadow-2xs">
              <table className="w-full text-left text-[13.5px] border-collapse font-sans">
                <thead className="bg-[#F7F6F3] text-[#787774] font-medium border-b border-[#E9E9E7]">
                  <tr>
                    {headerCells.map((cell, cIdx) => (
                      <th key={cIdx} className="p-3 border-r border-[#E9E9E7] last:border-r-0">
                        {formatInlineText(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9E9E7] text-[#37352F]">
                  {bodyLines.map((rowLine, rIdx) => {
                    const cells = rowLine
                      .split("|")
                      .slice(1, -1)
                      .map((c) => c.trim())
                    return (
                      <tr key={rIdx} className="hover:bg-[#FBFBFA] transition-colors">
                        {cells.map((cell, cIdx) => (
                          <td key={cIdx} className="p-3 border-r border-[#E9E9E7] last:border-r-0">
                            {formatInlineText(cell)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
          continue
        }
      }

      // 7. Bullet list (- or * or + or • or ◦ or ▪ with multi-level nesting)
      if (/^(\s*)([-*+•◦▪])\s+/.test(line)) {
        const startIdx = i
        interface BulletItem {
          level: number
          content: string
        }
        const bulletItems: BulletItem[] = []

        while (i < rawLines.length) {
          const curLine = rawLines[i]
          if (!curLine.trim()) {
            if (i + 1 < rawLines.length && /^(\s*)([-*+•◦▪])\s+/.test(rawLines[i + 1])) {
              i++
              continue
            }
            break
          }
          const bMatch = curLine.match(/^(\s*)([-*+•◦▪])\s+(.*)$/)
          if (!bMatch) break

          const indentSpaces = bMatch[1].length
          const markerChar = bMatch[2]
          const itemText = bMatch[3]

          let level = 0
          if (markerChar === "▪") {
            level = 2
          } else if (markerChar === "◦") {
            level = 1
          } else if (markerChar === "•") {
            level = indentSpaces >= 4 ? 2 : indentSpaces >= 2 ? 1 : 0
          } else {
            // -, *, +
            level = indentSpaces >= 4 ? 2 : indentSpaces >= 2 ? 1 : 0
          }

          bulletItems.push({
            level,
            content: itemText,
          })
          i++
        }

        elements.push(
          <div key={`ul-${startIdx}`} className="space-y-1.5 my-2">
            {bulletItems.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-2.5 text-[15px] sm:text-[15.5px] text-[#37352F] leading-[1.6]",
                  item.level === 1 && "pl-6 sm:pl-7",
                  item.level >= 2 && "pl-12 sm:pl-14"
                )}
              >
                {item.level === 0 && (
                  <span className="size-1.5 rounded-full bg-[#37352F] mt-2.5 shrink-0 select-none" />
                )}
                {item.level === 1 && (
                  <span className="size-1.5 rounded-full border-[1.5px] border-[#37352F] bg-white mt-2.5 shrink-0 select-none" />
                )}
                {item.level >= 2 && (
                  <span className="size-1.5 rounded-[1px] bg-[#37352F] mt-2.5 shrink-0 select-none" />
                )}
                <div className="flex-1 leading-relaxed">
                  {formatInlineText(item.content)}
                </div>
              </div>
            ))}
          </div>
        )
        continue
      }

      // 8. Numbered list (1. 2. 3.)
      if (/^\d+\.\s+/.test(trimmed)) {
        const startIdx = i
        const numItems: { marker: string; text: string }[] = []
        while (i < rawLines.length) {
          const lTrim = rawLines[i].trim()
          const nMatch = lTrim.match(/^(\d+)\.\s+(.*)/)
          if (!nMatch) break
          numItems.push({ marker: nMatch[1], text: nMatch[2] })
          i++
        }
        elements.push(
          <ol key={`ol-${startIdx}`} className="space-y-1.5 my-2 pl-1">
            {numItems.map((it, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-[15px] sm:text-[15.5px] text-[#37352F] leading-[1.6]">
                <span className="font-medium text-[#37352F] shrink-0 select-none min-w-[1.2rem]">
                  {it.marker}.
                </span>
                <div className="flex-1 leading-relaxed">
                  {formatInlineText(it.text)}
                </div>
              </li>
            ))}
          </ol>
        )
        continue
      }

      // 9. Regular Paragraph (Consume consecutive text lines)
      const startIdx = i
      const paraLines: string[] = []
      while (i < rawLines.length) {
        const lTrim = rawLines[i].trim()
        if (!lTrim) break
        if (
          lTrim.startsWith("#") ||
          lTrim.startsWith("```") ||
          lTrim.startsWith("> ") ||
          lTrim === "---" ||
          lTrim === "***" ||
          (lTrim.startsWith("|") && lTrim.endsWith("|")) ||
          /^(\s*)([-*+•◦▪])\s+/.test(rawLines[i]) ||
          /^\d+\.\s+/.test(lTrim) ||
          /^(\d+\.\d+(?:\.\d+)*\.?)\s+/.test(lTrim)
        ) {
          break
        }
        paraLines.push(lTrim)
        i++
      }

      if (paraLines.length > 0) {
        elements.push(
          <p key={`p-${startIdx}`} className="text-[15px] sm:text-[15.5px] text-[#37352F] leading-[1.65] font-normal my-2">
            {formatInlineText(paraLines.join(" "))}
          </p>
        )
      }
    }

    return (
      <div className="space-y-2 font-sans leading-relaxed text-[#37352F]">
        {elements}
      </div>
    )

  }, [artifact.content, artifact.fileType, artifact.name, isCopied])

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white h-full border-l border-[#EDEDEB]">
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER (NOTION-STYLE EDITORIAL HEADER)                      */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-[#EDEDEB] text-xs shrink-0 select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {/* Left: File Icon + Title + Meta */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={cn("size-7 rounded-md border flex items-center justify-center shrink-0", iconMeta.bg)}>
            <IconComponent className={cn("size-3.5 stroke-[1.5]", iconMeta.color)} />
          </div>

          <div className="min-w-0 flex-1 truncate">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#37352F] text-xs sm:text-sm truncate">
                {artifact.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] text-[#787774] font-mono">
              <span>{iconMeta.label}, {artifact.size}</span>
              {artifact.tags && artifact.tags.length > 0 && (
                <>
                  <span>•</span>
                  <span className="truncate text-[#787774]">#{artifact.tags[0]}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions matching Notion / Echo Chat */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Google Drive Link if present */}
          {artifact.driveUrl && (
            <a
              href={artifact.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#EDEDEB] bg-white hover:bg-[#F7F6F3] text-[#37352F] text-xs font-medium cursor-pointer transition-colors"
              title="Mở trên Google Drive"
            >
              <ExternalLink className="size-3.5" />
              <span className="hidden sm:inline">Drive</span>
            </a>
          )}

          {/* Delete artifact button */}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Bạn có chắc chắn muốn xóa tài liệu "${artifact.name}" không?`)) {
                  onDelete()
                }
              }}
              className="size-7 rounded-md hover:bg-rose-50 text-[#787774] hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
              title="Xóa tài liệu này"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}

          {/* Close artifact button */}
          <button
            type="button"
            onClick={onClose}
            className="size-7 rounded-md hover:bg-[#F7F6F3] text-[#787774] hover:text-[#37352F] flex items-center justify-center cursor-pointer transition-colors"
            title="Đóng tài liệu"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 2. DOCUMENT CANVAS BODY (CLEAN SEAMLESS NOTION CANVAS)             */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white select-text">
        <div className="w-full max-w-3xl xl:max-w-4xl mx-auto px-6 sm:px-12 lg:px-16 py-8 sm:py-12 font-sans">
          {renderedContent}
        </div>
      </div>
    </div>
  )
}

