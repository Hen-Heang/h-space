import "server-only"

// Two-step verification checks on an access token that requireUser has
// already verified with Supabase Auth. Decoding the payload here is safe only
// because of that verification; never call these on an unverified token.

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
