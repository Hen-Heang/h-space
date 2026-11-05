# Orbit → KoriAI Integration

> **Update (July 2026):** the "Backend: Spring Boot, no Supabase" decision below was later
> reversed — the whole app now runs on the shared Supabase project (see CLAUDE.md). This
> document is kept as the historical feature-porting checklist only.

Source-of-truth checklist for folding **Orbit / DailyGoalMap** (Vite + TanStack Router + Supabase
goal-tracking PWA, source at `C:\Practice\Full-Stack\dailygoalmap`) into **KoriAI** (Next.js 16 App
Router). The goal is a UI integration that loses **no feature or function** from either app.

## Decisions (locked)

| Topic       | Decision                                                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend     | Extend KoriAI's existing **Spring Boot** API. Goals/tasks become new endpoint groups in `lib/api.ts`. No Supabase. (Backend Java work tracked separately — frontend ships against the contract below.) |
| Auth        | **Unify on KoriAI auth** (`lib/auth-store.ts` JWT). Orbit's Supabase auth is dropped. Goals scoped to the JWT user.                                                                                    |
| First scope | **Core tracking** only. AI / realtime / PWA / sharing / gcal / PDF / analytics are _deferred_, with documented seams (not stubs).                                                                      |
| Routing     | Namespaced under **`/goals`** to avoid colliding with KoriAI's study `/dashboard` + `DailyGoalRing` (a _study-minutes_ goal, a different concept).                                                     |
| Naming      | Tracker is surfaced as **"Goals"** in nav. The product-name "Orbit" is not used in UI.                                                                                                                 |

## Route map (Orbit → KoriAI)

| Orbit route                              | KoriAI route                          | Status |
| ---------------------------------------- | ------------------------------------- | ------ |
| `/dashboard` (goal list)                 | `/goals`                              | ☐      |
| `/goal/$id`                              | `/goals/[id]`                         | ☐      |
| `/goal/create` (template picker)         | `/goals/create`                       | ☐      |
| `/goal/create-custom`                    | `/goals/create/custom`                | ☐      |
| `/goal/create-from-template/$templateId` | `/goals/create/template/[templateId]` | ☐      |
| `/calendar` (personal tasks)             | `/goals/calendar`                     | ☐      |

## API contract (to add to `lib/api.ts`, envelope-unwrapped `r.data.data`)

```
GET    /goals                     list (filters: status; includes taskCounts)
POST   /goals                     create
GET    /goals/{id}                detail
PUT    /goals/{id}                update (title, desc, dates, status, metadata)
DELETE /goals/{id}                delete (cascades tasks)
POST   /goals/{id}/star           toggle star/pin
GET    /goals/{id}/tasks          tasks for a goal
GET    /tasks?from=&to=&goalId=   calendar range / today's tasks (goalId optional, null = personal)
POST   /tasks                     create
PUT    /tasks/{id}                update (incl. toggle completed)
DELETE /tasks/{id}                delete
```

IDs are **UUID strings** (matches Orbit's types). `goal.metadata` stays a JSON blob (JSONB on the
backend) to preserve Orbit's flexible `GoalMetadata` without column sprawl.

---

## CORE features — must port (the "don't miss anything" list)

Legend: ☐ todo · ◐ in progress · ☑ done

### Goals — list / dashboard (`components/dashboard/*`, `pages/Dashboard.tsx`) → `components/goals/*`, `app/(main)/goals/page.tsx`

- ☑ Grid vs List view toggle (persisted `dg_goal_view`)
- ☑ Sort: title A-Z/Z-A, due date asc/desc, status, created — **starred float to top** (`GoalSorter`, `useGoals`)
- ☑ Filter tabs: All / Active / Completed (archived hidden)
- ☑ Pagination (4/page, prev/next, page indicator)
- ☑ Goal card: progress badge (`x/y tasks`), deadline status badge, day countdown, emoji/icon, member avatars
- ◐ Card actions menu: Edit ☑, Delete ☑ · Mark Complete / Archive / Leave → pending (need `useGoalStatus`, sharing)
- ☑ Star/pin toggle (optimistic, `goalsApi.toggleStar`)
- ☑ Inline icon (emoji) picker with optimistic toast (compact `EmojiIconPicker`)
- ☑ Staggered entrance / hover-lift / tap-scale animations (`motion/react`)
- ☑ Cmd/Ctrl+K search seam (search feature deferred — toast placeholder)
- ☑ Deadline banner (overdue/approaching) via `getDeadlineNotificationMessage`

### Goals — detail (`pages/GoalDetail.tsx`)

- ☐ Overview: progress bar, completion count, summary
- ☐ Tasks tab → embedded Calendar
- ☐ Settings tab: complete / archive / reactivate, extend deadline
- ☐ Edit goal (slide panel + advanced form)
- ☐ Deep-link `?taskId=&date=` opens a task
- ☐ Tab persistence
- _Deferred tabs (seam only):_ Members (sharing), Analytics, AI chat, Themes

### Goals — create (`pages/TemplateSelection.tsx`, `goal-form/*`, `data/goalTemplates`)

- ☐ Template picker: search, category filter, 2-col grid (18 templates / 8 categories)
- ☐ Quick Launch: title + "No Duration" → create → detail
- ☐ Create-from-template (hydrate form from template)
- ☐ Custom multi-step form: Basics → (Travel if travel type) → Advanced
- ☐ Basics: title*, description, target date, goal type
- ☐ Travel: destination, accommodation, transportation, budget, activities multi-select
- ☐ Advanced: priority, category, milestones (add/remove), AI-generate toggle (seam)
- ☐ Zod validation, step progress indicator
- _Note:_ AI task auto-generation is deferred → toggle stays, calls a seam.

