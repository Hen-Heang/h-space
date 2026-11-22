# HANDOFF

## Snapshot

- **Updated:** 2026-11-22.
- **Spring exit: merged and deployed** (#126–#128, #130; plan in `docs/SPRING_EXIT_PLAN.md`, detail in `HANDOFF_HISTORY.md`). H-Space runs on Vercel + Supabase + Neon only. Sign-in is Supabase Auth with TOTP MFA and a second authenticator as the backup. H-Vault is served by `/api/vault` over Neon `hspace`. Nothing calls h-space-api any more. The MFA database rule migration `20261121120000_require_mfa_when_enrolled.sql` is **not applied**.
- **Neon outage (quota, not a code bug):** the Neon project `h-space-api` (`delicate-voice-81285481`, endpoint `ep-green-hill-b3jcgzby`, free plan) is over quota. Its compute has been suspended since 2026-11-19 12:04 UTC (re-checked 2026-11-22: still `idle`/suspended). Finance (Neon `luyra`) and H-Vault (Neon `hspace`) stay down until the quota resets on **2026-12-01** or the owner upgrades the plan.
- **H-Vault is down in production for a second reason: `VAULT_DATABASE_URL` is not set in Vercel production.** Every `GET /api/vault/keyset` logs `[vault] unavailable: VAULT_DATABASE_URL is not set or malformed` and answers 503 `VAULT_NOT_CONFIGURED` (production logs, 2026-11-22). The setting was never added after the Spring exit (focus item 6 below). The owner reported it as "can't decrypt the vault". The data is untouched in Neon `hspace`. Even with the setting, the vault stays down until Neon is back.
- **PR #137 open: `fix/vault-unavailable-message`** (`662a75c`). It doesn't restore the vault. It fixes the misleading page:
  - **Before:** when the keyset failed to load, `/vault` still showed "Your vault is locked — enter your master password" with a disabled Unlock button and no error. That looked like a decryption failure.
  - **`VaultDashboard`:** a keyset error now shows before the locked state, with Try again. A 503 says "H-Vault is unavailable right now." and "Your saved accounts are safe and still encrypted."
  - **`useVault`:** no retries on a 503; the hooks expose `unavailable`.
  - **`lib/server/vault/http.ts`:** a Neon outage (402 quota, suspended compute, network) answers **503 `VAULT_DATABASE_UNAVAILABLE`** instead of a 500. It reuses `financeDatabaseUnavailableReason`. The log gets the reason only.
  - **Local checks:** `pnpm test` 226 files / 2,479 tests passed, lint 0 errors / 5 old warnings, `tsc` clean, `pnpm build:web` passed. Not checked in a browser or in production.
- **Finance outage messaging is merged and deployed:** #132 and #134 (503 `FINANCE_DATABASE_UNAVAILABLE`, matching Neon's 402 quota error) and #136 (`8d194f4`, finance reads don't retry a 503). #132/#134 were checked in production; #136 hasn't been checked in production yet.
- **Test account (kept by the owner):** `hspace-e2e-c011d2@example.com` in live Supabase, now empty. Its password is not in the repo. How to run the signed-in journey: the header of `apps/web/tests/e2e/signed-in-journey.e2e.ts`.

## Current focus

1. **Owner: review and merge #137.** After it deploys, open `/vault`: it should say "H-Vault is unavailable right now." with no Unlock button.
2. **Owner: Neon decision.** Either wait for the 2026-12-01 reset or upgrade the `h-space-api` Neon project now. Finance and H-Vault depend on it. **Stop the Spring container on the VPS before upgrading** — its pool kept the database awake 24/7, which used up the free quota and would keep billing on a paid plan. Don't point Finance at the old `luyra` Neon project as a stopgap: it's the frozen 2026-11-04 archive and the working copy has diverged. Once Neon is back, open `/finance` to confirm the data loads.
3. **To bring H-Vault back (after Neon, needs owner approval):** create the least-privilege `vault_app` role on Neon `hspace` (SQL in `docs/SPRING_EXIT_PLAN.md`), set `VAULT_DATABASE_URL` in Vercel production to that role's connection string, and redeploy. Try it on a Neon branch first, then unlock in production. Copy any Spring-only `inbox_items` into `kori_inbox_items`.
4. **Owner, Supabase dashboard (project-wide, shared with Orbit):** Google provider with the same client ID as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; `{{ .Token }}` in the Magic link template; `https://hengo.henheang.site/reset-password` (and preview origins) in the redirect URLs. Until then, only password sign-in works.
5. **Owner:** enroll an authenticator **and a backup** under Settings → Security (production sign-in works). Then try email-code sign-in and the reset-email link by hand.
6. **Owner, Vercel and `apps/web/.env.example` (tidying):** delete `NEXT_PUBLIC_DATA_SOURCE_INBOX`, `NEXT_PUBLIC_AUTH_API_URL` and `NEXT_PUBLIC_HSPACE_API_URL`. Nothing reads them since #130.
7. **Owner, before 2026-12-01:** stop the Spring container on the VPS, then shut the VPS down and archive h-space-api. Decide on rotating the legacy Supabase JWT secret (affects Orbit).
8. **MFA database rule:** apply `20261121120000_require_mfa_when_enrolled.sql` only with the owner's go-ahead, after the owner's authenticators are enrolled. Then check the app and the MCP connector with MFA on (connector tokens may be `aal1`).
9. **Owner:** open `/finance` while Neon is still down to confirm #136 shows the "unavailable" message at once.
10. **Carried over:** the H-Vault step-up code and route rate limits; the independent H-Vault security audit (must cover `/api/vault`) and restore drill; Finance D–F follow-ups (`apps/web/docs/finance-redesign.md` §7); MCP live checks; UI audit follow-ups.

## Notes for the next session

- Neon project `delicate-voice-81285481`, branch `br-plain-base-b3wzrtye`, endpoint `ep-green-hill-b3jcgzby`: suspended by quota until 2026-12-01. The Neon MCP reads endpoint state (`get_postgres_endpoint`) without waking it.
- Production logs: `vercel logs --project h-space --since 15m --level error --expand` from `apps/web` (the folder isn't `vercel link`ed, so `--project` is needed). The vault's "not configured" line is logged at `warn`, so search without `--level error` (e.g. `--since 48h --expand | grep -i vault`). Deployments: `vercel ls`.
- `.claude/settings.json` denies `gh pr merge` and `psql` on purpose. The owner merges, and database tests run as scripts the owner executes or in Docker.
- Agents can't enter passwords. For a signed-in browser check, the owner signs in in the Claude tab group's tab.
- Merged branches still exist locally and on origin: `fix/finance-db-unavailable-503`, `docs/handoff-finance-503`, `fix/finance-neon-402-quota`, `fix/finance-skip-retry-503` (delete only with the owner's OK). `test/e2e-integration` is obsolete.
