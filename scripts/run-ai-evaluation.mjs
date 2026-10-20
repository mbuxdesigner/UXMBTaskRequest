import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  assessTaskHealth,
  buildDeterministicAggregateAnswer,
  buildDeterministicTaskHealthAnswer,
  groundAIResponse,
  resolveAggregateTaskQuery,
  resolveTaskReference,
} from "../src/lib/aiConversation.ts"
import { createQueryPlan, executeQueryPlan } from "../src/lib/aiRetrievalPipeline.ts"

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const fixturePath = path.join(rootDir, "tests", "fixtures", "ai-evaluation-cases.json")
const reportDir = path.join(rootDir, "scratch", "ai-evaluation")
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"))
const evaluationNow = new Date(fixture.evaluationNow)

function sorted(values = []) {
  return [...values].map(String).sort((left, right) => left.localeCompare(right))
}

function sameSet(actual = [], expected = []) {
  return JSON.stringify(sorted(actual)) === JSON.stringify(sorted(expected))
}

function includesEvery(content, expected = []) {
  return expected.filter((value) => !content.includes(value))
}

function includesNone(content, forbidden = []) {
  return forbidden.filter((value) => content.includes(value))
}

function scopedTasks(taskIds = fixture.tasks.map((task) => task.request_id)) {
  const allowed = new Set(taskIds)
  return fixture.tasks.filter((task) => allowed.has(task.request_id))
}

function check(condition, message, failures) {
  if (!condition) failures.push(message)
}

function evaluateTaskResolution(testCase) {
  const failures = []
  const tasks = scopedTasks(testCase.accessibleTaskIds)
  const result = resolveTaskReference(
    testCase.query,
    tasks,
    testCase.previousTaskId,
    testCase.pendingTaskIds || []
  )
  const actualTaskId = result.task?.request_id || null
  const candidateIds = result.candidates.map((task) => task.request_id)

  if (Object.hasOwn(testCase.expected, "taskId")) {
    check(actualTaskId === testCase.expected.taskId, `taskId: expected ${testCase.expected.taskId}, received ${actualTaskId}`, failures)
  }
  if (testCase.expected.method) {
    check(result.method === testCase.expected.method, `method: expected ${testCase.expected.method}, received ${result.method}`, failures)
  }
  if (Object.hasOwn(testCase.expected, "isFollowUp")) {
    check(result.isFollowUp === testCase.expected.isFollowUp, `isFollowUp mismatch`, failures)
  }
  if (testCase.expected.requiresClarification) {
    check(result.task === null && result.candidates.length > 1, "expected an ambiguous result with multiple candidates", failures)
  }
  if (testCase.expected.candidateTaskIds) {
    check(sameSet(candidateIds, testCase.expected.candidateTaskIds), `candidateTaskIds: expected ${sorted(testCase.expected.candidateTaskIds)}, received ${sorted(candidateIds)}`, failures)
  }
  for (const forbiddenId of testCase.expected.forbiddenTaskIds || []) {
    check(actualTaskId !== forbiddenId && !candidateIds.includes(forbiddenId), `forbidden task leaked: ${forbiddenId}`, failures)
  }
  return { failures, actual: { taskId: actualTaskId, candidateTaskIds: candidateIds, method: result.method, confidence: result.confidence } }
}

function evaluateAggregate(testCase) {
  const failures = []
  const tasks = scopedTasks(testCase.accessibleTaskIds)
  const result = resolveAggregateTaskQuery(testCase.query, tasks)
  const taskIds = result.tasks.map((task) => task.request_id)
  const answer = buildDeterministicAggregateAnswer(result, tasks.length, evaluationNow)
  const answerTaskIds = taskIds.filter((taskId) => answer.includes(`[${taskId}]`))

  check(result.mode === testCase.expected.mode, `mode: expected ${testCase.expected.mode}, received ${result.mode}`, failures)
  check(result.operation === testCase.expected.operation, `operation: expected ${testCase.expected.operation}, received ${result.operation}`, failures)
  if (testCase.expected.taskIds) {
    check(sameSet(taskIds, testCase.expected.taskIds), `taskIds: expected ${sorted(testCase.expected.taskIds)}, received ${sorted(taskIds)}`, failures)
  }
  const missing = includesEvery(answer, testCase.expected.answerContains)
  const leaked = includesNone(answer, testCase.expected.answerExcludes)
  check(missing.length === 0, `answer missing: ${missing.join(", ")}`, failures)
  check(leaked.length === 0, `answer contained forbidden values: ${leaked.join(", ")}`, failures)
  return { failures, actual: { mode: result.mode, operation: result.operation, taskIds, answerTaskIds, answer } }
}

