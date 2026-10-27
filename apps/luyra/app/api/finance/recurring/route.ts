import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { createRecurringRule, listRecurringRules } from "@/lib/services/finance-recurring-service";
import { recurringRuleSchema } from "@/lib/validation/finance";

export async function GET() {
  try {
    const userId = await ensureAppUserId();
    return apiSuccess(await listRecurringRules(userId));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const input = recurringRuleSchema.parse(await request.json());
    return apiSuccess(await createRecurringRule(userId, input), 201);
  } catch (error) {
    return apiError(error);
  }
}
