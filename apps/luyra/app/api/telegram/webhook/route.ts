import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { consumeLinkCode, getUserIdForChat, unlinkTelegram } from "@/lib/services/telegram-account-service";

// Telegram delivers updates here as POST requests (webhook mode). No user
// session exists — this route is secured entirely by the secret token
// Telegram echoes back in a header, set when the webhook is registered
// with Telegram's setWebhook (secret_token param). Same shape as any other
// inbound webhook in this app: verify a shared secret before touching
// anything, never rely on a session that doesn't exist here.
interface TelegramUpdate {
  message?: {
    chat?: { id?: number };
    from?: { username?: string };
    text?: string;
  };
}

const HELP_TEXT =
  "Luyra bot.\n\n" +
  "/link CODE — link this chat to your Luyra account (get a code from Luyra Settings)\n" +
  "/unlink — remove this chat's link\n" +
  "/help — show this message";

export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  if (request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim();
  if (chatId === undefined || !text) {
    return NextResponse.json({ ok: true });
  }

  const chatIdStr = String(chatId);
  if (!rateLimit(`tg:${chatIdStr}`, 20, 60_000).allowed) {
    // Ack without processing — never make Telegram retry an update.
    return NextResponse.json({ ok: true });
  }

  try {
    await handleMessage(chatIdStr, update.message?.from?.username ?? null, text);
  } catch (error) {
    console.error("[telegram webhook] handler error", error);
  }

  return NextResponse.json({ ok: true });
}

async function handleMessage(chatId: string, username: string | null, text: string): Promise<void> {
  if (text === "/help" || text === "/start") {
    await sendTelegramMessage(chatId, HELP_TEXT);
    return;
  }

  if (text.startsWith("/start ") || text.startsWith("/link")) {
    const code = text.startsWith("/start ") ? text.slice(7) : text.replace(/^\/link\s*/, "");
    const result = await consumeLinkCode(code, chatId, username);
    if (result === "linked") {
      await sendTelegramMessage(chatId, "✅ Linked! This chat is now connected to your Luyra account.");
    } else if (result === "expired") {
      await sendTelegramMessage(chatId, "⌛ That code expired. Generate a new one in Finance Settings.");
    } else {
      await sendTelegramMessage(chatId, "❌ That code isn't valid. Generate a new one in Finance Settings.");
    }
    return;
  }

  if (text === "/unlink") {
    const userId = await getUserIdForChat(chatId);
    if (!userId) {
      await sendTelegramMessage(chatId, "This chat isn't linked to a Luyra account.");
      return;
    }
    await unlinkTelegram(userId);
    await sendTelegramMessage(chatId, "Unlinked. Generate a new code in Finance Settings to link again.");
    return;
  }

  const userId = await getUserIdForChat(chatId);
  if (!userId) {
    await sendTelegramMessage(chatId, "🔒 This chat isn't linked yet. Send /link CODE with a code from Finance Settings.");
    return;
  }

  // Deterministic-only, per AGENTS.md's AI rule: free text is never parsed
  // into a transaction without a confirmed, deterministic path. Logging
  // expenses by chat would need an AI Foundation (a later, separate phase)
  // — deferred rather than built as an ad hoc parser here.
  await sendTelegramMessage(
    chatId,
    "I can't log expenses from a message yet — add them in Luyra. Send /help to see what I can do."
  );
}
