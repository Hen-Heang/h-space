import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { applyBulkTransactionAction } from "@/lib/services/finance-transaction-service";
import { bulkTransactionActionSchema } from "@/lib/validation/finance";

export async function POST(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const input = bulkTransactionActionSchema.parse(await request.json());
    return apiSuccess(await applyBulkTransactionAction(userId, input));
  } catch (error) {
    return apiError(error);
  }
}
