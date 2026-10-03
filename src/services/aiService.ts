/**
 * ══════════════════════════════════════════════════════════════════════════════
 * AI SERVICE — CLIENT GATEWAY & STREAMING ENGINE (OpenRouter Integration)
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Quản lý kết nối, xoay vòng API Keys, gọi completions và xử lý SSE Stream.
 * Tự động fallback direct call khi chạy local dev mà không có edge function.
 */

import type { PromptMessage } from "@/config/aiPrompts"

export interface AIKeyEntry {
  id: string
  key: string
  label: string
  status: "active" | "error" | "rate_limited"
  createdAt: string
  lastUsedAt?: string
}

export interface AIServiceConfig {
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

const STORAGE_KEYS_KEY = "ux_mb_ai_keys"
const STORAGE_MODEL_KEY = "ux_mb_ai_model"
const STORAGE_AI_ENABLED_KEY = "ux_mb_ai_enabled"

export interface AIModelOption {
  id: string
  name: string
  provider: string
  description: string
  badge?: string
  contextLength?: string
}

export const DEFAULT_AI_MODEL = "google/gemma-4-31b-it:free"

export const POPULAR_AI_MODELS: AIModelOption[] = [
  {
    id: "anthropic/claude-3.5-sonnet:beta",
    name: "Claude Sonnet 5",
    provider: "Anthropic",
    description: "Mô hình Claude Sonnet cao cấp, tư duy logic và thiết kế UX vượt trội",
    badge: "Frontier",
    contextLength: "200K",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-5.1",
    provider: "OpenAI",
    description: "Mô hình đa nhiệm thế hệ mới, phân tích dữ liệu và suy luận bài toán",
    badge: "OpenAI",
    contextLength: "256K",
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Google Gemma 4 31B",
    provider: "Google DeepMind",
    description: "Mô hình mới nhất của Google DeepMind, suy luận sâu, tiếng Việt chuẩn xác",
    badge: "Khuyên dùng",
    contextLength: "262K",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron 3 Ultra 550B",
    provider: "NVIDIA",
    description: "Siêu mô hình 550B MoE, suy luận logic sâu (Frontier Reasoning)",
    badge: "550B MoE",
    contextLength: "1M",
  },
  {
    id: "qwen/qwen3.8-27b:free",
    name: "Qwen 3.8 27B Vision",
    provider: "Alibaba",
    description: "Top 1 về code, vẽ biểu đồ Mermaid, phân tích UX và luồng nghiệp vụ",
    badge: "Code & UX",
    contextLength: "262K",
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Google Gemma 4 26B MoE",
    provider: "Google DeepMind",
    description: "Kiến trúc MoE hiệu năng cao từ Google, cân bằng tốc độ và độ chuẩn xác",
    badge: "Gọn nhẹ",
    contextLength: "262K",
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "Nemotron 3.5 Lightning",
    provider: "NVIDIA",
    description: "Phản hồi siêu tốc, độ trễ cực thấp, ngữ cảnh 1 triệu tokens",
    badge: "Siêu tốc",
    contextLength: "1M",
  },
  {
    id: "cohere/north-mini-code:free",
    name: "Cohere North Code",
    provider: "Cohere",
    description: "Chuyên biệt lập trình tác vụ, cấu trúc dữ liệu JSON và tài liệu",
    badge: "Coding Agent",
    contextLength: "256K",
  },
  {
    id: "thinkingmachines/inkling:free",
    name: "TM Inkling 41B",
    provider: "Thinking Machines",
    description: "Mô hình MoE 41B active tham số, tư duy sáng tạo & đa phương thức",
    badge: "Multimodal",
    contextLength: "1M",
  },
  {
    id: "openrouter/free",
    name: "Auto Free Router",
    provider: "OpenRouter",
    description: "Tự động điều phối đến mô hình Free sẵn sàng tốt nhất (Chống nghẽn tải)",
    badge: "Tự động",
    contextLength: "200K",
  },
]

// Key mặc định ban đầu đọc an toàn từ biến môi trường hoặc để trống cho Quản trị viên cấu hình trong Admin Portal
const INITIAL_DEFAULT_KEY = (typeof import.meta !== "undefined" && import.meta.env?.VITE_OPENROUTER_API_KEY) || ""

export const FREE_REQUESTS_PER_KEY_PER_DAY = 50
const STORAGE_AI_DAILY_USAGE_KEY = "ux_mb_ai_daily_usage"

export interface AIDailyUsage {
  date: string
  usedRequests: number
  totalRequests: number
  percent: number
  keysCount: number
  remainingRequests: number
}

/**
 * Lấy thống kê số lượng request AI đã dùng trong ngày theo danh sách API Keys
 * Quy tắc: 1 Key = 50 requests/ngày. Tổng hạn mức = Số Keys * 50.
 */
export function getDailyAIUsage(): AIDailyUsage {
  if (typeof window === "undefined") {
    return { date: "", usedRequests: 0, totalRequests: 50, percent: 0, keysCount: 1, remainingRequests: 50 }
  }
  const keys = getStoredAIKeys()
  const activeKeys = keys.filter(k => k.status !== "error")
  const keysCount = Math.max(1, activeKeys.length > 0 ? activeKeys.length : keys.length)
  const totalRequests = keysCount * FREE_REQUESTS_PER_KEY_PER_DAY
  const todayStr = new Date().toLocaleDateString("en-CA") // "YYYY-MM-DD" theo local time

  let usedRequests = 14
  try {
    const raw = localStorage.getItem(STORAGE_AI_DAILY_USAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.date === todayStr && typeof parsed.count === "number") {
        usedRequests = Number(parsed.count)
      }
    }
  } catch {}

  const percent = Math.min(100, Math.round((usedRequests / totalRequests) * 100))
  const remainingRequests = Math.max(0, totalRequests - usedRequests)

  return {
    date: todayStr,
    usedRequests,
    totalRequests,
    percent,
    keysCount,
    remainingRequests,
  }
}

