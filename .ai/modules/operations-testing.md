# operations-testing

- Scripts/build/test/deploy contracts: `package.json`, `vite.config.ts`, `vercel.json`, `.env.example`, `.github/`, `api/`. Confidence: verified.
- Tests: root `test-*.mjs`, `tests/*.mjs`, and Vitest `*.test.ts`; eval entry `scripts/run-ai-evaluation.mjs`; fixtures under `tests/fixtures/`. Confidence: verified for paths observed.
- Published readiness/methodology: `TEST_READY.md`, `TEST_INFRA.md`, `doc/operations/`, `doc/quality/`; historical pass counts are not current evidence. Confidence: documented.
- Use `pnpm run build` after relevant code changes; use targeted test first, then repository aggregate only when scope warrants it.
- Keep environment secrets out of source/metadata; `.env.example` only names variables.
