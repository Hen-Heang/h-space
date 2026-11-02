// Recognises "this column/table doesn't exist" errors from PostgREST, so a
// feature that ships ahead of its migration can degrade instead of breaking.
//   42703    undefined_column (Postgres)
//   42P01    undefined_table (Postgres)
//   PGRST204 column not found in the schema cache
//   PGRST205 table not found in the schema cache
const MISSING_SCHEMA_CODES = new Set(["42703", "42P01", "PGRST204", "PGRST205"])

export function isMissingSchemaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false
  const code = (error as { code: unknown }).code
  return typeof code === "string" && MISSING_SCHEMA_CODES.has(code)
}
