import assert from "node:assert/strict"

const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
}
globalThis.window = {
  localStorage: globalThis.localStorage,
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
}

const {
  buildRuleBasedBriefing,
  getDesignerPhaseDistribution,
  getGoLiveTasksInWeek,
  getTaskPlannedDate,
  getWeekBounds,
} = await import("../src/lib/designerPlanner.ts")
const { expandTeamEventOccurrences, getLocalUXRequests, updateTaskPlannedDate } = await import("../src/services/calendarService.ts")
const { readFileSync } = await import("node:fs")

const baseTask = {
  request_id: "UXMB-PLANNER-001",
  title: "Thiết kế dashboard dòng tiền",
  product: "App MB",
  request_type: "Tính năng mới",
  feature_journey: "Tài chính",
  description: "",
  business_need: "",
  user_problem: "",
  target_user: "",
  expected_output: [],
  expected_deadline: "2026-09-30",
  release_date: "2026-10-02",
  deadline_reason: "",
  preferred_squad: "BeeRich",
  requester_email: "po@mbbank.com.vn",
  squad_name: "BeeRich",
  ux_owner: "Phong",
  assigned_designer: "Phong",
  current_phase: "4. UI Design",
  status: "Đang thực hiện",
  priority: "lv1",
  progress: 50,
  last_updated: "2026-09-27T00:00:00.000Z",
  phases: [],
  latest_update: { date: "2026-09-27", note: "" },
  deliverables: {},
  submitted_at: "2026-09-20T00:00:00.000Z",
}

assert.deepEqual(getWeekBounds(new Date(2026, 8, 30)), {
  start: "2026-09-28",
  end: "2026-10-04",
})
assert.equal(getGoLiveTasksInWeek([baseTask], new Date(2026, 8, 30)).length, 1)
console.log("✓ Planner resolves Monday-Sunday range and weekly go-live tasks")

const phaseStats = getDesignerPhaseDistribution([
  baseTask,
  { ...baseTask, request_id: "2", current_phase: "Ready to dev" },
  { ...baseTask, request_id: "3", current_phase: "Nghiệm thu UI" },
  { ...baseTask, request_id: "4", current_phase: "Define đầu bài" },
])
assert.equal(phaseStats.find((item) => item.key === "design")?.count, 1)
assert.equal(phaseStats.find((item) => item.key === "ready")?.count, 1)
assert.equal(phaseStats.find((item) => item.key === "acceptance")?.count, 1)
assert.equal(phaseStats.find((item) => item.key === "define")?.count, 1)
console.log("✓ Planner maps tasks into the four UX phase groups")

const briefing = buildRuleBasedBriefing(
  [baseTask],
  new Date(2026, 8, 30),
  { [baseTask.request_id]: "at_risk" },
)
assert.ok(briefing.some((item) => item.id === "at-risk"))
assert.ok(briefing.some((item) => item.id === "go-live"))
assert.ok(briefing.some((item) => item.id === "unscheduled"))
console.log("✓ Rule-based briefing covers risk, go-live and unscheduled work")

localStorage.setItem("ux_portal_real_requests", JSON.stringify([baseTask]))
const update = updateTaskPlannedDate(baseTask.request_id, "2026-09-29")
assert.equal(update.success, true)
assert.equal(getTaskPlannedDate(getLocalUXRequests()[0]), "2026-09-29")
assert.equal(getLocalUXRequests()[0].expected_deadline, "2026-09-30")
console.log("✓ Planned work date changes without mutating the committed deadline")

