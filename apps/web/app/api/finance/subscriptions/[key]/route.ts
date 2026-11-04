import { type NextRequest } from "next/server"
import { requireFinanceUserId } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import { setSubscriptionStatus } from "@/lib/server/finance/services/finance-subscription-service"
import { setSubscriptionStatusSchema } from "@/lib/validation/finance"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const userId = await requireFinanceUserId(request)
    const { key } = await params
    const body = setSubscriptionStatusSchema.parse(await request.json())

    await setSubscriptionStatus(userId, key, body)
    return apiSuccess({ key })
  } catch (error) {
    return apiError(error)
  }
}
