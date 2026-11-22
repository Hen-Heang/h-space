import { NeonDbError } from "@neondatabase/serverless"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ZodError } from "zod"
import { AppError } from "@/lib/server/finance/errors"
import {
  apiError,
  describeDatabaseError,
  financeDatabaseUnavailableReason,
} from "@/lib/server/finance/http"

function neonError(message: string, code?: string): NeonDbError {
  const error = new NeonDbError(message)
  if (code) error.code = code
  return error
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("financeDatabaseUnavailableReason", () => {
  it.each([
    [
      "network failure",
      neonError("Error connecting to database: TypeError: fetch failed"),
      "network",
    ],
    ["Neon 5xx", neonError("Server error (HTTP status 503): upstream"), "Neon HTTP 503"],
    ["Neon rate limit", neonError("Server error (HTTP status 429): slow down"), "Neon HTTP 429"],
    [
      // The exact shape production returned on 2026-11-21 (body trimmed).
      "used-up quota (HTTP 402, as seen in production)",
      neonError(
        'Server error (HTTP status 402): {"message":"Your account or project has exceeded the quota. Upgrade your plan to increase limits.","code":""}',
      ),
      "Neon compute quota or endpoint state",
    ],
    [
      "Neon 402 with another body",
      neonError("Server error (HTTP status 402): {}"),
      "Neon HTTP 402",
    ],
    [
      "used-up compute quota",
      neonError(
        "Your account or project has exceeded the compute time quota. Upgrade your plan to increase limits.",
        "XX000",
      ),
      "Neon compute quota or endpoint state",
    ],
    [
      "disabled endpoint",
      neonError("The endpoint has been disabled. Enable it using Neon API and retry."),
      "Neon compute quota or endpoint state",
    ],
    ["connection exception", neonError("connection failure", "08006"), "SQLSTATE 08006"],
    ["too many connections", neonError("too many connections", "53300"), "SQLSTATE 53300"],
    [
      "cannot connect now",
      neonError("the database system is starting up", "57P03"),
      "SQLSTATE 57P03",
    ],
  ])("%s → unavailable", (_label, error, reason) => {
    expect(financeDatabaseUnavailableReason(error)).toBe(reason)
  })

  it.each([
    ["a query bug", neonError('relation "nope" does not exist', "42P01")],
    ["a constraint violation", neonError("duplicate key value", "23505")],
    ["a Neon 4xx", neonError("Server error (HTTP status 401): bad auth")],
    ["a plain Error", new Error("Error connecting to database: looks similar")],
    ["a Neon 404", neonError("Server error (HTTP status 404): not found")],
    ["a non-error", "compute time quota"],
  ])("%s → not unavailable", (_label, error) => {
    expect(financeDatabaseUnavailableReason(error)).toBeNull()
  })
})

describe("apiError", () => {
  it("answers 503 FINANCE_DATABASE_UNAVAILABLE without quoting the database error", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const response = apiError(
      neonError("Your account or project has exceeded the compute time quota. SELECT secret"),
    )

    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.error.code).toBe("FINANCE_DATABASE_UNAVAILABLE")
    expect(JSON.stringify(body)).not.toContain("SELECT")
    expect(warn).toHaveBeenCalledWith(
      "[finance] database unavailable: Neon compute quota or endpoint state",
    )
  })

  it("keeps a query bug a generic 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const response = apiError(neonError('relation "nope" does not exist', "42P01"))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    })
  })

  it("still passes AppError and ZodError through unchanged", async () => {
    const appError = apiError(new AppError("FINANCE_NOT_LINKED", "No link", 403))
    expect(appError.status).toBe(403)
    expect((await appError.json()).error.code).toBe("FINANCE_NOT_LINKED")

    const zodError = apiError(new ZodError([]))
    expect(zodError.status).toBe(422)
  })
})

describe("describeDatabaseError", () => {
  it("names an unavailable database by its reason", () => {
    const quota = neonError(
      'Server error (HTTP status 402): {"message":"Your account or project has exceeded the quota. Upgrade your plan to increase limits."}',
    )
    expect(describeDatabaseError(quota)).toBe(
      "database unavailable (Neon compute quota or endpoint state)",
    )
  })

  it("gives only the name and SQLSTATE of any other error, never its message", () => {
    const leak = neonError(
      "duplicate key value violates unique constraint: (USD, KRW, 1371.5)",
      "23505",
    )
    expect(describeDatabaseError(leak)).toBe("NeonDbError (23505)")
    expect(describeDatabaseError(new TypeError("row 1371.5"))).toBe("TypeError")
    expect(describeDatabaseError("plain string")).toBe("string")
  })
})
