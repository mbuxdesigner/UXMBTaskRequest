import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Send, 
  Paperclip, 
  Smile, 
  Link as LinkIcon, 
  AtSign, 
  X,
} from "lucide-react"

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
}

const COMMON_EMOJIS = [
  "👍", "❤️", "🔥", "🚀", "🎉", "✨", 
  "✅", "👀", "🙌", "💯", "💡", "📌", 
  "🎨", "👏", "😊", "🙏", "⚠️", "⏳"
]

export function AiPromptBox({
  value,
  onChange,
  onSubmit,
  submitting = false,
  placeholder = "Nhập ghi chú hoặc bình luận trao đổi...",
  linkValue = "",
  onLinkChange,
  showLinkInput = false,
  onToggleLinkInput,
  quickSuggestions = [
    "🎨 Đã upload Figma",
    "🚀 Prototype sẵn sàng",
    "🔍 Cần PO review",
    "✅ Bàn giao Design",
  ],
  onSelectSuggestion,
  enableAi = false,
  className = "",
}: AiPromptBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

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

  const handleApplySuggestion = (sug: string) => {
    if (onSelectSuggestion) {
      onSelectSuggestion(sug)
    } else {
      onChange((value ? `${value} \n` : "") + sug)
    }
  }

  const handleInsertEmoji = (emoji: string) => {
    onChange((value ? `${value} ` : "") + emoji)
    setShowEmojiPicker(false)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Main Comment Box Card */}
      <div className="relative rounded-2xl border border-slate-200/90 focus-within:border-[#1057FB] focus-within:ring-2 focus-within:ring-[#1057FB]/15 transition-all duration-200 bg-white shadow-2xs">
        {/* Text Area */}
        <textarea
          ref={textareaRef}
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3.5 pt-3 pb-2 text-xs sm:text-[13px] text-slate-800 outline-none resize-none placeholder:text-slate-400 leading-relaxed bg-transparent"
        />

        {/* Deliverable/Figma Link Input Bar */}
        <AnimatePresence>
          {showLinkInput && onLinkChange && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3.5 py-2 border-t border-slate-100 flex items-center gap-2 bg-slate-50/80"
            >
              <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="url"
                value={linkValue}
                onChange={(e) => onLinkChange(e.target.value)}
                placeholder="https://www.figma.com/design/..."
                className="w-full text-xs bg-white px-2.5 py-1 rounded-md border border-slate-200 outline-none font-mono text-[11px] text-slate-800 placeholder:text-slate-400"
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

        {/* Bottom Toolbar */}
        <div className="px-3 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-slate-400 relative">
          {/* Left Action Buttons */}
          <div className="flex items-center gap-1">
            {/* Attach Link Button */}
            {onToggleLinkInput && (
              <button
                type="button"
                onClick={onToggleLinkInput}
                className={`p-1.5 rounded-md hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer ${
                  showLinkInput ? "text-[#1057FB] bg-blue-50" : ""
                }`}
                title="Đính kèm link Figma / tài liệu"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Emoji Picker Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-1.5 rounded-md hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer ${
                  showEmojiPicker ? "text-[#1057FB] bg-blue-50" : ""
                }`}
                title="Chọn emoji"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              {/* Emoji Popover Grid */}
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    className="absolute bottom-9 left-0 z-50 p-2 bg-white rounded-2xl shadow-xl border border-slate-200/90 w-52 grid grid-cols-6 gap-1"
                  >
                    {COMMON_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => handleInsertEmoji(em)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-sm transition-transform active:scale-125 cursor-pointer"
                      >
                        {em}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mention Button */}
            <button
              type="button"
              onClick={() => onChange((value ? `${value} ` : "") + "@")}
              className="p-1.5 rounded-md hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer text-slate-500 font-bold text-xs"
              title="Nhắc tên thành viên"
            >
              <AtSign className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Submit Button */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 hidden sm:inline-block font-mono">
              Enter ↵
            </span>
            <button
              type="button"
              onClick={() => onSubmit()}
              disabled={!value.trim() || submitting}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                value.trim() && !submitting
                  ? "bg-slate-900 hover:bg-slate-800 text-white shadow-xs hover:scale-105 active:scale-95"
                  : "bg-slate-100 text-slate-300 cursor-not-allowed"
              }`}
              title="Gửi trao đổi"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export default AiPromptBox
