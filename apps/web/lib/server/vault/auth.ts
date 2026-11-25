import "server-only"

import { requireUser } from "@/lib/server/ai"
import { accessTokenAal, hasVerifiedFactor, latestTotpAt } from "@/lib/server/session-mfa"
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

// Stricter than finance's mfaRequirementMet: the vault needs an authenticator
// even on an account that has none. Re-exported for existing callers/tests.
export { accessTokenAal, hasVerifiedFactor }

interface FactorLike {
  status?: string
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

/** How recent the authenticator code must be for a destructive vault action. */
export const STEP_UP_MAX_AGE_SECONDS = 5 * 60
// A token minted a moment "in the future" by a slightly fast clock is fine;
// anything beyond this is not a timestamp to trust.
const CLOCK_SKEW_SECONDS = 60

/**
 * Step-up for actions that can make every item unreadable — reset, and
 * replacing the keyset (master-password change, recovery). An aal2 session
 * can be days old, so these also need an authenticator code checked in the
 * last five minutes: the browser runs `mfa.challengeAndVerify` on its own
 * session (Supabase checks the code, its lockouts and replays), then sends
 * the refreshed token. Call only after requireVaultUser has verified that
 * token. Throws 403 VAULT_STEP_UP_REQUIRED.
 */
export function requireRecentMfa(req: Request, nowMs: number = Date.now()): void {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  const verifiedAt = latestTotpAt(token)
  const now = nowMs / 1000
  if (
    verifiedAt === null ||
    now - verifiedAt > STEP_UP_MAX_AGE_SECONDS ||
    verifiedAt - now > CLOCK_SKEW_SECONDS
  ) {
    throw vaultErrors.stepUpRequired()
  }
}
