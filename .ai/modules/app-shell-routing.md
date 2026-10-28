# app-shell-routing

- Entrypoints: `index.html` loads `src/main.tsx`; `src/main.tsx` mounts `src/App.tsx`; `@/*` maps to `src/*` (`tsconfig.json`, `vite.config.ts`). Confidence: verified.
- Pages are lazy-loaded in `src/App.tsx`; page ids are `Page` in `src/components/Sidebar.tsx:41`. Confidence: verified.
- Nav visibility/order and hashes: `src/config/navVisibilityConfig.ts`. Confidence: verified.
- Real-time/task events: `BroadcastChannel("ux_portal_realtime_sync")`, `storage` fallback, and DOM events `ux_task_realtime_update` / `ux_data_refreshed` in `src/services/realtimeSyncService.ts`. Confidence: verified.
- Additional DOM/system event names in docs (`auth_session_changed`, `nav_visibility_changed`, etc.) are documented, not re-verified here. Confidence: documented.
- Touch only what the route needs; verify current hash/page and event listeners before edits.
