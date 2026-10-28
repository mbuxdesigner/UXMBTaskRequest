# dashboard-analytics

- Dashboard page: `src/pages/TongQuanPage.tsx`; AI-Ops widgets and metrics under `src/components/dashboard/ai-ops/`, with `kpiMetrics.ts` observed. Confidence: verified.
- Access/privacy helpers: `src/lib/accessControl.ts`; task read/normalization boundary: `src/services/googleSheetService.ts`. Confidence: verified.
- Product filtering, KPI definitions, masked titles, and zero-mock-data claims are described in `doc/features/dashboard.md`; verify selectors/derived data and task access for the edited view. Confidence: documented.
