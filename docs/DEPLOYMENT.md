# Deployment

Target: **Vercel**, matching the Money Flow reference deployment. Nothing in
this repo is Vercel-specific yet, so another Node host works too — but the
cron section below assumes Vercel Cron.

Data lives in **Neon Postgres**; authentication lives in **Supabase Auth**.
Both are already provisioned — this guide connects a deployment to them, it
does not create them.

## 1. Connect the repository

1. Vercel → **Add New… → Project** → import this repository.
2. Framework preset: **Next.js** (auto-detected). Leave the build command,
   output directory, and install command at their defaults.
3. Node.js version: **20.x or newer** — `@neondatabase/serverless` and Next 16
   both require it.
4. Do **not** deploy yet. Add the environment variables first (next section),
   otherwise the first build ships without them.

## 2. Environment variables

Add these under **Settings → Environment Variables**. Tick every environment
you want the value in (Production / Preview / Development).

### Required — the app will not work without these

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | From Supabase → Project Settings → API. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server | The publishable (anon) key. Safe to expose. |
| `DATABASE_URL` | **server only** | Neon connection string. Use the **pooled** one — see below. Never prefix with `NEXT_PUBLIC_`. |

**Use Neon's pooled connection string.** Vercel functions are short-lived and
can scale to many concurrent instances; the direct (unpooled) string will
exhaust Postgres connections under any real traffic.

```bash
neon connection-string --project-id divine-darkness-19631415 --pooled
```

Or copy it from the Neon console → **Connect** → toggle *Connection pooling*
on. The pooled host contains `-pooler` in its name.

### Optional — each one degrades gracefully when unset

| Variable | Scope | Enables | Without it |
|---|---|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | browser | Google sign-in button | Email + password login still works; the Google button reports "Google sign-in is not configured." |
| `EXCHANGE_RATE_API_KEY` | server | Live USD→KRW rate | Falls back to a fixed rate the user can still edit per transaction. |
| `TELEGRAM_BOT_TOKEN` | server, secret | Sending Telegram messages | Settings shows "Telegram integration isn't configured." |
| `TELEGRAM_WEBHOOK_SECRET` | server, secret | Validating inbound webhook calls | Same as above. A value you choose yourself. |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | browser | The `t.me` deep link in Settings | Linking UI can't build its deep link. |
| `ANTHROPIC_API_KEY` | server, secret | AI Money Coach | Settings shows "AI Money Coach isn't configured." |
| `ANTHROPIC_MODEL` | server | Model override | Defaults to `claude-opus-5`. |
| `RESEND_API_KEY` | server, secret | Emailing the weekly/monthly report | Settings shows "Email isn't configured." |
| `RESEND_FROM_EMAIL` | server | Custom sender address | Sends from Resend's shared sandbox address, which is more likely to be filtered. |
| `CRON_SECRET` | server, secret | The scheduled Telegram jobs in `vercel.json` | Every `/api/cron/*` route returns 503, so nothing is scheduled — and nothing is exposed. |

### Remove these if present

`NEXT_PUBLIC_MONEY_FLOW_SUPABASE_URL` and
`NEXT_PUBLIC_MONEY_FLOW_SUPABASE_PUBLISHABLE_KEY` belonged to the first,
read-only Money Flow test slice. That code is gone and nothing reads them, so
delete them from the Vercel project's environment variables if they are still
set. Finance runs entirely on the native Neon API.

## 3. Supabase Auth URLs

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://<your-production-domain>`
- **Redirect URLs**: add every origin that will complete a sign-in.

```text
https://<your-production-domain>/auth/callback
https://<your-vercel-project>-*.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

The wildcard entry covers preview deployments, whose subdomain changes per
branch. Both Google OAuth and the password-reset flow land on
`/auth/callback` (`components/auth/forgot-password-form.tsx:24` sends
`?next=/reset-password`), so this single path covers both.

## 4. Google Identity Services

Only if you set `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. In Google Cloud Console →
**APIs & Services → Credentials** → your OAuth client:

- **Authorized JavaScript origins**: your production domain, plus
  `http://localhost:3000`.

`components/auth/hengo-google-sign-in.tsx` uses the Google Identity Services
script (`accounts.google.com/gsi/client`) with a nonce, so it needs the
*origin* authorized — not a redirect URI.

## 5. Telegram webhook — after the first successful deploy

Nothing in this codebase calls `setWebhook`. Register it yourself once the app
has a public HTTPS URL:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<your-production-domain>/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

`app/api/telegram/webhook/route.ts` rejects any request whose
`X-Telegram-Bot-Api-Secret-Token` header doesn't match, so the
`secret_token` value must be identical to the deployed env var.

Verify with `https://api.telegram.org/bot<TOKEN>/getWebhookInfo` — a non-empty
`last_error_message` means the URL isn't reachable or the secret disagrees.

