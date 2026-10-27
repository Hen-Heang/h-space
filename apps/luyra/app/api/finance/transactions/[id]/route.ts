import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { editTransaction, removeTransaction } from "@/lib/services/finance-transaction-service";
import { updateTransactionSchema } from "@/lib/validation/finance";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id } = await params;
    const body = updateTransactionSchema.parse(await request.json());

    const transaction = await editTransaction(userId, id, body);
    return apiSuccess(transaction);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id } = await params;

    await removeTransaction(userId, id);
    return apiSuccess({ id });
  } catch (error) {
    return apiError(error);
  }
}
