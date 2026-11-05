# Moving Luyra Finance into H-Space

**Decision (owner, 2026-11-04):** Luyra's finance product moves into `apps/web`
as the `/finance` area, keeping Luyra's look, data and flows. This replaces the
earlier "link only, deploy separately" stance in
[ECOSYSTEM-INTEGRATION.md](ECOSYSTEM-INTEGRATION.md) once the cutover below is
accepted. Until then `apps/luyra` and `luyra.henheang.site` keep running
unchanged and remain the rollback.

## Fixed constraints

- **Data stays in Luyra's Neon database.** No copy into H-Space's Supabase
  (shared with Orbit) and no schema change is needed to move. H-Space reaches
  Neon only from server route handlers through `FINANCE_DATABASE_URL`; the
  browser never talks to Neon.
- **Single user.** Finance rows are keyed by Luyra's `users.id` (the owner's
  id in Luyra's Supabase Auth project). H-Space identifies the caller through
  h-space-api, so the two are linked by explicit server config,
  `FINANCE_ACCOUNT_LINKS="<hspace-user-id>=<luyra-user-id>"`. It is never
  inferred from email. No link → 403; nothing configured → 503.
- Every finance query is scoped by the id from `requireFinanceUserId(req)`
  (or `requireFinanceSession` / `requireFinanceAppUser` in
  `lib/server/finance/auth.ts`), never by an id sent from the browser.
- Scheduled jobs scan the whole finance database, so they message only the
  Luyra users listed in `FINANCE_ACCOUNT_LINKS` (`onlyLinkedFinanceUsers`).
- Background jobs (crons, Telegram webhook, push, email) run in **exactly one**
  deployment at any time.
- Agents don't set Vercel env vars, deploy, or write to Neon; the owner does.

## Where the data lives (2026-11-04)

- **Old (archive):** Luyra's own Neon project (us-east-2, Postgres 18),
  database `neondb`. Kept as read-only history.
