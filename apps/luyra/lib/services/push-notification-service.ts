import "server-only";
import * as webPush from "web-push";
import type { WebPushError } from "web-push";
import {
  deletePushSubscriptionByEndpoint,
  type StoredPushSubscription,
} from "@/lib/repositories/push-subscription-repository";

export interface LuyraPushPayload {
  title: string;
  body: string;
  tag?: string;
  data?: {
    url?: string;
  };
}

let configured = false;

function configureWebPush(): void {
  if (configured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Browser push is not configured. Set the VAPID environment variables.");
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export function isPushNotificationConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

/**
 * Fan one payload out to every device a user has registered. Each endpoint is a
 * separate HTTPS POST to a different push service, so they go out together
 * rather than one round trip after another; a stale endpoint deletes itself
 * inside `sendPushNotification` and any other failure is counted and logged, so
 * one dead device can't stop a sweep.
 */
export async function sendPushToSubscriptions(
  subscriptions: StoredPushSubscription[],
  payload: LuyraPushPayload,
  logContext: Record<string, unknown> = {}
): Promise<{ sent: number; staleRemoved: number; failed: number }> {
  const results = await Promise.allSettled(
    subscriptions.map((subscription) => sendPushNotification(subscription, payload))
  );

  const totals = { sent: 0, staleRemoved: 0, failed: 0 };
  for (const result of results) {
    if (result.status === "rejected") {
      totals.failed += 1;
      console.error("Push delivery failed", {
        ...logContext,
        error: result.reason instanceof Error ? result.reason.message : "Unknown push error",
      });
      continue;
    }
    if (result.value.sent) totals.sent += 1;
    if (result.value.staleRemoved) totals.staleRemoved += 1;
  }

  return totals;
}

export async function sendPushNotification(
  subscription: StoredPushSubscription,
  payload: LuyraPushPayload
): Promise<{ sent: boolean; staleRemoved: boolean }> {
  configureWebPush();

  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 6, urgency: "normal" }
    );

    return { sent: true, staleRemoved: false };
  } catch (error) {
    const pushError = error as WebPushError;
    if (pushError.statusCode === 404 || pushError.statusCode === 410) {
      await deletePushSubscriptionByEndpoint(subscription.endpoint);
      return { sent: false, staleRemoved: true };
    }

    throw error;
  }
}
