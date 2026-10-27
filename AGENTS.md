# AGENTS.md

## Session continuity

Read `HANDOFF.md` first, before exploring the repo — it's a live snapshot of
current focus, recent changes, and open items. Only read `HANDOFF_HISTORY.md`
if older context is actually needed (its latest five entries are usually
enough).

Before ending a session that changed meaningful state, move `HANDOFF.md`'s
current content into a new dated entry at the top of `HANDOFF_HISTORY.md`,
then overwrite `HANDOFF.md` with the new snapshot.

## Repository

H-Space is a small monorepo with two independently deployable applications:

- `apps/web`: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- `apps/luyra`: standalone Next.js Finance app with its own npm lockfile and
  Vercel deployment configuration

Data and auth live in Supabase; the only server-side code is the Next.js AI
routes in `apps/web/app/api/ai`. Read the instructions nearest to the files
being changed — the frontend has additional instructions in
`apps/web/AGENTS.md` and `apps/web/CLAUDE.md`.

The Spring Boot API that used to live at `apps/api` was removed on 2026-09-22;
see `docs/MONOREPO_MIGRATION.md` for where to recover it if it's ever needed.

## Commands

Use pnpm for repository and frontend commands.

```bash
pnpm dev
pnpm dev:web
pnpm lint
pnpm test
pnpm build
pnpm test:web
pnpm build:web
```

## Which agent to delegate to

Three scoped subagents live in `.claude/agents/`:

| Task touches | Agent | Notes |
| --- | --- | --- |
| `apps/web` only | `dev-frontend` | Next.js/TS/Supabase/AI routes |
| Supabase schema/RLS/migrations | `db-meta-manager` | Live, Orbit-shared database — confirm before applying |
| Reviewing a diff/PR before merge | `mr-reviewer` | Hengo-specific boundary checks, read-only |

For general repo work spanning docs, config, and app code, stay in the main
session rather than forcing it into one scoped agent.

## Boundaries

- Keep frontend domain calls in `apps/web/lib/api`.
- Keep reusable frontend primitives generic in `apps/web/components/ui`.
- Recovery features must remain domain-neutral; never name a specific
  compulsive behavior in code, copy, tests, seed data, comments, or commits.
- `apps/web/dev-learning-notes` is an unrelated embedded project; do not wire it
  into Hengo.
- Do not re-import the Spring backend, and do not push anything from here to the
  `Hen-Heang/hengo-api` backup repository.

## Deployment layout

- H-Space Vercel project Root Directory: `apps/web`.
- Luyra Vercel project Root Directory: `apps/luyra`; keep its existing project,
  domain, and production configuration unchanged until an approved cutover.
