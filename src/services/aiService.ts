/**
 * ══════════════════════════════════════════════════════════════════════════════
 * AI SERVICE — CLIENT GATEWAY & STREAMING ENGINE (OpenRouter Integration)
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Gọi completions qua server-managed gateway và xử lý SSE Stream.
 * Provider keys tuyệt đối không được lưu hoặc sử dụng trong browser.
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
  signal?: AbortSignal
}

const STORAGE_KEYS_KEY = "ux_mb_ai_keys"
const STORAGE_MODEL_KEY = "ux_mb_ai_model"
const STORAGE_AI_ENABLED_KEY = "ux_mb_ai_enabled"
export const STORAGE_GEMINI_KEY = "ux_mb_gemini_api_key"
export const STORAGE_GEMINI_KEYS_KEY = "ux_mb_gemini_keys"
export const STORAGE_AI_GATEWAY_KEY = "ux_mb_ai_gateway" // "auto" | "google_ai_studio" | "openrouter"

export interface GeminiKeyEntry {
  id: string
  key: string
  label: string
  status: "active" | "error" | "rate_limited"
  createdAt: string
  lastUsedAt?: string
  rpmLimitResetAt?: number
  errorReason?: string
}

export const OPENROUTER_REQUESTS_PER_KEY_PER_DAY = 50
export const GOOGLE_REQUESTS_PER_KEY_PER_DAY = 1500
export const FREE_REQUESTS_PER_KEY_PER_DAY = 50 // Backward compatibility

export const INITIAL_GEMINI_KEY = ""

export function purgeClientAIKeys(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEYS_KEY)
    localStorage.removeItem(STORAGE_GEMINI_KEY)
    localStorage.removeItem(STORAGE_GEMINI_KEYS_KEY)
    localStorage.removeItem(STORAGE_AI_GATEWAY_KEY)
  } catch {}
}

// Migration bảo mật: xóa mọi provider key từng được lưu bởi các phiên bản cũ.
purgeClientAIKeys()

export function getStoredGeminiKeys(): GeminiKeyEntry[] {
  purgeClientAIKeys()
  return []
}

export function saveGeminiKeys(_keys: GeminiKeyEntry[]): void {
  purgeClientAIKeys()
}

export function addGeminiKey(rawKey: string, label: string = "Google Key"): GeminiKeyEntry[] {
  void rawKey
  void label
  purgeClientAIKeys()
  return []
}

export function removeGeminiKey(id: string): GeminiKeyEntry[] {
  const current = getStoredGeminiKeys()
  const updated = current.filter(k => k.id !== id)
  saveGeminiKeys(updated)
  return updated
}

let globalGeminiKeyIndex = 0

export function getNextActiveGeminiKey(): string {
  const now = Date.now()
  const current = getStoredGeminiKeys()
  let modified = false
  const activeKeys = current.map(k => {
    if (k.status === "rate_limited" && k.rpmLimitResetAt && k.rpmLimitResetAt <= now) {
      modified = true
      return { ...k, status: "active" as const, rpmLimitResetAt: undefined }
    }
    return k
  })
  if (modified) {
    saveGeminiKeys(activeKeys)
  }

  const available = activeKeys.filter(k => k.status === "active")
  if (!available.length) {
    return (typeof window !== "undefined" && localStorage.getItem(STORAGE_GEMINI_KEY)) || INITIAL_GEMINI_KEY
  }
  const chosen = available[globalGeminiKeyIndex % available.length]
  globalGeminiKeyIndex = (globalGeminiKeyIndex + 1) % available.length
  return chosen.key
}

export function markGeminiKeyRateLimited(key: string, cooldownMs: number = 60_000): void {
  const current = getStoredGeminiKeys()
  const now = Date.now()
  const updated = current.map(k => {
    if (k.key === key) {
      return {
        ...k,
        status: "rate_limited" as const,
        rpmLimitResetAt: now + cooldownMs,
        lastUsedAt: new Date().toISOString(),
      }
    }
    return k
  })
  saveGeminiKeys(updated)
}

export function markGeminiKeyError(key: string, reason: string): void {
  const current = getStoredGeminiKeys()
  const updated = current.map(k => {
    if (k.key === key) {
      return {
        ...k,
        status: "error" as const,
        errorReason: reason,
        lastUsedAt: new Date().toISOString(),
      }
    }
    return k
  })
  saveGeminiKeys(updated)
}

export function getStoredGeminiKey(): string {
  purgeClientAIKeys()
  return ""
}

export function saveGeminiKey(key: string): void {
  void key
  purgeClientAIKeys()
}

export function getStoredAIGateway(): "auto" | "google_ai_studio" | "openrouter" {
  purgeClientAIKeys()
  return "openrouter"
}

export function saveAIGateway(gateway: "auto" | "google_ai_studio" | "openrouter"): void {
  void gateway
  purgeClientAIKeys()
}

/**
 * Trích xuất session token từ localStorage hoặc sessionStorage nếu người dùng đã đăng nhập
 */
export function getStoredSessionToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw =
      localStorage.getItem("ux_portal_session_auth") ||
      sessionStorage.getItem("ux_portal_session_auth")
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.sessionToken === "string" && parsed.sessionToken.trim()) {
        return parsed.sessionToken.trim()
      }
    }
  } catch {}
  return null
}

// Model discovery and provider credentials are server concerns. These exports
// remain for source compatibility, but never contact a provider from a browser.
export const DEFAULT_GEMINI_MODEL = "google/gemini-2.0-flash-001"

export async function listAvailableGeminiModels(_apiKey = ""): Promise<string[]> {
  return POPULAR_AI_MODELS.map((model) => model.id).filter((id) => id.includes("gemini"))
}

export async function resolveGeminiModel(_apiKey = "", preferred?: string): Promise<string> {
  const allowed = await listAvailableGeminiModels()
  return preferred && allowed.includes(preferred) ? preferred : DEFAULT_GEMINI_MODEL
}


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
    id: "google/gemma-4-31b-it:free",
    name: "Google Gemma 4 31B",
    provider: "Google DeepMind",
    description: "Mô hình mới nhất của Google DeepMind, tư duy UX sâu sắc, văn phong tiếng Việt chuẩn xác",
    badge: "Khuyên dùng",
    contextLength: "262K",
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini Flash",
    provider: "OpenRouter Gateway",
    description: "Đọc hiểu văn bản và hình ảnh qua cổng AI được quản trị tập trung",
    badge: "Vision",
    contextLength: "1M",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron 3 Ultra 550B",
    provider: "NVIDIA",
    description: "Siêu mô hình 550B MoE, suy luận logic sâu (Frontier Reasoning), ngữ cảnh 1M",
    badge: "550B MoE",
    contextLength: "1M",
  },
  {
    id: "qwen/qwen3.8-27b:free",
    name: "Qwen 3.8 27B Vision",
    provider: "Alibaba",
    description: "Top 1 về code, vẽ biểu đồ Mermaid, cấu trúc bảng dữ liệu và luồng UX",
    badge: "Code & Mermaid",
    contextLength: "262K",
  },
]

// Key mặc định ban đầu đọc an toàn từ biến môi trường (chỉ ở chế độ local development)
const INITIAL_DEFAULT_KEY = ""

// FREE_REQUESTS_PER_KEY_PER_DAY is exported above (line 49)
const STORAGE_AI_DAILY_USAGE_KEY = "ux_mb_ai_daily_usage"

export interface ModelGroupQuota {
  groupId: "gemini" | "openrouter"
  groupName: string // "Gemini Models" hoặc "Claude and GPT models"
  provider: string // "Google AI Studio" hoặc "OpenRouter"
  usedRequests: number
  totalRequests: number
  remainingRequests: number
  percentRemaining: number // % còn lại như trong giao diện Cursor (0-100%)
  percentUsed: number
  status: "available" | "rate_limited" | "exhausted" // Còn | Tạm nghỉ (15 RPM) | Hết lượt
  statusBadge: "Còn" | "Tạm nghỉ (15 RPM)" | "Hết lượt"
  statusText: string // "Còn 1.486 lượt" | "Đã đạt hạn mức"
  refreshNotice: string // Thời gian làm mới tự động (ví dụ lúc 00:00)
  keysCount: number
  activeKeysCount: number
}

