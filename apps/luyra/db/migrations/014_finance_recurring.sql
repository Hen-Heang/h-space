-- Recurring transactions: makes finance_recurring_transactions (created in
-- 004_finance.sql, never used until now) fit how Luyra stores amounts, and
-- makes applying a rule idempotent at the database level.
--
-- Safe to re-run: every step either checks first or uses `if not exists`.

-- 1. A KRW rule has no USD amount or rate, the same way a KRW row in
--    finance_transactions stores NULL for both. 004 declared amount_usd
--    `not null check (amount_usd > 0)` and exchange_rate `not null default
--    1370`, which would force a made-up USD figure onto every KRW rule.
alter table finance_recurring_transactions alter column amount_usd drop not null;
alter table finance_recurring_transactions alter column exchange_rate drop not null;
alter table finance_recurring_transactions alter column exchange_rate drop default;

do $$
declare
  con_name text;
begin
  select con.conname into con_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'finance_recurring_transactions'
    and con.contype = 'c'
    and con.conname <> 'finance_recurring_transactions_amount_usd_positive'
    and pg_get_constraintdef(con.oid) like '%amount_usd > %';

  if con_name is not null then
    execute format('alter table finance_recurring_transactions drop constraint %I', con_name);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'finance_recurring_transactions_amount_usd_positive'
  ) then
    alter table finance_recurring_transactions
      add constraint finance_recurring_transactions_amount_usd_positive
      check (amount_usd is null or amount_usd > 0);
  end if;
end $$;

-- 2. The day of the month a monthly/yearly rule is meant to land on. Without
--    it, clamping walks the date backwards for good: a rule on the 31st goes
--    Jan 31 → Feb 28 → Mar 28 → … Keeping the anchor lets it return to the
--    31st whenever the month has one.
alter table finance_recurring_transactions
  add column if not exists anchor_day smallint check (anchor_day between 1 and 31);

update finance_recurring_transactions
set anchor_day = extract(day from next_date)::smallint
where anchor_day is null;

alter table finance_recurring_transactions alter column anchor_day set not null;

-- 3. Deleting a rule keeps the transactions it already created. 004 declared
--    finance_transactions.recurring_id with no ON DELETE clause, so deleting
--    a rule that had ever been applied would fail with a foreign-key error.
do $$
declare
  con_name text;
begin
  select con.conname into con_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'finance_transactions'
    and con.contype = 'f'
    and pg_get_constraintdef(con.oid) like '%finance_recurring_transactions%'
    and con.confdeltype <> 'n';

  if con_name is not null then
    execute format('alter table finance_transactions drop constraint %I', con_name);
    alter table finance_transactions
      add constraint finance_transactions_recurring_id_fkey
      foreign key (recurring_id) references finance_recurring_transactions(id) on delete set null;
  end if;
end $$;

-- 4. At most one transaction per rule per date. Applying a rule inserts with
--    ON CONFLICT DO NOTHING against this index, so a retried, overlapping,
--    or crashed-and-restarted run can never double-book an occurrence.
create unique index if not exists finance_transactions_recurring_occurrence_idx
  on finance_transactions (recurring_id, date)
  where recurring_id is not null;

create index if not exists finance_recurring_transactions_due_idx
  on finance_recurring_transactions (next_date)
  where is_active;
