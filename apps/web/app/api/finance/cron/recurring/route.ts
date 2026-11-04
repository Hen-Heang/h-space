import { type NextRequest } from "next/server"
import { requireCronAuthorization } from "@/lib/server/finance/cron"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import { runRecurring } from "@/lib/server/finance/services/finance-recurring-service"

// Daily Vercel Cron (apps/web/vercel.json), ported from Luyra's
// /api/cron/recurring. Creates every due occurrence of every active recurring
// rule in the finance database. Safe to re-run: each rule advances with a
// compare-and-set on next_date, so an overlapping run can't double-apply.
// Only the scheduler may call it — Vercel sends `Authorization: Bearer
// <CRON_SECRET>`; without CRON_SECRET it answers 503 and does nothing.
export async function GET(request: NextRequest) {
  const unauthorized = requireCronAuthorization(request)
  if (unauthorized) return unauthorized

  try {
    return apiSuccess(await runRecurring())
  } catch (error) {
    return apiError(error)
  }
}
