# ia-map

- Page/state: `src/pages/IAPage.tsx`, `src/hooks/useIATreeState.ts`, `src/types/ia.ts`; transform hook: `src/hooks/useCanvasTransform.ts`. Confidence: verified.
- Task linking: `src/components/track/TaskIALinkField.tsx` (path observed in current source refs) and `src/lib/iaTaskLink.ts`; cloud persistence goes through `src/services/googleSheetService.ts`. Confidence: verified for path/interface reference.
- Canvas node/connectors/toolbar components live under `src/components/ia/`. Confidence: verified by repository tree.
- Level caps, dirty-product merge, viewport culling, and 40k chunking are documented in `doc/features/information-architecture.md` and `doc/architecture/data-storage/google-sheets-and-gas.md`; recheck code for current tier limits and payload keys. Confidence: documented.
- Targeted checks: `tests/test-ia-map-magnific.mjs`, `tests/test-ia-figjam-trackpad.mjs`, `tests/test-task-ia-linking.mjs`, `tests/test-ia-node-disabled.mjs`, `test-ia-cloud-autochunk-and-sanitizer.mjs` (root file names should be confirmed before run).
