import { type NextRequest } from "next/server";
import { requireFinanceUserId } from "@/lib/server/finance/auth";
import { apiError, apiSuccess } from "@/lib/server/finance/http";
import { listSavingsGoals } from "@/lib/server/finance/services/finance-savings-service";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request);
    const goals = await listSavingsGoals(userId);
    return apiSuccess(goals);
  } catch (error) {
    return apiError(error);
  }
}
