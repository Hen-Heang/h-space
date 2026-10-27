-- Account-level Telegram integration — not Finance-specific, so any future
-- Luyra domain (Habits, Tasks, ...) can reuse the same linked chat rather
-- than each domain inventing its own link flow. One row per Luyra user.
-- A Telegram chat can only ever be linked to one user at a time, enforced
-- by the partial unique index on chat_id.
create table if not exists telegram_accounts (
  user_id uuid not null references users(id) on delete cascade,
  chat_id text,
  telegram_username text,
  link_code text,
  link_code_expires_at timestamptz,
  linked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id)
);
create unique index if not exists telegram_accounts_chat_id_idx on telegram_accounts (chat_id) where chat_id is not null;
create index if not exists telegram_accounts_link_code_idx on telegram_accounts (link_code) where link_code is not null;
