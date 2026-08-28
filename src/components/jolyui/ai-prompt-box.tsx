import React, { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ArrowUp, 
  Send, 
  Paperclip, 
  Globe, 
  Clock, 
  X,
  Link as LinkIcon
} from "lucide-react"

// Embedded CSS for minimal custom scrollbar styles as in JolyUI
const styles = `
textarea::-webkit-scrollbar {
  width: 5px;
}
textarea::-webkit-scrollbar-track {
  background: transparent;
}
textarea::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 3px;
}
textarea::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}
`

const useStyleInjection = () => {
  useEffect(() => {
    const styleId = "joly-ai-prompt-box-styles"
    if (typeof document !== "undefined" && !document.getElementById(styleId)) {
      const styleSheet = document.createElement("style")
      styleSheet.id = styleId
      styleSheet.innerText = styles
      document.head.appendChild(styleSheet)
    }
  }, [])
}

// Custom JolyUI Gradient Divider
const CustomDivider: React.FC = () => (
  <div className="relative mx-1 h-5 w-[1.5px] shrink-0">
    <div
      className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-slate-300 to-transparent"
      style={{
        clipPath: "polygon(0% 0%, 100% 0%, 100% 40%, 140% 50%, 100% 60%, 100% 100%, 0% 100%, 0% 60%, -40% 50%, 0% 40%)",
      }}
    />
  </div>
)

export interface AiPromptBoxProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e?: React.FormEvent) => void
  submitting?: boolean
  placeholder?: string
  linkValue?: string
  onLinkChange?: (value: string) => void
  showLinkInput?: boolean
  onToggleLinkInput?: () => void
  quickSuggestions?: string[]
  onSelectSuggestion?: (suggestion: string) => void
  enableAi?: boolean
  className?: string
  onSendToPo?: (customNote?: string) => void
  onPending?: (customNote?: string) => void
}

