#!/usr/bin/env bash
# Local test for migrations/20261121120000_require_mfa_when_enrolled.sql.
#
# Spins up a THROWAWAY Postgres cluster in a temp directory (unix socket only,
# no TCP), recreates the minimum of Supabase it needs (roles, auth.jwt(),
# auth.uid(), auth.mfa_factors), applies the migration twice, and checks who
# can read and write. Never connects to the live database. Needs initdb,
# pg_ctl and psql on PATH (e.g. Homebrew postgresql).
#
#   bash apps/web/supabase/tests/require_mfa_when_enrolled.test.sh
set -euo pipefail

MIGRATION="$(cd "$(dirname "$0")/.." && pwd)/migrations/20261121120000_require_mfa_when_enrolled.sql"
DIR="$(mktemp -d)"
PORT=55432
trap 'pg_ctl -D "$DIR/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT

initdb -D "$DIR/data" -U postgres -A trust --locale=C -E UTF8 >/dev/null
pg_ctl -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/pg.log" -w start >/dev/null
q() { psql -h "$DIR" -p "$PORT" -U postgres -X -q -v ON_ERROR_STOP=1 "$@"; }

q <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create type auth.factor_status as enum ('unverified', 'verified');
create table auth.mfa_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status auth.factor_status not null
);
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

create table public.kori_notes (id serial primary key, user_id uuid not null, body text);
alter table public.kori_notes enable row level security;
create policy own on public.kori_notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table public.tasks (id serial primary key, user_id uuid not null);
alter table public.tasks enable row level security;
create policy own on public.tasks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table public.no_rls (id int);

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;

-- A: no factor. B: verified factor. C: only an abandoned (unverified) factor.
insert into public.kori_notes (user_id, body) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'A'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'B'),
  ('cccccccc-0000-0000-0000-000000000003', 'C');
insert into public.tasks (user_id) values ('bbbbbbbb-0000-0000-0000-000000000002');
insert into auth.mfa_factors (user_id, status) values
  ('bbbbbbbb-0000-0000-0000-000000000002', 'verified'),
  ('cccccccc-0000-0000-0000-000000000003', 'unverified');
SQL

PGOPTIONS="-c client_min_messages=warning" q -f "$MIGRATION"
PGOPTIONS="-c client_min_messages=warning" q -f "$MIGRATION" # idempotent

# Query results go to /dev/null; the "ok - ..." notices (stderr) stay visible.
q -o /dev/null <<'SQL'
-- Test helpers in their own schema (not pg_temp) so every role can call them.
create schema t;
grant usage on schema t to public;
create function t.as_user(sub text, aal text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', sub, 'role', 'authenticated', 'aal', aal)::text, false);
  set role authenticated;
end $$;

create function t.expect(label text, ok boolean) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAIL: %', label; end if;
  raise notice 'ok - %', label;
end $$;

do $$ begin
  perform t.expect('policy on both RLS tables, not on the RLS-less one',
    (select count(*) from pg_policies where policyname = 'kori_require_mfa_when_enrolled') = 2
    and not exists (select 1 from pg_policies where tablename = 'no_rls'));
end $$;

-- A: no factor, aal1 → unchanged access to own rows only.
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001', 'aal1');
do $$ begin
  perform t.expect('A (no factor, aal1) reads own row only',
    (select array_agg(body) from public.kori_notes) = array['A']);
  insert into public.kori_notes (user_id, body) values ('aaaaaaaa-0000-0000-0000-000000000001', 'A2');
  perform t.expect('A (no factor, aal1) can insert', true);
end $$;
reset role;

-- B: verified factor, aal1 → nothing.
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002', 'aal1');
do $$ begin
  perform t.expect('B (verified factor, aal1) reads nothing',
    (select count(*) from public.kori_notes) = 0 and (select count(*) from public.tasks) = 0);
  begin
    insert into public.kori_notes (user_id, body) values ('bbbbbbbb-0000-0000-0000-000000000002', 'x');
    raise exception 'FAIL: B (aal1) insert should be refused';
  exception when insufficient_privilege then
    perform t.expect('B (verified factor, aal1) insert refused', true);
  end;
  update public.kori_notes set body = 'hacked';
  perform t.expect('B (aal1) update touches nothing', not found);
  delete from public.tasks;
  perform t.expect('B (aal1) delete touches nothing', not found);
end $$;
reset role;

-- B: aal2 → own rows, still not anyone else's.
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002', 'aal2');
do $$ begin
  perform t.expect('B (aal2) reads own rows only',
    (select array_agg(body) from public.kori_notes) = array['B']
    and (select count(*) from public.tasks) = 1);
  insert into public.kori_notes (user_id, body) values ('bbbbbbbb-0000-0000-0000-000000000002', 'B2');
  perform t.expect('B (aal2) can insert', true);
  begin
    insert into public.kori_notes (user_id, body) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x');
    raise exception 'FAIL: B writing A''s row should be refused';
  exception when insufficient_privilege then
    perform t.expect('B (aal2) still cannot write as A', true);
  end;
end $$;
reset role;

-- C: only an unverified factor → treated like no factor.
select t.as_user('cccccccc-0000-0000-0000-000000000003', 'aal1');
do $$ begin
  perform t.expect('C (unverified factor only, aal1) reads own row',
    (select array_agg(body) from public.kori_notes) = array['C']);
end $$;
reset role;

-- A token with no aal claim at all, for B → refused.
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002', '');
do $$ begin
  perform t.expect('B with no aal claim reads nothing', (select count(*) from public.kori_notes) = 0);
end $$;
reset role;

-- service_role bypasses RLS (Edge Functions).
set role service_role;
do $$ begin
  perform t.expect('service_role unaffected', (select count(*) from public.kori_notes) >= 3);
end $$;
reset role;

-- anon may not call the helper.
do $$ begin
  perform t.expect('anon cannot execute kori_mfa_requirement_met',
    not has_function_privilege('anon', 'public.kori_mfa_requirement_met()', 'execute'));
  perform t.expect('authenticated can execute kori_mfa_requirement_met',
    has_function_privilege('authenticated', 'public.kori_mfa_requirement_met()', 'execute'));
end $$;
SQL

echo "ALL CHECKS PASSED"
