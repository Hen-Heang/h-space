-- MCP connectors: Custom Access Token Hook that binds connector tokens to /mcp.
--
-- /mcp (lib/mcp/auth.ts) accepts a Supabase OAuth token only if its `aud`
-- contains MCP_RESOURCE_URL and its `client_id` is in MCP_ALLOWED_CLIENT_IDS.
-- Supabase mints `aud = "authenticated"` by default, so without this hook every
-- connector token is rejected (fail closed). See
-- apps/web/docs/chatgpt-mcp-integration.md §3.6 and §14.
--
-- Scope: changes `aud` ONLY for tokens that carry a `client_id` in the approved
-- list. Every other token — H-Space and Orbit sign-ins, which have no
-- `client_id` — is returned unchanged. `role`, `sub` and all other claims are
-- never touched. `aud` keeps "authenticated" alongside the resource because
-- /mcp forwards the same token to Supabase so RLS runs as the user.
--
-- Additive only: one function and its grants. No table, row or policy changes.
--
-- LIVE STATE (2026-11-09): applied to the production project as two recorded
-- migrations — `20261109043447 mcp_access_token_hook` (Claude Code) and
-- `20261109054032 mcp_access_token_hook_add_chatgpt` (adds ChatGPT) — and
-- enabled as the Customize Access Token hook (no other hook existed). This
-- file matches the live function. Approved clients (non-secret OAuth ids):
-- Claude Code 0d636b5e-…, ChatGPT 425b2b56-…; both are also in Vercel's
-- MCP_ALLOWED_CLIENT_IDS. Verified live: the hook receives `client_id` for
-- OAuth-server tokens, and the data API accepts the array `aud`.
--
-- ADDING A CLIENT: register it in Supabase -> Authentication -> OAuth Apps,
-- add its id to approved_clients below (a live SQL change — needs approval)
-- AND to MCP_ALLOWED_CLIENT_IDS, then redeploy.
--
-- On a fresh environment: change mcp_resource and approved_clients first, run
-- the three test selects at the bottom, then enable the hook in the dashboard
-- (Authentication -> Hooks -> Customize Access Token -> Postgres ->
-- public.kori_mcp_access_token_hook). If another Customize Access Token hook
-- already exists, MERGE this logic into it — Supabase runs only one. A hook
-- that raises blocks EVERY sign-in, Orbit's included.
--
-- ROLLBACK:
--   1. Dashboard: disable the Customize Access Token hook (immediate for new tokens).
--   2. drop function if exists public.kori_mcp_access_token_hook(jsonb);

create or replace function public.kori_mcp_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb := event -> 'claims';
  token_client_id text := claims ->> 'client_id';
  -- Must equal MCP_RESOURCE_URL exactly (no trailing slash).
  mcp_resource constant text := 'https://hengo.henheang.site/mcp';
  -- Same ids as MCP_ALLOWED_CLIENT_IDS.
  approved_clients constant text[] := array[
    '0d636b5e-03d0-4d6b-8e69-244f03cee0aa', -- Claude Code
    '425b2b56-1ccb-41ac-ad65-67b9bd4d778e'  -- ChatGPT
  ];
begin
  if token_client_id is null or not (token_client_id = any (approved_clients)) then
    return event;
  end if;

  claims := jsonb_set(claims, '{aud}', jsonb_build_array(mcp_resource, 'authenticated'));
  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Only Supabase Auth may call it.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.kori_mcp_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.kori_mcp_access_token_hook(jsonb) from authenticated, anon, public;

-- Guard: refuse to apply with placeholders still in place (the whole migration
-- runs in one transaction, so this rolls the function back too).
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'kori_mcp_access_token_hook'
      and (p.prosrc like '%<your-domain>%' or p.prosrc like '%<claude-code-client-id>%')
  ) then
    raise exception 'kori_mcp_access_token_hook: replace <your-domain> and <claude-code-client-id> before applying';
  end if;
end;
$$;

-- TESTS (read-only; run after applying, before enabling the hook):
--   -- Normal sign-in: unchanged, aud = "authenticated".
--   select public.kori_mcp_access_token_hook(
--     '{"user_id":"00000000-0000-0000-0000-000000000000",
--       "claims":{"aud":"authenticated","role":"authenticated"}}'::jsonb);
--   -- Unknown client: unchanged.
--   select public.kori_mcp_access_token_hook(
--     '{"claims":{"aud":"authenticated","role":"authenticated","client_id":"someone-else"}}'::jsonb);
--   -- Approved client: aud = ["https://hengo.henheang.site/mcp","authenticated"].
--   select public.kori_mcp_access_token_hook(
--     '{"claims":{"aud":"authenticated","role":"authenticated","client_id":"0d636b5e-03d0-4d6b-8e69-244f03cee0aa"}}'::jsonb);
