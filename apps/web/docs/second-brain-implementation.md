# Second Brain — Implementation Plan & Audit

Status: **All 6 phases implemented** — Quick Capture Inbox, Notes → Knowledge Library, Journal + Timeline,
Universal Reminders, Ask Hengo, and Daily/Weekly Review. This document is updated at the end of every
phase per the project's checkpoint workflow. A handful of small, explicitly-scoped gaps remain — see
[Deferred work](#deferred-work).

## 1. Current-state audit

Hengo is a client-side SPA over Supabase (`lib/supabase.ts`, single browser client) plus a thin set
of `app/api/ai/*` route handlers — see `CLAUDE.md` for the full architecture. Before adding anything
new, this is what already exists that the second-brain features build on or must not duplicate:

| Capability            | Already exists as                                                                                                           | Notes                                                                                                                                                                                                                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notes                 | `kori_notes` table, `lib/api/notes.ts` (`notesApi`), `/notes` pages                                                         | Slug-keyed, `tags text[]`, `category`, `icon`. No FTS, no goal/task relations, no pin, no source URL. Phase 2 extends this additively.                                                                                                                                                                                            |
| Goals / tasks         | Orbit's shared `goals` / `tasks` tables, `lib/api/goals.ts` (`goalsApi`, `tasksApi`)                                        | Reused as-is; `tasksApi.create` needs `start_date`/`end_date`. Inbox → Task conversion goes through this.                                                                                                                                                                                                                         |
| Habits                | `kori_habits`, `lib/api/habits.ts`                                                                                          | Generic daily check-off.                                                                                                                                                                                                                                                                                                          |
| Recovery              | `kori_focus_*` tables, `lib/api/recovery.ts`, `lib/recovery.ts`                                                             | Domain-neutral by design — timeline aggregation must keep this wording constraint.                                                                                                                                                                                                                                                |
| Activity log          | `kori_activity_log`, `lib/api/progress.ts`                                                                                  | Per-feature session duration; this is _time spent in Hengo_, not a manual real-life activity log — Phase 3 must keep these visually distinct (spec requirement).                                                                                                                                                                  |
| Push / Telegram       | `kori_push_subscriptions`, `kori_telegram_links`, `lib/api/push.ts`, `kori-send-push` / `kori-send-telegram` Edge Functions | Fan-out already handles "one channel failing doesn't block the other" (`kori_dispatch_push`, per README §12). Phase 4 reuses this instead of building new delivery.                                                                                                                                                               |
| Scheduled reminders   | `pg_cron` jobs calling `kori_send_reviews_due_reminders` etc., each with its own once-a-day dedupe stamp on `kori_profiles` | Pattern to imitate for generic reminders' idempotency, not touch.                                                                                                                                                                                                                                                                 |
| Command palette       | `components/app/quick-switcher.tsx` (⌘K / `/`)                                                                              | Global keyboard shortcut is already claimed; Quick Capture must be an entry _inside_ this dialog, not a second global listener (confirmed no other conflict-free combo is registry-tracked — several features register their own page-scoped `keydown` handlers).                                                                 |
| Speech-to-text        | `hooks/useSpeechRecognition.ts` (browser Web Speech API, `ko-KR` default, no server round-trip)                             | Reused as-is for Quick Capture voice input — no new OpenAI cost, already proven at 6 call sites. The separate MediaRecorder+Whisper pattern (`hooks/useAudioRecorder.ts`, Korean Coach) is server-side and not needed here.                                                                                                       |
| Nav                   | `lib/navigation.ts`, single source of truth for sidebar/rail/bottom-bar/more-sheet/quick-switcher                           | `growth-journal` is already a stubbed `soon` entry — Phase 3 fills it in rather than adding a new one.                                                                                                                                                                                                                            |
| Migration conventions | `supabase/migrations/*.sql`                                                                                                 | Lowercase SQL, `create table if not exists`, `(select auth.uid())` (subselect form) in RLS policies, named `if not exists` indexes, `check (jsonb_typeof(x) = 'object')` guards on jsonb columns, enum-like columns via `check (col in (...))` not Postgres enums, **no DB trigger for `updated_at`** — the app sets it on write. |

No existing implementation of inbox capture, journal, universal reminders, AI memory/retrieval, or
daily/weekly review surfaces was found anywhere in the repo (`app/`, `components/`, `lib/`, `hooks/`).

## 2. Architecture decisions

- **New domain files, not `lib/types.ts`.** Every existing feature-sized domain (goals, tasks, habits,
  recovery) has its own `lib/<domain>.ts`; `lib/types.ts` is reserved for chat/vocab/foundations/recovery
  types that predate that convention. New work follows the dominant pattern: `lib/inbox.ts`,
  `lib/journal.ts` (Phase 3), `lib/reminders.ts` (Phase 4), `lib/memory.ts` (Phase 5).
- **`lib/api/<domain>.ts` mirrors `notesApi` exactly**: a plain object of async functions, row↔camelCase
  mapping inline, `requireUserId()` on writes, re-exported from the `lib/api/index.ts` barrel.
- **Hooks mirror `hooks/useNotes.ts`**: query-key factory functions, `enabled: userId != null`, split
  `useX()` (list) / `useXItem(id)` (detail) / `useXMutations()` (writes), all mutations funnel through
  one `invalidateList()` closure.
- **Quick Capture is a shared dialog, not a route.** Rather than introducing a new state-management
  dependency (zustand is a listed `package.json` dependency but is not actually used anywhere in the
  codebase today), the "open the dialog" signal reuses the exact window-event pattern already
  established by `lib/speech-audio.ts` (`SPEECH_AUDIO_START_EVENT`): `lib/quick-capture-bus.ts` exports
  `openQuickCapture()`, which dispatches a plain `window` event. `QuickCaptureDialog` (mounted once in
  `AppShell.tsx`, same pattern as the single shared `QuickSwitcher` instance) listens for it. This lets
  the ⌘K palette's new "Quick capture" action, the desktop header's "Capture" button, and the mobile
  FAB all trigger the same dialog without prop-drilling or a new dependency, and without navigating away
  from whatever the user was doing — which is why capture stays "a few seconds" as the spec requires.
- **Conversion is additive and explicit.** Converting an inbox item to a Note/Task/Journal entry never
  deletes the source row — it sets `status = 'processed'`, `converted_to_type`, `converted_to_id`. This
  satisfies "Processing must be explicit. Never delete the original automatically."
- **Timeline aggregation is a pure client-side merge, not a database view.** `lib/timeline.ts`'s
  `buildTimeline` takes six already-fetched, date-bounded arrays and normalizes/sorts/labels them —
  no new SQL view or function. This keeps the merge logic unit-testable without a database, and RLS
  already scopes every underlying query to the caller, so there's nothing a view would add security-wise.
  The one real complexity this bought: `kori_activity_log` has many rows per feature per day (every
  learning action logs a zero-duration row; `useSessionTimer` adds time-on-page rows), so
  `buildHengoSessionEntries` merges them into one "N min in X" entry per (local day, feature) — verified
  against real production data (1600+ rows) during manual testing, not just synthetic test fixtures.
- **Date bucketing follows the app's dominant "browser-local time" convention, not Recovery's fixed
  KST offset.** `lib/recovery.ts` hardcodes `+9h` deliberately for that domain; `lib/date-utils.ts` (new,
  shared) instead uses the user's own clock via `Date` getters, matching `lib/habits.ts`/
  `lib/api/progress.ts`'s existing (if duplicated) approach — consolidated into one file rather than
  adding a third copy.
- **Full-text search starts with Postgres `tsvector`, not embeddings.** Phase 5 (Ask Hengo) begins with
  `to_tsvector('english', ...)` generated columns + GIN indexes across notes/inbox/journal, gated by RLS
  like every other query. Vector/embedding retrieval is **deferred** (see below) since it is not yet
  proven necessary and the spec explicitly says to add it "only if it fits the existing Supabase setup
  cleanly" — introducing `pgvector` and an embedding pipeline is a meaningfully bigger, costed decision
  that deserves its own review rather than being bundled into this pass.
- **Reminders reuse `kori_dispatch_push`,** never a new delivery path. The generic `kori_reminders` table
  stores `entity_type`/`entity_id` + ownership is re-verified server-side before any dispatch (spec:
  "Do not trust a user-provided entity ID without verifying ownership") — this must be an Edge
  Function or `pg_cron` function, not a client-trusted call.

## 3. Database plan

### Implemented (Phase 1)

`supabase/migrations/20260726120000_inbox_items.sql` — see file for the authoritative source:

```
kori_inbox_items
  id uuid pk, user_id uuid fk auth.users
  title text null, content text not null (1..4000 chars)
  item_type text check (idea|note|task|activity|phrase|dev|journal)
  tags text[] default '{}'
  captured_at timestamptz default now()
  event_at timestamptz null
  goal_id uuid null fk goals(id) on delete set null
  status text check (inbox|processed|archived) default 'inbox'
  source text check (manual|voice|ai|converted) default 'manual'
  pinned boolean default false
  converted_to_type text null check (note|task|journal)
  converted_to_id uuid null
  created_at, updated_at timestamptz
  search tsvector generated column over (title, content) — GIN index
```

RLS: owner-only `for all` policy using `(select auth.uid()) = user_id`, anon revoked, matching the
established template exactly. Indexes: `(user_id, status, created_at desc)`,
`(user_id, item_type, created_at desc)`, GIN on `search`, GIN on `tags` (`gin` op class for arrays).

### Implemented (Phase 2)

`supabase/migrations/20260726130000_notes_knowledge_library.sql` — additive columns on `kori_notes`
only, applied to the live project:

```
kori_notes (existing table, new columns)
  note_type text not null default 'technical'
    check (technical|korean|personal|decision|idea|reference)
  pinned boolean not null default false
  source_url text null (<= 2000 chars)
  goal_id uuid null fk goals(id) on delete set null
  task_id uuid null fk tasks(id) on delete set null
  inbox_item_id uuid null fk kori_inbox_items(id) on delete set null
  search tsvector generated column over (title A, description B, content C) — GIN index
```

Backfill was automatic: a `not null default 'technical'` column addition backfills every existing row
without a separate `UPDATE` (verified live — the one pre-existing note came back `note_type: 'technical'`
after the migration ran). `category`/`icon` keep their original columns and meaning; the _app layer_ is
what changed — the editor now lets `category` and `icon` vary independently instead of always mirroring
one into the other, and `lib/inbox.ts`'s inbox→note conversion was updated to populate the new `noteType`
field (via a type→noteType map) instead of misusing `category` for it, since Phase 1 shipped before this
field existed. Indexes: `(user_id, pinned, updated_at desc)`, `(user_id, note_type)`, GIN on `search`,
partial indexes on `goal_id`/`task_id`/`inbox_item_id` (`where ... is not null`).

### Implemented (Phase 3)

`supabase/migrations/20260726140000_journal_and_manual_activities.sql` — two new, independent tables:

```
kori_journal_entries
  id uuid pk, user_id uuid fk auth.users
  occurred_at timestamptz default now()   -- "date and time" as one field, per the mission's wording
  title text null (<=200), content text not null default '' (<=4000)
  mood smallint null (1-5), energy smallint null (1-5)
  achievement / blocker / lesson / gratitude text null (<=4000 each)
  tags text[] default '{}'
  goal_id uuid null fk goals(id) on delete set null
  habit_id uuid null fk kori_habits(id) on delete set null
  created_at, updated_at timestamptz
  search tsvector generated column over (title A, content B, achievement+blocker+lesson+gratitude C) — GIN index

kori_manual_activities
  id uuid pk, user_id uuid fk auth.users
  occurred_at timestamptz default now()
  label text not null (1..160 chars), category text null (<=60, free text — no fixed enum, deliberately open-ended)
  duration_minutes int null (0..1440), notes text null (<=2000)
  goal_id uuid null fk goals(id) on delete set null
  habit_id uuid null fk kori_habits(id) on delete set null
  created_at, updated_at timestamptz
```

Every column on `kori_journal_entries` except `id`/`user_id`/`created_at`/`updated_at` is nullable —
`content` defaults to `''` rather than being required, since the app-layer validation
(`lib/journal.ts`'s `validateJournalEntryInput`) only requires _some_ field to be non-empty, never any
one specific field, matching "Do not make every field mandatory."

`/timeline` is a client-side, pure-function merge (`lib/timeline.ts`'s `buildTimeline`) of six
independently-fetched, date-bounded sources: `kori_manual_activities`, `kori_journal_entries`, completed
`tasks`, `kori_habit_checkins` (via a new `habitsApi.getCheckinsInRange`), `kori_activity_log` (via a new
`progressApi.getActivityLog`, merged per day+feature into one "N min in Hengo" entry so dozens of
zero-duration action rows don't flood the view), and `kori_focus_daily_checkins` (Recovery, via a new
`recoveryApi.getDailyCheckInsInRange` — only ever surfaces the user's own free-text `mood`/`win`/
`intention`, never a habit label, preserving Recovery's domain-neutrality). No new duplicated table —
purely a read-side union with each entry kind labeled distinctly (`TIMELINE_KIND_META`) so "planned task,
completed" / "completed activity" / "time spent inside Hengo" / "manually recorded real-life activity"
never blur together in the UI.

### Implemented (Phase 4)

`supabase/migrations/20260726150000_universal_reminders.sql` (plus two live-only follow-up corrections
applied directly, see the note at the end of this section) — one new table, three new/changed functions,
one new `pg_cron` job:

```
kori_reminders
  id uuid pk, user_id uuid fk auth.users
  title text not null (1..200), body text null (<=1000)
  entity_type text check (task|goal|habit|note|inbox_item|journal_prompt|manual_activity)
  entity_id uuid null (required unless entity_type = 'journal_prompt')
  scheduled_for timestamptz null (one-time)
  recurrence jsonb null ({frequency: 'daily'|'weekly'|'weekdays', time: 'HH:MM', anchorWeekday?, weekdays?})
  timezone text default 'Asia/Seoul'
  channels text[] default ('web', 'telegram')
  status text check (active|paused|completed|cancelled)
  next_run_at, last_sent_at, snoozed_until timestamptz null
  last_error text null, dedupe_key text null, deep_link text null
  created_at, updated_at timestamptz
  check: scheduled_for is not null or recurrence is not null
```

- **Recurrence engine** (`lib/reminders.ts`'s `computeNextRunAt`) walks forward one calendar day at a
  time using `@date-fns/tz`'s `TZDate`, reconstructing a fresh timezone-anchored timestamp per candidate
  day rather than doing millisecond arithmetic — 20 tests cover daily/weekly/selected-weekdays, a month
  rollover, and both a US DST spring-forward and fall-back boundary (`America/New_York`, since the app's
  own `Asia/Seoul` default never observes DST — the algorithm still had to be verified against a zone
  that does).
- **The same algorithm is re-implemented in SQL** (`kori_next_reminder_run`, `stable`, no table access)
  since a `pg_cron` job can't call into the Next.js codebase — this is a genuine dual-implementation
  reality, documented rather than hidden. To minimize drift risk, the _client_ calls this exact SQL
  function via `supabase.rpc()` for its live "Next: ..." preview (`lib/api/reminders.ts`'s
  `previewNextRun`), so the UI's preview and the server's actual dispatch timing can never disagree with
  each other, even if the JS and SQL implementations ever drift from one another.
- **Dispatch** (`kori_dispatch_reminders`, `pg_cron` `* * * * *`, matching the existing `kori_send_*`
  jobs' cadence): selects `where status = 'active' and next_run_at <= now()` with `for update skip
locked` (safe against the job somehow overlapping itself), re-verifies `entity_id` ownership per
  `entity_type` before every send (a reminder whose linked row was deleted gets `cancelled` with a
  reason, never retried forever), dispatches via `kori_dispatch_push`, then advances `next_run_at` (via
  `kori_next_reminder_run`) or marks `completed` for one-time reminders — all inside the same
  transaction as the send, which is what makes "never fire the same occurrence twice" actually hold.
- **`kori_dispatch_push` gained a 5th optional `p_channels` parameter** (default `{web,telegram}`,
  matching every existing call site's behavior) and Telegram-send exception isolation (previously only
  the web-push half was wrapped, so a Telegram failure could abort the function before push was even
  attempted). The three existing `kori_send_*_reminders` functions call this with exactly 4 positional
  arguments and are unaffected — verified live (see §Verification below).
- **Two live-only corrections** were applied as immediate follow-ups after the main migration (both are
  now folded into the migration file itself so a fresh replay is already correct, but they weren't caught
  until inspecting the live result):
  1. `create or replace function` with an _added parameter_ does not replace a Postgres function — it
     creates a second overload, since function identity includes parameter types. The first apply left
     **two** `kori_dispatch_push` functions coexisting (the untouched 4-arg original, and the new 5-arg
     one) — the 3 existing study-reminder call sites were silently still resolving to the old,
     unmodified 4-arg overload (harmless, since it's still correct behavior — just not the fix I'd
     described applying). Fixed by explicitly `drop function`-ing the old 4-arg signature so exactly one
     `kori_dispatch_push` exists, with 4-arg calls now correctly resolving to the 5-arg version via its
     default parameter.
  2. `kori_dispatch_push`, `kori_dispatch_reminders`, and `kori_next_reminder_run` were all left
     executable by `anon`/`authenticated` by Postgres's default (`GRANT EXECUTE` to `PUBLIC` on
     creation) — unlike the existing `kori_send_*_reminders`, which already have execute revoked.
     `kori_dispatch_push` takes an arbitrary `p_user_id`, so left open it would have let _anyone_ spam
     push/Telegram messages to _any_ user via the public REST RPC endpoint. Locked both dispatch
     functions down to internal-only (invoked by `pg_cron`-as-`postgres`, which bypasses grants, or by
     other `SECURITY DEFINER` functions); `kori_next_reminder_run` was narrowed to `authenticated`-only
     (still needed for the client-side preview, no reason to leave it open to `anon`).
- **Delivery tracking (2026-11-05, `20261105120000_reminder_delivery_tracking.sql` — applied
  to the live database 2026-11-05):** `kori_dispatch_push` swallows every error and `net.http_post` only queues the request,
  so a reminder was marked sent even when nothing arrived (including when the `SERVICE_ROLE_KEY` vault
  secret was missing). The reminder loop now calls `kori_send_reminder`, which writes one
  `kori_reminder_deliveries` row per occurrence and channel (`pending` / `delivered` / `failed` /
  `skipped`, unique per occurrence and channel) with its pg_net request id. A second per-minute job,
  `kori_reconcile_reminder_deliveries` (`kori-reminder-delivery-check`), reads `net._http_response`:
  a web push is delivered only when `kori-send-push` reports `sent > 0`, and anything unanswered after
  15 minutes fails. The latest occurrence's outcome lands in `kori_reminders.last_error` ("Not
  delivered — …", "Partly delivered — …", or cleared), which the Reminders page already shows. History
  is kept 90 days, owner-readable under RLS. `kori_dispatch_push` is unchanged for the holiday, weather
  and streak alerts. No retry yet.
- **Timezone:** the reminder dialog now uses the device's IANA zone (`getDeviceTimeZone`, falling back
  to `Asia/Seoul`) instead of always Seoul, so recurring reminders agree with one-time ones, whose
  datetime input was already device-local.

### Implemented (Phase 5)

`supabase/migrations/20260726160000_ask_hengo_memory.sql` — one new table, no functions (retrieval is
plain FTS queries from the route handler, not SQL functions):

```
kori_memory_candidates
  id uuid pk, user_id uuid fk auth.users
  fact text not null (1..500)
  category text not null default 'fact' (<=50, free text — UI suggests preference|skill|routine|goal|fact|other)
  source_type text check (note|inbox_item|journal|conversation|manual)
  source_id uuid null
  confidence real default 0.5 check (0..1)
  status text check (proposed|approved|rejected|archived), default 'proposed'
  created_at, updated_at timestamptz
```

- **No new table for retrieval itself.** "Ask Hengo" (`/ask-hengo`) is a read-only aggregation over data
  that already exists: `lib/server/memory-retrieval.ts` runs FTS (`.textSearch(..., {type: "websearch"})`)
  against `kori_notes`/`kori_inbox_items`/`kori_journal_entries`'s existing generated `search` columns
  (added in Phases 1–3), plus bounded structured reads of approved memories, active goals, recent Korean
  mistakes (`kori_corrections` — a pre-existing spaced-repetition mistake tracker with its own
  `occurrence_count`/`error_category`/`mastery` columns that predates this second-brain work, discovered
  during Phase 5 by inspecting `list_tables` rather than assumed; ordered by `occurrence_count desc` so
  "which mistakes do I repeat" surfaces the actually-repeated ones first), recently-completed tasks, and
  recent manual activities — 9 queries total, run in parallel via `Promise.all`, all against the
  per-request client from `requireUser` (RLS-scoped, no service key, and — matching the rest of the app's
  convention — no explicit `.eq("user_id", ...)` filters, since RLS already does that).
- **Prompt-injection mitigation, concretely:** `formatRetrievedContext` wraps every retrieved item in a
  single `<user_data>...</user_data>` block; the system prompt (`app/api/ai/memory/ask/route.ts`)
  explicitly tells the model everything inside is data from the user's own stored notes/messages, never
  instructions to follow, and to flag (not obey) anything that reads like an embedded command.
- **Citations are resolved server-side, not trusted from the model.** The model returns `citedIndexes`
  (integers into the retrieved-items array it was shown); the route filters those against the _actual_
  `items` array length before turning them into `sources` in the response — the model can reference an
  item it saw, but can never fabricate a source that wasn't actually retrieved.
- **The memory-approval loop is real, not cosmetic.** Every fact the model notices lands in
  `kori_memory_candidates` with `status = 'proposed'` via the same per-request client (never
  auto-approved); only `approved` rows are ever read back into a future prompt's "known context" via
  `retrieveMemoryContext`. `/ask-hengo/memories` is the review queue: approve (optionally editing the
  wording first), reject, archive, or delete. A user can also add a memory directly (`memoryApi.create`,
  `source_type = 'manual'`), saved straight to `approved` since they wrote it themselves — no proposal
  step needed for something the user explicitly typed.
- **Groundedness is surfaced, not hidden.** The model must self-report `grounded` / `partial` /
  `insufficient` per answer — never silently claim to "remember" something nothing was retrieved for.

### Implemented (Phase 6)

**No migration — zero new tables, zero new columns.** Confirmed the original plan held exactly: Morning
Brief / Evening Review / Weekly Review are pure read-side aggregations over data every earlier phase
(plus the pre-existing Goals/Tasks/Habits domains) already fetches. The only new backend surface is one
AI route with no table access of its own:

- `app/api/ai/review/summarize/route.ts` — a plain `jsonAiRoute` (no custom post-processing needed,
  unlike Ask Hengo's route): takes `{ reviewType, context }` where `context` is an already-formatted,
  bounded plain-text block built by `lib/review.ts`'s `format*Context` helpers, and returns
  `{ summary, focusSuggestion }`. Same never-invent discipline as Ask Hengo, scoped down since
  there's no retrieval/citation surface to defend here. **Correction (2026-11-04):** the block is
  counts _plus user-authored names_ (tasks, habits, reminders, goals), so the route now sends it inside
  a `<user_data>` block (`lib/server/user-data.ts`, which also neutralises any `user_data` tag in the
  text) with the data-not-instructions rule; covered by `app/api/ai/review/summarize/route.test.ts`.
- `lib/review.ts` — pure aggregation only, maximizing reuse rather than re-deriving anything:
  - `isReminderDueToday` / `remindersDueToday` — a reminder counts as due when active and its
    `next_run_at` isn't past end-of-today (deliberately also surfaces overdue ones).
  - `goalsNeedingAttention` — active goals whose **live** health (`computeListGoalHealth`, the same
    engine as the Goals list and Home) is `attention`/`at_risk`/`blocked`, most severe first.
    **Fixed 2026-11-04:** it used to read the stored `goals.health_status`, which nothing writes (it
    keeps its `'not_started'` default), so both reviews never flagged any goal. It returns copies with
    the live `health_status`/`health_reason`; the inputs are not mutated. Does **not** touch the separate, still-unbuilt
    per-goal "Weekly Review UI" planned in `docs/goal-system-v2-audit.md` (different scope — per-goal
    periodic review vs. this whole-life daily/weekly surface).
  - `buildMorningBrief` — packages `useTodaysTasks`' task-group counts (already computed
    overdue/scheduled/anytime/completed) with active-habit vs. today's-checkins diffing, due reminders,
    and at-risk goals.
  - `buildEveningReviewSummary` / `buildWeeklyReviewSummary` — both just reshape
    `lib/timeline.ts`'s existing `DailySummary` (from `groupTimelineByDay`) for a 1-day or 7-day range
    respectively; Weekly Review's only genuinely new aggregation is `buildHabitWeeklyCompletion`
    (per-habit completed-days-of-7, correctly excluding days before a habit's own start date).
- **UI reuses existing components directly**, not reimplementations: `TimelineEntryRow` (Evening
  Review's "today" list) and the exact `GOAL_HEALTH_LABELS`/badge styling goals pages already use.
- Three routes (`/review/morning`, `/review/evening`, `/review/weekly`) share one `ReviewTabs` switcher
  (mirrors `GrowthTabs`'s visual style, but always visible — unlike Habits/Recovery, these three aren't
  separate top-level nav items, so the tabs are the only way to move between them at any screen size).
  One nav entry (`progress-review`) in the Progress workspace, matched against `/review` so any of the
  three lights it up.

## 4. Implementation checklist

### Phase 1 — Quick Capture Inbox ✅

- [x] Migration: `kori_inbox_items` (RLS, indexes, generated `tsvector` search column)
- [x] `lib/inbox.ts` — types, validation, filter/search predicates, conversion payload builders (pure, tested)
- [x] `lib/api/inbox.ts` — `inboxApi` (list/get/create/update/remove/convertToNote/convertToTask/convertToJournal-stub)
- [x] `hooks/useInbox.ts` — TanStack Query hooks
- [x] `lib/quick-capture-bus.ts` — shared open-dialog signal (window event, no new dependency)
- [x] `components/inbox/*` — `QuickCaptureDialog`, `InboxItemCard`, `InboxFilters`
- [x] `app/(main)/inbox/page.tsx`
- [x] Nav: `Inbox` added to the Productivity workspace in `lib/navigation.ts`
- [x] Entry points: ⌘K "Quick capture" action, desktop header icon button, mobile FAB
- [x] Speech-to-text via `useSpeechRecognition` with graceful text-only fallback
- [x] Unit tests for validation, filtering, search, and conversion payload builders

### Phase 1 — Verification performed

- `pnpm test` — 741/741 pass (60 files), including the pre-existing `QuickSwitcher` and navigation
  suites after the "Quick capture" action entry was added.
- `pnpm lint` — 0 errors; the 16 pre-existing warnings are unrelated to this change (verified by diff).
- `pnpm build` — succeeds; `/inbox` builds as a static route.
- Manual browser check against the real dev environment (authenticated session): the Inbox nav item,
  page layout, filters, desktop header "Capture" button, ⌘K → "Quick capture" action, and the
  Quick Capture dialog (type select, dictation button, title/content/tags, "More options" goal +
  event-time section, ⌘/Ctrl+Enter submit) all render and respond correctly. One real UX bug was
  found and fixed this way: the content-required validation message was rendering before the user had
  touched the field — now gated behind a submit attempt.
- Migration applied to the live Supabase project (`hengo`, `dnzqgnejwyucenghugrb`) after explicit user
  confirmation; full capture → convert-to-note flow verified end-to-end against real data, then the
  test row was deleted so the account was left clean.

### Phase 2 — Notes → Knowledge Library ✅

- [x] Migration: additive `kori_notes` columns (RLS untouched — no new policy needed), generated
      `tsvector` search column, indexes
- [x] `lib/slug.ts`, `lib/tags.ts` — shared pure helpers extracted from `lib/inbox.ts` (slug generation
  - dedup, tag parsing) so Notes and Inbox don't duplicate the same logic; `lib/inbox.ts` now delegates
    to them (existing Phase 1 tests re-verified unchanged)
- [x] `lib/notes.ts` — `NoteType`/`NoteMeta`/`Note`/`NoteInput` types (moved here from `lib/api/notes.ts`,
      matching the `lib/tasks.ts` + `lib/api/goals.ts` split), validation, metadata filter/sort (pure, tested)
- [x] `lib/api/notes.ts` — extended row mapping, `search()` (server-side FTS via `.textSearch`, bounded
      to 50 rows — never an unbounded client-side content scan), `togglePinned()`
- [x] `hooks/useNotes.ts` — extended mutations; new `useNoteSearch(query)` (debounced via new
      `hooks/useDebouncedValue.ts`)
- [x] `components/notes/NoteEditor.tsx` — note type select, category field decoupled from icon, chip-based
      multi-tag editor, source URL field, pin toggle, Write/Preview tabs (reuses `renderMarkdown`), autosave
      draft protection (localStorage, restorable/discardable banner)
- [x] `components/notes/NoteView.tsx`, `NoteCard.tsx`, `NoteActions.tsx` — pin toggle, note type badge,
      created/updated timestamps, source URL link, tag chips
- [x] `components/notes/NoteSearch.tsx` — note type + pinned filters; server-side content search when a
      query is typed, metadata-only client filter otherwise
- [x] Existing note URLs/slugs untouched; the one pre-existing note kept working throughout
- [ ] **Known gap:** `goal_id`/`task_id` are modeled and wired end-to-end at the data/API layer, but the
      editor has no goal/task picker yet — only `inbox_item_id` is ever set today (automatically, by the
      Inbox → Note conversion in Phase 1). Manually linking a note to a goal or task from the Notes UI is
      deferred rather than half-built; the schema is ready for it whenever it's picked up.

### Phase 3 — Journal + Timeline ✅

- [x] Migration: `kori_journal_entries` + `kori_manual_activities` (two new tables, owner-only RLS,
      generated `tsvector` search on journal entries)
- [x] `lib/date-utils.ts` — shared browser-local date helpers (`toLocalDateString`, `localRangeFor`,
      `shiftAnchorDate`, `formatRangeLabel`) so Timeline doesn't add a third copy of the date-bucketing
      logic already duplicated between `lib/habits.ts` and `lib/api/progress.ts`
- [x] `lib/journal.ts` — types, the four-prompt daily template (`buildEntryFromTemplate`), validation
      (nothing individually mandatory, but not a completely blank entry), filter/sort (pure, tested)
- [x] `lib/timeline.ts` — `TimelineEntry`/`TimelineKind`, one normalizer per source, `buildHengoSessionEntries`
      (merges many `kori_activity_log` rows into one "N min in X" entry per day+feature),
      `buildTimeline`/`filterTimelineEntries`/`groupTimelineByDay` (pure, tested)
- [x] `lib/api/journal.ts`, `lib/api/manual-activities.ts` — CRUD following the `notesApi`/`inboxApi` pattern
- [x] Additive range-query extensions: `progressApi.getActivityLog`, `habitsApi.getCheckinsInRange`,
      `recoveryApi.getDailyCheckInsInRange` — none of the existing per-item query functions were touched
- [x] Inbox → Journal conversion upgraded from the Phase 1 stub (which only stamped status) to actually
      create a `kori_journal_entries` row, now that the table exists (`lib/inbox.ts`'s
      `buildJournalConversionPayload`, `lib/api/inbox.ts`'s `convertToJournal`)
- [x] `hooks/useJournal.ts`, `useManualActivities.ts`, `useTimeline.ts` (composes six independent,
      date-bounded queries and runs them through `buildTimeline`)
- [x] `components/journal/*` — `JournalComposer` (daily template + mood/energy pickers + collapsible
      gratitude/tags/goal-habit link), `JournalEntryCard`; `components/ui/tag-editor.tsx` extracted from
      `NoteEditor.tsx` so Notes and Journal share one chip-tag editor instead of two copies
- [x] `components/timeline/*` — `TimelineFilters` (day/week/month + type + search), `DailySummaryCard`,
      `TimelineEntryRow`, `LogActivityDialog` (the manual-activity capture entry point)
- [x] `app/(main)/growth/journal/page.tsx`, `app/(main)/timeline/page.tsx`
- [x] Nav: `soon` removed from `growth-journal`; new `progress-timeline` item added to the Progress workspace
- [x] **Known gap:** Manual activities can only be logged from the Timeline page's "Log activity" dialog —
      Inbox's existing `activity` item type does not yet convert into a `kori_manual_activities` row (unlike
      `note`/`task`/`journal`, which all have real conversions). Wiring that up would need a small additive
      change to `kori_inbox_items.converted_to_type`'s check constraint; deferred to keep this phase scoped
      to what the mission explicitly asked for.

### Phase 4 — Universal Reminders ✅

- [x] Migration: `kori_reminders` (new table), `kori_next_reminder_run` (new SQL mirror of the JS
      recurrence engine), `kori_dispatch_push` extended with a backward-compatible optional 5th parameter,
      `kori_dispatch_reminders` (new per-minute dispatch loop), `pg_cron` job `kori-universal-reminders`
- [x] `lib/reminders.ts` — types, `computeNextRunAt` (DST-safe recurrence via `@date-fns/tz`'s `TZDate`),
      `describeRecurrence`, validation (pure, tested — daily/weekly/weekdays, month rollover, DST boundaries)
- [x] `lib/api/reminders.ts` — `remindersApi` (list/create/pause/resume/cancel/snooze/remove),
      `previewNextRun()` (calls the _same_ SQL function via `supabase.rpc()` so the client preview and the
      server's actual dispatch timing can never disagree)
- [x] `hooks/useReminders.ts`, `components/reminders/ReminderDialog.tsx` + `ReminderButton.tsx` + `ReminderRow.tsx`
- [x] Wired the bell-icon entry point onto Habits (`HabitCard.tsx`, "stretched link" pattern so the icon
      stays independently clickable inside an otherwise fully-clickable card), Notes, Inbox items, and a
      standalone "Daily reminder" section on the Journal page (`entityType: "journal_prompt"`, no `entityId`)
- [x] `app/(main)/settings/reminders/page.tsx` — Active/Paused/Completed-cancelled management view
- [x] **Known gap:** inline reminder buttons on Tasks/Goals detail pages were deliberately deferred —
      those pages are more complex and higher-regression-risk than Habits/Notes/Inbox/Journal, so wiring
      them in was left for a future pass rather than rushed into this one.

### Phase 4 — Verification performed

- `pnpm test` — 831/831 pass.
- `pnpm lint` / `pnpm build` — 0 errors, the same 16 pre-existing warnings, clean build.
- Migration applied to the live Supabase project after explicit user confirmation (flagged with extra
  weight since it also modified a live, actively-running function, `kori_dispatch_push`, used by three
  existing production study-reminder jobs). Two live-only issues were found by inspecting the actual
  result (not caught by the migration file alone) and fixed as immediate follow-ups, folded back into the
  migration file so a fresh replay is already correct — see the "Two live-only corrections" note under
  §3 Phase 4 above (a Postgres function-overload duplication, and a public-execution privilege gap on two
  internal dispatch functions).
- Full live pipeline verified end-to-end: created a real recurring reminder from the Habits page UI,
  confirmed via direct SQL query that `pg_cron` actually fired it (`last_sent_at`, `dedupe_key`, and the
  advanced `next_run_at` all updated correctly), and confirmed all 3 pre-existing study-reminder cron jobs
  kept succeeding throughout (`cron.job_run_details`) — the `kori_dispatch_push` signature change never
  regressed them. Test data cleaned up afterward.

### Phase 5 — Ask Hengo ✅

- [x] Migration: `kori_memory_candidates` (new table, owner-only RLS, no functions)
- [x] `lib/memory.ts` — types, `validateMemoryCandidateInput`, `sanitizeSearchQuery` (strips tsquery-unsafe
      characters, caps length), filter/sort helpers, shared `memoryCandidateFromRow` mapper (pure, tested)
- [x] `lib/server/memory-retrieval.ts` — `retrieveMemoryContext` (9 parallel bounded queries: FTS over
      notes/inbox/journal, approved memories, goals, corrections, recent journal entries, completed tasks,
      manual activities) and `formatRetrievedContext` (the `<user_data>`-wrapped prompt block)
- [x] `app/api/ai/memory/ask/route.ts` — custom handler (not `jsonAiRoute`, since it needs a
      post-`generateObject` step to persist proposed memories) with citation resolution and prompt-injection
      mitigation in the system prompt
- [x] `lib/api/memory.ts` — `memoryApi` (ask/listCandidates/create/approve/update/reject/archive/remove)
- [x] `hooks/useMemory.ts` — `useMemoryCandidates`, `useMemoryMutations`, `useAskHengo`
- [x] `components/memory/*` — `AskHengoChat` (Q&A with example prompts, citations, groundedness label,
      inline "review new memories" prompt), `MemoryCandidateCard` (approve/edit/reject/archive/restore/delete,
      branching by status), `AddMemoryDialog` (manual "tell Hengo something" entry point)
- [x] `app/(main)/ask-hengo/page.tsx`, `app/(main)/ask-hengo/memories/page.tsx`
- [x] Nav: `Ask Hengo` added to the AI Coach workspace in `lib/navigation.ts`
- [x] Rate limiting/usage logging: `ask_hengo` feature added to the `structured` bucket in
      `lib/server/ai-limits.ts`, `ask_hengo` added to `hooks/useLogActivity.ts`'s `ActivityFeature` union so
      time-in-Ask-Hengo shows up on the Timeline like every other feature

### Phase 6 — Daily/Weekly Review ✅

- [x] No migration needed (see §3 above) — purely additive UI + one AI route over existing data.
- [x] `lib/review.ts` — predicates and summary builders (pure, tested): `isReminderDueToday`,
      `remindersDueToday`, `goalsNeedingAttention`, `buildMorningBrief` + `formatMorningBriefContext`,
      `buildEveningReviewSummary` + `formatEveningReviewContext`, `buildHabitWeeklyCompletion`,
      `localWeekDates`, `buildWeeklyReviewSummary` + `formatWeeklyReviewContext`
- [x] `app/api/ai/review/summarize/route.ts`, `lib/api/review.ts`, `hooks/useReviewSummary.ts` (a cached
      `useQuery`, not a mutation — one summary per exact context string, so it doesn't re-hit the model on
      every re-render or tab revisit); `review_summary` added to the `structured` rate-limit bucket
- [x] `components/review/*` — `ReviewTabs`, `MorningBriefView`, `EveningReviewView` (reuses
      `TimelineEntryRow`), `WeeklyReviewView`, `ReviewSummaryCard` (shared loading/error/summary display)
- [x] `app/(main)/review/{morning,evening,weekly}/page.tsx` — each composes existing hooks
      (`useTodaysTasks`, `useHabits`, `useGoals`, `useReminders`, `useTimeline`, plus one inline
      `habitsApi.getCheckinsInRange` query per page) and feeds them through the matching `lib/review.ts`
      builder
- [x] Nav: `progress-review` added to the Progress workspace, `href: "/review/morning"`, matched against
      `/review` so Evening/Weekly also light it up; `"review"` added to `useLogActivity`'s `ActivityFeature`
      union so time spent across all three pages rolls up on the Timeline like every other feature

### Phase 6 — Verification performed

- `pnpm test` — 859/859 pass (70 files, +19 from the new `lib/review.test.ts`).
- `pnpm lint` / `pnpm build` — 0 errors, the same 16 pre-existing warnings, clean build (all three
  `/review/*` routes registered as static).
- No migration, so no live-database step was needed for this phase — the only new server surface is the
  AI route, which needs no confirmation beyond the existing `OPENAI_API_KEY` already configured.
- Verified live in the browser against the real account (already used for Phases 1–5), across all three
  surfaces with no cleanup needed afterward (read-only feature, no rows written):
  - **Morning Brief**: real 12-day streak, real task counts (0 overdue, 0 scheduled, 1 anytime, 2 done),
    real habit status ("1/1 checked in — All caught up"), and a grounded AI summary + focus suggestion
    that correctly named the one anytime task and referenced the exact streak number.
  - **Evening Review**: real numbers (3 completed, 0 min in Hengo, 0 activities, journal not yet written)
    plus the real Timeline entries for the day (a habit check-in, two completed tasks) rendered via the
    reused `TimelineEntryRow`; the AI summary correctly noted the missing journal entry and suggested
    writing one.
  - **Weekly Review**: correct week range label ("Jul 26 – Aug 1"), correct totals (3 completed, 25 min
    in Hengo, 0/7 journal days), correct per-habit completion bar (1/7 for the one real habit), and an
    AI summary that named the specific habit and its exact completion ratio rather than a generic
    statement.
  - Nav: expanded the Progress workspace and confirmed the new "Review" entry (Sunrise icon) highlights
    correctly across all three sub-routes, and the header breadcrumb/description update per page.
  - No bugs found this pass — first phase in this project without a fix-during-verification cycle.

### Phase 2 — Verification performed

- `pnpm test` — 763/763 pass (63 files, +22 from the new `lib/slug.test.ts`, `lib/tags.test.ts`,
  `lib/notes.test.ts`).
- `pnpm lint` / `pnpm build` — 0 errors (one warning introduced and immediately fixed: an unused
  `Button` import in `NoteEditor.tsx`).
- Migration applied to the live Supabase project after explicit user confirmation; `get_advisors`
  showed no new security findings; the pre-existing note backfilled correctly
  (`note_type: 'technical'`, safe defaults for every new column).
- Manual browser verification against real data: opened the existing note (now showing Type/Category/
  Module/Created/Updated/tags correctly separated), toggled pin (persisted to the DB, reflected on the
  card and in the editor), edited tags via the chip editor, switched Write/Preview, ran a **content**
  search (`eGovFramework`, a term that only appears in the note body, not title/description) and
  confirmed it matched via the new server-side FTS — then created a full test note (type, tags, source
  URL) end-to-end and deleted it afterward to leave the account clean.

### Phase 3 — Verification performed

- `pnpm test` — 811/811 pass (66 files, +48 from the new `lib/date-utils.test.ts`, `lib/journal.test.ts`,
  `lib/timeline.test.ts`, plus stale nav-fixture assertions in `lib/navigation.test.ts` and
  `components/layout/navigation-shell.test.tsx` updated for Journal now being a shipped item, matching
  the exact precedent set when Habits/Recovery shipped).
- `pnpm lint` / `pnpm build` — 0 errors (two issues introduced and fixed: an unescaped apostrophe in
  `timeline/page.tsx`, an unused `eslint-disable` in `useTimeline.ts`).
- Migration applied to the live Supabase project after explicit user confirmation; `get_advisors` showed
  no new findings; both new tables confirmed present with RLS enabled via `list_tables`.
- Manual browser verification against real data, across both new pages:
  - **Journal**: saved a real entry through the daily-template composer (achievement + mood 3 + energy 4) — found and fixed a real bug this way (after a successful save the form correctly reset to blank,
    but a stale `submitAttempted` flag made the freshly-emptied form immediately flash the "write
    something" validation message even though the save had succeeded; fixed by resetting the flag
    alongside the form values). Confirmed the saved entry displays correctly with mood/energy badges.
  - **Timeline**: confirmed real aggregated data renders correctly across every source in one account —
    a journal entry, merged "N min in Hengo" entries per feature (Recovery, Habits, Chat, Interview,
    Listening, Vocab, Foundations, each summed independently), a real habit check-in with its actual
    label resolved, and real completed tasks. Found and fixed a real UX gap this way: a journal entry
    made through the daily template (achievement/lesson/blocker filled, `content` left empty) fell back
    to a generic "Journal entry" label instead of using the achievement text — `fromJournalEntry` now
    falls back through title → content → achievement before the generic label. Also verified the "Log
    activity" dialog end-to-end (toast, correct daily-summary count, correct entry row).
  - All test rows (the journal entry and the manual activity) were deleted afterward so the account was
    left exactly as found.

### Phase 5 — Verification performed

- `pnpm test` — 840/840 pass (69 files, +9 from the new `lib/memory.test.ts`).
- `pnpm lint` / `pnpm build` — 0 errors, the same 16 pre-existing warnings, clean build (`/ask-hengo`,
  `/ask-hengo/memories`, `/api/ai/memory/ask` all registered correctly).
- Migration applied to the live Supabase project after explicit user confirmation; `get_advisors` showed
  no new findings attributable to this migration; `list_tables` confirmed `kori_memory_candidates` present
  with RLS enabled.
- **A real schema discovery changed the retrieval design mid-phase:** the initial retrieval implementation
  scanned `kori_messages.corrections` (free text) for "Korean mistakes" context. Inspecting the live
  project via `list_tables` surfaced a pre-existing, unrelated `kori_corrections` table (35 real rows) —
  a proper spaced-repetition mistake tracker with `original_text`/`corrected_text`/`explanation`/
  `error_category`/`occurrence_count`/`mastery` columns, already backing the existing `/korean-coach/mistakes`
  page. Retrieval was switched to query this table directly, ordered by `occurrence_count desc`, so
  "which mistakes do I repeat" actually surfaces the repeated ones first instead of just the most recent.
- Full live pipeline verified end-to-end in the browser against real account data (35 real corrections,
  1 real note, 1 real habit, existing goals):
  - Asked "Which Korean mistakes do I repeat?" — got a grounded answer built entirely from real
    `kori_corrections` rows, correctly citing 8 real mistakes (spacing/vocabulary/expression/word-order/
    spelling categories) as clickable source badges linking to `/korean-coach/mistakes`, labeled
    "Grounded in your data".
  - **Found and fixed a real UX bug this way:** the model was writing raw citation brackets like
    `[8][15]` directly inline in the answer prose (technically correct per the schema, but ugly to read)
    even though a separate `citedIndexes` field already existed for that purpose. Fixed by making the
    system prompt explicit that citations belong ONLY in `citedIndexes`, never as inline bracket markup
    in the answer text — re-asked the same question afterward and confirmed the answer is now clean
    prose with citations appearing only as the source badges below it.
  - The AI proposed 2 new memory candidates from that exchange; both appeared correctly on
    `/ask-hengo/memories` under "Waiting for your review" with category/source/low-confidence badges.
    Approved one via the UI — confirmed it moved to "Known context" with a success toast, confirmed a
    second question afterward cited it back as a `memory`-type source (labeled "Known (...)").
  - All 3 test memory-candidate rows created during verification were deleted afterward via direct SQL
    (`kori_memory_candidates` back to 0 rows) so the account was left exactly as found; `kori_ai_usage`
    rows from the test questions were left in place, matching how every prior phase's analytics rows
    were handled (usage logs are meant to accumulate, unlike feature data).

## 5. Privacy model

- Every new table is owner-only RLS, anon revoked, matching every existing `kori_*` table — verified in
  the migration itself (`revoke all ... from anon`, `create policy ... using ((select auth.uid()) = user_id)`).
- No service key is introduced anywhere; inbox reads/writes go through the browser Supabase client like
  every other `lib/api/*` domain, so RLS is enforced identically.
- **RLS is not end-to-end encryption.** Row-level security means _other users_ cannot read your rows
  through the app's normal query paths; it does not mean the data is encrypted at rest in a way that's
  unreadable to database administrators or in the event of infrastructure compromise. Hengo's Settings
  page should say this plainly once a "Privacy" section exists (Phase 5/6 UI work) rather than implying
  ordinary Postgres storage equals encrypted notes.
- Inbox content is never logged: `lib/api/inbox.ts` and the AI routes must not `console.log` request
  bodies (existing routes already avoid this; the same discipline applies here).
- Nothing in Phase 1 touches AI at all — inbox capture is pure CRUD, so there is no prompt-injection or
  data-exfiltration surface yet. That surface starts in Phase 5 and must follow the mitigations
  described in §3 above (data, not instructions; labeled `<user_data>`; source references returned so
  the user can verify).

## 6. Deferred work

All 6 mission phases are implemented. What remains is a short list of intentionally out-of-scope items,
each already noted at the point it came up rather than newly discovered here:

- **Vector/embedding retrieval** — deferred pending a decision on embedding model + cost, per the
  mission's own "only if it fits cleanly" instruction; Postgres FTS (shipped in Phase 5) remains the
  retrieval mechanism until/unless embeddings are explicitly picked up.
- **Playwright end-to-end coverage** — deferred until a single coherent "capture → convert → remind →
  find/ask → review" scenario is worth automating across the now-complete flow; `@playwright/test` is
  already a dependency so this is additive whenever it's picked up.
- **Client-side encrypted notes** — explicitly deferred per the mission (key management is a real
  security design task, not something to bolt on incidentally).
- **Inbox → manual-activity conversion** — Inbox's `activity` item type doesn't yet convert into a
  `kori_manual_activities` row (see the Phase 3 "known gap" above); manual activities are logged directly
  from the Timeline page today.
- **Notes → goal/task linking UI** — the columns exist (Phase 2); no picker in the editor yet.
- **Inline reminder buttons on Tasks/Goals** — deferred in Phase 4 as higher regression-risk than the
  four surfaces that did get wired up (Habits/Notes/Inbox/Journal).
- **Per-goal periodic Weekly Review UI** — a separate, still-unbuilt item from the earlier Goal System v2
  audit (`docs/goal-system-v2-audit.md`), distinct from this mission's whole-life Weekly Review (Phase 6).
  Phase 6's Weekly Review already surfaces goals needing attention read-only; building the actual
  per-goal review-and-set-next-period-target flow remains a separate, not-yet-started feature.

Each item above is concrete enough to start from directly whenever it's picked up — no further audit
should be needed.

## 7. Manual deployment steps

- Four migrations have already been applied to the live `hengo` Supabase project (`dnzqgnejwyucenghugrb`),
  with explicit confirmation before each one since it's a schema change to a database shared with
  Orbit/DailyGoalMap: `20260726120000_inbox_items.sql`, `20260726130000_notes_knowledge_library.sql`,
  `20260726140000_journal_and_manual_activities.sql`, `20260726150000_universal_reminders.sql` (plus two
  corrective follow-ups applied live and folded back into that file — see §3 Phase 4).
- `20260726160000_ask_hengo_memory.sql` (Phase 5) has also been applied to the live project after explicit
  confirmation. Nothing further to run for Phases 1–5.
- If these migrations are ever replayed against a _different_ environment (a fresh project, a CI/staging
  database), apply them via `supabase db push` or the Supabase SQL editor, in filename order. No new
  environment variables, Edge Functions, or extensions are required for any phase so far — all are pure
  Postgres + RLS (`tsvector`/GIN are built in, `pg_cron` was already enabled for the existing study
  reminders before Phase 4 needed it).
