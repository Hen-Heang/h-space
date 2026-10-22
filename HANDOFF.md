# HANDOFF

Read this file first in any new session, before exploring the repo. It is a
live snapshot, not a log—overwrite it as state changes. Older context lives in
`HANDOFF_HISTORY.md`; only open that file if you need history older than what is
summarized below.

## Snapshot

- **Updated:** 2026-10-22
- **Branch:** `feat/hub-sidebar-nav`
- **Commits:** Phase 1 — `feat(web): turn /home into the personal daily
  dashboard`; Phase 2 — `feat(web): organize navigation into seven workspaces`
  (on top of e4f4ec6). Not pushed; no PR opened.

## Current focus — H-Space daily workspace upgrade

A four-phase plan agreed with the maintainer:

1. **Daily usability** — `/home` as a personal dashboard. **Implemented (this session).**
2. **Navigation** — seven workspaces, every route and deep link preserved.
   **Implemented (this session)** — see "Phase 2" below.
3. **Portfolio value** — richer My Apps catalog (purpose, problem, architecture,
   tech choices, challenges, status, verified links) and a clear split between
   the private dashboard and public portfolio. Not started.
4. **Engineering quality audit** — auth/RLS, AI access control and rate limits,
   error/loading states, responsive layouts, tests, CI, architecture docs. Not
   started.

Constraints from the maintainer: no new repo/app, no Spring backend, don't
rename `kori_*`/`koriai-*`/`hengo-*` persistence keys, no production schema
change without a reviewed migration plan, no private data on public pages, no
fabricated achievements.

### Phase 1 — what changed

`/home` (`apps/web/app/(main)/home/page.tsx`) now leads with the day instead
of Korean learning. Every card reads an existing query cache; no new API,
table, route, or storage key.

- **Header:** date, greeting, **Quick capture** (`openQuickCapture()`), and
  **Ask Hengo** (`askHengoItem.href`).
- **Priorities column (lg: 2/3):** `TodayTasksCard` (existing, previously
  unused on `/home`) and the new `ActiveGoalsCard`.
- **Today column:** new `UpcomingEventsCard`, new `ContinueCard`, and the
  existing `TodayHabitCheckins`.
- **Daily learning · Hengo:** `TodayMissionCard`, streak, and the three
  learning shortcuts — kept full width below the grid rather than in the side
  column, because the mission card is too wide for a one-third column.
- **My Apps** in a new `compact` mode (no intro paragraph or stack chips; the
  public landing page `/` still renders the full version). `AboutHSpace` was
  removed from `/home` at the maintainer's request — it remains on `/`.

New files:

- `apps/web/lib/home-dashboard.ts` + `.test.ts` (10 tests): `selectActiveGoals`
  (excludes completed/archived; starred → nearest target date → newest),
  `goalTaskProgress`, `upcomingEventsWindow` (local today + tomorrow),
  `selectUpcomingEvents`, `resolveRecentDestinations`.
- `components/home/ActiveGoalsCard.tsx` — shares `goalsQueryKey` with `/goals`.
  Progress shown is task completion (`taskCounts`), because `outcome_progress`
  isn't rendered anywhere else and its scale isn't established.
- `components/home/UpcomingEventsCard.tsx` — only queries Google Calendar when
  connected; otherwise shows a "Connect Google Calendar" link. Errors degrade
  to a message, never a broken card.
- `components/home/ContinueCard.tsx` — Quick Switcher recents
  (`readRecentNavIds`) via `useSyncExternalStore`; hidden with no history.

Modified: `components/home/MyAppsSection.tsx` (`compact` prop),
`app/(main)/home/page.tsx`, `apps/web/CLAUDE.md` (removed contradictory
`/home` descriptions).

### Phase 2 — what changed

