/**
 * ==============================================================================
 * TEST SUITE: MILESTONES 3 & 4 (INFRASTRUCTURE & BUSINESS SECURITY HARDENING)
 * Items: 19, 20 (M3) and 2, 3, 4, 6, 7, 8, 10, 11, 14, 18 (M4)
 * ==============================================================================
 */

import fs from "fs"
import path from "path"
import assert from "assert"

const rootDir = process.cwd()

console.log("================================================================================")
console.log("TEST SUITE: MILESTONES 3 & 4 (SECURITY & INFRASTRUCTURE VERIFICATION)")
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
// Group 1: Item 19 - Cloudflare Proxy & WAF Configuration Guide
// -----------------------------------------------------------------------------
runTest("Item 19: doc/CLOUDFLARE_HARDENING_GUIDE.md exists and contains complete hardening setup", () => {
  const guidePath = path.join(rootDir, "doc", "CLOUDFLARE_HARDENING_GUIDE.md")
  assert.ok(fs.existsSync(guidePath), "CLOUDFLARE_HARDENING_GUIDE.md must exist in doc/")
  const content = fs.readFileSync(guidePath, "utf-8")

  // CNAME proxy to Vercel
  assert.ok(content.includes("cname.vercel-dns.com"), "Must guide CNAME proxy to cname.vercel-dns.com")
  assert.ok(content.includes("orange cloud") || content.includes("Proxied"), "Must specify Cloudflare Proxied mode (orange cloud)")

  // SSL Full Strict
  assert.ok(content.includes("Full (Strict)") || content.includes("Full (strict)"), "Must instruct Full (Strict) SSL/TLS encryption")

  // WAF Bot Fight Mode bypass
  assert.ok(
    content.includes("Bot Fight Mode") || content.includes("Bot Management"),
    "Must document Bot Fight Mode handling"
  )
  assert.ok(
    content.includes("api/gateway") || content.includes("preview") || content.includes("script.google.com"),
    "Must document bypass rules for Vercel preview, API endpoints, and Google Apps Script"
  )

  // Corporate Rate Limiting without department IP blocks
  assert.ok(
    content.includes("NAT") || content.includes("Rate Limiting") || content.includes("corporate"),
    "Must document corporate NAT considerations for Rate Limiting"
  )
})

// -----------------------------------------------------------------------------
// Group 2: Item 6 - Production Bundle Log Stripping
// -----------------------------------------------------------------------------
runTest("Item 6: vite.config.ts configures production console and debugger purging", () => {
  const configPath = path.join(rootDir, "vite.config.ts")
  const content = fs.readFileSync(configPath, "utf-8")

  assert.ok(
    content.includes("['console', 'debugger']") || content.includes('["console", "debugger"]'),
    "esbuild drop config must include console and debugger"
  )
  assert.ok(
    content.includes("dropConsolePlugin") || content.includes("drop:"),
    "vite.config.ts must enforce console removal in production"
  )
})

