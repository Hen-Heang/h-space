import { type NextRequest } from "next/server";
import { requireCronAuthorization } from "@/lib/server/cron";
import { apiError, apiSuccess } from "@/lib/http";
import { runBudgetAlerts } from "@/lib/services/finance-alert-service";

// Called by the scheduler, never by a user — see vercel.json for the times.
export async function GET(request: NextRequest) {
  const unauthorized = requireCronAuthorization(request);
  if (unauthorized) return unauthorized;

  try {
    return apiSuccess(await runBudgetAlerts());
  } catch (error) {
    return apiError(error);
  }
}
