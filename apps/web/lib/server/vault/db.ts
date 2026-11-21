import "server-only"
import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

import { normalizeFinanceDatabaseUrl } from "@/lib/server/finance/database-url"

// Server-only client for H-Vault's tables (vault_keysets, vault_items,
// audit_logs) in the Neon `hspace` database — the same tables hub-api used, so
// no ciphertext moved (docs/SPRING_EXIT_PLAN.md step 3). Neon's HTTP driver
// holds no connection between requests, so the database can scale to zero.
//
// VAULT_DATABASE_URL must never get a NEXT_PUBLIC_ prefix, and should belong
// to a role that can only touch those three tables. "server-only" makes any
// accidental Client Component import fail the build. Built lazily (like
// lib/server/finance/db.ts) so a missing URL fails a vault request, not
// `next build`.

let client: NeonQueryFunction<false, false> | undefined

export function vaultDatabaseUrl(env: Record<string, string | undefined> = process.env) {
  return normalizeFinanceDatabaseUrl(env.VAULT_DATABASE_URL)
}

export function isVaultDatabaseConfigured(): boolean {
  return vaultDatabaseUrl() !== null
}

export function vaultSql(): NeonQueryFunction<false, false> {
  const url = vaultDatabaseUrl()
  if (!url) throw new Error("VAULT_DATABASE_URL is not configured")
  return (client ??= neon(url))
}
