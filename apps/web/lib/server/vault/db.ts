import "server-only"
import { neon, neonConfig, type NeonQueryFunction } from "@neondatabase/serverless"

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

/** The only host the local-proxy override applies to (resolves to 127.0.0.1). */
export const LOCAL_NEON_HOST = "db.localtest.me"

/**
 * Local development only: lets the vault's Neon driver talk to Neon's local
 * HTTP proxy (a throwaway Postgres in Docker) instead of Neon. Applies only
 * outside production, only when VAULT_LOCAL_NEON_PROXY is set, and only to
 * the host `db.localtest.me` — every other host (finance's Neon, a real vault
 * URL) keeps the driver's default `https://<host>/sql`. neonConfig is global,
 * hence the host check.
 */
export function localNeonFetchEndpoint(
  env: Record<string, string | undefined> = process.env,
): ((host: string) => string) | null {
  const proxy = env.VAULT_LOCAL_NEON_PROXY?.trim()
  if (!proxy || env.NODE_ENV === "production") return null
  return (host) => (host === LOCAL_NEON_HOST ? proxy : `https://${host}/sql`)
}

export function vaultDatabaseUrl(env: Record<string, string | undefined> = process.env) {
  return normalizeFinanceDatabaseUrl(env.VAULT_DATABASE_URL)
}

export function isVaultDatabaseConfigured(): boolean {
  return vaultDatabaseUrl() !== null
}

export function vaultSql(): NeonQueryFunction<false, false> {
  const url = vaultDatabaseUrl()
  if (!url) throw new Error("VAULT_DATABASE_URL is not configured")
  if (!client) {
    const local = localNeonFetchEndpoint()
    if (local) neonConfig.fetchEndpoint = local
    client = neon(url)
  }
  return client
}
