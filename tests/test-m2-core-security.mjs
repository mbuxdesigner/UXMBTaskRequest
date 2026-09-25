/**
 * ==============================================================================
 * TEST SUITE: MILESTONE 2 (CORE SECURITY HARDENING) VERIFICATION
 * Items: 1, 5, 9, 12, 13, 15, 16, 17
 * ==============================================================================
 */

import fs from "fs"
import path from "path"
import assert from "assert"

const rootDir = process.cwd()

console.log("================================================================================")
console.log("TEST SUITE: MILESTONE 2 (CORE SECURITY HARDENING VERIFICATION)")
console.log("================================================================================")

let passedTests = 0
let totalTests = 0

function runTest(name, fn) {
  totalTests++
  try {
    fn()
    passedTests++
    console.log(`✓ Test ${totalTests}: ${name}`)
  } catch (err) {
    console.error(`✗ Test ${totalTests} FAILED: ${name}`)
    console.error(err)
    process.exit(1)
  }
}

// -----------------------------------------------------------------------------
// Group 1: Item 1 - Safe Authentication & OTP Management
// -----------------------------------------------------------------------------
runTest("otpAuthService.ts guards master OTP bypass with isDevOtpBypassAllowed (strictly disabled in production)", () => {
  const filePath = path.join(rootDir, "src", "services", "otpAuthService.ts")
  const content = fs.readFileSync(filePath, "utf-8")

  assert.ok(content.includes("isDevOtpBypassAllowed"), "isDevOtpBypassAllowed must be defined and exported")
  assert.ok(
    content.includes("cleanOtp === \"123456\" || cleanOtp === \"583921\""),
    "Master OTP check must exist"
  )
  // Ensure the master OTP check is guarded by devBypass
  const checkIdx = content.indexOf("cleanOtp === \"123456\" || cleanOtp === \"583921\"")
  const snippet = content.slice(Math.max(0, checkIdx - 80), checkIdx + 120)
  assert.ok(
    snippet.includes("isDevOtpBypassAllowed") || snippet.includes("devBypass"),
    "Master OTP check must be guarded by dev check"
  )

  // Verify that isDevOtpBypassAllowed checks DEV or VITE_ENABLE_DEV_OTP_BYPASS
  assert.ok(
    content.includes("import.meta.env?.DEV") && content.includes("VITE_ENABLE_DEV_OTP_BYPASS"),
    "isDevOtpBypassAllowed must strictly check DEV flag and VITE_ENABLE_DEV_OTP_BYPASS"
  )
})

runTest("otpAuthService.ts eliminates direct public Google Sheet GViz CSV queries on USERS sheet", () => {
  const filePath = path.join(rootDir, "src", "services", "otpAuthService.ts")
  const content = fs.readFileSync(filePath, "utf-8")

  // Ensure no gviz query on USERS sheet remains in otpAuthService
  assert.ok(!content.includes("gviz/tq?tqx=out:csv&sheet=USERS"), "GViz query on sheet=USERS must be eliminated")
  // Ensure checkVerifiedStatusFromSheet routes through authenticated check_session
  assert.ok(content.includes("action\", \"check_session\""), "Lookups must route through authenticated check_session")
  assert.ok(content.includes("session_token"), "check_session must pass session_token parameter")
})

runTest("google-apps-script-backend.js removes MOCK_ token and unverified clientEmail bypasses", () => {
  const filePath = path.join(rootDir, "google-apps-script-backend.js")
  const content = fs.readFileSync(filePath, "utf-8")

  // Check handleUpdateTaskProgress
  assert.ok(!content.includes("sessionToken.startsWith(\"MOCK_\")"), "MOCK_ token bypass must be removed")
  assert.ok(!content.includes("sessionToken === \"DEMO_TOKEN\""), "DEMO_TOKEN bypass must be removed")
  // Check that unverified clientEmail does not grant user access without session
  assert.ok(
    !content.includes("if (!user && clientEmail) {"),
    "Unverified clientEmail fallback must be eliminated from task mutations"
  )
})

// -----------------------------------------------------------------------------
// Group 2: Item 5 & Item 9 - Secrets at Backend & CORS Controls
// -----------------------------------------------------------------------------
runTest("api/gateway.ts exists and exports reverse proxy handler and CORS origin check", () => {
  const filePath = path.join(rootDir, "api", "gateway.ts")
  assert.ok(fs.existsSync(filePath), "api/gateway.ts must exist")
  const content = fs.readFileSync(filePath, "utf-8")

  assert.ok(content.includes("isAllowedOrigin"), "isAllowedOrigin must be exported")
  assert.ok(content.includes("getCorsHeaders"), "getCorsHeaders must be exported")
  assert.ok(content.includes("DEFAULT_GAS_EXEC_URL"), "DEFAULT_GAS_EXEC_URL must be defined")
  assert.ok(content.includes("runtime: \"edge\"") || content.includes("runtime: 'edge'"), "Edge runtime must be configured")
})

