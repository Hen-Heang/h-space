import { type NextRequest } from "next/server"
import { requireFinanceUserId } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import { listCategories } from "@/lib/server/finance/services/finance-lookup-service"

export async function GET(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request)
    const categories = await listCategories(userId)
    return apiSuccess(categories)
  } catch (error) {
    return apiError(error)
  }
}
