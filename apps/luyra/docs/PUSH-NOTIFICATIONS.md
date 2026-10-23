# Browser Push Notifications

Luyra uses standards-based Web Push for opt-in browser/device notifications. The first notification source is Finance budget-status escalation (`Watch` → `Near limit` → `Exceeded`).

## Architecture

```text
Browser permission + PushManager
        ↓
POST /api/push/subscriptions
        ↓
Supabase Auth identity → ensureAppUser()
        ↓
Neon push_subscriptions
        ↓
Vercel daily cron
        ↓
canonical Finance budget service
        ↓
web-push + VAPID
        ↓
Browser service worker notification
```

Supabase remains authentication-only for Luyra. Push subscription application data belongs in Neon.

## Why old Money Flow subscriptions are not copied

The old Money Flow Supabase project has historical `push_subscriptions`. They must **not** be copied to Luyra. Web Push subscriptions are bound to the origin/service worker that created them, so an endpoint created on the old Money Flow origin is not a valid Luyra opt-in.

After this feature is deployed, each browser/device must open **Finance → Settings → Push notifications** and explicitly enable notifications again. Keep the old rows untouched until Luyra is verified in production; they can be cleaned up later with the old app retirement work.

## 1. Apply the Neon migration

Apply, in order:

```text
db/migrations/010_push_notifications.sql
```

It creates:

- `push_subscriptions` — one row per browser/device endpoint, owned by the canonical Luyra user.
- `finance_push_budget_alerts` — monthly per-category alert state so the daily cron only sends when severity escalates instead of repeating the same warning every day.

Do not apply this migration to the old Money Flow Supabase database.

## 2. Generate VAPID keys

Generate a dedicated key pair locally:

```bash
npx web-push generate-vapid-keys
```

Never commit the private key.

## 3. Configure the Luyra Vercel project

Set these environment variables on the Luyra project, then redeploy:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=mailto:<contact email>
CRON_SECRET=<long random secret>
```

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` is intentionally public. The private key and cron secret are server-only.

The repository's `vercel.json` schedules:

```text
/api/cron/push-budget-alerts
```

once per day. Vercel authenticates the request with `Authorization: Bearer <CRON_SECRET>` when the project secret is configured.

## 4. Subscribe a browser/device

1. Deploy over HTTPS (localhost is allowed for development).
2. Sign in to Luyra.
3. Open **Finance → Settings → Push notifications**.
4. Choose **Enable on this device**.
5. Accept the browser notification permission prompt.

Each browser/device has its own subscription. Luyra never prompts for notification permission automatically on page load.

If permission is blocked at the browser level, re-enable it in the site's browser settings and reload Luyra.

## Notification privacy

Budget notifications intentionally avoid exact account balances or transaction details on a lock screen. They contain the category, status, and usage percentage and link back to `/finance/budgets`.

## Stale subscriptions

If a push service responds with HTTP `404` or `410`, Luyra removes that stale endpoint from Neon automatically.

## Testing checklist

- [ ] Migration applied to the Luyra Neon database.
- [ ] VAPID and `CRON_SECRET` environment variables configured on Luyra Vercel.
- [ ] Production redeployed.
- [ ] Enable notifications from Finance Settings on one browser.
- [ ] Confirm one `push_subscriptions` row exists for that Luyra user/device.
- [ ] Trigger the cron route with the correct bearer secret and verify a qualifying budget alert arrives.
- [ ] Re-run the cron without a status escalation and verify it does not send a duplicate alert.
- [ ] Disable notifications in Finance Settings and verify the local subscription and Neon row are removed.
- [ ] Confirm a `404`/`410` delivery removes a stale endpoint without failing the whole cron.

## Current limitation

The cron currently evaluates the current UTC calendar month. Luyra does not yet have a per-user timezone preference; add one before making time-of-day notifications user-specific.
