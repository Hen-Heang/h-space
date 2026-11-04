import { type NextRequest } from "next/server"
import { requireCronAuthorization } from "@/lib/server/finance/cron"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import { runDailyLogReminder } from "@/lib/server/finance/services/finance-alert-service"

// web-push needs Node APIs, so this route can't run on the edge.
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const unauthorized = requireCronAuthorization(request)
  if (unauthorized) return unauthorized

  try {
    return apiSuccess(await runDailyLogReminder())
  } catch (error) {
    return apiError(error)
  }
}
