import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { NeonDbError } from "@neondatabase/serverless"
import { AppError } from "@/lib/server/finance/errors"

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

// SQLSTATE classes that mean "the database isn't there right now", not "this
// query is wrong": 08 connection exception, 53 insufficient resources, 57P
// operator intervention (shutdown, cannot connect now).
const UNAVAILABLE_SQLSTATE = /^(08|53|57P)/
// Neon's answers when the compute can't start: a used-up compute quota, or an
// endpoint that was disabled or suspended.
const UNAVAILABLE_NEON_MESSAGE =
  /compute time quota|endpoint (?:has been|is) (?:disabled|suspended)/i

/**
 * Why finance's database can't be reached (network failure, Neon 5xx/429,
 * used-up quota or suspended compute), or null when the error is something
 * else, such as a bug in a query. Unavailable answers 503, so the page can
 * say "unavailable" instead of a generic 500. The reason is for the server
 * log and never quotes the error message.
 */
export function financeDatabaseUnavailableReason(error: unknown): string | null {
  if (!(error instanceof NeonDbError)) return null
  if (UNAVAILABLE_NEON_MESSAGE.test(error.message)) return "Neon compute quota or endpoint state"
  if (error.message.startsWith("Error connecting to database")) return "network"
  const http = /^Server error \(HTTP status (429|5\d\d)\)/.exec(error.message)
  if (http) return `Neon HTTP ${http[1]}`
  if (typeof error.code === "string" && UNAVAILABLE_SQLSTATE.test(error.code)) {
    return `SQLSTATE ${error.code}`
  }
  return null
}

export function apiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    )
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: { code: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "Invalid request" },
      },
      { status: 422 },
    )
  }

  const unavailable = financeDatabaseUnavailableReason(error)
  if (unavailable) {
    console.warn(`[finance] database unavailable: ${unavailable}`)
    return NextResponse.json(
      {
        error: {
          code: "FINANCE_DATABASE_UNAVAILABLE",
          message: "Finance can't reach its database right now. Try again later.",
        },
      },
      { status: 503 },
    )
  }

  // Never leak internals (DB errors, stack traces) to the client.
  console.error(error)
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
    { status: 500 },
  )
}