- **New:** a separate database in the h-space-api Neon project
  (ap-southeast-1, Postgres 17), owned by its own least-privilege role.
  (Project ids and role names are kept out of this public repo; they're in
  the owner's Neon console.) A separate database: the `hspace` database
  (h-space-api's auth, Inbox and H-Vault, managed by Flyway) is not touched,
  and the finance role has no access to it.
- Copied with `pg_dump`/`pg_restore` 18.6 (schema `public` only; Neon's
  `neon_auth` schema left out). Verified: 54/54 tables, identical row counts
  and per-table content fingerprints, identical columns, defaults and 117
  indexes; 218 constraints match (Postgres 17 doesn't list the 448 NOT NULLs
  as constraints; 9 CHECKs print with a different cast but are equivalent).
- **Decision (owner, 2026-11-04): the old `luyra` project is the archive.**
  H-Space + the new database are the working copy from now on; Luyra's
  Vercel `DATABASE_URL` is **not** switched, and the two databases are
  expected to diverge. Keep the old project as historical data and as the
  rollback source.
- So that the archive stays as it was, Luyra must stop writing to it: stop
  entering data in Luyra, and turn off Luyra's Vercel Cron jobs (the daily
  `recurring` job inserts transactions; alerts/reports send Telegram, push
  and email). Owner action in Vercel — agents don't change production
  settings.
- Until H-Space ports those jobs (step 4), nothing creates recurring
  transactions or sends finance alerts in the new database; add recurring
  entries by hand meanwhile.
- Moving finance into Spring's own `hspace` database (Flyway + `finance-api`)
  remains a later, separate step.

## Code layout in `apps/web`

| Luyra | H-Space |
| --- | --- |
| `types/finance.ts`, `lib/finance-format.ts`, `lib/finance/*` (pure) | same paths — copied verbatim so the remaining files port without import edits |
| `lib/db/index.ts` | `lib/server/finance/db.ts` (`FINANCE_DATABASE_URL`) |
| `lib/auth/ensure-app-user.ts` | `lib/server/finance/auth.ts` → `requireFinanceUser` |
| `lib/repositories/finance-*` | `lib/server/finance/repositories/*` |
| `app/api/finance/*` | `app/api/finance/*` (Bearer token, like `app/api/ai/*`) |
| `lib/api/finance.ts` + hooks | `lib/api/finance.ts` (attaches the H-Space token) |
| `app/(app)/finance/*`, `components/finance/*` | `app/(main)/finance/*`, `components/finance/*` |
| Luyra color tokens in `app/globals.css` | scoped under a `.luyra` wrapper on the finance layout only |

Luyra's paused Hengo routes (today, tasks, goals, habits, learning) are **not**
moved; H-Space already owns those.

## Steps

0. **Decide and verify** — this document; the rules in `AGENTS.md`,
   `apps/luyra/AGENTS.md` and `apps/web/AGENTS.md` updated. ✅
1. **Foundation** — pure finance logic + tests, Neon client, account link and
   `requireFinanceUser`. ✅ (this branch)
2. **First screens** — ✅ code (2026-11-04), ported from `luyra-web` @ `f63fcb8`.
   `/finance` (overview), `/finance/transactions`, `/finance/analytics`, in
   Luyra's scoped style with a local Finance nav. The transactions screen
   brings its own flows, so these routes include writes: transactions
   (create/edit/delete/bulk), templates and recurring rules. Reads only for
   categories, payment methods, budgets, savings and preferences. The nav's
   Finance item (`apps-luyra`: sidebar, My Apps tab, Quick Switcher, phone
   More sheet) now opens `/finance` in H-Space. The external Luyra card was
   removed from My Apps (`lib/projects.ts`) on 2026-11-05. Overview links to
   budgets, review and settings 404 until those slices land — use Luyra for
   them meanwhile.
   - Verified: unit + route denial tests; UI sweep at 320–1440px, light and
     dark, against synthetic fixtures (`tests/e2e/finance-fixtures.ts`).
   - Two responsive fixes vs Luyra: the transactions toolbar wraps, and the
     analytics grid is `grid-cols-1` so long category names truncate.
   - `queryClient.query()` → `fetchQuery()` (H-Space's TanStack Query is older).
   - **Owner still to verify with real data:** set `FINANCE_DATABASE_URL` and
     `FINANCE_ACCOUNT_LINKS` in `apps/web/.env.local`, then compare the three
     screens against live Luyra.
3. **Budgets + recurring job** — ✅ code (2026-11-04).
   - `/finance/budgets` (set/edit/delete category budgets) with
     `PUT /api/finance/budgets` and `DELETE /api/finance/budgets/[categoryId]`.
   - Daily recurring job: `GET /api/finance/cron/recurring`, scheduled in
     `apps/web/vercel.json` at `0 0 * * *` (09:00 KST, same as Luyra). Needs
     `CRON_SECRET` in H-Space's Vercel env, else it answers 503 and does
     nothing. Telegram summaries only if `TELEGRAM_BOT_TOKEN` is set there.
   - **Security fix vs Luyra:** transaction create/edit, templates, recurring
     rules and budgets now reject a category or payment method that isn't
     the caller's (`services/finance-ownership.ts`); Luyra only checked this
     for bulk recategorize.
4. **Remaining screens, one feature per PR** — each with a denial test.
   - Savings — ✅ code (2026-11-04, branch `feat/finance-savings`):
     `/finance/savings`, goals create/edit/delete and contributions
     (`/api/finance/savings`, `/[id]`, `/[id]/contributions`). Luyra's
     service already checked goal ownership; route tests cover it.
   - Subscriptions + merchant names — ✅ PR #77.
   - Review + next-month budget plan — ✅ PR #78 (plan apply is rebuilt
     server-side; foreign categories/amounts → 409).
   - Settings, reports (print/email/Telegram send) and CSV/JSON export —
     ✅ PR #79 (`/reports-print` outside the shell; export via Bearer
     download). Left out: Luyra's theme toggle (H-Space has one).
   - To do: AI Money Coach (provider decision: Claude vs H-Space's OpenAI).
5. **Background flows**
   - Alert/report jobs — ✅ code (branch `feat/finance-alert-jobs`):
     `/api/finance/cron/{daily-reminder,budget-alerts,daily-log-reminder,
     spending-spike,weekly-summary,monthly-report}` on Luyra's schedules in
     `apps/web/vercel.json`, all behind `CRON_SECRET`. They deliver by
     Telegram (`TELEGRAM_BOT_TOKEN`) and/or email (`RESEND_API_KEY`,
     optional `RESEND_FROM_EMAIL`); with neither set they do nothing. Sent
     reports are marked per month/channel in the database, so a report is
     never sent twice. **Turn Luyra's Vercel Cron Jobs off when this
     deploys**, or each alert arrives twice (one from the archive).
   - Telegram — server ✅ (branch `feat/finance-telegram-push`). Luyra and
     H-Space share **one bot** (owner, 2026-11-04), and H-Space already owns
     linking (Settings → Reminders → `kori_telegram_links`). So finance
     doesn't port Luyra's link/webhook: `GET/POST/DELETE
     /api/finance/telegram/link` reports status, copies the chat from the
     caller's own H-Space link (read with their RLS client, never a service
     key) into Neon `telegram_accounts` for the scheduled jobs, or stops
     finance messages. Chat ids never reach the browser. The bot's webhook
     stays wherever H-Space's linking flow needs it.
   - To do: the Finance → Settings section for that link (UI).
   - Not planned for now (owner, 2026-11-04): finance Web Push / push
     budget alerts — Telegram and email cover the same alerts, and a second
     push subscription can't coexist with H-Space's own in one browser.
     The ported push code (`push-notification-service`, the push
     subscription repository, the `web-push` dependency) was removed on
     2026-11-05; the copied `push_subscriptions` rows are left untouched.
6. **Cutover** — `luyra.henheang.site` redirects to H-Space `/finance`. (The
   My Apps card for Luyra was already removed on 2026-11-05.) The old `luyra`
   Neon project stays as the read-only archive (no Luyra `DATABASE_URL` change).
7. **Cleanup** — remove `apps/luyra` after the owner accepts the cutover.

## Known gaps to handle on the way

- `lucide-react`: Luyra uses 1.x, H-Space 0.577 — some icon names differ.
- Next.js: Luyra 16.3.1, H-Space 16.1.6.
- Luyra's Money Coach uses `@anthropic-ai/sdk`; H-Space AI routes use OpenAI
  and `lib/server/ai-limits.ts`. Decide when step 3 reaches it.
- `lib/csp.ts`: Neon and exchange-rate calls are server-side, so no
  `connect-src` change is expected; re-check if a page fetches a new origin.

## Finding the two ids for `FINANCE_ACCOUNT_LINKS`

- **H-Space user id:** the `sub` of the bridged Supabase token, the same id
  `lib/auth-store.ts` exposes.
- **Luyra user id:** the `id` in Neon's `users` table, which is the user's id
  in Luyra's Supabase Auth project.

Both are UUIDs. Keep them in `.env.local` and Vercel, not in Git.
