// Normalizes FINANCE_DATABASE_URL as people actually paste it. Vercel stores a
// value exactly as typed, and Neon's "Connect" box can show the string as
// `psql 'postgresql://…'`, so a pasted value may carry a `psql` prefix and/or
// one pair of surrounding quotes. Anything that still isn't a Postgres URL
// afterwards is rejected (null), so finance reports "not configured" with a
// clear server-log reason instead of failing every query with a 500.
//
// Pure: no Neon or Next.js imports, so it is unit-testable as-is. Never log
// the input or the result — they contain the database password.

const POSTGRES_URL = /^postgres(ql)?:\/\/\S+$/

export function normalizeFinanceDatabaseUrl(raw: string | undefined | null): string | null {
  let value = raw?.trim() ?? ""
  value = value.replace(/^psql\s+/i, "").trim()
  value = value.replace(/^(["'])([\s\S]*)\1$/, "$2").trim()
  return POSTGRES_URL.test(value) ? value : null
}
