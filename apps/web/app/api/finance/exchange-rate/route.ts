import { type NextRequest } from "next/server";
import { requireFinanceUserId } from "@/lib/server/finance/auth";
import { apiError, apiSuccess } from "@/lib/server/finance/http";
import { getUsdToKrwRate } from "@/lib/server/finance/services/finance-exchange-rate-service";

export async function GET(request: NextRequest) {
  try {
    await requireFinanceUserId(request);
    const result = await getUsdToKrwRate();
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
