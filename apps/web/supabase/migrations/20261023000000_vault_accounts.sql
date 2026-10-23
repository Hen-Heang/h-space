-- H-Vault: a private directory of which account (email/username) is used for
-- which service, plus an optional END-TO-END-ENCRYPTED password.
--
-- password_ciphertext holds only an AES-256-GCM envelope produced in the
-- browser (apps/web/lib/vault-crypto.ts) with a key derived from the user's
-- master password (PBKDF2-SHA256, 600k iterations). The master password and
-- key never reach this database, so neither RLS bypass (service role,
-- dashboard, backups) nor a leaked row reveals a password. The check
-- constraint rejects anything that isn't an envelope, so a plain password
-- can't be stored by mistake. There is still no PIN, token, recovery-code,
-- API-key, TOTP or private-key column — do not add one.
--
-- One new, isolated table; nothing existing is touched. The project is shared
-- with Orbit/DailyGoalMap — apply only with the maintainer's approval.
--
-- `category` is free text (not a check list) so custom categories can be
-- added later without a migration; the app validates the built-in set
-- (lib/vault.ts). `status` is enum-like, so it gets a check constraint.
-- No updated_at trigger — the app sets it on write (house style).

create table if not exists public.kori_vault_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  service_name text not null check (char_length(btrim(service_name)) between 1 and 120),
  account_label text check (account_label is null or char_length(account_label) <= 80),
  login_identifier text check (login_identifier is null or char_length(login_identifier) <= 254),
  website_url text check (
    website_url is null
    or (char_length(website_url) <= 2000 and website_url ~* '^https://[^/@[:space:]]+\.[^/@[:space:]]+')
  ),
  category text not null default 'other' check (char_length(category) between 1 and 40),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  is_favorite boolean not null default false,
  status text not null default 'active' check (status in ('active', 'needs_review', 'inactive')),
  -- How the account is signed into ('google' = "Continue with Google", …).
  -- Kept in sync with VAULT_LOGIN_METHODS in lib/vault.ts.
  login_method text not null default 'password' check (
    login_method in ('password', 'google', 'apple', 'github', 'microsoft', 'kakao', 'naver', 'sso')
  ),
  password_ciphertext text check (
    password_ciphertext is null
    or (
      char_length(password_ciphertext) <= 4096
      and password_ciphertext ~ '^v1\.[A-Za-z0-9+/]+={0,2}\.[A-Za-z0-9+/]+={0,2}\.[A-Za-z0-9+/]+={0,2}$'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kori_vault_accounts_user_updated_idx
  on public.kori_vault_accounts (user_id, updated_at desc);
create index if not exists kori_vault_accounts_user_category_idx
  on public.kori_vault_accounts (user_id, category);
create index if not exists kori_vault_accounts_user_favorite_idx
  on public.kori_vault_accounts (user_id) where is_favorite;

alter table public.kori_vault_accounts enable row level security;

-- No anonymous access at all. Authenticated users may read/insert/delete, but
-- may only UPDATE the account columns: `id`, `user_id` and `created_at` are
-- not updatable by clients, so ownership can never be reassigned even before
-- RLS's `with check` is evaluated.
revoke all on table public.kori_vault_accounts from anon;
revoke all on table public.kori_vault_accounts from authenticated;
grant select, insert, delete on table public.kori_vault_accounts to authenticated;
grant update (
  service_name, account_label, login_identifier, website_url,
  category, tags, is_favorite, status, login_method, password_ciphertext, updated_at
) on table public.kori_vault_accounts to authenticated;

drop policy if exists "vault accounts select own" on public.kori_vault_accounts;
create policy "vault accounts select own" on public.kori_vault_accounts
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "vault accounts insert own" on public.kori_vault_accounts;
create policy "vault accounts insert own" on public.kori_vault_accounts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "vault accounts update own" on public.kori_vault_accounts;
create policy "vault accounts update own" on public.kori_vault_accounts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "vault accounts delete own" on public.kori_vault_accounts;
create policy "vault accounts delete own" on public.kori_vault_accounts
  for delete to authenticated
  using ((select auth.uid()) = user_id);
