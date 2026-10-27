import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { editTask, removeTask } from "@/lib/services/task-service";
import { updateTaskSchema } from "@/lib/validation/task";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id } = await params;
    const body = updateTaskSchema.parse(await request.json());

    const task = await editTask(userId, id, body);
    return apiSuccess(task);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id } = await params;

    await removeTask(userId, id);
    return apiSuccess({ id });
  } catch (error) {
    return apiError(error);
  }
}
