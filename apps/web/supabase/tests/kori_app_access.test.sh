#!/usr/bin/env bash
# Local test for migrations/20261127120000_kori_app_access.sql (Auth V2
# admission). Same approach as require_mfa_when_enrolled.test.sh: a THROWAWAY
# Postgres cluster in a temp directory, the minimum of Supabase recreated
# (roles, auth.jwt(), auth.uid(), auth.users), the migration applied twice,
# then who can read and write. Never connects to the live database.
#
# Needs initdb, pg_ctl and psql on PATH. Listens on 127.0.0.1 only (a unix
# socket path from a POSIX temp dir doesn't work with Windows PostgreSQL).
#
#   bash apps/web/supabase/tests/kori_app_access.test.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATION="$HERE/migrations/20261127120000_kori_app_access.sql"
MFA_MIGRATION="$HERE/migrations/20261121120000_require_mfa_when_enrolled.sql"
DIR="$(mktemp -d)"
PORT="${PGTEST_PORT:-55433}"
if command -v cygpath >/dev/null 2>&1; then
  DATA="$(cygpath -w "$DIR/data")"; LOG="$(cygpath -w "$DIR/pg.log")"
  MIGRATION="$(cygpath -w "$MIGRATION")"; MFA_MIGRATION="$(cygpath -w "$MFA_MIGRATION")"
else
  DATA="$DIR/data"; LOG="$DIR/pg.log"
fi
trap 'pg_ctl -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT

initdb -D "$DATA" -U postgres -A trust --locale=C -E UTF8 >/dev/null
pg_ctl -D "$DATA" -o "-p $PORT -c listen_addresses=127.0.0.1" -l "$LOG" -w start >/dev/null
q() { psql -h 127.0.0.1 -p "$PORT" -U postgres -X -q -v ON_ERROR_STOP=1 "$@"; }

q <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create type auth.factor_status as enum ('unverified', 'verified');
create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid not null, status auth.factor_status not null);
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- A: approved. S: suspended. O: Orbit-only (no row). B: approved, has a verified factor.
insert into auth.users (id) values
  ('aaaaaaaa-0000-4000-8000-000000000001'),
  ('55555555-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-0000000000b0'),
  ('bbbbbbbb-0000-4000-8000-000000000004');
insert into auth.mfa_factors (user_id, status) values ('bbbbbbbb-0000-4000-8000-000000000004', 'verified');
SQL

# Supported order: the MFA rule first (as it is in the repo), then the gate.
PGOPTIONS="-c client_min_messages=warning" q -f "$MFA_MIGRATION"
PGOPTIONS="-c client_min_messages=warning" q -f "$MIGRATION"
PGOPTIONS="-c client_min_messages=warning" q -f "$MIGRATION" # idempotent

q <<'SQL'
insert into public.kori_app_access (user_id, status) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'approved'),
  ('55555555-0000-4000-8000-000000000002', 'suspended'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'approved');
SQL

q -o /dev/null <<'SQL'
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

-- ACC-01: approved user reads exactly their own status, at aal1.
select t.as_user('aaaaaaaa-0000-4000-8000-000000000001', 'aal1');
do $$ begin
  perform t.expect('ACC-01 approved user reads own status (aal1)',
    (select array_agg(status) from public.kori_app_access) = array['approved']);
end $$;
reset role;

-- ACC-02: suspended reads "suspended"; Orbit-only reads no row.
select t.as_user('55555555-0000-4000-8000-000000000002', 'aal1');
do $$ begin
  perform t.expect('ACC-02 suspended user sees only their suspended row',
    (select array_agg(status) from public.kori_app_access) = array['suspended']);
end $$;
reset role;
select t.as_user('00000000-0000-4000-8000-0000000000b0', 'aal1');
do $$ begin
  perform t.expect('ACC-03 Orbit-only user sees no row (not admitted)',
    (select count(*) from public.kori_app_access) = 0);