export function AiPromptBox({
  value,
  onChange,
  onSubmit,
  submitting = false,
  placeholder = "Nhập ghi chú hoặc trao đổi tiến độ bài toán...",
  linkValue = "",
  onLinkChange,
  showLinkInput = false,
  onToggleLinkInput,
  className = "",
}: AiPromptBoxProps) {
  useStyleInjection()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Track active modes
  const isSendPoActive = value.toLowerCase().includes("@sentopo:") || value.toLowerCase().includes("@sendtopo:")
  const isPendingActive = value.toLowerCase().includes("@pending:")

  // Auto-resize textarea height as content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !submitting) {
        onSubmit()
      }
    }
  }

  const handleToggleMode = useCallback((mode: "send_po" | "pending") => {
    let newText = value
    const sendPoRegex = /^@sen(d)?topo:\s*/i
    const pendingRegex = /^@pending:\s*/i

    if (mode === "send_po") {
      if (sendPoRegex.test(newText)) {
        newText = newText.replace(sendPoRegex, "")
      } else {
        newText = newText.replace(pendingRegex, "")
        newText = `@SenToPO: ${newText.trimStart()}`
      }
    } else if (mode === "pending") {
      if (pendingRegex.test(newText)) {
        newText = newText.replace(pendingRegex, "")
      } else {
        newText = newText.replace(sendPoRegex, "")
        newText = `@Pending: ${newText.trimStart()}`
      }
    }

    onChange(newText)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const len = newText.length
        textareaRef.current.setSelectionRange(len, len)
      }
    }, 50)
  }, [value, onChange])

  const hasContent = value.trim() !== "" || Boolean(linkValue && linkValue.trim())

  return (
    <div className={`space-y-2 ${className}`}>
      {/* JolyUI Prompt Box Container (Light Theme) */}
      <div 
        className="rounded-3xl border border-slate-200/90 bg-white p-2.5 shadow-sm transition-all duration-300 ease-in-out focus-within:border-[#1057FB] focus-within:ring-2 focus-within:ring-[#1057FB]/15"
      >
        {/* Expandable Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isSendPoActive 
              ? "Nhập nội dung bàn giao gửi PO xem xét..." 
              : isPendingActive 
              ? "Nhập lý do chuyển trạng thái Pending..." 
              : placeholder
          }
          className="flex min-h-[42px] w-full resize-none rounded-md border-none bg-transparent px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus-visible:outline-none leading-relaxed"
        />

        {/* Deliverable/Figma Link Input Bar */}
        <AnimatePresence>
          {showLinkInput && onLinkChange && (
            <motion.div
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-2.5 py-1.5 border-t border-slate-100 flex items-center gap-2 bg-slate-50/90 rounded-xl my-1"
            >
              <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="url"
                value={linkValue}
                onChange={(e) => onLinkChange(e.target.value)}
                placeholder="https://www.figma.com/design/..."
                className="w-full text-xs bg-white text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 outline-none font-mono text-[11px] placeholder:text-slate-400"
              />
              {onToggleLinkInput && (
                <button
                  type="button"
                  onClick={onToggleLinkInput}
                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* JolyUI Actions Toolbar */}
        <div className="flex items-center justify-between gap-2 p-0 pt-1.5 border-t border-slate-100/80">
          
          {/* Left Action Buttons with JolyUI Rotation & Width Expand Animation */}
          <div className="flex items-center gap-0.5 select-none">
            
            {/* 1. Attachment / Figma Link */}
            {onToggleLinkInput && (
              <>
                <button
                  type="button"
                  onClick={onToggleLinkInput}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
                    showLinkInput 
                      ? "bg-blue-50 text-[#1057FB]" 
                      : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                  title="Đính kèm link Figma / tài liệu"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <CustomDivider />
              </>
            )}

            {/* 3. Send to PO Action Button (JolyUI Rotate & Expand Animation) */}
            <button
              type="button"
              onClick={() => handleToggleMode("send_po")}
              className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all cursor-pointer ${
                isSendPoActive
                  ? "border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#8B5CF6] font-semibold"
                  : "border-transparent bg-transparent text-slate-500 hover:text-purple-600 hover:bg-purple-50/80"
              }`}
              title="Bật/Tắt chế độ Gửi PO"
            >
              <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                <motion.div
                  animate={{
                    rotate: isSendPoActive ? 360 : 0,
                    scale: isSendPoActive ? 1.15 : 1,
                  }}
                  whileHover={{
                    rotate: isSendPoActive ? 360 : 15,
                    scale: 1.15,
                    transition: { type: "spring", stiffness: 300, damping: 10 },
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 25 }}
                >
                  <Send className={`h-3.5 w-3.5 ${isSendPoActive ? "text-[#8B5CF6]" : "text-inherit"}`} />
                </motion.div>
              </div>
              <AnimatePresence>
                {isSendPoActive && (
                  <motion.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="flex-shrink-0 overflow-hidden whitespace-nowrap text-[#8B5CF6] text-xs font-bold"
                  >
                    Gửi PO
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <CustomDivider />

            {/* 4. Pending Action Button (JolyUI Rotate & Expand Animation) */}
            <button
              type="button"
              onClick={() => handleToggleMode("pending")}
              className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all cursor-pointer ${
                isPendingActive
                  ? "border-[#F59E0B] bg-[#F59E0B]/15 text-[#D97706] font-semibold"
                  : "border-transparent bg-transparent text-slate-500 hover:text-amber-600 hover:bg-amber-50/80"
              }`}
              title="Bật/Tắt chế độ Pending"
            >
              <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                <motion.div
                  animate={{
                    rotate: isPendingActive ? 360 : 0,
                    scale: isPendingActive ? 1.15 : 1,
                  }}
                  whileHover={{
                    rotate: isPendingActive ? 360 : 15,
                    scale: 1.15,
                    transition: { type: "spring", stiffness: 300, damping: 10 },
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 25 }}
                >
                  <Clock className={`h-3.5 w-3.5 ${isPendingActive ? "text-[#D97706]" : "text-inherit"}`} />
                </motion.div>
              </div>
              <AnimatePresence>
                {isPendingActive && (
                  <motion.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="flex-shrink-0 overflow-hidden whitespace-nowrap text-[#D97706] text-xs font-bold"
                  >
                    Pending
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

          </div>

          {/* Right Action: JolyUI Circle Send Button */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 hidden sm:inline-block font-mono">
              Enter ↵
            </span>
            <button
              type="button"
              onClick={() => onSubmit()}
              disabled={!hasContent || submitting}
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                hasContent && !submitting
                  ? "bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-xs"
                  : "bg-slate-100 text-slate-300 cursor-not-allowed"
              }`}
              title="Gửi tin nhắn"
            >
              <ArrowUp className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
export default AiPromptBox
