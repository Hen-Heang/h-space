# HANDOFF

## Snapshot

- **Updated:** 2026-11-21 (evening).
- **Spring exit: merged and deployed** (#126–#128, #130; plan in `docs/SPRING_EXIT_PLAN.md`, full detail in the previous `HANDOFF_HISTORY.md` entry). H-Space runs on Vercel + Supabase + Neon only. Sign-in is Supabase Auth with TOTP MFA and a second authenticator as the backup. H-Vault is served by `/api/vault` over Neon `hspace`. Nothing calls h-space-api any more. The MFA database rule migration `20261121120000_require_mfa_when_enrolled.sql` is **not applied**.
- **Finance outage, diagnosed (not a code bug):** `GET /api/finance/overview?month=2026-11` returns **500** in production. The Neon compute (project `h-space-api` / `delicate-voice-81285481`, endpoint `ep-green-hill-b3jcgzby`) has been suspended since 2026-11-19 12:04 UTC. The project is on the free plan and has used about 110 CU-hours this period. The route signs the caller in and resolves the finance link, then the first Neon query fails. Finance (Neon `luyra`) and H-Vault (Neon `hspace`) stay down until the quota resets on **2026-12-01** or the owner upgrades the Neon plan.
- **PR #132 open** (`fix/finance-db-unavailable-503`, commit `87df0db`): finance routes now answer **503 `FINANCE_DATABASE_UNAVAILABLE`** instead of a generic 500 when Neon can't be reached. That covers a network failure, Neon HTTP 5xx or 429, a compute-quota or disabled/suspended-endpoint message, and SQLSTATE classes 08, 53 and 57P (`lib/server/finance/http.ts`, `financeDatabaseUnavailableReason`). The server log gets a one-line reason, never the database message. Query bugs stay 500. On a 503 the overview says "Finance is unavailable right now … Your data is safe" (`components/finance/finance-overview.tsx`). New tests are in `lib/server/finance/http.test.ts`. Locally: `pnpm test` 226 files / 2,469 tests, lint 0 errors / 5 old warnings, `tsc` clean, `pnpm build:web` passed. CI was not yet seen. **Not verified:** the exact wording and HTTP status of Neon's quota error. Anything unmatched still answers 500. This PR does not bring Finance back.
- **Production sign-in still unchecked by an agent:** in the Claude Chrome tab, `/finance` redirects to `/login?next=/finance`. The tab has no `koriai-auth` session and no Supabase auth request was ever made from it. It only holds old pre-Supabase localStorage keys (`token`, `refreshToken`, `userId`, `userEmail`), which nothing reads. Chrome autofills a saved password that may be the Spring-era one.
- **Test account (kept by the owner):** `hspace-e2e-c011d2@example.com` in live Supabase, now empty. Its password is not in the repo. How to run the signed-in journey: the header of `apps/web/tests/e2e/signed-in-journey.e2e.ts`.

## Current focus

1. **Owner: review and merge #132** (`! gh pr merge 132 --merge`). After the deploy, `/api/finance/overview` should answer 503 `FINANCE_DATABASE_UNAVAILABLE` while Neon is suspended. If it still answers 500, read the Vercel log line. An unmatched Neon error shows up there as `console.error`, so the matcher can be widened.
2. **Owner: Neon decision.** Either wait for the 2026-12-01 reset or upgrade the `h-space-api` Neon project now. Finance and H-Vault depend on it.
3. **Owner, Supabase dashboard (project-wide, shared with Orbit):** Google provider with the same client ID as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; `{{ .Token }}` in the Magic link template; `https://hengo.henheang.site/reset-password` (and preview origins) in the redirect URLs. Until then, only password sign-in works.
4. **Owner:** sign in to production. Use "Forgot password" or an email code if the saved password is the Spring one. Enroll an authenticator **and a backup** under Settings → Security. Then try email-code sign-in and the reset-email link by hand.
5. **Owner, Vercel and `apps/web/.env.example` (tidying):** delete `NEXT_PUBLIC_DATA_SOURCE_INBOX`, `NEXT_PUBLIC_AUTH_API_URL` and `NEXT_PUBLIC_HSPACE_API_URL`. Nothing reads them since #130.
6. **Owner, before 2026-12-01:** stop the Spring container on the VPS, then shut the VPS down and archive h-space-api. Decide on rotating the legacy Supabase JWT secret (affects Orbit).
7. **After Neon is back (needs owner approval):** create the least-privilege `vault_app` role (SQL in the plan), set `VAULT_DATABASE_URL` in Vercel, run the vault on a Neon branch, then unlock in production. Copy any Spring-only `inbox_items` into `kori_inbox_items`. Re-check `/finance` signed in.
8. **MFA database rule:** apply `20261121120000_require_mfa_when_enrolled.sql` only with the owner's go-ahead, after the owner's authenticators are enrolled. Then check the app and the MCP connector with MFA on (connector tokens may be `aal1`).
9. **Carried over:** the H-Vault step-up code and route rate limits; the independent H-Vault security audit (must cover `/api/vault`) and restore drill; Finance D–F follow-ups (`apps/web/docs/finance-redesign.md` §7); MCP live checks; UI audit follow-ups.

## Notes for the next session

- Neon project `delicate-voice-81285481`, branch `br-plain-base-b3wzrtye`, endpoint `ep-green-hill-b3jcgzby`: suspended by quota until 2026-12-01. The Neon MCP can read endpoint state (`get_postgres_endpoint`) without waking it.
- `.claude/settings.json` denies `gh pr merge` and `psql` on purpose. The owner merges, and database tests run as scripts the owner executes or in Docker.
- Agents can't sign in to production for the owner (no password entry). For a signed-in browser check, the owner signs in in the Claude tab group's tab first.
- The local branch `test/e2e-integration` is obsolete. GitHub Actions runs again.
