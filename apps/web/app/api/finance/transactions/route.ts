import { type NextRequest } from "next/server";
import { requireFinanceUserId } from "@/lib/server/finance/auth";
import { apiError, apiSuccess } from "@/lib/server/finance/http";
import { addTransaction, listTransactions } from "@/lib/server/finance/services/finance-transaction-service";
import { createTransactionSchema, transactionFiltersSchema } from "@/lib/validation/finance";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request);
    const { searchParams } = request.nextUrl;

    const filters = transactionFiltersSchema.parse({
      start: searchParams.get("start"),
      end: searchParams.get("end"),
      type: searchParams.get("type") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      paymentMethodId: searchParams.get("paymentMethodId") ?? undefined,
      amountMin: searchParams.get("amountMin") ?? undefined,
      amountMax: searchParams.get("amountMax") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      page: searchParams.get("page") ?? undefined,
    });

    const result = await listTransactions(userId, filters);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request);
    const body = createTransactionSchema.parse(await request.json());

    const transaction = await addTransaction(userId, body);
    return apiSuccess(transaction, 201);
  } catch (error) {
    return apiError(error);
  }
}
