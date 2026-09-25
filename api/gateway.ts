/**
 * ==============================================================================
 * VERCEL SERVERLESS REVERSE PROXY GATEWAY: /api/gateway
 * Forwarding client requests to Google Apps Script Backend with strict CORS
 * ==============================================================================
 */

export const config = {
  runtime: "edge",
}

export const DEFAULT_GAS_EXEC_URL =
  "https://script.google.com/macros/s/AKfycbyz4_GK_guUx9L6uaRd4vK5jqJwG60eLr8Xju3j2hcEUianS8873cp4fJe8BBBrilKQ/exec"

/**
 * Validates CORS origin:
 * - Live production domain: https://uxmb-task-request.vercel.app
 * - Localhost and 127.0.0.1 on any port
 * - Preview domains:
 *   - https://*-cuongs-projects.vercel.app
 *   - https://*-mbuxdesigner.vercel.app
 *   - https://uxmb-task-request-*.vercel.app
 */
export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false
  const clean = origin.trim().toLowerCase()

  // 1. Production domain
  if (clean === "https://uxmb-task-request.vercel.app") {
    return true
  }

  // 2. Localhost development environments
  if (/^http:\/\/localhost(:\d+)?$/.test(clean) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(clean)) {
    return true
  }

  // 3. Preview domains
  if (/^https:\/\/[a-z0-9_-]+-cuongs-projects\.vercel\.app$/.test(clean)) {
    return true
  }
  if (/^https:\/\/[a-z0-9_-]+-mbuxdesigner\.vercel\.app$/.test(clean)) {
    return true
  }
  if (/^https:\/\/uxmb-task-request-[a-z0-9_-]+\.vercel\.app$/.test(clean)) {
    return true
  }
  if (/^https:\/\/uxmb-task-request.*\.vercel\.app$/.test(clean)) {
    return true
  }

  return false
}

/**
 * Generates appropriate CORS headers based on incoming origin
 */
export function getCorsHeaders(origin: string | null | undefined): Record<string, string> {
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
 * Resolves the upstream Google Apps Script endpoint safely
 */
export function getUpstreamUrl(): string {
  if (typeof process !== "undefined" && process.env) {
    if (process.env.GAS_EXEC_URL && process.env.GAS_EXEC_URL.trim()) {
      return process.env.GAS_EXEC_URL.trim()
    }
    if (process.env.VITE_APPS_SCRIPT_URL && process.env.VITE_APPS_SCRIPT_URL.trim()) {
      return process.env.VITE_APPS_SCRIPT_URL.trim()
    }
  }
  return DEFAULT_GAS_EXEC_URL
}

/**
 * Handler for Edge and Serverless Requests
 */
export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  // 1. Handle CORS Preflight OPTIONS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  // 2. Validate Origin if provided
  if (origin && !isAllowedOrigin(origin)) {
    return new Response(
      JSON.stringify({
        status: "forbidden",
        message: "CORS policy violation: Origin not allowed",
      }),
      {
        status: 403,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  }

  const upstreamUrl = getUpstreamUrl()

  try {
    if (req.method === "GET") {
      const incomingUrl = new URL(req.url)
      const outgoingUrl = new URL(upstreamUrl)

      incomingUrl.searchParams.forEach((val, key) => {
        outgoingUrl.searchParams.set(key, val)
      })

      const upstreamRes = await fetch(outgoingUrl.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
      })

      const responseBody = await upstreamRes.text()
      return new Response(responseBody, {
        status: upstreamRes.status,
        headers: {
          ...corsHeaders,
          "Content-Type": upstreamRes.headers.get("content-type") || "application/json",
        },
      })
    }

    if (req.method === "POST") {
      const bodyText = await req.text()
      const upstreamRes = await fetch(upstreamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: bodyText,
      })

      const responseBody = await upstreamRes.text()
      return new Response(responseBody, {
        status: upstreamRes.status,
        headers: {
          ...corsHeaders,
          "Content-Type": upstreamRes.headers.get("content-type") || "application/json",
        },
      })
    }

    return new Response(
      JSON.stringify({ status: "error", message: `Method ${req.method} not supported` }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Gateway proxy failed: " + (error?.message || String(error)),
      }),
      {
        status: 502,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  }
}

export { handler as GET, handler as POST, handler as OPTIONS }
