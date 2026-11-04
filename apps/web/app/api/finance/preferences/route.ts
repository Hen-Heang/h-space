import { type NextRequest } from "next/server"
import { requireFinanceUserId } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import { getPreferences } from "@/lib/server/finance/services/finance-preferences-service"

export async function GET(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request)
    const preferences = await getPreferences(userId)
    return apiSuccess(preferences)
  } catch (error) {
    return apiError(error)
  }
}