function evaluateAggregateFollowUp(testCase) {
  const failures = []
  const tasks = scopedTasks(testCase.accessibleTaskIds)
  const first = resolveAggregateTaskQuery(testCase.firstQuery, tasks)
  const firstAnswer = buildDeterministicAggregateAnswer(first, tasks.length, evaluationNow)
  const followUp = resolveAggregateTaskQuery(testCase.query, tasks, [], first.scope)
  const followUpAnswer = buildDeterministicAggregateAnswer(followUp, tasks.length, evaluationNow)
  const firstTaskIds = first.tasks.map((task) => task.request_id)
  const followUpTaskIds = followUp.tasks.map((task) => task.request_id)

  check(sameSet(firstTaskIds, testCase.expected.firstTaskIds), `firstTaskIds: expected ${sorted(testCase.expected.firstTaskIds)}, received ${sorted(firstTaskIds)}`, failures)
  check(sameSet(followUpTaskIds, testCase.expected.followUpTaskIds), `followUpTaskIds: expected ${sorted(testCase.expected.followUpTaskIds)}, received ${sorted(followUpTaskIds)}`, failures)
  const missingFirst = includesEvery(firstAnswer, testCase.expected.firstAnswerContains)
  const missingFollowUp = includesEvery(followUpAnswer, testCase.expected.followUpAnswerContains)
  const leakedFollowUp = includesNone(followUpAnswer.toLowerCase(), (testCase.expected.followUpAnswerExcludes || []).map((value) => value.toLowerCase()))
  check(missingFirst.length === 0, `first answer missing: ${missingFirst.join(", ")}`, failures)
  check(missingFollowUp.length === 0, `follow-up answer missing: ${missingFollowUp.join(", ")}`, failures)
  check(leakedFollowUp.length === 0, `follow-up answer contained forbidden values: ${leakedFollowUp.join(", ")}`, failures)
  check(first.scope?.field === "assignee" && followUp.scope?.field === "assignee", "assignee scope was not preserved", failures)
  return {
    failures,
    actual: {
      firstTaskIds,
      followUpTaskIds,
      scope: followUp.scope?.label,
      firstAnswer,
      followUpAnswer,
    },
  }
}

function evaluateHealth(testCase) {
  const failures = []
  const task = fixture.tasks.find((item) => item.request_id === testCase.taskId)
  check(Boolean(task), `fixture task not found: ${testCase.taskId}`, failures)
  if (!task) return { failures, actual: {} }

  const health = assessTaskHealth(task, evaluationNow)
  const answer = buildDeterministicTaskHealthAnswer(testCase.query, task, evaluationNow)
  check(health.level === testCase.expected.level, `level: expected ${testCase.expected.level}, received ${health.level}`, failures)
  if (Object.hasOwn(testCase.expected, "daysToDeadline")) {
    check(health.daysToDeadline === testCase.expected.daysToDeadline, `daysToDeadline: expected ${testCase.expected.daysToDeadline}, received ${health.daysToDeadline}`, failures)
  }
  const missing = includesEvery(answer, testCase.expected.answerContains)
  check(missing.length === 0, `answer missing: ${missing.join(", ")}`, failures)
  return { failures, actual: { ...health, answer } }
}

function evaluateGrounding(testCase) {
  const failures = []
  const result = groundAIResponse(testCase.content, {
    taskIds: testCase.allowedTaskIds,
    documentNames: testCase.documentNames,
  })
  check(sameSet(result.unknownTaskReferences, testCase.expected.rejectedTaskIds), `rejectedTaskIds mismatch`, failures)
  const missing = includesEvery(result.content, testCase.expected.answerContains)
  const leaked = includesNone(result.content, testCase.expected.answerExcludes)
  check(missing.length === 0, `grounded answer missing: ${missing.join(", ")}`, failures)
  check(leaked.length === 0, `grounded answer leaked: ${leaked.join(", ")}`, failures)
  return { failures, actual: result }
}

function evaluateRetrieval(testCase) {
  const failures = []
  const plan = createQueryPlan(testCase.query)
  const result = executeQueryPlan(plan, scopedTasks(testCase.accessibleTaskIds), fixture.artifacts)
  const sourceTypes = [...new Set(result.sources.map((source) => source.type))]
  const taskIds = result.tasks.map((task) => task.request_id)
  const documentIds = result.documents.map((document) => document.id)

  for (const sourceType of testCase.expected.sourceTypes || []) {
    check(sourceTypes.includes(sourceType), `missing source type: ${sourceType}`, failures)
  }
  for (const taskId of testCase.expected.taskIds || []) {
    check(taskIds.includes(taskId), `missing retrieved task: ${taskId}`, failures)
  }
  for (const documentId of testCase.expected.documentIds || []) {
    check(documentIds.includes(documentId), `missing retrieved document: ${documentId}`, failures)
  }
  for (const documentId of testCase.expected.forbiddenDocumentIds || []) {
    check(!documentIds.includes(documentId), `unapproved/retired document retrieved: ${documentId}`, failures)
  }
  return { failures, actual: { plan, sourceTypes, taskIds, documentIds } }
}

