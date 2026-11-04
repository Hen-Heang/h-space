import { describe, expect, it } from "vitest"
import { normalizeFinanceDatabaseUrl } from "./database-url"

// Synthetic, password-free URLs only.
const URL = "postgresql://finance-host.invalid/luyra?sslmode=require"

describe("normalizeFinanceDatabaseUrl", () => {
  it.each([
    ["plain", URL],
    ["postgres:// scheme", "postgres://finance-host.invalid/luyra"],
    ["surrounding whitespace", `  ${URL}\n`],
    ["double quotes", `"${URL}"`],
    ["single quotes", `'${URL}'`],
    ["Neon's psql snippet", `psql '${URL}'`],
    ["psql without quotes", `psql ${URL}`],
  ])("accepts %s", (_label, raw) => {
    expect(normalizeFinanceDatabaseUrl(raw)).toMatch(
      /^postgres(ql)?:\/\/finance-host\.invalid\/luyra/,
    )
  })

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["not a URL", "luyra"],
    ["http URL", "https://finance-host.invalid/luyra"],
    ["mismatched quotes", `"${URL}'`],
    ["space inside", "postgresql://finance-host.invalid/lu yra"],
  ])("rejects %s", (_label, raw) => {
    expect(normalizeFinanceDatabaseUrl(raw)).toBeNull()
  })
})
