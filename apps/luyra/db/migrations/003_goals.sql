create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title varchar not null,
  description text,
  category varchar
    check (category is null or category in ('personal', 'career', 'finance', 'learning', 'health', 'other')),
  status varchar not null default 'active'
    check (status in ('active', 'completed', 'paused')),
  target_date date,
  progress integer not null default 0
    check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_id_idx on goals (user_id);
create index if not exists goals_user_id_status_idx on goals (user_id, status);
