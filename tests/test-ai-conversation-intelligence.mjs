import assert from "node:assert/strict"
import fs from "node:fs"
import {
  buildAggregateClarification,
  buildDeterministicAggregateAnswer,
  buildDeterministicTaskDetailAnswer,
  buildTaskRetrievalQuery,
  createConversationMemory,
  groundAIResponse,
  isAggregateTaskQuery,
  isContextualFollowUp,
  normalizeConversationText,
  resolveAggregateTaskQuery,
  resolveTaskReference,
  shouldResolveTaskQuery,
} from "../src/lib/aiConversation.ts"
import {
  cosineSimilarity,
  createLocalEmbedding,
  createQueryPlan,
  executeQueryPlan,
  semanticSearch,
  summarizeConversation,
  updateConversationSummary,
} from "../src/lib/aiRetrievalPipeline.ts"

const task = (id, nickname, product, extras = {}) => ({
  request_id: id,
  title: nickname,
  nickname,
  product,
  feature_journey: extras.feature_journey || "",
  squad_name: extras.squad_name || "Digital Banking",
  preferred_squad: extras.preferred_squad || "",
  ...extras,
})

const tasks = [
  task("UXMB-101", "Tiền gửi Online", "Tiền gửi", { feature_journey: "Mở sổ tiết kiệm", current_phase: "User Flow", assigned_designer: "Nguyễn Văn Cường" }),
  task("UXMB-102", "Tiền gửi Siêu Lãi", "Tiền gửi", { feature_journey: "Tái tục khoản gửi", current_phase: "UI Design", assigned_designer: "Trần Thị Mai" }),
  task("UXMB-205", "Luồng mở thẻ tín dụng", "Thẻ tín dụng", { feature_journey: "Đăng ký thẻ", current_phase: "User Flow", assigned_designer: "Nguyễn Văn Cường" }),
  task("REQ-001", "Mở tài khoản CASA", "App MBBank", { feature_journey: "CASA Onboarding", current_phase: "Prototype", assigned_designer: "Lê Văn An" }),
]

let passed = 0
const test = (name, fn) => {
  fn()
  passed += 1
  console.log(`✓ ${name}`)
}

test("Query planner chọn task, tài liệu hoặc cả hai", () => {
  assert.deepEqual(createQueryPlan("deadline task DIGI").sources, ["tasks"])
  assert.deepEqual(createQueryPlan("Phong đang làm gì").sources, ["tasks"])
  assert.deepEqual(createQueryPlan("tìm quy định làm việc").sources, ["documents"])
  assert.deepEqual(createQueryPlan("đối chiếu task này theo quy định").sources, ["tasks", "documents"])
})

test("Local embedding tạo vector chuẩn hóa và cosine ổn định", () => {
  const first = createLocalEmbedding("quy định bàn giao thiết kế")
  const close = createLocalEmbedding("quy trình bàn giao design")
  const far = createLocalEmbedding("deadline thẻ tín dụng")
  assert.ok(Math.abs(cosineSimilarity(first, first) - 1) < 0.0001)
  assert.ok(cosineSimilarity(first, close) > cosineSimilarity(first, far))
})

test("Semantic search và reranker ưu tiên task đúng chủ đề", () => {
  const ranked = semanticSearch("mở thẻ tín dụng", tasks, (item) => `${item.title} ${item.product}`)
  assert.equal(ranked[0]?.item.request_id, "UXMB-205")
  assert.ok(ranked[0].score >= ranked.at(-1).score)
})

test("Structured tool execution trả source id và payload có schema", () => {
  const artifacts = [{ id: "doc-1", name: "Quy định bàn giao", content: "Checklist bàn giao thiết kế", approvalStatus: "approved" }]
  const result = executeQueryPlan(createQueryPlan("đối chiếu task mở thẻ theo quy định bàn giao"), tasks, artifacts)
  assert.ok(result.sources.some((source) => source.id.startsWith("T")))
  assert.ok(result.sources.some((source) => source.id.startsWith("D")))
  assert.equal(JSON.parse(result.promptPayload).schema, "uxmb.tool-results.v1")
})

test("Conversation summary giữ các lượt gần nhất trong ngân sách", () => {
  const summary = summarizeConversation([
    { role: "user", content: "Hỏi về task DIGI" },
    { role: "assistant", content: "Đã tìm thấy task" },
    { role: "user", content: "Deadline của các task đó?" },
  ], 2)
  assert.ok(!summary.includes("Hỏi về task DIGI"))
  assert.ok(summary.includes("Deadline của các task đó?"))
})

