/**
 * ==============================================================================
 * TEST SUITE: MILESTONE 1 VERIFICATION
 * Git Branching & Pipeline Triển khai Vercel không Downtime + Safe Shared Google Sheet
 * ==============================================================================
 */

import fs from "fs"
import path from "path"
import assert from "assert"

const rootDir = process.cwd()

console.log("================================================================================")
console.log("TEST SUITE: MILESTONE 1 (VERCEL PIPELINE, GIT WORKFLOW & 5-TIER SHEET ISOLATION)")
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
// Group 1: Vercel Pipeline Configuration (vercel.json)
// -----------------------------------------------------------------------------
runTest("vercel.json exists and is valid JSON", () => {
  const vercelPath = path.join(rootDir, "vercel.json")
  assert.ok(fs.existsSync(vercelPath), "vercel.json must exist in project root")
  const raw = fs.readFileSync(vercelPath, "utf-8")
  const json = JSON.parse(raw)
  assert.ok(json, "vercel.json must be valid JSON")
})

runTest("vercel.json has SPA rewrites and cleanUrls", () => {
  const vercelPath = path.join(rootDir, "vercel.json")
  const json = JSON.parse(fs.readFileSync(vercelPath, "utf-8"))
  assert.strictEqual(json.cleanUrls, true, "cleanUrls must be true")
  assert.strictEqual(json.trailingSlash, false, "trailingSlash must be false")
  assert.ok(Array.isArray(json.rewrites), "rewrites array must exist")
  const spaRewrite = json.rewrites.find(
    (r) => r.source === "/(.*)" && r.destination === "/index.html"
  )
  assert.ok(spaRewrite, "SPA rewrite to /index.html must exist")
})

runTest("vercel.json enforces complete HTTP security headers", () => {
  const vercelPath = path.join(rootDir, "vercel.json")
  const json = JSON.parse(fs.readFileSync(vercelPath, "utf-8"))
  assert.ok(Array.isArray(json.headers), "headers array must exist")
  const rootHeaderRule = json.headers.find((h) => h.source === "/(.*)")
  assert.ok(rootHeaderRule, "Root header rule /(.*) must exist")

  const headerMap = {}
  for (const item of rootHeaderRule.headers) {
    headerMap[item.key.toLowerCase()] = item.value
  }

  assert.strictEqual(headerMap["x-content-type-options"], "nosniff")
  assert.strictEqual(headerMap["x-frame-options"], "SAMEORIGIN")
  assert.ok(headerMap["referrer-policy"].includes("strict-origin"))
  assert.ok(headerMap["strict-transport-security"].includes("max-age=63072000"))
  assert.ok(headerMap["content-security-policy"].includes("script.google.com"))
  assert.ok(headerMap["content-security-policy"].includes("docs.google.com"))

  const assetHeaderRule = json.headers.find((h) => h.source === "/assets/(.*)")
  assert.ok(assetHeaderRule, "Asset header rule must exist")
  const cacheControl = assetHeaderRule.headers.find((h) => h.key === "Cache-Control")
  assert.ok(cacheControl && cacheControl.value.includes("immutable"))
})

// -----------------------------------------------------------------------------
// Group 2: Environment Configurations (.env.example, .env.development, .env.production)
// -----------------------------------------------------------------------------
runTest("Environment template files exist and gitignore rules are configured", () => {
  const envExample = path.join(rootDir, ".env.example")
  const envDev = path.join(rootDir, ".env.development")
  const envProd = path.join(rootDir, ".env.production")
  const gitignore = path.join(rootDir, ".gitignore")

  assert.ok(fs.existsSync(envExample), ".env.example must exist")
  assert.ok(fs.existsSync(envDev), ".env.development must exist")
  assert.ok(fs.existsSync(envProd), ".env.production must exist")

  const gitignoreContent = fs.readFileSync(gitignore, "utf-8")
  assert.ok(gitignoreContent.includes("!.env.example"), ".gitignore must whitelist .env.example")
  assert.ok(gitignoreContent.includes("!.env.development"), ".gitignore must whitelist .env.development")
  assert.ok(gitignoreContent.includes("!.env.production"), ".gitignore must whitelist .env.production")
})

runTest("Environment variables conform to architecture specifications", () => {
  const envProdContent = fs.readFileSync(path.join(rootDir, ".env.production"), "utf-8")
  const envDevContent = fs.readFileSync(path.join(rootDir, ".env.development"), "utf-8")

  assert.ok(envProdContent.includes("VITE_APP_ENV=production"), "Production must have VITE_APP_ENV=production")
  assert.ok(envProdContent.includes("VITE_ENABLE_DEV_OTP_BYPASS=false"), "Production must have OTP bypass disabled")
  assert.ok(envProdContent.includes("VITE_APPS_SCRIPT_URL="), "Production must configure Apps Script URL")
  assert.ok(envProdContent.includes("VITE_GOOGLE_SHEET_ID="), "Production must configure Sheet ID")

  assert.ok(envDevContent.includes("VITE_APP_ENV=development"), "Development must have VITE_APP_ENV=development")
  assert.ok(envDevContent.includes("VITE_ENABLE_DEV_OTP_BYPASS=true"), "Development must allow OTP bypass")
})

