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
