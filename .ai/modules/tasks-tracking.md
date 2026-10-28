# tasks-tracking

- Primary UI: `src/pages/TrackRequestPage.tsx` plus `src/components/track/RequestDetail.tsx`; Kanban implementation under `src/components/kanban/` was observed in repository listing. Confidence: verified for listed boundaries.
- Status/pending/priority semantics: `src/config/statusConfig.ts` exports `STATUS_CONFIG`, pending classification, capacity config, and priority formatters. Confidence: verified.
- Domain models: `UXRequest` and related types in `src/data/mockData.ts`. Confidence: verified.
- Sheet persistence/normalization: `src/services/googleSheetService.ts`; nickname-safe merge helpers in `src/lib/nicknameSync.ts`. Confidence: verified.
- Freeze/reject, `@SenToPO`, SLA countdowns, and view-specific rules are documented in `doc/features/task-management.md`; verify current component logic before edits. Confidence: documented.
