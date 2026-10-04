# TEST READY — AI Chats E2E, Security, UX & Audit Test Suite

> **Status**: READY FOR VERIFICATION & REGRESSION TESTING  
> **Published At**: 2026-10-04T06:50:00Z  
> **Runner Entrypoint**: `node tests/test-ai-chats-e2e-and-audit.mjs`  
> **Subsystem**: AI Chats & Intelligent Copilot (`uxmb-task-request`)  
> **Requirements Covered**: R1, R2, R3, R4, R5 (ORIGINAL_REQUEST.md 2026-10-04T03:51:06Z, PROJECT.md, TEST_INFRA.md & Parent Directives)  
> **Coverage**: 100% across Tiers 1–4, Direct Module Integrations, M4 Module Expansions & Static Codebase Audit (145 automated test assertions, 0 failures, Exit Code 0)  

---

## 1. Test Suite Execution Summary

The comprehensive automated test suite runner `tests/test-ai-chats-e2e-and-audit.mjs` has been expanded and verified. It executes via native Node.js ESM in ~130ms with deterministic assertion success, zero browser flakiness, and zero external network dependencies.

```
================================================================================
UXMB TASK REQUEST — AI CHATS E2E & SECURITY AUDIT TEST SUMMARY
================================================================================
Tier 1 (Feature Coverage):            51/51 Passed (100.0%)
Tier 2 (Boundary & Corner Cases):     49/49 Passed (100.0%)
Tier 3 (Cross-Feature Combinations):   6/6 Passed (100.0%)
Tier 4 (Real-World Scenarios):         6/6 Passed (100.0%)
Direct Module Integrations:           28/28 Passed (100.0%)
Static Audit (Codebase Integrity):     5/5 Passed (100.0%)
--------------------------------------------------------------------------------
TOTAL TESTS EXECUTED:   145
TOTAL TESTS PASSED:     145 (100.0%)
TOTAL TESTS FAILED:     0
TOTAL EXECUTION TIME:   ~130ms
================================================================================
🎉 ALL 145 TESTS PASSED CLEANLY (Exit Code 0)
```

---

## 2. Four-Tier Coverage Checklist

### Tier 1: Feature Coverage (51 Test Cases)
- [x] **F1: API Key Client Bundle Safety & 503 Missing Key Error Handling** (6 tests)
  - `T1.F1.01`: Client bundle guard: in production mode (`DEV === false`), `INITIAL_GEMINI_KEY` and `getNextActiveKey` in `src/services/aiService.ts` evaluate to empty string `""`; verified static DEV guard in source and zero env keys in `dist/assets`.
  - `T1.F1.02`: Client bundle guard: in development mode (`DEV === true`), verifies `src/services/aiService.ts` contains DEV fallback reading `VITE_OPENROUTER_API_KEY` and `VITE_GEMINI_API_KEY`, and exports storage key constants.
  - `T1.F1.03`: Production routing: verifies `aiService.ts:testAIConnection` in production mode routes exclusively to `/api/ai-gateway` (POST) and blocks direct call fallback to `openrouter.ai`.
  - `T1.F1.04`: Missing server key detection: returns HTTP 503 with code `MISSING_SERVER_API_KEY`.
  - `T1.F1.05`: Friendly Vietnamese error message returned for missing server key without silent fake offline replies.
  - `T1.F1.06`: Gemini API key is guarded with `DEV` environment flag (`INITIAL_GEMINI_KEY === ""` in production/node environment, verified DEV guard in source).
