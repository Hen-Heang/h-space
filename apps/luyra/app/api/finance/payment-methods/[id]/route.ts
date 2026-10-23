import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { editPaymentMethod, removePaymentMethod } from "@/lib/services/finance-lookup-service";
import { updatePaymentMethodSchema } from "@/lib/validation/finance";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id } = await params;
    const body = updatePaymentMethodSchema.parse(await request.json());

    const paymentMethod = await editPaymentMethod(userId, id, body);
    return apiSuccess(paymentMethod);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id } = await params;

    await removePaymentMethod(userId, id);
    return apiSuccess({ id });
  } catch (error) {
    return apiError(error);
  }
}