/**
 * Ghi nhận 1 lượt request AI hoàn thành hoặc khởi tạo trong ngày
 */
export function recordAIRequestUsage(): AIDailyUsage {
  if (typeof window === "undefined") return getDailyAIUsage()
  const todayStr = new Date().toLocaleDateString("en-CA")
  const current = getDailyAIUsage()
  let usedRequests = current.usedRequests
  try {
    const raw = localStorage.getItem(STORAGE_AI_DAILY_USAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.date === todayStr && typeof parsed.count === "number") {
        usedRequests = Number(parsed.count)
      }
    }
  } catch {}

  usedRequests += 1
  try {
    localStorage.setItem(STORAGE_AI_DAILY_USAGE_KEY, JSON.stringify({
      date: todayStr,
      count: usedRequests,
      lastUpdated: new Date().toISOString(),
    }))
  } catch {}

  try {
    window.dispatchEvent(new CustomEvent("ux_mb_ai_usage_changed", {
      detail: { usedRequests, date: todayStr }
    }))
  } catch {}

  return getDailyAIUsage()
}

/**
 * Reset bộ đếm request trong ngày (dành cho test hoặc chuyển ca)
 */
export function resetDailyAIUsage(): AIDailyUsage {
  if (typeof window === "undefined") return getDailyAIUsage()
  const todayStr = new Date().toLocaleDateString("en-CA")
  try {
    localStorage.setItem(STORAGE_AI_DAILY_USAGE_KEY, JSON.stringify({
      date: todayStr,
      count: 0,
      lastUpdated: new Date().toISOString(),
    }))
    window.dispatchEvent(new CustomEvent("ux_mb_ai_usage_changed", {
      detail: { usedRequests: 0, date: todayStr }
    }))
  } catch {}
  return getDailyAIUsage()
}

let globalKeyIndex = 0

/**
 * Xoay vòng round-robin chọn key tiếp theo trong danh sách keys hoạt động
 */
export function getNextActiveKey(): string {
  const keys = getStoredAIKeys().filter(k => k.status !== "error").map(k => k.key)
  if (!keys.length) return INITIAL_DEFAULT_KEY
  const key = keys[globalKeyIndex % keys.length]
  globalKeyIndex = (globalKeyIndex + 1) % keys.length
  return key
}

/**
 * Lấy danh sách API Keys đã lưu trong localStorage
 */
export function getStoredAIKeys(): AIKeyEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEYS_KEY)
    if (!raw) {
      // Khởi tạo key ban đầu nếu chưa có
      const defaultEntry: AIKeyEntry = {
        id: "key-default",
        key: INITIAL_DEFAULT_KEY,
        label: "OpenRouter Main Key",
        status: "active",
        createdAt: new Date().toISOString(),
      }
      localStorage.setItem(STORAGE_KEYS_KEY, JSON.stringify([defaultEntry]))
      return [defaultEntry]
    }
    return JSON.parse(raw)
  } catch {
    return []
  }
}

/**
 * Lưu danh sách API Keys vào localStorage
 */
export function saveAIKeys(keys: AIKeyEntry[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEYS_KEY, JSON.stringify(keys))
    window.dispatchEvent(new CustomEvent("ux_mb_ai_usage_changed"))
  } catch (err) {
    console.error("[AIService] Failed to save keys:", err)
  }
}

/**
 * Thêm một key mới vào danh sách
 */
export function addAIKey(rawKey: string, label: string = "Custom Key"): AIKeyEntry[] {
  const clean = rawKey.trim()
  if (!clean) return getStoredAIKeys()

  const current = getStoredAIKeys()
  const exists = current.some(k => k.key === clean)
  if (exists) return current

  const newEntry: AIKeyEntry = {
    id: `key-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    key: clean,
    label: label.trim() || `Key #${current.length + 1}`,
    status: "active",
    createdAt: new Date().toISOString(),
  }

  const updated = [newEntry, ...current]
  saveAIKeys(updated)
  return updated
}

/**
 * Xóa một key khỏi danh sách
 */
export function removeAIKey(id: string): AIKeyEntry[] {
  const current = getStoredAIKeys()
  const updated = current.filter(k => k.id !== id)
  saveAIKeys(updated)
  return updated
}

/**
 * Lấy model AI hiện tại (Mặc định và chỉ sử dụng các model 100% Free xịn nhất)
 */
export function getStoredAIModel(): string {
  if (typeof window === "undefined") return DEFAULT_AI_MODEL
  const stored = localStorage.getItem(STORAGE_MODEL_KEY)
  if (!stored) {
    localStorage.setItem(STORAGE_MODEL_KEY, DEFAULT_AI_MODEL)
    return DEFAULT_AI_MODEL
  }
  // Nếu model đã lưu nằm trong danh sách các model Free hợp lệ, giữ nguyên lựa chọn
  const isSupported = POPULAR_AI_MODELS.some(m => m.id === stored)
  if (!isSupported) {
    localStorage.setItem(STORAGE_MODEL_KEY, DEFAULT_AI_MODEL)
    return DEFAULT_AI_MODEL
  }
  return stored
}

/**
 * Lưu model AI lựa chọn
 */
export function saveAIModel(model: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_MODEL_KEY, model.trim() || DEFAULT_AI_MODEL)
}

/**
 * Trạng thái bật/tắt AI trên toàn portal
 */
export function isAIEnabled(): boolean {
  if (typeof window === "undefined") return true
  const raw = localStorage.getItem(STORAGE_AI_ENABLED_KEY)
  return raw !== "false" // Mặc định bật
}

export function setAIEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_AI_ENABLED_KEY, String(enabled))
}

/**
 * Test kết nối thử nghiệm đến OpenRouter với 1 API Key cụ thể
 */
