import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { Errors } from "@/lib/server/finance/errors"
import {
  findAccountByUserId,
  setChatForUser,
  unlinkAccount,
} from "@/lib/server/finance/repositories/telegram-account-repository"
import { isTelegramConfigured } from "@/lib/server/finance/telegram"

// Finance Telegram in H-Space. Luyra and H-Space share one bot, and H-Space
// already owns the linking flow (Settings → Reminders → kori_telegram_links).
// So finance doesn't link on its own: it copies the chat from the user's
// H-Space link into Neon's telegram_accounts, which the scheduled jobs read
// (they run without a session and can't read Supabase without a service key).
//
// The H-Space link is read with the caller's own RLS-scoped client — RLS on
// kori_telegram_links only returns the caller's row. Chat ids are never sent
// to the browser.

export interface FinanceTelegramStatus {
  /** The bot token is set, so messages can be sent at all. */
  configured: boolean
  /** Finance has a chat to send to (what the jobs and "Send" buttons use). */
  linked: boolean
  /** The user has linked Telegram in H-Space (Settings → Reminders). */
  hspaceLinked: boolean
  /** Finance sends to the same chat as the H-Space link. */
  inSync: boolean
}

async function readHspaceChatId(db: SupabaseClient, hspaceUserId: string): Promise<string | null> {
  const { data, error } = await db
    .from("kori_telegram_links")
    .select("chat_id")
    .eq("user_id", hspaceUserId)
    .maybeSingle()
  if (error) throw new Error(`Couldn't read the H-Space Telegram link: ${error.message}`)
  const chatId = (data as { chat_id?: unknown } | null)?.chat_id
  return typeof chatId === "string" && chatId.trim() !== "" ? chatId : null
}

export async function getFinanceTelegramStatus(
  financeUserId: string,
  hspaceUserId: string,
  db: SupabaseClient,
): Promise<FinanceTelegramStatus> {
  const [hspaceChatId, account] = await Promise.all([
    readHspaceChatId(db, hspaceUserId),
    findAccountByUserId(financeUserId),
  ])
  const financeChatId = account?.chatId ?? null
  return {
    configured: isTelegramConfigured(),
    linked: financeChatId !== null,
    hspaceLinked: hspaceChatId !== null,
    inSync: financeChatId !== null && financeChatId === hspaceChatId,
  }
}

/** Point finance messages at the chat from the user's H-Space Telegram link. */
export async function linkHspaceTelegram(
  financeUserId: string,
  hspaceUserId: string,
  db: SupabaseClient,
): Promise<FinanceTelegramStatus> {
  const hspaceChatId = await readHspaceChatId(db, hspaceUserId)
  if (!hspaceChatId) {
    throw Errors.conflict("Link Telegram in H-Space first: Settings → Reminders.")
  }
  await setChatForUser(financeUserId, hspaceChatId)
  return getFinanceTelegramStatus(financeUserId, hspaceUserId, db)
}

/** Stop finance messages (the H-Space link for reminders is left alone). */
export async function stopFinanceTelegram(
  financeUserId: string,
  hspaceUserId: string,
  db: SupabaseClient,
): Promise<FinanceTelegramStatus> {
  await unlinkAccount(financeUserId)
  return getFinanceTelegramStatus(financeUserId, hspaceUserId, db)
}
