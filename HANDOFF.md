# HANDOFF

## Snapshot

- **Updated:** 2026-11-23.
- **Checkout:** `main` at `12f9237` (#141 and #142 merged). The owner's checkout has unrelated uncommitted work that isn't ours: a whitespace-only change to `apps/web/lib/api/finance-client.ts`, plus untracked `false`, `v.title`, `luyra-web/`, `second-brain/.claudian/` and `second-brain/.obsidian/workspace.json`. Leave them alone.
- **#142 merged: habits are quicker to track every day** (`feat/habits-daily-checkin`, merge `12f9237`). No schema, RLS or API change: it uses the same `kori_habits` / `kori_habit_checkins` calls in `lib/api/habits.ts`.
  - **Week row:** each card on `/growth/habits` has the last 7 days as toggles (`components/habits/WeekStrip.tsx`), so a missed day is filled in from the list. Days before the habit started are disabled, as in `CheckinCalendar`.
  - **Instant check-ins:** `useHabitCheckins.toggleCheckin` (`hooks/useHabits.ts`) updates the query cache first. A failed save flips only that date back and shows a sonner toast. A second tap on a date still saving is ignored. It returns `true` once saved; the detail page celebrates only then. The Home widget and the detail calendar get this too.
  - **Today's progress:** "N of M done" with a bar on `/growth/habits`, via `useHabitsDoneToday` (`useQueries` over the cards' existing per-habit queries, so no extra requests).
  - **Pure helpers** in `lib/habits.ts`: `isDoneOn`, `withCheckin`, `lastNDates`.
  - **Local checks:** `pnpm test` 229 files / 2,499 tests (20 new), `tsc` clean, lint 0 errors / 6 old warnings (none in habit files), `pnpm build:web` passed.
  - **Browser check:** done with a temporary dev-only page (deleted, never committed) that rendered the real page over an in-memory fake `habitsApi` with synthetic habits. Today and backfill taps update at once; a simulated failed save rolls back with the toast; at 375px (light and dark) no horizontal overflow and day buttons are 41×50px; 768px and desktop fine.
  - **Not checked:** signed in with real data, on a real iPhone, or in production after the deploy.
- **#141 merged** (`06e3282`): restored the 2026-11-09 "MCP sign-in live in production" entry in `HANDOFF_HISTORY.md`. It had only ever been in a local working copy.
- **#140 merged** (finance exchange-rate log: name and SQLSTATE only, never the message). Not yet checked in production.
- **Merging:** three browser merges of #141 didn't register (the API kept answering `merged: false`). The owner's own `! gh pr merge <n> --merge` merged #141 and #142 at once. Use that first; always confirm with `gh api repos/Hen-Heang/h-space/pulls/<n>` before pulling.
- **Unchanged from 2026-11-22, not re-checked today:** the Neon `h-space-api` project is suspended by quota until 2026-12-01, so Finance (Neon `luyra`) and H-Vault (Neon `hspace`) are down. H-Vault also needs `VAULT_DATABASE_URL` in Vercel production. The MFA database rule `20261121120000_require_mfa_when_enrolled.sql` is not applied. Details in the 2026-11-22 history entry.

## Current focus

1. **Owner: try habits in production** once the #142 deploy is live. On the phone: tap today, backfill yesterday from the week row, and check the Home widget follows. Watch for anything that feels slow or unclear.
2. **Owner: Neon decision.** Wait for the 2026-12-01 reset or upgrade the `h-space-api` Neon project. Finance and H-Vault depend on it. Once it's back, open `/finance` to confirm the data loads.
3. **To bring H-Vault back (after Neon, needs owner approval):** the six steps in the 2026-11-22 history entry (focus item 2): create the `vault_app` role with SQL (not Neon's "New role" button), check its grants, repeat the local role test on a Neon branch, set `VAULT_DATABASE_URL`, unlock `/vault`, copy any Spring-only `inbox_items`.
4. **Check #140 in production:** while Neon is down, a `/finance` visit should log a single line, `[finance] cached exchange rate lookup failed: database unavailable (Neon compute quota or endpoint state)`.
5. **Owner, Supabase dashboard:** Google provider client ID, `{{ .Token }}` in the Magic link template, the reset-password redirect URLs. Until then only password sign-in works.
6. **Owner:** enroll an authenticator and a backup under Settings → Security; then apply the MFA database rule only with an explicit go-ahead.
7. **Owner, tidying:** delete `NEXT_PUBLIC_DATA_SOURCE_INBOX`, `NEXT_PUBLIC_AUTH_API_URL` and `NEXT_PUBLIC_HSPACE_API_URL` from Vercel and `apps/web/.env.example`; archive h-space-api; decide on rotating the legacy Supabase JWT secret (affects Orbit).
8. **Habits follow-up idea:** paused habits (`active = false`) aren't shown anywhere. A "Pause" action in `EditHabitDialog` and a Paused list would make that state usable.
9. **Carried over:** H-Vault step-up code and route rate limits; the independent H-Vault security audit (must cover `/api/vault`) and restore drill; Finance D–F follow-ups (`apps/web/docs/finance-redesign.md` §7); MCP live checks (MCP was verified live on 2026-11-09, see that history entry; the open items are the owner decisions listed there); UI audit follow-ups; whether `apiError`'s 500 path should log only the error's name and SQLSTATE.

## Notes for the next session

- **Windows machine (this session):** `python` is the Microsoft Store stub, so edit files with the editor tools or `node`. `pnpm build:web` needs `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1` here, or `next/font` can't fetch Google Fonts through TLS inspection. Same flag for `pnpm dev:web`.
- **Screenshots at phone width:** the Chrome extension's `resize_window` doesn't shrink a maximized window. A short Node script with `@playwright/test`'s `chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" })` and a 375px viewport works.
- **Checking signed-in UI without the owner's password:** a throwaway dev-only route that renders the page inside its own `QueryClientProvider` and swaps `habitsApi`'s functions for an in-memory fake works well. Delete it before committing.
- **Chrome:** five browsers are connected (three Windows, two macOS); "Browser 1" (Windows) was in use. The first `navigate` after creating a tab sometimes doesn't stick, so navigate twice and confirm the URL. Don't reuse the owner's tab: one navigation here landed in the tab where the owner was signing in.
- **Stashes:** `stash@{0}` ("local handoff notes 2026-11-09 (pre-pull)") and `stash@{1}` ("local handoff: MCP live snapshot 2026-11-09") are now covered by #141. Drop them only with the owner's OK.
- **Merged branches still on origin:** `docs/handoff-history-mcp-live`, `feat/habits-daily-checkin`, plus the older ones listed in the 2026-11-22 entry. Delete only with the owner's OK.
- Production logs: `vercel logs --project h-space --since 15m --level error --expand` from `apps/web`.
- `.claude/settings.json` denies `gh pr merge` and `psql` for the agent on purpose. Agents can't enter passwords.
