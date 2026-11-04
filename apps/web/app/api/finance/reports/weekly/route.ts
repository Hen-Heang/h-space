import { type NextRequest } from "next/server"
import { requireFinanceUserId } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import { getWeeklySummary } from "@/lib/server/finance/services/finance-report-service"

export async function GET(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request)
    const summary = await getWeeklySummary(userId)
    return apiSuccess(summary)
  } catch (error) {
    return apiError(error)
  }
}
