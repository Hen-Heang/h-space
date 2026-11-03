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
2. **Phase 3b** remains:
   - `/goals/overview` (the unrelated roadmap card, mixed cards)
   - the goal-detail tab style and `GoalTaskRow` density
   - nested cards in the detail tabs and the 9-column task table
   - Inbox cards
   - the month view's hover-only add button
   - nested interactive template cards
3. Then **Phase 4**: My Apps, Vault (layout only) and Settings.

The sweep command is in `apps/web/docs/design-system.md` §8. Use `UI_SWEEP_ROUTES=home,goals` without a leading slash, and `UI_SWEEP_DARK=1` for the dark theme.
