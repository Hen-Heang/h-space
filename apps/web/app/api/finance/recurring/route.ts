import { type NextRequest } from "next/server";
import { requireFinanceUserId } from "@/lib/server/finance/auth";
import { apiError, apiSuccess } from "@/lib/server/finance/http";
import { createRecurringRule, listRecurringRules } from "@/lib/server/finance/services/finance-recurring-service";
import { recurringRuleSchema } from "@/lib/validation/finance";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request);
    return apiSuccess(await listRecurringRules(userId));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireFinanceUserId(request);
    const input = recurringRuleSchema.parse(await request.json());
    return apiSuccess(await createRecurringRule(userId, input), 201);
  } catch (error) {
    return apiError(error);
  }
}
