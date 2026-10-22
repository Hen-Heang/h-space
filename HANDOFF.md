# HANDOFF

Read this file first in any new session, before exploring the repo. It is a
live snapshot, not a log—overwrite it as state changes. Older context lives in
`HANDOFF_HISTORY.md`; only open that file if you need history older than what is
summarized below.

## Snapshot

- **Updated:** 2026-10-21
- **Branch:** `main` (aligned with `origin/main` before these uncommitted edits)
- **Last commit:** 8f4e367 — `update skill with claude`
- **Working tree:** the H-Space rebrand was committed in `95db444`. One
  uncommitted follow-up (2026-10-22): an "Engineering highlights" list in
  `apps/web/components/home/AboutHSpace.tsx` — five claims, each traced to
  code: RLS via `requireUser`, Zod + `generateObject` + SSE, Ask Hengo FTS
  citations, SM-2 in `lib/srs.ts`, Vitest/Playwright/PWA push.
- **Known failing test:** `lib/goals.test.ts` > "shows 'Due today'…" fails on
  2026-10-22 with or without that change (returns "Overdue by 1d"); it passed
  on 10-21, so it looks date/timezone-dependent. Not yet investigated.

## Current focus

The application has been rebranded from Hengo to **H-Space**, with the tagline
**“My Projects. One Space.”** H-Space is presented as Hen Heang's personal
software ecosystem and engineering portfolio across learning, finance, AI
engineering, productivity, and development.

The existing Korean-learning product is preserved as **Hengo Learning**. Its
routes, Supabase data, AI APIs, authentication flow, internal `kori_*` table
prefixes, `koriai-*` storage keys, and user data were not removed or migrated.
No database, API contract, dependency, or deployment change was made.

### User-facing changes

- The public landing hero, footer, metadata, Open Graph image, PWA manifest,
  auth pages, legal-page branding, error pages, and responsive app-shell brand
  now use H-Space.
- `/home` now opens with an H-Space workspace introduction, keeps the existing
  daily mission and learning shortcuts under a labelled Hengo Learning section,
  and adds **My Apps** plus **About H-Space**.
- `components/home/MyAppsSection.tsx` renders responsive project cards from the
  typed catalog in `lib/projects.ts`.
- The catalog contains only repository-backed facts for Hengo Learning, Money
  Flow, Luyra, H-Phsar Commerce, and the developer portfolio. Live links are
  shown only where a deployment was confirmed (`money-flow.henheang.site` and
  `henheang.site`).
- `components/home/AboutHSpace.tsx` explains the portfolio purpose and current
  Next.js/Supabase/AI architecture without metrics or unsupported claims.

### Documentation and identity

- Root and web READMEs now describe H-Space and distinguish the Hengo Learning
  area.
- Root/web package names are `h-space` and `h-space-web`.
- Frontend AGENTS/CLAUDE guidance now preserves H-Space as the umbrella brand
  while retaining load-bearing legacy storage/database identifiers.

## Verification

- `pnpm lint` — passed with 0 errors and the same 5 pre-existing warnings in
  `GoalFormContainer.tsx`, `StudyPlanCard.tsx`, `lib/api/learning.ts`, and
  `lib/api/progress.ts`.
- `NODE_OPTIONS=--no-experimental-webstorage pnpm test` — 94 files and 1137
  tests passed.
- `pnpm build` — passed; Next.js generated 125 routes.
- `pnpm --dir apps/web format:check` — passed.
- `git diff --check` and `git diff --cached --check` — passed.
- `responsive-public.e2e.ts` — 9/9 passed against local Next.js using installed
  Chrome, covering landing/login at 360, 428, 768, 926, 1280, and 1440 widths,
  touch targets, registration, and real scrolling.

The first Playwright attempt exposed two local harness issues: the configured
Windows web-server command treats `--port` as a directory, and the bundled
Playwright Chromium executable is absent. The successful run started Next.js
directly and set `PLAYWRIGHT_EXECUTABLE_PATH` to installed Chrome. The test
configuration itself was not changed beyond its expected landing heading.

## Next steps

- Review the diff and commit when requested; nothing has been committed or
  pushed.
- An authenticated visual review of `/home` remains optional. Automated tests,
  build-time TypeScript validation, and public responsive browser checks pass.
- Existing infrastructure follow-ups remain separate: fix Vercel Preview
  Supabase variables and delete/repoint the retired Railway API service.

## Notes for future sessions

- Keep Hengo Learning feature names such as Hengo Coach and Ask Hengo where
  they identify the learning/assistant experience.
- Do not rename `kori_*`, `koriai-*`, or `hengo-*` persistence identifiers as a
  branding cleanup; they are load-bearing compatibility keys.
- Project card facts live in `apps/web/lib/projects.ts`; verify a repository or
  deployment before adding technical claims or a live link.
- One application remains: `apps/web`, deployed from that Vercel root.
