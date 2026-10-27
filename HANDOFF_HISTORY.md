## 2026-10-23 (f) - Luyra ecosystem integration

# HANDOFF

## Snapshot

- **Updated:** 2026-10-23
- **Branch:** `main`.
- **Working tree:** H-Space brand surfaces now use the uploaded `apps/web/public/H Space Icon.png`; Hengo Coach avatars remain on their existing art. `/account` redirects to `/settings`, whose duplicate body heading was removed.
- **Verification:** `git diff --check` passes. No tests or build run.

## Current focus

H-Space is presented as a personal workspace: six workspaces plus tools, each workspace owning its own pages as local tabs. See `HANDOFF_HISTORY.md` for prior snapshots.

## 2026-10-23 (e) - Account and logo refresh

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


### Changes in this session

- The legacy /account route redirects to /settings; the duplicate Settings body heading was removed because the shared shell already provides the page title.
- H-Space brand surfaces and browser/PWA icons use the uploaded apps/web/public/H Space Icon.png. Hengo Coach artwork remains unchanged. The stale app/favicon.ico was removed.

---

## 2026-10-23 (d) - Auth screen centering snapshot

# HANDOFF

Read this file first in any new session, before exploring the repo. It is a
live snapshot, not a log—overwrite it as state changes. Older context lives in
`HANDOFF_HISTORY.md`; only open that file if you need history older than what is
summarized below.

## Snapshot

