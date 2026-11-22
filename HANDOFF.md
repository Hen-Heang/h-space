# HANDOFF

## Snapshot

- **Updated:** 2026-11-22.
- **Spring exit: merged and deployed** (#126–#128, #130; plan in `docs/SPRING_EXIT_PLAN.md`, detail in `HANDOFF_HISTORY.md`). H-Space runs on Vercel + Supabase + Neon only. Sign-in is Supabase Auth with TOTP MFA and a second authenticator as the backup. H-Vault is served by `/api/vault` over Neon `hspace`. Nothing calls h-space-api any more. The MFA database rule migration `20261121120000_require_mfa_when_enrolled.sql` is **not applied**.
- **Neon outage (quota, not a code bug):** the Neon project `h-space-api` (`delicate-voice-81285481`, endpoint `ep-green-hill-b3jcgzby`, free plan) is over quota. Its compute has been suspended since 2026-11-19 12:04 UTC (re-checked 2026-11-22: still `idle`/suspended). Finance (Neon `luyra`) and H-Vault (Neon `hspace`) stay down until the quota resets on **2026-12-01** or the owner upgrades the plan.
- **H-Vault is down in production for a second reason: `VAULT_DATABASE_URL` is not set in Vercel production.** Every `GET /api/vault/keyset` logs `[vault] unavailable: VAULT_DATABASE_URL is not set or malformed` and answers 503 `VAULT_NOT_CONFIGURED` (production logs, 2026-11-22). The setting was never added after the Spring exit (focus item 2 below). The owner reported it as "can't decrypt the vault". The data is untouched in Neon `hspace`. Even with the setting, the vault stays down until Neon is back.
- **#137 merged and deployed** (`60e4a96`, `fix/vault-unavailable-message`; handoff #138, `71ae907`). It doesn't restore the vault. It fixes the misleading page:
  - **Before:** when the keyset failed to load, `/vault` still showed "Your vault is locked — enter your master password" with a disabled Unlock button and no error. That looked like a decryption failure.
  - **`VaultDashboard`:** a keyset error now shows before the locked state, with Try again. A 503 says "H-Vault is unavailable right now." and "Your saved accounts are safe and still encrypted."
  - **`useVault`:** no retries on a 503; the hooks expose `unavailable`.
  - **`lib/server/vault/http.ts`:** a Neon outage (402 quota, suspended compute, network) answers **503 `VAULT_DATABASE_UNAVAILABLE`** instead of a 500. It reuses `financeDatabaseUnavailableReason`. The log gets the reason only.
  - **Local checks:** `pnpm test` 226 files / 2,479 tests passed, lint 0 errors / 5 old warnings, `tsc` clean, `pnpm build:web` passed.
  - **Checked in production (2026-11-22, owner signed in):** `/vault` shows "H-Vault is unavailable right now. Your saved accounts are safe and still encrypted…" with no Unlock button. The logs show two `/api/vault/keyset` calls per visit (it used to be three).
- **The `vault_app` role SQL is tested, locally only (2026-11-22).** The plan's grants (`docs/SPRING_EXIT_PLAN.md`) were run on a throwaway Postgres 17 in Docker. Its tables came from h-space-api's migrations: `hub-api/.../hub-migration/V1__vault.sql` and `audit_logs`/`users` from `security-api/.../V1__baseline.sql`. The real `lib/server/vault/service.ts` then ran through Neon's driver behind the local Neon HTTP proxy (`VAULT_LOCAL_NEON_PROXY`), with synthetic users and envelopes. **5/5 passed:**
  - **Connection:** `current_user` was `vault_app`, with no superuser, create-role, create-db or bypass-RLS rights.
  - **Full flow:** keyset create and replace, item create, list, update and delete, stale-version 409s, duplicate-setup and add-before-setup 409s, reset.
  - **Isolation:** user B can't list, update or delete user A's item, and A's item is unchanged.
  - **Foreign key:** the `users` check still works with no grant on `users` (23503 for an unknown user).
  - **Refusals:** reading `users`, other tables or `audit_logs`, changing or deleting audit rows, and DDL (create, alter, truncate, create role) all get 42501.
  - **Audit log:** one row per action, counts match, and no `v2.` text in `details`.
  - **Not covered:** Neon itself (`\password`, `neon_superuser` behaviour) and whether the owner's id is still in Neon's `users` table. Containers and the test password were deleted afterwards; nothing touched Neon or production.
- **Finance outage messaging is merged and deployed:** #132 and #134 (503 `FINANCE_DATABASE_UNAVAILABLE`, matching Neon's 402 quota error) and #136 (`8d194f4`, finance reads don't retry a 503). All three are checked in production. **#136 checked on 2026-11-22, owner signed in:** `/finance` shows "Finance overview unavailable … (503 FINANCE_DATABASE_UNAVAILABLE). Your data is safe; try again later.", and **Try again** sends exactly one `/api/finance/overview` request (503) with no retries.
- **PR #140 open: `fix/finance-exchange-rate-log`.** The same production check showed the overview's log holding the whole `NeonDbError` (Neon's JSON body and a stack). It came from `console.error("[finance] cached exchange rate lookup failed", error)` in `lib/server/finance/services/finance-exchange-rate-service.ts`.
  - **Fix:** a new `describeDatabaseError` in `lib/server/finance/http.ts` returns the unavailable reason, or the error's name and SQLSTATE, never the message. It's used at that line and the file's two other database logs (stored-rate fallback, cache write). The live-rate fetch log is unchanged.
  - **Tests:** a new `finance-exchange-rate-service.test.ts` fails 3/3 on the old code and passes with the fix.
  - **Local checks:** `pnpm test` 227 files / 2,484 tests, lint 0 errors / 5 old warnings, `tsc` clean, `pnpm build:web` passed. Not yet checked in production.
  - **Left alone on purpose:** `apiError`'s `console.error(error)` for unexpected 500s, so query bugs stay debuggable (see carried-over item).
- **Test account (kept by the owner):** `hspace-e2e-c011d2@example.com` in live Supabase, now empty. Its password is not in the repo. How to run the signed-in journey: the header of `apps/web/tests/e2e/signed-in-journey.e2e.ts`.

## Current focus

1. **Owner: Neon decision.** Either wait for the 2026-12-01 reset or upgrade the `h-space-api` Neon project now. Finance and H-Vault depend on it. The Spring container's pool on the VPS kept the database awake 24/7 and used up the free quota; the owner no longer uses the VPS (2026-11-22), and Neon has shown no activity since its 2026-11-19 suspension. If anything wakes it again, look for a leftover Spring connection first. Don't point Finance at the old `luyra` Neon project as a stopgap: it's the frozen 2026-11-04 archive and the working copy has diverged. Once Neon is back, open `/finance` to confirm the data loads.
2. **To bring H-Vault back (after Neon, needs owner approval):**
   1. Create the least-privilege `vault_app` role on Neon `hspace` with SQL as the database owner: `create role vault_app login;`, then `\password vault_app` in the owner's own `psql`, then the grants in `docs/SPRING_EXIT_PLAN.md`. Don't use Neon's "New role" button, which adds `neon_superuser`. Keep the password out of this chat, the repo and the SQL Editor's history.
   2. Check the grants and `pg_has_role('vault_app', 'neon_superuser', 'member') = false`.
   3. Repeat the local role test on a Neon branch.
   4. Set `VAULT_DATABASE_URL` (the role's pooled string, Sensitive, Production) in Vercel and redeploy.
   5. Unlock `/vault` in production.
   6. Copy any Spring-only `inbox_items` into `kori_inbox_items`.
3. **Owner, Supabase dashboard (project-wide, shared with Orbit):** Google provider with the same client ID as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; `{{ .Token }}` in the Magic link template; `https://hengo.henheang.site/reset-password` (and preview origins) in the redirect URLs. Until then, only password sign-in works.
4. **Owner:** enroll an authenticator **and a backup** under Settings → Security (production sign-in works). Then try email-code sign-in and the reset-email link by hand.
5. **Owner, Vercel and `apps/web/.env.example` (tidying):** delete `NEXT_PUBLIC_DATA_SOURCE_INBOX`, `NEXT_PUBLIC_AUTH_API_URL` and `NEXT_PUBLIC_HSPACE_API_URL`. Nothing reads them since #130.
6. **Owner:** archive h-space-api, and decide on rotating the legacy Supabase JWT secret (affects Orbit). The VPS is no longer in use (owner, 2026-11-22).
7. **MFA database rule:** apply `20261121120000_require_mfa_when_enrolled.sql` only with the owner's go-ahead, after the owner's authenticators are enrolled. Then check the app and the MCP connector with MFA on (connector tokens may be `aal1`).
8. **Owner:** review and merge #140 (`! gh pr merge 140 --merge`). After it deploys, the next `/finance` visit while Neon is down should log `[finance] cached exchange rate lookup failed: database unavailable (Neon compute quota or endpoint state)`, a single line.
9. **Carried over:** the H-Vault step-up code and route rate limits; the independent H-Vault security audit (must cover `/api/vault`) and restore drill; Finance D–F follow-ups (`apps/web/docs/finance-redesign.md` §7); MCP live checks; UI audit follow-ups; decide whether `apiError`'s 500 path (`lib/server/finance/http.ts`) should also log only the error's name and SQLSTATE.

## Notes for the next session

- Neon project `delicate-voice-81285481`, branch `br-plain-base-b3wzrtye`, endpoint `ep-green-hill-b3jcgzby`: suspended by quota until 2026-12-01. The Neon MCP reads endpoint state (`get_postgres_endpoint`) without waking it.
- Production logs: `vercel logs --project h-space --since 15m --level error --expand` from `apps/web` (the folder isn't `vercel link`ed, so `--project` is needed). The vault's "not configured" line is logged at `warn`, so search without `--level error` (e.g. `--since 48h --expand | grep -i vault`). Deployments: `vercel ls`.
- `.claude/settings.json` denies `gh pr merge` and `psql` on purpose. The owner merges; `! gh pr merge <n> --merge` worked on 2026-11-22 when three browser merges didn't register. Database tests run as scripts the owner executes, or in Docker.
- **Vault role test, to repeat on a Neon branch:** h-space-api is checked out at `~/Documents/h-space-api` for the DDL. Vitest won't apply `vi.mock("server-only")` to a test file outside `apps/web`, so the test file has to sit inside `apps/web` for the run and be deleted afterwards. Docker Desktop isn't running by default (`open -a Docker`).
- Agents can't enter passwords. For a signed-in browser check, the owner signs in in the Claude tab group's tab.
- **Two Chrome browsers are connected to Claude** ("Browser 1" and "Browser 2", both macOS). The owner signs in to H-Space in **Browser 2**. The session started on Browser 1, which showed only the login page, so pick Browser 2 with `select_browser` before a signed-in check.
- Merged branches still exist locally and on origin: `fix/finance-db-unavailable-503`, `docs/handoff-finance-503`, `fix/finance-neon-402-quota`, `fix/finance-skip-retry-503` (delete only with the owner's OK). `test/e2e-integration` is obsolete.
