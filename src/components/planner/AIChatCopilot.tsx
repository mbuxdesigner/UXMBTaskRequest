import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  RotateCcw,
  ChevronDown,
  Minimize2,
  Maximize2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  Square,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import type { ExecutiveIntelligenceData } from "@/lib/executiveIntelligence"
import type { UXRequest } from "@/data/mockData"
import { buildChatPrompt, serializeContext, type PromptMessage } from "@/config/aiPrompts"
import { streamAICompletion, isAIEnabled } from "@/services/aiService"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

interface AIChatCopilotProps {
  intelligence?: ExecutiveIntelligenceData
  isOpen: boolean
  onClose: () => void
  onOpenTask?: (task: UXRequest) => void
}

const QUICK_PROMPTS = [
  { label: "⚠️ Bài toán nguy cơ trễ hạn?", prompt: "Có bài toán nào đang bị quá hạn hoặc sắp trễ deadline trong 48h tới không?" },
  { label: "📌 Trọng tâm hôm nay?", prompt: "Hôm nay tôi nên ưu tiên xử lý bài toán nào đầu tiên theo mức độ quan trọng?" },
  { label: "📅 Lịch họp & Deep Work?", prompt: "Hôm nay tôi có bao nhiêu cuộc họp và còn bao nhiêu giờ Deep Work để thiết kế?" },
  { label: "👥 Tiến độ bài toán ủy quyền?", prompt: "Tình hình các bài toán tôi đã giao cho đồng nghiệp hiện ra sao, có ai gặp khó khăn không?" },
]

const STORAGE_COPILOT_HISTORY = "ux_mb_copilot_history"

