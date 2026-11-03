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
  - Unit tests: 1647/1648. The failure is `lib/goals.test.ts` "Due today": the test builds "today" from the UTC date, so it fails between 00:00 and 09:00 KST. This is pre-existing and doesn't affect CI (UTC).
  - Sweep: 9 changed routes × 320/390/768/1024/1440 with no overflow. It ran against a worktree dev server with dummy local env.
  - **Not verified:** real-account data, the Inbox delete-confirm opened from the new menu, and touch tablets on a real device.
- **Open PRs:** #59 (Exam Prep voice polish) and the Phase 3b PR.

## Current focus

1. The owner reviews and merges the Phase 3b PR.
2. Then **Phase 4**: My Apps, Vault (layout only, no crypto/session/CSP changes) and Settings.
3. Small follow-up: make `lib/goals.test.ts` build "today" in local time.

The sweep command is in `apps/web/docs/design-system.md` §8. A worktree has no `.env.local`, so run its dev server with dummy local values for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_AUTH_API_URL`; the sweep mocks everything. Use `UI_SWEEP_ROUTES=goals/overview,inbox` without a leading slash.
