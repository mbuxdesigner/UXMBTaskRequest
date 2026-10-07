import assert from "node:assert/strict"
import {
  buildTaskRetrievalQuery,
  createConversationMemory,
  groundAIResponse,
  isAggregateTaskQuery,
  isContextualFollowUp,
  normalizeConversationText,
  resolveTaskReference,
} from "../src/lib/aiConversation.ts"

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

console.log(`\nAI conversation intelligence: ${passed}/${passed} tests passed.`)

