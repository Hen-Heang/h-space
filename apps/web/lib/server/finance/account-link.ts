// Maps an H-Space user to the Luyra user who owns their finance rows in Neon.
//
// Luyra's Neon tables are keyed by `users.id`, which is the user's id in
// Luyra's own Supabase Auth project. Inside H-Space the caller is identified by
// h-space-api (through the Supabase token bridge), so those ids are not assumed
// to match. The link is explicit configuration, never inferred — in particular
// never matched by email — so a finance account can only be reached by the
// H-Space account its owner named.
//
// Format (server-only env var, never NEXT_PUBLIC_):
//   FINANCE_ACCOUNT_LINKS="<hspace-user-uuid>=<luyra-user-uuid>[,<…>=<…>]"
//
// Pure: no Neon or Next.js imports, so it is unit-testable as-is.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type FinanceAccountLinks = ReadonlyMap<string, string>

/**
 * Parses FINANCE_ACCOUNT_LINKS. Returns null when the value is missing or any
 * entry is malformed — a half-valid config fails closed rather than silently
 * dropping an entry. An H-Space id may appear only once.
 */
export function parseFinanceAccountLinks(
  raw: string | undefined | null,
): FinanceAccountLinks | null {
  // Vercel stores a value exactly as typed, so `"a=b"` pasted from an
  // .env.local line arrives with its quotes. Strip one matching pair.
  const value = raw
    ?.trim()
    .replace(/^(["'])([\s\S]*)\1$/, "$2")
    .trim()
  if (!value) return null
  const links = new Map<string, string>()
  for (const entry of value.split(",")) {
    const parts = entry.trim().split("=")
    if (parts.length !== 2) return null
    const hspaceId = parts[0]!.trim().toLowerCase()
    const luyraId = parts[1]!.trim().toLowerCase()
    if (!UUID.test(hspaceId) || !UUID.test(luyraId)) return null
    if (links.has(hspaceId)) return null
    links.set(hspaceId, luyraId)
  }
  return links.size > 0 ? links : null
}

/** The linked Luyra user id for this H-Space user, or null if none. */
export function resolveLuyraUserId(
  links: FinanceAccountLinks,
  hspaceUserId: string,
): string | null {
  return links.get(hspaceUserId.toLowerCase()) ?? null
}

/**
 * The Luyra user ids that some H-Space account is linked to. The scheduled
 * jobs run over the whole finance database (which also holds Luyra's other
 * accounts), so they keep only these users: someone who can't open Finance
 * in H-Space must not get its messages either. Empty when unconfigured.
 */
export function linkedFinanceUserIds(
  raw: string | undefined | null = process.env.FINANCE_ACCOUNT_LINKS,
): Set<string> {
  return new Set(parseFinanceAccountLinks(raw)?.values() ?? [])
}

/** Keeps only rows whose `userId` is a linked finance user. */
export function onlyLinkedFinanceUsers<T extends { userId: string }>(
  rows: T[],
  raw: string | undefined | null = process.env.FINANCE_ACCOUNT_LINKS,
): T[] {
  const linked = linkedFinanceUserIds(raw)
  return rows.filter((row) => linked.has(row.userId.toLowerCase()))
}
