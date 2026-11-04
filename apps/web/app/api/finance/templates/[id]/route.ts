import { type NextRequest } from "next/server"
import { requireFinanceUserId } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import { removeTemplate } from "@/lib/server/finance/services/finance-transaction-template-service"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireFinanceUserId(request)
    const { id } = await params

    await removeTemplate(userId, id)
    return apiSuccess({ id })
  } catch (error) {
    return apiError(error)
  }
}