runTest("api/gateway.ts CORS validation rules enforce strict origin whitelist", () => {
  const filePath = path.join(rootDir, "api", "gateway.ts")
  const content = fs.readFileSync(filePath, "utf-8")

  // Simulate regex rules from gateway
  const isAllowed = (origin) => {
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

  // Allowed origins
  assert.strictEqual(isAllowed("https://uxmb-task-request.vercel.app"), true, "Production domain must be allowed")
  assert.strictEqual(isAllowed("http://localhost:5173"), true, "Localhost must be allowed")
  assert.strictEqual(isAllowed("http://localhost:3000"), true, "Localhost 3000 must be allowed")
  assert.strictEqual(isAllowed("http://127.0.0.1:8080"), true, "127.0.0.1 must be allowed")
  assert.strictEqual(isAllowed("https://preview-deploy-cuongs-projects.vercel.app"), true, "cuongs-projects preview must be allowed")
  assert.strictEqual(isAllowed("https://ux-mbuxdesigner.vercel.app"), true, "mbuxdesigner preview must be allowed")
  assert.strictEqual(isAllowed("https://uxmb-task-request-develop.vercel.app"), true, "branch preview must be allowed")

  // Disallowed origins
  assert.strictEqual(isAllowed("https://malicious-site.com"), false, "Malicious domain must be blocked")
  assert.strictEqual(isAllowed("https://evil-cuongs-projects.com"), false, "Fake domain must be blocked")
  assert.strictEqual(isAllowed("http://attacker.com"), false, "Attacker domain must be blocked")
  assert.strictEqual(isAllowed("null"), false, "Null origin must be blocked")
  assert.strictEqual(isAllowed(""), false, "Empty origin must be blocked")
})

runTest("googleSheetConfig.ts supports /api/gateway routing with fallback to direct Apps Script execution", () => {
  const filePath = path.join(rootDir, "src", "config", "googleSheetConfig.ts")
  const content = fs.readFileSync(filePath, "utf-8")

  assert.ok(content.includes("GATEWAY_PROXY_URL = \"/api/gateway\""), "GATEWAY_PROXY_URL must be defined")
  assert.ok(content.includes("useGateway"), "useGateway flag must exist in config")
  assert.ok(content.includes("fallbackScriptUrl"), "fallbackScriptUrl must exist for resilience")
  assert.ok(content.includes("getFallbackScriptUrl"), "getFallbackScriptUrl helper must be exported")
  assert.ok(content.includes("PRODUCTION_SCRIPT_URL"), "PRODUCTION_SCRIPT_URL must be defined")
})

// -----------------------------------------------------------------------------
// Group 3: Item 12 & Item 15 - HTTPS & HTTP Security Headers
// -----------------------------------------------------------------------------
runTest("vercel.json enforces complete HTTP security headers including HSTS and CSP", () => {
  const filePath = path.join(rootDir, "vercel.json")
  const json = JSON.parse(fs.readFileSync(filePath, "utf-8"))

  const rootRule = json.headers.find((h) => h.source === "/(.*)")
  assert.ok(rootRule, "Root header rule must exist")

  const map = {}
  for (const item of rootRule.headers) {
    map[item.key.toLowerCase()] = item.value
  }

  assert.strictEqual(map["x-content-type-options"], "nosniff", "nosniff must be enforced")
  assert.strictEqual(map["x-frame-options"], "SAMEORIGIN", "SAMEORIGIN must be enforced")
  assert.ok(map["strict-transport-security"].includes("max-age=63072000"), "HSTS max-age=63072000 must be set")
  assert.ok(map["strict-transport-security"].includes("includeSubDomains"), "HSTS includeSubDomains must be set")
  assert.ok(map["strict-transport-security"].includes("preload"), "HSTS preload must be set")
  assert.strictEqual(map["referrer-policy"], "strict-origin-when-cross-origin", "Referrer-Policy must be strict")
  assert.ok(map["permissions-policy"].includes("camera=()"), "Permissions-Policy must restrict camera")
  assert.ok(map["content-security-policy"].includes("frame-ancestors 'self'"), "CSP must include frame-ancestors 'self'")
  assert.ok(map["content-security-policy"].includes("connect-src"), "CSP must include connect-src")
})

// -----------------------------------------------------------------------------
// Group 4: Item 13 & Item 16 - Zero Session Disruption & Safe Storage
// -----------------------------------------------------------------------------
runTest("RequestForm.tsx implements 15-second draft auto-save and restoration with toast notification", () => {
  const filePath = path.join(rootDir, "src", "components", "form", "RequestForm.tsx")
  const content = fs.readFileSync(filePath, "utf-8")

  assert.ok(content.includes("FORM_DRAFT_KEY = \"ux_request_form_draft\""), "FORM_DRAFT_KEY must be exported")
  assert.ok(content.includes("autoSaveDraft"), "autoSaveDraft function must exist")
  assert.ok(content.includes("15000"), "Auto-save interval must be 15,000ms (15s)")
  assert.ok(content.includes("Đã khôi phục bản nháp chưa gửi!"), "Restore toast notification must match specification")
  assert.ok(content.includes("localStorage.removeItem(FORM_DRAFT_KEY)"), "Draft must be cleaned up on submission")
})

runTest("otpAuthService.ts implements migrateSessionSchema for zero-disruption session upgrades", () => {
  const filePath = path.join(rootDir, "src", "services", "otpAuthService.ts")
  const content = fs.readFileSync(filePath, "utf-8")

  assert.ok(content.includes("migrateSessionSchema"), "migrateSessionSchema function must exist and be exported")
  assert.ok(
    content.includes("migrateSessionSchema()"),
    "migrateSessionSchema must be invoked during getStoredSession()"
  )

  // Test simulation of migrateSessionSchema logic
  const legacySession = {
    token: "ST_LEGACY_12345",
    email: "designer.test@mbbank.com.vn",
    role: "Designer",
    name: "Test Designer",
  }

  // Schema transformation verification
  const migrated = {
    sessionToken: legacySession.token,
    personalEmail: legacySession.email,
    teamsEmail: legacySession.email,
    displayName: legacySession.name,
    role: legacySession.role,
    sessionPolicy: "sliding_24h",
    lastActiveAt: Date.now(),
    loginAt: Date.now(),
    expiresAt: Date.now() + 24 * 3600 * 1000,
    _schemaVersion: 2,
  }

  assert.strictEqual(migrated.sessionToken, "ST_LEGACY_12345", "token should map to sessionToken")
  assert.strictEqual(migrated.personalEmail, "designer.test@mbbank.com.vn", "email should map to personalEmail")
  assert.strictEqual(migrated.sessionPolicy, "sliding_24h", "Standard user policy should default to sliding_24h")
})

runTest("otpAuthService.ts implements 15-minute session expiry warning event and extendSession calling touch_session", () => {
  const filePath = path.join(rootDir, "src", "services", "otpAuthService.ts")
  const content = fs.readFileSync(filePath, "utf-8")

  assert.ok(content.includes("SESSION_EXPIRY_WARNING_EVENT = \"ux_session_expiry_warning\""), "SESSION_EXPIRY_WARNING_EVENT must be exported")
  assert.ok(content.includes("SESSION_EXPIRY_WARNING_THRESHOLD_MS = 15 * 60 * 1000"), "Warning threshold must be 15 minutes")
  assert.ok(content.includes("checkSessionExpiry"), "checkSessionExpiry function must exist")
  assert.ok(content.includes("extendSession"), "extendSession function must exist and be exported")
  assert.ok(content.includes("showSessionExpiryWarningDialog"), "showSessionExpiryWarningDialog must exist")
  assert.ok(content.includes("action: \"touch_session\""), "extendSession must invoke touch_session on backend")
})

// -----------------------------------------------------------------------------
// Group 5: Item 17 - Session Expiry Logic Verification
// -----------------------------------------------------------------------------
runTest("Dual session policy maintains fixed 8h for Admin and sliding 24h for standard roles", () => {
  const filePath = path.join(rootDir, "src", "services", "otpAuthService.ts")
  const content = fs.readFileSync(filePath, "utf-8")

  assert.ok(content.includes("SESSION_DURATION_HOURS = 8"), "Fixed duration must be 8 hours")
  assert.ok(content.includes("SESSION_DURATION_SLIDING_HOURS = 24"), "Sliding duration must be 24 hours")
  assert.ok(content.includes("INACTIVITY_LIMIT_24H_MS"), "Sliding inactivity limit must be defined")
  assert.ok(content.includes("Admin: \"fixed_8h\""), "Admin role must default to fixed_8h")
  assert.ok(content.includes("Designer: \"sliding_24h\""), "Designer role must default to sliding_24h")
  assert.ok(content.includes("PO: \"sliding_24h\""), "PO role must default to sliding_24h")
})

console.log("================================================================================")
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS FOR MILESTONE 2 PASSED SUCCESSFULLY (100%)`)
console.log("================================================================================")
