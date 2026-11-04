import { type NextRequest } from "next/server"
import { requireFinanceUserId } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import {
  editPaymentMethod,
  removePaymentMethod,
} from "@/lib/server/finance/services/finance-lookup-service"
import { updatePaymentMethodSchema } from "@/lib/validation/finance"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireFinanceUserId(request)
    const { id } = await params
    const body = updatePaymentMethodSchema.parse(await request.json())

    const paymentMethod = await editPaymentMethod(userId, id, body)
    return apiSuccess(paymentMethod)
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireFinanceUserId(request)
    const { id } = await params

    await removePaymentMethod(userId, id)
    return apiSuccess({ id })
  } catch (error) {
    return apiError(error)
  }
}
