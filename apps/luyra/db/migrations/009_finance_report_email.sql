-- AGENTS.md's Email phase asks for independent Weekly/Monthly email toggles.
-- 004_finance.sql only shipped a monthly-scoped toggle (monthly_report_channel_email)
-- plus a monthly-named address column (monthly_report_email) — both with zero
-- code consumers until now, same "dead migrated column" pattern as the budget
-- thresholds and monthly_review_enabled columns wired in earlier phases.
-- Renamed the address column since it's now the shared destination for both
-- report types, not monthly-only; renaming a still-unused column is safe.
alter table finance_preferences rename column monthly_report_email to finance_report_email;
alter table finance_preferences add column if not exists weekly_report_channel_email boolean not null default false;
