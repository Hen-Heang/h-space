# H-Space — Claude Code Project Guidance

## Mission and product success

H-Space is a **private-by-default, everyday personal operating space**, not just a demo or Korean-learning site. Its purpose is to help its owner find their applications, plan work and life, follow goals, understand money, receive useful reminders, and eventually protect account credentials. Ship small, dependable improvements that are genuinely useful each day while practicing professional software engineering, Spring Boot, PostgreSQL, testing, and DevOps.

Product promise: **My Projects. One Space.** Keep the Hengo Learning experience and existing data intact. Favor simple workflows, fast mobile UX, reliable sync, accessibility, and maintainability over feature count.

### Product domains and outcomes

1. **My Apps / hub:** searchable app catalog, meaningful app links, favorites, quick access, reliable navigation across desktop and iPhone.
2. **Planner:** goals, tasks, due dates, priorities, recurring routines, progress tracking, and a useful daily dashboard.
3. **Reminders:** opt-in push/email notifications with timezone support (default user setting, not a hard-coded timezone); deduplication, retry safety, and preferences. Never assume reminders are delivered without observability.
4. **Luyra / finance:** finance stays independently deployable for now; provide a clear entry point from H-Space. Design future consolidated views with precise amounts, consistent USD/KRW conversion rules, and explicit transaction ownership. Do not silently migrate money records.
5. **H-Vault / credentials:** an eventual sensitive-data vault for saved accounts and usernames. Treat existing UI as untrusted for real secrets until a dedicated security design, audit, and recovery plan are completed. Do **not** store real personal passwords in a prototype.
6. **Learning, Notes, Growth, AI:** retain current Hengo functionality; add only when it improves the daily workflow.

## Current architecture — inspect before changing

- This repository: Next.js 16 / React 19 / TypeScript / Tailwind v4 pnpm workspace. `apps/web` is the main hub; `apps/luyra` is a separately deployable finance app.
- Separate backend: `Hen-Heang/h-space-api`, Java 17, Spring Boot 3.5, Gradle multi-module (`api-core`, `security-api`, `open-api`). Current verified web integration is **authentication**, not the sample todo API.
- H-Space web domain data still uses Supabase/PostgreSQL with Row Level Security. The Spring authentication service issues JWTs and currently provides a **temporary Supabase token bridge**. Treat this as migration compatibility; never expand it into a permanent new-feature dependency.
- Luyra has its own deployment and database decisions; do not merge or reconfigure it as a side effect of hub work.
- This repository has detailed instructions in `AGENTS.md`, `HANDOFF.md`, and `apps/web/CLAUDE.md`; read them and relevant source code. Older prose can lag behind the current auth integration. Do not revive the removed `apps/api` folder.
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

## Claude Code working agreement

1. Read `HANDOFF.md`, root `AGENTS.md`, the nearest app-level `CLAUDE.md` and `AGENTS.md`, plus the specific code and tests. Verify actual branches and file paths.
2. Restate the user problem, existing behavior, acceptance criteria, impacted domain, data ownership, and security/privacy risks. For architectural changes, **propose a small plan first**.
3. Change the narrowest appropriate area. Keep old routes, stored identifiers, nav semantics, Supabase RLS, and Luyra deployment untouched unless the task explicitly requires a migration.
4. Update or add targeted tests for success, validation, authorization failures, and edge cases; do not fabricate passing results.
5. Frontend checks from repo root: `pnpm lint`, `pnpm test`, `pnpm build`. For backend changes use the separate repo's `./gradlew clean build` and module tests. Report checks that could not run.
6. Summarize changed files, user-visible behavior, security considerations, results, and rollback path. Link implementation work to Notion tasks/decisions when relevant, without exporting runtime user content.
7. Never expose secrets, bypass authorization/MFA for convenience, alter live data without explicit direction, or push/deploy unrelated changes. Prefer a reviewable branch and pull request.

## Definition of done

A feature is done only when its user value is clear, data ownership is documented, migration/backward compatibility is addressed, mobile/desktop states are usable, authorization and negative-path tests pass, build checks pass, and deployment + backup/rollback impact is reviewed. Clearly label anything planned, unverified, or not yet production safe.
