import "server-only";
import { sql } from "@/lib/db";

export interface TelegramAccount {
  userId: string;
  chatId: string | null;
  telegramUsername: string | null;
  linkCode: string | null;
  linkCodeExpiresAt: string | null;
  linkedAt: string | null;
}

interface TelegramAccountRow {
  user_id: string;
  chat_id: string | null;
  telegram_username: string | null;
  link_code: string | null;
  link_code_expires_at: string | null;
  linked_at: string | null;
}

function toAccount(row: TelegramAccountRow): TelegramAccount {
  return {
    userId: row.user_id,
    chatId: row.chat_id,
    telegramUsername: row.telegram_username,
    linkCode: row.link_code,
    linkCodeExpiresAt: row.link_code_expires_at,
    linkedAt: row.linked_at,
  };
}

export async function findAccountByUserId(userId: string): Promise<TelegramAccount | null> {
  const rows = (await sql`
    select user_id, chat_id, telegram_username, link_code, link_code_expires_at, linked_at
    from telegram_accounts where user_id = ${userId}
  `) as TelegramAccountRow[];

  return rows[0] ? toAccount(rows[0]) : null;
}

export async function findAccountByLinkCode(code: string): Promise<TelegramAccount | null> {
  const rows = (await sql`
    select user_id, chat_id, telegram_username, link_code, link_code_expires_at, linked_at
    from telegram_accounts where link_code = ${code}
  `) as TelegramAccountRow[];

  return rows[0] ? toAccount(rows[0]) : null;
}

export interface LinkedTelegramAccount {
  userId: string;
  chatId: string;
}

// Every user the scheduler could actually reach. A row exists as soon as a
// link code is issued, so `chat_id is not null` is what separates "linked"
// from "started linking and never finished".
export async function findLinkedAccounts(): Promise<LinkedTelegramAccount[]> {
  const rows = (await sql`
    select user_id, chat_id from telegram_accounts
    where chat_id is not null
    order by user_id
  `) as { user_id: string; chat_id: string }[];

  return rows.map((row) => ({ userId: row.user_id, chatId: row.chat_id }));
}

export async function findUserIdByChatId(chatId: string): Promise<string | null> {
  const rows = (await sql`select user_id from telegram_accounts where chat_id = ${chatId}`) as { user_id: string }[];
  return rows[0]?.user_id ?? null;
}

// telegram_accounts.user_id is the primary key, so ON CONFLICT is safe here
// (unlike finance_budgets, which has no matching unique constraint).
export async function upsertLinkCode(userId: string, code: string, expiresAt: string): Promise<void> {
  await sql`
    insert into telegram_accounts (user_id, link_code, link_code_expires_at, updated_at)
    values (${userId}, ${code}, ${expiresAt}, now())
    on conflict (user_id) do update set
      link_code = excluded.link_code,
      link_code_expires_at = excluded.link_code_expires_at,
      updated_at = now()
  `;
}

// A Telegram chat can only ever be linked to one user — called before
// linkChat() so re-linking a chat that already belongs to someone else
// cleanly moves it rather than violating the unique index on chat_id.
export async function clearChatBinding(chatId: string): Promise<void> {
  await sql`update telegram_accounts set chat_id = null, updated_at = now() where chat_id = ${chatId}`;
}

export async function linkChat(userId: string, chatId: string, username: string | null): Promise<void> {
  await sql`
    update telegram_accounts set
      chat_id = ${chatId},
      telegram_username = ${username},
      linked_at = now(),
      link_code = null,
      link_code_expires_at = null,
      updated_at = now()
    where user_id = ${userId}
  `;
}

export async function unlinkAccount(userId: string): Promise<void> {
  await sql`
    update telegram_accounts set
      chat_id = null, telegram_username = null, link_code = null, link_code_expires_at = null, linked_at = null, updated_at = now()
    where user_id = ${userId}
  `;
}
