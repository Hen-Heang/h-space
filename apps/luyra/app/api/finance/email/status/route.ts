import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { isEmailConfigured } from "@/lib/email/client";
import { apiError, apiSuccess } from "@/lib/http";
import { getPreferences } from "@/lib/services/finance-preferences-service";

export async function GET() {
  try {
    const appUser = await ensureAppUser();
    const configured = isEmailConfigured();
    const preferences = configured ? await getPreferences(appUser.id) : null;
    const recipientEmail = preferences?.financeReportEmail || appUser.email;

    return apiSuccess({ configured, recipientEmail });
  } catch (error) {
    return apiError(error);
  }
}