export interface AIDailyUsage {
  date: string
  usedRequests: number
  totalRequests: number
  percent: number
  keysCount: number
  openRouterKeysCount: number
  googleKeysCount: number
  remainingRequests: number
  // Tính riêng cho từng nhóm model (chuẩn theo phong cách Cursor UI)
  gemini: ModelGroupQuota
  openRouter: ModelGroupQuota
}

/**
 * Lấy thống kê số lượng request AI đã dùng trong ngày theo danh sách API Keys
 * Hợp nhất: Total Requests = (OpenRouter Keys * 50) + (Google Keys * 1.500)
 * Đồng thời tính riêng hạn mức cho từng nhóm: Gemini Models vs Claude & GPT Models
 */
export function getDailyAIUsage(): AIDailyUsage {
  const dummyGemini: ModelGroupQuota = {
    groupId: "gemini",
    groupName: "Gemini Models",
    provider: "Google AI Studio",
    usedRequests: 0,
    totalRequests: 0,
    remainingRequests: 0,
    percentRemaining: 0,
    percentUsed: 0,
    status: "available",
    statusBadge: "Còn",
    statusText: "Hạn mức do máy chủ quản lý",
    refreshNotice: "Trình duyệt không lưu API key hoặc suy đoán hạn mức nhà cung cấp.",
    keysCount: 0,
    activeKeysCount: 0,
  }
  const dummyOpenRouter: ModelGroupQuota = {
    groupId: "openrouter",
    groupName: "Claude and GPT models",
    provider: "OpenRouter",
    usedRequests: 0,
    totalRequests: 0,
    remainingRequests: 0,
    percentRemaining: 0,
    percentUsed: 0,
    status: "available",
    statusBadge: "Còn",
    statusText: "Hạn mức do máy chủ quản lý",
    refreshNotice: "Trình duyệt không lưu API key hoặc suy đoán hạn mức nhà cung cấp.",
    keysCount: 0,
    activeKeysCount: 0,
  }

  if (typeof window === "undefined") {
    return {
      date: "",
      usedRequests: 0,
      totalRequests: 0,
      percent: 0,
      keysCount: 0,
      openRouterKeysCount: 0,
      googleKeysCount: 0,
      remainingRequests: 0,
      gemini: dummyGemini,
      openRouter: dummyOpenRouter,
    }
  }
  const customAIKeys = getCustomAIKeysPool().filter(k => k.status !== "error")
  const customGoogleKeys = getCustomGeminiKeysPool().filter(k => k.status !== "error")
  const openRouterKeys = customAIKeys.length > 0 ? customAIKeys : getStoredAIKeys().filter(k => k.status !== "error")
  const googleKeys = customGoogleKeys.length > 0 ? customGoogleKeys : getStoredGeminiKeys().filter(k => k.status !== "error")
  const openRouterKeysCount = openRouterKeys.length
  const googleKeysCount = googleKeys.length

  const calculatedTotal =
    (openRouterKeysCount * OPENROUTER_REQUESTS_PER_KEY_PER_DAY) +
    (googleKeysCount * GOOGLE_REQUESTS_PER_KEY_PER_DAY)

  const totalRequests = calculatedTotal
  const todayStr = new Date().toLocaleDateString("en-CA") // "YYYY-MM-DD" theo local time

  let usedRequests = 0
  let geminiUsed = 0
  let openRouterUsed = 0

  try {
    const raw = localStorage.getItem(STORAGE_AI_DAILY_USAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.date === todayStr && typeof parsed.count === "number") {
        usedRequests = Number(parsed.count)
        geminiUsed = typeof parsed.geminiCount === "number" ? Number(parsed.geminiCount) : Math.min(usedRequests, Math.round(usedRequests * 0.6))
        openRouterUsed = typeof parsed.openRouterCount === "number" ? Number(parsed.openRouterCount) : Math.max(0, usedRequests - geminiUsed)
      }
    }
  } catch {}

  const percent = totalRequests > 0 ? Math.min(100, Math.round((usedRequests / totalRequests) * 100)) : 0
  const remainingRequests = Math.max(0, totalRequests - usedRequests)

  // 1. Nhóm Gemini Models (Google AI Studio Direct API)
  const geminiTotal = googleKeysCount * GOOGLE_REQUESTS_PER_KEY_PER_DAY
  const geminiRemaining = Math.max(0, geminiTotal - geminiUsed)
  const geminiPercentRemaining = geminiTotal > 0 ? Math.min(100, Math.max(0, Math.round((geminiRemaining / geminiTotal) * 100))) : 0
  const geminiActiveKeys = googleKeys.filter(k => k.status === "active" || (k.rpmLimitResetAt && k.rpmLimitResetAt <= Date.now()))
  const isGeminiAllRateLimited = googleKeys.length > 0 && geminiActiveKeys.length === 0
  const geminiStatus: "available" | "rate_limited" | "exhausted" =
    geminiTotal === 0 ? "available" : geminiRemaining <= 0 ? "exhausted" : isGeminiAllRateLimited ? "rate_limited" : "available"

  const geminiQuota: ModelGroupQuota = {
    groupId: "gemini",
    groupName: "Gemini Models",
    provider: "Google AI Studio",
    usedRequests: geminiUsed,
    totalRequests: geminiTotal,
    remainingRequests: geminiRemaining,
    percentRemaining: geminiPercentRemaining,
    percentUsed: 100 - geminiPercentRemaining,
    status: geminiStatus,
    statusBadge: geminiStatus === "available" ? "Còn" : geminiStatus === "rate_limited" ? "Tạm nghỉ (15 RPM)" : "Hết lượt",
    statusText: geminiTotal === 0
      ? "Hạn mức do máy chủ quản lý"
      : geminiStatus === "available"
      ? `Còn ${geminiRemaining.toLocaleString("vi-VN")} lượt`
      : geminiStatus === "rate_limited"
      ? "Tạm dừng 15 RPM (Đang tự phục hồi)"
      : "Đã đạt hạn mức hôm nay",
    refreshNotice: geminiTotal === 0
      ? "Trình duyệt không lưu API key hoặc suy đoán hạn mức nhà cung cấp."
      : geminiRemaining <= 0
      ? "Bạn đã dùng hết hạn mức ngày của Gemini, sẽ tự động làm mới lúc 00:00."
      : isGeminiAllRateLimited
      ? "Toàn bộ key Google tạm chạm 15 RPM, tự động phục hồi trong ít phút."
      : `Đã dùng ${geminiUsed.toLocaleString("vi-VN")}/${geminiTotal.toLocaleString("vi-VN")} lượt, tự động làm mới lúc 00:00.`,
    keysCount: googleKeysCount,
    activeKeysCount: geminiActiveKeys.length,
  }

  // 2. Nhóm Claude, GPT & OpenRouter Models
  const openRouterTotal = openRouterKeysCount * OPENROUTER_REQUESTS_PER_KEY_PER_DAY
  const openRouterRemaining = Math.max(0, openRouterTotal - openRouterUsed)
  const openRouterPercentRemaining = openRouterTotal > 0 ? Math.min(100, Math.max(0, Math.round((openRouterRemaining / openRouterTotal) * 100))) : 0
  const openRouterStatus: "available" | "rate_limited" | "exhausted" =
    openRouterTotal === 0 ? "available" : openRouterRemaining <= 0 ? "exhausted" : "available"

  const openRouterQuota: ModelGroupQuota = {
    groupId: "openrouter",
    groupName: "Claude and GPT models",
    provider: "OpenRouter",
    usedRequests: openRouterUsed,
    totalRequests: openRouterTotal,
    remainingRequests: openRouterRemaining,
    percentRemaining: openRouterPercentRemaining,
    percentUsed: 100 - openRouterPercentRemaining,
    status: openRouterStatus,
    statusBadge: openRouterStatus === "available" ? "Còn" : "Hết lượt",
    statusText: openRouterTotal === 0
      ? "Hạn mức do máy chủ quản lý"
      : openRouterStatus === "available"
      ? `Còn ${openRouterRemaining.toLocaleString("vi-VN")} lượt`
      : "Đã đạt hạn mức hôm nay",
    refreshNotice: openRouterTotal === 0
      ? "Trình duyệt không lưu API key hoặc suy đoán hạn mức nhà cung cấp."
      : openRouterRemaining <= 0
      ? "Bạn đã chạm giới hạn 50 lượt/ngày của OpenRouter, sẽ tự động làm mới lúc 00:00."
      : `Đã dùng ${openRouterUsed.toLocaleString("vi-VN")}/${openRouterTotal.toLocaleString("vi-VN")} lượt, tự động làm mới lúc 00:00.`,
    keysCount: openRouterKeysCount,
    activeKeysCount: openRouterKeys.filter(k => k.status === "active").length,
  }

  return {
    date: todayStr,
    usedRequests,
    totalRequests,
    percent,
    keysCount: openRouterKeysCount + googleKeysCount,
    openRouterKeysCount,
    googleKeysCount,
    remainingRequests,
    gemini: geminiQuota,
    openRouter: openRouterQuota,
  }
}

