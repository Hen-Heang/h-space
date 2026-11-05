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
