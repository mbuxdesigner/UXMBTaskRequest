# design-system

- Global style/motion sources: `src/index.css`, `src/lib/motion.ts`, `src/components/ui/`, `src/components/reui/`; tokens data: `token.json` and `src/tokens/index.ts`. Confidence: verified for path/interface presence.
- Current detailed token/component/motion rules live in `doc/design-system/`; verify classes/variants in source before changing shared primitives. Confidence: documented for rule currency.
- Recent runtime cautions recorded in docs: Sonner owns toast geometry, motion follows current runtime policy, IA canvas stays separate from DOM cascade animation. Confidence: documented; recheck `src/App.tsx`, Sonner CSS, and IA canvas before relying on them.
