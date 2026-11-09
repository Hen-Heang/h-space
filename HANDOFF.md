# HANDOFF

## Snapshot

- **Updated:** 2026-11-09.
- **Checkout:** `main` at `651fc54` (PR #110 merged). Since the last snapshot the owner merged #106–#110. The owner's main checkout has unrelated uncommitted work that isn't ours: a modified `apps/web/lib/api/finance-client.ts`, plus untracked `false` and `luyra-web/`. Leave them alone.
- **Merged this session:**
  - **#106 (`fix/pr-validation`).** After merging `main` (conflicts were only in `HANDOFF*.md`; `main`'s version kept), it added only: History's empty-state "Open AI Coach" opens `/chat` instead of `?mode=corrections`, plus Prettier fixes in `docs/design-system.md` and `scripts/generate-app-icons.mjs`.
  - **#110 MCP project knowledge.** Three read tools (`list_knowledge_projects`, `list_project_notes`, `get_project_note`) and two write tools behind `MCP_WRITE_ENABLED` (`create_project_note`, `update_project_note`; no deletes, never moves a note between projects). Nothing is visible unless its project id is in `MCP_KNOWLEDGE_PROJECT_IDS`. Also fixed a regression: the "use them only when the user asks" write caveat had been pushed past the first 512 characters of the server instructions. Tests added for cross-user and non-allowlisted denials (identical denial text, so no existence oracle) and for updates scoped by `user_id` and `project_id`. Record: `docs/MCP_PROJECT_KNOWLEDGE.md`.
- **Open: draft PR #111 (`spike/mcp-consent-rest`). This is the MCP sign-in unblock, done web-only at the owner's request rather than via h-space-api#36.**
  - `/oauth/consent` called `supabase.auth.oauth.*`, which throws under the token bridge. New `lib/mcp-consent.ts` calls the same two Supabase Auth endpoints directly with the bridge token: `GET /auth/v1/oauth/authorizations/{id}` and `POST …/consent`. GoTrue source (`internal/api/oauthserver/authorize.go`) guards them with `requireAuthentication` plus a user lookup and no session check, the same as `/user`, which already accepts bridge tokens (`lib/server/ai.ts`). The bridge only _approves_; the MCP token is still minted by Supabase's OAuth server.
  - Return-after-sign-in: the `(main)` gate sends signed-out users to `/login?next=…`, and all three sign-in paths return there. `lib/safe-next-path.ts` accepts same-site paths only (no open redirect, no auth-page loop). Behaviour change: after a mid-visit sign-out, signing back in returns to that page instead of `/home`.
  - Consent copy no longer points at a "Supabase connected-apps settings" screen that users don't have.
  - **Migration, NOT applied:** `apps/web/supabase/migrations/20261109120000_mcp_access_token_hook.sql`. `public.kori_mcp_access_token_hook` sets `aud = [MCP_RESOURCE_URL, "authenticated"]` only for approved `client_id`s; every other token (H-Space and Orbit sign-ins) is unchanged. It has placeholders (`<your-domain>`, `<claude-code-client-id>`), and a guard aborts the migration until both are replaced.
  - **Unverified until the live test:** whether GoTrue accepts the bridge token on the consent endpoints; whether the hook's claims include `client_id` for OAuth tokens; whether the data API accepts an array `aud`.
- **Verification (local, at #111 `0010825`; the migration commit `23256c3` is SQL only):**
  - `pnpm lint`: 0 errors, 6 warnings (all already on `main`).
  - Prettier: passed.
  - `pnpm test`: 195 files, 2,115 tests passed.
  - `pnpm build:web`: passed. This machine needs `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`, or `next/font` can't fetch Google Fonts (TLS inspection).
- **GitHub Actions is down (account billing lock).** Every Web CI job fails in about 2s with 0 steps. The check-run annotation reads "account is locked due to a billing issue". The account (Hen-Heang, GitHub Free, $0 billable, no payment method) shows default $0 "Usage blocked" budgets, and editing them requires a payment method. The owner opened a GitHub Support billing-lock review. The owner chose to skip it for now: CI checks aren't required (no branch protection on `main`), and Vercel is unaffected. Until it's fixed, run `pnpm lint` / `pnpm test` / `pnpm build` locally before merging, and treat red Web CI as "not run".
- **Worktrees:** `../h-space-mcp-consent-fix` (detached at `f8c3264`) wasn't created by the agent; ask before removing it. Empty leftover folders `../h-space-consent` and `../h-space-consent2` contain only `node_modules` links. Delete them in File Explorer, not with `rm -rf`, which can follow the links into the pnpm store.

## Current focus

1. **MCP live (owner + agent), in order:**
   1. Owner checks the Supabase dashboard (look only): JWT keys (current ES256 or RS256; legacy HS256 still accepted, since the bridge needs it), Site URL and redirect URLs, OAuth server (enabled, path `/oauth/consent`, dynamic registration off), and whether a Customize Access Token hook already exists. If it does, merge into it; don't replace it, because Orbit shares the project.
   2. Owner registers Claude Code as a **public** OAuth client and adds `http://localhost:3000/**` to the redirects.
   3. Fill the hook placeholders. Applying it is a live SQL change and needs explicit owner approval; run its three test selects, then enable it.
   4. Run the local live test from the #111 PR body. Then the owner marks #111 ready and merges it, and sets Vercel `MCP_RESOURCE_URL`, `SUPABASE_OAUTH_ISSUER`, `MCP_ALLOWED_CLIENT_IDS`, `MCP_WRITE_ENABLED` (start `false`) and `MCP_KNOWLEDGE_PROJECT_IDS`. Deployment Protection must be off for production.
   5. Register ChatGPT as a second client afterwards.
2. **Connected apps** (Settings → Security): list and revoke connector grants via Supabase `GET`/`DELETE /user/oauth/grants` (same REST-plus-bridge pattern). Makes the consent copy fully true and gives a kill switch.
3. **Owner:** follow up on the GitHub Support billing-lock ticket; re-run the CI runs `42546995954` (#111), `42546156739` (#110) and `42546379616` (`main`) once it's lifted.
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
