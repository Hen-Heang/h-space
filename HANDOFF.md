# HANDOFF

## Snapshot

- **Updated:** 2026-11-05.
- **Checkout:** `feat/planner-ux`, cut from `fix/recovery-loading-skeletons` at `49d7c53`. That branch's skeleton, tab-wrapping and iPhone-sweep commits are underneath and are still not pushed or PR'd. Planner work is uncommitted. No migration, API or data change.
- **Planner UX audit:** `apps/web/docs/planner-ux-audit.md` covers every Planner route, dialog and sheet. It has prioritised findings with file:line references, 7 real bugs (B1–B7), a nav proposal, shared-component recommendations and a 10-slice plan.
- **Nav recommendation:** keep all five Planner tabs visible. They fit on one line from 375px, and only 320px wraps. Don't add a "More" overflow. The default landing route stays `/goals`. Making Tasks the default needs an owner decision.
- **Slice 1 (done, uncommitted):**
  - `TodaysTasks.tsx`: rows no longer repeat "Anytime" / "Overdue" under the matching group header. The word stays as sr-only text because the headers are `aria-hidden`. Scheduled-but-late tasks still show the red "Overdue · HH:MM".
  - `GoalsHubHeader.tsx` has a new `newGoalEmphasis` prop. On Tasks, New goal is an outline button, so the composer is the one primary action.
  - New test: `TodaysTasks.test.tsx` (4 cases).
- **Slice 2 (done, uncommitted):** behaviour bug fixes B1, B2, B4, B5 and B7, each with a test. Details are in audit §7.
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
4. Carried over: commit/PR the skeleton branch; apply the reminder migration; second-brain T2–T7; MCP auth decision.
