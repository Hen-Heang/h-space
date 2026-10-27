import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { listDueVocabCards } from "@/lib/services/vocab-service";

export async function GET() {
  try {
    const userId = await ensureAppUserId();
    const result = await listDueVocabCards(userId);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
