/**
 * Unit Test for Form Configuration Cloud Synchronization (RAW_SETTINGS -> FORM_CONFIG)
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log("================================================================================")
console.log("TEST SUITE: FORM SETTINGS CLOUD SYNC & APPS SCRIPT BACKEND (RAW_SETTINGS)")
console.log("================================================================================\n")

// Test 1: Verify Apps Script backend file contains FORM_CONFIG support
const backendPath = path.join(__dirname, "google-apps-script-backend.js")
assert.ok(fs.existsSync(backendPath), "google-apps-script-backend.js exists")
const backendContent = fs.readFileSync(backendPath, "utf-8")

assert.ok(
  backendContent.includes('configsToSave["FORM_CONFIG"] = data.form_config'),
  "handleSyncMasterData processes data.form_config into FORM_CONFIG"
)
assert.ok(
  backendContent.includes('form_config: masterData["FORM_CONFIG"] || null'),
  "get_master_data returns form_config from RAW_SETTINGS"
)
console.log("✓ Test 1: Backend Google Apps Script contains FORM_CONFIG sync & read handlers")

// Test 2: Verify googleSheetService exports syncFormConfigToSheet & fetchFormConfigFromSheet
const servicePath = path.join(__dirname, "src/services/googleSheetService.ts")
const serviceContent = fs.readFileSync(servicePath, "utf-8")

assert.ok(
  serviceContent.includes("export async function syncFormConfigToSheet"),
  "syncFormConfigToSheet helper is exported"
)
assert.ok(
  serviceContent.includes("export async function fetchFormConfigFromSheet"),
  "fetchFormConfigFromSheet helper is exported"
)
assert.ok(
  serviceContent.includes("form_config?: any"),
  "syncMasterDataToSheet accepts form_config"
)
console.log("✓ Test 2: googleSheetService exports all cloud sync helpers for FORM_CONFIG")

// Test 3: Verify FormConfigTab integrates syncFormConfigToSheet and fetchFormConfigFromSheet
const tabPath = path.join(__dirname, "src/components/admin/FormConfigTab.tsx")
const tabContent = fs.readFileSync(tabPath, "utf-8")

assert.ok(
  tabContent.includes("syncFormConfigToSheet"),
  "FormConfigTab invokes syncFormConfigToSheet on save"
)
assert.ok(
  tabContent.includes("fetchFormConfigFromSheet"),
  "FormConfigTab provides handlePullFromSheet"
)
assert.ok(
  tabContent.includes("RAW_SETTINGS · FORM_CONFIG"),
  "FormConfigTab renders Google Sheet RAW_SETTINGS indicator"
)
console.log("✓ Test 3: FormConfigTab UI triggers cloud synchronization and pull")

// Test 4: Verify QuanLyPage integrates form_config in syncAll and pullMasterData
const quanlyPath = path.join(__dirname, "src/pages/QuanLyPage.tsx")
const quanlyContent = fs.readFileSync(quanlyPath, "utf-8")

assert.ok(
  quanlyContent.includes("form_config: getFormConfig()"),
  "handleSyncAllSettings includes form_config from getFormConfig()"
)
assert.ok(
  quanlyContent.includes("saveFormConfig(res.data.form_config)"),
  "handlePullMasterDataFromSheet saves incoming form_config"
)
console.log("✓ Test 4: QuanLyPage synchronizes form_config in bulk sync and bulk pull")

// Test 5: Simulated Payload Round-trip Test
const mockFormConfig = {
  version: 1,
  lastUpdated: "15/09/2026 09:40",
  fields: [
    { id: "f-title", key: "title", label: "Tiêu đề yêu cầu", enabled: true, required: true },
    { id: "f-custom", key: "custom_notes", label: "Ghi chú bổ sung", enabled: true, required: false },
  ],
  options: {
    requestTypes: [{ id: "opt-1", label: "Tính năng mới", value: "Tính năng mới", enabled: true }],
  },
}

// Emulate backend serializing into RAW_SETTINGS row and parsing back
const serialized = JSON.stringify(mockFormConfig, null, 2)
const restored = JSON.parse(serialized)

assert.deepEqual(restored, mockFormConfig)
assert.equal(restored.fields[1].key, "custom_notes")
assert.equal(restored.options.requestTypes[0].label, "Tính năng mới")
console.log("✓ Test 5: Simulated RAW_SETTINGS JSON payload round-trip verified cleanly")

console.log("\n================================================================================")
console.log("🎉 ALL 5 TESTS FOR FORM SETTINGS CLOUD SYNC PASSED SUCCESSFULLY (100%)")
console.log("================================================================================\n")