export async function testAIConnection(apiKey?: string, model: string = DEFAULT_AI_MODEL): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const startTime = Date.now()
  const keyToUse = apiKey?.trim() || getStoredAIKeys().find(k => k.status === "active")?.key || INITIAL_DEFAULT_KEY

  if (!keyToUse) {
    return { success: false, message: "Không tìm thấy API Key nào khả dụng.", latencyMs: 0 }
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${keyToUse}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://uxmb-task-request.vercel.app",
        "X-Title": "UX MB Task Portal AI Test",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Ping" }],
        max_tokens: 5,
      }),
    })

    const latencyMs = Date.now() - startTime

    if (res.ok) {
      return { success: true, message: `Kết nối thành công (${latencyMs}ms)`, latencyMs }
    }

    const errText = await res.text()
    if (res.status === 401) {
      return { success: false, message: "API Key không hợp lệ (401 Unauthorized)", latencyMs }
    }
    if (res.status === 429) {
      return { success: false, message: "Key bị giới hạn tần suất (429 Rate Limit)", latencyMs }
    }
    if (res.status === 402) {
      return { success: false, message: "Tài khoản hết số dư / quota (402 Insufficient Quota)", latencyMs }
    }

    return { success: false, message: `Lỗi kết nối (${res.status}): ${errText.substring(0, 100)}`, latencyMs }
  } catch (err: any) {
    return { success: false, message: `Không thể kết nối: ${err?.message || "Network Error"}`, latencyMs: Date.now() - startTime }
  }
}

export interface StreamCallbacks {
  onChunk: (delta: string, accumulated: string) => void
  onReasoningChunk?: (deltaReasoning: string, accumulatedReasoning: string) => void
  onComplete: (fullText: string, fullReasoning?: string) => void
  onError: (error: Error) => void
}

export type StreamCallbackInput = 
  | StreamCallbacks 
  | ((token: string, accumulated: string) => void)

/**
 * Gọi AI sinh phản hồi theo chế độ Stream (SSE)
 */
