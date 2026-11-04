import { type NextRequest } from "next/server"
import { requireFinanceUserId } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import { deleteBudget } from "@/lib/server/finance/services/finance-budget-service"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  try {
    const userId = await requireFinanceUserId(request)
    const { categoryId } = await params

    await deleteBudget(userId, categoryId)
    return apiSuccess({ categoryId })
  } catch (error) {
    return apiError(error)
  }
}
