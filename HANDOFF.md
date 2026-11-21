# HANDOFF

## Snapshot

- **Updated:** 2026-11-21.
- **Production outage (since 2026-11-19 12:04 UTC):** the Neon project `h-space-api` (free plan) ran out of monthly compute (~110 CU-hours), and Neon suspended it until **2026-12-01**. Spring's connection pool kept the database awake 24/7. With no database, h-space-api's sign-in and refresh fail (`HikariPool … total=0`), so nobody can sign in. H-Vault, the Spring inbox and `/finance` (Neon `luyra`, same project) are down too. Vercel and the frontend are fine.
- **Owner decision:** retire h-space-api (Spring) and its VPS, and run on Vercel + Supabase + Neon only. Plan: `docs/SPRING_EXIT_PLAN.md`. H-Vault stays in Neon `hspace` and moves behind a Vercel route (step 3), so no ciphertext moves.
- **Checkout:** branch `feature/supabase-auth` from `origin/main` (`16893db`). **Not committed or pushed.** The owner's uncommitted `second-brain/` changes and the untracked `test-results/` came along; they aren't part of this work, so stage explicit paths only.
- **This session, step 1: sign-in moved to Supabase Auth** (frontend only; no database, Vercel or env change):
  - `lib/supabase.ts`: supabase-js owns the session again (`koriai-auth`, auto-refresh, `detectSessionInUrl`). The bridge `accessToken` option is gone.
  - `lib/auth-store.ts`: synchronous reads of that session. `needsMfa` makes an `aal1` session of an account with a verified authenticator count as signed out. `clearAuth` signs out this session only (`scope: "local"`) and always clears local state.
  - `lib/api/auth.ts`: password, email code (`shouldCreateUser: false`; the "no account" answer is swallowed so the form doesn't reveal who has one), Google ID token **with nonce**, `verifyMfa(factorId)`, `pendingMfa`, reset password.
  - `lib/api/mfa.ts` + `/settings/security`: Supabase TOTP (status / enroll / enable / disable with a code). No backup codes.
  - `/login`: email only (no username). It resumes a half-finished MFA sign-in, and cancelling signs out. `/register` is now an invite-only notice. `/reset-password` works with a Supabase recovery link, asking for the code first if MFA is on. `/verify-email` and `/unlock-account` redirect to `/login`.
  - Removed: invites (UI, hook, API), `token-link-action`, the unused `MfaChallenge`, `lib/username.ts`. `hspace-http.ts` now refuses every call with 503 without sending anything (H-Vault shows its error until step 3). `ai-client.ts` no longer sends the Spring token.
  - Docs: `AGENTS.md`, `apps/web/AGENTS.md` (auth section + env), `lib/mcp-consent.ts` comment.
- **Verification (local):** `tsc` clean; `pnpm test` 221 files / 2,400 tests passed (rewritten: `auth-store`, `auth`, `mfa`, `hspace-http` tests; updated Google button test); `pnpm lint` 0 errors / 5 old warnings; `pnpm build:web` passed (`NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`); `next start` smoke: `/login` `/register` `/forgot-password` `/reset-password` `/home` 200, `/verify-email` `/unlock-account` 307 → `/login`. **Not done:** a real sign-in against Supabase (password, email code, Google, MFA enroll/verify, reset link) and a mobile visual check. Those need the dashboard settings below and the owner's account.

## Current focus

1. **Owner, before merging step 1:** Supabase dashboard settings from `docs/SPRING_EXIT_PLAN.md`: Google provider client ID, the Magic link template with `{{ .Token }}`, a redirect URL for `/reset-password`, and TOTP MFA on. Then try every sign-in path on a preview deployment. If you changed your password in Spring after the import, use "Forgot password" or an email code.
2. **Owner, before 2026-12-01:** stop the Spring container on the VPS so it can't use up December's Neon compute.
3. **MFA in the database: written and tested, not applied.** `20261121120000_require_mfa_when_enrolled.sql` (restrictive `aal2`-when-enrolled policy on every RLS table in `public`, Orbit's included, as the owner decided). The local test script passed 16/16. Apply only with the owner's go-ahead, after #126 merges and MFA is enrolled; then check the MCP connector with MFA on.
4. **Backup codes → second authenticator (owner decision 2026-11-21, next to build).** Supabase MFA has no backup codes, so allow enrolling a second TOTP factor, let sign-in choose which device, and update the `AGENTS.md` backup-code rule.
5. **Step 2:** unset `NEXT_PUBLIC_DATA_SOURCE_INBOX` in Vercel. After Neon is back, copy any Spring-only `inbox_items` into `kori_inbox_items` (needs approval).
6. **Step 3:** H-Vault route `app/api/vault/*` over Neon `hspace` (Neon HTTP driver, requires `aal2`, every query scoped by user). Read `.claude/rules/vault.md`, `apps/web/docs/h-vault.md` and the h-space-api `docs/vault-design.md` first.
7. **Step 4 cleanup** and the legacy JWT-secret rotation decision (affects Orbit).
8. **Carried over:** PR #124 (Notes retirement) was merged to `main` as `16893db`. Finance D–F follow-ups (`apps/web/docs/finance-redesign.md` §7); MCP live checks; UI audit follow-ups; independent H-Vault security audit and restore drill.

## Notes for the next session

- Neon project: `delicate-voice-81285481`, branch `br-plain-base-b3wzrtye`, endpoint `ep-green-hill-b3jcgzby` (suspended by quota; resets 2026-12-01).
- The Supabase project is shared with Orbit: dashboard auth settings are project-wide.
- Playwright and GitHub Actions notes from 2026-11-10 still apply (see `HANDOFF_HISTORY.md`).
