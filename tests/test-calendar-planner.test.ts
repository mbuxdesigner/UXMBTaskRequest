import { describe, it, expect, beforeEach } from "vitest"

// Mock localStorage & window for Node environment
const storageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(globalThis, "localStorage", {
  value: storageMock,
  writable: true,
})

if (typeof (globalThis as any).window === "undefined") {
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: storageMock,
      dispatchEvent: () => true,
    },
    writable: true,
  })
}

import {
  normalizeDateToYMD,
  isDateInRange,
  updateTaskDeadlineWithLog,
  addTeamEvent,
  updateTeamEvent,
  deleteTeamEvent,
  isPersonOnLeave,
  getLocalUXRequests,
  computeCalendarWeeks,
} from "../src/services/calendarService"
import { TeamLeaveRecord } from "../src/services/leaveService"
import { UXRequest } from "../src/data/mockData"
import { getSystemConfig, saveSystemConfig, DEFAULT_SYSTEM_CONFIG } from "../src/config/systemConfig"

describe("UX Team Planner & Calendar Test Suite", () => {
  beforeEach(() => {
    localStorage.clear()
    saveSystemConfig(DEFAULT_SYSTEM_CONFIG)
  })

  describe("Date Normalization & Range Helpers", () => {
    it("should normalize YYYY-MM-DD strings correctly", () => {
      expect(normalizeDateToYMD("2026-09-24")).toBe("2026-09-24")
      expect(normalizeDateToYMD("2026-09-24T10:30:00.000Z")).toBe("2026-09-24")
    })

    it("should normalize DD/MM/YYYY strings correctly", () => {
      expect(normalizeDateToYMD("24/09/2026")).toBe("2026-09-24")
      expect(normalizeDateToYMD("5/9/2026")).toBe("2026-09-05")
    })

    it("should normalize Date instances correctly", () => {
      const d = new Date(2026, 8, 25) // Month is 0-indexed, 8 = Sep
      expect(normalizeDateToYMD(d)).toBe("2026-09-25")
    })

    it("should verify date range inclusion", () => {
      expect(isDateInRange("2026-09-25", "2026-09-20", "2026-09-30")).toBe(true)
      expect(isDateInRange("2026-09-19", "2026-09-20", "2026-09-30")).toBe(false)
      expect(isDateInRange("2026-09-31", "2026-09-20", "2026-09-30")).toBe(false)
    })
  })

  describe("Task Deadline Update & Activity Logging", () => {
    it("should update task deadline and record an activity log in task_updates", () => {
      const initialTask: UXRequest = {
        request_id: "REQ-2026-001",
        title: "Thiết kế luồng thanh toán QR đa năng",
        product: "App MBBank",
        request_type: "Tính năng mới",
        feature_journey: "Thanh toán",
        description: "Mô tả bài toán",
        business_need: "Tăng trưởng doanh số",
        user_problem: "Khách hàng thao tác chậm",
        target_user: "Khách hàng cá nhân",
        expected_output: ["Figma UI"],
        expected_deadline: "2026-09-25",
        deadline_reason: "Chiến dịch quý 3",
        preferred_squad: "Squad Thanh Toán",
        squad_name: "Squad Thanh Toán",
        requester_email: "po@mbbank.com.vn",
        ux_owner: "Lead UX",
        current_phase: "Khâu 4: UI Design",
        status: "Đang thực hiện",
        progress: 60,
        last_updated: "2026-09-20T08:00:00.000Z",
        phases: [],
        latest_update: { date: "2026-09-20", note: "Bắt đầu" },
        deliverables: {},
        submitted_at: "2026-09-15T08:00:00.000Z",
        task_updates: [],
      }

      localStorage.setItem("ux_portal_real_requests", JSON.stringify([initialTask]))

      const session = {
        sessionToken: "token-1",
        personalEmail: "designer@mbbank.com.vn",
        teamsEmail: "designer@mbbank.com.vn",
        displayName: "Trần Designer",
        role: "Designer" as const,
        expiresAt: Date.now() + 86400000,
        sessionPolicy: "sliding_24h" as const,
        loginAt: Date.now(),
        lastActiveAt: Date.now(),
      }

      const res = updateTaskDeadlineWithLog(
        "REQ-2026-001",
        "2026-09-30",
        session,
        "Squad cần thêm thời gian test sinh trắc học"
      )

      expect(res.success).toBe(true)
      expect(res.task?.expected_deadline).toBe("2026-09-30")
      expect(res.task?.design_deadline).toBe("2026-09-30")

      // Kiểm tra Activity Log
      expect(res.task?.task_updates).toBeDefined()
      expect(res.task?.task_updates?.length).toBe(1)
      const log = res.task?.task_updates?.[0]
      expect(log?.request_id).toBe("REQ-2026-001")
      expect(log?.updated_by).toBe("Trần Designer")
      expect(log?.author_role).toBe("Designer")
      expect(log?.note).toContain("2026-09-25")
      expect(log?.note).toContain("2026-09-30")
      expect(log?.note).toContain("Squad cần thêm thời gian test sinh trắc học")

      // Kiểm tra trong localStorage
      const updatedList = getLocalUXRequests()
      expect(updatedList[0].expected_deadline).toBe("2026-09-30")
      expect(updatedList[0].task_updates?.length).toBe(1)
    })
  })

  describe("Leave Conflict Detection", () => {
    it("should detect when a person is on leave on a given date", () => {
      const mockLeaves: TeamLeaveRecord[] = [
        {
          id: "lv-1",
          rowNumber: 2,
          account: "cuongnm",
          fullName: "Nguyễn Mạnh Cường",
          email: "manhcuong1340@gmail.com",
          fromDate: "2026-09-25",
          toDate: "2026-09-25",
          shift: "Cả ngày",
          reason: "Nghỉ phép cá nhân",
        },
        {
          id: "lv-2",
          rowNumber: 3,
          account: "hieunt",
          fullName: "Nguyễn Trung Hiếu",
          email: "hieunt@mbbank.com.vn",
          fromDate: "2026-09-28",
          toDate: "2026-09-30",
          shift: "3 ngày",
          reason: "Đi công tác nước ngoài",
        },
      ]

      // Kiểm tra Cường nghỉ ngày 25/09
      const check1 = isPersonOnLeave(mockLeaves, "Nguyễn Mạnh Cường", "2026-09-25")
      expect(check1.onLeave).toBe(true)
      expect(check1.leaveRecord?.fullName).toBe("Nguyễn Mạnh Cường")

      // Kiểm tra Cường không nghỉ ngày 26/09
      const check2 = isPersonOnLeave(mockLeaves, "Nguyễn Mạnh Cường", "2026-09-26")
      expect(check2.onLeave).toBe(false)

      // Kiểm tra Hiếu nghỉ trong khoảng 28/09 - 30/09
      const check3 = isPersonOnLeave(mockLeaves, "hieunt@mbbank.com.vn", "2026-09-29")
      expect(check3.onLeave).toBe(true)
    })
  })

  describe("Team Events Management (CRUD)", () => {
    it("should create, update, and delete team events", () => {
      const session = {
        sessionToken: "token-admin",
        personalEmail: "admin@mbbank.com.vn",
        teamsEmail: "admin@mbbank.com.vn",
        displayName: "Admin Hệ Thống",
        role: "Admin" as const,
        expiresAt: Date.now() + 86400000,
        sessionPolicy: "fixed_8h" as const,
        loginAt: Date.now(),
        lastActiveAt: Date.now(),
      }

      // 1. Create
      const created = addTeamEvent(
        {
          title: "Design Review Sprint 25",
          categoryId: "cat-review",
          startDate: "2026-09-28T09:00",
          endDate: "2026-09-28T10:30",
          allDay: false,
          attendees: ["designer@mbbank.com.vn"],
          location: "Phòng Họp A1",
          description: "Đánh giá luồng giao diện",
        },
        session
      )

      expect(created.id).toBeDefined()
      expect(created.title).toBe("Design Review Sprint 25")

      let cfg = getSystemConfig()
      const found = cfg.calendar.teamEvents.find((e) => e.id === created.id)
      expect(found).toBeDefined()

      // 2. Update
      const updated = {
        ...created,
        title: "Design Review Sprint 25 (Đổi giờ)",
        location: "Phòng Họp B2",
      }
      const updateRes = updateTeamEvent(updated, session)
      expect(updateRes).toBe(true)

      cfg = getSystemConfig()
      const updatedFound = cfg.calendar.teamEvents.find((e) => e.id === created.id)
      expect(updatedFound?.title).toBe("Design Review Sprint 25 (Đổi giờ)")
      expect(updatedFound?.location).toBe("Phòng Họp B2")

      // 3. Delete
      const deleteRes = deleteTeamEvent(created.id)
      expect(deleteRes).toBe(true)

      cfg = getSystemConfig()
      const deletedFound = cfg.calendar.teamEvents.find((e) => e.id === created.id)
      expect(deletedFound).toBeUndefined()
    })
  })

  describe("Calendar Configuration & Role Permissions", () => {
    it("should store and retrieve calendar configuration correctly", () => {
      const cfg = getSystemConfig()
      expect(cfg.calendar).toBeDefined()
      expect(cfg.calendar.defaultView).toBe("month")
      expect(cfg.calendar.startOfWeek).toBe("monday")
      expect(cfg.calendar.enableConflictAlert).toBe(true)
      expect(cfg.calendar.rolePermissions.viewCalendar).toContain("Admin")
      expect(cfg.calendar.rolePermissions.viewCalendar).toContain("Designer")
    })
  })

  describe("Calendar Grid Week Calculation (5-day vs 7-day)", () => {
    it("should generate 5 days per week when showWeekends is false (ClickUp Planner standard)", () => {
      const date = new Date(2026, 8, 23) // Sep 23, 2026
      const weeks = computeCalendarWeeks(date, false)

      expect(weeks.length).toBeGreaterThanOrEqual(5)
      // Every week row must have exactly 5 days (Mon to Fri)
      weeks.forEach((w) => {
        expect(w.days.length).toBe(5)
        expect(w.days[0].dayOfWeekIndex).toBe(0) // Mon
        expect(w.days[4].dayOfWeekIndex).toBe(4) // Fri
      })
    })

    it("should generate 7 days per week when showWeekends is true", () => {
      const date = new Date(2026, 8, 23) // Sep 23, 2026
      const weeks = computeCalendarWeeks(date, true)

      expect(weeks.length).toBeGreaterThanOrEqual(5)
      // Every week row must have exactly 7 days (Mon to Sun)
      weeks.forEach((w) => {
        expect(w.days.length).toBe(7)
        expect(w.days[0].dayOfWeekIndex).toBe(0) // Mon
        expect(w.days[6].dayOfWeekIndex).toBe(6) // Sun
      })
    })

    it("should correctly identify the first day of a month (for black pill badge Oct 1)", () => {
      const date = new Date(2026, 8, 23) // Sep 23, 2026
      const weeks = computeCalendarWeeks(date, false)

      // Oct 1, 2026 is Thursday (dayOfWeekIndex = 3)
      let oct1Found = false
      weeks.forEach((w) => {
        w.days.forEach((d) => {
          if (d.dateYMD === "2026-10-01") {
            oct1Found = true
            expect(d.isFirstOfMonth).toBe(true)
            expect(d.monthShort).toBe("Oct")
            expect(d.dayNumber).toBe(1)
            expect(d.dayOfWeekIndex).toBe(3) // Thursday
          }
        })
      })
      expect(oct1Found).toBe(true)
    })
  })
})

