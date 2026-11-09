-- Notes projects: per-project AI permission level (Off / Read only / Read & edit).
--
-- Builds on 20261109150000_note_projects_ai_access.sql (ai_access = AI can
-- see the project). Adds ai_can_edit = AI can also create and edit notes in
-- it. The app shows the pair as one three-way setting:
--   ai_access = false                       -> Off
--   ai_access = true,  ai_can_edit = false  -> Read only
--   ai_access = true,  ai_can_edit = true   -> Read & edit
--
-- Backfill: projects that already have AI access keep today's behaviour
-- (Read & edit). Everything else defaults to false, so turning AI access on
-- later starts at Read only.
--
-- Enforcement is in the DATABASE, not only in lib/mcp: an MCP access token is
-- a full Supabase user token (its claims carry the connector's `client_id`),
-- so a connector could call the data API directly. For tokens with a
-- client_id:
--   * kori_note_projects: ai_access / ai_can_edit can't be changed on an
--     existing project (extends the existing guard).
--   * kori_notes: insert/update only into a project with ai_access AND
--     ai_can_edit; never move a note between projects; never delete.
-- First-party H-Space sessions (bridge tokens) have no client_id and are
-- unaffected. Read access is still enforced by lib/mcp only (unchanged).
--
-- Note: projects opened to AI only through the MCP_KNOWLEDGE_PROJECT_IDS env
-- allowlist (ai_access = false) become read-only for AI, because writes now
-- require the in-app setting.
--
-- Additive: one column, one updated function, two triggers. kori_* tables are
-- H-Space-only; nothing Orbit uses is touched.
--
-- VERIFY after applying (read-only):
--   select ai_access, ai_can_edit, count(*) from public.kori_note_projects group by 1, 2;
--
-- ROLLBACK:
--   drop trigger if exists kori_notes_guard_connector_writes on public.kori_notes;
--   drop function if exists public.kori_notes_guard_connector_writes();
--   then re-run the guard function + trigger from 20261109150000 (ai_access only),
--   and: alter table public.kori_note_projects drop column if exists ai_can_edit;

alter table public.kori_note_projects
  add column if not exists ai_can_edit boolean not null default false;

update public.kori_note_projects
   set ai_can_edit = true
 where ai_access and not ai_can_edit;

-- Connectors can't change either setting on an existing project.
create or replace function public.kori_note_projects_guard_ai_access()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.ai_access is distinct from old.ai_access
      or new.ai_can_edit is distinct from old.ai_can_edit)
     and (auth.jwt() ->> 'client_id') is not null then
    raise exception 'AI access can only be changed from the H-Space app.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.kori_note_projects_guard_ai_access() from public, anon, authenticated;

drop trigger if exists kori_note_projects_guard_ai_access on public.kori_note_projects;
create trigger kori_note_projects_guard_ai_access
  before update of ai_access, ai_can_edit on public.kori_note_projects
  for each row execute function public.kori_note_projects_guard_ai_access();

-- Connector writes to notes: only into Read & edit projects; no moves, no deletes.
create or replace function public.kori_notes_guard_connector_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (auth.jwt() ->> 'client_id') is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception 'AI apps can''t delete notes.' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.project_id is distinct from old.project_id then
    raise exception 'AI apps can''t move notes between projects.' using errcode = '42501';
  end if;

  if new.project_id is null or not exists (
    select 1
      from public.kori_note_projects p
     where p.id = new.project_id
       and p.user_id = new.user_id
       and p.ai_access
       and p.ai_can_edit
  ) then
    raise exception 'AI apps can''t edit notes in this project.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.kori_notes_guard_connector_writes() from public, anon, authenticated;

drop trigger if exists kori_notes_guard_connector_writes on public.kori_notes;
create trigger kori_notes_guard_connector_writes
  before insert or update or delete on public.kori_notes
  for each row execute function public.kori_notes_guard_connector_writes();