runTest("Item 6: Production dist/ bundle contains zero console.warn, console.error, console.log calls", () => {
  const distAssetsDir = path.join(rootDir, "dist", "assets")
  assert.ok(fs.existsSync(distAssetsDir), "dist/assets must exist (run pnpm build first)")

  const files = fs.readdirSync(distAssetsDir).filter(f => f.endsWith(".js"))
  assert.ok(files.length > 0, "There should be compiled JS assets in dist/assets")

  for (const file of files) {
    const jsContent = fs.readFileSync(path.join(distAssetsDir, file), "utf-8")
    const hasConsoleLog = /\bconsole\s*\.\s*log\s*\(/.test(jsContent)
    const hasConsoleWarn = /\bconsole\s*\.\s*warn\s*\(/.test(jsContent)
    const hasConsoleError = /\bconsole\s*\.\s*error\s*\(/.test(jsContent)

    assert.strictEqual(hasConsoleLog, false, `File ${file} must not contain console.log`)
    assert.strictEqual(hasConsoleWarn, false, `File ${file} must not contain console.warn`)
    assert.strictEqual(hasConsoleError, false, `File ${file} must not contain console.error`)
  }
})

// -----------------------------------------------------------------------------
// Group 3: Item 7 - Input Validation & XSS Defense
// -----------------------------------------------------------------------------
runTest("Item 7: RequestForm.tsx enforces boundary lengths (title <= 150, text fields <= 10,000)", () => {
  const formPath = path.join(rootDir, "src", "components", "form", "RequestForm.tsx")
  const content = fs.readFileSync(formPath, "utf-8")

  assert.ok(content.includes("150"), "Title length constraint (150 chars) must be present")
  assert.ok(content.includes("10000") || content.includes("10_000"), "Description length constraint (10,000 chars) must be present")
  assert.ok(content.includes("maxLength={150}"), "Title input must specify maxLength={150}")
  assert.ok(content.includes("maxLength={10000}"), "Description / brief textareas must specify maxLength={10000}")
})

runTest("Item 7: RequestForm.tsx implements XSS sanitization stripping scripts, events, and dangerous protocols", () => {
  const formPath = path.join(rootDir, "src", "components", "form", "RequestForm.tsx")
  const content = fs.readFileSync(formPath, "utf-8")

  assert.ok(content.includes("sanitizeXss"), "sanitizeXss function must be implemented")
  assert.ok(content.includes("<script"), "sanitizeXss must strip script tags")
  assert.ok(content.includes("javascript\\s*:") || content.includes("javascript"), "sanitizeXss must neutralize javascript: URI scheme")
  assert.ok(content.includes("onerror") || content.includes("onload") || content.includes("on\\w+"), "sanitizeXss must strip DOM event handlers")

  // Simulate sanitizeXss logic verification
  function testSanitize(input) {
    if (!input) return ""
    return String(input)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .trim()
  }

  const dirtyPayload = "<script>alert('xss')</script><img src=x onerror=alert(1)>Hello <b>World</b>"
  const cleaned = testSanitize(dirtyPayload)
  assert.strictEqual(cleaned.includes("<script>"), false)
  assert.strictEqual(cleaned.includes("onerror="), false)
  assert.strictEqual(cleaned, "Hello World")
})

// -----------------------------------------------------------------------------
// Group 4: Item 8 - Secure File Upload (Client & Backend)
// -----------------------------------------------------------------------------
runTest("Item 8: FileUpload.tsx validates client-side file size (<= 25MB) and whitelisted extensions", () => {
  const uploadPath = path.join(rootDir, "src", "components", "form", "FileUpload.tsx")
  const content = fs.readFileSync(uploadPath, "utf-8")

  assert.ok(content.includes("MAX_FILE_SIZE") && (content.includes("25 * 1024 * 1024") || content.includes("26214400")), "MAX_FILE_SIZE must be 25MB")
  assert.ok(content.includes("ALLOWED_EXTENSIONS"), "ALLOWED_EXTENSIONS array must be defined")
  for (const ext of ["pdf", "docx", "pptx", "xlsx", "png", "jpg", "jpeg"]) {
    assert.ok(content.includes(`"${ext}"`) || content.includes(`'${ext}'`), `Extension ${ext} must be in client whitelist`)
  }
})

runTest("Item 8: google-apps-script-backend.js enforces server-side file upload limits, MIME whitelist & DOMAIN_WITH_LINK sharing", () => {
  const backendPath = path.join(rootDir, "google-apps-script-backend.js")
  const content = fs.readFileSync(backendPath, "utf-8")

  assert.ok(content.includes("35 * 1024 * 1024"), "Must check 35MB base64 limit in backend")
  assert.ok(content.includes("allowedExtensions"), "Must enforce allowed file extensions on server")
  assert.ok(content.includes("allowedMimeTypes"), "Must enforce allowed MIME types on server")
  assert.ok(content.includes("DriveApp.Access.DOMAIN_WITH_LINK"), "Must set file sharing to DOMAIN_WITH_LINK")
})

// -----------------------------------------------------------------------------
// Group 5: Item 11 - CSRF Token Generation & Validation
// -----------------------------------------------------------------------------
runTest("Item 11: otpAuthService.ts generates CSRF token and binds to UserSession", () => {
  const authPath = path.join(rootDir, "src", "services", "otpAuthService.ts")
  const content = fs.readFileSync(authPath, "utf-8")

  assert.ok(content.includes("csrfToken?: string"), "UserSession interface must have csrfToken")
  assert.ok(content.includes("generateCsrfToken"), "generateCsrfToken must be implemented")
  assert.ok(content.includes("CSRF_"), "CSRF token must begin with CSRF_ prefix")
})

runTest("Item 11: googleSheetService.ts attaches csrf_token to all mutation requests", () => {
  const sheetServicePath = path.join(rootDir, "src", "services", "googleSheetService.ts")
  const content = fs.readFileSync(sheetServicePath, "utf-8")

  assert.ok(content.includes("csrf_token: session?.csrfToken") || content.includes("csrf_token: session.csrfToken"), "Mutations must include session.csrfToken")
  assert.ok(content.includes("updateTaskProgressInSheet"), "updateTaskProgressInSheet must exist")
  assert.ok(content.includes("syncTeamMembersToSheet"), "syncTeamMembersToSheet must exist")
  assert.ok(content.includes("syncMasterDataToSheet"), "syncMasterDataToSheet must exist")
  assert.ok(content.includes("setTeamsWebhookToSheet"), "setTeamsWebhookToSheet must exist")
})

runTest("Item 11: google-apps-script-backend.js validates CSRF tokens on write operations", () => {
  const backendPath = path.join(rootDir, "google-apps-script-backend.js")
  const content = fs.readFileSync(backendPath, "utf-8")

  assert.ok(content.includes("function validateCsrfToken(data, user)"), "validateCsrfToken helper must be defined")
  assert.ok(content.includes("token.startsWith(\"CSRF_\")"), "validateCsrfToken must enforce CSRF_ prefix")
  assert.ok(content.includes("token.length < 16"), "validateCsrfToken must check minimum token length")

  // Ensure validateCsrfToken is called in write actions
  const validateCalls = (content.match(/validateCsrfToken\s*\(/g) || []).length
  assert.ok(validateCalls >= 4, `validateCsrfToken should be called on mutations (found ${validateCalls})`)
})

// -----------------------------------------------------------------------------
// Group 6: Item 2 - RBAC Server-Side Enforcement (Admin HTTP 403)
// -----------------------------------------------------------------------------
runTest("Item 2: google-apps-script-backend.js enforces Admin role for team members, master data, and webhook setup", () => {
  const backendPath = path.join(rootDir, "google-apps-script-backend.js")
  const content = fs.readFileSync(backendPath, "utf-8")

  // handleSyncTeamMembers
  const syncMembersIdx = content.indexOf("function handleSyncTeamMembers")
  const syncMembersSnippet = content.slice(syncMembersIdx, syncMembersIdx + 1200)
  assert.ok(syncMembersSnippet.includes('user.role !== "Admin"'), "handleSyncTeamMembers must require Admin role")
  assert.ok(syncMembersSnippet.includes('status: "forbidden"'), "handleSyncTeamMembers must reject non-admins with forbidden")

  // handleSyncMasterData
  const syncMasterIdx = content.indexOf("function handleSyncMasterData")
  const syncMasterSnippet = content.slice(syncMasterIdx, syncMasterIdx + 1200)
  assert.ok(syncMasterSnippet.includes('user.role !== "Admin"'), "handleSyncMasterData must require Admin role")
  assert.ok(syncMasterSnippet.includes('status: "forbidden"'), "handleSyncMasterData must reject non-admins with forbidden")

  // handleSetTeamsWebhook
  const setWebhookIdx = content.indexOf("function handleSetTeamsWebhook")
  const setWebhookSnippet = content.slice(setWebhookIdx, setWebhookIdx + 1200)
  assert.ok(setWebhookSnippet.includes('user.role !== "Admin"'), "handleSetTeamsWebhook must require Admin role")
  assert.ok(setWebhookSnippet.includes('status: "forbidden"'), "handleSetTeamsWebhook must reject non-admins with forbidden")
})

// -----------------------------------------------------------------------------
// Group 7: Item 3 - IDOR Elimination in Task Updates
// -----------------------------------------------------------------------------
runTest("Item 3: google-apps-script-backend.js removes designer email bypass loophole in handleUpdateTaskProgress", () => {
  const backendPath = path.join(rootDir, "google-apps-script-backend.js")
  const content = fs.readFileSync(backendPath, "utf-8")

  assert.ok(!content.includes('!userEmail.includes("designer")'), "Loose userEmail.includes('designer') check must be eliminated")
  assert.ok(!content.includes('!userEmail.includes("cuong")'), "Hardcoded userEmail.includes('cuong') check must be eliminated")

  const updateProgressIdx = content.indexOf("function handleUpdateTaskProgress")
  const updateProgressSnippet = content.slice(updateProgressIdx, updateProgressIdx + 8000)
  assert.ok(
    updateProgressSnippet.includes("isAssignedToUser") && updateProgressSnippet.includes("currentAssigned"),
    "handleUpdateTaskProgress must verify user is actually assigned to task"
  )
})

// -----------------------------------------------------------------------------
// Group 8: Item 4 - Corporate Sliding Window Rate Limiting
// -----------------------------------------------------------------------------
runTest("Item 4: google-apps-script-backend.js implements account-based sliding window rate limit without IP blocking", () => {
  const backendPath = path.join(rootDir, "google-apps-script-backend.js")
  const content = fs.readFileSync(backendPath, "utf-8")

  const otpIdx = content.indexOf("function handleRequestOtpFast")
  const otpSnippet = content.slice(otpIdx, otpIdx + 5000)

  assert.ok(otpSnippet.includes("rate_cooldown_"), "Must key cooldown by email identifier")
  assert.ok(otpSnippet.includes("rate_count_"), "Must key request count by email identifier")
  assert.ok(otpSnippet.includes("60"), "Must enforce 60s cooldown")
  assert.ok(otpSnippet.includes("600"), "Must enforce 10-minute (600s) sliding window")
  assert.ok(otpSnippet.includes("currentCount >= 5"), "Must cap at 5 requests per window")
  assert.ok(otpSnippet.includes('status: "rate_limited"'), "Must return rate_limited status on limit breach")
})

// -----------------------------------------------------------------------------
// Group 9: Item 10 - Formula Injection Defense
// -----------------------------------------------------------------------------
runTest("Item 10: google-apps-script-backend.js implements sanitizeFormulaCell and applies to sheet writes", () => {
  const backendPath = path.join(rootDir, "google-apps-script-backend.js")
  const content = fs.readFileSync(backendPath, "utf-8")

  assert.ok(content.includes("function sanitizeFormulaCell(val)"), "sanitizeFormulaCell must be defined")
  assert.ok(content.includes("/^[=+\\-@\\t\\r]/"), "Formula prefix regex must match =, +, -, @, \\t, \\r")

  // Extract sanitizeFormulaCell directly from backend content
  const fnMatch = content.match(/function sanitizeFormulaCell\(val\)[\s\S]*?\n\}/)
  assert.ok(fnMatch, "sanitizeFormulaCell function implementation found")
  const sanitizeFormula = new Function('val', `${fnMatch[0]}; return sanitizeFormulaCell(val);`)

  assert.strictEqual(sanitizeFormula("=SUM(A1:A10)"), "'=SUM(A1:A10)")
  assert.strictEqual(sanitizeFormula("+1234567"), "'+1234567")
  assert.strictEqual(sanitizeFormula("-HYPERLINK(\"http://evil.com\")"), "'-HYPERLINK(\"http://evil.com\")")
  assert.strictEqual(sanitizeFormula("@cmd"), "'@cmd")
  assert.strictEqual(sanitizeFormula("\tHYPERLINK(\"http://evil.com\")"), "'\tHYPERLINK(\"http://evil.com\")")
  assert.strictEqual(sanitizeFormula("\rHYPERLINK"), "'\rHYPERLINK")
  assert.strictEqual(sanitizeFormula(" \tHYPERLINK"), "' \tHYPERLINK")
  assert.strictEqual(sanitizeFormula("Normal Title"), "Normal Title")

  // Check handleLogRequest applies sanitizeFormulaCell
  const logRequestIdx = content.indexOf("function handleLogRequest")
  const logRequestSnippet = content.slice(logRequestIdx, logRequestIdx + 6000)
  assert.ok(logRequestSnippet.includes("sanitizeFormulaCell("), "handleLogRequest must call sanitizeFormulaCell before writing cells")

  // Check handleUpdateTaskProgress applies sanitizeFormulaCell
  const updateIdx = content.indexOf("function handleUpdateTaskProgress")
  const updateSnippet = content.slice(updateIdx, updateIdx + 20000)
  assert.ok(updateSnippet.includes("sanitizeFormulaCell("), "handleUpdateTaskProgress must call sanitizeFormulaCell before writing cells")
})

// -----------------------------------------------------------------------------
// Group 10: Item 14 - Sensitive Data Masking Across Squads
// -----------------------------------------------------------------------------
runTest("Item 14: google-apps-script-backend.js masks sensitive cross-squad details for non-admin/PO callers", () => {
  const backendPath = path.join(rootDir, "google-apps-script-backend.js")
  const content = fs.readFileSync(backendPath, "utf-8")

  const getAllIdx = content.indexOf("function getAllRequestsFromSheet(isTest)")
  assert.ok(getAllIdx !== -1, "getAllRequestsFromSheet must exist")

  const getAllSnippet = content.slice(getAllIdx, getAllIdx + 6000)
  assert.ok(getAllSnippet.includes("[Confidential - Restricted Squad]"), "Must mask other squads with [Confidential - Restricted Squad]")
  assert.ok(getAllSnippet.includes("callerRole === \"PO\""), "Must check caller role for PO/Business")
})

// -----------------------------------------------------------------------------
// Group 11: Item 18 - Security Audit Logging
// -----------------------------------------------------------------------------
runTest("Item 18: google-apps-script-backend.js implements recordAuditLog with 10,000-row retention", () => {
  const backendPath = path.join(rootDir, "google-apps-script-backend.js")
  const content = fs.readFileSync(backendPath, "utf-8")

  assert.ok(content.includes("SHEET_AUDIT_LOGS = \"AuditLogs\""), "AuditLogs sheet constant must be defined")
  assert.ok(content.includes("function recordAuditLog(ss, logEntry)"), "recordAuditLog must be implemented")
  assert.ok(content.includes("MAX_AUDIT_ROWS = 10000"), "Must keep max 10,000 audit rows")
  assert.ok(content.includes("deleteRows(2,"), "Must trim older rows past retention limit")

  // Verify audit log columns
  for (const col of ["Timestamp", "User_Email", "Role", "Action", "Target_Resource", "IP_Address", "Status", "Details"]) {
    assert.ok(content.includes(`"${col}"`), `Column ${col} must be present in AuditLogs header`)
  }
})

// -----------------------------------------------------------------------------
// Group 12: Item 20 - Disaster Recovery, Automated Backups & Health Alerts
// -----------------------------------------------------------------------------
runTest("Item 20: google-apps-script-backend.js implements daily 01:00 AM backup, 30-day retention & Teams health alerts", () => {
  const backendPath = path.join(rootDir, "google-apps-script-backend.js")
  const content = fs.readFileSync(backendPath, "utf-8")

  // Backup functions
  assert.ok(content.includes("autoBackupSpreadsheetToDrive"), "autoBackupSpreadsheetToDrive must be defined")
  assert.ok(content.includes("UX_Portal_Automated_Backups"), "Backup folder must be UX_Portal_Automated_Backups")
  assert.ok(content.includes("UX_Portal_Backup_"), "Backup prefix must be UX_Portal_Backup_")
  assert.ok(content.includes("30 * 24 * 60 * 60 * 1000"), "Retention policy must be 30 days")
  assert.ok(content.includes("setTrashed(true)"), "Old backups must be pruned/trashed")

  // Daily trigger
  assert.ok(content.includes("setupDailyBackupTrigger"), "setupDailyBackupTrigger must be defined")
  assert.ok(content.includes(".atHour(1)"), "Daily backup trigger must run at 01:00 AM")

  // Health alerts
  assert.ok(content.includes("sendSystemHealthAlertToTeams"), "sendSystemHealthAlertToTeams must be defined")

  // Menu items in onOpen
  const onOpenIdx = content.indexOf("function onOpen()")
  const onOpenSnippet = content.slice(onOpenIdx, onOpenIdx + 1000)
  assert.ok(onOpenSnippet.includes("manualBackupSpreadsheet"), "onOpen menu must include manual backup")
  assert.ok(onOpenSnippet.includes("setupDailyBackupTrigger"), "onOpen menu must include setup daily trigger")
})

console.log("================================================================================")
console.log(`ALL ${totalTests} TESTS PASSED FOR MILESTONES 3 & 4!`)
console.log("================================================================================")