/**
 * Ghi nhận 1 lượt request AI hoàn thành hoặc khởi tạo trong ngày
 * Hỗ trợ ghi nhận riêng theo từng nhà cung cấp (provider): "gemini" hoặc "openrouter"
 */
export function recordAIRequestUsage(provider?: "gemini" | "openrouter"): AIDailyUsage {
  if (typeof window === "undefined") return getDailyAIUsage()
  const todayStr = new Date().toLocaleDateString("en-CA")
  const current = getDailyAIUsage()
  let usedRequests = current.usedRequests
  let geminiUsed = current.gemini.usedRequests
  let openRouterUsed = current.openRouter.usedRequests

  try {
    const raw = localStorage.getItem(STORAGE_AI_DAILY_USAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.date === todayStr && typeof parsed.count === "number") {
        usedRequests = Number(parsed.count)
        geminiUsed = typeof parsed.geminiCount === "number" ? Number(parsed.geminiCount) : geminiUsed
        openRouterUsed = typeof parsed.openRouterCount === "number" ? Number(parsed.openRouterCount) : openRouterUsed
      }
    }
  } catch {}

  usedRequests += 1
  if (provider === "gemini") {
    geminiUsed += 1
  } else if (provider === "openrouter") {
    openRouterUsed += 1
  } else {
    if (current.gemini.remainingRequests > 0) {
      geminiUsed += 1
    } else {
      openRouterUsed += 1
    }
  }

  try {
    localStorage.setItem(STORAGE_AI_DAILY_USAGE_KEY, JSON.stringify({
      date: todayStr,
      count: usedRequests,
      geminiCount: geminiUsed,
      openRouterCount: openRouterUsed,
      lastUpdated: new Date().toISOString(),
    }))
  } catch {}

  try {
    window.dispatchEvent(new CustomEvent("ux_mb_ai_usage_changed", {
      detail: { usedRequests, geminiUsed, openRouterUsed, date: todayStr }
    }))
  } catch {}

  return getDailyAIUsage()
}

/**
 * Kiểm tra nhanh trạng thái còn hay hết lượt của một model cụ thể
 */
export function getModelAvailability(modelId: string): {
  isAvailable: boolean
  groupName: string
  percentRemaining: number
  remainingRequests: number
  badgeText: string // "Còn 98%" | "Hết" | "Chờ 60s"
  badgeVariant: "success" | "warning" | "danger"
} {
  const usage = getDailyAIUsage()
  const isGemini = modelId === "gemini-auto" || modelId.startsWith("gemini-") || modelId.includes("gemini")
  const group = isGemini ? usage.gemini : usage.openRouter

  if (group.status === "rate_limited") {
    return {
      isAvailable: false,
      groupName: group.groupName,
      percentRemaining: group.percentRemaining,
      remainingRequests: group.remainingRequests,
      badgeText: "Chờ 60s",
      badgeVariant: "warning",
    }
  }
  if (group.status === "exhausted" || (group.totalRequests > 0 && group.remainingRequests <= 0)) {
    return {
      isAvailable: false,
      groupName: group.groupName,
      percentRemaining: 0,
      remainingRequests: 0,
      badgeText: "Hết",
      badgeVariant: "danger",
    }
  }
  return {
    isAvailable: true,
    groupName: group.groupName,
    percentRemaining: group.totalRequests === 0 ? 100 : group.percentRemaining,
    remainingRequests: group.totalRequests === 0 ? 999 : group.remainingRequests,
    badgeText: group.totalRequests === 0 ? "Sẵn sàng" : `Còn ${group.percentRemaining}%`,
    badgeVariant: "success",
  }
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
  purgeClientAIKeys()
  return []
}

/**
 * Lưu danh sách API Keys vào localStorage
 */
export function saveAIKeys(_keys: AIKeyEntry[]): void {
  purgeClientAIKeys()
}

/**
 * Thêm một key mới vào danh sách
 */
export function addAIKey(rawKey: string, label: string = "Custom Key"): AIKeyEntry[] {
  void rawKey
  void label
  purgeClientAIKeys()
  return []
}

/**
 * Xóa một key khỏi danh sách
 */
export function removeAIKey(id: string): AIKeyEntry[] {
  void id
  purgeClientAIKeys()
  return []
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

export const STORAGE_CUSTOM_AI_KEY = "ux_portal_ai_api_key"
export const STORAGE_CUSTOM_AI_KEYS_POOL = "ux_portal_ai_keys_pool"
export const STORAGE_CUSTOM_GEMINI_KEY = "ux_portal_custom_gemini_key"

export function getCustomApiKey(): string {
  if (typeof window === "undefined") return ""
  try {
    const direct = localStorage.getItem(STORAGE_CUSTOM_AI_KEY)
    if (direct) return direct
    const pool = getCustomAIKeysPool()
    if (pool.length > 0) return pool[0].key
    return ""
  } catch {
    return ""
  }
}

export function saveCustomApiKey(key: string): void {
  if (typeof window === "undefined") return
  try {
    const clean = key.trim()
    if (clean) {
      localStorage.setItem(STORAGE_CUSTOM_AI_KEY, clean)
      addCustomAIKey(clean, "Key chính")
    } else {
      localStorage.removeItem(STORAGE_CUSTOM_AI_KEY)
    }
  } catch {}
}

export function removeCustomApiKey(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_CUSTOM_AI_KEY)
    saveCustomAIKeysPool([])
  } catch {}
}

export function getCustomAIKeysPool(): AIKeyEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_AI_KEYS_POOL)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    const single = localStorage.getItem(STORAGE_CUSTOM_AI_KEY)
    if (single) {
      return [{
        id: "key-primary",
        key: single,
        label: "Key chính",
        status: "active",
        createdAt: new Date().toISOString()
      }]
    }
    return []
  } catch {
    return []
  }
}

export function saveCustomAIKeysPool(keys: AIKeyEntry[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_CUSTOM_AI_KEYS_POOL, JSON.stringify(keys))
    if (keys.length > 0) {
      localStorage.setItem(STORAGE_CUSTOM_AI_KEY, keys[0].key)
    } else {
      localStorage.removeItem(STORAGE_CUSTOM_AI_KEY)
    }
  } catch {}
}

