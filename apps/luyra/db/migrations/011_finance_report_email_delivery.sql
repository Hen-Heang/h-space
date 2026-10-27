-- Per-channel delivery markers for the scheduled reports.
--
-- 010 added one marker per report type, written when the report was delivered.
-- That was correct while Telegram was the only scheduled channel, but it
-- cannot express "Telegram went out, email did not" -- with a single marker,
-- one channel succeeding suppresses the other's retry.
--
-- The two existing columns keep their data and become the TELEGRAM markers:
-- every value in them was written by a Telegram send, so no backfill is
-- needed and no deployed code breaks. They are deliberately not renamed --
-- a rename would break the running deployment in the window between applying
-- this migration and shipping the code that reads the new names.
--
--   weekly_report_last_sent_week        -> Telegram, Monday of the week (YYYY-MM-DD)
--   monthly_report_last_sent_month      -> Telegram, YYYY-MM
--   weekly_report_email_last_sent_week  -> email, Monday of the week (YYYY-MM-DD)
--   monthly_report_email_last_sent_month-> email, YYYY-MM

alter table finance_preferences
  add column if not exists weekly_report_email_last_sent_week text,
  add column if not exists monthly_report_email_last_sent_month text;