### Goals — edit / delete

- ☐ EditGoalSlidePanel: title, desc, start/target date, "No Duration", type, icon; hydrate-on-open, cancel reverts
- ☐ DeleteConfirmDialog: confirm, cascade tasks, page clamp

### Tasks — calendar (`components/calendar/*`)

- ☐ Day view (time grid, 24h, auto-scroll to now)
- ☐ Week view (desktop, 7-col grid)
- ☐ Month view (grid, task dots, click day → day view)
- ☐ Header nav (prev/today/next), view switcher, range label
- ☐ Tap time slot → AddTaskDialog with time pre-fill
- ☐ Task click → details panel (mobile bottom sheet) / sidebar (desktop)
- ☐ Keyboard up/down between tasks
- ☐ Completion celebration overlay
- ☐ Standalone personal calendar (`goalId` null)
- _Realtime patching is deferred → replaced by Query invalidation._

### Tasks — create / edit / delete (`AddTaskDialog`, `EditTaskDialog`, `TaskFormFields`)

- ☐ Fields: title*, description, start/end date, is-anytime, daily start/end time, color (8 presets + hex), completed
- ☐ End-date/time auto-bump to keep duration (same-day)
- ☐ Anytime mode hides time fields
- ☐ Goal-window clamp + range hint warning
- ☐ `duration_minutes` calc (`calcDurationMinutes`)
- ☐ Delete with 5s **undo**
- ☐ Optimistic add

### Tasks — Today's Tasks widget (`dashboard/TodaysTasks.tsx`)

- ☐ Goal multi-select filter (persisted `dg_todays_tasks_selected_goals_v1:{userId}`)
- ☐ Quick add (Enter submits, personal task)
- ☐ Progress bar + counter
- ☐ Overdue red indicator, completed strikethrough/section toggle
- ☐ Multi-select mode + "mark all complete" + undo
- ☐ Mobile collapsible

### Task details panel (`TaskDetailsPanel` / `TaskDetailsSidebar`)

- ☐ Color bar + completion checkbox + title
- ☐ Date/time range formatting, anytime label
- ☐ Markdown description, tags, created/updated relative time, duration
- ☐ Actions: complete, edit, delete, (share/add-to-calendar = seams)

### Shared utils / logic to port

- ☐ `goalDeadlineUtils.ts` → status, daysRemaining, urgency, progress%, suggestions, styling
- ☐ `taskDateUtils.ts` → filterTasksByDate, anchor date, date/time range formatting
- ☐ `taskColors.ts`, `timeGrid.ts` (bumpEndAfterStart, hhmmToMinutes), task normalization
- ☐ `DeadlineStatusBadge`, deadline styling
- ☑ Date/time input — **decided:** build a lightweight `DateTimePicker` (native `<input type=date|datetime-local>`)
  mirroring Orbit's `AriaDateTimePicker` API (`value: Date | null`, `onChange`, `granularity: "day"|"minute"`,
  `min`/`max`). Avoids pulling in `react-aria-components` + `@internationalized/date`. Same prop shape → ported
  forms/dialogs work unchanged.

### Types

- ☐ `Goal`, `GoalMetadata`, `GoalData`, `SortOption`, `GoalTemplate`, `GoalDeadlineInfo` → `lib/goals.ts`
- ☐ `Task`, `TaskTag` (+ helpers) → `lib/tasks.ts` (drop `@supabase/supabase-js` `User` import)

---

## DEFERRED features — out of first cut, **seam only** (do NOT delete from Orbit; track here)

Each gets a no-op/clearly-marked seam in the UI so the entry point survives and re-enabling later is additive.

- ☐ AI chat widget + agent orchestrator + task auto-generation (`services/ai/*`, `goal/chat/*`)
- ☐ AI workspace files / embeddings / semantic search
- ☐ Realtime + in-app notifications + NotificationBell (`services/internalNotifications`, `notificationService`)
- ☐ Goal sharing / members / invitations (`goal/sharing/*`, `useGoalSharing`)
- ☐ Smart Analytics dashboard (recharts) + PDF export
- ☐ Google Calendar sync (`googleCalendarSync`)
- ☐ PWA install / offline sync / service worker / push / Telegram
- ☐ Goal themes (image uploads) (`ThemeSelector`, `useGoalThemes`)
- ☐ Global search modal (`search/*`, `useSearch`) — Cmd/K seam already wired on dashboard
- ☐ Profile / account / API-key manager / model selector (KoriAI has its own `/settings`)
- ☐ Static pages About/Privacy/Terms/Security (KoriAI has its own)
- ☐ Performance monitor / route cache / preloader (App Router handles code-split natively)

---

## KoriAI touchpoints — reuse, don't duplicate / don't break

- App shell `app/(main)/layout.tsx`: add one sidebar nav entry ("Goals"). Bottom tabs (5) left as-is.
- UI primitives: use `components/ui/*` + unified `radix-ui` package (NOT per-component shadcn). Missing
  ones to add: `alert-dialog` (confirm/undo), possibly `popover`/`calendar` for the date picker.
- API: extend `lib/api.ts` only (no inline axios in components). Keep envelope `r.data.data`.
- State: TanStack Query (provided globally, staleTime 60s). Orbit's manual Supabase fetches → Query hooks.
- Animations `lib/motion.ts`, toasts `sonner`, icons `lucide-react`, theme `next-themes` — already shared.
- ⚠ Do NOT touch `DailyGoalRing` / study dashboard — unrelated concept, kept separate.
