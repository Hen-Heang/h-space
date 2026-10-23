import "server-only";
import { sql } from "@/lib/db";
import type { AppUser } from "@/types/user";

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  default_currency: string;
  created_at: string;
  updated_at: string;
}

function toAppUser(row: UserRow): AppUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    timezone: row.timezone,
    defaultCurrency: row.default_currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findUserById(id: string): Promise<AppUser | null> {
  const rows = (await sql`
    select id, email, display_name, avatar_url, timezone, default_currency, created_at, updated_at
    from users
    where id = ${id}
  `) as UserRow[];

  return rows[0] ? toAppUser(rows[0]) : null;
}

export async function createUser(input: {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}): Promise<AppUser> {
  const rows = (await sql`
    insert into users (id, email, display_name, avatar_url)
    values (${input.id}, ${input.email}, ${input.displayName}, ${input.avatarUrl})
    returning id, email, display_name, avatar_url, timezone, default_currency, created_at, updated_at
  `) as UserRow[];

  return toAppUser(rows[0]);
}