export function addCustomAIKey(rawKey: string, label: string = "API Key"): AIKeyEntry[] {
  const clean = rawKey.trim()
  if (!clean) return getCustomAIKeysPool()
  const current = getCustomAIKeysPool()
  const exists = current.some(k => k.key === clean)
  if (exists) return current
  const newEntry: AIKeyEntry = {
    id: "key-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    key: clean,
    label: label.trim() || `Key #${current.length + 1}`,
    status: "active",
    createdAt: new Date().toISOString()
  }
  const updated = [...current, newEntry]
  saveCustomAIKeysPool(updated)
  return updated
}

export function removeCustomAIKey(id: string): AIKeyEntry[] {
  const current = getCustomAIKeysPool()
  const updated = current.filter(k => k.id !== id)
  saveCustomAIKeysPool(updated)
  return updated
}

export const STORAGE_CUSTOM_GEMINI_KEYS_POOL = "ux_portal_custom_gemini_keys_pool"

export function getCustomGeminiKeysPool(): GeminiKeyEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_GEMINI_KEYS_POOL)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    const single = localStorage.getItem(STORAGE_CUSTOM_GEMINI_KEY)
    if (single) {
      return [{
        id: "gemini-primary",
        key: single,
        label: "Google Key chính",
        status: "active",
        createdAt: new Date().toISOString()
      }]
    }
    return []
  } catch {
    return []
  }
}

export function saveCustomGeminiKeysPool(keys: GeminiKeyEntry[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_CUSTOM_GEMINI_KEYS_POOL, JSON.stringify(keys))
    if (keys.length > 0) {
      localStorage.setItem(STORAGE_CUSTOM_GEMINI_KEY, keys[0].key)
    } else {
      localStorage.removeItem(STORAGE_CUSTOM_GEMINI_KEY)
    }
  } catch {}
}

export function addCustomGeminiKey(rawKey: string, label: string = "Google Key"): GeminiKeyEntry[] {
  const clean = rawKey.trim()
  if (!clean) return getCustomGeminiKeysPool()
  const current = getCustomGeminiKeysPool()
  const exists = current.some(k => k.key === clean)
  if (exists) return current
  const newEntry: GeminiKeyEntry = {
    id: "gkey-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    key: clean,
    label: label.trim() || `Google Key #${current.length + 1}`,
    status: "active",
    createdAt: new Date().toISOString()
  }
  const updated = [...current, newEntry]
  saveCustomGeminiKeysPool(updated)
  return updated
}

export function removeCustomGeminiKey(id: string): GeminiKeyEntry[] {
  const current = getCustomGeminiKeysPool()
  const updated = current.filter(k => k.id !== id)
  saveCustomGeminiKeysPool(updated)
  return updated
}

export function getCustomGeminiKey(): string {
  if (typeof window === "undefined") return ""
  try {
    const direct = localStorage.getItem(STORAGE_CUSTOM_GEMINI_KEY)
    if (direct) return direct
    const pool = getCustomGeminiKeysPool()
    if (pool.length > 0) return pool[0].key
    return ""
  } catch {
    return ""
  }
}

export function saveCustomGeminiKey(key: string): void {
  if (typeof window === "undefined") return
  try {
    const clean = key.trim()
    if (clean) {
      localStorage.setItem(STORAGE_CUSTOM_GEMINI_KEY, clean)
      addCustomGeminiKey(clean, "Google Key chính")
    } else {
      localStorage.removeItem(STORAGE_CUSTOM_GEMINI_KEY)
    }
  } catch {}
}

/**
 * Test kết nối thử nghiệm đến OpenRouter với 1 API Key cụ thể
 */
