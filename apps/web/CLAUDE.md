# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**H-Space** — a personal software ecosystem and portfolio built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and shadcn/ui. The existing Korean-learning product remains a first-class area named **Hengo Learning**. `README.md` is the full feature map; `GuideLineNew.md` holds the original learning-product vision.

> **Hub navigation (2026-10-23).** H-Space is a personal hub of several apps, not only a Korean-learning product. The global sidebar (desktop) and rail (tablet) show **six workspaces — Overview, My Apps, Planner, Learning, Notes, Growth plus the AI Assistant and Settings**, nothing else. Each workspace's own pages are **local tabs inside it** (`WorkspaceTabs`): Planner = Tasks · Goals · Calendar · Overview · Inbox; Notes = Notes · Memories · Timeline; Growth = Overview · Habits · Journal · Progress; My Apps = My Apps · H-Vault. Learning navigates with its hub's cards. Mobile: **Home · Plan · Learn · Apps · More** (`MoreSheet`). Routes without a nav entry are **not deleted**: every route, component, and table still exists and works by direct URL, and the full route registry still drives titles/breadcrumbs/matching/Quick Switcher. Don't treat "it's not in the nav" as "it's gone".

> H-Space is the umbrella product and **Hengo Learning** is its Korean-learning area. The old prefix is load-bearing and stays: Supabase tables are `kori_*`, the auth storage key is `koriai-auth`, and various localStorage keys start with `koriai`. Don't rename those storage identifiers during branding work.

## Commands

Use **pnpm**.

```bash
pnpm dev          # dev server at localhost:3000
pnpm build        # production build
pnpm lint         # eslint
pnpm test         # all unit tests (vitest run)
pnpm test:watch   # vitest watch mode
pnpm test:e2e     # playwright specs in tests/e2e/ (needs a dev server running)
npx vitest run lib/vocab-review.test.ts   # run a single test file
```

Unit/component tests are colocated (`lib/*.test.ts`, `lib/**/*.test.ts`, a few `components/**/*.test.tsx`); `vitest.config.ts` supplies the `@/` alias and excludes the nested side projects. Pure `lib/` logic is expected to be tested — that's why domain math lives there instead of in components. `docs/testing-strategy.md` covers what belongs at which level.

**Local dev on machines with corporate SSL inspection**: Node.js does not trust the interception CA, so every server-side fetch — Supabase auth in `requireUser`, OpenAI calls — fails with `SELF_SIGNED_CERT_IN_CHAIN` and all `app/api/ai/*` routes return 401 "Invalid session" even for valid logins. Run the dev server with `NODE_EXTRA_CA_CERTS` pointing at your exported corporate TLS-inspection root CA. Browser-side Supabase calls are unaffected, so the symptom is "everything works except AI".

## Architecture

**Client-side SPA over Supabase, plus a thin set of Next.js AI routes.** The former Spring Boot backend was replaced (July 2026): data now lives in Supabase and the AI features run in `app/api/ai/*` route handlers — the only server-side code in the app. The old Spring implementations were removed in this migration's cleanup; see git history if they're ever needed again.

### Supabase — data + auth

- `lib/supabase.ts` holds the single browser client. The Supabase project is **shared with Orbit/DailyGoalMap**: KoriAI-owned tables are prefixed `kori_`; the goals/tasks domain reuses Orbit's original tables (`goals`, `tasks`, …) and RPCs. All tables have RLS; queries rely on it rather than filtering by user id everywhere.
- Auth is **h-space-api** (the Spring Boot auth service at `NEXT_PUBLIC_AUTH_API_URL`), not Supabase auth: email-or-username + password, "continue with email" 6-digit codes (`components/email-code-sign-in.tsx`, which also signs up new addresses), and Google ID-token login (`lib/google-auth.ts`), all with optional two-step verification, refresh-token rotation, and token-link password reset. `lib/api/auth-http.ts` unwraps its `ApiResponse` envelope. The session persists in localStorage under `hspace-auth` so `lib/auth-store.ts` can read the user id synchronously (refreshes are serialized across tabs with the Web Locks API, since h-space-api revokes a refresh token on use). The route guard is client-side only: `app/(main)/layout.tsx` redirects to `/login`, also when the session ends mid-visit.
- **Data still uses Supabase through a temporary bridge:** `getSupabaseAccessToken()` exchanges the h-space-api token for a short-lived Supabase-signed one (`POST /api/auth/supabase-token`), and `lib/supabase.ts` passes it via supabase-js's `accessToken` option, so RLS and `requireUser` see the same user id. That option makes **any `supabase.auth.*` access throw** — get tokens and user ids from `lib/auth-store.ts` instead. Known casualty: `/oauth/consent` (the MCP connector's Supabase OAuth server flow) still uses `supabase.auth.oauth` and doesn't work until it's reworked.

