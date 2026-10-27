import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { addTask, listTasks } from "@/lib/services/task-service";
import { createTaskSchema, taskFiltersSchema } from "@/lib/validation/task";

export async function GET(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const { searchParams } = request.nextUrl;

    const filters = taskFiltersSchema.parse({
      status: searchParams.get("status") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
    });

    const tasks = await listTasks(userId, filters);
    return apiSuccess(tasks);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const body = createTaskSchema.parse(await request.json());

    const task = await addTask(userId, body);
    return apiSuccess(task, 201);
  } catch (error) {
    return apiError(error);
  }
}