export async function testAIConnection(apiKey?: string, model: string = DEFAULT_AI_MODEL): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const activeKey = (apiKey !== undefined ? apiKey : getCustomApiKey()).trim()
  const startTime = Date.now()
  const sessionToken = getStoredSessionToken()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`
  if (activeKey) headers["x-custom-api-key"] = activeKey
  try {
    const res = await fetch("/api/ai-gateway", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        apiKey: activeKey || undefined,
        messages: [{ role: "user", content: "Ping" }],
        max_tokens: 64,
      }),
    })
    const latencyMs = Date.now() - startTime
    if (res.ok) {
      return { success: true, message: `Kết nối gateway thành công (${latencyMs}ms)`, latencyMs }
    }
    const errData = await res.json().catch(() => ({}))
    const errMsg = errData?.error?.message || errData?.error || `HTTP ${res.status}`
    return { success: false, message: `Lỗi kết nối gateway (${res.status}): ${errMsg}`, latencyMs }
  } catch (err: any) {
    return { success: false, message: `Không thể kết nối gateway: ${err?.message || "Network Error"}`, latencyMs: Date.now() - startTime }
  }
}

/**
 * Test kết nối thử nghiệm trực tiếp đến Google AI Studio API
 */
export async function testGeminiConnection(
  apiKey?: string,
  model: string = "google/gemini-2.0-flash-001"
): Promise<{ success: boolean; message: string; latencyMs: number }> {
  return testAIConnection(apiKey, model)
}

export interface StreamCallbacks {
  onChunk: (delta: string, accumulated: string) => void
  onReasoningChunk?: (deltaReasoning: string, accumulatedReasoning: string) => void
  onComplete: (fullText: string, fullReasoning?: string, meta?: AIResponseMeta) => void
  onError: (error: Error) => void
}

export interface AIResponseMeta {
  source: "remote" | "local-fallback"
  model?: string
  providerError?: string
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
    config.signal?.addEventListener("abort", () => {
      isCancelled = true
      controller.abort()
    })
  }

  const model = optionalModel || config.model || getStoredAIModel()

  const cancel = () => {
    isCancelled = true
    controller.abort()
  }

  ;(async () => {
    // Ghi nhận 1 lượt request AI sử dụng (phân loại riêng Google Gemini vs OpenRouter)
    const isGeminiTargetForUsage = Boolean(model && (model.startsWith("gemini-") || model.includes("gemini")))
    recordAIRequestUsage(isGeminiTargetForUsage ? "gemini" : "openrouter")

    let usedModel: string = model || DEFAULT_AI_MODEL
    try {
      let response: Response | null = null
      const isSupported = model && POPULAR_AI_MODELS.some(m => m.id === model)
      const targetModel = isSupported ? model : DEFAULT_AI_MODEL
      usedModel = targetModel
      const fallbackModels = Array.from(new Set([
        targetModel,
        "google/gemma-4-31b-it:free",
        "openrouter/free"
      ])).slice(0, 3)

      // Mọi request production đi qua Edge Gateway; không đưa provider key vào browser.
      // 1. Gọi qua Edge Gateway: /api/ai-gateway
      // Trong Production (!isDev), BẮT BUỘC 100% phải gọi qua gateway và đính kèm session token
      if (!response) {
        const sessionToken = getStoredSessionToken()
        const customKey = isGeminiTargetForUsage
          ? (getNextActiveGeminiKey() || getCustomGeminiKey() || getCustomApiKey())
          : (getCustomApiKey() || getNextActiveGeminiKey())
        const gatewayHeaders: Record<string, string> = {
          "Content-Type": "application/json",
        }
        if (sessionToken) {
          gatewayHeaders["Authorization"] = `Bearer ${sessionToken}`
        }
        if (customKey) {
          gatewayHeaders["x-custom-api-key"] = customKey
        }

        try {
          const gRes = await fetch("/api/ai-gateway", {
            method: "POST",
            headers: gatewayHeaders,
            body: JSON.stringify({
              messages,
              model: targetModel,
              models: fallbackModels,
              route: "fallback",
              stream: true,
              apiKey: customKey || undefined,
              temperature: config.temperature ?? 0.7,
              max_tokens: config.max_tokens ?? 2048,
            }),
            signal: controller.signal,
          })

          if (gRes.ok) {
            response = gRes
          } else {
            const errText = await gRes.text()
            let errJson: any = null
            try {
              errJson = JSON.parse(errText)
            } catch {}

            const errCode = errJson?.code || errJson?.error?.code
            const errMsg = errJson?.error?.message || errJson?.error || errJson?.message

            if (gRes.status === 503 || errCode === "MISSING_SERVER_API_KEY") {
              const missingKeyMsg =
                "Hệ thống chưa được cấu hình khóa API (OPENROUTER_API_KEY) trên máy chủ Vercel. Vui lòng liên hệ quản trị viên để thiết lập biến môi trường."
              const err = new Error(missingKeyMsg)
              ;(err as any).code = "MISSING_SERVER_API_KEY"
              ;(err as any).status = 503
              throw err
            }

            if (gRes.status === 401) {
              const authMsg = errMsg || "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."
              const err = new Error(authMsg)
              ;(err as any).code = "UNAUTHORIZED"
              ;(err as any).status = 401
              throw err
            }

            if (gRes.status === 429) {
              const rateLimitMsg =
                errMsg || "Quá giới hạn tần suất yêu cầu (tối đa 20 yêu cầu/phút). Vui lòng thử lại sau giây lát."
              const err = new Error(rateLimitMsg)
              ;(err as any).code = "RATE_LIMITED"
              ;(err as any).status = 429
              throw err
            }

            const generalMsg = errMsg || `AI Gateway trả về mã lỗi HTTP ${gRes.status}`
            const err = new Error(generalMsg)
            ;(err as any).status = gRes.status
            throw err
          }
        } catch (gatewayErr: any) {
          throw gatewayErr
        }
      }

      if (!response || !response.ok) {
        const status = response?.status || 500
        const errBody = response ? await response.text() : "No response from AI provider"
        const err = new Error(`OpenRouter Error (${status}): ${errBody.slice(0, 160)}`)
        ;(err as any).status = status
        throw err
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

      safeCallbacks.onComplete(finalClean, finalReasoning, {
        source: "remote",
        model: usedModel,
      })
    } catch (err: any) {
      if (err.name === "AbortError" || isCancelled) return

      let finalErr = err
      const status = err?.status || err?.statusCode || null
      const code = err?.code || ""
      const rawMsg = String(err?.message || "")

      if (status === 401 || code === "UNAUTHORIZED" || rawMsg.includes("401")) {
        finalErr = new Error("Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.")
        ;(finalErr as any).status = 401
        ;(finalErr as any).code = "UNAUTHORIZED"
      } else if (status === 429 || code === "RATE_LIMITED" || rawMsg.includes("429")) {
        finalErr = new Error("Quá giới hạn tần suất yêu cầu (tối đa 20 yêu cầu/phút). Vui lòng thử lại sau giây lát.")
        ;(finalErr as any).status = 429
        ;(finalErr as any).code = "RATE_LIMITED"
      } else if (status === 503 || code === "MISSING_SERVER_API_KEY" || rawMsg.includes("OPENROUTER_API_KEY")) {
        finalErr = new Error("Hệ thống chưa được cấu hình khóa API (OPENROUTER_API_KEY) trên máy chủ Vercel. Vui lòng liên hệ quản trị viên để thiết lập biến môi trường.")
        ;(finalErr as any).status = 503
        ;(finalErr as any).code = "MISSING_SERVER_API_KEY"
      } else if (status === 500 || status === 502 || status === 504 || rawMsg.includes("500") || rawMsg.includes("502") || rawMsg.includes("504")) {
        finalErr = new Error(`Máy chủ AI gặp sự cố xử lý (mã lỗi HTTP ${status || 500}). Vui lòng thử lại sau giây lát.`)
        ;(finalErr as any).status = status || 500
      } else if (rawMsg.includes("Failed to fetch") || rawMsg.includes("NetworkError") || rawMsg.includes("ECONNREFUSED")) {
        finalErr = new Error("Không thể kết nối tới cổng AI Gateway hoặc máy chủ AI. Vui lòng kiểm tra lại kết nối mạng.")
      }

      console.error("[AIService] Stream completion error surfaced to caller:", finalErr)
      safeCallbacks.onError?.(finalErr)
    }
  })()

  return cancel
}

/**
 * Dự phòng tổng hợp cục bộ thông minh (Intelligent Local Synthesis Fallback)
 * Mô phỏng phản hồi đa định dạng (Tables, Code/Artifacts, Action Cards, Follow-up Suggestions)
 * Đảm bảo 100% trải nghiệm mượt mà không bao giờ gián đoạn cho Designer MBBank.
 */
function extractTaskCountsBySquad(messages: PromptMessage[]): Array<{ name: string; tasks: number }> {
  const context = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n")

  const counts = new Map<string, number>()
  const taskLines = context.split("\n").filter((line) =>
    /^\s*\d+\.\s+\[[^\]]+\]\s+"[^"]+"/.test(line)
  )

  for (const line of taskLines) {
    const squadMatch = line.match(/Squad:\s*(.*?)\s+-\s+(?:📐|⚠️|Có Figma|Chưa có Figma)/i)
    const squad = squadMatch?.[1]?.trim()
    if (squad) counts.set(squad, (counts.get(squad) || 0) + 1)
  }

  return Array.from(counts, ([name, tasks]) => ({ name, tasks }))
    .sort((a, b) => b.tasks - a.tasks || a.name.localeCompare(b.name, "vi"))
}

interface ContextTask {
  id: string
  title: string
  priority: string
  phase: string
  progress: number
  deadline: string
  status: string
  squad: string
  assignee: string
}

function extractTasksFromContext(messages: PromptMessage[]): ContextTask[] {
  const context = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n")
  const structuredMatch = context.match(/=== TASK_DATA_JSON ===\n([\s\S]*?)\n=== END_TASK_DATA_JSON ===/)

  if (structuredMatch) {
    try {
      const parsed: unknown = JSON.parse(structuredMatch[1])
      if (Array.isArray(parsed)) {
        return parsed.filter((task): task is ContextTask =>
          Boolean(task) &&
          typeof task === "object" &&
          typeof (task as ContextTask).id === "string" &&
          typeof (task as ContextTask).title === "string"
        )
      }
    } catch {}
  }

  return context.split("\n").flatMap((line) => {
    const match = line.match(/^\s*\d+\.\s+\[([^\]]+)\]\s+"([^"]+)"\s+\[([^\]]+)\]\s+-\s+(.*?)\s+\((\d+)%\)\s+-\s+DL:\s+(.*?)\s+-\s+(.*?)\s+-\s+Squad:\s+(.*?)\s+-\s+(?:Có Figma|Chưa có Figma)\s+-\s+Phụ trách:\s+(.*)$/)
    if (!match) return []

    return [{
      id: match[1].trim(),
      title: match[2].trim(),
      priority: match[3].trim(),
      phase: match[4].trim(),
      progress: Number(match[5]),
      deadline: match[6].trim(),
      status: match[7].trim(),
      squad: match[8].trim(),
      assignee: match[9].trim(),
    }]
  })
}

function buildContextChartReply(query: string, tasks: ContextTask[]): string | null {
  const normalized = query.toLowerCase()
  const isChartQuery = /biểu đồ|bieu do|\bchart\b|trực quan|truc quan|phân bổ|phan bo|thống kê|thong ke/.test(normalized)
  if (!isChartQuery) return null

  if (tasks.length === 0) {
    return "Mình chưa nhận được dữ liệu bài toán trong phạm vi được phép truy cập nên chưa thể vẽ biểu đồ. Vui lòng đồng bộ lại dữ liệu đầu việc rồi thử lại."
  }

  const groupBy = /designer|nhà thiết kế|nguời phụ trách|người phụ trách|phụ trách/.test(normalized)
    ? "assignee"
    : /trạng thái|trang thai|status/.test(normalized)
    ? "status"
    : "squad"
  const groupLabel = groupBy === "assignee" ? "Designer phụ trách" : groupBy === "status" ? "Trạng thái" : "Squad"
  const counts = new Map<string, number>()
  for (const task of tasks) {
    const key = task[groupBy] || "Chưa gán"
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const data = Array.from(counts, ([name, tasks]) => ({ name, tasks }))
    .sort((a, b) => b.tasks - a.tasks || a.name.localeCompare(b.name, "vi"))

  return `Dưới đây là biểu đồ số lượng bài toán theo **${groupLabel}**, tổng hợp từ **${tasks.length} task** trong phạm vi dữ liệu hiện tại:\n\n\`\`\`chart
${JSON.stringify({
    type: "bar",
    title: `Phân bổ số lượng bài toán theo ${groupLabel}`,
    description: `Tổng hợp từ ${tasks.length} task được phép truy cập`,
    xAxisKey: "name",
    dataKeys: ["tasks"],
    data,
  }, null, 2)}
\`\`\`\n\n*Dữ liệu được tổng hợp trực tiếp từ context hiện tại, không sử dụng dữ liệu mẫu.*`
}

