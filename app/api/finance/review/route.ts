import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { getReviewSummary } from "@/lib/services/finance-analytics-service";
import { monthQuerySchema } from "@/lib/validation/finance";

export async function GET(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const month = monthQuerySchema.parse(request.nextUrl.searchParams.get("month"));

    const summary = await getReviewSummary(userId, month, { withPlan: true });
    return apiSuccess(summary);
  } catch (error) {
    return apiError(error);
  }
}
