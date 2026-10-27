import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { checkInHabit, checkOutHabit } from "@/lib/services/habit-service";
import { checkinDateSchema } from "@/lib/validation/habit";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; date: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id, date } = await params;
    const checkinDate = checkinDateSchema.parse(date);

    const checkin = await checkInHabit(userId, id, checkinDate);
    return apiSuccess(checkin);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; date: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id, date } = await params;
    const checkinDate = checkinDateSchema.parse(date);

    await checkOutHabit(userId, id, checkinDate);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
