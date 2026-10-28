# admin-masterdata

- Admin UI: `src/pages/QuanLyPage.tsx`; tab components under `src/components/admin/` were observed in repository listing. Confidence: verified for listed boundaries.
- System config: `src/config/systemConfig.ts` for SLA/capacity/priorities/notifications/work schedule plus JSON export/import and event `mbbank_system_config_changed`. Confidence: verified.
- Notifications: `src/config/notificationTemplates.ts`; form admin config: `src/config/formConfig.ts`. Confidence: verified.
- Master-data sync, squad/product RBAC pickers, and backup semantics are documented in `doc/architecture/data-storage/master-data-sync.md`; verify current GAS merge logic before schema changes. Confidence: documented.
