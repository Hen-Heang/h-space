# HANDOFF

## Snapshot

- **Updated:** 2026-11-09 (evening).
- **Checkout:** `main` at `4c09cb9` (#115 merged), deployed to production. The owner's main checkout has unrelated uncommitted work that isn't ours: a modified `apps/web/lib/api/finance-client.ts`, plus untracked `false`, `luyra-web/` and `v.title`. It also has uncommitted `HANDOFF.md` / `HANDOFF_HISTORY.md` edits from an intermediate snapshot; their facts are folded in here, so they can be discarded once this lands. Leave everything else alone.
- **MCP is live in production with Claude Code and ChatGPT** at `https://hengo.henheang.site/mcp`. How it works: `docs/MCP_PROJECT_KNOWLEDGE.md`, `apps/web/docs/chatgpt-mcp-integration.md`.
  - **Consent:** #111 (`lib/mcp-consent.ts`, REST + bridge token). The three open questions are settled: GoTrue accepts the bridge token on the consent endpoints; the hook receives `client_id`; the data API accepts the array `aud`. It's tied to the temporary bridge; the long-term plan is h-space-api#36.
  - **OAuth apps** (Supabase → Authentication → OAuth Apps; ids aren't secret):
    - **Claude Code:** public (PKCE), `0d636b5e-03d0-4d6b-8e69-244f03cee0aa`, redirect `http://localhost:8765/callback`. User-level `hspace` server in `~/.claude.json` (`--client-id … --callback-port 8765`).
    - **ChatGPT:** confidential, `425b2b56-1ccb-41ac-ad65-67b9bd4d778e`, token auth `client_secret_post`. Redirects: `https://chatgpt.com/connector_platform_oauth_redirect` and the connector-specific `https://chatgpt.com/connector/oauth/xcH48F6mBuDN`. Re-creating the ChatGPT connector changes that id, and the new URL must be added.
  - **Access-token hook** `public.kori_mcp_access_token_hook`: live as recorded migrations `20261109043447 mcp_access_token_hook` and `20261109054032 mcp_access_token_hook_add_chatgpt`, and enabled as the only Customize Access Token hook. The repo file `20261109120000_mcp_access_token_hook.sql` now matches it.
  - **OAuth Server:** authorization path `/oauth/consent`. It had a trailing space that sent users to a 404 page; fixed in the dashboard. Dynamic registration off. JWKS has one ES256 key.
  - **Vercel env (production):** `MCP_RESOURCE_URL`, `SUPABASE_OAUTH_ISSUER` (`https://dnzqgnejwyucenghugrb.supabase.co/auth/v1`), `MCP_ALLOWED_CLIENT_IDS` (both ids), `MCP_WRITE_ENABLED=true` (the plan said start at `false`; the owner kept it on). `MCP_KNOWLEDGE_PROJECT_IDS` is unset; the per-project in-app setting replaces it.
  - **Diagnosing failures:** `lib/mcp/auth.ts` deliberately doesn't log why a token was rejected; decode the token's `aud` / `client_id` / `iss` locally. Supabase auth logs show OAuth errors (`invalid redirect_uri`, `client is registered for 'client_secret_basic'…`). A token minted before the hook or env was in place fails until the client re-authenticates.
  - **Verified:** Claude Code `list_tasks` (audited in `kori_mcp_audit`); ChatGPT token issued with "Hook ran successfully".
- **Merged and deployed today:**
  - **#113** (owner): per-project "Allow AI access" switch (`ai_access`; migration `20261109150000`, applied 05:21 UTC).
  - **#114:** Notes project page "Start here" (pinned notes as key notes) and notes grouped into collapsible sections by `category` (`lib/project-sections.ts`). The editor suggests section names. No schema change. The UI sweep now has synthetic note-project fixtures and `/notes/projects/<id>`.
  - **#115:** per-project AI level **Off / Read only / Read & edit** (`ai_access` + new `ai_can_edit`).
    - MCP writes need Read & edit. The env allowlist grants Read only.
    - Migration `20261109170000_note_projects_ai_edit_level` was **applied after the deploy**. The check showed 1 project Read & edit (backfilled) and 1 Off; both guard triggers present; functions executable only by `postgres` / `service_role`.
    - The database now rejects, for tokens with a `client_id`: note writes outside Read & edit projects, moving notes, deleting notes, and changing a project's level.
    - Read access is still enforced only by the MCP server (known limit, in the PR).
- **Verification (local, per PR):** `pnpm lint` 0 errors (6 old warnings); `pnpm test` 2,129 tests (#114) and 2,134 tests (#115) passed; `pnpm build:web` passed; UI sweep with synthetic data at 320–1440 px, no overflow. **Not run here:** a live test of the #115 triggers against an actual connector write.
- **GitHub Actions is still down (account billing lock).** Run `pnpm lint` / `pnpm test` / `pnpm build` locally before merging and treat red Web CI as "not run". Local build needs `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`.
- **Gotchas:**
  - `gh pr merge`, discarding changes (`git checkout --`) and pushes from the `main` checkout are blocked for the agent; the owner merges.
  - Supabase `apply_migration` asks for a confirmation that expires after 2 minutes.
  - The Supabase GitHub integration runs a "Supabase Preview" check on merges but did **not** auto-apply migrations.
- **Worktrees:** the agent's `../h-space-notes-start`, `../h-space-ai-levels`, `../h-space-mcp-hook` and `../h-space-docs` can be removed once this PR merges. `../h-space-mcp-consent-fix`, `../h-space-cleanup` and `../h-space-work-korean` aren't the agent's; ask first. Empty leftover folders `../h-space-consent` and `../h-space-consent2`: delete them in File Explorer, not with `rm -rf`.

## Current focus

1. **MCP follow-ups:**
   1. **Owner:** quick live test of #115. Set a project to Read only, ask Claude Code to add a note there, and expect the "Read only" refusal. Editing notes in the app must still work.
   2. **Connected apps** (Settings → Security): list and revoke connector grants via Supabase `GET`/`DELETE /user/oauth/grants` (REST + bridge pattern). It gives an in-app kill switch.
   3. Enforce **read** access in the database too (RLS for `client_id` tokens on `kori_notes` / `kori_note_projects`), so a connector can't read non-AI projects through the data API directly.
   4. Decide whether to keep `MCP_WRITE_ENABLED=true`.
2. **Notes:** an editable "Current focus" box with a checklist on the project page needs a column, so it's a separate PR with a migration. Mentor Feedback and Linked Tasks are still placeholders.
3. **Owner:** follow up on the GitHub Support billing-lock ticket; re-run CI once it's lifted.
4. **UI audit follow-ups (unchanged):**
   - History "★" filters never match (`toCorrectionReview` doesn't map `rating`).
   - `UnitEditor` `FieldLabel` is a `<p>`.
   - Sign-in app tiles use one colour per app.
   - `public/app-process.png` needs new artwork.
   - Phase 6 sweep and keyboard pass.
   - Remaining restyles: Chat leftovers, Interview, Roadmap, Recovery; vocab `SentenceChallenge`/`VocabCard`/`VocabDeck`/`DeckBuilder`.
5. **Carried over:**
   - Native-speaker pass on `lib/korean-phrasebook/work-seed.ts`.
   - Planner slices 3–10; Finance redesign phases D–F; second-brain T2–T7.
   - Long-term MCP auth via h-space-api (#36) to replace the bridge-tied consent before the bridge is removed.
   - Generic-error treatment for `chat/stream`, `goals/coach`, `memory/ask`, `recovery-coach`.
   - Independent H-Vault security audit and restore drill.
