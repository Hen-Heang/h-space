import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { rateVocabCard } from "@/lib/services/vocab-service";
import { reviewRatingSchema } from "@/lib/validation/learning";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id } = await params;
    const body = (await request.json()) as { rating?: unknown };
    const rating = reviewRatingSchema.parse(body.rating);

    const card = await rateVocabCard(userId, id, rating);
    return apiSuccess(card);
  } catch (error) {
    return apiError(error);
  }
}
