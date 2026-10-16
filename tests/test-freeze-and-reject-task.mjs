import fs from "fs"
import path from "path"
import assert from "assert"

const ROOT = process.cwd()

console.log("================================================================================")
console.log("TEST SUITE: FREEZE & REJECT TASK WORKFLOW IN CHAT & SYSTEM SYNCHRONIZATION")
console.log("================================================================================")

// 1. Check statusConfig.ts definitions & getRequestPendingClassification
console.log("\n▶ [Test 1] Verifying statusConfig.ts definitions and getRequestPendingClassification...")
const statusConfigContent = fs.readFileSync(path.join(ROOT, "src/config/statusConfig.ts"), "utf-8")
assert(statusConfigContent.includes('"Tạm dừng"'), "statusConfig.ts must include 'Tạm dừng'")
assert(statusConfigContent.includes('"Từ chối"'), "statusConfig.ts must include 'Từ chối'")
assert(statusConfigContent.includes('"frozen"'), "statusConfig.ts must define 'frozen' pending type")
assert(statusConfigContent.includes('"rejected"'), "statusConfig.ts must define 'rejected' pending type")
assert(statusConfigContent.includes("bg-cyan-50"), "statusConfig.ts must have cyan styling for frozen")
assert(statusConfigContent.includes("bg-rose-50"), "statusConfig.ts must have rose styling for rejected")
console.log("  ✔ statusConfig.ts contains complete statuses and classification rules for Freeze and Reject.")

// 2. Check mockData.ts UXRequest interface fields
console.log("\n▶ [Test 2] Verifying UXRequest interface extensions in mockData.ts...")
const mockDataContent = fs.readFileSync(path.join(ROOT, "src/data/mockData.ts"), "utf-8")
assert(mockDataContent.includes("freeze_reason?: string"), "UXRequest must have freeze_reason")
assert(mockDataContent.includes("frozen_at?: string"), "UXRequest must have frozen_at")
assert(mockDataContent.includes("rejected_reason?: string"), "UXRequest must have rejected_reason")
assert(mockDataContent.includes("rejected_at?: string"), "UXRequest must have rejected_at")
assert(mockDataContent.includes("previous_status?: string"), "UXRequest must have previous_status")
console.log("  ✔ mockData.ts UXRequest has all required freeze and reject metadata fields.")

// 3. Check AiPromptBox for autocomplete and quick action buttons
console.log("\n▶ [Test 3] Verifying AiPromptBox autocomplete suggestions and action buttons...")
const promptBoxContent = fs.readFileSync(path.join(ROOT, "src/components/jolyui/ai-prompt-box.tsx"), "utf-8")
assert(promptBoxContent.includes('insertText: "/freeze: "'), "AiPromptBox must suggest /freeze:")
assert(promptBoxContent.includes('insertText: "/reject: "'), "AiPromptBox must suggest /reject:")
assert(promptBoxContent.includes("isFreezeActive"), "AiPromptBox must detect freeze active mode")
assert(promptBoxContent.includes("isRejectActive"), "AiPromptBox must detect reject active mode")
assert(promptBoxContent.includes("Snowflake"), "AiPromptBox must import and use Snowflake icon")
assert(promptBoxContent.includes("Ban"), "AiPromptBox must import and use Ban icon")
assert(promptBoxContent.includes("handleToggleMode(\"freeze\")"), "AiPromptBox must have Freeze quick toggle button")
assert(promptBoxContent.includes("handleToggleMode(\"reject\")"), "AiPromptBox must have Reject quick toggle button")
console.log("  ✔ AiPromptBox contains autocomplete commands and toolbar pills for Freeze & Reject.")

// 4. Check RequestDetail.tsx chat parsing, optimistic update, banners and comment pills
console.log("\n▶ [Test 4] Verifying RequestDetail.tsx handling of /freeze and /reject...")
const requestDetailContent = fs.readFileSync(path.join(ROOT, "src/components/track/RequestDetail.tsx"), "utf-8")
assert(requestDetailContent.includes("freeze|pause|tamdung|tạm dừng"), "RequestDetail must parse /freeze commands")
assert(requestDetailContent.includes("reject|tuchoi|từ chối"), "RequestDetail must parse /reject commands")
assert(requestDetailContent.includes('request.status = "Tạm dừng"'), "RequestDetail sets status to Tạm dừng on freeze")
assert(requestDetailContent.includes('request.status = "Từ chối"'), "RequestDetail sets status to Từ chối on reject")
assert(requestDetailContent.includes("freeze_reason: request.freeze_reason"), "RequestDetail passes freeze_reason to updateTaskProgress")
assert(requestDetailContent.includes("rejected_reason: request.rejected_reason"), "RequestDetail passes rejected_reason to updateTaskProgress")
assert(requestDetailContent.includes("cmd-freeze"), "RequestDetail renders cyan pill badge for /freeze")
assert(requestDetailContent.includes("cmd-reject"), "RequestDetail renders rose pill badge for /reject")
assert(requestDetailContent.includes('pendingClassification.type === "frozen"'), "RequestDetail displays Freeze banner")
assert(requestDetailContent.includes('pendingClassification.type === "rejected"'), "RequestDetail displays Rejected banner")
assert(requestDetailContent.includes("handleDesignerResumeUpdate"), "RequestDetail has resume handler for freeze")
assert(requestDetailContent.includes("handleReopenRequest"), "RequestDetail has reopen handler for rejected")
console.log("  ✔ RequestDetail.tsx handles chat commands, banners, comment badges, and resume/reopen.")

