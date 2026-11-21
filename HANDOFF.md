# HANDOFF

## Snapshot

- **Updated:** 2026-11-21.
- **Spring exit, merged and deployed** (plan: `docs/SPRING_EXIT_PLAN.md`). The owner retired h-space-api (Spring) and its VPS after the Neon free-plan compute ran out on 2026-11-19 (Spring's pool kept the database awake 24/7; Neon is suspended until **2026-12-01**). H-Space now runs on Vercel + Supabase + Neon only.
  - **#126**, sign-in on **Supabase Auth**: password, email code (no self sign-up; `/register` is an invite-only notice), Google ID token with nonce, TOTP MFA. The token bridge is gone. Same user ids, so all Supabase data stays linked. Also carries the **MFA database rule** migration `20261121120000_require_mfa_when_enrolled.sql`, **not applied**.
  - **#127**, **second authenticator** instead of backup codes: device list, named backup, remove a lost device with another device's code, and a device picker at sign-in and `/reset-password`.
  - **#128**, **H-Vault over `/api/vault`**: Vercel routes over the existing Neon `hspace` vault tables, with no ciphertext moved. An `aal2` + verified-factor gate on every call, strict v2-only schemas, versioned writes, and audit rows in the same statement. Also: refusals aren't retried any more (the vault showed an empty page for about 7 s before "turn on two-step verification"), a dev-only `VAULT_LOCAL_NEON_PROXY`, and the signed-in Playwright journey.
  - Plus a formatting-only commit for 10 files that were unformatted on `main` and failed CI's `prettier --check` on every PR.
  - **#130**, **step 4 cleanup (code)**: removed the Spring HTTP clients (`auth-http.ts`, `hspace-http.ts`), Ask Hengo's Spring inbox search, the Spring inbox store and `isSpringInboxEnabled` (the inbox always uses `kori_inbox_items` now), the inbox-reminder guard, and the h-space-api origins in the CSP. Nothing in H-Space calls h-space-api any more.
- **Production, checked after the deploys:** `/login` 200, `/register` shows the invite-only page, `/api/vault/items` 401 without a token, and (after #130) `connect-src` is `'self'`, Supabase, Google sign-in, OpenAI and Open-Meteo only. Nobody has signed in to production yet. H-Vault answers 503 and `/finance` is down until Neon is back and `VAULT_DATABASE_URL` is set.
- **Verification:** CI green on all three PRs (Lint & Format, Test, Build Verification, Quality Gate, Vercel). Locally: 228 test files / 2,470 tests, lint 0 errors / 5 old warnings, `pnpm build:web`. **Signed-in Chrome run** (`apps/web/tests/e2e/signed-in-journey.e2e.ts`, real Supabase Auth, throwaway vault database behind Neon's local HTTP proxy): **6/6 passed**. It covered signed-out pages, password sign-in, seeded data, the vault refusing before MFA, enrolling an authenticator plus a backup, the device picker and the half-signed-in gate, the full vault flow (only `v2.` ciphertext stored, id-only audit rows, nothing readable sent), and removing a lost device with the backup.
- **Test account (kept by the owner):** `hspace-e2e-c011d2@example.com` in live Supabase, created by SQL at the owner's request, now empty. Its password is not in the repo; the owner keeps it. How to run the journey: the header of the spec file.

## Current focus

1. **Owner, now, Supabase dashboard (project-wide, shared with Orbit):** Google provider with the same client ID as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; `{{ .Token }}` in the Magic link template; `https://hengo.henheang.site/reset-password` (and preview origins) in the redirect URLs. Until then, only password sign-in works.
2. **Owner, Vercel and `apps/web/.env.example` (tidying):** delete `NEXT_PUBLIC_DATA_SOURCE_INBOX`, `NEXT_PUBLIC_AUTH_API_URL` and `NEXT_PUBLIC_HSPACE_API_URL`. Nothing reads them since #130. Agents can't read `.env.example`, so that one is by hand.
3. **Owner:** sign in to production. Use "Forgot password" or an email code if a password changed in Spring. Enroll an authenticator **and a backup** under Settings → Security. Then try email-code sign-in and the reset-email link by hand (not automated).
4. **Owner, before 2026-12-01:** stop the Spring container on the VPS.
5. **After 2026-12-01 (needs owner approval):** create the least-privilege `vault_app` Neon role (SQL in the plan), set `VAULT_DATABASE_URL` in Vercel, run the vault on a Neon branch, then unlock in production (proves the user id still matches the envelopes). Copy any Spring-only `inbox_items` into `kori_inbox_items`.
6. **MFA database rule:** apply `20261121120000_require_mfa_when_enrolled.sql` only with the owner's go-ahead, after the owner's authenticators are enrolled. Then check the app and the MCP connector with MFA on (connector tokens may be `aal1`).
7. **Step 4 cleanup: code merged (#130).** Owner part: shut down the VPS (nothing depends on it; the inbox copy in item 5 reads Spring's data from Neon), archive h-space-api, and decide on rotating the legacy Supabase JWT secret (affects Orbit).
8. **Carried over:** the H-Vault step-up code and route rate limits (known gaps in the plan); the independent H-Vault security audit (must now cover `/api/vault`) and restore drill; Finance D–F follow-ups (`apps/web/docs/finance-redesign.md` §7); MCP live checks; UI audit follow-ups.

## Notes for the next session

- Neon project `delicate-voice-81285481`, branch `br-plain-base-b3wzrtye`, endpoint `ep-green-hill-b3jcgzby`: suspended by quota until 2026-12-01.
- `.claude/settings.json` denies `gh pr merge` and `psql` on purpose. The owner merges (`! gh pr merge <n> --merge` worked when the browser merge didn't take), and database tests run as scripts the owner executes or in Docker.
- The local branch `test/e2e-integration` (a merge of #126–#128, never pushed) is obsolete.
- GitHub Actions runs again (it was billing-locked on 2026-11-09).
