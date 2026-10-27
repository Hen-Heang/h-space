import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { getMoneyCoachInsight } from "@/lib/services/finance-money-coach-service";
import { monthQuerySchema } from "@/lib/validation/finance";

export async function GET(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const month = monthQuerySchema.parse(request.nextUrl.searchParams.get("month"));

    const result = await getMoneyCoachInsight(userId, month);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
