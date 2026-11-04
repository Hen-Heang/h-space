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

## Current focus

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
