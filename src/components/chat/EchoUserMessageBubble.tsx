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
      <div className="flex w-full justify-end">
        <div className={cn("w-full max-w-[88%] space-y-2 rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-card p-3.5 shadow-xs sm:max-w-[82%] sm:p-4", className)}>
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
      </div>
    )
  }

  return (
    <div className="flex w-full items-center justify-end gap-2">
      <motion.div
        {...tactileProps.button}
        className={cn(
          "group relative w-fit max-w-[86%] rounded-2xl rounded-br-lg bg-slate-900 px-4 py-2.5 shadow-xs sm:max-w-[78%]",
          className
        )}
      >
        <div className="text-[13.5px] sm:text-sm font-medium leading-relaxed text-white select-text">
          {message.content}
        </div>
      </motion.div>
      <div className="group/avatar relative flex shrink-0 items-center">
        <UserAvatar
          name={displayName}
          avatarUrl={displayAvatar}
          size="xl"
          className="ring-1 ring-slate-200 dark:ring-neutral-700"
        />
        {!isStreaming && (
          <motion.button
            type="button"
            onClick={() => setIsEditing(true)}
            {...tactileProps.button}
            className="absolute right-0 top-full z-10 mt-1 grid size-6 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 opacity-0 shadow-xs transition-all hover:text-slate-800 focus-visible:opacity-100 group-hover/avatar:opacity-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-500 dark:hover:text-white"
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
