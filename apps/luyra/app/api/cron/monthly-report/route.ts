import { type NextRequest } from "next/server";
import { requireCronAuthorization } from "@/lib/server/cron";
import { apiError, apiSuccess } from "@/lib/http";
import { runMonthlyReports } from "@/lib/services/finance-report-schedule-service";

// Runs daily rather than on the 1st: a single missed run on the 1st would
// otherwise lose a whole month's report. The last-sent marker on
// finance_preferences is what makes the daily schedule safe.
export async function GET(request: NextRequest) {
  const unauthorized = requireCronAuthorization(request);
  if (unauthorized) return unauthorized;

  try {
    return apiSuccess(await runMonthlyReports());
  } catch (error) {
    return apiError(error);
  }
}
