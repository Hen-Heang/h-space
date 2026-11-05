import "server-only"
import { sql } from "@/lib/server/finance/db"
import type { AppUser } from "@/types/user"

// Read-only on purpose: the linked Luyra user already exists in Neon, and
// H-Space never creates finance users (see requireFinanceAppUser).

interface UserRow {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  timezone: string
  default_currency: string
  created_at: string
  updated_at: string
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
  }
}

export async function findUserById(id: string): Promise<AppUser | null> {
  const rows = (await sql`
    select id, email, display_name, avatar_url, timezone, default_currency, created_at, updated_at
    from users
    where id = ${id}
  `) as UserRow[]

  return rows[0] ? toAppUser(rows[0]) : null
}
