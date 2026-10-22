import { type NextRequest } from "next/server";
import { requireCronAuthorization } from "@/lib/server/cron";
import { apiError, apiSuccess } from "@/lib/http";
import { runRecurring } from "@/lib/services/finance-recurring-service";

export async function GET(request: NextRequest) {
  const unauthorized = requireCronAuthorization(request);
  if (unauthorized) return unauthorized;

  try {
    return apiSuccess(await runRecurring());
  } catch (error) {
    return apiError(error);
  }
}
