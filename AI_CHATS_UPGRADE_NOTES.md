# AI Chats Upgrade Notes

> **Branch:** `fix/ai-chats-audit`
> **Release candidate:** 2026-10-05
> **Scope:** Task information + approved regulations/standards, read-only

## What changed

### Designer experience

- Reduced empty-state operations to two relevant groups: `Thông tin Task` and `Quy định & Quy chuẩn`.
- Rewrote suggested prompts around fields Designers need to make decisions.
- Softened selected pills, headings and recent-chat typography.
- Removed untrusted browser quota presentation from the default UI.

### Conversation quality

- Added task resolution by request ID, nickname and title.
- Preserved active-task memory for contextual follow-ups.
- Added ambiguity handling instead of silently choosing a task.
- Added task ID grounding and loaded-source disclosure.
- Normalized Vietnamese/ISO task dates and selected the latest update by timestamp.
- Treated retrieved documents as untrusted data, not instructions.
- Restricted official regulation retrieval to approved custom artifacts.

### Security and privacy

- Made production gateway authentication fail-closed.
- Removed direct browser calls to OpenRouter/Gemini and purged legacy client keys.
- Added model/payload bounds, origin checks and distributed Upstash rate limiting.
- Changed GAS session verification from URL query parameters to POST body.
- Required authenticated POST for task retrieval, cloud chat and uploads.
- Added server-side task role filtering and per-user task cache.
- Made cloud chat opt-in, private and sanitized before persistence.
- Hardened Mermaid rendering with strict mode and SVG sanitization.

### Delivery quality

- CI now installs with frozen pnpm lockfile, runs AI intelligence tests and builds on PR/develop/fix branches.
- Upgraded `xlsx` to the maintained SheetJS distribution.
- Added/updated AI conversation and security audit tests.

## Verification snapshot

| Command | Result |
|---|---|
| `pnpm run test:ai-intelligence` | 15/15 pass |
| `node --experimental-strip-types tests/test-ai-chats-e2e-and-audit.mjs` | 176/176 pass |
| `pnpm run build` | Pass |
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm audit --prod` | No known vulnerabilities |
| `git diff --check` | Pass |

## Deployment requirements

Set server-side `OPENROUTER_API_KEY`, `GAS_EXEC_URL`, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Keep `ALLOW_UNAUTHENTICATED_AI_DEV` unset/false outside local development. Never define provider secrets with a `VITE_` prefix.

## Known limitations

- Design Owner scope is broad until session data carries assigned squads/products.
- The repository-wide `pnpm test` runner has a pre-existing Node ESM extension-resolution failure in `googleSheetService.ts`.
- Production approval requires staging UAT with real role accounts and configured infrastructure.

## Related documents

- `doc/features/14_AI_CHATS_AND_INTELLIGENT_COPILOT.md`
- `doc/reports/2026-10-05_AI_CHATS_AUDIT_AND_HARDENING_REPORT.md`
- `doc/AI_CHAT_SECURITY_AND_DEPLOYMENT_RUNBOOK.md`
- `doc/AI_CHAT_UAT_AND_ACCEPTANCE_CHECKLIST.md`

**Last Updated:** 2026-10-05