export function AIChatCopilot({
  intelligence,
  isOpen,
  onClose,
  onOpenTask,
}: AIChatCopilotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COPILOT_HISTORY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (e) {
      console.warn("[AIChatCopilot] Failed to read stored history:", e)
    }
    return [
      {
        id: "welcome",
        role: "assistant",
        content: `Xin chào ${intelligence?.userName || "bạn"}! Mình là **Trợ lý UX MB**. Mình đã nắm toàn bộ dữ liệu ${intelligence?.activeAssignedTasks.length || 0} bài toán, lịch họp và tiến độ hôm nay của bạn. Bạn cần mình giải đáp hoặc rà soát điều gì?`,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      },
    ]
  })
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const cancelStreamRef = useRef<(() => void) | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isStreaming])

  // Lưu lịch sử hội thoại vào localStorage
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(STORAGE_COPILOT_HISTORY, JSON.stringify(messages))
      }
    } catch (e) {
      console.warn("[AIChatCopilot] Failed to save history:", e)
    }
  }, [messages])

  // Dọn dẹp stream khi unmount
  useEffect(() => {
    return () => {
      if (cancelStreamRef.current) cancelStreamRef.current()
    }
  }, [])

  const handleSendMessage = async (userText: string) => {
    const text = userText.trim()
    if (!text || isStreaming) return

    if (!isAIEnabled()) {
      toast.warning("Dịch vụ AI đang tắt trong trang Quản lý.")
      return
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    }

    const botMsgId = `bot-${Date.now()}`
    const botMsgPlaceholder: ChatMessage = {
      id: botMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages((prev) => [...prev, userMsg, botMsgPlaceholder])
    setInput("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
    setIsStreaming(true)

    // Chuẩn bị context nén từ dữ liệu intelligence
    const context = intelligence ? serializeContext(intelligence) : "Chưa có dữ liệu bài toán."

    // Chuẩn bị chat history
    const history: PromptMessage[] = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }))

    history.push({ role: "user", content: text })

    // Prompt từ file config duy nhất
    const promptMessages = buildChatPrompt(context, history)

    try {
      const cancel = await streamAICompletion(promptMessages, {
        onChunk: (_delta, accumulated) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === botMsgId ? { ...m, content: accumulated } : m))
          )
        },
        onComplete: (fullText) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === botMsgId ? { ...m, content: fullText } : m))
          )
          setIsStreaming(false)
          cancelStreamRef.current = null
        },
        onError: (err) => {
          console.error("[AIChatCopilot] Error:", err)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMsgId
                ? {
                    ...m,
                    content: `⚠️ Có lỗi xảy ra khi kết nối với AI (${err.message}). Vui lòng kiểm tra API Key tại Cổng kết nối APIs trong Admin.`,
                  }
                : m
            )
          )
          setIsStreaming(false)
          cancelStreamRef.current = null
        },
      })
      cancelStreamRef.current = cancel
    } catch (err: any) {
      setIsStreaming(false)
      toast.error(`Lỗi: ${err?.message || "Không thể gửi tin nhắn"}`)
    }
  }

  const handleReset = () => {
    if (cancelStreamRef.current) cancelStreamRef.current()
    setIsStreaming(false)
    const resetWelcome: ChatMessage[] = [
      {
        id: "welcome",
        role: "assistant",
        content: `Hội thoại đã được làm mới. Dữ liệu bài toán và lịch trình của bạn đang ở trạng thái mới nhất. Mình có thể giúp gì thêm cho bạn?`,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      },
    ]
    setMessages(resetWelcome)
    try {
      localStorage.setItem(STORAGE_COPILOT_HISTORY, JSON.stringify(resetWelcome))
    } catch {}
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
    toast.info("Đã làm mới cuộc hội thoại AI.")
  }

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success("Đã sao chép phản hồi!")
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-5 right-5 z-50 w-full sm:w-[460px] h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden backdrop-blur-md"
      >
        {/* Top Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center p-1 shadow-inner overflow-hidden">
              <img src="/ai-default.png" alt="AI" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-white">
                  UX MB Copilot
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live AI
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate max-w-[240px]">
                Trợ lý điều hành & rà soát bài toán thiết kế
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
              title="Làm mới hội thoại"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick Suggestions */}
        <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_PROMPTS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(q.prompt)}
              disabled={isStreaming}
              className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-600 transition-colors shadow-2xs cursor-pointer"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Message Stream Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.map((m) => {
            const isUser = m.role === "user"
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                    isUser
                      ? "bg-slate-900 text-white"
                      : "bg-indigo-50 border border-indigo-200 text-indigo-700"
                  }`}
                >
                  {isUser ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <img src="/ai-default.png" alt="AI" className="w-5 h-5 object-contain" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[82%] space-y-1 ${isUser ? "items-end" : "items-start"}`}>
                  <div
                    className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? "bg-slate-900 text-white rounded-tr-xs"
                        : "bg-slate-100/90 text-slate-800 rounded-tl-xs border border-slate-200/60"
                    }`}
                  >
                    {m.content ? (
                      m.content
                    ) : (
                      <div className="flex items-center gap-1.5 py-1 text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                        <span>Đang suy nghĩ...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400">
                    <span>{m.timestamp}</span>
                    {!isUser && m.content && (
                      <button
                        type="button"
                        onClick={() => copyMessage(m.id, m.content)}
                        className="hover:text-slate-700 transition-colors cursor-pointer"
                        title="Sao chép nội dung"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-3 h-3 text-emerald-600 inline" />
                        ) : (
                          <Copy className="w-3 h-3 inline" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-white border-t border-slate-100 flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto"
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                if (e.nativeEvent.isComposing) return
                e.preventDefault()
                handleSendMessage(input)
              }
            }}
            rows={1}
            placeholder="Hỏi về tiến độ, deadline, lịch họp hôm nay... (Shift+Enter để xuống dòng)"
            disabled={isStreaming}
            className="flex-1 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500/30 p-2.5 resize-none max-h-[120px] min-h-[38px] leading-relaxed transition-all placeholder:text-slate-400"
            aria-label="Soạn tin nhắn cho Copilot"
          />
          {isStreaming ? (
            <Button
              type="button"
              onClick={() => {
                if (cancelStreamRef.current) {
                  cancelStreamRef.current()
                  cancelStreamRef.current = null
                  setIsStreaming(false)
                }
              }}
              className="rounded-xl h-9 px-3 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs shrink-0"
              title="Dừng sinh phản hồi"
              aria-label="Dừng sinh phản hồi"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => handleSendMessage(input)}
              disabled={!input.trim()}
              className="rounded-xl h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
              title="Gửi câu hỏi"
              aria-label="Gửi câu hỏi"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
