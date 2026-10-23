# HANDOFF

Read this file first in any new session, before exploring the repo. It is a
live snapshot, not a log—overwrite it as state changes. Older context lives in
`HANDOFF_HISTORY.md`; only open that file if you need history older than what is
summarized below.

## Snapshot

- **Updated:** 2026-10-23
- **Branch:** `main`. Workspace navigation and H-Vault changes are committed.
- **Working tree:** Auth page layout changes from a concurrent session remain uncommitted.

## Current focus — workspace redesign

H-Space is presented as a personal workspace: six workspaces plus tools,
each workspace owning its own pages as local tabs.

- **Navigation layers** (`lib/navigation.ts`, registry unchanged):
  `workspaceNavItems` (Overview, My Apps, Planner, Learning, Notes, Growth) + `toolNavItems` (AI Assistant · Settings) for the sidebar and
  tablet rail; `workspaceTabs` + `getActiveTab` for local tabs;
  `mobileNavItems` (Home · Plan · Learn · Apps) + `moreNavItems` +
  `browseSections` for the bottom bar and More sheet. Removed:
  `sidebarSections`, `primaryNavItems`, `isSpacesRoute`, and the V1 exports
  (`bottomTabs`, `moreGroups`, `secondaryNavItems`, …). Section labels:
  Today→Overview, Goals & Tasks→Planner, Notes & Knowledge→Notes.
- **Shell:** new `MoreSheet`, `WorkspaceTabs`, `header-trail.ts`; deleted
  `SpacesSheet` and the unmounted `WorkspaceFlyout`. Header =
  `Workspace / Page` with the only `h1`; neutral icons; "AI Assistant" is
  the visible assistant name (Hengo Coach stays internal). The Vault dashboard no longer repeats its page title below the shared header.
- **Pages:** `/home` reordered (focus/upcoming → progress/continue → quick
  access; `LearningWidget`, `QuickAccess` new); `/growth` landing page
  (new route); `/apps` catalog with search, categories, favorites
  (`components/apps/AppsCatalog`, `lib/apps-catalog.ts`, localStorage key
  `hengo-app-favorites`); `/learn` subjects row (Korean, Software
  Engineering → Notes, AI Engineering "Not set up"); Planner/Notes/Growth/
  My Apps pages use `WorkspaceTabs` instead of title heroes.
- **Goal health fix:** a goal with no key results and every task done showed
  "Needs attention" beside a 100% bar — the engine flagged "no key results"
  as attention regardless of progress. Now `on_track` with a "mark complete
  once the outcome is reached" reason (`attention` if the deadline passed);
  never auto-`completed`. `computeListGoalHealth` is shared by the Goals
  list and Home's Active goals card (which previously showed the stored
  `health_status` column, refreshed only by the detail page).
- **Tokens:** slate neutrals + indigo `--primary` (#4F46E5 / dark #818CF8),
  flat body background, solid default `Button`.

## Auth layout update (2026-10-23)

- Login and registration now use centered responsive cards on desktop and mobile; auth flows and fields were preserved. No tests or build were run for this visual change.

## Verification (2026-10-23)

- `pnpm exec tsc --noEmit`: clean.
- `NODE_OPTIONS=--no-experimental-webstorage pnpm test`: 104 files, 1343 tests passed.
- Prettier and ESLint checks on changed H-Vault files: clean.
- Not run this turn: production build, e2e specs, checks with real user data.
## Next steps

- Review H-Vault with populated data; live persistence still requires approval and application of the Supabase migration.
- Pages still using `PageHero` title blocks outside the workspaces touched here (e.g. Settings, Statistics, Achievements, Review) may repeat the header title; migrate them to the same tabs/description pattern.
- Home cards still use their older card styling (shadows, nested boxes); a pass to the flat `app-surface` style would finish the visual system.
- Carried over: Phase 3/4 of the H-Space upgrade; Vercel Preview Supabase variables; `lib/goals.test.ts` is date-dependent.
## Notes for future sessions

- H-Vault passwords are stored **only** as browser-encrypted
  `password_ciphertext` envelopes. Never add a plaintext password path, never
  send or store the master password/key, and still no PIN, token,
  recovery-code or free-text notes field.
- The H-Vault reset clears encrypted account passwords only after explicit
  confirmation; account metadata remains. Document this consequence clearly.
- Keep Hengo Learning feature names such as Hengo Coach and Ask Hengo where
  they identify the learning/assistant experience.
- Do not rename `kori_*`, `koriai-*`, or `hengo-*` persistence identifiers as a
  branding cleanup; they are load-bearing compatibility keys.
- Project card facts live in `apps/web/lib/projects.ts`; verify a repository or
  deployment before adding technical claims or a live link.
- One application remains: `apps/web`, deployed from that Vercel root.
- Playwright on Windows: reuse a running dev server via `PLAYWRIGHT_BASE_URL`
  and installed Chrome via `PLAYWRIGHT_EXECUTABLE_PATH`.