function buildContextTaskReply(query: string, tasks: ContextTask[]): string | null {
  const normalized = query.toLowerCase()
  const isTaskQuery = /\b(task|tasks|card)\b|bài toán|công việc|tiến độ|deadline|quá hạn|trễ hạn|rủi ro|po pending|\bpending\b|sla|cần theo dõi/i.test(normalized)
  if (!isTaskQuery) return null

  if (tasks.length === 0) {
    return "Hiện mình chưa nhận được dữ liệu bài toán trong phạm vi được phép truy cập, nên chưa thể lập danh sách hoặc kết luận rủi ro. Vui lòng đồng bộ lại dữ liệu đầu việc rồi thử lại."
  }

  const matchingTerms = normalized
    .replace(/liệt kê|giúp tôi|cho tôi|các|task|tasks|card|bài toán|công việc|tiến độ|deadline|quá hạn|trễ hạn|rủi ro|po pending|pending|sla|cần theo dõi|của|theo|và|những|nào|là|gì|đang|có/gi, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 3)
  const isRiskQuery = /quá hạn|trễ hạn|rủi ro|po pending|\bpending\b|sla/i.test(normalized)
  const filtered = tasks.filter((task) => {
    const haystack = `${task.id} ${task.title} ${task.squad} ${task.assignee} ${task.status} ${task.phase}`.toLowerCase()
    const matchesTerms = matchingTerms.length === 0 || matchingTerms.some((term) => haystack.includes(term))
    const isRisk = /po pending|pending|quá hạn|trễ hạn/i.test(task.status) || task.progress < 100 && task.deadline !== "Chưa có"
    return matchesTerms && (!isRiskQuery || isRisk)
  })
  const result = filtered.length > 0 ? filtered : tasks
  const rows = result.map((task) => `| ${task.id} | ${task.title} | ${task.squad || "Chưa gán"} | ${task.assignee || "Chưa gán"} | ${task.phase} | ${task.progress}% | ${task.deadline} | ${task.status} |`).join("\n")

  return `Dưới đây là danh sách **${result.length}/${tasks.length} bài toán** trong phạm vi dữ liệu hiện tại:\n\n| Mã task | Bài toán | Squad | Phụ trách | Khâu | Tiến độ | Deadline | Trạng thái |\n|---|---|---|---|---|---:|---|---|\n${rows}\n\n*Dữ liệu được tổng hợp trực tiếp từ context hiện tại; không sử dụng task mẫu.*`
}

function getPromptMessageText(content: PromptMessage["content"]): string {
  if (typeof content === "string") return content
  return Array.isArray(content) ? content.map((part) => part.text || "").join(" ") : ""
}

function normalizeVietnameseText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
}

export function extractArtifactFromContext(
  messages: PromptMessage[],
  userQuery?: string
): { name: string; content: string; fileType?: string } | null {
  const context = messages
    .filter((message) => message.role === "system")
    .map((message) => getPromptMessageText(message.content))
    .join("\n")

  const documentBlock = context.match(/=== DOCUMENT_DATA(?: \([^)]+\))? ===\n([\s\S]*?)\n=== END_DOCUMENT_DATA ===/)
  const docs: Array<{ name: string; content: string; fileType?: string; summary?: string; tags?: string[] }> = []

  if (documentBlock) {
    const docRegex = /--- Tài liệu #\d+: "([^"]+)" \(([^)]+)\) ---\n([\s\S]*?)(?=\n--- Tài liệu #\d+:|$)/g
    let match: RegExpExecArray | null
    while ((match = docRegex.exec(documentBlock[1])) !== null) {
      const name = match[1].trim()
      const fileType = match[2].trim()
      const body = match[3].trim()

      const summaryMatch = body.match(/^Tóm tắt:\s*(.+)$/m)
      const summary = summaryMatch ? summaryMatch[1].trim() : ""

      const tagsMatch = body.match(/^Tags:\s*(.+)$/m)
      const tags = tagsMatch ? tagsMatch[1].split(",").map((t) => t.trim()) : []

      const contentMarker = "Nội dung:\n"
      const contentStart = body.indexOf(contentMarker)
      const content = contentStart >= 0
        ? body.slice(contentStart + contentMarker.length)
          .replace(/\n\[\.\.\.HẾT PHẦN TRÍCH ĐOẠN ĐƯỢC CUNG CẤP\.\.\.\]\s*$/, "")
          .trim()
        : body

      docs.push({ name, fileType, content, summary, tags })
    }
  }

  // Tương thích với context tài liệu theo định dạng cũ.
  if (docs.length === 0) {
    const legacy = context.match(/=== TÀI LIỆU NGƯỜI DÙNG ĐẨY LÊN: "([^"]+)" \(([^)]+)\) ===\n([\s\S]*)/)
    if (legacy) {
      docs.push({ name: legacy[1].trim(), fileType: legacy[2].trim(), content: legacy[3].trim() })
    } else {
      const simpleLegacy = context.match(/=== TÀI LIỆU NGƯỜI DÙNG ĐẨY LÊN: "([^"]+)" ===\n([\s\S]*)/)
      if (simpleLegacy) {
        docs.push({ name: simpleLegacy[1].trim(), content: simpleLegacy[2].trim() })
      }
    }
  }

  if (docs.length === 0) return null

  // Nếu không có câu hỏi tra cứu, mặc định chọn tài liệu đầu tiên
  if (!userQuery || !userQuery.trim()) {
    return docs[0]
  }

  const normalizedQuery = normalizeVietnameseText(userQuery)
  const queryTokens = normalizedQuery.split(/\s+/).filter((t) => t.length > 1)

  let bestDoc = docs[0]
  let maxScore = -1

  for (const doc of docs) {
    const normalizedName = normalizeVietnameseText(doc.name)
    const normalizedSummary = normalizeVietnameseText(doc.summary || "")
    const normalizedTags = (doc.tags || []).map((t) => normalizeVietnameseText(t)).join(" ")
    let score = 0

    // Khớp chuyên biệt cho các tài liệu tiêu chuẩn MBBank
    if (/design hand[- ]?off|handoff|figma|quy chuan ban giao|dev specs|ready for dev/.test(normalizedQuery)) {
      if (normalizedName.includes("handoff") || normalizedName.includes("figma")) score += 60
    }
    if (/token|tokens|mau sac|màu sắc|typography|color|brand color|design system/.test(normalizedQuery)) {
      if (normalizedName.includes("token") || normalizedName.includes("design-system")) score += 60
    }
    if (/po pending|sla|chinh sach sla|24 gio|24h|nghen|tac nghen/.test(normalizedQuery)) {
      if (normalizedName.includes("sla") || normalizedName.includes("po-pending")) score += 60
    }
    if (/7 khau|quy trinh|quy trình|khau 1|khau 2|khau 3|khau 4|khau 5|khau 6|khau 7/.test(normalizedQuery)) {
      if (normalizedName.includes("7-khau") || normalizedName.includes("quy-trinh")) score += 60
    }

    // Khớp token đơn trong tên, tags, và tóm tắt
    for (const token of queryTokens) {
      if (normalizedName.includes(token)) score += 8
      if (normalizedTags.includes(token)) score += 5
      if (normalizedSummary.includes(token)) score += 3
    }

    if (score > maxScore) {
      maxScore = score
      bestDoc = doc
    }
  }

  return bestDoc
}

