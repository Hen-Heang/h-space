-- Require a two-step-verified (aal2) session from accounts that have an
-- authenticator, on every RLS table in public.
--
-- Why: sign-in moved to Supabase Auth on 2026-11-21 (docs/SPRING_EXIT_PLAN.md).
-- A password, email code or Google sign-in gives an aal1 session; the app
-- treats it as signed out until the TOTP code is entered, but until now RLS
-- accepted it — so a password alone could read an MFA account's data straight
-- from the API. This moves that rule into the database (AGENTS.md: never only
-- in UI route guards).
--
-- How: one RESTRICTIVE policy per table. Restrictive policies are ANDed with
-- the existing permissive ones, so nothing that's denied today becomes
-- allowed; the only new denial is "this user has a verified factor and the
-- session isn't aal2". Accounts without a verified factor (every Orbit user
-- who never enrolled) see no change. service_role and the table owner
-- (Edge Functions, pg_cron jobs) bypass RLS and are unaffected; anon isn't
-- targeted.
--
-- Covers every table in public with RLS enabled when this runs — the kori_*
-- tables and the Orbit tables H-Space shares (goals, tasks, ...). A table
-- created later needs the same policy (see the house-style note in
-- apps/web/AGENTS.md). Not covered: storage.objects (kori-avatars) and
-- security-definer functions, which skip RLS by design.
--
-- Rollback: drop the policies and the function (statements at the end).

create or replace function public.kori_mfa_requirement_met()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- Reads auth.mfa_factors, which the authenticated role can't see itself;
  -- only ever about the caller (auth.uid()).
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    or not exists (
      select 1
      from auth.mfa_factors f
      where f.user_id = auth.uid()
        and f.status = 'verified'
    )
$$;

comment on function public.kori_mfa_requirement_met() is
  'True when the caller''s session is aal2 or the caller has no verified MFA factor. Used by the kori_require_mfa_when_enrolled restrictive policies.';

revoke execute on function public.kori_mfa_requirement_met() from public, anon;
grant execute on function public.kori_mfa_requirement_met() to authenticated;

do $$
declare
  t record;
  applied integer := 0;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity
    order by c.relname
  loop
    execute format('drop policy if exists kori_require_mfa_when_enrolled on public.%I', t.relname);
    -- (select ...) makes Postgres evaluate the check once per statement, not per row.
    execute format(
      'create policy kori_require_mfa_when_enrolled on public.%I as restrictive for all to authenticated '
      'using ((select public.kori_mfa_requirement_met())) '
      'with check ((select public.kori_mfa_requirement_met()))',
      t.relname
    );
    applied := applied + 1;
  end loop;
  raise notice 'kori_require_mfa_when_enrolled: applied to % tables', applied;
end
$$;

-- Rollback (run by hand if needed):
-- do $$
-- declare t record;
-- begin
--   for t in select tablename from pg_policies
--            where schemaname = 'public' and policyname = 'kori_require_mfa_when_enrolled'
--   loop
--     execute format('drop policy kori_require_mfa_when_enrolled on public.%I', t.tablename);
--   end loop;
-- end $$;
-- drop function if exists public.kori_mfa_requirement_met();
