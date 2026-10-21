# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project

H-Space is a personal software ecosystem and portfolio built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and shadcn/ui. The existing Korean-learning product remains a first-class area named Hengo Learning. The full learning vision and module list live in `GuideLineNew.md`.

## Commands

Use **pnpm**.

```bash
pnpm dev          # dev server at localhost:3000
pnpm build        # production build
pnpm lint         # eslint
pnpm test         # run all tests (vitest run)
npx vitest run lib/vocab-review.test.ts   # run a single test file
```

Tests are plain vitest unit tests colocated in `lib/*.test.ts` — there is no vitest config file; defaults apply.

**Local dev on machines with corporate SSL inspection**: Node.js does not trust the interception CA, so every server-side fetch — Supabase auth in `requireUser`, OpenAI calls — fails with `SELF_SIGNED_CERT_IN_CHAIN` and all `app/api/ai/*` routes return 401 "Invalid session" even for valid logins. Run the dev server with `NODE_EXTRA_CA_CERTS` pointing at your exported corporate TLS-inspection root CA. Browser-side Supabase calls are unaffected, so the symptom is "everything works except AI".

## Architecture

**Client-side SPA over Supabase, plus a thin set of Next.js AI routes.** The former Spring Boot backend was replaced (July 2026): data now lives in Supabase and the AI features run in `app/api/ai/*` route handlers — the only server-side code in the app. The old Spring implementations were removed in this migration's cleanup; see git history if they're ever needed again.

### Supabase — data + auth

- `lib/supabase.ts` holds the single browser client. The Supabase project is **shared with Orbit/DailyGoalMap**: KoriAI-owned tables are prefixed `kori_`; the goals/tasks domain reuses Orbit's original tables (`goals`, `tasks`, …) and RPCs. All tables have RLS; queries rely on it rather than filtering by user id everywhere.
- Auth is Supabase auth (email/password + Google via `signInWithIdToken`, see `lib/google-auth.ts`). Session persists under the fixed storage key `koriai-auth` so `lib/auth-store.ts` can read the user id synchronously. The route guard is client-side only: `app/(main)/layout.tsx` redirects to `/login`.

### API layer — `lib/api/` (the single integration point)

- Per-domain service package: each domain file (`auth.ts`, `chat.ts`, `vocab.ts`, `goals.ts`, `interview.ts`, `reading.ts`, `progress.ts`, `learning.ts`, `foundations.ts`, `tts.ts`, `push.ts`, `user.ts`, `notes.ts`, `recovery.ts`, `habits.ts`) queries Supabase directly and maps snake_case rows to the app's camelCase types. `lib/api/index.ts` is a barrel — import from `@/lib/api` (e.g. `import { vocabApi, getApiErrorMessage } from "@/lib/api"`). Add a new backend call to the matching domain file, not inline in components.
- `lib/api/errors.ts` — `getApiErrorMessage` formats supabase-js / fetch errors; used by most hooks and pages.
- `lib/api/ai-client.ts` — `aiPost` / `authHeaders` attach the Supabase access token for calls to `app/api/ai/*`. `lib/api/sse.ts` parses the SSE streams.

### AI routes — `app/api/ai/*`

