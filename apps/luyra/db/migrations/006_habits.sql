create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label varchar not null,
  category varchar not null default 'custom'
    check (category in ('exercise', 'reading', 'meditation', 'sleep', 'water', 'study', 'coding', 'deep_work', 'walking', 'custom')),
  identity_statement text,
  active boolean not null default true,
  started_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habits_user_id_idx on habits (user_id);

create table if not exists habit_checkins (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  date date not null,
  completed boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

create index if not exists habit_checkins_habit_id_idx on habit_checkins (habit_id);
create index if not exists habit_checkins_user_id_idx on habit_checkins (user_id);
