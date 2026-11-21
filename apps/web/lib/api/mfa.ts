import { assertSupabaseConfigured, supabase } from "@/lib/supabase"

// Two-step verification (TOTP) over Supabase Auth MFA. Supabase has no backup
// codes, so the backup is a second authenticator: a user can link several
// (a phone and a tablet, or two apps), and a code from any of them signs in
// or removes another — including a lost one. Signing in with a code lives in
// authApi.verifyMfa; these calls are for a signed-in user.

/** A linked (verified) authenticator. */
export interface MfaDevice {
  factorId: string
  name: string
  /** ISO timestamp. */
  createdAt: string
}

export interface MfaSetup {
  factorId: string
  /** Base32 key for typing into the authenticator app by hand. */
  secret: string
  otpAuthUri: string
  /** `data:image/svg+xml` QR code from Supabase; never logged. */
  qrCode: string
}

// Supabase error codes.
export const MFA_CODE_INVALID = "mfa_verification_failed"
export const MFA_NAME_TAKEN = "mfa_factor_name_conflict"

export const MFA_DEVICE_NAME_MAX = 40

/** Display name for a factor; older factors were named "H-Space <timestamp>". */
export function deviceName(friendlyName: string | undefined | null, index: number): string {
  const name = friendlyName?.trim()
  return name ? name : `Authenticator ${index + 1}`
}

/** The name a new authenticator gets: what the user typed, else a numbered default. */
export function newDeviceName(typed: string, existing: MfaDevice[]): string {
  const name = typed.trim().slice(0, MFA_DEVICE_NAME_MAX)
  if (name) return name
  const taken = new Set(existing.map((d) => d.name.toLowerCase()))
  let n = existing.length + 1
  while (taken.has(`authenticator ${n}`)) n += 1
  return `Authenticator ${n}`
}

export const mfaApi = {
  /** Linked authenticators, oldest first. Empty means two-step verification is off. */
  devices: async (): Promise<MfaDevice[]> => {
    assertSupabaseConfigured()
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) throw error
    return [...data.totp]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((f, i) => ({
        factorId: f.id,
        name: deviceName(f.friendly_name, i),
        createdAt: f.created_at,
      }))
  },

  // Issues a fresh secret for a new authenticator; it stays unlinked until
  // confirm() checks a live code. Unverified factors from an abandoned setup
  // are removed first — Supabase caps how many a user may hold. Adding a
  // second authenticator needs an aal2 session, which a signed-in user has.
  startSetup: async (name: string): Promise<MfaSetup> => {
    assertSupabaseConfigured()
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
    if (listError) throw listError
    for (const stale of factors.all.filter((f) => f.status !== "verified")) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: stale.id })
      if (error) throw error
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: name,
    })
    if (error) throw error
    return {
      factorId: data.id,
      secret: data.totp.secret,
      otpAuthUri: data.totp.uri,
      qrCode: data.totp.qr_code,
    }
  },

  /** Links the new authenticator with a code from it; the session becomes aal2. */
  confirm: async (factorId: string, code: string) => {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() })
    if (error) throw error
  },

  // Supabase only lets an aal2 session remove a verified factor, so a code is
  // verified first. It may come from any linked authenticator (`verifyWith`),
  // so a lost phone can be removed with the backup one. Removing the last
  // authenticator turns two-step verification off.
  remove: async (factorId: string, verifyWith: string, code: string) => {
    const verified = await supabase.auth.mfa.challengeAndVerify({
      factorId: verifyWith,
      code: code.trim(),
    })
    if (verified.error) throw verified.error
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) throw error
  },
}
