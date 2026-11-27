# Auth V2 in the web app

Status (2026-11-27, branch `feat/auth-v2-web`): **implemented and tested locally
with synthetic data; every new path is OFF by default.** Nothing applied to the
shared Supabase project, no provider configured, nothing deployed. Backend half:
h-space-api `docs/auth-v2.md` (branch `feat/auth-v2-backend`). Design: the
owner's vault notes "API Migration" 10/11/05/08.

Login itself is unchanged: password, non-creating email code, Google ID token
with nonce, Supabase TOTP with device choice and recovery, `koriai-auth`
storage. The main Supabase client's flow type is untouched, so reset links and
the Google nonce path behave as before.

## Switches (all build-time `NEXT_PUBLIC_*`, all off unless set exactly)

| Variable                             | Value that turns it on | Effect                                                   |
| ------------------------------------ | ---------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_HSPACE_ADMISSION`       | `enforce`              | Admission check after the first factor and on app entry  |
| `NEXT_PUBLIC_AUTHV2_INBOX_BACKEND`   | `spring`               | Inbox uses h-space-api's pilot instead of Supabase       |
| `NEXT_PUBLIC_AUTHV2_API_URL`         | h-space-api origin     | Required with the above; also added to CSP `connect-src` |
| `NEXT_PUBLIC_FEATURE_GITHUB_SIGN_IN` | `true`                 | "Continue with GitHub" + `/auth/callback`                |

New names on purpose: the retired `NEXT_PUBLIC_DATA_SOURCE_INBOX` /
`NEXT_PUBLIC_HSPACE_API_URL` may still be set in Vercel and must not
re-activate anything. `spring` without a valid URL fails the build instead of
silently using Supabase.

## Flows

**Sign-in** (`lib/api/auth.ts` `completeSignIn`): first factor → **admission**
(`lib/api/admission.ts`, own `kori_app_access` row, 8 s bound) → code step if
the account has an authenticator → profile bootstrap (`kori_profiles.id`,
insert-if-missing only) → app. Not admitted: signed out, generic "doesn't have
access" message, no profile write. Admission unreadable: signed out, "try again"
message — never allowed. Admission is re-checked after the code step.

**App entry** (`components/auth/admission-gate.tsx` in `app/(main)/layout.tsx`):
a restored session is checked before the shell mounts, so no workspace query
runs first. Denied → sign-out → `/login?reason=access_denied`. Unavailable →
"Couldn't confirm your access" with Try again / Sign out; nothing loaded.

**Inbox pilot** (`components/inbox/inbox-pilot-gate.tsx`, `lib/api/hub-http.ts`,
`lib/api/inbox-http.ts`): asks `GET /api/hub/session` first. aal2 → the list
(served by Spring). aal1 (no authenticator) → "Set up two-step verification"
with a link to `/settings/security`. 403 → no access. 401 → sign-out. Other →
"unavailable" with retry. The HTTP store keeps the Supabase store's contract:
same create defaults, PATCH sends only changed keys (null clears),
conversions are additive, create/delete expect the 200 envelope. Requests send
`Authorization: Bearer <Supabase access token>`, `credentials: "omit"`, no
redirects.

**Account change** (`components/providers/user-cache-reset.tsx`, always on):
the TanStack Query cache is cleared whenever the signed-in user changes or
signs out (also from another tab), so a previous user's cached data can't
render for the next (SES-04). Same-user token refresh keeps it.

**GitHub, optional** (`lib/github-auth.ts`, `app/auth/callback/page.tsx`):
PKCE through a **second, isolated** Supabase client with its own storage key
(`koriai-auth-github-pkce`), so the main client's flow type stays as is. The
callback validates `next` with `safeNextPath`, strips the code from the URL at
once, exchanges it once, hands the session to the main client, deletes the PKCE
entries, then runs the same admission/MFA/profile path. Provider error text is
never shown. No scopes beyond the provider default. **Only parsing/flag
behaviour is unit-tested; no real GitHub round trip has happened.**

## Supabase migration (authored, not applied)

`supabase/migrations/20261127120000_kori_app_access.sql` + throwaway-cluster
test `supabase/tests/kori_app_access.test.sh` (13 checks, run locally on
PostgreSQL 18). See the migration's comments for the deliberate MFA-policy
exception and the ordering hazard with `20261121120000_require_mfa_when_enrolled.sql`.

## Run against a local h-space-api (synthetic)

Start the backend and its synthetic Supabase stub as in h-space-api
`docs/auth-v2.md`, then:

```bash
NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 \
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_synthetic_only \
NEXT_PUBLIC_HSPACE_ADMISSION=enforce \
NEXT_PUBLIC_AUTHV2_INBOX_BACKEND=spring NEXT_PUBLIC_AUTHV2_API_URL=http://127.0.0.1:8084 \
npx next dev -p 3001       # backend CORS_ALLOWED_ORIGINS must include http://localhost:3001
```

The stub can't sign anyone in through the login form (it isn't GoTrue); the
local browser pass put a stub-minted session in `localStorage["koriai-auth"]`.
To connect to a **real** Supabase project instead, point both apps at it only
after the owner approves applying the admission migration there.

**Disable / revert:** remove the four variables (or set anything else) and
rebuild — behaviour is exactly the pre-V2 app, except the always-on cache reset.

## Tests

`lib/auth-v2.test.ts`, `lib/api/auth-admission.test.ts`,
`lib/api/admission.test.ts`, `lib/api/inbox-http.test.ts`,
`lib/github-auth.test.ts`, `components/auth/admission-gate.test.tsx`, CSP case
in `lib/csp.test.ts`. Case ids (ACC-, MFA-, INBOX-, GH-, SES-) refer to the vault
test plan (note 11).
