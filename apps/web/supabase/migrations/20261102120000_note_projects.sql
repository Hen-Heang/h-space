-- Notes 2.0, step 1: projects for notes.
--
-- Additive only. A new owner-scoped table, plus one nullable column on
-- kori_notes. Existing notes keep project_id = null and appear under
-- "No project"; no existing row, URL, slug or policy changes.
--
-- Ownership: a note may only point at a project owned by the same user. The
-- composite foreign key (project_id, user_id) -> (id, user_id) enforces that
-- in the database, so it holds even if a client sends someone else's project
-- id. Deleting a project only clears project_id on its notes (the notes stay).
--
-- APPLY ORDER: this runs on the database shared with Orbit/DailyGoalMap.
-- Take a backup first. The web app tolerates the column/table being absent
-- (lib/api/notes.ts falls back, Projects shows "not set up yet"), so the app
-- can deploy before or after this migration.
--
-- ROLLBACK (run in this order; detaches notes from projects, then drops them):
--   alter table public.kori_notes drop constraint if exists kori_notes_project_owner_fkey;
--   drop index if exists public.kori_notes_user_project_idx;
--   alter table public.kori_notes drop column if exists project_id;
--   drop table if exists public.kori_note_projects;

create table if not exists public.kori_note_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  project_type text not null default 'personal'
    check (project_type in ('personal', 'learning', 'open_source', 'work_reference')),
  status text not null default 'active'
    check (status in ('planned', 'active', 'on_hold', 'completed', 'archived')),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  repo_url text check (repo_url is null or char_length(repo_url) <= 2000),
  start_date date,
  target_date date,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kori_note_projects_dates_check
    check (start_date is null or target_date is null or target_date >= start_date),
  -- Target of the composite ownership FK from kori_notes.
  constraint kori_note_projects_id_user_key unique (id, user_id)
);

create index if not exists kori_note_projects_user_updated_idx
  on public.kori_note_projects (user_id, updated_at desc);
create index if not exists kori_note_projects_user_opened_idx
  on public.kori_note_projects (user_id, last_opened_at desc nulls last);

alter table public.kori_note_projects enable row level security;
revoke all on table public.kori_note_projects from anon;
grant select, insert, update, delete on table public.kori_note_projects to authenticated;

drop policy if exists "own note projects" on public.kori_note_projects;
create policy "own note projects" on public.kori_note_projects
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.kori_notes
  add column if not exists project_id uuid;

-- set null (project_id) keeps user_id intact when a project is deleted.
alter table public.kori_notes
  drop constraint if exists kori_notes_project_owner_fkey;
alter table public.kori_notes
  add constraint kori_notes_project_owner_fkey
    foreign key (project_id, user_id)
    references public.kori_note_projects (id, user_id)
    on delete set null (project_id);

create index if not exists kori_notes_user_project_idx
  on public.kori_notes (user_id, project_id) where project_id is not null;
