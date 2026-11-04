import { type NextRequest } from "next/server"
import { requireFinanceSession } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import {
  getFinanceTelegramStatus,
  stopFinanceTelegram,
  linkHspaceTelegram,
} from "@/lib/server/finance/services/finance-telegram-link-service"

// Finance Telegram status / use H-Space's link / stop finance messages.
// Replaces Luyra's /api/telegram/link + webhook: one bot serves both apps and
// H-Space already owns linking (see finance-telegram-link-service.ts).

export async function GET(request: NextRequest) {
  try {
    const { financeUserId, hspaceUserId, db } = await requireFinanceSession(request)
    return apiSuccess(await getFinanceTelegramStatus(financeUserId, hspaceUserId, db))
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { financeUserId, hspaceUserId, db } = await requireFinanceSession(request)
    return apiSuccess(await linkHspaceTelegram(financeUserId, hspaceUserId, db))
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { financeUserId, hspaceUserId, db } = await requireFinanceSession(request)
    return apiSuccess(await stopFinanceTelegram(financeUserId, hspaceUserId, db))
  } catch (error) {
    return apiError(error)
  }
}
