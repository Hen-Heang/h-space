import { apiFetch } from "@/lib/api/finance-client"
import type { FinanceTelegramStatus } from "@/types/telegram"

// H-Space routes (app/api/finance/telegram/link). Luyra's /api/telegram/link
// does not exist here — calling it 404'd and hid every "Send to Telegram".
const LINK = "/api/finance/telegram/link"

export function getTelegramLinkStatus(): Promise<FinanceTelegramStatus> {
  return apiFetch<FinanceTelegramStatus>(LINK)
}

/** Send finance messages to the chat linked in H-Space Settings → Reminders. */
export function linkFinanceTelegram(): Promise<FinanceTelegramStatus> {
  return apiFetch<FinanceTelegramStatus>(LINK, { method: "POST" })
}

/** Stop finance messages (the H-Space reminder link stays). */
export function stopFinanceTelegram(): Promise<FinanceTelegramStatus> {
  return apiFetch<FinanceTelegramStatus>(LINK, { method: "DELETE" })
}
