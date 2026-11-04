# H-Space — agent instructions

Shared instructions for every coding agent: Codex reads this file directly and
Claude Code imports it from `CLAUDE.md`. Edit rules here, not in a tool-specific
file, so the agents never disagree. App-level rules: `apps/web/AGENTS.md`.

## Session continuity

Read `HANDOFF.md` first, before exploring the repo — it's a live snapshot of
current focus, recent changes, and open items. Only read `HANDOFF_HISTORY.md`
if older context is actually needed (its latest five entries are usually
enough).

Before ending a session that changed meaningful state, move `HANDOFF.md`'s
current content into a new dated entry at the top of `HANDOFF_HISTORY.md`,
then overwrite `HANDOFF.md` with the new snapshot.

## Repository

H-Space is a small monorepo with two independently deployable applications:

- `apps/web`: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- `apps/luyra`: standalone Next.js Finance app with its own npm lockfile and
  Vercel deployment configuration

Auth is h-space-api (Spring); domain data still lives in Supabase under RLS,
reached through a temporary token bridge. The only server-side code here is
the Next.js route handlers in `apps/web/app/api` (`ai/*` and the Notion
capture route in `integrations/notion`). Read the instructions nearest to the files being
changed — the frontend has additional instructions in `apps/web/AGENTS.md`.

The Spring Boot API that used to live at `apps/api` was removed on 2026-09-22;
see `docs/MONOREPO_MIGRATION.md` for where to recover it if it's ever needed.

## Commands

Use pnpm for repository and frontend commands.

```bash
pnpm dev
pnpm dev:web
pnpm lint
pnpm test
pnpm build
pnpm test:web
pnpm build:web
```

## Boundaries

- Keep frontend domain calls in `apps/web/lib/api`.
- Keep reusable frontend primitives generic in `apps/web/components/ui`.
- Recovery features must remain domain-neutral; never name a specific
  compulsive behavior in code, copy, tests, seed data, comments, or commits.
- `apps/web/dev-learning-notes` is an unrelated embedded project; do not wire it
  into Hengo.
- Do not re-import the Spring backend, and do not push anything from here to the
  `Hen-Heang/hengo-api` backup repository.

## Deployment layout

- H-Space Vercel project Root Directory: `apps/web`.
- Luyra Vercel project Root Directory: `apps/luyra`; keep its existing project,
  domain, and production configuration unchanged until an approved cutover.

## Mission and product success

H-Space is a **private-by-default, everyday personal operating space**, not just a demo or Korean-learning site. Its purpose is to help its owner find their applications, plan work and life, follow goals, understand money, receive useful reminders, and eventually protect account credentials. Ship small, dependable improvements that are genuinely useful each day while practicing professional software engineering, Spring Boot, PostgreSQL, testing, and DevOps.

Product promise: **My Projects. One Space.** Keep the Hengo Learning experience and existing data intact. Favor simple workflows, fast mobile UX, reliable sync, accessibility, and maintainability over feature count.

### Product domains and outcomes

1. **My Apps / hub:** searchable app catalog, meaningful app links, favorites, quick access, reliable navigation across desktop and iPhone.
2. **Planner:** goals, tasks, due dates, priorities, recurring routines, progress tracking, and a useful daily dashboard.
3. **Reminders:** opt-in push/email notifications with timezone support (default user setting, not a hard-coded timezone); deduplication, retry safety, and preferences. Never assume reminders are delivered without observability.
4. **Luyra / finance:** finance stays independently deployable for now; provide a clear entry point from H-Space. Design future consolidated views with precise amounts, consistent USD/KRW conversion rules, and explicit transaction ownership. Do not silently migrate money records.
5. **H-Vault / credentials:** a sensitive-data vault for saved accounts, usernames and optional passwords, end-to-end encrypted in the browser and synced through h-space-api `hub-api` (design: h-space-api `docs/vault-design.md`; recovery key, MFA required). **Live in production since 2026-11-01, turned on by the owner before the independent security audit, which is still required.** Until that audit and a restore drill are done, treat the vault as unreviewed: don't widen it, don't claim zero-knowledge, and fix findings promptly.
6. **Learning, Notes, Growth, AI:** retain current Hengo functionality; add only when it improves the daily workflow.

