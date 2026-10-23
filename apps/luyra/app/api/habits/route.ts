import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { addHabit, listHabits } from "@/lib/services/habit-service";
import { createHabitSchema } from "@/lib/validation/habit";

export async function GET() {
  try {
    const userId = await ensureAppUserId();
    const habits = await listHabits(userId);
    return apiSuccess(habits);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const body = createHabitSchema.parse(await request.json());

    const habit = await addHabit(userId, body);
    return apiSuccess(habit, 201);
  } catch (error) {
    return apiError(error);
  }
}