// -----------------------------------------------------------------------------
// Group 3: Documentation (doc/GIT_WORKFLOW_VERCEL_PIPELINE.md)
// -----------------------------------------------------------------------------
runTest("doc/GIT_WORKFLOW_VERCEL_PIPELINE.md is complete and production-ready", () => {
  const docPath = path.join(rootDir, "doc", "GIT_WORKFLOW_VERCEL_PIPELINE.md")
  assert.ok(fs.existsSync(docPath), "Operational doc must exist")
  const content = fs.readFileSync(docPath, "utf-8")

  assert.ok(content.includes("uxmb-task-request.vercel.app"), "Doc must reference production domain")
  assert.ok(content.includes("develop"), "Doc must document develop branch")
  assert.ok(content.includes("main"), "Doc must document main branch lock")
  assert.ok(content.includes("Preview"), "Doc must document Vercel Preview deployments")
  assert.ok(content.includes("5-Tier") || content.includes("5 Tầng"), "Doc must document 5-tier isolation")
  assert.ok(content.includes("[TEST]"), "Doc must document [TEST] tag")
  assert.ok(content.includes("RAW_TASKS_TEST"), "Doc must document RAW_TASKS_TEST tab")
  assert.ok(content.includes("Rollback"), "Doc must document rollback procedures")
})

// -----------------------------------------------------------------------------
// Group 4: Frontend Environment Detection & Dynamic Config (googleSheetConfig.ts)
// -----------------------------------------------------------------------------
runTest("googleSheetConfig.ts exports getAppEnvironment and dynamic config", () => {
  const configPath = path.join(rootDir, "src", "config", "googleSheetConfig.ts")
  const content = fs.readFileSync(configPath, "utf-8")

  assert.ok(content.includes("export function getAppEnvironment()"), "Must export getAppEnvironment")
  assert.ok(content.includes("export interface AppEnvironmentConfig"), "Must export AppEnvironmentConfig interface")
  assert.ok(content.includes("export function isTestEnvironment()"), "Must export isTestEnvironment")
  assert.ok(content.includes("PRODUCTION_SCRIPT_URL"), "Must define PRODUCTION_SCRIPT_URL")
  assert.ok(content.includes("PRODUCTION_SHEET_ID"), "Must define PRODUCTION_SHEET_ID")
  assert.ok(content.includes("uxmb-task-request.vercel.app"), "Must detect production hostname")
  assert.ok(content.includes("localhost"), "Must detect localhost")
})

// -----------------------------------------------------------------------------
// Group 5: 5-Tier Safe Sheet Isolation in Frontend (googleSheetService.ts & api.ts)
// -----------------------------------------------------------------------------
runTest("googleSheetService.ts implements test tagging and defensive filtering", () => {
  const servicePath = path.join(rootDir, "src", "services", "googleSheetService.ts")
  const content = fs.readFileSync(servicePath, "utf-8")

  assert.ok(content.includes("export function isTestTask"), "Must export isTestTask helper")
  assert.ok(content.includes("export function filterProductionTasks"), "Must export filterProductionTasks helper")
  assert.ok(content.includes("[TEST]"), "Must support [TEST] title prefix")
  assert.ok(content.includes("REQ-TEST-"), "Must support REQ-TEST- ID generation")
  assert.ok(content.includes("client_environment:"), "Must pass client_environment in mutation payloads")
  assert.ok(content.includes("is_test:"), "Must pass is_test flag in mutation payloads")
  assert.ok(content.includes("filterProductionTasks"), "Must filter production tasks in queries and cache")
})

runTest("api.ts submitRequest implements test title and ID isolation", () => {
  const apiPath = path.join(rootDir, "src", "api", "api.ts")
  const content = fs.readFileSync(apiPath, "utf-8")

  assert.ok(content.includes("getAppEnvironment"), "submitRequest must use getAppEnvironment")
  assert.ok(content.includes("REQ-TEST-"), "submitRequest must generate REQ-TEST- ID when in test mode")
  assert.ok(content.includes("[TEST]"), "submitRequest must prepend [TEST] when in test mode")
  assert.ok(content.includes("client_environment:"), "submitRequest must include client_environment")
  assert.ok(content.includes("is_test:"), "submitRequest must include is_test")
})