## Current architecture — inspect before changing

- This repository: Next.js 16 / React 19 / TypeScript / Tailwind v4 pnpm workspace. `apps/web` is the main hub; `apps/luyra` is a separately deployable finance app.
- Separate backend: `Hen-Heang/h-space-api`, Java 17, Spring Boot 3.5, Gradle multi-module (`api-core`, `security-api` for auth, `hub-api` for the Inbox and H-Vault, a `finance-api` scaffold, and the `open-api` sample). Verified web integrations are **authentication** and **H-Vault** (`/api/hub/vault`), not the sample todo API.
- H-Space web domain data still uses Supabase/PostgreSQL with Row Level Security. The Spring authentication service issues JWTs and currently provides a **temporary Supabase token bridge**. Treat this as migration compatibility; never expand it into a permanent new-feature dependency.
- Luyra has its own deployment and database decisions; do not merge or reconfigure it as a side effect of hub work.
- This repository has detailed instructions in `AGENTS.md`, `HANDOFF.md`, and `apps/web/AGENTS.md`; read them and relevant source code. Older prose can lag behind the current auth integration. Do not revive the removed `apps/api` folder.
- Product and engineering planning: [H-Space Notion Project Hub](https://app.notion.com/p/3b9acd8b74508151ac22ecff24718832). **GitHub** owns code, tests, and runtime configuration; **Notion** owns plans, decisions, and delivery notes; **databases** own runtime user data. Never copy secrets or private content into Notion.

## Non-negotiable security requirements

- **Authentication is not vault encryption.** `h-space-api` already provides email-code login, verified Google ID-token login, refresh-token rotation, and optional TOTP MFA compatible with an iPhone authenticator application. Reuse and integration-test these flows rather than creating a second identity provider. For sensitive vault actions, design step-up authentication and safe session expiry.
- Prefer **TOTP MFA** over email as the second factor; email codes can support sign-in/verification but are not equivalent to an independent possession factor. Require explicit MFA enrollment confirmation, one-time backup codes, replay resistance, rate limits, and safe recovery.
- Before any real credential storage: write a threat model and cryptography design, get an independent security review, and test recovery/backup flows. The target is client-side authenticated encryption of vault records with independently generated nonces and a key derived from a user-controlled secret using a reviewed KDF. Store only versioned ciphertext, never plaintext passwords or a decryptable master secret on the server. Do not call a feature `zero-knowledge` until the complete flow has been verified.
- Authentication passwords are **hashed** with a vetted adaptive password-hashing algorithm, not reversibly encrypted. Vault contents need **authenticated encryption**, not hashing.
- No passwords, codes, token values, database URLs with credentials, encryption keys, or actual personal finance records in commits, fixtures, screenshots, logs, analytics, AI prompts, or Notion. No `.env` files in Git.
- Enforce authorization on the **server** and/or database RLS, never only in UI route guards. Validate ownership on every record operation. Audit security-relevant actions without logging secrets. Protect against common web attacks and test the denial paths.
- All production apps require HTTPS, secure secret handling, least-privilege database access, reliable backups with **restore drills**, monitoring/alerts, and a documented incident and recovery plan before storing high-impact data.

## Incremental development strategy

Use **vertical slices** (data model + API + authorization + frontend + tests) and preserve existing user data.

1. **Stabilize foundations first:** inspect repo state and existing features; fix auth/session integration tests across the web and Spring API; test email login, TOTP challenge, refresh rotation, logout, and Supabase RLS token bridging.
2. **Everyday utility next:** improve My Apps, goals/tasks, dashboard, and reminder preferences with small, testable features. Do not duplicate existing Supabase goals/tasks tables without a written migration plan.
3. **Backend practice deliberately:** for a new server-owned domain, propose a Spring Boot REST contract, Flyway migrations, proper authorization, JUnit tests, and a Next.js domain client. Decide the long-term owner of each domain before migrating existing Supabase data. Keep `open-api` explicitly a sample until integrated with contracts and tests.
4. **Finance integration:** keep Luyra independently deployable; link/integrate at the product experience level first. Any real financial data migration needs reconciliation and rollback.
5. **Vault last:** security design, independent review, encryption/recovery tests, and only then real-secret use. A polished UI is **not** a security sign-off.

### Infrastructure and DevOps learning

- Use local PostgreSQL, Gradle, pnpm, and Docker/Compose while learning; maintain staging/prod separation.
- Preserve existing Vercel deployment boundaries for `apps/web` and `apps/luyra`. Spring deployment can be containerized on a managed platform or a small Linux VPS after cost, region, operational risk, and backup planning are reviewed. Hosting provider is **not yet a committed architecture decision**.
- Existing Supabase data/RLS remains the source of truth until a tested migration. Do not point Spring at a shared production database or apply live schema changes without an explicit decision and backup.
- Practice GitHub Actions CI, Docker image builds, non-root containers, migrations, release tagging, health checks, HTTPS reverse proxy, infrastructure documentation, and rollback. Never deploy automatically just because a task request mentions DevOps.

## Secrets and the live database

- Never read, print or commit `.env`, `apps/*/.env.local`, `.vercel/`, keys or
  credential files. Real values live in `.env.local` (git-ignored) and Vercel.
- `NEXT_PUBLIC_*` values ship to the browser — never give a server secret
  (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, …) that prefix. No app code
  uses the service-role key (its one use left with the Google Calendar
  integration on 2026-11-04); don't add one.
- This repository is **public**. A real-looking secret in a tracked file is an
  incident: report it so it can be rotated — removing the line doesn't
  un-publish it.
- Supabase is the **live database shared with Orbit**: never apply, reset or
  repair migrations, or run SQL against it, without explicit approval for
  that change. No production Vercel deploys or env changes from an agent.

## H-Vault (browser side)

The vault is live with real data and its security review is pending. Only
`v2.` ciphertext may leave the browser; never persist or log the master
password, recovery key or vault key; keep vault data out of Sentry,
analytics, AI routes and prompts; keep `lib/csp.ts` tight; no new secret
fields, sharing or export. Full rules: `.claude/rules/vault.md`,
`apps/web/docs/h-vault.md`.

## Git

- Never commit or push unless explicitly asked, and never on `main` — use a
  feature branch and a PR.
- Stage explicit file paths only (no `git add -A` / `.`); the owner edits
  concurrently.
- No force push, `reset --hard`, `clean`, `rebase`, amend or branch deletion
  without explicit confirmation, and never to get past a failing hook.

## Working agreement

1. Read `HANDOFF.md`, root `AGENTS.md`, the nearest app-level `AGENTS.md`, plus the specific code and tests. Verify actual branches and file paths.
2. Restate the user problem, existing behavior, acceptance criteria, impacted domain, data ownership, and security/privacy risks. For architectural changes, **propose a small plan first**.
3. Change the narrowest appropriate area. Keep old routes, stored identifiers, nav semantics, Supabase RLS, and Luyra deployment untouched unless the task explicitly requires a migration.
4. Update or add targeted tests for success, validation, authorization failures, and edge cases; do not fabricate passing results.
5. Frontend checks from repo root: `pnpm lint`, `pnpm test`, `pnpm build`. For backend changes use the separate repo's `./gradlew clean build` and module tests. Report checks that could not run.
6. Summarize changed files, user-visible behavior, security considerations, results, and rollback path. Link implementation work to Notion tasks/decisions when relevant, without exporting runtime user content.
7. Never expose secrets, bypass authorization/MFA for convenience, alter live data without explicit direction, or push/deploy unrelated changes. Prefer a reviewable branch and pull request.

## Definition of done

A feature is done only when its user value is clear, data ownership is documented, migration/backward compatibility is addressed, mobile/desktop states are usable, authorization and negative-path tests pass, build checks pass, and deployment + backup/rollback impact is reviewed. Clearly label anything planned, unverified, or not yet production safe.
