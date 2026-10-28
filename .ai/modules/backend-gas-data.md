# backend-gas-data

- Client gateway: `src/config/googleSheetConfig.ts` (`GATEWAY_PROXY_URL = "/api/gateway"`); server proxy: `api/gateway.ts`; AI gateway: `api/ai-gateway.ts`. Confidence: verified.
- Data boundary: `src/services/googleSheetService.ts`; GAS source: `google-apps-script-backend.js`. Confidence: verified for file/interface presence.
- GAS actions were observed by action-name match: GET includes `ping`, `get_selections`, `get_requests`, `get_team_members`, `get_tests`, `get_submissions`, `sync_projections`, init/drive/session/chat handlers; POST includes OTP, requests, search/logout, uploads, sync/save, tests, chat, and session endpoints. Confidence: partially verified by source text match, handler semantics unverified.
- Separate leave-sync backend: `google-apps-script-leave-sync.js`. Confidence: verified for file presence, semantics unverified.
- Do not assume backend handler behavior from action names; open the relevant GAS function before edits and redeploy separately.
