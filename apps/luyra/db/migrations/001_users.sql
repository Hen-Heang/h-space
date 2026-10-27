-- users.id is the Supabase Auth user id (claims.sub) — not generated here.
create table if not exists users (
  id uuid primary key,
  email varchar not null,
  display_name varchar,
  avatar_url text,
  timezone varchar not null default 'Asia/Seoul',
  default_currency varchar not null default 'KRW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
