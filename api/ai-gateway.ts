/**
 * ==============================================================================
 * VERCEL SERVERLESS EDGE PROXY: /api/ai-gateway
 * Forwarding client requests to OpenRouter AI API with key rotation, streaming,
 * genuine session caller authentication (with 5-minute in-memory cache) and
 * in-memory sliding-window rate limiting.
 * ==============================================================================
 */

export const config = {
  runtime: "edge",
}

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
const DEFAULT_MODEL = "google/gemma-4-31b-it:free"
const DEFAULT_GAS_URL =
  "https://script.google.com/macros/s/AKfycbyz4_GK_guUx9L6uaRd4vK5jqJwG60eLr8Xju3j2hcEUianS8873cp4fJe8BBBrilKQ/exec"

// Rate limiting configuration (In-Memory Sliding Window - Edge per-instance mitigation)
export const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 phút
export const RATE_LIMIT_MAX_REQUESTS = 20 // Tối đa 20 requests / phút
const requestTimestampsMap = new Map<string, number[]>()

// Genuine Session Cache (TTL 5 phút để tránh latency cho streaming)
export interface SessionCacheEntry {
  valid: boolean
  role?: string
  cachedAt: number
}
const sessionCache = new Map<string, SessionCacheEntry>()
export const SESSION_CACHE_TTL_MS = 5 * 60 * 1000 // 5 phút

/**
 * Validates CORS origin against allowed domains
 */
function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false
  const clean = origin.trim().toLowerCase()

  if (clean === "https://uxmb-task-request.vercel.app") return true
  if (/^http:\/\/localhost(:\d+)?$/.test(clean) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(clean)) return true
  if (/^https:\/\/[a-z0-9_-]+-cuongs-projects\.vercel\.app$/.test(clean)) return true
  if (/^https:\/\/[a-z0-9_-]+-mbuxdesigner\.vercel\.app$/.test(clean)) return true
  if (/^https:\/\/uxmb-task-request-[a-z0-9_-]+\.vercel\.app$/.test(clean)) return true
  if (/^https:\/\/uxmb-task-request.*\.vercel\.app$/.test(clean)) return true

  return false
}

function getCorsHeaders(origin: string | null | undefined): Record<string, string> {
  const allowed = isAllowedOrigin(origin)
  const allowOrigin = allowed && origin ? origin : "https://uxmb-task-request.vercel.app"

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  }
}

/**
 * Kiểm tra định dạng session token chuẩn của UX Portal: ST_[a-f0-9]{16}
 */
export function validateSessionToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false
  return /^ST_[a-f0-9]{16}$/i.test(token.trim())
}

/**
 * Đăng ký token hợp lệ vào bộ nhớ cache (dành cho kiểm thử hoặc sau khi xác thực thành công)
 */
export function registerValidSession(token: string, role: string = "Designer"): void {
  sessionCache.set(token.trim(), {
    valid: true,
    role,
    cachedAt: Date.now(),
  })
}

/**
 * Xóa toàn bộ cache phiên (dành cho kiểm thử)
 */
export function clearSessionCache(): void {
  sessionCache.clear()
}

/**
 * Lấy giá trị biến môi trường từ global runtime process
 */
function getEnv(key: string): string | undefined {
  const runtimeProcess = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> }
  }).process
  return runtimeProcess?.env?.[key]
}

/**
 * Xác minh tính hợp lệ thực sự của token (Genuine Session Verification):
 * 1. Kiểm tra format regex ST_[a-f0-9]{16}.
 * 2. Tra cứu In-Memory Cache (TTL 5 phút).
 * 3. Nếu chưa có, gọi backend Google Apps Script endpoint check_session để kiểm tra phiên thật.
 */
