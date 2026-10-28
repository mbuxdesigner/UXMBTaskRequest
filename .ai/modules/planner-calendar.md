# planner-calendar

- Default calendar route lazy-loads `src/pages/DesignerPlannerPage.tsx`; legacy/team calendar page is `src/pages/CalendarPage.tsx`. Confidence: verified in `src/App.tsx`.
- Calendar services: `src/services/calendarService.ts`, `src/services/leaveService.ts`; planner pure logic: `src/lib/designerPlanner.ts`. Confidence: verified.
- Runtime config/types for calendar/events/work schedule: `src/config/systemConfig.ts`; leave record types: `src/types/leave.ts`. Confidence: verified.
- Planned date persistence, recurrence expansion, personal scoping, and notification persistence limits are described in `doc/features/planner-and-calendar.md`; verify source/backend contracts before edits. Confidence: documented.
