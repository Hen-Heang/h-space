import { type NextRequest } from "next/server";
import { requireFinanceUserId } from "@/lib/server/finance/auth";
import { apiError, apiSuccess } from "@/lib/server/finance/http";
import { addSavingsGoal, listSavingsGoals } from "@/lib/server/finance/services/finance-savings-service";
import { createSavingsGoalSchema } from "@/lib/validation/finance";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request);
    const goals = await listSavingsGoals(userId);
    return apiSuccess(goals);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request);
    const body = createSavingsGoalSchema.parse(await request.json());

    const goal = await addSavingsGoal(userId, body);
    return apiSuccess(goal, 201);
  } catch (error) {
    return apiError(error);
  }
}