## 6. Resend sender domain

Only if you set `RESEND_API_KEY`. To use your own `RESEND_FROM_EMAIL`, verify
the domain in the Resend dashboard first (DNS records). Until then, leave
`RESEND_FROM_EMAIL` unset and mail sends from Resend's sandbox address.

## 7. Database migrations

There is no migration runner — see [db/README.md](../db/README.md). Apply any
pending files to the Neon database **before** the deploy that depends on them,
either with `psql` or by pasting into the Neon SQL Editor.

> **Pending right now:**
> `db/migrations/007_finance_savings_contributions_cascade.sql` has never been
> applied. Until it is, deleting a savings goal that has contribution history
> fails with a foreign-key violation.

## 8. Post-deploy verification

- [ ] Sign in with email + password.
- [ ] Sign in with Google (if configured).
- [ ] Request a password reset and confirm the emailed link lands on
      `/reset-password` rather than an "invalid redirect" error.
- [ ] `/finance` loads with real data — this proves `DATABASE_URL` reached the
      function.
- [ ] Add, edit, and delete a transaction.
- [ ] Delete a savings goal that has contributions (proves migration 007
      landed).
- [ ] Settings → link Telegram, then **Send to Telegram** on a report.
- [ ] Settings → **Send email** on a report.
- [ ] `curl` one cron route with the deployed `CRON_SECRET` and confirm it
      returns counts; then call it again with a wrong secret and confirm 401.
- [ ] Install the PWA and load it once offline.

## Scheduled notifications

`vercel.json` is the authoritative schedule. Every job is gated on
`CRON_SECRET`, so nothing here fires until that is set.

The alert jobs reach Telegram-linked users only. The two **report** jobs
deliver on every channel a user has enabled — Telegram when a chat is linked,
email when the Settings toggle is on — and track each channel separately, so
one failing does not suppress the other's retry.

| Endpoint | Schedule (UTC) | KST | Purpose |
|---|---|---|---|
| `/api/cron/budget-alerts` | `0 10 * * *` | 19:00 | Alert on a budget crossing to a higher warning level |
| `/api/cron/spending-spike` | `0 12 * * *` | 21:00 | Flag a day far above this month's daily average |
| `/api/cron/daily-reminder` | `0 3 * * *`, `0 11 * * *` | 12:00, 20:00 | Nudge users who have logged nothing that day |
| `/api/cron/weekly-summary` | `0 0 * * 1` | Mon 09:00 | Weekly summary — Telegram and/or email |
| `/api/cron/monthly-report` | `0 2 * * *` | 11:00 | The month that just finished, once — Telegram and/or email |

Cron date math is pinned to **Asia/Seoul** (`lib/finance-cron-time.ts`), not
the function's UTC clock — otherwise "today" and "this month" would land nine
hours away from the user's actual day. The monthly job runs daily on purpose:
one missed run on the 1st would otherwise lose a whole month's report, and the
last-sent marker added by `db/migrations/010_finance_report_delivery.sql`
keeps the daily schedule from re-sending.

Set `CRON_SECRET` (server-only) in the Vercel project — Vercel Cron sends it
automatically as `Authorization: Bearer <CRON_SECRET>`. Without it every route
returns 503 rather than running unauthenticated.

Test one locally with the same secret from `.env.local`:

```bash
curl http://localhost:3000/api/cron/budget-alerts \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Vercel's Hobby plan caps cron jobs at a small number of daily invocations;
this schedule assumes a paid plan. On Hobby, drop the second
`daily-reminder` entry and the `spending-spike` job first.

Email delivery needs `RESEND_API_KEY`; without it the report jobs simply skip
the email channel and still deliver on Telegram. The "Send email" and "Send to
Telegram" buttons in Settings remain for sending one on demand — they do not
touch the schedule's markers, so a manual send does not suppress the
scheduled one.

## Not wired up yet

### Security headers

`next.config.ts` is empty. Money Flow sets `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and a
`Content-Security-Policy` via `headers()`. Luyra sets none of them, so a
public deployment ships without CSP or clickjacking protection.

Porting this needs care rather than a copy-paste: Luyra's allowed origins
differ from Money Flow's (`accounts.google.com` for the sign-in script,
`api.anthropic.com` instead of Gemini/OpenAI, plus Supabase, Resend, and
exchangerate-api). A CSP that's too strict silently breaks Google sign-in, so
it should land as its own change and be verified against a preview
deployment.

### Region

Vercel functions default to `iad1` (US East). If the Neon project is in
Asia-Pacific, every query crosses the Pacific twice. Check the region in the
Neon connection host (e.g. `ap-southeast-1.aws.neon.tech`) and, if it isn't
US East, pin the function region to match in `vercel.json`:

```json
{ "regions": ["icn1"] }
```
