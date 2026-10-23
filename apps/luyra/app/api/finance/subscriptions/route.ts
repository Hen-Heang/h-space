import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { listDetectedSubscriptions } from "@/lib/services/finance-subscription-service";

export async function GET() {
  try {
    const userId = await ensureAppUserId();
    const subscriptions = await listDetectedSubscriptions(userId);
    return apiSuccess(subscriptions);
  } catch (error) {
    return apiError(error);
  }
}
