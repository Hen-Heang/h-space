import { type NextRequest } from "next/server"
import { requireFinanceAppUser } from "@/lib/server/finance/auth"
import { isEmailConfigured } from "@/lib/server/finance/email"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import { getPreferences } from "@/lib/server/finance/services/finance-preferences-service"

export async function GET(request: NextRequest) {
  try {
    const appUser = await requireFinanceAppUser(request)
    const configured = isEmailConfigured()
    const preferences = configured ? await getPreferences(appUser.id) : null
    const recipientEmail = preferences?.financeReportEmail || appUser.email

    return apiSuccess({ configured, recipientEmail })
  } catch (error) {
    return apiError(error)
  }
}
