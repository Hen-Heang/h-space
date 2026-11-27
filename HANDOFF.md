# HANDOFF

## Snapshot

- **Updated:** 2026-11-27.
- **This snapshot is on branch `feat/auth-v2-web`** (worktree `E:\Fullstack\h-space-auth-v2`, from `origin/main` `c15101f`). Nothing committed, pushed or deployed; `main`'s HANDOFF is still the 2026-11-25 one. The owner's checkout keeps its unrelated uncommitted work untouched.
- **Auth V2, local implementation (owner's vault "API Migration" notes 10-13).** All new paths are **off by default**; see `apps/web/docs/auth-v2.md`.
  - Admission (`NEXT_PUBLIC_HSPACE_ADMISSION=enforce`): checked after the first factor and on app entry, fail-closed, before MFA and profile bootstrap.
  - Inbox on h-space-api's pilot (`NEXT_PUBLIC_AUTHV2_INBOX_BACKEND=spring` + `NEXT_PUBLIC_AUTHV2_API_URL`): typed client, session probe, enrollment / denied / unavailable states.
  - Optional GitHub sign-in (`NEXT_PUBLIC_FEATURE_GITHUB_SIGN_IN=true`): isolated PKCE client + `/auth/callback`; provider NOT configured, no real round trip.
  - Always on: the query cache is cleared when the signed-in user changes (it wasn't before).
  - Migration `20261127120000_kori_app_access.sql` **authored, not applied**; tested on a throwaway local cluster (`supabase/tests/kori_app_access.test.sh`, 13 checks). Its ordering hazard with `20261121120000_require_mfa_when_enrolled.sql` is documented in both places.
- **Backend half:** h-space-api branch `feat/auth-v2-backend` (worktree `E:\API\h-space-api-auth-v2`), `docs/auth-v2.md` there.
- **Local checks (2026-11-27):** full `vitest` run, `tsc` clean, lint 0 errors / 6 old warnings, `pnpm build:web` passed; synthetic browser pass 14/14 at 320/375/430/1280 against a local h-space-api + stub. Exact counts are in the session report.

## Current focus

1. **Owner decisions before any merge:** H4 (`app_users` FK change in h-space-api V3), H6 (how the MFA RLS migration and the admission table coexist), H12 (Inbox aal2), H13 (admission table and seeding), H14 (TTL / revocation, Orbit), H15 (GitHub).
2. Live read-only audit still pending (signing keys, TTL, RLS/grants, providers, redirect URLs).
3. Not built: Inbox data copy / cutover (P1), link/unlink providers, global logout UI, admission coverage for other tables / RPCs / storage / MCP.
4. Everything in the 2026-11-25 entry of `HANDOFF_HISTORY.md` that isn't superseded still stands (Neon autoscaling, H-Vault `vault_app` role, Railway variables, ...).

## Notes for the next session

- Same machine notes as before (`HANDOFF_HISTORY.md` 2026-11-25): `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1` for build/dev; Chrome via Playwright for phone widths.
- Port 3000 was busy with another dev server; the local Auth V2 pass used 3001 (backend `CORS_ALLOWED_ORIGINS` set accordingly).
- `.env*` files are deny-listed for agents, so `.env.example` was not updated; the four new names are in `apps/web/docs/auth-v2.md`.
