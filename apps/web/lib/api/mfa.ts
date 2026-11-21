import { assertSupabaseConfigured, supabase } from "@/lib/supabase"

// Two-step verification (TOTP) management over Supabase Auth MFA. Signing in
// with a code lives in authApi.verifyMfa; these calls are for a signed-in
// user turning it on or off. Supabase has no backup codes: if the phone is
// lost, a project admin removes the factor in the Supabase dashboard.

export interface MfaSetup {
  factorId: string
  /** Base32 key for typing into the authenticator app by hand. */
  secret: string
  otpAuthUri: string
  /** `data:image/svg+xml` QR code from Supabase; never logged. */
  qrCode: string
}

export type MfaStatus = { enabled: true; factorId: string } | { enabled: false }

// Supabase error code for a wrong or expired TOTP code.
export const MFA_CODE_INVALID = "mfa_verification_failed"

export const mfaApi = {
  status: async (): Promise<MfaStatus> => {
    assertSupabaseConfigured()
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) throw error
    const verified = data.totp.find((f) => f.status === "verified")
    return verified ? { enabled: true, factorId: verified.id } : { enabled: false }
  },

  // Issues a fresh secret; MFA stays off until enable() confirms a live code.
  // Unverified factors from an abandoned setup are removed first — Supabase
  // caps how many a user may hold.
  startSetup: async (): Promise<MfaSetup> => {
    assertSupabaseConfigured()
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
    if (listError) throw listError
    for (const stale of factors.all.filter((f) => f.status !== "verified")) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: stale.id })
      if (error) throw error
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      // Must be unique per user; the date tells the user which phone it was.
      friendlyName: `H-Space ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    })
    if (error) throw error
    return {
      factorId: data.id,
      secret: data.totp.secret,
      otpAuthUri: data.totp.uri,
      qrCode: data.totp.qr_code,
    }
  },

  /** Turns MFA on with a code from the app; the session becomes aal2. */
  enable: async (factorId: string, code: string) => {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() })
    if (error) throw error
  },

  // Supabase only lets an aal2 session remove a verified factor, so the code
  // is verified first — which also proves the person still has the phone.
  disable: async (factorId: string, code: string) => {
    const verified = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() })
    if (verified.error) throw verified.error
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) throw error
  },
}