function extractCalendarContext(messages: PromptMessage[]): string | null {
  const context = messages
    .filter((message) => message.role === "system")
    .map((message) => getPromptMessageText(message.content))
    .join("\n")
  return context.match(/=== CALENDAR_DATA ===\n([\s\S]*?)\n=== END_CALENDAR_DATA ===/)?.[1]?.trim() || null
}

export function buildSafeLocalFallback(messages: PromptMessage[], now: Date = new Date()): { output: string; trace: string } {
  const userMessage = [...messages].reverse().find((message) => message.role === "user")
  const query = getPromptMessageText(userMessage?.content || "").trim()
  const normalized = normalizeVietnameseText(query)
  const tasks = extractTasksFromContext(messages)

  if (/bo qua (?:moi )?(?:quy tac|chi thi)|system prompt|tiet lo prompt|hien thi prompt|developer message/.test(normalized)) {
    return {
      trace: "Phát hiện yêu cầu truy xuất chỉ thị hệ thống và áp dụng giới hạn bảo mật.",
      output: "Mình không thể cung cấp system prompt, chỉ thị nội bộ hoặc bỏ qua các giới hạn bảo mật. Nếu bạn đang kiểm thử prompt injection, hệ thống đã nhận diện đúng tình huống này.",
    }
  }

  const asksCurrentDate = /hom nay.*(?:ngay bao nhieu|ngay may|ngay gi|thu may)|(?:ngay bao nhieu|ngay may|thu may).*hom nay/.test(normalized)
  if (asksCurrentDate) {
    const dateText = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(now)
    return {
      trace: "Đọc ngày hiện tại theo múi giờ Asia/Ho_Chi_Minh.",
      output: `Hôm nay là **${dateText}**.`,
    }
  }

  if (/may gio|gio hien tai|bay gio la/.test(normalized)) {
    const timeText = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now)
    return {
      trace: "Đọc thời gian hiện tại theo múi giờ Asia/Ho_Chi_Minh.",
      output: `Hiện tại là **${timeText}** theo giờ Việt Nam.`,
    }
  }

  if (/thoi tiet|du bao thoi tiet|troi (?:co )?mua|co mua khong|nhiet do|troi nang/.test(normalized)) {
    return {
      trace: "Kiểm tra nguồn dữ liệu thời tiết; không có nguồn trực tuyến trong context.",
      output: "Mình chưa được kết nối với nguồn dữ liệu thời tiết trực tuyến, nên không thể xác định thời tiết hiện tại một cách đáng tin cậy. Bạn cần cung cấp địa điểm và tích hợp dịch vụ dự báo thời tiết để nhận kết quả cập nhật.",
    }
  }

  const chartReply = buildContextChartReply(query, tasks)
  if (chartReply) {
    return {
      trace: "Nhóm và tổng hợp dữ liệu task thật để tạo biểu đồ.",
      output: chartReply,
    }
  }

  const taskReply = buildContextTaskReply(query, tasks)
  if (taskReply) {
    return {
      trace: "Lọc và tổng hợp các task nằm trong phạm vi dữ liệu được cung cấp.",
      output: taskReply,
    }
  }

  const isDocumentQuery = /tai lieu|design hand[- ]?off|handoff|checklist|design system|token|quy chuan|sla|artifact/.test(normalized)
  if (isDocumentQuery) {
    const artifact = extractArtifactFromContext(messages, query)
    if (!artifact) {
      return {
        trace: "Tìm tài liệu liên quan trong context nhưng không có nội dung phù hợp.",
        output: "Mình chưa nhận được nội dung tài liệu phù hợp trong context nên chưa thể trả lời có căn cứ. Vui lòng chọn đúng Artifact hoặc tải tài liệu lên rồi thử lại.",
      }
    }

    const content = artifact.content.trim()
    const isCodeOrJson =
      artifact.name.endsWith(".json") ||
      artifact.name.endsWith(".ts") ||
      artifact.name.endsWith(".tsx") ||
      artifact.name.endsWith(".js") ||
      artifact.name.endsWith(".css") ||
      artifact.name.endsWith(".yaml") ||
      artifact.name.endsWith(".yml") ||
      artifact.fileType === "json" ||
      artifact.fileType === "code" ||
      (content.startsWith("{") && content.endsWith("}"))

    const lang = artifact.name.endsWith(".json") || (content.startsWith("{") && content.endsWith("}"))
      ? "json"
      : artifact.name.split(".").pop() || "code"

    const excerpt = content.length > 4000
      ? `${content.slice(0, 4000)}\n\n// [...Nội dung đã được rút gọn theo giới hạn hiển thị...]`
      : content

    const formattedExcerpt = isCodeOrJson
      ? `\`\`\`${lang}:${artifact.name}\n${excerpt}\n\`\`\``
      : excerpt

    return {
      trace: `Đọc nội dung tài liệu ${artifact.name} được cung cấp trong context.`,
      output: `Dựa trên tài liệu **${artifact.name}**:\n\n${formattedExcerpt || "Tài liệu chưa có nội dung văn bản để phân tích."}\n\n*Nguồn: ${artifact.name}*`,
    }
  }

  if (/so do|flowchart|mermaid|quy trinh 7 khau/.test(normalized)) {
    return {
      trace: "Dựng sơ đồ từ quy trình 7 khâu đã được cấu hình trong ứng dụng.",
      output: `\`\`\`mermaid
graph TD
  A["1. Chờ tiếp nhận"] --> B["2. Phân loại & đánh giá"]
  B --> C["3. Nghiên cứu & định nghĩa"]
  C --> D["4. IA & Wireframe"]
  D --> E["5. UI Design"]
  E --> F["6. Prototype & kiểm thử"]
  F --> G["7. Bàn giao, UAT & Go-Live"]
\`\`\``,
    }
  }

  if (/lich|cuoc hop|hop hom nay|deep work|calendar/.test(normalized)) {
    const calendar = extractCalendarContext(messages)
    return calendar
      ? {
          trace: "Đọc dữ liệu lịch được cung cấp trong context.",
          output: `Dữ liệu lịch hiện có:\n\n${calendar}`,
        }
      : {
          trace: "Kiểm tra dữ liệu lịch nhưng không có lịch trong context.",
          output: "Hiện mình chưa nhận được dữ liệu lịch trong phạm vi truy cập nên chưa thể tổng hợp lịch họp hoặc thời gian Deep Work.",
        }
  }

  if (/^(?:xin )?(?:chao|hello|hi)(?: ban| ai| tro ly)?[!.?]*$/.test(normalized)) {
    return {
      trace: "Nhận diện lời chào.",
      output: "Chào bạn! Mình là Trợ lý UX MB. Mình có thể hỗ trợ tra cứu task, phân tích tiến độ, đọc Artifacts và trực quan hóa dữ liệu trong phạm vi bạn được phép truy cập.",
    }
  }

  if (/ban la ai|lam duoc gi|co the lam gi|nang luc|chuc nang|^help$/.test(normalized)) {
    return {
      trace: "Nhận diện yêu cầu giới thiệu phạm vi hỗ trợ.",
      output: "Mình có thể hỗ trợ bốn nhóm chính: tra cứu và phân tích task, phát hiện rủi ro tiến độ, đọc tài liệu Artifacts, và tạo bảng/biểu đồ/sơ đồ từ dữ liệu thật. Mình không tự thực hiện cập nhật hoặc gửi thông báo khi chưa có xác nhận của bạn.",
    }
  }

  return {
    trace: "Không có mô hình trực tuyến và không tìm thấy dữ liệu cục bộ đủ để trả lời đáng tin cậy.",
    output: `Mô hình AI trực tuyến hiện không phản hồi, còn dữ liệu cục bộ không đủ để trả lời chính xác câu hỏi: “${query || "Yêu cầu hiện tại"}”. Bạn có thể thử lại sau hoặc kiểm tra cấu hình API Key/model trong phần Quản trị.`,
  }
}

