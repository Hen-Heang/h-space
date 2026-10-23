import "server-only";
import {
  clearChatBinding,
  findAccountByLinkCode,
  findAccountByUserId,
  findUserIdByChatId,
  linkChat,
  unlinkAccount,
  upsertLinkCode,
} from "@/lib/repositories/telegram-account-repository";
import type { TelegramLinkStatus } from "@/types/telegram";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids ambiguity when typed by hand
const CODE_LENGTH = 6;
const CODE_TTL_MS = 15 * 60 * 1000;

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function getLinkStatus(userId: string, configured: boolean): Promise<TelegramLinkStatus> {
  const account = await findAccountByUserId(userId);
  if (!account) {
    return { configured, linked: false, telegramUsername: null, pendingCode: null, pendingCodeExpiresAt: null };
  }

  const codeStillValid =
    account.linkCode !== null && account.linkCodeExpiresAt !== null && new Date(account.linkCodeExpiresAt) > new Date();

  return {
    configured,
    linked: account.chatId !== null,
    telegramUsername: account.telegramUsername,
    pendingCode: codeStillValid ? account.linkCode : null,
    pendingCodeExpiresAt: codeStillValid ? account.linkCodeExpiresAt : null,
  };
}

export async function generateLinkCode(userId: string): Promise<{ code: string; expiresAt: string }> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  await upsertLinkCode(userId, code, expiresAt);
  return { code, expiresAt };
}

export async function unlinkTelegram(userId: string): Promise<void> {
  await unlinkAccount(userId);
}

export async function getUserIdForChat(chatId: string): Promise<string | null> {
  return findUserIdByChatId(chatId);
}

// Called only from the webhook, never from an authenticated request. The
// Telegram-supplied chatId/username are trusted only as "where to deliver
// future messages" — the userId that ends up bound to chatId always comes
// from the matched link_code row (looked up by code, never the reverse),
// so nothing in the Telegram message itself is ever treated as an identity.
export async function consumeLinkCode(
  rawCode: string,
  chatId: string,
  username: string | null
): Promise<"linked" | "invalid" | "expired"> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return "invalid";

  const account = await findAccountByLinkCode(code);
  if (!account) return "invalid";
  if (!account.linkCodeExpiresAt || new Date(account.linkCodeExpiresAt) <= new Date()) return "expired";

  await clearChatBinding(chatId);
  await linkChat(account.userId, chatId, username);
  return "linked";
}
