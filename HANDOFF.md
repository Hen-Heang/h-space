# HANDOFF

## Snapshot

- **Updated:** 2026-11-27 (afternoon, after merge and deploy).
- **Checkout:** `main` at `15ad78e` (#148 merged 04:23 UTC by the owner). Owner's checkout had unrelated uncommitted work (`apps/web/lib/api/finance-client.ts`, `false`, `v.title`, `luyra-web/`, `second-brain/.claudian/`, `second-brain/.obsidian/workspace.json`); leave it alone.
- **#148 merged: Auth V2 web side, every new path OFF** (`feat/auth-v2-web`, merge `15ad78e`). Backend counterpart h-space-api #58 (merge `7c3adf0`). Design: owner's vault notes "API Migration" 10-13; details `apps/web/docs/auth-v2.md`.
  - Off unless set: `NEXT_PUBLIC_HSPACE_ADMISSION=enforce` (admission after the first factor and on app entry), `NEXT_PUBLIC_AUTHV2_INBOX_BACKEND=spring` + `NEXT_PUBLIC_AUTHV2_API_URL` (Inbox on h-space-api's pilot), `NEXT_PUBLIC_FEATURE_GITHUB_SIGN_IN=true` (isolated PKCE + `/auth/callback`).
  - **Always on:** the TanStack Query cache is cleared when the signed-in user changes or signs out.
  - Migration `supabase/migrations/20261127120000_kori_app_access.sql` is in the repo but **NOT applied** to the shared Supabase project. Ordering hazard with `20261121120000_require_mfa_when_enrolled.sql` documented in both (decision H6).
- **Review:** Codex found one P2 per PR, all fixed with a regression test that failed on the old code first: onboarding profile read ran before admission (`6ee13d6`); admission reply not bounded while reading the body (h-space-api `e7639e4`); Inbox import runbook vs. the new `app_users` FK (h-space-api `572e20d`). Codex re-review clean on both final heads; all three threads resolved. No human review; CodeRabbit skipped (manual trigger needed).
- **Checks:** CI green on both final heads (web Lint & Format, Test, Build Verification, Quality Gate; api `build` + hub-api / engineering-api image smoke tests). Locally: vitest 238 files / 2,578 tests, `tsc` clean, lint 0 errors / 6 old warnings, `pnpm build:web` passed; backend `clean build` 494 tests; throwaway-cluster SQL test 13/13; synthetic browser pass 14/14 at 320/375/430/1280.
- **Production web (checked in Chrome on the owner's session, read-only):** `/home` and `/inbox` load with no console errors; no `kori_app_access` request (admission off); Inbox reads Supabase `kori_inbox_items` (200), no h-space-api call; `/auth/callback` is live and answers "GitHub sign-in isn't enabled for H-Space"; session intact afterwards.
- **Railway (`tranquil-learning` / `h-space-api`, read-only):** deployment `eb51177a` of `7c3adf0` is SUCCESS; hub-api started in 6.7 s on `prod`, no errors since; pilot and old Supabase bridge both off. V3 (`app_users`) is applied by inference only: `prod` logs at WARN so Flyway lines don't show, but startup succeeded with `ddl-auto: validate` and the new `AppUser` entity. The FK re-point is not proven. The service has no public domain.

## Current focus

1. **Owner, confirm V3 on Railway** (read-only, Railway database console): `select version, description, success from flyway_hub_schema_history order by installed_rank;` (expect `3 | app users | t`) and `select confrelid::regclass from pg_constraint where conname = 'inbox_items_user_id_fkey';` (expect `app_users`).
2. **Owner decisions before enabling anything:** H6 (MFA RLS migration vs. the admission table), H12 (Inbox requires aal2), H13 (apply + seed `kori_app_access`, staging first), H14 (TTL / revocation, with Orbit), H15 (GitHub provider). H4 is now live in the sandbox (merged).
3. **Live read-only audit** still pending: Supabase signing keys, access-token TTL, grants/RLS, providers and redirect URLs.
4. **Not verified in production:** sign-in / code step / sign-out flows and the cache reset on account switch (need a sign-out; agents can't enter passwords).
5. Not built: Inbox data copy / cutover (P1), provider link/unlink, global logout UI, admission coverage for other tables / RPCs / storage / MCP.
6. Railway: `OWNER_EMAIL` is still unset (startup log). Earlier items in the 2026-11-25 history entry (Neon autoscaling, H-Vault `vault_app` role, stale Vercel variables, ...) still stand.

## Notes for the next session

- Machine notes as in the 2026-11-25 history entry: `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1` for build/dev; Chrome via Playwright for phone widths. `curl` to production fails here (TLS inspection); use Chrome.
- Local Auth V2 run: h-space-api `docs/auth-v2.md` ("Run it locally") + `apps/web/docs/auth-v2.md`. Port 3000 was busy; 3001 worked (set backend `CORS_ALLOWED_ORIGINS`).
- `.env*` files are deny-listed for agents, so `.env.example` doesn't list the four new variables; they're in `apps/web/docs/auth-v2.md`.
- Agent worktrees from this session: `E:\Fullstack\h-space-auth-v2` and `E:\API\h-space-api-auth-v2` (both now on `docs/auth-v2-results`). Remove them with the owner's OK once that docs PR is merged.