- **Updated:** 2026-10-23
- **Branch:** `main` at `371fc50`. Nothing committed or pushed.
- **Working tree:** uncommitted, three independent sets of changes:
  1. **H-Vault** (earlier session) — see the 2026-10-23 (a) history entry.
     **Update (2026-10-23, maintainer's decision):** H-Vault now stores an
     optional password, end-to-end encrypted in the browser. New
     `lib/vault-crypto.ts` (PBKDF2-SHA256 600k → AES-256-GCM, `v1.` envelope)
     and `lib/vault-session.ts` (in-memory key, 10-minute auto-lock);
     `password_ciphertext` column in the (still unapplied) migration, with a
     check that only accepts envelopes; master-password unlock dialog;
     copy (clipboard clears after 30s) and reveal (hides after 30s); Bitwarden
     UI removed. The unlock dialog now has a confirmed reset that clears all
     encrypted passwords while preserving account metadata, then allows a new
     master password. **CSV import** (Notion export) added: `lib/vault-import.ts`
     + `components/vault/VaultImportDialog.tsx` — parsed and encrypted in the
     browser, row-by-row review, duplicates unselected, Notes never imported,
     rows tagged `#imported`. **Platform logos** on cards: `lib/vault-brands.ts`
     (new dependency `simple-icons` 16.35, curated imports only; brand-color
     letter fallback). Details: `apps/web/docs/h-vault.md`.
  2. **Money Flow removal** (a concurrent session).
  3. **UI/UX redesign + navigation refactor** (this session), below. It
     touches `lib/navigation.ts` and the H-Vault page/test (tabs + `h2`), so
     commit it after, or together with, H-Vault.

## Current focus — workspace redesign

H-Space is presented as a personal workspace: six workspaces plus tools,
each workspace owning its own pages as local tabs.

- **Navigation layers** (`lib/navigation.ts`, registry unchanged):
  `workspaceNavItems (Overview, My Apps, Planner, Learning, Notes, Growth) + `toolNavItems` (AI Assistant · Settings) for the sidebar and
  tablet rail; `workspaceTabs` + `getActiveTab` for local tabs;
  `mobileNavItems` (Home · Plan · Learn · Apps) + `moreNavItems` +
  `browseSections` for the bottom bar and More sheet. Removed:
  `sidebarSections`, `primaryNavItems`, `isSpacesRoute`, and the V1 exports
  (`bottomTabs`, `moreGroups`, `secondaryNavItems`, …). Section labels:
  Today→Overview, Goals & Tasks→Planner, Notes & Knowledge→Notes.
- **Shell:** new `MoreSheet`, `WorkspaceTabs`, `header-trail.ts`; deleted
  `SpacesSheet` and the unmounted `WorkspaceFlyout`. Header =
  `Workspace / Page` with the only `h1`; neutral icons; "AI Assistant" is
  the visible assistant name (Hengo Coach stays internal).
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

## Verification (2026-10-23)

- `npx tsc --noEmit`: clean. `pnpm lint`: 0 errors, same 5 pre-existing
  warnings. `prettier --check` on changed files: clean.
- `NODE_OPTIONS=--no-experimental-webstorage pnpm test`: 100 files, 1236
  tests passed (count fell from 1250: WorkspaceFlyout/V1 suites replaced).
- `pnpm build`: passed, 128 routes (adds `/growth`).
- Scratch Playwright check against the dev server on :3000 (fictional session,
  Supabase stubbed to empty): 11 pages × 375/430/768/1024/1440 × light/dark —
  no horizontal overflow, exactly one `h1`, one active global entry + the
  right local tab everywhere; screenshots reviewed for a sample incl. the More
  sheet and collapsed sidebar.
- **Not run:** e2e specs in `tests/e2e`; any check with real user data.
- H-Vault forgotten-master-password reset UI change has not been tested yet.

## Next steps

- Review in a real session (populated data), then commit H-Vault and the
  redesign as separate commits when asked.
- Pages still using `PageHero` title blocks outside the workspaces touched
  here (e.g. Settings, Statistics, Achievements, Review) may repeat the
  header title; migrate them to the same tabs/description pattern.
- Home cards still use their older card styling (shadows, nested boxes);
  a pass to the flat `app-surface` style would finish the visual system.
- Carried over: H-Vault migration approval; Phase 3/4 of the H-Space upgrade;
  Vercel Preview Supabase variables; `lib/goals.test.ts` is date-dependent.

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


---

## 2026-10-23 (f) - Pre-validation snapshot before commit and push

# HANDOFF

Read this file first in any new session, before exploring the repo. It is a
live snapshot, not a log—overwrite it as state changes. Older context lives in
`HANDOFF_HISTORY.md`; only open that file if you need history older than what is
summarized below.

## Snapshot

- **Updated:** 2026-10-23
- **Branch:** `main` at `371fc50`. Nothing committed or pushed.
- **Working tree:** uncommitted, three independent sets of changes:
  1. **H-Vault** (earlier session) — see the 2026-10-23 (a) history entry.
     **Update (2026-10-23, maintainer's decision):** H-Vault now stores an
     optional password, end-to-end encrypted in the browser. New
     `lib/vault-crypto.ts` (PBKDF2-SHA256 600k → AES-256-GCM, `v1.` envelope)
     and `lib/vault-session.ts` (in-memory key, 10-minute auto-lock);
     `password_ciphertext` column in the (still unapplied) migration, with a
     check that only accepts envelopes; master-password unlock dialog;
     copy (clipboard clears after 30s) and reveal (hides after 30s); Bitwarden
     UI removed. The unlock dialog now has a confirmed reset that clears all
     encrypted passwords while preserving account metadata, then allows a new
     master password. **CSV import** (Notion export) added: `lib/vault-import.ts`
     + `components/vault/VaultImportDialog.tsx` — parsed and encrypted in the
     browser, row-by-row review, duplicates unselected, Notes never imported,
     rows tagged `#imported`. **Platform logos** on cards: `lib/vault-brands.ts`
     (new dependency `simple-icons` 16.35, curated imports only; brand-color
     letter fallback). Details: `apps/web/docs/h-vault.md`.
  2. **Money Flow removal** (a concurrent session).
  3. **UI/UX redesign + navigation refactor** (this session), below. It
     touches `lib/navigation.ts` and the H-Vault page/test (tabs + `h2`), so
     commit it after, or together with, H-Vault.

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

- 
px tsc --noEmit`: clean. `pnpm lint`: 0 errors, same 5 pre-existing
  warnings. `prettier --check` on changed files: clean.
- `NODE_OPTIONS=--no-experimental-webstorage pnpm test`: 100 files, 1236
  tests passed (count fell from 1250: WorkspaceFlyout/V1 suites replaced).
- `pnpm build`: passed, 128 routes (adds `/growth`).
- Scratch Playwright check against the dev server on :3000 (fictional session,
  Supabase stubbed to empty): 11 pages × 375/430/768/1024/1440 × light/dark —
  no horizontal overflow, exactly one `h1`, one active global entry + the
  right local tab everywhere; screenshots reviewed for a sample incl. the More
  sheet and collapsed sidebar.
- **Not run:** e2e specs in `tests/e2e`; any check with real user data.
- H-Vault forgotten-master-password reset UI change has not been tested yet.

## Next steps

- Review in a real session (populated data), then commit H-Vault and the
  redesign as separate commits when asked.
- Pages still using `PageHero` title blocks outside the workspaces touched
  here (e.g. Settings, Statistics, Achievements, Review) may repeat the
  header title; migrate them to the same tabs/description pattern.
- Home cards still use their older card styling (shadows, nested boxes);
  a pass to the flat `app-surface` style would finish the visual system.
- Carried over: H-Vault migration approval; Phase 3/4 of the H-Space upgrade;
  Vercel Preview Supabase variables; `lib/goals.test.ts` is date-dependent.

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


## 2026-10-23 (e) - Auth and sidebar snapshot before H-Vault title cleanup

# HANDOFF

Read this file first in any new session, before exploring the repo. It is a
live snapshot, not a log—overwrite it as state changes. Older context lives in
`HANDOFF_HISTORY.md`; only open that file if you need history older than what is
summarized below.

## Snapshot

- **Updated:** 2026-10-23
- **Branch:** `main` at `371fc50`. Nothing committed or pushed.
- **Working tree:** uncommitted, three independent sets of changes:
  1. **H-Vault** (earlier session) — see the 2026-10-23 (a) history entry.
     **Update (2026-10-23, maintainer's decision):** H-Vault now stores an
     optional password, end-to-end encrypted in the browser. New
     `lib/vault-crypto.ts` (PBKDF2-SHA256 600k → AES-256-GCM, `v1.` envelope)
     and `lib/vault-session.ts` (in-memory key, 10-minute auto-lock);
     `password_ciphertext` column in the (still unapplied) migration, with a
     check that only accepts envelopes; master-password unlock dialog;
     copy (clipboard clears after 30s) and reveal (hides after 30s); Bitwarden
     UI removed. The unlock dialog now has a confirmed reset that clears all
     encrypted passwords while preserving account metadata, then allows a new
     master password. **CSV import** (Notion export) added: `lib/vault-import.ts`
     + `components/vault/VaultImportDialog.tsx` — parsed and encrypted in the
     browser, row-by-row review, duplicates unselected, Notes never imported,
     rows tagged `#imported`. **Platform logos** on cards: `lib/vault-brands.ts`
     (new dependency `simple-icons` 16.35, curated imports only; brand-color
     letter fallback). Details: `apps/web/docs/h-vault.md`.
  2. **Money Flow removal** (a concurrent session).
  3. **UI/UX redesign + navigation refactor** (this session), below. It
     touches `lib/navigation.ts` and the H-Vault page/test (tabs + `h2`), so
     commit it after, or together with, H-Vault.

## Current focus — workspace redesign

H-Space is presented as a personal workspace: six workspaces plus tools,
each workspace owning its own pages as local tabs.

- **Navigation layers** (`lib/navigation.ts`, registry unchanged):
  `workspaceNavItems (Overview, My Apps, Planner, Learning, Notes, Growth) + `toolNavItems` (AI Assistant · Settings) for the sidebar and
  tablet rail; `workspaceTabs` + `getActiveTab` for local tabs;
  `mobileNavItems` (Home · Plan · Learn · Apps) + `moreNavItems` +
  `browseSections` for the bottom bar and More sheet. Removed:
  `sidebarSections`, `primaryNavItems`, `isSpacesRoute`, and the V1 exports
  (`bottomTabs`, `moreGroups`, `secondaryNavItems`, …). Section labels:
  Today→Overview, Goals & Tasks→Planner, Notes & Knowledge→Notes.
- **Shell:** new `MoreSheet`, `WorkspaceTabs`, `header-trail.ts`; deleted
  `SpacesSheet` and the unmounted `WorkspaceFlyout`. Header =
  `Workspace / Page` with the only `h1`; neutral icons; "AI Assistant" is
  the visible assistant name (Hengo Coach stays internal).
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

- 
px tsc --noEmit`: clean. `pnpm lint`: 0 errors, same 5 pre-existing
  warnings. `prettier --check` on changed files: clean.
- `NODE_OPTIONS=--no-experimental-webstorage pnpm test`: 100 files, 1236
  tests passed (count fell from 1250: WorkspaceFlyout/V1 suites replaced).
- `pnpm build`: passed, 128 routes (adds `/growth`).
- Scratch Playwright check against the dev server on :3000 (fictional session,
  Supabase stubbed to empty): 11 pages × 375/430/768/1024/1440 × light/dark —
  no horizontal overflow, exactly one `h1`, one active global entry + the
  right local tab everywhere; screenshots reviewed for a sample incl. the More
  sheet and collapsed sidebar.
- **Not run:** e2e specs in `tests/e2e`; any check with real user data.
- H-Vault forgotten-master-password reset UI change has not been tested yet.

## Next steps

- Review in a real session (populated data), then commit H-Vault and the
  redesign as separate commits when asked.
- Pages still using `PageHero` title blocks outside the workspaces touched
  here (e.g. Settings, Statistics, Achievements, Review) may repeat the
  header title; migrate them to the same tabs/description pattern.
- Home cards still use their older card styling (shadows, nested boxes);
  a pass to the flat `app-surface` style would finish the visual system.
- Carried over: H-Vault migration approval; Phase 3/4 of the H-Space upgrade;
  Vercel Preview Supabase variables; `lib/goals.test.ts` is date-dependent.

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


## 2026-10-23 (d) - Sidebar order snapshot before duplicate title cleanup

# HANDOFF

Read this file first in any new session, before exploring the repo. It is a
live snapshot, not a log—overwrite it as state changes. Older context lives in
`HANDOFF_HISTORY.md`; only open that file if you need history older than what is
summarized below.

## Snapshot

- **Updated:** 2026-10-23
- **Branch:** `main` at `371fc50`. Nothing committed or pushed.
- **Working tree:** uncommitted, three independent sets of changes:
  1. **H-Vault** (earlier session) — see the 2026-10-23 (a) history entry.
     **Update (2026-10-23, maintainer's decision):** H-Vault now stores an
     optional password, end-to-end encrypted in the browser. New
     `lib/vault-crypto.ts` (PBKDF2-SHA256 600k → AES-256-GCM, `v1.` envelope)
     and `lib/vault-session.ts` (in-memory key, 10-minute auto-lock);
     `password_ciphertext` column in the (still unapplied) migration, with a
     check that only accepts envelopes; master-password unlock dialog;
     copy (clipboard clears after 30s) and reveal (hides after 30s); Bitwarden
     UI removed. The unlock dialog now has a confirmed reset that clears all
     encrypted passwords while preserving account metadata, then allows a new
     master password. **CSV import** (Notion export) added: `lib/vault-import.ts`
     + `components/vault/VaultImportDialog.tsx` — parsed and encrypted in the
     browser, row-by-row review, duplicates unselected, Notes never imported,
     rows tagged `#imported`. **Platform logos** on cards: `lib/vault-brands.ts`
     (new dependency `simple-icons` 16.35, curated imports only; brand-color
     letter fallback). Details: `apps/web/docs/h-vault.md`.
  2. **Money Flow removal** (a concurrent session).
  3. **UI/UX redesign + navigation refactor** (this session), below. It
     touches `lib/navigation.ts` and the H-Vault page/test (tabs + `h2`), so
     commit it after, or together with, H-Vault.

## Current focus — workspace redesign

H-Space is presented as a personal workspace: six workspaces plus tools,
each workspace owning its own pages as local tabs.

- **Navigation layers** (`lib/navigation.ts`, registry unchanged):
  `workspaceNavItems (Overview, My Apps, Planner, Learning, Notes, Growth) + `toolNavItems` (AI Assistant · Settings) for the sidebar and
  tablet rail; `workspaceTabs` + `getActiveTab` for local tabs;
  `mobileNavItems` (Home · Plan · Learn · Apps) + `moreNavItems` +
  `browseSections` for the bottom bar and More sheet. Removed:
  `sidebarSections`, `primaryNavItems`, `isSpacesRoute`, and the V1 exports
  (`bottomTabs`, `moreGroups`, `secondaryNavItems`, …). Section labels:
  Today→Overview, Goals & Tasks→Planner, Notes & Knowledge→Notes.
- **Shell:** new `MoreSheet`, `WorkspaceTabs`, `header-trail.ts`; deleted
  `SpacesSheet` and the unmounted `WorkspaceFlyout`. Header =
  `Workspace / Page` with the only `h1`; neutral icons; "AI Assistant" is
  the visible assistant name (Hengo Coach stays internal).
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

- 
px tsc --noEmit`: clean. `pnpm lint`: 0 errors, same 5 pre-existing
  warnings. `prettier --check` on changed files: clean.
- `NODE_OPTIONS=--no-experimental-webstorage pnpm test`: 100 files, 1236
  tests passed (count fell from 1250: WorkspaceFlyout/V1 suites replaced).
- `pnpm build`: passed, 128 routes (adds `/growth`).
- Scratch Playwright check against the dev server on :3000 (fictional session,
  Supabase stubbed to empty): 11 pages × 375/430/768/1024/1440 × light/dark —
  no horizontal overflow, exactly one `h1`, one active global entry + the
  right local tab everywhere; screenshots reviewed for a sample incl. the More
  sheet and collapsed sidebar.
- **Not run:** e2e specs in `tests/e2e`; any check with real user data.
- H-Vault forgotten-master-password reset UI change has not been tested yet.

## Next steps

- Review in a real session (populated data), then commit H-Vault and the
  redesign as separate commits when asked.
- Pages still using `PageHero` title blocks outside the workspaces touched
  here (e.g. Settings, Statistics, Achievements, Review) may repeat the
  header title; migrate them to the same tabs/description pattern.
- Home cards still use their older card styling (shadows, nested boxes);
  a pass to the flat `app-surface` style would finish the visual system.
- Carried over: H-Vault migration approval; Phase 3/4 of the H-Space upgrade;
  Vercel Preview Supabase variables; `lib/goals.test.ts` is date-dependent.

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


# HANDOFF HISTORY

Append-only log, newest entry first. Read only the latest five entries
unless a task genuinely needs older context — this file exists so old
handoffs aren't lost, not so every session has to read all of them.

Each time `HANDOFF.md` is overwritten with new "Current focus" content, move
its old content here as a dated entry before overwriting.

---

## 2026-10-23 (c) - H-Vault reset snapshot before sidebar reorder

# HANDOFF

Read this file first in any new session, before exploring the repo. It is a
live snapshot, not a log—overwrite it as state changes. Older context lives in
`HANDOFF_HISTORY.md`; only open that file if you need history older than what is
summarized below.

## Snapshot

- **Updated:** 2026-10-23
- **Branch:** `main` at `371fc50`. Nothing committed or pushed.
- **Working tree:** uncommitted, three independent sets of changes:
  1. **H-Vault** (earlier session) — see the 2026-10-23 (a) history entry.
     **Update (2026-10-23, maintainer's decision):** H-Vault now stores an
     optional password, end-to-end encrypted in the browser. New
     `lib/vault-crypto.ts` (PBKDF2-SHA256 600k → AES-256-GCM, `v1.` envelope)
     and `lib/vault-session.ts` (in-memory key, 10-minute auto-lock);
     `password_ciphertext` column in the (still unapplied) migration, with a
     check that only accepts envelopes; master-password unlock dialog;
     copy (clipboard clears after 30s) and reveal (hides after 30s); Bitwarden
     UI removed. The unlock dialog now has a confirmed reset that clears all
     encrypted passwords while preserving account metadata, then allows a new
     master password. **CSV import** (Notion export) added: `lib/vault-import.ts`
     + `components/vault/VaultImportDialog.tsx` — parsed and encrypted in the
     browser, row-by-row review, duplicates unselected, Notes never imported,
     rows tagged `#imported`. **Platform logos** on cards: `lib/vault-brands.ts`
     (new dependency `simple-icons` 16.35, curated imports only; brand-color
     letter fallback). Details: `apps/web/docs/h-vault.md`.
  2. **Money Flow removal** (a concurrent session).
  3. **UI/UX redesign + navigation refactor** (this session), below. It
     touches `lib/navigation.ts` and the H-Vault page/test (tabs + `h2`), so
     commit it after, or together with, H-Vault.

## Current focus — workspace redesign

H-Space is presented as a personal workspace: six workspaces plus tools,
each workspace owning its own pages as local tabs.

- **Navigation layers** (`lib/navigation.ts`, registry unchanged):
  `workspaceNavItems` (Overview · Planner · Learning · Notes · My Apps ·
  Growth) + `toolNavItems` (AI Assistant · Settings) for the sidebar and
  tablet rail; `workspaceTabs` + `getActiveTab` for local tabs;
  `mobileNavItems` (Home · Plan · Learn · Apps) + `moreNavItems` +
  `browseSections` for the bottom bar and More sheet. Removed:
  `sidebarSections`, `primaryNavItems`, `isSpacesRoute`, and the V1 exports
  (`bottomTabs`, `moreGroups`, `secondaryNavItems`, …). Section labels:
  Today→Overview, Goals & Tasks→Planner, Notes & Knowledge→Notes.
- **Shell:** new `MoreSheet`, `WorkspaceTabs`, `header-trail.ts`; deleted
  `SpacesSheet` and the unmounted `WorkspaceFlyout`. Header =
  `Workspace / Page` with the only `h1`; neutral icons; "AI Assistant" is
  the visible assistant name (Hengo Coach stays internal).
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

## Verification (2026-10-23)

- `npx tsc --noEmit`: clean. `pnpm lint`: 0 errors, same 5 pre-existing
  warnings. `prettier --check` on changed files: clean.
- `NODE_OPTIONS=--no-experimental-webstorage pnpm test`: 100 files, 1236
  tests passed (count fell from 1250: WorkspaceFlyout/V1 suites replaced).
- `pnpm build`: passed, 128 routes (adds `/growth`).
- Scratch Playwright check against the dev server on :3000 (fictional session,
  Supabase stubbed to empty): 11 pages × 375/430/768/1024/1440 × light/dark —
  no horizontal overflow, exactly one `h1`, one active global entry + the
  right local tab everywhere; screenshots reviewed for a sample incl. the More
  sheet and collapsed sidebar.
- **Not run:** e2e specs in `tests/e2e`; any check with real user data.
- H-Vault forgotten-master-password reset UI change has not been tested yet.

## Next steps

- Review in a real session (populated data), then commit H-Vault and the
  redesign as separate commits when asked.
- Pages still using `PageHero` title blocks outside the workspaces touched
  here (e.g. Settings, Statistics, Achievements, Review) may repeat the
  header title; migrate them to the same tabs/description pattern.
- Home cards still use their older card styling (shadows, nested boxes);
  a pass to the flat `app-surface` style would finish the visual system.
- Carried over: H-Vault migration approval; Phase 3/4 of the H-Space upgrade;
  Vercel Preview Supabase variables; `lib/goals.test.ts` is date-dependent.

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


## 2026-10-23 (b) - Workspace redesign snapshot before H-Vault reset

# HANDOFF

Read this file first in any new session, before exploring the repo. It is a
live snapshot, not a log—overwrite it as state changes. Older context lives in
`HANDOFF_HISTORY.md`; only open that file if you need history older than what is
summarized below.

## Snapshot

- **Updated:** 2026-10-23
- **Branch:** `main` at `371fc50`. Nothing committed or pushed.
- **Working tree:** uncommitted, three independent sets of changes:
  1. **H-Vault** (earlier session) — see the 2026-10-23 (a) history entry.
     **Update (2026-10-23, maintainer's decision):** H-Vault now stores an
     optional password, end-to-end encrypted in the browser. New
     `lib/vault-crypto.ts` (PBKDF2-SHA256 600k → AES-256-GCM, `v1.` envelope)
     and `lib/vault-session.ts` (in-memory key, 10-minute auto-lock);
     `password_ciphertext` column in the (still unapplied) migration, with a
     check that only accepts envelopes; master-password unlock dialog;
     copy (clipboard clears after 30s) and reveal (hides after 30s); Bitwarden
     UI removed. **CSV import** (Notion export) added: `lib/vault-import.ts`
     + `components/vault/VaultImportDialog.tsx` — parsed and encrypted in the
     browser, row-by-row review, duplicates unselected, Notes never imported,
     rows tagged `#imported`. **Platform logos** on cards: `lib/vault-brands.ts`
     (new dependency `simple-icons` 16.35, curated imports only; brand-color
     letter fallback). Details: `apps/web/docs/h-vault.md`.
  2. **Money Flow removal** (a concurrent session).
  3. **UI/UX redesign + navigation refactor** (this session), below. It
     touches `lib/navigation.ts` and the H-Vault page/test (tabs + `h2`), so
     commit it after, or together with, H-Vault.

## Current focus — workspace redesign

H-Space is presented as a personal workspace: six workspaces plus tools,
each workspace owning its own pages as local tabs.

- **Navigation layers** (`lib/navigation.ts`, registry unchanged):
  `workspaceNavItems` (Overview · Planner · Learning · Notes · My Apps ·
  Growth) + `toolNavItems` (AI Assistant · Settings) for the sidebar and
  tablet rail; `workspaceTabs` + `getActiveTab` for local tabs;
  `mobileNavItems` (Home · Plan · Learn · Apps) + `moreNavItems` +
  `browseSections` for the bottom bar and More sheet. Removed:
  `sidebarSections`, `primaryNavItems`, `isSpacesRoute`, and the V1 exports
  (`bottomTabs`, `moreGroups`, `secondaryNavItems`, …). Section labels:
  Today→Overview, Goals & Tasks→Planner, Notes & Knowledge→Notes.
- **Shell:** new `MoreSheet`, `WorkspaceTabs`, `header-trail.ts`; deleted
  `SpacesSheet` and the unmounted `WorkspaceFlyout`. Header =
  `Workspace / Page` with the only `h1`; neutral icons; "AI Assistant" is
  the visible assistant name (Hengo Coach stays internal).
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

## Verification (2026-10-23)

- `npx tsc --noEmit`: clean. `pnpm lint`: 0 errors, same 5 pre-existing
  warnings. `prettier --check` on changed files: clean.
- `NODE_OPTIONS=--no-experimental-webstorage pnpm test`: 100 files, 1236
  tests passed (count fell from 1250: WorkspaceFlyout/V1 suites replaced).
- `pnpm build`: passed, 128 routes (adds `/growth`).
- Scratch Playwright check against the dev server on :3000 (fictional session,
  Supabase stubbed to empty): 11 pages × 375/430/768/1024/1440 × light/dark —
  no horizontal overflow, exactly one `h1`, one active global entry + the
  right local tab everywhere; screenshots reviewed for a sample incl. the More
  sheet and collapsed sidebar.
- **Not run:** e2e specs in `tests/e2e`; any check with real user data.

## Next steps

- Review in a real session (populated data), then commit H-Vault and the
  redesign as separate commits when asked.
- Pages still using `PageHero` title blocks outside the workspaces touched
  here (e.g. Settings, Statistics, Achievements, Review) may repeat the
  header title; migrate them to the same tabs/description pattern.
- Home cards still use their older card styling (shadows, nested boxes);
  a pass to the flat `app-surface` style would finish the visual system.
- Carried over: H-Vault migration approval; Phase 3/4 of the H-Space upgrade;
  Vercel Preview Supabase variables; `lib/goals.test.ts` is date-dependent.

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


## 2026-10-23 (a) — H-Vault

### Snapshot

- **Updated:** 2026-10-23
- **Branch:** `main` at `371fc50` (PR #28, hub navigation Phases 1–2, merged).
- **Working tree:** uncommitted. Two independent sets of changes:
  1. **H-Vault** (this session) — new files plus small edits, listed below.
  2. **Money Flow removal** (a concurrent session, not this one) — deletes
     `MoneyFlowIntegrationCard.tsx`, `lib/money-flow.ts`,
     `docs/money-flow-integration.md`, the `money-flow` project card and its
     flag, and edits the root `README.md`/`apps/web/README.md`/`CLAUDE.md`.
     H-Vault's edits to `feature-flags.ts`, `projects.ts`,
     `MyAppsSection.tsx` and `navigation.ts` sit beside those changes.
- Nothing committed or pushed.

### Current focus — H-Vault (`/vault`)

A private account directory inside My Apps: which email/username belongs to
which service. **Metadata only — not a password manager.** Bitwarden holds
every secret. Full record: `apps/web/docs/h-vault.md`.

- **Data:** `kori_vault_accounts`. Migration
  `apps/web/supabase/migrations/20261023000000_vault_accounts.sql` is
  **written, not applied** (it needs maintainer approval because the database
  is shared with Orbit). It has owner-scoped RLS per operation and a
  column-level UPDATE grant, so `user_id` can't change. RLS checks live in
  `apps/web/supabase/tests/vault_accounts_rls.sql` (local/branch only, rolled
  back). **Not run.**
- **Runtime:** `NEXT_PUBLIC_FEATURE_VAULT_LIVE` is off, so `/vault` uses the
  demo adapter (fictional data in localStorage key
  `hengo-vault-demo-accounts`) and shows a "Demo mode" banner.
- **Code:** `lib/vault.ts` (types, Zod, https-only URLs, secret-field guard,
  filtering/sorting), `lib/vault-demo.ts`, `lib/api/vault.ts` (allowlisted
  writes; Supabase + demo adapters), `hooks/useVault.ts`,
  `components/vault/*`, `app/(main)/vault/page.tsx`.
- **Integration:** `vaultItem` added to the My Apps section in
  `lib/navigation.ts` (sidebar, Spaces, Quick Switcher). There is a generic
  `h-vault` card in `lib/projects.ts`, which is public-safe (static copy).

### Verification (2026-10-23)

- `pnpm lint`: 0 errors; the same 5 pre-existing warnings.
- `pnpm --dir apps/web format:check`: passed.
- `NODE_OPTIONS=--no-experimental-webstorage pnpm test`: 99 files, 1250 tests
  passed. New: `lib/vault.test.ts`, `lib/api/vault.test.ts`,
  `hooks/useVault.test.tsx`, `components/vault/vault-dashboard.test.tsx`, plus
  H-Vault cases in `lib/navigation.test.ts`.
- `pnpm build`: passed, 127 routes (adds `/vault`).
- `tests/e2e/vault.e2e.ts`: 2/2 passed against the already-running dev server
  on :3000, using installed Chrome (`PLAYWRIGHT_BASE_URL`,
  `PLAYWRIGHT_EXECUTABLE_PATH`).
- Scratch visual check (fake fictional session, demo mode): no horizontal
  overflow at 375/430/768/1024/1440; light and dark screenshots reviewed.
- **Not run:** the SQL RLS script, and any live-Supabase path (the table
  doesn't exist yet).

### Next steps

- Maintainer decision: review and approve the H-Vault migration, run the RLS
  script on a branch or local stack, apply it, then set
  `NEXT_PUBLIC_FEATURE_VAULT_LIVE=true` locally and in Vercel.
- Commit H-Vault separately from the Money Flow removal when requested.
- Future work: a metadata-only Notion import (plan in `docs/h-vault.md`;
  Password and Notes are excluded), custom categories, and `?account=` deep
  links.
- Carried over: Phase 3 (My Apps catalog content) and Phase 4 (quality audit)
  of the H-Space upgrade; Vercel Preview Supabase variables; the retired
  Railway service; `lib/goals.test.ts` is intermittent and date-dependent.
- Known pattern, not new: the shell header renders an `h1` page title and
  pages with their own hero (Notes, H-Vault) add a second `h1`.

### Notes for future sessions

- H-Vault must never gain a password/secret/PIN/token/recovery-code field,
  column, or free-text notes. Use Bitwarden for those.
- Keep Hengo Learning feature names such as Hengo Coach and Ask Hengo where
  they identify the learning/assistant experience.
- Do not rename `kori_*`, `koriai-*`, or `hengo-*` persistence identifiers as a
  branding cleanup; they are load-bearing compatibility keys.
- Project card facts live in `apps/web/lib/projects.ts`; verify a repository or
  deployment before adding technical claims or a live link.
- One application remains: `apps/web`, deployed from that Vercel root.
- Playwright on Windows: reuse a running dev server via `PLAYWRIGHT_BASE_URL`
  and installed Chrome via `PLAYWRIGHT_EXECUTABLE_PATH`.

---

## 2026-10-22 (b)

### Snapshot

- **Updated:** 2026-10-22
- **Branch:** `feat/hub-sidebar-nav`
- **Commits:** Phase 1 — `feat(web): turn /home into the personal daily
  dashboard`; Phase 2 — `feat(web): organize navigation into seven workspaces`
  (on top of e4f4ec6). Not pushed; no PR opened.

### Current focus — H-Space daily workspace upgrade

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

### Verification (2026-10-22)

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

### Next steps

- Visually review logged-in `/home` and the new navigation (Spaces sheet on
  mobile and tablet), then commit Phases 1–2 when requested.
- Optional follow-up: collapsible desktop sidebar groups (~34 rows today).
- Phase 3 audit + plan (My Apps catalog content at `/apps` + `lib/projects.ts`).
- Existing infra follow-ups: fix Vercel Preview Supabase variables; delete or
  repoint the retired Railway API service. Playwright on Windows: the
  web-server command treats `--port` as a directory and bundled Chromium is
  absent (use `PLAYWRIGHT_EXECUTABLE_PATH` with installed Chrome).

### Notes for future sessions

- Keep Hengo Learning feature names such as Hengo Coach and Ask Hengo where
  they identify the learning/assistant experience.
- Do not rename `kori_*`, `koriai-*`, or `hengo-*` persistence identifiers as a
  branding cleanup; they are load-bearing compatibility keys.
- Project card facts live in `apps/web/lib/projects.ts`; verify a repository or
  deployment before adding technical claims or a live link.
- One application remains: `apps/web`, deployed from that Vercel root.

---

## 2026-10-22 (a)

### Snapshot

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

### Current focus

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

### Verification

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

### Next steps

- Review the diff and commit when requested; nothing has been committed or
  pushed.
- An authenticated visual review of `/home` remains optional. Automated tests,
  build-time TypeScript validation, and public responsive browser checks pass.
- Existing infrastructure follow-ups remain separate: fix Vercel Preview
  Supabase variables and delete/repoint the retired Railway API service.

### Notes for future sessions

- Keep Hengo Learning feature names such as Hengo Coach and Ask Hengo where
  they identify the learning/assistant experience.
- Do not rename `kori_*`, `koriai-*`, or `hengo-*` persistence identifiers as a
  branding cleanup; they are load-bearing compatibility keys.
- Project card facts live in `apps/web/lib/projects.ts`; verify a repository or
  deployment before adding technical claims or a live link.
- One application remains: `apps/web`, deployed from that Vercel root.

---

## 2026-10-21 (a)

### Snapshot

- **Updated:** 2026-09-22
- **Branch:** `main` (synced with `origin/main` at the time)
- **Last commit:** f629870 — Merge pull request #25 from
  Hen-Heang/docs/handoff-post-api-removal

### Current focus

The Spring Boot backend had been removed, leaving `apps/web` as the repository's
only application. The removed `apps/api` subtree, API workflow, Maven scripts,
and API-only infrastructure remain recoverable from git history and the
untouched `Hen-Heang/hengo-api` backup repository.

Root commands and documentation had been rewired to the Next.js/Supabase app.
The app uses hosted Supabase for auth and data plus authenticated Next.js AI
route handlers; there is no separate backend service to run.

### Verification

- `pnpm test` had 1129 passes and one load-related timeout in
  `navigation-shell.test.tsx`; the same 56-test file passed by itself.
- `pnpm lint` passed with five pre-existing warnings.
- Repository scans found no stale Spring application references outside the
  migration history and the unrelated embedded `dev-learning-notes` project.

PRs #24 and #25 had been merged, and `main` was the only remaining local and
remote branch.

### Vercel follow-up

`apps/web` was linked to the existing `koriai-frontend` Vercel project. Dead
Spring/Railway environment variables were removed from Production and Preview.
Supabase variables were still Production-only, so Preview deploys remained
broken. VAPID/Telegram variables and integration-managed database variables
were deliberately left in place pending separate review.

### Open items

- Delete or repoint the old Railway service whose root was `/apps/api`.
- Copy the Supabase URL and publishable key to Vercel Preview.
- Optionally remove stale IntelliJ MCP configuration and reconcile the duplicate
  Supabase seed layout.

### Notes for future sessions

- One app remains: `apps/web`, using Next.js, Supabase, and `app/api/ai/*`.
- Hidden routes and features are not safe to delete.
- Query live Supabase before making schema claims.
- Run jsdom suites on Node 25 with
  `NODE_OPTIONS=--no-experimental-webstorage`.

---

## 2026-09-04 (b)

### Snapshot

- **Updated:** 2026-09-04
- **Branch:** `main` (aligned with `origin/main` before the handoff edits)
- **Last commit:** b232872 — Merge pull request #17 from Hen-Heang/feat/core-korean-300

### Current focus

**Account-specific Korean pattern practice was expanded in the live Hengo
Supabase project** (`dnzqgnejwyucenghugrb`) for `henheang15@gmail.com`
(`auth.users.id = 31dec390-4b91-4516-bcc0-a0f5f9045217`). No schema or
application-code change was needed because the existing Phrasebook already
supports collections, cards, speaking practice, and review progress.

A pinned collection was created idempotently:

- Collection: `직장·일상 실전 한국어 문형 22` /
  `22 Essential Work & Daily Korean Patterns`
- Collection ID: `83a5152d-c4bf-4b59-99e5-2d8cf5c0e400`
- Source key: `mentor-real-situation-patterns`
- Seed/content version: 2
- Twenty-two active, user-editable cards cover the original mentor patterns
  plus high-utility work and daily-life situations.
- Original patterns:
  - `믿기지 않을 정도로 ~`
  - `~했을 뿐이에요`
  - `~에 대해서는 잘 모르겠어요`
  - quoted clause + `~라고/다고 생각하다`
- Added workplace language: work in progress, completion estimates, blockers,
  clarification, permission, checking and following up, suggestions, respectful
  disagreement, completion reports, and polite refusal/availability.
- Added daily-life language: intentions, decided plans, past experience, things
  the learner wants to try, café ordering, exchanges/refunds, directions, and
  appointments.

Each card uses a realistic workplace prompt, romanization, English meaning,
alternate answers, usage/register guidance, vocabulary, and recall-oriented
tags. The mentor's casual `~라고 생각하니?` is retained as a variant; the
recommended workplace answer uses polite `~라고 생각하세요?`.

### Verification

- Live Auth lookup found exactly the requested account, with a recent sign-in.
- The collection is pinned and owns exactly 22 active cards in positions 0–21,
  with 22 distinct positions.
- Category distribution is 10 workplace, 8 daily-life, and 4 original mentor
  pattern cards.
- All questions are JSON objects; all answer lists are non-empty; every card has
  a recommended answer. Required Korean, romanization, English, register,
  vocabulary, and tags all passed live integrity queries.
- `kori_phrase_collections` and `kori_phrase_cards` both have RLS enabled with
  their existing per-owner policies.
- Stable per-user source keys make both the original and expanded data writes
  safe to rerun without duplicating the collection or cards.

### Working tree

- Only `HANDOFF.md` and `HANDOFF_HISTORY.md` were changed to record this live
  data update; the application source was not modified.

### Next steps

- The user can open `/phrasebook`, select the pinned collection, and start the
  built-in practice flow.
- Browser verification is still optional because no login password/session was
  provided; database shape, ownership, content, and RLS were verified directly.

### Notes for future sessions

- Two independent apps remain: `apps/web` uses Next.js/Supabase; `apps/api` is
  an imported backup and is not the live backend.
- V2 features hidden from navigation are not safe to delete.
- Query live Supabase before schema claims; the repository migration folder is
  not a complete live-schema ledger.
- Running jsdom suites on Node 25 requires
  `NODE_OPTIONS=--no-experimental-webstorage`.

---

## 2026-09-04 (a)

### Snapshot

- **Branch:** `main` (aligned with `origin/main` before handoff edits)
- **Last commit:** b232872 — Merge pull request #17 from Hen-Heang/feat/core-korean-300

### Current focus

An initial account-specific Phrasebook collection was added to live Hengo
Supabase for `henheang15@gmail.com`: `실전 한국어 문형 연습` / `Real-Situation
Korean Patterns` (`83a5152d-c4bf-4b59-99e5-2d8cf5c0e400`). It contained four
active cards based on the learner's mentor-provided patterns, was pinned, used
stable per-user source keys, and required no schema or application-code change.

The four-card version was verified for Auth ownership, JSON shape, recommended
answers, RLS, and idempotency. It was then expanded later the same day into the
22-card practical work-and-daily-life curriculum recorded in `HANDOFF.md`.

## 2026-09-03 (a)

### Snapshot

- **Branch:** `main` (aligned with `origin/main`)
- **Last commit:** 2d4106d — add new ci

### Current focus

**Supabase performance audit and RLS cleanup.** The live `hengo` project
(`dnzqgnejwyucenghugrb`, ap-northeast-2) was audited with the Supabase MCP
advisors. Performance lints went from **91 to 65**: `auth_rls_initplan` (10) and
`multiple_permissive_policies` (16) both reached zero.

One migration was applied and mirrored into the repo as
`apps/web/supabase/migrations/20260903013902_perf_rls_policy_consolidation.sql`.
It removed duplicate permissive owner policies from the four `kori_focus_*`
tables while retaining their restrictive owner guards, rewrote remaining bare
`auth.uid()` policy calls as `(select auth.uid())`, and pinned `search_path` on
`public.kori_next_reminder_run`. Access predicates and roles were preserved.

Verification found no remaining bare `auth.uid()` in the affected policies,
each focus table had four per-action policies plus one restrictive guard, and
`lib/recovery-security.test.ts` passed 6/6.

### Working tree at the time

- The migration file above was untracked and uncommitted, although already
  applied to the live database.
- The prior 616-file formatting/tooling set had landed as 2d4106d (`add new ci`).
- GitHub CLI authentication might still have been invalid; authenticated Git
  operations worked independently.

### Next steps at the time

- Commit the new migration file. *(Resolved after this snapshot.)*
- Leave the 46 unused-index and 19 unindexed-foreign-key advisories alone until
  table sizes justify revisiting them.
- Human decisions remained for `vector`/`pg_net` in `public` and leaked-password
  protection being disabled.
- Older open items remained: assess `v0/hen-heang-12e5395f`, optionally rewrite
  `apps/web/docs/navigation-shell-audit.md`, and fix the aged hardcoded date in
  `lib/learning/corrections.test.ts`.

### Notes

- The apps remain independent: `apps/web` uses Next.js/Supabase, while
  `apps/api` is an imported backup and is not the live backend.
- V2 features hidden from navigation must not be treated as safe to delete.
- The repository migration folder is not a complete live-schema ledger; query
  live Supabase before making schema claims.
- Running jsdom suites on Node 25 requires
  `NODE_OPTIONS=--no-experimental-webstorage`.

## 2026-08-31 (d)

### Snapshot

- **Branch:** `main` (aligned with `origin/main`)
- **Last commit:** 48ef886 — update new logo

### Current focus

**Repository and branch cleanup was complete.** PRs #1 through #14 were all
merged, including Hengo V2 in PR #13 and the workflow tooling in PR #14. No open
or draft PRs remained.

The remote branch list had been reduced from 19 branches to three intentional
ones: `main`, `archive/hengo-v1-2026-08-31` (V1 snapshot), and
`v0/hen-heang-12e5395f` (one unique unmerged commit touching three root-level
chat components). Sixteen merged, superseded, or duplicate remote branches were
deleted, and a stale local tracking ref for the already-deleted PR #1 branch was
pruned.

### Working tree at the time

- A pre-existing staged formatting/tooling change set of 616 files (21,253
  insertions, 9,661 deletions) covering Prettier configuration, a composite
  GitHub Action, workflow edits, package changes, and broad formatting. It was
  to be preserved and reviewed before committing.
- GitHub CLI authentication was still invalid, though authenticated Git
  operations worked.

### Next steps at the time

- Review and test the staged 616-file formatting/tooling change set before
  committing it. *(Resolved 2026-09-03: landed as 2d4106d "add new ci",
  618 files, 21,327 insertions, 9,680 deletions.)*
- Decide whether `v0/hen-heang-12e5395f` was still valuable — 215 commits behind
  `main`, but its single commit was never merged. *(Still open.)*
- Optionally rewrite `apps/web/docs/navigation-shell-audit.md`, marked
  superseded but not rewritten. *(Still open.)*
- `lib/learning/corrections.test.ts` failed on a hardcoded date aged past
  "today", pre-existing and unrelated to V2. *(Still open.)*

## 2026-08-31 (c)

### Snapshot

- **Branch:** `feat/hengo-v2-korean-focus` (8 commits ahead of `main`, not
  pushed at the time)
- **Last commit:** 1f55db3 — docs: document hengo v2 product direction

### Current focus

**Hengo V2 — focused Korean learning.** All 8 implementation phases were
complete and committed locally. `docs/HENGO_V2.md` held the full product
direction, hidden-V1 list, and architecture decisions.

### Blocked at the time

Pushing the branch and opening the PR had failed because the stored GitHub CLI
token was invalid. The intended commands after re-authentication were:

```bash
git push -u origin feat/hengo-v2-korean-focus
gh pr create --base main --head feat/hengo-v2-korean-focus \
  --title "feat: Hengo V2 focused Korean learning experience"
```

The user had asked for the PR to be prepared only, not merged automatically.

### Next steps at the time

- Push and open the PR once authentication was restored.
- Optionally rewrite `apps/web/docs/navigation-shell-audit.md`, which was
  marked superseded.
- A pre-existing `lib/learning/corrections.test.ts` test failed because its
  hardcoded date had aged past "today"; the V2 branch had not touched it.

### Notes

- The apps remain independent: `apps/web` uses Next.js/Supabase, while
  `apps/api` is an imported Spring Boot/MyBatis backup and is not the live
  backend.
- **V2 rule: hide, don't delete.** V1 routes, components, and tables remained
  available by direct URL; `primaryNavItems` in `lib/navigation.ts` controlled
  visibility.
- jsdom suites on Node 25 required
  `NODE_OPTIONS=--no-experimental-webstorage`.
- Repo tooling files were deliberately kept outside the V2 PR at that point.

## 2026-08-31 (b)

- Repo was clean on `main`, no active task. Superseded by the Hengo V2 work
  below on the same day.

## 2026-08-31 (a)

- Set up the HANDOFF.md / HANDOFF_HISTORY.md session-continuity pattern for
  this repo, adapted from a Claude Code workflow reviewed in an external
  Notion guide. No code changes.
