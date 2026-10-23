-- Financial Health (Protect -> Prepare -> Grow -> Enjoy): a configurable
-- money rule on top of existing categories and savings goals.
--
-- essential_target_pct is the only new number. Lifestyle's guideline is
-- never stored — it's always the remainder (100 - essential_target_pct -
-- target_savings_rate) — and target_savings_rate (already on this table,
-- see 004_finance.sql) stays the single source of truth for the Future
-- minimum. That keeps the money rule from ever holding three independently
-- editable percentages that could drift from summing to 100.
alter table finance_preferences
  add column if not exists essential_target_pct numeric not null default 50
    check (essential_target_pct between 0 and 100);

-- finance_categories.spending_class and finance_savings_goals.purpose
-- already exist (004_finance.sql) and need no migration — this phase is the
-- first application code to read and write them.
