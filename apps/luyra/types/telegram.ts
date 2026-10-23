// Account-level Telegram integration — not Finance-specific. See
// db/migrations/008_telegram_accounts.sql and AGENTS.md's Telegram section:
// "Do not tie Telegram identity to Luyra authentication. It is an
// integration." One linked chat per Luyra user.

export interface TelegramLinkStatus {
  configured: boolean;
  linked: boolean;
  telegramUsername: string | null;
  pendingCode: string | null;
  pendingCodeExpiresAt: string | null;
}

export interface TelegramLinkCode {
  code: string;
  expiresAt: string;
  deepLink: string | null;
}