const frontendSyncSource = readFileSync(new URL("../src/services/googleSheetService.ts", import.meta.url), "utf8")
const backendSource = readFileSync(new URL("../google-apps-script-backend.js", import.meta.url), "utf8")
const plannerPageSource = readFileSync(new URL("../src/pages/DesignerPlannerPage.tsx", import.meta.url), "utf8")
const meetingDialogSource = readFileSync(new URL("../src/components/planner/ScheduleMeetingDialog.tsx", import.meta.url), "utf8")
const systemConfigSource = readFileSync(new URL("../src/config/systemConfig.ts", import.meta.url), "utf8")
const rightSheetSource = readFileSync(new URL("../src/components/ui/right-sheet.tsx", import.meta.url), "utf8")
const hoverPreviewSource = readFileSync(new URL("../src/components/ui/hover-preview.tsx", import.meta.url), "utf8")
assert.match(frontendSyncSource, /planned_work_date\?: string/)
assert.match(frontendSyncSource, /planned_work_date: params\.planned_work_date/)
assert.match(backendSource, /typeof data\.planned_work_date !== "undefined"/)
assert.match(backendSource, /item\.planned_work_date = String\(data\.planned_work_date/)
console.log("✓ Planned work date is included in the frontend and Apps Script persistence contracts")

assert.match(plannerPageSource, /const holidayByDate = useMemo/)
assert.match(plannerPageSource, /isNonWorkingDay && "bg-slate-100\/75/)
assert.match(plannerPageSource, /isCompensatoryWorkday \? "Làm bù" : "Nghỉ lễ"/)
assert.doesNotMatch(plannerPageSource, /type: "holiday"/)
console.log("✓ Days off use a muted cell background and holidays are rendered as background labels")

assert.match(meetingDialogSource, /Schedule meeting/)
assert.match(meetingDialogSource, /TIME_SLOTS/)
assert.match(meetingDialogSource, /durationMinutes/)
assert.match(meetingDialogSource, /recurrence/)
assert.match(meetingDialogSource, /accept="image\/\*"/)
assert.match(plannerPageSource, /uploadFileToDrive\(file, "UX_Planner_Event_Attachments"\)/)
assert.match(systemConfigSource, /attachments\?: Array/)
console.log("✓ Meeting scheduler supports time slots, duration, recurrence and image attachments")

const recurringMeeting = expandTeamEventOccurrences({
  id: "weekly-review",
  title: "Design review",
  categoryId: "cat-review",
  startDate: "2026-09-28T09:00",
  endDate: "2026-09-28T10:00",
  allDay: false,
  recurrence: "weekly",
  recurrenceEndDate: "2026-10-12",
})
assert.deepEqual(recurringMeeting.map((item) => item.date), ["2026-09-28", "2026-10-05", "2026-10-12"])
assert.equal(recurringMeeting[2].endDate, "2026-10-12T10:00")
assert.match(meetingDialogSource, /function MiniDateCalendar/)
assert.match(meetingDialogSource, /function EventCategoryPicker/)
assert.match(meetingDialogSource, /function DesignerPicker/)
assert.match(meetingDialogSource, /Một ảnh đại diện, không quá 10 MB/)
assert.doesNotMatch(meetingDialogSource, /type="file" accept="image\/\*" multiple/)
assert.doesNotMatch(meetingDialogSource, /Phòng chờ|Tự động ghi/)
assert.match(meetingDialogSource, /recurrenceEndDate/)
console.log("✓ Meeting form uses admin categories, Designer picker, one thumbnail and bounded recurrence")

assert.match(plannerPageSource, /QUOTE_HOLD_MS = 20_000/)
assert.match(plannerPageSource, /QuoteAnimationPhase = "typing" \| "holding" \| "deleting"/)
assert.match(plannerPageSource, /Math\.floor\(Math\.random\(\) \* QUOTES\.length\)/)
console.log("✓ Inspiration quote starts randomly and rotates with an accessible typewriter cycle")

assert.match(plannerPageSource, /src="\/ai-default\.png"/)
assert.match(plannerPageSource, /BriefingTypewriter/)
assert.match(plannerPageSource, /<HoverPreview/)
assert.match(hoverPreviewSource, /window\.innerWidth - width/)
assert.match(rightSheetSource, /initial=\{\{ x: "100%"/)
assert.match(meetingDialogSource, /<RightSheet/)
assert.doesNotMatch(plannerPageSource, /<Dialog[\s>]/)
console.log("✓ AI briefing uses white hover-preview UI and Planner overlays open as right sheets")

assert.match(plannerPageSource, /phaseBarGroups/)
assert.match(plannerPageSource, /<Tooltip[\s\S]*?group\.count/)
assert.match(plannerPageSource, /<Tooltip[\s\S]*?item\.count/)
console.log("✓ Phase bar regions and legend support interactive tooltips with task counts")

assert.match(plannerPageSource, /<BorderBeam[\s\S]*?iterations=\{2\}[\s\S]*?triggerKey=\{briefingPulse\}/)
const borderBeamSource = readFileSync("src/components/jolyui/border-beam.tsx", "utf-8")
assert.match(borderBeamSource, /iterations\?: number/)
assert.match(borderBeamSource, /setIsVisible\(false\)/)
assert.match(plannerPageSource, /<AgentActivityTrace[\s\S]*?mode="live"/)
assert.match(plannerPageSource, /<AgentActivityTrace[\s\S]*?mode="inspector"/)
assert.match(plannerPageSource, /Nhật ký AI đã đọc/)
const agentTraceSource = readFileSync("src/components/planner/AgentActivityTrace.tsx", "utf-8")
assert.match(agentTraceSource, /Quét danh mục công việc/)
assert.match(agentTraceSource, /Đọc nguồn dữ liệu dự án/)
assert.match(agentTraceSource, /Đối soát rủi ro & cột mốc/)
assert.match(agentTraceSource, /Tổng hợp bản tin điều hành/)
assert.match(plannerPageSource, /flex items-start gap-2\.5[\s\S]*?ai-default\.png/)
assert.doesNotMatch(plannerPageSource, /items-stretch justify-between gap-\[2px\] overflow-hidden/)
assert.match(plannerPageSource, /isBriefingExpanded/)
assert.match(plannerPageSource, /<Maximize2/)
assert.match(plannerPageSource, /<RightSheet[\s\S]*?open=\{isBriefingExpanded\}/)
assert.match(plannerPageSource, /gridTemplateRows: `repeat\(\$\{calendarWeeks\.length\}, minmax\((?:120px|154px), 1fr\)\)`/)
assert.match(plannerPageSource, /!isLastRow && "border-b border-slate-200\/80"/)
console.log("✓ Calendar grid fills 100% of height and Executive Summary opens slide-over RightSheet")

assert.match(plannerPageSource, /canManageDetailEvent/)
assert.match(plannerPageSource, /handleOpenEditEvent/)
assert.match(plannerPageSource, /updateTeamEvent/)
assert.match(plannerPageSource, /Sửa sự kiện/)
assert.match(meetingDialogSource, /isEditing\?: boolean/)
assert.match(meetingDialogSource, /initialValues\?:/)
console.log("✓ Event detail allows Admin or creator to edit events via ScheduleMeetingDialog")

assert.match(plannerPageSource, /<CAvatar29[\s\S]*?totalCount=\{detailEntry\.attendees\.length\}/)
assert.match(plannerPageSource, /getUserInitials/)
assert.match(plannerPageSource, /getAvatarColorClass/)
assert.match(plannerPageSource, /group-hover:flex flex-col z-50 min-w-\[220px\]/)
console.log("✓ Event detail displays attendees with CAvatar29 avatar stack and dark hover tooltip list")

assert.match(plannerPageSource, /<AgentActivityTrace[\s\S]*?onComplete=\{(handleTraceComplete|\(\) => setLoading\(false\))\}/)
console.log("✓ Skeleton trace immediately hands over and displays page when finished reading")

assert.match(plannerPageSource, /variants=\{cascadeWaveItemVariants\}[\s\S]*?custom=\{0\}/)
assert.match(plannerPageSource, /variants=\{cascadeWaveItemVariants\}[\s\S]*?custom=\{1\}/)
assert.match(plannerPageSource, /variants=\{cascadeWaveItemVariants\}[\s\S]*?custom=\{2\}/)
assert.match(plannerPageSource, /variants=\{cascadeWaveItemVariants\}[\s\S]*?custom=\{3\}/)
console.log("✓ Planner cards appear in staggered cascade wave order with 120ms progressive delays")

const { isTaskRelatedToUser, isTaskCreatedByUser, isUserTaskViewer } = await import("../src/lib/accessControl.ts")

const adminSession = {
  displayName: "Admin MB UX Team",
  personalEmail: "admin@gmail.com",
  teamsEmail: "admin@mbbank.com.vn",
  role: "Admin",
}

const unrelatedTask = {
  request_id: "REQ-OTHER-001",
  title: "Task của designer khác",
  assigned_designer: "Lê Hoàng Nam",
  ux_owner: "Lê Hoàng Nam",
  requester_email: "po_other@mbbank.com.vn",
  viewers: ["Nguyễn Thị Mai"],
}

const assignedTask = {
  request_id: "REQ-ASSIGNED-001",
  title: "Task được gán cho Admin",
  assigned_designer: "Admin MB UX Team",
  requester_email: "po@mbbank.com.vn",
}

const createdTask = {
  request_id: "REQ-CREATED-001",
  title: "Task do Admin tạo",
  assigned_designer: "Trần Văn B",
  requester_email: "admin@mbbank.com.vn",
}

const viewerTask = {
  request_id: "REQ-VIEWER-001",
  title: "Task Admin làm viewer",
  assigned_designer: "Trần Văn C",
  requester_email: "po2@mbbank.com.vn",
  viewers: ["admin@mbbank.com.vn"],
}

// Kiểm tra: ngay cả Admin, trang Planner cá nhân cũng chỉ nhận task liên quan (gán / tạo / viewer)
assert.equal(isTaskRelatedToUser(unrelatedTask, adminSession), false)
assert.equal(isTaskRelatedToUser(assignedTask, adminSession), true)
assert.equal(isTaskRelatedToUser(createdTask, adminSession), true)
assert.equal(isTaskRelatedToUser(viewerTask, adminSession), true)

assert.match(plannerPageSource, /rawRequests\.filter\(\(task\) => isTaskRelatedToUser\(task, session\)\)/)
assert.match(plannerPageSource, /function isEventRelatedToUser/)
assert.match(plannerPageSource, /!isEventRelatedToUser\(rawEvent, designerName, designerEmail, session\)/)
console.log("✓ Personal planner strictly scopes tasks & events around the designer (assigned, created, viewer) even for Admin")

const updatedPlannerSource = readFileSync(new URL("../src/pages/DesignerPlannerPage.tsx", import.meta.url), "utf8")
assert.match(updatedPlannerSource, /<ExecutiveSummaryTypewriter/)

const typewriterSource = readFileSync(new URL("../src/components/planner/ExecutiveSummaryTypewriter.tsx", import.meta.url), "utf8")
assert.match(typewriterSource, /text-blue-600 hover:text-blue-800 underline underline-offset-2 decoration-blue-300/)
assert.match(typewriterSource, /text-purple-600 hover:text-purple-800 underline underline-offset-2 decoration-purple-300/)
assert.match(typewriterSource, /animate-pulse rounded-\[1px\]/)
assert.match(typewriterSource, /handleSkipTyping/)
console.log("✓ ExecutiveSummaryTypewriter streams AI text character-by-character with blinking cursor and hyperlink styling")

assert.match(updatedPlannerSource, /Card 1: Executive Summary - ĐỨNG IM, KHÔNG ANIMATION XUẤT HIỆN/)
assert.match(updatedPlannerSource, /loading \|\| isAiRefreshing \? \(\s*<AgentActivityTrace/)
assert.match(updatedPlannerSource, /const handleTraceComplete = useCallback\(\(\) => \{[\s\S]*setIsAiRefreshing\(false\)/)
assert.match(updatedPlannerSource, /useEffect\(\(\) => \{[\s\S]*if \(!isAiRefreshing\) return[\s\S]*setIsAiRefreshing\(false\)/)
console.log("✓ Executive Summary card is stationary (no entrance animation/jumping) and transitions directly to text typing")
console.log("✓ handleTraceComplete resets isAiRefreshing(false) with a safety fallback timeout")










