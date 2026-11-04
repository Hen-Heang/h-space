import { type NextRequest } from "next/server"
import { requireFinanceUserId } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import { addCategory, listCategories } from "@/lib/server/finance/services/finance-lookup-service"
import { createCategorySchema } from "@/lib/validation/finance"

export async function GET(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request)
    const categories = await listCategories(userId)
    return apiSuccess(categories)
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request)
    const body = createCategorySchema.parse(await request.json())

    const category = await addCategory(userId, body)
    return apiSuccess(category, 201)
  } catch (error) {
    return apiError(error)
  }
}
