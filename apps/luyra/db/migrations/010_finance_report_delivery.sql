-- Scheduled report delivery needs to be idempotent per user.
--
-- The monthly-report cron runs DAILY (a user's completed month depends on the
-- clock, not on one fixed calendar day), so without a record of what has
-- already gone out it would re-send the same report every morning for the rest
-- of the month. The weekly job runs once a week and is naturally close to
-- idempotent, but a manual re-trigger or a retry after a partial failure would
-- double-send it, so it gets the same treatment.
--
-- Both are stored on finance_preferences rather than in a delivery-log table:
-- one row per user already exists there, and "the last period we sent" is the
-- only fact either job needs. A log becomes worth it when there are multiple
-- channels with independent failure states, which is not the case yet.

alter table finance_preferences
  add column if not exists weekly_report_last_sent_week text,
  add column if not exists monthly_report_last_sent_month text;

-- weekly_report_last_sent_week holds the Monday of the week that was reported
-- on, as YYYY-MM-DD. monthly_report_last_sent_month holds YYYY-MM.
