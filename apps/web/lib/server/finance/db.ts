import "server-only"
import { neon, type NeonQueryFunction } from "@neondatabase/serverless"
import { normalizeFinanceDatabaseUrl } from "@/lib/server/finance/database-url"

// Server-only client for Luyra's existing Neon database, which stays the
// source of truth for finance data (see docs/LUYRA_MIGRATION.md). Ported from
// apps/luyra/lib/db/index.ts.
//
// FINANCE_DATABASE_URL must never get a NEXT_PUBLIC_ prefix; importing
// "server-only" makes any accidental Client Component import fail the build.
//
// Built lazily behind a Proxy: neon() throws immediately when the URL is
// unset, which would otherwise crash `next build`'s route data collection.
// Deferring construction to the first query means a missing URL only fails
// an actual finance request, not the build.
let client: NeonQueryFunction<false, false> | undefined

export function isFinanceDatabaseConfigured(): boolean {
  return normalizeFinanceDatabaseUrl(process.env.FINANCE_DATABASE_URL) !== null
}

function getClient(): NeonQueryFunction<false, false> {
  // requireFinanceUserId() checks isFinanceDatabaseConfigured() first, so a
  // malformed value is reported as "not configured" before reaching here.
  return (client ??= neon(normalizeFinanceDatabaseUrl(process.env.FINANCE_DATABASE_URL) ?? ""))
}

export const sql: NeonQueryFunction<false, false> = new Proxy(
  (() => {}) as unknown as NeonQueryFunction<false, false>,
  {
    apply(_target, _thisArg, args) {
      return Reflect.apply(getClient(), getClient(), args)
    },
    get(_target, prop) {
      const value = Reflect.get(getClient(), prop)
      return typeof value === "function" ? value.bind(getClient()) : value
    },
  },
)
