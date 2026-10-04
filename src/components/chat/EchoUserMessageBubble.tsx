/**
 * ==============================================================================
 * ECHO USER MESSAGE BUBBLE: EDITABLE PROMPT & 1-CLICK RESEND
 * Milestone: M3 (Designer Chat UX & Accessibility)
 * Purpose: Allows designers to hover, edit prompts inline, and re-dispatch queries
 * without re-typing from scratch.
 * ==============================================================================
 */

import React, { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Pencil, X, Send, FileText, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { springs, tactileProps } from "@/lib/motion"

export interface EchoUserMessageBubbleProps {
  message: {
    id: string
    content: string
    attachedArtifactName?: string
    attachedImageUrl?: string
    attachedImageName?: string
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
        <div className="relative rounded-2xl border border-slate-300 bg-white shadow-xs overflow-hidden focus-within:ring-2 focus-within:ring-slate-900/15 focus-within:border-slate-400">
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
            className="w-full p-3.5 text-[13.5px] sm:text-sm bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
            placeholder="Chỉnh sửa câu hỏi... (Nhấn Enter để gửi lại, Shift+Enter để xuống dòng, Esc để hủy)"
            aria-label="Chỉnh sửa nội dung câu hỏi"
          />
        </div>

        <div className="flex items-center justify-end gap-2 text-xs">
          <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline select-none">
            Nhấn <kbd className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">Enter</kbd> để gửi, <kbd className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">Esc</kbd> để hủy
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-8 px-3 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer font-medium"
          >
            Hủy
          </Button>
          <motion.button
            type="button"
            onClick={handleSaveAndResend}
            disabled={!draftText.trim()}
            {...tactileProps.button}
            className="h-8 px-3.5 text-xs bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl font-semibold cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="size-3" />
            <span>Gửi lại</span>
          </motion.button>
        </div>
      </div>
    )
  }

  return (
    <div className={`group relative space-y-1.5 max-w-[85%] flex flex-col items-end ${className}`}>
      {message.attachedImageUrl && (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 shadow-2xs max-w-[280px] sm:max-w-[340px] group/img">
          <img
            src={message.attachedImageUrl}
            alt={message.attachedImageName || "Ảnh đính kèm"}
            className="w-full max-h-[220px] object-cover rounded-xl transition-transform hover:scale-[1.01] cursor-pointer"
            onClick={() => window.open(message.attachedImageUrl, "_blank")}
            title="Bấm để xem ảnh phóng to"
          />
          <div className="p-1.5 px-2.5 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400 font-medium border-t border-slate-100 dark:border-neutral-800">
            <span className="truncate max-w-[200px] flex items-center gap-1.5 font-mono">
              <ImageIcon className="size-3 text-amber-500 shrink-0" />
              <span className="truncate">{message.attachedImageName || "Ảnh đính kèm"}</span>
            </span>
            <span className="text-[10px] text-slate-400">Xem ảnh ↗</span>
          </div>
        </div>
      )}

      {message.attachedArtifactName && (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 shadow-2xs">
          <FileText className="size-3 text-slate-500" />
          <span>{message.attachedArtifactName}</span>
        </span>
      )}

      <div className="relative">
        <div className="rounded-2xl rounded-br-xs bg-slate-100 text-slate-800 border border-slate-200/80 px-4 py-2.5 text-[13.5px] sm:text-sm leading-relaxed select-text shadow-2xs">
          {message.content}
        </div>

        {/* Hover Edit Prompt Button */}
        {!isStreaming && (
          <motion.button
            type="button"
            onClick={() => setIsEditing(true)}
            {...tactileProps.iconButton}
            className="absolute -left-7 top-1/2 -translate-y-1/2 size-6.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-2xs cursor-pointer"
            title="Chỉnh sửa câu hỏi này"
            aria-label="Chỉnh sửa câu hỏi"
          >
            <Pencil className="size-3" />
          </motion.button>
        )}
      </div>
    </div>
  )
}

