import "server-only";
import { sql } from "@/lib/db";
import type { SubscriptionStatus } from "@/types/finance";

export async function findSubscriptionStatuses(userId: string): Promise<Map<string, SubscriptionStatus>> {
  const rows = (await sql`
    select subscription_key, status from finance_subscription_status where user_id = ${userId}
  `) as { subscription_key: string; status: string }[];

  return new Map(rows.map((r) => [r.subscription_key, r.status as SubscriptionStatus]));
}

// Same reasoning as finance-budget-repository's upsertBudget: no unique
// constraint is declared on (user_id, subscription_key), so this
// checks-then-writes instead of `on conflict`.
export async function upsertSubscriptionStatus(
  userId: string,
  subscriptionKey: string,
  displayName: string,
  status: SubscriptionStatus
): Promise<void> {
  const existing = (await sql`
    select id from finance_subscription_status where user_id = ${userId} and subscription_key = ${subscriptionKey}
  `) as { id: string }[];

  if (existing.length > 0) {
    await sql`
      update finance_subscription_status set display_name = ${displayName}, status = ${status}, updated_at = now()
      where user_id = ${userId} and subscription_key = ${subscriptionKey}
    `;
  } else {
    await sql`
      insert into finance_subscription_status (user_id, subscription_key, display_name, status)
      values (${userId}, ${subscriptionKey}, ${displayName}, ${status})
    `;
  }
}
