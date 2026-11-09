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
-- BEFORE APPLYING — this runs on the database shared with Orbit/DailyGoalMap:
--   1. Replace both placeholders below (<your-domain>, <claude-code-client-id>).
--      The guard at the end aborts the migration while either is still present.
--   2. Check Authentication -> Hooks: if a Customize Access Token hook already
--      exists (e.g. Orbit's), MERGE this logic into it instead — Supabase runs
--      only one, and replacing it would drop its claims.
--   3. After applying, run the three test selects in the comment at the bottom,
--      then enable the hook in the dashboard (Authentication -> Hooks ->
--      Customize Access Token -> Postgres -> public.kori_mcp_access_token_hook).
--      A hook that raises blocks EVERY sign-in, Orbit's included.
--
-- Unverified until the live connector test (PR #111): that Supabase includes
-- `client_id` in the hook's claims for OAuth-server tokens, and that its data
-- API accepts an array `aud` containing "authenticated".
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
  mcp_resource constant text := 'https://<your-domain>/mcp';
  -- Same ids as MCP_ALLOWED_CLIENT_IDS. Add ChatGPT's id here when registered.
  approved_clients constant text[] := array['<claude-code-client-id>'];
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
--   -- Approved client: aud = ["https://<your-domain>/mcp","authenticated"].
--   select public.kori_mcp_access_token_hook(
--     '{"claims":{"aud":"authenticated","role":"authenticated","client_id":"<claude-code-client-id>"}}'::jsonb);
