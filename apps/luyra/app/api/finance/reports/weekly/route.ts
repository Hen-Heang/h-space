import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { getWeeklySummary } from "@/lib/services/finance-report-service";

export async function GET() {
  try {
    const userId = await ensureAppUserId();
    const summary = await getWeeklySummary(userId);
    return apiSuccess(summary);
  } catch (error) {
    return apiError(error);
  }
}