end $$;
reset role;

-- ACC-09: an account WITH a verified factor can still read its own status at
-- aal1 after the all-tables MFA rule ran (no recursive lock on the gate) ...
select t.as_user('bbbbbbbb-0000-4000-8000-000000000004', 'aal1');
do $$ begin
  perform t.expect('ACC-09 own status readable at aal1 even with a verified factor',
    (select count(*) from public.kori_app_access) = 1);
end $$;
reset role;

-- ACC-04: nobody can approve themselves, edit a status, delete, or read others.
select t.as_user('00000000-0000-4000-8000-0000000000b0', 'aal2');
do $$ begin
  begin
    insert into public.kori_app_access (user_id, status) values ('00000000-0000-4000-8000-0000000000b0', 'approved');
    raise exception 'FAIL: self-approval insert should be refused';
  exception when insufficient_privilege then
    perform t.expect('ACC-04 self-approval insert refused', true);
  end;
end $$;
reset role;
select t.as_user('55555555-0000-4000-8000-000000000002', 'aal2');
do $$ begin
  begin
    update public.kori_app_access set status = 'approved';
    raise exception 'FAIL: status update should be refused';
  exception when insufficient_privilege then
    perform t.expect('ACC-04 suspended user cannot un-suspend', true);
  end;
  begin
    delete from public.kori_app_access;
    raise exception 'FAIL: delete should be refused';
  exception when insufficient_privilege then
    perform t.expect('ACC-04 delete refused', true);
  end;
  begin
    perform created_at from public.kori_app_access;
    raise exception 'FAIL: columns beyond user_id/status should not be readable';
  exception when insufficient_privilege then
    perform t.expect('ACC-04 only user_id and status are readable', true);
  end;
end $$;
reset role;

-- anon (signed out) reads nothing at all.
set role anon;
do $$ begin
  begin
    perform 1 from public.kori_app_access;
    raise exception 'FAIL: anon should not read admission';
  exception when insufficient_privilege then
    perform t.expect('anon has no access', true);
  end;
end $$;
reset role;

-- ACC-05: user_metadata / a forged role claim doesn't help.
do $$ begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-4000-8000-0000000000b0', 'role', 'service_role',
      'user_metadata', json_build_object('hspace', 'approved'))::text, false);
end $$;
set role authenticated;
do $$ begin
  perform t.expect('ACC-05 forged claims grant no admission',
    (select count(*) from public.kori_app_access) = 0);
end $$;
reset role;

-- The table did NOT get the restrictive MFA policy; others would.
do $$ begin
  perform t.expect('no restrictive MFA policy on the gate table',
    not exists (select 1 from pg_policies where tablename = 'kori_app_access'
                and policyname = 'kori_require_mfa_when_enrolled'));
end $$;
SQL
# ORDERING HAZARD (documented in the migration): re-running the MFA rule after
# the gate exists puts the restrictive policy back on it and locks MFA users
# out of their own status at aal1. Prove it, then prove the remedy.
PGOPTIONS="-c client_min_messages=warning" q -f "$MFA_MIGRATION"
q -o /dev/null <<'SQL'
select t.as_user('bbbbbbbb-0000-4000-8000-000000000004', 'aal1');
do $$ begin
  perform t.expect('HAZARD confirmed: MFA rule re-run after the gate hides an MFA user''s own status at aal1',
    (select count(*) from public.kori_app_access) = 0);
end $$;
reset role;
SQL
PGOPTIONS="-c client_min_messages=warning" q -f "$MIGRATION"
q -o /dev/null <<'SQL'
select t.as_user('bbbbbbbb-0000-4000-8000-000000000004', 'aal1');
do $$ begin
  perform t.expect('remedy: re-applying the gate migration restores the aal1 self-read',
    (select count(*) from public.kori_app_access) = 1);
end $$;
reset role;
SQL
echo "kori_app_access: all checks passed"