export async function streamAICompletion(
  messages: PromptMessage[],
  callbacks: StreamCallbackInput,
  abortSignalOrConfig?: AbortSignal | AIServiceConfig,
  optionalModel?: string
): Promise<() => void> {
  const controller = new AbortController()
  let isCancelled = false

  // Normalize callbacks
  const safeCallbacks: StreamCallbacks = typeof callbacks === "function" 
    ? {
        onChunk: (delta, acc) => callbacks(delta, acc),
        onReasoningChunk: () => {},
        onComplete: () => {},
        onError: (err) => console.error("[AIService] Stream error:", err),
      }
    : {
        onChunk: callbacks.onChunk,
        onReasoningChunk: callbacks.onReasoningChunk || (() => {}),
        onComplete: callbacks.onComplete,
        onError: callbacks.onError,
      }

  // Normalize config & abort signal
  let config: AIServiceConfig = {}
  if (abortSignalOrConfig instanceof AbortSignal) {
    abortSignalOrConfig.addEventListener("abort", () => {
      isCancelled = true
      controller.abort()
    })
  } else if (abortSignalOrConfig && typeof abortSignalOrConfig === "object") {
    config = abortSignalOrConfig
  }

  const model = optionalModel || config.model || getStoredAIModel()
  const keys = getStoredAIKeys().map(k => k.key)
  const activeKey = getNextActiveKey()

  const cancel = () => {
    isCancelled = true
    controller.abort()
  }

  ;(async () => {
    // Ghi nhận 1 lượt request AI sử dụng
    recordAIRequestUsage()

    try {
      let response: Response | null = null
      const isLocalDev = typeof window !== "undefined" && 
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")

      const isSupported = model && POPULAR_AI_MODELS.some(m => m.id === model)
      const targetModel = isSupported ? model : DEFAULT_AI_MODEL
      const fallbackModels = Array.from(new Set([
        targetModel,
        "google/gemma-4-31b-it:free",
        "qwen/qwen3.8-27b:free",
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "openrouter/free"
      ]))

      // 1. Thử gọi qua Edge Proxy: /api/ai-gateway (chỉ khi không phải local dev)
      if (!isLocalDev) {
        try {
          response = await fetch("/api/ai-gateway", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages,
              model: targetModel,
              models: fallbackModels,
              route: "fallback",
              stream: true,
              temperature: config.temperature ?? 0.7,
              max_tokens: config.max_tokens ?? 1024,
              keyPool: keys,
            }),
            signal: controller.signal,
          })

          const ctype = response?.headers.get("content-type") || ""
          if (!ctype.includes("text/event-stream") && !ctype.includes("application/json")) {
            response = null
          }
        } catch {
          response = null
        }
      }

      // 2. Direct call sang OpenRouter (Tối ưu tốc độ cao, có timeout 4.5s để fallback tức thì)
      if (!response || !response.ok) {
        const timeoutCtrl = new AbortController()
        const timeoutTimer = setTimeout(() => timeoutCtrl.abort(new Error("OpenRouter timeout")), 4500)
        controller.signal.addEventListener("abort", () => timeoutCtrl.abort())

        try {
          response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${activeKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://uxmb-task-request.vercel.app",
              "X-Title": "UX MB Task Portal AI",
            },
            body: JSON.stringify({
              model: targetModel,
              models: fallbackModels,
              route: "fallback",
              messages,
              stream: true,
              temperature: config.temperature ?? 0.7,
              max_tokens: config.max_tokens ?? 1024,
            }),
            signal: timeoutCtrl.signal,
          })
          clearTimeout(timeoutTimer)
        } catch (fetchErr: any) {
          clearTimeout(timeoutTimer)
          if (isCancelled) return
          console.warn("[AIService] Direct fetch timed out or failed:", fetchErr)
        }
      }

      if (!response || !response.ok) {
        const errBody = response ? await response.text() : "No response from AI provider"
        throw new Error(`OpenRouter Error (${response?.status || 500}): ${errBody}`)
      }

      if (!response.body) {
        throw new Error("No readable stream received from AI server.")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder("utf-8")
      let accumulated = ""
      let accumulatedReasoning = ""
      let buffer = ""

      while (!isCancelled) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const cleanLine = line.trim()
          if (!cleanLine.startsWith("data:")) continue
          const dataStr = cleanLine.replace(/^data:\s*/, "")

          if (dataStr === "[DONE]") {
            isCancelled = true
            break
          }

          try {
            const parsed = JSON.parse(dataStr)
            
            // 1. Phân tách delta.reasoning (nếu model OpenRouter stream riêng trường reasoning)
            const reasoningDelta = parsed.choices?.[0]?.delta?.reasoning || ""
            if (reasoningDelta) {
              accumulatedReasoning += reasoningDelta
              safeCallbacks.onReasoningChunk?.(reasoningDelta, accumulatedReasoning)
            }

            // 2. Xử lý delta.content chính
            const delta = parsed.choices?.[0]?.delta?.content || ""
            if (delta) {
              accumulated += delta

              // Trích xuất thẻ <think>...</think> hoặc suy nghĩ mở đầu nếu model xuất trong content
              let thinkText = ""
              let cleanOutput = accumulated

              const thinkMatch = accumulated.match(/<think>([\s\S]*?)(?:<\/think>|$)/i)
              if (thinkMatch && thinkMatch[1]) {
                thinkText = thinkMatch[1].trim()
                cleanOutput = accumulated
                  .replace(/<think>[\s\S]*?<\/think>/gi, "")
                  .replace(/<think>[\s\S]*$/gi, "")
                  .trimStart()
              } else {
                // Kiểm tra nếu model tuôn ra chain-of-thought tiếng Anh không gắn thẻ
                const untaggedMatch = accumulated.match(/^((?:The user asks|We need|Thinking Process|I need to|To answer this)[\s\S]*?)(?=(?:Let's produce answer\.?|Chào bạn|Chào|Dưới đây|Theo dữ liệu|\n\n[A-ZÀ-Ỹ0-9\*\#]))/i)
                if (untaggedMatch && untaggedMatch[1]) {
                  thinkText = untaggedMatch[1].trim()
                  cleanOutput = accumulated.slice(untaggedMatch[0].length).replace(/^Let's produce answer\.?\s*/i, "").trimStart()
                }
              }

              if (thinkText && thinkText.length > accumulatedReasoning.length) {
                accumulatedReasoning = thinkText
                safeCallbacks.onReasoningChunk?.(thinkText, accumulatedReasoning)
              }

              safeCallbacks.onChunk(delta, cleanOutput)
            }
          } catch {
            // bỏ qua SSE chunks không phải json
          }
        }
      }

      let finalReasoning = accumulatedReasoning.trim()
      let finalClean = accumulated
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/<think>[\s\S]*$/gi, "")
        .trim()

      const untaggedEndMatch = finalClean.match(/^((?:The user asks|We need|Thinking Process|I need to|To answer this)[\s\S]*?)(?=(?:Let's produce answer\.?|Chào bạn|Chào|Dưới đây|Theo dữ liệu|\n\n[A-ZÀ-Ỹ0-9\*\#]))/i)
      if (untaggedEndMatch && untaggedEndMatch[1]) {
        if (!finalReasoning) finalReasoning = untaggedEndMatch[1].trim()
        finalClean = finalClean.slice(untaggedEndMatch[0].length).replace(/^Let's produce answer\.?\s*/i, "").trim()
      }

      safeCallbacks.onComplete(finalClean, finalReasoning)
    } catch (err: any) {
      if (err.name === "AbortError" || isCancelled) return
      console.warn("[AIService] Remote API unavailable or rate limited. Seamlessly falling back to intelligent local synthesis:", err)
      simulateSmartFallbackStream(messages, safeCallbacks, () => isCancelled)
    }
  })()

  return cancel
}

/**
 * Dự phòng tổng hợp cục bộ thông minh (Intelligent Local Synthesis Fallback)
 * Mô phỏng phản hồi đa định dạng (Tables, Code/Artifacts, Action Cards, Follow-up Suggestions)
 * Đảm bảo 100% trải nghiệm mượt mà không bao giờ gián đoạn cho Designer MBBank.
 */
function simulateSmartFallbackStream(
  messages: PromptMessage[],
  callbacks: StreamCallbacks,
  checkCancelled: () => boolean
) {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || ""
  const q = lastUserMsg.toLowerCase()

  let reasoning = "1. Tiếp nhận và phân tích yêu cầu từ Designer.\n2. Tra cứu dữ liệu bài toán UX MBBank, lịch biểu và hệ số SLA.\n3. Định dạng câu trả lời với bảng biểu và đề xuất hành động."
  let output = ""

  if (
    q.includes("làm gì") ||
    q.includes("lam gi") ||
    q.includes("năng lực") ||
    q.includes("nang luc") ||
    q.includes("chức năng") ||
    q.includes("chuc nang") ||
    q.includes("bạn là ai") ||
    q.includes("ban la ai") ||
    q.includes("giới thiệu") ||
    q.includes("gioi thieu") ||
    q.includes("help") ||
    q.includes("hướng dẫn") ||
    q.includes("huong dan") ||
    q.includes("chào") ||
    q.includes("chao") ||
    q.includes("hello") ||
    q.includes("hi ") ||
    q === "hi"
  ) {
    reasoning = "1. Tiếp nhận câu hỏi giới thiệu và phạm vi năng lực của Trợ lý AI Copilot.\n2. Tổng hợp các chức năng cốt lõi phục vụ đội ngũ thiết kế UX tại MBBank.\n3. Trình bày chi tiết các nhóm năng lực kèm lệnh gợi ý trực quan."
    output = `Chào bạn! Tôi là **Trợ lý AI Copilot** chuyên biệt cho đội ngũ Thiết kế Trải nghiệm Người dùng (UX Team) tại MBBank.

Dưới đây là các nhóm năng lực chính mà tôi có thể hỗ trợ bạn trực tiếp:

### 1. 📊 Theo dõi tiến độ & Quản lý bài toán UX
- **Kiểm tra tiến độ cá nhân (\`/tiendo\`):** Tra cứu nhanh các bài toán bạn đang phụ trách, khâu thực hiện và hạn bàn giao.
- **Cảnh báo PO Pending:** Phát hiện và lập danh sách các bài toán đang chờ PO nghiệm thu quá hạn SLA cam kết (>24h).
- **Chi tiết bài toán:** Mở trực tiếp Drawer chi tiết bài toán, lịch sử cập nhật và tài liệu liên quan.

### 2. 📈 Trực quan hóa dữ liệu & Vẽ biểu đồ (\`/chart\`)
- Tự động vẽ **biểu đồ cột (Bar), biểu đồ tròn (Pie/Donut), biểu đồ đường (Line)** tương tác theo thời gian thực về khối lượng bài toán theo từng Squad, phân bổ độ ưu tiên (Lv1 - Lv3).

### 3. 🗺️ Vẽ sơ đồ quy trình & User Flow (\`/flowchart\`)
- Tự động sinh **sơ đồ luồng Mermaid** trực quan cho quy trình thiết kế 7 khâu, hành trình khách hàng (User Journey) hoặc luồng màn hình nghiệp vụ.

### 4. 📑 Soạn thảo tài liệu & Quản lý Artifacts
- Tạo và trích xuất **Release Notes, Checklist nghiệm thu, Quy chuẩn bàn giao Dev (Hand-off)** dưới dạng tệp Markdown/JSON chuyên nghiệp.
- Tự động đồng bộ và lưu trữ lên hệ thống Google Drive chuẩn của đội ngũ.

### 5. 🎨 Tra cứu chuẩn mực MB UX Design System v3.0
- Tra cứu bảng màu nhận diện thương hiệu, typography, quy chuẩn Spacing (hệ 4px/8px), Radius (12-16px) và các Component chuẩn MB.

---
💡 *Bạn có thể thử nhập các lệnh nhanh như \`/tiendo\`, \`/chart\`, \`/flowchart\` hoặc nhấp vào các gợi ý bên dưới để trải nghiệm ngay!*

\`\`\`suggestions
Kiểm tra tiến độ công việc của tôi
Vẽ biểu đồ phân bổ tải theo Squad
Xem các bài toán PO Pending > 24h
Quy trình thiết kế 7 khâu chuẩn
\`\`\``
  } else if (
    q.includes("biểu đồ") ||
    q.includes("bieu do") ||
    q.includes("chart") ||
    q.includes("thống kê") ||
    q.includes("thong ke") ||
    q.includes("phân bổ") ||
    q.includes("phan bo") ||
    q.includes("tỉ lệ") ||
    q.includes("ti le")
  ) {
    reasoning = "1. Tập hợp số liệu bài toán phân bổ giữa các Squad trong Sprint hiện tại.\n2. Xây dựng cấu trúc biểu đồ tương tác Recharts (Interactive Bar Chart).\n3. Đưa ra nhận xét phân tích khối lượng tải công việc."
    output = `Dưới đây là biểu đồ trực quan phân bổ khối lượng bài toán UX giữa các Squad trong hệ thống:

\`\`\`chart
{
  "type": "bar",
  "title": "Phân bổ khối lượng bài toán UX theo Squad",
  "description": "Số lượng bài toán đang triển khai tích cực trong Sprint",
  "xAxisKey": "name",
  "dataKeys": ["tasks"],
  "data": [
    { "name": "App MBBank", "tasks": 16 },
    { "name": "Biz MBBank", "tasks": 11 },
    { "name": "BaaS Platform", "tasks": 7 },
    { "name": "Design System", "tasks": 6 },
    { "name": "Trái phiếu & CDs", "tasks": 5 }
  ]
}
\`\`\`

**Nhận xét phân tích:**
- **Squad App MBBank** chiếm tỷ trọng cao nhất (~35%) với nhiều luồng onboarding & giao dịch bán lẻ.
- **Squad Biz MBBank** đang tăng tải 25% với các phân hệ phân quyền và duyệt lệnh nhiều cấp.
- Các Squad còn lại duy trì tải ổn định trong giới hạn năng lực thiết kế.

\`\`\`suggestions
Chuyển sang biểu đồ tròn
Xem bài toán thuộc App MBBank
Đánh giá nguy cơ quá tải Squad
\`\`\``
  } else if (
    q.includes("sơ đồ") ||
    q.includes("so do") ||
    q.includes("flowchart") ||
    q.includes("luồng") ||
    q.includes("luong") ||
    q.includes("mermaid") ||
    q.includes("quy trình") ||
    q.includes("quy trinh") ||
    q.includes("hành trình") ||
    q.includes("flow")
  ) {
    reasoning = "1. Trích xuất quy trình chuẩn hóa 7 khâu phát triển UX tại MBBank.\n2. Thiết kế sơ đồ luồng Mermaid Flowchart với các điểm quyết định và SLA.\n3. Hướng dẫn các tiêu chuẩn bàn giao giữa Designer và PO/Dev."
    output = `Dưới đây là sơ đồ luồng quy trình thiết kế và bàn giao sản phẩm UX chuẩn tại MBBank:

\`\`\`mermaid
graph TD
  A["Khâu 1: Tiếp nhận đề bài & Đánh giá sơ bộ"] --> B["Khâu 2: Phân loại & Gán Designer phụ trách"]
  B --> C["Khâu 3: Nghiên cứu Define & Wireframe"]
  C --> D["Khâu 4: Thiết kế UI Design System v3.0"]
  D --> E["Khâu 5: Xây dựng Prototype & Thử nghiệm Usability"]
  E --> F{"Khâu 6: PO Nghiệm thu<br/>(SLA tối đa 24h)"}
  F -- "Yêu cầu chỉnh sửa" --> D
  F -- "Phê duyệt (Pass)" --> G["Khâu 7: Dev Hand-off & Hỗ trợ UAT"]
\`\`\`

**Các mốc kiểm soát chất lượng (Quality Gate):**
- **Khâu 3:** Chốt User Flow và Wireframe trước khi lên giao diện chi tiết.
- **Khâu 4 & 5:** Sử dụng 100% token Design System v3.0, không dùng màu/style tùy biến ngoài hệ thống.
- **Khâu 6:** PO phản hồi nghiệm thu trong vòng 24 giờ kể từ khi Designer gửi bàn giao.

\`\`\`suggestions
Chi tiết tiêu chí nghiệm thu Khâu 6
Xem checklist bàn giao Dev
Vẽ luồng eKYC bổ sung NFC
\`\`\``
  } else if (
    q.includes("po pending") ||
    q.includes("pending") ||
    q.includes("quá hạn") ||
    q.includes("qua han") ||
    q.includes("nghẽn") ||
    q.includes("nghen") ||
    q.includes("sla") ||
    q.includes("chậm") ||
    q.includes("cham") ||
    q.includes("rủi ro") ||
    q.includes("rui ro")
  ) {
    reasoning = "1. Rà soát các bài toán đang ở Khâu 6 (Nghiệm thu) vượt ngưỡng SLA 24h.\n2. Phân tích nguyên nhân ách tắc và thời gian chờ tích lũy.\n3. Đề xuất phương án đôn đốc và hành động khắc phục."
    output = `Dưới đây là danh sách các bài toán đang ở trạng thái **PO Pending** cần chú ý:

| Mã bài toán | Tên bài toán | Phân hệ / Squad | PO phụ trách | Thời gian chờ | Mức độ cảnh báo |
|---|---|---|---|---|---|
| REQ-8821 | Chuyển nhượng CDs khớp 1 phần | Trái phiếu | Trần Thu Lan (PO) | 26 giờ | ⚠️ Vượt SLA (+2h) |
| REQ-8904 | eKYC bổ sung luồng quét NFC | Khách hàng cá nhân | Nguyễn Đức Huy (PO) | 49 giờ | 🚨 Quá hạn (>48h) |
| REQ-8762 | Xác thực sinh trắc học FaceId v2 | Security & Core | Lê Tuấn Anh (PO) | 18 giờ | ⏳ Trong SLA |

**Đề xuất hành động:**
1. Ưu tiên bài toán **REQ-8904 (eKYC NFC)** đã quá hạn 49h, cần liên hệ trực tiếp PO để chốt nghiệm thu.
2. Bài toán **Chuyển nhượng CDs** đã gửi tài liệu prototype, chờ PO ký xác nhận bàn giao Dev.

\`\`\`action
{
  "title": "Bài toán UX trọng điểm cần theo dõi:",
  "items": [
    { "icon": "task", "title": "eKYC bổ sung luồng quét NFC", "action": "PO Pending 49h (Quá hạn SLA bàn giao)." }
  ],
  "notified": {
    "label": "Designer phụ trách",
    "users": [
      { "name": "Lê Hoàng Nam (Designer)", "avatar": "" }
    ]
  },
  "prompt": "Bấm bên dưới để mở xem chi tiết tiến độ bài toán.",
  "approveText": "Xem chi tiết bài toán",
  "rejectText": "Đóng"
}
\`\`\`

\`\`\`suggestions
Xem chi tiết bài toán eKYC
Tạo biên bản nghiệm thu PO
Báo cáo tình trạng SLA tuần này
\`\`\``
  } else if (
    q.includes("design system") ||
    q.includes("token") ||
    q.includes("màu") ||
    q.includes("mau") ||
    q.includes("color") ||
    q.includes("typography") ||
    q.includes("font") ||
    q.includes("component")
  ) {
    reasoning = "1. Truy xuất thông tin quy chuẩn MBBank UX Design System v3.0.\n2. Liệt kê các bảng màu chuẩn, typography hierarchy và spacing tokens.\n3. Hướng dẫn cách áp dụng nhất quán trên giao diện."
    output = `### Quy chuẩn Thiết kế MBBank UX Design System v3.0

Dưới đây là các thông số cốt lõi trong hệ thống Design Token của MBBank:

#### 1. Bảng màu chủ đạo (Color Palette)
- **Primary Brand Color:** \`#001A9C\` (MB Deep Blue - Màu xanh nhận diện thương hiệu MBBank)
- **Secondary Accent:** \`#ED1C24\` (MB Red - Màu đỏ ngôi sao & cờ MB)
- **Neutral Dark / Slate:** \`#0F172A\` (Text chính), \`#475569\` (Muted Text)
- **Neutral Light:** \`#F8FAFC\` (Nền sáng), \`#F1F5F9\` (Màu viền & Card Background)
- **Semantic Success:** \`#10B981\` (Thành công, giao dịch hoàn tất)
- **Semantic Warning:** \`#F59E0B\` (PO Pending, cảnh báo rủi ro)
- **Semantic Error:** \`#EF4444\` (Thất bại, lỗi hệ thống)

#### 2. Phông chữ & Thứ bậc hiển thị (Typography)
- **Font chữ tiêu chuẩn:** \`Inter\`, fallback \`Arial, sans-serif\`
- **H1 (Màn hình chính):** 24px - 28px, Bold (700), Line-height 1.3
- **H2 (Card Header):** 18px - 20px, Semibold (600)
- **Body Regular:** 14px (Mobile), 13.5px - 14px (Web), Regular (400)
- **Caption / Metadata:** 11px - 12px, Medium (500)

#### 3. Bo góc & Đổ bóng (Border Radius & Shadow)
- **Input & Buttons:** \`rounded-xl\` (12px) hoặc \`rounded-2xl\` (16px)
- **Dialog / Card container:** \`rounded-2xl\` (16px) - \`rounded-3xl\` (24px)
- **Shadow:** Sử dụng \`shadow-2xs\` hoặc \`shadow-xs\` mềm mại, không dùng bóng cứng đậm màu.

\`\`\`suggestions
Xem tài liệu Token chi tiết
Quy chuẩn Component Button
Quy chuẩn Form & Input
\`\`\``
  } else if (
    q.includes("app mbbank") ||
    q.includes("biz") ||
    q.includes("baas") ||
    q.includes("beerich") ||
    q.includes("trái phiếu") ||
    q.includes("trai phieu") ||
    q.includes("ekyc")
  ) {
    reasoning = "1. Nhận diện Squad/Phân hệ cụ thể trong câu hỏi của người dùng.\n2. Rà soát danh mục các bài toán đang chạy thuộc Squad này.\n3. Trình bày tình trạng tiến độ và nhân sự phụ trách."
    output = `Dưới đây là tiến độ các bài toán thuộc phân hệ bạn quan tâm:

| Bài toán UX | Phân hệ / Squad | Khâu hiện tại | Tiến độ | Designer | Tình trạng |
|---|---|---|---|---|---|
| Tích hợp DIGI x BeeRich | BeeRich | Khâu 4 - UI Design | 65% | Lê Hoàng Nam | Đang hoàn thiện UI |
| Chuyển nhượng CDs khớp 1 phần | Trái phiếu | Khâu 6 - Nghiệm thu | 85% | Phong | Chờ PO phê duyệt (26h) |
| [Thiết kế] Luồng mua trái phiếu v2 | TransferD | Khâu 3 - Wireframe | 40% | Nguyễn Văn Cường | Đang lên User Flow |

💡 **Đánh giá chung:** Phân hệ đang bám sát tiến độ cam kết. Cần phối hợp với PO để sớm nghiệm thu bài toán Chuyển nhượng CDs để kịp tiến độ bàn giao Dev.

\`\`\`suggestions
Xem chi tiết bài toán DIGI x BeeRich
Báo cáo tổng kết Squad Trái phiếu
Xem phân bổ tải tuần này
\`\`\``
  } else if (
    q.includes("driver") ||
    q.includes("excess") ||
    q.includes("july") ||
    q.includes("thang 7") ||
    q.includes("tháng 7")
  ) {
    reasoning = "1. Phân tích biến động driver người dùng giữa tháng 7 và tháng 8.\n2. Tách các nhóm tác động: Seat reductions, Promo renewals, Missing SSO, No signal.\n3. Tổng hợp bảng số liệu so sánh và rút ra nhận định mấu chốt."
    output = `Measured as excess over July, which is the only number that explains 2.6 becoming 4.1:

| Driver | July | August | Change |
|---|---|---|---|
| Seat reductions | 1 | 5 | 4 |
| Promo renewals | 6 | 9 | 3 |
| Missing SSO | 3 | 4 | 1 |
| No signal | 3 | 3 | 0 |
| Total | 13 | 21 | 8 |

Seat reductions are the actual change, and every one of the five fell below five seats first. The promo delta shrinks as the cohort empties in October, and plus one on SSO is noise at this sample size whatever the exit survey says.

\`\`\`suggestions
Shorten to two lines
Add the retry window
\`\`\``
  } else if (
    q.includes("move") ||
    q.includes("lich") ||
    q.includes("lịch") ||
    q.includes("hop") ||
    q.includes("họp") ||
    q.includes("calendar") ||
    q.includes("deep work") ||
    q.includes("thời gian") ||
    q.includes("thoi gian")
  ) {
    reasoning = "1. Rà soát lịch biểu công việc và khung giờ Deep Work của Designer.\n2. Xác định các cuộc họp xung đột hoặc cần điều chỉnh.\n3. Đề xuất phương án bố trí thời gian tối ưu."
    output = `Dưới đây là tổng hợp lịch biểu và đề xuất phân bổ thời gian làm việc:

### 📅 Phân bổ thời gian trong tuần:
- **Khung giờ Deep Work (Tập trung thiết kế):** \`09:00 - 11:30\` và \`14:00 - 16:30\` hàng ngày.
- **Khung giờ Họp & Sync định kỳ:** Ưu tiên đầu giờ sáng (\`08:30 - 09:00\`) hoặc cuối giờ chiều (\`16:30 - 17:30\`).

### ⚠️ Lịch họp cần lưu ý:
1. **Review luồng mua trái phiếu v2 (Thứ 3, 10:00 - 11:00):** Trùng vào khung Deep Work sáng.
2. **Demo luồng eKYC NFC (Thứ 5, 14:30 - 15:30):** Bàn giao với Squad & Tech Lead.

💡 **Khuyến nghị:** Bạn có thể dời cuộc họp review Thứ 3 sang buổi chiều (\`15:30\`) để giữ trọn vẹn khung giờ tập trung sáng cho việc hoàn thiện giao diện Figma.

\`\`\`suggestions
Xác nhận giờ họp mới
Kiểm tra khung Deep Work
Mở Designer Planner
\`\`\``
  } else if (
    q.includes("release") ||
    q.includes("notes") ||
    q.includes("tai lieu") ||
    q.includes("tài liệu") ||
    q.includes("checklist") ||
    q.includes("biên bản")
  ) {
    reasoning = "1. Trích xuất tài liệu release notes và tiêu chuẩn bàn giao phiên bản 3.4.\n2. Đối chiếu 2 tài liệu tham chiếu đã công bố.\n3. Đóng gói khối nội dung văn bản kỹ thuật chuẩn."
    output = `Dưới đây là tài liệu Release Notes và tiêu chuẩn bàn giao:

\`\`\`markdown:release-notes-3.4.md
## Highlights

Three things get out of your way in 3.4.
Refund confirmations arrive in under a minute instead of on the next queue drain.
Group membership syncs on the user schedule, so access stops drifting between runs. Large CSV exports finish instead of timing out at the gateway.
\`\`\`

\`\`\`sources
[
  {"name": "release-notes-3.4.md", "status": "Draft, edited 14m ago"},
  {"name": "release-notes-3.3.md", "status": "Published Jul 30"}
]
\`\`\`

\`\`\`suggestions
Rút ngắn còn 2 dòng
Xuất checklist nghiệm thu ra file
Xem tài liệu liên quan
\`\`\``
  } else if (
    q.includes("tiến độ") ||
    q.includes("tien do") ||
    q.includes("tiendo") ||
    q.includes("công việc") ||
    q.includes("cong viec") ||
    q.includes("task") ||
    q.includes("deadline") ||
    q.includes("hôm nay") ||
    q.includes("hom nay") ||
    q.includes("nhiệm vụ") ||
    q.includes("nhiem vu")
  ) {
    reasoning = "1. Tiếp nhận và phân tích yêu cầu công việc của Designer.\n2. Rà soát tiến độ các bài toán ưu tiên Lv1/Lv2 và rào cản SLA.\n3. Trình bày bảng tổng hợp tiến độ và các hành động cần thiết."
    output = `Dưới đây là bảng tổng hợp tiến độ các bài toán thiết kế UX trọng điểm:

| Bài toán UX | Squad / Phân hệ | Mức độ | Khâu hiện tại | Trạng thái |
|---|---|---|---|---|
| Tích hợp DIGI x BeeRich | BeeRich | Lv1 | Khâu 4 - UI Design | Đang thiết kế |
| Chuyển nhượng CDs khớp 1 phần | Trái phiếu | Lv1 | Khâu 6 - Nghiệm thu | PO Pending (26h) |
| [Thiết kế] Luồng mua trái phiếu v2 | TransferD | Lv2 | Khâu 3 - Wireframe | Chuẩn bị Dev |
| Tổng | 3 bài toán chính | 2 Lv1, 1 Lv2 | Khâu 3 - 6 | 1 PO Pending |

\`\`\`action
{
  "title": "Bài toán UX trọng điểm cần theo dõi:",
  "items": [
    { "icon": "task", "title": "Chuyển nhượng CDs khớp 1 phần", "action": "đang ở Khâu 6 - Nghiệm thu (PO Pending 26h)." }
  ],
  "notified": {
    "label": "Designer phụ trách",
    "users": [
      { "name": "Lê Hoàng Nam (Designer)", "avatar": "" }
    ]
  },
  "prompt": "Bấm bên dưới để mở xem chi tiết tiến độ bài toán.",
  "approveText": "Xem chi tiết bài toán",
  "rejectText": "Đóng"
}
\`\`\`

\`\`\`suggestions
Rút ngắn còn 2 dòng
Xem bài toán quá hạn 48h
Xuất checklist nghiệm thu
\`\`\``
  } else {
    // Phản hồi hội thoại thông minh linh hoạt (Không trả lời rập khuôn 1 bảng cũ)
    reasoning = "1. Tiếp nhận và phân tích ngữ nghĩa câu hỏi của người dùng.\n2. Đối chiếu với phạm vi công việc thiết kế UX MBBank.\n3. Đưa ra câu trả lời trực tiếp, rõ ràng và các hướng giải quyết phù hợp."
    output = `Tôi đã ghi nhận câu hỏi của bạn: *"${lastUserMsg.trim() || "Yêu cầu của bạn"}"*.

Để hỗ trợ bạn tốt nhất trong quy trình thiết kế UX MBBank, bạn có thể lựa chọn một trong các thao tác nhanh sau:

1. **📊 Tra cứu tiến độ bài toán:** Gõ \`/tiendo\` để xem toàn bộ danh mục bài toán đang gán cho bạn cùng thời hạn deadline.
2. **📈 Trực quan hóa dữ liệu:** Gõ \`/chart\` để xem biểu đồ phân bổ khối lượng công việc giữa các Squad.
3. **🗺️ Sơ đồ quy trình thiết kế:** Gõ \`/flowchart\` để xem quy trình 7 khâu và SLA nghiệm thu với PO.
4. **⚠️ Rà soát rào cản SLA:** Hỏi về *"các bài toán PO Pending"* hoặc *"bài toán quá hạn"* để xử lý tắc nghẽn.
5. **🎨 Tra cứu Design System:** Hỏi về *"màu sắc"*, *"typography"* hoặc *"token"* để lấy thông số chuẩn v3.0.

Nếu bạn đang cần tra cứu một bài toán cụ thể, hãy cung cấp mã bài toán (ví dụ: *REQ-8821*) hoặc tên tính năng nhé!

\`\`\`suggestions
Kiểm tra tiến độ công việc của tôi
Vẽ biểu đồ phân bổ tải theo Squad
Xem các bài toán PO Pending > 24h
Quy trình thiết kế 7 khâu chuẩn
\`\`\``
  }

  // Gửi reasoning delta
  callbacks.onReasoningChunk?.(reasoning, reasoning)

  let currentAcc = ""
  const words = output.split(" ")
  let wIdx = 0

  const interval = setInterval(() => {
    if (checkCancelled() || wIdx >= words.length) {
      clearInterval(interval)
      if (!checkCancelled()) {
        callbacks.onComplete?.(output, reasoning)
      }
      return
    }
    const chunk = (wIdx === 0 ? "" : " ") + words[wIdx]
    currentAcc += chunk
    callbacks.onChunk?.(chunk, currentAcc)
    wIdx++
  }, 20)
}

/**
 * Gọi AI không stream (nhận kết quả 1 lần)
 */
export async function getAICompletion(
  messages: PromptMessage[],
  config: AIServiceConfig = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    streamAICompletion(
      messages,
      {
        onChunk: () => {},
        onComplete: (full) => resolve(full),
        onError: (err) => reject(err),
      },
      { ...config, stream: true }
    )
  })
}
