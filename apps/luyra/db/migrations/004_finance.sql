-- Finance domain: historical data migrated from Money Flow's Supabase
-- project (lqjjabfmaweztxkvfrsq), scoped to the single real account
-- (henheang15@gmail.com). finance_exchange_rates is a small global lookup
-- table (not user-scoped), copied in full.

create table if not exists finance_categories (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name varchar not null,
  icon varchar,
  color varchar default '#10b981',
  type varchar default 'expense' check (type in ('income', 'expense', 'both')),
  spending_class text check (spending_class is null or spending_class in ('essential', 'commitment', 'growth', 'flexible', 'avoidable')),
  created_at timestamptz not null default now(),
  primary key (id)
);
create index if not exists finance_categories_user_id_idx on finance_categories (user_id);

create table if not exists finance_payment_methods (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name varchar not null,
  icon varchar,
  created_at timestamptz not null default now(),
  primary key (id)
);
create index if not exists finance_payment_methods_user_id_idx on finance_payment_methods (user_id);

create table if not exists finance_recurring_transactions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount_krw numeric not null check (amount_krw > 0),
  amount_usd numeric not null check (amount_usd > 0),
  description text not null,
  category_id uuid references finance_categories(id),
  payment_method_id uuid references finance_payment_methods(id),
  note text,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  next_date date not null,
  last_applied date,
  exchange_rate numeric not null default 1370,
  currency text not null default 'KRW' check (currency in ('KRW', 'USD')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (id)
);
create index if not exists finance_recurring_transactions_user_id_idx on finance_recurring_transactions (user_id);

create table if not exists finance_transactions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  recurring_id uuid references finance_recurring_transactions(id),
  date date not null,
  type varchar not null check (type in ('income', 'expense')),
  category_id uuid references finance_categories(id),
  description varchar,
  amount_krw numeric not null,
  amount_usd numeric,
  exchange_rate numeric,
  payment_method_id uuid references finance_payment_methods(id),
  note text,
  currency text not null default 'KRW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id)
);
create index if not exists finance_transactions_user_id_idx on finance_transactions (user_id);
create index if not exists finance_transactions_user_id_date_idx on finance_transactions (user_id, date);

create table if not exists finance_exchange_rates (
  id uuid not null default gen_random_uuid(),
  base_currency varchar not null default 'KRW',
  target_currency varchar not null default 'USD',
  rate numeric not null,
  fetched_at timestamptz default now(),
  primary key (id)
);

create table if not exists finance_budgets (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category_id uuid not null references finance_categories(id),
  amount_krw numeric not null default 0,
  alert_month text,
  alert_level integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id)
);
create index if not exists finance_budgets_user_id_idx on finance_budgets (user_id);

create table if not exists finance_savings_goals (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  icon text not null default '💰',
  color text not null default '#3b82f6',
  target_usd numeric not null default 0,
  current_usd numeric not null default 0,
  deadline date,
  note text,
  purpose text,
  auto_monthly_usd numeric not null default 0,
  last_auto_month text,
  reminder_day smallint not null default 1 check (reminder_day between 1 and 28),
  skipped_month text check (skipped_month is null or skipped_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  last_reminder_month text check (last_reminder_month is null or last_reminder_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  last_contribution_month text check (last_contribution_month is null or last_contribution_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id)
);
create index if not exists finance_savings_goals_user_id_idx on finance_savings_goals (user_id);

create table if not exists finance_savings_contributions (
  id uuid not null default gen_random_uuid(),
  goal_id uuid not null references finance_savings_goals(id),
  user_id uuid not null references users(id) on delete cascade,
  amount_usd numeric not null check (amount_usd > 0),
  contribution_month text not null check (contribution_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  source text not null check (source in ('manual', 'planned')),
  created_at timestamptz not null default now(),
  primary key (id)
);
create index if not exists finance_savings_contributions_user_id_idx on finance_savings_contributions (user_id);

create table if not exists finance_transaction_templates (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  description text not null,
  amount_krw numeric not null check (amount_krw > 0),
  category_id uuid references finance_categories(id),
  payment_method_id uuid references finance_payment_methods(id),
  note text,
  currency text not null default 'KRW',
  created_at timestamptz default now(),
  primary key (id)
);
create index if not exists finance_transaction_templates_user_id_idx on finance_transaction_templates (user_id);

create table if not exists finance_preferences (
  user_id uuid not null references users(id) on delete cascade,
  monthly_spending_limit_krw numeric,
  target_savings_rate numeric not null default 20 check (target_savings_rate between 0 and 100),
  ai_coach_enabled boolean not null default true,
  weekly_review_enabled boolean not null default true,
  monthly_review_enabled boolean not null default true,
  share_descriptions_with_ai boolean not null default true,
  budget_warning_thresholds jsonb not null default '{"over": 100, "first": 70, "strong": 90}',
  quiet_hours jsonb not null default '{"end": "08:00", "start": "22:00", "enabled": false, "timezone": "Asia/Seoul"}',
  monthly_report_channel_telegram boolean not null default true,
  monthly_report_channel_email boolean not null default false,
  monthly_report_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

create table if not exists finance_ai_insights (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  insight_type text not null check (insight_type in ('positive_trend', 'category_overspend', 'budget_recommendation', 'subscription_review', 'savings_goal', 'small_purchases', 'duplicate_transaction', 'income_baseline', 'unusual_transaction', 'double_counting', 'general')),
  severity text not null check (severity in ('positive', 'info', 'warning', 'critical')),
  title text not null,
  summary text not null,
  estimated_monthly_savings_krw numeric,
  evidence jsonb not null default '{}',
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  status text not null default 'new' check (status in ('new', 'reviewed', 'accepted', 'dismissed', 'snoozed')),
  snoozed_until timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id)
);
create index if not exists finance_ai_insights_user_id_idx on finance_ai_insights (user_id);

create table if not exists finance_subscription_status (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  subscription_key text not null,
  display_name text not null,
  note text,
  status text not null default 'review' check (status in ('keep', 'review', 'plan_to_cancel', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id)
);
create index if not exists finance_subscription_status_user_id_idx on finance_subscription_status (user_id);

create table if not exists finance_transaction_description_aliases (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  canonical_description text not null,
  variant_description text not null,
  normalized_key text not null,
  created_at timestamptz not null default now(),
  primary key (id)
);
create index if not exists finance_transaction_description_aliases_user_id_idx on finance_transaction_description_aliases (user_id);
