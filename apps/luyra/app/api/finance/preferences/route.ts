import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { editPreferences, getPreferences } from "@/lib/services/finance-preferences-service";
import { updatePreferencesSchema } from "@/lib/validation/finance";

export async function GET() {
  try {
    const userId = await ensureAppUserId();
    const preferences = await getPreferences(userId);
    return apiSuccess(preferences);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const body = updatePreferencesSchema.parse(await request.json());

    const preferences = await editPreferences(userId, body);
    return apiSuccess(preferences);
  } catch (error) {
    return apiError(error);
  }
}
