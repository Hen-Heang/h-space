import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { deleteBudget } from "@/lib/services/finance-budget-service";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { categoryId } = await params;

    await deleteBudget(userId, categoryId);
    return apiSuccess({ categoryId });
  } catch (error) {
    return apiError(error);
  }
}
