-- Auth V2: H-Space admission (decision H13, PROPOSED - needs the owner's
-- approval and a staging run before it is applied to the shared Supabase
-- project). NOT APPLIED anywhere live. Tested only on a throwaway local
-- cluster: supabase/tests/kori_app_access.test.sh.
--
-- The Supabase project is shared with Orbit, so a valid session is not H-Space
-- membership. One row per admitted H-Space user; no row = not admitted.
--
-- * Written only by the owner through a trusted path (dashboard SQL / an
--   approved admin process). The browser gets SELECT on two columns and no
--   INSERT/UPDATE/DELETE, so nobody can approve themselves or edit a status.
-- * Readable only for the caller's own row, at aal1 on purpose: the web app
--   and h-space-api read it right after the first factor to decide whether to
--   continue to the code step. That's why this one table deliberately does NOT
--   get kori_require_mfa_when_enrolled (it would also make the gate depend on
--   the policy it gates). It holds no data beyond the status itself.
-- * This table alone admits nobody to anything: H-Space-owned tables, RPCs,
--   storage and APIs must also check it (h-space-api docs/auth-v2.md lists
--   what does today). Approval never comes from user_metadata or a profile.
-- * Seed explicitly, per vetted UUID. Never mass-approve all auth.users: Orbit
--   users live there too.

create table if not exists public.kori_app_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null check (status in ('approved', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kori_app_access enable row level security;

drop policy if exists kori_app_access_read_own on public.kori_app_access;
create policy kori_app_access_read_own on public.kori_app_access
  for select to authenticated
  using (user_id = (select auth.uid()));

-- 20261121120000_require_mfa_when_enrolled.sql puts its restrictive policy on
-- every RLS table that exists when it runs. On this table it would stop an
-- account with an authenticator from reading its own status at aal1, so the
-- app would refuse it as "not admitted". Remove it here. ORDERING HAZARD: if
-- that MFA migration is (re)run after this one, it adds the policy back -
-- re-run this migration afterwards, or exclude kori_app_access from its loop
-- (owner decision H6; tested in supabase/tests/kori_app_access.test.sh).
drop policy if exists kori_require_mfa_when_enrolled on public.kori_app_access;

revoke all on public.kori_app_access from anon, authenticated;
grant select (user_id, status) on public.kori_app_access to authenticated;

-- Owner seeding, run by hand with reviewed UUIDs (example only, not executed):
--   insert into public.kori_app_access (user_id, status)
--   values ('<vetted-uuid>', 'approved')
--   on conflict (user_id) do update set status = excluded.status, updated_at = now();
