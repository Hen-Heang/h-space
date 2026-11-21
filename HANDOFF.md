# HANDOFF

## Snapshot

- **Updated:** 2026-11-21 (evening).
- **Spring exit: merged and deployed** (#126–#128, #130; plan in `docs/SPRING_EXIT_PLAN.md`, detail in `HANDOFF_HISTORY.md`). H-Space runs on Vercel + Supabase + Neon only. Sign-in is Supabase Auth with TOTP MFA and a second authenticator as the backup. H-Vault is served by `/api/vault` over Neon `hspace`. Nothing calls h-space-api any more. The MFA database rule migration `20261121120000_require_mfa_when_enrolled.sql` is **not applied**.
- **Finance outage (Neon quota, not a code bug):** the Neon project `h-space-api` (`delicate-voice-81285481`, endpoint `ep-green-hill-b3jcgzby`, free plan) is over quota. Its compute has been suspended since 2026-11-19 12:04 UTC. Every finance query gets `NeonDbError: Server error (HTTP status 402): … "Your account or project has exceeded the quota. Upgrade your plan to increase limits."` (production log, 2026-11-21). Finance (Neon `luyra`) and H-Vault (Neon `hspace`) stay down until the quota resets on **2026-12-01** or the owner upgrades the plan.
- **Finance now reports the outage clearly (merged and deployed):**
  - **#132** (`8eb8f78`): `apiError` in `lib/server/finance/http.ts` answers **503 `FINANCE_DATABASE_UNAVAILABLE`** when Neon can't be reached. The overview says "Finance is unavailable right now … Your data is safe; try again later." The server log gets a one-line reason, never the database message. Query bugs stay 500.
  - **#134** (`351574c`): #132's matcher missed the real error (it expected 429/5xx and "compute time quota"). It now also matches HTTP **402** and "exceeded the quota", with a test using the exact production error.
  - **#133**: handoff only.
  - **Checked in production, signed in (owner signed in to the Claude Chrome tab):** `/api/finance/overview?month=2026-11` returns 503 and the page shows the new message. Local checks on #134: `pnpm test` 226 files / 2,472 tests, lint 0 errors / 5 old warnings, `tsc` clean.
- **PR open: finance reads skip retries on a 503** (`fix/finance-skip-retry-503`). `shouldRetryFinanceQuery` in `lib/query/finance-queries.ts` is on every finance query: no retry for a 503, React Query's default 3 retries otherwise. The "Finance is unavailable" message now shows after one request instead of about 8–15 s of skeleton. Locally: `pnpm test` 226 files / 2,475 tests, lint 0 errors / 5 old warnings, `tsc` clean. `pnpm build` not run. Not yet checked in production.
- **Test account (kept by the owner):** `hspace-e2e-c011d2@example.com` in live Supabase, now empty. Its password is not in the repo. How to run the signed-in journey: the header of `apps/web/tests/e2e/signed-in-journey.e2e.ts`.

## Current focus

1. **Owner: Neon decision.** Either wait for the 2026-12-01 reset or upgrade the `h-space-api` Neon project now. Finance and H-Vault depend on it. **Stop the Spring container on the VPS before upgrading** — its pool kept the database awake 24/7, which used up the free quota and would keep billing on a paid plan. Don't point Finance at the old `luyra` Neon project as a stopgap: it's the frozen 2026-11-04 archive and the working copy has diverged. Once Neon is back, open `/finance` to confirm the data loads.
2. **Owner, Supabase dashboard (project-wide, shared with Orbit):** Google provider with the same client ID as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; `{{ .Token }}` in the Magic link template; `https://hengo.henheang.site/reset-password` (and preview origins) in the redirect URLs. Until then, only password sign-in works.
3. **Owner:** enroll an authenticator **and a backup** under Settings → Security (production sign-in works). Then try email-code sign-in and the reset-email link by hand.
4. **Owner, Vercel and `apps/web/.env.example` (tidying):** delete `NEXT_PUBLIC_DATA_SOURCE_INBOX`, `NEXT_PUBLIC_AUTH_API_URL` and `NEXT_PUBLIC_HSPACE_API_URL`. Nothing reads them since #130.
5. **Owner, before 2026-12-01:** stop the Spring container on the VPS, then shut the VPS down and archive h-space-api. Decide on rotating the legacy Supabase JWT secret (affects Orbit).
6. **After Neon is back (needs owner approval):** create the least-privilege `vault_app` role (SQL in the plan), set `VAULT_DATABASE_URL` in Vercel, run the vault on a Neon branch, then unlock in production. Copy any Spring-only `inbox_items` into `kori_inbox_items`.
7. **MFA database rule:** apply `20261121120000_require_mfa_when_enrolled.sql` only with the owner's go-ahead, after the owner's authenticators are enrolled. Then check the app and the MCP connector with MFA on (connector tokens may be `aal1`).
8. **Owner:** review and merge the skip-retries-on-503 PR, then open `/finance` while Neon is still down to see the message appear at once.
9. **Carried over:** the H-Vault step-up code and route rate limits; the independent H-Vault security audit (must cover `/api/vault`) and restore drill; Finance D–F follow-ups (`apps/web/docs/finance-redesign.md` §7); MCP live checks; UI audit follow-ups.

## Notes for the next session

- Neon project `delicate-voice-81285481`, branch `br-plain-base-b3wzrtye`, endpoint `ep-green-hill-b3jcgzby`: suspended by quota until 2026-12-01. The Neon MCP reads endpoint state (`get_postgres_endpoint`) without waking it.
- Production logs: `vercel logs --project h-space --since 15m --level error --expand` from `apps/web` (the folder isn't `vercel link`ed, so `--project` is needed). Deployments: `vercel ls`.
- `.claude/settings.json` denies `gh pr merge` and `psql` on purpose. The owner merges, and database tests run as scripts the owner executes or in Docker.
- Agents can't enter passwords. For a signed-in browser check, the owner signs in in the Claude tab group's tab.
- Merged branches still exist locally and on origin: `fix/finance-db-unavailable-503`, `docs/handoff-finance-503`, `fix/finance-neon-402-quota` (delete only with the owner's OK). `test/e2e-integration` is obsolete.
