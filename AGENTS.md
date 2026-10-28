# AGENTS.md — UXMB Task Request Portal

Use `.ai/project-map.yaml` for verified repository boundaries and `.ai/task-routes.yaml` to load only task-relevant context. Read the module note before source edits; verify current implementation because docs can be stale.

- App: React 19 + TypeScript + Vite 8 SPA; HTML entry `index.html` loads `src/main.tsx`, which mounts `src/App.tsx`.
- Routes/pages are lazy-loaded from `src/App.tsx`; page ids live in `src/components/Sidebar.tsx`.
- API boundaries: browser services under `src/services/`; Vercel handlers under `api/`; Google Apps Script source is root `google-apps-script-backend.js` and deploys separately.
- Before changing behavior, inspect the current source and run the targeted test(s); then `pnpm run build`. `pnpm test` runs the repository aggregate suite.
- Do not put secrets in source or metadata. `.env.example` documents variable names; `.env*` local values are not documentation inputs.
- Do not treat `doc/archive/` as current specification. Use current feature docs as orientation, then verify behavior in source.
- Avoid loading all of `src/` or all docs by default. Follow `.ai/task-routes.yaml` and imports from the affected public boundary.

Metadata confidence is explicit: `verified` means checked against current source/manifests; `documented` means stated in project docs only; `unverified` means not independently established.
