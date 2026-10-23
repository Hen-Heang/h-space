import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { getTodaySummary } from "@/lib/services/today-service";

export async function GET() {
  try {
    const userId = await ensureAppUserId();
    const summary = await getTodaySummary(userId);
    return apiSuccess(summary);
  } catch (error) {
    return apiError(error);
  }
}