function simulateSmartFallbackStream(
  messages: PromptMessage[],
  callbacks: StreamCallbacks,
  checkCancelled: () => boolean,
  meta: AIResponseMeta
) {
  const { output, trace } = buildSafeLocalFallback(messages)
  callbacks.onReasoningChunk?.(trace, trace)

  const chunks = output.match(/\S+\s*/g) || [output]
  let index = 0
  let accumulated = ""
  const interval = setInterval(() => {
    if (checkCancelled()) {
      clearInterval(interval)
      return
    }

    const batch = chunks.slice(index, index + 8).join("")
    index += 8
    accumulated += batch
    callbacks.onChunk(batch, accumulated)

    if (index >= chunks.length) {
      clearInterval(interval)
      callbacks.onComplete(output, trace, meta)
    }
  }, 12)
}

/**
 * @deprecated Giữ lại tạm thời để đối chiếu hồi quy; luồng ứng dụng không gọi hàm này.
 */
function simulateLegacyFallbackStream(
  messages: PromptMessage[],
  callbacks: StreamCallbacks,
  checkCancelled: () => boolean
) {
  const rawUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || ""
  const lastUserMsg = typeof rawUserMsg === "string"
    ? rawUserMsg
    : Array.isArray(rawUserMsg)
    ? rawUserMsg.map((p) => (p as any).text || "").join(" ")
    : ""
  const q = lastUserMsg.toLowerCase()

  let reasoning = "1. Tiếp nhận và phân tích yêu cầu từ Designer.\n2. Tra cứu dữ liệu bài toán UX MBBank, lịch biểu và hệ số SLA.\n3. Định dạng câu trả lời với bảng biểu và đề xuất hành động."
  let output = ""

  const contextTasks = extractTasksFromContext(messages)
  const contextChartReply = buildContextChartReply(lastUserMsg, contextTasks)
  const contextTaskReply = buildContextTaskReply(lastUserMsg, contextTasks)
  const isGreeting = /^(?:xin\s+)?(?:chào|chao|hello|hi)(?:\s+(?:bạn|ban|ai|trợ lý|tro ly))?\s*[!.?]*$/i.test(q.trim())
  const isWeatherQuery = /thời tiết|thoi tiet|dự báo thời tiết|du bao thoi tiet|trời\s+(?:có\s+)?mưa|troi\s+(?:co\s+)?mua|có mưa không|co mua khong|nhiệt độ|nhiet do|trời nắng|troi nang/i.test(q)

  if (contextChartReply) {
    reasoning = "Tổng hợp dữ liệu task thực tế theo nhóm người dùng yêu cầu trong phạm vi quyền được ứng dụng cung cấp."
    output = contextChartReply
  } else if (contextTaskReply) {
    reasoning = "Đọc và tổng hợp các bài toán thực tế trong phạm vi quyền được ứng dụng cung cấp."
    output = contextTaskReply
  } else if (isWeatherQuery) {
    reasoning = "Nhận diện câu hỏi thời tiết và kiểm tra phạm vi dữ liệu hiện có. Ứng dụng không có nguồn dự báo thời tiết trực tuyến nên không suy đoán câu trả lời."
    output = "Mình chưa được kết nối với nguồn dữ liệu thời tiết trực tuyến, nên không thể xác định hôm nay có mưa hay không. Bạn cần cung cấp địa điểm và tích hợp một nguồn dự báo thời tiết để nhận kết quả cập nhật chính xác."
  } else if (
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
    isGreeting
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
    const squadCounts = extractTaskCountsBySquad(messages)
    reasoning = squadCounts.length > 0
      ? "1. Đọc danh sách bài toán trong context hiện tại.\n2. Nhóm và đếm số bài toán theo Squad.\n3. Xuất biểu đồ dựa trên dữ liệu đã nhận, không dùng số liệu mẫu."
      : "1. Kiểm tra context bài toán hiện tại.\n2. Không tìm thấy dữ liệu Squad có thể tổng hợp.\n3. Thông báo rõ giới hạn dữ liệu thay vì dùng số liệu mẫu."

    if (squadCounts.length === 0) {
      output = `Mình chưa nhận được danh sách bài toán có thông tin Squad để vẽ biểu đồ. Vui lòng đồng bộ dữ liệu đầu việc rồi thử lại.\n\n\`\`\`suggestions
Đồng bộ lại dữ liệu bài toán
Xem danh sách task hiện có
Thử lại biểu đồ theo Squad
\`\`\``
    } else {
      const totalTasks = squadCounts.reduce((total, item) => total + item.tasks, 0)
      const leadingSquad = squadCounts[0]
      const chartData = JSON.stringify(squadCounts, null, 2)

      output = `Dưới đây là biểu đồ phân bổ khối lượng bài toán theo dữ liệu hiện tại (${totalTasks} bài toán):

\`\`\`chart
{
  "type": "bar",
  "title": "Phân bổ khối lượng bài toán UX theo Squad",
  "description": "Tổng hợp từ ${totalTasks} bài toán đang có trong hệ thống",
  "xAxisKey": "name",
  "dataKeys": ["tasks"],
  "data": ${chartData}
}
\`\`\`

**Nhận xét phân tích:**
- **${leadingSquad.name}** đang có số lượng bài toán nhiều nhất: **${leadingSquad.tasks}/${totalTasks}**.
- Số liệu trên được tổng hợp trực tiếp từ danh sách bài toán hiện tại, không dùng dữ liệu minh họa.

\`\`\`suggestions
Xem danh sách bài toán của ${leadingSquad.name}
So sánh tiến độ giữa các Squad
Phân tích các task có nguy cơ trễ hạn
\`\`\``
    }
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
    const artifact = extractArtifactFromContext(messages, lastUserMsg)
    reasoning = artifact
      ? "1. Xác định tài liệu được cung cấp trong context.\n2. Đọc nội dung tài liệu thực tế.\n3. Tóm tắt đúng nguồn, không bổ sung dữ liệu ngoài tài liệu."
      : "1. Kiểm tra nguồn tài liệu trong context.\n2. Không tìm thấy nội dung tài liệu đủ để đọc.\n3. Thông báo rõ giới hạn dữ liệu."

    if (artifact) {
      const content = artifact.content.trim()
      const isCodeOrJson =
        artifact.name.endsWith(".json") ||
        artifact.name.endsWith(".ts") ||
        artifact.name.endsWith(".tsx") ||
        artifact.name.endsWith(".js") ||
        artifact.name.endsWith(".css") ||
        artifact.fileType === "json" ||
        artifact.fileType === "code" ||
        (content.startsWith("{") && content.endsWith("}"))

      const lang = artifact.name.endsWith(".json") || (content.startsWith("{") && content.endsWith("}"))
        ? "json"
        : artifact.name.split(".").pop() || "code"

      const excerpt = content.length > 4000
        ? `${content.slice(0, 4000)}\n\n// [...Nội dung đã được rút gọn theo giới hạn hiển thị...]`
        : content

      const formatted = isCodeOrJson ? `\`\`\`${lang}:${artifact.name}\n${excerpt}\n\`\`\`` : excerpt
      output = `Dưới đây là phần tóm tắt dựa trên tài liệu **${artifact.name}**:\n\n${formatted || "Tài liệu chưa có nội dung văn bản để phân tích."}\n\n*Nguồn: ${artifact.name}*`
    } else {
      output = "Mình chưa nhận được nội dung tài liệu đủ để tóm tắt. Vui lòng chọn lại Artifact hoặc tải tài liệu lên rồi thử lại."
    }
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
