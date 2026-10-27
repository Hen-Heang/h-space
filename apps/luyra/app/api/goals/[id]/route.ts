import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { editGoal, removeGoal } from "@/lib/services/goal-service";
import { updateGoalSchema } from "@/lib/validation/goal";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id } = await params;
    const body = updateGoalSchema.parse(await request.json());

    const goal = await editGoal(userId, id, body);
    return apiSuccess(goal);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id } = await params;

    await removeGoal(userId, id);
    return apiSuccess({ id });
  } catch (error) {
    return apiError(error);
  }
}
