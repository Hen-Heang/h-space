import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { Errors } from "@/lib/errors";
import { apiError, apiSuccess } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { generateLinkCode, getLinkStatus, unlinkTelegram } from "@/lib/services/telegram-account-service";
import { isTelegramConfigured } from "@/lib/telegram/client";

export async function GET() {
  try {
    const userId = await ensureAppUserId();
    const status = await getLinkStatus(userId, isTelegramConfigured());
    return apiSuccess(status);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST() {
  try {
    const userId = await ensureAppUserId();
    if (!isTelegramConfigured()) {
      throw Errors.validation("Telegram integration isn't configured yet.");
    }
    if (!rateLimit(`tg-link:${userId}`, 10, 60_000).allowed) {
      throw Errors.validation("Too many attempts. Try again in a minute.");
    }

    const { code, expiresAt } = await generateLinkCode(userId);
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    const deepLink = botUsername ? `https://t.me/${botUsername}?start=${code}` : null;
    return apiSuccess({ code, expiresAt, deepLink });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE() {
  try {
    const userId = await ensureAppUserId();
    await unlinkTelegram(userId);
    return apiSuccess({ unlinked: true });
  } catch (error) {
    return apiError(error);
  }
}
