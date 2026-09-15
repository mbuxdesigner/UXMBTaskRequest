/**
 * E2E & Unit Test Suite for Form Configuration System
 */
import assert from "assert"

// Mock localStorage
const store = new Map()
global.localStorage = {
  getItem: (key) => store.get(key) || null,
  setItem: (key, val) => store.set(key, String(val)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
}
global.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
}
global.CustomEvent = class CustomEvent {
  constructor(type, eventInitDict) {
    this.type = type
    this.detail = eventInitDict?.detail
  }
}

// Dynamically test imported formConfig module
async function runTests() {
  console.log("Starting Form Configuration Test Suite...")

  const {
    DEFAULT_FORM_CONFIG,
    DEFAULT_FORM_FIELDS,
    getFormConfig,
    saveFormConfig,
    resetFormConfig,
    FORM_CONFIG_STORAGE_KEY,
  } = await import("./src/config/formConfig.ts")

  // Test 1: Verify default config contains all 12 fields across 3 sections
  console.log("✓ Test 1: Verifying default form config structure")
  assert.strictEqual(DEFAULT_FORM_FIELDS.length, 12, "Should have 12 predefined fields")
  const sec1 = DEFAULT_FORM_FIELDS.filter((f) => f.section === "request_info")
  const sec2 = DEFAULT_FORM_FIELDS.filter((f) => f.section === "detail_desc")
  const sec3 = DEFAULT_FORM_FIELDS.filter((f) => f.section === "plan_deadline")
  assert.strictEqual(sec1.length, 4, "Section 1 should have 4 fields")
  assert.strictEqual(sec2.length, 5, "Section 2 should have 5 fields")
  assert.strictEqual(sec3.length, 3, "Section 3 should have 3 fields")

  // Test 2: Check required core fields
  console.log("✓ Test 2: Verifying core required fields")
  const titleField = DEFAULT_FORM_FIELDS.find((f) => f.key === "title")
  const productField = DEFAULT_FORM_FIELDS.find((f) => f.key === "product")
  const descField = DEFAULT_FORM_FIELDS.find((f) => f.key === "description")
  const releaseField = DEFAULT_FORM_FIELDS.find((f) => f.key === "release_date")
  assert.strictEqual(titleField.required, true, "Title must be required by default")
  assert.strictEqual(productField.required, true, "Product must be required by default")
  assert.strictEqual(descField.required, true, "Description must be required by default")
  assert.strictEqual(releaseField.required, true, "Release date must be required by default")

  // Test 3: getFormConfig returns default when empty
  console.log("✓ Test 3: getFormConfig fallback to defaults")
  localStorage.clear()
  const initial = getFormConfig()
  assert.strictEqual(initial.version, 1)
  assert.strictEqual(initial.fields.length, 12)
  assert.strictEqual(initial.options.requestTypes.length, 6)
  assert.strictEqual(initial.options.deadlineReasons.length, 6)

  // Test 4: saveFormConfig persists to localStorage
  console.log("✓ Test 4: saveFormConfig persistence and lastUpdated timestamp")
  const modified = {
    ...initial,
    header: {
      ...initial.header,
      title: "Cổng Gửi Yêu Cầu UX Chuyên Nghiệp",
    },
    fields: initial.fields.map((f) =>
      f.key === "target_user" ? { ...f, label: "Khách hàng trọng tâm", required: true } : f
    ),
  }
  saveFormConfig(modified)
  const storedRaw = localStorage.getItem(FORM_CONFIG_STORAGE_KEY)
  assert.ok(storedRaw, "Should write to localStorage")
  const loaded = getFormConfig()
  assert.strictEqual(loaded.header.title, "Cổng Gửi Yêu Cầu UX Chuyên Nghiệp")
  const loadedTargetUser = loaded.fields.find((f) => f.key === "target_user")
  assert.strictEqual(loadedTargetUser.label, "Khách hàng trọng tâm")
  assert.strictEqual(loadedTargetUser.required, true)

  // Test 5: Dynamic Option management
  console.log("✓ Test 5: Dynamic options modification (Request Types & Deadline Reasons)")
  const withNewOption = {
    ...loaded,
    options: {
      ...loaded.options,
      requestTypes: [
        ...loaded.options.requestTypes,
        { id: "opt-new", label: "Nghiên cứu UX / Usability Test", value: "UX Research Advanced", enabled: true },
      ],
    },
  }
  saveFormConfig(withNewOption)
  const loadedWithOptions = getFormConfig()
  assert.strictEqual(loadedWithOptions.options.requestTypes.length, 7)
  assert.strictEqual(loadedWithOptions.options.requestTypes[6].label, "Nghiên cứu UX / Usability Test")

  // Test 6: resetFormConfig restores MBBank default configuration
  console.log("✓ Test 6: resetFormConfig restores MBBank default configuration")
  const resetRes = resetFormConfig()
  assert.strictEqual(localStorage.getItem(FORM_CONFIG_STORAGE_KEY), null)
  assert.strictEqual(resetRes.header.title, "Gửi yêu cầu thiết kế UX")
  assert.strictEqual(resetRes.options.requestTypes.length, 6)
  const resetTargetUser = resetRes.fields.find((f) => f.key === "target_user")
  assert.strictEqual(resetTargetUser.label, "Đối tượng người dùng mục tiêu")
  assert.strictEqual(resetTargetUser.required, false)

  console.log("\nALL 6 FORM CONFIGURATION TESTS PASSED SUCCESSFULLY! ✨")
}

runTests().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
