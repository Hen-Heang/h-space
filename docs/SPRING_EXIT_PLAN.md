# Leaving h-space-api (Spring) — plan

Owner decision, 2026-11-21: retire the Spring service `h-space-api` and its VPS.
H-Space runs only on **Vercel + Supabase + Neon**: no server of our own to
patch, pay for or keep awake.

## Why

- **Outage, 2026-11-19.** The Neon project `h-space-api` (free plan) used up
  its monthly compute (~110 of 100 CU-hours) and Neon suspended it until
  2026-12-01. Spring's Hikari pool held connections open 24/7
  (`api-core` sets no `minimum-idle`, so it kept up to 20 open), so the
  database never scaled to zero. With no database, sign-in, refresh, H-Vault,
  the Spring inbox and `/finance` (same Neon project) all failed.
- **Security.** The token bridge (`POST /api/auth/supabase-token`) means the
  VPS holds the Supabase JWT secret and the service-role key. Anyone who
  breaks into the VPS can forge a session for any user of the Supabase project,
  Orbit's included. Supabase Auth is vendor-maintained and tested; our
  Spring auth had not been audited yet.
- **Cost and operations.** No VPS, no Caddy, no JWT secret of our own to rotate.

## Target

| Area | Before | After |
| --- | --- | --- |
| Sign-in, sessions, TOTP MFA | h-space-api (`users`, `refresh_tokens`, … in Neon `hspace`) | **Supabase Auth** (same user UUIDs) |
| Supabase data access | bridge-issued token | the Supabase session's own token |
| App data (Planner, Learning, …) | Supabase + RLS | unchanged |
| Inbox | hub-api (`NEXT_PUBLIC_DATA_SOURCE_INBOX=spring`) | Supabase `kori_inbox_items` (flag unset) |
| H-Vault ciphertext | hub-api → Neon `hspace` | **Neon `hspace`, unchanged**, through a Vercel route (step 3) |
| Finance | Vercel route → Neon `luyra` | unchanged |

User ids don't change: accounts were first imported from Supabase into Spring
with the same UUIDs (h-space-api `docs/supabase-user-import.md`) and the bridge
kept an `auth.users` row for each one. Every RLS row stays linked.

## Steps

0. **Contain the outage (owner).** Stop the Spring container on the VPS before
   2026-12-01 so it can't use up December's Neon compute. Without Spring nothing
   holds a connection, so Neon should scale to zero between requests.
1. **Sign-in on Supabase Auth** (`feature/supabase-auth`). Email + password,
   email code, Google ID token and TOTP MFA via supabase-js. The bridge, the
   Spring auth client, username login, invites, account-unlock and
   verify-email token pages are retired. Needs Supabase dashboard settings
   (below). Restores Home, Planner, Learning and the other Supabase pages
   without Neon.
2. **Inbox back to Supabase.** Unset `NEXT_PUBLIC_DATA_SOURCE_INBOX` in Vercel
   (that's the documented rollback in `lib/feature-flags.ts`). After Neon is
   back, copy any `inbox_items` created in Spring since the switch into
   `kori_inbox_items`. Needs approval: a write to the live database.
3. **H-Vault through a Vercel route.** `app/api/vault/*` reads and writes the
   existing `vault_keysets` / `vault_items` in Neon `hspace` with the Neon HTTP
   driver (like finance). The route verifies the Supabase session, **requires
   `aal2`** and scopes every query by the verified user id. The browser-side
   encryption doesn't change; only the transport does. No ciphertext is moved.
   The pending independent security review must cover this route.
4. **Cleanup.** Remove `lib/api/auth-http.ts` / `hspace-http.ts` callers,
   `api.henheang.site` from `lib/csp.ts`, `NEXT_PUBLIC_AUTH_API_URL` /
   `NEXT_PUBLIC_HSPACE_API_URL`; shut down the VPS; archive h-space-api as a
   learning repo; update `AGENTS.md`, `apps/web/AGENTS.md`, `HANDOFF.md`.

## Supabase settings for step 1 (owner, dashboard)

The project is shared with Orbit, so these are project-wide.

- **Auth → Providers → Email:** enabled. **Google:** enabled with the same
  client ID as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- **Auth → Multi-factor:** TOTP enrollment and verification enabled (the default).
- **Auth → Email templates → Magic link:** include `{{ .Token }}` so the email
  carries the 6-digit code the "Email code" sign-in asks for (keeping the
  link is fine for Orbit).
- **Auth → URL configuration → Redirect URLs:** include
  `https://hengo.henheang.site/reset-password` (and the preview/local
  equivalents) for password-reset links.
- **New accounts:** H-Space no longer offers self sign-up; the email code
  never creates an account (`shouldCreateUser: false`). Add a person under
  Auth → Users → Add user; they sign in with an email code. Whether the
  project itself allows sign-ups is an Orbit-wide setting; H-Space data is
  protected by RLS either way.

## Known gaps after step 1 — decide before relying on MFA

- **MFA must be enrolled again.** TOTP secrets can't move from Spring to
  Supabase. Supabase has no backup codes, so the backup is a **second
  authenticator** (`feature/backup-authenticator`): link two devices, pick
  either at sign-in, remove a lost one with the other. With only one device,
  a lost phone still needs a project admin to remove the factor.
- **MFA in the database: written, not applied.**
  `apps/web/supabase/migrations/20261121120000_require_mfa_when_enrolled.sql`
  adds a restrictive policy to every RLS table in `public`, Orbit's shared
  tables included (owner decision, 2026-11-21). It requires `aal2` only when
  the user has a verified factor. Tested on a throwaway local Postgres
  (`apps/web/supabase/tests/require_mfa_when_enrolled.test.sh`, all 16
  checks passed). Apply it after this PR merges and the owner has enrolled
  MFA in Supabase. It's a live-database change and needs the owner's go-ahead.
  After applying, check the MCP connector with MFA on (its tokens may be
  `aal1`). Not covered: `storage.objects` and Orbit's older
  security-definer functions.
- **Legacy JWT secret.** Retiring the bridge stops the VPS from minting tokens,
  but whoever has the secret still could. Rotating to Supabase's asymmetric
  signing keys closes that; it affects Orbit too, so it's a separate decision.
- **Passwords changed in Spring** after the import aren't in Supabase. Use
  "Forgot password" or the email code once.

## Rollback

Step 1 is a frontend-only change. Reverting the PR restores the Spring client,
which works again once Neon's compute is back and Spring is running.
