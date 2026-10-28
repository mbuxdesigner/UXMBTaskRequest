# request-creation

- Flow UI: `src/pages/CreateRequestPage.tsx` and form components under `src/components/form/`. Confidence: verified for directory/page presence.
- Config: `src/config/formConfig.ts` for fields, options, storage key `ux_portal_form_config_v1`, and event `mbbank_form_config_changed`. Confidence: verified.
- Persistence/upload path: `src/services/googleSheetService.ts` and GAS actions such as `log_request`, `create`, `upload_file`. Confidence: verified for client service and GAS action-name presence.
- Product/squad filtering, attachments, autosave, and celebrations are documented in `doc/features/request-creation.md`; verify current form/service code before behavior changes. Confidence: documented.
