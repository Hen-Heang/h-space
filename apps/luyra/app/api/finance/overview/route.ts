import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { getFinanceOverviewSummary } from "@/lib/services/finance-analytics-service";
import { monthQuerySchema } from "@/lib/validation/finance";

export async function GET(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const month = monthQuerySchema.parse(request.nextUrl.searchParams.get("month"));
    const overview = await getFinanceOverviewSummary(userId, month);
    return apiSuccess(overview);
  } catch (error) {
    return apiError(error);
  }
}