- [x] **F2: Gateway Caller Auth & Feature Flag `AI_GATEWAY_AUTH_REQUIRED`** (8 tests)
  - `T1.F2.01`: Gateway auth: flag `'false'` permits request without session token (safe dev default).
  - `T1.F2.02`: Gateway auth: flag unset/undefined permits request without session token.
  - `T1.F2.03`: Gateway auth: flag `'true'` rejects request without Authorization header with HTTP 401.
  - `T1.F2.04`: Gateway auth: flag `'true'` rejects malformed session token format with HTTP 401.
  - `T1.F2.05`: Gateway auth: flag `'true'` accepts valid registered session token `ST_[a-f0-9]{16}`.
  - `T1.F2.06`: Gateway auth: extracts token with mixed-case Bearer scheme correctly.
  - `T1.F2.07`: Gateway auth [Directive]: forged token with valid format `ST_...` but unissued is STRICTLY REJECTED with 401.
  - `T1.F2.08`: Gateway auth [Directive]: forged dummy token `ST_0000000000000000` is rejected with 401.
- [x] **F3: Gateway Sliding Window Rate Limiting** (6 tests)
  - `T1.F3.01`: Rate limiter: requests 1 to 20 pass within 60-second window.
  - `T1.F3.02`: Rate limiter: request 21 within 60-second window is rejected with HTTP 429.
  - `T1.F3.03`: Rate limiter: 429 response body contains required Vietnamese message: `"Quá giới hạn tần suất yêu cầu (tối đa 20 yêu cầu/phút). Vui lòng thử lại sau giây lát."`.
  - `T1.F3.04`: Rate limiter: client isolation ensures Client A limit does not block Client B.
  - `T1.F3.05`: Rate limiter: timestamps older than 60,000ms expire and allow new requests.
  - `T1.F3.06`: Rate limiter [Directive]: session token based in-memory isolation behaves deterministically without cross-token bleed.
- [x] **F4: PII Masking Engine** (6 tests)
  - `T1.F4.01`: PII masking: replaces email with `[EMAIL_1]` placeholder.
  - `T1.F4.02`: PII masking: replaces 10-digit Vietnamese phone numbers with `[PHONE_1]`.
  - `T1.F4.03`: PII masking: replaces 12-digit CCCD and 9-digit CMND with `[ID_1]`.
  - `T1.F4.04`: PII masking: replaces staff IDs (`MSNV_12345`, `NV67890`) with `[STAFF_ID_1]`.
  - `T1.F4.05`: Round-trip unmasking: `unmaskPii` accurately restores original text from mapping.
  - `T1.F4.06`: One-way sanitization: `sanitizeContextText` cleanses all PII without returning mapping.
- [x] **F5: MB Bank Persona & System Prompt Context** (5 tests)
  - `T1.F5.01`: Persona context: contains MB Bank brand identity and Design Ops Copilot role.
  - `T1.F5.02`: Persona context: contains MB Bank brand colors (`#1057FB`, `#ED1C24` / `#E60000`, `#072569`).
  - `T1.F5.03`: Persona context: defines the 7 Khâu UX MBBank workflow end-to-end.
  - `T1.F5.04`: Persona context: contains SLA 24h PO response rule and PO Pending status.
  - `T1.F5.05`: Persona context: defines ReUI 4-level border radius rules (`8px`, `12px`, `16px`, `9999px`) and forbids `rounded-3xl` for enterprise modals.
- [x] **F6: Context Limit & Clipping (Adaptive Budget)** (5 tests)
  - `T1.F6.01`: Adaptive context: documents <= 2,000 chars are preserved completely with `TOÀN VĂN ĐẦY ĐỦ` metadata.
  - `T1.F6.02`: Adaptive context: 4.8 KB 7 Khâu UX doc (>2,000 chars) is NOT clipped to 2,000 chars.
  - `T1.F6.03`: Adaptive context: target artifact receives up to 16,000 character budget.
  - `T1.F6.04`: Adaptive context: multi-document allocation prioritizes target doc over secondary docs.
  - `T1.F6.05`: Adaptive context: truncation metadata emitted accurately when document exceeds 16,000 chars.
- [x] **F7: Defensive Parsing** (5 tests)
  - `T1.F7.01`: Defensive parsing: action card JSON missing `items` safely defaults to empty array without crashing.
  - `T1.F7.02`: Defensive parsing: sources payload where docs is an object or primitive does not throw `docs.map` error.
  - `T1.F7.03`: Defensive parsing: chart data with `NaN` or non-finite numbers is sanitized to prevent SVG crash.
  - `T1.F7.04`: Defensive parsing: resilient JSON extractor recovers JSON from markdown code fence.
  - `T1.F7.05`: Defensive parsing: extracts inline markdown tokens (bold, italic, code) safely.
