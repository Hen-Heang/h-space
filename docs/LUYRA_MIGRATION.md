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
- Every finance query is scoped by `requireFinanceUser(req).financeUserId`,
  never by an id sent from the browser.
- Background jobs (crons, Telegram webhook, push, email) run in **exactly one**
  deployment at any time.
- Agents don't set Vercel env vars, deploy, or write to Neon; the owner does.

## Where the data lives (2026-11-04)

- **Old:** Neon project `luyra` (`divine-darkness-19631415`, us-east-2,
  Postgres 18), branch `main`, database `neondb`. Luyra production still
  reads and writes here until its Vercel `DATABASE_URL` is switched.
- **New:** Neon project `h-space-api` (`delicate-voice-81285481`,
  ap-southeast-1, Postgres 17), branch `production`, database **`luyra`**,
  owned by role **`luyra_app`**. A separate database: the `hspace` database
  (h-space-api's auth, Inbox and H-Vault, managed by Flyway) is not touched,
  and `luyra_app` has no access to it.
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
   More sheet) now opens `/finance` in H-Space; the public My Apps card in
   `lib/projects.ts` still links to Luyra. Overview links to budgets, review
   and settings 404 until those slices land — use Luyra for them meanwhile.
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
   - To do: subscriptions, review, settings (categories, payment methods,
     preferences, reports), export, Money Coach.
5. **Background flows** — the other crons (alerts, reports, spikes), Telegram webhook, Web Push (subscriptions are
   origin-bound: re-subscribe on H-Space), Resend email links. Switch each off
   in Luyra in the same change that switches it on here.
6. **Cutover** — `luyra.henheang.site` redirects to H-Space `/finance`; My Apps
   card becomes an internal link. The old `luyra` Neon project stays as the
   read-only archive (no Luyra `DATABASE_URL` change).
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
