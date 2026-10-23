-- Owner-isolation checks for kori_vault_accounts (migration
-- 20261023000000_vault_accounts.sql).
--
-- RUN ONLY AGAINST A LOCAL (`supabase start`) OR BRANCH DATABASE — never the
-- shared Orbit/H-Space production project. Everything runs inside one
-- transaction that is rolled back, and uses two throwaway fictional users.
--
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/vault_accounts_rls.sql
--
-- Every check raises an exception on failure; reaching the final NOTICE means
-- all checks passed.

begin;

-- Two fictional users.
insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-00000000a001', 'vault-owner@example.com'),
  ('00000000-0000-4000-8000-00000000b002', 'vault-other@example.com');

-- Seed one row per user as the table owner (bypasses RLS).
insert into public.kori_vault_accounts (id, user_id, service_name, login_identifier, website_url)
values
  ('10000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-00000000a001',
   'GitHub', 'owner-dev', 'https://github.com/login'),
  ('20000000-0000-4000-8000-00000000b002', '00000000-0000-4000-8000-00000000b002',
   'GitHub', 'other-dev', 'https://github.com/login');

-- ── Anonymous: no access ──────────────────────────────────────────────────────
set local role anon;
do $$
begin
  perform 1 from public.kori_vault_accounts;
  raise exception 'FAIL: anon could select kori_vault_accounts';
exception when insufficient_privilege then
  raise notice 'ok: anon select denied';
end $$;
reset role;

-- ── Authenticated as the owner ────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated"}', true);

do $$
declare n int;
begin
  -- Reads only own rows.
  select count(*) into n from public.kori_vault_accounts;
  if n <> 1 then raise exception 'FAIL: owner sees % rows, expected 1', n; end if;

  -- Cannot read the other user's row by id.
  select count(*) into n from public.kori_vault_accounts
    where id = '20000000-0000-4000-8000-00000000b002';
  if n <> 0 then raise exception 'FAIL: owner can read another user''s row'; end if;

  -- Update/delete of the other user's row affect nothing.
  update public.kori_vault_accounts set service_name = 'hijacked'
    where id = '20000000-0000-4000-8000-00000000b002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: owner updated another user''s row'; end if;

  delete from public.kori_vault_accounts where id = '20000000-0000-4000-8000-00000000b002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: owner deleted another user''s row'; end if;

  -- Own row is updatable.
  update public.kori_vault_accounts set is_favorite = true
    where id = '10000000-0000-4000-8000-00000000a001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: owner could not update own row'; end if;

  raise notice 'ok: owner reads/updates own row only';
end $$;

-- Inserting a row owned by someone else is rejected by `with check`.
do $$
begin
  insert into public.kori_vault_accounts (user_id, service_name)
    values ('00000000-0000-4000-8000-00000000b002', 'Spoofed');
  raise exception 'FAIL: inserted a row for another user';
exception when insufficient_privilege then
  raise notice 'ok: insert for another user denied';
end $$;

-- Omitting user_id defaults it to the caller.
do $$
declare owner uuid;
begin
  insert into public.kori_vault_accounts (service_name) values ('Defaulted')
    returning user_id into owner;
  if owner <> '00000000-0000-4000-8000-00000000a001' then
    raise exception 'FAIL: user_id defaulted to %', owner;
  end if;
  raise notice 'ok: user_id defaults to auth.uid()';
end $$;

-- Reassigning ownership is not even grantable (column-level UPDATE grant).
do $$
begin
  update public.kori_vault_accounts set user_id = '00000000-0000-4000-8000-00000000b002'
    where id = '10000000-0000-4000-8000-00000000a001';
  raise exception 'FAIL: owner reassigned user_id';
exception when insufficient_privilege then
  raise notice 'ok: user_id is not updatable';
end $$;

-- Unsafe website schemes are rejected by the check constraint.
do $$
begin
  insert into public.kori_vault_accounts (service_name, website_url)
    values ('Bad link', 'javascript:alert(1)');
  raise exception 'FAIL: accepted a javascript: URL';
exception when check_violation then
  raise notice 'ok: javascript: URL rejected';
end $$;

-- The only secret-like column is the encrypted password.
do $$
declare n int;
begin
  select count(*) into n from information_schema.columns
   where table_schema = 'public' and table_name = 'kori_vault_accounts'
     and column_name ~* '(pass|secret|token|pin|recovery|backup|api_?key|totp|otp|seed|private)'
     and column_name <> 'password_ciphertext';
  if n <> 0 then raise exception 'FAIL: % unexpected secret-like column(s) exist', n; end if;
  raise notice 'ok: only password_ciphertext';
end $$;

-- A plain password is rejected; only an encrypted envelope is stored.
do $$
begin
  update public.kori_vault_accounts set password_ciphertext = 'hunter2'
    where id = '10000000-0000-4000-8000-00000000a001';
  raise exception 'FAIL: accepted a plain password';
exception when check_violation then
  raise notice 'ok: plain password rejected';
end $$;

do $$
declare n int;
begin
  update public.kori_vault_accounts
     set password_ciphertext = 'v1.AAAAAAAAAAAAAAAAAAAAAA==.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA=='
   where id = '10000000-0000-4000-8000-00000000a001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: could not store an envelope'; end if;
  raise notice 'ok: envelope stored';
end $$;

reset role;

do $$ begin raise notice 'kori_vault_accounts RLS checks: ALL PASSED'; end $$;

rollback;
