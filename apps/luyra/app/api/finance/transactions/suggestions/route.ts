import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { suggestDescriptions } from "@/lib/services/finance-transaction-service";
import { descriptionSuggestionsQuerySchema } from "@/lib/validation/finance";

export async function GET(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const { searchParams } = request.nextUrl;
    const { q, type } = descriptionSuggestionsQuerySchema.parse({
      q: searchParams.get("q") ?? "",
      type: searchParams.get("type") ?? undefined,
    });
    return apiSuccess(await suggestDescriptions(userId, q, type));
  } catch (error) {
    return apiError(error);
  }
}
