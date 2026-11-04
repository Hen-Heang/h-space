import { type NextRequest } from "next/server";
import { requireFinanceUserId } from "@/lib/server/finance/auth";
import { apiError, apiSuccess } from "@/lib/server/finance/http";
import { applyBulkTransactionAction } from "@/lib/server/finance/services/finance-transaction-service";
import { bulkTransactionActionSchema } from "@/lib/validation/finance";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request);
    const input = bulkTransactionActionSchema.parse(await request.json());
    return apiSuccess(await applyBulkTransactionAction(userId, input));
  } catch (error) {
    return apiError(error);
  }
}