- [x] **F8: Figma Clean Text Export & TSV Formatter** (5 tests)
  - `T1.F8.01`: Figma clean export: strips markdown headings (`#`, `##`, `###`) while preserving title text.
  - `T1.F8.02`: Figma clean export: strips bold, italic, and inline code formatting for clean Figma text boxes.
  - `T1.F8.03`: Figma clean export: converts markdown lists into clean bullet characters (`•`).
  - `T1.F8.04`: Figma clean export: converts markdown link syntax `[Label](url)` into clean `Label` text.
  - `T1.F8.05`: Figma table export: converts markdown table into TSV with tab delimiters and newlines.
- [x] **F9: Vietnamese Error Translation & Retry Handling** (5 tests)
  - `T1.F9.01`: Error translation: HTTP 401 translates to Vietnamese session expiry message.
  - `T1.F9.02`: Error translation: HTTP 429 translates to Vietnamese rate limit message.
  - `T1.F9.03`: Error translation: HTTP 503 translates to Vietnamese missing API key configuration message.
  - `T1.F9.04`: Error translation: Network offline / `Failed to fetch` translates to Vietnamese connection message.
  - `T1.F9.05`: Retry state machine: retains original user prompt and transitions state on retry.

---

### Tier 2: Boundary & Corner Cases (49 Test Cases)
- [x] **F1 Boundary (B1)** (6 tests): Empty string server API key, whitespace-only keys, comma-separated key pool with empty slots, `import.meta.env` undefined handling, key pool deduplication, raw OpenRouter key pattern audit.
- [x] **F2 Boundary (B2)** (6 tests): Empty string Authorization header, missing Bearer prefix, invalid non-hex tokens, off-by-one token lengths (15 & 17 hex chars), whitespace trimming, case-insensitive hex tokens.
- [x] **F3 Boundary (B3)** (6 tests): 59,999ms boundary check (20th passes, 21st fails), rapid burst of 30 concurrent requests (20 pass, 10 fail), partial window slide expiry, 60,001ms complete reset, fallback bucket safety, multi-tenant concurrency stress.
- [x] **F4 Boundary (B4)** (6 tests): Empty string input, massive 50,000 character string (<200ms), multi-PII in single sentence, international Vietnamese phone formats (+84, 84, 0084), false positive avoidance (calendar years, ports, semver), identical tokens token index mapping.
- [x] **F5 Boundary (B5)** (5 tests): Persona prompt bounded (<3,500 chars / <700 tokens), empty user query handling, Vietnamese diacritics integrity, prompt injection containment, missing optional intelligence fields defaults.
- [x] **F6 Boundary (B6)** (5 tests): Exact 2,000 char boundary, exact 2,001 char boundary, massive 100,000 char document clipping to 16k chars with metadata, empty artifact content, multiple large artifacts aggregate capping.
- [x] **F7 Boundary (B7)** (5 tests): Severely corrupted JSON syntax, `items` explicitly null, sources payload with primitive `docs`, unclosed code fence recovery, deeply nested JSON (depth > 50).
- [x] **F8 Boundary (B8)** (5 tests): Empty markdown input, plain text passthrough, table with uneven columns, table with empty cells, mixed markdown with headings, lists, quotes, and tables.
- [x] **F9 Boundary (B9)** (5 tests): HTTP 500/502/504 errors mapped to friendly server error, empty or undefined status code, user AbortError exclusion from error UI, raw HTML sanitized, rapid double retry idempotency.

---

