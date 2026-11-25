# HANDOFF

## Snapshot

- **Updated:** 2026-11-25.
- **Checkout:** `main` at `be7fcbf` (#144, #145 and #146 merged). The owner's checkout still has unrelated uncommitted work that isn't ours: a whitespace-only change to `apps/web/lib/api/finance-client.ts`, plus untracked `false`, `v.title`, `luyra-web/`, `second-brain/.claudian/` and `second-brain/.obsidian/workspace.json`. Leave them alone.
- **#144 merged: Finance requires two-step verification on an account that has it** (`fix/finance-require-mfa`, merge `ba03e5e`).
  - `requireFinanceSession` (`lib/server/finance/auth.ts`) answers **403 `MFA_REQUIRED`** to an `aal1` session when the account has a verified authenticator. Same rule as the sign-in gate and `kori_mfa_requirement_met()`, which can't cover finance because it lives in Neon.
  - Accounts without an authenticator are unaffected; the crons use `CRON_SECRET`.
  - The token helpers moved to `lib/server/session-mfa.ts`; the vault re-exports them and keeps its stricter rule.
- **#145 merged: the H-Vault card no longer says passwords stay in Bitwarden** (`fix/vault-project-copy`, merge `a3e95e3`). `lib/projects.ts` (public landing page and My Apps) now describes browser-side encryption and "Independent security review pending"; the delete dialog and a nav comment were fixed too.
- **#146 merged: H-Vault reset and keyset replacement need a fresh code and are capped** (`feat/vault-step-up`, merge `be7fcbf`).
  - **Fresh code:** `requireRecentMfa` (`lib/server/vault/auth.ts`) requires the newest `totp` entry in the verified token's `amr` to be at most 5 minutes old, else 403 `VAULT_STEP_UP_REQUIRED`. Creating the first keyset needs no code.
  - **Browser:** `VaultStepUpDialog` verifies a code with `mfa.challengeAndVerify` on the browser's own session, and `lib/api/vault-http.ts` resends the request once.
  - **Cap:** at most 5 replacements plus resets per user per hour, counted from the user's `audit_logs` rows in the same statement as the write; over it, 429 `VAULT_RATE_LIMITED`.
  - **Needs one more grant** on the not-yet-created `vault_app` role: `grant select (user_id, event_type, created_at) on audit_logs to vault_app;` (added to the role SQL in `docs/SPRING_EXIT_PLAN.md`). Without it only reset and keyset replacement fail.
  - **SQL checked on a throwaway local PostgreSQL 18** as a role with exactly those grants: 5 replacements pass, the 6th is refused, a reset over the cap deletes nothing, and the role can't read other `audit_logs` columns.
  - **Not verified:** that Supabase's `amr` carries timestamps for this project (it fails safe: the action keeps asking and is refused), and the dialog in a browser.
- **Local checks (#146, the last):** `pnpm test` 231 files / 2,529 tests, `tsc` clean, lint 0 errors / 6 old warnings, Prettier clean, `pnpm build:web` passed. CI passed on all three PRs.
- **Neon is back, now on a paid plan.** The owner moved the Neon org to the **Launch** plan (usage-billed) on 2026-11-25; the `h-space-api` project came back at 01:20 UTC with a new consumption period. Finance (Neon `luyra`) should load again; **not checked in the browser**.
  - Outage cause, verified with `neonctl operations list`: the compute ran without a single suspend from 2026-11-09 18:41 to the quota cut-off on 2026-11-19 12:04 UTC. Each Spring prod pool kept one idle connection (`minimum-idle: 1`) and HikariCP pings it every 2 minutes, so Neon's 5-minute suspend never triggered. Fixed in h-space-api #39 (`minimum-idle: 0`, 60 s idle timeout). `docs/SPRING_EXIT_PLAN.md` "Why" is corrected here; it used to blame `api-core`'s pool settings, which each module's own `application-prod.yml` overrides.
  - The project's default compute ceiling is **8 CU** (`neonctl projects get`); the real compute's setting wasn't readable with `neonctl`.
- **h-space-api is now a learning sandbox, not archived** (owner, 2026-11-25). It deploys to **Railway** (project `tranquil-learning`, service `h-space-api`, Hobby plan, from `main`). h-space-api #39 and #40 (Dockerfile without the Gradle cache mount Railway rejects) are merged. At the last check the service had **no variables**, so it can't start yet. The web app still doesn't call it, and it must use its **own** database and no `SUPABASE_*` variables.
- **Railway also has two offline legacy projects** with Postgres volumes: `zucchini-simplicity` (`koriai-backend`, the old `apps/api`, build failed 4 months ago) and `vstv-api`. Railway usage this period: $0.00.

## Current focus

1. **Owner, Neon console:** set the `h-space-api` compute's autoscaling maximum to 0.25–1 CU and confirm scale-to-zero (5 min). Then open `/finance` to confirm the data loads.
2. **To bring H-Vault back (needs owner approval):** create `vault_app` with the SQL in `docs/SPRING_EXIT_PLAN.md` (now with the `audit_logs` column grant; use SQL, not Neon's "New role" button), test it on a Neon branch, set `VAULT_DATABASE_URL` in Vercel, unlock `/vault`. Then **change the master password once**: the code prompt should appear and the change succeed. That confirms `amr` has timestamps. If a correct code is still refused, it doesn't (see `latestTotpAt`). Then copy any Spring-only `inbox_items`.
3. **Owner, Railway sandbox:** a separate database (new Neon project or Railway Postgres, never `hspace`/`luyra`), then the variables (`SPRING_PROFILES_ACTIVE=prod`, `DB_*`, new `JWT_SECRET` and `MFA_ENCRYPTION_KEY`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`, `OWNER_EMAIL`). Afterwards check the deploy log and that the new database suspends after 5 quiet minutes.
4. **Owner, Supabase dashboard:** Google provider client ID, `{{ .Token }}` in the Magic link template, the reset-password redirect URLs.
5. **Owner:** enroll an authenticator and a backup under Settings → Security (Finance then requires the code too, #144); apply the MFA database rule only with an explicit go-ahead.
6. **Owner, security:** confirm the old VPS and its `.env` (Supabase service-role key, legacy JWT secret) are destroyed; decide on rotating the legacy Supabase JWT secret (affects Orbit). Delete `NEXT_PUBLIC_DATA_SOURCE_INBOX`, `NEXT_PUBLIC_AUTH_API_URL` and `NEXT_PUBLIC_HSPACE_API_URL` from Vercel and `apps/web/.env.example`.
7. **Idea, not planned yet:** an isolated `engineering-api` in h-space-api (project registry, Neon usage guard, CI status), verifying Supabase tokens through the project's JWKS, on its own Neon project.
8. **Open PRs to decide:** h-space #116 (old MCP handoff; conflicts with `main`; includes a migration) and h-space-api #37 (MCP OAuth through Spring; outdated since MCP is back on Supabase OAuth). Likely close both. h-space-api branch `chore/dependabot-and-client-ip` (Dependabot + trusted-proxy client IP, no PR).
9. **Carried over:** the independent H-Vault audit (must now cover `/api/vault` with step-up and the cap) and restore drill; Finance D–F follow-ups (`apps/web/docs/finance-redesign.md` §7); MCP live checks; UI audit follow-ups; whether `apiError`'s 500 path should log only the error's name and SQLSTATE; paused habits (a "Pause" action and list); stale docs (`README.md` "two backends", `docs/ECOSYSTEM-INTEGRATION.md` "doesn't call Neon", `docs/MONOREPO_MIGRATION.md`, `.env.example`); unused `@sentry/nextjs`, `zustand`, `@tanstack/react-table`; Playwright and the Supabase SQL test aren't run in CI.

## Notes for the next session

- **Windows machine:** `python` is the Microsoft Store stub, so edit files with the editor tools or `node`. `pnpm build:web` needs `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1` here, or `next/font` can't fetch Google Fonts through TLS inspection. Same flag for `pnpm dev:web`.
- **Merging:** the agent can't merge here (`.claude/settings.json` denies `gh pr merge`). The owner runs `! gh pr merge <n> --merge --repo Hen-Heang/h-space`; the `--repo` matters when the session was started in h-space-api. Confirm with `gh api repos/Hen-Heang/h-space/pulls/<n>`.
- **Worktrees for agent work:** the owner's checkout has uncommitted files, so this session worked in `git worktree add -b <branch> <dir> origin/main` (plus `pnpm install --frozen-lockfile`) and removed each worktree after its merge.
- **Neon, read-only:** `neonctl` is installed and signed in. Pass `--org-id` (from `neonctl orgs list`) and `< /dev/null`, or it waits on an interactive prompt. `neonctl operations list --project-id <id>` shows when the compute started and suspended; it's control-plane only and doesn't wake the compute.
- **Screenshots at phone width:** the Chrome extension's `resize_window` doesn't shrink a maximized window. A short Node script with `@playwright/test`'s `chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" })` and a 375px viewport works.
- **Checking signed-in UI without the owner's password:** a throwaway dev-only route that renders the page inside its own `QueryClientProvider` with a fake API works well. Delete it before committing.
- **Chrome:** several browsers are connected. The first `navigate` after creating a tab sometimes doesn't stick, so navigate twice and confirm the URL. Don't reuse the owner's tab.
- **Stashes:** `stash@{0}` and `stash@{1}` (2026-11-09 handoff notes) are covered by #141. Drop them only with the owner's OK.
- **Merged branches still on origin:** `fix/finance-require-mfa`, `fix/vault-project-copy`, `feat/vault-step-up`, `docs/handoff-history-mcp-live`, `feat/habits-daily-checkin`, plus the older ones in the 2026-11-22 entry. Delete only with the owner's OK.
- Production logs: `vercel logs --project h-space --since 15m --level error --expand` from `apps/web`.
- Agents can't enter passwords.
