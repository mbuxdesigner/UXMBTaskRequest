/**
 * Automated Test Suite for MBBank UX Portal - Dynamic System Configuration System
 * 
 * Verifies:
 * 1. Default system configuration completeness across all 8 modules.
 * 2. Real-time persistence and event broadcasting.
 * 3. Dynamic PO Pending classification with variable timeout (12h, 24h, 48h).
 * 4. Dynamic KPI Capacity calculation with custom benchmarks.
 * 5. Dynamic SLA Cycle Time thresholds and badge variants.
 * 6. Dynamic Notification Templates formatting with custom placeholders.
 * 7. Safe JSON export, import, and reset to defaults.
 */
import assert from "assert"

// Mock browser environment
const storageStore = new Map()
global.localStorage = {
  getItem: (key) => storageStore.get(key) || null,
  setItem: (key, val) => storageStore.set(key, String(val)),
  removeItem: (key) => storageStore.delete(key),
  clear: () => storageStore.clear(),
}

const eventListeners = new Map()
global.window = {
  dispatchEvent: (event) => {
    const listeners = eventListeners.get(event.type) || []
    listeners.forEach((fn) => fn(event))
    return true
  },
  addEventListener: (type, fn) => {
    const list = eventListeners.get(type) || []
    list.push(fn)
    eventListeners.set(type, list)
  },
  removeEventListener: (type, fn) => {
    const list = eventListeners.get(type) || []
    eventListeners.set(
      type,
      list.filter((l) => l !== fn)
    )
  },
  localStorage: global.localStorage,
}

global.CustomEvent = class CustomEvent {
  constructor(type, eventInitDict) {
    this.type = type
    this.detail = eventInitDict?.detail
  }
}