test("Conversation summary dài giữ đầu mối cũ và câu hỏi mới", () => {
  const summary = updateConversationSummary(
    "Phạm vi đang nói về sản phẩm DIGI.",
    [{ role: "user", content: "Các task đó đang dừng ở bước nào?" }],
    180
  )
  assert.ok(summary.includes("DIGI"))
  assert.ok(summary.includes("dừng ở bước nào"))
})

test("Câu hỏi một người đang làm gì được trả lời trực tiếp bằng danh sách task", () => {
  const answer = buildDeterministicAggregateAnswer({
    mode: "filtered",
    operation: "list",
    tasks: [tasks[0], tasks[2]],
    options: [],
    scope: { field: "assignee", value: "Nguyễn Văn Cường", taskIds: ["UXMB-101", "UXMB-205"], label: "Người phụ trách = Nguyễn Văn Cường", queryTerm: "cuong" },
    queryTerm: "cuong",
    confidence: 0.95,
  }, tasks.length)
  assert.match(answer, /2 task/)
  assert.match(answer, /UXMB-101/)
  assert.match(answer, /UXMB-205/)
  assert.doesNotMatch(answer, /cung cấp mã task/i)
})

test("Câu hỏi nội dung triển khai tiếp tục dùng active task", () => {
  assert.equal(isContextualFollowUp("nội dung triển khai là gì"), true)
  const result = resolveTaskReference("nội dung triển khai là gì", tasks, "UXMB-101")
  assert.equal(result.task?.request_id, "UXMB-101")
  assert.equal(result.method, "memory")
})

test("Nội dung task được trả trực tiếp từ ba trường nghiệp vụ", () => {
  const detailedTask = {
    ...tasks[0],
    description: "Luồng thay đổi tài khoản nhận tiền.",
    user_problem: "Khách hàng phải ra quầy.",
    business_need: "Giảm thời gian vận hành.",
  }
  const answer = buildDeterministicTaskDetailAnswer("nội dung triển khai là gì", detailedTask)
  assert.match(answer, /Luồng thay đổi tài khoản/)
  assert.match(answer, /Khách hàng phải ra quầy/)
  assert.match(answer, /Giảm thời gian vận hành/)
})

test("Task đã resolve được giữ trong structured tool dù follow-up không trùng từ khóa", () => {
  const plan = createQueryPlan("nội dung triển khai là gì", "task_analysis")
  const result = executeQueryPlan(plan, [tasks[0]], [], { trustedTaskScope: true })
  assert.equal(result.tasks[0]?.request_id, "UXMB-101")
  const payload = JSON.parse(result.promptPayload)
  assert.equal(payload.tool_results.search_tasks[0].data.id, "UXMB-101")
})

test("Chuẩn hóa tiếng Việt phục vụ matching", () => {
  assert.equal(normalizeConversationText("Tiền gửi Đặc biệt"), "tien gui dac biet")
})

test("Resolve chính xác bằng request ID", () => {
  const result = resolveTaskReference("Kiểm tra giúp UXMB-205", tasks)
  assert.equal(result.task?.request_id, "UXMB-205")
  assert.equal(result.method, "request_id")
  assert.equal(result.confidence, 1)
})

test("Resolve chính xác bằng nickname", () => {
  const result = resolveTaskReference("Tiền gửi Siêu Lãi đang đến đâu?", tasks)
  assert.equal(result.task?.request_id, "UXMB-102")
  assert.ok(result.confidence >= 0.8)
})

test("Giữ active task khi người dùng hỏi tiếp bằng đại từ 'nó'", () => {
  const result = resolveTaskReference("Nó có nguy cơ trễ không?", tasks, "UXMB-101")
  assert.equal(result.task?.request_id, "UXMB-101")
  assert.equal(result.method, "memory")
  assert.equal(result.isFollowUp, true)
})

test("Giữ active task cho câu hỏi nối tiếp ngắn", () => {
  const result = resolveTaskReference("Ai đang phụ trách?", tasks, "UXMB-205")
  assert.equal(result.task?.request_id, "UXMB-205")
  assert.equal(result.isFollowUp, true)
})

test("Không tự chọn khi chỉ nhắc sản phẩm có nhiều task", () => {
  const result = resolveTaskReference("Tình hình sản phẩm tiền gửi thế nào?", tasks)
  assert.equal(result.task, null)
  assert.equal(result.method, "ambiguous")
  assert.ok(result.candidates.length >= 2)
})

