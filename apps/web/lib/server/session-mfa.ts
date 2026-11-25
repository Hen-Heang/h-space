import "server-only"

// Two-step verification checks on an access token that requireUser has
// already verified with Supabase Auth. Decoding the payload here is safe only
// because of that verification; never call these on an unverified token.

interface FactorLike {
  status?: string
}

function tokenClaims(token: string): Record<string, unknown> | null {
  const payload = token.split(".")[1]
  if (!payload) return null
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown
    return claims && typeof claims === "object" ? (claims as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** The `aal` claim of an already-verified access token. */
export function accessTokenAal(token: string): string | null {
  const aal = tokenClaims(token)?.aal
  return typeof aal === "string" ? aal : null
}

// Supabase names an authenticator-app code "totp" or "mfa/totp" in `amr`.
const TOTP_METHODS = new Set(["totp", "mfa/totp"])

/**
 * When an authenticator code was last checked in this session: the newest
 * TOTP entry's `timestamp` (Unix seconds) in the token's `amr` claim, which
 * Supabase sets on `mfa.verify` and keeps across token refreshes. Null when
 * there is none, or when `amr` is the timestamp-less RFC 8176 string list —
 * freshness can't be proved then, so callers must refuse.
 */
export function latestTotpAt(token: string): number | null {
  const amr = tokenClaims(token)?.amr
  if (!Array.isArray(amr)) return null
  let latest: number | null = null
  for (const entry of amr) {
    if (!entry || typeof entry !== "object") continue
    const { method, timestamp } = entry as { method?: unknown; timestamp?: unknown }
    if (typeof method !== "string" || !TOTP_METHODS.has(method)) continue
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) continue
    if (latest === null || timestamp > latest) latest = timestamp
  }
  return latest
}

export function hasVerifiedFactor(factors: FactorLike[] | null | undefined): boolean {
  return (factors ?? []).some((f) => f.status === "verified")
}

/**
 * The same rule as the app's sign-in gate (`lib/auth-store.ts`) and the RLS
 * policy `kori_mfa_requirement_met()`: an account with a verified
 * authenticator must have used it in this session (`aal2`); an account
 * without one passes. Read `factors` from the user Supabase just returned,
 * not from the token, so a newly added authenticator applies at once.
 */
export function mfaRequirementMet(
  factors: FactorLike[] | null | undefined,
  token: string,
): boolean {
  return !hasVerifiedFactor(factors) || accessTokenAal(token) === "aal2"
}
