# Development

## Prerequisites

- Node.js 22
- pnpm 10

## Install

From the repository root:

```bash
pnpm install
```

The root pnpm lockfile manages `apps/web`. Luyra keeps its own npm lockfile and
dependency tree so its deployment can remain independent.

## Environment

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the web app's
Supabase, OpenAI, Google, and push values. Data and auth live in the hosted
Supabase project, so no local database is required.

On networks with corporate TLS inspection, keep using `NODE_EXTRA_CA_CERTS` when
starting the web app so server-side Supabase and OpenAI requests trust the local
inspection CA.

## Run the app

```bash
pnpm dev
```

- Web: http://localhost:3000

Luyra runs separately on port 3001:

```bash
npm --prefix apps/luyra install
npm --prefix apps/luyra run dev -- --port 3001
```

Run both applications in separate terminals. Configure each app's own local
environment file (`apps/web/.env.local` and `apps/luyra/.env.local`). H-Space
uses Supabase for auth and application data. Luyra uses Supabase Auth and its
existing Neon database for finance data; it does not use H-Space's Supabase
tables for financial records.

## Verification

```bash
pnpm lint:web
pnpm format:web:check
pnpm test:web
pnpm build:web
```

## CI

- `.github/workflows/web.yml` runs frontend install, lint, format check, tests,
  and build when web/workspace files change.

## Deployment checklist

### Vercel

1. Keep the Git repository set to `Hen-Heang/h-space`.
2. Set Root Directory to `apps/web`.
3. Keep the Next.js framework preset and default `.next` output.
4. Verify all existing environment variables remain configured for Production,
   Preview, and Development as appropriate.

The H-Space Vercel project deploys `apps/web`. Luyra remains on its existing
Vercel project and domain, with Root Directory set to `apps/luyra`. Do not
change its Git connection, root, environment, schedules, or production domain
until a preview build and rollback plan have been reviewed. See
[ECOSYSTEM-INTEGRATION.md](ECOSYSTEM-INTEGRATION.md) for the staged switch.

The Railway service that built the former `apps/api` no longer has a source in this repository — see
[MONOREPO_MIGRATION.md](MONOREPO_MIGRATION.md).
