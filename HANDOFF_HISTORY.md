## 2026-11-09 - MCP consent spike (#111) handoff snapshot

# HANDOFF

## Snapshot

- **Updated:** 2026-11-09.
- **Checkout:** `main` at `651fc54` (PR #110 merged). Since the last snapshot the owner merged #106–#110. The owner's main checkout has unrelated uncommitted work that isn't ours: a modified `apps/web/lib/api/finance-client.ts`, plus untracked `false` and `luyra-web/`. Leave them alone.
- **Merged this session:**
  - **#106 (`fix/pr-validation`).** After merging `main` (conflicts were only in `HANDOFF*.md`; `main`'s version kept), it added only: History's empty-state "Open AI Coach" opens `/chat` instead of `?mode=corrections`, plus Prettier fixes in `docs/design-system.md` and `scripts/generate-app-icons.mjs`.
  - **#110 MCP project knowledge.** Three read tools (`list_knowledge_projects`, `list_project_notes`, `get_project_note`) and two write tools behind `MCP_WRITE_ENABLED` (`create_project_note`, `update_project_note`; no deletes, never moves a note between projects). Nothing is visible unless its project id is in `MCP_KNOWLEDGE_PROJECT_IDS`. Also fixed a regression: the "use them only when the user asks" write caveat had been pushed past the first 512 characters of the server instructions. Tests added for cross-user and non-allowlisted denials (identical denial text, so no existence oracle) and for updates scoped by `user_id` and `project_id`. Record: `docs/MCP_PROJECT_KNOWLEDGE.md`.
- **Open: draft PR #111 (`spike/mcp-consent-rest`). This is the MCP sign-in unblock, done web-only at the owner's request rather than via h-space-api#36.**
  - `/oauth/consent` called `supabase.auth.oauth.*`, which throws under the token bridge. New `lib/mcp-consent.ts` calls the same two Supabase Auth endpoints directly with the bridge token: `GET /auth/v1/oauth/authorizations/{id}` and `POST …/consent`. GoTrue source (`internal/api/oauthserver/authorize.go`) guards them with `requireAuthentication` plus a user lookup and no session check, the same as `/user`, which already accepts bridge tokens (`lib/server/ai.ts`). The bridge only _approves_; the MCP token is still minted by Supabase's OAuth server.
  - Return-after-sign-in: the `(main)` gate sends signed-out users to `/login?next=…`, and all three sign-in paths return there. `lib/safe-next-path.ts` accepts same-site paths only (no open redirect, no auth-page loop). Behaviour change: after a mid-visit sign-out, signing back in returns to that page instead of `/home`.
  - Consent copy no longer points at a "Supabase connected-apps settings" screen that users don't have.
  - **Migration, NOT applied:** `apps/web/supabase/migrations/20261109120000_mcp_access_token_hook.sql`. `public.kori_mcp_access_token_hook` sets `aud = [MCP_RESOURCE_URL, "authenticated"]` only for approved `client_id`s; every other token (H-Space and Orbit sign-ins) is unchanged. It has placeholders (`<your-domain>`, `<claude-code-client-id>`), and a guard aborts the migration until both are replaced.
  - **Unverified until the live test:** whether GoTrue accepts the bridge token on the consent endpoints; whether the hook's claims include `client_id` for OAuth tokens; whether the data API accepts an array `aud`.
- **Verification (local, at #111 `0010825`; the migration commit `23256c3` is SQL only):**
  - `pnpm lint`: 0 errors, 6 warnings (all already on `main`).
  - Prettier: passed.
  - `pnpm test`: 195 files, 2,115 tests passed.
  - `pnpm build:web`: passed. This machine needs `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`, or `next/font` can't fetch Google Fonts (TLS inspection).
- **GitHub Actions is down (account billing lock).** Every Web CI job fails in about 2s with 0 steps. The check-run annotation reads "account is locked due to a billing issue". The account (Hen-Heang, GitHub Free, $0 billable, no payment method) shows default $0 "Usage blocked" budgets, and editing them requires a payment method. The owner opened a GitHub Support billing-lock review. The owner chose to skip it for now: CI checks aren't required (no branch protection on `main`), and Vercel is unaffected. Until it's fixed, run `pnpm lint` / `pnpm test` / `pnpm build` locally before merging, and treat red Web CI as "not run".
- **Worktrees:** `../h-space-mcp-consent-fix` (detached at `f8c3264`) wasn't created by the agent; ask before removing it. Empty leftover folders `../h-space-consent` and `../h-space-consent2` contain only `node_modules` links. Delete them in File Explorer, not with `rm -rf`, which can follow the links into the pnpm store.

## Current focus

1. **MCP live (owner + agent), in order:**
   1. Owner checks the Supabase dashboard (look only): JWT keys (current ES256 or RS256; legacy HS256 still accepted, since the bridge needs it), Site URL and redirect URLs, OAuth server (enabled, path `/oauth/consent`, dynamic registration off), and whether a Customize Access Token hook already exists. If it does, merge into it; don't replace it, because Orbit shares the project.
   2. Owner registers Claude Code as a **public** OAuth client and adds `http://localhost:3000/**` to the redirects.
   3. Fill the hook placeholders. Applying it is a live SQL change and needs explicit owner approval; run its three test selects, then enable it.
   4. Run the local live test from the #111 PR body. Then the owner marks #111 ready and merges it, and sets Vercel `MCP_RESOURCE_URL`, `SUPABASE_OAUTH_ISSUER`, `MCP_ALLOWED_CLIENT_IDS`, `MCP_WRITE_ENABLED` (start `false`) and `MCP_KNOWLEDGE_PROJECT_IDS`. Deployment Protection must be off for production.
   5. Register ChatGPT as a second client afterwards.
2. **Connected apps** (Settings → Security): list and revoke connector grants via Supabase `GET`/`DELETE /user/oauth/grants` (same REST-plus-bridge pattern). Makes the consent copy fully true and gives a kill switch.
3. **Owner:** follow up on the GitHub Support billing-lock ticket; re-run the CI runs `42546995954` (#111), `42546156739` (#110) and `42546379616` (`main`) once it's lifted.
4. **UI audit follow-ups (unchanged):**
   - History "★" filters never match (`toCorrectionReview` doesn't map `rating`).
   - `UnitEditor` `FieldLabel` is a `<p>`.
   - Sign-in app tiles use one colour per app.
   - `public/app-process.png` needs new artwork.
   - Phase 6 sweep and keyboard pass.
   - Remaining restyles: Chat leftovers, Interview, Roadmap, Recovery; vocab `SentenceChallenge`/`VocabCard`/`VocabDeck`/`DeckBuilder`.
5. **Carried over:**
   - Native-speaker pass on `lib/korean-phrasebook/work-seed.ts`.
   - Planner slices 3–10; Finance redesign phases D–F; second-brain T2–T7.
   - Long-term MCP auth via h-space-api (#36) to replace the bridge-tied consent before the bridge is removed.
   - Generic-error treatment for `chat/stream`, `goals/coach`, `memory/ask`, `recovery-coach`.
   - Independent H-Vault security audit and restore drill.

## 2026-11-08 - UI audit merges (#98-#105) handoff snapshot

# HANDOFF

## Snapshot

- **Updated:** 2026-11-08.
- **Checkout:** `main` at `57e2d7d` (PR #105). PRs #98–#105 (the UI audit work below) were merged by the owner on 2026-11-08, 13:47–13:53 UTC, as merge commits; all branches are kept. Each merge started a Vercel production deploy; the last one was still deploying when this was written. No migration, API, auth, data or env change in any of them.
- **The UI audit (2026-11-08)** checked `apps/web` against `docs/design-system.md` and found the screens Phases 1–5b never reached, plus the app icon. Record: `apps/web/docs/ui-redesign-audit.md` (Phase 6 status, the vocab/History/Reading restyle sections) and `docs/design-system.md` §2 and §6.
- **Merged:**
  - **#98 App icon set.** `apps/web/scripts/generate-app-icons.mjs` draws the H-Space mark and renders `public/icons/*` + `public/favicon.ico`. Wired into layout metadata, the manifest (incl. maskable), `sw.js` (icon + mono badge) and the ten in-app logo spots. Re-run the script; don't edit its outputs.
  - **#99 Vocab review (Memory Lab).** `ReviewSession.tsx` on tokens. Quiz answers to 1–4 + Enter, with a guard so Enter on a focused button can't grade twice (tested). Fixes the results buttons collapsing on phones.
  - **#100 Icon pass.** 305 custom Lucide strokes removed (stroke 2). Exceptions: `Check` ticks at 3, the bottom nav's state stroke, `/finance`. Emoji UI icons → Lucide (`lib/chat-presets.ts` now carries `icon`). Five repeated nav icons made distinct. Quick Switcher icons neutral.
  - **#101 Phase 6a.** Eight dead components deleted. `/interview/script` versions use `Dialog`/`AlertDialog` — no `window.confirm`/`prompt`/`alert` left in `app/` or `components/`.
  - **#102 Phase 6b.** New `components/ui/reader-skeleton.tsx` for the Reading and Notes page loaders. Twelve hand-made empty blocks → `EmptyState`. Planner and Home already complied; the remaining spinners are in-button progress, which is correct.
  - **#103 Landing + brand.** `--brand-from/via/to` + `.text-brand-gradient`/`.bg-brand-gradient` from the icon — marketing surfaces only (design-system §2). Landing restyled. `opengraph-image.tsx` uses the real mark (Node runtime, generated at build).
  - **#104 History** and **#105 Reading** (unit reader + `UnitEditor`) restyled: flat surfaces, divided rows, `primary` accent, success/destructive only for state.
- **How it was merged:** `gh pr merge` is on the `.claude/settings.json` deny list, so the owner ran each merge. #101/#102 had their #100 overlap resolved on their branches first. #103 needed `main` merged in after #100 landed (GitHub flagged it although git merged it cleanly). All eight were rehearsed in order with `git merge-tree` before merging.
- **Verification (merged `main`, 2026-11-08):**
  - `pnpm lint` — 0 errors (5 pre-existing warnings).
  - `pnpm test` — 192 files, 2,075 tests passed.
  - `pnpm build` — passed.
  - GitHub Actions still can't run (billing lock: jobs fail with 0 steps). Vercel previews built every PR.
  - Each PR was checked rendered with Playwright at 390/1280, light and dark, synthetic data, all network mocked. Not done: a physical iPhone/Android install of the new icon, a real push showing the badge, real AI sentence results and audio in Memory Lab, a social-site preview of the share image.
- **PR #106 (`fix/pr-validation`)** began as a combined integration of #98–#104; since those merged individually, after merging `main` it only adds: History's empty-state "Open AI Coach" now opens `/chat` (not `?mode=corrections`, which opens an empty review that can't create a first correction), and Prettier fixes in `apps/web/docs/design-system.md` and `apps/web/scripts/generate-app-icons.mjs`.
- **Untracked, not ours:** `test-results/` at the repo root.

## Current focus

1. Owner: check the production site after the deploys; re-add H-Space to the iPhone home screen for the new icon. Fix the GitHub billing lock so Actions CI runs again.
2. UI audit item 4, remaining screens: Chat leftovers (`ChatWindow`, `RealtimeVoicePanel`, `CorrectionsReview`), Interview (`components/interview/*`), Roadmap, Recovery visuals. The rest of vocab: `SentenceChallenge`, `VocabCard`, `VocabDeck`, `DeckBuilder`.
3. Follow-ups found during the audit:
   - History's "★ 4–5 / ★ 1–3" filters can never match — `toCorrectionReview` (`lib/api/learning.ts`) doesn't map `rating` (or `englishTranslation`). Hide the filters or map the data.
   - `UnitEditor`'s `FieldLabel` is a `<p>`, not a `<label>` — fields are announced by placeholder only.
   - Sign-in app tiles (`components/auth/auth-shell.tsx`) still use one colour per app.
   - The landing's "How it works" image (`public/app-process.png`) needs new artwork (old "H" logo).
   - Phase 6 still open: sweep at all widths in both themes, keyboard pass through dialogs/sheets, `@axe-core/playwright` (owner's OK needed).
4. Carried over: native-speaker pass on `lib/korean-phrasebook/work-seed.ts`; Planner slices 3–10; Finance redesign phases D–F; second-brain T2–T7; MCP auth decision; generic-error treatment for `chat/stream`, `goals/coach`, `memory/ask`, `recovery-coach`.

## 2026-11-08 - App icon set (PR #98) handoff snapshot

# HANDOFF

## Snapshot

- **Updated:** 2026-11-08.
- **Checkout:** `ui/app-icon-set`, branched from `main` at `11a66f8` (PR #97, the reminder handoff fix). Committed and opened as a PR at the owner's request. No migration, API, auth or data change.
- **App icon set** (record: the "app icon set" status under Phase 6 in `apps/web/docs/ui-redesign-audit.md`):
  - **Before:** every icon slot (favicon, Apple touch icon, all manifest entries, push icon and badge) loaded `H Space Icon.png` (1254px, 1.6 MB, artwork inside a black margin). The sized `public/icon-192/512`, `apple-icon` and `favicon-32` PNGs were the old Hengo mark and unreferenced; they're deleted.
  - **Now:** `apps/web/scripts/generate-app-icons.mjs` draws the mark once as SVG and renders every size with Playwright's Chromium into `public/icons/` plus `public/favicon.ico`. Re-run it (`node scripts/generate-app-icons.mjs` from `apps/web`) rather than editing outputs.
  - The crossbar is a shallow wave on purpose: a steep diagonal read as "N" at 16–32px.
  - **Wired in:** `app/layout.tsx` icons, `site.webmanifest` (real sizes + maskable), `sw.js` (192px icon, white mono badge), and the ten in-app logo spots, which now use `icons/h-space-mark.svg` with the wrapper radius matching the mark's 22.5% corner.
  - `H Space Icon.png` stays as source artwork (no longer served); `hengo-icon.png` stays the AI Coach avatar.
- **Verification (2026-11-08):**
  - `pnpm lint`: 0 errors (5 pre-existing warnings).
  - `pnpm test`: 192 files, 2,071 tests passed.
  - `pnpm build`: passed.
  - On `pnpm start`: every icon URL returns 200 with the right content type; head links emitted. Screenshots of the shell sidebar (light/dark), tablet rail, login, 404 and landing show the mark with no CSP errors.
  - Not done: a physical iPhone/Android install, and a real push to see the badge. Existing home-screen installs keep the old icon until re-added.
- **Untracked, not ours:** `test-results/` at the repo root.

## Current focus

1. Owner: review the redrawn mark (`apps/web/public/icons/icon-512.png` and `favicon-32.png` on the branch) and merge the icon PR; then re-add H-Space to the iPhone home screen to pick up the new icon.
2. UI audit follow-ups, in order (from the 2026-11-08 audit):
   - **Vocab review flow:** `components/vocab/ReviewSession.tsx` and related files hold the most off-system styling.
   - **Icon pass:** Lucide stroke 2 (171 icons at 2.5, 71 at 3), Lucide instead of emoji as UI icons (`ReviewSession`, `DeckBuilder`, `ChatWindow`), one colour per meaning.
   - **Screen-by-screen restyle:** History, Reading, Chat leftovers, Interview, Roadmap, Recovery visuals.
   - **Phase 6 consistency pass:** skeletons over the ~98 ad-hoc spinners, `EmptyState` (4 users), `AlertDialog` for the three `window.confirm` calls in `interview/script`, and deleting the 8 dead components.
   - **Landing/brand pass:** the OG image logo and the landing's blue gradients.
3. Carried over: native-speaker pass on `lib/korean-phrasebook/work-seed.ts`; fix the GitHub billing lock so Actions CI runs; Planner slices 3–10; Finance redesign phases D–F; second-brain T2–T7; MCP auth decision; generic-error treatment for `chat/stream`, `goals/coach`, `memory/ask`, `recovery-coach`.

## 2026-11-06 - Korean for my work + reminder reconcile fix handoff snapshot

# HANDOFF

## Snapshot

- **Updated:** 2026-11-06.
- **Checkout:** `main` at `d497eaa`. PR #96 (`feat/work-korean-focus`) was merged by the owner on 2026-11-06 and Vercel's production deploy completed. The branch is kept.
- **Feature: "Korean for my work"** (record: `apps/web/docs/korean-for-work.md`). A focus inside Learning, not a new nav item:
  - **Analyzer** (`/chat?mode=analyze`):
    - Results come main-point first (what it means → what to do → My reply → useful language → practice → collapsed details).
    - The editable box is the payload; a sensitive-text warning offers to replace fragments with placeholders.
    - Analyzer history is now **opt-in**.
    - Save to Phrasebook goes through an editable, idempotent draft.
  - **Phrasebook:**
    - Readable situation labels.
    - Compact Filters popover/sheet with active count, removable chips and Clear all.
    - New 25-card starter pack `work-communication`, with 6 comprehension cards.
    - Saved messages go to a private "My work messages" collection.
  - **Work practice** — new `/phrasebook/practice?mode=work` mode. Reply typed or spoken-then-corrected; meaning-first feedback; never a pronunciation score.
  - **Mission engine** — with the goal set to Workplace Korean, one `work_message` step; due reviews are trimmed to fit the time budget, and the backlog is kept and shown as secondary text.
  - **Learning Hub** — compact "Korean for my work" card.
- **Data:** stays in Supabase/RLS. No h-space-api change, since Learning migration is phase 4 and hasn't started.
- **Migration applied 2026-11-06 at the owner's request:** `apps/web/supabase/migrations/20261106120000_work_korean_focus.sql`, recorded live as `20261106145253 work_korean_focus`. Verified: three nullable columns on `kori_phrase_cards`, `work_message` in the mission item check, RLS still on, row counts unchanged (132 cards, 84 items).
  - Adds three nullable `kori_phrase_cards` columns and a `work_message` mission item type.
  - The app degrades without it: card inserts retry without the columns; the mission plan is rebuilt without the work step on `23514`.
  - The rollback block is at the end of the file.
- **Also changed:**
  - `jsonAiRoute` and the analyzer stream no longer return provider error text.
  - New shared `userDataBlock()` in `lib/server/ai.ts`.
  - `ChipSelect` takes an optional `getLabel`.
- **Verification (2026-11-06):**
  - `pnpm lint` — 0 errors (5 warnings, all pre-existing).
  - `pnpm test` — 192 files, 2,070 tests passed.
  - `pnpm build` — passed.
  - `tests/e2e/work-korean.e2e.ts` — 10/10 against a dev server with synthetic Supabase env, all network mocked; screenshots in `apps/web/test-results/work-korean/` (git-ignored).
  - Not done: a real-account run (it would seed the pack into live data), a physical device / WebKit run, and a human review of real model outputs and the pack's romanization.
- **Untracked, not ours:** `test-results/` at the repo root.
- **Reminder reconcile fix applied 2026-11-06 at the owner's request:** `20261105121000_fix_reminder_reconcile_alias.sql`, recorded live as `fix_reminder_reconcile_alias`. Verified: one function overload, alias clash gone, execute still revoked from `anon`/`authenticated`; `kori-reminder-delivery-check` failed every minute through 15:05 UTC and **succeeded from 15:06 UTC**. `kori_reminder_deliveries` was empty, so nothing was stuck — the next reminder that fires is the first end-to-end delivery check.

## Current focus

1. Owner: open the Phrasebook once signed in (adds the new starter pack); from the next day's plan, check the work-message step. Fix the GitHub billing lock so Actions CI runs again.
2. Native-speaker pass on `lib/korean-phrasebook/work-seed.ts` (Korean + romanization).
3. Carried over: review the Home redesign PR; Planner slices 3–10; Finance redesign phases D–F; second-brain T2–T7; MCP auth decision.
4. Follow-up candidates: the same generic-error treatment for `chat/stream`, `goals/coach`, `memory/ask` and `recovery-coach` (they still echo `err.message`).

## 2026-11-05 - Home focused redesign handoff snapshot

# HANDOFF

## Snapshot

- **Updated:** 2026-11-05.
- **Checkout:** `feat/home-focused-redesign` in the worktree `E:\Fullstack\h-space-home-redesign`. The Home work was committed at the owner's request, merged with `origin/main` (Luyra-link PR #92 and earlier), and pushed for a PR. No migration, API, auth or data change.
- **Home redesign:** `/home` now leads with the greeting, the date and Quick Capture. Below that come full-width Today tasks, a compact Progress row (goals, habits, learning), Continue (recent destinations), and up to four app shortcuts. The signed-in promo banner (`HomeHero`) and the duplicate `SnapshotMetrics` row were removed. Existing query caches, routes, task completion, habit, favourite, capture and AI interactions are kept.
- **Components:** shared `CompactSummary` and `AppShortcut` are in `components/home/home-primitives.tsx`. A new `QuickAccess.test.tsx` was added. `apps/web/AGENTS.md`'s Overview description and `docs/design-system.md` are updated.
- **Verification after merging main:**
  - `vitest run` passed (182 files, 1,976 tests).
  - `tsc --noEmit`, ESLint and Prettier are clean on the Home files.
  - Earlier on this branch, before the merge: a production build passed, and light and dark Chrome route sweeps passed at 320–1440px.
  - Still open: populated-widget states were not seen with fixtures, because some widgets stayed in skeleton or error states. There was no physical device or WebKit run.
- **Branch clean-up (2026-11-05):**
  - All open PRs are merged.
  - Merged local branches and worktrees were removed: `h-space-pr72`, `-migration`, `-finance-redesign`, `-phase5`, `-learning`.
  - Kept at the owner's request: `chore/claude-ship-skill-lint-hook`.
  - Still to do by the owner: delete the merged remote branches (the guard hook blocks pushes from `main`), `git branch -D feat/spring-migration-inbox` (its patch is in main), and `git branch -D integrate/luyra-finance` (owner chose to drop it).
- **Untracked, not ours (main checkout):** `false`, `luyra-web/`, the owner's change in `apps/web/lib/api/finance-client.ts`, and `test-results/playwright/.last-run.json`.
- **Still open from the reminder work:** `20261105121000_fix_reminder_reconcile_alias.sql` is not applied yet.

## Current focus

1. Owner: review the Home redesign PR (ideally signed in with real data, to see the populated widgets).
2. Docs/structure clean-up: being redone on fresh `main` (from the old `chore/repo-structure-cleanup` worktree).
3. Planner slices 3–10 and the Tasks-as-default decision; Finance redesign phases D–F (see `HANDOFF_HISTORY.md`).
4. Carried over: apply the reminder migration; second-brain T2–T7; MCP auth decision.

## 2026-11-05 - Remove Luyra app link handoff snapshot

# HANDOFF

## Snapshot

- **Updated:** 2026-11-05.
- **Checkout:** `chore/remove-luyra-app-link`, cut from `origin/main` at `6f7dd44` (Planner UX PR #90 merged). Committed and pushed for a PR at the owner's request. No migration, API or data change.
- **Luyra app link removed:** done at the owner's request, since Finance now lives in H-Space at `/finance`. `lib/projects.ts` no longer has the Luyra card or `LUYRA_FINANCE_URL`. The card is gone from `/apps`, the public landing page's My Apps section, Overview's My Apps grid and the app count. The Finance nav item (`apps-luyra` → `/finance`) is unchanged: sidebar, My Apps tab, phone tab, and Quick Switcher, where "luyra" is still a keyword. A stale `luyra` favourite in localStorage is harmless, because favourites only match existing projects.
- **Docs:** `apps/web/AGENTS.md`, the `lib/navigation.ts` comment and `docs/LUYRA_MIGRATION.md` (the step 2 note and step 6, Cutover) now say the card was removed.
- **Tests:** the "My Apps card links to Luyra" case in `components/vault/vault-dashboard.test.tsx` now asserts there is no Luyra card or external Luyra link.
- **Verification:** `pnpm test:web` passed (178 files, 1,958 tests); `tsc --noEmit` clean; ESLint and Prettier clean on the changed files. Not run: `pnpm build`, a browser check.
- **Not changed:**
  - The sign-in page tile "Luyra · Personal finance" in `components/auth/auth-shell.tsx`. It's decorative, not a link.
  - `apps/luyra` and `luyra.henheang.site`. Those belong to the cutover step.
- **Untracked, not ours:** `false` at the repo root, `luyra-web/`, the owner's change in `apps/web/lib/api/finance-client.ts`, and `test-results/playwright/.last-run.json`. Left unstaged.
- **Still open from the reminder work:** `20261105121000_fix_reminder_reconcile_alias.sql` is not applied yet.

## Current focus

1. Owner: merge the Luyra-link PR, and decide whether the sign-in tile should say "Finance".
2. Planner: owner decision on Tasks-as-default, then slices 3–10. See the top `HANDOFF_HISTORY.md` entry and `apps/web/docs/planner-ux-audit.md`.
3. Finance redesign phases D–F and the "Keep Luyra's look" wording. See the second `HANDOFF_HISTORY.md` entry.
4. Carried over: apply the reminder migration; second-brain T2–T7; MCP auth decision.

## 2026-11-05 - Planner UX slices 1–2 handoff snapshot

# HANDOFF

## Snapshot

- **Updated:** 2026-11-05.
- **Checkout:** `feat/planner-ux`, open as PR #90. Cut from `fix/recovery-loading-skeletons` at `49d7c53`; `origin/main` (finance redesign PR #89, skeletons PR #88) merged in on 2026-11-05 to clear a `HANDOFF.md` conflict. The previous Finance snapshot is now the top entry in `HANDOFF_HISTORY.md`. No migration, API or data change.
- **Planner UX audit:** `apps/web/docs/planner-ux-audit.md` covers every Planner route, dialog and sheet. It has prioritised findings with file:line references, 7 real bugs (B1–B7), a nav proposal, shared-component recommendations and a 10-slice plan.
- **Nav recommendation:** keep all five Planner tabs visible. They fit on one line from 375px, and only 320px wraps. Don't add a "More" overflow. The default landing route stays `/goals`. Making Tasks the default needs an owner decision.
- **Slice 1 (done, committed):**
  - `TodaysTasks.tsx`: rows no longer repeat "Anytime" / "Overdue" under the matching group header. The word stays as sr-only text because the headers are `aria-hidden`. Scheduled-but-late tasks still show the red "Overdue · HH:MM".
  - `GoalsHubHeader.tsx` has a new `newGoalEmphasis` prop. On Tasks, New goal is an outline button, so the composer is the one primary action.
  - New test: `TodaysTasks.test.tsx` (4 cases).
- **Slice 2 (done, committed):** behaviour bug fixes B1, B2, B4, B5 and B7, each with a test. Details are in audit §7.
  - B1: travel goals can now be submitted.
  - B2: the Inbox Tag filter now works.
  - B4: the calendar task sheet has one close button instead of two.
  - B5: deleting from the Edit sheet asks for confirmation once.
  - B7: calendar task titles are no longer cut to 23 characters.
- **Slice 2 verification:**
  - `pnpm test:web` passed: 175 files, 1,929 tests.
  - `pnpm lint`: 0 errors. `tsc` is clean.
  - Overflow sweep of `inbox`, `goals/calendar` and `goals/create/custom` at 375/1440 passed.
  - The calendar body was still compiling in the screenshot, so the new two-line rows weren't seen in a browser.
- **Slice 1 verification:**
  - `pnpm test:web` passed: 171 files, 1,919 tests.
  - `pnpm lint`: 0 errors, 5 warnings, none from these files. `tsc --noEmit` is clean.
  - Narrowed UI sweep at 320/375/1440 for `goals`, `goals/tasks`: no overflow. Before/after screenshots are in `apps/web/test-results/ui-sweep/planner-{before,after}/` (gitignored).
  - `/goals/[id]` failed to render in both sweeps because the local `next dev` crashed ("Jest worker … child process exceptions") under low memory.
  - Not run: `pnpm build` (machine low on memory), dark mode, and 390/430/768/1024 widths.
- **Playwright on this machine now:** `chromium-1208` is a partial install, a single DLL plus a leftover `__dirlock`, and the headless shell is missing. Use `PLAYWRIGHT_EXECUTABLE_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"`.
- **Untracked, not ours:** `false` at the repo root, `luyra-web/`, the owner's change in `apps/web/lib/api/finance-client.ts`, and `test-results/playwright/.last-run.json`. Left unstaged.
- **Still open from the reminder work:** `20261105121000_fix_reminder_reconcile_alias.sql` is not applied yet.

## Current focus

1. Owner: review slice 1 and the audit, then decide on the Tasks-as-default landing question.
2. Next: slice 3 (one primary action per Planner tab, drop the "View all" links that duplicate tabs, remove the create page's `PageHero` and extra `h1`s).
3. Then slices 4–10 in order: primary action per tab, task composer, goals list, goal detail header/body, create flow, calendar/inbox, dialog width + full responsive sweep.
4. Finance redesign follow-ups (phases D–F and the "Keep Luyra's look" wording): see the top `HANDOFF_HISTORY.md` entry.
5. Carried over: apply the reminder migration; second-brain T2–T7; MCP auth decision.

## 2026-11-05 - Finance redesign (phases A–C) handoff snapshot

# HANDOFF

## Snapshot

- **Updated:** 2026-11-05.
- **Checkout:** worktree `E:\Fullstack\h-space-finance-redesign`, branch `feat/finance-redesign`, cut from `origin/main` at `cd6fd41` (PR #88 merged). **Uncommitted; nothing pushed.** UI only: no migration, API, type, validation, calculation, auth or deployment change. The main checkout (`fix/iphone-responsive-pass`, with the owner's uncommitted iPhone work) was not touched.
- **Finance redesign, phases A–C** (full write-up: `apps/web/docs/finance-redesign.md`).
  - **Audit** of all eight Finance screens with file:line references, and a plan for phases D–F.
  - **Foundation:**
    - `app/(main)/finance/luyra-theme.css` keeps only Finance's money colours (income green, watch amber, chart palette). Finance now inherits H-Space's surfaces, violet accent, radius and 16px body; before, it overrode them with Luyra's zinc palette and a 14px base.
    - Finance primitives: 18/14px section type, neutral metric tiles (no tinted chips or coloured borders), sans tabular amounts, and `AmountText` wraps huge amounts between digit groups.
    - The base `Button` is 44px on touch at any width.
    - `FinanceNav` is now underline tabs: Overview · Transactions · Budgets · More below 1280px, all eight from 1280px. More takes the open page's name.
    - The floating Add is a round + above the AI launcher on phones, and a labelled "Add transaction" pill from 768px.
  - **Overview:** `finance-overview.tsx` went from 1,047 lines to an orchestrator over `components/finance/overview/*`: cash-flow summary, budget and spending, recent activity, needs attention, insights. Display helpers are in `lib/finance/overview-display.ts`. Every metric stays. Five KPI tiles plus about eight more cards became one summary and a few grouped surfaces. At 375px the page went from 4,871px to about 3,450px tall.
- **Tests:** new `lib/finance/overview-display.test.ts`, `components/finance/finance-nav.test.tsx`, and `tests/e2e/finance-overview.e2e.ts`. The e2e uses synthetic data only. It covers overflow at 7 widths with typical and extreme data, dark mode, nav keyboard behaviour, long More labels, and the Add button against the AI launcher.
- **Verification (in the worktree):**
  - `pnpm lint`: 0 errors; the 5 warnings are pre-existing and not in Finance.
  - `pnpm test:web`: 173 files, 1,944 tests passed.
  - `pnpm build:web`: passed (synthetic `NEXT_PUBLIC_SUPABASE_*` values plus `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`).
  - `finance-overview.e2e.ts`: 9/9 passed.
  - `UI_SWEEP` over all 8 Finance routes at 320/375/768/1024/1440: no overflow.
  - Screenshots are in `apps/web/test-results/ui-sweep/finance-before|finance-after/` and `apps/web/test-results/finance-redesign/` (gitignored).
- **Local run notes:** the Playwright Chromium folder (`ms-playwright/chromium-1208`) was half-installed with a lock held, so e2e ran on system Chrome (`PLAYWRIGHT_EXECUTABLE_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"`). The worktree dev server ran on :3217 with synthetic Supabase env values; port 3200 was taken.
- **Doc conflict to resolve:** root `AGENTS.md` §Product domains 4 says "Keep Luyra's look", and `docs/LUYRA_MIGRATION.md:4` says "keeping Luyra's look". This redesign deliberately moves Finance onto H-Space's design system, at the owner's request. Left unedited for the owner to reword.
- **Still open from earlier:** `20261105121000_fix_reminder_reconcile_alias.sql` is not applied yet (see history).

## Current focus

0. Owner: review `feat/finance-redesign` (screenshots above, or run it). Then decide whether to commit and open a PR, and update the "Keep Luyra's look" wording.
1. Phase D: Transactions. Start with the duplicate Add on phones (toolbar + floating + next to the AI launcher), then flat day groups, two-line rows, one search/filter control, and progressive disclosure in the sheet.
2. Phase E: Budgets, Savings, Subscriptions as rows; Review as a narrative; Analytics de-duplicated; Settings grouped (plan in `apps/web/docs/finance-redesign.md`).
3. Carried over: apply the reminder reconcile fix and confirm `kori-reminder-delivery-check`; reminder follow-ups; second-brain T2–T7; the MCP auth decision.

## 2026-11-05 - Loading skeletons and tab-row wrapping handoff snapshot

# HANDOFF

## Snapshot

- **Updated:** 2026-11-05.
- **Checkout:** `fix/recovery-loading-skeletons`, cut from `origin/main` at `4692635` (Finance quick-add PR #86 merged). Uncommitted; nothing pushed. No migration, API or data change.
- **Loading-state audit:** every page under `app/(main)` was checked for what it shows while fetching. Most already render `components/ui/skeleton.tsx` (shimmer) or, in Finance, Luyra's own `bg-secondary animate-pulse` blocks (kept on purpose to preserve Luyra's look). Route-level `loading.tsx` files are deliberately not being added: nearly every page is a client component that fetches on mount, so `loading.tsx` wouldn't cover that wait.
- **Fixed:** six recovery pages (`growth/recovery/{insights,review,plan,check-in,debrief,settings}`) returned `null` while loading, showing a blank screen. They now render the new `components/recovery/RecoveryPageSkeleton.tsx` (`role="status"`, `aria-busy`, width matches each page, optional header block). `components/reminders/ReminderButton.tsx` now holds its icon-button footprint while loading (only when `allowCreate`, since otherwise it usually stays hidden) so neighbouring actions don't shift.
- **Finance tab bar:** `components/finance/finance-nav.tsx` no longer scrolls sideways (it used `overflow-x-auto` + `min-w-max` from `sm` up, which scrolled wherever the content was under ~750px). It's now a container-query layout in the same position: 2 → 3 → 4 columns (two even rows) and a single row once the bar is ≥ 50rem. Checked in Chrome by narrowing the Finance column from 320px to 952px: no overflow and no clipped labels at any width.
- **Workspace tab rows:** `WorkspaceTabs`, `GoalDetailNav` and `ReviewTabs` also stopped scrolling sideways. They now `flex-wrap`, with `px-2` on phones (`sm:px-3` up), in the same position and style. Measured in Chrome (phone simulated at 16px root, 343/398px): Planner fits one row even at 375px (it used to scroll); Learning wraps 3+3 at 375px and 4+2 at 430px (it scrolled on every phone); Growth, Notes and My Apps stay one row. At ~650px tablet width Learning's last tab ("Listening") wraps alone. `docs/design-system.md` now says nav tab rows wrap and never scroll.
- **Tests:** new `RecoveryPageSkeleton.test.tsx`; two loading-state cases added to `ReminderButton.test.tsx`.
- **Verification:** `pnpm test:web` passed (170 files, 1,915 tests); `pnpm build:web` passed (with `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`); `tsc --noEmit` clean; ESLint and Prettier clean on the changed files. Not run: a browser check at 375/768/1024/1440px (the loading state needs a signed-in session plus a throttled network to see).
- **Untracked, not ours:** an empty file named `false` at the repo root and `luyra-web/`; an owner's one-line change in `apps/web/lib/api/finance-client.ts` carried over from the previous checkout. Left untouched and unstaged.
- **Still open from the reminder work (see history):** `20261105121000_fix_reminder_reconcile_alias.sql` is **not applied yet**. Until it is, reminders send but their delivery rows stay `pending`.

## Current focus

0. Owner: review the skeleton change (throttle the network in DevTools and open `/growth/recovery/review`), then commit on this branch and open a PR.
1. Apply `20261105121000_fix_reminder_reconcile_alias.sql`, then confirm `kori-reminder-delivery-check` succeeds in `cron.job_run_details`.
2. Owner: create a reminder a few minutes ahead and check `kori_reminder_deliveries` and the Reminders page.
3. Carried over: reminder follow-ups (no retry, "Open KoriAI" Telegram label, Edge Function source not in the repo), second-brain slices T2–T7, and the MCP auth decision before T10–T13.

## 2026-11-05 - Reminder delivery tracking handoff snapshot

# HANDOFF

## Snapshot

- **Updated:** 2026-11-05.
- **Checkout:** `fix/reminder-delivery-tracking`, cut from `origin/main` at `2c6c37a` (PR #84 merged). Committed and pushed for a PR at the owner's request.
- **Notification audit:** three separate systems, none connected. (1) The header bell only shows shared-goal events from Orbit's `notifications` table (polled every 60s). (2) Universal reminders: `kori_reminders` → `pg_cron` `kori_dispatch_reminders` → Telegram + Web Push (`kori-send-push` Edge Function). (3) Finance alerts: Vercel crons in `app/api/finance/cron/*` → Telegram (+ push only from Neon subscriptions, which only Luyra can create).
- **Reminder delivery tracking — applied to the live Supabase database 2026-11-05 with owner approval** (`apps/web/supabase/migrations/20261105120000_reminder_delivery_tracking.sql`). Before applying, the live `kori_dispatch_reminders` / `kori_dispatch_push` were compared with the repo and matched. New `kori_reminder_deliveries` table (owner-readable under RLS), `kori_send_reminder` (the reminder loop's new sender) and `kori_reconcile_reminder_deliveries` (new per-minute job `kori-reminder-delivery-check`, reads `net._http_response`). The outcome goes into `kori_reminders.last_error`, which the Reminders page already shows. `kori_dispatch_push` is unchanged for the holiday, weather and streak alerts. Execute is revoked from `anon`/`authenticated` on all three functions (verified).
- **iPhone push:** none of the 2 live push subscriptions is from an iPhone (both `fcm.googleapis.com`, from July). iOS only exposes Web Push to a Home Screen web app, and Settings used to just say "Not supported in this browser". It now detects an iPhone/iPad Safari tab (`lib/push-environment.ts`, tested) and tells the owner to Add to Home Screen first.
- **Code:** the reminder dialog uses the device timezone (`getDeviceTimeZone` in `lib/reminders.ts`, falling back to Seoul) instead of always Seoul. The service worker and the test push/Telegram titles say "H-Space" instead of "KoriAI".
- **Verification:** `vitest run` passed (168 files, 1,904 tests); `tsc --noEmit` clean; ESLint and Prettier clean on the changed files. Not run: `pnpm build:web`, a browser check. **No end-to-end delivery observed yet**: there were 0 active reminders when the migration went in, so the new path hasn't handled a real send.
- **Untracked, not ours:** an empty file named `false` at the repo root and `luyra-web/`. Left untouched.

- **⚠ Follow-up fix NOT applied yet:** the first apply left `kori_reconcile_reminder_deliveries` failing every minute (`column reference "d.reminder_id" is ambiguous`: a SQL alias clashed with the loop variable `d`). The corrected function is in `apps/web/supabase/migrations/20261105121000_fix_reminder_reconcile_alias.sql`; applying it was blocked by the agent permission check and needs the owner. Until it's applied, reminders still **send** normally, but their delivery rows stay `pending` and no outcome reaches the Reminders page.

## Current focus

0. Apply `20261105121000_fix_reminder_reconcile_alias.sql`, then confirm `kori-reminder-delivery-check` succeeds in `cron.job_run_details`.
1. Owner: create a reminder a few minutes ahead (Settings → Reminders), then check `kori_reminder_deliveries` for its rows and the Reminders page for any "Not delivered — …" message.
2. Open follow-ups: no retry for failed deliveries; the Telegram button on holiday/weather/streak alerts still says "Open KoriAI" (in `kori_dispatch_push`); `kori-send-push` / `kori-send-telegram` source isn't in this repo; the unused finance browser-push path can go once Luyra is retired; reminders aren't shown in the bell.
3. Carried over: second-brain slices T2–T7 (`docs/SECOND_BRAIN_ARCHITECTURE.md`), and the MCP auth decision before T10–T13.

## 2026-11-04 - Second-brain foundations handoff snapshot

# HANDOFF

## Snapshot

- **Updated:** 2026-11-04.
- **Checkout:** `feat/second-brain-foundations`, cut from `origin/main` at `764d29f` (typography PR #82 and the Finance PRs #77–#81 already merged). It holds slices T1 and T6 plus the audit doc, committed and pushed for a PR at the owner's request. No migration or h-space-api change was made.
- **Second-brain audit + plan:** `docs/SECOND_BRAIN_ARCHITECTURE.md` covers both repos: as-is inventory, target architecture (one owner per domain, shared context providers, propose → approve → execute), roadmap, gap analysis, Smart Capture / Daily Focus / Weekly Review designs, security design, and tasks T1–T13.
- **Slice T1 shipped (uncommitted):** Morning Brief and Weekly Review now flag goals by **live** health (`computeListGoalHealth`, most severe first) instead of the never-written `goals.health_status` column, which made both reviews always report that no goal needed attention. The review AI route now sends its context inside a neutralised `<user_data>` block (new `apps/web/lib/server/user-data.ts`). Files: `apps/web/lib/review.ts`, `lib/review.test.ts`, `lib/server/user-data.ts` (+ test), `app/api/ai/review/summarize/route.ts` (+ first AI-route test), `apps/web/docs/second-brain-implementation.md`, `docs/SECOND_BRAIN_ARCHITECTURE.md`.
- **Slice T6 shipped (uncommitted):** the MCP server's `initialize` instructions are now built per connection (`buildServerInstructions(surfaceFor(ctx))` in `apps/web/lib/mcp/server.ts`) from `READ_TOOL_NAMES`/`WRITE_TOOL_NAMES` (`lib/mcp/tools/index.ts`). They used to say only `get_hengo_server_info` existed. `lib/mcp/server.test.ts` fails if the instructions and `tools/list` ever disagree. Stale comments fixed in `app/mcp/route.ts` and the consent page; `apps/web/docs/chatgpt-mcp-integration.md` now flags that MCP is unreachable since sign-in moved to h-space-api.
- **Verification (T1):** `pnpm test:web` passed (166 files, 1,880 tests); `pnpm build:web` passed (with `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`); `pnpm lint:web` showed 0 errors and 5 pre-existing warnings; `tsc --noEmit` was clean. No browser check of `/review/*` was run.
- **Untracked, not ours:** an empty file named `false` at the repo root (created 17:48) and `luyra-web/`. Left untouched.

## Current focus

1. Owner review of `docs/SECOND_BRAIN_ARCHITECTURE.md`, then commit T1 on a feature branch.
2. Next small slices, no migrations needed: T2 (Daily Focus), T3 (inbox conversion hardening), T4/T5 (Smart Capture), T7 (Ask Hengo `userDataBlock` + retrieval tests).
3. Owner decision needed before T10–T13: how MCP authenticates now that sign-in is h-space-api (`/mcp` is unreachable end to end — §4.1 of the doc), and the inbox cutover.

## 2026-11-04 - Typography handoff snapshot

# HANDOFF

## Snapshot

- **Updated:** 2026-11-04.
- **Checkout:** `feat/finance-telegram-push` at `b97e468` (same HEAD as `origin/feat/finance-alert-jobs`; this local branch has no upstream configured). Typography work is uncommitted; no commit, push, or deploy was made.
- **Typography:** Added the global Inter / Pretendard Variable / Noto Sans Khmer font stack; licensed Pretendard variable Unicode subsets are served locally. Added shared size, weight, and line-height tokens and replaced undersized readable text across app routes and components.
- **Responsive review:** Synthetic UI sweep passed 13 representative routes in light mode and 7 routes in dark mode at 320, 375, 390, 430, 768, 1024, and 1440 px, with no horizontal overflow or readable text below 13px. Production screenshots: `apps/web/test-results/ui-sweep/typography-production-2026-11-04/` and `apps/web/test-results/ui-sweep/typography-dark-2026-11-04-dark/` (ignored).
- **Verification:** `pnpm test:web` passed (1,860 tests); `pnpm build:web` passed with `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1` (163 static pages generated). `pnpm lint:web` remains blocked by two hook-rule errors in the pre-existing untracked Finance Telegram route; five existing warnings also remain.
- **Uncommitted work preserved:** Existing Finance settings, report/export/email/Telegram and navigation changes plus untracked `luyra-web/`. Do not stage or discard unrelated work.

## Current focus

1. Review the Finance work on the current branch and preserve all concurrent edits.
2. Keep Finance data in Neon and the independently deployable Luyra configuration unchanged.
3. No live data, deployment configuration, or Git remote was changed during this typography task.


## 2026-11-04 - Pre-typography handoff snapshot

# HANDOFF

## Snapshot

- **Updated:** 2026-11-04.
- **Checkout:** feat/finance-settings at a820e7b, tracking origin/feat/finance-review. No commit or push was made during this navigation update.
- **Navigation:** Finance is a global sidebar destination and remains the fourth mobile bottom-bar tab. My Apps was removed from the global workspace sidebar and added as a Settings destination. Finance's seven local page tabs remain intact.
- **Verification:** 116 navigation tests passed; pnpm build passed; Prettier passed for changed navigation files. Settings and Finance passed the synthetic UI route sweep at 430, 1024, and 1440 px with no horizontal overflow. Screenshots: apps/web/test-results/ui-sweep/finance-settings-sidebar-move/.
- **Uncommitted work preserved:** Finance settings, categories/payment method API, reports, export, email, Telegram, analytics, and navigation changes plus untracked luyra-web/. Do not stage or discard unrelated work.

## Current focus

1. Review the Finance settings/report/export work in the current worktree.
2. Preserve Finance's Neon data ownership and the independent Luyra deployment configuration.
3. Keep untracked luyra-web/ until its purpose is confirmed.


## 2026-11-04 - Finance and My Apps navigation move

# HANDOFF

## Snapshot

- **Updated:** 2026-11-04.
- **Checkout:** feat/finance-settings at a820e7b, tracking origin/feat/finance-review. HEAD includes the Luyra monthly review slice and the Finance tab layout update. No Git commit was made by the agent during this responsive review.
- **Finance tabs:** all seven destinations (Overview, Transactions, Budgets, Savings, Subscriptions, Review, Analytics) display in a 2- or 3-column grid on phones and a single row on wider screens. Every destination stays visible without horizontal scrolling.
- **Verification:** pnpm build passed; the synthetic Finance route sweep passed 7/7 pages at 320, 375, 390, 430, 768, 1024, and 1440 px with no horizontal overflow. Prettier passed for finance-nav.tsx. Screenshots are in ignored apps/web/test-results/ui-sweep/finance-tabs-grid/.
- **Review note:** the sweep used synthetic fixtures, not a real account. Existing small secondary labels remain reported by the sweep.
- **Uncommitted work preserved:** Settings Finance shortcut, analytics amount wrapping fix, navigation test updates, additional Finance settings/report/export and Telegram work, and untracked luyra-web/. Do not stage or discard these items.

## Current focus

1. Review the Finance monthly review slice on the current branch.
2. Preserve Finance's Neon data ownership and the independent Luyra deployment configuration.
3. Keep luyra-web/ until its purpose is confirmed.


## 2026-11-04 - Finance tabs responsive review

# HANDOFF

## Snapshot

- **Updated:** 2026-11-04.
- **Checkout:** feat/finance-subscriptions at 183057f (subscription and merchant-name port). The pre-existing untracked luyra-web/ directory is preserved. No commit, push, or deploy was made for this navigation work.
- **Finance navigation:** removed the standalone Finance row from the desktop sidebar and the Finance tab from My Apps workspace tabs. Added a Finance link on Settings. The fourth mobile bottom-bar slot now opens Finance; My Apps is available from More.
- **Mobile layout fix:** analytics category rows keep KRW totals on one line and truncate long category names.
- **Verification:** navigation tests 115/115 passed; pnpm build passed. Synthetic Finance route sweep passed for Overview, Transactions, Budgets, Savings, Subscriptions, and Analytics at 320, 375, 390, 430, 768, 1024, and 1440 px (6/6). After the analytics row fix, Analytics passed again at all seven widths. The Settings Finance entry passed at 320 and 430 px. Screenshots are in ignored apps/web/test-results/ui-sweep/finance-navigation-fix/, apps/web/test-results/ui-sweep/finance-analytics-overflow-fix/, and apps/web/test-results/ui-sweep/finance-settings-entry/.
- **Review note:** the sweep reported existing 11px secondary labels on Overview, Transactions, Savings, and Analytics. It found no horizontal overflow. The review used synthetic fixtures, not a real finance account.

## Current focus

1. Owner reviews the finance-subscriptions branch work and confirms navigation placement on their account.
2. Continue preserving Finance's Neon data ownership and independent Luyra deployment configuration; no live data or deployment settings were changed here.
3. Preserve the local untracked luyra-web/ directory until its purpose is confirmed.


## 2026-11-04 - Finance navigation and mobile review

# HANDOFF

## Snapshot

- **Updated:** 2026-11-04.
- **Merged:** PR #75, finance foundation plus savings, into `main` at `67d66ecfa6f53e82b1fa9fa7cb5814e251e9499a`. Verified on GitHub and by fetching `origin/main` and checking ancestry.
- **PR #74:** closed/marked merged by GitHub because its branch commits were included through #75. No open PRs remained at the final check. Branches were retained.
- **Review fix commit:** `2472ebeebee174cefc78d832d76a79815da9d4d9`, pushed to `feat/finance-savings` before merging.
  - Every finance query key includes the H-Space user ID; options are constructed at call time. Anonymous queries are disabled. Invalidation is account-scoped.
  - FinanceSessionBoundary remounts finance forms on account changes and hides them on sign-out. The finance HTTP client rejects account changes while acquiring credentials or awaiting responses. Late transaction saves cannot fill another account's cache.
  - Savings contribution insertion and balance increment run in one Neon HTTP transaction. The insert selects and locks the owned goal; absent/foreign goals return 404.
  - Formatted imported finance files to repository conventions. Verified 125 touched files were formatting-only; semantic edits were limited to the review fixes and their tests.
- **Verification:** latest-head Web CI succeeded (Lint & Format, Test, Build Verification, Quality Gate); 1790 tests passed in CI. Vercel preview passed. Local lint/build/format checks passed; lint has 5 existing warnings. Both review threads resolved; no unresolved threads at merge time.
- **Browser:** synthetic overview, transactions and savings at 430px/1440px all passed overflow checks against the local production build. Existing 11px labels were reported. Screenshot artifacts: `apps/web/test-results/ui-sweep/pr75-review-fixes/` (ignored). Temporary preview server on 3115 was stopped.
- **Not verified:** production rollout, real-account finance rendering, real cron execution, or live database rollback. No production env/deployment changes and no live SQL were performed in this task. PR #75 retains the owner's production configuration checklist (`FINANCE_DATABASE_URL`, `FINANCE_ACCOUNT_LINKS`, `CRON_SECRET`, Luyra cron off).
- **Checkout:** retained `feat/finance-savings` at the merged fix head. Existing untracked `luyra-web/` was preserved. This HANDOFF/history rotation is local and uncommitted.

## Current focus

1. Owner checks production configuration and real-account Finance behavior. See `docs/LUYRA_MIGRATION.md` and PR #75 for cutover/rollback boundaries; independent Luyra remains the fallback.
2. Preserve the earlier exam-script reseed follow-up and UI redesign Phases 5/6 work described in the archived snapshot at the top of `HANDOFF_HISTORY.md`.
3. Rollback is a reviewed revert of merge `67d66ec`; no schema migration was introduced by these review fixes. A code revert does not undo any later financial writes.


## 2026-11-04 - Before PR 75 review fixes and merge

# HANDOFF

## Snapshot

- **Updated:** 2026-11-04
- **On `main` and in production:** UI redesign Phases 1–4 (#64–#67), PR #72 (iPhone 15 typography audit), and PR #71 (full 제6회 interview script). The previous snapshot is the top entry of `HANDOFF_HISTORY.md`.
- **Exam Prep script (#71):**
  - `lib/interview.ts` seeds the full 2026-09-30 Notion script ("한국에 온 후 새로 생긴 습관/취미") and adds a first outline section, `self-intro` (자기소개). `opening` is now only the topic intro.
  - The home station is kept out of the public seed on purpose (`lib/interview-content.test.ts` checks this).
  - Migration `20261104120000_reseed_habits_full_script` was **applied to the live database** on 2026-11-04, after production had deployed #71. Each `weather` draft was first saved as the version "Before full-script reseed (2026-11-04)"; then only the outline keys were cleared, so `/interview/script` refills them from the seed. Roll back from the page's Versions list.
  - Not verified: the owner's real account after the reseed (an agent can't read the live table). Open `/interview/script` and confirm 자기소개 comes first.
- **In review:** branch `chore/remove-google-calendar` holds the work that was left uncommitted after #72 merged, with `main` merged in:
  - Google Calendar integration removed: routes, callback and settings pages, hooks, `lib/server/google-calendar-*`, `UpcomingEventsCard` and `CalendarSourceFilter`. The `kori_google_calendar_integrations` table stays in the database.
  - The mobile glass fallback under reduced transparency (bottom nav and the Exam Prep section-jump menu), with `interview-audit.e2e.ts` checks.
  - Calendar/task UI tweaks, `apps/web/scripts/ui-sweep-report.mjs`, and AGENTS/security-rule updates.
  - Merge conflicts (HANDOFF files, `roadmap/page.tsx`, `ChatWindow.tsx`) were resolved to `main`'s side; those were typography and contrast lines `main` had already reviewed.
  - `interview-script-repeat.e2e.ts` now saves the `self-intro` section, the new first section, instead of `opening`.
- **Verification (this branch):** `tsc --noEmit` clean; unit tests 141 files / 1643 pass; `interview-script-repeat.e2e.ts` 3/3 pass against `next dev` on :3000.
  - Not run: the full e2e suite. An earlier session saw the calendar sticky-shell test expect `overflow: hidden/hidden` while Chrome computes `clip/hidden`; it was left unchanged.
- **Tracked test artifact:** `apps/web/test-results/playwright/.last-run.json` changes on every e2e run. Don't stage it.

## Current focus

1. The owner reviews and merges the `chore/remove-google-calendar` PR.
2. The owner checks `/interview/script` on production after the reseed.
3. Then **Phase 5** of the UI redesign: Learning, AI, Notes and Growth. The plan is in the history entry above and in the "Phase 5" section of `apps/web/docs/ui-redesign-audit.md`.

## Running the sweep

The command is in `apps/web/docs/design-system.md` §8. Use `UI_SWEEP_ROUTES=goals/overview,inbox` without a leading slash. A git worktree has no `.env.local`, so run its dev server with dummy local values for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_AUTH_API_URL`; the sweep mocks everything else.


## 2026-11-04 - UI redesign Phases 1-4 on main

# HANDOFF

## Snapshot

- **Updated:** 2026-11-04
- **Shipped:** UI/UX redesign **Phases 1–4** of six are on `main`.
  - #64: foundation and app shell.
  - #65: Home and the Planner.
  - #66: Phase 3b, the Planner leftovers.
  - #67: Phase 4, My Apps, Settings and the H-Vault layout.
  - Also on `main`: #59, Exam Prep voice polish.
  - Production comes from Vercel's normal `main` build; no agent deploy. The production build for `1bba2d7` was **not confirmed** from the agent side (deployment status lookup is denied), so check the Vercel dashboard.
- **Phase 3b** (#66):
  - `/goals/overview` uses `DashboardCard` with inline errors (`useGoals().isError`). The roadmap entry moved to the Learning Library (`RoadmapLibraryItem`, `lib/roadmap-progress.ts`).
  - Goal-detail tabs use the underline style. The task table has 6 columns below 1280px. Rows on phones and in Plan are divider rows.
  - Inbox has divider rows, a `⋯` menu and a retry on errors (`useInbox().refetch`).
  - `--destructive-foreground` is defined.
  - `lib/goals.test.ts` now builds "today" in local time, so it no longer fails before 09:00 KST.
- **Phase 4** (#67):
  - My Apps targets are 44px on touch.
  - Settings groups are flat surfaces with real `h2`s, and one "Preferences & security" `RowList` of links. The two rows that opened Korean Coach preferences are merged into one.
  - Settings subpages demote their title to `h2`. Reminders are divider rows.
  - **H-Vault layout only:** the hero, shadows and nested boxes are gone, and `/vault` no longer overflows at 320px. Radix `Select.Value` drops `className`, so truncate from the trigger with `[&>[data-slot=select-value]]:truncate`. No change to `lib/vault-*`, `hooks/useVault`, `lib/api/vault` or `lib/csp.ts`.
- **Verification:**
  - Full unit suite: 1655/1655 on the Phase 4 branch.
  - Sweeps of every changed route at 320–1440px with no overflow.
  - Synthetic session and data only; the vault was in demo mode with fictional accounts.
  - **Not verified:** real-account states, the unlocked live vault and its dialogs, the MFA flow end to end, and touch tablets on a real device.
- **Docs:** status for each phase is in `apps/web/docs/ui-redesign-audit.md` ("Phase 3b status", and under the Phase 4 plan). The rules are in `apps/web/docs/design-system.md`.
- **Gotchas:**
  - `next dev` can miss a `globals.css` change; restart it before trusting screenshots.
  - On Windows, stopping a background `npx next dev` can leave the Next server process running on its port. Kill it by PID before starting another, or a sweep silently measures the old code.
  - This machine runs low on memory with two dev servers plus Playwright; a dev server can crash with "memory allocation … failed".
- **Open PRs:** this HANDOFF update.

## Next steps

1. The owner checks Phases 1–4 on production, especially what the sweep couldn't cover: real goals and tasks, deleting an Inbox item from the `⋯` menu, the roadmap row in Learning → Library, the merged Settings row, and the vault both unlocked and at phone width.
2. Then **Phase 5**: Learning, AI, Notes and Growth.
   - The chat composer needs a 16px input and 44px controls.
   - Fix the `/chat` mode-switcher overflow, `/interview/script`, `/history` labels, `LogFlow`, the `RecoveryOverview` badge and `CheckinCalendar` targets.
   - One tab level per page (`/vocab`, `/phrasebook`).
   - Remove the hero `h1`s on Korean Coach, Recovery, Review and practice/today.
   - Plan in the audit's "Phase 5" section.
3. **Phase 6:** a consistency pass, dark mode, a keyboard pass, and deleting dead components.

## Running the sweep

The command is in `apps/web/docs/design-system.md` §8. Use `UI_SWEEP_ROUTES=goals/overview,inbox` without a leading slash. A git worktree has no `.env.local`, so run its dev server with dummy local values for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_AUTH_API_URL`; the sweep mocks everything else.

## 2026-11-04 - UI redesign Phase 3b in review (PR #66)

# HANDOFF

## Snapshot

- **Updated:** 2026-11-04
- **Shipped:** UI/UX redesign Phases 1–3 (PRs #64, #65) are on `main`.
- **In review:** **Phase 3b** (Planner leftovers), branch `ui/redesign-phase3b`, worked in the git worktree `E:\Fullstack\h-space-phase3b`. Status and details are in `apps/web/docs/ui-redesign-audit.md` → "Phase 3b status".
  - `/goals/overview`: every card uses `DashboardCard`, has inline error states (`useGoals` exposes `isError`), and the duplicate deadline banner is gone. The roadmap entry moved to the Learning hub's Library (`RoadmapLibraryItem`, `lib/roadmap-progress.ts`); `RoadmapTeaser` is deleted.
  - Goal detail: underline tabs like `WorkspaceTabs`. The task table has 6 columns below 1280px, and phase, key result and impact appear from `xl`. Phone and Plan rows are divider rows with one metadata line. There are no bordered rows inside cards in Plan, Progress or Schedule, and their text uses the 13px floor. `KeyResultsCard` is flattened.
  - Month view: the "add" button is visible on touch. `/goals/create`: template and custom cards are real links with nothing interactive inside.
  - Inbox: divider rows on one surface, one metadata line, Convert + reminder + `⋯` (pin, archive, delete). The error state has "Try again" (`useInbox` exposes `refetch`).
  - `--destructive-foreground` is defined, so delete-confirm buttons get readable text in both themes.
- **Verification (Phase 3b):**
  - Type-check passes and lint is clean on the changed files.
  - Unit tests: 1647/1648. The failure was `lib/goals.test.ts` "Due today" (UTC "today", fails 00:00–09:00 KST).
  - Sweep: 9 changed routes × 320/390/768/1024/1440 with no overflow, against a worktree dev server with dummy local env.
  - **Not verified:** real-account data, the Inbox delete-confirm opened from the new menu, and touch tablets on a real device.
- **Open PRs:** #59 (Exam Prep voice polish) and the Phase 3b PR.

## Current focus

1. The owner reviews and merges the Phase 3b PR.
2. Then **Phase 4**: My Apps, Vault (layout only) and Settings.
3. Small follow-up: make `lib/goals.test.ts` build "today" in local time.

## 2026-11-03 - UI redesign Phases 1–3 shipped (PRs #64, #65)

# HANDOFF

## Snapshot

- **Updated:** 2026-11-03
- **Shipping:** UI/UX redesign **Phases 1–3** of six, going to `main` for the owner's production test:
  - PR #64 (`ui/redesign-foundation`): design foundation and app shell.
  - The Phase 3 PR (`ui/redesign-phase3-planner`, stacked on #64): Home, Goals, Tasks and Calendar.
  - The owner asked for the merge to test on production. The deploy is Vercel's normal `main` build; no agent deploy.
- **Docs:** the plan, route audit, sweep logs and Phase 3 status are in `apps/web/docs/ui-redesign-audit.md`; the rules are in `apps/web/docs/design-system.md`.
- **Phase 3 changes:**
  - **Home:** the day's work comes first. The snapshot and the "Your daily space" strip are kept but moved below it, at the owner's choice. A shared `DashboardCard` frame replaces six card styles.
  - **Goals list:** fits at 320px, with one control row (the toggle moved into the sort row, owner's choice). Rows are real links with two-line titles.
  - **Tasks tab:** actions are an always-visible `⋯` menu (they were invisible on touch). Inputs are 16px, options are folded behind "More options", and there's an error state.
  - **Calendar:** the all-day overflow at 320–430px is fixed, the type floor is applied, and touch targets meet 44px.
  - **Goal detail:** the sticky bar sits above the bottom nav.
  - **`HealthBadge`:** a dot plus label.
- **Verification (Phase 3 branch):**
  - `pnpm lint`: 0 errors and 5 warnings in untouched files. `pnpm test`: 1648/1648, with 10 new tests for `GoalList` and `TodayTasksCard`. Type-check passes.
  - `shell-sticky.e2e.ts`: 11/11.
  - Sweep with the owner's tightened check and a fresh dev server: no new overflow anywhere. The 7 remaining offenders are the Phase 4–5 baseline pages.
  - Synthetic session and data only. Real-account states, dialogs and the unlocked H-Vault have **not** been visually verified.
- **Gotcha:** `next dev` can miss a `globals.css` change, for example after a `git stash pop`. If a token change doesn't show, restart the dev server before trusting screenshots. The Phase 1 + 2 after-sweep ran on stale CSS for that reason.
- **Open PR:** #59, whose latest reported Lint & Format check failed.

## Current focus

1. The owner tests Phases 1–3 on production.
2. **Phase 3b** remains: `/goals/overview`, goal-detail tabs and `GoalTaskRow` density, nested cards and the 9-column task table, Inbox cards, the month view's hover-only add button, nested interactive template cards.
3. Then **Phase 4**: My Apps, Vault (layout only) and Settings.

## 2026-11-03 - UI redesign Phase 1 + 2 (PR #64)

# HANDOFF

## Snapshot

- **Updated:** 2026-11-03
- **Branch:** `ui/redesign-foundation` (from `main` at `a19982a`). It has one local commit, which hasn't been pushed and has no PR yet.
- **Work:** UI/UX redesign, **Phase 1 (design foundation) and Phase 2 (app shell)** of six. The plan, the route-by-route audit (P0/P1/P2) and the before/after sweep results are in `apps/web/docs/ui-redesign-audit.md`. The rules are in `apps/web/docs/design-system.md`.
- **Phase 1 changes:**
  - `text-xs` is now a 13px floor, and `.app-surface-muted` is added.
  - `Card`, `Button`, `Input`, `Textarea` and `Select` no longer have drop shadows.
  - `PageHero` defaults to an `h2` with no glow or box. `PageHeader` renders an `h2`.
  - New primitives: `PageSection`, `RowList`/`InteractiveRow` and `EmptyState`, with tests.
  - **P0 fixes:** `/home` and `/goals/overview` no longer overflow at 320–768px (`minmax(0,1fr)` grid tracks). The `/home` banner title is no longer dark-on-navy.
- **Phase 2 changes:**
  - Bottom-bar, rail and sidebar-group labels go from 11px to 13px. The desktop page title goes from 14px to 16px.
  - In `WorkspaceTabs` on phones, the divider sits under the tabs.
  - The theme switch moved from the mobile header into the More sheet.
  - No route, registry, matching or Quick Switcher changes.
- **Verification:**
  - `pnpm lint`: 0 errors and 5 warnings in untouched files.
  - `pnpm test`: 1637/1638 passed in the full run. `lib/recovery-security.test.ts` failed once under load and passed alone (6/6).
  - `pnpm build` passed. `shell-sticky.e2e.ts` passed 11/11.
  - The new opt-in sweep (`tests/e2e/ui-route-sweep.e2e.ts`, `UI_SWEEP=1`) covers 48 routes × 7 widths in light mode, plus 390/1440px in dark mode. It uses a synthetic session and data, and off-machine requests are aborted. Results are in the audit's sweep log.
- **Not verified:** real-account populated states, dialogs, and the unlocked H-Vault. Signed-in screens were rendered only with synthetic data.
- **Open PR:** #59 remains open; its latest reported Lint & Format check failed.

## Current focus

The owner reviews this branch, and nothing is pushed or deployed without approval. **Phase 3 is next** (Home, Goals, Tasks) on its own branch. It covers:

- the `/goals` filter overflow at 320px
- `GoalList` two-line rows
- `TodaysTasks` row actions that work on touch
- `GoalTaskRow` and `HealthBadge`
- goal detail's second h1 and the sticky bar hidden under the bottom nav
- calendar touch targets

Its scope is listed in the audit's phased plan. Running the sweep on this machine:

```bash
cd apps/web
UI_SWEEP=1 UI_SWEEP_LABEL=after PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 \
  PLAYWRIGHT_EXECUTABLE_PATH="$LOCALAPPDATA/ms-playwright/chromium-1223/chrome-win64/chrome.exe" \
  npx playwright test ui-route-sweep --workers=1
```

Use `UI_SWEEP_ROUTES=home,goals` (no leading slash, because of Git Bash path rewriting) and `UI_SWEEP_WIDTHS=320,1440` to narrow a run. `UI_SWEEP_DARK=1` switches to the dark theme.


## 2026-11-02 - Handoff after the PR #62 merge

# HANDOFF

## Snapshot

- **Updated:** 2026-11-02
- **Branch:** `main`, synchronized with `origin/main`.
- **Merged:** PR #62 (`Make position: sticky work inside the app shell`) at `8bdfb61`. It includes sticky-positioning fixes, the direct Finance sidebar link to Luyra, and section-jump spacing beneath the sticky script title. The remote and local feature branch were deleted.
- **Verification:** PR CI passed tests, ESLint, Prettier, production build, and quality gate. `git diff --check` passed before push. The public landing, login, and registration pages rendered at 430 × 932 with no horizontal overflow or browser page errors. Signed-in screens were not reviewed because no safe test session is configured.
- **Open PR:** #59 remains open; its latest reported Lint & Format check failed.

## Current focus

Review and fix the outstanding formatting issue on PR #59 before considering its merge. H-Space links to Luyra without accessing its finance data.

## 2026-11-02 - Merge PR #62: sticky positioning and Finance navigation

# HANDOFF

## Snapshot

- **Updated:** 2026-11-02
- **Branch:** `fix/shell-sticky-positioning`; PR #62 is open against `main`.
- **Changes:** the app-shell sticky-positioning fix is committed in `3afb77e`. A Finance shortcut beside My Apps is ready to commit; it opens the separately deployed Luyra app in a new tab.
- **iPhone 15 Pro Max review:** public landing, login, and registration screens rendered at 430 × 932 CSS pixels. All had zero horizontal overflow and no browser page errors. The landing page's 27 headings appeared while scrolling. Registration needs about 54 px of vertical scrolling.
- **Limits:** signed-in screens could not be reviewed because no safe test-account session is configured. One automated portrait check timed out waiting for the login page's full load event; manual DOM-ready checks rendered it. Landscape passed. No unit tests or build were run.

## Current focus

Commit the Finance sidebar change, push it to PR #62, and merge after required checks pass. PR #59 remains open with a Prettier failure. H-Space continues to link to Luyra without accessing finance data.

## 2026-11-02 - iPhone 15 Pro Max responsive review and Finance sidebar update

# HANDOFF

## Snapshot

- **Updated:** 2026-11-02
- **Branch:** `fix/shell-sticky-positioning`.
- **In progress:** shell sticky-positioning edits are present in `AppShell`, History, Goals, Interview Script, Phrasebook, and NoteView, with `tests/e2e/shell-sticky.e2e.ts` and Playwright artifacts. Keep these edits intact.
- **Navigation change:** added a standalone Finance link beside My Apps in the global desktop sidebar and tablet rail. It reuses the existing Luyra URL and opens in a new tab. Finance remains a tab within My Apps; the mobile More sheet lists it once under All Pages.
- **Verification:** no tests or build run for the navigation change.

## Current focus

Review the sidebar Finance shortcut alongside the in-progress shell sticky-positioning work. H-Space only links to the separately deployed Luyra app; finance data and functionality remain in Luyra.


## 2026-11-02 - PR cleanup before the Finance sidebar shortcut

# HANDOFF

## Snapshot

- **Updated:** 2026-11-02
- **Branch:** `main`, synchronized with `origin/main` at `b2b360e`.
- **PR audit:** #60 passed checks, was merged, and its remote/local branch was deleted. #59 and #61 remained open because Prettier failed on `ListenRepeatPractice.tsx`, `interview.ts`, and `personal-exam-prep.ts`.
- **Preserved work:** shell-sticky edits and Playwright artifacts were saved in `stash@{1}`; a subsequently written Playwright artifact was saved in `stash@{0}`.
- **Tests:** none were run during the PR cleanup.

## Current focus

The user requested a Finance shortcut in the global sidebar. H-Space links to Luyra's separately deployed app; Luyra retains finance data and functionality.
## 2026-11-01 (b) - PR cleanup: main build fix, Spring Inbox, dashboard redesign, theme reveal merged

# HANDOFF

## Snapshot

- **Updated:** 2026-11-01
- **Branch:** `feat/theme-switch-reveal` (pull request open; not merged or deployed).
- **Current changes:** Adapted the circular theme-switch reveal from `Hen-Heang/henheang` after reading its source through GitHub MCP. H-Space retains its palette and Light / Dark / System dropdown. Changes are in `apps/web/components/theme-toggle.tsx` and `apps/web/app/globals.css`.
- **Behavior:** A 480ms circular reveal starts at the theme trigger after the dropdown closes. Reduced motion, unavailable/failed View Transitions, and unchanged resolved themes use a plain swap. CSS is scoped to theme transitions; newer selections supersede pending older callbacks.
- **Verification:** Production build passed; lint passed with 5 existing warnings. TypeScript and changed-file ESLint passed. Playwright Chromium checks at 1440x1000 and 390x844 passed for animation, menu snapshot removal, persistence, System mode, reduced motion, missing/throwing API, keyboard selection, rapid choices, overflow, and page errors.

## Current focus

Review the theme-switch animation locally. No deployment or database changes were made. Previous Luyra integration/deployment context is preserved in `HANDOFF_HISTORY.md` and `docs/ECOSYSTEM-INTEGRATION.md`.

## 2026-11-01 - Portfolio theme transition adaptation

# HANDOFF

## Snapshot

- **Updated:** 2026-10-23
- **Branch:** `integrate/luyra-finance` (local; not pushed).
- **Working tree:** Luyra imported under `apps/luyra` via a full-history Git subtree commit. H-Space My Apps catalog, workspace navigation, Quick Switcher, mobile More list, and dashboard quick access link to Luyra. Both apps remain independent deployable Next.js apps; production was not changed.
- **Verification:** H-Space lint passed with 5 existing warnings; 1,344 tests passed; production build passed; responsive Playwright passed at six viewport sizes. Changed H-Space files pass Prettier, while repository `format:check` reports 8 pre-existing files. Luyra npm lint, 130 tests, and production build passed. No database or live integration tests were run.

## Current focus

Review the Luyra migration preview and deployment configuration before switching the existing Vercel project. Keep the original Luyra repository available for rollback. Details and exact steps are in `docs/ECOSYSTEM-INTEGRATION.md`.

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