test("Người dùng có thể chọn task mơ hồ bằng số thứ tự", () => {
  const result = resolveTaskReference("2", tasks, undefined, ["UXMB-101", "UXMB-102"])
  assert.equal(result.task?.request_id, "UXMB-102")
  assert.equal(result.confidence, 1)
})

test("Câu tổng hợp được nhận diện để giữ toàn bộ phạm vi task", () => {
  assert.equal(isAggregateTaskQuery("Tổng hợp tất cả công việc của team"), true)
  assert.equal(isAggregateTaskQuery("UXMB-101 đang thế nào"), false)
})

test("Nhận diện follow-up có tham chiếu ngữ cảnh", () => {
  assert.equal(isContextualFollowUp("Bài này nên làm gì tiếp theo?"), true)
  assert.equal(isContextualFollowUp("Vẽ biểu đồ phân bổ toàn bộ task"), false)
})

test("Retrieval query mang theo ngữ nghĩa task đã resolve", () => {
  const query = buildTaskRetrievalQuery("Có tài liệu nào liên quan?", tasks[0])
  assert.match(query, /Tiền gửi Online/)
  assert.match(query, /Mở sổ tiết kiệm/)
})

test("Conversation memory lưu active task và artifact", () => {
  const memory = createConversationMemory({
    activeTask: tasks[0],
    activeArtifactIds: ["doc-7-khau"],
    intent: "task_analysis",
    userQuery: "Kiểm tra task",
    now: new Date("2026-10-04T00:00:00.000Z"),
  })
  assert.equal(memory.activeTaskId, "UXMB-101")
  assert.deepEqual(memory.activeArtifactIds, ["doc-7-khau"])
  assert.equal(memory.updatedAt, "2026-10-04T00:00:00.000Z")
})

test("Conversation memory không làm mất active task ở lượt general", () => {
  const previous = createConversationMemory({
    activeTask: tasks[2],
    userQuery: "Mở task thẻ",
    now: new Date("2026-10-04T00:00:00.000Z"),
  })
  const next = createConversationMemory({
    previous,
    activeTask: null,
    intent: "general",
    userQuery: "Cảm ơn",
    now: new Date("2026-10-04T00:01:00.000Z"),
  })
  assert.equal(next.activeTaskId, "UXMB-205")
})

test("Không match bừa câu hỏi general vào task", () => {
  const result = resolveTaskReference("Hôm nay là thứ mấy?", tasks)
  assert.equal(result.task, null)
  assert.equal(result.method, "none")
})

test("Grounding tự thêm nguồn task và tài liệu", () => {
  const result = groundAIResponse("Bài toán đang ở Khâu 4.", {
    taskIds: ["UXMB-101"],
    documentNames: ["Quy trình 7 Khâu.md"],
  })
  assert.match(result.content, /Nguồn tham chiếu đã nạp/)
  assert.match(result.content, /UXMB-101/)
  assert.match(result.content, /Quy trình 7 Khâu\.md/)
})

test("Grounding chặn mã task do model tự bịa", () => {
  const result = groundAIResponse("Theo UXMB-999, tiến độ là 80%.", {
    taskIds: ["UXMB-101"],
  })
  assert.doesNotMatch(result.content, /UXMB-999/)
  assert.deepEqual(result.unknownTaskReferences, ["UXMB-999"])
})

test("Resolve linh hoạt mã task dạng compact, hashtag, tiền tố bài/task", () => {
  assert.equal(resolveTaskReference("kiểm tra req001", tasks).task?.request_id, "REQ-001")
  assert.equal(resolveTaskReference("task 001", tasks).task?.request_id, "REQ-001")
  assert.equal(resolveTaskReference("bài 101", tasks).task?.request_id, "UXMB-101")
  assert.equal(resolveTaskReference("xem giúp #REQ-001", tasks).task?.request_id, "REQ-001")
  assert.equal(resolveTaskReference("REQ_001 thế nào", tasks).task?.request_id, "REQ-001")
})

test("Resolve câu hỏi tự nhiên bài CASA không bị rơi vào null", () => {
  const r1 = resolveTaskReference("bài toán CASA thế nào rồi", tasks)
  assert.equal(r1.task?.request_id, "REQ-001")
  assert.ok(r1.confidence >= 0.8)

  const r2 = resolveTaskReference("bài CASA thế nào", tasks)
  assert.equal(r2.task?.request_id, "REQ-001")
})

