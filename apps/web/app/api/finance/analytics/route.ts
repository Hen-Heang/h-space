import { type NextRequest } from "next/server";
import { requireFinanceUserId } from "@/lib/server/finance/auth";
import { apiError, apiSuccess } from "@/lib/server/finance/http";
import { getAnalyticsSummary } from "@/lib/server/finance/services/finance-analytics-service";
import { monthQuerySchema } from "@/lib/validation/finance";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request);
    const month = monthQuerySchema.parse(request.nextUrl.searchParams.get("month"));

    const summary = await getAnalyticsSummary(userId, month);
    return apiSuccess(summary);
  } catch (error) {
    return apiError(error);
  }
}
