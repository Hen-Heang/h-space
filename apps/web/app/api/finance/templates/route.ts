import { type NextRequest } from "next/server"
import { requireFinanceUserId } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import {
  addTemplate,
  listTemplates,
} from "@/lib/server/finance/services/finance-transaction-template-service"
import { createTransactionTemplateSchema } from "@/lib/validation/finance"

export async function GET(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request)
    const templates = await listTemplates(userId)
    return apiSuccess(templates)
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request)
    const body = createTransactionTemplateSchema.parse(await request.json())

    const template = await addTemplate(userId, body)
    return apiSuccess(template, 201)
  } catch (error) {
    return apiError(error)
  }
}
