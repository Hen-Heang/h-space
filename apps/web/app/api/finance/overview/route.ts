import { type NextRequest } from "next/server";
import { requireFinanceUserId } from "@/lib/server/finance/auth";
import { apiError, apiSuccess } from "@/lib/server/finance/http";
import { getFinanceOverviewSummary } from "@/lib/server/finance/services/finance-analytics-service";
import { monthQuerySchema } from "@/lib/validation/finance";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request);
    const month = monthQuerySchema.parse(request.nextUrl.searchParams.get("month"));
    const overview = await getFinanceOverviewSummary(userId, month);
    return apiSuccess(overview);
  } catch (error) {
    return apiError(error);
  }
}
