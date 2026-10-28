# auth-session-rbac

- Core: `src/services/otpAuthService.ts` for OTP/session handling; `src/lib/accessControl.ts` for scopes, viewers, assigned/created checks, and capability helpers. Confidence: verified for file/interface presence.
- Nav defaults and storage keys: `src/config/navVisibilityConfig.ts`. Confidence: verified.
- Session token format expected by AI gateway: `ST_[a-f0-9]{16}` in `api/ai-gateway.ts:81-84`. Confidence: verified.
- Roles/capabilities, dual-session policies, and OTP lifecycle details live in feature docs; verify current behavior in `otpAuthService.ts` and GAS handlers before relying on them. Confidence: documented.
- Client RBAC is not proof of backend enforcement; inspect GAS/server checks for sensitive actions.
