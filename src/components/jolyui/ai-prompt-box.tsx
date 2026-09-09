import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ArrowUp, 
  Send, 
  Clock, 
  Users,
  AtSign,
  Command as CommandIcon,
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
  name: string
  syntax: string
  insertText: string
  description: string
  badgeClass: string
  iconBg: string
  icon: React.ReactNode
  keywords: string[]
}

export interface MentionUser {
  id: string
  name: string
  displayName?: string
  role?: string
  email?: string
  avatar?: string
  isAll?: boolean
  isViewer?: boolean
  isAssignee?: boolean
  isRequester?: boolean
  squad?: string
}

export const DEFAULT_COMMAND_SUGGESTIONS: CommandSuggestion[] = [
  {
    id: "sentopo",
    name: "sentopo",
    syntax: "/sentopo: [link_figma]",
    insertText: "/sentopo: ",
    description: "Đổi trạng thái Đã gửi PO & tự động gán link Figma đính kèm",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    iconBg: "bg-purple-100 text-purple-600",
    icon: <Send className="w-3.5 h-3.5" />,
    keywords: ["sentopo", "send_to_po", "sendtopo", "se to po", "po", "gửi po", "gui po", "figma", "bàn giao"],
  },
  {
    id: "pending",
    name: "pending",
    syntax: "/pending: [lý do]",
    insertText: "/pending: ",
    description: "Tạm hoãn bài toán / Chờ phản hồi đối tác",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    iconBg: "bg-amber-100 text-amber-600",
    icon: <Clock className="w-3.5 h-3.5" />,
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
  mentionUsers?: MentionUser[]
}

export function AiPromptBox({
  value,
  onChange,
  onSubmit,
  submitting = false,
  placeholder = "Nhập nội dung trao đổi... (Gõ / để gọi lệnh, @ để nhắc tên)",
  className = "",
  mentionUsers = [],
}: AiPromptBoxProps) {
  useStyleInjection()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Active popup trigger: "none" | "command" (/) | "mention" (@)
  const [activeTrigger, setActiveTrigger] = useState<"none" | "command" | "mention">("none")
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Track active modes (supporting both new / and legacy @)
  const isSendPoActive = /(?:^|\s)(?:\/|@)se(?:n)?(?:d)?(?:_)?to(?:_)?po/i.test(value)
  const isPendingActive = /(?:^|\s)(?:\/|@)(po_)?pending/i.test(value)

  // Auto-resize textarea height as content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [value])

  // Prepared mention list: "Mọi người" is always on top
  const allMentionList = useMemo<MentionUser[]>(() => {
    const everyoneItem: MentionUser = {
      id: "all",
      name: "Mọi người",
      displayName: "Mọi người",
      role: "Thông báo cho mọi người trong bài toán",
      isAll: true,
    }

    const uniqueUsers: MentionUser[] = []
    const seen = new Set<string>()

    mentionUsers.forEach((u) => {
      const key = (u.name || u.displayName || u.email || "").toLowerCase().trim()
      if (key && !seen.has(key) && key !== "mọi người" && key !== "all") {
        seen.add(key)
        uniqueUsers.push(u)
      }
    })

    return [everyoneItem, ...uniqueUsers]
  }, [mentionUsers])

  // Filter command suggestions (when activeTrigger === "command")
  const filteredCommands = useMemo(() => {
    if (!query) return DEFAULT_COMMAND_SUGGESTIONS
    const q = query.toLowerCase()
    return DEFAULT_COMMAND_SUGGESTIONS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.syntax.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q))
    )
  }, [query])

  // Filter mention suggestions (when activeTrigger === "mention")
  const filteredMentions = useMemo(() => {
    if (!query) return allMentionList
    const q = query.toLowerCase()
    return allMentionList.filter((m) => {
      const nameMatch = m.name.toLowerCase().includes(q)
      const displayMatch = m.displayName?.toLowerCase().includes(q)
      const emailMatch = m.email?.toLowerCase().includes(q)
      const roleMatch = m.role?.toLowerCase().includes(q)
      const isAllMatch = m.isAll && (q === "all" || q === "everyone" || "mọi người".includes(q))
      return nameMatch || displayMatch || emailMatch || roleMatch || isAllMatch
    })
  }, [query, allMentionList])

  // Check cursor position for / or @ triggers
  const checkTriggers = useCallback((text: string, cursorPos: number) => {
    const textBefore = text.slice(0, cursorPos)
    const lastSlash = textBefore.lastIndexOf("/")
    const lastAt = textBefore.lastIndexOf("@")

    // Check which trigger is closer to cursor
    if (lastSlash > lastAt && lastSlash !== -1) {
      const charBefore = lastSlash > 0 ? textBefore[lastSlash - 1] : " "
      if (/\s/.test(charBefore)) {
        const q = textBefore.slice(lastSlash + 1)
        if (!/\s/.test(q)) {
          setActiveTrigger("command")
          setQuery(q)
          setSelectedIndex(0)
          return
        }
      }
    } else if (lastAt !== -1) {
      const charBefore = lastAt > 0 ? textBefore[lastAt - 1] : " "
      if (/\s/.test(charBefore)) {
        const q = textBefore.slice(lastAt + 1)
        if (!/\s/.test(q)) {
          setActiveTrigger("mention")
          setQuery(q)
          setSelectedIndex(0)
          return
        }
      }
    }

    setActiveTrigger("none")
  }, [])

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveTrigger("none")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Selecting a Slash Command
  const handleSelectCommand = useCallback((item: CommandSuggestion) => {
    const textarea = textareaRef.current
    const cursorPos = textarea ? textarea.selectionStart : value.length
    const textBeforeCursor = value.slice(0, cursorPos)
    const lastSlashIndex = textBeforeCursor.lastIndexOf("/")

    const prefix = lastSlashIndex !== -1 ? value.slice(0, lastSlashIndex) : ""
    const suffix = value.slice(cursorPos)

    const newValue = `${prefix}${item.insertText}${suffix}`
    onChange(newValue)
    setActiveTrigger("none")

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const newCursor = prefix.length + item.insertText.length
        textareaRef.current.setSelectionRange(newCursor, newCursor)
      }
    }, 20)
  }, [value, onChange])

  // Selecting a Mention User
  const handleSelectMention = useCallback((user: MentionUser) => {
    const textarea = textareaRef.current
    const cursorPos = textarea ? textarea.selectionStart : value.length
    const textBeforeCursor = value.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    const prefix = lastAtIndex !== -1 ? value.slice(0, lastAtIndex) : ""
    const suffix = value.slice(cursorPos)

    const tagText = user.isAll ? "@all " : `@${user.name} `
    const newValue = `${prefix}${tagText}${suffix}`
    onChange(newValue)
    setActiveTrigger("none")

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const newCursor = prefix.length + tagText.length
        textareaRef.current.setSelectionRange(newCursor, newCursor)
      }
    }, 20)
  }, [value, onChange])

  // Keyboard navigation & Auto bullet handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isCommandOpen = activeTrigger === "command" && filteredCommands.length > 0
    const isMentionOpen = activeTrigger === "mention" && filteredMentions.length > 0

    // 1. Popup keyboard navigation
    if (isCommandOpen || isMentionOpen) {
      const listLength = isCommandOpen ? filteredCommands.length : filteredMentions.length

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % listLength)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + listLength) % listLength)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        if (isCommandOpen) {
          const target = filteredCommands[selectedIndex] || filteredCommands[0]
          if (target) handleSelectCommand(target)
        } else {
          const target = filteredMentions[selectedIndex] || filteredMentions[0]
          if (target) handleSelectMention(target)
        }
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setActiveTrigger("none")
        return
      }
    }

    // 2. Auto-bullet list behavior: khi gõ "- " đằng trước thì tự động duy trì "- " khi xuống dòng
    if (e.key === "Enter") {
      const textarea = textareaRef.current
      if (textarea) {
        const pos = textarea.selectionStart
        const currentVal = textarea.value
        const lastNewline = currentVal.lastIndexOf("\n", pos - 1)
        const currentLine = currentVal.slice(lastNewline + 1, pos)

        // Bắt các dòng bắt đầu bằng "- " hoặc "* "
        const bulletMatch = currentLine.match(/^(\s*[-*]\s*)(.*)$/)

        if (e.shiftKey) {
          // Shift + Enter: Xuống dòng
          if (bulletMatch) {
            e.preventDefault()
            const lineContent = bulletMatch[2]

            // Nếu dòng chỉ có dấu gạch ngang mà không có chữ -> bấm xuống dòng sẽ xóa gạch ngang để thoát list
            if (lineContent.trim() === "") {
              const beforeLine = currentVal.slice(0, lastNewline + 1)
              const afterCursor = currentVal.slice(pos)
              onChange(`${beforeLine}${afterCursor}`)
              setTimeout(() => {
                if (textareaRef.current) {
                  const newPos = lastNewline + 1
                  textareaRef.current.setSelectionRange(newPos, newPos)
                }
              }, 10)
              return
            }

            // Dòng có nội dung -> tự động thêm "- " ở dòng tiếp theo
            const beforeCursor = currentVal.slice(0, pos)
            const afterCursor = currentVal.slice(pos)
            const newVal = `${beforeCursor}\n- ${afterCursor}`
            onChange(newVal)
            setTimeout(() => {
              if (textareaRef.current) {
                const newPos = pos + 3 // \n- 
                textareaRef.current.setSelectionRange(newPos, newPos)
              }
            }, 10)
            return
          }
        } else {
          // Plain Enter: Nếu dòng chỉ có "- " rỗng, xóa nó thay vì gửi comment rỗng
          if (bulletMatch && bulletMatch[2].trim() === "") {
            e.preventDefault()
            const beforeLine = currentVal.slice(0, lastNewline + 1)
            const afterCursor = currentVal.slice(pos)
            onChange(`${beforeLine}${afterCursor}`)
            return
          }

          // Gửi tin nhắn nếu không bấm Shift
          e.preventDefault()
          if (value.trim() && !submitting) {
            onSubmit()
          }
        }
      }
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    const cursor = e.target.selectionEnd || val.length
    onChange(val)
    checkTriggers(val, cursor)
  }

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Enter", "Tab", "Escape"].includes(e.key)) {
      return
    }
    const target = e.currentTarget
    checkTriggers(target.value, target.selectionEnd || target.value.length)
  }

  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget
    checkTriggers(target.value, target.selectionEnd || target.value.length)
  }

  // Toggle mode via toolbar button
  const handleToggleMode = useCallback((mode: "send_po" | "pending") => {
    let newText = value
    const sendPoRegex = /(?:^|\s)(?:\/|@)se(?:n)?(?:d)?(?:_)?to(?:_)?po:\s*/i
    const pendingRegex = /(?:^|\s)(?:\/|@)(po_)?pending:\s*/i

    if (mode === "send_po") {
      if (sendPoRegex.test(newText)) {
        newText = newText.replace(sendPoRegex, "").trimStart()
      } else {
        newText = newText.replace(pendingRegex, "").trimStart()
        newText = `/sentopo: ${newText}`
      }
    } else if (mode === "pending") {
      if (pendingRegex.test(newText)) {
        newText = newText.replace(pendingRegex, "").trimStart()
      } else {
        newText = newText.replace(sendPoRegex, "").trimStart()
        newText = `/pending: ${newText}`
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

  const hasContent = value.trim() !== ""

  return (
    <div ref={containerRef} className={`relative space-y-2 ${className}`}>
      
      {/* 1. Slash Command Suggestions Popup (Antigravity Minimal UI Style) */}
      <AnimatePresence>
        {activeTrigger === "command" && filteredCommands.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-0 mb-2 w-full sm:w-[380px] bg-white rounded-xl border border-slate-200/90 shadow-xl overflow-hidden z-50 p-1.5 backdrop-blur-md"
          >
            {/* Header info */}
            <div className="px-2.5 py-1 text-[11px] font-medium text-slate-400 flex items-center justify-between border-b border-slate-100 mb-1">
              <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <CommandIcon className="w-3.5 h-3.5 text-slate-500" />
                Lệnh điều hướng
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                ↑↓ chọn • ↵ áp dụng
              </span>
            </div>

            {/* Commands list */}
            <div className="space-y-0.5">
              {filteredCommands.map((item, idx) => {
                const isSelected = idx === selectedIndex
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelectCommand(item)
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                      isSelected 
                        ? "bg-slate-100/90 text-slate-900" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0 text-slate-700">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1 flex items-baseline gap-2">
                      <span className="font-semibold text-xs text-slate-900 font-mono shrink-0">
                        /{item.name}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate">
                        {item.description}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. User Mention Suggestions Popup (Antigravity / Teams Minimal UI Style) */}
      <AnimatePresence>
        {activeTrigger === "mention" && filteredMentions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-0 mb-2 w-full sm:w-[380px] bg-white rounded-xl border border-slate-200/90 shadow-xl overflow-hidden z-50 p-1.5 max-h-[300px] flex flex-col backdrop-blur-md"
          >
            {/* Header info */}
            <div className="px-2.5 py-1 text-[11px] font-medium text-slate-400 flex items-center justify-between border-b border-slate-100 mb-1 shrink-0">
              <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <AtSign className="w-3.5 h-3.5 text-[#1057FB]" />
                Nhắc tên thành viên
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                ↑↓ chọn • ↵ áp dụng
              </span>
            </div>

            {/* Mention user items list */}
            <div className="overflow-y-auto space-y-0.5 flex-1 pr-0.5">
              {filteredMentions.map((user, idx) => {
                const isSelected = idx === selectedIndex
                return (
                  <button
                    key={user.id || user.name || `mention-${idx}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelectMention(user)
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                      isSelected 
                        ? "bg-slate-100/90 text-slate-900" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {/* User Avatar / Icon */}
                    {user.isAll ? (
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-[#1057FB] flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                    ) : user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 border border-slate-200">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* User Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs truncate ${user.isAll ? "font-bold text-[#1057FB]" : "font-semibold text-slate-900"}`}>
                          {user.displayName || user.name}
                        </span>

                        {user.isAll && (
                          <span className="text-[9.5px] font-mono px-1 py-0.2 bg-blue-50 text-[#1057FB] rounded border border-blue-200 font-semibold">
                            @all
                          </span>
                        )}
                        {user.isAssignee && (
                          <span className="text-[9px] px-1 py-0.2 bg-blue-50 text-[#1057FB] rounded font-medium">
                            Phân công
                          </span>
                        )}
                        {user.isViewer && (
                          <span className="text-[9px] px-1 py-0.2 bg-slate-100 text-slate-600 rounded font-medium">
                            Viewer
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-slate-400 truncate">
                        {user.email || user.role || (user.isAll ? "Gửi tới toàn bộ thành viên" : "")}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main JolyUI Interactive Container */}
      <div 
        onClick={() => textareaRef.current?.focus()}
        className="relative rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-xs transition-all duration-200 focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100/80 cursor-text"
      >
        {/* Dynamic Auto-Expanding Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onKeyUp={handleKeyUp}
          placeholder={
            isSendPoActive 
              ? "Dán link Figma kèm ghi chú bàn giao cho PO xem xét (ví dụ: /sentopo: https://figma.com/...)..." 
              : isPendingActive 
              ? "Nhập lý do chuyển trạng thái Pending (ví dụ: /pending: Chờ cung cấp API)..." 
              : placeholder
          }
          className="flex min-h-[46px] w-full resize-none rounded-md border-none bg-transparent px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none leading-relaxed"
        />

        {/* Actions Toolbar */}
        <div className="flex items-center justify-between gap-2 p-0 pt-1.5 border-t border-slate-100/80">
          
          {/* Left Action Buttons: Sent to PO & Pending */}
          <div className="flex items-center gap-0.5 select-none">
            
            {/* 1. Send to PO Action Button */}
            <button
              type="button"
              onClick={() => handleToggleMode("send_po")}
              className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all cursor-pointer ${
                isSendPoActive
                  ? "border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#8B5CF6] font-semibold"
                  : "border-transparent bg-transparent text-slate-500 hover:text-purple-600 hover:bg-purple-50/80"
              }`}
              title="Bật/Tắt lệnh Gửi PO (/sentopo)"
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

            {/* 2. Pending Action Button */}
            <button
              type="button"
              onClick={() => handleToggleMode("pending")}
              className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all cursor-pointer ${
                isPendingActive
                  ? "border-[#F59E0B] bg-[#F59E0B]/15 text-[#D97706] font-semibold"
                  : "border-transparent bg-transparent text-slate-500 hover:text-amber-600 hover:bg-amber-50/80"
              }`}
              title="Bật/Tắt lệnh Pending (/pending)"
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

          {/* Right Action: Instructions Hint & Send Button */}
          <div className="flex items-center gap-3">
            {/* Keyboard Shortcuts Hint */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400 font-mono select-none">
              <span>Enter ↵ gửi</span>
              <span className="text-slate-300">•</span>
              <span>Shift + Enter ↵ xuống dòng</span>
            </div>

            <button
              type="button"
              onClick={() => onSubmit()}
              disabled={!hasContent || submitting}
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                hasContent && !submitting
                  ? "bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-xs"
                  : "bg-slate-100 text-slate-300 cursor-not-allowed"
              }`}
              title="Gửi trao đổi"
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
