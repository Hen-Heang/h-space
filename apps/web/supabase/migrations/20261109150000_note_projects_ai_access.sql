-- Notes projects: per-project "Allow AI access" switch for the MCP server.
--
-- Additive only. One boolean column on kori_note_projects, default false, so
-- every existing project stays invisible to MCP connectors until the owner
-- turns it on in the app. lib/mcp/tools/project-knowledge.ts treats a
-- project as AI-accessible when ai_access is true OR its id is listed in the
-- MCP_KNOWLEDGE_PROJECT_IDS env var (kept for compatibility).
--
-- Guard: a token minted for an OAuth connector (Claude, ChatGPT…) carries a
-- `client_id` claim; first-party H-Space sessions don't. The trigger below
-- refuses to CHANGE ai_access on an existing project when the caller's JWT
-- has a client_id, because an MCP token is a full Supabase user token and
-- could otherwise call the data API directly to opt a private project in.
-- Connectors may still INSERT a new project with ai_access = true (the
-- create_knowledge_project tool): a new project is empty, so that exposes
-- nothing that wasn't already the connector's own writing.
--
-- APPLY ORDER: runs on the database shared with Orbit. Take a backup first.
-- The web app tolerates the column being absent (the switch is hidden and
-- MCP falls back to the env allowlist), so it can deploy before or after
-- this migration.
--
-- VERIFY after applying:
--   1. In the app, toggle AI access on a test project on and off (proves the
--      first-party session token has no client_id claim).
--   2. Via MCP, list_knowledge_projects shows that project only while on.
--
-- ROLLBACK:
--   drop trigger if exists kori_note_projects_guard_ai_access on public.kori_note_projects;
--   drop function if exists public.kori_note_projects_guard_ai_access();
--   alter table public.kori_note_projects drop column if exists ai_access;

alter table public.kori_note_projects
  add column if not exists ai_access boolean not null default false;

create or replace function public.kori_note_projects_guard_ai_access()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.ai_access is distinct from old.ai_access
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
  before update of ai_access on public.kori_note_projects
  for each row execute function public.kori_note_projects_guard_ai_access();

-- Partial index for the MCP "which projects are on" lookup.
create index if not exists kori_note_projects_user_ai_access_idx
  on public.kori_note_projects (user_id) where ai_access;
