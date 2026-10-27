import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { addSavingsGoal, listSavingsGoals } from "@/lib/services/finance-savings-service";
import { createSavingsGoalSchema } from "@/lib/validation/finance";

export async function GET() {
  try {
    const userId = await ensureAppUserId();
    const goals = await listSavingsGoals(userId);
    return apiSuccess(goals);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const body = createSavingsGoalSchema.parse(await request.json());

    const goal = await addSavingsGoal(userId, body);
    return apiSuccess(goal, 201);
  } catch (error) {
    return apiError(error);
  }
}