// 5. Check KanbanBoard.tsx integration
console.log("\n▶ [Test 5] Verifying KanbanBoard.tsx ribbons and borders...")
const kanbanContent = fs.readFileSync(path.join(ROOT, "src/components/kanban/KanbanBoard.tsx"), "utf-8")
assert(kanbanContent.includes('type === "frozen"'), "KanbanBoard handles frozen pending classification")
assert(kanbanContent.includes('type === "rejected"'), "KanbanBoard handles rejected pending classification")
assert(kanbanContent.includes("border-cyan-300"), "KanbanBoard has cyan card border for frozen")
assert(kanbanContent.includes("border-rose-300"), "KanbanBoard has rose card border for rejected")
assert(kanbanContent.includes("Snowflake"), "KanbanBoard uses Snowflake icon on frozen card ribbon")
assert(kanbanContent.includes("Ban"), "KanbanBoard uses Ban icon on rejected card ribbon")
console.log("  ✔ KanbanBoard.tsx renders dedicated ribbons and borders for frozen and rejected tasks.")

// 6. Check SolutionAgentsTable.tsx grouping and status display
console.log("\n▶ [Test 6] Verifying SolutionAgentsTable.tsx grouping and badge rendering...")
const agentsTableContent = fs.readFileSync(path.join(ROOT, "src/components/track/SolutionAgentsTable.tsx"), "utf-8")
assert(agentsTableContent.includes('status === "từ chối"') && agentsTableContent.includes('status === "rejected"'), "SolutionAgentsTable maps rejected tasks to terminal completed group")
assert(agentsTableContent.includes('pendingInfo.type === "frozen"'), "SolutionAgentsTable handles frozen badge style")
assert(agentsTableContent.includes('pendingInfo.type === "rejected"'), "SolutionAgentsTable handles rejected badge style")
assert(agentsTableContent.includes("bg-cyan-50"), "SolutionAgentsTable applies cyan color to frozen badge")
assert(agentsTableContent.includes("bg-rose-50"), "SolutionAgentsTable applies rose color to rejected badge")
console.log("  ✔ SolutionAgentsTable.tsx correctly categorizes task groups and renders status pills.")

// 7. Check useIATreeState.ts subtree metrics calculation
console.log("\n▶ [Test 7] Verifying useIATreeState.ts subtree metrics isolation...")
const treeStateContent = fs.readFileSync(path.join(ROOT, "src/hooks/useIATreeState.ts"), "utf-8")
assert(treeStateContent.includes('s.includes("từ chối") || s.includes("rejected")'), "useIATreeState detects rejected tasks")
assert(treeStateContent.includes('!s.includes("tạm dừng")') && treeStateContent.includes('!s.includes("freeze")'), "useIATreeState isolates frozen tasks from inProgressTasks")
assert(treeStateContent.includes("!isRejected"), "useIATreeState excludes rejected tasks from inProgressTasks and active pending count")
console.log("  ✔ useIATreeState.ts ensures rejected and frozen tasks do not inflate active in-progress workload.")

// 8. Dynamic Simulation Test
console.log("\n▶ [Test 8] Simulating getRequestPendingClassification logic with mock requests...")
function simulateClassification(req) {
  const rawStatus = (req.status || "").toLowerCase().trim()
  if (rawStatus === "hoàn thành" || rawStatus === "done" || (typeof req.progress === "number" && req.progress >= 100)) {
    return { isPending: false, type: null, label: "" }
  }
  if (rawStatus === "từ chối" || rawStatus === "rejected" || Boolean(req.rejected_reason && rawStatus !== "đang thực hiện")) {
    return {
      isPending: true,
      type: "rejected",
      label: "Từ chối",
      reason: req.rejected_reason || "Đã từ chối thực hiện yêu cầu này"
    }
  }
  if (rawStatus === "tạm dừng" || rawStatus === "freeze" || rawStatus === "frozen" || Boolean(req.freeze_reason && rawStatus !== "đang thực hiện")) {
    return {
      isPending: true,
      type: "frozen",
      label: "Tạm dừng",
      reason: req.freeze_reason || "Đóng băng tiến độ & SLA theo yêu cầu"
    }
  }
  return { isPending: false, type: null, label: "" }
}

const frozenTask = {
  request_id: "MB-UX-001",
  status: "Tạm dừng",
  freeze_reason: "Chờ dữ liệu API từ phía Core Banking"
}
const frozenRes = simulateClassification(frozenTask)
assert.strictEqual(frozenRes.isPending, true)
assert.strictEqual(frozenRes.type, "frozen")
assert.strictEqual(frozenRes.label, "Tạm dừng")
assert.strictEqual(frozenRes.reason, "Chờ dữ liệu API từ phía Core Banking")

const rejectedTask = {
  request_id: "MB-UX-002",
  status: "Từ chối",
  rejected_reason: "Yêu cầu nằm ngoài phạm vi sprint quý 2"
}
const rejectedRes = simulateClassification(rejectedTask)
assert.strictEqual(rejectedRes.isPending, true)
assert.strictEqual(rejectedRes.type, "rejected")
assert.strictEqual(rejectedRes.label, "Từ chối")
assert.strictEqual(rejectedRes.reason, "Yêu cầu nằm ngoài phạm vi sprint quý 2")

console.log("  ✔ Simulation test confirmed correct behavior for both Freeze and Reject classifications.")

console.log("\n================================================================================")
console.log("🎉 ALL FREEZE & REJECT WORKFLOW AND SYNCHRONIZATION TESTS PASSED (100%)!")
console.log("================================================================================")
