import { type NextRequest } from "next/server"
import { requireFinanceUserId } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import { suggestDescriptions } from "@/lib/server/finance/services/finance-transaction-service"
import { descriptionSuggestionsQuerySchema } from "@/lib/validation/finance"

export async function GET(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request)
    const { searchParams } = request.nextUrl
    const { q, type } = descriptionSuggestionsQuerySchema.parse({
      q: searchParams.get("q") ?? "",
      type: searchParams.get("type") ?? undefined,
    })
    return apiSuccess(await suggestDescriptions(userId, q, type))
  } catch (error) {
    return apiError(error)
  }
}
