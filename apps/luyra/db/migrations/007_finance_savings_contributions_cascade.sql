-- Deleting a savings goal must also remove its contribution history.
-- 004_finance.sql declared finance_savings_contributions.goal_id as a plain
-- `not null references` with no ON DELETE clause, so deleting a goal that
-- has any contributions currently fails with a foreign-key violation
-- instead of cascading. Replace that constraint with ON DELETE CASCADE.
do $$
declare
  con_name text;
begin
  select con.conname into con_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'finance_savings_contributions'
    and con.contype = 'f'
    and con.conname like '%goal_id%';

  if con_name is not null then
    execute format('alter table finance_savings_contributions drop constraint %I', con_name);
  end if;
end $$;

alter table finance_savings_contributions
  add constraint finance_savings_contributions_goal_id_fkey
  foreign key (goal_id) references finance_savings_goals(id) on delete cascade;
