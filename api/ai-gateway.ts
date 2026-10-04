/**
 * ==============================================================================
 * VERCEL SERVERLESS EDGE PROXY: /api/ai-gateway
 * Forwarding client requests to OpenRouter AI API with key rotation & streaming
 * ==============================================================================
 */

export const config = {
  runtime: "edge",
}

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
const DEFAULT_MODEL = "google/gemma-4-31b-it:free"

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
 * Extracts and sanitizes key pool from environment variables and client payload
 */
function buildKeyPool(): string[] {
  const pool: string[] = []
  const runtimeProcess = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> }
  }).process

  // 1. Check server environment keys only
  const envKey = runtimeProcess?.env?.OPENROUTER_API_KEY || runtimeProcess?.env?.VITE_OPENROUTER_API_KEY
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
      JSON.stringify({ success: false, error: "Method Not Allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }

  try {
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
        JSON.stringify({ success: false, error: "Missing or invalid 'messages' array in request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const availableKeys = buildKeyPool()
    if (availableKeys.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No OpenRouter API key configured. Please configure an API key in Admin Settings or OPENROUTER_API_KEY env.",
          code: "MISSING_API_KEY",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const openRouterPayload = {
      model,
      models: Array.from(new Set([
        model,
        "google/gemma-4-31b-it:free",
        "qwen/qwen3.8-27b:free",
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "openrouter/free"
      ])),
      route: "fallback",
      messages,
      stream: Boolean(stream),
      temperature,
      max_tokens,
    }

    // 3. Key Rotation Execution
    let lastErrorStatus = 500
    let lastErrorMessage = "Failed to communicate with OpenRouter"

    for (let i = 0; i < availableKeys.length; i++) {
      const activeKey = availableKeys[i]

      try {
        const upstreamResponse = await fetch(OPENROUTER_ENDPOINT, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${activeKey}`,
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
        success: false,
        error: `All ${availableKeys.length} API key(s) failed or exceeded quota. Last error: ${lastErrorMessage}`,
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
        success: false,
        error: err?.message || "Internal server error in AI Gateway.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
}
