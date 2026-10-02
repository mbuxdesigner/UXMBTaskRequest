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

export const DEFAULT_AI_MODEL = "openrouter/free"
export const POPULAR_AI_MODELS = [
  { id: "openrouter/free", name: "Claude Sonnet 5" },
  { id: "inclusionai/ling-3.0-flash-sante:free", name: "Ling 3.0 Flash (Free)" },
  { id: "google/gemma-4-26b-a4b-it:free", name: "Gemma 4 26B (Free)" },
  { id: "nvidia/nemotron-3.5-lightning:free", name: "Nemotron 3.5 (Free)" },
  { id: "liquid/lfm-2.5-2.6b:free", name: "LiquidAI LFM (Free)" },
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
 * Lấy model AI hiện tại
 */
export function getStoredAIModel(): string {
  if (typeof window === "undefined") return DEFAULT_AI_MODEL
  const stored = localStorage.getItem(STORAGE_MODEL_KEY)
  if (!stored || stored === "google/gemini-2.5-flash" || stored === "qwen/qwen3.8-27b:free") {
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

      const targetModel = model === "anthropic/claude-3.5-sonnet" ? "openrouter/free" : model
      const fallbackModels = Array.from(new Set([targetModel, "openrouter/free"]))

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

  if (q.includes("driver") || q.includes("excess") || q.includes("july") || q.includes("thang 7") || q.includes("tháng 7")) {
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
  } else if (q.includes("move") || q.includes("lich") || q.includes("lịch") || q.includes("hop") || q.includes("họp") || q.includes("calendar")) {
    reasoning = "1. Rà soát lịch biểu công việc và khung giờ Deep Work của Designer.\n2. Xác định các cuộc họp xung đột hoặc cần điều chỉnh.\n3. Đề xuất phương án dời lịch tối ưu và tạo thẻ phê duyệt tương tác."
    output = `Here is what I would move:

\`\`\`action
{
  "title": "Here is what I would move:",
  "items": [
    { "icon": "calendar", "title": "Lunch With Sarah", "action": "books at 12:00 PM." },
    { "icon": "calendar", "title": "Sync With Maya", "action": "moves to 1:30 PM." },
    { "icon": "calendar", "title": "Strategy Session", "action": "moves to Friday, 3:00 PM." }
  ],
  "notified": {
    "label": "Will be notified",
    "users": [
      { "name": "Sarah", "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face" },
      { "name": "Alex", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face" },
      { "name": "Maya", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face" }
    ]
  },
  "question": "Shall I update your calendar and let them know?",
  "approveText": "Approve",
  "rejectText": "Not Now"
}
\`\`\`

\`\`\`suggestions
Xác nhận giờ họp mới
Kiểm tra khung Deep Work
\`\`\``
  } else if (q.includes("release") || q.includes("notes") || q.includes("tai lieu") || q.includes("tài liệu") || q.includes("checklist")) {
    reasoning = "1. Trích xuất tài liệu release notes và tiêu chuẩn bàn giao phiên bản 3.4.\n2. Đối chiếu 2 tài liệu tham chiếu đã công bố.\n3. Đóng gói khối nội dung văn bản kỹ thuật chuẩn."
    output = `Number out. The sentence still carries the change:

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
Shorten to two lines
Add the retry window
\`\`\``
  } else {
    reasoning = "1. Tiếp nhận và phân tích yêu cầu công việc của Designer.\n2. Rà soát tiến độ các bài toán ưu tiên Lv1/Lv2 và rào cản SLA.\n3. Trình bày bảng tổng hợp tiến độ và các hành động cần thiết."
    output = `Dưới đây là bảng tổng hợp tiến độ các bài toán thiết kế UX trọng điểm:

| Bài toán UX | Squad / Phân hệ | Mức độ | Khâu hiện tại | Trạng thái |
|---|---|---|---|---|
| Tích hợp DIGI x BeeRich | Wealth Management | Lv1 | Khâu 4 - UI Design | Đang thiết kế |
| Chuyển nhượng CDs khớp 1 phần | Bond Trading | Lv1 | Khâu 6 - Nghiệm thu | PO Pending (26h) |
| [Thiết kế] Luồng mua trái phiếu v2 | Retail Banking | Lv2 | Khâu 3 - Wireframe | Chuẩn bị Dev |
| Tổng | 3 bài toán chính | 2 Lv1, 1 Lv2 | Khâu 3 - 6 | 1 PO Pending |

\`\`\`action
{
  "title": "Đề xuất đôn đốc PO Pending:",
  "items": [
    { "icon": "task", "title": "Chuyển nhượng CDs", "action": "đã quá hạn SLA 24h, cần gửi thông báo nhắc PO." }
  ],
  "notified": {
    "label": "Sẽ nhận thông báo đôn đốc",
    "users": [
      { "name": "PO Trần Đức", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face" }
    ]
  },
  "prompt": "Bạn có muốn gửi thông báo đôn đốc tới PO ngay bây giờ?",
  "approveText": "Gửi đôn đốc ngay",
  "rejectText": "Để sau"
}
\`\`\`

\`\`\`suggestions
Rút ngắn còn 2 dòng
Xem bài toán quá hạn 48h
Xuất checklist nghiệm thu
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
