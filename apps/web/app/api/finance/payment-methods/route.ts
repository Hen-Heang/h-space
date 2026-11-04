import { type NextRequest } from "next/server"
import { requireFinanceUserId } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import {
  addPaymentMethod,
  listPaymentMethods,
} from "@/lib/server/finance/services/finance-lookup-service"
import { createPaymentMethodSchema } from "@/lib/validation/finance"

export async function GET(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request)
    const paymentMethods = await listPaymentMethods(userId)
    return apiSuccess(paymentMethods)
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request)
    const body = createPaymentMethodSchema.parse(await request.json())

    const paymentMethod = await addPaymentMethod(userId, body)
    return apiSuccess(paymentMethod, 201)
  } catch (error) {
    return apiError(error)
  }
}
