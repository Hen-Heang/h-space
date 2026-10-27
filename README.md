# H-Space

**My Projects. One Space.**

H-Space is Hen Heang's personal software ecosystem and engineering portfolio.
It connects daily planning, learning, knowledge, and finance while keeping each
application's technical decisions and source code easy to review.

## Projects

- `apps/web` — Next.js 16 H-Space application, dashboard, Hengo Learning, and
  Supabase/AI route integration
- `apps/luyra` — separately deployable Next.js Finance application, using
  Supabase Auth and Neon Postgres
- `docs` — development and workflow guidance

The application is a client-side SPA over Supabase plus a focused set of
authenticated Next.js AI route handlers. Hengo's existing Korean-learning
features remain available as **Hengo Learning**; its routes, data, APIs, and
stored user information are preserved. There is no separate backend service to
run.

## Architecture at a glance

- Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4
- Supabase authentication and Postgres data protected by Row Level Security
- TanStack Query for client-side server state
- Vercel AI SDK and OpenAI behind authenticated Next.js route handlers
- Vitest and Playwright for automated verification

## Connected applications

- **Hengo Learning** — Korean learning, workplace practice, interview prep,
  spaced repetition, and authenticated AI coaching
- **Luyra** — the dedicated Finance application, linked from My Apps and the
  H-Space dashboard; its existing standalone deployment remains active
- **H-Phsar Commerce** — Next.js and Spring Boot B2B marketplace for buyers,
  suppliers, and administrators
- **Developer Portfolio** — recruiter-focused project case studies, backend
  learning lab, resume views, and a retrieval-grounded AI assistant

## Quick start

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts the web app on port 3000. See
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for environment variables,
platform-specific commands, tests, and deployment settings.

## Root commands

```bash
pnpm dev             # Next.js dev server
pnpm dev:web         # same, explicit
pnpm lint            # frontend lint
pnpm test            # frontend tests
pnpm build           # frontend build
pnpm test:web
pnpm build:web
```

Further documentation:

- [Web README](apps/web/README.md)
- [Hengo Learning product direction](docs/HENGO_V2.md)
- [Repository history notes](docs/MONOREPO_MIGRATION.md)
- [Notion MCP workflow](docs/NOTION_MCP.md)
- [H-Space + Luyra integration and migration](docs/ECOSYSTEM-INTEGRATION.md)
