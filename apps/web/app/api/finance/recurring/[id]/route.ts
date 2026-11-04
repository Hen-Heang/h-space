import { type NextRequest } from "next/server"
import { z } from "zod"
import { requireFinanceUserId } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import {
  deleteRecurringRule,
  updateRecurringRule,
} from "@/lib/server/finance/services/finance-recurring-service"
import { recurringRuleSchema } from "@/lib/validation/finance"

const idSchema = z.string().uuid()

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireFinanceUserId(request)
    const id = idSchema.parse((await params).id)
    const input = recurringRuleSchema.parse(await request.json())
    return apiSuccess(await updateRecurringRule(userId, id, input))
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
    const id = idSchema.parse((await params).id)
    await deleteRecurringRule(userId, id)
    return apiSuccess({ id })
  } catch (error) {
    return apiError(error)
  }
}
