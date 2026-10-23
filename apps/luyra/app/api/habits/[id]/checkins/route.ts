import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { getHabitCheckins } from "@/lib/services/habit-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id } = await params;

    const checkins = await getHabitCheckins(userId, id);
    return apiSuccess(checkins);
  } catch (error) {
    return apiError(error);
  }
}
