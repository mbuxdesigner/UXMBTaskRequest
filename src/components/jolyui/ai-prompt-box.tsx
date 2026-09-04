import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ArrowUp, 
  Send, 
  Paperclip, 
  Globe, 
  Clock, 
  X,
  Link as LinkIcon,
  Sparkles
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

export interface CommandSuggestion {
  id: string
  title: string
  syntax: string
  insertText: string
  description: string
  badgeClass: string
  iconBg: string
  icon: React.ReactNode
  keywords: string[]
}

const DEFAULT_COMMAND_SUGGESTIONS: CommandSuggestion[] = [
  {
    id: "send_to_po",
    title: "Sent to PO",
    syntax: "@SendToPO:",
    insertText: "@SendToPO: ",
    description: "Chuyển sang Đã gửi PO & theo dõi phản hồi 24h",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    iconBg: "bg-purple-100/90 text-purple-600",
    icon: <Send className="w-4 h-4" />,
    keywords: ["send to po", "sent to po", "send", "sent", "po", "gửi po", "gui po", "bàn giao"],
  },
  {
    id: "pending",
    title: "Pending",
    syntax: "@Pending:",
    insertText: "@Pending: ",
    description: "Tạm hoãn bài toán / Chờ phản hồi đối tác",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    iconBg: "bg-amber-100/90 text-amber-600",
    icon: <Clock className="w-4 h-4" />,
    keywords: ["pending", "po pending", "tạm dừng", "tam dung", "chờ", "cho", "delay", "hoãn"],
  },
]

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
  const containerRef = useRef<HTMLDivElement>(null)

  // Mention Suggestions State
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  
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

  // Filter suggestions based on query typed after @
  const filteredSuggestions = useMemo(() => {
    if (!mentionQuery) return DEFAULT_COMMAND_SUGGESTIONS
    const q = mentionQuery.toLowerCase()
    return DEFAULT_COMMAND_SUGGESTIONS.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      item.syntax.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q))
    )
  }, [mentionQuery])

  // Check if cursor is immediately after @mention query
  const checkMentionTrigger = useCallback((text: string, cursorPos: number) => {
    const textBeforeCursor = text.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " "
      // @ must be at start or preceded by whitespace / newline
      if (/\s/.test(charBeforeAt)) {
        const query = textBeforeCursor.slice(lastAtIndex + 1)
        if (!/\s/.test(query)) {
          setMentionQuery(query)
          setShowSuggestions(true)
          setSelectedIndex(0)
          return
        }
      }
    }
    setShowSuggestions(false)
  }, [])

  // Handle click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Selecting a suggestion
  const handleSelectSuggestion = useCallback((item: CommandSuggestion) => {
    const textarea = textareaRef.current
    const cursorPos = textarea ? textarea.selectionStart : value.length
    const textBeforeCursor = value.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    const prefix = lastAtIndex !== -1 ? value.slice(0, lastAtIndex) : ""
    const suffix = value.slice(cursorPos)

    const newValue = `${prefix}${item.insertText}${suffix}`
    onChange(newValue)
    setShowSuggestions(false)

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const newCursor = prefix.length + item.insertText.length
        textareaRef.current.setSelectionRange(newCursor, newCursor)
      }
    }, 20)
  }, [value, onChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredSuggestions.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        handleSelectSuggestion(filteredSuggestions[selectedIndex])
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setShowSuggestions(false)
        return
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !submitting) {
        onSubmit()
      }
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    const cursor = e.target.selectionEnd || val.length
    onChange(val)
    checkMentionTrigger(val, cursor)
  }

  const handleKeyUpOrClick = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget
    checkMentionTrigger(target.value, target.selectionEnd || target.value.length)
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
    <div ref={containerRef} className={`relative space-y-2 ${className}`}>
      {/* Suggestions Dropdown Popup (When typing @) */}
      <AnimatePresence>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2.5 w-full sm:w-[350px] bg-white rounded-2xl border border-slate-200/95 shadow-xl overflow-hidden z-50 p-2"
          >
            <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between border-b border-slate-100 mb-1">
              <span className="flex items-center gap-1.5 text-[#1057FB]">
                <Sparkles className="w-3.5 h-3.5 text-[#1057FB]" />
                Gợi ý lệnh điều hướng
              </span>
              <span className="font-mono font-normal lowercase text-[10px] text-slate-400">
                ↑↓ chọn • ↵ áp dụng
              </span>
            </div>
            <div className="space-y-1">
              {filteredSuggestions.map((item, idx) => {
                const isSelected = idx === selectedIndex
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelectSuggestion(item)
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 text-slate-900 border border-blue-200 shadow-2xs"
                        : "hover:bg-slate-50 text-slate-700 border border-transparent"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${item.iconBg}`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-bold text-xs text-slate-900 truncate">{item.title}</span>
                        <span className={`px-1.5 py-0.5 rounded font-mono text-[10.5px] font-semibold border ${item.badgeClass}`}>
                          {item.syntax}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* JolyUI Prompt Box Container (Light Theme) */}
      <div 
        className="rounded-3xl border border-slate-200/90 bg-white p-2.5 shadow-sm transition-all duration-300 ease-in-out focus-within:border-[#1057FB] focus-within:ring-2 focus-within:ring-[#1057FB]/15"
      >
        {/* Expandable Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onClick={handleKeyUpOrClick}
          onKeyUp={handleKeyUpOrClick}
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
