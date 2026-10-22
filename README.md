# Luyra

Personal money tracking, budgeting, savings, analytics, and financial reviews.

Luyra is the repository's only active product surface. The earlier Hengo
goals, tasks, habits, Today, and learning modules are paused and hidden, but
their source code is intentionally preserved for a possible future resume.
Authenticated visits start at `/finance`; paused Hengo routes redirect there.

See [docs/ROADMAP.md](docs/ROADMAP.md) for the current focus and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the existing system boundaries.

## Tech stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4, shadcn/ui-style components
- Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`) — authentication only
- Neon Postgres (`@neondatabase/serverless`) — application data
- Zod for request validation
- Vercel Workflow (`workflow`) and Vercel Cron for scheduled jobs
- Optional integrations: Telegram, Resend email, Web Push (`web-push`), and
  the Anthropic SDK for the AI Money Coach
- Vitest for unit tests

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |

CI (`.github/workflows/ci.yml`) runs lint and build on every pull request and
on pushes to `main`.

`package.json` has an `allowScripts` block listing the dependencies whose
install scripts npm may run (`esbuild`, `@swc/core`, `unrs-resolver`,
`cbor-extract`). Approvals are pinned to exact versions; if npm warns about
unreviewed install scripts after an upgrade, review them with
`npm install-scripts ls` and approve the new versions.

### Corporate network / TLS inspection

If `next dev` (or any Neon/Supabase CLI) fails with `SELF_SIGNED_CERT_IN_CHAIN`
or "self-signed certificate in certificate chain", your network is doing TLS
inspection (observed here: Somansa DLP) and Node doesn't trust its root CA —
even though your OS and browser already do. Fix it for Node specifically:

1. Export the intercepting root CA to a PEM file (ask IT, or export it from
   Windows' trusted root store / your browser's certificate settings).
2. Set `NODE_EXTRA_CA_CERTS=/path/to/that.pem` before running `npm run dev`,
   `next build`, or any Neon/Supabase CLI — Node ignores the OS trust store,
   so this has to be explicit. Keep the PEM out of git; it's machine/network
   specific.

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values. Never commit
`.env.local`.

| Variable | Where it's used | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | safe to expose |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server | safe to expose |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Primary Google Identity Services login | safe to expose |
| `DATABASE_URL` | server only | Neon connection string — never prefix with `NEXT_PUBLIC_` |

`.env.example` is the authoritative list and also documents the optional
keys, each of which degrades gracefully when unset:

- `CRON_SECRET` — authorizes the scheduled `/api/cron/*` routes
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` —
  browser push notifications
- `EXCHANGE_RATE_API_KEY` — higher-limit USD→KRW rate; without it the
  provider's free daily keyless endpoint is used
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — Telegram reports and alerts
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` — AI Money Coach
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — email reports

## Supabase Auth setup

1. Use your existing Supabase project.
2. Copy the project URL and publishable (anon) key from Project Settings →
   API into `.env.local`.
3. The primary project currently handles the outer application session. The
   legacy Money Flow data remains in its separate Supabase project while
   authentication is consolidated in a later backend phase.

## Neon setup

Using the existing Neon project (id `divine-darkness-19631415`), `main`
branch, `neondb` database. Schema changes are plain SQL files in
[db/migrations](db/migrations) (`001`–`013`), applied manually and in order —
see [db/README.md](db/README.md) for how to apply or add one.

To point a fresh checkout at it:

1. Get the pooled connection string: `neon connection-string --project-id divine-darkness-19631415 --pooled`
   (or from the Neon console → Connect).
2. Put it in `.env.local` as `DATABASE_URL`.

## Deployment

Luyra is deployed on Vercel (project `luyra`, functions in the Seoul region
`icn1`). Every pull request gets a preview deployment and merges to `main`
deploy to production. [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) is the
step-by-step guide: Vercel project settings, the environment-variable matrix
per environment, the Neon pooled connection string, Supabase Auth redirect
URLs, Google Identity Services origins, Telegram webhook registration, and a
post-deploy verification checklist.

Scheduled jobs run on Vercel Cron, configured in [vercel.json](vercel.json):
budget alerts (Telegram and push), spending-spike alerts, daily logging
reminders, the weekly summary, and the monthly report. Schedules are in UTC;
the routes do their date math in Asia/Seoul. See the "Scheduled
notifications" section of the deployment guide.

Security headers are not set yet — see the end of that guide. The wider
feature backlog is in
[docs/FINANCE-GAP-ANALYSIS.md](docs/FINANCE-GAP-ANALYSIS.md).

## Future: Spring Boot backend

Phase 4 replaces the Next.js Route Handlers under `app/api/*` with a Spring
Boot REST API in front of the same Neon database. `lib/api/*.ts` is the only
layer components talk to, so that swap changes a base URL and a handful of
server files — not the frontend. Details in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
