import "server-only"
import { sql } from "@/lib/server/finance/db"

export interface TelegramAccount {
  userId: string
  chatId: string | null
  telegramUsername: string | null
  linkCode: string | null
  linkCodeExpiresAt: string | null
  linkedAt: string | null
}

interface TelegramAccountRow {
  user_id: string
  chat_id: string | null
  telegram_username: string | null
  link_code: string | null
  link_code_expires_at: string | null
  linked_at: string | null
}

function toAccount(row: TelegramAccountRow): TelegramAccount {
  return {
    userId: row.user_id,
    chatId: row.chat_id,
    telegramUsername: row.telegram_username,
    linkCode: row.link_code,
    linkCodeExpiresAt: row.link_code_expires_at,
    linkedAt: row.linked_at,
  }
}

export async function findAccountByUserId(userId: string): Promise<TelegramAccount | null> {
  const rows = (await sql`
    select user_id, chat_id, telegram_username, link_code, link_code_expires_at, linked_at
    from telegram_accounts where user_id = ${userId}
  `) as TelegramAccountRow[]

  return rows[0] ? toAccount(rows[0]) : null
}

export interface LinkedTelegramAccount {
  userId: string
  chatId: string
}

// Every user the scheduler can reach: rows with a chat. (Luyra issued link
// codes before a chat existed; H-Space copies the chat from the user's
// H-Space Telegram link instead — see setChatForUser.)
export async function findLinkedAccounts(): Promise<LinkedTelegramAccount[]> {
  const rows = (await sql`
    select user_id, chat_id from telegram_accounts
    where chat_id is not null
    order by user_id
  `) as { user_id: string; chat_id: string }[]

  return rows.map((row) => ({ userId: row.user_id, chatId: row.chat_id }))
}

/**
 * H-Space: bind a chat to this finance user, copied from the user's H-Space
 * Telegram link (one bot serves both). A chat can belong to one user only
 * (unique index on chat_id), so any other binding is cleared in the same
 * transaction. Creates the row if the user never linked in Luyra.
 */
export async function setChatForUser(userId: string, chatId: string): Promise<void> {
  await sql.transaction([
    sql`
      update telegram_accounts set chat_id = null, updated_at = now()
      where chat_id = ${chatId} and user_id <> ${userId}
    `,
    sql`
      insert into telegram_accounts (user_id, chat_id, linked_at)
      values (${userId}, ${chatId}, now())
      on conflict (user_id) do update set
        chat_id = excluded.chat_id,
        linked_at = now(),
        link_code = null,
        link_code_expires_at = null,
        updated_at = now()
    `,
  ])
}

export async function unlinkAccount(userId: string): Promise<void> {
  await sql`
    update telegram_accounts set
      chat_id = null, telegram_username = null, link_code = null, link_code_expires_at = null, linked_at = null, updated_at = now()
    where user_id = ${userId}
  `
}
