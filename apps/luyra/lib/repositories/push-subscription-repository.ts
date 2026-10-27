import "server-only";
import { sql } from "@/lib/db";

export interface StoredPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushBudgetAlertStatus = "watch" | "near_limit" | "exceeded";

export async function upsertPushSubscription(
  userId: string,
  subscription: StoredPushSubscription,
  userAgent: string | null
): Promise<void> {
  await sql`
    insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
    values (${userId}, ${subscription.endpoint}, ${subscription.p256dh}, ${subscription.auth}, ${userAgent})
    on conflict (endpoint) do update set
      user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      updated_at = now()
  `;
}

export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
  await sql`
    delete from push_subscriptions
    where user_id = ${userId} and endpoint = ${endpoint}
  `;
}

/** Server-internal cleanup for endpoints that the push service reports as gone. */
export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  await sql`delete from push_subscriptions where endpoint = ${endpoint}`;
}

export async function listPushSubscriptionsForUser(userId: string): Promise<StoredPushSubscription[]> {
  const rows = (await sql`
    select endpoint, p256dh, auth
    from push_subscriptions
    where user_id = ${userId}
    order by created_at asc
  `) as { endpoint: string; p256dh: string; auth: string }[];

  return rows;
}

export async function listUsersWithPushSubscriptions(): Promise<string[]> {
  const rows = (await sql`
    select distinct user_id
    from push_subscriptions
    order by user_id
  `) as { user_id: string }[];

  return rows.map((row) => row.user_id);
}

export async function findPushBudgetAlertStatus(
  userId: string,
  categoryId: string,
  monthKey: string
): Promise<PushBudgetAlertStatus | null> {
  const rows = (await sql`
    select last_status
    from finance_push_budget_alerts
    where user_id = ${userId}
      and category_id = ${categoryId}
      and month_key = ${monthKey}
    limit 1
  `) as { last_status: PushBudgetAlertStatus }[];

  return rows[0]?.last_status ?? null;
}

export async function upsertPushBudgetAlertStatus(
  userId: string,
  categoryId: string,
  monthKey: string,
  status: PushBudgetAlertStatus
): Promise<void> {
  await sql`
    insert into finance_push_budget_alerts (user_id, category_id, month_key, last_status, sent_at)
    values (${userId}, ${categoryId}, ${monthKey}, ${status}, now())
    on conflict (user_id, category_id, month_key) do update set
      last_status = excluded.last_status,
      sent_at = excluded.sent_at
  `;
}
