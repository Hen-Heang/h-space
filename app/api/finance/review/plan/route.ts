import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { applyNextMonthPlan } from "@/lib/services/finance-budget-plan-service";
import { applyBudgetPlanSchema } from "@/lib/validation/finance";

// Applies the budgets the user confirmed from the review's next-month plan.
// The plan itself is read through GET /api/finance/review.
export async function POST(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const body = applyBudgetPlanSchema.parse(await request.json());

    const result = await applyNextMonthPlan(userId, body.month, body.changes);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
