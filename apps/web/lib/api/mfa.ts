import { AuthApiError, authRequest } from "@/lib/api/auth-http"
import { getValidAccessToken } from "@/lib/auth-store"

// Two-step verification (TOTP) management over h-space-api's /api/auth/mfa.
// Signing in with a code lives in authApi.verifyMfa; these calls are for a
// signed-in user turning it on or off. h-space-api doesn't report whether
// MFA is on, so the setup call is also how the page finds out: it answers
// MFA_ALREADY_ENABLED instead of issuing a secret.

// h-space-api ExitCode values for /api/auth/mfa.
export const MFA_CODE_INVALID = 1008
export const MFA_ALREADY_ENABLED = 1009
export const MFA_NOT_ENABLED = 1010
export const MFA_SETUP_REQUIRED = 1011

export interface MfaSetup {
  /** Base32 key for typing into the authenticator app by hand. */
  secret: string
  otpAuthUri: string
  /** PNG QR code, base64 without the data: prefix; null if the server couldn't render it. */
  qrCodeImageBase64: string | null
}

async function requireToken() {
  const token = await getValidAccessToken()
  if (!token) throw new AuthApiError("Your session has ended. Sign in again to continue.", 401)
  return token
}

async function backupCodes(path: string, code: string): Promise<string[]> {
  const res = await authRequest<{ backupCodes: string[] }>(path, {
    method: "POST",
    body: { code: code.trim() },
    token: await requireToken(),
  })
  return res?.backupCodes ?? []
}

export const mfaApi = {
  // Issues a fresh pending secret; MFA stays off until enable() confirms a
  // live code. Calling it again replaces the pending secret.
  startSetup: async (): Promise<MfaSetup> =>
    authRequest<MfaSetup>("/api/auth/mfa/setup", { method: "POST", token: await requireToken() }),

  /** Turns MFA on with a code from the app; returns one-time backup codes, shown once only. */
  enable: (code: string) => backupCodes("/api/auth/mfa/enable", code),

  /** `code` is an authenticator or backup code. */
  disable: async (code: string) => {
    await authRequest("/api/auth/mfa/disable", {
      method: "POST",
      body: { code: code.trim() },
      token: await requireToken(),
    })
  },

  /** Replaces every backup code; `code` is an authenticator or backup code. */
  regenerateBackupCodes: (code: string) =>
    backupCodes("/api/auth/mfa/backup-codes/regenerate", code),
}
