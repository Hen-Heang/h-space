<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## H-Space monorepo

- This application remains independently deployable from `apps/luyra` and
  keeps its npm lockfile. Do not add it to the root pnpm workspace or combine
  dependency locks without a separate compatibility review.
- Run Luyra commands from this directory with npm. Its environment, Supabase
  Auth session, Neon database, and integrations remain separate from `apps/web`.
- Keep finance requests server-authenticated and scoped to the verified user;
  never connect H-Space's browser directly to Neon or move finance data into
  H-Space's Supabase project.
- Production deployment, environment variables, cron schedules, domains, and
  auth configuration require an explicitly reviewed cutover. See
  `../../docs/ECOSYSTEM-INTEGRATION.md`.