- `lib/server/ai.ts` is the shared plumbing: `requireUser` (verifies the caller's Supabase JWT and returns a per-request client so **RLS applies — no service key anywhere**), `jsonAiRoute` (zod schema + prompt → `generateObject` → JSON), and SSE helpers.
- Models via `@ai-sdk/openai`; server-side `OPENAI_API_KEY`, default model `gpt-5-mini` (override with `AI_MODEL`). TTS (`app/api/ai/tts`) proxies OpenAI's audio API and returns MP3 bytes.
- Streaming (`chat/stream`, `goals/coach`) keeps the same SSE event protocol the Spring backend used: `start` / `token` / `done` / `error`. `chat/stream` also persists both message rows in `kori_messages`.

### Routing & app shell

- Route groups: `app/(auth)/` (login, register) and `app/(main)/` (everything else).
- `app/(main)/layout.tsx` is the entire app shell: contextual desktop sidebar, mobile top bar, mobile bottom tab bar, soft-keyboard detection via `visualViewport`.
- **Nav is data-driven:** `lib/navigation.ts` is the single source of truth — five workspaces (`Learning`, `Productivity`, `AI`, `Progress`, `Growth`) that the sidebar, bottom tabs, and mobile "More" sheet all render from. Add, move, or hide features there (a `soon` flag renders a disabled entry), not in the shell. The desktop sidebar shows only the active workspace's links (`getWorkspaceForPath`) below an icon-only workspace-switcher row.
- `/home` is the workspace gate: four poster cards (Learning / Productivity / Progress / Growth). The first three deep-link to the last route visited in that workspace (`lib/last-visited.ts`); Growth's card links to a fixed `/growth/habits` since `WorkspaceId` there only covers `learning`/`productivity`/`progress` (same pre-existing gap as `ai` — not yet addressed).
- `/mistakes` and `/daily-phrase` are deliberate redirect stubs (→ `/chat?mode=corrections` and `/practice`) kept so old bookmarks still work — don't delete them. Same for `/focus/*` (→ `/growth/recovery/*`, from before the Growth-workspace rename).
- **Immersive routes:** on `/chat` and `/home` the mobile header, bottom tabs, and content padding are all removed for a full-bleed experience (`/home` also drops the desktop sidebar and top bar). If you touch chat layout, check the shell's `isChatRoute` / `isHomeRoute` branches and `components/chat/ChatWindow.tsx`.

### Growth workspace (`/growth/*`)

- Two shipped features: **Habits** (`/growth/habits`, generic daily check-off habit tracking — `lib/habits.ts`, `lib/api/habits.ts`) and **Recovery** (`/growth/recovery`, urge/trigger tracking with a guided pause, post-slip debrief, and spaced-repetition if-then plans — `lib/recovery.ts`, `lib/api/recovery.ts`). Four more (`Deep Work`, `Mood`, `Journal`, `Rewards`) are `soon` nav placeholders with no code yet.
- **Recovery must stay domain-neutral — never name a specific compulsive behavior anywhere** (code, comments, copy, seed data, tests, commit messages). This repo is public under the maintainer's real name and used as a job-hunting portfolio; habit labels are user-entered free text only, and UI copy uses generic terms (moment / slip / pause / plan), never anything behavior-specific.
- Recovery's Supabase tables are still `kori_focus_*` (pre-date the Growth rename, hold live user data — not worth a migration for a naming-only change). `lib/api/recovery.ts` maps `kori_focus_*` rows to `Recovery*` app types (`lib/types.ts`); don't rename the tables without a real reason.
- Recovery's plan rehearsal reuses `lib/srs.ts` (the same SM-2 scheduler vocab uses) via a `PlanOutcome → ReviewRating` adapter in `lib/recovery.ts`, since "was this if-then plan EASY?" isn't a meaningful rating on its own.

### Data state

- TanStack Query is provided globally (`components/providers/app-providers.tsx`, staleTime 60s, no refetch on focus), but several hooks (`useChat`, parts of others) manage state manually with `useState` + direct api calls.
- `useChat` injects response-language and "Dev Mode" (technical Korean) instructions into the outgoing message text rather than via API parameters.

## Environment (`.env.local`)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — shared Orbit project.
- `OPENAI_API_KEY` — server-side, required for every `app/api/ai/*` route (set it in Vercel too when deploying).
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — must also be registered under Supabase Auth > Providers > Google.
- `NEXT_PUBLIC_VAPID_KEY` — web push, paired with the `kori-send-push` Edge Function.
- Optional: `AI_MODEL`, `TTS_MODEL`.

## Conventions

- `components/ui/*` are shadcn/ui-style reusable primitives — keep them generic; feature-specific components live in `components/<feature>/`.
- Tailwind v4 (CSS-based config in `app/globals.css`; there is no `tailwind.config`). Dark mode via `next-themes` with `attribute="class"`.
- Animations use `motion/react` (the `motion` package), icons from `lucide-react`, toasts via `sonner`.
- Path alias `@/*` maps to the repo root.
- Mobile UI is tuned for iPhone 12 Pro Max: use `env(safe-area-inset-*)` padding and `100dvh`-style units as the existing layouts do.
- `dev-learning-notes/` is an unrelated embedded side project (own README/AGENTS.md) — not part of the app; don't wire it in.
