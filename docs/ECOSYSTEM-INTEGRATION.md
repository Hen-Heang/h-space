# H-Space and Luyra integration

## Application boundaries

```text
Hen-Heang/h-space
├── apps/web    H-Space, including Hengo Learning
└── apps/luyra  Luyra Finance, separately deployed
```

Luyra was imported with `git subtree add --prefix=apps/luyra luyra main`.
The resulting subtree commit preserves the source repository's commit history
and the original `luyra-web` repository remains unchanged. To refresh Luyra
from its source repository, fetch `luyra` and use `git subtree pull` with the
same prefix. To roll back this import, revert the subtree import commit; to
roll back only later integration edits, revert their commits. Neither action
changes the original Luyra repository or either database.

The root `pnpm-workspace.yaml` intentionally includes only `apps/web`. Luyra
keeps `apps/luyra/package-lock.json` and runs independently with npm until
dependency compatibility and Vercel's monorepo install behavior have been
verified. Do not merge the lockfiles as part of this integration.

## Data and authentication

- H-Space continues using its existing Supabase project and RLS protected data.
- Luyra uses Supabase Auth for identity and session cookies. Its server-side
  API routes call `ensureAppUserId()` / `requireAppUserSession()` to verify the
  user, then scope finance repositories by that verified user id.
- Luyra's financial application data stays in its existing Neon database.
  H-Space does not call Neon or show finance amounts.
- Luyra's `docs/APP-MIGRATION.md` records the prior Money Flow import. That
  import is historical and must not be repeated.
- Auth remains independent in each app. This integration does not provide SSO
  or share cookies. No tokens, database credentials, or service keys cross
  application boundaries.
- H-Space persists Supabase JS auth under `koriai-auth`; Luyra uses
  `@supabase/ssr` browser/server clients and request cookies. Local environment
  files do not provide both Supabase project URLs, so whether both apps use
  the same Supabase project and user identity could not be verified. Verify
  that before designing any SSO work.

## Navigation and product scope

Luyra is available from the H-Space My Apps catalog, the My Apps workspace
tabs and mobile More list, the Quick Switcher, and the dashboard Quick access
row. External links open in a new tab with `noopener noreferrer`. The Luyra
card contains only the app description, app link, and source repository link;
the dashboard never reads or displays financial data.

Luyra has paused Hengo-related source routes preserved for history. They are
not linked or enabled as H-Space alternatives. H-Space remains the primary
location for learning, tasks, goals, habits, and notes.

Luyra includes a **Back to H-Space** link to `https://hengo.henheang.site/`,
the production origin recorded in H-Space's app metadata/deep links. The live
site could not be fetched during this session, so confirm that origin before a
deployment cutover if the public hostname has changed.

## Local setup

H-Space:

```bash
pnpm install
pnpm dev
```

Luyra, in a second terminal:

```bash
npm --prefix apps/luyra install
npm --prefix apps/luyra run dev -- --port 3001
```

Use separate `.env.local` files in each app. Luyra's `.env.example` documents
its Supabase Auth and Neon connection settings. Never copy production secrets
into H-Space or commit local environment files. Starting both development
servers does not require database migrations; finance pages require valid
Luyra credentials to load real data.

## Luyra feature inventory from source

The imported code includes finance pages and APIs for transactions (including
bulk operations, templates and recurring entries), categories and payment
methods, budgets, savings and contributions, analytics, financial reviews,
weekly/monthly reports, preferences, exports and the Money Coach. Finance
repositories and database access are server only. `vercel.json` defines eight
scheduled routes for alerts, reminders, reports, push alerts and recurring
transactions. Source also includes Telegram linking/webhooks, Resend email,
Web Push, exchange-rate lookup, and a Vercel Workflow Next.js integration.

`next.config.ts` enables the Workflow adapter and its endpoints build, but the
current build reports **zero authored workflows**. Keep this distinction in
mind when checking deployed job behavior.

This inventory verifies implementation paths and configuration, not live
credentials, scheduled execution, workflow delivery, or production database
health. No production data or integrations were exercised in this migration.

## Deployment migration plan

Current production configuration remains unchanged. Before moving Luyra's
Vercel Git connection to `Hen-Heang/h-space`:

1. Create a Vercel preview from the migration branch with Root Directory
   `apps/luyra`; install, build, and verify login and read-only finance pages.
2. Copy the existing Vercel environment variables to the new project link
   without exposing or changing their values. Preserve the existing Neon,
   Supabase, Telegram, email, push, AI, and cron secrets.
3. Check the deployment logs for Vercel Workflow discovery and compare the
   configured Cron schedule with `apps/luyra/vercel.json`. Ensure only one
   production project runs each scheduled job during the switch.
4. Verify auth redirect URLs, Google allowed origins, and the custom domain
   before routing production traffic. Do not assume cross-domain SSO.
5. Switch the existing Luyra Vercel project to the monorepo and set its Root
   Directory to `apps/luyra`; preserve `luyra.henheang.site`.
6. Smoke test authentication and read-only finance views. Exercise mutations
   only with an approved test account and safe test data.
7. If checks fail, restore the previous Git connection/root configuration and
   promote the last known-good deployment. Leave the original repository
   available as the independent rollback source until the cutover is accepted.

No Vercel settings, DNS, environment variables, cron jobs, workflows, auth
settings, or financial records were changed by this source migration.
