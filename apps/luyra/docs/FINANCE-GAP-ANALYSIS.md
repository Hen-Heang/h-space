# Finance gap analysis

Audit date: 2026-08-26.

Direction of this audit: what the `money-flow` reference checkout
(`E:\Fullstack\money-flow`, v1.2.0) has that Luyra's Finance module does not
yet have. Money Flow is a reference only — Luyra's own auth, API routes,
services, repositories, and Neon tables stay authoritative.

This document complements [FINANCE-UI-PARITY.md](./FINANCE-UI-PARITY.md).
That file is a screen-by-screen UX parity audit; this one is a
backend/infrastructure/feature gap list, with the current code verified
against both trees.

> **The parity doc is partly stale.** `FINANCE-UI-PARITY.md` still marks
> "AI Money Coach" and "Dashboard quick add" as `MISSING`. The Money Coach is
> built (`lib/services/finance-money-coach-service.ts`,
> `components/finance/settings/money-coach-section.tsx`), including the
> Apply-recommendation path. Only the AI-generated *quick transaction entry*
> is still absent. Those rows should be refreshed.
>
> **Update (Financial Health phase):** the "Category spending class" row this
> document used to carry under §3 ("No schema and no code") was wrong —
> `finance_categories.spending_class` has been in `004_finance.sql` since the
> original migration. It was `SCHEMA_ONLY` (§2), not missing entirely. As of
> this phase it's fully wired: `lib/finance/spending-class.ts` maps it to the
> Essentials/Lifestyle/Future buckets, `lib/finance/financial-health.ts`
> computes the 50/30/20-style summary, it's exposed in the category editor
> (`components/finance/settings/category-sheet.tsx`), and it's surfaced on
> `/finance` as the "Financial health" section. No longer a gap.

Status meanings used below:

- `MISSING` — no code and no schema.
- `SCHEMA_ONLY` — the table or column exists in `db/migrations/` but nothing
  in `lib/`, `app/`, or `components/` reads or writes it.
- `MANUAL_ONLY` — the behavior works, but only when a human presses a button;
  Money Flow runs it on a schedule.

## 1. Scheduling — mostly resolved

Luyra now has `app/api/cron/**` and a `vercel.json`, gated on `CRON_SECRET`
through `lib/server/cron.ts`. Five of Money Flow's eight jobs have Luyra
equivalents; the three still missing all depend on features Luyra doesn't
have yet rather than on the scheduler.

| Money Flow job | Purpose | Luyra status |
|---|---|---|
| `/api/cron/budget-alerts` | Alert only on crossing to a higher threshold level | `DONE` |
| `/api/cron/spending-spike` | Alert when today far exceeds the month's daily average | `DONE` |
| `/api/cron/daily-reminder` | Telegram nudge to log expenses | `DONE` — skips users who already logged that day |
| `/api/cron/weekly-summary` | Weekly financial check-in | `DONE` |
| `/api/cron/monthly-report` | The completed month, once per user | `DONE` |
| `/api/cron/recurring` | Create due recurring transactions | `DONE` — catches up every missed occurrence (capped per run) and is idempotent via a unique `(recurring_id, date)` index |
| `/api/cron/savings` | Send or apply due savings contributions | `MISSING` — blocked on §2's savings auto-plan |
| `/api/cron/cleanup-exchange-rates` | Delete rates older than 30 days | `MISSING` — rates accumulate forever |

Two differences from the Money Flow originals, both deliberate:

- **Date math is pinned to Asia/Seoul** (`lib/finance-cron-time.ts`). Money
  Flow resolves each user's own timezone; Luyra has no per-user timezone
  column that anything populates, and every other KRW assumption in Finance is
  already Seoul-based. `lib/finance-month.ts` stays as it is — it runs in the
  browser, where server-local time is the user's own clock.
- **Idempotency lives on `finance_preferences`**
  (`010_finance_report_delivery.sql`) rather than in a delivery log. One row
  per user already exists there, and "the last period we sent" is the only
  fact either report job needs.

Email delivery remains manual-only — the scheduler drives Telegram alone.

## 2. Schema ported, feature never built

These are already in `db/migrations/004_finance.sql`, but no application code
touches them. Verified with a repo-wide grep across `lib/`, `app/`, and
`components/`.

