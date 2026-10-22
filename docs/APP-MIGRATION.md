# Money Flow and Hengo migration

Luyra is the destination application. The migration used a strangler approach:
routes moved into Luyra one working slice at a time while the existing Supabase
projects kept owning their data until each slice was native.

## Current state

| Luyra route | Source product | Data source | Status |
| --- | --- | --- | --- |
| `/finance/**` | Money Flow | Luyra's Neon database | **Native.** Data copied and verified (below); the Money Flow session integration has been removed |
| `/learning` | Hengo | Hengo Supabase | Read-only slice on the shared Luyra session; currently paused (redirects to `/finance` in `proxy.ts`) |

## Money Flow data copy — verified

Money Flow's data was copied into Luyra's Neon `finance_*` tables in August
2026, keeping every original row id. On 2026-10-22 both databases were
compared read-only (counts, per-month totals, and md5 fingerprints of sorted
ids), for the one Money Flow account that holds the history:

| Data | Money Flow | Luyra | Result |
| --- | --- | --- | --- |
| Transactions, March–July | 424 | 424 | Identical ids, counts, KRW totals, and income counts per month |
| Transactions, Aug 1–19 (Money Flow's last day) | 61 | 61 + 3 | All 61 present by id. The 3 extra were entered in Luyra on Aug 22, dated back |
| Categories / payment methods | 27 / 3 | 27 / 3 | Identical ids. Names/classes differ only by later edits and `013`'s backfill |
| Budgets | 16 | 16 | Identical category ids and amounts |
| Savings goals | 1 | 1 | Same goal; the balance differs by the 2 contributions added in Luyra |

The only amount that differs on a copied transaction is one Aug 19 entry
edited in Luyra on Aug 22 (the same session as the 3 back-dated entries).
Money Flow's own last change was 2026-08-19 08:37 KST, before the copy, so
nothing written to Money Flow afterwards was missed.

Not copied, on purpose:

- Money Flow's other accounts: four accounts holding one transaction between
  them (a test account and sign-ups that never logged anything).
- `ai_financial_insights` (8 rows of old Money Coach output). Luyra's
  `finance_ai_insights` table exists but nothing reads it yet.
- `telegram_accounts`: Luyra links Telegram itself (`/api/telegram/link`).
- Tables that were empty for that account: recurring rules, templates,
  contributions, subscription status, description aliases.

## Retiring Money Flow

Luyra no longer reads anything from Money Flow. Remaining steps are all
outside this repository:

1. Keep using Luyra on its own for a while, to confirm nothing is missing.
2. Take a final backup of the Money Flow Supabase project (Database → Backups,
   or `pg_dump`) and keep it somewhere safe.
3. Remove `NEXT_PUBLIC_MONEY_FLOW_SUPABASE_*` from Luyra's Vercel environment
   if still set (see `DEPLOYMENT.md`).
4. Point money-flow.henheang.site at Luyra or take the Money Flow deployment
   down, and unlink its Telegram webhook so the bot only talks to Luyra.
5. Pause the Money Flow Supabase project once nothing depends on it.
   Pausing is reversible; deleting is not.

## Authentication model

Hengo is the primary Luyra identity. Google login uses Hengo's existing Google
Identity Services ID-token flow, so it does not require an application OAuth
callback route. Email and password remain available for Hengo email identities.

Money Flow and Hengo were different Supabase Auth projects with different
Google OAuth client IDs, so the Money Flow account was mapped to its Luyra
account explicitly for the copy rather than matched by email. The isolated
`luyra-money-flow-auth` browser session used by the original test slice has
been removed along with its code.

## Environment

The primary `NEXT_PUBLIC_SUPABASE_*` variables point to the Hengo project used
by Luyra Auth. The Hengo Google Identity Services flow also needs:

```text
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

Keep service-role keys server-side and out of this application.

## Hengo

Learning still follows the original sequence: port vocabulary, daily study,
interview, progress, and supporting routes as native Luyra routes on the
shared session; move shared UI and domain code into Luyra modules rather than
importing the old application; add writes only after each route's read path,
authorization, and error states are verified. Moving Hengo's rows into Neon is
a separate migration that needs its own identity mapping and rollback plan.
