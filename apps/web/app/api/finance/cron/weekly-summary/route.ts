import { type NextRequest } from "next/server"
import { requireCronAuthorization } from "@/lib/server/finance/cron"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import { runWeeklySummaries } from "@/lib/server/finance/services/finance-report-schedule-service"

export async function GET(request: NextRequest) {
  const unauthorized = requireCronAuthorization(request)
  if (unauthorized) return unauthorized

  try {
    return apiSuccess(await runWeeklySummaries())
  } catch (error) {
    return apiError(error)
  }
}
