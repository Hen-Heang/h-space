import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { editCategory, removeCategory } from "@/lib/services/finance-lookup-service";
import { updateCategorySchema } from "@/lib/validation/finance";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id } = await params;
    const body = updateCategorySchema.parse(await request.json());

    const category = await editCategory(userId, id, body);
    return apiSuccess(category);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id } = await params;

    await removeCategory(userId, id);
    return apiSuccess({ id });
  } catch (error) {
    return apiError(error);
  }
}
