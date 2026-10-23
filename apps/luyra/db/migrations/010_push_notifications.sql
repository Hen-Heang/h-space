-- Native browser Web Push storage for Luyra.
--
-- Push subscriptions are intentionally NOT copied from the old Money Flow
-- Supabase project. A PushSubscription is tied to the web origin/service worker
-- that created it, so users must opt in again on the Luyra origin.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_id
  on push_subscriptions(user_id);

-- Tracks the highest budget-alert severity already pushed for a category in a
-- month. The daily cron only sends when severity escalates, avoiding repeated
-- notifications for the same state every day.
create table if not exists finance_push_budget_alerts (
  user_id uuid not null references users(id) on delete cascade,
  category_id uuid not null references finance_categories(id) on delete cascade,
  month_key char(7) not null,
  last_status text not null check (last_status in ('watch', 'near_limit', 'exceeded')),
  sent_at timestamptz not null default now(),
  primary key (user_id, category_id, month_key)
);

create index if not exists idx_finance_push_budget_alerts_user_month
  on finance_push_budget_alerts(user_id, month_key);