- `lib/navigation.ts` registry relabelled and regrouped as **Today · Learning ·
  Goals & Tasks · Growth · Notes & Knowledge · My Apps · AI Assistant**.
  Section ids kept (stored in localStorage by last-visited tracking) except
  `history` → `apps`; `WorkspaceId` in `lib/last-visited.ts` updated to match.
  - `/history` (Korean correction history) → Learning.
  - `/timeline` → Notes & Knowledge (section href now `/notes`).
  - Ask Hengo (`/chat?mode=memory`) → AI Assistant.
  - New `appsItem` → `/apps`.
- New route `app/(main)/apps/page.tsx` renders the full `MyAppsSection`.
- `SIDEBAR_SECTION_ORDER` follows the seven workspaces; the desktop sidebar
  needed no component change.
- Mobile bottom bar and tablet rail: **Today · Goals · Learning · Notes ·
  Spaces**. Progress lost its tab and is in Spaces → Growth. Notes now lights
  across its whole section. `isSpacesRoute()` lights Spaces where no tab owns
  the route.
- `MoreNavigationSheet.tsx` was renamed (`git mv`) and rewritten as
  `SpacesSheet.tsx`, rendering `sidebarSections` plus Settings. Each nav owns its
  sheet (bottom on mobile, left on the rail). `ActiveIndicator` in `NavItem.tsx`
  is now exported for the rail's Spaces button.
- Tests: `lib/navigation.test.ts` and
  `components/layout/navigation-shell.test.tsx` updated to the new structure;
  `/apps` added to the "every previously shipped route stays reachable" guard.
- Docs: `apps/web/CLAUDE.md`, `apps/web/README.md`,
  `apps/web/docs/navigation-shell-audit.md` (dated "current" note at the top).
  `docs/HENGO_V2.md` and older audits left as historical records.
- Known minor doc drift, pre-existing: `apps/web/CLAUDE.md`'s Growth section
  still has two overlapping descriptions.

## Verification (2026-10-22)

Phase 2 (latest run):

- `pnpm lint` — 0 errors, the same 5 pre-existing warnings.
- `pnpm --dir apps/web format:check` — passed.
- `NODE_OPTIONS=--no-experimental-webstorage pnpm test` — 95 files, 1152 tests passed.
- `pnpm build` — passed, 126 routes (adds `/apps`).
- **Not run:** browser check of the Spaces sheet and tabs at 375/768/1024/1440px.

Phase 1:

- `npx vitest run lib/home-dashboard.test.ts` — 10/10 passed.
- `pnpm lint` — 0 errors, the same 5 pre-existing warnings.
- `pnpm --dir apps/web format:check` — passed.
- `NODE_OPTIONS=--no-experimental-webstorage pnpm test` — 95 files, 1149 tests passed.
- `pnpm build` — passed, 125 routes.
- **Not run:** authenticated visual check of `/home` at 375/768/1024/1440px
  (needs a dev server and a login). Playwright e2e not run.
- `lib/goals.test.ts` (previously reported failing on 2026-10-22) passed in
  this session — it is intermittent and likely date/time-of-day dependent.
  Not yet investigated.

## Next steps

- Visually review logged-in `/home` and the new navigation (Spaces sheet on
  mobile and tablet), then commit Phases 1–2 when requested.
- Optional follow-up: collapsible desktop sidebar groups (~34 rows today).
- Phase 3 audit + plan (My Apps catalog content at `/apps` + `lib/projects.ts`).
- Existing infra follow-ups: fix Vercel Preview Supabase variables; delete or
  repoint the retired Railway API service. Playwright on Windows: the
  web-server command treats `--port` as a directory and bundled Chromium is
  absent (use `PLAYWRIGHT_EXECUTABLE_PATH` with installed Chrome).

## Notes for future sessions

- Keep Hengo Learning feature names such as Hengo Coach and Ask Hengo where
  they identify the learning/assistant experience.
- Do not rename `kori_*`, `koriai-*`, or `hengo-*` persistence identifiers as a
  branding cleanup; they are load-bearing compatibility keys.
- Project card facts live in `apps/web/lib/projects.ts`; verify a repository or
  deployment before adding technical claims or a live link.
- One application remains: `apps/web`, deployed from that Vercel root.