export async function verifySessionToken(token: string | null | undefined): Promise<boolean> {
  if (!token || typeof token !== "string") return false
  const clean = token.trim()

  // 1. Kiểm tra định dạng cơ bản
  if (!validateSessionToken(clean)) {
    return false
  }

  // 2. Tra cứu In-Memory Cache (5 phút TTL)
  const cached = sessionCache.get(clean)
  const now = Date.now()
  if (cached && now - cached.cachedAt < SESSION_CACHE_TTL_MS) {
    return cached.valid
  }

  // 3. Gọi endpoint check_session của Google Apps Script backend
  const gasUrl = getEnv("GAS_EXEC_URL") || getEnv("VITE_APPS_SCRIPT_URL") || DEFAULT_GAS_URL
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 4000) // 4 giây timeout

    const checkUrl = `${gasUrl}?action=check_session&session_token=${encodeURIComponent(clean)}`
    const res = await fetch(checkUrl, {
      method: "GET",
      signal: ctrl.signal,
    })
    clearTimeout(timer)

    if (!res.ok) {
      sessionCache.set(clean, { valid: false, cachedAt: now })
      return false
    }

    const data = await res.json()
    const isValid = Boolean(data && (data.valid === true || data.status === "success"))
    sessionCache.set(clean, {
      valid: isValid,
      role: data.role || data.user?.role,
      cachedAt: now,
    })
    return isValid
  } catch {
    // Nếu gặp lỗi mạng / offline mà token không có sẵn trong cache -> từ chối an toàn
    return false
  }
}

/**
 * Kiểm tra giới hạn tần suất cửa sổ trượt (In-Memory Sliding Window Rate Limiting)
 */
export function checkRateLimit(
  identifier: string,
  now: number = Date.now()
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const existing = requestTimestampsMap.get(identifier) || []

  // Lọc các timestamp nằm trong cửa sổ 60s
  const activeTimestamps = existing.filter((t) => t > windowStart)

  if (activeTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldest = activeTimestamps[0]
    const retryAfter = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000))
    requestTimestampsMap.set(identifier, activeTimestamps)
    return { allowed: false, remaining: 0, retryAfterSeconds: retryAfter }
  }

  activeTimestamps.push(now)
  requestTimestampsMap.set(identifier, activeTimestamps)

  // Dọn dẹp bộ nhớ nếu map lưu trữ quá nhiều key cũ
  if (requestTimestampsMap.size > 2000) {
    for (const [key, times] of requestTimestampsMap.entries()) {
      if (times.every((t) => t <= windowStart)) {
        requestTimestampsMap.delete(key)
      }
    }
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - activeTimestamps.length,
    retryAfterSeconds: 0,
  }
}

/**
 * Reset bộ đếm rate limit (dành cho kiểm thử)
 */
export function resetRateLimitMap(): void {
  requestTimestampsMap.clear()
}

/**
 * Extracts and sanitizes key pool from environment variables
 */
