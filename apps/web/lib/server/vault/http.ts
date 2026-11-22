import "server-only"
import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { financeDatabaseUnavailableReason } from "@/lib/server/finance/http"

// Responses for app/api/vault/*. Success is the bare JSON value; failure is
// { error: { code, message } }. Every response is no-store: vault rows are
// ciphertext, but they still shouldn't sit in any cache.

export type VaultErrorCode =
  | "UNAUTHORIZED"
  | "VAULT_MFA_REQUIRED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "PAYLOAD_TOO_LARGE"
  | "VAULT_NOT_CONFIGURED"
  | "VAULT_DATABASE_UNAVAILABLE"
  | "INTERNAL_ERROR"

export class VaultError extends Error {
  constructor(
    readonly code: VaultErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "VaultError"
  }
}

export const vaultErrors = {
  unauthorized: () => new VaultError("UNAUTHORIZED", "Your session has ended. Sign in again.", 401),
  mfaRequired: () =>
    new VaultError(
      "VAULT_MFA_REQUIRED",
      "Turn on two-step verification with an authenticator app, then sign in with your code to use H-Vault.",
      403,
    ),
  notFound: (what: string) => new VaultError("NOT_FOUND", `${what} not found.`, 404),
  conflict: (message: string) => new VaultError("CONFLICT", message, 409),
  invalid: (message: string) => new VaultError("VALIDATION_ERROR", message, 400),
  tooLarge: () => new VaultError("PAYLOAD_TOO_LARGE", "The request is too large.", 413),
  notConfigured: () =>
    new VaultError("VAULT_NOT_CONFIGURED", "H-Vault is not available right now.", 503),
  databaseUnavailable: () =>
    new VaultError("VAULT_DATABASE_UNAVAILABLE", "H-Vault is not available right now.", 503),
}

const NO_STORE = { "Cache-Control": "no-store" }

export function vaultOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE })
}

export function vaultFail(error: unknown) {
  if (error instanceof VaultError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers: NO_STORE },
    )
  }
  if (error instanceof ZodError) {
    // Messages come from our own schema (lib/server/vault/validation.ts), never
    // from the submitted values.
    return NextResponse.json(
      {
        error: { code: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "Invalid request" },
      },
      { status: 400, headers: NO_STORE },
    )
  }
  // The vault's Neon database can't be reached right now (used-up quota,
  // suspended compute, network): 503, so the page can say "unavailable"
  // rather than a generic 500. The reason never quotes the error message.
  const unavailable = financeDatabaseUnavailableReason(error)
  if (unavailable) {
    console.warn(`[vault] database unavailable: ${unavailable}`)
    return vaultFail(vaultErrors.databaseUnavailable())
  }
  const sqlState = (error as { code?: unknown } | null)?.code
  // foreign_key_violation: vault rows reference the Spring-era `users` table
  // in Neon, which only has accounts that existed before 2026-11-21.
  if (sqlState === "23503") {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "This account isn't set up for H-Vault yet. Ask the H-Space owner.",
        },
      },
      { status: 409, headers: NO_STORE },
    )
  }
  // Never log the message or stack: a database error can quote the row,
  // ciphertext included. The name and SQLSTATE are enough to investigate.
  const name = error instanceof Error ? error.name : typeof error
  console.error(
    `[vault] request failed: ${name}${typeof sqlState === "string" ? ` (${sqlState})` : ""}`,
  )
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong." } },
    { status: 500, headers: NO_STORE },
  )
}

/**
 * The request body as JSON, refusing anything over `maxBytes` before parsing
 * (413) and anything that isn't JSON (400). The parsed value still has to pass
 * a strict schema.
 */
export async function readVaultJson(req: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? "")
  if (Number.isFinite(declared) && declared > maxBytes) throw vaultErrors.tooLarge()
  const text = await req.text()
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw vaultErrors.tooLarge()
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw vaultErrors.invalid("The request body must be JSON.")
  }
}
