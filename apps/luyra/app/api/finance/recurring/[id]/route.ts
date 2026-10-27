import { type NextRequest } from "next/server";
import { z } from "zod";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { deleteRecurringRule, updateRecurringRule } from "@/lib/services/finance-recurring-service";
import { recurringRuleSchema } from "@/lib/validation/finance";

const idSchema = z.string().uuid();

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const id = idSchema.parse((await params).id);
    const input = recurringRuleSchema.parse(await request.json());
    return apiSuccess(await updateRecurringRule(userId, id, input));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const id = idSchema.parse((await params).id);
    await deleteRecurringRule(userId, id);
    return apiSuccess({ id });
  } catch (error) {
    return apiError(error);
  }
}