| Item | Status | Money Flow equivalent | Notes |
|---|---|---|---|
| ~~`finance_recurring_transactions`~~ | `DONE` | `/api/recurring` (GET/POST/PUT/DELETE), `components/transactions/RecurringSheet.tsx`, `/api/cron/recurring` | `014_finance_recurring.sql` + `/api/finance/recurring`, `components/finance/transactions/recurring-sheet.tsx`. Unlike Money Flow: monthly/yearly rules keep an anchor day (no Jan 31 → Feb 28 → Mar 28 drift), missed days catch up in one run, and a rule due today applies on save. The savings auto-plan is still open. |
| ~~`finance_transaction_description_aliases`~~ | `DONE` | `components/budget/MerchantNamesSheet.tsx`, `lib/finance/analysis/aliases.ts` | `lib/finance/merchant-names.ts` + Subscriptions → Merchant names. Spelling variants (`NETFLIX` / `Netflix.com`) group automatically; real variants (`Claude` / `Claude AI Pro`) are suggested and merged only on confirmation, undoable. Unlike Money Flow, punctuation becomes a space (so `netflix.com` isn't `netflixcom`), name containment counts as similar, and words used across many descriptions ("lunch") are treated as generic so free-text phrases aren't suggested. |
| `finance_ai_insights` | `SCHEMA_ONLY` | `lib/finance/insights/{generate,rules,ai}.ts`, `20260727_ai_money_coach.sql` | Money Coach output is not persisted, so there is no Review / Apply / Snooze / Dismiss history and no rules-based (non-AI) insight tier. |
| Savings `auto_monthly_usd`, `last_auto_month`, `reminder_day`, `skipped_month`, `last_reminder_month` | `SCHEMA_ONLY` | `savings/_components/SavingsCoach.tsx`, `20260320_savings_auto_deposit.sql`, `20260718164519_savings_confirmation_reminders.sql` | Contributions are manual-only. No planned amount, no reminder day, no month skip, no progress celebration. |

## 3. No schema and no code

| Feature | Money Flow source | Notes |
|---|---|---|
| AI chat over your own data | `/api/chat`, `lib/finance/chat-tools.ts`, `components/ai/{ChatBot,ChatLauncher,DeferredChatBot}.tsx` | Luyra's AI is one-shot monthly-report commentary only. Money Flow exposes tool-calling against the user's finance data. |
| AI quick entry | `/api/ai/parse-transaction`, `/api/ai/suggest-category`, `lib/ai/transaction-parser.ts` | Natural language to a draft transaction. Note AGENTS.md's rule: free text must never write financial data without a deterministic, confirmed path. |
| Category and payment-method management | `settings/_components/{CategoriesSection,PaymentMethodsSection}.tsx` | Luyra's `app/api/finance/categories/route.ts` and `app/api/finance/payment-methods/route.ts` export **GET only**. Users cannot create, rename, recolor, reorder, or delete either one. |
| ~~Review to next-month plan~~ | `POST /api/finance/budget-plan`, `/api/finance/goal-plans`, `review/page.tsx` | `DONE` — `lib/finance/budget-plan.ts` (pure, tested) builds the plan; last month's review shows it, and `POST /api/finance/review/plan` applies the confirmed subset in one transaction after re-deriving it server-side (409 if it changed). Unlike Money Flow, the plan includes the reviewed month itself and is only offered for the most recent complete month. Money Flow's what-if simulation and `goal-plans` were not ported. |
| ~~Appearance / theme setting~~ | `settings/_components/AppearanceSection.tsx` | `DONE` — System / Light / Dark in Finance Settings → Appearance and the profile menu, saved per device (`lib/theme.ts`). An inline `<head>` script sets `<html data-theme>` before first paint, so there's no flash; `dark:` utilities and the token block both key off that attribute. |
| Web push | `20260410_push_subscriptions.sql` | Absent — **and there is nothing to port.** `push_subscriptions` appears only in SQL (that migration, `20260514_explicit_grants.sql`, `scripts/neon-schema.sql`) with zero application code on Money Flow's `origin/main`: no `web-push` dependency, no VAPID keys, no `pushManager.subscribe`, no service-worker `push` handler. Building it in Luyra would be from scratch, and the Money Flow table's `references auth.users(id)` + RLS shape doesn't transfer — Luyra's app data is in Neon, with authorization in the route handler. Telegram (§1) is the working notification channel in both apps. |
| Avatar upload | `20260525_avatars_storage.sql`, `components/ui/Avatar.tsx` | Luyra's `components/ui/UserAvatar.tsx` is display-only. |
| App version endpoint | `/api/version`, shown in Settings | Absent. |
| AI provider selection | `/api/settings/ai-provider`, `settings/ai/page.tsx`, `20260606_ai_provider.sql` | Money Flow lets the user pick Gemini or OpenAI, with the other as fallback. Luyra is Anthropic-only via `lib/ai/client.ts`. Low priority — single-provider is a defensible choice, not a defect. |

## 4. Transaction screen UX gaps

Luyra already has debounced search, a filter panel, and templates
(`components/finance/transactions/`). Still missing:

- ~~**Bulk actions**~~ `DONE` — **Select** on Transactions; bulk delete and
  recategorize via `POST /api/finance/transactions/bulk` (user-scoped, ≤200
  rows, category must fit every selected row).
- **Swipe row actions** — `components/transactions/SwipeableRow.tsx`. Luyra is
  tap-to-edit plus a dropdown menu. Deliberately deferred in the parity doc
  (needs on-device testing, and there is no harness in this repo).
- **Search history** — `transactions/_hooks/useSearchHistory.ts`.
- ~~**Description suggestions**~~ `DONE` — chips under the description field
  from `GET /api/finance/transactions/suggestions` (last 12 months, frequency
  with prefix matches weighted ×3); picking one also fills the last category
  and payment method on a new entry.
- **Shared mobile UI primitives** — Money Flow has `NumericKeypad`,
  `usePullToRefresh`, `useKeyboardShortcuts`, `OfflineBanner`,
  `AnimatedNumber`, `FAB`, and `Skeleton`. Luyra has none of these.

## 5. Engineering hygiene

- **Tests exist, but only for the Financial Health domain logic.** The
  Financial Health phase added Vitest (`npm test`, `vitest.config.ts`) and
  `lib/finance/{spending-class,financial-health}.test.ts` — pure-function
  coverage for the bucket mapping and 50/30/20 calculation, including the
  zero-income and boundary cases. `lib/services/finance-*.ts` (the DB-backed
  service layer) and `lib/repositories/**` still have zero coverage, and
  there's still no `e2e/`. Money Flow runs roughly fifteen Vitest suites
  across `lib/finance/analysis` plus Playwright desktop and mobile journeys —
  a useful reference for how far this could go.
- **No route-level boundaries.** Luyra has zero `loading.tsx`, `error.tsx`,
  `not-found.tsx`, or `global-error.tsx`. Money Flow ships one per route.
  Today an API failure inside a Finance route has no boundary to catch it.
- ~~**No client-side query caching.**~~ `DONE` — lookups, preferences, the
  transaction list (infinite query), overview, analytics, budgets, and
  savings goals are on TanStack Query (`lib/query/finance-queries.ts`).
  Which writes make which screens stale is one map there (`invalidateAfter`),
  tested in `finance-queries.test.ts`; transaction writes arrive through the
  existing `emitTransactionChanged` event. Still uncached on purpose: the
  exchange rate (server-cached), Review, Subscriptions, reports, and the
  contribution-history sheet.
- ~~**Unapplied migration.**~~ Resolved — verified 2026-10-22 against the
  production database: `finance_savings_contributions_goal_id_fkey` is
  `ON DELETE CASCADE`, so `007_finance_savings_contributions_cascade.sql` is
  applied and deleting a goal with contribution history works.

## Suggested order

1. ~~**Cron infrastructure + `vercel.json`.**~~ Done — see §1. Still inert
   until the app is deployed and `CRON_SECRET` is set.
2. ~~**Category and payment-method CRUD.**~~ Done.
3. ~~**Recurring transactions.**~~ Done. The table is already there, the savings
   auto-plan reuses the same due-date machinery, and the two remaining cron
   jobs (`recurring`, `savings`) are blocked behind it.
4. **Route loading/error boundaries, then a Vitest setup** over
   `lib/services/finance-*.ts`. The cron services are the strongest argument
   for tests yet: their date math and idempotency rules are pure functions
   with no UI to eyeball.
5. **Merchant aliases, spending class, AI chat.** Larger, genuinely new
   domains — worth their own phases.

Items intentionally excluded from Luyra remain excluded: Money Flow
authentication, browser-side Supabase CRUD, and any AI path that writes
financial data without explicit confirmation.
