import { type NextRequest } from "next/server"
import { requireFinanceUserId } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import { listDetectedSubscriptions } from "@/lib/server/finance/services/finance-subscription-service"

export async function GET(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request)
    const subscriptions = await listDetectedSubscriptions(userId)
    return apiSuccess(subscriptions)
  } catch (error) {
    return apiError(error)
  }
}
