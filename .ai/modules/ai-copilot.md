# ai-copilot

- Chat UI: `src/pages/AIChatPage.tsx`; streaming/quota client helpers: `src/services/aiService.ts`; retrieval approvals/metadata: `src/services/aiArtifactsService.ts`. Confidence: verified for file/interface presence.
- Prompts/router/context grounding: `src/config/aiPrompts.ts`, `src/lib/aiConversation.ts`, `src/lib/aiRetrievalPipeline.ts`, `src/lib/aiProjectState.ts`. Confidence: verified.
- Gateway: `api/ai-gateway.ts` with allowlisted models and `ST_[a-f0-9]{16}` session validation. Confidence: verified.
- Agent tools: `src/lib/aiTools.ts` defines `search_tasks`, `get_task_detail`, `search_documents`, `read_calendar`, and `compute_risks`; `src/pages/AIChatPage.tsx` executes up to 3 gateway rounds / 5 tool calls per query using already-loaded client data. Task scope remains bounded by the page's authorized task list; document search excludes unapproved artifacts. Confidence: verified in source.
- `api/ai-gateway.ts` now forwards allowlisted tool definitions and tool-call messages to the provider. Tool calls remain client-executed; no server-side data access or GAS deployment change was added. Provider tool-calling compatibility is not verified against production credentials/models.
- Thread memory stores a short conversation summary and bounded preferred squad/topic metadata in existing `conversationMemory`; chat cloud sync persists thread payloads through existing `save_chat_threads`/`get_chat_threads` actions. No separate memory store or schema migration was added.
- Empty chat shows an on-demand risk briefing from currently loaded, authorized tasks using `computeTaskMetrics`; it does not run a scheduled/background job.
- Existing trust policy remains documented in `doc/features/ai-copilot/`; verify auth, scope, rate limits, and cloud payload before changing AI/session behavior.
- Client AI key helpers may be legacy compatibility shims; do not use browser secrets as architecture.