test("Nhận diện câu hỏi theo Designer", () => {
  const result = resolveTaskReference("các task của Cường", tasks)
  assert.deepEqual(result.candidates.map((t) => t.request_id).sort(), ["UXMB-101", "UXMB-205"])
})

test("Nhận diện câu hỏi theo Khâu UX", () => {
  const result = resolveTaskReference("những bài ở khâu 4", tasks)
  assert.deepEqual(result.candidates.map((t) => t.request_id).sort(), ["UXMB-101", "UXMB-205"])
})

const digiTasks = [
  task("DIGI-001", "Digi Lite_CCCD bổ sung UI", "Digi Invest", { squad_name: "Digital Banking", assigned_designer: "Mai" }),
  task("DIGI-002", "Dashboard đầu tư", "Digi Invest", { squad_name: "Wealth", assigned_designer: "Cường" }),
  task("APP-003", "Digi onboarding", "App MBBank", { squad_name: "Digital Banking", assigned_designer: "An" }),
  task("PAY-004", "Payment overview", "Payments", { squad_name: "Digital Banking", assigned_designer: "Bình" }),
]

test("Truy vấn Digi mơ hồ được làm rõ theo từng trường thay vì nạp toàn bộ task", () => {
  assert.equal(isAggregateTaskQuery("Số lượng task của Digi"), true)
  const result = resolveAggregateTaskQuery("Số lượng task của Digi", digiTasks)
  assert.equal(result.mode, "clarify")
  assert.equal(result.operation, "count")
  assert.equal(result.tasks.length, 0)
  assert.ok(result.options.some((option) => option.field === "product" && option.taskIds.length === 2))
  assert.ok(result.options.some((option) => option.field === "title" && option.taskIds.length === 2))
  assert.ok(result.options.some((option) => option.field === "squad" && option.taskIds.length === 3))
  assert.match(buildAggregateClarification(result), /nhiều phạm vi/)
})

test("Truy vấn nêu rõ sản phẩm chỉ lấy task thuộc trường product", () => {
  const result = resolveAggregateTaskQuery("Sản phẩm Digi có bao nhiêu task?", digiTasks)
  assert.equal(result.mode, "filtered")
  assert.equal(result.scope?.field, "product")
  assert.equal(result.scope?.value, "Digi Invest")
  assert.deepEqual(result.tasks.map((item) => item.request_id).sort(), ["DIGI-001", "DIGI-002"])
})

test("Truy vấn nêu rõ tên task gom mọi title chứa Digi vào cùng phạm vi", () => {
  const result = resolveAggregateTaskQuery("Tên task chứa Digi có bao nhiêu task?", digiTasks)
  assert.equal(result.mode, "filtered")
  assert.equal(result.scope?.field, "title")
  assert.deepEqual(result.tasks.map((item) => item.request_id).sort(), ["APP-003", "DIGI-001"])
})

test("Lựa chọn làm rõ bằng số được áp dụng ở lượt chat tiếp theo", () => {
  const ambiguous = resolveAggregateTaskQuery("Digi có bao nhiêu task?", digiTasks)
  const productIndex = ambiguous.options.findIndex((option) => option.field === "product")
  const selected = resolveAggregateTaskQuery(String(productIndex + 1), digiTasks, ambiguous.options)
  assert.equal(selected.mode, "filtered")
  assert.equal(selected.operation, "count")
  assert.equal(selected.scope?.field, "product")
  assert.equal(selected.tasks.length, 2)
})

test("Không khớp thực thể không được fallback thành toàn bộ task", () => {
  const result = resolveAggregateTaskQuery("Sản phẩm Không-Tồn-Tại có bao nhiêu task?", digiTasks)
  assert.equal(result.mode, "none")
  assert.equal(result.tasks.length, 0)
  assert.match(buildAggregateClarification(result), /chưa tìm thấy/i)
})

test("Câu đếm được tạo bằng code và công bố rõ phạm vi", () => {
  const result = resolveAggregateTaskQuery("Sản phẩm Digi có bao nhiêu task?", digiTasks)
  const answer = buildDeterministicAggregateAnswer(result, digiTasks.length)
  assert.match(answer, /\*\*2 task\*\*/)
  assert.match(answer, /Sản phẩm = Digi Invest/)
  assert.match(answer, /không yêu cầu AI tự đếm văn bản/)
})

