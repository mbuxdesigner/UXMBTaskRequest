/**
 * Automated Test Suite for Work Schedule & Holiday Calendar Engine
 * 
 * Verifies:
 * 1. Default Work Schedule completeness & Vietnam 2026 Public Holidays.
 * 2. Daily & Weekly Working Capacity calculations (8h/day, 40h/week).
 * 3. Business Day detection (weekdays, weekends, single-day & multi-day holidays).
 * 4. Business Hours calculation (lunch break deduction, cross-weekend skipping).
 * 5. SLA Elapsed Hours calculation (weekend & public holiday exclusion).
 * 6. Business Day addition (e.g. Friday + 1 business day = Monday).
 * 7. Custom workweek & custom holidays integration.
 */
import assert from "assert"

// Mock browser environment for systemConfig
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
    eventListeners.set(type, list.filter((l) => l !== fn))
  },
  localStorage: global.localStorage,
}

global.CustomEvent = class CustomEvent {
  constructor(type, eventInitDict) {
    this.type = type
    this.detail = eventInitDict?.detail
  }
}

async function runWorkScheduleTests() {
  console.log("================================================================")
  console.log("    RUNNING WORK SCHEDULE & HOLIDAY CALENDAR TEST SUITE         ")
  console.log("================================================================")

  const {
    DEFAULT_WORK_SCHEDULE,
    VIETNAM_PUBLIC_HOLIDAYS_2026,
    getDayOfWeekKey,
    isBusinessDay,
    getDailyWorkingMinutes,
    getWeeklyCapacityHours,
    calculateBusinessHoursBetween,
    calculateSlaElapsedHours,
    addBusinessDays,
    getSystemConfig,
    saveSystemConfig,
  } = await import("./src/config/systemConfig.ts")

  // --- TEST 1: Default Schedule Completeness & Vietnam Holidays ---
  console.log("✓ Test 1: Verifying default work schedule & Vietnam 2026 public holidays")
  assert.ok(DEFAULT_WORK_SCHEDULE, "DEFAULT_WORK_SCHEDULE must be defined")
  assert.deepStrictEqual(DEFAULT_WORK_SCHEDULE.workweek, ["Mo", "Tu", "We", "Th", "Fr"])
  assert.strictEqual(DEFAULT_WORK_SCHEDULE.startTime, "08:00")
  assert.strictEqual(DEFAULT_WORK_SCHEDULE.endTime, "17:30")
  assert.strictEqual(DEFAULT_WORK_SCHEDULE.lunchBreak.enabled, true)
  assert.strictEqual(DEFAULT_WORK_SCHEDULE.lunchBreak.startTime, "12:00")
  assert.strictEqual(DEFAULT_WORK_SCHEDULE.lunchBreak.endTime, "13:30")
  assert.strictEqual(VIETNAM_PUBLIC_HOLIDAYS_2026.length, 11, "Must contain all 11 statutory VN holidays 2026")

  const tet = VIETNAM_PUBLIC_HOLIDAYS_2026.find((h) => h.id === "tet_am_lich_2026_1")
  assert.ok(tet, "Tết Nguyên Đán 2026 (29 Tết) must be present")
  assert.strictEqual(tet.date, "2026-02-16")

  // --- TEST 2: Daily & Weekly Capacity Calculations ---
  console.log("✓ Test 2: Verifying working capacity calculation (daily & weekly)")
  // 08:00 to 17:30 = 9h30m (570m). Minus lunch 12:00-13:30 (90m) = 480m (8h00m).
  const dailyMins = getDailyWorkingMinutes(DEFAULT_WORK_SCHEDULE)
  assert.strictEqual(dailyMins, 480, "Daily working minutes must be exactly 480m (8.0 hours)")

  const weeklyHours = getWeeklyCapacityHours(DEFAULT_WORK_SCHEDULE)
  assert.strictEqual(weeklyHours, 40.0, "Weekly capacity must be 40.0 hours for a 5-day workweek")

  // Custom schedule: 6 days (including Saturday)
  const sixDaySchedule = {
    ...DEFAULT_WORK_SCHEDULE,
    workweek: ["Mo", "Tu", "We", "Th", "Fr", "Sa"],
  }
  const sixDayWeeklyHours = getWeeklyCapacityHours(sixDaySchedule)
  assert.strictEqual(sixDayWeeklyHours, 48.0, "Weekly capacity for 6-day week must be 48.0 hours")

  // --- TEST 3: Business Day Detection (Weekdays, Weekends & Holidays) ---
  console.log("✓ Test 3: Verifying isBusinessDay detection across weekdays, weekends & holidays")
  // 2026-09-21 is Monday (normal business day)
  assert.strictEqual(isBusinessDay(new Date("2026-09-21T10:00:00"), DEFAULT_WORK_SCHEDULE), true)
  // 2026-09-26 is Saturday (weekend)
  assert.strictEqual(isBusinessDay(new Date("2026-09-26T10:00:00"), DEFAULT_WORK_SCHEDULE), false)
  // 2026-09-27 is Sunday (weekend)
  assert.strictEqual(isBusinessDay(new Date("2026-09-27T10:00:00"), DEFAULT_WORK_SCHEDULE), false)
  // 2026-01-01 is New Year holiday (Tết Dương lịch)
  assert.strictEqual(isBusinessDay(new Date("2026-01-01T10:00:00"), DEFAULT_WORK_SCHEDULE), false)
  // 2026-02-18 is within Lunar New Year week (Tết Nguyên Đán)
  assert.strictEqual(isBusinessDay(new Date("2026-02-18T10:00:00"), DEFAULT_WORK_SCHEDULE), false)
  // 2026-04-30 is Liberation Day
  assert.strictEqual(isBusinessDay(new Date("2026-04-30T10:00:00"), DEFAULT_WORK_SCHEDULE), false)
  // 2026-05-01 is Labor Day
  assert.strictEqual(isBusinessDay(new Date("2026-05-01T10:00:00"), DEFAULT_WORK_SCHEDULE), false)
  // 2026-09-02 is National Day
  assert.strictEqual(isBusinessDay(new Date("2026-09-02T10:00:00"), DEFAULT_WORK_SCHEDULE), false)

  // --- TEST 4: calculateBusinessHoursBetween (Exact Working Hours) ---
  console.log("✓ Test 4: Verifying calculateBusinessHoursBetween (lunch deduction & weekend skip)")
  // Same day: 08:30 to 11:30 = 3.0h
  const morningHours = calculateBusinessHoursBetween("2026-09-21T08:30:00", "2026-09-21T11:30:00", DEFAULT_WORK_SCHEDULE)
  assert.strictEqual(morningHours, 3.0, "Morning 08:30 to 11:30 should be 3.0 hours")

  // Across lunch: 11:00 to 14:30 = 3.5h clock, minus 1.5h lunch = 2.0h working
  const acrossLunch = calculateBusinessHoursBetween("2026-09-21T11:00:00", "2026-09-21T14:30:00", DEFAULT_WORK_SCHEDULE)
  assert.strictEqual(acrossLunch, 2.0, "11:00 to 14:30 across lunch should be 2.0 working hours")

  // Full day: 08:00 to 17:30 = 8.0h working
  const fullDay = calculateBusinessHoursBetween("2026-09-21T08:00:00", "2026-09-21T17:30:00", DEFAULT_WORK_SCHEDULE)
  assert.strictEqual(fullDay, 8.0, "Full working day should be exactly 8.0 hours")

  // Across weekend: Friday 16:30 (2026-09-25) to Monday 09:00 (2026-09-28)
  // Friday: 16:30 to 17:30 = 1.0h
  // Saturday & Sunday: 0h
  // Monday: 08:00 to 09:00 = 1.0h
  // Total = 2.0h
  const crossWeekendWork = calculateBusinessHoursBetween("2026-09-25T16:30:00", "2026-09-28T09:00:00", DEFAULT_WORK_SCHEDULE)
  assert.strictEqual(crossWeekendWork, 2.0, "Friday 16:30 to Monday 09:00 should be 2.0 working hours")

  // --- TEST 5: calculateSlaElapsedHours (SLA Timer Weekend & Holiday Exclusion) ---
  console.log("✓ Test 5: Verifying calculateSlaElapsedHours (excluding 48h weekends & holidays)")
  // Friday 15:00 (2026-09-25) to Monday 10:00 (2026-09-28)
  // Total clock time: 67 hours.
  // Weekend days: Saturday (24h) + Sunday (24h) = 48h.
  // Net SLA elapsed: 67 - 48 = 19.0h!
  const friToMonSla = calculateSlaElapsedHours("2026-09-25T15:00:00", "2026-09-28T10:00:00", DEFAULT_WORK_SCHEDULE)
  assert.strictEqual(friToMonSla, 19.0, "Friday 15:00 to Monday 10:00 must be 19.0 SLA hours (48h weekend deducted)")

  // At 19.0h elapsed with 24h SLA -> 5h remaining!
  assert.ok(friToMonSla < 24, "Should not exceed 24h SLA on Monday morning")

  // Across a public holiday:
  // Wednesday 10:00 (2026-04-29) to Friday 10:00 (2026-05-01 is Labor Day, 2026-04-30 is Liberation Day)
  // 48 hours clock - 24h (30/4) - 24h (1/5) = 0h elapsed!
  const holidaySla = calculateSlaElapsedHours("2026-04-30T00:00:00", "2026-05-02T00:00:00", DEFAULT_WORK_SCHEDULE)
  assert.strictEqual(holidaySla, 0, "48 hours over two consecutive public holidays must yield 0 SLA elapsed hours")

  // --- TEST 6: addBusinessDays ---
  console.log("✓ Test 6: Verifying addBusinessDays skips weekends and holidays")
  // Friday 2026-09-25 + 1 business day -> Monday 2026-09-28
  const fri = new Date("2026-09-25T10:00:00")
  const plusOneDay = addBusinessDays(fri, 1, DEFAULT_WORK_SCHEDULE)
  assert.strictEqual(plusOneDay.getDay(), 1, "Friday + 1 business day must be Monday")
  assert.strictEqual(plusOneDay.getDate(), 28)

  // Friday 2026-09-25 + 5 business days -> Friday 2026-10-02
  const plusFiveDays = addBusinessDays(fri, 5, DEFAULT_WORK_SCHEDULE)
  assert.strictEqual(plusFiveDays.getDay(), 5, "Friday + 5 business days must be next Friday")
  assert.strictEqual(plusFiveDays.getDate(), 2)

  // --- TEST 7: Custom Work Schedule Integration with SystemConfig ---
  console.log("✓ Test 7: Verifying custom work schedule persistence in SystemConfig")
  localStorage.clear()
  const customSchedule = {
    ...DEFAULT_WORK_SCHEDULE,
    workweek: ["Mo", "Tu", "We", "Th"], // 4-day workweek
    holidays: [
      ...DEFAULT_WORK_SCHEDULE.holidays,
      {
        id: "mb_anniversary",
        name: "Kỷ niệm ngày thành lập MBBank (04/11)",
        date: "2026-11-04",
        type: "internal_holiday",
        description: "Nghỉ lễ nội bộ toàn hệ thống MB",
      },
    ],
  }

  saveSystemConfig({ workSchedule: customSchedule }, "Admin Test")
  const loadedConfig = getSystemConfig()
  assert.deepStrictEqual(loadedConfig.workSchedule.workweek, ["Mo", "Tu", "We", "Th"])
  assert.strictEqual(loadedConfig.workSchedule.holidays.length, 12, "Should have 12 holidays including MB anniversary")

  // Friday is now a non-working day under 4-day workweek
  assert.strictEqual(isBusinessDay(new Date("2026-09-25T10:00:00"), loadedConfig.workSchedule), false)
  // --- TEST 8: Compensatory Workdays (Working on Saturdays/Sundays for holiday swap) ---
  console.log("✓ Test 8: Verifying compensatory working days (swap working on weekends)")
  // Normally 2026-08-29 is Saturday (non-working day)
  assert.strictEqual(isBusinessDay(new Date("2026-08-29T10:00:00"), DEFAULT_WORK_SCHEDULE), false)

  const scheduleWithCompensatory = {
    ...DEFAULT_WORK_SCHEDULE,
    holidays: [
      ...DEFAULT_WORK_SCHEDULE.holidays,
      {
        id: "lam_bu_quoc_khanh_2026",
        name: "Làm bù thứ Bảy (Hoán đổi Quốc khánh 2026)",
        date: "2026-08-29",
        type: "compensatory_workday",
        description: "Đi làm thứ Bảy để hoán đổi nghỉ liền kề ngày 01/09",
        compensatoryFor: "Nghỉ liền kề Quốc khánh 01/09",
      },
    ],
  }

  // Saturday 2026-08-29 is now recognized as a valid working day (SLA counts)
  assert.strictEqual(isBusinessDay(new Date("2026-08-29T10:00:00"), scheduleWithCompensatory), true)
  // Normal Saturday next week is still non-working day
  assert.strictEqual(isBusinessDay(new Date("2026-09-05T10:00:00"), scheduleWithCompensatory), false)

  // Working hours calculation on compensatory Saturday: 08:00 to 17:30 = 8.0h working
  const compHours = calculateBusinessHoursBetween("2026-08-29T08:00:00", "2026-08-29T17:30:00", scheduleWithCompensatory)
  assert.strictEqual(compHours, 8.0, "Compensatory Saturday must count 8.0 working hours")

  console.log("================================================================")
  console.log("  ALL 8 WORK SCHEDULE ENGINE TESTS PASSED SUCCESSFULLY! ✨      ")
  console.log("================================================================")
}

runWorkScheduleTests().catch((err) => {
  console.error("❌ Work Schedule Test Failed:", err)
  process.exit(1)
})
