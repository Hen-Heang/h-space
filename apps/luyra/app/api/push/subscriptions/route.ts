import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import {
  deletePushSubscription,
  upsertPushSubscription,
} from "@/lib/repositories/push-subscription-repository";
import {
  deletePushSubscriptionSchema,
  pushSubscriptionSchema,
} from "@/lib/validation/push";

export async function POST(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const input = pushSubscriptionSchema.parse(await request.json());
    const userAgent = request.headers.get("user-agent")?.slice(0, 1024) ?? null;

    await upsertPushSubscription(userId, input, userAgent);
    return apiSuccess({ subscribed: true }, 201);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const input = deletePushSubscriptionSchema.parse(await request.json());

    await deletePushSubscription(userId, input.endpoint);
    return apiSuccess({ subscribed: false });
  } catch (error) {
    return apiError(error);
  }
}