test("Phạm vi đã chọn được giữ cho câu hỏi nối tiếp", () => {
  const first = resolveAggregateTaskQuery("Sản phẩm Digi có bao nhiêu task?", digiTasks)
  const followUp = resolveAggregateTaskQuery("Trong số đó có những task nào?", digiTasks, [], first.scope)
  assert.equal(followUp.mode, "filtered")
  assert.equal(followUp.operation, "list")
  assert.deepEqual(followUp.tasks.map((item) => item.request_id).sort(), ["DIGI-001", "DIGI-002"])
})

test("Lệnh chart và tiến độ không bị hiểu nhầm thành tên thực thể", () => {
  assert.equal(resolveAggregateTaskQuery("/chart", digiTasks).mode, "all")
  assert.equal(resolveAggregateTaskQuery("/tiendo", digiTasks).mode, "all")
})

test("Intent tài liệu thuần túy không được chuyển sang resolver task", () => {
  const intent = { isDoc: true, isTask: false, isTaskUpdate: false, isActionCard: false }
  assert.equal(shouldResolveTaskQuery("tìm tài liệu liên quan đến quy định làm việc", intent), false)
})

test("Câu hỏi tài liệu vẫn resolve task khi người dùng nêu rõ task hoặc mã task", () => {
  const docAndTaskIntent = { isDoc: true, isTask: true, isTaskUpdate: false, isActionCard: false }
  const docOnlyIntent = { isDoc: true, isTask: false, isTaskUpdate: false, isActionCard: false }
  assert.equal(shouldResolveTaskQuery("tìm tài liệu của task UXMB-101", docAndTaskIntent), true)
  assert.equal(shouldResolveTaskQuery("tìm tài liệu của UXMB-101", docOnlyIntent), true)
})

test("Text thường chỉ được đưa vào pipeline render một lần", () => {
  const pageSource = fs.readFileSync(new URL("../src/pages/AIChatPage.tsx", import.meta.url), "utf8")
  assert.match(pageSource, /if \(!text\.includes\("\{"\)\) \{\s*normalizedSegments\.push\(seg\)\s*continue/s)
  assert.doesNotMatch(pageSource, /if \(!foundAnyJson && cursor === 0\)/)
})

test("Câu hỏi một người đang làm gì được hiểu là danh sách task theo assignee", () => {
  const peopleTasks = [
    task("P-001", "Thiết kế màn hình A", "App", { assigned_designer: "Nguyễn Văn Phong", squad_name: "Digital Banking" }),
    task("P-002", "Rà soát flow B", "App", { assigned_designer: "Nguyễn Văn Phong", squad_name: "Digital Banking" }),
    task("P-003", "Prototype C", "App", { assigned_designer: "Trần Thị Mai", squad_name: "Digital Banking" }),
  ]
  assert.equal(isAggregateTaskQuery("Phong hôm nay đang làm công việc gì"), true)
  const result = resolveAggregateTaskQuery("Phong hôm nay đang làm công việc gì", peopleTasks)
  assert.equal(result.mode, "filtered")
  assert.equal(result.operation, "list")
  assert.equal(result.scope?.field, "assignee")
  assert.deepEqual(result.tasks.map((item) => item.request_id).sort(), ["P-001", "P-002"])

  const followUp = resolveAggregateTaskQuery(
    "Các mốc thời gian deadline của từng task và các phần này đang dừng lại ở bước nào?",
    peopleTasks,
    [],
    result.scope
  )
  assert.equal(followUp.mode, "filtered")
  assert.deepEqual(followUp.tasks.map((item) => item.request_id).sort(), ["P-001", "P-002"])
})

test("File đang xem được tách khỏi file chủ động gắn vào chat", () => {
  const pageSource = fs.readFileSync(new URL("../src/pages/AIChatPage.tsx", import.meta.url), "utf8")
  assert.match(pageSource, /const \[chatArtifactId, setChatArtifactId\]/)
  assert.match(pageSource, /activeArtifact=\{chatArtifact\}/)
  assert.match(pageSource, /retrievalPlan\.sources\.includes\("documents"\) \|\| isDocCommand \|\| cleanText\.startsWith\("@"\)/)
  assert.match(pageSource, /STRUCTURED_TOOL_RESULTS/)
  assert.match(pageSource, /CONVERSATION_SUMMARY/)
  assert.match(pageSource, /ai-grounding-sources/)
  assert.doesNotMatch(pageSource, /activeArtifact=\{selectedArtifact\}/)
})

console.log(`\nAI conversation intelligence: ${passed}/${passed} tests passed.`)

