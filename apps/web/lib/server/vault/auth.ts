import "server-only"

import { requireUser } from "@/lib/server/ai"
import { isVaultDatabaseConfigured } from "@/lib/server/vault/db"
import { vaultErrors } from "@/lib/server/vault/http"

// Server-side gate for every app/api/vault/* route — hub-api's requireMfa,
// rebuilt for Supabase Auth. The caller must have:
//   1. a valid Supabase session — requireUser asks Supabase Auth to verify the
//      bearer token (signature, expiry, the user still exists) and returns the
//      user as Supabase has it now;
//   2. a verified authenticator on the account *right now* — read from that
//      fresh user, not the token, so removing the last authenticator closes
//      the vault immediately instead of when the token expires;
//   3. a session that used it — the token's `aal` is `aal2`, so a password
//      alone never reaches vault rows.
// The user id comes only from the verified session; nothing in the request
// can choose it. Every query must be scoped by the returned id.

interface FactorLike {
  status?: string
}

/** The `aal` claim of an already-verified access token. */
export function accessTokenAal(token: string): string | null {
  const payload = token.split(".")[1]
  if (!payload) return null
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      aal?: unknown
    }
    return typeof claims.aal === "string" ? claims.aal : null
  } catch {
    return null
  }
}

export function hasVerifiedFactor(factors: FactorLike[] | null | undefined): boolean {
  return (factors ?? []).some((f) => f.status === "verified")
}

/** The verified H-Space user id, or throws a VaultError (401 / 403 / 503). */
export async function requireVaultUser(req: Request): Promise<string> {
  const authed = await requireUser(req)
  if (authed instanceof Response) {
    if (authed.status === 503) throw vaultErrors.notConfigured()
    throw vaultErrors.unauthorized()
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  const factors = (authed.user as { factors?: FactorLike[] | null }).factors
  if (!hasVerifiedFactor(factors) || accessTokenAal(token) !== "aal2") {
    throw vaultErrors.mfaRequired()
  }

  if (!isVaultDatabaseConfigured()) {
    // Setting name only — never the value.
    console.warn("[vault] unavailable: VAULT_DATABASE_URL is not set or malformed")
    throw vaultErrors.notConfigured()
  }
  return authed.user.id
}
