/**
 * ==============================================================================
 * ECHO USER MESSAGE BUBBLE: EDITABLE PROMPT & 1-CLICK RESEND
 * Milestone: M3 (Designer Chat UX & Accessibility)
 * Purpose: Allows designers to hover, edit prompts inline, and re-dispatch queries
 * without re-typing from scratch.
 * ==============================================================================
 */

import React, { useState, useRef, useEffect } from "react"
import { Pencil, X, Send, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface EchoUserMessageBubbleProps {
  message: {
    id: string
    content: string
    attachedArtifactName?: string
  }
  isStreaming?: boolean
  onEditAndResend: (newText: string) => void
  className?: string
}

export function EchoUserMessageBubble({
  message,
  isStreaming = false,
  onEditAndResend,
  className = "",
}: EchoUserMessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftText, setDraftText] = useState(message.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync draftText if external message changes
  useEffect(() => {
    if (!isEditing) {
      setDraftText(message.content)
    }
  }, [message.content, isEditing])

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      )
      // Auto-adjust height
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`
    }
  }, [isEditing])

  const handleSaveAndResend = () => {
    const trimmed = draftText.trim()
    if (!trimmed) return
    setIsEditing(false)
    if (trimmed !== message.content) {
      onEditAndResend(trimmed)
    }
  }

  const handleCancel = () => {
    setDraftText(message.content)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className={`space-y-2 w-full max-w-[85%] ml-auto ${className}`}>
        <div className="relative rounded-xl border border-primary/40 bg-background shadow-xs overflow-hidden focus-within:ring-2 focus-within:ring-primary/20">
          <textarea
            ref={textareaRef}
            value={draftText}
            onChange={(e) => {
              setDraftText(e.target.value)
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto"
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                // Safeguard against premature submit when typing Vietnamese diacritics via IME
                if (e.nativeEvent.isComposing) return
                e.preventDefault()
                handleSaveAndResend()
              } else if (e.key === "Escape") {
                e.preventDefault()
                handleCancel()
              }
            }}
            rows={2}
            className="w-full p-3 text-[13.5px] sm:text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed"
            placeholder="Chỉnh sửa câu hỏi... (Nhấn Enter để gửi lại, Shift+Enter để xuống dòng, Esc để hủy)"
            aria-label="Chỉnh sửa nội dung câu hỏi"
          />
        </div>

        <div className="flex items-center justify-end gap-2 text-xs">
          <span className="text-[11px] text-muted-foreground mr-1 hidden sm:inline">
            Nhấn <kbd className="font-mono bg-muted px-1 rounded">Enter</kbd> để gửi, <kbd className="font-mono bg-muted px-1 rounded">Esc</kbd> để hủy
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveAndResend}
            disabled={!draftText.trim()}
            className="h-7 px-3 text-xs bg-slate-900 hover:bg-slate-800 text-white cursor-pointer gap-1 shadow-2xs"
          >
            <Send className="size-3" />
            <span>Gửi lại</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`group relative space-y-1 max-w-[85%] flex flex-col items-end ${className}`}>
      {message.attachedArtifactName && (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          <FileText className="size-3" />
          <span>{message.attachedArtifactName}</span>
        </span>
      )}

      <div className="relative">
        <div className="rounded-2xl rounded-br-xs bg-muted/70 text-foreground px-3.5 py-2 text-[13.5px] sm:text-sm leading-relaxed select-text">
          {message.content}
        </div>

        {/* Hover Edit Prompt Button */}
        {!isStreaming && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="absolute -left-7 top-1/2 -translate-y-1/2 size-6 rounded-full bg-background border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-2xs cursor-pointer"
            title="Chỉnh sửa câu hỏi này"
            aria-label="Chỉnh sửa câu hỏi"
          >
            <Pencil className="size-3" />
          </button>
        )}
      </div>
    </div>
  )
}