### API layer — `lib/api/` (the single integration point)

- Per-domain service package: ~35 domain files, each querying Supabase directly and mapping snake_case rows to the app's camelCase types. `ls lib/api/` for the current list rather than trusting one written here — roughly: learning (`chat`, `vocab`, `phrasebook`, `reading`, `foundations`, `learning`, `interview`, `korean-coach`, `realtime`, `voice-sessions`, `daily-study-plan`, `scenario-sessions`, `missions`, `skills`, `tts`, `translate`), productivity (`goals`, `goal-key-results`, `goal-evidence`, `goal-plan-phases`, `goal-schedule-rules`, `goal-reviews`, `inbox`, `notes`, `reminders`), growth + second brain (`habits`, `recovery`, `journal`, `manual-activities`, `memory`, `review`), platform (`auth`, `user`, `progress`, `push`).
- `lib/api/index.ts` is a barrel — import from `@/lib/api` (e.g. `import { vocabApi, getApiErrorMessage } from "@/lib/api"`). Add a new backend call to the matching domain file, not inline in components. New domains follow the `notesApi` shape exactly: a plain object of async functions, row↔camelCase mapping inline, `requireUserId()` on writes, re-exported from the barrel.
- Hooks mirror `hooks/useNotes.ts`: query-key factory functions, `enabled: userId != null`, split `useX()` / `useXItem(id)` / `useXMutations()`, all mutations funnelling through one `invalidateList()` closure.
- `lib/api/errors.ts` — `getApiErrorMessage` formats supabase-js / fetch errors; used by most hooks and pages.
- `lib/api/ai-client.ts` — `aiPost` / `authHeaders` attach the Supabase access token for calls to `app/api/ai/*`. `lib/api/sse.ts` parses the SSE streams.

### AI routes — `app/api/ai/*`

