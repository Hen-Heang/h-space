import { type NextRequest } from "next/server"
import { requireFinanceUserId } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import {
  editPreferences,
  getPreferences,
} from "@/lib/server/finance/services/finance-preferences-service"
import { updatePreferencesSchema } from "@/lib/validation/finance"

export async function GET(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request)
    const preferences = await getPreferences(userId)
    return apiSuccess(preferences)
  } catch (error) {
    return apiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request)
    const body = updatePreferencesSchema.parse(await request.json())

    const preferences = await editPreferences(userId, body)
    return apiSuccess(preferences)
  } catch (error) {
    return apiError(error)
  }
}
