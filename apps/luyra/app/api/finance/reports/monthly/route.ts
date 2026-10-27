import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { getMonthlyReport } from "@/lib/services/finance-report-service";
import { monthQuerySchema } from "@/lib/validation/finance";

export async function GET(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const month = monthQuerySchema.parse(request.nextUrl.searchParams.get("month"));

    const report = await getMonthlyReport(userId, month);
    return apiSuccess(report);
  } catch (error) {
    return apiError(error);
  }
}