const evaluators = {
  task_resolution: evaluateTaskResolution,
  aggregate: evaluateAggregate,
  aggregate_follow_up: evaluateAggregateFollowUp,
  health: evaluateHealth,
  grounding: evaluateGrounding,
  retrieval: evaluateRetrieval,
}

const startedAt = Date.now()
const results = fixture.cases.map((testCase) => {
  const evaluator = evaluators[testCase.kind]
  if (!evaluator) {
    return { id: testCase.id, category: testCase.category, kind: testCase.kind, query: testCase.query || testCase.content || "", passed: false, failures: [`unsupported case kind: ${testCase.kind}`], actual: {} }
  }
  try {
    const outcome = evaluator(testCase)
    return { id: testCase.id, category: testCase.category, kind: testCase.kind, query: testCase.query || testCase.content || "", passed: outcome.failures.length === 0, ...outcome }
  } catch (error) {
    return { id: testCase.id, category: testCase.category, kind: testCase.kind, query: testCase.query || testCase.content || "", passed: false, failures: [error instanceof Error ? error.message : String(error)], actual: {} }
  }
})

const categoryMap = new Map()
for (const result of results) {
  const category = categoryMap.get(result.category) || { total: 0, passed: 0 }
  category.total += 1
  if (result.passed) category.passed += 1
  categoryMap.set(result.category, category)
}
const categories = Object.fromEntries([...categoryMap.entries()].map(([name, value]) => [name, {
  ...value,
  percent: Number(((value.passed / value.total) * 100).toFixed(1)),
}]))
const passed = results.filter((result) => result.passed).length
const overallPercent = Number(((passed / results.length) * 100).toFixed(1))
const gateFailures = []
if (overallPercent < fixture.qualityGates.minimumOverallPercent) {
  gateFailures.push(`Overall ${overallPercent}% < ${fixture.qualityGates.minimumOverallPercent}%`)
}
for (const [category, requiredPercent] of Object.entries(fixture.qualityGates.requiredCategoryPercent || {})) {
  const actualPercent = categories[category]?.percent ?? 0
  if (actualPercent < requiredPercent) gateFailures.push(`${category} ${actualPercent}% < ${requiredPercent}%`)
}

const failedCategories = new Set(results.filter((result) => !result.passed).map((result) => result.category))
const recommendations = []
if (failedCategories.has("resolution")) recommendations.push("Rà soát normalize, entity scoring và ngưỡng ambiguity trong task resolver.")
if (failedCategories.has("aggregation")) recommendations.push("Rà soát entity scope, aggregate operation và deterministic answer builder.")
if (failedCategories.has("risk") || failedCategories.has("data_quality")) recommendations.push("Rà soát parser ngày, ngưỡng health score và dữ liệu thiếu.")
if (failedCategories.has("grounding")) recommendations.push("Dừng phát hành: grounding đang cho phép nguồn hoặc mã task chưa xác minh.")
if (failedCategories.has("security")) recommendations.push("Dừng phát hành: kiểm tra lại RBAC scope và chính sách tài liệu approved-only.")
if (failedCategories.has("retrieval")) recommendations.push("Rà soát query planner, reranker và metadata filter của retrieval.")
if (recommendations.length === 0) recommendations.push("Không phát hiện hồi quy; có thể mở rộng dataset bằng các lỗi thực tế mới.")

const report = {
  schema: fixture.schema,
  fixture: path.relative(rootDir, fixturePath),
  evaluationNow: fixture.evaluationNow,
  generatedAt: new Date().toISOString(),
  durationMs: Date.now() - startedAt,
  summary: { total: results.length, passed, failed: results.length - passed, overallPercent, qualityGatePassed: gateFailures.length === 0 },
  categories,
  gateFailures,
  recommendations,
  results,
}

function escapeTableCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ")
}

