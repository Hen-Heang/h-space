import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { removeTemplate } from "@/lib/services/finance-transaction-template-service";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id } = await params;

    await removeTemplate(userId, id);
    return apiSuccess({ id });
  } catch (error) {
    return apiError(error);
  }
}