- ~31 route handlers. `lib/server/ai.ts` is the shared plumbing: `requireUser` (verifies the caller's Supabase JWT and returns a per-request client so **RLS applies — no service key anywhere**), `jsonAiRoute` (zod schema + prompt → `generateObject` → JSON), and SSE helpers.
- Models via `@ai-sdk/openai`; server-side `OPENAI_API_KEY`, default model `gpt-5-mini` (override with `AI_MODEL`). TTS (`app/api/ai/tts`) proxies OpenAI's audio API and returns MP3 bytes.
- Streaming (`chat/stream`, `goals/coach`) keeps the same SSE event protocol the Spring backend used: `start` / `token` / `done` / `error`. `chat/stream` also persists both message rows in `kori_messages`.
- `lib/server/ai-limits.ts` caps per-user daily usage in five cost buckets (`chat` 100, `structured` 50, `tts` 50, `transcription` 50, `large_generation` 20). A new route must declare a `feature` name and map it in `FEATURE_TO_BUCKET` — unmapped features silently fall back to `structured`. Calls are logged to `kori_ai_usage`.
- **Anything that feeds user-stored content into a prompt** (`memory/ask` via `lib/server/memory-retrieval.ts`, and any future retrieval route) must wrap it in a `<user_data>` block, instruct the model to treat it as data and never as instructions, and resolve citations server-side against the actual retrieved list — never trust indices or sources the model returns.

### Routing & app shell

- Route groups: `app/(auth)/` (login, register, forgot-password, reset-password) and `app/(main)/` (everything else).
- **The shell is `components/layout/*`, not the route layout.** `app/(main)/layout.tsx` owns only route-boundary concerns — the client-side auth gate, the onboarding wizard, and last-visited tracking — and renders `<AppShell>`, which owns every piece of visual chrome: `DesktopSidebar`, `TabletNavigationRail`, `DesktopHeader`/`MobileHeader`, `MobileBottomNav` (+ its `MoreSheet`), `ProfileMenu`, and soft-keyboard detection via `visualViewport`. The desktop header is `Workspace / Page` (`header-trail.ts`) and renders the page's **only `h1`** — pages don't add a second title hero; they start with `WorkspaceTabs` (tabs + the workspace's one primary action) and a one-line description.
- **Nav is data-driven:** `lib/navigation.ts` is the single source of truth. The **route registry** (`navSections`' seven `NavSectionId`s — `today`, `learn`, `plan`, `grow`, `memory`, `apps`, `ai`, labelled Overview · Learning · Planner · Growth · Notes · My Apps · AI Assistant; the ids stay because last-visited tracking stores them in localStorage — plus `allNavItems` and the matching helpers) covers every route and drives titles, breadcrumbs, active-state, and the Quick Switcher. What each surface shows is chosen from it in four layers: `workspaceNavItems` + `toolNavItems` (sidebar/rail), `workspaceTabs` (local tabs; `getActiveTab` picks the most specific match), `mobileNavItems` + `moreNavItems` (bottom bar / More sheet leaders), and `browseSections` (More sheet's full list). Register routes in the registry; change visibility in the layers — never in the shell components. `showInSidebar: false` now only marks a hub child that must not shadow its parent's prefix match (`navPathnames`).
- Nav matching goes through `NavMatch` (`pathname` + optional `query` / `absentQuery` / `includeChildren`), which is what lets `/chat?mode=analyze` and bare `/chat` be separate items with independent active states. Use it instead of adding pathname special-cases.
- Mobile has four tabs plus More. Each tab and each sidebar workspace uses a `sectionId` match, so every route in its workspace (Calendar, Inbox, `/vocab`, `/history`, `/vault`, …) keeps it lit; `isMoreRoute` lights More on every route no tab owns (Notes, Growth, AI Assistant, Settings). Settings also has its own icon in `MobileHeader`'s action row.
- `/home` is the private **Overview** dashboard (first tab and first sidebar entry) and renders inside the standard shell. Greeting + Quick Capture (primary) and Ask Hengo; then Today's focus (`TodayTasksCard`) beside Upcoming (`UpcomingEventsCard` — Google Calendar only when connected); Progress (`ActiveGoalsCard`, `TodayHabitCheckins`) beside Continue (`ContinueCard` — Quick Switcher recents, `LearningWidget` — one compact Korean-practice line); then Quick access (`QuickAccess` — in-app links from `lib/projects.ts`, favorites first). Portfolio copy (`AboutHSpace`, full `MyAppsSection`) belongs on the public landing page `app/page.tsx`, not here. Every card reads an existing query cache; selection logic lives in `lib/home-dashboard.ts` (tested). Don't add a dashboard-specific endpoint or table.
- `/mistakes` and `/daily-phrase` are deliberate redirect stubs (→ `/chat?mode=corrections` and `/practice`) kept so old bookmarks still work — don't delete them. Same for `/focus/*` (→ `/growth/recovery/*`, from before the Growth-workspace rename).
- **Immersive routes:** `/chat` and `/growth/recovery/pause` render full-bleed — no content padding, no mobile header, no bottom tabs; the pause route also drops the desktop sidebar and rail. `/home` is _not_ immersive. If you touch chat layout, check `AppShell`'s `isChatRoute` / `isPauseRoute` branches and `components/chat/ChatWindow.tsx`.
- Cross-component signals (open Quick Capture, start speech audio) use plain window events — `lib/quick-capture-bus.ts`, `lib/speech-audio.ts` — not a global store. `zustand` is in `package.json` but deliberately unused; don't reach for it for a one-off signal.

### Growth workspace (`/growth/*`)

- Three shipped features: **Habits** (`/growth/habits`, generic daily check-off habit tracking — `lib/habits.ts`, `lib/api/habits.ts`), **Recovery** (`/growth/recovery`, urge/trigger tracking with a guided pause, post-slip debrief, daily check-ins, insights, and spaced-repetition if-then plans — `lib/recovery.ts`, `lib/api/recovery.ts`), and **Journal** (`/growth/journal`, four-prompt daily entries with mood/energy — `lib/journal.ts`, `lib/api/journal.ts`). Three more (`Deep Work`, `Mood`, `Rewards`) are `soon` nav placeholders with no code yet.

### Growth workspace (`/growth/*`)

- Three shipped features: **Recovery** (`/growth/recovery`, urge/trigger tracking with a guided pause, post-slip debrief, and spaced-repetition if-then plans — `lib/recovery.ts`, `lib/api/recovery.ts`), **Journal** (`/growth/journal`, daily mood/wins/lessons reflection), and **Habits** (`/growth/habits`, generic daily check-off habit tracking — `lib/habits.ts`, `lib/api/habits.ts`). `/growth` is the workspace landing page (today's habit check-ins + cards for Habits, Journal, Progress, Review, Recovery); Growth's tabs are Overview · Habits · Journal · Progress, and Recovery is reached from the landing page's cards. Three more (`Deep Work`, `Mood`, `Rewards`) are `soon` nav placeholders with no code yet.
- **Recovery must stay domain-neutral — never name a specific compulsive behavior anywhere** (code, comments, copy, seed data, tests, commit messages). This repo is public under the maintainer's real name and used as a job-hunting portfolio; habit labels are user-entered free text only, and UI copy uses generic terms (moment / slip / pause / plan), never anything behavior-specific.
- Recovery's Supabase tables are still `kori_focus_*` (pre-date the Growth rename, hold live user data — not worth a migration for a naming-only change). `lib/api/recovery.ts` maps `kori_focus_*` rows to `Recovery*` app types (`lib/types.ts`); don't rename the tables without a real reason.
- Recovery's plan rehearsal reuses `lib/srs.ts` (the same SM-2 scheduler vocab uses) via a `PlanOutcome → ReviewRating` adapter in `lib/recovery.ts`, since "was this if-then plan EASY?" isn't a meaningful rating on its own.

### Second brain (cross-cutting)

- Capture → process → recall, spread across sections rather than living in one: **Inbox** (`/inbox`, quick capture via ⌘K / header button / mobile FAB), **Notes** (`/notes`, knowledge library with Postgres FTS), **Journal** (`/growth/journal`), **Timeline** (`/timeline`), **Reminders** (`/settings/reminders`), **Ask Hengo** (`/ask-hengo`), and **Review** (`/review/{morning,evening,weekly}`).
- Processing an inbox item is **additive and explicit**: converting to a Note/Task/Journal entry never deletes the source row — it sets `status = 'processed'` plus `converted_to_type` / `converted_to_id`.
- `/timeline` and all three `/review/*` pages are **pure client-side aggregations** (`lib/timeline.ts`, `lib/review.ts`) over already-fetched, date-bounded arrays — no SQL views, no new tables. Keep new aggregation logic there, framework-free and tested.
- Retrieval for Ask Hengo is Postgres FTS (`tsvector` + GIN generated columns), **not embeddings** — that was deliberately deferred, not forgotten. Memory candidates are never auto-approved; only `approved` rows re-enter a later prompt.
- `docs/second-brain-implementation.md` is the authoritative record (all six phases, plus the known gaps). Read it before extending any of these.

### Dates and timezones

Three deliberate conventions coexist — match the one the domain already uses instead of unifying them:

- **Browser-local** is dominant: `lib/date-utils.ts` (`toLocalDateString`, `localRangeFor`, …) for timeline, journal, habits, review.
- **Recovery hardcodes KST (+9h)** in `lib/recovery.ts` on purpose; **interview** uses `INTERVIEW_TIME_ZONE` (Seoul) via `lib/date-key.ts` so "today's drill queue" matches the learner's real day.
- **Reminders** are timezone-anchored per row via `@date-fns/tz`'s `TZDate`. The recurrence engine exists twice by necessity — TypeScript (`lib/reminders.ts`) for the UI, SQL (`kori_next_reminder_run`) for `pg_cron`. The client previews "next run" by calling the **SQL** function over `supabase.rpc()` so the two can't disagree. If you touch one, touch both.

### Supabase migrations

`supabase/migrations/*.sql`, applied to a database **shared with Orbit/DailyGoalMap** — confirm with the user before applying anything. House style: lowercase SQL, `create table if not exists`, the subselect form `(select auth.uid())` in RLS policies, named `if not exists` indexes, `check (jsonb_typeof(x) = 'object')` on jsonb columns, enum-like columns as `check (col in (…))` rather than Postgres enums, and **no `updated_at` trigger** — the app sets it on write. Two live-only footguns already hit once: `create or replace function` with an added parameter creates a second overload instead of replacing (drop the old signature), and new functions are `EXECUTE`-able by `PUBLIC` by default (revoke from `anon`/`authenticated` unless a client genuinely needs them).

### Data state

- TanStack Query is provided globally (`components/providers/app-providers.tsx`, staleTime 60s, no refetch on focus), but several hooks (`useChat`, parts of others) manage state manually with `useState` + direct api calls.
- `useChat` injects response-language and "Dev Mode" (technical Korean) instructions into the outgoing message text rather than via API parameters.

## Environment (`.env.local`)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — shared Orbit project.
- `OPENAI_API_KEY` — server-side, required for every `app/api/ai/*` route (set it in Vercel too when deploying).
- `NEXT_PUBLIC_AUTH_API_URL` — h-space-api's base URL (default `http://localhost:8080`). The API must have the Supabase bridge configured (`SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) and list this app's origin in its CORS config.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — must also be listed in h-space-api's `GOOGLE_CLIENT_IDS`.
- `NEXT_PUBLIC_VAPID_KEY` — web push, paired with the `kori-send-push` Edge Function; Telegram delivery pairs with `kori-send-telegram`.
- Optional model overrides: `AI_MODEL`, `TTS_MODEL` globally; `OPENAI_TEXT_MODEL`, `OPENAI_TRANSCRIBE_MODEL`, `OPENAI_TTS_MODEL` for Korean Coach (`lib/server/korean-coach/*`). All server-only — never prefix these with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_FEATURE_VAULT_LIVE=true` switches H-Vault (`/vault`) from its browser-local demo adapter to the `kori_vault_accounts` table. Leave it off until that migration is applied. **H-Vault passwords are end-to-end encrypted in the browser** (`lib/vault-crypto.ts`, PBKDF2 → AES-GCM; key held only in memory by `lib/vault-session.ts`). Only `v1.` ciphertext envelopes may reach `password_ciphertext` (enforced in `toWritableRow` and by a DB check). Never add a plaintext password path or persist the master password/key, and still no PIN/token/recovery-code/notes field. See `docs/h-vault.md`.
- `KOREAN_COACH_MOCK_MODE=true` serves visibly-labeled fixture feedback without calling OpenAI — useful for UI work on `/korean-coach` without burning credits. See `.env.example` for the full set and `docs/ai-korean-voice-coach.md` for the data flow.

## Conventions

- `components/ui/*` are shadcn/ui-style reusable primitives — keep them generic; feature-specific components live in `components/<feature>/`.
- Tailwind v4 (CSS-based config in `app/globals.css`; there is no `tailwind.config`). Dark mode via `next-themes` with `attribute="class"`.
- Animations use `motion/react` (the `motion` package), icons from `lucide-react`, toasts via `sonner`.
- Chat surfaces use `@assistant-ui/react` primitives (`components/assistant-ui/`) with `remark-gfm` + `react-syntax-highlighter` for markdown; charts use Recharts.
- Path alias `@/*` maps to the repo root.
- Mobile UI is tuned for iPhone 12 Pro Max: use `env(safe-area-inset-*)` padding and `100dvh`-style units as the existing layouts do.
- Pure domain logic goes in `lib/<domain>.ts` with a colocated `lib/<domain>.test.ts`; Supabase I/O goes in `lib/api/<domain>.ts`. That split is what keeps the tests fast and DB-free — don't collapse it.
- `docs/` holds the implementation record for the larger features (second brain, goal system v2, goal planning/scheduling, phrasebook, voice coach, navigation shell, responsive audit, testing strategy). Check for a relevant doc before extending a feature, and update it if you change what it describes.
- `dev-learning-notes/` is an unrelated embedded side project (own README/CLAUDE.md) — not part of the app; don't wire it in.
