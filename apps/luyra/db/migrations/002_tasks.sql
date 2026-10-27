create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title varchar not null,
  description text,
  status varchar not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  priority varchar
    check (priority is null or priority in ('low', 'medium', 'high')),
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on tasks (user_id);
create index if not exists tasks_user_id_status_idx on tasks (user_id, status);
create index if not exists tasks_user_id_due_date_idx on tasks (user_id, due_date);
