import { type NextRequest } from "next/server"
import { z } from "zod"
import { requireFinanceUserId } from "@/lib/server/finance/auth"
import { apiError, apiSuccess } from "@/lib/server/finance/http"
import {
  sendMonthlyReportToTelegram,
  sendWeeklySummaryToTelegram,
} from "@/lib/server/finance/services/finance-telegram-service"

const sendSchema = z
  .object({
    type: z.enum(["weekly", "monthly"]),
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional(),
    monthLabel: z.string().trim().max(40).optional(),
  })
  .refine((data) => data.type !== "monthly" || data.month !== undefined, {
    message: "month is required for a monthly report",
    path: ["month"],
  })

export async function POST(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request)
    const body = sendSchema.parse(await request.json())

    const result =
      body.type === "weekly"
        ? await sendWeeklySummaryToTelegram(userId)
        : await sendMonthlyReportToTelegram(
            userId,
            body.month as string,
            body.monthLabel ?? (body.month as string),
          )

    return apiSuccess(result)
  } catch (error) {
    return apiError(error)
  }
}