async function runTestSuite() {
  console.log("================================================================")
  console.log("  RUNNING ADMIN SYSTEM CONFIGURATION 100-POINT VERIFICATION   ")
  console.log("================================================================")

  // 1. Import modules
  const {
    getSystemConfig,
    saveSystemConfig,
    resetSystemConfig,
    exportSystemConfigJson,
    importSystemConfigJson,
    DEFAULT_SYSTEM_CONFIG,
    DEFAULT_PRIORITY_LEVELS,
    DEFAULT_NOTIFICATION_SETTINGS,
    SYSTEM_CONFIG_STORAGE_KEY,
    SYSTEM_CONFIG_EVENT_NAME,
  } = await import("./src/config/systemConfig.ts")

  const { getRequestPendingClassification } = await import("./src/config/statusConfig.ts")
  const { calculateWorkloadCapacity, calculateCycleTime } = await import("./src/components/dashboard/ai-ops/kpiMetrics.ts")
  const { formatNotificationFromTemplate, getResolvedNotificationTemplate } = await import("./src/config/notificationTemplates.ts")

  // --- TEST 1: Default Structure ---
  console.log("✓ Test 1: Verifying default SystemConfig completeness")
  localStorage.clear()
  const cfg = getSystemConfig()
  assert.strictEqual(cfg.version, "1.0.0", "Version should be 1.0.0")
  assert.ok(cfg.sla, "sla section must exist")
  assert.strictEqual(cfg.sla.poPendingTimeoutHours, 24, "Default PO pending timeout must be 24h")
  assert.strictEqual(cfg.sla.targetCycleDays, 5.0, "Default target cycle must be 5.0 days")
  assert.strictEqual(cfg.sla.fastCycleDays, 3.5, "Default fast cycle must be 3.5 days")
  assert.strictEqual(cfg.sla.slaWarningPercent, 80, "Default SLA warning must be 80%")
  assert.strictEqual(cfg.capacity.defaultDesignerCapacity, 2, "Default designer capacity must be 2")
  assert.strictEqual(cfg.capacity.workloadHighThreshold, 2.0, "Default high load must be 2.0")
  assert.strictEqual(cfg.capacity.workloadOverloadThreshold, 2.8, "Default overload must be 2.8")
  assert.strictEqual(cfg.priorities.length, 4, "Must have 4 priority tiers (Lv1-Lv4)")
  assert.ok(Object.keys(cfg.notifications).length >= 14, "Must have at least 14 notification templates")
  assert.strictEqual(cfg.evaluation.qualityWeight + cfg.evaluation.slaComplianceWeight + cfg.evaluation.ftrWeight + cfg.evaluation.designSystemWeight, 100, "Evaluation weights must sum to 100")
  assert.strictEqual(cfg.assessment.passingScorePercent, 70, "Passing score should be 70%")

  // --- TEST 2: Save & Event Dispatching ---
  console.log("✓ Test 2: Verifying saveSystemConfig persistence and reactive event dispatch")
  let eventFired = false
  let eventDetail = null
  window.addEventListener(SYSTEM_CONFIG_EVENT_NAME, (e) => {
    eventFired = true
    eventDetail = e.detail
  })

  saveSystemConfig({
    sla: {
      ...cfg.sla,
      poPendingTimeoutHours: 12,
    },
  })

  assert.strictEqual(eventFired, true, "Event mbbank_system_config_changed must be dispatched")
  assert.strictEqual(eventDetail.sla.poPendingTimeoutHours, 12, "Event detail must reflect new timeout")
  const readAfterSave = getSystemConfig()
  assert.strictEqual(readAfterSave.sla.poPendingTimeoutHours, 12, "Storage must persist new timeout")

  // --- TEST 3: Dynamic PO Pending Classification ---
  console.log("✓ Test 3: Verifying dynamic PO Pending timeout in statusConfig.ts")
  const now = Date.now()
  // Task sent 18 hours ago
  const taskSent18hAgo = {
    id: "task-test-po",
    status: "Đã gửi PO",
    sent_to_po_at: new Date(now - 18 * 3600 * 1000).toLocaleString("vi-VN"),
  }

  // With timeout = 12h: 18h > 12h -> must be PO Pending!
  saveSystemConfig({ sla: { ...cfg.sla, poPendingTimeoutHours: 12 } })
  const result12h = getRequestPendingClassification(taskSent18hAgo)
  assert.strictEqual(result12h.isPending, true, "Task sent 18h ago must be pending when timeout is 12h")
  assert.strictEqual(result12h.type, "po_pending")
  assert.ok(result12h.reason.includes("12h"), "Reason must mention 12h")

  // With timeout = 24h: 18h < 24h -> must NOT be PO Pending yet!
  saveSystemConfig({ sla: { ...cfg.sla, poPendingTimeoutHours: 24 } })
  const result24h = getRequestPendingClassification(taskSent18hAgo)
  assert.strictEqual(result24h.isPending, false, "Task sent 18h ago must NOT be pending when timeout is 24h")

  // Task sent 30 hours ago: 30h > 24h -> must be PO Pending!
  const taskSent30hAgo = {
    id: "task-test-30h",
    status: "Đã gửi PO",
    sent_to_po_at: new Date(now - 30 * 3600 * 1000).toLocaleString("vi-VN"),
  }
  const result30h = getRequestPendingClassification(taskSent30hAgo)
  assert.strictEqual(result30h.isPending, true, "Task sent 30h ago must be pending when timeout is 24h")
  assert.ok(result30h.reason.includes("24h"), "Reason must mention 24h")

  // With timeout = 48h: 30h < 48h -> must NOT be PO Pending yet!
  saveSystemConfig({ sla: { ...cfg.sla, poPendingTimeoutHours: 48 } })
  const result48h = getRequestPendingClassification(taskSent30hAgo)
  assert.strictEqual(result48h.isPending, false, "Task sent 30h ago must NOT be pending when timeout is 48h")

  // --- TEST 4: Dynamic KPI Capacity Benchmark ---
  console.log("✓ Test 4: Verifying dynamic capacity calculation in kpiMetrics.ts")
  const mockTasks = [
    { id: "t-1", status: "UI Design", assigned_designer: "Nguyễn Văn Cường" },
    { id: "t-2", status: "Wireframe", assigned_designer: "Nguyễn Văn Cường" },
    { id: "t-3", status: "User Flow", assigned_designer: "Nguyễn Văn Cường" },
    { id: "t-4", status: "Discovery", assigned_designer: "Trần Mai Lan" },
  ]
  // 4 tasks, 2 active designers -> workloadRatio = 2.0
  // With benchmark = 2: capacityPercent = 4 / (2 * 2) * 100 = 100%
  saveSystemConfig({
    capacity: {
      defaultDesignerCapacity: 2,
      workloadHighThreshold: 2.0,
      workloadOverloadThreshold: 2.8,
      defaultSquadCapacity: 6,
      overloadNotificationEnabled: true,
    },
  })
  const cap2 = calculateWorkloadCapacity(mockTasks)
  assert.strictEqual(cap2.workloadRatio, 2.0)
  assert.strictEqual(cap2.capacityPercent, 100)
  assert.strictEqual(cap2.badgeText, "Cân bằng")

  // Now change benchmark to 4 task/person:
  // capacityPercent should become 4 / (2 * 4) * 100 = 50%
  saveSystemConfig({
    capacity: {
      ...cfg.capacity,
      defaultDesignerCapacity: 4,
    },
  })
  const cap4 = calculateWorkloadCapacity(mockTasks)
  assert.strictEqual(cap4.capacityPercent, 50, "Capacity percent should be 50% with 4 task benchmark")

  // Now test overload threshold adjustment:
  // With 2.0 workloadRatio, if highThreshold is set to 1.5, ratio 2.0 becomes "Tải cao"
  saveSystemConfig({
    capacity: {
      ...cfg.capacity,
      defaultDesignerCapacity: 2,
      workloadHighThreshold: 1.5,
      workloadOverloadThreshold: 1.9,
    },
  })
  const capOverload = calculateWorkloadCapacity(mockTasks)
  assert.strictEqual(capOverload.badgeText, "Quá tải", "Ratio 2.0 must be Overloaded when threshold is 1.9")

  // --- TEST 5: Dynamic SLA Cycle Time ---
  console.log("✓ Test 5: Verifying dynamic Cycle Time calculation in kpiMetrics.ts")
  const mockCompleted = [
    {
      id: "comp-1",
      status: "Hoàn thành",
      submitted_at: new Date(now - 6 * 86400 * 1000).toISOString(),
      release_date: new Date(now).toISOString(), // cycle = 6 days
    },
  ]
  // Default target = 5.0 days -> 6 days > 5.0 days -> "Cần cải thiện"
  saveSystemConfig({
    sla: {
      ...cfg.sla,
      targetCycleDays: 5.0,
      fastCycleDays: 3.5,
    },
  })
  const cycle5 = calculateCycleTime(mockCompleted, now)
  assert.strictEqual(cycle5.avgCycleTime, 6.0)
  assert.strictEqual(cycle5.targetCycleTime, 5.0)
  assert.strictEqual(cycle5.badgeText, "Cần cải thiện")

  // Now change target cycle time to 7.0 days in admin setting:
  // 6.0 days <= 7.0 days -> becomes "Đạt chuẩn SLA"!
  saveSystemConfig({
    sla: {
      ...cfg.sla,
      targetCycleDays: 7.0,
      fastCycleDays: 3.5,
    },
  })
  const cycle7 = calculateCycleTime(mockCompleted, now)
  assert.strictEqual(cycle7.targetCycleTime, 7.0)
  assert.strictEqual(cycle7.badgeText, "Đạt chuẩn SLA", "6.0 days must be within 7.0 days target")

  // --- TEST 6: Dynamic Notification Templates ---
  console.log("✓ Test 6: Verifying dynamic notification template customization & placeholder substitution")
  saveSystemConfig({
    notifications: {
      ...cfg.notifications,
      task_created: {
        ...cfg.notifications.task_created,
        titleTemplate: "[MBBank UX] Đề bài mới: {requestId}",
        messageTemplate: "Kính gửi {ownerName}, PO {actorName} đã chuyển giao bài toán [{taskTitle}] ({squadName}).",
      },
    },
  })

  const customTpl = getResolvedNotificationTemplate("task_created")
  assert.strictEqual(customTpl.titleTemplate, "[MBBank UX] Đề bài mới: {requestId}")

  const formatted = formatNotificationFromTemplate("task_created", {
    requestId: "REQ-9999",
    taskTitle: "Mở Thẻ Tín Dụng Online",
    actorName: "Lê Hoàng Nam",
    ownerName: "Nguyễn Văn Cường",
    squadName: "Card Squad",
  })
  assert.strictEqual(formatted.title, "[MBBank UX] Đề bài mới: REQ-9999")
  assert.strictEqual(
    formatted.message,
    "Kính gửi Nguyễn Văn Cường, PO Lê Hoàng Nam đã chuyển giao bài toán [Mở Thẻ Tín Dụng Online] (Card Squad)."
  )

  // --- TEST 7: Export, Import & Reset ---
  console.log("✓ Test 7: Verifying JSON export, import, and reset to defaults")
  const exported = exportSystemConfigJson()
  assert.ok(exported.includes("REQ-9999") || exported.includes("[MBBank UX]"), "Export must contain customized config")

  // Reset to default
  const resetRes = resetSystemConfig("Auditor")
  assert.strictEqual(resetRes.sla.poPendingTimeoutHours, 24, "Reset must restore 24h")
  assert.strictEqual(resetRes.sla.targetCycleDays, 5.0, "Reset must restore 5.0 days")

  // Re-import
  const importRes = importSystemConfigJson(exported, "Auditor")
  assert.strictEqual(importRes.success, true, "Import must succeed")
  const afterImport = getSystemConfig()
  assert.strictEqual(afterImport.notifications.task_created.titleTemplate, "[MBBank UX] Đề bài mới: {requestId}")

  // --- TEST 8: Priority Matrix Configuration & Lv1-Lv5 ---
  console.log("✓ Test 8: Verifying Priority Matrix configuration & Lv1-Lv5 custom parameters")
  assert.strictEqual(cfg.priorities.length, 4, "Default priority count is 4")
  const customPriorities = [
    ...cfg.priorities,
    {
      level: "lv5",
      label: "Lv5 - Khẩn cấp đặc biệt",
      description: "Sự cố Production nghiêm trọng",
      badgeColor: "rose",
      targetTurnaroundDays: 0.5,
      weightScore: 10,
    },
  ]
  saveSystemConfig({ priorities: customPriorities })
  const updatedCfg = getSystemConfig()
  assert.strictEqual(updatedCfg.priorities.length, 5, "Must support adding Lv5 priority tier")
  assert.strictEqual(updatedCfg.priorities[4].level, "lv5")
  assert.strictEqual(updatedCfg.priorities[4].targetTurnaroundDays, 0.5)

  // --- TEST 9: Global Emergency Announcement Banner ---
  console.log("✓ Test 9: Verifying Global Emergency Announcement Banner configuration & toggle")
  saveSystemConfig({
    portal: {
      ...cfg.portal,
      announcement: {
        enabled: true,
        type: "warning",
        message: "Hệ thống MBBank bảo trì cổng Core Banking từ 23:00 - 02:00 ngày 25/09",
        linkUrl: "https://mbbank.com.vn/announcements",
        linkText: "Lịch bảo trì",
        dismissible: true,
      },
    },
  })
  const bannerCfg = getSystemConfig().portal.announcement
  assert.strictEqual(bannerCfg.enabled, true)
  assert.strictEqual(bannerCfg.type, "warning")
  assert.ok(bannerCfg.message.includes("bảo trì cổng Core Banking"))
  assert.strictEqual(bannerCfg.linkText, "Lịch bảo trì")

  // --- TEST 10: Evaluation Weights & Assessment Exam Settings ---
  console.log("✓ Test 10: Verifying Evaluation Weights & Assessment Exam configuration")
  saveSystemConfig({
    evaluation: {
      qualityWeight: 40,
      slaComplianceWeight: 25,
      ftrWeight: 20,
      designSystemWeight: 15,
    },
    assessment: {
      passingScorePercent: 80,
      durationMinutes: 45,
      maxAttempts: 2,
      questionCount: 30,
    },
  })
  const evalCfg = getSystemConfig()
  assert.strictEqual(
    evalCfg.evaluation.qualityWeight +
      evalCfg.evaluation.slaComplianceWeight +
      evalCfg.evaluation.ftrWeight +
      evalCfg.evaluation.designSystemWeight,
    100,
    "Custom evaluation weights must sum to 100%"
  )
  assert.strictEqual(evalCfg.assessment.passingScorePercent, 80)
  assert.strictEqual(evalCfg.assessment.durationMinutes, 45)
  assert.strictEqual(evalCfg.assessment.maxAttempts, 2)
  assert.strictEqual(evalCfg.assessment.questionCount, 30)

  // --- TEST 11: Attachment Rules & Security Constraints ---
  console.log("✓ Test 11: Verifying Attachment rules & security constraints")
  saveSystemConfig({
    attachments: {
      maxFileSizeMb: 50,
      allowedExtensions: [".png", ".jpg", ".pdf", ".fig", ".zip", ".xlsx"],
      requireFigmaLink: true,
    },
  })
  const attachCfg = getSystemConfig().attachments
  assert.strictEqual(attachCfg.maxFileSizeMb, 50)
  assert.strictEqual(attachCfg.requireFigmaLink, true)
  assert.ok(attachCfg.allowedExtensions.includes(".fig"))

  // Final reset to clean MBBank defaults
  resetSystemConfig("Finalizer")

  console.log("================================================================")
  console.log("  ALL 11 TESTS PASSED SUCCESSFULLY (100/100 SCORE ACHIEVED) ✨ ")
  console.log("================================================================")
}

runTestSuite().catch((err) => {
  console.error("❌ Test Suite Failed:", err)
  process.exit(1)
})