### Tier 3: Cross-Feature Combinations (6 Test Cases)
- [x] `T3.P01`: **PII Masking + Task Context Serialization**: Task list with real emails, phones, and names is serialized and verified 100% free of raw sensitive tokens.
- [x] `T3.P02`: **Gateway Auth + Sliding Window Rate Limiting under load**: Client with valid session token is subjected to rate limiting; valid auth admitted, 21st request rejected with 429.
- [x] `T3.P03`: **Malformed LLM Output + Error Translation & Retry**: Corrupted JSON stream intercepted by defensive parser, triggers friendly Vietnamese notification, and provides retry button.
- [x] `T3.P04`: **Adaptive Context Clipping + PII Sanitization**: 10,000 character artifact with embedded employee IDs and phones is both bounded by budget and stripped of PII.
- [x] `T3.P05`: **Figma Clean Text Export + Defensive Table Parsing**: Table with broken rows and malformed syntax safely converted to TSV without throwing.
- [x] `T3.P06`: **Production Client Guard + Gateway 503 Missing Key Response**: Production client routes to gateway, receives 503, and translates to administrator setup guide.

---

### Tier 4: Real-World Acceptance Scenarios (6 Test Cases)
- [x] `T4.S01`: **Scenario 1 - Designer queries 7 Khâu UX with Seed Artifact**: Enriched prompt with MB persona, 4.8 KB artifact loaded without truncation, Khâu 6 & 7 preserved, clean response formatted for Figma.
- [x] `T4.S02`: **Scenario 2 - Task Context with Sensitive Designer Contact Info**: Task details with real email and phone serialized, PII masked, verified clean of raw info, round-trip unmasked on response.
- [x] `T4.S03`: **Scenario 3 - Gateway Auth Rejection and Recovery**: Initial unauthenticated request rejected with 401, client attaches session token `ST_9f8e7d6c5b4a3210`, second request admitted and succeeds.
- [x] `T4.S04`: **Scenario 4 - Exporting Complex Design System Table to Figma**: Assistant generates Design System token table, designer exports to TSV, verifies tab columns and auto-layout ready format.
- [x] `T4.S05`: **Scenario 5 - Burst Ideation Exceeding Rate Limit with Cooldown Retry**: 20 rapid queries succeed, 21st receives 429 error with Vietnamese message, retry succeeds after window cooldown.
- [x] `T4.S06`: **Scenario 6 - Aborting Streaming Mid-Response with Clean Resource Disposal**: Designer cancels stream midway; abort signal fires, resource cleanup verified, no memory leak or pending state lock.

---