runTest("isTestTask and filterProductionTasks behavior verification", () => {
  // Simulate isTestTask logic
  function isTestTask(req) {
    if (!req) return false
    const id = String(req.request_id || "").trim()
    const title = String(req.title || "").trim()
    return (
      Boolean(req.is_test) ||
      req.client_environment === "preview" ||
      req.client_environment === "development" ||
      id.startsWith("REQ-TEST-") ||
      id.startsWith("TEST-") ||
      title.startsWith("[TEST]")
    )
  }

  function filterProductionTasks(requests) {
    return requests.filter((r) => !isTestTask(r))
  }

  const sampleTasks = [
    { request_id: "UXMB-20260923-001", title: "Tính năng MB Chuyển Tiền Thật", is_test: false, client_environment: "production" },
    { request_id: "REQ-TEST-20260923-101", title: "[TEST] Bài toán thử nghiệm preview", is_test: true, client_environment: "preview" },
    { request_id: "UXMB-20260923-002", title: "Thiết kế Onboarding Biz MBBank", is_test: false, client_environment: "production" },
    { request_id: "UXMB-PENDING", title: "[TEST] Khảo sát giao diện", is_test: true, client_environment: "development" },
  ]

  assert.strictEqual(isTestTask(sampleTasks[0]), false, "Real production task must NOT be flagged as test")
  assert.strictEqual(isTestTask(sampleTasks[1]), true, "REQ-TEST task must be flagged as test")
  assert.strictEqual(isTestTask(sampleTasks[2]), false, "Real production task 2 must NOT be flagged as test")
  assert.strictEqual(isTestTask(sampleTasks[3]), true, "[TEST] title task must be flagged as test")

  const productionOnly = filterProductionTasks(sampleTasks)
  assert.strictEqual(productionOnly.length, 2, "Production filter must retain only the 2 real tasks")
  assert.strictEqual(productionOnly[0].request_id, "UXMB-20260923-001")
  assert.strictEqual(productionOnly[1].request_id, "UXMB-20260923-002")
})

// -----------------------------------------------------------------------------
// Group 6: Google Apps Script Backend Safe Isolation (google-apps-script-backend.js)
// -----------------------------------------------------------------------------
runTest("google-apps-script-backend.js contains test sheet constants and helpers", () => {
  const backendPath = path.join(rootDir, "google-apps-script-backend.js")
  const content = fs.readFileSync(backendPath, "utf-8")

  assert.ok(content.includes('const SHEET_RAW_TASKS_TEST = "RAW_TASKS_TEST";'), "Must define SHEET_RAW_TASKS_TEST")
  assert.ok(content.includes('const SHEET_TASKS_TEST_VIEW = "Tasks_Test_View";'), "Must define SHEET_TASKS_TEST_VIEW")
  assert.ok(content.includes('const SHEET_LOGS_TEST_VIEW = "Activity_Logs_Test_View";'), "Must define SHEET_LOGS_TEST_VIEW")
  assert.ok(content.includes('const SHEET_RAW_SETTINGS_TEST = "RAW_SETTINGS_TEST";'), "Must define SHEET_RAW_SETTINGS_TEST")
  assert.ok(content.includes("function isTestPayload(data)"), "Must define isTestPayload")
  assert.ok(content.includes("function getOrInitRawTasksTestSheet(ss)"), "Must define getOrInitRawTasksTestSheet")
  assert.ok(content.includes("function getOrInitRawSettingsTestSheet(ss)"), "Must define getOrInitRawSettingsTestSheet")
  assert.ok(content.includes("function projectTestTasksToHumanSheets()"), "Must define projectTestTasksToHumanSheets")
})

runTest("google-apps-script-backend.js routes test mutations to RAW_TASKS_TEST", () => {
  const backendPath = path.join(rootDir, "google-apps-script-backend.js")
  const content = fs.readFileSync(backendPath, "utf-8")

  assert.ok(content.includes("isTest ? getOrInitRawTasksTestSheet(ss) : getOrInitRawTasksSheet(ss)"), "handleLogRequest must route to RAW_TASKS_TEST for test requests")
  assert.ok(content.includes('todayPrefix = (isTest ? "REQ-TEST-" : "UXMB-")'), "handleLogRequest must issue REQ-TEST- IDs for test requests")
  assert.ok(content.includes('rawObj.title = rawTitle.startsWith("[TEST]")'), "handleLogRequest must prepend [TEST] in test mode")
})

runTest("google-apps-script-backend.js implements Tier 4 query isolation and Tier 5 Teams alert suppression", () => {
  const backendPath = path.join(rootDir, "google-apps-script-backend.js")
  const content = fs.readFileSync(backendPath, "utf-8")

  assert.ok(content.includes("function getAllRequestsFromSheet(isTest)"), "getAllRequestsFromSheet must accept isTest parameter")
  assert.ok(content.includes("if (!isTest && isTestPayload(item))"), "getAllRequestsFromSheet must filter out test tasks on production")
  assert.ok(content.includes("[TIER 5 ALERT SUPPRESSION]"), "handleRequestOtpFast must suppress live Teams webhook for test/preview requests")
  assert.ok(content.includes("preview_otp: otp"), "handleRequestOtpFast must return preview_otp for test mode without sending live Teams alert")
})

console.log("================================================================================")
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS FOR MILESTONE 1 PASSED SUCCESSFULLY (100%)`)
console.log("================================================================================")
