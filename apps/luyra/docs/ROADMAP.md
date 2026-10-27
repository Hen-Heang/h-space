# Roadmap

## Current focus — Luyra

- Luyra is the only active product surface.
- Hengo goals, tasks, habits, Today, and learning development is paused.
- The paused code remains in the repository so it can be resumed later without a rebuild.
- Finance is the active product surface. Transactions, budgets, savings,
  analytics, financial reviews, reports, preferences, and notifications have
  current app/API implementations. Keep the paused Hengo routes redirecting to
  `/finance` unless a separately reviewed product decision changes that scope.

## Phase 1 — Foundation

- [x] Auth (Supabase, login/logout, protected routes)
- [x] User sync (`ensureAppUser`, Neon `users` table)
- [x] Tasks CRUD (create, list, edit, complete/reopen, delete; `/tasks` with status + priority filters)
- [x] Goals CRUD (create, list, edit, progress, pause/resume/complete, delete; `/goals` with status filter)
- [x] Today Tasks (remaining/overdue counts, quick add)
- [x] Today Goals (active goals with progress, quick add)

## Finance

- Finance transaction, category, budget, savings, analytics, review, report,
  recurring transaction, and settings routes are present in the active source.
- Telegram, email, Web Push, AI Money Coach, exchange-rate lookup, Vercel Cron,
  and Vercel Workflow integrations are configured in source; deployment
  credentials and production execution require separate verification.

## Phase 3 — Paused

- [x] Learning integration foundation (shared Hengo/Luyra session)
- [x] Read-only Learning dashboard test slice
- [ ] Hengo vocabulary, daily study, interview, and progress routes — paused
- Notion — paused
- AI assistant — paused

## Future

- Spring Boot backend migration (see [ARCHITECTURE.md](./ARCHITECTURE.md))
