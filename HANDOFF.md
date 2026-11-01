# HANDOFF

## Snapshot

- **Updated:** 2026-11-01
- **Branch:** `main` at `fed3884`. No open pull requests; `main` is the only branch, locally and on GitHub. Web CI passes on `main`.
- **Merged today:**
  - **#37** fixed the `main` build: removed an unused duplicate Supabase bridge (`lib/supabase-bridge.ts`) and a Prettier failure in `lib/api/user.ts`. The live bridge is `getSupabaseAccessToken()` in `lib/auth-store.ts`.
  - **#35** Quick Capture Inbox can read and write hspace-api behind `NEXT_PUBLIC_DATA_SOURCE_INBOX=spring` (off by default). While on, new reminders on inbox items are refused (the Supabase dispatcher can't see Spring-only items), existing ones stay manageable, and deleting an item cancels its reminders.
  - **#38** Overview dashboard redesign (`HomeHero`, `SnapshotMetrics`, My Apps grid) and sign-in/sign-up layout (Google on top, keeps two-step verification handoff). Cherry-picked from `integrate/luyra-finance`.
  - **#39** circular theme-switch reveal (`components/theme-toggle.tsx`, `app/globals.css`), adapted from `Hen-Heang/henheang`.
- **Deliberately dropped:** `e5b7812` ("Let sign-in finish when the Supabase bridge is off"). #36's behavior stays: a failing bridge, including 503, revokes the session and shows the profile-load message.
- **Branches deleted:** `integrate/luyra-finance`, `docs/h-space-product-mission-20261030`, and each merged PR branch.
- **Verification:** On `main`: lint 0 errors (5 existing warnings), Prettier clean, 118 test files / 1,430 tests pass, production build passes. No database, migration, or live integration tests were run. Vercel production deployment status was not checked.

## Current focus

1. **Manual checks not yet done:** #38's dashboard and sign-in pages at 375 / 768 / 1024 / 1440 px and each sign-in path (email code, password, Google with and without two-step verification); #39's theme reveal in Safari (iPhone) and Firefox.
2. **Spring Inbox rollout:** copy inbox rows to hspace-api before setting `NEXT_PUBLIC_DATA_SOURCE_INBOX=spring`. Reminders on Spring-only inbox items need a backend change (dispatcher or a Spring-owned reminders service) and a written plan first.
3. Earlier Luyra integration/deployment context is in `HANDOFF_HISTORY.md` and `docs/ECOSYSTEM-INTEGRATION.md`.
