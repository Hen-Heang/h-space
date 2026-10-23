import { type NextRequest } from "next/server";
import { z } from "zod";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { listBudgetsForMonth, upsertBudget } from "@/lib/services/finance-budget-service";
import { upsertBudgetSchema } from "@/lib/validation/finance";

const rangeSchema = z.object({ start: z.string().date(), end: z.string().date() });

export async function GET(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const { searchParams } = request.nextUrl;
    const { start, end } = rangeSchema.parse({ start: searchParams.get("start"), end: searchParams.get("end") });

    const result = await listBudgetsForMonth(userId, start, end);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const body = upsertBudgetSchema.parse(await request.json());

    await upsertBudget(userId, body.categoryId, body.amountKrw);
    return apiSuccess({ categoryId: body.categoryId });
  } catch (error) {
    return apiError(error);
  }
}