function buildKeyPool(): string[] {
  const pool: string[] = []
  const envKey = getEnv("OPENROUTER_API_KEY") || getEnv("VITE_OPENROUTER_API_KEY")
  if (envKey) {
    envKey.split(",").forEach((k: string) => {
      const clean = k.trim()
      if (clean && !pool.includes(clean)) pool.push(clean)
    })
  }

  return pool
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  // 2. Health check via GET
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        status: "online",
        service: "UXMB OpenRouter AI Gateway",
        runtime: "edge",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: { message: "Method Not Allowed" } }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }

  try {
    // 3. Caller Authentication
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
    let sessionToken: string | null = null
    if (authHeader.startsWith("Bearer ") || authHeader.startsWith("bearer ")) {
      sessionToken = authHeader.slice(7).trim()
    }

    const authRequired = getEnv("AI_GATEWAY_AUTH_REQUIRED") === "true"

    if (authRequired) {
      if (!sessionToken) {
        return new Response(
          JSON.stringify({
            error: {
              message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
            },
            success: false,
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        )
      }

      // Xác minh token thật (từ chối token ngẫu nhiên giả mạo dù khớp regex)
      const isTokenGenuine = await verifySessionToken(sessionToken)
      if (!isTokenGenuine) {
        return new Response(
          JSON.stringify({
            error: {
              message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
            },
            success: false,
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        )
      }
    } else {
      // Khi authRequired = false (mặc định an toàn cho local dev):
      // Nếu có truyền token, vẫn kiểm tra định dạng; nếu sai định dạng thì từ chối
      if (sessionToken && !validateSessionToken(sessionToken)) {
        return new Response(
          JSON.stringify({
            error: {
              message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
            },
            success: false,
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        )
      }
    }

    // 4. In-Memory Sliding Window Rate Limiting (Tối đa 20 req/phút per IP / session)
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown_client"
    const rateLimitIdentifier =
      sessionToken && validateSessionToken(sessionToken)
        ? `session:${sessionToken}`
        : `ip:${clientIp}`
    const rateLimit = checkRateLimit(rateLimitIdentifier)

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Quá giới hạn tần suất yêu cầu (tối đa 20 yêu cầu/phút). Vui lòng thử lại sau giây lát.",
          },
          success: false,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
            "X-RateLimit-Remaining": "0",
          },
        }
      )
    }

    // 5. Check Server API Key (OPENROUTER_API_KEY)
    const availableKeys = buildKeyPool()
    if (availableKeys.length === 0) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Dịch vụ AI chưa được cấu hình khóa API (OPENROUTER_API_KEY) trên máy chủ.",
            code: "MISSING_SERVER_API_KEY",
          },
          success: false,
          code: "MISSING_SERVER_API_KEY",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // 6. Request Body Validation
    const body = await req.json()
    const {
      messages,
      model = DEFAULT_MODEL,
      stream = false,
      temperature = 0.7,
      max_tokens = 1024,
    } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: { message: "Missing or invalid 'messages' array in request body." },
          success: false,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const openRouterPayload = {
      model,
      models: Array.from(
        new Set([
          model,
          "google/gemma-4-31b-it:free",
          "qwen/qwen3.8-27b:free",
          "nvidia/nemotron-3-ultra-550b-a55b:free",
          "openrouter/free",
        ])
      ),
      route: "fallback",
      messages,
      stream: Boolean(stream),
      temperature,
      max_tokens,
    }

    // 7. Key Rotation Execution
    let lastErrorStatus = 500
    let lastErrorMessage = "Failed to communicate with OpenRouter"

    for (let i = 0; i < availableKeys.length; i++) {
      const activeKey = availableKeys[i]

      try {
        const upstreamResponse = await fetch(OPENROUTER_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://uxmb-task-request.vercel.app",
            "X-Title": "UX MB Task Portal AI",
          },
          body: JSON.stringify(openRouterPayload),
        })

        // If rate limited or quota exceeded, rotate to next key
        if (upstreamResponse.status === 429 || upstreamResponse.status === 402) {
          lastErrorStatus = upstreamResponse.status
          lastErrorMessage = `API Key #${i + 1} reached limit (HTTP ${upstreamResponse.status}). Attempting next key...`
          continue
        }

        // If unauthorized, rotate to next key
        if (upstreamResponse.status === 401) {
          lastErrorStatus = 401
          lastErrorMessage = `API Key #${i + 1} is invalid (HTTP 401). Attempting next key...`
          continue
        }

        // If other error occurred
        if (!upstreamResponse.ok) {
          const errorData = await upstreamResponse.text()
          lastErrorStatus = upstreamResponse.status
          lastErrorMessage = errorData || `Upstream returned status ${upstreamResponse.status}`
          continue
        }

        // SUCCESS: Stream back or return JSON
        if (stream && upstreamResponse.body) {
          return new Response(upstreamResponse.body, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              "Connection": "keep-alive",
              "X-Key-Index-Used": String(i),
            },
          })
        }

        const data = await upstreamResponse.json()
        return new Response(
          JSON.stringify({
            success: true,
            data,
            keyIndexUsed: i,
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        )
      } catch (err: any) {
        lastErrorMessage = err?.message || String(err)
      }
    }

    // All keys exhausted
    return new Response(
      JSON.stringify({
        error: {
          message: `All ${availableKeys.length} API key(s) failed or exceeded quota. Last error: ${lastErrorMessage}`,
        },
        success: false,
        status: lastErrorStatus,
      }),
      {
        status: lastErrorStatus >= 400 && lastErrorStatus < 600 ? lastErrorStatus : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: { message: err?.message || "Internal server error in AI Gateway." },
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
}
