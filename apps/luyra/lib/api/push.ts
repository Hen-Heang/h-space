import { apiFetch } from "@/lib/api/client";
import type { PushSubscriptionInput } from "@/lib/validation/push";

export async function savePushSubscription(input: PushSubscriptionInput): Promise<void> {
  await apiFetch<{ subscribed: boolean }>("/api/push/subscriptions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await apiFetch<{ subscribed: boolean }>("/api/push/subscriptions", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}
