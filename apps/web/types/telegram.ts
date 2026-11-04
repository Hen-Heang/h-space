// Finance Telegram in H-Space. Luyra and H-Space share one bot, and H-Space
// owns linking (Settings → Reminders). Finance only reports whether it can
// reach the user and copies the chat from their H-Space link — see
// lib/server/finance/services/finance-telegram-link-service.ts. Chat ids are
// never sent to the browser.

export interface FinanceTelegramStatus {
  /** The bot token is set on the server, so messages can be sent at all. */
  configured: boolean
  /** Finance has a chat to send to (used by the jobs and "Send" buttons). */
  linked: boolean
  /** The user has linked Telegram in H-Space (Settings → Reminders). */
  hspaceLinked: boolean
  /** Finance sends to the same chat as the H-Space link. */
  inSync: boolean
}
