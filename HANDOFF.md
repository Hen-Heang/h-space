# HANDOFF

## Snapshot

- **Updated:** 2026-11-05.
- **Checkout:** `fix/reminder-delivery-tracking`, cut from `origin/main` at `2c6c37a` (PR #84 merged). Committed and pushed for a PR at the owner's request.
- **Notification audit:** three separate systems, none connected. (1) The header bell only shows shared-goal events from Orbit's `notifications` table (polled every 60s). (2) Universal reminders: `kori_reminders` → `pg_cron` `kori_dispatch_reminders` → Telegram + Web Push (`kori-send-push` Edge Function). (3) Finance alerts: Vercel crons in `app/api/finance/cron/*` → Telegram (+ push only from Neon subscriptions, which only Luyra can create).
- **Reminder delivery tracking — applied to the live Supabase database 2026-11-05 with owner approval** (`apps/web/supabase/migrations/20261105120000_reminder_delivery_tracking.sql`). Before applying, the live `kori_dispatch_reminders` / `kori_dispatch_push` were compared with the repo and matched. New `kori_reminder_deliveries` table (owner-readable under RLS), `kori_send_reminder` (the reminder loop's new sender) and `kori_reconcile_reminder_deliveries` (new per-minute job `kori-reminder-delivery-check`, reads `net._http_response`). The outcome goes into `kori_reminders.last_error`, which the Reminders page already shows. `kori_dispatch_push` is unchanged for the holiday, weather and streak alerts. Execute is revoked from `anon`/`authenticated` on all three functions (verified).
- **Code:** the reminder dialog uses the device timezone (`getDeviceTimeZone` in `lib/reminders.ts`, falling back to Seoul) instead of always Seoul. The service worker and the test push/Telegram titles say "H-Space" instead of "KoriAI".
- **Verification:** `vitest run` passed (168 files, 1,904 tests); `tsc --noEmit` clean; ESLint and Prettier clean on the changed files. Not run: `pnpm build:web`, a browser check. **No end-to-end delivery observed yet**: there were 0 active reminders when the migration went in, so the new path hasn't handled a real send.
- **Untracked, not ours:** an empty file named `false` at the repo root and `luyra-web/`. Left untouched.

- **⚠ Follow-up fix NOT applied yet:** the first apply left `kori_reconcile_reminder_deliveries` failing every minute (`column reference "d.reminder_id" is ambiguous`: a SQL alias clashed with the loop variable `d`). The corrected function is in `apps/web/supabase/migrations/20261105121000_fix_reminder_reconcile_alias.sql`; applying it was blocked by the agent permission check and needs the owner. Until it's applied, reminders still **send** normally, but their delivery rows stay `pending` and no outcome reaches the Reminders page.

## Current focus

0. Apply `20261105121000_fix_reminder_reconcile_alias.sql`, then confirm `kori-reminder-delivery-check` succeeds in `cron.job_run_details`.
1. Owner: create a reminder a few minutes ahead (Settings → Reminders), then check `kori_reminder_deliveries` for its rows and the Reminders page for any "Not delivered — …" message.
2. Open follow-ups: no retry for failed deliveries; the Telegram button on holiday/weather/streak alerts still says "Open KoriAI" (in `kori_dispatch_push`); `kori-send-push` / `kori-send-telegram` source isn't in this repo; the unused finance browser-push path can go once Luyra is retired; reminders aren't shown in the bell.
3. Carried over: second-brain slices T2–T7 (`docs/SECOND_BRAIN_ARCHITECTURE.md`), and the MCP auth decision before T10–T13.
