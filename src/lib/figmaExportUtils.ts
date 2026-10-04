/**
 * ==============================================================================
 * FIGMA EXPORT UTILITIES: CLEAN TEXT & AUTO-LAYOUT TSV FORMATTERS
 * Milestone: M3 (Designer Chat UX & Accessibility)
 * Purpose: Allows UX/UI designers to copy assistant output directly into Figma
 * text layers and auto-layout tables without manual markup cleanup.
 * ==============================================================================
 */

/**
 * Strips Markdown syntax (headers #, bold **, italic *, blockquotes >, code ticks `,
 * strikethrough ~~, links, and bullet markers while keeping indentation and clean text structure)
 * so that when pasted into a Figma text layer, it looks clean and ready for typography styling.
 */
export function formatMarkdownForFigmaText(markdown: string): string {
  if (!markdown || typeof markdown !== "string") return ""

  let text = markdown

  // 1. Remove thinking / reasoning blocks if leaked
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "")

  // 2. Remove markdown headers: # Header -> Header
  text = text.replace(/^#{1,6}\s+(.*)$/gm, "$1")

  // 3. Remove bold / italic: **text**, *text*, __text__, _text_
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1")
  text = text.replace(/\*([^*]+)\*/g, "$1")
  text = text.replace(/__([^_]+)__/g, "$1")
  text = text.replace(/_([^_]+)_/g, "$1")

  // 4. Remove inline code: `code` -> code
  text = text.replace(/`([^`]+)`/g, "$1")

  // 5. Remove strikethrough: ~~text~~ -> text
  text = text.replace(/~~([^~]+)~~/g, "$1")

  // 6. Convert markdown links: [Text](url) -> Text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

  // 7. Convert list bullets (- , * , 1. ) to clean bullet •
  text = text.replace(/^[\s]*[-*+]\s+(.*)$/gm, "• $1")
  text = text.replace(/^[\s]*\d+\.\s+(.*)$/gm, "• $1")

  // 8. Remove blockquotes: > quote -> quote
  text = text.replace(/^>\s*(.*)$/gm, "$1")

  // 9. Trim excessive consecutive blank lines
  text = text.replace(/\n{3,}/g, "\n\n")

  return text.trim()
}

/**
 * Converts Markdown table headers and rows to tab-separated values (\t)
 * so pasting into Figma creates clean tabular auto-layouts or pasteable spreadsheets.
 */
export function exportTableToTSV(markdownTable: string): string {
  if (!markdownTable || typeof markdownTable !== "string") return ""

  const lines = markdownTable.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const rows: string[] = []

  for (const line of lines) {
    if (!line.includes("|")) continue
    // Skip separator lines: |---|---| or |:---|---:|
    if (/^\|?[\s\-:|]+\|?$/.test(line)) continue

    const cells = line
      .split("|")
      .map((c) => c.trim().replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1"))
      .filter((_, idx, arr) => {
        // Drop first and last empty elements caused by leading/trailing pipes
        if (idx === 0 && line.startsWith("|")) return false
        if (idx === arr.length - 1 && line.endsWith("|")) return false
        return true
      })

    if (cells.length > 0) {
      rows.push(cells.join("\t"))
    }
  }

  return rows.join("\n")
}

/**
 * Alias for extractMarkdownTableToTsv matching survey explorer report naming.
 */
export const extractMarkdownTableToTsv = exportTableToTSV

/**
 * Asynchronously copy text to clipboard with fallback for non-secure / iframe environments.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (err) {
    console.warn("[figmaExportUtils] navigator.clipboard failed, attempting fallback:", err)
  }

  try {
    if (typeof document !== "undefined") {
      const textArea = document.createElement("textarea")
      textArea.value = text
      textArea.style.position = "fixed"
      textArea.style.left = "-999999px"
      textArea.style.top = "-999999px"
      textArea.style.opacity = "0"
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const successful = document.execCommand("copy")
      document.body.removeChild(textArea)
      return successful
    }
  } catch (fallbackErr) {
    console.error("[figmaExportUtils] copyToClipboard fallback failed:", fallbackErr)
  }

  return false
}
