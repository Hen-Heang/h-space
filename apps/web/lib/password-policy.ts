// Mirrors h-space-api's StrongPasswordValidator defaults (app.password-policy.*).
// The server is the authority, but its validation errors reach the client as a
// generic "System error", so the forms check the same rules up front to show
// the real reason.

export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 72

export const PASSWORD_POLICY_HINT =
  "At least 12 characters, with an uppercase letter, a lowercase letter, a digit and a special character."

/** null when the password is acceptable, otherwise a sentence naming what's missing. */
export function passwordPolicyError(password: string): string | null {
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`
  }
  const missing: string[] = []
  if (password.length < PASSWORD_MIN_LENGTH)
    missing.push(`at least ${PASSWORD_MIN_LENGTH} characters`)
  if (!/\p{Lu}/u.test(password)) missing.push("an uppercase letter")
  if (!/\p{Ll}/u.test(password)) missing.push("a lowercase letter")
  if (!/\p{Nd}/u.test(password)) missing.push("a digit")
  if (/^[\p{L}\p{Nd}]*$/u.test(password)) missing.push("a special character")
  return missing.length ? `Password must contain ${missing.join(", ")}.` : null
}