function evidenceFor(result) {
  const actual = result.actual || {}
  if (result.kind === "task_resolution") {
    const candidates = actual.candidateTaskIds?.length ? `; ứng viên: ${actual.candidateTaskIds.join(", ")}` : ""
    return `task=${actual.taskId || "không chọn"}; method=${actual.method || "n/a"}${candidates}`
  }
  if (result.kind === "aggregate") {
    const visibleTaskIds = actual.operation === "risk" ? actual.answerTaskIds : actual.taskIds
    return `mode=${actual.mode}; operation=${actual.operation}; task trả lời=${visibleTaskIds?.join(", ") || "không có"}`
  }
  if (result.kind === "aggregate_follow_up") {
    return `lượt đầu=${actual.firstTaskIds?.join(", ") || "không có"}; lượt sau=${actual.followUpTaskIds?.join(", ") || "không có"}; scope=${actual.scope || "bị mất"}`
  }
  if (result.kind === "health") {
    return `level=${actual.level}; deadline=${actual.daysToDeadline ?? "không hợp lệ/không có"} ngày; signals=${actual.signals?.join("; ") || "không có"}`
  }
  if (result.kind === "grounding") {
    return `mã bị chặn=${actual.unknownTaskReferences?.join(", ") || "không có"}`
  }
  if (result.kind === "retrieval") {
    return `task=${actual.taskIds?.join(", ") || "không có"}; tài liệu=${actual.documentIds?.join(", ") || "không có"}`
  }
  return JSON.stringify(actual)
}

const markdown = [
  "# AI Copilot Evaluation Report",
  "",
  `- Dataset: \`${report.fixture}\``,
  `- Evaluation time: \`${report.evaluationNow}\``,
  `- Result: **${report.summary.qualityGatePassed ? "PASS" : "FAIL"}**`,
  `- Score: **${passed}/${results.length} (${overallPercent}%)**`,
  "",
  "## Category scores",
  "",
  "| Category | Passed | Score |",
  "|---|---:|---:|",
  ...Object.entries(categories).map(([name, value]) => `| ${name} | ${value.passed}/${value.total} | ${value.percent}% |`),
  "",
  "## Những gì đã được kiểm chứng",
  "",
  "- Resolver không tự chọn một task khi câu hỏi đang nói về cả sản phẩm.",
  "- Task ngoài phạm vi truy cập không xuất hiện trong kết quả.",
  "- Tài liệu custom `draft` và tài liệu `retired` không được dùng làm nguồn quy định.",
  "- Mã task do mô hình tự bịa được thay bằng nhãn chưa xác minh.",
  "- Deadline, tiến độ và cập nhật cũ được tính bằng rule engine cố định.",
  "",
  "## Chi tiết từng tình huống",
  "",
  "| ID | Nhóm | Câu hỏi/dữ liệu vào | Kết quả thực tế | Trạng thái |",
  "|---|---|---|---|---:|",
  ...results.map((result) => `| ${result.id} | ${result.category} | ${escapeTableCell(result.query)} | ${escapeTableCell(evidenceFor(result))} | ${result.passed ? "PASS" : "FAIL"} |`),
  "",
  "## Các lỗi thực tế đã được phát hiện",
  "",
  "1. `RES-004`: câu hỏi theo sản phẩm từng chọn nhầm một task; hiện trả về nhiều ứng viên để người dùng xác nhận phạm vi.",
  "2. `SEC-002`: tài liệu custom `draft` từng lọt vào retrieval; hiện chỉ tài liệu custom `approved` được phép làm nguồn.",
  "3. `REAL-001`: hội thoại \"tổng hợp task của Phong\" từng chỉ hiện nguồn và mất phạm vi ở câu hỏi tiếp; hiện trả bảng chi tiết và giữ đúng các task đang thực hiện của Phong.",
  "",
  "## Failed cases",
  "",
  ...(results.filter((result) => !result.passed).length > 0
    ? results.filter((result) => !result.passed).flatMap((result) => [`### ${result.id}`, "", ...result.failures.map((failure) => `- ${failure}`), ""])
    : ["Không có.", ""]),
  "## Recommendations",
  "",
  ...recommendations.map((recommendation) => `- ${recommendation}`),
  "",
].join("\n")

fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(path.join(reportDir, "latest.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8")
fs.writeFileSync(path.join(reportDir, "latest.md"), markdown, "utf8")

for (const result of results) {
  const symbol = result.passed ? "✓" : "✗"
  console.log(`${symbol} [${result.category}] ${result.id}`)
  result.failures.forEach((failure) => console.log(`  - ${failure}`))
}
console.log(`\nAI evaluation: ${passed}/${results.length} (${overallPercent}%)`)
console.log(`Quality gate: ${report.summary.qualityGatePassed ? "PASS" : "FAIL"}`)
console.log(`Report: ${path.relative(rootDir, path.join(reportDir, "latest.md"))}`)

if (!report.summary.qualityGatePassed) process.exitCode = 1