### Direct Module Integrations & Expansions (28 Test Cases)
- [x] `INT-PII-01`: `src/lib/piiMasker.ts` `maskPii` correctly masks email and phone numbers.
- [x] `INT-PII-02`: `src/lib/piiMasker.ts` `unmaskPii` accurately restores masked text back to original.
- [x] `INT-PII-03`: `src/lib/piiMasker.ts` `sanitizeContextText` cleanses PII without exposing reverse mapping.
- [x] `INT-PII-04`: `src/lib/piiMasker.ts` international phone (+84 spaces/dashes/parentheses), spaced CCCD, CMND before 'đ' words masked properly, and currency preserved.
- [x] `INT-GW-01`: `api/ai-gateway.ts` `validateSessionToken` accepts `ST_[a-f0-9]{16}` and rejects invalid formats.
- [x] `INT-GW-02`: `api/ai-gateway.ts` `checkRateLimit` enforces 20 req/min sliding window limit.
- [x] `INT-GW-03`: `api/ai-gateway.ts` `checkRateLimit` isolates distinct identifiers in memory.
- [x] `INT-GW-04`: `api/ai-gateway.ts` `verifySessionToken` accepts registered genuine session (`registerValidSession`).
- [x] `INT-GW-05`: `api/ai-gateway.ts` `verifySessionToken` rejects unissued forged tokens even with valid `ST_` regex format (anti-forgery).
- [x] `INT-GW-06`: `api/ai-gateway.ts` `verifySessionToken` rejects malformed and non-hex tokens fast-path.
- [x] `INT-GW-07`: `api/ai-gateway.ts` `clearSessionCache` invalidates previously cached trusted sessions.
- [x] `INT-GW-08`: `api/ai-gateway.ts` default handler enforces genuine caller auth via HTTP Request when flag enabled (401 for forged, passes genuine and local dev).
- [x] `INT-GW-09`: `api/ai-gateway.ts` `verifySessionToken` checks Google Apps Script backend when un-cached, hits in-memory cache within TTL.
- [x] `INT-FIGMA-01`: `src/lib/figmaExportUtils.ts` `formatMarkdownForFigmaText` strips fenced code blocks without leaking tags, double backticks, or cross-block greedy regex contamination.
- [x] `INT-FIGMA-02`: `src/lib/figmaExportUtils.ts` `formatMarkdownForFigmaText` preserves nested list indentation (2 spaces, 4 spaces, tabs, numbered).
- [x] `INT-FIGMA-03`: `src/lib/figmaExportUtils.ts` `exportTableToTSV` handles escaped pipes without column shattering (retains literal `\|` in cell content).
- [x] `INT-FIGMA-04`: `src/lib/figmaExportUtils.ts` `exportTableToTSV` pads ragged rows up to `maxCols` with tab delimiters.
- [x] `INT-FIGMA-05`: `src/lib/figmaExportUtils.ts` `formatMarkdownForFigmaText` strips headings, blockquotes, and links into clean typography text.
- [x] `INT-PROMPT-01`: `src/config/aiPrompts.ts` `serializeArtifactsContext` preserves full 4.8 KB seed artifact (`Quy-trinh-7-khau-UX-MBBank.md`), proving Khâu 6, Khâu 7, SLA policies, and NO 2,000 char cutoff.
- [x] `INT-PROMPT-02`: `src/config/aiPrompts.ts` `serializeArtifactsContext` enforces controlled truncation and metadata warning when exceeding 16,000 char budget.
- [x] `INT-PROMPT-03`: `src/config/aiPrompts.ts` `AI_PERSONA` contains MB Bank brand colors (`#1057FB`, `#ED1C24`), radii (`8px/12px/16px/9999px`), and 7 Khâu UX workflow.
- [x] `INT-PROMPT-04`: `src/config/aiPrompts.ts` `buildChatPrompt` injects `AI_PERSONA` into system prompt chunks.
- [x] `INT-PARSE-01`: Resilient parsing: action card with null or missing `items` array does not throw unhandled TypeError.
- [x] `INT-PARSE-02`: Resilient parsing: referenced docs parser handles plain object, null, or invalid structure gracefully.
- [x] `INT-EDIT-01`: Prompt edit history truncation: slicing messages at `msgIndex` prevents duplicate user bubbles and preserves clean context.
- [x] `INT-EDIT-02`: Prompt edit history truncation: editing root message (index 0) resets thread context completely.
- [x] `INT-ABORT-01`: Stream abort settlement: `AbortController` signal cleans up timers and rejects promise with `AbortError` without hanging.
- [x] `INT-ABORT-02`: Stream abort settlement: pre-aborted signal rejects immediately without hanging or creating timers.

---

### Static Codebase Audits (5 Test Cases)
- [x] `AUDIT-01`: Verify `.gitignore` preserves `.env.production` and `.env.development` whitelisting.
- [x] `AUDIT-02`: Verify `package.json` exists and contains valid test command and metadata.
- [x] `AUDIT-03`: Verify `api/ai-gateway.ts` exists and maintains edge runtime configuration.
- [x] `AUDIT-04`: Verify `src/config/aiPrompts.ts` exists and contains core prompt framework.
- [x] `AUDIT-05`: Verify `src/services/aiService.ts` exists and references AI gateway endpoint.

---

## 3. How to Run the Test Suite

```bash
# Run the complete AI Chats test suite:
node tests/test-ai-chats-e2e-and-audit.mjs

# Expected Output:
# Execution Time: ~0.13s
# Total Tests Run: 145
# Passed: 145
# Failed: 0
# Exit Code: 0
```
