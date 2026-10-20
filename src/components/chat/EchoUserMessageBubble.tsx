/**
 * ==============================================================================
 * ECHO USER MESSAGE BUBBLE: FULL-WIDTH REUI QUERY CARD & INLINE RESEND
 * Milestone: M3 (Designer Chat UX & Accessibility)
 * Purpose: Renders user questions as full-width ReUI cards across the reading column
 * instead of cramped right-aligned messenger bubbles.
 * ==============================================================================
 */

import React, { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Pencil, Send, FileText, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { tactileProps } from "@/lib/motion"
import { UserAvatar } from "@/components/common/UserAvatar"
import { cn } from "@/lib/utils"

export interface EchoUserMessageBubbleProps {
  message: {
    id: string
    content: string
    attachedArtifactName?: string
    attachedImageUrl?: string
    attachedImageName?: string
    senderName?: string
    senderAvatar?: string
  }
  senderName?: string
  senderAvatar?: string
  isStreaming?: boolean
  onEditAndResend: (newText: string) => void
  className?: string
}

export function EchoUserMessageBubble({
  message,
  senderName,
  senderAvatar,
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
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
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

  const displayName = senderName || message.senderName || "Bạn"
  const displayAvatar = senderAvatar || message.senderAvatar

  if (isEditing) {
    return (
      <div className={cn("w-full rounded-2xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-card p-3.5 sm:p-4 shadow-xs space-y-2.5", className)}>
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <UserAvatar name={displayName} avatarUrl={displayAvatar} size="xs" className="size-5" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">{displayName}</span>
            <span className="text-slate-400">· Chỉnh sửa câu hỏi</span>
          </div>
        </div>

        <div className="relative rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50 overflow-hidden focus-within:ring-2 focus-within:ring-slate-900/15">
          <textarea
            ref={textareaRef}
            value={draftText}
            onChange={(e) => {
              setDraftText(e.target.value)
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto"
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                if (e.nativeEvent.isComposing) return
                e.preventDefault()
                handleSaveAndResend()
              } else if (e.key === "Escape") {
                e.preventDefault()
                handleCancel()
              }
            }}
            rows={2}
            className="w-full p-3 text-[13.5px] sm:text-sm bg-transparent text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
            placeholder="Chỉnh sửa câu hỏi..."
            aria-label="Chỉnh sửa nội dung câu hỏi"
          />
        </div>

        <div className="flex items-center justify-end gap-2 text-xs">
          <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline select-none">
            Nhấn <kbd className="font-mono bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-neutral-700 text-[10px]">Enter</kbd> để gửi, <kbd className="font-mono bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-neutral-700 text-[10px]">Esc</kbd> để hủy
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-8 px-3 text-xs text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer font-medium"
          >
            Hủy
          </Button>
          <motion.button
            type="button"
            onClick={handleSaveAndResend}
            disabled={!draftText.trim()}
            {...tactileProps.button}
            className="h-8 px-3.5 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <Send className="size-3" />
            <span>Gửi lại</span>
          </motion.button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group relative w-full space-y-2 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/95 dark:bg-card/95 backdrop-blur-md p-3.5 sm:p-4 shadow-xs transition-all",
        className
      )}
    >
      {/* Header: User Avatar + Name + "Câu hỏi" Badge + Edit Button */}
      <div className="flex items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar
            name={displayName}
            avatarUrl={displayAvatar}
            size="xs"
            className="size-6 shrink-0 ring-1 ring-slate-200 dark:ring-neutral-700"
          />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
            {displayName}
          </span>
          <span className="inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800">
            Câu hỏi
          </span>
        </div>

        {!isStreaming && (
          <motion.button
            type="button"
            onClick={() => setIsEditing(true)}
            {...tactileProps.button}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Chỉnh sửa câu hỏi này"
            aria-label="Chỉnh sửa câu hỏi"
          >
            <Pencil className="size-3" />
            <span className="text-[11px] hidden sm:inline">Chỉnh sửa</span>
          </motion.button>
        )}
      </div>

      {/* Attached Image if any */}
      {message.attachedImageUrl && (
        <div className="relative rounded-xl overflow-hidden border border-slate-200/90 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 shadow-2xs max-w-[320px] group/img">
          <img
            src={message.attachedImageUrl}
            alt={message.attachedImageName || "Ảnh đính kèm"}
            className="w-full max-h-[220px] object-cover rounded-lg transition-transform hover:scale-[1.01] cursor-pointer"
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

      {/* Attached Artifact if any */}
      {message.attachedArtifactName && (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-neutral-700 shadow-2xs">
          <FileText className="size-3 text-slate-500" />
          <span>{message.attachedArtifactName}</span>
        </span>
      )}

      {/* Main Question Text */}
      <div className="text-[14px] sm:text-[15px] font-medium text-slate-900 dark:text-slate-100 leading-relaxed select-text pt-0.5">
        {message.content}
      </div>
    </div>
  )
}
