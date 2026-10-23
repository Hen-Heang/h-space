# Roadmap

## Current focus — Luyra

- Luyra is the only active product surface.
- Hengo goals, tasks, habits, Today, and learning development is paused.
- The paused code remains in the repository so it can be resumed later without a rebuild.
- Current work should deepen Luyra backend behavior, tests, reporting, and deployment.

## Phase 1 — Foundation

- [x] Auth (Supabase, login/logout, protected routes)
- [x] User sync (`ensureAppUser`, Neon `users` table)
- [x] Tasks CRUD (create, list, edit, complete/reopen, delete; `/tasks` with status + priority filters)
- [x] Goals CRUD (create, list, edit, progress, pause/resume/complete, delete; `/goals` with status filter)
- [x] Today Tasks (remaining/overdue counts, quick add)
- [x] Today Goals (active goals with progress, quick add)

## Phase 2

- [x] Finance integration foundation (isolated Money Flow Supabase session)
- [x] Read-only Finance dashboard test slice
- [ ] Luyra transactions, budgets, savings, analytics, and settings
- Habits
- Reminders

## Phase 3 — Paused

- [x] Learning integration foundation (shared Hengo/Luyra session)
- [x] Read-only Learning dashboard test slice
- [ ] Hengo vocabulary, daily study, interview, and progress routes — paused
- Notion — paused
- AI assistant — paused

## Phase 4

- Spring Boot backend migration (see [ARCHITECTURE.md](./ARCHITECTURE.md))
